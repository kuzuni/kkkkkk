/* 842 재현 — 하루 예산이 소진되면 오프라인 보상이 «조용히» 아무 말도 안 한다 (338 규칙: 처방 전에 재현)
 *
 *   node tools/probe842.js [--before=<파일>] [--after=<파일>]
 *
 * 왜 이 자가 필요한가 — 등재문(199 25회차 비평가 AAT 관측)은 «부지런 유저는 하루 첫 수령 한 번에
 * 예산을 다 쓰고 나머지 3회가 무반응» 이라고 적었다. 그런데 `offlineReward()` 의 `if(sec < 60) return`
 * 은 **두 가지 서로 다른 상황**을 같은 침묵으로 처리한다:
 *     ⓐ 자리비움 자체가 60초 미만 — 알릴 것이 없다(**침묵이 정답**)
 *     ⓑ 자리비움은 몇 시간인데 하루 예산 잔량이 0 이라 잘렸다 — 유저에게는 «아무 일도 안 일어났다»
 * 이 자는 ⓐ·ⓑ 를 갈라 제품에게 직접 묻는다. 갈리지 않으면 처방이 ⓐ 까지 시끄럽게 만든다.
 *
 * 읽는 법 — 한 수령의 «반응» 은 셋 중 하나다: 팝업(#offw.on) · 토스트(.fx-toast) · 침묵.
 * 침묵인데 자리비움이 60초 이상이면 그것이 이 작업이 잡는 결손이다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });
const AFTER  = ARG.after  || path.resolve(__dirname, '..', 'index.html');
const BEFORE = ARG.before || null;                 /* 없으면 «후» 만 잰다 */

/* bot199.js·probe650.js 의 «부지런» 프로필 그대로. 다만 순서는 **하루의 첫 수령부터** 센다 —
   등재문(AAT)이 잰 것이 «하루 첫 수령이 예산을 다 쓴다» 이므로 밤 사이 공백이 맨 앞이다.
   logins 8·12.5·19·22.5 · 활성 45분 ⇒ 공백 8.75h(밤) · 3.75h · 5.75h · 2.75h. */
const DILIGENT = { logins: [8, 12.5, 19, 22.5], activeMin: 45, mul: 1.5 };
const dayGaps = p => {
  const out = [], act = p.activeMin / 60;
  out.push(p.logins[0] + 24 - (p.logins[p.logins.length - 1] + act));      /* 밤 사이 — 하루의 첫 수령 */
  for (let i = 1; i < p.logins.length; i++) out.push(p.logins[i] - (p.logins[i - 1] + act));
  return out;
};

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); } else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };

