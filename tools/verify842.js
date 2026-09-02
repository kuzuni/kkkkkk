/* 842 게이트 — 하루 예산이 소진되면 오프라인 보상이 «조용히» 끝나지 않는다
 *
 *   node tools/verify842.js
 *
 * 무엇을 지키는가 — `offlineReward()` 의 `if(sec < 60) return` 하나가 **서로 다른 두 상황**을
 * 같은 침묵으로 처리하고 있었다:
 *     ⓐ 자리비움 자체가 60초 미만 — 알릴 것이 없다(**침묵이 정답**)
 *     ⓑ 자리비움은 몇 시간인데 하루 예산(`OFF_DAY_CAP_MIN`) 잔량이 0 이라 0 으로 잘렸다
 * 부지런 프로필은 하루 첫 수령이 예산을 통째로 쓰므로 **나머지 세 번이 전부 ⓑ** 다
 * (재현 `tools/probe842.js` R1~R3 — 지급 있는 수령 4회 → 1회).
 *
 * 처방은 «자른 축을 이름으로 묻고 ⓑ 만 말한다» 이고, 말하는 수단은 팝업이 아니라 **토스트**다
 * (149 «단순 안내는 팝업이 아니라 토스트» · 206 큐/폴백 → `notify`). 그래서 네 겹으로 본다:
 *   [A] 소스 — 문구가 **한 벌**인가(402 «표 두 벌» 부패 방지) · 안내 수단이 `notify` 인가
 *   [B] 동작 — ⓑ 는 말하고 ⓐ 는 여전히 침묵인가 (양쪽 다 봐야 «시끄러워졌다» 를 막는다)
 *   [C] 불변식 — **안내는 한 푼도 안 건드린다**(지급·발행 예산 Δ0) · 예산은 여전히 예산이다
 *   [D] §R 되돌림 시험 — 옛 침묵으로 되돌린 사본은 다시 빨간가
 *
 * ⚠ 이 자는 계수(OFF_DAY_CAP_MIN·OFF_DIA_PM)를 **숫자로 안 적는다.** 199 가 예산을 자주
 *   움직이는 축이라 값을 적어 두면 그 순간 게이트 부패다(315·333 계열). 대신 «잔량이 1분
 *   미만이면 말한다 · 그 안내가 지급을 안 건드린다» 처럼 **값과 무관한 관계**만 묻는다.
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

/* bot199.js·probe650.js 의 «부지런» 프로필 그대로. 순서는 하루의 첫 수령(밤 사이 공백)부터 —
   등재문(199 25회차 AAT)이 잰 것이 «하루 첫 수령이 예산을 다 쓴다» 이다. */
const DILIGENT = { logins: [8, 12.5, 19, 22.5], activeMin: 45, mul: 1.5 };
const dayGaps = p => {
  const out = [], act = p.activeMin / 60;
  out.push(p.logins[0] + 24 - (p.logins[p.logins.length - 1] + act));
  for (let i = 1; i < p.logins.length; i++) out.push(p.logins[i] - (p.logins[i - 1] + act));
  return out;
};

/* 페이지 안에서 «한 수령» 을 세우고 반응을 돌려준다.
   ⚑ 692 시계 격리 — 인자를 만든 순간과 함수 안의 `Date.now()` 가 다른 밀리초에 떨어지면
   초 단위가 드리프트해 표본이 실시계를 탄다. 블록은 통째로 동기라 사이에 다른 코드가 안 돈다. */
