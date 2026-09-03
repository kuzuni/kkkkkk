#!/usr/bin/env node
/* probe856 — 자의 «폭» 편향표 (856 5회차 · 지시서 [3]-(나) 1순위 ①)
 *
 * 무엇을 재는가
 *   `verify856` [B10] 은 종의 폭을 **W = 4·mean(D)** 로 요약한다(폭 w 인 «무한히 긴» 곧은 띠에서
 *   mean(D) = w/4 라는 항등식이 근거다). 4회차가 gale 한 종에서 «잰 비 ÷ 기하학적 비 ≈ 1.68»
 *   (나머지 종은 ≈ 1.15)을 관측하고 **«자의 편향부터 재라»** 를 5회차 1순위로 남겼다.
 *
 * 왜 합성 도형인가
 *   입력이 제품과 **무관**하므로 «자를 무르게 풀어 내 항을 지웠다» 는 의심이 원리적으로 안 생긴다
 *   (333·328~330 규약). 폭을 **아는** 도형만 넣고 자가 그 수를 돌려주는지 본다.
 *
 * 도형 3종 — 전부 true width 를 안다
 *   band    곧은 띠(위아래로 화면 밖까지 = 캡 없음)          ⇒ 참값 w
 *   stadium 같은 폭에 **둥근 캡**(반지름 w/2)                 ⇒ 참값 w (캡은 폭을 안 바꾼다)
 *   wedge   쐐기(w1 → w2 선형)                                ⇒ 참값은 둘로 적는다:
 *             len  = 길이 가중 평균폭 (= (w1+w2)/2)
 *             area = 면적 가중 평균폭 (굵은 쪽이 더 무겁다)
 *
 * 자 4종 (전부 `verify856` 의 chamfer 5-7-11 위에서 잰다 — 거리 자체는 같은 것을 쓴다)
 *   A  4·mean(D)            현행 [B10]
 *   B  2·Σ(D²)/Σ(D)  (주 마루 · 두께 가중)   ← ridgeCover/spread 가 이미 쓰는 «주 마루» 정의
 *   C  2·median(D)   (주 마루)
 *   D  2·max(D)
 *
 * 쓰기: node tools/probe856.js            (표 전체)
 *       node tools/probe856.js --csv      (기계용)
 */
'use strict';

/* ── verify856 의 거리변환을 **그대로** 옮겨 온다(자를 바꿔 재면 편향표가 거짓말이 된다) ── */
function cham(m, w, h) {
  const INF = 1 << 28, d = new Int32Array(w * h);
  for (let p = 0; p < d.length; p++) d[p] = m[p] ? INF : 0;
  const rel1 = [[-1, -1, 7], [0, -1, 5], [1, -1, 7], [-1, 0, 5], [-2, -1, 11], [2, -1, 11], [-1, -2, 11], [1, -2, 11]];
  const rel2 = rel1.map(r => [-r[0], -r[1], r[2]]);
  const sweep = (rel, rev) => {
    for (let i = 0; i < h; i++) {
      const y = rev ? h - 1 - i : i;
      for (let j = 0; j < w; j++) {
        const x = rev ? w - 1 - j : j, p = y * w + x;
        if (!d[p]) continue;
        let best = d[p];
        for (const [dx, dy, c] of rel) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const v = d[yy * w + xx] + c;
          if (v < best) best = v;
        }
        d[p] = best;
      }
    }
  };
  sweep(rel1, false); sweep(rel2, true);
  return d;                                   /* 5배 스케일 거리 */
}

/* ── 자 A — 현행 [B10] ── */
function effW(m, w, h) {
  const d = cham(m, w, h);
  let s = 0, n = 0;
  for (let p = 0; p < d.length; p++) if (m[p]) { s += d[p] / 5; n++; }
  return n ? 4 * s / n : 0;
}