async function measure(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(900);

  /* 한 수령의 «반응» 을 재는 공용 자. 692 시계 격리(probe650 §51 주석)를 그대로 쓴다 —
     `Date.now()` 가 인자를 만든 순간과 함수 안에서 다른 밀리초에 떨어지면 초 단위가 드리프트한다. */
  const probe = page.evaluate.bind(page);
  const RUN = ({ gaps, mul, preMin, claim }) => {
    const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);
    Date.now = () => T0;
    const L = () => document.querySelector('.fx-layer, #fxl') || document.body;
    const toasts = () => Array.prototype.slice.call(document.querySelectorAll('.fx-toast'))
      .map(e => e.textContent.trim()).filter(Boolean);
    try {
      S.daily = S.daily || {};
      S.daily.offMin = preMin;
      S.dia = 0; S.gold = 0;
      const rows = [];
      for (let i = 0; i < gaps.length; i++) {
        document.querySelectorAll('.fx-toast').forEach(e => e.remove());   /* 이 수령의 반응만 센다 */
        const room0 = Math.max(0, OFF_DAY_CAP_MIN - (S.daily.offMin || 0));
        const rawSec = gaps[i] * 3600;
        const g0 = S.gold, d0 = S.dia;
        offlineReward(Date.now() - rawSec * 1000);
        const popup = document.getElementById('offw').classList.contains('on');
        const shownSec = offPend ? offPend.sec : 0;
        if (popup && claim) document.getElementById(mul > 1 ? 'ofrGet15' : 'ofrGet').click();
        const tl = toasts();
        rows.push({
          rawMin: +(rawSec / 60).toFixed(4), room0: +room0.toFixed(4),
          popup, shownMin: +(shownSec / 60).toFixed(4), toasts: tl,
          silent: !popup && tl.length === 0,
          dGold: Math.round(S.gold - g0), dDia: S.dia - d0,
          offMinAfter: +(S.daily.offMin || 0).toFixed(4),
        });
        if (popup && !claim) closeOfflineReward();
      }
      return { cap: OFF_DAY_CAP_MIN, claimCapH: OFF_CLAIM_CAP_H, rows, layer: !!L() };
    } finally { Date.now = REAL_NOW; }
  };

  const gaps = dayGaps(DILIGENT);
  const out = {
    errs,
    /* [1] 부지런 하루 — 네 번의 수령을 실제 순서대로, 광고 배수(×1.5)로 받는다 */
    day:    await probe(RUN, { gaps, mul: DILIGENT.mul, preMin: 0, claim: true }),
    /* [2] 소진 직후 한 수령 — 예산을 손으로 0 으로 만들고 9.5시간 자리비움 */
    empty:  await probe(RUN, { gaps: [9.5], mul: 1, preMin: 1e9, claim: false }),
    /* [3] 잔량이 «1분 미만» 인 경계 — room 30초. 자리비움은 여전히 몇 시간이다 */
    crumb:  await probe(RUN, { gaps: [9.5], mul: 1, preMin: 0, claim: false, }),
    /* [4] ⓐ 정상 침묵 — 자리비움 30초. 여기까지 시끄러워지면 처방이 과했다 */
    short:  await probe(RUN, { gaps: [30 / 3600], mul: 1, preMin: 0, claim: false }),
  };
  /* [3] 은 preMin 을 제품 상수에서 파생시켜야 해서 한 번 더 묻는다(cap − 0.5분) */
  out.crumb = await probe(RUN, { gaps: [9.5], mul: 1, preMin: out.day.cap - 0.5, claim: false });
  await ctx.close();
  return out;
}

const R = o => o.rows;
const say = (t, o) => {
  console.log('\n[' + t + '] 하루 예산 ' + o.day.cap + '분 · 1회 상한 ' + o.day.claimCapH + '시간');
  console.log('  ── [1] 부지런 하루 4수령(×1.5) ──');
  R(o.day).forEach((r, i) => console.log(
    '    ' + (i + 1) + '회 자리비움 ' + r.rawMin.toFixed(1) + '분 · 잔량 ' + r.room0.toFixed(1) + '분 → ' +
    (r.popup ? '팝업(표 ' + r.shownMin.toFixed(1) + '분) 다이아 +' + r.dDia.toLocaleString()
             : r.toasts.length ? '토스트 «' + r.toasts.join(' / ') + '»' : '⚠ 침묵') +
    ' · 발행 누계 ' + r.offMinAfter.toFixed(1) + '분'));
  const s = (k, lab) => { const r = R(o[k])[0]; console.log('  ── [' + lab + '] 자리비움 ' + r.rawMin.toFixed(2) + '분 · 잔량 ' +
    r.room0.toFixed(2) + '분 → ' + (r.popup ? '팝업' : r.toasts.length ? '토스트 «' + r.toasts.join(' / ') + '»' : '⚠ 침묵')); };
  s('empty', '2 예산 소진'); s('crumb', '3 잔량 30초'); s('short', '4 자리비움 30초(정상 침묵)');
};

