#!/usr/bin/env node
/* 재현 ② — 작업 471: 주인 스크린샷 ①(«10 상점 서브탭 점이 위쪽이 잘려 반달») 을 **찍힌 픽셀**로 확인한다.
 *
 *   node tools/probe471b.js
 *
 * 350·368 처방: 상자(getBoundingClientRect)만 보면 «클리핑 조상 없음» 이라 결함이 안 보인다.
 * 실제로 그려진 화면을 다시 읽어 닷 원 둘레 8방향을 표본해 «빨간 코어가 실제로 찍혔는가» 를 센다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 서브탭 배지를 강제로 켜고(166 규약의 `.alert`) 상점을 연다 */
  const geo = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    openShopPage(); await wait(400);
    document.querySelectorAll('#shopCats .stab').forEach(t => t.classList.add('alert'));
    document.querySelectorAll('#shopCats .stab>.bdg').forEach(b => { b.style.animation = 'none'; });
    await wait(260);
    const out = [];
    document.querySelectorAll('#shopCats .stab>.bdg').forEach((b, i) => {
      const r = b.getBoundingClientRect();
      out.push({ i, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width });
    });
    return out;
  });

  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    return { data: [...g.getImageData(0, 0, img.width, img.height).data], w: img.width, h: img.height };
  }, shot.toString('base64'));

  const at = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) return null;
    const i = (y * px.w + x) * 4;
    return [px.data[i], px.data[i + 1], px.data[i + 2]];
  };
  /* 코어(#F22E52) 또는 상단 하이라이트(rgba(255,117,150)) 계열 */
  const isCore = (c) => c && c[0] > 170 && c[0] - c[1] > 70 && c[0] - c[2] > 40;

  console.log('PROBE471b — 10 상점 서브탭 배지, 찍힌 픽셀 8방향 표본 (코어 반지름 13.5 의 0.62 = 8.4px)\n');
  let anyCut = 0;
  geo.forEach(g => {
    const R = 8.4;
    const dirs = ['상', '우상', '우', '우하', '하', '좌하', '좌', '좌상'];
    const hit = dirs.map((d, k) => {
      const a = -Math.PI / 2 + k * Math.PI / 4;
      return isCore(at(g.cx + R * Math.cos(a), g.cy + R * Math.sin(a))) ? 1 : 0;
    });
    const cut = hit.filter(v => !v).length;
    anyCut += cut ? 1 : 0;
    console.log(`  칸${g.i}  중심(${g.cx.toFixed(1)}, ${g.cy.toFixed(1)})  코어 표본 ${8 - cut}/8` +
      (cut ? '  ✖ 안 찍힌 방향: ' + dirs.filter((_, k) => !hit[k]).join('·') : '  ✔ 온전'));
  });
  console.log('\n잘린 배지 ' + anyCut + '/' + geo.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
