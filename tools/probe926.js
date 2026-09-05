#!/usr/bin/env node
/* 작업 926 — «1600 에서 상인방 칠 하변 ↓ 아치 정점이 잔존 0.320» 재현기
 *
 *   node tools/probe926.js            # [1] 띠1 해부 · [2] 화소 자 · [3] 상인방 스윕
 *   node tools/probe926.js --profile  # [2] 의 휘도 프로파일 원자료까지
 *
 * ── 왜 이 자인가(338 규칙) ───────────────────────────────────────────────────
 * 등재문은 채점 2인(EW·EX)이 **각자 독립으로** 낸 두 수(1600 16px ↔ 긴 프레임 50px,
 * 잔존 0.320)를 근거로 세웠다. 처방을 쓰기 전에 그 두 수부터 이 저장소의 자로 되재고,
 * 879 9회차 §57 이 지목한 «뿌리»(띠1 안의 배분)가 실제로 그 모양인지 확인한다.
 *
 *   [1] 띠1 해부 — 띠1(패널 상단 ↓ 아치 정점)을 **20 금테 + 66 상인방 + clearance** 로 쪼개고
 *       각 조각의 잔존율(2280 대비)을 따로 낸다. §57 의 «clr 만 0.190» 이 여기서 닫힌다.
 *   [2] 화소 자 — 등재문의 16 ↔ 50 을 재현한다. 상인방 «칠» 하변은 상인방을 끈 사본과의
 *       차분으로 잡고(칠이 상자보다 짧다), 아치 정점 잉크는 그 아래 첫 획으로 잡는다.
 *       ⚠ `probe879` [2] 가 아치를 «::after 를 끈 차분» 으로 잡다 정점을 놓친 자리다(879 §58) —
 *         그래서 여기서는 **끄지 않고** 벽 기준선에서 벗어나는 첫 행으로 정의한다.
 *   [3] 상인방 스윕 — 상인방의 **그려지는 세로**를 k 배 하면 clearance 가 얼마나 사는지,
 *       그리고 그 대가로 다른 띠·긴 프레임이 움직이는지(기대: Δ0)를 제품에 넣어서 잰다.
 *       ⚑ 878/879 의 배수 바 선례와 같은 축이다 — 띠1 총량(94)은 한 픽셀도 안 건드린다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * 913 — pngjs 없음 처리는 tools/png913.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const REF = 2280;
const PROFILE = process.argv.includes('--profile');

/* 상인방 안 금테 회피(--rw-lt 하한) · 설계 상인방 세로 — 소스 상수와 한 벌 */
const GOLD = 20, LIN = 66;

const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const rel = (r) => ({ t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height) });
  const box = (s) => { const e = q(s); return e ? rel(e.getBoundingClientRect()) : null; };
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (expr) => { ruler.style.height = expr; return ruler.getBoundingClientRect().height; };
  const v = (n) => num('var(' + n + ')');
  const rwc = num('calc(100px * var(--rwc,1))') / 100;
  const av = v('--rw-av'), gt = v('--rw-gt'), lt = v('--rw-lt'), tt = v('--rw-tt'), gof = v('--rw-gof');
  ruler.remove();
  const grid = box('#relw .rw-grid'), lint = box('#relw .rw-lintel'),
        mul = box('#rwMulBar'), mid = box('#relw .rw-mid');
  /* 아치는 의사요소(.rw-bg::after)라 상자를 못 잡는다 — 같은 식을 문 클론으로 되잰다(probe879b). */
  const bg = q('#relw .rw-bg');
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const apexT = r1(ap.getBoundingClientRect().top - pr.top);
  ap.remove();
  return {
    rwc: r1(rwc), av: r1(av), gt: r1(gt), lt: r1(lt), tt: r1(tt), gof: r1(gof),
    panel: { t: r1(pr.top), l: r1(pr.left), w: r1(pr.width), h: r1(pr.height) },
    lint, apexT,
    b1: apexT,                                     /* 띠1 패널 상단 ↓ 아치 정점(= 94 × rwc) */
    clr: lint ? r1(apexT - lint.b) : null,         /*   그 안: 상인방 상자 하변 ↓ 아치 정점 */
    b2: grid ? r1(grid.t - apexT) : null,
    b3: (grid && mul) ? r1(mul.t - grid.b) : null,
    b4: (mid && mul) ? r1(mid.t - mul.b) : null,
  };
})()`;

/* ── [3] 스윕 CSS — 상인방의 «그려지는 세로» 만 k 배 한다 ───────────────────
   높이와 그라디언트 정지점·까치발을 **같은 비**로 옮긴다(잘라 내는 것이 아니다 —
   13회차가 «66 온전히» 를 세운 이유가 그 잘림이었다). 띠1 총량(94)·lt·gt 는 안 건드린다. */
function linCSS(k) {
  if (k == null || k === 1) return '';
  const s = (n) => +(n * k).toFixed(3);
  return `#relw .rw-lintel{height:calc(${s(LIN)}px * var(--rwc,1));
    background:linear-gradient(180deg,rgba(128,112,82,.60) 0 ${s(5)}px,rgba(6,6,4,.52) ${s(5)}px ${s(11)}px,
      rgba(84,70,50,.40) ${s(11)}px ${s(54)}px,rgba(120,105,76,.52) ${s(54)}px ${s(59)}px,
      rgba(5,5,3,.52) ${s(59)}px ${s(64)}px,rgba(0,0,0,0) ${s(64)}px ${s(66)}px)}
  #relw .rw-lintel::before,#relw .rw-lintel::after{top:${s(-12)}px;height:${s(78)}px}`;
}