const RUN = ({ gaps, mul, roomMin, preFrac, claim }) => {
  const REAL_NOW = Date.now, T0 = REAL_NOW.call(Date);
  Date.now = () => T0;
  const toasts = () => Array.prototype.slice.call(document.querySelectorAll('.fx-toast'))
    .map(e => e.textContent.trim()).filter(Boolean);
  try {
    S.daily = S.daily || {};
    /* preFrac 는 «예산의 몇 할을 이미 썼는가» — 계수를 자에 안 적기 위해 제품 상수에서 파생한다.
       roomMin 이 오면 «잔량을 정확히 이만큼 남긴다»(경계 표본용) — 이것도 상수에서 파생이다. */
    S.daily.offMin = roomMin !== undefined && roomMin !== null
      ? Math.max(0, OFF_DAY_CAP_MIN - roomMin) : OFF_DAY_CAP_MIN * preFrac;
    S.dia = 0; S.gold = 0;
    const rows = [];
    for (let i = 0; i < gaps.length; i++) {
      document.querySelectorAll('.fx-toast').forEach(e => e.remove());     /* 이 수령의 반응만 센다 */
      const room0 = Math.max(0, OFF_DAY_CAP_MIN - (S.daily.offMin || 0));
      const min0 = S.daily.offMin || 0, g0 = S.gold, d0 = S.dia;
      offlineReward(Date.now() - gaps[i] * 3600 * 1000);
      const popup = document.getElementById('offw').classList.contains('on');
      const shownSec = offPend ? offPend.sec : 0;
      if (popup && claim) document.getElementById(mul > 1 ? 'ofrGet15' : 'ofrGet').click();
      const tl = toasts();
      rows.push({
        awaySec: gaps[i] * 3600, roomMin: +room0.toFixed(6), popup, shownSec,
        toasts: tl, silent: !popup && tl.length === 0,
        dMin: +((S.daily.offMin || 0) - min0).toFixed(6),
        dGold: Math.round(S.gold - g0), dDia: S.dia - d0,
        offMinAfter: +(S.daily.offMin || 0).toFixed(6),
      });
      if (popup && !claim) closeOfflineReward();
    }
    return { cap: OFF_DAY_CAP_MIN, claimCapH: OFF_CLAIM_CAP_H, msg: OFF_CAP_MSG, rows };
  } finally { Date.now = REAL_NOW; }
};

async function open(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}

