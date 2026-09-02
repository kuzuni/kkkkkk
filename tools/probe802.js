#!/usr/bin/env node
/* 작업 802 재현기 — «12 결과 팝업의 배수 칸을 누르면 «칸» 이 아니라 «바 전체» 가 눌린다»
 *
 *   node tools/probe802.js
 *
 * 등재문(PROGRESS 802 · review 797 §7)의 주장은 둘이다:
 *   ⓐ `jzTarget()` 이 돌려주는 쥬시 호스트가 배수 바 네 자리 중 **상점(#sumMulBar · 724px)만**
 *      «바 자신» 이고 나머지 셋은 «칸»(`[data-mul]` 181px)이다.
 *   ⓑ 뿌리는 `cursor` 가 **상속** 속성이라는 것 — `#sumw{cursor:pointer}`(«터치하여 닫기» 배경 탭)가
 *      `.sm-panel` → `#sumMulBar` 로 흘러, jzTarget 의 «pointer 인 동안 바깥으로 계속 나간다»
 *      걸음이 바에서야 멈춘다(다음 칸 `.sm-panel` 1080×1080 이 크기 가드에 걸려 break).
 *
 * 338 규칙 — 처방을 쓰기 전에 무엇이 참인지부터 못박는다. 축 넷:
 *   [1] 호스트 정체 — 배수 바 네 자리에서 칸을 눌렀을 때 `jzTarget()` 이 돌려주는 노드와 그 폭
 *   [2] 상속 사슬 — `#sumw` 안에서 cursor:pointer 를 **선언한** 노드는 어디이고,
 *                    바·패널이 그 값을 **물려받고만** 있는지(인라인 `cursor:auto` 로 갈랐을 때의 변화)
 *   [3] 눈으로 보이는 대가 — 칸을 실제로 pointerdown 했을 때 `.jz-dn` 이 붙는 노드와
 *                            그 프레임에 **네 칸이 통째로** 물러나는지(칸 폭 실측)
 *   [4] 전수 스윕 — `#sumw` 안의 모든 컨트롤(`[data-mul]`·`.sm-b`·`.sm-sk`·`.sm-close`)에서
 *                   «누른 것 ↔ 답하는 것» 이 어긋나는 자리가 몇 개인가(802 는 한 자리인가 가족인가)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

async function boot(browser) {
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
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();   /* 73 ③ */
  });
  return { ctx, page, errs };
}

/* 797 의 SITES 표를 그대로 쓴다 — 새 진입점을 만들지 않는다. */
const SITES = [
  { id: 'sumMulBar', n: '12 결과 팝업(713)',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); } },
  { id: 'rwMulBar', n: '89 유물 소환(700 · 대조군)',
    open: () => openRelw() },
  { id: 'tpMulBar', n: '23 단련(701 · 대조군)',
    open: () => { openTrain(); setTrSub('temper'); renderTrain(); } },
  { id: 'rnMulBar', n: '23 룬(701 · 대조군)',
    open: () => { openTrain(); setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); } },
];

async function reset(page) {
  await page.evaluate(() => {
    try { closeSummonResult(); } catch (_) {}
    try { closeRelw(); } catch (_) {}
    try { closeTrain(); } catch (_) {}
    try { closeModal(); } catch (_) {}
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
  });
  await page.waitForTimeout(180);
}

