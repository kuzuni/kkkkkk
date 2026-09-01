#!/usr/bin/env node
/* 작업 580 재현자 — «이동 속도를 2배로 하면 무엇이 따라오지 않는가»
 *
 *   node tools/probe580.js            → 마지막 줄이 `PROBE580 n/n PASS`
 *   node tools/probe580.js --sec 30   → 구간 길이(기본 60초)
 *
 * 저장소 주인 지시(2026-08-31): «적이랑 플레이어 이동속도 지금의 2배로 하기».
 *
 * 338 규칙 — **처방 전에 재현한다.** 등재문이 이 행의 «본체» 로 지목한 것은 배수 자체가 아니라
 * ② «속도만 2배가 되면 닿는 판정이 못 따라간다(터널링)» 이다. 114 가 투사체에서 겪은 그 병을
 * 이동에서도 겪는지 **실제 전투를 굴려** 확인하는 것이 이 자의 일이다.
 *
 * 재는 법 — 한 나무에서 **두 배율의 사본**을 만들어(SC=1 ↔ SC=2) 같은 시나리오를 굴린다.
 * 사본은 상수 두 줄만 갈아 끼운다(115·110 은 358·502 가 적어 둔 «원본» 값이다) —
 * 그래서 이 자는 수리 **전 나무에서도 후 나무에서도** 똑같이 돈다.
 *
 *   [1] 상수    실효 `stat.speed` · 잡몹 천장 · 스폰 표본 최고 이속
 *   [2] 임계    프레임당 이동량 ↔ 접촉 임계(`e.r + player.r + 6`) — dt 두 값
 *               (**1/60 = 정상 프레임** · **0.1 = loop 의 dt 상한** = 합법적인 최악 프레임)
 *   [3] 터널링  잡몹 구간 60초 — «한 프레임 안에 임계 안으로 들어왔다 나갔는데 접촉이 안 찍힌» 건수.
 *               상대 운동(적 이동 − 플레이어 이동) 선분의 **최소 거리**로 잰다. 프레임 시작 거리와
 *               끝 거리가 둘 다 임계 밖인데 사이가 안이면 «통과» 다. 때릴 준비(`e.cd <= 0`)가
 *               돼 있던 것만 센다 — 쿨다운 중의 통과는 원래 안 때리는 것이라 결함이 아니다.
 *   [4] 체감    잡몹 구간 피격/초 · 처치 수 · 보스전 30초 접촉 수 · 첫 접촉 시각 (199 넘길 표)
 *
 * ⚠ 이 자는 **채점하지 않는다**(제품이 어때야 한다고 말하지 않는다). 판정은 `verify580` 이 한다.
 *   여기의 ok/FAIL 은 «표본을 얻었는가» 뿐이다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const argSec = process.argv.indexOf('--sec');
const SEC = argSec > 0 ? Number(process.argv[argSec + 1]) : Number(process.env.P580_SEC || 60);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };

/* ── 배율 사본 ─────────────────────────────────────────────────────────
   358·502 가 적어 둔 «원본» 값 115 · 110 위에 배율을 직접 박는다.
   선언의 **모양**(리터럴이냐 식이냐)에 안 기대므로 수리 전·후 나무에서 똑같이 만들어진다. */
const PLAYER_BASE = 115, MOB_BASE = 110;
function mk(sc) {
  let s = RAW.replace(/const PLAYER_SPEED\s*=\s*[^;]+;/, `const PLAYER_SPEED = ${PLAYER_BASE * sc};`);
  s = s.replace(/const MOB_SPD_BASE\s*=\s*[^;]+;/, `const MOB_SPD_BASE = ${MOB_BASE * sc};`);
  return s;
}

/* ── 시나리오 ─────────────────────────────────────────────────────────── */

