#!/usr/bin/env node
/* 작업 501 게이트 — «보스가 플레이어를 실제로 때린다 · 잡몹 구간보다 보스전이 더 아프다»
 *
 *   node tools/verify501.js   → 마지막 줄이 `VERIFY501 n/n PASS` 여야 한다.
 *
 * 저장소 주인 보고(2026-08-31):
 *   «보니까 보스가 너무 느려서 플레이어를 공격못함. 그래서 속도 조절해줘야할듯.
 *    보스 없이 잡몹 죽일때 더 많이 죽고있음 지금»
 *
 * 재현은 `tools/probe501.js` 가 했다(338 규칙). 수리 전(스테이지 10·50·100 · 30초):
 *   보스 접촉 **9~11회**(0.30~0.37/초) = 대시 횟수와 **같다**(걸음으로는 한 번도 못 붙는다) ·
 *   같은 30초 잡몹 구간 피격 **56~61회**(1.87~2.03/초) = 보스전의 **5~6.8배**.
 *   ⚠ 등재문 가설 «대시가 빗나간다» 는 **기각**됐다 — 대시 명중률은 이미 90~100% 였다.
 *      결손은 정확도가 아니라 **«때릴 기회의 수»** 이고, 그 수는 대시 쿨다운에 묶여 있었다.
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈):
 *   §1 소스   ⓐ `BOSS_CHASE` 가 1.05~1.15 · ⓑ 추격 바닥이 여전히 «플레이어 이속 × 비» 형태 ·
 *             ⓒ 보스 대시가 더 촘촘해졌다(cd0 ≤ 0.8 · cd1 ≤ 1.4 · dur ≥ 0.40) ·
 *             ⓓ **예고 `tel` 은 0.30 그대로**(359 규약 — 줄이면 «못 피하는» 공격이 된다) ·
 *             ⓔ **잡몹 대시 상수는 한 값도 안 바뀌었다**(주인 원문은 보스다).
 *   §2 보스전 스테이지 10·50·100 × RUNS 회 — 30초 평균 접촉 공격 ≥ 3회 · 대시 명중률 ≥ 40% ·
 *             그리고 «붙는다»(첫 접촉이 있다).
 *   §3 역전   **같은 스테이지·같은 30초에서 보스전 피격/초 > 잡몹 구간 피격/초** —
 *             주인 관측(«잡몹에서 더 죽는다»)의 정확한 반대. 501·502 가 같이 만드는 결과다.
 *   §R 되돌림 ⓐ `BOSS_CHASE` 만 0.94 로 되돌린 사본에서 접촉이 반 이하로 무너지고 ·
 *             ⓑ **501·502 를 둘 다 되돌린** 사본에서 §3 의 역전이 뒤집힌다(수리 전 세계) —
 *             이게 없으면 «상수를 안 고쳐도 초록» 과 구별할 수 없다(LESSONS 232-① · 334 선례).
 *   §4 에러   pageerror 0건.
 *
 * ⚠ 피격은 «스윙» 이 아니라 **`player.inv` 가 튀는 프레임**으로 센다(21387 — 실제로 맞은 자리).
 *   그리고 표본을 살리려고 매 프레임 `e.dmg = 0` 으로 누른다 — hp 를 되돌리는 방식은 두 함정이 있다
 *   (probe501 머리말: ① 458 즉시 실패로 보스가 치워진다 ② 회복 클램프가 «60회/초» 헛표를 만든다).
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
const SEC = Number(process.env.V501_SEC || 30);
/* 등재문은 «×10회» 를 적었지만 한 판이 30초 가상 시계라 10회 × 3스테이지면 게이트 하나가 20분을 넘는다.
   실측 분산이 작아(스윙 28~29회 · 목표선 3회) 2회로 줄여도 판정이 흔들리지 않는다 — 늘리려면 V501_RUNS. */