/* ── 주 마루 화소 모으기 — `ridgeCover`/`spread` 와 **같은 정의**(D ≥ .35·Dmax · 4이웃 봉우리) ── */
function ridgeD(m, w, h) {
  const d = cham(m, w, h);
  let mx = 0;
  for (let p = 0; p < d.length; p++) if (m[p] && d[p] > mx) mx = d[p];
  const need = mx * 0.35, out = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x, v = d[p];
    if (!m[p] || v < need) continue;
    if (v < d[p - 1] || v < d[p + 1] || v < d[p - w] || v < d[p + w]) continue;
    out.push(v / 5);
  }
  return { rs: out, max: mx / 5 };
}
/* 자 B — 두께 가중 평균 (두꺼운 자리가 그림에서 차지하는 몫도 그만큼 크다 · ridgeCover 와 같은 가중) */
function ridgeW(m, w, h) {
  const { rs } = ridgeD(m, w, h);
  if (!rs.length) return 0;
  let a = 0, b = 0;
  for (const v of rs) { a += v * v; b += v; }
  return b ? 2 * a / b : 0;
}
/* 자 C — 주 마루 중앙값 */
function ridgeMed(m, w, h) {
  const { rs } = ridgeD(m, w, h);
  if (!rs.length) return 0;
  rs.sort((x, y) => x - y);
  return 2 * rs[Math.floor(0.5 * (rs.length - 1))];
}
/* 자 D — 봉우리 */
function peakW(m, w, h) { return 2 * ridgeD(m, w, h).max; }

/* ── 도형 ─────────────────────────────────────────────────────────────── */
const W = 220, H = 220;
const blank = () => new Uint8Array(W * H);

/* 곧은 띠 — 세로로 **화면 밖까지** 이어져 캡이 없다 */
function band(w) {
  const m = blank(), x0 = (W - w) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (x + 0.5 >= x0 && x + 0.5 < x0 + w) m[y * W + x] = 1;
  return m;
}
/* 스타디움 — 같은 폭 · 둥근 캡(반지름 w/2) · 심 길이 L */
function stadium(w, L) {
  const m = blank(), r = w / 2, cx = W / 2, y0 = (H - L) / 2, y1 = y0 + L;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5;
    const qy = py < y0 ? y0 : (py > y1 ? y1 : py);
    if ((px - cx) * (px - cx) + (py - qy) * (py - qy) < r * r) m[y * W + x] = 1;
  }
  return m;
}
/* 쐐기 — w1 → w2 선형(캡 없음: 위아래로 화면 밖까지) */
function wedge(w1, w2) {
  const m = blank(), cx = W / 2;
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), w = w1 + (w2 - w1) * t, x0 = cx - w / 2, x1 = cx + w / 2;
    for (let x = 0; x < W; x++) { const px = x + 0.5; if (px >= x0 && px < x1) m[y * W + x] = 1; }
  }
  return m;
}

/* ── 실행 ─────────────────────────────────────────────────────────────── */
const csv = process.argv.includes('--csv');
const rulers = [['A 4·mean(D)', effW], ['B 마루 가중', ridgeW], ['C 마루 중앙', ridgeMed], ['D 봉우리', peakW]];
const rows = [];

const WS = [4, 6, 8, 10.67, 16, 22, 32, 48, 68];
for (const w of WS) rows.push({ shape: 'band', arg: 'w=' + w, truth: w, m: band(w) });
/* 캡 비중을 바꿔 가며 — L 은 «심» 길이라 전체 길이는 L + w */
for (const w of [6, 10.67, 22, 48]) for (const L of [w * 0.5, w * 2, w * 6])
  rows.push({ shape: 'stadium', arg: 'w=' + w + ' L=' + (+L.toFixed(1)), truth: w, m: stadium(w, L) });
for (const [a, b] of [[4, 16], [6, 32], [10, 40], [16, 64]])
  rows.push({ shape: 'wedge', arg: a + '→' + b, truth: (a + b) / 2,
              truth2: (2 / 3) * (a * a + a * b + b * b) / (a + b), m: wedge(a, b) });

const out = rows.map(r => {
  const v = rulers.map(([, f]) => f(r.m, W, H));
  return { ...r, v };
});

