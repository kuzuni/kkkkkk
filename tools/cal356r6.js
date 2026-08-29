#!/usr/bin/env node
/* 작업 356 6회차 역산기 — 34 축복 다섯 자리의 «등방 배율» 을 제품에게 물어서 낸다
 *
 *   node tools/cal356r6.js
 *
 * 재현기(probe356r6)가 «지금 얼마나 찌그러졌나» 를 물었다면 이 자는 «그럼 무엇을 적어야 하나» 를
 * 낸다 — 상수를 손으로 고르지 않기 위해서다(작업 341 이 `cap72.js` 에서 쓴 자와 같은 태도:
 * 값은 상수가 아니라 **역산**이다).
 *
 * 자는 356 4·5회차와 **같은 contain** 이다:  s = min(refW/natW, refH/natH)
 * ⚠ contain 은 **배율 불변**이다 — font-size 를 바꿔도 최종 잉크는 같다. 그래서 카드 3장의
 *   font-size 를 140 으로 통일해도 결과가 안 변한다는 것을 이 자가 **직접 재서** 확인한다
 *   (❤️ 의 fs 153 은 «scaleX 로 폭을 되돌리려고» 올려 둔 값이라, 등방으로 가면 뜻을 잃는다).
 *
 * 보너스 바(`#blsBonus`)는 «형제 둘이 한 그림» 이라 그룹 스케일을 각 요소로 나눠 줘야 한다.
 * 바 로컬 좌표에서 group: local' = T + s·local  이므로 요소(L,T₀) 의 자기 변환은
 *     translate(Tx + s·L − L, Ty + s·T₀ − T₀) scale(s)
 * 이고, T 는 «자연 잉크 중심 N 을 ref 중심 C 로 보낸다» 는 한 식에서 나온다:
 *     T = C − B − s·(N − B)          (B = 바 원점의 프레임 좌표)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* probe356r6 과 같은 ref (그 파일 머리말에 출처·검산이 적혀 있다) */
