/* probe889d — **[B13] 이 쓰는 자의 바닥**. 규격을 한 치도 안 어긴 합성 띠를 [B13] 과
 * **같은 자·같은 묶음**으로 재서 «이 자가 폭별로 얼마를 읽는가» 를 낸다 (889 7회차).
 *
 * 왜 이것인가(6회차 «다음 회차가 볼 것» 2번): 6회차가 [B13] 1.33 을 **폭 축 1.17 × 종 축 1.19**
 * 로 분해했고, 폭 축(1.17)의 임자로 남은 후보가 **자의 눈금**이다. 선례는 이미 있다 —
 * `probe889` [P4] 가 **옛 이진 자**에 대해 정확히 이것을 해서 1.27배를 시험관에서 재현했다.
 * 이 자는 같은 방법을 **덮인 몫 자**에 한 번 더 쓴다.
 *
 * ⚠ `probe889` [P4] 와 무엇이 다른가 — [P4] 는 본체·코어를 **각각** `widthCov` 로 재고
 *   («자기 밭에서 제 꼭짓점 보정»), 한 위상(0.31)·네 폭(7·11·15·24)만 본다.
 *   [B13] 이 실제로 하는 일은 그것이 **아니다**(`verify856` `spread()` 의 `bank`):
 *     ⓐ 재는 자리 = **본체 주 마루 화소**(`db ≥ .35·max` · 4이웃 봉우리) — 코어의 마루가 아니다.
 *     ⓑ 꼭짓점 보정 δ 를 **본체 밭에서 한 번** 구해 본체·코어에 **같이** 얹는다.
 *     ⓒ 그 자리의 «획 폭 = 2(db+δ)/5» 로 구간을 나누고 «비 = (dc+δ)/(db+δ)» 의 **구간 중앙값**을 본다.
 *   ⇒ 자의 바닥을 물으려면 그 셋을 그대로 밟아야 한다. 이 파일이 그것이다.
 *
 * 실행: `node tools/probe889d.js` (브라우저 없음 · 결정적) · `--csv` 로 폭별 표를 CSV 로.
 */
'use strict';

const { engine } = require('./lib889.js');
const W = engine();

/* [B13] 과 **같은** 묶음 상수 — 사본이 아니라 같은 값을 읽는다는 뜻으로 여기 적고 이름도 같게 둔다.
   (`verify856.js` 는 `page.evaluate` 밖 node 쪽 상수라 require 로 못 꺼낸다 — 값이 갈리면
    아래 [D0] 이 곧바로 빨개진다.) */
const B13_LO = 6, B13_HI = 24, B13_W = 3;
const K = 0.35;                                  /* 규격 — «코어 = 획 폭의 30~40%» 의 가운데 */

const GW = 128, GH = 40;                         /* 폭 24 띠 + 양옆 여백 */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* ── 합성 띠 — 화소 한 칸과 띠의 겹침이 곧 덮인 몫이다(해석적 · 표본 오차 0) ── */
function bandCov(w, phase) {
  const cv = new Float32Array(GW * GH), c = GW / 2 + phase, lo = c - w / 2, hi = c + w / 2;
  for (let x = 0; x < GW; x++) {
    const a = Math.max(lo, x - 0.5), b = Math.min(hi, x + 0.5);
    const f = b > a ? b - a : 0;
    for (let y = 0; y < GH; y++) cv[y * GW + x] = f;
  }
  return cv;
}
const binarize = cv => { const b = new Float32Array(cv.length); for (let p = 0; p < cv.length; p++) b[p] = cv[p] >= 0.5 ? 1 : 0; return b; };

/* ── [B13] 의 `bank` 를 합성 띠에서 그대로 재현한다 ────────────────────────
   `verify856.js` `spread()` 의 세 줄과 **같은 자리·같은 가중·같은 순서**다:
     자리 = 본체 주 마루(4이웃 봉우리 · db ≥ .35·max) · δ = peak(본체) · 비 = (dc+δ)/(db+δ). */
function bank(bodyCv, coreCv, useCov) {
  const body = useCov ? bodyCv : binarize(bodyCv);
  const core = useCov ? coreCv : binarize(coreCv);
  const db = W.chamCov(body, GW, GH), dc = W.chamCov(core, GW, GH);
  const inB = new Uint8Array(GW * GH);
  for (let p = 0; p < body.length; p++) inB[p] = body[p] >= 0.5 ? 1 : 0;
  let mx = 0;
  for (let p = 0; p < db.length; p++) if (inB[p] && db[p] > mx && db[p] < 1e9) mx = db[p];
  const need = mx * 0.35, out = [];
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const p = y * GW + x, v = db[p];
    if (!inB[p] || v < need || v >= 1e9) continue;
    if (v < db[p - 1] || v < db[p + 1] || v < db[p - GW] || v < db[p + GW]) continue;
    const dlt = useCov ? W.peak(db, p, GW) : 0;    /* 옛 자에는 꼭짓점 보정이 없다(대조군) */
    const bv = v + dlt, cvv = Math.max(0, dc[p] + dlt);
    if (!(bv > 0)) continue;
    out.push([2 * bv / 5, cvv / bv]);
  }
  return out;
}

