#!/usr/bin/env node
/* 813 게이트 — 89 유물 소환 «짧은 프레임 여백 예산 재배분»
 *
 *   node tools/verify813.js
 *
 * 묻는 것 — **2회차가 예산을 다시 잡았다**(제품 5자리 · [E1]~[E5]). 1회차가 «못 닫는다» 로
 * 넘긴 두 쌍 중 **쌍ⓐ 는 닫혔고 쌍ⓑ 는 여전히 유령**이다.
 *   [1] 총량   — 아래 블록 **(38 + g3)의 총량**은 한 픽셀도 안 건드렸다. 1회차 §3 이 스윕으로
 *               확인한 «총량을 줄이면 그 세로가 곧장 E 로 흘러 1순위 결함을 키운다» 를 못박는다.
 *   [2] 쌍ⓑ   — «안내문 ↓ 하단 코너 브래킷» 은 **유령**이다: 가로 겹침 **0px** 이고 눈에 보이는
 *               여백(잉크 하변 → 패널 안쪽 하변)은 붕괴가 아니다. 2회차가 이 값을 더 줄였으므로
 *               (44.4% → 62.9% 로 **오히려 좋아졌다** — 잉크 기준으로 재면 그렇다) 항을 유지한다.
 *   [3] 위:아래 — 안내문 아래/위 비가 **ref 대역(0.58~0.65)** 안이다. 1회차의 2.74 에서 뒤집었다.
 *   [4] 아치   — 2회차가 아치를 **안 먹었다**(1600 748.5 유지). [E1] 이 그 난간이다.
 *   [5] 쌍ⓐ   — «상인방 ↓ 배수 바» 가 판정선 위로 올라왔다(12.1% → **28.0%**).
 *   [6] E      — 긴 프레임의 E(격자↔수반)는 **한 픽셀도 안 움직였다**. 재배분이 E 에서 뺀 것이
 *               아니라 «벽 하한 + 벽 폭 + 안내문 비» 세 자리에서 났다는 것을 못박는다.
 *   [R] 되돌림 — 세 자리를 각각 되돌린 사본에서 [3]·[5a] 가 **다시 빨개진다**(3겹).
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
const G3_FLOOR = 44, G3_CAP = 104, GAP2 = 38;
/* [6] — 3회차에 **방향이 뒤집혔다.** 2회차의 [6] 은 «E 를 안 건드렸다» 를 지키는 래칫이었다
   (그 회차의 재배분은 벽 세 자리에서 났다). 3회차 [F1] 은 비평 2인의 처방대로 **E 에서 뺐고**,
   같은 두 사람이 A/B 대조에서 그 거래를 승인했다(③ CH 3→5 · CI 2→4). ⇒ 이제 이 항은
   «E 가 줄었는가» 와 «줄어든 만큼이 격자 위로 갔는가(= 다른 데로 안 샜는가)» 를 묻는다.
   ⚠ 이 값들은 **이 자 자신의 눈금**이다 — `probe813` 은 같은 자리를 537.7(2280)로 읽는데,
     두 도구가 팝업을 여는 방법이 달라(이 자는 `S.relic = 1e9` 를 먼저 넣는다) 패널 높이가
     ~17px 다르다. 1회차부터 있던 어긋남이고 값의 **차이**가 아니라 **표본**의 차이다.
     3회차의 두 비평가도 각자 또 다른 기준으로 재 630/632(2280) · 883/885(2600)를 냈다 —
     **셋의 절대값을 섞어 쓰지 마라. 각 자 안에서 전후만 비교하면 된다.** */
const E_R2 = { 1841: 323.0, 1920: 363.32, 2280: 613.86, 2600: 867.16 };   /* 2회차 값 */
const E_R3 = { 1841: 337.02, 1920: 373.35, 2280: 545.91, 2600: 715.5 };   /* 3회차 [F1] 이후 */
/* 2회차의 격자 상변. ⚠ 1841·1920 은 [F1] 규칙이 **안 이기는** 프레임이라(하한 232 와
   «아래 예약» 상한이 이긴다) 그 둘의 격자는 되레 조금 올라가고 E 가 조금 늘었다 —
   [6b] 는 «E 에서 뺀 만큼이 위로 갔다» 가 아니라 **«둘의 합이 보존된다»** 를 재므로
   부호가 반대여도 통과한다. 새는 세로가 있으면 그때 빨개진다. */
