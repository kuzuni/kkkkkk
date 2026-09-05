#!/usr/bin/env node
/* 227 진단 — `verify158` [E] 간헐 FAIL 의 «#fxl 로 새는 묶음» 이 어느 경로인지 가른다.
 *   node tools/probe227.js [반복수]
 *
 * [E] 와 같은 하네스(합성 킬 130ms + 하단 네비 연타 8초)를 돌리되,
 *   ⓐ fxFly(from,cur,n) 호출을 전부 기록하고
 *   ⓑ 그 묶음이 쓴 스냅샷(fxAccSrc)이 «언제·무엇으로» 정해졌는지(fxOrigT/fxTapT/fxOrigSrc)를 같이 남긴다.
 * 목적은 «탭 좌표가 이겼나 / 다른 경로가 #fxl 로 쐈나» 를 수치로 가르는 것 하나다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '3', 10);


(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */

  for (let run = 1; run <= N; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1400);

    await page.evaluate(() => {
      document.getElementById('fxl').innerHTML = '';
      document.getElementById('fxlc').innerHTML = '';
      fxFlies.length = 0;
      window.__p = { fly: [], node: [], gold0: S.gold };
      /* fxFly 인자 = 그 묶음이 실제로 쓴 발원(유일한 진실) */
      const orig = window.fxFly;
      window.fxFly = function (from, cur, n) {
        window.__p.fly.push({
          t: Math.round(performance.now()), cur, n,
          combat: !!(from && from.combat),
          x: from ? Math.round(from.x) : null, y: from ? Math.round(from.y) : null,
          origT: Math.round(performance.now() - fxOrigT), origSrc: fxOrigSrc,
          tapT: Math.round(performance.now() - fxTapT),
          tapEl: (typeof fxTapEl !== 'undefined' && fxTapEl) ? (fxTapEl.id || fxTapEl.className || fxTapEl.tagName) : null,
        });
        return orig.apply(this, arguments);
      };
      /* 스냅샷이 «언제 · 무엇으로» 정해졌나 — fxWatch 가 부르는 fxSrc 한 자리를 그대로 본다 */
      window.__p.src = [];
      const os = window.fxSrc;
      window.fxSrc = function (now) {
        const r = os.apply(this, arguments);
        window.__p.src.push({ t: Math.round(now), origAge: Math.round(now - fxOrigT), origSrc: fxOrigSrc,
                              tapAge: Math.round(now - fxTapT), combat: !!(r && r.combat), got: !!r });
        return r;
      };
      /* rAF 가 멈춘 구간(프레임 공백)을 잰다 — 묶음이 늦게 발사되는 이유 후보 */
      window.__p.gap = []; let last = performance.now();
      (function loop(){ const n = performance.now(); if (n - last > 120) window.__p.gap.push({ t: Math.round(n), d: Math.round(n - last) }); last = n; requestAnimationFrame(loop); })();
      /* #fxl 에 무엇이 꽂히는지 */
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes)
          if (n.classList && (n.classList.contains('fx-fly') || n.classList.contains('fx-plus')))
            window.__p.node.push({ t: Math.round(performance.now()), cls: n.className });
      }).observe(document.getElementById('fxl'), { childList: true });
      window.__k = setInterval(() => { fxAt({ x: 540, y: 1100 }, 'combat'); S.gold += 13; }, 130);
    });

    const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabbar .tab')].map((b) => {
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }));
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < 8000) {
      const p = tabs[i++ % tabs.length];
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
      await page.waitForTimeout(180);
    }
    const r = await page.evaluate(() => { clearInterval(window.__k); return window.__p; });
    const bad = r.fly.filter((f) => !f.combat);
    console.log(`--- run ${run}: fxFly ${r.fly.length}건 · 비전투 묶음 ${bad.length}건 · #fxl 노드 ${r.node.length}개`);
    for (const b of bad) console.log('    비전투: ' + JSON.stringify(b));
    if (r.node.length) console.log('    #fxl 첫 노드: ' + JSON.stringify(r.node.slice(0, 3)));
    for (const b of bad) {
      const near = r.src.filter((s) => s.t > b.t - 1200 && s.t <= b.t + 20);
      console.log('    직전 fxSrc: ' + JSON.stringify(near.slice(-6)));
      console.log('    직전 프레임 공백: ' + JSON.stringify(r.gap.filter((g) => g.t > b.t - 1500 && g.t <= b.t + 20)));
    }
    if (!bad.length) console.log('    프레임 공백 ' + r.gap.length + '건 (최대 ' + Math.max(0, ...r.gap.map((g) => g.d)) + 'ms)');
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(2); });
