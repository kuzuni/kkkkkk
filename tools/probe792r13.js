/* 792 13회차 재현 — **④ 뜻: «주변 참격» 이 도는가**를 잰다 (2026-09-06, sess-1213-2003 루틴 워커 A)
 *
 *   node tools/probe792r13.js
 *
 * ── 무엇을 묻나 ───────────────────────────────────────────────────────────
 * 12회차 채점의 2인 공통 ⓑ 는 **`whirl (cross)` 가 십자가 아니라 도넛 링**이다:
 *   · CX — «반경 변동 **8.8%**(720방향)» = 사실상 완전한 동심원
 *   · CY — «십자 단서는 링 위 **3~4px 노치**뿐»
 * 13회차 인계 1순위이고, ①②③ 이 전부 이 행 밖(981·889·989)인 지금 ④ 는 **792 가 손댈 수 있는
 * 유일한 축**이다.
 *
 * ⚠ 338 규칙 — 처방 전에 **재현**한다. 이 자는 판정하지 않고 갈래를 가르고 수치를 찍는다.
 *   그래서 **두 트리를 같은 자로 잰다**: 지금 트리와, 나선을 끈 사본(= 12회차가 채점한 그림).
 *   사본은 값 두 개(`C_RMP`·`C_TIP`)만 되돌려 만든다 — 획·반지름·토막 수는 그대로다.
 *   ⚠ 사본이 되돌리는 것은 **나선뿐**이다(옛 «둥근 캡 + 틈 0.35rad» 작도까지 되돌리지는 않는다).
 *     그래서 사본 실측은 **3.3%**, 13회차 착수 시점의 실제 트리는 **4.9%** 로 1.6%p 다르다 —
 *     둘 다 «17종 중 화구(3.3%) 급으로 둥글다» 는 같은 자리를 가리키므로 갈래 판정은 안 바뀐다.
 *
 * 갈래는 둘이고 처방이 서로 반대라 먼저 갈라야 했다:
 *   ⓐ **틈이 없다** — `C_GAP` 0.35rad(≈4.0 그리기단위)인데 획 폭이 7.4 라 **둥근 캡이 틈보다
 *      넓다**(양쪽 3.7 씩) ⇒ 세 토막이 그림에서 하나로 붙어 완전한 고리가 된다(CY 의 «노치»).
 *   ⓑ **반지름이 안 움직인다** — 세 토막이 **같은 반지름**에 앉아 바깥선이 원이다(CX 의 «8.8%»).
 * ⚑⚑ **ⓐ 를 처방으로 쓰면 이웃 게이트가 죽는다** — 구멍이 981 [C5] 의 축인데(갇힌 배경 ≥ 300화소 ·
 *   구멍을 가진 다른 종 0개) 틈을 벌리면 그 구멍이 바깥과 이어져 사라진다. ⇒ **ⓑ 로 푼다**:
 *   세 날을 같은 원이 아니라 **나선**에 앉히고 꼬리로 갈수록 가늘게 한다(각으로 겹쳐 고리는 안 끊긴다).
 *
 * ⚑ 이 자가 찍는 눈금(게이트 `verify792` [F1] 이 그대로 쓴다):
 *   · `rvar` = (max r_out − min r_out) ÷ median r_out — 720방향 바깥 반지름의 **변동**
 *   · `tp90/tp10` = 방향별 두께(r_out − r_in)의 백분위 — 날의 **가늘어짐**
 *   · `hole` = 본체가 감싼 배경 화소(`verify981` [C5] 와 **같은 산수**)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const PRE = path.join(ROOT, '.p792r13-pre-' + process.pid + '.html');   /* 나선을 끈 사본 = 12회차가 채점한 그림 */