if (csv) {
  console.log('shape,arg,truth,' + rulers.map(r => r[0]).join(','));
  for (const r of out) console.log([r.shape, r.arg, r.truth.toFixed(2), ...r.v.map(x => x.toFixed(3))].join(','));
} else {
  console.log('\nprobe856 — 자의 «폭» 편향표 (합성 도형 · 참값을 아는 입력만)\n');
  const hdr = ['도형'.padEnd(9), '인자'.padEnd(15), '참값'.padStart(7)]
    .concat(rulers.map(r => (r[0]).padStart(13)))
    .concat(rulers.map(r => ('÷참값').padStart(8)));
  console.log(hdr.join(''));
  console.log('─'.repeat(hdr.join('').length));
  let last = '';
  for (const r of out) {
    if (r.shape !== last) { last = r.shape; }
    const cells = [r.shape.padEnd(9), r.arg.padEnd(15), r.truth.toFixed(2).padStart(7)]
      .concat(r.v.map(x => x.toFixed(2).padStart(13)))
      .concat(r.v.map(x => (x / r.truth).toFixed(3).padStart(8)));
    console.log(cells.join(''));
  }
  /* 쐐기의 두 번째 참값(면적 가중)도 같이 적는다 — 어느 자가 무엇을 재는지 갈린다 */
  const wg = out.filter(r => r.shape === 'wedge');
  if (wg.length) {
    console.log('\n  쐐기 — 면적 가중 참값과의 비(길이 가중은 위 표):');
    for (const r of wg)
      console.log('    ' + r.arg.padEnd(10) + ' 면적가중 ' + r.truth2.toFixed(2).padStart(6) + '  ⇒ ' +
        r.v.map((x, i) => rulers[i][0].split(' ')[0] + ' ' + (x / r.truth2).toFixed(3)).join(' · '));
  }

  /* ── 판정 요약 — 편향이 «폭에 따라 달라지는가» 가 요점이다 ── */
  console.log('\n  편향의 «폭 의존성» (band + stadium 만 · 참값이 명확한 도형):');
  const flat = out.filter(r => r.shape === 'band' || r.shape === 'stadium');
  rulers.forEach(([nm], i) => {
    const rs = flat.map(r => r.v[i] / r.truth);
    const mn = Math.min(...rs), mx = Math.max(...rs);
    /* 가는 쪽(참값 ≤ 11) vs 굵은 쪽(참값 ≥ 32) — 비의 «비» 가 곧 [B10] 이 먹는 왜곡이다 */
    const thin = flat.filter(r => r.truth <= 11).map(r => r.v[i] / r.truth);
    const thick = flat.filter(r => r.truth >= 32).map(r => r.v[i] / r.truth);
    const avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
    console.log('    ' + nm.padEnd(14) +
      ' 비 ' + mn.toFixed(3) + '~' + mx.toFixed(3) +
      ' (밴드 ' + (mx / mn).toFixed(2) + '배)' +
      '  가는쪽 ' + avg(thin).toFixed(3) + ' / 굵은쪽 ' + avg(thick).toFixed(3) +
      '  ⇒ 가는÷굵은 ' + (avg(thin) / avg(thick)).toFixed(3));
  });
  console.log('\n  ⚑ [B10] 은 «코어 폭 ÷ 본체 폭» 이라 **가는 것(코어)과 굵은 것(본체)을 같은 자로 재서 나눈다**.');
  console.log('     그래서 결함은 «비가 1 이 아니다» 가 아니라 **«가는쪽 비 ÷ 굵은쪽 비 가 1 이 아니다»** 다 —');
  console.log('     그 값이 곧 얇은 종에서 [B10] 이 먹는 배율이다.\n');
}

