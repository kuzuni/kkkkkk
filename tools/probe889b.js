#!/usr/bin/env node
/* probe889b — **문턱 밭**을 단면으로 찍는다 (889 2회차 · 1회차 «남은 문제» 1순위)
 *
 *   node tools/probe889b.js                  (표 + 판정 [Q1]~[Q4])
 *   node tools/probe889b.js --csv            (단면 화소 전수)
 *   node tools/probe889b.js --only gale      (한 종만)
 *
 * 왜 이 자인가 — 1회차가 `probe856b` 를 «덮인 몫» 에 맞춰 고쳐 다시 재니 **격자는 사라졌는데
 * 폭은 그대로**였다(gale 굳은폭 4.00 → 4.04 · 기하폭 3.04). 그래서 남은 0.69~1.88화소는
 * 이진화가 아니라 **문턱 밭 자체**라고 적었다. 이 자는 그 문장을 **단면으로** 확인한다 —
 * «어느 화소가 왜 코어에 들어왔는가» 를 화소 하나하나로 묻는다(338 규칙: 처방 전에 재현).
 *
 * 무엇을 재는가 — 주 마루 화소마다 **가로지르는 축**의 단면을 통째로 뜬다:
 *   d      그 화소의 거리(`dist[]`) · hh 굽기가 준 반쪽폭 추정 · cv `core[]` 의 덮인 몫
 *   갈래   문턱 `t = max(hm−.5−maxR, min((1−K)·hT, hT−minR))` 셋 중 이긴 항
 *
 * ⚑ 이 자가 묻는 것은 하나다 — **`hh` 가 제 거리로 «무너진» 화소**(`hh ≤ dist + ε`).
 *   그런 화소는 자기가 곧 제 획의 마루라고 주장하므로 문턱이 제 거리를 따라 같이 내려가고
 *   (`dT − t` 가 갈래별 상수 `K·dT` 또는 `minR` 로 굳는다) **거리와 무관하게 코어에 든다**.
 *   마루에서는 `hh = d` 가 정답이지만(그것이 `probe856b` [P1] 이다) **단면 바깥**에서
 *   같은 등식이 서면 그것은 추정이 무너진 것이다 — 두 자리를 가르는 것이 이 자의 일이다.
 *
 * 어떻게 — `probe856b` 와 같은 방법(제품의 `specSprite` 를 런타임 복제 + 덤프 한 덩이).
 *   제품 소스는 **0줄** 바뀌고 사본이 매 실행 제품에서 뜨므로 자와 제품이 어긋날 길이 없다(402).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const CSV = process.argv.includes('--csv');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? (process.argv[i + 1] || '') : ''; };
const ONLY = arg('--only');
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

    const out = await page.evaluate((only) => {
      const R = { err: null, ss: 0, rows: [] };
      try {
        /* 855 — 주사위 고정(verify856·probe856b 와 같은 자리·같은 처방) */
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
        /* 주 마루마다 **가로지르는 축**(코어 run 이 짧은 쪽)의 단면을 통째로 뜬다.
           코어 밖으로도 한 칸 더 나가서(cv = 0) «왜 거기서 멈췄나» 를 같이 볼 수 있게 한다. */
        const inject = `
    if(window.__XS889){
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
        /* 코어가 끊길 때까지 양쪽으로 걷고 **한 칸 더** 본다(cv = 0 인 첫 화소까지) */
        const line = [];
        for(let side = -1; side <= 1; side += 2){
          for(let k = (side < 0 ? 1 : 0); k < S; k++){
            const q = p + side*k*st;
            if(q < 0 || q >= core.length || !mask[q]) break;
            line.push([side*k, dist[q], hhArr[q], hmArr[q], core[q]]);
            if(!(core[q] > 0)) break;
          }
        }
        line.sort((a, b) => a[0] - b[0]);
        rec.push({ d: v, hh: hhArr[p], hm: hmArr[p], line: line });
      }
      window.__XS889[key] = { rec: rec, dMax: dMax, S: S };
    }
`;
        const patched = src.replace(marker, inject + '    ' + marker);
        if (patched === src) { R.err = 'inject 실패'; return R; }
        window.specSprite = (0, eval)('(' + patched + ')');
        if (typeof window.specSprite !== 'function') { R.err = 'eval 실패'; return R; }
        SPEC_SPR.clear();
        window.__XS889 = {};

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
          draw();
          const got = window.__XS889[key];
          R.rows.push({ id: s.id, sh: b.sh, n: got ? got.rec.length : 0, rec: got ? got.rec : [] });
          clearFx();
        }
        performance.now = _now;
        R.ss = HALO_SS; R.K = SPEC_K; R.minR = SPEC_MINR; R.maxR = SPEC_MAXR;
      } catch (e) { R.err = String((e && e.message) || e).slice(0, 300); }
      return R;
    }, ONLY);

    if (out.err) { console.error('probe889b 실패 — ' + out.err); process.exit(1); }
    if (errs.length) console.log('[i] page error ' + errs.length + '건 — ' + errs[0].slice(0, 120));

    const SS = out.ss || 1, K = out.K, minR = out.minR * SS, maxR = out.maxR * SS;
    const EPS = 1e-6;
    const branchOf = (hh, hm) => {
      const hT = hh - 0.5, tr = (1 - K) * hT, tm = hT - minR, tc = hm - 0.5 - maxR;
      const inner = Math.min(tr, tm);
      return { t: Math.max(tc, inner), br: tc >= inner ? 'maxR' : (tm < tr ? 'minR' : 'ratio') };
    };

    console.log('probe889b — 문턱 밭 단면 (HALO_SS ' + SS + ' · K ' + K +
                ' · minR ' + out.minR + ' · maxR ' + out.maxR + ' 로컬px)');
    console.log('무근 = 단면에서 `hh ≤ dist`(제 거리로 무너진 추정) 인 **코어** 화소 — 마루 자신은 뺀다');
    console.log('제몫폭 = 무근 화소의 덮인 몫을 뺀 폭 · 굳은폭 = 단면 덮인 몫 합\n');
    const pad = (s, n) => String(s).padStart(n);
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(0.5 * (b.length - 1))] : 0; };

    const hdr = '종'.padEnd(10) + pad('마루', 6) + pad('기하폭', 8) + pad('굳은폭', 8) +
                pad('제몫폭', 8) + pad('무근/단면', 11) + pad('무근cv', 8) + pad('갈래', 14);
    console.log(hdr);
    console.log('-'.repeat(hdr.length + 10));
    const tab = [], csv = [];
    for (const r of out.rows) {
      if (!r.n) { console.log(r.id.padEnd(10) + pad(0, 6) + '   (굽기 없음/폴백)'); continue; }
      const geoW = [], bakeW = [], ownW = [], rootless = [], rlCv = [], brc = {};
      for (const q of r.rec) {
        const bq = branchOf(q.hh, q.hm);
        brc[bq.br] = (brc[bq.br] || 0) + 1;
        geoW.push(2 * (q.d - 0.5 - bq.t));
        let sum = 0, own = 0, nRoot = 0, cvRoot = 0;
        for (const [k, d, hh, hm, cv] of q.line) {
          if (!(cv > 0)) continue;
          sum += cv;
          const bad = k !== 0 && hh <= d + EPS;      /* 마루 자신은 «hh = d» 가 정답이다 */
          if (bad) { nRoot++; cvRoot += cv; } else own += cv;
          if (CSV) csv.push([r.id, q.d.toFixed(3), k, d.toFixed(3), hh.toFixed(3), hm.toFixed(3),
                             cv.toFixed(3), bad ? 'rootless' : ''].join(','));
        }
        bakeW.push(sum); ownW.push(own); rootless.push(nRoot); rlCv.push(cvRoot);
      }
      const brs = Object.keys(brc).sort((a, b) => brc[b] - brc[a]).map(k => k + ' ' + brc[k]).join('/');
      const row = { id: r.id, n: r.n, geo: med(geoW), bake: med(bakeW), own: med(ownW),
                    root: med(rootless), rootCv: med(rlCv),
                    rootAny: rootless.filter(v => v > 0).length / r.n, brc: brc };
      tab.push(row);
      console.log(r.id.padEnd(10) + pad(r.n, 6) + pad(row.geo.toFixed(2), 8) + pad(row.bake.toFixed(2), 8) +
                  pad(row.own.toFixed(2), 8) +
                  pad(row.root + ' / ' + (100 * row.rootAny).toFixed(0) + '%', 11) +
                  pad(row.rootCv.toFixed(2), 8) + pad(brs, 14));
    }
    if (CSV) {
      console.log('\n#csv id,ridgeD,k,d,hh,hm,cv,flag');
      for (const l of csv) console.log(l);
    }

    console.log('');
    let bad = 0;
    const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; return c; };
    const ids = tab.filter(t => t.n >= 20);
    const rootRows = ids.filter(t => t.root > 0);
    const gap = ids.map(t => t.bake - t.geo);

    /* ⚑ 항의 방향에 대하여 — 이 자는 «결손이 있다» 를 단언하지 않는다(그러면 고친 다음 회차에
       빨개져서 되돌림 시험으로 못 쓴다). 대신 **기계**를 단언한다: 굳은폭이 기하폭보다 넓은
       몫은 «무근 화소의 덮인 몫» 과 **같다**. 수리 전에는 둘 다 1~2화소이고 수리 뒤에는 둘 다
       0 이라 **항등식은 양쪽에서 참**이고, 그 사이를 움직이는 것은 표의 수치뿐이다. */

    /* [Q1] ⚑ **본체** — 넓어진 몫은 **전부** 무근 화소가 켠 것이다: `0 ≤ 굳은폭 − 기하폭 ≤ 무근 몫`.
       위 끝이 무근 몫인 이유는 무근 화소가 «없던 자리를 켜는» 것이고, 아래 끝이 0 인 이유는
       그 화소가 원래 거기 있던 **부분 덮임**(0~1)을 대신 차지해 그만큼은 상쇄되기 때문이다.
       ⇒ 무근이 0 이면 구간이 [0, 0] 으로 닫히므로 **수리 뒤에도 같은 항이 참**이다. */
    /* ⚑⚑ 889 4회차 **정정** — 위 문장은 **2회차의 제 수리가 들어간 순간 거짓이 됐고, 그 뒤로
       이 항은 계속 빨갰다**(오늘 origin/main 에서 내 변경 **없이** 재현했다: slash 차 0.40 ↔ 무근 0.00 ·
       ice 1.38 ↔ 0.00). 2회차 review 의 «4/4 PASS» 는 **수리 전** 트리에서 받은 값이고, 같은 회차가
       «남은 문제 1» 에 적어 둔 잔차(`제몫폭 − 기하폭`: arrow·gale·lance **0.00** ↔ ice 1.07 · boomer 1.05)가
       바로 이 항이 못 담는 몫이다 — 적어 두고도 항을 안 고쳤다.
       ⚑ 4회차가 그 잔차의 정체를 갈랐다: **자의 기울기 몫**이다. 이 자는 단면을 «가로지르는 **축**»
         으로 뜨는데, 축에 나란한 종(gale·arrow·lance)은 잔차가 **정확히 0.000** 이고 기울어진 종만
         `1/cos θ` 만큼 길게 잰다(ice 1.20 = 33° · boomer 1.25 = 37° · curve 1.12 · whirl 1.09 · slash 1.07).
         곧 제품이 넓힌 것이 아니라 **비스듬한 획을 축으로 자른 몫**이다.
       ⇒ 항을 비우지 않고 **둘로 가른다**(333 처방): [Q1] 은 원래 문장을 **축에 나란한 종에서**
         그대로 묻고(거기서는 등식이 정확히 선다), 기울기 몫의 상한은 [Q5] 가 격자에서 유도해 묻는다.
       ⚠⚠ **889 5회차 — 이 등식을 «인과» 로 읽지 마라.** 4회차가 그렇게 읽어(«무근 한 겹을 없애면
         [B13] 이 1.0 에 닿는다») 5회차의 유일한 축으로 남겼는데, `tools/probe889c.js` 가 A/B 로
         **기각했다**: 무근을 8이웃 `hh` 최대로 들어올려 무근 단면 비율을 70% → 33%(curve·whirl 은 0%)
         로 걷어내도 획 무리 10종의 **굳은폭이 0.000화소도 안 움직인다**. 무근은 «폭을 켜는 화소» 가
         아니라 **어느 문턱으로도 cv 가 1 에 붙는 안쪽 화소**다 — 등식은 참이되 임자가 아니다.
         폭을 정하는 것은 `0 < cv < 1` 인 **경계** 화소의 `hh` 이고, 무근은 그 자리에 없다. */
    const perp = ids.filter(t => t.geo > 0 && t.own <= 1.01 * t.geo);
    const q1e = perp.map(t => Math.abs(t.bake - t.geo - t.rootCv));
    ok(perp.length >= 3 && Math.max.apply(null, q1e) <= 0.05,
       '[Q1] ⚑ **축에 나란한** 종에서 넓어진 몫은 전부 무근 화소가 켠 것이다 — ' +
       '`굳은폭 − 기하폭 = 무근 몫` ' + perp.length + '종(' + perp.map(t => t.id).join('·') + ') · ' +
       '최악 어긋남 ' + Math.max.apply(null, q1e).toFixed(3) + ' ≤ 0.05 ' +
       '(전 ' + ids.length + '종 차 ' + Math.min.apply(null, gap).toFixed(2) + '~' +
       Math.max.apply(null, gap).toFixed(2) + '화소 · 무근 몫 ' +
       Math.min.apply(null, ids.map(t => t.rootCv)).toFixed(2) + '~' +
       Math.max.apply(null, ids.map(t => t.rootCv)).toFixed(2) + ')');

    /* [Q5] ⚑ 889 4회차 신설 — **잔차의 상한은 격자에서 나온다**(손으로 고른 문턱이 아니다).
       곧은 띠를 **축으로** 자르면 그 단면은 수직 단면보다 정확히 `1/cos θ` 배 길고, 축이 둘이라
       θ 는 45° 를 못 넘는다 ⇒ 잔차의 상한은 **√2**다. 아래로는 0(축으로 자르면 짧아질 수 없다).
       ⇒ `기하폭 ≤ 제몫폭 ≤ √2 · 기하폭`. 제품이 코어를 기울기 몫 **너머로** 넓히면 이 항이 짖는다. */
    const ob = ids.filter(t => t.geo > 0).map(t => t.own / t.geo);
    ok(ob.length >= 8 && Math.min.apply(null, ob) >= 1 - 0.02 &&
       Math.max.apply(null, ob) <= Math.SQRT2 + 0.02,
       '[Q5] 무근을 뺀 잔차는 **자의 기울기 몫**이다 — 제몫폭 ÷ 기하폭 ' +
       Math.min.apply(null, ob).toFixed(3) + '~' + Math.max.apply(null, ob).toFixed(3) +
       ' 이 [1, √2] 안(축으로 자른 단면의 구조적 상한 · 축에 나란한 종은 정확히 1.000)');

    /* [Q2] — 무근 화소는 «거리와 무관하게 꽉 찬다». 문턱이 제 거리를 따라 내려가 `dT − t` 가
       갈래 상수(`K·dT` 또는 `minR`)로 굳으므로 얼마나 바깥이든 cv 가 1 에 붙는다.
       ⇒ 무근 화소는 «조금 넓힌다» 가 아니라 **한 겹을 통째로 켠다**. */
    const cvPer = rootRows.map(t => t.rootCv / t.root);
    ok(!rootRows.length || Math.min.apply(null, cvPer) >= 0.7,
       '[Q2] 무근 화소는 거리와 무관하게 **꽉 찬다** — ' +
       (rootRows.length ? rootRows.length + '종에서 화소당 덮인 몫 ' +
        Math.min.apply(null, cvPer).toFixed(2) + '~' + Math.max.apply(null, cvPer).toFixed(2)
        : '무근 0건(수리 뒤의 얼굴)') +
       ' — 문턱이 제 거리를 따라 내려가 `dT − t` 가 갈래 상수로 굳는다');

    /* [Q3] — 무근은 **바깥 한 겹**이다(마루가 아니다). 단면마다 몇 개인지로 «한 겹» 을 못박는다 */
    ok(rootRows.every(t => t.root <= 2),
       '[Q3] 무근은 단면당 ' + (rootRows.length ? Math.min.apply(null, rootRows.map(t => t.root)) + '~' +
       Math.max.apply(null, rootRows.map(t => t.root)) : 0) +
       '개 = **바깥 한 겹**이다 — 마루가 아니라 코어의 가장자리에서만 추정이 무너진다');

    /* [Q4] 자의 자 — 마루에서 «hh = d» 는 **정답**이다(`probe856b` [P1]). 무근 판정이 그 자리를
       무근으로 세면 이 자는 제 결론을 스스로 지어내는 것이다 ⇒ k = 0 은 세지 않는다는 것을
       표본 수로 못박는다(무근 ≤ 단면 화소 − 1). */
    ok(ids.every(t => t.root < Math.max(2, Math.round(t.bake))),
       '[Q4] 마루 자신은 무근으로 안 센다 — 무근 ' +
       Math.min.apply(null, ids.map(t => t.root)) + '~' + Math.max.apply(null, ids.map(t => t.root)) +
       ' < 단면 폭 ' + Math.min.apply(null, ids.map(t => t.bake)).toFixed(1) + '~' +
       Math.max.apply(null, ids.map(t => t.bake)).toFixed(1));

    console.log('\nPROBE889B ' + tab.length + '종 · 단면 ' + tab.reduce((a, t) => a + t.n, 0) +
                '개 · ' + (bad ? bad + '건 FAIL' : 'PASS'));
    if (bad) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
