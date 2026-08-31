#!/usr/bin/env node
/* 작업 356 16회차 역산기 — 12 소환 결과 [10회/30회 소환] 버튼 젬의 «상자» 를 네 갈래로 갈라 잰다
 *
 *   node tools/cal356r16.js
 *
 * ── 왜 «네 갈래» 인가 ───────────────────────────────────────────────────
 * 15회차는 이 자리를 **래스터 축**(«상자가 소수 55.2016×56.1563»)으로 등재하고 넘겼다.
 * 그런데 그 소수 상자는 **가로만** 소수다 — `.cic` 자신의 상자는 `1.08em × font-size 52`
 * = **56.1563 정사각**이고, 가로를 55.2016 으로 만드는 것은 `.sm-b .gem{transform:scaleX(.983)}`
 * 라는 **선언된 비균등 배율**이다(56.1563 × .983 = 55.2016 — 글자까지 맞는다).
 * ⇒ 이 자리는 래스터가 아니라 **[A]·[S5] 축**이고, 비가 1.7% 라 TOL 0.02 아래여서
 *   [A]·[B] 가 영원히 못 보는 자리다(15회차 «18 묶음» 과 같은 성질).
 *
 * 그래서 배율을 «어떻게» 걷을지와 «상자까지 정수로 밀지» 를 따로 재서 귀속을 가른다:
 *   ⓐ 현행                       scaleX(.983)      · 상자 55.2016×56.1563
 *   ⓑ 397 «작은 쪽으로»          scale(.983)       · 등방(잉크가 세로로 줄어든다)
 *   ⓒ 선언째 삭제                transform 없음    · 상자 56.1563 정사각(소수)
 *   ⓓ 삭제 + 418 «정수 상자»     transform 없음    · 상자 56 정사각(정수)
 *
 * 판정은 두 자로 한다 — ① 잉크 종횡 ÷ 원본 종횡(= 356 의 작업 단위) ② 측정표 12 의 ref 잉크.
 * ⚠ 잉크는 «찍힌 픽셀» 로 잰다(visibility 토글 차분) — 상자가 아니다(350·368 규율).
 * ⚠ 갈래마다 새 페이지로 연다(cal356r7·r11·r15 규율) — `!important` 주입이 다음 갈래를 오염시킨다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PAD = 90;

/* 여는 법은 scan356 SCREENS 의 «12 소환 결과» 와 **같은 제품 진입점**이다(자를 두 벌로 적지 않는다) */
const OPEN = ['js:doSummonFree("skill", 10, true)'];

const SITES = [
  { key: 'sumB10', rule: '#sumB10 젬 (10회 소환)', sel: '#sumB10>.gem>.cic' },
  { key: 'sumB30', rule: '#sumB30 젬 (30회 소환)', sel: '#sumB30>.gem>.cic' },
];

/* 갈래 — css 는 «주입 없음»(null) 이면 제품 그대로 */
const ARMS = [
  { k: 'ⓐ 현행',            css: null },
  { k: 'ⓑ 작은 쪽 scale',   css: (s) => `.sm-b .gem{transform:scale(.983) !important}` },
  { k: 'ⓒ 선언째 삭제',      css: (s) => `.sm-b .gem{transform:none !important}` },
  { k: 'ⓓ 삭제+정수 상자',   css: (s) => `.sm-b .gem{transform:none !important} .sm-b .gem>.cic{width:56px !important;height:56px !important}` },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const NAT = (sel) => {
  const el = document.querySelector(sel);
  if (!el || !el.naturalWidth || !el.naturalHeight) return null;
  return [el.naturalWidth, el.naturalHeight];
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
  console.log('[cal356r16] 12 소환 결과 젬 — 「상자를 무엇이 소수·비정사각으로 만드는가」 네 갈래\n');

  async function open(css) {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1200);
    for (const q of OPEN) {
      const ok = await p.evaluate((code) => { try { (0, eval)(code); return true; } catch (e) { return false; } }, q.slice(3));
      if (!ok) console.log(`  ⚠ 무음 실패 — '${q}' 가 던졌다`);
      await p.waitForTimeout(700);
    }
    /* 연출·타이머가 잉크를 흔들면 차분 두 장이 어긋난다(cal356r11·r15 와 같은 정지) */
    await p.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    if (css) { await p.addStyleTag({ content: css }); await p.waitForTimeout(200); }
    await p.waitForTimeout(250);
    return p;
  }

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

  const base = {};
  for (const arm of ARMS) {
    const p = await open(arm.css ? arm.css() : null);
    console.log(`── ${arm.k}`);
    for (const site of SITES) {
      const r = await p.evaluate(RECT, site.sel);
      if (!r) { console.log(`   ${site.rule}  ✗ 노드 없음 (${site.sel})`); continue; }
      const nat = await p.evaluate(NAT, site.sel);
      const d = await ink(p, site.sel);
      if (!d) { console.log(`   ${site.rule}  ✗ 잉크 0 (차분이 비었다)`); continue; }
      const natR = nat ? nat[0] / nat[1] : 1;
      const dev = (d.w / d.h) / natR - 1;
      if (arm === ARMS[0]) base[site.key] = d;
      const c0 = base[site.key];
      console.log(`   ${site.rule}`);
      console.log(`      상자 ${r.w.toFixed(4)}×${r.h.toFixed(4)} @ (${r.x.toFixed(4)}, ${r.y.toFixed(4)})` +
                  `   원본 ${nat ? nat.join('×') : '?'}`);
      console.log(`      잉크 ${d.w}×${d.h}  종횡 ${(d.w / d.h).toFixed(4)}  ⇒ 원본비 편차 ${(dev * 100).toFixed(2)}%` +
                  `   중심 (${d.cx.toFixed(2)}, ${d.cy.toFixed(2)})` +
                  (c0 && arm !== ARMS[0] ? `  ⇒ 중심 이동 (${(d.cx - c0.cx).toFixed(2)}, ${(d.cy - c0.cy).toFixed(2)})` : ''));
    }
    console.log('');
    await p.close();
  }

  await b.close();
  process.exit(0);
})();
