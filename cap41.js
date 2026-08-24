/* 41 — 03/14 팝업 내장 재화 바 캡처 + DOM 실측.
   node cap41.js [dun|rel]   → docs/review/41-r{N}-{dun|rel}.png + 좌표 JSON 출력 */
const { chromium } = require('playwright');
const path = require('path');

const which = process.argv[2] || 'dun';
const tag = process.argv[3] || 'r1';
/* 레퍼런스와 같은 문자열로 맞춰야 폭 비교가 유효하다 (04 교훈 1) */
const REF_TXT = process.argv[4] === 'live' ? null : { g: '40.77A', d: '1,300' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);

  await page.evaluate((w) => {
    if (w === 'rel') openRelicPage(); else openDungeon();
  }, which);
  await page.waitForTimeout(600);

  if (REF_TXT) {
    await page.evaluate((t) => {
      document.querySelectorAll('.pcb-g>b').forEach((e) => { e.textContent = t.g; });
      document.querySelectorAll('.pcb-d>b').forEach((e) => { e.textContent = t.d; });
    }, REF_TXT);
  }
  /* 28 교훈 3 — 캔버스 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.waitForTimeout(120);

  const geo = await page.evaluate((w) => {
    const root = document.getElementById(w === 'rel' ? 'relicw' : 'dunw');
    const app = document.getElementById('app');
    const A = app.getBoundingClientRect();
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const bar = root.querySelector('.pcb');
    const g = root.querySelector('.pcb-g'), d = root.querySelector('.pcb-d');
    return {
      app: { w: A.width, h: A.height },
      bar: R(bar), gold: R(g), dia: R(d),
      goldIcon: R(g.querySelector('i')), diaIcon: R(d.querySelector('i')),
      goldNum: R(g.querySelector('b')), diaNum: R(d.querySelector('b')),
      goldTxt: g.querySelector('b').textContent, diaTxt: d.querySelector('b').textContent,
      hudCovered: (() => { const t = document.getElementById('top').getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        return b.top <= t.top + 0.5 && b.bottom >= t.bottom - 0.5; })(),
    };
  }, which);

  const out = path.join('docs/review', `41-${tag}-${which}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 2280 } });
  console.log(JSON.stringify(geo, null, 1));
  console.log('errors:', errs.length ? errs : 0);
  console.log('shot:', out);
  await browser.close();
})();
