#!/usr/bin/env node
/* 작업 66 게이트 — 보스 추격 AI «도망치지 않고 붙는가» 측정 (ROUTINE [3]-(가) 수치 검증)
 *
 *   node tools/verify66.js                       # 기본 스테이지 10·30 × 30초 보스전
 *   V66_SEC=30 V66_STAGES=10,30 node tools/verify66.js
 *   V66_REF=<sha> node tools/verify66.js         # 그 커밋의 index.html 도 같이 돌려 before/after 비교
 *
 * 통과 조건 (시나리오 전부):
 *   ① 30초 안에 «사거리+20» 안으로 한 번은 붙는다(첫 접촉 = 수렴 구간의 시작)
 *   ② 수렴 구간(첫 접촉 이후) 평균 거리 ≤ 사거리(e.r+player.r+6) + 50px
 *      — 전체 평균이 아니라 «수렴» 평균으로 본다. 보스는 플레이어 반경 300~700px 링(67)에 스폰하므로
 *        전체 평균에는 «아직 붙기 전» 의 스폰 거리가 통째로 섞인다.
 *   ③ 수렴 구간 «멀어지는 구간»(직전 표본보다 거리가 +2px 이상 늘어난 표본) < 10%
 *   ④ 30초 동안 보스 공격 ≥ 1회 (붙기만 하고 안 때리면 실패)
 *   ⑤ 콘솔 pageerror 0건
 *
 * 59 교훈 1 — 실시간 30초를 기다리지 않는다. rAF 를 가상 시계(고정 dt 1/60s)로 갈아끼워
 * CPU 속도로 돌린다. dt 고정이라 회차 간 재현성도 확보된다.
 *
 * 측정 중에만 거는 하니스 조건 2가지 (게임 코드는 건드리지 않는다):
 *   · 보스 hp 를 매 틱 max 로 되돌린다 — 30초 표본을 끝까지 채우기 위해(46 레이드 샌드백과 같은 처리)
 *   · 플레이어 hp 를 매 틱 채운다 — 사망(정지 2.4초)·부활 구간이 «거리» 표본을 오염시키지 않게
 * 둘 다 «보스가 플레이어에게 접근하는가» 만 재기 위한 것이고 이동 로직은 원본 그대로다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다 — `npm i --no-save playwright && npx playwright install chromium` 후 재실행');
  process.exit(2);
})();

function launchOpts() {
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const SEC = Number(process.env.V66_SEC || 30);
const STAGES = (process.env.V66_STAGES || '10,30').split(',').map(Number);
const REF = process.env.V66_REF || '';
const SLACK = 50;          /* ① 허용 여유 — 사거리 + 이 값 */
const LIM_AWAY = 10;       /* ② 멀어지는 구간 상한 (%) */
const ROOT = path.resolve(__dirname, '..');

/* 페이지 안에서 가상 rAF 로 보스전을 돌리며 보스↔플레이어 거리를 10Hz 로 샘플링 */
const RUN = async ({ frames, sampleEvery, stage }) => {
  S.stage = stage; S.best = Math.max(S.best || 1, stage); S.bossFarm = false;
  spawnStage();                                   /* 보스 단독 스폰(28) */
  const reach = ETYPE.boss.r + player.r + 6;
  const NEAR = reach + 20;                        /* «붙었다» 판정 반경 */
  let n = 0, away = 0, near = 0, sumD = 0, maxD = 0, prev = null, noBoss = 0;
  let cn = 0, cAway = 0, cSum = 0, cPrev = null;  /* 수렴 구간(첫 접촉 이후) */
  let tClose = -1;                                /* 첫 접촉까지 걸린 시간(초) */
  let sumSp = 0, spN = 0, atk = 0;                /* 보스 실제 이동 속도 평균 · 공격 시도 횟수 */
  let bx = null, by = null;
  for (let f = 0; f < frames; f++) {
    const b0 = enemies.find(e => e.tk === 'boss');
    /* 하니스 — 틱 «전에» 걸어야 그 틱의 피해·사망을 막는다.
       무적으로 두는 이유: 세이브를 비우고 시작하므로 플레이어는 «강화 0» 상태이고,
       stage 10 보스(dmg ×22) 앞에서 몇 초 만에 죽어 표본이 끊긴다. 추격 «거동» 만 재기 위한 처리다. */
    if (b0) b0.hp = b0.max;
    player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    const cd0 = b0 ? b0.cd : null;
    window.__v66tick();
    const b = enemies.find(e => e.tk === 'boss');
    if (b && cd0 !== null && b.cd > cd0) atk++;      /* 쿨다운이 «올라간» 프레임 = 공격 시작 */
    if (f % sampleEvery === 0) {
      if (!b) { noBoss++; prev = null; continue; }
      const d = Math.hypot(player.x - b.x, player.y - b.y);
      if (prev !== null && d > prev + 2) away++;
      prev = d;
      sumD += d; if (d > maxD) maxD = d;
      if (d <= NEAR) { near++; if (tClose < 0) tClose = f / 60; }
      n++;
      if (tClose >= 0) {                          /* 접근이 끝난 뒤 = «수렴» 구간 */
        cSum += d; cn++;
        if (cPrev !== null && d > cPrev + 2) cAway++;
        cPrev = d;
      }
      if (bx !== null) { sumSp += Math.hypot(b.x - bx, b.y - by) / (sampleEvery / 60); spN++; }
      bx = b.x; by = b.y;
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    n, noBoss, reach, meanD: sumD / Math.max(1, n), maxD, tClose,
    away: away / Math.max(1, n) * 100, near: near / Math.max(1, n) * 100,
    cn, convD: cn ? cSum / cn : Infinity, convAway: cn ? cAway / cn * 100 : 100, atk,
    bossSp: sumSp / Math.max(1, spN), pSpeed: stat.speed, stage: S.stage,
  };
};

async function runOne(browser, url, stage) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    /* 가상 시계 rAF — dt 고정 1/60s (59 교훈 1) */
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v66tick = () => {
      vt += 1000 / 60;
      const list = q.splice(0, q.length);
      for (const cb of list) { try { cb(vt); } catch (e) {} }
    };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v66tick(); });   /* 워밍업 10초(가상) */
  const r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), sampleEvery: 6, stage });
  await ctx.close();
  return { ...r, errs };
}

