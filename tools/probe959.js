/* 작업 959 재현 프로브 — «#bossSkip(보스 연출 스킵 토글)이 좌측 사이드 아이콘을 가려서
 *                         탭이 아이콘 대신 그 버튼에 착지한다»
 *
 *   node tools/probe959.js
 *   P959_BEFORE=<sha> node tools/probe959.js     # 수리 전 사본을 꺼낼 커밋
 *
 * 등재문(PROGRESS 959, sess-1828-1415 워커 B — 946 2회차 회귀 스윕 곁다리):
 *   `tools/verify74.js` 「사이드 아이콘」 191/200 · 실패 9건이 전부 한 얼굴
 *   («가려짐 · 최상위=div#bossSkip.sm-sk.sh · 착지도 같은 노드»).
 *
 * ⚑ 338·341·350 규칙 — 처방을 따르기 **전에** 재현한다. 이 파일은 «고쳤다» 를 재는 자가
 *   아니라(그건 `tools/verify959.js`) **무엇이 얼마나 가려졌고 그 탭이 어디에 떨어졌는가**를
 *   숫자로 박는 자리다. 그래서 **수리 전 사본과 현재 파일을 둘 다 띄워 나란히 잰다**
 *   (probe360·probe654 와 같은 처방 — 수리 뒤에도 이 파일이 살아 있으려면 «전» 을
 *    다시 만들 수 있어야 한다). 756 사다리로 얕은 클론에서도 판다.
 *
 * 한 트리에서 재는 것 다섯:
 *   [1] 표시 경로  — `#bossSkip.sh` 를 켜는 것은 제품의 `drawHud()` 다(`bf || fm`).
 *                    손으로 클래스를 붙이지 않는다 — 그러면 «내가 만든 상태» 를 재게 된다.
 *   [2] 상자 vs 잉크 — 상자 폭에서 잉크 폭을 뺀 것이 곧 «탭을 먹는 투명 여백» 이다.
 *   [3] 덮임      — 사이드 아이콘 칸 중심에서 `elementFromPoint` 가 그 칸을 돌려주는가.
 *                    74 의 `aim()` 이 쓰는 것과 같은 자다. + 그 y 띠 전폭 스윕.
 *   [4] 피해      — 그 칸을 실제로 탭(CDP 터치 · 74 와 같은 90ms)하면 무엇이 일어나는가.
 *                    수리 전 = 팝업이 안 열리고 **`S.opt.fxSkip` 이 뒤집힌다**(지시한 적 없는 변경).
 *   [5] 토글 잉크 — 잉크 중심 탭은 두 트리 모두에서 먹혀야 한다(수리가 699 를 죽이면 안 된다).
 *
 * ⚠ 74 와 달리 여기서는 탭을 칸당 1발만 던진다 — 이 결함은 확률이 아니라 **기하**라서
 *   한 발이면 갈린다(등재문의 «매 실행 같은 9건» 과 같은 성질. 74 의 9/200 은 «칸 9개» 가
 *   아니라 200발 중 보스 상태와 겹친 발 수다 — 등재문 정정, 아래 [3] 주석).
 *
 * 110 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
/* 수리 «전» = 959 의 제품 변경이 들어가기 직전 커밋(= 이 프로브를 신설한 1회차의 claim 커밋).
   파일을 손으로 되돌려 적으면 그 사본이 또 하나의 «상수» 가 된다(LESSONS 336-②) — 히스토리에서 꺼낸다. */
