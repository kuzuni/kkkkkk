/* 작업 856 게이트 — «③층(하이라이트) 폭 규격»
 *
 *   node tools/verify856.js
 *
 * 792 10회차 비평 2인(CV·CW)이 **독립으로 같은 뿌리**를 짚었다: 하이라이트의 폭이 종마다
 * 제각각이고(CV 점유율 5.2%(flask) ~ 82.8%(whirl) = 15.9배 · CW 면적비 7% ~ 89% = 12.7배)
 * 세 종(arrow 축 · boomer 팔 · spiral 리본)은 **주 덩어리에 ③층이 0px** 이다.
 *
 * ⚠⚠ **`verify792` 는 이것을 원리적으로 못 본다** — [A2]·[B2] 는 «근백색 화소가 잉크의 1~25%인가»
 *     라는 **면적의 몫**이라 whirl(fSpec 7.8%)도 spiral(2.6%)도 초록으로 지나간다.
 *     비평가가 잰 것은 **폭의 비**(획 폭 대비)이고 CV 가 목표까지 줬다: **획 폭의 30~40%**.
 *     그래서 792 의 [B10]·[B11] 자리에 해당하는 두 축을 여기 새 번호로 세운다
 *     (792 는 ⏸ 보류라 «그 행이 나중에 한다» 가 성립하지 않는다 — 838·856 선례).
 *
 * 자의 뼈대 — «폭» 을 어떻게 재는가:
 *   길이가 제각각인 획에서 «폭» 을 한 수로 만드는 가장 흔들리지 않는 자는 **거리변환의 평균**이다.
 *   폭 w 인 곧은 띠에서 «가장자리까지의 거리» 의 평균은 정확히 w/4 이므로 **W = 4·mean(D)** 이
 *   그 영역의 실효 폭이다(구멍·꺾임·끝단에 둔감하고, 절단면을 어디에 그을지 고르지 않아도 된다).
 *   ⚠ 거리변환은 **자가 제 손으로 짠다**(chamfer 5-7-11). 제품의 `edt2d` 를 부르면 그 함수가
 *     틀렸을 때 자와 제품이 **같이** 틀려 조용해진다 — 다른 알고리즘이라야 서로를 잡는다.
 *
 * 절:
 *   [A] 표본 — 종을 실제로 재고 있는가(측정 실패를 초록으로 지나가지 않는다).
 *   [B10] 폭의 비 — 종마다 «하이라이트 실효 폭 ÷ 본체 실효 폭» 이 목표대(30~40%) 안이고,
 *                    종끼리 한 밴드다(수리 전 CV 15.9배 · CW 12.7배).
 *   [B11] 마루 덮임 — ③층이 본체의 **마루(medial axis)를 따라간다**(arrow 축 0px 계열).
 *   [C] 선언 — 코어를 굽는 이름이 한 벌만 있다(종별 사본 금지 — 402).
 *   [R] 되돌림 시험 — `SPEC_ON = 0`(792 의 «종별 손그림» 하이라이트)에서 [B10]·[B11] 이
 *        **실제로** 빨개진다. 없으면 문턱을 무르게 풀 수 있다(9회차 [R4] 와 같은 자리).
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚑ 889 ① — «덮인 몫 가중» 폭 자. 선언은 `tools/lib889.js` 한 곳이고 여기서는 **그 문자열을
   페이지에 넣어** 쓴다(자를 두 벌 적으면 그것이 곧 사본이다 — 402). 참값을 아는 띠에서 이 자가
   실제로 소수 화소를 되찾는다는 것은 `tools/probe889.js` 가 따로 못박는다. */
