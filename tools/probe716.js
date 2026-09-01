#!/usr/bin/env node
/* 716 재현 — 메인 HUD 장착 스킬 슬롯(쿨타임 도는 칸) 프레임이 등급 무관 파란색 고정
 *            (T1 «버그» · 주인 보고 2026-09-02 03:30)
 *
 *   node tools/probe716.js
 *
 * ⚑ 338 규칙 — 처방을 따르기 전에 **찍힌 픽셀**로 재현부터 한다.
 *   등재문의 가설은 «07 스킬 시트 카드에서는 등급색이 맞는데 메인 슬롯만 고정색» 이다.
 *   이 프로브는 그 둘을 **한 장에 나란히** 놓아 확인하거나 기각한다 —
 *   같은 스킬 한 개를 슬롯 0 에 장착한 채로 ⓐ 메인 HUD `.slot2` ⓑ 07 시트 `.sk-slot` 을
 *   등급 전수(스킬이 실제로 쓰는 등급 전부)로 훑는다.
 *
 *   [1] 재현    — 수리 전 트리에서 메인 링·well 이 등급 무관 **한 색**
 *   [2] 대조    — 같은 트리·같은 스킬인데 07 시트는 등급마다 **다른 색** ⇒ 두 자리가 다른 소스
 *   [3] 수리 후 — 현재 트리에서 메인 링·well 이 등급 수만큼 갈리고 **07 과 같은 값**
 *   [4] 불변    — 활성(골드 링)·미해금(회색)·빈 칸(회색)은 두 트리에서 같은 값
 *
 * ⚠ 링은 `::before` 의 conic-gradient 라 색 리터럴이 계산 스타일에 남는다 —
 *   그래도 **화면에 찍힌 픽셀**(슬롯 중심 바로 위 r=52, 링대 47.97..56.02 안)을 같이 읽는다.
 *   계산 스타일만 믿으면 «선언은 바뀌었는데 안 그려진다» 를 못 잡는다(350 교훈).
 * ⚠ 수리 전 트리는 `git show <PRE>:index.html` 로 꺼낸다. 얕은 클론이라 그 커밋이 없으면
 *   [1]·[2]·[4] 는 «판정 보류»(실패 아님)로 건너뛴다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const CUR = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PRE = process.env.PROBE716_PRE || '1f557c3';   /* claim(716) — 수리 직전 트리 */

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof buildSlots === 'function'
    && typeof drawSlots === 'function' && typeof renderSkill === 'function');
  /* ⚠ 부팅 직후 첫 표본은 60 쥬시(등장 전이)가 아직 걷히지 않아 **딴 색**이 찍힌다 —
     1회차에 수리 전 트리 첫 행만 `#1FAACB` 로 나와 «한 색» 판정을 뒤집을 뻔했다(350 교훈). */
  await page.waitForTimeout(1200);
  return { page, errs };
};

/* 쿨타임 오버레이(`.cdv` rgba(6,9,20,.62))가 well 을 100% 덮은 상태의 **찍힌 픽셀** 기댓값.
   ⚑ 이 blend 를 쓰는 것이 요점이다 — «쿨타임 도는 중» 이 바로 주인이 지목한 상태이고,
   그 상태에서도 well 색이 등급을 따라가는지를 물어야 한다(오버레이를 걷고 재면 딴 질문이다). */
const OVL = { c: [6, 9, 20], a: 0.62 };
const blend = (hex) => {
  const v = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
  return v.map((x, i) => Math.round(OVL.a * OVL.c[i] + (1 - OVL.a) * x));
};
const near = (hex, exp, tol) => {
  const v = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
  return v.every((x, i) => Math.abs(x - exp[i]) <= tol);
};

/* 슬롯 0 에 스킬 하나를 장착하고 «쿨타임이 도는» 상태로 굳힌 뒤 색을 읽는다.
   ⚠ 자동 루프가 매 프레임 drawSlots 를 부르므로 cd 를 **큰 값**으로 박아 ready 로 안 돌아오게 한다. */
