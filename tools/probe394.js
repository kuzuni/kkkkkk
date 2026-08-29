#!/usr/bin/env node
/* 작업 394 재현기 — 34 축복 카드 아이콘 3장의 «세로 덩치»
 *
 *   node tools/probe394.js
 *
 * 왜 재현부터인가(338·341·350 규칙): 등재문은 «세로 잉크 148~149 / 132 / 135~136 ⇒ 12.9%» 를
 * **비평가 두 사람의 눈**에서 얻었다. 처방을 고르기 전에 그 숫자를 **제품에게 직접** 물어야 한다.
 *
 * ⚠ 자는 «레이아웃 상자» 가 아니라 **찍힌 픽셀**이다(356 6회차 AY 의 자를 그대로 쓴다) —
 *   이 카드의 이모지는 글리프가 상자보다 작고 글리프마다 종횡이 다르다. 같은 클립을
 *   «보임 / visibility:hidden» 두 번 찍어 차분한다.
 *
 * ⚠ `blessTick()` 이 1초마다 팝업을 다시 그린다 — 차분 두 장 사이에 재렌더가 끼면 잉크가
 *   실제의 2배로 읽힌다(probe356r6 1차 실행이 🌀 를 285×227 로 읽은 사고). 타이머·rAF 를 세운다.
 *
 * 절:
 *   [A] 재현   — «수리 전 선언»(contain = 폭 눈금)을 주입해서 세로 덩치 max/min 을 낸다
 *   [B] 자연   — transform 을 벗긴 잉크. 여기서 두 자(contain ↔ 높이 눈금)를 역산한다
 *   [C] 처방   — 높이 눈금 배율을 주입해서 세로 덩치 max/min 과 «폭이 얼마나 넘치는가» 를 낸다
 *   [D] 안전   — 처방 상태에서 잉크가 카드(overflow:hidden) 안인가 · 아래 초록 알약과 안 겹치는가
 *   [E] 현행   — 지금 제품이 [A] 와 [C] 중 어느 쪽인가 (수리 후에는 [C] 와 같아야 한다)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* ref 잉크 bbox — probe356r6 머리말과 같은 출처(`scan34.js mask .. noty`, 창을 y1052 로 닫은 값).
   ⚑ 이 표가 394 의 물음 그 자체다: **폭은 150/145/132 로 갈리는데 높이는 153/154/156 으로 고르다.**
   즉 레퍼런스는 세 아이콘의 «세로 덩치» 를 눈금처럼 맞춰 둔 화면이다(편차 2.0%). */
const REF = {
  atk:  { w: 150, h: 153 },
  hp:   { w: 145, h: 154 },
  rate: { w: 132, h: 156 },
};

/* 수리 전 선언 = 356 6회차가 적은 contain 배율 (s = min(refW/natW, refH/natH) — 셋 다 폭이 물었다) */
const OLD = { atk: 0.9494, hp: 0.9236, rate: 0.8684 };

