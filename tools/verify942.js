/* 게이트 942 — «번짐 비대칭»(②ⓑ) 을 갈아 끼운 자리를 지킨다 · 1회차 = `tools/probe409g.py`
 *
 *   node tools/verify942.js
 *
 * 무엇을 지키는가 —
 *   932 가 «정수로 세는 자» 전수를 닫으며 갈래를 둘로 갈랐다. R(축척 비대칭)은 932 가 잡고,
 *   **B(번짐 비대칭 · 1:1 이라 작다 · 11자)** 를 이 번호로 넘겼다. 1:1 인데도 ref 만 다르게 읽히는
 *   까닭은 ref 가 **JPEG 사진**이라 층 경계가 2~3px 번지고 우리 캡처는 칼같기 때문이다.
 *
 *   1회차가 고른 자는 `probe409g.py --diag` 다 — **부르는 노드 게이트가 하나도 없어**(주석에서만
 *   이름이 오르내린다) 남의 못박힌 수를 안 흔들고, 파일 자신이 «--edge·--apex 는 문턱 교차 보간인데
 *   --diag 만 최근접 런» 이라 **같은 파일 안에서 자가 갈려** 있었다.
 *
 *   ⚑⚑ **재현이 등재문보다 한 겹 아래를 찍었다** — 결함은 «값이 0.5 격자에 굳는다» 가 아니라
 *      **«번진 판에서 없는 층이 생긴다»** 였다. 두 층 사이 경사면이 **그 사이에 있는 세 번째
 *      팔레트 색**(K↔D 의 S · D↔B 의 F)으로 «이겨» 버린다(승자독식). 합성 재현:
 *      참값 `S3 K7 D4 B7` 이 번진 판에서 옛 자로 `S3.00 K6.50 S1.50 D2.00 F1.50 B6.50` — 층이 4 → 6 이고
 *      **K 는 −0.5 · D 는 −2.0** 이다. 0.5 격자는 그 결함의 **겉모습**이었다.
 *
 * 절 —
 *   [1] 물리   — 같은 참값 층더미를 «칼같은 판 ↔ 번진 판» 으로 그려 두 자로 잰다(그림·브라우저 0).
 *   [2] 덫     — **진짜로 얇은 층이 안 먹히는가**(접기가 무르지 않다는 증거).
 *   [3] 지문   — ref 실측에서 옛 자는 0.5 의 배수로 굳고 새 자는 그 격자에서 풀린다.
 *   [4] 보존   — 층 두께의 **합**이 두 모드에서 같다(창·걸음·문턱을 한 칸도 안 건드렸다).
 *   [5] 불변   — 문턱·분류·시작점이 소스에서 그대로다 + 옛 자가 `--int` 로 살아 있다.
 *   [6] 장부   — 932 전수에서 이 자가 **B → 면역**으로 옮겨졌고 주홍 래칫이 11 → 10 이다.
 *   [R] 되돌림 — 옛 자로 되돌리면 [1] 이 즉시 빨개진다(그 문턱을 옛 자가 못 넘는다).
 *
 * ⚠ 캡처(`docs/review/96-*.png`)가 없어도 돈다 — [3] 은 ref 절만 읽는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { py } = require('./pydep937');
const P = require('./probe932');

const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..');
let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

const run = (extra) => String(py(['tools/probe409g.py', ...extra],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

/* «int cap  S3.00 K7.00 …» 한 줄을 [[클래스, 폭], …] 로 */
const layers = (out, mode, who) => {
  const line = out.split('\n').find((l) => new RegExp(`^\\s*${mode}\\s+${who}\\s`).test(l));
  if (!line) return null;
  return (line.trim().split(/\s+/).slice(2))
    .map((tok) => [tok[0], parseFloat(tok.slice(1))]);
};
const sum = (ls) => ls.reduce((a, b) => a + b[1], 0);
const maxDelta = (a, b) => (a.length !== b.length ? null
  : Math.max(...a.map((v, i) => Math.abs(v[1] - b[i][1]))));

let phys, thin;
try {
  phys = run(['--physics']);
  thin = run(['--physics-thin']);
} catch (e) {
  if (e && (e.status === 2 || e.status === 3)) {
    console.log('  SKIP 전 절 — 파이썬 의존 없음 · pip3 install pillow numpy');
    process.exit(0);
  }
  throw e;
}

