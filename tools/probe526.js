#!/usr/bin/env node
/* 재현(338 규칙) — 작업 526 「35/36 패스 리스트 창 가상화」 착수 전에 **지금 무엇이 참인가**를 먼저 묻는다.
 *
 *   node tools/probe526.js
 *
 * 등재문(493 이 넘긴 것)은 «600행 = 16,204노드라 열기가 27 → 약 300ms 이고 playwright click 이 1.3초» 다.
 * 493 이 이미 후보 셋을 «찍힌 픽셀» 로 기각해 뒀으므로(review 493 §3) 여기서 다시 재지 않는다.
 * 이 프로브가 묻는 것은 **가상화를 짜기 전에 알아야 하는 네 가지**다:
 *
 *   [1] 지금 열기 시간 — 탭 4종 × 20회 중앙값(수리 전 값을 못박는다)
 *   [2] DOM 규모 — 트랙 노드 수·행 수·행당 노드·트랙 높이
 *   [3] 창 크기의 근거 — 뷰포트(#psList)에 실제로 걸리는 행이 몇 개인가
 *   [4] 게이트가 «DOM 을 전수로» 세는 자리 — 지금 값 ↔ 모델(passReadyCnt·passLast·PASS_TABS.n) 값
 *       (창을 넣으면 왼쪽이 줄고 오른쪽은 안 변한다 = 이관해야 하는 항의 목록이다)
 *   [5] «빈 행 0» 판정기 — 스크롤 전 구간에서 뷰포트에 걸리는 행이 전부 DOM 에 있는가
 *       (수리 전에는 당연히 참이다. 수리 후 같은 자를 그대로 다시 댄다 = 회귀선)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const TABS = ['stage', 'att', 'tower', 'tower2'];

/* 세이브를 «중간쯤 진행» 으로 세운다 — 해금/미해금·수령/미수령이 한 화면에 같이 나와야
   레드닷·수령완료 표시가 창을 갈아 끼우며 깜빡이는지 볼 수 있다(301/302 규약). */
const SETUP = () => {
  S.best = 400; S.att.n = 40;
  S.tower = 41; S.tower2 = 31;
  S.pass.prem = { stage: 1, att: 1, tower: 1, tower2: 1 };
  S.pass.got = {};
};

