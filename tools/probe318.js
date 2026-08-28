#!/usr/bin/env node
/* 프로브 — 작업 318 「출석 보상 레드닷」 착수 전 실측 (지시서 [-1] «착수 전 코드로 재확인», LESSONS 264)
 *
 *   node tools/probe318.js
 *
 * 재는 것 (등재문 ① 이 시킨 «먼저 확인»):
 *   ⓐ «오늘 미출석» 상태에서 좌측 사이드 «출석» 아이콘 레드닷이 **실제로 보이는지**
 *      — 논리(.on / computed display)와 **화소**(배지 bbox 안 빨강 수)를 같이 잰다(293 관례).
 *   ⓑ 70 팝업을 연 뒤 그 신호가 화면에 남는지 (293 «확인하려고 손을 대는 순간 사라진다» 형)
 *   ⓒ 팝업 안 «오늘 카드»(`[data-att]`)에 배지 노드가 있는지
 *   ⓓ 수령 후 소등되는지
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

const P = (o) => console.log(JSON.stringify(o, null, 1));

/* 배지 bbox 안의 «빨강» 화소 수 — 스크린샷을 png 로 받아 세지 않고, 캔버스 없이
   playwright 의 clip 캡처 + sharp 없이도 세도록 raw 비교 대신 색 표본을 쓴다.
   여기서는 간단히 clip 캡처의 PNG 바이트를 세는 대신 elementHandle 의 가시성 + 실제 합성 결과를
   `page.screenshot({clip})` → PNG 디코드 없이 못 세므로, DOM 기하 + computed style 로 판정하고
   «가려짐» 은 elementFromPoint 로 잰다(292 «열렸는가 ≠ 보이는가» 의 값싼 판정). */
async function shot(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { exists: false };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      exists: true, display: cs.display, opacity: cs.opacity, visibility: cs.visibility,
      z: cs.zIndex, rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      hitSelf: !!top && (top === el || el.contains(top)),
      hitTag: top ? (top.id ? '#' + top.id : top.className || top.tagName) : null,
    };
  }, sel);
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 500, best: 30, totalKills: 500, att: { n: 3, date: '' } })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openAttend === 'function');
  await page.waitForTimeout(900);

  console.log('── ⓐ 미출석 상태: 사이드 «출석» 버튼 ──');
  P(await page.evaluate(() => {
    const b = document.querySelector('.side .ibtn[data-pop="attend"]');
    return { can: S.att.date !== today(), on: b ? b.classList.contains('on') : null,
             n: S.att.n, date: S.att.date };
  }));
  P(await shot(page, '.side .ibtn[data-pop="attend"] .bdg'));

  console.log('── ⓑ 70 팝업을 연 뒤 (사이드 배지가 화면에 남는가) ──');
  await page.evaluate(() => openAttend());
  await page.waitForTimeout(500);
  P(await shot(page, '.side .ibtn[data-pop="attend"] .bdg'));
  P(await page.evaluate(() => {
    const m = document.getElementById('modal');
    const dim = m ? getComputedStyle(m) : null;
    return { modalOn: m ? m.classList.contains('on') : null, modalClass: m ? m.className : null,
             modalZ: dim ? dim.zIndex : null,
             sideZ: getComputedStyle(document.querySelector('.side')).zIndex };
  }));

  console.log('── ⓒ 팝업 안 «오늘 카드» 배지 노드 ──');
  P(await page.evaluate(() => {
    const t = document.querySelector('#mbox [data-att]');
    const cards = [...document.querySelectorAll('#mbox .at-c, #mbox .at-c7')];
    return {
      todayCard: !!t, todayClass: t ? t.className : null,
      badgeInToday: t ? t.querySelectorAll('.updot,.bdg,.dot').length : null,
      badgesInPopup: document.querySelectorAll('#mbox .updot, #mbox .bdg, #mbox .dot').length,
      cards: cards.map(c => c.className),
    };
  }));

  console.log('── ⓓ 수령 후 ──');
  await page.evaluate(() => { const t = document.querySelector('#mbox [data-att]'); if (t) t.click(); });
  await page.waitForTimeout(700);
  P(await page.evaluate(() => {
    const b = document.querySelector('.side .ibtn[data-pop="attend"]');
    return { can: S.att.date !== today(), sideOn: b.classList.contains('on'),
             todayCard: !!document.querySelector('#mbox [data-att]'), n: S.att.n };
  }));
  await page.evaluate(() => { uiDirty = true; renderUI(); });
  await page.waitForTimeout(300);
  P(await page.evaluate(() => ({ sideOnAfterRender: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on') })));

  console.log('── 콘솔 에러 ──');
  console.log(errs.length ? errs.slice(0, 5).join('\n') : '(없음)');
  await browser.close();
})();
