#!/usr/bin/env node
/* 작업 359 게이트 — «보스는 플레이어보다 살짝 느리고, 보스·일반 적이 대시 공격을 한다»
 *
 *   node tools/verify359.js   → 마지막 줄이 `VERIFY359 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-29):
 *   «보스들 스피드 좀 빨라지게. 보스는 플레이어보다 살짝 느리지만 대시 공격을 할수있게.
 *    그냥 적들도 대시 공격 하게»
 *
 * 재현은 `tools/probe359.js` 가 했다(338 규칙) — 수리 전 보스 평시 걸음은 플레이어의 ×1.06,
 * 대시 0회였고, 수리 후 ×0.93 · 대시 10회 · 대시 순간 ×3.6 이다.
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈 «한 항이 두 자리를 겸하면 한쪽이 사라져도 초록»):
 *   §1 소스   ⓐ `BOSS_CHASE` 는 1 아래(살짝 느림) · ⓑ 추격 바닥은 여전히 «플레이어 이속 × 비» 형태 ·
 *             ⓒ `DASH` 가 보스·몹 두 벌이고 값이 규격 안 · ⓓ **새 피해 경로가 없다**
 *             (대시 블록 어디에서도 `player.hp` 를 깎지 않는다 = 대시는 «접촉까지의 시간» 만 바꾼다).
 *   §2 평시   보스 평시 걸음(대시·예고·공격 모션이 안 걸친 프레임)의 **최고값**이 플레이어보다
 *             **빠르다** — ⚑ 501 이 뒤집은 축이다(아래 «501 이관» 절).
 *   §3 대시   ⓐ **대시 창이 열리면 대시가 나간다**(창 5번 중 ≥ 5회 — 501 이관) · ⓑ 돌진 순간 속도가 플레이어보다 **빠르다**(≥ ×2.5) ·
 *             ⓒ 예고 동안 «제자리»(프레임당 이동 0.05px 미만) · ⓓ 잠금 방향이 그 순간의 플레이어를
 *             겨눈다(코사인 ≥ 0.999) · ⓔ 돌진은 «접근» 이다(한 번마다 거리가 줄었다) ·
 *             ⓕ 대시 사이 간격이 쿨다운 하한 이상(폭주하지 않는다).
 *   §4 일반적 몹 필드 30마리에서도 대시가 일어나고(≥ 10회), 몹 대시도 «접근» 이다.
 *   §5 예산   **적 30 고정 씬의 프레임당 «작업량»**(캔버스 명령 수 · Math 호출 수) — 556 이
 *             «벽시계 ms ≤ 30» 에서 갈아 끼웠다(아래 `RUN_BUDGET` 머리말 · 237 선례).
 *             절대 시간은 `V359_PERF=1` 전용 러너에서만 판정한다.
 *   §R 되돌림 `DASH` 창을 닫은(min 을 사거리 밖으로 민) **소스 사본**에서 대시가 0회가 되고
 *             **창 시나리오의 접근이 느려진다** — 이게 없으면 «대시가 없어도 초록» 과 구별할 수 없다
 *             (LESSONS 232-① · 334 선례).
 *   §6 에러   pageerror 0건.
 *
 * ⚑ **501 이관(2026-08-31, 주인 보고 «보스가 너무 느려서 플레이어를 공격 못함»)** —
 *   359 의 «살짝 느리게» 결정을 주인이 뒤집었다(`BOSS_CHASE` 0.94 → 1.10). 두 항을 갈아 끼웠다:
 *     · §1-ⓐ «< 1» → **«≥ 1.05 이고 ≤ 1.15»**(66 이 실측한 «붙는 최소» 1.08 위 · «스쳐 지나감» 1.15 아래).
 *     · §2 «평시 걸음 < 플레이어» → **«최고 평시 걸음 ≥ 플레이어 × 1.05»**.
 *       ⚠ 이 항을 그냥 두면 **헛초록**이 된다 — 평시 «평균» 은 둔화·모서리 프레임 때문에
 *         수리 뒤에도 110px/s(<115)로 읽혀 게이트가 초록인 채 뜻만 잃는다(334 선례).
 *     · §3-ⓐ «30초에 ≥ 3회» → **창 시나리오**. 보스가 플레이어보다 빨라지자 melee 에 붙어
 *       `DASH.min`(60) 안에 머물러 창이 거의 안 열린다(실측 30초 9~10회 → **1회**).
 *       빈도는 구조적으로 못 지키므로 **«창이 열리면 나가는가»** 로 자를 바꿨다 —
 *       대시가 죽으면 여전히 빨개진다(§R 이 못박는다). 359 의 뜻(«예고 → 돌진» 이 산다)은 그대로다.
 *
 * 59 교훈 1 — 실시간을 기다리지 않는다(가상 시계 rAF · 고정 dt 1/60s).
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, ' ');   /* 주석을 뺀 사본 — 주석 속 옛 값에 안 걸리게 */
const SEC = Number(process.env.V359_SEC || 30);
const PERF_ABS = process.env.V359_PERF === '1';   /* 556 — 절대 시간 판정은 전용 러너 옵트인(237 선례) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

/* 보스 1:1 을 프레임 단위로 굴리며 대시의 «모든 국면» 을 찍는다 */
const RUN_BOSS = async ({ frames }) => {
  S.stage = 30; S.best = 30; S.bossFarm = false;
  spawnStage(); startBoss();
  const B = () => enemies.find(e => e.tk === 'boss');
  const reach = ETYPE.boss.r + player.r + 6;
  let tClose = -1, atk = 0, dashN = 0, wasDash = false, wasD = false;
  let walk = 0, walkN = 0, walkMax = 0, dashPeak = 0, telMax = 0, telN = 0;
  const lockCos = [], gain = [], gapSec = [];
  let lock = null, lastStart = null;
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) a.hp = a.max;
    bossT = 9999; player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    const cd0 = a ? a.cd : null, x0 = a ? a.x : 0, y0 = a ? a.y : 0;
    const d0 = a ? Math.hypot(player.x - a.x, player.y - a.y) : 0;
    const wasTel = a ? a.dashT > 0 : false;
    window.__v359tick();
    const b = B(); if (!b) { wasDash = false; wasD = false; continue; }
    if (cd0 !== null && b.cd > cd0) atk++;
    const havePrev = !!a && b === a;
    const mv = havePrev ? Math.hypot(b.x - x0, b.y - y0) : null;   /* 이번 프레임 이동량(px) */
    const inD = b.dashT > 0 || b.dashD > 0;
    if (inD && !wasDash) { dashN++; if (lastStart !== null) gapSec.push(+((f - lastStart) / 60).toFixed(2)); lastStart = f; }
    if (mv !== null && b.dashT > 0) { telMax = Math.max(telMax, mv); telN++; }
    if (mv !== null && b.dashD > 0) dashPeak = Math.max(dashPeak, mv * 60);
    if (mv !== null && !inD && b.atkT <= 0) { walk += mv * 60; walkN++; walkMax = Math.max(walkMax, mv * 60); }
    if (wasTel && b.dashD > 0 && !wasD) {          /* 예고 → 돌진으로 넘어간 «그» 프레임 */
      const tl = Math.hypot(player.x - x0, player.y - y0) || 1;
      lockCos.push(+(((player.x - x0) * b.dvx + (player.y - y0) * b.dvy) / tl).toFixed(4));
      lock = { d0 };
    }
    if (wasD && b.dashD <= 0 && lock) { gain.push(+(lock.d0 - Math.hypot(player.x - b.x, player.y - b.y)).toFixed(1)); lock = null; }
    wasD = b.dashD > 0; wasDash = inD;
    if (tClose < 0 && Math.hypot(player.x - b.x, player.y - b.y) <= reach + 20) tClose = f / 60;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { reach, tClose, atk, dashN, telN, telMax: +(telMax || 0).toFixed(3),
           walk: walkN ? +(walk / walkN).toFixed(1) : 0, walkN, walkMax: +walkMax.toFixed(1),
           dashPeak: +dashPeak.toFixed(1),
           pSpeed: +stat.speed.toFixed(1), lockCos, gain, gapSec };
};