/* ══════════════════════════════════════════════════════════════════════════
 * §2 — `hh` 추정기의 «도달» 편향표 (856 7회차 · 6회차 «남은 문제» 2번)
 *
 * 6회차가 지렛대 여섯(계수 K·MINR·MINK·MAXR · 칸 규칙 · 판 배율)을 전부 0 이거나 반대로
 * 찍고 남긴 뿌리는 **`hh` 추정기의 도달 반경**이다. 제품은 화소마다
 *     dw = d·0.7071  →  그 반지름 안에서 본 D 의 최댓값 = hh
 * 로 반쪽폭을 읽고 `t = (1−K)·hh` 를 문턱으로 쓴다. 곧은 띠에서는 마루가
 * **h − d** 만큼 떨어져 있으므로 0.707·d ≥ h − d ⇔ **d ≥ 0.586·h** 인 자리에서만
 * 정확하다 — 문턱 자리(d ≈ 0.65h)가 그 안이라 «곧은 띠» 에서는 성립한다.
 * 좁아지는 날개·얇은 조각에서 그 부등식이 깨지면 `hh ≈ d` 로 주저앉고,
 * 그러면 `d ≥ (1−K)·d` 가 **모든 잉크 화소에서 참**이라 코어 = 실루엣 전체다.
 *
 * 이 절은 그 가설을 **참값을 아는 도형에서** 잰다(제품 입력 없음 — 333 규약).
 *   · 자기검산: 정확 EDT 가 곧은 띠에서 해석 거리와 같은가
 *   · 추정기 둘: CUR(제품 현행) · ITER(반복 확장 — `r ← h − d` 로 닿을 때까지)
 *   · 판정 수치: ① hh ÷ 참 반쪽폭 ② **코어폭 ÷ 본체폭**(= [B10] 과 같은 자 B)
 *     목표는 ② 가 `SPEC_K` 0.35 에 붙는 것이다.
 *
 * 쓰기: node tools/probe856.js --hh
 * ══════════════════════════════════════════════════════════════════════ */

const K_SPEC = 0.35, MINR_SPEC = 0.38, MAXR_SPEC = 2.6;   /* index.html 과 같은 값(로컬px · HALO_SS=1 판) */

/* 정확 제곱 EDT — Felzenszwalb 1차원 포물선 포락선(열 → 행). 제품 `edt2d` 를 **부르지 않고**
   자가 제 손으로 짠다(같이 틀리면 조용해진다 — 1회차 규약). */
function edtExact(m, w, h) {
  const INF = 1e20, f = new Float64Array(Math.max(w, h));
  const d = new Float64Array(w * h);
  const v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const tr = (n, get, set) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s;
      for (;;) {
        s = ((get(q) + q * q) - (get(v[k]) + v[k] * v[k])) / (2 * q - 2 * v[k]);
        if (s <= z[k]) k--; else break;
      }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      set(q, (q - v[k]) * (q - v[k]) + get(v[k]));
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = m[y * w + x] ? INF : 0;
    tr(h, y => f[y], (y, val) => { d[y * w + x] = val; });
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) f[x] = d[o + x];
    tr(w, x => f[x], (x, val) => { d[o + x] = val; });
  }
  const out = new Float64Array(w * h);
  for (let p = 0; p < out.length; p++) out[p] = m[p] ? Math.sqrt(d[p]) : 0;
  return out;
}

/* 분리 가능한 슬라이딩 최댓값(단조 덱) — 제품 `maxBox` 와 같은 꼴, 크기만 일반화 */
function maxBox(src, w, h, r) {
  const tmp = new Float64Array(w * h), dst = new Float64Array(w * h);
  const dq = new Int32Array(Math.max(w, h) + 1);
  const run = (n, get, set) => {
    let head = 0, tail = 0;
    for (let i = 0; i < n + r; i++) {
      if (i < n) {
        const val = get(i);
        while (tail > head && get(dq[tail - 1]) <= val) tail--;
        dq[tail++] = i;
      }
      const o = i - r;
      if (o >= 0) { while (dq[head] < o - r) head++; set(o, get(dq[head])); }
    }
  };
  for (let y = 0; y < h; y++) { const o = y * w; run(w, i => src[o + i], (i, val) => { tmp[o + i] = val; }); }
  for (let x = 0; x < w; x++) run(h, i => tmp[i * w + x], (i, val) => { dst[i * w + x] = val; });
  return dst;
}

/* 반지름 칸 — 제품과 같은 기하급수(×1.45) */
function levels(dMax) {
  const LV = [];
  for (let r = 1; r < dMax + 2; r = Math.ceil(r * 1.45)) LV.push(r);
  if (!LV.length) LV.push(1);
  return LV;
}
const binOf = (LV, need) => { let i = 0; while (i < LV.length - 1 && LV[i] < need) i++; return i; };

