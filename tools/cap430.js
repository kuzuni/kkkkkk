#!/usr/bin/env node
/* 430 캡처 — 입장권 8색이 «실제 화면 세 자리» 에서 어떻게 보이는지 찍는다
 *
 *   node tools/cap430.js
 *
 * 등재문이 요구한 캡처 근거: 03 던전 카드 8장 · 04 세부 팝업 · 13 재화 교환 카드.
 * 지시서 [3]-(가) — 자산/기계적 작업이라 비평 루프는 안 돌리고, 눈으로 한 번 보는 용도다.
 * 1080×2280(9:19) 기준 해상도. 결과는 docs/shots/cap430-*.png.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs/shots');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 8장이 전부 보이도록 **해금만** 연다(cap72 선례 — 상태 조작은 해금 축 하나) */
  await page.evaluate(() => {
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach((u) => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
    DUNGEONS.forEach((d) => { S.dunTk[d.id] = 5; });
    openDungeon();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'cap430-03-dun.png') });

  await page.evaluate(() => { openDunDetail(DUNGEONS.find((d) => d.id === 'relic4')); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'cap430-04-detail-relic4.png') });
  await page.evaluate(() => { closeDunDetail(); openDunDetail(DUNGEONS.find((d) => d.id === 'relic1')); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'cap430-04-detail-relic1.png') });
  await page.evaluate(() => closeDunDetail());

  /* ⚠ 13 재화 탭은 입장권 교환 카드가 **접힌 아래쪽**에 있다 — 스크롤을 안 하면 캡처에 한 장도 안 담긴다
     (1회차 캡처가 그래서 «입장권이 없다» 로 읽혔다). 첫 교환 카드를 화면 가운데로 올리고 찍는다. */
  await page.evaluate(() => {
    openShopTab('coin');
    const c = document.querySelector('#shopList .cn-cd.dtk');
    if (c) c.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'cap430-13-exchange.png') });

  /* 03 카드 8장은 한 화면에 안 들어온다 — 아래쪽 4장을 따로 한 장 더 찍는다 */
  await page.evaluate(() => {
    openDungeon();
    const c = document.querySelector('#dunList [data-dcard="relic4"]');
    if (c) c.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'cap430-03-dun-below.png') });

  /* 8장 나란히 — «세트로 읽히는가» 는 따로 보면 안 보인다(411 교훈) */
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'tk430';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#14110E;display:flex;'
      + 'flex-wrap:wrap;align-content:center;justify-content:center;gap:28px;padding:60px';
    const NM = { gold: '황금 · 노랑', dia: '수정 · 초록', relic1: '고대 · 갈색', relic2: '잊힌 · 회색',
                 relic3: '용 · 빨강', relic4: '창세 · 흰색', stone: '각성 · 주황', rstone: '룬 · 파랑' };
    for (const k of ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone']) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:44%;display:flex;align-items:center;gap:24px;background:rgba(0,0,0,.75);'
        + 'border-radius:24px;padding:18px 24px';
      cell.innerHTML = '<img src="assets/ui/cur-ticket-' + k + '.svg" style="width:190px;height:190px">'
        + '<span style="color:#EADCC6;font-size:40px">' + NM[k] + '</span>';
      box.appendChild(cell);
    }
    document.body.appendChild(box);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'cap430-8장나란히.png') });
  await page.evaluate(() => { const b = document.getElementById('tk430'); if (b) b.remove(); });

  await browser.close();
  console.log('CAP430 — docs/shots/cap430-*.png 5장');
})();
