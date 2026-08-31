#!/usr/bin/env node
/* 작업 356 17회차 — 16회차가 «기하» 로 넘긴 `#rwCost>i>.cic` 를 세 점(DSF 2·3·4)으로 다시 묻는다.
 *
 *   node tools/cal356r17.js          # 89 유물 · 55 길라잡이 두 화면만 — DSF2 ×3 · DSF3 · DSF4
 *   node tools/cal356r17.js --thr    # 문턱 민감도(THR 6~40)까지 — 경계 칸 «걸침» 을 본다
 *
 * ── 이 파일은 «자» 가 아니라 «몰이꾼» 이다 ────────────────────────────────
 * 재는 일은 전부 `tools/probe418.js` 의 `sweep()` 이 한다(측정 코드 0줄 — [S3] 주석의
 * «자를 두 벌로 적으면 한쪽만 늙는다»). 이 파일은 있는 자를 배율·문턱·반복 축으로 몰아
 * 16회차 등재값(−2.92% · −4.00%)이 재현되는지만 묻는다.
 *
 * ── 17회차 실측(2026-08-31, sess-1548-30579)이 이미 답을 냈다 ────────────
 * · `#rwCost>i>.cic`  : DSF2 +0.11%(8회 전부 66×76) · DSF3 +1.00% · DSF4 +0.11%
 *   — 16회차의 «DSF2·3 이 −2.92% 로 글자까지 같다 = 기하» 는 **이 컨테이너에서 재현되지 않는다.**
 *   64↔66 의 폭 2 device px = 검은 외곽선이 어두운 알약(#191614, 만점 diff ≈ 67) 위에 놓여
 *   경계 칸의 diff 가 문턱 12 근처인 자리다 — 래스터 환경(컨테이너)에 따라 칸이 들락거린다.
 * · `#mbox .mwell>p>.cic` : 오늘은 아예 문턱(0.01%) 아래 — 같은 성질의 반대쪽 표본.
 * ⇒ 둘 다 «제품 기하» 가 아니라 **환경 의존 래스터 노이즈**(237 fps 게이트와 같은 급)다.
 *   게이트 처방: KNOWN_SITES 에 `band: true`(들락거림 — 있으면 눈금이 물고, 없어도 [전제] 가
 *   안 빨개진다). DSF4 «진입 실패» 의 정체는 진입이 아니라 **캡처 타임아웃**(39MP > 30초)이었다
 *   — `sweep()` 이 배율 비례 타임아웃을 갖게 고쳤다(probe418.js).
 */
const { sweep } = require('./probe418');

const WANT_THR = process.argv.includes('--thr');
const HOSTS = ['89 유물', '55 길라잡이'];
const SPOTS = [/rwCost/, /mwell/];

const pick = (R) => SPOTS.map((re) => {
  const g = R.groups.find((z) => re.test(z.sel));
  return g ? `${g.dev > 0 ? '+' : ''}${g.dev}% (잉크 ${g.ink})` : '문턱 아래';
});

(async () => {
  console.log(`[cal356r17] ${HOSTS.join(' · ')} — 두 등재 자리의 수렴·재현`);
  console.log('  자리: #rwCost>i>.cic (16회차 −2.92%) · #mbox .mwell>p>.cic (16회차 −4.00%)');

  const runs = [['DSF2 #1', { dsf: 2 }], ['DSF2 #2', { dsf: 2 }], ['DSF2 #3', { dsf: 2 }],
    ['DSF3   ', { dsf: 3 }], ['DSF4   ', { dsf: 4 }]];
  for (const [lab, opt] of runs) {
    const R = await sweep(Object.assign({ only: HOSTS, tol: 0.0001 }, opt));
    const [a, b] = pick(R);
    console.log(`  ${lab} → rwCost ${a} · mwell ${b}` +
      (R.errs.length ? `  ⚠ 진입 실패 ${R.errs.length}: ${R.errs.join(' / ')}` : ''));
  }

  if (WANT_THR) {
    console.log('  ── 문턱 민감도(DSF2) — 경계 칸이 문턱 근처에 걸쳐 있으면 잉크가 칸 단위로 튄다');
    for (const thr of [6, 12, 18, 24, 30, 40]) {
      process.env.PROBE418_THR = String(thr);
      const R = await sweep({ dsf: 2, only: HOSTS, tol: 0.0001 });
      console.log(`  THR=${String(thr).padStart(2)} → rwCost ${pick(R)[0]}`);
    }
    delete process.env.PROBE418_THR;
  }

  console.log('  판독: 세 점이 전부 ±1% 안이고 −2.92%/−4.00% 가 안 나오면 = 등재값은 그 세션');
  console.log('  컨테이너의 래스터 몫(환경 의존)이다 — 제품 기하 아님, 처방은 게이트 band 등재.');
  process.exit(0);
})();