/* ── [1] 물리 ─────────────────────────────────────────────────────────── */
console.log('\n[1] 물리 — 같은 참값 층더미를 «칼같은 판(cap)» 과 «번진 판(ref)» 으로 (참값 S3 K7 D4 B7)');
{
  const iC = layers(phys, 'int', 'cap'), iR = layers(phys, 'int', 'ref');
  const cC = layers(phys, 'cov', 'cap'), cR = layers(phys, 'cov', 'ref');
  ok('[1-a] 두 자 모두 **칼같은 판에서는 참값 그대로** 읽는다 — 결함은 자의 편향이 아니라 «번짐» 이다',
    iC.length === 4 && cC.length === 4
    && iC.every(([c, v], i) => c === 'SKDB'[i] && Math.abs(v - [3, 7, 4, 7][i]) < 1e-9)
    && cC.every(([c, v], i) => c === 'SKDB'[i] && Math.abs(v - [3, 7, 4, 7][i]) < 1e-9),
    `int ${iC.map((l) => l.join('')).join(' ')} · cov ${cC.map((l) => l.join('')).join(' ')}`);

  /* ⚑ 결함의 본체 — 번진 판에서 «없는 층» 이 생긴다. */
  ok('[1-b] ⚑ **옛 자는 번진 판에서 없는 층을 만든다**(4 → 6) — 경사면이 사이 색으로 이긴다',
    iR.length > iC.length, `${iC.length} → ${iR.length} · ${iR.map((l) => l.join('')).join(' ')}`);
  ok('[1-c] 옛 자는 그 자리에서 층 두께를 **1px 넘게** 잃는다(K −0.5 · D −2.0)',
    Math.abs((iR.find((l) => l[0] === 'D') || [0, 4])[1] - 4) >= 1.0,
    iR.filter((l) => 'KD'.includes(l[0])).map((l) => l.join('')).join(' '));

  ok('[1-d] ⚑ **새 자는 번진 판에서도 참값의 차례를 되찾는다**(층 4개 · 같은 글자)',
    cR.length === 4 && cR.every(([c], i) => c === 'SKDB'[i]),
    cR.map((l) => l[0] + l[1].toFixed(2)).join(' '));
  const d = maxDelta(cR, cC);
  ok('[1-e] ⚑⚑ 두 판 사이 최대 |Δ| ≤ 0.30 px — **번짐 비대칭이 사라졌다**',
    d !== null && d <= 0.30, `${d === null ? '층 개수 불일치' : d.toFixed(2) + ' px'}`);
  const dInt = maxDelta(iR, iC);
  ok('[1-f] 같은 자리에서 **옛 자는 그 문턱을 못 넘는다**(층 개수부터 다르다) — 결함의 크기',
    dInt === null || dInt > 0.30, dInt === null ? '층 개수 불일치(6 ↔ 4)' : `${dInt.toFixed(2)} px`);
}

/* ── [2] 덫 — 접기가 무르면 진짜 층이 사라진다 ────────────────────────── */
console.log('\n[2] 덫 — 참값 K7 **D2** B7 (D 는 K·B 의 «사이 색» = 접기의 덫)');
{
  const cR = layers(thin, 'cov', 'ref'), iR = layers(thin, 'int', 'ref');
  const dNew = cR.filter((l) => l[0] === 'D');
  ok('[2-a] ⚑ **진짜 얇은 층 D 가 안 먹힌다** — «t 가 훑는가» 조건이 경사면과 층을 가른다',
    dNew.length >= 1 && dNew[0][1] >= 1.4, cR.map((l) => l[0] + l[1].toFixed(2)).join(' '));
  ok('[2-b] 그 D 는 참값 2.0 에서 ±0.6 px 안이다 (접기가 층을 «깎지» 도 않았다)',
    dNew.length >= 1 && Math.abs(dNew[0][1] - 2.0) <= 0.6, dNew.map((l) => l[1].toFixed(2)).join(' '));
  const dOld = iR.filter((l) => l[0] === 'D').map((l) => l[1]);
  ok('[2-c] 같은 자리에서 **옛 자는 D 를 0.5 로 잘라 먹었다**(−75%) — 이 항이 결함의 크기다',
    dOld.length > 0 && Math.min(...dOld) <= 1.0, iR.map((l) => l.join('')).join(' '));
  /* ⚠ 남은 한 자리는 «못 고친 것» 이 아니라 분해 한계다 — 표본 2개(1.0px)짜리 경사면은
     t 훑음이 문턱 아래라 안 접힌다. 더 무르게 하면 **진짜 1px 층**과 못 가른다. 그 판정을 항으로 세운다. */
  ok('[2-d] ⚑ 남은 1px 경사면 하나는 **일부러 안 접었다** — 더 무르게 하면 진짜 1px 층과 못 가른다(σ 1.1px 에서는 같은 그림)',
    cR.length >= 4, `${cR.length}층 · ${cR.map((l) => l[0]).join('')}`);
}

