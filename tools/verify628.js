#!/usr/bin/env node
/* 628 검증 — 훈련 델타 플로터 «+n» = **실제 스탯 증분** (2026-09-01)
 *
 *   node tools/verify628.js
 *
 * 계약 두 줄 —
 *   ① **첫 발 플로터**의 «+n» 은 그 한 번의 구매로 실제로 오르는 양이다.
 *      «실제로» 의 자는 알약(`.cv`)이 쓰는 자와 **같다** — `TRAIN_NOW` = `stat.dmg/maxHp/regen`
 *      (훈련 단계·장비·펫·축복·도감이 다 곱해진 «지금 내 수치»).
 *   ② **홀드 정산 한 장**의 «+n» 은 그 홀드의 반복분이 실제로 올린 양이다.
 *
 * 뿌리(재현 `tools/probe628.js`, 수리 전):
 *   · 486 이 알약을 «지금 최종값» 으로 옮길 때 «+n» 줄(`trainCardData().gain`)은 옛 축
 *     (`u.val()` **기저**)에 남았다 — 한 카드 안에서 두 수가 서로 다른 자를 썼다.
 *     단계 3 표본에서 플로터 «+20» ↔ 실제 `stat.dmg` 증분 **25.549**
 *     (atk +21.7% · hp +19.3% · regen +16.7% — 배수가 클수록 벌어진다).
 *   · 그리고 **시점**도 틀린 자리가 하나 더 있었다 — `trHoldStop` 은 `trDeltaTxt` 를 구매
 *     «뒤» 에 부르므로(첫 발은 «앞») 정산 한 장이 «방금 얻은 양» 이 아니라 **«다음에 오를 양»**
 *     을 말했다: 5틱 홀드로 최종값이 127.745 올랐는데 문구는 «+20»(다음 1회의 기저 증분)이었다.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [전제] 배수가 1 이 아닌 표본인가 — 배수가 1 이면 이 계약은 아무것도 안 묻는다
 *   [A] 첫 발 — 3 스탯 × 3 배수탭 × 상태 4벌(Lv 0·200·950·1500 = 단계 1·3·7·9).
 *       플로터 = 실제 최종값 증분(«실제» 는 페이지 안에서 정말 사서 전·후를 뺀 값)
 *   [B] 옛 축 방어 — 배수 ≠ 1 인 칸에서 «기저 증분» 과 **다르다**(628 이 사라지면 빨강).
 *       배수 = 1 인 칸은 [B*] 로 «같은 것이 정상» 을 양성으로 묻는다(조용한 건너뜀 금지)
 *   [C] 화면 쪽 증거 — x30 은 알약 글자가 실제로 움직이고(C1),
 *       안 움직인 칸은 전부 알약 해상도(유효숫자 3자리) 아래였다(C2)
 *   [D] 홀드 정산 — 반복분이 올린 양(≠ «다음에 오를 양» · ≠ 첫 발 한 번의 양)
 *   [E] 안 건드린 규약 — 상한 카드 침묵(58·486) · 첫 발은 구매 «전» 에 문구를 잡는다(486)
 *       · 1회 누름에는 정산 한 장이 없다(64) · 레벨·비용·진행바 불변
 *   [R] 되돌림 시험 — 축을 되돌린 사본 · 시점을 되돌린 사본에서 각각 **빨개진다**
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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function'
    && typeof trDeltaTxt === 'function');
  await page.evaluate(() => { openTrain(); });
  await page.waitForTimeout(220);
  return { ctx, page, errs };
}

/* 한 상태에서 3 스탯 × 3 배수탭을 재는 공용 측정 — 페이지 안에서 «실제로 사서» 전·후를 잰다.
   ⚠ 기대값을 제품 식으로 다시 적지 않는다(그러면 게이트가 제품을 베끼는 꼴이라 아무것도 안 묻는다). */
