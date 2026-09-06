/* 792 12회차 재현 — **③ 덩치에서 자와 눈이 다른 것을 잰다** (2026-09-06, sess-1113-29513 루틴 워커 A)
 *
 *   node tools/probe792r12.js
 *
 * ── 무엇을 묻나 ───────────────────────────────────────────────────────────
 * 12회차 채점에서 비평가 **둘 다** ③ 덩치를 3 으로 깎았다. 브리핑이 «③ 은 대각 밴드로
 * 규격이 이미 섰다(중앙값 ±25% 안에 17종 전부)» 라고 **명시했는데도** 둘이 각자 독립으로
 * 렌더된 대조 시트를 재서 그것을 뒤집었다:
 *   · CX  boom +32.5% · flask +32.6% · stone −27.1%  (중앙값 162.9)
 *   · CY  flask +35.1% · boom +26.3% · stone −27.1%  (중앙값 162.9)
 * 그런데 `verify792` [E1] 은 같은 트리에서 **밖 0종**(중앙값 145 · 밴드 108.8~181.3)으로 초록이다.
 *
 * 두 자가 «다른 것» 을 잰다는 가설이 둘 있고, 이 자가 그 둘을 **갈라서** 찍는다:
 *   ⓐ **마스크가 다르다** — [E1] 은 `α ≥ A_BODY(0.55)` 인 **본체**만 잰다. 종이 제 손으로 깐
 *      반투명 부품(화구 불빛·병 불빛·운석 꼬리·창 잔광)은 α < 0.55 라 자의 상자 안에 있어도
 *      **눈금에서 빠진다**. 눈은 그것을 «덩치» 로 센다. ([B8s] 가 이미 그 네 종을 찍어 뒀다.)
 *   ⓑ **상자가 작다** — 자의 측정 상자는 `R = 60` 게임px(= 지름 120게임px · 240기기px)뿐이다.
 *      보이는 잉크가 그보다 크면 **상자 테두리에서 잘린 채** 재진다. 잘린 값은 항상 상자
 *      크기로 수렴하므로 «밴드 안» 이 된다 — **결함이 있어야 초록인 자**(LESSONS 979-②).
 *
 * 그래서 종마다 셋을 같이 찍는다:
 *   · `body`  — [E1] 이 지금 재는 것 그대로(α ≥ 0.55 bbox 대각)
 *   · `vis`   — **보이는 발 전체**(|Δ바탕| > 8 인 잉크 전부 = 후광 + 제 손 부품 포함) bbox 대각
 *   · `edge`  — 그 잉크가 **상자 네 변에 닿았는가**(닿았으면 두 값 다 잘린 값이다)
 *
 * ⚠ 이 자는 **판정하지 않는다** — 갈래를 가르고 수치를 찍는 재현기다(338 규칙: 처방 전에 재현).
 *   판정은 갈래가 갈린 뒤 13회차가 `verify792` 에 세운다.
 * ⚠ 상자를 키워서 재는 것이 이 자의 본체이므로 `R` 을 **인자로 받는다**(기본 60 = 자와 같은 값,
 *   `--r 150` 으로 키워 본다). 상자를 키우면 이웃 그림이 들어오는지는 `edge` 가 답한다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');
const argR = (() => { const i = process.argv.indexOf('--r'); return i > 0 ? +process.argv[i + 1] : 0; })();

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

  /* 아래 블록은 `verify792.js` measure() 의 장면 세우기와 **같은 자리·같은 처방**이다
     (855 주사위 · 936 상자 · 985 궤도각). 자와 다른 장면에서 재면 두 값을 견줄 수 없다. */
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

    const A_BODY = 0.55;   /* 자와 **같은 값**을 쓴다 — 여기서 다른 값을 쓰면 견줄 수 없다 */
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

      /* 두 마스크를 **한 번에** 만든다 — 잉크 전체(vis)와 본체(body).
         알파 풀이는 자와 같다: α = 1 − (r2 − r1)/(r1 − b) (verify792 주석이 본문). */
      let vx0 = 1e9, vy0 = 1e9, vx1 = -1, vy1 = -1;
      let hx0 = 1e9, hy0 = 1e9, hx1 = -1, hy1 = -1;
      let edge = 0, vInk = 0, bInk = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const x = p % bw, y = (p - x) / bw;
        vInk++;
        if (x < vx0) vx0 = x; if (x > vx1) vx1 = x;
        if (y < vy0) vy0 = y; if (y > vy1) vy1 = y;
        if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) edge++;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) {
          bInk++;
          if (x < hx0) hx0 = x; if (x > hx1) hx1 = x;
          if (y < hy0) hy0 = y; if (y > hy1) hy1 = y;
        }
      }
      const bw2 = hx1 < 0 ? 0 : hx1 - hx0 + 1, bh2 = hy1 < 0 ? 0 : hy1 - hy0 + 1;
      const vw = vx1 < 0 ? 0 : vx1 - vx0 + 1, vh = vy1 < 0 ? 0 : vy1 - vy0 + 1;
      rows[id] = { sh: sp.sh,
                   body: +Math.hypot(bw2, bh2).toFixed(1), bw: bw2, bh: bh2, bInk,
                   vis: +Math.hypot(vw, vh).toFixed(1), vw, vh, vInk, edge };
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
  console.log('=== PROBE 792-r12 — ③ 덩치: 자(본체)와 눈(보이는 발)이 다른 것을 잰다 ===\n');

  /* 두 상자에서 잰다 — 갈래 ⓑ(«상자가 작다»)는 상자를 키워야만 갈린다 */
  const A = await measure(browser, 60);                  /* 자와 같은 상자 */
  const B = await measure(browser, argR || 150);         /* 넉넉한 상자 */
  await browser.close();

  if (A.out.__err || B.out.__err) { console.log('  FAIL 측정 실패: ' + (A.out.__err || B.out.__err)); process.exit(1); }

  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const ids = Object.keys(B.out.rows);
  const band = (v, m) => (v < m * 0.75 || v > m * 1.25);

  console.log('  상자 A = R' + A.out.box.R + '(자와 같다 · ' + A.out.box.bw + '×' + A.out.box.bh + '기기px)' +
              ' · 상자 B = R' + B.out.box.R + '(' + B.out.box.bw + '×' + B.out.box.bh + ')\n');

  const bodyB = ids.map(i => B.out.rows[i].body), visB = ids.map(i => B.out.rows[i].vis);
  const mBody = med(bodyB), mVis = med(visB);
  console.log('  종        본체A   본체B    보임B   보임÷본체   A상자 테두리 화소');
  for (const i of ids) {
    const a = A.out.rows[i] || {}, b = B.out.rows[i];
    console.log('  ' + i.padEnd(9) +
      String(a.body === undefined ? '-' : a.body).padStart(6) +
      String(b.body).padStart(8) + String(b.vis).padStart(9) +
      ('×' + (b.vis / Math.max(1, b.body)).toFixed(2)).padStart(11) +
      String(a.edge === undefined ? '-' : a.edge).padStart(12) +
      (band(b.vis, mVis) ? '   ← 보임 밴드 밖' : ''));
  }
  console.log('');

  const clipped = ids.filter(i => (A.out.rows[i] || {}).edge > 0);
  const visBad = ids.filter(i => band(B.out.rows[i].vis, mVis));
  const bodyBad = ids.filter(i => band(B.out.rows[i].body, mBody));

  /* 같은 눈금(본체)을 **상자만 바꿔** 두 번 잰다 — 이것이 갈래 ⓑ 를 가르는 대조다 */
  const bodyA = ids.filter(i => A.out.rows[i]).map(i => A.out.rows[i].body);
  const mBodyA = med(bodyA);
  const bodyBadA = ids.filter(i => A.out.rows[i] && band(A.out.rows[i].body, mBodyA));

  /* 잘린 종을 뺀 밴드도 같이 찍는다 — 한 종의 큰 값이 중앙값을 끌어 «밖» 을 만드는 것과
     실제로 큰 것을 구분하려면 두 값이 다 필요하다(825 «문턱에 붙어 흔들리면» 의 예방). */
  const idsNC = ids.filter(i => !clipped.includes(i));
  const mVisNC = med(idsNC.map(i => B.out.rows[i].vis));
  const visBadNC = idsNC.filter(i => band(B.out.rows[i].vis, mVisNC));

  ok(ids.length === 17, '[1] 투사체를 내는 종 ' + ids.length + '종을 쟀다 (실측 ' + ids.length + ')');
  ok(clipped.length > 0,
     '[2] 갈래 ⓑ — **자의 상자(R' + A.out.box.R + ')가 잉크를 자른다**: 테두리에 닿는 종 ' +
     clipped.length + '종' + (clipped.length ? ' (' + clipped.map(i => i + ':' + A.out.rows[i].edge).join(' · ') + ')' : '') +
     ' — 잘린 값은 상자 크기로 수렴하므로 [E1] 이 그 종을 «밴드 안» 으로 읽는다');
  ok(bodyBadA.length === 0 && bodyBad.length > 0,
     '[3] 갈래 ⓑ 확정 — **같은 눈금(본체)인데 상자만 바꾸면 판정이 뒤집힌다**: R' + A.out.box.R +
     ' 에서 밴드 밖 ' + bodyBadA.length + '종(중앙값 ' + mBodyA + 'px) ↔ R' + B.out.box.R +
     ' 에서 밴드 밖 ' + bodyBad.length + '종(중앙값 ' + mBody + 'px' +
     (bodyBad.length ? ' · ' + bodyBad.map(i => i + ':' + B.out.rows[i].body).join(' · ') : '') +
     ') ⇒ **[E1] 의 초록은 상자가 만든 것**이다');
  ok(visBad.length > 0 && visBadNC.length > 0,
     '[4] 갈래 ⓐ — **보이는 발**(후광 + 제 손 부품)로 재면 밴드 밖 ' + visBad.length + '종(중앙값 ' +
     mVis + 'px)' + (visBad.length ? ' (' + visBad.map(i => i + ':' + B.out.rows[i].vis).join(' · ') + ')' : '') +
     ' · 잘린 종을 빼도 밖 ' + visBadNC.length + '종(중앙값 ' + mVisNC + 'px · ' +
     (mVisNC * 0.75).toFixed(1) + '~' + (mVisNC * 1.25).toFixed(1) + ')' +
     (visBadNC.length ? ' (' + visBadNC.map(i => i + ':' + B.out.rows[i].vis).join(' · ') + ')' : '') +
     ' — 비평가 CX·CY 가 각자 잰 것이 이 눈금이다(둘 다 boom·flask 를 지목했다)');
  ok((A.errs.length + B.errs.length) === 0, '[5] 콘솔/페이지 오류 0건 (실측 ' + (A.errs.length + B.errs.length) + ')');

  console.log('\nPROBE792R12 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
