#!/usr/bin/env node
/* 작업 580 게이트 — «이동 속도 ×2 가 배수 하나에만 살고, 닿는 판정이 그 속도를 따라간다»
 *
 *   node tools/verify580.js            → 마지막 줄이 `VERIFY580 n/n PASS` 여야 한다.
 *   node tools/verify580.js --sec 30   → 구간 길이(기본 60초)
 *
 * 저장소 주인 지시(2026-08-31): «적이랑 플레이어 이동속도 지금의 2배로 하기».
 *
 * 재현은 `tools/probe580.js` 가 했다(338 규칙). 그 자가 **등재문 ②의 가설을 표본으로 기각했다** —
 * 터널링은 정상 프레임에서 «생길 뻔한 것» 조차 아니다(프레임당 접근이 임계의 1/3 아래). 그래서 이
 * 게이트의 터널링 절은 «0 을 확인» 하는 절이 아니라 **«0 이 아닐 수도 있는 자에서 0 이 나온다»** 를
 * 보이는 절이다 — §R2 가 배수를 8 로 올린 사본에서 그 계수가 실제로 튀는 것을 못박는다.
 * 그게 없으면 «세는 법이 틀려서 늘 0» 과 구별할 수 없다(LESSONS 232-① · 334 선례).
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈):
 *   §1 상수   ⓐ 배수가 **한 상수**(`SPD_SC`)에 산다 · ⓑ 두 기준 이속이 그 상수를 지난다 ·
 *             ⓒ 원본 리터럴 115·110 이 그대로 남아 있다(다음 조정에서 또 곱해지는 것을 막는다) ·
 *             ⓓ **비로 걸린 상수들은 안 곱해졌다** — `MOB_SPD_CAP` 0.85 · `BOSS_CHASE` ·
 *               `DASH.*.spd` · 조이스틱(42) · 넉백은 리터럴 그대로여야 한다.
 *   §2 실효   실측 `stat.speed` 가 원본의 정확히 `SPD_SC` 배 · 잡몹 천장도 같은 배수.
 *   §3 502    스테이지 1·50·200·1000 × 3종 × 100마리 = **300마리 전부** `sp ≤ 플레이어 × 0.85`,
 *             추월 0마리, 그리고 타입 서열(다크엘프 < 좀비 < 고블린) 유지.
 *   §4 터널링 잡몹 구간 실전 표본에서 «임계 안으로 들어왔다 나갔는데 접촉이 안 찍힌» 프레임 **0건**
 *             (정상 dt 1/60 · `loop` 상한 dt 0.1 둘 다). 세는 법은 probe580 [3] 과 같은 상대 운동 선분.
 *   §5 표     60초 잡몹 피격/초 · 임계 안 프레임 · 보스 30초 접촉 수를 **찍는다**(199 넘길 근거).
 *             ⚠ 이 절은 판정하지 않는다 — 계수 확정은 199 몫이다(541 과 합산).
 *   §R 되돌림 R1 `SPD_SC` 를 1 로 되돌린 사본은 수리 전과 **완전히 같은 값**이다(115 · 110) ·
 *             R2 배수를 8 로 올린 사본에서는 §4 의 계수가 **0 이 아니다**(자가 살아 있다는 증명).
 *   §6 에러   pageerror 0건.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, ' ');
const argSec = process.argv.indexOf('--sec');
const SEC = argSec > 0 ? Number(process.argv[argSec + 1]) : Number(process.env.V580_SEC || 60);

const PLAYER_BASE = 115, MOB_BASE = 110;   /* 358 · 502 가 적어 둔 «원본» */
/* ⚑ 640 — §4·§R3 전용 시드. 8717 은 **수리 전 통과가 실제로 찍히는 판**으로 골랐다
   (probe640 [1]·[2]: 이 판은 600프레임에서 통과 1건 · 시드 1000 은 0건). 그래서 §R3 의
   되돌림 사본이 «우연히 초록» 이 될 수 없다 — 자가 살아 있음을 이 판이 매 실행 보증한다. */
const TUN_SEED = 8717;
const STAGES = [1, 50, 200, 1000];
const TYPES = ['zombie', 'goblin', 'dark'];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

/* ── 시나리오 (page.evaluate 안에서 돈다) ─────────────────────────────── */

