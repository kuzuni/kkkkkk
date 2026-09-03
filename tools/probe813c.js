#!/usr/bin/env node
/* 작업 813 2회차 — **E 재배분 후보 스윕** (probe813b 의 후속)
 *
 *   node tools/probe813c.js
 *
 * 1회차가 남긴 §6 «E 재배분 한 벌» 을 실제 파라미터로 굴린다. 1회차의 probe813b 는
 * 등재문이 적어 둔 «지렛대 하나씩» 을 굴렸고 셋 다 못 닫는다는 것을 보였다. 이번에는
 * **예산 규칙 자체를 갈아 끼운 후보**를 굴린다.
 *
 * 바꾸는 축 넷 —
 *   G3LO/G3HI  안내문 아래 여백 clamp (현행 44 / 104).  ⚠ 하한 27 미만이면 코너 브래킷과
 *              «상자» 가 겹친다(브래킷 높이 24 + bottom 3). 1회차 §3 이 그 산수를 확인했다.
 *   CBAR       바 하변 ↔ 격자 상변 목표값 (현행 20).  CG 처방 38 = 격자 행 간(25.6)의 1.5배.
 *   GTF        격자 상변의 **새 하한** = 20(금테) + 66(상인방) + 98(바) + 벽여유.
 *              현행에는 이 하한이 없고 `av + 94` 만 있어 1600 의 벽이 av 를 따라간다.
 *   EGT        긴 프레임의 gt 를 `tt × EGT` 로 잡는다(= E 가 tt 의 1−EGT 만 먹는다).
 *              현행은 18회차 [L] 의 «아치 위:아래 = 1:3.797» 이고, 그 분해가 E 독식의 기계다.
 *
 * ⚠ `--rw-av` 에 셋째 인자(`tt − GTF − 73`)를 더한다 — gt 가 av 를 따라가지 않고 하한에
 *   묶이는 순간 «아래 예약»(받침 40 + 띠 13 + 클리어런스 20)이 av 로부터 보호되지 않기 때문이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const REF = 2280;                                   /* probe754 의 기준 프레임 */

/* [이름, CBAR, GTF, ISPLIT, LT]  — GTF 0 = 벽 하한 없음(현행) · ISPLIT 0 = 안내문 여백 분할 안 함
   LT = `--rw-lt` 의 «벽 폭» 상수(현행 300 ⇒ 긴 프레임의 벽 234 고정) */
const CASES = [
  ['현행                       ', 20, 0, 0, 300],
  ['E 벽246 + 분할             ', 38, 246, 1, 300],
  ['G E + lt 280               ', 38, 246, 1, 280],
  ['H E + lt 270               ', 38, 246, 1, 270],
  ['I 벽240 + 분할 + lt 280    ', 38, 240, 1, 280],
  ['J 벽252 + 분할 + lt 280    ', 38, 252, 1, 280],
];

