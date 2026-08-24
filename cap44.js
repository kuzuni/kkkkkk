/* 44 캡처 — 다이아 상품 5칸 · 마일리지 패널 (기록용). 실행: node cap44.js */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.click('.tab[data-t="shop"]', { force: true });
  await page.waitForTimeout(300);
  await page.$eval('#shopCats .shp-ct[data-cat="coin"]', el => el.click());
  await page.waitForTimeout(400);
  /* 캔버스 데미지 숫자가 스캔·대조를 오염시키지 않게 내린다 (LESSONS 28-③) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  /* 쿠폰 3개 상태를 만들어 진행바가 보이게 한다 */
  await page.evaluate(() => { window.devBuyDia('d4'); window.devBuyDia('d5'); });
  await page.waitForTimeout(500);
  const shot = async (top, name) => {
    await page.evaluate(t => { document.getElementById('shopList').scrollTop = t; }, top);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.resolve(__dirname, 'docs/review/' + name) });
    console.log('saved', name);
  };
  await shot(1560, '44-r1-다이아상품.png');   /* 다이아 리본 + 카드 5칸 */
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.devBuyDia('d5'); });
  await page.waitForTimeout(400);
  await shot(99999, '44-r1-마일리지.png');    /* 마일리지 리본 + 교환 패널(활성) */
  await browser.close();
})();
