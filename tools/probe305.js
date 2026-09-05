#!/usr/bin/env node
/* 305 프로브 — verify95 [E] 관성(fling) 이 «4회 중 1회» FAIL 하던 자리를 재현·회귀 감시한다.
 *
 *   node tools/probe305.js [반복수=10]        수정본(CDP 연달아 쏘기) — 실패 0 이어야 한다
 *   node tools/probe305.js [반복수] --old     수정 전 제스처(playwright page.mouse) 재현 — 흔들린다
 *
 * verify95 [E] 와 똑같은 제스처(6 × 60px, 사이 8ms 대기 → up)를 N 회 돌리면서
 * 게이트 눈으로는 안 보이는 값 4개를 같이 찍는다:
 *   gap  = pointerup 시각 − 마지막 pointermove 시각 (index.html 의 `< 90` 창)
 *   v    = 마지막 move 에서 잡힌 속도(프레임px/ms) — DS_VMIN 0.02 미만이면 fling 없음
 *   fling= dsFling 이 실제로 불렸는가
 *   t0→t1= 게이트가 재는 값(뗀 직후 · 450ms 뒤)
 *
 * 이 넷을 같이 보면 «제품 결함 / 계측 결함» 이 한 번에 갈린다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '10', 10);
/* --old = 305 수정 전 제스처. 호출마다 왕복을 기다리는 page.mouse 라 «마지막 move → up» 이
   84~134ms 로 벌어지고, 제품의 관성 창(90ms)을 걸쳐 흔들린다. 재현용으로만 남긴다. */
const OLD = process.argv.includes('--old');

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const rows = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1, hasTouch: false });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await page.waitForTimeout(1000);
    await page.evaluate(() => { S.gold = 1e15; S.dia = 1e9; S.relic = 1e6; uiDirty = true; renderUI(); });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      openPass(); uiDirty = true; try { renderUI(); } catch (_) {}
      window.__box = () => [...document.querySelectorAll('.ps-list')]
        .filter((e) => { const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4; })
        .find((e) => e.scrollHeight - e.clientHeight > 1) || null;
      window.__top = () => { const b = window.__box(); return b ? b.scrollTop : -1; };
      /* dsFling 을 감싸 «불렸는가 · 그때 v 는 얼마였는가» 를 기록한다 */
      window.__fl = null;
      const orig = window.dsFling;
      window.dsFling = function (r) { window.__fl = { v: r.v, acc: r.acc }; return orig.apply(this, arguments); };
      /* pointerup 시점의 «마지막 pointermove 이후 경과» 를 index.html 과 같은 시계(performance.now)로
         잰다. dsRec 은 모듈 지역 `let` 이라 밖에서 못 읽으므로, 같은 이벤트를 우리도 받아 직접 센다.
         (index.html 의 리스너가 먼저 등록돼 있어 우리 핸들러는 그 뒤에 돈다 — 같은 틱이다) */
      window.__lm = 0; window.__gap = null; window.__nmv = 0;
      addEventListener('pointermove', () => { window.__lm = performance.now(); window.__nmv++; }, true);
      addEventListener('pointerup', () => {
        window.__gap = window.__lm ? performance.now() - window.__lm : 'move 0건';
        window.__drag = document.body.classList.contains('ds-drag');
      }, true);
      const el = window.__box();
      if (!el) return { err: '컨테이너 없음' };
      el.scrollTop = 0;
      const r = el.getBoundingClientRect();
      return { max: el.scrollHeight - el.clientHeight, x: Math.round(r.x + r.width / 2),
               y: Math.round(r.y + Math.min(r.height * 0.65, r.height - 60)) };
    });
    if (info.err) { rows.push({ i, err: info.err }); await ctx.close(); continue; }
    /* verify95 [E] 와 완전히 같은 제스처 */
    if (OLD) {
      await page.mouse.move(info.x, info.y);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) { await page.mouse.move(info.x, info.y - k * 60); await page.waitForTimeout(8); }
      await page.mouse.up();
    } else {
      /* 같은 CDP 세션에 마지막 move 와 up 을 연달아 보낸다 — 순서는 보장되고 간격은 1ms 미만이 된다 */
      const cdp = await ctx.newCDPSession(page);
      const mev = (type, y, buttons) => cdp.send('Input.dispatchMouseEvent',
        { type, x: info.x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' });
      await mev('mousePressed', info.y, 1);
      for (let k = 1; k <= 5; k++) { await mev('mouseMoved', info.y - k * 60, 1); await page.waitForTimeout(8); }
      await Promise.all([mev('mouseMoved', info.y - 360, 1), mev('mouseReleased', info.y - 360, 0)]);
    }
    const t0 = await page.evaluate(() => window.__top());
    const d = await page.evaluate(() => ({ gap: window.__gap, fl: window.__fl, nmv: window.__nmv, drag: window.__drag }));
    await page.waitForTimeout(450);
    const t1 = await page.evaluate(() => window.__top());
    rows.push({ i, gap: d.gap, nmv: d.nmv, drag: d.drag, v: d.fl ? d.fl.v : null, fling: !!d.fl, t0, t1, pass: t1 - t0 > 20 });
    await ctx.close();
  }
  await browser.close();
  console.log('\n| # | gap(ms) | move건수 | ds-drag | fling | v(px/ms) | t0 | t1 | t1−t0 | 판정 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.err) { console.log(`| ${r.i} | — | — | — | — | — | — | — | — | ERR ${r.err} |`); continue; }
    console.log(`| ${r.i} | ${typeof r.gap === 'number' ? r.gap.toFixed(1) : r.gap} | ${r.nmv} | ${r.drag ? '○' : '✗'} | ${r.fling ? '○' : '✗'} | `
      + `${r.v == null ? '—' : r.v.toFixed(3)} | ${Math.round(r.t0)} | ${Math.round(r.t1)} | ${Math.round(r.t1 - r.t0)} | ${r.pass ? 'PASS' : 'FAIL'} |`);
  }
  const bad = rows.filter((r) => r.err || !r.pass);
  const gaps = rows.filter((r) => typeof r.gap === 'number').map((r) => r.gap);
  if (gaps.length) console.log(`\ngap 분포: 최소 ${Math.min(...gaps).toFixed(1)}ms · 최대 ${Math.max(...gaps).toFixed(1)}ms · 제품의 관성 창 90ms`);
  console.log(OLD
    ? `\nPROBE305(--old) — ${rows.length}회 중 실패 ${bad.length}회 (재현용 · 흔들리는 것이 정상)`
    : bad.length ? `\nPROBE305 FAIL — ${rows.length}회 중 ${bad.length}회` : `\nPROBE305 PASS — ${rows.length}/${rows.length}`);
  if (!OLD) process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
