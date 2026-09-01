/* 673 재현 — `tools/bot199.js` 의 오프라인 수령이 **실제 플레이어보다 적게 받는다** (338 규칙: 처방 전에 재현)
 *
 *   node tools/probe673.js
 *
 * 왜 이 자가 필요한가 — 등재문(650 1회차 곁다리)은 «봇이 버튼을 안 누르고 `claimOffline(1.5)` 를
 * 직접 부르므로 650 이 남겨 둔 API 난간(«결손A» 가드)에 그대로 막혀 하루 예산의 23.4% 를 버린다»
 * 고 적었다. 그런데 그것은 **계수가 아니라 계측기 결함**이라 «봇 표가 실제 플레이어를 과소평가한다»
 * 는 주장 자체를 먼저 재현해야 한다 — 손잡이를 돌려 메우면 실제 유저에게 이중으로 얹힌다.
 *
 * 읽는 법 — «부지런» 프로필의 하루치 오프라인 네 번을 두 경로로 각각 굴려 **총합**을 비교한다:
 *   · 봇 경로  — `tools/bot199.js` 가 실제로 적어 둔 표현식을 **소스에서 읽어** 그대로 부른다.
 *   · 유저 경로 — 팝업의 광고 버튼(`#ofrGet15`)을 진짜로 누른다(650 이 고친 그 자리).
 * 둘이 갈리면 봇 표는 계수가 아니라 **계측기**가 틀린 것이다.
 *
 * ⚑ 이 자는 «옛 표현식»(`a.offlineMul`)도 같이 굴린다 — 그것이 §R 되돌림 시험이다.
 *    수리 뒤에도 옛 표현식은 여전히 적게 받아야 하고(가드는 살아 있다), 소스에서 읽은
 *    현행 표현식만 유저 경로와 같아야 한다. 그래야 «무르게 풀지 않았음» 이 못박힌다.
 *
 * LESSONS 319 — 페이지 안 예외로 즉사시키지 않는다(블록별로 잡아 그 항만 빨개진다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const BOT  = path.join(ROOT, 'tools', 'bot199.js');

/* bot199.js·probe650.js 의 «부지런» 프로필 그대로 */
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

/* ── 봇이 실제로 부르는 인자 표현식을 **소스에서** 읽는다 ────────────────────────
   상수로 적어 두면 봇이 되돌아가도 이 자는 초록이다(402 «표 두 벌»). 괄호는 균형을 세어 자른다. */
function botClaimExpr() {
  const src = fs.readFileSync(BOT, 'utf8');
  const line = src.split('\n').find(l => l.includes('offlineReward(lastLogout)') && l.includes('claimOffline('));
  if (!line) return { err: '`offlineReward(lastLogout)` + `claimOffline(` 이 같은 줄에 없다 — bot199.js 가 바뀌었다' };
  const at = line.indexOf('claimOffline(') + 'claimOffline('.length;
  let depth = 1, i = at;
  for (; i < line.length && depth > 0; i++) {
    if (line[i] === '(') depth++;
    else if (line[i] === ')') depth--;
  }
  if (depth !== 0) return { err: '괄호가 안 닫힌다 — 표현식을 못 읽었다' };
  return { expr: line.slice(at, i - 1).trim(), line: line.trim() };
}

/* 한 번의 측정 = «부지런» 하루치 오프라인 네 번을 한 경로로 굴린 총합.
   mode: 'expr'(봇 — 표현식 문자열) · 'btn'(유저 — 광고 버튼 클릭) · 'api'(난간 확인) */
async function measure(page, mode, expr) {
  return page.evaluate(({ gaps, mul, mode, expr }) => {
    const out = { errs: [] };
    try {
      S.daily = S.daily || {}; S.daily.offMin = 0;
      S.gold = 0; S.dia = 0;
      const a = { offlineMul: mul };
      const arg = mode === 'expr' ? new Function('a', 'return (' + expr + ');') : null;
      let claimed = 0, refused = 0;
      for (const g of gaps) {
        offlineReward(Date.now() - g * 3600 * 1000);
        if (!offPend) { refused++; continue; }
        const b = S.daily.offMin || 0;
        if      (mode === 'btn') document.getElementById('ofrGet15').click();
        else if (mode === 'api') claimOffline(mul);
        else                     claimOffline(arg(a));
        if ((S.daily.offMin || 0) > b) claimed++; else refused++;
        if (document.getElementById('offw').classList.contains('on')) closeOfflineReward();
      }
      out.min  = +(S.daily.offMin || 0).toFixed(4);
      out.gold = Math.round(S.gold);
      out.dia  = S.dia;
      out.claimed = claimed; out.refused = refused;
      out.cap = (typeof OFF_DAY_CAP_MIN === 'number' ? OFF_DAY_CAP_MIN : null);
    } catch (e) { out.errs.push('evaluate: ' + e.message); }
    return out;
  }, { gaps: gapsOf(DILIGENT), mul: DILIGENT.mul, mode, expr });
}

