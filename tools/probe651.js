/* 작업 651 재현 — `tools/verify358.js` §5 가 «부하» 에 흔들리는 이유를 제품에게 직접 묻는다.
 *
 *   node tools/probe651.js            → 마지막 줄이 `PROBE651 n/n PASS`
 *   node tools/probe651.js --table    → 표본 표만 크게 찍는다(회차 기록용)
 *
 * ── 무엇을 재현하나 ───────────────────────────────────────────────────────
 * 등재문(PROGRESS 651)의 진단은 «자가 **벽시계**로 재는데 제품은 **클램프된 시뮬 시계**로 돈다» 이다.
 * 제품 `loop`(index.html 38842~38847)는 매 프레임
 *     let dt = (now-last)/1000;  if(dt > 0.1) dt = 0.1;  S.playtime += dt;
 * 이므로, rAF 간격이 100ms 를 넘는 순간부터 **시뮬 시간이 벽시계보다 덜 흐른다**.
 * 그 아래에서 `path / 벽시계초` 는 «보스가 느려졌다» 가 아니라 «시계가 덜 흘렀다» 를 읽는다.
 *
 * 이 재현기는 같은 표본을 **두 자로 동시에** 재서 갈래를 가른다:
 *   ⓐ 벽시계     `path / (performance.now() Δ)`      ← 현행 §5 의 자
 *   ⓑ 시뮬 시계  `path / (S.playtime Δ)`             ← 제품이 실제로 쓴 시간
 * 그리고 부하를 **페이지 안에서** 만든다(외부 동시 실행에 기대지 않는다 — 그것은 재현이 아니라 우연이다):
 * 매 프레임 끝에서 `--load` ms 만큼 바쁘게 돈다 ⇒ rAF 간격이 그만큼 벌어진다.
 *
 * ── 두 번째 자리(같은 뿌리) ───────────────────────────────────────────────
 * §5 는 보스를 기다리는 것도 **벽시계 2200ms 고정**이다. 그런데 `startBoss()` 는
 *     spawnQ.push({ t:'boss', delay:1.4 })      (index.html 21359)
 * 로 **시뮬 1.4초** 뒤에 세운다. 시뮬이 벽시계의 0.45배로 흐르면 2200ms 는 시뮬 1.0초 —
 * 보스가 아직 없다. 실제로 부하 아래에서 §5 는 «보스가 안 섰다 — 필드 []» 로도 빨개진다.
 * ⇒ 두 결함은 하나다: **«벽시계로 시뮬을 잰다».**
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

const ARG = process.argv.slice(2);
const TABLE = ARG.includes('--table');
/* ⚠ 기본 300ms — 이 컨테이너는 **부하가 없어도** 이미 5~12fps 라 dt 가 상시 0.1 로 클램프된다.
   150ms 로는 «부하 아래 대기 > 2.2s»(§3-a) 가 2.3~2.4s 로 문턱에 붙어 그 항 자신이 플레이키해진다 —
   651 을 고치면서 651 을 새로 만드는 셈이다. 300ms 면 3.7s 로 여유가 선다. */
const LOAD = Number((ARG.find(a => a.startsWith('--load=')) || '').split('=')[1] || 300);
const REPS = Number((ARG.find(a => a.startsWith('--reps=')) || '').split('=')[1] || 2);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

/* 제품이 못박은 상수를 소스에서 읽는다(하네스 상수 부패 방지 — 336 교훈 ②) */
const DT_CAP = Number((CODE.match(/if\(dt > ([\d.]+)\) dt = [\d.]+;/) || [])[1]);
const SPAWN_DELAY = Number((CODE.match(/spawnQ\.push\(\{ t:'boss', delay:([\d.]+) \}\)/) || [])[1]);

/* ── 한 표본 ──────────────────────────────────────────────────────────────
   같은 프레임 줄에서 «벽시계» 와 «시뮬 시계» 를 **동시에** 잡는다. 두 자를 따로 돌리면
   부하가 한쪽에만 얹혀 비교 자체가 무의미해진다(등재문 처방 ⓒ 가 말한 바로 그 함정). */
