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
const RATCHET = 1.7;  /* 래칫(356 [B] 선례) — 8회차 실측 최악 1.68(stone · 3회차 2.21 · `ice` 2.00 → 1.14). 목표에 닿기 전에 올리지 마라 */   /* 한 종 안 «코어÷본체» p90÷p10 — 2회차 CZ 가 ice 에서 7.4배를 쟀다 */
const COVER = 0.75;   /* 본체 마루 중 ③층이 덮은 몫 — «축에만 코어가 없다» 가 여기서 잡힌다 */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

/* [B13] 이 묶는 자리 — 획 폭 구간(로컬px). 되돌림 시험도 **같은 함수**로 묶는다(사본 금지 — 402). */
const B13_LO = 6, B13_HI = 24, B13_W = 3;
const B13_N  = 25;      /* 구간을 세려면 표본 이만큼 — 화소 몇 개짜리 구간은 안 센다 */
/* `col` — 0 이면 옛 이진 자의 두 칸(획폭·비), 2 면 889 의 «덮인 몫» 두 칸이다(같은 표본·같은 자리). */
const b13bands = (out, useIds, col) => {
  col = col || 0;
  const rowsOut = [];
  for (let lo = B13_LO; lo < B13_HI; lo += B13_W) {
    const hi = lo + B13_W, acc = [];
    for (const i of useIds) for (const e of (out.rows[i].bank || [])) {
      const wS = e[col], ra = e[col + 1];
      if (wS >= lo && wS < hi) acc.push(ra);
    }
    if (acc.length < B13_N) continue;
    acc.sort((a, b) => a - b);
    const md = acc[Math.floor(0.5 * (acc.length - 1))];
    /* 구간마다 «누가 얼마나 넣었는가» — 한 종이 구간을 통째로 끌고 가는지 본다(진단 전용). */
    const by = [];
    for (const i of useIds) {
      const v = (out.rows[i].bank || []).filter(e => e[col] >= lo && e[col] < hi).map(e => e[col + 1]);
      if (!v.length) continue;
      v.sort((a, b) => a - b);
      by.push([i, v.length, v[Math.floor(0.5 * (v.length - 1))]]);
    }
    by.sort((a, b) => b[1] - a[1]);
    rowsOut.push({ lo, hi, n: acc.length, md, core: md * (lo + hi) / 2, by });
  }
  return rowsOut;
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
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, v = db[p];
        if (!body[p] || v < need) continue;
        if (v < db[p - 1] || v < db[p + 1] || v < db[p - w] || v < db[p + w]) continue;
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
          bank.push([+(2 * v / 5).toFixed(3), +(dc[p] / v).toFixed(4),
                     +(2 * bv / 5).toFixed(3), bv > 0 ? +(cvv / bv).toFixed(4) : 0]);
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
      const spr = (r.out.sprites || []).slice().sort((a, b) => a[1] - b[1]);
      console.log('  [진단] 구운 스프라이트 자체의 코어 폭(로컬px · 합성/근백색 문턱 이전)');
      console.log('    ' + spr.map(e => e[0] + ' ' + e[1]).join(' · '));
      console.log('');
      ok(bandRows.length >= 3 && b13mn > 0 && b13mx / b13mn <= BAND13,
         '[B13] 획 폭 구간별 비의 중앙값이 한 밴드 — ' + bandRows.length + '구간 · 최대 ' +
         b13mx.toFixed(3) + ' ÷ 최소 ' + b13mn.toFixed(3) + ' = ' +
         (b13mn > 0 ? (b13mx / b13mn).toFixed(2) : '∞') + '배 ≤ ' + BAND13 +
         ' (8회차 실측 = 바닥 4.0px 이 세 구간을 덮어썼다)');

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
      ok(blobIds.length >= 3 && bmn > 0 && bmx / bmn <= BAND_W,
         '[B10c] 덩어리 무리 ' + blobIds.length + '종은 **본체 대비 비**가 한 밴드 — 최대 ' + bmx.toFixed(3) +
         ' ÷ 최소 ' + bmn.toFixed(3) + ' = ' + (bmn > 0 ? (bmx / bmn).toFixed(2) : '∞') + '배 ≤ ' + BAND_W +
         ' (수리 전 1.73배 · ' + blobIds.join(' · ') + ')');
      /* [B10d] 규격 문장 그대로 — «넘으면 반짝임이 채움이 된다». 상한은 제품의 상수에서 온다(사본 금지). */
      const ws = blobIds.map(i => r.out.rows[i].wc);
      const wmx = ws.length ? Math.max.apply(null, ws) : 0, wmn = ws.length ? Math.min.apply(null, ws) : 0;
      ok(blobIds.length >= 3 && wmn > 0 && capW > 0 && wmx <= capW * 1.05,
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
