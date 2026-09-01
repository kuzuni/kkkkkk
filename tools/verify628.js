#!/usr/bin/env node
/* 628 검증 — 훈련 강화가 말하는 증가분 = **실제 스탯 증분** (2026-09-01 · 707 에서 660 이관)
 *
 *   node tools/verify628.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚑ 707 (2026-09-01) — **이 자는 660 이 지나간 뒤 통째로 즉사해 있었다.**
 *   `open()` 이 `typeof trDeltaTxt === 'function'` 을 기다렸는데 660 이 그 함수를
 *   **선언째 지웠으므로**(index.html «660 — `trDeltaTxt()`·`trHoldGainTxt()` 는 선언째 사라졌다»)
 *   술어가 영원히 안 참이 되어 `waitForFunction` 30s 타임아웃으로 한 항도 못 찍고 죽었다.
 *   재현 `tools/probe707.js` 가 갈래를 갈랐다 — **ⓐ 자**(멎는 항은 `trDeltaTxt` 하나) ·
 *   **ⓑ 제품은 기각**(`openTrain()` 로 `#trw` 가 열리고 카드 3장이 정상으로 그려진다).
 *
 * ⚑ **자리를 비우지 않았다(333 처방).** 660 은 «훈련 델타 플로터» 라는 **말하는 입**을 폐지했을
 *   뿐, 628 이 세운 **축**(「말하는 수는 알약이 쓰는 자로 잰다」)과 **시점 축**(「정산은 방금 오른
 *   양이다」)은 제품에 그대로 살아 있다. `probe707` 실측 —
 *     · 축   : `trainCardData().gain` 이 아직 `* mul`(= `TRAIN_NOW / u.val`)을 곱한다.
 *              9표본 전부 실제 증분과 일치하고, 옛 «기저» 축과는 **최대 27.7%** 벌어진다.
 *     · 시점 : `trHold.now0` 이 첫 발을 **산 뒤** 값이다(5158.354 ↔ 첫 발 전 5132.805).
 *   ⇒ 그래서 **묻는 대상만** 옮겼다: «플로터가 뭐라고 썼나» → «카드가 말하는 수(`gain`)»,
 *      «정산 문구» → «`now0` 이 어느 자리인가». 표본·상태·허용 오차는 한 칸도 안 넓혔다.
 *
 * ⚑ 660 자신의 결정도 이 자가 같이 지킨다(그러지 않으면 «660 이 통째로 사라져도 초록» 이다) —
 *   [D3] 음성(델타 플로터 0장) · [D4] 양성(아이콘 버스트가 그 자리를 대신한다) · [E2] 선언 0건.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 계약 두 줄 —
 *   ① **카드가 말하는 증가분**은 그 구매로 실제로 오르는 양이다.
 *      «실제로» 의 자는 알약(`.cv`)이 쓰는 자와 **같다** — `TRAIN_NOW` = `stat.dmg/maxHp/regen`
 *      (훈련 단계·장비·펫·축복·도감이 다 곱해진 «지금 내 수치»).
 *   ② **홀드 정산**의 기준(`trHold.now0`)은 그 홀드의 **반복분이 시작하는 자리**다
 *      — 첫 발을 산 «뒤». 앞으로 되돌리면 정산이 첫 발 몫을 삼킨다.
 *
 * 뿌리(재현 `tools/probe628.js`, 수리 전):
 *   · 486 이 알약을 «지금 최종값» 으로 옮길 때 증가분 줄(`trainCardData().gain`)은 옛 축
 *     (`u.val()` **기저**)에 남았다 — 한 카드 안에서 두 수가 서로 다른 자를 썼다.
 *     단계 3 표본에서 «+20» ↔ 실제 `stat.dmg` 증분 **25.549**
 *     (atk +21.7% · hp +19.3% · regen +16.7% — 배수가 클수록 벌어진다).
 *   · 그리고 **시점**도 틀린 자리가 하나 더 있었다 — 정산의 기준이 첫 발 «앞» 이라
 *     «방금 얻은 양» 이 아니라 첫 발까지 삼킨 양을 말했다.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [전제] 배수가 1 이 아닌 표본인가 — 배수가 1 이면 이 계약은 아무것도 안 묻는다
 *   [A] 카드가 말하는 수 = 실제 최종값 증분. 3 스탯 × 3 배수탭 × 상태 4벌
 *       (Lv 0·200·950·1500 = 단계 1·3·7·9). «실제» 는 페이지 안에서 정말 사서 전·후를 뺀 값
 *   [B] 옛 축 방어 — 배수 ≠ 1 인 칸에서 «기저 증분» 과 **다르다**(628 이 사라지면 빨강).
 *       배수 = 1 인 칸은 [B*] 로 «같은 것이 정상» 을 양성으로 묻는다(조용한 건너뜀 금지)
 *   [C] 화면 쪽 증거 — x30 은 알약 글자가 실제로 움직이고(C1),
 *       안 움직인 칸은 전부 알약 해상도(유효숫자 3자리) 아래였다(C2)
 *   [D] 홀드 — 시점 축(D1·D2) + **660 이관**: 델타 플로터 0장(D3) · 아이콘 버스트가 대신(D4)
 *       · 1회 누름에는 정산이 없다(D5, 64 규약)
 *   [E] 안 건드린 규약 — 상한 카드 침묵(58·486) · 660 선언 0건 · 두 호출부가 숫자를 안 넘긴다
 *       · 배수 표 두 벌 금지(402) · 레벨·비용·진행바 불변
 *   [R] 되돌림 시험 — 축·시점·660 을 각각 되돌린 사본에서 **빨개진다**
 *   [I] 콘솔·페이지 에러 0
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const eq = (m, got, want) => ok(got === want, m, 'got ' + JSON.stringify(got) + ' · want ' + JSON.stringify(want));
const sec = t => console.log('\n' + t);
const n3 = v => (v == null ? 'n/a' : (+v).toFixed(3));

const KEYS = ['atk', 'hp', 'regen'];
const QTYS = [1, 10, 30];
/* 배수 상태 4벌.
   ⚠⚠ **단계는 세이브로 못 정한다** — 517 의 이관(`trainStageFor`)이 `load()` 에서 단계를
     **레벨에서 다시 계산해** 덮는다. `{trainStage: 5, lv: 40}` 을 넣어도 실제로는 단계 1 이다
     (실측: 세이브 3/5/12 → 실제 1/1/3). 그러므로 상태는 **레벨로만** 고른다.
     스탯당 상한 누적합은 100/200/300/400/600/800/1000/1300/1600/1900(517) —
     아래 레벨은 각 구간의 «상한 아래»(room > 30)를 골라 x30 까지 실제로 사지게 한 값이다.
   ⚠ 단계 1 에서는 `mulRegen()` 이 정확히 1 이라 regen 은 «기저 = 최종» 이다 — 결함이 **보이지
     않는** 상태다. [B] 를 그 자리에 그냥 걸면 영원히 빨갛고, 빼면 조용히 안 묻는다.
   ⇒ 배수가 1 인 칸은 «두 축이 같은 것이 정상» 을 **양성으로** 묻고(아래 [B*]),
      배수가 1 이 아닌 칸에서만 «갈린다» 를 묻는다. 전제 절이 «스탯마다 배수 ≠ 1 인 상태가
      적어도 하나 있다» 를 못박아 두 갈래가 다 살아 있게 한다. */
