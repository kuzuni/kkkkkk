/* 작업 174 캡처 — 펫 시트(슬롯 3칸 + 카드 격자)와 12 소환 결과·21 도감 펫 탭.
   실행: node tools/cap174.js  → docs/review/174-r1.png · 174-r2.png · 174-r3.png
   레이아웃 채점용이 아니다(레퍼런스 없음). «그림이 전투 스프라이트로 보이는가 · 잘림·겹침이 없는가»
   를 사람 눈으로 한 번 확인하기 위한 기록이다. 수치는 tools/verify174.js 가 본다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = p => path.resolve(__dirname, '../docs/review/' + p);

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1800);

  /* 등급이 골고루 보이게 절반을 보유시키고 3종(bird/robo/dragon)을 장착한다 */
  await p.evaluate(() => {
    PETS.forEach((x, i) => { if (i % 2 === 0) S.own[x.id] = { n: 5000, l: 1 + (i % 7) }; });
    S.eqPet = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp && S.own[x.id])
      || PETS.find(x => x.sp === sp)).map(x => { S.own[x.id] = S.own[x.id] || { n: 5000, l: 3 }; return x.id; });
    save(); uiDirty = true;
    goTab('hero'); heroSubGo('pet');
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT('174-r1.png') });

  await p.evaluate(() => {
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    showSummonResult('pet', 3, pick.concat(pick.slice(0, 2)).map(it => ({ it })), null);
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT('174-r2.png') });

  await p.evaluate(() => { closeSummonResult && closeSummonResult(); openColl21('pet'); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT('174-r3.png') });

  console.log('CAP174 DONE — docs/review/174-r1.png · r2 · r3');
  await browser.close();
})();
