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
const COVER = 0.75;   /* 본체 마루 중 ③층이 덮은 몫 — «축에만 코어가 없다» 가 여기서 잡힌다 */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

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
    /* 실효 폭 W = 4·mean(D) — 폭 w 인 곧은 띠에서 mean(D) = w/4 라 W = w 다(주석이 본문). */
    const effW = (m, w, h) => {
      const d = cham(m, w, h);
      let s = 0, n = 0;
      for (let p = 0; p < d.length; p++) if (m[p]) { s += d[p] / 5; n++; }
      return n ? 4 * s / n : 0;
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
        if (al < A_BODY) continue;
        body[p] = 1; nb++;
        if (a0[i] >= 232 && a0[i + 1] >= 232 && a0[i + 2] >= 232) { core[p] = 1; nc++; }
      }
      /* ⚠ ③층은 본체의 부분집합이다 — «본체 밖 흰 화소» 를 세면 후광 위 잡음이 폭을 부풀린다. */
      const wb = nb ? effW(body, bw, bh) : 0;
      const wc = nc ? effW(core, bw, bh) : 0;
      const big = biggest(body, bw, bh);
      let inMain = 0;
      for (const p of big.cell) if (core[p]) inMain++;
      rows[id] = { sh: sp.sh || sp.k, nb, nc,
                   wb: +wb.toFixed(2), wc: +wc.toFixed(2),
                   ratio: wb > 0 ? +(wc / wb).toFixed(3) : 0,
                   main: big.n, mainSpec: inMain,
                   fMain: big.n ? +(inMain / big.n).toFixed(4) : 0,
                   cover: nb ? +ridgeCover(body, core, bw, bh).toFixed(3) : 0 };
      clearFx();
    }
    performance.now = _now;
    /* 코어를 구운 종을 **제품에게 묻는다**(자에 목록을 손으로 적으면 그것이 곧 사본이다 — 402) */
    const baked = (typeof SPEC_SPR !== 'undefined')
      ? Array.from(SPEC_SPR.entries()).filter(e => e[1]).map(e => String(e[0]).split('|')[0]) : [];
    /* 규격 상수는 **제품에게 묻는다** — 자에 손으로 적으면 그것이 곧 사본이다(402). */
    const K = typeof SPEC_K !== 'undefined' ? SPEC_K : 0;
    const capW = (typeof SPEC_MAXR !== 'undefined' ? SPEC_MAXR : 0) * 2 * HALO_SS;
    return { rows, baked, n: Object.keys(specs).length, K, capW };
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

      console.log('\n  종                 본체폭   코어폭   비     마루덮임');
      for (const id of ids) {
        const q = r.out.rows[id];
        console.log('  ' + (q.sh + ' (' + id + ')').padEnd(20) +
                    String(q.wb).padStart(7) + String(q.wc).padStart(9) +
                    String(q.ratio).padStart(7) + String(q.cover).padStart(9));
      }
      console.log('');

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
      const ws = blobIds.map(i => r.out.rows[i].wc);
      const wmx = ws.length ? Math.max.apply(null, ws) : 0, wmn = ws.length ? Math.min.apply(null, ws) : 0;
      ok(blobIds.length >= 3 && wmn > 0 && wmx / wmn <= BAND_W,
         '[B10c] 덩어리 무리 ' + blobIds.length + '종은 **폭**이 한 밴드 — 최대 ' + wmx.toFixed(2) +
         ' ÷ 최소 ' + wmn.toFixed(2) + ' = ' + (wmn > 0 ? (wmx / wmn).toFixed(2) : '∞') + '배 ≤ ' + BAND_W +
         ' (' + blobIds.join(' · ') + ')');

      const thin = ids.filter(i => r.out.rows[i].cover < COVER);
      ok(thin.length === 0,
         '[B11] ③층이 **본체 마루를 따라간다** — 덮임 ' + COVER + ' 미만 ' + thin.length + '종' +
         (thin.length ? ' (' + thin.map(i => i + ' ' + r.out.rows[i].cover).join(' · ') + ')' : '') +
         ' (수리 전 arrow 축 0px · boomer 팔 0px · spiral 리본 0px)');
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
      ok((rn.out.baked || []).length === 0,
         '[R1] 코어를 끄면 굽지 않는다 — 구운 종 ' + (rn.out.baked || []).length + '종(0)');
      ok(bad.length >= 4 || (mn > 0 && mx / mn > BAND),
         '[R2] 코어를 끄면 [B10] 이 빨개진다 — 목표대 밖 ' + bad.length + '종 · 밴드 ' +
         (mn > 0 ? (mx / mn).toFixed(2) : '∞') + '배');
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
