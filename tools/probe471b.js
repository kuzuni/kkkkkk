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

  /* ── §2 (4회차 신설) — 07 스킬 카드 닷: **«덮임» 은 «잘림» 과 다른 사건이다** ────────────
     `verify471` [B] 는 조상 `overflow` 만 본다. 3회차 비평(BQ)이 «칸 11 닷 아래 40%가 검은 요소에
     가려 반달» 을 낸 자리가 그 구멍이었다(그건 스크롤 위치로 기각됐다). 4회차에 07·26·50 카드의
     코너를 닷에게 주면서 그 코너에 **[+] 뱃지·`Lv.n`·«장착 중» 띠** 가 같이 사는 판이 됐으므로,
     이 자리만은 상자가 아니라 **찍힌 픽셀**로 «형제가 덮지 않는가» 를 센다(350·368 처방). */
  const geo2 = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    if (typeof closeShopPage === 'function') { closeShopPage(); await wait(200); }
    goTab('hero', true); await wait(250); heroSubGo('sk'); await wait(400);
    const cards = [...document.querySelectorAll('#bSk .sk-card')].slice(0, 6);
    const out = [];
    cards.forEach((h, i) => {
      h.classList.add('alert');
      let d = h.querySelector(':scope > .updot');
      if (!d) { d = document.createElement('s'); d.className = 'updot'; h.appendChild(d); }
      d.style.animation = 'none';
      const r = d.getBoundingClientRect(), q = h.getBoundingClientRect();
      /* 스크롤 그릇 밖으로 밀린 카드는 «덮임» 이 아니다 — 보이는 것만 센다 */
      if (!r.width || r.top < 0 || r.bottom > innerHeight) return;
      out.push({ i, cx: r.left + r.width / 2, cy: r.top + r.height / 2, hx: q.right, hy: q.top });
    });
    return out;
  });
  await page.waitForTimeout(200);
  const shot2 = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
  const px2 = await page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    return { data: [...g.getImageData(0, 0, img.width, img.height).data], w: img.width, h: img.height };
  }, shot2.toString('base64'));
  const at2 = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= px2.w || y >= px2.h) return null;
    const i = (y * px2.w + x) * 4;
    return [px2.data[i], px2.data[i + 1], px2.data[i + 2]];
  };
  console.log('\nPROBE471b §2 — 07 스킬 카드 닷, 찍힌 픽셀 8방향 («형제가 덮는가»)\n');
  let cov = 0;
  geo2.forEach(g => {
    const R = 8.4;
    const dirs = ['상', '우상', '우', '우하', '하', '좌하', '좌', '좌상'];
    const hit = dirs.map((d, k) => {
      const a = -Math.PI / 2 + k * Math.PI / 4;
      return isCore(at2(g.cx + R * Math.cos(a), g.cy + R * Math.sin(a))) ? 1 : 0;
    });
    const bad = hit.filter(v => !v).length;
    cov += bad ? 1 : 0;
    console.log(`  카드${g.i}  중심(${g.cx.toFixed(1)}, ${g.cy.toFixed(1)})  코어 표본 ${8 - bad}/8`
      + `  코너까지 ${(g.hx - g.cx).toFixed(1)}/${(g.cy - g.hy).toFixed(1)}`
      + (bad ? '  ✖ 안 찍힌 방향: ' + dirs.filter((_, k) => !hit[k]).join('·') : '  ✔ 온전'));
  });
  console.log('\n덮인 카드 닷 ' + cov + '/' + geo2.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
