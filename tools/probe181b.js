#!/usr/bin/env node
/* 작업 181 진단 ③ — «회전 중 모달 안에서 무엇이 애니메이션·변형되는가» 를 이벤트로 잡는다.
 *
 *   node tools/probe181b.js
 *
 * rect 표본(probe181)은 프레임 사이만 본다 — 60ms 보다 짧게 스쳐 가는 애니는 놓친다.
 * 여기서는 브라우저에게 직접 묻는다:
 *   · `animationstart/end` (모달 서브트리 전체, 캡처 단계)
 *   · `transitionstart`
 *   · MutationObserver — 모달 서브트리의 style/class 변경
 * 그리고 «실제 손가락처럼» pointerdown → 120ms 유지 → pointerup 으로 누른다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1,
    hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { S.daily.spins = 30; openRoulette(); });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    window.__log = [];
    const nm = (el) => (el.tagName || '?').toLowerCase() + (el.id ? '#' + el.id : '') +
      (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    const m = document.getElementById('modal');
    const t0 = performance.now();
    const rec = (kind, el, extra) => window.__log.push(
      Math.round(performance.now() - t0) + 'ms ' + kind + ' ' + nm(el) + (extra ? ' ' + extra : ''));
    ['animationstart', 'animationend', 'animationcancel', 'transitionstart'].forEach((ev) =>
      m.addEventListener(ev, (e) => rec(ev, e.target, e.animationName || e.propertyName), true));
    new MutationObserver((ms) => ms.forEach((r) => {
      if (r.target.id === 'rouDisc') return;                 /* 원판은 돌아야 한다 */
      rec('mut:' + r.attributeName, r.target,
        String(r.target.getAttribute(r.attributeName) || '').slice(0, 70));
    })).observe(m, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    /* 연출 레이어(#fxl)는 모달 «위» 에 그려진다 — 팝업을 가로지르는지 같이 센다 */
    window.__fx = 0;
    const fxl = document.getElementById('fxl');
    if (fxl) new MutationObserver((ms) => ms.forEach((r) => { window.__fx += r.addedNodes.length; }))
      .observe(fxl, { childList: true });
  });

  /* 실제 손가락 — pointerdown 유지 120ms 후 pointerup */
  const b = await page.$('#rouBtn');
  const bb = await b.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();

  await page.waitForTimeout(4600);
  const log = await page.evaluate(() => window.__log);
  const fx = await page.evaluate(() => window.__fx);
  console.log('모달 서브트리 이벤트 ' + log.length + '건 · #fxl 에 추가된 연출 노드 ' + fx + '개\n');
  log.slice(0, 80).forEach((l) => console.log('  ' + l));
  if (log.length > 80) console.log('  … 외 ' + (log.length - 80) + '건');
  if (errs.length) console.log('\n에러: ' + errs.join('\n'));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
