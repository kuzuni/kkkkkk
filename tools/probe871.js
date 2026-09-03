#!/usr/bin/env node
/* 작업 871 재현기 — 「`verify816` [C1] 이 «지금 상자» 로 재서 «없는 결함» 을 만든다」
 * (T1 «버그(자 플레이키 · 870 계열)» · 지시서 [3]-**(가)**(자 — 비평가 없음) · 338 규칙: 처방 전에 재현)
 *
 *   node tools/probe871.js [--runs 3] [--fits .18,.12,.05] [--hold 1400]
 *
 * 870 이 `verify818` [C1] 에서 갈랐던 그 갈래를 훈련 `.cb` 에서 다시 연다.
 *   ⓐ 표본이 얕아 «있는 결함» 을 가끔만 잡는다        ⇒ 제품 수리
 *   ⓑ 표본기가 «태생 상자» 가 아니라 «표본 시각 상자» 로 재서 **없는 결함**을 만든다 ⇒ 자 수리
 *
 * 자 둘을 **같은 알 무리에** 동시에 댄다:
 *   · `outBirth` — 그 알이 **태어난 순간**의 `.cb` 상자(= 제품이 `fxRect(t)` 로 가둠에 쓴 그 상자.
 *                  MutationObserver 콜백은 발화가 알을 **동기로** 붙인 직후의 마이크로태스크에서 돈다)
 *   · `outNow`   — 표본을 뜨는 **그 순간**의 `.cb` 상자(= `verify816` [C1] 이 쓰던 자)
 * 그리고 홀드 내내 상자가 621 눌림으로 얼마나 왕복하는지(`swing`)를 같이 적는다 —
 * 그 진폭이 곧 옛 자의 제비뽑기 크기다(LESSONS 239-① «흔들리는 양은 표에 기록으로만»).
 *
 * ⚠ 제품 `index.html` 은 한 글자도 안 건드린다. `--burst-fit` 은 838 이 이미 만들어 둔 손잡이이고,
 *   여기서는 «838 이 훈련 손잡이를 더 조이면» 이라는 871 등재문의 그 조건을 재현하는 데만 쓴다
 *   (가둠 여유 `inM = sz/2 + FXB_INPAD` 가 알을 따라 줄어 눌림 몫보다 작아지는 지점).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const RUNS = Number(arg('--runs') || 3);
const HOLD_MS = Number(arg('--hold') || 1400);
const STEP_MS = Number(arg('--step') || 16);
const FITS = (arg('--fits') || 'null,.12,.05').split(',').map(s => s.trim());
const KEEP = arg('--keep');   /* 816 의 되돌림 판과 같은 손잡이(`--burst-keep:none`) — 구멍이 각을 굴리지 않는 판 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;
const p2 = n => Math.round(n * 100) / 100;

/* ── 계측기(페이지 안) ────────────────────────────────────────────────────
   알이 `#fxl` 에 붙는 순간의 `.cb` 상자를 그 알에 적어 둔다(`nd.__hb871`).
   제품 코드는 안 건드린다 — 관측 창을 여는 것뿐이다. */
