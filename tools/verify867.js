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
 *   [1] 자리     — 바 하변 ↔ 받침 상변(`--rw-fl`) = **12px**, 다섯 프레임 전부 같다
 *   [2] 읽힘     — 위 간극(격자 하변↓바) > 격자 행 간 25.6 **이고** 아래 간극보다 크다
 *                  ⇒ 바가 «격자의 마지막 줄» 이 아니라 «수반·소환 버튼의 컨트롤» 로 읽힌다
 *   [3] 안 덮는다 — 바 하변이 **받침 상변보다 위** ⇒ 받침·접합선·계단·바닥을 한 픽셀도 안 덮는다
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
const PED_GAP = 12;        /* 867 — 바 하변 ↔ 받침 상변 */
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
  return { panelH: +p.h.toFixed(2), o, lay,
    gapUp:   +(o.mul.t - (o.grid.t + o.grid.h)).toFixed(2),   /* 격자 하변 ↓ 바 */
    gapDown: +(o.floor.t - o.mul.b).toFixed(2),               /* 바 ↓ 받침 상변 */
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
    '[1] 바 하변 ↔ 받침 상변 = 12px — 다섯 프레임 전부 같은 값(`--rw-fl` 에서 거꾸로 올린다)',
    at('gapDown'));
  /* ⚑ 866 이관 — 폭·좌가 **724@178 → 646@216** 으로 옮겨졌다. 867 이 지킨 것은 «셸을
     안 건드렸다» 가 아니라 «**세로 자리만** 옮겼다» 이므로, 이 항이 묻는 것은 그대로 두고
     상수만 따라간다(높이 98 은 여전히 96·437 규약이다). 866 이 옮긴 이유는 가로가 격자
     어느 모듈에도 안 맞았기 때문이고(813 5회차 CP·CQ), 새 값은 3열 행 216..862 의 span 이다. */
  ok(FRAMES.every(H => r[H].lay && r[H].lay.h === SHELL_H && r[H].lay.w === 646 && r[H].lay.l === 216),
    '[1b] 셸 높이는 안 건드렸다 — 레이아웃 상자 98 × 646 @ 216 (96·437 규약 · 866 이 격자 모듈로)',
    FRAMES.map(H => H + ':' + r[H].lay.h + '×' + r[H].lay.w + '@' + r[H].lay.l).join(' · '));

  /* ── [2] 읽힘 — CP·CQ 의 1순위를 새 이웃 기준으로 다시 묻는다 ──────────── */
  ok(FRAMES.every(H => r[H].gapUp > ROW_PITCH),
    '[2] 위 간극(격자 하변↓바)이 격자 행 간 25.6 보다 넓다 — «격자의 한 줄» 로 안 읽힌다',
    at('gapUp') + ' · 행 간 대비 ' + FRAMES.map(H => (r[H].gapUp / ROW_PITCH).toFixed(2)).join('/') + '배');
  ok(FRAMES.every(H => r[H].gapUp > r[H].gapDown * 1.5),
    '[2b] 위 간극 > 아래 간극 × 1.5 — 바가 **아래(수반·소환 버튼) 블록**에 붙어 읽힌다(CQ 의 기능 축)',
    FRAMES.map(H => H + ':' + (r[H].gapUp / r[H].gapDown).toFixed(2) + ':1').join(' · '));

  /* ── [3] 안 덮는다 — 700 이 ⓑ 를 기각한 그 근거 ────────────────────────── */
  ok(FRAMES.every(H => r[H].gapDown > 0),
    '[3] ★ 바 하변이 **받침 상변보다 위** — 받침·접합선·계단·바닥을 한 픽셀도 안 덮는다(700 [B6] 강화판)',
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
    const FROM = 'top:calc(var(--rw-fl) - 98px - 12px * var(--rwc,1));z-index:5;';
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
