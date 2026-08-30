#!/usr/bin/env node
/* 작업 416 게이트 — 34 축복 카드 아이콘 3장의 «중심»
 *
 *   node tools/verify416.js
 *
 * 무엇을 재나: 394 는 «덩치»(등방 배율)를 정했고 «어디에 놓이는가» 는 안 봤다.
 * 이 자는 **찍힌 잉크의 중심**이 ref 잉크 중심 위에 있는지만 묻는다.
 *
 * ⚠ **레이아웃 상자가 아니라 찍힌 픽셀이다** — `.ic` 의 상자는 카드 폭 전체(left:0;right:0)라
 *   상자 중심은 세 장이 언제나 카드 정중앙이고, 이 작업이 옮긴 것은 그 안의 **글리프 잉크**다.
 *   상자를 재는 자는 translate 를 떼어도 «초록» 이 된다(356·340 이 같은 함정을 밟았다).
 *
 * ⚠ **눈금은 0.5px 격자다** — 잉크 bbox 를 «보임 / visibility:hidden» 두 장의 차분으로 잡으므로
 *   중심은 0.5px 단위로만 읽힌다. 그래서 허용 오차는 **1.0px**(격자 2칸)이고, 되돌림 시험이
 *   무는 값은 6.0 / 4.0 / 4.0px 이라 그 사이가 넉넉하다.
 *
 * 절:
 *   [전제] 축복 팝업에 실제로 들어갔다 (헛초록 방지)
 *   [1] 선언 — 세 규칙에 translate 가 살아 있고 그 값이 실측 Δ와 같다 · scale 은 394 값 그대로
 *   [2] 중심 — 찍힌 잉크 중심이 ref 잉크 중심과 ±1.0px (x·y 각각)
 *   [3] 군집 — 세 장의 세로 중심이 ref 처럼 모여 있다 (ref span 2.5px)
 *   [4] 직교 — 394 의 축(세로 덩치)이 한 값도 안 움직였다
 *   [5] 안전 — 옮긴 잉크가 카드(overflow:hidden) 안이고 위 머리띠·아래 초록 알약과 안 겹친다
 *   [R] 되돌림 시험 — translate 를 떼면 [2] 가 빨개진다
 *   [R2] 무름 방지 — 등재문이 권한 «세로만 공용 −2» 로는 [2] 가 안 닫힌다 (카드3 이 +2 로 남는다)
 *   [R3] 음성항 — 부호를 뒤집으면(−6/−4) 빨개진다 (허용 오차가 넓어서 통과한 것이 아니다)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* ref 잉크 중심 — `scan34.js mask .. noty` 의 bbox 를 프레임 좌표로(ref y − 84).
   출처는 `probe394` [F] 의 REFC 와 같은 표이고 측정표 34 §17-6 에 적혀 있다. */
const REFC = {
  atk:  { x: (156 + 305) / 2, y: (900 + 1052) / 2 - 84 },   /* (230.5, 892.0) */
  hp:   { x: (472 + 616) / 2, y: (898 + 1051) / 2 - 84 },   /* (544.0, 890.5) */
  rate: { x: (789 + 920) / 2, y: (896 + 1051) / 2 - 84 },   /* (854.5, 889.5) */
};
/* 394 의 축 — 이 자는 이 값을 «안 움직였다» 는 것만 확인한다(고치는 자는 verify394 다) */
const SCALE = { atk: 0.9745, hp: 1.0694, rate: 0.9936 };
const REFH  = { atk: 153, hp: 154, rate: 156 };
/* 416 이 넣은 이동 — 등재문 실측 Δ(ref − 우리)와 같은 값이어야 한다 */
const MOVE = { atk: { x: 6, y: -1.5 }, hp: { x: 4, y: -2 }, rate: { x: 0, y: -4 } };
const TOL = 1.0;        /* 0.5px 격자 두 칸 */
const BULK_TOL = 1.05;  /* 주인 눈금(411) — 394 가 세운 값 */

