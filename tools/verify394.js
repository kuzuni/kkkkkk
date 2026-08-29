#!/usr/bin/env node
/* 게이트 394 — 34 축복 카드 아이콘 3장의 «세로 덩치»가 한 눈금에 모여 있는가
 *
 *   node tools/verify394.js
 *
 * 이 자가 지키는 약속(주인 지시 411 의 눈금을 이 화면에 적용한 것):
 *   **정렬된 형제 아이콘 집합에서 «세로 덩치»(찍힌 잉크 높이) 최대÷최소 ≤ 1.05.**
 *   근거는 레퍼런스 자신이다 — ref 잉크 150×153 / 145×154 / 132×156 은 폭이 13.6% 갈리는데
 *   높이는 2.0% 안에 모여 있다. 즉 «높이» 가 이 화면이 고정해 둔 축이다.
 *
 * ⚠ 자는 «레이아웃 상자» 가 아니라 **찍힌 픽셀**이다(356 6회차 AY · probe394 와 같은 차분법).
 *   이 카드의 이모지는 글리프가 상자보다 작고 글리프마다 종횡이 다르므로 상자를 재면 아무것도
 *   못 본다 — 실제로 `verify125` D3 이 «레이아웃 박스» 를 재서 초록이던 자리가 340 이었다.
 *
 * ⚠ `blessTick()` 이 1초마다 팝업을 다시 그린다 — 차분 두 장 사이에 재렌더가 끼면 잉크가 2배로
 *   읽힌다(probe356r6 1차 실행 사고). 타이머·rAF·애니메이션을 전부 세우고 잰다.
 *
 * 절:
 *   [전제] 축복 팝업에 실제로 들어갔다 (헛초록 방지 · LESSONS 356-⑬)
 *   [1] 선언 — 세 규칙이 살아 있고 **등방**이다 (356 정책은 그대로다)
 *   [2] 눈금 — 찍힌 잉크의 세로 덩치 최대÷최소 ≤ 1.05
 *   [3] ref — 세 장 높이가 ref 와 ±2px
 *   [4] 정의 — 선언된 배율이 «높이 눈금» 역산값 refH/natH 와 같다 (손으로 고른 수가 아니다)
 *   [5] 대가 — 폭 넘침이 카드(overflow:hidden) 안이고 아래 초록 알약과 안 겹친다
 *   [R] 되돌림 시험 — 옛 contain(폭 눈금)을 도로 심으면 [2] 가 빨개진다
 *   [R2] 음성항 — transform 을 통째로 떼도 빨개진다 («값이 사라져도 초록» 을 막는다)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* ref 잉크 bbox — `scan34.js mask .. noty`(probe356r6 머리말에 출처·검산) */
const REF = { atk: { w: 150, h: 153 }, hp: { w: 145, h: 154 }, rate: { w: 132, h: 156 } };
/* 356 6회차의 contain(폭 눈금) 값 — [R] 이 되돌림으로 심는 «옛 선언» */
const OLD = { atk: 0.9494, hp: 0.9236, rate: 0.8684 };
const BULK_TOL = 1.05;   /* 주인 눈금(411) */

