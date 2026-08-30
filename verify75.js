/* 작업 75 검증 — 장비 등급당 여러 종 확장.
   ① 데이터 구조: 등급마다 여러 종 · 부위 대칭 · 구 id 보존 · v 폭 0.9~1.15 · 구 id 는 v 1.00
   ② 소환 분포: 무기 1000연 → 일반 등급 안에서 **전 종이 나오고** 분포가 제품의 `tierWeights` 를 따른다
   ③ 개체차: v 가 보유 축(ownVal)에 그대로 곱해지고, 장착 축(equipVal)에서도 «v 큰 쪽이 크다» · 스킬/유물은 불변
   ④ 합성: 다음 등급 풀 **안에서** 나오고 최상위는 null · canCraft ↔ 지급 일치
   ⑤ 구 세이브: weapon3 장착 + 재료 세이브 로드 → 장착·레벨·재료 그대로, NaN 없음
   ⑥ 05 팝업 그리드: 일반 행에 그 등급 종 수만큼 서로 다른 칸 · 11 확률 팝업 행 수 = 그 부위 전 종
   ⑦ 도감: 장비 세트가 전 종을 하나도 안 빠뜨린다
   §R 되돌림 시험: 위 단언이 «빨개질 길이 있는가» — 제품 사본을 셋으로 망가뜨려 확인

   ── 2026-08-30, 작업 538 (게이트 부패 수리 · 제품 0줄) ────────────────────────────────
   이 자는 43행 `pg.evaluate` 첫 줄에서 `ReferenceError: COLL is not defined` 로 **즉사**하고 있었다.
   529 가 런처를 고쳐 게이트가 처음 돌면서 보인 것이고, 538 이 `tools/probe538.js` 로 재현했다.

   ⚑ **뿌리는 «COLL 한 줄» 이 아니다.** 이 파일은 evaluate 가 **하나뿐**이라 그 한 줄이 17항을
      통째로 삼켰다(532-③) — 이 게이트는 «빨간 적이 없는» 게 아니라 **한 번도 돈 적이 없다.**
      크래시를 걷어내자 6항이 더 빨갰고, 여섯 자리 전부 **75 이후의 주인 지시가 지난 자리**였다:
        · 총 54종 / 등급별 4,4,3,3,2,2   → **85**(8등급 × 5종, 최상위만 1종 = 108종)
        · «j=0 은 v 1.00»                → **260**(등급 배열을 v 오름차순 재배치 · id 명시)
        · «equipVal 비 = v 비 1.12»      → **472**(장착 축이 `EQ_BASE(등급,티어)` 표로)
        · «relicVal = v·gMul·lvMul·0.5»  → **89·197**(유물은 보유 Lv 선형)
        · «합성은 같은 j 유지 · 결정적»  → **85 ⑤**(주인 지시 «다음 등급 5종 중 랜덤»)
        · «등급 안 균등 추첨»            → **251**(등급 안 티어 가중)
        · «COLL.equip.tiers[].need»      → **91**(카테고리 티어 표 폐기 → `COLL_SETS`)
      ⇒ **제품 0줄.** `tools/verify91.js` 가 «구 `COLL` 폐기» 를 단언하고 있어 두 자가 서로
      반대를 단언하던 자리다(532-② · 333 과 같은 꼴) — 나중 지시(91)가 옳다.

   ⚑ **고칠 때 지킨 것 둘**
      1. **522-① — 숫자를 손으로 다시 적지 않았다.** 종 수·등급 수·기대 분포·도감 구성원은 전부
         제품의 표(`EQUIPS`·`GRADE`·`SLOTS`·`tierWeights`·`COLL_SETS`)에서 **역산**한다.
         옛 값을 새 값으로 갈아 끼우기만 했으면 85 다음 지시에서 **또** 썩는다.
      2. **319 처방 — 절을 갈랐다.** evaluate 를 7개로 쪼개고 각각 try 로 감쌌다. 이제 한 자리가
         죽어도 **그 블록만 빨개지고** 나머지 절은 계속 돈다.
      ⚠ 항등식만 남기지 않으려고 §R 을 짝으로 세웠다(532-④) — 제품 사본을 셋으로 망가뜨려
         「등급당 여러 종」·「구 id 는 v 1.00」·「도감이 전 종을 담는다」가 **실제로 빨개지는지** 본다. */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const IDX = path.resolve(__dirname, 'index.html');

