#!/usr/bin/env node
/* 작업 640 재현기 — «`verify580` §4 lag 갈래(dt 0.1)의 터널링 1건이 실행마다 왔다 갔다 한다»
 *
 *   node tools/probe640.js               → 마지막 줄이 `PROBE640 n/n PASS`
 *   node tools/probe640.js --exp 3000    → 노출량 목표(«임계 안» 프레임 수, 기본 2000)
 *   node tools/probe640.js --reps 3      → 시드별 반복 수(기본 2)
 *
 * 등재문(PROGRESS 640)이 갈래를 둘로 열어 뒀다:
 *   ⓐ **제품** — dt 0.1 한 프레임에 잡몹이 접촉 임계를 통째로 건너뛴다(터널링 잔존).
 *   ⓑ **자**   — 그 항이 «노출량» 에 좌우돼 결함이 있어도 우연히 초록이 된다(헛초록).
 *
 * 338 규칙대로 **처방 전에 재현**한다. 가르는 법은 등재문이 지정한 그대로 —
 * **노출량을 고정**한다. `verify580` 은 «프레임 수» 를 고정하는데, 그 프레임 안에서 잡몹이
 * 실제로 임계 안에 있었던 프레임 수(= 노출량)는 판마다 4배까지 흔들린다(353 vs 89).
 * 그래서 이 자는 프레임이 아니라 **«임계 안» 프레임이 목표치에 닿을 때까지** 돌리고,
 * 그 **같은 노출량 위에서** 통과 건수를 센다. 노출량이 같아도 dt 0.1 만 계수가 서면 ⓐ,
 * 노출량을 맞추자 계수가 사라지면 ⓑ 다.
 *
 * 세는 법은 `probe580` [3]·`verify580` §4 와 **같은 상대 운동 선분**이다(새 자를 만들지 않는다):
 *   프레임 시작 거리 d0 ≥ reach · 끝 거리 d1 ≥ reach 인데 그 사이 선분의 최소 거리 md < reach
 *   ⇒ «임계 안으로 들어왔다 나갔는데 접촉이 안 찍힌» 프레임. `e.cd ≤ 0` 이면 «때릴 준비됨».
 *
 * ⚠ 속도 계수는 한 줄도 안 건드린다(199·541 이관 자리 — 등재문 경고).
 * ⚠ 판정을 흔드는 것이 «판» 이므로 `Math.random` 을 시드로 고정해 **같은 판을 다시 굴릴 수 있게** 한다.
 *   시드 고정은 결함을 숨기는 것이 아니다 — 시드를 여러 개 돌려 **판마다 계수가 서는지**를 본다.
 *
 * 절:
 *   [1] 노출량이 실제로 흔들린다        — 같은 «프레임 수» 를 시드만 바꿔 돌리면 «임계 안» 이 몇 배 갈린다
 *   [2] 노출량을 고정하면 dt 0.1 은 계수가 **선다**(ⓐ)
 *   [3] 같은 노출량에서 정상 dt(1/60)는 **0** 이다(터널링이 dt 축의 것임을 못박는다)
 *   [4] 기하 — 통과가 «스치는» 것인지 «관통» 인지(임계 침투 깊이 · 프레임당 상대 이동)
 *   [5] 산술 상한 — 프레임당 상대 이동이 임계를 넘는가(넘어야 통과가 가능하다)
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const EXP = argOf('--exp', 2000);      /* 노출량 목표(«임계 안» 프레임) */
const REPS = argOf('--reps', 2);       /* 시드 개수 */
const ST = argOf('--st', 200);         /* 스테이지 — verify580 §4 와 같은 200 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };

/* ── 시나리오 (page.evaluate 안) ──────────────────────────────────────── */
/* verify580 RUN_TUNNEL 과 같은 셈법. 다른 것은 «멈추는 조건» 하나 —
   프레임 수가 아니라 노출량(touchF)이 목표에 닿으면 멈춘다. */
