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

/* 자리 — css 는 «내가 고칠 규칙» · sel 은 «잴 노드» · old 는 **수리 전 선언**이다.
   ⚠ 재현기는 «지금 상태를 읽어» 부호를 물으면 안 된다 — 수리하는 순간 그 물음이 사라져
   다음 세션에게 아무것도 안 남긴다(5회차 [R4] 가 음성항을 따로 세운 것과 같은 이유).
   그래서 이 자는 수리 전 값을 **주입해서** 재현하고, 지금 값은 따로 [D] 에서 잰다. */
/* ⚑ **394 이관(2026-08-29) — `axis`** : 카드 3장만 눈금이 «폭(contain)» 에서 «높이» 로 바뀌었다.
   ref 잉크가 폭 150/145/132(13.6% 갈림) · 높이 153/154/156(2.0% 안)이라 이 화면이 고정해 둔 축은
   높이인데 contain 이 그 반대를 물고 있었다(세로 덩치 최대÷최소 1.128 → 1.013). 등방은 그대로다.
   ⚠ 이 자를 «contain 하나» 로 되돌리면 [E]·[F] 가 394 를 결함으로 읽는다 — 눈금은 자리마다 다르다.
   ⏱·보너스 바는 형제 집합이 아니라 **contain 그대로**다. 근거·재현은 `probe394`·`verify394`. */
