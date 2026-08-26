/* tools/phase122.js — 122 재화 탭 3열 격자의 «칸 위상» (a, b) 를 브루트포스로 푼다.
   (2026-08-26, 15회차 · sess-1344-5244 워커 C)

   문제: 칸 하나의 광택 위상을 phase(col,row) = col·a + row·b (주기의 배수) 로 준다.
         이웃한 두 칸의 위상차가 0 에 가까우면 «같이 번쩍이는 한 줄» 로 보인다.
         13회차는 가로·세로만 보고 (a,b) = (1/4, 1/2) 를 골랐는데, 그러면
         «2열 + 1행» 떨어진 쌍이 2(1/4) + 1/2 = 1 ≡ 0 으로 **완전 동위상**이 된다
         (14회차 채점에서 비평가 AH 가 실측 51ms 로 짚었다).

   그래서 이웃 집합을 (±2, ±1) 까지 넓히고 min 원형거리를 최대화하는 (a,b) 를 찾는다.
   부호를 뒤집은 쌍은 같은 거리라 절반만 센다.

   실행: node tools/phase122.js
*/
'use strict';

/* 원형 거리 — 가장 가까운 정수까지 (0 = 완전 동위상, .5 = 정반대) */
const cd = x => Math.abs(x - Math.round(x));

/* 이웃 집합. 3열 격자라 열 차는 0~2, 행 차는 0~1 이면 화면에서 «한눈에 같이 들어오는» 범위를 덮는다. */
const SET = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, -1], [2, -1]];

const minDist = (a, b) => Math.min(...SET.map(([dc, dr]) => cd(dc * a + dr * b)));

function sweep(N) {
  let best = { m: -1 };
  for (let ka = 1; ka < N; ka++) for (let kb = 1; kb < N; kb++) {
    const m = minDist(ka / N, kb / N);
    if (m > best.m) best = { m, ka, kb, N };
  }
  return best;
}

const show = (a, b, label) => {
  const cells = SET.map(([dc, dr]) => `(${dc},${dr}) ${(cd(dc * a + dr * b) * 100).toFixed(1)}%`);
  console.log(`${label.padEnd(18)} min=${(minDist(a, b) * 100).toFixed(1)}%   ${cells.join('  ')}`);
};

console.log('— 분모별 최적 (min 원형거리 최대화) —');
for (const N of [6, 8, 12, 14, 20, 24, 36, 60]) {
  const b = sweep(N);
  console.log(`  N=${String(N).padStart(2)}  a=${b.ka}/${N}  b=${b.kb}/${N}  min=${(b.m * 100).toFixed(2)}%`);
}

console.log('\n— 후보 비교 —');
show(1 / 4, 1 / 2, '13회차 1/4·1/2');     /* 대각 (2,±1) 이 0% */
show(1 / 6, 1 / 2, '1/6·1/2');
show(1 / 5, 2 / 5, '1/5·2/5');
show(1 / 3, 1 / 2, '★ 15회차 1/3·1/2');   /* 채택 — min 1/6 = 상한 */

console.log('\n상한 증명: (2,0)=2a · (1,1)=a+b · (1,−1)=a−b 셋의 원형거리를 동시에 1/6 초과로');
console.log('만들 수 없다. (a+b)+(a−b)=2a 이므로 앞 둘이 1/6 을 넘으면 2a 가 1/3 미만이거나');
console.log('1 을 넘겨 되감기고, 그때 (2,0) 이 1/6 이하로 떨어진다. → 1/6 이 이 격자의 상한.');