const GT_R2 = { 1841: 312.84, 1920: 341.06, 2280: 416.06, 2600: 482.85 };
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
    /* 2회차 — 식을 옮겨 적지 않고 **그려진 것에서** 되잰다: --rw-fl (= gt + 516 + av)을 얹은
       .rw-floor 상변에서 av 를 역산한다. 식이 바뀌어도 이 자는 안 늙는다.
       ⚠ 이 주석 안에 백틱을 쓰지 마라 — MEASURE 가 템플릿 리터럴이라 그 자리에서 끊긴다. */
    archFl: +(516 + 2 * (rel(R('#relw .rw-floor')).t - o.grid.b)).toFixed(2),
    gapMid: +(o.mid.t - o.grid.b).toFixed(2),
    gt: +o.grid.t.toFixed(2),
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

  /* ── [1] 아래 블록 **총량** ────────────────────────────────────────────
     2회차 [E4] 는 안내문의 위·아래를 ref 비로 다시 나눴다. 그때 **총량(38 + g3)을 건드리면
     안 된다** — 줄인 만큼이 곧장 수반을 위로 올려 E(격자↔수반)로 흘러 들어가고, E 독식은
     1회차 비평 2인이 각자 1순위로 지목한 결함이다(1회차 §3 스윕). 그래서 자는 이제
     «g3 의 하한» 이 아니라 **총량 = 38 + clamp(44, sp × .1325 − 38, 104)** 를 잰다. */
  {
    const want = (H) => {
      const sp = r[H].panelH - 820;
      return GAP2 + Math.min(Math.max(sp * 0.1325 - 38, G3_FLOOR), G3_CAP);
    };
    ok(FRAMES.every(H => Math.abs(r[H].above + r[H].g3 - want(H)) < 1.2),
      '[1a] 아래 블록 총량(수반↓안내문 + 안내문↓패널하변)이 «38 + g3» 그대로 — 2회차는 나누기만 했다',
      FRAMES.map(H => H + ':' + (r[H].above + r[H].g3).toFixed(1) + '/' + want(H).toFixed(1)).join(' · '));
    ok(Math.abs(want(1600) - (GAP2 + G3_FLOOR)) < 0.6 &&
       FRAMES.filter(H => H !== 1600).every(H => want(H) > GAP2 + G3_FLOOR + 3),
      '[1b] 총량이 하한(38+44)을 보는 프레임은 1600 **하나뿐** — 나머지 넷은 clamp 가운데 항이 이긴다',
      FRAMES.map(H => H + ':' + want(H).toFixed(1)).join(' · '));
  }

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

  /* ── [3] 안내문 위:아래 비 — **1회차가 못박은 값을 뒤집었다** ─────────────
     14회차는 «아래 ≥ 위»(역전 금지)를 세웠는데, 813 1회차의 비평 2인(CF·CG)이 독립으로
     레퍼런스를 재 «위 31~38 : 아래 18~23» = 비 **0.58~0.62** 라고 냈다 — 레퍼런스는 안내문이
     패널 하변에 붙은 **푸터**다. 1회차는 «지금 값이 2.74 다» 를 못박아 조용한 이동을 막았고,
     2회차 [E4] 가 그 값을 대역 안으로 끌어왔다. ⇒ 항의 방향을 뒤집는다(333 처방).
     ⚠ 1600 만 0.64 인 것은 코너 브래킷 하한 32 가 이기기 때문이라 대역을 0.65 까지 연다 —
       그 이유가 아닌 이탈은 [R1] 이 잡는다(옛 식은 1.16 이라 대역 밖으로 한참 나간다). */
  {
    const ratio = FRAMES.map(H => +(r[H].g3 / r[H].above).toFixed(3));
    ok(ratio.every(v => v >= 0.57 && v <= 0.66),
      '[3] 안내문 아래/위 비가 **레퍼런스 대역 0.58~0.65** 안 (1회차 1.16~2.74 에서 뒤집었다)',
      FRAMES.map((H, i) => H + ':' + ratio[i]).join(' · ') + ' · ref 0.58~0.62(CF·CG 독립 일치)');
  }

  /* ── [4] 대가 — **아치를 안 먹었다** ──────────────────────────────────
     2회차의 첫 설계(벽 하한 240)는 아치를 748.5 → 710(1:1.205)으로 눌러 `verify120` ②
     «종횡비 ≥ 1:1.25»(16회차가 AH·AI·AJ·AK **네 명**의 지적으로 세운 자)를 빨갛게 만들었다.
     하한을 232 로 내려 그 값을 되찾았고, [E1] 의 셋째 인자가 «다음 회차가 232 를 올리면
     아치가 아니라 이 항이 먼저 말하게» 하는 난간이다.
     ⚠ 아치는 `.rw-bg::after`(의사 요소)라 rect 로 못 잰다 — 식을 옮겨 적으면 자가 늙으므로
       `--rw-fl` 을 얹은 `.rw-floor` 상변에서 **되잰다**(av = 받침 상변 − 격자 하변). */
  ok(r[1600].archFl / 589 >= 1.25,
    '[4] 1600 의 아치 종횡비가 1:1.25 위 — 2회차의 재배분이 아치 다리를 안 먹었다',
    '1600:' + r[1600].archFl.toFixed(1) + '×589 = 1:' + (r[1600].archFl / 589).toFixed(3));

  /* ── [5] 쌍ⓐ — «못 닫는다» 가 아니라 «닫는 길이 전부 남의 근거를 깬다» ── */
  {
    const base = r[BASE].gapA, min = Math.min(...FRAMES.map(H => r[H].gapA));
    ok(min >= base * COLLAPSE,
      '[5a] 쌍ⓐ «상인방 ↓ 배수 바» 가 판정선 위 — 754 의 [❌](12.1%)가 닫혔다',
      at('gapA') + ' · ' + (min / base * 100).toFixed(1) + '% (판정선 25%)');
    /* 상인방은 아치 정점 위 8px 보다 아래로 못 내려온다 ⇒ 긴 프레임의 벽에는 바닥이 있다.
       그 바닥이 기준 간극을 74.9 밑으로 못 내리므로 ③ 계열은 구조적으로 막혀 있다. */
    ok(FRAMES.filter(H => H >= 1920).every(H => r[H].wall >= 98 + 20 + 8),
      '[5b] 긴 프레임의 벽은 «바 98 + 아래 20 + 위 8» 보다 넓다 — 벽이 좁아서 생긴 문제가 아니다',
      at('wall'));
    /* 1회차의 [5c] 는 «1600 의 벽이 126 과 딱 같다 = 여유 0» 을 못박은 **진단** 항이었다.
       2회차 [E2] 가 그 벽에 «바가 요구하는 만큼» 을 예약했으므로 방향을 뒤집는다 —
       벽 ≥ 바 98 + 위 24 + 아래 24 = **146**. 24 는 «여유를 반씩 나눈» 결과값이 아니라
       하한 232 가 예약한 값이고, 그래서 [R2] 가 하한을 빼면 벽이 126 으로 되돌아간다. */
    ok(r[1600].wall >= 98 + 24 + 24 - 0.5,
      '[5c] 1600 의 벽이 «바 98 + 위 24 + 아래 24» = 146 이상 — [E2] 의 하한이 예약한 몫이다',
      '1600:' + r[1600].wall + ' vs 146 (여유 ' + (r[1600].wall - 146).toFixed(1) + ')');
    /* ── [6] E 는 안 건드렸다 ─────────────────────────────────────────────
       «E 재배분» 이라는 이름 때문에 다음 세션이 «E 에서 뺐겠지» 로 읽기 쉽다. 아니다 —
       긴 네 프레임의 E 는 **한 픽셀도 안 움직였고**, 재배분은 벽 하한·벽 폭·안내문 비
       세 자리에서 났다. 1회차 §3 이 «총량을 줄이면 E 가 커진다» 를 보였으므로 그 반대편,
       즉 «우리가 E 를 안 키웠다» 도 같이 못박아야 짝이 맞는다. */
    ok(FRAMES.filter(H => H !== 1600).every(H => Math.abs(r[H].gapMid - E_R3[H]) < 1.2),
      '[6a] 긴 네 프레임의 E(격자↔수반)가 3회차 [F1] 값 — 2280 613.9 → 545.9 · 2600 867.2 → 715.5',
      FRAMES.filter(H => H !== 1600).map(H => H + ':' + r[H].gapMid + '/' + E_R3[H]).join(' · '));
    /* ⚑ «줄었다» 만 재면 다음 회차가 E 를 줄이면서 그 세로를 **아무 데나** 보내도 초록이다.
       줄어든 만큼이 **격자 위로 그대로 갔는지**(= 다른 칸으로 안 샜는지)를 같이 잰다 —
       3회차 비평 2인이 A/B 에서 «이동량이 정확히 1:1 상쇄» 를 각자 확인한 그 축이다. */
    ok(FRAMES.filter(H => H !== 1600).every(H =>
        Math.abs((E_R2[H] - r[H].gapMid) - (r[H].gt - GT_R2[H])) < 1.5),
      '[6b] E 에서 뺀 만큼이 **격자 위로 그대로** 갔다 — 다른 칸으로 샌 세로 0px',
      FRAMES.filter(H => H !== 1600).map(H =>
        H + ':E −' + (E_R2[H] - r[H].gapMid).toFixed(1) + ' / 위 +' + (r[H].gt - GT_R2[H]).toFixed(1)).join(' · '));
  }

  /* ── [R] 되돌림 시험 3겹 — **세 자리를 각각 빼면 각각 빨개진다** ────────────
     [E2]·[E3]·[E4] 는 셋이 한 벌이라 «어느 하나가 진짜 일했나» 를 자가 직접 보여야 한다.
     ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets·웹폰트가 404 라 «다른 것을 재게» 된다
       (700 §preTree 의 1회차 함정). 이름에 pid(648 규약). */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const REV = [
      ['R1', '[E4] 안내문 ref 비 분할을 옛 «38 고정» 으로 되돌린다 ⇒ [3] 이 대역 밖으로',
        '+ 38px * var(--rwc,1) + var(--rw-g3) - var(--rw-i));', '+ 38px);',
        (rv) => { const v = rv[2280].g3 / rv[2280].above; return { bad: !(v >= 0.57 && v <= 0.66), got: '2280 아래/위 ' + v.toFixed(2) }; }],
      ['R2', '[E2] 격자 상변 «벽 하한 232» 를 뺀다 ⇒ [5a] 쌍ⓐ 가 다시 판정선 아래로',
        'calc(232px * var(--rwc,1)),', 'calc(0px * var(--rwc,1)),',
        (rv) => { const b = rv[BASE].gapA, m = Math.min(...FRAMES.map(H => rv[H].gapA));
                  return { bad: m < b * COLLAPSE, got: '쌍ⓐ ' + (m / b * 100).toFixed(1) + '%' }; }],
      /* ⚑ R3 은 **다른 것을 묻는다.** 굴려 보니 [E3] 은 판정선을 넘기는 지렛대가 아니었다 —
         300 으로 되돌려도 26.1% 로 선 위에 남는다([E2] 와 [E5] 의 44 가 이미 넘긴다).
         [E3] 이 하는 일은 **여유**다: 27.9%(2.6px) → 26.1%(1.0px). 1px 짜리 여유는 다음 회차의
         어떤 손질에도 뒤집히므로 그 차이를 그대로 항으로 못박는다(«쓸모없는 지렛대» 로
         오해해 3회차가 되돌리면 이 항이 말한다). */
      ['R3', '[E3] 벽 폭 294 → 300 사본에서 쌍ⓐ 의 **여유**가 절반 밑으로 준다(판정선은 안 깨진다)',
        'calc(var(--rw-gt) - 294px * var(--rwc,1)),', 'calc(var(--rw-gt) - 300px * var(--rwc,1)),',
        (rv) => { const b = rv[BASE].gapA, m = Math.min(...FRAMES.map(H => rv[H].gapA));
                  const pct = m / b * 100;
                  return { bad: pct >= 25 && pct <= 26.9, got: '쌍ⓐ 27.9% → ' + pct.toFixed(1) + '%' }; }],
    ];
    for (const [id, why, from, to, judge] of REV) {
      if (src.indexOf(from) < 0) { ok(false, `[${id}] 되돌림 사본을 못 만들었다 — 선언 문자열이 안 잡힌다`, from); continue; }
      const f = path.join(ROOT, `.v813-${id}-${process.pid}.html`);
      fs.writeFileSync(f, src.split(from).join(to));
      tmp.push(f);
      const rv = await sweep(browser, 'file://' + f.replace(/\\/g, '/'));
      const v = judge(rv);
      ok(v.bad, `[${id}] ${why}`, v.got + ' (사본에서 빨개져야 한다)');
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (_) { /* noop */ } }
  console.log('\nVERIFY813 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
