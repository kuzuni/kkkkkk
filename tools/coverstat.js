/* 796 — «표본을 칸에 던져 몇 칸이 차는가» 문턱을 **손으로 안 적고 표본에서 파는** 공용 부품
 *
 *   const { coverMin, pCoverAtMost } = require('./coverstat');
 *   const K = 6, T = coverMin(rep.length, K);     // 표본 수에서 문턱을 판다
 *   ok(bins.size >= T, 'R4 …');
 *
 * ── 왜 부품이 필요한가 ────────────────────────────────────────────────────
 * `verify682` [R4] 는 «칸 위상이 5등분 중 ≥3칸에 앉는다» 를 물었다. 두 숫자(5·3)가 손 상수였고
 * 그 위에 서는 표본은 `rep = 버스트 − 1` 인데, 785 의 `holdUntil` 은 문턱(당시 4)에서 바로 떼므로
 * 표본이 **3~4개**였다. 4개를 5칸에 균등히 던져 «≥3칸» 이 나올 확률은 **0.77** —
 * 즉 자 자신이 4회 중 1회 빨갰다(796 등재 실측 2/5 ↔ 4/5). 결함은 제품이 아니라 **자의 산수**였다.
 *
 * ⚑ 고치는 방향은 «문턱을 내린다» 가 아니다(785 서두와 같은 규약) — 내리면 위상이 두 자리에만
 *   굳어도 초록인 **헛초록**이 된다. ⇒ ① 표본을 늘리고 ② 문턱은 **표본에서 판다**:
 *   «무작위라면 그 문턱을 밑돌 확률이 `alpha` 미만» 인 **최대** 문턱을 그 자리에서 계산한다.
 *   표본이 늘면 자가 저절로 엄해지고(강화), 표본이 적으면 헛된 엄격함으로 안 빨개진다.
 *
 * ⚠ 문턱의 바닥은 **2** 다 — «1칸» 은 곧 «굳었다» 이므로, 표본이 아무리 적어도 그 그림은
 *   반드시 빨갛게 남는다(이 부품이 지키려는 뜻 자체가 그것이다).
 */
'use strict';

/* 이항계수 — 이 부품이 쓰는 수는 작다(칸 ≤ 8 · 표본 ≤ 수십) */
function C(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

/* n개를 m칸에 «빠짐없이» 던지는 경우의 수(포함배제) */
function surj(n, m) {
  let s = 0;
  for (let j = 0; j <= m; j++) s += (j % 2 ? -1 : 1) * C(m, j) * Math.pow(m - j, n);
  return s;
}

/** 균등 무작위로 n개를 k칸에 던졌을 때 «덮은 칸 ≤ t» 일 확률 */
function pCoverAtMost(n, k, t) {
  if (n <= 0 || k <= 0) return 1;
  let s = 0;
  for (let m = 1; m <= Math.min(t, k); m++) s += C(k, m) * surj(n, m);
  return s / Math.pow(k, n);
}

/**
 * 표본 n · 칸 k 에서 «무작위가 밑돌 확률 < alpha» 인 **최대** 문턱(바닥 2).
 * 부르는 자는 `bins >= coverMin(n, k)` 로 판정한다.
 */
function coverMin(n, k, alpha) {
  const a = alpha === undefined ? 1e-3 : alpha;
  let t = 2;
  while (t < k && pCoverAtMost(n, k, t) < a) t++;
  return t;
}

/** 칸 수도 표본에서 판다 — 바닥 3(2등분은 «굳었다» 와 «반반» 을 못 가른다) · 천장은 해상도 한계 */
function cellsFor(n, max) {
  return Math.max(3, Math.min(max === undefined ? 8 : max, Math.floor(n / 2)));
}

module.exports = { coverMin, pCoverAtMost, cellsFor, C, surj };
