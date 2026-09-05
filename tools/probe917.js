#!/usr/bin/env node
/* 작업 917 — «배수 토글 바에서 ×1 잉크만 5px 위 · 첫 칸만 가로로 밀린다» 재현기
 *
 *   node tools/probe917.js          # [A] 세로 · [B] 가로 · [C] 화소 · [D] 갈래
 *   node tools/probe917.js --json   # 원자료
 *
 * ── 무엇을 묻는가 ────────────────────────────────────────────────────────────
 * 등재문(879 5회차 채점자 ER)이 적은 것은 둘이다:
 *   ① `×1` 잉크만 5px 위 (잉크 높이는 넷 다 35 로 같다 = 순수 평행이동)
 *   ② `×1` 잉크 중심이 4등분 칸 중심보다 +7.9px — 나머지 셋은 ≤0.6px
 * 그리고 **뿌리를 «선택 알약 폭 173 이 칸 161.25 보다 +7.3% 큰 것»** 으로 지목했다.
 *
 * ⚑ 이 자가 갈라야 하는 것이 바로 그 뿌리다. 알약이 넓은 것이 뿌리라면
 *   **알약이 더 넓은 2·3번 칸이 더 크게 밀려야 한다**(sp4 활성 폭: 1·4번 칸 = 25%+11.75−b/2,
 *   2·3번 칸 = 25%+23.5+b/2 ⇒ 2·3번이 11.75px 더 넓다). 그런데 등재문 자신이
 *   «2·3·4번은 ≤0.6px 로 완벽» 이라고 적었다 — 두 진술은 같이 참일 수 없다.
 *   ⇒ [B] 가 «어느 칸을 켜면 어느 칸이 미는가» 를 4상태 전수로 찍어 이 모순을 끊는다.
 *
 * 338 규칙(처방 전에 재현)·813 [2] 규약(식을 옮겨 적지 말고 그려진 상자에서 되잰다).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» 한 줄 + 종료 코드 2 */

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const JSONOUT = process.argv.includes('--json');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const MULS = [1, 10, 100, 1000];

const r2 = v => Math.round(v * 100) / 100;

/* ── 페이지 안에서 도는 자 ────────────────────────────────────────────────────
   식을 옮겨 적지 않는다 — `getBoundingClientRect()` 로 **브라우저가 푼 상자**를 되잰다.
   바 자신에 `scale()` 이 걸려 있으므로 좌표는 전부 **바 테두리 상자 기준 상대값**이고,
   «4등분 칸» 도 그 상자를 그 자리에서 넷으로 나눠 만든다(리터럴 161.5 를 안 적는다). */
const MEASURE = `(barSel => {
  const bar = document.querySelector(barSel);
  if(!bar) return null;
  const br = bar.getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const rel = r => ({ l:r2(r.left-br.left), r:r2(r.right-br.left), w:r2(r.width),
                      t:r2(r.top-br.top),  b:r2(r.bottom-br.top),  h:r2(r.height),
                      cx:r2((r.left+r.right)/2-br.left), cy:r2((r.top+r.bottom)/2-br.top) });
  const cells = [...bar.children].map((c, k) => {
    const i = c.querySelector('i');
    const cs = getComputedStyle(c);
    return {
      k: k+1, mul: c.dataset.mul, on: c.classList.contains('on'),
      cell: rel(c.getBoundingClientRect()),
      lab: i ? rel(i.getBoundingClientRect()) : null,
      lh: cs.lineHeight, fs: cs.fontSize,
      itop: i ? getComputedStyle(i).top : null,
      ileft: i ? getComputedStyle(i).left : null
    };
  });
  /* 4등분 칸 = 바 **바깥 상자**를 그 자리에서 넷으로(379 ⓐ «기준 상자는 바깥 상자») */
  const Q = br.width / cells.length;
  cells.forEach(c => { c.qc = r2(Q * (c.k - 0.5)); c.dcx = r2(c.lab ? c.lab.cx - c.qc : NaN); });
  return { bar: { w: r2(br.width), h: r2(br.height), l: r2(br.left), t: r2(br.top) },
           q: r2(Q), cells };
})`;

async function openRw(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(200);
  return { ctx, page };
}

async function setMul(page, m) {
  await page.evaluate(v => { relMul = v; renderRwMulBar(); }, m);
  await page.waitForTimeout(60);
}

