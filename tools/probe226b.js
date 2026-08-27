#!/usr/bin/env node
/* 226 진단 2단계 — `#shopList` 의 scrollHeight 가 «순간» 커질 때 **누가** 바닥을 밀어내는가.
 *
 *   node tools/probe226b.js [초]
 *
 * 매 프레임 scrollHeight 를 읽고, 기준값보다 커진 프레임에서 리스트 안 모든 후손의
 * 바닥 좌표(리스트 콘텐츠 좌표계)를 재서 가장 깊은 3개를 찍는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const SEC = Math.max(1, parseInt(process.argv[2] || '3', 10));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(400);
  await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
  await page.waitForTimeout(450);

  const out = await page.evaluate(async (sec) => {
    const li = document.getElementById('shopList');
    const b = document.querySelector('#bPet [data-ptsum]');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const base = li.scrollHeight;
    const log = [];
    const t0 = performance.now();
    while (performance.now() - t0 < sec * 1000) {
      await new Promise(r => requestAnimationFrame(r));
      const sh = li.scrollHeight;
      if (sh !== base) {
        const lr = li.getBoundingClientRect();
        const deep = [...li.querySelectorAll('*')].map(e => {
          const r = e.getBoundingClientRect();
          return { b: r.bottom - lr.top + li.scrollTop, cls: e.className && e.className.baseVal !== undefined
                     ? e.className.baseVal : String(e.className || e.tagName), tag: e.tagName };
        }).sort((x, y) => y.b - x.b).slice(0, 3);
        log.push({ t: Math.round(performance.now() - t0), sh, d: sh - base,
                   deep: deep.map(d => d.tag + '.' + d.cls + '@' + d.b.toFixed(1)).join(' | ') });
        if (log.length > 25) break;
      }
    }
    return { base, log };
  }, SEC);

  console.log('base scrollHeight = ' + out.base);
  if (!out.log.length) console.log('(변동 없음)');
  for (const r of out.log) console.log(String(r.t).padStart(5) + 'ms  sh=' + r.sh + ' (+' + r.d + ')  ' + r.deep);
  await browser.close();
})();
