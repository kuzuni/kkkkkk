#!/usr/bin/env node
/* 재현 4 — probe493c 가 «리스트 전면이 달라진다» 를 냈다. **무엇이** 달라지는가를 색으로 묻는다.
 *   node tools/probe493d.js
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
  await p.evaluate(() => { S.best = 120; S.pass.prem = { stage: 1 }; openPass('stage');
    document.getElementById('psList').scrollTop = 0; });
  await p.waitForTimeout(400);
  const a = await p.screenshot();
  await p.evaluate(() => { const s = document.createElement('style'); s.id = 'cvp';
    s.textContent = '#psTk .ps-r{content-visibility:auto;contain-intrinsic-size:1080px 229.85px}';
    document.head.appendChild(s); });
  await p.waitForTimeout(400);
  const b = await p.screenshot();

  const out = await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const grab = async s => { const im = await load(s); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const A = await grab(x), B = await grab(y), W = 1080;
    const samples = [], band = {};
    for (let i = 0; i < A.length; i += 4) {
      if (A[i] === B[i] && A[i + 1] === B[i + 1] && A[i + 2] === B[i + 2]) continue;
      const px = (i / 4) % W, py = ((i / 4) / W) | 0;
      band[(py / 100 | 0) * 100] = (band[(py / 100 | 0) * 100] || 0) + 1;
      if (samples.length < 10 && Math.random() < 0.001)
        samples.push({ px, py, a: [A[i], A[i + 1], A[i + 2]].join(','), b: [B[i], B[i + 1], B[i + 2]].join(',') });
    }
    return { samples, band };
  }, [a.toString('base64'), b.toString('base64')]);

  console.log('밴드별(y 100px 단위) 다른 픽셀 수');
  Object.keys(out.band).map(Number).sort((m, n) => m - n).forEach(k => console.log('   y' + String(k).padStart(4) + '  ' + out.band[k]));
  console.log('\n표본(좌표 · 전 → 후)');
  out.samples.forEach(s => console.log('   (' + s.px + ',' + s.py + ')  ' + s.a + '  →  ' + s.b));
  await browser.close();
})();