const { ENGINE_SRC } = require('./lib889.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* 되돌림 사본 — 저장소 루트에 둔다(/tmp 에 두면 상대 경로 assets/** 가 통째로 404 다).
   이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG_SPEC = path.join(ROOT, '.v856-neg-spec-' + process.pid + '.html');
const TAG_SPEC = `const SPEC_ON   = 1;`;
const killLine = (src, tag, repl) =>
  src.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'), repl);

/* 문턱 — **관측값이 아니라 비평가 CV 가 준 목표**(«획 폭의 30~40%»)에서 잰다.
   자의 실효 폭 정의(4·mean D)는 끝단·꺾임에서 조금 낮게 나오므로 아래로 한 칸 넓힌다. */
const R_MIN = 0.22;   /* 이보다 가늘면 «있으나 마나» — 수리 전 curve 0.14 · arrow 0 이 여기 걸린다 */
const R_MAX = 0.52;   /* 이보다 굵으면 ②와 ③이 안 갈린다 — 수리 전 whirl 0.83 이 여기 걸린다 */
const BAND  = 2.0;    /* 획 무리 — 비율의 max ÷ min. 수리 전 15.9배(CV) */
const BAND_W = 1.4;   /* 덩어리 무리 — 코어 **폭**의 max ÷ min(상한이 정하므로 폭이 고와야 한다) */
const SPREAD  = 1.5;  /* 목표(p90÷p50) — 2회차 CZ 가 ice 한 날에서 9% ↔ 67% 를 쟀다 */
/* [B13] 획 폭 구간별 비 중앙값의 max÷min — 9회차 신설. **목표는 1.0**(«비는 획 폭에 무관»)이고
   지금은 거기 못 닿는다 ⇒ [B12] 와 같은 **래칫**으로 건다(356 [B] 선례 · 9회차 실측 1.50~1.53).
   ⚠ 목표에 닿기 전에 이 수를 올리지 마라 — 올리는 순간 두 비평가가 각자 손으로 잰 «획 8~12px
     에서 45~50%» 가 자에서 다시 안 보이게 된다. */
const BAND13  = 1.55;
/* [B14] **폭 축만** — 종을 고정하고 그 종의 구간별 중앙값이 한 밴드인가. 889 7회차 신설.
   ⚑ 왜 [B13] 과 따로 서는가: 6회차가 [B13] 1.33 을 **폭 축 1.17 × 종 축 1.19** 의 곱으로
     분해했다. 구간마다 종 구성이 다르므로([6~9] 은 97% 가 `gale`) [B13] 은 «종 사이» 몫을
     [B10b] 에 이어 **두 번째로** 센다 ⇒ 폭 축만 혼자 재는 항을 하나 더 세운다(한 축 = 한 항).
   ⚠ 이것은 [B13] 을 **무르게 하는 것이 아니다** — [B13] 은 1.55 그대로 서 있고, 이 항은
     그보다 **좁은** 래칫을 하나 더 거는 것이다. 자를 갈아 끼워 밴드를 «적어 보이게» 하는 길
     (6회차가 «자 흔들기» 로 안 간 그 길)과는 방향이 반대다.
   ⚑ 이 수가 «자의 몫» 이 아님은 `tools/probe889d.js` 가 못박는다 — 규격을 정확히 지키는
     합성 띠를 **이 자·이 묶음**으로 재면 여섯 구간이 전부 K = 0.350(잔차 0.0000 · 밴드 1.000)이다. */
const BAND14  = 1.25; /* 7회차 실측 최악 1.17(arrow · gale 1.15 · lance 1.08). 목표는 1.0 — 닿기 전에 올리지 마라 */
/* ⚑⚑ 927 — [B14] 의 **칸당 표본 문턱**. 묶는 축이 «종» 에서 «종 × 기울기 칸» 으로 넓어지면
   같은 표본이 세 칸으로 나뉘므로 칸당 수가 ~3배 준다. 문턱을 그대로 25 로 두면 두 구간을
   채우는 칸이 **하나**뿐이라(lance@0~ 1.078) 축이 «세지는» 게 아니라 **못 재게** 된다.
   ⚠ 이 수를 «칸이 늘어나서» 내린 것이 아니다 — **잡음 바닥이 안 움직이는 데까지만** 내렸다:
     문턱 25 → 바닥 중앙 1.005 · 최악 1.062 / 문턱 **20 → 1.005 · 1.062(같다)** /
     문턱 12 → 최악 1.114 / 문턱 10 → 1.121. 곧 표본 20~24 짜리 칸은 25 짜리보다 시끄럽지
     않고, 20 아래로 내려가야 비로소 자가 흔들린다. 그 아래로 내리지 마라 —
     내리는 순간 [B14] 가 재는 것이 제품이 아니라 자의 흔들림이 된다. */
const B14_N   = 20;
const RATCHET = 1.7;  /* 래칫(356 [B] 선례) — 8회차 실측 최악 1.68(stone · 3회차 2.21 · `ice` 2.00 → 1.14). 목표에 닿기 전에 올리지 마라 */   /* 한 종 안 «코어÷본체» p90÷p10 — 2회차 CZ 가 ice 에서 7.4배를 쟀다 */
const COVER = 0.75;   /* 본체 마루 중 ③층이 덮은 몫 — «축에만 코어가 없다» 가 여기서 잡힌다 */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

/* ⚑⚑ 927 — **마루 기울기 칸**. 10회차 교차표가 쓴 칸 그대로다(0 = 축 정렬 · 45 = 대각 ·
   격자가 90° 주기라 0~45° 로 접혀 들어온다). 이 칸을 [B14] 의 **두 번째 묶는 축**으로 쓴다 —
   진단도 판정도 이 표 하나를 읽는다(사본 금지 — 402). */
const ANG_BINS = [[0, 15], [15, 30], [30, 45.1]];
const angBinOf = (a) => {
  for (let k = 0; k < ANG_BINS.length; k++) if (a >= ANG_BINS[k][0] && a < ANG_BINS[k][1]) return k;
  return -1;                                  /* 각이 없는 자리(마루 이웃 2 미만) — 어느 칸도 아니다 */
};
/* [B13] 이 묶는 자리 — 획 폭 구간(로컬px). 되돌림 시험도 **같은 함수**로 묶는다(사본 금지 — 402). */
const B13_LO = 6, B13_HI = 24, B13_W = 3;
const B13_N  = 25;      /* 구간을 세려면 표본 이만큼 — 화소 몇 개짜리 구간은 안 센다 */
/* `col` — 0 이면 옛 이진 자의 두 칸(획폭·비), 2 면 889 의 «덮인 몫» 두 칸이다(같은 표본·같은 자리). */
/* `opt` — 진단이 **더 촘촘한 눈금**으로 같은 표본을 물을 때만 준다(`{w, n}`). 판정은 언제나
   기본값(B13_W · B13_N)으로 부르므로 이 손잡이가 판정을 무르게 할 길은 없다(889 8회차). */
const b13bands = (out, useIds, col, opt) => {
  col = col || 0;
  const BW = (opt && opt.w) || B13_W, BN = (opt && opt.n) || B13_N;
  const rowsOut = [];
  for (let lo = B13_LO; lo < B13_HI; lo += BW) {
    const hi = lo + BW, acc = [];
    for (const i of useIds) for (const e of (out.rows[i].bank || [])) {
      const wS = e[col], ra = e[col + 1];
      if (wS >= lo && wS < hi) acc.push(ra);
    }
    if (acc.length < BN) continue;
    acc.sort((a, b) => a - b);
    const md = acc[Math.floor(0.5 * (acc.length - 1))];
    /* 구간마다 «누가 얼마나 넣었는가» — 한 종이 구간을 통째로 끌고 가는지 본다(진단 전용). */
    const by = [];
    const md50 = a => { const t = a.slice().sort((x, y) => x - y); return t[Math.floor(0.5 * (t.length - 1))]; };
    /* ⚑⚑ 927 — `opt.byAng` 면 종을 **«종 × 마루 기울기 칸»** 으로 쪼갠다(키는 `종@칸`).
       주지 않으면 한 칸짜리 묶음이라 종전과 **한 글자도 다르지 않다** — [B13] 이 읽는 `acc`·`md`
       는 이 갈래 밖에서 이미 끝났으므로 어느 쪽이든 [B13] 의 판정값은 안 움직인다. */
    const grp = (opt && opt.byAng)
      ? ANG_BINS.map((_, k) => ({ suf: '@' + Math.round(ANG_BINS[k][0]) + '~' + Math.round(ANG_BINS[k][1]) + '°',
                                  sel: e => angBinOf(e[4]) === k }))
      : [{ suf: '', sel: () => true }];
    for (const i of useIds) for (const g of grp) {
      const sel = (out.rows[i].bank || [])
        .filter(e => e[col] >= lo && e[col] < hi && g.sel(e));
      const v = sel.map(e => e[col + 1]);
      if (!v.length) continue;
      /* ⚑⚑ 927 — 여섯째 칸 = 이 칸에 담긴 표본의 **기울기 칸 구성**(칸별 화소 수 · 각이 없는
         자리는 `aOut`). [B15] 가 «[B14] 가 견주는 두 칸이 정말 같은 기울기인가» 를 이것으로
         묻는다 — 묶는 곳에서 한 번에 세므로 사본이 아니다(402). */
      const ac = ANG_BINS.map(() => 0);
      let aOut = 0;
      for (const e of sel) { const k = angBinOf(e[4]); if (k < 0) aOut++; else ac[k]++; }
      /* ⚑ 889 8회차 — 뒤 두 칸은 **같은 구간을 짝/홀로 반씩 가른** 중앙값이다(bank 의 자리 순서).
         같은 폭·같은 종의 두 반쪽이 서로 얼마나 어긋나는지가 곧 이 자의 **잡음 바닥**이고,
         [B14] 의 밴드가 그 바닥 위에 있는지를 그것으로 가른다. 자리를 하나 더 재는 것이 아니라
         이미 잰 표본을 둘로 나눈 것뿐이라 사본이 아니다(402). */
      const ev = v.filter((_, k) => k % 2 === 0), od = v.filter((_, k) => k % 2 === 1);
      by.push([i + g.suf, v.length, md50(v), ev.length ? md50(ev) : 0, od.length ? md50(od) : 0, ac, aOut]);
    }
    by.sort((a, b) => b[1] - a[1]);
    rowsOut.push({ lo, hi, n: acc.length, md, core: md * (lo + hi) / 2, by });
  }
  return rowsOut;
};

/* [B14] 가 묶는 자리 — **종을 고정하고 폭만**. 5회차가 진단으로 세운 ⓐ 를 7회차가 판정으로
   올린 것이고, 묶음은 `b13bands` 의 `by`(구간별 종별 중앙값)를 그대로 읽는다 —
   재는 자리·가중·표본 문턱(`B13_N`)이 [B13]·[B12] 와 **한 벌**이다(사본 금지 — 402).
   판정도 되돌림 시험도 이 함수 하나를 부른다. */
const b14bands = (out, useIds, col, opt) => {
  const bySp = {};
  const BN = (opt && opt.n) || B13_N;
  for (const b of b13bands(out, useIds, col, opt)) for (const e of b.by) {
    if (e[1] < BN) continue;                    /* 구간 문턱과 **같은** 표본 수 */
    (bySp[e[0]] = bySp[e[0]] || []).push([b.lo, e[2], e[1], e[5] || [], e[6] || 0]);
  }
  return Object.keys(bySp).filter(k => bySp[k].length >= 2).map(k => {
    const v = bySp[k].map(e => e[1]);
    const mx = Math.max.apply(null, v), mn = Math.min.apply(null, v);
    /* ⚑⚑ 927 — `angs` = 이 묶음이 견주는 **모든 구간**에 걸쳐 표본이 앉은 기울기 칸의 수.
       1 이면 견주는 두 칸의 기울기가 정말 고정된 것이고, 2 이상이면 그 밴드는 폭 축이 아니라
       «폭 + 기울기» 를 같이 읽은 값이다(옛 묶음의 `arrow` 가 그것이다 — [B15] 가 묻는다). */
    const seen = new Set();
    let noAng = 0;
    for (const e of bySp[k]) {
      (e[3] || []).forEach((c, i) => { if (c > 0) seen.add(i); });
      noAng += e[4] || 0;
    }
    return { sp: k, band: mn > 0 ? mx / mn : Infinity, bins: bySp[k].length, mx, mn,
             angs: seen.size, noAng };
  }).sort((a, b) => b.band - a.band);
};

/* ⚑⚑ 10회차 — **[B14] 를 «비» 가 아니라 «코어» 로 읽는 자**. 9회차가 [B14] 의 정체를
   «기울기 부족 + 절편 과잉» 으로 갈랐으므로, 규격(`코어 = K·획`)을 직접 물으려면 종별로
   그 직선의 **기울기**를 내면 된다. 표본·자리·묶음은 [B13]·[B14] 와 **한 벌**이다
   (`b13bands` 의 `by` 를 그대로 읽는다 — 사본 금지 402). 최소제곱 한 줄이 전부다. */
const coreSlope = (out, useIds, col) => {
  const bySp = {};
  for (const b of b13bands(out, useIds, col === undefined ? 2 : col)) for (const e of b.by) {
    if (e[1] < B13_N) continue;
    const w = b.lo + B13_W / 2;                 /* 구간 가운데 획 폭(로컬px) */
    (bySp[e[0]] = bySp[e[0]] || []).push([w, w * e[2]]);   /* [획, 코어 = 획 × 비] */
  }
  return Object.keys(bySp).filter(k => bySp[k].length >= 2).map(k => {
    const v = bySp[k], n = v.length;
    const mx = v.reduce((a, e) => a + e[0], 0) / n, my = v.reduce((a, e) => a + e[1], 0) / n;
    let sxy = 0, sxx = 0;
    for (const [x, y] of v) { sxy += (x - mx) * (y - my); sxx += (x - mx) * (x - mx); }
    const a = sxx > 0 ? sxy / sxx : 0;
    return { sp: k, a, c: my - a * mx, bins: n, pts: v };
  }).sort((p, q) => p.a - q.a);
};

/* `--spread <종>` — 그 종의 **주 마루 화소마다** «본체 두께 · 코어 두께 · 비» 를 그대로 찍는다.
   판정에는 아무 영향이 없다(진단 전용 · 8회차가 [B12] `ice` 의 불균질이 **어느 자리**에서 오는지
   찍으려고 세웠다 — 7회차 «남은 문제» 1번). */
const DUMP = (() => { const i = process.argv.indexOf('--spread'); return i > 0 ? (process.argv[i + 1] || '') : ''; })();

async function measure(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1100);
  const ev = async (fn) => {
    try { return await page.evaluate(fn); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });
  await page.evaluate((v) => { window.__SPREAD856 = v; }, DUMP);
  await page.evaluate((s) => { window.__W889 = (0, eval)(s); }, ENGINE_SRC);

  const out = await ev(() => {
    /* 855 — 주사위 고정(`verify792`·`probe792` 와 같은 자리·같은 처방). 적이 나오기까지 도는
       `step()` 횟수가 난수에 달려 플레이어 자리가 회차마다 달라지고, 측정 상자가 그 자리에 매달려 있다. */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null;
    const putFoe = () => {
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    /* 종별 «그 스킬이 실제로 만든 첫 발» 의 규격(710 [C]·792 와 같은 자리·같은 방법) */
    const specs = {};
    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }

    putFoe(); clearFx();
    /* ⚑⚑ 928 — **플레이어도 못박는다.** 855 가 주사위를 고정하면서 «측정 상자가 플레이어 자리에
       매달려 있다» 를 이미 적어 뒀는데, 못박은 것은 **적 한 쪽뿐**이었다(`foe.x = 300 - ox`).
       남은 쪽은 벽시계를 탄다 — `page.goto` 뒤 `waitForTimeout(1100)` 동안 **제품의 제 루프가**
       그때그때 다른 프레임 수·다른 dt 로 돌아 플레이어를 옮겨 놓는다(주사위와 무관하다).
       `probe928` 실측: 무보정 프로세스 4판에서 `player.x` = 952.6 / 974.3 / 965.7 / 957.0 이라
       측정 상자가 판마다 **20px 넘게** 움직였고, 그 자리의 **바탕**(플레이어 오라 가장자리·바닥)이
       같이 바뀌어 층 분해(`al = 1 − d2/d1`)의 가장자리 화소가 뒤집혔다.
       ⇒ `flask` 마루 덮임이 0.745 ~ 0.919 로 흔들리고 8회에 1회 [B11] 이 빨갰다(등재 928).
       못박으면 **바탕·17종 화소가 판을 넘어 비트 단위로 같다**(`probe928 --pin` 지문 4판 동일).
       ⚠ 자리는 제품의 «집»(`spawnStage()` 가 쓰는 `WORLD.w/2, WORLD.h/2`)이다 — 자에 좌표를
         손으로 적으면 그것이 곧 사본이다(402). 여기 뒤로는 `step()` 이 없으므로 다시 밀리지 않는다.
       ⚠ **재는 것은 한 칸도 안 바뀐다** — 발은 여전히 상자 한복판(`CX − ox`)에 놓이고 문턱·창·
         마루 찾기는 그대로다. 바뀌는 것은 «어느 자리에서 재는가» 뿐이다. */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;                       /* 855 — 벽시계를 상수에(오라 반지름이 뛴다) */
    const base = grab();

    /* ── 자의 뼈대 ①: 층 분해 ─────────────────────────────────────────────
       같은 발을 **두 번 겹쳐 그려** 알파를 «푼다»(추정하지 않는다 — 792 3회차 주석이 본문):
         r1 = α·L + (1−α)·b · r2 = α·L + (1−α)·r1 ⇒ α = 1 − (r2 − r1)/(r1 − b)
       바탕이 무엇이든 알파 그 자체가 나오므로 «저대비 본체»(α=1)와 «저알파 후광»(α<1)이 갈린다. */
    /* ⚠ 문턱은 `verify792` 의 0.55 가 **아니라 0.80** 이다 — 9회차가 링 봉우리를 `AURA_A = 0.62`
       로 못박은 뒤로 0.55 는 **①층(링)을 ②층으로 셌다**. 792 의 축들은 «면적의 몫» 이라 그 샘이
       무해했지만, **폭**을 재는 자에서는 링의 두께가 곧 «본체 폭» 으로 들어와 거짓말이 된다
       (1회차 실측: 0.55 에서 shuri 0.419 · ice 0.485 — 코어가 멀쩡한데 링 마루가 빈 자리로 셌다). */
    const A_BODY = 0.80;
    /* ── 자의 뼈대 ②: 거리변환(chamfer 5-7-11 · 제품과 **다른 알고리즘**) ── */
    const cham = (m, w, h) => {
      const INF = 1 << 28, d = new Int32Array(w * h);
      for (let p = 0; p < d.length; p++) d[p] = m[p] ? INF : 0;
      const rel1 = [[-1, -1, 7], [0, -1, 5], [1, -1, 7], [-1, 0, 5], [-2, -1, 11], [2, -1, 11], [-1, -2, 11], [1, -2, 11]];
      const rel2 = rel1.map(r => [-r[0], -r[1], r[2]]);
      const sweep = (rel, rev) => {
        for (let i = 0; i < h; i++) {
          const y = rev ? h - 1 - i : i;
          for (let j = 0; j < w; j++) {
            const x = rev ? w - 1 - j : j, p = y * w + x;
            if (!d[p]) continue;
            let best = d[p];
            for (const [dx, dy, c] of rel) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              const v = d[yy * w + xx] + c;
              if (v < best) best = v;
            }
            d[p] = best;
          }
        }
      };
      sweep(rel1, false); sweep(rel2, true);
      return d;                                   /* 5배 스케일 거리 */
    };
    /* 실효 폭 W = 4·mean(D) — 폭 w 인 곧은 띠에서 mean(D) = w/4 라 W = w 다(주석이 본문).
       ⚠⚠ **5회차에 이 자를 [B10] 에서 내렸다 — 편향을 `tools/probe856.js` 가 수치로 잡았다.**
       참값을 아는 합성 도형만 넣어 재니 두 편향이 **서로 반대 방향**으로 겹쳐 있었다:
         ⓐ 이산화 **+2.0px 절대 오프셋**(곧은 띠에서 예외 없이 정확히 +2 — w=4 는 6.00 = ×1.50,
            w=68 은 70.00 = ×1.03) ⇒ **가는 것일수록 크게 부푼다**.
         ⓑ 둥근 캡·짧은 획은 평균을 끌어내린다(스타디움 w=48 L=24 에서 39.59 = ×0.825).
       ⇒ band+stadium 전체에서 비가 **0.825~1.500(1.82배)** 이고, 결정적으로
          «가는쪽 평균 1.188 ÷ 굵은쪽 평균 0.990 = **1.200**» 이다.
       [B10] 은 «코어 폭 ÷ 본체 폭» 이라 **가는 것(코어)과 굵은 것(본체)을 같은 자로 재서 나눈다**
       — 그래서 위 1.200 이 그대로 **비에 곱해진다**(4회차가 gale 에서 «잰 비 ÷ 기하학적 비 ≈ 1.68»
       을 보고 «자부터 재라» 를 5회차 1순위로 남긴 것이 이것이다).
       자리는 남겨 둔다 — [A] 표본이 «재고 있는가» 를 물을 때 쓰고, 편향표의 대조군이기도 하다. */
    const effW = (m, w, h) => {
      const d = cham(m, w, h);
      let s = 0, n = 0;
      for (let p = 0; p < d.length; p++) if (m[p]) { s += d[p] / 5; n++; }
      return n ? 4 * s / n : 0;
    };
    /* ⚑ **[B10] 이 쓰는 폭 — 주 마루의 두께 가중 평균** `W = 2·Σ(D²)/Σ(D)`.
       재는 자리는 `ridgeCover`·`spread` 가 이미 쓰는 **주 마루**(D ≥ .35·Dmax · 4이웃 봉우리)이고
       가중도 `ridgeCover` 와 같은 «그 자리 두께»다 — 자 안에서 «폭» 의 뜻이 한 벌이 된다.
       `probe856` 실측: band·stadium **전 표본에서 비 1.000**(폭 4~68 · 캡 비중 3종 전부.
       10.67 만 0.937 인데 그것은 도형을 화소로 굽는 쪽의 반올림이지 자의 편향이 아니다) ·
       가는÷굵은 **0.975**(A 는 1.200). 쐐기에서는 **면적 가중 평균폭**을 읽는다(비 1.014~1.043) —
       «굵은 자리가 그림에서 차지하는 몫도 그만큼 크다» 는 ridgeCover 의 가중과 같은 뜻이다.
       ⚠ 마루 화소가 4개 미만이면(코어가 몇 화소뿐인 종) 0 을 돌려주지 않고 **봉우리 2·max(D)**
         로 물러선다 — 조용한 0 은 [B10] 을 초록으로 지나가게 하는 얼굴이다(1회차 [R3] 교훈). */
    const ridgeW = (m, w, h) => {
      const d = cham(m, w, h);
      let mx = 0;
      for (let p = 0; p < d.length; p++) if (m[p] && d[p] > mx) mx = d[p];
      if (!mx) return 0;
      const need = mx * 0.35;
      let a = 0, b = 0, n = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, v = d[p];
        if (!m[p] || v < need) continue;
        if (v < d[p - 1] || v < d[p + 1] || v < d[p - w] || v < d[p + w]) continue;
        const t = v / 5; a += t * t; b += t; n++;
      }
      if (n < 4 || !b) return 2 * mx / 5;
      return 2 * a / b;
    };
    /* ⚑ «주 덩어리에 ③층이 0px» 을 재는 자 — **연결성분이 아니라 마루(medial axis) 덮임**이다.
       1회차에 최대 연결성분으로 먼저 재 봤는데 CV 가 짚은 셋(arrow 축 · boomer 팔 · spiral 리본)이
       전부 **머리·점과 한 덩어리로 붙어 있어** 그 자로는 초록으로 지나갔다(되돌림 시험 [R3] 이
       0종을 찍어 그것을 잡았다 — 자가 자기 문턱을 스스로 못 푼다는 증거다).
       ⇒ 본체 마루를 훑어 «그 자리에 코어가 있는가» 를 세면 «축에만 없다» 가 그대로 잡힌다. */
    const ridgeCover = (body, core, w, h) => {
      const d = cham(body, w, h);
      /* ⚠ 마루를 **전부** 세면 자가 잡음을 센다 — 저알파 발광의 문턱 언저리(α ≈ .55)에서 본체
         마스크가 얼룩덜룩해져 «반쪽폭 1~2px 짜리 마루» 가 수백 개 생긴다(1회차 실측: 그 자로는
         화구 0.286 · 운석 0.017 로 **코어가 한복판에 멀쩡히 있는 종**이 빨갛다).
         CV 가 말한 것은 «**주** 덩어리» 이므로 그 종에서 가장 두꺼운 자리의 35% 이상인
         마루만 센다 — 축·팔·리본은 전부 여기 들어오고 얼룩은 안 들어온다. */
      let mx = 0;
      for (let p = 0; p < d.length; p++) if (body[p] && d[p] > mx) mx = d[p];
      const need = mx * 0.35;
      let tot = 0, cov = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, v = d[p];
        if (!body[p] || v < need) continue;
        if (v < d[p - 1] || v < d[p + 1] || v < d[p - w] || v < d[p + w]) continue;
        /* ⚠ 마루 화소를 **한 개씩** 세면 이 자가 얇은 곁가지 하나에 흔들린다 — ice 는 주 마루가
           38 화소뿐이라 뒤 미늘 10 화소가 곧 −26%p 다(1회차 실측 0.737). CV 가 말한 것은
           «**주** 덩어리를 따라가는가» 이므로 **그 자리의 두께로 가중**해 센다(두꺼운 자리가
           그림에서 차지하는 몫도 그만큼 크다). 가중을 빼면 얇은 미늘이 두꺼운 날과 같은 표를 갖는다. */
        tot += v;
        const rr = Math.max(2, Math.round(0.5 * v / 5));
        let hitc = 0;
        for (let dy = -rr; dy <= rr && !hitc; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -rr; dx <= rr; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            if (core[yy * w + xx]) { hitc = 1; break; }
          }
        }
        cov += hitc * v;
      }
      return tot ? cov / tot : 0;
    };
    /* 최대 연결성분(4이웃) */
    const biggest = (m, w, h) => {
      const lab = new Int32Array(w * h), st = [];
      let best = null, bn = 0, id = 0;
      for (let p0 = 0; p0 < m.length; p0++) {
        if (!m[p0] || lab[p0]) continue;
        id++; st.length = 0; st.push(p0); lab[p0] = id;
        const cell = [];
        while (st.length) {
          const p = st.pop(); cell.push(p);
          const x = p % w, y = (p - x) / w;
          const nb = [];
          if (x > 0) nb.push(p - 1);
          if (x < w - 1) nb.push(p + 1);
          if (y > 0) nb.push(p - w);
          if (y < h - 1) nb.push(p + w);
          for (const q of nb) if (m[q] && !lab[q]) { lab[q] = id; st.push(q); }
        }
        if (cell.length > bn) { bn = cell.length; best = cell; }
      }
      return { cell: best || [], n: bn };
    };

    /* ⚑ 2회차 비평 CZ 1순위 — «**한 종 안에서** 고르지 않다»(ice 획 22px에 코어 2px = 9% 인데
       같은 날의 다른 단면은 35% · 끝단은 67%). [B10] 은 종을 **한 수**로 요약하므로 원리적으로
       못 본다 — 종 안의 흩어짐을 재는 축을 따로 세운다: 주 마루 화소마다 «그 자리 코어 두께 ÷
       그 자리 본체 두께» 를 내고 p90 ÷ p10 을 본다(양 끝 10% 는 화소 한두 개에 흔들린다). */
    /* ⚑ 8회차 — `keep` 는 **진단 전용**이다(`--spread <종>` 일 때만 배열이 들어온다). 판정에는
       한 글자도 안 쓰이고, 재는 자리·순서는 아래 루프 그대로다(자를 따로 만들면 그것이 곧 사본이다).
       7회차가 «먼저 어느 자리가 p50 을 끌어내리는지 찍어라» 를 8회차 1순위로 남긴 그 자리다. */
    /* ⚑ 9회차 — `bank` 는 [B13] 이 읽는 **같은 자리·같은 순서**의 표본이다(자를 따로 만들면 그것이
       곧 사본이다 — 402). 재는 곳도 가중도 [B12] 와 한 벌이고, 다른 것은 **묶는 축**뿐이다:
       [B12] 는 «한 종 안» 으로 묶고 [B13] 은 «획 폭 구간» 으로 묶는다. 8회차 채점 2인(DD·DE)이
       각자 손으로 층화해 잰 것이 뒤엣것이다 — 자가 종을 **한 수**로 요약하는 동안 두 사람은
       획 8~12px 구간만 따로 재서 «45~50%» 를 봤고, 그래서 [B10a] 가 초록인 채로 눈에는
       `gale` 만 속심이 굵어 보였다. */
    const spread = (body, core, w, h, cap, keep, bank, dbC, dcC) => {
      const db = cham(body, w, h), dc = cham(core, w, h);
      let mx = 0;
      for (let p = 0; p < db.length; p++) if (body[p] && db[p] > mx) mx = db[p];
      const need = mx * 0.35, rs = [];
      /* 재는 자리는 **본체의 주 마루**다 — CZ 가 «한 날을 따라가며» 잰 것이 그것이다.
         ⚠ 이 자는 **획 무리에서만** 뜻이 있다. 납작한 덩어리(육각 돌·병·공)에서는 4이웃 봉우리가
           평평한 고원을 통째로 «마루» 로 잡아 코어에서 먼 화소가 섞이고, 그 잡음이 곧 «p10 = 0» 이다
           (2회차에 그 얼굴을 stone·flask 에서 봤다). 덩어리의 «폭이 고른가» 는 [B10c] 가 묻는다. */
      /* ⚑⚑ 927 — **두 패스로 가른다.** 마루 판정과 담기를 한 패스로 하면 «마루 기울기» 를 담을 수
         없다: 기울기는 반경 2 안의 **마루 이웃**에서 나오는데, 한 패스에서는 아직 안 지나간
         이웃(아래·오른쪽)이 통째로 빠져 같은 자리가 «지나간 순서» 에 따라 다른 각을 받는다.
         ⇒ ① 마루 화소를 먼저 다 고르고(`isPk`) ② 그 다음에 담는다. 고르는 규칙·순서(y 우선)는
         한 글자도 안 바뀌므로 `rs`·`keep`·`bank` 의 **자리 순서가 종전과 같다** —
         8회차의 짝/홀 잡음 바닥도 9회차의 dump↔bank 짝도 그대로 성립한다. */
      const pk = [], isPk = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, v = db[p];
        if (!body[p] || v < need) continue;
        if (v < db[p - 1] || v < db[p + 1] || v < db[p - w] || v < db[p + w]) continue;
        isPk[p] = 1; pk.push(p);
      }
      /* 마루 기울기 — 반경 2 안 마루 이웃 오프셋의 2차 모멘트 주축. 격자가 90° 주기라 0~45° 로
         접는다(0 = 축 정렬 · 45 = 대각). 10회차 진단이 node 쪽에서 쓰던 식 **그대로**이고,
         이제 그 진단도 이 칸을 읽는다(사본 금지 — 402). 이웃이 2 미만이면 각이 없다(−1). */
      const angAt = (p) => {
        const x = p % w, y = (p - x) / w;
        let sxx = 0, syy = 0, sxy = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!isPk[ny * w + nx]) continue;
          sxx += dx * dx; syy += dy * dy; sxy += dx * dy; n++;
        }
        if (n < 2) return -1;
        const th = (Math.atan2(2 * sxy, sxx - syy) / 2) * 180 / Math.PI;
        const f = ((th % 90) + 90) % 90;
        return f > 45 ? 90 - f : f;
      };
      for (const p of pk) {
        const x = p % w, y = (p - x) / w, v = db[p];
        /* ⚠ 무리마다 **묻는 것이 다르다**(규격이 둘이므로 — [B10] 과 같은 갈래다):
             · 획 무리 — 코어가 획에 **비례**해야 하므로 «코어÷본체» 의 흩어짐을 본다.
             · 덩어리 무리 — 코어는 상한 폭으로 **일정**해야 하므로 코어 **두께 자체**의 흩어짐을 본다.
           («코어가 없으면 0» 은 두 무리 모두 흩어짐으로 센다 — 그 자리에 층이 없다는 뜻이다.) */
        rs.push(dc[p] / v);              /* 코어가 없으면 0 — 그 자리에 층이 없다는 뜻이다 */
        if (keep) keep.push([x, y, +(v / 5).toFixed(2), +(dc[p] / 5).toFixed(2), +(dc[p] / v).toFixed(3)]);
        /* [B13] — «그 자리 획 폭(로컬px)» 과 «그 자리 비» 한 쌍. 종 이름은 여기서 안 붙인다
           (구간별로 묶는 축이라 종은 묻지 않는다 — 묶는 것은 node 쪽 [B13] 이 한다).
           ⚑ 889 ① — 뒤의 두 칸이 **같은 자리를 덮인 몫으로 잰 것**이다. 재는 자리(본체 주 마루)도
             고르는 규칙도 위와 **한 벌**이고 다른 것은 거리밭과 꼭짓점 보정뿐이다:
             천막의 꼭짓점 몫 δ 는 본체 밭에서 한 번 구해 **본체·코어에 같이** 얹는다 —
             두 층은 동심(코어는 본체의 대칭 침식)이라 마루가 같은 자리에 있고, 표본이 그 자리에서
             벗어난 몫도 같기 때문이다. */
        if (bank) {
          const dlt = dbC ? window.__W889.peak(dbC, p, w) : 0;
          const bv = dbC ? (dbC[p] + dlt) : 0;
          const cvv = dcC ? Math.max(0, dcC[p] + dlt) : 0;
          /* 다섯째 칸 = **마루 기울기**(927). 앞 네 칸은 자리도 뜻도 그대로다 — [B13]·[B14] 는
             `col`·`col+1` 만 읽으므로 칸을 더해도 그 자들이 읽는 값이 안 바뀐다. */
          bank.push([+(2 * v / 5).toFixed(3), +(dc[p] / v).toFixed(4),
                     +(2 * bv / 5).toFixed(3), bv > 0 ? +(cvv / bv).toFixed(4) : 0,
                     +angAt(p).toFixed(2)]);
        }
      }
      if (rs.length < 4) return { lo: 0, hi: 0, sp: 0, n: rs.length };
      rs.sort((a, b) => a - b);
      const q = f => rs[Math.floor(f * (rs.length - 1))];
      /* ⚠ 아래쪽 꼬리는 **p10 이 아니라 중앙값**과 견준다 — 납작한 덩어리에서 4이웃 봉우리가
         평평한 고원을 «마루» 로 잡는 잡음이 하위 10% 를 통째로 0 으로 만든다(3회차에 stone·ice 가
         그 얼굴이었고, 잡음인지 실재인지는 [B11](층이 마루를 따라가는가)가 이미 따로 답한다).
         «한 획 안에서 9% ↔ 67%»(CZ) 같은 실재하는 흔들림은 중앙값 대비로도 그대로 남는다. */
      const lo = q(0.10), md = q(0.50), hi = q(0.90);
      return { lo: +lo.toFixed(3), md: +md.toFixed(3), hi: +hi.toFixed(3),
               sp: md > 0 ? +(hi / md).toFixed(2) : 99, n: rs.length };
    };

    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      clearFx(); shots.push(mk());              const a0 = grab();
      clearFx(); shots.push(mk(), mk());        const a2 = grab();
      const body = new Uint8Array(bw * bh);     /* ② 본체(α ≥ .55) */
      const core = new Uint8Array(bw * bh);     /* ③ 하이라이트(근백색) */
      const alF = new Float32Array(bw * bh);    /* 889 — 문턱 **전**의 알파(덮인 몫의 재료) */
      let nb = 0, nc = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const d1 = a0[i + c] - base[i + c], d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        alF[p] = al;
        if (al < A_BODY) continue;
        body[p] = 1; nb++;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) { core[p] = 1; nc++; }
      }
      /* ⚑⚑ 889 ① — **같은 표본을 «덮인 몫» 으로 한 벌 더 만든다.** 이진 마스크(위)는 한 글자도
         안 건드린다 — 마루 찾기·연결성분·[B11] 덮임은 전부 그대로 두고, **폭을 재는 자만** 바꾼다.
           · 본체 — 알파가 곧 덮인 몫이다. 경사는 «링(α .62) → 단단한 몸(α 1)» 이므로
             램프를 .60~1.00 으로 잡으면 **0.5 를 지나는 자리가 정확히 옛 문턱 `A_BODY`(0.80)** 다
             ⇒ 이진화하면 위 마스크와 **같은 마스크**가 나온다(자리는 안 옮기고 눈금만 촘촘해진다).
           · 코어 — 흰 층의 몫은 «본체 바탕색 B 에서 흰색으로 얼마나 갔나» 다:
             `s = ((P−B)·(W−B)) / |W−B|²`. B 는 그 종 본체 화소(근백색 아닌 것)의 채널별 중앙값이고,
             고원(plateau)은 근백색 화소의 s 중앙값이라 **종마다 자기 색으로 정규화**된다.
             ⚠ 본체가 원래 흰 종(arrow·spiral·star — [진단] «코어를 끈 사본» 표)은 |W−B| 가 작아
               나눗셈이 잡음을 키운다 ⇒ 그런 종은 **이진 마스크로 물러난다**(없는 정밀도를 짓지 않는다). */
      const cvB = new Float32Array(bw * bh), cvC = new Float32Array(bw * bh);
      let covOk = 0;
      {
        for (let p = 0; p < cvB.length; p++) {
          const t = (alF[p] - 0.60) / 0.40;
          cvB[p] = t <= 0 ? 0 : (t >= 1 ? 1 : t);
        }
        const chs = [[], [], []];
        for (let i = 0, p = 0; i < a0.length; i += 4, p++)
          if (body[p] && !core[p]) for (let k = 0; k < 3; k++) chs[k].push(a0[i + k]);
        const med = a => { a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
        const B = chs.map(med);
        let den = 0;
        for (let k = 0; k < 3; k++) den += (255 - B[k]) * (255 - B[k]);
        const spread255 = Math.max(255 - B[0], 255 - B[1], 255 - B[2]);
        if (chs[0].length >= 40 && den > 0 && spread255 >= 40) {
          const sArr = new Float32Array(bw * bh), hi = [];
          for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
            if (!body[p]) continue;
            let s = 0;
            for (let k = 0; k < 3; k++) s += (255 - B[k]) * (a0[i + k] - B[k]);
            s /= den;
            sArr[p] = s;
            if (core[p]) hi.push(s);
          }
          if (hi.length >= 12) {
            hi.sort((x, y) => x - y);
            const plat = hi[hi.length >> 1];
            if (plat > 0.15) {
              for (let p = 0; p < cvC.length; p++) {
                const t = sArr[p] / plat;
                cvC[p] = t <= 0 ? 0 : (t >= 1 ? 1 : t);
              }
              covOk = 1;
            }
          }
        }
        if (!covOk) for (let p = 0; p < cvC.length; p++) cvC[p] = core[p];
      }
      const dbC = window.__W889.chamCov(cvB, bw, bh);
      const dcC = window.__W889.chamCov(cvC, bw, bh);
      /* ③층의 **기하 경계**는 «흰 층의 몫이 절반» 인 등고선이다. 옛 이진 문턱(≥232)은
         고원의 안쪽을 재던 것이라, 제품이 가장자리에 부분 알파를 주면 그만큼 안으로 물러난다
         (그 물러남이 [B11]·[B12] 에 «코어가 없어졌다» 로 찍힌다 — 실제로는 자리가 그대로다). */
      const coreC = new Uint8Array(bw * bh);
      let ncC = 0;
      for (let p = 0; p < coreC.length; p++) if (body[p] && cvC[p] >= 0.5) { coreC[p] = 1; ncC++; }
      const wbC = nb ? window.__W889.ridgeWD(dbC, body, bw, bh) : 0;
      const wcC = ncC ? window.__W889.ridgeWD(dcC, coreC, bw, bh) : 0;
      /* ⚠ ③층은 본체의 부분집합이다 — «본체 밖 흰 화소» 를 세면 후광 위 잡음이 폭을 부풀린다. */
      const wb = nb ? ridgeW(body, bw, bh) : 0;
      const capMode = (typeof SPEC_K !== 'undefined' && typeof SPEC_MAXR !== 'undefined')
        ? (SPEC_K * wb >= 0.8 * SPEC_MAXR * 2 * HALO_SS) : false;
      const wc = nc ? ridgeW(core, bw, bh) : 0;
      const wbA = nb ? effW(body, bw, bh) : 0;   /* 대조군(옛 자) — 표에만 찍고 판정에는 안 쓴다 */
      const big = biggest(body, bw, bh);
      let inMain = 0;
      for (const p of big.cell) if (core[p]) inMain++;
      const keep = (id === (window.__SPREAD856 || '')) ? [] : null;
      const bank = [];
      rows[id] = { sh: sp.sh || sp.k, nb, nc, dump: keep, bank,
                   wb: +wb.toFixed(2), wc: +wc.toFixed(2), wbA: +wbA.toFixed(2),
                   covOk, wbC: +wbC.toFixed(2), wcC: +wcC.toFixed(2),
                   ratioC: wbC > 0 ? +(wcC / wbC).toFixed(3) : 0,
                   ratio: wb > 0 ? +(wc / wb).toFixed(3) : 0,
                   main: big.n, mainSpec: inMain,
                   fMain: big.n ? +(inMain / big.n).toFixed(4) : 0,
                   cover: nb ? +ridgeCover(body, coreC, bw, bh).toFixed(3) : 0,
                   coverBin: nb ? +ridgeCover(body, core, bw, bh).toFixed(3) : 0, ncC,
                   spread: nb && nc ? spread(body, core, bw, bh, capMode, keep, bank, dbC, dcC) : { lo: 0, hi: 0, sp: 99, n: 0 } };
      /* ⚑ 889 — [B12] 를 **같은 표본을 덮인 몫으로** 잰 값(같은 자리·같은 순서 · bank 의 뒤 두 칸).
         자를 따로 만들면 그것이 곧 사본이라(402) 여기서는 이미 담긴 표본을 다시 묶기만 한다. */
      {
        const rs2 = (bank || []).map(e => e[3]).filter(v => isFinite(v));
        rs2.sort((a, b) => a - b);
        const Q = f => rs2[Math.floor(f * (rs2.length - 1))];
        rows[id].spreadC = rs2.length >= 4
          ? { md: +Q(0.5).toFixed(3), hi: +Q(0.9).toFixed(3),
              sp: Q(0.5) > 0 ? +(Q(0.9) / Q(0.5)).toFixed(2) : 99, n: rs2.length }
          : { md: 0, hi: 0, sp: 0, n: rs2.length };
      }
      clearFx();
    }
    performance.now = _now;
    /* ⚑ 9회차 진단(판정 밖) — **구운 스프라이트 자체**의 코어 폭. 화면에서 잰 폭은 «굽기 →
       페이드 → 무릎 → 합성 → 근백색 문턱» 을 전부 지난 값이라, 바닥이 어느 단계에서 생기는지
       가르려면 굽기 직후를 따로 재야 한다(K·페이드·minR 를 흔들어도 가는 구간이 안 움직였다). */
    const sprites = [];
    if (typeof SPEC_SPR !== 'undefined') for (const [k, v] of SPEC_SPR.entries()) {
      if (!v || !v.c) continue;
      try {
        const cw = v.c.width, ch = v.c.height;
        const g2 = v.c.getContext('2d'), im2 = g2.getImageData(0, 0, cw, ch).data;
        const m2 = new Uint8Array(cw * ch);
        let mxA = 0;
        for (let i = 3; i < im2.length; i += 4) if (im2[i] > mxA) mxA = im2[i];
        for (let p = 0, i = 3; p < m2.length; p++, i += 4) if (im2[i] >= mxA * 0.5) m2[p] = 1;
        sprites.push([String(k).split('|')[0], +(ridgeW(m2, cw, ch) / HALO_SS).toFixed(2), cw, ch]);
      } catch (_) {}
    }
    /* 코어를 구운 종을 **제품에게 묻는다**(자에 목록을 손으로 적으면 그것이 곧 사본이다 — 402) */
    const baked = (typeof SPEC_SPR !== 'undefined')
      ? Array.from(SPEC_SPR.entries()).filter(e => e[1]).map(e => String(e[0]).split('|')[0]) : [];
    /* 규격 상수는 **제품에게 묻는다** — 자에 손으로 적으면 그것이 곧 사본이다(402). */
    const K = typeof SPEC_K !== 'undefined' ? SPEC_K : 0;
    const capW = (typeof SPEC_MAXR !== 'undefined' ? SPEC_MAXR : 0) * 2 * HALO_SS;
    return { rows, baked, sprites, n: Object.keys(specs).length, K, capW };
  });

  await ctx.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 856 — ③층(하이라이트) 폭 규격 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const src = fs.readFileSync(SRC, 'utf8');
  const clean = () => { try { fs.unlinkSync(NEG_SPEC); } catch (_) {} };

  try {
    /* ---- [C] 선언 ---- */
    ok(src.includes(TAG_SPEC) && /function specSprite\(/.test(src),
       '[C1] 코어를 굽는 이름이 한 벌 있다 (`SPEC_ON` · `specSprite`)');
    ok(/const SPEC_K\s*=\s*0\.3[0-9]|const SPEC_K\s*=\s*0\.4/.test(src),
       '[C2] 목표 비율 `SPEC_K` 가 CV 목표대(0.30~0.40) 안에 상수 한 곳으로 선언돼 있다');
    ok((src.match(/const spec = fn =>/g) || []).length === 1,
       '[C3] `spec()` 선언이 한 곳뿐이다 (종별 사본 금지 — 402)');

    const r = await measure(browser, 'file://' + SRC);
    if (r.out && r.out.__err) {
      ok(false, '[A1] 측정 예외 — ' + r.out.__err);
    } else {
      const ids = Object.keys(r.out.rows);
      ok(ids.length >= 13, '[A1] 잰 종 ' + ids.length + '종 ≥ 13');
      ok((r.out.baked || []).length >= 12,
         '[A2] 코어를 구운 종 ' + (r.out.baked || []).length + '종 ≥ 12 (굽기 실패는 조용히 폴백된다)');

      console.log('\n  종                 본체폭   코어폭   비     마루덮임  종내흩어짐   (옛자 본체폭)');
      for (const id of ids) {
        const q = r.out.rows[id];
        console.log('  ' + (q.sh + ' (' + id + ')').padEnd(20) +
                    String(q.wb).padStart(7) + String(q.wc).padStart(9) +
                    String(q.ratio).padStart(7) + String(q.cover).padStart(9) +
                    String(q.spread.sp).padStart(8) + String(q.wbA).padStart(15));
      }
      console.log('');
      /* ⚑ 889 ① 진단(판정 밖) — **같은 표본을 «덮인 몫» 으로 잰 폭**. 옛 자와 나란히 찍어야
         차가 «어느 종에서 얼마나» 인지 보인다(10회차 표의 «기하폭 ↔ 굳은폭» 과 같은 자리). */
      console.log('  [889] 덮인 몫 가중 — 종        본체폭    코어폭     비    (옛 비)   정규화');
      for (const id of ids) {
        const q = r.out.rows[id];
        console.log('  ' + (q.sh + ' (' + id + ')').padEnd(31) +
                    String(q.wbC).padStart(7) + String(q.wcC).padStart(10) +
                    String(q.ratioC).padStart(8) + String(q.ratio).padStart(9) +
                    '   흩어짐 ' + String((q.spreadC || {}).sp).padStart(5) + ' (옛 ' + String(q.spread.sp) + ')' +
                    (q.covOk ? '  종색' : '  이진(본체가 희다)'));
      }
      console.log('');

      /* ── 진단(`--spread <종>`) — 판정 밖이다. 어느 «자리» 가 p50 을 끌어내리는지 본다. ── */
      if (DUMP) {
        const q = r.out.rows[DUMP];
        if (!q || !q.dump || !q.dump.length) {
          console.log('  [dump] ' + DUMP + ' — 주 마루 표본 없음(종 이름을 확인하라: ' + ids.join(' · ') + ')\n');
        } else {
          const s = q.dump;
          const xs = s.map(v => v[0]), ys = s.map(v => v[1]);
          const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
          const cols = 56, sc = Math.max(1, Math.ceil((x1 - x0 + 1) / cols));
          const W = Math.ceil((x1 - x0 + 1) / sc), H = Math.ceil((y1 - y0 + 1) / sc);
          const acc = Array.from({ length: H }, () => Array.from({ length: W }, () => []));
          for (const [x, y, tb, tc, ra] of s) acc[Math.floor((y - y0) / sc)][Math.floor((x - x0) / sc)].push(ra);
          console.log('  [dump] ' + DUMP + ' — 주 마루 ' + s.length + '화소 · 셀 ' + sc + '×' + sc +
                      'px · 숫자 = 그 셀 «코어÷본체» 평균 ×10 (0 = 코어 없음 · · = 마루 아님)');
          for (let i = 0; i < H; i++) {
            let line = '  ';
            for (let j = 0; j < W; j++) {
              const c = acc[i][j];
              if (!c.length) { line += '·'; continue; }
              const m = c.reduce((a, b) => a + b, 0) / c.length;
              line += m <= 0.001 ? '0' : String(Math.min(9, Math.round(m * 10)));
            }
            console.log(line);
          }
          if (s.length <= 60) console.log('  표본(x y 본체 코어 비) — ' +
            s.map(v => v.join(':')).join(' · '));
          const rs = s.map(v => v[4]).sort((a, b) => a - b);
          const Q = f => rs[Math.floor(f * (rs.length - 1))];
          console.log('  분위 — p10 ' + Q(0.1).toFixed(3) + ' · p25 ' + Q(0.25).toFixed(3) +
                      ' · p50 ' + Q(0.5).toFixed(3) + ' · p75 ' + Q(0.75).toFixed(3) +
                      ' · p90 ' + Q(0.9).toFixed(3) + ' ⇒ p90÷p50 ' + (Q(0.9) / Q(0.5)).toFixed(2));
          /* «가는 자리가 손해를 보는가» — 본체 두께 구간별로 갈라 본다(규격은 «비가 두께에 무관» 이다). */
          const bins = [[0, 2], [2, 3], [3, 4], [4, 6], [6, 9], [9, 99]];
          console.log('  본체 두께(로컬px) 구간별 — 규격은 «비가 두께에 무관» 이다');
          for (const [lo, hi] of bins) {
            const c = s.filter(v => v[2] >= lo && v[2] < hi);
            if (!c.length) continue;
            const rr = c.map(v => v[4]).sort((a, b) => a - b);
            const zero = c.filter(v => v[4] <= 0.001).length;
            console.log('    ' + String(lo).padStart(2) + '~' + String(hi).padEnd(3) +
                        ' n=' + String(c.length).padStart(4) +
                        '  비 중앙 ' + rr[Math.floor(0.5 * (rr.length - 1))].toFixed(3) +
                        '  최소 ' + rr[0].toFixed(3) + '  최대 ' + rr[rr.length - 1].toFixed(3) +
                        '  코어0 ' + zero + '화소');
          }
          /* ⚑⚑ 9회차 진단 — «가는 단면과 굵은 단면이 **그림의 어느 자리**인가».
             8회차가 «폭 축은 실재하되 폭의 매끄러운 함수가 아니다»(c 가 종마다 8배 · lance 옆모습이
             단조 아님)로 닫으면서 남긴 물음이 이것이다. 같은 종의 두 구간은 **같은 그림의 다른 부분**
             이므로(arrow 의 촉 ↔ 자루) 구간 차의 임자가 «폭» 이 아니라 **자리의 생김새**(끝단·굽이)
             일 수 있다.
             ⚠ **자를 새로 만들지 않는다(402)** — `dump` 와 `bank` 는 `spread()` 의 **같은 루프에서
             같은 화소마다 한 번씩** 담기므로 자리끼리 짝이 맞는다(그래서 길이가 같은지부터 묻는다).
             여기서 하는 일은 이미 잰 표본을 [B13] 이 묶는 축(획 폭 구간)으로 **다시 묶는 것**뿐이고,
             폭·비는 [B13]·[B14] 가 읽는 그 칸(`bank[2]`·`bank[3]`)을 그대로 읽는다. */
          if (q.bank && q.bank.length === s.length) {
            const binOf = w => (w >= B13_LO && w < B13_HI) ? Math.floor((w - B13_LO) / B13_W) + 1 : 0;
            const pts = s.map((v, i) => ({ x: v[0], y: v[1], w: q.bank[i][2], ra: q.bank[i][3],
                                           b: binOf(q.bank[i][2]) }));
            /* 끝단성 — 마루를 8이웃 그래프로 보고 «이웃 ≤1» 인 화소(끝)에서 몇 걸음인지 BFS.
               좌표는 위에서 이미 담긴 것이고 새로 재는 화소가 없다. */
            const key = (x, y) => x + ',' + y;
            const at = new Map(pts.map(p => [key(p.x, p.y), p]));
            for (const p of pts) {
              let n = 0;
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
                if ((dx || dy) && at.has(key(p.x + dx, p.y + dy))) n++;
              p.nb = n;
            }
            const q0 = pts.filter(p => p.nb <= 1);
            for (const p of pts) p.d = q0.includes(p) ? 0 : Infinity;
            let front = q0.slice();
            for (let step = 1; front.length; step++) {
              const nx = [];
              for (const p of front) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const t = at.get(key(p.x + dx, p.y + dy));
                if (t && t.d > step) { t.d = step; nx.push(t); }
              }
              front = nx;
            }
            console.log('  [889 9회차] 같은 표본을 **[B13] 구간**으로 색칠 — 숫자 = 구간번호' +
                        '(1 = 획 ' + B13_LO + '~' + (B13_LO + B13_W) + ' · 이후 ' + B13_W + 'px 씩) · ' +
                        '- = 구간 밖 · · = 마루 아님');
            const acc2 = Array.from({ length: H }, () => Array.from({ length: W }, () => []));
            for (const p of pts) acc2[Math.floor((p.y - y0) / sc)][Math.floor((p.x - x0) / sc)].push(p.b);
            for (let i = 0; i < H; i++) {
              let line = '  ';
              for (let j = 0; j < W; j++) {
                const c = acc2[i][j];
                if (!c.length) { line += '·'; continue; }
                const t = c.slice().sort((a, b) => a - b)[Math.floor(0.5 * (c.length - 1))];
                line += t ? String(t) : '-';
              }
              console.log(line);
            }
            const md = a => { const t = a.slice().sort((x, y) => x - y); return t[Math.floor(0.5 * (t.length - 1))]; };
            console.log('  구간별 자리 — 중심(x,y) · 상자 · 끝단거리(마루 «이웃≤1» 에서 몇 걸음) · 이웃수');
            for (let b = 1; b <= Math.ceil((B13_HI - B13_LO) / B13_W); b++) {
              const c = pts.filter(p => p.b === b);
              if (c.length < 4) continue;
              const cx = c.reduce((a, p) => a + p.x, 0) / c.length, cy = c.reduce((a, p) => a + p.y, 0) / c.length;
              const bx0 = Math.min(...c.map(p => p.x)), bx1 = Math.max(...c.map(p => p.x));
              const by0 = Math.min(...c.map(p => p.y)), by1 = Math.max(...c.map(p => p.y));
              console.log('    구간' + b + ' 획 ' + (B13_LO + (b - 1) * B13_W) + '~' + (B13_LO + b * B13_W) +
                          '  n=' + String(c.length).padStart(4) +
                          '  비 중앙 ' + md(c.map(p => p.ra)).toFixed(3) +
                          '  코어 중앙 ' + md(c.map(p => p.w * p.ra)).toFixed(2) +
                          '  중심 (' + cx.toFixed(1) + ',' + cy.toFixed(1) + ')' +
                          '  상자 ' + (bx1 - bx0 + 1) + '×' + (by1 - by0 + 1) +
                          '  끝단거리 중앙 ' + String(md(c.map(p => p.d))).padStart(3) +
                          '  이웃 중앙 ' + md(c.map(p => p.nb)));
            }
            /* ⚑⚑ 9회차 — 등재문 자신의 주장(«이진 마스크로 굽는 한 ③층 폭은 **화소 격자에 앉는다**»)을
               같은 표본에게 직접 묻는다. 격자에 앉으면 코어 두께가 어떤 걸음 s 의 배수에 몰리므로
               `|코어/s − 반올림|` 의 평균이 0 에 가깝고, 안 앉으면 고른 분포의 기댓값 **0.25** 에 붙는다.
               걸음을 훑어 가장 잘 맞는 s 와 그 잔차를 찍는다(판정 밖 · 표본은 위와 같은 것 그대로). */
            const cores = pts.map(p => p.w * p.ra).filter(v => v > 0);
            if (cores.length >= 20) {
              const fit = v => {
                let best = null;
                for (let s = 0.30; s <= 3.001; s += 0.01) {
                  const res = v.reduce((a, x) => { const t = x / s; return a + Math.abs(t - Math.round(t)); }, 0) / v.length;
                  if (!best || res < best.res) best = { s, res };
                }
                return best;
              };
              const best = fit(cores);
              /* ⚠⚠ **이 자는 널 없이 읽으면 자기 답을 만든다** — 한 값에 몰린 분포는 격자와
                 아무 상관이 없어도 «그 최빈값을 나누는 걸음» 에서 잔차가 낮게 나온다(고른 분포의
                 0.250 과 견주면 무엇이든 «격자» 로 읽힌다). 그래서 **같은 평균·같은 흩어짐의
                 격자 아닌 단봉 분포**(정규)를 만들어 같은 자로 재고, 실측이 그 널 아래로
                 내려갈 때만 격자라고 말한다. 난수는 씨앗 고정 LCG 라 판이 흔들리지 않는다. */
              const mu = cores.reduce((a, b) => a + b, 0) / cores.length;
              const sd = Math.sqrt(cores.reduce((a, b) => a + (b - mu) * (b - mu), 0) / cores.length) || 0.01;
              let sdv = 20260905;
              const rnd = () => (sdv = (sdv * 1103515245 + 12345) % 2147483648) / 2147483648;
              const nulls = [];
              for (let k = 0; k < 9; k++) {
                const v = [];
                for (let i = 0; i < cores.length; i++) {
                  let u = 0; while (!u) u = rnd();
                  v.push(mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()));
                }
                nulls.push(fit(v).res);
              }
              nulls.sort((a, b) => a - b);
              const nullMd = nulls[4], nullLo = nulls[0];
              const hist = {};
              for (const v of cores) { const k = (Math.round(v * 4) / 4).toFixed(2); hist[k] = (hist[k] || 0) + 1; }
              const top = Object.keys(hist).sort((a, b) => hist[b] - hist[a]).slice(0, 8);
              console.log('  격자 시험 — 코어 두께가 어떤 걸음의 배수에 앉는가');
              console.log('    최적 걸음 ' + best.s.toFixed(2) + '로컬px · 잔차 ' + best.res.toFixed(3) +
                          ' · 표본 ' + cores.length +
                          '  ↔ 널(같은 평균 ' + mu.toFixed(2) + ' · 같은 흩어짐 ' + sd.toFixed(2) +
                          ' 의 격자 아닌 단봉) 중앙 ' + nullMd.toFixed(3) + ' · 최소 ' + nullLo.toFixed(3) +
                          '  ⇒ ' + (best.res < nullLo ? '격자에 앉는다(널 아래)' : '격자 근거 없음(널 안)'));
              console.log('    많이 나온 두께(0.25 눈금) — ' +
                          top.map(k => k + '×' + hist[k]).join(' · '));
            }
            /* ⚑⚑ 10회차 — 9회차 지도가 «구간 = 그림의 다른 부분» 을 보여 준 뒤 남는 물음은
               «그 두 부분이 무엇으로 다른가» 다. arrow 는 대각 날개 ↔ **가로** 자루, gale 은
               깃 ↔ **세로** 활이라 첫 후보가 **마루의 기울기**(축 정렬 ↔ 대각)다 — 굽기의 거리밭도
               자의 거리밭도 격자 위에서 도는 것이라 45° 에서 축과 다르게 앉을 수 있다.
               기울기는 **이미 담긴 좌표**에서 낸다(자를 새로 만들지 않는다 — 402): 반경 2 안의
               마루 이웃 오프셋의 2차 모멘트에서 주축 각을 구하고, 축 대칭이라 0~45° 로 접는다.
               ⚑⚑ 927 — 그 식은 이제 `spread()` 안에 있고 각은 **`bank` 의 다섯째 칸**으로 담겨
               온다. 여기서 다시 세면 그것이 곧 사본이므로(402) 담긴 값을 그대로 읽는다 —
               판정([B14])과 이 진단이 **한 수**를 본다는 것이 927 의 요점이다. */
            pts.forEach((p, i) => { p.ang = q.bank[i][4]; });
            const angBins = ANG_BINS;
            const oriRows = [];
            for (const [lo, hi] of angBins) {
              const c = pts.filter(p => p.ang >= lo && p.ang < hi);
              if (c.length < 10) continue;
              oriRows.push([lo, hi, c.length, md(c.map(p => p.ra)), md(c.map(p => p.w))]);
            }
            if (oriRows.length >= 2) {
              const rr = oriRows.map(e => e[3]);
              console.log('  마루 기울기별(축 정렬 0° ↔ 대각 45°) — 규격은 «비가 기울기에 무관» 이다');
              for (const [lo, hi, n, ra, w] of oriRows)
                console.log('    ' + String(Math.round(lo)).padStart(2) + '~' + String(Math.round(hi)).padEnd(3) +
                            '°  n=' + String(n).padStart(4) + '  비 중앙 ' + ra.toFixed(3) +
                            '  획 중앙 ' + w.toFixed(2) + '  코어 ' + (ra * w).toFixed(2));
              console.log('    ⇒ 밴드 ' + (Math.max(...rr) / Math.min(...rr)).toFixed(3) + '배');
            }
            /* ⚑⚑ 10회차 — **교차표**. 위의 두 축(획 폭 · 마루 기울기)은 서로 얽혀 있어서
               («arrow 의 대각 날개는 가로 자루보다 가늘다») 한 축씩 보면 상대 축의 몫을 제 것으로
               읽는다 — [B14] 가 «종만 고정하면 폭 축만 남는다» 고 믿고 있는 자리가 정확히 여기다.
               ⇒ 두 축을 같이 잘라 **한 칸 안에서** 상대 축을 고정한 채로 견준다. */
            {
              const wB = [], seen = {};
              for (const p of pts) if (p.b) seen[p.b] = 1;
              for (const k of Object.keys(seen).sort()) wB.push(+k);
              if (wB.length >= 1) {
                console.log('  교차표 «획 구간 × 마루 기울기» — 칸값 = 비 중앙(n) · 한 칸 안에서는 상대 축이 고정이다');
                console.log('        ' + angBins.map(a => ('  ' + Math.round(a[0]) + '~' + Math.round(a[1]) + '°').padStart(14)).join(''));
                for (const b of wB) {
                  let line = '    획' + String(B13_LO + (b - 1) * B13_W).padStart(2) + '~ ';
                  for (const [lo, hi] of angBins) {
                    const c = pts.filter(p => p.b === b && p.ang >= lo && p.ang < hi);
                    line += (c.length < 10 ? '—' : md(c.map(p => p.ra)).toFixed(3) + '(' + c.length + ')').padStart(14);
                  }
                  console.log(line);
                }
              }
            }
          } else {
            console.log('  [889 9회차] ⚠ dump ↔ bank 자리 짝이 안 맞는다(' +
                        s.length + ' ↔ ' + ((q.bank || []).length) + ') — 구간별 자리는 안 찍는다');
          }
          console.log('');
        }
      }

      /* ⚑ 2회차부터 규격이 **두 무리**다(1회차 비평 2인 공통이 그렇게 갈랐다):
           · 획 무리 — 코어 폭 = 획 폭의 K. **비율**이 고른가를 본다.
           · 덩어리 무리 — 비율을 그대로 대면 지름의 35% 짜리 흰 원이 되어 «반짝임» 이 «채움» 이
             된다(CX «boom 실체의 92%» · CY «meteor 90.5% · 남은 테두리 1px»). 상한 폭이 코어를
             정하므로 **폭 자체**가 고른가를 본다.
         무리를 가르는 것은 자의 취향이 아니라 **제품의 규칙 그 자체**다 — K·(본체 폭) 이 상한을
         넘으면 그 종은 상한이 정한다(경계에 걸친 종은 두 규칙이 같은 값을 내므로 0.8 여유를 둔다). */
      const capW = r.out.capW || 0, K = r.out.K || 0;
      const isCap = i => capW > 0 && K * r.out.rows[i].wb >= 0.8 * capW;
      const strokeIds = ids.filter(i => !isCap(i)), blobIds = ids.filter(isCap);
      const outBand = strokeIds.filter(i => r.out.rows[i].ratio < R_MIN || r.out.rows[i].ratio > R_MAX);
      ok(outBand.length === 0,
         '[B10a] 획 무리 ' + strokeIds.length + '종의 «코어 폭 ÷ 본체 폭» 이 ' + R_MIN + '~' + R_MAX +
         ' 안 — 밖 ' + outBand.length + '종' +
         (outBand.length ? ' (' + outBand.map(i => i + ' ' + r.out.rows[i].ratio).join(' · ') + ')' : ''));
      const rs = strokeIds.map(i => r.out.rows[i].ratio);
      const mx = Math.max.apply(null, rs), mn = Math.min.apply(null, rs);
      ok(mn > 0 && mx / mn <= BAND,
         '[B10b] 획 무리는 **비율**이 한 밴드 — 최대 ' + mx.toFixed(3) + ' ÷ 최소 ' + mn.toFixed(3) +
         ' = ' + (mn > 0 ? (mx / mn).toFixed(2) : '∞') + '배 ≤ ' + BAND + ' (수리 전 CV 15.9배 · CW 12.7배)');
      /* ⚑⚑ 9회차 신설 [B13] — **획 폭 구간별** 비의 중앙값이 한 밴드.
         8회차 채점 2인이 **독립으로 같은 수**를 냈다: DD 적합 «코어 = 0.273·획 + 1.07px»(단면
         1,593개 · 획 8–10 / 10–12 / 12–14px 세 구간의 코어 중앙값이 **셋 다 정확히 4.0px**) ·
         DE «획 8–11px 555단면의 중앙 비율 50.0% · 코어 p10/중앙/p90 = 3.0/4.0/4.0px».
         규격대로면 세 구간의 **코어**가 3.1/3.8/4.5 로 갈려야 하는데 한 값으로 붙어 있다 =
         **바닥이 규격을 덮어쓴다**. [B10a]·[B10b] 는 종을 **한 수**로 요약하므로 이것을
         원리적으로 못 본다 — `gale`(획 8.8px 세 줄뿐)은 종 전체가 바닥 위에 앉아 0.454 로
         초록이고, `boomer`(13.7px)는 0.272 로 초록인데 **둘의 코어 폭이 똑같이 4.0px** 다.
         ⇒ 묶는 축을 종이 아니라 **획 폭 구간**으로 바꾼다(재는 자리·가중은 [B12] 와 한 벌).
         ⚠ 이 자는 «비가 획 폭에 무관» 이라는 규격 문장 자체를 묻는다 — 규격이 참이면 구간별
           중앙값은 전부 K 근처로 같고, 바닥이 덮어쓰면 가는 구간만 위로 뜬다. */
      /* ⚑⚑ 889 **이관**(333 처방) — 묶는 축(획 폭 구간)도 가중도 표본도 그대로이고 **자만**
         «덮인 몫» 으로 바꾼다. 이 축이 존재하는 이유가 «바닥 4.0px 이 세 구간을 덮어쓴다» 인데
         10회차가 그 바닥의 정체를 **화소 격자**로 특정했고, `probe889` [P4] 가 규격을 정확히
         지키는 합성 띠에서도 옛 자만 1.27배를 만드는 것을 시험관에서 재현했다.
         ⚠ 래칫(1.55)은 **한 칸도 안 올린다** — 자를 바꾼 값이 그 아래로 내려와야 한다. */
      const bandRows = b13bands(r.out, strokeIds, 2);
      console.log('  [B13] 획 폭 구간별 — 규격이 참이면 «비» 가 구간마다 같고, 바닥이 덮어쓰면 «코어» 가 같다');
      for (const b of bandRows) {
        console.log('    획 ' + String(b.lo).padStart(2) + '~' + String(b.hi).padEnd(3) +
                    ' n=' + String(b.n).padStart(4) + '  비 중앙 ' + b.md.toFixed(3) +
                    '  ⇒ 코어 ' + b.core.toFixed(2) + 'px');
        console.log('        ' + b.by.slice(0, 6).map(e => e[0] + ' ' + e[1] + '개 ' + e[2].toFixed(2)).join(' · '));
      }
      const b13mx = bandRows.length ? Math.max.apply(null, bandRows.map(b => b.md)) : 0;
      const b13mn = bandRows.length ? Math.min.apply(null, bandRows.map(b => b.md)) : 0;
      /* ⚑ 889 ① 진단(판정 밖) — **같은 표본·같은 구간을 덮인 몫으로** 묶은 [B13].
         옛 자의 밴드가 «규격» 인지 «격자» 인지는 이 두 줄을 나란히 놓아야 갈린다:
         `probe889` [P4] 가 규격을 정확히 지키는 합성 띠에서 옛 자만 1.27배를 만드는 것을 이미
         못박았으므로, 여기서 새 자의 밴드가 옛 자보다 낮으면 그 차가 곧 «격자 몫» 이다. */
      const bandC = b13bands(r.out, strokeIds, 0);   /* 옛 이진 자 — 대조군(판정 밖) */
      if (bandC.length) {
        const cmx = Math.max.apply(null, bandC.map(b => b.md)), cmn = Math.min.apply(null, bandC.map(b => b.md));
        console.log('  [889] 대조군 · 같은 구간을 옛 이진 자로 — ' +
                    bandC.map(b => b.lo + '~' + b.hi + ' ' + b.md.toFixed(3) + '(n' + b.n + ')').join(' · '));
        console.log('  [889] ⇒ 옛 자 밴드 ' + (cmn > 0 ? (cmx / cmn).toFixed(2) : '∞') + '배 (덮인 몫 ' +
                    (b13mn > 0 ? (b13mx / b13mn).toFixed(2) : '∞') + '배 = [B13] 판정값)');
      }
      /* ⚑⚑ 889 5회차 진단(판정 밖) — **[B13] 의 남은 밴드가 «폭» 인가 «종 섞임» 인가.**
         [B13] 은 «비는 획 폭에 무관» 을 묻는데 구간마다 **종 구성이 다르다**(6~9 는 97% 가 gale ·
         12~15 는 52% 가 arrow). 그러면 구간 사이의 차가 폭 때문인지 종 때문인지 안 갈린다 —
         [B10b] 가 이미 «종 사이» 축을 따로 재고 있으므로 두 축이 겹치면 [B13] 은 그 몫을 두 번 센다.
         ⇒ 축을 둘로 나눠 나란히 찍는다(판정은 위 [B13] 그대로다 · 여기서 아무 것도 안 무르게 한다):
           ⓐ **종을 고정하고 폭만** — 한 종의 구간별 중앙값 밴드(2구간 이상인 종만)
           ⓑ **폭을 고정하고 종만** — 한 구간의 종별 중앙값 밴드
         ⓐ 가 [B13] 보다 뚜렷이 낮으면 남은 밴드의 임자는 폭이 아니라 **구간의 종 구성**이다. */
      /* ⚑ 7회차 — ⓐ 는 이제 진단이 아니라 **판정 [B14]** 다(아래). 여기서는 그 값을 나란히
         찍기만 하고, 재는 것은 판정과 **같은 함수**(`b14bands`)다 — 사본을 만들지 않는다. */
      const sp14 = b14bands(r.out, strokeIds, 2);
      /* ⚑⚑ 927 — **[B14] 가 실제로 재는 것**: 종이 아니라 «종 × 마루 기울기 칸» 을 고정한 폭 축.
         10회차 교차표가 `arrow` 의 두 구간이 **서로 다른 기울기 칸에 통째로** 앉아 겹치는 칸이
         하나도 없음을 찍었다 — 곧 옛 최악값 1.17 은 «폭이 3px 늘 때 비가 얼마나 변하는가» 를
         **잴 수 없는** 수였다. 상대 축을 고정하면 그 자리는 비고, 남는 것이 폭 축의 실측이다. */
      const B14OPT = { byAng: true, n: B14_N };
      const sp14a = b14bands(r.out, strokeIds, 2, B14OPT);
      /* ⚑⚑ 927 — **새 축의 잡음 바닥**(8회차 교훈 5: 바닥 없는 축에는 래칫을 걸 자리가 없다).
         같은 종·같은 구간·**같은 기울기 칸**의 표본을 짝/홀로 반씩 갈라 두 중앙값의 비를 본다 —
         세 축이 다 고정이니 규격이 시키는 차는 0 이고, 남는 것은 순수한 표본 흔들림이다. */
      const b14floor = (() => {
        const nz = [];
        for (const b of b13bands(r.out, strokeIds, 2, B14OPT)) for (const e of b.by) {
          if (e[1] < B14_N || !(e[3] > 0) || !(e[4] > 0)) continue;
          nz.push(Math.max(e[3], e[4]) / Math.min(e[3], e[4]));
        }
        nz.sort((a, b) => a - b);
        return nz.length ? { n: nz.length, md: nz[Math.floor(0.5 * (nz.length - 1))], mx: nz[nz.length - 1] } : null;
      })();
      {
        console.log('  [진단·927] 판정이 쓰는 묶음 «종 × 기울기 칸» — ' +
          (sp14a.length ? sp14a.map(e => e.sp + ' ' + e.band.toFixed(3) + '배(' + e.bins + '구간)').join(' · ')
                        : '두 구간을 채우는 칸 없음') +
          '\n    ⚠ 옛 묶음의 최악 `arrow` 는 두 구간이 **서로 다른 기울기 칸에 통째로** 앉아 겹치는 칸이 0 이다' +
          ' — 그 1.17 은 폭 축을 잰 값이 아니다(10회차 교차표).' +
          (b14floor ? '\n    새 축의 잡음 바닥(같은 종·구간·기울기 칸을 짝/홀로 반) — ' + b14floor.n +
                      '칸 · 중앙 ' + b14floor.md.toFixed(3) + ' · 최악 ' + b14floor.mx.toFixed(3) +
                      '  ⇒ [B14] 의 ' + (sp14a.length ? sp14a[0].band.toFixed(3) : '—') + ' 는 바닥 위다'
                    : ''));
      }
      {
        const spBands = sp14.map(e => [e.sp, e.band, e.bins]);
        const binBands = bandRows.map(b => {
          const v = b.by.filter(e => e[1] >= B13_N).map(e => e[2]);
          return v.length >= 2 ? [b.lo, Math.max.apply(null, v) / Math.min.apply(null, v), v.length] : null;
        }).filter(Boolean).sort((a, b) => b[1] - a[1]);
        /* ⚑ 927 — 이 ⓐ 는 **더 이상 판정이 아니다**(판정은 «종 × 기울기 칸» 으로 옮겼다).
           자리를 비우지 않고 진단으로 남긴다 — 두 묶음의 차가 곧 927 이 고친 몫이기 때문이다. */
        if (spBands.length) console.log('  [진단·927] ⓐ 종«만» 고정하고 폭 — ' +
          spBands.map(e => e[0] + ' ' + e[1].toFixed(2) + '배(' + e[2] + '구간)').join(' · ') +
          '  ⇒ 최악 ' + spBands[0][1].toFixed(2) + '배 (기울기가 안 고정된 옛 값 · 판정 아님)');
        if (binBands.length) console.log('  [진단·889 5회차] ⓑ 폭을 고정하고 종만 — ' +
          binBands.map(e => '획' + e[0] + '~ ' + e[1].toFixed(2) + '배(' + e[2] + '종)').join(' · ') +
          '  ⇒ 최악 ' + binBands[0][1].toFixed(2) + '배');
      }
      /* ⚑ 889 8회차 진단(판정 밖) — **[B14] 의 잔차가 «절대» 인가.**
         `probe889b` [Q1] 이 축에 나란한 세 종(arrow·gale·lance)에서 «굳은폭 − 기하폭 = 무근 몫
         = 정확히 1.00화소» 를 쟀다. 그 모형이 참이면 한 종의 구간별 비는
             비(W) = K + c/W        (c = 폭에 무관한 절대 과잉 · 로컬px)
         꼴이어야 하고, 두 구간이면 c 가 **닫힌 꼴로** 나온다:
             c = (r1 − r2) ÷ (1/W1 − 1/W2)
         ⇒ 종마다 c 를 뽑아 나란히 찍는다. c 가 종을 건너 한 값(≈1.0)이면 [B14] 의 임자는
           **하나**이고 처방도 하나다(9회차). 종마다 다르면 «절대 과잉» 모형 자체가 기각이다.
         ⚠ 판정은 위 [B14] 그대로다 — 이 줄은 아무것도 무르게 하지 않는다(출력 전용). */
      {
        const bySp = {};
        for (const b of bandRows) for (const e of b.by) {
          if (e[1] < B13_N) continue;
          (bySp[e[0]] = bySp[e[0]] || []).push([(b.lo + b.hi) / 2, e[2]]);
        }
        const cs = [];
        for (const k of Object.keys(bySp)) {
          const v = bySp[k].slice().sort((a, b) => a[0] - b[0]);
          if (v.length < 2) continue;
          const est = [];
          for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) {
            const dx = 1 / v[a][0] - 1 / v[b][0];
            if (Math.abs(dx) > 1e-9) est.push((v[a][1] - v[b][1]) / dx);
          }
          const c = est.reduce((s, x) => s + x, 0) / est.length;
          /* 같은 c 로 규격 K 를 되풀면 «그 종의 바닥 비» 가 나온다 — c 를 뺀 뒤 남는 상수항 */
          const k0 = v.reduce((s, e) => s + (e[1] - c / e[0]), 0) / v.length;
          cs.push([k, c, k0, v.length, v.map(e => e[0] + '→' + e[1].toFixed(3)).join(' ')]);
        }
        cs.sort((a, b) => b[1] - a[1]);
        if (cs.length) {
          console.log('  [진단·889 8회차] 절대 과잉 모형 «비 = K + c/W» — 종마다 c(로컬px)와 상수항');
          for (const e of cs)
            console.log('    ' + e[0].padEnd(9) + ' c = ' + e[1].toFixed(3) + 'px  상수항 ' + e[2].toFixed(3) +
                        '  (' + e[3] + '구간 · ' + e[4] + ')');
          const cv = cs.map(e => e[1]);
          console.log('    ⇒ c 의 폭 ' + Math.min.apply(null, cv).toFixed(2) + '~' + Math.max.apply(null, cv).toFixed(2) +
                      'px · 상수항의 폭 ' + Math.min.apply(null, cs.map(e => e[2])).toFixed(3) + '~' +
                      Math.max.apply(null, cs.map(e => e[2])).toFixed(3) +
                      '  (`probe889b` [Q1] 의 무근 한 겹 = 1.00px · 규격 K = ' + (r.out.K || '?') + ')');
        }
        /* ⚑ 두 구간뿐인 종에서 위 c 는 «두 점을 지나는 값» 이라 **모형의 시험이 아니다**
           (모형을 기각하는 것은 종 사이의 불일치다). 곡선의 **모양**을 보려면 눈금이 더
           촘촘해야 한다 ⇒ 같은 표본을 1.5px 눈금·문턱 12 로 다시 묶어 종별 옆모습을 찍는다.
           ⚠ 판정([B13]·[B14])은 위에서 이미 기본 눈금으로 끝났다 — 이 줄은 출력 전용이다. */
        const fine = b13bands(r.out, strokeIds, 2, { w: 1.5, n: 12 });
        const bySpF = {};
        for (const b of fine) for (const e of b.by) {
          if (e[1] < 12) continue;
          (bySpF[e[0]] = bySpF[e[0]] || []).push([(b.lo + b.hi) / 2, e[2], e[1]]);
        }
        const keys = Object.keys(bySpF).filter(k => bySpF[k].length >= 3);
        if (keys.length) {
          console.log('  [진단·889 8회차] 촘촘한 눈금(1.5px · 문턱 12) — 종별 «획 폭 → 비» 옆모습');
          for (const k of keys) {
            const v = bySpF[k].slice().sort((a, b) => a[0] - b[0]);
            console.log('    ' + k.padEnd(9) + v.map(e => e[0].toFixed(1) + '→' + e[1].toFixed(3) + '(n' + e[2] + ')').join(' · '));
          }
        }
        /* ⚑⚑ 889 8회차 — **[B14] 의 잡음 바닥**. 같은 종·**같은 구간**의 표본을 짝/홀로 반씩
           갈라 두 중앙값의 비를 본다. 폭도 종도 같으므로 규격이 시키는 차는 **0** 이고,
           여기 남는 것은 순수한 표본 흔들림이다. [B14] 의 1.16 이 이 바닥과 같은 크기면
           그 축은 «아직 못 재고 있는 것» 이지 «제품이 어긋난 것» 이 아니다. */
        {
          const nz = [];
          for (const b of bandRows) for (const e of b.by) {
            if (e[1] < B13_N || !(e[3] > 0) || !(e[4] > 0)) continue;
            nz.push([e[0], b.lo, Math.max(e[3], e[4]) / Math.min(e[3], e[4])]);
          }
          nz.sort((a, b) => b[2] - a[2]);
          if (nz.length) console.log('  [진단·889 8회차] 잡음 바닥(같은 종·같은 구간을 짝/홀로 반) — ' +
            nz.slice(0, 6).map(e => e[0] + '획' + e[1] + '~ ' + e[2].toFixed(3)).join(' · ') +
            '  ⇒ 최악 ' + nz[0][2].toFixed(3) + '배 · 중앙 ' +
            nz.map(e => e[2]).sort((a, b) => a - b)[Math.floor(0.5 * (nz.length - 1))].toFixed(3) +
            '  (같은 표본을 [B14] 는 ' + (sp14.length ? sp14[0].band.toFixed(3) : '—') + '배로 읽는다)');
        }
      }
      /* ⚑⚑ 10회차 — 규격을 **직접** 묻는 줄. 규격은 «코어 = K·획» 이므로 종별 직선의 기울기가
         곧 실현된 K 다. 9회차가 [B14] 의 정체를 이 둘(기울기·절편)로 갈랐으므로 여기서부터는
         «비 가 한 밴드인가» 대신 «기울기가 K 인가» 를 읽으면 된다.
         ⚠ 아직 **판정이 아니라 진단**이다 — 기울기의 **잡음 바닥을 안 쟀다**(8회차 교훈 5:
           바닥 없는 축은 래칫을 걸 자리를 못 정한다). 바닥을 잰 회차가 이 줄을 판정으로 올려라. */
      {
        const sl = coreSlope(r.out, strokeIds);
        if (sl.length) console.log('  [진단·889 10회차] 규격 직접 — 종별 «코어 = a·획 + c» 의 a (규격 K = ' +
          K + ')\n    ' + sl.map(e => e.sp + ' a=' + e.a.toFixed(3) + ' c=' + e.c.toFixed(2) +
          '(' + e.bins + '구간)').join(' · ') +
          '\n    ⇒ a 의 폭 ' + sl[0].a.toFixed(3) + ' ~ ' + sl[sl.length - 1].a.toFixed(3) +
          ' · 중앙 ' + sl.map(e => e.a).sort((a, b) => a - b)[Math.floor(0.5 * (sl.length - 1))].toFixed(3));
      }
      const spr = (r.out.sprites || []).slice().sort((a, b) => a[1] - b[1]);
      console.log('  [진단] 구운 스프라이트 자체의 코어 폭(로컬px · 합성/근백색 문턱 이전)');
      console.log('    ' + spr.map(e => e[0] + ' ' + e[1]).join(' · '));
      console.log('');
      ok(bandRows.length >= 3 && b13mn > 0 && b13mx / b13mn <= BAND13,
         '[B13] 획 폭 구간별 비의 중앙값이 한 밴드 — ' + bandRows.length + '구간 · 최대 ' +
         b13mx.toFixed(3) + ' ÷ 최소 ' + b13mn.toFixed(3) + ' = ' +
         (b13mn > 0 ? (b13mx / b13mn).toFixed(2) : '∞') + '배 ≤ ' + BAND13 +
         ' (8회차 실측 = 바닥 4.0px 이 세 구간을 덮어썼다)');

      /* ⚑⚑ 889 7회차 신설 [B14] — **폭 축만**(종 고정). 위 [B13] 은 한 글자도 안 건드렸다.
         6회차가 [B13] 1.33 = 폭 축 1.17 × 종 축 1.19 로 분해했고 종 축은 [B10b] 의 몫이다 ⇒
         «비는 획 폭에 무관» 이라는 규격 문장의 **폭 쪽만** 혼자 재는 항을 하나 더 세운다.
         ⚑ 7회차가 이 항을 세울 수 있게 된 근거: `tools/probe889d.js` 가 규격을 정확히 지키는
           합성 띠를 **이 자·이 묶음**으로 재서 여섯 구간 전부 K = 0.350(밴드 1.000 · 잔차 0.0000)
           을 받았다. 곧 여기 남는 1.17 은 **자의 바닥이 아니라 제품의 몫**이다 —
           그것이 확인되기 전에는 이 축에 래칫을 걸 수 없었다(자의 몫이면 문턱이 자를 굳힌다). */
      /* ⚑⚑ 927 **이관**(333 처방 — 자리를 비우지 않고 묶는 축만 넓힌다). 이 항의 이름은 내내
         «폭 축만» 이었는데 **종을 고정해도 마루 기울기가 안 고정됐다** — 10회차 교차표가
         `arrow` 의 두 구간(획 9~12 · 획 12~15)이 각각 30~45° · 0~15° 에 **통째로** 앉아
         겹치는 칸이 하나도 없음을 찍었다. 곧 그 1.17 은 «폭이 3px 늘 때 비가 얼마나 변하는가»
         를 **잴 수 없는** 수였다(이름과 재는 것이 달랐다 — 927 의 결손이 이것이다).
         ⇒ 묶는 축을 «종» 에서 **«종 × 마루 기울기 칸»** 으로 넓혀 상대 축을 고정한다.
         ⚠ **무르게 하는 이관이 아니다** — 최악값은 `arrow` 1.174 → `gale` **1.167** 로
           수는 거의 그대로인데 **뜻이 생겼고**(교란 없는 폭 축), 래칫 1.25 는 한 글자도 안 건드렸다.
           그리고 이 수는 새 축의 잡음 바닥(최악 1.062)보다 **위**라 자의 흔들림이 아니다. */
      {
        const worst = sp14a.length ? sp14a[0] : null;
        ok(sp14a.length >= 2 && worst && worst.band <= BAND14,
           '[B14] **폭 축만** — «종 × 마루 기울기 칸» 을 고정하면 구간별 비가 한 밴드 · ' +
           sp14a.length + '칸 · 최악 ' +
           (worst ? worst.sp + ' ' + worst.band.toFixed(3) + '배(' + worst.bins + '구간 · ' +
            worst.mn.toFixed(3) + '~' + worst.mx.toFixed(3) + ')' : '—') +
           ' ≤ ' + BAND14 + ' (칸당 표본 ' + B14_N + ' · 자의 바닥 ' +
           (b14floor ? b14floor.mx.toFixed(3) : '—') + ' · 합성 띠에서는 1.000 — `probe889d` [D1])');
      }
      /* ⚑⚑ 927 신설 [B15] — **[B14] 의 이름이 재는 것과 같은가**를 묻는 항. 927 의 결손은
         «값이 크다» 가 아니라 ««폭 축만» 이라고 적힌 항이 폭과 기울기를 같이 읽었다» 였으므로,
         고친 뒤에는 **견주는 칸들의 기울기가 정말 하나인지**를 자가 직접 물어야 한다.
         ⚠ 이 항이 곧 927 의 되돌림 시험이다 — 묶음을 «종만» 으로 되돌리면 `arrow` 의 두 구간이
           서로 다른 기울기 칸에 앉으므로 `angs` 가 2 가 되어 **곧바로 빨개진다**(아래 [R7] 이
           그 되돌린 사본을 실제로 돌려 못박는다). 문턱을 낮춰 칸을 늘리는 길로도 못 빠져나간다 —
           칸이 늘어도 기울기가 섞이면 이 항은 그대로 빨갛다. */
      {
        const bad = sp14a.filter(e => e.angs !== 1);
        ok(sp14a.length >= 2 && bad.length === 0,
           '[B15] [B14] 가 견주는 칸은 **기울기가 하나**다 — ' + sp14a.length + '칸 · 섞인 칸 ' +
           bad.length + (bad.length ? '(' + bad.map(e => e.sp + ' 기울기 ' + e.angs + '칸').join(' · ') + ')' : '') +
           ' (옛 «종만» 묶음에서는 arrow 가 2칸에 걸친다 — 그 1.17 이 폭 축이 아니었던 이유)');
        /* ⚑⚑ 927 신설 [R7] — **묶음을 되돌리면 [B15] 가 빨개진다.** 위 [B15] 는 지금 묶음이
           깨끗하다는 것만 말하므로, 그것이 «묶음 덕분» 인지 «어차피 섞일 일이 없어서» 인지는
           되돌려 봐야 갈린다. **같은 제품·같은 표본**을 옛 묶음(`byAng` 없음)으로 재서 기울기가
           섞인 칸이 실제로 나오는지 본다 — 판정과 같은 함수를 부르므로 사본이 아니다(402). */
        const mixed = b14bands(r.out, strokeIds, 2).filter(e => e.angs !== 1);
        ok(mixed.length >= 1,
           '[R7] 묶음을 «종만» 으로 되돌리면 [B15] 가 빨개진다 — 기울기가 섞인 칸 ' + mixed.length +
           (mixed.length ? '칸(' + mixed.map(e => e.sp + ' ' + e.angs + '칸 · 밴드 ' +
             e.band.toFixed(3)).join(' · ') + ')' : '칸') + ' ≥ 1');
      }

      /* ⚑⚑ 8회차 **이관**(333 처방) — 이 항은 «덩어리에서는 **상한이** 폭을 정한다» 를 전제로
         «폭 자체가 한 밴드» 를 물었다. 그 전제는 **반쪽폭을 넓게 읽던 자** 위에서만 참이었다 —
         닿는 데까지 본 가장 굵은 곳이 곧 그 자리의 굵기였으므로 덩어리는 **어디서나** 상한에
         걸렸다. 8회차가 «획의 폭» 을 **국소**로 읽게 하자(자격 조건 `D(q) ≥ dist(p,q) + d(p)`)
         길쭉한 덩어리(`rico`·`meteor`·`flask`)의 **가늘어지는 자리**는 상한이 아니라 그 자리
         획 폭의 K 가 정하게 됐고 — 그것이 비평가들이 «본체를 안 따라간다» 로 지적한 바로 그
         성질이다 — 종을 한 수로 요약한 «폭» 은 더 이상 한 값이 아니다.
         ⚠ 무르게 푼 것이 아니라 **더 센 축으로 옮긴 것**이다. 새 축(«본체 대비 비» 가 한 밴드)을
           **수리 전 제품**에 대면 rico .329 ÷ meteor .19 = **1.73배로 빨갛다**(8회차 착수 실측).
           지금은 1.1배다. 즉 옛 항이 초록이던 자리에서 새 항은 빨갛고, 그 반대가 아니다.
         규격 문장 자체(«코어는 덩어리의 채움이 아니다» = 상한을 넘지 않는다)는 [B10d] 가 따로 못박는다. */
      const brs = blobIds.map(i => r.out.rows[i].ratio);
      const bmx = brs.length ? Math.max.apply(null, brs) : 0, bmn = brs.length ? Math.min.apply(null, brs) : 0;
      /* ⚑ 이관(2026-09-06, 981 2회차) — 머릿수 기대를 **3 → 2** 로 내렸다. 무리를 가르는 것은
         위에 적힌 대로 **제품의 규칙**(`K·본체폭 ≥ 0.8·상한`)이라 «몇 종이 덩어리인가» 는
         실루엣을 고치는 회차마다 바뀐다 — 981 2회차가 `flask`(화염병) 목을 늘리며 본체 폭을
         ±11 → ±10.5 로 줄이자 그 종이 규칙상 **획 무리로 옮겨 갔다**(덩어리 3 → 2).
         ⚠ 축이 빠진 것이 아니다 — 옮겨 간 종은 그 자리에서 **획 무리의 비율 밴드**([B10a])가
           그대로 재고, 이 항은 남은 둘(boom·bounce)의 «본체 대비 비» 를 계속 견준다(실측 1.02배).
           머릿수를 못박으면 실루엣이 갈릴 때마다 자가 «수리가 풀렸다» 고 거짓말한다(348).
           ⚠ 1종 이하로 내려가면 이 항은 **공허해진다** — 그때는 무르게 풀지 말고 축을 다시 세워라. */
      ok(blobIds.length >= 2 && bmn > 0 && bmx / bmn <= BAND_W,
         '[B10c] 덩어리 무리 ' + blobIds.length + '종은 **본체 대비 비**가 한 밴드 — 최대 ' + bmx.toFixed(3) +
         ' ÷ 최소 ' + bmn.toFixed(3) + ' = ' + (bmn > 0 ? (bmx / bmn).toFixed(2) : '∞') + '배 ≤ ' + BAND_W +
         ' (수리 전 1.73배 · ' + blobIds.join(' · ') + ')');
      /* [B10d] 규격 문장 그대로 — «넘으면 반짝임이 채움이 된다». 상한은 제품의 상수에서 온다(사본 금지). */
      const ws = blobIds.map(i => r.out.rows[i].wc);
      const wmx = ws.length ? Math.max.apply(null, ws) : 0, wmn = ws.length ? Math.min.apply(null, ws) : 0;
      /* ⚑ 이관(2026-09-06, 981 2회차) — 머릿수 3 → 2. 근거는 바로 위 [B10c] 주석과 **같은 것**이다
         (무리를 가르는 것은 제품의 규칙이고, 981 이 실루엣을 갈라 `flask` 가 획 무리로 옮겨 갔다).
         재는 값(코어 폭 ≤ 상한 +5%)은 한 글자도 안 바꿨다. */
      ok(blobIds.length >= 2 && wmn > 0 && capW > 0 && wmx <= capW * 1.05,
         '[B10d] 어느 덩어리도 코어 폭이 **상한 폭**을 넘지 않는다 — 최대 ' + wmx.toFixed(2) +
         ' ≤ ' + (capW * 1.05).toFixed(2) + ' (상한 ' + capW.toFixed(2) + ' +5% · 최소 ' + wmn.toFixed(2) + ')');

      /* ⚑ [B12] 는 **래칫**이다(356 [B] 선례). 2회차 CZ 1순위(«한 종 안에서 9% ↔ 67%»)를 재는 축을
         3회차에 세웠고, 3회차의 처방(창을 정사각에서 **원에 내접**하는 상자로)이 9종 → 3종으로
         줄였다. 목표는 여전히 ' + SPREAD + ' 이고 지금은 거기 못 닿는다 — 그래서 **지금 값보다
         나빠지면 빨강**으로 걸어 두고 다음 회차가 조인다. 목표에 닿기 전에 이 수를 올리지 마라. */
      /* ⚑⚑ 889 **이관**(333 처방 — 자리를 비우지 않고 자만 바꾼다). 이 항이 읽던 «코어 두께» 는
         `dc` = **이진 근백색 마스크**의 거리였다. 제품이 코어 가장자리를 부분 알파로 바꾼 뒤
         (889 ②) 그 자는 고원의 **안쪽**을 재게 되어 코어가 실제로는 그대로인데 «얇아졌다» 로
         읽는다 — 9회차 E6 이 [B12] 를 1.68 → 1.76 으로 깨고 물러난 것이 정확히 이 얼굴이다
         (10회차 마감이 «자를 먼저 바꾸라» 고 못박은 자리). ⇒ 같은 표본·같은 자리를 «덮인 몫» 으로
         읽는다(`bank` 의 뒤 두 칸 · 자는 `tools/lib889.js` 한 곳).
         ⚠ **무르게 푼 것이 아니다** — 새 자는 참값을 아는 띠에서 오차 0.000px 이고 옛 자는 최악
           1.00px 이다(`probe889` [P1]·[P2]). 게다가 이 이관은 래칫을 **한 칸도 안 올린다**
           (1.7 그대로 · 이 회차 실측 1.51 로 목표 1.5 에 붙었다). */
      const sp = strokeIds.map(i => (r.out.rows[i].spreadC || r.out.rows[i].spread).sp);
      const spMx = sp.length ? Math.max.apply(null, sp) : 99;
      const over = strokeIds.filter(i => (r.out.rows[i].spreadC || r.out.rows[i].spread).sp > SPREAD);
      ok(spMx <= RATCHET,
         '[B12] 획 무리 종내 흩어짐 «코어÷본체»(덮인 몫) p90÷p50 최대 ' + spMx.toFixed(2) + ' ≤ 래칫 ' + RATCHET +
         ' (목표 ' + SPREAD + ' · 아직 못 닿은 종 ' + over.length + ': ' +
         over.map(i => i + ' ' + (r.out.rows[i].spreadC || r.out.rows[i].spread).sp).join(' · ') +
         ' · 옛 이진 자로는 ' + Math.max.apply(null, strokeIds.map(i => r.out.rows[i].spread.sp)).toFixed(2) + ')');
      /* ⚑ 889 이관 — 여기서 «코어가 있는가» 를 묻는 마스크도 [B12] 와 같은 이유로 «흰 층의 몫이
         절반» 이다(옛 이진 문턱은 부분 알파 앞에서 고원 안쪽만 코어로 센다 — flask 0.833 → 0.717).
         자리·가중·문턱(0.75)은 한 글자도 안 건드렸다. 옛 자의 값도 같이 찍어 둔다. */
      const thin = ids.filter(i => r.out.rows[i].cover < COVER);
      ok(thin.length === 0,
         '[B11] ③층이 **본체 마루를 따라간다** — 덮임 ' + COVER + ' 미만 ' + thin.length + '종' +
         (thin.length ? ' (' + thin.map(i => i + ' ' + r.out.rows[i].cover).join(' · ') + ')' : '') +
         ' (수리 전 arrow 축 0px · boomer 팔 0px · spiral 리본 0px · 옛 이진 자 최저 ' +
         Math.min.apply(null, ids.map(i => r.out.rows[i].coverBin)).toFixed(3) + ')');
    }

    /* ---- [R] 되돌림 시험 ---- */
    fs.writeFileSync(NEG_SPEC, killLine(src, TAG_SPEC, `const SPEC_ON   = 0;`), 'utf8');
    const rn = await measure(browser, 'file://' + NEG_SPEC);
    if (rn.out && rn.out.__err) ok(false, '[R1] 사본 측정 예외 — ' + rn.out.__err);
    else {
      const ids = Object.keys(rn.out.rows);
      const rs = ids.map(i => rn.out.rows[i].ratio).filter(v => v > 0);
      const mx = rs.length ? Math.max.apply(null, rs) : 0;
      const mn = rs.length ? Math.min.apply(null, rs) : 0;
      const bad = ids.filter(i => rn.out.rows[i].ratio < R_MIN || rn.out.rows[i].ratio > R_MAX);
      const noMain = ids.filter(i => rn.out.rows[i].cover < COVER);
      /* ⚑ 9회차 진단(판정 밖) — **같은 [B13] 자를 되돌림 사본에 댄다.** 9회차가 «바닥» 의 정체를
         찾으며 K·페이드·minR 를 차례로 흔들어도 가는 구간이 **한 값도** 안 움직였기 때문에,
         그 구간의 «근백색» 이 정말 ③층인지 아니면 **본체가 원래 희어서** 세지는 것인지를
         이 대조가 가른다(코어를 끄면 우리 층은 0 이다). */
      {
        const cW0 = rn.out.capW || 0, cK0 = rn.out.K || 0;
        const sIds = ids.filter(i => !(cW0 > 0 && cK0 * rn.out.rows[i].wb >= 0.8 * cW0));
        const nb = b13bands(rn.out, sIds);
        console.log('  [진단] 코어를 끈 사본 — 종별 «근백색»(0 이 정상 · 0 이 아니면 그 종의 본체가 원래 희다)');
        for (const i of ids) {
          const q = rn.out.rows[i];
          if (!q.nc) continue;
          console.log('    ' + (q.sh + ' (' + i + ')').padEnd(20) + '본체폭 ' + String(q.wb).padStart(6) +
                      '  근백색 폭 ' + String(q.wc).padStart(6) + '  비 ' + String(q.ratio).padStart(6) +
                      '  화소 ' + q.nc + '/' + q.nb);
        }
        console.log('  [진단] 코어를 끈 사본의 같은 구간 — 여기 남는 «근백색» 은 ③층이 아니라 본체다');
        for (const b of nb)
          console.log('    획 ' + String(b.lo).padStart(2) + '~' + String(b.hi).padEnd(3) +
                      ' n=' + String(b.n).padStart(4) + '  비 중앙 ' + b.md.toFixed(3) +
                      '  ⇒ 코어 ' + b.core.toFixed(2) + 'px');
        console.log('');
      }
      ok((rn.out.baked || []).length === 0,
         '[R1] 코어를 끄면 굽지 않는다 — 구운 종 ' + (rn.out.baked || []).length + '종(0)');
      /* ⚑ 9회차 — **[B13] 의 되돌림 시험**(누른 항을 묻는 항을 한 줄 더 넣는다 — 328~330 교훈).
         새 축을 세우면서 그 축이 «무엇을 켜도 초록» 이 아님을 같이 못박는다: 종별 손그림
         하이라이트에서는 구간별 중앙값이 **한 밴드일 이유가 없고**, 실제로 가는 구간 하나만
         값을 갖고 나머지는 0 이다(= 그 구간들의 마루에 층이 아예 없다) ⇒ 밴드가 ∞ 다. */
      {
        const cW1 = rn.out.capW || 0, cK1 = rn.out.K || 0;
        const sI = ids.filter(i => !(cW1 > 0 && cK1 * rn.out.rows[i].wb >= 0.8 * cW1));
        const nb2 = b13bands(rn.out, sI, 2);   /* 889 — [B13] 이 쓰는 자와 **같은 자**라야 되돌림이 성립한다 */
        const ms = nb2.map(b => b.md);
        const x2 = ms.length ? Math.max.apply(null, ms) : 0;
        const n2 = ms.length ? Math.min.apply(null, ms) : 0;
        ok(nb2.length >= 3 && !(n2 > 0 && x2 / n2 <= BAND13),
           '[R5] 코어를 끄면 [B13](획 폭 구간별 밴드)이 빨개진다 — ' + nb2.length + '구간 · 밴드 ' +
           (n2 > 0 ? (x2 / n2).toFixed(2) : '∞') + ' > ' + BAND13 +
           ' (값이 0 인 구간 ' + ms.filter(v => v <= 0).length + ')');
        /* ⚑ 7회차 — **[B14] 의 되돌림 시험**(누른 항을 묻는 항을 한 줄 더 넣는다 — 328~330 교훈).
           새 축을 세우면서 그 축이 «무엇을 켜도 초록» 이 아님을 같이 못박는다. 종별 손그림
           하이라이트에서는 한 종의 구간별 중앙값이 한 밴드일 이유가 없다 — 구간 하나만 값을
           갖고 나머지는 0 이라 밴드가 ∞ 거나, 애초에 «2구간 이상인 종» 이 둘이 안 된다.
           ⚠ 판정과 **같은 함수**(`b14bands`)를 부른다 — 사본을 만들면 되돌림이 성립하지 않는다. */
        /* ⚑ 927 — 판정과 **같은 묶음·같은 문턱**(`B14OPT` 과 같은 값)을 쓴다. 사본을 만들거나
           옛 묶음으로 되돌리면 되돌림 시험이 판정이 아닌 것을 시험하게 된다(402). */
        const nb14 = b14bands(rn.out, sI, 2, { byAng: true, n: B14_N });
        const w14 = nb14.length ? nb14[0].band : Infinity;
        ok(!(nb14.length >= 2 && w14 <= BAND14),
           '[R6] 코어를 끄면 [B14](«종 × 기울기 칸» 폭 축)가 빨개진다 — 2구간 이상인 칸 ' + nb14.length +
           '칸 · 최악 밴드 ' +
           (isFinite(w14) ? w14.toFixed(2) : '∞') + ' (초록이려면 2칸 이상 · ' + BAND14 + ' 이하여야 한다)');
      }
      ok(bad.length >= 4 || (mn > 0 && mx / mn > BAND),
         '[R2] 코어를 끄면 [B10] 이 빨개진다 — 목표대 밖 ' + bad.length + '종 · 밴드 ' +
         (mn > 0 ? (mx / mn).toFixed(2) : '∞') + '배');
      /* 8회차 — [B10c] 를 «본체 대비 비» 로 옮겼으니 **그 축의 되돌림 시험**도 같이 세운다
         (누른 항을 묻는 항을 한 줄 더 넣는다 — 328~330 교훈). 종별 손그림에서는 이 비가
         한 밴드일 이유가 없다. */
      const cW = rn.out.capW || 0, cK = rn.out.K || 0;
      const bR = ids.filter(i => cW > 0 && cK * rn.out.rows[i].wb >= 0.8 * cW)
                    .map(i => rn.out.rows[i].ratio).filter(v => v > 0);
      const bx2 = bR.length ? Math.max.apply(null, bR) : 0, bn2 = bR.length ? Math.min.apply(null, bR) : 0;
      ok(bR.length < 3 || bn2 <= 0 || bx2 / bn2 > BAND_W,
         '[R4] 코어를 끄면 [B10c](덩어리 «본체 대비 비» 밴드)가 빨개진다 — ' +
         (bn2 > 0 ? (bx2 / bn2).toFixed(2) : '∞') + '배 > ' + BAND_W);
      ok(noMain.length >= 8,
         '[R3] 코어를 끄면 [B11] 이 빨개진다 — 마루 덮임이 ' + COVER + ' 미만인 종 ' + noMain.length + '종 ≥ 8');
    }
  } finally {
    clean();
    await browser.close();
  }

  console.log('\nVERIFY856 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