async function open(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(250);
  return { ctx, page };
}

async function measure(browser, H, css) {
  const { ctx, page } = await open(browser, H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}

/* 패널 중앙 열띠의 행별 평균 휘도 — 까치발(좌우 196)과 벽기둥(86)을 피한다 */
async function profile(page, o) {
  const P = o.panel;
  const clip = { x: Math.round(P.l + P.w / 2 - 40), y: Math.round(P.t),
                 width: 80, height: Math.min(400, Math.round(P.h)) };
  const buf = await page.screenshot({ clip });
  const png = PNG.sync.read(buf);
  const rows = [];
  for (let y = 0; y < png.height; y++) {
    let s = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      s += 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
    }
    rows.push(s / png.width);
  }
  return rows;                                        /* index = 패널 상단 기준 y(px) */
}

const pad = (s, n) => String(s).padEnd(n);
const f2 = (v) => (v == null ? '—' : (+v).toFixed(2));
const f3 = (v) => (v == null ? '—' : (+v).toFixed(3));

(async () => {
  const browser = await launch(chromium);
  const base = {};
  for (const H of FRAMES) base[H] = await measure(browser, H, '');

  console.log('PROBE926 — 「상인방 칠 하변 ↓ 아치 정점」이 1600 에서 굶었는가\n');

  /* ── [1] 띠1 해부 ───────────────────────────────────────────────────────── */
  console.log('[1] 띠1 해부 — 패널 상단 ↓ 아치 정점을 셋으로 쪼갠다 (패널 좌표 · px)');
  console.log('     ' + pad('프레임', 8) + pad('rwc', 7) + pad('lt(금테)', 10) + pad('상인방h', 9)
    + pad('상인방b', 9) + pad('아치정점', 10) + pad('clr(상자)', 10) + pad('띠1', 9) + '잔존(띠1/상인방/clr)');
  for (const H of FRAMES) {
    const b = base[H], r = base[REF];
    console.log('     ' + pad(H, 8) + pad(f2(b.rwc), 7) + pad(f2(b.lt), 10) + pad(f2(b.lint.h), 9)
      + pad(f2(b.lint.b), 9) + pad(f2(b.apexT), 10) + pad(f2(b.clr), 10) + pad(f2(b.b1), 9)
      + f3(b.b1 / r.b1) + ' / ' + f3(b.lint.h / r.lint.h) + ' / ' + f3(b.clr / r.clr));
  }
  console.log('     ⇒ 다른 띠 잔존 — ' + FRAMES.map(H =>
    H + ':' + f3(base[H].b2 / base[REF].b2) + '/' + f3(base[H].b3 / base[REF].b3)
    + '/' + f3(base[H].b4 / base[REF].b4)).join(' · ') + '  (띠2/띠3/띠4)');

  /* ── [2] 화소 자 ────────────────────────────────────────────────────────── */
  console.log('\n[2] 화소 자 — 등재문의 «16 ↔ 50» 을 되잰다');
  const ink = {};
  for (const H of [1600, REF]) {
    const on = await open(browser, H, '');
    const pOn = await profile(on.page, base[H]);
    await on.ctx.close();
    const off = await open(browser, H, '#relw .rw-lintel{display:none}');
    const pOff = await profile(off.page, base[H]);
    await off.ctx.close();
    const b = base[H];
    /* 칠 하변 = 상인방을 끈 사본과 «눈에 보이게» 다른 마지막 행(차 ≥ 1.0 휘도) */
    let paintB = null;
    for (let y = Math.floor(b.lint.t); y < Math.ceil(b.apexT) + 4 && y < pOn.length; y++)
      if (Math.abs(pOn[y] - pOff[y]) >= 1.0) paintB = y + 1;
    /* 아치 정점 잉크 = 칠 하변 아래에서 «벽 기준선» 을 처음 벗어나는 행.
       기준선 = 칠 하변 ~ 정점 사이 상단 절반의 중앙값(벽면), 문턱 = 그 대역 진폭의 3배. */
    const seg = [];
    for (let y = paintB; y < Math.min(pOff.length, Math.ceil(b.apexT) + 60); y++) seg.push(pOff[y]);
    const head = seg.slice(0, Math.max(3, Math.floor(seg.length / 4))).slice().sort((a, c) => a - c);
    const base0 = head[head.length >> 1];
    const amp = Math.max(0.6, head[head.length - 1] - head[0]);
    let apexInk = null;
    for (let i = 0; i < seg.length; i++)
      if (Math.abs(seg[i] - base0) > amp * 3) { apexInk = paintB + i; break; }
    ink[H] = { paintB, apexInk, gapInk: apexInk == null ? null : apexInk - paintB,
               gapPaintBox: +(b.apexT - paintB).toFixed(2) };
    console.log('     ' + pad(H, 8) + '상인방 상자 ' + pad(f2(b.lint.t) + '..' + f2(b.lint.b), 18)
      + '칠 하변 ' + pad(paintB, 7) + '아치 정점(상자) ' + pad(f2(b.apexT), 9)
      + '아치 잉크 ' + pad(apexInk == null ? '—' : apexInk, 7)
      + '칠↓정점(상자) ' + pad(f2(b.apexT - paintB), 8)
      + '칠↓잉크 ' + (apexInk == null ? '—' : apexInk - paintB));
    if (PROFILE) {
      const from = Math.floor(b.lint.t), to = Math.min(pOff.length, Math.ceil(b.apexT) + 40);
      console.log('       프로파일 y=' + from + '..' + to + ' (켠/끈): '
        + Array.from({ length: to - from }, (_, i) =>
          (from + i) + ':' + pOn[from + i].toFixed(1) + '|' + pOff[from + i].toFixed(1)).join(' '));
    }
  }
  if (ink[1600].gapInk != null && ink[REF].gapInk != null)
    console.log('     ⇒ 칠↓아치 잉크 잔존율 = ' + ink[1600].gapInk + ' / ' + ink[REF].gapInk
      + ' = **' + f3(ink[1600].gapInk / ink[REF].gapInk) + '**  (등재문 16/50 = 0.320)');
  console.log('     ⇒ 칠↓정점(상자) 잔존율 = ' + f3(ink[1600].gapPaintBox / ink[REF].gapPaintBox)
    + '  (' + ink[1600].gapPaintBox + ' / ' + ink[REF].gapPaintBox + ')');

  /* ── [3] 상인방 스윕 ────────────────────────────────────────────────────── */
  console.log('\n[3] 상인방 스윕 — 그려지는 세로를 k 배 하면 clearance 가 사는가 (제품에 넣어서)');
  const POOL1600 = null;
  const ks = [1, 0.9, 0.8, 0.677, 0.6];
  console.log('     ' + pad('k', 8) + pad('상인방h', 9) + pad('clr(상자)', 10) + pad('띠1', 9)
    + pad('잔존 clr', 10) + pad('잔존 상인방', 12) + pad('띠2', 9) + pad('띠3', 9) + pad('띠4', 9) + '긴 프레임 Δ');
  for (const k of ks) {
    const s = await measure(browser, 1600, linCSS(k));
    const L = await measure(browser, REF, linCSS(k));   /* 긴 프레임은 안 건드려야 한다 */
    const r = base[REF];
    const dLong = Math.max(Math.abs(L.clr - r.clr), Math.abs(L.lint.h - r.lint.h),
                           Math.abs(L.b1 - r.b1), Math.abs(L.b4 - r.b4));
    console.log('     ' + pad(k, 8) + pad(f2(s.lint.h), 9) + pad(f2(s.clr), 10) + pad(f2(s.b1), 9)
      + pad(f3(s.clr / r.clr), 10) + pad(f3(s.lint.h / r.lint.h), 12)
      + pad(f3(s.b2 / r.b2), 9) + pad(f3(s.b3 / r.b3), 9) + pad(f3(s.b4 / r.b4), 9)
      + (k === 1 ? '—' : f2(dLong) + 'px'));
  }
  /* 항등식 — 띠1 안의 압축을 상인방과 clearance 가 같은 비로 나누는 k */
  const kEven = (base[1600].b1 - GOLD * base[1600].rwc)
              / (base[REF].b1 - GOLD * base[REF].rwc) * (base[REF].rwc / base[1600].rwc);
  console.log('     ⇒ «띠1 안을 고르게 나누는» k = (띠1₁₆₀₀ − 20) / (띠1_긴 − 20) = '
    + f2(base[1600].b1 - GOLD * base[1600].rwc) + ' / ' + f2(base[REF].b1 - GOLD * base[REF].rwc)
    + ' = **' + f3(kEven) + '**');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
