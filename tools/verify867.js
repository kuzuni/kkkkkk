#!/usr/bin/env node
/* 작업 867 — 89 유물 소환 «배수 바를 벽에서 빼 받침 위로» 게이트
 *
 *   node tools/verify867.js
 *
 * ── 무엇을 약속하는가 ────────────────────────────────────────────────────────
 * 813 5회차가 산수로 닫은 결론: **배수 바가 «상인방 ↔ 격자» 벽에 있는 한 1600 은 못 푼다.**
 *   벽 146.8 − 셸 98 = 여유 48.8  vs  두 요구(들보↓바 ≥ 21.5 · 바↓격자 ≥ 45~52)의 합 66.5~73.5
 * 867 은 그 벽에서 바를 빼 **아치 안쪽 «받침 위 12px»** 로 내린다. 자가 지키는 약속은 다섯:
 *
 *   [1] 자리     — 바 하변 ↔ **지면선**(`--rw-fl`) = **16px**(910 — 867 의 12 에서), 다섯 프레임 전부 같다
 *   [1c] 얹힘    — 바 하변 ↔ **받침 상변**(지면선 −16) = **0px**(910 — 886 이 잰 +4 파고듦을 없앴다.
 *                 867 이 «12 위» 라 부른 자리의 실제 도면은 «받침 안 4» 였고, 이제 «받침 상면에 닿음» 이다)
 *   [2] 읽힘     — 위 간극(**그려진** 마지막 슬롯 ↓ 바 · 910 이관) > 격자 행 간 25.6 **이고** 아래 간극보다 크다
 *   [2e] 신설    — 그 이관이 «분자를 키운 것» 이 아니다: 상자 자와의 차 = 격자 꼬리 하나(다섯 프레임 동일)
 *                  ⇒ 바가 «격자의 마지막 줄» 이 아니라 «수반·소환 버튼의 컨트롤» 로 읽힌다
 *   [3] 안 덮는다 — 바 하변이 **지면선보다 위** ⇒ 접합선·계단·바닥을 한 픽셀도 안 덮는다
 *                  (886 정정 — 옛 문구의 «받침» 은 헛초록이었다: 받침 상면은 4px 덮여 있고 [1c] 가 그것을 묻는다)
 *                  (700 이 ⓑ 를 기각한 근거 그대로 · `verify700` [B6] 의 강화판)
 *   [4] 벽       — 벽에는 이제 바가 **없다**(벽 기하 자체는 Δ0px — 867 은 예산을 안 건드렸다)
 *   [5] 89 Δ0px  — 바를 옮기느라 89 의 다른 요소가 한 픽셀도 안 움직였다
 *
 * §R 되돌림 시험 — 옛 식(벽 안 배치)으로 되돌린 사본에서 [1]·[2]·[4] 가 **다시 빨개진다**.
 *    (무르게 푼 수리가 아님을 못박는 자리 — 334·368 규약)
 *
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets·웹폰트가 404 라 글줄이 늘어나 «다른 것을 재게»
 *   된다(700 §preTree 의 1회차 함정). 이름에 pid(648 규약 · `.gitignore` 의 `/.*.html` 이 덮는다).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const SHELL_H = 98;        /* 공용 셸 높이(96·437 규약) */
/* ⚑ 910 이관 — 얹힘이 4 → 0 이 되어 바가 4px 올라갔다. 두 상수가 **한 벌로** 움직인다:
   지면선까지는 12 → **16**(= `--rw-ped` − `--rw-mb-seat`), 얹힘은 4 → **0**.
   867 의 «받침 위에 얹힌» 은 이제 «받침 상면에 닿는» 이다(886 §R2 가 되돌림을 사본으로 잰다). */
