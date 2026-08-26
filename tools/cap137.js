/* 작업 137 — 19 프로필 팝업을 1080×2280 으로 캡처한다(자물쇠 자리 확인용).
 *   node tools/cap137.js [출력경로]      기본 docs/review/137-r1.png
 * 잠금 칸이 최대(1칸만 보유)인 상태로 연다 — 버그가 드러나는 최악 상태.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = process.argv[2] || path.resolve(__dirname, '..', 'docs', 'review', '137-r1.png');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(700);
  await page.evaluate(() => { try { S.rank = 0; } catch (e) {} openProfile(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT });
  console.log('saved ' + OUT);
  await browser.close();
})();
