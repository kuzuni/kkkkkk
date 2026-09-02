#!/usr/bin/env node
/* 작업 825 재현기 — 「`verify818` [C2b] 「단련 평균 알 ≥8」 이 **제품이 아니라 러너 속도**를 잰다」
 *
 *   node tools/probe825.js              (기본 3회씩 · 약 100초)
 *   P825_RUNS=5 P825_CPU=8 node tools/probe825.js
 *
 * ⚠ 338 규칙 — 처방 전에 재현. **등재문의 가설(«화소 주사가 rAF 를 밀어 평균이 내려간다»)은
 *   1차 재현에서 기각됐다**: 같은 홀드를 heavy(주사 1회)·heavy4(주사 4회)·light(주사 0)·
 *   inpage(왕복 0) 넷으로 재니 10.4~10.9알로 **전부 겹쳤다**(주사를 4배로 해도 −4.9%).
 *   표본기는 이 축을 못 움직인다. 남는 후보는 **러너 자신의 속도**이고, 이 자는 그것을 CPU
 *   스로틀로 **이 러너에서 만들어** 잰다.
 *
 * ⚑ 절차는 LESSONS 239-① 그대로다 — ⓐ 제품 0줄로 «잡음대» → ⓑ 알려진 회귀로 «회귀대» →
 *   ⓒ **두 대역이 안 겹치는 양**만 판정에 쓴다.
 *
 * ⚑ 이 자가 갈라 재는 것은 [C2b] 의 값이 **두 인자의 곱**이라는 것이다:
 *       동시 생존 평균  ≈  (발화 한 번이 낳는 알 수)  ×  (알 수명 ÷ 발화 간격)
 *   앞 둘은 제품의 결정(`UPFX_N` 4 · `FXSPARK_MS` 380)이고 **발화 간격만 러너가 정한다**
 *   (홀드 틱은 setTimeout 사슬이라 느린 러너에서 늘어난다). 곱에 문턱을 걸면 그 문턱은
 *   제품이 아니라 러너 속도를 채점한다 — 등재문이 본 «7.4 ↔ 8.5» 가 그 얼굴이다.
 *
 * 회귀 둘(제품 파일 **0줄** · `upFx` 를 감싸서 만든다):
 *   ⓐ 밀도 회귀 — 틱당 스폰을 1 로 묶는다(660 의 «터진다» 가 죽는 얼굴)
 *   ⓑ 수명 회귀 — 새 알을 120ms 에 걷는다(619 14회차 `fxTickLife` 시절 = 660 보강2 가 뒤집은 그 축)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.P825_HOLD || 2600);
const RUNS    = Number(process.env.P825_RUNS || 3);
const CPU     = Number(process.env.P825_CPU || 6);   /* «느린 러너» 배율 */
const THR     = 8;                                   /* 818 [C2b] 의 문턱 — 이 자는 그 값을 **안 바꾼다** */
const UPFX_N  = 4, FXSPARK_MS = 380;                 /* 제품 상수(index.html) — 새 축의 기대값 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;
const lo = a => Math.min(...a), hi = a => Math.max(...a);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const band = a => p1(lo(a)) + '~' + p1(hi(a)) + ' (평균 ' + p1(avg(a)) + ')';

/* 자릿수 최악은 `verify818` 과 **같은 자리**(두 자의 수치가 같은 눈금 위에 있어야 비교가 된다) */
const HOST = '#trw .tr-tp.k0 .tb', SUB = 'temper';
const FAR  = "S.tstone = 1e12; const o = temperObj(); o.alloc = o.alloc || {}; o.alloc.atk = 100000; renderTemper();";

/* ── 페이지 안 표본기 — 왕복 0회. `#fxl` 변이를 보고 «발화·스폰·수명» 을 직접 센다 ──
   ⚠ 338 — 함수를 불렀는가가 아니라 **화면에 실제로 놓인 알**을 센다(노드가 근거다). */
