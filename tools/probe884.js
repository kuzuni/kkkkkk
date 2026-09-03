#!/usr/bin/env node
/* 작업 884 재현기 — 「`probe816` [P2][P3] 은 **닿을 수 없는 문턱**이고, `verify816` [R1] 은 **잡음 안**이다」
 *
 *   node tools/probe884.js
 *
 * 등재문(883 회귀 스윕의 곁다리)이 말한 것을 **찍힌 값**으로 잰다(338 규칙 — 처방 전에 재현):
 *   ⓐ 838 이 버스트를 약하게 만든 뒤 «816 이전»(`--burst-keep:none`)의 덮임이 70.4% → 한 자릿수~10%대다.
 *   ⓑ 그래서 옛 문턱(최대 ≥25% · ≥5% 표본 ≥30%)은 **어느 판에서도 못 닿는다** = 게이트 부패.
 *   ⓒ `verify816` [R1](«≥5% 표본 > 0»)은 초록이지만 여유가 **표본 한두 개**뿐이다.
 *
 * ⚑ **반복 실행으로 «가끔 빨갛다» 를 보이지 않는다**(873 §3 의 규약 — 부하는 재현 «조건» 이지 축이 못 된다).
 *   대신 자 손잡이 둘로 **결정적으로** 흔든다:
 *     `runKeep(..., {step:1})`  수명 전 구간을 1ms 로 떠서 **참값**(놓친 봉우리가 없는 최댓값)을 얻고,
 *     `grid(rows, 33, off)`     옛 자가 실제로 쓰던 성긴 격자(왕복 지연 탓 33ms)를 **위상만 바꿔** 다시 읽는다.
 *   ⇒ «표본 시각» 이 판정을 얼마나 뽑는지가 한 판 안에서 드러난다.
 *
 * ⚠ 이 자는 «지금 무엇인가» 를 찍을 뿐 통과·실패를 말하지 않는다(판정은 `tools/verify884.js`).
 */
'use strict';
const { runKeep, sweep, grid, SEEDS } = require('./keepcov884');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const info = (k, v) => console.log('       · ' + k + ': ' + v);
const p1 = n => Math.round(n * 10) / 10;
const OLD_STEP = 33;                     /* 옛 자의 실제 표본 간격 — 16ms 요청에 왕복이 얹혀 33ms */

