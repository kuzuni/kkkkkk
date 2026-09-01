#!/usr/bin/env node
/* 작업 59 게이트 — 플레이어 자동 이동 AI «구석·벽 체류» 측정 (ROUTINE [3]-(가) 수치 검증)
 *
 *   node tools/verify59.js                    # 기본 스테이지 1·30 두 시나리오 × 5분
 *   V59_MIN=5 V59_STAGES=1,30 node tools/verify59.js
 *   V59_REF=<sha> node tools/verify59.js      # 그 커밋의 index.html 로도 같이 돌려 before/after 비교
 *
 * 통과 조건 (시나리오 전부):
 *   구석(모서리 200px 이내) 체류 < 10%   ·   벽(가장자리 150px 이내) 체류 < 25%
 *   + before 대비 사망률(분당 사망 수) 악화 없음(+15% 이내 허용)
 *
 * 실시간 5분을 그대로 기다리지 않는다 — requestAnimationFrame 을 가상 시계(1/60s 고정 dt)로
 * 갈아끼워 «시뮬레이션 5분» 을 CPU 속도로 돌린다. dt 가 고정이라 회차 간 재현성도 올라간다.
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

const MIN = Number(process.env.V59_MIN || 5);
const STAGES = (process.env.V59_STAGES || '1,30').split(',').map(Number);
const REF = process.env.V59_REF || '';
const CORNER = 200, WALL = 150;           /* 판정 반경 — UI-REFERENCE «설계 확정» 20 */
const LIM_CORNER = 10, LIM_WALL = 25;     /* 통과 상한 (%) */
const ROOT = path.resolve(__dirname, '..');

/* 페이지 안에서 가상 rAF 로 n 프레임 돌리며 플레이어 위치를 10Hz 로 샘플링 */
const RUN = async ({ frames, sampleEvery, stage }) => {
  /* 시작 상태 만들기 — 스테이지만 올리고 스탯/밸런스는 건드리지 않는다 */
  if (stage > 1) { S.stage = stage; S.best = Math.max(S.best || 1, stage); spawnStage(); }
  const cw = WORLD.w, ch = WORLD.h;
  let inCorner = 0, inWall = 0, n = 0, deaths = 0, wasDead = false;
  let sumR = 0;                                   /* 중심 거리 평균 */
  const hist = new Array(10).fill(0);             /* 중심거리 분포 (10분위) */
  const maxR = Math.hypot(cw / 2, ch / 2);
  for (let f = 0; f < frames; f++) {
    window.__v59tick();
    if (f % sampleEvery === 0) {
      const x = player.x, y = player.y;
      const dx = Math.min(x, cw - x), dy = Math.min(y, ch - y);
      if (dx < WALL_R || dy < WALL_R) inWall++;
      if (dx < CORNER_R && dy < CORNER_R) inCorner++;
      const r = Math.hypot(x - cw / 2, y - ch / 2);
      sumR += r; hist[Math.min(9, Math.floor(r / maxR * 10))]++;
      n++;
    }
    const d = player.dead > 0;
    if (d && !wasDead) deaths++;
    wasDead = d;
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));   /* 15초마다 양보 */
  }
  return {
    n, corner: inCorner / n * 100, wall: inWall / n * 100, deaths,
    stage: S.stage, meanR: sumR / n, hist: hist.map(v => +(v / n * 100).toFixed(1)),
  };
};

async function runOne(browser, url, stage) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(({ corner, wall }) => {
    /* 가상 시계 rAF — dt 고정 1/60s. 게임 루프·연출 전부 이걸 탄다 */
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v59tick = () => {
      vt += 1000 / 60;
      const list = q.splice(0, q.length);
      for (const cb of list) { try { cb(vt); } catch (e) {} }
    };
    window.CORNER_R = corner; window.WALL_R = wall;
    try { localStorage.clear(); } catch (e) {}
  }, { corner: CORNER, wall: WALL });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof WORLD !== 'undefined', null, { timeout: 20000 });
  /* 워밍업 10초(가상) — 오프라인 보상 등 초기 오버레이가 정리되게 */
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v59tick(); });
  const r = await page.evaluate(RUN, { frames: Math.round(MIN * 60 * 60), sampleEvery: 6, stage });
  await ctx.close();
  return { ...r, errs };
}

/* REF 커밋의 index.html 을 임시 파일로 꺼내 같은 방법으로 잰다 */
function checkoutRef(sha) {
  /* 756 — 얕은 클론이면 **먼저 판다**(규약 ①). 못 가져오면 «환경이냐 진짜 없음이냐» 를 밝혀 던진다(규약 ②).
     ⚠ 이 `checkoutRef` 는 자 여섯 벌에 **글자 그대로 복사**돼 있었다 — 판는 사다리는 부품 한 벌에 둔다. */
  const got = require('./gitrev756').show(sha, 'index.html', { maxBuffer: 64 * 1024 * 1024 });
  if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
  if (got.how) console.log('[i]' + got.how);
  const out = got.buf;
  const p = path.join(ROOT, `.v59-before-${sha.slice(0, 7)}-${process.pid}.html`);
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
    const targets = [{ tag: 'after', file: path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });

    for (const t of targets) {
      const url = 'file://' + t.file.replace(/\\/g, '/');
      for (const st of STAGES) {
        process.stdout.write(`[·] ${t.tag} · stage ${st} · ${MIN}분 시뮬 … `);
        const r = await runOne(browser, url, st);
        rows.push({ tag: t.tag, st, ...r });
        console.log(`구석 ${r.corner.toFixed(1)}% · 벽 ${r.wall.toFixed(1)}% · 사망 ${r.deaths} · 최종 stage ${r.stage}`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | stage | 표본 | 구석<200 | 벽<150 | 사망/분 | 중심거리 평균 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.st} | ${r.n} | ${r.corner.toFixed(1)}% | ${r.wall.toFixed(1)}% | ${(r.deaths / MIN).toFixed(2)} | ${Math.round(r.meanR)}px |`);

  const fails = [];
  for (const r of rows.filter(r => r.tag === 'after')) {
    if (r.errs.length) fails.push(`stage ${r.st}: pageerror ${r.errs[0]}`);
    if (r.corner >= LIM_CORNER) fails.push(`stage ${r.st}: 구석 체류 ${r.corner.toFixed(1)}% ≥ ${LIM_CORNER}%`);
    if (r.wall >= LIM_WALL) fails.push(`stage ${r.st}: 벽 체류 ${r.wall.toFixed(1)}% ≥ ${LIM_WALL}%`);
    const b = rows.find(x => x.tag !== 'after' && x.st === r.st);
    if (b && r.deaths > b.deaths * 1.15 + 1) fails.push(`stage ${r.st}: 사망 ${b.deaths} → ${r.deaths} (악화)`);
  }
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); console.log('\nV59 FAIL'); process.exit(1); }
  console.log('\nV59 PASS');
})().catch(e => { console.error(e); process.exit(2); });