const OBS_START = () => {
  const L = document.getElementById('fxl');
  const st = { bursts: 0, spawned: 0, lives: [], alive: [], born: new Map() };
  window.__p825 = st;
  const isEgg = nd => nd.nodeType === 1 && /fx-spark/.test(nd.className + '');
  st.mo = new MutationObserver(recs => {
    /* 한 번의 콜백 = 한 번의 발화(`fxBurst` 가 cnt 알을 동기로 붙인다) */
    let add = 0;
    const now = performance.now();
    for (const r of recs) {
      for (const nd of r.addedNodes) if (isEgg(nd)) { add++; st.born.set(nd, now); }
      for (const nd of r.removedNodes) if (isEgg(nd)) {
        const t0 = st.born.get(nd);
        if (t0 != null) { st.lives.push(now - t0); st.born.delete(nd); }
      }
    }
    if (add) { st.bursts++; st.spawned += add; }
  });
  st.mo.observe(L, { childList: true });
  const tick = () => {
    if (!window.__p825) return;
    st.alive.push([...L.children].filter(isEgg).length);
    st.raf = requestAnimationFrame(tick);
  };
  st.raf = requestAnimationFrame(tick);
};
const OBS_STOP = () => {
  const st = window.__p825; window.__p825 = null;
  if (!st) return null;
  try { cancelAnimationFrame(st.raf); } catch (_) {}
  try { st.mo.disconnect(); } catch (_) {}
  const live = st.alive.filter(n => n > 0);
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  return {
    bursts: st.bursts, spawned: st.spawned,
    per: st.bursts ? st.spawned / st.bursts : 0,          /* 발화당 스폰 알 — 제품의 결정 */
    life: mean(st.lives),                                  /* 알 수명(ms) — 제품의 결정 */
    lifeN: st.lives.length,
    eggs: mean(live),                                      /* [C2b] 의 그 값 = 두 인자의 곱 ÷ 간격 */
    peak: live.length ? Math.max(...live) : 0,
    frames: live.length
  };
};