const OLD_SAVE = {
  own: { weapon3: { n: 7, l: 12 }, weapon0: { n: 3, l: 4 }, shield1: { n: 0, l: 2 } },
  eqSlot: { weapon: 'weapon3', shield: 'shield1', amulet: null },
  dia: 999999, autoEquip: false,
  sum: { weapon: { lv: 100, exp: 0 }, shield: { lv: 1, exp: 0 }, amulet: { lv: 1, exp: 0 },
         skill: { lv: 1, exp: 0 }, pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } }
};

/* 세이브 주입 — 44 교훈 1(세이브는 페이지 스크립트보다 먼저 심는다) */
const seed = async (pg, sv) => pg.addInitScript(s => {
  window.__OLDSAVE = s;
  const orig = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key) {
    const raw = orig.call(this, key);
    if (window.__OLDSAVE && /save|idle|kkkk|S_/i.test(key)) {
      try { const d = raw ? JSON.parse(raw) : {}; return JSON.stringify(Object.assign(d, window.__OLDSAVE)); }
      catch (e) { return raw; }
    }
    return raw;
  };
}, sv);

let pass = true;
const chk = (name, ok, extra) => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra) : ''));
  if (!ok) pass = false;
};
/* 319 — 블록 하나가 죽어도 나머지 절은 계속 돈다. 죽은 블록은 `{__err}` 로 돌아온다. */
const blk = async (pg, fn, arg) => {
  try { return await pg.evaluate(fn, arg); }
  catch (e) { return { __err: String(e).split('\n')[0] }; }
};
const alive = (name, r) => { if (r && r.__err) chk(name + ' — 블록이 죽었다', false, r.__err); return !(r && r.__err); };

