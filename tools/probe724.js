#!/usr/bin/env node
/* 작업 724 재현기 — 「스킬 총 보유 효과가 비정상 폭등 — 곱연산 의심」(주인 보고 2026-09-02 04:02)
 *
 *   node tools/probe724.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 «착수 = 사실 확인 먼저(714 꼴)» 라고 못박았다.
 * 이 자는 제품 함수(`bonus()`·`ownVal`·`cosOwnSum` …)에게 «곱이냐 합이냐» 를 직접 물어
 * 수치로 가른다. **수리 전 값은 아래 `BEFORE` 에 박아 두었다**(2026-09-01, 수리 직전 커밋
 * `0aba566` 에서 이 자로 찍은 값 — probe481 과 같은 꼴). 지금은 **수리 후** 를 재고 둘을
 * 나란히 찍는다. 게이트(되돌림 시험 포함)는 `tools/verify724.js` 가 따로 있다.
 *
 *   [1] 카테고리 «안» — 같은 카테고리 2표본으로 Σ(합) ↔ Π(곱) 를 가른다
 *   [2] 카테고리 «간» — 서로 다른 카테고리 둘을 동시에 켜면 곱인가
 *   [3] 폭등 규모   — 전 스킬 보유에서 배수가 Σ 모델의 몇 배였나(주인이 본 «개같이 높다»)
 *   [4] 표시       — 07 스킬·26 펫 시트의 «총 보유 효과» 와 05 장비 시트가 같은 모델인가
 *
 * 주인 보강(2026-09-02 04:05)이 정한 확정 모델:
 *   총배율 = (1+Σ장비)×(1+Σ스킬)×(1+Σ코스튬)×(1+Σ펫)×(1+Σ훈련)×(1+Σ룬)×(1+Σ단련)×(1+Σ유물)
 *   ⇒ 카테고리 «안» 은 합 · 카테고리 «간» 은 곱.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* 수리 전 실측(커밋 `0aba566` · 이 자의 첫 실행) — review 표의 원본이자 «무엇이 바뀌었나» 의 근거 */
const BEFORE = {
  skill: { one: 1.023600, two: 1.047757, sum: 1.047200, v: 'Π' },
  equip: { one: 1.021712, two: 1.044860, sum: 1.044368, v: 'Π' },
  pet:   { one: 1.023600, two: 1.047757, sum: 1.047200, v: 'Π' },
  cos:   { one: 1.040000, two: 1.081600, sum: 1.080000, v: 'Π' },
  relic: { one: 1.012500, two: 1.082362, sum: 1.081500, v: 'Π' },
  rune:  { v: 'Σ' }, coll: { v: 'Σ' },
  skAllL1:   { prod: 11.180106, sum: 3.584200, ratio: 3.119275 },
  skAllL100: { prod: 7.6420e+9, sum: 42.610000, ratio: 1.7935e+8 },
  full:      { atk: 3.1693e+43, hp: 8.4886e+21, gold: 7.0994e+20, cp: 1.7114e+45 },
  disp:      { skProd: 0.177584, skSum: 0.168000, eqSum: 0.161280, eqProd: 0.170100 }
};

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };
const f = n => (Math.abs(n) >= 1e6 ? n.toExponential(4) : (+n).toFixed(6));

