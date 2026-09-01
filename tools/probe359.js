#!/usr/bin/env node
/* 작업 359 재현 — «보스 이동 속도 · 대시 공격» 을 수리 «전/후» 로 같은 자로 잰다
 *
 *   node tools/probe359.js                       # 지금 트리만
 *   V359_REF=<sha> node tools/probe359.js        # 그 커밋의 index.html 도 같이 돌려 before/after
 *   V359_SEC=30 node tools/probe359.js
 *
 * 338·341·350 규칙 — «처방을 따르기 전에 재현한다». 여기서 재는 것은 다섯이다:
 *   ⓐ 평시 걸음 속도(대시·예고·공격 모션이 안 걸친 표본만) ↔ 플레이어 이동 속도
 *   ⓑ 대시 순간 속도(돌진 프레임의 최대 변위 속도)
 *   ⓒ 첫 접촉까지 걸린 시간 · 30초 접촉(공격) 횟수 — «붙는 수단» 이 바뀌어도 붙는가
 *   ⓓ 일반 몹 필드(30마리)에서 대시가 실제로 일어나는가 · 몹이 접촉하는가
 *   ⓔ 프레임 예산 — 적 30마리에서 한 틱 처리 시간(114 예산)
 *
 * 59 교훈 1 — 실시간을 기다리지 않는다. rAF 를 가상 시계(고정 dt 1/60s)로 갈아끼워 CPU 속도로 돌린다
 * (verify66/172 와 같은 하니스: 대상 hp·플레이어 hp·제한 시간을 매 틱 되돌려 표본을 끝까지 채운다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SEC = Number(process.env.V359_SEC || 30);
const REF = process.env.V359_REF || '';

/* 보스 1:1 — 거리·속도·대시를 프레임 단위로 센다 */
const RUN_BOSS = async ({ frames }) => {
  S.stage = 30; S.best = 30; S.bossFarm = false;
  spawnStage(); startBoss();
  const B = () => enemies.find(e => e.tk === 'boss');
  const b0 = B();
  const reach = (b0 ? b0.r : ETYPE.boss.r) + player.r + 6;
  let px = null, py = null, tClose = -1, atk = 0, dashN = 0, wasDash = false;
  let walk = 0, walkN = 0, dashPeak = 0, dashSp = 0, dashSpN = 0, telFrames = 0;
  let dLock = null, lockCos = [], gain = [];
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) a.hp = a.max;
    bossT = 9999; player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    const cd0 = a ? a.cd : null, x0 = a ? a.x : 0, y0 = a ? a.y : 0;
    const wasD = a ? a.dashD > 0 : false, d0 = a ? Math.hypot(player.x - a.x, player.y - a.y) : 0;
    window.__p359tick();
    const b = B(); if (!b) continue;
    if (cd0 !== null && b.cd > cd0) atk++;
    /* ⚠ 스폰 전 프레임(a 가 없다)은 «직전 좌표» 가 없다 — 속도 표본에서 통째로 뺀다.
       1회차에 이 한 프레임(0,0 → 스폰 좌표)이 평균을 108 → 243px/s 로 밀어 올렸다. */
    const havePrev = !!a && b === a;
    const sp = havePrev ? Math.hypot(b.x - x0, b.y - y0) * 60 : null;
    const inD = b.dashT > 0 || b.dashD > 0;
    if (inD && !wasDash) dashN++;
    /* 예고 → 돌진으로 «넘어간 프레임» 에 잠금 방향이 플레이어를 겨눴는지 */
    if (!wasD && b.dashD > 0) { dLock = { vx: b.dvx, vy: b.dvy, x: b.x, y: b.y, d0 }; }
    if (b.dashT > 0) telFrames++;
    if (sp !== null && b.dashD > 0) { dashPeak = Math.max(dashPeak, sp); dashSp += sp; dashSpN++; }
    if (sp !== null && !inD && b.atkT <= 0) { walk += sp; walkN++; }
    if (wasD && b.dashD <= 0 && dLock) {             /* 돌진이 끝난 프레임 — 얼마나 좁혔나 */
      gain.push(+(dLock.d0 - Math.hypot(player.x - b.x, player.y - b.y)).toFixed(1));
      const tl = Math.hypot(player.x - dLock.x, player.y - dLock.y) || 1;
      lockCos.push(+(((player.x - dLock.x) * dLock.vx + (player.y - dLock.y) * dLock.vy) / tl).toFixed(4));
      dLock = null;
    }
    wasDash = inD;
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (tClose < 0 && d <= reach + 20) tClose = f / 60;
    px = b.x; py = b.y;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    reach, tClose, atk, dashN, telFrames,
    walk: walkN ? +(walk / walkN).toFixed(1) : 0, walkN,
    dashPeak: +dashPeak.toFixed(1), dashAvg: dashSpN ? +(dashSp / dashSpN).toFixed(1) : 0,
    pSpeed: +stat.speed.toFixed(1), gain, lockCos,
  };
};