const REF = {
  atk:  { w: 150, h: 153 },
  hp:   { w: 145, h: 154 },
  rate: { w: 132, h: 156 },
  ck:   { w: 33,  h: 39  },
  bn:   { w: 115, h: 117, cx: 195, cy: 1332 },   /* 측정표 §15-3 중심 */
};

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
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, n } : null;
};

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const calc = await b.newPage(); await calc.setContent('<body></body>');

  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
  await p.waitForTimeout(1200);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  await p.evaluate(() => {
    for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
    window.requestAnimationFrame = () => 0;
  });
  await p.waitForTimeout(300);

  const PAD = 70;
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
    return d ? { w: d.w, h: d.h, x0: clip.x + d.x0, y0: clip.y + d.y0 } : null;
  }
  /* 규칙을 임시로 덮고 잉크를 잰 뒤 도로 덮는다 */
  async function inkWith(sel, css) {
    const before = await p.evaluate((s) => {
      const e = document.querySelector(s.split(',')[0].trim());
      return e ? getComputedStyle(e).transform : 'none';
    }, sel);
    await p.addStyleTag({ content: `${sel}{${css}}` });
    await p.waitForTimeout(160);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    const v = await ink(sel);
    return { ink: v, before };
  }

  console.log('[cal356r6] 34 축복 — 등방(contain) 배율 역산\n');

  const CARDS = [
    { key: 'atk',  sel: '#blsC_atk > .b > s.ic',  rule: '#blsC_atk  .ic' },
    { key: 'hp',   sel: '#blsC_hp > .b > s.ic',   rule: '#blsC_hp   .ic' },
    { key: 'rate', sel: '#blsC_rate > .b > s.ic', rule: '#blsC_rate .ic' },
  ];

  const out = [];
  for (const c of CARDS) {
    /* 자연 잉크를 **font-size 140 으로 통일한 상태**에서 잰다 — 세 규칙을 나란하게 만들기 위해서다.
       ❤️ 의 fs 153 이 결과를 안 바꾼다는 것도 같이 확인한다(contain 은 배율 불변). */
    const a = await inkWith(c.sel, 'transform:none !important');            /* 현재 fs, tf 없음 */
    const n140 = await inkWith(c.sel, 'transform:none !important;font-size:140px !important');
    const ref = REF[c.key];
    const sCur = Math.min(ref.w / a.ink.w, ref.h / a.ink.h);
    const s140 = Math.min(ref.w / n140.ink.w, ref.h / n140.ink.h);
    const inkCur = [a.ink.w * sCur, a.ink.h * sCur];
    const ink140 = [n140.ink.w * s140, n140.ink.h * s140];
    out.push({ ...c, ref, a: a.ink, n140: n140.ink, sCur, s140, inkCur, ink140 });
    console.log(`── ${c.rule}`);
    console.log(`   자연(현 fs)    ${a.ink.w}×${a.ink.h}  → contain s=${sCur.toFixed(4)}  잉크 ${inkCur[0].toFixed(1)}×${inkCur[1].toFixed(1)}`);
    console.log(`   자연(fs 140)   ${n140.ink.w}×${n140.ink.h}  → contain s=${s140.toFixed(4)}  잉크 ${ink140[0].toFixed(1)}×${ink140[1].toFixed(1)}`);
    console.log(`   ref            ${ref.w}×${ref.h}`);
    console.log(`   ⇒ fs 통일해도 잉크 차 = ${Math.hypot(ink140[0] - inkCur[0], ink140[1] - inkCur[1]).toFixed(2)}px\n`);
    /* 원복 */
    await p.addStyleTag({ content: `${c.sel}{transform:${a.before} !important;font-size:${c.key === 'hp' ? 153 : 140}px !important}` });
    await p.waitForTimeout(120);
  }

  /* ── ⏱ 시계 ── */
  {
    const sel = '#blsC_atk > .b > s.tm > b.ck';
    const a = await inkWith(sel, 'transform:none !important');
    const ref = REF.ck;
    const s = Math.min(ref.w / a.ink.w, ref.h / a.ink.h);
    console.log(`── .bls-c .tm>b.ck`);
    console.log(`   자연 ${a.ink.w}×${a.ink.h} · ref ${ref.w}×${ref.h} ⇒ s=${s.toFixed(4)} 잉크 ${(a.ink.w * s).toFixed(1)}×${(a.ink.h * s).toFixed(1)}\n`);
    await p.addStyleTag({ content: `${sel}{transform:${a.before} !important}` });
    await p.waitForTimeout(120);
  }

  /* ── 보너스 바 그룹 ── */
  {
    const sel = '#blsBonus > s.ic, #blsBonus > s.ch';
    const bar = await p.evaluate(() => {
      const e = document.querySelector('#blsBonus');
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      /* 로컬 원점 = 패딩박스 좌상단 (자식이 position:absolute 이므로) */
      return { x: r.left + parseFloat(cs.borderLeftWidth), y: r.top + parseFloat(cs.borderTopWidth) };
    });
    /* ⚠ 자연 잉크를 그냥 재면 **잘린 값**이 나온다 — `.bls-bn{height:150px;overflow:hidden}` 이
       transform 을 뗀 순간의 큰 이모지를 바 하변에서 자른다(첫 실행이 144 로 읽었다: 잉크 하변
       1404 = 바 하변과 정확히 일치 = 잘림의 서명). 이 상태로 역산하면 배율이 과대평가돼
       수리 후 높이가 예측(97.4)이 아니라 110 으로 나온다. 그래서 잴 동안만 클립을 연다.
       (356 5회차 비평가 AY 의 «잘림을 늘어남으로 오독» 과 같은 함정, 부호만 반대다) */
    await p.addStyleTag({ content: '.bls-bn{overflow:visible !important}' });
    await p.waitForTimeout(120);
    const a = await inkWith(sel, 'transform:none !important');
    const ref = REF.bn;
    const s = Math.min(ref.w / a.ink.w, ref.h / a.ink.h);
    const N = { x: a.ink.x0 + a.ink.w / 2, y: a.ink.y0 + a.ink.h / 2 };
    const Tx = ref.cx - bar.x - s * (N.x - bar.x);
    const Ty = ref.cy - bar.y - s * (N.y - bar.y);
    const el = await p.evaluate(() => {
      const g = (q) => { const e = document.querySelector(q); const c = getComputedStyle(e); return { L: parseFloat(c.left), T: parseFloat(c.top) }; };
      return { ic: g('#blsBonus>s.ic'), ch: g('#blsBonus>s.ch') };
    });
    console.log(`── #blsBonus (그룹: s.ic + s.ch)`);
    console.log(`   바 원점 B = (${bar.x.toFixed(2)}, ${bar.y.toFixed(2)})`);
    console.log(`   자연 그룹 잉크 ${a.ink.w}×${a.ink.h} @(${a.ink.x0},${a.ink.y0})  중심 N=(${N.x.toFixed(1)}, ${N.y.toFixed(1)})`);
    console.log(`   ref ${ref.w}×${ref.h} 중심 C=(${ref.cx}, ${ref.cy})`);
    console.log(`   ⇒ 등방 s = ${s.toFixed(4)}  잉크 ${(a.ink.w * s).toFixed(1)}×${(a.ink.h * s).toFixed(1)}`);
    console.log(`   ⇒ 그룹 이동 T = (${Tx.toFixed(2)}, ${Ty.toFixed(2)})`);
    for (const [k, v] of Object.entries(el)) {
      const dx = Tx + s * v.L - v.L, dy = Ty + s * v.T - v.T;
      console.log(`     .${k}  (L=${v.L}, T=${v.T})  →  transform:translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${s.toFixed(4)})`);
    }
    await p.addStyleTag({ content: '.bls-bn{overflow:hidden !important}' });
    console.log('');
  }

  console.log('── 붙여 쓸 값 (카드 3장, font-size 140 통일) ──');
  for (const o of out) console.log(`   ${o.rule}{transform:scale(${o.s140.toFixed(4)})}`);

  await b.close();
})();
