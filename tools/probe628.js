#!/usr/bin/env node
/* 작업 628 — 「훈련 델타 플로터 «+n» 이 실제 스탯 증분과 어긋난다」 **재현**
 * (338 규칙 — 처방 전에 먼저 제품에게 묻는다. 등재문의 ⓐ·ⓑ 는 실측으로만 가른다.)
 *
 *   node tools/probe628.js
 *
 * 등재문의 주장:
 *   «`trDeltaTxt` = «+20» 인 상태에서 `trainBuy('atk')` 1회의 `stat.dmg` 증분 = +24.484512»
 *   뿌리 후보 — 카드 `.cv` 알약은 486 이 «지금 최종값»(`TRAIN_NOW` = `stat.*`)으로 바꿨는데
 *   «+n» 줄(`trainCardData().gain`)은 옛 축(`u.val()` 기저)에 남아, **같은 카드 안에서
 *   두 수가 서로 다른 자를 쓴다.**
 *
 * 이 프로브는 그것을 믿지 않고 **찍힌 값**으로 다시 묻는다:
 *
 *   [A] 축 — `stat.*`(최종) ↔ `U[k].val(lv)`(기저) 의 배수가 실제로 1 이 아닌가.
 *       배수가 1 이면 «어긋난다» 는 말 자체가 성립하지 않는다(등재문 기각).
 *   [B] 첫 발 — 세 스탯 × 배수 탭 3종(x1/x10/x30). 구매 «전» 에 `trDeltaTxt` 가 말하는 수와,
 *       같은 구매의 **실제 `TRAIN_NOW` 증분**을 나란히 잰다. 플로터가 거짓말하는 폭(%)이 나온다.
 *   [C] 알약 축 — 카드 `.cv` 가 정말 최종값인가(= 486 이 옮긴 그 자리인가).
 *       [B] 의 «어긋남» 이 «플로터가 틀렸다» 인지 «알약이 틀렸다» 인지는 이것이 가른다.
 *   [D] 찍힌 노드 — 실제 카드를 눌러 `#fxl` 에 뜬 플로터 문자열을 읽는다(계산이 아니라 화면).
 *   [E] 홀드 정산 — `trHoldStop` 은 `trDeltaTxt` 를 **구매 «뒤»** 에 부른다(첫 발은 «앞»).
 *       그 한 장이 «홀드 동안 오른 양» 을 말하는지 «다음에 오를 양» 을 말하는지 가른다.
 *
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(338·344 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };
const n3 = v => (v == null ? 'n/a' : (+v).toFixed(3));

const KEYS = ['atk', 'hp', 'regen'];
const QTYS = [1, 10, 30];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function'
    && typeof trDeltaTxt === 'function' && typeof TRAIN_NOW !== 'undefined');
  await p.waitForTimeout(1200);

  /* 배수가 1 이 아닌 표본을 만든다 — 배수가 1 이면 이 작업의 결함이 «보이지 않는다».
     ⚠ 손으로 `bonus()` 를 흉내 내지 않는다. 실제 축(훈련 단계)을 올려 제품이 스스로 곱하게 둔다. */
  await p.evaluate(() => {
    S.gold = 5e8;
    S.trainStage = 3;                 /* 단계당 전 스탯 +10% 누적 → 배수가 1 에서 떨어진다 */
    markDirty();
    openTrain();
  });
  await p.waitForTimeout(400);

  console.log('\n=== [A] 축 — 최종값 ↔ 기저값의 배수 ===');
  const A = await p.evaluate((keys) => {
    const out = {};
    for (const k of keys) {
      const base = U[k].val(lv(k)), now = TRAIN_NOW[k]();
      out[k] = { lv: lv(k), base, now, mul: now / base };
    }
    out.stage = S.trainStage;
    return out;
  }, KEYS);
  console.log('  훈련 단계 ' + A.stage);
  for (const k of KEYS)
    console.log('  · ' + k + ' Lv.' + A[k].lv + ' — 기저 ' + n3(A[k].base)
      + ' · 최종 ' + n3(A[k].now) + ' · 배수 ×' + n3(A[k].mul));
  ok(KEYS.every(k => Math.abs(A[k].mul - 1) > 1e-9),
     '[A1] 세 스탯 모두 배수가 1 이 아니다 — «최종 ↔ 기저» 가 갈리는 표본이 맞다',
     KEYS.map(k => k + ' ×' + n3(A[k].mul)).join(' · '));

  console.log('\n=== [B] 첫 발 — 플로터가 말하는 수 ↔ 실제 최종값 증분 ===');
  const B = await p.evaluate((cfg) => {
    const rows = [];
    for (const q of cfg.QTYS) {
      for (const k of cfg.KEYS) {
        S.buyQty = q;
        S.gold = 5e8;
        renderTrain();
        const card = document.querySelector('#trCards [data-tr="' + k + '"]');
        const bi = trainBuyInfo(k);
        const txt = trDeltaTxt(card);                 /* 구매 «전» — 첫 발이 잡는 그 문자열 */
        const before = TRAIN_NOW[k]();
        const baseBefore = U[k].val(lv(k));
        const bought = trainBuy(k);
        const after = TRAIN_NOW[k]();
        const baseAfter = U[k].val(lv(k));
        /* ⚠ 자 주의 — `fmtB` 는 큰 수를 «1.00A» 로 접는다. 문자열을 parseFloat 로 읽으면
           1000 이 1 로 읽혀 **제품이 아니라 프로브가** 틀린다(1회차에 [B1] 이 그랬다).
           ⇒ 비교는 «같은 fmtB 를 통과시킨 문자열» 끼리 한다. 오차 %만 생수치로 낸다. */
        rows.push({ k, q, n: bi.n, bought, txt,
                    realD: after - before, baseD: baseAfter - baseBefore,
                    fBase: '+' + fmtB(baseAfter - baseBefore),
                    fReal: '+' + fmtB(after - before),
                    /* ⚠ 자 주의 2 — `fmtG` 는 `Math.floor` 다. «전·후를 재서 뺀» 실측은 부동소수
                       누적이 붙어 180 이 179.99999999 로 내려앉고, floor 가 그 한 칸을 통째로
                       깎는다(regen x10 이 그랬다). 제품 쪽은 곱셈 한 번이라 180.0 이 정확하다 —
                       **제품이 아니라 이 뺄셈이 흔들린 것**이므로 한 자리 nudge 를 허용한다. */
                    fRealEps: '+' + fmtB((after - before) * (1 + 1e-9)) });
      }
    }
    return rows;
  }, { KEYS, QTYS });

  let worst = 0, worstRow = null;
  for (const r of B) {
    const err = r.realD ? Math.abs(r.baseD - r.realD) / r.realD * 100 : 0;   /* 두 축이 벌어진 폭 */
    if (err > worst) { worst = err; worstRow = r; }
    console.log('  · ' + r.k + ' x' + r.q + '(n=' + r.n + ') — 플로터 "' + r.txt + '"'
      + ' · 최종 증분 ' + n3(r.realD) + '("' + r.fReal + '")'
      + ' · 기저 증분 ' + n3(r.baseD) + '("' + r.fBase + '")'
      + ' · 두 축 차 ' + err.toFixed(1) + '%');
  }
  ok(B.every(r => r.bought), '[B0] 아홉 표본 모두 실제로 구매됐다 — 표본이 비지 않았다',
     B.filter(r => !r.bought).length + '건 실패');
  ok(worst > 1,
     '[B1] ★ 두 축이 실제로 갈린다 — «기저 ↔ 최종» 이 같은 수가 아니다(전제)',
     '최악 ' + worst.toFixed(1) + '% (' + (worstRow ? worstRow.k + ' x' + worstRow.q : '-') + ')');
  ok(B.every(r => r.txt !== r.fBase),
     '[B2] ★ 플로터가 더는 **기저 증분**을 말하지 않는다 (수리 전에는 아홉 표본 전부 기저였다)',
     B.filter(r => r.txt === r.fBase).map(r => r.k + 'x' + r.q).join(' · ') || '기저와 겹치는 표본 0건');
  ok(B.every(r => r.txt === r.fReal || r.txt === r.fRealEps),
     '[B3] ★ 플로터가 말하는 수 = 실제 최종 증분이다',
     B.filter(r => r.txt !== r.fReal && r.txt !== r.fRealEps)
      .map(r => r.k + 'x' + r.q + ' "' + r.txt + '"≠"' + r.fReal + '"').join(' · ') || '전부 일치');

  console.log('\n=== [C] 알약 축 — 카드 `.cv` 는 최종값인가(486 자리) ===');
  const C = await p.evaluate((keys) => {
    S.buyQty = 1; renderTrain();
    const out = {};
    for (const k of keys) {
      const card = document.querySelector('#trCards [data-tr="' + k + '"]');
      const cv = card && card.querySelector('.cv');
      out[k] = { shown: cv ? cv.textContent.trim() : null,
                 now: fmtB(TRAIN_NOW[k]()), base: fmtB(U[k].val(lv(k))) };
    }
    return out;
  }, KEYS);
  for (const k of KEYS)
    console.log('  · ' + k + ' — 알약 "' + C[k].shown + '" · 최종 "' + C[k].now + '" · 기저 "' + C[k].base + '"');
  ok(KEYS.every(k => C[k].shown === C[k].now),
     '[C1] ★ 알약은 «지금 최종값» 이다 — 틀린 쪽은 알약이 아니라 «+n» 줄이다',
     KEYS.map(k => k + ' ' + (C[k].shown === C[k].now ? '일치' : '어긋남')).join(' · '));

  console.log('\n=== [D] 찍힌 노드 — 실제 카드를 눌러 뜬 플로터 문자열 ===');
  await p.evaluate(() => {
    S.buyQty = 1; S.gold = 5e8; renderTrain();
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
  });
  await p.waitForTimeout(120);
  const D = await (async () => {
    const el = await p.$('#trCards [data-tr="atk"]');
    const before = await p.evaluate(() => TRAIN_NOW.atk());
    const bx = await el.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.mouse.down();
    await p.waitForTimeout(60);
    await p.mouse.up();
    await p.waitForTimeout(160);
    return await p.evaluate((before) => {
      const txt = [...document.querySelectorAll('#fxl .fx-plus')].map(n => n.textContent.trim());
      const d = TRAIN_NOW.atk() - before;
      return { txt, realD: d, fReal: '+' + fmtB(d) };
    }, before);
  })();
  console.log('  플로터 노드 [' + D.txt.join(' | ') + '] · 실제 최종 증분 ' + n3(D.realD) + '("' + D.fReal + '")');
  ok(D.txt.length > 0, '[D1] 첫 발에 플로터가 실제로 뜬다 — 자리가 살아 있다', D.txt.length + '장');
  ok(D.txt.some(t => t === D.fReal),
     '[D2] ★ **찍힌** 플로터의 수 = 실제 최종 증분 (수리 «후» 에만 초록)',
     '[' + D.txt.join(' | ') + '] vs "' + D.fReal + '"');

  console.log('\n=== [E] 홀드 정산 — `trHoldStop` 의 한 장은 무엇을 말하는가 ===');
  const E = await p.evaluate(() => {
    S.buyQty = 1; S.gold = 5e8; renderTrain();
    /* 홀드를 «제품 경로 그대로» 굴린다 — trHoldStart 로 첫 발, trHoldTick 으로 반복 4회.
       그러면 `now0`(수리 후)·호출 시점(수리 전 공통)이 실제와 같은 자리에서 잡힌다. */
    trHoldStart('atk', document.querySelector('#trCards [data-tr="atk"]'));
    const now0 = TRAIN_NOW.atk();                 /* 반복분의 기준 = 첫 발을 산 뒤 */
    const base0 = U.atk.val(lv('atk'));
    if (trHold) clearTimeout(trHold.timer);       /* 타이머 대신 손으로 4틱 */
    for (let i = 0; i < 4; i++) { if (!trHold) break; clearTimeout(trHold.timer); trHoldTick(); }
    if (trHold) clearTimeout(trHold.timer);
    const h = trHold;
    const after = TRAIN_NOW.atk();
    const repD = after - now0, repBaseD = U.atk.val(lv('atk')) - base0;
    const nextBaseD = U.atk.val(lv('atk') + 1) - U.atk.val(lv('atk'));
    /* 정산이 실제로 쓰는 문자열 */
    const stopTxt = typeof trHoldGainTxt === 'function'
      ? trHoldGainTxt(h)                                        /* 수리 후 */
      : trDeltaTxt(document.querySelector('#trCards [data-tr="atk"]'));  /* 수리 전 */
    trHoldStop(false);
    return { stopTxt, n: h ? h.n : 0, repD, repBaseD, nextBaseD,
             fRep: '+' + fmtB(repD), fNext: '+' + fmtB(nextBaseD),
             hasHelper: typeof trHoldGainTxt === 'function' };
  });
  console.log('  홀드 ' + E.n + '틱 — 정산 문구 "' + E.stopTxt + '"'
    + ' · 반복분이 올린 최종값 ' + n3(E.repD) + '("' + E.fRep + '")'
    + ' · 반복분 기저 ' + n3(E.repBaseD)
    + ' · «다음 1회» 기저 ' + n3(E.nextBaseD) + '("' + E.fNext + '")');
  ok(E.n > 1, '[E0] 반복분이 실제로 돌았다 — 정산 한 장이 뜨는 조건(h.n > 1)이다', E.n + '틱');
  ok(E.stopTxt !== E.fNext,
     '[E1] ★ 정산 한 장이 더는 «다음에 오를 양» 이 아니다 (수리 전에는 "+20" = 다음 1회 기저였다)',
     '"' + E.stopTxt + '" vs 다음 "' + E.fNext + '"');
  ok(E.stopTxt === E.fRep,
     '[E2] ★ 정산 한 장 = **반복분이 실제로 올린 최종값** (수리 «후» 에만 초록)',
     '"' + E.stopTxt + '" ≟ "' + E.fRep + '"');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  await b.close();
  console.log('\nPROBE628 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
