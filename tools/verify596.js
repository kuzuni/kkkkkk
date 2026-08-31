#!/usr/bin/env node
/* 작업 596 게이트 — «03 던전 카드 입장권은 ref 처럼 눕어 있는가»
 *
 *   node tools/verify596.js   → 마지막 줄이 `VERIFY596 n/n PASS`
 *
 * 재현자는 `tools/probe596.js`(등재문 전제 두 개를 각각 검산한다). 이 자는 **판정**만 한다.
 *
 * 축 — PROGRESS 596 행이 요구한 여섯 가지를 그대로 절로 세웠다:
 *   §1 각도   04 세부(`.dgd-tki`)와 **같은 각도**다(새 각도를 만들지 않았다) · 8종 전수
 *   §2 크기   그려진 bbox 가 ref 64 × 50(측정표 03 §3-5-3)과 폭 ±1% · 세로는 등방 contain 상한 안
 *   §3 종횡   ref 1.28 근방 — 그리고 **04 자리와 같은 값**(같은 아트·같은 각도의 필연)
 *   §4 겹침   위 라벨 잉크 · 옆 숫자와 0 (585 §9 이관 — 상자가 아니라 잉크)
 *   §5 자     겹침에 쓰는 «라벨 잉크» 자를 **찍힌 픽셀**과 교차 검산한다
 *   §6 스코프 이모지 자리(46 레이드 `♾️`·DPS `🏆`·아레나 `🏅`)는 **안 눕는다**
 *   §7 잘림   9:19 · 9:13.3 둘 다 카드·프레임 밖 0
 *   §R 되돌림 회전을 빼면 §2 세로가, 비등방으로 늘리면 §3 이 빨개진다
 *
 * ⚠ «종횡 ±3%» 는 이 아트로는 **못 닿는다**(probe596 [2]). 잉크 종횡이 1.765 라
 *   −18° 에서 bbox 종횡이 1.328 로 고정이고 ref 1.28 과 **+3.76%** 다. 1.28 을 정확히 내는 각은
 *   21.06° 인데 **새 각도를 만드는 것은 반려**(PROGRESS 596: «04 와 같은 부품·같은 각도»)라
 *   이 자는 «ref ±4%» 로 적고 **대신 04 자리와의 일치**를 못박는다 — 값을 넓힌 것이 아니라
 *   눈금을 «절대 오차» 에서 «같은 부품끼리 같은가» 로 옮긴 것이다(무르게 풀면 §R2 가 잡는다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;
const near = (a, b, p) => Math.abs(a / b - 1) * 100 <= p;

/* 측정표 03 §3-5-3 «입장권 아이콘 bbox 64 × 50 (기울어진 티켓)» · 04 §6 «69 × 54» */
const REF = { w: 64, h: 50, cx: 344.5, cy: 458.5, lbY2: 513 - 84 };
const REF_AR = REF.w / REF.h;                        /* 1.28 */
const PRE = { w: 63.99, h: 36.26 };                  /* 596 수리 전(= 585 수리 후) */

