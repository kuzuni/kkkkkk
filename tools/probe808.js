#!/usr/bin/env node
/* 재현 808 — `tools/verify512.js` [R1] 플레이키(«수리 전 크림» 128 ↔ 2,647 ↔ 2,721).
 *
 *   node tools/probe808.js                평상 부하
 *   node tools/probe808.js --load 6       러너에 CPU 부하 6가닥을 걸고 같은 것을 잰다(플레이키 조건)
 *   node tools/probe808.js --runs 3       ③④ 표본 수
 *
 * 등재문(PROGRESS 808)의 1순위 갈래는 **«장면»** 이었다 — 자가 `roulFinish()` 뒤 **고정 110ms**
 * 한 장만 찍는다. 이 자는 그 가설을 네 눈금으로 가른다:
 *   [1] 제품 시간열 — 연출 노드가 **언제부터 언제까지** 화면에 있는가(페이지 안 rAF, 캡처 안 씀)
 *   [2] 캡처 비용   — 1080×2280 스크린샷 한 장이 이 러너에서 몇 ms 인가
 *   [3] 고정 한 장  — 종전 방식(+110ms 한 장)의 크림 값 표본
 *   [4] 홀드       — 808 처방(연출을 세워 놓고 찍는다)의 크림 값 표본
 * 판정 [P] — ① 창 < 캡처 비용(구조적으로 못 맞춘다) ② 고정 한 장은 표본 폭이 문턱을 가로지른다
 *            ③ 홀드는 표본이 전부 문턱 위이고 폭이 좁다.
 *
 * ⚑ 836 (2026-09-03) — 이 자가 두 가지로 빨갰다(제품·자 무관, 러너가 바뀐 탓):
 *   ⓐ [4] 가 홀드를 **손으로 한 벌 더** 적고 있어 808 시절 판(0% 에 서는 것)에 굳어 있었다
 *      ⇒ `tools/fxhold512.js` 한 벌을 읽게 했다(사본 0). 836 의 봉우리 홀드가 곧 여기 [4] 다.
 *   ⓑ [P1]·[P3] 의 문턱이 **808 이 돌던 러너의 절대값**(캡처 0.5s · 봉우리 2,000)에 붙어 있었다
 *      ⇒ 문장이 말하는 «같은 자릿수»·«가로지른다» 그대로 비·교차로 옮겼다(836 과 같은 처방).
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
const RUNS = arg('--runs', 3);
const CREAM = [0xFF, 0xE9, 0xA8];
const CLIP = { x: 0, y: 0, width: 1080, height: 2280 };

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };

/* 부하는 자 자신이 아니라 **러너**에 건다 — 플레이키의 조건이 «캡처가 느려지는 것» 이기 때문이다 */
const load = [];
for (let i = 0; i < LOAD; i++) load.push(spawn(process.execPath, ['-e', 'for(;;){Math.sqrt(Math.random())}'], { stdio: 'ignore' }));
const stopLoad = () => load.forEach(c => { try { c.kill('SIGKILL'); } catch (e) {} });

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();

  /* 되돌림(수리 전 = 전 재화 크림 한 색) 상태의 룰렛 수령 장면을 만든다 — verify512 [R] 과 같은 자리 */
  const arm = async () => {
    await p.goto('file://' + SRC);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof roulFinish === 'function');
    await p.waitForTimeout(900);
    await fxhold.install(p);                                    /* 836 — 홀드 한 벌을 심는다 */
    await p.evaluate(() => {
      window.step = () => {};                                   /* 배경 전투만 멈춘다(verify512 규약) */
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      for (const k in FXCUR) FXCUR[k].col = '#FFE9A8';          /* [R] 되돌림 — 상수 크림 한 색 */
      S.daily.spins = 30;
      openRoulette();
    });
    await p.waitForTimeout(500);
    await p.evaluate(() => window.__fxhold.seed(0x512));   /* 836 — 알 자리를 고정한다(verify512 와 같은 씨) */
  };
  const finish = () => p.evaluate(() => { const i = ROULETTE.findIndex(x => x && x.dia); roulFinish(i < 0 ? 0 : i); });
  /* 350 처방 — 캡처를 페이지로 되돌려 «찍힌 픽셀» 을 읽는다 */
  const creamOf = (before, after) => p.evaluate(async ([a, bb, T]) => {
    const ld = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
    const [ia, ib] = await Promise.all([ld(a), ld(bb)]);
    const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(ia, 0, 0); const A = cx.getImageData(0, 0, cv.width, cv.height).data;
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.drawImage(ib, 0, 0); const B = cx.getImageData(0, 0, cv.width, cv.height).data;
    let cream = 0;
    for (let i = 0; i < A.length; i += 4) {
      if (Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]) < 40) continue;
      if (Math.hypot(B[i] - T[0], B[i + 1] - T[1], B[i + 2] - T[2]) < 60) cream++;
    }
    return cream;
  }, ['data:image/png;base64,' + before.toString('base64'), 'data:image/png;base64,' + after.toString('base64'), CREAM]);

  /* ── [1] 제품 시간열 ────────────────────────────────────────────── */
  console.log('\n=== [1] 연출 노드 시간열 — 버스트는 언제부터 언제까지 화면에 있는가 (부하 ' + LOAD + '가닥) ===');
  await arm();
  const tl = await p.evaluate(async () => {
    const t0 = performance.now();
    const i = ROULETTE.findIndex(x => x && x.dia);
    roulFinish(i < 0 ? 0 : i);
    const out = [];
    for (let f = 0; f < 140; f++) {
      await new Promise(r => requestAnimationFrame(r));
      out.push([Math.round(performance.now() - t0),
        document.querySelectorAll('.fx-spark').length,
        document.querySelectorAll('.fx-plus').length]);
    }
    return out;
  });
  const win = k => { const on = tl.filter(o => o[k] > 0); return on.length ? [on[0][0], on[on.length - 1][0]] : null; };
  const wSpark = win(1), wPlus = win(2);
  console.log('  버스트(.fx-spark) ' + (wSpark ? wSpark[0] + '~' + wSpark[1] + 'ms (창 ' + (wSpark[1] - wSpark[0]) + 'ms)' : '없음')
    + ' · `+n`(.fx-plus) ' + (wPlus ? wPlus[0] + '~' + wPlus[1] + 'ms' : '없음'));
  const gap = (wSpark && wPlus && wPlus[0] > wSpark[1]) ? [wSpark[1], wPlus[0]] : null;
  console.log('  ⇒ 빈 창(버스트는 죽고 `+n` 은 아직) ' + (gap ? gap[0] + '~' + gap[1] + 'ms' : '없음')
    + ' — 등재문의 «크림 128» 은 이 자리에 떨어진 캡처다');

  /* ── [2] 캡처 비용 ─────────────────────────────────────────────── */
  console.log('\n=== [2] 스크린샷 한 장의 비용 ===');
  const costs = [];
  for (let i = 0; i < 3; i++) { const t = Date.now(); await p.screenshot({ clip: CLIP }); costs.push(Date.now() - t); }
  const cost = Math.round(costs.reduce((a, c) => a + c, 0) / costs.length);
  console.log('  1080×2280 ' + costs.join('/') + 'ms (평균 ' + cost + 'ms)');

  /* ── [3] 종전 방식: 고정 «+110ms 한 장» — 그 한 장이 **어디에 떨어지느냐**로 값이 갈린다 ──
     ⚠ 부하를 걸어도 러너와 페이지가 **같이** 느려져 오프셋만으로는 128 이 재현되지 않는다
       (실측: 부하 6가닥에서도 창이 331 → 451ms 로 같이 늘어난다). 그래서 여기서는 «몇 번 돌려
       빨간 실행을 기다린다» 가 아니라 **캡처 순간을 손으로 밀어** 값의 지형을 통째로 적는다 —
       프레임 grab 이 한 장의 캡처 비용(≈0.5s)만큼만 밀려도 어디에 떨어지는지가 이 표다. */
  const OFFS = [110, 300, 450, 700, 1100];
  console.log('\n=== [3] 종전 방식(고정 한 장) — 캡처 오프셋별 크림 ===');
  const old = [];
  for (const off of OFFS) {
    await arm();
    const before = await p.screenshot({ clip: CLIP });
    await finish();
    await p.waitForTimeout(off);
    const after = await p.screenshot({ clip: CLIP });
    const c = await creamOf(before, after);
    old.push(c);
    console.log('  +' + off + 'ms → 크림 ' + c);
  }

  /* ── [4] 808 처방: 연출을 세워 놓고 찍는다 ─────────────────────────
     ⚑ 836 — 여기 있던 **홀드 사본**을 지웠다. 자(`verify512`)와 이 재현기가 같은 것을 손으로 두 벌
        적고 있어서, 836 이 «어느 프레임에 세우는가» 를 고칠 때 한쪽만 고쳐질 자리였다(402 «사본을 지운다»).
        이제 둘 다 `tools/fxhold512.js` 한 벌을 읽는다 — 그래서 [4] 는 **현행 처방**을 잰다. */
  console.log('\n=== [4] 홀드 처방의 크림 표본 (836 봉우리 = ' + Math.round(fxhold.PEAK * 100) + '%) ===');
  const held = [];
  for (let r = 0; r < RUNS; r++) {
    await arm();
    const before = await p.screenshot({ clip: CLIP });
    const nodes = await p.evaluate(() => window.__fxhold.holdScene(() => {
      const i = ROULETTE.findIndex(x => x && x.dia);
      roulFinish(i < 0 ? 0 : i);
    }));
    const after = await p.screenshot({ clip: CLIP });
    held.push(await creamOf(before, after));
    if (r === 0) console.log('  (세운 버스트 ' + nodes.spark + '개 · 스케일 ' + nodes.scale.toFixed(3) + ')');
  }
  console.log('  크림 ' + held.join(' / ') + '  (문턱 500)');

  /* ── [P] 판정 ──────────────────────────────────────────────────── */
  const spread = a => Math.max(...a) / Math.max(1, Math.min(...a));
  console.log('\n=== [P] 판정 ===');
  /* ⚑ 836 — 문턱을 러너 절대값에서 **비**로 옮겼다. `cost * 1.2` 는 808 이 돌던 러너의 캡처 비용
     (0.5s 안팎)에 붙은 수라 캡처가 빨라진 러너(실측 277ms)에서는 창 407ms 가 «같은 자릿수» 인데도
     빨개졌다 — 836 이 잡은 것과 같은 병이다(문턱이 러너에 붙어 있다). 문장이 말하는 것은 비다. */
  ok(wSpark && (wSpark[1] - wSpark[0]) < cost * 3,
    '[P1] 버스트가 사는 창이 스크린샷 한 장의 비용과 같은 자릿수다 — 고정 한 장은 «맞히기» 다',
    '창 ' + (wSpark ? wSpark[1] - wSpark[0] : 0) + 'ms ↔ 캡처 ' + cost + 'ms (×'
    + (wSpark ? ((wSpark[1] - wSpark[0]) / Math.max(1, cost)).toFixed(2) : '-') + ')');
  ok(!!gap, '[P2] 버스트가 죽은 뒤 `+n` 이 뜨기까지 **빈 창**이 있다 — 그 자리에 떨어지면 128 이 된다',
    gap ? gap[0] + '~' + gap[1] + 'ms' : '없음');
  /* ⚑ 836 — 여기도 절대값(`> 2000`)을 **가로지름**으로 바꿨다. 축이 묻는 것은 «봉우리가 몇이냐» 가
     아니라 «오프셋 몇 ms 차이로 문턱의 위아래를 오가느냐» 다(실측 740 ↔ 0 ↔ 557 ↔ 76). */
  ok(Math.max(...old) > 500 && Math.min(...old) <= 500,
    '[P3] 고정 한 장은 grab 이 캡처 한 장 값만큼만 밀려도 문턱을 가로지른다(= 등재문의 128 ↔ 2,647)',
    OFFS.map((o, i) => '+' + o + 'ms:' + old[i]).join(' · '));
  ok(held.every(v => v > 500) && spread(held) < 1.6,
    '[P4] 홀드는 표본이 전부 문턱 위이고 폭이 좁다',
    '크림 ' + held.join('/') + ' · 폭 ×' + spread(held).toFixed(2));

  console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await b.close();
  stopLoad();
  process.exit(fail ? 1 : 0);
})().catch(e => { stopLoad(); console.error(e); process.exit(1); });
