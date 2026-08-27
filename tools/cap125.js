#!/usr/bin/env node
/* 125 캡처 — 화폐 아이콘이 실제로 어떻게 보이는지 1080×2280 으로 찍는다.
 *
 *   node tools/cap125.js            → docs/review/125-r1-*.png
 *
 * 기하는 게이트(`verify125.js`)가 숫자로 보고, 이 캡처는 «자리표시 아트가 화면에서 읽히는가» 를 남긴다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'review');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    S.gold = 4.2e12; S.dia = 3.5e6; S.relic = 88000; S.mileage = 12;
    DUNGEONS.forEach(d => { S.dunTk[d.id] = DUN_TRY; });
    if (typeof fxDisp === 'object') { fxDisp.gold = S.gold; fxDisp.dia = S.dia; }
    drawHud();
  });

  const shots = [
    ['main', () => {}],
    ['dun', () => openDungeon()],
    ['dundetail', () => openDunDetail(DUNGEONS[0])],
    ['shop-coin', () => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); }],
    ['bag', () => openBag()],
    ['curinfo', () => openCurInfo('gold')],
  ];
  for (const [name, fn] of shots) {
    await page.evaluate(f => {
      ['closeShopPage', 'closeDungeon', 'closeDunDetail', 'closeBag', 'closeCurInfo', 'closeModal']
        .forEach(k => { try { window[k] && window[k](); } catch (e) {} });
      eval('(' + f + ')()');
    }, fn.toString());
    await page.waitForTimeout(450);
    const p = path.join(OUT, '125-r1-' + name + '.png');
    await page.screenshot({ path: p });
    console.log('saved ' + path.relative(ROOT, p));
  }
  await browser.close();
})();