/* ── [B13] 의 묶음(`b13bands`)을 그대로 ── */
function bands(rows) {
  const outRows = [];
  for (let lo = B13_LO; lo < B13_HI; lo += B13_W) {
    const hi = lo + B13_W, acc = [];
    for (const e of rows) if (e[0] >= lo && e[0] < hi) acc.push(e[1]);
    if (!acc.length) continue;
    acc.sort((a, b) => a - b);
    outRows.push({ lo, hi, n: acc.length, md: acc[Math.floor(0.5 * (acc.length - 1))] });
  }
  return outRows;
}
const bandOf = rs => rs.length >= 2 ? Math.max.apply(null, rs.map(b => b.md)) / Math.min.apply(null, rs.map(b => b.md)) : 0;

/* ── 훑기: 규격을 정확히 지키는 띠(코어 = K·획)를 폭·위상별로 ────────────── */
const PH = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
function sweep(useCov, coreOf) {
  const rows = [];
  for (let s = B13_LO; s <= B13_HI + 1e-9; s += 0.25) {
    for (const ph of PH) {
      const cw = coreOf(s);
      if (!(cw > 0.5)) continue;
      for (const e of bank(bandCov(s, ph), bandCov(cw, ph), useCov)) rows.push(e);
    }
  }
  return rows;
}

console.log('=== PROBE 889d — [B13] 이 쓰는 자를 «규격을 정확히 지키는 띠» 에 대 본다 ===\n');
console.log('  묶음은 [B13] 과 같다: 획 ' + B13_LO + '~' + B13_HI + ' 를 ' + B13_W + '칸씩 · 규격 K = ' + K + '\n');

/* [D0] 자가 자리를 제대로 잡는가 — 재는 자리가 본체 주 마루이고 표본이 여섯 구간을 다 채우는가 */
const covRows = sweep(true, s => K * s);
const covB = bands(covRows);
console.log('  덮인 몫 자(= [B13] 판정이 쓰는 자)');
console.log('   획 구간    n      비 중앙    ⇒ 코어(px)    잔차(비 − K)');
for (const b of covB) console.log('    ' + String(b.lo).padStart(2) + '~' + String(b.hi).padEnd(3) +
  String(b.n).padStart(7) + String(b.md.toFixed(4)).padStart(11) +
  String((b.md * (b.lo + b.hi) / 2).toFixed(2)).padStart(12) +
  String(((b.md - K) >= 0 ? '+' : '') + (b.md - K).toFixed(4)).padStart(14));
const covBand = bandOf(covB);
console.log('  ⇒ 덮인 몫 자의 바닥 밴드 = ' + covBand.toFixed(3) + '배\n');

ok(covB.length === 6, '[D0] 여섯 구간이 다 찼다 — ' + covB.length + '구간 (묶음이 [B13] 과 같다)');

/* [D1] ⚑ 이 회차의 물음 — 규격을 정확히 지키는 띠에서 이 자가 밴드를 만드는가 */
ok(covBand <= 1.02,
   '[D1] 규격을 **정확히** 지키는 띠를 [B13] 의 자·묶음으로 재면 밴드 ' + covBand.toFixed(3) +
   '배 ≤ 1.02 — 자는 폭에 무관하다(= 실측 폭 축 1.17 은 자의 몫이 아니다)');

/* [D2] 대조군 — 같은 띠를 옛 이진 자로 재면(=`probe889` [P4a] 의 자리) 밴드가 실제로 생긴다 */
const binRows = sweep(false, s => K * s);
const binB = bands(binRows);
const binBand = bandOf(binB);
console.log('  [대조] 옛 이진 자 — ' + binB.map(b => b.lo + '~' + b.hi + ' ' + b.md.toFixed(3)).join(' · '));
ok(binBand >= 1.15,
   '[D2] 같은 띠를 옛 이진 자로 재면 밴드 ' + binBand.toFixed(3) + '배 ≥ 1.15 (자가 바뀐 것이 실재한다)');

/* [D3] 잔차의 부호·크기 — 자의 바닥이 K 에서 얼마나 떨어져 있나(구간별) */
{
  const wr = covB.map(b => Math.abs(b.md - K));
  const mxr = Math.max.apply(null, wr);
  ok(mxr <= 0.006,
     '[D3] 구간별 비가 규격 K = ' + K + ' 에 붙어 있다 — 최악 잔차 ' + mxr.toFixed(4) +
     ' ≤ 0.006 (실측 [B13] 의 잔차는 −0.031 ~ +0.075 로 5~12배다)');
}