const STATES = [
  { name: 'Lv 0(단계 1 — regen 배수 1)', lv: 0 },
  { name: 'Lv 200(단계 3)',              lv: 200 },
  { name: 'Lv 950(단계 7)',              lv: 950 },
  { name: 'Lv 1500(단계 9)',             lv: 1500 }
];

/* ⚠ `trainStage` 는 넣어도 517 이관이 덮는다(위 STATES 머리말) — 실제 축은 `lv` 다. */
const save = (stage, lv) => ({ gold: 1e300, dia: 1e9, best: 60, a105: 1, buyQty: 1,
  autoBuy: false, trainStage: stage, lv: { atk: lv, hp: lv, regen: lv } });

async function open(browser, file, sv) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  if (sv) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(sv)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  /* ⚑ 707 — 술어는 **이 자가 실제로 부르는 것**만 기다린다. 종전에는 `trDeltaTxt` 를 기다렸는데
     660 이 그것을 선언째 지워 30s 타임아웃으로 자가 통째로 즉사했다(재현 `probe707` [1-c]).
     ⚠ 여기에 «있으면 좋은» 이름을 더 얹지 마라 — 술어에 든 이름 하나가 폐지되면
       자는 항을 하나도 못 찍고 죽는다(빨간 것보다 나쁘다: 아무것도 안 묻는데 조용하다). */
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function'
    && typeof trainBuyInfo === 'function' && typeof TRAIN_NOW !== 'undefined');
  await page.evaluate(() => { openTrain(); });
  await page.waitForTimeout(220);
  return { ctx, page, errs };
}