const SPIRAL = 'C_RMP = 4.2, C_TIP = 0.42';
const FLAT   = 'C_RMP = 0, C_TIP = 1';
const R = 60;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 본체가 **감싼 배경**(구멍) 화소 — `verify981` [C5] 와 같은 산수를 옮겨 왔다(두 값을 견주려면 같아야 한다) */
function holePx(px, bw) {
  const bh = Math.round(px.length / bw), seen = new Uint8Array(px.length), st = [];
  const push = p => { if (!seen[p] && !px[p]) { seen[p] = 1; st.push(p); } };
  for (let x = 0; x < bw; x++) { push(x); push((bh - 1) * bw + x); }
  for (let y = 0; y < bh; y++) { push(y * bw); push(y * bw + bw - 1); }
  while (st.length) {
    const p = st.pop(), x = p % bw, y = (p - x) / bw;
    if (x > 0) push(p - 1); if (x < bw - 1) push(p + 1);
    if (y > 0) push(p - bw); if (y < bh - 1) push(p + bw);
  }
  let h = 0;
  for (let p = 0; p < px.length; p++) if (!px[p] && !seen[p]) h++;
  return h;
}

/* 상자 중심(= 발의 중심)에서 720방향으로 훑어 바깥·안쪽 반지름과 두께를 낸다 */
function polar(px, bw) {
  const bh = Math.round(px.length / bw), cx = (bw - 1) / 2, cy = (bh - 1) / 2;
  const rmax = Math.min(cx, cy), N = 720;
  const rout = [], rin = [], th = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2 * Math.PI / N, ca = Math.cos(a), sa = Math.sin(a);
    let lo = -1, hi = -1;
    for (let r = 0; r <= rmax; r += 0.5) {
      const x = Math.round(cx + ca * r), y = Math.round(cy + sa * r);
      if (x < 0 || y < 0 || x >= bw || y >= bh) break;
      if (px[y * bw + x]) { if (lo < 0) lo = r; hi = r; }
    }
    if (hi < 0) continue;
    rout.push(hi); rin.push(lo); th.push(hi - lo);
  }
  const pc = (a, q) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y);
                         return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
  const mo = pc(rout, 0.5);
  const t90 = pc(th, 0.9), t10 = pc(th, 0.1);
  return { dirs: rout.length,
           rmed: +mo.toFixed(1),
           rmin: +Math.min.apply(null, rout).toFixed(1),
           rmaxv: +Math.max.apply(null, rout).toFixed(1),
           rvar: mo ? +(((Math.max.apply(null, rout) - Math.min.apply(null, rout)) / mo) * 100).toFixed(1) : 0,
           tp90: +t90.toFixed(1), tp10: +t10.toFixed(1),
           taper: t90 ? +(t10 / t90).toFixed(2) : 1 };
}

