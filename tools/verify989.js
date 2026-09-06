/* 989 — **`verify792` [E1] 이 «결함이 있어야 초록» 이던 자리**를 못박는다 (2026-09-06, sess-1158-5775 루틴 워커 D)
 *
 *   node tools/verify989.js
 *
 * ── 무엇을 지키나 ─────────────────────────────────────────────────────────
 * [E1] 의 초록은 두 군데서 «만들어지고» 있었다(등재문 ⓐⓑ · 재현 `probe989`):
 *   ⓐ **눈금이 좁다** — `α ≥ 0.55` 본체만 재서, 종이 **제 손으로 깐 반투명 부품**
 *      (화구 불빛 · 병 불빛 · 운석 불꼬리)이 눈금에서 빠졌다. 눈은 그것을 덩치로 센다.
 *   ⓑ **상자가 작다** — 측정 상자 R60 이 `meteor` 의 잉크를 잘랐고, **잘린 값은 상자 크기로
 *      수렴하므로** 그 종이 «밴드 안» 으로 읽혔다.
 *   ⓒ 그리고 그 밑에 하나 더 있었다 — 바탕이 «발이 없는 장면» 이라, 운석이 지면에 까는
 *      **낙하 예고 링**(반경 = 실제 피해 반경 · 541 이 크기 배수에서 뺀 부품)이 발의 그림에
 *      통째로 섞여 들었다(상자를 키우면 대각이 157 → **687.7**).
 *
 * 이 자는 셋을 **각각 되돌려** 그때마다 판정이 뒤집히는 것을 보인다(376-④ — 축마다 되돌림 하나).
 * ⚠ 문턱(±25%)은 한 글자도 안 건드린다 — 넓혀서 초록으로 되돌리는 것이 이 행이 고친 병이다(979-②).
 *
 * ── 1003 수리(2026-09-06) — «989 직전 사본» 을 **굽지 말고 꺼낸다** ────────────
 * 1회차의 사본은 «**오늘 트리** + `SHOT_SC` 한 줄 되돌림» 이었다. 등재 당시엔 그것이 곧
 * 989 직전 트리였지만(실측 — 534fce3 의 `SHOT_SC` 는 `PRE989` 와 **글자까지 같다**),
 * 그 뒤 981 5회차가 «도약탄 두 마디 → 세 마디 지그재그» 로 **그림을 갈아** 사본이 갈라졌다:
 * `bounce` 의 본체 대각이 옛 배율에서 158.5 → **218.7** 로 뛰어 **옛 눈금 쪽도 밴드 밖**이 되고,
 * [R2] 가 지키던 «옛 눈금은 초록 ↔ 새 눈금은 빨강» 대조가 **성립하지 않게** 됐다(등재 1003).
 * ⇒ 사본을 **고정 SHA**(`PRE_SHA`)에서 꺼낸다(`gitrev756` 사다리). 그러면 두 눈금이
 *   **한 트리**를 재므로 축이 정확히 하나다(376-④) — 그리고 그 트리는 **앞으로도 안 변한다**.
 * ⚠ 문턱을 넓히거나 [R2] 를 «개수 견줌» 으로 무르게 푸는 길로 가지 않았다 — 이 항이 지키는 것은
 *   «[E1] 의 초록은 눈금이 만든 것이었다» 는 989 의 근거 **그 자체**라, 대조가 살아 있어야 한다.
 *   구운 사본이 왜 못 쓰게 됐는지는 [R2b] 가 **매 실행 다시 증명한다**(되돌림 시험).
 * ⚠ **접는 법은 대각 그대로다(995 뒤에도)** — 1003 실측: 진짜 989 직전 트리를 995 의 눈금
 *   (최대 변)으로 접으면 본체 밖 **5종** · 제손 밖 **7종** 으로 **둘 다 빨강**이라 대조가 없다.
 *   최대 변 밴드는 792 가 `SHOT_SC` 로 아직 닫는 중인 **절대 밴드**이고(오늘 트리도 밖 5종),
 *   989 의 축은 «본체만 ↔ 본체+제 손 부품» **한 가지**다. 그 축에서 초록↔빨강이 서는 접는 법이
 *   대각이므로 여기서는 대각으로 접는다. 접는 산수 자체는 998 부품(`bulk998.band`)을 쓴다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const G = require('./gitrev756');
const B998 = require('./bulk998');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const url = (f) => 'file://' + f;

/* **989 직전 트리** — 굽지 않고 이 SHA 에서 통째로 꺼낸다(1003). `claim(989)` 의 부모다.
   ⚠ 얕은 클론이면 `gitrev756` 사다리가 판다 — 못 파면 **환경**이라 ⏸ 보류(세지 않는다). */