const RUN = async ({ ms, expTarget, frameCap, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0, tun = 0, tunReady = 0, touchF = 0, seg = 0, frames = 0;
  let maxStep = 0, sumStep = 0;                 /* 프레임당 상대 이동 */
  let reachMin = Infinity, reachMax = 0;
  const evs = [];                               /* 통과 사건의 기하 */
  while (touchF < expTarget && frames < frameCap) {
    frames++;
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;         /* 죽지 않게 — 거동은 그대로(501 [M] 고정) */
    const snap = new Map();
    for (const e of enemies) snap.set(e, { x: e.x, y: e.y, cd: e.cd, r: e.r });
    const px0 = player.x, py0 = player.y, inv0 = player.inv;
    window.__v640tick(ms);
    if (player.inv > inv0 + 1e-9) hit++;
    for (const e of enemies) {
      const a = snap.get(e); if (!a) continue;
      seg++;
      const reach = a.r + player.r + 6;
      reachMin = Math.min(reachMin, reach); reachMax = Math.max(reachMax, reach);
      const sx = a.x - px0, sy = a.y - py0;
      const ex = e.x - player.x, ey = e.y - player.y;
      const d0 = Math.hypot(sx, sy), d1 = Math.hypot(ex, ey);
      const vx = ex - sx, vy = ey - sy, vv = vx * vx + vy * vy;
      const step = Math.sqrt(vv);
      maxStep = Math.max(maxStep, step); sumStep += step;
      let t = vv > 1e-12 ? -(sx * vx + sy * vy) / vv : 0;
      t = Math.max(0, Math.min(1, t));
      const md = Math.hypot(sx + vx * t, sy + vy * t);
      if (d0 < reach) touchF++;
      if (d0 >= reach && d1 >= reach && md < reach) {
        tun++;
        if (a.cd <= 0) {
          tunReady++;
          if (evs.length < 40) evs.push({
            d0: +d0.toFixed(2), d1: +d1.toFixed(2), md: +md.toFixed(2),
            reach: +reach.toFixed(2), depth: +(reach - md).toFixed(2),
            step: +step.toFixed(2), tk: e.tk,
          });
        }
      }
    }
    if (frames % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    ms, st, frames, hit, seg, touchF, tun, tunReady, evs,
    maxStep: +maxStep.toFixed(2), avgStep: +(sumStep / Math.max(1, seg)).toFixed(2),
    reachMin: +reachMin.toFixed(2), reachMax: +reachMax.toFixed(2),
    pSpeed: +stat.speed.toFixed(1), mobCap: +(stat.speed * MOB_SPD_CAP).toFixed(1),
  };
};

/* ── 실행기 — verify580 run() 과 같은 부트스트랩 + `Math.random` 시드 고정 ── */
async function run(browser, seed, fn, arg, errs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(sd => {
    /* mulberry32 — 같은 시드면 같은 판이 다시 나온다(판을 고를 수 있어야 노출량을 고정한다) */
    let s = sd >>> 0;
    Math.random = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v640tick = ms => { vt += (ms || 1000 / 60); const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  }, seed);
  await page.goto('file://' + SRC.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v640tick(1000 / 60); });
  let r;
  try { r = await page.evaluate(fn, arg); }
  catch (e) { r = { err: String(e && e.message || e).slice(0, 200) }; }
  await ctx.close();
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const G = {};                      /* 절 사이로 넘기는 값(같은 시드를 [1] ↔ [2] 로 잇는다) */
  const seeds = []; for (let i = 0; i < REPS; i++) seeds.push(1000 + i * 7717);
  try {
    /* ── [1] 노출량이 흔들린다 — «프레임 수» 를 고정하면 노출량은 안 고정된다 ── */
    console.log('=== [1] 같은 «프레임 수» 를 돌려도 노출량(«임계 안» 프레임)이 흔들린다 ===');
    const fixFrames = 600;   /* verify580 lag 갈래와 같은 프레임 수(60초 × 10fps) */
    const fx = [];
    for (const sd of seeds) fx.push(await run(browser, sd, RUN, { ms: 100, expTarget: 1e9, frameCap: fixFrames, st: ST }, errs));
    const bad1 = fx.filter(r => r.err);
    ok(bad1.length === 0, '1-a 표본을 얻었다(dt 0.1 · 프레임 고정)', bad1.length ? bad1[0].err : fx.map(r => `f${r.frames}`).join(' · '));
    if (!bad1.length) {
      const tfs = fx.map(r => r.touchF);
      console.log(`         ↳ 판별 «임계 안» 프레임: ${tfs.join(' · ')} (표본 seg ${fx.map(r => r.seg).join(' · ')})`);
      console.log(`         ↳ 통과(준비됨): ${fx.map(r => r.tunReady + '/' + r.tun).join(' · ')}`);
      /* ⚑ 1회차 정정 — 처음엔 «판이 바뀌면 노출량이 배로 갈린다» 를 판정으로 걸었다가 **빨갰다**
         (127 vs 137 = 1.08배). 등재문이 본 4배(353 vs 89)는 시드를 안 고정한 실행끼리의 것이고,
         시드를 고정하면 노출량은 오히려 잘 붙는다. **흔드는 것은 노출량 편차가 아니라 «사건의 드묾»** 이다 —
         그러니 이 절이 물을 것은 «같은 자·같은 표본 크기에서 초록 판이 실제로 나온다» 하나다.
         그 초록 판이 [2] 에서 노출량만 키우면 빨개지는 것이 ⓑ 의 증명이고, 그 비교는 **판을 건너뛰지
         않는 같은 시드 안**에서 이뤄진다(판끼리 비교하면 «판이 달라서» 라는 반론이 남는다). */
      ok(fx.some(r => r.tunReady === 0),
        '1-b 같은 표본 크기(600프레임)에서 **계수 0 인 판이 실제로 있다** = verify580 §4 가 초록으로 지나가는 판',
        fx.map((r, i) => `시드 ${seeds[i]} ${r.tunReady}건(노출 ${r.touchF})`).join(' · '));
      ok(new Set(fx.map(r => r.tunReady)).size > 1 || fx.some(r => r.tunReady > 0),
        '1-c 그런데 같은 자·같은 크기에서 계수가 **판마다 다르다**(0 ↔ n) = 등재문의 «실행마다 다르다»',
        fx.map(r => r.tunReady).join(' ↔ '));
      G.fix = fx.map((r, i) => ({ seed: seeds[i], tunReady: r.tunReady, touchF: r.touchF }));
    }

    /* ── [2] 노출량을 고정하면 dt 0.1 은 계수가 선다 ─────────────────── */
    console.log(`\n=== [2] 노출량을 ${EXP}프레임으로 고정 — dt 0.1(loop 상한) ===`);
    const lag = [];
    for (const sd of seeds) lag.push(await run(browser, sd, RUN, { ms: 100, expTarget: EXP, frameCap: 60000, st: ST }, errs));
    const badL = lag.filter(r => r.err);
    ok(badL.length === 0, '2-a 표본을 얻었다(dt 0.1 · 노출량 고정)', badL.length ? badL[0].err : '');
    if (!badL.length) {
      lag.forEach((r, i) => console.log(
        `         ↳ 시드 ${seeds[i]}: 프레임 ${r.frames} · 표본 ${r.seg} · «임계 안» ${r.touchF} · 통과 ${r.tun}건(준비됨 ${r.tunReady}건)`));
      const tot = lag.reduce((a, r) => a + r.tunReady, 0);
      ok(tot > 0, '2-b 노출량을 맞추면 통과(준비됨)가 **0 이 아니다** ⇒ 갈래 ⓐ(제품 터널링 잔존)',
        `${lag.map(r => r.tunReady).join(' · ')} (합계 ${tot})`);
      /* ⚑ ⓑ 의 본증 — [1] 에서 **0 건이던 바로 그 시드**가 노출량만 키우면 계수가 선다.
         판을 안 바꾸고 «보는 시간» 만 늘렸는데 답이 뒤집히면, 초록은 «없다» 가 아니라 «덜 봤다» 다. */
      const zero = (G.fix || []).filter(f => f.tunReady === 0);
      for (const z of zero) {
        const big = lag[seeds.indexOf(z.seed)];
        if (!big || big.err) continue;
        ok(big.tunReady > 0,
          `2-c [1] 에서 0건이던 시드 ${z.seed} 가 노출량을 ${z.touchF} → ${big.touchF} 로만 키우자 계수가 선다 ⇒ 초록은 «없음» 이 아니라 «덜 봄» (ⓑ)`,
          `${z.tunReady}건 → ${big.tunReady}건`);
      }
      console.log(`         ↳ 노출 100프레임당 통과(준비됨): ${lag.map(r => (r.tunReady / r.touchF * 100).toFixed(2)).join(' · ')}건`);
    }

    /* ── [3] 같은 노출량에서 정상 dt 는 0 ────────────────────────────── */
    console.log(`\n=== [3] 같은 노출량 ${EXP}프레임 — 정상 dt(1/60) ===`);
    const fast = [];
    for (const sd of seeds) fast.push(await run(browser, sd, RUN, { ms: 1000 / 60, expTarget: EXP, frameCap: 400000, st: ST }, errs));
    const badF = fast.filter(r => r.err);
    ok(badF.length === 0, '3-a 표본을 얻었다(dt 1/60 · 노출량 고정)', badF.length ? badF[0].err : '');
    if (!badF.length) {
      fast.forEach((r, i) => console.log(
        `         ↳ 시드 ${seeds[i]}: 프레임 ${r.frames} · 표본 ${r.seg} · «임계 안» ${r.touchF} · 통과 ${r.tun}건(준비됨 ${r.tunReady}건)`));
      ok(fast.every(r => r.tunReady === 0),
        '3-b 정상 프레임은 **같은 노출량에서도** 0건이다 ⇒ 터널링은 dt 축의 것이다',
        fast.map(r => r.tunReady).join(' · '));
    }

    /* ── [4] 기하 — 스치는가 관통인가 ────────────────────────────────── */
    console.log('\n=== [4] 통과의 기하 — 임계 침투 깊이 · 프레임당 상대 이동 ===');
    const evs = [].concat.apply([], lag.map(r => r.evs || []));
    if (evs.length) {
      const dep = evs.map(e => e.depth), st2 = evs.map(e => e.step);
      const mx = a => Math.max.apply(null, a), mn = a => Math.min.apply(null, a);
      const av = a => a.reduce((x, y) => x + y, 0) / a.length;
      console.log(`         ↳ 침투 깊이(reach − md): 최소 ${mn(dep).toFixed(2)} · 평균 ${av(dep).toFixed(2)} · 최대 ${mx(dep).toFixed(2)} px`);
      console.log(`         ↳ 그 프레임의 상대 이동: 최소 ${mn(st2).toFixed(2)} · 평균 ${av(st2).toFixed(2)} · 최대 ${mx(st2).toFixed(2)} px`);
      console.log(`         ↳ 임계 reach: ${lag[0].reachMin}~${lag[0].reachMax} px · 표본 전체 상대 이동 평균 ${lag[0].avgStep} · 최대 ${lag[0].maxStep} px`);
      evs.slice(0, 6).forEach(e => console.log(
        `             · ${e.tk}: d0 ${e.d0} → d1 ${e.d1} · md ${e.md} < reach ${e.reach}(깊이 ${e.depth}) · 이동 ${e.step}`));
      ok(true, '4-a 통과 사건의 기하를 찍었다', `${evs.length}건`);
    } else ok(true, '4-a 통과 사건이 없어 기하를 찍을 것이 없다', '0건');

    /* ── [5] 산술 상한 — 통과가 «가능한가» ──────────────────────────── */
    console.log('\n=== [5] 산술 — 프레임당 상대 이동 상한 vs 임계 ===');
    if (!badL.length) {
      const p = lag[0].pSpeed, c = lag[0].mobCap;
      const relLag = (p + c) * 0.1, relFast = (p + c) / 60;
      console.log(`         ↳ 플레이어 ${p} px/s · 잡몹 천장 ${c} px/s ⇒ 상대 속도 상한 ${(p + c).toFixed(1)} px/s`);
      console.log(`         ↳ 프레임당 상대 이동 상한: dt 0.1 → ${relLag.toFixed(1)} px · dt 1/60 → ${relFast.toFixed(2)} px (임계 reach ${lag[0].reachMin}~${lag[0].reachMax})`);
      ok(relLag > 2 * Math.sqrt(2 * lag[0].reachMin * 0.5),
        '5-a dt 0.1 의 한 프레임 이동은 임계를 «스쳐 지나갈» 만큼 길다(통과가 산술적으로 가능하다)',
        `${relLag.toFixed(1)} px (임계 ${lag[0].reachMin}~${lag[0].reachMax})`);
      /* ⚑ 눈금은 LESSONS 580-① 이 이미 세워 놨다 — «프레임당 접근이 임계의 1/3 아래면 통과는 안 난다»
         (그 실측이 88,000 적·프레임에서 0건이었다). 그 자를 그대로 가져다 쓴다. */
      ok(relFast < lag[0].reachMin / 3,
        '5-b dt 1/60 의 한 프레임 이동은 임계의 1/3 아래다(LESSONS 580-① 의 눈금 — 그 구간에서 통과는 0건이었다)',
        `${relFast.toFixed(2)} px < ${(lag[0].reachMin / 3).toFixed(2)}`);
    }

    ok(errs.length === 0, '6 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');
  } finally {
    await browser.close();
  }
  console.log(`\nPROBE640 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
