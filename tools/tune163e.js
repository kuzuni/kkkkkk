/* 작업 163 11회차 — `LD_CRZ` 후보 비교표 (9회차의 tune163b/c/d 와 같은 식).
 *
 * 왜: 9회차 비평 O·P 가 2인 일치로 «마지막 도약의 보폭이 −33%(공중 제동)» 를 짚고
 *     «감속 시작을 420ms → 착지(491.7ms) 이후로 미뤄라» 를 처방했다.
 *
 * ★ 그 처방에는 **닫힌 해가 없다.** 감속 시작은 `LD_CRZ × LD_RUN` 인데, CRZ 를 올리면 등속 속도가
 *   느려져(cruise = 2D / (RUN·(1+CRZ))) **착지 시각도 같이 밀린다** — `decelStart ≥ tLand` 는
 *   CRZ → 1(= 감속이 사라짐)에서만 성립한다. 아래 표의 두 열이 그것을 보여 준다.
 *
 * 그래서 이것은 «고르는» 문제다. 표가 말하는 것:
 *   · 보폭비와 정착 미끄럼은 **둘 다** CRZ 와 함께 좋아진다(같은 방향이다 — 트레이드오프가 아니다)
 *   · 대가는 케이던스와 **제동 거리**다. 제동 거리가 한 보폭보다 짧아지면 «한 걸음 안에 서 버린다»
 *
 * ⚠ 게이트 §4 의 «감속 구간에 이동의 12% 이상» 은 CRZ=.75 시절의 **절대값**이라 .82 부터 빨개진다.
 *   재기준할 때 «감속 구간 평균 속도 ÷ 등속» 을 쓰면 안 된다 — 속도 연속 조건(CRZD = 2CRZ/(1+CRZ))
 *   때문에 그 값은 **구조적으로 항상 정확히 50%** 다(CRZ 와 무관). 쓸 자는 «제동 거리 ÷ 한 보폭».
 *
 * 상수는 index.html 에서 옮겨 적은 것이 아니라 **같은 식으로 다시 유도한다**(LD_FEET 만 공유).
 * 쓰기: node tools/tune163e.js
 */
const SC = 12, RUN = 560;
const FEET = [35.33, 25.04, 17.79, 11.50, 35.33, 25.04, 18.00, 11.50];
const GAPS = [], AIRF = [], STEPS = [], CUM = [];
let CYC = 0, sw = 0, n = 0;
for (let i = 0; i < FEET.length; i++) {
  const d = FEET[i] - FEET[(i + 1) % FEET.length];
  GAPS.push(d); AIRF.push(d <= 0);
  if (d > 0) { sw += d; n++; }
}
sw /= n;
for (let i = 0; i < GAPS.length; i++) {
  if (AIRF[i]) GAPS[i] = sw;
  STEPS.push(GAPS[i] * SC); CUM.push(CYC); CYC += STEPS[i];
}
const P0 = 2, PH = CUM[P0], D = 1.5 * CYC - PH, AVG = CYC / 8;

function model(CRZ) {
  const CRZD = 2 * CRZ / (1 + CRZ), cruise = D * CRZD / (RUN * CRZ);
  let AIRMS = 0;
  for (let i = 0; i < AIRF.length; i++) if (AIRF[i]) { AIRMS = STEPS[i] / cruise; break; }
  const timeAt = (d) => {
    const e = Math.min(1, Math.max(0, d / D));
    if (e <= CRZD) return RUN * CRZ * (e / CRZD);
    return RUN * (CRZ + (1 - Math.sqrt(Math.max(0, 1 - (e - CRZD) / (1 - CRZD)))) * (1 - CRZ));
  };
  const at = (t) => {
    const p = Math.min(1, t / RUN);
    let e;
    if (p < CRZ) e = CRZD * p / CRZ;
    else { const q = (p - CRZ) / (1 - CRZ); e = CRZD + (1 - CRZD) * (1 - (1 - q) * (1 - q)); }
    return e * D;
  };
  const airStart = D - STEPS[3], tLand = Math.min(RUN, timeAt(airStart) + AIRMS), dLand = at(tLand);
  return { CRZ, cruise, cad: 1000 / (AVG / cruise), tLand, decelStart: CRZ * RUN,
    stride: (dLand - airStart) / STEPS[3], brake: D * (1 - CRZD), slip: D - dLand, slipMs: RUN - tLand };
}

console.log(`이동 D = ${D.toFixed(2)}px · 마지막 도약의 «그려진» 보폭 = ${STEPS[3].toFixed(2)}px · 평균 칸 = ${AVG.toFixed(2)}px`);
console.log('');
console.log('CRZ   감속시작  착지시각   (감속시작 ≥ 착지?)   케이던스   보폭비    제동거리  제동/보폭  정착미끄럼');
for (const c of [.70, .75, .78, .80, .82, .84, .86, .88, .90, .95]) {
  const m = model(c);
  console.log(
    `${c.toFixed(2)}  ${m.decelStart.toFixed(1).padStart(7)}  ${m.tLand.toFixed(1).padStart(7)}` +
    `   ${(m.decelStart >= m.tLand ? '예' : '아니오').padStart(8)}` +
    `   ${m.cad.toFixed(1).padStart(5)}fps  ${(m.stride * 100).toFixed(1).padStart(6)}%` +
    `  ${m.brake.toFixed(1).padStart(7)}px  ${(m.brake / STEPS[3]).toFixed(2).padStart(6)}x` +
    `  ${m.slip.toFixed(1).padStart(5)}px/${m.slipMs.toFixed(0)}ms`);
}
console.log('\n현재 제품값은 CRZ = .75 다(보폭비 66.7% = 9회차 O·P 의 «−33%»).');
console.log('«감속시작 ≥ 착지» 열이 끝까지 «아니오» 인 것이 «닫힌 해 없음» 의 증거다.');
