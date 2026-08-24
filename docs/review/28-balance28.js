/* 작업 28 밸런스 실측 — 보스 공격력 ×22 로 올린 뒤 플레이어 생존 시간 (PROGRESS 기록용)
 * 스테이지 10·20·30 보스전을 각각 «기본 성장 상태» 로 두고 첫 사망까지 걸린 시간을 잰다.
 */
const { chromium } = require('playwright');
const FILE = 'file:///home/user/kkkkkk/index.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  for (const stg of [10, 20, 30]) {
    const r = await page.evaluate(async (stg) => {
      S.bossFarm = false; S.stage = stg;
      spawnStage();
      const t0 = performance.now();
      let died = 0, cleared = 0, timeout = 0, hpAt = [], lastBoss = 1;
      const maxHp = stat.maxHp;
      while (performance.now() - t0 < 34000) {
        await new Promise(r => setTimeout(r, 100));
        hpAt.push(player.hp / maxHp); { const bb = enemies.find(e=>e.tk==="boss"); if(bb) lastBoss = bb.hp/bb.max; }
        if (player.dead > 0 && !died) { died = (performance.now() - t0) / 1000; break; }
        if (S.bossFarm) { timeout = (performance.now() - t0) / 1000; break; }
        if (S.stage !== stg) { cleared = (performance.now() - t0) / 1000; break; }
      }
      const b = enemies.find(e => e.tk === 'boss');
      return { stg, died, cleared, timeout, maxHp,
               bossHpLeft: +(lastBoss * 100).toFixed(1),
               bossDmg: b ? Math.round(b.dmg) : 0,
               playerHpMin: +(Math.min(...hpAt) * 100).toFixed(1),
               cp: Math.round(cp()) };
    }, stg);
    console.log(JSON.stringify(r));
  }
  await ctx.close(); await browser.close();
})();
