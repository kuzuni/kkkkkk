#!/usr/bin/env node
/* 재현 5 — 600행 열기 317ms 의 **어느 부품**이 비싼가. 처방을 고르기 전 마지막 질문.
 *   node tools/probe493e.js
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
    const med = f => { const a = []; for (let i = 0; i < 15; i++) { closePass(); const t = performance.now(); f(); a.push(performance.now() - t); } a.sort((x, y) => x - y); return +a[7].toFixed(1); };
    const base = med(() => openPass('stage'));

    /* ① 아이콘 <img> 1800개를 뺀다 */
    const realIc = curIc; curIc = () => '';
    PASS_CUR[0].ic = ''; PASS_TABS.att.rw = ((f) => (i, c) => Object.assign({}, f(i, c), { ic: '' }))(PASS_TABS.att.rw);
    const noIc = med(() => openPass('stage'));
    curIc = realIc;

    /* ② 칸(.ps-bx) 배경 그라디언트·클립을 뺀다 */
    const st = document.createElement('style'); st.textContent = '#psTk .ps-cf,#psTk .ps-cp{background:none}';
    document.head.appendChild(st);
    const noCol = med(() => openPass('stage'));
    st.remove();

    /* ③ 육각 클립패스를 뺀다 */
    const st2 = document.createElement('style'); st2.textContent = '#psTk .ps-hex,#psTk .ps-hex>s{clip-path:none}';
    document.head.appendChild(st2);
    const noHex = med(() => openPass('stage'));
    st2.remove();

    return { base, noIc, noCol, noHex };
  });

  console.log('600행 openPass 중앙값(ms) — 부품을 하나씩 빼며');
  console.log('   그대로              ' + r.base);
  console.log('   아이콘 <img> 없이   ' + r.noIc + '   (Δ ' + (r.base - r.noIc).toFixed(1) + ')');
  console.log('   컬럼 배경 없이      ' + r.noCol + '   (Δ ' + (r.base - r.noCol).toFixed(1) + ')');
  console.log('   육각 clip-path 없이 ' + r.noHex + '   (Δ ' + (r.base - r.noHex).toFixed(1) + ')');
  await browser.close();
})();