const SITES = [
  { key: 'atk',  css: '#blsC_atk  .ic',  sel: '#blsC_atk > .b > s.ic',  axis: 'h',
    old: 'transform:scaleX(.974) !important;font-size:140px !important' },
  { key: 'hp',   css: '#blsC_hp   .ic',  sel: '#blsC_hp > .b > s.ic',   axis: 'h',
    old: 'transform:scaleX(.858) !important;font-size:153px !important' },
  { key: 'rate', css: '#blsC_rate .ic',  sel: '#blsC_rate > .b > s.ic', axis: 'h',
    old: 'transform:scaleX(.875) !important;font-size:140px !important' },
  { key: 'ck',   css: '.bls-c .tm>b.ck', sel: '#blsC_atk > .b > s.tm > b.ck',
    old: 'transform:scaleX(.97) !important' },
  /* 보너스 바는 «형제 둘이 한 그림» 이다 — 이모지 .ic + CSS 셰브론 .ch.
     ref 115×117 은 그 **둘의 합** bbox 라 잴 때도 둘을 같이 숨기고, 주입도 둘에 같이 건다.
     (형제라 translate 가 서로 다르지만 **비균등이라는 성질**은 scale 부분에만 있다) */
  { key: 'bn',   css: '#blsBonus>s.ic',  sel: '#blsBonus > s.ic, #blsBonus > s.ch', group: true,
    oldEach: { '#blsBonus>s.ic': 'transform:translate(57.71px,7.62px) scale(.706,.748) !important',
               '#blsBonus>s.ch': 'transform:translate(21.55px,-12.54px) scale(.706,.748) !important' } },
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
  /* 규칙을 임시로 덮었다가 도로 벗기는 자 — addStyleTag 는 못 지우므로 «되돌리는 규칙» 을 덧쓴다 */
  const CSSOF = (sel) => p.evaluate((q) => {
    const out = {};
    for (const one of q.split(',')) {
      const e = document.querySelector(one.trim());
      if (e) out[one.trim()] = getComputedStyle(e).transform + '|' + getComputedStyle(e).fontSize;
    }
    return out;
  }, sel);
  const RESTORE = async (sel, snap) => {
    let css = '';
    for (const [q, v] of Object.entries(snap)) {
      const [tf, fs] = v.split('|');
      css += `${q}{transform:${tf} !important;font-size:${fs} !important}`;
    }
    await p.addStyleTag({ content: css });
    await p.waitForTimeout(150);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  };

  for (const s of SITES) {
    const snap = await CSSOF(s.sel);
    /* ⓐ 지금(수리 후) */
    const cur = await inkTwice(s.sel);
    if (!cur) { console.log(`  (없음) ${s.css}\n`); continue; }
    const tfCur = Object.values(snap)[0].split('|')[0];

    /* ⓑ 자연 — transform 을 떼고 (그룹 자리는 형제까지 같이 뗀다)
       ⚠ 보너스 바는 `.bls-bn{height:150;overflow:hidden}` 이라 transform 을 뗀 «큰» 이모지가
          바 하변에서 **잘린다**(하변이 바 하변과 정확히 겹치는 것이 잘림의 서명). 잘린 자연으로
          예측하면 [E] 가 «97.4 ↔ 실측 110» 으로 엉뚱하게 빨개진다 — 제품이 아니라 자가 틀린 것이다.
          그래서 재는 동안만 클립을 연다(cal356r6 과 같은 처방). */
    if (s.key === 'bn') await p.addStyleTag({ content: '.bls-bn{overflow:visible !important}' });
    await p.addStyleTag({ content: `${s.sel}{transform:none !important}` });
    await p.waitForTimeout(150);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    const nat = await inkTwice(s.sel);
    if (s.key === 'bn') await p.addStyleTag({ content: '.bls-bn{overflow:hidden !important}' });
    await RESTORE(s.sel, snap);

    /* ⓒ 수리 전 — 옛 선언을 **주입**해서 재현한다 */
    const inj = s.oldEach
      ? Object.entries(s.oldEach).map(([q, v]) => `${q}{${v}}`).join('')
      : `${s.sel}{${s.old}}`;
    await p.addStyleTag({ content: inj });
    await p.waitForTimeout(150);
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
    const now = await inkTwice(s.sel);
    const tf = await p.evaluate((sel) => {
      const e = document.querySelector(sel.split(',')[0].trim());
      return e ? getComputedStyle(e).transform : '';
    }, s.sel);
    await RESTORE(s.sel, snap);

    const ref = REF[s.key];
    /* 394 — `axis:'h'` 자리는 높이 눈금(refH/natH), 나머지는 contain(min) */
    const sFit = s.axis === 'h' ? ref.h / nat.h : Math.min(ref.w / nat.w, ref.h / nat.h);
    plan[s.key] = { now, nat, cur, ref, sFit: +sFit.toFixed(4), tf, tfCur, axis: s.axis || 'contain' };

    console.log(`── ${s.css}   (노드 ${now.nodes}개)`);
    console.log(`   지금(수리 후) ${cur.w}×${cur.h}   종횡 ${(cur.w / cur.h).toFixed(3)}   @(${cur.x0},${cur.y0})   ${tfCur}`);
    console.log(`   수리 전(주입) ${now.w}×${now.h}   종횡 ${(now.w / now.h).toFixed(3)}   @(${now.x0},${now.y0})  재실행 일치 ${now.stable}   ${tf}`);
    console.log(`   자연(tf 뗌)  ${nat.w}×${nat.h}   종횡 ${(nat.w / nat.h).toFixed(3)}   @(${nat.x0},${nat.y0})  재실행 일치 ${nat.stable}`);
    console.log(`   ref          ${ref.w}×${ref.h}   종횡 ${(ref.w / ref.h).toFixed(3)}   ${ref.why}`);
    console.log(`   ⇒ 눈금 ${s.axis === 'h' ? '높이(394)' : 'contain'} 등방 s = ` +
      (s.axis === 'h' ? `refH/natH = ${(ref.h / nat.h).toFixed(4)}`
        : `min(${(ref.w / nat.w).toFixed(4)}, ${(ref.h / nat.h).toFixed(4)})`) + ` = ${sFit.toFixed(4)}`);
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

  console.log('\n[B] 눈금이 «넘치지 않는가» — contain 자리는 두 축, 높이 눈금(394) 자리는 높이 축');
  console.log('    ⚑ 394 이후 카드 3장은 **폭을 일부러 넘긴다**(+2.7 / +15.2 / +15.2%). 그 넘침이');
  console.log('       카드(overflow:hidden) 안이고 아래 알약과 안 겹친다는 것은 `verify394` [5] 가 묻는다.');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    const inH = q.nat.h * q.sFit <= q.ref.h + 0.5;
    const inW = q.nat.w * q.sFit <= q.ref.w + 0.5;
    ck(`${k} 잉크가 ref 상자 안 (눈금 ${q.axis})`, q.axis === 'h' ? inH : (inH && inW), true);
    if (q.axis === 'h') {
      console.log(`       ↳ 폭은 ref ${q.ref.w} → ${(q.nat.w * q.sFit).toFixed(1)} ` +
        `(+${((q.nat.w * q.sFit / q.ref.w - 1) * 100).toFixed(1)}%) — 394 가 치르기로 한 대가다`);
    }
  }

  console.log('\n[C] 부호 — 수리 전 손잡이는 ref 에 «가까워지는» 쪽이었나 «멀어지는» 쪽이었나');
  console.log('    ⚑ 5회차(03)와 여기가 갈리는 자리다. 03 은 손잡이가 ref 에서 «멀어지고» 있어서');
  console.log('       등방으로 바꾸는 것이 ref 에도 이득이었다. 34 는 반대다 — 수리 전이 ref 에 더 가깝다.');
  console.log('       그래도 걷어내는 근거는 «주인 지시가 레퍼런스보다 우선»(354 선례)이고,');
  console.log('       남는 거리는 CSS 가 아니라 **아트 종횡**이 만든 것이라 아트 교체로만 닫힌다.');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    const dOld = Math.hypot(q.now.w - q.ref.w, q.now.h - q.ref.h);
    const dNew = Math.hypot(q.cur.w - q.ref.w, q.cur.h - q.ref.h);
    console.log(`  ${k}: 수리 전 ref 거리 ${dOld.toFixed(1)}px · 수리 후 ${dNew.toFixed(1)}px` +
      `  → ${dNew <= dOld ? '등방이 ref 에 더 가깝거나 같다' : `등방이 ${(dNew - dOld).toFixed(1)}px 멀어진다 (아트 대기)`}`);
  }

  console.log('\n[D] 수리 후 — 다섯 자리가 전부 «자연 종횡» 이다 (이 라운드의 통과 조건)');
  console.log('    자는 «종횡비 차» 가 아니라 **픽셀 띠**다 — 잉크가 33px 인 ⏱ 에서는 잉크 경계');
  console.log('    한 칸(±0.5px)이 종횡비를 0.027 씩 흔들어, 고정 종횡 허용치는 작은 글리프를 반드시');
  console.log('    빨갛게 만든다(첫 실행이 그랬다). 대신 «세로에서 뽑은 배율 k 를 가로에 대 봐서');
  console.log('    한 픽셀 안에 드는가» 를 묻는다 — 이것이 등방의 정의 그대로다.');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    const kk = q.cur.h / q.nat.h;
    const wantW = kk * q.nat.w;
    ck(`${k} 세로 배율 ${kk.toFixed(4)} 를 가로에 대면 ${wantW.toFixed(1)} ↔ 실측 ${q.cur.w} (Δ ${Math.abs(q.cur.w - wantW).toFixed(1)}px)`,
      Math.abs(q.cur.w - wantW) <= 1.5, true);
  }

  console.log('\n[E] 수리 후 잉크 = 그 자리의 눈금이 예측한 값 (역산이 제품에 실제로 실렸는가)');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    const pw2 = q.nat.w * q.sFit, ph = q.nat.h * q.sFit;
    ck(`${k} 예측 ${pw2.toFixed(1)}×${ph.toFixed(1)} ↔ 실측 ${q.cur.w}×${q.cur.h}`,
      Math.abs(q.cur.w - pw2) <= 1.5 && Math.abs(q.cur.h - ph) <= 1.5, true);
  }

  console.log('\n[F] 수리 후 ref 상자를 안 넘는다 — 잘림·이웃 침범이 구조적으로 없다');
  console.log('    (394 이후 카드 3장은 «높이만» 묻는다 — 폭 넘침은 의도이고 `verify394` [5] 가 잘림을 본다)');
  for (const k of ['atk', 'hp', 'rate', 'ck', 'bn']) {
    const q = plan[k];
    ck(`${k} 잉크 ≤ ref 상자 (눈금 ${q.axis})`,
      q.axis === 'h' ? q.cur.h <= q.ref.h + 1 : (q.cur.w <= q.ref.w + 1 && q.cur.h <= q.ref.h + 1), true);
  }

  console.log('\n[G] 보너스 바 — 역산이 중심을 미지수로 놓았으니 중심은 ref 와 Δ0 이어야 한다');
  {
    const q = plan.bn;
    const cx = q.cur.x0 + q.cur.w / 2, cy = q.cur.y0 + q.cur.h / 2;
    ck(`중심 (${cx.toFixed(1)}, ${cy.toFixed(1)}) ↔ ref (195, 1332)`,
      Math.abs(cx - 195) <= 1.5 && Math.abs(cy - 1332) <= 1.5, true);
  }

  console.log(`\n[probe356r6] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
