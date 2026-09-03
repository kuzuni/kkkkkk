#!/usr/bin/env node
/* 작업 838 게이트 — 「요소 대상 버스트의 사거리」
 *
 *   node tools/verify838.js
 *
 * 자는 `tools/travel838.js` 한 벌이다(`probe838` 과 공용 — 402 «두 벌 금지»).
 *
 * ⚑ **873 이후 이 자의 값은 결정적이다(러너 부하와 무관).** 7회차까지는 시드를 고정하고도
 *   트리거 전 난수 소비량이 프레임 수에 매여 C1 ×3.20~3.72 · A4 1.21~1.44 로 흔들렸고,
 *   그래서 «단일 실행 ↔ 단일 실행» 대조가 회귀를 못 읽었다. `travel838` 이 트리거 **직전**에
 *   재시드하도록 고친 뒤(873 · `cap681.js` 규약 · LESSONS 666-⑧) 동시 4실행이 한 자리까지 같다.
 *   **기준값(873 시점)**: A1 2.36 · A2 1.94 · A4 1.44 · A3 38.5 · C1 ×3.41 · C2 0.52 ·
 *   C3 105.47° · E2 171.28°/254.53° · 알 10 · 지름 16.22 · 끝반경 54.47. 8회차는 이 값과 견준다.
 *   재현성 자체의 게이트는 `tools/verify873.js`.
 *
 * [A] 사거리 — 씬 A(요소 대상)의 알이 **제 몸길이** 만큼 움직인다(수리 전 0.41 · 등재문 CV 0.59)
 * [B] 스필 0 — 그래도 알의 잉크가 호스트 상자 밖으로 안 나간다(619 28·13·14회차를 한 픽셀도 안 판다)
 * [C] 출생 반경 — 발원 중심에서 태어나 «퍼진다»(끝 반경 ÷ t=0 반경 · 수리 전 ×1.24)
 * [D] 대조군 — 점(좌표) 대상은 한 값도 안 바뀐다(같은 곡선·같은 사거리 — 이 수리는 요소 대상만 만진다)
 * [E] 반경 예산(6회차 신설) — DG 가 5회차 채점에서 낸 **손익분기 산수**를 그대로 자로 세운다:
 *     끝반경 R 에서 지름 d 인 알 하나가 먹는 각은 `2·asin(d/2R)` 라, 알 n 개가 요구하는 호는
 *     `n · 2·asin(d/2R)` 이고 쓸 수 있는 호는 `360 − 빈 각` 이다. 요구가 공급을 넘으면
 *     **뭉침과 내부 구멍이 «동시에» 난다**(5회차 실측: 14알 R41 ⇒ 324° 요구 ↔ 280° 공급).
 *     ⚠ 이 자가 [C2](이웃 장 IoU)·[C3](빈 각)과 **다른 것을 묻는다** — 둘은 «지금 그림이 어떤가»
 *       이고 이 항은 «지금 그림이 **산술적으로 가능한가**» 다. 앞 다섯 회차가 두 축을 번갈아
 *       빨갛게 만든 이유가 이 예산이 늘 적자였기 때문이다.
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
    ok(A.body >= 1.55, 'A1 씬 A 사거리 ≥ 1.55 몸길이 — ' + p2(A.body),
       '수리 전 0.41 · 1회차 0.83 · 2회차 1.36~1.82 · 3회차 1.68~1.71 · 등재문 0.59');
    /* 비평 2인(CX·CY)이 **중앙값**으로 적었다 — 평균만 지키면 «긴 알 둘이 표를 만든다» */
    ok(A.bodyMed >= 1.35, 'A2 중앙값도 ≥ 1.35 몸길이 — ' + p2(A.bodyMed),
       '1회차 채점 CX 0.77 · CY 0.61 · 3회차 채점 DB 1.73 · DC 2.04');
    /* ⚑ 4회차 신설 — 3회차 채점의 **두 사람 공통 관측**: «오른쪽 3~4알이 발원 코인 반경 안에 붙박여
       총 7px 만 움직인다»(DB) · «3트랙이 1.1 몸길이 미만»(DC). 평균·중앙값은 그 알들을 못 본다. */
    ok(A.bodyMin >= 0.55, 'A4 가장 안 움직인 알도 ≥ 0.55 몸길이 — ' + p2(A.bodyMin) + ' (발원에 붙박인 알 0)',
       '3회차 0.34~0.46 · 2회차 0.22~0.25 · 수리 전 0.21');
    ok(A.net >= 30, 'A3 총 이동 평균 ≥ 30px — ' + p2(A.net) + 'px',
       '수리 전 18.5px · CV 24.0 · CW 21.4 — 3·4회차는 «벽까지» 대신 «방의 82~100%» 이고 알도 작아졌다. '
       + '판정 축은 **몸길이**(A1·A2·A4)이고 이 항은 «절대 이동이 수리 전으로 안 돌아간다» 를 지킨다');
    /* [B] 스필 — 619 13·14회차가 지키는 값을 **이 자에서 직접** 잰다(끝점·가둠 상자를 안 건드렸다는 증거).
       그린 상자(중심 ± w/2)가 호스트 상자를 넘으면 양수다. */
    ok(A.spill <= 1, 'B1 씬 A — 알 잉크가 호스트 상자 밖으로 안 나간다 · 최대 ' + p2(A.spill) + 'px',
       '619 28·13·14회차 · 여유 FXB_INPAD 4px 안쪽에서 끝나야 한다');
    ok(A.spill <= -3, 'B2 그 여유가 실제로 남아 있다(잉크가 액자에 «닿지» 않는다) — ' + p2(-A.spill) + 'px 안쪽',
       '619 14회차 «잉크와 액자 사이에 늘 4px»');
    ok(A.growth >= 3.00, 'C1 끝 반경 ÷ t=0 반경 ≥ 3.00 — ×' + p2(A.growth),
       '수리 전 ×1.24(등재문 +15~34%) · 1회차 ×1.53 · CX 처방 «3.5× 이상»');
    /* 두 비평가가 «같은 그림 두 장» 으로 읽은 그 쌍 — 자에도 축을 세운다 */
    ok(A.iouPeak <= 0.70, 'C2 이웃 장 최대 IoU ≤ 0.70 — ' + p2(A.iouPeak),
       '수리 전 0.78 · CX 0.69 · CY 0.718(같은 자리)');
    /* ⚑ 3회차 신설 — 2회차 채점에서 **두 사람이 각각 각도로** 결함을 적었다(CZ «40.8° 부채 · 끝 x 폭 1.3px» ·
       DA «좌향 65° 쐐기 · f8 에 4알이 x=68±0.5»). 클램프가 각도 정보를 지운 서명이라 자에 축을 세운다. */
    ok(A.stuck === 0, 'A5 **발원 원반 안에서 끝나는 알 0개** — ' + A.stuck + '개 (발원 반경 ' + p2(A.geo.fr) + 'px)',
       '4회차 채점 DD 3알(250ms) · DE 6/12알(110ms) — 갈 방이 발원 반경보다 얕은 방향으로 쏜 알이었다');
    /* ⚠ 문턱이 4회차의 100 에서 120 으로 **열렸다** — 값을 결과에 맞춘 것이 아니라 **A5 와 맞바꾼 것**이다.
       「53」 쪽 ±40° 섹터는 방이 35px 뿐이라 «발원 원반(26px)을 벗어나는 알» 이 **산술적으로 못 산다**:
       A5 를 0 으로 지키면 그 섹터가 비고(빈 각 116~122°), 그 섹터를 쓰면 A5 가 5알로 빨개진다(5회차 실측 둘 다).
       둘 중 비평 2인이 1순위로 적은 것은 A5 쪽이다(DD·DE 4회차) — 그래서 A5 를 지키고 이 값이 대가를 적는다. */
    ok(A.fanGap <= 135, 'C3 끝점이 온 원에 퍼진다 — 가장 큰 빈 각 ≤ 135° · ' + p2(A.fanGap) + '°',
       '2회차 채점 CZ «40.8° 부채»(= 빈 각 319°) · DA «65° 쐐기»(= 빈 각 295°) · 4회차 52~92°(A5 전) · 5회차 116~122°(A5 와 맞바꿈 · 문턱은 그 위로 띄웠다 — 574·709·825 «문턱 플레이키»)');
    /* ── [E] 반경 예산(6회차) — 위 머리말의 DG 산수 ────────────────── */
    const arcNeed = A.n * 2 * Math.asin(Math.min(1, (A.maxD / 2) / Math.max(1e-9, A.rE))) * 180 / Math.PI;
    const arcHave = 360 - A.fanGap;
    ok(A.n <= 10, 'E1 씬 A 의 알이 **10개 이하**다(`--burst-n` 신고가 실제로 걸린다) — ' + A.n + '개',
       '5회차까지 14알(첫 발 `fxUpOk` 10 + 반복 `UPFX_NOW` 4) · DG «피치 15.4° → 21.6°»');
    ok(arcNeed <= arcHave,
       'E2 반경 예산이 **흑자**다 — 알들이 요구하는 호 ' + p2(arcNeed) + '° ≤ 쓸 수 있는 호 ' + p2(arcHave) + '°',
       'DG 5회차 손익분기 «14알 R41 ⇒ 324° 요구 ↔ 280° 공급 = 44° 적자» · n ' + A.n
       + ' · 지름 ' + p2(A.maxD) + ' · 끝반경 ' + p2(A.rE) + 'px');
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
      /* 되돌림은 **두 회차를 다 되돌린다** — 1회차(당김 사다리)는 상수로, 2회차(발원 분리)는
         신고 이름을 죽여서(`--burst-from` → 아무도 안 읽는 이름). 제품 파일은 안 건드린다. */
      fs.writeFileSync(TMP, code.replace(m[0], 'const FXB_KMAX = FXB_K, FXB_BODY = 0, FXB_KLAD = 3;')
                                .replace(/--burst-from:/g, '--burst-x838:'));
      rev = await runScene(SCENES[0], TMP);
      ok(!rev.err && rev.body < 0.6,
         'R1 두 회차를 되돌린 사본에서 사거리가 다시 짧다 — ' + (rev.err || p2(rev.body) + ' 몸길이'),
         '수리 전 0.41 재현');
      ok(!rev.err && rev.growth < 1.35,
         'R2 그 사본은 출생 반경도 종전 — ×' + (rev.err || p2(rev.growth)), '수리 전 ×1.24');
    }
    /* ⚑ 6회차 되돌림 — 신고 **둘만** 걷는다(제품 상수는 그대로). 5회차의 그림으로 돌아가
       [E2] 가 적자가 되는지 본다: «무르게 푼 수리가 아니다» 를 이 항이 못박는다(LESSONS 232-①). */
    {
      const code2 = fs.readFileSync(SRC, 'utf8');
      const has = /--burst-n:\s*\d+/.test(code2) && /--burst-fit:\s*[\d.]+/.test(code2);
      ok(has, 'R3a 6회차의 두 신고가 제품에 있다(`--burst-n` · `--burst-fit`)',
         has ? '`.tr-card>.cb`' : '못 찾음');
      if (has) {
        fs.writeFileSync(TMP, code2.replace(/--burst-n:\s*\d+;/g, '').replace(/--burst-fit:\s*[\d.]+;/g, ''));
        const r2 = await runScene(SCENES[0], TMP);
        const need2 = r2.err ? 0 : r2.n * 2 * Math.asin(Math.min(1, (r2.maxD / 2) / Math.max(1e-9, r2.rE))) * 180 / Math.PI;
        const have2 = r2.err ? 0 : 360 - r2.fanGap;
        ok(!r2.err && need2 > have2,
           'R3b 두 신고를 걷으면 [E2] 가 **적자**로 돌아간다 — 요구 ' + p2(need2) + '° > 공급 ' + p2(have2) + '°',
           r2.err || ('n ' + r2.n + ' · 지름 ' + p2(r2.maxD) + ' · 끝반경 ' + p2(r2.rE) + 'px'));
      }
    }
  } finally { try { fs.unlinkSync(TMP); } catch (_) {} }

  console.log('\nVERIFY838 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
