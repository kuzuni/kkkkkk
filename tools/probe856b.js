#!/usr/bin/env node
/* probe856b — 굽기 안의 `hhArr` 를 **종별로** 찍는다 (856 10회차 · 9회차 «다음 한 수» 그대로)
 *
 *   node tools/probe856b.js                  (표 + 판정 [P1]~[P4])
 *   node tools/probe856b.js --csv            (마루 화소 전수)
 *   node tools/probe856b.js --only gale      (한 종만)
 *   node tools/probe856b.js --minr 0.30      (상수 한 개만 흔들어 다시 재기 · --k · --maxr · --ss · --bias)
 *
 * 왜 이 자인가 — 9회차 마감이 남긴 «10회차가 반드시 볼 것» 2번이다.
 *   [B13] 이 찍은 바닥은 «가는 획 구간에서 코어÷획 = 0.500 이 상수» 다(규격 K = 0.35).
 *   9회차가 상수 다섯을 흔들어 지웠고(`SPEC_K` 양방향 · `SPEC_MINR` 하향 · 코어 페이드 ×0·단축 ·
 *   가장자리 부분 알파) 전부 그 구간을 한 값도 못 움직여, **남는 것은 `hh` 자신**이라고 적었다.
 *   ⇒ 제품을 고치기 전에 그 수를 찍는다(338 규칙 · 8회차 `--spread` 가 같은 꼴).
 *
 * ⚑ 10회차가 이 자로 찍은 답 — **`hh` 가 아니었다.**
 *   [P1] `hh` 는 마루에서 제 거리 그 자체다(중앙 hh/d = 1.000 · 최악 |hh−d| = 0.000, 17종 전부).
 *        7·8회차의 반화소 규약·자격 조건이 추정기를 이미 닫아 놨다.
 *   [P2] 그 위에서 **연속** 비는 이미 한 밴드다 — 비율 갈래 9종이 0.315~0.336(밴드 1.067).
 *        규격 K = 0.35 에 대한 부족분은 «코어 폭 = K·획폭 − K» 라는 **절대** 0.35화소뿐이다.
 *   [P3] 그런데 **굳은** 비는 0.333~0.500(밴드 1.286)이다 ⇒ 남은 밴드는 규격이 아니라 **화소**다.
 *   [P4] `gale` 은 마루의 83%가 **`minR` 갈래**라 `SPEC_K` 를 어느 쪽으로 흔들어도 안 움직인다
 *        (9회차 E1·E4 가 «불변» 을 본 이유). `--minr 0.30` 으로 비율 갈래에 올려도 연속폭만
 *        3.04 → 2.45 로 줄고 **켠 화소는 4.00 그대로**다 — 문턱이 설 눈금이 격자에 없다.
 *
 * 어떻게 — **제품의 `specSprite` 를 런타임에 복제해 덤프 한 덩이만 끼운다.**
 *   `specSprite.toString()` 을 받아 `if(!hit) throw` 바로 앞에 넣고 전역 간접 eval 로 다시 만들어
 *   `window.specSprite` 에 꽂는다. 제품 소스는 **0줄** 바뀌고, 사본은 매 실행 제품에서 뜨므로
 *   «자와 제품이 어긋나 조용해지는» 길이 없다(402 사본 금지).
 *   ⚠ 캐시(`SPEC_SPR`)를 비우고 다시 그려야 굽기가 한 번 더 돈다.
 *
 * 무엇을 찍는가 — 본체 **주 마루**(dist 가 4이웃 봉우리 · dist ≥ .35·dMax) 화소마다
 *   d       그 자리 거리(마루라서 **참** 반쪽폭이다)
 *   hh/hm   굽기가 돌려준 반쪽폭 추정 · 덩어리 크기(상한 갈래용)
 *   갈래    문턱 `t = max(hm−.5−maxR, min((1−K)·hT, hT−minR))` 셋 중 이긴 항
 *   기하폭  2(dT − t) — **연속값**
 *   굳은폭  `core[]` 가 실제로 켠 화소 수 — 양자화 **뒤**. 둘의 차가 곧 격자 몫이다
 * 단위는 **굽는화소 = 기기화소**다(`HALO_SS = SC · SK_DRAW_SC`).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const CSV = process.argv.includes('--csv');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? (process.argv[i + 1] || '') : ''; };
const ONLY = arg('--only');

/* 상수 한 개만 흔들어 다시 재는 사본 — 9회차 E1~E6 과 같은 방법이다(제품은 0줄).
   저장소 루트에 둔다(/tmp 면 상대 경로 assets/** 가 통째로 404 다 · 이름에 pid — 648). */