const PED_GAP = 16;        /* 867 — 바 하변 ↔ **지면선**(886 정정: 867 은 이것을 «받침 상변» 이라 불렀다 · 910 이 12 → 16) */
const SEAT = 0;            /* 910 — 얹힘 깊이(제품 `--rw-mb-seat` 과 한 벌). 886 의 4 를 0 으로 내렸다 */
const ROW_PITCH = 25.6;    /* 격자 행 간 — 813 1회차 CF·CG 실측(둘이 25~26 으로 독립 일치) */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const MEASURE = `(() => {
  const R = s => { const e = document.querySelector(s); if (!e) return null;
    const q = e.getBoundingClientRect(); return { t: q.top, b: q.bottom, h: q.height, l: q.left, r: q.right }; };
  const p = R('#relw .rw-bowl') || R('#relw .rw-panel');
  const rel = o => o && { t: +(o.t - p.t).toFixed(2), b: +(o.b - p.t).toFixed(2),
                          h: +o.h.toFixed(2), l: +o.l.toFixed(2), w: +(o.r - o.l).toFixed(2) };
  /* ⚠ getBoundingClientRect 는 transform:scale(--rwc) 가 **먹은 뒤**의 상자다
     (이 절은 통째로 템플릿 문자열이라 여기서는 백틱을 쓰지 마라) —
     셸 규격(98 × **646 @ 216** — 866 이관)은 CSS 값이므로 레이아웃 상자(offset*)로 물어야 한다.
     둘을 섞으면 «셸을 줄였다» 와 «그릇이 줄었다» 를 구분 못 한다(1회차에 밟았다). */
  const mulEl = document.getElementById('rwMulBar');
  const lay = mulEl ? { h: mulEl.offsetHeight, w: mulEl.offsetWidth, l: mulEl.offsetLeft } : null;
  const o = { grid: rel(R('#rwGrid')), mul: rel(R('#rwMulBar')), lintel: rel(R('#relw .rw-lintel')),
              floor: rel(R('#relw .rw-floor')), ground: rel(R('#relw .rw-ground')),
              mid: rel(R('#relw .rw-mid')), cap: rel(R('#relw .rw-cap')),
              steps: rel(R('#relw .rw-steps')), basin: rel(R('#rwBasin')) };
  /* 886 이관 — **받침 상변은 .rw-fl 이 아니다.** 받침은 의사요소(.rw-floor::before)라
     상자를 못 잡으므로 같은 선언을 문 클론을 잠깐 넣어 브라우저가 푼 상자를 되잰다.
     이 자가 «받침» 이라 부르던 gapDown 은 실은 **지면선**까지의 값이었다(probe886 [1]). */
  const flEl = document.querySelector('#relw .rw-floor');
  let pedT = null;
  if (flEl) {
    const pedRule = (() => {
      for (const ss of document.styleSheets) {
        let rules; try { rules = ss.cssRules; } catch (e) { continue; }
        for (const rr of rules || []) if (rr.selectorText
          && rr.selectorText.replace(/\s+/g, '') === '.rw-floor::before')
          return { top: rr.style.top, height: rr.style.height, width: rr.style.width };
      }
      return null;
    })();
    const pe = document.createElement('div');
    pe.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%)';
    pe.style.top = (pedRule && pedRule.top) || '-16px';
    pe.style.height = (pedRule && pedRule.height) || '56px';
    pe.style.width = (pedRule && pedRule.width) || '617px';
    flEl.appendChild(pe);
    pedT = +(pe.getBoundingClientRect().top - p.t).toFixed(2);
    pe.remove();
  }
  /* ⚑ 910 이관(879 4회차 §23 의 같은 처방) — «격자 하변» 이 둘이다. .rw-grid 는 height:516px
     고정 상자이고 3행(.rw-c)은 그 안에 절대배치라 **상자 하변이 마지막 슬롯 행보다 18.25px 아래**다.
     [2] 의 분모(ROW_PITCH 25.6)는 813 1회차가 **그려진** 행 간으로 낸 값이므로 분자도 그려진
     마지막 슬롯에서 재야 한다 — 여기가 verify879 [2] 의 쌍인데 4회차가 이 자를 안 데려갔다.
     ⚠ 이 블록은 통째로 템플릿 문자열이다 — 백틱을 쓰지 마라(879 4회차가 한 번 밟았다). */
  const cells = [...document.querySelectorAll('#relw .rw-c')];
  const slotBot = cells.length
    ? +(Math.max(...cells.map(c => c.getBoundingClientRect().bottom)) - p.t).toFixed(2) : null;
  return { panelH: +p.h.toFixed(2), o, lay, pedT, slotBot,
    seat:    pedT === null ? null : +(o.mul.b - pedT).toFixed(2), /* ★ 886 — 얹힘 깊이(양수 = 받침을 파고든다 · 910 이 0 으로) */
    gapUp:   +(o.mul.t - (o.grid.t + o.grid.h)).toFixed(2),   /* 격자 **상자** 하변 ↓ 바 */
    gapUpDrawn: slotBot === null ? null : +(o.mul.t - slotBot).toFixed(2), /* ★ 그려진 자 — 눈이 보는 «격자 ↓ 바» */
    gTail:   slotBot === null ? null : +((o.grid.t + o.grid.h) - slotBot).toFixed(2), /* 격자 꼬리 */
    gapDown: +(o.floor.t - o.mul.b).toFixed(2),               /* 바 ↓ **지면선**(886 정정) */
    overSeam:+(o.ground.t - o.mul.b).toFixed(2),              /* 바 ↓ 접합선(지면) 상변 */
    gapGridTop: +(o.grid.t - o.mul.b).toFixed(2),             /* 옛 자리의 쌍 — 바 ↓ 격자 «상변» */
    wall:    +(o.grid.t - o.lintel.b).toFixed(2),
    inWall:  o.mul.b <= o.grid.t + 0.5 };
})()`;

