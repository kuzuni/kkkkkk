#!/usr/bin/env node
/* 작업 356 6회차 재현기 — 34 축복 팝업 아이콘 다섯 자리
 *
 *   node tools/probe356r6.js
 *
 * 왜 재현부터인가(338·341·350 규칙): 5회차가 남긴 «잔여» 표는 이 자리들을 **비율(sx/sy)** 로만
 * 적어 뒀다. 그런데 34 는 «통과한 화면»(17회차 8점)이라, 여기의 scaleX 는 5회차의 03 처럼
 * «ref 에서 멀어지던 손잡이» 가 아니라 **ref 잉크 폭에 맞추려고 일부러 건 보정**일 수 있다.
 * 즉 부호가 아니라 **«이 손잡이를 등방으로 바꾸면 ref 에서 얼마나 멀어지는가»** 가 물음이다.
 *
 * ⚠ 자를 «Range 상자» 로 쓰면 안 된다(5회차는 그래도 됐다 — 03 아이콘은 잉크가 상자를 꽉 채운다).
 *   34 카드 아이콘은 이모지 글리프가 상자보다 작고 **글리프마다 종횡이 다르다**(❤️ 는 납작하고
 *   🌀 는 세로로 길다). 그래서 이 재현기는 **찍힌 픽셀**을 잰다 —
 *   같은 클립을 «보임 / visibility:hidden» 두 번 찍어 차분한다(356 5회차 비평가 AY 의 자).
 *   이웃 잉크가 섞일 수 없고, 줄무늬 배경이 임계값에 붙는 함정(AY 가 캡처 임계 분할을 채점에서
 *   뺀 이유)도 구조적으로 없다.
 *
 * ⚠ 의사요소 애니메이션은 `el.getAnimations()` 에 안 나온다(5회차 AY) —
 *   `document.getAnimations()` 로 전부 pause 한 뒤에 찍는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* ── ref 잉크 bbox ────────────────────────────────────────────────────────────
 * 카드 아이콘 3종은 이 세션이 `scan34.js mask <..> noty` 로 **다시 쟀다**.
 * 옛 기록(review §12-2 12행)은 폭만 «151/145/133» 이고 높이는 ❤️ 154 하나뿐이었다.
 * ⚠ 창을 y1065 까지 열면 **초록 효과값 글자의 윗머리**가 bbox 에 섞여 높이가 166~170 으로 부푼다.
 *   행 프로파일에 y1053..1063 이 완전한 0 구간(빈 띠)이라 창을 y1052 로 닫는 것이 정답이다.
 *   검산: 이렇게 재면 폭이 150/145/132 로 옛 기록(151/145/133)과 ±1 이고,
 *         카드2 높이가 옛 기록의 «❤️ ref 154» 와 **정확히 일치**한다.
 * 좌표는 레퍼런스(1080×2340) 기준 · 프레임 y = ref y − 84.               */
const REF = {
  atk:  { w: 150, h: 153, why: 'scan34 noty x156..305 y900..1052 (⚔️ 카드1)' },
  hp:   { w: 145, h: 154, why: 'scan34 noty x472..616 y898..1051 (❤️ 카드2) — 옛 기록 «ref 154» 와 일치' },
  rate: { w: 132, h: 156, why: 'scan34 noty x789..920 y896..1051 (🌀 카드3)' },
  ck:   { w: 33,  h: 39,  why: '측정표 34 §14 «시계 잉크 bbox 33×39, 세로 중심 1093»' },
  bn:   { w: 115, h: 117, why: '측정표 34 §15-3 «ref 잉크 x138..252 (115) × y1274..1390 (117)»' },
};

