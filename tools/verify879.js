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
 *   [1] 항등식  — 배율 = min(1, (av − 12 − 39) / 98). av 는 «그려진 니치»(받침 상변 − 격자 하변)
 *                 에서 되잰다 ⇒ CSS 의 예산식이 바뀌면 배율이 저절로 따라오고, JS 사본이
 *                 드리프트하면 **여기가 빨개진다**(rwMulFit 은 같은 식을 상수로 푼다).
 *   [2] 읽힘    — 1600 의 «격자 하변 ↓ 바» 가 격자 행 간(25.6)의 **1.5배 이상** ⇒ 8회차 채점 2인이
 *                 «바가 격자의 한 줄로 읽힌다» 고 적은 자리(×1.0)가 닫힌다.
 *   [2c] 크기   — ⚑ **2회차 신설.** 1600 의 바가 긴 프레임 바의 **85% 이상**이다.
 *                 1회차의 자는 [2](간극)만 물어서 «바가 아무리 작아도 초록» 이었고, 2회차 채점
 *                 2인(DL ② 3 · DM ② 4)과 셋째 자가 **각자 다른 마스크로** 그 대가를 −27% 로
 *                 일치시켰다. 이 화면의 규약이 «부품 크기는 고정» 이므로 예외를 상한으로 묶는다.
 *   [3] 긴 프레임 Δ0px — 1841·1920·2280·2600 은 배율이 **정확히 1** 이고 셸이 98 × 646 @ 216 이다
 *                 (866 스냅 · 96·437 규약이 그대로 산다).
 *   [4] 등방    — 시각 상자의 종횡비가 646:98 로 다섯 프레임 전부 같다. 356 이 금지한 것은
 *                 «비균등» 이지 축소가 아니다 — 높이만 줄이면 `.stab.on` 정지점 표(437·352·337)가
 *                 두 벌이 되므로 **그 사고를 여기서 막는다**.
 *   [5] 867 규약 — 바 하변 ↔ **지면선** = 12px 이 배율과 **무관하게** 지켜진다
 *                 (886 정정 — «받침 상변» 은 그보다 16px 위이고 바는 그 상면에 4px 얹혀 있다)
 *                 (`transform-origin:50% 100%` — 축소해도 시각 하변이 안 움직인다).
 *   [6] ⚑ ③ 은 «중첩» 이 아니다 — 상인방 상자 하변 ↔ 아치 상자 정점이 **양수**다.
 *                 8회차 채점자 CU 가 «화소로 −1px(중첩)» 을 1순위로 적었는데, `probe879` 가
 *                 세 번째 자(요소를 숨겨 차분으로 잡는 잉크 자)로 재니 **화소 여유 +18px**
 *                 (상자 여유 7.9 보다 오히려 넓다 — 상인방의 아래 10px 이 투명 정지점이다).
 *                 813 §38 과 같은 결말이고, 이 항은 그 결론이 뒤집히면 알아채라고 세운다.
 *
 * §R 되돌림 시험 — **둘이다**(2회차에 트레이드의 두 면이 생겼기 때문이다).
 *    §R  `--rw-mbs` 를 **1**(8회차 자리)로 올린 사본에서 [2] 가 빨개진다.
 *    §R3 `--rw-mbs` 를 **0.7347**(1회차의 «행 간 ×2» 자리)로 내린 사본에서 [2c] 가 빨개진다.
 *    한쪽만 있으면 «간극만 크면 초록» 이거나 «바만 크면 초록» 인 자다 (334·368 규약).
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
/* ⚑ 910 이관 — 얹힘(`--rw-mb-seat`)이 4 → 0 이 되어 이 값이 12 → **16** 이다(= `--rw-ped` − 얹힘).
   `rwMulFit()` 의 `RW_MB_FL` 과 한 벌이라 여기만 늙으면 [1] 이 «JS 사본 드리프트» 를 거꾸로 읽는다.
   ⚠ 다섯 프레임 전부 배율이 상한 1 에 걸려 있어 [1] 은 지금 **상한이 답을 준다** — 예산이
     4 줄었는데도(1600 1.088 → 1.047) 배율은 안 움직인다. 밸브가 실제로 무는지는 §R4 가 잰다. */
