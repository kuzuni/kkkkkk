#!/usr/bin/env node
/* 작업 356 12회차 역산기 — 04 던전 세부(`#dgdw`) 좌·우 화살표의 등방 배율을 제품에게 물어서 낸다
 *
 *   node tools/cal356r12.js
 *
 * 자는 356 4·5·6·7·11회차와 **같은 contain**:  s = min(refW/natW, refH/natH)
 * 그리고 7·11회차와 같은 «중심 되돌림» d 를 같이 낸다(`scaleX(k)` 를 `scale(s)` 로 갈면
 * 세로 배율이 처음 생겨 잉크 중심이 딸려 온다 — cal356r7 머리글).
 *
 *     transform: translate(dx,dy) scale(s)        (CSS 는 오른쪽부터 = scale 먼저)
 *     d = C_now − (O + s·(N − O))                 (O = 상자 중심 · N = 자연 잉크 중심)
 *
 * ── ⚠ 11회차와 다른 점 하나 — «무엇을 잉크라 부르는가» 를 이 자리에서는 갈라야 한다 ──────────
 *   11회차의 세 자리는 **이모지**라 `-webkit-text-stroke` 가 안 먹어 «차분 잉크 = 흰 채움» 이었다.
 *   여기 화살표는 `-webkit-text-stroke:10px #000`(8214~8216) 이 붙은 **글리프**라
 *   차분 잉크는 검정 테까지 포함한다. 측정표의 ref 값은 «흰 채움 bbox» 다
 *   (`docs/measure/04-던전세부팝업.md` §4 — 좌 ◀ 338~401 / 1168~1235 = **63×67**, 외곽선 6px 별기).
 *   ⇒ 두 축을 **같은 뜻으로** 맞추려면 우리 쪽도 «흰 채움» 을 재야 한다.
 *      그래서 이 자는 잉크를 **두 벌** 낸다: ⓐ 차분(테 포함) ⓑ 밝은 픽셀(흰 채움만).
 *      배율은 **ⓑ ↔ ref** 로 낸다(같은 것끼리). ⓐ 는 대조용으로 같이 찍는다.
 *   ⚠ 이 갈래를 안 나누면 테 두께 차이(우리 10px ↔ ref 6px)가 배율에 **−13% 쯤** 섞여 들어간다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* 03 카드의 [도전] 버튼은 입장권 0이면 disabled 라 클릭 경로가 없다 — 제품의 진입점을 그대로 부른다 */
const OPEN = ['.tab[data-t="adv"]', 'js:openDunDetail(DUNGEONS[0])'];

const SITES = [
  { key: 'prev', rule: '.dgd-ar i (좌 ◀ · #dgdPrev)', sel: '#dgdPrev>i', ref: { w: 81, h: 84 } },
  { key: 'next', rule: '.dgd-ar i (우 ▶ · #dgdNext)', sel: '#dgdNext>i', ref: { w: 81, h: 84 } },
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
/* ⓐ 차분 잉크 — 그 노드가 «칠한 모든 픽셀»(검정 테 포함) */
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
/* ⓑ 밝은 픽셀 잉크 — 측정표가 ref 를 잰 것과 **같은 방법**(흰 채움만). 그 노드를 껐을 때
   같은 자리가 밝지 않았음을 함께 확인해 배경의 밝은 면을 잉크로 세지 않는다. */
const BRIGHT = async ([a, b, th]) => {
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
    const onBright = A.d[i] >= th && A.d[i + 1] >= th && A.d[i + 2] >= th;
    const offBright = B.d[i] >= th && B.d[i + 1] >= th && B.d[i + 2] >= th;
    if (onBright && !offBright) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, n } : null;
};

