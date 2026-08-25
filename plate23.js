/* 23 — 카드 아이콘 «판»(.ci::before) 실제 bbox 측정.
   이모지가 판을 덮어 색 마스크로는 못 잰다 → 런타임에 판만 마젠타로 칠하고 이모지를 숨겨 스캔한다. */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1,
      lv: { atk: 98 }, buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 } }));
  });
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { openTrain(); });
  await p.waitForTimeout(600);
  await p.addStyleTag({ content: `.tr-card>.ci{color:transparent!important;font-size:0!important}
    .tr-card>.ci::before{background:#FF00FF!important;z-index:5!important}` });
  await p.waitForTimeout(300);
  const buf = await p.screenshot();
  const res = await p.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data, W = c.width;
    const hit = (x, y) => { const i = (y * W + x) * 4; return D[i] > 200 && D[i + 1] < 90 && D[i + 2] > 200; };
    let mx = 1e9, MX = -1, my = 1e9, MY = -1;
    for (let y = 1400; y < 1800; y++) for (let x = 35; x < 362; x++)
      if (hit(x, y)) { if (x < mx) mx = x; if (x > MX) MX = x; if (y < my) my = y; if (y > MY) MY = y; }
    /* 좌 꼭짓점 행 = 세로 중심 */
    const lrows = []; for (let y = my; y <= MY; y++) if (hit(mx, y) || hit(mx + 1, y)) lrows.push(y);
    return { x: mx, X: MX, y: my, Y: MY, w: MX - mx + 1, h: MY - my + 1,
      cx: (mx + MX) / 2, cy: (my + MY) / 2, leftVertexRows: [lrows[0], lrows[lrows.length - 1]] };
  }, buf.toString('base64'));
  console.log('CAP(1080x2280) plate:', JSON.stringify(res));
  console.log('→ ref 좌표 환산(+65):', JSON.stringify({ y: res.y + 65, Y: res.Y + 65, cy: res.cy + 65 }));
  await b.close();
})();