const CSS = (cbar, gtf, isplit, lt) => {
  const avExtra = gtf ? `,calc(var(--rw-tt) - ${gtf}px - 73px)` : '';
  const gtLow = gtf ? `,${gtf}px` : '';
  const cap = isplit
    ? `#relw .rw-cap{top:calc(var(--rw-bt) + 216px + 38px + var(--rw-g3)
        - max(32px,calc((38px + var(--rw-g3)) * .375)))}`
    : '';
  return `
  #relw .rw-panel{
    --rw-av:min(186px,calc((var(--rw-tt) - 174px) / 2)${avExtra});
    --rw-gt:max(calc(var(--rw-av) + 94px)${gtLow},
                min(calc((var(--rw-sp) + 304px - var(--rw-av) * 2) / 4.797 + var(--rw-av)),
                    calc(var(--rw-tt) - var(--rw-av) - 137px)));
    --rw-lt:clamp(20px,calc(var(--rw-gt) - ${lt}px),
                  calc(var(--rw-gt) - var(--rw-av) - 74px));
  }
  #rwMulBar{top:calc(var(--rw-gt) - 98px
    - min(${cbar}px,calc((var(--rw-gt) - var(--rw-lt) - 164px) / 2)))}
  ${cap}`;
};

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const b = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
    return { t: r.top - pr.top, b: r.bottom - pr.top, h: r.height }; };
  const o = { lintel: b('#relw .rw-lintel'), mul: b('#rwMulBar'), grid: b('#rwGrid'),
              mid: b('#relw .rw-mid'), cap: b('#relw .rw-cap'), fc: b('#relw .rw-fc.bl'),
              floor: b('#relw .rw-floor') };
  const r1 = (v) => Math.round(v * 10) / 10;
  /* 아치는 `.rw-bg::after` 라 rect 로 못 잰다 — `--rw-fl`(= gt + 516 + av)을 얹은 `.rw-floor`
     상변에서 av 를 역산한다: av = floor.t − 격자 하변. 높이 = 516 + 2·av. */
  const av = o.floor.t - o.grid.b;
  return {
    panelH: r1(pr.height),
    gA: r1(o.mul.t - o.lintel.b),        /* 쌍ⓐ 상인방 ↓ 바 */
    gC: r1(o.grid.t - o.mul.b),          /* C 바 ↓ 격자 */
    gB: r1(o.fc.t - o.cap.b),            /* 쌍ⓑ 안내문 상자 ↓ 코너 브래킷(1회차: 유령) */
    gE: r1(o.mid.t - o.grid.b),          /* E 격자 ↓ 수반 */
    gG: r1(o.cap.t - o.mid.b),           /* G 수반 ↓ 안내문 */
    strip: r1(o.lintel.t),               /* 상인방 위 스트립 */
    av: r1(av),
    archH: r1(516 + 2 * av),
    clear: r1(o.mid.t - o.floor.t),      /* 게이트 ④ 클리어런스 ≥ 20 */
    capInkBelow: r1(pr.height - o.cap.b),
  };
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const [name, ...p] of CASES) {
    const per = {};
    for (const fh of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      await page.evaluate(() => { try { openRelw(); } catch (e) { /* noop */ } });
      await page.waitForTimeout(250);
      if (!(p[0] === 20 && !p[1] && !p[2] && p[3] === 300)) {
        await page.addStyleTag({ content: CSS(...p) });
        await page.waitForTimeout(120);
      }
      per[fh] = await page.evaluate(MEASURE);
      await ctx.close();
    }
    out.push([name, per]);
  }
  await browser.close();

  const F = (v, w = 7) => String(v).padStart(w);
  const row = (per, k) => FRAMES.map(f => F(per[f][k])).join('');
  console.log('PROBE813C — E 재배분 후보 스윕 (프레임 ' + FRAMES.join(' · ') + ' · 기준 ' + REF + ')\n');
  for (const [name, per] of out) {
    const gAmin = Math.min(...FRAMES.map(f => per[f].gA));
    const gCmin = Math.min(...FRAMES.map(f => per[f].gC));
    const rA = gAmin / per[REF].gA, rC = gCmin / per[REF].gC;
    const eMax = Math.max(...FRAMES.map(f => per[f].gE)), eMin = Math.min(...FRAMES.map(f => per[f].gE));
    const asp = FRAMES.map(f => per[f].archH / 589);
    const aspSpread = (Math.max(...asp) - Math.min(...asp)) / Math.max(...asp);
    const clr = Math.min(...FRAMES.map(f => per[f].clear));
    console.log(`■ ${name}`);
    console.log(`   쌍ⓐ 들보↓바 ${row(per, 'gA')}   최소/기준 ${(rA * 100).toFixed(1)}% ${rA >= 0.25 ? 'PASS' : '❌'}`);
    console.log(`   C   바↓격자  ${row(per, 'gC')}   최소/기준 ${(rC * 100).toFixed(1)}% ${rC >= 0.25 ? 'PASS' : '❌'}`);
    console.log(`   E   격자↓수반${row(per, 'gE')}   진폭 ${(eMax / eMin).toFixed(2)}배 · 2600 E/패널 ${(per[2600].gE / per[2600].panelH * 100).toFixed(1)}% (ref 23.5)`);
    console.log(`   스트립       ${row(per, 'strip')}   아치h ${FRAMES.map(f => F(per[f].archH)).join('')}`);
    console.log(`   G 수반↓안내문${row(per, 'gG')}   I 안내문아래 ${row(per, 'capInkBelow')}`);
    console.log(`   I/G 비       ${FRAMES.map(f => F((per[f].capInkBelow / per[f].gG).toFixed(2))).join('')}   (ref 0.58~0.62) · 쌍ⓑ ${row(per, 'gB')}`);
    console.log(`   아치 종횡 스프레드 ${(aspSpread * 100).toFixed(1)}% · 클리어런스 최소 ${clr}${clr >= 20 ? '' : ' ❌'}\n`);
  }
})();
