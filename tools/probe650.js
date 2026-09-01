/* 650 재현 — «결손A» 가드가 실효 ×1.0 수령을 통째로 버린다 (338 규칙: 처방 전에 재현)
 *
 *   node tools/probe650.js [--before=<파일>] [--after=<파일>]
 *
 * 왜 이 자가 필요한가 — 등재문(199 21회차 곁다리)은 «부지런 유저가 광고 버튼만 누르면 하루
 * 예산의 23.4% 를 못 받는다» 고 적었고, 처방 후보를 셋 남겼다. 그런데 그 셋은 «손실이냐 유도
 * 실패냐» 에 따라 고를 것이 갈린다 — **가드가 막은 그 상태에서 «그냥 받기»(×1)가 실제로
 * 얼마를 주는가**를 재기 전에는 못 고른다. 이 자는 그 한 칸을 제품에게 직접 묻는다.
 *
 * 읽는 법 — 봇(`bot199.js`)의 «부지런» 프로필 하루치 오프라인만 떼어 4번째 수령을 세운 뒤:
 *   · 라벨이 무엇이라 말하는가(`#ofrGet15`)
 *   · 광고 버튼을 누르면 얼마가 들어오는가
 *   · **같은 상태에서** 그냥 받기를 누르면 얼마가 들어오는가
 * 셋이 갈리면 «손실» 이 아니라 «유도 실패» 다 — 그러면 지급식이 아니라 버튼을 고쳐야 한다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });
const AFTER  = ARG.after  || path.resolve(__dirname, '..', 'index.html');
const BEFORE = ARG.before || null;                 /* 없으면 «후» 만 잰다 */

/* bot199.js·probe199r21.js 의 «부지런» 프로필 그대로 */
const DILIGENT = { logins: [8, 12.5, 19, 22.5], activeMin: 45, mul: 1.5 };
const gapsOf = p => {
  const out = [];
  for (let i = 0; i < p.logins.length; i++) {
    const outAt = p.logins[i] + p.activeMin / 60;
    out.push((i + 1 < p.logins.length ? p.logins[i + 1] : p.logins[0] + 24) - outAt);
  }
  return out;
};

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); } else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };

/* 한 번의 측정 = 프로필의 앞 세 수령으로 예산을 몰아 놓고, **네 번째 수령에서** 무엇을 누르는가.
   `press` 는 'ad'(#ofrGet15) · 'plain'(#ofrGet) · 'api'(claimOffline(1.5) 직접 호출 — 되돌림 시험). */
