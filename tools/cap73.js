/* 작업 73 기록용 캡처 — 1080×2280.
   실행: node tools/cap73.js  → docs/review/73-*.png 3장
     73-r1-banner.png : 미완 가이드 배너(«[미션-1] · 스킬 1회 소환하기 · (0/1)»)가 살아 있는 메인
     73-r1-shop.png   : 10 상점 소환 탭 — 가격이 1,000 / 3,000 로 통일된 카드 3장
     73-r1-block.png  : 스킬 소환 미션 중 방어구 상자를 눌렀을 때의 «📌 가이드 진행» 안내 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const out = f => path.resolve(__dirname, '../docs/review/' + f);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const reset = i => p.evaluate((i) => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[i]);
    uiDirty = true; renderUI(); drawTuto();
  }, i);

  await reset(0);
  await p.waitForTimeout(400);
  await p.screenshot({ path: out('73-r1-banner.png') });

  await p.evaluate(() => openShopPage('shield'));
  await p.waitForTimeout(500);
  await p.screenshot({ path: out('73-r1-shop.png') });

  await p.evaluate(() => { document.querySelector('#shopList .shp-card:nth-child(2) .cbtn.b2').click(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out('73-r1-block.png') });

  await b.close();
  console.log('CAP73 ok — 73-r1-banner / 73-r1-shop / 73-r1-block');
})();
