#!/usr/bin/env node
/* 작업 879 — «89 유물 소환 1600 프레임: 아치 니치가 배수 바를 못 담는다 + 들보↔아치 정점 중첩» 재현기
 *
 *   node tools/probe879.js            # [1] 상자 · [2] 화소 · [3] 갈래 스윕
 *   node tools/probe879.js --json     # 원자료
 *
 * ── 왜 이 자가 먼저인가(338 규칙) ─────────────────────────────────────────────
 * 813 8회차 §36 이 «세 요구는 서로의 재원» 을 제품에 넣어서 확인했고, 그 회차가 낼 수 있는
 * 2.0px 을 낸 뒤 이 행을 등재했다. 등재문의 처방은 둘이다 —
 *   ⓐ 바를 니치 앵커(받침 위 12)에서 뗀다      ⓑ 바 높이 98 을 1600 에서만 낮춘다
 * 그런데 **둘 중 어느 것도 «아치 안쪽» 을 직접 늘리지 않는다.** 그래서 처방을 따르기 전에
 * 세 요구가 실제로 어느 상수에 매달려 있는지를 **제품에 넣어서** 다시 가른다.
 *
 *   [1] 상자 — 다섯 프레임의 tt·av·gt·lt 와 세 요구(아치 안쪽 · 격자↔바 · 들보↔아치 정점)
 *   [2] 화소 — CU 의 1순위(«들보 하변 ↔ 아치 정점이 화소로 −1px»)를 **찍힌 픽셀**로 재현한다.
 *       ⚑ 자는 «어느 요소의 잉크인가» 를 묻는다: 같은 프레임을 세 번 찍어(원본 · 상인방 숨김 ·
 *          아치 숨김) 차분이 나는 행으로 각 요소의 잉크 상·하변을 잡는다. 상자로 재면
 *          8.9px «여유» 인데 화소로는 −1px «중첩» 이라는 갈림이 곧 이 작업의 재현 대상이다.
 *   [3] 갈래 스윕 — 지렛대 넷을 제품에 실제로 넣어 세 요구를 다시 잰다:
 *          barH(바 높이) · barAnchor(니치 ↔ 격자) · CL(gt 의 첫째 인자 94) · AVF(av 의 174)
 *       ⚑ 813 8회차가 [H2]·[H3] 를 «하나씩» 넣어 기각했다. 이 자는 **둘 이상을 같이** 넣는다 —
 *          «서로의 재원» 이라는 말은 조합을 안 재 봤다는 뜻이 아니어야 한다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const JSONOUT = process.argv.includes('--json');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

/* ── 페이지 안에서 도는 자 ────────────────────────────────────────────────────
   식을 옮겨 적지 않고 **그려진 상자**에서 되잰다(813 [2] 규약 — 식이 바뀌어도 안 늙는다). */