const sample = (lvSpd, loadMs, simWin) => `(async () => {
  localStorage.clear(); Object.assign(S, DEF());
  S.stage = 50; S.best = 50; S.lv.spd = ${lvSpd}; markDirty();
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
  enemies.length = 0; spawnQ.length = 0;
  startBoss();
  const B = () => enemies.find(e => e.tk === 'boss');
  /* 보스를 «시뮬로» 기다린다 — 벽시계 고정 대기가 부하에서 무너지는 자리다.
     ⚠ 부하는 **대기 구간에도** 걸어야 한다. 표본 구간에만 걸면 «보스를 기다릴 때는 한가하다» 는
        있지도 않은 세계를 재게 된다(실제 부하는 세션 내내 걸려 있다). */
  const w0 = performance.now(), ws0 = S.playtime;
  while (!B() && performance.now() - w0 < 20000) {
    await new Promise(r2 => setTimeout(r2, 40));
    ${loadMs ? `{ const z = performance.now(); while (performance.now() - z < ${loadMs}); }` : ''}
  }
  const waitWall = +((performance.now() - w0) / 1000).toFixed(3);
  const waitSim = +(S.playtime - ws0).toFixed(3);
  if (!B()) return { err: '보스가 안 섰다', waitWall, waitSim };
  const baseSp = +B().sp.toFixed(1);
  let dist = 0, px = B().x, py = B().y, fr = 0, why = 'win';
  let mx = 0;                                       /* 프레임별 «거리/시뮬dt» 의 최댓값(대시 포함) */
  let mxC = 0, nC = 0;                              /* 대시·예고를 뺀 «추격» 프레임만의 최댓값 */
  const t0 = performance.now(), s0 = S.playtime;
  let ps = S.playtime;
  for (let i = 0; i < 900; i++) {
    await new Promise(r2 => requestAnimationFrame(r2));
    ${loadMs ? `{ const z = performance.now(); while (performance.now() - z < ${loadMs}); }` : ''}
    const e2 = B(); if (!e2) { why = '보스 소멸'; break; }
    const d = Math.hypot(e2.x - px, e2.y - py); px = e2.x; py = e2.y;
    const dts = S.playtime - ps; ps = S.playtime;
    dist += d; fr++;
    if (dts > 0) {
      mx = Math.max(mx, d / dts);
      /* 359 대시(dashD)·예고(dashT) 프레임은 «추격» 이 아니다 — 그 축은 DASH.boss.spd 다.
         (이 블록은 템플릿 리터럴 안이다 — 여기 백틱을 쓰면 문자열이 끊긴다) */
      if (!(e2.dashD > 0) && !(e2.dashT > 0)) { nC++; mxC = Math.max(mxC, d / dts); }
    }
    if (S.playtime - s0 >= ${simWin}) { why = '시뮬 창 도달'; break; }
  }
  const wall = (performance.now() - t0) / 1000, sim = S.playtime - s0;
  return { waitWall, waitSim, fr, why, baseSp, dist: +dist.toFixed(1),
           wall: +wall.toFixed(3), sim: +sim.toFixed(3),
           fps: +(fr / Math.max(1e-3, wall)).toFixed(1),
           avgWall: +(dist / Math.max(0.001, wall)).toFixed(1),
           avgSim: +(dist / Math.max(0.001, sim)).toFixed(1),
           maxSim: +mx.toFixed(1), chase: +mxC.toFixed(1), nC,
           dashSpd: +(stat.speed * DASH.boss.spd).toFixed(1),
           floor: +(stat.speed * BOSS_CHASE).toFixed(1) };
})()`;

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  await page.goto('file://' + SRC.replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  return { page, errs };
}

const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const row = (tag, r) => `    ${tag.padEnd(16)} fr ${String(r.fr).padStart(3)} · ${String(r.fps).padStart(5)}fps · `
  + `벽 ${String(r.wall).padStart(6)}s / 시뮬 ${String(r.sim).padStart(5)}s (×${(r.sim / r.wall).toFixed(2)}) · `
  + `평균벽 ${String(r.avgWall).padStart(6)} · 평균시뮬 ${String(r.avgSim).padStart(6)} · 최대 ${String(r.maxSim).padStart(6)} · `
  + `추격 ${String(r.chase).padStart(6)}(${String(r.nC).padStart(2)}프) px/s · 바닥 ${r.floor} · 대시 ${r.dashSpd} · ${r.why}`;

