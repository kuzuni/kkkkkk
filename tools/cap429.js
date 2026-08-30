/* 429 캡처 — 89 유물 [?] 도움말 3장 (docs/review/429-*.png · .gitignore 대상이라 커밋 안 한다)
 *   node tools/cap429.js
 *   ① 89 유물 페이지 좌상단 [?] · ② [?] 팝업 · ③ 유물 세부 팝업(공통 2줄 뺀 뒤)
 *   ④ 대조 — 50 코스튬 시트 [?](269, 같은 부품)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = path.resolve(__dirname, '../docs/review');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);

  await page.evaluate(() => { S.relic = 1e6; for (let i = 0; i < 60; i++) summonRelic(true); openRelw(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '429-1-유물페이지.png') });

  await page.click('#relw .rl-help', { force: true });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, '429-2-도움말팝업.png') });

  await page.evaluate(() => { closeModal(); showItem(RELICS.find((r) => has(r.id)).id); });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, '429-3-유물세부.png') });

  await page.evaluate(() => {
    closeModal(); closeRelw();
    document.querySelector('.tab[data-t="hero"]').click();
    document.querySelector('[data-eqtab="cos"]').click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '429-4-대조-코스튬269.png') });

  await browser.close();
  console.log('cap429 — docs/review/429-*.png 4장');
})().catch((e) => { console.error(e); process.exit(1); });