const desc = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
  + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser);

  /* ── [1] 호스트 정체 ── */
  console.log('[1] 배수 칸을 눌렀을 때 jzTarget() 이 돌려주는 호스트(네 자리 전수)');
  const host = {};
  for (const s of SITES) {
    await reset(page);
    await page.evaluate(S2 => { eval('(' + S2 + ')').open(); }, `{open:${s.open}}`);
    await page.waitForTimeout(600);
    const r = await page.evaluate(id => {
      const bar = document.getElementById(id);
      if (!bar) return { miss: true };
      const cell = bar.querySelector('[data-mul]:not(.on)') || bar.querySelector('[data-mul]');
      if (!cell) return { miss: true };
      const h = jzTarget(cell);
      const cr = cell.getBoundingClientRect(), hr = h ? h.getBoundingClientRect() : null;
      const d = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
        + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
      return { miss: false, cell: d(cell), cellW: +cr.width.toFixed(1),
               host: d(h), hostW: hr ? +hr.width.toFixed(1) : null, same: h === cell };
    }, s.id);
    host[s.id] = r;
    if (r.miss) { ok(false, '[1-' + s.id + '] 바·칸이 실재한다 — ' + s.n); continue; }
    console.log('    · ' + s.n + ' — 누른 칸 ' + r.cell + '(' + r.cellW + 'px)'
      + ' → 호스트 ' + r.host + '(' + r.hostW + 'px)');
  }
  ok(host.rwMulBar && host.rwMulBar.same, '[1-a] ★ 대조군 — 89 유물 바는 «칸» 이 호스트다',
     host.rwMulBar ? host.rwMulBar.host + ' ' + host.rwMulBar.hostW + 'px' : '—');
  ok(host.tpMulBar && host.tpMulBar.same, '[1-b] ★ 대조군 — 23 단련 바도 «칸» 이 호스트다',
     host.tpMulBar ? host.tpMulBar.host + ' ' + host.tpMulBar.hostW + 'px' : '—');
  ok(host.rnMulBar && host.rnMulBar.same, '[1-c] ★ 대조군 — 23 룬 바도 «칸» 이 호스트다',
     host.rnMulBar ? host.rnMulBar.host + ' ' + host.rnMulBar.hostW + 'px' : '—');
  ok(host.sumMulBar && host.sumMulBar.same,
     '[1-d] ★ 등재문 — 12 결과 팝업 바도 «칸» 이 호스트인가(수리 전 = 빨강 예상)',
     host.sumMulBar ? host.sumMulBar.host + ' ' + host.sumMulBar.hostW + 'px' : '—');

  /* ── [2] 상속 사슬 ── */
  console.log('[2] `#sumw` 안에서 cursor:pointer 를 «선언한» 노드는 어디인가');
  await reset(page);
  await page.evaluate(S2 => { eval('(' + S2 + ')').open(); }, `{open:${SITES[0].open}}`);
  await page.waitForTimeout(600);
  const chain = await page.evaluate(() => {
    const bar = document.getElementById('sumMulBar');
    const cell = bar.querySelector('[data-mul]:not(.on)') || bar.querySelector('[data-mul]');
    const d = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
      + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
    const rows = [];
    for (let el = cell; el && el.nodeType === 1 && el !== document.documentElement; el = el.parentElement) {
      const c = getComputedStyle(el).cursor;
      /* «선언했는가» 를 가른다 — 인라인 `cursor:auto` 를 잠깐 박아 «상속을 끊었을 때» 값이 바뀌는지 본다.
         상속만 받던 노드는 auto 로 떨어지고, 스스로 선언한 노드는 규칙이 다시 이겨 pointer 로 돌아온다.
         ⚠ 인라인은 저자 규칙을 이기므로 «선언 여부» 자체는 이 방법으로 못 읽는다 —
            그래서 부모의 값과 비교하는 축(inheritedFrom)을 같이 찍는다. */
      const p = el.parentElement ? getComputedStyle(el.parentElement).cursor : '(none)';
      const r = el.getBoundingClientRect();
      rows.push({ n: d(el), cursor: c, parent: p, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
                  nopress: !!(el.id && typeof JZ_NOPRESS !== 'undefined' && JZ_NOPRESS.has(el.id)) });
      if (el.id === 'sumw') break;
    }
    return rows;
  });
  chain.forEach(r => console.log('    · ' + r.n.padEnd(28) + ' cursor=' + r.cursor.padEnd(8)
    + ' 부모=' + r.parent.padEnd(8) + ' ' + r.w + '×' + r.h + (r.nopress ? '  [JZ_NOPRESS]' : '')));
  const barRow   = chain.find(r => r.n === '#sumMulBar');
  const panelRow = chain.find(r => r.n.indexOf('sm-panel') >= 0);
  const wRow     = chain.find(r => r.n === '#sumw');
  ok(!!wRow && wRow.cursor === 'pointer', '[2-a] `#sumw` 배경이 cursor:pointer 다(«터치하여 닫기»)',
     wRow ? wRow.cursor : '—');
  ok(!!barRow && barRow.cursor === 'pointer' && !!panelRow && panelRow.cursor === 'pointer',
     '[2-b] ★ 그 값이 `.sm-panel` → `#sumMulBar` 로 **흘러내린다**(상속)',
     barRow && panelRow ? ('panel=' + panelRow.cursor + ' · bar=' + barRow.cursor) : '—');
  ok(!!panelRow && (panelRow.w > 1080 * 0.7 && panelRow.h > 2280 * 0.3),
     '[2-c] ★ 걸음이 바에서 멈추는 이유 — 다음 칸 `.sm-panel` 이 크기 가드에 걸린다',
     panelRow ? panelRow.w + '×' + panelRow.h : '—');

  /* ── [3] 눈에 보이는 대가 ── */
  console.log('[3] 칸을 실제로 눌렀을 때 `.jz-dn` 이 붙는 노드');
  const dn = await page.evaluate(() => {
    const bar = document.getElementById('sumMulBar');
    const cell = bar.querySelector('[data-mul]:not(.on)') || bar.querySelector('[data-mul]');
    const r = cell.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    cell.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true,
      clientX: x, clientY: y, pointerId: 1, isPrimary: true }));
    const d = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
      + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
    const marked = [...document.querySelectorAll('.jz-dn')].map(d);
    const cellDown = cell.classList.contains('jz-dn');
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true,
      clientX: x, clientY: y, pointerId: 1, isPrimary: true }));
    return { marked, cellDown };
  });
  console.log('    · `.jz-dn` 이 붙은 노드: ' + (dn.marked.length ? dn.marked.join(' · ') : '(없음)'));
  ok(dn.cellDown, '[3-a] ★ 누른 «그 칸» 이 눌린다(수리 전 = 빨강 예상)',
     dn.marked.join(' · ') || '(없음)');
  ok(dn.marked.indexOf('#sumMulBar') < 0, '[3-b] ★ «바 전체» 는 안 눌린다(수리 전 = 빨강 예상)',
     dn.marked.join(' · ') || '(없음)');

  /* ── [4] 전수 스윕 — 802 는 한 자리인가 가족인가 ── */
  console.log('[4] `#sumw` 안 컨트롤 전수 — «누른 것 ↔ 답하는 것» 이 어긋나는 자리');
  const sweep = await page.evaluate(() => {
    const d = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
      + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
    const out = [];
    const sel = '[data-mul],.sm-b,.sm-sk,.sm-close,button';
    document.getElementById('sumw').querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;                 /* 안 보이는 것은 세지 않는다 */
      const h = jzTarget(el);
      if (h === el) return;
      const hr = h ? h.getBoundingClientRect() : null;
      out.push({ el: d(el), w: +r.width.toFixed(1), host: d(h), hw: hr ? +hr.width.toFixed(1) : null });
    });
    return out;
  });
  sweep.forEach(r => console.log('    · ' + r.el.padEnd(30) + '(' + r.w + 'px) → ' + r.host + '(' + r.hw + 'px)'));
  ok(sweep.length === 0, '[4-a] ★ `#sumw` 안에 어긋나는 컨트롤이 하나도 없다(수리 전 = 빨강 예상)',
     sweep.length + '건');

  ok(errs.length === 0, '[5] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await ctx.close(); await browser.close();
  console.log('\nPROBE802 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
