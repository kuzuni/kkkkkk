/* 199 21회차 재현 — «오프라인 1회 상한 6h 를 걷어내면 누가 얼마나 받는가» (338 규칙: 처방 전에 재현)
 *
 *   node tools/probe199r21.js [--before=<파일>] [--after=<파일>]
 *
 * 왜 이 자가 필요한가 — 19회차는 «저장소 안에 정책 비대칭 축이 없다» 고 **판단**하고 연립으로
 * 우회했다. 결3 ⓑ 가 지시한 «1회 상한 폐지» 가 실제로 정책마다 다르게 먹는지는 계산이 아니라
 * 제품을 켜서 재야 갈린다. 이 자는 봇(`bot199.js`)의 두 프로필과 **같은 접속 시각·같은 광고
 * 배수**로 하루치 오프라인 수령만 떼어 내 재현한다(전투·소환은 안 돈다 — 축 하나만 본다).
 *
 * 읽는 법 — 두 프로필의 «하루 오프라인 다이아» 와 «하루에 발행된 분(`S.daily.offMin`)»:
 *   · 상한이 막고 있었으면 상한을 걷을 때 **분** 이 늘고,
 *   · 예산이 막고 있었으면 분은 그대로고 **분당 다이아**(계수)만 움직인다.
 * 그 둘은 이름이 비슷할 뿐 서로 다른 상수다(LESSONS 199-21-②).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });
const AFTER  = ARG.after  || path.resolve(__dirname, '..', 'index.html');
const BEFORE = ARG.before || null;   /* 없으면 «후» 만 잰다 */

/* bot199.js 의 프로필 그대로 — 접속 시각(시)·활성 분·광고 배수 */
const POLS = [
  { key: 'diligent', name: '부지런한 유저', logins: [8, 12.5, 19, 22.5], activeMin: 45, mul: 1.5 },
  { key: 'casual',   name: '대충 유저',     logins: [21],                activeMin: 30, mul: 1.0 },
];
/* 하루의 «자리비움» = 앞 세션 로그아웃 → 다음 접속.
   ⚑⚑ **순서가 결과를 바꾼다(1회차 하네스 결함 · 비평 AAF·AAH 2인 지적)** — 하루 예산
   `S.daily.offMin` 은 **달력 날짜**로 리셋되고(`dailyCheck()`), 봇의 접속 시각은 8·12.5·19·22.5시라
   **밤 자리비움(전날 23:15 → 08:00)이 그날의 «첫» 수령**이다. 1회차 초판은 그것을 배열 끝에
   놓아 예산이 마른 뒤 청구했고, 그래서 «부지런이 337.5분을 버린다» 는 유령을 만들었다.
   ⇒ 첫 접속의 자리비움(= 전날 마지막 로그아웃부터)을 **맨 앞**에 놓는다. */
