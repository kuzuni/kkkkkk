/* 364 진단 — 13 재화 탭 광고 상품 레드닷 위치 캡처 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await p.evaluate(() => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const dots = [...document.querySelectorAll('#shopList .updot')].map(d => {
      const h = d.closest('.cn-cd') || d.parentElement;
      const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
      return { host: h.className, dx: Math.round(dr.x - hr.x), dy: Math.round(dr.y - hr.y),
               hw: Math.round(hr.width), hh: Math.round(hr.height),
               vis: getComputedStyle(d).display !== 'none' && dr.width > 0 };
    });
    const first = document.querySelector('#shopList .cn-cd .updot');
    const card = first && (first.closest('.cn-cd'));
    const r = card ? card.getBoundingClientRect() : null;
    return { dots, clip: r ? { x: Math.round(r.x) - 10, y: Math.round(r.y) - 10, width: Math.round(r.width) + 20, height: Math.round(r.height) + 20 } : null };
  });
  console.log(JSON.stringify(info.dots, null, 1));
  if (info.clip) {
    const shot = await p.screenshot({ clip: info.clip });
    require('fs').writeFileSync(path.join(__dirname, 'shot364.png'), shot);
    console.log('shot364.png saved');
  }
  const full = await p.screenshot({ clip: { x: 0, y: 300, width: 1080, height: 1400 } });
  require('fs').writeFileSync(path.join(__dirname, 'shot364-full.png'), full);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
