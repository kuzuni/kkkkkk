#!/usr/bin/env node
/* 639 재현 — `tools/smoke.js` [2] 의 `cur:relic` 오프너가 «부하에서» 죽는 자리를 찍는다.
 *
 * 등재문(PROGRESS 639)은 세 갈래를 남겼다:
 *   ⓐ `page.$eval` 로 액션어빌리티 대기를 빼기 · ⓑ 이 오프너만 타임아웃 올리기
 *   ⓒ 89 유물 페이지 렌더 비용(1.4fps)을 별도 등재
 * 어느 쪽인지는 «어느 클릭이 · 왜» 죽는지를 봐야 갈린다. 이 자가 그것만 찍는다.
 *
 * 찍는 것 넷 —
 *   ① 두 클릭(`pre` 보물상자 탭 · `[data-cur=relic]`)을 **따로** 계측한다.
 *      smoke 는 둘을 한 try 로 묶어 «어느 쪽» 인지 로그에 안 남는다.
 *   ② 죽은 순간 그 셀렉터가 **DOM 에 붙어 있었는지 · 상자가 있었는지**를 페이지 안에서 직접 묻는다.
 *      «없어서» 죽은 것과 «있는데 액션어빌리티가 안 떨어져서» 죽은 것은 처방이 반대다.
 *   ③ 유물 페이지의 **fps**(rAF 간격)를 메인 화면 fps 와 나란히 잰다 — 등재문의 1.3~1.5 대 20~22 대조.
 *   ④ 처방 ⓐ(`waitForSelector(attached)` + 페이지 안 click)를 **같은 부하에서** 돌려 대조한다.
 *
 * 사용법: node tools/probe639.js [--n 8] [--load 0|3]
 *   --load N : 백그라운드 부하 N 개(같은 페이지를 N 장 더 띄워 CPU 를 뺏는다). 0 이면 무부하.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const N = +argOf('--n', 8);
const LOAD = +argOf('--load', 0);

const PRE = '.tab[data-t="box"]';
const SEL = '[data-cur="relic"]';

const out = [];
let pass = 0, fail = 0;
const ok = (n, m) => { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); };
const bad = (n, m) => { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); };

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  return { ctx, page };
}

/* 셀렉터의 «있음» 을 페이지 안에서 묻는다 — 붙어 있는가 · 상자가 있는가 · 몇 개인가 */
const probeSel = (page, sel) => page.evaluate((s) => {
  const els = [...document.querySelectorAll(s)];
  if (!els.length) return { n: 0 };
  const r = els[0].getBoundingClientRect();
  const cs = getComputedStyle(els[0]);
  return { n: els.length, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
           x: +r.x.toFixed(1), y: +r.y.toFixed(1),
           disp: cs.display, vis: cs.visibility, op: cs.opacity, pe: cs.pointerEvents };
}, sel).catch((e) => ({ err: String(e).slice(0, 80) }));

/* rAF 간격으로 fps 를 잰다(1.2초) */
const fps = (page) => page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const step = () => { n++; (performance.now() - t0 < 1200) ? requestAnimationFrame(step)
                                                            : res(+(n / ((performance.now() - t0) / 1000)).toFixed(2)); };
  requestAnimationFrame(step);
})).catch(() => -1);

/* smoke 가 실제로 쓰는 경로 그대로 */
async function runSmokeWay(page) {
  const r = { pre: null, sel: null, preMs: 0, selMs: 0, at: null };
  let t = Date.now();
  try { await page.click(PRE, { timeout: 3000, force: true }); r.pre = 'ok'; }
  catch (e) { r.pre = String(e.message || e).split('\n')[0].slice(0, 60); r.at = 'pre'; }
  r.preMs = Date.now() - t;
  if (r.at) { r.snap = await probeSel(page, PRE); return r; }
  await page.waitForTimeout(400);
  t = Date.now();
  try { await page.click(SEL, { timeout: 3000, force: true }); r.sel = 'ok'; }
  catch (e) { r.sel = String(e.message || e).split('\n')[0].slice(0, 60); r.at = 'sel'; }
  r.selMs = Date.now() - t;
  if (r.at) r.snap = await probeSel(page, SEL);
  return r;
}

