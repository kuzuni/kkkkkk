/* 120 임시 프로브 — 프레임 높이별 .rw-* 실측(구획 top/height·여백·겹침) */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];

(async () => {
  const browser = await launch(chromium);
  for (const H of HEIGHTS) {
    const ctx = await browser.newContext({ viewport: { width: 540, height: Math.round(540 * H / 1080) }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      try { S.relic = 999999; } catch (e) {}
      openRelw(); void document.body.offsetHeight;
      const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
      const F = el => { const q = el.getBoundingClientRect();
        return { l:(q.left-ar.left)/sc, t:(q.top-ar.top)/sc, r:(q.right-ar.left)/sc, b:(q.bottom-ar.top)/sc,
                 w:q.width/sc, h:q.height/sc }; };
      const relw = document.getElementById('relw');
      const q = s => F(relw.querySelector(s));
      const slots = [...relw.querySelectorAll('.rw-c')].map(F);
      return {
        frameH: ar.height / sc,
        relw: F(relw), tab: F(document.getElementById('tabbar')), pcb: q('.pcb'),
        panel: q('.rw-panel'), bg: q('.rw-bg'), frame: q('.rw-frame'),
        grid: q('.rw-grid'), mid: q('.rw-mid'), basin: q('.rw-basin'), cost: q('.rw-cost'), cap: q('.rw-cap'),
        slotTop: slots[0], slotLast: slots[9],
        rwc: getComputedStyle(relw).getPropertyValue('--rwc').trim(),
      };
    });
    const f = n => n.toFixed(1);
    console.log(`\n[frameH ${H}]  --rwc=${r.rwc}  panel ${f(r.panel.w)}×${f(r.panel.h)} @y${f(r.panel.t)}..${f(r.panel.b)}  (relw ${f(r.relw.t)}..${f(r.relw.b)} · tab.top ${f(r.tab.t)})`);
    console.log(`  bg ${f(r.bg.t)}..${f(r.bg.b)}  frame ${f(r.frame.t)}..${f(r.frame.b)}`);
    console.log(`  grid  ${f(r.grid.t)}..${f(r.grid.b)}  (h ${f(r.grid.h)})   slot1 ${f(r.slotTop.t)}..${f(r.slotTop.b)}  slot10 ${f(r.slotLast.t)}..${f(r.slotLast.b)} ${f(r.slotLast.w)}×${f(r.slotLast.h)}`);
    console.log(`  mid   ${f(r.mid.t)}..${f(r.mid.b)}  basin ${f(r.basin.l)},${f(r.basin.t)} ${f(r.basin.w)}×${f(r.basin.h)}  cost ${f(r.cost.l)},${f(r.cost.t)} ${f(r.cost.w)}×${f(r.cost.h)}`);
    console.log(`  cap   ${f(r.cap.t)}..${f(r.cap.b)}`);
    console.log(`  여백: 상 ${f(r.grid.t - r.panel.t)} · 격자↔중단 ${f(r.mid.t - r.grid.b)} · 중단↔안내 ${f(r.cap.t - r.mid.b)} · 하 ${f(r.panel.b - r.cap.b)}`);
    if (errs.length) console.log('  ERR ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
})();