/* ── 추정기 CUR — 제품 현행(내접 정사각 d/√2 · 한 번만 읽는다) ── */
function hhCur(dist, w, h, LV, boxes) {
  const out = new Float64Array(w * h);
  for (let p = 0; p < out.length; p++) {
    const d = dist[p]; if (d <= 0) continue;
    out[p] = boxes[binOf(LV, d * 0.7071)][p];
  }
  return out;
}
/* ── 추정기 ITER — «닿을 때까지» 넓힌다(7회차 1순위) ──
   r₀ = d 로 시작해 h = maxD(r) 를 읽고, 아직 **h − d > r** 이면 그만큼 넓혀 두세 번 되풀이한다.
   곧은 띠에서는 한 번에 마루에 닿아 h 가 정확하고, 좁아지는 날개에서는 필요한 만큼만 넓어진다.
   ⚠ 4회차가 기각한 opening 과 방향이 반대다 — opening 은 «굵은 쪽이 가는 쪽을 덮는» 확장이었고
   이건 «가는 쪽에서 모자라게 읽는 것» 만 고친다(넓히는 근거가 그 화소 자신의 h − d 다). */
function hhIter(dist, w, h, LV, boxes, iters) {
  const out = new Float64Array(w * h);
  for (let p = 0; p < out.length; p++) {
    const d = dist[p]; if (d <= 0) continue;
    let li = binOf(LV, d), hv = boxes[li][p];
    for (let k = 0; k < (iters || 2); k++) {
      const need = hv - d;
      const lj = binOf(LV, need);
      if (lj <= li) break;
      li = lj; hv = boxes[li][p];
    }
    out[p] = hv;
  }
  return out;
}

/* 제품의 코어 판정식 — 문턱 셋의 가운데(비율 · 최소폭 · 최대폭)
   `half` 가 1 이면 **반화소 규약 교정**을 켠다: EDT 는 «가장 가까운 배경 **화소 중심**까지» 라
   경계까지의 참 거리보다 예외 없이 +0.5px 크다. 그 오프셋은 `d` 와 `hh` 에 **같이** 얹히는데
   문턱은 `(1−K)·hh` 라 **K 배만 상쇄**되고 나머지 (1−K)·0.5 가 코어를 바깥으로 넓힌다 —
   폭에 무관한 **절대** 오차라 가는 획일수록 크게 먹는다. */
function coreOf(dist, hh, w, h, half) {
  const core = new Uint8Array(w * h);
  for (let p = 0; p < core.length; p++) {
    let d = dist[p]; if (d <= 0) continue;
    let H = hh[p];
    if (half) { d -= 0.5; H -= 0.5; if (d <= 0 || H <= 0) continue; }
    const t = Math.max(H - MAXR_SPEC, Math.min((1 - K_SPEC) * H, H - MINR_SPEC));
    if (d >= t) core[p] = 1;
  }
  return core;
}

/* ── 참값을 아는 도형 (참 반쪽폭을 화소마다 돌려준다) ────────────────── */
const HW = 220, HH_ = 220;
function shBand(wd) {
  const m = new Uint8Array(HW * HH_), th = new Float64Array(HW * HH_), x0 = (HW - wd) / 2;
  for (let y = 0; y < HH_; y++) for (let x = 0; x < HW; x++) {
    const px = x + 0.5;
    if (px >= x0 && px < x0 + wd) { m[y * HW + x] = 1; th[y * HW + x] = wd / 2; }
  }
  return { m, th };
}
/* 좁아지는 날개 — 폭이 w1 → w2 로 줄고 **길이가 짧다**(gale 처럼 캡이 가깝다) */
function shWing(w1, w2, L) {
  const m = new Uint8Array(HW * HH_), th = new Float64Array(HW * HH_);
  const cx = HW / 2, y0 = (HH_ - L) / 2;
  for (let y = 0; y < HH_; y++) {
    const t = (y - y0) / L; if (t < 0 || t >= 1) continue;
    const wd = w1 + (w2 - w1) * t;
    for (let x = 0; x < HW; x++) {
      const px = x + 0.5;
      if (px >= cx - wd / 2 && px < cx + wd / 2) { m[y * HW + x] = 1; th[y * HW + x] = wd / 2; }
    }
  }
  return { m, th };
}
/* 굽은 띠 — 반지름 R 의 고리에서 두께 wd 만 남긴 활(참 반쪽폭 = wd/2) */
function shArc(R, wd, a0, a1) {
  const m = new Uint8Array(HW * HH_), th = new Float64Array(HW * HH_);
  const cx = HW / 2, cy = HH_ / 2;
  for (let y = 0; y < HH_; y++) for (let x = 0; x < HW; x++) {
    const px = x + 0.5 - cx, py = y + 0.5 - cy, rr = Math.hypot(px, py);
    if (rr < R - wd / 2 || rr >= R + wd / 2) continue;
    let ang = Math.atan2(py, px); if (ang < 0) ang += 2 * Math.PI;
    if (ang < a0 || ang > a1) continue;
    m[y * HW + x] = 1; th[y * HW + x] = wd / 2;
  }
  return { m, th };
}