(async () => {
  const br = await launch(chromium);
  const pg = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  await seed(pg, OLD_SAVE);
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://' + IDX);
  await pg.waitForTimeout(1200);

  /* ── ① 데이터 구조 ─────────────────────────────────────────────────────────
     ⚑ 종 수·등급 수를 손으로 적지 않는다(522-①). 75 가 물은 것은 «등급당 여러 종» 이지
        «등급당 4종» 이 아니다 — 85 가 그 수를 바꿔도 이 절은 안 썩어야 한다. */
  const A = await blk(pg, () => {
    const per = {}; EQUIPS.forEach(e => { per[e.slot] = (per[e.slot] || 0) + 1; });
    const sizes = s => GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s && e.g === g).length);
    const ref = sizes(SLOTS[0].k);
    const topG = GRADE.length - 1;
    return {
      per, total: EQUIPS.length, slots: SLOTS.map(s => s.k), grades: GRADE.length,
      sizes: ref,
      symmetric: SLOTS.every(s => String(sizes(s.k)) === String(ref)),
      totalMatches: EQUIPS.length === SLOTS.length * ref.reduce((a, b) => a + b, 0),
      /* 75 의 본체 — «그 등급의 모든 무기가 나올 수 있게» 하려면 등급마다 종이 여럿이어야 한다.
         최상위 등급만 1종인 것은 85 의 규약(불멸은 부위마다 하나)이라 예외로 센다. */
      multiPerGrade: ref.slice(0, topG).every(n => n >= 2),
      topSize: ref[topG],
      /* 구 세이브 보존 — 구 id 는 `slot + g` 꼴이고 그 값이 기준(v 1.00)이다 */
      legacyAll: GRADE.every((_, g) => SLOTS.every(s => !!EQ[s.k + g])),
      legacyV1: GRADE.every((_, g) => SLOTS.every(s => EQ[s.k + g].v === 1.00)),
      vMin: Math.min.apply(null, EQUIPS.map(e => e.v)),
      vMax: Math.max.apply(null, EQUIPS.map(e => e.v)),
      dup: EQUIPS.length !== new Set(EQUIPS.map(e => e.id)).size,
      idsInEQ: EQUIPS.every(e => EQ[e.id] === e)
    };
  });
  if (alive('①', A)) {
    chk('① 등급마다 여러 종(최상위 제외) — 75 의 본체', A.multiPerGrade, A.sizes);
    chk('① 최상위 등급은 부위마다 1종(85 규약)', A.topSize === 1, A.topSize);
    chk('① 부위 3종이 같은 등급 구성 · 총수 = 부위 × 부위당', A.symmetric && A.totalMatches,
        { total: A.total, per: A.per });
    chk('① 구 id(`slot+g`)가 전 등급 보존 — 구 세이브 무마이그레이션', A.legacyAll);
    chk('① 구 id 의 v 는 1.00 (개체차의 기준점)', A.legacyV1);
    chk('① v 폭 0.9~1.15 (260 «1.278 배를 넘기지 말 것»)', A.vMin >= 0.9 && A.vMax <= 1.15,
        [A.vMin, A.vMax]);
    chk('① id 중복 없음 · EQ 색인과 1:1', !A.dup && A.idsInEQ);
  }

  /* ── ⑤ 구 세이브 (소환 시뮬이 재료를 올리기 전에 먼저 읽는다) ── */
  const E = await blk(pg, () => ({ eq: S.eqSlot.weapon, lv: oLv('weapon3'), frag: frag('weapon3'), sh: S.eqSlot.shield }));
  if (alive('⑤', E)) {
    chk('⑤ 구 세이브 장착·레벨·재료 보존', E.eq === 'weapon3' && E.lv === 12 && E.frag === 7 && E.sh === 'shield1', E);
  }

  /* ── ② 소환 분포 ───────────────────────────────────────────────────────────
     ⚑ 옛 판정 «전 항목 ≥ 5%» 는 **251 이전(등급 안 균등 1/N)** 의 자다. 251 이 티어 가중을 넣은
        뒤로 균등은 거짓이고, 그렇다고 «≥5%» 만 남기면 가중이 통째로 뒤집혀도 초록이다.
        ⇒ 기대치를 제품의 `tierWeights` 에서 **역산**하고, 관측이 그 기대를 따르는지 본다.
        1000연에서 표준편차는 최대 1.6%p 이므로 5%p 띠는 3σ 이상이다(플레이키 방지). */
  const B = await blk(pg, () => {
    const dist = {};
    for (let i = 0; i < 1000; i++) { const { it } = summonOne('weapon'); dist[it.id] = (dist[it.id] || 0) + 1; }
    const pool = BANNERS.weapon.list.filter(x => x.g === 0);
    const tot = pool.reduce((s, e) => s + (dist[e.id] || 0), 0);
    const tw = tierWeights(pool, 'weapon');
    return {
      n: pool.length, tot,
      rows: pool.map((e, i) => ({ id: e.id, obs: +(((dist[e.id] || 0) / tot) * 100).toFixed(1),
                                  exp: +(tw[i] * 100).toFixed(1) })),
      allSeen: pool.every(e => (dist[e.id] || 0) > 0)
    };
  });
  if (alive('②', B)) {
    const worst = B.rows.reduce((a, r) => Math.max(a, Math.abs(r.obs - r.exp)), 0);
    chk('② 일반 등급 안 전 종이 실제로 나온다 (75 의 지시문 그대로)', B.allSeen && B.n >= 2, B.n + '종/' + B.tot + '회');
    chk('② 분포가 제품의 tierWeights 를 따른다 (251 · 최대 편차 ≤ 5%p)', worst <= 5,
        { worst: +worst.toFixed(1), rows: B.rows });
  }

  /* ── ③ 개체차 ──────────────────────────────────────────────────────────────
     75 는 «equipVal 에 v 가 곱해진다» 로 적었지만 472 가 장착 축을 `EQ_BASE(등급,티어)` 표로
     갈았다. 물어야 할 것은 식이 아니라 **개체차가 값에 반영되는가** 이고, 지금 그 답은 두 축이다:
       · 보유 축 `ownVal` — v 가 그대로 곱해진다(비 = v 비)
       · 장착 축 `equipVal` — 260 이 j 를 v 오름차순으로 정렬해 두어 «v 큰 쪽이 크다» 가 산다
     스킬·유물은 `eqv` 밖이다(75 의 «영향 없음»). 식을 베끼지 않고 **v 를 흔들어** 확인한다(523). */
  const C = await blk(pg, () => {
    const g0 = EQUIPS.filter(e => e.slot === 'weapon' && e.g === 0);
    const lo = EQ['weapon0'], hi = g0.reduce((a, b) => (b.v > a.v ? b : a));
    S.own[lo.id] = S.own[lo.id] || { n: 0, l: 1 };
    S.own[hi.id] = { n: 0, l: S.own[lo.id].l };
    const sk = SKILLS[0], rl = RELICS[0];
    S.own[sk.id] = S.own[sk.id] || { n: 0, l: 3 };
    S.own[rl.id] = S.own[rl.id] || { n: 0, l: 3 };
    const before = { sk: ownVal(sk), rl: relicVal(rl) };
    const keep = hi.v;
    hi.v = keep * 1.05;                       /* v 를 흔든다 — 식을 베끼지 않고 축을 확인 */
    const bumped = { own: ownVal(hi), sk: ownVal(sk), rl: relicVal(rl) };
    hi.v = keep;
    return {
      hiId: hi.id, hiV: hi.v,
      ownRatio: ownVal(hi) / ownVal(lo),
      eqUp: equipVal(hi) > equipVal(lo),
      powUp: power(hi, 'equip') > power(lo, 'equip'),
      ownFollowsV: Math.abs(bumped.own / ownVal(hi) - 1.05) < 1e-9,
      skUntouched: bumped.sk === before.sk,
      rlUntouched: bumped.rl === before.rl,
      tierIsVOrder: g0.every((e, i) => i === 0 || g0[i - 1].v <= e.v)
    };
  });
  if (alive('③', C)) {
    chk('③ 보유 축 ownVal 의 비 = v 비', Math.abs(C.ownRatio - C.hiV) < 1e-9, [C.hiId, C.ownRatio, C.hiV]);
    chk('③ v 를 흔들면 ownVal 이 그만큼 따라 움직인다', C.ownFollowsV);
    chk('③ 장착 축(equipVal·power)에서도 v 큰 쪽이 크다 (260 이 j 를 v 순으로 정렬)',
        C.eqUp && C.powUp && C.tierIsVOrder);
    chk('③ 스킬 ownVal · 유물 relicVal 은 장비 v 에 안 흔들린다', C.skUntouched && C.rlUntouched);
  }

  /* ── ④ 합성 ────────────────────────────────────────────────────────────────
     ⚠ 75 는 «같은 j 유지 · 결정적» 이었으나 **85 ⑤(주인 지시)** 가 «다음 등급 N종 중 랜덤» 으로
        뒤집었다(index.html 의 그 주석 그대로). 남는 단언은 «풀 안에서 나온다 · 최상위는 null ·
        canCraft 가 참인 곳에서 지급이 실패하지 않는다» 다. */
  const D = await blk(pg, () => {
    const src = EQ['weapon0'];
    const pool = new Set(EQUIPS.filter(e => e.slot === 'weapon' && e.g === 1).map(e => e.id));
    const seen = new Set();
    for (let i = 0; i < 300; i++) { const nx = nextGradeItem(src); if (nx) seen.add(nx.id); }
    const top = EQUIPS.filter(e => e.slot === 'weapon').reduce((a, b) => (b.g > a.g ? b : a));
    return {
      inPool: [...seen].every(id => pool.has(id)),
      coversPool: seen.size === pool.size, poolN: pool.size, seenN: seen.size,
      topNull: nextGradeItem(top) === null,
      crossSlot: [...seen].every(id => EQ[id].slot === 'weapon')
    };
  });
  if (alive('④', D)) {
    chk('④ 합성 결과는 다음 등급 · 같은 부위 풀 안에서만 나온다', D.inPool && D.crossSlot);
    chk('④ 풀 전체가 실제로 나온다 (85 ⑤ «랜덤» — 한 종에 굳지 않았다)', D.coversPool,
        D.seenN + '/' + D.poolN);
    chk('④ 최상위 등급은 합성 결과 없음', D.topNull);
  }

  /* ── ⑥ 05 그리드 · 11 확률 팝업 · NaN ───────────────────────────────────────
     ⚠ 칸 수로는 «전 종을 담는가» 를 못 묻는다 — 격자는 `WPN_ROWS × WPN_COLS` **고정**이고
        남는 칸은 잠금 더미다(최상위 등급 행은 1종 + 더미 4칸 = 85 이후 40칸 / 36종).
        `verify85` H1 이 그 40칸을 이미 단언한다. ⇒ 여기서는 **행마다 앞 n칸의 아이콘 열**이
        그 등급 아이템 순서와 같은지로 «전 종이 격자에 놓였는가» 를 묻는다.
     ⚠ 확률 팝업은 «그 레벨에서 확률이 0 이 아닌 등급» 만 그린다 — 한 단계만 보면 25/36 이다.
        `verify86` [5] 선례대로 **전 단계를 훑어 합집합**을 센다. */
  const F = await blk(pg, () => {
    const b = bonus();
    const noNaN = Object.values(b).every(v => Number.isFinite(v)) && Number.isFinite(stat.dmg ?? 1);
    openWeapon('weapon3');
    const list = EQUIPS.filter(e => e.slot === 'weapon');
    const g0n = list.filter(e => e.g === 0).length;
    const icons = [...document.querySelectorAll('#wpnGrid .wgc em.ic')].map(e => e.textContent);
    const cells = document.querySelectorAll('#wpnGrid .wgc').length;
    const html = document.getElementById('wpnGrid').innerHTML;
    /* 행마다 앞 n칸이 그 등급 아이템의 아이콘 열과 같은가 */
    let rowsOk = true, shown = 0;
    GRADE.forEach((_, g) => {
      const it = list.filter(e => e.g === g);
      const seg = icons.slice(g * WPN_COLS, g * WPN_COLS + it.length);
      if (seg.join('|') !== it.map(e => e.ic).join('|')) rowsOk = false; else shown += it.length;
    });
    /* 11 확률 팝업 — 전 단계 합집합.
       ⚠ `PRB_STEPS_EQ` 는 250 이후 **소환 레벨 숫자 배열**(1..SUM_MAXLV)이다. 객체가 아니므로
          `st.unlock` 을 읽으면 `undefined` → `openProbInfo` 가 «현재 레벨» 로 떨어져 10행만 본다
          (522-② «숫자가 틀렸는데 에러가 안 나면 가장 오래 사는 부패»). 값을 그대로 넘긴다. */
    const seen = new Set();
    PRB_STEPS_EQ.forEach(lv => {
      openProbInfo('weapon', lv);
      document.querySelectorAll('#prbList .prb-row .nm>i').forEach(e => seen.add(e.textContent));
    });
    closeProbInfo(); closeWeapon();
    return { noNaN, cells, gridCells: WPN_ROWS * WPN_COLS, g0n, colsFit: WPN_COLS >= Math.max.apply(null,
               GRADE.map((_, g) => list.filter(e => e.g === g).length)),
             row0: icons.slice(0, g0n), row0Distinct: new Set(icons.slice(0, g0n)).size,
             rowsOk, shown, total: list.length, bad: /NaN|undefined/.test(html),
             prbRows: seen.size, prbExpect: list.length, eqAfter: S.eqSlot.weapon };
  });
  if (alive('⑥', F)) {
    chk('⑥ NaN 없음', F.noNaN);
    chk('⑥ 05 격자 = WPN_ROWS × WPN_COLS 고정 (남는 칸은 잠금 더미)',
        F.cells === F.gridCells && !F.bad, F.cells + '칸');
    chk('⑥ 행마다 앞 칸이 그 등급 아이템 열과 일치 = 전 종이 격자에 놓인다',
        F.rowsOk && F.shown === F.total, F.shown + '/' + F.total + '종');
    chk('⑥ 한 등급의 종 수가 열 수를 넘지 않는다 (넘으면 뒤 종이 잘린다)', F.colsFit);
    chk('⑥ 일반 행이 그 등급 종 수만큼 서로 다른 칸', F.row0Distinct === F.g0n, F.row0);
    chk('⑥ 11 확률 팝업이 전 단계에 걸쳐 그 부위 전 종을 표기 (86 선례)',
        F.prbRows === F.prbExpect, F.prbRows + '/' + F.prbExpect);
    chk('⑤ 소환 시뮬 뒤에도 장착이 안 바뀐다 (263 자동 장착 폐지)', F.eqAfter === 'weapon3', F.eqAfter);
  }

  /* ── ⑦ 도감 ────────────────────────────────────────────────────────────────
     옛 항 «COLL.equip.tiers need 12/24/33/42/48/54 · 최종 = 전 종» 이 **43행 즉사의 자리**다.
     91 이 «카테고리 × 종수 티어» 를 «부위 × 등급 세트» 로 통째로 갈았고(구 `COLL` 은 폐기 —
     `tools/verify91.js` 가 그 폐기를 단언한다), 그 항이 묻던 것은 그대로다:
     **도감이 장비 전 종을 하나도 안 빠뜨리는가.** 선례는 `verify85` [I]·`verify86` [5]. */
  const G = await blk(pg, () => {
    const gone = typeof COLL === 'undefined';
    const eq = COLL_SETS.filter(s => s.cat === 'equip');
    const ids = new Set(eq.reduce((a, s) => a.concat(s.it), []));
    const perSlot = SLOTS.map(s => eq.filter(x => x.tab === s.k).length);
    let err = null; try { renderColl21(); } catch (e) { err = String(e); }
    return { gone, sets: eq.length, members: ids.size, total: EQUIPS.length,
             all: EQUIPS.every(e => ids.has(e.id)),
             extra: [...ids].filter(id => !EQ[id]).length,
             perSlot, perGrade: eq.length === SLOTS.length * GRADE.length, err };
  });
  if (alive('⑦', G)) {
    chk('⑦ 구 COLL(카테고리 need 티어 표) 폐기 — verify91 과 같은 방향', G.gone);
    chk('⑦ 도감 장비 세트가 전 종을 담는다 (옛 «최종 need = 전 종»)',
        G.all && G.members === G.total && G.extra === 0, G.members + '/' + G.total + '종');
    chk('⑦ 세트 = 부위 × 등급 · 부위마다 같은 수', G.perGrade && new Set(G.perSlot).size === 1,
        G.sets + '세트 = ' + G.perSlot.join('/'));
    chk('⑦ renderColl21 에러 없음', !G.err, G.err || '');
  }

  chk('콘솔 에러 0', errs.length === 0, errs.slice(0, 3));
  await br.close();

  /* ── §R 되돌림 시험 ────────────────────────────────────────────────────────
     532-④ — «지금 있는 값으로 갈아 끼우는» 수리의 기본값은 헛초록이다. 제품 사본을 셋으로
     망가뜨려 위 단언이 **실제로 빨개지는 길**이 있는지 못박는다. 사본은 임시 디렉터리에만 쓴다. */
  console.log('--- §R 되돌림 시험 (제품 사본 3종)');
  const src = fs.readFileSync(IDX, 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v75r-'));
  const runMutant = async (label, mutate, probe) => {
    const body = mutate(src);
    if (body === src) { chk('§R ' + label + ' — 사본 편집이 안 걸렸다(패턴 부패)', false); return; }
    const f = path.join(tmp, label + '.html');
    fs.writeFileSync(f, body);
    const b2 = await launch(chromium);
    const p2 = await b2.newPage({ viewport: { width: 1080, height: 2280 } });
    await p2.goto('file://' + f);
    await p2.waitForTimeout(1000);
    const got = await blk(p2, probe);
    await b2.close();
    return got;
  };

  /* R1 — 일반 등급을 1종으로 접는다 ⇒ ① «등급마다 여러 종» 이 빨개져야 한다 */
  const R1 = await runMutant('r1-onePerGrade',
    s => s.replace(/(const EQUIPS = \[\];)/,
      "$1\nEQ_NAMES.weapon[0] = [EQ_NAMES.weapon[0][2]];"),
    () => {
      const ref = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === 'weapon' && e.g === g).length);
      return { multi: ref.slice(0, GRADE.length - 1).every(n => n >= 2), ref };
    });
  if (R1) chk('§R1 일반 등급을 1종으로 접으면 ① 이 빨개진다', R1.multi === false, R1.ref);

  /* R2 — 구 id 의 v 를 흔든다 ⇒ ① «구 id 는 v 1.00» 이 빨개져야 한다 */
  const R2 = await runMutant('r2-legacyV',
    s => s.replace("{id:'weapon0',n:'녹슨 검',v:1.00", "{id:'weapon0',n:'녹슨 검',v:1.09"),
    () => ({ v1: GRADE.every((_, g) => SLOTS.every(s => EQ[s.k + g].v === 1.00)),
             got: EQ['weapon0'].v }));
  if (R2) chk('§R2 구 id 의 v 를 1.09 로 바꾸면 ① 이 빨개진다', R2.v1 === false, R2.got);

  /* R3 — 도감 빌더에서 구성원 한 종을 빼면 ⇒ ⑦ «전 종을 담는다» 가 빨개져야 한다 */
  const R3 = await runMutant('r3-collGap',
    s => s.replace('EQUIPS.filter(e => e.slot === s.k && e.g === gi).map(e => e.id)',
                   'EQUIPS.filter(e => e.slot === s.k && e.g === gi).map(e => e.id).slice(1)'),
    () => {
      const eq = COLL_SETS.filter(s => s.cat === 'equip');
      const ids = new Set(eq.reduce((a, s) => a.concat(s.it), []));
      return { all: EQUIPS.every(e => ids.has(e.id)), members: ids.size, total: EQUIPS.length };
    });
  if (R3) chk('§R3 도감 세트에서 구성원을 하나씩 빼면 ⑦ 이 빨개진다', R3.all === false,
              R3.members + '/' + R3.total);

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

  console.log(pass ? 'VERIFY75 PASS' : 'VERIFY75 FAIL');
  process.exit(pass ? 0 : 1);
})();
