#!/usr/bin/env node
/* 작업 356 15회차 역산기 — «사건이 있어야 뜨는 화면» 세 자리의 등방 배율 + 중심 되돌림
 *
 *   node tools/cal356r15.js
 *
 * 자는 397 처방 그대로다 — **«작은 쪽으로»**  s = min(sx, sy).
 *   (ROUTINE 397 절: «나온 자리를 «작은 쪽으로»(s = min(sx,sy)) 고치고». 4·5·6·7·11회차의
 *    contain 은 «그 아이콘의 ref 잉크» 가 표에 있을 때 쓰는 자이고, 여기 셋 중 그 값이 있는 것은
 *    17 하나다 — 그리고 **17 은 두 자가 같은 답을 준다**: ref 아트 잉크 144×166 · 이모지 자연
 *    잉크 167×166 ⇒ contain = min(144/167, 166/166) = 0.862 ≈ min(.86, 1). 그래서 이 회차는
 *    자를 하나로 쓴다. 두 자가 갈리는 자리가 나오면 그때 갈라 적는다.)
 *
 * 중심 되돌림 — `scaleX(k)` 를 `scale(s)` 로 갈면 **없던 세로 배율이 생겨** 잉크가 상자 중심 쪽으로
 * 딸려 온다(cal356r7 머리글 · 7회차 23 훈련 ⚔️ 가 그 자리였다). 그래서 배율만 갈고 끝내지 않고
 *   ① 갈기 전 잉크 중심 C0 를 재고 ② 새 배율만 주입해 C1 을 잰 뒤 ③ d = C0 − C1 을 앞에 붙인다.
 *   ④ 붙인 값을 **다시 주입해 재서** 중심이 실제로 되돌아왔는지 확인한다(추정으로 안 적는다).
 *
 * ⚠ 잉크는 «찍힌 픽셀» 로 잰다(visibility 토글 차분) — 상자가 아니다. 350·368 규율.
 * ⚠ 자리마다 새 페이지로 연다(cal356r7·r11 규율) — `!important` 주입이 다음 자리를 오염시킨다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PAD = 90;

/* 여는 법은 probe356r15 와 같은 제품 진입점이다(자를 두 벌로 적지 않는다는 규율의 연장) */
const SITES = [
  { key: '01', rule: '.ofr-fr b (01 오프라인 보상 코인)', sel: '#offw .ofr-fr b',
    open: ['js:offlineReward(Date.now() - 3600e3)'], keep: '' },
  { key: '17', rule: '.st-icon>b (17 스탯업 ⚔️)', sel: '#statw #stIc',
    open: ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })'], keep: '' },
  { key: '18', rule: '.df-ic .fl (18 패배 카드2 🔥)', sel: '#defw .df-card.c2 .df-ic>b.fl',
    open: ['js:openDefeat()'], keep: 'translateX(-50%)' },
  { key: '18g', rule: '.df-card.c2 .df-ic (18 패배 카드2 아이콘 묶음)', sel: '#defw .df-card.c2 .df-ic',
    open: ['js:openDefeat()'], keep: 'translate(10.5px,-1.5px)' },
];

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.visibility = v; };
const RECT = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
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
  console.log('[cal356r15] «사건이 있어야 뜨는 화면» 네 자리 — 등방 배율(작은 쪽) + 중심 되돌림\n');

  async function open(site) {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1200);
    for (const q of site.open) {
      const ok = await p.evaluate((code) => { try { (0, eval)(code); return true; } catch (e) { return false; } }, q.slice(3));
      if (!ok) console.log(`  ⚠ 무음 실패 — '${q}' 가 던졌다`);
      await p.waitForTimeout(700);
    }
    /* 연출·타이머가 잉크를 흔들면 차분 두 장이 어긋난다(cal356r11 과 같은 정지) */
    await p.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
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

  for (const site of SITES) {
    let p = await open(site);
    const exists = await p.evaluate((s) => !!document.querySelector(s), site.sel);
    if (!exists) { console.log(`── ${site.rule}  ✗ 노드 없음 (${site.sel})\n`); await p.close(); continue; }

    const tf = await p.evaluate((s) => getComputedStyle(document.querySelector(s)).transform, site.sel);
    const m = tf.match(/^matrix\(([^)]+)\)/);
    const v = m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
    const sx = Math.hypot(v[0], v[1]), sy = Math.hypot(v[2], v[3]);
    const s = Math.min(sx, sy);

    const c0 = await ink(p, site.sel);
    await p.close();

    /* ② 새 배율만 주입 */
    p = await open(site);
    const T1 = `${site.keep} scale(${s.toFixed(5)})`.trim();
    await p.addStyleTag({ content: `${site.sel}{transform:${T1} !important}` });
    await p.waitForTimeout(200);
    const c1 = await ink(p, site.sel);
    await p.close();

    const d = { x: c0.cx - c1.cx, y: c0.cy - c1.cy };

    /* ④ 되돌림을 붙여 다시 잰다 — 추정으로 적지 않는다 */
    p = await open(site);
    const T2 = `${site.keep ? site.keep + ' ' : ''}translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${s.toFixed(5)})`;
    await p.addStyleTag({ content: `${site.sel}{transform:${T2} !important}` });
    await p.waitForTimeout(200);
    const c2 = await ink(p, site.sel);
    await p.close();

    console.log(`── ${site.rule}`);
    console.log(`   현 transform   ${tf}   ⇒ sx ${sx.toFixed(4)} · sy ${sy.toFixed(4)} · 종횡 ${(sx / sy).toFixed(4)}`);
    console.log(`   지금 잉크      ${c0.w}×${c0.h}  중심 (${c0.cx.toFixed(2)}, ${c0.cy.toFixed(2)})   종횡 ${(c0.w / c0.h).toFixed(4)}`);
    console.log(`   s = min        ${s.toFixed(5)}`);
    console.log(`   배율만         ${c1.w}×${c1.h}  중심 (${c1.cx.toFixed(2)}, ${c1.cy.toFixed(2)})  ⇒ 중심 이동 (${(c1.cx - c0.cx).toFixed(2)}, ${(c1.cy - c0.cy).toFixed(2)})`);
    console.log(`   되돌림 d       (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`);
    console.log(`   확인 재측정    ${c2.w}×${c2.h}  중심 (${c2.cx.toFixed(2)}, ${c2.cy.toFixed(2)})  ⇒ 잔차 (${(c2.cx - c0.cx).toFixed(2)}, ${(c2.cy - c0.cy).toFixed(2)})`);
    console.log(`   ⇒ transform: ${T2}\n`);
  }

  await b.close();
  process.exit(0);
})();
