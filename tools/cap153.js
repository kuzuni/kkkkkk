/* 153 — 상점 구매 우편이 실제로 어떻게 보이는지 1080×2280 한 장.
 *   node tools/cap153.js [회차]
 * 구매 3종(다이아 패키지 · 마일리지 교환 · 유물조각 교환)을 헤드리스로 굴려 우편함을 채운 뒤 캡처한다.
 * 레이아웃 비평용이 아니라 «새 보상 키(마일리지 쿠폰)가 프레임 안에 제대로 앉는가» 확인용이다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const r = process.argv[2] || 'r1';

(async () => {
  const browser = await launch(chromium);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ gold: 5e7, dia: 5e6, relic: 0, mileage: 10 })]);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      devBuyDia('d5');                                   /* 다이아 1,000,000 + 쿠폰 2 */
      mileageExchange();                                 /* 다이아 2,500,000 */
      const ex = EXCHANGE[0];
      S.dia += ex.dia;
      sendMail({ t:'📦 유물조각 교환', r:ex.rel, b:'상점에서 교환하신 유물조각입니다.' });
      openMail();
    });
    await page.waitForTimeout(700);
    const out = path.resolve(__dirname, '..', 'docs', 'review', '153-' + r + '-mail.png');
    await page.screenshot({ path: out });
    console.log('saved ' + out);
    await ctx.close();
  } finally { await browser.close(); }
})();
