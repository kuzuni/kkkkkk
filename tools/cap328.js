/* 작업 328·329·330 — 레드닷 3자리 캡처(육안 확인용).
 *   node tools/cap328.js
 * docs/review/328-btn.png (10 소환 카드 1장) · 329-btn.png (13 재화 광고 6칸) · 330-btn.png (89 수반)
 * 각 자리의 «켜짐/꺼짐» 을 한 장에 담으려고 위쪽은 점등 상태, 아래쪽은 소진 상태로 만든다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 328 — 첫 상자는 무료 2/2(점등) · 둘째 상자는 0/2(소등) */
  await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x, i) => (o[x.b] = i === 0 ? 2 : 0, o), {});
    openShopPage(null, 'summon'); renderShopPage(); syncShopSumBtns();
  });
  await page.waitForTimeout(700);
  await page.locator('#shopList').screenshot({ path: path.join(OUT, '328-btn.png'),
    clip: await page.evaluate(() => { const r = document.querySelector('#shopList').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: 1000 }; }) }).catch(async () => {
    await page.screenshot({ path: path.join(OUT, '328-btn.png'), clip: { x: 0, y: 120, width: 1080, height: 1000 } });
  });

  /* 329 — 6칸 중 2칸은 소진(구매 완료), 나머지는 점등 */
  await page.evaluate(() => {
    S.daily.adBuy = { a1: 0, a4: 0 };
    openShopPage(null, 'coin');
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '329-btn.png'), clip: { x: 60, y: 700, width: 1000, height: 800 } });

  /* 330 — 조각 1e6(점등) 한 장, 조각 99(소등) 한 장 */
  await page.evaluate(() => { closeShopPage(); S.relic = 1e6; openRelw(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '330-btn.png'), clip: { x: 260, y: 1560, width: 560, height: 400 } });
  await page.evaluate(() => { S.relic = 99; renderRelw(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '330-off.png'), clip: { x: 260, y: 1560, width: 560, height: 400 } });

  console.log('CAP328 →', fs.readdirSync(OUT).filter(f => /^3(28|29|30)-/.test(f)).join(' '));
  await browser.close();
})();