async function measure(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1100);
  const ev = async (fn, a) => {
    try { return await page.evaluate(fn, a); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 장면 세우기는 `verify792.js`·`probe792r12.js` 의 measure() 와 **같은 자리·같은 처방**이다
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

    const A_BODY = 0.55;   /* 자(`verify792` [E1])와 **같은 값** — 다른 값을 쓰면 견줄 수 없다 */
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

      /* 알파 풀이는 자와 같다: α = 1 − (r2 − r1)/(r1 − b) (verify792 주석이 본문) */
      const body = new Uint8Array(a0.length / 4);
      let bInk = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) { body[p] = 1; bInk++; }
      }
      rows[id] = { sh: sp.sh, bInk, body: Array.from(body) };
      clearFx();
    }
    performance.now = _now;
    return { rows, bw, bh };
  }, R);

  await ctx.close();
  if (out.__err) return { __err: out.__err, errs };

  const st = {};
  for (const id of Object.keys(out.rows)) {
    const px = Uint8Array.from(out.rows[id].body);
    st[id] = Object.assign({ sh: out.rows[id].sh, ink: out.rows[id].bInk, hole: holePx(px, out.bw) },
                           polar(px, out.bw));
  }
  return { st, errs };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  if (src.indexOf(SPIRAL) < 0) {
    console.log('  FAIL [0] 되돌림 앵커(`' + SPIRAL + '`)를 못 찾았다 — 자를 고쳐라(사본이 낡았다)');
    console.log('\nPROBE792R13 0/1 FAIL'); process.exit(1);
  }
  fs.writeFileSync(PRE, src.replace(SPIRAL, FLAT), 'utf8');

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let now, pre;
  try {
    now = await measure(browser, 'file://' + SRC);
    pre = await measure(browser, 'file://' + PRE);
  } finally {
    await browser.close();
    try { fs.unlinkSync(PRE); } catch (_) {}
  }

  console.log('=== PROBE 792-r13 — ④ 뜻: «주변 참격» 이 도는가 (상자 R' + R + ') ===\n');
  if (now.__err || pre.__err) { console.log('  FAIL 측정 실패: ' + (now.__err || pre.__err)); process.exit(1); }

  const ids = Object.keys(now.st);
  console.log('  종        형상       반경중앙  반경최소  반경최대   반경변동%   두께p90/p10  테이퍼   구멍px   본체잉크');
  for (const id of ids) {
    const s = now.st[id];
    console.log('  ' + id.padEnd(9) + s.sh.padEnd(10) +
      String(s.rmed).padStart(8) + String(s.rmin).padStart(10) + String(s.rmaxv).padStart(10) +
      String(s.rvar).padStart(11) + (s.tp90 + '/' + s.tp10).padStart(13) + String(s.taper).padStart(8) +
      String(s.hole).padStart(9) + String(s.ink).padStart(11) +
      (s.sh === 'cross' ? '   ← 이 종' : ''));
  }
  const p = pre.st.whirl || {}, c = now.st.whirl || {};
  console.log('\n  나선을 끈 사본(= 12회차가 채점한 그림 · `' + FLAT + '`):');
  console.log('    whirl    cross  ' + String(p.rmed).padStart(8) + String(p.rmin).padStart(10) +
              String(p.rmaxv).padStart(10) + String(p.rvar).padStart(11) +
              (p.tp90 + '/' + p.tp10).padStart(13) + String(p.taper).padStart(8) +
              String(p.hole).padStart(9) + String(p.ink).padStart(11) + '\n');

  const others = ids.filter(i => now.st[i].sh !== 'cross');
  const rounder = others.filter(i => now.st[i].rvar < p.rvar);
  const rounderNow = others.filter(i => now.st[i].rvar < c.rvar);

  ok(ids.length === 17, '[1] 투사체를 내는 ' + ids.length + '종을 두 트리에서 같은 자로 쟀다');
  ok(p.rvar < 15 && rounder.length <= 1,
     '[2] 재현 — **12회차가 본 그림은 도넛이다**: 나선을 끈 사본의 바깥 반경 변동 ' + p.rvar + '% < 15% ' +
     '(' + p.rmin + '~' + p.rmaxv + ') · 17종 중 이보다 둥근 종은 ' + rounder.length + '개' +
     (rounder.length ? '(' + rounder.map(i => i + ':' + now.st[i].rvar + '%').join(' · ') + ')' : '') +
     ' — **참격 고리가 불덩이만큼 둥글었다**(CX 의 «8.8%» 와 같은 눈금)');
  ok(p.taper > 0.9,
     '[3] 재현 — **날이 안 가늘어진다**: 사본의 방향별 두께 p90 ' + p.tp90 + ' · p10 ' + p.tp10 +
     ' (테이퍼 ' + p.taper + ' > 0.90 = 균일 폭 띠) — CY 의 «십자 단서는 노치 3~4px 뿐» 이 이것이다');
  ok(c.rvar >= 25 && c.taper <= 0.65 && rounderNow.length >= 2,
     '[4] 수리 — **반지름이 돈다**: 변동 ' + p.rvar + '% → **' + c.rvar + '%** (≥ 25) · 테이퍼 ' +
     p.taper + ' → **' + c.taper + '** (≤ 0.65) · 이보다 둥근 종 ' + rounder.length + ' → ' +
     rounderNow.length + '개 (17종 중)');
  ok(c.hole >= 300 && p.hole >= 300,
     '[5] 이웃 축은 그대로다 — 갇힌 배경(981 [C5]) 사본 ' + p.hole + ' → 지금 ' + c.hole +
     '화소, 둘 다 ≥ 300 ⇒ **«틈을 벌린다» 가 아니라 «반지름을 민다» 로 풀었다**' +
     ' (구멍을 가진 다른 종 ' + others.filter(i => now.st[i].hole >= 300).length + '개)');
  ok((now.errs.length + pre.errs.length) === 0,
     '[6] 콘솔/페이지 오류 0건 (실측 ' + (now.errs.length + pre.errs.length) + ')');

  console.log('\nPROBE792R13 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  try { fs.unlinkSync(PRE); } catch (_) {}
  console.log('PROBE792R13 오류 — ' + e.message); process.exit(1);
});
