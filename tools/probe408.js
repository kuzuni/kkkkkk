#!/usr/bin/env node
/* 재현기 — 작업 408 「`verify367` ★ [G4] «좌(뱃지)·우(레드닷) 인셋이 같다» 가 회차마다 흔들린다」
 *
 *   node tools/probe408.js
 *
 * 338·341·350 규칙: **처방 전에 재현한다.** 등재문의 «첫 갈래»(뿌리는 닷이 아니라 측정 시점)를
 * 시험하고, 등재문이 함께 적어 둔 **두 실측 주장도 같이 시험한다**(둘 중 하나는 틀렸다 — [2] 참조).
 *
 * ⚠ 등재문 «`.updot` 자체에는 애니메이션이 없다(transform:none)» 는 **틀렸다**.
 *   `transform:none` 은 `.updot` 규칙(10451)에 있지만, 60 쥬시가 `index.html` **11822~11826행**에서
 *     `.alert>.updot{animation:jzDotIn .3s var(--jzs) both, jzDotPulse 2s ease-in-out .3s infinite}`
 *   로 **`scale` 속성**을 건다 — `transform` 이 아니라 `scale` 이라 `transform:none` 에 안 걸린다.
 *     @keyframes jzDotIn{0%{scale:0}62%{scale:1.3}100%{scale:1}}   · 이징 --jzs = cubic-bezier(.34,1.56,.64,1) 오버슈트
 *     @keyframes jzDotPulse{0%,72%,100%{scale:1}84%{scale:1.14}}   · 2초 주기 **infinite**
 *   ⇒ 닷의 `getBoundingClientRect()` 는 **영원히 안 정착한다.** 게이트는 `waitForTimeout(250)` 한 자리에서
 *     재므로 그 순간의 위상이 곧 값이 된다.
 *
 * 이 자가 세우는 축 (전부 **수리 전 제품**에서 돈다 — `index.html` 은 한 줄도 안 건드린다):
 *   [1] 위상 스윕 — 한 번 여는 동안 우 인셋이 허용 오차(1.2)의 열 배가 넘는 폭을 훑는다.
 *   [2] 흔들림의 뿌리는 **둘**이다 — 등재문의 «좌는 늘 19 로 고정» 은 틀렸다:
 *       ⓐ 닷 자신의 `jzDotIn`+`jzDotPulse`(무한 · 우 인셋만) ⓑ 팝업 열림 연출이 **조상을 통째로 스케일**
 *       (좌·우 둘 다 · 0.3초쯤에 앉는다). ⓑ 는 좌·우에 **같은 배율**로 걸리므로 [G4] 의 «차» 에서는 상쇄된다 —
 *       그래서 처방은 ⓐ 하나만 끄면 되고, 그것이 [3] 이 못박는 것이다.
 *   [3] 정착 상태 — 닷의 애니메이션만 끄면 **여는 순간부터** 좌·우 차가 0 이다(조상 배율이 상쇄된다).
 *   [4] 게이트가 실제로 서는 자리(250ms)의 **민감도** — 그 앞뒤 몇 ms 만 밀려도 판정이 뒤집힌다.
 *       빨간 회차의 값 16.9 가 그 창 안에 실제로 있다 = 등재문의 43/44 는 지연 몇 ms 짜리 사고다.
 *   [5] 처방을 대면 같은 자리가 10/10 같은 값이다 — 허용 오차를 한 칸도 안 넓히고 흔들림이 사라진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;

/* 페이지 안에서 «지금 이 프레임» 의 좌·우 인셋을 한 번 뜬다.
   freeze=true 면 299·321·322·325·328·364 와 같은 처방으로 **닷의 애니메이션만** 잠깐 끄고 잰 뒤 되돌린다. */
const SNAP = `
window.__ins = function(freeze){
  var bt = document.getElementById('rouBtn'); if(!bt) return null;
  var ad = bt.querySelector(':scope>.ad'), dt = bt.querySelector(':scope>.updot');
  if(!ad || !dt) return null;
  var pa = dt.style.animation;
  if(freeze){ dt.style.animation = 'none'; void dt.offsetWidth; }
  var b = bt.getBoundingClientRect(), a = ad.getBoundingClientRect(), d = dt.getBoundingClientRect();
  if(freeze){ dt.style.animation = pa; }
  return { insL: a.left - b.left, insR: (b.left + b.width) - (d.left + d.width),
           dotW: d.width, btnW: b.width };
};`;

