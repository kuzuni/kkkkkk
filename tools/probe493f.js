#!/usr/bin/env node
/* 재현 6 — 600행 열기 비용의 처방 후보를 **교차 측정**으로 가른다.
 *   node tools/probe493f.js
 *
 * probe493e 는 «부품을 하나씩 빼며» 순서대로 쟀다가 셋이 전부 Δ≈300 을 내며 서로를 지웠다 —
 * 첫 측정이 캐시·JIT 를 데우는 값이라 **순서 효과**가 처방보다 컸다. 그래서 여기서는
 * A/B 를 **번갈아** 재고(각 12회), 워밍업 4회를 버린다.
 *
 *   A = 지금 그대로(600행)
 *   B = 패스 칸 아이콘에만 `loading="lazy" decoding="async"` — DOM·픽셀은 그대로다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    PASS_TABS.stage.n = 600; S.best = 1500;
    const realIc = curIc;
    const lazyOn = () => { curIc = (k, s) => realIc(k, s).replace('<img ', '<img loading="lazy" decoding="async" '); };
    const lazyOff = () => { curIc = realIc; };
    const one = () => { closePass(); const t = performance.now(); openPass('stage'); return performance.now() - t; };
    const A = [], B = [];
    for (let i = 0; i < 16; i++) {
      lazyOff(); const a = one();
      lazyOn();  const b = one();
      if (i >= 4) { A.push(a); B.push(b); }
    }
    lazyOff();
    const med = v => { v = v.slice().sort((x, y) => x - y); return +v[v.length >> 1].toFixed(1); };
    /* 픽셀·DOM 이 그대로인가 — lazy 를 켠 채 DOM 수를 다시 센다 */
    lazyOn(); openPass('stage');
    const dom = { rows: document.querySelectorAll('#psTk .ps-r').length,
                  boxes: document.querySelectorAll('#psTk .ps-bx').length,
                  imgs: document.querySelectorAll('#psTk .ps-bx img.cic').length };
    const far = document.querySelectorAll('#psTk .ps-bx img.cic')[1500].getBoundingClientRect();
    lazyOff(); openPass('stage');
    return { a: med(A), b: med(B), aAll: A.map(x => +x.toFixed(0)), bAll: B.map(x => +x.toFixed(0)),
             dom, farW: +far.width.toFixed(1), farH: +far.height.toFixed(1) };
  });

  console.log('교차 측정(600행 · 12회 중앙값)');
  console.log('   A 지금 그대로          ' + r.a + 'ms   ' + JSON.stringify(r.aAll));
  console.log('   B 아이콘 lazy+async    ' + r.b + 'ms   ' + JSON.stringify(r.bAll));
  console.log('   Δ ' + (r.a - r.b).toFixed(1) + 'ms (' + ((1 - r.b / r.a) * 100).toFixed(0) + '% 절감)');
  console.log('   DOM 그대로: 행 ' + r.dom.rows + ' 칸 ' + r.dom.boxes + ' 아이콘 ' + r.dom.imgs
    + ' · 오프스크린 아이콘 상자 ' + r.farW + '×' + r.farH);
  await browser.close();
})();
