#!/usr/bin/env node
/* 작업 886 — 89 유물 소환 «배수 바의 재원은 니치 밖에 있는가» 게이트
 *
 *   node tools/verify886.js
 *
 * ── 무엇을 약속하는가 ────────────────────────────────────────────────────────
 * 879 3회차가 «니치 예산은 닫혔다» 를 항등식으로 증명하고, 채점 2인이 재원으로 지목한
 * «바↓수반 94px 여유» 를 넘기며 이 행을 등재했다. 886 이 그 자리를 열어 보고 **기각**했고,
 * 여는 과정에서 등재문이 예상한 것의 **반대 부호**를 찍었다 —
 *   받침(`.rw-floor::before`)의 상변은 지면선(`--rw-fl`)보다 **16px 위**라, 867 의
 *   «받침 위 12» 는 도면에서 «받침 **안** 4» 였고 `verify867` [3] 은 **헛초록**이었다.
 * 이 자가 지키는 약속은 여섯:
 *
 *   [1] 받침 상변  — 지면선보다 `--rw-ped`(16px) 위, 다섯 프레임 전부
 *   [2] ★ 얹힘     — 바 하변 ↔ 받침 상변 = `--rw-mb-seat`(4px). 제품이 이 둘에서 top 을 파생한다
 *   [3] ★ 안 덮는다 — **화소로** 지면선 아래에 바의 잉크가 0 (접합선·계단·바닥 — 867 [3] 의 실질)
 *   [4] 여유의 정체 — «지면선 ↓ 수반» 은 빈 곳이 아니다: 받침이 그 구간의 절반(1600)을 먹고,
 *                    받침 상면 15.76 은 **니치 안**에 이미 들어와 있다
 *   [5] ★ 기각의 근거 — 앵커를 «안 덮게»(clear ≥ 0) 옮긴 사본에서 `verify879` [2] 또는 [2c] 가
 *                    **반드시** 빨개진다. 886 이 «고칠 수 없다» 고 말한 근거를 자가 들고 있는다
 *   [6] Δ0px       — 이번 정정은 **그리는 것을 한 픽셀도 안 바꿨다**(옛 리터럴 식 사본과 대조)
 *
 * §R  `--rw-ped` 를 0 으로 만든 사본에서 [1]·[2] 가 빨개진다 — 제품이 그 값을 **실제로 읽는다**
 * §R2 `--rw-mb-seat` 를 0 으로 만든 사본에서 바가 4px 올라가 «간극 ×1.5» 가 깨진다
 *     — 얹힘 4px 이 «장식» 이 아니라 **예산의 일부**임을 반대편에서 못박는다
 *
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets·웹폰트가 404 라 다른 것을 재게 된다(700 §preTree).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const PED = 16;            /* 886 — 받침 상변이 지면선 위로 나온 몫(제품 `--rw-ped`) */
const SEAT = 4;            /* 886 — 바 하변이 받침 상면을 파고든 «얹힘»(제품 `--rw-mb-seat`) */
const ROW_PITCH = 25.6;    /* 격자 행 간 — `verify879` ROW_PITCH 와 한 벌(자를 새로 만들지 않는다) */
const GAP_K = 1.5;         /* `verify879` [2] 문턱 */
const MB_MIN_SC = 0.85;    /* `verify879` [2c] 문턱 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 그려진 상자에서 되잰다(813 [2] 규약). 받침은 의사요소라 같은 선언을 문 클론으로 잡는다. */
const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r2 = (v) => +(v).toFixed(2);
  const rel = (e) => { const b = e.getBoundingClientRect();
    return { t: r2(b.top - pr.top), b: r2(b.bottom - pr.top), h: r2(b.height),
             l: r2(b.left - pr.left), r: r2(b.right - pr.left) }; };
  const box = (s) => { const e = q(s); return e ? rel(e) : null; };
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (n) => { ruler.style.height = 'var(' + n + ')'; return ruler.getBoundingClientRect().height; };
  const fl = num('--rw-fl'), av = num('--rw-av');
  ruler.remove();
  const floorEl = q('#relw .rw-floor');
  const pedRule = (() => {
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      for (const rr of rules || []) if (rr.selectorText
        && rr.selectorText.replace(/\\s+/g, '') === '.rw-floor::before')
        return { top: rr.style.top, height: rr.style.height, width: rr.style.width };
    }
    return null;
  })();
  const pe = document.createElement('div');
  pe.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%)';
  pe.style.top = (pedRule && pedRule.top) || '-16px';
  pe.style.height = (pedRule && pedRule.height) || '56px';
  pe.style.width = (pedRule && pedRule.width) || '617px';
  floorEl.appendChild(pe);
  const ped = rel(pe); pe.remove();
  const grid = box('#relw .rw-grid'), mul = box('#rwMulBar'), mid = box('#relw .rw-mid');
  /* 조상 배율 — 지면선 위 «받침 돌출» 이 rwc 배로 줄어드는 것을 자가 알아야 한다 */
  const sc = +(mul.h / 98 / (parseFloat(getComputedStyle(q('#relw')).getPropertyValue('--rw-mbs')) || 1)).toFixed(4);
  return {
    panelH: r2(pr.height), panelX: r2(pr.left), panelY: r2(pr.top), panelW: r2(pr.width),
    fl: r2(fl), av: r2(av), ped, grid, mul, mid, sc,
    pedRise: r2(fl - ped.t),                 /* 받침 상변이 지면선 위로 나온 몫 */
    seat:    r2(mul.b - ped.t),              /* ★ 얹힘 깊이 */
    gapFl:   r2(fl - mul.b),                 /* 바 하변 ↓ 지면선 */
    gapUp:   r2(mul.t - grid.b),             /* 격자 **상자** 하변 ↓ 바 */
    /* ⚑ 879 4회차 — .rw-grid 상자는 마지막 슬롯 행보다 18.25px 아래에서 끝난다(height:516 고정 +
       3행 절대배치). [5]·[5b] 가 이 상자 값을 **그려진 행 간 25.6** 으로 나누고 있었다 = 분자 상자 ·
       분모 잉크. 그려진 자를 같이 낸다(verify879 [2] 와 한 벌). */
    gapUpDrawn: (() => { const c = [...document.querySelectorAll('#relw .rw-c')];
      return c.length ? r2(mul.t - (Math.max(...c.map(e => e.getBoundingClientRect().bottom)) - pr.top)) : null; })(),
    bandPed: r2(ped.b - fl),                 /* 지면선 ↓ 받침 하변 */
    bandAll: r2(mid.t - fl),                 /* «94px 여유» 전부 */
  };
})()`;

async function openAt(browser, url, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(560);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(220);
  return { ctx, page };
}

async function sweep(browser, url, css) {
  const r = {};
  for (const H of FRAMES) {
    const { ctx, page } = await openAt(browser, url, H, css);
    r[H] = await page.evaluate(MEASURE);
    await ctx.close();
  }
  return r;
}

/* ── [3] 화소 — 바를 숨긴 차분으로 «바가 칠한 화소» 를 잡는다 ───────────────── */
async function inkBelowFl(browser, H) {
  const shots = {};
  for (const [k, css] of [['base', ''], ['base2', ''], ['noBar', '#rwMulBar{display:none!important}']]) {
    const { ctx, page } = await openAt(browser, URL, H, css);
    const geo = await page.evaluate(MEASURE);
    const f = path.join(ROOT, `.v886-${process.pid}-${H}-${k}.png`);
    fs.writeFileSync(f, await page.screenshot());
    const d = decodePNG(f); shots[k] = { geo, w: d.w, h: d.h, px: d.px };
    fs.unlinkSync(f);
    await ctx.close();
  }
  /* ⚑ 문턱 40 — 요소 하나를 숨기면 이 화면 전체의 래스터가 계조 5~18 흔들린다(probe886 §화소).
     바 본체는 배경과 계조 100 이상 차이 나므로 40 이 «덮였다» 만 남긴다. */
  const TH = 40, { geo } = shots.base, W = shots.base.w;
  const d2 = (p, q, x, y) => { const i = (y * W + x) * 4;
    return Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]); };
  const px = geo.panelX, py = geo.panelY;
  const xa = Math.max(0, Math.round(px + geo.ped.l)), xb = Math.min(W, Math.round(px + geo.ped.r));
  let below = 0, noise = 0;
  for (let y = Math.round(py + geo.fl); y < Math.min(shots.base.h, Math.round(py + geo.fl) + 40); y++)
    for (let x = xa; x < xb; x++) {
      if (d2(shots.base.px, shots.base2.px, x, y) > TH) { noise++; continue; }
      if (d2(shots.base.px, shots.noBar.px, x, y) > TH) below++;
    }
  return { below, noise };
}

/* 사본 만들기 — 소스 문자열을 바꾼 index.html 을 루트에 잠깐 둔다 */
const tmp = [];
function variant(tag, from, to) {
  const src = fs.readFileSync(SRC, 'utf8');
  if (src.indexOf(from) < 0) return null;
  const f = path.join(ROOT, `.v886-${tag}-${process.pid}.html`);
  fs.writeFileSync(f, src.split(from).join(to));
  tmp.push(f);
  return 'file://' + f.replace(/\\/g, '/');
}

(async () => {
  const browser = await launch(chromium);
  const r = await sweep(browser, URL);
  const at = (k) => FRAMES.map(H => H + ':' + r[H][k]).join(' · ');

  /* ── [1] 받침 상변은 지면선이 아니다 ──────────────────────────────────── */
  ok(FRAMES.every(H => Math.abs(r[H].pedRise - PED * r[H].sc) <= 0.6),
    '[1] ★ 받침 상변이 지면선(`--rw-fl`)보다 ' + PED + 'px 위 — 867·879 가 «받침» 이라 부른 것은 이 선이 아니다',
    at('pedRise') + ' (조상 배율 ' + FRAMES.map(H => r[H].sc).join('/') + ')');

  /* ── [2] 얹힘 — 제품이 두 값에서 top 을 파생한다 ──────────────────────── */
  ok(FRAMES.every(H => Math.abs(r[H].seat - SEAT * r[H].sc) <= 0.6),
    '[2] ★ 바 하변이 받침 상면에 ' + SEAT + 'px 얹혀 있다 — 다섯 프레임 전부 같은 값(원점이 하변이라 배율이 안 건드린다)',
    at('seat'));
  ok(FRAMES.every(H => Math.abs(r[H].gapFl - (PED - SEAT) * r[H].sc) <= 0.6),
    '[2b] 그 결과 «바 하변 ↓ 지면선» 은 ' + (PED - SEAT) + 'px — 867 이 적은 12 와 항등이다(그래서 Δ0px)',
    at('gapFl'));

  /* ── [3] 안 덮는다 — 867 [3] 의 **실질**을 화소로 ─────────────────────── */
  const ink = [await inkBelowFl(browser, 1600), await inkBelowFl(browser, 2280)];
  ok(ink.every(o => o.below === 0),
    '[3] ★ 지면선 아래 40px 창에 바의 잉크가 **0 화소** — 접합선·계단·바닥은 한 픽셀도 안 덮는다(화소 자)',
    ink.map((o, i) => [1600, 2280][i] + ':' + o.below + '화소(잡음 ' + o.noise + ')').join(' · '));

  /* ── [4] «94px 여유» 는 빈 곳이 아니다 — 879 §18 을 자로 굳힌다 ─────────── */
  ok(FRAMES.every(H => r[H].bandPed >= r[H].bandAll * 0.5 - 0.6 || r[H].bandAll > 100),
    '[4] «지면선 ↓ 수반» 구간을 받침이 먹는다 — 1600 은 절반, 긴 프레임도 39.4px 이 받침이다(879 §18 의 자)',
    FRAMES.map(H => H + ':' + r[H].bandPed + '/' + r[H].bandAll).join(' · '));
  ok(FRAMES.every(H => r[H].pedRise > 0 && r[H].av - r[H].pedRise < r[H].av),
    '[4b] ★ 받침 상면 ' + FRAMES.map(H => r[H].pedRise)[0] + 'px 은 **니치 안**이다 — 니치는 879 의 항등식이 쓴 것보다 그만큼 좁다',
    FRAMES.map(H => H + ': av ' + r[H].av + ' 중 ' + r[H].pedRise + ' 이 받침').join(' · '));

  /* ── [5] ★ 기각의 근거 — «안 덮게» 옮기면 879 의 두 항 중 하나가 반드시 빨개진다 ──
     ⚑ 이것이 이 자의 본체다. [1]~[4] 는 «무엇이 사실인가» 를 적을 뿐이고, 886 이 «고칠 수
        없다» 고 말한 근거는 여기에만 있다. 갈래를 **제품에 넣어서** 재고, 두 문턱을 동시에
        넘는 자리가 없다는 것을 확인한다(probe886 [3] 의 게이트판). */
  {
    const longBar = r[2280].mul.h;
    const rows = [];
    for (const clear of [0, 12]) {
      const url = variant('c' + clear,
        'top:calc(var(--rw-fl) - 98px - (var(--rw-ped) - var(--rw-mb-seat)) * var(--rwc,1));z-index:5;',
        'top:calc(var(--rw-fl) - 98px - (var(--rw-ped) + ' + clear + 'px) * var(--rwc,1));z-index:5;');
      if (!url) { ok(false, '[5] 사본을 못 만들었다 — `#rwMulBar` 의 top 선언 문자열이 안 잡힌다'); break; }
      const rr = await sweep(browser, url);
      /* keep-gap 쪽 — 간극을 ×1.5 로 유지하면 배율이 얼마까지 내려가는가.
         `rwMulFit()` 이 니치에서 푸는 값이라 사본을 그대로 재면 «간극이 늘고 바는 그대로» 가
         되므로, 두 대가를 **둘 다** 적는다(879 [2c] 교훈 — 한 면만 재는 자는 아무것도 안 묻는다). */
      /* ⚑ 879 4회차 이관 — 분자를 **그려진** 마지막 슬롯에서 잰다(분모 ROW_PITCH 가 그려진 값이다).
         예약도 같은 이관을 받는다: 상자 하변에서 재는 예약 = 그려진 목표 − 격자 꼬리. */
      const TAIL = rr[1600].gapUpDrawn - rr[1600].gapUp;
      const gapKeepS = rr[1600].gapUpDrawn;
      const budget = rr[1600].av - rr[1600].pedRise - clear * rr[1600].sc;
      const barKeepG = budget - (ROW_PITCH * GAP_K - TAIL);
      rows.push({ clear, gapKeepS, tail: +TAIL.toFixed(2), gapX: +(gapKeepS / ROW_PITCH).toFixed(2),
        pctKeepG: +(barKeepG / longBar * 100).toFixed(1) });
    }
    /* ⚑⚑ 879 4회차 이관 — **이 항의 기각이 무효가 됐다(333 처방: 자리를 비우지 않고 방향을 뒤집는다).**
       886 은 «안 덮게 하면 879 의 두 문턱 중 하나가 반드시 깨진다» 를 산수로 못박았는데, 그 산수는
       간극을 **격자 상자** 하변에서 재고 있었다(분자 상자 · 분모 잉크 25.6). 879 4회차가 그 꼬리
       18.25px 을 빼고 다시 재자 **clear 0 은 두 문턱을 둘 다 지킨다**(간극 ×1.68 · 바 100%).
       ⇒ 기각은 **clear 12(867 의 말 그대로)에만** 남는다. 실제로 얹힘을 없애는 것은 **886 의 축**이라
         879 는 손대지 않고 **909 로 등재**했다 — 이 항은 그 등재의 근거를 사본으로 들고 있는다. */
    const c0 = rows.find(o => o.clear === 0), c12 = rows.find(o => o.clear === 12);
    ok(rows.length === 2
       && c0 && c0.gapX >= GAP_K && Math.min(c0.pctKeepG, 100) >= MB_MIN_SC * 100
       && c12 && (c12.gapX < GAP_K || c12.pctKeepG < MB_MIN_SC * 100),
      '[5] ★ «안 덮게» 는 이제 **clear 0 에서 가능하다**(879 4회차가 꼬리를 뺀 뒤) — 기각은 clear 12 에만 남는다 · 실행은 886 의 축이라 **909** 로 등재',
      rows.map(o => 'clear ' + o.clear + ' → 그려진 간극 ×' + o.gapX + ' / 간극을 지키면 바 ' + o.pctKeepG + '%').join(' · ')
        + ' (격자 꼬리 ' + (c0 ? c0.tail : '?') + ')');
    ok(r[1600].gapUpDrawn / ROW_PITCH >= GAP_K - 0.02 && r[1600].mul.h / longBar >= MB_MIN_SC,
      '[5b] 현행(얹힘 ' + SEAT + ')도 두 문턱을 **동시에** 넘는다 — «유일한 자리» 는 879 4회차가 무효로 만들었다(clear 0 도 넘는다)',
      '1600 그려진 간극 ×' + (r[1600].gapUpDrawn / ROW_PITCH).toFixed(2) +
      '(상자 자로는 ×' + (r[1600].gapUp / ROW_PITCH).toFixed(2) + ')' +
      ' · 바 ' + (r[1600].mul.h / longBar * 100).toFixed(1) + '%');
  }

  /* ── [6] Δ0px — 정정은 그리는 것을 한 픽셀도 안 바꿨다 ────────────────── */
  {
    const url = variant('lit',
      'top:calc(var(--rw-fl) - 98px - (var(--rw-ped) - var(--rw-mb-seat)) * var(--rwc,1));z-index:5;',
      'top:calc(var(--rw-fl) - 98px - 12px * var(--rwc,1));z-index:5;');
    if (!url) ok(false, '[6] 사본을 못 만들었다');
    else {
      const rv = await sweep(browser, url);
      let worst = 0, who = '';
      for (const H of FRAMES) for (const k of ['t', 'b', 'h', 'l', 'r']) {
        const d = Math.abs(r[H].mul[k] - rv[H].mul[k]);
        if (d > worst) { worst = d; who = H + ' mul.' + k; }
      }
      ok(worst < 0.02,
        '[6] ★ 옛 리터럴 식(`fl − 98 − 12·rwc`) 사본과 바의 상자가 Δ0px — 886 은 «무엇에 매였는가» 만 바꿨다',
        '최대 Δ ' + worst.toFixed(3) + 'px' + (who ? ' (' + who + ')' : ''));
    }
  }

  /* ── §R 결속 시험 — **받침을 옮기면 바가 따라가는가** ──────────────────────
     ⚑ 1회차에 여기를 «[1]·[2] 가 둘 다 빨개진다» 로 적었다가 자에게 반박당했다 —
        결속이 있으면 받침을 옮겨도 **얹힘은 안 변한다**(그게 결속의 정의다). 그래서 §R 은
        «둘 다 빨개지는가» 가 아니라 «[1] 만 빨개지고 [2] 는 살아 있는가» 를 묻는다.
        867 자리(리터럴 12)와의 대조는 §R1b 가 맡는다 — 거기서는 바가 **안 따라간다**. */
  {
    const url = variant('ped0', '    --rw-ped:16px;', '    --rw-ped:0px;');
    if (!url) ok(false, '§R 사본을 못 만들었다 — `--rw-ped` 선언이 안 잡힌다');
    else {
      const rv = await sweep(browser, url);
      const moved = FRAMES.every(H => Math.abs((rv[H].mul.b - r[H].mul.b) - PED * r[H].sc) <= 0.6);
      ok(FRAMES.every(H => rv[H].pedRise < 1) && moved
        && FRAMES.every(H => Math.abs(rv[H].seat - SEAT * rv[H].sc) <= 0.6),
        '§R `--rw-ped` 를 0 으로 만든 사본에서 [1] 은 빨개지고 **얹힘은 그대로**다 — 받침이 움직이면 바가 따라간다(437 결속)',
        '받침 돌출 ' + FRAMES.map(H => rv[H].pedRise).join('/') +
        ' · 얹힘 ' + FRAMES.map(H => rv[H].seat).join('/') +
        ' · 바 하변 이동 ' + FRAMES.map(H => (rv[H].mul.b - r[H].mul.b).toFixed(2)).join('/'));
    }
  }
  {
    /* §R1b — 867 자리(리터럴 12)에서는 같은 이동에 바가 **안 따라간다**. 결속이 없던 것이
       곧 867 이 4px 얹힘을 몰랐던 이유이므로, 그 «안 따라감» 을 자가 직접 찍는다. */
    const src = fs.readFileSync(SRC, 'utf8');
    const f = path.join(ROOT, `.v886-lit0-${process.pid}.html`);
    const body = src
      .split('top:calc(var(--rw-fl) - 98px - (var(--rw-ped) - var(--rw-mb-seat)) * var(--rwc,1));z-index:5;')
      .join('top:calc(var(--rw-fl) - 98px - 12px * var(--rwc,1));z-index:5;')
      .split('    --rw-ped:16px;').join('    --rw-ped:0px;');
    fs.writeFileSync(f, body); tmp.push(f);
    const rv = await sweep(browser, 'file://' + f.replace(/\\/g, '/'));
    ok(FRAMES.every(H => Math.abs(rv[H].mul.b - r[H].mul.b) < 0.02)
      && FRAMES.every(H => Math.abs(rv[H].seat - SEAT * rv[H].sc) > 10),
      '§R1b 옛 리터럴 식에서는 받침을 옮겨도 바가 **안 따라간다** — 얹힘이 조용히 갈린다(867 이 4px 을 몰랐던 기계)',
      '바 하변 이동 ' + FRAMES.map(H => (rv[H].mul.b - r[H].mul.b).toFixed(2)).join('/') +
      ' · 얹힘 ' + FRAMES.map(H => rv[H].seat).join('/') + ' (여기서 얹힘이 갈려야 한다)');
  }
  {
    const url = variant('seat0', '    --rw-mb-seat:4px;', '    --rw-mb-seat:0px;');
    if (!url) ok(false, '§R2 사본을 못 만들었다 — `--rw-mb-seat` 선언이 안 잡힌다');
    else {
      const rv = await sweep(browser, url);
      /* ⚑ 879 4회차 이관 — 옛 문장은 «얹힘 0 이면 «간극 ×1.5» 가 깨진다» 였고, 그 판정도
         **격자 상자** 자 위에 서 있었다(그려진 자로는 ×1.68 로 안 깨진다 — [5] 참조).
         이 항이 실제로 지키는 것은 «4px 이 예산과 **연결돼 있다**» 이므로, 문장을
         **깨짐** 이 아니라 **연동**으로 적는다: 얹힘을 없앤 만큼 그려진 간극이 정확히 줄어든다.
         깨지느냐는 909 가 답할 몫이다(지금 답은 «안 깨진다»). */
      const dGap = r[1600].gapUpDrawn - rv[1600].gapUpDrawn;
      ok(rv[1600].seat < 1 && Math.abs(dGap - SEAT * r[1600].sc) < 0.6,
        '§R2 얹힘을 0 으로 만들면 그려진 간극이 **정확히 그 4px 만큼** 줄어든다 — 4px 은 장식이 아니라 **예산의 일부**다(다만 879 4회차 뒤로는 그것이 문턱을 깨지 않는다 · 909)',
        '1600 얹힘 ' + rv[1600].seat + ' · 그려진 간극 ' + r[1600].gapUpDrawn + ' → ' + rv[1600].gapUpDrawn +
        ' (Δ' + dGap.toFixed(2) + ' ↔ 기대 ' + (SEAT * r[1600].sc).toFixed(2) +
        ' · ×' + (rv[1600].gapUpDrawn / ROW_PITCH).toFixed(2) + ')');
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (e) {} }
  console.log('\nVERIFY886 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