(async () => {
  console.log('=== probe526 — 패스 리스트 창 가상화, 착수 전 재현 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(SETUP);

  /* ── [1] 지금 열기 시간 ────────────────────────────────────────── */
  console.log('[1] 열기(openPass = renderPass + passScroll) — 20회 중앙값 / 최대');
  const open = {};
  for (const t of TABS) {
    open[t] = await p.evaluate(([tab]) => {
      const ms = [];
      for (let r = 0; r < 20; r++) { closePass(); const a = performance.now(); openPass(tab); ms.push(performance.now() - a); }
      ms.sort((x, y) => x - y);
      return { med: +ms[10].toFixed(1), max: +ms[19].toFixed(1) };
    }, [t]);
    console.log('    ' + t.padEnd(7) + ' ' + String(open[t].med).padStart(7) + 'ms / ' + String(open[t].max).padStart(7) + 'ms');
  }

  /* ── [2] DOM 규모 ──────────────────────────────────────────────── */
  console.log('\n[2] DOM 규모(트랙 #psTk)');
  const dom = {};
  for (const t of TABS) {
    dom[t] = await p.evaluate(([tab]) => {
      openPass(tab);
      const tk = document.getElementById('psTk');
      const rows = tk.querySelectorAll('.ps-r:not(.ps-hr)').length;
      return { nodes: tk.querySelectorAll('*').length, rows,
               boxes: tk.querySelectorAll('.ps-bx').length,
               per: rows ? +(tk.querySelectorAll('*').length / rows).toFixed(1) : 0,
               trackH: +parseFloat(tk.style.height).toFixed(0),
               html: tk.innerHTML.length };
    }, [t]);
    const d = dom[t];
    console.log('    ' + t.padEnd(7) + ' 노드 ' + String(d.nodes).padStart(6) + ' · 행 ' + String(d.rows).padStart(4)
      + ' · 칸 ' + String(d.boxes).padStart(5) + ' · 행당 ' + d.per + ' · 트랙 ' + d.trackH + 'px · innerHTML ' + (d.html / 1024 | 0) + 'KB');
  }

  /* ── [3] 창 크기의 근거 ────────────────────────────────────────── */
  console.log('\n[3] 뷰포트(#psList)에 실제로 걸리는 행 — 창 크기를 여기서 역산한다');
  const vp = await p.evaluate(() => {
    openPass('stage');
    const L = document.getElementById('psList'), R = L.getBoundingClientRect();
    const hit = st => { L.scrollTop = st;
      if (typeof passFillRows === 'function') passFillRows();   /* 526 이후: 창을 그 자리로 옮긴다 */
      return [...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].filter(r => {
        const b = r.getBoundingClientRect(); return b.bottom > R.top && b.top < R.bottom; }).length; };
    const out = { h: +R.height.toFixed(1), rh: PASS_RH, top: hit(0), mid: hit(L.scrollHeight / 2), end: hit(L.scrollHeight) };
    L.scrollTop = 0;
    return out;
  });
  console.log('    리스트 높이 ' + vp.h + 'px · 행 pitch ' + vp.rh
    + ' ⇒ 한 화면 ' + (vp.h / vp.rh).toFixed(2) + '행 (실측 걸림 — 위 ' + vp.top + ' / 중간 ' + vp.mid + ' / 끝 ' + vp.end + ')');

  /* ── [4] 게이트가 DOM 을 전수로 세는 자리 ──────────────────────── */
  console.log('\n[4] «DOM 전수» ↔ «모델» — 창을 넣으면 왼쪽만 줄어든다(= 이관 목록)');
  for (const t of TABS) {
    const g = await p.evaluate(([tab]) => {
      openPass(tab);
      const T = PASS_TABS[tab];
      let ready = 0, openN = 0;
      const prem = !!(S.pass.prem && S.pass.prem[tab]);
      for (let i = 0; i < T.n; i++) {
        if (T.prog() >= (i + 1) * T.step) openN++;
        if (T.prog() < (i + 1) * T.step) continue;
        for (let c = 0; c < T.cols; c++) { if (c > 0 && !prem) continue; if (!S.pass.got[tab + ':' + i + ':' + c]) ready++; }
      }
      return { domRows: document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').length,
               domBoxes: document.querySelectorAll('#psTk .ps-bx').length,
               domOpenHex: document.querySelectorAll('#psTk .ps-hex:not(.lk)').length,
               domLit: document.querySelectorAll('#psTk .ps-bx.alert').length,
               mRows: T.n, mBoxes: T.n * T.cols, mOpenHex: openN, mLit: ready, mReadyCnt: passReadyCnt() };
    }, [t]);
    console.log('    ' + t.padEnd(7)
      + ' 행 ' + String(g.domRows).padStart(4) + '/' + String(g.mRows).padEnd(4)
      + ' 칸 ' + String(g.domBoxes).padStart(5) + '/' + String(g.mBoxes).padEnd(5)
      + ' 해금육각 ' + String(g.domOpenHex).padStart(4) + '/' + String(g.mOpenHex).padEnd(4)
      + ' 점등칸 ' + String(g.domLit).padStart(4) + '/' + String(g.mLit).padEnd(4)
      + ' (passReadyCnt ' + g.mReadyCnt + ')');
  }

  /* ── [5] «빈 행 0» 판정기 ──────────────────────────────────────── */
  console.log('\n[5] 스크롤 전 구간 «빈 행 0» — 뷰포트에 걸려야 할 행이 전부 DOM 에 있는가');
  for (const t of TABS) {
    const r = await p.evaluate(([tab]) => {
      openPass(tab);
      const L = document.getElementById('psList'), T = PASS_TABS[tab];
      const off = T.head ? 226.5 : 0;
      const max = L.scrollHeight - L.clientHeight;
      let miss = 0, worst = null, steps = 0;
      for (let s = 0; s <= max + 1; s += Math.max(1, PASS_RH / 2)) {
        const st = Math.min(s, max);
        L.scrollTop = st;
        if (typeof passFillRows === 'function') passFillRows();
        steps++;
        /* 뷰포트에 걸리는 «행 번호» 를 좌표로 계산한다 — DOM 에 안 물어본다 */
        const a = Math.max(0, Math.floor((st - off) / PASS_RH));
        const b = Math.min(T.n - 1, Math.floor((st + L.clientHeight - off - 0.01) / PASS_RH));
        const have = new Set([...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].map(e => +e.dataset.pr));
        const byTop = new Set([...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')]
          .map(e => Math.round((parseFloat(e.style.top) - off) / PASS_RH)));
        for (let i = a; i <= b; i++) if (!have.has(i) && !byTop.has(i)) { miss++; if (worst === null) worst = { st: +st.toFixed(1), i }; }
      }
      L.scrollTop = 0;
      return { miss, worst, steps, max: +max.toFixed(0) };
    }, [t]);
    console.log('    ' + t.padEnd(7) + ' 표본 ' + String(r.steps).padStart(4) + '자리(0..' + r.max + 'px) — 빈 행 '
      + r.miss + (r.worst ? '  ⚠ 첫 자리 scrollTop ' + r.worst.st + ' 행#' + r.worst.i : '  ✔'));
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? '\n    ' + errs.join('\n    ') : ''));
  await browser.close();
})();
