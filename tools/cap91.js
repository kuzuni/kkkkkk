/* 작업 91 — 21 도감 팝업 캡처 하네스.  실행: node tools/cap91.js [탭] [출력이름]
   예) node tools/cap91.js weapon 91-r1     → docs/review/91-r1.png
   실제 게임 데이터를 넣는다(세트별로 레벨을 달리 줘 «가능/불가/MAX» 상태가 한 화면에 다 보이게).
   1080×2280 · 애니메이션이 끝난 뒤 찍는다(LESSONS 21(2)-1). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}
const TAB = process.argv[2] || 'weapon';
const OUT = process.argv[3] || ('91-' + TAB);

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);

  await p.evaluate(tab => {
    S.own = {}; S.coll = {};
    /* 등급이 오를수록 낮은 레벨 — 한 화면에 MAX · 강화 가능 · 레벨 미달 · 미보유가 모두 잡힌다 */
    const LV = [12, 6, 3, 1, 1, 0, 0, 0];
    COLL_SETS.forEach(s => {
      const g = +s.key.split(':').pop();
      const lv = LV[Math.min(g, 7)];
      if (!lv) return;
      s.it.forEach((id, i) => { if (!(g >= 3 && i === s.it.length - 1)) S.own[id] = { n: 0, l: lv }; });
    });
    /* 118 — 유물이 3세트(3·4·3)로 갈렸다. 세 세트 모두 캡처에 담기게 전 종을 채운다 */
    [0, 1, 2].forEach(si => COLL_SET['relic:' + si].it.forEach((id, i) => S.own[id] = { n: 0, l: 4 - (i % 3) }));
    /* 받은 단계를 세트마다 다르게 — «단계 n/m» 표기와 버튼 활성/비활성이 섞이게 */
    S.coll['equip:weapon:0'] = 10; S.coll['equip:weapon:1'] = 2;
    S.coll['equip:shield:0'] = 10; S.coll['equip:shield:1'] = 4;
    S.coll['equip:amulet:0'] = 7;  S.coll['skill:0'] = 3; S.coll['pet:0'] = 2;
    markDirty(); renderUI();
    openColl21(tab);
  }, TAB);

  await p.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => {}))));
  await p.waitForTimeout(220);

  const out = path.resolve(__dirname, '../docs/review/' + OUT + '.png');
  await p.screenshot({ path: out });
  console.log('saved ' + out);
  await b.close();
})();
