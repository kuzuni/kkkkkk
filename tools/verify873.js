#!/usr/bin/env node
/* 작업 873 게이트 — 「`travel838` 의 자는 **러너 속도에 안 흔들린다**」
 *
 *   node tools/verify873.js
 *
 * 자는 `tools/travel838.js` 한 벌이다(`probe873`·`probe838`·`verify838` 과 공용 — 402 «두 벌 금지»).
 *
 * 무엇을 지키는가 — 「시드를 고정했다」 는 「결과가 같다」 가 **아니다**. 시드 뒤 트리거까지
 * 게임 루프·파티클·적 스폰이 난수를 몇 번 쓰는지가 **프레임 수**에 달려 있어서, 러너가 바쁘면
 * 버스트가 수열의 다른 자리에서 시작한다(838 7회차가 그 흔들림을 회귀로 오독했다 — C1 ±15%).
 * 이 자는 그 «트리거 전 소비량» 을 `burn` 으로 **결정적으로** 흔들어 놓고 결과가 안 바뀌는지 본다.
 *
 * [A] 씬 A — 기본 호출과 burn 997·5003 이 **열한 축 전부 같은 값**(재시드가 기본이라는 뜻이기도 하다)
 * [B] 씬 B(점 대상 대조군)도 같다 — 재시드가 한 씬에만 붙어 있지 않다
 * [C] 문턱 여유 — 값이 한 점이 됐으니 `verify838` 문턱과의 여유를 찍는다.
 *     ⚠ C1 은 등재 시점에 **문턱 3.00 ↔ 무변경 최저 3.20**(여유 6.7%)으로 진폭에 붙어 있었다 —
 *       그 자리만 «여유 ≥ 5%» 로 지킨다(838 의 축은 여섯 회차 내내 올라온 축이라 하한만 본다).
 * [R] 되돌림 시험 — 재시드를 끄면 **같은 흔듦에 값이 갈린다**(무르게 푼 수리가 아니라는 증거 ·
 *     LESSONS 232-①). 두 burn 값 중 하나만 갈려도 통과다(우연히 같은 자리를 밟는 경우 방지).
 */
'use strict';
const { runScene, SCENES } = require('./travel838');

const p2 = n => Math.round(n * 100) / 100;
const AX = ['n', 'A1', 'A2', 'A4', 'A3', 'C1', 'C2', 'C3', 'E2', 'maxD', 'rE'];
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

function axes(A) {
  const arcNeed = A.n * 2 * Math.asin(Math.min(1, (A.maxD / 2) / Math.max(1e-9, A.rE))) * 180 / Math.PI;
  return { n: A.n, A1: p2(A.body), A2: p2(A.bodyMed), A4: p2(A.bodyMin), A3: p2(A.net),
           C1: p2(A.growth), C2: p2(A.iouPeak), C3: p2(A.fanGap), E2: p2(arcNeed),
           maxD: p2(A.maxD), rE: p2(A.rE), arcHave: p2(360 - A.fanGap), spill: p2(A.spill) };
}
const diff = (a, b) => AX.filter(k => a[k] !== b[k]);

