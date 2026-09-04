#!/usr/bin/env node
/* 899 재현 — `verify619` [M3] 의 «빨강인데 문구는 초록» 을 갈래까지 갈라 찍는다 (338 규칙)
 *
 *   node tools/probe899.js
 *
 * 등재문(PROGRESS 899)이 말하는 것: 훈련 «빈 프레임 0/17» · 룬 «0/15» · 단련 «0/16» 인데
 * **항이 FAIL 로 센다**. 갈래가 둘이고 처방이 정반대다 —
 *   ⓐ **자**: 통과 조건이 `G.n > 20 && G.blank === 0` 이라 «축(blank)» 과 «표본(n)» 을 한 항에 묶었고,
 *             n 은 «고정 1100ms 안에 이 기계가 준 rAF 프레임 수» = **러너 속도**다(785·869 계열).
 *   ⓑ **제품**: 실제로 연출이 끊겨 blank 가 늘었다 — 이때는 고칠 곳이 자가 아니라 index.html 이다.
 *
 * ⚑ **재현을 러너의 기분에 맡기지 않는다**(785 처방) — 그냥 돌리면 «오늘은 빨라서 초록» 이 나와
 *   결론이 안 선다 ⇒ CDP `Emulation.setCPUThrottlingRate` 로 **느린 기계를 만들어** A/B 를 가른다.
 *
 * 절:
 *   [0] 눈금  — 이 러너의 무부하 프레임률 · 옛 문턱 20 이 요구하는 최소 프레임률(18.2/초)과 대조
 *   [1] 재현  — 느린 기계에서 **옛 자**(고정 1100ms · `n > 20`)가 빨개진다 ⇒ ⓐ
 *   [2] 갈래  — 그 사본에서도 **blank 는 0** 이다 ⇒ ⓑ 기각(제품은 안 끊겼다) · «문구는 초록, 판정은 빨강»
 *   [3] 수리  — 같은 느린 기계에서 **표본 구동 홀드**(`frameHold`)는 같은 20프레임을 실제로 얻는다
 *   [4] 되돌림 — 발화(`upFx`)·홀드 링(`fxHoldMark`)을 죽인 사본에서는 새 축이 **빨개진다**(무른 수리 아님)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { frameHold } = require('./frameburst');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SEL = { train: '#trCards [data-tr]', rune: '#trRunes .rbt.b1', temper: '#trTemper .tr-tp.k0 .tb' };
const OLD_MS = 1100, OLD_MIN_N = 21;   /* 옛 항의 통과 조건 — `G.n > 20` */
const NEED = 20;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 옛 자 그대로 — 고정 창(need 0 · minMs = capMs) */
const oldRun = (page, sel) => frameHold(page, { sel, need: 0, minMs: OLD_MS, capMs: OLD_MS });
/* 새 자 — 표본이 찰 때까지 누른다(시간은 바닥·상한으로만) */
const newRun = (page, sel) => frameHold(page, { sel, need: NEED, minMs: OLD_MS, capMs: 30000 });