const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const rel = (r) => ({ t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height),
                        l: r1(r.left - pr.left), r: r1(r.right - pr.left) });
  const box = (s) => { const e = q(s); return e ? rel(e.getBoundingClientRect()) : null; };
  /* ⚑ 커스텀 속성은 계산값이 아니라 **토큰**으로 돌아온다(calc(...) 문자열) — parseFloat 는
     NaN 을 내고 그것을 0 으로 접으면 자가 조용히 거짓말을 한다(1회차에 실제로 그랬다).
     ⇒ 패널 직속 자식으로 «자 막대» 를 하나 넣어 **레이아웃이 푼 px** 을 되잰다. */
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (n) => { ruler.style.height = 'var(' + n + ')';
    const v = ruler.getBoundingClientRect().height; return v; };
  const grid = box('#relw .rw-grid') || box('#rwGrid');
  const lint = box('#relw .rw-lintel');
  const mul  = box('#rwMulBar');
  const floor= box('#relw .rw-floor');
  const mid  = box('#relw .rw-mid');
  /* 아치는 의사요소라 상자를 못 잡는다 — top = gt − av · height = ah 라는 «그려진 값» 을
     변수에서 읽되, 그 변수 자체가 렌더에 쓰인 값이다(레이아웃 계산 결과). */
  const av = num('--rw-av'), gt = num('--rw-gt'), lt = num('--rw-lt'),
        tt = num('--rw-tt'), fl = num('--rw-fl'), ah = num('--rw-ah'), bt = num('--rw-bt');
  ruler.remove();
  /* ⚑ 아치는 의사요소(.rw-bg::after)라 상자를 못 잡는다 — «식을 옮겨 적는» 대신 **같은 식을 문
     클론**을 .rw-bg 안에 잠깐 넣어 브라우저가 푼 상자를 되잰다(813 [2] 규약의 아치판). */
  const bg = q('#relw .rw-bg');
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const ar = ap.getBoundingClientRect();
  const archT = r1(ar.top - pr.top), archB = r1(ar.bottom - pr.top), archH = r1(ar.height);
  ap.remove();
  return {
    panelH: r1(pr.height), panelY: r1(pr.top), panelX: r1(pr.left), panelW: r1(pr.width),
    av: r1(av), gt: r1(gt), lt: r1(lt), tt: r1(tt), fl: r1(fl), ah: r1(ah), bt: r1(bt),
    gridT: grid && grid.t, gridB: grid && grid.b, gridH: grid && grid.h,
    lintB: lint && lint.b, lintT: lint && lint.t,
    mulT: mul && mul.t, mulB: mul && mul.b, mulH: mul && mul.h,
    floorT: floor && floor.t, midT: mid && mid.t,
    apexT: archT, archB, archH,
    footGap: floor ? r1(floor.t - archB) : null,   /* 아치 발 ↔ 받침 상변(0 이어야 «착지») */
    /* 세 요구 */
    inArch:  mid && grid ? r1(mid.t - grid.b) : null,      /* ① 아치 안쪽 = 격자 하변 ↔ 수반 상변 */
    gapBar:  mul && grid ? r1(mul.t - grid.b) : null,      /* ② 격자 하변 ↔ 바 상변 */
    gapBarFl:mul && floor ? r1(floor.t - mul.b) : null,    /* ②' 바 하변 ↔ 받침 상변 */
    clear:   lint ? r1(archT - lint.b) : null,              /* ③ 들보 하변 ↔ 아치 정점 (상자) */
    aspect:  r1(ah / 589),                                 /* verify120 ② — 1:1.25 이상 */
  };
})()`;

async function openAt(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(200);
  return { ctx, page };
}

async function measure(browser, H, css) {
  const { ctx, page } = await openAt(browser, H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}

/* ── [2] 화소 — 요소를 하나씩 숨겨 «그 요소가 칠한 행» 을 차분으로 잡는다 ──────── */
const HIDE_LINTEL = '#relw .rw-lintel{display:none!important}';
const HIDE_ARCH   = '#relw .rw-bg::after{display:none!important}';

function rowsPainted(a, b, x0, x1, y0, y1, W) {
  /* a·b 는 같은 크기의 RGBA — 차분이 나는 행만 true */
  const out = [];
  for (let y = y0; y < y1; y++) {
    let diff = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) diff++;
    }
    out.push(diff);
  }
  return out;
}

async function inkScan(browser, H) {
  const shots = {};
  for (const [k, css] of [['base', ''], ['noLint', HIDE_LINTEL], ['noArch', HIDE_ARCH]]) {
    const { ctx, page } = await openAt(browser, H, css);
    const geo = await page.evaluate(M => eval(M), MEASURE);
    const buf = await page.screenshot();
    const f = path.join(ROOT, 'docs/shots', `probe879-${H}-${k}.png`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, buf);
    const d = decodePNG(f); shots[k] = { geo, png: { width: d.w, height: d.h, data: d.px } };
    fs.unlinkSync(f);
    await ctx.close();
  }
  const { geo, png } = shots.base;
  const W = png.width;
  const px = geo.panelX, py = geo.panelY;
  /* 아치 정점 근처 세로 창: 상인방 상변 ~ 격자 상변 */
  const y0 = Math.max(0, Math.round(py + geo.lintT) - 10);
  const y1 = Math.min(png.height, Math.round(py + geo.gridT));
  /* 가로 창 — 아치 개구 589 의 가운데 절반(까치발 196..226 · 854..884 를 피한다) */
  const cx = Math.round(px + geo.panelW / 2);
  const xa = cx - 140, xb = cx + 140;
  const dLint = rowsPainted(png.data, shots.noLint.png.data, xa, xb, y0, y1, W);
  const dArch = rowsPainted(png.data, shots.noArch.png.data, xa, xb, y0, y1, W);
  /* ⚑ 문턱은 «띠의 절반» 이다(140/280). 12 로 잡았더니 두 요소 어디에도 없는 행이
     리샘플 잡음으로 걸려 상인방 잉크 하변이 격자 한복판으로 튀었다(1회차 실측 225.2).
     상인방은 «아치 상자 위» 에서만, 아치는 «상인방 상자 아래» 에서만 찾는다 — 두 창이
     겹치는 구간이 곧 이 작업이 재는 자리라 서로의 답을 훔쳐 오지 않는다. */
  const TH = Math.round((xb - xa) / 2);
  const iArch = Math.max(0, Math.round(py + geo.apexT) - y0);
  let lintInkB = null, archInkT = null;
  for (let i = Math.min(iArch, dLint.length - 1); i >= 0; i--) if (dLint[i] >= TH) { lintInkB = y0 + i; break; }
  for (let i = 0; i < dArch.length; i++) if (dArch[i] >= TH) { archInkT = y0 + i; break; }
  return {
    frame: H,
    lintInkB: lintInkB === null ? null : +(lintInkB - py).toFixed(1),
    archInkT: archInkT === null ? null : +(archInkT - py).toFixed(1),
    clearPx: (lintInkB === null || archInkT === null) ? null : archInkT - lintInkB - 1,
    boxClear: geo.clear, boxLintB: geo.lintB, boxApexT: geo.apexT,
  };
}

/* ── [3] 갈래 스윕 ──────────────────────────────────────────────────────────── */
function knobCSS({ barH, anchor, CL, AVF, mbs }) {
  const out = [];
  /* 2회차 신설 — 1회차의 등방 축소를 «끈» 갈래. `rwMulFit()` 은 `#relw` 에 **인라인**으로 얹으므로
     선언 쪽에서 이기려면 `!important` 가 필요하다(1회차 §4 의 폴백 함정과 같은 자리다). */
  if (mbs != null) out.push(`#relw{--rw-mbs:${mbs}!important}`);
  if (barH != null) out.push(`#rwMulBar{height:${barH}px}`);
  if (anchor === 'grid')
    out.push(`#rwMulBar{top:calc(var(--rw-gt) + 516px * var(--rwc,1) + 44px * var(--rwc,1))}`);
  if (barH != null && anchor !== 'grid')
    out.push(`#rwMulBar{top:calc(var(--rw-fl) - ${barH}px - 12px * var(--rwc,1))}`);
  if (CL != null || AVF != null) {
    const cl = CL == null ? 94 : CL, avf = AVF == null ? 174 : AVF;
    out.push(`#relw .rw-bowl,#relw .rw-panel{
      --rw-av:min(calc(186px * var(--rwc,1)),calc((var(--rw-tt) - ${avf}px * var(--rwc,1)) / 2),
                  calc(var(--rw-tt) - 285px * var(--rwc,1)));
      --rw-gt:max(calc(var(--rw-av) + ${cl}px * var(--rwc,1)),calc(110px * var(--rwc,1)),
                  min(calc(var(--rw-tt) * .48),
                      calc(var(--rw-tt) - var(--rw-av) - 139px * var(--rwc,1))));
      --rw-lt:clamp(calc(20px * var(--rwc,1)),calc(var(--rw-gt) - 294px * var(--rwc,1)),
                    calc(var(--rw-gt) - var(--rw-av) - ${cl - 20}px * var(--rwc,1)));}`);
  }
  return out.join('\n');
}

