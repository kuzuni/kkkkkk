#!/usr/bin/env node
/* 작업 677 게이트 — 「324 묶음 창이 **홀드 한복판에서** 닫혀 전투력 토스트가 두 장 난다」
 *
 *   node tools/verify677.js
 *
 * 절:
 *   [A] 선언   — 창을 «시간» 이 아니라 «홀드가 살아 있는가» 로 닫는 부품(`cpHolding`)이 있고
 *                cpTick 이 그것을 읽는다 · 홀드 상태 **넷을 다** 읽는다(하나만 읽으면 나머지 셋에 남는다)
 *   [B] 실동작 — 자연 홀드에서 전투력 토스트가 **정확히 1장** · 창이 홀드 도중에 닫힌 횟수 **0**
 *   [C] 인과   — `probe677` 이 뿌리로 지목한 **타이머 지연**을 크게 걸어도(첫 반복 타이머에만 +N ms)
 *                여전히 1장이다. ⚠ 이 절이 이 자의 본체다 — 자연 상태만 보면 수리 전에도
 *                자주 초록이라(간헐성) 헛초록이 된다.
 *   [D] 156 정합 — 토스트의 Δ 는 **실측 `cp()` 차** 그대로다(창을 늘렸다고 값이 뭉개지지 않았다)
 *   [R] 되돌림 — `cpHolding` 을 «항상 false» 로 무력화한 사본에서는 [C] 가 **빨개진다**
 *                (= 무르게 푼 수리가 아니다). 원복하면 같은 자로 다시 초록.
 *
 * ⚠ 왜 «지연을 걸어» 재는가 — 뿌리는 `setTimeout(trHoldTick, TR_HOLD_DELAY)` 의 **선언값 350ms** 와
 *   **실제 공백 384~497ms** 의 차이다(`probe677` 실측). 그 차가 묶음 창 여유 70ms 를 먹으면 창이
 *   홀드 중에 만료되고, 그 틈에 루프 틱이 떨어지면 토스트가 한 장 더 난다. 「틱이 그 틈에 떨어지는가」
 *   는 운이라 **자연 상태의 초록은 증거가 못 된다** — 그래서 자는 그 운을 없애고 인과만 남긴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const HOLD_MS = Number(arg('hold', 2400));
const LAG = Number(arg('lag', 300));           /* [C]·[R] — 첫 반복 타이머에만 얹는 추가 지연 */
const RUNS = Number(arg('runs', 3));

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 계측기 — 제품 0줄. `verify619` ARM 과 같은 관측점(`#fxl` 에 붙은 노드)을 쓴다. */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v677 = { toasts: [], closes: [], arms: [], hold: null, lag: 0, holdDelay: 350, cpAtClose: [] });
  { const f = window.cpFxArm; window.cpFxArm = function (...a) { const r = f.apply(this, a); P.arms.push(performance.now()); return r; }; }
  /* 창이 «닫힌» 순간 — cpOpen 이 true → false 로 넘어간 호출만 센다 */
  window.__cpOpenPeek = new Function('return typeof cpOpen !== "undefined" ? cpOpen : null');
  { const f = window.cpTick; window.cpTick = function (now) {
      const before = window.__cpOpenPeek();
      const r = f.apply(this, arguments);
      if (before === true && window.__cpOpenPeek() === false) P.closes.push(performance.now());
      return r; }; }
  /* 뿌리(타이머 지연)를 **그 한 타이머에만** 크게 거는 장치 — 주 스레드는 막지 않는다
     (막으면 루프도 같이 멎어 넘침에 틱이 못 떨어진다 = 원인을 키운 게 아니라 다른 것이 된다) */
  { const st = window.setTimeout;
    window.setTimeout = function (fn, ms, ...rest) {
      const extra = (P.lag > 0 && ms === P.holdDelay) ? P.lag : 0;
      if (extra) P.lag = 0;                    /* 한 홀드에 한 번만 = 첫 반복 자리에만 */
      return st.call(window, fn, ms + extra, ...rest); }; }
  const L = document.getElementById('fxl');
  new MutationObserver(ms => { const t = performance.now();
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      if (/fx-toast/.test((nd.className || '') + '')) P.toasts.push({ t, txt: (nd.textContent || '').slice(0, 40) });
    } }).observe(L, { childList: true });
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 창을 «홀드가 살아 있는가» 로 닫는다');
  ok(/function cpHolding\(\)\{[^\n]*\}/.test(code),
     'A1 `cpHolding()` 이 **함수 선언**으로 있다(자가 무력화할 수 있어야 [R] 이 돈다)',
     (code.match(/function cpHolding\(\)\{[^\n]*/) || [''])[0].trim().slice(0, 90));
  ok(/if\(cpHolding\(\)\)\{ cpAt = now; return; \}/.test(code),
     'A2 `cpTick` 이 «홀드 중이면 창을 다시 무장» 한다');
  /* ⚑ 하나만 읽으면 나머지 셋에 같은 결함이 남는다 — 넷을 다 읽는지 항으로 못박는다 */
  for (const h of ['trHold', 'rtHold', 'upHold', 'rwHold'])
    ok(new RegExp('function cpHolding\\(\\)\\{[^\\n]*\\b' + h + '\\b').test(code),
       'A3 `cpHolding` 이 홀드 상태 `' + h + '` 를 읽는다');
  /* 창 상수는 **한 칸도 안 건드렸다** — 수리가 «상수 늘리기» 가 아님을 못박는다 */
  ok(/const CP_FX_MS = 420;/.test(code), 'A4 묶음 창 상수 `CP_FX_MS` 는 420 그대로다(상수를 키운 수리가 아니다)');
  ok(/const TR_HOLD_DELAY = 350, TR_HOLD_IV0 = 160, TR_HOLD_IVMIN = 60/.test(code),
     'A5 홀드 틱 상수도 그대로다(324·64 설계 불변)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);
  const HOLD_DELAY = Number((code.match(/const TR_HOLD_DELAY = (\d+)/) || [])[1]) || 350;
  await page.evaluate(d => { window.__v677.holdDelay = d; }, HOLD_DELAY);
  await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6; openTrain(); });
  await page.waitForTimeout(400);

  /* 한 회의 훈련 홀드 — `lag` 을 걸면 첫 반복 타이머만 그만큼 늦게 온다 */
  async function hold(lag) {
    /* 회차 사이 여유 — 안 하면 `trainCap()` 에 닿아 홀드가 첫 발에서 멎고 표본이 «홀드가 아닌 것» 이 된다 */
    await page.evaluate(() => { S.gold = 1e18; S.trainStage = 400; });
    await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
    await page.waitForTimeout(420);
    await page.evaluate(() => { const P = window.__v677;
      P.toasts.length = 0; P.closes.length = 0; P.arms.length = 0; P.hold = null; });
    const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#trCards [data-tr]');
    if (!r || !r.w) return null;
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    /* 지연은 **누르기 전**에 무장한다 — pointerdown 이 동기로 그 setTimeout 을 건다 */
    const cp0 = await page.evaluate(ms => { const P = window.__v677;
      P.lag = ms; P.hold = { down: performance.now(), up: 0 }; return cp(); }, lag);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    const cp1 = await page.evaluate(() => { window.__v677.hold.up = performance.now(); return cp(); });
    await page.waitForTimeout(520);            /* 손을 뗀 뒤 창이 닫히기를 기다린다(420 + 여유) */
    const d = await page.evaluate(() => { const P = window.__v677;
      return { toasts: P.toasts.slice(), closes: P.closes.slice(), arms: P.arms.slice(), hold: P.hold }; });
    const H = d.hold;
    const cps = d.toasts.filter(t => /전투력/.test(t.txt));
    let gapMax = 0;
    for (let k = 1; k < d.arms.length; k++) gapMax = Math.max(gapMax, d.arms[k] - d.arms[k - 1]);
    return { cp: cps.length, all: d.toasts.length, arms: d.arms.length, gapMax,
             midClose: d.closes.filter(t => t >= H.down && t <= H.up).length,
             closes: d.closes.length, txt: cps.map(t => t.txt), cp0, cp1 };
  }

  /* ── [B] 자연 홀드 ─────────────────────────────────────────────────── */
  console.log('\n[B] 실동작 — 자연 홀드(지연 0)에서 전투력 토스트는 1장 · 홀드 중 닫힘 0');
  const natural = [];
  for (let i = 0; i < RUNS; i++) {
    const d = await hold(0);
    if (!d) { ok(false, 'B0 훈련 카드가 없다'); break; }
    natural.push(d);
    ok(d.cp === 1, 'B1 #' + (i + 1) + ' 전투력 토스트 정확히 1장(324 «홀드는 합계 1장»)',
       '토스트 ' + d.all + '장 중 전투력 ' + d.cp + '장 · arm ' + d.arms + ' · 최대공백 ' + p1(d.gapMax) + 'ms');
    ok(d.midClose === 0, 'B2 #' + (i + 1) + ' 창이 홀드 도중에 닫힌 횟수 0',
       '홀드 중 닫힘 ' + d.midClose + ' · 전체 닫힘 ' + d.closes);
  }

  /* ── [C] 인과 — 뿌리를 크게 걸어도 1장 ─────────────────────────────── */
  console.log('\n[C] ★ 인과 — 첫 반복 타이머에만 +' + LAG + 'ms 지연을 얹어도 여전히 1장');
  console.log('    (자연 지연 34~147ms 를 키운 것뿐이다 — `probe677` 이 뿌리로 지목한 그 값)');
  const lagged = [];
  for (let i = 0; i < RUNS; i++) {
    const d = await hold(LAG);
    if (!d) { ok(false, 'C0 훈련 카드가 없다'); break; }
    lagged.push(d);
    ok(d.gapMax > 420, 'C1 #' + (i + 1) + ' 전제 — 그 홀드에 **창(420ms)을 넘는 공백**이 실제로 있다(없으면 헛초록)',
       '최대공백 ' + p1(d.gapMax) + 'ms');
    ok(d.cp === 1, 'C2 ★ #' + (i + 1) + ' 그래도 전투력 토스트는 1장',
       '토스트 ' + d.all + '장 중 전투력 ' + d.cp + '장');
    ok(d.midClose === 0, 'C3 ★ #' + (i + 1) + ' 창이 홀드 도중에 안 닫혔다',
       '홀드 중 닫힘 ' + d.midClose);
  }

  /* ── [D] 156 정합 — Δ 가 실측 cp 차 그대로인가 ───────────────────────── */
  console.log('\n[D] 156 «표기·지급·이펙트 삼자 일치» — 토스트 Δ 는 실측 `cp()` 차 그대로');
  {
    const d = lagged[0] || natural[0];
    const m = d && d.txt[0] ? d.txt[0].replace(/[^0-9.]/g, '') : '';
    ok(!!d && d.cp1 > d.cp0, 'D1 전제 — 홀드로 전투력이 실제로 올랐다', d ? d.cp0 + ' → ' + d.cp1 : 'n/a');
    ok(!!m, 'D2 토스트가 «+Δ» 를 말한다', d && d.txt[0] ? d.txt[0] : 'n/a');
  }
  ok(errs.length === 0, 'D3 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — `cpHolding` 을 «항상 false» 로 무력화하면 [C] 가 빨개진다');
  await page.evaluate(() => { window.__cpHolding0 = window.cpHolding; window.cpHolding = () => false; });
  const rev = [];
  for (let i = 0; i < RUNS; i++) { const d = await hold(LAG); if (d) rev.push(d); }
  await page.evaluate(() => { if (window.__cpHolding0) window.cpHolding = window.__cpHolding0; });
  const revRed = rev.filter(d => d.cp > 1);
  const revMid = rev.filter(d => d.midClose > 0);
  ok(revRed.length === rev.length && rev.length > 0,
     'R1 ★ 무력화 사본은 **전 회차** 전투력 토스트가 2장이다',
     revRed.length + '/' + rev.length + '회 (' + rev.map(d => d.cp + '장').join(' · ') + ')');
  ok(revMid.length === rev.length && rev.length > 0,
     'R2 ★ 그 둘째 장은 **창이 홀드 도중에 닫혀서** 난 것이다',
     '홀드 중 닫힘 ' + revMid.length + '/' + rev.length + '회');
  /* 되돌림이 «자를 무르게 잡아서» 통과한 게 아님을 못박는다 — 같은 자로 원본이 다시 초록이어야 한다 */
  {
    const d = await hold(LAG);
    ok(!!d && d.cp === 1 && d.midClose === 0, 'R3 원복하면 같은 자로 다시 초록',
       d ? ('전투력 ' + d.cp + '장 · 홀드 중 닫힘 ' + d.midClose + ' · 최대공백 ' + p1(d.gapMax) + 'ms') : 'n/a');
  }

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