(async () => {
  console.log('=== §0 제품이 쓰는 시계 (소스) ===');
  ok(Number.isFinite(DT_CAP) && DT_CAP > 0, '0 `loop` 이 dt 를 클램프한다 = 시뮬 시계는 벽시계와 다르다', 'dt cap ' + DT_CAP + 's');
  ok(/S\.playtime \+= dt;/.test(CODE), '0 그 클램프된 dt 가 `S.playtime` 에 그대로 쌓인다(= 시뮬 시계를 페이지가 이미 갖고 있다)');
  ok(Number.isFinite(SPAWN_DELAY) && SPAWN_DELAY > 0, '0 보스 예약 지연도 **시뮬 초**다(벽시계가 아니다)', SPAWN_DELAY + 's');

  const browser = await launch(chromium, { args: ['--no-sandbox'] });
  const h = await open(browser);
  const SIMWIN = 2.5;
  const R = { free: [], load: [] };

  await blk('§1', async () => {
    console.log('\n=== §1 표본 — 부하 없음 / 부하 ' + LOAD + 'ms (같은 페이지 · 같은 표본) ===');
    for (let i = 0; i < REPS; i++) {
      const f0 = await h.page.evaluate(sample(0, 0, SIMWIN));
      const l0 = await h.page.evaluate(sample(0, LOAD, SIMWIN));
      if (f0.err || l0.err) { ok(false, '1 표본을 못 만들었다', JSON.stringify(f0.err ? f0 : l0)); return; }
      R.free.push(f0); R.load.push(l0);
      console.log(row(`부하없음 #${i + 1}`, f0));
      console.log(row(`부하${LOAD}ms #${i + 1}`, l0));
    }
    ok(R.free.length === REPS && R.load.length === REPS, '1 표본이 다 모였다', `${R.free.length}+${R.load.length}`);
  });

  await blk('§2', async () => {
    if (!R.free.length) return ok(false, '2 표본 없음');
    console.log('\n=== §2 갈래 판정 — 부하는 «시계» 를 늦추지 «보스» 를 늦추지 않는다 ===');
    const fRatio = med(R.free.map(r => r.sim / r.wall));
    const lRatio = med(R.load.map(r => r.sim / r.wall));
    ok(lRatio < fRatio * 0.9, '2-a 부하가 걸리면 시뮬 시간이 벽시계보다 **덜 흐른다**(그것이 부하의 정의다)',
      `시뮬/벽 = 부하없음 ×${fRatio.toFixed(2)} → 부하 ×${lRatio.toFixed(2)}`);

    const fW = med(R.free.map(r => r.avgWall)), lW = med(R.load.map(r => r.avgWall));
    ok(lW < fW * 0.85, '2-b **벽시계 자**(현행 §5)는 부하에서 통째로 내려앉는다 = 이것이 등재된 빨강이다',
      `평균벽 ${fW} → ${lW} px/s (×${(lW / fW).toFixed(2)})`);

    /* ⚑ 자를 **평균**에서 **추격 최댓값**으로 옮긴 이유가 여기 있다. 시뮬 시계로 바꾸는 것만으로는
       모자란다 — 평균은 표본 창이 어느 국면(공격 모션 정지·돌진)에 걸렸는지에 계속 흔들린다. */
    const ALL = R.free.concat(R.load);
    const cOff = Math.max(...ALL.map(r => Math.abs(r.chase / r.floor - 1)));
    ok(cOff <= 0.01, '2-c **시뮬 시계 × 추격 최댓값** 자는 부하 유무와 무관하게 소스가 말한 바닥에 붙는다 = 처방',
      `표본 ${ALL.length}개 전부 실측 추격 = 바닥(최대 어긋남 ${(cOff * 100).toFixed(2)}%)`);
    const sOff = Math.max(...ALL.map(r => Math.abs(r.avgSim / r.floor - 1)));
    ok(sOff > 0.2, '2-c2 반대로 **평균**은 시뮬 시계로 재도 바닥을 못 맞힌다(그래서 평균이 아니라 최댓값이다)',
      `평균시뮬 ${ALL.map(r => r.avgSim).join('/')} vs 바닥 ${ALL[0].floor} px/s`);

    const wOff = Math.abs(lW / fW - 1);
    ok(cOff < wOff, '2-d 두 자를 나란히 놓으면 추격 자가 **덜 흔들린다**',
      `흔들림 벽 ${(wOff * 100).toFixed(1)}% vs 추격 ${(cOff * 100).toFixed(2)}%`);
  });

  await blk('§3', async () => {
    if (!R.free.length) return ok(false, '3 표본 없음');
    console.log('\n=== §3 벽시계 대기(2200ms)가 부하에서 모자란다 ===');
    const W = 2.2;                                   /* 구 §5 의 고정 대기 */
    const lw = med(R.load.map(r => r.waitWall));
    const need = med(R.load.map(r => r.waitWall / Math.max(0.01, r.waitSim)));
    ok(lw > W, `3-a 부하 아래에서 보스는 벽시계 ${W}s 안에 안 선다(구 §5 의 고정 대기가 짧다)`,
      `실측 대기 ${lw}s · 부하없음 ${med(R.free.map(r => r.waitWall))}s`);
    ok(need > 1.2, '3-b 그 대기가 모자란 이유는 «시뮬 1초를 벌려면 벽시계가 그 이상 든다» 이다',
      `벽/시뮬 ×${need.toFixed(2)} · 예약 지연 ${SPAWN_DELAY} 시뮬초 = 벽시계 ${(need * SPAWN_DELAY).toFixed(2)}s`);
    ok(R.load.every(r => r.waitSim >= SPAWN_DELAY * 0.9),
      '3-c 시뮬로 재면 대기는 부하와 무관하게 예약 지연 그대로다(늦은 것은 보스가 아니라 시계다)',
      `시뮬 대기 ${R.load.map(r => r.waitSim).join('/')}s vs 예약 ${SPAWN_DELAY}s`);
  });

  await blk('§4', async () => {
    console.log('\n=== §4 에러 ===');
    ok(h.errs.length === 0, '4 콘솔·페이지 에러 0건', h.errs.slice(0, 3).join(' / ') || '0');
  });

  await browser.close();
  console.log(`\nPROBE651 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
