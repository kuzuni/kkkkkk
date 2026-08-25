/* 21 픽셀 스캐너 — 이 컨테이너엔 PIL 도 png 디코더도 없어서 «크로미움 캔버스» 를 스캐너로 쓴다.
   (--allow-file-access-from-files 로 file:// 이미지를 캔버스에 올려 getImageData 를 읽는다)
   사용법: node scan21.js <이미지> <x0> <y0> <x1> <y1> <모드> [인자...]
     모드 ink   <r> <g> <b> <tol>   — 그 색에 가까운 픽셀의 bbox·개수
     모드 light <thr>               — 밝기 ≥ thr 인 픽셀의 bbox (흰 잉크)
     모드 dark  <thr>               — 밝기 ≤ thr 인 픽셀의 bbox (검정 외곽선)
     모드 rows  <thr>               — 행별 밝은 픽셀 수 (프로파일)
     모드 px                        — 영역 평균색 + 대표 픽셀
   좌표는 이미지 원본 픽셀. 레퍼런스(1080x2340)와 캡처(1080x2280)는 «캡처 y = ref y − 84». */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [img, x0, y0, x1, y1, mode, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('index.html'));
  const out = await page.evaluate(async ([src, X0, Y0, X1, Y1, M, R]) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(im, 0, 0);
    const w = X1 - X0, h = Y1 - Y0;
    const d = cx.getImageData(X0, Y0, w, h).data;
    const at = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const lum = p => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
    let hit;
    if (M === 'ink') { const [r, g, b, t] = R.map(Number);
      hit = p => Math.abs(p[0] - r) <= t && Math.abs(p[1] - g) <= t && Math.abs(p[2] - b) <= t; }
    else if (M === 'light') { const t = Number(R[0]); hit = p => lum(p) >= t; }
    else if (M === 'dark') { const t = Number(R[0]); hit = p => lum(p) <= t; }
    if (M === 'px') {
      let s = [0, 0, 0], n = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = at(x, y); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; }
      return { n, mean: s.map(v => Math.round(v / n)), corner: at(0, 0), center: at(w >> 1, h >> 1),
        imgSize: [im.naturalWidth, im.naturalHeight] };
    }
    if (M === 'rows') { const t = Number(R[0]); const rows = [];
      for (let y = 0; y < h; y++) { let c = 0; for (let x = 0; x < w; x++) if (lum(at(x, y)) >= t) c++; rows.push(c); }
      return { y0: Y0, rows, imgSize: [im.naturalWidth, im.naturalHeight] }; }
    if (M === 'cols') { const t = Number(R[0]); const cols = [];
      for (let x = 0; x < w; x++) { let c = 0; for (let y = 0; y < h; y++) if (lum(at(x, y)) >= t) c++; cols.push(c); }
      return { x0: X0, cols, imgSize: [im.naturalWidth, im.naturalHeight] }; }
    /* strip — 1행(h==1) 또는 1열(w==1) 의 RGB 를 그대로 덤프한다(단면 스캔용) */
    if (M === 'strip') { const s = [];
      if (h === 1) { for (let x = 0; x < w; x++) s.push([X0 + x, ...at(x, 0)]); }
      else { for (let y = 0; y < h; y++) s.push([Y0 + y, ...at(0, y)]); }
      return { strip: s, imgSize: [im.naturalWidth, im.naturalHeight] }; }
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (hit(at(x, y))) { n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    return n ? { n, x: X0 + minx, y: Y0 + miny, x2: X0 + maxx, y2: Y0 + maxy,
                 w: maxx - minx + 1, h: maxy - miny + 1, cx: X0 + (minx + maxx) / 2, cy: Y0 + (miny + maxy) / 2,
                 imgSize: [im.naturalWidth, im.naturalHeight] }
              : { n: 0, imgSize: [im.naturalWidth, im.naturalHeight] };
  }, ['file://' + path.resolve(img), +x0, +y0, +x1, +y1, mode, rest]);
  console.log(JSON.stringify(out));
  await browser.close();
})();
