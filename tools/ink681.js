#!/usr/bin/env node
/* 작업 681 — **잉크 자**(6회차 신설). 5회차 비평 2인(CN·CO)이 같은 것을 적었다:
 *
 *   «자(`envelope681`)가 내는 이웃 델타가 화면에서는 그 절반으로 렌더된다 —
 *    자를 잉크 기준으로 옮기기 전에는 어떤 재배분도 표 위에서만 일어난다.»
 *
 *   node tools/ink681.js            두 씬 · 캡처 격자(cap681 의 STOPS)에서 **그려진 잉크**를 잰다
 *   node tools/ink681.js --stops 0,20,45,70,110,175,250,320
 *
 * ⚑ 무엇이 다른가 — `envelope681` 은 `getBoundingClientRect()`(**상자**)와
 *   `getComputedStyle().opacity`(**선언된 알파**)를 읽는다. 비평가는 PNG 의 **알파 마스크**를 읽는다.
 *   둘이 갈리는 이유는 셋이고 전부 «상자» 가 모르는 것이다:
 *     ⓐ 상자는 안티에일리어싱 가장자리를 세지 않는다 — α 가 낮아지면 잉크는 **상자보다 빨리** 준다.
 *     ⓑ 상자는 잉크가 상자를 다 채우는지 모른다(글리프는 상자의 60~80%만 쓴다).
 *     ⓒ 상자는 배경 대비를 모른다 — 차분 마스크는 «배경과 다른 화소» 만 잉크로 센다.
 *   ⇒ 이 자는 `probe820`·`verify753` [B] 가 쓰는 **차분 마스크**를 그대로 빌려 온다
 *     (`#fxl` 을 끈 사본과 켠 사본의 화소 차 > 24 → 잉크).
 *
 * ⚑ 겹침을 피하려고 **알 한 개를 격리해서** 잰다 — 나머지 알은 `visibility:hidden` 으로 끈다.
 *   14알을 한 판에 재면 겹친 자리에서 bbox 가 이웃을 삼켜 «크기» 가 거짓이 된다.
 *   대표 알은 **제 최대 크기의 중앙값**인 알이다(가장 큰 알도 가장 작은 알도 아닌 것).
 *   겹침이 없는 «총 잉크 면적» 은 14알 전부 켠 채로 따로 잰다(존재감 축).
 *
 * ⚠ 시간은 «기다려서» 가 아니라 `currentTime` 을 **감아서** 맞춘다(58 36회차 · cap681 과 같은 규약).
 * ⚠ 클립은 **트리거 전** 호스트 상자에서 고정한다 — 621 눌림이 프레임마다 호스트를 키운다
 *   (5회차 비평 CN 이 잡은 하네스 함정 · LESSONS 681-⑥). 격리 알의 클립은 그 알이 **전 표본에서
 *   지나가는 자리의 합집합**이라 프레임마다 안 흔들린다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const SEED = 20260902;
const argStops = (process.argv.find(a => a.startsWith('--stops')) || '').split('=')[1]
  || (process.argv[process.argv.indexOf('--stops') + 1] || '');
const STOPS = /^[\d,\s]+$/.test(argStops) && argStops.trim()
  ? argStops.split(',').map(Number) : [0, 20, 45, 70, 110, 175, 250, 320];

const SCENES = [
  { id: 'train', n: '23 훈련 카드 [강화] (660 골드 아이콘 버스트)',
    open: 'openTrain()', host: '#trCards [data-tr]', btn: '#trCards [data-tr] .cb' },
  { id: 'relic', n: '89 유물 소환 버튼 (666 유물화폐 아이콘 버스트)',
    open: 'openRelw()', host: '#rwBasin', btn: '#rwBasin' },
];

/* 찍힌 픽셀을 페이지로 되돌려 **페이지 안에서** 차분한다(350 처방 · probe820·verify753 [B] 와 같은 자).
   ⚠ 화소판을 Node 로 실어 내면(`Array.from(getImageData)`) 한 장에 수백만 개가 직렬화돼
      표 하나 만드는 데 몇 분이 든다 — 차분은 캔버스가 있는 쪽에서 하고 **요약만** 돌려받는다.
   문턱 24 는 probe820·verify753 과 같은 값이다. */
const DIFF = (page, bufA, bufB) => page.evaluate(([ua, ub]) => new Promise(res => {
  const load = u => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u; });
  Promise.all([load(ua), load(ub)]).then(([A, B]) => {
    const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
    const g = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const a = g(A), b = g(B);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]) > 24) {
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    res(n < 6 ? { n, w: 0, h: 0 } : { n, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  });
}), ['data:image/png;base64,' + bufA.toString('base64'), 'data:image/png;base64,' + bufB.toString('base64')]);