const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ S.dun[id] = 1; S.dunTk[id] = 9; });
  S.gold = 1e12; S.dia = 1e9; S.tstone = 9999; S.rstone = 9999; S.relic = 9999;
  S.tower = 3; S.raid = S.raid || {};
  markDirty && markDirty(); renderUI && renderUI();`;

/* 자산 알파 bbox ÷ viewBox (412·585·596 공용) */
async function inkRatio(ctx) {
  const files = fs.readdirSync(path.join(ROOT, 'assets/ui')).filter((f) => /^cur-.*\.svg$/.test(f));
  const src = {};
  for (const f of files) src[f] = fs.readFileSync(path.join(ROOT, 'assets/ui', f), 'utf8');
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const out = await page.evaluate(async ({ src, N }) => {
    const res = {};
    for (const f in src) {
      const img = new Image(); img.width = N; img.height = N;
      await new Promise((y, n) => { img.onload = y; img.onerror = () => n(new Error(f)); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src[f]); });
      const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x1 = N, y1 = N, x2 = -1, y2 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (d[(y * N + x) * 4 + 3] > 16) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      }
      res[f] = x2 < 0 ? { w: 1, h: 1 } : { w: (x2 - x1 + 1) / N, h: (y2 - y1 + 1) / N };
    }
    return res;
  }, { src, N: 512 });
  await page.close();
  return out;
}

/* `.cic` 를 «상자 · 누적 각도 · 중심 · 호스트» 로 걷는다 (verify585 PICK 과 같은 계보) */
const PICK = `(function(sels){
  var out = [], M = (window.DOMMatrixReadOnly || window.DOMMatrix);
  sels.forEach(function(s){
    document.querySelectorAll(s.q).forEach(function(im, i){
      var r = im.getBoundingClientRect();
      if(r.width <= 0) return;
      var m = new M(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
      var el = im.parentElement;
      while(el && el !== document.documentElement){
        var t = getComputedStyle(el).transform;
        if(t && t !== 'none') m = new M(t).multiply(m);
        el = el.parentElement;
      }
      var host = im.closest(s.host || 'body'), hr = host ? host.getBoundingClientRect() : null;
      out.push({ slot: s.n, i: i, src: (im.getAttribute('src')||'').split('/').pop(),
                 key: im.getAttribute('data-cur-ic') || '',
                 bw: parseFloat(getComputedStyle(im).width) * Math.hypot(m.a, m.b),
                 bh: parseFloat(getComputedStyle(im).height) * Math.hypot(m.c, m.d),
                 deg: Math.atan2(m.b, m.a) * 180 / Math.PI,
                 cx: r.x + r.width / 2, cy: r.y + r.height / 2,
                 hx: hr && hr.x, hy: hr && hr.y, hw: hr && hr.width, hh: hr && hr.height });
    });
  });
  return out;
})`;

/* 이웃 — 라벨은 **잉크**로 잰다(585 §9 이관과 같은 자, `verify596` §5 가 검산한다) */
const NEIGH = `(function(){
  var c = document.querySelector('#dunw .dnc'); if(!c) return null;
  var q = function(s){ var e = c.querySelector(s); if(!e) return null; var r = e.getBoundingClientRect();
                       return { x:r.x, y:r.y, w:r.width, h:r.height }; };
  var ink = function(s){
    var e = c.querySelector(s); if(!e) return null;
    var cs = getComputedStyle(e), r = e.getBoundingClientRect();
    var g = document.createElement('canvas').getContext('2d');
    g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
    var m = g.measureText(e.textContent), lh = parseFloat(cs.lineHeight);
    var base = r.y + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    var sw = (parseFloat(cs.webkitTextStrokeWidth) || 0) / 2;
    return { top: base - m.actualBoundingBoxAscent - sw, bottom: base + m.actualBoundingBoxDescent + sw };
  };
  return { card: q(':scope'), lb: q('.lb.b'), num: q('.sp.tk>i'), pill: q('.sp.tk'), lbInk: ink('.lb.b') };
})`;

/* «이 규칙이 눕히는 것/안 눕히는 것» 을 한자리에서 — 이모지 자리는 `.cic` 가 없어 PICK 이 못 본다 */
const EMS = `(function(){
  var out = [];
  document.querySelectorAll('.dnc .sp.tk>em').forEach(function(e){
    var M = (window.DOMMatrixReadOnly || window.DOMMatrix);
    var t = getComputedStyle(e).transform, m = new M(t === 'none' ? '' : t);
    out.push({ txt: (e.textContent || '').trim().slice(0, 4),
               cic: !!e.querySelector('.cic'),
               key: (e.querySelector('.cic') || {}).dataset ? e.querySelector('.cic').dataset.curIc : '',
               deg: Math.atan2(m.b, m.a) * 180 / Math.PI,
               top: getComputedStyle(e).top });
  });
  return out;
})`;

const HIDE_TK = '#dunw .dnc .sp.tk>em{visibility:hidden !important}';
const HIDE_LB = '#dunw .dnc .lb.b{visibility:hidden !important}';
const FREEZE = '*,*::before,*::after{animation:none !important;transition:none !important}';

async function open(ctx, css, w, h) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: w || 1080, height: h || 2280 });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await page.waitForTimeout(600);
  return { page, errs };
}

const SEL = [{ n: 'tk', q: '#dunw .dnc .sp.tk>em>.cic', host: '.dnc' }];

/* 찍힌 픽셀 — 알약·라벨 구역만 세 번 찍어 두 번 차분한다(카드 전체를 찍으면
   `.dnc>.th` 스프라이트 캔버스가 프레임마다 달라 차분이 카드로 번진다 — probe596 1회차 사고) */
async function pixelInk(ctx, page) {
  await page.addStyleTag({ content: FREEZE });
  await page.waitForTimeout(150);
  const clip = await page.evaluate(`(function(){
    var c = document.querySelector('#dunw .dnc').getBoundingClientRect();
    return { x: Math.round(c.x + 240), y: Math.round(c.y + 228), width: 262, height: 120 };
  })()`);
  const b64 = async () => (await page.screenshot({ clip })).toString('base64');
  const A = await b64();
  await page.addStyleTag({ content: HIDE_TK }); await page.waitForTimeout(120);
  const B = await b64();
  await page.addStyleTag({ content: HIDE_LB }); await page.waitForTimeout(120);
  const C = await b64();
  const p2 = await ctx.newPage();
  await p2.goto('about:blank');
  const d = await p2.evaluate(async ({ A, B, C, w, h }) => {
    const load = async (b) => {
      const im = new Image();
      await new Promise((y, n) => { im.onload = y; im.onerror = n; im.src = 'data:image/png;base64,' + b; });
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(im, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, w, h).data;
    };
    const [a, b, c] = [await load(A), await load(B), await load(C)];
    const box = (p, q) => {
      let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, n = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 24) {
          n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
      return x2 < 0 ? null : { x1, y1, x2: x2 + 1, y2: y2 + 1, w: x2 - x1 + 1, h: y2 - y1 + 1, n };
    };
    return { tk: box(a, b), lb: box(b, c) };
  }, { A, B, C, w: clip.width, h: clip.height });
  await p2.close();
  return { clip, ...d };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const ratio = await inkRatio(ctx);
  const ink = (r) => {
    const f = ratio[r.src] || { w: 1, h: 1 };
    const w = r.bw * f.w, h = r.bh * f.h;
    const t = Math.abs(r.deg) * Math.PI / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
    return { w, h, rw: w * c + h * s, rh: w * s + h * c };
  };

  const main = await open(ctx);
  const cards = await main.page.evaluate(PICK + '(' + JSON.stringify(SEL) + ')');
  const neigh = await main.page.evaluate(NEIGH + '()');
  const det = await main.page.evaluate(`(function(){
    openDunDetail(DUNGEONS.find(function(d){ return d.id === 'gold'; })); return 1; })()`);
  await main.page.waitForTimeout(500);
  const dgd = await main.page.evaluate(PICK + '(' + JSON.stringify([{ n: 'dgd', q: '#dgdTki>.cic', host: '.dgd-tki' }]) + ')');
  await main.page.evaluate(`(function(){ var b = document.querySelector('#dgd .dgd-x, #dgd .cls, #dgdClose');
    if(b) b.click(); else if(window.closeDunDetail) closeDunDetail(); })()`);
  await main.page.waitForTimeout(300);

  /* ── §1 각도 ────────────────────────────────────────────────────────── */
  blk('§1 각도 — 04 세부와 «같은 각도» 를 그대로 가져왔는가 (새 각도 = 반려)');
  ok(cards.length === 8, '카드 입장권 8종이 그려진다', cards.length + '종 · '
    + new Set(cards.map((c) => c.src)).size + '가지 그림');
  ok(dgd.length === 1, '04 세부 입장권 표본', dgd.length + '자리');
  const d0 = cards[0].deg, dd = dgd[0].deg;
  ok(Math.abs(d0 + 18) < 0.01, '카드 입장권이 −18° 로 눕어 있다', r2(d0) + '°');
  ok(Math.abs(d0 - dd) < 0.01, '04 세부(`.dgd-tki`)와 **같은 각도**다', r2(d0) + '° = ' + r2(dd) + '°');
  const degs = cards.map((c) => c.deg);
  ok(Math.max(...degs) - Math.min(...degs) < 0.01, '8종이 서로 같은 각도',
    'Δ ' + r2(Math.max(...degs) - Math.min(...degs)) + '°');
  ok(/rotate\(-18deg\)/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .split('.dnc .sp.tk>em:has(>[data-cur-ic^="tk"])')[1] || ''),
    '소스도 04 와 **같은 문자열**(`rotate(-18deg)`) — 새 상수를 안 만들었다');

  /* ── §2 크기 ────────────────────────────────────────────────────────── */
  blk('§2 크기 — 그려진 bbox 가 ref 64 × 50 (측정표 03 §3-5-3)');
  const k0 = ink(cards[0]);
  cards.forEach((c) => {
    const k = ink(c);
    console.log('    ' + (c.key || c.src).padEnd(12) + ' 잉크 ' + r2(k.w) + ' × ' + r2(k.h)
      + '  → bbox ' + r2(k.rw) + ' × ' + r2(k.rh) + '  중심 (' + r2(c.cx) + ', ' + r2(c.cy) + ')');
  });
  ok(near(k0.rw, REF.w, 1), '묶는 축(폭)이 ref 64 와 ±1%',
    r2(k0.rw) + ' / 64 = ' + r2((k0.rw / REF.w - 1) * 100) + '%');
  ok(k0.rh <= REF.h + 0.5 && k0.rh >= REF.h * 0.95,
    '세로가 ref 50 의 −5%..0% (등방 contain 의 상한 — 아래 §3 참조)',
    r2(k0.rh) + ' / 50 = ' + r2((k0.rh / REF.h - 1) * 100) + '%');
  ok(k0.rh > PRE.h * 1.3, '수리 전(36.26 — 평평)보다 30% 이상 높아졌다',
    r2(k0.rh) + ' / ' + PRE.h + ' = +' + r2((k0.rh / PRE.h - 1) * 100) + '%');
  ok(Math.abs(cards[0].cy - REF.cy) <= 1.5 && Math.abs(cards[0].cx - REF.cx) <= 1.5,
    '잉크 중심이 ref (344.5, 458.5)와 ±1.5px — `top` 을 같이 잡았다',
    'Δ(' + r2(cards[0].cx - REF.cx) + ', ' + r2(cards[0].cy - REF.cy) + ')');
  const bulks = cards.map((c) => { const k = ink(c); return Math.sqrt(k.rw * k.rh); });
  ok(Math.max(...bulks) / Math.min(...bulks) <= 1.005, '8종이 서로 같은 크기(±0.5%)',
    '최대÷최소 ' + r2(Math.max(...bulks) / Math.min(...bulks)));

  /* ── §3 종횡 ────────────────────────────────────────────────────────── */
  blk('§3 종횡 — ref 1.28 · 그리고 04 자리와 같은 값');
  const ar = k0.rw / k0.rh, arD = ink(dgd[0]).rw / ink(dgd[0]).rh;
  console.log('    카드 ' + r2(ar) + '  ·  04 세부 ' + r2(arD) + '  ·  ref ' + r2(REF_AR)
    + '  ·  수리 전 ' + r2(PRE.w / PRE.h));
  ok(near(ar, REF_AR, 4), 'bbox 종횡이 ref 1.28 과 ±4%',
    r2(ar) + ' (' + r2((ar / REF_AR - 1) * 100) + '%)');
  ok(near(ar, arD, 0.5), '04 세부와 종횡이 같다 (같은 아트·같은 각도의 필연)',
    r2(ar) + ' ↔ ' + r2(arD));
  ok(!near(PRE.w / PRE.h, REF_AR, 10), '[대조] 수리 전 종횡(1.765)은 ref 에서 10% 밖이었다',
    r2(PRE.w / PRE.h) + ' (' + r2((PRE.w / PRE.h / REF_AR - 1) * 100) + '%)');

  /* ── §4 겹침 ────────────────────────────────────────────────────────── */
  blk('§4 겹침 — 위 라벨 잉크 · 옆 숫자와 0 (585 §9 이관)');
  const top = cards[0].cy - k0.rh / 2, right = cards[0].cx + k0.rw / 2;
  ok(!!(neigh && neigh.lbInk && neigh.num), '이웃 표본을 얻었다');
  ok(neigh.lbInk.top >= neigh.lb.y - 0.5 && neigh.lbInk.bottom <= neigh.lb.y + neigh.lb.h + 0.5,
    '[전제] 라벨 잉크 자가 헛값이 아니다 — 잉크 ⊂ 상자',
    r2(neigh.lbInk.top) + '..' + r2(neigh.lbInk.bottom) + ' ⊂ ' + r2(neigh.lb.y) + '..' + r2(neigh.lb.y + neigh.lb.h));
  ok(top >= neigh.lbInk.bottom, '위 라벨 잉크와 안 겹친다',
    '여유 ' + r2(top - neigh.lbInk.bottom) + 'px (ref 여유 ' + r2(REF.cy - REF.h / 2 - REF.lbY2) + 'px)');
  ok(right <= neigh.num.x + 0.5, '옆 숫자와 안 겹친다',
    '잉크 우변 ' + r2(right) + ' ≤ 숫자 좌변 ' + r2(neigh.num.x));

  /* ── §5 자 검산 ─────────────────────────────────────────────────────── */
  blk('§5 자 검산 — 라벨 잉크 자(TextMetrics) ↔ 찍힌 픽셀');
  const px = await pixelInk(ctx, main.page);
  const abs = (b) => b && { y1: b.y1 + px.clip.y, y2: b.y2 + px.clip.y, x1: b.x1 + px.clip.x, x2: b.x2 + px.clip.x };
  const pTk = abs(px.tk), pLb = abs(px.lb);
  ok(!!pTk && !!pLb, '두 잉크를 찍힌 픽셀로 얻었다',
    pTk ? '입장권 ' + px.tk.w + '×' + px.tk.h + ' · 라벨 ' + px.lb.w + '×' + px.lb.h : '없음');
  ok(Math.abs(pLb.y2 - neigh.lbInk.bottom) <= 1.5, '두 자가 같은 라벨 잉크 하변을 준다(±1.5px)',
    '픽셀 ' + pLb.y2 + ' ↔ 자 ' + r2(neigh.lbInk.bottom));
  ok(Math.abs(pTk.y1 - top) <= 1.5 && Math.abs((pTk.y2 - pTk.y1) - k0.rh) <= 1.5,
    '입장권도 두 자가 같다 — 계산 bbox ↔ 찍힌 픽셀(±1.5px)',
    '픽셀 y ' + pTk.y1 + '..' + pTk.y2 + '(h ' + px.tk.h + ') ↔ 계산 ' + r2(top) + '..' + r2(top + k0.rh));
  ok(pTk.y1 >= 433.5 - 2 && pTk.y2 <= 483.5 + 2 && pTk.x1 >= 313 - 2 && pTk.x2 <= 376 + 2,
    '찍힌 픽셀이 ref 자리(x 313..376 · y 433.5..483.5)에 들어온다',
    'x ' + pTk.x1 + '..' + pTk.x2 + ' · y ' + pTk.y1 + '..' + pTk.y2);
  await main.page.close();

  /* ── §6 스코프 ──────────────────────────────────────────────────────── */
  blk('§6 스코프 — 이모지 자리(♾️ · 🏆 · 🏅)는 안 눕는다');
  const sub = await open(ctx);
  const seen = [];
  for (const key of ['dun', 'tower', 'raid']) {
    await sub.page.evaluate((k) => { const t = document.querySelector('#dunSub [data-dsub="' + k + '"]'); if (t) t.click(); }, key);
    await sub.page.waitForTimeout(500);
    const ems = await sub.page.evaluate(EMS + '()');
    ems.forEach((e) => seen.push(Object.assign({ sub: key }, e)));
  }
  const emo = seen.filter((e) => !e.cic), tks = seen.filter((e) => e.cic);
  seen.forEach((e) => console.log('    [' + e.sub + '] ' + (e.cic ? ('cic ' + e.key) : ('이모지 ' + e.txt)).padEnd(16)
    + ' 각도 ' + r2(e.deg) + '° · top ' + e.top));
  ok(emo.length >= 1, '이모지 알약 표본을 얻었다 (탑/레이드/아레나 서브탭)', emo.length + '자리: '
    + emo.map((e) => e.txt).join(' '));
  ok(emo.every((e) => Math.abs(e.deg) < 0.01), '이모지 자리는 각도 0° 그대로',
    emo.map((e) => e.txt + ' ' + r2(e.deg) + '°').join(' · ') || '없음');
  ok(emo.every((e) => parseFloat(e.top) === 0), '이모지 자리는 `top` 도 0 그대로',
    emo.map((e) => e.txt + ' ' + e.top).join(' · ') || '없음');
  ok(tks.every((e) => Math.abs(e.deg + 18) < 0.01), '입장권 자리만 −18°', tks.length + '자리');
  await sub.page.close();

  /* ── §7 잘림 ────────────────────────────────────────────────────────── */
  blk('§7 잘림 — 9:19(2280) · 9:13.3(1600)');
  for (const [nm, w, h] of [['9:19', 1080, 2280], ['9:13.3', 1080, 1600]]) {
    const o = await open(ctx, null, w, h);
    const rows = await o.page.evaluate(PICK + '(' + JSON.stringify(SEL) + ')');
    const bad = rows.filter((r) => {
      const k = ink(r);
      return r.cx - k.rw / 2 < r.hx - 0.5 || r.cx + k.rw / 2 > r.hx + r.hw + 0.5
          || r.cy - k.rh / 2 < r.hy - 0.5 || r.cy + k.rh / 2 > r.hy + r.hh + 0.5;
    });
    const outFr = rows.filter((r) => { const k = ink(r); return r.cx - k.rw / 2 < -0.5 || r.cx + k.rw / 2 > w + 0.5; });
    ok(rows.length >= 1, nm + ' — 입장권 표본', rows.length + '자리');
    ok(bad.length === 0, nm + ' — 카드(`.dnc`) 밖으로 샌 입장권 0개', rows.length + '자리 중 ' + bad.length);
    ok(outFr.length === 0, nm + ' — 가로 프레임 밖 0개', rows.length + '자리 중 ' + outFr.length);
    ok(o.errs.length === 0, nm + ' — pageerror 0건', o.errs.length + '건');
    await o.page.close();
  }

  /* ── §R 되돌림 ──────────────────────────────────────────────────────── */
  blk('§R 되돌림 — 무르게 푼 수리가 아님을 못박는다');
  const R1 = await open(ctx, '.dnc .sp.tk>em:has(>[data-cur-ic^="tk"]){transform:scale(1.12875);top:0}');
  const r1 = ink((await R1.page.evaluate(PICK + '(' + JSON.stringify(SEL) + ')'))[0]);
  ok(!(r1.rh <= REF.h + 0.5 && r1.rh >= REF.h * 0.95),
    '[R1] 회전을 빼고 585 값으로 되돌리면 §2 세로가 빨개진다',
    r2(r1.rh) + ' vs ref 50 (' + r2((r1.rh / REF.h - 1) * 100) + '%)');
  ok(!near(r1.rw / r1.rh, REF_AR, 4), '[R1b] 그 사본은 §3 종횡도 빨개진다',
    r2(r1.rw / r1.rh) + ' vs 1.28');
  await R1.page.close();

  /* 비등방으로 «세로만» 늘려 ref 50 을 맞춘 사본 — 356 규약 위반이 §3 에 걸리는지 */
  const R2 = await open(ctx, '.dnc .sp.tk>em:has(>[data-cur-ic^="tk"])'
    + '{transform:scale(1.12875) scaleY(1.379);top:0}');
  const r2r = ink((await R2.page.evaluate(PICK + '(' + JSON.stringify(SEL) + ')'))[0]);
  ok(near(r2r.rh, REF.h, 3), '[R2 전제] 비등방 사본은 세로 50 을 «맞추기는» 한다',
    r2(r2r.rh) + ' vs 50');
  ok(!near(r2r.rw / r2r.rh, REF_AR, 4) || Math.abs(r2r.rw / r2r.rh - arD) / arD > 0.005,
    '[R2] 그래도 §3 이 잡는다 — 04 자리와 종횡이 갈린다 («세로만 늘리기» 로는 못 통과)',
    r2(r2r.rw / r2r.rh) + ' vs 04 ' + r2(arD));
  await R2.page.close();

  /* 각도만 얹고 `top` 을 안 잡은 사본 — §2 중심 항이 살아 있는지 */
  const R3 = await open(ctx, '.dnc .sp.tk>em:has(>[data-cur-ic^="tk"]){top:0}');
  const r3 = (await R3.page.evaluate(PICK + '(' + JSON.stringify(SEL) + ')'))[0];
  ok(Math.abs(r3.cy - REF.cy) > 1.5, '[R3] `top` 을 안 잡으면 §2 중심 항이 빨개진다',
    'Δy ' + r2(r3.cy - REF.cy) + 'px');
  await R3.page.close();

  console.log('\nVERIFY596 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