/* 몹 필드 — 일반 적도 대시하는가 · 그 대시가 접근인가 · 프레임 예산 */
const RUN_MOB = async ({ frames }) => {
  S.stage = 30; S.best = 30; S.bossFarm = false;
  spawnStage();
  for (let i = 0; i < 30; i++) makeEnemy('zombie');
  let dashN = 0, closer = 0, dashDone = 0, peak = 0;
  const st = new Map();
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    player.hp = stat.maxHp; player.dead = 0;
    const pre = enemies.map(e => ({ e, x: e.x, y: e.y, d: Math.hypot(player.x - e.x, player.y - e.y), dD: e.dashD > 0 }));
    window.__v359tick();
    for (const p of pre) {
      const e = p.e;
      const inD = e.dashT > 0 || e.dashD > 0;
      const was = st.get(e) || {};
      if (inD && !was.in) dashN++;                                  /* 예고 시작 = «대시 한 벌» 의 시작 */
      /* «접근인가» 는 **돌진 구간**(dashD)만 잰다 — 예고 0.42초는 제자리로 서 있는 구간이라
         그동안 플레이어가 달아난 거리는 돌진의 성적이 아니다(233/234 의 «모션 표본» 과 같은 이유).
         1회차에 예고 시작점에서 재다가 76% 가 나왔다 — 자가 재는 자리가 틀렸던 것이다. */
      if (e.dashD > 0 && !p.dD) st.set(e, { in: true, run: p.d });   /* 돌진이 «시작된» 프레임 */
      else if (p.dD && e.dashD <= 0 && was.run !== undefined) {      /* 돌진이 «끝난» 프레임 */
        dashDone++; if (Math.hypot(player.x - e.x, player.y - e.y) < was.run - 1) closer++;
        st.set(e, { in: inD, run: undefined });
      } else st.set(e, { in: inD, run: was.run });
      if (p.dD) peak = Math.max(peak, Math.hypot(e.x - p.x, e.y - p.y) * 60);
    }
    if (enemies.length < 20) for (let i = enemies.length; i < 30; i++) makeEnemy('zombie');
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { dashN, dashDone, closer, peak: +peak.toFixed(1), nEnemy: enemies.length,
           msPerTick: +((performance.now() - t0) / frames).toFixed(3), pSpeed: +stat.speed.toFixed(1) };
};

