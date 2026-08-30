#!/usr/bin/env node
/* 재현 2 — 493 «600행이 느리다» 의 **어디가** 느린가를 가른다(처방을 고르기 전에).
 *
 *   node tools/probe493b.js
 *
 *   [1] 시간 쪼개기 — 문자열 조립 / innerHTML 파싱 / 스크롤(레이아웃) 셋으로
 *   [2] 후보 ⓐ 창 가상화(±30행) 모의 — 얼마나 빨라지나 · 무엇을 잃나(DOM 표본 수)
 *   [3] 후보 ⓑ `content-visibility:auto` 모의 — DOM 은 그대로 두고 오프스크린 렌더만 건너뛴다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');

(async () => {
  console.log('=== probe493b — 600행 비용의 내역 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);

  const split = await p.evaluate(() => {
    PASS_TABS.stage.n = 600; S.best = 1500;
    const med = f => { const a = []; for (let i = 0; i < 15; i++) a.push(f()); a.sort((x, y) => x - y); return a[7]; };
    /* 조립만 — renderPass 의 루프를 그대로 흉내 낸다(같은 함수를 부르므로 값이 같다) */
    const build = med(() => {
      const t = performance.now(); let h = '';
      const T = passT();
      for (let i = 0; i < T.n; i++) for (let c = 0; c < T.cols; c++) { const r = passRw(i, c); h += r.ic + r.n + passGot(i, c) + passOpen(i); }
      return performance.now() - t;
    });
    /* 렌더 전체(조립 + innerHTML) */
    const render = med(() => { const t = performance.now(); renderPass(); return performance.now() - t; });
    /* 스크롤(레이아웃 강제) */
    const scroll = med(() => { const t = performance.now(); passScroll(); document.getElementById('psList').scrollTop; return performance.now() - t; });
    /* 강제 레이아웃 한 번 */
    const layout = med(() => { const t = performance.now(); document.getElementById('psTk').getBoundingClientRect(); document.querySelectorAll('#psTk .ps-bx')[900].getBoundingClientRect(); return performance.now() - t; });
    return { build, render, scroll, layout };
  });
  console.log('[1] 내역(600행 · 중앙값 ms)');
  console.log('    모델 조립만        ' + split.build.toFixed(1));
  console.log('    renderPass 전체    ' + split.render.toFixed(1) + '  (= 조립 + innerHTML 파싱)');
  console.log('    passScroll         ' + split.scroll.toFixed(1));
  console.log('    강제 레이아웃 1회  ' + split.layout.toFixed(1));

  /* ── [2] 창 가상화 모의 ────────────────────────────────────────── */
  const win = await p.evaluate(() => {
    const tk = document.getElementById('psTk');
    const all = tk.innerHTML;
    const rows = [...tk.querySelectorAll('.ps-r')];
    const last = passLast();
    const keep = rows.slice(Math.max(0, last - 30), last + 31).map(r => r.outerHTML).join('');
    const med = f => { const a = []; for (let i = 0; i < 15; i++) a.push(f()); a.sort((x, y) => x - y); return a[7]; };
    const t = med(() => { const a = performance.now(); tk.innerHTML = keep; return performance.now() - a; });
    const kept = { rows: tk.querySelectorAll('.ps-r').length, boxes: tk.querySelectorAll('.ps-bx').length,
                   openHex: tk.querySelectorAll('.ps-hex:not(.lk)').length, alert: tk.querySelectorAll('.ps-bx.alert').length };
    tk.innerHTML = all;
    const full = { openHex: tk.querySelectorAll('.ps-hex:not(.lk)').length, alert: tk.querySelectorAll('.ps-bx.alert').length };
    return { t, kept, full };
  });
  console.log('\n[2] 후보 ⓐ 창 가상화(±30행) — innerHTML ' + win.t.toFixed(1) + 'ms'
    + ' · 남는 DOM 행 ' + win.kept.rows + ' 칸 ' + win.kept.boxes);
  console.log('    ⚠ 잃는 것: 해금 육각 ' + win.full.openHex + ' → ' + win.kept.openHex
    + ' · 레드닷 칸 ' + win.full.alert + ' → ' + win.kept.alert + '  (verify428 [D]·verify301 이 DOM 으로 센다)');

  /* ── [3] content-visibility 모의 ───────────────────────────────── */
  const cv = await p.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'probe493cv';
    st.textContent = '#psTk .ps-r{content-visibility:auto;contain-intrinsic-size:1010px 229.85px}';
    document.head.appendChild(st);
    const med = f => { const a = []; for (let i = 0; i < 20; i++) a.push(f()); a.sort((x, y) => x - y); return a[10]; };
    const open = med(() => { closePass(); const a = performance.now(); openPass('stage'); return performance.now() - a; });
    const tk = document.getElementById('psTk');
    const geo = { rows: tk.querySelectorAll('.ps-r').length, boxes: tk.querySelectorAll('.ps-bx').length,
                  openHex: tk.querySelectorAll('.ps-hex:not(.lk)').length, alert: tk.querySelectorAll('.ps-bx.alert').length,
                  h: tk.getBoundingClientRect().height.toFixed(1) };
    /* 오프스크린 칸의 rect 가 여전히 읽히는가(게이트가 rect 를 쓴다) */
    const far = tk.querySelectorAll('.ps-bx')[1500].getBoundingClientRect();
    st.remove();
    return { open, geo, farW: far.width.toFixed(1), farH: far.height.toFixed(1) };
  });
  console.log('\n[3] 후보 ⓑ content-visibility:auto — 열기 중앙값 ' + cv.open.toFixed(1) + 'ms');
  console.log('    DOM 그대로: 행 ' + cv.geo.rows + ' 칸 ' + cv.geo.boxes + ' · 해금 육각 ' + cv.geo.openHex
    + ' · 레드닷 ' + cv.geo.alert + ' · 트랙 높이 ' + cv.geo.h);
  console.log('    오프스크린 칸(#1500) rect = ' + cv.farW + '×' + cv.farH + ' (0 이면 게이트의 자가 깨진다)');

  await browser.close();
})();
