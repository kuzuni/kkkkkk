/* 작업 752 게이트 — «스킬 투사체가 위로 발사될 때 사각 경계에서 하드 컷» 수리 검증
 *
 *   node tools/verify752.js
 *
 * 수리: EDGE_TOP 130 → 0 (이펙트 경계 = 전투 캔버스 전체) + 클립선 진입 램프(scrY<180) 폐지.
 * 재현·정적 실측은 tools/probe752.js — 수리 전에는 발이 화면 y100 에 실재해도 잉크가 0 이었다.
 *
 * 절:
 *  [A] 발사 스킬 전수 스윕(9:19) — SKILLS «전 종목» 을 실제 시전 경로(castSkill)로 위를 향해 쏘고,
 *      상단 구역(옛 클립선 130 위 · 페이드 폭 밖)에 실재하는 발마다 그 자리 잉크 > 0 을 요구한다.
 *      잉크는 «있음/없음 diff»(probe752 문법 — 바닥·플레이어가 상쇄된다).
 *      740 이후 스킬이 늘어도 표를 다시 안 적는다 — SKILLS 를 페이지에서 직접 돈다.
 *  [B] 직선 절단면 0건 — [A]·[E] 의 모든 스냅숏에서 옛 클립선(게임 y 130) 위/아래 띠가
 *      «아래만 잉크» 인 프레임이 0건이어야 한다(경계 밖 픽셀 유무로 판정 — 등재문 게이트 그대로).
 *  [C] 소스 — EDGE_TOP 0 · 클립 rect 와 edgeDist 가 같은 상수를 봄 · 램프(scrY-130) 부활 금지.
 *  [D] HUD/팝업 침범 0 — 이펙트는 캔버스(z 층 불변)에만 그린다: #fxlc z7 · #fxl z60 ·
 *      캔버스 자신은 z-index 없음(HUD DOM 아래). 수리가 DOM/z 를 만지지 않았다는 짝 항.
 *  [E] 9:13.3(1600) — 대표 6종으로 같은 스윕(좁은 프레임이 더 잘 잘린다 — 등재문).
 *  [R] 되돌림 — EDGE_TOP 130 사본에서는 같은 장면이 «상단 구역 잉크 0» 으로 빨갛다
 *      (이 게이트가 무르지 않다는 증명 — 334 «되돌림 시험» 규약).
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const FIXED = 'const EDGE_TOP = 0;';
const OLD = 'const EDGE_TOP = 130;';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 페이지 안에서 도는 스윕 — ids 가 null 이면 SKILLS 전 종목 */
function sweepInPage(ids) {
  shots.length = 0; ghosts.length = 0; drones.length = 0; bolts.length = 0;
  cam.shake = 0;
  const LINE = 130 * SC, W = cvs.width, H = cvs.height;
  const g2 = cvs.getContext('2d');

  const pin = () => {
    player.dead = 0; player.x = 270; player.y = 140;
    cam.x = player.x; cam.y = player.y; cam.shake = 0;
    if (!enemies.length) { makeEnemy('zombie'); }
    const e = enemies[0];
    e.x = 270; e.y = 30; e.born = 1; e.max = 1e15; e.hp = 1e15; e.sp = 0; e.atkT = 9;
  };

  const snap = () => {
    draw();
    const A = g2.getImageData(0, 0, W, H).data;
    const sSh = shots.splice(0, shots.length), sGh = ghosts.splice(0, ghosts.length);
    draw();
    const B = g2.getImageData(0, 0, W, H).data;
    shots.push.apply(shots, sSh); ghosts.push.apply(ghosts, sGh);
    const rows = new Array(H).fill(0);
    const pts = [];
    for (let i = 0; i < A.length; i += 4) {
      if (Math.abs(A[i] - B[i]) > 8 || Math.abs(A[i + 1] - B[i + 1]) > 8 || Math.abs(A[i + 2] - B[i + 2]) > 8) {
        const p = (i / 4) | 0; rows[(p / W) | 0]++; pts.push(p);
      }
    }
    return { rows, pts };
  };
  const band = (rows, y0, y1) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) n += rows[y]; return n; };
  const vicinity = (pts, cx, cy, r) => {
    let n = 0;
    for (const p of pts) { const x = p % W, y = (p / W) | 0; if (Math.abs(x - cx) <= r && Math.abs(y - cy) <= r) n++; }
    return n;
  };

  const list = ids ? SKILLS.filter((s) => ids.includes(s.id)) : SKILLS;
  const out = [];
  for (const s of list) {
    shots.length = 0; ghosts.length = 0; drones.length = 0; bolts.length = 0;
    pin(); step(1 / 60); pin(); draw();
    const oy = camOy, oxx = camOx;
    let cast;
    try { cast = castSkill(s); } catch (e) { out.push({ id: s.id, err: String(e).slice(0, 120) }); continue; }
    const rec = { id: s.id, cast: !!cast, shotsMade: shots.length, zone: 0, inkFail: 0, cuts: 0, snaps: 0 };
    if (cast && (shots.length || drones.length)) {
      for (let f = 0; f < 50 && rec.snaps < 2; f++) {
        pin(); if (enemies[0]) enemies[0].hp = 1e15;
        step(0.016);
        if (!shots.length && !drones.length) break;
        const inZone = shots.filter((b) => {
          const sy = b.y + camOy, sx = b.x + camOx;
          return b.life > 0.06 && (b.mf === undefined || b.mf > 0.5) &&
                 sy <= 126 && sy >= Math.max(edgeW(b) + 8, 20) && sx >= 40 && sx <= 500;
        });
        if (!inZone.length) continue;
        const sn = snap(); rec.snaps++;
        for (const b of inZone.slice(0, 4)) {
          rec.zone++;
          const n = vicinity(sn.pts, (b.x + camOx) * SC, (b.y + camOy) * SC, 44);
          if (n < 40) rec.inkFail++;
        }
        if (band(sn.rows, LINE + 1, LINE + 15) > 400 && band(sn.rows, LINE - 14, LINE) === 0) rec.cuts++;
      }
    }
    out.push(rec);
  }
  return { out, VH, LINE };
}

