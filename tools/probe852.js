#!/usr/bin/env node
'use strict';
/* ==========================================================================
   probe852 — 「보유 축(`ownVal`)은 종마다 곱인가, 카테고리 안 합인가」 재현기
                                                              (작업 852, 2026-09-03)
   --------------------------------------------------------------------------
     node tools/probe852.js
   ⚑ 338 규칙 — **처방 전에 재현.** 852 는 837 과 같은 종의 «말만 고치는» 작업이지만,
     고쳐 적을 말 안에 **수치**(종수 · 배수 · 기울기 효과)가 들어간다. 손으로 계산해
     적으면 그 순간 또 하나의 사본이고 다음 모델 변경에서 똑같이 썩는다 — 852 가
     고치는 병이 정확히 그것이다. 그래서 **제품 함수에게 직접 묻는다**
     (`bonus()`·`ownVal`·`ownValAt`·`lvMul`·`gMul`·`gWear`).

   재는 것
     [1] 결합 — 보유 축의 카테고리 «안» 이 Σ(합)인가 Π(곱)인가 (스킬·장비·펫 3표본)
     [2] 종수 — 낡은 주석이 적은 «장비 36 + 스킬 27 + 펫 27» 이 아직 맞는가
     [3] 전 종 보유(Lv 0) — 카테고리 배수. 옛 Π 모델이 같은 상태에서 냈을 값과 나란히
     [4] 기울기 — `lvMul` 기울기를 착용 축(`LV_STEP`)까지 내리면 배수가 얼마가 되는가.
         ⚑ **식을 베끼지 않는다** — `lvMul(l) = 1 + l·k` 라 «기울기 k′ · 레벨 L» 은
           «기울기 k · 레벨 L·k′/k» 와 **항등**이므로 제품의 `ownValAt(it, l)` 을 그대로 부른다.
     [5] 계단 — 보유 축에 착용 계단(`gWear`)을 태우면 Σ 가 몇 배로 부푸는가
         (낡은 주석이 «(1+계단)^N 으로 지수가 두 번» 이라고 적던 자리의 «지금 값»)
   ⚠ 판정 없는 자가 아니다 — 결합이 Σ 가 아니면 빨갛다(724 가 뒤집히면 여기가 먼저 짖는다).
   ========================================================================== */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };
const f  = n => (Math.abs(n) >= 1e6 ? (+n).toExponential(4) : (+n).toFixed(4));
const f2 = n => (Math.abs(n) >= 1e6 ? (+n).toExponential(2) : (+n).toFixed(2));

