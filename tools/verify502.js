#!/usr/bin/env node
/* 작업 502 게이트 — «잡몹은 어떤 스테이지·어떤 타입이어도 플레이어를 못 따라잡는다»
 *
 *   node tools/verify502.js   → 마지막 줄이 `VERIFY502 n/n PASS` 여야 한다.
 *
 * 저장소 주인 보고(2026-08-31): «잡몹들 속도 너무 빠름. 조절하이소»
 *
 * 재현은 `tools/probe501.js` [S] 가 했다(338 규칙 · 각 100마리 표본 · 플레이어 115px/s).
 * 수리 전 `sp: (110 + 3*s*0.2) * T.sp * rnd(0.9,1.1)` = **(110 + 0.6×스테이지)**:
 *   | 스테이지 | 좀비 | 고블린 | 다크엘프 | 추월(300마리 중) |
 *   |  1    | 57.3 | **121.6** | 46.5 |  79~83 |
 *   | 20    | 63.3 | 133.9 | 51.5 | 100 |
 *   | 200   | 118.7| 252.7 | 96.0 | 158~175 |
 *   | 1000  | 366.7| **784** | 298.6 | **300** |
 * 즉 고블린은 **스테이지 1 부터** 플레이어보다 빠르고, 좀비도 s200 부터 추월한다.
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈):
 *   §1 소스   ⓐ 이속 식에 **스테이지 항이 없다** · ⓑ 천장이 «플레이어 이속 × 상수» 로 걸려 있다 ·
 *             ⓒ 천장 상수 ≤ 0.9(«못 따라잡는다» 가 성립하는 값) · ⓓ 타입 계수 서열
 *             (다크엘프 < 좀비 < 고블린)이 그대로다 · ⓔ 잡몹 대시 상수는 불변(위협은 «수와 돌진»).
 *   §2 표본   스테이지 1·50·200·1000 × 좀비·고블린·다크엘프 각 100마리 = 300마리가
 *             **전부** `e.sp ≤ PLAYER_SPEED × MOB_SPD_CAP` 다.
 *   §3 비례항 s=1 과 s=1000 의 평균 이속이 같다(±10% — 난수 폭이 ±10%).
 *   §4 서열   실측 평균도 다크엘프 < 좀비 < 고블린 순서를 지킨다.
 *   §5 구간   60초 잡몹 구간 피격/초를 기록한다(501 §3 의 짝 — 판정은 501 이 한다).
 *   §R 되돌림 **비례항을 되살린 소스 사본**에서 s1000 표본이 천장을 넘고 추월이 생긴다 —
 *             이게 없으면 «식을 안 고쳐도 초록» 과 구별할 수 없다(LESSONS 232-① · 334 선례).
 *   §6 에러   pageerror 0건.
 *
 * ⚠ 보스·승급 수호자·아레나도 이 식을 지나지만 셋은 SOLO_CHASER 라 이동 속도가
 *   `max(e.sp, stat.speed × BOSS_CHASE)` 로 정해진다 — 그래서 §2 의 천장은 셋의 «걸음» 을
 *   느리게 만들지 않는다(501 이 그 축을 따로 잰다). 이 게이트는 잡몹 3종만 표본으로 쓴다.
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
const SEC = Number(process.env.V502_SEC || 60);
const TYPES = ['zombie', 'goblin', 'dark'];
const STAGES = [1, 50, 200, 1000];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

/* 스폰 표본 — makeEnemy 를 그대로 태운다(식을 베끼지 않는다: 베끼면 제품이 바뀌어도 초록이다) */
const RUN_SPAWN = async ({ stages, types, n }) => {
  const rows = [];
  for (const st of stages) {
    S.stage = st; S.best = st;
    for (const tk of types) {
      enemies.length = 0;
      for (let i = 0; i < n; i++) makeEnemy(tk);
      const sp = enemies.map(e => e.sp);
      rows.push({
        st, tk, n: sp.length,
        min: +Math.min.apply(null, sp).toFixed(2),
        avg: +(sp.reduce((a, b) => a + b, 0) / sp.length).toFixed(2),
        max: +Math.max.apply(null, sp).toFixed(2),
        over: sp.filter(v => v > stat.speed).length,
      });
    }
  }
  enemies.length = 0;
  return { rows, pSpeed: +stat.speed.toFixed(1), cap: +(stat.speed * (typeof MOB_SPD_CAP === 'number' ? MOB_SPD_CAP : NaN)).toFixed(2) };
};

/* 잡몹 구간 — 60초 피격/초(501 §3 의 짝). 피격은 `player.inv` 가 튀는 프레임으로 센다 */
const RUN_MOB = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0, spMax = 0, spN = 0;
  for (let f = 0; f < frames; f++) {
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;
    const inv0 = player.inv;
    window.__v502tick();
    if (player.inv > inv0 + 1e-9) hit++;
    if (f % 60 === 0) for (const e of enemies) { if (e.tk !== 'boss') { spMax = Math.max(spMax, e.sp); spN++; } }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, hit, spN, spMax: +spMax.toFixed(2), hps: +(hit / (frames / 60)).toFixed(3), pSpeed: +stat.speed.toFixed(1) };
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
    window.__v502tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v502tick(); });
  return { page, ctx, errs };
}