const PRE_SHA = '534fce3dec0874b7a7624f56b84cffa80cbad5b5';
const PRE_SINCE = '2026-09-05';         /* 사다리 첫 칸(날짜) — 표본이 고정이라 안 썩는다(756) */
const NEG_REAL = path.join(ROOT, '.v989-pre-' + process.pid + '.html');

/* **1회차의 구운 사본** — 배율표를 «989 가 얹기 전» 값으로 되돌린 한 줄. 이제 판정에는 안 쓰고
   [R2b] 가 «왜 이 사본으로는 축이 안 갈리는가» 를 **매 실행 다시 증명하는** 데만 쓴다(1003).
   ⚠ `verify792` [R5] 처럼 표를 **비우면** arc·rock·moon·arrow·ball 까지 같이 풀려
     «눈금 축» 이 아니라 «표 전체» 를 되돌리게 된다 — 1회차에 실제로 그렇게 세웠다가
     [R2] 가 «옛 눈금도 빨갛다» 로 빨개졌다(376-④ — 되돌림은 **축 하나씩** 이라야 뜻이 있다). */
const killLine = (src, tag, repl) =>
  src.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'), repl);
const NEG_SC = path.join(ROOT, '.v989-neg-sc-' + process.pid + '.html');
const PRE989 = `const SHOT_SC = { arc: 1.18, rock: 1.15, moon: 1.27, arrow: 0.89, ball: 0.89, rockfall: 0.93 };`;
const TAG_SC = `const SHOT_SC = { arc:`;

const DIAG_TOL = 0.25;      /* `verify792` 와 **같은 값** — 자마다 따로 적으면 그것이 곧 사본이다(402) */
const A_BODY = 0.55;
const CBAND = 18;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 한 장면에서 종마다 네 눈금을 잰다.
     body — 본체(α ≥ A_BODY) bbox 대각            = **옛 [E1] 눈금**
     own  — 본체 ∪ 제 손 부품(본체에서 CBAND 밖)   = **지금 [E1] 눈금**
     vis  — 보이는 잉크 전부(공용 링까지)          = 눈이 재는 상한
     edge — 잉크가 상자 테두리에 닿은 화소 수
   `ringBase`: false 면 바탕이 «발을 놓되 그림만 끈 판»(지금 자), true 면 «발이 없는 장면»(옛 자). */
