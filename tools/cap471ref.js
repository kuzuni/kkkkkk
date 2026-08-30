#!/usr/bin/env node
/* 기준 그림 캡처 — 작업 471 (저장소 주인 보강 2026-08-30 22:40)
 *
 *   node tools/cap471ref.js
 *
 * 주인이 «이 모양이 맞다» 고 지목한 것은 **우리 게임의 22 퀘스트 [모두 받기] 버튼**이다
 * (`#qAll` — 점이 버튼 우상단 코너에 «걸침»). 즉 기준은 저장소 안에 이미 있고, 이 자가 그것을
 * `docs/ref/471-레드닷-코너.png` 로 떠 둔다. 비평가 2명은 이 한 장을 «정답 모양» 으로 받는다.
 *
 * ⚠ `docs/ref/*.png` 는 .gitignore 에 안 걸려 있다(막힌 것은 docs/shots·docs/review/*.png·tools/*.png).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const OUT = path.resolve(__dirname, '..', 'docs', 'ref', '471-레드닷-코너.png');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openQuest === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  const box = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9;
    openQuest('rep'); await wait(500);
    /* 등장·맥박 연출을 정지 위상으로 세운다 — 기준 그림은 «앉은 모양» 이다(421 처방) */
    document.querySelectorAll('#qAll, #qAll .updot').forEach(e => {
      e.getAnimations({ subtree: true }).forEach(a => { try { a.pause(); a.currentTime = a.effect.getTiming().duration || 0; } catch (_) {} });
    });
    await wait(150);
    const r = document.getElementById('qAll').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const pad = 46;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip: {
    x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
    width: box.w + pad * 2, height: box.h + pad * 2 } });
  console.log('기준 그림 저장 — ' + OUT);
  console.log('  버튼 상자 ' + Math.round(box.w) + '×' + Math.round(box.h)
    + ' @ (' + Math.round(box.x) + ',' + Math.round(box.y) + ') · 여백 ' + pad + 'px');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