/* 501 이관 — «대시 창» 시나리오. 보스가 플레이어보다 빨라지면 melee 에 붙어 `DASH.min` 안에
   머물러 창이 거의 안 열린다. 그래서 **창을 직접 열어** 두고 «그때 대시가 나가는가» 를 묻는다.
   창마다 보스를 300px(= min 60 < 300 < max 470) 밖으로 옮기고 WIN 프레임 동안 굴린다.
   ⚠ `dashCd` 는 **건드리지 않는다** — 손대면 §3-ⓕ(쿨다운이 실제로 걸린다)가 뜻을 잃는다.
   창 간격(2.5초)은 cd1 + tel + dur 보다 넉넉해 자연스럽게 한 번씩 준비된다. */
const RUN_DASHWIN = async ({ wins, win, dist }) => {
  S.stage = 30; S.best = 30; S.bossFarm = false;
  spawnStage(); startBoss();
  const B = () => enemies.find(e => e.tk === 'boss');
  /* ⚠ 보스는 «스폰 딜레이 1.4초» 뒤에 태어난다(19611 주석) — 그 전에 창을 열려 하면 대상이 없어
     첫 창에서 그대로 빠져나온다(1회차에 «대시 0회 / tHit 0s» 로 읽힌 자리다). 태어날 때까지 굴린다. */
  for (let g = 0; g < 900 && !B(); g++) window.__v359tick();
  for (let g = 0; g < 900 && (typeof bossIntro !== 'undefined' && bossIntro); g++) window.__v359tick();
  const reach = ETYPE.boss.r + player.r + 6;
  let dashN = 0, wasDash = false, wasD = false, dashPeak = 0, telN = 0, telMax = 0;
  const lockCos = [], gain = [], gapSec = [], tHit = [];
  let lock = null, lastStart = null, fAbs = 0;
  for (let w = 0; w < wins; w++) {
    const b0 = B(); if (!b0) break;
    const a = Math.random() * 6.283;
    b0.x = Math.max(60, Math.min(WORLD.w - 60, player.x + Math.cos(a) * dist));
    b0.y = Math.max(60, Math.min(WORLD.h - 60, player.y + Math.sin(a) * dist));
    let hit = -1;
    for (let f = 0; f < win; f++, fAbs++) {
      const p0 = B();
      if (p0) p0.hp = p0.max;
      bossT = 9999; player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
      const x0 = p0 ? p0.x : 0, y0 = p0 ? p0.y : 0;
      const d0 = p0 ? Math.hypot(player.x - p0.x, player.y - p0.y) : 0;
      const wasTel = p0 ? p0.dashT > 0 : false;
      window.__v359tick();
      const b = B(); if (!b) { wasDash = false; wasD = false; continue; }
      const mv = (p0 && b === p0) ? Math.hypot(b.x - x0, b.y - y0) : null;
      const inD = b.dashT > 0 || b.dashD > 0;
      if (inD && !wasDash) { dashN++; if (lastStart !== null) gapSec.push(+((fAbs - lastStart) / 60).toFixed(2)); lastStart = fAbs; }
      if (mv !== null && b.dashT > 0) { telMax = Math.max(telMax, mv); telN++; }
      if (mv !== null && b.dashD > 0) dashPeak = Math.max(dashPeak, mv * 60);
      if (wasTel && b.dashD > 0 && !wasD) {
        const tl = Math.hypot(player.x - x0, player.y - y0) || 1;
        lockCos.push(+(((player.x - x0) * b.dvx + (player.y - y0) * b.dvy) / tl).toFixed(4));
        lock = { d0 };
      }
      if (wasD && b.dashD <= 0 && lock) { gain.push(+(lock.d0 - Math.hypot(player.x - b.x, player.y - b.y)).toFixed(1)); lock = null; }
      wasD = b.dashD > 0; wasDash = inD;
      if (hit < 0 && Math.hypot(player.x - b.x, player.y - b.y) <= reach) hit = f / 60;
    }
    tHit.push(hit < 0 ? win / 60 : +hit.toFixed(2));   /* 못 닿았으면 «창 전체» 로 센다 */
    await new Promise(r => setTimeout(r, 0));
  }
  return { dashN, wins, dashPeak: +dashPeak.toFixed(1), telN, telMax: +(telMax || 0).toFixed(3),
           lockCos, gain, gapSec, tHit, tHitAvg: +(tHit.reduce((x, y) => x + y, 0) / (tHit.length || 1)).toFixed(2),
           pSpeed: +stat.speed.toFixed(1) };
};

