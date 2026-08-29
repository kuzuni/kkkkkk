#!/usr/bin/env node
/* 작업 356 7회차 역산기 — 남은 세 «아이콘» 자리의 등방 배율을 제품에게 물어서 낸다
 *
 *   node tools/cal356r7.js
 *
 * 자는 356 4·5·6회차와 **같은 contain**:  s = min(refW/natW, refH/natH)
 *
 * 6회차와 다른 점이 하나 있다 — 여기 셋은 전부 «잉크 중심이 요소 상자 중심이 아닌» 자리다
 * (`line-height` 가 `height` 보다 크거나(23 훈련 ⚔️ 205 vs 164), 상자가 정사각인데 그림이 아니거나).
 * `scaleX(k)` 를 `scale(s)` 로 갈면 **세로 배율이 처음 생기므로 잉크 중심이 위로 딸려 올라간다.**
 * 앞 회차들이 ref 에 맞춰 둔 중심을 깨지 않도록, 배율과 함께 **되돌림 이동 d** 를 같이 낸다:
 *
 *     transform: translate(dx,dy) scale(s)        (CSS 는 오른쪽부터 적용 = scale 먼저)
 *     최종 = O + s·(p − O) + d      (O = transform-origin = 요소 상자 중심)
 *     d = C_now − (O + s·(N − O))   (C_now = 지금 잉크 중심 · N = 자연 잉크 중심)
 *
 * ⇒ 폭·높이는 «원본 비율» 로 돌아오고 **중심은 Δ0** 이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* ref — 출처는 전부 index.html 의 그 규칙 바로 위 주석(측정 회차가 적혀 있다)
 *   ⚔️  9489행 «ref 아트 bbox 는 152x151»       (23 훈련 16회차 실측)
 *   💰  9544행 «ref 코인 잉크 53w x 55h»         (23 훈련 18회차 실측)
 *   💎  8476행 «레퍼런스 보석 잉크 92×95»        (33 재화 정보 측정표)                     */
const REF = {
  ci:  { w: 152, h: 151 },
  cb:  { w: 53,  h: 55  },
  gem: { w: 92,  h: 95  },
};

const SITES = [
  { key: 'ci',  rule: '.tr-card>.ci',      sel: '#trCards .tr-card:first-child > .ci',
    open: ['.tab[data-t="grow"]'] },
  { key: 'cb',  rule: '.tr-card>.cb>s',    sel: '#trCards .tr-card:first-child > .cb > s',
    open: ['.tab[data-t="grow"]'] },
  { key: 'gem', rule: '.ci-ic>i (#ciIcon)', sel: '#ciIcon',
    open: ['[data-cur="dia"]'] },
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
  console.log('[cal356r7] 남은 세 자리 — 등방(contain) 배율 + 중심 되돌림 역산\n');

  for (const site of SITES) {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1400);
    for (const q of site.open) {
      await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); }, q);
      await p.waitForTimeout(700);
    }
    /* 재렌더 타이머를 멈춘다 — 6회차 `blessTick` 함정(두 장 사이에 다른 것이 바뀌면 차분이 부푼다) */
    await p.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await p.waitForTimeout(250);

    async function ink(sel) {
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

    const exists = await p.evaluate((s) => !!document.querySelector(s), site.sel);
    if (!exists) { console.log(`── ${site.rule}  ✗ 노드 없음 (${site.sel})\n`); await p.close(); continue; }

    const tf = await p.evaluate((s) => getComputedStyle(document.querySelector(s)).transform, site.sel);
    const box = await p.evaluate(BOX, site.sel);
    const O = { x: box.x + box.w / 2, y: box.y + box.h / 2 };

    const now = await ink(site.sel);                                   /* 지금(비등방) */
    /* 자연 — 규칙을 잠깐 덮는다. `!important` 로 인라인·특이성 전부 이긴다 */
    await p.addStyleTag({ content: `${site.sel}{transform:none !important}` });
    await p.waitForTimeout(160);
    const nat = await ink(site.sel);
    /* 같은 자리를 두 번 재서 같은 값인가 (6회차 상설 항) */
    const nat2 = await ink(site.sel);

    const ref = REF[site.key];
    const s = Math.min(ref.w / nat.w, ref.h / nat.h);
    const after = { cx: O.x + s * (nat.cx - O.x), cy: O.y + s * (nat.cy - O.y) };
    const d = { x: now.cx - after.cx, y: now.cy - after.cy };

    console.log(`── ${site.rule}`);
    console.log(`   현 transform  ${tf}`);
    console.log(`   상자          ${box.w.toFixed(1)}×${box.h.toFixed(1)} @(${box.x.toFixed(1)},${box.y.toFixed(1)})  O=(${O.x.toFixed(2)}, ${O.y.toFixed(2)})`);
    console.log(`   지금 잉크     ${now.w}×${now.h}  중심 (${now.cx.toFixed(2)}, ${now.cy.toFixed(2)})   종횡 ${(now.w / now.h).toFixed(4)}`);
    console.log(`   자연 잉크     ${nat.w}×${nat.h}  중심 (${nat.cx.toFixed(2)}, ${nat.cy.toFixed(2)})   종횡 ${(nat.w / nat.h).toFixed(4)}`);
    console.log(`   재실행 일치   ${nat2.w}×${nat2.h} ${(nat2.w === nat.w && nat2.h === nat.h) ? '✅' : '❌ 흔들린다'}`);
    console.log(`   ref           ${ref.w}×${ref.h}`);
    console.log(`   ⇒ s = ${s.toFixed(5)}   수리 후 잉크 ${(nat.w * s).toFixed(1)}×${(nat.h * s).toFixed(1)}`);
    console.log(`   ⇒ 중심 되돌림 d = (${d.x.toFixed(2)}, ${d.y.toFixed(2)})`);
    console.log(`   ⇒ transform: translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${s.toFixed(5)})\n`);

    await p.close();
  }

  await b.close();
})();