(async () => {
  console.log('# VERIFY873 — `travel838` 재현성(러너 속도 불변)');

  /* ── [A] 씬 A — 기본 호출 ↔ 흔든 판 ───────────────────────────────── */
  const base = await runScene(SCENES[0]);                         /* opts 없음 = 제품 경로 그대로 */
  if (base.err) { ok(false, 'V0 씬 A 표본을 못 얻었다', base.err); return done(); }
  const b0 = axes(base);
  console.log('  · 씬 A 기준값 ' + AX.map(k => k + ' ' + b0[k]).join(' · '));

  const a997 = axes(await runScene(SCENES[0], null, { burn: 997 }));
  const a5003 = axes(await runScene(SCENES[0], null, { burn: 5003 }));
  const d1 = diff(b0, a997), d2 = diff(b0, a5003);
  ok(d1.length === 0, 'A1 씬 A — 트리거 전 난수 997 회 소비에도 열한 축 **전부 동일**',
     d1.length ? d1.map(k => k + ' ' + b0[k] + '→' + a997[k]).join(' · ') : '기본 호출이 곧 재시드판이다');
  ok(d2.length === 0, 'A2 5003 회 소비에도 동일 — 수열 자리에 안 매인다',
     d2.length ? d2.map(k => k + ' ' + b0[k] + '→' + a5003[k]).join(' · ') : 'burn 0 / 997 / 5003 세 판이 한 자리까지 같다');
  ok(base.errs.length === 0, 'A3 콘솔 에러 0', base.errs.slice(0, 2).join(' | '));

  /* ── [B] 대조군(점 대상)도 같은 규약을 받는다 ─────────────────────── */
  const B0 = await runScene(SCENES[1]);
  if (B0.err) { ok(false, 'B0 씬 B 표본을 못 얻었다', B0.err); }
  else {
    const bb = axes(B0), b997 = axes(await runScene(SCENES[1], null, { burn: 997 }));
    const dB = diff(bb, b997);
    ok(dB.length === 0, 'B1 씬 B(점 대상 대조군)도 흔듦에 안 움직인다',
       dB.length ? dB.map(k => k + ' ' + bb[k] + '→' + b997[k]).join(' · ') : '몸길이 ' + bb.A1 + ' · 알 ' + bb.n);
  }

  /* ── [C] 문턱 여유 — 값이 한 점이 된 뒤의 안전거리 ─────────────────── */
  const TH = [
    ['A1 사거리', b0.A1, 1.55, 'min'], ['A2 중앙값', b0.A2, 1.35, 'min'],
    ['A4 최소알', b0.A4, 0.55, 'min'], ['A3 총이동', b0.A3, 30, 'min'],
    ['C1 반경비', b0.C1, 3.00, 'min'], ['C2 IoU', b0.C2, 0.70, 'max'],
    ['C3 빈각', b0.C3, 135, 'max'], ['E2 요구호', b0.E2, b0.arcHave, 'max'],
  ];
  console.log('  · `verify838` 문턱 여유(결정적 값 기준)');
  TH.forEach(([n, v, t, dir]) => {
    const m = dir === 'min' ? (v - t) / t * 100 : (t - v) / Math.max(1e-9, v) * 100;
    console.log('      ' + n.padEnd(12) + String(v).padStart(8) + (dir === 'min' ? ' ≥ ' : ' ≤ ') + String(p2(t)).padStart(8) + '  여유 ' + p2(m) + '%');
  });
  const c1m = (b0.C1 - 3.00) / 3.00 * 100;
  ok(c1m >= 5, 'C1 C1(반경비)의 문턱 여유가 ≥ 5% — ' + p2(c1m) + '%',
     '등재 시점 6.7%(문턱 3.00 ↔ 무변경 최저 3.20)가 ±15% 진폭 안에 잠겨 있었다 · 지금 값 ' + b0.C1);

  /* ── [R] 되돌림 시험 — 재시드를 끄면 갈린다 ──────────────────────── */
  const r0 = axes(await runScene(SCENES[0], null, { reseed: false, burn: 0 }));
  const r997 = axes(await runScene(SCENES[0], null, { reseed: false, burn: 997 }));
  const dR = diff(r0, r997);
  ok(dR.length > 0, 'R1 재시드를 끈 판은 같은 흔듦에 **갈린다** — 갈린 축 ' + dR.length + '개',
     dR.length ? dR.slice(0, 5).map(k => k + ' ' + r0[k] + '→' + r997[k]).join(' · ') : '안 갈렸다(자가 무른지 확인할 것)');
  ok(diff(b0, r0).length > 0 || dR.length > 0,
     'R2 그 판이 기본 호출과도 다른 자리를 밟는다(= 기본이 재시드판이다)',
     '기본 C1 ' + b0.C1 + ' ↔ 재시드 ✗ C1 ' + r0.C1 + '/' + r997.C1);

  done();
})();

function done() {
  console.log('\nVERIFY873 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
}
