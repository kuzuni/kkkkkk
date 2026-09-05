/* 게이트 958 — «번짐 비대칭»(②ⓑ) 을 갈아 끼운 자리를 지킨다 · 1회차 = `tools/probe384.py`
 *
 *   node tools/verify958.js
 *
 * 무엇을 지키는가 —
 *   932 가 «정수로 세는 자» 전수를 닫으며 갈래를 둘로 갈랐다. R(축척 비대칭)은 932 가,
 *   B(번짐 비대칭 · 1:1 이라 작다)는 942 가 다섯 자를 닫고 **남은 여섯을 958 로 넘겼다.**
 *   1회차가 고른 자는 `probe384.py` 다 — 부르는 노드 게이트가 남의 수를 안 흔든다
 *   (`verify384` 는 제품을 브라우저에서 직접 재고 이 자의 출력을 안 읽는다).
 *
 *   ⚑⚑ **재현이 등재문의 처방을 기각했다.** 958 등재문(942 5회차 §ⓘ 표)은 이 자를
 *      «팔레트 분류라 `probe409g.runs_from` 을 부르면 된다 — 가장 짧은 길» 로 적었다.
 *      그 길을 먼저 갔고 합성 판이 기각했다: 이 자의 걸음은 **1px** 인데(409 계열은 0.5px)
 *      `runs_from` 의 ② 접기는 «경사면은 사영 t 가 훑는다»(`PH_T` 0.30)로 진짜 층과
 *      경사면을 가르므로, **표본이 한 개뿐인 런은 t 훑음이 항상 0** 이라 그 조건을
 *      원리적으로 못 넘는다 ⇒ 1px 걸음에서 접기는 **한 번도 안 돈다**.
 *      ⇒ 932 처방 **ⓐ(문턱 교차 보간)** 로 갔다(`probe866` 이 «테 = 두 모서리의 차» 로
 *      같은 판정을 내린 자리). [2] 가 그 기각을 **매 실행 다시 재현한다.**
 *
 * 절 —
 *   [1] 물리   — 같은 참값 층더미를 «칼같은 판 ↔ 번진 판» 으로 그려 두 자로 잰다(그림·브라우저 0).
 *   [2] 기각   — 등재문의 처방이 왜 이 자에 못 오는가를 **값으로** 다시 찍는다.
 *   [3] 덫     — 새 자가 무르지 않다(진짜 얇은 검정을 안 먹는다 · 칼같은 판 불변).
 *   [4] 지문   — ref 실측에서 옛 자는 정수로 굳고 새 자는 그 격자에서 풀린다.
 *   [5] 보존   — 두 모드가 **같은 것**을 잰다(같은 런을 고르고 값이 가깝다).
 *   [6] 불변   — 창·걸음·팔레트·상자·«고르는 규칙» 이 소스에 그대로 + 옛 자가 `--int` 로 산다.
 *   [7] 장부   — 932 전수에서 이 자가 **B → 면역**이고 주홍 래칫이 6 → 5 다.
 *   [8] 캡처   — 커밋 금지 자산(`docs/review/96-*.png`)이 없어도 돈다.
 *
 * ⚠ 캡처가 없어도 돈다 — [4] 는 ref 절만 읽는다.
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

const run = (extra) => String(py(['tools/probe384.py', ...extra],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

const SRC = fs.readFileSync(path.join(TOOLS, 'probe384.py'), 'utf8');

/* ── 재현 출력 읽기 ─────────────────────────────────────────────────────── */
let PH = '';
try {
  PH = run(['--physics']);
} catch (e) {
  console.log('  (재현을 못 돌렸다: ' + (e && e.message) + ')');
}

/* «  7.0  cov       0.49          -0.236» → {k, mode, gap, bias} · 절(ⓐ/ⓑ)로 나눈다 */
function physRows(section) {
  const lines = PH.split('\n');
  const s = lines.findIndex((l) => l.includes(section));
  if (s < 0) return [];
  const out = [];
  for (let i = s + 1; i < lines.length; i++) {
    if (/^\s*[ⓐⓑⓒ]/.test(lines[i])) break;
    const m = lines[i].match(/^\s+([\d.]+)\s+(int|cov)\s+([\d.]+)\s+([-+][\d.]+)\s*$/);
    if (m) out.push({ k: +m[1], mode: m[2], gap: +m[3], bias: +m[4] });
  }
  return out;
}
const TH = physRows('ⓐ 검정 옆띠 두께');
const IN = physRows('ⓑ 채움면 좌 경계 인셋');
const at = (rows, k, mode) => rows.find((r) => Math.abs(r.k - k) < 1e-9 && r.mode === mode);

