/* 작업 265 — 룰렛 팝업 캡처(1080x2280). 정지 상태 1장 + 당첨 결과 1장.
 *   node tools/cap265.js [접미사]   → docs/review/265-{before|after}.png
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const tag = process.argv[2] || 'after';
const out = n => path.resolve(__dirname, '..', 'docs', 'review', '265-' + tag + n + '.png');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.evaluate(() => openRoulette());
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('') });
  /* 결과 줄이 가장 긴 칸(«1,000») 으로 당첨시켜 둔다 — 결과 p 가 한 줄에 들어가는지 본다 */
  await page.evaluate(() => roulFinish(ROULETTE.length - 1));
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('-hit') });
  console.log('saved', out(''), out('-hit'));
  await browser.close();
})();
