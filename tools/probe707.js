#!/usr/bin/env node
/* 작업 707 — 재현 (338 규칙: 등재문의 처방을 따르기 **전에** 실제로 찍힌 것부터 본다).
 *
 *   node tools/probe707.js
 *
 * 등재문(707)의 갈래 둘 — 이 자가 가른다:
 *   ⓐ **자** — `verify628.js` 의 `open()` 이 기다리는 조건이 제품 변경(486·660 계열)을 못 따라간다.
 *   ⓑ **제품** — 그 화면(23 훈련 팝업)이 실제로 안 열린다.
 *
 * 등재문이 시킨 대로 **`waitForFunction` 의 술어를 쪼개** 어느 항에서 멎는지부터 찍는다.
 * 그 술어는 `typeof S !== 'undefined' && typeof trainCardData === 'function'
 *            && typeof trDeltaTxt === 'function'` 세 항의 AND 다.
 *
 * 절 —
 *   [1] 술어 세 항을 **따로** 묻는다 — 멎는 항이 하나면 갈래가 그 자리에서 갈린다.
 *   [2] 화면은 열리는가(ⓑ 기각용) — `openTrain()` 뒤 카드 3장이 실제로 그려지는가.
 *   [3] 사라진 함수의 «죽은 이유» — 660 이 남긴 선언 삭제 주석이 제품에 실재하는가.
 *   [4] **628 의 축이 아직 살아 있는가** — 「말하는 수 = 알약이 쓰는 자」.
 *       `trainCardData().gain` 이 아직 배수(`TRAIN_NOW / u.val`)를 곱하는지,
 *       그리고 그 주장이 **실제로 사서 잰 알약 증분**과 맞는지.
 *   [5] 660 이 그 자리에 대신 세운 것 — 델타 플로터 0장 · 아이콘 버스트 n알.
 *   [6] 홀드 정산의 **시점 축**(628 ②) — `trHold.now0` 이 첫 발을 «산 뒤» 자리인가.
 *
 * 이 자는 판정을 안 한다(재현·실측 전용). 처방은 verify628 재작성이 받는다.
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
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined ? '   → ' + d : '')); };
const sec = t => console.log('\n' + t);
const n3 = v => (v == null ? 'n/a' : (+v).toFixed(3));

/* 세이브는 verify628 과 **같은 모양**으로 만든다 — 다른 상태를 보면 재현이 아니다.
   ⚠ `trainStage` 는 넣어도 517 이관이 덮는다 → 실제 축은 `lv`(verify628 STATES 머리말). */
const save = lv => ({ gold: 1e300, dia: 1e9, best: 60, a105: 1, buyQty: 1,
  autoBuy: false, trainStage: 1, lv: { atk: lv, hp: lv, regen: lv } });

/* ⚠ 여기서는 **기다리지 않는다** — 기다리면 이 자가 verify628 과 똑같이 즉사한다.
   그것이 재현할 대상이므로, 로드만 하고 «무엇이 있고 무엇이 없는지» 를 직접 묻는다. */
