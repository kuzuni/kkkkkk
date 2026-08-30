#!/usr/bin/env node
/* 476 공용 — «불투명 상자가 이 요소를 **실제로 얼마나 덮었나**» 를 재는 자 한 벌.
 *
 * 왜 한 벌인가(385 «자매 자 드리프트» · 476 등재문):
 *   `probe351` D7 과 `verify419` MEAS 는 같은 자리를 재면서 **다르게 답하고 있었다.**
 *   D7 주석은 자기 판정이 「`verify419` MEAS 와 글자 그대로 같다」고 적어 뒀지만 실제로는
 *   **한 항이 달랐다** — MEAS 는 «그 요소가 다른 불투명 상자에 이미 덮였는지» 까지 세어
 *   보임 %를 내는데, D7 은 «상자 ↔ 내비 의 세로 겹침 px» 만 잰다. 그래서 05 장비 세부 팝업
 *   (`eqslot:*` 3화면)에서 D7 은 「`#wpnGrid` 가 미션 배너를 37px 덮는다」를 내는데,
 *   그 배너는 뒤의 06 시트(`#eqw .eqp`, 불투명 #000 · 폭 1080)에 이미 **100% 덮여**
 *   2280·1600 둘 다 **보임 0%** 다(= 아무도 못 보는 요소와의 기하 겹침).
 *   ⇒ 두 자가 같은 질문을 하려면 «덮임» 계산이 **한 벌**이어야 한다.
 *
 * 재는 규칙(양쪽이 원래 쓰던 값 그대로 — 한 칸도 안 넓혔다):
 *   · 딤(`.dim`)은 뺀다 — 채점 규칙상 감점 아님
 *   · 「칠이 있는 상자」만: `background-color` alpha ≥ .9 **또는** `background-image !== none`
 *     (351 7회차 교훈 — 그라데이션은 `backgroundColor` 가 `rgba(0,0,0,0)` 으로 계산된다)
 *   · 클리핑 조상을 접은 **drawn**(지금 실제로 그려지는) 상자로 잰다 — raw 로 재면 유령이 쏟아진다
 *   · 다이얼로그·시트 급만: w ≥ 300 · h ≥ 200 · 면적 ≥ 120000
 *   · 대상과 세로로 2px 넘게 · 가로로 40px 넘게 겹치는 짝만
 *   · 대상 자신·조상·자손은 «덮은 것» 이 아니다
 *
 * 내는 것: { visPct, covered, area, stub, n }
 *   visPct — 대상 상자 면적 중 **안 덮인** 비율 %(소수 1자리). 100 = 온전히 보인다 · 0 = 통째로 덮였다
 *   stub   — 대상 높이의 90% 넘게 덮는 상자들 오른쪽에 남는 띠 폭(419 «토막» 의 정의)
 *   n      — 덮은 상자 수(0 이면 아무도 안 덮었다)
 *
 * ⚠ 이 자는 **포인터를 안 묻는다**(`elementFromPoint`). 「닿나」는 351c E1·D7 `navHit` 의 몫이고
 *    여기서 묻는 것은 「보이나」다 — 406 규약이 그 둘을 가른 자리다(LESSONS 406-①·424-①).
 * ⚠ `pointer-events:none` 인 장식도 «칠» 이면 덮은 것으로 센다 — 사람 눈에는 덮였기 때문이다.
 */

/* 페이지 안에서 도는 함수. **문자열로 건네고 `new Function` 으로 되살린다** —
   `page.evaluate(fn, arg)` 는 인자를 JSON 으로만 나르므로 함수를 그대로 넘길 수 없고,
   자마다 사본을 적으면 이 파일을 만든 이유가 사라진다. */
const COVER = function (target, rect) {
  const app = document.getElementById('app');
  if (!app || !target) return { visPct: null, covered: 0, area: 0, stub: null, n: 0 };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return !(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);
  };
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  /* 대상 상자 — 부르는 쪽이 이미 접어 둔 상자가 있으면 그것을 쓴다(D7 의 `cta:` 축이 그렇다) */
  const t = rect || target.getBoundingClientRect();
  const area = (t.right - t.left) * (t.bottom - t.top);
  if (!(area > 0)) return { visPct: null, covered: 0, area: 0, stub: null, n: 0 };

  const rects = [];
  for (const el of app.querySelectorAll('*')) {
    if (el === target || el.contains(target) || target.contains(el)) continue;
    if (!vis(el)) continue;
    if (el.classList.contains('dim')) continue;
    const cs = getComputedStyle(el);
    const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
    const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
    if (!(alpha >= 0.9 || cs.backgroundImage !== 'none')) continue;
    const d = clipped(el);
    const w = d.x2 - d.x1, h = d.y2 - d.y1;
    if (w < 300 || h < 200 || w * h < 120000) continue;
    if (Math.min(d.y2, t.bottom) - Math.max(d.y1, t.top) <= 2) continue;
    if (Math.min(d.x2, t.right) - Math.max(d.x1, t.left) <= 40) continue;
    rects.push({
      x1: Math.max(d.x1, t.left), y1: Math.max(d.y1, t.top),
      x2: Math.min(d.x2, t.right), y2: Math.min(d.y2, t.bottom),
    });
  }
  /* 합집합 면적 — 세로 스윕(겹친 상자를 두 번 세지 않는다) */
  let covered = 0;
  if (rects.length) {
    const xs = [...new Set(rects.flatMap((r) => [r.x1, r.x2]))].sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i++) {
      const x1 = xs[i], x2 = xs[i + 1];
      if (x2 <= x1) continue;
      const spans = rects.filter((r) => r.x1 <= x1 && r.x2 >= x2).map((r) => [r.y1, r.y2]).sort((p, q) => p[0] - q[0]);
      let cy = 0, cur = null;
      for (const [y1, y2] of spans) {
        if (!cur) { cur = [y1, y2]; continue; }
        if (y1 <= cur[1]) cur[1] = Math.max(cur[1], y2); else { cy += cur[1] - cur[0]; cur = [y1, y2]; }
      }
      if (cur) cy += cur[1] - cur[0];
      covered += (x2 - x1) * cy;
    }
  }
  let stub = t.right - t.left;
  for (const r of rects) if (r.y2 - r.y1 > (t.bottom - t.top) * 0.9) stub = Math.min(stub, t.right - r.x2);
  return {
    visPct: Math.round(1000 * (1 - covered / area)) / 10,
    covered: Math.round(covered), area: Math.round(area),
    stub: Math.round(stub * 10) / 10, n: rects.length,
  };
};

/* «이미 가려짐» 문턱 — 보임 %가 이 값 밑이면 «사람이 볼 것이 없다» 로 읽는다.
   `verify419` §1 이 «토막» 을 가르는 데 쓰는 값(0.05 / 99.95)과 **같은 눈금**이다. */
const GONE = 0.05;

module.exports = { COVER, COVER_SRC: String(COVER), GONE };