const RUNS = Number(process.env.V501_RUNS || 2);
const STAGES = (process.env.V501_STAGES || '10,50,100').split(',').map(Number);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

const RUN_BOSS = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage(); startBoss();
  const B = () => enemies.find(e => e.tk === 'boss');
  for (let g = 0; g < 900 && !B(); g++) window.__v501tick();                  /* 스폰 딜레이 1.4초 */
  for (let g = 0; g < 900 && (typeof bossIntro !== 'undefined' && bossIntro); g++) window.__v501tick();
  let swing = 0, hit = 0, dashN = 0, dashHit = 0, tClose = -1, wasD = false, dashEnd = -99;
  const reach = ETYPE.boss.r + player.r + 6;
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) a.hp = a.max;
    bossT = 9999; player.dead = 0;
    for (const e of enemies) e.dmg = 0;               /* 죽지 않게 — 거동·무적창·넉백은 그대로 */
    const cd0 = a ? a.cd : null, inv0 = player.inv;
    window.__v501tick();
    const b = B(); if (!b) continue;
    if (player.inv > inv0 + 1e-9) hit++;
    b.hp = b.max;
    if (cd0 !== null && b.cd > cd0) {
      swing++;
      /* «돌진 중에 닿은 스윙» 도 대시 명중이다 — 접촉 판정이 이동과 같은 틱에서 돈다 */
      if (b.dashD > 0 || wasD || f / 60 - dashEnd <= 0.5) { dashHit++; dashEnd = -99; }
    }
    const inD = b.dashT > 0 || b.dashD > 0;
    if (inD && !wasD) dashN++;
    if (wasD && !inD) dashEnd = f / 60;
    wasD = inD;
    if (tClose < 0 && Math.hypot(player.x - b.x, player.y - b.y) <= reach) tClose = f / 60;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, swing, hit, dashN, dashHit, tClose, hps: +(hit / (frames / 60)).toFixed(3) };
};

