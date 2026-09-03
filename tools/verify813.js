#!/usr/bin/env node
/* 813 게이트 — 89 유물 소환 «짧은 프레임 여백 예산 재배분»
 *
 *   node tools/verify813.js
 *
 * 묻는 것 —
 *   [1] 하한   — `--rw-g3` 의 clamp 하한이 **50** 이고, 그 하한을 보는 프레임은 **1600 하나뿐**이다
 *   [2] 쌍ⓑ   — «안내문 하변 ↔ 하단 코너 브래킷» 이 probe754 판정선(기준 간극의 25%)을 넘는다
 *   [3] 역전   — 안내문 **아래** 여백이 **위** 여백보다 넓다(14회차가 세운 «역전 금지» 를 이어받는다)
 *   [4] 대가   — 1600 의 아치 높이가 16회차의 바닥(695)보다 위에 있다(g3 를 올린 값이 아치를 먹는다)
 *   [5] 쌍ⓐ   — «상인방 ↓ 배수 바» 는 **닫지 않았다.** 이 항은 그것을 «못 닫는다» 가 아니라
 *               **«세 지렛대가 전부 다른 근거를 무너뜨린다»** 는 산수를 자로 굳힌다(아래 주석 참조)
 *   [R] 되돌림 — 하한을 44 로 되돌린 사본에서 [2] 가 실제로 빨개진다
 *
 * ⚑ [5] 가 이 작업의 본체다. 813 등재문은 지렛대 셋(① g3 하한 · ② 상인방 66→56 · ③ 셸 98 인하)을
 *   적어 두었는데, `probe813b` 스윕이 **셋 다 쌍ⓐ 를 판정선까지 못 끌어올린다**는 것을 찍었다:
 *     · ② 계열(`--rw-av` 상한식 174 → 134 = 아래 최소 40)까지 밀어도 **24.1%** 로 미달이고,
 *       그 지점은 «받침 40 + 접합선 띠 13 = 53» 이라는 **하드 하한을 이미 깬** 자리다(클리어런스 39.4)
 *     · ③ 계열(상인방 앵커 300 → n)은 260 에서 **막힌다** — `--rw-lt` 의 상한 인자가
 *       `gt − av − 74`(아치 정점 위 8px)라 상인방이 그보다 더 못 내려온다. 기준 간극은 74.9 가 바닥이고
 *       1600 의 13.8 은 그래도 18.4% 다. 게다가 그 대가는 «상인방 위 죽은 벽» 114.4 → **153.8** 로,
 *       14회차가 비평가 넷의 지적으로 160 에 묶어 둔 축을 되레 연다.
 *   ⇒ 쌍ⓐ 를 닫는 길은 전부 **다른 회차가 비평 근거로 세워 둔 값**을 무너뜨린다. 그래서 813 은
 *     쌍ⓑ 만 닫고 쌍ⓐ 는 **산수를 남긴 채** 넘긴다. 이 항은 그 산수가 나중에 조용히 뒤집히지 않게
 *     못을 박는다 — 누가 상인방 앵커나 아래 최소를 건드리면 여기가 먼저 말한다.
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
const G3_FLOOR = 50;
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
  const panelH = +p.h.toFixed(2);
  return { panelH,
    g3: +(panelH - o.cap.b).toFixed(2),          /* 안내문 아래 여백 */
    gapB: +(o.fc.t - o.cap.b).toFixed(2),        /* 쌍ⓑ — 안내문 ↓ 코너 브래킷 */
    gapA: +(o.mul.t - o.lintel.b).toFixed(2),    /* 쌍ⓐ — 상인방 ↓ 배수 바 */
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
    '[1a] `--rw-g3` clamp 하한 = 50 — 1600 이 그 하한에 앉는다', '1600:' + r[1600].g3);
  ok(FRAMES.filter(H => H !== 1600).every(H => r[H].g3 > G3_FLOOR + 3),
    '[1b] 하한을 보는 프레임은 1600 **하나뿐** — 나머지 넷은 clamp 가운데 항이 이긴다', at('g3'));

  /* ── [2] 쌍ⓑ — probe754 와 같은 규칙 ──────────────────────────────────── */
  {
    const base = r[BASE].gapB, min = Math.min(...FRAMES.map(H => r[H].gapB));
    ok(min >= base * COLLAPSE,
      '[2] 쌍ⓑ «안내문 ↓ 하단 코너 브래킷» 이 판정선(기준의 25%)을 넘는다',
      at('gapB') + ' · 최소 ' + min + ' vs 판정선 ' + (base * COLLAPSE).toFixed(2) +
      ' = ' + (min / base * 100).toFixed(1) + '%');
    ok(Math.abs(r[1600].gapB - (r[1600].g3 - BRACKET)) < 1.2,
      '[2b] 쌍ⓑ = g3 − 코너 브래킷 27.2 — 이 간극을 여는 손잡이가 g3 하나임을 못박는다',
      r[1600].gapB + ' ↔ ' + (r[1600].g3 - BRACKET).toFixed(2));
  }

  /* ── [3] 역전 금지(14회차 이어받기) ───────────────────────────────────── */
  ok(FRAMES.every(H => r[H].g3 > r[H].above),
    '[3] 안내문 **아래** 여백 > **위** 여백 — 14회차가 세운 역전 금지가 다섯 프레임 전부 성립',
    FRAMES.map(H => H + ':' + r[H].g3 + '>' + r[H].above).join(' · '));

  /* ── [4] 대가 — 아치를 얼마나 먹었나 ─────────────────────────────────── */
  ok(r[1600].arch >= 695,
    '[4] 1600 의 아치 높이가 16회차의 바닥(695)보다 위 — g3 상승분이 아치를 그 아래로 못 민다',
    '1600:' + r[1600].arch + ' (16회차 전 695 → 752 → 813 이 ' + (752 - r[1600].arch).toFixed(1) + ' 되돌림)');

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
    ok(r[1600].wall < 98 + 20 + 8,
      '[5c] 1600 의 벽만 그 합(126)보다 좁다 — 쌍ⓐ 는 **1600 한 프레임의 예산 문제**다',
      '1600:' + r[1600].wall + ' vs 126');
  }

  /* ── [R] 되돌림 시험 — 하한을 44 로 되돌리면 [2] 가 빨개진다 ──────────── */
  {
    let src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const from = '--rw-g3:clamp(50px,calc(var(--rw-sp) * .1325 - 38px),104px)';
    const to = '--rw-g3:clamp(44px,calc(var(--rw-sp) * .1325 - 38px),104px)';
    if (src.indexOf(from) < 0) {
      ok(false, '[R] 되돌림 사본을 못 만들었다 — 선언 문자열이 안 잡힌다', from);
    } else {
      /* ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets·웹폰트가 404 라 «다른 것을 재게» 된다
         (700 §preTree 의 1회차 함정). 이름에 pid(648 규약). */
      const f = path.join(ROOT, '.v813-rev-' + process.pid + '.html');
      fs.writeFileSync(f, src.split(from).join(to));
      tmp.push(f);
      const rev = await sweep(browser, 'file://' + f.replace(/\\/g, '/'));
      const base = rev[BASE].gapB, min = Math.min(...FRAMES.map(H => rev[H].gapB));
      ok(min < base * COLLAPSE,
        '[R] 되돌림 — 하한을 44 로 되돌린 사본에서 [2] 가 실제로 빨개진다(무르게 푼 수리가 아니다)',
        '최소 ' + min + ' vs 판정선 ' + (base * COLLAPSE).toFixed(2) + ' = ' + (min / base * 100).toFixed(1) + '%');
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (_) { /* noop */ } }
  console.log('\nVERIFY813 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