/* 실효 이득이 **있는** 상태(첫 수령 하나)에서 그 표현식이 여전히 ×1.5 를 먹는가 — §R */
async function gainful(page, expr) {
  return page.evaluate(({ gap, mul, expr }) => {
    const out = { errs: [] };
    try {
      S.daily = S.daily || {}; S.daily.offMin = 0; S.gold = 0; S.dia = 0;
      offlineReward(Date.now() - gap * 3600 * 1000);
      if (!offPend) return { errs: ['첫 수령이 안 열린다'] };
      out.gain = offPend.gain; out.sec = offPend.sec;
      const a = { offlineMul: mul };
      claimOffline(new Function('a', 'return (' + expr + ');')(a));
      out.min = +(S.daily.offMin || 0).toFixed(4);
    } catch (e) { out.errs.push('evaluate: ' + e.message); }
    return out;
  }, { gap: gapsOf(DILIGENT)[0], mul: DILIGENT.mul, expr });
}

(async () => {
  const B = botClaimExpr();
  console.log('[봇 소스] tools/bot199.js — `' + (B.expr || '??') + '`');
  if (B.err) { console.log('  ' + B.err); console.log('\nPROBE673 0/1 FAIL'); process.exit(1); }

  const OLD = 'a.offlineMul';                       /* 673 이전(= 등재문이 지목한) 표현식 */

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + FILE);
  await page.waitForTimeout(900);

  const bot  = await measure(page, 'expr', B.expr);
  const old  = await measure(page, 'expr', OLD);
  const user = await measure(page, 'btn');
  const api  = await measure(page, 'api');
  const gBot = await gainful(page, B.expr);
  await ctx.close(); await browser.close();

  const cap = user.cap;
  const pct = v => (v / cap * 100).toFixed(2) + '%';
  console.log('\n[부지런 하루치 오프라인 4회 — 하루 예산 ' + cap + '분]');
  const row = (t, o) => console.log('  ' + t.padEnd(22) + ' 발행 ' + String(o.min).padStart(9) + '분 (' + pct(o.min).padStart(7) + ')' +
    ' · 골드 ' + String(o.gold).padStart(12) + ' · 다이아 ' + String(o.dia).padStart(8) +
    ' · 수령 ' + o.claimed + '/거절 ' + o.refused);
  row('유저(광고 버튼)', user);
  row('봇(현행 소스)', bot);
  row('봇(옛 표현식)', old);
  row('claimOffline(1.5) 직접', api);

  console.log('\n— 재현 판정 (등재문이 지목한 옛 표현식) —');
  ok('[1] 유저 경로는 하루 예산을 다 받는다', Math.abs(user.min - cap) < 1e-6, user.min + '분 / ' + cap + '분');
  ok('[2] ⚑ 옛 표현식(`a.offlineMul`)은 네 번째 수령이 통째로 거절된다', old.refused >= 1, '거절 ' + old.refused + '회');
  ok('[3] ⚑ 그 차이가 하루 예산의 23.4% 다 — 계수가 아니라 계측기 결함',
    Math.abs((user.min - old.min) / cap * 100 - 23.44) < 0.1,
    'Δ' + (user.min - old.min).toFixed(1) + '분 = ' + pct(user.min - old.min));
  ok('[4] 다이아도 같은 비로 적게 잡힌다', old.dia < user.dia,
    '봇(옛) ' + old.dia.toLocaleString() + ' vs 유저 ' + user.dia.toLocaleString() +
    ' (+' + ((user.dia / old.dia - 1) * 100).toFixed(1) + '%)');

  console.log('\n— 처방 판정 (현행 bot199.js) —');
  ok('[5] ⚑ 봇이 유저 경로와 **정확히 같은 액수**를 받는다 (분·골드·다이아)',
    bot.min === user.min && bot.gold === user.gold && bot.dia === user.dia,
    '봇 ' + bot.min + '분/' + bot.dia.toLocaleString() + '다이아 ‖ 유저 ' + user.min + '분/' + user.dia.toLocaleString() + '다이아');
  ok('[6] 봇도 거절 0회 — 네 번째 수령을 버리지 않는다', bot.refused === 0, '거절 ' + bot.refused + '회');
  ok('[7] 초과 발행 0 — 하루 예산을 넘겨 받지 않는다', bot.min <= cap + 1e-6, bot.min + '분 ≤ ' + cap + '분');

  console.log('\n— §R 되돌림 시험 (무르게 풀지 않았음) —');
  ok('[R1] 제품의 «결손A» 난간은 그대로다 — `claimOffline(1.5)` 직접 호출은 여전히 거절한다',
    api.refused >= 1, '거절 ' + api.refused + '회 · 발행 ' + api.min + '분');
  ok('[R2] 실효 이득이 **있는** 수령에서는 봇도 여전히 ×1.5 를 먹는다',
    gBot.gain > 1.4995 && Math.abs(gBot.min - gBot.sec / 60 * 1.5) < 1e-6,
    'gain ' + (gBot.gain || 0).toFixed(4) + ' · 발행 ' + gBot.min + '분 = 자리비움 ' + (gBot.sec / 60).toFixed(1) + '분 × 1.5');
  ok('[R3] 봇은 상수가 아니라 **소스**를 읽는다 — 옛 표현식과 현행이 실제로 다르다',
    B.expr !== OLD, '`' + B.expr + '` ≠ `' + OLD + '`');
  ok('[R4] 콘솔·페이지 에러 0건', errs.length === 0 && !bot.errs.length && !user.errs.length, errs.concat(bot.errs || []).join(' / ') || '0건');

  console.log('\nPROBE673 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
