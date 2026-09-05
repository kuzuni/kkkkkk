#!/usr/bin/env node
/* 작업 945 — `probe866.py` 의 «세로 테» 를 재는 창이 둥근 캡의 어깨 위였다.
 *
 *   node tools/verify945.js
 *
 * ── 무엇이 결손이었나 ──────────────────────────────────────────────────────
 * 알약 바깥 폭이 117 ref px 인데 캡(둥근 끝) 반지름이 12 안팎이다. 옛 창 `vx = l + 10`
 * 은 이미 그 어깨 위이고, 거기서 세로 자는 테를 **비스듬히** 가로지른다 — 같은 두께를
 * 더 긴 선분으로 재는 것이다. 932 4회차가 걸음을 정수 → 부분 화소로 갈고 나서야 그것이
 * 드러났다(테 가로 2.31 ↔ 세로 2.65). **정수 격자는 캡 4.91 과 가운데 2.23 을 둘 다 «2» 로
 * 뭉갰다** — 그래서 904 의 «등방 2» 는 맞았고, 부분 화소가 창을 처음 드러낸 것이다.
 *
 * ⚑ **제품은 한 줄도 안 바뀐다.** 이 번호가 고친 것은 «어디서 재는가» 하나이고,
 *   `verify866` 의 과녁 넷(260.0×53.3 · 251.1×44.4 · 테 4.44)은 **그대로 둔다** —
 *   932 4회차가 «캡 인공물을 제품에 굽지 마라» 로 안 옮긴 그 과녁이다.
 *
 * ── 자가 묻는 것 ───────────────────────────────────────────────────────────
 *   [A] 갈림이 닫혔는가 — 부분 화소 테가 가로 ≈ 세로 (등방)
 *   [B] 되돌림 — 옛 창(단일 열 l+10)을 그 자리에 얹으면 갈림이 **되살아난다**
 *       (무르게 푼 수리가 아님을 못박는다 — 334·117 규약)
 *   [C] 옛 정수 자가 한 글자도 안 다치는가 (`--int` = 117×24 · 113×20 · 테 2/2)
 *   [D] 과녁을 안 옮겼는가 — `verify866` 의 상수 넷이 그대로
 *   [E] 캡은 여전히 두껍게 읽힌다 — 945 는 그림을 고친 것이 아니라 **거기서 재기를 그만둔 것**
 *   [F] 사본 0 — 열 걸음이 `col_v` 한 곳에만 있다(402 «사본을 지운다»)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { py } = require('./pydep937');

let pass = 0, fail = 0;
const ok = (t, c, got) => {
  if (c) { pass++; console.log('  PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('  FAIL ' + t + (got ? ' — ' + got : '')); }
};
const run = (args) => String(py(['tools/probe866.py', ...args],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

/* 출력에서 «수» 를 뽑는다 — 문자열이 아니라 수로 묻는다(866·932 규약). */
const ring = (o) => {
  const m = o.match(/테\(속→바깥\) 가로 ([0-9.]+) · 세로 ([0-9.]+) ref px/);
  return m ? [+m[1], +m[2]] : [];
};
const four = (o) => {
  const a = o.match(/평평한 #191614 칠\) ([0-9.]+)x([0-9.]+) ref px/);
  const b = o.match(/검정 테두리 바깥 x\d+\.\.\d+ · y\d+\.\.\d+ = ([0-9.]+)x([0-9.]+) ref px/);
  return a && b ? [+a[1], +a[2], +b[1], +b[2]] : [];
};

let sub, int_, sweep;
try {
  sub = run([]); int_ = run(['--int']); sweep = run(['--ring-sweep']);
} catch (e) {
  if (e && e.status === 2) {
    console.log('VERIFY945 SKIP — 파이썬 의존 없음 · pip3 install pillow numpy');
    process.exit(2);
  }
  throw e;
}

/* ── [A] 갈림이 닫혔다 ─────────────────────────────────────────────────── */
console.log('\n[A] 창을 평평한 구간으로 옮기니 테가 등방으로 닫히는가');
{
  const r = ring(sub);
  ok('[A1] 부분 화소 테 두 수를 읽었다', r.length === 2, r.join(' / '));
  ok('[A2] ★ 가로 ≈ 세로 (Δ ≤ 0.2 ref px) — 932 4회차의 0.34 갈림이 닫혔다',
    r.length === 2 && Math.abs(r[1] - r[0]) <= 0.2,
    r.length === 2 ? `가로 ${r[0]} · 세로 ${r[1]} (Δ ${(r[1] - r[0]).toFixed(2)})` : '');
  /* 값이 «가운데 스윕» 과 같은 자리에서 나왔는가 — 창이 실제로 그 구간이라는 증거 */
  const med = +(sweep.match(/가운데 중앙값 ([0-9.]+)/) || [])[1];
  ok('[A3] 그 세로가 열 스윕의 «가운데 중앙값» 과 같은 수다 (창이 실제로 평평한 구간이다)',
    Number.isFinite(med) && r.length === 2 && Math.abs(r[1] - med) <= 0.05,
    `세로 ${r[1]} ↔ 스윕 가운데 ${med}`);
  const vn = +(sweep.match(/평평한 구간 (\d+)열/) || [])[1];
  ok('[A4] 창이 **한 열이 아니다** — 평평한 구간 열이 여럿이고 그 중앙값을 쓴다',
    Number.isFinite(vn) && vn >= 40, `${vn}열`);
}

/* ── [B] 되돌림 시험 ───────────────────────────────────────────────────── */
console.log('\n[B] ★ 되돌림 — 옛 창(단일 열 l+10)을 그 자리에 얹으면 갈림이 되살아나는가');
{
  /* 원본을 건드리지 않고 **사본**에 옛 창을 얹는다 — `v_band` 를 l+10 한 열로 좁히면
     그것이 정확히 945 이전의 자다(중앙값의 표본이 하나면 그 하나의 값이다). */
  const src = fs.readFileSync(path.join(ROOT, 'tools/probe866.py'), 'utf8');
  const old = src.replace(
    /def v_band\(l, r\):/,
    'def v_band(l, r):\n    return range(l + 10, l + 11)   # [verify945 B] 옛 창 주입\n\ndef _v_band_orig(l, r):');
  ok('[B1] 주입이 실제로 붙었다 (자기 시험이 «안 바뀐 사본» 을 도는 것이 아니다)',
    old !== src && old.includes('옛 창 주입'));
  const tmp = path.join(ROOT, 'tools', 'probe866__945rev.py');
  let rev = '';
  try {
    fs.writeFileSync(tmp, old);
    rev = String(py([path.join('tools', 'probe866__945rev.py')],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } finally { try { fs.unlinkSync(tmp); } catch (e) { /* 지우는 것은 실패해도 판정과 무관 */ } }
  const rr = ring(rev), rn = ring(sub);
  ok('[B2] ★ 옛 창에서는 세로가 가로보다 **0.2 넘게** 두껍다 — 갈림이 되살아난다',
    rr.length === 2 && rr[1] - rr[0] > 0.2,
    rr.length === 2 ? `가로 ${rr[0]} · 세로 ${rr[1]} (Δ ${(rr[1] - rr[0]).toFixed(2)})` : '(못 읽음)');
  ok('[B3] ★ 그리고 지금 자는 그 자리에서 더 얇게 읽는다 — 수리가 값을 실제로 옮겼다',
    rr.length === 2 && rn.length === 2 && rr[1] - rn[1] > 0.3,
    rr.length === 2 && rn.length === 2 ? `옛 ${rr[1]} → 지금 ${rn[1]}` : '');
  ok('[B4] **가로는 안 움직였다** — 945 가 만진 것은 세로 창 하나다',
    rr.length === 2 && rn.length === 2 && Math.abs(rr[0] - rn[0]) < 0.01,
    rr.length === 2 && rn.length === 2 ? `${rr[0]} ↔ ${rn[0]}` : '');
}

/* ── [C] 옛 정수 자는 한 글자도 안 다쳤다 ──────────────────────────────── */
console.log('\n[C] 창을 옮겨도 옛 정수 자가 그대로인가 (격자가 캡과 가운데를 뭉갰기 때문)');
{
  const oo = four(int_), ro = ring(int_);
  ok('[C1] ★ `--int` 가 904 의 값을 그대로 되살린다 — 바깥 117×24 · 속 113×20',
    oo.length === 4 && oo[0] === 113 && oo[1] === 20 && oo[2] === 117 && oo[3] === 24, oo.join(' '));
  ok('[C2] ★ 그 걸음의 테는 여전히 가로·세로 둘 다 정확히 2 — 904 의 «등방 2» 는 이 격자 위 값이다',
    ro.length === 2 && ro[0] === 2 && ro[1] === 2, ro.join(' / '));
  const nn = four(sub);
  ok('[C3] 부분 화소 네 수가 옛 값에서 ±1.0 ref px 안이다 — 정의가 안 바뀌었다(창만 옮겼다)',
    nn.length === 4 && nn.every((v, i) => Math.abs(v - oo[i]) <= 1.0),
    nn.map((v, i) => (v - oo[i]).toFixed(2)).join(' '));
}

/* ── [D] 과녁은 안 옮겼다 ─────────────────────────────────────────────── */
console.log('\n[D] `verify866` 의 과녁 — 945 도 한 줄 안 옮겼다');
{
  const v = fs.readFileSync(path.join(ROOT, 'tools/verify866.js'), 'utf8');
  const num = (re) => { const m = v.match(re); return m ? +m[1] : NaN; };
  const pw = num(/pillW:\s*([0-9.]+)/), ph = num(/pillH:\s*([0-9.]+)/);
  const iw = num(/pillIW:\s*([0-9.]+)/), ih = num(/pillIH:\s*([0-9.]+)/);
  const rg = num(/ring:\s*([0-9.]+)/);
  ok('[D1] ★ 과녁 넷 + 테가 904 의 값 그대로 (260.0×53.3 · 251.1×44.4 · 4.44)',
    pw === 260.0 && ph === 53.3 && iw === 251.1 && ih === 44.4 && rg === 4.44,
    `${pw}×${ph} · ${iw}×${ih} · 테 ${rg}`);
  /* 945 가 «과녁을 옮기지 않는» 이유를 자가 들고 있는다 — 남은 차는 정수↔부분화소 축(942)이다. */
  const K = 1080 / 486;
  const nn = four(sub);
  ok('[D2] 남은 «53.3 ↔ 52.5» 는 이 번호의 것이 아니다 — 정수 눈금 24 와 부분 화소 23.6 의 차 (942 축)',
    nn.length === 4 && Math.abs(nn[3] * K - ph) < 1.6 && nn[3] < 24 && nn[3] > 23,
    nn.length === 4 ? `부분 화소 ${(nn[3] * K).toFixed(1)} ↔ 과녁 ${ph} (정수 24 = ${(24 * K).toFixed(1)})` : '');
}

/* ── [E] 캡은 여전히 두껍다 ───────────────────────────────────────────── */
console.log('\n[E] 945 는 그림을 고친 것이 아니라 «거기서 재기를 그만둔 것» 이다');
{
  const cap = +(sweep.match(/캡 최대 ([0-9.]+)/) || [])[1];
  const med = +(sweep.match(/가운데 중앙값 ([0-9.]+)/) || [])[1];
  ok('[E1] 캡 열은 아직도 가운데보다 한 눈금 넘게 두껍게 읽힌다 (인공물은 그림에 그대로 있다)',
    Number.isFinite(cap) && Number.isFinite(med) && cap > med + 1.0, `캡 ${cap} ↔ 가운데 ${med}`);
  ok('[E2] 그 스윕이 옛 창 l+10 이 캡 쪽이었음을 아직 보여 준다 (근거가 안 사라졌다)',
    /캡 최대/.test(sweep) && /945 는 여기서 재기를 그만뒀다/.test(sweep));
}

/* ── [F] 사본 0 ───────────────────────────────────────────────────────── */
console.log('\n[F] 열 걸음의 사본이 없는가 (402 — 사본을 지운다)');
{
  const src = fs.readFileSync(path.join(ROOT, 'tools/probe866.py'), 'utf8');
  const walks = (src.match(/phase, bright, outer = 'a', 0/g) || []).length;
  ok('[F1] ★ 열 걸음(`walk`)이 **한 곳**에만 있다 — `ring_sweep` 이 `col_v` 를 쓴다',
    walks === 1, `${walks}곳`);
  ok('[F2] 옛 단일 열 창 `vx = l + 10` 이 «재는 자리» 로는 남아 있지 않다 (경계 열은 `bx`)',
    !/^\s*vx = l \+ 10/m.test(src) && /bx = l \+ 10/.test(src));
  ok('[F3] `measure_pill` 과 `ring_sweep` 이 같은 창(`v_band`)을 부른다',
    (src.match(/v_band\(l, r\)/g) || []).length >= 2,
    (src.match(/v_band\(l, r\)/g) || []).length + '곳');
}

console.log('\nVERIFY945 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
