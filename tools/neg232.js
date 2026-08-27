/* 되돌림(negative) 검증 — 232 가 고친 단언이 실제로 무언가를 재는지 확인한다.
   ① 수령을 생략하면 «수령 후» 2건이 빨개져야 한다(옛 게이트는 여기서도 초록이었다).
   ② 옛 키('skill')로 물으면 collReady 는 항상 false · some(collReady) 도 항상 false. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };
(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    Object.assign(S, DEF());
    const st = COLL_SETS.find(s => s.cat === 'skill');
    st.it.forEach(id => { if (!S.own[id]) S.own[id] = { n: 0, l: 1 }; });
    uiDirty = true; renderUI();
    const before = { rdy: collReady(st.key), cat: collCatReady('skill'),
                     oldKey: COLL_SET['skill'] === undefined,
                     oldReady: collReady('skill'),
                     oldSome: ['skill','equip','pet','relic'].some(collReady),
                     newSome: ['skill','equip','pet','relic'].some(collCatReady),
                     old3: (() => { const T = Object.assign({}, S.own);
                       Object.keys(T).forEach(k => delete S.own[k]);
                       SKILLS.slice(0,3).forEach(k => S.own[k.id] = { n:0, l:1 });
                       const r = { g: SKILLS.slice(0,3).map(x => x.g), it: st.it.slice(),
                                   miss: st.it.filter(id => !S.own[id]),
                                   lv: collLv(st), cap: collCap(st), rdy: collReady(st.key) };
                       Object.keys(S.own).forEach(k => delete S.own[k]);
                       Object.assign(S.own, T); return r; })() };
    claimColl(st.key); closeModal(); uiDirty = true; renderUI();
    const after = { rdy: collReady(st.key), someCat: ['skill','equip','pet','relic'].some(collCatReady),
                    oldSome: ['skill','equip','pet','relic'].some(collReady) };
    return { key: st.key, before, after };
  });
  console.log('[N1] 옛 키가 정말 죽어 있었는가');
  ok(r.before.oldKey, "COLL_SET['skill'] === undefined (카테고리 이름은 세트 키가 아니다)");
  ok(r.before.oldReady === false, "collReady('skill') === false — 세트가 다 차 있어도 false");
  ok(r.before.oldSome === false, "some(collReady) === false → 옛 «수령 후» 단언은 수령 전에도 초록(헛초록)");
  console.log('[N2] 옛 설정(SKILLS.slice(0,3))이 세트를 못 채운다 — 원인은 «등급 혼합» 이 아니라 «개수»');
  ok(new Set(r.before.old3.g).size === 1,
     'PROGRESS 232 의 «등급이 섞여» 는 사실이 아니다 — 앞 3종 등급 = ' + JSON.stringify(r.before.old3.g));
  ok(r.before.old3.miss.length > 0,
     '진짜 원인: 세트 ' + JSON.stringify(r.before.old3.it) + ' 중 ' + JSON.stringify(r.before.old3.miss) + ' 미보유');
  ok(r.before.old3.lv === 0 && r.before.old3.cap === 0 && r.before.old3.rdy === false,
     'collLv = min(전원) = 0 → cap 0 → collReady false (91 이 «need 3» 을 폐기했다)');
  console.log('[N3] 새 단언은 수령 전/후로 값이 «뒤집힌다» (= 실제로 잰다)');
  ok(r.before.rdy === true && r.after.rdy === false, 'collReady(' + r.key + ') true → false');
  ok(r.before.newSome === true && r.after.someCat === false, 'some(collCatReady) true → false');
  ok(r.before.oldSome === false && r.after.oldSome === false, '옛 some(collReady) 는 전/후 모두 false (안 잰다)');
  await b.close();
  console.log(`\nNEG232 ${pass}/${pass + fail}` + (fail ? ' — FAIL' : ''));
  process.exit(fail ? 1 : 0);
})();