const INSTALL = () => {
  const L = document.getElementById('fxl');
  if (!L) return false;
  const cb = () => document.querySelector('#trCards [data-tr] .cb');
  const box = () => { const e = cb(); if (!e) return null; const b = e.getBoundingClientRect();
                      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
  if (window.__P871) window.__P871.mo.disconnect();
  const st = { mo: null, born: [] };
  st.mo = new MutationObserver(recs => {
    const b = box();
    for (const r of recs) for (const nd of r.addedNodes)
      if (nd.nodeType === 1 && /fx-spark/.test(nd.className + '')) { nd.__hb871 = b; st.born.push(b); }
  });
  st.mo.observe(L, { childList: true });
  window.__P871 = st;
  return true;
};

/* 한 표본 = 살아 있는 알의 «중심 + 크기 + 태생 상자» 와 그 순간의 `.cb` 상자를 **날 것으로** 넘긴다.
   판정은 Node 쪽에서 한다 — 같은 표본을 여러 자로 다시 재기 위해서다. */
const SAMPLE = () => {
  const L = document.getElementById('fxl');
  const cbEl = document.querySelector('#trCards [data-tr] .cb');
  const R = e => { const b = e.getBoundingClientRect();
                   return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
  const hb = cbEl ? R(cbEl) : null;
  const eggs = [];
  if (L) for (const nd of L.children) {
    if (!/fx-spark/.test(nd.className + '')) continue;
    const b = nd.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    /* `dsz` = 변환(스케일 애니) **이전**의 선언 크기 = 제품이 `inM = sz/2 + FXB_INPAD` 에 쓰는 그 sz.
       `sz`(bbox)는 수명 동안 오르내리므로 여유를 산수할 때 쓰면 안 된다. */
    eggs.push({ cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2,
                sz: Math.max(b.width, b.height), dsz: Math.max(nd.offsetWidth, nd.offsetHeight),
                hb: nd.__hb871 || null });
  }
  return { eggs, hb };
};

async function hold(page, fit, keep) {
  await page.evaluate(a => {
    for (const c of document.querySelectorAll('#trCards [data-tr] .cb')) {
      if (a.fit === null) c.style.removeProperty('--burst-fit'); else c.style.setProperty('--burst-fit', a.fit);
      if (a.keep == null) c.style.removeProperty('--burst-keep'); else c.style.setProperty('--burst-keep', a.keep);
    }
    const L = document.getElementById('fxl');
    if (L) for (const nd of [...L.children]) if (/fx-spark/.test(nd.className + '')) nd.remove();
  }, { fit, keep: keep === undefined ? null : keep });
  await page.waitForTimeout(150);
  await page.evaluate(INSTALL);
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr] .cb'); if (!h) return null;
    const b = h.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  /* ⚑ 표본은 **페이지 안에서 rAF 로** 뜬다 — Node 왕복(≈70ms)으로 뜨면 홀드 1.4초에 표본이 19장뿐이라
     눌림 위상을 성기게밖에 못 밟는다. 재현기는 «걸릴 수 있는 위상» 을 전부 보여야 하므로 프레임마다 뜬다.
     (`verify816` 은 여전히 성긴 왕복 표본이다 — 그 성김이 곧 871 이 말하는 제비뽑기의 절반이다.) */
  const rows = await page.evaluate(([ms, src]) => new Promise(res => {
    const smp = new Function('return (' + src + ')')();
    const out = []; const t0 = performance.now();
    const step = () => { out.push(smp()); if (performance.now() - t0 < ms) requestAnimationFrame(step); else res(out); };
    requestAnimationFrame(step);
  }), [HOLD_MS, SAMPLE.toString()]);
  await page.mouse.up();
  await page.waitForTimeout(60);
  const born = await page.evaluate(() => { const s = window.__P871; if (s) s.mo.disconnect(); return s ? s.born : []; });
  const live = rows.filter(r => r.eggs.length > 0);
  const sw = (arr, k) => { const v = arr.map(b => b && b[k]).filter(x => typeof x === 'number');
                           return v.length ? [Math.min.apply(null, v), Math.max.apply(null, v)] : [0, 0]; };
  const outOf = (e, b) => b ? (e.cx < b.left || e.cx > b.right || e.cy < b.top || e.cy > b.bottom) : false;
  /* 부호 있는 «밖으로 나간 양»(음수 = 안쪽) — 문턱에 얼마나 붙어 있는지를 px 로 본다(574·709·825 규율) */
  const overOf = (e, b) => b ? Math.max(b.left - e.cx, e.cx - b.right, b.top - e.cy, e.cy - b.bottom) : -1e9;
  /* 홀드 내내 관측된 상자 위상 전부(태생 + 표본 시각) — 옛 자의 표본이 «걸릴 수 있었던» 상자들이다 */
  const key = b => b ? [b.left, b.top, b.w, b.h].map(v => Math.round(v * 10)).join(',') : '';
  const phases = []; const seenK = new Set();
  for (const b of born.concat(rows.map(r => r.hb))) { const k = key(b); if (b && !seenK.has(k)) { seenK.add(k); phases.push(b); } }
  let outB = 0, outN = 0, outAny = 0, tagged = 0, seen = 0, sz = 0, minM = 1e9, minX = 1e9, minY = 1e9;
  let over = -1e9, overNow = -1e9, szMin = 1e9, dszMin = 1e9, dszMax = 0;
  for (const r of live) {
    let oB = 0, oN = 0;
    const oP = phases.map(() => 0);
    for (const e of r.eggs) {
      seen++; sz = Math.max(sz, e.sz); szMin = Math.min(szMin, e.sz);
      if (e.dsz > 0) { dszMin = Math.min(dszMin, e.dsz); dszMax = Math.max(dszMax, e.dsz); }
      if (e.hb) {
        tagged++;
        if (outOf(e, e.hb)) oB++;
        /* 여유 실측 — 알 중심이 자기 태생 상자의 가장 가까운 변에서 얼마나 떨어져 있는가(= inM 의 하한) */
        const mx = Math.min(e.cx - e.hb.left, e.hb.right - e.cx);
        const my = Math.min(e.cy - e.hb.top, e.hb.bottom - e.cy);
        minM = Math.min(minM, mx, my); minX = Math.min(minX, mx); minY = Math.min(minY, my);
      }
      if (outOf(e, r.hb)) oN++;
      for (let i = 0; i < phases.length; i++) { if (outOf(e, phases[i])) oP[i]++; over = Math.max(over, overOf(e, phases[i])); }
      overNow = Math.max(overNow, overOf(e, r.hb));
    }
    outB = Math.max(outB, oB); outN = Math.max(outN, oN); outAny = Math.max(outAny, ...oP);
  }
  return {
    frames: live.length, eggs: live.length ? seen / live.length : 0, sz,
    outB, outN, outAny, tagged, seen, gens: born.length, phases: phases.length,
    over, overNow, szMin: szMin === 1e9 ? -1 : szMin,
    dszMin: dszMin === 1e9 ? -1 : dszMin, dszMax,
    margin: minM === 1e9 ? -1 : minM,
    marginX: minX === 1e9 ? -1 : minX, marginY: minY === 1e9 ? -1 : minY,
    swBirth: { top: sw(born, 'top'), h: sw(born, 'h'), left: sw(born, 'left'), w: sw(born, 'w') },
    swNow: { top: sw(rows.map(r => r.hb), 'top'), h: sw(rows.map(r => r.hb), 'h'),
             left: sw(rows.map(r => r.hb), 'left'), w: sw(rows.map(r => r.hb), 'w') }
  };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    openTrain();
  });
  await page.waitForTimeout(400);

  console.log('[1] 두 자를 같은 알 무리에 동시에 댄다 — 훈련 `.cb` · 홀드 ' + HOLD_MS + 'ms × ' + RUNS + '판');
  const table = [];
  for (const f of FITS) {
    const fit = (f === 'null' || f === '') ? null : f;
    const rs = [];
    for (let i = 0; i < RUNS; i++) rs.push(await hold(page, fit, KEEP));
    const good = rs.filter(Boolean);
    const redN = good.filter(r => r.outN > 0).length;
    const redB = good.filter(r => r.outB > 0).length;
    table.push({ fit: fit === null ? '제품(.18)' : fit, rs: good, redN, redB });
    const redA = good.filter(r => r.outAny > 0).length;
    console.log('  · --burst-fit ' + (fit === null ? '제품 선언(.18)' : fit)
      + ' — 알 최대 ' + p1(Math.max(0, ...good.map(r => r.sz))) + 'px'
      + ' · 평균 동시 ' + p1(good.reduce((a, r) => a + r.eggs, 0) / Math.max(1, good.length)) + '알'
      + ' · 여유 최소 ' + p2(Math.min(...good.map(r => r.margin)))
      + 'px(가로 ' + p2(Math.min(...good.map(r => r.marginX)))
      + ' · 세로 ' + p2(Math.min(...good.map(r => r.marginY))) + ')'
      + ' · 선언 크기 ' + p1(Math.min(...good.map(r => r.dszMin))) + '~' + p1(Math.max(...good.map(r => r.dszMax))) + 'px');
    console.log('      태생 상자 자 빨강 **' + redB + '/' + good.length + '판**(값 ' + good.map(r => r.outB).join('·') + ')'
      + ' · 지금 상자 자 빨강 **' + redN + '/' + good.length + '판**(값 ' + good.map(r => r.outN).join('·') + ')'
      + ' · **위상이 걸렸다면**(관측된 상자 아무 것) 빨강 ' + redA + '/' + good.length + '판(값 '
      + good.map(r => r.outAny).join('·') + ')');
    console.log('      문턱까지 남은 거리(음수 = 아직 안) — 다른 위상 최대 ' + p2(Math.max(...good.map(r => r.over)))
      + 'px · 지금 상자 최대 ' + p2(Math.max(...good.map(r => r.overNow))) + 'px');
    const b0 = good[0];
    if (b0) console.log('      상자 왕복(기록) — 태생 top ' + p1(b0.swBirth.top[0]) + '~' + p1(b0.swBirth.top[1])
      + '(진폭 ' + p2(b0.swBirth.top[1] - b0.swBirth.top[0]) + ') · 폭 ' + p1(b0.swBirth.w[0]) + '~' + p1(b0.swBirth.w[1])
      + '(진폭 ' + p2(b0.swBirth.w[1] - b0.swBirth.w[0]) + ') · 좌변 ' + p1(b0.swBirth.left[0]) + '~' + p1(b0.swBirth.left[1])
      + ' · 표본 시각 폭 ' + p1(b0.swNow.w[0]) + '~' + p1(b0.swNow.w[1])
      + ' · 위상 ' + b0.phases + '가지');
  }

  /* ── [3] 결정적 재현 ────────────────────────────────────────────────────
     [1] 이 보여 준 것은 «옛 자가 문턱에서 3~4px 떨어져 돌고 있다» 이지 «틀렸다» 가 아니다.
     여기서는 제비를 기다리지 않고 **제품이 놓을 수 있는 자리**(가둠 상자의 클램프 = `r.x + r.w − inM`)에
     알 하나를 우리 손으로 놓고 두 자에게 같은 것을 묻는다. 없는 결함을 지어내는 것이 아니다 —
     이 좌표는 제품의 클램프 식이 **허락하는 정확히 그 점**이고, 실제로 알이 그리로 갈 때
     옛 자가 무엇이라 답하는지가 이 작업의 전부다. */
  console.log('\n[3] 결정적 재현 — «제품이 놓을 수 있는 자리» 를 두 자에게 같이 묻는다');
  const wide = { left: 0, top: 0, w: 0, h: 0 }, narrow = { left: 0, top: 0, w: 1e9, h: 0 };
  for (const t of table) for (const r of t.rs) {
    if (r.swBirth.w[1] > wide.w) { wide.w = r.swBirth.w[1]; wide.left = r.swBirth.left[0]; wide.top = r.swBirth.top[0]; wide.h = r.swBirth.h[1]; }
    if (r.swBirth.w[0] < narrow.w) { narrow.w = r.swBirth.w[0]; narrow.left = r.swBirth.left[1]; narrow.top = r.swBirth.top[1]; narrow.h = r.swBirth.h[0]; }
  }
  const allR = table.reduce((a, t) => a.concat(t.rs), []);
  /* 제품의 가둠 여유는 **알마다** 다르다(`inM = sz/2 + FXB_INPAD` · FXB_INPAD = 4) — 그러니
     «제품이 놓을 수 있는 가장 바깥» 은 **가장 작은 알**이 정한다. 그 알의 선언 크기를 실측으로 잡는다
     (`offsetWidth` = 스케일 애니 이전 값). */
  const dszMin = Math.min(...allR.map(r => r.dszMin).filter(v => v > 0));
  const inM = dszMin / 2 + 4;
  const legal = await page.evaluate(a => {
    const L = document.getElementById('fxl'); if (!L) return null;
    const cx = a.wide.left + a.wide.w - a.inM;                    /* 넓은 위상 상자의 우변 클램프 = 제품이 허락하는 끝 */
    const cy = a.wide.top + a.wide.h / 2;
    const nd = document.createElement('s');
    nd.className = 'fx-spark';
    nd.style.cssText = 'position:fixed;margin:0;width:10px;height:10px;animation:none;left:0;top:0';
    L.appendChild(nd);
    const b0 = nd.getBoundingClientRect();                        /* 조상 transform 이 있어도 맞게 앉히려고 한 번 재고 보정한다 */
    nd.style.left = (cx - 5 - b0.left) + 'px';
    nd.style.top = (cy - 5 - b0.top) + 'px';
    const b = nd.getBoundingClientRect();
    const c = { cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2 };
    const outOf = bx => c.cx < bx.left || c.cx > bx.left + bx.w || c.cy < bx.top || c.cy > bx.top + bx.h;
    const r = { cx: c.cx, cy: c.cy, outBirth: outOf(a.wide) ? 1 : 0, outNow: outOf(a.narrow) ? 1 : 0,
                overNow: Math.max(a.narrow.left - c.cx, c.cx - (a.narrow.left + a.narrow.w)) };
    nd.remove();
    return r;
  }, { wide, narrow, inM });
  ok(legal && Math.abs(legal.cx - (wide.left + wide.w - inM)) < 1.5,
     '3a 알을 «넓은 위상 상자의 클램프»(제품이 허락하는 끝점)에 정확히 놓았다',
     legal ? 'x ' + p1(legal.cx) + ' ↔ 목표 ' + p1(wide.left + wide.w - inM)
       + ' (상자 ' + p1(wide.left) + '~' + p1(wide.left + wide.w) + ' · 가장 작은 알 ' + p1(dszMin)
       + 'px ⇒ 여유 inM ' + p2(inM) + ')' : '없음');
  ok(legal && legal.outBirth === 0,
     '3b **태생 상자 자**: 안이다 — 제품은 규약을 안 어겼다',
     legal ? legal.outBirth + '개' : '?');
  ok(legal && legal.outNow === 1,
     '3c **지금(눌린) 상자 자**: 밖이다 — 같은 알, 같은 순간, 다른 답 ⇒ 옛 자가 «없는 결함» 을 만든다',
     legal ? legal.outNow + '개 · ' + p2(legal.overNow) + 'px 밖 (눌린 상자 우변 '
       + p1(narrow.left + narrow.w) + ')' : '?');

  console.log('\n[2] 판정 — 갈래 ⓐ(제품 수리) 인가 ⓑ(자 수리) 인가');
  const all = allR;
  ok(all.length > 0 && all.every(r => r.frames > 0 && r.eggs > 0),
     '2a 모든 판에서 알이 실제로 태어났다(0 이면 아래는 헛초록이다)',
     all.map(r => r.frames + '표본/' + p1(r.eggs) + '알').join(' · '));
  ok(all.length > 0 && all.every(r => r.tagged === r.seen),
     '2b 살아 있는 알은 **전부** 태생 상자를 들고 있다 — 두 자가 같은 무리를 잰다',
     all.reduce((a, r) => a + r.tagged, 0) + '/' + all.reduce((a, r) => a + r.seen, 0) + '알');
  ok(all.every(r => r.outB === 0),
     '2c **제품은 자기가 가둔 상자를 한 번도 안 어겼다** — 태생 상자로 재면 밖 0개(전 판)',
     '최대 ' + Math.max(0, ...all.map(r => r.outB)) + '개');
  /* ⚠ **이 판들에서 자연히 빨개진 판은 0 이다 — 기록으로만 적는다.** 871 등재문이 «지금은 초록이다» 라고
     적은 그대로이고, 없는 관측을 있다고 세우지 않는다(LESSONS 239-①). 대신 «얼마나 붙어 있는가» 를
     px 로 남기고, 자가 틀렸다는 판정은 아래 2e(산수)와 위 [3](결정적 재현)이 진다. */
  console.log('  기록 자연 발화 — 다른 위상 상자로 빨개진 판 ' + all.filter(r => r.outAny > 0).length + '/' + all.length
    + ' · «지금 상자» 로 빨개진 판 ' + all.filter(r => r.outN > 0).length + '/' + all.length
    + ' · 문턱까지 남은 거리 최대 ' + p2(Math.max(...all.map(r => r.over))) + 'px'
    + '  ⇒ 옛 자는 «옳아서» 가 아니라 **' + p2(-Math.max(...all.map(r => r.over))) + 'px 차이로** 초록이다');
  const swing = Math.max(0, ...all.map(r => r.swBirth.w[1] - r.swBirth.w[0]));
  const marg = Math.min(...all.map(r => r.margin));
  ok(swing / 2 > marg,
     '2e 기계 — 621 눌림의 **변당 변위**가 가둠 여유(`sz/2 + FXB_INPAD`)보다 크다 ⇒ 제비가 존재한다',
     '변당 ' + p2(swing / 2) + 'px(폭 진폭 ' + p2(swing) + ') ↔ 여유 최소 ' + p2(marg) + 'px');
  ok(errs.length === 0, '2f 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  console.log('\n⇒ 갈래 ' + (legal && legal.outNow === 1 && all.every(r => r.outB === 0) ? 'ⓑ(자 수리)' : 'ⓐ(제품 수리) 의심')
    + ' — 판정 자를 «태생 상자» 로 옮기고 «지금 상자» 값은 기록으로만 남긴다(870 처방).');
  await browser.close();
  console.log('\nPROBE871 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
