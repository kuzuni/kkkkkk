#!/usr/bin/env node
/* 작업 67 게이트 — 맵 ×2 + 카메라 무빙 연출 (ROUTINE [3]-(가) 수치 검증)
 *
 *   node tools/verify67.js
 *
 * 검사 항목
 *   [1] 월드 크기 ×2 (1920×3072) · 바닥 타일맵이 새 크기를 채움 · 장식 밀도 유지
 *   [2] 스폰 링 — 적이 «플레이어 반경 300~700px» 안에서만 나온다
 *   [3] 카메라 — 프레임 간 저크(속도 급변) 상한 · 월드 경계 밖(검은 영역) 노출 0
 *   [4] 보스 도전 연출 — 팬·줌인(1.15) → 유지 → 복귀 타이밍, 보스를 실제로 잡는다
 *   [5] 보스 처치 연출 — 줌인(1.30) + 슬로모(timeScale .3, 0.3초) + 화면 플래시
 *   [6] 회귀 — 콘솔 에러 0 · 42 조이스틱/59 AI 상수 미변경
 *
 * 59 교훈 1: 실시간을 기다리지 않는다 — rAF 를 «가상 시계»(고정 dt 1/60s)로 갈아끼운다.
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
  console.error('playwright 를 찾을 수 없다 — `npm i --no-save playwright && npx playwright install chromium` 후 재실행');
  process.exit(2);
})();

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const ROOT = path.resolve(__dirname, '..');
const LIM_JERK = 5.0;          /* 프레임 간 카메라 «속도 변화» 상한 (px/frame²) */
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail == null ? '' : String(detail) }); };

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }

  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

  await page.addInitScript(() => {
    /* 가상 시계 rAF — dt 고정 1/60s (59 교훈 1) */
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__tick = () => {
      vt += 1000 / 60;
      const list = q.splice(0, q.length);
      for (const cb of list) { try { cb(vt); } catch (e) {} }
    };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof WORLD !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 300; i++) window.__tick(); });

  /* ---- [1] 월드 크기 ---- */
  const w1 = await page.evaluate(() => ({
    w: WORLD.w, h: WORLD.h, t: T,
    fw: floorCv && floorCv.width, fh: floorCv && floorCv.height
  }));
  ok('[1] WORLD.w = 1920 (20칸 → 40칸)', w1.w === 1920, w1.w);
  ok('[1] WORLD.h = 3072 (32칸 → 64칸)', w1.h === 3072, w1.h);
  ok('[1] 바닥 타일맵이 새 월드를 통째로 채움', w1.fw >= w1.w && w1.fh >= w1.h, `${w1.fw}×${w1.fh}`);

  /* ---- [3] 카메라 — 일반 전투 5,000 프레임(≈83초) ---- */
  const cam1 = await page.evaluate(() => {
    /* spawnStage 는 카메라를 «의도적으로» 스냅한다 — 그 프레임은 저크 판정에서 뺀다 */
    const snaps = new Set();
    let f = 0;
    const origSpawn = window.spawnStage;
    window.spawnStage = function () { const r = origSpawn.apply(this, arguments); for (let k = 0; k < 3; k++) snaps.add(f + k); return r; };
    let px = cam.x, py = cam.y, pvx = 0, pvy = 0;
    let maxJerk = 0, maxJerkF = -1, outside = 0, maxV = 0, worstOut = 0;
    for (f = 0; f < 5000; f++) {
      window.__tick();
      const vx = cam.x - px, vy = cam.y - py;
      if (!snaps.has(f) && f > 3) {
        const j = Math.hypot(vx - pvx, vy - pvy);
        if (j > maxJerk) { maxJerk = j; maxJerkF = f; }
        maxV = Math.max(maxV, Math.hypot(vx, vy));
      }
      px = cam.x; py = cam.y; pvx = vx; pvy = vy;
      /* 검은 영역 노출 — 화면 사각형이 월드 밖으로 나갔는가 (셰이크 포함 전 카메라 기준) */
      const hw = VW / (2 * cam.z), hh = VH / (2 * cam.z);
      const ex = Math.max(hw - cam.x, cam.x - (WORLD.w - hw), hh - cam.y, cam.y - (WORLD.h - hh));
      if (ex > 0.51) { outside++; worstOut = Math.max(worstOut, ex); }
    }
    return { maxJerk, maxJerkF, outside, worstOut, maxV, z: cam.z, stage: S.stage };
  });
  ok('[3] 카메라 저크(프레임 간 속도 변화) < ' + LIM_JERK + 'px', cam1.maxJerk < LIM_JERK, cam1.maxJerk.toFixed(3) + 'px @f' + cam1.maxJerkF);
  ok('[3] 월드 경계 밖(검은 영역) 노출 0프레임', cam1.outside === 0, cam1.outside + '프레임 / 최대 ' + cam1.worstOut.toFixed(2) + 'px');
  ok('[3] 평상시 줌 = 1', Math.abs(cam1.z - 1) < 1e-6, cam1.z);

  /* ---- [3b] 리드 — 이동 방향 앞을 본다 ---- */
  const lead = await page.evaluate(() => {
    let best = 0, sameDir = 0, n = 0;
    for (let i = 0; i < 900; i++) {
      window.__tick();
      const v = Math.hypot(player.vx, player.vy);
      if (v > 40 && !cine.mode) {
        const l = Math.hypot(cam.lx, cam.ly);
        best = Math.max(best, l);
        if (l > 20) { n++; if ((cam.lx * player.vx + cam.ly * player.vy) / (l * v) > 0.5) sameDir++; }
      }
    }
    return { best, sameDir, n, max: CAM_LEAD };
  });
  ok('[3b] 리드가 붙는다(0 < 최대 ≤ 90px)', lead.best > 15 && lead.best <= 90.5, lead.best.toFixed(1) + 'px');
  ok('[3b] 리드 방향 = 이동 방향(표본 90% 이상)', lead.n > 30 && lead.sameDir / lead.n > 0.9, `${lead.sameDir}/${lead.n}`);

  /* ---- [2] 스폰 링 ---- */
  const ring = await page.evaluate(() => {
    const d = [];
    const before = enemies.length;
    for (let i = 0; i < 300; i++) {
      makeEnemy('zombie');
      const e = enemies[enemies.length - 1];
      d.push(Math.hypot(e.x - player.x, e.y - player.y));
      enemies.pop();                    /* 42 교훈 1: 배열을 «비우지» 않는다 — 넣은 것만 되돌린다 */
    }
    d.sort((a, b) => a - b);
    return { min: d[0], max: d[d.length - 1], med: d[150], n: d.length, kept: enemies.length === before,
             inRange: d.filter(v => v >= 299 && v <= 701).length };
  });
  ok('[2] 스폰 거리 전부 300~700px 링 안', ring.inRange === ring.n, `${ring.inRange}/${ring.n} · 최소 ${ring.min.toFixed(0)} 최대 ${ring.max.toFixed(0)} 중앙 ${ring.med.toFixed(0)}`);
  ok('[2] 측정이 enemies 배열을 오염시키지 않음', ring.kept, '');

  /* ---- [4][5] 보스 연출 ---- */
  const boss = await page.evaluate(() => {
    S.stage = 10; S.best = Math.max(S.best || 1, 10); S.bossFarm = false;
    S.gold = 1e12;                                     /* 전투 결과와 무관하게 연출만 본다 */
    spawnStage();
    const modes = [], zs = [], camToBoss = [], camToPl = [];
    let spawnedF = -1, b = null, jerk = 0, prevV = null, prev = { x: cam.x, y: cam.y };
    const marks = {};
    for (let f = 0; f < 400; f++) {                    /* ≈6.7초 */
      window.__tick();
      const v = { x: cam.x - prev.x, y: cam.y - prev.y };
      if (prevV && f > 2) jerk = Math.max(jerk, Math.hypot(v.x - prevV.x, v.y - prevV.y));
      prevV = v; prev = { x: cam.x, y: cam.y };
      if (!b) { b = enemies.find(e => e.tk === 'boss') || null; if (b) spawnedF = f; }
      if (b) {
        camToBoss.push(Math.hypot(cam.x - b.x, cam.y - b.y));
        camToPl.push(Math.hypot(cam.x - player.x, cam.y - player.y));
        zs.push(cam.z);
        const m = cine.mode || '-';
        if (modes[modes.length - 1] !== m) modes.push(m);
        if (marks[m] === undefined) marks[m] = f;
        if (m === '-' && modes.length > 2) break;
      }
    }
    const distAtSpawn = b ? Math.hypot(b.x - player.x, b.y - player.y) : -1;
    return {
      spawnedF, distAtSpawn, modes, marks, jerk,
      zMax: Math.max(...zs), zEnd: cam.z,
      minCamToBoss: Math.min(...camToBoss),
      endCamToPl: camToPl[camToPl.length - 1],
      frames: zs.length, bossAlive: !!b && enemies.indexOf(b) >= 0
    };
  });
  ok('[4] 보스 스폰이 연출을 켠다(in → hold → back → 종료)',
    boss.modes.join('>').includes('in>hold>back'), boss.modes.join(' > '));
  ok('[4] 팬·줌인 배율 1.15', Math.abs(boss.zMax - 1.15) < 0.02, boss.zMax.toFixed(3));
  ok('[4] 카메라가 실제로 보스를 잡는다(중심 100px 이내)', boss.minCamToBoss < 100, boss.minCamToBoss.toFixed(0) + 'px (스폰 거리 ' + boss.distAtSpawn.toFixed(0) + 'px)');
  ok('[4] 연출 뒤 플레이어로 복귀(150px 이내) · 줌 복원', boss.endCamToPl < 150 && Math.abs(boss.zEnd - 1) < 0.02, boss.endCamToPl.toFixed(0) + 'px · z' + boss.zEnd.toFixed(3));
  ok('[4] 연출 길이 ≈ 1.75초(0.8+0.35+0.6)', boss.frames >= 95 && boss.frames <= 120, (boss.frames / 60).toFixed(2) + '초');
  ok('[4] 연출 중 저크 < ' + LIM_JERK + 'px', boss.jerk < LIM_JERK, boss.jerk.toFixed(3) + 'px');

  const kill = await page.evaluate(() => {
    const b = enemies.find(e => e.tk === 'boss');
    if (!b) return { err: '보스 없음' };
    /* 게임 시간이 실제로 느려지는지 — step 이 받은 dt 를 세어 «슬로모 프레임» 을 판정한다 */
    let slowFrames = 0, normFrames = 0;
    const origStep = window.step;
    window.step = function (dt) { (dt < 0.9 / 60) ? slowFrames++ : normFrames++; return origStep.apply(this, arguments); };
    const bx = b.x, by = b.y;
    /* 연출이 끝나면 다음 스테이지가 깔리고 카메라가 «의도적으로» 스냅한다 — 그 프레임은 저크에서 뺀다 */
    const snaps = new Set();
    let f = 0;
    const origSpawn = window.spawnStage;
    window.spawnStage = function () { const r = origSpawn.apply(this, arguments); for (let k = 0; k < 3; k++) snaps.add(f + k); return r; };
    killEnemy(b);
    const zs = [], flashes = [];
    let jerk = 0, prevV = null, prev = { x: cam.x, y: cam.y }, endF = -1;
    for (f = 0; f < 200; f++) {
      window.__tick();
      const v = { x: cam.x - prev.x, y: cam.y - prev.y };
      if (prevV && f > 2 && !snaps.has(f)) jerk = Math.max(jerk, Math.hypot(v.x - prevV.x, v.y - prevV.y));
      prevV = v; prev = { x: cam.x, y: cam.y };
      zs.push(cam.z); flashes.push(cine.flash);
      if (endF < 0 && !cine.mode && f > 5) endF = f;
    }
    window.step = origStep; window.spawnStage = origSpawn;
    return {
      zMax: Math.max(...zs), zEnd: cam.z, endF,
      slowFrames, normFrames,
      flash0: flashes[0], flashMax: Math.max(...flashes), flashEnd: flashes[flashes.length - 1],
      flashFrames: flashes.filter(v => v > 0).length,
      camToKill: Math.min(...zs.map((_, i) => i)) >= 0 ? Math.hypot(cam.x - bx, cam.y - by) : -1,
      jerk
    };
  });
  ok('[5] 처치 줌인 배율 1.30', !kill.err && Math.abs(kill.zMax - 1.30) < 0.03, kill.err || kill.zMax.toFixed(3));
  ok('[5] 슬로모 0.3초 = 18프레임(±2)', Math.abs(kill.slowFrames - 18) <= 2, kill.slowFrames + '프레임');
  ok('[5] 슬로모가 «끝난다»(이후 정상 배속)', kill.normFrames > 150, kill.normFrames + '프레임');
  ok('[5] 화면 플래시가 뜨고 0.42초 안에 사라진다', kill.flashMax > 0.9 && kill.flashEnd === 0 && kill.flashFrames <= 27, `최대 ${kill.flashMax.toFixed(2)} · ${kill.flashFrames}프레임`);
  ok('[5] 처치 연출 뒤 줌 복원', Math.abs(kill.zEnd - 1) < 0.02, kill.zEnd.toFixed(3));
  ok('[5] 처치 연출 중 저크 < ' + LIM_JERK + 'px', kill.jerk < LIM_JERK, kill.jerk.toFixed(3) + 'px');

  /* ---- [6] 회귀 ---- */
  const reg = await page.evaluate(() => ({
    joy: typeof joy === 'object' && 'on' in joy,
    ai: [AI_WALL_M, AI_WALL_K, AI_PULL, AI_HOME].join(','),
    bossSec: BOSS_SEC, sc: SC, vw: VW,
    raidSafe: (() => { try { return typeof startRaid === 'function'; } catch (e) { return false; } })()
  }));
  ok('[6] 42 조이스틱 유지', reg.joy, '');
  ok('[6] 59 AI 상수 미변경 (260,2.6,0.9,0.6)', reg.ai === '260,2.6,0.9,0.6', reg.ai);
  ok('[6] 28 보스 제한시간 30초 유지', reg.bossSec === 30, reg.bossSec);
  ok('[6] 캔버스 논리 좌표계 유지 (SC 2 · VW 540)', reg.sc === 2 && reg.vw === 540, `${reg.sc}/${reg.vw}`);
  ok('[6] 콘솔·페이지 에러 0', errs.length === 0, errs.slice(0, 2).join(' | '));

  await ctx.close();
  await browser.close();

  console.log('');
  let bad = 0;
  for (const r of results) {
    console.log((r.pass ? '  ✓ ' : '  ✗ ') + r.name + (r.detail ? '  — ' + r.detail : ''));
    if (!r.pass) bad++;
  }
  console.log('');
  if (bad) { console.log(`VERIFY67 FAIL (${results.length - bad}/${results.length})`); process.exit(1); }
  console.log(`VERIFY67 PASS (${results.length}/${results.length})`);
})().catch(e => { console.error(e); process.exit(2); });