async function open(browser, sv) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  if (sv) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(sv)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + SRC);
  /* 부팅만 기다린다 — 술어의 **첫 항**만 쓴다(이 항이 멎으면 그때는 진짜 ⓑ 다). */
  await page.waitForFunction(() => typeof S !== 'undefined', null, { timeout: 15000 });
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const CODE = fs.readFileSync(SRC, 'utf8');
  let allErrs = [];

  /* ══════════════ [1] 술어를 쪼갠다 ══════════════ */
  sec('[1] `verify628.js` 84행 `waitForFunction` 술어 — 세 항을 따로 묻는다');
  {
    const { ctx, page, errs } = await open(browser, save(200));
    const T = await page.evaluate(() => ({
      S:              typeof S,
      trainCardData:  typeof trainCardData,
      trDeltaTxt:     typeof trDeltaTxt,
      trHoldGainTxt:  typeof trHoldGainTxt,
      trainGainTxt:   typeof trainGainTxt,
      trainBuyInfo:   typeof trainBuyInfo,
      TRAIN_NOW:      typeof TRAIN_NOW
    }));
    for (const [k, v] of Object.entries(T)) console.log('    ' + k.padEnd(15) + ' = ' + v);
    ok(T.S !== 'undefined',              '[1-a] `S` 는 있다');
    ok(T.trainCardData === 'function',   '[1-b] `trainCardData` 는 있다');
    ok(T.trDeltaTxt === 'undefined',
       '[1-c] ★ `trDeltaTxt` 가 **없다** — 술어가 영원히 안 참이 되는 자리(즉사의 뿌리)', T.trDeltaTxt);
    ok(T.trHoldGainTxt === 'undefined',
       '[1-d] ★ `trHoldGainTxt` 도 같이 없다 — [D]·[E3]·[R3] 도 같은 뿌리로 죽는다', T.trHoldGainTxt);
    allErrs = allErrs.concat(errs); await ctx.close();
  }

  /* ══════════════ [2] 화면은 열리는가 (갈래 ⓑ 기각) ══════════════ */
  sec('[2] 갈래 ⓑ 기각 — 23 훈련 팝업은 실제로 열리는가');
  {
    const { ctx, page, errs } = await open(browser, save(200));
    const V = await page.evaluate(() => {
      openTrain();
      const w = document.getElementById('trw');
      const cards = document.querySelectorAll('#trCards .tr-card');
      return { on: !!(w && w.classList.contains('on')), n: cards.length,
               keys: [...cards].map(c => c.getAttribute('data-tr')),
               cv: [...cards].map(c => c.querySelector('.cv i').textContent) };
    });
    ok(V.on,        '[2-a] `openTrain()` 로 `#trw` 가 열린다', V.on);
    ok(V.n === 3,   '[2-b] 훈련 카드 3장이 그려진다 — 화면은 멀쩡하다', V.n + '장 ' + JSON.stringify(V.keys));
    console.log('    (알약 표시값 ' + JSON.stringify(V.cv) + ')');
    allErrs = allErrs.concat(errs); await ctx.close();
  }

  /* ══════════════ [3] 죽은 이유 — 660 의 선언 삭제 ══════════════ */
  sec('[3] 왜 없어졌는가 — 660 이 남긴 «선언째 삭제» 기록이 제품에 실재한다');
  {
    ok(/660 — `trDeltaTxt\(\)`·`trHoldGainTxt\(\)` 는 \*\*선언째 사라졌다\*\*/.test(CODE),
       '[3-a] `index.html` 에 660 의 삭제 주석이 있다 — 사고가 아니라 **지시**다');
    ok(/628 이 세운 «정산 한 장은 방금 오른 양을 말한다» 는 이 지시로 \*\*은퇴한다\*\*/.test(CODE),
       '[3-b] ★ 660 이 **628 의 계약을 명시적으로 은퇴**시켰다고 적어 뒀다');
    ok(!/function trDeltaTxt|const trDeltaTxt/.test(CODE),
       '[3-c] 선언이 정말로 없다(주석 밖 선언 0건)');
  }

  /* ══════════════ [4] 628 의 «축» 은 아직 살아 있는가 ══════════════ */
  sec('[4] ★ 628 의 축 — 「말하는 수 = 알약이 쓰는 자」 가 데이터에 남아 있는가');
  {
    ok(CODE.includes('const gain = bi.n ? (u.val(l + bi.n) - u.val(l)) * mul : 0;'),
       '[4-a] 축 앵커(`* mul`)가 제품에 실재한다 — 628 의 수리가 살아 있다');
    const { ctx, page, errs } = await open(browser, save(200));
    const R = await page.evaluate(() => {
      openTrain();
      const out = [];
      for (const q of [1, 10, 30]) for (const k of ['atk', 'hp', 'regen']) {
        S.buyQty = q; S.gold = 1e300; markDirty(); renderTrain();
        const claim = (trainCardData().find(c => c.k === k) || {}).gain;   /* 카드가 «말하는» 양 */
        const mul = TRAIN_NOW[k]() / U[k].val(lv(k));
        const before = TRAIN_NOW[k](), baseBefore = U[k].val(lv(k));
        const bought = trainBuy(k);
        renderTrain();
        const realD = TRAIN_NOW[k]() - before;                             /* 실제로 오른 양 */
        const baseD = U[k].val(lv(k)) - baseBefore;                        /* 옛 축(기저) */
        out.push({ k, q, bought, claim, mul, realD, baseD,
                   want: '+' + fmtB(realD), baseWant: '+' + fmtB(baseD) });
      }
      return out;
    });
    const bad = R.filter(r => r.claim !== r.want);
    for (const r of R)
      console.log('    ' + (r.k + ' x' + r.q).padEnd(12) + ' 주장 ' + String(r.claim).padEnd(10)
        + ' 실제 ' + r.want.padEnd(10) + ' 기저 ' + r.baseWant.padEnd(10) + ' 배수 ×' + n3(r.mul));
    ok(R.every(r => r.bought), '[4-b] 아홉 표본 모두 실제로 구매됐다');
    ok(bad.length === 0,
       '[4-c] ★ 카드가 «말하는 증가분» = 실제 최종값 증분 — 628 의 축이 데이터에서 살아 있다',
       bad.map(r => r.k + 'x' + r.q + ' ' + r.claim + '≠' + r.want).join(' · ') || '전부 일치');
    const split = R.filter(r => Math.abs(r.mul - 1) > 1e-9);
    ok(split.length > 0 && split.every(r => r.claim !== r.baseWant),
       '[4-d] ★ 배수 ≠ 1 인 칸에서 옛 «기저» 축과 실제로 **갈린다**(628 이 사라지면 이 항이 죽는다)',
       split.length + '칸 · 최대 벌어짐 '
         + n3(Math.max(...split.map(r => Math.abs(r.realD - r.baseD) / Math.abs(r.baseD) * 100))) + '%');
    /* ⚠ 소비처 — 628 이 고친 그 수를 **지금 누가 읽는가**. 0 이면 «죽은 데이터» 다. */
    const users = (CODE.match(/trainGainTxt/g) || []).length;
    console.log('    (참고) `trainGainTxt` 등장 ' + users + '회 — 1 이면 선언뿐 = 호출부 0');
    console.log('    (참고) 카드 마크업이 `c.gain` 을 그리는가 — '
      + (/\+ c\.gain|c\.gain \+/.test(CODE) ? '그린다' : '**안 그린다**(486: 화면에서는 사라지고 데이터로만 남음)'));
    allErrs = allErrs.concat(errs); await ctx.close();
  }

  /* ══════════════ [5] 660 이 그 자리에 세운 것 ══════════════ */
  sec('[5] 660 이 델타 플로터 자리에 대신 세운 것 — 음성(0장) · 양성(버스트)');
  {
    const { ctx, page, errs } = await open(browser, save(200));
    const F = await page.evaluate(async () => {
      openTrain();
      S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
      for (const L of ['fxl', 'fxlc']) { const e = document.getElementById(L); if (e) e.innerHTML = ''; }
      const card = document.querySelector('#trCards [data-tr="atk"]');
      const seen = new Set(); let delta = 0;
      /* 버스트는 수명이 짧다 — 붙는 순간에 도장을 찍어 누적으로 센다(666·488 방법) */
      const tick = () => {
        for (const el of document.querySelectorAll('.fx-cic')) {
          if (el.__p707 === undefined) el.__p707 = (window.__p707n = (window.__p707n || 0) + 1);
          seen.add(el.__p707);
        }
        delta += document.querySelectorAll('.fx-delta, .fx-plus').length;
      };
      trHoldStart('atk', card);
      const t0 = performance.now();
      await new Promise(res => {
        const f = () => { tick(); (performance.now() - t0 < 900) ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      });
      if (trHold) clearTimeout(trHold.timer);
      trHoldStop(false);
      return { burst: seen.size, delta };
    });
    ok(F.delta === 0, '[5-a] ★ 훈련 강화에 «+n» 숫자 플로터가 **0장**이다(660)', F.delta + '프레임·표본');
    ok(F.burst >= 3,  '[5-b] ★ 그 자리를 **아이콘 버스트**가 대신한다(660)', F.burst + '알');
    allErrs = allErrs.concat(errs); await ctx.close();
  }

  /* ══════════════ [6] 홀드 정산의 «시점» 축 (628 ②) ══════════════ */
  sec('[6] ★ 628 ② 시점 축 — `trHold.now0` 은 첫 발을 «산 뒤» 자리인가');
  {
    ok(CODE.includes('trHold = { key, timer:0, iv:TR_HOLD_IV0, n:1, now0:TRAIN_NOW[key] ? TRAIN_NOW[key]() : null };'),
       '[6-a] 시점 앵커가 제품에 실재한다 — 628 이 세운 `now0`');
    const { ctx, page, errs } = await open(browser, save(200));
    const H = await page.evaluate(() => {
      openTrain();
      S.buyQty = 1; S.gold = 1e300; markDirty(); renderTrain();
      const before = TRAIN_NOW.atk();                       /* 첫 발을 사기 **전** */
      trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
      const afterFirst = TRAIN_NOW.atk();                   /* 첫 발을 산 **뒤** */
      const now0 = trHold ? trHold.now0 : null;
      if (trHold) clearTimeout(trHold.timer);
      for (let i = 0; i < 5; i++) { if (!trHold) break; clearTimeout(trHold.timer); trHoldTick(); }
      if (trHold) clearTimeout(trHold.timer);
      const n = trHold ? trHold.n : 0;
      const end = TRAIN_NOW.atk();
      trHoldStop(false);
      return { before, afterFirst, now0, n, end };
    });
    console.log('    첫 발 전 ' + n3(H.before) + ' → 첫 발 뒤 ' + n3(H.afterFirst)
      + ' → 5틱 뒤 ' + n3(H.end) + ' · now0 = ' + n3(H.now0) + ' · n = ' + H.n);
    ok(H.now0 !== null && Math.abs(H.now0 - H.afterFirst) < 1e-6,
       '[6-b] ★ `now0` = «첫 발을 산 뒤» — 반복분에 첫 발 몫이 안 섞인다',
       n3(H.now0) + ' ≟ ' + n3(H.afterFirst) + '(첫 발 전은 ' + n3(H.before) + ')');
    ok(H.n > 1, '[6-c] 반복분이 실제로 돌았다(h.n > 1) — 정산이 뜨는 조건', H.n + '틱');
    ok(H.end - H.now0 > 0, '[6-d] 반복분이 올린 양 > 0', n3(H.end - H.now0));
    allErrs = allErrs.concat(errs); await ctx.close();
  }

  sec('[I] 콘솔');
  ok(allErrs.length === 0, '콘솔 error / pageerror 0건', allErrs.slice(0, 4).join(' | '));

  await browser.close();
  console.log('\nPROBE707 ' + (fail ? 'FAIL ' : 'OK ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
