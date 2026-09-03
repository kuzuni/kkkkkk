#!/usr/bin/env node
/* 작업 879 — 89 유물 소환 «1600 니치가 배수 바를 담는다» 게이트
 *
 *   node tools/verify879.js
 *
 * ── 무엇을 약속하는가 ────────────────────────────────────────────────────────
 * 813 8회차 §36 이 «1600 의 세 요구(아치 안쪽 · 격자↔바 · 들보↔아치 정점)는 서로의 재원» 임을
 * 제품에 넣어 확인하고 이 행을 넘겼다. 879 가 그 셋 중 **② 격자↔바** 하나를 재원 없이 낸다 —
 * 바를 «니치가 담을 수 있는 만큼» 으로 **등방 축소**(`--rw-mbs`)한다.
 *
 *   [1] 항등식  — 배율 = min(1, (av − 12 − 52) / 98). av 는 «그려진 니치»(받침 상변 − 격자 하변)
 *                 에서 되잰다 ⇒ CSS 의 예산식이 바뀌면 배율이 저절로 따라오고, JS 사본이
 *                 드리프트하면 **여기가 빨개진다**(rwMulFit 은 같은 식을 상수로 푼다).
 *   [2] 읽힘    — 1600 의 «격자 하변 ↓ 바» 가 격자 행 간(25.6)의 **2배 이상** ⇒ 채점 2인이
 *                 «바가 격자의 한 줄로 읽힌다» 고 적은 자리가 닫힌다.
 *   [3] 긴 프레임 Δ0px — 1841·1920·2280·2600 은 배율이 **정확히 1** 이고 셸이 98 × 646 @ 216 이다
 *                 (866 스냅 · 96·437 규약이 그대로 산다).
 *   [4] 등방    — 시각 상자의 종횡비가 646:98 로 다섯 프레임 전부 같다. 356 이 금지한 것은
 *                 «비균등» 이지 축소가 아니다 — 높이만 줄이면 `.stab.on` 정지점 표(437·352·337)가
 *                 두 벌이 되므로 **그 사고를 여기서 막는다**.
 *   [5] 867 규약 — 바 하변 ↔ 받침 상변 = 12px 이 배율과 **무관하게** 지켜진다
 *                 (`transform-origin:50% 100%` — 축소해도 시각 하변이 안 움직인다).
 *   [6] ⚑ ③ 은 «중첩» 이 아니다 — 상인방 상자 하변 ↔ 아치 상자 정점이 **양수**다.
 *                 8회차 채점자 CU 가 «화소로 −1px(중첩)» 을 1순위로 적었는데, `probe879` 가
 *                 세 번째 자(요소를 숨겨 차분으로 잡는 잉크 자)로 재니 **화소 여유 +18px**
 *                 (상자 여유 7.9 보다 오히려 넓다 — 상인방의 아래 10px 이 투명 정지점이다).
 *                 813 §38 과 같은 결말이고, 이 항은 그 결론이 뒤집히면 알아채라고 세운다.
 *
 * §R 되돌림 시험 — `--rw-mbs` 를 1(8회차 자리)로 되돌린 사본에서 [2] 가 **다시 빨개진다.**
 *    (무르게 푼 수리가 아님을 못박는 자리 — 334·368 규약)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const LONG = [1841, 1920, 2280, 2600];
const SHELL_H = 98, SHELL_W = 646, SHELL_L = 216;
const PED_GAP = 12;        /* 867 — 바 하변 ↔ 받침 상변 */
const ROW_PITCH = 25.6;    /* 격자 행 간 — 813 1회차 CF·CG 가 독립으로 25~26 */
const MB_GAP = 52;         /* 879 — «격자의 한 줄» 로 안 읽히는 최소선 = 행 간 26 의 2배 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 식을 옮겨 적지 않고 **그려진 것에서** 되잰다(813 [2] 규약). 아치는 의사요소라
   같은 식을 문 클론을 잠깐 넣어 브라우저가 푼 상자를 받는다(probe879 와 같은 자). */