async function measure(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(900);

  const run = press => page.evaluate(({ gaps, mul, press }) => {
    /* 692 — **시계 격리**. 얼리기 전에는 `offlineReward(Date.now() - gap)` 의 «인자를 만든 순간» 과
       함수 안의 `Date.now()` 가 서로 다른 밀리초에 떨어질 수 있어 표본이 실시계를 탔다. 그 1ms 가
       앞 세 수령의 `offMin` 을 1,102.5 에서 미세하게 밀고, 네 번째의 `sec` 이 20250 → 20249.9955 가
       된다(692 재현). 블록은 통째로 동기라 이 사이에 다른 코드가 돌지 않는다 — 되돌림은 finally. */
    const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);
    Date.now = () => T0;
    try {
      S.daily = S.daily || {}; S.daily.offMin = 0;
      S.dia = 0; S.gold = 0;
      /* 앞 세 수령 — 광고 버튼(×1.5)으로 예산을 «거의» 채운다 */
      const preSec = [];
      for (let i = 0; i < gaps.length - 1; i++) {
        offlineReward(Date.now() - gaps[i] * 3600 * 1000);
        if (offPend) { preSec.push(offPend.sec); claimOffline(mul); }
      }
      /* 네 번째 = 문제의 수령 */
      offlineReward(Date.now() - gaps[gaps.length - 1] * 3600 * 1000);
      if (!offPend) return { armed: false };
      const before = { min: S.daily.offMin || 0, gold: S.gold, dia: S.dia };
      const shown  = {
        gain: offPend.gain, sec: offPend.sec, preSec,
        label: document.querySelector('#ofrGet15 i').textContent.trim(),
        opacity: document.getElementById('ofrGet15').style.opacity || '',
        cap: (typeof OFF_DAY_CAP_MIN === 'number' ? OFF_DAY_CAP_MIN : null),
      };
      if      (press === 'ad')    document.getElementById('ofrGet15').click();
      else if (press === 'plain') document.getElementById('ofrGet').click();
      else if (press === 'api')   claimOffline(1.5);
      /* 692 — 눈금 일관성: 재는 값은 **반올림 전 원값**(`dMinRaw`), `dMin` 은 사람이 읽는 자리다.
         한쪽만 `toFixed(4)` 를 지나게 해 놓고 1e-6 으로 비교하면 자가 스스로와 안 맞는다. */
      const raw = (S.daily.offMin || 0) - before.min;
      return {
        armed: true, ...shown,
        dMinRaw: raw,
        dMin: +raw.toFixed(4),
        dGold: Math.round(S.gold - before.gold),
        dDia: S.dia - before.dia,
        stillOpen: document.getElementById('offw').classList.contains('on'),
      };
    } finally { Date.now = REAL_NOW; }
  }, { gaps: gapsOf(DILIGENT), mul: DILIGENT.mul, press });

  /* 실효 이득이 **있는** 상태(첫 수령)에서 광고 버튼이 여전히 ×1.5 인지 — 되돌림 시험용 */
  const gainful = press => page.evaluate(({ gap, press }) => {
    const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);      /* 692 — 위와 같은 시계 격리 */
    Date.now = () => T0;
    try {
      S.daily = S.daily || {}; S.daily.offMin = 0;
      S.dia = 0; S.gold = 0;
      offlineReward(Date.now() - gap * 3600 * 1000);
      if (!offPend) return { armed: false };
      const b = { min: S.daily.offMin || 0 }, gain = offPend.gain, sec = offPend.sec;
      const label = document.querySelector('#ofrGet15 i').textContent.trim();
      if (press === 'ad') document.getElementById('ofrGet15').click();
      else                document.getElementById('ofrGet').click();
      const raw = (S.daily.offMin || 0) - b.min;
      return { armed: true, gain, sec, label, dMinRaw: raw, dMin: +raw.toFixed(4) };
    } finally { Date.now = REAL_NOW; }
  }, { gap: gapsOf(DILIGENT)[0], press });

  const out = {
    errs,
    ad:    await run('ad'),
    plain: await run('plain'),
    api:   await run('api'),
    gainAd:    await gainful('ad'),
    gainPlain: await gainful('plain'),
  };
  await ctx.close();
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const A = await measure(browser, AFTER);
  const B = BEFORE ? await measure(browser, BEFORE) : null;
  await browser.close();

  const show = (t, o) => {
    console.log('\n[' + t + '] 부지런 4번째 수령 (하루 예산 ' + o.ad.cap + '분)');
    console.log('  실효 배수 gain = ' + o.ad.gain.toFixed(4) + ' · 표에 실린 자리비움 ' + (o.ad.sec / 60).toFixed(1) + '분' +
      ' (= 하루 예산의 ' + (o.ad.sec / 60 / o.ad.cap * 100).toFixed(1) + '%)');
    console.log('  라벨(#ofrGet15) = «' + o.ad.label + '» · opacity «' + o.ad.opacity + '»');
    console.log('  광고 버튼 누름 → 발행 분 Δ' + o.ad.dMin + ' · 골드 Δ' + o.ad.dGold.toLocaleString() + ' · 다이아 Δ' + o.ad.dDia.toLocaleString() + ' · 팝업 열린 채 ' + o.ad.stillOpen);
    console.log('  그냥 받기 누름 → 발행 분 Δ' + o.plain.dMin + ' · 골드 Δ' + o.plain.dGold.toLocaleString() + ' · 다이아 Δ' + o.plain.dDia.toLocaleString() + ' · 팝업 열린 채 ' + o.plain.stillOpen);
    console.log('  claimOffline(1.5) 직접 호출 → 발행 분 Δ' + o.api.dMin + ' (가드 자신)');
    console.log('  [이득 있는 상태] gain ' + o.gainAd.gain.toFixed(4) + ' · 라벨 «' + o.gainAd.label + '» · 광고 Δ' + o.gainAd.dMin + '분 vs 그냥 Δ' + o.gainPlain.dMin + '분');
  };

  if (B) {
    show('수리 전', B);
    console.log('\n— 재현 판정 (수리 전) —');
    ok('R1 «실효 이득 0» 상태가 실재한다 (gain ≈ 1.000)', B.ad.armed && B.ad.gain <= 1.0005, 'gain ' + B.ad.gain.toFixed(4));
    ok('R2 그 상태의 광고 버튼 라벨이 «내일 다시» 다 — 오늘 받을 것이 남았다는 것을 읽을 수 없다',
      B.ad.label === '내일 다시', '«' + B.ad.label + '»');
    ok('R3 광고 버튼을 누르면 아무것도 안 들어온다 (분·골드·다이아 전부 Δ0)',
      B.ad.dMin === 0 && B.ad.dGold === 0 && B.ad.dDia === 0,
      '분 Δ' + B.ad.dMin + ' · 골드 Δ' + B.ad.dGold + ' · 다이아 Δ' + B.ad.dDia);
    ok('R4 ⚑ **같은 상태에서 «그냥 받기» 는 정상 지급한다** — 손실이 아니라 유도 실패다',
      B.plain.dMin > 0 && B.plain.dDia > 0, '분 Δ' + B.plain.dMin + ' · 다이아 Δ' + B.plain.dDia.toLocaleString());
    ok('R5 버려지는 몫 = 하루 예산의 23.4%',
      Math.abs(B.ad.sec / 60 / B.ad.cap * 100 - 23.4) < 0.1, (B.ad.sec / 60 / B.ad.cap * 100).toFixed(2) + '%');
  }

  show(B ? '수리 후' : '현행', A);
  console.log('\n— 처방 판정 (수리 후) —');
  ok('R6 «내일 다시» 가 아니다 — 라벨이 오늘 받을 것이 남았음을 말한다',
    A.ad.armed && A.ad.label !== '내일 다시', '«' + A.ad.label + '»');
  ok('R7 광고 버튼을 눌러도 «그냥 받기» 와 **정확히 같은 액수**가 들어온다 (버려지지 않는다)',
    A.ad.dMin > 0 && A.ad.dMin === A.plain.dMin && A.ad.dDia === A.plain.dDia && A.ad.dGold === A.plain.dGold,
    '광고 Δ' + A.ad.dMin + '분/' + A.ad.dDia.toLocaleString() + '다이아 ‖ 그냥 Δ' + A.plain.dMin + '분/' + A.plain.dDia.toLocaleString() + '다이아');
  ok('R8 그 수령으로 하루 예산이 정확히 채워진다 (초과 발행 0)',
    Math.abs(A.ad.dMinRaw - A.ad.sec / 60) < 1e-6, 'Δ' + A.ad.dMin + '분 = 표의 ' + (A.ad.sec / 60).toFixed(1) + '분');
  console.log('\n— §R 되돌림 시험 (무르게 풀지 않았음) —');
  ok('R9 «결손A» 가드 자체는 살아 있다 — `claimOffline(1.5)` 직접 호출은 여전히 안 준다',
    A.api.dMin === 0, '분 Δ' + A.api.dMin);
  ok('R10 실효 이득이 **있는** 상태에서는 광고 버튼이 여전히 ×1.5 다 (그냥 받기의 1.5배 분을 먹는다)',
    A.gainAd.gain > 1.4995 && Math.abs(A.gainAd.dMinRaw - A.gainPlain.dMinRaw * 1.5) < 1e-6,
    '광고 ' + A.gainAd.dMin + '분 vs 그냥 ' + A.gainPlain.dMin + '분');
  ok('R11 그 상태의 라벨은 «1.5배 받기» 그대로다', A.gainAd.label === '1.5배 받기', '«' + A.gainAd.label + '»');
  ok('R12 콘솔·페이지 에러 0건', A.errs.length === 0 && (!B || B.errs.length === 0),
    (A.errs.length + (B ? B.errs.length : 0)) + '건');

  /* 692 — 플레이키였던 R8·R10 을 «시계 격리 + 반올림 전 원값» 으로 고쳤다.
     아래 둘이 «무르게 풀지 않았음» 을 못박는다: 허용 오차 1e-6 은 한 칸도 안 넓혔고(R8n),
     표본이 실시계에서 실제로 떨어졌다(R13). */
  console.log('\n— §R2 692 되돌림 시험 (자를 무르게 풀지 않았다) —');
  ok('R8n 같은 1e-6 자가 «1초 초과 발행» 은 여전히 빨갛게 잡는다 (허용 오차를 안 넓혔다)',
    !(Math.abs((A.ad.dMinRaw + 1 / 60) - A.ad.sec / 60) < 1e-6),
    '1초(0.0167분) 얹으면 Δ' + Math.abs((A.ad.dMinRaw + 1 / 60) - A.ad.sec / 60).toExponential(2) + ' > 1e-6');
  const EXP = [13500, 20700, 9900];                 /* 부지런 프로필 앞 세 수령의 자리비움(초) */
  ok('R13 표본이 실시계를 안 탄다 — 앞 세 수령의 자리비움이 프로필 값과 정확히 같다 (드리프트 0)',
    A.ad.preSec.length === EXP.length && A.ad.preSec.every((s, i) => s === EXP[i]),
    '[' + A.ad.preSec.join(', ') + '] = [' + EXP.join(', ') + ']');
  ok('R14 그래서 4번째의 자리비움도 정수 초다 (예산 잔량 337.5분 = 20250초)',
    A.ad.sec === 20250, A.ad.sec + '초');

  console.log('\nPROBE650 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
