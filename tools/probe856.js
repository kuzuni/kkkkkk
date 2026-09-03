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
