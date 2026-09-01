#!/usr/bin/env node
/* 작업 677 재현기 — 「`tools/verify619.js` [D1] 이 훈련 홀드 한 번에 «전투력» 토스트를 2장 본다」
 *
 *   node tools/probe677.js                        (자연 8 회 + 부하 5 회)
 *   node tools/probe677.js --runs=12 --stall=260 --stallruns=5 --hold=2400
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 갈래 둘을 열어 뒀고 이 자가 그것을 가른다:
 *   ⓐ **제품** — 324 의 묶음 창(`CP_FX_MS` 420ms)이 홀드 **도중에** 닫힌다
 *      (= `cpFxArm` 사이 간격이 420ms 를 넘는 자리가 홀드 안에 있다) ⇒ 토스트가 실제로 2장 난다.
 *   ⓑ **자** — 창은 한 번만 닫히는데 `verify619` 의 `hold()` 가 **홀드 밖의 1장**을 같이 센다
 *      (표본 창이 홀드 구간보다 넓다).
 *
 * 두 갈래는 **토스트가 찍힌 시각**으로 갈린다 — 그래서 이 자는 세 시계를 같은 축(performance.now)에
 * 올려 놓고 잰다: ① 홀드 구간(down↔up) ② `cpFxArm` 이 창을 무장한 시각 ③ 토스트가 `#fxl` 에 붙은 시각.
 *   · 토스트가 **둘 다 [down, up] 안**이면 ⓐ(창이 홀드 중에 닫혔다) — 그 자리의 arm 간격을 같이 찍는다.
 *   · 한 장이 **down 앞**이거나 **up + CP_FX_MS 뒤**면 ⓑ(자의 표본 창이 넓다).
 *
 * ⚠ 계측기는 제품을 한 줄도 안 고친다 — 전부 페이지 안에서 함수를 감싸기만 한다(`verify619` ARM 선례).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const RUNS = Number(arg('runs', 8));
const HOLD_MS = Number(arg('hold', 2400));
const STALL = Number(arg('stall', 300));        /* [2] 인과 — 첫 반복 타이머에만 얹는 추가 지연(ms) */
const STALL_RUNS = Number(arg('stallruns', 5));

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 페이지에 심는 계측기 — 제품 0줄 */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__p677 = { arms: [], toasts: [], notifies: [], closes: [], ticks: [], buys: [], hold: null });
  /* ② 창 무장 시각 */
  { const f = window.cpFxArm; window.cpFxArm = function (...a) { const r = f.apply(this, a); P.arms.push(performance.now()); return r; }; }
  /* 창이 «닫히는» 순간 — cpTick 이 실제로 토스트를 낸 호출만 센다(닫힘 = cpOpen true → false) */
  { const f = window.cpTick; window.cpTick = function (now) {
      const before = window.__cpOpenPeek ? window.__cpOpenPeek() : null;
      P.ticks.push(performance.now());          /* ★ 루프가 실제로 돈 시각 — 창이 «닫힐 기회» 다 */
      const r = f.apply(this, arguments);
      const after = window.__cpOpenPeek ? window.__cpOpenPeek() : null;
      if (before === true && after === false) P.closes.push(performance.now());
      return r; }; }
  /* 훈련 틱 — arm 간격의 뿌리(강화가 실제로 굴러간 시각) */
  { const f = window.trainBuy; if (typeof f === 'function') window.trainBuy = function (...a) {
      const r = f.apply(this, a); P.buys.push({ t: performance.now(), ok: !!r }); return r; }; }
  /* ③ 토스트가 `#fxl` 에 붙은 시각 — 자와 **같은 방식**으로 센다(verify619 ARM 과 같은 관측점) */
  const L = document.getElementById('fxl');
  new MutationObserver(ms => { const t = performance.now();
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      if (/fx-toast/.test((nd.className || '') + '')) P.toasts.push({ t, txt: (nd.textContent || '').slice(0, 40) });
    } }).observe(L, { childList: true });
  /* ★ [2] 인과용 장치 — **타이머 지연만** 키운다.
     [1] 이 실측한 뿌리는 «`setTimeout(trHoldTick, TR_HOLD_DELAY)` 가 선언값보다 늦게 온다» 이고
     자연 지연은 +66~+147ms 다. 주 스레드를 통째로 막는 방식은 **루프도 같이 멈춰** 넘침에 틱이
     못 떨어진다(그래서 첫 판본이 0/5 였다) — 그건 원인을 키운 게 아니라 다른 것을 만든 것이다.
     여기서는 **그 한 타이머만** 늦추고 루프는 그대로 돌린다 = 자연 지연이 커진 기계와 같은 그림.
     ⚠ 제품은 여전히 0줄이다(페이지 안 `setTimeout` 을 감싸기만 한다). */
  P.lag = 0;
  { const st = window.setTimeout;
    window.setTimeout = function (fn, ms, ...rest) {
      const extra = (P.lag > 0 && ms === P.holdDelay) ? P.lag : 0;
      if (extra) P.lag = 0;                     /* 한 홀드에 **한 번만** — 첫 반복 자리에만 건다 */
      return st.call(window, fn, ms + extra, ...rest);
    }; }
  /* notify 호출 자체도 따로 센다 — «붙었는가» 와 «불렀는가» 가 갈리면 그것도 답이다 */
  { const f = window.notify; if (typeof f === 'function') window.notify = function (...a) {
      P.notifies.push({ t: performance.now(), txt: String(a[0] || '').slice(0, 40) }); return f.apply(this, a); }; }
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  console.log('[0] 전제 — 324 묶음 창과 홀드 틱 상수를 소스에서 읽는다');
  const cpMs = Number((code.match(/const CP_FX_MS\s*=\s*(\d+)/) || [])[1]);
  const hd = code.match(/const TR_HOLD_DELAY\s*=\s*(\d+),\s*TR_HOLD_IV0\s*=\s*(\d+),\s*TR_HOLD_IVMIN\s*=\s*(\d+)/);
  ok(cpMs > 0, '0a `CP_FX_MS` 를 읽었다', 'CP_FX_MS = ' + cpMs + 'ms');
  ok(!!hd, '0b 홀드 틱 상수를 읽었다', hd ? ('DELAY ' + hd[1] + ' · IV0 ' + hd[2] + ' · IVMIN ' + hd[3]) : 'n/a');
  const HOLD_DELAY = hd ? Number(hd[1]) : 350;
  ok(HOLD_DELAY < cpMs, '0c 전제 — 첫 발↔반복 최대 공백(' + HOLD_DELAY + ') < 묶음 창(' + cpMs + ') = 설계상 창은 홀드 중에 안 닫힌다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  /* `cpOpen` 은 모듈 지역 변수라 밖에서 못 읽는다 — 읽는 창을 하나 뚫어 둔다(계측 전용, 제품 0줄) */
  await page.evaluate(() => { window.__cpOpenPeek = new Function('return typeof cpOpen !== "undefined" ? cpOpen : null'); });
  await page.evaluate(ARM);
  await page.evaluate(d => { window.__p677.holdDelay = d; }, HOLD_DELAY);
  await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6; openTrain(); });
  await page.waitForTimeout(400);


  /* ── 한 회의 훈련 홀드를 재고 한 줄로 돌려준다 ─────────────────────────────
     `stall` = **첫 반복 타이머에만** 얹는 추가 지연(ms).
     ⚑ 이것이 이 자의 핵심 장치다 — 뿌리는 «타이머 지연» 이고(아래 [2] 실측),
     지연은 부하에 비례한다. 실측에서 자연 지연은 36~147ms 라 넘침이 «가끔» 만 생기는데,
     그 우연을 기다리는 대신 **같은 원인을 크게 걸어** 인과를 못박는다.
     (부하를 거는 것이지 제품을 고치는 것이 아니다 — 제품은 여전히 0줄이다.) */
  async function runHold(stall) {
    /* ⚠ 회차 사이 여유를 되살린다 — 안 하면 3~4 회 만에 `trainCap()` 에 닿아 홀드가 첫 발에서 멎고
       (실측: 초기 판본의 7·8 회차가 arm 1·0 으로 주저앉았다) 표본이 «홀드가 아닌 것» 으로 바뀐다. */
    await page.evaluate(() => { S.gold = 1e18; S.trainStage = 400; });
    await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
    await page.waitForTimeout(420);
    await page.evaluate(() => { const P = window.__p677;
      P.arms.length = 0; P.toasts.length = 0; P.notifies.length = 0;
      P.closes.length = 0; P.ticks.length = 0; P.buys.length = 0; P.hold = null; });
    const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#trCards [data-tr]');
    if (!r || !r.w) return null;
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    /* 지연은 **누르기 전**에 무장한다 — pointerdown 이 동기로 `setTimeout(trHoldTick, DELAY)` 을 건다 */
    await page.evaluate(ms => { const P = window.__p677; P.lag = ms; P.hold = { down: performance.now(), up: 0 }; }, stall);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await page.evaluate(() => { window.__p677.hold.up = performance.now(); });
    await page.waitForTimeout(420);                    /* verify619 hold() 와 같은 꼬리 */
    const d = await page.evaluate(() => { const P = window.__p677;
      return { arms: P.arms.slice(), toasts: P.toasts.slice(), notifies: P.notifies.slice(),
               closes: P.closes.slice(), ticks: P.ticks.slice(), buys: P.buys.slice(), hold: P.hold }; });
    const cps = d.toasts.filter(t => /전투력/.test(t.txt));
    const H = d.hold;
    let gapMax = 0, gapAt = 0;
    for (let k = 1; k < d.arms.length; k++) { const g = d.arms[k] - d.arms[k - 1];
      if (g > gapMax) { gapMax = g; gapAt = d.arms[k - 1] - H.down; } }
    const inHold = cps.filter(t => t.t >= H.down && t.t <= H.up).length;
    const afterUp = cps.filter(t => t.t > H.up).length;
    const beforeDown = cps.filter(t => t.t < H.down).length;
    /* ★ 갈래를 가르는 값 — 창이 **홀드 도중에** 닫힌 시각(있으면 ⓐ) */
    const closeIn = d.closes.filter(t => t >= H.down && t <= H.up).map(t => p1(t - H.down));
    /* ★★ «넘침(overhang)» — arm 사이 공백이 묶음 창보다 길면 그 초과분
       `[arm_prev + CP_FX_MS, arm_next]` 는 **창이 열린 채 이미 만료된 구간**이다.
       그 구간에 루프 틱(cpTick 호출)이 한 번이라도 들어오면 거기서 창이 닫히고 토스트가 한 장 더 난다.
       ⇒ 「2장이 나는가」 는 운(틱이 그 틈에 떨어지는가) · 「넘침이 있는가」 는 **구조**. 둘을 따로 찍는다. */
    let overMs = 0, overHit = 0, overN = 0;
    for (let k = 1; k < d.arms.length; k++) {
      const a0 = d.arms[k - 1], a1 = d.arms[k];
      if (a1 - a0 <= cpMs) continue;
      overN++; overMs = Math.max(overMs, a1 - a0 - cpMs);
      if (d.ticks.some(t => t >= a0 + cpMs && t <= a1)) overHit++;
    }
    const frameIv = d.ticks.length > 1
      ? p1((d.ticks[d.ticks.length - 1] - d.ticks[0]) / (d.ticks.length - 1)) : 0;
    return { cp: cps.length, all: d.toasts.length, arms: d.arms.length, buys: d.buys.length,
             closes: d.closes.length, closeIn, gapMax, gapAt, inHold, afterUp, beforeDown,
             overN, overMs, overHit, frameIv, holdMs: H.up - H.down,
             at: cps.map(t => p1(t.t - H.down)) };
  }

  const line = (tag, r) => '   ' + tag + ' 전투력 ' + r.cp + '장 / 토스트 ' + r.all + '장'
    + ' · arm ' + r.arms + ' · 강화 ' + r.buys + ' · 창닫힘 ' + r.closes
    + (r.closeIn.length ? '(홀드 중 +' + r.closeIn.join('/') + 'ms)' : '')
    + ' · arm 최대공백 ' + p1(r.gapMax) + 'ms(홀드 +' + p1(r.gapAt) + 'ms)'
    + ' · 넘침 ' + r.overN + '자리(최대 +' + p1(r.overMs) + 'ms · 틱이 떨어진 자리 ' + r.overHit + ')'
    + ' · 루프 평균 ' + r.frameIv + 'ms'
    + ' · 토스트 시각 [' + r.at.join(', ') + '] (홀드 0..' + p1(r.holdMs) + ')'
    + ' · 홀드안 ' + r.inHold + ' / up뒤 ' + r.afterUp + ' / down앞 ' + r.beforeDown;

  const stat = rows => {
    const red = rows.filter(r => r.cp > 1);
    return { red, gapOver: rows.filter(r => r.gapMax > cpMs), over: rows.filter(r => r.overN > 0),
             hit: rows.filter(r => r.overHit > 0), mid: rows.filter(r => r.closeIn.length > 0),
             before: rows.filter(r => r.beforeDown > 0),
             ivAvg: p1(rows.reduce((a, r) => a + r.frameIv, 0) / Math.max(1, rows.length)) };
  };

  /* ── [1] 자연 상태 — 「넘침」이 구조적으로 생기는가 ───────────────────────── */
  console.log('\n[1] 자연 상태 — 훈련 홀드 ' + RUNS + '회 (홀드 ' + HOLD_MS + 'ms · 자와 같은 꼬리 = up + 420ms)');
  const rows = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runHold(0);
    if (!r) { ok(false, '1x 훈련 카드가 없다'); break; }
    rows.push(r); console.log(line('#' + (i + 1), r));
  }
  const s1 = stat(rows);
  ok(rows.length === RUNS, '1a 표본이 다 찍혔다', rows.length + '/' + RUNS + '회');
  console.log('   · 빨강(전투력 ≥2장) ' + s1.red.length + '/' + rows.length + '회'
    + ' · arm 최대공백 > CP_FX_MS(' + cpMs + ') 인 회차 ' + s1.gapOver.length
    + ' · 전 회차 최대공백 ' + p1(Math.max(...rows.map(r => r.gapMax))) + 'ms'
    + ' · 루프 평균 간격 ' + s1.ivAvg + 'ms');
  /* ★ 이 자의 첫 결론 — 「최대 공백」은 언제나 **첫 발 ↔ 첫 반복** 자리이고,
     그 값은 선언된 TR_HOLD_DELAY(350) 가 아니라 **타이머 지연이 얹힌 값**이다. */
  const gapAtAvg = p1(rows.reduce((a, r) => a + r.gapAt, 0) / Math.max(1, rows.length));
  ok(gapAtAvg < 100,
     '1b ★ 최대 공백은 예외 없이 **첫 발 ↔ 첫 반복** 자리다(홀드 시작 직후)',
     '그 자리의 평균 위치 홀드 +' + gapAtAvg + 'ms');
  const lagMin = p1(Math.min(...rows.map(r => r.gapMax)) - HOLD_DELAY);
  const lagMax = p1(Math.max(...rows.map(r => r.gapMax)) - HOLD_DELAY);
  ok(lagMax > 0,
     '1c ★★ 그 공백은 선언값 TR_HOLD_DELAY(' + HOLD_DELAY + 'ms)가 아니다 — **타이머 지연**이 얹힌다',
     '실측 공백 ' + p1(Math.min(...rows.map(r => r.gapMax))) + '~' + p1(Math.max(...rows.map(r => r.gapMax)))
     + 'ms = 지연 +' + lagMin + '~+' + lagMax + 'ms');
  ok(s1.over.length > 0,
     '1d ★★ 그래서 «넘침» 이 **구조적으로** 생긴다 — 공백이 묶음 창(' + cpMs + 'ms)을 넘는 회차가 있다',
     s1.over.length + '/' + rows.length + '회 · 최대 넘침 +' + p1(Math.max(0, ...rows.map(r => r.overMs))) + 'ms');
  ok(s1.before.length === 0,
     '1e ⓑ 기각 — 표본에 «홀드 시작 전» 토스트가 한 장도 안 섞였다(자의 표본 창은 죄가 없다)',
     '섞인 회차 ' + s1.before.length + '회');

  /* ── [2] 인과 — «677 이전 세계» 에서 같은 원인을 크게 걸면 2장이 난다 ──────────
     ⚠ 수리(677)가 이미 트리에 있으므로, 재현은 그 한 줄을 **무력화한 사본**에서 한다
     (`cpHolding` → 항상 false = 창을 시간만으로 닫던 종전 동작). 이것이 [D1] 이 본 세계다.
     제품 파일은 여전히 0줄 — `verify619` [R] 과 같은 in-page 무력화다. */
  console.log('\n[2] 인과 — «677 이전 세계»(`cpHolding` 무력화)에서 첫 반복 타이머에만 +' + STALL + 'ms 지연');
  console.log('   (자연 지연 +' + lagMin + '~+' + lagMax + 'ms 를 키운 것뿐이다 — 새 원인을 넣지 않았다)');
  await page.evaluate(() => { window.__cpHolding0 = window.cpHolding;
    if (typeof window.cpHolding === 'function') window.cpHolding = () => false; });
  const rowsB = [];
  for (let i = 0; i < STALL_RUNS; i++) {
    const r = await runHold(STALL);
    if (!r) { ok(false, '2x 훈련 카드가 없다'); break; }
    rowsB.push(r); console.log(line('S' + (i + 1), r));
  }
  await page.evaluate(() => { if (window.__cpHolding0) window.cpHolding = window.__cpHolding0; });
  const s2 = stat(rowsB);
  console.log('   · 빨강(전투력 ≥2장) ' + s2.red.length + '/' + rowsB.length + '회'
    + ' · 넘침 회차 ' + s2.over.length + ' · 그 틈에 틱이 떨어진 회차 ' + s2.hit.length
    + ' · 창이 홀드 도중에 닫힌 회차 ' + s2.mid.length);
  ok(s2.red.length > 0,
     '2a ★★★ 재현 — 전투력 토스트가 **2장** 나는 회차가 실제로 있다([D1] 이 본 그림)',
     s2.red.length + '/' + rowsB.length + '회 (' + s2.red.map((r, i) => r.cp + '장').join(' · ') + ')');
  ok(s2.mid.length > 0,
     '2b ★★★ 그 회차의 둘째 장은 **창이 홀드 도중에 닫혀서** 난 것이다(ⓐ 확정 · ⓑ 아님)',
     '홀드 중 닫힘 ' + s2.mid.length + '/' + rowsB.length + '회 · 닫힌 자리 '
     + (s2.mid[0] ? '+' + s2.mid[0].closeIn.join('/') + 'ms' : 'n/a'));
  ok(s2.hit.length >= s2.mid.length,
     '2c 그 닫힘은 예외 없이 «넘침» 구간 안에서 일어났다(우연한 다른 경로가 아니다)',
     '넘침에 틱 ' + s2.hit.length + '회 ≥ 홀드 중 닫힘 ' + s2.mid.length + '회');
  ok(s2.before.length === 0, '2d ⓑ 재기각 — 부하를 걸어도 «홀드 전» 토스트는 0 장',
     '섞인 회차 ' + s2.before.length + '회');
  ok(errs.length === 0, '2e 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  /* ── [3] 수리된 트리 — 같은 지연을 걸어도 2장이 안 난다 ────────────────────── */
  console.log('\n[3] 대조 — **현재 트리**(677 수리 포함)에 같은 지연을 건다');
  const rowsC = [];
  for (let i = 0; i < STALL_RUNS; i++) {
    const r = await runHold(STALL);
    if (!r) { ok(false, '3x 훈련 카드가 없다'); break; }
    rowsC.push(r); console.log(line('R' + (i + 1), r));
  }
  const s3 = stat(rowsC);
  ok(s3.gapOver.length === rowsC.length && rowsC.length > 0,
     '3a 전제 — 같은 넘침이 그대로 있다(수리가 «공백을 없앤» 것이 아니다)',
     '창 초과 ' + s3.gapOver.length + '/' + rowsC.length + '회 · 최대공백 '
     + p1(Math.max(0, ...rowsC.map(r => r.gapMax))) + 'ms');
  ok(s3.red.length === 0, '3b ★★★ 그런데 전투력 토스트는 **1장**이다(수리가 듣는다)',
     '빨강 ' + s3.red.length + '/' + rowsC.length + '회');
  ok(s3.mid.length === 0, '3c ★★★ 창이 홀드 도중에 **한 번도 안 닫힌다**',
     '홀드 중 닫힘 ' + s3.mid.length + '/' + rowsC.length + '회');

  console.log('\n[4] 결론');
  console.log('   ⓐ **제품**이다. 324 의 묶음 창은 «홀드가 멎은 뒤에만 닫힌다» 를 **시간(420ms)으로** 흉내 내는데,');
  console.log('   그 예산의 근거인 «첫 발↔첫 반복 = TR_HOLD_DELAY ' + HOLD_DELAY + 'ms» 는 **선언값**이고,');
  console.log('   실제로 굴러가는 값은 타이머 지연이 얹힌 ' + p1(Math.min(...rows.map(r => r.gapMax))) + '~'
    + p1(Math.max(...rows.map(r => r.gapMax))) + 'ms 다 — 여유 '
    + (cpMs - HOLD_DELAY) + 'ms 를 지연이 먹는다.');
  console.log('   ⇒ 창이 홀드 한복판에서 만료되고, 그 틈에 루프 틱이 떨어지면 토스트가 한 장 더 난다(간헐성의 정체).');
  console.log('   수리는 창을 «시간» 이 아니라 «홀드가 살아 있는가» 로 닫는 것 한 줄이다 — [3] 이 그 결과다.');

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
