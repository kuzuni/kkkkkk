const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
    gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1, lv: { atk: 98 },
    buyQty: 1, autoBuy: false, tuto: 3, seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 } })));
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => openTrain());
  await p.waitForTimeout(500);
  console.log(await p.evaluate(() => {
    const ci = document.querySelector('.tr-card .ci');
    const r = ci.getBoundingClientRect();
    const cs = getComputedStyle(ci), pb = getComputedStyle(ci, '::before');
    return JSON.stringify({ ciRect: { y: r.y, h: r.height, x: r.x, w: r.width },
      ciHeightProp: cs.height, lineHeight: cs.lineHeight, beforeTop: pb.top,
      beforeMarginTop: pb.marginTop, beforeH: pb.height, outerHTML: ci.outerHTML.slice(0, 90) });
  }));
  await b.close();
})();
