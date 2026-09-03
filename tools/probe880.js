#!/usr/bin/env node
/* 작업 880 — **89 유물 소환 버스트가 배수 토글 바(`#rwMulBar`)를 밟는가**를 찍힌 기하로 재현한다.
 *
 *   node tools/probe880.js            수리 «전» 이면 [P1] 이 빨갛다(= 재현 성공)
 *   node tools/probe880.js --json     기계용
 *
 * 왜 재현부터인가(338 규칙): 등재문의 수치는 838 9회차가 **다른 자**(`scratch/relicocc`)로 낸 값이고
 * 그 자는 저장소에 남지 않았다. 등재문의 처방을 바로 넣으면 «이미 참인 것을 게이트로 굳히는» 338 의
 * 그 사고를 되풀이한다 — 그래서 먼저 **이 저장소 안의 자**로 현상을 빨갛게 세운다.
 *
 * 자(尺) — `cap681.js` 의 씬 B 와 **같은 경로·같은 시드·같은 시각표**를 쓴다(사본을 새로 안 만든다):
 *   씬을 열고 → 실제 사용자 경로(`#rwBasin` pointerdown/up)로 한 발 터뜨리고 →
 *   애니를 `currentTime = T` 로 감고 → 얼린 뒤 **찍힌 상자**를 잰다.
 * 재는 것 둘:
 *   ⓐ **덮임 %** — 배수 칸(`#rwMulBar > [data-mul]`) 넷 각각에 대해, 보이는 버스트 알
 *      (`#fxl > *` · α>0.06 · 최소변 ≥6px — cap681 규약 그대로)의 상자 합집합이 칸 상자를 덮는 넓이 비율.
 *      ⚠ 알 하나씩의 합이 아니라 **합집합**이다(두 알이 겹치면 두 번 세지 않는다).
 *   ⓑ **간격 px** — 칸 상자와 가장 가까운 알 상자의 사이 거리(겹치면 0).
 * 판정: **어느 프레임의 어느 칸이든 덮임 ≥ 1% 이면 [P1] 빨강**(등재문의 문턱 그대로).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const { STOPS, SEED } = require('./cap681');   /* 시각표·시드는 838 9회차가 쓴 그것 그대로 */
const JSON_OUT = process.argv.includes('--json');
const THRESH = 1.0;                             /* % — 등재문의 «덮임 ≥1% 인 칸이 있다» */

/* 한 프레임(T ms)의 기하를 잰다 */
async function frame(T) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
  });
  await p.waitForTimeout(700);
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});

  const out = await p.evaluate(({ T, sd }) => {
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const el = document.getElementById('rwBasin');
    if (!el) return null;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    window.requestAnimationFrame = () => 0;
    try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
    window.setTimeout = () => 0; window.setInterval = () => 0;
    /* ⚑ 814 9·10회차 교훈 — **`getAnimations()` 한 번으로는 갓 등록된 노드의 애니가 안 잡힌다.**
       스타일 플러시를 한 번 강제하고 **두 번 감는다**. 안 하면 그 알만 시간이 안 감긴 채 재어져
       프레임마다 값이 흔들린다(873 «자가 흔들린다» 의 이 화면판 — 첫 판이 250ms 에서 ±0.7%p 였다). */
    for (let w = 0; w < 2; w++) {
      void document.body.offsetHeight;
      try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; } catch (e) {} }); } catch (e) {}
    }

    /* 보이는 알 — cap681 의 규약 그대로(α>0.06 · 최소변 ≥6px) */
    const fop = n => { const m = /opacity\(([\d.]+)\)/.exec(getComputedStyle(n).filter || '');
      return m ? parseFloat(m[1]) : 1; };
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity * fop(n) > 0.06 && Math.min(bb.width, bb.height) >= 6; };
    const eggs = [...document.querySelectorAll('#fxl > *')].filter(vis)
      .map(n => { const b = n.getBoundingClientRect();
        return { x: b.left, y: b.top, w: b.width, h: b.height, c: (n.className || '') + '' }; })
      .filter(b => b.w > 0 && b.h > 0);

    /* 칸 상자 넷 */
    const cells = [...document.querySelectorAll('#rwMulBar > [data-mul]')].map(c => {
      const b = c.getBoundingClientRect();
      return { mul: c.dataset.mul, x: b.left, y: b.top, w: b.width, h: b.height };
    });

    /* ⓐ 합집합 넓이 — 알 상자를 x 로 쪼개 세로 구간 합집합을 더한다(겹침을 두 번 안 센다) */
    const coverPct = (cell) => {
      const parts = eggs.map(e => ({
        x0: Math.max(cell.x, e.x), x1: Math.min(cell.x + cell.w, e.x + e.w),
        y0: Math.max(cell.y, e.y), y1: Math.min(cell.y + cell.h, e.y + e.h) }))
        .filter(r => r.x1 > r.x0 && r.y1 > r.y0);
      if (!parts.length) return 0;
      const xs = [...new Set(parts.flatMap(r => [r.x0, r.x1]))].sort((a, b) => a - b);
      let area = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], w = b - a;
        if (w <= 0) continue;
        const iv = parts.filter(r => r.x0 <= a && r.x1 >= b).map(r => [r.y0, r.y1]).sort((p, q) => p[0] - q[0]);
        let cy = -Infinity, h = 0;
        for (const [y0, y1] of iv) { const s0 = Math.max(y0, cy); if (y1 > s0) { h += y1 - s0; cy = y1; } }
        area += w * h;
      }
      return Math.round(area / (cell.w * cell.h) * 10000) / 100;
    };
    /* ⓑ 간격 — 칸 상자와 알 상자 사이 거리(겹치면 0) */
    const gap = (cell) => {
      let best = Infinity;
      for (const e of eggs) {
        const dx = Math.max(cell.x - (e.x + e.w), e.x - (cell.x + cell.w), 0);
        const dy = Math.max(cell.y - (e.y + e.h), e.y - (cell.y + cell.h), 0);
        best = Math.min(best, Math.hypot(dx, dy));
      }
      return Number.isFinite(best) ? Math.round(best * 10) / 10 : null;
    };
    return {
      eggs: eggs.length,
      bar: (() => { const b = document.getElementById('rwMulBar').getBoundingClientRect();
        return { x: Math.round(b.left * 10) / 10, y: Math.round(b.top * 10) / 10,
                 w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; })(),
      cells: cells.map(c => ({ mul: c.mul, x: Math.round(c.x * 10) / 10, w: Math.round(c.w * 10) / 10,
                               cov: coverPct(c), gap: gap(c),
        /* 어떤 층의 알이 덮는가 — 「지불 버스트(fx-cic)」인지 「획득 알(fx-rlic)」인지 갈라 적는다.
           «무엇을 고칠 것인가» 가 여기서 갈린다(338 규칙 — 고치기 전에 갈래를 먼저 가른다). */
        by: [...new Set(eggs.filter(e => e.x < c.x + c.w && e.x + e.w > c.x
                                      && e.y < c.y + c.h && e.y + e.h > c.y)
          .map(e => /fx-rlic/.test(e.c) ? '유물알' : /fx-cic/.test(e.c) ? '아이콘' : /fx-flash/.test(e.c) ? '플래시' : '기타'))] }))
    };
  }, { T, sd: SEED });
  await b.close();
  return { T, out, errs };
}