/* ── [1] 물리 ─────────────────────────────────────────────────────────── */
console.log('\n[1] 물리 — 같은 참값을 «칼같은 판 ↔ 번진 판» 으로 그려 두 자로 잰다 (위상 6개)');
{
  ok('[1-a] 재현이 두 축 × 참값 여러 자리를 두 자로 다 읽었다 (그림도 브라우저도 안 쓴다)',
    TH.length >= 12 && IN.length >= 8, `두께 ${TH.length}행 · 인셋 ${IN.length}행`);

  const band = [7.0, 6.0, 5.0, 4.0];
  /* ⚑ 이 자의 병은 «번진 쪽만 한 방향으로 깎인다» 이므로 과녁은 **부호 편향**이다.
     칼같은 판은 경계가 계단이라 어느 자로 재도 ±0.5 를 못 넘고(942 4회차 [9-d]),
     그 ±0.5 가 «판 사이 |Δ|» 에 그대로 섞여 판정을 흐린다. */
  const oldTh = band.map((k) => at(TH, k, 'int').bias);
  const newTh = band.map((k) => at(TH, k, 'cov').bias);
  ok('[1-b] ⚑⚑ **옛 자는 판정 대역(K 4~7)에서 번진 판을 예외 없이 −0.33px 얇게 읽는다** — 1:1 인데도 ref 만 얇다',
    oldTh.every((b) => b <= -0.30), oldTh.map((b) => b.toFixed(3)).join(' '));
  ok('[1-c] ⚑ 새 자는 그 편향을 30% 넘게 줄인다 (−0.333 → −0.24 안팎)',
    newTh.every((b, i) => b > oldTh[i] + 0.05 && b >= -0.28),
    newTh.map((b) => b.toFixed(3)).join(' '));

  const oldIn = band.map((k) => at(IN, k, 'int').bias);
  const newIn = band.map((k) => at(IN, k, 'cov').bias);
  ok('[1-d] 인셋 축도 같은 방향으로 깎여 있었다 (옛 −0.08px)',
    oldIn.every((b) => b <= -0.05), oldIn.map((b) => b.toFixed(3)).join(' '));
  ok('[1-e] ⚑ 새 자는 인셋 편향을 **거의 0 으로** 낸다 (|편향| ≤ 0.03px)',
    newIn.every((b) => Math.abs(b) <= 0.03), newIn.map((b) => b.toFixed(3)).join(' '));
}