/* 한 상태에서 3 스탯 × 3 배수탭을 재는 공용 측정 — 페이지 안에서 «실제로 사서» 전·후를 잰다.
   ⚠ 기대값을 제품 식으로 다시 적지 않는다(그러면 게이트가 제품을 베끼는 꼴이라 아무것도 안 묻는다).
   ⚑ 707 — «말하는 수» 의 출처가 `trDeltaTxt(card)`(폐지)에서 **카드 데이터 `gain`** 으로 바뀌었다.
     `gain` 은 628 이 고친 바로 그 줄이 만드는 값이고(`* mul`), 486 이 «화면에서는 사라져도
     데이터로는 남는다» 고 적어 둔 그 칸이다. **구매 «전» 에 잡는다** — 뒤에 잡으면 «다음에
     오를 양» 이 되어 628 이 잡은 시점 결함을 게이트가 스스로 재현하게 된다(옛 [E2] 의 뜻). */
const MEASURE = (cfg) => {
  const rows = [];
  for (const q of cfg.QTYS) {
    for (const k of cfg.KEYS) {
      S.buyQty = q; S.gold = 1e300; markDirty(); renderTrain();
      const card = document.querySelector('#trCards [data-tr="' + k + '"]');
      const bi = trainBuyInfo(k);
      const txt = (trainCardData().find(c => c.k === k) || {}).gain;   /* 구매 «전» — 카드가 말하는 양 */
      const cvBefore = card.querySelector('.cv i').textContent;
      const baseBefore = U[k].val(lv(k)), nowBefore = TRAIN_NOW[k]();
      const bought = trainBuy(k);
      renderTrain();
      const nowAfter = TRAIN_NOW[k]();
      const cvAfter = document.querySelector('#trCards [data-tr="' + k + '"] .cv i').textContent;
      const d = nowAfter - nowBefore;
      rows.push({
        k, q, n: bi.n, bought, txt, cvBefore, cvAfter, stage: trainStage(), cap: trainCap(), nowBefore,
        realD: d, baseD: U[k].val(lv(k)) - baseBefore, mul: nowBefore / baseBefore,
        want: '+' + fmtB(d),
        /* `fmtG` 는 floor 라 «전·후를 빼서» 잰 값은 부동소수 누적으로 한 칸 내려앉을 수 있다.
           제품 쪽은 곱셈 한 번이라 정확하다 — 그 한 칸만 허용한다(무르게 푸는 것이 아니다:
           [B] 가 기저 축과의 16~22% 차이를 같은 표본에서 계속 막는다). */
        wantEps: '+' + fmtB(d * (1 + 1e-9)),
        baseWant: '+' + fmtB(U[k].val(lv(k)) - baseBefore)
      });
    }
  }
  return rows;
};