async function runSweep(ctx, url, ids) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });
  await ev(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage(); enemies.length = 0; spawnQ.length = 0;
  });
  const res = await ev(new Function('ids', 'return (' + sweepInPage.toString() + ')(ids)'), ids || null);
  const zs = await ev(() => ({
    fxlc: getComputedStyle($('fxlc')).zIndex,
    fxl: getComputedStyle($('fxl')).zIndex,
    view: getComputedStyle($('view')).zIndex
  }));
  await page.close();
  return { res, zs, errs };
}

(async () => {
  console.log('=== VERIFY 752 — 위로 발사한 투사체 하드 컷 수리 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  /* [C] 소스 */
  ok(src.includes(FIXED), '[C1] EDGE_TOP = 0 (이펙트 경계 = 캔버스 전체)');
  ok(!src.includes(OLD), '[C2] 옛 상수(130) 부활 없음');
  ok(/ctx\.rect\(-ox, EDGE_TOP - oy, VW, VH\); ctx\.clip\(\)/.test(src),
    '[C3] 클립 rect 가 EDGE_TOP 상수를 그대로 본다(경계 손잡이 유지)');
  ok(/sy - EDGE_TOP/.test(src), '[C4] edgeDist 가 같은 상수를 본다(페이드·클립 한 벌)');
  ok(!/scrY - 130/.test(src) && !/\(scrY < 180\)/.test(src),
    '[C5] 클립선 진입 램프(scrY<180 · scrY-130) 부활 없음');

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* [R] 사본 준비 */
  const fixed = src.includes(FIXED);
  const tmp = path.join(path.dirname(SRC), `.verify752-old-${process.pid}.html`);
  fs.writeFileSync(tmp, fixed ? src.replace(FIXED, OLD) : src);
  process.on('exit', () => { try { fs.unlinkSync(tmp); } catch (e) {} });

  /* [A]+[B]+[D] — 9:19 전수 */
  const c19 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const a = await runSweep(c19, 'file://' + SRC, null);
  if (!a.res || a.res.__err) { ok(false, '[A] 스윕 실패: ' + (a.res && a.res.__err)); }
  else {
    const rs = a.res.out;
    const errRows = rs.filter((r) => r.err);
    ok(errRows.length === 0, '[A1] 시전 예외 0건 (' + rs.length + '종목' + (errRows.length ? ' — ' + errRows[0].id + ': ' + errRows[0].err : '') + ')');
    const projRows = rs.filter((r) => r.shotsMade > 0 || r.zone > 0);
    ok(projRows.length >= 14, '[A2] 투사체를 만드는 스킬 ' + projRows.length + '종목이 스윕에 실렸다(≥14)');
    const zoneRows = projRows.filter((r) => r.zone > 0);
    ok(zoneRows.length >= 12, '[A3] 상단 구역(옛 클립선 위)에 발이 실재한 종목 ' + zoneRows.length + ' (≥12)');
    const inkBad = rs.filter((r) => r.inkFail > 0);
    ok(inkBad.length === 0, '[A4] 상단 구역의 발마다 잉크 > 0 — 실패 ' + inkBad.length + '종목' +
      (inkBad.length ? ' (' + inkBad.map((r) => r.id).join(',') + ')' : ''));
    const cutRows = rs.filter((r) => r.cuts > 0);
    ok(cutRows.length === 0, '[B1] 옛 클립선(y130)의 «아래만 잉크» 프레임 0건 — 위반 ' + cutRows.length + '종목');
    for (const r of rs) if (r.zone > 0) console.log('       · ' + r.id.padEnd(7) + ' 구역표본 ' + r.zone + ' · 잉크실패 ' + r.inkFail + ' · 절단 ' + r.cuts);
  }
  ok(a.zs && a.zs.fxlc === '7' && a.zs.fxl === '60' && (a.zs.view === 'auto' || a.zs.view === '0'),
    '[D1] z 층 불변 — #fxlc 7 · #fxl 60 · 캔버스 z 없음(HUD/팝업 DOM 아래)' +
    (a.zs ? ' (실측 ' + a.zs.fxlc + '/' + a.zs.fxl + '/' + a.zs.view + ')' : ''));
  ok(a.errs.length === 0, '[D2] 9:19 콘솔/페이지 오류 0건' + (a.errs.length ? ' — ' + a.errs[0].slice(0, 100) : ''));

  /* [E] — 9:13.3 대표 6종 */
  const c13 = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
  const e = await runSweep(c13, 'file://' + SRC, ['slash', 'arrow', 'spiral', 'whirl', 'gale', 'curve']);
  if (!e.res || e.res.__err) { ok(false, '[E] 스윕 실패: ' + (e.res && e.res.__err)); }
  else {
    const rs = e.res.out;
    ok(rs.filter((r) => r.zone > 0).length >= 5, '[E1] 1600 프레임 — 상단 구역 실재 ' + rs.filter((r) => r.zone > 0).length + '/6종목');
    ok(rs.every((r) => r.inkFail === 0), '[E2] 1600 프레임 — 상단 구역 잉크 실패 0');
    ok(rs.every((r) => r.cuts === 0), '[E3] 1600 프레임 — 절단면 프레임 0건');
  }
  ok(e.errs.length === 0, '[E4] 1600 콘솔/페이지 오류 0건');

  /* [R] — 되돌림: EDGE_TOP 130 사본에서는 같은 장면이 빨갛다 */
  if (fixed) {
    const r = await runSweep(c19, 'file://' + tmp, ['slash', 'arrow', 'spiral']);
    if (!r.res || r.res.__err) { ok(false, '[R] 사본 스윕 실패: ' + (r.res && r.res.__err)); }
    else {
      const rs = r.res.out;
      const redInk = rs.reduce((n, x) => n + x.inkFail, 0);
      ok(redInk > 0, '[R1] EDGE_TOP 130 사본 — 상단 구역 발의 잉크 실패 ' + redInk + '건(>0 = 게이트가 옛 결함을 잡는다)');
    }
  } else {
    ok(false, '[R0] 현재 트리에 수리가 없다(EDGE_TOP ≠ 0)');
  }

  await c19.close(); await c13.close(); await browser.close();
  console.log('\nVERIFY752 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
