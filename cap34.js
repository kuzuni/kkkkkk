/* 34 축복(버프) 팝업 캡처 — 1080x2280 (2026-08-25 기준 화면비 9:19).
   진입: 좌측 사이드 «축복» 아이콘(.ibtn[data-pop="bless"]) 실클릭.
   사용법: node cap34.js [출력경로]        (기본 docs/review/34-r1.png)
   좌표 덤프는 «프레임 좌표»(#app 기준, 스케일 1) 로 찍어 측정표(ref y − 84)와 바로 대조할 수 있게 한다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'docs/review/34-r1.png';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 80, best: 80,
      buyQty: 1, autoBuy: false,
      /* 레퍼런스와 같은 상태로 맞춘다: 축복 3종 전부 활성(≈1분 22초 남음) · Lv.1 · 진행 3/4 */
      bless: { lv: 1, prog: 3, exp: { atk: Date.now() + 82000, hp: Date.now() + 83000, rate: Date.now() + 84000 } },
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  /* 28 교훈 3 — 캔버스의 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.click('.side .ibtn[data-pop="bless"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out });

  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080 || 1;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +((b.x - app.x) / sc).toFixed(1), y: +((b.y - app.y) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const o = {};
    ['#blsw', '.bls', '.bls-head', '.bls-body', '.bls-rib', '.bls-note', '.bls-lv', '.bls-bar',
     '.bls-cards', '#blsC_atk', '#blsC_hp', '#blsC_rate', '#blsC_atk .h', '#blsC_atk .ic',
     '#blsC_atk .vl', '#blsC_atk .tm', '.bls-btab', '.bls-bn', '.bls-ft',
     '.bls-promo', '.bls-promo .gb', '.bls-x'].forEach(s => o[s] = q(s));
    o._app = { w: +app.width.toFixed(1), h: +(app.height / sc).toFixed(1) };
    o._open = !!document.querySelector('#blsw.on');
    o._txt = { lv: (document.getElementById('blsLv') || {}).textContent,
               prog: (document.getElementById('blsProg') || {}).textContent,
               tm: (document.querySelector('#blsC_atk .tm>i') || {}).textContent };
    return o;
  });
  console.log(JSON.stringify(m, null, 1));
  console.log(errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : '콘솔 에러 0');
  await browser.close();
})();