/* [1]+[2] 상수·임계 — 전투를 안 굴리고 표만 뽑는다 */
const RUN_CONST = async ({ dts }) => {
  const types = ['zombie', 'goblin', 'dark'];
  const keep = enemies.slice();
  const rows = [];
  S.stage = 200; S.best = 200;
  for (const tk of types) {
    enemies.length = 0;
    for (let i = 0; i < 200; i++) makeEnemy(tk);
    const sp = enemies.map(e => e.sp);
    const r = enemies[0].r;
    rows.push({
      tk, r: +r.toFixed(2),
      reach: +(r + player.r + 6).toFixed(2),
      spMax: +Math.max.apply(null, sp).toFixed(2),
      spAvg: +(sp.reduce((a, b) => a + b, 0) / sp.length).toFixed(2),
    });
  }
  enemies.length = 0; keep.forEach(e => enemies.push(e));
  const out = [];
  for (const dt of dts) {
    for (const r of rows) {
      /* 한 프레임에 서로 다가설 수 있는 최대 거리 = (플레이어 + 적) × dt.
         적 쪽은 «걸음» 과 «돌진»(DASH.mob.spd 배) 둘 다 본다. */
      const walk = (stat.speed + r.spMax) * dt;
      const dash = (stat.speed + stat.speed * DASH.mob.spd) * dt;
      out.push({ dt, tk: r.tk, reach: r.reach, walk: +walk.toFixed(2), dash: +dash.toFixed(2),
        walkOver: walk > r.reach, dashOver: dash > r.reach });
    }
  }
  const bReach = ETYPE.boss.r + player.r + 6;
  return {
    pSpeed: +stat.speed.toFixed(2),
    cap: +(stat.speed * MOB_SPD_CAP).toFixed(2),
    playerR: +player.r.toFixed(2),
    rows, frames: out,
    bossDash: dts.map(dt => ({ dt, reach: +bReach.toFixed(2),
      move: +((stat.speed + stat.speed * DASH.boss.spd) * dt).toFixed(2) })),
  };
};

/* [3]+[4] 잡몹 구간 — 터널링·피격·처치 */
const RUN_MOB = async ({ frames, st, ms }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0, swing = 0, tun = 0, tunReady = 0, touchF = 0, seg = 0;
  let minGapSum = 0, minGapN = 0;
  for (let f = 0; f < frames; f++) {
    /* 잡몹 구간을 끝까지 유지한다(501 [M] 과 같은 고정) */
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;                 /* 501 [M] 과 같은 고정 — 죽지 않게, 거동은 그대로 */
    const snap = new Map();
    for (const e of enemies) snap.set(e, { x: e.x, y: e.y, cd: e.cd, r: e.r });
    const px0 = player.x, py0 = player.y, inv0 = player.inv;
    window.__p580tick(ms);
    if (player.inv > inv0 + 1e-9) hit++;
    const px1 = player.x, py1 = player.y;
    for (const e of enemies) {
      const a = snap.get(e);
      if (!a) continue;
      seg++;
      if (e.cd > a.cd) swing++;
      const reach = a.r + player.r + 6;
      /* 상대 운동 선분 — 시작 (e0−p0), 끝 (e1−p1) */
      const sx = a.x - px0, sy = a.y - py0;
      const ex = e.x - px1, ey = e.y - py1;
      const d0 = Math.hypot(sx, sy), d1 = Math.hypot(ex, ey);
      const vx = ex - sx, vy = ey - sy;
      const vv = vx * vx + vy * vy;
      let t = vv > 1e-12 ? -(sx * vx + sy * vy) / vv : 0;
      t = Math.max(0, Math.min(1, t));
      const md = Math.hypot(sx + vx * t, sy + vy * t);
      minGapSum += md; minGapN++;
      if (d0 < reach) touchF++;
      /* «통과» = 프레임 시작·끝은 둘 다 임계 밖인데 사이가 안이다.
         접촉 판정은 **프레임 시작 거리**(d0)로만 도므로 이 프레임에는 한 번도 안 찍힌다. */
      if (d0 >= reach && d1 >= reach && md < reach) {
        tun++;
        if (a.cd <= 0) tunReady++;   /* 때릴 준비가 돼 있었는데 통과한 것만 결함 후보다 */
      }
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    st, ms, hit, swing, seg, touchF, tun, tunReady,
    hps: +(hit / (frames * ms / 1000)).toFixed(3),
    minGap: minGapN ? +(minGapSum / minGapN).toFixed(1) : 0,
    pSpeed: +stat.speed.toFixed(1),
  };
};

/* [4] 보스전 — 접촉 수·첫 접촉 */
const RUN_BOSS = async ({ frames, st, ms }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage(); startBoss();
  for (let g = 0; g < 900 && bossIntro; g++) window.__p580tick(1000 / 60);
  const B = () => enemies.find(e => e.tk === 'boss');
  const b0 = B();
  const reach = (b0 ? b0.r : ETYPE.boss.r) + player.r + 6;
  let swing = 0, hit = 0, dashN = 0, tClose = -1, tun = 0, wasD = false;
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) a.hp = a.max;
    bossT = 9999; player.dead = 0;
    for (const e of enemies) e.dmg = 0;                 /* 501 [B] 와 같은 고정 */
    const cd0 = a ? a.cd : null, x0 = a ? a.x : 0, y0 = a ? a.y : 0;
    const px0 = player.x, py0 = player.y, inv0 = player.inv;
    window.__p580tick(ms);
    const b = B(); if (!b) continue;
    b.hp = b.max;
    if (player.inv > inv0 + 1e-9) hit++;
    if (cd0 !== null && b.cd > cd0) swing++;
    const inD = b.dashT > 0 || b.dashD > 0;
    if (inD && !wasD) dashN++;
    wasD = inD;
    if (a && b === a) {
      const sx = x0 - px0, sy = y0 - py0;
      const ex = b.x - player.x, ey = b.y - player.y;
      const d0 = Math.hypot(sx, sy), d1 = Math.hypot(ex, ey);
      const vx = ex - sx, vy = ey - sy, vv = vx * vx + vy * vy;
      let t = vv > 1e-12 ? -(sx * vx + sy * vy) / vv : 0;
      t = Math.max(0, Math.min(1, t));
      const md = Math.hypot(sx + vx * t, sy + vy * t);
      if (d0 >= reach && d1 >= reach && md < reach && cd0 <= 0) tun++;
      if (tClose < 0 && d0 <= reach) tClose = f * ms / 1000;
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, ms, swing, hit, dashN, tun, tClose: +tClose.toFixed(2),
    hps: +(hit / (frames * ms / 1000)).toFixed(3), pSpeed: +stat.speed.toFixed(1) };
};

