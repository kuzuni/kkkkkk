/* 작업 72 16회차 프로브 — «액자 충전율» 과 «들썩 봉투» 를 한 자로 같이 잰다.
   실행: node tools/p72fill.js   (읽기 전용 · 게이트 아님)

   왜 필요했나 — 15회차까지 네 비평가(AD·AE·AF·AG)가 «장축이 액자 내부 306 의 75~87% 에서 멈춘다» 를
   독립적으로 짚었는데, 처방(`TH_PAD` 를 줄인다)의 상한을 아무도 «재지» 않았다. 상한을 정하는 것은
   121 들썩(`thBob`)이 잉크를 액자 밖으로 밀어내는 양이고, 그 양은 translate 만이 아니라
   **scaleY(스쿼시) × 잉크 높이**가 같이 만든다 — 카드마다 다르다. 그래서 카드별로 잰다.

   재는 것(카드 8장 × 사이클 14위상):
     ① 그려진 잉크 rect(캔버스 픽셀 스캔) — 정지 상태의 자리
     ② 각 위상의 `translate`/`scale` 을 실제 애니에서 읽어 잉크 rect 를 화면 좌표로 옮긴다
        (축은 `--thpiv` = 잉크 발밑. `transform-origin:50% var(--thpiv)`)
     ③ 클립 박스(= `.th` 패딩 박스 = 캔버스 0..H)를 넘는 양 — 위/아래
     ④ 잉크 세로 중심의 위상 평균이 액자 중심에서 얼마나 떨어지는가(비평가 AG #3 의 «계통 오프셋»)
     ⑤ 장축 충전율 = 잉크 장축 / 액자 내부(캔버스 − 림 2×6)

   ⚠ 애니를 «멈추는» 방법은 `animation-play-state` 가 아니라 `getAnimations()` 의 `currentTime` 이다 —
     제품 CSS(`#app.sv`, `#dunw.on`)를 건드리면 프로브가 제품과 다른 상태를 재게 된다(58 «얼리기 두 겹»). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const PHASES = 14;                                   /* 121 프로브와 같은 표본 수 */

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const rows = await p.evaluate((PH) => {
    const RIM = 6, BW = 5;                           /* 104 공용 토큰 — 림 6 · 검정 테두리 5 */
    const out = [];
    const cvs = [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')];
    cvs.forEach((cv, ci) => {
      /* ① 그려진 잉크 rect */
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      const H = cv.height, W = cv.width;
      const piv = parseFloat(getComputedStyle(cv).getPropertyValue('--thpiv')) || H;
      const an = cv.getAnimations().find((a) => (a.animationName || '') === 'thBob');
      const dur = an ? (an.effect.getTiming().duration || 4300) : 4300;
      const keep = an ? an.currentTime : 0, wasP = an ? an.playState : null;
      let tMin = 1e9, tMax = -1e9, bMin = 1e9, bMax = -1e9, cSum = 0, n = 0;
      if (an) an.pause();
      for (let i = 0; i < PH; i++) {
        if (an) { an.currentTime = dur * i / PH; }
        const cs = getComputedStyle(cv);
        const ty = parseFloat((cs.translate || '0px').split(/\s+/)[1] || '0') || 0;
        const sp = (cs.scale || '1').split(/\s+/);
        const sy = parseFloat(sp[1] !== undefined ? sp[1] : sp[0]) || 1;
        /* 축 piv 로 scaleY 후 translate — 잉크 상·하단의 화면(=클립 박스) 좌표 */
        const ty0 = piv + (y0 - piv) * sy + ty;
        const ty1 = piv + (y1 + 1 - piv) * sy + ty;
        if (ty0 < tMin) tMin = ty0; if (ty0 > tMax) tMax = ty0;
        if (ty1 < bMin) bMin = ty1; if (ty1 > bMax) bMax = ty1;
        cSum += (ty0 + ty1) / 2; n++;
      }
      if (an) { an.currentTime = keep; if (wasP === 'running') an.play(); }
      /* 액자 «보이는» 내부 = 캔버스 그 자체다. `.dnc:not(.rd)>.th>canvas` 가 이미 `left/top:--if-rim`
         으로 림 안쪽에 놓여 있어(308 = 330 − 테두리 5×2 − 림 6×2) 여기서 림을 또 빼면 이중 차감이다. */
      const inner = W;
      out.push({
        card: ci + 1, k: cv.dataset.thk, anim: cv.dataset.thi, cv: [W, H], piv: +piv.toFixed(1),
        ink: [x1 - x0 + 1, y1 - y0 + 1], m: [x0, y0, W - 1 - x1, H - 1 - y1],
        long: Math.max(x1 - x0 + 1, y1 - y0 + 1),
        fill: +((Math.max(x1 - x0 + 1, y1 - y0 + 1) / inner) * 100).toFixed(1),
        cutT: +Math.max(0, -tMin).toFixed(1),        /* 천장 절단 */
        cutB: +Math.max(0, bMax - H).toFixed(1),     /* 바닥 절단 */
        headroom: +tMin.toFixed(1),                  /* 사이클 최소 상단 여유(0 이면 딱 닿는다) */
        footroom: +(H - bMax).toFixed(1),
        midAvg: +((cSum / n) - H / 2).toFixed(1),    /* 잉크 세로 중심의 위상 평균 − 액자 중심 */
        midRest: +(((y0 + y1 + 1) / 2) - H / 2).toFixed(1),
      });
    });
    return out;
  }, PHASES);

  const f = (v, w) => String(v).padStart(w);
  console.log('P72FILL — 던전 카드 8장 · 사이클 14위상 (캔버스 픽셀 = CSS px, 1:1)');
  console.log('card  atlas/anim              cv     ink        여백 L,T,R,B      장축 충전%  천장여유 바닥여유  절단T/B  중심(정지→평균)');
  rows.forEach((r) => {
    console.log(
      f(r.card, 3), ' ', (r.k + '/' + r.anim).padEnd(22),
      f(r.cv[0] + 'x' + r.cv[1], 8), f(r.ink[0] + 'x' + r.ink[1], 9),
      f(r.m.join(','), 16), f(r.fill, 9) + '%',
      f(r.headroom, 9), f(r.footroom, 8), f(r.cutT + '/' + r.cutB, 9),
      f(r.midRest, 8), '→', f(r.midAvg, 6));
  });
  const worst = rows.reduce((a, r) => Math.min(a, r.headroom), 1e9);
  console.log('\n요약 — 장축 충전 %s~%s%% · 사이클 최소 천장여유 %spx · 절단 %s장',
    Math.min(...rows.map((r) => r.fill)).toFixed(1), Math.max(...rows.map((r) => r.fill)).toFixed(1),
    worst.toFixed(1), rows.filter((r) => r.cutT > 0.5 || r.cutB > 0.5).length);
  console.log('중심 평균 편차 — %s ~ %s px (음수 = 액자 중심보다 위)',
    Math.min(...rows.map((r) => r.midAvg)).toFixed(1), Math.max(...rows.map((r) => r.midAvg)).toFixed(1));
  await b.close();
})();
