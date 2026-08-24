/* 23 훈련 팝업 캡처 — 1080x1920, 상태: trainStage 1 / atk 98 / hp 0 / regen 0 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'docs/review/23-r4.png';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    const s = {
      gold: 5e12, dia: 300, stage: 1, best: 1,
      trainStage: 1, statStage: 1,
      lv: { atk: 98 },
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    };
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify(s));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { openTrain(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out });

  // 실측: 주요 박스
  const m = await page.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const out = {};
    ['#trw', '.tr-sheet', '.tr-head', '.tr-cream', '.tr-rib', '.tr-bar', '.tr-up', '.tr-qty', '.tr-card', '.tr-sub']
      .forEach(s => out[s] = q(s));
    // 프레임 밖 요소
    const app = document.getElementById('app').getBoundingClientRect();
    let over = 0;
    document.querySelectorAll('#trw *').forEach(e => {
      const b = e.getBoundingClientRect();
      if (b.width && b.height && (b.left < app.left - 1 || b.right > app.right + 1)) over++;
    });
    out._overflow = over;
    return out;
  });
  console.log(JSON.stringify(m, null, 1));
  console.log('CONSOLE_ERRORS:', errs.length, errs.slice(0, 5));
  await browser.close();
})();