async function measure(browser, file, R, ringBase) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url(file));
  await page.waitForTimeout(1100);
  const ev = async (fn, a) => {
    try { return await page.evaluate(fn, a); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 장면 세우기는 `verify792.js` measure() 와 **같은 자리·같은 처방**(855 주사위 · 936 상자). */
  const out = await ev((A) => {
    const { R, ringBase, A_BODY, CBAND } = A;
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
    const mk = (sp, ex) => Object.assign(
      { k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
        dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
        spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
        tx: sp.tx === undefined ? undefined : CX - ox,
        ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 }, ex || {});

    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;
    clearFx();
    const empty = grab();                       /* 발이 없는 장면 */

    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      clearFx(); shots.push(mk(sp, { mf: 0 })); const shotless = grab();
      const bs = ringBase ? empty : shotless;   /* ← 되돌림 축 ⓒ */
      clearFx(); shots.push(mk(sp));             const a0 = grab();
      clearFx(); shots.push(mk(sp), mk(sp));     const a2 = grab();

      const hd = new Uint8Array(bw * bh), sf = new Uint8Array(bw * bh);
      let edge = 0, dBase = 0;
      let vx0 = 1e9, vy0 = 1e9, vx1 = -1, vy1 = -1;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        if (Math.abs(shotless[i] - empty[i]) > 8 || Math.abs(shotless[i + 1] - empty[i + 1]) > 8 ||
            Math.abs(shotless[i + 2] - empty[i + 2]) > 8) dBase++;
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - bs[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const x = p % bw, y = (p - x) / bw;
        if (x < vx0) vx0 = x; if (x > vx1) vx1 = x;
        if (y < vy0) vy0 = y; if (y > vy1) vy1 = y;
        if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) edge++;
        const d1 = a0[i + c] - bs[i + c], d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) hd[p] = 1; else sf[p] = 1;
      }

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

      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      let ox0 = 1e9, oy0 = 1e9, ox1 = -1, oy1 = -1;
      let far = 0, soft = 0;
      for (let p = 0; p < hd.length; p++) {
        const x = p % bw, y = (p - x) / bw;
        if (hd[p]) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
        } else {
          if (!(sf[p] && outm[p])) continue;
          soft++;
          if (dtm[p] <= CBAND) continue;
          far++;
        }
        if (x < ox0) ox0 = x; if (x > ox1) ox1 = x;
        if (y < oy0) oy0 = y; if (y > oy1) oy1 = y;
      }
      const dg = (x0, y0, x1, y1) => (x1 < 0 ? 0 : +Math.hypot(x1 - x0 + 1, y1 - y0 + 1).toFixed(1));
      rows[id] = { sh: sp.sh, edge, dBase,
                   body: dg(bx0, by0, bx1, by1),
                   own: dg(ox0, oy0, ox1, oy1),
                   vis: dg(vx0, vy0, vx1, vy1),
                   fFar: +(far / Math.max(1, soft)).toFixed(3) };
      clearFx();
    }
    performance.now = _now;
    return { rows, box: { R, bw } };
  }, { R, ringBase, A_BODY, CBAND });

  await ctx.close();
  return { out, errs };
}

/* 접는 산수는 **998 부품 한 벌**이다 — 자마다 다시 적으면 그것이 곧 사본이고(402), 1001 이
   그 네 번째 사본을 걷어냈다. 여기 열쇠는 대각(`body`/`own`/`vis`)이다 — 위 머리말 참조. */