const MEASURE = `(() => {
  const q = s => document.querySelector(s);
  const p = (q('#relw .rw-bowl') || q('#relw .rw-panel')).getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const rel = s => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect();
    return { t: r2(b.top - p.t2), b: r2(b.bottom - p.t2), h: r2(b.height), w: r2(b.width),
             l: r2(b.left), r: r2(b.right) }; };
  p.t2 = p.top;
  const grid = rel('#relw .rw-grid') || rel('#rwGrid');
  const mul = rel('#rwMulBar'), floor = rel('#relw .rw-floor'), lint = rel('#relw .rw-lintel');
  const bg = q('#relw .rw-bg');
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const archT = r2(ap.getBoundingClientRect().top - p.t2);
  ap.remove();
  const el = document.getElementById('relw');
  const mulEl = document.getElementById('rwMulBar');
  /* ⚑ 이 팝업은 조상 transform 을 타고 있어 **rect 는 CSS px 이 아니다**(1회차에 자가 여기서
     0.735 를 0.714 로 읽었다). 배율 하나로 두 공간을 잇는다 — 격자는 자기 transform 이
     scale(--rwc)=1 이므로 «rect 높이 / 레이아웃 높이» 가 곧 조상 배율이다. */
  const gEl = document.querySelector('#relw .rw-grid') || document.getElementById('rwGrid');
  const sc = grid.h / gEl.offsetHeight;
  return { sc: Math.round(sc * 1e5) / 1e5,
    av: r2(floor.t - grid.b),
    gapUp: r2(mul.t - grid.b),
    gapDown: r2(floor.t - mul.b),
    barW: mul.w, barH: mul.h,
    barCx: r2((mul.l + mul.r) / 2 - p.left),
    layH: mulEl.offsetHeight, layW: mulEl.offsetWidth, layL: mulEl.offsetLeft,
    mbs: parseFloat(getComputedStyle(el).getPropertyValue('--rw-mbs')) || 1,
    clear: r2(archT - lint.b),
  };
})()`;

