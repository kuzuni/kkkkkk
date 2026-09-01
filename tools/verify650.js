/* 650 게이트 — 오프라인 보상 «광고 이득 0» 상태에서 버튼이 오늘 몫을 버리지 않는다
 *
 *   node tools/verify650.js
 *
 * 무엇을 지키는가 — 199 4회차가 세운 «결손A» 가드는 옳다(광고를 보고도 ×1 과 같은 양을 받는
 * 것을 막는다). 결함은 **그 다음이 없었다**는 것이다: 그 상태의 ×1.5 버튼은 라벨이 «내일 다시»
 * 라 오늘 받을 것이 남았다는 것을 읽을 수 없었고, 눌러도 아무것도 안 주고 돌아갔다.
 * 그런데 같은 표를 [받기]로 누르면 그대로 지급된다 ⇒ 손실이 아니라 **유도 실패**다
 * (재현은 `tools/probe650.js` R3·R4 — 부지런 프로필에서 하루 예산의 23.4% = 337.5분).
 *
 * 처방은 ⓑ — **버튼이 배수를 고른다**(`offNoGain()` 이면 ×1). 지급식·계수는 0줄이고
 * 가드는 API 난간으로 그대로 산다. 그래서 이 자는 네 겹으로 본다:
 *   [A] 문턱이 **한 벌**인가 (402 «표 두 벌» 부패 방지)
 *   [B] 이득 0 상태 — 라벨·▶AD 뱃지·지급이 «그냥 받기» 와 같은가
 *   [C] 음성항 — 이득이 **있는** 상태에서는 여전히 ×1.5 인가 (무르게 풀지 않았다)
 *   [D] §R 되돌림 시험 — onclick 을 옛 `claimOffline(1.5)` 로 되돌린 사본은 다시 빨간가
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); } else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };

/* bot199.js·probe199r21.js 의 «부지런» 프로필 그대로 — 이 프로필의 4번째 수령이 그 상태다 */
const DILIGENT = { logins: [8, 12.5, 19, 22.5], activeMin: 45, mul: 1.5 };
const gapsOf = p => {
  const out = [];
  for (let i = 0; i < p.logins.length; i++) {
    const outAt = p.logins[i] + p.activeMin / 60;
    out.push((i + 1 < p.logins.length ? p.logins[i + 1] : p.logins[0] + 24) - outAt);
  }
  return out;
};

/* 페이지 안에서 «4번째 수령» 을 세우고 `press` 를 누른 결과를 돌려준다 */
/* ⚑ 692 — 이 두 표본은 **시계를 안 탄다**. 얼리기 전에는 `offlineReward(Date.now() - gap)` 의
   «인자를 만든 순간» 과 함수 안의 `Date.now()` 가 다른 밀리초에 떨어질 수 있어, 그 1ms 가
   앞 세 수령의 `offMin` 을 밀고 네 번째의 `sec` 을 20250 → 20249.9955 로 만들었다(같은 뿌리로
   `probe650` R8 이 4회 중 1회 빨갰다). 블록이 통째로 동기라 얼린 사이에 다른 코드가 안 돈다.
   그리고 재는 값은 **반올림 전 원값**(`dMinRaw`) 이다 — 한쪽만 `toFixed(4)` 를 지나게 해 놓고
   1e-6 으로 비교하면 자가 스스로와 안 맞는다. `dMin` 은 사람이 읽는 자리로만 남긴다. */
const PROBE = ({ gaps, mul, press }) => {
  const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);
  Date.now = () => T0;
  try {
    S.daily = S.daily || {}; S.daily.offMin = 0;
    S.dia = 0; S.gold = 0;
    const preSec = [];
    for (let i = 0; i < gaps.length - 1; i++) {
      offlineReward(Date.now() - gaps[i] * 3600 * 1000);
      if (offPend) { preSec.push(offPend.sec); claimOffline(mul); }
    }
    offlineReward(Date.now() - gaps[gaps.length - 1] * 3600 * 1000);
    if (!offPend) return { armed: false };
    const b = { min: S.daily.offMin || 0, gold: S.gold, dia: S.dia };
    const shown = {
      gain: offPend.gain, sec: offPend.sec, preSec,
      label: document.querySelector('#ofrGet15 i').textContent.trim(),
      adShown: getComputedStyle(document.querySelector('#offw .ofr-ad')).display !== 'none',
      cap: OFF_DAY_CAP_MIN,
    };
    if      (press === 'ad')    document.getElementById('ofrGet15').click();
    else if (press === 'plain') document.getElementById('ofrGet').click();
    else if (press === 'api')   claimOffline(1.5);
    const raw = (S.daily.offMin || 0) - b.min;
    return { armed: true, ...shown,
      dMinRaw: raw, dMin: +raw.toFixed(4),
      dGold: Math.round(S.gold - b.gold), dDia: S.dia - b.dia,
      totMinRaw: (S.daily.offMin || 0), totMin: +(S.daily.offMin || 0).toFixed(4),
      stillOpen: document.getElementById('offw').classList.contains('on') };
  } finally { Date.now = REAL_NOW; }
};
/* 이득이 **있는** 상태(첫 수령)에서 같은 버튼을 누른다 — 음성항 */
const PROBE_GAIN = ({ gap, press }) => {
  const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);        /* 692 — 위와 같은 시계 격리 */
  Date.now = () => T0;
  try {
    S.daily = S.daily || {}; S.daily.offMin = 0;
    S.dia = 0; S.gold = 0;
    offlineReward(Date.now() - gap * 3600 * 1000);
    if (!offPend) return { armed: false };
    const b = S.daily.offMin || 0, gain = offPend.gain, sec = offPend.sec;
    const label = document.querySelector('#ofrGet15 i').textContent.trim();
    const adShown = getComputedStyle(document.querySelector('#offw .ofr-ad')).display !== 'none';
    if (press === 'ad') document.getElementById('ofrGet15').click();
    else                document.getElementById('ofrGet').click();
    const raw = (S.daily.offMin || 0) - b;
    return { armed: true, gain, sec, label, adShown, dMinRaw: raw, dMin: +raw.toFixed(4) };
  } finally { Date.now = REAL_NOW; }
};

