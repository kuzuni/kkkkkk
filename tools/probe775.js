#!/usr/bin/env node
/* 775 재현 — `probe504` [C2] 의 «⏸접촉을 뺀 표본 **전 종**이 ×1.15 위» 가 왜 동전이었나
 *
 *   node tools/probe775.js            (기본 K=3 · 한 번에 ~3분 — probe504 를 K회 자식으로 돌린다)
 *   K=5 node tools/probe775.js
 *
 * ⚑ **자를 새로 만들지 않았다.** 이 자는 `tools/probe504.js` 를 **그대로 K회 실행**해서 그 출력을
 *    읽는다 — 680·766 의 «자가 둘이 되면 한쪽만 늙는다» 를 피하려면 측정 하네스는 하나여야 한다.
 *    그래서 여기 있는 것은 측정이 아니라 **판정의 모양에 대한 물음**뿐이다.
 *
 * 물음(766-③ «분산이 아니라 **가장자리까지의 여유**를 찍어라»):
 *   [1] 옛 문턱 1.15 까지의 여유가 **회차 사이 흔들림 폭 안**에 있다 = 그 항은 자가 아니라 동전이다.
 *   [2] 그 꼴찌는 «그날 잡음이 때린 종» 이 아니라 **매 실행 같은 종**이다(= 재현되는 성질이다).
 *   [3] 그 종이 꼴찌인 이유는 **도달 몫(rx)** 이다 — `probe504` [C2b] 가 K회 전부 «rx 꼴찌 = 값 배수
 *       꼴찌» 를 찍는다. 잡음이면 둘의 꼴찌가 실행마다 따로 놀아야 한다.
 *   [4] 반복 수로는 못 고친다 — 여유가 √REPS 로만 좁아지므로 REPS 를 4배로 올려도 1σ 언저리다
 *       (721 «문턱이 잡음 폭 안에 있으면 그 항은 동전»). ⇒ 처방은 표본이 아니라 판정의 모양.
 *   [5] 새 [C2] 의 여유는 옛 여유의 몇 배인가 — **오히려 바를 올리고도** 여유가 커야 수리다.
 *   [6] 되돌림 — `probe504` [C2r](하네스를 끈 짝)이 K회 전부 새 바 아래에 앉는다.
 *   [0] **사본 0개** — 문턱 셋(옛 1.15 · 새 중앙값 1.5 · 평균 1.3)을 `probe504.js` 에서 정규식으로
 *       읽는다. 누가 그 수를 옮기면 이 자가 따라온다(766 [0] 선례).
 *
 * 출력은 전부 수치다. 처방·수정은 하지 않는다.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const P504 = path.resolve(__dirname, 'probe504.js');
const K = Math.max(2, parseInt(process.env.K || '3', 10));
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const med = a => { const s = a.slice().sort((p, q) => p - q); const h = s.length >> 1;
                   return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

/* ── [0] 문턱은 `probe504.js` 에서 읽는다(사본 0개) ─────────────────────────── */
const SRC = fs.readFileSync(P504, 'utf8');
const OLD_THR = (SRC.match(/옛 항은 `judged\.every\(infl > ([\d.]+)\)`/) || [])[1];
const NEW_MED = (SRC.match(/inflMed >= ([\d.]+) && inflAvg >= ([\d.]+)/) || [])[1];
const NEW_AVG = (SRC.match(/inflMed >= ([\d.]+) && inflAvg >= ([\d.]+)/) || [])[2];
ok(!!OLD_THR && !!NEW_MED && !!NEW_AVG,
   '0 문턱 셋을 `probe504.js` 에서 읽었다(이 자에 사본 0개 — 680·766)',
   '옛 전칭 ' + OLD_THR + ' · 새 중앙값 ' + NEW_MED + ' · 새 평균 ' + NEW_AVG);
