#!/usr/bin/env node
/* 작업 838 재현기 — 「요소 대상 버스트(씬 A 계열)의 사거리가 알 지름의 0.59배 — 「터진다」 가 아니라
 *  「제자리에서 커졌다 꺼진다」」 (681 9회차 비평 2인 CV·CW 가 각각 1순위로 낸 자리)
 *
 *   node tools/probe838.js [--src <index.html>]
 *
 * 338 규칙 — 처방 전에 **찍힌 값**으로 재현한다. 등재문의 세 얼굴을 각각 잰다:
 *   ⓐ 사거리 0.59 몸길이(총 이동 24.0px ÷ 최대 지름 41px) · 점 대상(씬 B)은 9.5 몸길이 = **16배** 차
 *   ⓑ t=0 에 이미 흩어진 자리에서 태어난다(반경 성장 +15~34% · 씬 B 는 +887%)
 *   ⓒ 3↔4번째 장(45→70ms) IoU 0.744~0.775 = «같은 그림 두 장»(씬 B 는 0.05)
 *
 * ⚠ 이 자는 «지금 무엇인가» 를 찍을 뿐 통과·실패를 말하지 않는다(판정은 `tools/verify838.js`).
 *   ok/FAIL 은 «등재문이 이 트리에서 재현되는가» 를 묻는 것이라, 수리 뒤에는 [P] 절이 뒤집히는 게 정상이다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { runScene, SCENES } = require('./travel838');

const SRC = path.resolve(__dirname, '../index.html');
const TMP = path.resolve(__dirname, '../.tmp838-probe.html');
/* ⚑ 재현은 **수리 전 사본**에서 한다(probe681 선례 · 803 «옛 재현이 굳는» 함정 회피).
   사본은 838 의 두 회차를 다 되돌린다 — 1회차(당김 사다리)는 상수로, 2회차(발원 분리)는 신고 이름으로.
   ⚠ 임시 파일은 크래시에도 지운다(810). */
function revertCopy() {
  const code = fs.readFileSync(SRC, 'utf8');
  const m = /const FXB_KMAX = [\d.]+, FXB_BODY = [\d.]+, FXB_KLAD = \d+;/.exec(code);
  if (!m) return null;
  fs.writeFileSync(TMP, code.replace(m[0], 'const FXB_KMAX = FXB_K, FXB_BODY = 0, FXB_KLAD = 3;')
                            .replace(/--burst-from:/g, '--burst-x838:'));
  return TMP;
}

const p2 = n => Math.round(n * 100) / 100;
const argSrc = (() => { const i = process.argv.indexOf('--src'); return i > 0 ? process.argv[i + 1] : null; })();
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const info = (k, v) => console.log('       · ' + k + ': ' + v);

