/* 작업 223 캡처 하네스 — «죽은 뒤» 화면을 눈으로 본다.
 *   223-mob-death.png    잡몹에게 죽은 직후 — 패배 화면 없이 [스테이지 재도전] 만 뜬다
 *   223-boss-death.png   보스에게 죽은 직후 — 18 패배 화면이 뜬다
 * 실행: node tools/cap223.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = path.resolve(__dirname, '..', 'docs/review');

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1300);
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

    const die = boss => page.evaluate(b => {
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 7; S.best = 7; S.bossFarm = false;
      spawnStage();
      document.getElementById('defw').classList.remove('on');
      if (b) { enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT; step(0.016);
               for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05); }
      player.hp = 1; player.inv = 0; player.dead = 0;
      const e = enemies[0] || (makeEnemy('zombie'), enemies[enemies.length - 1]);
      e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9; e.x = player.x; e.y = player.y;
      for (let i = 0; i < 40 && player.dead <= 0; i++) step(0.016);
      drawBossHud(); draw();
    }, boss);

    await die(false);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, '223-mob-death.png') });
    console.log('223-mob-death.png  (패배 화면 없음 · [스테이지 재도전] 노출)');

    await die(true);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, '223-boss-death.png') });
    console.log('223-boss-death.png (18 패배 화면)');
  } finally {
    await browser.close();
  }
})();