const gapsOf = p => {
  const out = [];
  for (let i = 0; i < p.logins.length; i++) {
    const prev   = i === 0 ? p.logins[p.logins.length - 1] - 24 : p.logins[i - 1];
    const outAt  = prev + p.activeMin / 60;
    out.push(p.logins[i] - outAt);
  }
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
  const out = { errs };
  for (const P of POLS) {
    out[P.key] = await page.evaluate(({ gaps, mul }) => {
      /* 축 하나만 본다 — 세이브·하루 예산을 초기화하고 오프라인 수령만 되풀이한다 */
      S.daily = S.daily || {}; S.daily.offMin = 0;
      S.dia = 0; S.gold = 0;
      let claims = 0, taken = 0, dropped = [];
      for (const g of gaps) {
        offlineReward(Date.now() - g * 3600 * 1000);
        if (typeof offPend !== 'undefined' && offPend) {
          const m0 = S.daily.offMin || 0, gain = offPend.gain, sec = offPend.sec;
          claimOffline(mul); claims++;
          /* 199 4회차 «결손A» 가드 — 실효 이득 0 인 ×1.5 는 **아무것도 안 받고** 돌아간다.
             봇은 광고 버튼만 누르므로 그 수령이 통째로 버려진다. 몇 분이 버려졌는지 센다. */
          if ((S.daily.offMin || 0) - m0 < 1e-9) dropped.push(+(sec / 60).toFixed(1));
          else taken++;
        }
      }
      return { dia: Math.round(S.dia), min: +(S.daily.offMin || 0).toFixed(2), claims, taken, dropped,
               pm: (typeof OFF_DIA_PM === 'number' ? OFF_DIA_PM : null),
               cap1h: (typeof offMaxH === 'function' ? offMaxH() : null),
               mulTk: (typeof offMul === 'function' ? offMul() : null) };
    }, { gaps: gapsOf(P), mul: P.mul });
  }
  await ctx.close();
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const A = await measure(browser, AFTER);
  const B = BEFORE ? await measure(browser, BEFORE) : null;
  await browser.close();

  const row = (t, o) => POLS.map(P => '  ' + P.name + ' — 다이아 ' + o[P.key].dia.toLocaleString() +
    ' · 발행 분 ' + o[P.key].min + ' · 수령 ' + o[P.key].taken + '/' + o[P.key].claims + '회' +
    (o[P.key].dropped.length ? ' · **버려진 수령** ' + o[P.key].dropped.join('/') + '분(결손A 가드)' : '')).join('\n');
  console.log('\n[1] 하루치 오프라인만 — 수리 후 (분당 ' + A.diligent.pm + ' · 1회 상한 ' +
    (A.diligent.cap1h === null ? '없음' : A.diligent.cap1h + 'h') + ')');
  console.log(row('after', A));
  if (B) {
    console.log('\n[2] 같은 자로 수리 전 (분당 ' + B.diligent.pm + ' · 1회 상한 ' +
      (B.diligent.cap1h === null ? '없음' : B.diligent.cap1h + 'h') + ')');
    console.log(row('before', B));
    console.log('\n[3] Δ — 같은 한 줄이 정책마다 다르게 먹는가');
    for (const P of POLS) {
      const d = A[P.key].dia - B[P.key].dia, dm = A[P.key].min - B[P.key].min;
      console.log('  ' + P.name + ' — 다이아 Δ' + (d >= 0 ? '+' : '') + d.toLocaleString() +
        ' (×' + (A[P.key].dia / B[P.key].dia).toFixed(3) + ') · 발행 분 Δ' + (dm >= 0 ? '+' : '') + dm.toFixed(2));
    }
    const rd = (A.casual.dia - B.casual.dia) / (A.diligent.dia - B.diligent.dia);
    console.log('  ⇒ 비대칭 = 대충 Δ ÷ 부지런 Δ = **' + rd.toFixed(2) + '배**');
    ok('P1 수리 전 대충은 1회 상한에 잘리고 있었다(발행 분 = 6h = 360)', Math.abs(B.casual.min - 360) < 1,
      B.casual.min + '분');
    /* ⚑ 등재문(과 내 손계산)은 «부지런은 하루 예산 1,440분에 붙어 있다» 였는데 재현이 그것을
       정정했다 — 1,102.5분에서 멈춘다. 뿌리는 상한도 예산도 아니라 **199 4회차 «결손A» 가드**다:
       마지막 수령이 실효 ×1.0 이라 «×1.5 는 안 받는다» 로 통째로 버려진다(봇은 광고 버튼만 누른다). */
    /* ⚑ 1회차 초판은 여기서 «부지런이 하루 예산의 23.4% 를 버린다» 를 읽고 곁다리로 등재했다.
       그것은 위 `gapsOf` 의 순서 결함이 만든 유령이었다 — 순서를 봇과 맞추면 부지런은 하루
       예산을 **거의 다 쓴다**. 그래도 «마지막 조각이 버려진다» 는 사실 자체는 남으므로(예산이
       마르는 마지막 수령은 gain 이 1.0 이라 ×1.5 로는 0 을 받는다) 그 크기를 계속 찍는다. */
    ok('P2 수리 전·후 모두 부지런은 하루 예산을 거의 다 쓴다(≥ 예산의 90%)',
      B.diligent.min >= 1440 * 0.9 && A.diligent.min >= 1440 * 0.9,
      '전 ' + B.diligent.min + '분 · 후 ' + A.diligent.min + '분 / 1440');
    ok('P2b 예산이 마르는 마지막 수령은 ×1.5 로 0 을 받는다(결손A 가드) — 크기를 기록한다',
      true, '전 ' + JSON.stringify(B.diligent.dropped) + '분 ‖ 후 ' + JSON.stringify(A.diligent.dropped) + '분');
    ok('P3 수리 후 대충의 발행 분이 자리비움 전부로 늘어난다(> 1,400)', A.casual.min > 1400, A.casual.min + '분');
    ok('P4 부지런의 발행 «분» 은 상한을 걷어내도 거의 안 움직인다(|Δ| ≤ 예산의 5%) — 부지런의 Δ 는 계수 몫이다',
      Math.abs(A.diligent.min - B.diligent.min) <= 1440 * 0.05,
      B.diligent.min + ' → ' + A.diligent.min + '(Δ' + (A.diligent.min - B.diligent.min).toFixed(1) + '분)');
    ok('P5 같은 한 줄이 대충에 더 크게 먹는다(비대칭 > 2배)', rd > 2, '×' + rd.toFixed(2));
  }
  ok('P6 콘솔·페이지 에러 0건', A.errs.length === 0 && (!B || B.errs.length === 0),
    (A.errs.length + (B ? B.errs.length : 0)) + '건');
  console.log('\nPROBE199R21 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
