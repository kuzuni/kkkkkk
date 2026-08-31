#!/usr/bin/env node
/* 채점 캡처 — 작업 611 「05 장비 팝업 카드 레드닷 코너」 비평 루프 (비평가 2인 · 둘 다 ≥9/10 · 상한 3회차)
 *
 *   node tools/cap611.js [회차]
 *
 * 출력(전부 .gitignore 대상 — 커밋 금지, 증거는 review .md 의 수치로):
 *   docs/review/611-r<n>-full.png   05 장비 팝업(무기 탭) 1080×2280 전체 — 강화 가능 카드 여러 장 점등
 *   docs/review/611-r<n>-crop.png   점등 카드 코너 crop 격자(마지막 열 카드 포함 — 잘림 검사용)
 *
 * 상태: 무기 부위 실물 전부 «보유 + 재료 충분»(canLevel 참) — 격자의 데이터 카드 전부 점등.
 *      마지막 열(c4)도 실물이므로(등급당 5종) 그 카드의 닷이 `.wm-grid` 클립에 안 잘리는지가
 *      이 회차의 핵심 검사 축이다(471 규약 + 클립 산수 in-x 22).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const R = process.argv[2] || '1';
const DIR = path.resolve(__dirname, '..', 'docs', 'review');
const FULL = path.join(DIR, '611-r' + R + '-full.png');
const CROP = path.join(DIR, '611-r' + R + '-crop.png');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    /* 무기 부위 전부 보유 + 재료 충분 → 데이터 카드 전 칸 canLevel 참(점등) */
    EQUIPS.filter(e => e.slot === 'weapon').forEach(e => { S.own[e.id] = { l: 1, n: 1e12 }; });
    markDirty(); uiDirty = true; renderUI();
    goTab('hero', true); heroSubGo('eq');
    await new Promise(r => setTimeout(r, 300));
    openWeapon(null, 'weapon');
    await new Promise(r => setTimeout(r, 700));
    /* 채점은 base 상태로 — 맥박 한복판이 찍히면 크기·자리가 흔들려 회차끼리 비교가 안 된다(cap471 규칙) */
    document.querySelectorAll('.updot').forEach(d => { d.style.animation = 'none'; });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: FULL });

  /* 2회차 — 하단 스크롤 끝 1장 더(비평가 CB 1회차: «캡처 1장엔 20/36장만 보인다»). 36/36 커버. */
  await page.evaluate(() => { const g = document.getElementById('wpnGrid'); g.scrollTop = g.scrollHeight; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: FULL.replace('-full.png', '-full2.png') });
  await page.evaluate(() => { document.getElementById('wpnGrid').scrollTop = 0; });
  await page.waitForTimeout(250);

  /* crop 격자 — 점등 카드 중 «첫 열 · 마지막 열(c4) · 임의 중간 열» 3장의 우상단 코너 주변 */
  const rects = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#wpnGrid .wgc.alert')];
    const grid = document.querySelector('#wpnGrid').getBoundingClientRect();
    const byCol = c => cards.find(el => Math.round((el.offsetLeft - 10) / 170) === c);
    return [0, 2, 4].map(c => {
      const el = byCol(c);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { col: c, x: r.left - 30, y: r.top - 30, w: r.width + 60, h: 130, gridRight: grid.right };
    }).filter(Boolean);
  });
  const clips = [];
  for (const r of rects) {
    const buf = await page.screenshot({ clip: { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.w, height: r.h } });
    clips.push({ col: r.col, buf });
  }
  /* 한 장으로 — 캔버스 페이지에서 합성(기준 그림도 오른쪽에 붙인다) */
  const refB64 = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'ref', '471-레드닷-코너.png')).toString('base64');
  const sheet = await page.evaluate(async ([items, ref]) => {
    const imgs = [];
    for (const it of items) {
      const im = new Image();
      im.src = 'data:image/png;base64,' + it.b64;
      await new Promise(r => { im.onload = r; });
      imgs.push({ col: it.col, im });
    }
    const rf = new Image(); rf.src = 'data:image/png;base64,' + ref;
    await new Promise(r => { rf.onload = r; });
    const W = imgs.reduce((s, o) => s + o.im.width + 20, 20) + rf.width + 20;
    const H = Math.max(...imgs.map(o => o.im.height), rf.height) + 60;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#222'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.font = '20px sans-serif';
    let x = 20;
    for (const o of imgs) {
      g.fillText('col ' + o.col + (o.col === 4 ? ' (격자 우변 6px — 잘림 검사)' : ''), x, 30);
      g.drawImage(o.im, x, 44); x += o.im.width + 20;
    }
    g.fillText('기준 그림 (471)', x, 30); g.drawImage(rf, x, 44);
    return cv.toDataURL('image/png').split(',')[1];
  }, [clips.map(c => ({ col: c.col, b64: c.buf.toString('base64') })), refB64]);
  fs.writeFileSync(CROP, Buffer.from(sheet, 'base64'));
  console.log('CAP611 r' + R + ' — 점등 카드 ' + (await page.evaluate(() =>
    document.querySelectorAll('#wpnGrid .wgc.alert').length)) + '장 · crop ' + clips.length + '칸 (' +
    clips.map(c => 'c' + c.col).join('/') + ') · ' + FULL + ' · ' + CROP);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