const SITES = [
  { key: 'atk',  css: '#blsC_atk  .ic', sel: '#blsC_atk > .b > s.ic',  card: '#blsC_atk',  vl: '#blsC_atk > .b > s.vl' },
  { key: 'hp',   css: '#blsC_hp   .ic', sel: '#blsC_hp > .b > s.ic',   card: '#blsC_hp',   vl: '#blsC_hp > .b > s.vl' },
  { key: 'rate', css: '#blsC_rate .ic', sel: '#blsC_rate > .b > s.ic', card: '#blsC_rate', vl: '#blsC_rate > .b > s.vl' },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top);
    x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); n++;
  }
  return n ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, n } : null;
};
const DIFF = async ([a, b, tol]) => {
  const load = async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
  };
  const A = await load(a), B = await load(b);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
    const i = (y * A.W + x) * 4;
    const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
    if (dd > tol) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, x1, y1, n } : null;
};

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const calc = await b.newPage();
  await calc.setContent('<body></body>');

  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
  await p.waitForTimeout(1200);

  const seen = await p.evaluate(() => ({
    cards: document.querySelectorAll('.bls-c').length,
    open: !!document.querySelector('#blsw.on'),
  }));

  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  await p.evaluate(() => {
    for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
    window.requestAnimationFrame = () => 0;
  });
  await p.waitForTimeout(300);

  const PAD = 70;
  const shot = async (clip) => (await p.screenshot({ clip })).toString('base64');

  async function ink(sel) {
    const r = await p.evaluate(RECT, sel);
    if (!r) return null;
    const clip = {
      x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
      width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2),
    };
    const on = await shot(clip);
    await p.evaluate(VIS, [sel, 'hidden']);
    const off = await shot(clip);
    await p.evaluate(VIS, [sel, '']);
    const d = await calc.evaluate(DIFF, [on, off, 12]);
    return d ? { w: d.w, h: d.h, n: d.n,
      x0: clip.x + d.x0, y0: clip.y + d.y0, x1: clip.x + d.x1, y1: clip.y + d.y1 } : null;
  }

  /* 배율을 통째로 덮는다 — addStyleTag 는 못 지우므로 «덧쓰기» 로 되돌린다 */
  const setScale = async (map) => {
    let css = '';
    for (const s of SITES) {
      const v = map[s.key];
      css += `${s.css}{transform:${v === null ? 'none' : `scale(${v})`} !important}`;
    }
    await p.addStyleTag({ content: css });
    await p.waitForTimeout(160);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  };

  let pass = 0, fail = 0;
  const ck = (n, cond, note) => {
    cond ? pass++ : fail++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${n}${note ? '   ' + note : ''}`);
  };

  console.log('[probe394] 34 축복 카드 아이콘 — «세로 덩치» 재현  (찍힌 픽셀 차분)\n');
  console.log(`  진입 확인: .bls-c ${seen.cards}장 · #blsw.on ${seen.open}\n`);
  ck('[진입] 카드 3장이 보인다', seen.cards === 3 && seen.open, `cards=${seen.cards} open=${seen.open}`);

  const bulk = (m) => {
    const hs = SITES.map((s) => m[s.key].h);
    return { min: Math.min(...hs), max: Math.max(...hs), ratio: r4(Math.max(...hs) / Math.min(...hs)) };
  };

  /* ── [A] 재현 — 수리 전 선언(폭 눈금 contain) ─────────────────────────── */
  console.log('\n[A] 재현 — 수리 전 선언(contain = 폭 눈금)을 주입한 상태의 «그려진 잉크»');
  await setScale(OLD);
  const A = {};
  for (const s of SITES) {
    A[s.key] = await ink(s.sel);
    const R = REF[s.key];
    console.log(`   ${s.key.padEnd(4)} 잉크 ${A[s.key].w}×${A[s.key].h}  (ref ${R.w}×${R.h}` +
      `  Δ폭 ${r2(A[s.key].w - R.w)} · Δ높이 ${r2(A[s.key].h - R.h)} = ${r2((A[s.key].h / R.h - 1) * 100)}%)`);
  }
  const bA = bulk(A);
  console.log(`   ⇒ 세로 덩치 최대÷최소 = ${bA.max}/${bA.min} = **${bA.ratio}**`);
  ck('[A1] 등재문 재현 — 세로 덩치가 1.05 를 넘는다(결함이 실재한다)', bA.ratio > 1.05, `ratio ${bA.ratio}`);
  ck('[A2] 등재문 수치 재현 — 12±2% 범위', bA.ratio > 1.10 && bA.ratio < 1.14, `ratio ${bA.ratio}`);
  ck('[A3] 폭은 세 장 다 ref 와 ±2px — 어긋남이 전적으로 높이 축이다',
    SITES.every((s) => Math.abs(A[s.key].w - REF[s.key].w) <= 2),
    SITES.map((s) => `${s.key} Δ${r2(A[s.key].w - REF[s.key].w)}`).join(' · '));
  ck('[A4] ref 자신의 세로 편차는 2.0% — 레퍼런스는 높이를 눈금으로 삼는다',
    r4(156 / 153) <= 1.021, `ref 153/154/156 ⇒ ${r4(156 / 153)}`);

  /* ── [B] 자연 잉크 → 두 자를 역산 ──────────────────────────────────────── */
  console.log('\n[B] 자연 잉크(transform:none) → contain(폭) ↔ 높이 눈금 역산');
  await setScale({ atk: null, hp: null, rate: null });
  const NAT = {}, FIT = {};
  for (const s of SITES) {
    NAT[s.key] = await ink(s.sel);
    const R = REF[s.key], n = NAT[s.key];
    const sw = R.w / n.w, sh = R.h / n.h;
    FIT[s.key] = r4(sh);
    console.log(`   ${s.key.padEnd(4)} 자연 ${n.w}×${n.h}  종횡 ${r2(n.w / n.h)}` +
      `  |  contain(min) ${r4(Math.min(sw, sh))}  높이눈금 ${r4(sh)}`);
  }
  ck('[B1] 셋 다 contain 이 «폭» 을 물었다(그래서 높이가 놓였다)',
    SITES.every((s) => REF[s.key].w / NAT[s.key].w < REF[s.key].h / NAT[s.key].h),
    SITES.map((s) => `${s.key} sw ${r4(REF[s.key].w / NAT[s.key].w)} < sh ${r4(REF[s.key].h / NAT[s.key].h)}`).join(' · '));
  ck('[B2] 우리 이모지 종횡이 제각각이라 두 축을 동시에 못 맞춘다',
    r4(Math.max(...SITES.map((s) => NAT[s.key].w / NAT[s.key].h)) /
       Math.min(...SITES.map((s) => NAT[s.key].w / NAT[s.key].h))) > 1.05,
    SITES.map((s) => `${s.key} ${r2(NAT[s.key].w / NAT[s.key].h)}`).join(' · '));

  /* ── [C] 처방 — 높이 눈금 ─────────────────────────────────────────────── */
  console.log('\n[C] 처방 — «높이 눈금 + 폭 넘침 허용»(등방 유지) 을 주입한 상태');
  await setScale(FIT);
  const C = {};
  for (const s of SITES) {
    C[s.key] = await ink(s.sel);
    const R = REF[s.key];
    console.log(`   ${s.key.padEnd(4)} s=${FIT[s.key]}  잉크 ${C[s.key].w}×${C[s.key].h}` +
      `  (ref ${R.w}×${R.h}  Δ폭 ${r2(C[s.key].w - R.w)} = ${r2((C[s.key].w / R.w - 1) * 100)}% · Δ높이 ${r2(C[s.key].h - R.h)})`);
  }
  const bC = bulk(C);
  console.log(`   ⇒ 세로 덩치 최대÷최소 = ${bC.max}/${bC.min} = **${bC.ratio}**`);
  ck('[C1] 처방 후 세로 덩치 ≤ 1.05 (주인 눈금 · 411 등재문)', bC.ratio <= 1.05, `ratio ${bC.ratio}`);
  ck('[C2] 세 장 모두 높이가 ref 와 ±2px', SITES.every((s) => Math.abs(C[s.key].h - REF[s.key].h) <= 2),
    SITES.map((s) => `${s.key} Δ${r2(C[s.key].h - REF[s.key].h)}`).join(' · '));
  ck('[C3] 대가는 폭 넘침이고 그 크기를 여기 적는다',
    SITES.every((s) => C[s.key].w >= REF[s.key].w),
    SITES.map((s) => `${s.key} +${r2((C[s.key].w / REF[s.key].w - 1) * 100)}%`).join(' · '));

  /* ── [D] 안전 — 잘림·겹침 ─────────────────────────────────────────────── */
  console.log('\n[D] 안전 — 처방 상태에서 잘리거나 겹치지 않는가 (`.bls-c{overflow:hidden}`)');
  const boxes = await p.evaluate((list) => list.map((q) => {
    const e = document.querySelector(q); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
  }), SITES.map((s) => s.card));
  const vlInk = {};
  for (const s of SITES) vlInk[s.key] = await ink(s.vl);
  SITES.forEach((s, i) => {
    const cd = boxes[i], k = C[s.key], v = vlInk[s.key];
    const lft = r2(k.x0 - cd.x), rgt = r2(cd.r - k.x1), gap = r2(v.y0 - k.y1);
    console.log(`   ${s.key.padEnd(4)} 카드 ${r2(cd.w)}px  좌여백 ${lft} · 우여백 ${rgt} · 아래 «+n%» 잉크와 ${gap}px`);
    ck(`[D-${s.key}] 카드 안 · 초록 알약과 안 겹침`, lft > 0 && rgt > 0 && gap > 0,
      `좌 ${lft} · 우 ${rgt} · 아래 ${gap}`);
  });

  /* ── [E] 현행 ─────────────────────────────────────────────────────────── */
  console.log('\n[E] 현행 제품 — 주입 없이 지금 선언된 값');
  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
  await p.waitForTimeout(1200);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  await p.evaluate(() => {
    for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
    window.requestAnimationFrame = () => 0;
  });
  await p.waitForTimeout(300);
  const E = {};
  for (const s of SITES) {
    E[s.key] = await ink(s.sel);
    console.log(`   ${s.key.padEnd(4)} 잉크 ${E[s.key].w}×${E[s.key].h}`);
  }
  const bE = bulk(E);
  console.log(`   ⇒ 세로 덩치 최대÷최소 = **${bE.ratio}**  (수리 전 ${bA.ratio} · 처방 ${bC.ratio})`);
  console.log(`   ⇒ 현재 상태: ${bE.ratio <= 1.05 ? '처방 적용됨' : '수리 전'}`);

  /* ── [F] 곁다리 — 등재문의 «중심» 관측 2건을 확인·기각한다 ────────────── */
  console.log('\n[F] 곁다리 — 등재문의 «중심» 관측 (등방 배율은 중심을 안 옮기므로 394 와 독립이다)');
  console.log('    ref 잉크 bbox (scan34 noty · 프레임 y = ref y − 84):');
  const REFC = {   /* ref bbox → 프레임 좌표 중심 */
    atk:  { x: (156 + 305) / 2, y: (900 + 1052) / 2 - 84 },
    hp:   { x: (472 + 616) / 2, y: (898 + 1051) / 2 - 84 },
    rate: { x: (789 + 920) / 2, y: (896 + 1051) / 2 - 84 },
  };
  for (const s of SITES) {
    const cd = await p.evaluate((q) => {
      const e = document.querySelector(q); const r = e.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, s.card);
    const k = E[s.key];
    const cx = (k.x0 + k.x1) / 2, cy = (k.y0 + k.y1) / 2;
    const cardCx = cd.x + cd.w / 2;
    console.log(`   ${s.key.padEnd(4)} 잉크 중심 (${r2(cx)}, ${r2(cy)})  ↔ ref (${REFC[s.key].x}, ${REFC[s.key].y})` +
      `  Δx ${r2(cx - REFC[s.key].x)} · Δy ${r2(cy - REFC[s.key].y)}   |  카드 중심 대비 Δx ${r2(cx - cardCx)}`);
  }

  console.log(`\n[probe394] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