(async () => {
  const browser = await launch(chromium);
  const A = await measure(browser, AFTER);
  const B = BEFORE ? await measure(browser, BEFORE) : null;
  await browser.close();

  const silentDay = o => R(o.day).filter(r => r.silent).length;
  const paidDay   = o => R(o.day).filter(r => r.dDia > 0 || r.dGold > 0).length;

  if (B) {
    say('수리 전', B);
    console.log('\n— 재현 판정 (수리 전) —');
    ok('R1 하루 첫 수령이 예산을 통째로 소진한다 (밤 사이 공백 × 광고 배수 > 하루 예산)',
      R(B.day)[0].offMinAfter >= B.day.cap - 1e-6,
      '1회 뒤 발행 누계 ' + R(B.day)[0].offMinAfter.toFixed(1) + '분 / 예산 ' + B.day.cap + '분');
    ok('R2 ⚑ 나머지 세 수령이 **전부 침묵**이다 — 팝업도 토스트도 없다',
      silentDay(B) === 3, '침묵 ' + silentDay(B) + '회 / 4회');
    ok('R3 지급이 있는 수령은 1회뿐이다 (등재문 «3회 → 1회»)',
      paidDay(B) === 1, '지급 ' + paidDay(B) + '회');
    ok('R4 그 침묵한 수령들의 자리비움은 60초를 한참 넘는다 — 알릴 것이 있는데 안 알린 것이다',
      R(B.day).filter(r => r.silent).every(r => r.rawMin >= 1), '최소 ' +
      Math.min(...R(B.day).filter(r => r.silent).map(r => r.rawMin)).toFixed(1) + '분');
    ok('R5 예산이 0 인 상태의 단독 수령(9.5시간)도 침묵이다', R(B.empty)[0].silent,
      R(B.empty)[0].silent ? '침묵' : '반응 있음');
    ok('R6 잔량이 30초(1분 미만)뿐인 경계도 같은 침묵이다 — `sec < 60` 이 둘을 함께 삼킨다',
      R(B.crumb)[0].silent, R(B.crumb)[0].silent ? '침묵' : '반응 있음');
    ok('R7 ⓐ 자리비움 30초는 **원래도** 침묵이다 (이 침묵은 정답 — 처방이 여기를 건드리면 안 된다)',
      R(B.short)[0].silent, R(B.short)[0].silent ? '침묵' : '반응 있음');
  }

  say(B ? '수리 후' : '현행', A);
  console.log('\n— 처방 판정 (수리 후) —');
  ok('R8 예산 소진 수령이 더는 침묵이 아니다 — 유저에게 이유가 전달된다',
    !R(A.empty)[0].silent && R(A.empty)[0].toasts.length > 0,
    R(A.empty)[0].toasts.length ? '토스트 «' + R(A.empty)[0].toasts.join(' / ') + '»' : '침묵');
  ok('R9 잔량 30초 경계도 같은 안내를 받는다', !R(A.crumb)[0].silent,
    R(A.crumb)[0].toasts.join(' / ') || '침묵');
  ok('R10 부지런 하루의 침묵이 0회다', silentDay(A) === 0, '침묵 ' + silentDay(A) + '회 / 4회');
  console.log('\n— §R 되돌림 시험 (무르게 풀지 않았음) —');
  ok('R11 ⓐ 자리비움 30초는 **여전히 침묵**이다 — 알릴 것이 없는 자리를 시끄럽게 만들지 않았다',
    R(A.short)[0].silent, R(A.short)[0].silent ? '침묵' : '⚠ ' + R(A.short)[0].toasts.join(' / '));
  ok('R12 지급 자체는 한 푼도 안 바뀌었다 — 하루 발행 누계가 수리 전과 같다',
    !B || Math.abs(R(A.day)[R(A.day).length - 1].offMinAfter - R(B.day)[R(B.day).length - 1].offMinAfter) < 1e-6,
    B ? R(A.day)[R(A.day).length - 1].offMinAfter.toFixed(4) + ' = ' + R(B.day)[R(B.day).length - 1].offMinAfter.toFixed(4)
      : '(수리 전 트리 없음)');
  ok('R13 지급이 있는 수령 수도 그대로다 (안내는 안내일 뿐 — 지급 경로 0줄)',
    !B || paidDay(A) === paidDay(B), B ? paidDay(A) + ' = ' + paidDay(B) : '(수리 전 트리 없음)');
  ok('R14 콘솔·페이지 에러 0건', A.errs.length === 0 && (!B || B.errs.length === 0),
    (A.errs.length + (B ? B.errs.length : 0)) + '건');

  console.log('\nPROBE842 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