const RUN_CONST = async () => ({
  pSpeed: +stat.speed.toFixed(4),
  mobBase: +MOB_SPD_BASE.toFixed(4),
  cap: +(stat.speed * MOB_SPD_CAP).toFixed(4),
  capK: MOB_SPD_CAP,
  chase: BOSS_CHASE,
  dashMob: DASH.mob.spd, dashBoss: DASH.boss.spd,
  playerR: +player.r.toFixed(2),
  sc: (typeof SPD_SC === 'number' ? SPD_SC : null),
});

const RUN_SPAWN = async ({ stages, types, n }) => {
  const rows = [];
  const keep = enemies.slice();
  for (const st of stages) {
    S.stage = st; S.best = st;
    for (const tk of types) {
      enemies.length = 0;
      for (let i = 0; i < n; i++) makeEnemy(tk);
      const sp = enemies.map(e => e.sp);
      rows.push({
        st, tk,
        avg: +(sp.reduce((a, b) => a + b, 0) / sp.length).toFixed(2),
        max: +Math.max.apply(null, sp).toFixed(2),
        over: sp.filter(v => v > stat.speed).length,
      });
    }
  }
  enemies.length = 0; keep.forEach(e => enemies.push(e));
  return { rows, pSpeed: +stat.speed.toFixed(2), cap: +(stat.speed * MOB_SPD_CAP).toFixed(2) };
};

/* 터널링 — probe580 [3] 과 **같은 세는 법**(상대 운동 선분의 최소 거리) */
const RUN_TUNNEL = async ({ frames, st, ms }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0, tun = 0, tunReady = 0, tunMiss = 0, touchF = 0, seg = 0;
  for (let f = 0; f < frames; f++) {
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;      /* 죽지 않게 — 거동은 그대로(501 [M] 고정) */
    const snap = new Map();
    for (const e of enemies) snap.set(e, { x: e.x, y: e.y, cd: e.cd, r: e.r });
    const px0 = player.x, py0 = player.y, inv0 = player.inv;
    window.__v580tick(ms);
    if (player.inv > inv0 + 1e-9) hit++;
    for (const e of enemies) {
      const a = snap.get(e); if (!a) continue;
      seg++;
      const reach = a.r + player.r + 6;
      const sx = a.x - px0, sy = a.y - py0;
      const ex = e.x - player.x, ey = e.y - player.y;
      const d0 = Math.hypot(sx, sy), d1 = Math.hypot(ex, ey);
      const vx = ex - sx, vy = ey - sy, vv = vx * vx + vy * vy;
      let t = vv > 1e-12 ? -(sx * vx + sy * vy) / vv : 0;
      t = Math.max(0, Math.min(1, t));
      const md = Math.hypot(sx + vx * t, sy + vy * t);
      if (d0 < reach) touchF++;
      if (d0 >= reach && d1 >= reach && md < reach) {
        tun++;
        if (a.cd <= 0) {
          tunReady++;
          /* ⚑ 640 — **여기가 이 절의 뜻이다.** `tunReady` 는 «임계를 지나갔다» 는 **기하**만 세므로
             제품이 그 프레임에 제대로 때렸는지는 안 묻는다 — 640 의 수리가 들어간 뒤에도 그대로
             세어져서 «고쳤는데 빨갛다» 가 된다(헛빨강). 물어야 할 것은 «지나갔는데 **접촉이 안
             찍혔는가**» 다. 적의 공격은 `e.cd = 0.9` 로 표가 나므로, 틱 전 `cd ≤ 0` 이던 개체가
             틱 뒤 `cd > 0` 이면 **이 프레임에 때린 것**이다(`e.cd -= dt` 만으로는 양수가 못 된다). */
          if (!(e.cd > 0)) tunMiss++;
        }
      }
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, ms, hit, seg, touchF, tun, tunReady, tunMiss,
    hps: +(hit / (frames * ms / 1000)).toFixed(3), pSpeed: +stat.speed.toFixed(1) };
};

const RUN_BOSS = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage(); startBoss();
  for (let g = 0; g < 900 && bossIntro; g++) window.__v580tick(1000 / 60);
  const B = () => enemies.find(e => e.tk === 'boss');
  let hit = 0, tClose = -1, floor = 0;
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) { a.hp = a.max; floor = Math.max(floor, stat.speed * BOSS_CHASE); }
    bossT = 9999; player.dead = 0;
    for (const e of enemies) e.dmg = 0;
    const inv0 = player.inv;
    window.__v580tick(1000 / 60);
    const b = B(); if (!b) continue;
    b.hp = b.max;
    if (player.inv > inv0 + 1e-9) hit++;
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (tClose < 0 && d <= b.r + player.r + 6) tClose = f / 60;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, hit, tClose: +tClose.toFixed(2), floor: +floor.toFixed(1),
    hps: +(hit / (frames / 60)).toFixed(3) };
};