const MEASURE = (cfg) => {
  const rows = [];
  for (const q of cfg.QTYS) {
    for (const k of cfg.KEYS) {
      S.buyQty = q; S.gold = 1e300; markDirty(); renderTrain();
      const card = document.querySelector('#trCards [data-tr="' + k + '"]');
      const bi = trainBuyInfo(k);
      const txt = trDeltaTxt(card);                       /* 구매 «전» — 첫 발이 잡는 문자열 */
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

  /* ══════════════════ [A][B][C] 첫 발 ══════════════════ */
  const mulSeen = { atk: false, hp: false, regen: false };
  for (const st of STATES) {
    sec('[A][B][C] 첫 발 — ' + st.name);
    const { ctx, page, errs } = await open(browser, SRC, save(1, st.lv));
    const rows = await page.evaluate(MEASURE, { KEYS, QTYS });
    console.log('    (실제 단계 ' + rows[0].stage + ' · 스탯당 상한 ' + rows[0].cap + ')');
    ok(rows.every(r => r.bought), '  [A0] 아홉 표본 모두 실제로 구매됐다', rows.filter(r => !r.bought).length + '건 실패');
    for (const r of rows) {
      const tag = '  ' + r.k + ' x' + r.q + '(n=' + r.n + ')';
      ok(r.txt === r.want || r.txt === r.wantEps,
         '[A]' + tag + ' 플로터 = 실제 최종값 증분', r.txt + ' ≟ ' + r.want + ' (배수 ×' + n3(r.mul) + ')');
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
    /* [C] — 화면 쪽 증거: 알약이 «+n» 이 말한 만큼 실제로 움직인다.
       ⚠ 알약은 유효숫자 3자리(«32.4A»)라 **해상도가 있다** — 고레벨에서 x1 은 값의 0.1% 라
         글자가 안 움직이는 것이 정상이다(Lv 950 atk: Δ34 / 32,400). 그래서
         ⓐ 눈에 보일 만큼 큰 x30 은 **반드시 움직인다** 를 묻고,
         ⓑ 안 움직인 칸은 «해상도 아래였다» 를 **양성으로** 묻는다(조용히 건너뛰지 않는다). */
    const big = rows.filter(r => r.q === 30);
    ok(big.every(r => r.cvBefore !== r.cvAfter),
       '  [C1] x30 은 알약 글자가 실제로 움직인다 — «+n» 이 말한 그 자리다',
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

  /* ══════════════════ [D] 홀드 정산 ══════════════════ */
  sec('[D] 홀드 정산 — 반복분이 실제로 올린 양');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(1, 200));
    const D = await page.evaluate(() => {
      S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
      /* 제품 경로 그대로 — trHoldStart 로 첫 발, trHoldTick 으로 반복 5회 */
      trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
      const now0 = TRAIN_NOW.atk();                 /* 반복분의 기준 = 첫 발을 산 뒤 */
      const firstShot = trainBuyInfo('atk');
      if (trHold) clearTimeout(trHold.timer);
      for (let i = 0; i < 5; i++) { if (!trHold) break; clearTimeout(trHold.timer); trHoldTick(); }
      if (trHold) clearTimeout(trHold.timer);
      const h = trHold;
      const repD = TRAIN_NOW.atk() - now0;
      const nextD = trDeltaTxt(document.querySelector('#trCards [data-tr="atk"]'));  /* «다음에 오를 양» */
      const txt = trHoldGainTxt(h);
      trHoldStop(false);
      return { txt, n: h ? h.n : 0, repD, nextD,
               want: '+' + fmtB(repD), wantEps: '+' + fmtB(repD * (1 + 1e-9)),
               oneShot: '+' + fmtB(TRAIN_NOW.atk() - now0) };
    });
    ok(D.n > 1, '  [D0] 반복분이 돌았다 — 정산 한 장이 뜨는 조건(h.n > 1)', D.n + '틱');
    ok(D.txt === D.want || D.txt === D.wantEps,
       '  [D1] 정산 = 반복분이 올린 최종값', D.txt + ' ≟ ' + D.want + ' (' + n3(D.repD) + ')');
    ok(D.txt !== D.nextD,
       '  [D2] 정산이 «다음에 오를 양»(«' + D.nextD + '»)이 아니다 — 시점 결함이 안 되살아났다');
    /* 1회 누름에는 정산 한 장이 없다(64 규약) */
    const D3 = await page.evaluate(() => {
      S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
      const n0 = document.querySelectorAll('#fxl .fx-plus').length;
      if (trHold) clearTimeout(trHold.timer);
      trHoldStop(false);
      return { before: n0, after: document.querySelectorAll('#fxl .fx-plus').length };
    });
    eq('  [D3] 1회 누름에는 정산 한 장이 안 붙는다(64 규약)', D3.after, D3.before);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [E] 안 건드린 규약 ══════════════════ */
  sec('[E] 안 건드린 규약');
  {
    const { ctx, page, errs } = await open(browser, SRC, save(1, 200));
    /* 상한 카드 침묵(58·486) */
    const e1 = await page.evaluate(() => {
      S.lv.atk = trainCap(); markDirty(); renderTrain();
      return trDeltaTxt(document.querySelector('#trCards [data-tr="atk"]'));
    });
    eq('  [E1] 상한 카드에서는 플로터 문구가 빈 문자열(58·486)', e1, '');
    /* 첫 발은 구매 «전» 에 문구를 잡는다(486) — 순서가 뒤집히면 «다음 것» 을 말하게 된다 */
    const CODE = fs.readFileSync(SRC, 'utf8');
    const s = CODE.indexOf('function trHoldStart');
    const body = CODE.slice(s, CODE.indexOf('\n}', s));
    const iTxt = body.indexOf('trDeltaTxt('), iBuy = body.indexOf('trBuyOnce(');
    ok(iTxt > -1 && iBuy > -1 && iTxt < iBuy,
       '  [E2] `trHoldStart` 는 문구를 구매 «전» 에 잡는다(486)', 'txt@' + iTxt + ' buy@' + iBuy);
    /* 정산은 «구매 뒤» 라서 다른 부품을 쓴다 — 같은 부품으로 돌아가면 628 이 사라진 것이다 */
    const sStop = CODE.indexOf('function trHoldStop');
    const stopBody = CODE.slice(sStop, CODE.indexOf('\n}', sStop));
    ok(/trHoldGainTxt\(/.test(stopBody) && !/trDeltaTxt\(/.test(stopBody),
       '  [E3] `trHoldStop` 은 `trHoldGainTxt` 를 쓴다(`trDeltaTxt` 로 안 되돌아갔다)');
    /* 배수 표를 두 벌로 적지 않았다(402 «표 두 벌» 부패) */
    const sCard = CODE.indexOf('function trainCardData');
    const cardBody = CODE.slice(sCard, CODE.indexOf('\n}', sCard));
    ok(/TRAIN_NOW\[k\]\(\)/.test(cardBody) && !/mulAtk|mulHp|mulRegen/.test(cardBody),
       '  [E4] 배수는 `TRAIN_NOW` 에서 꺼낸다 — 두 번째 배수 표를 안 적었다(402)');
    /* 레벨·비용·진행바 축은 안 건드렸다 */
    const e5 = await page.evaluate(() => {
      S.lv.atk = 20; S.lv.hp = 20; S.lv.regen = 20; S.buyQty = 1; markDirty(); renderTrain();
      const c = trainCardData().find(x => x.k === 'atk');
      return { lvTxt: c.lvTxt, cost: c.cost, prog: $('trProg').textContent };
    });
    eq('  [E5] 카드 레벨 표기 불변', e5.lvTxt, 'Lv. 20');
    ok(/^[0-9,]+$/.test(e5.cost), '  [E6] 비용 표기 불변(골드 숫자)', e5.cost);
    ok(/^\d+\/\d+$/.test(e5.prog), '  [E7] 진행바 «n/m» 불변', e5.prog);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ══════════════════ [R] 되돌림 시험 ══════════════════ */
  sec('[R] 되돌림 — 축·시점을 각각 되돌린 사본에서 빨개진다');
  {
    const CODE = fs.readFileSync(SRC, 'utf8');

    /* R1 — 축을 되돌린다: gain 에서 배수를 뺀다(486 직후의 그 모양) */
    const AXIS = 'const gain = bi.n ? (u.val(l + bi.n) - u.val(l)) * mul : 0;';
    ok(CODE.includes(AXIS), '  [R0-a] 축 앵커 문자열이 제품에 실재한다', AXIS);
    const tmpA = path.join(ROOT, 'index.verify628-revert-axis.html');
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
    } finally { fs.unlinkSync(tmpA); }

    /* R3 — 시점을 되돌린다: 정산이 다시 `trDeltaTxt` 를 쓴다 */
    const TIME = 'fxUpOk(el, el, trHoldGainTxt(h), PAY_CUR.train);';
    ok(CODE.includes(TIME), '  [R0-b] 시점 앵커 문자열이 제품에 실재한다', TIME);
    const tmpB = path.join(ROOT, 'index.verify628-revert-time.html');
    fs.writeFileSync(tmpB, CODE.split(TIME).join('fxUpOk(el, el, trDeltaTxt(el), PAY_CUR.train);'));
    try {
      const { ctx, page } = await open(browser, tmpB, save(1, 200));
      const R = await page.evaluate(() => {
        S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
        trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
        const now0 = TRAIN_NOW.atk();
        if (trHold) clearTimeout(trHold.timer);
        for (let i = 0; i < 5; i++) { if (!trHold) break; clearTimeout(trHold.timer); trHoldTick(); }
        if (trHold) clearTimeout(trHold.timer);
        const said = trDeltaTxt(document.querySelector('#trCards [data-tr="atk"]'));  /* 그 사본이 쓰는 것 */
        const repD = TRAIN_NOW.atk() - now0;
        trHoldStop(false);
        return { said, want: '+' + fmtB(repD), repD };
      });
      ok(R.said !== R.want, '  [R3] 시점을 되돌린 사본에서 [D1] 이 빨개진다',
         '"' + R.said + '" ≠ 반복분 "' + R.want + '"(' + n3(R.repD) + ')');
      await ctx.close();
    } finally { fs.unlinkSync(tmpB); }
  }

  /* ══════════════════ [I] 콘솔 ══════════════════ */
  sec('[I] 콘솔');
  ok(allErrs.length === 0, '  콘솔 error / pageerror 0건', allErrs.slice(0, 4).join(' | '));

  await browser.close();
  console.log('\nVERIFY628 ' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
