/* 작업 985 재현 — «`measure()` 계열의 실시간 1.1초가 판마다 다른 자리를 만든다»
 *
 *   node tools/probe985.js [--runs N] [--mode real|frames|pin] [--all]
 *
 * 등재문(PROGRESS 985)이 물은 것: `verify792.js` `measure()` 가 `page.goto` 뒤
 * **1.1초를 실시간으로** 기다리는 동안 판마다 다른 프레임 수가 돌고, 그 뒤에 재는
 * `spiral` 본체 bbox 폭이 **89·91·93** 으로 흔들린다. 등재문이 시킨 대로 **재현이 먼저**다
 * (338 규칙) — 그리고 재현은 «폭이 흔들린다» 를 확인하는 것으로 끝나지 않고
 * **어느 축이 흔드는가**(1.1초인가, 다른 것인가)를 갈라야 한다.
 *
 * 모드 — 넷 다 «재는 방법» 은 글자 하나까지 같고 **부팅에서 재기까지의 자리 잡기만** 다르다:
 *   · `real`   — 지금 그대로(`waitForTimeout(1100)`).
 *   · `frames` — 등재문이 준 첫 후보. 실시간 1.1초를 **프레임 수**(rAF 66틱)로 바꾼다.
 *                ⚠ 이것만으로는 못 고친다는 것을 이 자가 보여 준다 — 메인 루프의 `dt` 가
 *                  여전히 **진짜 시계**라 카메라 감쇠가 판마다 다른 값에 앉는다.
 *   · `pin`    — 936 의 처방을 카메라까지 넓힌 것. 재기 직전에 카메라를 제품의 «집»
 *                (`camClamp(player.x, player.y)` — `spawnStage()` 가 쓰는 바로 그 줄)에
 *                도로 앉힌다. 좌표를 손으로 적지 않는다(402).
 *
 * 찍는 것: 부팅 프레임 수 · `cam.x/cam.y` · `camOx/camOy`(와 그 소수부) ·
 *          종별 본체 bbox(w×h)·본체 화소 수. 판이 여럿이면 **판 사이 최대−최소**를 같이 낸다.
 *
 * 종료 코드 — 0 통과 · 1 오류/FAIL · 3 못 쟀다 (939 규약).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const RUNS = Math.max(1, parseInt(argOf('--runs', '3'), 10) || 3);
const MODES = argv.includes('--mode') ? [argOf('--mode', 'real')] : ['real', 'frames', 'pin', 'orbit'];
const ALL = argv.includes('--all');
/* 등재문이 지목한 종. `--all` 이면 17종 전부. */
const WATCH = ['spiral', 'shuri', 'lance'];

/* `verify792.js` `measure()` 의 자리 잡기와 **같은 값**이다(사본이 아니라 같은 산수를 다시 적은 것 —
   자를 통째로 부르면 44초가 들고, 이 재현이 묻는 것은 그 자의 «부팅~재기» 앞부분뿐이다). */
const BOOT_MS = 1100;
const BOOT_FRAMES = 66;              /* 1100ms ÷ 60fps — 프레임 수로 바꾼 사본의 눈금 */

async function once(browser, mode, opts) {
  const ORBIT = (opts && opts.orbit !== undefined) ? +opts.orbit : 0;
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);

  /* 부팅 프레임을 센다 — «실시간 1.1초» 가 판마다 몇 틱인지가 이 재현의 첫 수치다. */
  await page.evaluate(() => {
    window.__p985 = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => raf((t) => { window.__p985++; return fn(t); });
  });

  if (mode === 'frames') {
    await page.evaluate((n) => new Promise((res) => {
      let i = 0;
      const tick = () => { if (++i >= n) return res(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), BOOT_FRAMES);
  } else {
    await page.waitForTimeout(BOOT_MS);
  }

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const frames = await ev(() => window.__p985 | 0);
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev((cfg) => {
    /* 855 — 주사위 고정 (`verify792` 와 같은 자리·같은 씨앗) */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();

    /* ⚑ `pin` — 재기 직전에 카메라를 제품의 «집» 에 도로 앉힌다.
       좌표는 제품에서 판다(`spawnStage()` 가 쓰는 바로 그 두 줄) — 자에 손으로 적으면 사본이다(402). */
    if (cfg.mode === 'pin') {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      const c = camClamp(player.x, player.y); cam.x = c.x; cam.y = c.y;
      draw();
    }
    const ox = camOx, oy = camOy;
    const camSnap = { cx: cam.x, cy: cam.y, ox, oy };

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

    /* ⚑⚑ `orbit` — 이 재현이 실제로 찾아낸 축. `orbitAng` 은 `step()` 안에서
       `orbitAng += dt*2.4` 로 **누적**되는 각이고, 부팅 1.1초·`putFoe()` 의 «적이 나올 때까지»
       루프가 그 값을 판마다 다른 자리에 놓는다. `spiral` 은 발사각을 `base = orbitAng*0.7`
       로 잡으므로(index.html 26291) 같은 발이 **판마다 다른 각으로** 찍힌다.
       ⚠ `putFoe()` **뒤**에 세워야 한다 — 그 안의 `step()` 이 다시 굴린다. */
    if (cfg.mode === 'orbit') { putFoe(); orbitAng = cfg.orbit; }
    const specs = {};
    const castAt = { px: player.x, py: player.y, aim: player.aim, orbit: orbitAng };
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
    /* ⚑ 985 재현의 두 번째 수치 — **발을 만든 순간의 플레이어 자리**.
       `specs` 는 «그 스킬이 실제로 만든 첫 발» 을 그대로 베끼는데(`sa` = 그때의 발사각),
       936 의 자리 못박기는 이 고리가 **끝난 뒤**에 온다. */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;
    const base = grab();

    const A_BODY = 0.55;
    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      clearFx(); shots.push(mk());         const a0 = grab();
      clearFx(); shots.push(mk(), mk());   const a2 = grab();
      let ink = 0, hard = 0;
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        ink++;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) {
          hard++;
          const x = p % bw, y = (p - x) / bw;
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (y < by0) by0 = y; if (y > by1) by1 = y;
        }
      }
      rows[id] = { bbw: bx1 < 0 ? 0 : bx1 - bx0 + 1, bbh: by1 < 0 ? 0 : by1 - by0 + 1, ink, hard };
      clearFx();
    }
    performance.now = _now;
    const sas = {};
    for (const id in specs) sas[id] = specs[id].sa;
    return { cam: camSnap, box: { CX, CY }, rows, castAt, sas };
  }, { mode, orbit: ORBIT });

  await ctx.close();
  if (out && out.__err) return { err: out.__err, frames };
  return { frames, errs: errs.length, ...out };
}