const measure = async (page, id) => page.evaluate((sid) => {
  const cs = (el, pe) => getComputedStyle(el, pe || null);
  S.eqSkill = [sid, null, null, null, null, null, null, null];
  S.own = S.own || {};
  if (typeof S.own === 'object') S.own[sid] = Math.max(1, S.own[sid] || 1);
  buildSlots();
  skillCd[sid] = 999;                       /* 쿨타임 «도는 중» 으로 굳힌다 */
  drawSlots();
  const b = document.querySelectorAll('#slots .slot2')[0];
  const w = b.querySelector('.cdw');
  const ring = cs(b, '::before').backgroundImage;
  const first = (ring.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/) || [''])[0];
  const r = b.getBoundingClientRect();
  /* 07 시트 — 같은 스킬의 장착 슬롯 인라인 토큰(`--f`/`--r`) */
  renderSkill();
  const s7 = document.querySelector('#bSk .sk-slot[data-skslot="' + sid + '"]');
  const sty = s7 ? s7.getAttribute('style') : '';
  const g7 = { f: (sty.match(/--f:\s*([^;"]+)/) || [])[1] || '', r: (sty.match(/--r:\s*([^;"]+)/) || [])[1] || '' };
  return {
    id: sid, g: SK[sid].g,
    ready: b.classList.contains('ready'),
    ring: first.toUpperCase(), ringFull: ring,
    well: cs(w).backgroundColor,
    cdv: b.querySelector('.cdv').style.height,
    box: { cx: r.x + r.width / 2, cy: r.y + r.height / 2 },
    card7: { f: g7.f.trim().toUpperCase(), r: g7.r.trim().toUpperCase() },
    fill: SK_FILL[SK[sid].g].toUpperCase(), rim: SK_RIM[SK[sid].g].toUpperCase(),
    fillOf2: SK_FILL[2].toUpperCase(), allRims: SK_RIM.map(x => x.toUpperCase())
  };
}, id);

