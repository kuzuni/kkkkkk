#!/usr/bin/env node
/* 작업 884 게이트 — 「816 의 자는 **결정적이고**, 그 문턱은 **838 뒤 실측에 붙어 있다**」
 *
 *   node tools/verify884.js
 *
 * 자는 `tools/keepcov884.js` 한 벌이다(`probe816`·`verify816`·`probe884` 공용 — 402 «두 벌 금지»).
 *
 * 무엇을 지키는가 — 884 가 고친 것은 «문턱 숫자» 가 아니라 **자가 그림을 뜨는 방식**이다.
 * 문턱만 옮겨 놓고 자를 옛 성긴 격자로 되돌리면 «가끔 빨강» 이 그대로 돌아온다. 그래서 이 자는
 * 셋을 같이 지킨다: ① 값이 실행마다 안 흔들린다 ② 문턱과 실측 사이에 여유가 있다
 * ③ 초록이 **헛초록이 아니다**(같은 자로 재면 신고 안 한 잉크는 여전히 덮인다).
 *
 *   [A] 결정성  — 같은 시드 두 번이 모든 축에서 같은 값 · 격자를 바꿔 읽어도 산수가 일관
 *   [B] 여유     — `verify816`/`probe816` 이 쓰는 세 문턱과 실측 사이의 배수
 *   [C] 짝 항    — 제품 선언 판에서 코인(미신고 잉크)은 덮인다
 *   [D] 선언     — 자가 «촘촘한 격자 · `currentTime` · 트리거 직전 재시드 · 쉼 상태 잉크 상자» 를 지킨다
 *                 그리고 816 의 두 자가 **이 부품을 쓴다**(두 벌로 갈라지지 않았다)
 *   [R] 되돌림   — 격자를 옛 33ms 로 되돌리면 판정이 **위상에 따라 갈린다**(무르게 푼 수리가 아니다)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { runKeep, sweep, grid, SEEDS, STEP } = require('./keepcov884');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;
const p2 = n => Math.round(n * 100) / 100;
const T = f => fs.readFileSync(path.resolve(__dirname, f), 'utf8');

/* 816 의 두 자가 쓰는 문턱 — 여기 적힌 수가 저 파일들의 수와 같아야 뜻이 있다([D3] 이 그걸 묻는다) */
const TH_MAX = 0.05;      /* [P2]/[R1]  모든 판에서 «수리 전 최대 덮임» 이 이 값 이상 */
const TH_N05 = 4;         /* [P3]/[R1b] 모든 판에서 ≥5% 표본이 이 개수 이상(5ms 격자) */
const TH_NOW = 0.01;      /* [PD1]/[R1c] 제품 선언 판의 최대 덮임 상한 */
const TH_COIN = 0.20;     /* [PD1]/[R1c] 그 판에서 코인은 이 값 이상 덮인다 */