const BEFORE_REF = process.env.P959_BEFORE || 'f8e073a';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/** 한 트리를 띄워 다섯 축을 잰다. 판정은 하지 않는다 — 숫자만 돌려준다. */
async function measure(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof drawHud === 'function');
  await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x, y) => {
    const started = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await new Promise(r => setTimeout(r, 90));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await started.catch(() => {});
  };
  const out = { errs, err: '' };
  try {
    /* 소리는 이 측정과 무관한 소음이다(74 와 같은 처방).
       착지 기록도 74 와 **같은 자**를 쓴다 — «그 탭이 의도한 요소에 도달했는가» 를
       `closest()` 로 세는 것이 74 의 측정이고, 959 는 그 자가 낸 실패를 재현하는 자리다.
       (팝업 DOM 을 칸마다 이름으로 확인하는 길은 자를 두 벌로 적는 것이다 — 13회차 [R12]) */
    await page.evaluate(() => {
      if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
      if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
      window.__hit = ''; window.__land = '';
      const desc = el => { if (!el) return '(null)'; let s = el.tagName.toLowerCase();
        if (el.id) s += '#' + el.id; if (typeof el.className === 'string' && el.className.trim())
        s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
      document.addEventListener('click', e => {
        window.__land = desc(e.target);
        const b = e.target && e.target.closest && e.target.closest('.side .ibtn[data-pop]');
        if (b) window.__hit = b.dataset.pop;
      }, true);
      /* 74 의 `__closeAll` 과 같은 처방 — 이름을 하나 부르지 않고 «있는 닫기 함수 전부» 를 부른다.
         959 는 칸마다 다른 팝업을 여니 이름을 손으로 적으면 그 목록이 곧 부패한다. */
      window.__closeAll = () => {
        for (const n of ['closeAttend', 'closeRoulette', 'closeQuest', 'closePromo', 'closeColl21',
                         'closeBless', 'closeModal', 'closeMenu', 'closeRelw', 'closeShopPage']) {
          const f = window[n];
          if (typeof f === 'function') { try { f(); } catch (_) {} }
        }
      };
    });

    /* [1] 표시 경로 — 제품의 조건(`fm` = 보스 재도전 대기)으로 켠다 */
    out.show = await page.evaluate(() => {
      const el = document.getElementById('bossSkip');
      const before = el.classList.contains('sh');
      S.bossFarm = true;                 /* 보스 도전 대기 = 스테이지 화면 그대로 + [스테이지 재도전] */
      drawHud();
      return { before, after: el.classList.contains('sh'), cls: el.className };
    });

    /* [2] 상자 vs 잉크 */
    out.geo = await page.evaluate(() => {
      const el = document.getElementById('bossSkip');
      const b = el.getBoundingClientRect();
      let l = Infinity, r = -Infinity, t = Infinity, bt = -Infinity;
      el.querySelectorAll(':scope > *').forEach(c => {
        const q = c.getBoundingClientRect();
        l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); bt = Math.max(bt, q.bottom);
      });
      return { box: { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height },
               ink: { l, r, t, b: bt, w: r - l, h: bt - t }, padL: l - b.left, padR: b.right - r };
    });

    /* [3] 덮임 — 사이드 아이콘 + 그 y 띠 전폭 스윕 */
    const R = await page.evaluate(() => {
      const desc = el => { if (!el) return '(null)'; let s = el.tagName.toLowerCase();
        if (el.id) s += '#' + el.id; if (typeof el.className === 'string' && el.className.trim())
        s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
      const side = [];
      document.querySelectorAll('#sideL .ibtn, #sideR .ibtn').forEach(el => {
        const b = el.getBoundingClientRect();
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        const top = document.elementFromPoint(x, y);
        side.push({ pop: el.dataset.pop || el.title || '?', host: el.parentElement.id, x, y,
                    top: desc(top), covered: !(top && top.closest && top.closest('.ibtn')) });
      });
      const sk = document.getElementById('bossSkip').getBoundingClientRect();
      const band = [];
      document.querySelectorAll('button, [onclick], [data-pop], .ibtn, .tab, .bbtn, #menub, .clk').forEach(el => {
        if (el.closest('#bossSkip')) return;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return;
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        if (y < sk.top || y > sk.bottom) return;
        const top = document.elementFromPoint(x, y);
        if (top && top.closest && top.closest('#bossSkip')) band.push({ el: desc(el), x, y });
      });
      return { side, band };
    });
    out.side = R.side; out.band = R.band;

    /* [4] 피해 — 사이드 칸을 실제로 탭한다(가려졌든 아니든 같은 발을 던져야 두 트리가 비교된다) */
    out.taps = [];
    for (const c of out.side) {
      /* ⚠ 칸당 **3발**을 던지고 «한 발이라도 도달했는가» 로 센다. 이 결함은 기하라서 한 발이면
         갈리지만, 74 가 재는 **다른** 결함(down↔up 사이 재렌더로 노드가 갈리는 탭 유실)이
         이 자리에도 섞여 있어 1발짜리 표본은 그쪽 확률에 흔들린다(실측: 수리 후 promo 1건).
         959 가 재는 것은 «가려짐» 이지 «유실» 이 아니므로 그 축을 표본으로 눌러 둔다. */
      let r = { skip: false, hit: '', land: '' }, skip0 = false, flipped = false;
      for (let k = 0; k < 3; k++) {
        skip0 = await page.evaluate(() => { window.__hit = ''; window.__land = ''; return !!S.opt.fxSkip; });
        await tap(c.x, c.y);
        await page.waitForTimeout(140);
        const q = await page.evaluate(() => ({ skip: !!S.opt.fxSkip, hit: window.__hit, land: window.__land }));
        if (q.skip !== skip0) flipped = true;
        if (q.land) r = q;                                     /* 착지가 있는 발을 표본으로 남긴다 */
        if (q.hit === c.pop) { r = q; break; }
        await page.evaluate(() => window.__closeAll());
        if (q.skip !== skip0) await page.evaluate(() => { S.opt.fxSkip = !S.opt.fxSkip; fxSyncSkip(); });
        await page.evaluate(() => { S.bossFarm = true; drawHud(); });
        await page.waitForTimeout(160);
      }
      out.taps.push({ pop: c.pop, covered: c.covered, hit: r.hit === c.pop, land: r.land || '(click 없음)', flipped });
      /* 다음 발을 같은 조건에서 던지려면 열린 것은 닫고 뒤집힌 것은 되돌린다(LESSONS 74-1).
         팝업이 열리면 `drawHud()` 가 다시 안 돌아 `.sh` 가 남지 않을 수 있으므로 상태도 다시 세운다. */
      await page.evaluate(() => window.__closeAll());
      if (r.skip !== skip0) await page.evaluate(() => { S.opt.fxSkip = !S.opt.fxSkip; fxSyncSkip(); });
      await page.evaluate(() => { S.bossFarm = true; drawHud(); });
      await page.waitForTimeout(160);
    }

    /* [5] 토글 잉크 — 699 가 만든 기능은 두 트리 모두에서 살아 있어야 한다 */
    const g = out.geo;
    const before5 = await page.evaluate(() => { window.__closeAll(); S.bossFarm = true; drawHud(); return !!S.opt.fxSkip; });
    await page.waitForTimeout(160);
    await tap((g.ink.l + g.ink.r) / 2, (g.ink.t + g.ink.b) / 2);
    await page.waitForTimeout(140);
    out.ink = { flipped: await page.evaluate(() => !!S.opt.fxSkip) !== before5,
                x: (g.ink.l + g.ink.r) / 2, y: (g.ink.t + g.ink.b) / 2 };
  } catch (e) {
    out.err = String(e && e.message || e);
  }
  await page.close();
  return out;
}

