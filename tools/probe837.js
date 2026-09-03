#!/usr/bin/env node
'use strict';
/* ==========================================================================
   probe837 — 「코스튬 «보유 효과» 축은 곱인가 합인가」 재현기   (작업 837, 2026-09-03)
   --------------------------------------------------------------------------
     node tools/probe837.js
   ⚑ 338 규칙 — **처방 전에 재현.** 837 은 «말만 고치는» 작업이지만, 고쳐 적을 말 안에
     수치(«50종 전부 = ×N»)가 들어간다. 그 수치를 **손으로 계산해 적으면 그 순간 또 하나의
     사본**이고 다음 모델 변경에서 똑같이 썩는다(835·837 이 잡은 바로 그 병). 그래서
     **제품 함수에게 직접 묻는다** — `cosOwnSum`·`cosLvVal`·`bonus()` 가 답한 값만 주석에 적는다.

   재는 것
     [1] 결합 — 코스튬 «안» 이 Σ(합)인가 Π(곱)인가 (2표본 · 724 모델의 확인)
     [2] 50종 전부 보유(Lv 0) — 축별 카테고리 배수. 옛 주석의 «×117 / ×113» 자리
     [3] 50종 전부 만렙(Lv 500) — 보유 + 강화가 «한 장부» 인지, 그때 배수는 얼마인지
     [4] 계단 — 10칸마다 한 계단(`COS_STEP`)이 실제로 올라가는가(주석의 «+4%→+16%» 자리)
     [5] 옛 모델(Π)이 같은 상태에서 냈을 값 — «무엇이 바뀌었나» 의 대조값
   ⚠ 판정 없는 자가 아니다 — 결합이 Σ 가 아니면 빨갛다(724 가 뒤집히면 여기가 먼저 짖는다).
   ========================================================================== */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };
const f = n => (+n).toFixed(4);