const RUN_MOB = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0;
  for (let f = 0; f < frames; f++) {
    /* «잡몹 구간» 을 끝까지 유지한다 — 50마리를 채우면 stage clear 로 보스 구간이 된다 */
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;
    const inv0 = player.inv;
    window.__v501tick();
    if (player.inv > inv0 + 1e-9) hit++;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { st, hit, hps: +(hit / (frames / 60)).toFixed(3) };
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
    window.__v501tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v501tick(); });
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
  const chase = Number((CODE.match(/const BOSS_CHASE\s*=\s*([0-9.]+)/) || [])[1]);
  ok(chase >= 1.05, '1-ⓐ `BOSS_CHASE` ≥ 1.05 — 걸음만으로도 플레이어에게 붙는다', 'BOSS_CHASE = ' + chase);
  ok(chase <= 1.15, '1-ⓐ 그리고 ≤ 1.15 — 66 이 1.15 에서 «스쳐 지나감 9.6%» 를 실측했다', String(chase));
  ok(/Math\.max\(e\.sp,\s*stat\.speed\*BOSS_CHASE\)/.test(CODE),
    '1-ⓑ 추격 바닥은 여전히 «플레이어 이속 상수 × 비» 형태다(새 축을 안 만들었다)');
  const dashSrc = (CODE.match(/const DASH\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  const num = (kind, key) => Number(((dashSrc.match(new RegExp(kind + ':\\s*\\{[^}]*' + key + ':\\s*([0-9.]+)')) || [])[1]));
  ok(num('boss', 'cd0') <= 0.8 && num('boss', 'cd1') <= 1.4,
    '1-ⓒ 보스 대시 쿨다운이 촘촘해졌다(cd0 ≤ 0.8 · cd1 ≤ 1.4)', `${num('boss', 'cd0')} / ${num('boss', 'cd1')}`);
  ok(num('boss', 'dur') >= 0.40, '1-ⓒ 돌진 길이 ≥ 0.40s(돌진 거리 ≈ 166px)', num('boss', 'dur') + 's');
  ok(num('boss', 'tel') === 0.30, '1-ⓓ 예고 `tel` 은 0.30 그대로 — 359 규약(읽히는·피할 수 있는 공격)',
    num('boss', 'tel') + 's');
  const mobWant = { cd0: 5, cd1: 8, tel: 0.42, dur: 0.26, spd: 2.6, min: 120, max: 380 };
  const mobBad = Object.keys(mobWant).filter(k => num('mob', k) !== mobWant[k]);
  ok(mobBad.length === 0, '1-ⓔ 잡몹 대시 상수는 한 값도 안 바뀌었다 — 주인 원문은 보스다',
    mobBad.length ? '바뀐 값: ' + mobBad.join(',') : Object.keys(mobWant).map(k => k + ':' + num('mob', k)).join(' '));

  const browser = await launch(chromium);
  const errs = [];
  const B = {}, M = {};
  try {
    await blk('§2·§3 실측', async () => {
      for (const st of STAGES) {
        B[st] = [];
        for (let i = 0; i < RUNS; i++) B[st].push(await run(browser, SRC, RUN_BOSS, { frames: SEC * 60, st }, errs));
        M[st] = await run(browser, SRC, RUN_MOB, { frames: SEC * 60, st }, errs);
      }
    });

    /* ── §2 보스전 ──────────────────────────────────────────────────── */
    console.log(`\n=== §2 보스전 — ${SEC}초 × ${RUNS}회 × 스테이지 ${STAGES.join('·')} ===`);
    for (const st of STAGES) {
      const rs = (B[st] || []).filter(r => !r.err);
      if (!rs.length) { ok(false, `2 s${st} 표본이 없다`, (B[st] || [{}])[0].err || ''); continue; }
      const avgSw = rs.reduce((a, r) => a + r.swing, 0) / rs.length;
      const dn = rs.reduce((a, r) => a + r.dashN, 0), dh = rs.reduce((a, r) => a + r.dashHit, 0);
      ok(avgSw >= 3, `2 s${st} 평균 접촉 공격 ≥ 3회`, avgSw.toFixed(1) + '회 · ' + rs.map(r => r.swing).join('/'));
      ok(dn === 0 || dh / dn >= 0.4, `2 s${st} 대시 명중률 ≥ 40%`,
        dn ? `${dh}/${dn} = ${(100 * dh / dn).toFixed(0)}%` : '대시 표본 0(걸음으로 붙어 창이 안 열렸다 — 359 §3 이 따로 잰다)');
      ok(rs.every(r => r.tClose >= 0), `2 s${st} 언제나 «붙는다»`, rs.map(r => r.tClose.toFixed(1) + 's').join(' · '));
    }

    /* ── §3 역전 ────────────────────────────────────────────────────── */
    console.log('\n=== §3 역전 — 보스전이 잡몹 구간보다 아프다 ===');
    for (const st of STAGES) {
      const rs = (B[st] || []).filter(r => !r.err), m = M[st] || {};
      if (!rs.length || m.err || m.hps === undefined) { ok(false, `3 s${st} 표본이 없다`, m.err || ''); continue; }
      const bh = rs.reduce((a, r) => a + r.hps, 0) / rs.length;
      ok(bh > m.hps, `3 s${st} 보스전 피격/초 > 잡몹 구간 피격/초`,
        `${bh.toFixed(3)}/s ↔ ${m.hps}/s (수리 전 0.30~0.37 ↔ 1.87~2.03)`);
    }

    /* ── §R 되돌림 ──────────────────────────────────────────────────── */
    console.log('\n=== §R 되돌림 시험 — BOSS_CHASE 만 0.94 로 되돌리면 빨개진다 ===');
    await blk('§R', async () => {
      const off = RAW.replace(/const BOSS_CHASE = [0-9.]+;/, 'const BOSS_CHASE = 0.94;');
      ok(off !== RAW, 'R0 되돌림 사본이 실제로 만들어졌다(359 의 0.94 로 되돌렸다)');
      const p = path.join(ROOT, '.v501-slow.html');
      fs.writeFileSync(p, off);
      try {
        const st = STAGES[0];
        const rb = await run(browser, p, RUN_BOSS, { frames: SEC * 60, st }, errs);
        const now = (B[st] || []).filter(r => !r.err);
        const bh = now.length ? now.reduce((a, r) => a + r.swing, 0) / now.length : 0;
        ok(!rb.err && rb.swing < bh / 2, `R1 그 사본은 s${st} 접촉 공격이 반 이하로 무너진다(§2 가 빨개진다)`,
          `${rb.swing}회 ↔ 지금 ${bh.toFixed(1)}회`);
      } finally { try { fs.unlinkSync(p); } catch (e) {} }

      /* R2 — §3 의 역전은 **501 과 502 가 같이** 만든다. 그래서 되돌림도 둘을 같이 되돌린 사본으로 잰다.
         ⚠ 1회차에 `BOSS_CHASE` 만 되돌리고 역전이 뒤집히기를 기대했다가 빨개졌다 — 502 의 천장이
            남아 있으면 잡몹이 여전히 안 아파서 순서가 안 바뀐다. 그 «기대» 쪽이 틀렸던 것이다. */
      const both = RAW
        .replace(/const BOSS_CHASE = [0-9.]+;/, 'const BOSS_CHASE = 0.94;')
        .replace(/sp: Math\.min\(MOB_SPD_BASE \* T2\.sp \* rnd\(0\.9, 1\.1\), PLAYER_SPEED \* MOB_SPD_CAP\),/,
          'sp: (110 + 3*s*0.2) * T2.sp * rnd(0.9, 1.1),')
        .replace(/(goblin:[\s\S]{0,200}?)sp:0\.85/, '$1sp:1.10');
      ok(both !== RAW && /BOSS_CHASE = 0\.94/.test(both) && /110 \+ 3\*s\*0\.2/.test(both) && /sp:1\.10/.test(both),
        'R2-0 501·502 를 **둘 다** 되돌린 사본이 만들어졌다(수리 전 세계)');
      const p2 = path.join(ROOT, '.v501-pre.html');
      fs.writeFileSync(p2, both);
      try {
        const st = STAGES[0];
        const rb = await run(browser, p2, RUN_BOSS, { frames: SEC * 60, st }, errs);
        const rm = await run(browser, p2, RUN_MOB, { frames: SEC * 60, st }, errs);
        ok(!rb.err && !rm.err && rb.hps < rm.hps, 'R2 그 사본에서는 §3 의 역전이 뒤집힌다 — 주인이 본 그림 그대로',
          `보스 ${rb.hps}/s < 잡몹 ${rm.hps}/s`);
      } finally { try { fs.unlinkSync(p2); } catch (e) {} }
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== §4 에러 ===');
  ok(errs.length === 0, '4 pageerror 0건', errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  console.log('\n| 스테이지 | 보스 스윙(평균) | 보스 피격/초 | 대시(명중) | 잡몹 피격/초 | 역전 |');
  console.log('|---|---|---|---|---|---|');
  for (const st of STAGES) {
    const rs = (B[st] || []).filter(r => !r.err), m = M[st] || {};
    if (!rs.length) continue;
    const avgSw = rs.reduce((a, r) => a + r.swing, 0) / rs.length;
    const bh = rs.reduce((a, r) => a + r.hps, 0) / rs.length;
    const dn = rs.reduce((a, r) => a + r.dashN, 0), dh = rs.reduce((a, r) => a + r.dashHit, 0);
    console.log(`| ${st} | ${avgSw.toFixed(1)}회 | ${bh.toFixed(3)} | ${dn}(${dh}) | ${m.hps} | ${bh > m.hps ? '**O**' : 'X'} |`);
  }

  console.log(`\nVERIFY501 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