/* ── 실행기 ───────────────────────────────────────────────────────────── */
async function run(browser, file, fn, arg, errs, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(sd => {
    /* ⚑ 640 — 시드를 준 실행에서는 `Math.random` 을 고정한다(mulberry32). **§4 전용**이다:
       터널링은 노출량이 아니라 **배치**에 묶인 드문 사건이라(probe640 [2] — 노출량을 4.7배로 키워도
       계수가 안 늘었다) 판을 안 고정하면 같은 나무에서 계수가 0 ↔ 3 으로 뒤집힌다(등재문 640).
       ⚠ 다른 절(§2·§3·§5)에는 시드를 주지 않는다 — 그 절들은 무작위 표본 위에서 «전부/서열» 을
          묻는 절이라 판을 고정하면 묻는 것이 좁아진다. 여기만 결정적이면 된다. */
    if (sd !== undefined && sd !== null) {
      let s = sd >>> 0;
      Math.random = () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), 1 | t);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v580tick = ms => { vt += (ms || 1000 / 60); const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  }, seed);
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v580tick(1000 / 60); });
  let r;
  try { r = await page.evaluate(fn, arg); }
  catch (e) { r = { err: String(e && e.message || e).slice(0, 200) }; }
  await ctx.close();
  return r;
}

/* `SPD_SC` 만 갈아 끼운 사본 — 되돌림(§R)의 재료 */
const withSc = v => RAW.replace(/const SPD_SC\s*=\s*[\d.]+\s*;/, `const SPD_SC = ${v};`);

