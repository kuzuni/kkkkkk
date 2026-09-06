/* 998 — 792 [E1] 덩치 밴드를 **접고 견주는 법** 한 벌.
 *
 * 왜 부품으로 빼는가 — 이 산수를 자마다 다시 적으면 그것이 곧 사본이고(402), 989·995·998 이
 * 세 번 연속으로 고친 것이 바로 그 사본이다(`verify981` [D2] 가 792 의 산수를 베껴 두고 있다가
 * 원본이 눈금을 갈 때마다 «792 가 버린 자» 를 지켰다). 여기 있는 것은 **접는 법과 견주는 법**뿐이고
 * **재는 법은 `verify792.measure` 하나뿐**이다 — 이 파일은 픽셀을 안 만진다.
 *
 * ⚠ 눈금(`bulk` = 최대 변)은 995 가 골랐다. 되돌리려면 `verify792` 의 `bulkBand('bulk')` 를
 *   `'own'`(대각)·`'ownGeo'`·`'inkR'` 로 바꾼다 — 그 표는 792 [E1n] 이 나란히 찍고 있다.
 */
'use strict';

/* 한 판(measure 가 돌려준 rows)을 밴드로 접는다.
   key 는 접는 법 이름(판정은 `bulk` — 최대 변). tol 은 밴드 반폭(792 `BULK_TOL` = 0.25). */
function band(rows, tol, key) {
  const k = key || 'bulk';
  const ids = Object.keys(rows || {});
  const g = ids.map(i => rows[i][k]).sort((a, b) => a - b);
  const m = g.length ? g[Math.floor((g.length - 1) / 2)] : 0;
  const lo = m * (1 - tol), hi = m * (1 + tol);
  return { key: k, m, ids, rows,
           lo: +lo.toFixed(1), hi: +hi.toFixed(1),
           out: ids.filter(i => rows[i][k] < lo || rows[i][k] > hi),
           sp: +(g.length ? g[g.length - 1] / Math.max(1, g[0]) : 0).toFixed(2) };
}

/* «내 처방이 밴드 **안**에 있던 종을 밖으로 냈는가» — 제품 밴드 하나와 되돌림 밴드 여럿을 견준다.
   ⚠ **되돌림 판 전부에서 «안»** 이던 종만 센다. 한 판에서라도 밖이던 종은 «내 처방이 아니라도
     밖» 이라는 뜻이라 이 물음의 답이 아니다 — 그것까지 세면 이 자는 다시 **남의 미완**(792 가
     배율표로 닫을 [E1] 절대 밴드)을 지키는 자가 된다(982 [C1] 이 989·995 에서 겪은 그 자리). */
function newOut(cur, negs) {
  if (!negs || !negs.length) return [];
  return cur.out.filter(i => negs.every(n => n.out.indexOf(i) < 0));
}

module.exports = { band, newOut };
