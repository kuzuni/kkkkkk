#!/usr/bin/env node
/* 작업 948 — 안내문 «위:아래» 여백 비의 **과녁·대역이 정수 격자로 되돌아가지 못하게** 하는 게이트.
 *
 *   node tools/verify948.js
 *
 * ── 무엇을 지키나 ───────────────────────────────────────────────────────────
 * 905 가 세운 과녁 0.750 과 대역 [0.67, 0.83] 은 **둘 다 정수 격자 위에서** 세워졌다:
 * 과녁은 «ref 위 12 : 아래 9 ref px» 라는 정수 두 개의 비였고, 대역의 근거는 «±1 눈금» —
 * 곧 그 정수 격자의 한 칸이었다. 932 7회차가 `scan887` 을 **부분 화소**로 갈면서 그 격자가
 * 없어졌고, 두 수는 근거를 잃은 채 다섯 자에 사본으로 흩어져 있었다(등재문 948).
 *
 * 948 은 제품을 **0줄** 고치고 두 수를 다시 세운다:
 *   [1] 두 자가 두 답을 낸다 — ref 정수 0.750 ↔ 부분 화소 0.7338 (2.2% 차)
 *   [2] 정수 걸음은 우리 다섯 중 **넷을 한 칸에 몰아넣어** 1600 과의 4.8% 갈림을 지운다
 *   [3] 위상 스윕 — «참 여백 Δ0» 인 사본이 0.726~0.867 로 읽힌다(진폭 = 과녁의 19.2%)
 *   [4] 정수 걸음도 같은 스윕에서 15.1% 흔들린다 ⇒ «정수로 되돌아가면 안정하다» 는 거짓
 *   [5] 대역 = 과녁 ± 진폭/2 이고, 다섯 프레임이 전부 그 안이다(제품 0줄)
 *   [6] **절대 축(948 이 새로 세운다)** — 1600 은 비로는 가장 가깝지만 절대값으로는 가장 멀다
 *   [7] 다섯 부르는 자가 전부 `tools/target948.js` 를 읽는다(손으로 적은 사본 0건)
 *   [R] 되돌림 — 등재문 ⓑ 의 ±1% 대역을 먹이면 네 프레임이 빨개지고, 그 빨강은 [3] 의
 *       흔들림 **안**이라 «결함» 이 아니다(무르게 통과시킨 것이 아님을 이 항이 못박는다)
 *
 * ⚠ 자를 두 곳에 두지 않는다 — 측정은 전부 `tools/probe948.js --json` 이 한다.
 * ⚠ Pillow/numpy(python)가 없으면 [1]~[6]·[R] 은 «환경» 으로 건너뛴다(641·937 교훈). [7] 은 파일만 본다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const T = require('./target948');

const ROOT = path.resolve(__dirname, '..');
const CALLERS = ['verify813.js', 'verify887.js', 'verify905.js', 'verify920.js', 'probe920.js'];

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};
const pc = (v, ref) => ((v / ref - 1) * 100).toFixed(2) + '%';

/* ── [7] 사본 래칫 — 파일만 보므로 python 없이도 돈다 ──────────────────────
   905 의 사고는 «두 수를 다섯 곳에 손으로 적어 둔 것» 이었다. 다시 적히는 길을 막는다:
   부르는 자는 `target948` 을 require 해야 하고, 은퇴한 두 수를 **상수 선언으로** 다시
   적어서는 안 된다. 주석·기록에 옛 수를 남기는 것은 막지 않는다(333: 자리를 비우지 않는다). */
