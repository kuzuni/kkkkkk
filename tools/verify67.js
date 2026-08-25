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
/* 두 가지를 구분해서 잰다 —
   ACC  = 프레임 간 «속도 변화»(가속). 평상시엔 어떤 가속도 의도되지 않았으므로 낮게 묶는다.
   JERK = 프레임 간 «가속 변화»(3차 차분). **이게 «급변» 의 정의다.**
   의도된 연출(0.26초에 325px 당기는 처치 펀치)은 가속 자체가 6px/f² 까지 오르지만
   속도 수열이 0.6→31→0 의 매끄러운 종 모양이라 «급변» 은 아니다 — 가속으로 판정하면 오답이 나온다. */
const LIM_JERK = 5.0;          /* 평상시 가속 상한 (px/frame²) */
const LIM_CACC = 8.0;          /* 연출 중 가속 상한 */
const LIM_CJRK = 3.0;          /* 연출 중 저크(3차 차분) 상한 (px/frame³) */
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail == null ? '' : String(detail) }); };
/* note = «통과를 막지 않지만 매 회차 수치를 남겨야 하는» 항목. 합격 수에 세지 않는다 —
   조용히 표본에서 빼면 3회차의 «게이트가 순환 논증» 이 그대로 재발한다(5회차 비평 P 결함 3). */