const BRANCHES = [
  { k: '현행(8회차 뒤)', o: {} },
  { k: 'ⓑ 바 66',            o: { barH: 66 } },
  { k: 'ⓑ 바 56',            o: { barH: 56 } },
  { k: 'ⓐ 바를 격자에 매달기', o: { anchor: 'grid' } },
  { k: 'ⓐ+ⓑ 바 66 · 격자 앵커', o: { barH: 66, anchor: 'grid' } },
  { k: 'ⓒ clearance 94→119',  o: { CL: 119 } },
  { k: 'ⓒ+ⓑ 119 · 바 56',    o: { CL: 119, barH: 56 } },
  { k: 'ⓒ+ⓑ+av 119 · 56 · AVF 210', o: { CL: 119, barH: 56, AVF: 210 } },
  { k: 'ⓒ+ⓑ 110 · 바 56',    o: { CL: 110, barH: 56 } },
  { k: 'ⓒ+ⓑ 106 · 바 56',    o: { CL: 106, barH: 56 } },
  /* ── 2회차 신설 — «바를 안 줄이는» 갈래 ──────────────────────────────────────
     2회차 채점자가 ② 를 «바가 이웃 중 **혼자** 작아진다» 로 잡았다(슬롯·수반·알약은 두
     프레임 Δ0 인데 바만 −26.5%). 1회차는 그 축소를 재원으로 ② 를 샀으므로, 축소를 끄고도
     ② 를 살 수 있는지를 여기서 묻는다. 지렛대는 **AVF(av 의 174)** 다 —
       av = min(186·rwc, (tt − AVF·rwc)/2, tt − 285·rwc)
     1600 은 지금 **둘째 항**이 이기고 있고(133.95), AVF ≤ 570 − tt/rwc ≈ 124 면 **셋째 항**
     (158.6)이 이긴다. 긴 네 프레임은 첫째 항(186·rwc)이 이기므로 **AVF 를 내려도 Δ0** 이다. */
  { k: 'ⓓ 배율 1(1회차 되돌림)',      o: { mbs: 1 } },
  { k: 'ⓓ+AVF 124 · 배율 1',        o: { mbs: 1, AVF: 124 } },
  { k: 'ⓓ+AVF 100 · 배율 1',        o: { mbs: 1, AVF: 100 } },
  { k: 'ⓓ+AVF 124 · 배율 1 · CL 119', o: { mbs: 1, AVF: 124, CL: 119 } },
  /* ⓔ — **배율을 안 끄고 AVF 만 내린다**(제품에 실제로 넣을 꼴). 1회차의 밸브
     `배율 = min(1,(av − 12 − 52)/98)` 는 «52 = 격자↔바 목표» 를 이미 품고 있으므로,
     니치가 넉넉해지면 밸브가 스스로 1 로 열린다 — 되돌림이 아니라 **재원 공급**이다. */
  { k: 'ⓔ AVF 124 (배율 자동)',      o: { AVF: 124 } },
  { k: 'ⓔ AVF 100 (배율 자동)',      o: { AVF: 100 } },
];

