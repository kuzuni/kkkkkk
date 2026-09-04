/* 889 — «덮인 몫 가중» 폭 자 (한 곳에만 선언한다 — 402 «사본을 지운다»)
 *
 * 뿌리(856 10회차가 찍은 것): 코어를 **이진 마스크**로 굽고 이진 마스크로 재는 한, 폭은
 * 화소 격자에 앉는다. 참 획폭 7.00 인 `gale` 에서 규격이 요구하는 코어 2.45화소를 놓을 눈금이
 * 격자에 없어(이웃한 rung 은 3 과 4 뿐) **4.00** 으로 굳고, 그 «폭에 무관한 절대 오차» 가
 * 가는 획에 가장 크게 걸려 [B13] 밴드 1.53 이 남았다.
 *
 * ⇒ 이 파일은 그 절반, **자** 쪽이다(PROGRESS 889 ①). 밭이 0/1 이 아니라 «그 화소가 얼마나
 *   덮였나»(cv ∈ [0,1]) 일 때 폭을 **소수 화소**로 재는 거리변환·마루 폭 한 벌이다.
 *
 *   ⓐ `chamCov(cv,w,h)` — 화소 중심에서 **경계**까지의 부호 있는 거리(5-7-11 눈금 · 5 = 1px).
 *      씨앗은 반쯤 덮인 화소다: 덮인 몫이 곧 중심↔경계 거리라 `s = cv − 0.5`(px) 이고,
 *      꽉 찬 화소(cv ≥ 1)는 경계가 어디인지 모르므로 +INF 로 두고 씨앗에서 전파받는다.
 *      바깥 화소도 제 씨앗(음수)을 갖는데, 경계에서 먼 바깥은 **과대 추정**만 만들므로
 *      min 전파에서 이기지 못한다(가장 가까운 경계 화소가 언제나 더 작은 값을 준다).
 *      ⚠ 옛 `cham()` 은 «가장 가까운 **배경 화소 중심**» 까지라 참 거리보다 예외 없이 +0.5px
 *        크다(856 8회차 «반화소 규약» · 제품은 `dT = d − 0.5` 로 이미 그것을 뺀다). 이 자는
 *        경계까지를 직접 재므로 그 오프셋이 **구조적으로 없다**.
 *
 *   ⓑ `peak(d,p,w)` — ⚑ **이 파일의 본체**. 거리밭은 마루에서 꼭짓점이 뾰족한 «천막» 인데
 *      화소 중심은 그 꼭짓점 위에 앉아 있지 않다 — 폭 4 인 띠는 중심이 화소 **사이**(x=1.5)라
 *      표본의 최댓값이 참 반쪽폭보다 **0.5px 작다**. 이진이든 덮인 몫이든 똑같이 먹는
 *      «표본이 꼭짓점을 놓친다» 몫이고, 856 이 «화소 격자» 라고 부른 것의 나머지 절반이다.
 *      천막의 기울기가 1(px당 1px)이므로 이웃 표본 하나만 있으면 꼭짓점이 닫힌다:
 *        `peak = v + (1 − (v − u))/2`  (u = 가로/세로 이웃 중 **작은 쪽**의 큰 값 = 가로지르는 축)
 *      폭 4 이진 띠는 v=u=1.5 ⇒ 2.0(참값) · 폭 3 이진 띠는 v 1.5 · u 0.5 ⇒ 1.5(참값).
 *      보정은 [0, 0.5]px 로 가둔다 — 천막이 아닌 자리(고원·잡음)에서 없는 두께를 짓지 않는다.
 *
 *   ⓒ `ridgeWD(d,inM,w,h)` — 주 마루(D ≥ .35·Dmax · 4이웃 봉우리)의 **두께 가중 평균**
 *      `W = 2·Σ(t²)/Σ(t)`. 가중도 자리도 `verify856` 의 `ridgeW` 와 **같고**, 다른 것은
 *      들어가는 거리밭과 ⓑ 보정뿐이다.
 *
 * 쓰는 곳 둘이 **같은 문자열**을 읽는다: `tools/probe889.js`(node 안) · `tools/verify856.js`
 * (`page.evaluate` 안 — 브라우저로 넘겨야 해서 소스 «문자열» 로 둔다).
 */
'use strict';