const run = async (browser, file, fn, arg, errs) => {
  const h = await openPage(browser, file);
  let r;
  try { r = await h.page.evaluate(fn, arg); }
  catch (e) { r = { err: String(e && e.message || e).slice(0, 200) }; }
  errs.push(...h.errs);
  await h.ctx.close();
  return r;
};

(async () => {
  /* ── §1 소스 ──────────────────────────────────────────────────────── */
  console.log('=== §1 소스 ===');
  const spLine = (CODE.match(/sp:\s*[^\n]*rnd\(0\.9,\s*1\.1\)[^\n]*/) || [''])[0].trim();
  ok(spLine.length > 0, '1 잡몹 이속 식을 찾았다', spLine);
  ok(!/\bs\b|S\.stage/.test(spLine.replace(/T2?\.sp/g, '')),
    '1-ⓐ 그 식에 **스테이지 항이 없다** — «오를수록 빨라진다» 는 규칙 자체를 걷어냈다', spLine);
  ok(/Math\.min\(/.test(spLine) && /PLAYER_SPEED\s*\*\s*MOB_SPD_CAP/.test(spLine),
    '1-ⓑ 천장이 «플레이어 이속 × 상수» 로 걸려 있다', spLine);
  const cap = Number((CODE.match(/const MOB_SPD_CAP\s*=\s*([0-9.]+)/) || [])[1]);
  const base = Number((CODE.match(/const MOB_SPD_BASE\s*=\s*([0-9.]+)/) || [])[1]);
  ok(cap > 0 && cap <= 0.9, '1-ⓒ 천장 상수 ≤ 0.9 — 가장 빠른 잡몹도 플레이어보다 느리다', 'MOB_SPD_CAP = ' + cap);
  ok(base > 0, '1-ⓒ 기준 이속 상수가 있다(스테이지와 무관)', 'MOB_SPD_BASE = ' + base);
  const tsp = tk => Number(((CODE.match(new RegExp(tk + ':\\s*\\{[\\s\\S]{0,400}?sp:\\s*([0-9.]+)')) || [])[1]));
  const [z, g, d] = [tsp('zombie'), tsp('goblin'), tsp('dark')];
  ok(d < z && z < g, '1-ⓓ 타입 계수 서열이 그대로다(다크엘프 < 좀비 < 고블린)',
    `다크엘프 ${d} < 좀비 ${z} < 고블린 ${g}`);
  ok(g <= cap, '1-ⓓ 그리고 가장 빠른 타입 계수조차 천장 이하다(고블린 1.10 → 0.85)', `${g} ≤ ${cap}`);
  const dashSrc = (CODE.match(/const DASH\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  const num = (kind, key) => Number(((dashSrc.match(new RegExp(kind + ':\\s*\\{[^}]*' + key + ':\\s*([0-9.]+)')) || [])[1]));
  const mobWant = { cd0: 5, cd1: 8, tel: 0.42, dur: 0.26, spd: 2.6, min: 120, max: 380 };
  const mobBad = Object.keys(mobWant).filter(k => num('mob', k) !== mobWant[k]);
  ok(mobBad.length === 0, '1-ⓔ 잡몹 대시 상수 불변 — 위협은 «수와 돌진» 으로 남긴다',
    mobBad.length ? '바뀐 값: ' + mobBad.join(',') : Object.keys(mobWant).map(k => k + ':' + num('mob', k)).join(' '));

  const browser = await launch(chromium);
  const errs = [];
  let SP = null; const MB = {};
  try {
    await blk('§2~§5 실측', async () => {
      SP = await run(browser, SRC, RUN_SPAWN, { stages: STAGES, types: TYPES, n: 100 }, errs);
      for (const st of [1, 200]) MB[st] = await run(browser, SRC, RUN_MOB, { frames: SEC * 60, st }, errs);
    });

    /* ── §2 표본 ────────────────────────────────────────────────────── */
    console.log('\n=== §2 스폰 표본 — 전부 천장 아래 ===');
    if (SP && !SP.err) {
      const capPx = SP.pSpeed * cap;
      for (const st of STAGES) {
        const rs = SP.rows.filter(r => r.st === st);
        const bad = rs.filter(r => r.max > capPx + 1e-6);
        ok(bad.length === 0, `2 s${st} · 300마리 전부 ≤ 플레이어 × ${cap} (= ${capPx.toFixed(2)}px/s)`,
          bad.length ? bad.map(r => `${r.tk} max ${r.max}`).join(' · ')
            : rs.map(r => `${r.tk} ${r.avg}(max ${r.max})`).join(' · '));
        ok(rs.reduce((a, r) => a + r.over, 0) === 0, `2 s${st} · 플레이어를 추월한 개체 0마리`,
          rs.reduce((a, r) => a + r.over, 0) + '/300 (수리 전 s1 79 · s1000 300)');
      }
    } else ok(false, '2 스폰 표본을 못 얻었다', SP && SP.err);

    /* ── §3 비례항 ──────────────────────────────────────────────────── */
    console.log('\n=== §3 스테이지 비례항이 0 이다 ===');
    if (SP && !SP.err) {
      for (const tk of TYPES) {
        const a = SP.rows.find(r => r.st === 1 && r.tk === tk), b = SP.rows.find(r => r.st === 1000 && r.tk === tk);
        const dev = Math.abs(b.avg - a.avg) / a.avg;
        ok(dev <= 0.10, `3 ${tk} — s1 과 s1000 의 평균 이속이 같다(±10%)`,
          `${a.avg} ↔ ${b.avg} px/s (차 ${(100 * dev).toFixed(1)}%) · 수리 전 6.4배`);
      }
    }

    /* ── §4 서열 ────────────────────────────────────────────────────── */
    console.log('\n=== §4 실측 서열 ===');
    if (SP && !SP.err) {
      for (const st of STAGES) {
        const f = tk => SP.rows.find(r => r.st === st && r.tk === tk).avg;
        ok(f('dark') < f('zombie') && f('zombie') < f('goblin'), `4 s${st} 실측 평균도 다크엘프 < 좀비 < 고블린`,
          `${f('dark')} < ${f('zombie')} < ${f('goblin')}`);
      }
    }

    /* ── §5 구간 기록 ───────────────────────────────────────────────── */
    console.log('\n=== §5 잡몹 구간 기록(판정은 501 §3) ===');
    for (const st of [1, 200]) {
      const m = MB[st];
      if (!m || m.err) { ok(false, `5 s${st} 잡몹 구간 표본이 없다`, m && m.err); continue; }
      ok(m.spMax <= m.pSpeed * cap + 1e-6, `5 s${st} 실전 필드에서도 최고 이속이 천장 아래다`,
        `${m.spMax} ≤ ${(m.pSpeed * cap).toFixed(2)} px/s · 표본 ${m.spN}`);
      console.log(`         ↳ s${st} ${SEC}초 잡몹 구간 피격 ${m.hit}회 = ${m.hps}/초 (수리 전 s10 1.87 · s100 2.03)`);
    }

    /* ── §R 되돌림 ──────────────────────────────────────────────────── */
    console.log('\n=== §R 되돌림 시험 — 비례항을 되살리면 빨개진다 ===');
    await blk('§R', async () => {
      const off = RAW.replace(/sp: Math\.min\(MOB_SPD_BASE \* T2\.sp \* rnd\(0\.9, 1\.1\), PLAYER_SPEED \* MOB_SPD_CAP\),/,
        'sp: (110 + 3*s*0.2) * T2.sp * rnd(0.9, 1.1),');
      ok(off !== RAW, 'R0 되돌림 사본이 만들어졌다(비례항 부활 · 천장 제거)');
      const p = path.join(ROOT, `.v502-old-${process.pid}.html`);
      fs.writeFileSync(p, off);
      try {
        const r = await run(browser, p, RUN_SPAWN, { stages: [1000], types: TYPES, n: 100 }, errs);
        const over = r.err ? -1 : r.rows.reduce((a, x) => a + x.over, 0);
        ok(over > 200, 'R1 그 사본은 s1000 에서 300마리 중 200마리 넘게 플레이어를 추월한다(§2 가 빨개진다)',
          over + '/300');
        const mx = r.err ? 0 : Math.max.apply(null, r.rows.map(x => x.max));
        ok(mx > (SP ? SP.pSpeed : 115) * cap * 2, 'R2 그리고 최고 이속이 천장의 2배를 넘는다',
          `${mx} px/s ↔ 천장 ${((SP ? SP.pSpeed : 115) * cap).toFixed(2)}`);
      } finally { try { fs.unlinkSync(p); } catch (e) {} }
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== §6 에러 ===');
  ok(errs.length === 0, '6 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  if (SP && !SP.err) {
    console.log(`\n| 스테이지 | 좀비 avg(max) | 고블린 avg(max) | 다크엘프 avg(max) | 추월 |  (플레이어 ${SP.pSpeed} · 천장 ${(SP.pSpeed * cap).toFixed(2)})`);
    console.log('|---|---|---|---|---|');
    for (const st of STAGES) {
      const f = tk => { const r = SP.rows.find(x => x.st === st && x.tk === tk); return `${r.avg}(${r.max})`; };
      const ov = SP.rows.filter(r => r.st === st).reduce((a, r) => a + r.over, 0);
      console.log(`| ${st} | ${f('zombie')} | ${f('goblin')} | ${f('dark')} | ${ov}/300 |`);
    }
  }
  console.log(`\nVERIFY502 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
