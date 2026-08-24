/* 23 훈련 팝업 — 픽셀 프로브 (이 환경에 PIL 이 없어 playwright 캔버스 getImageData 로 대체)
   사용: node probe23.js <이미지파일> '<JSON opts>'
     opts.job = ribprofile | colscan | rowscan | bbox
   좌표는 이미지 원본 px. ref(1080x2340) 와 캡처(1080x1920) 를 같은 스크립트로 잰다. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const file = process.argv[2];
const opts = JSON.parse(process.argv[3] || '{}');
/* about:blank 페이지에서 file:// 이미지는 디코딩이 막힌다 → data: URI 로 넣는다 */
const mime = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
const dataUri = 'data:' + mime + ';base64,' + fs.readFileSync(path.resolve(file)).toString('base64');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const res = await page.evaluate(async ([src, o]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.getElementById('c');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
    const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const out = { W, H, job: o.job };

    const masks = {
      /* 리본: 다크 테두리(76,49,31) + 본체(107,74,52). 크림 배경은 max>=200 이라 170 으로 분리된다 */
      rib:    (r, g2, b) => Math.max(r, g2, b) < 170,
      dark:   (r, g2, b) => Math.max(r, g2, b) < 95,
      white:  (r, g2, b) => Math.min(r, g2, b) >= 225,
      green:  (r, g2, b) => g2 > 150 && g2 - r > 25 && g2 - b > 60,
      orange: (r, g2, b) => r > 185 && r - b > 60 && g2 > 70 && g2 < 195,
      yellow: (r, g2, b) => r > 195 && g2 > 185 && b < 165,
      /* 코인 이모지/아트: 노랑~주황 계열 채도 있는 밝은 픽셀 */
      coin:   (r, g2, b) => r > 150 && g2 > 110 && b < 150 && r - b > 55,
      silver: (r, g2, b) => Math.abs(r - g2) < 18 && Math.abs(g2 - b) < 18 && r > 120 && r < 235,
      /* 가격줄 밴드 배경(191,161,133 / 170,127,84)과 «다른» 픽셀 = 콘텐츠(코인+숫자+외곽선) */
      notband: (r, g2, b) => !(Math.abs(r - 191) < 20 && Math.abs(g2 - 161) < 20 && Math.abs(b - 133) < 22)
                          && !(Math.abs(r - 170) < 20 && Math.abs(g2 - 127) < 20 && Math.abs(b - 84) < 22),
      /* 크림 카드 배경(255,253,246 / 237,218,188 등)과 다른 픽셀 */
      /* 헤더 밴드(243,204,137)·크림 위의 «순백 잉크» — 파랑 채널로 분리 */
      /* 서브탭 바(어두운 갈색 max<=115) 위의 밝은 잉크 */
      lit:    (r, g2, b) => Math.max(r, g2, b) > 150,
      pure:   (r, g2, b) => Math.min(r, g2) >= 232 && b >= 215,
      notcream: (r, g2, b) => Math.max(r, g2, b) < 232 || (r - b) > 42
    };
    const test = masks[o.mask || 'rib'];

    if (o.job === 'ribprofile') {
      const rows = [];
      for (let y = o.y0; y <= o.y1; y++) {
        const segs = []; let s = -1;
        for (let x = o.xa; x <= o.xb; x++) {
          const on = test(...px(x, y));
          if (on && s < 0) s = x;
          if (!on && s >= 0) { segs.push([s, x - 1]); s = -1; }
        }
        if (s >= 0) segs.push([s, o.xb]);
        rows.push({ y, segs });
      }
      out.rows = rows;
    }
    if (o.job === 'colscan') {
      const list = [];
      for (let y = o.y0; y <= o.y1; y++) list.push(y + ':' + px(o.x, y).join(','));
      out.col = list;
    }
    if (o.job === 'rowscan') {
      const list = [];
      for (let x = o.x0; x <= o.x1; x++) list.push(x + ':' + px(x, o.y).join(','));
      out.row = list;
    }
    if (o.job === 'bbox') {
      let mx = 1e9, MX = -1, my = 1e9, MY = -1, n = 0;
      for (let y = o.y0; y <= o.y1; y++) for (let x = o.x0; x <= o.x1; x++) {
        if (test(...px(x, y))) { n++; if (x < mx) mx = x; if (x > MX) MX = x; if (y < my) my = y; if (y > MY) MY = y; }
      }
      out.bbox = { x: mx, X: MX, y: my, Y: MY, w: MX - mx + 1, h: MY - my + 1, n };
    }
    if (o.job === 'colprofile') {
      /* 열별 상하 경계 — 세로 프로파일 */
      const cols = [];
      for (let x = o.x0; x <= o.x1; x++) {
        let a = -1, b2 = -1, n = 0;
        for (let y = o.y0; y <= o.y1; y++) {
          if (test(...px(x, y))) { if (a < 0) a = y; b2 = y; n++; }
        }
        cols.push({ x, a, b: b2, n });
      }
      out.cols = cols;
    }
    return out;
  }, [dataUri, opts]);
  console.log(JSON.stringify(res));
  await browser.close();
})();