/* 처방 ⓐ — «붙었는지» 만 기다리고 클릭은 페이지 안에서(액션어빌리티 대기 없음) */
async function runFixWay(page) {
  const r = { pre: null, sel: null, preMs: 0, selMs: 0, at: null };
  const clickIn = async (sel) => {
    await page.waitForSelector(sel, { state: 'attached', timeout: 3000 });
    const hit = await page.$eval(sel, (el) => { el.click(); return true; });
    if (!hit) throw new Error('$eval click returned false');
  };
  let t = Date.now();
  try { await clickIn(PRE); r.pre = 'ok'; }
  catch (e) { r.pre = String(e.message || e).split('\n')[0].slice(0, 60); r.at = 'pre'; }
  r.preMs = Date.now() - t;
  if (r.at) return r;
  await page.waitForTimeout(400);
  t = Date.now();
  try { await clickIn(SEL); r.sel = 'ok'; }
  catch (e) { r.sel = String(e.message || e).split('\n')[0].slice(0, 60); r.at = 'sel'; }
  r.selMs = Date.now() - t;
  return r;
}

/* 오프너가 «열렸는지» 는 33 재화 정보 팝업(`#ciw.on`)이 켜졌는지로 본다.
   ⚠ 이 확인이 없으면 «클릭은 던졌는데 아무것도 안 열린» 헛초록을 통과로 읽는다. */
const opened = (page) => page.evaluate(() => {
  const w = document.querySelector('#ciw');
  return !!(w && w.classList.contains('on'));
}).catch(() => false);