/* 홀드 한 판을 굴리며 «연출 두 종» 을 누적으로 센다 — 660 이관분([D3][D4])의 공용 자.
   ⚠ 버스트(`.fx-cic`)는 수명이 짧아 «끝난 뒤 세면» 이미 지워져 있다. 붙는 순간에 도장을
     찍어 누적으로 센다(666·488 이 쓴 방법 · `verify93` 694 회차와 같은 꼴). */
const HOLD = () => {
  const stamp = (set) => {
    for (const el of document.querySelectorAll('.fx-cic')) {
      if (el.__v628 === undefined) el.__v628 = (window.__v628n = (window.__v628n || 0) + 1);
      set.add(el.__v628);
    }
  };
  S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
  for (const L of ['fxl', 'fxlc']) { const e = document.getElementById(L); if (e) e.innerHTML = ''; }
  const card = document.querySelector('#trCards [data-tr="atk"]');
  const before = TRAIN_NOW.atk();                     /* 첫 발을 사기 **전** */
  trHoldStart('atk', card);
  const afterFirst = TRAIN_NOW.atk();                 /* 첫 발을 산 **뒤** */
  const now0 = trHold ? trHold.now0 : null;
  if (trHold) clearTimeout(trHold.timer);
  const runSet = new Set(); let delta = 0;
  for (let i = 0; i < 5; i++) {
    if (!trHold) break;
    clearTimeout(trHold.timer);
    trHoldTick();
    stamp(runSet);
    delta += document.querySelectorAll('.fx-delta, .fx-plus').length;
  }
  if (trHold) clearTimeout(trHold.timer);
  const n = trHold ? trHold.n : 0;
  const end = TRAIN_NOW.atk();
  /* 정산 한 장은 `trHoldStop` 이 쏜다 — **그 전에 도장을 다 찍어** 두면 뒤에 새로 생긴 것만
     정산 몫이다(첫 발·반복분의 버스트와 안 섞인다). */
  stamp(runSet);
  const stopSet = new Set(runSet);
  trHoldStop(false);
  stamp(stopSet);
  delta += document.querySelectorAll('.fx-delta, .fx-plus').length;
  return { before, afterFirst, now0, n, end, delta,
           runBurst: runSet.size, stopBurst: stopSet.size - runSet.size };
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let allErrs = [];

  /* ══════════════════ [전제] ══════════════════ */
  sec('[전제] 배수가 1 이 아닌 표본인가 — 1 이면 이 계약은 아무것도 안 묻는다');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(1, 200));
    const A = await page.evaluate((keys) => {
      const o = {};
      for (const k of keys) o[k] = TRAIN_NOW[k]() / U[k].val(lv(k));
      return o;
    }, KEYS);
    for (const k of KEYS)
      ok(Math.abs(A[k] - 1) > 1e-9, '  ' + k + ' 배수 ×' + n3(A[k]) + ' ≠ 1', n3(A[k]));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [A][B][C] 카드가 말하는 수 ══════════════════ */
  const mulSeen = { atk: false, hp: false, regen: false };
  for (const st of STATES) {
    sec('[A][B][C] 카드가 말하는 증가분 — ' + st.name);
    const { ctx, page, errs } = await open(browser, SRC, save(1, st.lv));
    const rows = await page.evaluate(MEASURE, { KEYS, QTYS });
    console.log('    (실제 단계 ' + rows[0].stage + ' · 스탯당 상한 ' + rows[0].cap + ')');
    ok(rows.every(r => r.bought), '  [A0] 아홉 표본 모두 실제로 구매됐다', rows.filter(r => !r.bought).length + '건 실패');
    for (const r of rows) {
      const tag = '  ' + r.k + ' x' + r.q + '(n=' + r.n + ')';
      ok(r.txt === r.want || r.txt === r.wantEps,
         '[A]' + tag + ' 말하는 수 = 실제 최종값 증분', r.txt + ' ≟ ' + r.want + ' (배수 ×' + n3(r.mul) + ')');
      if (Math.abs(r.mul - 1) > 1e-9) {
        mulSeen[r.k] = true;
        ok(r.txt !== r.baseWant,
           '[B]' + tag + ' 옛 «기저 증분» 축(«' + r.baseWant + '»)이 아니다',
           '기저 ' + n3(r.baseD) + ' vs 최종 ' + n3(r.realD));
      } else {
        /* 배수 1 — 두 축이 같은 것이 **정상**이다. 조용히 건너뛰지 않고 양성으로 묻는다. */
        ok(r.txt === r.baseWant,
           '[B*]' + tag + ' 배수 1 이라 두 축이 같다(정상)', r.txt + ' ≟ ' + r.baseWant);
      }
    }
    /* [C] — 화면 쪽 증거: 알약이 «말한 만큼» 실제로 움직인다.
       ⚠ 알약은 유효숫자 3자리(«32.4A»)라 **해상도가 있다** — 고레벨에서 x1 은 값의 0.1% 라
         글자가 안 움직이는 것이 정상이다(Lv 950 atk: Δ34 / 32,400). 그래서
         ⓐ 눈에 보일 만큼 큰 x30 은 **반드시 움직인다** 를 묻고,
         ⓑ 안 움직인 칸은 «해상도 아래였다» 를 **양성으로** 묻는다(조용히 건너뛰지 않는다). */
    const big = rows.filter(r => r.q === 30);
    ok(big.every(r => r.cvBefore !== r.cvAfter),
       '  [C1] x30 은 알약 글자가 실제로 움직인다 — 말하는 수가 가리키는 그 자리다',
       big.filter(r => r.cvBefore === r.cvAfter).map(r => r.k + ' "' + r.cvBefore + '"(Δ' + n3(r.realD) + ')').join(' · ') || '전부 이동');
    const still = rows.filter(r => r.cvBefore === r.cvAfter);
    ok(still.every(r => r.realD / Math.abs(r.nowBefore) < 0.005),
       '  [C2] 안 움직인 칸은 전부 알약 해상도(유효숫자 3자리) 아래였다',
       still.map(r => r.k + 'x' + r.q + ' Δ' + n3(r.realD) + '/' + n3(r.nowBefore)
         + '=' + (r.realD / Math.abs(r.nowBefore) * 100).toFixed(3) + '%').join(' · ') || '해당 없음');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  /* 두 갈래가 다 살아 있는가 — 스탯마다 «배수 ≠ 1» 인 상태를 적어도 하나는 봤어야 한다.
     안 그러면 [B] 가 한 번도 안 걸린 채 [B*] 만 초록이라 게이트가 조용히 아무것도 안 묻는다. */
  for (const k of KEYS)
    ok(mulSeen[k], '  [B전제] ' + k + ' 은 배수 ≠ 1 인 상태에서 «갈린다» 를 실제로 물었다');

  /* ══════════════════ [D] 홀드 — 시점 축 + 660 이관 ══════════════════ */
  sec('[D] 홀드 — 정산 기준 시점(628 ②) · 연출은 660 이 갈아 끼운 것');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(1, 200));
    const D = await page.evaluate(HOLD);
    console.log('    첫 발 전 ' + n3(D.before) + ' → 첫 발 뒤 ' + n3(D.afterFirst)
      + ' → 5틱 뒤 ' + n3(D.end) + ' · now0 = ' + n3(D.now0) + ' · n = ' + D.n);
    ok(D.n > 1, '  [D0] 반복분이 돌았다 — 정산이 뜨는 조건(h.n > 1)', D.n + '틱');
    ok(D.now0 !== null && Math.abs(D.now0 - D.afterFirst) < 1e-6,
       '  [D1] ★ 정산 기준 `now0` = «첫 발을 산 뒤» — 반복분에 첫 발 몫이 안 섞인다',
       n3(D.now0) + ' ≟ ' + n3(D.afterFirst));
    ok(Math.abs(D.now0 - D.before) > 1e-9,
       '  [D2] ★ 그 자리가 «첫 발 전»(' + n3(D.before) + ')이 아니다 — 시점 결함이 안 되살아났다',
       '차 ' + n3(D.now0 - D.before));
    /* ⚑ 660 이관 — 이 두 항이 없으면 «660 이 통째로 사라져도 초록» 인 게이트가 된다. */
    ok(D.delta === 0,
       '  [D3] ★ 660 — 훈련 강화·정산에 «+n» 숫자 플로터가 0장이다', D.delta + '프레임·표본');
    ok(D.runBurst >= 3,
       '  [D4] ★ 660 — 그 자리를 아이콘 버스트가 대신한다', D.runBurst + '알(반복분)');
    ok(D.stopBurst > 0,
       '  [D5] ★ 정산 한 장도 버스트로 뜬다(h.n > 1 · `trHoldStop`)', D.stopBurst + '알(정산 몫)');
    /* 1회 누름에는 정산이 없다(64 규약) — 첫 발 버스트와 안 섞이게 «stop 뒤 새로 난 것» 만 센다 */
    const D6 = await page.evaluate(() => {
      const stamp = (set) => {
        for (const el of document.querySelectorAll('.fx-cic')) {
          if (el.__v628 === undefined) el.__v628 = (window.__v628n = (window.__v628n || 0) + 1);
          set.add(el.__v628);
        }
      };
      S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
      for (const L of ['fxl', 'fxlc']) { const e = document.getElementById(L); if (e) e.innerHTML = ''; }
      trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
      const n = trHold ? trHold.n : 0;
      if (trHold) clearTimeout(trHold.timer);
      const s = new Set(); stamp(s);
      const before = s.size;
      trHoldStop(false);
      stamp(s);
      return { n, added: s.size - before };
    });
    eq('  [D6 전제] 1회 누름이라 반복분이 없다(h.n === 1)', D6.n, 1);
    eq('  [D6] 1회 누름에는 정산이 안 붙는다(64 규약)', D6.added, 0);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [E] 안 건드린 규약 ══════════════════ */
  sec('[E] 안 건드린 규약');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(1, 200));
    /* 상한 카드 침묵(58·486) — 더 살 수 없으면 «오를 양» 은 0 이고 카드는 `full` 이다.
       ⚑ 707 — 종전에는 «플로터 문구가 빈 문자열» 로 물었다(그 입이 폐지돼 물을 수 없다).
         같은 뜻을 **데이터로** 묻는다: 상한에서는 n = 0 · gain = «+0» · full = true. */
    const e1 = await page.evaluate(() => {
      S.lv.atk = trainCap(); markDirty(); renderTrain();
      const c = trainCardData().find(x => x.k === 'atk');
      return { gain: c.gain, n: c.n, full: c.full,
               cv: document.querySelector('#trCards [data-tr="atk"] .cv i').textContent };
    });
    eq('  [E1-a] 상한 카드는 더 살 게 없다(n = 0)', e1.n, 0);
    eq('  [E1-b] 상한 카드가 말하는 증가분은 «+0»(58·486 침묵)', e1.gain, '+0');
    ok(e1.full === true, '  [E1-c] 상한 카드에 `full` 이 선다 — 알약이 «MAX» 를 쓴다', e1.cv);
    const CODE = fs.readFileSync(SRC, 'utf8');
    /* ⚑ 660 — 두 함수는 **선언째** 사라졌다. 되살아나면 이 자가 먼저 빨개진다(707). */
    ok(!/function trDeltaTxt|const trDeltaTxt/.test(CODE) && !/function trHoldGainTxt|const trHoldGainTxt/.test(CODE),
       '  [E2] ★ 660 — `trDeltaTxt`·`trHoldGainTxt` 선언이 0건이다(주석 밖)');
    /* 두 호출부가 «숫자» 를 안 넘긴다 — 넘기면 `fxUpOk` 안의 `fxDelta` 가 다시 돈다(660 폐지분) */
    const sStart = CODE.indexOf('function trHoldStart');
    const startBody = CODE.slice(sStart, CODE.indexOf('\n}', sStart));
    ok(/fxUpOk\(card, card, null, bi0\.cur, true\)/.test(startBody),
       '  [E3-a] ★ 첫 발은 `fxUpOk` 에 문구 대신 `null` 을 넘긴다(660)');
    const sStop = CODE.indexOf('function trHoldStop');
    const stopBody = CODE.slice(sStop, CODE.indexOf('\n}', sStop));
    ok(/fxUpOk\(el, el, null, PAY_CUR\.train, true\)/.test(stopBody),
       '  [E3-b] ★ 정산도 문구 대신 `null` 을 넘긴다(660)');
    /* 시점 축이 선언 자리에 그대로 있다(628 ②) */
    ok(/now0:TRAIN_NOW\[key\] \? TRAIN_NOW\[key\]\(\) : null/.test(startBody),
       '  [E4] 정산 기준 `now0` 을 첫 발 **뒤**에 잡는다(628 ②)');
    /* 배수 표를 두 벌로 적지 않았다(402 «표 두 벌» 부패) */
    const sCard = CODE.indexOf('function trainCardData');
    const cardBody = CODE.slice(sCard, CODE.indexOf('\n}', sCard));
    ok(/TRAIN_NOW\[k\]\(\)/.test(cardBody) && !/mulAtk|mulHp|mulRegen/.test(cardBody),
       '  [E5] 배수는 `TRAIN_NOW` 에서 꺼낸다 — 두 번째 배수 표를 안 적었다(402)');
    /* 레벨·비용·진행바 축은 안 건드렸다 */
    const e6 = await page.evaluate(() => {
      S.lv.atk = 20; S.lv.hp = 20; S.lv.regen = 20; S.buyQty = 1; markDirty(); renderTrain();
      const c = trainCardData().find(x => x.k === 'atk');
      return { lvTxt: c.lvTxt, cost: c.cost, prog: $('trProg').textContent };
    });
    eq('  [E6] 카드 레벨 표기 불변', e6.lvTxt, 'Lv. 20');
    ok(/^[0-9,]+$/.test(e6.cost), '  [E7] 비용 표기 불변(골드 숫자)', e6.cost);
    ok(/^\d+\/\d+$/.test(e6.prog), '  [E8] 진행바 «n/m» 불변', e6.prog);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [R] 되돌림 시험 ══════════════════ */
  sec('[R] 되돌림 — 축·시점·660 을 각각 되돌린 사본에서 빨개진다');
  {
    const CODE = fs.readFileSync(SRC, 'utf8');

    /* R1 — 축을 되돌린다: gain 에서 배수를 뺀다(486 직후의 그 모양) */
    const AXIS = 'const gain = bi.n ? (u.val(l + bi.n) - u.val(l)) * mul : 0;';
    ok(CODE.includes(AXIS), '  [R0-a] 축 앵커 문자열이 제품에 실재한다', AXIS);
    const tmpA = path.join(ROOT, `index.verify628-revert-axis-${process.pid}.html`);
    fs.writeFileSync(tmpA, CODE.split(AXIS).join('const gain = bi.n ? u.val(l + bi.n) - u.val(l) : 0;'));
    try {
      const { ctx, page } = await open(browser, tmpA, save(1, 200));
      const rows = await page.evaluate(MEASURE, { KEYS, QTYS });
      ok(rows.some(r => r.txt !== r.want && r.txt !== r.wantEps),
         '  [R1] 축을 되돌린 사본에서 [A] 가 빨개진다',
         rows.filter(r => r.txt !== r.want && r.txt !== r.wantEps).length + '/' + rows.length + '건 어긋남');
      ok(rows.every(r => r.txt === r.baseWant),
         '  [R2] 그 사본이 실제로 «기저 증분» 을 말한다(= 수리 전의 그 그림)',
         rows.filter(r => r.txt !== r.baseWant).length + '건 불일치');
      await ctx.close();
    } finally { try { fs.unlinkSync(tmpA); } catch (e) {} }

    /* R3 — 시점을 되돌린다: 정산 기준을 첫 발 «앞» 으로 옮긴다.
       ⚑ 707 — 종전 앵커(`fxUpOk(el, el, trHoldGainTxt(h), …)`)는 660 이 지웠다. 같은 결함을
         **지금 살아 있는 축**(`now0`)으로 되돌린다: 두 줄을 갈아 첫 발 전 값을 기준으로 삼게 한다. */
    const T1 = 'const bi0 = trainBuyInfo(key);';
    const T2 = 'now0:TRAIN_NOW[key] ? TRAIN_NOW[key]() : null';
    ok(CODE.includes(T1) && CODE.includes(T2), '  [R0-b] 시점 앵커 두 줄이 제품에 실재한다');
    const tmpB = path.join(ROOT, `index.verify628-revert-time-${process.pid}.html`);
    fs.writeFileSync(tmpB, CODE
      .split(T1).join('const __n0b = TRAIN_NOW[key] ? TRAIN_NOW[key]() : null; ' + T1)
      .split(T2).join('now0:__n0b'));
    try {
      const { ctx, page } = await open(browser, tmpB, save(1, 200));
      const R = await page.evaluate(HOLD);
      ok(Math.abs(R.now0 - R.afterFirst) > 1e-9,
         '  [R3] 시점을 되돌린 사본에서 [D1] 이 빨개진다',
         'now0 ' + n3(R.now0) + ' ≠ 첫 발 뒤 ' + n3(R.afterFirst));
      ok(Math.abs(R.now0 - R.before) < 1e-6,
         '  [R4] 그 사본이 실제로 «첫 발 전» 을 기준으로 삼는다(= 628 이 잡은 그 결함)',
         n3(R.now0) + ' ≟ ' + n3(R.before));
      await ctx.close();
    } finally { try { fs.unlinkSync(tmpB); } catch (e) {} }

    /* R5 — 660 을 되돌린다: 정산 호출부에 문구를 되돌려 준다 → 델타 플로터가 되살아난다.
       이것이 없으면 [D3]«0장» 은 «원래 그럴 자리라 늘 초록» 인 헛항이다. */
    const F = 'fxUpOk(el, el, null, PAY_CUR.train, true);';
    ok(CODE.includes(F), '  [R0-c] 660 앵커 문자열이 제품에 실재한다', F);
    const tmpC = path.join(ROOT, `index.verify628-revert-660-${process.pid}.html`);
    fs.writeFileSync(tmpC, CODE.split(F).join("fxUpOk(el, el, '+1', PAY_CUR.train, true);"));
    try {
      const { ctx, page } = await open(browser, tmpC, save(1, 200));
      const R = await page.evaluate(HOLD);
      ok(R.delta > 0, '  [R5] 660 을 되돌린 사본에서 [D3] 이 빨개진다 — 델타 플로터가 되살아난다',
         R.delta + '프레임·표본');
      await ctx.close();
    } finally { try { fs.unlinkSync(tmpC); } catch (e) {} }
  }

  /* ══════════════════ [I] 콘솔 ══════════════════ */
  sec('[I] 콘솔');
  ok(allErrs.length === 0, '  콘솔 error / pageerror 0건', allErrs.slice(0, 4).join(' | '));

  await browser.close();
  console.log('\nVERIFY628 ' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