(async () => {
  console.log('# PROBE884 — 816 두 자의 문턱과 잡음(838 뒤 재측정)');
  console.log('[1] 참값 — 수리 전 사본(`--burst-keep:none`)을 1ms 로 수명 전 구간 훑기 · 고정 시드 '
              + SEEDS.length + '판');

  const pre = [];
  for (const sd of SEEDS) {
    const st = await runKeep('none', { seed: sd, step: 1 });
    if (st.err) { ok(false, '1-x 자가 돌았다(시드 ' + sd + ')', st.err); continue; }
    const phases = [];
    for (let off = 0; off < OLD_STEP; off++) phases.push(grid(st.rows, OLD_STEP, off));
    pre.push({ sd, st, phases });
    info('시드 ' + sd,
         '참최대 ' + p1(st.num.max * 100) + '% · ≥5% 표본 ' + st.num.n05 + '/' + st.frames
         + ' (' + p1(st.num.pct05 * 100) + '%) · ≥25% ' + st.num.n25
         + '  ‖ 옛 격자(33ms) 위상별 최대 ' + p1(Math.min(...phases.map(p => p.max)) * 100)
         + '~' + p1(Math.max(...phases.map(p => p.max)) * 100) + '%'
         + ' · ≥5% 표본 ' + Math.min(...phases.map(p => p.n05)) + '~' + Math.max(...phases.map(p => p.n05))
         + '/' + phases[0].n);
  }
  if (!pre.length) { console.log('\nPROBE884 0/1 FAIL — 표본 없음'); process.exit(1); }

  const trueMax = Math.max(...pre.map(p => p.st.num.max));
  const truePct05 = Math.max(...pre.map(p => p.st.num.pct05));
  const n25 = pre.reduce((a, p) => a + p.st.num.n25, 0);

  console.log('\n[2] 등재문 재현 — 옛 문턱은 **닿을 수 없다**(게이트 부패)');
  ok(trueMax < 0.25 && n25 === 0,
     '2-a 옛 [P2](«수리 전에 숫자가 ≥25% 덮인다»)는 **여덟 판 × 수명 전 구간 어디에도 없다**',
     '참최대의 최댓값 ' + p1(trueMax * 100) + '% · ≥25% 표본 합 ' + n25 + '개');
  ok(truePct05 < 0.30,
     '2-b 옛 [P3](«≥5% 표본 ≥30%»)도 마찬가지 — 참값이 문턱 아래다',
     '≥5% 표본 비율 최댓값 ' + p1(truePct05 * 100) + '%');
  ok(pre.every(p => p.st.num.max > 0),
     '2-c 그런데 **덮임 자체는 살아 있다** — 여덟 판 전부 0 이 아니다(816 이 지키는 것이 유령이 아니라는 뜻)',
     pre.map(p => p1(p.st.num.max * 100) + '%').join(' · '));

  console.log('\n[3] 등재문 재현 — 옛 자의 판정은 **표본 시각이 뽑는다**');
  const swing = pre.map(p => {
    const mx = p.phases.map(x => x.max);
    return { sd: p.sd, lo: Math.min(...mx), hi: Math.max(...mx), truth: p.st.num.max };
  });
  const worst = swing.reduce((b, s) => (s.lo / s.truth < b.lo / b.truth ? s : b), swing[0]);
  ok(swing.some(s => s.hi - s.lo >= 0.01),
     '3-a 같은 판·같은 시드에서 **위상만** 바꿔도 «최대 덮임» 이 갈린다(옛 자에는 이 위상을 고를 방법이 없다)',
     swing.map(s => p1(s.lo * 100) + '~' + p1(s.hi * 100) + '%').join(' · '));
  ok(worst.lo / worst.truth < 0.95,
     '3-b 성긴 격자는 봉우리를 **놓친다** — 가장 나쁜 판에서 참값의 ' + p1(worst.lo / worst.truth * 100) + '% 만 잡는다',
     '시드 ' + worst.sd + ' — 참값 ' + p1(worst.truth * 100) + '% ↔ 성긴 격자 최저 ' + p1(worst.lo * 100) + '%');
  const n05lo = Math.min(...pre.map(p => Math.min(...p.phases.map(x => x.n05))));
  ok(n05lo <= 3,
     '3-c 옛 [R1](«≥5% 표본 > 0»)의 여유는 **표본 한두 개**다 — 세대가 겹치는 홀드에서 이 여유가 0 이 되는 자리가 «가끔 빨강»',
     '성긴 격자 ≥5% 표본 최저 ' + n05lo + '개 / ' + pre[0].phases[0].n + '표본');

  console.log('\n[4] 새 자 — 결정적이고, 신고를 따라간다');
  const a = await runKeep('none', { seed: SEEDS[0] });
  const b = await runKeep('none', { seed: SEEDS[0] });
  ok(!a.err && !b.err && a.num.max === b.num.max && a.num.n05 === b.num.n05 && a.eggs === b.eggs,
     '4-a 같은 시드 두 번이 **소수점까지** 같다(873 이 `travel838` 에서 얻은 «진폭 0»)',
     p1(a.num.max * 100) + '% / ' + a.num.n05 + '개  ↔  ' + p1(b.num.max * 100) + '% / ' + b.num.n05 + '개');
  const now = await sweep(null);
  ok(!now.err && now.maxMax < 0.01 && now.coinMin >= 0.20,
     '4-b 제품 선언에서는 여덟 판 전부 숫자 1% 미만이고 **코인(미신고 잉크)은 덮인다** — 버스트가 죽어서 0 인 것이 아니다',
     '숫자 최대 ' + (now.maxMax * 100).toFixed(2) + '% · 코인 ' + p1(now.coinMin * 100) + '~' + p1(now.coinMax * 100) + '%');

  const errs = pre.reduce((x, p) => x.concat(p.st.errs || []), []).concat(now.errs || []);
  ok(errs.length === 0, '4-c 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  console.log('\nPROBE884 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
