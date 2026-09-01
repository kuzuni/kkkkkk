#!/usr/bin/env node
/* 작업 724 재현기 — 「스킬 총 보유 효과가 비정상 폭등 — 곱연산 의심」(주인 보고 2026-09-02 04:02)
 *
 *   node tools/probe724.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 «착수 = 사실 확인 먼저(714 꼴)» 라고 못박았다.
 * 이 자는 **제품을 한 줄도 안 고치고** 아래 넷을 제품 함수(`bonus()`·`ownVal`·`cosOwnMul` …)에게
 * 직접 물어 «곱이냐 합이냐» 를 수치로 가른다.
 *
 *   [1] 카테고리 «안» — 같은 카테고리 2표본으로 Σ(합) ↔ Π(곱) 를 가른다(8 카테고리 전수)
 *   [2] 카테고리 «간» — 서로 다른 카테고리 둘을 동시에 켜면 곱인가
 *   [3] 폭등 규모   — 전 스킬 보유에서 배수가 Σ 모델의 몇 배인가(주인이 본 «개같이 높다»)
 *   [4] 표시       — 07 스킬·26 펫 시트의 «총 보유 효과» 와 05 장비 시트의 그것이 **다른 모델**인가
 *                     (주인 원문 «다른 장비들처럼 합연산으로 되야하는데» 의 근거)
 *
 * 주인 보강(2026-09-02 04:05)이 정한 확정 모델:
 *   총배율 = (1+Σ장비)×(1+Σ스킬)×(1+Σ코스튬)×(1+Σ펫)×(1+Σ훈련)×(1+Σ룬)×(1+Σ단련)×(1+Σ유물)
 *   ⇒ 카테고리 «안» 은 합 · 카테고리 «간» 은 곱.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };
const f = n => (Math.abs(n) >= 1e6 ? n.toExponential(4) : (+n).toFixed(6));

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof bonus === 'function' && typeof S !== 'undefined' && typeof SKILLS !== 'undefined');
  await p.waitForTimeout(600);

  /* 모든 축을 끈 «맨몸» 상태를 만드는 한 벌 — 자(verify724)와 같은 눈을 쓴다 */
  const RESET = () => {
    S.own = {}; S.coll = {}; S.avatars = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
    S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} };
    S.rune = {}; S.cosLv = {};
    S.temper = null;
    markDirty();
  };

  /* ══════════ [1] 카테고리 «안» — Σ 냐 Π 냐 ══════════ */
  console.log('[1] 카테고리 «안» 결합 — 2표본으로 Σ(합) ↔ Π(곱) 를 가른다');
  const A = await p.evaluate(() => {
    const R = () => { S.own = {}; S.coll = {}; S.avatars = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
                      S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} };
                      S.rune = {}; S.cosLv = {};
                      S.temper = null; markDirty(); };
    const out = {};

    /* ── 스킬 보유 : 2종 Lv1 ── */
    R();
    { const s1 = SKILLS[0], s2 = SKILLS[1];
      S.own[s1.id] = { l: 1 }; markDirty(); const one = bonus().atk;
      S.own[s2.id] = { l: 1 }; markDirty(); const two = bonus().atk;
      const x1 = ownVal(s1), x2 = ownVal(s2);
      out.skill = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2), ids: [s1.id, s2.id] }; }

    /* ── 장비 보유(무기 2자루 → atk) ── */
    R();
    { const w = EQUIPS.filter(e => e.slot === 'weapon').slice(0, 2);
      S.own[w[0].id] = { l: 1 }; markDirty(); const one = bonus().atk;
      S.own[w[1].id] = { l: 1 }; markDirty(); const two = bonus().atk;
      const x1 = ownVal(w[0]), x2 = ownVal(w[1]);
      out.equip = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2), ids: w.map(e => e.id) }; }

    /* ── 펫 보유(골드 축이 순수하다 — atk 은 ×0.6 이 겹친다) ── */
    R();
    { const q = PETS.slice(0, 2);
      S.own[q[0].id] = { l: 1 }; markDirty(); const one = bonus().gold;
      S.own[q[1].id] = { l: 1 }; markDirty(); const two = bonus().gold;
      const x1 = ownVal(q[0]), x2 = ownVal(q[1]);
      out.pet = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2), ids: q.map(e => e.id) }; }

    /* ── 코스튬 보유(계단 cosOwnMul) ── */
    R();
    { S.avatars = {}; S.avatars[AVATARS[0].id] = 1; markDirty(); const one = bonus().atk;
      S.avatars[AVATARS[1].id] = 1; markDirty(); const two = bonus().atk;
      const x1 = cosOwnStep('atk', 1), x2 = cosOwnStep('atk', 2);
      out.cos = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    /* ── 유물(같은 축 둘 — eff 가 같은 유물 2종) ── */
    R();
    { const byEff = {};
      RELICS.forEach(r => { (byEff[r.eff] = byEff[r.eff] || []).push(r); });
      const pick = Object.keys(byEff).map(k => byEff[k]).filter(a => a.length >= 2)
        .map(a => a.slice(0, 2)).find(a => a[0].eff === 'all' || a[0].eff === 'atk' || a[0].eff === 'gold' || a[0].eff === 'hp');
      if (!pick) { out.relic = null; }
      else {
        const axis = pick[0].eff === 'gold' ? 'gold' : pick[0].eff === 'hp' ? 'hp' : 'atk';
        S.own[pick[0].id] = { l: 1 }; markDirty(); const one = bonus()[axis];
        S.own[pick[1].id] = { l: 1 }; markDirty(); const two = bonus()[axis];
        const x1 = relicVal(pick[0]), x2 = relicVal(pick[1]);
        out.relic = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2),
                      eff: pick[0].eff, axis, ids: pick.map(r => r.id) };
      } }

    /* ── 룬(이미 축별 합산 뒤 1회 곱이라고 주석에 적혀 있다 — 확인) ── */
    R();
    { const r = RUNES.filter(x => x.eff && x.eff.atk).slice(0, 2);
      S.rune = {};
      S.rune[r[0].id] = 5; markDirty(); const one = bonus().atk;
      S.rune[r[1].id] = 5; markDirty(); const two = bonus().atk;
      const x1 = runeVal(r[0].id, 'atk'), x2 = runeVal(r[1].id, 'atk');
      out.rune = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    /* ── 도감(축별 합산 뒤 1회 곱 — 확인) ── */
    R();
    { const sets = COLL_SETS.filter(s => s.eff && s.eff.atk).slice(0, 2);
      S.coll[sets[0].key] = 1; markDirty(); const one = bonus().atk;
      S.coll[sets[1].key] = 1; markDirty(); const two = bonus().atk;
      const x1 = sets[0].eff.atk, x2 = sets[1].eff.atk;
      out.coll = { one, two, x1, x2, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    /* ── 코스튬 강화(레벨 총합 뒤 1회 곱 — 확인) ── */
    R();
    { S.avatars = {}; S.avatars[AVATARS[0].id] = 1; S.avatars[AVATARS[1].id] = 1;
      S.cosLv = {}; S.cosLv[AVATARS[0].id] = 1;
      markDirty(); const one = bonus().atk / cosOwnMul('atk');
      S.cosLv[AVATARS[1].id] = 1; markDirty(); const two = bonus().atk / cosOwnMul('atk');
      const x = COS_LV.atk;
      out.coslv = { one, two, x1: x, x2: x, sum: 1 + 2 * x, prod: (1 + x) * (1 + x) }; }

    return out;
  });

  const verdict = o => {
    if (!o) return 'n/a';
    const dS = Math.abs(o.two - o.sum), dP = Math.abs(o.two - o.prod);
    return dS < dP ? 'Σ(합)' : 'Π(곱)';
  };
  const show = (k, name) => {
    const o = A[k];
    if (!o) { ok(false, name + ' — 표본을 못 만들었다'); return; }
    const v = verdict(o);
    console.log('     · ' + name + ' — 1개 ' + f(o.one) + ' · 2개 ' + f(o.two)
      + ' | Σ 예측 ' + f(o.sum) + ' · Π 예측 ' + f(o.prod) + '  ⇒ **' + v + '**');
    return v;
  };
  const vSkill = show('skill', '스킬 보유'), vEquip = show('equip', '장비 보유(무기·atk)');
  const vPet = show('pet', '펫 보유(gold)'), vCos = show('cos', '코스튬 보유');
  const vRelic = show('relic', '유물'), vRune = show('rune', '룬');
  const vColl = show('coll', '도감'), vCosLv = show('coslv', '코스튬 강화');

  ok(vSkill === 'Π(곱)', '1a **주인 보고 확인 — 스킬 보유 효과는 스킬끼리 곱연산이다**', 'Π');
  ok(vEquip === 'Π(곱)', '1b ⚑ 장비 보유도 같은 곱연산이다(주인이 «장비처럼» 이라 한 것은 **표시** 쪽이었다)', 'Π');
  ok(vPet === 'Π(곱)', '1c 펫 보유도 곱연산', 'Π');
  ok(vCos === 'Π(곱)', '1d 코스튬 보유(계단)도 곱연산', 'Π');
  ok(vRelic === 'Π(곱)', '1e 유물도 곱연산', 'Π');
  ok(vRune === 'Σ(합)', '1f 룬은 이미 축별 합산 뒤 1회 곱(203 규약)', 'Σ');
  ok(vColl === 'Σ(합)', '1g 도감은 이미 축별 합산 뒤 1회 곱(91 규약)', 'Σ');
  ok(vCosLv === 'Σ(합)', '1h 코스튬 «강화» 는 이미 레벨 총합 뒤 1회 곱(194 규약)', 'Σ');

  /* ══════════ [2] 카테고리 «간» — 곱인가 ══════════ */
  console.log('[2] 카테고리 «간» 결합 — 스킬 1 + 룬 1 을 동시에 켠다');
  const B = await p.evaluate(() => {
    const R = () => { S.own = {}; S.coll = {}; S.avatars = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
                      S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} };
                      S.rune = {}; S.cosLv = {};
                      S.temper = null; markDirty(); };
    R(); const s = SKILLS[0], r = RUNES.filter(x => x.eff && x.eff.atk)[0];
    S.own[s.id] = { l: 1 }; markDirty(); const a = bonus().atk;
    S.own = {}; S.rune = {}; S.rune[r.id] = 5; markDirty(); const b2 = bonus().atk;
    S.own[s.id] = { l: 1 }; markDirty(); const ab = bonus().atk;
    return { a, b: b2, ab, prod: a * b2, sum: a + b2 - 1 };
  });
  console.log('     · 스킬만 ' + f(B.a) + ' · 룬만 ' + f(B.b) + ' · 둘 다 ' + f(B.ab)
    + ' | 곱 예측 ' + f(B.prod) + ' · 합 예측 ' + f(B.sum));
  ok(Math.abs(B.ab - B.prod) < 1e-9, '2a 카테고리 «간» 은 이미 곱이다 — 주인 모델의 이 절반은 지켜지고 있다');

  /* ══════════ [3] 폭등 규모 ══════════ */
  console.log('[3] 폭등 규모 — 전 스킬 보유에서 곱 모델 ÷ 합 모델');
  const C = await p.evaluate(() => {
    const R = () => { S.own = {}; S.coll = {}; S.avatars = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
                      S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} };
                      S.rune = {}; S.cosLv = {};
                      S.temper = null; markDirty(); };
    const at = l => {
      R(); SKILLS.forEach(s => { S.own[s.id] = { l }; }); markDirty();
      const got = bonus().atk;
      const sum = 1 + SKILLS.reduce((t, s) => t + ownVal(s), 0);
      return { n: SKILLS.length, l, got, sum, ratio: got / sum };
    };
    const all = () => {                       /* 전 카테고리 만렙 — cp 하향 폭의 상한 */
      R();
      SKILLS.forEach(s => { S.own[s.id] = { l: 100 }; });
      PETS.forEach(s => { S.own[s.id] = { l: 100 }; });
      EQUIPS.forEach(s => { S.own[s.id] = { l: 100 }; });
      RELICS.forEach(s => { S.own[s.id] = { l: 100 }; });
      AVATARS.forEach(a => { S.avatars[a.id] = { l: 0 }; });
      markDirty();
      return { atk: bonus().atk, hp: bonus().hp, gold: bonus().gold, cp: cp() };
    };
    return { l1: at(1), l100: at(100), full: all() };
  });
  console.log('     · 스킬 ' + C.l1.n + '종 Lv1  — 곱 ' + f(C.l1.got) + ' · 합 ' + f(C.l1.sum)
    + ' ⇒ **×' + f(C.l1.ratio) + '**');
  console.log('     · 스킬 ' + C.l100.n + '종 Lv100 — 곱 ' + f(C.l100.got) + ' · 합 ' + f(C.l100.sum)
    + ' ⇒ **×' + f(C.l100.ratio) + '**');
  console.log('     · 전 카테고리 만렙 — b.atk ' + f(C.full.atk) + ' · b.hp ' + f(C.full.hp)
    + ' · b.gold ' + f(C.full.gold) + ' · cp ' + f(C.full.cp));
  ok(C.l1.ratio > 1.2, '3a 스킬 전 보유(Lv1)에서 이미 합 모델의 ' + f(C.l1.ratio) + ' 배다');
  ok(C.l100.ratio > 100, '3b Lv100 에서는 ' + f(C.l100.ratio) + ' 배 — «개같이 높다» 의 정체');

  /* ══════════ [4] 표시 — 세 시트가 같은 모델을 쓰는가 ══════════ */
  console.log('[4] 표시 — 07 스킬 · 26 펫 · 05 장비 시트의 «총 보유 효과» 모델');
  const D = await p.evaluate(() => {
    const R = () => { S.own = {}; S.coll = {}; S.avatars = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
                      S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} };
                      S.rune = {}; S.cosLv = {};
                      S.temper = null; markDirty(); };
    R();
    SKILLS.slice(0, 3).forEach(s => { S.own[s.id] = { l: 10 }; });
    EQUIPS.filter(e => e.slot === 'weapon').slice(0, 3).forEach(e => { S.own[e.id] = { l: 10 }; });
    markDirty();
    const skProd = SKILLS.reduce((m, s) => has(s.id) ? m * (1 + ownVal(s)) : m, 1) - 1;
    const skSum = SKILLS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0);
    const eqSum = wpnTotalOwn();
    const eqProd = wpnList().reduce((m, e) => has(e.id) ? m * (1 + ownVal(e)) : m, 1) - 1;
    return { skProd, skSum, eqSum, eqProd };
  });
  console.log('     · 07 스킬 시트 표기 = Π−1 = ' + f(D.skProd) + '  (Σ 였다면 ' + f(D.skSum) + ')');
  console.log('     · 05 장비 시트 표기 = Σ  = ' + f(D.eqSum) + '  (Π−1 이라면 ' + f(D.eqProd) + ')');
  ok(Math.abs(D.skProd - D.skSum) > 1e-9 && D.skProd > D.skSum,
     '4a ⚑ **두 시트가 서로 다른 모델을 쓴다** — 스킬은 Π, 장비는 Σ 로 적는다(주인 원문의 «장비처럼» 이 여기서 나왔다)');
  ok(Math.abs(D.eqSum - D.eqProd) > 1e-12,
     '4b 05 장비 표기(Σ)는 `bonus()` 의 실계산(Π)과도 어긋난다 — 표시가 이미 «합연산» 을 약속하고 있었다');

  ok(errs.length === 0, '9z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  await b.close();
  console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