/* 맨몸 상태 한 벌 — probe724 와 같은 눈 */
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
  await p.waitForFunction(() => typeof bonus === 'function' && typeof cosOwnSum === 'function'
    && typeof AVATARS !== 'undefined');
  await p.waitForTimeout(500);

  const D = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    const K = ['atk', 'hp', 'gold'];
    const out = { maxlv: COS_MAXLV, every: COS_STEP_EVERY, step: COS_STEP.slice(),
                  own: { atk: COS_OWN.atk, hp: COS_OWN.hp, gold: COS_OWN.gold },
                  lvk: { atk: COS_LV.atk, hp: COS_LV.hp, gold: COS_LV.gold },
                  n: AVATARS.length };

    /* [1] 2표본 — 코스튬 «안» 결합 */
    R();
    S.avatars[AVATARS[0].id] = 1; markDirty(); const one = bonus().atk;
    S.avatars[AVATARS[1].id] = 1; markDirty(); const two = bonus().atk;
    const x1 = cosOwnStep('atk', 1), x2 = cosOwnStep('atk', 2);
    out.pair = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) };

    /* [2] 50종 전부 보유 · Lv 0 — 카테고리 배수(= 1 + cosOwnSum) */
    R();
    AVATARS.forEach(a => { S.avatars[a.id] = 1; }); markDirty();
    out.all0 = {}; K.forEach(k => { out.all0[k] = 1 + cosOwnSum(k); });
    out.all0n = cosOwnCount();
    out.all0sum = {}; K.forEach(k => { out.all0sum[k] = cosOwnSum(k); });

    /* [5] 옛 모델(Π) 이 같은 상태에서 냈을 값 */
    out.oldProd = {};
    K.forEach(k => { let q = 1; for (let i = 1; i <= AVATARS.length; i++) q *= (1 + cosOwnStep(k, i)); out.oldProd[k] = q; });

    /* [3] 50종 전부 만렙 — 보유 + 강화가 한 장부인가 */
    AVATARS.forEach(a => { S.cosLv[a.id] = COS_MAXLV; }); markDirty();
    out.lvsum = cosLvSum();
    out.allMax = {}; out.allMaxParts = {};
    K.forEach(k => { out.allMax[k] = 1 + cosOwnSum(k) + cosLvVal(k);
                     out.allMaxParts[k] = { own: cosOwnSum(k), lv: cosLvVal(k) }; });

    /* [4] 계단 — n 번째 칸이 받는 축 배수 */
    out.rung = [];
    for (let i = 0; i < COS_STEP.length; i++) out.rung.push(cosOwnStep('atk', i * COS_STEP_EVERY + 1));

    R();
    return out;
  }, RESET_SRC);

  console.log('[1] 코스튬 «안» 결합 — 2표본');
  const dSum = Math.abs(D.pair.two - D.pair.sum), dProd = Math.abs(D.pair.two - D.pair.prod);
  console.log('    표본1 ' + f(D.pair.one) + ' · 표본2 ' + f(D.pair.two)
    + ' | Σ 기대 ' + f(D.pair.sum) + ' · Π 기대 ' + f(D.pair.prod));
  ok(dSum < dProd, '보유 축은 **합(Σ)** 이다(724 모델)', 'Σ 잔차 ' + f(dSum) + ' < Π 잔차 ' + f(dProd));

  console.log('[2] ' + D.n + '종 전부 보유 · Lv 0 — 카테고리 배수');
  ok(D.all0n === D.n, '보유 수 ' + D.all0n + '/' + D.n);
  ['atk', 'hp', 'gold'].forEach(k => console.log('    ' + k + ' : Σ ' + f(D.all0sum[k])
    + ' ⇒ ×' + f(D.all0[k]) + '   (옛 Π 모델이면 ×' + f(D.oldProd[k]) + ')'));
  ok(D.all0.atk > 1, '보유만으로 배수 > 1');

  console.log('[3] ' + D.n + '종 전부 Lv ' + D.maxlv + ' — 보유 + 강화가 한 장부');
  console.log('    레벨 총합 ' + D.lvsum);
  ['atk', 'hp', 'gold'].forEach(k => console.log('    ' + k + ' : 보유 Σ ' + f(D.allMaxParts[k].own)
    + ' + 강화 ' + f(D.allMaxParts[k].lv) + ' ⇒ ×' + f(D.allMax[k])));
  ok(Math.abs(D.allMax.atk - (1 + D.allMaxParts.atk.own + D.allMaxParts.atk.lv)) < 1e-9,
    '두 축이 더해진 뒤 한 번만 곱한다');

  console.log('[4] 계단 — ' + D.every + '칸마다 한 칸');
  console.log('    atk 계단 : ' + D.rung.map(v => (v * 100).toFixed(1) + '%').join(' → '));
  ok(D.rung.length === D.step.length && D.rung.every((v, i) => Math.abs(v - D.own.atk * D.step[i]) < 1e-12),
    '계단 배수 = COS_OWN × COS_STEP');

  console.log('[5] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\n── 주석에 적을 값(제품이 답한 것) ──');
  console.log('  ' + D.n + '종 보유(Lv 0)  : 공격 ×' + D.all0.atk.toFixed(2)
    + ' · 체력 ×' + D.all0.hp.toFixed(2) + ' · 골드 ×' + D.all0.gold.toFixed(2));
  console.log('  ' + D.n + '종 만렙(Lv ' + D.maxlv + ') : 공격 ×' + D.allMax.atk.toFixed(2)
    + ' · 체력 ×' + D.allMax.hp.toFixed(2) + ' · 골드 ×' + D.allMax.gold.toFixed(2));
  console.log('  옛 Π 모델이었다면    : 공격 ×' + D.oldProd.atk.toFixed(1)
    + ' · 체력 ×' + D.oldProd.hp.toFixed(1) + ' · 골드 ×' + D.oldProd.gold.toFixed(1));

  await b.close();
  console.log('\nPROBE837 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
