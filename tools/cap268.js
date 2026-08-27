/* 작업 268 캡처 — 08 세부 팝업 4계열(스킬·펫·장비·유물)을 같은 조건에서 한 장씩 찍는다.
   실행: node tools/cap268.js  → docs/shots/268-{skill,pet,equip,relic}.png */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = path.resolve(__dirname, '../docs/shots');
(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof EQUIPS !== 'undefined' && EQUIPS.length > 0);
  await p.waitForTimeout(1400);
  const ids = await p.evaluate(() => {
    const sk = SKILLS[0], pet = PETS.find(x => x.sp === 'dragon') || PETS[0];
    const eqp = EQUIPS.find(x => x.slot === 'weapon' && !isTopGrade(x)), rl = RELICS[0];
    [sk, pet, eqp].forEach(x => { S.own[x.id] = { n: 40, l: 3 }; });
    S.own[rl.id] = { n: 0, l: 4 };
    save(); uiDirty = true;
    return { skill: sk.id, pet: pet.id, equip: eqp.id, relic: rl.id };
  });
  for (const [k, id] of Object.entries(ids)) {
    await p.evaluate(i => { closeModal(); showItem(i); }, id);
    await p.waitForFunction(() => {
      const app = document.getElementById('app'); if (!app) return true;
      return !app.getAnimations({ subtree: true }).some(a => /^jz/.test(a.animationName || '')
        && a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity);
    }, null, { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(160);
    await p.screenshot({ path: path.join(OUT, '268-' + k + '.png') });
    console.log('  ✓ docs/shots/268-' + k + '.png');
  }
  await b.close();
})();