/* 페이지 안에서 «맨몸» 상태를 만드는 한 벌 — 자(verify724)와 같은 눈을 쓴다 */
const RESET_SRC = `() => { S.own = {}; S.coll = {}; S.avatars = {}; S.cosLv = {}; S.rune = {};
  S.eqSlot = {}; S.eqSkill = []; S.eqPet = []; S.temper = null;
  S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} }; markDirty(); }`;

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

  /* ══════════ [1] 카테고리 «안» — Σ 냐 Π 냐 ══════════ */
  console.log('[1] 카테고리 «안» 결합 — 2표본으로 Σ(합) ↔ Π(곱) 를 가른다');
  const A = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    const out = {};

    R();
    { const s1 = SKILLS[0], s2 = SKILLS[1];
      S.own[s1.id] = { l: 1 }; markDirty(); const one = bonus().atk;
      S.own[s2.id] = { l: 1 }; markDirty(); const two = bonus().atk;
      const x1 = ownVal(s1), x2 = ownVal(s2);
      out.skill = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();
    { const w = EQUIPS.filter(e => e.slot === 'weapon').slice(0, 2);
      S.own[w[0].id] = { l: 1 }; markDirty(); const one = bonus().atk;
      S.own[w[1].id] = { l: 1 }; markDirty(); const two = bonus().atk;
      const x1 = ownVal(w[0]), x2 = ownVal(w[1]);
      out.equip = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();   /* 펫은 골드 축이 순수하다 — atk 은 ×0.6 이 겹친다 */
    { const q = PETS.slice(0, 2);
      S.own[q[0].id] = { l: 1 }; markDirty(); const one = bonus().gold;
      S.own[q[1].id] = { l: 1 }; markDirty(); const two = bonus().gold;
      const x1 = ownVal(q[0]), x2 = ownVal(q[1]);
      out.pet = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();
    { S.avatars = {}; S.avatars[AVATARS[0].id] = 1; markDirty(); const one = bonus().atk;
      S.avatars[AVATARS[1].id] = 1; markDirty(); const two = bonus().atk;
      const x1 = cosOwnStep('atk', 1), x2 = cosOwnStep('atk', 2);
      out.cos = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();
    { const byEff = {};
      RELICS.forEach(r => { (byEff[r.eff] = byEff[r.eff] || []).push(r); });
      const pick = Object.keys(byEff).map(k => byEff[k]).filter(a => a.length >= 2)
        .map(a => a.slice(0, 2)).find(a => ['all', 'atk', 'gold', 'hp'].indexOf(a[0].eff) >= 0);
      const axis = pick[0].eff === 'gold' ? 'gold' : pick[0].eff === 'hp' ? 'hp' : 'atk';
      S.own[pick[0].id] = { l: 1 }; markDirty(); const one = bonus()[axis];
      S.own[pick[1].id] = { l: 1 }; markDirty(); const two = bonus()[axis];
      const x1 = relicVal(pick[0]), x2 = relicVal(pick[1]);
      out.relic = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();   /* 룬 — 203 이 이미 «축별 합산 뒤 1회 곱» 으로 만들어 둔 자리 */
    { const r = RUNES.filter(x => x.eff && x.eff.atk).slice(0, 2);
      S.rune[r[0].id] = 5; markDirty(); const one = bonus().atk;
      S.rune[r[1].id] = 5; markDirty(); const two = bonus().atk;
      const x1 = runeVal(r[0].id, 'atk'), x2 = runeVal(r[1].id, 'atk');
      out.rune = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    R();   /* 도감 — 91 규약 */
    { const sets = COLL_SETS.filter(s => s.eff && s.eff.atk).slice(0, 2);
      S.coll[sets[0].key] = 1; markDirty(); const one = bonus().atk;
      S.coll[sets[1].key] = 1; markDirty(); const two = bonus().atk;
      const x1 = sets[0].eff.atk, x2 = sets[1].eff.atk;
      out.coll = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }

    /* 코스튬 «강화» — 레벨 총합이 선형인가(증분이 같은가). 보유분은 두 표본에서 동일하다 */
    R();
    { S.avatars[AVATARS[0].id] = 1; S.avatars[AVATARS[1].id] = 1;
      markDirty(); const l0 = bonus().atk;
      S.cosLv[AVATARS[0].id] = 1; markDirty(); const l1 = bonus().atk;
      S.cosLv[AVATARS[1].id] = 1; markDirty(); const l2 = bonus().atk;
      out.coslv = { l0, l1, l2, d1: l1 - l0, d2: l2 - l1 }; }

    return out;
  }, RESET_SRC);

  const verdict = o => (Math.abs(o.two - o.sum) < Math.abs(o.two - o.prod) ? 'Σ' : 'Π');
  const show = (k, name) => {
    const o = A[k], v = verdict(o), was = BEFORE[k].v;
    console.log('     · ' + name + ' — 1개 ' + f(o.one) + ' · 2개 ' + f(o.two)
      + ' | Σ 예측 ' + f(o.sum) + ' · Π 예측 ' + f(o.prod)
      + '  ⇒ **' + v + '**  (수리 전 ' + was + (BEFORE[k].two ? ' · 2개 ' + f(BEFORE[k].two) : '') + ')');
    return v;
  };
  ok(show('skill', '스킬 보유') === 'Σ',           '1a 스킬 보유 — 카테고리 안이 합이다 (수리 전 Π = 주인 보고의 뿌리)');
  ok(show('equip', '장비 보유(무기·atk)') === 'Σ', '1b 장비 보유 — 합 (수리 전 Π)');
  ok(show('pet',   '펫 보유(gold)') === 'Σ',       '1c 펫 보유 — 합 (수리 전 Π)');
  ok(show('cos',   '코스튬 보유(계단)') === 'Σ',   '1d 코스튬 보유 — 합 (수리 전 Π = ×117 을 만들던 자리)');
  ok(show('relic', '유물') === 'Σ',                '1e 유물 — 합 (수리 전 Π)');
  ok(show('rune',  '룬') === 'Σ',                  '1f 룬 — 합(203 규약 그대로 · 수리 전에도 Σ)');
  ok(show('coll',  '도감') === 'Σ',                '1g 도감 — 합(91 규약 그대로 · 수리 전에도 Σ)');
  console.log('     · 코스튬 강화 — Lv합 0/1/2 에서 ' + f(A.coslv.l0) + ' / ' + f(A.coslv.l1) + ' / ' + f(A.coslv.l2)
    + ' | 증분 ' + f(A.coslv.d1) + ' ↔ ' + f(A.coslv.d2));
  ok(Math.abs(A.coslv.d1 - A.coslv.d2) < 1e-12,
     '1h 코스튬 강화 — 레벨 총합이 선형(증분이 같다 · 194 규약 그대로)');

  /* ══════════ [2] 카테고리 «간» — 곱인가 ══════════ */
  console.log('[2] 카테고리 «간» 결합');
  const B = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    R(); const s = SKILLS[0], r = RUNES.filter(x => x.eff && x.eff.atk)[0];
    S.own[s.id] = { l: 1 }; markDirty(); const a = bonus().atk;
    S.own = {}; S.rune = {}; S.rune[r.id] = 5; markDirty(); const b2 = bonus().atk;
    S.own[s.id] = { l: 1 }; markDirty(); const ab = bonus().atk;
    /* 코스튬 보유 ↔ 강화 — 724 가 «한 카테고리» 로 접은 자리(수리 전에는 곱이었다) */
    R();
    S.avatars[AVATARS[0].id] = 1; S.cosLv[AVATARS[0].id] = 3; markDirty();
    const col = bonus().atk, own1 = cosOwnSum('atk'), lv1 = cosLvVal('atk');
    return { a, b: b2, ab, prod: a * b2, sum: a + b2 - 1,
             col, cSum: 1 + own1 + lv1, cProd: (1 + own1) * (1 + lv1) };
  }, RESET_SRC);
  console.log('     · 스킬만 ' + f(B.a) + ' · 룬만 ' + f(B.b) + ' · 둘 다 ' + f(B.ab)
    + ' | 곱 예측 ' + f(B.prod) + ' · 합 예측 ' + f(B.sum));
  ok(Math.abs(B.ab - B.prod) < 1e-9, '2a 카테고리 «간» 은 곱이다 — 주인 모델의 이 절반은 수리 전부터 지켜지고 있었다');
  console.log('     · 코스튬 보유+강화 — 실측 ' + f(B.col) + ' | 한 카테고리(합) ' + f(B.cSum)
    + ' · 두 카테고리(곱) ' + f(B.cProd));
  ok(Math.abs(B.col - B.cSum) < 1e-12,
     '2b 코스튬은 보유·강화가 **한 카테고리** — 724 가 194·197 의 «두 번 곱» 을 접었다');

  /* ══════════ [3] 폭등 규모 ══════════ */
  console.log('[3] 규모 — 수리 전 곱 모델이 합 모델의 몇 배였나');
  const C = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    const at = l => {
      R(); SKILLS.forEach(s => { S.own[s.id] = { l }; }); markDirty();
      const got = bonus().atk;
      const sum = 1 + SKILLS.reduce((t, s) => t + ownVal(s), 0);
      return { n: SKILLS.length, got, sum };
    };
    const all = () => {
      R();
      SKILLS.forEach(s => { S.own[s.id] = { l: 100 }; });
      PETS.forEach(s => { S.own[s.id] = { l: 100 }; });
      EQUIPS.forEach(s => { S.own[s.id] = { l: 100 }; });
      RELICS.forEach(s => { S.own[s.id] = { l: 100 }; });
      AVATARS.forEach(a => { S.avatars[a.id] = 1; });
      markDirty();
      return { atk: bonus().atk, hp: bonus().hp, gold: bonus().gold, cp: cp() };
    };
    return { l1: at(1), l100: at(100), full: all() };
  }, RESET_SRC);
  console.log('     · 스킬 ' + C.l1.n + '종 Lv1   — 지금 ' + f(C.l1.got) + ' (합 모델 ' + f(C.l1.sum) + ')'
    + ' | 수리 전 곱 ' + f(BEFORE.skAllL1.prod) + ' = 합의 ×' + f(BEFORE.skAllL1.ratio));
  console.log('     · 스킬 ' + C.l100.n + '종 Lv100 — 지금 ' + f(C.l100.got) + ' (합 모델 ' + f(C.l100.sum) + ')'
    + ' | 수리 전 곱 ' + f(BEFORE.skAllL100.prod) + ' = 합의 ×' + f(BEFORE.skAllL100.ratio));
  console.log('     · 전 카테고리 만렙 — b.atk ' + f(C.full.atk) + ' · b.hp ' + f(C.full.hp)
    + ' · b.gold ' + f(C.full.gold) + ' · cp ' + f(C.full.cp)
    + '  | 수리 전 cp ' + f(BEFORE.full.cp) + ' (÷' + f(BEFORE.full.cp / C.full.cp) + ')');
  ok(Math.abs(C.l1.got - C.l1.sum) < 1e-9 && Math.abs(C.l100.got - C.l100.sum) < 1e-9,
     '3a 스킬 전 보유는 이제 정확히 합 모델이다 — Lv100 에서 ' + f(C.l100.got) + ' (수리 전 ' + f(BEFORE.skAllL100.prod) + ')');
  ok(C.full.cp < BEFORE.full.cp,
     '3b 전 카테고리 만렙 cp 가 내려갔다 — 199 통지 대상(수리 전 ' + f(BEFORE.full.cp) + ' → ' + f(C.full.cp) + ')');

  /* ══════════ [4] 표시 ══════════ */
  console.log('[4] 표시 — 07 스킬 · 26 펫 · 05 장비 시트가 같은 모델을 쓰는가');
  const D = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    R();
    SKILLS.slice(0, 3).forEach(s => { S.own[s.id] = { l: 10 }; });
    PETS.slice(0, 3).forEach(s => { S.own[s.id] = { l: 10 }; });
    EQUIPS.filter(e => e.slot === 'weapon').slice(0, 3).forEach(e => { S.own[e.id] = { l: 10 }; });
    markDirty();
    return {
      skSum: SKILLS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0),
      skProd: SKILLS.reduce((m, s) => has(s.id) ? m * (1 + ownVal(s)) : m, 1) - 1,
      ptSum: PETS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0),
      eqSum: wpnTotalOwn()
    };
  }, RESET_SRC);
  console.log('     · 07 스킬 시트 Σ = ' + f(D.skSum) + ' (수리 전 표기 Π−1 = ' + f(BEFORE.disp.skProd) + ')');
  console.log('     · 26 펫 시트  Σ = ' + f(D.ptSum));
  console.log('     · 05 장비 시트 Σ = ' + f(D.eqSum) + ' — 수리 전부터 합이었다(주인 원문 «장비들처럼»)');
  ok(D.skSum < D.skProd, '4a 스킬 시트 표기가 Σ 로 내려왔다 — 05 장비 시트와 같은 모델');

  ok(errs.length === 0, '9z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  await b.close();
  console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
