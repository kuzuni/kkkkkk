/* 21 도감 보너스 팝업 캡처 — 1080x2280 (2026-08-25 기준 해상도).
   레퍼런스(docs/ref/21-도감-보너스-팝업.jpg)와 «같은 상태»를 만든다(04 교훈 1):
   방어구 탭 · 블록1 Lv.5/6+6/6 · 블록2 3/4 · 블록3 1/2 · 스킬 탭 레드닷.
   사용법: node cap21.js [출력경로]   (기본 docs/review/21-r1.png) */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'docs/review/21-r1.png';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 37, best: 37,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 },
      /* 레퍼런스 라벨 재현 — 5/6 · 6/6 · 3/4 · 3/4 · 1/2 · 1/2 */
      own: { shield0:{n:1,l:5}, amulet0:{n:1,l:6}, shield1:{n:1,l:3}, amulet1:{n:1,l:3},
             shield2:{n:1,l:1}, amulet2:{n:1,l:1}, shield3:{n:1,l:2}, shield4:{n:1,l:1},
             shield5:{n:1,l:1}, amulet3:{n:1,l:1}, amulet4:{n:1,l:1},
             slash:{n:1,l:4}, shuri:{n:1,l:3} }
    }));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  /* 28 교훈 3 — 캔버스의 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.evaluate(() => openColl21('armor'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: out });

  /* DOM 실측 — 프레임(#app) 좌표계 px */
  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +((b.x - app.x) / sc).toFixed(1), y: +((b.y - app.y) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const blocks = [...document.querySelectorAll('.clb')].map(b => ({
      panel: r(b.querySelector('.clb-panel')), head: r(b.querySelector('.clb-head')),
      bdg: r(b.querySelector('.clb-bdg')), nm: r(b.querySelector('.clb-nm')),
      cards: [...b.querySelectorAll('.cd')].map(r),
      eff: r(b.querySelector('.clb-eff')), btn: r(b.querySelector('.clb-btn'))
    }));
    return {
      frameH: +(app.height / sc).toFixed(1),
      cl: q('.cl'), band: q('.cl-band'), rib: q('.cl-rib'), ribBody: q('.cl-rib>s.bd'),
      srch: q('.cl-srch'), body: q('.cl-body'),
      tabs: [...document.querySelectorAll('.cltab')].map(t => ({
        id: t.dataset.ct, on: t.classList.contains('on'), box: r(t),
        y: r(t.querySelector('s.y')), b: r(t.querySelector('s.b')), lb: r(t.querySelector('i'))
      })),
      blocks
    };
  });
  console.log(JSON.stringify(m, null, 1));
  console.log('CONSOLE ERRORS:', errs.length, errs.slice(0, 5).join(' | '));
  await browser.close();
})();
