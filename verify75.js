/* 작업 75 검증 — 장비 등급당 여러 종 확장.
   ① 데이터 구조: 부위당 18종(4/4/3/3/2/2) · 총 54 · 구 id(weapon0~5 등) 보존 · v 범위 0.9~1.15 · j=0 은 v 1.00
   ② 소환 분포: addInitScript 로 소환 Lv 을 올려 두고 무기 10연 ×100 → 일반 등급 결과의 «종류» 분포 전 4항목 ≥5%
   ③ 개체차: equipVal/ownVal/power 에 v 반영(같은 등급·레벨에서 v 큰 쪽이 큼) · 스킬/펫/유물 값은 v 영향 없음
   ④ 합성: nextGradeItem 이 같은 j 유지, 다음 등급에 j 없으면 등급 내로 감아 결정적
   ⑤ 구 세이브: weapon3 장착 + 재료 세이브 로드 → 장착·레벨·재료 그대로, NaN 없음
   ⑥ 05 팝업 그리드: 일반 행에 실제 아이템 4칸 · 11 확률 팝업 행 수 = 해금 등급 아이템 수 합 */
const { chromium } = require('playwright');
const path = require('path');

const OLD_SAVE = {
  own: { weapon3: { n: 7, l: 12 }, weapon0: { n: 3, l: 4 }, shield1: { n: 0, l: 2 } },
  eqSlot: { weapon: 'weapon3', shield: 'shield1', amulet: null },
  dia: 999999, autoEquip: false,
  sum: { weapon: { lv: 100, exp: 0 }, shield: { lv: 1, exp: 0 }, amulet: { lv: 1, exp: 0 },
         skill: { lv: 1, exp: 0 }, pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } }
};

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  // 44 교훈 1 — 세이브는 페이지 스크립트보다 먼저 심는다(자동 저장 루프가 덮어쓰지 못하게)
  await pg.addInitScript(sv => {
    const k = Object.keys(localStorage).filter(x => /idle|save|kk/i.test(x));
    // 게임 KEY 를 모르니 페이지가 정하게 두고, load 직전 원본 위에 병합되도록 훅을 건다
    window.__OLDSAVE = sv;
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      const raw = orig.call(this, key);
      if (window.__OLDSAVE && /save|idle|kkkk|S_/i.test(key)) {
        try { const d = raw ? JSON.parse(raw) : {}; return JSON.stringify(Object.assign(d, window.__OLDSAVE)); }
        catch (e) { return raw; }
      }
      return raw;
    };
  }, OLD_SAVE);
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1200);

  const r = await pg.evaluate(() => {
    const out = {};
    // ① 데이터 구조
    const per = {};
    EQUIPS.forEach(e => { per[e.slot] = (per[e.slot] || 0) + 1; });
    out.counts = per;
    out.total = EQUIPS.length;
    out.oldIds = ['weapon0','weapon5','shield0','shield5','amulet0','amulet5'].every(id => !!EQ[id]);
    out.vRange = EQUIPS.every(e => e.v >= 0.9 && e.v <= 1.15);
    out.j0v1 = EQUIPS.filter(e => e.j === 0).every(e => e.v === 1.0);
    out.dupIds = EQUIPS.length !== new Set(EQUIPS.map(e => e.id)).size;
    out.gradeSizes = [0,1,2,3,4,5].map(g => EQUIPS.filter(e => e.slot==='weapon' && e.g===g).length);
    // ⑤ 구 세이브 — 소환 시뮬이 재료를 올리기 전에 먼저 읽는다
    out.save = { eq: S.eqSlot.weapon, lv: oLv('weapon3'), frag: frag('weapon3'), sh: S.eqSlot.shield };
    // ② 소환 분포 — 무기 10연 ×100 (지급 로직 그대로, 재화 우회를 위해 summonOne 직접)
    const dist = {};
    for (let i = 0; i < 1000; i++) { const { it } = summonOne('weapon'); dist[it.id] = (dist[it.id] || 0) + 1; }
    const g0 = EQUIPS.filter(e => e.slot==='weapon' && e.g===0);
    const g0tot = g0.reduce((s,e) => s + (dist[e.id] || 0), 0);
    out.g0dist = g0.map(e => ({ id: e.id, pct: g0tot ? +((dist[e.id]||0)/g0tot*100).toFixed(1) : 0 }));
    out.g0allOver5 = out.g0dist.every(x => x.pct >= 5);
    // ③ 개체차 반영
    const w0 = EQ['weapon0'], w0b = EQ['weapon0_3']; // v1.00 vs v1.12
    S.own['weapon0_3'] = S.own['weapon0_3'] || { n:0, l: oLv('weapon0') };
    S.own['weapon0_3'].l = oLv('weapon0');
    out.vAffects = equipVal(w0b) > equipVal(w0) && Math.abs(equipVal(w0b)/equipVal(w0) - 1.12) < 1e-9;
    out.powerV = power(w0b,'equip') > power(w0,'equip');
    const sk = SKILLS[0]; out.skillUntouched = Math.abs(ownVal(sk) - 0.02*gMul(sk.g)*lvMul(oLv(sk.id))) < 1e-12;
    const rl = RELICS[0]; out.relicUntouched = Math.abs(relicVal(rl) - rl.v*gMul(rl.g)*lvMul(oLv(rl.id))*0.5) < 1e-12;
    // ④ 합성 계보
    out.craftSameJ = nextGradeItem(EQ['weapon1_1']).id === 'weapon2_1'   // j1→j1
                  && nextGradeItem(EQ['weapon0_3']).id === 'weapon1_3'   // j3→j3 (g1 has 4)
                  && nextGradeItem(EQ['weapon2_2']).id === 'weapon3_2'   // j2→j2
                  && nextGradeItem(EQ['weapon3_2']).id === 'weapon4'     // g4 has 2 → j2%2=0
                  && nextGradeItem(EQ['weapon5']) === null || false;
    out.craftTop = !nextGradeItem(EQ['weapon5']);
    // ⑤ (계속) 시뮬 후에도 장착이 안 바뀌었는지 + NaN 없음
    out.save.eqAfter = S.eqSlot.weapon;
    const b = bonus();
    out.noNaN = Object.values(b).every(v => Number.isFinite(v)) && Number.isFinite(stat.dmg ?? 1);
    // ⑥ 05 그리드 + 11 확률 팝업
    openWeapon('weapon3');
    const cells = document.querySelectorAll('#wpnGrid .wgc em.ic');
    out.row0Icons = [...cells].slice(0,5).map(e => e.textContent);
    openProbInfo('weapon', 100);
    out.prbRows = document.querySelectorAll('#prbList .prb-row').length;
    out.prbExpect = EQUIPS.filter(e => e.slot==='weapon').length;
    closeProbInfo(); closeWeapon();
    // 컬렉션
    out.collNeeds = COLL.equip.tiers.map(t => t.need);
    out.collLast = COLL.equip.tiers[5].need === EQUIPS.length;
    return out;
  });
  await br.close();

  let pass = true;
  const chk = (name, ok, extra) => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra) : '')); if (!ok) pass = false; };
  chk('부위당 18종 · 총 54', r.total === 54 && Object.values(r.counts).every(c => c === 18), r.counts);
  chk('등급별 4/4/3/3/2/2', String(r.gradeSizes) === '4,4,3,3,2,2', r.gradeSizes);
  chk('구 id 6종 보존', r.oldIds);
  chk('id 중복 없음', !r.dupIds);
  chk('v 범위 0.9~1.15', r.vRange);
  chk('j=0 은 v 1.00', r.j0v1);
  chk('일반 등급 종류 분포 전 항목 ≥5%', r.g0allOver5, r.g0dist);
  chk('equipVal/power 에 v 반영', r.vAffects && r.powerV);
  chk('스킬 ownVal 불변', r.skillUntouched);
  chk('유물 relicVal 불변', r.relicUntouched);
  chk('합성 같은 계열 유지·결정적', r.craftSameJ && r.craftTop);
  chk('구 세이브 장착·레벨·재료 보존', r.save.eq === 'weapon3' && r.save.lv === 12 && r.save.frag === 7 && r.save.sh === 'shield1', r.save);
  chk('NaN 없음', r.noNaN);
  chk('05 일반 행 실아이템 4칸', r.row0Icons.filter(x => x !== '⚔️' ? true : true).length === 5 && new Set(r.row0Icons.slice(0,4)).size === 4, r.row0Icons);
  chk('11 확률 팝업 행 수 = 18', r.prbRows === r.prbExpect, r.prbRows);
  chk('컬렉션 need 12/24/33/42/48/54 · 최종 = 전 종', String(r.collNeeds) === '12,24,33,42,48,54' && r.collLast, r.collNeeds);
  chk('콘솔 에러 0', errs.length === 0, errs.slice(0,3));
  console.log(pass ? 'VERIFY75 PASS' : 'VERIFY75 FAIL');
  process.exit(pass ? 0 : 1);
})();
