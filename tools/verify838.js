#!/usr/bin/env node
/* 작업 838 게이트 — 「요소 대상 버스트의 사거리」
 *
 *   node tools/verify838.js
 *
 * 자는 `tools/travel838.js` 한 벌이다(`probe838` 과 공용 — 402 «두 벌 금지»).
 *
 * [A] 사거리 — 씬 A(요소 대상)의 알이 **제 몸길이** 만큼 움직인다(수리 전 0.41 · 등재문 CV 0.59)
 * [B] 스필 0 — 그래도 알의 잉크가 호스트 상자 밖으로 안 나간다(619 28·13·14회차를 한 픽셀도 안 판다)
 * [C] 출생 반경 — 발원 중심에서 태어나 «퍼진다»(끝 반경 ÷ t=0 반경 · 수리 전 ×1.24)
 * [D] 대조군 — 점(좌표) 대상은 한 값도 안 바뀐다(같은 곡선·같은 사거리 — 이 수리는 요소 대상만 만진다)
 * [R] 되돌림 시험 — `FXB_KMAX` 를 종전 값(FXB_K)으로 되돌린 **사본**에서 [A] 가 빨갛다.
 *     (무르게 푼 수리가 아니라는 증거 — LESSONS 232-①)
 * ⚠ 사본은 임시 파일이고 크래시에도 지운다(810 — «남은 표본이 다음 자를 조용히 바꾼다»).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { runScene, SCENES } = require('./travel838');

const SRC = path.resolve(__dirname, '../index.html');
const TMP = path.resolve(__dirname, '../.tmp838-revert.html');
const p2 = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

(async () => {
  console.log('# VERIFY838 — 요소 대상 버스트 사거리(838)');
  const A = await runScene(SCENES[0]);
  const B = await runScene(SCENES[1]);
  if (A.err || B.err) { ok(false, 'V0 표본을 못 얻었다', (A.err || '') + ' ' + (B.err || '')); }
  else {
    console.log('  · 씬 A ' + Math.round(A.geo.bw) + '×' + Math.round(A.geo.bh) + ' · 알 ' + A.n
      + ' · 이동 ' + p2(A.net) + 'px ÷ 지름 ' + p2(A.maxD) + 'px');
    ok(A.body >= 0.72, 'A1 씬 A 사거리 ≥ 0.72 몸길이 — ' + p2(A.body), '수리 전 0.41 · 등재문 0.59');
    ok(A.bodyMin >= 0.30, 'A2 가장 안 움직인 알도 ≥ 0.30 몸길이 — ' + p2(A.bodyMin), '수리 전 0.21');
    ok(A.net >= 30, 'A3 총 이동 평균 ≥ 30px — ' + p2(A.net) + 'px', '수리 전 18.5px · CV 24.0 · CW 21.4');
    /* [B] 스필 — 619 13·14회차가 지키는 값을 **이 자에서 직접** 잰다(끝점·가둠 상자를 안 건드렸다는 증거).
       그린 상자(중심 ± w/2)가 호스트 상자를 넘으면 양수다. */
    ok(A.spill <= 1, 'B1 씬 A — 알 잉크가 호스트 상자 밖으로 안 나간다 · 최대 ' + p2(A.spill) + 'px',
       '619 28·13·14회차 · 여유 FXB_INPAD 4px 안쪽에서 끝나야 한다');
    ok(A.spill <= -3, 'B2 그 여유가 실제로 남아 있다(잉크가 액자에 «닿지» 않는다) — ' + p2(-A.spill) + 'px 안쪽',
       '619 14회차 «잉크와 액자 사이에 늘 4px»');
    ok(A.growth >= 1.45, 'C1 끝 반경 ÷ t=0 반경 ≥ 1.45 — ×' + p2(A.growth), '수리 전 ×1.24(등재문 +15~34%)');
    ok(B.body >= 3, 'D1 대조군(점 대상)은 종전대로 여러 몸길이 — ' + p2(B.body) + ' 몸길이', '수리 전 4.8');
    ok(A.errs.length === 0 && B.errs.length === 0, 'D2 콘솔 에러 0',
       [...A.errs, ...B.errs].slice(0, 2).join(' | '));
  }

  /* ── [R] 되돌림 시험 ─────────────────────────────────────────────── */
  let rev = null;
  try {
    const code = fs.readFileSync(SRC, 'utf8');
    const m = /const FXB_KMAX = [\d.]+, FXB_BODY = [\d.]+, FXB_KLAD = \d+;/.exec(code);
    ok(!!m, 'R0 되돌릴 선언을 찾았다', m ? m[0] : '못 찾음');
    if (m) {
      fs.writeFileSync(TMP, code.replace(m[0], 'const FXB_KMAX = FXB_K, FXB_BODY = 0, FXB_KLAD = 3;'));
      rev = await runScene(SCENES[0], TMP);
      ok(!rev.err && rev.body < 0.6,
         'R1 종전 값으로 되돌린 사본에서 사거리가 다시 짧다 — ' + (rev.err || p2(rev.body) + ' 몸길이'),
         '수리 전 0.41 재현');
      ok(!rev.err && rev.growth < 1.35,
         'R2 그 사본은 출생 반경도 종전 — ×' + (rev.err || p2(rev.growth)), '수리 전 ×1.24');
    }
  } finally { try { fs.unlinkSync(TMP); } catch (_) {} }

  console.log('\nVERIFY838 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
