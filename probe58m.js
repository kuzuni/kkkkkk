#!/usr/bin/env node
/* 58 22회차 — 상단 토스트를 몇 px 올릴 수 있는지(무엇과도 안 겹치는 띠) 실측.
 *   node probe58m.js
 * 토스트는 #fxl 소속이라 A3(#top) 구간을 건드리지 않지만, **시각적으로** 무엇 위에 앉는지는
 * 봐야 한다. 프레임 y 0~340 안의 보이는 요소 bbox 를 전부 찍는다. */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){
  const fs2 = require('fs');
  return chromium.launch().catch(e => {
    for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){
      try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){}
    }
    throw e;
  });
}
(async () => {
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const rows = [];
    for(const e of document.querySelectorAll('#app *')){
      const cs = getComputedStyle(e);
      if(cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      const r = e.getBoundingClientRect();
      if(!r.width || !r.height) continue;
      if(r.top > 340 || r.bottom < 60) continue;
      if(r.width > 1000 && r.height > 600) continue;                  /* 화면 전체 컨테이너는 뺀다 */
      rows.push({ sel:(e.id ? '#'+e.id : '') + '.' + (e.className || '').toString().split(' ')[0],
                  x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) });
    }
    return rows.sort((a,b) => a.y - b.y);
  });
  const seen = new Set();
  for(const r of out){
    const k = r.sel + r.y + r.h; if(seen.has(k)) continue; seen.add(k);
    console.log(`  y${String(r.y).padStart(4)}~${String(r.y+r.h).padStart(4)}  x${String(r.x).padStart(4)}~${String(r.x+r.w).padStart(4)}  ${r.sel}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
