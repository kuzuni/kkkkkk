#!/usr/bin/env node
/* 재현 2 — 493 «600행이 느리다» 의 **어디가** 느린가를 가른다(처방을 고르기 전에).
 *
 *   node tools/probe493b.js
 *
 *   [1] 시간 쪼개기 — 문자열 조립 / innerHTML 파싱 / 스크롤(레이아웃) 셋으로
 *   [2] 후보 ⓐ 창 가상화(±30행) 모의 — 얼마나 빨라지나 · 무엇을 잃나(DOM 표본 수)
 *   [3] 후보 ⓑ `content-visibility:auto` 모의 — DOM 은 그대로 두고 오프스크린 렌더만 건너뛴다
 *
 * ⚑ 749(2026-09-01) — **이 프로브가 재던 그림은 526 이 바꿔 놓았다.** 493 의 후보 ⓐ(창 가상화)가
 *   실제로 채택돼 `renderPass()` 는 트랙만 세우고 `passFillRows()` 가 «창» 만 채운다 ⇒ DOM 에는
 *   600행이 아니라 15~24행(칸 45~72)만 있다. 하드코딩 인덱스 두 자리(`.ps-bx`[900] · [1500])가
 *   그 창 밖이 되어 `page.evaluate` 예외가 밖으로 나가 **[1]~[3] 이 통째로 안 돌았다**(696 «빨간 죽음» 꼴).
 *   ⇒ 인덱스를 **살아 있는 마지막 칸**으로 바꿨다(제품 0줄). 아래 [2]·[3] 의 «잃는 것» 수치는
 *   이제 «창 ↔ 창» 대조라 채택 «전» 의 비교표가 아니다 — 그 결정의 근거는 `docs/review/493-*.md` 에 있다.
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
    /* 강제 레이아웃 한 번.
       ⚑ 749 — 여기는 원래 `.ps-bx`[900] 을 잡았다. 526 이 **창 가상화**(`passFillRows()`)를 올린 뒤로
       DOM 에는 600행 전부가 아니라 «창» 만 있어(행 15~24 · 칸 45~72) 그 인덱스가 통째로 창 밖이다
       ⇒ `undefined.getBoundingClientRect()` 가 `page.evaluate` 밖으로 나가 [1]~[3] 이 안 돌았다.
       인덱스를 넓히는 것이 아니라 **살아 있는 마지막 칸**을 잡는다(창 크기가 또 바뀌어도 안 죽는다).
       창이 비면 재는 시늉을 하지 않고 그 사실을 아래에서 ⚠ 로 적는다(헛초록 금지). */
    const layout = med(() => {
      const t = performance.now();
      document.getElementById('psTk').getBoundingClientRect();
      const bx = document.querySelectorAll('#psTk .ps-bx');
      if (bx.length) bx[bx.length - 1].getBoundingClientRect();
      return performance.now() - t;
    });
    const win0 = { rows: document.querySelectorAll('#psTk .ps-r').length,
                   boxes: document.querySelectorAll('#psTk .ps-bx').length };
    return { build, render, scroll, layout, win0, n: passT().n };
  });
  console.log('[1] 내역(' + split.n + '행 · 중앙값 ms)');
  console.log('    모델 조립만        ' + split.build.toFixed(1));
  console.log('    renderPass 전체    ' + split.render.toFixed(1) + '  (= 조립 + innerHTML 파싱)');
  console.log('    passScroll         ' + split.scroll.toFixed(1));
  console.log('    강제 레이아웃 1회  ' + split.layout.toFixed(1)
    + '  (창 끝 칸 기준 — DOM 행 ' + split.win0.rows + ' 칸 ' + split.win0.boxes + ')');
  if (!split.win0.boxes) console.log('    ⚠ 창에 칸이 0개다 — 레이아웃 수치는 «잰 것» 이 아니다(526 창 채우기 확인).');

  /* ── [2] 창 가상화 모의 ────────────────────────────────────────── */
  /* ⚑ 749 — 여기는 «±30행만 남기면 어떻게 되나» 를 `rows.slice(last-30, last+31)` 로 흉내 냈다.
     526 이 ⓐ 를 **실제로 채택**한 뒤 그 산수는 뜻을 잃는다 — `querySelectorAll('.ps-r')[i]` 는
     더는 «단계 i» 가 아니고(35997 주석), 창이 이미 15~24행뿐이라 slice 는 빈 배열을 낸다
     (수리 전 이 절은 «해금 육각 15 → 0» 이라는 **거짓 그림**을 찍었을 자리다).
     ⇒ 흉내를 걷고 **채택된 창 자신**을 잰다. «잃는 것» 은 DOM↔DOM 이 아니라 **모델 대비**로 적는다. */
  const win = await p.evaluate(() => {
    const tk = document.getElementById('psTk');
    const [a, b] = passWin();
    const med = f => { const x = []; for (let i = 0; i < 15; i++) x.push(f()); x.sort((m, n) => m - n); return x[7]; };
    /* 창 갱신 비용 = 창을 비웠다 다시 채우는 한 바퀴(526 의 실제 경로) */
    const t = med(() => { const s = performance.now(); psRow.forEach(el => el.remove()); psRow.clear(); passFillRows(); return performance.now() - s; });
    const dom = { rows: tk.querySelectorAll('.ps-r').length, boxes: tk.querySelectorAll('.ps-bx').length,
                  openHex: tk.querySelectorAll('.ps-hex:not(.lk)').length, alert: tk.querySelectorAll('.ps-bx.alert').length };
    const T = passT();
    return { t, win: [a, b], dom, n: T.n, cols: T.cols, openSteps: passLast() + 1, ready: passReadyCnt() };
  });
  console.log('\n[2] 후보 ⓐ 창 가상화 — **526 이 이미 채택했다**(모의 아님). 창 [' + win.win[0] + ', ' + win.win[1] + ')'
    + ' · 창 한 바퀴 다시 채우기 ' + win.t.toFixed(1) + 'ms · DOM 행 ' + win.dom.rows + ' 칸 ' + win.dom.boxes);
  console.log('    ⚠ 잃는 것(모델 대비): 해금 단계 ' + win.openSteps + '/' + win.n
    + ' 중 DOM 해금 육각 ' + win.dom.openHex + ' · 받을 칸 ' + win.ready + ' 중 DOM 레드닷 ' + win.dom.alert);
  console.log('    ⇒ verify428 [D]·verify301 처럼 **DOM 으로 세는** 자는 창 밖을 못 본다 — `passRowEl(i)` 로 창을 옮겨서 집는다.');

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
    /* 오프스크린 칸의 rect 가 여전히 읽히는가(게이트가 rect 를 쓴다).
       ⚑ 749 — 구 `.ps-bx`[1500] 도 526 이후 창 밖이다(즉사가 [1] 에서 먼저 나 여기까지 못 왔을 뿐,
       인덱스를 900 만 고쳤으면 빨간 죽음이 이 줄로 옮겨 앉는다) ⇒ 창 끝 칸으로 잰다. */
    const bxs = tk.querySelectorAll('.ps-bx');
    const far = bxs.length ? bxs[bxs.length - 1].getBoundingClientRect() : null;
    st.remove();
    return { open, geo, idx: bxs.length - 1,
             farW: far ? far.width.toFixed(1) : 'n/a', farH: far ? far.height.toFixed(1) : 'n/a' };
  });
  console.log('\n[3] 후보 ⓑ content-visibility:auto — 열기 중앙값 ' + cv.open.toFixed(1) + 'ms');
  console.log('    DOM 그대로: 행 ' + cv.geo.rows + ' 칸 ' + cv.geo.boxes + ' · 해금 육각 ' + cv.geo.openHex
    + ' · 레드닷 ' + cv.geo.alert + ' · 트랙 높이 ' + cv.geo.h);
  console.log('    창 끝 칸(#' + cv.idx + ') rect = ' + cv.farW + '×' + cv.farH + ' (0 이면 게이트의 자가 깨진다)');

  await browser.close();
})();