const PED_GAP = 16;        /* 867 — 바 하변 ↔ **지면선**(886 정정 · 910: 12 → 16 · 제품 `--rw-ped − --rw-mb-seat`) */
const ROW_PITCH = 25.6;    /* 격자 행 간 — 813 1회차 CF·CG 가 독립으로 25~26 */
/* 879 2회차 — 문턱을 **밝히고** 내렸다: 행 간 ×2(52) → **×1.5(39)**.
   ×2 는 1회차가 고른 값이지 레퍼런스가 준 값이 아니다. 2회차 채점 2인이 그 값의 **대가**
   (바가 이웃 중 혼자 −27% 로 작아지는 것)를 ② 의 1순위로 잡았고, DM 이 «지금 간극은 행 간의
   2.6배라 별도 그룹으로 읽힌다» 를 독립으로 확인했다(8회차 CT 의 «격자의 한 줄» 은 ×1.0 자리).
   ⚑ 무르게 푼 것이 아님은 **[2c]** 가 못박는다 — 1회차의 자는 간극만 물어서
   «바가 아무리 작아도 초록» 이었다(328~330 «누른 항을 묻는 항»). 이제 트레이드의 **두 면**을 잰다. */
const MB_GAP_K = 1.5;      /* 격자↔바 목표 = 행 간 × 이 값(제품 `RW_MB_GAP` 과 한 벌) */
const MB_MIN_SC = 0.85;    /* «크기 예외» 상한 — 1600 의 바는 긴 프레임 바의 85% 아래로 못 내려간다 */

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
  /* ⚑ 879 4회차 — «격자 하변» 이 둘이다. .rw-grid 는 height:516px 고정 상자이고
     3행(.rw-c)은 그 안에 절대배치라, **상자 하변은 마지막 슬롯 행보다 18.25px 아래**에서 끝난다.
     [2] 의 분모(ROW_PITCH 25.6)는 813 1회차가 **그려진 행 간**으로 낸 값이므로, 분자도
     **그려진 마지막 슬롯**에서 재야 한다(886 교훈 ⑤ 를 한 걸음 더 — 그 회차는 어긋남을 관측만 했다).
     ⚠ 이 블록은 템플릿 리터럴 안이다 — 백틱을 쓰면 자가 통째로 안 뜬다(4회차에 한 번 그랬다). */
  const cells = [...document.querySelectorAll('#relw .rw-c')];
  const slotBot = cells.length
    ? r2(Math.max(...cells.map(c => c.getBoundingClientRect().bottom)) - p.t2) : null;
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
    gapUp: r2(mul.t - grid.b),                     /* 상자 자 — 예산식(--rw-av)이 사는 공간 */
    slotBot,
    gapUpDrawn: r2(mul.t - slotBot),               /* ★ 그려진 자 — 눈이 보는 «격자 ↓ 바» */
    gTail: r2(grid.b - slotBot),                   /* 격자 상자가 마지막 슬롯 아래로 더 무는 꼬리 */
    gapDown: r2(floor.t - mul.b),          /* 바 하변 ↓ **지면선**(886 정정 — 받침 상변이 아니다) */
    barW: mul.w, barH: mul.h,
    barCx: r2((mul.l + mul.r) / 2 - p.left),
    layH: mulEl.offsetHeight, layW: mulEl.offsetWidth, layL: mulEl.offsetLeft,
    mbs: parseFloat(getComputedStyle(el).getPropertyValue('--rw-mbs')) || 1,
    clear: r2(archT - lint.b),
  };
})()`;

/* `mbsOverride` = null 이면 제품 그대로, 문자열이면 그 값을 인라인으로 덮는다.
   2회차에 «되돌림» 이 둘이 됐다 — [2] 는 배율을 **올려서**(1), [2c] 는 **내려서**(1회차의
   0.7347 = «행 간 ×2» 자리) 빨개져야 한다. 한쪽만 있으면 트레이드의 한 면만 지키는 자다. */
async function sweep(browser, mbsOverride) {
  const r = {};
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(520);
    await page.evaluate(() => { S.relic = 1e9; openRelw(); });
    /* §R — 배율만 다른 자리로 되돌린다(인라인이라 rwMulFit 이 쓴 값을 그대로 덮는다). */
    if (mbsOverride)
      await page.evaluate((v) => document.getElementById('relw').style.setProperty('--rw-mbs', v), mbsOverride);
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
  /* ⚑ 4회차 — 예약은 «그려진 목표 − 꼬리» 다. 꼬리는 **리터럴을 옮겨 적지 않고 그려진 것에서 잰다**
     (제품의 `RW_MB_GTAIL` 이 드리프트하면 여기가 빨개진다 — [1] 의 본래 일이 그것이다). */
  const gTailCss = H => r[H].gTail / r[H].sc;
  const want = H => Math.min(1,
    (r[H].av / r[H].sc - PED_GAP - (ROW_PITCH * MB_GAP_K - gTailCss(H))) / SHELL_H);
  ok(FRAMES.every(H => Math.abs(r[H].mbs - want(H)) < 0.01),
    '[1] ★ 배율 = min(1, (니치 av − ' + PED_GAP + ' − (39 − 격자 꼬리)) / 98) — «그려진 니치»·«그려진 꼬리» 에서 되잰 값과 일치(JS 사본 드리프트 감지 · 910: 12 → 16)',
    FRAMES.map(H => H + ':' + r[H].mbs.toFixed(3) + '↔' + want(H).toFixed(3)
      + '(꼬리 ' + gTailCss(H).toFixed(2) + ')').join(' · '));

  /* ── [2] 읽힘 — 813 8회차 채점 2인의 ② 지적이 닫히는 자리 ──────────────────
     ⚑ **4회차 이관(333 — 문턱이 아니라 자를 고쳤다).** 옛 항은 분자를 `.rw-grid` **상자** 하변에서
     재고 분모는 **그려진** 행 간(25.6)으로 나눴다 — 그 상자는 마지막 슬롯보다 18.25px 아래에서
     끝나므로 자가 간극을 늘 그만큼 **작게** 읽었다(헛빨강: 예산이 있는데 없다고 읽는다).
     4회차 채점 2인이 각자 다른 마스크로 그려진 간극을 **2.08배**(DP)·**2.59배**(DQ)로 재고
     둘 다 Q2(«격자의 한 줄로 읽히는가»)를 «결함 아님» 으로 답한 것이 이 이관의 근거다.
     **문턱 1.5 는 한 글자도 안 바뀌었다.** */
  ok(r[1600].gapUpDrawn >= ROW_PITCH * MB_GAP_K,
    '[2] ★ 1600 의 «**그려진** 마지막 슬롯 하변 ↓ 바» 가 격자 행 간의 1.5배 이상 — «격자의 한 줄»(×1.0) 로 안 읽힌다',
    '1600:' + r[1600].gapUpDrawn + ' (행 간 ' + ROW_PITCH + ' 의 '
      + (r[1600].gapUpDrawn / ROW_PITCH).toFixed(2) + '배 · 상자 자로는 ' + r[1600].gapUp + ')');
  /* [2e] 신설 — 두 자의 차가 **꼬리 하나로 설명되는가**. 이 항이 없으면 [2] 의 이관은
     «분자를 키워 초록을 산 것» 과 구별되지 않는다(다섯 프레임 전부 같은 꼬리여야 한다). */
  ok(FRAMES.every(H => Math.abs((r[H].gapUpDrawn - r[H].gapUp) - r[H].gTail) < 0.05)
     && FRAMES.every(H => Math.abs(r[H].gTail - r[1600].gTail) < 0.5),
    '[2e] ★ «상자 자 ↔ 그려진 자» 의 차 = 격자 꼬리 하나이고, 그 꼬리는 다섯 프레임에서 같다 — 이관이 «분자를 키운 것» 이 아님을 못박는다',
    FRAMES.map(H => H + ':' + r[H].gTail).join(' · '));
  /* ── [2c] 신설 — 트레이드의 **반대편**. 1회차의 자에 없던 항이다 ─────────────
     이 화면의 규약은 «패널 높이만 달라지고 부품 크기는 고정» 이고, 슬롯·수반·가격 알약은
     실제로 두 프레임 Δ0 다. 바만 예외가 되는 것을 여기서 상한으로 묶는다.
     ⚠ 조상 배율(`--rwc`)로 나눠 «프레임 자신의 fit» 과 «879 가 얹은 예외» 를 가른다. */
  ok(r[1600].barH / r[1600].sc >= (r[2280].barH / r[2280].sc) * MB_MIN_SC,
    '[2c] ★ 1600 의 바가 긴 프레임 바의 ' + (MB_MIN_SC * 100) + '% 이상 — «부품 크기 고정» 규약의 예외를 상한으로 묶는다(2회차 채점 2인 ②)',
    '1600:' + (r[1600].barH / r[1600].sc).toFixed(2) + ' ↔ 2280:' + (r[2280].barH / r[2280].sc).toFixed(2)
      + ' = ' + (r[1600].barH / r[1600].sc / (r[2280].barH / r[2280].sc) * 100).toFixed(1) + '%');
  /* ── [2d] 신설 — ⚑ **이 회차의 «누른 항을 묻는 항»** ────────────────────────
     3회차가 «제로섬이라 더 못 낸다» 로 멈춘 진짜 이유는 **밸브가 필요한 것보다 더 줄이고 있었고
     그것을 묻는 항이 없었기** 때문이다. [2c](바 ≥ 85%)는 0.899 에서도 초록이라 그 과잉을 못 봤다.
     ⇒ **줄였으면 «목표까지만» 줄였어야 한다** — 배율이 1 미만인 프레임에서는 그려진 간극이
     목표(행 간 ×1.5)에 붙어 있어야 하고, 목표보다 크면 그만큼 바를 헛되이 깎은 것이다.
     지금 1600 은 배율 1 이라 이 항은 «해당 없음» 으로 통과한다 — §R4 가 그 반대편을 찍는다. */
  ok(FRAMES.every(H => r[H].mbs >= 1 - 1e-6
                    || Math.abs(r[H].gapUpDrawn - ROW_PITCH * MB_GAP_K) <= 1.5),
    '[2d] ★ 배율을 줄인 프레임은 «목표까지만» 줄였다 — 그려진 간극이 목표(행 간 ×1.5 = 38.4)를 넘으면 바를 헛되이 깎은 것이다',
    FRAMES.map(H => H + ':' + (r[H].mbs >= 1 - 1e-6 ? '배율1(해당없음)' : r[H].gapUpDrawn + '↔38.4')).join(' · '));
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

  /* ── [5] 867 규약이 배율과 무관하게 산다 ──────────────────────────────────
     ⚑ 886 이관 — 이 항의 «받침 상변» 은 실은 **지면선**(`--rw-fl`)이다. 받침
     (`.rw-floor::before`)의 상변은 그보다 16px 위이고 바는 그 상면을 4px 파고들어 있다
     (`probe886` [1] · 다섯 프레임 전부 +3.94 · `verify867` [1c] 가 그 4 를 묻는다).
     ⚠ 886 은 여기에 «니치 av 가 그 16 을 이미 물고 있어서 «안 덮게» 하는 순간 [2]나 [2c] 중
       하나가 반드시 빨개진다» 를 적어 두었다. **4회차가 그 산수를 무효로 만들었고(꼬리 18.25)
       910 이 실제로 얹힘을 0 으로 내렸다** — 지금 [2] 는 ×1.68, [2c] 는 100% 로 둘 다 초록이다.
       그래서 이 값이 12 가 아니라 **16** 이고, 그것이 이 항이 지키는 새 자리다.
     여기서는 값과 이름을 같이 고친다(333 — 자리를 비우지 않는다). */
  ok(FRAMES.every(H => Math.abs(r[H].gapDown - PED_GAP) <= 1),
    '[5] 바 하변 ↔ **지면선**(`--rw-fl`) = ' + PED_GAP + 'px — 다섯 프레임 전부(원점이 하변이라 축소가 이 값을 안 건드린다 · 886 정정 · 910 이 12 → 16)',
    at('gapDown'));

  /* ── [6] ③ 은 «중첩» 이 아니다(probe879 §2 의 결론을 게이트로) ──────────── */
  ok(FRAMES.every(H => r[H].clear > 0),
    '[6] ★ 들보 하변 ↔ 아치 정점(상자)이 **양수** — CU 의 «화소 −1px 중첩» 은 세 번째 자로 미재현(probe879 §2: 화소 여유 +18)',
    at('clear'));

  /* ── §R 되돌림 ─────────────────────────────────────────────────────────── */
  /* ⚑ 4회차 — 제품이 이미 배율 1 이라 옛 §R(«1 로 올린다»)은 이제 **아무것도 안 묻는다.**
     [2] 가 여전히 무는지 보려면 **1 보다 더 키워야** 한다. 1.15 는 그려진 간극을
     46.90 → 32.4(행 간의 1.27배)로 밀어 문턱 아래로 내린다. */
  const rv = await sweep(browser, '1.15');
  ok(rv[1600].gapUpDrawn < ROW_PITCH * MB_GAP_K,
    '§R 배율을 1.15 로 **더 키운** 사본에서 [2] 가 빨개진다 — 문턱이 아직 무는지 (제품이 배율 1 이라 옛 «1 로 되돌리기» 는 이제 아무것도 안 묻는다)',
    '되돌린 1600 그려진 격자↔바 ' + rv[1600].gapUpDrawn + ' (행 간의 ' + (rv[1600].gapUpDrawn / ROW_PITCH).toFixed(2) + '배)');
  /* ⚑ 4회차 이관 — 옛 §R2 는 «배율 1 을 강제해도 긴 네 프레임은 안 움직인다» 였다. 그때는
     1600 만 1 이 아니어서 그 문장이 «879 는 1600 한 장만 건드린다» 를 뜻했다. 이제는
     **다섯 프레임 전부 1** 이므로 같은 사본이 더 센 것을 말한다 — «879 의 밸브는 지금
     어디에서도 안 물린다»(꼬리를 바로 재자 1600 도 니치 안에 그대로 들어갔다).
     ⚠ rv(1.15)로는 이 문장을 못 쓴다 — sweep 은 다섯 프레임 **전부**를 덮으므로 긴 프레임도 같이 커진다. */
  const rv0 = await sweep(browser, '1');
  ok(FRAMES.every(H => Math.abs(rv0[H].gapUp - r[H].gapUp) < 0.5
                    && Math.abs(rv0[H].barH - r[H].barH) < 0.5),
    '§R2 배율 1 을 강제해도 **다섯 프레임 전부** 한 픽셀도 안 바뀐다 — 4회차 뒤 879 의 밸브는 어디에서도 안 물린다(1600 포함)',
    FRAMES.map(H => H + ':' + rv0[H].gapUp).join(' · '));

  /* §R3 — 반대편 되돌림. 1회차의 «행 간 ×2» 자리(배율 0.7347)에서 [2c] 가 빨개져야 한다.
     이것이 없으면 [2c] 는 «지금 값이라 초록» 일 뿐 무엇도 안 묻는 항이다. */
  /* ⚠ 분모는 **되돌리지 않은** r[2280] 이다. sweep 은 다섯 프레임 **전부**를 덮으므로
     rv2 끼리 비교하면 둘 다 같이 줄어 비가 100% 로 나오고 — 자가 아무것도 안 묻는다
     (2회차에 실제로 그렇게 짜서 한 번 빨개졌다). 물어야 할 것은
     «1600 만 1회차 자리로 돌아가면» 이므로 긴 프레임은 제품 값이어야 한다. */
  const rv2 = await sweep(browser, '0.7347');
  ok(rv2[1600].barH / rv2[1600].sc < (r[2280].barH / r[2280].sc) * MB_MIN_SC,
    '§R3 배율을 1회차의 0.7347(«행 간 ×2» 자리)로 되돌리면 [2c] 가 빨개진다 — 트레이드의 반대편도 실제로 잰다',
    '되돌린 1600 바/긴 프레임 바 '
      + (rv2[1600].barH / rv2[1600].sc / (r[2280].barH / r[2280].sc) * 100).toFixed(1) + '%');

  /* §R4 신설 — ⚑ **이 회차가 고친 것을 되돌리는 시험.** 옛 자(꼬리를 안 뺀 예약)는 배율을
     **0.899** 로 내렸다. 그 사본에서 [2c](바 ≥ 85%)는 89.9% 로 **초록인 채**이고 — 그래서
     3회차가 «더 낼 것이 없다» 로 멈출 수 있었다 — **[2d] 가 빨개져야** 한다
     (그려진 간극 56.66 이 목표 38.4 를 18.3 넘는다 = 그만큼 바를 헛되이 깎았다). */
  const rv3 = await sweep(browser, '0.899');
  const r4ok = rv3[1600].barH / rv3[1600].sc >= (r[2280].barH / r[2280].sc) * MB_MIN_SC
            && Math.abs(rv3[1600].gapUpDrawn - ROW_PITCH * MB_GAP_K) > 1.5;
  ok(r4ok,
    '§R4 ★ 옛 자리(배율 0.899)로 되돌리면 [2c] 는 **초록인 채** [2d] 가 빨개진다 — 3회차의 «제로섬» 이 자의 헛빨강이었음을 사본으로 못박는다',
    '되돌린 1600 바 ' + (rv3[1600].barH / rv3[1600].sc / (r[2280].barH / r[2280].sc) * 100).toFixed(1)
      + '%(≥85 초록) · 그려진 간극 ' + rv3[1600].gapUpDrawn + ' ↔ 목표 ' + (ROW_PITCH * MB_GAP_K).toFixed(1));

  await browser.close();
  console.log('\nVERIFY879 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
