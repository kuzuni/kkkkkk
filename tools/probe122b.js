/* 작업 122 — «소환 본문» 측정점 재정의용 기하 진단 (13회차 신설).

   §17-6 의 과제: `verify122.js` §13 의 세 점(`소환 본문` · `본문3` · `본문4`)이
   **본문 그라디언트가 아니라 그 위를 덮은 불투명 판**을 «가장 넓은 평탄면» 으로 뽑고 있었다.
   클립이 `.cbg`(카드 본문 배경 레이어) **전체**인데, 그 위에는 형제 노드
   `.chd`(헤더) · `.cart`(상자 아이콘) · `.clv` · `.cbar` · `.cbtn×3` · `.adbadge` · `.cmag`
   가 얹혀 있어 클립 면적의 상당 부분이 «띠가 안 보이는 자리» 다.

   → 여기서는 **띠가 실제로 보이는 자리**(= `.cbg` 안에서 형제 노드에 안 덮인 구역)의
     최대 직사각형을 카드마다 풀어서, 그 좌표를 verify122 의 새 클립으로 쓸 수 있게 찍는다.
     «덮개를 opacity:0 으로 걷어서 재는» 방법은 쓰지 않는다 —
     플레이어에게 안 보이는 띠를 통과시키는 **가짜 초록불**이 되기 때문이다.

   재는 것:
     ① 카드별 `.cbg` rect 와 형제 덮개들의 rect
     ② 4px 격자 커버리지 마스크 → 최대 빈 직사각형(면적 기준) 1·2·3위
     ③ 그 직사각형이 `.cbg` 기준 몇 %(면적)이고 inset 으로 표현하면 얼마인가
     ④ 다섯 칸 **전부에서 노출된 공통 구역**(교집합, `.cbg` 상대 좌표) — 이게 있으면
        카드마다 다른 inset 을 주지 않고 한 규칙으로 잴 수 있다

   실행: node tools/probe122b.js
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* `.cbg` 를 덮는 형제들. `.cfr` 은 테두리 프레임(가운데가 비어 있다)이라 뺀다 —
   대신 프레임 두께만큼 가장자리를 피하도록 아래에서 EDGE 만큼 물린다. */
const COVERS = '.chd,.cart,.cmag,.clv,.cbar,.cbtn,.adbadge,.clk';
const G = 4;      /* 격자 */
const EDGE = 10;  /* `.cfr` 테두리·라운드 코너를 피하는 안쪽 여백 */

/* 히스토그램 최대 직사각형 — 한 행의 «위로 연속한 빈 칸 수» 배열에서 최대 넓이 직사각형 */
function largestInRow(hist) {
  const st = [];
  let best = { area: 0 };
  for (let i = 0; i <= hist.length; i++) {
    const h = i === hist.length ? 0 : hist[i];
    while (st.length && hist[st[st.length - 1]] >= h) {
      const top = st.pop();
      const left = st.length ? st[st.length - 1] + 1 : 0;
      const area = hist[top] * (i - left);
      if (area > best.area) best = { area, h: hist[top], x0: left, x1: i - 1 };
    }
    st.push(i);
  }
  return best;
}

/* 마스크(true = 덮임)에서 최대 빈 직사각형 N 개를 «찾고 지우고» 반복해 뽑는다 */
function topRects(mask, W, H, n) {
  const m = mask.map(r => r.slice());
  const out = [];
  for (let k = 0; k < n; k++) {
    const hist = new Array(W).fill(0);
    let best = { area: 0 };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) hist[x] = m[y][x] ? 0 : hist[x] + 1;
      const b = largestInRow(hist);
      if (b.area > best.area) best = { area: b.area, x0: b.x0, x1: b.x1, y0: y - b.h + 1, y1: y };
    }
    if (!best.area) break;
    out.push(best);
    for (let y = best.y0; y <= best.y1; y++) for (let x = best.x0; x <= best.x1; x++) m[y][x] = true;
  }
  return out;
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);

  const data = await p.evaluate(sel => {
    const out = [];
    document.querySelectorAll('#shopList .shp-card').forEach((card, i) => {
      const bg = card.querySelector(':scope>.cbg');
      if (!bg) return;
      const R = bg.getBoundingClientRect();
      const cov = [];
      card.querySelectorAll(':scope>' + sel.split(',').join(',:scope>')).forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) cov.push({ cls: e.className, x: r.x - R.x, y: r.y - R.y, w: r.width, h: r.height });
      });
      out.push({ i, bg: { x: R.x, y: R.y, w: R.width, h: R.height }, cov });
    });
    return out;
  }, COVERS);

  const commons = [];
  for (const c of data) {
    const W = Math.floor(c.bg.w / G), H = Math.floor(c.bg.h / G);
    const mask = Array.from({ length: H }, () => new Array(W).fill(false));
    /* 가장자리(프레임·라운드) */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x * G < EDGE || y * G < EDGE || (x + 1) * G > c.bg.w - EDGE || (y + 1) * G > c.bg.h - EDGE) mask[y][x] = true;
    }
    for (const r of c.cov) {
      const x0 = Math.max(0, Math.floor(r.x / G)), x1 = Math.min(W - 1, Math.ceil((r.x + r.w) / G));
      const y0 = Math.max(0, Math.floor(r.y / G)), y1 = Math.min(H - 1, Math.ceil((r.y + r.h) / G));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y][x] = true;
    }
    commons.push(mask.map(r => r.slice()));
    const rects = topRects(mask, W, H, 3);
    const free = mask.flat().filter(v => !v).length;
    console.log('\n카드 ' + (c.i + 1) + '  .cbg ' + Math.round(c.bg.w) + '×' + Math.round(c.bg.h)
      + '  @(' + Math.round(c.bg.x) + ',' + Math.round(c.bg.y) + ')'
      + '  · 덮개 ' + c.cov.length + '개 · 노출 ' + (100 * free / (W * H)).toFixed(1) + '%');
    rects.forEach((r, k) => {
      const x = r.x0 * G, y = r.y0 * G, w = (r.x1 - r.x0 + 1) * G, h = (r.y1 - r.y0 + 1) * G;
      console.log('   최대빈칸 ' + (k + 1) + ': ' + w + '×' + h + ' @(' + x + ',' + y + ')'
        + '  = .cbg 면적의 ' + (100 * w * h / (c.bg.w * c.bg.h)).toFixed(1) + '%');
    });
  }

  /* 다섯 칸 공통 노출 구역 — 가장 작은 격자에 맞춰 OR 로 합친다 */
  const W = Math.min(...commons.map(m => m[0].length)), H = Math.min(...commons.map(m => m.length));
  const uni = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => commons.some(m => m[y][x])));
  const cr = topRects(uni, W, H, 3);
  console.log('\n=== 다섯 칸 공통 노출 구역 (.cbg 상대, 격자 ' + W + '×' + H + ') ===');
  cr.forEach((r, k) => {
    const x = r.x0 * G, y = r.y0 * G, w = (r.x1 - r.x0 + 1) * G, h = (r.y1 - r.y0 + 1) * G;
    console.log('   ' + (k + 1) + ': ' + w + '×' + h + ' @(' + x + ',' + y + ')');
  });

  await b.close();
})();