/* 자리 — css 는 «내가 고칠 규칙» · sel 은 «잴 노드» */
const SITES = [
  { key: 'atk',  css: '#blsC_atk  .ic',        sel: '#blsC_atk > .b > s.ic' },
  { key: 'hp',   css: '#blsC_hp   .ic',        sel: '#blsC_hp > .b > s.ic' },
  { key: 'rate', css: '#blsC_rate .ic',        sel: '#blsC_rate > .b > s.ic' },
  { key: 'ck',   css: '.bls-c .tm>b.ck',       sel: '#blsC_atk > .b > s.tm > b.ck' },
  /* 보너스 바는 «형제 둘이 한 그림» 이다 — 이모지 .ic + CSS 셰브론 .ch.
     ref 115×117 은 그 **둘의 합** bbox 라 잴 때도 둘을 같이 숨긴다. */
  { key: 'bn',   css: '#blsBonus>s.ic',        sel: '#blsBonus > s.ic, #blsBonus > s.ch', group: true },
];

/* ── 페이지 안에서 도는 헬퍼 ─────────────────────────────────────────────── */
const VIS = ([sel, v]) => {
  for (const el of document.querySelectorAll(sel)) el.style.visibility = v;
};
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

/* 두 PNG 를 캔버스로 디코드해 «달라진 픽셀» 의 bbox 를 낸다 (별도 페이지에서 돈다) */
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
  const calc = await b.newPage();
  await calc.setContent('<body></body>');

  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
  await p.waitForTimeout(1200);

  /* 진입 확인 — 클릭이 조용히 실패하면 «다른 화면» 을 재고 초록을 준다(LESSONS 356-⑬) */
  const seen = await p.evaluate(() => ({
    cards: document.querySelectorAll('.bls-c').length,
    open: !!document.querySelector('#blsw.on, .modal.on #blsCards, #blsCards'),
  }));

  /* 애니메이션 전부 정지 — 의사요소까지 (LESSONS 356 5회차 AY) */
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  /* ⚠ 그것만으로는 부족했다 — 이 화면은 `blessTick()` 이 **1초마다 팝업을 다시 그린다**(index.html
     `setInterval(blessTick, 1000)`). 차분 두 장 사이에 그 재렌더가 끼면 «달라진 픽셀» 에 타이머 숫자와
     재그린 카드가 통째로 섞여 잉크가 실제의 2배로 읽힌다(1차 실행이 🌀 를 285×227 로 읽었다).
     그래서 타이머·rAF 를 통째로 세우고 잰다. */
  await p.evaluate(() => {
    for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
    window.requestAnimationFrame = () => 0;
  });
  await p.waitForTimeout(300);

  const PAD = 60;
  const shot = async (clip) => (await p.screenshot({ clip })).toString('base64');

  /* 한 자리의 «찍힌 잉크» 를 잰다 — 보임/숨김 차분 */
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
    return d ? { w: d.w, h: d.h, n: d.n, nodes: r.n, x0: clip.x + d.x0, y0: clip.y + d.y0 } : null;
  }

  /* 자가 흔들리지 않는지 — 같은 자리를 두 번 재서 같은 값이 나와야 한다.
     (차분법의 유일한 실패 모드가 «두 장 사이에 다른 것이 바뀜» 이라 이 항이 그것을 잡는다) */
  async function inkTwice(sel) {
    const a = await ink(sel);
    const b2 = await ink(sel);
    return { ...a, stable: !!a && !!b2 && a.w === b2.w && a.h === b2.h, second: b2 };
  }

  let pass = 0, fail = 0;
  const ck = (n, got, want) => {
    const ok = String(got) === String(want);
    ok ? pass++ : fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : `   got ${got} / want ${want}`}`);
  };

  console.log('[probe356r6] 34 축복 아이콘 — 자연 ↔ 그려짐 ↔ ref  (찍힌 픽셀 차분)\n');
  console.log(`  진입 확인: .bls-c 카드 ${seen.cards}장\n`);

  const plan = {};
  for (const s of SITES) {
    const now = await inkTwice(s.sel);
    if (!now) { console.log(`  (없음) ${s.css}\n`); continue; }

    const tf = await p.evaluate((sel) => {
      const e = document.querySelector(sel.split(',')[0].trim());
      return e ? getComputedStyle(e).transform : '';
    }, s.sel);

    /* transform 을 떼고 자연 잉크 — 그룹 자리는 형제까지 같이 뗀다 */
    await p.addStyleTag({ content: `${s.sel}{transform:none !important}` });
    await p.waitForTimeout(150);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    const nat = await inkTwice(s.sel);
    /* 원복 — addStyleTag 는 못 지우므로 나중 규칙으로 도로 덮는다 */
    await p.addStyleTag({ content: `${s.sel}{transform:${tf} !important}` });
    await p.waitForTimeout(150);

    const ref = REF[s.key];
    const sFit = Math.min(ref.w / nat.w, ref.h / nat.h);
    plan[s.key] = { now, nat, ref, sFit: +sFit.toFixed(4), tf };

    console.log(`── ${s.css}   (노드 ${now.nodes}개)   ${tf}`);
    console.log(`   지금 그려짐  ${now.w}×${now.h}   종횡 ${(now.w / now.h).toFixed(3)}   @(${now.x0},${now.y0})  재실행 일치 ${now.stable}`);
    console.log(`   자연(tf 뗌)  ${nat.w}×${nat.h}   종횡 ${(nat.w / nat.h).toFixed(3)}   @(${nat.x0},${nat.y0})  재실행 일치 ${nat.stable}`);
    console.log(`   ref          ${ref.w}×${ref.h}   종횡 ${(ref.w / ref.h).toFixed(3)}   ${ref.why}`);
    console.log(`   ⇒ contain 등방 s = min(${(ref.w / nat.w).toFixed(4)}, ${(ref.h / nat.h).toFixed(4)}) = ${sFit.toFixed(4)}`);
    console.log(`     그 배율의 잉크 = ${(nat.w * sFit).toFixed(1)}×${(nat.h * sFit).toFixed(1)}`);
    console.log(`     지금 잉크의 ref 대비 = 폭 ${((now.w / ref.w - 1) * 100).toFixed(1)}% · 높이 ${((now.h / ref.h - 1) * 100).toFixed(1)}%\n`);
  }

  /* ── 단언 ── */
  console.log('[전제] 축복 팝업에 실제로 들어갔다 (헛초록 방지 · LESSONS 356-⑬)');
  ck('축복 카드 3장', seen.cards, 3);
  ck('다섯 자리를 전부 쟀다', Object.keys(plan).length, 5);

  console.log('\n[A] 다섯 자리가 실제로 비균등이다 (잔여 표 재현)');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(plan[k].tf);
    const r = m ? Math.abs(+m[1] / +m[4] - 1) : 0;
    ck(`${k} 누적 transform 이 비균등 (|sx/sy−1| = ${r.toFixed(3)})`, r > 0.02, true);
  }

  console.log('\n[B] contain 배율은 «키우지 않는다» — ref 상자를 안 넘는다(넘치면 잘린다)');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    ck(`${k} 잉크가 ref 상자 안`,
      plan[k].nat.w * plan[k].sFit <= plan[k].ref.w + 0.5 &&
      plan[k].nat.h * plan[k].sFit <= plan[k].ref.h + 0.5, true);
  }

  console.log('\n[C] 부호 — 지금 손잡이가 ref 에 «가까워지는» 쪽인가 «멀어지는» 쪽인가');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    const dNow = Math.hypot(q.now.w - q.ref.w, q.now.h - q.ref.h);
    const dFit = Math.hypot(q.nat.w * q.sFit - q.ref.w, q.nat.h * q.sFit - q.ref.h);
    console.log(`  ${k}: 지금 ref 거리 ${dNow.toFixed(1)}px · contain 후 ${dFit.toFixed(1)}px` +
      `  → ${dFit <= dNow ? '등방이 ref 에 더 가깝거나 같다' : `등방이 ${(dFit - dNow).toFixed(1)}px 멀어진다 (아트 대기 자리)`}`);
  }

  console.log(`\n[probe356r6] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