/* ── [C] 화소 — 라벨 잉크를 실제로 찍힌 밝은 화소로 잡는다 ──────────────────
   배경은 셸 #61523D(lum≈85)·#705F4B(≈100) · 알약면 #634F37 이고 라벨은
   #A9A8AD(≈168) / #F2BC8D(≈200) 라 문턱 150 이 둘을 가른다.
   ⚠ 문턱 의존이 아님을 보이려고 130/150/170 세 문턱을 같이 찍는다. */
async function inkRows(page, thresholds) {
  const bar = await page.$('#rwMulBar');
  const box = await bar.boundingBox();
  const buf = await page.screenshot({ clip: { x: Math.floor(box.x), y: Math.floor(box.y),
                                              width: Math.ceil(box.width), height: Math.ceil(box.height) } });
  const png = PNG.sync.read(buf);
  const { width: W, height: Hh, data } = png;
  const out = {};
  for (const th of thresholds) {
    /* 칸별 잉크 bbox — 가로는 4등분 창으로 자른다(라벨이 칸을 안 넘는다) */
    const per = [];
    for (let k = 0; k < 4; k++) {
      const x0 = Math.round(W * k / 4), x1 = Math.round(W * (k + 1) / 4);
      let top = null, bot = null, lo = null, hi = null;
      for (let y = 0; y < Hh; y++) for (let x = x0; x < x1; x++) {
        const o = (y * W + x) * 4;
        const lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
        if (lum > th) { if (top === null) top = y; bot = y;
                        if (lo === null || x < lo) lo = x; if (hi === null || x > hi) hi = x; }
      }
      per.push({ k: k + 1, top, bot, h: (top === null ? null : bot - top + 1),
                 l: lo, r: hi, cx: (lo === null ? null : r2((lo + hi + 1) / 2)) });
    }
    out[th] = per;
  }
  return { W, H: Hh, out };
}