(async () => {
  console.log('# VERIFY884 — 816 자의 결정성·문턱 여유(838 뒤 재적합)');

  /* ── [A] 결정성 ──────────────────────────────────────────────────── */
  console.log('\n[A] 결정성 — 같은 시드는 같은 값을 낸다');
  const a1 = await runKeep('none', { seed: SEEDS[0] });
  const a2 = await runKeep('none', { seed: SEEDS[0] });
  ok(!a1.err && !a2.err && a1.num.max === a2.num.max && a1.num.n05 === a2.num.n05
     && a1.num.n25 === a2.num.n25 && a1.eggs === a2.eggs && a1.dur === a2.dur && a1.frames === a2.frames,
     'A1 같은 시드 두 번 — 최대 덮임·표본 수·알 수·수명이 **소수점까지** 같다',
     (a1.err || a2.err || '') + p1(a1.num.max * 100) + '% / ' + a1.num.n05 + '개 / ' + a1.eggs + '알 / '
     + a1.dur + 'ms  ↔  ' + p1(a2.num.max * 100) + '% / ' + a2.num.n05 + '개 / ' + a2.eggs + '알 / ' + a2.dur + 'ms');
  /* 1ms 로 뜬 표본을 5ms 격자로 **다시 읽으면** 5ms 로 뜬 판과 같아야 한다 —
     같지 않으면 값이 «격자» 가 아니라 «그 실행» 에 달렸다는 뜻이다. */
  const fine = await runKeep('none', { seed: SEEDS[0], step: 1 });
  const g5 = grid(fine.rows, STEP, 0);
  ok(!fine.err && g5.max === a1.num.max && g5.n05 === a1.num.n05,
     'A2 1ms 표본을 5ms 격자로 다시 읽은 값 = 5ms 로 뜬 판(자가 «실행» 이 아니라 «격자» 를 따른다)',
     p1(g5.max * 100) + '% / ' + g5.n05 + '개  ↔  ' + p1(a1.num.max * 100) + '% / ' + a1.num.n05 + '개');
  ok(!fine.err && fine.num.max >= a1.num.max,
     'A3 촘촘하게 뜰수록 봉우리를 더 잡는다(1ms 참값 ≥ 5ms 값) — 5ms 격자가 값을 **부풀리지 않는다**',
     '1ms ' + p1(fine.num.max * 100) + '% ≥ 5ms ' + p1(a1.num.max * 100) + '%');

  /* ── [B] 여유 ────────────────────────────────────────────────────── */
  console.log('\n[B] 여유 — 816 의 문턱과 실측 사이(고정 시드 ' + SEEDS.length + '판)');
  const pre = await sweep('none');
  ok(!pre.err && pre.covered === pre.seeds.length,
     'B1 수리 전 사본은 **모든 판에서** 숫자를 덮는다(816 이 지키는 것이 유령이 아니다)',
     pre.err || (pre.covered + '/' + pre.seeds.length + '판 · '
     + pre.per.map(s => p1(s.num.max * 100) + '%').join(' · ')));
  ok(!pre.err && pre.maxMin >= TH_MAX * 1.3,
     'B2 «최대 덮임 ≥ ' + p1(TH_MAX * 100) + '%» 문턱에 **여유 1.3배 이상**',
     pre.err || ('실측 최저 ' + p1(pre.maxMin * 100) + '% ↔ 문턱 ' + p1(TH_MAX * 100)
     + '% = ' + p2(pre.maxMin / TH_MAX) + '배'));
  ok(!pre.err && pre.n05Min >= TH_N05 * 1.5,
     'B3 «≥5% 표본 ≥ ' + TH_N05 + '개» 문턱에 **여유 1.5배 이상**',
     pre.err || ('실측 최저 ' + pre.n05Min + '개 ↔ 문턱 ' + TH_N05 + '개 = '
     + p2(pre.n05Min / TH_N05) + '배 (표본 ' + pre.frames + '개 · 수명 ' + a1.dur + 'ms)'));
  /* ⚠ 옛 문턱(≥25%)이 왜 못 쓰는 값인지를 **이 자가 계속 증언**한다 — 838 이 되돌려져 알이 다시
     커지면 이 항이 빨개지고, 그때가 816 의 문턱을 다시 재야 하는 때다(문턱을 굳히지 않는다). */
  ok(!pre.err && pre.maxMax < 0.25,
     'B4 옛 문턱(≥25%)은 여전히 **닿을 수 없다** — 838 이 되돌려지면 이 항이 먼저 빨개진다(문턱 재측정 신호)',
     pre.err || ('여덟 판 최대 ' + p1(pre.maxMax * 100) + '%'));

  /* ── [C] 짝 항 ───────────────────────────────────────────────────── */
  console.log('\n[C] 짝 항 — 제품 선언 판의 0 은 «버스트가 죽어서» 가 아니다');
  const now = await sweep(null);
  ok(!now.err && now.maxMax < TH_NOW,
     'C1 제품 선언 — 여덟 판 전부 숫자 덮임 ' + p1(TH_NOW * 100) + '% 미만',
     now.err || ('최대 ' + (now.maxMax * 100).toFixed(2) + '% (격자 반올림 한 칸 = 0.04%)'));
  ok(!now.err && now.coinMin >= TH_COIN,
     'C2 **같은 판에서 코인(미신고 잉크)은 덮인다** — 헛초록을 막는 항',
     now.err || (p1(now.coinMin * 100) + '~' + p1(now.coinMax * 100) + '% ↔ 문턱 ' + p1(TH_COIN * 100) + '%'));
  ok(!now.err && now.eggs === pre.eggs,
     'C3 두 판의 알 수가 같다 — 신고는 «어디를 지나가지 마라» 이지 «몇 개를 낳아라» 가 아니다',
     now.err || (now.eggs + '알 ↔ 수리 전 ' + pre.eggs + '알'));

  /* ── [D] 선언 ────────────────────────────────────────────────────── */
  console.log('\n[D] 선언 — 자가 옛 방식으로 되돌아가지 않았다');
  const K = T('keepcov884.js');
  ok(/a\.currentTime = T/.test(K) && /a\.pause\(\)/.test(K),
     'D1 시간은 «기다려서» 가 아니라 `currentTime` 을 **감아서** 맞춘다(`cap681` 규약)');
  ok(/const STEP = 5;/.test(K) && STEP <= 5,
     'D2 격자는 5ms 이하 — 옛 자의 33ms 성긴 격자로 안 돌아갔다', STEP + 'ms');
  /* 트리거를 낳는 부품(`RUN`) **안에서** 재시드가 dispatch 보다 앞에 있어야 한다 —
     페이지 머리(`addInitScript`)에만 심는 것으로는 873 이 지운 그 흔들림이 안 지워진다. */
  const RUNsrc = (K.match(/const RUN = \(\{[\s\S]*?\n\};/) || [''])[0];
  const iSeed = RUNsrc.indexOf('Math.random = function');
  const iFire = RUNsrc.indexOf("dispatchEvent(new PointerEvent('pointerdown'");
  ok(iSeed > 0 && iFire > iSeed,
     'D3 시드를 **트리거 직전**에 다시 심는다(873 처방 — 앞에서 몇 번 뽑았든 수열 자리가 같다)',
     '재시드 ' + iSeed + '자 ↔ 발화 ' + iFire + '자 (같은 `RUN` 안)');
  ok(/const ink = \{ num: rect\(inkOf\(el, 'i'\)\), coin: rect\(inkOf\(el, 's'\)\) \};[\s\S]{0,600}dispatchEvent\(new PointerEvent\('pointerdown'/.test(K),
     'D4 잉크 상자를 **트리거 전**(쉼 상태)에 잡는다 — 621 눌림이 판정을 뽑던 자리(871 계열)');
  const P = T('probe816.js'), V = T('verify816.js');
  ok(/require\('\.\/keepcov884'\)/.test(P) && /require\('\.\/keepcov884'\)/.test(V),
     'D5 816 의 두 자가 **이 부품 한 벌**을 쓴다(402 «두 벌 금지»)');
  ok(!/pre\.num\.max >= 0\.25/.test(P) && !/pre\.num\.pct05 >= 0\.30/.test(P),
     'D6 `probe816` 에 838 이전 크기의 옛 문턱(≥25% · ≥30%)이 안 남아 있다');
  ok(new RegExp('dPre\\.maxMin >= ' + TH_MAX).test(P) && new RegExp('dPre\\.maxMin >= ' + TH_MAX).test(V)
     && new RegExp('n05Min >= ' + TH_N05).test(P) && new RegExp('n05Min >= ' + TH_N05).test(V),
     'D7 816 의 두 자가 **같은 문턱**을 쓴다(' + p1(TH_MAX * 100) + '% · ' + TH_N05 + '개) — 갈리면 재현과 게이트가 다른 것을 지킨다');

  /* ── [R] 되돌림 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 격자를 옛 33ms 로 되돌리면 판정이 위상에 따라 갈린다');
  const ph = [];
  for (let off = 0; off < 33; off++) ph.push(grid(fine.rows, 33, off));
  const lo = Math.min(...ph.map(x => x.max)), hi = Math.max(...ph.map(x => x.max));
  ok(hi - lo >= 0.01,
     'R1 같은 판·같은 시드에서 **위상만** 바꿔도 최대 덮임이 1%p 이상 갈린다 — 촘촘한 격자가 지운 것이 이것이다',
     p1(lo * 100) + '~' + p1(hi * 100) + '% (참값 ' + p1(fine.num.max * 100) + '%)');
  ok(lo < fine.num.max * 0.95,
     'R2 성긴 격자는 봉우리를 놓친다 — 가장 나쁜 위상이 참값의 ' + p1(lo / fine.num.max * 100) + '%',
     '문턱 ' + p1(TH_MAX * 100) + '% 와의 거리: 참값 ' + p2(fine.num.max / TH_MAX) + '배 ↔ 성긴 격자 최저 '
     + p2(lo / TH_MAX) + '배');
  const errs = (a1.errs || []).concat(fine.errs || [], pre.errs || [], now.errs || []);
  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  console.log('\nVERIFY884 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
