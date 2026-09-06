#!/usr/bin/env node
/* 작업 948 — 안내문 위:아래 여백 비의 **과녁·대역을 정하는 재현기**.
 *
 *   node tools/probe948.js            # 다섯 프레임 + 레퍼런스, 정수 ↔ 부분 화소를 나란히
 *   node tools/probe948.js --json
 *
 * ── 왜 또 재현기인가 ────────────────────────────────────────────────────────
 * 932 7회차가 `scan887` 을 **부분 화소**로 갈자 이 자리의 두 수가 갈라졌다:
 *   · 정수 걸음   — ref 0.750 · 우리 다섯 중 넷 0.750 · 1600 만 0.714  («1600 이 이상치»)
 *   · 부분 화소   — ref 0.7338 · 1600 0.7393(+0.7%) · 나머지 넷 0.7748(+5.6%)  («1600 이 가깝다»)
 * 과녁 `REF_RATIO = 0.750` 은 **정수 두 개(위 12 : 아래 9 ref px)의 비**이고,
 * 대역 `[0.67, 0.83]` 의 근거는 «±1 눈금»(= 정수 격자의 한 칸)인데 **부분 화소에는 그 칸이 없다.**
 * ⇒ 과녁도 대역도 정수 격자 위에서 세워진 값이라 다시 세워야 한다(등재문 948).
 *
 * ── 이 자가 새로 재는 것 ────────────────────────────────────────────────────
 * `scan887` 은 **화소**만 본다. 이 자는 거기에 **상자 축**(DOM)을 붙여 세 가지를 잰다:
 *   ① T  = 12 + `--rw-g3`  (안내문이 나눠 쓰는 총량 · 상자 축)
 *   ② I  = `--rw-i`        (그 총량 중 «아래» 몫 · 제품이 실제로 쓰는 값)
 *   ③ A  = 화소 위 − 상자 위(T − I) · B = 화소 아래 − 상자 아래(I)   ← **거울 오프셋**
 * `--rw-i` 의 어파인 계수는 이 A·B 에서 유도된 값이다(index.html 905 주석):
 *      I = r/(1+r)·T + (r·A − B)/(1+r)
 * 그래서 **A·B 를 정수로 재면 계수도 정수 격자 위에 선다** — 지금 심긴 .4286·T + 1.21 이 그것이다.
 *
 * ── 이 자가 답하는 물음 셋 ──────────────────────────────────────────────────
 *   [1] A·B 는 프레임마다 같은 값인가 — 같아야 «한 계수» 가 다섯 프레임을 전부 과녁에 세운다.
 *   [2] 정수 A·B ↔ 부분 화소 A·B 의 차가 곧 «정수 격자가 만든 착시» 인가.
 *   [3] 부분 화소 과녁 r 로 계수를 다시 뽑으면 다섯 프레임이 **전부** 대역 안에 드는가.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { launch } = require('./pwlaunch.js');
const { py } = require('./pydep937.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'shots');
const URL = 'file://' + path.join(ROOT, 'index.html');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const TH = '110';                     /* 잉크 문턱 — 스윕은 아래 [2] 가 따로 찍는다 */
const JSON_ONLY = process.argv.includes('--json');