/* ── §5 예산 — 556(2026-08-30) 이 축을 갈아 끼웠다 ───────────────────────────
   옛 자는 «RUN_MOB 30초의 벽시계 ms ≤ 30» 이었고 **같은 트리에서 빨강↔초록을 오갔다**.
   `probe556` 이 갈래 셋을 찍어 갈랐다(등재문 ⓐⓑⓒ):
     ⓐ 러너 — [현행] ms 는 회차 간 **16.6%**(23.6~28.0ms) 흔들리는데 판정선이 30 이라
        여유가 폭 안이다(237 이 `verify114` [8] 에서 겪은 것과 같은 병).
     ⓑ 표본 — 라벨은 «적 30마리» 인데 그 씬은 **80마리까지 자란다**(리필 규칙이 «20 아래일 때만»).
        표본이 안 고정된 자는 예산이 아니라 **개체 수**를 잰다(544 교훈).
     ⓒ 워밍업 — 앞 10% 가 나머지의 0.32배로 **더 싸다**. 워밍업이 아니라 ⓑ 의 «자라남» 이다.
   ⇒ 237 처방 그대로 **작업량 예산**으로 옮긴다. 씬은 `perf237.scene()` 과 같은 꼴로 고정하고
     (적 30 고정 · 불멸 · 링 150~330px = `DASH.mob` 창 120~380 안), 프레임당
     **캔버스 명령 수**(그림 몫)와 **Math 호출 수**(359 가 더한 «상태 기계» 몫)를 센다.
     실측 폭은 각각 1.1% · 0.4% 로 러너와 무관하다. 절대 ms 는 `V359_PERF=1` 옵트인.
   ⚠ 씬이 조용히 비면 «작업량이 작아서» 초록이 되는 헛초록이 생긴다(334 계열) —
     그래서 [전제] 로 **표본 고정 · 대시 발생 · 기준선 대비 하한**을 같이 묻는다. */
