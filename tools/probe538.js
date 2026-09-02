#!/usr/bin/env node
/* 작업 538 — 재현: `verify75.js` 가 43행에서 즉사한다(`COLL is not defined`).
 *
 *   node tools/probe538.js
 *
 * 등재문: «게이트가 페이지 안에서 전역 `COLL` 을 읽는데 제품에는 `COLL_*` 접두 상수만 남았다.
 *          ⚑ 어느 상수가 옛 `COLL` 의 자리인지부터 확정할 것(`COLL_SETS` 가 유력) —
 *          자에 표를 다시 손으로 적으면 402 «표 두 벌» 부패를 새로 만든다. 제품 상수를 그대로 읽어 단언하라.
 *          ⚠ 338 규칙 — 처방 전에 재현부터. 제품 쪽이 틀렸을 가능성을 재현으로 먼저 갈라라.»
 *
 * ⚑ 이 자가 가르는 것은 «COLL 한 줄» 이 아니다.
 *   `verify75.js` 는 **evaluate 가 하나뿐**이라 43행 크래시가 17항 전부를 삼켰다(532-③).
 *   즉 이 게이트는 «빨간 적이 없는» 것이 아니라 **한 번도 돈 적이 없다.**
 *   그래서 크래시를 걷어내면 무엇이 더 빨간지, 그리고 그 빨강이 **자 부패인지 제품 결함인지**를
 *   항마다 갈라야 한다. 아래 절은 그 표다.
 *
 *   [1] COLL 의 생사 — 제품에게 직접 묻는다(532-①: grep 이 아니라 제품에게)
 *   [2] 형제 자 대조 — 같은 이름을 **반대로** 단언하는 자가 있는가(532-②)
 *   [3] 17항 실측 — 옛 기대값 ↔ 현행 실측값 ↔ 그 값을 옮긴 지시
 *   [4] 옛 질문의 새 형태 — 도감이 «장비 전 종» 을 지금도 담는가
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  (c ? pass++ : fail++);
  console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra === undefined ? '' : '  [' + extra + ']'));
};

(async () => {
  const br = await launch(chromium);
  const pg = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL);
  await pg.waitForTimeout(1500);

  /* ── [1] COLL 의 생사 ── */
  console.log('[1] 옛 전역 `COLL` 의 생사 — 제품에게 직접 묻는다');
  const one = await pg.evaluate(() => ({
    collGone: typeof COLL === 'undefined',
    hasSets: typeof COLL_SETS !== 'undefined' && Array.isArray(COLL_SETS),
    setsLen: typeof COLL_SETS !== 'undefined' ? COLL_SETS.length : -1,
    hasSetMap: typeof COLL_SET !== 'undefined',
    hasTiers: typeof COLL_SETS !== 'undefined' && COLL_SETS.some(s => 'tiers' in s),
    hasNeed: typeof COLL_SETS !== 'undefined' && COLL_SETS.some(s => 'need' in s),
  }));
  ok(one.collGone, '전역 `COLL` 이 없다 (게이트 43행 즉사의 뿌리)');
  ok(one.hasSets && one.setsLen > 0, '후계 상수 `COLL_SETS` 가 있다', one.setsLen + '세트');
  ok(one.hasSetMap, '`COLL_SET`(키 → 세트) 도 있다');
  ok(!one.hasTiers && !one.hasNeed,
     '⚑ 후계는 «이름만 바뀐 같은 표» 가 아니다 — `tiers`·`need` 필드가 통째로 없다');

  /* ── [2] 형제 자 대조(532-②) ── */
  console.log('[2] 같은 이름을 반대로 단언하는 형제 자가 있는가');
  const v91 = fs.readFileSync(path.join(ROOT, 'tools', 'verify91.js'), 'utf8');
  const opp = /typeof COLL === 'undefined'/.test(v91);
  ok(opp, '`tools/verify91.js` 는 «구 COLL 폐기» 를 단언한다 = verify75 와 정반대');
  const v85 = fs.readFileSync(path.join(ROOT, 'tools', 'verify85.js'), 'utf8');
  const v86 = fs.readFileSync(path.join(ROOT, 'tools', 'verify86.js'), 'utf8');
  ok(/COLL_SETS\.filter/.test(v85) && /COLL_SETS\.filter/.test(v86),
     '⚑ 같은 부패를 이미 두 자가 겪고 고쳤다(`verify85` [I] · `verify86` [5]) — 처방 선례가 저장소 안에 있다');

  /* ── [3] 17항 실측 — 옛 기대 ↔ 현행 ── */
  console.log('[3] verify75 17항 실측 (크래시를 걷었을 때 무엇이 빨간가)');
  const m = await pg.evaluate(() => {
    const o = {};
    const per = {}; EQUIPS.forEach(e => { per[e.slot] = (per[e.slot] || 0) + 1; });
    o.total = EQUIPS.length;
    o.per = per;
    o.slots = SLOTS.length;
    o.grades = GRADE.length;
    o.gradeSizes = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === 'weapon' && e.g === g).length);
    o.legacyAll = GRADE.every((_, g) => SLOTS.every(s => !!EQ[s.k + g]));
    o.legacyV1 = GRADE.every((_, g) => SLOTS.every(s => EQ[s.k + g] && EQ[s.k + g].v === 1.00));
    o.j0v1 = EQUIPS.filter(e => e.j === 0).every(e => e.v === 1.0);
    o.j0ids = EQUIPS.filter(e => e.slot === 'weapon' && e.j === 0).map(e => e.id + '(v' + e.v + ')');
    o.vMin = Math.min.apply(null, EQUIPS.map(e => e.v));
    o.vMax = Math.max.apply(null, EQUIPS.map(e => e.v));
    /* 값 축 — 75 는 equipVal 에 v 가 곱해지길 기대했다 */
    const g0 = EQUIPS.filter(e => e.slot === 'weapon' && e.g === 0);
    const lo = EQ['weapon0'], hi = g0.reduce((a, b) => (b.v > a.v ? b : a));
    S.own[lo.id] = S.own[lo.id] || { n: 0, l: 1 };
    S.own[hi.id] = { n: 0, l: (S.own[lo.id].l || 1) };
    o.hiId = hi.id; o.hiV = hi.v;
    o.ownRatio = +(ownVal(hi) / ownVal(lo)).toFixed(4);
    o.eqRatio = +(equipVal(hi) / equipVal(lo)).toFixed(4);
    o.eqvSkill = eqv(SKILLS[0]); o.eqvRelic = eqv(RELICS[0]);
    /* 합성 — 75 는 «같은 j 유지 · 결정적» 을 기대했다.
       ⚑ 719 이관(2026-09-02) — 85 ⑤ 의 랜덤 `nextGradeItem` 이 **`nextTierItem`(다음 티어, 결정적)**
         으로 갈아 끼워졌다. 이 재현기는 «75 의 기대가 지금도 참인가» 를 찍는 자이므로 호출 이름만
         옮긴다 — 그러면 `craftSeen` 이 1 로 떨어져 **75 의 «결정적» 기대가 도로 참**이 된 것이 찍힌다. */
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(nextTierItem(EQ['weapon0_3']).id);
    o.craftSeen = seen.size;
    o.craftPool = EQUIPS.filter(e => e.slot === 'weapon' && e.g === 1).length;
    const top = EQUIPS.filter(e => e.slot === 'weapon').reduce((a, b) => (b.g > a.g ? b : a));
    o.craftTopNull = nextTierItem(top) === null;
    return o;
  });
  ok(m.total !== 54, '① 총 종 수 — 옛 기대 54 / 실측 ' + m.total + ' (85 «8등급 × 5종»)', JSON.stringify(m.per));
  ok(String(m.gradeSizes) !== '4,4,3,3,2,2',
     '② 등급별 종 수 — 옛 기대 4,4,3,3,2,2 / 실측 ' + m.gradeSizes);
  ok(m.legacyAll, '③ 구 id(`slot+g`)는 8등급 전부 살아 있다 = 75 의 «구 세이브 보존» 은 지금도 참');
  ok(m.legacyV1, '④ 구 id 의 v 는 전부 1.00 = 75 가 «j=0 은 v 1.00» 으로 적었던 그 성질');
  ok(!m.j0v1, '⑤ 그런데 «j=0 은 v 1.00» 은 이제 거짓 — 260 이 등급 배열을 v 오름차순으로 재배치했다',
     m.j0ids.join(' '));
  ok(m.vMin >= 0.9 && m.vMax <= 1.15, '⑥ v 폭 0.9~1.15 는 지금도 참', m.vMin + '~' + m.vMax);
  ok(Math.abs(m.ownRatio - m.hiV) < 1e-9,
     '⑦ 개체차 v 는 **보유 축(ownVal)** 에 그대로 곱해진다 — 비 = v 비', m.ownRatio + ' vs v ' + m.hiV);
  ok(Math.abs(m.eqRatio - m.hiV) > 1e-6,
     '⑧ 그런데 **장착 축(equipVal)** 의 비는 v 비가 아니다 — 472 가 `EQ_BASE(등급,티어)` 표로 갈았다',
     '실측 비 ' + m.eqRatio);
  ok(m.eqRatio > 1, '⑨ 그래도 «v 큰 쪽이 장착값도 크다» 는 산다 — 260 이 j 를 v 오름차순으로 정렬했으므로');
  ok(m.eqvSkill === 1 && m.eqvRelic === 1, '⑩ 스킬·유물에는 `eqv` 가 안 붙는다(75 의 «v 영향 없음») — 지금도 참');
  /* ⚑ 719 이관(2026-09-02, 주인 지시 «다음티어») — 85 ⑤ 의 «다음 등급 5종 랜덤» 이 폐지되고
     산출이 **다음 티어 한 칸**으로 결정됐다. 이 항이 원래 묻던 것은 «75 가 기대한 결정성이
     아직도 깨져 있는가» 이므로, 자리를 비우지 않고 **방향만** 뒤집는다 — 이제 결정적이다. */
  ok(m.craftSeen === 1,
     '⑪ 합성은 **결정적이다** — 200회에 한 칸만 나온다(719: 다음 티어 · 85 ⑤ 랜덤 폐지)',
     m.craftSeen + '종 (다음 등급 풀 ' + m.craftPool + '종은 이제 무관)');
  ok(m.craftTopNull, '⑫ 최상위 등급은 합성 결과가 null = 75 의 항은 지금도 참');

  /* ── [4] 옛 질문의 새 형태 ── */
  console.log('[4] 옛 ⑥ «컬렉션 need 12/24/33/42/48/54 · 최종 = 전 종» 이 묻던 것');
  const c = await pg.evaluate(() => {
    const eq = COLL_SETS.filter(s => s.cat === 'equip');
    const ids = new Set(eq.reduce((a, s) => a.concat(s.it), []));
    return { sets: eq.length, members: ids.size, total: EQUIPS.length,
             all: EQUIPS.every(e => ids.has(e.id)),
             extra: [...ids].filter(id => !EQ[id]).length,
             perSlot: SLOTS.map(s => eq.filter(x => x.tab === s.k).length) };
  });
  ok(c.all && c.members === c.total,
     '옛 «최종 need = 전 종» 이 묻던 것 = «도감이 장비 전 종을 하나도 안 빠뜨리는가» — 새 구조에서 참',
     c.members + '/' + c.total + '종');
  ok(c.extra === 0, '도감 세트에 EQUIPS 밖의 id 가 섞이지 않았다');
  ok(String(c.perSlot) === String(c.perSlot.map(() => c.perSlot[0])),
     '부위마다 세트 수가 같다(부위 × 등급)', c.sets + '세트 = ' + c.perSlot.join('/'));
  ok(errs.length === 0, '콘솔 에러 0', errs.slice(0, 2).join(' | '));

  await br.close();
  console.log('\nPROBE538 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
