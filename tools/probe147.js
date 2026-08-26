/* 147 진단 — 시상대 3칸의 «캐릭터 스프라이트 잉크» 를 DOM 에서 실측한다.

   캔버스 픽셀(alpha>0)의 bbox 를 잡고, 캔버스가 프레임 어디에 놓였는지(getBoundingClientRect)와
   합쳐 **프레임 좌표(1080x2280)** 로 환산한다. scan147.py 가 레퍼런스에서 재는 것과 같은 축이라
   ref 값과 바로 비교할 수 있다. 겸해 «행당 화소 >= TH» 몸통 상단도 같이 잰다(등재가 쓴 기준).

   사용: node tools/probe147.js [TH]   (TH 기본 100)
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TH = +(process.argv[2] || 100);

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  /* getImageData 를 쓰므로 verify80.js 와 같이 --allow-file-access-from-files 로 띄운다. */
  const args = ['--allow-file-access-from-files'];
  let browser;
  try { browser = await chromium.launch({ args }); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch({ ...o, args }); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { S.best = 50; if (typeof openRank === 'function') openRank(); });
  await page.waitForTimeout(900);

  const out = await page.evaluate((TH) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;                       /* 프레임 px → CSS px 배율 */
    const rows = [];
    ['rkCh1', 'rkCh2', 'rkCh3'].forEach((id, i) => {
      const cv = document.getElementById(id);
      if (!cv) { rows.push({ id, err: 'no canvas' }); return; }
      const r = cv.getBoundingClientRect();
      const g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0, bodyTop = -1, bodyBot = -1;
      for (let y = 0; y < cv.height; y++) {
        let cnt = 0;
        for (let x = 0; x < cv.width; x++) {
          if (d[(y * cv.width + x) * 4 + 3] > 8) {
            cnt++; n++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            y1 = y;
          }
        }
        if (cnt >= TH) { if (bodyTop < 0) bodyTop = y; bodyBot = y; }
      }
      /* 캔버스 로컬 px → 프레임 px: 캔버스는 CSS 픽셀과 1:1(width 속성 = CSS width) */
      const fx = (r.left - app.left) / sc, fy = (r.top - app.top) / sc;
      rows.push({
        id, canvas: cv.width + 'x' + cv.height,
        box: [Math.round(fx), Math.round(fy), Math.round(r.width / sc), Math.round(r.height / sc)],
        ink: { x: [Math.round(fx + x0), Math.round(fx + x1)], y: [Math.round(fy + y0), Math.round(fy + y1)],
               w: x1 - x0 + 1, h: y1 - y0 + 1, px: n },
        body: bodyTop < 0 ? null : { top: Math.round(fy + bodyTop), bot: Math.round(fy + bodyBot), h: bodyBot - bodyTop + 1 },
      });
    });
    const src = document.documentElement.innerHTML;
    const m = /scale: i === 0 \? (\d+) : (\d+)/.exec(src);
    return { rows, drawScale: m ? [ +m[1], +m[2] ] : null, appW: app.width, sc };
  }, TH);

  console.log('draw scale (1위 / 2·3위):', out.drawScale ? out.drawScale.join(' / ') : '?');
  console.log('행당 화소 >= ' + TH + ' 를 «몸통» 으로 (프레임 좌표 1080x2280)');
  for (const r of out.rows) {
    if (r.err) { console.log(r.id, r.err); continue; }
    console.log(`${r.id}  캔버스 ${r.canvas}  box(${r.box.join(',')})`);
    console.log(`   잉크 x ${r.ink.x[0]}..${r.ink.x[1]} (w${r.ink.w})  y ${r.ink.y[0]}..${r.ink.y[1]} (h${r.ink.h})  ${r.ink.px}px`);
    console.log(`   몸통 y ${r.body ? r.body.top + '..' + r.body.bot + ' (h' + r.body.h + ')' : '—'}`);
  }
  console.log('콘솔 에러', errs.length, errs.slice(0, 3));
  await browser.close();
})();