const SITES = [
  { key: 'atk',  css: '#blsC_atk  .ic', sel: '#blsC_atk > .b > s.ic',  card: '#blsC_atk',  body: '#blsC_atk > .b',  vl: '#blsC_atk > .b > s.vl' },
  { key: 'hp',   css: '#blsC_hp   .ic', sel: '#blsC_hp > .b > s.ic',   card: '#blsC_hp',   body: '#blsC_hp > .b',   vl: '#blsC_hp > .b > s.vl' },
  { key: 'rate', css: '#blsC_rate .ic', sel: '#blsC_rate > .b > s.ic', card: '#blsC_rate', body: '#blsC_rate > .b', vl: '#blsC_rate > .b > s.vl' },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width || r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
};
const MTX = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/
    .exec(getComputedStyle(e).transform);
  return m ? { a: +m[1], d: +m[4], e: +m[5], f: +m[6] } : null;
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

  const freeze = async () => {
    await p.waitForTimeout(160);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  };
  const enter = async () => {
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1400);
    await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
    await p.waitForTimeout(1200);
    /* ⚠ `blessTick()` 이 1초마다 팝업을 다시 그린다 — 차분 두 장 사이에 재렌더가 끼면
       잉크가 실제의 2배로 읽힌다(probe356r6 1차 실행 사고). 타이머·rAF 를 세운다. */
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    await p.evaluate(() => {
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await p.waitForTimeout(250);
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
    if (!d) return null;
    const x0 = clip.x + d.x0, y0 = clip.y + d.y0, x1 = clip.x + d.x1, y1 = clip.y + d.y1;
    return { w: d.w, h: d.h, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  /* transform 을 통째로 덮어쓴다 — addStyleTag 는 못 지우므로 «덧쓰기» 로 되돌린다 */
  const setTf = async (fn) => {
    await p.addStyleTag({ content: SITES.map((s) => `${s.css}{transform:${fn(s.key)} !important}`).join('') });
    await freeze();
  };
  const centers = async () => {
    const m = {};
    for (const s of SITES) m[s.key] = await ink(s.sel);
    return m;
  };
  const offBy = (m) => SITES.map((s) => ({
    key: s.key,
    dx: r2(m[s.key].cx - REFC[s.key].x),
    dy: r2(m[s.key].cy - REFC[s.key].y),
  }));

  console.log('[verify416] 34 축복 카드 아이콘 — «중심» 한 눈금 (찍힌 픽셀)\n');

  await enter();
  const seen = await p.evaluate(() => ({
    cards: document.querySelectorAll('.bls-c').length,
    open: !!document.querySelector('#blsw.on'),
  }));
  console.log('[전제] 축복 팝업에 실제로 들어갔다 (헛초록 방지)');
  ck(seen.cards === 3 && seen.open, `[전제] .bls-c ${seen.cards}장 · #blsw.on ${seen.open}`);
  if (seen.cards !== 3 || !seen.open) {
    console.log('\n[verify416] 진입 실패 — 나머지 절은 뜻이 없다');
    await b.close(); process.exit(1);
  }

  /* ── [1] 선언 ─────────────────────────────────────────────────────────── */
  console.log('\n[1] 선언 — translate 가 살아 있고(값 = 실측 Δ) scale 은 394 값 그대로다');
  for (const s of SITES) {
    const m = await p.evaluate(MTX, s.sel);
    if (!m) { bad(`[1-${s.key}] 노드가 없다(선택자가 죽었다)`); continue; }
    const want = MOVE[s.key];
    ck(Math.abs(m.e - want.x) <= 0.01 && Math.abs(m.f - want.y) <= 0.01,
      `[1-${s.key}] 이동 (${r2(m.e)}, ${r2(m.f)}) ↔ 실측 Δ (${want.x}, ${want.y})`);
    ck(Math.abs(m.a - m.d) <= 0.001 && Math.abs(m.a - SCALE[s.key]) <= 0.001,
      `[1b-${s.key}] 배율 ${r4(m.a)} 등방 · 394 값 ${SCALE[s.key]} 그대로`);
  }
  /* ⚠ 이 항이 없으면 «translate 를 scale 뒤에 적어도 초록» 이 된다 — 그러면 카드2 는
     1.0694 가 곱해져 +4 가 +4.28 로 들어간다(행렬이 S·T 가 되기 때문). */
  console.log('    ⚑ 위 [1] 의 e·f 는 «곱해진 뒤» 의 실측값이라 순서를 뒤집으면 그 자리에서 어긋난다');

  /* ── [2] 중심 ─────────────────────────────────────────────────────────── */
  console.log(`\n[2] 중심 — 찍힌 잉크 중심이 ref 잉크 중심과 ±${TOL}px`);
  const CUR = await centers();
  for (const o of offBy(CUR)) {
    const k = CUR[o.key];
    ck(Math.abs(o.dx) <= TOL && Math.abs(o.dy) <= TOL,
      `[2-${o.key}] 잉크 중심 (${r2(k.cx)}, ${r2(k.cy)}) ↔ ref (${REFC[o.key].x}, ${REFC[o.key].y})  Δx ${o.dx} · Δy ${o.dy}`);
  }

  /* ── [3] 군집 ─────────────────────────────────────────────────────────── */
  console.log('\n[3] 군집 — 세 장의 세로 중심이 ref 처럼 모여 있다');
  const refSpan = Math.max(...SITES.map((s) => REFC[s.key].y)) - Math.min(...SITES.map((s) => REFC[s.key].y));
  const ourSpan = Math.max(...SITES.map((s) => CUR[s.key].cy)) - Math.min(...SITES.map((s) => CUR[s.key].cy));
  ck(ourSpan <= refSpan + TOL,
    `[3] 세로 중심 span ${r2(ourSpan)} ≤ ref ${r2(refSpan)} + ${TOL}  (수리 전 우리 1.0 · 자리는 3~4px 아래였다)`);

  /* ── [4] 직교 ─────────────────────────────────────────────────────────── */
  console.log('\n[4] 직교 — 394 의 축(세로 덩치)이 한 값도 안 움직였다');
  const hs = SITES.map((s) => CUR[s.key].h);
  ck(r4(Math.max(...hs) / Math.min(...hs)) <= BULK_TOL,
    `[4] 세로 덩치 최대÷최소 ${r4(Math.max(...hs) / Math.min(...hs))} ≤ ${BULK_TOL} (${hs.join(' / ')})`);
  for (const s of SITES) {
    ck(Math.abs(CUR[s.key].h - REFH[s.key]) <= 2,
      `[4b-${s.key}] 높이 ${CUR[s.key].h} ↔ ref ${REFH[s.key]} (Δ${CUR[s.key].h - REFH[s.key]})`);
  }

  /* ── [5] 안전 ─────────────────────────────────────────────────────────── */
  console.log('\n[5] 안전 — 옮긴 잉크가 카드 안이고 위 머리띠·아래 초록 알약과 안 겹친다');
  for (const s of SITES) {
    const cd = await p.evaluate(RECT, s.card);
    const bd = await p.evaluate(RECT, s.body);
    const v = await ink(s.vl);
    const k = CUR[s.key];
    const lft = r2(k.x0 - cd.x), rgt = r2(cd.x + cd.w - k.x1);
    const top = r2(k.y0 - bd.y), gap = r2(v.y0 - k.y1);
    ck(lft > 0 && rgt > 0 && top > 0 && gap > 0,
      `[5-${s.key}] 카드 ${r2(cd.w)} 안 — 좌 ${lft} · 우 ${rgt} · 위 머리띠와 ${top} · 아래 «+n%» 잉크와 ${gap}px`);
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — translate 를 떼면 [2] 가 빨개지는가');
  await setTf((k) => `scale(${SCALE[k]})`);
  const R = offBy(await centers());
  const rHit = R.filter((o) => Math.abs(o.dx) > TOL || Math.abs(o.dy) > TOL);
  ck(rHit.length === 3,
    `[R] 이동을 떼면 3장 다 ±${TOL} 밖 — ${R.map((o) => `${o.key} (${o.dx}, ${o.dy})`).join(' · ')}`);

  /* ── [R2] 무름 방지 ───────────────────────────────────────────────────── */
  console.log('\n[R2] 무름 방지 — 등재문이 권한 «세로만 공용 −2» 로는 안 닫힌다');
  await setTf((k) => `translate(0,-2px) scale(${SCALE[k]})`);
  const R2 = offBy(await centers());
  const r2Hit = R2.filter((o) => Math.abs(o.dx) > TOL || Math.abs(o.dy) > TOL).map((o) => o.key);
  ck(r2Hit.includes('atk') && r2Hit.includes('hp') && r2Hit.includes('rate'),
    `[R2] 공용 −2 만으로는 카드1·2 가 가로로(−6/−4) · 카드3 이 세로로(+2) 남는다 — ` +
    `${R2.map((o) => `${o.key} (${o.dx}, ${o.dy})`).join(' · ')}`);

  /* ── [R3] 음성항 ──────────────────────────────────────────────────────── */
  console.log('\n[R3] 음성항 — 부호를 뒤집으면 빨개진다 (허용 오차가 넓어서 통과한 것이 아니다)');
  await setTf((k) => `translate(${-MOVE[k].x}px,${-MOVE[k].y}px) scale(${SCALE[k]})`);
  const R3 = offBy(await centers());
  ck(R3.filter((o) => Math.abs(o.dx) > TOL || Math.abs(o.dy) > TOL).length >= 2,
    `[R3] 부호를 뒤집으면 ±${TOL} 밖 — ${R3.map((o) => `${o.key} (${o.dx}, ${o.dy})`).join(' · ')}`);

  console.log(`\n[verify416] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
