/* 263 — 「새로 뽑은 것이 자동으로 장착돼 있다」 재현 프로브.
   LESSONS «등재문의 «원인» 은 가설이다 — 재현 프로브가 다른 이야기를 하면 프로브가 맞다» 에 따라
   수정 **전에** 세 경로(소환 · 무료 소환 · 합성)가 실제로 장착 목록을 건드리는지 먼저 잰다.
   실행: node tools/probe263.js   (수정 후에 다시 돌리면 전부 「불변」 이 되어야 한다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const snap = () => ({ sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot) });
    const diff = (a, b) => ({
      sk: a.sk.join(',') + ' → ' + b.sk.join(','),
      pet: a.pet.join(',') + ' → ' + b.pet.join(','),
      slot: JSON.stringify(a.slot) + ' → ' + JSON.stringify(b.slot),
      changed: a.sk.join(',') !== b.sk.join(',') || a.pet.join(',') !== b.pet.join(',')
               || JSON.stringify(a.slot) !== JSON.stringify(b.slot),
    });
    const out = {};

    /* ① 소환(유료) — 무기 10연. 칸을 비우고 보유도 전부 지워 «처음 얻는 것» 만 나오게 한다 */
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.best = 99; S.stage = 99; S.dia = 1e12; S.gold = 1e12;
    S.guide.idx = 99;                      /* 가이드 미션 배너 차단(gmBlocked)을 풀어 둔다 — 안 풀면 유료 소환이 조기 return */
    BANNERS.weapon.list.forEach((e) => delete S.own[e.id]);
    S.eqSlot.weapon = null;
    let a = snap();
    doSummon('weapon', 10);
    out.summonEquip = diff(a, snap());

    /* ② 소환 — 스킬(빈 칸 존재) */
    S.eqSkill = []; SKILLS.forEach((s) => delete S.own[s.id]);
    a = snap();
    doSummon('skill', 10);
    out.summonSkill = diff(a, snap());

    /* ③ 소환 — 펫 */
    S.eqPet = []; PETS.forEach((p) => delete S.own[p.id]);
    a = snap();
    doSummon('pet', 10);
    out.summonPet = diff(a, snap());

    /* ④ 무료 소환 */
    BANNERS.shield.list.forEach((e) => delete S.own[e.id]);
    S.eqSlot.shield = null;
    a = snap();
    doSummonFree('shield', 10, true);
    out.summonFree = diff(a, snap());

    /* ⑤ 합성 — 빈 부위 + 다음 등급이 «처음 얻는 것» */
    const base = BANNERS.amulet.list.find((e) => !isTopGrade(e));
    EQUIPS.filter((e) => e.slot === base.slot && e.g === base.g + 1).forEach((e) => delete S.own[e.id]);
    S.own[base.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    S.eqSlot.amulet = null;
    a = snap();
    const made = craft(base);
    out.craft = Object.assign(diff(a, snap()), { made: made && made.id });

    out.hasFn = typeof equipFillNew === 'function';
    return out;
  });

  console.log('263 재현 프로브 — 「새로 얻은 것」 이 장착 목록을 건드리는가\n');
  for (const k of ['summonEquip', 'summonSkill', 'summonPet', 'summonFree', 'craft']) {
    const d = r[k];
    console.log('[' + k + '] ' + (d.changed ? '★ 자동 장착됨(재현)' : '불변'));
    console.log('    skill : ' + d.sk);
    console.log('    pet   : ' + d.pet);
    console.log('    slot  : ' + d.slot);
    if (d.made) console.log('    합성물: ' + d.made);
  }
  console.log('\nequipFillNew 존재: ' + r.hasFn);
  await browser.close();
})();
