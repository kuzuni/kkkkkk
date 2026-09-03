#!/usr/bin/env node
/* 813 게이트 — 89 유물 소환 «짧은 프레임 여백 예산 재배분»
 *
 *   node tools/verify813.js
 *
 * 묻는 것 — ⚑ **1회차는 제품 0줄로 끝났다.** 754 가 89 에 남긴 [❌] 두 쌍이 성격이 다르다:
 *   [1] 하한   — `--rw-g3` 하한이 14회차의 **44** 그대로다(1회차가 50 으로 올렸다 **되돌렸다**)
 *   [2] 쌍ⓑ   — «안내문 ↓ 하단 코너 브래킷» 은 **유령**이다: 둘의 가로 겹침이 **0px** 이고,
 *               눈에 보이는 여백(잉크 하변 → 패널 안쪽 하변)은 44.4% 로 붕괴가 아니다
 *   [3] 위:아래 — 안내문 아래/위 비가 1.16 → **2.74**(레퍼런스 0.58~0.62) — **아직 안 고친 자리**를
 *               수치로 고정한다(2회차가 E 재배분과 한 벌로 고칠 것)
 *   [4] 아치   — 1600 의 아치 752 원복 확인
 *   [5] 쌍ⓐ   — «상인방 ↓ 배수 바» 는 **실재하는 결함**(비평 CF #5 · CG #2 독립 일치)이지만
 *               1600 의 벽이 «바 98 + 아래 20 + 위 8» = 126 과 **딱 같아** 예산이 0 이다
 *   [R] 되돌림 — 하한을 50 으로 올린 사본에서 [3] 의 역전이 **더 벌어진다**(1회차가 되돌린 이유)
 *
 * ⚑ 1회차가 «지렛대 셋» 을 전부 굴려 본 결과(`probe813b` 스윕) — 쌍ⓐ 는 이 셋으로 못 닫는다:
 *     · ② 계열(`--rw-av` 상한식 174 → 134 = 아래 최소 40)까지 밀어도 **24.1%** 로 미달이고,
 *       그 지점은 «받침 40 + 접합선 띠 13 = 53» 하드 하한을 **이미 깬** 자리다(클리어런스 39.4)
 *     · ③ 계열(상인방 앵커 300 → n)은 260 에서 **막힌다** — `--rw-lt` 상한 인자가
 *       `gt − av − 74`(아치 정점 위 8px)라 그보다 못 내려온다. 기준 간극 바닥이 74.9 이고
 *       1600 의 13.8 은 그래도 18.4% 다. 대가는 «상인방 위 죽은 벽» 114.4 → **153.8** 로,
 *       14회차가 비평가 넷의 지적으로 묶어 둔 축을 되레 연다.
 *   ⇒ 쌍ⓐ 는 **E(격자↔수반) 재배분과 한 벌로만** 열린다 — 1회차 비평 2인이 각자 1순위로 지목한
 *     그 자리다(패널이 +1000px 자랄 때 E 가 **66.9%** 를 독식 · 두 사람이 같은 숫자를 냈다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const BASE = 2280;
const G3_FLOOR = 44;
const BRACKET = 27.2;          /* 하단 코너 브래킷(.rw-fc)이 g3 에서 먹는 높이 */
const COLLAPSE = 0.25;         /* probe754 판정선 — 기준 프레임 간극의 1/4 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const MEASURE = `(() => {
  const R = s => { const e = document.querySelector(s); if (!e) return null;
    const q = e.getBoundingClientRect(); return { t: q.top, b: q.bottom, h: q.height }; };
  const p = R('#relw .rw-panel');
  const rel = o => o && { t: +(o.t - p.t).toFixed(2), b: +(o.b - p.t).toFixed(2), h: +o.h.toFixed(2) };
  const o = { panel: p, grid: rel(R('#rwGrid')), mid: rel(R('#relw .rw-mid')),
              cap: rel(R('#relw .rw-cap')), fc: rel(R('#relw .rw-fc.bl')),
              lintel: rel(R('#relw .rw-lintel')), mul: rel(R('#rwMulBar')) };
  /* 안내문의 **잉크** bbox — 상자가 아니라 실제로 칠해지는 자리(754 6회차 ⓐ 의 축) */
  const lines = [...document.querySelectorAll('#relw .rw-cap p')].map(el => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const b = rg.getBoundingClientRect();
    return { x1: b.left, x2: b.right, y2: b.bottom };
  });
  const last = lines[lines.length - 1];
  const fcr = document.querySelector('#relw .rw-fc.bl').getBoundingClientRect();
  const ov = lines.reduce((m, L) =>
    Math.max(m, Math.min(L.x2, fcr.right) - Math.max(L.x1, fcr.left)), 0);
  const panelH = +p.h.toFixed(2);
  return { panelH,
    g3: +(panelH - o.cap.b).toFixed(2),          /* 안내문 아래 여백 */
    gapB: +(o.fc.t - o.cap.b).toFixed(2),        /* 쌍ⓑ — 안내문 ↓ 코너 브래킷 */
    gapA: +(o.mul.t - o.lintel.b).toFixed(2),    /* 쌍ⓐ — 상인방 ↓ 배수 바 */
    capInkOverlap: +Math.max(0, ov).toFixed(2),  /* 안내문 잉크 × 코너 브래킷 가로 겹침 */
    visGap: +(p.b - last.y2).toFixed(2),         /* 눈에 보이는 여백 — 잉크 하변 → 패널 안쪽 하변 */
    above: +(o.cap.t - o.mid.b).toFixed(2),      /* 안내문 위 여백 */
    av: +Math.min(186, (o.mid.t - 516 - 174) / 2).toFixed(2),
    arch: +(516 + 2 * Math.min(186, (o.mid.t - 516 - 174) / 2)).toFixed(2),
    wall: +(o.grid.t - o.lintel.b).toFixed(2) };
})()`;

async function sweep(browser, url) {
  const out = {};
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
    await page.waitForTimeout(220);
    out[H] = await page.evaluate(M => { S.relic = 1e9; openRelw(); return eval(M); }, MEASURE);
    await ctx.close();
  }
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const tmp = [];
  const r = await sweep(browser, URL);
  const at = (k) => FRAMES.map(H => H + ':' + r[H][k]).join(' · ');

  /* ── [1] 하한 ─────────────────────────────────────────────────────────── */
  ok(Math.abs(r[1600].g3 - G3_FLOOR) < 0.6,
    '[1a] `--rw-g3` clamp 하한 = 44 — 14회차 값 그대로다(813 1회차가 50 으로 올렸다 되돌렸다)',
    '1600:' + r[1600].g3);
  ok(FRAMES.filter(H => H !== 1600).every(H => r[H].g3 > G3_FLOOR + 3),
    '[1b] 하한을 보는 프레임은 1600 **하나뿐** — 나머지 넷은 clamp 가운데 항이 이긴다', at('g3'));

  /* ── [2] 쌍ⓑ 는 **유령이다** ──────────────────────────────────────────────
     754 6회차의 자는 «안내문 상자 하변 ↔ 코너 브래킷 상변» 을 재 [❌] 간극붕괴를 냈다.
     그런데 둘은 **가로로 한 픽셀도 안 겹친다** — 안내문 잉크는 화면 중앙에, 브래킷은 x 3..33 에
     있다. 754 6회차 ⓐ 에서 CD 가 54·06 의 [❌] 를 «칠해지는 변과 무관한 박스 값» 으로 기각한 것과
     **같은 부류**다. 이 항은 그 사실을 못박아, 다음 세션이 같은 [❌] 를 보고 또 g3 를 올리지 않게 한다. */
  {
    ok(r[1600].capInkOverlap === 0 && r[BASE].capInkOverlap === 0,
      '[2a] 쌍ⓑ 는 유령 — 안내문 **잉크**와 코너 브래킷의 가로 겹침이 0px 다(서로 안 닿는 두 물체)',
      FRAMES.map(H => H + ':' + r[H].capInkOverlap + 'px').join(' · '));
    const vis = FRAMES.map(H => r[H].visGap);
    const min = Math.min(...vis), base = r[BASE].visGap;
    ok(min >= base * COLLAPSE,
      '[2b] 눈에 보이는 여백(안내문 잉크 하변 → 패널 안쪽 하변)은 붕괴가 아니다',
      FRAMES.map(H => H + ':' + r[H].visGap).join(' · ') + ' · 최소/기준 = ' +
      (min / base * 100).toFixed(1) + '% (판정선 25%)');
    /* 어긋남 = 브래킷 높이 27 + 안내문 상자가 마지막 줄 잉크보다 4px 아래로 남는 몫 */
    ok(FRAMES.every(H => Math.abs(r[H].visGap - r[H].gapB - (BRACKET + 4)) < 2.5),
      '[2c] 자가 잰 값은 보이는 여백보다 «브래킷 27 + 상자 여유 4» = 31 만큼 작다 — 어긋남의 출처',
      FRAMES.map(H => H + ':' + r[H].gapB + '+31≈' + r[H].visGap).join(' · '));
  }

  /* ── [3] 안내문 위:아래 비 — **아직 안 고친 자리를 수치로 고정한다** ───────
     14회차는 «아래 ≥ 위»(역전 금지)를 세웠는데, 813 1회차의 비평 2인(CF·CG)이 독립으로
     레퍼런스를 재 «위 31~38 : 아래 18~23» = 비 **0.58~0.62** 라고 냈다 — 레퍼런스는 안내문이
     패널 하변에 붙은 **푸터**다. 우리는 1.07 → 2.47 이라 방향이 반대이고, 게다가 아래만
     2.3배 진동한다. 2회차가 E 재배분과 **한 벌로** 고칠 자리라(따로 빼면 그 세로가 곧장 E 로 간다),
     이 항은 «고쳤다» 가 아니라 **«지금 값이 이것이다»** 를 못박아 조용한 이동을 막는다. */
  {
    const ratio = FRAMES.map(H => +(r[H].g3 / r[H].above).toFixed(2));
    ok(ratio.every((v, i) => Math.abs(v - [1.14, 1.56, 1.83, 2.74, 2.74][i]) < 0.25),
      '[3] 안내문 아래/위 비가 1회차 실측 그대로 — 2회차가 이 값을 레퍼런스(0.58~0.62)로 끌어와야 한다',
      FRAMES.map((H, i) => H + ':' + ratio[i]).join(' · ') + ' · ref 0.58~0.62(CF·CG 독립 일치)');
  }

  /* ── [4] 대가 — 아치를 얼마나 먹었나 ─────────────────────────────────── */
  ok(r[1600].arch >= 750,
    '[4] 1600 의 아치 높이가 16회차가 되찾은 752 그대로 — 813 1회차의 되돌림이 실제로 원복됐다',
    '1600:' + r[1600].arch + ' (16회차 695 → 752)');

  /* ── [5] 쌍ⓐ — «못 닫는다» 가 아니라 «닫는 길이 전부 남의 근거를 깬다» ── */
  {
    const base = r[BASE].gapA, min = Math.min(...FRAMES.map(H => r[H].gapA));
    ok(min < base * COLLAPSE,
      '[5a] 쌍ⓐ «상인방 ↓ 배수 바» 는 아직 판정선 아래다 — **813 이 안 닫은 자리**(아래 [5b]·[5c] 가 이유다)',
      at('gapA') + ' · ' + (min / base * 100).toFixed(1) + '%');
    /* 상인방은 아치 정점 위 8px 보다 아래로 못 내려온다 ⇒ 긴 프레임의 벽에는 바닥이 있다.
       그 바닥이 기준 간극을 74.9 밑으로 못 내리므로 ③ 계열은 구조적으로 막혀 있다. */
    ok(FRAMES.filter(H => H >= 1920).every(H => r[H].wall >= 98 + 20 + 8),
      '[5b] 긴 프레임의 벽은 «바 98 + 아래 20 + 위 8» 보다 넓다 — 벽이 좁아서 생긴 문제가 아니다',
      at('wall'));
    ok(r[1600].wall <= 98 + 20 + 8 + 0.5,
      '[5c] 1600 의 벽만 그 합(126)과 «딱 같다» — 여유가 0 이라 쌍ⓐ 는 1600 한 프레임의 예산 문제다',
      '1600:' + r[1600].wall + ' vs 126 (여유 ' + (r[1600].wall - 126).toFixed(1) + ')');
  }

  /* ── [R] 되돌림 시험 — 하한을 44 로 되돌리면 [2] 가 빨개진다 ──────────── */
  {
    let src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const from = '--rw-g3:clamp(44px,calc(var(--rw-sp) * .1325 - 38px),104px)';
    const to = '--rw-g3:clamp(50px,calc(var(--rw-sp) * .1325 - 38px),104px)';
    if (src.indexOf(from) < 0) {
      ok(false, '[R] 되돌림 사본을 못 만들었다 — 선언 문자열이 안 잡힌다', from);
    } else {
      /* ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets·웹폰트가 404 라 «다른 것을 재게» 된다
         (700 §preTree 의 1회차 함정). 이름에 pid(648 규약). */
      const f = path.join(ROOT, '.v813-rev-' + process.pid + '.html');
      fs.writeFileSync(f, src.split(from).join(to));
      tmp.push(f);
      const rev = await sweep(browser, 'file://' + f.replace(/\\/g, '/'));
      ok(rev[1600].g3 / rev[1600].above > r[1600].g3 / r[1600].above,
        '[R] 되돌림 시험 — 하한을 50 으로 올린 사본에서 [3] 의 역전이 **더 벌어진다**' +
        '(1회차가 되돌린 이유를 자가 직접 보여 준다)',
        '아래/위 ' + (r[1600].g3 / r[1600].above).toFixed(2) + ' → ' +
        (rev[1600].g3 / rev[1600].above).toFixed(2) + ' (레퍼런스 0.58~0.62)');
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (_) { /* noop */ } }
  console.log('\nVERIFY813 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