/* ── [2] 기각 ─────────────────────────────────────────────────────────── */
console.log('\n[2] 기각 — 등재문의 처방(`runs_from`)이 이 자에 왜 못 오는가 (값으로 다시 찍는다)');
{
  /* 여기서만 그 길을 실제로 돌려 본다 — 자 자신은 그 길을 안 쓴다(소스에 없다). */
  const probe = `
import sys
sys.path.insert(0, 'tools')
from probe409g import phys_cols, runs_from, cls
cols = phys_cols(widths=(('S',6.0),('K',7.0),('D',4.0),('B',7.0),('F',10.0)), sig=1.1, step=1.0)
for who in ('cap','ref'):
    ls = runs_from(cols[who], mode='cov', step=1.0)
    k = [w for c, w in ls if c == 'K'][0]
    print(who, len(ls), '%.2f' % k, ''.join(cls(x) for x in cols[who]))
`;
  let outs = {};
  try {
    const o = String(py(['-c', probe], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    o.trim().split('\n').forEach((l) => {
      const m = l.trim().split(/\s+/);
      if (m.length >= 4) outs[m[0]] = { layers: +m[1], k: +m[2], str: m[3] };
    });
  } catch (e) { /* 아래 항이 빨개진다 */ }

  ok('[2-a] 그 길을 실제로 돌려 봤다 (두 판 다)', !!(outs.cap && outs.ref),
    JSON.stringify(outs));
  ok('[2-b] ⚑⚑ **1px 걸음에서는 접기가 한 번도 안 돈다** — 번진 판의 층이 참값 5 보다 많다 (없는 층이 남는다)',
    outs.ref && outs.ref.layers > 5, outs.ref ? `${outs.ref.layers}층` : '-');
  ok('[2-c] ⚑ 그래서 그 길은 **고치려던 비대칭을 그대로 남긴다** — 번진 판 K 가 7.0 이 아니다',
    outs.ref && outs.cap && Math.abs(outs.ref.k - 7.0) >= 0.4 && Math.abs(outs.cap.k - 7.0) < 1e-6,
    outs.ref ? `cap ${outs.cap.k} ↔ ref ${outs.ref.k}` : '-');
  ok('[2-d] 그 판정이 소스에 **이유와 함께** 적혀 있다 (다음 세션이 같은 길을 다시 가지 않게)',
    /def why_not_runs_from/.test(SRC) && /PH_T/.test(SRC) && /1px/.test(SRC));
  ok('[2-e] ⚑ 자 자신은 그 길을 **안 쓴다** — `runs_from` 을 부르지 않는다 (빌린 것은 판을 그리는 셈뿐)',
    !/\bruns_from\s*\(/.test(SRC) && /from probe409g import phys_cols/.test(SRC));
}

/* ── [3] 덫 ───────────────────────────────────────────────────────────── */
console.log('\n[3] 덫 — 무르게 풀지 않았다');
{
  const c4 = at(TH, 4.0, 'cov');
  ok('[3-a] 덫 — 참값 4.0px 짜리 **얇은 검정**이 안 먹힌다 (새 자 ≥ 3.6 · 편향 −0.24)',
    c4 && c4.bias >= -0.40, c4 ? c4.bias.toFixed(3) : '-');
  /* 칼같은 판에서 두 자가 같아야 «새 자가 더 재지» 않은 것이다. */
  const capline = (PH.match(/cap\s+cov\s+정수\s+(\d+)\/(\d+)/) || []);
  ok('[3-b] ⚑ **칼같은 판에서는 새 자도 정수다** — 계단에는 부분 화소 정보가 없다(942 [9-d]) · 새 자가 «더 재지» 않았다',
    capline.length === 3 && capline[1] === capline[2], capline.slice(1).join('/'));
  const c2 = at(TH, 2.0, 'int');
  ok('[3-c] 옛 자의 병이 얇을수록 커지는 것도 그대로 찍힌다 (K 2.0 에서 −1.00px = −50%)',
    c2 && c2.bias <= -0.9, c2 ? c2.bias.toFixed(3) : '-');
}

/* ── [4] 지문 (ref 실측) ─────────────────────────────────────────────── */
console.log('\n[4] 지문 — ref 실측에서 옛 자는 정수로 굳고 새 자는 풀린다');
{
  const parseRow = (out, head, tag) => {
    const lines = out.split('\n');
    const s = lines.findIndex((l) => l.includes(head));
    if (s < 0) return [];
    for (let i = s + 1; i < Math.min(lines.length, s + 8); i++) {
      const m = lines[i].match(new RegExp('^\\s*' + tag + '\\s+(.*)$'));
      if (m) return m[1].trim().split(/\s+/).map(Number).filter((v) => !Number.isNaN(v));
    }
    return [];
  };
  let outCov = '', outInt = '';
  try { outCov = run([]); outInt = run(['--int']); } catch (e) { /* 아래가 빨개진다 */ }

  const bCov = parseRow(outCov, 'ⓗ 검정 옆띠 두께', 'ref');
  const bInt = parseRow(outInt, 'ⓗ 검정 옆띠 두께', 'ref');
  ok('[4-a] 자가 ref 코너 행 15칸을 두 모드로 다 읽었다',
    bCov.length >= 15 && bInt.length === bCov.length, `${bInt.length} ↔ ${bCov.length}칸`);
  const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
  ok('[4-b] ⚑ **옛 자의 값은 예외 없이 정수다** — 화소 개수 세기의 지문',
    bInt.length > 0 && bInt.every(isInt), bInt.join(' '));
  ok('[4-c] ⚑ 새 자는 그 격자에서 풀린다 (절반 넘게 비정수)',
    bCov.length > 0 && bCov.filter((v) => !isInt(v)).length > bCov.length / 2,
    `${bCov.filter((v) => !isInt(v)).length}/${bCov.length} 비정수`);
  /* ⚑ 상한 2.0px 은 «재 보고 정한 값» 이 아니라 **원리적 봉투**다 — 옛 자는 «중심이 K 로
     분류된 화소의 개수» 라 참 경계가 화소 안 어디에 앉느냐로 양 끝에서 각각 최대 1 칸을
     삼키거나 뱉고(합계 1.0), 번짐이 분류 경계를 한 칸 더 밀 수 있다(0.5×2). 그 밖으로
     벌어지면 **다른 런을 고른 것**이라 정의가 바뀐 것이다. 평균은 그보다 훨씬 작아야 한다. */
  const dif = bCov.map((v, i) => Math.abs(v - bInt[i]));
  const mean = dif.reduce((a, b) => a + b, 0) / (dif.length || 1);
  ok('[4-d] 두 자의 값이 원리적 봉투(±2.0px) 안이고 평균은 ≤1.0 이다 — **정의가 안 바뀌었다**(같은 런을 고른다)',
    bCov.length === bInt.length && bCov.length > 0 && dif.every((d) => d <= 2.0) && mean <= 1.0,
    `max ${Math.max(...dif).toFixed(2)} · 평균 ${mean.toFixed(2)}`);
  /* 방향이 이 수리의 뜻이다 — 옛 자가 버리던 «양 끝 반 화소» 를 새 자가 되찾는다. */
  const up = bCov.filter((v, i) => v > bInt[i]).length;
  ok('[4-e] ⚑ 차이의 **방향**이 한쪽이다 — 되찾은 것은 옛 자가 버리던 가장자리 몫이다 (더 두껍게 읽는 칸이 다수)',
    up > bCov.length / 2, `${up}/${bCov.length} 칸이 더 두껍다`);

  const fitR = (out) => {
    const m = out.match(/자유 원 적합\s+r = \*\*([\d.]+)\*\*\s+\(rms ([\d.]+)/);
    return m ? { r: +m[1], rms: +m[2] } : null;
  };
  const fc = fitR(outCov), fi = fitR(outInt);
  ok('[4-f] ⚑ 인셋의 **자유 원 적합이 좋아졌다** — 부분 화소 값이 원에 더 잘 앉는다(rms 가 준다)',
    fc && fi && fc.rms < fi.rms, fc && fi ? `rms ${fi.rms} → ${fc.rms}` : '-');
}

/* ── [5] 보존 ─────────────────────────────────────────────────────────── */
console.log('\n[5] 보존 — 두 모드가 같은 것을 잰다 (표본·분류·창을 안 건드렸다)');
{
  let outCov = '', outInt = '';
  try { outCov = run([]); outInt = run(['--int']); } catch (e) { /* */ }
  /* ⚑⚑ 가장 짧은 증거 — **클래스 런 표가 글자까지 같다.** 바뀐 것은 그 줄을 수로 바꾸는 셈뿐이다. */
  const runsBlock = (out) => {
    const lines = out.split('\n').filter((l) => /^\s+rel\s+\d+\s+[A-Z?]+\s/.test(l));
    return lines.join('\n');
  };
  const a = runsBlock(outCov), b = runsBlock(outInt);
  ok('[5-a] ⚑⚑ 두 모드의 **클래스 런 표가 글자까지 같다** (ⓓⓔ 코너 행 전부)',
    a.length > 0 && a === b, `${a.split('\n').length}행`);
  const head = (out) => (out.split('\n').find((l) => l.includes('ⓐ 세로 한복판')) ? true : false);
  ok('[5-b] 두 모드가 같은 절을 낸다 (출력 구조 동일)', head(outCov) && head(outInt));
}

/* ── [6] 불변 ─────────────────────────────────────────────────────────── */
console.log('\n[6] 불변 — 창·걸음·팔레트·상자·«고르는 규칙» 이 소스에 그대로다');
{
  ok('[6-a] 창이 그대로다 (코너 표 26 · D 창 30 · 검정 창 34 · 인셋 창 44)',
    /def corner_table\([\s\S]*?n=26\)/.test(SRC) && /def dark_wrap\([^)]*n=30/.test(SRC) &&
    /def black_at\([^)]*n=34/.test(SRC) && /def face_left\([^)]*n=44/.test(SRC));
  ok('[6-b] 걸음이 그대로 1px 다 (`row`·`row_cols` 의 step=1)',
    /def row_cols\(px, x0, y, n, step=1\)/.test(SRC) && /def row\(px, x0, y, n, step=1\)/.test(SRC));
  ok('[6-c] 팔레트 6색과 상자 손 값이 그대로다',
    /\('K', \(0, 0, 0\)\)/.test(SRC) && /\('S', \(43, 35, 26\)\)/.test(SRC) &&
    /ref=\(292, 551, 2027\)/.test(SRC) && /cap=\(291, 551, 1967\)/.test(SRC));
  ok('[6-d] ⚑ **«어느 런인가» 고르는 규칙이 그대로다** — 두께는 «처음 나오는 K» · 인셋은 «F 가 run 개 연속»',
    /i = s\.find\('K'\)/.test(SRC) && /== 'F' \* run/.test(SRC));
  ok('[6-e] ⚑ **문턱은 두 층 설계 밝기의 한복판이다** — 한복판이 아니면 새 비대칭이 생긴다',
    /T = \(la \+ lb\) \/ 2\.0/.test(SRC) && /LVL = \{/.test(SRC));
  ok('[6-f] ⚑ **옛 자가 살아 있다**(`--int`) — 지문을 매 실행 다시 찍을 수 있다',
    /MODE = 'int' if '--int' in sys\.argv else 'cov'/.test(SRC));
  ok('[6-g] 한 칸짜리 런을 층으로 안 세는 규칙이 **문턱을 고를 때만** 쓰인다 (값은 그림이 정한다)',
    /def _side\(rs, ri, d\)/.test(SRC) && /rs\[j\]\[1\] >= 2/.test(SRC));
}

/* ── [7] 장부 ─────────────────────────────────────────────────────────── */
console.log('\n[7] 장부 — 932 전수에서 B → 면역 · 주홍 래칫 6 → 5');
{
  const rows = P.census();
  const r = rows.find((x) => x.file === 'probe384.py');
  ok('[7-a] 이 자가 전수에 있다', !!r);
  ok('[7-b] 판정이 **면역(S)** 으로 옮겨졌다', r && r.verdict === 'S', r && r.verdict);
  ok('[7-c] ⚑ 판정이 유효하다 — 장부의 신호가 지금 소스와 같다 (자를 또 고치면 여기가 먼저 빨개진다)',
    r && !r.stale, r && `${r.sig} ↔ ${r.led && r.led.sig}`);
  const brk = rows.filter((x) => x.verdict === 'B').map((x) => x.file);
  ok('[7-d] 주홍이 5 로 줄었다 (942 가 넘긴 여섯 중 하나를 닫았다)',
    brk.length === 5, brk.join(' '));
  ok('[7-e] 장부가 «왜» 를 든다 — 기각한 처방과 고른 처방이 둘 다 적혀 있다',
    r && /runs_from/.test(r.led.why) && /문턱 교차 보간/.test(r.led.why));
}

/* ── [8] 캡처 ─────────────────────────────────────────────────────────── */
console.log('\n[8] 캡처 — 커밋 금지 자산이 없어도 돈다');
{
  const cap = path.join(ROOT, 'docs/review/96-full-hero.png');
  let out = '', died = false;
  try { out = run([]); } catch (e) { died = true; }
  ok('[8-a] ⚑ 캡처가 없어도 **즉사하지 않는다** (942 2·3·4·5회차와 같은 얼굴로 다섯째)',
    !died && /══════ 384 재현/.test(out), fs.existsSync(cap) ? '캡처 있음' : '캡처 없음');
  ok('[8-b] 없으면 «없다» 고 한 줄 말하고 ref 절만 돈다',
    fs.existsSync(cap) || /캡처 .* 없음/.test(out));
  ok('[8-c] 소스가 존재 확인 뒤에 연다 (무조건 `Image.open` 이 아니다)',
    /os\.path\.exists\(CAP7\)/.test(SRC));
}

/* ── [R] 되돌림 ───────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 — 옛 자로 되돌리면 [1] 의 문턱을 못 넘는다');
{
  const band = [7.0, 6.0, 5.0, 4.0];
  const oldFails = band.filter((k) => at(TH, k, 'int').bias < -0.28);
  ok('[R1] 옛 자(`--int`)를 [1-c] 의 자로 재면 **전부 떨어진다** — 항이 헛초록이 아니다',
    oldFails.length === band.length, `${oldFails.length}/${band.length}`);
  const oldIn = band.filter((k) => Math.abs(at(IN, k, 'int').bias) > 0.03);
  ok('[R2] 인셋도 마찬가지다 — 옛 자는 [1-e] 의 ±0.03px 을 못 넘는다',
    oldIn.length === band.length, `${oldIn.length}/${band.length}`);
  ok('[R3] 두 자가 실제로 다른 값을 낸다 (사본이 아니다)',
    band.some((k) => Math.abs(at(TH, k, 'int').bias - at(TH, k, 'cov').bias) > 0.05));
}

console.log('\nVERIFY958 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
