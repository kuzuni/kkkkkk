/* edge52.js — 세로 경계선 검출기.
   «패널 좌/우 변» 처럼 배경이 계속 바뀌는 위에 얹힌 반투명 요소는 색으로는 못 찾는다.
   대신 **경계를 사이에 둔 두 점의 색차** 를 행마다 재면, 요소가 있는 행에서만 차가 커진다.
   사용: node tools/edge52.js <img> <xL> <xR> <y0> <y1>
     xL/xR = 경계 좌우 표본 x. 출력: y, Δ(맨해튼), 두 색 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const IMG = process.argv[2];
const XL = +process.argv[3], XR = +process.argv[4];
const Y0 = +process.argv[5], Y1 = +process.argv[6];

(async () => {
  const b64 = fs.readFileSync(path.resolve(IMG)).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const out = await page.evaluate(async ([b64, XL, XR, Y0, Y1]) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.getElementById('c');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = c.width, D = ctx.getImageData(0, 0, c.width, c.height).data;
    const P = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const r = [];
    for (let y = Y0; y <= Y1; y++) {
      const a = P(XL, y), b = P(XR, y);
      r.push([y, Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]), a, b]);
    }
    return r;
  }, [b64, XL, XR, Y0, Y1]);
  await browser.close();
  /* 연속 구간으로 압축: Δ>=THRESH 인 행이 이어지면 한 덩어리 */
  const TH = 40;
  let s = null;
  for (const [y, d] of out) {
    if (d >= TH) { if (s === null) s = y; }
    else if (s !== null) { if (y - s >= 4) console.log(`edge ${s}..${y - 1}  (h${y - s})`); s = null; }
  }
  if (s !== null) console.log(`edge ${s}..${Y1}  (h${Y1 - s + 1})`);
  const mean = out.reduce((a, b) => a + b[1], 0) / out.length;
  console.log(`# rows ${Y0}..${Y1}  meanΔ ${mean.toFixed(1)}  th ${TH}`);
})();
