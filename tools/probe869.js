#!/usr/bin/env node
/* 작업 869 재현 — «`verify797` [4-a] 의 문턱이 «자를 돌리는 기계» 에 걸려 있다» 를 잰다
 *
 *   node tools/probe869.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설부터 재현한다. 등재문(PROGRESS 869)의 가설은
 *   「자가 홀드를 **고정 ms**(2200)로 누르는데 틱 수는 **환경 속도**가 정한다」 이다.
 * 그것이 참이면 «몇 회 지났나» 는 제품의 성질이 아니라 러너의 성질이고, 그 문턱은
 * 574·709·825·855·857 이 걸린 «절대 수를 러너에 댄다» 와 같은 병이다.
 *
 * 갈래는 둘이고 프로브가 갈라야 한다:
 *   ⓐ **느린 러너** — 홀드는 살아 있는데 틱 간격이 제품 상수(TR_HOLD_*)보다 훨씬 길다
 *   ⓑ **일찍 멈춤** — 홀드가 중간에 죽는다(재화 소진 · 팝업 닫힘 · pointerleave …)
 * ⓐ 면 처방은 «틱을 세며 기다린다»(등재문 ⓐ), ⓑ 면 자가 아니라 제품/자의 표본이 문제다.
 *
 * 재는 것 — 실제 홀드에서 `summonRelicBatch` 호출 시각(ms)·`hbBeat` 맥박 시각·정지 사유,
 * 그리고 **제품 상수가 약속하는 시각표**(TR_HOLD_DELAY → IV0 ×ACCEL, 하한 IVMIN).
 * 약속 시각표와 실측을 나란히 놓으면 «기계가 얼마나 뒤처지는가» 가 배수로 나온다.
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const HOLD = +(process.env.P869_HOLD || 2200);   /* verify797 [4] 와 같은 눈금 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

/* 제품 상수가 약속하는 시각표 — 소스에서 읽는다(손으로 베끼면 상수가 바뀔 때 거짓말이 된다) */
function schedule(src, ms) {
  const m = src.match(/const TR_HOLD_DELAY = (\d+), TR_HOLD_IV0 = (\d+), TR_HOLD_IVMIN = (\d+), TR_HOLD_ACCEL = ([\d.]+);/);
  if (!m) return null;
  const [, d, iv0, ivmin, acc] = m;
  const t = [0];                       /* pointerdown 의 첫 발 */
  let now = +d, iv = +iv0;
  while (now <= ms) { t.push(now); iv = Math.max(+ivmin, iv * +acc); now += iv; }
  return { delay: +d, iv0: +iv0, ivmin: +ivmin, acc: +acc, times: t };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const sch = schedule(src, HOLD);
  console.log('§0 제품 상수 — 홀드 ' + HOLD + 'ms 가 약속하는 틱');
  ok(!!sch, '[0-a] 홀드 상수를 소스에서 읽었다',
     sch ? ('DELAY ' + sch.delay + ' · IV0 ' + sch.iv0 + ' · IVMIN ' + sch.ivmin + ' · ACCEL ' + sch.acc) : '못 읽음');
  ok(!!sch && sch.times.length >= 4,
     '[0-b] ★ 상수만 보면 ' + HOLD + 'ms 는 4회를 **한참** 넘긴다(문턱 4 는 무리한 수가 아니었다)',
     sch ? (sch.times.length + '회 · 4회째 t=' + sch.times[3] + 'ms') : '—');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();
  });

  /* ── §1 실제 홀드 — 호출 시각을 찍는다 ─────────────────────────────── */
  console.log('§1 실측 — ' + HOLD + 'ms 홀드에서 `summonRelicBatch` 가 지나는 시각');
  await page.evaluate(() => {
    openRelw();
    window.__p869 = { t0: 0, batch: [], hb: [], stop: null };
    const o = window.summonRelicBatch;
    window.summonRelicBatch = function () {
      const r = o.apply(this, arguments);
      window.__p869.batch.push({ t: Math.round(performance.now() - window.__p869.t0), got: !!r });
      return r;
    };
    const ohb = window.hbBeat;
    window.hbBeat = function () { window.__p869.hb.push(Math.round(performance.now() - window.__p869.t0)); return ohb.apply(this, arguments); };
    /* 정지 사유 — 홀드가 «중간에 죽는» 갈래 ⓑ 를 가른다 */
    const ost = window.rwHoldStop;
    if (typeof ost === 'function') window.rwHoldStop = function (done) {
      if (window.__p869.stop === null && window.rwHold)
        window.__p869.stop = { t: Math.round(performance.now() - window.__p869.t0), done: !!done };
      return ost.apply(this, arguments);
    };
  });
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => {
    const r = document.getElementById('rwBasin').getBoundingClientRect();
    window.__p869.t0 = performance.now();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => window.__p869);

  const ts = r.batch.map(x => x.t);
  console.log('      호출 시각(ms): [' + ts.join(', ') + ']');
  console.log('      맥박 시각(ms): [' + r.hb.join(', ') + ']');
  console.log('      정지: ' + (r.stop ? JSON.stringify(r.stop) : '홀드 중 정지 없음(손을 뗄 때 멈췄다)'));

  const alive = !r.stop || r.stop.t >= HOLD - 60;
  ok(alive, '[1-a] ★ 갈래 ⓑ 기각 — 홀드는 ' + HOLD + 'ms 내내 살아 있다(재화 소진·팝업 닫힘 아님)',
     r.stop ? ('정지 t=' + r.stop.t + 'ms') : '정지 없음');
  ok(r.batch.every(x => x.got), '[1-b] 모든 호출이 실제로 유물을 받았다(빈손 반환 0)',
     r.batch.filter(x => !x.got).length + '건 빈손');
  ok(r.hb.length === r.batch.length, '[1-c] 맥박 수 = 호출 수(verify797 [4-b] 와 같은 축)',
     r.hb.length + ' / ' + r.batch.length);

  /* ── §2 가설 — 문턱이 «기계» 에 걸려 있다 ──────────────────────────── */
  console.log('§2 가설 — 약속 시각표 대비 실측이 얼마나 뒤처지는가');
  const nPromised = sch ? sch.times.length : 0;
  const lag = ts.length > 1 && sch ? (ts[ts.length - 1] / (sch.times[Math.min(ts.length, sch.times.length) - 1] || 1)) : 0;
  console.log('      약속 ' + nPromised + '회 ↔ 실측 ' + ts.length + '회 · 같은 회차의 시각비 ×' + lag.toFixed(1));
  ok(ts.length < nPromised,
     '[2-a] ★ 실측 틱 수가 상수의 약속보다 **적다** = 틱 간격을 정하는 것은 제품이 아니라 **러너**다',
     ts.length + '회 < ' + nPromised + '회');
  ok(ts.length < 4,
     '[2-b] ★ 등재문 확인 — 이 기계에서 2200ms 홀드는 `verify797` 의 문턱 4 에 **못 미친다**',
     ts.length + '회 (문턱 4)');
  /* «4회를 지나려면 몇 ms 가 필요한가» — 처방 ⓐ(틱을 세며 기다린다)의 예산 근거 */
  const iv = ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / (ts.length - 1) : 0;
  console.log('      실측 평균 틱 간격 ' + iv.toFixed(0) + 'ms ⇒ 4회에 약 ' + (iv * 3).toFixed(0) + 'ms 필요');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  await ctx.close();
  await browser.close();
  console.log('PROBE869 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
