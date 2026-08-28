/* 284 (구 277ⓑ) 캡처 — «모든 보스전 보스 UI» 의 눈 확인용 3장.
 *   node tools/cap284.js  →  docs/review/284-stage.png · 284-promo.png · 284-dun.png
 * 판정은 tools/verify284.js 가 한다. 이 스크립트는 기록(주인 확인)용이다. */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'review');
const KEY = 'idle_hunter_save_v4';
const SAVE = {
  rank: 0, best: 9999, stage: 50, gold: 1e30, dia: 1e12, trainStage: 6,
  lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof drawHud === 'function');
  await p.waitForTimeout(1400);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });

  /* ① 스테이지 보스전 — 28 원본 */
  await p.evaluate(() => {
    killed = ENEMY_COUNT; startBoss();
    for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
    const b = enemies.find(e => e.tk === 'boss'); if (b) { b.max = 1000; b.hp = 620; }
    bossT = 18.4; drawHud();
  });
  await p.screenshot({ path: path.join(OUT, '284-stage.png') });

  /* ② 승급전 — 스테이지 보스전 «도중» 에 넘어간 그 상황(주인 보고) */
  await p.evaluate(() => {
    startPromo();
    const e = enemies.find(x => x.tk === 'promo'); if (e) { e.max = 1000; e.hp = 730; }
    promo.t = 41.2; drawHud();
  });
  await p.screenshot({ path: path.join(OUT, '284-promo.png') });

  /* ③ 던전 보스 국면 — 자기 HUD(⏱ + 보스 체력 진행바) */
  await p.evaluate(() => {
    promo = null; enemies.length = 0; S.stage = 50; spawnStage();
    startDunRun(DUNGEONS[0], 1);
    dunRun.dmg = dunRun.need * 10;
    for (let i = 0; i < 200 && !enemies.some(e => e.tk === 'dunboss'); i++) step(0.05);
    dunRun.t = 11.7; drawHud();
  });
  await p.screenshot({ path: path.join(OUT, '284-dun.png') });

  await browser.close();
  console.log('CAP284 — docs/review/284-stage.png · 284-promo.png · 284-dun.png');
})();
