#!/usr/bin/env node
/* 작업 356 11회차 역산기 — 56 절전(`#svw`) 세 «아이콘» 자리의 등방 배율을 제품에게 물어서 낸다
 *
 *   node tools/cal356r11.js
 *
 * 자는 356 4·5·6·7회차와 **같은 contain**:  s = min(refW/natW, refH/natH)
 * 그리고 7회차와 같은 «중심 되돌림» d 를 같이 낸다(`scaleX(k)` 를 `scale(s)` 로 갈면
 * 세로 배율이 처음 생겨 잉크 중심이 딸려 올라간다 — cal356r7 머리글).
 *
 *     transform: translate(dx,dy) scale(s)        (CSS 는 오른쪽부터 = scale 먼저)
 *     d = C_now − (O + s·(N − O))                 (O = 상자 중심 · N = 자연 잉크 중심)
 *
 * ── ref 출처 ────────────────────────────────────────────────────────────────
 *   pill 1 ⏱️  35×42  · pill 2 💀 47×42 — `docs/measure/56-절전모드.md` §3-5 E-3 «행별 실측»
 *                                          (이미 있는 측정치다 — 지시서 [2] «재측정 금지»)
 *   배지 💀 41×37 — 측정표에 **없던 값**이다. 표는 배지의 «원판»(58×56)만 적어 두고
 *     그 안 흰 해골 잉크는 안 쟀다. 11회차가 표와 **같은 방법**(Pillow 픽셀 스캔)으로
 *     `docs/ref/56-절전모드.jpg` 의 원판 구역(x368..425 / y1115..1170)에서 밝은 픽셀만
 *     골라 새로 쟀다: 임계 150·170 에서 **x377..417 / y1121..1157 = 41×37** (임계 190 은 40×37).
 *     ⇒ 측정표 §3-4 에 보강으로 적는다(새 측정 · 기존 값 덮어쓰기 아님).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const OPEN = ['#menub', '#mnw [data-mn="saver"]'];

const SITES = [
  { key: 'st', rule: '.sv-st>s>em (STAGE 배지 💀)', sel: '#svw .sv-st>s>em', ref: { w: 41, h: 37 } },
  { key: 'r1', rule: '.sv-r:nth-of-type(1)>u (⏱️)', sel: '#svw .sv-p .sv-r:nth-of-type(1)>u', ref: { w: 35, h: 42 } },
  { key: 'r2', rule: '.sv-r:nth-of-type(2)>u (💀)', sel: '#svw .sv-p .sv-r:nth-of-type(2)>u', ref: { w: 47, h: 42 } },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
/* transform 을 뗀 «레이아웃 상자» — transform-origin 의 기준이다 */
const BOX = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const prev = el.style.transform;
  el.style.transform = 'none';
  const r = el.getBoundingClientRect();
  el.style.transform = prev;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
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
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, n } : null;
};

(async () => {
  const b = await launch(chromium);
  const calc = await b.newPage(); await calc.setContent('<body></body>');
  const PAD = 90;
  console.log('[cal356r11] 56 절전 세 자리 — 등방(contain) 배율 + 중심 되돌림 역산\n');

  /* ⚠ 자리마다 **새 페이지**로 연다(cal356r7 과 같은 규율) — `transform:none !important` 를
     한 페이지에 쌓으면 다음 자리의 «지금» 값이 앞 자리의 주입에 오염된다. */
  async function openSaver() {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1400);
    for (const q of OPEN) {
      const found = await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, q);
      if (!found) console.log(`  ⚠ 무음 실패 — '${q}' 가 DOM 에 없다`);
      await p.waitForTimeout(700);
    }
    /* 절전 패널은 **라이브 값**(방치 시간이 초마다 오른다 — 측정표 §3-5 E-3 주석)이라
       차분 두 장 사이에 글자가 바뀌면 잉크가 부푼다. 6회차 `blessTick` 함정과 같은 자리다. */
    await p.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await p.waitForTimeout(250);
    return p;
  }

  let p = await openSaver();
  /* 헛초록 방지 — 그 화면에 실제로 갔는가(LESSONS 356-⑬) */
  const sv = await p.evaluate(() => {
    const el = document.querySelector('#svw');
    if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { w: r.width, h: r.height, disp: cs.display, op: cs.opacity };
  });
  console.log(`   #svw ${sv ? `${sv.w}×${sv.h} display:${sv.disp} opacity:${sv.op}` : '✗ 없다'}\n`);
  await p.close();

  async function ink(p, sel) {
    const r = await p.evaluate(RECT, sel);
    if (!r) return null;
    const clip = { x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
      width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2) };
    const on = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate(VIS, [sel, 'hidden']);
    const off = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate(VIS, [sel, '']);
    const d = await calc.evaluate(DIFF, [on, off, 12]);
    return d ? { w: d.w, h: d.h, cx: clip.x + d.x0 + d.w / 2, cy: clip.y + d.y0 + d.h / 2 } : null;
  }

  for (const site of SITES) {
    p = await openSaver();
    const exists = await p.evaluate((s) => !!document.querySelector(s), site.sel);
    if (!exists) { console.log(`── ${site.rule}  ✗ 노드 없음 (${site.sel})\n`); await p.close(); continue; }

    const tf = await p.evaluate((s) => getComputedStyle(document.querySelector(s)).transform, site.sel);
    const box = await p.evaluate(BOX, site.sel);
    const O = { x: box.x + box.w / 2, y: box.y + box.h / 2 };

    const now = await ink(p, site.sel);
    await p.addStyleTag({ content: `${site.sel}{transform:none !important}` });
    await p.waitForTimeout(160);
    const nat = await ink(p, site.sel);
    const nat2 = await ink(p, site.sel);

    const ref = site.ref;
    const s = Math.min(ref.w / nat.w, ref.h / nat.h);
    const after = { cx: O.x + s * (nat.cx - O.x), cy: O.y + s * (nat.cy - O.y) };
    const d = { x: now.cx - after.cx, y: now.cy - after.cy };

    console.log(`── ${site.rule}`);
    console.log(`   현 transform  ${tf}`);
    console.log(`   상자          ${box.w.toFixed(1)}×${box.h.toFixed(1)} @(${box.x.toFixed(1)},${box.y.toFixed(1)})  O=(${O.x.toFixed(2)}, ${O.y.toFixed(2)})`);
    console.log(`   지금 잉크     ${now.w}×${now.h}  중심 (${now.cx.toFixed(2)}, ${now.cy.toFixed(2)})   종횡 ${(now.w / now.h).toFixed(4)}`);
    console.log(`   자연 잉크     ${nat.w}×${nat.h}  중심 (${nat.cx.toFixed(2)}, ${nat.cy.toFixed(2)})   종횡 ${(nat.w / nat.h).toFixed(4)}`);
    console.log(`   재실행 일치   ${nat2.w}×${nat2.h} ${(nat2.w === nat.w && nat2.h === nat.h) ? '✅' : '❌ 흔들린다'}`);
    console.log(`   ref           ${ref.w}×${ref.h}   (종횡 ${(ref.w / ref.h).toFixed(4)})`);
    console.log(`   ⇒ s = ${s.toFixed(5)}   수리 후 잉크 ${(nat.w * s).toFixed(1)}×${(nat.h * s).toFixed(1)}`);
    console.log(`   ⇒ 중심 되돌림 d = (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`);
    console.log(`   ⇒ transform: translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${s.toFixed(5)})\n`);
    await p.close();
  }

  await b.close();
})();
