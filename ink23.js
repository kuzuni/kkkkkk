/* 23 — 카드 아이콘 «이모지 잉크» 실bbox. 판(.ci::before)을 숨기고 카드 흰 본문과 다른 픽셀만 센다.
   «아트 자리 규칙»(대체물이 ref 아트 bbox 를 그대로 차지해야 한다) 검증용. */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
    gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1,
    lv: { atk: 98 }, buyQty: 1, autoBuy: false, tuto: 3,
    seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 } })));
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(600);
  await p.addStyleTag({ content: '.tr-card>.ci::before{display:none!important}' + /* 16회차: 아래 형제(+값·라벨)를 숨겨 스캔 창을 넓혀도 오염되지 않게 한다 */ '.tr-card>.cv,.tr-card>.cn{visibility:hidden!important}' });
  await p.waitForTimeout(200);
  const buf = await p.screenshot();
  const r = await p.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data, W = c.width;
    /* 카드 흰 본문(255,253,242)과 «다른» 픽셀 = 이모지 잉크 */
    /* 16회차: 초록 «+값» 잉크(ref y1729~)가 창 안에 들어오면 bbox 를 오염시키므로 초록은 뺀다 */
    const ink = (x, y) => { const i = (y * W + x) * 4;
      if (D[i + 1] > D[i] + 30 && D[i + 1] > D[i + 2] + 30) return false;
      return !(D[i] > 246 && D[i + 1] > 244 && D[i + 2] > 230); };
    const out = [];
    for (const [x0, x1] of [[46, 350], [388, 692], [729, 1033]]) {
      let mx = 1e9, MX = -1, my = 1e9, MY = -1;
      for (let y = 1472; y < 1700; y++)  /* 16회차: 창 확대(ref 1530..1730) — 옛 1655 는 아트 아래끝을 잘랐다 */ for (let x = x0; x <= x1; x++)
        if (ink(x, y)) { if (x < mx) mx = x; if (x > MX) MX = x; if (y < my) my = y; if (y > MY) MY = y; }
      out.push({ x: mx, X: MX, w: MX - mx + 1, y: my + 65, Y: MY + 65, h: MY - my + 1,
        cx: (mx + MX) / 2, cy: (my + MY) / 2 + 65 });
    }
    return out;
  }, buf.toString('base64'));
  r.forEach((o, i) => console.log('카드' + (i + 1) + ' 이모지 잉크 (y 는 ref 환산):', JSON.stringify(o)));
  await b.close();
})();
