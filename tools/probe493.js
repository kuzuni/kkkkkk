#!/usr/bin/env node
/* 재현(338 규칙) — 작업 493 「패스 길이 확장」 착수 전에 **지금 무엇이 참인가**를 먼저 묻는다.
 *
 *   node tools/probe493.js
 *
 * 등재문이 세운 것은 상수 셋(`PASS_N` 40 → 600 · 출석 `n` 30 → 100 · `PASS_TOWER_N` 30 → 100)이고
 * ⑤ 가 «600행 DOM 을 한 번에 그리면 35 팝업 열기가 느려질 수 있다 — 필요하면 가상화» 다.
 * **가상화는 구조를 통째로 바꾸는 처방이라 «느리다» 를 재고 시작한다**(341·338 이 기각된 자리).
 *
 *   [1] 지금 길이 — 탭별 단계 수·마지막 목표(수리 전 값을 못박는다)
 *   [2] 지금 열기 시간 — `openPass()` 왕복(렌더 + 스크롤) 20회 중앙값
 *   [3] 600행 모의 — `PASS_TABS.stage.n` 만 600 으로 올려 같은 자를 다시 댄다(제품 0줄)
 *   [4] DOM 규모 — 노드 수·트랙 높이·innerHTML 길이
 *   [5] 표기 폭 — 새 곡선의 최장 표기(`won`)와 칸 안쪽 146px 이탈 여부(verify398 §1 의 자)
 *   [6] 스크롤 — `passScroll()` 이 마지막 해금 단계를 두 번째 행에 두는가(600행에서도)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

(async () => {
  console.log('=== probe493 — 패스 길이 확장, 착수 전 재현 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);

  /* ── [1] 지금 길이 ─────────────────────────────────────────────── */
  const len = await p.evaluate(() => Object.keys(PASS_TABS).map(k => ({
    k, n: PASS_TABS[k].n, step: PASS_TABS[k].step, last: (PASS_TABS[k].n) * PASS_TABS[k].step
  })));
  console.log('[1] 지금 길이');
  len.forEach(t => console.log('    ' + t.k.padEnd(7) + ' n=' + String(t.n).padStart(4)
    + ' step=' + t.step + ' → 마지막 목표 ' + t.last));

  /* ── [2] 지금 열기 시간 ────────────────────────────────────────── */
  const t40 = await p.evaluate(() => {
    const ms = [];
    for (let r = 0; r < 20; r++) {
      closePass();
      const a = performance.now(); openPass('stage'); const b = performance.now();
      ms.push(b - a);
    }
    ms.sort((x, y) => x - y);
    return { med: ms[10], max: ms[19] };
  });
  console.log('\n[2] 지금 열기(stage · 40행) — 중앙값 ' + t40.med.toFixed(1) + 'ms · 최대 ' + t40.max.toFixed(1) + 'ms');

  /* ── [3] 600행 모의 ────────────────────────────────────────────── */
  const t600 = await p.evaluate(() => {
    PASS_TABS.stage.n = 600;
    const ms = [];
    for (let r = 0; r < 20; r++) {
      closePass();
      const a = performance.now(); openPass('stage'); const b = performance.now();
      ms.push(b - a);
    }
    ms.sort((x, y) => x - y);
    return { med: ms[10], max: ms[19] };
  });
  console.log('[3] 600행 모의(제품 0줄 — n 만 올림) — 중앙값 ' + t600.med.toFixed(1)
    + 'ms · 최대 ' + t600.max.toFixed(1) + 'ms   [배수 ' + (t600.med / t40.med).toFixed(1) + '×]');

  /* ── [4] DOM 규모 ──────────────────────────────────────────────── */
  const dom = await p.evaluate(() => {
    const tk = document.getElementById('psTk');
    return { nodes: tk.querySelectorAll('*').length, rows: tk.querySelectorAll('.ps-r').length,
             boxes: tk.querySelectorAll('.ps-bx').length, h: tk.style.height,
             html: tk.innerHTML.length, list: document.getElementById('psList').clientHeight };
  });
  console.log('[4] DOM(600행) — 노드 ' + dom.nodes + ' · 행 ' + dom.rows + ' · 칸 ' + dom.boxes
    + ' · 트랙 높이 ' + dom.h + ' · innerHTML ' + (dom.html / 1024).toFixed(0) + 'KB · 뷰포트 ' + dom.list);

  /* ── [5] 표기 폭 ──────────────────────────────────────────────── */
  const txt = await p.evaluate(() => {
    let longest = '', lw = 0, over = 0, worst = null;
    document.querySelectorAll('#psTk .ps-bx').forEach(b => {
      const em = b.querySelector('b>em'); if (!em) return;
      const s = em.textContent, w = em.getBoundingClientRect().width;
      if (s.length > longest.length) longest = s;
      if (w > lw) { lw = w; worst = s; }
      if (w > 146) over++;
    });
    return { longest, lw, worst, over,
             n599: passRw(599, 0).n, n599p: passRw(599, 1).n, g599: passRw(599, 0).g };
  });
  console.log('[5] 표기 — 최장 «' + txt.longest + '»(' + txt.longest.length + '자) · 최대 잉크폭 '
    + txt.lw.toFixed(1) + 'px(«' + txt.worst + '») · 146 초과 ' + txt.over + '칸'
    + '  |  600단계 보상: 무료 ' + txt.n599 + ' · 프리미엄 ' + txt.n599p + ' · 등급 ' + txt.g599);

  /* ── [6] 스크롤 ────────────────────────────────────────────────── */
  const sc = await p.evaluate(() => {
    S.best = 1500; renderPass(); passScroll();
    const L = document.getElementById('psList');
    const last = passLast();
    const row = document.querySelectorAll('#psTk .ps-r')[last];
    const r = row.getBoundingClientRect(), lr = L.getBoundingClientRect();
    return { best: S.best, last, tier: passTier(last), top: L.scrollTop,
             rowInView: (r.top - lr.top).toFixed(1), max: L.scrollHeight - L.clientHeight };
  });
  console.log('[6] 스크롤(S.best=1500) — 마지막 해금 단계 #' + sc.last + '(목표 ' + sc.tier
    + ') · scrollTop ' + sc.top.toFixed(0) + ' / ' + sc.max.toFixed(0)
    + ' · 그 행이 뷰포트 상단에서 ' + sc.rowInView + 'px');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));
  await browser.close();
})();