(async () => {
  console.log('# 838 재현 — 요소 대상 버스트의 사거리(«몸길이») ' + (argSrc ? '· 사본 ' + argSrc : ''));
  const out = {};
  for (const sc of SCENES) {
    const s = await runScene(sc, argSrc);
    out[sc.id] = s;
    console.log('\n## 씬 ' + sc.id + ' — ' + sc.n);
    if (s.err) { ok(false, 'S? 표본을 못 얻었다', s.err); continue; }
    info('호스트', Math.round(s.geo.bw) + '×' + Math.round(s.geo.bh) + ' @('
         + Math.round(s.geo.bx) + ',' + Math.round(s.geo.by) + ') · 알 ' + s.n + '개 · 수명 ' + s.dur + 'ms');
    info('사거리', '총 이동 평균 ' + p2(s.net) + 'px ÷ 최대 지름 평균 ' + p2(s.maxD) + 'px = **'
         + p2(s.body) + ' 몸길이** (최소 알 ' + p2(s.bodyMin) + ')');
    info('출생 반경', 't=0 ' + p2(s.r0) + 'px → 끝 ' + p2(s.rE) + 'px = **×' + p2(s.growth) + '**');
    info('이웃 장 IoU', s.pairIoU.map(v => p2(v)).join(' · ') + ' (최대 ' + p2(s.iouPeak) + ')');
    info('각도', '가장 큰 빈 각 ' + p2(s.fanGap) + '° · 2px 띠 최대 정렬 ' + s.pile + '알 · 스필 ' + p2(s.spill) + 'px'
         + ' · 발원 원반(r' + p2(s.geo.fr) + ') 안에서 끝난 알 ' + s.stuck + '개');
    console.log('\n| 알 | 최대 지름 | 총 이동 | 몸길이 | 경로 길이 | 최대 이웃 IoU |');
    console.log('|---|---|---|---|---|---|');
    s.per.forEach((e, i) => console.log('| #' + (i + 1) + ' | ' + p2(e.maxD) + ' | ' + p2(e.net) + ' | '
      + p2(e.body) + ' | ' + p2(e.pth) + ' | ' + p2(e.iouMax) + ' |'));
  }

  /* ── [P] 재현은 수리 전 사본에서 ─────────────────────────────────── */
  let A = out.train, B = out.relic;
  if (!argSrc) {
    const tmp = revertCopy();
    try {
      if (tmp) {
        A = await runScene(SCENES[0], tmp);
        B = await runScene(SCENES[1], tmp);
        console.log('\n## 수리 전 사본(838 두 회차 되돌림) — [P] 는 이 값을 묻는다');
        console.log('       · 씬 A ' + p2(A.body) + ' 몸길이 · 반경 ×' + p2(A.growth) + ' · 이웃 장 최대 IoU ' + p2(A.iouPeak));
        console.log('       · 씬 B ' + p2(B.body) + ' 몸길이 · 반경 ×' + p2(B.growth));
        console.log('       · 지금 트리 ↔ 사본: 사거리 ' + p2(out.train.body) + ' ↔ ' + p2(A.body)
          + ' · 반경 ×' + p2(out.train.growth) + ' ↔ ×' + p2(A.growth)
          + ' · IoU ' + p2(out.train.iouPeak) + ' ↔ ' + p2(A.iouPeak));
      }
    } finally { try { fs.unlinkSync(TMP); } catch (_) {} }
  }
  console.log('\n[P] 재현 — 등재문의 세 얼굴(수리 전 사본)');
  if (A && !A.err && B && !B.err) {
    ok(A.body < 1.0, 'P1 ⓐ 씬 A 사거리가 제 몸길이보다 짧다 — ' + p2(A.body) + ' 몸길이',
       '등재문 «0.59 몸길이(24.0px / 41px)»');
    ok(B.body > 3, 'P2 ⓐ 대조군(점 대상)은 여러 몸길이를 간다 — ' + p2(B.body) + ' 몸길이',
       '등재문 «9.5 몸길이» — 이 자는 **상자** 기준이라 절대값이 잉크 기준보다 작다(LESSONS 681-⑥). 갈리는 배수를 본다');
    ok(A.growth < 1.6, 'P3 ⓑ 씬 A 는 이미 흩어진 자리에서 태어난다 — 반경 ×' + p2(A.growth),
       '등재문 «250ms 동안 +15~34%»');
    ok(A.iouPeak > 0.5, 'P4 ⓒ 씬 A 에 «같은 그림 두 장» 이 있다 — 이웃 장 최대 IoU ' + p2(A.iouPeak),
       '등재문 «3↔4번째 장 0.744~0.775 · 씬 B 는 0.05»');
    info('16배 차 검산', '씬 B ' + p2(B.body) + ' ÷ 씬 A ' + p2(A.body) + ' = ×' + p2(B.body / A.body));
  } else ok(false, 'P0 두 씬을 다 못 쟀다');
  const errs = [...(A && A.errs || []), ...(B && B.errs || [])];
  ok(errs.length === 0, 'P5 콘솔 에러 0', errs.slice(0, 2).join(' | '));
  console.log('\nPROBE838 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