async function sweep(browser, revert) {
  const r = {};
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(520);
    await page.evaluate(() => { S.relic = 1e9; openRelw(); });
    /* §R — 배율만 8회차 자리로 되돌린다(인라인이라 rwMulFit 이 쓴 값을 그대로 덮는다). */
    if (revert) await page.evaluate(() => document.getElementById('relw').style.setProperty('--rw-mbs', '1'));
    await page.waitForTimeout(200);
    r[H] = await page.evaluate(MEASURE);
    await ctx.close();
  }
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const r = await sweep(browser, false);
  const at = k => FRAMES.map(H => H + ':' + r[H][k]).join(' · ');

  /* ── [1] 항등식 — 배율이 «그려진 니치» 에서 나오는가 ─────────────────────── */
  /* av 를 CSS px 으로 되돌린 뒤 식에 넣는다(rwMulFit 은 CSS px 으로 푼다 — [1] 은 그 둘이
     같은 공간에서 만나는지를 묻는 항이다). */
  const want = H => Math.min(1, (r[H].av / r[H].sc - PED_GAP - MB_GAP) / SHELL_H);
  ok(FRAMES.every(H => Math.abs(r[H].mbs - want(H)) < 0.01),
    '[1] ★ 배율 = min(1, (니치 av − 12 − 52) / 98) — «그려진 니치» 에서 되잰 값과 일치(JS 사본 드리프트 감지)',
    FRAMES.map(H => H + ':' + r[H].mbs.toFixed(3) + '↔' + want(H).toFixed(3)).join(' · '));

  /* ── [2] 읽힘 — 813 8회차 채점 2인의 ② 지적이 닫히는 자리 ────────────────── */
  ok(r[1600].gapUp >= ROW_PITCH * 2,
    '[2] ★ 1600 의 «격자 하변 ↓ 바» 가 격자 행 간의 2배 이상 — «격자의 한 줄» 로 안 읽힌다',
    '1600:' + r[1600].gapUp + ' (행 간 ' + ROW_PITCH + ' 의 ' + (r[1600].gapUp / ROW_PITCH).toFixed(2) + '배)');
  ok(FRAMES.every(H => r[H].gapUp > r[H].gapDown * 1.5),
    '[2b] 위 간극 > 아래 간극 × 1.5 — 바가 아래(수반·소환 버튼) 블록에 붙어 읽힌다(867 [2b] 이관)',
    FRAMES.map(H => H + ':' + (r[H].gapUp / r[H].gapDown).toFixed(2) + ':1').join(' · '));

  /* ── [3] 긴 프레임 Δ0px ─────────────────────────────────────────────────── */
  ok(LONG.every(H => Math.abs(r[H].mbs - 1) < 1e-6),
    '[3] 긴 네 프레임의 배율은 **정확히 1** — 879 는 1600 한 장만 건드린다',
    LONG.map(H => H + ':' + r[H].mbs).join(' · '));
  ok(LONG.every(H => r[H].layH === SHELL_H && r[H].layW === SHELL_W && r[H].layL === SHELL_L
                  && Math.abs(r[H].barH - SHELL_H * r[H].sc) < 0.5
                  && Math.abs(r[H].barW - SHELL_W * r[H].sc) < 0.5),
    '[3b] 긴 네 프레임의 시각 상자 = 레이아웃 상자 98 × 646 @ 216 × 조상 배율 (866 스냅 · 96·437 규약)',
    LONG.map(H => H + ':' + r[H].barW.toFixed(1) + '×' + r[H].barH.toFixed(1)
      + '(기대 ' + (SHELL_W * r[H].sc).toFixed(1) + '×' + (SHELL_H * r[H].sc).toFixed(1) + ')').join(' · '));
  ok(r[1600].layH === SHELL_H && r[1600].layW === SHELL_W && r[1600].layL === SHELL_L,
    '[3c] 1600 도 **레이아웃 상자**는 98 × 646 @ 216 — 줄인 것은 transform 이라 이웃 좌표가 안 밀린다',
    '1600:' + r[1600].layH + '×' + r[1600].layW + '@' + r[1600].layL);

  /* ── [4] 등방 — 356 이 금지한 것은 «비균등» 이지 축소가 아니다 ───────────── */
  const AR = SHELL_W / SHELL_H;
  ok(FRAMES.every(H => Math.abs(r[H].barW / r[H].barH - AR) < 0.01),
    '[4] ★ 시각 종횡비 646:98 이 다섯 프레임 전부 불변 — 높이만 줄이면 `.stab.on` 정지점 표가 두 벌이 된다',
    FRAMES.map(H => H + ':' + (r[H].barW / r[H].barH).toFixed(3)).join(' · '));
  ok(Math.abs(r[1600].barCx / r[1600].sc - 539) < 1.2,
    '[4b] 1600 도 바 중심 539 — 원점 50% 라 축소가 좌우 대칭이다(866 의 중심 항등식)',
    '1600 중심:' + (r[1600].barCx / r[1600].sc).toFixed(1) + ' (조상 배율 ' + r[1600].sc + ')');

  /* ── [5] 867 규약이 배율과 무관하게 산다 ────────────────────────────────── */
  ok(FRAMES.every(H => Math.abs(r[H].gapDown - PED_GAP) <= 1),
    '[5] 바 하변 ↔ 받침 상변 = 12px — 다섯 프레임 전부(원점이 하변이라 축소가 이 값을 안 건드린다)',
    at('gapDown'));

  /* ── [6] ③ 은 «중첩» 이 아니다(probe879 §2 의 결론을 게이트로) ──────────── */
  ok(FRAMES.every(H => r[H].clear > 0),
    '[6] ★ 들보 하변 ↔ 아치 정점(상자)이 **양수** — CU 의 «화소 −1px 중첩» 은 세 번째 자로 미재현(probe879 §2: 화소 여유 +18)',
    at('clear'));

  /* ── §R 되돌림 ─────────────────────────────────────────────────────────── */
  const rv = await sweep(browser, true);
  ok(rv[1600].gapUp < ROW_PITCH * 2,
    '§R 배율을 1(8회차 자리)로 되돌리면 [2] 가 빨개진다 — 무르게 푼 수리가 아니다 (사본에서 빨개져야 한다)',
    '되돌린 1600 격자↔바 ' + rv[1600].gapUp + ' (행 간의 ' + (rv[1600].gapUp / ROW_PITCH).toFixed(2) + '배)');
  ok(LONG.every(H => Math.abs(rv[H].gapUp - r[H].gapUp) < 0.5),
    '§R2 되돌려도 긴 네 프레임은 한 픽셀도 안 바뀐다 — [3] 의 «1600 한 장» 이 사실임을 반대편에서 못박는다',
    LONG.map(H => H + ':' + rv[H].gapUp).join(' · '));

  await browser.close();
  console.log('\nVERIFY879 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
