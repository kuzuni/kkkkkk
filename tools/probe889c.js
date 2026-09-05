#!/usr/bin/env node
/* probe889c — «무근 한 겹을 없애면 폭이 줄어드는가» 를 **A/B 로** 묻는다 (889 5회차)
 *
 *   node tools/probe889c.js            (표 + 판정 [C1]~[C4])
 *   node tools/probe889c.js --csv      (종별 단면 중앙값 전수)
 *
 * 왜 이 자인가 — 4회차가 «남은 몫은 **무근 한 겹**(전 종 화소당 정확히 1.00) 하나다 …
 * 그 한 겹을 없애면 [B13] 은 1.0 에 닿는다» 를 5회차의 유일한 축으로 남겼다. 그 문장은
 * `probe889b` [Q1] 의 등식(`굳은폭 − 기하폭 = 무근 몫`)을 **인과**로 읽은 것이다.
 * 이 자는 그 읽기를 시험한다 — 등식이 참인 것과 «무근을 없애면 폭이 준다» 는 **다른 말**이다.
 *
 * 어떻게 — 한 페이지 안에서 제품의 `specSprite` 를 **두 벌** 굽는다(402: 사본이 아니라 런타임 복제):
 *   ⓐ **그대로**            — 오늘의 제품
 *   ⓑ **무근 들어올리기**   — `hh ≤ dist` 로 주저앉은 화소의 `hh` 를 8이웃 `hh` 의 최대로 올린다.
 *      («물려주기» 3회차 기각과 다른 것은 자격 조건이 없다는 점이다 — 이 자는 처방이 아니라
 *       **인과 시험**이라 무근을 가장 많이 없애는 쪽으로 일부러 무르게 잡는다. 무르게 잡고도
 *       폭이 안 변하면 «무근이 폭의 임자» 라는 읽기는 어떤 처방으로도 못 산다.)
 * 두 벌에서 같은 자리·같은 규칙으로 단면을 떠 **굳은폭(Σcv)** 과 **무근 수**를 나란히 놓는다.
 *
 * ⚠ 이 자는 제품을 **한 글자도 안 바꾼다** — ⓑ 는 복제본 안에서만 산다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const CSV = process.argv.includes('--csv');
const SRC = path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const ctxb = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctxb.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('file://' + SRC);
    await page.waitForTimeout(1100);

    const out = await page.evaluate(() => {
      const R = { err: null, ss: 0, arms: {} };
      try {
        /* 855 — 주사위 고정(verify856·probe856b·probe889b 와 같은 자리·같은 처방) */
        let _rs = 0x2f6e2b1 >>> 0;
        Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
        window.requestAnimationFrame = () => 0;
        localStorage.clear(); Object.assign(S, DEF());
        S.stage = 20; S.best = 20; S.guide.idx = 99;
        if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
        spawnStage();
        step(1 / 60); draw();
        const ox = camOx, oy = camOy;

        const marker = `if(!hit) throw new Error('no core');`;
        const src = specSprite.toString();
        if (src.indexOf(marker) < 0) { R.err = 'marker 없음 — specSprite 가 바뀌었다'; return R; }

        /* ⓑ 팔의 «무근 들어올리기» — `core` 를 굽기 **전에** `hhArr` 만 손댄다.
           앵커는 코어 배열 선언 줄이라 문턱·덮인 몫 산식은 한 글자도 안 지난다. */
        const anchor = `const core = new Float32Array(S * S);`;
        if (src.indexOf(anchor) < 0) { R.err = 'anchor 없음 — core 선언이 바뀌었다'; return R; }
        const lift = `
    if(window.__LIFT889){
      const _src = Float32Array.from(hhArr);
      for(let y = 1; y < S - 1; y++) for(let x = 1; x < S - 1; x++){
        const p = y*S + x; if(!mask[p]) continue;
        if(_src[p] > dist[p] + 1e-6) continue;          /* 무근이 아니면 그대로 */
        let m = _src[p];
        for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
          const q = p + dy*S + dx; if(mask[q] && _src[q] > m) m = _src[q];
        }
        hhArr[p] = m;
      }
    }
    `;
        /* 단면 뜨기 — `probe889b` 와 **같은 규칙**이다(자를 새로 만들면 그것이 곧 사본이다 — 402) */
        const inject = `
    if(window.__XS889C){
      const runLen = (p, sx, sy) => { let n = core[p] > 0 ? 1 : 0;
        for(let k = 1; k < S; k++){ const q = p + k*(sy*S + sx); if(q < 0 || q >= core.length || !(core[q] > 0)) break; n++; }
        for(let k = 1; k < S; k++){ const q = p - k*(sy*S + sx); if(q < 0 || q >= core.length || !(core[q] > 0)) break; n++; }
        return n; };
      const rec = [];
      for(let y = 2; y < S - 2; y++) for(let x = 2; x < S - 2; x++){
        const p = y*S + x; if(!mask[p]) continue;
        const v = dist[p]; if(v < 0.35 * dMax) continue;
        if(v < dist[p-1] || v < dist[p+1] || v < dist[p-S] || v < dist[p+S]) continue;
        if(!(core[p] > 0)) continue;
        const hor = runLen(p, 1, 0), ver = runLen(p, 0, 1);
        const sx = hor <= ver ? 1 : 0, sy = hor <= ver ? 0 : 1, st = sy*S + sx;
        let sum = 0, nRoot = 0, cvRoot = 0;
        for(let side = -1; side <= 1; side += 2){
          for(let k = (side < 0 ? 1 : 0); k < S; k++){
            const q = p + side*k*st;
            if(q < 0 || q >= core.length || !mask[q]) break;
            if(core[q] > 0){
              sum += core[q];
              if(side*k !== 0 && hhArr[q] <= dist[q] + 1e-6){ nRoot++; cvRoot += core[q]; }
            } else break;
          }
        }
        rec.push([sum, nRoot, cvRoot]);
      }
      window.__XS889C[key] = rec;
    }
`;
        let patched = src.replace(anchor, lift + anchor).replace(marker, inject + '    ' + marker);
        if (patched === src) { R.err = 'inject 실패'; return R; }
        window.specSprite = (0, eval)('(' + patched + ')');
        if (typeof window.specSprite !== 'function') { R.err = 'eval 실패'; return R; }

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

        const sweep = () => {
          const rows = [];
          SPEC_SPR.clear();
          window.__XS889C = {};
          for (const s of SKILLS) {
            putFoe(); clearFx();
            let done = false;
            try { done = castSkill(s); } catch (e) { done = false; }
            if (!done || !shots.length) { clearFx(); continue; }
            const b = shots[0];
            const key = b.sh + '|' + (b.col || '');
            SPEC_SPR.delete(key);
            draw();
            const got = window.__XS889C[key];
            rows.push({ id: s.id, rec: got || [] });
            clearFx();
          }
          return rows;
        };

        window.__LIFT889 = 0; R.arms.base = sweep();
        window.__LIFT889 = 1; R.arms.lift = sweep();
        window.__LIFT889 = 0;

        performance.now = _now;
        R.ss = HALO_SS;
      } catch (e) { R.err = String((e && e.message) || e).slice(0, 300); }
      return R;
    });

    if (out.err) { console.error('probe889c 실패 — ' + out.err); process.exit(1); }
    if (errs.length) console.log('[i] page error ' + errs.length + '건 — ' + errs[0].slice(0, 120));

    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(0.5 * (b.length - 1))] : 0; };
    const pad = (s, n) => String(s).padStart(n);
    const digest = (rows) => {
      const m = {};
      for (const r of rows) {
        if (!r.rec.length) continue;
        m[r.id] = {
          n: r.rec.length,
          bake: med(r.rec.map(v => v[0])),
          root: med(r.rec.map(v => v[1])),
          rootAny: r.rec.filter(v => v[1] > 0).length / r.rec.length,
        };
      }
      return m;
    };
    const A = digest(out.arms.base || []), B = digest(out.arms.lift || []);

    console.log('probe889c — «무근을 없애면 폭이 주는가» A/B (HALO_SS ' + (out.ss || 1) + ')');
    console.log('ⓐ 그대로 ↔ ⓑ 무근 들어올리기(hh ← 8이웃 hh 최대) · 두 팔은 **같은 페이지 · 같은 자리**\n');
    const hdr = '종'.padEnd(10) + pad('단면', 6) + pad('ⓐ굳은폭', 9) + pad('ⓑ굳은폭', 9) + pad('Δ폭', 8) +
                pad('ⓐ무근%', 8) + pad('ⓑ무근%', 8);
    console.log(hdr);
    console.log('-'.repeat(hdr.length + 8));
    const ids = Object.keys(A).filter(k => B[k] && A[k].n >= 20);
    const dW = [], dropped = [];
    for (const k of Object.keys(A)) {
      if (!B[k]) continue;
      const d = B[k].bake - A[k].bake;
      if (A[k].n >= 20) { dW.push(Math.abs(d)); if (A[k].rootAny > 0.2) dropped.push(A[k].rootAny - B[k].rootAny); }
      console.log(k.padEnd(10) + pad(A[k].n, 6) + pad(A[k].bake.toFixed(2), 9) + pad(B[k].bake.toFixed(2), 9) +
                  pad((d >= 0 ? '+' : '') + d.toFixed(3), 8) +
                  pad((100 * A[k].rootAny).toFixed(0) + '%', 8) + pad((100 * B[k].rootAny).toFixed(0) + '%', 8));
    }
    if (CSV) {
      console.log('\n#csv id,n,bakeA,bakeB,rootAnyA,rootAnyB');
      for (const k of Object.keys(A)) if (B[k])
        console.log([k, A[k].n, A[k].bake.toFixed(4), B[k].bake.toFixed(4),
                     A[k].rootAny.toFixed(4), B[k].rootAny.toFixed(4)].join(','));
    }

    console.log('');
    let bad = 0;
    const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; return c; };

    /* [C1] 시험이 실제로 무근을 없애는가 — 이것이 안 서면 아래 두 항은 «안 해 본 것» 이다.
       (자의 자: 시험 팔이 헛돌면 «변화 없음» 이 저절로 참이 되므로 먼저 못박는다.) */
    const rootA = ids.map(k => A[k].rootAny), rootB = ids.map(k => B[k].rootAny);
    const fell = ids.filter(k => A[k].rootAny > 0.2 && B[k].rootAny <= 0.5 * A[k].rootAny);
    ok(fell.length >= 4,
       '[C1] ⓑ 팔이 실제로 무근을 걷어낸다 — 무근 단면 비율이 절반 이하로 떨어진 종 ' + fell.length +
       '종(' + fell.slice(0, 6).map(k => k + ' ' + (100 * A[k].rootAny).toFixed(0) + '→' +
       (100 * B[k].rootAny).toFixed(0) + '%').join(' · ') + ') · 전 종 평균 ' +
       (100 * rootA.reduce((a, b) => a + b, 0) / rootA.length).toFixed(0) + '% → ' +
       (100 * rootB.reduce((a, b) => a + b, 0) / rootB.length).toFixed(0) + '%');

    /* [C2] ⚑⚑ **본체** — 그런데 굳은폭은 한 종도 안 움직인다.
       ⇒ 무근은 «폭을 켜는 화소» 가 아니라 **이미 켜져 있던 자리**다(cv 가 어느 쪽 문턱으로도 1 에 붙는다).
       무근을 없애도 폭이 그대로면 «무근 한 겹을 없애면 [B13] 이 1.0 에 닿는다» 는 읽기는 **거짓**이고,
       그것은 처방의 문제가 아니라 **읽기의 문제**라 어떤 처방으로도 못 산다. */
    ok(dW.length >= 8 && Math.max.apply(null, dW) <= 0.05,
       '[C2] ⚑⚑ 그런데 **굳은폭은 안 움직인다** — ' + dW.length + '종 최악 |Δ폭| ' +
       Math.max.apply(null, dW).toFixed(3) + ' ≤ 0.05화소 ⇒ `probe889b` [Q1] 의 등식은 **인과가 아니다**');

    /* [C3] 자의 자 — 두 팔이 같은 표본을 봤는가(단면 수가 어긋나면 위 비교가 사과와 배다) */
    const nEq = ids.every(k => Math.abs(A[k].n - B[k].n) <= 0.02 * A[k].n + 2);
    ok(nEq, '[C3] 두 팔이 같은 자리를 봤다 — 종별 단면 수 어긋남 ≤ 2%+2 (' + ids.length + '종)');

    /* [C4] ⚑ **되돌림 시험** — [C2] 의 «Δ = 0.000» 이 «시험 팔이 코어 굽기에 안 닿았다» 여서는 안 된다.
       닿았다는 증거는 표 밖에 있다: **무근이 코어의 대부분인 덩어리 계열**(2회차 기각 ① 이 찍은 그 자리 —
       shuri 단면 98화소 중 95가 무근)에서는 같은 팔이 폭을 **실제로 줄인다**. 곧 팔은 살아 있고,
       획 무리에서만 «안 움직인다» 는 것이 [C2] 의 뜻이다. 이 항이 없으면 [C2] 는 헛초록이 된다. */
    const blob = Object.keys(A).filter(k => B[k] && A[k].n < 20 && A[k].rootAny >= 0.9);
    const moved = blob.filter(k => A[k].bake - B[k].bake >= 1);
    ok(moved.length >= 2 && ids.length >= 8 && ids.every(k => A[k].bake > 0 && B[k].bake > 0),
       '[C4] ⚑ 시험 팔은 살아 있다 — 무근이 코어의 대부분인 종에서는 같은 팔이 폭을 줄인다(' +
       moved.map(k => k + ' −' + (A[k].bake - B[k].bake).toFixed(2)).join(' · ') +
       ') · 획 무리 ' + ids.length + '종은 굳은폭 > 0 으로 다 구웠다');

    console.log('\nPROBE889C ' + ids.length + '종 · 단면 ' +
                ids.reduce((a, k) => a + A[k].n, 0) + '개 · ' + (bad ? bad + '건 FAIL' : 'PASS'));
    if (bad) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
