/* rad52.js — 반투명 요소의 «좌변 x» 를 행마다 재서 코너 반경 r 을 피팅한다.
   요소가 반투명이라 절대색으로는 못 찾는다 → 요소 밖 표본(xOut)과의 색차가 임계값을 넘는
   첫 x 를 좌변으로 본다. LESSONS 22-② 대로 단일 코너 원호가 아니라 «여러 행» 으로 r 을 피팅한다.
   사용: node tools/rad52.js <img> <xOut> <xSearch0> <xSearch1> <yTop> <rows> */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const [IMG, XOUT, XS0, XS1, YTOP, ROWS] = [
  process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +(process.argv[7] || 40)];

(async () => {
  const b64 = fs.readFileSync(path.resolve(IMG)).toString('base64');
  const browser = await launch(chromium);
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const rows = await page.evaluate(async ([b64, XOUT, XS0, XS1, YTOP, ROWS]) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.getElementById('c');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = c.width, D = ctx.getImageData(0, 0, c.width, c.height).data;
    const P = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    const out = [];
    for (let k = 0; k < ROWS; k++) {
      const y = YTOP + k;
      const ref = P(XOUT, y);
      let e = null;
      for (let x = XS0; x <= XS1; x++) if (d(P(x, y), ref) > 28) { e = x; break; }
      out.push([y, e]);
    }
    return out;
  }, [b64, XOUT, XS0, XS1, YTOP, ROWS]);
  await browser.close();
  console.log(`RAD52 ${IMG}  xOut${XOUT} 탐색 x${XS0}..${XS1}  y${YTOP}..${YTOP + ROWS - 1}`);
  for (const [y, e] of rows) console.log(`  y${y}\t좌변 ${e === null ? '없음' : e}`);
  /* r 피팅 — 직선부의 x(=L) 를 마지막 행들의 최빈값으로 잡고, top 은 첫 검출행으로 본다 */
  const found = rows.filter(r => r[1] !== null);
  if (found.length >= 6) {
    const L = found.slice(-5).reduce((a, b) => a + b[1], 0) / 5;
    const T = found[0][0];
    let best = null;
    for (let r = 2; r <= 60; r += .5) {
      let e = 0, n = 0;
      for (const [y, x] of found) {
        const dy = y - T;
        if (dy > r) continue;
        const pred = L + r - Math.sqrt(Math.max(0, r * r - (r - dy) * (r - dy)));
        e += (x - pred) ** 2; n++;
      }
      if (n >= 4) { const m = e / n; if (!best || m < best.m) best = { r, m, n }; }
    }
    console.log(`  → 직선부 L≈${L.toFixed(1)}  상단 T=${T}  최적 r≈${best.r} (MSE ${best.m.toFixed(2)}, n${best.n})`);
  }
})();
