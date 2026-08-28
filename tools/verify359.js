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
 *   §2 평시   보스 평시 걸음(대시·예고·공격 모션이 안 걸친 프레임)이 플레이어보다 **느리다**.
 *             ⚠ 아래로도 벽을 둔다 — 0.86배 밑이면 «바닥이 아예 안 걸린» 것(ETYPE.sp 0.48배)이다.
 *   §3 대시   ⓐ 30초에 보스 대시 ≥ 3회 · ⓑ 돌진 순간 속도가 플레이어보다 **빠르다**(≥ ×2.5) ·
 *             ⓒ 예고 동안 «제자리»(프레임당 이동 0.05px 미만) · ⓓ 잠금 방향이 그 순간의 플레이어를
 *             겨눈다(코사인 ≥ 0.999) · ⓔ 돌진은 «접근» 이다(한 번마다 거리가 줄었다) ·
 *             ⓕ 대시 사이 간격이 쿨다운 하한 이상(폭주하지 않는다).
 *   §4 일반적 몹 필드 30마리에서도 대시가 일어나고(≥ 10회), 몹 대시도 «접근» 이다.
 *   §5 예산   적 30마리 · 30초에서 한 틱 처리 시간이 114 예산 안(≤ 30ms — 60fps 프레임 2배).
 *   §R 되돌림 `DASH` 창을 닫은(min 을 사거리 밖으로 민) **소스 사본**에서 대시가 0회가 되고
 *             첫 접촉이 느려지거나 아예 안 붙는다 — 이게 없으면 «대시가 없어도 초록» 과 구별할 수 없다
 *             (LESSONS 232-① · 334 선례).
 *   §6 에러   pageerror 0건.
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
  let walk = 0, walkN = 0, dashPeak = 0, telMax = 0, telN = 0;
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
    if (mv !== null && !inD && b.atkT <= 0) { walk += mv * 60; walkN++; }
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
           walk: walkN ? +(walk / walkN).toFixed(1) : 0, walkN, dashPeak: +dashPeak.toFixed(1),
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
  ok(chase > 0 && chase < 1, '1-ⓐ `BOSS_CHASE` < 1 — 보스 평시 걸음은 플레이어보다 느리다', 'BOSS_CHASE = ' + chase);
  ok(chase >= 0.85, '1-ⓐ 그리고 «살짝» 느리다(≥ 0.85) — 못 붙을 만큼 느리게 두지 않았다', String(chase));
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
  let B = null, M = null, errs = [];
  try {
    await blk('§2·§3 보스', async () => {
      const h = await openPage(browser, SRC);
      B = await h.page.evaluate(RUN_BOSS, { frames: Math.round(SEC * 60) });
      errs = errs.concat(h.errs);
      await h.ctx.close();
    });

    /* ── §2 평시 걸음 ───────────────────────────────────────────────── */
    console.log('\n=== §2 평시 걸음 — 플레이어보다 살짝 느리다 ===');
    if (B) {
      ok(B.walkN >= 200, '2 평시 표본이 충분하다', `${B.walkN} 프레임`);
      ok(B.walk < B.pSpeed, '2 보스 평시 걸음 < 플레이어 이동 속도', `${B.walk} < ${B.pSpeed} px/s`);
      ok(B.walk >= B.pSpeed * 0.86, '2 그래도 «바닥» 은 걸려 있다(≥ ×0.86 — ETYPE.sp 0.48배가 아니다)',
        `×${(B.walk / B.pSpeed).toFixed(2)}`);
    }

    /* ── §3 대시 ────────────────────────────────────────────────────── */
    console.log('\n=== §3 대시 공격(보스) ===');
    if (B) {
      ok(B.dashN >= 3, `3-ⓐ ${SEC}초에 보스 대시 ≥ 3회`, B.dashN + '회');
      ok(B.dashPeak > B.pSpeed * 2.5, '3-ⓑ 돌진 순간 속도 > 플레이어 × 2.5', `${B.dashPeak} px/s (플레이어 ${B.pSpeed})`);
      ok(B.telN > 0 && B.telMax < 0.05, '3-ⓒ 예고 동안은 «제자리» 다', `예고 ${B.telN}프레임 · 최대 이동 ${B.telMax}px/프레임`);
      ok(B.lockCos.length > 0 && Math.min.apply(null, B.lockCos) >= 0.999,
        '3-ⓓ 잠금 방향이 그 순간의 플레이어를 겨눈다', `최저 코사인 ${B.lockCos.length ? Math.min.apply(null, B.lockCos) : '표본 없음'}`);
      ok(B.gain.length > 0 && B.gain.every(g => g > 0), '3-ⓔ 돌진은 «접근» 이다 — 한 번마다 거리가 줄었다',
        B.gain.join(' · ') + ' px');
      const gapMin = B.gapSec.length ? Math.min.apply(null, B.gapSec) : 99;
      ok(gapMin >= 1.2, '3-ⓕ 대시가 폭주하지 않는다(간격 ≥ 1.2초 — 쿨다운이 실제로 걸린다)',
        `최소 간격 ${gapMin}s · 간격 ${B.gapSec.join('/')}`);
      ok(B.tClose >= 0, '3 그리고 «붙는다» — 평시 걸음이 느려도 대시가 사거리 안으로 데려온다',
        B.tClose < 0 ? '한 번도 못 붙음' : B.tClose.toFixed(1) + 's');
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
      console.log('\n=== §5 프레임 예산 ===');
      ok(M.msPerTick <= 30, '5 적 30마리 틱 처리 ≤ 30ms(114 예산)', M.msPerTick + 'ms · 적 ' + M.nEnemy + '마리');
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
        const r = await h.page.evaluate(RUN_BOSS, { frames: Math.round(SEC * 60) });
        await h.ctx.close();
        ok(r.dashN === 0, 'R1 그 사본에서는 대시가 0회다(§3-ⓐ 가 빨개진다)', r.dashN + '회');
        ok(r.tClose < 0 || r.tClose > B.tClose,
          'R2 그리고 붙는 것이 느려지거나 아예 못 붙는다 — «대시가 붙여 준다» 의 증거',
          `대시 없음 ${r.tClose < 0 ? '못 붙음' : r.tClose.toFixed(1) + 's'} ↔ 대시 있음 ${B.tClose.toFixed(1)}s`);
        ok(r.atk < B.atk, 'R3 공격 횟수도 줄어든다', `${r.atk}회 ↔ ${B.atk}회`);
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
    if (M) console.log(`| 몹 대시(30마리) | ${M.dashN}회 · 접근 ${M.closer}/${M.dashDone} · 틱 ${M.msPerTick}ms |`);
  }
  console.log(`\nVERIFY359 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