/* 찍힌 픽셀 — 캡처를 data URL 로 되돌려 캔버스에서 읽는다(350 처방) */
const pix = async (page, pts) => {
  const buf = await page.screenshot();
  return page.evaluate(([data, ps]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(ps.map(p => {
        const d = g.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [buf.toString('base64'), pts]);
};

/* 활성(ready)·미해금(lock)·빈 칸(free) — 상태 신호 3종은 등급과 무관해야 한다 */
const states = async (page, id) => page.evaluate((sid) => {
  const cs = (el, pe) => getComputedStyle(el, pe || null);
  S.eqSkill = [sid, null, null, null, null, null, null, null];
  buildSlots();
  skillCd[sid] = 0; drawSlots();
  const els = document.querySelectorAll('#slots .slot2');
  const one = (el) => ({
    cls: el.className,
    ring: (cs(el, '::before').backgroundImage.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/) || [''])[0].toUpperCase(),
    well: cs(el.querySelector('.cdw')).backgroundColor,
    sh: cs(el).boxShadow.replace(/\s+/g, ' ')
  });
  const lock = Array.prototype.slice.call(els).find(e => e.classList.contains('empty') && !e.classList.contains('free'));
  const free = Array.prototype.slice.call(els).find(e => e.classList.contains('free'));
  return { ready: one(els[0]), lock: lock ? one(lock) : null, free: free ? one(free) : null };
}, id);

const uniq = a => Array.from(new Set(a));

(async () => {
  const browser = await launch(chromium);

  /* 수리 전 트리를 임시 파일로 꺼낸다 */
  let preUrl = null, tmp = null;
  try {
    const html = execFileSync('git', ['show', PRE + ':index.html'], { cwd: ROOT, maxBuffer: 1 << 28 });
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe716-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), html);
    preUrl = 'file://' + path.join(tmp, 'index.html').replace(/\\/g, '/');
  } catch (_) { preUrl = null; }

  /* 등급 전수 — 스킬이 실제로 쓰는 등급마다 **첫 스킬 한 개**(cd>0 이어야 «쿨타임 도는» 상태가 선다) */
  const probe = await open(browser, CUR);
  const picks = await probe.page.evaluate(() => {
    const by = {};
    SKILLS.forEach(s => { if (s.cd > 0 && by[s.g] === undefined) by[s.g] = s.id; });
    return Object.keys(by).sort((a, b) => a - b).map(g => ({ g: +g, id: by[g] }));
  });
  await probe.page.context().close();
  console.log('등급 전수 표본 ' + picks.length + '종 — ' + picks.map(p => 'g' + p.g + ' ' + p.id).join(' · '));

  const run = async (url, tag) => {
    const { page, errs } = await open(browser, url);
    const rows = [];
    for (const p of picks) {
      const m = await measure(page, p.id);
      /* ⚠ `buildSlots()` 가 innerHTML 을 갈아 끼우면 60 쥬시가 그 칸에 등장 전이를 얹는다 —
         걷히기 전에 찍으면 well 이 배경과 섞여 **딴 색**이 된다(1회차에 첫 행만 그랬다). */
      await page.waitForTimeout(600);
      Object.assign(m, await page.evaluate(() => {
        const b = document.querySelectorAll('#slots .slot2')[0];
        return { ready: b.classList.contains('ready'), cdv: b.querySelector('.cdv').style.height };
      }));
      const pts = [
        { x: m.box.cx, y: m.box.cy - 52 },      /* 링대(47.97..56.02) 한복판 · 12시 */
        /* well 좌끝(r=39 < well r43.8) — **아이콘 잉크(68 폭 = ±34) 밖이고 well 가장자리에서 4.8px 안**.
           ⚠ 대각선(±31,±31)은 못 쓴다: 거리가 43.84 로 well 경계에 정확히 걸리고, 🗡️ 처럼
           좌하단으로 뻗는 글리프의 잉크가 그 자리에 실제로 들어온다(1회차에 g0 만 딴 색이었다). */
        { x: m.box.cx - 39, y: m.box.cy }
      ];
      /* ⚠ 전투 FX 가 HUD 위를 지나가면 한 프레임이 딴 색으로 찍힌다 — **두 번 연속 같은 값**을
         받을 때까지 다시 읽는다(한 장짜리 표본으로 «한 색» 을 판정하면 안 된다). */
      let ringPx, wellPx, last = null;
      for (let k = 0; k < 5; k++) {
        const cur2 = await pix(page, pts);
        if (last && last[0] === cur2[0] && last[1] === cur2[1]) { last = cur2; break; }
        last = cur2;
        await page.waitForTimeout(220);
      }
      [ringPx, wellPx] = last;
      rows.push(Object.assign(m, { ringPx, wellPx }));
    }
    const st = await states(page, picks[picks.length - 1].id);
    await page.context().close();
    console.log('\n── ' + tag + ' ──');
    console.log('  등급 스킬       메인 링(선언/픽셀)        메인 well(선언/픽셀)      07 시트 --r / --f');
    rows.forEach(r => console.log('   g' + r.g + '  ' + r.id.padEnd(9)
      + (r.ring + ' / ' + r.ringPx).padEnd(25)
      + (r.well + ' / ' + r.wellPx).padEnd(34)
      + r.card7.r + ' / ' + r.card7.f));
    return { rows, st, errs };
  };

  const cur = await run(CUR, '현재 트리');

  let pre = null;
  if (preUrl) pre = await run(preUrl, '수리 전 트리 ' + PRE);

  /* ── [1] 재현 ───────────────────────────────────────── */
  if (!pre) {
    na('1 재현 — 수리 전 트리(' + PRE + ')에서 «파랑 고정»',
       '얕은 클론이라 그 커밋이 없다 · `git fetch --deepen=200 origin main` 후 다시');
    na('2 대조 — 07 시트는 같은 스킬에 등급색을 준다');
    na('4 불변 — 상태 신호 3종(활성·미해금·빈 칸)이 두 트리에서 같다');
  } else {
    const rp = uniq(pre.rows.map(r => r.ringPx)), wp = uniq(pre.rows.map(r => r.wellPx));
    ok(rp.length === 1 && wp.length === 1,
       '1 재현 — 수리 전 메인 슬롯은 등급 ' + pre.rows.length + '종이 **한 색**(찍힌 픽셀)',
       '링 ' + rp.join(',') + ' · well ' + wp.join(','));
    /* ⚑ 그 «한 색» 이 하필 **희귀(g2)** 자리다 — 그래서 주인 눈에는 «등급이 높은데 파란색» 으로 읽혔다.
       well 은 딤을 얹은 값으로 비교한다(SK_FILL[2] #347DC1 ↔ 상수 #367cc1 은 채널 ≤2 차이). */
    const g2f = pre.rows[0].fillOf2, rims = pre.rows[0].allRims;
    ok(near(wp[0], blend(g2f), 3) && rims.indexOf(rp[0]) === -1,
       '1-b 그 한 색은 «희귀(g2) 파랑» 팔레트다 — 등급이 아니라 상수(링은 SK_RIM 8색 중 어디에도 없다)',
       '링 ' + rp[0] + ' ∉ {' + rims.join(',') + '} · well ' + wp[0] + ' ≈ blend(SK_FILL[2] ' + g2f + ')');

    /* ── [2] 대조 ─────────────────────────────────────── */
    const c7 = uniq(pre.rows.map(r => r.card7.r + '/' + r.card7.f));
    ok(c7.length === pre.rows.length,
       '2 대조 — 같은 트리·같은 스킬인데 07 시트 슬롯은 등급마다 다른 색 ⇒ **두 자리가 다른 소스**',
       c7.join(' · '));

    /* ── [4] 불변 ─────────────────────────────────────── */
    /* ⚑ 활성은 **링만** 본다 — 활성 칸의 well 은 레퍼런스에서도 «노랑이 아니라 그대로 면색» 이라
       716 이 등급색으로 옮기는 그 자리다(파랑 고정 0건). 상태 신호인 골드 링은 안 건드린다.
       미해금·빈 칸은 등급이 없으므로 링·well 둘 다 그대로여야 한다. */
    const same = pre.st.ready.ring === cur.st.ready.ring
      && ['lock', 'free'].every(k => pre.st[k] && cur.st[k]
        && pre.st[k].ring === cur.st[k].ring && pre.st[k].well === cur.st[k].well);
    ok(same,
       '4 불변 — 상태 신호 3종(활성 골드 링·미해금 회색·빈 칸 회색)이 두 트리에서 **같은 값**',
       '활성 링 ' + cur.st.ready.ring + ' · 미해금 ' + cur.st.lock.ring + '/' + cur.st.lock.well
       + ' · 빈 칸 ' + cur.st.free.ring + '/' + cur.st.free.well);
    ok(pre.st.ready.well !== cur.st.ready.well,
       '4-b 활성 칸 well 은 716 이 옮긴 자리 — 수리 전 파랑 고정 → 수리 후 등급 면색',
       pre.st.ready.well + ' → ' + cur.st.ready.well + ' (표본 g' + picks[picks.length - 1].g + ')');
  }

  /* ── [3] 수리 후 ───────────────────────────────────── */
  const rc = uniq(cur.rows.map(r => r.ringPx)), wc = uniq(cur.rows.map(r => r.wellPx));
  ok(rc.length === cur.rows.length && wc.length === cur.rows.length,
     '3 수리 후 — 메인 슬롯 링·well 이 등급 ' + cur.rows.length + '종만큼 갈린다(찍힌 픽셀)',
     '링 ' + rc.length + '색 · well ' + wc.length + '색');
  const wellHit = cur.rows.filter(r => near(r.wellPx, blend(r.card7.f), 3)).length;
  ok(wellHit === cur.rows.length,
     '3-b 같은 소스 — 메인 well(찍힌 픽셀) = 07 시트 `--f`(= `SK_FILL[g]`)에 쿨타임 딤을 얹은 값',
     wellHit + '/' + cur.rows.length + ' · ' + cur.rows.map(r => 'g' + r.g + ' ' + r.wellPx
       + (near(r.wellPx, blend(r.card7.f), 3) ? '=' : '≠') + 'blend(' + r.card7.f + ')').join(' '));
  const ringHit = cur.rows.filter(r => r.ringPx === r.card7.r).length;
  ok(ringHit === cur.rows.length,
     '3-c 같은 소스 — 메인 링(찍힌 픽셀) = 07 시트 `--r`(= `SK_RIM[g]`) 전 등급 일치',
     ringHit + '/' + cur.rows.length + ' · ' + cur.rows.map(r => 'g' + r.g + ' ' + r.ringPx + (r.ringPx === r.card7.r ? '=' : '≠') + r.card7.r).join(' '));
  ok(cur.rows.every(r => !r.ready && r.cdv === '100%'),
     '3-d 쿨타임 표시 회귀 — 표본은 전부 «쿨타임 도는 중»(ready 0건 · 오버레이 100%)',
     'cdv ' + uniq(cur.rows.map(r => r.cdv)).join(','));
  ok(cur.errs.length === 0, '5 콘솔 에러 0건', cur.errs.slice(0, 3).join(' | ') || '없음');

  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  console.log('\nPROBE716 ' + pass + '/' + (pass + fail) + (skip ? ' (보류 ' + skip + ')' : '') + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
