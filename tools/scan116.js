#!/usr/bin/env node
/* 116 보조 — 13 재화 탭 다이아 카드의 수량 라벨(`.cn-cd.dia>.qt`) 실측.
 *   node tools/scan116.js
 * 카드 안쪽(=`.bg` 264px) 기준으로 라벨의 좌우 끝을 재서 «넘침 0» 과 `qx` 재보정 근거를 뽑는다.
 * (라벨은 `right:14px` 우측 앵커 + `transform-origin:100% 50%` 이라 넘치면 **왼쪽**으로 샌다.) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => {
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const out = [];
    document.querySelectorAll('#shopList .cn-cd.dia').forEach(cd => {
      const q = cd.querySelector('.qt'), bg = cd.querySelector('.bg');
      const cr = cd.getBoundingClientRect(), qr = q.getBoundingClientRect(), br = bg.getBoundingClientRect();
      const sc = getComputedStyle(cd).getPropertyValue('--qx').trim();
      /* 스케일 되돌린 «자연 폭» = 현재 폭 / qx */
      const nat = qr.width / (parseFloat(sc) || 1);
      out.push({ txt:q.textContent, qx:+sc, w:+qr.width.toFixed(1), nat:+nat.toFixed(1),
        left:+(qr.left - br.left).toFixed(1), right:+(br.right - qr.right).toFixed(1),
        inner:+br.width.toFixed(1), card:+cr.width.toFixed(1) });
    });
    return out;
  });
  console.table(rows);
  await browser.close();
})();
