#!/usr/bin/env node
/* 517 검증 — 훈련 단계 돌파 필요 경험치는 «구간표» 다 (저장소 주인 지시 2026-08-31 · 326 번복)
 *
 *   node tools/verify517.js
 *
 * 주인 원문: «훈련에 필요 경험치 / 1~4단계 300 / 5~7단계 600 / 8이후로는 900 / 으로 하기»
 *
 * 계약 두 줄 —
 *   ① 단계 n 을 돌파하는 «그 단계 몫»(3종 합)은 **300(1~4) · 600(5~7) · 900(8 이후 고정)** 이고,
 *      상한은 그 몫의 누적합이다. 식은 **표 + 접근자 한 벌**뿐이다(500 선례).
 *   ② 상한이 «작아지는» 개정이므로 **세이브 이관이 있다** — 이미 산 레벨은 한 톨도 안 깎고,
 *      단계를 그 레벨이 허락하는 자리(«자연 단계»)에 세운다. 한 단계도 더 주지 않는다.
 *
 * 재현 `tools/probe517.js` 가 처방 전에 셋을 확인했다:
 *   · 상한이 작아지는 세이브는 등재문의 «9단계» 가 아니라 **2단계 이상 전부**다(§B).
 *   · 이관을 안 하면 로드 즉시 진행바가 꽉 차고 [↑] 가 **연쇄로** 눌린다(§C2 — 단계 4 → 10, 6회).
 *   · 그 연쇄의 끝이 곧 «자연 단계» 다 ⇒ 이관은 «선물» 이 아니라 그 6번을 로드 시점에 접는 것이다.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [A] 구간표 — 단계 1~14 의 몫(3종 합)이 주인 표 그대로 · 8 이후 900 고정
 *   [B] 항등식 — `capAt(n) − capAt(n−1) = 몫(n)/3` · `trainMax() = 몫(단계)` (183 회귀)
 *   [C] 진행바 — 단계 1·5·8 의 분모가 «/300»·«/600»·«/900» · 단계 업 직후 정확히 0
 *   [D] 이관 — 구 세이브 실로드(326 규칙 · 326 이전 · 신 규칙) 3종. 레벨 손실 0 · 폭등 0 · 멱등
 *   [E] 구매 경로 — room·x30 잘림·자동 구매가 전부 새 `trainCap()` 을 따른다
 *   [F] 안 건드린 축 — TRAIN_BONUS · 비용 곡선 상수 · TRAIN_STATS · 옛 상수 이름 0건
 *   [R] 되돌림 — ⓐ 몫을 «300n» 으로 되돌린 사본은 계약 위반 ⓑ 이관 한 줄을 뺀 사본은 폭등 재현
 *   [G] 콘솔·페이지 에러 0
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

/* 주인 표 — 게이트는 제품 식을 베끼지 않고 **주인이 말한 값**을 따로 적는다 */
const NEED = n => (n <= 4 ? 300 : n <= 7 ? 600 : 900);        /* 3종 합 */
const CAP = n => { let s = 0; for (let k = 1; k <= n; k++) s += NEED(k) / 3; return s; };
const OLD326 = n => 100 * n * (n + 1) / 2;                     /* 326 누적합 — 구 세이브를 만들 때만 */
const NAT = l => { let n = 1; while (CAP(n) <= l) n++; return n; };   /* 자연 단계 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const eq = (m, got, want) => ok(got === want, m, 'got ' + got + ' · want ' + want);
const sec = t => console.log('\n' + t);

const mkSave = (stage, l) => ({
  gold: 1e30, dia: 1e9, best: 60, a105: 1, buyQty: 1, autoBuy: false,
  trainStage: stage, lv: { atk: l, hp: l, regen: l },
});

async function open(browser, file, save, openTrain) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainProg === 'function');
  await page.evaluate(o => { step = () => {}; S.autoBuy = false; if (o) openTrain(); }, openTrain !== false);
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  let allErrs = [];
  const CODE = fs.readFileSync(SRC, 'utf8');

  /* ---- [A] 구간표 ---- */
  sec('[A] 구간표 — 주인 표 그대로 (1~4 300 · 5~7 600 · 8 이후 900 고정)');
  {
    const { ctx, page, errs } = await open(browser, SRC, null);
    const r = await page.evaluate(() => {
      const a = [];
      for (let n = 1; n <= 14; n++) a.push({ n, need: trainNeedAt(n), cap: trainCapAt(n), step: trainStepAt(n) });
      return { a, len: TRAIN_NEED.length, tbl: TRAIN_NEED.slice() };
    });
    r.a.forEach(x => eq('  단계 ' + x.n + ' 몫(3종 합) = ' + NEED(x.n), x.need, NEED(x.n)));
    ok(r.a.every(x => x.cap === CAP(x.n)), '  상한이 그 몫의 누적합이다(단계 1~14 전수)',
      r.a.map(x => x.cap).join(','));
    ok(r.a.every(x => x.step === NEED(x.n) / 3), '  스탯당 몫 = 3종 합 / 3 (100 · 200 · 300)');
    eq('  표는 8칸에서 끝난다(그 뒤는 마지막 값 고정)', r.len, 8);
    eq('  표 값 그대로', r.tbl.join(','), '300,300,300,300,600,600,600,900');
    /* 음성항 — 326 의 «증가식» 이 아니다 */
    ok(r.a.every(x => x.cap !== OLD326(x.n) || x.n === 1), '  326 누적합(100·n(n+1)/2)이 아니다 (단계 1 만 우연히 같다)');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [B] 항등식 (183 회귀) ---- */
  sec('[B] 항등식 — cap(n) − cap(n−1) = 몫(n)/3 · trainMax() = 몫(단계)');
  {
    const { ctx, page, errs } = await open(browser, SRC, null);
    const r = await page.evaluate(() => {
      const id = [], mx = [];
      for (let n = 1; n <= 14; n++) {
        id.push(trainCapAt(n) - trainCapAt(n - 1) === trainNeedAt(n) / TRAIN_STATS.length);
        S.trainStage = n; mx.push({ n, max: trainMax(), base: trainBase(), cap: trainCap() });
      }
      S.trainStage = 1;
      return { id, mx };
    });
    ok(r.id.every(Boolean), '  단계 1~14 전수 — 항등식 성립', r.id.join(','));
    r.mx.forEach(x => eq('  단계 ' + x.n + ' 분모 = ' + NEED(x.n), x.max, NEED(x.n)));
    ok(r.mx.every(x => x.cap - x.base === NEED(x.n) / 3),
      '  cap − base = 이번 단계 몫(스탯당) — 진행바가 «0 에서 시작해 꽉 차면 돌파»');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [C] 진행바 ---- */
  sec('[C] 진행바 — 분모가 «/300»·«/600»·«/900» · 단계 업 직후 정확히 0');
  for (const n of [1, 5, 8]) {
    const L = CAP(n - 1);                                   /* 그 단계 시작 자리(= 이전 단계 상한) */
    const { ctx, page, errs } = await open(browser, SRC, mkSave(n, L));
    const h = await page.evaluate(() => ({ stage: trainStage(), txt: $('trProg').textContent, w: $('trFill').style.width }));
    eq('  단계 ' + n + ' — 이관이 그 단계를 그대로 둔다', h.stage, n);
    eq('  단계 ' + n + ' — 진행 문구 «0/' + NEED(n) + '»', h.txt, '0/' + NEED(n));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 단계 4 → 5 : 몫이 300 → 600 으로 «바뀌는 경계» 에서 183 규약이 사는가.
       ⚠ 표본은 상한 «한 칸 아래» 에서 시작해 사서 채운다 — 세이브에 상한을 정확히 적으면
       그 세이브의 자연 단계가 이미 5 라 이관이 (옳게) 한 칸 올려 경계를 못 본다. */
    const { ctx, page, errs } = await open(browser, SRC, mkSave(4, CAP(4) - 1));
    const r = await page.evaluate(() => {
      S.buyQty = 1;
      TRAIN_STATS.forEach(id => trainBuy(id));               /* 3종 상한까지 */
      renderTrainLive();
      const b = { stage: trainStage(), ready: trainReady(), txt: $('trProg').textContent };
      trainUp(); if (typeof closeModal === 'function') closeModal();
      renderTrainLive();
      return { b, stage: trainStage(), prog: trainProg(), max: trainMax(), txt: $('trProg').textContent };
    });
    eq('  경계 전 — 단계 4 · 진행 «300/300»', r.b.stage + ':' + r.b.txt, '4:300/300');
    ok(r.b.ready === true, '  경계 전 — [↑] 가 열려 있다', String(r.b.ready));
    eq('  [↑] 뒤 단계 5', r.stage, 5);
    eq('  [↑] 직후 진행 0 (183 규약)', r.prog, 0);
    eq('  [↑] 직후 분모가 600 으로 바뀐다', r.max, 600);
    eq('  문구도 «0/600»', r.txt, '0/600');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [D] 세이브 이관 ---- */
  sec('[D] 이관 — 구 세이브 실로드. 레벨 손실 0 · 단계 폭등 0 · 멱등');
  for (const n of [2, 4, 5, 8, 9, 12]) {
    const L = OLD326(n);                                     /* 326 규칙을 지켜 자란 세이브 */
    const { ctx, page, errs } = await open(browser, SRC, mkSave(n, L));
    const h = await page.evaluate(() => ({
      stage: trainStage(), lv: S.lv.atk | 0, gold: S.gold, ready: trainReady(),
      prog: trainProg(), max: trainMax(), base: trainBase(), cap: trainCap(),
    }));
    eq('  326 세이브 단계 ' + n + '(lv ' + L + ') → 자연 단계 ' + NAT(L), h.stage, NAT(L));
    eq('  단계 ' + n + ' — 레벨은 한 톨도 안 깎였다', h.lv, L);
    ok(h.prog >= 0 && h.prog < h.max, '  진행이 눈금 «안» 에 있다 (' + h.prog + '/' + h.max + ')');
    ok(h.ready === false, '  로드 직후 [↑] 가 열려 있지 않다 — 폭등 0건', String(h.ready));
    ok(h.base <= h.lv, '  기저 ' + h.base + ' ≤ lv ' + h.lv + ' — 진행이 0 에 굳지 않는다');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 326 이전(단계당 100 고정)으로 자란 세이브 — 483 이 세운 «내리는» 방향 */
    const { ctx, page, errs } = await open(browser, SRC, mkSave(9, 900));
    const h = await page.evaluate(() => ({ stage: trainStage(), lv: S.lv.atk | 0, txt: $('trProg').textContent }));
    eq('  326 이전 세이브(단계 9 · lv 900) → 단계 7 (483 방향 유지)', h.stage, 7);
    eq('  레벨 그대로', h.lv, 900);
    eq('  진행 «300/600»', h.txt, '300/600');
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  for (const n of [1, 3, 6, 9]) {
    /* 신 규칙을 지켜 자란 «정상» 세이브 — 이관이 한 글자도 안 닿는다 · 멱등 */
    const L = CAP(n - 1) + 5;
    const { ctx, page, errs } = await open(browser, SRC, mkSave(n, L));
    const h = await page.evaluate(() => ({ stage: trainStage(), lv: S.lv.atk | 0 }));
    eq('  신 규칙 세이브 단계 ' + n + ' — 그대로', h.stage, n);
    eq('  신 규칙 세이브 단계 ' + n + ' — 레벨 그대로', h.lv, L);
    const again = await page.evaluate(() => { save(); load(); return { stage: trainStage(), lv: S.lv.atk | 0 }; });
    ok(again.stage === n && again.lv === L, '  두 번 돌아도 같다(멱등)', JSON.stringify(again));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [E] 구매 경로 ---- */
  sec('[E] 구매 경로 — room·x30 잘림·자동 구매가 전부 새 상한을 따른다');
  {
    const { ctx, page, errs } = await open(browser, SRC, mkSave(5, CAP(5) - 3));   /* 상한 3칸 앞 */
    const r = await page.evaluate(() => {
      S.buyQty = 30;
      const bi = trainBuyInfo('atk');
      trainBuy('atk'); renderTrainLive();
      const full = trainBuyInfo('atk');
      const mid = { prog: trainProg(), max: trainMax() };
      TRAIN_STATS.forEach(id => trainBuy(id));               /* 나머지 둘도 상한까지 */
      renderTrainLive();
      return { n: bi.n, cap: trainCap(), lv: lv('atk'), full: full.full, mid,
               prog: trainProg(), max: trainMax(), ready: trainReady() };
    });
    eq('  상한 3칸 앞에서 x30 — room 으로 3 만 산다', r.n, 3);
    eq('  상한은 새 표의 cap(5)', r.cap, CAP(5));
    eq('  레벨이 상한에서 멈춘다', r.lv, CAP(5));
    ok(r.full === true, '  상한에서는 «상한» 표시', String(r.full));
    eq('  한 종만 채운 자리 — 나머지 둘의 몫이 남아 있다', r.mid.prog + '/' + r.mid.max, '594/600');
    eq('  3종을 다 채우면 꽉 찬다', r.prog + '/' + r.max, NEED(5) + '/' + NEED(5));
    ok(r.ready === true, '  그때 [↑] 가 열린다', String(r.ready));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 자동 구매(autoBuyTick)도 새 상한 위로는 안 산다.
       ⚠ 표본은 상한 «한 칸 아래» 다 — 정확히 상한이면 그 세이브의 자연 단계는 다음 단계라
       이관이 (옳게) 한 칸 올려 버려서 «상한을 지키는가» 를 못 묻는다. */
    const { ctx, page, errs } = await open(browser, SRC, mkSave(3, CAP(3) - 1));
    const r = await page.evaluate(() => {
      S.autoBuy = true;
      for (let i = 0; i < 200; i++) autoBuyTick(1);
      return { lv: TRAIN_STATS.map(id => lv(id)), cap: trainCap(), stage: trainStage(), ready: trainReady() };
    });
    eq('  표본이 단계 3 에 그대로 있다(이관 무영향)', r.stage, 3);
    ok(r.lv.every(v => v === CAP(3)), '  자동 구매가 상한(' + CAP(3) + ')에서 정확히 멈춘다', r.lv.join('/'));
    ok(r.ready === true, '  3종이 상한이라 [↑] 가 열린다 — 자동 구매는 단계를 스스로 안 올린다', String(r.ready));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }

  /* ---- [F] 안 건드린 축 ---- */
  sec('[F] 안 건드린 축 — 단계 보너스 · 비용 곡선 · 스탯 3종 · 옛 상수 이름 0건');
  {
    const { ctx, page, errs } = await open(browser, SRC, null);
    const k = await page.evaluate(() => ({
      bonus: TRAIN_BONUS, knee: TRAIN_KNEE, r: TRAIN_COST_R, stats: TRAIN_STATS.slice(),
      valk: TRAIN_VAL_K, c0: U.atk.cost(0), c40: U.atk.cost(40),
    }));
    eq('  TRAIN_BONUS 불변', k.bonus, 0.10);
    eq('  TRAIN_STATS 3종 불변', k.stats.join(','), 'atk,hp,regen');
    eq('  TRAIN_VAL_K 불변(168)', JSON.stringify(k.valk), JSON.stringify({ atk: 20, hp: 100, regen: 15 }));
    ok(k.knee !== undefined && k.r !== undefined, '  비용 곡선 상수(112)가 그대로 있다',
      k.knee + ' / ' + k.r);
    ok(Math.abs(k.c0 - 45) < 1e-9, '  비용 곡선 Lv0 값 불변', String(k.c0));
    allErrs = allErrs.concat(errs);
    await ctx.close();
  }
  {
    /* 500 선례 — 옛 상수는 «이름째» 사라진다(주석 포함). 남으면 되살아난다(LESSONS 295-②) */
    const hits = (CODE.match(/TRAIN_CAP_STEP/g) || []).length;
    eq('  옛 상수 이름이 소스에 0건', hits, 0);
    /* 자·시뮬 쪽은 «주석에 적힌 옛 이름» 과 «실제로 읽는 옛 이름» 을 갈라서 본다 —
       326 의 되돌림 감시처럼 주석·정규식 문서에 이름이 남는 것은 정상이고,
       코드가 그 상수를 **읽으면** 표를 갈 때 조용히 갈라진다(그 자리가 이관 대상이다). */
    const codeOnly = s => s.split('\n')
      .filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    const tools = fs.readdirSync(path.join(ROOT, 'tools'))
      .filter(f => /\.js$/.test(f) && f !== 'verify517.js')
      .filter(f => /TRAIN_CAP_STEP/.test(codeOnly(fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8'))));
    eq('  tools/ 의 자·시뮬 코드가 옛 상수를 안 읽는다(이관 완료)', tools.join(','), '');
    /* 식이 두 벌이 되지 않았는가 — 누적합을 손으로 다시 적은 자리가 없다 */
    ok(!/n\s*\*\s*\(\s*n\s*\+\s*1\s*\)\s*\/\s*2/.test(CODE.slice(CODE.indexOf('const TRAIN_NEED'), CODE.indexOf('const trainReady'))),
      '  훈련 구간에 옛 누적합 닫힌식이 남아 있지 않다');
  }

  /* ---- [R] 되돌림 시험 ---- */
  sec('[R] 되돌림 — 무르게 푼 수리가 아님을 사본 둘로 못박는다');
  {
    /* ⓐ 몫을 «300n»(326)으로 되돌린 사본 — [A]·[C] 의 계약이 깨진다 */
    const MARK_A = 'const trainNeedAt = n => TRAIN_NEED[Math.min(Math.max(1, Math.floor(n) || 1), TRAIN_NEED.length) - 1];';
    eq('  R0-a 전제 — 접근자가 제품에 정확히 한 번 있다', CODE.split(MARK_A).length - 1, 1);
    const tmpA = path.join(ROOT, 'index.verify517-revert-a.html');
    fs.writeFileSync(tmpA, CODE.replace(MARK_A, 'const trainNeedAt = n => 300 * Math.max(1, Math.floor(n) || 1);'));
    try {
      const { ctx, page, errs } = await open(browser, tmpA, null);
      const r = await page.evaluate(() => {
        S.trainStage = 5; const m5 = trainMax();
        S.trainStage = 9; const c9 = trainCap();
        S.trainStage = 1;
        return { m5, c9 };
      });
      ok(r.m5 !== 600, '  R-a 몫을 300n 으로 되돌리면 5단계 분모가 600 이 아니다 (' + r.m5 + ')');
      ok(r.c9 !== CAP(9), '  R-a 되돌린 사본의 9단계 상한이 1,600 이 아니다 (' + r.c9 + ')');
      allErrs = allErrs.concat(errs);
      await ctx.close();
    } finally { fs.unlinkSync(tmpA); }
  }
  {
    /* ⓑ 이관 한 줄을 뺀 사본 — probe517 §C 의 «폭등» 이 그대로 재현된다 */
    const MARK_B = '      b.trainStage = trainStageFor(lo);';
    ok(CODE.split(MARK_B).length - 1 === 1, '  R0-b 전제 — 이관 한 줄이 제품에 정확히 한 번 있다');
    const tmpB = path.join(ROOT, 'index.verify517-revert-b.html');
    fs.writeFileSync(tmpB, CODE.replace(MARK_B, '      /* 517 이관을 뺀 사본 */'));
    try {
      const { ctx, page, errs } = await open(browser, tmpB, mkSave(9, OLD326(9)));
      const r = await page.evaluate(() => {
        const b = { stage: trainStage(), ready: trainReady(), prog: trainProg(), max: trainMax() };
        let n = 0; while (trainReady() && n < 200) { trainUp(); n++; }
        return { b, presses: n, to: trainStage() };
      });
      eq('  R-b 이관을 빼면 단계가 9 에 그대로 남는다', r.b.stage, 9);
      ok(r.b.ready === true && r.b.prog === r.b.max,
        '  R-b 진행바가 로드 즉시 꽉 차고 [↑] 가 열린다 (' + r.b.prog + '/' + r.b.max + ')');
      ok(r.presses >= 8, '  R-b [↑] 가 연쇄로 눌린다 (' + r.presses + '회 → 단계 ' + r.to + ')');
      eq('  R-b 그 연쇄의 끝은 이관이 세우는 자리와 같다', r.to, NAT(OLD326(9)));
      allErrs = allErrs.concat(errs);
      await ctx.close();
    } finally { fs.unlinkSync(tmpB); }
  }

  /* ---- [G] 콘솔 ---- */
  sec('[G] 콘솔');
  eq('  콘솔 error / pageerror 0건', allErrs.length, 0);
  if (allErrs.length) allErrs.slice(0, 6).forEach(e => console.log('     · ' + e));

  await browser.close();
  console.log('\nVERIFY517 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
