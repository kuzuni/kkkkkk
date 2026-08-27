/* box52.js — 52 메뉴 세로 아이콘 열의 «칸별 아이콘·라벨 잉크 bbox» 실측.
   칸 판은 반투명 검정이라 배경이 비친다 → 판 색 기준 임계값은 못 쓴다.
   대신 **흰 잉크(min(rgb) > TH)** 만 센다. 아이콘 코어도 라벨도 흰색이라 같은 마스크로 잡힌다.
   아이콘/라벨은 두 덩어리 사이의 «빈 행» 으로 가른다.
   아트 자리 규칙(지시서 [3] 4번) — 여기 나온 w×h·중심이 나중에 이미지로 교체될 bbox 다.
   사용: node tools/box52.js [img] [x0 x1 top pitch h n th] */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const IMG = process.argv[2] || 'docs/ref/52-메뉴-버튼-클릭시.jpg';
const IMGMIME = /\.png$/i.test(IMG) ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
const X0 = +(process.argv[3] || 785), X1 = +(process.argv[4] || 875);
const TOP = +(process.argv[5] || 244), PITCH = +(process.argv[6] || 110);
const BH = +(process.argv[7] || 80), N = +(process.argv[8] || 8);
const TH = +(process.argv[9] || 150);
/* MODE — white: 흰 잉크만(min(rgb)>TH). 라벨·레퍼런스의 흰 아이콘용.
          lum  : 칸 판보다 «밝은» 픽셀(lum − 판base > TH). 우리 캡처의 **컬러 이모지**는 흰 마스크로는
                 안 잡힌다(🎒 는 0픽셀, 🏆 는 9×24 로 읽힌다) → 아이콘은 이쪽으로 잰다.
   ref/cap 을 같은 코드로 재는 원칙(LESSONS 21 환경 메모)은 유지되고, 마스크만 «흰색» → «판보다 밝음» 으로 넓힌 것이다. */
const MODE = (process.argv[10] || 'white');

(async () => {
  const b64 = fs.readFileSync(path.resolve(IMG)).toString('base64');
  const browser = await launch(chromium);
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const out = await page.evaluate(async ([b64, X0, X1, TOP, PITCH, BH, N, TH, MIME, MODE]) => {
    const img = new Image(); img.src = MIME + b64; await img.decode();
    const c = document.getElementById('c');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = c.width, D = ctx.getImageData(0, 0, c.width, c.height).data;
    const P = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const lum = p => p[0] * .299 + p[1] * .587 + p[2] * .114;
    /* 판 base — 칸 네 모서리 안쪽 6px 의 평균. 라운드 코너 AA 를 피하려고 안쪽으로 물린다. */
    let BASE = 0;
    const ink = p => MODE === 'lum' ? (lum(p) - BASE > TH) : (Math.min(p[0], p[1], p[2]) > TH);
    const bbox = (y0, y1) => {
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1, n = 0;
      for (let y = y0; y <= y1; y++) for (let x = X0; x <= X1; x++)
        if (ink(P(x, y))) { n++; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      return n ? { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1, cx: +((bx0 + bx1) / 2).toFixed(1), cy: +((by0 + by1) / 2).toFixed(1), n } : null;
    };
    const res = [];
    for (let k = 0; k < N; k++) {
      const y0 = TOP + k * PITCH, y1 = y0 + BH - 1;
      if (MODE === 'lum') {
        const c4 = [P(X0 + 8, y0 + 8), P(X1 - 8, y0 + 8), P(X0 + 8, y1 - 8), P(X1 - 8, y1 - 8)];
        BASE = c4.reduce((a, p) => a + lum(p), 0) / 4;
      }
      /* 행 프로파일 → 아이콘·라벨을 가르는 «가장 빈 행» 을 칸 중하단(45~70%)에서 찾는다 */
      const prof = [];
      for (let y = y0; y <= y1 + 8; y++) {
        let n = 0; for (let x = X0; x <= X1; x++) if (ink(P(x, y))) n++;
        prof.push(n);
      }
      let split = -1, best = 1e9;
      for (let i = Math.round(BH * 0.45); i <= Math.round(BH * 0.80); i++)
        if (prof[i] < best) { best = prof[i]; split = i; }
      const sy = y0 + split;
      res.push({ k: k + 1, y0, y1, sy, gap: best, icon: bbox(y0, sy - 1), label: bbox(sy, y1 + 8), prof });
    }
    return res;
  }, [b64, X0, X1, TOP, PITCH, BH, N, TH, IMGMIME, MODE]);
  await browser.close();
  const f = b => b ? `x${b.x} y${b.y} ${b.w}x${b.h} 중심(${b.cx},${b.cy}) px${b.n}` : '없음';
  console.log(`BOX52 ${IMG}  칸 x${X0}..${X1}(w${X1 - X0 + 1})  top${TOP} pitch${PITCH} h${BH} n${N} th${TH}`);
  for (const r of out) {
    console.log(`#${r.k} 판 y${r.y0}..${r.y1}   가름행 y${r.sy}(잉크${r.gap})`);
    console.log(`     아이콘 ${f(r.icon)}`);
    console.log(`     라벨   ${f(r.label)}`);
  }
})();