(async () => {
  const browser = await launch(chromium);
  const out = { box: {}, ink: {}, sweep: [] };
  for (const H of FRAMES) out.box[H] = await measure(browser, H, '');
  for (const H of [1600, 2280]) out.ink[H] = await inkScan(browser, H);
  for (const b of BRANCHES) {
    const row = { k: b.k, o: b.o, f: {} };
    for (const H of [1600, 2280]) row.f[H] = await measure(browser, H, knobCSS(b.o));
    out.sweep.push(row);
  }
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify(out, null, 1)); return; }
  const pad = (s, n) => String(s).padStart(n);
  console.log('PROBE879 — 89 유물 소환 1600: 아치 니치 · 배수 바 · 들보 clearance\n');

  console.log('[1] 상자 — 세 요구와 그 재료');
  console.log('     프레임   tt     av      gt     lt   | ① 아치안쪽  ② 격자↔바  ②\' 바↔받침  ③ clearance  아치비');
  for (const H of FRAMES) {
    const o = out.box[H];
    console.log('     ' + pad(H, 5) + pad(o.tt.toFixed(1), 8) + pad(o.av.toFixed(1), 8) + pad(o.gt.toFixed(1), 8)
      + pad(o.lt.toFixed(1), 7) + '  |' + pad(o.inArch.toFixed(1), 10) + pad(o.gapBar.toFixed(1), 12)
      + pad(o.gapBarFl.toFixed(1), 13) + pad(o.clear.toFixed(1), 13) + '   1:' + o.aspect.toFixed(3));
  }
  console.log('     요구(813 8회차 채점 2인): ① +13~20 · ② +22(하한 63) · ③ +25~31\n');

  console.log('[2] 화소 — «들보 하변 ↔ 아치 정점» 을 찍힌 픽셀로 (요소를 숨겨 차분으로 잡는다)');
  console.log('     프레임   상인방 잉크 하변   아치 잉크 상변   화소 여유   상자 여유');
  for (const H of [1600, 2280]) {
    const o = out.ink[H];
    console.log('     ' + pad(H, 5) + pad(o.lintInkB, 16) + pad(o.archInkT, 17) + pad(o.clearPx, 12) + pad(o.boxClear.toFixed(1), 12));
  }
  console.log('');

  console.log('[3] 갈래 스윕 — 지렛대를 제품에 넣어 다시 잰다 (1600 / 2280)');
  console.log('     갈래                            ① 아치안쪽      ② 격자↔바      ③ clearance     아치비(1600)');
  for (const r of out.sweep) {
    const a = r.f[1600], b = r.f[2280];
    console.log('     ' + r.k.padEnd(30)
      + pad(a.inArch.toFixed(1) + '/' + b.inArch.toFixed(1), 15)
      + pad(a.gapBar.toFixed(1) + '/' + b.gapBar.toFixed(1), 15)
      + pad(a.clear.toFixed(1) + '/' + b.clear.toFixed(1), 15)
      + pad('1:' + a.aspect.toFixed(3), 15));
  }
  console.log('\n     ⚠ 아치비 < 1:1.250 이면 verify120 ② 가 빨개진다 · ②\' (바↔받침) 가 0 이하면 바가 받침을 먹는다');
})();