function checkoutRef(sha) {
  const out = execFileSync('git', ['show', `${sha}:index.html`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const p = path.join(ROOT, `.v66-before-${sha.slice(0, 7)}.html`);
  fs.writeFileSync(p, out);
  return p;
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const o = launchOpts(); if (!o.executablePath) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + o.executablePath);
    browser = await chromium.launch(o);
  }
  const rows = [];
  let refFile = null;
  try {
    if (REF) refFile = checkoutRef(REF);
    /* V66_FILE — 튜닝 실험용(상수만 바꾼 임시 복사본을 재는 용도). 기본은 저장소 index.html */
    const targets = [{ tag: 'after', file: process.env.V66_FILE ? path.resolve(process.env.V66_FILE) : path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });

    for (const t of targets) {
      const url = 'file://' + t.file.replace(/\\/g, '/');
      for (const st of STAGES) {
        process.stdout.write(`[·] ${t.tag} · stage ${st} · ${SEC}초 보스전 … `);
        const r = await runOne(browser, url, st);
        rows.push({ tag: t.tag, st, ...r });
        console.log(`수렴거리 ${r.cn ? Math.round(r.convD) : '—'}px · 멀어짐 ${r.convAway.toFixed(1)}% · 접촉까지 ${r.tClose < 0 ? '없음' : r.tClose.toFixed(1) + 's'}`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | stage | 표본 | 사거리 | 전체 평균 | 접촉까지 | 수렴 평균 | 수렴 멀어짐% | 붙어있음% | 최대거리 | 보스속도 | 플레이어속도 | 보스 공격 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.st} | ${r.n} | ${r.reach}px | ${Math.round(r.meanD)}px | ${r.tClose < 0 ? '—' : r.tClose.toFixed(1) + 's'} | `
      + `${r.cn ? Math.round(r.convD) + 'px' : '—'} | ${r.convAway.toFixed(1)}% | ${r.near.toFixed(1)}% | ${Math.round(r.maxD)}px | `
      + `${Math.round(r.bossSp)}px/s | ${Math.round(r.pSpeed)}px/s | ${r.atk}회 |`);

  const fails = [];
  for (const r of rows.filter(r => r.tag === 'after')) {
    if (r.errs.length) fails.push(`stage ${r.st}: pageerror ${r.errs[0]}`);
    if (r.n < SEC * 10 * 0.8) fails.push(`stage ${r.st}: 표본 부족 ${r.n} (보스 없음 ${r.noBoss})`);
    if (r.tClose < 0) fails.push(`stage ${r.st}: ${SEC}초 안에 사거리+20 안으로 «한 번도» 못 붙음`);
    else if (r.convD > r.reach + SLACK) fails.push(`stage ${r.st}: 수렴 구간 평균 거리 ${Math.round(r.convD)}px > 사거리+${SLACK} (${r.reach + SLACK}px)`);
    if (r.convAway >= LIM_AWAY) fails.push(`stage ${r.st}: 수렴 구간 멀어짐 ${r.convAway.toFixed(1)}% ≥ ${LIM_AWAY}%`);
    if (r.atk < 1) fails.push(`stage ${r.st}: 보스가 ${SEC}초 동안 «공격을 한 번도» 하지 않음`);
  }
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); console.log('\nV66 FAIL'); process.exit(1); }
  console.log('\nV66 PASS');
})().catch(e => { console.error(e); process.exit(2); });