function report(tag, m) {
  console.log('\n── ' + tag + ' ' + '─'.repeat(Math.max(0, 60 - tag.length)));
  if (m.err) { console.log('  [!] 측정 예외: ' + m.err); return; }
  console.log('  [1] `.sh` ' + m.show.before + ' → ' + m.show.after + ' (' + m.show.cls + ')');
  const g = m.geo;
  console.log('  [2] 상자 x ' + g.box.l.toFixed(1) + '..' + g.box.r.toFixed(1) + ' (w ' + g.box.w.toFixed(1) + ') · y '
    + g.box.t.toFixed(1) + '..' + g.box.b.toFixed(1) + ' (h ' + g.box.h.toFixed(1) + ')');
  console.log('      잉크 x ' + g.ink.l.toFixed(1) + '..' + g.ink.r.toFixed(1) + ' (w ' + g.ink.w.toFixed(1) + ')'
    + ' ⇒ 투명 여백 좌 ' + g.padL.toFixed(1) + ' · 우 ' + g.padR.toFixed(1)
    + ' = 상자의 ' + ((g.padL + g.padR) / g.box.w * 100).toFixed(1) + '%');
  m.side.forEach(c => console.log('  [3] ' + (c.covered ? '✗ 가려짐' : '· 맨 위 ') + ' ' + c.host + '/' + c.pop
    + ' (' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ') 최상위=' + c.top));
  console.log('  [3b] 띠 전폭에서 `#bossSkip` 에 먹힌 «누르는 것» ' + m.band.length + '건'
    + (m.band.length ? ': ' + m.band.map(b => b.el).join(' · ') : ''));
  m.taps.forEach(t => console.log('  [4] ' + t.pop + ' 탭 → 그 칸에 도달 ' + (t.hit ? '○' : '✗')
    + ' · 착지=' + t.land + ' · fxSkip ' + (t.flipped ? '**뒤집힘**' : '불변')));
  console.log('  [5] 잉크 중심(' + m.ink.x.toFixed(0) + ',' + m.ink.y.toFixed(0) + ') 탭 → fxSkip '
    + (m.ink.flipped ? '뒤집힘(정상)' : '**불변 — 토글이 죽었다**'));
}

