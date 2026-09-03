#!/usr/bin/env node
/* 재현 836 — `tools/verify512.js` [R1] 이 **808 의 홀드 위에서 다시** 플레이키다.
 *
 *   node tools/probe836.js                평상
 *   node tools/probe836.js --load 6       러너에 CPU 부하 6가닥(플레이키 조건)
 *   node tools/probe836.js --runs 5       ③④ 표본 수
 *
 * 등재문(PROGRESS 836): «되돌림 102 ↔ 정상 43» · «57 ↔ 20» 으로 3~5배 널뛴다.
 * 808 은 «언제 찍는가» 를 없앴는데 값이 **수천에서 수십으로 내려앉은 채** 다시 흔들렸다 —
 * 이 자가 가르는 것은 «세우기는 세웠는데 **어느 프레임에** 세웠나» 다:
 *   [1] 홀드 지점 지형 — 애니 진행률 0·5·12·18·29·46% 에 세워 놓고 크림을 센다
 *   [2] 반복 표본 — 0%(808 현행) ↔ 봉우리(836 처방) 각각 N회, 문턱 500 대비
 *   [3] 흰 심 — 알의 배경 그라디언트 안쪽 26% 는 `--c` 와 무관하게 #FFF 라
 *       **색을 하나도 안 되돌려도** 크림이 나온다(정상 프레임의 잡음 바닥)
 * 판정 [P] — ① 0% 는 골짜기다 ② 봉우리는 문턱 위이고 폭이 좁다
 *            ③ 잡음 바닥은 색 띠로 가두면 사라진다 ④ 그래서 [R1] 의 비가 5배를 넘는다
 * 되돌림 [R] — 홀드를 808 판(0%)으로 되돌리면 `verify512` 의 새 전제 [G0b] 가 먼저 빨개진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const { spawn } = require('child_process');
const fxhold = require('./fxhold512');

const SRC = path.resolve(__dirname, '../index.html');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : +argv[i + 1]; };
const LOAD = arg('--load', 0);
const RUNS = arg('--runs', 4);
const CREAM = [0xFF, 0xE9, 0xA8];
const CLIP = { x: 0, y: 0, width: 1080, height: 2280 };

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };

/* 부하는 자 자신이 아니라 **러너**에 건다(probe808 규약) */
const load = [];
for (let i = 0; i < LOAD; i++) load.push(spawn(process.execPath, ['-e', 'for(;;){Math.sqrt(Math.random())}'], { stdio: 'ignore' }));
const stopLoad = () => load.forEach(c => { try { c.kill('SIGKILL'); } catch (e) {} });

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();

  /* verify512 [G]·[R] 과 **같은 자리**의 장면을 만든다. revert=false 면 제품 색 그대로. */
  const arm = async (revert, peak) => {
    await p.goto('file://' + SRC);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof roulFinish === 'function');
    await p.waitForTimeout(900);
    await fxhold.install(p, { peak });
    await p.evaluate((rv) => {
      window.step = () => {};                                 /* 배경 전투만 멈춘다(verify512 규약) */
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      if (rv) for (const k in FXCUR) FXCUR[k].col = '#FFE9A8'; /* [R] 되돌림 — 상수 크림 한 색 */
      S.daily.spins = 30;
      openRoulette();
    }, !!revert);
    await p.waitForTimeout(500);
    await p.evaluate(() => window.__fxhold.seed(0x512));   /* 836 — 알 자리를 고정한다(verify512 와 같은 씨) */
  };
  const held = () => p.evaluate(() => window.__fxhold.holdScene(() => {
    const i = ROULETTE.findIndex(x => x && x.dia);
    roulFinish(i < 0 ? 0 : i);
  }));
  /* 350 처방 — 캡처를 페이지로 되돌려 «찍힌 픽셀» 을 읽는다.
     band=true 면 verify512 [R1] 과 같은 «색 띠» 마스크로, false 면 프레임 전체로 센다. */
  const creamOf = (before, after, geo, band) => p.evaluate(async ([a, bb, T, g, useBand]) => {
    const ld = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
    const [ia, ib] = await Promise.all([ld(a), ld(bb)]);
    const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(ia, 0, 0); const A = cx.getImageData(0, 0, cv.width, cv.height).data;
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.drawImage(ib, 0, 0); const B = cx.getImageData(0, 0, cv.width, cv.height).data;
    let mask = null;
    if (useBand) {
      mask = new Uint8Array(cv.width * cv.height);
      for (const [cxp, cyp, r] of g.disks) {
        const ri = r * g.rIn, ro = r * g.rOut;
        for (let y = Math.max(0, Math.floor(cyp - ro)); y <= Math.min(cv.height - 1, Math.ceil(cyp + ro)); y++)
          for (let x = Math.max(0, Math.floor(cxp - ro)); x <= Math.min(cv.width - 1, Math.ceil(cxp + ro)); x++) {
            const d = Math.hypot(x + 0.5 - cxp, y + 0.5 - cyp);
            if (d >= ri && d <= ro) mask[y * cv.width + x] = 1;
          }
      }
    }
    let cream = 0;
    for (let i = 0; i < A.length; i += 4) {
      if (mask && mask[i >> 2] !== 1) continue;
      if (Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]) < 40) continue;
      if (Math.hypot(B[i] - T[0], B[i + 1] - T[1], B[i + 2] - T[2]) < 60) cream++;
    }
    return cream;
  }, ['data:image/png;base64,' + before.toString('base64'), 'data:image/png;base64,' + after.toString('base64'),
    CREAM, geo, !!band]);

  /* 한 번 재고 «크림 · 스케일 · 원반» 을 돌려준다 */
  const shot = async (revert, peak, band) => {
    await arm(revert, peak);
    const before = await p.screenshot({ clip: CLIP });
    const n = await held();
    const after = await p.screenshot({ clip: CLIP });
    const geo = { disks: n.disks, rIn: n.rIn, rOut: n.rOut };
    return { cream: await creamOf(before, after, geo, band), scale: n.scale, spark: n.spark };
  };

  /* ── [1] 홀드 지점 지형 ─────────────────────────────────────────── */
  console.log('\n=== [1] 홀드 지점(애니 진행률)별 «수리 전 크림» — 되돌림 프레임, 프레임 전체 (부하 ' + LOAD + '가닥) ===');
  const land = [];
  for (const fr of [0, 0.05, 0.12, 0.18, 0.29, 0.46]) {
    const r = await shot(true, fr, false);
    land.push([fr, r.cream, r.scale]);
    console.log('  진행률 ' + String(Math.round(fr * 100)).padStart(2) + '% → 크림 ' + String(r.cream).padStart(5)
      + ' · 스케일 ' + r.scale.toFixed(3) + ' · 스파크 ' + r.spark);
  }
  const at = f => (land.find(o => Math.abs(o[0] - f) < 1e-9) || [0, 0, 0])[1];
  const peakF = land.reduce((a, c) => (c[1] > a[1] ? c : a))[0];

  /* ── [2] 반복 표본 — 0%(808 현행) ↔ 봉우리(836) ─────────────────── */
  console.log('\n=== [2] 반복 표본 (문턱 500) ===');
  const sample = async (peak, band) => {
    const out = [];
    for (let i = 0; i < RUNS; i++) out.push((await shot(true, peak, band)).cream);
    return out;
  };
  const s0 = await sample(0, false);
  const sP = await sample(fxhold.PEAK, false);
  const spread = a => Math.max(...a) / Math.max(1, Math.min(...a));
  console.log('  0%(808 현행) 크림 ' + s0.join(' / ') + '  · 폭 ×' + spread(s0).toFixed(2));
  console.log('  ' + Math.round(fxhold.PEAK * 100) + '%(836 처방) 크림 ' + sP.join(' / ') + '  · 폭 ×' + spread(sP).toFixed(2));

  /* ── [3] 잡음 바닥 — 색을 하나도 안 되돌린 프레임의 크림 ─────────── */
  console.log('\n=== [3] 잡음 바닥 — **되돌리지 않은** 프레임에도 크림이 나온다(알의 흰 심) ===');
  const nAll = await shot(false, fxhold.PEAK, false);
  const nBand = await shot(false, fxhold.PEAK, true);
  const rBand = await shot(true, fxhold.PEAK, true);
  console.log('  정상 프레임 — 전체 ' + nAll.cream + ' · 색 띠 안 ' + nBand.cream);
  console.log('  되돌림 프레임 — 색 띠 안 ' + rBand.cream + '  ⇒ 비 ×' + (rBand.cream / Math.max(1, nBand.cream)).toFixed(2));

  /* ── [P] 판정 ──────────────────────────────────────────────────── */
  console.log('\n=== [P] 판정 ===');
  ok(at(0) < 500 && at(peakF) > at(0) * 5,
    '[P1] 808 의 홀드가 선 0% 는 **골짜기**다 — 봉우리는 딴 데 있다',
    '0% ' + at(0) + ' ↔ 봉우리(' + Math.round(peakF * 100) + '%) ' + at(peakF));
  ok(Math.abs(peakF - fxhold.PEAK) < 0.13,
    '[P2] 그 봉우리가 `fxhold512.PEAK` 가 못박은 자리다(키프레임 18% = scale 1 · opacity 1)',
    '실측 봉우리 ' + Math.round(peakF * 100) + '% ↔ 상수 ' + Math.round(fxhold.PEAK * 100) + '%');
  ok(sP.every(v => v > 500) && spread(sP) < 1.6 && s0.some(v => v <= 500),
    '[P3] 봉우리 홀드는 표본이 전부 문턱 위이고 폭이 좁다 — 0% 홀드는 문턱 아래를 스친다',
    '봉우리 ' + sP.join('/') + '(폭 ×' + spread(sP).toFixed(2) + ') ↔ 0% ' + s0.join('/'));
  ok(nBand.cream * 5 < rBand.cream,
    '[P4] 색 띠로 가두면 «되돌리지 않아도 나오던» 잡음이 죽어 [R1] 의 5배 문턱이 여유로 선다',
    '정상 ' + nBand.cream + ' ↔ 되돌림 ' + rBand.cream);

  /* ── [R] 되돌림 시험 — 새 전제가 실제로 문다 ────────────────────
     `verify512` [G0b]·[R0b] 는 «세운 프레임이 봉우리인가» 를 스케일 ≥ .9 로 묻는다.
     홀드가 808 판(0%)으로 되돌아가면 스케일이 .26 이라 **그 전제가 먼저** 빨개진다 —
     크림이 조용히 수십 개로 내려앉는 이번 결함을 자가 두 번 놓치지 않는다는 못이다. */
  const back = land.find(o => o[0] === 0);
  ok(back && back[2] < 0.9,
    '[R] 되돌림 — 홀드를 0%(808 판)로 되돌리면 `verify512` [G0b] 전제(스케일 ≥ .9)가 빨개진다',
    '0% 스케일 ' + (back ? back[2].toFixed(3) : '-') + ' ↔ 봉우리 '
    + ((land.find(o => Math.abs(o[0] - fxhold.PEAK) < 1e-9) || [0, 0, 0])[2]).toFixed(3));

  console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await b.close();
  stopLoad();
  process.exit(fail ? 1 : 0);
})().catch(e => { stopLoad(); console.error(e); process.exit(1); });