const seedFn = (sd) => {
  let s = sd >>> 0;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

async function scene(sc) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() }; window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await p.waitForTimeout(900);
  await p.evaluate((src) => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
    if (S.temper) S.temper.pts = 1e6;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    (new Function(src))();
  }, sc.open);
  await p.waitForTimeout(700);
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});

  /* 트리거 → 얼리기 → 표본기 심기 */
  const geo = await p.evaluate(({ sd, btnSel, stops, seedSrc }) => {
    (new Function('sd', '(' + seedSrc + ')(sd)'))(sd);
    const el = document.querySelector(btnSel); if (!el) return null;
    window.__oldBye681 = window.fxBye; window.fxBye = () => {};
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    window.requestAnimationFrame = () => 0;
    try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
    window.setTimeout = () => 0; window.setInterval = () => 0;
    const L = document.getElementById('fxl');
    const eggs = [...L.querySelectorAll('.fx-spark')]
      .filter(n => /fxSpark/.test(getComputedStyle(n).animationName));
    if (!eggs.length) return null;
    const anims = []; document.getAnimations().forEach(a => { try { a.pause(); anims.push(a); } catch (e) {} });
    window.__set681 = (T) => { anims.forEach(a => { try { a.currentTime = T; } catch (e) {} }); };
    window.__eggs681 = eggs;
    const rects = stops.map(T => { window.__set681(T);
      return eggs.map(n => { const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height }; }); });
    return { n: eggs.length, rects };
  }, { sd: SEED, btnSel: sc.btn, stops: STOPS, seedSrc: seedFn.toString() });
  if (!geo) { await b.close(); return null; }

  /* 대표 알 = 제 최대 상자 폭의 **중앙값**인 알 (가장 크지도 작지도 않은 것) */
  const wMax = geo.rects[0].map((_, i) => Math.max(...geo.rects.map(r => r[i].w)));
  const order = wMax.map((w, i) => ({ w, i })).sort((a, c) => a.w - c.w);
  const solo = order[Math.floor(order.length / 2)].i;

  /* 격리 알의 클립 = 그 알이 전 표본에서 지나가는 자리의 합집합 + 여유(후광까지 담는다) */
  const M = 14;
  let X0 = 1e9, Y0 = 1e9, X1 = -1, Y1 = -1;
  geo.rects.forEach(r => { const q = r[solo];
    X0 = Math.min(X0, q.x); Y0 = Math.min(Y0, q.y); X1 = Math.max(X1, q.x + q.w); Y1 = Math.max(Y1, q.y + q.h); });
  const clip = { x: Math.max(0, Math.floor(X0 - M)), y: Math.max(0, Math.floor(Y0 - M)) };
  clip.width = Math.min(1080 - clip.x, Math.ceil(X1 + M) - clip.x);
  clip.height = Math.min(2280 - clip.y, Math.ceil(Y1 + M) - clip.y);

  /* 총 잉크 면적용 클립 = **트리거 전** 호스트 상자 + 160 (cap681 과 같은 고정 클립) */
  const hb = await p.evaluate(s => { const h = document.querySelector(s); if (!h) return null;
    const r = h.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sc.host);
  const MB = 200;
  const clipAll = hb ? { x: Math.max(0, Math.round(hb.x - MB)), y: Math.max(0, Math.round(hb.y - MB)) } : null;
  if (clipAll) { clipAll.width = Math.min(1080 - clipAll.x, Math.round(hb.w + 2 * MB));
                 clipAll.height = Math.min(2280 - clipAll.y, Math.round(hb.h + 2 * MB)); }

  /* ⚠ **`#fxl` 의 자식 전부**를 끈다 — 알만 끄면 같은 층의 다른 연출(토스트·플래시·+글자)이
     배경판과 표본에서 **다른 시각**으로 그려져 차분에 통째로 섞인다(6회차 1차 실행에서
     대표 알 하나의 «잉크» 가 83×75·6207화소로 나온 자리 — 그것은 알이 아니라 이웃 연출이었다).
     그리고 배경판은 **표본과 같은 `currentTime`** 에서 찍는다(끈 노드도 시각이 같아야 안 샌다). */
  const show = (mode) => p.evaluate(m => {
    const eg = window.__eggs681;
    [...document.getElementById('fxl').children].forEach(n => { n.style.visibility = 'hidden'; });
    if (m === 'all') eg.forEach(n => { n.style.visibility = ''; });
    else if (m !== 'none') { const t = eg[m]; if (t) t.style.visibility = ''; }
  }, mode);

  const rows = [];
  for (let k = 0; k < STOPS.length; k++) {
    const T = STOPS[k];
    await p.evaluate(t => window.__set681(t), T);
    await show('none');
    const bgSolo = await p.screenshot({ clip });
    const bgAll = clipAll ? await p.screenshot({ clip: clipAll }) : null;
    await show(solo);
    const s1 = await DIFF(p, await p.screenshot({ clip }), bgSolo);
    let tot = null;
    if (clipAll) { await show('all');
      tot = await DIFF(p, await p.screenshot({ clip: clipAll }), bgAll); }
    rows.push({ T, ink: s1, tot,
                box: geo.rects[k][solo].w, boxAll: geo.rects[k].reduce((a, r) => a + r.w, 0) / geo.n });
  }
  await b.close();
  return { sc, n: geo.n, solo, rows };
}