const outBand = (rows, key) => B998.band(rows, DIAG_TOL, key);
const show = (rows, key, r) => r.out.map(i => i + ':' + rows[i][key]).join(' · ') || '없음';

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  fs.writeFileSync(NEG_SC, killLine(src, TAG_SC, PRE989), 'utf8');

  /* **989 직전 트리**를 고정 SHA 에서 꺼낸다(1003). 못 꺼내면 갈린다 —
     얕은 클론이라 못 판 것이면 **환경**(⏸ 보류, 세지 않는다) · 안 얕은데 없으면 **빨강**. */
  const pre = G.show(PRE_SHA, 'index.html', { since: PRE_SINCE });
  if (pre.ok) fs.writeFileSync(NEG_REAL, pre.buf);

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  console.log('=== VERIFY 989 — [E1] 의 «결함이 있어야 초록» 을 세 축으로 못박는다 ===\n');
  console.log('  989 직전 트리 = ' + PRE_SHA.slice(0, 7) +
              (pre.ok ? ' (꺼냈다' + (pre.how || ' — 클론에 이미 있었다') + ')' : ' ✗ ' + pre.why) + '\n');

  /* ① 지금 트리 · 지금 자(상자는 792 가 사다리로 고른 값과 같은 자리에서 닿음 0 인 R60) */
  const now = await measure(browser, SRC, 60, false);
  /* ② 되돌림 ⓒ — 바탕을 «발이 없는 장면» 으로(낙하 예고 링이 섞인다) · 상자는 넉넉히 */
  const ring = await measure(browser, SRC, 240, true);
  /* ③ 되돌림 ⓑ+ⓐ — **989 직전 트리**에서 상자 R60 ↔ R240 */
  const negS = pre.ok ? await measure(browser, NEG_REAL, 60, false) : null;
  const negB = pre.ok ? await measure(browser, NEG_REAL, 240, false) : null;
  /* ④ [R2b] — 1회차가 구웠던 사본(오늘 트리 + 한 줄 되돌림). 판정이 아니라 «왜 못 쓰나» 의 증거다. */
  const bakeB = await measure(browser, NEG_SC, 240, false);
  await browser.close();
  for (const f of [NEG_SC, NEG_REAL]) { try { fs.unlinkSync(f); } catch (e) { /* 지워지면 그만 */ } }

  const runs = [['지금', now], ['링바탕', ring], ['구운사본R240', bakeB]]
    .concat(pre.ok ? [['직전R60', negS], ['직전R240', negB]] : []);
  for (const [n, r] of runs) {
    if (r.out.__err) { console.log('  FAIL 측정 실패(' + n + '): ' + r.out.__err); process.exit(1); }
  }

  const R = now.out.rows, ids = Object.keys(R);
  const oNow = outBand(R, 'own'), bNow = outBand(R, 'body'), vNow = outBand(R, 'vis');

  console.log('  종        본체 / 제손(=[E1]) / 보임      먼몫    상자테두리');
  for (const i of ids) {
    const r = R[i];
    console.log('  ' + i.padEnd(9) + (r.body + ' / ' + r.own + ' / ' + r.vis).padStart(24) +
                String(r.fFar).padStart(9) + String(r.edge).padStart(11));
  }
  console.log('');

  /* ── 지금 트리 ── */
  ok(ids.length === 17, '[A1] 투사체를 내는 종 ' + ids.length + '종을 쟀다 (17)');
  ok(oNow.out.length === 0,
     '[A2] ③ 덩치 — **본체 + 제 손 부품** 대각이 중앙값 ' + oNow.m + 'px 의 ±' +
     Math.round(DIAG_TOL * 100) + '% (' + oNow.lo + '~' + oNow.hi + ') 안 · 밖 ' +
     oNow.out.length + '종 — ' + show(R, 'own', oNow));
  ok(vNow.out.length === 0,
     '[A3] 문턱이 없는 이웃 눈금(**보이는 발 전부** — 비평가가 대조 시트에서 재는 것)으로도 밖 ' +
     vNow.out.length + '종 (중앙값 ' + vNow.m + 'px) — [E1] 눈금의 CBAND 계단을 타고 «작게 만들어» 통과한 것이 아니다');
  ok(ids.every(i => R[i].edge === 0),
     '[A4] 지금 크기에서는 상자 R60 이 한 종도 안 자른다 — 닿는 종 ' +
     ids.filter(i => R[i].edge > 0).length);

  /* ── 되돌림 ⓐ 눈금 ── */
  ok(bNow.out.length > 0,
     '[R1] **되돌림 ⓐ — 옛 눈금(본체만)으로 재면 지금 트리가 빨개진다**: 밖 ' + bNow.out.length +
     '종(중앙값 ' + bNow.m + ') ' + show(R, 'body', bNow) +
     ' ⇒ 두 눈금은 **다른 것을 잰다**(옛 눈금으로는 규격을 닫을 수 없다)');
  if (!pre.ok && pre.env) {
    console.log('  ⏸ [R2]·[R3] ' + G.skipNote(pre) + ' — 세지 않는다(756 규약 ②)');
  } else if (!pre.ok) {
    ok(false, '[R2]·[R3] **989 직전 트리를 못 꺼냈다**(환경이 아니다): ' + pre.why);
  } else {
    const b = outBand(negB.out.rows, 'body'), o = outBand(negB.out.rows, 'own');
    ok(b.out.length === 0 && o.out.length >= 3,
       '[R2] **되돌림 ⓐ 확정 — 989 직전 트리(' + PRE_SHA.slice(0, 7) + ')에서 옛 눈금(본체만)은 «밖 ' +
       b.out.length + '종» 으로 **초록**인데 새 눈금은 «밖 ' + o.out.length + '종» 으로 **빨갛다** (' +
       show(negB.out.rows, 'own', o) + ' · 중앙값 ' + o.m + ') — [E1] 의 초록은 **눈금이 만든 것**이었다');

    /* ── 되돌림 ⓑ 상자 ── */
    const cS = Object.keys(negS.out.rows).filter(i => negS.out.rows[i].edge > 0);
    const cB = Object.keys(negB.out.rows).filter(i => negB.out.rows[i].edge > 0);
    const shrunk = cS.filter(i => negS.out.rows[i].own < negB.out.rows[i].own);
    ok(cS.length > 0 && cB.length === 0 && shrunk.length > 0,
       '[R3] **되돌림 ⓑ — 상자를 R60 에 못박으면 잉크가 잘린다**: 989 직전 크기에서 닿는 종 ' +
       cS.length + '종 (' + cS.map(i => i + ':' + negS.out.rows[i].edge).join(' · ') +
       ') · 넉넉한 상자(R240)에서는 ' + cB.length + '종 · 잘려서 **작게 읽힌** 종 ' +
       shrunk.map(i => i + ' ' + negS.out.rows[i].own + '→' + negB.out.rows[i].own).join(' · ') +
       ' ⇒ 잘린 값은 상자로 수렴해 «밴드 안» 을 만든다');
  }

  /* ── 1003 — «구운 사본으로는 왜 안 되는가» 를 매 실행 다시 증명한다 ── */
  {
    const bk = outBand(bakeB.out.rows, 'body');
    const moved = Object.keys(bakeB.out.rows).filter(i =>
      pre.ok && Math.abs(bakeB.out.rows[i].body - negB.out.rows[i].body) > 1);
    ok(bk.out.length > 0,
       '[R2b] **1003 — 구운 사본(오늘 트리 + `SHOT_SC` 한 줄 되돌림)으로는 축이 안 갈린다**: ' +
       '그 사본은 옛 눈금(본체만)으로도 **밖 ' + bk.out.length + '종** (' +
       show(bakeB.out.rows, 'body', bk) + ' · 중앙값 ' + bk.m + ') 이라 [R2] 의 «초록↔빨강» 이 없다' +
       (pre.ok ? ' · 진짜 989 직전 트리와 본체 대각이 어긋난 종 ' + moved.length + '종 (' +
         (moved.map(i => i + ' ' + negB.out.rows[i].body + '→' + bakeB.out.rows[i].body).join(' · ') || '없음') +
         ')' : '') +
       ' ⇒ 사본은 **굽지 말고 고정 SHA 에서 꺼낸다**(376-④ · 되돌림은 축 하나씩)');
  }

  /* ── 되돌림 ⓒ 바탕(낙하 예고 링) ── */
  {
    const diff = ids.filter(i => R[i].dBase > 0);
    const jump = Object.keys(ring.out.rows).filter(i => ring.out.rows[i].own > now.out.rows[i].own * 2);
    ok(diff.length === 1 && diff[0] === 'meteor',
       '[R4] 발이 «그림 말고 또 그리는» 종은 ' + diff.length + '종뿐이다 (' +
       diff.map(i => i + ':' + R[i].dBase + '화소').join(' · ') +
       ') — 운석의 낙하 예고 링(반경 = 실제 피해 반경 · 그림이 곧 판정이라 541 이 크기 배수에서 뺐다)');
    ok(jump.length > 0,
       '[R5] **되돌림 ⓒ — 그 링을 발의 그림으로 세면 눈금이 뛴다**: ' +
       jump.map(i => i + ' ' + now.out.rows[i].own + ' → ' + ring.out.rows[i].own).join(' · ') +
       ' ⇒ 바탕을 «발이 없는 장면» 으로 두면 [E1] 은 **다른 부품의 크기**를 재게 된다');
  }

  {
    /* ⚠ 989 직전 트리의 오류까지 여기서 세면 **남의 옛 트리**가 이 자를 빨갛게 만든다 —
       세는 것은 «지금 트리» 와 그 파생 사본뿐이고, 옛 트리 것은 찍기만 한다(1003). */
    const nErr = now.errs.length + ring.errs.length + bakeB.errs.length;
    const oErr = pre.ok ? negS.errs.length + negB.errs.length : 0;
    ok(nErr === 0, '[G1] 콘솔/페이지 오류 0건 — 지금 트리 · 링바탕 · 구운 사본 (실측 ' + nErr + ')' +
       (pre.ok ? ' · (기록) 989 직전 트리 ' + oErr + '건' : ''));
  }

  console.log('\nVERIFY989 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