const stat = a => {
  const mn = Math.min(...a), mx = Math.max(...a);
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length);
  return { mn, mx, m, sd, span: mx - mn };
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.addScriptTag({ content: SNAP });

  /* 게이트 [G] 가 서는 것과 **같은 순서**로 연다 — [B] 가 5회를 다 써 닷이 꺼졌다가(spins 0)
     [G] 가 spins=1 로 되켜므로, 닷의 등장 애니메이션이 그 순간 **처음부터 다시 돈다**
     (`display:none ↔ block` 전환만으로 다시 도는 것이 11815행이 적어 둔 설계다). */
  const reopen = () => page.evaluate(async () => {
    closeModal && closeModal();
    S.daily.spins = 0; uiDirty = true; renderUI();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    S.daily.spins = 1; uiDirty = true; renderUI(); openRoulette();
  });

  /* ── [1]·[2] 위상 스윕 : 한 번 열고 0~2600ms 를 20ms 간격으로 훑는다 ────── */
  await reopen();
  const sweep = [];
  for (let t = 0; t < 130; t++) {
    const s = await page.evaluate(() => window.__ins(false));
    sweep.push(Object.assign({ t: t * 20 }, s));
    await page.waitForTimeout(20);
  }
  const R = stat(sweep.map(s => s.insR)), L = stat(sweep.map(s => s.insL));
  const D = stat(sweep.map(s => Math.abs(s.insL - s.insR)));
  const redN = sweep.filter(s => Math.abs(s.insL - s.insR) >= 1.2).length;
  console.log('\n── [1] 위상 스윕 (130 표본 · 20ms 간격 · 애니메이션 그대로) ──');
  console.log('  우 인셋(.updot) : ' + px(R.mn) + ' ~ ' + px(R.mx) + '  폭 ' + px(R.span) + '  σ ' + px(R.sd));
  console.log('  좌 인셋(.ad)    : ' + px(L.mn) + ' ~ ' + px(L.mx) + '  폭 ' + px(L.span) + '  σ ' + px(L.sd));
  console.log('  |좌−우| (=[G4]) : ' + px(D.mn) + ' ~ ' + px(D.mx) + '   허용 1.2 를 넘는 표본 ' + redN + '/130');
  console.log('  닷 폭 : ' + px(Math.min(...sweep.map(s => s.dotW))) + ' ~ ' + px(Math.max(...sweep.map(s => s.dotW))) + ' (CSS 27)');

  ok(D.mx > 1.2,
     '★ [1] 한 번 여는 동안 |좌−우| 가 허용 오차(1.2)를 넘는 구간이 있다 — 값이 «정착» 하지 않는다',
     '최대 ' + px(D.mx) + 'px · 넘는 표본 ' + redN + '/130');
  /* 등재문의 빨간 값 16.9 가 «같은 곡선 위의 점» 임은 스윕이 그 값을 **끼고 있는지**로 본다 —
     20ms 격자에 정확히 얹히기를 바라면 격자 운이 판정을 정한다(344 플레이키 교훈). */
  ok(R.mn < 16.9 && R.mx > 16.9,
     '★ [1-b] 등재문이 적은 빨간 값 **우 16.9** 를 그 스윕이 끼고 있다 — 16.9 도 19 도 같은 곡선 위의 점이다',
     '우 인셋 ' + px(R.mn) + ' ~ ' + px(R.mx) + ' 가 16.9 를 낀다');

  /* ⓐ·ⓑ 를 가른다 — 좌 인셋은 조상 배율만 타므로 팝업이 앉으면 19 로 굳고,
     우 인셋은 닷의 **무한** 펄스를 타므로 끝까지 안 굳는다. */
  const late = sweep.filter(s => s.t >= 1000);
  const lateL = stat(late.map(s => s.insL)), lateR = stat(late.map(s => s.insR));
  console.log('\n── [2] 흔들림의 뿌리를 둘로 가른다 (t ≥ 1000ms = 팝업이 앉은 뒤) ──');
  console.log('  좌 인셋 : ' + px(lateL.mn) + ' ~ ' + px(lateL.mx) + ' (폭 ' + px(lateL.span) + ')  ← 조상 배율만 탄다 = 앉는다');
  console.log('  우 인셋 : ' + px(lateR.mn) + ' ~ ' + px(lateR.mx) + ' (폭 ' + px(lateR.span) + ')  ← jzDotPulse 가 infinite = 안 앉는다');
  ok(lateL.span < 0.01 && Math.abs(lateL.m - 19) < 0.01,
     '★ [2-a] ⓑ 팝업 열림 연출은 **앉는다** — 1초 뒤 좌 인셋은 19 하나로 굳는다 (19 = CSS right:12 + 검정 테두리 7)',
     '폭 ' + px(lateL.span) + ' · 값 ' + px(lateL.m));
  ok(lateR.span > 1.2,
     '★ [2-b] ⓐ 닷의 `jzDotPulse` 는 **안 앉는다** — 1초 뒤에도 우 인셋이 허용 오차보다 넓게 계속 훑는다',
     '폭 ' + px(lateR.span));
  ok(L.span > 0.5,
     '★ [2-c] 등재문의 «좌 인셋은 늘 19 로 고정» 은 **틀렸다** — 팝업이 앉기 전에는 좌도 흔들린다 (조상 스케일)',
     '초반 포함 좌 인셋 폭 ' + px(L.span) + 'px');

  /* ── [3] 처방 : 닷의 애니메이션만 끄면 **여는 순간부터** 차가 0 이다 ────── */
  await reopen();
  const fz = [];
  for (let t = 0; t < 60; t++) {
    fz.push(await page.evaluate(() => window.__ins(true)));
    await page.waitForTimeout(20);
  }
  const FD = stat(fz.map(s => Math.abs(s.insL - s.insR)));
  const FR = stat(fz.map(s => s.insR)), FL = stat(fz.map(s => s.insL));
  console.log('\n── [3] 처방 (닷의 `style.animation="none"` 만 · 0~1200ms 60 표본) ──');
  console.log('  좌 : ' + px(FL.mn) + ' ~ ' + px(FL.mx) + '   우 : ' + px(FR.mn) + ' ~ ' + px(FR.mx) + '   |좌−우| 최대 ' + px(FD.mx));
  ok(FD.mx < 0.01,
     '★ [3] 닷의 애니메이션만 꺼도 **여는 순간부터** 좌·우 차가 0 이다 — 조상 배율(ⓑ)은 둘에 같이 걸려 «차» 에서 상쇄된다',
     '|좌−우| 최대 ' + px(FD.mx) + 'px');
  ok(FL.span > 0.5,
     '[3-b] 그 표본들이 «팝업이 앉기 전» 을 실제로 포함한다 — 좌 인셋 절대값은 여전히 훑는다 (헛초록이 아니다)',
     '좌 인셋 폭 ' + px(FL.span) + 'px');

  /* ── [4] 게이트가 서는 자리(250ms)의 민감도 ────────────────────────────── */
  console.log('\n── [4] 게이트 자리 민감도 (reopen → 대기 t ms → 측정) ──');
  const win = [];
  for (const t of [200, 210, 220, 225, 230, 235, 240, 245, 250, 260, 275, 300, 320]) {
    await reopen();
    await page.waitForTimeout(t);
    const s = await page.evaluate(() => window.__ins(false));
    win.push({ t, d: Math.abs(s.insL - s.insR), insR: s.insR });
  }
  console.log('  ' + win.map(w => w.t + 'ms→우' + px(w.insR)).join('  '));
  console.log('  ⚠ 이 줄 자체가 회차마다 다르다 — `reopen()` 이 끝난 시점과 애니메이션 시작이 매번 몇 ms 어긋난다.');
  console.log('    그래서 «어느 ms 가 빨갛다» 를 단언하지 않는다(그 단언이 곧 또 하나의 플레이키 게이트다 — 344 교훈).');
  console.log('    빨간 구간이 실재한다는 것은 위 [1] 스윕(' + redN + '/130 · 16.9 를 끼는 범위)이 이미 못박았다.');

  const at250 = [];
  for (let i = 0; i < 20; i++) { await reopen(); await page.waitForTimeout(250);
    at250.push((await page.evaluate(() => window.__ins(false))).insR); }
  const A = stat(at250);
  console.log('  250ms 20회 되풀이 : ' + px(A.mn) + ' ~ ' + px(A.mx) + ' (σ ' + px(A.sd) + ')');
  ok(A.span > 0.05, '[4-c] 같은 명령을 20번 되풀이해도 값이 매번 다르다', '폭 ' + px(A.span) + 'px');

  /* ── [5] 처방을 댄 같은 자리 ───────────────────────────────────────────── */
  const at250f = [];
  for (let i = 0; i < 10; i++) { await reopen(); await page.waitForTimeout(250);
    at250f.push(await page.evaluate(() => window.__ins(true))); }
  const AFd = stat(at250f.map(s => Math.abs(s.insL - s.insR))), AFr = stat(at250f.map(s => s.insR));
  console.log('\n── [5] 같은 자리를 처방대로 재면 (10회) ──');
  console.log('  |좌−우| : ' + px(AFd.mn) + ' ~ ' + px(AFd.mx) + '   우 인셋 절대값 : ' + px(AFr.mn) + ' ~ ' + px(AFr.mx));
  ok(AFd.mx < 0.01,
     '★ [5] 10/10 회차가 **|좌−우| = 0** 이다 — 허용 오차(1.2)를 한 칸도 안 넓히고 흔들림이 사라진다',
     '최대 ' + px(AFd.mx) + 'px');
  /* ⚠ 절대값 19 는 250ms 에서는 아직 안 나온다 — 팝업 조상 배율(ⓑ)이 안 앉았기 때문이다.
     [G4] 는 «차» 를 묻는 항이라 그것으로 충분하지만, [G1]·[G2] 처럼 **절대 px 을 찍는 항**까지
     뜻이 있으려면 게이트는 정착까지 기다려야 한다 — 그래서 처방은 «얼리기 + 정착 대기» 두 벌이다. */
  ok(AFr.span > 0.05 && Math.abs(AFr.m - 19) > 0.01,
     '[5-b] 다만 250ms 에서는 **절대값**이 아직 19 가 아니다 — 팝업 조상 배율(ⓑ)이 안 앉았다 ⇒ 정착 대기도 같이 필요하다',
     '우 인셋 ' + px(AFr.mn) + ' ~ ' + px(AFr.mx) + ' (19 아님)');

  ok(errs.length === 0, '[6] 콘솔·페이지 에러 0', errs.slice(0, 2).join(' | ') || '없음');

  await ctx.close();
  await browser.close();
  console.log('\nPROBE408 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