(async () => {
  const browser = await launch(chromium);

  /* ── 부하 ── 같은 index.html 을 LOAD 장 더 띄워 CPU 를 뺏는다(스윕과 같은 꼴) */
  const loaders = [];
  for (let i = 0; i < LOAD; i++) {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
    const p = await c.newPage();
    await p.goto(URL, { waitUntil: 'load' }).catch(() => {});
    loaders.push(c);
  }
  if (LOAD) await new Promise((r) => setTimeout(r, 1500));

  out.push(`§0 조건 — 반복 ${N}회 · 배경 부하 ${LOAD}장`);

  /* ── ③ fps 대조: 메인 화면 vs 89 유물 페이지 ── */
  {
    const { ctx, page } = await fresh(browser);
    const fMain = await fps(page);
    await page.click(PRE, { timeout: 8000, force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const fRelic = await fps(page);
    const relicOn = await page.evaluate(() => !!document.querySelector('#relw')).catch(() => false);
    out.push('§3 렌더 비용 (rAF fps)');
    out.push(`  · 메인 화면 fps          — ${fMain}`);
    out.push(`  · 89 유물 페이지 fps     — ${fRelic}  (#relw ${relicOn ? '있음' : '없음'})`);
    (fRelic > 0 && fMain > 0)
      ? ok('fps 를 두 화면에서 다 쟀다', `${fMain} → ${fRelic} (배수 ${(fRelic / fMain).toFixed(2)})`)
      : bad('fps 측정 실패', `${fMain} / ${fRelic}`);
    await ctx.close();
  }

  /* ── ①② smoke 경로 N 회 ── */
  const smokeR = [];
  for (let i = 0; i < N; i++) {
    const { ctx, page } = await fresh(browser);
    const r = await runSmokeWay(page);
    r.opened = await opened(page);
    smokeR.push(r);
    await ctx.close();
  }
  const sFail = smokeR.filter((r) => r.at);
  out.push('§1 smoke 경로(`page.click` timeout 3000 · force)');
  smokeR.forEach((r, i) => out.push(
    `  ${r.at ? '✗' : '✓'} #${i + 1} pre ${r.preMs}ms ${r.pre} · sel ${r.selMs}ms ${r.sel || '-'}` +
    (r.at ? `  ← 죽은 자리 ${r.at} · 그 순간 ${JSON.stringify(r.snap)}` : ` · 팝업 ${r.opened}`)));
  out.push(`  ⇒ 실패 ${sFail.length}/${N}` +
    (sFail.length ? ` · 자리 ${[...new Set(sFail.map((r) => r.at))].join(',')}` : ''));

  /* ── ④ 처방 ⓐ 를 같은 부하에서 ── */
  const fixR = [];
  for (let i = 0; i < N; i++) {
    const { ctx, page } = await fresh(browser);
    const r = await runFixWay(page);
    r.opened = await opened(page);
    fixR.push(r);
    await ctx.close();
  }
  const fFail = fixR.filter((r) => r.at);
  out.push('§4 처방 ⓐ(`waitForSelector(attached)` + 페이지 안 click)');
  fixR.forEach((r, i) => out.push(
    `  ${r.at ? '✗' : '✓'} #${i + 1} pre ${r.preMs}ms ${r.pre} · sel ${r.selMs}ms ${r.sel || '-'}` +
    (r.at ? `  ← 죽은 자리 ${r.at}` : ` · 팝업 ${r.opened}`)));
  out.push(`  ⇒ 실패 ${fFail.length}/${N}`);

  /* ── 판정 ── */
  out.push('§5 판정');
  (fFail.length <= sFail.length)
    ? ok('처방 ⓐ 가 smoke 경로보다 나쁘지 않다', `smoke ${sFail.length}/${N} · 처방 ${fFail.length}/${N}`)
    : bad('처방 ⓐ 가 더 나쁘다', `smoke ${sFail.length}/${N} · 처방 ${fFail.length}/${N}`);
  const fixOpened = fixR.filter((r) => !r.at && r.opened).length;
  (fixOpened === N - fFail.length)
    ? ok('처방 ⓐ 는 «클릭만 삼키고 안 열리는» 헛초록이 아니다', `열림 ${fixOpened}/${N - fFail.length}`)
    : bad('처방 ⓐ 가 클릭을 삼켰다', `열림 ${fixOpened}/${N - fFail.length}`);

  /* ── §R 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다 ──
     처방 ⓐ 는 히트테스트를 안 거치므로 «클릭이 삼켜져도 초록» 이 될 수 있다.
     smoke 가 그것을 잡으라고 `want`(#ciw.on) 를 새로 세웠으니, 그 자에 **이빨이 있는지**를 여기서 판다. */
  out.push('§R 되돌림 시험 (want 항에 이빨이 있는가)');
  {
    const { ctx, page } = await fresh(browser);
    /* R1 — 핸들러가 없는 «가짜 오프너» 를 클릭한다. 클릭 자체는 성공하지만 팝업은 안 열린다. */
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'fake639'; d.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px';
      document.body.appendChild(d);
    });
    let threw = null;
    try {
      await page.waitForSelector('#fake639', { state: 'attached', timeout: 3000 });
      await page.$eval('#fake639', (el) => el.click());
      await page.waitForTimeout(500);
      await page.waitForSelector('#ciw.on', { timeout: 1500 })
        .catch(() => { throw new Error('클릭은 갔는데 #ciw.on 가 안 열렸다'); });
    } catch (e) { threw = String(e.message || e).slice(0, 60); }
    threw ? ok('R1 삼켜진 클릭은 want 항이 잡는다', threw)
          : bad('R1 삼켜진 클릭이 통과했다 — want 항에 이빨이 없다');

    /* R2 — 오프너가 통째로 사라지면 여전히 빨개야 한다(«붙었는지» 대기를 뺀 게 아님). */
    await page.evaluate(() => document.querySelectorAll('[data-cur="gold"]').forEach((e) => e.remove()));
    let threw2 = null;
    try { await page.waitForSelector('[data-cur="gold"]', { state: 'attached', timeout: 1500 }); }
    catch (e) { threw2 = String(e.message || e).split('\n')[0].slice(0, 50); }
    threw2 ? ok('R2 오프너가 사라지면 그대로 빨갛다', threw2)
           : bad('R2 오프너를 지웠는데도 통과했다');
    await ctx.close();
  }

  for (const c of loaders) await c.close().catch(() => {});
  await browser.close();

  console.log(out.join('\n'));
  console.log(`\nPROBE639 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
