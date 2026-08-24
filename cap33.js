/* 33 재화 정보 팝업 캡처 — 1080x1920.
   진입: 상단 HUD 골드 알약(.cbox.cGold) 클릭 → openCurInfo('gold')
   사용법: node cap33.js [출력경로] [재화키]   (기본 docs/review/33-r1.png / gold) */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'docs/review/33-r1.png';
  const kind = process.argv[3] || 'gold';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 1, best: 1,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  /* 28 교훈 3 — 캔버스의 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  /* 실제 클릭으로 연다 (핸들러까지 같이 검증) */
  const sel = kind === 'gold' ? '.cbox.cGold' : kind === 'dia' ? '.cbox.cDia' : `[data-cur="${kind}"]`;
  await page.$eval(sel, el => el.click()).catch(async () => { await page.evaluate(k => openCurInfo(k), kind); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out });

  const m = await page.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const o = {};
    ['#ciw', '.ci', '.ci-head', '.ci-body', '.ci-ic', '.ci-name', '.ci-have', '.ci-desc', '.ci-ways', '.ci-ok']
      .forEach(s => o[s] = q(s));
    const app = document.getElementById('app').getBoundingClientRect();
    o._app = { x: +app.x.toFixed(1), y: +app.y.toFixed(1), w: +app.width.toFixed(1), h: +app.height.toFixed(1) };
    o._open = !!document.querySelector('#ciw.on');
    return o;
  });
  console.log(JSON.stringify(m, null, 1));
  console.log(errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : '콘솔 에러 0');
  await browser.close();
})();
