/* 작업 122 · 23회차 프로브 — **판정 없는 측정 전용**.
   23회차 채점 2인 일치(AW ① · AX ②): 다이아 카드의 「마일리지 +N」 뱃지 알약이 아이콘 뒤로 내려가
   라벨이 「리지 +1」 로만 읽힌다. 알약의 **보이는 폭**을 재서 회귀와 회수를 같은 자로 확인한다.

   재는 법: 알약 자리(`.cn-cd>.cp` 의 rect)를 클립으로 찍고, **마젠타 면**(R−G ≥ 60 이고 B−G ≥ 40)
   화소가 있는 열의 좌·우 끝으로 «보이는 폭» 을 잡는다. 알약 면은 #F6A3FF→#A521C9 그라디언트라
   아이콘(회색·하양 다이아)·크림 판과 색으로 갈린다.
   ⚠ `--jz-amp:0` 으로 얼린다 — 둥실(±3px)·뱃지 흔들림(±4°)이 절단선을 7~8px 움직인다(AX 실측).

   실행: node tools/probe122cp.js */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(200);
  /* 27-1 처방 — clip 을 잡기 «전에» 애니메이션을 걷는다 */
  await seek(p, 0);
  await p.evaluate(() => {
    const cp = document.querySelector('#shopList .cn-cd .cp');
    if (cp) cp.scrollIntoView({ block: 'center' });
    document.getElementById('shopw').style.setProperty('--jz-amp', '0');
  });
  await p.waitForTimeout(150);
  await seek(p, 0);

  const spots = await p.evaluate(() => [...document.querySelectorAll('#shopList .cn-cd>.cp')].map(e => {
    const r = e.getBoundingClientRect();
    return { css: Math.round(r.width),
             x: Math.round(r.x) - 6, y: Math.round(r.y) - 6,
             width: Math.round(r.width) + 12, height: Math.round(r.height) + 12,
             ok: r.y > 0 && r.y + r.height < 2280 };
  }).filter(c => c.ok));

  console.log('작업 122 · 23회차 프로브 — 「마일리지 +N」 뱃지 알약의 «보이는 폭»');
  console.log('(--jz-amp:0 으로 얼림 · CSS 규격 폭 120px)\n');
  if (!spots.length) { console.log('  뱃지가 화면 안에 없다'); await b.close(); return; }

  for (const [i, c] of spots.entries()) {
    const b64 = (await p.screenshot({ clip: { x: c.x, y: c.y, width: c.width, height: c.height } })).toString('base64');
    const r = await p.evaluate(async src => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, x0 = 1e9, x1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const j = (y * cv.width + x) * 4, R = d[j], G = d[j + 1], B = d[j + 2];
        if (R - G >= 60 && B - G >= 40) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      }
      return { n, w: x1 >= 0 ? x1 - x0 + 1 : 0 };
    }, b64);
    console.log('  · 뱃지 ' + (i + 1) + '  보이는 폭 ' + String(r.w).padStart(4) + 'px / CSS ' + c.css
      + 'px (' + Math.round(r.w / c.css * 100) + '%)  · 마젠타 화소 ' + r.n);
  }
  await b.close();
})();