/* 맨몸 상태 한 벌 — probe724·probe837 과 같은 눈 */
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
  await p.waitForFunction(() => typeof bonus === 'function' && typeof ownVal === 'function'
    && typeof SKILLS !== 'undefined' && typeof EQUIPS !== 'undefined' && typeof PETS !== 'undefined');
  await p.waitForTimeout(500);

  const D = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    const out = {};

    /* ── [1] 결합 — 같은 카테고리 2표본 ── */
    const pairOf = (list, axis, mut) => {
      R();
      const a = list[0], c = list[1];
      mut(a); markDirty(); const one = bonus()[axis];
      mut(c); markDirty(); const two = bonus()[axis];
      const x1 = ownVal(a), x2 = ownVal(c);
      return { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) };
    };
    const own1 = it => { S.own[it.id] = { l: 1 }; };
    out.pair = {
      skill: pairOf(SKILLS, 'atk', own1),
      equip: pairOf(EQUIPS.filter(e => e.slot === 'weapon'), 'atk', own1),
      pet:   pairOf(PETS, 'gold', own1)        /* 펫 atk 은 ×0.6 이 겹친다 — 골드 축이 순수하다 */
    };

    /* ── [2] 종수 — 낡은 주석의 «36 + 27 + 27» ── */
    out.n = { equip: EQUIPS.length, skill: SKILLS.length, pet: PETS.length,
              weapon: EQUIPS.filter(e => e.slot === 'weapon').length };
    out.n.all = out.n.equip + out.n.skill + out.n.pet;

    /* ── [3] 전 종 보유 · Lv 0 — 카테고리 배수(지금) ↔ 옛 Π 모델 ── */
    const allOf = (list, axis, lv) => {
      R();
      list.forEach(it => { S.own[it.id] = { l: lv }; }); markDirty();
      const got = bonus()[axis];
      let s = 0, q = 1;
      list.forEach(it => { const v = ownValAt(it, lv); s += v; q *= (1 + v); });
      return { got, sum: 1 + s, prod: q };
    };
    /* 장비는 부위마다 축이 갈린다 — 무기(atk)만 잰다(축이 하나인 부위) */
    out.all0 = {
      skill: allOf(SKILLS, 'atk', 0),
      equipW: allOf(EQUIPS.filter(e => e.slot === 'weapon'), 'atk', 0),
      pet:   allOf(PETS, 'gold', 0)
    };

    /* ── [4] 기울기 — 보유 축 기울기를 LV_STEP 까지 내리면 ── */
    /* lvMul(l) = 1 + l·k 이므로 k 는 제품에서 뽑는다(리터럴을 베끼지 않는다) */
    const kOwn = lvMul(1) - lvMul(0);
    const kWear = lvWear(1) - lvWear(0);
    const L = 100;
    const sumAt = (list, lv) => list.reduce((s, it) => s + ownValAt(it, lv), 0);
    const eqL = L * kWear / kOwn;                  /* 항등 — 기울기 kWear·Lv L ≡ 기울기 kOwn·Lv eqL */
    out.slope = {
      kOwn, kWear, L,
      skillNow:  1 + sumAt(SKILLS, L),
      skillLow:  1 + sumAt(SKILLS, eqL),
      /* 같은 상태를 옛 Π 모델로 읽었을 때 — «지수가 통째로 준다» 던 그 자리 */
      skillNowProd: SKILLS.reduce((q, s) => q * (1 + ownValAt(s, L)), 1),
      skillLowProd: SKILLS.reduce((q, s) => q * (1 + ownValAt(s, eqL)), 1)
    };

    /* ── [5] 계단 — 보유 축에 gWear 를 태우면 ── */
    /* ownValAt = 0.02·gMul(g)·lvMul(l)·eqv → gWear 판은 각 항에 gWear/gMul 을 곱한 것과 같다 */
    const wearScale = list => list.reduce((s, it) => s + ownValAt(it, 0) * gWear(it.g) / gMul(it.g), 0);
    out.step = {
      skillSumMul:  sumAt(SKILLS, 0),
      skillSumWear: wearScale(SKILLS),
      equipSumMul:  sumAt(EQUIPS, 0),
      equipSumWear: wearScale(EQUIPS),
      gradeMul:  GRADE.map(g => g.mul),
      gradeWear: GRADE.map(g => g.wear)
    };

    R();
    return out;
  }, RESET_SRC);

  /* ══════════ 출력 ══════════ */
  console.log('[1] 보유 축의 카테고리 «안» 결합 — 2표본');
  ['skill', 'equip', 'pet'].forEach(k => {
    const q = D.pair[k];
    const dS = Math.abs(q.two - q.sum), dP = Math.abs(q.two - q.prod);
    console.log('    ' + k.padEnd(6) + ' 실측 ' + f(q.two) + ' | Σ 기대 ' + f(q.sum) + ' · Π 기대 ' + f(q.prod));
    ok(dS < dP, k + ' 보유 축은 **합(Σ)** 이다(724 모델)', 'Σ 잔차 ' + f(dS) + ' < Π 잔차 ' + f(dP));
  });

  console.log('[2] 종수 — 낡은 주석의 «장비 36 + 스킬 27 + 펫 27»(= 90)');
  console.log('    장비 ' + D.n.equip + '(그중 무기 ' + D.n.weapon + ') · 스킬 ' + D.n.skill
    + ' · 펫 ' + D.n.pet + '  ⇒ 합 ' + D.n.all);
  ok(D.n.all > 0, '종수를 제품에서 읽었다');

  console.log('[3] 전 종 보유 · Lv 0 — 카테고리 배수');
  [['skill', '스킬(atk)'], ['equipW', '장비 무기(atk)'], ['pet', '펫(gold)']].forEach(([k, lab]) => {
    const q = D.all0[k];
    console.log('    ' + lab.padEnd(16) + ' ×' + f(q.got) + '   (옛 Π 모델이면 ×' + f(q.prod) + ')');
    ok(Math.abs(q.got - q.sum) < 1e-9, lab + ' = 1 + Σ (한 번만 곱한다)',
      '실측 ' + f(q.got) + ' · Σ ' + f(q.sum));
  });

  console.log('[4] 기울기 — 보유 축 기울기 ' + D.slope.kOwn.toFixed(3) + ' → 착용 축 '
    + D.slope.kWear.toFixed(3) + ' (Lv ' + D.slope.L + ' · 스킬 전 종)');
  console.log('    지금(Σ) : ×' + f2(D.slope.skillNow) + ' → ×' + f2(D.slope.skillLow)
    + '   = ' + (D.slope.skillLow / D.slope.skillNow * 100).toFixed(1) + '%');
  console.log('    옛 Π    : ×' + f2(D.slope.skillNowProd) + ' → ×' + f2(D.slope.skillLowProd)
    + '   = ' + (D.slope.skillLowProd / D.slope.skillNowProd).toExponential(2));
  ok(D.slope.skillLow / D.slope.skillNow > D.slope.skillLowProd / D.slope.skillNowProd,
    'Σ 모델에서 기울기 인하는 Π 모델보다 훨씬 덜 깎는다(지수 → 선형)');

  console.log('[5] 계단 — 보유 축에 착용 계단(gWear)을 태우면');
  console.log('    스킬 Σ ' + f(D.step.skillSumMul) + ' → ' + f(D.step.skillSumWear)
    + '  (×' + f2(D.step.skillSumWear / D.step.skillSumMul) + ')');
  console.log('    장비 Σ ' + f(D.step.equipSumMul) + ' → ' + f(D.step.equipSumWear)
    + '  (×' + f2(D.step.equipSumWear / D.step.equipSumMul) + ')');
  console.log('    GRADE.mul  ' + D.step.gradeMul.join(' · '));
  console.log('    GRADE.wear ' + D.step.gradeWear.join(' · '));
  ok(D.step.skillSumWear > D.step.skillSumMul, '계단을 태우면 Σ 가 커진다(그래서 보유는 gMul 이다)');

  console.log('[6] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\n── 주석에 적을 값(제품이 답한 것) ──');
  console.log('  종수            : 장비 ' + D.n.equip + ' + 스킬 ' + D.n.skill + ' + 펫 ' + D.n.pet
    + ' = ' + D.n.all + '   (무기 ' + D.n.weapon + ')');
  console.log('  전 종 보유 Lv 0 : 스킬 ×' + D.all0.skill.got.toFixed(2)
    + ' · 무기 ×' + D.all0.equipW.got.toFixed(2) + ' · 펫(골드) ×' + D.all0.pet.got.toFixed(2));
  console.log('  Lv 100 스킬 전 종: Σ ×' + D.slope.skillNow.toFixed(2)
    + '  (옛 Π 모델이면 ×' + f2(D.slope.skillNowProd) + ')');
  console.log('  기울기 ' + D.slope.kOwn.toFixed(3) + ' → ' + D.slope.kWear.toFixed(3)
    + ' : Σ ×' + D.slope.skillNow.toFixed(2) + ' → ×' + D.slope.skillLow.toFixed(2)
    + '  (옛 Π 는 ×' + f2(D.slope.skillNowProd) + ' → ×' + D.slope.skillLowProd.toFixed(2) + ')');
  console.log('  옛 Π 모델이면   : 스킬 ×' + f2(D.all0.skill.prod)
    + ' · 무기 ×' + f2(D.all0.equipW.prod) + ' · 펫(골드) ×' + f2(D.all0.pet.prod));
  console.log('  계단(gWear) 태우면 스킬 Σ ×' + (D.step.skillSumWear / D.step.skillSumMul).toFixed(1)
    + ' · 장비 Σ ×' + (D.step.equipSumWear / D.step.equipSumMul).toFixed(1));

  await b.close();
  console.log('\nPROBE852 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