/* 상자 축 — 제품이 실제로 쓰는 두 값(T·I)과 그 분할 */
const MEASURE = () => {
  /* ⚠ 커스텀 속성은 `getComputedStyle().getPropertyValue()` 로는 **계산 전 토큰**이 나온다
     (`clamp(...)` 문자열 그대로 → parseFloat 이 NaN). 값을 «높이» 로 그려서 되잰다. */
  const host = document.querySelector('#relw .rw-panel');   /* 두 변수는 `.rw-panel` 에 선언돼 있다
     (`#relw` 에는 `--rwc` 만 있다). `.rw-cap` 안에 넣으면 `transform:scale(var(--rwc))` 가
     한 번 더 걸려 두 번 곱해진다 — 그래서 호스트는 «선언한 자리» 인 패널이다. */
  const px = (expr) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:' + expr;
    host.appendChild(d);
    const h = d.getBoundingClientRect().height;
    d.remove();
    return h;
  };
  const g3 = px('var(--rw-g3)'), i = px('var(--rw-i)'), rwc = px('calc(100px * var(--rwc,1))') / 100;
  const R = (s) => document.querySelector(s).getBoundingClientRect();
  const p = R('#relw .rw-bowl') || R('#relw .rw-panel');
  const mid = R('#relw .rw-mid');
  const lines = [...document.querySelectorAll('#relw .rw-cap p')].map(el => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const b = rg.getBoundingClientRect();
    return { y1: b.top, y2: b.bottom };
  });
  return { rwc: +rwc.toFixed(4), g3: +g3.toFixed(3), i: +i.toFixed(3), T: +(12 * rwc + g3).toFixed(3),
           boxUp: +(12 * rwc + g3 - i).toFixed(3), boxDn: +i.toFixed(3),
           visAbove: +(lines[0].y1 - mid.bottom).toFixed(2),
           visGap: +(p.bottom - lines[lines.length - 1].y2).toFixed(2) };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const dom = {};
  for (const fh of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(650);
    await page.evaluate(`try{ openRelw() }catch(e){ window.__e = String(e && e.message || e) }`);
    await page.waitForTimeout(460);
    await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    dom[fh] = await page.evaluate(MEASURE);
    const el = await page.$('#app');
    await (el || page).screenshot({ path: path.join(OUT, `887-${fh}.png`) });
    await ctx.close();
  }
  await browser.close();

  /* ── [4] 위상 스윕 — **대역의 근거를 «자 자신의 재현성» 에서 뽑는다.** ──
     `#relw` 를 통째로 δ px 내린다. 위·아래 두 끝점이 **같이** 내려가므로 참 여백은 Δ0 이고,
     달라지는 것은 화소 격자에 대한 **위상**뿐이다. 그런데도 부분 화소 추정기가 다른 값을 내면
     그 폭이 곧 «이 자가 같은 기하를 두 번 재도 다르게 나오는 양» = 대역이 감당해야 할 최소 폭이다.
     (정수 걸음에는 이 축이 없다 — 정수는 위상을 통째로 버려서 «안 흔들리는 것처럼» 보인다.) */
  const PH = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
  const PHF = 2280;
  const phShots = [];
  {
    const br = await launch(chromium);
    for (const d of PH) {
      const ctx = await br.newContext({ viewport: { width: 1080, height: PHF }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(650);
      await page.evaluate(`try{ openRelw() }catch(e){}`);
      await page.waitForTimeout(460);
      await page.evaluate((dy) => {
        const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
        document.getElementById('relw').style.transform = 'translateY(' + dy + 'px)';
      }, d);
      await page.waitForTimeout(120);
      const p = path.join(OUT, `948-ph${String(d).replace('.', 'p')}.png`);
      const el = await page.$('#app');
      await (el || page).screenshot({ path: p });
      phShots.push(p);
      await ctx.close();
    }
    await br.close();
  }

  const raw = py([path.join(__dirname, 'scan887.py'), '--json',
    ...FRAMES.map(H => path.join(OUT, `887-${H}.png`)), ...phShots],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const S = JSON.parse(raw.slice(raw.indexOf('{')));

  const refT = S.ref.th[TH];
  const K = S.ref.k;                                   /* ref px → 프레임 px 환산 */
  const ref = {
    int:  { up: refT.up * K, dn: refT.down.B3 * K, r: refT.down.B3 / refT.up },
    sub:  { up: refT.sub.up * K, dn: refT.sub.down.B3 * K, r: refT.sub.ratio.B3 },
    sweep: Object.keys(S.ref.th).map(t => S.ref.th[t].sub.ratio.B3),
  };

  const rows = FRAMES.map((H, i) => {
    const c = S.caps[i].th[TH], d = dom[H];
    return { H, ...d,
      intUp: c.up, intDn: c.down.B3, intR: c.ratio.B3,
      subUp: c.sub.up, subDn: c.sub.down.B3, subR: c.sub.ratio.B3,
      A_int: +(c.up - d.boxUp).toFixed(3),  B_int: +(c.down.B3 - d.boxDn).toFixed(3),
      A_sub: +(c.sub.up - d.boxUp).toFixed(3), B_sub: +(c.sub.down.B3 - d.boxDn).toFixed(3),
      sweep: Object.keys(S.caps[i].th).map(t => S.caps[i].th[t].sub.ratio.B3),
    };
  });

  /* ── [3] 부분 화소 과녁으로 계수를 다시 뽑는다 ──
     I = r/(1+r)·T + (r·A − B)/(1+r) · A·B 는 **부분 화소** 거울 오프셋의 프레임 평균 */
  const r = ref.sub.r;
  const A = rows.reduce((s, x) => s + x.A_sub, 0) / rows.length;
  const B = rows.reduce((s, x) => s + x.B_sub, 0) / rows.length;
  const k1 = r / (1 + r), k2 = (r * A - B) / (1 + r);
  const pred = rows.map(x => {
    const I = k1 * x.T + k2;
    const up = x.T - I + x.A_sub, dn = I + x.B_sub;
    return { H: x.H, I: +I.toFixed(3), dI: +(I - x.i).toFixed(3), up: +up.toFixed(3), dn: +dn.toFixed(3), r: +(dn / up).toFixed(4) };
  });

  const phase = PH.map((d, i) => {
    const q = S.caps[FRAMES.length + i], c = q.th[TH];
    /* δ 를 빼서 «움직이지 않았어야 할 자리» 로 되돌려 놓고 본다 — 남는 것이 곧 자의 흔들림 */
    return { d, up: c.sub.up, dn: c.sub.down.B3, r: c.sub.ratio.B3, intR: c.ratio.B3,
             base: +(c.sub.base - d).toFixed(3), inkT: +(c.sub.ink_top - d).toFixed(3),
             inkB: +(c.sub.ink_bot - d).toFixed(3), dark: +(q.border.dark_top_f - d).toFixed(3) };
  });
  const phR = phase.map(p => p.r), phI = phase.map(p => p.intR);
  const phAmp = Math.max(...phR) - Math.min(...phR);

  const out = { ref, rows, phase, phAmp: +phAmp.toFixed(4),
    fit: { r: +r.toFixed(4), A: +A.toFixed(3), B: +B.toFixed(3), k1: +k1.toFixed(4), k2: +k2.toFixed(3) }, pred };
  if (JSON_ONLY) { console.log(JSON.stringify(out, null, 1)); return; }

  const f = (v, n = 3) => (v === undefined || v === null ? '—' : Number(v).toFixed(n));
  console.log('PROBE948 — 안내문 위:아래 여백 비 · 정수 걸음 ↔ 부분 화소 (문턱 ' + TH + ' · 끝점 U3/B3)\n');
  console.log('■ 레퍼런스 (docs/ref/89-유물-팝업.png · 환산 ×' + f(K) + ')');
  console.log('    정수     위 ' + f(ref.int.up, 2) + ' · 아래 ' + f(ref.int.dn, 2) + ' 프레임px · 비 ' + f(ref.int.r, 4));
  console.log('    부분화소  위 ' + f(ref.sub.up, 2) + ' · 아래 ' + f(ref.sub.dn, 2) + ' 프레임px · 비 ' + f(ref.sub.r, 4));
  console.log('    문턱 90/110/140 스윕 — ' + ref.sweep.map(v => f(v, 4)).join(' / ') +
              '  (폭 ' + f((Math.max(...ref.sweep) - Math.min(...ref.sweep)) / ref.sub.r * 100, 2) + '%)\n');

  console.log('■ 제품 다섯 프레임 — 상자 축(T·I)과 화소 축을 나란히');
  console.log('    프레임   rwc    g3      T       I(rw-i)  상자위   상자아래 | 정수 위/아래  비      | 부분화소 위/아래   비');
  for (const x of rows) {
    console.log('    ' + String(x.H).padEnd(7) + f(x.rwc, 3).padStart(6) + f(x.g3, 2).padStart(6) + f(x.T, 2).padStart(8) +
      f(x.i, 2).padStart(9) + f(x.boxUp, 2).padStart(9) + f(x.boxDn, 2).padStart(9) + ' | ' +
      (x.intUp + '/' + x.intDn).padStart(9) + f(x.intR, 4).padStart(9) + '  | ' +
      (f(x.subUp, 2) + '/' + f(x.subDn, 2)).padStart(14) + f(x.subR, 4).padStart(9));
  }
  console.log('\n■ [1]·[2] 거울 오프셋 A(위) · B(아래) — «화소 − 상자»');
  console.log('    프레임      A 정수    B 정수  |   A 부분화소   B 부분화소');
  for (const x of rows) {
    console.log('    ' + String(x.H).padEnd(10) + f(x.A_int, 2).padStart(8) + f(x.B_int, 2).padStart(9) + '  | ' +
      f(x.A_sub, 3).padStart(11) + f(x.B_sub, 3).padStart(12));
  }
  const spread = (k) => { const v = rows.map(x => x[k]); return Math.max(...v) - Math.min(...v); };
  console.log('    폭(최대−최소) — A 정수 ' + f(spread('A_int'), 3) + ' · B 정수 ' + f(spread('B_int'), 3) +
              ' | A 부분화소 ' + f(spread('A_sub'), 3) + ' · B 부분화소 ' + f(spread('B_sub'), 3));

  /* ── [5] `verify813` [3] 의 거울 두 상수 — 그 자는 `visAbove`/`visGap`(또 다른 상자 축)에
     정수 축 거울(위 +0.7 · 아래 −3)을 더해 화소를 흉내 낸다. 과녁이 부분 화소로 가면
     **이 거울도 같이 가야 한다** — 안 그러면 자 하나가 옛 축에 남아 [3] 이 딴 값을 말한다. */
  console.log('\n■ [5] `verify813` [3] 의 거울 — visAbove/visGap ↔ 화소');
  console.log('    프레임    visAbove  visGap  |  화소위−visAbove   화소아래−visGap   (지금 심긴 값: +0.7 / −3)');
  for (const x of rows) {
    console.log('    ' + String(x.H).padEnd(9) + f(x.visAbove, 2).padStart(8) + f(x.visGap, 2).padStart(9) +
      '  | ' + f(x.subUp - x.visAbove, 3).padStart(13) + f(x.subDn - x.visGap, 3).padStart(17));
  }
  const mUp = rows.map(x => x.subUp - x.visAbove), mDn = rows.map(x => x.subDn - x.visGap);
  console.log('    부분 화소 거울 평균 — 위 ' + f(mUp.reduce((a, b) => a + b) / mUp.length, 3) +
    ' (폭 ' + f(Math.max(...mUp) - Math.min(...mUp), 3) + ') · 아래 ' +
    f(mDn.reduce((a, b) => a + b) / mDn.length, 3) + ' (폭 ' + f(Math.max(...mDn) - Math.min(...mDn), 3) + ')');

  console.log('\n■ [4] 위상 스윕 — `#relw` 를 δ px 통째로 내린다(참 여백 Δ0 · 화소 위상만 바뀐다) · 프레임 ' + PHF);
  console.log('    δ px      부분화소 위/아래       비        정수 비  |  δ 를 뺀 네 끝점(움직이지 않았어야 한다)');
  for (const p of phase) {
    console.log('    ' + f(p.d, 3).padEnd(9) + (f(p.up, 3) + '/' + f(p.dn, 3)).padStart(16) +
      f(p.r, 4).padStart(10) + f(p.intR, 4).padStart(11) + '  |  밑판 ' + f(p.base, 3) +
      ' · 잉크 ' + f(p.inkT, 3) + '..' + f(p.inkB, 3) + ' · 테두리 ' + f(p.dark, 3));
  }
  console.log('    ⇒ 부분 화소 비의 진폭 ' + f(phAmp, 4) + ' (과녁의 ' + f(phAmp / r * 100, 2) + '%)' +
              ' · 정수 비의 진폭 ' + f(Math.max(...phI) - Math.min(...phI), 4) +
              ' (' + f((Math.max(...phI) - Math.min(...phI)) / 0.75 * 100, 2) + '%)');

  console.log('\n■ [3] 부분 화소 과녁 r=' + f(r, 4) + ' 로 계수를 다시 뽑으면 (A=' + f(A, 3) + ' · B=' + f(B, 3) + ')');
  console.log('    I = ' + f(k1, 4) + '·T + ' + f(k2, 3) + '        (지금 심긴 값: .4286·T + 1.21)');
  console.log('    프레임    새 I     ΔI      → 화소 위/아래        새 비');
  for (const p of pred) {
    console.log('    ' + String(p.H).padEnd(8) + f(p.I, 2).padStart(7) + f(p.dI, 2).padStart(8) + '   ' +
      (f(p.up, 2) + '/' + f(p.dn, 2)).padStart(14) + f(p.r, 4).padStart(10));
  }
  const rr = pred.map(p => p.r);
  console.log('    새 비의 폭 — ' + f(Math.min(...rr), 4) + ' ~ ' + f(Math.max(...rr), 4) +
              '  (과녁 대비 ' + f((Math.min(...rr) / r - 1) * 100, 2) + '% ~ ' + f((Math.max(...rr) / r - 1) * 100, 2) + '%)');
})();
