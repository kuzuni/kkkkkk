#!/usr/bin/env node
/* 483 검증 — 23 훈련 «스탯을 사도 훈련 경험치(진행바)가 안 오른다» (주인 보고 2026-08-30)
 *
 *   node tools/verify483.js
 *
 * 계약 한 줄 — **훈련 카드를 한 번 사면 진행바가 같은 프레임에 한 칸 오른다.**
 *   어떤 세이브에서도, 어떤 구매 경로(x1·x10·x30·꾹 누르기)에서도.
 *
 * 뿌리(재현 `tools/probe483.js`) — 326 이 상한을 «누적합»(`trainCapAt(n)=100·n(n+1)/2`)으로
 *   바꾸면서 진행도의 **기저**(`trainBase()` = trainCapAt(단계−1))도 같이 커졌는데, 326 은
 *   «구 상한 100n ≤ 신 상한» 만 보고 세이브 이관을 «없음» 으로 판정했다. 구 규칙으로 자란
 *   세이브(단계 9 · lv 921)는 새 기저 3600 아래에 있어 `trainLvRel = max(0, min(lv,cap) − base)`
 *   가 **0 에 굳는다** — 골드를 아무리 부어도 `0/2700` 에서 한 칸도 안 움직인다.
 *
 * 처방 — **load() 에서 단계를 «레벨이 실제로 산 만큼» 으로 내린다**(레벨·골드는 안 건드린다).
 *   ⚠ 등재문의 기본안(«단계 유지 + 레벨을 base 까지 무료로 올림»)은 338 규칙대로 **재현으로
 *     기각**했다 — 그 안은 다음 한 레벨의 값을 ×5.8e56 로 만들어(`probe483` A4) 진행바가
 *     «0 에 굳음» 에서 «살 수가 없어 안 움직임» 으로 바뀔 뿐이다(완료 조건 미달).
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [A] 이관 — 구 규칙 세이브를 **실제로 로드**하면 단계가 레벨에 맞게 정정된다(단계 2~10 스윕)
 *   [B] 완료 조건 — 단계 1·2·3 에서 x1 구매 → `trainProg()` +1 · 진행바 문구·폭이 같은 프레임에
 *   [C] x10 · x30 경로도 산 만큼 오른다(room 으로 잘려도 잘린 만큼)
 *   [D] 홀드(297/349 꾹 누르기) 경로도 같은 자를 지난다
 *   [E] 183 규약 유지 — 단계 ↑ 직후 정확히 0/새 max
 *   [F] **정상 세이브에는 한 글자도 안 닿는다** — 항등 · 멱등 · 단계가 «올라가는» 일 0건
 *   [G] 326 이전 세이브(lv 50 · 단계 2) — 진행이 음수도, 0 고정도 아니다
 *   [H] 안 건드린 축 — 레벨·골드 손실 0 · TRAIN_CAP_STEP·TRAIN_BONUS·trainCapAt 불변
 *   [R] 되돌림 시험 — 정정 한 줄을 뺀 사본에서 «사도 안 오름» 이 그대로 재현된다
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
const CAP = n => 100 * n * (n + 1) / 2;          /* 326 누적합 */
const OLDCAP = n => 100 * n;                     /* 326 이전 — 단계×100 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const eq = (m, got, want) => ok(got === want, m, 'got ' + got + ' · want ' + want);
const sec = t => console.log('\n' + t);

/* 구 규칙(단계당 스탯 100 고정)으로 자란 세이브 한 벌 */
const oldSave = (stage, lvs) => Object.assign({
  gold: 1e30, dia: 1e9, best: 60, a105: 1, buyQty: 1, autoBuy: false, trainStage: stage,
}, { lv: { atk: lvs[0], hp: lvs[1], regen: lvs[2] } });

async function open(browser, file, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainProg === 'function');
  await page.evaluate(() => { step = () => {}; S.autoBuy = false; openTrain(); });
  await page.waitForTimeout(450);
  return { ctx, page, errs };
}
/* 한 번 사고 «그 프레임» 의 머리를 그대로 돌려준다 — 문구·폭까지 같이 본다 */
const buyOnce = (page, id, qty) => page.evaluate(([k, q]) => {
  S.buyQty = q;
  const before = { prog: trainProg(), max: trainMax(), lv: lv(k), stage: trainStage(),
                   base: trainBase(), cap: trainCap(),
                   txt: $('trProg').textContent, w: $('trFill').style.width, gold: S.gold };
  const bi = trainBuyInfo(k);
  trainBuy(k); renderTrainLive();
  return { before, n: bi.n, full: bi.full,
           after: { prog: trainProg(), lv: lv(k), txt: $('trProg').textContent, w: $('trFill').style.width } };
}, [id, qty]);

