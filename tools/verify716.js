#!/usr/bin/env node
/* 716 게이트 — 메인 HUD 장착 스킬 슬롯의 프레임 색은 «등급 표에서 파생» 된다
 *
 *   node tools/verify716.js
 *
 * 지키는 것 다섯:
 *   [A] 선언   — `.slot2::before`(링)·`.slot2 .cdw`(면)가 색 **리터럴**이 아니라 토큰(`--r`/`--f`)을 읽는다.
 *                등급 색표는 저장소에 **한 벌뿐**이다(`SK_FILL`/`SK_RIM` — 402 «표 두 벌» 부패 방지).
 *   [B] 호스트 — `buildSlots()` 는 **장착 칸에만** 두 토큰을 준다. 빈 칸·미해금 칸은 등급이 없다.
 *   [C] 스윕   — 스킬이 쓰는 등급 전수를 슬롯 0 에 장착해 **찍힌 픽셀**을 잰다:
 *                링 = `SK_RIM[g]` · well = `SK_FILL[g]` 에 쿨타임 딤을 얹은 값 · **파랑 고정 0건**.
 *   [D] 일치   — 같은 스킬이 07 시트(`.sk-slot`)와 메인에서 **같은 두 토큰**을 읽는다.
 *   [E] 불변   — 활성 골드 링 · 미해금/빈 칸 회색 · 쿨타임 오버레이 높이(0%↔100%)는 그대로.
 *   [R] 되돌림 — 토큰을 «희귀 파랑» 으로 되돌린 사본에서는 [C] 가 반드시 빨개진다.
 *                (되돌림 시험이 없으면 «이미 참인 것을 게이트로 굳혔다» 를 구분할 수 없다 — 338 교훈)
 *
 * ⚠ 링·well 은 계산 스타일이 아니라 **화면에 찍힌 픽셀**로 잰다 — 선언만 보면
 *   «값은 바뀌었는데 안 그려진다» 를 못 잡는다(350 교훈).
 * ⚠ well 표본은 슬롯 중심에서 **왼쪽 39px**(well r43.8 안 · 아이콘 잉크 폭 ±34 밖)이다.
 *   대각선 (±31,±31) 은 거리 43.84 로 well 경계에 걸리고 🗡️ 같은 글리프의 잉크가 들어온다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 쿨타임 딤(`.cdv` rgba(6,9,20,.62))이 well 을 100% 덮은 상태의 기댓값 */
const OVL = { c: [6, 9, 20], a: 0.62 };
const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
const blend = (hex) => rgb(hex).map((x, i) => Math.round(OVL.a * OVL.c[i] + (1 - OVL.a) * x));
const near = (hex, exp, tol) => rgb(hex).every((x, i) => Math.abs(x - exp[i]) <= tol);

const open = async (browser, css) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof buildSlots === 'function'
    && typeof drawSlots === 'function' && typeof renderSkill === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(1200);       /* 60 쥬시 등장 전이가 걷힐 때까지 */
  return { page, errs };
};

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

