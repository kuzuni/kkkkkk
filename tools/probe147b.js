/* 147 진단 ② — 정수 배율별 스프라이트 잉크 실측표.
   drawHeroTo 를 배율 3~9 로 임시 캔버스에 그려 «잉크 bbox» 와 «몸통(행당 화소 >= TH) 상단» 을 잰다.
   몸통 임계는 «절대 화소 수» 라 배율에 따라 비선형이다 — 외삽하지 말고 이 표를 봐야 하는 이유다.
   발밑은 캔버스 바닥이므로, 단상 윗면 y 를 주면 프레임 좌표 상단이 바로 나온다.

   사용: node tools/probe147b.js [TH]   (TH 기본 100)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const TH = +(process.argv[2] || 100);

(async () => {
  const args = ['--allow-file-access-from-files'];
  let browser;
  try { browser = await launch(chromium, { args }); }
  catch (e) { browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium', args }); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const rows = await page.evaluate((TH) => {
    const out = [];
    const frames = ATLAS.knight.a.idle;
    for (let sc = 3; sc <= 9; sc++) {
      /* 여유 있게 잡은 임시 캔버스 — 잉크가 잘리지 않게 논리 프레임 전체(79x63)를 담는다 */
      const cv = document.createElement('canvas');
      cv.width = 79 * sc; cv.height = 63 * sc;
      let w = 0, h = 0, body = 0, half = 0;
      for (const fk of frames) {
        drawHeroTo(cv, { avatar: 'av0', frame: fk, scale: sc });
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, bt = -1;
        for (let y = 0; y < cv.height; y++) {
          let cnt = 0;
          for (let x = 0; x < cv.width; x++) {
            if (d[(y * cv.width + x) * 4 + 3] > 8) {
              cnt++;
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              y1 = y;
            }
          }
          if (cnt >= TH && bt < 0) bt = y;
        }
        w = Math.max(w, x1 - x0 + 1);
        h = Math.max(h, y1 - y0 + 1);          /* 발밑 = 캔버스 바닥이므로 h = 바닥에서 잰 높이 */
        if (bt >= 0) body = Math.max(body, cv.height - bt);
        half = Math.max(half, Math.max(cv.width / 2 - x0, x1 + 1 - cv.width / 2));
      }
      out.push({ sc, w, h, body, half: Math.ceil(half) });
    }
    return out;
  }, TH);

  console.log(`idle 6프레임 최대값 · 몸통 임계 = 행당 ${TH}화소`);
  console.log('배율 | 잉크 폭 | 잉크 높이 | 몸통 높이 | 중심에서 최대 반폭 | 2위 상단(482-) | 3위 상단(492-) | 1위 상단(448-)');
  for (const r of rows) {
    console.log(` sc${r.sc} | ${String(r.w).padStart(6)} | ${String(r.h).padStart(8)} | ${String(r.body).padStart(8)}`
      + ` | ${String(r.half).padStart(16)} | 잉크 ${482 - r.h} 몸통 ${482 - r.body}`
      + ` | 잉크 ${492 - r.h} 몸통 ${492 - r.body} | 잉크 ${448 - r.h} 몸통 ${448 - r.body}`);
  }
  await browser.close();
})();
