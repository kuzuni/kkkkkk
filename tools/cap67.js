#!/usr/bin/env node
/* 작업 67 — 연출 연속 프레임 캡처 (ROUTINE [3]-(다): 정지 1장이 아니라 6~8장)
 *
 *   node tools/cap67.js [출력디렉터리]        기본 docs/review
 *
 * 세트 A  67-in-1..8.png    보스 스폰 팬·줌인 (100ms 간격, 0.0~0.7초)
 * 세트 B  67-back-1..8.png  플레이어 복귀·줌 복원 (100ms 간격)
 * 세트 C  67-kill-1..8.png  보스 처치 줌인 + 슬로모 + 화면 플래시 (90ms 간격)
 *
 * 가상 시계(59 교훈 1)로 돌리므로 «틱 n번 → 스크린샷» 이 정확히 n/60 초 뒤 프레임이다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const roots = [path.join(__dirname, '..', 'node_modules'), path.join(os.homedir(), '.npm', '_npx')];
  for (const root of roots) {
    const direct = path.join(root, 'playwright');
    if (fs.existsSync(direct)) return require(direct);
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();
const launchOpts = () => {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
};

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'review'));

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__tick = () => { vt += 1000/60; for (const cb of q.splice(0, q.length)) { try { cb(vt); } catch (e) {} } };
    window.__run = n => { for (let i = 0; i < n; i++) window.__tick(); };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => window.__run(300));

  const stage = page.locator('#stagearea');
  const shot = (name) => stage.screenshot({ path: path.join(OUT, name) });
  const info = async () => page.evaluate(() => ({
    mode: cine.mode, t: +cine.t.toFixed(3), z: +cam.z.toFixed(3), flash: +cine.flash.toFixed(2),
    cam: [Math.round(cam.x), Math.round(cam.y)], pl: [Math.round(player.x), Math.round(player.y)]
  }));

  /* ---- 보스 스테이지로 들어가 연출 시작을 정확히 잡는다 ---- */
  await page.evaluate(() => { S.stage = 10; S.best = Math.max(S.best||1, 10); S.bossFarm = false; spawnStage(); });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) { window.__tick(); if (cine.mode === 'in' && cine.t > 0) break; } });

  const log = [];
  /* A — 팬·줌인 100ms(6프레임) 간격 8장 */
  for (let i = 1; i <= 8; i++) {
    log.push(['A' + i, await info()]); await shot(`67-in-${i}.png`);
    await page.evaluate(() => window.__run(6));
  }
  /* B — 복귀 구간. 'back' 이 시작될 때까지 돌린 뒤 100ms 간격 8장 */
  await page.evaluate(() => { for (let i = 0; i < 600; i++) { window.__tick(); if (cine.mode === 'back') break; } });
  for (let i = 1; i <= 8; i++) {
    log.push(['B' + i, await info()]); await shot(`67-back-${i}.png`);
    await page.evaluate(() => window.__run(6));
  }
  /* C — 처치. 보스를 직접 죽여 연출 첫 프레임부터 90ms(5~6프레임) 간격 8장 */
  await page.evaluate(() => {
    for (let i = 0; i < 900 && !enemies.some(e => e.tk === 'boss'); i++) window.__tick();
    const b = enemies.find(e => e.tk === 'boss');
    if (b) killEnemy(b);
    window.__tick();          /* 처치 «직후 한 프레임» 을 그려야 플래시 정점이 캡처에 남는다 */
  });
  for (let i = 1; i <= 8; i++) {
    log.push(['C' + i, await info()]); await shot(`67-kill-${i}.png`);
    await page.evaluate(n => window.__run(n), i % 2 ? 5 : 6);     /* 평균 91.7ms */
  }

  await ctx.close(); await browser.close();
  console.log('| 프레임 | mode | t(s) | zoom | flash | cam | player |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [k, v] of log)
    console.log(`| ${k} | ${v.mode || '-'} | ${v.t} | ${v.z} | ${v.flash} | ${v.cam.join(',')} | ${v.pl.join(',')} |`);
  console.log('\n캡처 완료 → ' + OUT);
})().catch(e => { console.error(e); process.exit(2); });