(async () => {
  const b = await launch(chromium);
  const calc = await b.newPage(); await calc.setContent('<body></body>');
  const PAD = 90;
  /* `.dgd-body` 바탕이 크림(#F0D9BA = 240,217,186)이라 임계 150 으로는 바탕이 통째로 «밝은 픽셀» 이다.
     흰 채움(255,255,255)만 남기려면 세 채널 모두 235 이상이어야 한다(바탕은 B=186 에서 떨어진다). */
  const BRIGHT_TH = 235;
  console.log('[cal356r12] 04 던전 세부 화살표 두 자리 — 등방(contain) 배율 + 중심 되돌림 역산\n');

  /* ⚠ 자리마다 **새 페이지**로 연다(cal356r7·r11 과 같은 규율) — `transform:none !important` 를
     한 페이지에 쌓으면 다음 자리의 «지금» 값이 앞 자리의 주입에 오염된다. */
  async function openDgd() {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1400);
    for (const q of OPEN) {
      const found = q.startsWith('js:')
        ? await p.evaluate((code) => { try { (0, eval)(code); return true; } catch (e) { return false; } }, q.slice(3))
        : await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, q);
      if (!found) console.log(`  ⚠ 무음 실패 — '${q}'`);
      await p.waitForTimeout(700);
    }
    /* 배너 썸네일이 애니메이션이라(169) 차분 두 장 사이에 몹이 움직이면 잉크가 부푼다 —
       11회차 절전 «라이브 값» · 6회차 `blessTick` 과 같은 자리다. */
    await p.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await p.waitForTimeout(250);
    return p;
  }

  let p = await openDgd();
  /* 헛초록 방지 — 그 화면에 실제로 갔는가(LESSONS 356-⑬) */
  const dg = await p.evaluate(() => {
    const el = document.querySelector('#dgdw');
    if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { w: r.width, h: r.height, disp: cs.display, on: el.classList.contains('on') };
  });
  console.log(`   #dgdw ${dg ? `${dg.w}×${dg.h} display:${dg.disp} .on=${dg.on}` : '✗ 없다'}\n`);
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
    const br = await calc.evaluate(BRIGHT, [on, off, BRIGHT_TH]);
    return {
      all: d && { w: d.w, h: d.h, cx: clip.x + d.x0 + d.w / 2, cy: clip.y + d.y0 + d.h / 2 },
      fill: br && { w: br.w, h: br.h, cx: clip.x + br.x0 + br.w / 2, cy: clip.y + br.y0 + br.h / 2 },
    };
  }

  for (const site of SITES) {
    p = await openDgd();
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
    /* ⚠ 실측이 갈래를 정정했다 — `◀`(U+25C0)는 크로뮴에서 **이모지 글리프**로 그려져
       `color:#fff` 도 `-webkit-text-stroke` 도 안 먹는다(흰 채움 픽셀 **0건**).
       ⇒ «흰 채움 ↔ 흰 채움» 축은 이 자리에서 성립하지 않는다. 남는 정직한 축은
       «그 노드가 칠한 전부(ⓐ) ↔ 측정표의 화살표 bbox 81×84» 뿐이다(§4 의 w·h 칸 자체가 그 값이다). */
    if (!nat.all || !now.all) { console.log(`── ${site.rule}  ✗ 잉크 0 — 차분이 아무것도 못 잡았다\n`); await p.close(); continue; }
    const s = Math.min(ref.w / nat.all.w, ref.h / nat.all.h);
    /* 중심 되돌림은 «차분 잉크»(그 노드가 실제로 칠하는 것 전부)의 중심으로 낸다 —
       사람 눈이 보는 덩어리의 자리는 테를 포함한 것이다. */
    const after = { cx: O.x + s * (nat.all.cx - O.x), cy: O.y + s * (nat.all.cy - O.y) };
    const d = { x: now.all.cx - after.cx, y: now.all.cy - after.cy };

    console.log(`── ${site.rule}`);
    console.log(`   현 transform  ${tf}`);
    console.log(`   상자          ${box.w.toFixed(1)}×${box.h.toFixed(1)} @(${box.x.toFixed(1)},${box.y.toFixed(1)})  O=(${O.x.toFixed(2)}, ${O.y.toFixed(2)})`);
    const fm = (f) => (f ? `${f.w}×${f.h}` : '없음(이모지 글리프 — 흰 채움 0)');
    console.log(`   지금 잉크 ⓐ전부 ${now.all.w}×${now.all.h}  종횡 ${(now.all.w / now.all.h).toFixed(4)}   ⓑ흰채움 ${fm(now.fill)}`);
    console.log(`   자연 잉크 ⓐ전부 ${nat.all.w}×${nat.all.h}  종횡 ${(nat.all.w / nat.all.h).toFixed(4)}   ⓑ흰채움 ${fm(nat.fill)}`);
    console.log(`   재실행 일치   ⓐ${nat2.all.w}×${nat2.all.h} ${(nat2.all.w === nat.all.w && nat2.all.h === nat.all.h) ? '✅' : '❌ 흔들린다'}`);
    console.log(`   ref(화살표 bbox) ${ref.w}×${ref.h}   (종횡 ${(ref.w / ref.h).toFixed(4)})`);
    console.log(`   ⇒ s = ${s.toFixed(5)}   수리 후 잉크 ${(nat.all.w * s).toFixed(1)}×${(nat.all.h * s).toFixed(1)}`);
    console.log(`   ⇒ 중심 되돌림 d = (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`);
    console.log(`   ⇒ transform: translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${s.toFixed(5)})\n`);
    await p.close();
  }

  await b.close();
})();