/* 일반 몹 필드 — 대시가 몹에도 걸리는가 · 프레임 예산 */
const RUN_MOB = async ({ frames }) => {
  S.stage = 30; S.best = 30; S.bossFarm = false;
  spawnStage();
  for (let i = 0; i < 30; i++) makeEnemy('zombie');
  let dashN = 0, hit = 0, tHit = -1;
  const was = new Map();
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    player.hp = stat.maxHp; player.dead = 0;
    const hp0 = player.hp, cds = enemies.map(e => e.cd);
    window.__p359tick();
    enemies.forEach((e, i) => {
      const inD = e.dashT > 0 || e.dashD > 0;
      if (inD && !was.get(e)) dashN++;
      was.set(e, inD);
      if (cds[i] !== undefined && e.cd > cds[i]) { hit++; if (tHit < 0) tHit = f / 60; }
    });
    if (enemies.length < 20) for (let i = enemies.length; i < 30; i++) makeEnemy('zombie');
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  const ms = (performance.now() - t0) / frames;
  return { dashN, hit, tHit, nEnemy: enemies.length, msPerTick: +ms.toFixed(3) };
};

async function runOne(browser, file, scn) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__p359tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__p359tick(); });
  const r = await page.evaluate(scn === 'boss' ? RUN_BOSS : RUN_MOB, { frames: Math.round(SEC * 60) });
  await ctx.close();
  return { ...r, errs };
}

function checkoutRef(sha) {
  /* 756 — 얕은 클론이면 **먼저 판다**(규약 ①). 못 가져오면 «환경이냐 진짜 없음이냐» 를 밝혀 던진다(규약 ②).
     ⚠ 이 `checkoutRef` 는 자 여섯 벌에 **글자 그대로 복사**돼 있었다 — 판는 사다리는 부품 한 벌에 둔다. */
  const got = require('./gitrev756').show(sha, 'index.html', { maxBuffer: 64 * 1024 * 1024 });
  if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
  if (got.how) console.log('[i]' + got.how);
  const out = got.buf;
  const p = path.join(ROOT, `.p359-${sha.slice(0, 7)}-${process.pid}.html`);
  fs.writeFileSync(p, out);
  return p;
}

(async () => {
  const browser = await launch(chromium);
  const targets = [{ tag: 'after(작업트리)', file: path.join(ROOT, 'index.html') }];
  let refFile = null;
  const rows = [];
  try {
    if (REF) { refFile = checkoutRef(REF); targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile }); }
    for (const t of targets) {
      process.stdout.write(`[·] ${t.tag} · 보스 1:1 ${SEC}초 … `);
      const b = await runOne(browser, t.file, 'boss');
      console.log(`평시 ${b.walk}px/s · 대시 최고 ${b.dashPeak}px/s · 대시 ${b.dashN}회 · 접촉까지 ${b.tClose < 0 ? '없음' : b.tClose.toFixed(1) + 's'} · 공격 ${b.atk}회`);
      process.stdout.write(`[·] ${t.tag} · 몹 30마리 ${SEC}초 … `);
      const m = await runOne(browser, t.file, 'mob');
      console.log(`몹 대시 ${m.dashN}회 · 몹 접촉 ${m.hit}회 · 틱 ${m.msPerTick}ms`);
      rows.push({ tag: t.tag, b, m });
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | 플레이어 | 보스 평시 걸음 | 비 | 대시 최고 | 대시 평균 | 대시 횟수 | 예고 프레임 | 접촉까지 | 보스 공격 | 몹 대시 | 몹 접촉 | 틱 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.b.pSpeed}px/s | ${r.b.walk}px/s | ×${(r.b.walk / Math.max(1, r.b.pSpeed)).toFixed(2)} | `
      + `${r.b.dashPeak}px/s | ${r.b.dashAvg}px/s | ${r.b.dashN}회 | ${r.b.telFrames} | `
      + `${r.b.tClose < 0 ? '**없음**' : r.b.tClose.toFixed(1) + 's'} | ${r.b.atk}회 | ${r.m.dashN}회 | ${r.m.hit}회 | ${r.m.msPerTick}ms |`);

  for (const r of rows) {
    if (r.b.gain.length) console.log(`\n[${r.tag}] 돌진 한 번이 좁힌 거리(px): ${r.b.gain.join(' · ')}`);
    if (r.b.lockCos.length) console.log(`[${r.tag}] 잠금 방향 ↔ 플레이어 방향 코사인: ${r.b.lockCos.join(' · ')}`);
    if (r.b.errs.length || r.m.errs.length) console.log(`[${r.tag}] pageerror: ${(r.b.errs.concat(r.m.errs)).slice(0, 3).join(' | ')}`);
  }
  console.log('\nPROBE359 END (판정 없음 — 재현·측정 전용)');
})().catch(e => { console.error(e); process.exit(2); });