async function sweep(browser, url) {
  const r = {};
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(560);
    await page.evaluate(() => { S.relic = 1e9; openRelw(); });
    await page.waitForTimeout(220);
    r[H] = await page.evaluate(MEASURE);
    await ctx.close();
  }
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const tmp = [];
  const r = await sweep(browser, URL);
  const at = (k) => FRAMES.map(H => H + ':' + r[H][k]).join(' · ');

  /* ── [1] 자리 ──────────────────────────────────────────────────────────── */
  ok(FRAMES.every(H => Math.abs(r[H].gapDown - PED_GAP) <= 1),
    '[1] 바 하변 ↔ **지면선**(`--rw-fl`) = ' + PED_GAP + 'px — 다섯 프레임 전부 같은 값 (886 정정: 이 값이 «받침» 까지가 아니다 · 910: 12 → 16)',
    at('gapDown'));
  /* ⚑ 886 이관 — 자리를 비우지 않고 **묻는 것을 하나 늘린다**(333 처방). 867 은 «받침 상변에서
     12 위» 라고 적었는데 받침(`.rw-floor::before`)의 상변은 지면선보다 16px 위라, 도면에서는
     바가 그 상면을 **4px 파고들고** 있다. 그 4 를 이제 제품이 `--rw-mb-seat` 으로 밝혀 적고
     이 항이 그것을 지킨다 — 받침이 움직이면 바가 따라가야 한다(437 결속). */
  ok(FRAMES.every(H => r[H].seat !== null && Math.abs(r[H].seat - SEAT) <= 0.6),
    '[1c] ★ 바 하변 ↔ **받침 상변** = 얹힘 ' + SEAT + 'px — 바가 받침 상면에 **닿기만** 한다(886 이 잰 4px 파고듦을 910 이 없앴다)',
    at('seat'));
  /* ⚑ 866 이관 — 폭·좌가 **724@178 → 646@216** 으로 옮겨졌다. 867 이 지킨 것은 «셸을
     안 건드렸다» 가 아니라 «**세로 자리만** 옮겼다» 이므로, 이 항이 묻는 것은 그대로 두고
     상수만 따라간다(높이 98 은 여전히 96·437 규약이다). 866 이 옮긴 이유는 가로가 격자
     어느 모듈에도 안 맞았기 때문이고(813 5회차 CP·CQ), 새 값은 3열 행 216..862 의 span 이다. */
  ok(FRAMES.every(H => r[H].lay && r[H].lay.h === SHELL_H && r[H].lay.w === 646 && r[H].lay.l === 216),
    '[1b] 셸 높이는 안 건드렸다 — 레이아웃 상자 98 × 646 @ 216 (96·437 규약 · 866 이 격자 모듈로)',
    FRAMES.map(H => H + ':' + r[H].lay.h + '×' + r[H].lay.w + '@' + r[H].lay.l).join(' · '));

  /* ── [2] 읽힘 — CP·CQ 의 1순위를 새 이웃 기준으로 다시 묻는다 ──────────── */
  /* ⚑⚑ 910 이관(333 — 자리도 문턱도 그대로, **자만** 바꾼다). 이 항은 분자를 격자 **상자**
     하변에서 재고 분모는 **그려진** 행 간(25.6)으로 나누고 있었다 — `verify879` [2] 가 4회차에
     고친 바로 그 어긋남인데 이 쌍둥이는 안 데려갔다(그 자는 문턱이 ×1.5 라 먼저 빨개졌고,
     여기는 ×1.0 이라 1600 이 1.12 로 **간신히** 초록이었다: 헛초록이 아니라 «헛여유»).
     910 이 바를 4px 올리자 상자 자로는 0.97 로 넘어가지만, 그려진 자로는 **×1.68** 이다.
     ⇒ 두 자를 다 찍고 판정은 그려진 쪽으로 한다. 짝 항 [2e] 가 «분자를 키워 초록을 산 것» 이
       아님을 못박는다(차이 = 격자 꼬리 하나 · 다섯 프레임에서 같다 — `verify879` [2e] 와 한 벌). */
  ok(FRAMES.every(H => r[H].gapUpDrawn > ROW_PITCH),
    '[2] 위 간극(**그려진** 마지막 슬롯 하변 ↓ 바)이 격자 행 간 25.6 보다 넓다 — «격자의 한 줄» 로 안 읽힌다',
    at('gapUpDrawn') + ' · 행 간 대비 ' + FRAMES.map(H => (r[H].gapUpDrawn / ROW_PITCH).toFixed(2)).join('/') + '배'
      + ' (상자 자로는 ' + FRAMES.map(H => (r[H].gapUp / ROW_PITCH).toFixed(2)).join('/') + '배)');
  ok(FRAMES.every(H => Math.abs((r[H].gapUpDrawn - r[H].gapUp) - r[H].gTail) < 0.05)
     && FRAMES.every(H => Math.abs(r[H].gTail - r[1600].gTail) < 0.5),
    '[2e] ★ «상자 자 ↔ 그려진 자» 의 차 = 격자 꼬리 하나이고, 그 꼬리는 다섯 프레임에서 같다 — 910 의 이관이 «분자를 키운 것» 이 아님을 못박는다',
    FRAMES.map(H => H + ':' + r[H].gTail).join(' · '));
  ok(FRAMES.every(H => r[H].gapUp > r[H].gapDown * 1.5),
    '[2b] 위 간극 > 아래 간극(**지면선**까지) × 1.5 — 바가 **아래(수반·소환 버튼) 블록**에 붙어 읽힌다(CQ 의 기능 축)',
    FRAMES.map(H => H + ':' + (r[H].gapUp / r[H].gapDown).toFixed(2) + ':1').join(' · '));

  /* ── [3] 안 덮는다 — 700 이 ⓑ 를 기각한 그 근거 ────────────────────────── */
  /* ⚑ 886 이관 — 옛 문구(«받침·접합선·계단·바닥을 한 픽셀도 안 덮는다»)는 **헛초록**이었다.
     이 항이 재는 `gapDown` 은 지면선까지의 값이고, 받침 상면은 그 위 16px 에 있어 실제로는
     4px 이 덮여 있다(probe886 [2] «상면 띠 가림 85~98%»). 실질(접합선·계단·바닥)은 그대로
     지켜지므로 **자리를 비우지 않고 약속을 도면에 맞춘다** — 받침은 [1c] 가 따로 묻는다. */
  ok(FRAMES.every(H => r[H].gapDown > 0),
    '[3] ★ 바 하변이 **지면선보다 위** — 접합선·계단·바닥을 한 픽셀도 안 덮는다(700 [B6] 강화판 · 886 정정)',
    at('gapDown'));
  ok(FRAMES.every(H => r[H].overSeam > 40),
    '[3b] 접합선(지면 상변)까지 여유가 40px 위 — 700 이 1600 에서 −5.1px 로 기각한 자리와 반대편이다',
    at('overSeam'));

  /* ── [4] 벽 — 바는 나갔고, 벽 기하 자체는 안 건드렸다 ──────────────────── */
  ok(FRAMES.every(H => !r[H].inWall),
    '[4] ★ 바가 «상인방 ↓ 격자» 벽 밖에 있다 — 867 이 통째로 되돌아가면 이 항이 먼저 말한다',
    FRAMES.map(H => H + ':' + (r[H].inWall ? '벽 안' : '벽 밖')).join(' · '));
  /* 813 5회차가 «여백 배분으로는 못 푼다» 를 증명한 그 산수를 자가 그대로 들고 있는다 —
     이 항이 초록인 한 «벽으로 되돌리면 된다» 는 길은 여전히 막혀 있다. */
  ok(r[1600].wall - SHELL_H < 66.5,
    '[4b] 1600 의 벽 여유(벽 − 98)는 여전히 두 요구의 합 66.5 보다 작다 — 벽으로 되돌리는 길은 안 열렸다',
    '1600 여유 ' + (r[1600].wall - SHELL_H).toFixed(1) + ' vs 요구 66.5~73.5 · ' + at('wall'));

  /* ── [5] 89 Δ0px — 867 은 예산을 한 줄도 안 건드렸다 ──────────────────────
     기준은 «바를 옛 자리로 되돌린 사본» 이다 — 그 사본과 현행의 차이가 **바 하나뿐**이면
     이 작업이 다른 것을 안 밀었다는 뜻이다(700 [C] 와 같은 축, 기준만 사본으로). */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    /* 886 이관 — 앵커가 «지면선 − 12» 리터럴에서 «받침 상변 − 얹힘»(`--rw-ped`/`--rw-mb-seat`)
       파생으로 바뀌었다. 그리는 값은 항등(16 − 4 = 12)이라 [5]·§R 이 묻는 것은 그대로다. */
    const FROM = 'top:calc(var(--rw-fl) - 98px - (var(--rw-ped) - var(--rw-mb-seat)) * var(--rwc,1));z-index:5;';
    const TO = 'top:calc(var(--rw-gt) - 98px * var(--rwc,1)' +
               ' - min(44px * var(--rwc,1),' +
               ' calc((var(--rw-gt) - var(--rw-lt) - 164px * var(--rwc,1)) / 2)));z-index:5;';
    if (src.indexOf(FROM) < 0) {
      ok(false, '[5] 되돌림 사본을 못 만들었다 — `#rwMulBar` 의 top 선언 문자열이 안 잡힌다', FROM);
    } else {
      const f = path.join(ROOT, `.v867-rev-${process.pid}.html`);
      fs.writeFileSync(f, src.split(FROM).join(TO));
      tmp.push(f);
      const rv = await sweep(browser, 'file://' + f.replace(/\\/g, '/'));
      const KEYS = ['grid', 'lintel', 'floor', 'ground', 'mid', 'cap', 'steps', 'basin'];
      let worst = 0, who = '';
      for (const H of FRAMES) for (const k of KEYS) for (const a of ['t', 'b', 'h', 'l', 'w']) {
        const d = Math.abs(r[H].o[k][a] - rv[H].o[k][a]);
        if (d > worst) { worst = d; who = `${H} ${k}.${a}`; }
      }
      ok(worst < 0.5,
        '[5] 89 의 다른 8개 요소가 다섯 프레임 전부 Δ0px — 바만 옮겼고 예산은 한 줄도 안 건드렸다',
        '최대 Δ ' + worst.toFixed(2) + 'px' + (who ? ' (' + who + ')' : ''));

      /* ── §R 되돌림 시험 — 옛 자리에서는 세 약속이 **실제로 깨진다** ───────── */
      /* ⚑ 옛 자리에서는 «아래 이웃» 이 격자 **상변**이다 — 새 자리의 쌍(격자 하변↓바)으로 재면
         부호만 뒤집힌 큰 음수가 나와 **아무것도 안 묻고 초록**이 된다(1회차에 밟았다). */
      ok(rv[1600].gapGridTop <= ROW_PITCH,
        '[R1] 옛 자리(벽 안) 사본에서 1600 의 «바 하변↓격자 상변» 이 격자 행 간 이하로 되돌아간다 — CP 의 1순위가 되살아난다',
        '1600 ' + rv[1600].gapGridTop.toFixed(1) + ' vs 행 간 ' + ROW_PITCH +
        ' · 나머지 ' + FRAMES.filter(H => H > 1600).map(H => rv[H].gapGridTop).join('/') + ' (사본에서 빨개져야 한다)');
      ok(FRAMES.every(H => rv[H].inWall),
        '[R2] 옛 자리 사본에서는 다섯 프레임 전부 바가 **벽 안**이다 — [4] 가 재는 것이 실재한다',
        FRAMES.map(H => H + ':' + (rv[H].inWall ? '벽 안' : '벽 밖')).join(' · ') + ' (사본에서 빨개져야 한다)');
      ok(FRAMES.every(H => rv[H].gapDown > PED_GAP + 100),
        '[R3] 옛 자리 사본에서는 «바 ↓ 받침» 이 100px 넘게 벌어진다 — [1] 의 12 가 우연이 아니다',
        FRAMES.map(H => H + ':' + rv[H].gapDown).join(' · ') + ' (사본에서 빨개져야 한다)');
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (_) { /* noop */ } }
  console.log('\nVERIFY867 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