(async () => {
  /* 수리 «전» 사본 — 히스토리에서 꺼내 **저장소 루트**에 둔다(229 선례: index.html 이 상대 경로
     리소스를 물고 있어 /tmp 에 두면 404 다). 756 사다리가 얕은 클론에서도 판다. */
  let beforeFile = null, beforeWhy = '';
  try {
    const got = require('./gitrev756').show(BEFORE_REF, 'index.html');
    if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
    if (got.how) console.log('[i]' + got.how);
    beforeFile = path.join(ROOT, `.p959-before-${process.pid}.html`);
    fs.writeFileSync(beforeFile, got.buf);
  } catch (e) { beforeWhy = e.message; }

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });

  console.log('\n=== 959 — `#bossSkip` 투명 여백이 사이드 아이콘 탭을 먹는다 (수리 전/후) ===');

  let A = null;
  if (beforeFile) {
    A = await measure(ctx, 'file://' + beforeFile.replace(/\\/g, '/'));
    report(`수리 전 (${BEFORE_REF})`, A);
  } else {
    console.log(`\n  [!] 수리 전 사본(${BEFORE_REF})을 못 꺼냈다 — «전» 블록은 건너뛴다: ${beforeWhy}`);
  }
  const B = await measure(ctx, 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
  report('수리 후 (작업 트리)', B);

  await browser.close();
  if (beforeFile) { try { fs.unlinkSync(beforeFile); } catch (_) {} }

  console.log('\n── 판정 ' + '─'.repeat(54));
  if (A && !A.err) {
    /* 수리 전 = 결함이 **있어야** 한다. 없으면 재현 실패 = 등재문이 기각된 것이다(338 규칙). */
    ok(A.show.before === false && A.show.after === true, '전 — `.sh` 는 제품 `drawHud()` 가 켠다(손으로 안 붙였다)');
    ok(A.geo.padL > 300 && A.geo.padR > 300,
      '전 — 투명 여백 좌 ' + A.geo.padL.toFixed(1) + ' · 우 ' + A.geo.padR.toFixed(1) + 'px (> 300 = 사이드 열 폭 100 을 통째로 덮는다)');
    const ac = A.side.filter(c => c.covered);
    ok(ac.length > 0, '전 — 가려진 사이드 칸 ' + ac.length + '건 (' + ac.map(c => c.pop).join(',') + ') = 등재문의 재현');
    ok(ac.every(c => c.top.indexOf('bossSkip') >= 0), '전 — 가린 것은 전부 `#bossSkip`');
    const bad = A.taps.filter(t => t.covered);
    ok(bad.length > 0 && bad.every(t => !t.hit), '전 — 가려진 칸 탭은 그 칸에 도달하지 못한다(74 와 같은 자)');
    ok(bad.every(t => t.flipped), '전 — 대신 «연출 스킵» 설정이 뒤집힌다(사용자가 지시한 적 없는 변경)');
    ok(A.ink.flipped, '전 — 잉크 탭은 정상(699 기능 자체는 살아 있다)');
  } else if (A && A.err) {
    console.log('  [!] 수리 전 측정이 예외로 끝났다 — 위 블록 참조');
  }
  /* 수리 후 = 결함이 **없어야** 한다. */
  ok(B.show.before === false && B.show.after === true, '후 — `.sh` 표시 경로 불변(699 회귀 없음)');
  ok(B.geo.padL <= 3 && B.geo.padR <= 3,
    '후 — 투명 여백 좌 ' + B.geo.padL.toFixed(1) + ' · 우 ' + B.geo.padR.toFixed(1) + 'px (≤ 3 = 상자가 잉크만 하다)');
  ok(B.side.every(c => !c.covered), '후 — 가려진 사이드 칸 0건 (' + B.side.length + '칸 전수)');
  ok(B.band.length === 0, '후 — 그 y 띠 전폭에서도 먹힌 «누르는 것» 0건');
  ok(B.taps.every(t => t.hit), '후 — 사이드 칸 ' + B.taps.length + '칸 전부 탭 한 발이 그 칸에 도달한다');
  ok(B.taps.every(t => !t.flipped), '후 — 사이드 칸 탭이 «연출 스킵» 을 건드리지 않는다');
  ok(B.ink.flipped, '후 — 잉크 탭은 그대로 먹힌다(699 기능 보존)');
  /* 자리는 한 칸도 안 움직여야 한다 — 이 수리는 **상자 폭**만 바꾼다 */
  if (A && !A.err) {
    const dc = Math.abs((B.geo.ink.l + B.geo.ink.r) / 2 - (A.geo.ink.l + A.geo.ink.r) / 2);
    const dy = Math.abs(B.geo.ink.t - A.geo.ink.t);
    ok(dc <= 1.5 && dy <= 0.5 && Math.abs(B.geo.ink.w - A.geo.ink.w) <= 1.5,
      '전↔후 — 잉크 중심 Δ' + dc.toFixed(2) + 'px · 상변 Δ' + dy.toFixed(2) + 'px · 폭 Δ'
      + (B.geo.ink.w - A.geo.ink.w).toFixed(2) + 'px = 보이는 그림은 그대로다');
  }

  const errs = (B.errs || []).concat(A ? A.errs : []);
  console.log('');
  if (errs.length) console.log('  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  console.log((fail ? 'PROBE959 FAIL' : 'PROBE959 PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
