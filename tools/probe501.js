#!/usr/bin/env node
/* 작업 501·502 재현 — «보스는 플레이어를 못 때리고, 잡몹은 플레이어보다 빠르다» 를 수치로 잰다
 *
 *   node tools/probe501.js                     # 지금 트리만
 *   V501_REF=<sha> node tools/probe501.js      # 그 커밋의 index.html 도 같이 돌려 before/after
 *   V501_SEC=30 node tools/probe501.js
 *
 * 338 규칙 — «처방을 따르기 전에 재현한다». 주인 보고 두 줄이 재현되는지부터 본다:
 *   ⓐ «보스가 너무 느려서 플레이어를 공격 못 함»      → 보스전 피격 수 · 피격/초 · 대시 명중률
 *   ⓑ «보스 없이 잡몹 죽일 때 더 많이 죽고 있음»      → 같은 시간 잡몹 구간 피격/초 와 비교
 *   ⓒ «잡몹 속도 너무 빠름»(502)                      → 스폰 표본의 이속 ↔ PLAYER_SPEED
 *
 * 재는 자리(등재문 ④ 목표 지표와 같은 축):
 *   [B] 보스 1:1 · 스테이지 10/50/100 · SEC 초 — 접촉 공격(스윙) · **실제 피격**(hp 감소) ·
 *       피격/초 · 대시 횟수 · **대시 명중률**(돌진이 끝나고 0.5초 안에 그 보스의 스윙이 났는가) ·
 *       평시 걸음 ↔ 플레이어 이속 · 첫 접촉 시간
 *   [M] 잡몹 구간 · 같은 스테이지 · 같은 SEC 초 — 실제 피격 · 피격/초 · 몹 이속 평균·최대
 *   [S] 스폰 이속 표 — 스테이지 1/10/20/50/200/1000 × 좀비·고블린·다크엘프 각 100마리
 *
 * 하니스는 probe359 와 같다(59 교훈 1 — 가상 시계 rAF · 고정 dt 1/60s).
 * ⚠ 피격은 «스윙» 이 아니라 **hp 가 실제로 줄어든 프레임**으로 센다 — 무적(inv 0.4s)이 스윙을
 *   그냥 흘리기 때문이다. 그래서 player.inv 는 건드리지 않고 hp 만 매 프레임 되돌린다.
 * ⚠ **표본을 살리는 방법은 «hp 되돌리기» 가 아니라 «피해량 0» 이다.** 두 함정을 차례로 밟았다:
 *   ① maxHp 로 되돌리기 — 보스 한 대(dmg ×22)에 플레이어가 그 틱 «안에서» 죽고
 *      **458(보스전 사망 = 즉시 실패)** 이 보스를 치운다(1800 프레임 중 182 만 표본이 됐다).
 *   ② 1e9 로 되돌리기 — 죽지는 않지만 회복이 `min(hp+regen, maxHp)` 로 **매 프레임 hp 를 깎아**
 *      «피격 60회/초» 라는 거짓 표를 만든다.
 *   ⇒ 매 프레임 `e.dmg = 0` 으로 눌러 hp 를 아예 안 건드리고, 피격은 **`player.inv` 가 0.4 로
 *      튀는 프레임**(21387 — 실제로 «맞은» 단 하나의 자리)으로 센다. 무적 창·넉백은 그대로 산다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SEC = Number(process.env.V501_SEC || 30);
const REF = process.env.V501_REF || '';
const STAGES = (process.env.V501_STAGES || '10,50,100').split(',').map(Number);

/* ---- [B] 보스 1:1 ---- */
const RUN_BOSS = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage(); startBoss();
  /* 457 등장 국면은 표본에서 뺀다 — 그 동안 적은 얼어 있고 전·후가 같은 길이다 */
  for (let g = 0; g < 900 && bossIntro; g++) window.__p501tick();
  const B = () => enemies.find(e => e.tk === 'boss');
  const b0 = B();
  const reach = (b0 ? b0.r : ETYPE.boss.r) + player.r + 6;
  let swing = 0, hit = 0, dashN = 0, dashHit = 0, tClose = -1;
  let walk = 0, walkN = 0, dashPeak = 0, wasD = false, dashEnd = -99;
  for (let f = 0; f < frames; f++) {
    const a = B();
    if (a) a.hp = a.max;
    bossT = 9999; player.dead = 0;
    for (const e of enemies) e.dmg = 0;                 /* 죽지 않게 — 거동은 그대로 */
    const cd0 = a ? a.cd : null, x0 = a ? a.x : 0, y0 = a ? a.y : 0;
    const inv0 = player.inv;
    window.__p501tick();
    const b = B(); if (!b) continue;
    if (player.inv > inv0 + 1e-9) hit++;
    b.hp = b.max;
    if (cd0 !== null && b.cd > cd0) {
      swing++;
      /* ⚠ «돌진 중에 닿은 스윙» 도 대시 명중이다 — 접촉 판정은 이동과 **같은 틱**에서 도므로
         돌진이 끝나는 프레임에 나는 스윙은 dashEnd 가 찍히기 전에 지나간다(1회차에 0% 로 읽혔다). */
      if (b.dashD > 0 || wasD || f / 60 - dashEnd <= 0.5) { dashHit++; dashEnd = -99; }
    }
    const havePrev = !!a && b === a;
    const sp = havePrev ? Math.hypot(b.x - x0, b.y - y0) * 60 : null;
    const inD = b.dashT > 0 || b.dashD > 0;
    if (inD && !wasD) dashN++;
    if (wasD && !inD) dashEnd = f / 60;                 /* 돌진이 끝난 순간 */
    if (sp !== null && b.dashD > 0) dashPeak = Math.max(dashPeak, sp);
    if (sp !== null && !inD && b.atkT <= 0) { walk += sp; walkN++; }
    wasD = inD;
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (tClose < 0 && d <= reach + 20) tClose = f / 60;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    st, swing, hit, dashN, dashHit, tClose,
    hps: +(hit / (frames / 60)).toFixed(3),
    walk: walkN ? +(walk / walkN).toFixed(1) : 0,
    dashPeak: +dashPeak.toFixed(1),
    bossSp: (b0 ? +b0.sp.toFixed(1) : 0),
    pSpeed: +stat.speed.toFixed(1),
  };
};

