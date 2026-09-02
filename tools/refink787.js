#!/usr/bin/env node
/* 787 — **레퍼런스 원본을 우리 자로 다시 잰다.**
 *
 *   node tools/refink787.js
 *
 * 왜 필요한가 (126 §9-6 계열 함정) — 측정표 20 §7-3 은 행 라벨 잉크를 **h 25–26** 이라 적었고,
 * 같은 화면 6회차의 CSS 주석은 «잉크 총높이 ref **34**» 라고 적었다. 둘 다 «잉크» 라는 한 단어를 쓰지만
 * 앞은 **흰 채움**, 뒤는 **외곽선 포함 총높이**다. 어느 쪽 정의를 쓰느냐로 우리 값의 **부호가 뒤집힌다**:
 *   · 채움 기준이면 우리 28 vs ref 25.5 → **+9.8%**(우리가 크다)
 *   · 총높이 기준이면 우리 33 vs ref 34 → **−2.9%**(우리가 작다)
 * 그래서 «우리 캡처를 잰 자» 로 **레퍼런스 JPG 도 똑같이** 재서 정의를 하나로 만든다.
 * 이 자가 내는 수치가 787 회차의 ② ⑥ 축 기준값이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const REF20 = path.resolve(__dirname, '../docs/ref/20-프로필-팝업-플레이어-스펙-정보.jpg');
const REF19 = path.resolve(__dirname, '../docs/ref/19-프로필-팝업.jpg');

/* 재는 창 — 레퍼런스 좌표계(1080×2340) 그대로. 측정표 20 §7-2 의 행 밴드 경계를 쓴다. */
const WINDOWS = [
  { img: REF20, nm: '20 행1 라벨', x0: 165, x1: 520, y0: 1000, y1: 1060, fill: 'white' },
  { img: REF20, nm: '20 행2 라벨', x0: 165, x1: 520, y0: 1060, y1: 1120, fill: 'white' },
  { img: REF20, nm: '20 행1 값  ', x0: 700, x1: 915, y0: 1000, y1: 1060, fill: 'green' },
  { img: REF20, nm: '20 행2 값  ', x0: 700, x1: 915, y0: 1060, y1: 1120, fill: 'green' },
  { img: REF20, nm: '20 활성 탭 ', x0: 200, x1: 500, y0: 1789, y1: 1856, fill: 'cream' },
];

const mask = (f) => ({
  /* 우리 캡처를 잰 것과 **같은** 문턱이다 — 바꾸면 대조가 깨진다 */
  white: (R, G, B) => Math.min(R, G, B) > 230,   /* 행 줄무늬 #FEEFD2(min 210)·#F6E2C7(min 199) 를 넘겨야 한다 */
  green: (R, G, B) => G > 200 && B < 140 && R < 215,  /* #BAFD60 몸통만 — JPEG 프린징 배제 */
  cream: (R, G, B) => R > 230 && G > 220 && B > 150,   /* 크림흰 #FEF7C1 만 — 금색 배너 #FFC736(B 54) 배제 */
}[f]);

(async () => {
  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
  await page.goto('about:blank');

  const cache = {};
  console.log('레퍼런스 원본을 «우리 자» 로 재측정 (좌표계 = ref 1080×2340)\n');
  for (const w of WINDOWS) {
    if (!cache[w.img]) cache[w.img] = fs.readFileSync(w.img).toString('base64');
    const r = await page.evaluate(async ({ b64, w, fillName }) => {
      const im = new Image();
      im.src = 'data:image/jpeg;base64,' + b64;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height).data;
      const M = {
        white: (R, G, B) => Math.min(R, G, B) > 230,   /* 행 줄무늬 #FEEFD2(min 210)·#F6E2C7(min 199) 를 넘겨야 한다 */
        green: (R, G, B) => G > 200 && B < 140 && R < 215,  /* #BAFD60 몸통만 — JPEG 프린징 배제 */
        cream: (R, G, B) => R > 230 && G > 220 && B > 150,   /* 크림흰 #FEF7C1 만 — 금색 배너 #FFC736(B 54) 배제 */
      }[fillName];
      let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, n = 0;
      for (let y = w.y0; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) {
        const o = (y * im.width + x) * 4;
        if (!M(d[o], d[o + 1], d[o + 2])) continue;
        n++; if (x < lo) lo = x; if (x > hi) hi = x; if (y < top) top = y; if (y > bot) bot = y;
      }
      return n ? { n, x: lo, y: top, w: hi - lo + 1, h: bot - top + 1, imgW: im.width, imgH: im.height } : { n: 0 };
    }, { b64: cache[w.img], w, fillName: w.fill });
    if (!r.n) { console.log(`${w.nm}  — 창 안에 채움 픽셀 0`); continue; }
    console.log(`${w.nm}  채움잉크 ${r.w}×${r.h}  @ref(${r.x},${r.y})  px ${r.n}   [원본 ${r.imgW}×${r.imgH}]`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