/* 슬롯 0 에 한 스킬을 장착하고 «쿨타임 도는 중» 으로 굳힌 뒤 좌표·토큰을 받는다 */
const equip = (page, id) => page.evaluate((sid) => {
  S.eqSkill = [sid, null, null, null, null, null, null, null];
  buildSlots();
  skillCd[sid] = 999; drawSlots();
  const b = document.querySelectorAll('#slots .slot2')[0];
  const r = b.getBoundingClientRect();
  renderSkill();
  const s7 = document.querySelector('#bSk .sk-slot[data-skslot="' + sid + '"]');
  const sty = s7 ? s7.getAttribute('style') : '';
  const tok = (el) => el ? {
    f: (el.getAttribute('style') || '').match(/--f:\s*([^;"]+)/), r: (el.getAttribute('style') || '').match(/--r:\s*([^;"]+)/)
  } : null;
  const m0 = tok(b);
  return {
    id: sid, g: SK[sid].g,
    cx: r.x + r.width / 2, cy: r.y + r.height / 2,
    ready: b.classList.contains('ready'), cdv: b.querySelector('.cdv').style.height,
    mainTok: { f: m0 && m0.f ? m0.f[1].trim().toUpperCase() : '', r: m0 && m0.r ? m0.r[1].trim().toUpperCase() : '' },
    tok7: { f: ((sty.match(/--f:\s*([^;"]+)/) || [])[1] || '').trim().toUpperCase(),
            r: ((sty.match(/--r:\s*([^;"]+)/) || [])[1] || '').trim().toUpperCase() },
    fill: SK_FILL[SK[sid].g].toUpperCase(), rim: SK_RIM[SK[sid].g].toUpperCase()
  };
}, id);

/* 두 번 연속 같은 값이 나올 때까지 다시 읽는다(전투 FX 가 HUD 위를 지나가는 프레임 방지) */
const stable = async (page, pts) => {
  let last = null;
  for (let k = 0; k < 5; k++) {
    const cur = await pix(page, pts);
    if (last && last.every((v, i) => v === cur[i])) return cur;
    last = cur;
    await page.waitForTimeout(220);
  }
  return last;
};

const sweep = async (page) => {
  const picks = await page.evaluate(() => {
    const by = {};
    SKILLS.forEach(s => { if (s.cd > 0 && by[s.g] === undefined) by[s.g] = s.id; });
    return Object.keys(by).sort((a, b) => a - b).map(g => by[g]);
  });
  const rows = [];
  for (const id of picks) {
    const m = await equip(page, id);
    await page.waitForTimeout(600);
    const [ring, well] = await stable(page, [
      { x: m.cx, y: m.cy - 52 },     /* 링대 47.97..56.02 한복판 · 12시(밝은 톤 구간) */
      { x: m.cx - 39, y: m.cy }      /* well r39 — 아이콘 잉크 밖 · 경계에서 4.8px 안 */
    ]);
    rows.push(Object.assign(m, { ringPx: ring, wellPx: well }));
  }
  return rows;
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  /* ── [A] 선언 ─────────────────────────────────────────── */
  const ring = (src.match(/\.slot2::before\{[^}]*\}/) || [''])[0];
  const cdw = (src.match(/\.slot2 \.cdw\{[^}]*\}/) || [''])[0];
  ok(/var\(--r,/.test(ring) && /conic-gradient\(var\(--sl-r1\)/.test(ring),
     'A1 링 선언이 토큰을 읽는다 — `.slot2::before` 의 conic-gradient 가 `var(--r)` 파생',
     ring.replace(/\s+/g, ' ').slice(0, 120));
  ok(/background:var\(--f,/.test(cdw),
     'A2 면 선언이 토큰을 읽는다 — `.slot2 .cdw{background:var(--f,…)}`',
     cdw.replace(/\s+/g, ' ').slice(0, 90));
  /* 폴백은 레퍼런스 값 그대로 — `--f`/`--r` 없는 호스트(`inkA4.js` 합성 호스트)는 안 바뀐다 */
  ok(/var\(--r,\s*#25d8fe\)/i.test(ring) && /var\(--f,\s*#367cc1\)/i.test(cdw),
     'A3 폴백은 레퍼런스 값(링 #25d8fe · 면 #367cc1) — 토큰 없는 호스트는 한 픽셀도 안 바뀐다');
  ok(/color-mix\(in srgb,\s*var\(--sl-r1\)\s*84%,\s*#000\)/i.test(ring),
     'A4 링의 어두운 톤은 표가 아니라 **한 색에서 판다**(레퍼런스 두 톤 밝기비 0.844)');
  const fillDecl = (src.match(/^const SK_FILL\s*=/gm) || []).length;
  const rimDecl = (src.match(/^const SK_RIM\s*=/gm) || []).length;
  ok(fillDecl === 1 && rimDecl === 1,
     'A5 등급 색표는 한 벌뿐 — `SK_FILL`·`SK_RIM` 선언이 각각 1건(402 «표 두 벌» 부패 방지)',
     'SK_FILL ' + fillDecl + ' · SK_RIM ' + rimDecl);

  /* ── [B] 호스트 ───────────────────────────────────────── */
  const build = (src.match(/function buildSlots\(\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/SK_FILL\[sk\.g\]/.test(build) && /SK_RIM\[sk\.g\]/.test(build),
     'B1 호스트가 표를 읽는다 — `buildSlots()` 가 `SK_FILL[sk.g]`·`SK_RIM[sk.g]` 를 인라인으로 준다');
  ok(!/#[0-9a-fA-F]{6}/.test(build),
     'B2 호스트에 색 리터럴 0건 — 슬롯 색을 손으로 적지 않는다',
     (build.match(/#[0-9a-fA-F]{6}/g) || []).join(',') || '없음');

  const { page, errs } = await open(browser);
  const rows = await sweep(page);
  console.log('  등급 스윕 ' + rows.length + '종 — ' + rows.map(r => 'g' + r.g + ' ' + r.id).join(' · '));
  rows.forEach(r => console.log('   g' + r.g + ' ' + r.id.padEnd(9)
    + '링 ' + r.ringPx + '(선언 ' + r.rim + ')  well ' + r.wellPx + '(선언 ' + r.fill + ')  07 ' + r.tok7.r + '/' + r.tok7.f));

  const empt = await page.evaluate(() => {
    const els = Array.prototype.slice.call(document.querySelectorAll('#slots .slot2'));
    const has = (el) => /--f|--r/.test(el.getAttribute('style') || '');
    return {
      eq: els.filter(e => !e.classList.contains('empty')).every(has),
      none: els.filter(e => e.classList.contains('empty')).every(e => !has(e)),
      nEmpty: els.filter(e => e.classList.contains('empty')).length
    };
  });
  ok(empt.eq && empt.none && empt.nEmpty > 0,
     'B3 토큰은 장착 칸에만 — 빈 칸·미해금 칸(' + empt.nEmpty + '칸)은 등급이 없어 토큰을 안 받는다');

  /* ── [C] 스윕 ─────────────────────────────────────────── */
  const uring = Array.from(new Set(rows.map(r => r.ringPx)));
  const uwell = Array.from(new Set(rows.map(r => r.wellPx)));
  ok(uring.length === rows.length && uwell.length === rows.length,
     'C1 파랑 고정 0건 — 링·면이 등급 ' + rows.length + '종만큼 갈린다(찍힌 픽셀)',
     '링 ' + uring.length + '색 · well ' + uwell.length + '색');
  const ringHit = rows.filter(r => r.ringPx === r.rim).length;
  ok(ringHit === rows.length,
     'C2 링(찍힌 픽셀) = `SK_RIM[g]` 전 등급 정확 일치',
     ringHit + '/' + rows.length + ' · ' + rows.map(r => 'g' + r.g + ' ' + r.ringPx + (r.ringPx === r.rim ? '=' : '≠') + r.rim).join(' '));
  const wellHit = rows.filter(r => near(r.wellPx, blend(r.fill), 3)).length;
  ok(wellHit === rows.length,
     'C3 면(찍힌 픽셀) = `SK_FILL[g]` + 쿨타임 딤 전 등급 일치(±3)',
     wellHit + '/' + rows.length + ' · ' + rows.map(r => 'g' + r.g + ' ' + r.wellPx).join(' '));
  ok(rows.every(r => !rows.some(o => o !== r && o.ringPx === r.ringPx)),
     'C4 어느 두 등급도 같은 링 색을 안 쓴다(«희귀 파랑 하나» 로 접히는 자리 0건)');

  /* ── [D] 07 일치 ──────────────────────────────────────── */
  const same = rows.filter(r => r.mainTok.f === r.tok7.f && r.mainTok.r === r.tok7.r).length;
  ok(same === rows.length,
     'D1 같은 소스 — 메인 슬롯 인라인 토큰 = 07 시트 `.sk-slot` 인라인 토큰(전 등급)',
     same + '/' + rows.length + ' · ' + rows.map(r => 'g' + r.g + ' ' + r.mainTok.r + '/' + r.mainTok.f).join(' '));
  ok(rows.every(r => r.mainTok.f === r.fill && r.mainTok.r === r.rim),
     'D2 그 토큰의 출처는 표다 — 인라인 값 = `SK_FILL[g]`/`SK_RIM[g]`');

  /* ── [E] 불변 ─────────────────────────────────────────── */
  const st = await page.evaluate(() => {
    const cs = (el, pe) => getComputedStyle(el, pe || null);
    const one = (el) => ({
      ring: (cs(el, '::before').backgroundImage.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/) || [''])[0].toUpperCase(),
      well: cs(el.querySelector('.cdw')).backgroundColor,
      sh: cs(el).boxShadow
    });
    const id = S.eqSkill[0];
    skillCd[id] = 0; drawSlots();
    const els = Array.prototype.slice.call(document.querySelectorAll('#slots .slot2'));
    const ready = els[0];
    const out = {
      readyOn: ready.classList.contains('ready'),
      readyCdv: ready.querySelector('.cdv').style.height,
      ready: one(ready),
      lock: one(els.find(e => e.classList.contains('empty') && !e.classList.contains('free')) || els[7]),
      innerRing: cs(ready.querySelector('.cdw')).boxShadow
    };
    skillCd[id] = 999; drawSlots();
    out.coolCdv = ready.querySelector('.cdv').style.height;
    out.coolOn = !ready.classList.contains('ready');
    return out;
  });
  ok(st.readyOn && /255,\s*174,\s*43/.test(st.ready.ring),
     'E1 활성 골드 링 불변 — 쿨타임이 끝나면 링은 등급색이 아니라 **상태 신호**(#ffae2b)다',
     st.ready.ring);
  ok(/7\.45px/.test(st.innerRing) && /254,\s*254,\s*12/.test(st.innerRing),
     'E2 활성 안쪽 노란 링(7.45px #fefe0c) 불변 — A4 가 잰 값 그대로', st.innerRing.replace(/\s+/g, ' '));
  ok(/185,\s*188,\s*203/.test(st.lock.ring) && /69,\s*68,\s*100/.test(st.lock.well),
     'E3 미해금 칸은 회색 그대로(링 #b9bccb · 면 #454464) — 등급이 없는 칸은 토큰을 안 읽는다',
     st.lock.ring + ' / ' + st.lock.well);
  ok(st.readyCdv === '0%' && st.coolCdv === '100%' && st.coolOn,
     'E4 쿨타임 오버레이 회귀 — 끝 0% ↔ 도는 중 100% 로 그대로 오간다',
     st.readyCdv + ' ↔ ' + st.coolCdv);
  ok(errs.length === 0, 'E5 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await page.context().close();

  /* ── [R] 되돌림 시험 ──────────────────────────────────── */
  /* 토큰을 «희귀 파랑» 상수로 되돌린 사본 — 수리 전과 같은 그림이다. C1·C2 가 반드시 빨개져야 한다. */
  const poison = await open(browser, '#slots .slot2{--f:#367cc1!important;--r:#25d8fe!important}');
  const back = await sweep(poison.page);
  const bring = Array.from(new Set(back.map(r => r.ringPx)));
  const bwell = Array.from(new Set(back.map(r => r.wellPx)));
  ok(bring.length === 1 && bwell.length === 1,
     'R1 되돌림 시험 — 토큰을 파랑 상수로 되돌리면 등급 ' + back.length + '종이 다시 **한 색**(자가 그 손잡이를 지난다)',
     '링 ' + bring.join(',') + ' · well ' + bwell.join(','));
  ok(back.every(r => r.ringPx !== r.rim),
     'R2 되돌림 시험 — 그 사본에서는 C2(링 = SK_RIM[g])가 전 등급 빨갛다',
     back.filter(r => r.ringPx === r.rim).length + '건만 일치(0 이어야 한다)');
  await poison.page.context().close();

  await browser.close();
  console.log('\nVERIFY716 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