(async () => {
  const browser = await launch(chromium);
  const R = { frames: {}, ink: null, control: null };

  for (const H of FRAMES) {
    const { ctx, page } = await openRw(browser, H);
    const per = {};
    for (const m of MULS) {
      await setMul(page, m);
      per['on=' + m] = await page.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#rwMulBar']);
    }
    /* 1600 에서만 화소까지 — ER 이 잰 프레임 */
    if (H === 1600) {
      await setMul(page, 1);
      R.ink = await inkRows(page, [130, 150, 170]);
    }
    R.frames[H] = per;
    await ctx.close();
  }

  /* ── [D] 대조군 — 레퍼런스가 구속하는 sp3 호스트(10 상점 카테고리) ──────────
     이 바는 ref(07·03) 실측이 «비활성이 활성보다 5px 아래» 를 요구하는 자리다(337).
     수리가 여기를 한 픽셀도 건드리면 안 된다는 것을 이 자가 먼저 못박는다. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined');
    await page.click('.tab[data-t="shop"]');
    await page.waitForTimeout(400);
    R.control = await page.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#shopCats']);
    await ctx.close();
  }
  /* 03 던전 서브탭(`#dunSub`) — ref 구속 자리가 둘이다(337 이 잰 그림이 07·03) */
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined');
    await page.click('.tab[data-t="adv"]');
    await page.waitForTimeout(500);
    R.control2 = await page.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#dunSub']);
    await ctx.close();
  }

  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify(R, null, 2)); return; }

  const f = R.frames[1600];
  console.log('작업 917 재현기 — 배수 토글 바(#rwMulBar) · 바 폭 ' + f['on=1'].bar.w
    + ' · 4등분 칸 ' + f['on=1'].q + '\n');

  /* ⚠ 라벨 «상자» 의 top 은 두 상태가 같다(둘 다 ≈10) — 갈리는 것은 **상자 높이**(= 그 칸의
     line-height)이고, 글리프는 그 상자 한가운데 앉으므로 잉크는 높이차의 **절반**만큼 뜬다.
     그래서 이 절은 top 이 아니라 **상자 중심**(= 잉크 중심)을 찍는다. [C] 가 화소로 겹쳐 확인한다. */
  console.log('[A] 세로 — 켜진 칸의 라벨만 위로 뜨는가 (라벨 상자 중심 = 잉크 중심, 바 기준)');
  console.log('    상태  │ ' + MULS.map(m => ('×' + m).padStart(8)).join(' │ ') + '  │ line-height(on/off)');
  for (const m of MULS) {
    const c = f['on=' + m].cells;
    const on = c.find(x => x.on), off = c.find(x => !x.on);
    console.log('    on=' + String(m).padEnd(4) + '│ '
      + c.map(x => String(x.lab.cy).padStart(8)).join(' │ ')
      + '  │ ' + on.lh + ' / ' + off.lh);
  }
  {
    const c = f['on=1'].cells;
    const on = c.find(x => x.on), off = c.find(x => !x.on);
    const d = r2(off.lab.cy - on.lab.cy);
    console.log('    ⇒ 켜진 칸의 잉크가 ' + d + 'px 위. 라벨 상자 높이 '
      + c.map(x => x.lab.h).join(' / '));
    console.log('    ⇒ line-height 차 ' + (parseFloat(off.lh) - parseFloat(on.lh))
      + 'px 의 절반 = ' + ((parseFloat(off.lh) - parseFloat(on.lh)) / 2) + 'px 와 일치하는가: '
      + (Math.abs((parseFloat(off.lh) - parseFloat(on.lh)) / 2 - d) < 0.51 ? '예' : '아니오'));
  }

  console.log('\n[B] 가로 — 라벨 중심 − 4등분 칸 중심 (px · + = 오른쪽으로 밀림)');
  console.log('    상태  │ ' + MULS.map(m => ('×' + m).padStart(8)).join(' │ ') + '  │ 켠 칸 폭');
  for (const m of MULS) {
    const c = f['on=' + m].cells;
    console.log('    on=' + String(m).padEnd(4) + '│ '
      + c.map(x => String(x.dcx).padStart(8)).join(' │ ')
      + '  │ ' + c.find(x => x.on).cell.w);
  }
  console.log('    ⇒ 알약이 «넓어서» 미는 것이라면 더 넓은 2·3번 칸이 더 밀려야 한다.');
  for (const m of MULS) {
    const c = f['on=' + m].cells, on = c.find(x => x.on);
    console.log('       on=×' + String(m).padEnd(5) + ' 켠 칸(' + on.k + '번) 폭 ' + String(on.cell.w).padStart(7)
      + ' · 그 칸 라벨 밀림 ' + String(on.dcx).padStart(7));
  }

  console.log('\n[C] 화소(1600 · ×1 켜짐) — 칸별 잉크 bbox');
  for (const th of [130, 150, 170]) {
    const p = R.ink.out[th];
    console.log('    문턱 ' + String(th).padStart(3) + ' │ '
      + p.map(x => (x.top === null ? '없음' : x.top + '..' + x.bot + '(h' + x.h + ')')).map(s => s.padStart(16)).join(' │ '));
  }
  console.log('    ⇒ 문턱 130/150/170 에서 값이 안 움직이면 문턱 의존이 아니다.');

  console.log('\n[D] 프레임 5종 — 같은가 (on=×1 · 1번 칸 라벨 밀림 / 세로 뜸)');
  for (const H of FRAMES) {
    const c = R.frames[H]['on=1'].cells;
    const on = c.find(x => x.on), off = c.find(x => !x.on);
    console.log('    ' + String(H).padStart(4) + ' │ 가로 ' + String(on.dcx).padStart(7)
      + ' · 세로 ' + String(r2(off.lab.t - on.lab.t)).padStart(6)
      + ' · 바 폭 ' + R.frames[H]['on=1'].bar.w);
  }

  console.log('\n[E] 대조군 — ref 가 구속하는 서브탭 바(`data-mul` 이 없어 스코프 밖)');
  for (const [name, o] of [['10 상점 `#shopCats`(sp3)', R.control], ['03 던전 `#dunSub`(sp3)', R.control2]]) {
    if (!o || !o.bar.w) { console.log('    ' + name + ' — 측정 실패(바 폭 0 · 팝업이 안 열렸다)'); continue; }
    const c = o.cells;
    const on = c.find(x => x.on), off = c.find(x => !x.on);
    console.log('    ' + name + ' · 바 폭 ' + o.bar.w + ' · 켠 칸 ' + (on ? on.k : '-'));
    console.log('      라벨 상자 높이 ' + c.map(x => x.lab.h).join(' / ')
      + '  · 밀림 ' + c.map(x => x.dcx).join(' / '));
    if (on && off) console.log('      ⇒ 활성 줄상자 ' + on.lh + ' ↔ 비활성 ' + off.lh
      + ' — 337 «ref 는 비활성이 활성보다 5px 아래» 가 **살아 있어야** 한다');
  }
  console.log('    ⇒ 이 값들은 수리 전후로 한 자리도 안 움직여야 한다.');
})();