async function settle(page) {
  await page.evaluate(s => { setTrSub(s); }, SUB);
  await page.waitForTimeout(260);
  await page.waitForFunction(() => {
    const L = document.getElementById('fxl');
    return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(140);
}

async function hold(page) {
  await settle(page);
  const g = await page.evaluate(h => {
    const el = document.querySelector(h); if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, HOST);
  if (!g) return null;
  await page.evaluate(OBS_START);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const t0 = Date.now();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  const wall = Date.now() - t0;
  await page.waitForTimeout(120);
  const r = await page.evaluate(OBS_STOP);
  if (!r) return null;
  r.iv = r.bursts ? wall / r.bursts : 0;                   /* 발화 간격(ms) — **러너가 정한다** */
  return r;
}

/* 회귀 주입 — 제품 파일 0줄. `upFx` 한 겹만 감싼다 */
const REG_ON = (mode) => {
  const L = document.getElementById('fxl');
  if (!window.__upFx0) window.__upFx0 = window.upFx;
  window.upFx = function (k, h, c, n, nf, iv) {
    if (mode === 'cnt') return window.__upFx0(k, h, c, 1, nf, iv);
    const before = new Set(L.children);
    const r = window.__upFx0(k, h, c, n, nf, iv);
    const born = [...L.children].filter(nd => !before.has(nd) && /fx-spark/.test(nd.className + ''));
    setTimeout(() => { for (const nd of born) { try { nd.remove(); } catch (_) {} } }, 120);
    return r;
  };
  return true;
};
const REG_OFF = () => { if (window.__upFx0) { window.upFx = window.__upFx0; window.__upFx0 = null; } return true; };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; openTrain(); });
  await page.evaluate(src => { new Function(src)(); }, FAR);
  await page.waitForTimeout(300);

  const dig = await page.evaluate(a => { setTrSub(a.sub); const h = document.querySelector(a.host); return h ? (h.textContent || '').trim() : '없음'; }, { host: HOST, sub: SUB });
  console.log('작업 825 재현 — 단련 [단련] 버튼 · 자릿수 최악 «' + dig + '» · 홀드 ' + HOLD_MS + 'ms × ' + RUNS + '회/팔\n');

  const cpu = async r => cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
  const run = async n => { const a = []; for (let i = 0; i < n; i++) a.push(await hold(page)); return a; };
  const show = (t, a) => console.log('       · ' + t
      + ' | 동시평균 ' + band(a.map(r => r.eggs)) + ' · 봉우리 ' + band(a.map(r => r.peak))
      + ' | 발화당 ' + band(a.map(r => r.per)) + '알'
      + ' | 수명 ' + band(a.map(r => r.life)) + 'ms'
      + ' | 발화간격 ' + band(a.map(r => r.iv)) + 'ms');

  /* ── [A] 잡음대 — 제품 0줄, 러너 속도만 바꾼다 ────────────────────── */
  console.log('[A] 잡음대 — **제품 코드 0줄 변경** · 바뀐 것은 러너 속도뿐(CPU 스로틀)');
  const fast = await run(RUNS);
  await cpu(CPU);
  const slow = await run(RUNS);
  await cpu(1);
  show('빠름 ×1  ', fast);
  show('느림 ×' + CPU + '  ', slow);
  const E = a => a.map(r => r.eggs), P = a => a.map(r => r.per), Lf = a => a.map(r => r.life);

  ok(lo(E(fast)) >= THR, 'A1 이 러너에서 지금의 [C2b] 는 초록이다(잡음대 하단이 문턱 위)', band(E(fast)) + ' ≥ ' + THR);
  ok(hi(E(slow)) < THR,
     'A2 ★ **제품 0줄인데 느린 러너에서 [C2b] 가 빨개진다** — 등재문의 «7.4 ↔ 8.5» 를 이 러너에서 재현했다',
     'CPU ×' + CPU + ' 최대 ' + p1(hi(E(slow))) + '알 < ' + THR);
  ok(hi(a2iv(slow)) > hi(a2iv(fast)) * 1.5,
     'A3 그 빨강의 출처는 **발화 간격**이다 — 느린 러너에서 홀드 틱 사슬이 늘어진다',
     p1(avg(a2iv(fast))) + 'ms → ' + p1(avg(a2iv(slow))) + 'ms');
  ok(lo(P(slow)) >= UPFX_N * 0.9 && lo(P(fast)) >= UPFX_N * 0.9,
     'A4 ★ **발화당 스폰 알 수는 러너 속도에 안 흔들린다** — 빠름·느림이 같은 값(제품의 결정)',
     '빠름 ' + band(P(fast)) + ' · 느림 ' + band(P(slow)));
  ok(lo(Lf(slow)) >= FXSPARK_MS * 0.85 && lo(Lf(fast)) >= FXSPARK_MS * 0.85,
     'A5 ★ **알 수명도 안 흔들린다** — 빠름·느림 둘 다 `FXSPARK_MS` 380ms 근방',
     '빠름 ' + band(Lf(fast)) + 'ms · 느림 ' + band(Lf(slow)) + 'ms');

  /* ── [B] 회귀대 — 두 회귀를 각각 주입한다 ────────────────────────── */
  console.log('\n[B] 회귀대 — 660 이 지키는 두 인자를 각각 죽여 본다(제품 파일 0줄)');
  await page.evaluate(REG_ON, 'cnt');
  const rgC = await run(RUNS);
  await page.evaluate(REG_OFF);
  await page.evaluate(REG_ON, 'life');
  const rgL = await run(RUNS);
  await page.evaluate(REG_OFF);
  show('밀도회귀 ', rgC);
  show('수명회귀 ', rgL);

  ok(hi(P(rgC)) < UPFX_N * 0.9,
     'B1 밀도 회귀는 **발화당 스폰** 축이 잡는다', band(P(rgC)) + '알 < ' + p1(UPFX_N * 0.9));
  ok(hi(Lf(rgL)) < FXSPARK_MS * 0.85,
     'B2 수명 회귀는 **수명** 축이 잡는다', band(Lf(rgL)) + 'ms < ' + p1(FXSPARK_MS * 0.85));
  ok(hi(E(rgC)) < THR && hi(E(rgL)) < THR,
     'B3 두 회귀는 지금의 [C2b] 로도 잡힌다 — 축을 옮겨도 **잃는 회귀가 없다**',
     '밀도 ' + band(E(rgC)) + ' · 수명 ' + band(E(rgL)));

  /* ── [C] 안 겹치는 양 고르기 ──────────────────────────────────────── */
  console.log('\n[C] 두 대역이 겹치는가 — 판정에 쓸 수 있는 양은 무엇인가');
  const noReg = E(fast).concat(E(slow)), regAll = E(rgC).concat(E(rgL));
  ok(lo(noReg) < THR && hi(noReg) >= THR,
     'C1 ★ 지금의 축(동시 평균)은 **문턱이 잡음대 «안» 에 있다** — 같은 트리가 실행마다 양쪽에 떨어진다(LESSONS 239-①)',
     '무회귀 ' + p1(lo(noReg)) + '~' + p1(hi(noReg)) + ' 이 문턱 ' + THR + ' 을 물고 있다 ↔ 회귀 ' + p1(lo(regAll)) + '~' + p1(hi(regAll))
     + ' · 무회귀↔회귀 여유 ' + p1(lo(noReg) - hi(regAll)) + '알');
  const pkNo = fast.concat(slow).map(r => r.peak);
  ok(lo(pkNo) < THR || (lo(pkNo) - THR) < 2,
     'C1b ★ **[C2](봉우리 ≥8)도 같은 병을 앓는다** — 느린 러너에서 여유가 2알 미만으로 붙는다',
     '무회귀 봉우리 ' + p1(lo(pkNo)) + '~' + p1(hi(pkNo)) + ' · 문턱 ' + THR + ' 과의 여유 ' + p1(lo(pkNo) - THR) + '알');
  const npNo = P(fast).concat(P(slow)), npRg = P(rgC);
  ok(lo(npNo) > hi(npRg),
     'C2 ★ **발화당 스폰**은 안 겹친다 — 무회귀 최소 > 회귀 최대',
     p1(lo(npNo)) + ' > ' + p1(hi(npRg)) + ' · 여유 ' + p1(lo(npNo) - hi(npRg)) + '알');
  const nlNo = Lf(fast).concat(Lf(slow)), nlRg = Lf(rgL);
  ok(lo(nlNo) > hi(nlRg),
     'C3 ★ **수명**도 안 겹친다 — 무회귀 최소 > 회귀 최대',
     p1(lo(nlNo)) + ' > ' + p1(hi(nlRg)) + 'ms · 여유 ' + p1(lo(nlNo) - hi(nlRg)) + 'ms');
  /* 곱을 «제품의 최속 틱» 에서 평가하면 660 의 «동시 ≥8» 과 산술적으로 동치다(러너 간격을 안 쓴다) */
  const eq = a => a.map(r => r.per * r.life / 160);   /* 홀드 초반 틱 160ms = 가장 성긴 제품 틱 */
  ok(lo(eq(fast).concat(eq(slow))) >= THR,
     'C4 ★ 두 인자만으로 660 의 «동시 ≥8알» 이 **산술로 성립한다** — 러너 간격을 안 쓴다',
     '발화당 × 수명 ÷ 160ms(제품의 가장 성긴 틱) = ' + band(eq(fast).concat(eq(slow))) + '알');
  ok(hi(eq(rgC).concat(eq(rgL))) < THR,
     'C5 그 산수는 회귀에서 무너진다 — 무뎌진 자가 아니다',
     '밀도 ' + band(eq(rgC)) + ' · 수명 ' + band(eq(rgL)));

  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');
  await browser.close();
  console.log('\nPROBE825 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();

function a2iv(a) { return a.map(r => r.iv); }