function copyRatchet() {
  const miss = [], hand = [];
  for (const f of CALLERS) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) { miss.push(f + '(없음)'); continue; }
    const t = fs.readFileSync(p, 'utf8');
    if (!/require\(['"]\.\/target948['"]\)/.test(t)) miss.push(f);
    /* 선언 꼴만 본다 — `const REF_RATIO = 0.750` · `const BAND = [0.67, 0.83]` */
    const lines = t.split('\n').filter(L => !/^\s*(\*|\/\*|\/\/)/.test(L));
    for (const L of lines) {
      if (/\b(const|let|var)\s+\w*(REF_RATIO|BAND)\w*\s*=/.test(L) &&
          /(0\.75|0\.67|0\.83|0\.90|1\.00)/.test(L)) hand.push(f + ': ' + L.trim().slice(0, 70));
    }
  }
  ok(miss.length === 0 && hand.length === 0,
    '[7] 다섯 부르는 자가 전부 `tools/target948.js` 를 읽는다 — 손으로 적은 과녁·대역 사본 0건',
    `require 안 하는 자 ${miss.length}${miss.length ? '(' + miss.join(' · ') + ')' : ''}` +
    ` · 손 상수 ${hand.length}${hand.length ? ' ← ' + hand.join(' | ') : ''}`);
}

(async () => {
  let P = null;
  try {
    /* 재현기는 node 가 돌리지만 그 안에서 `scan887.py` 를 부른다 — 환경 결손(코드 2·3)은
       `pydep937` 이 이미 «한 줄 + 코드» 로 옮겨 두었으므로 여기서는 그대로 «환경» 으로 읽는다. */
    const out = execFileSync(process.execPath, [path.join(__dirname, 'probe948.js'), '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
    P = JSON.parse(out.slice(out.indexOf('{')));
  } catch (e) {
    /* probe948 은 node 가 돌리지만 그 안에서 scan887.py 를 부른다 — 환경 결손은 그쪽이다 */
    console.error('VERIFY948 — [1]~[6]·[R] SKIP: 측정이 안 됐다: ' + String(e.message || e).split('\n')[0]);
    console.error('  준비: npm i --no-save playwright pngjs   그리고   pip3 install pillow numpy');
    copyRatchet();
    console.log(`\nVERIFY948 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS (일부 SKIP — 환경)'}`);
    process.exit(fail ? 1 : 3);
  }

  const R = P.ref, rows = P.rows;
  const f1600 = rows.find(r => r.H === 1600);
  const longs = rows.filter(r => r.H !== 1600);

  /* ── [1] 같은 그림, 두 자, 두 답 ── */
  {
    const gap = Math.abs(R.int.r - R.sub.r) / R.sub.r * 100;
    ok(Math.abs(R.sub.r - T.REF_RATIO) < 0.002 && Math.abs(R.int.r - T.INT_RATIO) < 0.002 && gap > 1.5,
      '[1] 레퍼런스 확정값 = **0.7338**(부분 화소) · 같은 그림의 정수 걸음은 0.750 — 두 자가 2.2% 갈린다',
      `부분 화소 ${R.sub.r.toFixed(4)}(위 ${R.sub.up.toFixed(2)} : 아래 ${R.sub.dn.toFixed(2)} 프레임px) ↔ ` +
      `정수 ${R.int.r.toFixed(4)}(위 ${R.int.up.toFixed(2)} : 아래 ${R.int.dn.toFixed(2)}) · 차 ${gap.toFixed(2)}%`);
  }

  /* ── [2] ⚑ 정수 걸음이 지우는 것 — 넷이 «일치» 하는 게 아니라 **같은 칸에 몰린** 것이다 ── */
  {
    const intSame = new Set(longs.map(r => r.intR)).size === 1 && Math.abs(longs[0].intR - T.INT_RATIO) < 0.002;
    const subSplit = Math.abs(longs[0].subR - f1600.subR) / f1600.subR * 100;
    ok(intSame && subSplit > 3,
      '[2] ⚑ 정수 걸음은 긴 네 프레임을 **한 칸(0.750)에 몰아넣어** 1600 과의 실재하는 갈림을 지운다',
      `정수 — 1600:${f1600.intR.toFixed(3)} · 넷 전부 ${longs[0].intR.toFixed(3)} | ` +
      `부분 화소 — 1600:${f1600.subR.toFixed(4)} ↔ 넷 ${longs[0].subR.toFixed(4)} = 갈림 ${subSplit.toFixed(2)}%`);
  }

  /* ── [3] ⚑⚑ 대역의 근거 — 자 자신의 재현성을 «참 여백 Δ0» 사본으로 잰다 ── */
  {
    const amp = P.phAmp, rel = amp / T.REF_RATIO * 100;
    const zero = P.phase.find(p => p.d === 0);
    const base = rows.find(r => r.H === 2280).subR;
    ok(Math.abs(amp - T.PHASE_AMP) < 0.02 && rel > 10 && Math.abs(zero.r - base) < 1e-6,
      '[3] ⚑⚑ 위상 스윕 — 참 여백 Δ0 인 사본이 0.726~0.867 로 읽힌다(진폭 = 과녁의 19.2%)',
      `진폭 ${amp.toFixed(4)}(심긴 값 ${T.PHASE_AMP}) = 과녁의 ${rel.toFixed(2)}% · ` +
      `δ=0 대조군 ${zero.r.toFixed(4)} = 손 안 댄 판 ${base.toFixed(4)} · ` +
      '흔드는 자리 = 테두리 조립체 최상단(B3) — δ 를 뺀 값이 ' +
      (Math.max(...P.phase.map(p => p.dark)) - Math.min(...P.phase.map(p => p.dark))).toFixed(2) + 'px 이동');
  }

  /* ── [4] 정수로 되돌아가도 안 안정하다 — ⓒ 기각 ── */
  {
    const ai = P.phase.map(p => p.intR);
    const ampI = Math.max(...ai) - Math.min(...ai);
    ok(Math.abs(ampI - T.PHASE_AMP_INT) < 0.02 && ampI / T.INT_RATIO * 100 > 10,
      '[4] **정수 걸음도 같은 스윕에서 15.1% 흔들린다** — «정수로 되돌아가면 안정하다»(등재문 ⓒ)는 거짓',
      `정수 비 진폭 ${ampI.toFixed(4)} = 과녁 0.750 의 ${(ampI / T.INT_RATIO * 100).toFixed(2)}% ` +
      `(부분 화소는 ${(P.phAmp / T.REF_RATIO * 100).toFixed(2)}%) — 정수는 흔들림을 없애는 게 아니라 **분수를 버릴 뿐**이다`);
  }

  /* ── [5] 대역은 파생값이고 다섯이 그 안이다(제품 0줄) ── */
  {
    const lo = +(T.REF_RATIO * (1 - T.PHASE_AMP / T.REF_RATIO / 2)).toFixed(3);
    const hi = +(T.REF_RATIO * (1 + T.PHASE_AMP / T.REF_RATIO / 2)).toFixed(3);
    const inside = rows.every(r => r.subR >= T.BAND[0] && r.subR <= T.BAND[1]);
    ok(lo === T.BAND[0] && hi === T.BAND[1] && inside,
      `[5] 대역 = 과녁 ± 진폭/2 = [${T.BAND[0]}, ${T.BAND[1]}] — 손 상수가 아니라 파생값 · 다섯 프레임 전부 그 안(제품 0줄)`,
      rows.map(r => `${r.H}:${r.subR.toFixed(4)}(${pc(r.subR, T.REF_RATIO)})`).join(' · '));
  }

  /* ── [6] ⚑ 948 이 새로 세우는 축 — 비는 척도 불변이라 «둘 다 줄어든 것» 을 못 본다 ── */
  {
    const up1 = f1600.subUp / R.sub.up - 1, dn1 = f1600.subDn / R.sub.dn - 1;
    const upL = longs[0].subUp / R.sub.up - 1, dnL = longs[0].subDn / R.sub.dn - 1;
    /* 1600 은 비로는 가장 가깝고(|Δ| 최소) 절대값으로는 가장 멀다(|Δ| 최대) */
    const ratioCloser = Math.abs(f1600.subR - T.REF_RATIO) < Math.abs(longs[0].subR - T.REF_RATIO);
    const absFarther = Math.abs(up1) > Math.abs(upL) && Math.abs(dn1) > Math.abs(dnL);
    ok(ratioCloser && absFarther,
      '[6] ⚑ **1600 은 비로만 가깝다** — 절대값으로는 다섯 중 가장 멀다(등재문의 «넷이 1600 을 따라가라» 는 기각)',
      `1600 — 비 ${pc(f1600.subR, T.REF_RATIO)} 인데 위 ${(up1 * 100).toFixed(1)}% · 아래 ${(dn1 * 100).toFixed(1)}% | ` +
      `긴 넷 — 비 ${pc(longs[0].subR, T.REF_RATIO)} · 위 ${(upL * 100).toFixed(1)}% · 아래 ${(dnL * 100).toFixed(1)}% · ` +
      `1600 은 813 이 g3 를 ${(longs[0].g3 - f1600.g3).toFixed(2)}px 압축한 만큼 위·아래가 같이 3.0px 줄어 비가 «우연히» 가까워진 것이다`);
  }

  copyRatchet();

  /* ── [R] 되돌림 시험 — 등재문 ⓑ 의 ±1% 대역을 실제로 먹인다 ── */
  {
    const B = [0.728, 0.742];                     /* 등재문 ⓑ — 레퍼런스 문턱 스윕 폭 */
    const red = rows.filter(r => r.subR < B[0] || r.subR > B[1]);
    /* 그 빨강이 «결함» 이 아니라 «자의 흔들림» 안임을 같은 수로 보인다 */
    const worst = Math.max(...red.map(r => Math.abs(r.subR - T.REF_RATIO) / T.REF_RATIO * 100), 0);
    ok(red.length === 4 && worst < P.phAmp / T.REF_RATIO * 100,
      '[R] 되돌림 — 등재문 ⓑ 의 대역 0.728~0.742 를 먹이면 **네 프레임이 빨개지고**, 그 어긋남은 [3] 의 흔들림 안이다',
      `밖 ${red.length}/5 (${red.map(r => r.H).join('·')}) · 최대 어긋남 ${worst.toFixed(2)}% ` +
      `< 자의 진폭 ${(P.phAmp / T.REF_RATIO * 100).toFixed(2)}% ⇒ 그 대역은 결함이 아니라 자의 흔들림을 잡는다`);
  }

  console.log(`\nVERIFY948 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