(async () => {
  /* ── §1 상수 ────────────────────────────────────────────────────────── */
  console.log('=== §1 상수 — 배수는 한 곳에만 산다 ===');
  const scSrc = (CODE.match(/const SPD_SC\s*=\s*([\d.]+)\s*;/) || [])[1];
  const SC = Number(scSrc);
  ok(scSrc !== undefined, '1-ⓐ `const SPD_SC` 정의가 있다', 'SPD_SC = ' + scSrc);
  ok((CODE.match(/const SPD_SC\s*=/g) || []).length === 1, '1-ⓐ 정의는 정확히 1곳', (CODE.match(/const SPD_SC\s*=/g) || []).length + '곳');
  ok(SC === 2, '1-ⓐ 그 값이 주인 지시의 2 다', String(SC));
  const pSrc = (CODE.match(/const PLAYER_SPEED\s*=\s*([^;]+);/) || [])[1];
  const mSrc = (CODE.match(/const MOB_SPD_BASE\s*=\s*([^;]+);/) || [])[1];
  ok(!!pSrc && /SPD_SC/.test(pSrc), '1-ⓑ 플레이어 기준 이속이 그 상수를 지난다', String(pSrc).trim());
  ok(!!mSrc && /SPD_SC/.test(mSrc), '1-ⓑ 잡몹 기준 이속이 그 상수를 지난다', String(mSrc).trim());
  ok(!!pSrc && new RegExp('(^|[^\\d.])' + PLAYER_BASE + '([^\\d.]|$)').test(pSrc),
    `1-ⓒ 원본 리터럴 ${PLAYER_BASE} 가 그대로 남아 있다(손으로 곱하지 않았다)`, String(pSrc).trim());
  ok(!!mSrc && new RegExp('(^|[^\\d.])' + MOB_BASE + '([^\\d.]|$)').test(mSrc),
    `1-ⓒ 원본 리터럴 ${MOB_BASE} 가 그대로 남아 있다`, String(mSrc).trim());
  /* ⓓ — «비로 걸린» 상수들은 배수를 안 먹는다. 먹이면 상대 관계가 깨진다(등재문 ④) */
  const capSrc = (CODE.match(/const MOB_SPD_CAP\s*=\s*([^;]+);/) || [])[1];
  const chaseSrc = (CODE.match(/const BOSS_CHASE\s*=\s*([^;]+);/) || [])[1];
  const dashSrc = (CODE.match(/const DASH\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  ok(String(capSrc).trim() === '0.85', '1-ⓓ `MOB_SPD_CAP` 은 비율이라 안 곱해졌다(502 규약)', String(capSrc).trim());
  ok(!/SPD_SC/.test(String(chaseSrc)), '1-ⓓ `BOSS_CHASE` 도 안 곱해졌다(66·501 — 플레이어 이속에 비로 걸린다)', String(chaseSrc).trim());
  ok(!/SPD_SC/.test(dashSrc), '1-ⓓ `DASH` 표도 안 곱해졌다(359 — `spd` 가 이미 플레이어 이속의 배수다)',
    (dashSrc.match(/spd:\s*[\d.]+/g) || []).join(' · '));
  const mobWant = { cd0: 5, cd1: 8, tel: 0.42, dur: 0.26, spd: 2.6, min: 120, max: 380 };
  const dnum = (kind, key) => Number(((dashSrc.match(new RegExp(kind + ':\\s*\\{[^}]*' + key + ':\\s*([0-9.]+)')) || [])[1]));
  const mobBad = Object.keys(mobWant).filter(k => dnum('mob', k) !== mobWant[k]);
  ok(mobBad.length === 0, '1-ⓓ 잡몹 대시 상수 불변(502 «위협은 수와 돌진»)',
    mobBad.length ? '바뀐 값: ' + mobBad.join(',') : Object.keys(mobWant).map(k => k + ':' + dnum('mob', k)).join(' '));
  ok(!/SPD_SC/.test((CODE.match(/player\.vx \+= Math\.cos\(a\)\*[\d.]+/) || [''])[0]),
    '1-ⓓ 피격 넉백(140)도 안 곱해졌다', (CODE.match(/player\.vx \+= Math\.cos\(a\)\*[\d.]+/) || ['(못 찾음)'])[0]);

  const browser = await launch(chromium);
  const errs = [];
  let C = null, SP = null, B = null; const T = {};
  try {
    await blk('§2~§5 실측', async () => {
      C = await run(browser, SRC, RUN_CONST, {}, errs);
      SP = await run(browser, SRC, RUN_SPAWN, { stages: STAGES, types: TYPES, n: 100 }, errs);
      T.fast = await run(browser, SRC, RUN_TUNNEL, { frames: SEC * 60, st: 200, ms: 1000 / 60 }, errs, TUN_SEED);
      T.lag = await run(browser, SRC, RUN_TUNNEL, { frames: Math.round(SEC * 10), st: 200, ms: 100 }, errs, TUN_SEED);
      B = await run(browser, SRC, RUN_BOSS, { frames: 30 * 60, st: 50 }, errs);
    });

    /* ── §2 실효 ──────────────────────────────────────────────────────── */
    console.log('\n=== §2 실효값 — 정확히 SPD_SC 배 ===');
    if (C && !C.err) {
      ok(C.sc === SC, '2 페이지 안의 `SPD_SC` 도 같은 값이다', String(C.sc));
      ok(Math.abs(C.pSpeed - PLAYER_BASE * SC) < 1e-6,
        `2 플레이어 이속 = ${PLAYER_BASE} × ${SC}`, `${C.pSpeed} px/s (수리 전 ${PLAYER_BASE})`);
      ok(Math.abs(C.mobBase - MOB_BASE * SC) < 1e-6,
        `2 잡몹 기준 이속 = ${MOB_BASE} × ${SC}`, `${C.mobBase} px/s (수리 전 ${MOB_BASE})`);
      ok(Math.abs(C.cap - PLAYER_BASE * SC * 0.85) < 1e-6,
        '2 잡몹 천장도 같은 배수로 따라온다(비율 규약이 살아 있다)',
        `${C.cap} px/s (수리 전 ${(PLAYER_BASE * 0.85).toFixed(2)})`);
    } else ok(false, '2 상수 표본을 못 얻었다', C && C.err);

    /* ── §3 502 규약 회귀 ─────────────────────────────────────────────── */
    console.log('\n=== §3 502 규약 — 두 배가 돼도 잡몹은 플레이어를 못 따라잡는다 ===');
    if (SP && !SP.err) {
      for (const st of STAGES) {
        const rs = SP.rows.filter(r => r.st === st);
        const bad = rs.filter(r => r.max > SP.cap + 1e-6);
        ok(bad.length === 0, `3 s${st} · 300마리 전부 ≤ 플레이어 × 0.85 (= ${SP.cap} px/s)`,
          bad.length ? bad.map(r => `${r.tk} max ${r.max}`).join(' · ') : rs.map(r => `${r.tk} ${r.avg}(max ${r.max})`).join(' · '));
        ok(rs.reduce((a, r) => a + r.over, 0) === 0, `3 s${st} · 플레이어를 추월한 개체 0마리`, rs.reduce((a, r) => a + r.over, 0) + '/300');
        const f = tk => rs.find(r => r.tk === tk).avg;
        ok(f('dark') < f('zombie') && f('zombie') < f('goblin'),
          `3 s${st} · 타입 서열 유지(다크엘프 < 좀비 < 고블린)`, `${f('dark')} < ${f('zombie')} < ${f('goblin')}`);
      }
    } else ok(false, '3 스폰 표본을 못 얻었다', SP && SP.err);

    /* ── §4 터널링 ────────────────────────────────────────────────────── */
    console.log('\n=== §4 터널링 — «통과했는데 접촉 0» 이 0건 ===');
    for (const k of ['fast', 'lag']) {
      const t = T[k], lab = k === 'fast' ? '정상 프레임(dt 1/60)' : '`loop` 상한 프레임(dt 0.1 = 10fps)';
      if (!t || t.err) { ok(false, `4 ${lab} 표본을 못 얻었다`, t && t.err); continue; }
      ok(t.seg > 5000, `4 ${lab} 표본이 충분하다(적·프레임)`, t.seg + '개');
      ok(t.touchF > 0, `4 ${lab} 그 표본 안에 «임계 안» 프레임이 실제로 있다(안 만나면 셀 것도 없다)`, t.touchF + '프레임');
      /* ⚑ 640 — 판정을 `tunReady`(기하) 에서 `tunMiss`(기하 **+ 접촉이 안 찍혔다**)로 갈아 끼웠다.
         옛 항은 «지나갔다» 만 세어서, 640 의 수리가 그 프레임에 제대로 때려도 계속 빨갰다.
         그리고 옛 항은 **드문 사건을 == 0 으로 물어** 실행마다 0 ↔ 3 으로 뒤집혔다(640 등재문) —
         이제 판은 시드로 고정되고(TUN_SEED) 세는 것은 «놓친 접촉» 이라 구조적으로 0 이다. */
      ok(t.tunMiss === 0, `4 ${lab} 임계를 지나갔는데 **접촉이 안 찍힌** 프레임 0건`,
        `${t.tunMiss}건 (지나감 ${t.tun}건 · 그 중 때릴 준비됨 ${t.tunReady}건 — 준비된 통과는 전부 접촉으로 찍혔다)`);
    }

    /* ── §5 체감 표(판정 없음 · 199 이관 근거) ────────────────────────── */
    console.log('\n=== §5 체감 표 — 판정하지 않는다(계수 확정은 199 · 541 과 합산) ===');
    if (T.fast && !T.fast.err) console.log(`         ↳ 잡몹 ${SEC}초 · s200 — 피격 ${T.fast.hit}회 = ${T.fast.hps}/초 · «임계 안» ${T.fast.touchF}프레임 / 표본 ${T.fast.seg}`);
    if (B && !B.err) console.log(`         ↳ 보스 30초 · s50 — 접촉 ${B.hit}회 = ${B.hps}/초 · 첫 접촉 ${B.tClose}초 · 추격 바닥 ${B.floor} px/s`);
    if (B && !B.err) {
      ok(B.hit > 0, '5 보스가 여전히 플레이어를 때린다(501 규약이 배수 뒤에도 산다)', `${B.hit}회 / 30초`);
      ok(C && Math.abs(B.floor - C.pSpeed * C.chase) < 0.5,
        '5 보스 추격 바닥 = 플레이어 이속 × BOSS_CHASE (비로 걸려 자동으로 따라왔다)',
        `${B.floor} = ${C && C.pSpeed} × ${C && C.chase}`);
    }

    /* ── §R 되돌림 ────────────────────────────────────────────────────── */
    console.log('\n=== §R 되돌림 시험 ===');
    await blk('§R1', async () => {
      const p = path.join(ROOT, '.v580-sc1.html');
      fs.writeFileSync(p, withSc(1));
      try {
        const r = await run(browser, p, RUN_CONST, {}, errs);
        ok(!r.err && Math.abs(r.pSpeed - PLAYER_BASE) < 1e-6 && Math.abs(r.mobBase - MOB_BASE) < 1e-6,
          'R1 `SPD_SC` 를 1 로 되돌리면 수리 전 값과 **완전히 같다**',
          r.err ? r.err : `플레이어 ${r.pSpeed} · 잡몹 ${r.mobBase} (수리 전 ${PLAYER_BASE} · ${MOB_BASE})`);
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });
    /* R2 — §4 의 계수가 «세는 법이 틀려서 늘 0» 인 게 아님을 못박는다.
       배수를 8 로 올리면 한 프레임 이동량이 접촉 임계를 넘어 실제로 통과가 찍힌다. */
    await blk('§R2', async () => {
      const p = path.join(ROOT, '.v580-sc8.html');
      fs.writeFileSync(p, withSc(8));
      try {
        const r = await run(browser, p, RUN_TUNNEL, { frames: Math.round(SEC * 10), st: 200, ms: 100 }, errs);
        ok(!r.err && r.tun > 0,
          'R2 배수를 8 로 올린 사본에서는 통과가 **실제로 찍힌다** — §4 의 0 은 «세는 법» 이 아니라 제품의 값이다',
          r.err ? r.err : `통과 ${r.tun}건(때릴 준비됨 ${r.tunReady}건) / 표본 ${r.seg}`);
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });
    /* ⚑ R3(640 신설) — **수리를 떼면 §4 가 빨개진다.** R2 는 «통과가 찍히는가»(기하)만 보이므로
       640 의 수리가 통째로 사라져도 초록이다 — 그러면 «수리가 있으나 없으나 같은 게이트» 가 된다
       (334 가 잡은 바로 그 꼴). 그래서 스윕 가지만 `if(false)` 로 죽인 사본을 만들어
       **놓친 접촉이 실제로 되살아나는 것**을 못박는다. 판은 TUN_SEED 로 고정 = 우연한 초록이 없다. */
    await blk('§R3', async () => {
      const MARK = 'if(Math.hypot(sx, sy) >= reach && Math.hypot(tx, ty) >= reach){';
      const p = path.join(ROOT, '.v580-nosweep.html');
      ok(RAW.indexOf(MARK) >= 0, 'R3 되돌릴 자리(640 스윕 가지)를 제품에서 찾았다', MARK.slice(0, 46) + '…');
      fs.writeFileSync(p, RAW.replace(MARK, 'if(false){'));
      try {
        const r = await run(browser, p, RUN_TUNNEL, { frames: Math.round(SEC * 10), st: 200, ms: 100 }, errs, TUN_SEED);
        ok(!r.err && r.tunMiss > 0,
          'R3 640 의 스윕 가지를 뗀 사본에서는 «놓친 접촉» 이 되살아난다 — §4 의 0 은 수리가 만든 값이다',
          r.err ? r.err : `놓침 ${r.tunMiss}건 (지나감 ${r.tun}건 · 준비됨 ${r.tunReady}건) / 표본 ${r.seg}`);
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== §6 에러 ===');
  ok(errs.length === 0, '6 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  if (SP && !SP.err) {
    console.log(`\n| 스테이지 | 좀비 avg(max) | 고블린 avg(max) | 다크엘프 avg(max) | 추월 |  (플레이어 ${SP.pSpeed} · 천장 ${SP.cap})`);
    console.log('|---|---|---|---|---|');
    for (const st of STAGES) {
      const f = tk => { const r = SP.rows.find(x => x.st === st && x.tk === tk); return `${r.avg}(${r.max})`; };
      console.log(`| ${st} | ${f('zombie')} | ${f('goblin')} | ${f('dark')} | ${SP.rows.filter(r => r.st === st).reduce((a, r) => a + r.over, 0)}/300 |`);
    }
  }
  console.log(`\nVERIFY580 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