const pct = (a, b) => (b === 0 ? 0 : (b - a) / a * 100);
const f1 = v => (v >= 0 ? '+' : '') + v.toFixed(1);

(async () => {
  console.log('# 681 잉크 자 — 그려진 알파 마스크로 잰 봉투 (격자 ' + STOPS.join('·') + 'ms · 시드 ' + SEED + ')\n');
  const all = [];
  for (const sc of SCENES) {
    const r = await scene(sc);
    if (!r) { console.log('씬 ' + sc.id + ' — 알이 안 태어났다(건너뜀)'); continue; }
    all.push(r);
    const inkMax = Math.max(...r.rows.map(x => Math.max(x.ink.w, x.ink.h)));
    const boxMax = Math.max(...r.rows.map(x => x.box));
    console.log('\n## 씬 ' + sc.id + ' — ' + sc.n + '  (알 ' + r.n + ' · 대표 알 #' + (r.solo + 1) + ')\n');
    console.log('| # | t(ms) | 잉크 w×h | 잉크 지름(제 최대 %) | 상자 폭(제 최대 %) | 잉크 화소 | 총 잉크 화소(14알) |');
    console.log('|---|---|---|---|---|---|---|');
    r.rows.forEach((x, i) => {
      const d = Math.max(x.ink.w, x.ink.h);
      console.log('| ' + (i + 1) + ' | ' + x.T + ' | ' + x.ink.w + '×' + x.ink.h
        + ' | ' + (d / inkMax * 100).toFixed(1) + '% | ' + (x.box / boxMax * 100).toFixed(1) + '%'
        + ' | ' + x.ink.n + ' | ' + (x.tot ? x.tot.n : '—') + ' |');
    });
    /* 이 자의 본체 — **이웃 표본 델타**. 비평가가 «구분 가능한가» 로 읽는 그 수다. */
    console.log('\n**이웃 델타(잉크 지름 · 상자 폭 · 총 잉크 면적)** — 지각 임계는 7~8%(28~30px 스프라이트)\n');
    console.log('| 구간 | 잉크 지름 Δ | 상자 폭 Δ | 총 잉크 면적 Δ |');
    console.log('|---|---|---|---|');
    for (let i = 1; i < r.rows.length; i++) {
      const a = r.rows[i - 1], c = r.rows[i];
      const da = Math.max(a.ink.w, a.ink.h), dc = Math.max(c.ink.w, c.ink.h);
      console.log('| ' + a.T + '→' + c.T + 'ms | ' + f1(pct(da, dc)) + '% | ' + f1(pct(a.box, c.box)) + '%'
        + ' | ' + (a.tot && c.tot ? f1(pct(a.tot.n, c.tot.n)) + '%' : '—') + ' |');
    }
    const worst = [];
    for (let i = 1; i < r.rows.length; i++) {
      const a = r.rows[i - 1], c = r.rows[i];
      const da = Math.max(a.ink.w, a.ink.h), dc = Math.max(c.ink.w, c.ink.h);
      if (Math.abs(pct(da, dc)) < 6) worst.push(a.T + '→' + c.T + 'ms ' + f1(pct(da, dc)) + '%');
    }
    console.log('\n· 잉크 지름 델타가 6% 미만인 이웃 쌍: ' + (worst.length ? worst.join(' · ') : '**없음**'));
  }
  console.log('\n(자는 상자가 아니라 잉크를 잰다 — 재배분은 이 표 위에서 한다. LESSONS 681-⑥)');
})();