const OV = [['--minr', 'const SPEC_MINR = ', ';'], ['--k', 'const SPEC_K    = ', ';'],
            ['--ss', 'const HALO_SS   = ', ';'], ['--maxr', 'const SPEC_MAXR = ', ';']];
let USE = SRC, TMP = null, OVTXT = '';
{
  let src = null;
  for (const [flag, tag] of OV) {
    const v = arg(flag);
    if (!v) continue;
    if (src === null) src = fs.readFileSync(SRC, 'utf8');
    const re = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^;]*;');
    if (!re.test(src)) { console.error('상수 못 찾음: ' + tag); process.exit(1); }
    src = src.replace(re, tag + v + ';');
    OVTXT += ' · ' + flag.slice(2) + '=' + v;
  }
  /* `--bias <v>` — 문턱을 v 만큼 **올린다**(= 연속 코어를 2v 좁힌다). 화소로 굳을 때 생기는
     «켠 화소 수 ≈ 연속폭 + 0.5» 를 되돌리는 실험용 손잡이다(8회차 «반화소 규약» 과 같은 꼴). */
  {
    const v = arg('--bias');
    if (v) {
      if (src === null) src = fs.readFileSync(SRC, 'utf8');
      const tag = 'const t = Math.max(hm - 0.5 - maxR, Math.min((1 - SPEC_K) * hT, hT - minR));';
      if (src.indexOf(tag) < 0) { console.error('문턱 줄 못 찾음'); process.exit(1); }
      src = src.replace(tag, tag.replace(/;$/, '') + ' + ' + v + ';');
      OVTXT += ' · bias=' + v;
    }
  }
  if (src !== null) {
    TMP = path.join(ROOT, '.p856b-' + process.pid + '.html');
    fs.writeFileSync(TMP, src);
    USE = TMP;
  }
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const ctxb = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctxb.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('file://' + USE);
    await page.waitForTimeout(1100);

    const out = await page.evaluate((only) => {
      const R = { err: null, ss: 0, rows: [] };
      try {
        /* 855 — 주사위 고정(verify856 와 같은 자리·같은 처방) */
        let _rs = 0x2f6e2b1 >>> 0;
        Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
        window.requestAnimationFrame = () => 0;
        localStorage.clear(); Object.assign(S, DEF());
        S.stage = 20; S.best = 20; S.guide.idx = 99;
        if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
        spawnStage();
        step(1 / 60); draw();
        const ox = camOx, oy = camOy;

        /* ── 제품의 `specSprite` 를 런타임 복제 + 덤프 한 덩이 ── */
        const marker = `if(!hit) throw new Error('no core');`;
        const src = specSprite.toString();
        if (src.indexOf(marker) < 0) { R.err = 'marker 없음 — specSprite 가 바뀌었다'; return R; }
        /* 마루 화소마다 «참 반쪽폭 d · 추정 hh · 덩어리 hm» 과 **구워진 코어의 실폭**을 같이 찍는다.
           앞 셋은 연속값(기하)이고 뒤엣것은 **화소로 굳은 뒤**의 값이라 둘의 차가 곧 양자화 몫이다. */
        const inject = `
    if(window.__HH856){
      const rec = [];
      const run = (p, sx, sy) => { let n = 1;
        for(let k = 1; k < S; k++){ const q = p + k*(sy*S + sx); if(q < 0 || q >= core.length || !core[q]) break; n++; }
        for(let k = 1; k < S; k++){ const q = p - k*(sy*S + sx); if(q < 0 || q >= core.length || !core[q]) break; n++; }
        return n; };
      for(let y = 1; y < S - 1; y++) for(let x = 1; x < S - 1; x++){
        const p = y*S + x; if(!mask[p]) continue;
        const v = dist[p]; if(v < 0.35 * dMax) continue;
        if(v < dist[p-1] || v < dist[p+1] || v < dist[p-S] || v < dist[p+S]) continue;
        const cw = core[p] ? Math.min(run(p, 1, 0), run(p, 0, 1)) : 0;
        rec.push([v, hhArr[p], hmArr[p], cw]);
      }
      window.__HH856[key] = { rec: rec, dMax: dMax, S: S };
    }
`;
        const patched = src.replace(marker, inject + '    ' + marker);
        if (patched === src) { R.err = 'inject 실패'; return R; }
        window.specSprite = (0, eval)('(' + patched + ')');
        if (typeof window.specSprite !== 'function') { R.err = 'eval 실패'; return R; }
        SPEC_SPR.clear();
        window.__HH856 = {};

        /* 종마다 «그 스킬이 실제로 만든 첫 발» 을 실제로 그린다(verify856 [A] 와 같은 자리) */
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
        const _now = performance.now.bind(performance);
        performance.now = () => 1e6;

        for (const s of SKILLS) {
          if (only && s.id !== only) continue;
          putFoe(); clearFx();
          let done = false;
          try { done = castSkill(s); } catch (e) { done = false; }
          if (!done || !shots.length) { clearFx(); continue; }
          const b = shots[0];
          const key = b.sh + '|' + (b.col || '');
          SPEC_SPR.delete(key);
          const before = Object.keys(window.__HH856).length;
          draw();
          const got = window.__HH856[key];
          /* ⚑ 굽는 판의 화소 하나가 **화면에서 몇 px 인가** — 굽기는 `HALO_SS` 로 고정인데
             그리는 자리의 배율은 종마다 다르다. 둘의 곱이 곧 «그 종의 실효 초과표본» 이다. */
          const spr = SPEC_SPR.get(key);
          const m = spr && spr.m;
          const msc = m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1;
          R.rows.push({ id: s.id, sh: b.sh, key: key, n: got ? got.rec.length : 0,
                        rec: got ? got.rec : [], dMax: got ? got.dMax : 0, msc: msc,
                        baked: Object.keys(window.__HH856).length > before || !!got });
          clearFx();
        }
        performance.now = _now;
        R.ss = HALO_SS;
        R.K = SPEC_K; R.minR = SPEC_MINR; R.maxR = SPEC_MAXR;
      } catch (e) { R.err = String((e && e.message) || e).slice(0, 300); }
      return R;
    }, ONLY);

    if (out.err) { console.error('probe856b 실패 — ' + out.err); process.exit(1); }
    if (errs.length) console.log('[i] page error ' + errs.length + '건 — ' + errs[0].slice(0, 120));

    const SS = out.ss || 1, K = out.K, minR = out.minR * SS, maxR = out.maxR * SS;
    console.log('probe856b — 굽기 안 `hh` 덤프 (HALO_SS ' + SS + ' · K ' + K +
                ' · minR ' + out.minR + ' · maxR ' + out.maxR + ' 로컬px)' + OVTXT);
    console.log('단위는 **굽는화소 = 기기화소**(HALO_SS = SC·SK_DRAW_SC). 규격 비 K = ' + K);
    console.log('기하폭 = 2(dT−t) 연속값 · 굳은폭 = `core[]` 가 실제로 켠 화소 수(양자화 뒤)\n');
    const pad = (s, n) => String(s).padStart(n);

    const hdr = '종'.padEnd(10) + pad('마루', 6) + pad('획폭', 7) + pad('hh/d', 7) +
                pad('갈래', 15) + pad('기하폭', 8) + pad('굳은폭', 8) +
                pad('기하비', 8) + pad('굳은비', 8) + pad('규격', 7);
    console.log(hdr);
    console.log('-'.repeat(hdr.length + 8));
    const csv = [], tab = [];
    for (const r of out.rows) {
      if (!r.n) { console.log(r.id.padEnd(10) + pad(0, 6) + '   (굽기 없음/폴백)'); continue; }
      const rows = r.rec.map(([d, hh, hm, cw]) => {
        const dT = d - 0.5, hT = hh - 0.5;
        const tr = (1 - K) * hT, tm = hT - minR, tc = hm - 0.5 - maxR;
        const inner = Math.min(tr, tm);
        const t = Math.max(tc, inner);
        const br = tc >= inner ? 'maxR' : (tm < tr ? 'minR' : 'ratio');
        /* ⚠ «획 폭» 은 **참값 `2·dT`** 다(반화소 규약 — `edt2d` 는 경계까지의 참 거리보다 예외
           없이 +0.5 크다: 7회차가 참값을 아는 합성 도형에서 찍었다). `2·d` 로 나누면 그 +0.5 가
           비에 그대로 섞여 «가는 종일수록 비가 작다» 는 **자의 그림자**가 생긴다. 둘 다 낸다. */
        return { d, hh, hm, t, br, cw,
                 rat: dT > 0 ? (dT - t) / dT : 0,        /* 참 획폭 기준 — 규격 K 와 바로 견준다 */
                 ratD: d > 0 ? (dT - t) / d : 0,         /* 옛 표기(2·d 기준) — 8회차 표와 잇는다 */
                 ratQ: dT > 0 ? cw / (2 * dT) : 0, strokeB: 2 * dT };
      });
      const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(0.5 * (b.length - 1))]; };
      const brc = {};
      for (const q of rows) brc[q.br] = (brc[q.br] || 0) + 1;
      const brs = Object.keys(brc).sort((a, b) => brc[b] - brc[a]).map(k => k + ' ' + brc[k]).join('/');
      const sB = med(rows.map(q => q.strokeB));
      console.log(r.id.padEnd(10) + pad(r.n, 6) + pad(sB.toFixed(2), 7) +
                  pad(med(rows.map(q => q.hh / q.d)).toFixed(3), 7) +
                  pad(brs, 15) +
                  pad(med(rows.map(q => 2 * (q.d - 0.5 - q.t))).toFixed(2), 8) +
                  pad(med(rows.map(q => q.cw)).toFixed(2), 8) +
                  pad(med(rows.map(q => q.rat)).toFixed(3), 8) +
                  pad(med(rows.map(q => q.ratQ)).toFixed(3), 8) + pad(K.toFixed(3), 7));
      for (const q of rows) csv.push([r.id, r.sh, q.d.toFixed(4), q.hh.toFixed(4), q.hm.toFixed(4),
                                      q.t.toFixed(4), q.br, q.rat.toFixed(4), q.ratQ.toFixed(4),
                                      q.cw, q.strokeB.toFixed(3)].join(','));
      tab.push({ id: r.id, n: r.n, brc: brc,
                 hhErr: Math.max.apply(null, rows.map(q => Math.abs(q.hh - q.d))),
                 rat: med(rows.map(q => q.rat)), ratD: med(rows.map(q => q.ratD)),
                 ratQ: med(rows.map(q => q.ratQ)),
                 wGeo: med(rows.map(q => 2 * (q.d - 0.5 - q.t))), wQ: med(rows.map(q => q.cw)) });
    }
    if (CSV) {
      console.log('\n#csv id,sh,d,hh,hm,t,branch,ratioGeom,ratioQuant,coreW,strokeW');
      for (const l of csv) console.log(l);
    }

    /* ── 판정 — 10회차가 찍은 것을 «다시 물어보는 항» 으로 굳힌다(328~330 교훈).
       상수를 흔들어 보고 싶어지는 다음 세션이 **어느 축이 이미 닫혔는지**를 이 넷으로 읽는다. ── */
    console.log('');
    const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); return c; };
    let bad = 0;
    /* ⚠ 표본이 몇 화소뿐인 종(덩어리 계열 — 마루가 한두 점이다)은 **밴드에서 뺀다**.
       `flask`(마루 4화소 · 갈래가 ratio 2 / maxR 2)를 넣으면 그 한 종이 밴드를 혼자 정한다. */
    const ids = tab.filter(t => t.n >= 20);
    const strokeIds = ids.filter(t => (t.brc.ratio || 0) >= 0.5 * t.n);
    const bandOf = (a) => (a.length ? Math.max.apply(null, a) / Math.min.apply(null, a) : 0);

    /* 마루에서 `hh` 는 제 자리 거리 그 자체여야 한다 — 중앙값은 **정확히** 0 이고 최악도
       칸 규약(1px · 8회차)의 상한 안이다. 9회차가 «바닥» 1순위로 지목한 축이 여기서 닫힌다. */
    const hhMax = Math.max.apply(null, ids.map(t => t.hhErr));
    if (!ok(hhMax <= 1.0 + 1e-9 && ids.every(t => t.hhErr <= 1.0 + 1e-9),
        '[P1] `hh` 는 마루에서 제 거리 그 자체다 — 중앙 hh/d = 1.000(전 종) · 최악 |hh − d| = ' +
        hhMax.toFixed(3) + ' ≤ 1.0(칸 규약 상한). 9회차 «바닥» 1순위 축이 이 항으로 닫힌다')) bad++;

    const rats = strokeIds.map(t => t.rat).filter(v => v > 0);
    const dev = rats.length ? Math.max.apply(null, rats.map(v => Math.abs(v - K))) : 9;
    if (!ok(rats.length >= 8 && dev <= 0.002,
        '[P2] **연속** 비는 규격 그 자체다 — 비율 갈래 ' + rats.length + '종이 전부 K = ' + K +
        ' 에서 ' + dev.toFixed(4) + ' 안(참 획폭 2·dT 기준 · 옛 2·d 표기로는 ' +
        (strokeIds.length ? Math.min.apply(null, strokeIds.map(t => t.ratD)).toFixed(3) + '~' +
         Math.max.apply(null, strokeIds.map(t => t.ratD)).toFixed(3) : '—') + ')')) bad++;

    const ratsQ = strokeIds.map(t => t.ratQ), ratsG = strokeIds.map(t => t.rat);
    const bQ = bandOf(ratsQ), bG = bandOf(ratsG);
    if (!ok(bQ > bG,
        '[P3] 남은 밴드는 **규격이 아니라 화소**다 — 굳은 비 밴드 ' + bQ.toFixed(3) +
        ' > 연속 비 밴드 ' + bG.toFixed(3) + ' (둘이 같아지면 이 진단은 낡은 것이다)')) bad++;

    const g = tab.find(t => t.id === 'gale');
    if (!ok(!!g && (g.brc.minR || 0) > (g.brc.ratio || 0),
        '[P4] `gale` 은 **`minR` 갈래**다 — minR ' + (g ? (g.brc.minR || 0) : '—') + ' / ratio ' +
        (g ? (g.brc.ratio || 0) : '—') + ' (그래서 `SPEC_K` 를 양쪽으로 흔든 9회차 E1·E4 가 이 종을 못 움직였다)')) bad++;

    const gap = strokeIds.map(t => t.wQ - t.wGeo);
    const gmin = Math.min.apply(null, gap), gmax = Math.max.apply(null, gap);
    console.log('  [i]  굳은폭 − 기하폭 = ' + gmin.toFixed(2) + ' ~ ' + gmax.toFixed(2) +
                '화소 — **폭에 무관한 절대 오차**라 가는 종에 가장 크게 걸린다');

    console.log('\nPROBE856B ' + out.rows.filter(r => r.n).length + '종 · 마루 ' +
                out.rows.reduce((a, r) => a + r.n, 0) + '화소 · ' + (bad ? bad + '건 FAIL' : 'PASS'));
    if (bad) process.exitCode = 1;
  } finally {
    await browser.close();
    if (TMP) { try { fs.unlinkSync(TMP); } catch (_) {} }
  }
})();