const BUDGET = { ops: 175, mops: 1300, opsFloor: 60, mopsFloor: 500, warm: 60, frames: 180 };
const RUN_BUDGET = async ({ warm, frames }) => {
  const CP = CanvasRenderingContext2D.prototype;
  const OPS = ['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText',
               'clearRect', 'putImageData', 'arc', 'ellipse', 'createRadialGradient', 'createLinearGradient'];
  const MOPS = ['hypot', 'atan2', 'sqrt', 'cos', 'sin', 'random', 'max', 'min', 'abs'];
  const cnt = { c: 0, m: 0 }, orig = {}, morig = {};
  const scene = n => {
    S.stage = 30; S.best = 30; S.bossFarm = false;
    try { sbufClear(); } catch (_) {}
    try { markDirty(); } catch (_) {}
    shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
    rings.length = 0; parts.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 99; player.hp = stat.maxHp;
    for (let i = 0; i < n; i++) makeEnemy('zombie');
    enemies.forEach((e, i) => {
      e.born = 1; e.hp = e.max = 1e12;
      const a = i * 6.283 / Math.max(1, n);
      e.x = player.x + Math.cos(a) * (150 + (i % 5) * 45);
      e.y = player.y + Math.sin(a) * (150 + (i % 5) * 45);
    });
  };
  /* 표본을 «정확히 n» 으로 유지한다 — 죽음·리필·전리품이 섞이면 그 순간 예산이 아니라 씬을 잰다 */
  const keep = n => {
    while (enemies.length > n) enemies.pop();
    for (let i = enemies.length; i < n; i++) makeEnemy('zombie');
    enemies.forEach(e => { if (e.hp < 1e11) e.hp = e.max = 1e12; });
    player.hp = stat.maxHp; player.dead = 0; player.inv = 99;
  };
  const roll = (n, f, count) => {
    scene(n);
    if (count) { cnt.c = 0; cnt.m = 0; }
    let dashN = 0, nMin = 1e9, nMax = 0; const seen = new Set();
    const t0 = performance.now();
    for (let i = 0; i < f; i++) {
      nMin = Math.min(nMin, enemies.length); nMax = Math.max(nMax, enemies.length);
      for (const e of enemies) {
        const inD = e.dashT > 0 || e.dashD > 0;
        if (inD && !seen.has(e)) { dashN++; seen.add(e); } else if (!inD) seen.delete(e);
      }
      step(1 / 60); draw(); keep(n);
    }
    return { ms: +((performance.now() - t0) / f).toFixed(3), dashN, nMin, nMax,
             ops: +(cnt.c / f).toFixed(1), mops: +(cnt.m / f).toFixed(1) };
  };
  roll(30, warm, false);                                     /* 워밍업 — 시간만, 세지 않는다 */
  const ms = roll(30, frames, false).ms;                     /* 절대 시간(참고 · 옵트인 판정) */
  const msBase = roll(0, Math.round(frames / 3), false).ms;
  OPS.forEach(k => { const f = CP[k]; if (typeof f !== 'function') return; orig[k] = f; CP[k] = function () { cnt.c++; return f.apply(this, arguments); }; });
  MOPS.forEach(k => { const f = Math[k]; if (typeof f !== 'function') return; morig[k] = f; Math[k] = function () { cnt.m++; return f.apply(Math, arguments); }; });
  const load = roll(30, frames, true);                       /* ⓐ 작업량 — 러너 무관 */
  const base = roll(0, Math.round(frames / 3), true);
  OPS.forEach(k => { if (orig[k]) CP[k] = orig[k]; });
  MOPS.forEach(k => { if (morig[k]) Math[k] = morig[k]; });
  return { ops: load.ops, mops: load.mops, opsBase: base.ops, mopsBase: base.mops,
           dashN: load.dashN, nMin: load.nMin, nMax: load.nMax, ms, msBase, frames };
};

async function openPage(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v359tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v359tick(); });
  return { page, ctx, errs };
}