function hhTable() {
  const cases = [
    ['곧은 띠',   'w=3',        shBand(3)],
    ['곧은 띠',   'w=4',        shBand(4)],
    ['곧은 띠',   'w=6',        shBand(6)],
    ['곧은 띠',   'w=12',       shBand(12)],
    ['곧은 띠',   'w=24',       shBand(24)],
    ['얇은 조각', 'w=2',        shBand(2)],
    ['얇은 조각', 'w=2.5',      shBand(2.5)],
    ['좁아지는 날개', '10→3 L=60',  shWing(10, 3, 60)],
    ['좁아지는 날개', '14→2 L=50',  shWing(14, 2, 50)],
    ['좁아지는 날개', '8→3 L=90',   shWing(8, 3, 90)],
    ['좁아지는 날개', '24→6 L=80',  shWing(24, 6, 80)],
    ['굽은 띠',   'R=40 w=4',   shArc(40, 4, 0.2, 2.6)],
    ['굽은 띠',   'R=60 w=8',   shArc(60, 8, 0.2, 2.6)],
    ['굽은 띠',   'R=30 w=3',   shArc(30, 3, 0.2, 2.6)],
  ];
  const rows = [];
  for (const [nm, arg, sh] of cases) {
    const { m, th } = sh;
    const dist = edtExact(m, HW, HH_);
    let dMax = 0; for (let p = 0; p < dist.length; p++) if (dist[p] > dMax) dMax = dist[p];
    const LV = levels(dMax);
    const boxes = LV.map(r => maxBox(dist, HW, HH_, r));
    const est = { CUR: hhCur(dist, HW, HH_, LV, boxes), IT2: hhIter(dist, HW, HH_, LV, boxes, 2), IT3: hhIter(dist, HW, HH_, LV, boxes, 3) };
    /* 본체 폭은 자 B(마루 두께가중 — [B10] 이 쓰는 것)로 잰다 */
    const bodyW = ridgeW(m, HW, HH_);
    const out = { nm, arg, bodyW, truth: 0, r: {} };
    /* 참 폭 = 마루 화소들의 참 반쪽폭 ×2 의 두께가중 평균(자 B 와 같은 가중) */
    {
      let a = 0, b = 0;
      for (let p = 0; p < m.length; p++) if (m[p]) { const t2 = th[p]; a += t2 * t2; b += t2; }
      out.truth = b ? 2 * a / b : 0;
    }
    for (const k of ['CUR', 'IT2', 'IT3', 'SUB']) {
      const hh = est[k === 'SUB' ? 'CUR' : k];
      /* ① hh ÷ 참 반쪽폭 — **판정이 놓이는 자리**(d ≥ 0.5·참h)에서만 본다 */
      let s = 0, n = 0;
      for (let p = 0; p < m.length; p++) {
        if (!m[p] || dist[p] <= 0) continue;
        const tHalf = th[p]; if (dist[p] < 0.5 * tHalf) continue;
        s += hh[p] / tHalf; n++;
      }
      const core = coreOf(dist, hh, HW, HH_, k === 'SUB' ? 1 : 0);
      const coreW = ridgeW(core, HW, HH_);
      let cn = 0, mn = 0;
      for (let p = 0; p < core.length; p++) { if (core[p]) cn++; if (m[p]) mn++; }
      out.r[k] = { hhr: n ? s / n : 0, coreW, ratio: bodyW ? coreW / bodyW : 0, fill: mn ? cn / mn : 0 };
    }
    rows.push(out);
  }
  return rows;
}

