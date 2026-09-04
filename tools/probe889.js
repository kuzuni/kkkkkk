/* probe889 — **자의 자**. 889 ① 이 세우는 «덮인 몫 가중» 폭 자를 참값을 아는 합성 밭에 대 본다.
 *
 * 왜 이것이 먼저인가(856 10회차 마감 · PROGRESS 889): 9회차가 제품 코어에 부분 알파를 먼저 넣었다가
 * [B12] 를 1.68 → 1.76 으로 깨고 물러났다. 뿌리는 제품이 아니라 **자**였다 — 자가 폭을 이진화해서
 * 재므로 코어 가장자리에 부분 알파를 주는 순간 폭이 **화소 위상**에 따라 흔들린다.
 * ⇒ 자를 먼저 세우고(338 규칙 — 제품을 고치기 전에 찍는다), 그 자가 «참값을 아는 도형» 에서
 *   실제로 소수 화소를 되찾는지부터 못박는다. 5회차가 `probe856` 으로 옛 자의 편향
 *   (이산화 +2.0px · 가는쪽/굵은쪽 1.200)을 잡은 것과 같은 자리·같은 방법이다.
 *
 * 재는 것은 둘이고 **밭은 하나**다(자만 다르다):
 *   · 옛 자 — 덮인 몫을 0/1 로 **이진화**한 뒤 같은 폭 함수에 넣는다(= 지금 `verify856` 이 하는 일).
 *   · 새 자 — `tools/lib889.js` 의 `widthCov`(덮인 몫 그대로).
 *
 * 실행: `node tools/probe889.js` (브라우저 없음 · 결정적)
 */
'use strict';

const { engine } = require('./lib889.js');
const W = engine();

const GW = 72, GH = 72;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* 세로 띠 — 화소 한 칸과 띠의 겹침이 곧 덮인 몫이다(해석적 · 표본 오차 0) */
function bandCov(w, phase) {
  const cv = new Float32Array(GW * GH), c = GW / 2 + phase, lo = c - w / 2, hi = c + w / 2;
  for (let x = 0; x < GW; x++) {
    const a = Math.max(lo, x - 0.5), b = Math.min(hi, x + 0.5);
    const f = b > a ? b - a : 0;
    for (let y = 0; y < GH; y++) cv[y * GW + x] = f;
  }
  return cv;
}
/* 기울어진 띠 — 해석적 넓이 대신 16×16 초표본(표본 오차 ≤ 1/16 화소) */
function tiltCov(w, deg, phase) {
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
}
const binarize = cv => { const b = new Float32Array(cv.length); for (let p = 0; p < cv.length; p++) b[p] = cv[p] >= 0.5 ? 1 : 0; return b; };
const measure = cv => W.widthCov(cv, GW, GH);

console.log('=== PROBE 889 — 덮인 몫 가중 폭 자를 참값을 아는 띠에 대 본다 ===\n');

/* ── [P1]·[P2] 폭 훑기 ─────────────────────────────────────────────── */
const PH = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
let eBinMax = 0, eCovMax = 0, binSet = new Set(), rows = [];
for (let w = 2.0; w <= 6.001; w += 0.2) {
  const bs = [], cs = [];
  for (const ph of PH) {
    const cv = bandCov(w, ph);
    bs.push(measure(binarize(cv)));
    cs.push(measure(cv));
  }
  const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  for (const v of bs) { binSet.add(v.toFixed(2)); if (Math.abs(v - w) > eBinMax) eBinMax = Math.abs(v - w); }
  for (const v of cs) if (Math.abs(v - w) > eCovMax) eCovMax = Math.abs(v - w);
  rows.push([+w.toFixed(2), +md(bs).toFixed(2), +(Math.max(...bs) - Math.min(...bs)).toFixed(2),
             +md(cs).toFixed(3), +(Math.max(...cs) - Math.min(...cs)).toFixed(3)]);
}
console.log('  참폭   옛자(중앙)  옛자 위상폭   새자(중앙)  새자 위상폭');
for (const r of rows) console.log('  ' + String(r[0]).padStart(5) + String(r[1]).padStart(11) +
  String(r[2]).padStart(12) + String(r[3]).padStart(13) + String(r[4]).padStart(12));
console.log('');

ok(eBinMax >= 0.4,
   '[P1] 옛 자(이진)는 참폭을 못 따라간다 — 최악 오차 ' + eBinMax.toFixed(2) + 'px ≥ 0.4 (값이 격자 ' +
   binSet.size + '칸에만 앉는다: ' + [...binSet].sort().join(' · ') + ')');
ok(eCovMax <= 0.12,
   '[P2] 새 자(덮인 몫)는 참폭을 되찾는다 — 최악 오차 ' + eCovMax.toFixed(3) + 'px ≤ 0.12');

/* ── [P3] 위상 불변 ─────────────────────────────────────────────────
   856 9회차 E6 이 물러난 이유가 이것이다 — 부분 알파를 주면 **이진 자**의 폭이 위상에 흔들린다. */
{
  const w = 3.04;                                   /* 10회차 표의 `gale` 기하폭 */
  const bs = PH.map(ph => measure(binarize(bandCov(w, ph))));
  const cs = PH.map(ph => measure(bandCov(w, ph)));
  const sp = a => Math.max(...a) - Math.min(...a);
  ok(sp(bs) >= 0.9, '[P3a] `gale` 기하폭 3.04 에서 옛 자는 위상에 따라 ' + sp(bs).toFixed(2) +
     'px 흔들린다 ≥ 0.9 (' + bs.map(v => v.toFixed(1)).join('/') + ')');
  ok(sp(cs) <= 0.08, '[P3b] 새 자는 같은 자리에서 ' + sp(cs).toFixed(3) + 'px ≤ 0.08 로 잔잔하다');
}

