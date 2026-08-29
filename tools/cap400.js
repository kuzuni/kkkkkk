#!/usr/bin/env node
/* 작업 400 캡처 — 55 설정 팝업을 9:19(2280)·9:13.3(1600) **짝으로** 찍는다(351 규약).
   쓰기: node tools/cap400.js <태그>   → docs/review/400-<태그>-{2280,1600}.png */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const TAG = process.argv[2] || 'r1';
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await launch(chromium);
  for (const H of [2280, 1600]) {
    const pg = await b.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    await pg.goto(FILE); await pg.waitForTimeout(1500);
    await pg.evaluate(() => document.querySelector('#menub').click()); await pg.waitForTimeout(340);
    await pg.evaluate(() => { const e = document.querySelector('#mnw [data-mn="conf"]'); if (e) e.click(); });
    await pg.waitForTimeout(900);
    const out = path.resolve(__dirname, '..', 'docs', 'review', `400-${TAG}-${H}.png`);
    await pg.screenshot({ path: out });
    console.log('  saved ' + out);
    await pg.close();
  }
  await b.close();
})();