const goTab = async (page, k) => {
  await page.evaluate(t => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(t); renderTrain(); }, k);
  await page.waitForTimeout(420);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);
  const cdp = await page.context().newCDPSession(page);
  const throttle = async r => cdp.send('Emulation.setCPUThrottlingRate', { rate: r }).catch(() => {});

  /* ── [0] 눈금 ─────────────────────────────────────────────────────── */
  console.log('\n[0] 눈금 — 무부하 프레임률 ↔ 옛 문턱 20 이 요구하는 최소치');
  await goTab(page, 'train');
  const A0 = await oldRun(page, SEL.train);
  ok(!!A0, '0-a 표본이 있다 — 훈련 홀드가 실제로 프레임을 남겼다', A0 ? A0.note : '—');
  if (A0) {
    ok(true, '0-b 옛 항의 통과 조건은 «1100ms 안에 ' + OLD_MIN_N + '프레임» = ' + (OLD_MIN_N / (OLD_MS / 1000)).toFixed(1) + '프레임/초 이상이다',
       '무부하 실측 ' + A0.fps + '프레임/초 · ' + A0.n + '프레임');
    ok(A0.blank === 0, '0-c 무부하에서 축(빈 프레임)은 0 이다', '빈 프레임 ' + A0.blank + '/' + A0.n);
  }
  await page.waitForTimeout(300);

  /* ── [1][2] 재현 ──────────────────────────────────────────────────── */
  console.log('\n[1] 재현 — 느린 기계에서 옛 자(고정 ' + OLD_MS + 'ms · n > 20)가 빨개진다');
  let hitRate = 0, R = null;
  for (const rate of [4, 8, 20, 50]) {
    await throttle(rate);
    await goTab(page, 'train');
    const r = await oldRun(page, SEL.train);
    console.log('      · ×' + rate + ' → ' + (r ? r.note : '—'));
    if (r && r.n < OLD_MIN_N) { hitRate = rate; R = r; break; }
  }
  ok(!!R, '1-a ★ 옛 자가 빨개지는 부하가 있다(그 항은 «연출» 이 아니라 «러너 속도» 를 재고 있다)',
     R ? '스로틀 ×' + hitRate + ' · 프레임 ' + R.n + ' < 문턱 ' + OLD_MIN_N + ' · ' + R.fps + '프레임/초' : '×50 까지도 20프레임을 넘겼다');
  console.log('\n[2] 갈래 — 그 사본에서도 축(blank)은 0 인가 (ⓑ «제품이 끊겼다» 기각)');
  ok(!!R && R.blank === 0, '2-a ★ 같은 홀드에서 빈 프레임은 0 이다 ⇒ 빨강의 임자는 **표본**이지 축이 아니다',
     R ? '빈 프레임 ' + R.blank + '/' + R.n : '—');
  ok(!!R && R.blank === 0 && R.n < OLD_MIN_N,
     '2-b ★ 그래서 옛 항의 실패 문구가 «빈 프레임 0/' + (R ? R.n : '?') + '» — **빨강이 초록으로 읽힌다**',
     R ? '판정 FAIL · 문구 «빈 프레임 0/' + R.n + '»' : '—');

  /* ── [3] 수리 ─────────────────────────────────────────────────────── */
  console.log('\n[3] 수리 — 같은 부하에서 표본 구동 홀드는 같은 ' + NEED + '프레임을 얻는다');
  const cure = {};
  for (const k of ['train', 'rune', 'temper']) {
    await goTab(page, k);
    const g = await newRun(page, SEL[k]);
    cure[k] = g;
    ok(!!g && g.n >= NEED && !g.stalled, '3-' + k + ' 표본이 찼다(정체 아님)', g ? g.note : '—');
    ok(!!g && g.blank === 0, '3-' + k + '-b 축은 여전히 초록 — 빈 프레임 0', g ? '빈 프레임 ' + g.blank + '/' + g.n : '—');
  }
  await throttle(1);

  /* ── [4] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[4] 되돌림 — 발화·홀드 링을 죽인 사본에서는 새 축이 빨개진다');
  await page.evaluate(() => {
    const el = document.querySelector('#trCards [data-tr]'); const k = el && el.dataset.tr;
    if (k && S.lv) S.lv[k] = 0;
    S.gold = 1e18; if (typeof renderTrain === 'function') renderTrain();
    window.__p899upFx = window.upFx; window.upFx = () => false;
    window.__p899mark = window.fxHoldMark; window.fxHoldMark = () => {};
    document.querySelectorAll('.fx-holding').forEach(n => n.classList.remove('fx-holding'));
  });
  await goTab(page, 'train');
  const D = await newRun(page, SEL.train);
  ok(!!D && D.blank > 0, '4-a ★ 사본은 빈 프레임이 생긴다 — 축이 아직 짖는다(문턱을 무르게 안 풀었다)',
     D ? D.note + (D.kinds ? ' · 남은 것 ' + D.kinds : '') : '—');
  await page.evaluate(() => {
    if (window.__p899upFx) window.upFx = window.__p899upFx;
    if (window.__p899mark) window.fxHoldMark = window.__p899mark;
    const el = document.querySelector('#trCards [data-tr]'); const k = el && el.dataset.tr;
    if (k && S.lv) S.lv[k] = 0;
    S.gold = 1e18; if (typeof renderTrain === 'function') renderTrain();
  });
  await goTab(page, 'train');
  const E = await newRun(page, SEL.train);
  ok(!!E && E.blank === 0 && E.n >= NEED, '4-b 원복하면 같은 자로 다시 초록', E ? E.note : '—');

  ok(errs.length === 0, '9-a 콘솔/페이지 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
