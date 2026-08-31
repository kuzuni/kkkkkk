#!/usr/bin/env node
/* 작업 596 재현자 — «03 던전 카드 입장권 아이콘이 눕지 않았다»
 *
 *   node tools/probe596.js         → 마지막 줄이 `PROBE596 n/n PASS`
 *   node tools/probe596.js --json  → 표를 JSON 으로도 찍는다
 *
 * 585 가 «크기» 만 닫고 넘긴 갈래다(PROGRESS 596). 585 는 잉크를 ref 상자에 등방 contain 해
 * 폭을 Δ0 으로 맞췄지만 세로가 36.26(ref 50 · −27%)에 남았고, 그 자리에 «평평한 채로는
 * 배율이 무엇이든 못 맞춘다» 를 산수로 적어 두었다. 이 자는 그 산수를 **재현으로 확인**한다.
 *
 * ⚠ 338 규칙 — 처방 전에 잰다. 그리고 등재문의 두 전제를 **각각** 검산한다:
 *   ⓐ «18° 눕히면 bbox 종횡이 ref 1.28 과 맞는다»      → 실제 값은?
 *   ⓑ «눕히면 상변이 7px 올라가 위 라벨을 밟는다»       → 라벨의 **상자**가 아니라 **잉크**로 재면?
 *
 * ⚠ 재는 것은 상자가 아니라 잉크다(340·585). 두 가지 자로 잰다:
 *   [자1] 계산 — `.cic` 렌더 상자 × 자산 알파 bbox 비(= 잉크) · 누적 행렬의 각도로 회전 bbox.
 *         입장권 8장은 껍데기 path 가 픽셀 동일하고 그 잉크가 viewBox 정중앙이라
 *         **잉크 중심 = `.cic` 상자 중심**이다(assets/ui/cur-ticket-*.svg — 외곽 path
 *         `M4 17h56 … v10H4V37` + stroke 4 ⇒ x 2..62 · y 15..49, 두 축 다 중심 32).
 *   [자2] 찍힌 픽셀 — 카드1 을 세 번 캡처해(원본 / 입장권 숨김 / 입장권·라벨 숨김)
 *         두 번 차분한다. 350 교훈대로 캡처를 data URL 로 페이지에 되돌려 읽는다.
 *         겹침 판정은 **상자가 아니라 이 잉크**로만 한다.
 *
 * ⚠ 이 자는 채점하지 않는다 — «어때야 한다» 는 `verify596` 이 말한다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const JSON_OUT = process.argv.includes('--json');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;
const RAD = Math.PI / 180;

/* ref — 측정표 03 §3-5-3 · 04 §6 (기울어진 티켓의 bbox 다) */
const REF_TK = { w: 64, h: 50, cx: 344.5, cy: 458.5 };   /* 카드1 · 프레임 좌표(= ref y − 84) */
const REF_LB = { y1: 488 - 84, y2: 513 - 84 };            /* «남은 횟수» 잉크 (프레임) */

/* 던전 8종을 전부 열어 둔다 */
const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ S.dun[id] = 1; S.dunTk[id] = 9; });
  S.gold = 1e12; S.dia = 1e9; S.tstone = 9999; S.rstone = 9999; S.relic = 9999;
  markDirty && markDirty(); renderUI && renderUI();`;
const OPEN_DUN = "document.querySelector('#tabbar [data-t=\"adv\"]').click();";

/* 자산 알파 bbox ÷ viewBox — 잉크비 (412·585 방식) */
async function inkRatio(ctx) {
  const files = fs.readdirSync(path.join(ROOT, 'assets/ui')).filter((f) => /^cur-.*\.svg$/.test(f));
  const src = {};
  for (const f of files) src[f] = fs.readFileSync(path.join(ROOT, 'assets/ui', f), 'utf8');
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const out = await page.evaluate(async ({ src, N }) => {
    const res = {};
    for (const f in src) {
      const img = new Image();
      img.width = N; img.height = N;
      await new Promise((y, n) => { img.onload = y; img.onerror = () => n(new Error(f)); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src[f]); });
      const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x1 = N, y1 = N, x2 = -1, y2 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (d[(y * N + x) * 4 + 3] > 16) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      }
      res[f] = x2 < 0 ? null : { w: (x2 - x1 + 1) / N, h: (y2 - y1 + 1) / N, cx: (x1 + x2 + 1) / 2 / N, cy: (y1 + y2 + 1) / 2 / N };
    }
    return res;
  }, { src, N: 512 });
  await page.close();
  return out;
}

/* 한 셀렉터의 `.cic` 들을 «상자 · 누적 각도 · 상자 중심» 으로 걷어 온다 (probe585 PICK 확장) */
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
      var sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
      out.push({ slot: s.n, i: i, src: (im.getAttribute('src')||'').split('/').pop(),
                 bw: parseFloat(getComputedStyle(im).width) * sx,
                 bh: parseFloat(getComputedStyle(im).height) * sy,
                 deg: Math.atan2(m.b, m.a) * 180 / Math.PI,
                 cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
    });
  });
  return out;
})`;