if (!OLD_THR || !NEW_MED || !NEW_AVG) { console.log('\nFAIL ' + pass + '/' + (pass + fail)); process.exit(1); }
const thrOld = +OLD_THR, thrMed = +NEW_MED, thrAvg = +NEW_AVG;

/* ── probe504 를 K회 돌려 [C2]·[C2b]·[C2r] 세 줄만 떠 온다 ─────────────────── */
const runs = [];
for (let k = 0; k < K; k++) {
  let out = '';
  try {
    out = execFileSync(process.execPath, [P504], { encoding: 'utf8', maxBuffer: 1 << 26,
                                                  stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { out = String((e.stdout || '') + (e.stderr || '')); }
  const c2 = (out.match(/^(?:PASS|FAIL) C2 .*$/m) || [''])[0];
  const c2b = (out.match(/^ +\[C2b\] .*$/m) || [''])[0];
  const c2r = (out.match(/^(?:PASS|FAIL) C2r .*$/m) || [''])[0];
  /* «lance ×2.08 · gale ×1.63 …» 에서 종별 값 배수 */
  const infl = {};
  for (const m of c2.matchAll(/([a-z]+) ×([\d.]+)/g)) if (m[1] !== '평균' && m[1] !== '중앙값') infl[m[1]] = +m[2];
  delete infl.aura;                     /* ⏸접촉(695) 은 판정 밖 — 표에만 찍힌다 */
  const rx = {};
  for (const m of c2b.matchAll(/([a-z]+) ([\d.]+)/g)) rx[m[1]] = +m[2];
  const nul = +(((c2r.match(/무하네스 중앙값 ×([\d.]+)/) || [])[1]) || NaN);
  const ids = Object.keys(infl);
  if (!ids.length) { console.error('probe504 출력에서 [C2] 를 못 읽었다 — 자가 바뀌었나?'); process.exit(2); }
  const lo2 = o => Object.keys(o).sort((a, b) => o[a] - o[b]).slice(0, 2).sort().join(',');
  runs.push({ infl, rx, nul, ids,
              lo: lo2(infl),                       /* 값 배수 아래 둘(집합) — 775 1회차: 한 종만 물으면 또 동전이다 */
              rxLo: Object.keys(rx).length ? lo2(rx) : '',
              med: med(ids.map(i => infl[i])) });
  console.log('  run' + (k + 1) + '  ' + ids.map(i => i + ' ×' + infl[i].toFixed(2)).join(' · ')
    + '  | 중앙값 ×' + runs[k].med.toFixed(2) + ' · 값 아래 둘 ' + runs[k].lo
    + ' · rx 아래 둘 ' + runs[k].rxLo + ' · 무하네스 ×' + (isFinite(nul) ? nul.toFixed(2) : '?'));
}

/* ── [1] 옛 문턱까지의 여유가 회차 흔들림 폭 안이다 ──────────────────────────
   ⚠ «그 종» 을 이름으로 박지 않는다 — 실행마다 **그 실행의 최솟값**을 본다. 옛 항이 전칭이라
      빨강을 정하는 것도 그 실행의 최솟값 하나다(759-③ «자물쇠는 이름이 아니어야 한다»). */
const loVals = runs.map(r => Math.min(...r.ids.map(i => r.infl[i]))).filter(isFinite);
const loId = runs.map(r => r.ids.reduce((a, b) => (r.infl[b] < r.infl[a] ? b : a))).join(',');
const band = Math.max(...loVals) - Math.min(...loVals);
const slackOld = Math.min(...loVals) - thrOld;
ok(slackOld <= band,
   '1 옛 전칭(`every(infl > ' + thrOld + '`)까지의 여유가 회차 흔들림 폭 **안**이다 — 그 항은 자가 아니라 동전이다(721)',
   '실행별 최솟값 ' + loVals.map(v => v.toFixed(2)).join(' · ') + '(' + loId + ') · 여유 '
   + slackOld.toFixed(2) + ' ≤ 폭 ' + band.toFixed(2));

/* ── [2] 아래쪽에 서는 «짝» 은 매 실행 같다 — 흔들리는 것은 그 둘의 순서뿐이다 ──
   ⚑ 775 1회차가 여기서 기각당했다: 처음에 «꼴찌 한 종» 을 물었더니 `nova` ↔ `gale` 로
      갈려 **물음 자신이 플레이키**했다(766-④ 와 같은 함정). 재현되는 사실은 «짝» 이다. */
ok(runs.every(r => r.lo === runs[0].lo),
   '2 값 배수의 **아래 둘**은 매 실행 같은 짝이다(그 둘의 순서만 갈린다) — 잡음이 아니라 재현되는 성질이다',
   K + '회 전부 {' + runs[0].lo + '} (관측 ' + runs.map(r => '{' + r.lo + '}').join(' ') + ')');

/* ── [3] 그 짝을 정하는 것은 도달 몫(rx)이다 ───────────────────────────────── */
ok(runs.every(r => r.rxLo && r.rxLo === r.lo),
   '3 그 짝을 정하는 것은 **도달 몫 rx** 다(포화) — K회 전부 «rx 아래 둘 = 값 배수 아래 둘»',
   runs.map((r, i) => 'run' + (i + 1) + ' {' + r.rxLo + '}/{' + r.lo + '}').join(' · '));

/* ── [4] 반복 수로는 못 고친다 ─────────────────────────────────────────────── */
const sd = (() => { const m = loVals.reduce((a, b) => a + b, 0) / loVals.length;
                    return Math.sqrt(loVals.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, loVals.length - 1)); })();
const REPS = +((SRC.match(/C_REPS\s*=\s*(\d+)/) || [])[1] || 3);
const sd4 = sd / 2;                    /* 반복 수 ×4 ⇒ 평균의 표준편차는 √4 = 2 로만 좁아진다 */
ok(sd4 > 0 && slackOld / sd4 < 2,
   '4 반복 수로는 못 고친다 — `C_REPS` 를 ' + REPS + ' → ' + (REPS * 4) + ' 로 올려도 옛 문턱까지가 2σ 안이다',
   '회차 σ ' + sd.toFixed(3) + ' → ×4 반복 σ ' + sd4.toFixed(3) + ' · 여유/σ '
   + (sd4 ? (slackOld / sd4).toFixed(2) : '∞') + ' < 2');

/* ── [5] 새 판정의 여유가 옛 여유보다 크다(바는 올렸는데 여유는 커졌다) ────── */
const medVals = runs.map(r => r.med);
const slackNew = Math.min(...medVals) - thrMed;
ok(thrMed > thrOld && slackNew > slackOld,
   '5 새 [C2] 는 **바를 올리고도**(전칭 ' + thrOld + ' → 중앙값 ' + thrMed + ') 여유가 더 크다 — 무르게 푼 수리가 아니다',
   '중앙값 ' + medVals.map(v => v.toFixed(2)).join(' · ') + ' · 새 여유 ' + slackNew.toFixed(2)
   + ' > 옛 여유 ' + slackOld.toFixed(2) + ' (×' + (slackOld > 0 ? (slackNew / slackOld).toFixed(1) : '∞') + ')');

/* ── [6] 되돌림 — 하네스를 끄면 새 바를 못 넘는다 ─────────────────────────── */
const nuls = runs.map(r => r.nul).filter(isFinite);
ok(nuls.length === K && nuls.every(v => v < thrMed),
   '6 되돌림 — `probe504` [C2r](하네스를 끈 실제↔실제 짝)이 K회 전부 새 바 ' + thrMed + ' 아래다 ⇒ [C2] 는 통째로 사라져도 초록인 항이 아니다(759-②)',
   nuls.map(v => '×' + v.toFixed(2)).join(' · ') + ' < ' + thrMed);

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
