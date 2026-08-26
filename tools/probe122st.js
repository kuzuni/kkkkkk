const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(800);
  await p.evaluate(() => { S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2; save(); openShopPage(); });
  await p.waitForTimeout(600);
  console.log(JSON.stringify(await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    return {
      cards: cards.length,
      gm: cards.filter(c => c.classList.contains('gm')).length,
      gmIdx: cards.findIndex(c => c.classList.contains('gm')),
      b1: [...document.querySelectorAll('#shopList .cbtn.b1')].map(e =>
        ({ lack: e.classList.contains('lack'), txt: (e.textContent || '').trim().slice(0, 14) })),
      gmBan: (typeof gmBan === 'function' ? gmBan() : 'n/a'),
      freeKeys: Object.keys(S).filter(k => /free|Free|daily|Daily/.test(k)).slice(0, 12)
    };
  }), null, 1));
  await b.close();
})();