const ENGINE_SRC = `(function(){
  var REL1 = [[-1,-1,7],[0,-1,5],[1,-1,7],[-1,0,5],[-2,-1,11],[2,-1,11],[-1,-2,11],[1,-2,11]];
  var REL2 = REL1.map(function(r){ return [-r[0], -r[1], r[2]]; });
  var INF = 1e9;
  function chamCov(cv, w, h){
    var d = new Float32Array(w * h), p, x, y;
    /* 씨앗은 **경계를 실제로 품은 화소**(안/밖이 갈리는 자리에 맞닿은 것)뿐이다.
       ⚠ «반쯤 덮인 화소를 전부 씨앗으로» 두면 알파가 여러 화소에 걸쳐 완만히 도는 종
         (발광이 넓은 화구·병)에서 경계에서 **한참 안쪽** 화소가 «나는 경계다» 라고 우겨
         거리밭이 통째로 눌린다 — 1회차에 본체폭이 boom −15% · stone +19% 로 뒤틀렸다.
         전이 화소만 씨앗으로 두면 그 밭은 «cv = .5 등고선까지의 거리» 가 되어
         옛 이진 마스크와 **같은 자리**를 재되 눈금만 소수 화소로 촘촘해진다. */
    for(p = 0; p < d.length; p++) d[p] = INF;
    for(y = 0; y < h; y++) for(x = 0; x < w; x++){
      p = y * w + x;
      var inP = cv[p] >= 0.5, tr = false, soft = false;
      var nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for(var t = 0; t < 4; t++){
        var q = nb[t]; if(q < 0) continue;
        if((cv[q] >= 0.5) !== inP){ tr = true; if(cv[q] > 0 && cv[q] < 1) soft = true; }
      }
      if(!tr) continue;
      /* 이 화소가 스스로 반쯤 덮였으면 그 몫이 곧 «중심 → 경계» 다. 꽉 찼거나 텅 비었으면
         경계가 어디인지 **자기는 모른다** — 건너편 이웃이 반쯤 덮였으면 그쪽에 맡기고(씨앗 없음),
         건너편도 0/1 이면 그때만 경계가 화소 «사이» 에 있는 것이라 ±0.5 로 둔다(이진 규약). */
      if(cv[p] > 0 && cv[p] < 1) d[p] = 5 * (cv[p] - 0.5);
      else if(!soft) d[p] = inP ? 2.5 : -2.5;
    }
    var sweep = function(rel, rev){
      for(var i = 0; i < h; i++){
        var y = rev ? h - 1 - i : i;
        for(var j = 0; j < w; j++){
          var x = rev ? w - 1 - j : j, q = y * w + x, best = d[q];
          for(var k = 0; k < rel.length; k++){
            var xx = x + rel[k][0], yy = y + rel[k][1];
            if(xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            var v = d[yy * w + xx] + rel[k][2];
            if(v < best) best = v;
          }
          d[q] = best;
        }
      }
    };
    sweep(REL1, false); sweep(REL2, true);
    return d;
  }
  /* 꼭짓점 보정(5눈금) — 마루를 **가로지르는** 축의 이웃으로 천막의 꼭짓점을 복원한다.
     가로지르는 축 = 두 축 중 이웃이 더 낮은 쪽(마루는 이웃이 높은 축을 따라 흐른다). */
  function peak(d, p, w){
    var v = d[p];
    if(!(v > 0) || v >= INF) return 0;
    var ax = Math.max(d[p-1], d[p+1]), ay = Math.max(d[p-w], d[p+w]);
    var u = Math.min(ax, ay);
    if(!(u > -INF) || u >= INF) return 0;
    var c = (5 - (v - u)) / 2;
    return c < 0 ? 0 : (c > 2.5 ? 2.5 : c);
  }
  function ridgeWD(d, inM, w, h){
    var mx = 0, p;
    for(p = 0; p < d.length; p++) if(inM[p] && d[p] > mx && d[p] < INF) mx = d[p];
    if(!(mx > 0)) return 0;
    var need = mx * 0.35, a = 0, b = 0, n = 0;
    for(var y = 1; y < h - 1; y++) for(var x = 1; x < w - 1; x++){
      var q = y * w + x, v = d[q];
      if(!inM[q] || v < need || v >= INF) continue;
      if(v < d[q-1] || v < d[q+1] || v < d[q-w] || v < d[q+w]) continue;
      var t = (v + peak(d, q, w)) / 5; a += t * t; b += t; n++;
    }
    if(n < 4 || !b) return 2 * (mx + 2.5) / 5;
    return 2 * a / b;
  }
  /* 덮인 몫 밭에서 곧바로 폭 — 안쪽은 «cv ≥ .5» 다(경계가 화소 중심을 지나는 자리) */
  function widthCov(cv, w, h){
    var inM = new Uint8Array(w * h);
    for(var p = 0; p < cv.length; p++) inM[p] = cv[p] >= 0.5 ? 1 : 0;
    return ridgeWD(chamCov(cv, w, h), inM, w, h);
  }
  return { chamCov: chamCov, peak: peak, ridgeWD: ridgeWD, widthCov: widthCov };
})()`;

/* node 쪽에서 쓸 때 — 브라우저 쪽은 이 문자열을 그대로 `page.evaluate` 로 넘긴다 */
function engine() { return (0, eval)(ENGINE_SRC); }

module.exports = { ENGINE_SRC, engine };