(async () => {
  const rows = [];
  for (const T of STOPS) rows.push(await frame(T));

  let worst = { cov: -1 }, minGap = Infinity;
  for (const r of rows) for (const c of (r.out ? r.out.cells : [])) {
    if (c.cov > worst.cov) worst = { cov: c.cov, mul: c.mul, T: r.T };
    if (c.gap != null) minGap = Math.min(minGap, c.gap);
  }
  const hit = rows.some(r => r.out && r.out.cells.some(c => c.cov >= THRESH));

  if (JSON_OUT) { console.log(JSON.stringify({ rows, worst, minGap, hit }, null, 1)); return; }

  console.log('# probe880 — 89 유물 소환 버스트 ↔ 배수 토글 바 (시드 ' + SEED + ' · 단발 · 트리거 = 0ms)\n');
  const b0 = rows[0].out && rows[0].out.bar;
  if (b0) console.log('바 `#rwMulBar` = x ' + b0.x + ' · y ' + b0.y + ' · ' + b0.w + '×' + b0.h + '\n');
  console.log('| t(ms) | 보이는 알 | ×1 덮임/간격 | ×10 | ×100 | ×1,000 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    const c = r.out ? r.out.cells : [];
    const f = i => c[i] ? (c[i].cov + '% / ' + c[i].gap + 'px' + (c[i].by.length ? ' ' + c[i].by.join(',') : '')) : '—';
    console.log('| ' + r.T + ' | ' + (r.out ? r.out.eggs : '—') + ' | ' + f(0) + ' | ' + f(1) + ' | ' + f(2) + ' | ' + f(3) + ' |');
  }
  console.log('\n최악 덮임 **' + worst.cov + '%**(×' + worst.mul + ' · ' + worst.T + 'ms) · 최소 간격 **' + minGap + 'px**');
  console.log('\n[P1] 어느 프레임·어느 칸도 덮임 < ' + THRESH + '% : ' + (hit ? 'FAIL(재현됨 — 바를 밟는다)' : 'PASS'));
  const eg = rows.reduce((a, r) => a + (r.out ? r.out.eggs : 0), 0);
  console.log('[P2] 표본이 비지 않았다(알 합계 > 0) : ' + (eg > 0 ? 'PASS(' + eg + ')' : 'FAIL'));
  const ce = rows.every(r => r.out && r.out.cells.length === 4);
  console.log('[P3] 배수 칸이 네 개다 : ' + (ce ? 'PASS' : 'FAIL'));
  const er = rows.reduce((a, r) => a + r.errs.length, 0);
  console.log('[P4] 콘솔 에러 0건 : ' + (er === 0 ? 'PASS' : 'FAIL(' + er + ')'));
  console.log('\nPROBE880 ' + ((!hit && eg > 0 && ce && er === 0) ? 'PASS' : 'FAIL'));
})();
