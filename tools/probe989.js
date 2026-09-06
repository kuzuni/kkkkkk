/* 989 재현 — **[E1] 의 초록이 «상자» 와 «눈금» 둘 다에서 만들어진다** (2026-09-06, sess-1158-5775 루틴 워커 D)
 *
 *   node tools/probe989.js              상자 사다리 60 · 120 · 240 · 480 을 다 잰다
 *   node tools/probe989.js --r 60,240   사다리를 직접 준다
 *
 * ── 무엇을 묻나 ───────────────────────────────────────────────────────────
 * `probe792r12`(12회차)가 갈래 둘을 갈라 놓았다:
 *   ⓐ **눈금이 좁다** — [E1] 은 `α ≥ 0.55` 본체만 잰다. 종이 **제 손으로 깐 반투명 부품**
 *      (화구 불빛 · 병 불빛 · 운석 불꼬리)은 α < 0.55 라 눈금에서 빠지는데, 눈은 그것을 덩치로 센다.
 *   ⓑ **상자가 작다** — 측정 상자 `R = 60`(게임px) 이 `meteor` 의 잉크를 자른다. 잘린 값은
 *      상자 크기로 수렴하므로 [E1] 이 그 종을 «밴드 안» 으로 읽는다(**결함이 있어야 초록** · 979-②).
 *
 * 이 자는 그 둘을 **하나의 표**로 잇는다 — 같은 장면을 상자 사다리로 여러 번 재서
 *   · `edge`  — 잉크가 상자 네 변에 닿은 화소 수(0 이라야 «다 담았다»)
 *   · `body`  — [E1] 이 지금 재는 것(본체 bbox 대각)
 *   · `own`   — **처방 ② 의 눈금**: 본체 ∪ «제 손으로 깐 반투명 부품» bbox 대각.
 *               부품의 정의는 자에 새로 적지 않는다 — [B8s] 가 `fFar` 로 이미 세고 있는 그 화소
 *               (본체에서 `CBAND`px 밖 후광)를 그대로 쓴다. 공용 링은 두께가 CBAND 안이라 안 들어온다.
 *   · `vis`   — 보이는 잉크 전부(공용 링 포함) — 눈이 재는 상한
 * 을 찍는다. **상자가 충분히 크면 세 값이 다 안 움직인다**는 것이 «상자를 뺐다» 의 증거다.
 *
 * ⚠ 이 자는 판정하지 않는다(338 — 처방 전에 재현). 판정은 `verify989` 가 세운다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');
const argRs = (() => {
  const i = process.argv.indexOf('--r');
  return i > 0 ? process.argv[i + 1].split(',').map(Number) : [60, 120, 240, 480];
})();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(browser, R) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(SRC);
  await page.waitForTimeout(1100);
  const ev = async (fn, a) => {
    try { return await page.evaluate(fn, a); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 장면 세우기는 `verify792.js` measure() 와 **같은 자리·같은 처방**이다(855 주사위 · 936 상자). */
  const out = await ev((R) => {
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
    putFoe(); orbitAng = 0;

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
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22);
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const cx2 = cvs.getContext('2d');
    const grab = () => { draw(); return cx2.getImageData(bx, by, bw, bh).data; };

    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;
    const base = grab();

    const A_BODY = 0.55;   /* 자와 **같은 값** — 여기서 다른 값을 쓰면 견줄 수 없다 */
    const CBAND = 18;      /* 자와 **같은 값** — 공용 링(설계 두께 12기기px)을 담는 띠 */
    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      /* ⚑ **바탕이 둘이다.** 종전 자는 «발이 없는 장면» 을 바탕으로 썼는데, 발이 오면 그림이
         `shotBody()` 하나만 늘어나는 것이 아니다 — 운석은 `b.k==='meteor'` 인 동안 착탄 지점에
         **낙하 예고 링**(반경 `b.r` = 실제 피해 반경)을 지면에 깐다(index.html 28773 루프).
         그 링은 «그림이 곧 판정» 인 부품이라 541 이 크기 배수에서 빼 둔 자리이고 `shotBody` 밖이다.
         ⇒ 발을 **놓되 그림만 끈** 판(`mf:0` — 19회차 표창 페이드가 쓰는 그 손잡이)을 두 번째
           바탕으로 잡으면 «이 종의 그림» 만 남는다. 16종은 두 바탕이 화소까지 같다(아래 [7] 이 센다). */
      clearFx(); shots.push(Object.assign(mk(), { mf: 0 })); const aT = grab();
      clearFx(); shots.push(mk());              const a0 = grab();
      clearFx(); shots.push(mk(), mk());        const a2 = grab();
      let sameBase = 0;
      for (let i = 0; i < aT.length; i += 4) {
        if (Math.abs(aT[i] - base[i]) > 8 || Math.abs(aT[i + 1] - base[i + 1]) > 8 ||
            Math.abs(aT[i + 2] - base[i + 2]) > 8) sameBase++;
      }

      const hd = new Uint8Array(bw * bh), sf = new Uint8Array(bw * bh);
      let edge = 0;
      let vx0 = 1e9, vy0 = 1e9, vx1 = -1, vy1 = -1;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - aT[i + k]);        /* ← 바탕은 «그림만 끈 판» 이다 */
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const x = p % bw, y = (p - x) / bw;
        if (x < vx0) vx0 = x; if (x > vx1) vx1 = x;
        if (y < vy0) vy0 = y; if (y > vy1) vy1 = y;
        if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) edge++;
        const d1 = a0[i + c] - aT[i + c], d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) hd[p] = 1; else sf[p] = 1;
      }

      /* 본체 «밖» — 테두리에서 본체가 아닌 화소를 타고 들어간 영역(자와 같은 처방) */
      const outm = new Uint8Array(bw * bh), st = [];
      for (let x = 0; x < bw; x++) { st.push(x); st.push((bh - 1) * bw + x); }
      for (let y = 0; y < bh; y++) { st.push(y * bw); st.push(y * bw + bw - 1); }
      while (st.length) {
        const p = st.pop();
        if (p < 0 || p >= outm.length || outm[p] || hd[p]) continue;
        outm[p] = 1;
        const x = p % bw, y = (p - x) / bw;
        if (x > 0) st.push(p - 1);
        if (x < bw - 1) st.push(p + 1);
        if (y > 0) st.push(p - bw);
        if (y < bh - 1) st.push(p + bw);
      }
      /* 본체까지의 거리(체임퍼 2패스) — 자의 `dtm` 과 같다 */
      const INF = 1e9, dtm = new Float32Array(bw * bh);
      for (let p = 0; p < dtm.length; p++) dtm[p] = hd[p] ? 0 : INF;
      const D1 = 1, D2 = 1.41421356;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const p = y * bw + x; let v = dtm[p];
        if (x > 0 && dtm[p - 1] + D1 < v) v = dtm[p - 1] + D1;
        if (y > 0 && dtm[p - bw] + D1 < v) v = dtm[p - bw] + D1;
        if (x > 0 && y > 0 && dtm[p - bw - 1] + D2 < v) v = dtm[p - bw - 1] + D2;
        if (x < bw - 1 && y > 0 && dtm[p - bw + 1] + D2 < v) v = dtm[p - bw + 1] + D2;
        dtm[p] = v;
      }
      for (let y = bh - 1; y >= 0; y--) for (let x = bw - 1; x >= 0; x--) {
        const p = y * bw + x; let v = dtm[p];
        if (x < bw - 1 && dtm[p + 1] + D1 < v) v = dtm[p + 1] + D1;
        if (y < bh - 1 && dtm[p + bw] + D1 < v) v = dtm[p + bw] + D1;
        if (x < bw - 1 && y < bh - 1 && dtm[p + bw + 1] + D2 < v) v = dtm[p + bw + 1] + D2;
        if (x > 0 && y < bh - 1 && dtm[p + bw - 1] + D2 < v) v = dtm[p + bw - 1] + D2;
        dtm[p] = v;
      }

      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;      /* 본체 */
      let ox0 = 1e9, oy0 = 1e9, ox1 = -1, oy1 = -1;      /* 본체 + 제 손 부품 */
      let far = 0, soft = 0;
      for (let p = 0; p < hd.length; p++) {
        const x = p % bw, y = (p - x) / bw;
        if (hd[p]) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
          if (x < ox0) ox0 = x; if (x > ox1) ox1 = x;
          if (y < oy0) oy0 = y; if (y > oy1) oy1 = y;
          continue;
        }
        if (!(sf[p] && outm[p])) continue;
        soft++;
        if (dtm[p] <= CBAND) continue;                   /* 공용 링 몫 — 눈금 밖 */
        far++;
        if (x < ox0) ox0 = x; if (x > ox1) ox1 = x;
        if (y < oy0) oy0 = y; if (y > oy1) oy1 = y;
      }
      const dg = (x0, y0, x1, y1) => (x1 < 0 ? 0 : +Math.hypot(x1 - x0 + 1, y1 - y0 + 1).toFixed(1));
      rows[id] = { sh: sp.sh, edge, sameBase,
                   body: dg(bx0, by0, bx1, by1),
                   own:  dg(ox0, oy0, ox1, oy1),
                   vis:  dg(vx0, vy0, vx1, vy1),
                   fFar: +(far / Math.max(1, soft)).toFixed(3) };
      clearFx();
    }
    performance.now = _now;
    return { rows, box: { R, bw, bh } };
  }, R);

  await ctx.close();
  return { out, errs };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  console.log('=== PROBE 989 — [E1] 의 상자(ⓑ)와 눈금(ⓐ) 을 한 표로 ===\n');

  const res = [];
  for (const R of argRs) {
    const r = await measure(browser, R);
    if (r.out.__err) { console.log('  FAIL 측정 실패 R' + R + ': ' + r.out.__err); await browser.close(); process.exit(1); }
    res.push(r);
  }
  await browser.close();

  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const ids = Object.keys(res[res.length - 1].out.rows);
  const band = (v, m) => (v < m * 0.75 || v > m * 1.25);
  const outOf = (rows, key) => {
    const m = med(ids.map(i => rows[i][key]));
    return { m, bad: ids.filter(i => band(rows[i][key], m)) };
  };

  console.log('  상자 사다리(게임px 반지름 → 기기px 상자): ' +
    res.map(r => 'R' + r.out.box.R + '=' + r.out.box.bw + '²').join(' · ') + '\n');

  /* 종별 — 사다리를 가로로 눕힌다 */
  console.log('  종        ' + res.map(r => ('R' + r.out.box.R + ' 본체/제손/보임(테두리)').padEnd(30)).join(''));
  for (const i of ids) {
    console.log('  ' + i.padEnd(9) + res.map(r => {
      const x = r.out.rows[i];
      return (x ? (x.body + '/' + x.own + '/' + x.vis + '(' + x.edge + ')') : '-').padEnd(30);
    }).join(''));
  }
  console.log('');

  /* 사다리 각 칸의 판정 — 상자가 커질 때 «밖» 이 어떻게 움직이나 */
  console.log('  상자    테두리에 닿는 종        본체눈금 밴드 밖            제손눈금 밴드 밖');
  for (const r of res) {
    const rows = r.out.rows;
    const clip = ids.filter(i => rows[i] && rows[i].edge > 0);
    const b = outOf(rows, 'body'), o = outOf(rows, 'own');
    console.log('  R' + String(r.out.box.R).padEnd(6) +
      String(clip.length + '종 ' + (clip.map(i => i + ':' + rows[i].edge).join(',') || '-')).padEnd(24) +
      String(b.bad.length + '종(중앙 ' + b.m + ') ' + (b.bad.join(',') || '-')).padEnd(27) +
      o.bad.length + '종(중앙 ' + o.m + ') ' + (o.bad.join(',') || '-'));
  }
  console.log('');

  const last = res[res.length - 1].out.rows, first = res[0].out.rows;
  const clipLast = ids.filter(i => last[i].edge > 0);
  const clipFirst = ids.filter(i => first[i].edge > 0);
  const settled = res.filter(r => ids.every(i => r.out.rows[i] && r.out.rows[i].edge === 0));

  ok(ids.length === 17, '[1] 투사체를 내는 종 ' + ids.length + '종을 쟀다');
  ok(clipFirst.length > 0 && clipLast.length === 0,
     '[2] ⓑ 상자 — 자의 상자(R' + res[0].out.box.R + ')는 ' + clipFirst.length + '종을 자르고(' +
     clipFirst.map(i => i + ':' + first[i].edge).join(' · ') + '), 사다리 끝(R' +
     res[res.length - 1].out.box.R + ')에서는 닿는 종 0 — **상자를 키우면 멎는다**');
  ok(settled.length >= 2 && ids.every(i => {
       const a = settled[0].out.rows[i], b = settled[settled.length - 1].out.rows[i];
       return Math.abs(a.body - b.body) < 0.05 && Math.abs(a.own - b.own) < 0.05;
     }),
     '[3] 값이 **멎는다** — 닿는 종 0 인 상자가 ' + settled.length + '칸이고 그 사이에서 본체·제손 눈금이 한 종도 안 움직인다 (R' +
     (settled[0] ? settled[0].out.box.R : '-') + '~R' + (settled.length ? settled[settled.length - 1].out.box.R : '-') +
     ') ⇒ «잉크가 테두리에 닿으면 키워서 다시 잰다» 가 수렴한다');
  {
    const b0 = outOf(first, 'body'), bL = outOf(last, 'body');
    ok(b0.bad.length === 0 && bL.bad.length > 0,
       '[4] ⓑ 확정 — **같은 눈금(본체)인데 상자만 키우면 판정이 뒤집힌다**: R' + res[0].out.box.R +
       ' 밖 ' + b0.bad.length + '종(중앙 ' + b0.m + ') ↔ R' + res[res.length - 1].out.box.R +
       ' 밖 ' + bL.bad.length + '종(중앙 ' + bL.m + ' · ' + bL.bad.map(i => i + ':' + last[i].body).join(' · ') +
       ') ⇒ [E1] 의 초록은 상자가 만든 것이다');
  }
  {
    const o = outOf(last, 'own');
    const fire = ids.filter(i => last[i].fFar > 0.03);
    ok(o.bad.length > 0,
       '[5] ⓐ 확정 — **제 손으로 깐 반투명 부품**을 눈금에 넣으면 밴드 밖 ' + o.bad.length + '종(중앙 ' +
       o.m + ' · ' + o.bad.map(i => i + ':' + last[i].own).join(' · ') + ') · 그 부품을 가진 종은 ' +
       fire.map(i => i + ':' + last[i].fFar).join(' · ') + ' ([B8s] 가 찍어 둔 그 종들이다)');
  }
  {
    const diff = ids.filter(i => last[i].sameBase > 0);
    ok(diff.length === 1 && diff[0] === 'meteor',
       '[6] «발이 그림 말고 또 무엇을 그리나» — 발을 놓되 그림만 끈 판이 «발 없는 장면» 과 다른 종 ' +
       diff.length + '종 (' + diff.map(i => i + ':' + last[i].sameBase + '화소').join(' · ') +
       ') — 운석의 **낙하 예고 링**(반경 = 실제 피해 반경 · 541 이 크기 배수에서 뺀 부품)뿐이다');
  }
  ok(res.every(r => r.errs.length === 0), '[7] 콘솔/페이지 오류 0건');

  console.log('\nPROBE989 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