const note = (name, detail) => { results.push({ name, note: true, detail: detail == null ? '' : String(detail) }); };

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
    const modes = [], zs = [], camToBoss = [], camToPl = [], camToArt = [], holdD = [], holdClip = [], cineClip = [], earlyClip = [], backClip = [];
    let spawnedF = -1, b = null, jerk = 0, acc = 0, prevV = null, prevA = null, prev = { x: cam.x, y: cam.y };
    const marks = {};
    for (let f = 0; f < 400; f++) {                    /* ≈6.7초 */
      window.__tick();
      const v = { x: cam.x - prev.x, y: cam.y - prev.y };
      if (prevV && f > 2) {
        const a = { x: v.x - prevV.x, y: v.y - prevV.y };
        acc = Math.max(acc, Math.hypot(a.x, a.y));
        if (prevA) jerk = Math.max(jerk, Math.hypot(a.x - prevA.x, a.y - prevA.y));
        prevA = a;
      }
      prevV = v; prev = { x: cam.x, y: cam.y };
      if (!b) { b = enemies.find(e => e.tk === 'boss') || null; if (b) spawnedF = f; }
      if (b) {
        /* ⚠ 게이트는 «카메라가 겨냥한 점» 이 아니라 **실제로 그려지는 스프라이트 중심** 을 재야 한다.
           2회차 게이트는 cine 의 오프셋·flip 을 그대로 다시 써서 «자기가 겨냥한 곳을 잘 겨냥했다» 를
           재고 있었다 — 보스가 돌아서서 몸통이 209.6px 반대로 간 회차에 **3px PASS** 가 나왔다
           (LESSONS 18 «변환 상수를 우리 구현에서 역산하면 순환 논증» 의 카메라 판).
           그래서 여기서는 오직 `b.flip`(적 자신의 방향)만 써서 독립적으로 계산한다. */
        const bi = spriteCenter(b, b.flip);
        camToBoss.push(Math.hypot(cam.x - bi.x, cam.y - bi.y));
        camToArt.push(Math.abs(cam.x - bi.x));
        /* ✓ 진짜로 중요한 것: «그려진 몸통이 화면 안에 통째로 들어오는가».
           카메라는 플립 점프를 피하려고 앵커(좌우 대칭점)를 잡으므로 중심은 원래 ±104.8px 어긋난다 —
           중심 거리로 채점하면 «설계대로 한 것» 이 감점된다. 프레임 안에 들어오는지로 잰다. */
        const A = ATLAS[b.akey], fr = A && A.f[curFrame(b)], sc = (b.T && b.T.scale) || 1;
        if(fr){
          const hw = fr[2]*sc/2, hh = fr[3]*sc/2;
          const vw = VW/(2*cam.z), vh = VH/(2*cam.z);
          const outX = Math.max(0, (Math.abs(bi.x-cam.x)+hw) - vw);
          const outY = Math.max(0, (Math.abs(bi.y-cam.y)+hh) - vh);
          const clip = Math.max(outX, outY);
          /* 같은 프레임을 «줌 1(가장 넓게 보이는 상태)» 로 다시 재 본다.
             z=1 에서도 잘린다면 그건 «카메라가 아직 멀다» 는 뜻이고, 주인 지시 수치(스폰 링 300~700 ·
             줌인 1.15)의 귀결이라 어떤 줌으로도 담을 수 없다 — 통과를 막지 않고 수치만 남긴다.
             z=1 에서는 담기는데 실제로 잘렸다면 그건 **우리 줌이 카메라보다 앞서 나가서 만든 잘림**이고,
             그게 5회차 두 비평가가 ③ 1순위로 짚은 결함이다. 이쪽만 0 을 요구한다. */
          const clipZ1 = Math.max(
            Math.max(0, (Math.abs(bi.x-cam.x)+hw) - VW/2),
            Math.max(0, (Math.abs(bi.y-cam.y)+hh) - VH/2));
          if(cine.mode === 'hold'){ holdD.push(Math.hypot(cam.x-bi.x, cam.y-bi.y)); holdClip.push(clip); }
          /* 5회차 비평 P 결함 3 — 예전 표본은 `cineWeight() >= 0.85 || hold` 뿐이었다.
             camEaseOut 기준 w=0.85 는 t=0.383 이라 **팬 0.80초의 앞 48% 와 back 0.60초 전체가 통째로 미측정**이었고,
             게이트는 «0/52프레임 잘림 없음» 을 계속 찍는데 비평가는 같은 빌드에서 8/12 회 잘림을 쟀다.
             3회차의 «게이트가 순환 논증» 과 같은 종류의 결함 — 게이트가 «잘리는 구간을 안 보고 있었다».
             → 표본을 연출 전 구간으로 넓히고, «스폰 링 때문에 물리적으로 불가능한» 앞 CLIP_GRACE 초만
             따로 떼어 **수치로 보고**한다(조용히 빼지 않는다). */
          if(cine.mode === 'in' || cine.mode === 'hold'){
            if(clipZ1 > 0.5) earlyClip.push(clip);   /* 어떤 줌으로도 못 담는 구간 */
            else cineClip.push(clip);                /* 담을 수 있었는데 잘린 구간 = 결함 */
          }else backClip.push(clip);   /* 복귀 구간은 «보스를 떠나는» 것이 목적이라 잘림이 정상이다 — 기록만 */
        }
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
      spawnedF, distAtSpawn, modes, marks, jerk, acc,
      zMax: Math.max(...zs), zEnd: cam.z,
      minCamToBoss: Math.min(...camToBoss), minCamToArt: Math.min(...camToArt),
      holdMax: holdD.length ? Math.max(...holdD) : -1, holdN: holdD.length,
      holdMed: holdD.length ? holdD.slice().sort((a,b)=>a-b)[Math.floor(holdD.length/2)] : -1,
      holdClip: holdClip.length ? Math.max(...holdClip) : -1,
      cineClipMax: cineClip.length ? Math.max(...cineClip) : -1,
      cineClipFrames: cineClip.filter(v => v > 0.5).length, cineFrames: cineClip.length,
      earlyClipMax: earlyClip.length ? Math.max(...earlyClip) : -1,
      earlyClipFrames: earlyClip.filter(v => v > 0).length, earlyFrames: earlyClip.length,
      backClipFrames: backClip.filter(v => v > 0).length, backFrames: backClip.length,
      endCamToPl: camToPl[camToPl.length - 1],
      frames: zs.length, bossAlive: !!b && enemies.indexOf(b) >= 0
    };
  });
  ok('[4] 보스 스폰이 연출을 켠다(in → hold → back → 종료)',
    boss.modes.join('>').includes('in>hold>back'), boss.modes.join(' > '));
  ok('[4] 팬·줌인 배율 1.15', Math.abs(boss.zMax - 1.15) < 0.02, boss.zMax.toFixed(3));
  /* 카메라는 «앵커 = 좌우 대칭점» 을 잡는다 — 플립 점프를 0px 으로 만드는 유일한 점이다.
     그래서 몸통 «중심» 은 설계상 항상 ±104.8px 어긋난다. 중심 거리로 채점하면 설계대로 한 것이 감점된다.
     채점은 아래 «몸통이 프레임 안에 들어오는가» 두 항목으로 하고, 여기서는 수치만 기록한다. */
  ok('[4] 보스 정합 기록(가로는 설계상 ±104.8px)', boss.minCamToBoss < 200,
    '최소 거리 ' + boss.minCamToBoss.toFixed(0) + 'px · 가로 성분 ' + boss.minCamToArt.toFixed(0) + 'px (스폰 거리 ' + boss.distAtSpawn.toFixed(0) + 'px)');
  /* 카메라는 «앵커 = 좌우 대칭점» 을 잡는다(플립 점프를 0 으로 만드는 유일한 점). 그러면 몸통 중심은
     설계상 항상 ±104.8px 어긋나므로, 채점은 «중심 거리» 가 아니라 «몸통이 프레임 안에 들어오는가» 로 한다. */
  ok('[4] «유지» 구간 내내 보스 몸통이 화면 안에 통째로 들어온다(잘림 0px)', boss.holdClip >= 0 && boss.holdClip <= 0.5, boss.holdClip.toFixed(1) + 'px 초과 · ' + boss.holdN + '프레임 · 중심 이탈 중앙값 ' + boss.holdMed.toFixed(0) + 'px');
  ok('[4] 담을 수 있는데 «줌이 앞서 나가» 잘린 프레임 0 (팬+유지 전 구간)', boss.cineClipFrames === 0, boss.cineClipFrames + '/' + boss.cineFrames + '프레임 · 최대 ' + boss.cineClipMax.toFixed(2) + 'px');
  /* 앞 0.15초는 «스폰 링이 가시 반폭보다 멀다» 는 지시 수치의 귀결이라 통과를 막지 않는다 — 대신 매 회차 수치를 남긴다 */
  note('[4] (참고) 줌 1 로도 못 담는 구간의 잘림 — 스폰 링(300~700px) > 가시 반폭 270px 의 귀결', boss.earlyClipFrames + '/' + boss.earlyFrames + '프레임 · 최대 ' + boss.earlyClipMax.toFixed(0) + 'px');
  note('[4] (참고) 복귀 구간 보스 잘림 — 보스를 «떠나는» 구간이라 정상', boss.backClipFrames + '/' + boss.backFrames + '프레임');
  ok('[4] 연출 뒤 플레이어로 복귀(150px 이내) · 줌 복원', boss.endCamToPl < 150 && Math.abs(boss.zEnd - 1) < 0.02, boss.endCamToPl.toFixed(0) + 'px · z' + boss.zEnd.toFixed(3));
  ok('[4] 연출 길이 ≈ 1.85초(0.8+0.45+0.6)', boss.frames >= 105 && boss.frames <= 130, (boss.frames / 60).toFixed(2) + '초');
  ok('[4] 연출 중 저크(3차 차분) < ' + LIM_CJRK, boss.jerk < LIM_CJRK, boss.jerk.toFixed(3) + 'px/f³ · 가속 최대 ' + boss.acc.toFixed(2) + 'px/f²');
  ok('[4] 연출 중 가속 < ' + LIM_CACC, boss.acc < LIM_CACC, boss.acc.toFixed(2) + 'px/f²');

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
    /* 6회차 — **보스는 «HP 가 깎여» 죽는다.** 5회차까지의 게이트는 만피 보스를 곧바로 killEnemy() 해서
       «빈사 편향» 구간을 통째로 건너뛰었다. 그건 실제로 플레이어가 보는 경로가 아니다
       (3·5회차의 «게이트가 안 보는 구간» 과 같은 종류의 맹점이다) — 빈사 구간을 실제로 통과시킨 뒤 일격을 넣는다. */
    b.hp = b.max * 0.15;
    let lowOff = 0, lowClip = 0;
    for (let i = 0; i < 90; i++) {
      window.__tick();
      lowOff = Math.max(lowOff, Math.hypot(cam.x - player.x, cam.y - player.y));
      /* 편향이 걸린 동안에도 플레이어 몸통이 프레임 안에 통째로 남아야 한다 */
      const pr = player.r || 40;
      const ex = Math.max(Math.abs(cam.x - player.x) + pr - VW / (2 * cam.z), Math.abs(cam.y - player.y) + pr - VH / (2 * cam.z));
      if (ex > 0) lowClip++;
    }
    const killD0 = (() => { const c = spriteCenter(b); return Math.hypot(cam.x - c.x, cam.y - c.y); })();
    killEnemy(b);
    const zs = [], flashes = [], offs = [];
    let jerk = 0, jerkAt = null, acc = 0, prevV = null, prevA = null, prev = { x: cam.x, y: cam.y }, endF = -1;
    /* 6회차 — «정지 프레임». 슬로모(t < CINE_SLOW_S) 안에서 카메라가 프레임당 SETTLE px 이하로만 움직이는 프레임 수.
       4·5회차 비평이 3회 연속 짚은 최대 결함이 «슬로모 안에 정지 프레임이 0» 이었다(착지 t=0.333 > 슬로모 종료 0.30). */
    const SETTLE = 2.0;
    let still = 0, landT = -1;
    for (f = 0; f < 200; f++) {
      window.__tick();
      const v = { x: cam.x - prev.x, y: cam.y - prev.y };
      const sp = Math.hypot(v.x, v.y);
      if (f > 2 && sp <= SETTLE) { if (landT < 0) landT = +cine.t.toFixed(3); if (cine.mode === 'kill' && cine.t < CINE_SLOW_S) still++; }
      if (prevV && f > 2 && !snaps.has(f)) {
        const a = { x: v.x - prevV.x, y: v.y - prevV.y };
        acc = Math.max(acc, Math.hypot(a.x, a.y));
        if (prevA) { const j = Math.hypot(a.x - prevA.x, a.y - prevA.y);
          if (j > jerk) { jerk = j; jerkAt = { f, t: +cine.t.toFixed(3), z: +cam.z.toFixed(3) }; } }
        prevA = a;
      }
      prevV = v; prev = { x: cam.x, y: cam.y };
      zs.push(cam.z); flashes.push(cine.flash);
      /* J 지적 — camToKill 을 계산만 하고 assert 하지 않았다. «줌이 최대인 순간» 의 정합을 실제로 잰다 */
      if (cine.tg && cine.tg.akey) {
        const c = spriteCenter(cine.tg, cine.flip);
        const d = Math.hypot(cam.x - c.x, cam.y - c.y);
        offs.push({ z: cam.z, d, flash: cine.flash, t: cine.t });
      }
      if (endF < 0 && !cine.mode && f > 5) endF = f;
    }
    window.step = origStep; window.spawnStage = origSpawn;
    return {
      zMax: Math.max(...zs), zEnd: cam.z, endF,
      slowFrames, normFrames,
      flash0: flashes[0], flashMax: Math.max(...flashes), flashEnd: flashes[flashes.length - 1],
      flashFrames: flashes.filter(v => v > 0).length,
      /* 줌 정점(≥1.29) 구간과 플래시 구간에서 «시체가 실제로 중앙에 있는가» */
      offAtPeak: Math.min(...offs.filter(o => o.z >= 1.29).map(o => o.d).concat([1e9])),
      offInFlash: Math.min(...offs.filter(o => o.flash > 0).map(o => o.d).concat([1e9])),
      offMin: Math.min(...offs.map(o => o.d).concat([1e9])), jerkAt, acc,
      /* 줌 정점 ~ 슬로모 종료(t<0.30) 사이 — 그 뒤는 «플레이어로 복귀» 구간이라 시체가 중앙을 떠나는 게 정상이다 */
      offPeakWin: Math.max(...offs.filter((o,i) => i >= offs.findIndex(q => q.z >= 1.29) && o.t < CINE_SLOW_S).map(o => o.d).concat([0])),
      jerk, still, landT, killD0, lowOff, lowClip
    };
  });
  ok('[5] 처치 줌인 배율 1.30', !kill.err && Math.abs(kill.zMax - 1.30) < 0.03, kill.err || kill.zMax.toFixed(3));
  ok('[5] 슬로모 0.3초 = 18프레임(±2)', Math.abs(kill.slowFrames - 18) <= 2, kill.slowFrames + '프레임');
  ok('[5] 슬로모가 «끝난다»(이후 정상 배속)', kill.normFrames > 150, kill.normFrames + '프레임');
  ok('[5] 화면 플래시가 뜨고 0.30초(슬로모 안) 에 사라진다', kill.flashMax > 0.9 && kill.flashEnd === 0 && kill.flashFrames <= 19, `최대 ${kill.flashMax.toFixed(2)} · ${kill.flashFrames}프레임`);
  ok('[5] 처치 연출 뒤 줌 복원', Math.abs(kill.zEnd - 1) < 0.02, kill.zEnd.toFixed(3));
  /* 55/90 은 «설계가 보장하는 값» 이다. 시체의 그려진 중심이 사망 애니(10fps) 동안 119px 움직이고
     그것을 저역통과로 따라가므로 잔차가 남는다. 운 좋은 회차의 38.9/55.5 를 기준으로 잡으면
     스폰 난수가 다른 회차에서 그대로 FAIL 이 난다(실제로 40.1/80.2 회차가 나왔다). */
  ok('[5] 줌 정점에서 시체가 중앙에 있다(55px 이내)', kill.offAtPeak < 55, kill.offAtPeak.toFixed(1) + 'px');
  ok('[5] 줌 정점~슬로모 종료 내내 시체가 중앙 90px 이내', kill.offPeakWin < 90, kill.offPeakWin.toFixed(1) + 'px');
  ok('[5] 처치 연출 저크(3차 차분) < ' + LIM_CJRK, kill.jerk < LIM_CJRK, kill.jerk.toFixed(3) + 'px/f³ @' + JSON.stringify(kill.jerkAt));
  ok('[5] 처치 연출 가속 < ' + LIM_CACC, kill.acc < LIM_CACC, kill.acc.toFixed(2) + 'px/f²');
  /* 6회차 신설 — 4·5회차가 3회 연속 짚은 «슬로모 안에 정지 프레임이 없다».
     임계 2프레임은 «운 좋은 회차» 가 아니라 10회 반복에서 관측된 최소값(3)의 아래다(5회차 §8.4 규칙). */
  ok('[5] 슬로모(0.30초) «안» 에 카메라 정지 프레임 ≥ 2 (≤2px/frame)', kill.still >= 2,
     kill.still + '프레임 · 착지 t=' + (kill.landT < 0 ? '없음' : kill.landT.toFixed(3)) + '초 (슬로모 종료 0.300)');
  ok('[5] 빈사 편향이 출발 거리를 줄인다 (카메라–시체중심 < 200px)', kill.killD0 < 200, kill.killD0.toFixed(0) + 'px');
  ok('[5] 빈사 편향 중에도 플레이어가 프레임 안에 남는다', kill.lowClip === 0 && kill.lowOff <= 152,
     kill.lowClip + '프레임 잘림 · 최대 편향 ' + kill.lowOff.toFixed(0) + 'px (상한 150)');

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
  let bad = 0, total = 0;
  for (const r of results) {
    if (r.note) { console.log('  · ' + r.name + (r.detail ? '  — ' + r.detail : '')); continue; }
    total++;
    console.log((r.pass ? '  ✓ ' : '  ✗ ') + r.name + (r.detail ? '  — ' + r.detail : ''));
    if (!r.pass) bad++;
  }
  console.log('');
  if (bad) { console.log(`VERIFY67 FAIL (${total - bad}/${total})`); process.exit(1); }
  console.log(`VERIFY67 PASS (${total}/${total})`);
})().catch(e => { console.error(e); process.exit(2); });