(async () => {
  /* ── §1 소스 ──────────────────────────────────────────────────────── */
  console.log('=== §1 소스 ===');
  const chase = Number((CODE.match(/const BOSS_CHASE\s*=\s*([0-9.]+)/) || [])[1]);
  /* ⚑ 501 이관 — 주인이 «살짝 느리게» 를 뒤집었다. 아래 두 항은 그 뒤집은 축을 잰다. */
  ok(chase >= 1.05, '1-ⓐ `BOSS_CHASE` ≥ 1.05 — 501 이 뒤집었다(평시 걸음만으로도 붙는다)', 'BOSS_CHASE = ' + chase);
  ok(chase <= 1.15, '1-ⓐ 그리고 «스쳐 지나감» 위(≤ 1.15) — 66 이 1.15 에서 멀어짐 9.6% 를 실측했다', String(chase));
  ok(/Math\.max\(e\.sp,\s*stat\.speed\*BOSS_CHASE\)/.test(CODE),
    '1-ⓑ 추격 바닥은 여전히 «플레이어 이속 상수 × 비» 형태다(358 §5 와 같은 자리)');
  const dashSrc = (CODE.match(/const DASH\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  ok(/boss:\s*\{/.test(dashSrc) && /mob:\s*\{/.test(dashSrc), '1-ⓒ `DASH` 는 보스·몹 두 벌이다',
    dashSrc.replace(/\s+/g, ' ').slice(0, 150));
  const num = (kind, key) => Number(((dashSrc.match(new RegExp(kind + ':\\s*\\{[^}]*' + key + ':\\s*([0-9.]+)')) || [])[1]));
  ok(num('boss', 'spd') > 1 && num('mob', 'spd') > 1, '1-ⓒ 두 벌 다 돌진 속도가 플레이어 이속의 1배 초과다',
    `보스 ×${num('boss', 'spd')} · 몹 ×${num('mob', 'spd')}`);
  ok(num('boss', 'tel') > 0 && num('mob', 'tel') > 0, '1-ⓒ 두 벌 다 «예고» 가 있다(예고 없는 즉발 돌진 금지)',
    `보스 ${num('boss', 'tel')}s · 몹 ${num('mob', 'tel')}s`);
  ok(num('boss', 'min') < 76 + 20, '1-ⓒ 보스 대시 창의 아래끝은 사거리(76px) 언저리 밑이다 — 못 닿으면 달려든다',
    'min = ' + num('boss', 'min'));
  /* ⓓ 음성항 — 대시는 «새 피해» 를 만들지 않는다. 상태 기계 블록 안에 체력을 깎는 문장이 없어야 한다 */
  const dashBlk = (CODE.match(/const DK = isBoss \? DASH\.boss : DASH\.mob;[\s\S]*?let ax = dx\/d/) || [''])[0];
  ok(dashBlk.length > 100, '1-ⓓ 대시 상태 기계 블록을 찾았다', dashBlk.length + '자');
  ok(!/player\.hp\s*-=|hitEnemy\(|dmgNum\(/.test(dashBlk),
    '1-ⓓ 그 블록에 피해 문장이 없다 — 대시는 «접촉까지의 시간» 만 바꾼다(밸런스 계수 0줄)');

  const browser = await launch(chromium);
  let B = null, M = null, W = null, P = null, errs = [];
  try {
    await blk('§2·§3 보스', async () => {
      const h = await openPage(browser, SRC);
      B = await h.page.evaluate(RUN_BOSS, { frames: Math.round(SEC * 60) });
      errs = errs.concat(h.errs);
      await h.ctx.close();
    });

    /* ── §2 평시 걸음 ───────────────────────────────────────────────── */
    console.log('\n=== §2 평시 걸음 — ⚑ 501: 플레이어보다 빠르다 ===');
    if (B) {
      ok(B.walkN >= 200, '2 평시 표본이 충분하다', `${B.walkN} 프레임`);
      /* ⚠ **평균이 아니라 최고값**으로 잰다 — 둔화(스킬 ×0.55)·월드 모서리 프레임이 평균을
         115 아래로 끌어내려(실측 110px/s) «< 플레이어» 가 수리 뒤에도 초록이었다(334 계열 헛초록). */
      ok(B.walkMax >= B.pSpeed * 1.05, '2 보스 평시 걸음 **최고값** ≥ 플레이어 × 1.05 — 걸음만으로 붙는다',
        `${B.walkMax} ≥ ${(B.pSpeed * 1.05).toFixed(1)} px/s (평균 ${B.walk})`);
      ok(Math.abs(B.walkMax - B.pSpeed * chase) <= B.pSpeed * chase * 0.03,
        '2 그리고 그 최고값이 바로 «플레이어 이속 × BOSS_CHASE» 다(바닥이 실제로 걸린다)',
        `${B.walkMax} ↔ ${(B.pSpeed * chase).toFixed(1)} px/s`);
    }

    /* ── §3 대시 ────────────────────────────────────────────────────── */
    /* 501 이관 — 대시의 빈도는 «창이 열리는가» 에 달렸고, 창은 501 이후 melee 에서 거의 안 열린다.
       그래서 창을 직접 열어 두고 «그때 나가는가» 를 묻는다(위 머리말 §3-ⓐ 참조). */
    await blk('§3 대시 창', async () => {
      const h = await openPage(browser, SRC);
      W = await h.page.evaluate(RUN_DASHWIN, { wins: 5, win: 150, dist: 300 });
      errs = errs.concat(h.errs);
      await h.ctx.close();
    });
    console.log('\n=== §3 대시 공격(보스) ===');
    if (W) {
      ok(W.dashN >= W.wins, `3-ⓐ 대시 창(300px)을 ${W.wins}번 열면 대시가 ${W.wins}회 이상 나간다`,
        `${W.dashN}회 / 창 ${W.wins}번`);
      ok(W.dashPeak > W.pSpeed * 2.5, '3-ⓑ 돌진 순간 속도 > 플레이어 × 2.5', `${W.dashPeak} px/s (플레이어 ${W.pSpeed})`);
      ok(W.telN > 0 && W.telMax < 0.05, '3-ⓒ 예고 동안은 «제자리» 다', `예고 ${W.telN}프레임 · 최대 이동 ${W.telMax}px/프레임`);
      ok(W.lockCos.length > 0 && Math.min.apply(null, W.lockCos) >= 0.999,
        '3-ⓓ 잠금 방향이 그 순간의 플레이어를 겨눈다', `최저 코사인 ${W.lockCos.length ? Math.min.apply(null, W.lockCos) : '표본 없음'}`);
      ok(W.gain.length > 0 && W.gain.every(g => g > 0), '3-ⓔ 돌진은 «접근» 이다 — 한 번마다 거리가 줄었다',
        W.gain.join(' · ') + ' px');
      const cd0 = Number(((dashSrc.match(/boss:\s*\{[^}]*cd0:\s*([0-9.]+)/) || [])[1]));
      const gapMin = W.gapSec.length ? Math.min.apply(null, W.gapSec) : 99;
      ok(gapMin >= cd0, `3-ⓕ 대시가 폭주하지 않는다(간격 ≥ cd0 ${cd0}초 — 쿨다운이 실제로 걸린다)`,
        `최소 간격 ${gapMin}s · 간격 ${W.gapSec.join('/')}`);
    }
    if (B) {
      ok(B.tClose >= 0, '3 그리고 «붙는다»', B.tClose < 0 ? '한 번도 못 붙음' : B.tClose.toFixed(1) + 's');
      ok(B.atk >= 3, '3 붙어서 실제로 때린다', B.atk + '회');
    }

    /* ── §4 일반 적 · §5 예산 ───────────────────────────────────────── */
    await blk('§4·§5 몹', async () => {
      const h = await openPage(browser, SRC);
      M = await h.page.evaluate(RUN_MOB, { frames: Math.round(SEC * 60) });
      errs = errs.concat(h.errs);
      await h.ctx.close();
    });
    console.log('\n=== §4 일반 적도 대시한다 ===');
    if (M) {
      ok(M.dashN >= 10, `4 몹 30마리 ${SEC}초에 대시 ≥ 10회`, M.dashN + '회');
      ok(M.dashDone > 0 && M.closer / M.dashDone >= 0.8, '4 몹 대시도 «접근» 이다(끝난 대시의 80% 이상이 거리를 줄였다)',
        `${M.closer}/${M.dashDone}`);
      ok(M.peak > M.pSpeed, '4 몹 돌진 순간 속도도 플레이어보다 빠르다', `${M.peak} px/s`);
    }

    /* ── §5 예산 — 556 이 «벽시계» 에서 «작업량» 으로 갈아 끼운 절(위 RUN_BUDGET 머리말) ── */
    console.log('\n=== §5 예산 — 적 30 고정 씬의 프레임당 작업량(러너 무관) ===');
    await blk('§5 예산', async () => {
      const h = await openPage(browser, SRC);
      P = await h.page.evaluate(RUN_BUDGET, { warm: BUDGET.warm, frames: BUDGET.frames });
      errs = errs.concat(h.errs);
      await h.ctx.close();
    });
    if (P) {
      /* [전제] — 씬이 조용히 비면 작업량이 작아져 «그냥 초록» 이 된다(334 계열 헛초록) */
      ok(P.nMin === 30 && P.nMax === 30, '5-전제-a 표본이 고정돼 있다 — 매 프레임 정확히 적 30마리',
        `${P.nMin}~${P.nMax}마리`);
      ok(P.dashN > 0, '5-전제-b 그 씬에서 대시가 실제로 일어난다(빈 씬을 재는 게 아니다)', P.dashN + '회');
      ok(P.ops >= BUDGET.opsFloor && P.mops >= BUDGET.mopsFloor,
        `5-전제-c 작업량이 «적 0» 기준선보다 한참 위다(하한 명령 ${BUDGET.opsFloor} · Math ${BUDGET.mopsFloor})`,
        `명령 ${P.ops} (기준선 ${P.opsBase}) · Math ${P.mops} (기준선 ${P.mopsBase})`);
      /* [주 판정] — 실측 폭 명령 1.1% · Math 0.4%(probe556). 예산은 실측 최대 위 약 +20% */
      ok(P.ops <= BUDGET.ops, `5-a 프레임당 캔버스 명령 ≤ ${BUDGET.ops}(그림 몫)`, String(P.ops));
      ok(P.mops <= BUDGET.mops, `5-b 프레임당 Math 호출 ≤ ${BUDGET.mops}(틱 «상태 기계» 몫 — 359 가 더한 것)`,
        String(P.mops));
      /* 절대 시간은 러너 부하가 통째로 실린다(폭 16.6%) — 전용 러너에서만 판정한다(237 선례) */
      if (PERF_ABS) ok(P.ms <= 30, `[V359_PERF] 절대 틱 ${P.ms}ms ≤ 30ms(적 30 고정 씬)`);
      else console.log(`  (참고) 절대 틱 ${P.ms}ms · 기준선 ${P.msBase}ms — 판정하려면 V359_PERF=1`);
    }

    /* ── §R 되돌림 ──────────────────────────────────────────────────── */
    console.log('\n=== §R 되돌림 시험 — 대시 창을 닫으면 빨개진다 ===');
    await blk('§R', async () => {
      const off = RAW.replace(/(boss:\s*\{[^}]*min:)\s*[0-9.]+/, '$1 99999').replace(/(mob:\s*\{[^}]*min:)\s*[0-9.]+/, '$1 99999');
      ok(off !== RAW, 'R0 되돌림 사본이 실제로 만들어졌다(대시 창을 닫았다)');
      const p = path.join(ROOT, '.v359-nodash.html');
      fs.writeFileSync(p, off);
      try {
        const h = await openPage(browser, p);
        /* 501 이관 — 되돌림도 **창 시나리오**로 잰다. 501 이후 melee 의 첫 접촉은 «걸음» 이 만들어
           대시를 꺼도 거의 안 달라지기 때문이다(그대로 두면 §R 이 «대시가 없어도 초록» 이 된다). */
        const r = await h.page.evaluate(RUN_DASHWIN, { wins: 5, win: 150, dist: 300 });
        await h.ctx.close();
        ok(r.dashN === 0, 'R1 그 사본에서는 대시가 0회다(§3-ⓐ 가 빨개진다)', r.dashN + '회');
        ok(W && r.tHitAvg > W.tHitAvg,
          'R2 그리고 300px 밖에서 사거리 안으로 드는 데 더 걸린다 — «대시가 붙여 준다» 의 증거',
          `대시 없음 ${r.tHitAvg}s ↔ 대시 있음 ${W ? W.tHitAvg : '?'}s`);
        ok(r.gain.length === 0, 'R3 «접근한 돌진» 표본도 0건이다', r.gain.length + '건');
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });

    /* ── §R4 주입 시험 — 556. «자를 무르게 풀지 않았다» 를 못박는 자리 ─────────────
       옛 §5(벽시계)는 회귀를 놓쳤다: `probe556 --inject 1` 이 대시 상태 기계에 적·프레임당
       작업을 400회 넣자 [현행] 씬의 작업량이 **×5.8**(Math 4,610 → 26,850/프레임)이 됐는데도
       벽시계는 **더 낮게**(22.5~23.7ms → 19.0~20.6ms) 읽혔다 = 러너 폭 안에 묻힌다.
       새 자는 같은 회귀에서 빨개져야 한다 — 그것을 여기서 실제로 굴려 보인다(LESSONS 132·237). */
    console.log('\n=== §R4 주입 시험 — 대시 블록이 무거워지면 §5 가 빨개진다 ===');
    await blk('§R4', async () => {
      const anchor = 'const DK = isBoss ? DASH.boss : DASH.mob;';
      ok(RAW.indexOf(anchor) >= 0, 'R4-0 주입 앵커(대시 상태 기계 입구)를 찾았다');
      const heavy = RAW.replace(anchor, anchor + ' for (let __i = 0; __i < 200; __i++) Math.hypot(__i, e.x, e.y);');
      const p = path.join(ROOT, '.v359-heavy.html');
      fs.writeFileSync(p, heavy);
      try {
        const h = await openPage(browser, p);
        const r = await h.page.evaluate(RUN_BUDGET, { warm: 30, frames: 90 });
        await h.ctx.close();
        ok(r.mops > BUDGET.mops, `R4-1 무거워진 사본은 Math 예산(${BUDGET.mops})을 넘는다 — 자가 실제로 문다`,
          `${r.mops} /프레임 (청정 ${P ? P.mops : '?'})`);
        ok(P && r.mops > P.mops * 3, 'R4-2 그리고 그 차이는 러너 잡음이 아니라 «3배 위» 다',
          P ? `${r.mops} ↔ ${P.mops}` : '청정 측정 없음');
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== §6 에러 ===');
  ok(errs.length === 0, '6 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  if (B) {
    console.log('\n| 항목 | 값 |');
    console.log('|---|---|');
    console.log(`| 플레이어 이동 속도 | ${B.pSpeed} px/s |`);
    console.log(`| 보스 평시 걸음 | ${B.walk} px/s (×${(B.walk / B.pSpeed).toFixed(2)}) |`);
    console.log(`| 보스 돌진 순간 최고 | ${B.dashPeak} px/s (×${(B.dashPeak / B.pSpeed).toFixed(2)}) |`);
    console.log(`| 보스 대시 · 공격 | ${B.dashN}회 · ${B.atk}회 / ${SEC}초 |`);
    console.log(`| 첫 접촉 | ${B.tClose < 0 ? '없음' : B.tClose.toFixed(1) + 's'} |`);
    if (M) console.log(`| 몹 대시(30마리) | ${M.dashN}회 · 접근 ${M.closer}/${M.dashDone} |`);
    if (P) console.log(`| §5 작업량(적 30 고정) | 명령 ${P.ops}/프레임 · Math ${P.mops}/프레임 (기준선 ${P.opsBase}·${P.mopsBase}) |`);
    if (P) console.log(`| §5 절대 시간(참고) | ${P.ms}ms · 기준선 ${P.msBase}ms |`);
  }
  console.log(`\nVERIFY359 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