/* ── 실행기 ─────────────────────────────────────────────────────────── */
async function runOne(browser, file, fn, arg, errs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__p580tick = (ms) => { vt += (ms || 1000 / 60); const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__p580tick(1000 / 60); });
  let r;
  try { r = await page.evaluate(fn, arg); }
  catch (e) { r = { err: String(e && e.message || e).slice(0, 200) }; }
  await ctx.close();
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const files = {};
  const R = { 1: {}, 2: {} };
  try {
    for (const sc of [1, 2]) {
      const p = path.join(ROOT, `.p580-sc${sc}-${process.pid}.html`);
      fs.writeFileSync(p, mk(sc));
      files[sc] = p;
    }
    for (const sc of [1, 2]) {
      const f = files[sc];
      R[sc].C = await runOne(browser, f, RUN_CONST, { dts: [1 / 60, 0.1] }, errs);
      R[sc].M60 = await runOne(browser, f, RUN_MOB, { frames: SEC * 60, st: 200, ms: 1000 / 60 }, errs);
      R[sc].Mlag = await runOne(browser, f, RUN_MOB, { frames: Math.round(SEC * 10), st: 200, ms: 100 }, errs);
      R[sc].B = await runOne(browser, f, RUN_BOSS, { frames: 30 * 60, st: 50, ms: 1000 / 60 }, errs);
    }
  } finally {
    await browser.close();
    for (const sc of [1, 2]) { try { fs.unlinkSync(files[sc]); } catch (e) {} }
  }

  /* ── [1] 상수 ── */
  console.log('=== [1] 상수 — 배율이 어디까지 따라가는가 ===');
  for (const sc of [1, 2]) {
    const c = R[sc].C;
    ok(c && !c.err, `1 SC=${sc} 상수 표본을 얻었다`, c && !c.err
      ? `플레이어 ${c.pSpeed} · 잡몹 천장 ${c.cap} · player.r ${c.playerR}` : (c && c.err));
  }
  if (!R[1].C.err && !R[2].C.err) {
    ok(Math.abs(R[2].C.pSpeed / R[1].C.pSpeed - 2) < 1e-6, '1 플레이어 이속이 정확히 2배다',
      `${R[1].C.pSpeed} → ${R[2].C.pSpeed}`);
    console.log('\n| 타입 | r | 접촉 임계 | SC1 최고 이속 | SC2 최고 이속 |');
    console.log('|---|---|---|---|---|');
    for (const r1 of R[1].C.rows) {
      const r2 = R[2].C.rows.find(x => x.tk === r1.tk);
      console.log(`| ${r1.tk} | ${r1.r} | ${r1.reach} | ${r1.spMax} | ${r2.spMax} |`);
    }
  }

  /* ── [2] 임계 ── */
  console.log('\n=== [2] 프레임당 이동량 ↔ 접촉 임계 (dt = 1/60 정상 · 0.1 = loop 상한) ===');
  console.log('| SC | dt | 타입 | 임계 | 걸음 접근/프레임 | 돌진 접근/프레임 | 넘김 |');
  console.log('|---|---|---|---|---|---|---|');
  let over = [];
  for (const sc of [1, 2]) {
    const c = R[sc].C; if (!c || c.err) continue;
    for (const f of c.frames) {
      const flag = f.dashOver ? '돌진 ⚠' : (f.walkOver ? '걸음 ⚠' : '—');
      if (f.dashOver || f.walkOver) over.push(`SC${sc} dt${+f.dt.toFixed(4)} ${f.tk}`);
      console.log(`| ${sc} | ${+f.dt.toFixed(4)} | ${f.tk} | ${f.reach} | ${f.walk} | ${f.dash} | ${flag} |`);
    }
    for (const b of c.bossDash) console.log(`| ${sc} | ${+b.dt.toFixed(4)} | boss(돌진) | ${b.reach} | — | ${b.move} | ${b.move > b.reach ? '⚠' : '—'} |`);
  }
  ok(true, '2 산술상 «임계를 넘는 프레임» 목록', over.length ? over.join(' · ') : '없음(두 배율 · 두 dt 전부)');

  /* ── [3] 터널링 ── */
  console.log('\n=== [3] 터널링 — 실제 전투에서 «통과했는데 접촉 0» ===');
  console.log('| SC | dt | 표본(적·프레임) | 임계 안 프레임 | 통과 | 그중 때릴 준비됨 | 평균 최소거리 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const sc of [1, 2]) for (const k of ['M60', 'Mlag']) {
    const m = R[sc][k];
    if (!m || m.err) { ok(false, `3 SC=${sc} ${k} 표본을 못 얻었다`, m && m.err); continue; }
    console.log(`| ${sc} | ${k === 'M60' ? '1/60' : '0.1'} | ${m.seg} | ${m.touchF} | ${m.tun} | ${m.tunReady} | ${m.minGap} |`);
  }
  for (const sc of [1, 2]) {
    const m = R[sc].M60;
    if (m && !m.err) ok(true, `3 SC=${sc} 정상 프레임(1/60) 터널링`, `통과 ${m.tun}건 · 때릴 준비됨 ${m.tunReady}건 / 표본 ${m.seg}`);
  }
  for (const sc of [1, 2]) {
    const m = R[sc].Mlag;
    if (m && !m.err) ok(true, `3 SC=${sc} 최악 프레임(dt 0.1) 터널링`, `통과 ${m.tun}건 · 때릴 준비됨 ${m.tunReady}건 / 표본 ${m.seg}`);
  }

  /* ── [4] 체감 ── */
  console.log('\n=== [4] 체감 표 (199 이관 근거) ===');
  console.log('| SC | 잡몹 60초 피격/초 | 잡몹 스윙 | 보스 30초 접촉 | 보스 대시 | 첫 접촉(초) |');
  console.log('|---|---|---|---|---|---|');
  for (const sc of [1, 2]) {
    const m = R[sc].M60, b = R[sc].B;
    if (!m || m.err || !b || b.err) { ok(false, `4 SC=${sc} 체감 표본을 못 얻었다`, (m && m.err) || (b && b.err)); continue; }
    console.log(`| ${sc} | ${m.hps} (${m.hit}회) | ${m.swing} | ${b.hit} | ${b.dashN} | ${b.tClose} |`);
    ok(true, `4 SC=${sc} 체감 표본을 얻었다`, `잡몹 ${m.hps}/초 · 보스 ${b.hps}/초`);
  }

  console.log('\n=== [5] 에러 ===');
  ok(errs.length === 0, '5 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  console.log(`\nPROBE580 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
