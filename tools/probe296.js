/* 296 probe — computed color of primary action button labels */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 540, height: 1140 } });
  await p.goto('file://' + path.resolve(process.cwd(), 'index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => {
    const out = {};
    const q = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { color: cs.color, stroke: cs.webkitTextStrokeColor, sw: cs.webkitTextStrokeWidth };
    };
    try { if (typeof openRoulette === 'function') openRoulette(); } catch (e) { out.rouErr = String(e).slice(0, 120); }
    out.rou = q('#rouBtn>b');
    try { if (typeof openColl === 'function') openColl(); } catch (e) {}
    out.collAll = q('#collAll>b');
    out.qsAll = q('.qs-all>b');
    // 승급전: 프로필 팝업 안 버튼
    try { if (typeof openProfile === 'function') openProfile(); } catch (e) {}
    out.promo = q('#promoBtn>b') || q('#pgo>b');
    out.pbtnAll = [...document.querySelectorAll('.pbtn>b')].map(el => {
      const cs = getComputedStyle(el);
      return { id: el.parentElement.id, color: cs.color, stroke: cs.webkitTextStrokeColor };
    });
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