(async () => {
  const browser = await launch(chromium);
  let allErrs = [];

  /* ---- [A] 이관 — 실제 로드로 단계가 정정된다 ---- */
  sec('[A] 이관 — 구 규칙 세이브를 실로드하면 단계가 «레벨이 산 만큼» 으로 정정된다');
  for (const n of [2, 3, 4, 5, 6, 9, 10]) {
    const L = OLDCAP(n);
    const { ctx, page, errs } = await open(browser, SRC, oldSave(n, [L, L, L]));
    const h = await page.evaluate(() => ({ stage: trainStage(), base: trainBase(), cap: trainCap(),
      lv: S.lv.atk | 0, prog: trainProg(), max: trainMax(), txt: $('trProg').textContent }));
    /* 계약: 단계 k 는 «전 스탯 lv ≥ cap(k−1)» 를 만족하는 가장 큰 k(원래 단계를 넘지 않는다) */
    let want = 1; while (want < n && CAP(want) <= L) want++;
    eq('  구 단계 ' + n + '(lv ' + L + ') → 단계 ' + want, h.stage, want);
    ok(h.base <= h.lv, '  단계 ' + want + ' — 기저 ' + h.base + ' ≤ lv ' + h.lv + ' (진행이 0 에 안 굳는다)', h.base + ' vs ' + h.lv);
    eq('  단계 ' + want + ' — 레벨은 한 톨도 안 깎였다', h.lv, L);
    ok(h.prog >= 0 && h.prog <= h.max, '  단계 ' + want + ' — 진행 ' + h.txt + ' 가 눈금 안에 있다', h.txt);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 주인 스크린샷(2026-08-30 23:20) 그대로 — 9단계 · Lv 921/983/926 */
    const { ctx, page, errs } = await open(browser, SRC, oldSave(9, [921, 983, 926]));
    const h = await page.evaluate(() => ({ stage: trainStage(), txt: $('trProg').textContent, rib: $('trRib').textContent }));
    eq('  주인 세이브 — 단계 4', h.stage, 4);
    eq('  주인 세이브 — 진행 1030/1200 (= (921−600)+(983−600)+(926−600))', h.txt, '1030/1200');
    ok(/훈련.*4.*단계/.test(h.rib), '  리본도 4 단계로 따라온다', h.rib);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [B] 완료 조건 ---- */
  sec('[B] 완료 조건 — x1 구매 → 진행바가 같은 프레임에 +1');
  for (const n of [1, 2, 3]) {
    const L = CAP(n - 1) + 7;                               /* 그 단계 안, 상한 한참 아래 */
    const { ctx, page, errs } = await open(browser, SRC, oldSave(n, [L, L, L]));
    const r = await buyOnce(page, 'atk', 1);
    eq('  단계 ' + n + ' — 레벨 +1', r.after.lv, r.before.lv + 1);
    eq('  단계 ' + n + ' — 진행 +1', r.after.prog, r.before.prog + 1);
    ok(r.after.txt === (r.before.prog + 1) + '/' + r.before.max,
      '  단계 ' + n + ' — 문구가 같은 프레임에 «' + r.after.txt + '»', r.after.txt);
    ok(parseFloat(r.after.w) > parseFloat(r.before.w),
      '  단계 ' + n + ' — 채움 폭도 같은 프레임에 넓어진다', r.before.w + ' → ' + r.after.w);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [C] x10 · x30 ---- */
  sec('[C] x10 · x30 — 산 만큼(room 으로 잘리면 잘린 만큼) 오른다');
  {
    const { ctx, page, errs } = await open(browser, SRC, oldSave(3, [310, 310, 310]));
    for (const q of [10, 30]) {
      const r = await buyOnce(page, 'atk', q);
      eq('  x' + q + ' — 레벨 +' + r.n, r.after.lv, r.before.lv + r.n);
      eq('  x' + q + ' — 진행 +' + r.n, r.after.prog, r.before.prog + r.n);
    }
    /* room 3 만 남기고 x30 — 잘린 만큼만 오른다(ⓓ 가설의 음성항) */
    await page.evaluate(() => { S.lv.atk = trainCap() - 3; renderTrainLive(); });
    const r = await buyOnce(page, 'atk', 30);
    eq('  room 3 에서 x30 — 실제 구매 수량', r.n, 3);
    eq('  room 3 에서 x30 — 진행도 +3', r.after.prog, r.before.prog + 3);
    const fullR = await buyOnce(page, 'atk', 30);
    ok(fullR.full === true && fullR.after.prog === fullR.before.prog,
      '  상한에서는 «상한» 표시 + 진행 변화 0', 'full=' + fullR.full);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [D] 홀드(297/349) ---- */
  sec('[D] 꾹 누르기(297/349) 경로도 같은 자를 지난다');
  {
    const { ctx, page, errs } = await open(browser, SRC, oldSave(4, [700, 700, 700]));
    const r = await page.evaluate(async () => {
      S.buyQty = 1;
      const p0 = trainProg();
      const card = document.querySelector('#trw [data-tr="atk"]');
      if (!card) return { no: 1 };
      trHoldStart('atk', card);
      await new Promise(z => setTimeout(z, 900));
      trHoldStop(false);
      return { p0, p1: trainProg(), txt: $('trProg').textContent, lv: lv('atk') };
    });
    ok(!r.no && r.p1 > r.p0 + 1, '  홀드 0.9초 — 진행이 여러 칸 쌓인다 (Δ' + (r.p1 - r.p0) + ')', JSON.stringify(r));
    ok(r.txt === r.p1 + '/1200', '  홀드가 끝난 프레임의 문구도 같은 값', r.txt);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [E] 183 규약 ---- */
  sec('[E] 183 규약 유지 — 단계 ↑ 직후 정확히 0/새 max');
  {
    const { ctx, page, errs } = await open(browser, SRC, oldSave(3, [600, 600, 600]));
    const r = await page.evaluate(() => {
      const b = { stage: trainStage(), prog: trainProg(), max: trainMax(), ready: trainReady() };
      trainUp(); if (typeof closeModal === 'function') closeModal();
      renderTrainLive();
      return { b, stage: trainStage(), prog: trainProg(), max: trainMax(), txt: $('trProg').textContent };
    });
    ok(r.b.ready === true, '  3단계 상한(600)에서 [↑] 가 열려 있다', String(r.b.ready));
    eq('  단계 업 직후 진행 0', r.prog, 0);
    eq('  분모는 새 단계 몫 300×4', r.max, 1200);
    eq('  문구도 0/1200', r.txt, '0/1200');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [F] 정상 세이브 무영향 · 멱등 · 승급 금지 ---- */
  sec('[F] 정상 세이브에는 한 글자도 안 닿는다 — 항등 · 멱등 · 단계 상승 0건');
  for (const n of [1, 2, 4, 8]) {
    const L = CAP(n - 1) + 5;                                /* 326 규칙을 지켜 자란 세이브 */
    const { ctx, page, errs } = await open(browser, SRC, oldSave(n, [L, L, L]));
    const h = await page.evaluate(() => ({ stage: trainStage(), lv: S.lv.atk | 0, gold: S.gold }));
    eq('  단계 ' + n + ' — 단계 그대로', h.stage, n);
    eq('  단계 ' + n + ' — 레벨 그대로', h.lv, L);
    /* 멱등 — 같은 페이지에서 save() 뒤 다시 load() 해도 결과가 같다 */
    const again = await page.evaluate(() => { save(); load(); return { stage: trainStage(), lv: S.lv.atk | 0 }; });
    ok(again.stage === n && again.lv === L, '  단계 ' + n + ' — 두 번 돌아도 같다(멱등)', JSON.stringify(again));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 승급 금지 — 레벨이 단계보다 «앞서» 있어도 이관이 단계를 선물하지 않는다 */
    const { ctx, page, errs } = await open(browser, SRC, oldSave(1, [5000, 5000, 5000]));
    const h = await page.evaluate(() => ({ stage: trainStage(), lv: S.lv.atk | 0, cap: trainCap(), prog: trainProg() }));
    eq('  lv 5000 · 단계 1 — 단계를 올려 주지 않는다', h.stage, 1);
    ok(h.prog <= 300, '  진행은 분모를 안 넘는다(상한 클램프)', String(h.prog));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [G] 등재문이 지정한 표본 ---- */
  sec('[G] 326 이전 세이브(lv 50 · 단계 2) — 음수도 0 고정도 아니다');
  {
    const { ctx, page, errs } = await open(browser, SRC, oldSave(2, [50, 50, 50]));
    const h = await page.evaluate(() => ({ stage: trainStage(), prog: trainProg(), max: trainMax(), txt: $('trProg').textContent }));
    eq('  단계 1 로 정정', h.stage, 1);
    ok(h.prog === 150 && h.max === 300, '  진행 150/300 — 이미 산 50×3 이 그대로 보인다', h.txt);
    const r = await buyOnce(page, 'atk', 1);
    eq('  거기서 한 번 사면 +1', r.after.prog, r.before.prog + 1);
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [H] 안 건드린 축 ---- */
  sec('[H] 483 이 안 건드린 축 — 골드·상수·곡선');
  {
    const { ctx, page, errs } = await open(browser, SRC, oldSave(9, [921, 983, 926]));
    const k = await page.evaluate(() => ({
      gold: S.gold, step: TRAIN_CAP_STEP, bonus: TRAIN_BONUS,
      cap3: trainCapAt(3), cap9: trainCapAt(9), stats: TRAIN_STATS.join(','), qtys: TRAIN_QTYS.join(','),
      lv: [S.lv.atk | 0, S.lv.hp | 0, S.lv.regen | 0].join(','),
      cost921: U.atk.cost(921),
    }));
    eq('  골드 손실 0', k.gold, 1e30);
    eq('  레벨 3종 그대로', k.lv, '921,983,926');
    eq('  TRAIN_CAP_STEP 불변', k.step, 100);
    eq('  TRAIN_BONUS 불변', k.bonus, 0.1);
    eq('  trainCapAt(3) = 600 (326 누적합 불변)', k.cap3, 600);
    eq('  trainCapAt(9) = 4500 (326 누적합 불변)', k.cap9, 4500);
    eq('  훈련 3종 불변', k.stats, 'atk,hp,regen');
    eq('  구매 단위 불변', k.qtys, '1,10,30');
    ok(Math.abs(k.cost921 / 9.637e21 - 1) < 0.01, '  112 비용 곡선 불변 — Lv 921 = 9.64e21 골드', k.cost921.toExponential(3));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [R] 되돌림 시험 ---- */
  sec('[R] 되돌림 — 정정 한 줄을 뺀 사본에서 «사도 안 오름» 이 재현된다');
  {
    const CODE = fs.readFileSync(SRC, 'utf8');
    const MARK = '      b.trainStage = Math.min(b.trainStage, k);';
    const hits = CODE.split(MARK).length - 1;
    eq('  R0 전제 — 정정 한 줄이 제품에 정확히 한 번 있다', hits, 1);
    const tmp = path.join(ROOT, 'index.verify483-revert.html');
    fs.writeFileSync(tmp, CODE.replace(MARK, '      /* 483 정정을 뺀 사본 */'));
    try {
      const { ctx, page } = await open(browser, tmp, oldSave(9, [921, 983, 926]));
      const h = await page.evaluate(() => ({ stage: trainStage(), prog: trainProg(), txt: $('trProg').textContent }));
      eq('  R1 — 되돌린 사본은 단계 9 를 그대로 들고 있다', h.stage, 9);
      eq('  R2 — 그리고 진행이 0/2700 에 굳는다 (= 주인이 본 그림)', h.txt, '0/2700');
      const r = await buyOnce(page, 'atk', 1);
      ok(r.after.lv === r.before.lv + 1 && r.after.prog === r.before.prog,
        '  R3 — 레벨은 오르는데 진행은 안 오른다(주인 원문 «훈련 경험치 안올라가더라»)',
        'lv ' + r.before.lv + '→' + r.after.lv + ' · prog ' + r.before.prog + '→' + r.after.prog);
      eq('  R4 — 문구도 안 바뀐다', r.after.txt, r.before.txt);
      /* 음성항 — 되돌린 사본에서도 «새 세이브» 는 멀쩡하다(483 이 고친 것이 이관뿐임을 못박는다) */
      await ctx.close();
      const fresh = await open(browser, tmp, oldSave(1, [7, 7, 7]));
      const fr = await buyOnce(fresh.page, 'atk', 1);
      eq('  R5 음성항 — 되돌린 사본에서도 새 세이브는 +1 (결손은 «이관» 한 자리다)',
        fr.after.prog, fr.before.prog + 1);
      await fresh.ctx.close();
    } finally { fs.unlinkSync(tmp); }
  }

  /* ---- [I] 콘솔 ---- */
  sec('[I] 콘솔');
  ok(allErrs.length === 0, '  콘솔 error / pageerror 0건', allErrs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY483 PASS ' : 'VERIFY483 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
