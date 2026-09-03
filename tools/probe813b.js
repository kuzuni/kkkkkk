#!/usr/bin/env node
/* 작업 813 — **지렛대 스윕**: 등재문이 적어 둔 후보 셋을 실제로 굴려 본다
 *
 *   node tools/probe813b.js
 *
 * 등재문(813)의 지렛대 후보:
 *   ① `--rw-g3` 하한 44 → n      (안내문 아래만 회수 — 쌍 ⓑ 를 직접 연다)
 *   ② `--rw-av` 의 상한식 상수 174(= 위 최소 94 + 아래 최소 80) → n
 *      (1600 에서만 걸리는 분기라 다른 네 프레임은 안 움직인다 — 아치 다리가 길어지고 벽이 넓어진다)
 *   ③ 상인방 앵커 `--rw-lt` 의 300 → n (긴 프레임의 벽을 좁혀 **기준 간극 자체**를 줄인다)
 *
 * 왜 스윕이 필요한가 — 세 지렛대가 **서로를 상쇄**한다. ① 이 g3 를 올리면 수반이 위로 올라가
 * `tt` 가 줄고 그만큼 `av` 가 줄어 **벽이 좁아진다**(= 쌍 ⓐ 가 나빠진다). 손으로 더한 산수로는
 * 이 되먹임을 놓치므로 브라우저에게 직접 묻는다.
 *
 * 판정선(probe754 규칙) — 쌍 간극의 최솟값이 **기준 프레임(2280) 간극의 1/4** 이상.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 2280];

/* 후보 — [이름, g3 하한, av 상한식 상수, lt 의 300] */
const CASES = [
  ['현행                    ', 44, 174, 300],
  ['① g3 44→50             ', 50, 174, 300],
  ['① g3 44→56             ', 56, 174, 300],
  ['② av 174→160(아래 66)  ', 44, 160, 300],
  ['② av 174→150(아래 56)  ', 44, 150, 300],
  ['② av 174→134(아래 40)  ', 44, 134, 300],
  ['①+② g3 50 · av 150     ', 50, 150, 300],
  ['③ lt 300→260           ', 44, 174, 260],
  ['③ lt 300→243           ', 44, 174, 243],
  ['①+③ g3 50 · lt 260     ', 50, 174, 260],
  ['①+②+③ 50 · 160 · 270   ', 50, 160, 270],
];

const CSS = (g3, av, lt) => `
  #relw .rw-panel{
    --rw-g3:clamp(${g3}px,calc(var(--rw-sp) * .1325 - 38px),104px);
    --rw-av:min(calc(186px * var(--rwc,1)),calc((var(--rw-tt) - ${av}px * var(--rwc,1)) / 2));
    --rw-lt:clamp(calc(20px * var(--rwc,1)),calc(var(--rw-gt) - ${lt}px * var(--rwc,1)),
                  calc(var(--rw-gt) - var(--rw-av) - 74px * var(--rwc,1)));
  }`;

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const b = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { t: r.top - pr.top, b: r.bottom - pr.top }; };
  const o = { lintel: b('#relw .rw-lintel'), mul: b('#rwMulBar'), grid: b('#rwGrid'),
              mid: b('#relw .rw-mid'), cap: b('#relw .rw-cap'), fc: b('#relw .rw-fc.bl'),
              floor: b('#relw .rw-floor') };
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    gA: r1(o.mul.t - o.lintel.b),            /* 상인방 ↓ 배수 바 */
    gA2: r1(o.grid.t - o.mul.b),             /* 배수 바 ↓ 격자 */
    gB: r1(o.fc.t - o.cap.b),                /* 안내문 ↓ 코너 브래킷 */
    strip: r1(o.lintel.t),                   /* 상인방 위 스트립(= 죽은 벽) */
    arch: r1((o.grid.t - (o.mid.t - 516 - 174) / 2) * 0 + 516 + 2 * Math.min(186, (o.mid.t - 516 - 174) / 2)),
    clear: r1(o.mid.t - o.floor.t),          /* 바닥선 ↔ 수반 (게이트 ④ ≥ 20) */
    gapMid: r1(o.mid.t - o.grid.b),
  };
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const [name, g3, av, lt] of CASES) {
    const per = {};
    for (const fh of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      await page.evaluate(() => { try { openRelw(); } catch (e) { /* noop */ } });
      await page.addStyleTag({ content: CSS(g3, av, lt) });
      await page.waitForTimeout(200);
      per[fh] = await page.evaluate(MEASURE);
      await ctx.close();
    }
    rows.push({ name, per });
  }
  await browser.close();

  const p = (v, w) => String(v).padStart(w);
  console.log('PROBE813B — 지렛대 스윕 (1600 / 2280 · 판정선 = 2280 간극의 1/4)\n');
  console.log('  후보                        쌍ⓐ 상인방↓바        쌍ⓑ 안내문↓코너      바↓격자   스트립   아치h   클리어');
  console.log('                            1600   2280   비%   1600  2280   비%    1600  2280   2280   1600   1600');
  for (const r of rows) {
    const a1 = r.per[1600].gA, a2 = r.per[2280].gA;
    const b1 = r.per[1600].gB, b2 = r.per[2280].gB;
    const ra = a2 > 0 ? Math.round(a1 / a2 * 1000) / 10 : 0;
    const rb = b2 > 0 ? Math.round(b1 / b2 * 1000) / 10 : 0;
    const mk = (x) => (x >= 25 ? '✓' : '✗');
    console.log(`  ${r.name}${p(a1, 6)}${p(a2, 7)}${p(ra, 6)}${mk(ra)}${p(b1, 6)}${p(b2, 6)}${p(rb, 6)}${mk(rb)}` +
                `${p(r.per[1600].gA2, 7)}${p(r.per[2280].gA2, 6)}${p(r.per[2280].strip, 8)}${p(r.per[1600].arch, 7)}${p(r.per[1600].clear, 7)}`);
  }
  console.log('\n  ✓ = probe754 판정선(기준 간극의 25%) 통과 · 스트립 = 상인방 위 죽은 벽(14회차 상한 160) ·');
  console.log('  아치h = 1600 의 아치 높이(16회차가 695 → 752 로 되찾은 축) · 클리어 = 바닥선↔수반(게이트 ④ ≥ 20 · 하드 하한 53)');
  process.exit(0);
})();
