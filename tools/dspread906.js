/* 906 — 버스트 «퍼짐» 판정 **한 벌**. `verify583.js` [D-*-o] 와 `probe906.js` 가 이것을 같이 쓴다.
 *
 * 왜 모듈인가: 재현기와 자가 각자 사슬을 적으면 **사본이 둘**이 되고, 한쪽만 고쳐지는 날
 * «재현은 초록인데 자는 빨강» 이 된다(402 «사본을 지운다» · 902 가 `mk(q, cic)` 로 같은 것을 했다).
 *
 * ── 이 자가 재는 것 ────────────────────────────────────────────────────────
 * 660 의 물음은 «버스트가 발원(강화 버튼)에서 **밖으로** 퍼지는가» 다. 그런데 종전 [D-*-o] 는
 *     d0 = 첫 표본 **전원**의 평균 반경   →   d1 = 창 끝 **생존자**의 평균 반경
 * 을 견주었다. 두 끝값의 **집합이 다르다** — 그래서 값 하나에 축이 둘 섞인다:
 *     ① 알이 실제로 이동한 거리(묻고 싶은 것)
 *     ② 창 안에서 누가 죽었는가(생존 편향 — 묻고 싶지 않은 것)
 * 660 의 알은 수명이 제각각이라 **멀리 간 알이 먼저 죽고**, 그러면 아무도 안 모였는데 평균이 내려간다.
 * (902 §2 실측: 창 9개에 소실 12알 · 생존자 처음 평균이 전원 평균보다 2px 이상 낮은 창 2개.)
 *
 * ⇒ 견주는 두 값을 **같은 집합**에서 낸다: 창 끝까지 살아남은 알만 골라, **그 알들의** 처음 반경(`d0s`)과
 *   끝 반경(`d1`)을 견준다. 구성 축이 빠지고 «이동» 만 남는다.
 *
 * ⚠ 문턱(2px)은 **한 칸도 안 넓혔다** — 넓히는 것은 반려 조항(334·796)이다. 넓히면 «버스트가 버튼으로
 *   모여도 초록» 이 되어 658·660 폐지 축이 통째로 풀린다. 여기서 바뀐 것은 문턱이 아니라 **집합**이다.
 *   그 사실은 `probe906` [D3](소실만 시킨 사본은 초록)·[D4](수렴 사본은 빨강)와
 *   `verify583` [R5]·[R6] 이 짝으로 못박는다.
 */
'use strict';

const TOL = 2;                              /* px — 660/583 이 세운 문턱 그대로다 */

/* samples = [{ t, r: [{ i, d }] }, …]  (i = 첫 무리 안에서의 알 번호 · d = 발원에서의 반경)
   ⚠ samples[0] 은 «첫 무리를 굳힌 표본» 이어야 한다(619 17회차 규약). */
function spread(samples) {
  const S = (samples || []).filter(x => x && x.r && x.r.length);
  if (S.length < 2) return { ok: false, why: '표본 부족', n: S.length };
  const A = S[0].r, Z = S[S.length - 1].r;
  const first = new Map(A.map(x => [x.i, x.d]));
  const surv = Z.filter(x => first.has(x.i));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const d0 = mean(A.map(x => x.d));                       /* 전원 평균 — 보고용(옛 자의 왼쪽 값) */
  const d1s = surv.length ? mean(surv.map(x => x.d)) : null;
  const d0s = surv.length ? mean(surv.map(x => first.get(x.i))) : null;
  const d1 = mean(Z.map(x => x.d));                       /* 창 끝 평균 — 보고용(옛 자의 오른쪽 값) */
  /* 알짜 이동 — 생존자 하나하나의 «끝 − 처음». 등방 산포라 안으로 온 알도 있다(902 §2 ⓑ). */
  const inward = surv.filter(x => x.d < first.get(x.i) - TOL).length;
  return {
    n: S.length, tot: A.length, end: Z.length, surv: surv.length, lost: A.length - surv.length,
    d0, d1, d0s, d1s, inward,
    ok: surv.length > 0 && d1s >= d0s - TOL,              /* ★ 새 자 — 같은 집합끼리 */
    okOld: d1 >= d0 - TOL                                 /* 옛 자 — 섞인 값(보고·대조용) */
  };
}

module.exports = { spread, TOL };
