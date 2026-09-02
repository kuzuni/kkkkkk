#!/usr/bin/env node
/* 캡처 하네스 — 작업 715 「교환 수량 슬라이더」 비평용 (지시서 [3]-(나) 1번)
 *
 *   node tools/cap715.js [출력디렉터리]
 *
 * 세 자리(§9 재화 · §10 입장권 · §8 마일리지) × 두 프레임(1080×2280 · 1080×1600) ×
 * 두 상태(막 열었을 때 n=1 · 슬라이더를 중간까지 끈 상태)를 찍는다.
 * ⚠ 캡처 PNG 는 **커밋하지 않는다**(ROUTINE 서두 — `git add -f` 금지). 채점 결과의 수치만 남긴다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const OUT = process.argv[2] || path.join(ROOT, 'shots');

const SITES = [
  { id: 'cur',  sel: '#shopList .bt.buy[data-ex="relic"]', n: 137 },
  { id: 'dun',  sel: '#shopList .bt.buy[data-dunex]',      n: 4 },
  { id: 'mile', sel: '#cnExch',                            n: 3 }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify({ gold: 5e7, dia: 5e6, mileage: 47, best: 40 })]);
    const page = await ctx.newPage();
    await page.goto('file://' + SRC);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof exOpen === 'function');
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    await page.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    for (const s of SITES) {
      for (const st of ['open', 'mid']) {
        await page.evaluate(([sel, n, st]) => {
          closeModal();
          S.dia = 5e6; S.mileage = 47; renderShopPage();
          document.querySelector(sel).click();
          if (st === 'mid') exSet(n);
        }, [s.sel, s.n, st]);
        await page.waitForTimeout(260);
        await page.screenshot({ path: path.join(OUT, '715-' + s.id + '-' + st + '-' + H + '.png') });
      }
    }
    /* 카드 쪽(수량 탭이 사라진 §9 격자)도 한 장 — 안내 한 줄이 그 자리를 받는지 눈으로 본다 */
    await page.evaluate(() => { closeModal(); document.getElementById('shopList').scrollTop = 2900; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, '715-grid-' + H + '.png') });
    await ctx.close();
  }
  await browser.close();
  console.log('CAP715 → ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