/* 한 파일에 대해 [B] 의 네 표본을 재서 돌려준다 — 되돌림 사본에도 같은 자를 댄다 */
async function samples(page) {
  const gaps = dayGaps(DILIGENT);
  return {
    day:   await page.evaluate(RUN, { gaps, mul: DILIGENT.mul, preFrac: 0, claim: true }),
    /* 예산을 통째로 소진시킨 뒤 한 번 — 잔량 0 */
    empty: await page.evaluate(RUN, { gaps: [9.5], mul: 1, preFrac: 1, claim: false }),
    /* 잔량이 «1분 미만» 인 경계 — 30초(0.5분). 자리비움은 여전히 몇 시간이다 */
    crumb: await page.evaluate(RUN, { gaps: [9.5], mul: 1, roomMin: 0.5, claim: false }),
    /* ⓐ 알릴 것이 없는 자리 — 자리비움 30초, 예산은 가득 */
    short: await page.evaluate(RUN, { gaps: [30 / 3600], mul: 1, preFrac: 0, claim: false }),
    /* ⓐ∧ⓑ — 예산도 0 이고 자리비움도 30초. 예산이 있었어도 줄 것이 없으니 **침묵이 정답**이다 */
    both:  await page.evaluate(RUN, { gaps: [30 / 3600], mul: 1, preFrac: 1, claim: false }),
  };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  console.log('[A] 소스 — 문구가 한 벌인가 · 안내 수단이 무엇인가');
  const decl = src.match(/const\s+OFF_CAP_MSG\s*=\s*'([^']+)'/);
  ok('A1 `OFF_CAP_MSG` 상수가 선언돼 있다', !!decl, decl ? '«' + decl[1] + '»' : '없음');
  const lit = decl ? src.split(decl[1]).length - 1 : 0;
  ok('A2 그 문구의 리터럴이 **선언 한 곳뿐**이다 (402 «표 두 벌» 부패 방지)', lit === 1, lit + '곳');
  ok('A3 «한도 소진» 을 말하는 자리가 둘 다 그 상수를 읽는다 (광고 반려 · 수령 0 컷)',
    (src.match(/OFF_CAP_MSG/g) || []).length >= 3,
    (src.match(/OFF_CAP_MSG/g) || []).length + '회 등장(선언 1 + 사용 2 이상)');
  /* 149 — «단순 안내» 는 팝업이 아니다. 206 — `fxToast` 는 스택이 차면 **조용히 드롭**하므로
     조용한 드롭을 잡는 이 작업에서는 큐를 타는 `notify` 여야 한다. */
  const body = src.slice(src.indexOf('function offlineReward('), src.indexOf('function offlineReward(') + 1800);
  ok('A4 `offlineReward` 의 안내는 `notify`(206 큐/폴백)로 나간다 — 조용한 드롭이 없다',
    /notify\(\s*OFF_CAP_MSG\s*\)/.test(body), /notify\(\s*OFF_CAP_MSG\s*\)/.test(body) ? 'notify' : '아님');
  ok('A5 그 자리에 팝업(`popup(`)을 새로 열지 않는다 — 149 «안내성 팝업 폐지»',
    !/popup\(/.test(body));
  /* ⚠ 자른 축을 **이름으로** 묻는가 — «away ≥ 60 && sec < 60» 으로 뭉뚱그리면 나중에 자르는
     축이 하나 더 늘 때 그 축이 자른 것까지 «예산 소진» 이라고 거짓말한다. */
  ok('A6 안내 조건이 «예산 잔량» 을 이름으로 묻는다 (자른 축을 뭉뚱그리지 않았다)',
    /room\s*\*\s*60\s*<\s*60/.test(body) || /room\s*<\s*1\b/.test(body),
    /room\s*\*\s*60\s*<\s*60/.test(body) ? 'room*60 < 60' : /room\s*<\s*1\b/.test(body) ? 'room < 1' : '없음');

  const A = await open(browser, SRC);
  const SA = await samples(A.page);
  const r = k => SA[k].rows[0];

  console.log('\n[B] 동작 — ⓑ 는 말하고 ⓐ 는 침묵인가');
  ok('B1 ⓑ 예산 잔량 0 · 자리비움 9.5시간 → 안내가 뜬다 (침묵 아님)',
    !r('empty').silent && r('empty').toasts.length > 0,
    r('empty').toasts.join(' / ') || '침묵');
  ok('B2 그 안내가 «한도 소진» 문구다 (제품 상수와 글자까지 같다)',
    r('empty').toasts.some(t => t === SA.empty.msg), '«' + r('empty').toasts.join(' / ') + '»');
  ok('B3 잔량이 1분 미만(30초)인 경계도 같은 안내다 — `sec < 60` 이 삼키던 자리 전부',
    !r('crumb').silent && r('crumb').toasts.some(t => t === SA.crumb.msg),
    r('crumb').toasts.join(' / ') || '침묵');
  ok('B4 ⓐ 자리비움 30초 · 예산 가득 → **여전히 침묵**이다 (알릴 것이 없는 자리를 안 건드렸다)',
    r('short').silent, r('short').silent ? '침묵' : '⚠ ' + r('short').toasts.join(' / '));
  ok('B5 ⓐ∧ⓑ 자리비움 30초 · 예산 0 → 침묵이다 (예산이 있었어도 줄 것이 없다)',
    r('both').silent, r('both').silent ? '침묵' : '⚠ ' + r('both').toasts.join(' / '));
  ok('B6 ⚑ 부지런 하루 4수령에 **침묵이 0회**다 (등재문의 «나머지 3회 무반응»)',
    SA.day.rows.filter(x => x.silent).length === 0,
    '침묵 ' + SA.day.rows.filter(x => x.silent).length + '회 / ' + SA.day.rows.length + '회');
  ok('B7 그 하루의 첫 수령은 여전히 **팝업**이다 — 받을 것이 있는 수령을 토스트로 바꾸지 않았다',
    SA.day.rows[0].popup && SA.day.rows[0].dDia > 0,
    (SA.day.rows[0].popup ? '팝업' : '팝업 아님') + ' · 다이아 +' + SA.day.rows[0].dDia.toLocaleString());
  ok('B8 나머지 수령의 반응은 팝업이 아니라 안내다 (빈 표를 팝업으로 열지 않는다)',
    SA.day.rows.slice(1).every(x => !x.popup && x.toasts.length > 0),
    SA.day.rows.slice(1).map(x => x.popup ? '팝업' : '안내').join(' · '));

  console.log('\n[C] 불변식 — 안내는 한 푼도 안 건드린다');
  const notices = [r('empty'), r('crumb'), ...SA.day.rows.slice(1)];
  ok('C1 안내가 뜬 수령의 지급이 전부 Δ0 이다 (골드·다이아)',
    notices.every(x => x.dGold === 0 && x.dDia === 0),
    notices.map(x => x.dGold + '/' + x.dDia).join(' · '));
  ok('C2 안내가 뜬 수령이 하루 발행 예산을 **한 분도 안 먹는다** (`offMin` Δ0)',
    notices.every(x => x.dMin === 0), notices.map(x => x.dMin).join(' · '));
  ok('C3 그래서 하루 발행 누계는 예산 상한에서 멈춘다 (초과 발행 0)',
    SA.day.rows[SA.day.rows.length - 1].offMinAfter <= SA.day.cap + 1e-6,
    SA.day.rows[SA.day.rows.length - 1].offMinAfter + ' ≤ ' + SA.day.cap);
  ok('C4 지급이 있는 수령은 예산을 실제로 채운다 — 안내가 지급 경로를 가로채지 않았다',
    SA.day.rows[0].dMin > 0 && Math.abs(SA.day.rows[0].offMinAfter - SA.day.cap) < 1e-6,
    SA.day.rows[0].offMinAfter + ' / ' + SA.day.cap);
  ok('C5 안내를 띄운 뒤에도 `offPend` 가 안 남는다 (받을 표가 없는데 [받기]가 살아 있으면 안 된다)',
    await A.page.evaluate(() => offPend === null || offPend === undefined),
    'offPend 없음');
  ok('C6 콘솔·페이지 에러 0건', A.errs.length === 0, A.errs.length + '건');
  await A.ctx.close();

  console.log('\n[§R] 되돌림 시험 — 무르게 풀지 않았다');
  /* 옛 본체(조건 없는 침묵)로 되돌린 사본을 저장소 **밖**(os.tmpdir)에 만들어 같은 자를 댄다 */
  const tmp = path.join(os.tmpdir(), 'kkkkkk-842-revert-' + process.pid + '.html');
  const reverted = src.replace(
    /if\(sec < 60\)\{\s*\n\s*if\(away >= 60 && room \* 60 < 60\) notify\(OFF_CAP_MSG\);\s*\n\s*return;\s*\n\s*\}/,
    'if(sec < 60) return;');
  ok('R0 되돌림 사본이 실제로 달라졌다 (치환이 먹었다)', reverted !== src);
  fs.writeFileSync(tmp, reverted);
  const Bx = await open(browser, tmp);
  const SB = await samples(Bx.page);
  const rb = k => SB[k].rows[0];
  ok('R1 되돌리면 [B1] 이 다시 빨개진다 — 예산 소진 수령이 침묵으로 돌아간다', rb('empty').silent,
    rb('empty').silent ? '침묵(= 옛 결손)' : '⚠ 여전히 안내가 뜬다 — 자가 안 짚는다');
  ok('R2 되돌리면 [B6] 도 빨개진다 — 부지런 하루의 침묵이 3회로 돌아간다',
    SB.day.rows.filter(x => x.silent).length === 3,
    '침묵 ' + SB.day.rows.filter(x => x.silent).length + '회');
  ok('R3 되돌림은 **안내 한 줄**이다 — 지급(하루 발행 누계)은 수리 전후가 같다',
    Math.abs(SB.day.rows[SB.day.rows.length - 1].offMinAfter - SA.day.rows[SA.day.rows.length - 1].offMinAfter) < 1e-6,
    SB.day.rows[SB.day.rows.length - 1].offMinAfter + ' = ' + SA.day.rows[SA.day.rows.length - 1].offMinAfter);
  ok('R4 되돌림 사본에서도 ⓐ 는 침묵이다 — [B4] 는 수리와 무관하게 참인 «음성항» 이 아니다…',
    rb('short').silent, '침묵');
  ok('R5 …그래서 [B4] 를 지키는 것은 조건이다: 조건을 지운 사본은 ⓐ 까지 시끄러워진다',
    await (async () => {
      const tmp2 = path.join(os.tmpdir(), 'kkkkkk-842-loud-' + process.pid + '.html');
      fs.writeFileSync(tmp2, src.replace('if(away >= 60 && room * 60 < 60) notify(OFF_CAP_MSG);',
        'notify(OFF_CAP_MSG);'));
      const C = await open(browser, tmp2);
      const SC = await samples(C.page);
      await C.ctx.close(); fs.unlinkSync(tmp2);
      return !SC.short.rows[0].silent;
    })(), '조건 없는 사본은 자리비움 30초에도 안내가 뜬다 → [B4] 빨강');
  ok('R6 되돌림 사본에도 콘솔 에러 0건 (치환이 문법을 안 깼다)', Bx.errs.length === 0, Bx.errs.length + '건');
  await Bx.ctx.close();
  fs.unlinkSync(tmp);

  await browser.close();
  console.log('\nVERIFY842 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
