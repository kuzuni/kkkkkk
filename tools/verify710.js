/* 작업 710 게이트 — «스킬 이펙트 중복 제거»
 *
 *   node tools/verify710.js
 *
 * 지시(주인 2026-09-02 02:40): «스킬 이펙트 중복 된거 있으면 중복 안되게 하기».
 *   ⓐ 27종 발동 이펙트에 «같은 연출을 재사용하는 쌍» 0
 *   ⓑ 한 발동에 «같은 자리·같은 방향» 겹침 스폰 0
 *
 * 이 자는 **선언**을 지키고, `tools/probe710.js` 가 같은 것을 **찍힌 픽셀**로 다시 잰다.
 * 둘 다 있어야 하는 이유는 412 가 겪은 것 그대로다 — 표만 갈라 놓고 그림을 안 그리면
 * 선언은 초록인데 화면은 그대로다(반대로 픽셀만 보면 «어느 스킬이 어느 그림인가» 를 못 적는다).
 *
 * 절:
 *   [A] 표 — `SK_FX` 가 27종 전부를 덮고, 서명(fam/sh)에 **중복 쌍이 0** 이다.
 *   [B] 배선 — 시전이 만든 연출에 그 스킬의 키가 실제로 찍힌다(투사체 `sh` · 번개 `bk`).
 *   [C] 그리기 — `shotBody` 가 그 키를 실제로 갈라 그린다(잉크가 종마다 다르다).
 *   [D] 잔상 — 접촉 잔상이 투사체와 같은 키를 쓴다(114 ④ 일관성).
 *   [E] 밴드 — 412 «한 세트» 규격: 종별 잉크가 한 밴드 안이다(최대÷최소 ≤ 12).
 *   [F] 겹침 스폰 0 (ⓑ).
 *   [R] 되돌림 시험 — `SK_FX` 태깅을 뺀 사본에서 [A]~[C] 가 **실제로 빨개진다**.
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
/* 되돌림 사본 — 태깅 한 블록만 지운다(= 710 이전 세계: 그림이 옛 `k` 로 떨어진다).
   ⚠ 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가 통째로 404 다
     (360·367·438·439·453·467·471·541 선례). 이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG = path.join(ROOT, '.v710-neg-' + process.pid + '.html');
const TAG = `      for(let i=n0;i<shots.length;i++) shots[i].sh = fx.sh;
      for(let i=l0;i<bolts.length;i++) bolts[i].bk = fx.sh;`;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

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

    /* ---- 표 ---- */
    const table = (typeof SK_FX === 'undefined') ? null :
      SKILLS.map(s => ({ id: s.id, fam: (SK_FX[s.id] || {}).fam, sh: (SK_FX[s.id] || {}).sh }));

    /* ---- 배선 + 겹침 + 잔상 ---- */
    const wired = [], overlap = [];
    let ghostSh = null, ghostK = null;
    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      const w = { id: s.id, cast: !!done };
      if (shots.length) w.sh = shots[0].sh;
      if (bolts.length) w.bk = bolts[0].bk;
      wired.push(w);
      let dup = 0;
      for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
        const a = shots[i], b = shots[j];
        if (a.k === b.k && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 &&
            Math.abs(a.vx - b.vx) < 1 && Math.abs(a.vy - b.vy) < 1) dup++;
      }
      if (dup) overlap.push(s.id + ':' + dup);
    }

    /* 잔상이 키를 물려받는가 — 실제로 맞혀 본다(114 ④) */
    {
      putFoe(); clearFx();
      const s = SKILLS.find(x => x.id === 'lance');
      try { castSkill(s); } catch (e) {}
      for (let i = 0; i < 40 && ghosts.length === 0; i++) step(1 / 60);
      if (ghosts.length) { ghostSh = ghosts[0].sh; ghostK = ghosts[0].k; }
      clearFx();
    }

    /* ---- 그리기(잉크) ---- */
    const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const maskOf = (b0, a0) => {
      const m = new Uint8Array(bw * bh); let n = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        if (Math.abs(a0[i] - b0[i]) > 8 || Math.abs(a0[i + 1] - b0[i + 1]) > 8 ||
            Math.abs(a0[i + 2] - b0[i + 2]) > 8) { m[p] = 1; n++; }
      }
      return { m, n };
    };

    /* 종별 «그 스킬이 실제로 만든 발» 을 한 자리에 세워 그린다 */
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
    const base = grab();
    const masks = {}, ink = {};
    for (const id in specs) {
      const sp = specs[id];
      clearFx();
      shots.push({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                   dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                   spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                   tx: sp.tx === undefined ? undefined : CX - ox,
                   ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      const r = maskOf(base, grab());
      masks[id] = r.m; ink[id] = r.n;
      clearFx();
    }
    const ids = Object.keys(masks);
    let worst = { iou: 0 };
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = masks[ids[i]], B = masks[ids[j]];
      let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      const iou = uni ? inter / uni : 0;
      if (iou > worst.iou) worst = { a: ids[i], b: ids[j], iou: +iou.toFixed(4) };
    }
    const vals = ids.map(id => ink[id]);
    return { table, wired, overlap, ghostSh, ghostK, ink, worst,
             band: +(Math.max.apply(null, vals) / Math.min.apply(null, vals)).toFixed(2),
             nSk: SKILLS.length };
  });

  await ctx.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 710 — 스킬 이펙트 중복 제거 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  const hasTag = src.indexOf(TAG) >= 0;
  fs.writeFileSync(NEG, hasTag ? src.replace(TAG, '      /* 710 태깅 제거(되돌림 시험) */') : src);
  process.on('exit', () => { try { fs.unlinkSync(NEG); } catch (e) {} });

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const now = await measure(browser, 'file://' + SRC);
  const neg = await measure(browser, 'file://' + NEG);
  await browser.close();

  const o = now.out;
  if (!o || o.__err) { console.log('측정 실패: ' + (o && o.__err)); process.exit(1); }

  /* ---- [A] 표 ---- */
  const miss = (o.table || []).filter(r => !r.fam || !r.sh).map(r => r.id);
  ok(!!o.table, '[A1] `SK_FX` 표가 선언돼 있다');
  ok(o.table && o.table.length === o.nSk && miss.length === 0,
    '[A2] 표가 ' + o.nSk + '종 전부를 덮는다 (빠진 종 ' + miss.length +
    (miss.length ? ': ' + miss.join(',') : '') + ')');
  const sig = {}, sigDup = [];
  for (const r of (o.table || [])) {
    const k = r.fam + '/' + r.sh;
    if (sig[k]) sigDup.push(sig[k] + '=' + r.id); else sig[k] = r.id;
  }
  ok(sigDup.length === 0,
    '[A3] 서명(fam/sh) 중복 쌍 0 (실측 ' + sigDup.length + (sigDup.length ? ' — ' + sigDup.join(' ') : '') + ')');

  /* ---- [B] 배선 ---- */
  const byId = {}; for (const r of (o.table || [])) byId[r.id] = r;
  const bad = (o.wired || []).filter(w => {
    const t = byId[w.id]; if (!t) return true;
    if (t.fam === 'shot') return w.sh !== t.sh;
    if (t.fam === 'bolt') return w.bk !== t.sh;
    return false;                                   /* zone·area·drone·hold 는 다른 자에서 본다 */
  }).map(w => w.id);
  ok(bad.length === 0,
    '[B1] 시전이 만든 연출에 그 스킬의 키가 찍힌다 (어긋난 종 ' + bad.length +
    (bad.length ? ': ' + bad.join(',') : '') + ')');
  const castN = (o.wired || []).filter(w => w.cast).length;
  ok(castN >= 25, '[B2] 표적 1기 앞에서 시전 성공 ' + castN + '/' + o.nSk + '종');

  /* ---- [C] 그리기 ---- */
  ok(o.worst.iou < 0.90,
    '[C1] 종별 실루엣 마스크 IoU 최댓값 ' + o.worst.iou.toFixed(3) + ' < 0.90 (최악 쌍 ' +
    o.worst.a + '↔' + o.worst.b + ')');
  ok(Object.keys(o.ink).length >= 15,
    '[C2] 투사체를 내는 종 ' + Object.keys(o.ink).length + '종을 픽셀로 쟀다');

  /* ---- [D] 잔상 ---- */
  ok(o.ghostSh === 'lance' && o.ghostK === 'ice',
    '[D1] 접촉 잔상이 투사체와 같은 실루엣 키를 쓴다 (sh=' + o.ghostSh + ' · k=' + o.ghostK + ')');

  /* ---- [E] 밴드 ---- */
  ok(o.band <= 12,
    '[E1] 412 «한 밴드» — 종별 잉크 최대÷최소 ' + o.band + ' ≤ 12');

  /* ---- [F] 겹침 스폰 ---- */
  ok((o.overlap || []).length === 0,
    '[F1] 한 시전에 «같은 자리·같은 방향» 겹침 스폰 0 (실측 ' + o.overlap.length +
    (o.overlap.length ? ' — ' + o.overlap.join(' ') : '') + ')');

  ok(now.errs.length === 0,
    '[G1] 콘솔/페이지 오류 0건' + (now.errs.length ? ' — ' + now.errs[0].slice(0, 120) : ''));

  /* ---- [R] 되돌림 시험 ---- */
  const n = neg.out;
  if (!hasTag) {
    ok(false, '[R] 되돌림 대상(태깅 블록)을 소스에서 못 찾았다 — 자가 낡았다');
  } else if (!n || n.__err) {
    ok(false, '[R] 되돌림 사본 측정 실패: ' + (n && n.__err));
  } else {
    const nBad = (n.wired || []).filter(w => {
      const t = byId[w.id]; if (!t) return true;
      if (t.fam === 'shot') return w.sh !== t.sh;
      if (t.fam === 'bolt') return w.bk !== t.sh;
      return false;
    }).length;
    ok(nBad > 0, '[R1] 태깅을 빼면 [B1] 이 빨개진다 (어긋난 종 ' + nBad + '종)');
    ok(n.worst.iou >= 0.90,
      '[R2] 태깅을 빼면 [C1] 이 빨개진다 (IoU 최댓값 ' + n.worst.iou.toFixed(3) + ' — ' +
      n.worst.a + '↔' + n.worst.b + ')');
    ok(n.ghostSh === undefined || n.ghostSh === null,
      '[R3] 태깅을 빼면 잔상에도 키가 없다 (sh=' + String(n.ghostSh) + ')');
  }

  console.log('\n[표] 잉크 화소: ' + Object.entries(o.ink).map(([k, v]) => k + ':' + v).join(' · '));
  console.log('VERIFY710 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