const SITES = [
  { key: 'atk',  css: '#blsC_atk  .ic', sel: '#blsC_atk > .b > s.ic',  card: '#blsC_atk',  vl: '#blsC_atk > .b > s.vl' },
  { key: 'hp',   css: '#blsC_hp   .ic', sel: '#blsC_hp > .b > s.ic',   card: '#blsC_hp',   vl: '#blsC_hp > .b > s.vl' },
  { key: 'rate', css: '#blsC_rate .ic', sel: '#blsC_rate > .b > s.ic', card: '#blsC_rate', vl: '#blsC_rate > .b > s.vl' },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width || r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
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

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ok   ${m}`); };
const bad = (m) => { fail++; console.log(`  FAIL ${m}`); };
const ck = (c, m) => (c ? ok(m) : bad(m));

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const calc = await b.newPage();
  await calc.setContent('<body></body>');

  const enter = async () => {
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1400);
    await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
    await p.waitForTimeout(1200);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    await p.evaluate(() => {
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await p.waitForTimeout(250);
  };
  const freeze = async () => {
    await p.waitForTimeout(160);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  };

  const PAD = 70;
  async function ink(sel) {
    const r = await p.evaluate(RECT, sel);
    if (!r) return null;
    const clip = {
      x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
      width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2),
    };
    const on = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate(VIS, [sel, 'hidden']);
    const off = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate(VIS, [sel, '']);
    const d = await calc.evaluate(DIFF, [on, off, 12]);
    return d ? { w: d.w, h: d.h, x0: clip.x + d.x0, y0: clip.y + d.y0, x1: clip.x + d.x1, y1: clip.y + d.y1 } : null;
  }
  const bulkOf = (m) => {
    const hs = SITES.map((s) => m[s.key].h);
    return r4(Math.max(...hs) / Math.min(...hs));
  };

  console.log('[verify394] 34 축복 카드 아이콘 — «세로 덩치» 한 눈금 (찍힌 픽셀)\n');

  await enter();
  const seen = await p.evaluate(() => ({
    cards: document.querySelectorAll('.bls-c').length,
    open: !!document.querySelector('#blsw.on'),
  }));
  console.log('[전제] 축복 팝업에 실제로 들어갔다 (헛초록 방지)');
  ck(seen.cards === 3 && seen.open, `[전제] .bls-c ${seen.cards}장 · #blsw.on ${seen.open}`);
  if (seen.cards !== 3) { console.log('\n[verify394] 진입 실패 — 나머지 절은 뜻이 없다'); await b.close(); process.exit(1); }

  /* ── [1] 선언 ─────────────────────────────────────────────────────────── */
  console.log('\n[1] 선언 — 세 규칙이 살아 있고 등방이다 (356 정책 유지)');
  const tf = await p.evaluate((list) => list.map((q) => {
    const e = document.querySelector(q); if (!e) return null;
    const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(e).transform);
    return m ? [+m[1], +m[4]] : null;
  }), SITES.map((s) => s.sel));
  SITES.forEach((s, i) => {
    const g = tf[i];
    if (!g) { bad(`[1-${s.key}] 노드가 없다(선택자가 죽었다)`); return; }
    ck(Math.abs(g[0] - g[1]) <= 0.001 && Math.abs(g[0] - 1) > 0.0005,
      `[1-${s.key}] 등방 scale(${g[0]}) — sx=sy · transform:none 아님`);
  });

  /* ── [2] 눈금 ─────────────────────────────────────────────────────────── */
  console.log(`\n[2] 눈금 — 찍힌 잉크의 «세로 덩치» 최대÷최소 ≤ ${BULK_TOL} (주인 지시 411)`);
  const CUR = {};
  for (const s of SITES) {
    CUR[s.key] = await ink(s.sel);
    if (!CUR[s.key]) { bad(`[2-${s.key}] 잉크를 못 쟀다`); }
  }
  if (SITES.every((s) => CUR[s.key])) {
    const r = bulkOf(CUR);
    console.log(`     잉크 ${SITES.map((s) => `${s.key} ${CUR[s.key].w}×${CUR[s.key].h}`).join(' · ')}`);
    ck(r <= BULK_TOL, `[2] 세로 덩치 최대÷최소 ${r} ≤ ${BULK_TOL}`);

    /* ── [3] ref ────────────────────────────────────────────────────────── */
    console.log('\n[3] ref — 세 장 높이가 ref 잉크와 ±2px (눈금이 «고른» 것만이 아니라 «맞다»)');
    SITES.forEach((s) => ck(Math.abs(CUR[s.key].h - REF[s.key].h) <= 2,
      `[3-${s.key}] 높이 ${CUR[s.key].h} ↔ ref ${REF[s.key].h} (Δ${r2(CUR[s.key].h - REF[s.key].h)})`));
  }

  /* ── [4] 정의 ─────────────────────────────────────────────────────────── */
  console.log('\n[4] 정의 — 선언된 배율이 «높이 눈금» 역산값 refH/natH 와 같다 (손으로 고른 수가 아니다)');
  await p.addStyleTag({ content: SITES.map((s) => `${s.css}{transform:none !important}`).join('') });
  await freeze();
  const NAT = {};
  for (const s of SITES) NAT[s.key] = await ink(s.sel);
  SITES.forEach((s, i) => {
    const want = REF[s.key].h / NAT[s.key].h, got = tf[i] ? tf[i][0] : 0;
    ck(Math.abs(got - want) <= 0.004,
      `[4-${s.key}] 자연 ${NAT[s.key].w}×${NAT[s.key].h} ⇒ refH/natH = ${r4(want)} ↔ 선언 ${got}`);
  });
  /* 이 항이 없으면 «폭 눈금으로 돌아가도 [4] 가 초록» 이 된다 — 두 눈금이 다르다는 것을 못박는다 */
  SITES.forEach((s) => {
    const sw = REF[s.key].w / NAT[s.key].w, sh = REF[s.key].h / NAT[s.key].h;
    ck(sw < sh - 0.005, `[4c-${s.key}] 두 눈금이 실제로 다르다 — contain(폭) ${r4(sw)} < 높이 ${r4(sh)}`);
  });

  /* ── [5] 대가 ─────────────────────────────────────────────────────────── */
  console.log('\n[5] 대가 — 폭 넘침이 카드(overflow:hidden) 안이고 아래 초록 알약과 안 겹친다');
  await enter();
  for (const s of SITES) CUR[s.key] = await ink(s.sel);
  for (const s of SITES) {
    const cd = await p.evaluate(RECT, s.card);
    const v = await ink(s.vl);
    const k = CUR[s.key];
    const lft = r2(k.x0 - cd.x), rgt = r2(cd.x + cd.w - k.x1), gap = r2(v.y0 - k.y1);
    ck(lft > 0 && rgt > 0 && gap > 0,
      `[5-${s.key}] 카드 ${r2(cd.w)} 안 — 좌 ${lft} · 우 ${rgt} · 아래 «+n%» 잉크와 ${gap}px` +
      ` (폭 ref 대비 +${r2((k.w / REF[s.key].w - 1) * 100)}%)`);
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 옛 contain(폭 눈금)을 도로 심으면 [2] 가 빨개지는가');
  await p.addStyleTag({ content: SITES.map((s) => `${s.css}{transform:scale(${OLD[s.key]}) !important}`).join('') });
  await freeze();
  const OLDINK = {};
  for (const s of SITES) OLDINK[s.key] = await ink(s.sel);
  {
    const r = bulkOf(OLDINK);
    ck(r > BULK_TOL, `[R] 옛 값을 심으면 세로 덩치 ${r} > ${BULK_TOL} — 자가 살아 있다` +
      ` (${SITES.map((s) => `${s.key} ${OLDINK[s.key].h}`).join(' · ')})`);
    ck(SITES.some((s) => Math.abs(OLDINK[s.key].h - REF[s.key].h) > 2),
      `[R-b] 옛 값에서는 [3] 도 빨갛다 — 높이가 ref 에서 ${SITES.map((s) => r2(OLDINK[s.key].h - REF[s.key].h)).join('/')}px 어긋난다`);
  }

  /* ── [R2] 음성항 ──────────────────────────────────────────────────────── */
  console.log('\n[R2] 음성항 — 배율을 통째로 떼도 빨개지는가 («사라져도 초록» 방지)');
  await p.addStyleTag({ content: SITES.map((s) => `${s.css}{transform:none !important}`).join('') });
  await freeze();
  const NONE = {};
  for (const s of SITES) NONE[s.key] = await ink(s.sel);
  {
    const r = bulkOf(NONE);
    const off = SITES.filter((s) => Math.abs(NONE[s.key].h - REF[s.key].h) > 2).length;
    ck(r > BULK_TOL || off > 0,
      `[R2] transform 제거 ⇒ 세로 덩치 ${r} · ref 이탈 ${off}/3 장 (자연 ${SITES.map((s) => NONE[s.key].h).join('/')})`);
  }

  console.log(`\n[verify394] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