/* ---- [M] 잡몹 구간 ---- */
const RUN_MOB = async ({ frames, st }) => {
  S.stage = st; S.best = st; S.bossFarm = false;
  spawnStage();
  let hit = 0, swing = 0, dashN = 0, spSum = 0, spN = 0, spMax = 0, over = 0;
  const was = new Map();
  for (let f = 0; f < frames; f++) {
    /* «잡몹 구간» 을 끝까지 유지한다 — 50마리를 채우면 stage clear 로 보스 구간이 되고,
       보스 구간이 되면 재는 것이 [B] 와 같아진다. killed 를 0 으로 눌러 구간을 고정한다. */
    killed = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    if (enemies.length + spawnQ.length < 12) queueMobs();
    player.dead = 0;
    for (const e of enemies) e.dmg = 0;
    const cds = enemies.map(e => e.cd), inv0 = player.inv;
    window.__p501tick();
    if (player.inv > inv0 + 1e-9) hit++;
    enemies.forEach((e, i) => {
      const inD = e.dashT > 0 || e.dashD > 0;
      if (inD && !was.get(e)) dashN++;
      was.set(e, inD);
      if (cds[i] !== undefined && e.cd > cds[i]) swing++;
    });
    if (f % 60 === 0) {
      for (const e of enemies) {
        if (e.tk === 'boss') continue;
        spSum += e.sp; spN++; spMax = Math.max(spMax, e.sp);
        if (e.sp > stat.speed) over++;
      }
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    st, hit, swing, dashN,
    hps: +(hit / (frames / 60)).toFixed(3),
    spAvg: spN ? +(spSum / spN).toFixed(1) : 0,
    spMax: +spMax.toFixed(1),
    overPct: spN ? +(100 * over / spN).toFixed(1) : 0,
    pSpeed: +stat.speed.toFixed(1),
  };
};

/* ---- [S] 스폰 이속 표 ---- */
const RUN_SPAWN = async ({ stages, types, n }) => {
  const out = [];
  const keep = enemies.slice();
  for (const st of stages) {
    S.stage = st; S.best = st;
    for (const tk of types) {
      enemies.length = 0;
      for (let i = 0; i < n; i++) makeEnemy(tk);
      const sp = enemies.map(e => e.sp);
      out.push({
        st, tk,
        min: +Math.min(...sp).toFixed(1),
        avg: +(sp.reduce((a, b) => a + b, 0) / sp.length).toFixed(1),
        max: +Math.max(...sp).toFixed(1),
        over: sp.filter(v => v > stat.speed).length,
      });
    }
  }
  enemies.length = 0; keep.forEach(e => enemies.push(e));
  return { rows: out, pSpeed: +stat.speed.toFixed(1) };
};

async function runOne(browser, file, scn, arg) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__p501tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__p501tick(); });
  const fn = scn === 'boss' ? RUN_BOSS : scn === 'mob' ? RUN_MOB : RUN_SPAWN;
  let r;
  try { r = await page.evaluate(fn, arg); }            /* LESSONS 319 — 즉사 대신 블록만 */
  catch (e) { r = { err: String(e.message).slice(0, 200) }; }
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
  const p = path.join(ROOT, `.p501-${sha.slice(0, 7)}-${process.pid}.html`);
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
    const frames = Math.round(SEC * 60);
    for (const t of targets) {
      const B = [], M = [];
      for (const st of STAGES) {
        process.stdout.write(`[·] ${t.tag} · s${st} 보스 1:1 ${SEC}초 … `);
        const b = await runOne(browser, t.file, 'boss', { frames, st });
        console.log(b.err ? 'ERR ' + b.err : `피격 ${b.hit}회(${b.hps}/s) · 스윙 ${b.swing} · 대시 ${b.dashN}(명중 ${b.dashHit})`);
        B.push(b);
        process.stdout.write(`[·] ${t.tag} · s${st} 잡몹 ${SEC}초 … `);
        const m = await runOne(browser, t.file, 'mob', { frames, st });
        console.log(m.err ? 'ERR ' + m.err : `피격 ${m.hit}회(${m.hps}/s) · 몹 이속 평균 ${m.spAvg} 최대 ${m.spMax} · 추월 ${m.overPct}%`);
        M.push(m);
      }
      process.stdout.write(`[·] ${t.tag} · 스폰 이속 표 … `);
      const s = await runOne(browser, t.file, 'spawn',
        { stages: [1, 10, 20, 50, 200, 1000], types: ['zombie', 'goblin', 'dark'], n: 100 });
      console.log(s.err ? 'ERR ' + s.err : `${s.rows.length}칸`);
      rows.push({ tag: t.tag, B, M, S: s });
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n### [B]·[M] 보스전 ↔ 잡몹 구간 (같은 스테이지 · 같은 ' + SEC + '초)');
  console.log('| 빌드 | 스테이지 | 보스 피격 | 보스 피격/초 | 보스 스윙 | 대시(명중) | 명중률 | 보스 평시걸음 | 몹 피격 | 몹 피격/초 | 몹 이속 평균/최대 | 플레이어 추월% | 역전(보스>몹) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) r.B.forEach((b, i) => {
    const m = r.M[i];
    if (b.err || m.err) { console.log(`| ${r.tag} | ${b.st} | ERR | | | | | | | | | | |`); return; }
    const rate = b.dashN ? (100 * b.dashHit / b.dashN).toFixed(0) + '%' : '—';
    console.log(`| ${r.tag} | ${b.st} | ${b.hit}회 | ${b.hps} | ${b.swing} | ${b.dashN}(${b.dashHit}) | ${rate} | `
      + `${b.walk}px/s(×${(b.walk / Math.max(1, b.pSpeed)).toFixed(2)}) | ${m.hit}회 | ${m.hps} | `
      + `${m.spAvg}/${m.spMax} | ${m.overPct}% | ${b.hps > m.hps ? '**O**' : 'X'} |`);
  });

  console.log('\n### [S] 스폰 이속 표 (각 100마리 · 플레이어 ' + (rows[0] ? rows[0].S.pSpeed : '?') + 'px/s)');
  console.log('| 빌드 | 스테이지 | 좀비 avg(max) | 고블린 avg(max) | 다크엘프 avg(max) | 추월 마리수 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.S.err) { console.log(`| ${r.tag} | ERR ${r.S.err} | | | | |`); continue; }
    const by = {};
    for (const x of r.S.rows) { (by[x.st] = by[x.st] || {})[x.tk] = x; }
    for (const st of Object.keys(by).map(Number).sort((a, b) => a - b)) {
      const g = by[st], f = t => g[t] ? `${g[t].avg}(${g[t].max})` : '—';
      const ov = ['zombie', 'goblin', 'dark'].reduce((a, t) => a + (g[t] ? g[t].over : 0), 0);
      console.log(`| ${r.tag} | ${st} | ${f('zombie')} | ${f('goblin')} | ${f('dark')} | ${ov}/300 |`);
    }
  }

  for (const r of rows) {
    const e = [].concat(...r.B.map(x => x.errs || []), ...r.M.map(x => x.errs || []), r.S.errs || []);
    if (e.length) console.log(`\n[${r.tag}] pageerror ${e.length}건: ${e.slice(0, 3).join(' | ')}`);
  }
  console.log('\nPROBE501 END (판정 없음 — 재현·측정 전용)');
})().catch(e => { console.error(e); process.exit(2); });