/* ── [P4] ⚑ 밴드를 시험관에서 재현한다 ───────────────────────────────
   856 의 [B13] 은 «획 폭 구간별 (코어폭 ÷ 획폭) 중앙값» 의 max÷min 이다. 규격이 참이면
   («코어 = 획의 K») 구간마다 같은 값이 나와야 하는데 10회차 실측이 1.53 이었다.
   여기서는 **규격을 정확히 지키는 합성 띠**(코어 = 획의 0.35)를 굵기별로 만들어 두 자로 잰다 —
   밴드가 옛 자에서만 생기면 그것은 규격이 아니라 **자와 격자**가 만든 것이다. */
{
  const K = 0.35, STROKE = [7, 11, 15, 24];
  const rb = [], rc = [];
  console.log('\n  획폭   코어(참)   옛자 비    새자 비');
  for (const s of STROKE) {
    const cw = K * s, ph = 0.31;                    /* 위상은 한 값으로 고정(격자와의 관계만 본다) */
    const bs = measure(binarize(bandCov(s, ph))), bc = measure(binarize(bandCov(cw, ph)));
    const cs = measure(bandCov(s, ph)), cc = measure(bandCov(cw, ph));
    rb.push(bc / bs); rc.push(cc / cs);
    console.log('  ' + String(s).padStart(5) + String(cw.toFixed(2)).padStart(10) +
                String((bc / bs).toFixed(3)).padStart(11) + String((cc / cs).toFixed(3)).padStart(11));
  }
  const band = a => Math.max(...a) / Math.min(...a);
  ok(band(rb) >= 1.25, '[P4a] 규격을 **정확히** 지키는 띠인데도 옛 자로 재면 밴드 ' +
     band(rb).toFixed(2) + '배 ≥ 1.25 — [B13] 1.53 의 정체가 이것이다');
  ok(band(rc) <= 1.05, '[P4b] 새 자로 재면 같은 띠가 밴드 ' + band(rc).toFixed(3) + '배 ≤ 1.05');
}

/* ── [P5] 기울어도 선다 ─────────────────────────────────────────────
   실제 획은 축에 나란하지 않다. 45°(가장 불리한 각)에서 새 자가 무너지면 화면에서 못 쓴다. */
{
  const w = 3.04, errs = [];
  for (const deg of [15, 30, 45, 60]) errs.push(Math.abs(measure(tiltCov(w, deg, 0.23)) - w));
  const mx = Math.max(...errs);
  ok(mx <= 0.30, '[P5] 기울어진 띠(15·30·45·60°)에서도 최악 오차 ' + mx.toFixed(3) + 'px ≤ 0.30 (' +
     errs.map(e => e.toFixed(2)).join('/') + ')');
}

/* ── [R] 되돌림 시험 — 자가 «아무것이나 초록» 이 아님을 못박는다 ────── */
{
  /* R1 — 참폭을 틀리게 주면 [P2] 의 문턱이 실제로 빨개진다(문턱이 헐겁지 않다) */
  const cv = bandCov(3.04, 0.31), got = measure(cv);
  ok(Math.abs(got - 3.54) > 0.12,
     '[R1] 같은 띠를 «3.54» 로 부르면 [P2] 문턱(0.12)을 넘는다 — 잰 값 ' + got.toFixed(3) +
     ' (문턱이 아무 값이나 통과시키지 않는다)');
  /* R2 — 꼭짓점 보정을 빼면 이진 띠가 통째로 −0.5px 로 내려앉는다(보정이 실재한다)
     ⚠ 위상은 **0.5**다 — 0.0 은 양 끝 화소가 덮인 몫 정확히 0.5 라 이진화가 둘 다 안으로 담아
       띠가 4 가 아니라 5화소가 된다(그 자리에서는 잰 값 5.00 이 정답이라 이 항이 못 묻는다). */
  const raw = (() => {
    const b = binarize(bandCov(4.0, 0.5)), d = W.chamCov(b, GW, GH);
    const inM = new Uint8Array(GW * GH);
    for (let p = 0; p < b.length; p++) inM[p] = b[p] >= 0.5 ? 1 : 0;
    let mx = 0;
    for (let p = 0; p < d.length; p++) if (inM[p] && d[p] < 1e9 && d[p] > mx) mx = d[p];
    return 2 * mx / 5;                              /* 보정 없는 «표본 최댓값» 폭 */
  })();
  ok(Math.abs(raw - 3.0) < 0.05 && Math.abs(measure(binarize(bandCov(4.0, 0.5))) - 4.0) < 0.05,
     '[R2] 꼭짓점 보정을 빼면 폭 4 짜리 이진 띠가 ' + raw.toFixed(2) + '(−0.5px 내려앉음) · 보정하면 ' +
     measure(binarize(bandCov(4.0, 0.5))).toFixed(2) + ' = 참값');
}

console.log('\nPROBE889 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