/* 카드1 영역을 세 번 찍어 두 번 차분 — «찍힌 픽셀» 로 잉크 bbox 를 얻는다 */
const HIDE_TK = '#dunw .dnc .sp.tk>em{visibility:hidden !important}';
const HIDE_LB = '#dunw .dnc .lb.b{visibility:hidden !important}';

async function pixelInk(ctx) {
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(200);
  await page.evaluate(new Function(OPEN_DUN));
  await page.waitForTimeout(700);
  /* ⚠ 카드 전체를 찍으면 안 된다 — `.dnc>.th` 썸네일이 **스프라이트 캔버스**(rAF)라
     프레임마다 다르고, 차분이 카드 전체로 번진다(1회차에 실제로 그랬다: 두 차분이
     똑같이 946×334 = 카드 통째로 나왔다). 알약·라벨 구역만 찍고 애니메이션도 멈춘다. */
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none !important;transition:none !important}' });
  await page.waitForTimeout(150);
  const clip = await page.evaluate(`(function(){
    var c = document.querySelector('#dunw .dnc').getBoundingClientRect();
    return { x: Math.round(c.x + 240), y: Math.round(c.y + 228), width: 262, height: 120 };
  })()`);
  const b64 = async () => (await page.screenshot({ clip })).toString('base64');
  const A = await b64();
  await page.addStyleTag({ content: HIDE_TK });
  await page.waitForTimeout(120);
  const B = await b64();
  await page.addStyleTag({ content: HIDE_LB });
  await page.waitForTimeout(120);
  const C = await b64();
  await page.close();

  /* 350 교훈 — 캡처를 data URL 로 페이지에 되돌려 픽셀을 읽는다 */
  const p2 = await ctx.newPage();
  await p2.goto('about:blank');
  const diff = await p2.evaluate(async ({ A, B, C, w, h }) => {
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
        const d = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
        if (d > 24) { n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      }
      return x2 < 0 ? null : { x1, y1, x2: x2 + 1, y2: y2 + 1, w: x2 - x1 + 1, h: y2 - y1 + 1, n };
    };
    return { tk: box(a, b), lb: box(b, c) };
  }, { A, B, C, w: clip.width, h: clip.height });
  await p2.close();
  return { clip, ...diff };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const ratio = await inkRatio(ctx);

  /* ── 계산 자 ─────────────────────────────────────────────────────────── */
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(200);
  await page.evaluate(new Function(OPEN_DUN));
  await page.waitForTimeout(700);
  const sels = [
    { n: '03 카드 입장권', q: '#dunw .dnc .sp.tk>em>.cic' },
  ];
  const now = await page.evaluate(PICK + '(' + JSON.stringify(sels) + ')');
  /* transform 을 뗀 «자연» 상자 — 잉크 중심이 상자 중심에서 얼마나 벗어나 있는지(v) */
  await page.addStyleTag({ content: '#dunw .dnc .sp.tk>em{transform:none !important}' });
  await page.waitForTimeout(120);
  const raw = await page.evaluate(PICK + '(' + JSON.stringify(sels) + ')');
  const emBox = await page.evaluate(`(function(){
    var e = document.querySelector('#dunw .dnc .sp.tk>em'), c = document.querySelector('#dunw .dnc');
    var r = e.getBoundingClientRect(), rc = c.getBoundingClientRect();
    var lb = document.querySelector('#dunw .dnc .lb.b').getBoundingClientRect();
    var pill = document.querySelector('#dunw .dnc .sp.tk').getBoundingClientRect();
    var num = document.querySelector('#dunw .dnc .sp.tk>i').getBoundingClientRect();
    return { em:{x:r.x,y:r.y,w:r.width,h:r.height}, card:{x:rc.x,y:rc.y,w:rc.width,h:rc.height},
             lb:{x:lb.x,y:lb.y,w:lb.width,h:lb.height}, pill:{x:pill.x,y:pill.y,w:pill.width,h:pill.height},
             num:{x:num.x,y:num.y,w:num.width,h:num.height} };
  })()`);
  const dg = await page.evaluate(PICK + '(' + JSON.stringify([{ n: '04 세부 입장권', q: '#dgdTki>.cic' }]) + ')')
    .catch(() => []);
  await page.close();

  /* 04 세부는 팝업을 열어야 있다 — 따로 한 번 */
  const p3 = await ctx.newPage();
  await p3.goto(URL); await p3.waitForTimeout(1400);
  await p3.evaluate(new Function(SETUP)); await p3.waitForTimeout(200);
  await p3.evaluate(new Function(OPEN_DUN + " openDunDetail(DUNGEONS.find(function(d){ return d.id === 'gold'; }));"));
  await p3.waitForTimeout(700);
  const dg2 = await p3.evaluate(PICK + '(' + JSON.stringify([{ n: '04 세부 입장권', q: '#dgdTki>.cic' }]) + ')');
  await p3.close();

  const px = await pixelInk(ctx);
  await browser.close();

  const ink = (r) => {
    const f = ratio[r.src] || { w: 1, h: 1 };
    const w = r.bw * f.w, h = r.bh * f.h;
    const t = Math.abs(r.deg) * RAD, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
    return { w, h, rw: w * c + h * s, rh: w * s + h * c };
  };

  blk('[1] 지금 그려지는 것 — 03 카드 입장권 8종 (계산 자)');
  now.forEach((r) => {
    const k = ink(r);
    console.log('    #' + r.i + ' ' + r.src.padEnd(22) + ' 각도 ' + String(r2(r.deg)).padStart(6) + '°'
      + ' 잉크 ' + r2(k.w) + '×' + r2(k.h) + ' → bbox ' + r2(k.rw) + '×' + r2(k.rh)
      + ' 중심 (' + r2(r.cx) + ', ' + r2(r.cy) + ')');
  });
  ok(now.length === 8, '입장권 8종 표본', now.length + '종');
  const degs = now.map((r) => r.deg);
  ok(Math.max(...degs) - Math.min(...degs) < 0.01, '8종이 같은 각도', r2(degs[0]) + '°');

  blk('[2] 등재문 전제 ⓐ — «18° 눕히면 종횡이 ref 1.28 과 맞는다»');
  const n0 = ink(now[0]), r0 = ink(raw[0]);
  const S_now = now[0].bw / raw[0].bw;
  console.log('    자연 잉크(transform 뗌)      ' + r2(r0.w) + ' × ' + r2(r0.h) + '  (종횡 ' + r2(r0.w / r0.h) + ')');
  console.log('    지금 배율                    ' + r2(S_now) + '  ⇒ 그려진 잉크 ' + r2(n0.w) + ' × ' + r2(n0.h));
  const cos = Math.cos(18 * RAD), sin = Math.sin(18 * RAD);
  const bw18 = r0.w * cos + r0.h * sin, bh18 = r0.w * sin + r0.h * cos;
  const S18 = Math.min(REF_TK.w / bw18, REF_TK.h / bh18);
  console.log('    18° bbox(배율 1)             ' + r2(bw18) + ' × ' + r2(bh18) + '  (종횡 ' + r2(bw18 / bh18) + ')');
  console.log('    ref 종횡 ' + r2(REF_TK.w / REF_TK.h) + ' 대비                ' + r2((bw18 / bh18 / (REF_TK.w / REF_TK.h) - 1) * 100) + '%');
  console.log('    ⇒ 등방 contain 배율 S        min(' + r2(REF_TK.w / bw18) + ', ' + r2(REF_TK.h / bh18) + ') = ' + Math.round(S18 * 1e5) / 1e5);
  console.log('    ⇒ 그려질 bbox                ' + r2(bw18 * S18) + ' × ' + r2(bh18 * S18) + '   (ref ' + REF_TK.w + ' × ' + REF_TK.h + ')');
  ok(Math.abs(bw18 / bh18 - 1.28) / 1.28 < 0.06, '18° 종횡이 ref 1.28 근방(±6%)', r2(bw18 / bh18));
  ok(true, '⚠ 등재문 «±3%» 는 이 아트로는 못 닿는다', '실제 ' + r2((bw18 / bh18 / 1.28 - 1) * 100) + '% — 1.28 을 정확히 내는 각은 '
    + r2(Math.atan((r0.w / r0.h - 1.28) / (1.28 * (r0.w / r0.h) - 1)) / RAD) + '° (새 각도 = 반려)');

  blk('[3] 04 세부의 같은 부품 — 각도·종횡을 그대로 가져올 자리');
  dg2.concat(dg).forEach((r) => {
    const k = ink(r);
    console.log('    ' + r.slot + ' 각도 ' + r2(r.deg) + '° 잉크 ' + r2(k.w) + '×' + r2(k.h)
      + ' → bbox ' + r2(k.rw) + '×' + r2(k.rh) + ' (종횡 ' + r2(k.rw / k.rh) + ')');
  });
  ok(dg2.length === 1 && Math.abs(Math.abs(dg2[0].deg) - 18) < 0.01, '04 세부는 −18° 로 눕어 있다', r2(dg2[0].deg) + '°');

  blk('[4] 등재문 전제 ⓑ — «눕히면 위 라벨을 밟는다» (찍힌 픽셀)');
  const cy0 = px.clip.y;
  const abs = (b) => b && { y1: b.y1 + cy0, y2: b.y2 + cy0, x1: b.x1 + px.clip.x, x2: b.x2 + px.clip.x };
  const tk = abs(px.tk), lb = abs(px.lb);
  console.log('    카드1 상자        ' + JSON.stringify(px.clip));
  console.log('    입장권 잉크(차분) ' + (px.tk ? px.tk.w + '×' + px.tk.h + ' · 프레임 y ' + tk.y1 + '..' + tk.y2 + ' · x ' + tk.x1 + '..' + tk.x2 + ' · ' + px.tk.n + 'px' : '없음'));
  console.log('    라벨 잉크(차분)   ' + (px.lb ? px.lb.w + '×' + px.lb.h + ' · 프레임 y ' + lb.y1 + '..' + lb.y2 + ' · x ' + lb.x1 + '..' + lb.x2 + ' · ' + px.lb.n + 'px' : '없음'));
  console.log('    라벨 **상자**     y ' + r2(emBox.lb.y) + '..' + r2(emBox.lb.y + emBox.lb.h) + '   ← 등재문이 쓴 값');
  console.log('    ref 라벨 잉크     y ' + REF_LB.y1 + '..' + REF_LB.y2 + ' · ref 입장권 잉크 y '
    + r2(REF_TK.cy - REF_TK.h / 2) + '..' + r2(REF_TK.cy + REF_TK.h / 2) + '  ⇒ ref 여유 '
    + r2(REF_TK.cy - REF_TK.h / 2 - REF_LB.y2) + 'px');
  ok(!!px.tk && !!px.lb, '두 잉크를 찍힌 픽셀로 얻었다');
  if (px.tk && px.lb) {
    console.log('    지금 여유(잉크 기준) ' + r2(tk.y1 - lb.y2) + 'px   ·   상자 기준 ' + r2(tk.y1 - (emBox.lb.y + emBox.lb.h)) + 'px');
    const rise = (bh18 * S18 - ink(now[0]).rh) / 2;
    console.log('    18° 를 얹으면 상변이 ' + r2(rise) + 'px 올라간다 ⇒ 예상 잉크 여유 ' + r2(tk.y1 - rise - lb.y2) + 'px');
    ok(true, '⚠ 등재문은 라벨 **상자**로 쟀다 — 잉크로 재면 여유가 다르다',
      '상자 ' + r2(tk.y1 - (emBox.lb.y + emBox.lb.h)) + 'px ↔ 잉크 ' + r2(tk.y1 - lb.y2) + 'px');
  }

  blk('[5] ref 대비 — 지금 / 18° 를 얹은 뒤');
  const nowC = { x: now[0].cx, y: now[0].cy };
  console.log('    지금   bbox ' + r2(n0.rw) + '×' + r2(n0.rh) + '  중심 (' + r2(nowC.x) + ', ' + r2(nowC.y) + ')'
    + '  ref 대비 ' + r2((n0.rw / REF_TK.w - 1) * 100) + '% / ' + r2((n0.rh / REF_TK.h - 1) * 100) + '%'
    + ' · 중심 Δ(' + r2(nowC.x - REF_TK.cx) + ', ' + r2(nowC.y - REF_TK.cy) + ')');
  /* 잉크 중심은 상자 중심에서 v 만큼 떨어져 있다 — 회전하면 v 도 돈다 */
  const emC = { x: emBox.em.x + emBox.em.w / 2, y: emBox.em.y + emBox.em.h / 2 };
  const v = { x: (raw[0].cx - emC.x), y: (raw[0].cy - emC.y) };
  const rv = { x: v.x * cos + v.y * sin, y: -v.x * sin + v.y * cos };   /* rotate(-18deg) */
  console.log('    잉크 중심 오프셋 v(배율 1) = (' + r2(v.x) + ', ' + r2(v.y) + ')  → −18° 회전 후 (' + r2(rv.x) + ', ' + r2(rv.y) + ')');
  const after = { x: emC.x + rv.x * S18, y: emC.y + rv.y * S18 };
  console.log('    18°+S 를 얹으면 중심 (' + r2(after.x) + ', ' + r2(after.y) + ')  ref 대비 Δ('
    + r2(after.x - REF_TK.cx) + ', ' + r2(after.y - REF_TK.cy) + ')');
  console.log('    ⇒ ref 중심에 세우려면 `top` 을 ' + r2(REF_TK.cy - after.y) + 'px 옮겨야 한다');
  ok(true, 'ref 대비 표를 얻었다');

  if (JSON_OUT) console.log('\nJSON ' + JSON.stringify({ now, raw, dg2, px, emBox, S18, bw18, bh18 }));
  console.log('\nPROBE596 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