if (process.argv.includes('--hh')) {
  /* 자기검산 — 정확 EDT 가 곧은 띠에서 해석 거리와 같은가(자를 못 믿으면 표가 거짓말이다) */
  {
    const { m } = shBand(24);
    const d = edtExact(m, HW, HH_);
    let worst = 0;
    const x0 = (HW - 24) / 2;
    for (let y = 60; y < 160; y++) for (let x = 0; x < HW; x++) {
      const p = y * HW + x; if (!m[p]) continue;
      const px = x + 0.5;
      const truth = Math.min(px - x0, x0 + 24 - px);   /* 해석 거리(가장자리까지) */
      worst = Math.max(worst, Math.abs(d[p] - truth));
    }
    console.log('\n  [자기검산] 정확 EDT ↔ 해석 거리(곧은 띠 w=24) 최대 오차 ' + worst.toFixed(3) +
      'px  ⇒ ' + (worst <= 0.51 ? 'ok (반화소 이내)' : '✗ 자를 믿을 수 없다'));
  }
  const rows = hhTable();
  console.log('\nprobe856 §2 — `hh` 추정기의 «도달» 편향 (참값을 아는 합성 도형 · SPEC_K = ' + K_SPEC + ')\n');
  const hdr = ['도형'.padEnd(15), '인자'.padEnd(12), '참폭'.padStart(7), '본체폭'.padStart(8),
    'CUR hh/h'.padStart(10), 'CUR 비'.padStart(9), 'IT2 비'.padStart(9), 'IT3 비'.padStart(9), 'SUB 비'.padStart(9)].join('');
  console.log(hdr); console.log('─'.repeat(hdr.length));
  for (const r of rows) {
    console.log([r.nm.padEnd(15), r.arg.padEnd(12), r.truth.toFixed(2).padStart(7), r.bodyW.toFixed(2).padStart(8),
      r.r.CUR.hhr.toFixed(3).padStart(10), r.r.CUR.ratio.toFixed(3).padStart(9),
      r.r.IT2.ratio.toFixed(3).padStart(9), r.r.IT3.ratio.toFixed(3).padStart(9),
      r.r.SUB.ratio.toFixed(3).padStart(9)].join(''));
  }
  const dev = a => a.reduce((s, x) => s + Math.abs(x - K_SPEC), 0) / (a.length || 1);
  const cur = rows.map(r => r.r.CUR.ratio), it2 = rows.map(r => r.r.IT2.ratio), it3 = rows.map(r => r.r.IT3.ratio), sub = rows.map(r => r.r.SUB.ratio);
  const band = a => Math.max(...a) / Math.min(...a);
  console.log('\n  요약 — «코어폭 ÷ 본체폭» 이 목표 ' + K_SPEC + ' 에서 얼마나 벗어나는가');
  console.log('    CUR  평균편차 ' + dev(cur).toFixed(3) + ' · 최대 ' + Math.max(...cur).toFixed(3) +
    ' · 밴드 ' + band(cur).toFixed(2) + '배');
  console.log('    IT2  평균편차 ' + dev(it2).toFixed(3) + ' · 최대 ' + Math.max(...it2).toFixed(3) +
    ' · 밴드 ' + band(it2).toFixed(2) + '배');
  console.log('    IT3  평균편차 ' + dev(it3).toFixed(3) + ' · 최대 ' + Math.max(...it3).toFixed(3) +
    ' · 밴드 ' + band(it3).toFixed(2) + '배');
  console.log('    SUB  평균편차 ' + dev(sub).toFixed(3) + ' · 최대 ' + Math.max(...sub).toFixed(3) +
    ' · 밴드 ' + band(sub).toFixed(2) + '배   ← 반화소 규약 교정');
  console.log('');
}