const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const frac = (v) => f2(v - Math.floor(v));

async function main() {
  /* `verify792` 와 같은 인자 — 없으면 `getImageData` 가 file:// 에서 «tainted» 로 죽는다 */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let bad = 0;
  const summary = {};
  for (const mode of MODES) {
    console.log('\n=== PROBE 985 — mode=' + mode + ' · ' + RUNS + '판 ===');
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await once(browser, mode);
      if (r.err) { console.log('  FAIL 판 ' + (i + 1) + ' — evaluate 예외: ' + r.err); bad++; continue; }
      runs.push(r);
      console.log('  판 ' + (i + 1) + ' — 부팅 프레임 ' + r.frames +
        ' · cam ' + f2(r.cam.cx) + ',' + f2(r.cam.cy) +
        ' · camOx ' + f2(r.cam.ox) + '(소수 ' + frac(r.cam.ox) + ')' +
        ' · camOy ' + f2(r.cam.oy) + '(소수 ' + frac(r.cam.oy) + ')' +
        ' · 상자 ' + r.box.CX + ',' + r.box.CY +
        ' · 콘솔오류 ' + r.errs +
        '\n         발 만들 때 player ' + f2(r.castAt.px) + ',' + f2(r.castAt.py) +
        ' · aim ' + (r.castAt.aim === undefined ? '—' : f2(r.castAt.aim)) +
        ' · orbitAng ' + f2(r.castAt.orbit));
    }
    if (!runs.length) { console.log('  (판이 하나도 안 돌았다)'); continue; }
    const ids = ALL ? Object.keys(runs[0].rows) : WATCH.filter((k) => runs[0].rows[k]);
    let worst = 0;
    console.log('  [표] 종 — 판별 본체 bbox(w×h) · 본체화소 · 폭 최대−최소');
    for (const id of ids) {
      const ws = runs.map((r) => r.rows[id] && r.rows[id].bbw).filter((v) => v !== undefined);
      const spread = ws.length ? Math.max(...ws) - Math.min(...ws) : 0;
      if (spread > worst) worst = spread;
      console.log('    ' + id.padEnd(8) +
        runs.map((r) => (r.rows[id] ? r.rows[id].bbw + '×' + r.rows[id].bbh : '—')).join(' · ').padEnd(34) +
        ' | 본체화소 ' + runs.map((r) => (r.rows[id] ? r.rows[id].hard : '—')).join('/') +
        ' | sa ' + runs.map((r) => (r.sas[id] === undefined ? '—' : f2(r.sas[id]))).join('/') +
        ' | Δ폭 ' + spread);
    }
    const oxs = runs.map((r) => r.cam.ox);
    const oxSpread = Math.max(...oxs) - Math.min(...oxs);
    summary[mode] = { worst, oxSpread, frames: runs.map((r) => r.frames) };
    console.log('  ⇒ camOx 판 사이 폭 ' + f2(oxSpread) + ' · 본체 bbox 폭 최대 흔들림 ' + worst + 'px');
  }
  await browser.close();

  console.log('\n=== 요약 ===');
  for (const m of Object.keys(summary)) {
    const s = summary[m];
    console.log('  ' + m.padEnd(7) + ' — 부팅 프레임 ' + s.frames.join('/') +
      ' · camOx 폭 ' + f2(s.oxSpread) + ' · bbox 폭 흔들림 ' + s.worst + 'px' +
      (s.worst === 0 && s.oxSpread === 0 ? '  ← 붙박이' : ''));
  }
  process.exit(bad ? 1 : 0);
}

/* `verify985.js` 가 이 자를 **부품으로** 부른다 — 같은 재는 방법을 두 번 적지 않기 위해서다(402). */
module.exports = { once, BOOT_MS, BOOT_FRAMES, WATCH };

if (require.main === module) {
  main().catch((e) => { console.error('probe985 — 못 쟀다: ' + (e && e.message ? e.message : e)); process.exit(3); });
}