async function run(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(900);
  const gaps = gapsOf(DILIGENT), mul = DILIGENT.mul;
  const out = {
    errs,
    ad:        await page.evaluate(PROBE, { gaps, mul, press: 'ad' }),
    plain:     await page.evaluate(PROBE, { gaps, mul, press: 'plain' }),
    api:       await page.evaluate(PROBE, { gaps, mul, press: 'api' }),
    gainAd:    await page.evaluate(PROBE_GAIN, { gap: gaps[0], press: 'ad' }),
    gainPlain: await page.evaluate(PROBE_GAIN, { gap: gaps[0], press: 'plain' }),
  };
  await ctx.close();
  return out;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[A] 문턱은 한 벌이다 (402 «표 두 벌» 부패 방지)');
  const thr = (src.match(/1\.0005/g) || []).length;
  ok('A1 실효 이득 문턱 `1.0005` 리터럴이 소스에 정확히 1회', thr === 1, thr + '회');
  ok('A2 그 1회는 `offNoGain` 선언 안이다', /const\s+offNoGain\s*=[^\n]*1\.0005/.test(src));
  const uses = (src.match(/offNoGain\(\)/g) || []).length;
  ok('A3 라벨·클릭·가드 셋이 그 하나를 읽는다 (`offNoGain()` 호출 3회 이상)', uses >= 3, uses + '회');
  ok('A4 라벨이 `offNoGain()` 을 읽는다 (showOfflineReward)',
    /const\s+b15\s*=\s*\$\('ofrGet15'\),\s*noGain\s*=\s*offNoGain\(\)/.test(src));
  ok('A5 클릭이 배수를 고른다 (`ofrGet15` onclick)',
    /\$\('ofrGet15'\)\.onclick\s*=\s*\(\)\s*=>\s*claimOffline\(offNoGain\(\)\s*\?\s*1\s*:\s*1\.5\)/.test(src));
  ok('A6 가드가 살아 있다 (`claimOffline` 안 `mul > 1 && offNoGain()`)',
    /if\(mul\s*>\s*1\s*&&\s*offNoGain\(\)\)\{/.test(src));
  ok('A7 옛 거짓 라벨 «내일 다시» 가 01 오프라인 버튼에서 사라졌다',
    !/ofrGet15[\s\S]{0,400}?'내일 다시'/.test(src) && !/noGain\s*\?\s*'내일 다시'/.test(src));

  const browser = await launch(chromium);
  const A = await run(browser, SRC);

  console.log('\n[B] 이득 0 상태 — 오늘 몫을 버리지 않는다');
  ok('B0 그 상태가 세워진다 (gain ≈ 1.000)', A.ad.armed && A.ad.gain <= 1.0005, 'gain ' + A.ad.gain.toFixed(4));
  ok('B1 라벨이 «광고 이득 없음» 이다', A.ad.label === '광고 이득 없음', '«' + A.ad.label + '»');
  ok('B2 ▶AD 뱃지가 숨는다 — 광고를 태우지 않는 누름이다', A.ad.adShown === false);
  ok('B3 광고 버튼 누름이 «그냥 받기» 와 **정확히 같은 액수**를 준다',
    A.ad.dMin > 0 && A.ad.dMin === A.plain.dMin && A.ad.dDia === A.plain.dDia && A.ad.dGold === A.plain.dGold,
    '광고 ' + A.ad.dMin + '분/' + A.ad.dDia.toLocaleString() + '다이아 ‖ 그냥 ' + A.plain.dMin + '분/' + A.plain.dDia.toLocaleString() + '다이아');
  ok('B4 표에 실린 분이 그대로 발행된다 (버려짐 0)', Math.abs(A.ad.dMinRaw - A.ad.sec / 60) < 1e-6,
    'Δ' + A.ad.dMin + '분 = 표의 ' + (A.ad.sec / 60).toFixed(1) + '분');
  ok('B5 하루 예산을 넘겨 발행하지 않는다', A.ad.totMinRaw <= A.ad.cap + 1e-6, A.ad.totMin + ' ≤ ' + A.ad.cap + '분');
  ok('B6 누르면 팝업이 닫힌다 (수령이 실제로 일어났다)', A.ad.stillOpen === false);

  console.log('\n[C] 음성항 — 이득이 있는 상태는 건드리지 않았다');
  ok('C1 라벨이 «1.5배 받기» 그대로다', A.gainAd.label === '1.5배 받기', '«' + A.gainAd.label + '»');
  ok('C2 ▶AD 뱃지가 보인다', A.gainAd.adShown === true);
  ok('C3 광고 버튼이 그냥 받기의 **1.5배** 분을 먹는다',
    A.gainAd.gain > 1.4995 && Math.abs(A.gainAd.dMinRaw - A.gainPlain.dMinRaw * 1.5) < 1e-6,
    '광고 ' + A.gainAd.dMin + '분 vs 그냥 ' + A.gainPlain.dMin + '분');
  ok('C4 «결손A» 난간은 API 에서 여전히 산다 — `claimOffline(1.5)` 직접 호출은 0',
    A.api.dMin === 0, '분 Δ' + A.api.dMin);
  ok('C5 콘솔·페이지 에러 0건', A.errs.length === 0, A.errs.length + '건');

  console.log('\n[§R] 되돌림 시험 — 무르게 풀지 않았다');
  /* ⚑ 646·648 — 사본 이름에 `process.pid` 를 섞는다. 고정 이름이면 워커 넷이 동시에 스윕을
     돌릴 때 서로의 사본을 읽는다. 저장소 밖(os.tmpdir)에 두어 트리도 안 더럽힌다. */
  const tmp = path.join(os.tmpdir(), 'kkkkkk-650-revert-' + process.pid + '.html');
  const reverted = src.replace(
    /\$\('ofrGet15'\)\.onclick\s*=\s*\(\)\s*=>\s*claimOffline\(offNoGain\(\)\s*\?\s*1\s*:\s*1\.5\)/,
    "$('ofrGet15').onclick = () => claimOffline(1.5)");
  ok('R0 되돌림 사본이 실제로 달라졌다 (치환이 먹었다)', reverted !== src);
  fs.writeFileSync(tmp, reverted);
  let R;
  try { R = await run(browser, tmp); } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  ok('R1 옛 배선(`claimOffline(1.5)`)으로 되돌리면 그 수령이 다시 통째로 버려진다',
    R.ad.armed && R.ad.dMin === 0 && R.ad.dDia === 0, '분 Δ' + R.ad.dMin + ' · 다이아 Δ' + R.ad.dDia);
  ok('R2 되돌린 사본에서도 «그냥 받기» 는 여전히 준다 — 버려진 것이 지급식이 아님을 못박는다',
    R.plain.dMin > 0, '분 Δ' + R.plain.dMin);
  ok('R3 되돌림은 배선 한 줄이다 — 라벨은 여전히 새 문구다(문턱·라벨이 서로 다른 자리)',
    R.ad.label === '광고 이득 없음', '«' + R.ad.label + '»');

  /* 692 — B4·B5·C3 을 «시계 격리 + 반올림 전 원값» 으로 옮겼다. 아래 셋이 그것이 자를
     무르게 푼 것이 **아님**을 못박는다: 허용 오차 1e-6 은 한 칸도 안 넓혔고(R4),
     표본이 실시계에서 실제로 떨어졌다(R5·R6). */
  console.log('\n[§R2] 692 — 자를 무르게 풀지 않았다 (플레이키 수리의 되돌림 시험)');
  ok('R4 같은 1e-6 자가 «1초 초과 발행» 은 여전히 빨갛게 잡는다',
    !(Math.abs((A.ad.dMinRaw + 1 / 60) - A.ad.sec / 60) < 1e-6),
    '1초(0.0167분) 얹으면 Δ' + Math.abs((A.ad.dMinRaw + 1 / 60) - A.ad.sec / 60).toExponential(2) + ' > 1e-6');
  const EXP = [13500, 20700, 9900];                 /* 부지런 프로필 앞 세 수령의 자리비움(초) */
  ok('R5 표본이 실시계를 안 탄다 — 앞 세 수령의 자리비움이 프로필 값과 정확히 같다 (드리프트 0)',
    A.ad.preSec.length === EXP.length && A.ad.preSec.every((s, i) => s === EXP[i]),
    '[' + A.ad.preSec.join(', ') + '] = [' + EXP.join(', ') + ']');
  ok('R6 그래서 4번째의 자리비움도 정수 초다 (예산 잔량 337.5분 = 20250초)',
    A.ad.sec === 20250, A.ad.sec + '초');

  await browser.close();
  console.log('\nVERIFY650 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