/* ── [3] 지문 — ref 실측 ──────────────────────────────────────────────── */
console.log('\n[3] 지문 — ref(`docs/ref/07-스킬-팝업.jpg`) 실측 · 옛 자는 0.5 격자에 굳는다');
{
  const oldOut = run(['--diag', '--int']);
  const newOut = run(['--diag']);
  const vals = (out) => (out.match(/\b[KBFDRS][0-9]+\.[0-9]+/g) || [])
    .filter((t) => /^[KBFDRS]/.test(t)).map((t) => parseFloat(t.slice(1)));
  const oldV = vals(oldOut), newV = vals(newOut);
  const onGrid = (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
  ok('[3-a] 자가 ref 네 코너를 다 읽는다', oldV.length >= 18 && newV.length >= 18,
    `${oldV.length} ↔ ${newV.length} 층`);
  ok('[3-b] ⚑ **옛 자의 값은 예외 없이 0.5 의 배수다** — 걸음이 값을 격자에 가둔 지문',
    oldV.length > 0 && oldV.every(onGrid), `${oldV.length}개 전부`);
  ok('[3-c] 새 자는 그 격자에서 풀린다 (절반 넘게 비배수)',
    newV.filter((v) => !onGrid(v)).length >= newV.length / 2,
    `${newV.filter((v) => !onGrid(v)).length}/${newV.length}`);
  ok('[3-d] ⚑ 새 자가 ref 왼아래 코너에서 «전부 7» 규약을 되찾는다 (K·D·B 가 7·4·7 부근)',
    /ref\s+S[0-9.]+ K[67]\.[0-9]+ D[34]\.[0-9]+ B[67]\.[0-9]+/.test(newOut),
    (newOut.split('\n').find((l) => /^\s+ref\s+S/.test(l)) || '').trim());
}

/* ── [4] 보존 — 창·걸음·문턱을 한 칸도 안 건드렸다 ───────────────────── */
console.log('\n[4] 보존 — 층 두께의 **합**이 두 모드에서 같다 (질량 보존)');
{
  const both = (out) => out.split('\n').filter((l) => /^\s+(ref|cap)\s+[KBFDRS]/.test(l))
    .map((l) => l.trim().split(/\s+/).slice(1)
      .reduce((a, t) => a + parseFloat(t.slice(1)), 0));
  const so = both(run(['--diag', '--int'])), sn = both(run(['--diag']));
  ok('[4-a] 판·코너마다 합이 같다 (|Δ| ≤ 0.01 px) — 새 자는 «더 재지» 도 «덜 재지» 도 않는다',
    so.length > 0 && so.length === sn.length && so.every((v, i) => Math.abs(v - sn[i]) <= 0.01),
    so.map((v, i) => (sn[i] - v).toFixed(3)).join(' '));
  ok('[4-b] 그 합이 창(꼭짓점 → 안쪽 22px)과 같다 — 창이 안 움직였다',
    so.every((v) => Math.abs(v - 22.5) < 1e-6), `${so[0]} px`);
}

/* ── [5] 불변 — 문턱·분류·시작점 ─────────────────────────────────────── */
console.log('\n[5] 불변 — 옛 자를 «무르게 푼» 것이 아니다');
{
  const src = fs.readFileSync(path.join(TOOLS, 'probe409g.py'), 'utf8');
  ok('[5-a] 문턱이 그대로다 (`EDGE_T = 45`)', /EDGE_T\s*=\s*45\b/.test(src));
  ok('[5-b] 분류가 그대로다 (`cls()` = 최근접 팔레트 · PAL 6색)',
    /def cls\(c\)/.test(src) && (src.match(/\('[KBFDRS]', \(/g) || []).length === 6);
  ok('[5-c] 시작점이 그대로다 (`apex()` 문턱 교차 보간 · 걸음 0.5)',
    /d = apex\(px, bx, by, corner, span\)/.test(src) && /step = 0\.5/.test(src));
  ok('[5-d] ⚑ **옛 자가 살아 있다**(`--int`) — 지문을 매 실행 다시 찍을 수 있다(§3·§R 의 근거)',
    /mode = 'int' if '--int' in a else 'cov'/.test(src) && /if mode == 'int':/.test(src));
  ok('[5-e] 접기 문턱 셋이 이름으로 적혀 있다 (PH_W · PH_D · **PH_T**)',
    /PH_W\s*=/.test(src) && /PH_D\s*=/.test(src) && /PH_T\s*=/.test(src));
}

/* ── [6] 장부 — 932 전수와 맞물린다 ──────────────────────────────────── */
console.log('\n[6] 장부 — 932 전수에서 이 자가 B → 면역으로 옮겨졌다');
{
  const rows = P.census();
  const row = rows.find((r) => r.file === 'probe409g.py');
  ok('[6-a] 장부에 있고 판정이 **면역(S)** 이다', row && row.verdict === 'S', row ? row.verdict : '없음');
  const brk = rows.filter((r) => r.verdict === 'B').map((r) => r.file);
  ok('[6-b] 주홍(B)이 **7개**로 줄었다 — 942 가 남긴 자리(1회차 `probe409g` · 2회차 `probe409c` · 3회차 `probe409i` · 4회차 `probe409f`)',
    brk.length === 7 && !['probe409g.py', 'probe409c.py', 'probe409i.py', 'probe409f.py']
      .some((f) => brk.includes(f)), `${brk.length}개`);
  const v932 = fs.readFileSync(path.join(TOOLS, 'verify932.js'), 'utf8');
  ok('[6-c] 932 게이트의 래칫도 같이 옮겨졌다 (`FIXED942` 가 **네 이름**을 들고 있다)',
    /const FIXED942 = \['probe409g\.py', 'probe409c\.py', 'probe409i\.py', 'probe409f\.py'\]/.test(v932)
    && /\[2-h\]/.test(v932));
}

/* ── [7] 2회차 — `probe409c.py` (열별 «검정 화소 수» → K 층 두께의 합) ─────── */
console.log('\n[7] 2회차 — `probe409c.py` 열별 «검정» 이 격자에서 풀렸는가 (판정값 0~7px · ±1px = ±14%)');
{
  const runC = (extra) => String(py(['tools/probe409c.py', ...extra],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  /* «K7.0   int   7.00   6.00   -1.00  (-14.3%)  20.00» 한 줄 */
  const ph = runC(['--physics']);
  const row = (kw, mode) => {
    const m = ph.split('\n').find((l) => new RegExp(`^\\s*K${kw}\\s+${mode}\\s`).test(l));
    if (!m) return null;
    const n = m.trim().split(/\s+/);
    return { cap: parseFloat(n[2]), ref: parseFloat(n[3]), d: parseFloat(n[4]), sum: parseFloat(n[6]) };
  };
  const i7 = row('7\\.0', 'int'), c7 = row('7\\.0', 'cov');
  const i2 = row('2\\.0', 'int'), c2 = row('2\\.0', 'cov');

  ok('[7-a] 두 자 모두 **칼같은 판에서는 참값 그대로** — 결함은 자의 편향이 아니라 «번짐» 이다',
    i7 && c7 && Math.abs(i7.cap - 7) < 1e-9 && Math.abs(c7.cap - 7) < 1e-9,
    i7 ? `int ${i7.cap} · cov ${c7.cap}` : '못 읽음');
  ok('[7-b] ⚑ **옛 자는 번진 판만 정확히 1.00px 를 잃는다**(K7 = −14.3%) — 1:1 인데도 ref 가 얇다',
    i7 && Math.abs(i7.d + 1.0) < 1e-9, i7 ? `${i7.cap} → ${i7.ref}` : '못 읽음');
  ok('[7-c] ⚑⚑ 새 자는 두 판 사이 |Δ| ≤ 0.30 px — 번짐 비대칭이 사라졌다',
    c7 && Math.abs(c7.d) <= 0.30, c7 ? `${c7.d.toFixed(2)} px` : '못 읽음');
  /* ⚠ 덫 — 참값이 얇을수록 옛 자의 비가 커진다. 접기가 무르면 여기서 층이 통째로 사라진다. */
  ok('[7-d] ⚑ 덫 — 참값 K2.0 에서 옛 자는 **−50%**(1.00px 만 남는다)',
    i2 && Math.abs(i2.d + 1.0) < 1e-9 && i2.ref <= 1.0, i2 ? `${i2.cap} → ${i2.ref}` : '못 읽음');
  ok('[7-e] 같은 자리에서 새 자는 **진짜 얇은 층을 안 먹는다** (|Δ| ≤ 0.30 · 참값의 ±20% 안)',
    c2 && Math.abs(c2.d) <= 0.30 && Math.abs(c2.ref - 2.0) <= 0.4,
    c2 ? `${c2.ref.toFixed(2)} (참값 2.00)` : '못 읽음');
  ok('[7-f] 보존 — 층 두께의 **합**이 창(기둥 전체)과 같다 — 새 자는 «더 재지» 도 «덜 재지» 도 않는다',
    c7 && i7 && Math.abs(c7.sum - i7.sum) < 1e-9 && Math.abs(c7.sum - 20.0) < 1e-9,
    c7 ? `${c7.sum}` : '못 읽음');

  /* 지문 — ref 실측. 캡처가 없어도 돈다(ref 절만). */
  const vals = (out) => (out.match(/검정\s+((?:\s*-?\d+\.\d+)+)/g) || [])
    .join(' ').replace(/검정/g, ' ').trim().split(/\s+/).map(parseFloat);
  const oldV = vals(runC(['--int'])), newV = vals(runC([]));
  const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
  ok('[7-g] 자가 ref 두 코너를 다 읽는다 (열 40개)', oldV.length >= 40 && newV.length >= 40,
    `${oldV.length} ↔ ${newV.length} 열`);
  ok('[7-h] ⚑ **옛 자의 값은 예외 없이 정수다** — 불리언 세기의 지문',
    oldV.length > 0 && oldV.every(isInt), `${oldV.length}개 전부`);
  ok('[7-i] 새 자는 그 격자에서 풀린다 (0 이 아닌 값의 절반 넘게 비정수)',
    (() => { const nz = newV.filter((v) => v > 0); return nz.filter((v) => !isInt(v)).length > nz.length / 2; })(),
    `${newV.filter((v) => v > 0 && !isInt(v)).length}/${newV.filter((v) => v > 0).length}`);
  ok('[7-j] 두 자의 값이 ±1.5px 안이다 — **정의가 안 바뀌었다**(걸음만 곱아졌다)',
    oldV.length === newV.length && oldV.every((v, k) => Math.abs(v - newV[k]) <= 1.5),
    `최대 ${Math.max(...oldV.map((v, k) => Math.abs(v - newV[k]))).toFixed(2)} px`);

  /* 불변 — 창·팔레트·분류·옛 자를 한 칸도 안 건드렸다 + 사본을 안 만들었다. */
  const src = fs.readFileSync(path.join(TOOLS, 'probe409c.py'), 'utf8');
  ok('[7-k] 창이 그대로다 (`span=20` · 바닥값 열 `dx 45`)',
    /span=20/.test(src) && /col_black\(px, l, t, 45, top, mode=mode\)/.test(src));
  ok('[7-l] 분류가 그대로다 (`cls()` = 최근접 팔레트 · PAL 6색)',
    /def cls\(c\)/.test(src) && (src.match(/\('[KBFDRS]', \(/g) || []).length === 6);
  ok('[7-m] ⚑ **옛 자가 살아 있다**(`--int`) — 지문을 매 실행 다시 찍을 수 있다',
    /mode = 'int' if '--int' in a else 'cov'/.test(src) && /if mode == 'int':/.test(src));
  ok('[7-n] ⚑ **사본을 안 만들었다** — 942 1회차의 알맹이를 그대로 부른다(`probe409g.runs_from`)',
    /from probe409g import runs_from, physics/.test(src) && !/def runs_from/.test(src));
  const gsrc = fs.readFileSync(path.join(TOOLS, 'probe409g.py'), 'utf8');
  ok('[7-o] 그 부름이 남의 자를 안 돌린다 (`probe409g` 가 `__main__` 가드를 든다)',
    /if __name__ == '__main__':/.test(gsrc));
  ok('[7-p] 캡처 없이도 돈다 — 커밋 금지 자산(96-*.png)을 전제하지 않는다',
    /os\.path\.exists\(capf\)/.test(src) && /캡처 없음/.test(src));
}

/* ── [8] 3회차 — `probe409i.py` (층 두께 + 자기가 처방으로 들고 있던 `cov_ray`) ───── */
console.log('\n[8] 3회차 — `probe409i.py` 두 축이 격자에서 풀렸는가 (층 자 0.5px · 덮개 자 0.25px)');
{
  const runI = (extra) => String(py(['tools/probe409i.py', ...extra],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const phI = runI(['--physics']);
  const thI = runI(['--physics-thin']);
  /* ⓐ(층 자)와 ⓑ(덮개 자)가 같은 «int cap …» 꼴이라 절부터 가른다. */
  const part = (out, which) => {
    const i = out.indexOf('ⓑ');
    return which === 'a' ? out.slice(0, i < 0 ? out.length : i) : out.slice(i < 0 ? 0 : i);
  };
  const row8 = (out, mode, who) => {
    const line = out.split('\n').find((l) => new RegExp(`^\\s*${mode}\\s+${who}\\s`).test(l));
    if (!line) return null;
    const toks = line.trim().split(/\s+/).slice(2);
    const ls = [];
    for (const t of toks) {
      if (t === '합') break;
      ls.push([t[0], parseFloat(t.slice(1))]);
    }
    const m = line.match(/합\s+([0-9.]+)/);
    return { ls, sum: m ? parseFloat(m[1]) : NaN, get: (c) => (ls.find((l) => l[0] === c) || [c, 0])[1] };
  };
  const A = (mode, who) => row8(part(phI, 'a'), mode, who);
  const B = (mode, who) => row8(part(phI, 'b'), mode, who);
  const Bt = (mode, who) => row8(part(thI, 'b'), mode, who);
  const At = (mode, who) => row8(part(thI, 'a'), mode, who);
  /* ⚠ 층 개수가 다르면 **즉사가 아니라 무한대**다 — 되돌린 사본에서 이 자가 스택 트레이스로
     죽으면 점수 줄이 안 나와 스윕이 «빨강» 이 아니라 «없는 자» 로 지나간다(913·278 처방). */
  const dmax = (x, y) => (!x || !y || x.ls.length !== y.ls.length ? Infinity
    : Math.max(...x.ls.map((l, i) => Math.abs(l[1] - y.ls[i][1]))));

  const aiC = A('int', 'cap'), aiR = A('int', 'ref');
  const acC = A('cov', 'cap'), acR = A('cov', 'ref');
  ok('[8-a] 두 자 모두 **칼같은 판에서는 참값 그대로**(S3 K7 D4 B7) — 결함은 자의 편향이 아니라 «번짐» 이다',
    aiC && acC && aiC.ls.length === 4 && acC.ls.length === 4
    && aiC.ls.every(([c, v], i) => c === 'SKDB'[i] && Math.abs(v - [3, 7, 4, 7][i]) < 1e-9)
    && acC.ls.every(([c, v], i) => c === 'SKDB'[i] && Math.abs(v - [3, 7, 4, 7][i]) < 1e-9),
    aiC ? aiC.ls.map((l) => l[0] + l[1]).join(' ') : '못 읽음');
  ok('[8-b] ⚑ 층 자 — **옛 자는 번진 판에서 없는 층을 만든다**(4 → 6) · D 가 −2.0px',
    aiR && aiR.ls.length > aiC.ls.length && Math.abs(aiR.get('D') - 4) >= 1.0,
    aiR ? `${aiC.ls.length} → ${aiR.ls.length} · D${aiR.get('D')}` : '못 읽음');
  ok('[8-c] ⚑ 새 층 자는 참값의 차례를 되찾고 두 판 사이 |Δ| ≤ 0.30 px',
    acR && acR.ls.length === 4 && acR.ls.every(([c], i) => c === 'SKDB'[i]) && dmax(acR, acC) <= 0.30,
    acR ? `${acR.ls.map((l) => l[0] + l[1].toFixed(2)).join(' ')} · Δ${dmax(acR, acC).toFixed(2)}` : '못 읽음');
  /* 헛초록 방지 — 위 세 항이 «못 읽어서» 지나가면 안 된다. */
  ok('[8-c2] 그 판정이 실제 값 위에 서 있다 (네 줄을 다 읽었다)',
    [aiC, aiR, acC, acR].every((r) => r && r.ls.length >= 3),
    [aiC, aiR, acC, acR].map((r) => (r ? r.ls.length : 'x')).join('/'));

  /* ⚑⚑ 이 자 고유의 결함 — 처방으로 들고 있던 `cov_ray` 자신이 «사이 색» 으로 샜다.
     S(43,35,26)가 K(0,0,0)↔D(65,49,34) 사이라 검정 경사면의 몫이 없는 S 층으로 간다. */
  const biC = B('int', 'cap'), biR = B('int', 'ref');
  const bcC = B('cov', 'cap'), bcR = B('cov', 'ref');
  ok('[8-d] ⚑⚑ 덮개 자 — **옛 `cov_ray` 는 없는 S 층으로 샌다**(cap 3.00 → ref 4.93) · 같은 자리에서 D 가 절반 넘게 사라진다',
    biR && biC && biR.get('S') - biC.get('S') >= 1.0 && biR.get('D') <= biC.get('D') * 0.6,
    biR ? `S ${biC.get('S').toFixed(2)} → ${biR.get('S').toFixed(2)} · D ${biC.get('D').toFixed(2)} → ${biR.get('D').toFixed(2)}` : '못 읽음');
  ok('[8-e] ⚑ 새 덮개 자는 그 새는 자리가 없다 (S |Δ| ≤ 0.20 · 층 전체 |Δ| ≤ 0.30)',
    bcR && Math.abs(bcR.get('S') - bcC.get('S')) <= 0.20
    && ['K', 'B', 'D', 'S'].every((c) => Math.abs(bcR.get(c) - bcC.get(c)) <= 0.30),
    bcR ? `S ${bcR.get('S').toFixed(2)} · D ${bcR.get('D').toFixed(2)} (참값 4.00)` : '못 읽음');

  /* 덫 — 진짜로 얇은 D 2.0(= K·B 의 «사이 색»)이 접기에 안 먹히는가. */
  const tiR = Bt('int', 'ref'), tcR = Bt('cov', 'ref'), tcC = Bt('cov', 'cap');
  ok('[8-f] ⚑ 덫(K7 **D2** B7) — 옛 덮개 자는 D 를 0.79 로 잘라 먹고(−60%) 없는 S·F 를 만든다',
    tiR && tiR.get('D') <= 1.0 && (tiR.get('S') > 0.5 || tiR.get('F') > 0.5),
    tiR ? tiR.ls.map((l) => l[0] + l[1].toFixed(2)).join(' ') : '못 읽음');
  ok('[8-g] 같은 자리에서 **새 자는 진짜 얇은 층을 안 먹는다**(D ≥ 1.4 · 참값 2.0 의 ±0.5 안)',
    tcR && tcR.get('D') >= 1.4 && Math.abs(tcR.get('D') - 2.0) <= 0.5,
    tcR ? `D${tcR.get('D').toFixed(2)} (칼같은 판 ${tcC.get('D').toFixed(2)})` : '못 읽음');
  /* ⚠ 남은 자리는 «못 고친 것» 이 아니라 분해 한계다(942 1회차 [2-d] 와 같은 자리) — 항으로 세운다. */
  const atR = At('cov', 'ref');
  ok('[8-h] ⚑ 그 더미에서 층 자가 남기는 1px 경사면 하나는 **일부러 안 접었다** — 더 무르게 하면 진짜 1px 층과 못 가른다',
    atR && atR.ls.length >= 3, atR ? `${atR.ls.length}층 · ${atR.ls.map((l) => l[0]).join('')}` : '못 읽음');
  ok('[8-i] 보존 — 두 축·두 모드의 층 두께 **합**이 전부 같다(21.00 = 기둥 전체) — «더 재지» 도 «덜 재지» 도 않았다',
    [aiC, aiR, acC, acR, biC, biR, bcC, bcR].every((r) => r && Math.abs(r.sum - 21.0) < 1e-9),
    [aiR, bcR].map((r) => r.sum.toFixed(2)).join(' / '));

  /* 지문 — ref 실측(캡처 없이 ref 절만 돌아도 된다). */
  const band = (out) => (out.match(/띠 [KBFDRS][0-9]+\.[0-9]+/g) || []).map((t) => parseFloat(t.slice(3)));
  const oldT = runI(['--int']), newT = runI([]);
  const oldV = band(oldT), newV = band(newT);
  const onGrid = (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
  ok('[8-j] 자가 ref 아래 두 코너를 두 자로 다 읽는다 (12 띠)', oldV.length >= 12 && newV.length >= 12,
    `${oldV.length} ↔ ${newV.length} 띠`);
  ok('[8-k] ⚑ **옛 자의 값은 예외 없이 0.5 의 배수다** — 승자독식 런의 지문',
    oldV.length > 0 && oldV.every(onGrid), `${oldV.length}개 전부`);
  ok('[8-l] 새 자는 그 격자에서 풀린다 (절반 넘게 비배수)',
    newV.filter((v) => !onGrid(v)).length > newV.length / 2,
    `${newV.filter((v) => !onGrid(v)).length}/${newV.length}`);
  ok('[8-m] 두 자의 값이 ±1.5px 안이다 — **정의가 안 바뀌었다**(걸음만 곱아졌다)',
    oldV.length === newV.length && oldV.every((v, k) => Math.abs(v - newV[k]) <= 1.5),
    `최대 ${Math.max(...oldV.map((v, k) => Math.abs(v - newV[k]))).toFixed(2)} px`);
  /* ⚑⚑ 가장 짧은 «안 건드렸다» 증거 — 두 모드의 **클래스 글자줄이 글자까지 같다**.
     표본 자리도 분류도 창도 그대로이고 바뀐 것은 그 줄을 두께로 바꾸는 셈뿐이다. */
  const strs = (out) => out.split('\n').filter((l) => /(상자|형상)앵커/.test(l))
    .map((l) => l.replace(/띠 .*/, '').trim());
  ok('[8-n] ⚑⚑ 두 모드의 **클래스 글자줄이 완전히 같다** — 표본 자리·분류·창을 한 칸도 안 건드렸다',
    strs(oldT).length >= 12 && JSON.stringify(strs(oldT)) === JSON.stringify(strs(newT)),
    `${strs(oldT).length}줄`);

  /* 불변 — 문턱·팔레트·윤곽 자·옛 자 + 사본 0. */
  const src = fs.readFileSync(path.join(TOOLS, 'probe409i.py'), 'utf8');
  ok('[8-o] 문턱·분류가 그대로다 (`EDGE_T = 45` · `cls()` 최근접 팔레트 6색)',
    /EDGE_T\s*=\s*45\b/.test(src) && /def cls\(c\)/.test(src)
    && (src.match(/\('[KBFDRS]', \(/g) || []).length === 6);
  ok('[8-p] 윤곽 자는 처음부터 부분 화소였고 그대로다 (`cross`·`thru`·`outer_edge`·`inner_edge` 의 문턱 교차 보간)',
    /f = \(pv - EDGE_T\) \/ \(pv - v\)/.test(src) && /def find_box/.test(src) && /def contour/.test(src));
  ok('[8-q] ⚑ **옛 자가 살아 있다**(`--int`) — 지문을 매 실행 다시 찍을 수 있다',
    /MODE = 'int' if '--int' in a else 'cov'/.test(src) && /if \(mode or MODE\) == 'int'/.test(src));
  ok('[8-r] ⚑ **사본을 안 만들었다** — 942 1회차의 알맹이와 합성 판을 그대로 부른다',
    /from probe409g import runs_from, phys_cols as g_phys_cols/.test(src)
    && !/def runs_from/.test(src) && !/def phys_cols/.test(src));
  const gsrc = fs.readFileSync(path.join(TOOLS, 'probe409g.py'), 'utf8');
  ok('[8-s] 합성 판을 그리는 셈도 저장소에 하나뿐이다 (`physics` 가 `phys_cols` 를 부른다)',
    /cols = phys_cols\(widths, sig, step\)/.test(gsrc) && (gsrc.match(/def _phys_px/g) || []).length === 1);
  ok('[8-t] 캡처 없이도 돈다 — 커밋 금지 자산(96-*.png)을 전제하지 않는다',
    /def has_cap/.test(src) && /캡처 없음/.test(src) && !/'cap': Image\.open\(CAP7\)\.convert\('RGB'\)\.load\(\)/.test(src));
}

/* ── [9] 4회차 — `probe409f.py` (기둥 윗끝 «정수 while 걷기» → 문턱 교차 보간) ───── */
console.log('\n[9] 4회차 — `probe409f.py` 어깨(기둥 윗끝)가 정수 격자에서 풀렸는가 (판정값 0~9px)');
{
  const runF = (extra) => String(py(['tools/probe409f.py', ...extra],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const phF = runF(['--physics']);
  /* «   6.55     int        7.00     6.00    -1.00» 한 줄 */
  const prow = phF.split('\n').map((l) => l.trim().split(/\s+/))
    .filter((t) => t.length >= 5 && /^[0-9.]+$/.test(t[0]) && /^(int|cross)$/.test(t[1]))
    .map((t) => ({ top: parseFloat(t[0]), mode: t[1], cap: parseFloat(t[2]), ref: parseFloat(t[3]) }));
  const byMode = (m) => prow.filter((r) => r.mode === m);
  const errRef = (m) => Math.max(...byMode(m).map((r) => Math.abs(r.ref - r.top)));
  const errCap = (m) => Math.max(...byMode(m).map((r) => Math.abs(r.cap - r.top)));
  const gap = (m) => Math.max(...byMode(m).map((r) => Math.abs(r.ref - r.cap)));
  ok('[9-a] 재현이 참 윗끝 여섯 자리를 두 자로 다 읽었다 (합성 · 그림도 브라우저도 안 쓴다)',
    byMode('int').length >= 5 && byMode('cross').length === byMode('int').length,
    `${byMode('int').length}자리 × 2자`);
  ok('[9-b] ⚑⚑ **옛 자는 번진 판만 한 화소 통째로 어긋난다**(참 윗끝 6.55·6.60 에서 cap 7.00 ↔ ref 6.00) — 1:1 인데도 ref 만 얇다',
    Math.abs(gap('int') - 1.0) < 1e-9, `판 사이 최대 편차 ${gap('int').toFixed(2)} px`);
  ok('[9-c] ⚑ 새 자는 그 편차를 절반 아래로 줄이고 **번진 판을 참값의 ±0.25px 로** 읽는다(옛 자 0.60)',
    gap('cross') <= 0.60 && errRef('cross') <= 0.25 && errRef('int') >= 0.5,
    `편차 ${gap('cross').toFixed(2)} · ref 오차 ${errRef('cross').toFixed(2)} ↔ ${errRef('int').toFixed(2)}`);
  /* ⚠ 남은 편차는 «못 고친 것» 이 아니라 **칼같은 판에는 부분 화소 정보가 없다**는 원리다 —
     경계가 계단이면 어느 자로 재도 ±0.5 다. 그것을 항으로 세워 «무르게 풀었다» 와 구분한다. */
  ok('[9-d] ⚑ 남은 편차는 칼같은 판의 원리적 한계다 — 두 자의 **cap 오차가 사실상 같다**(|Δ| ≤ 0.10)',
    Math.abs(errCap('cross') - errCap('int')) <= 0.10,
    `cap 오차 int ${errCap('int').toFixed(2)} ↔ cross ${errCap('cross').toFixed(2)}`);
  /* ⚑ 좌표 규약 — 표본은 화소 «중심» 에서 오므로 교차 자리에 +0.5 를 더해야 옛 자와 같은 공간이다.
     빼먹으면 칼같은 판이 참값보다 언제나 0.5 작게 나온다(이 항이 그것을 잡는다). */
  const at6 = byMode('cross').find((r) => Math.abs(r.top - 6.0) < 1e-9);
  ok('[9-e] 좌표 규약이 옛 자와 같다 — 참 윗끝 6.00 을 칼같은 판이 6.00±0.10 으로 읽는다(+0.5 를 빼먹으면 5.46 이다)',
    at6 && Math.abs(at6.cap - 6.0) <= 0.10, at6 ? at6.cap.toFixed(2) : '못 읽음');

  /* 지문 — ref 실측(캡처 없이 ref 절만 돌아도 된다). */
  const shoulders = (out) => out.split('\n').map((l) => l.trim().split(/\s+/))
    .filter((t) => t.length >= 3 && /^[0-9]+$/.test(t[0]) && /^-?[0-9.]+$/.test(t[1]))
    .map((t) => parseFloat(t[1]));
  const oldS = shoulders(runF(['--int'])), newS = shoulders(runF([]));
  const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
  ok('[9-f] 자가 ref 열 26개를 다 읽는다', oldS.length >= 20 && newS.length === oldS.length,
    `${oldS.length} ↔ ${newS.length} 열`);
  ok('[9-g] ⚑ **옛 자의 값은 예외 없이 정수다** — 정수 while 걷기의 지문',
    oldS.length > 0 && oldS.every(isInt), `${oldS.length}개 전부`);
  ok('[9-h] 새 자는 그 격자에서 풀린다 (절반 넘게 비정수)',
    newS.filter((v) => !isInt(v)).length > newS.length / 2,
    `${newS.filter((v) => !isInt(v)).length}/${newS.length}`);
  ok('[9-i] 두 자의 값이 ±1.0px 안이다 — **정의가 안 바뀌었다**(걸음만 곱아졌다)',
    oldS.every((v, k) => Math.abs(v - newS[k]) <= 1.0),
    `최대 ${Math.max(...oldS.map((v, k) => Math.abs(v - newS[k]))).toFixed(2)} px`);

  /* 불변 — 문턱·탐침 행·기준선 열·상자 + 사본 0. */
  const src = fs.readFileSync(path.join(TOOLS, 'probe409f.py'), 'utf8');
  ok('[9-j] 문턱·탐침 행이 그대로다 (`DARK_MAX = 42` · `PROBE_Y = 88`)',
    /DARK_MAX = 42\b/.test(src) && /PROBE_Y = 88\b/.test(src));
  ok('[9-k] 기준선 열과 상자가 그대로다 (직선부 x=39 · `BOX` 손 값 · 창 x0 14 · x1 40)',
    /top_of_column\(px, bx, by, 39, PROBE_Y\)/.test(src)
    && /BOX = \{'ref': \(292, 2027\), 'cap': \(291, 1967\)\}/.test(src)
    && /opt\('--x0', 14\), opt\('--x1', 40\)/.test(src));
  ok('[9-l] ⚑ **옛 자가 살아 있다**(`--int`) — 지문을 매 실행 다시 찍을 수 있다',
    /MODE = 'int' if '--int' in a else 'cross'/.test(src) && /if \(mode or MODE\) == 'int'/.test(src));
  ok('[9-m] ⚑ **사본을 안 만들었다** — 합성 판은 `probe409g.phys_cols` 가 그린다(번짐 셈 0줄)',
    /from probe409g import phys_cols as g_phys_cols/.test(src) && !/def phys_cols/.test(src)
    && !/exp\(-0\.5/.test(src));
  ok('[9-n] 캡처 없이도 돈다 — 커밋 금지 자산(96-*.png)을 전제하지 않는다',
    /os\.path\.exists\(CAP7\)/.test(src) && /캡처 없음/.test(src));
}

/* ── [R] 되돌림 ───────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 — 옛 자로 되돌리면 [1] 이 즉시 빨개진다');
{
  const iR = layers(phys, 'int', 'ref'), iC = layers(phys, 'int', 'cap');
  const cR = layers(phys, 'cov', 'ref');
  ok('[R1] 옛 자는 [1-d] 를 못 넘는다 (번진 판의 층 차례가 참값과 다르다)',
    !(iR.length === iC.length && iR.every(([c], i) => c === iC[i][0])),
    `${iR.map((l) => l[0]).join('')} ↔ ${iC.map((l) => l[0]).join('')}`);
  ok('[R2] 옛 자는 [3-b] 지문을 되돌려 낸다 (합성 판에서도 값이 0.5 배수다)',
    iR.every(([, v]) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6), iR.map((l) => l[1]).join(' '));
  ok('[R3] 새 자는 그 지문이 **없다** (같은 합성 판에서 비배수가 나온다)',
    cR.some(([, v]) => Math.abs(v * 2 - Math.round(v * 2)) > 1e-6),
    cR.map((l) => l[1].toFixed(2)).join(' '));
  /* 헛초록 방지 — 이 절이 «잴 것이 없어서» 초록이면 안 된다. */
  ok('[R4] 두 자가 실제로 다른 값을 낸다 (사본이 아니다)',
    JSON.stringify(iR) !== JSON.stringify(cR));
}

console.log(`\nVERIFY942 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