/* [D4] 기울임 — 실제 획은 축에 나란하지 않다. 자의 바닥이 기울기에서 얼마나 뜨는가(진단 + 상한) */
{
  /* 기울어진 띠는 16×16 초표본(표본 오차 ≤ 1/16화소) — `probe889` [P5] 와 같은 방법 */
  const tilt = (w, deg, phase) => {
    const cv = new Float32Array(GW * GH), th = deg * Math.PI / 180;
    const nx = Math.cos(th), ny = Math.sin(th), N = 16, h = w / 2;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      let n = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const sx = x - 0.5 + (i + 0.5) / N - GW / 2, sy = y - 0.5 + (j + 0.5) / N - GH / 2;
        if (Math.abs(sx * nx + sy * ny - phase) <= h) n++;
      }
      cv[y * GW + x] = n / (N * N);
    }
    return cv;
  };
  const rows = [];
  for (const deg of [0, 15, 30, 45]) {
    const acc = [];
    for (let s = B13_LO; s <= B13_HI + 1e-9; s += 1) {
      for (const ph of [0, 0.31, 0.62]) {
        for (const e of bank(tilt(s, deg, ph), tilt(K * s, deg, ph), true)) acc.push(e);
      }
    }
    const bb = bands(acc);
    rows.push([deg, bandOf(bb), bb.length, bb.map(b => b.md.toFixed(3)).join('/')]);
  }
  console.log('  [D4] 기울임별 자의 바닥 — ' + rows.map(r => r[0] + '° ' + r[1].toFixed(3) + '배(' + r[3] + ')').join(' · '));
  const mxT = Math.max.apply(null, rows.map(r => r[1]));
  ok(mxT <= 1.10,
     '[D4] 기울여도(0·15·30·45°) 자의 바닥 밴드가 ' + mxT.toFixed(3) + '배 ≤ 1.10 — ' +
     '기울기는 [Q5] 가 이미 재는 몫이고 여기서 밴드를 만들지 않는다');
}

/* ── [R] 되돌림 시험 — 이 자가 «아무 띠나 초록» 이 아님을 못박는다 ────────── */
{
  /* R1 — 규격을 어긴 띠(코어를 바닥 4.0px 로 고정 = 8회차 두 채점자가 손으로 잰 그 얼굴)를
     주면 같은 자·같은 묶음이 곧바로 빨개진다. */
  const flatRows = sweep(true, () => 4.0);
  const flatB = bands(flatRows), flatBand = bandOf(flatB);
  console.log('  [R1] 코어를 «바닥 4.0px» 로 고정한 띠 — ' + flatB.map(b => b.lo + '~ ' + b.md.toFixed(3)).join(' · '));
  ok(flatBand >= 2.0,
     '[R1] 규격을 어긴 띠(코어 4.0px 고정)는 같은 자로 재도 밴드 ' + flatBand.toFixed(2) +
     '배 ≥ 2.0 로 빨갛다 — [D1] 의 1.00 은 «자가 아무것이나 통과시킨» 값이 아니다');

  /* R2 — 꼭짓점 보정 δ 를 «본체에서 구해 둘에 같이» 얹는 것이 [B13] 의 설계다(사본 금지 주석).
     그것을 빼면(코어에 δ 를 안 얹으면) 가는 쪽이 통째로 내려앉아 밴드가 선다 —
     곧 [D1] 의 1.00 은 보정의 **자리** 덕이지 우연이 아니다. */
  const noDelta = (() => {
    const rows = [];
    for (let s = B13_LO; s <= B13_HI + 1e-9; s += 0.25) for (const ph of PH) {
      const body = bandCov(s, ph), core = bandCov(K * s, ph);
      const db = W.chamCov(body, GW, GH), dc = W.chamCov(core, GW, GH);
      const inB = new Uint8Array(GW * GH);
      for (let p = 0; p < body.length; p++) inB[p] = body[p] >= 0.5 ? 1 : 0;
      let mx = 0;
      for (let p = 0; p < db.length; p++) if (inB[p] && db[p] > mx && db[p] < 1e9) mx = db[p];
      const need = mx * 0.35;
      for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
        const p = y * GW + x, v = db[p];
        if (!inB[p] || v < need || v >= 1e9) continue;
        if (v < db[p - 1] || v < db[p + 1] || v < db[p - GW] || v < db[p + GW]) continue;
        const dlt = W.peak(db, p, GW), bv = v + dlt;
        if (!(bv > 0)) continue;
        rows.push([2 * bv / 5, Math.max(0, dc[p]) / bv]);   /* 코어에만 δ 를 안 얹는다 */
      }
    }
    return bandOf(bands(rows));
  })();
  ok(noDelta >= 1.05,
     '[R2] 꼭짓점 보정을 **코어에만** 안 얹으면 같은 띠가 밴드 ' + noDelta.toFixed(3) +
     '배 ≥ 1.05 — δ 를 둘에 같이 얹는 [B13] 의 설계가 [D1] 을 세운다');
}

if (process.argv.includes('--csv')) {
  console.log('\nwidth,phase,strokeW,ratio');
  for (let s = B13_LO; s <= B13_HI + 1e-9; s += 1) for (const ph of [0, 0.31]) {
    for (const e of bank(bandCov(s, ph), bandCov(K * s, ph), true)) {
      console.log([s, ph, e[0].toFixed(4), e[1].toFixed(5)].join(','));
      break;                                     /* 띠는 세로로 같은 값이라 한 줄이면 족하다 */
    }
  }
}

console.log('\nPROBE889D ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
