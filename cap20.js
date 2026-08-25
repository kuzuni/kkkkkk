/* 20 프로필 팝업 — 플레이어 스펙 정보(종합 스탯 탭) 캡처 — 1080x2280 (2026-08-25 기준 해상도).
   진입: 상단 HUD 초상화(#profBtn) 클릭 → 19 #pfw → 하단 토글 «종합 스탯»(.pf-tgl>.lb) 클릭 → #specw
   사용법: node cap20.js [출력경로]   (기본 docs/review/20-r5.png) */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'docs/review/20-r5.png';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 12, best: 12,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  /* 28 교훈 3 — 캔버스의 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  /* 실제 클릭 경로로 연다 (핸들러까지 같이 검증) */
  await page.click('#profBtn');
  await page.waitForTimeout(400);
  await page.click('.pf-tgl>.lb');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out });

  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(1), y: +(b.y - app.y).toFixed(1),
               w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const o = {};
    ['.spc', '.spc-body', '.spc-gid', '.spc-ava', '.spc-rib', '.spc-nick', '.spc-edit',
     '.spc-list', '.spc-tabs', '.spc-tab-on', '.spc-tab-off'].forEach(s => o[s] = q(s));
    const rows = [...document.querySelectorAll('.spc-row')].slice(0, 14).map(r);
    o._rows = rows.map(v => v && (v.y + '/' + v.h));
    o._rowCount = document.querySelectorAll('.spc-row').length;
    o._app = { x: +app.x.toFixed(1), y: +app.y.toFixed(1), w: +app.width.toFixed(1), h: +app.height.toFixed(1) };
    o._open = !!document.querySelector('#specw.on');
    o._pfwOpen = !!document.querySelector('#pfw.on');
    return o;
  });
  console.log(JSON.stringify(m, null, 1));
  console.log(errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : '콘솔 에러 0');
  await browser.close();
})();
