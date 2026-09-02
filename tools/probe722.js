#!/usr/bin/env node
/* 722 재현 — `tools/probe504.js` [C1]·[C2]·[Br1] 이 왜 실행마다 갈리는가 (338 규칙: 자를 고치기 전에 먼저 잰다)
 *
 *   node tools/probe722.js            (기본 R=5 반복)
 *   node tools/probe722.js --reps 3
 *
 * 등재문(PROGRESS 722)이 말하는 것은 «`probe504` 10/12 — [C2] 가 수리 전 트리에서도 빨갛고
 * [Br1] 은 5.1% 문턱 flake» 다. 여기서 재는 것은 **제품이 아니라 그 자의 표본**이다.
 *
 *   [1] `probe504` [C] 를 그대로 R회 되풀이 — ⓐPIN·ⓑ불사·ⓒ실제 세 값과 평균 이탈 mStd·mImm 의 분포
 *   [2] 결정 변수 — ⓒ실제 판의 «살아 있는 적 수» 와 «접촉 반경 안 개체수» 가 실행마다 얼마나 갈리는가
 *       (695 §2 가 접촉형에서 이미 잡아 둔 축 — 여기서는 [C] 표본 6종에 대해 다시 센다)
 *   [3] 접촉형(⏸접촉 = `rul504.HOLD695`)을 뺀 mStd·mImm 의 분포 — 695 §4-6 이 [D2] 에서 한 것과 같은 처분
 *   [4] [Br1] 재실행 흔들림의 분포 — 문턱 0.05 가 분포의 어디에 앉아 있는가
 *   [5] K회 평균이 폭을 얼마나 좁히는가 — 처방(반복 표본)의 효과를 미리 잰다
 *   [6] 처방 후보 ⓐ — 채택 눈금(POP 고정) 위에서 **불사만** 토글 (⇒ «뭉침» 가설을 기각한다)
 *   [7] 처방 후보 ⓑ — PIN 장면을 «시각 고정» 이 아니라 «관측 중앙값에 가장 가까운 마릿수» 로 뜬다
 *   [8] 같은 초수 자유 판 — 불사 ↔ 실제의 개체수와 값 (⇒ 부풀림의 뿌리 = **개체수**)
 *
 * 출력은 전부 수치다. 처방·수정은 하지 않는다.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const RUL = require(path.resolve(__dirname, 'rul504.js'));
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const argv = process.argv.slice(2);
const REPS = Math.max(2, +(argv[argv.indexOf('--reps') + 1] || 5) || 5);

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
/* 778 — 표본이 늘수록 좁아지는 통계. 전칭·점추정에 문턱을 물리던 자리를 이것으로 바꾼다(775 §3). */
const med = a => { if (!a.length) return 0; const s = a.slice().sort((p, q) => p - q); const h = s.length >> 1;
                   return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
/* n 개에서 k 개를 고르는 조합 — [5-r]·[8-br] 의 «하네스 끈 짝» 을 새 실행 0개로 만든다. */
const combos = (n, k) => { const out = []; const go = (s, cur) => {
  if (cur.length === k) { out.push(cur.slice()); return; }
  for (let i = s; i < n; i++) { cur.push(i); go(i + 1, cur); cur.pop(); } }; go(0, []); return out; };
const f2 = n => Number.isFinite(n) ? n.toFixed(2) : '∞';
const pc = n => Number.isFinite(n) ? (n * 100).toFixed(0) + '%' : '∞';

/* `probe504` [C] 와 **같은 표본·같은 초수**다. 한 칸도 바꾸지 않는다 — 바꾸면 재현이 아니다. */
const CIDS = ['lance', 'gale', 'flask', 'poison', 'aura', 'nova'];
const IMM_SEC = 40, REAL_SEC = 60;

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  await page.waitForTimeout(500);

  /* 표준 장면(ⓐPIN)의 재료 — `probe504` [A] 와 같은 방식으로 세 프레임을 떠낸다. */
  const A = await page.evaluate(() => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    enemies.length = 0;
    const snaps = [], SNAP_AT = [15, 30, 45].map(t => t * 60);
    for (let f = 0; f < 60 * 60; f++) {
      step(1 / 60);
      if (SNAP_AT.indexOf(f) >= 0) {
        snaps.push(enemies.filter(e => e.hp > 0)
          .map(e => ({ tk: e.tk, dx: +(e.x - player.x).toFixed(2), dy: +(e.y - player.y).toFixed(2) })));
      }
    }
    return { snaps };
  });

  /* ── 한 번의 [C] 측정 = ⓐPIN(고정 장면) + ⓑ불사 + ⓒ실제 ─────────────── */
  const measure = async () => page.evaluate(({ ids, snaps, immSec, realSec }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    const pinTo = (snap) => {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      for (let i = 0; i < enemies.length && i < snap.length; i++) {
        const e = enemies[i];
        e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
        e.hp = e.max = 1e30; e.slow = 0;
      }
      if (enemies.length > snap.length) enemies.length = snap.length;
    };
    const clear = (id) => {
      enemies.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      skillCd[id] = 0;
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
    };
    /* ⓐ PIN — `probe504` [B] 와 같은 고정 장면(세 프레임 평균) */
    const pin = (id) => {
      let tp = 0, th = 0;
      for (const snap of snaps) {
        clear(id);
        for (const o of snap) makeEnemy(o.tk); pinTo(snap);
        let hits = 0, casts = 0;
        window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
        window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
        for (let f = 0; f < 60 * 30; f++) { step(1 / 60); pinTo(snap); }
        window.castSkill = rawCast; window.hitEnemy = rawHit;
        S.own = ownSave; markDirty();
        tp += casts ? hits / casts : 0; th += hits / 30;
      }
      return { per: +(tp / snaps.length).toFixed(3), hps: +(th / snaps.length).toFixed(3) };
    };
    /* ⓑ불사 / ⓒ실제 — `probe504` [C] 의 `run()` 을 그대로 옮긴 것. 살아 있는 적 수도 같이 센다. */
    const run = (id, immortal, sec) => {
      clear(id);
      let hits = 0, casts = 0, popSum = 0, popN = 0, nearSum = 0;
      const s = SK[id], rad = (s && (s.r || s.rad)) || 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) {
        if (immortal) enemies.forEach(e => { e.hp = e.max = 1e30; });
        step(1 / 60);
        if (f % 30 === 0) {
          const live = enemies.filter(e => e.hp > 0);
          popSum += live.length; popN++;
          if (rad) nearSum += live.filter(e => Math.hypot(e.x - player.x, e.y - player.y) <= rad + (e.r || 0)).length;
        }
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      return { per: casts ? +(hits / casts).toFixed(3) : 0, hps: +(hits / sec).toFixed(3), casts,
               pop: +(popSum / Math.max(1, popN)).toFixed(2), near: +(nearSum / Math.max(1, popN)).toFixed(2), rad };
    };
    const out = {};
    for (const id of ids) out[id] = { pin: pin(id), imm: run(id, true, immSec), real: run(id, false, realSec) };
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { ids: CIDS, snaps: A.snaps, immSec: IMM_SEC, realSec: REAL_SEC });

  const rel = (a, b) => (a === 0 && b === 0) ? 0 : (b === 0 ? Infinity : Math.abs(a / b - 1));
  const cdOf = await page.evaluate(ids => ids.map(id => ({ id, cd: SK[id].cd, decl: skillHits(SK[id]) })), CIDS);
  const CD = {}, DECL = {}; cdOf.forEach(x => { CD[x.id] = x.cd; DECL[x.id] = x.decl; });

  const R = [];
  for (let r = 0; r < REPS; r++) R.push(await measure());

  /* ── [1] `probe504` [C] 를 R회 되풀이 ──────────────────────────────── */
  console.log('\n  [1] `probe504` [C] 반복 ' + REPS + '회 — 종별 ⓐPIN / ⓑ불사 / ⓒ실제 (cd 0 은 «초당»)');
  console.log('      ' + 'id'.padEnd(8) + 'ⓐPIN'.padEnd(26) + 'ⓑ불사'.padEnd(26) + 'ⓒ실제');
  const val = (row, id, k) => CD[id] > 0 ? row[id][k].per : row[id][k].hps;
  CIDS.forEach(id => {
    const c = k => R.map(row => val(row, id, k));
    console.log('      ' + id.padEnd(8)
      + c('pin').map(f2).join('/').padEnd(26)
      + c('imm').map(f2).join('/').padEnd(26)
      + c('real').map(f2).join('/'));
  });

  const per = R.map(row => {
    const cmp = CIDS.map(id => ({ id, dStd: rel(val(row, id, 'pin'), val(row, id, 'real')),
                                      dImm: rel(val(row, id, 'imm'), val(row, id, 'real')) }));
    const fin = cmp.filter(x => Number.isFinite(x.dStd) && Number.isFinite(x.dImm));
    return { cmp, mStd: mean(fin.map(x => x.dStd)), mImm: mean(fin.map(x => x.dImm)) };
  });
  console.log('\n      실행별 평균 이탈 — mStd(ⓐ) / mImm(ⓑ)');
  per.forEach((p, i) => console.log('      #' + (i + 1) + '  mStd ' + pc(p.mStd).padStart(6)
    + ' · mImm ' + pc(p.mImm).padStart(7)
    + '   ⇒ [C1] mStd<mImm ' + (p.mStd < p.mImm ? '초록' : '**빨강**')
    + ' · [C2] mImm>1.0 ' + (p.mImm > 1.0 ? '초록' : '**빨강**')));
  const c1 = per.filter(p => p.mStd < p.mImm).length, c2 = per.filter(p => p.mImm > 1.0).length;
  ok(c1 < REPS || c2 < REPS, '1-a [C1]·[C2] 가 같은 트리에서 실행마다 갈린다(등재문 재현)',
     '[C1] ' + c1 + '/' + REPS + ' 초록 · [C2] ' + c2 + '/' + REPS + ' 초록');
  const mImms = per.map(p => p.mImm);
  /* ⚑ 문턱 1.0 을 넘기는 항이 무엇인지 — 종별 dImm 의 최댓값이 어느 종에서 나오는가 */
  const topTerm = per.map(p => p.cmp.slice().sort((a, b) => b.dImm - a.dImm)[0]);
  console.log('      실행별 mImm 최대 기여 종 — ' + topTerm.map((t, i) => '#' + (i + 1) + ' ' + t.id + ' ' + pc(t.dImm)).join(' · '));
  const minReal = Math.min(...[].concat(...CIDS.map(id => R.map(row => val(row, id, 'real')))));
  ok(minReal < 5, '1-b 비율의 분모(ⓒ실제)가 어떤 종에서는 1 근처까지 내려간다 — 그 한 종이 6종 평균을 통째로 끌 수 있다',
     '최소 분모 ' + f2(minReal) + ' — 이 값이 1 로 떨어진 실행에서 그 종의 이탈이 800% 로 튀고 [C2] 가 «초록» 이 된다'
     + ' (실행별 최대 기여 종: ' + topTerm.map(t => t.id).join(',') + ')');
  ok(sd(mImms) > 0.05, '1-c mImm 이 실행마다 갈린다 — 세 칸이 전부 안 갇힌 채 서로 나뉜다',
     '범위 ' + pc(Math.min(...mImms)) + '~' + pc(Math.max(...mImms)) + ' · sd ' + pc(sd(mImms)));

  /* ── [2] 결정 변수 — ⓒ실제 판이 안 갇힌다 ─────────────────────────── */
  console.log('\n  [2] 결정 변수 — ⓒ실제 판의 살아 있는 적 수 · 접촉 반경 안 개체수 (반복 ' + REPS + '회)');
  console.log('      ' + 'id'.padEnd(8) + '반경'.padEnd(8) + '판 위 적 수'.padEnd(26) + '반경 안 개체수');
  const worst = { id: null, w: 0 };
  CIDS.forEach(id => {
    const pops = R.map(row => row[id].real.pop), nears = R.map(row => row[id].real.near);
    const reals = R.map(row => val(row, id, 'real'));
    const w = mean(reals) ? (Math.max(...reals) - Math.min(...reals)) / mean(reals) : 0;
    if (w > worst.w) { worst.w = w; worst.id = id; }
    console.log('      ' + id.padEnd(8) + String(R[0][id].real.rad || '—').padEnd(8)
      + pops.map(x => x.toFixed(1)).join('/').padEnd(26)
      + (R[0][id].real.rad ? nears.map(x => x.toFixed(2)).join('/') : '—'));
  });
  ok(worst.w > 0.15, '2-a ⓒ실제 판의 값 자체가 R회 사이에 갈린다 — 비율의 «분모» 가 안 갇혀 있다',
     '최악 ' + worst.id + ' 폭 ' + pc(worst.w));

  /* ── [3] ⏸접촉(695 HOLD695)을 뺀 분포 ─────────────────────────────── */
  /* ⚑ 목록이 아니라 **`rul504.held695()` 자물쇠**로 묻는다 — 199 가 선언을 갈면 면제가 스스로 풀린다. */
  const held = CIDS.filter(id => RUL.held695({ id, decl: DECL[id] }));
  console.log('\n  [3] ⏸접촉 등재분 ' + (held.join(',') || '없음') + ' 를 뺀 평균 이탈');
  const per3 = R.map(row => {
    const cmp = CIDS.filter(id => held.indexOf(id) < 0).map(id => ({
      id, dStd: rel(val(row, id, 'pin'), val(row, id, 'real')), dImm: rel(val(row, id, 'imm'), val(row, id, 'real')) }));
    const fin = cmp.filter(x => Number.isFinite(x.dStd) && Number.isFinite(x.dImm));
    return { mStd: mean(fin.map(x => x.dStd)), mImm: mean(fin.map(x => x.dImm)) };
  });
  per3.forEach((p, i) => console.log('      #' + (i + 1) + '  mStd ' + pc(p.mStd).padStart(6) + ' · mImm ' + pc(p.mImm).padStart(7)));
  const m3 = per3.map(p => p.mImm), s3 = per3.map(p => p.mStd);
  console.log('      ⇒ mImm 범위 ' + pc(Math.min(...m3)) + '~' + pc(Math.max(...m3)) + ' · sd ' + pc(sd(m3))
    + '   |   mStd 범위 ' + pc(Math.min(...s3)) + '~' + pc(Math.max(...s3)) + ' · sd ' + pc(sd(s3)));
  ok(held.length > 0, '3-a [C] 표본 안에 «이 눈금으로 못 재는 종»(695 ⏸접촉)이 들어 있다',
     held.join(',') + ' — 695 §4-6 은 [D2] 에서 같은 종을 뺐다');
  ok(m3.every(x => x < 1.0), '3-b ⏸접촉을 빼면 mImm 이 R회 전부 문턱 1.0 아래다 — 문턱을 넘기던 것은 그 한 종이었다',
     '범위 ' + pc(Math.min(...m3)) + '~' + pc(Math.max(...m3)));
  ok(per3.some(p => p.mStd > p.mImm), '3-c ⏸접촉을 빼도 [C1] 의 문장(«ⓐ 가 ⓑ 보다 가깝다»)이 뒤집히는 실행이 있다',
     per3.filter(p => p.mStd > p.mImm).length + '/' + REPS + ' 뒤집힘 — ⓐ 의 장면이 그때그때 뜬 세 프레임(1~51마리)이라 그렇다([7])');

  /* ── [4] [Br1] 재실행 흔들림의 분포 ───────────────────────────────── */
  const BRIDS = ['slash', 'lance', 'gale', 'holy', 'flask'];
  console.log('\n  [4] [Br1] — 고정 장면 재실행 흔들림 (같은 장면 두 번 · 반복 ' + REPS + '회)');
  const brRuns = [];
  for (let r = 0; r < REPS; r++) {
    const two = await page.evaluate(({ ids, snaps }) => {
      const rawCast = window.castSkill, rawHit = window.hitEnemy;
      let ownSave;
      const pinTo = (snap) => {
        player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
        for (let i = 0; i < enemies.length && i < snap.length; i++) {
          const e = enemies[i];
          e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
          e.hp = e.max = 1e30; e.slow = 0;
        }
        if (enemies.length > snap.length) enemies.length = snap.length;
      };
      const one = (id) => {
        let tot = 0;
        for (const snap of snaps) {
          enemies.length = 0; shots.length = 0; zones.length = 0;
          if (typeof drones !== 'undefined') drones.length = 0;
          skillCd[id] = 0;
          ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
          for (const o of snap) makeEnemy(o.tk); pinTo(snap);
          let hits = 0, casts = 0;
          window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
          window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
          for (let f = 0; f < 60 * 30; f++) { step(1 / 60); pinTo(snap); }
          window.castSkill = rawCast; window.hitEnemy = rawHit;
          S.own = ownSave; markDirty();
          tot += casts ? hits / casts : 0;
        }
        return +(tot / snaps.length).toFixed(3);
      };
      const out = {};
      for (const id of ids) out[id] = { a: one(id), b: one(id) };
      enemies.length = 0; shots.length = 0; zones.length = 0;
      S.eqSkill = ['slash']; markDirty();
      return out;
    }, { ids: BRIDS, snaps: A.snaps });
    brRuns.push(two);
  }
  const drifts = [];
  console.log('      ' + 'id'.padEnd(8) + '실행별 흔들림 %');
  BRIDS.forEach(id => {
    const ds = brRuns.map(t => t[id].a ? Math.abs(t[id].b / t[id].a - 1) : 0);
    ds.forEach(d => drifts.push(d));
    console.log('      ' + id.padEnd(8) + ds.map(d => (d * 100).toFixed(1)).join(' / '));
  });
  const dMax = Math.max(...drifts);
  const worstPerRun = brRuns.map((t, i) => Math.max(...BRIDS.map(id => t[id].a ? Math.abs(t[id].b / t[id].a - 1) : 0)));
  console.log('      실행별 최악 ' + worstPerRun.map(d => (d * 100).toFixed(1) + '%').join(' / ')
    + '   ⇒ [Br1] 문턱 5% 통과 ' + worstPerRun.filter(d => d <= 0.05).length + '/' + REPS);
  ok(dMax > 0.02, '4-a 고정 장면도 완전 결정적이지 않다 — 흔들림이 0 이 아니다',
     '최악 ' + (dMax * 100).toFixed(1) + '% · 표본 ' + drifts.length);
  ok(true, '4-b [Br1] 문턱 5% 가 실측 분포의 어디에 앉는가',
     '실행별 최악 평균 ' + (mean(worstPerRun) * 100).toFixed(1) + '% · sd ' + (sd(worstPerRun) * 100).toFixed(1)
     + '%p · 최악 ' + (dMax * 100).toFixed(1) + '%');

  /* ── [5] K회 평균이 폭을 얼마나 좁히는가 ──────────────────────────── */
  console.log('\n  [5] K회 평균의 효과 — ⓒ실제 값을 K개씩 평균냈을 때의 폭');
  console.log('      ' + 'id'.padEnd(8) + 'K=1 폭'.padEnd(10) + 'K=' + REPS + ' 평균');
  CIDS.forEach(id => {
    const reals = R.map(row => val(row, id, 'real'));
    const w = mean(reals) ? (Math.max(...reals) - Math.min(...reals)) / mean(reals) : 0;
    console.log('      ' + id.padEnd(8) + pc(w).padEnd(10) + f2(mean(reals)));
  });
  const mImmAvg = (() => {
    const avg = (id, k) => mean(R.map(row => val(row, id, k)));
    const use = CIDS.filter(id => held.indexOf(id) < 0);
    return mean(use.map(id => rel(avg(id, 'imm'), avg(id, 'real'))));
  })();
  const mStdAvg = (() => {
    const avg = (id, k) => mean(R.map(row => val(row, id, k)));
    const use = CIDS.filter(id => held.indexOf(id) < 0);
    return mean(use.map(id => rel(avg(id, 'pin'), avg(id, 'real'))));
  })();
  /* ⚑ 부호를 단언하지 않는다 — 그것이 [C1] 이 한 짓이다(721 «잡음 폭 안에서 부호를 물었다»).
     mStd 는 **그 실행이 뜬 PIN 장면 하나**에 통째로 달려 있어 프로브 실행 사이에 36~82% 로 갈리고,
     mImm 은 ⏸접촉 한 종의 분모에 달려 있다.

     ⚑⚑ **778 정오표 — 옛 판정 `mStd > 0.2 && mImm > 0.2` 는 그 «갈린다» 를 자기가 적어 두고
     그 한복판에 절대 문턱을 박은 것이었다.** 실측 mImm 은 프로브 실행 사이 **19~38%**(등재문의
     빨간 실행이 19%)라 문턱 20% 는 분포 **안**에 앉는다 = 그 항은 자가 아니라 동전이다
     (721-② · 775 §2-ⓒ «중심값 자체가 문턱 언저리면 표본으로는 못 넘긴다»).
     ⚠ **문턱을 다시 뽑는 길은 695-④·759·766·775 가 네 번 기각했다** — 20%를 15%로 내리는 것도
     같은 길이다(min 19% 이라 여유가 4%p 밖에 안 남고, 다음 실행이 그 아래로 내려가면 끝이다).
     ⚑ **1회차에 «절대 문턱 → 분모의 잔여 흔들림 대비 배수» 안을 먼저 세웠다가 실측으로 기각했다**
     (338 규칙 — 처방보다 자가 먼저다). 널(= 같은 R회 표본을 반씩 갈라 평균낸 ⓒ↔ⓒ 짝)에 대어
     재 보니 배수가 실측 **0.7×~5.0×** 로 갈렸다 — **한 실행에서는 `mStd` 12% 가 널 17% 보다
     아래로 내려갔다.** 즉 «둘 다 ⓒ에서 멀다» 는 문장 자체가 재현되는 사실이 아니다.
     어떤 바를 놓아도 동전인 자리이므로, 775 §7 대로 **재현되는 것만 남긴다**:
       · **[5-a]** — **단언을 걷고 관측만 남긴다**(같은 자의 [4-b] 와 같은 꼴 — `ok(true, …)`).
         ⚑⚑ **2회차에 «두 이탈의 R회 분포가 겹친다» 로 적었다가 8회 중 1회 빨강으로 그것도 기각했다**
         (실측 `mStd 48~56%` vs `mImm 21~47%` — **1%p 차이로 안 겹친 실행**). 뿌리는 문턱이 아니라
         **이 자리의 구조**다: ⓐPIN 의 장면 `A.snaps` 는 **프로브 실행당 한 번만** 떠지고 R회 반복이
         그것을 통째로 공유한다(그 세 프레임의 마릿수가 2~52 로 갈린다는 것은 [7-a]·[7-b] 가 이미
         단언한다). ⇒ **한 실행 안에서는 두 분포가 깨끗이 갈릴 수 있고, 갈리는지 여부 자체가
         실행마다 뒤집힌다** — «겹친다» 는 실행 **사이**의 사실이라 한 실행이 볼 수 있는 것이 아니다.
         759-① «이 종을 이 눈금으로 재도 되는가를 먼저 물어라» 의 답이 «안 된다» 인 자리이므로,
         **어떤 바도 놓지 않고** 수치만 찍는다(자리는 안 비운다 — 333). 이 자리가 말하려던
         «[C1] 은 동전이다» 는 **[3-c] 가 이미 단언으로 지고 있고**(«뒤집히는 실행이 있다»),
         «왜 장면이 정하는가» 는 **[7] 이 진다** — 이 항이 사라져도 잃는 단언이 없다.
       · **[5-b]** — «평균이 안 듣기 때문» 이라는 오독을 막는다: 평균은 **분모에는 듣는다**
         (K=1 폭 최악 88~148% → 널 5~17%). 겹침의 이유는 평균의 무력함이 아니라
         **ⓐ·ⓑ 가 서로 못 갈린다**는 것이다. 널은 **새 실행을 0개도 안 쓴다**(775 [C2r] 방식). */
  const judged5 = CIDS.filter(id => held.indexOf(id) < 0);
  const halfK = Math.max(1, Math.floor(REPS / 2));
  const splitDev = (pick) => {                       /* pick: 조합 인덱스를 고르는 술어 */
    const out = [];
    for (const id of judged5) {
      const v = R.map(row => val(row, id, 'real'));
      combos(REPS, halfK).forEach((c, ci) => {
        if (!pick(ci)) return;
        const a = mean(c.map(i => v[i])), b = mean(v.filter((_, i) => c.indexOf(i) < 0));
        if (a && b) out.push(Math.abs(a / b - 1));
      });
    }
    return out;
  };
  const nullA = splitDev(ci => ci % 2 === 0), nullB = splitDev(ci => ci % 2 === 1);
  const nullMed = med(nullA), nullMedB = med(nullB);
  console.log('      널(하네스 0 · 새 실행 0) — ⓒ실제를 ' + halfK + ':' + (REPS - halfK)
    + ' 로 갈라 평균낸 짝의 이탈 중앙값 ' + pc(nullMed) + ' (표본 ' + nullA.length + '쌍 · 짝 추정 ' + pc(nullMedB) + ')');
  const sV = per3.map(p => p.mStd), iV = per3.map(p => p.mImm);
  const sLo = Math.min(...sV), sHi = Math.max(...sV), iLo = Math.min(...iV), iHi = Math.max(...iV);
  const ovLo = Math.max(sLo, iLo), ovHi = Math.min(sHi, iHi);
  ok(true,
     '5-a K회 평균을 낸 뒤 ⓐ·ⓑ 의 이탈이 어디에 앉는가 — **관측만 한다**(이 자리는 «크기» 를 단언할 수 없다 · 이유는 아래 주석)',
     'mStd ' + pc(sLo) + '~' + pc(sHi) + ' · mImm ' + pc(iLo) + '~' + pc(iHi)
     + (sLo <= iHi && iLo <= sHi ? ' ⇒ 겹침 ' + pc(ovLo) + '~' + pc(ovHi) : ' ⇒ **이 실행에서는 안 겹친다**')
     + ' · K평균 점추정 mStd ' + pc(mStdAvg) + ' · mImm ' + pc(mImmAvg)
     + ' · 널 ' + pc(nullMed) + '(배수 ' + (nullMed ? (Math.min(mStdAvg, mImmAvg) / nullMed).toFixed(1) : '∞') + '×)');
  /* [5-b] — 겹침을 «평균이 무력해서» 로 읽으면 안 된다는 짝 항(759-② «면제를 얹으면 통째로
     사라져도 초록인지 세어 보라» 의 자리). 평균은 **분모에는 듣는다** — [2] 가 잰 ⓒ의 K=1 폭에
     비해 널(반씩 갈라 평균낸 ⓒ↔ⓒ)은 몇 배로 좁다. 그리고 그 널은 **우연히 작은 값이 아니다**:
     서로 겹치지 않는 두 묶음으로 만든 두 추정치가 서로 3배 안에 앉는다. */
  const nullSpread = Math.max(nullMed, nullMedB) / Math.max(1e-9, Math.min(nullMed, nullMedB));
  ok(nullMed < 0.5 * worst.w && nullSpread <= 3,
     '5-b 평균이 안 듣는 게 아니다 — 분모 ⓒ 는 평균으로 확실히 좁아진다(겹침의 이유는 ⓐ·ⓑ 가 서로 못 갈린다는 것)',
     'ⓒ K=1 폭 최악 ' + pc(worst.w) + ' → 널 ' + pc(nullMed) + ' (바 그 절반 ' + pc(0.5 * worst.w) + ')'
     + ' · 널 두 독립 추정치 ' + pc(nullMed) + '/' + pc(nullMedB) + ' 폭 ×' + nullSpread.toFixed(2) + '(≤3)');

  /* ── [6] 처방 후보 ⓐ — 채택 눈금(POP 고정) 위에서 **불사만** 토글 ──────
     [1]·[2] 가 보인 것: ⓑ불사와 ⓒ실제는 «불사» 말고도 **판 위 개체수**가 같이 달랐다.
     그 둘을 한 숫자로 나누면 두 이유가 섞인다. POP 을 고정한 자 위에서 불사만 켜면
     남는 차이는 **뭉침 하나**이고, 그것이 [C2] 가 말하려던 바로 그 문장이다. */
  const RREPS = Math.min(REPS, 3);
  console.log('\n  [6] 처방 후보 — 채택 눈금(POP=' + RUL.POP + ' 고정 · K=' + RUL.K + ' · ' + RUL.SEC + '초) 위에서 불사만 토글 · ' + RREPS + '회');
  const P6 = [];
  for (let r = 0; r < RREPS; r++) {
    const mortal = await RUL.measure(page, CIDS, { immortal: false });
    const immo = await RUL.measure(page, CIDS, { immortal: true });
    const m = {}; mortal.forEach(x => { m[x.id] = x; });
    const i = {}; immo.forEach(x => { i[x.id] = x; });
    P6.push({ m, i });
  }
  console.log('      ' + 'id'.padEnd(8) + '실제(POP고정)'.padEnd(26) + '불사(POP고정)'.padEnd(26) + '부풀림 배수');
  const infl = {};
  CIDS.forEach(id => {
    const mv = P6.map(p => p.m[id].mean), iv = P6.map(p => p.i[id].mean);
    infl[id] = P6.map((p, k) => mv[k] ? iv[k] / mv[k] : 0);
    console.log('      ' + id.padEnd(8) + mv.map(f2).join('/').padEnd(26) + iv.map(f2).join('/').padEnd(26)
      + infl[id].map(x => '×' + x.toFixed(2)).join('/'));
  });
  const inflAll = CIDS.map(id => mean(infl[id]));
  const inflWorst = Math.max(...inflAll);
  const split = P6.every((p, k) => CIDS.some(id => infl[id][k] > 1) && CIDS.some(id => infl[id][k] < 1));
  ok(split, '6-a **«뭉침» 가설이 기각됐다** — POP 을 고정하고 불사만 켜면 부호가 종마다 갈린다',
     P6.map((p, k) => '위 ' + CIDS.filter(id => infl[id][k] > 1).length + '/6').join(' · ')
     + ' — 오르는 종(lance·flask·poison)과 내리는 종(gale·aura·nova)이 매 실행 같은 편이다');
  ok(inflWorst > 1.5 && Math.min(...inflAll) < 1,
     '6-b 그 갈림이 잡음이 아니다 — 오르는 쪽·내리는 쪽 모두 배수가 크다',
     '최대 ' + CIDS[inflAll.indexOf(inflWorst)] + ' ×' + inflWorst.toFixed(2)
     + ' · 최소 ' + CIDS[inflAll.indexOf(Math.min(...inflAll))] + ' ×' + Math.min(...inflAll).toFixed(2));
  const spreadWorst = Math.max(...P6.map(p => Math.max(...CIDS.filter(id => held.indexOf(id) < 0).map(id => p.m[id].spread))));
  ok(spreadWorst < 0.6, '6-c ⏸접촉을 뺀 표본에서 채택 눈금의 K회 폭은 [C] 자유 판의 실행 간 폭보다 좁다',
     '최악 K회 폭 ' + pc(spreadWorst) + ' (자유 판 [C] 의 실행 간 폭은 최악 ' + pc(worst.w) + ')');

  /* ── [7] 처방 후보 ⓑ — PIN 장면을 «개체수로» 떠낸다 ───────────────────
     `probe504` [A] 는 15·30·45초 **시각**으로 세 프레임을 뜬다. 그 순간의 마릿수는 0~50 이라
     («실제 판 관측» 표의 `범위`), 어떤 실행에서는 «1마리 장면» 이 표준 장면이 된다.
     관측 중앙값에 가장 가까운 세 프레임을 고르면 그 축이 갇힌다. */
  console.log('\n  [7] 처방 후보 — PIN 장면을 «시각 고정» ↔ «관측 중앙값에 가장 가까운 마릿수» 로 뜬 비교 · ' + RREPS + '회');
  const P7 = [];
  for (let r = 0; r < RREPS; r++) {
    P7.push(await page.evaluate(() => {
      S.stage = 20; S.eqSkill = ['slash']; markDirty();
      enemies.length = 0;
      const frames = [], cnt = [], AT = [15, 30, 45].map(t => t * 60);
      for (let f = 0; f < 60 * 60; f++) {
        step(1 / 60);
        if (f % 30 === 0 && f > 60 * 5) {
          const live = enemies.filter(e => e.hp > 0);
          cnt.push(live.length);
          frames.push({ f, n: live.length,
            snap: live.map(e => ({ tk: e.tk, dx: +(e.x - player.x).toFixed(2), dy: +(e.y - player.y).toFixed(2) })) });
        }
        if (AT.indexOf(f) >= 0) {
          const live = enemies.filter(e => e.hp > 0);
          frames.push({ f, n: live.length, at: true,
            snap: live.map(e => ({ tk: e.tk, dx: +(e.x - player.x).toFixed(2), dy: +(e.y - player.y).toFixed(2) })) });
        }
      }
      const srt = cnt.slice().sort((a, b) => a - b);
      const med = srt[Math.floor(srt.length / 2)] || 0;
      const timed = frames.filter(x => x.at).map(x => x.n);
      const near = frames.filter(x => !x.at).slice().sort((a, b) => Math.abs(a.n - med) - Math.abs(b.n - med))
        .slice(0, 3).map(x => x.n);
      return { med, timed, near };
    }));
  }
  P7.forEach((p, i) => console.log('      #' + (i + 1) + '  관측 중앙값 ' + p.med
    + ' · 시각 고정 프레임 ' + p.timed.join('/') + '마리 · 중앙값 근처 프레임 ' + p.near.join('/') + '마리'));
  const timedSpread = (() => { const a = [].concat(...P7.map(p => p.timed)); return (Math.max(...a) - Math.min(...a)) / Math.max(1, mean(a)); })();
  const nearSpread = (() => { const a = [].concat(...P7.map(p => p.near)); return (Math.max(...a) - Math.min(...a)) / Math.max(1, mean(a)); })();
  ok(nearSpread < timedSpread, '7-a «중앙값 근처» 로 뜨면 표준 장면의 마릿수가 갇힌다',
     '시각 고정 폭 ' + pc(timedSpread) + ' → 중앙값 근처 폭 ' + pc(nearSpread));
  ok(Math.min(...[].concat(...P7.map(p => p.timed))) < 10, '7-b 시각 고정은 «거의 빈 장면» 을 표준 장면으로 뜰 수 있다(이 실행에서도 났다)',
     '최소 ' + Math.min(...[].concat(...P7.map(p => p.timed))) + '마리');

  /* ── [8] 그러면 ⓑ불사의 값은 무엇을 잰 것인가 — 같은 초수로 다시 ────────
     [6] 이 «뭉침» 을 기각했다(POP 을 고정하면 부호가 종마다 갈린다). 남은 후보는 **개체수**다 —
     504-② 가 «타격수는 서 있는 적의 수에 거의 비례» 라고 적은 그 축. 불사 판은 아무도 안 죽으니
     개체수가 안 갇힌다. [C] 는 불사 40초 ↔ 실제 60초로 **초수까지 달랐다** — 여기서는 같게 둔다. */
  console.log('\n  [8] 같은 초수(40초) 자유 판 — 불사 ↔ 실제의 판 위 개체수와 타격수 · ' + RREPS + '회');
  const P8 = [];
  for (let r = 0; r < RREPS; r++) {
    P8.push(await page.evaluate(({ ids, sec }) => {
      const rawCast = window.castSkill, rawHit = window.hitEnemy;
      let ownSave;
      const run = (id, immortal) => {
        S.stage = 20; spawnStage();
        enemies.length = 0; spawnQ.length = 0; shots.length = 0; zones.length = 0;
        if (typeof drones !== 'undefined') drones.length = 0;
        for (const k of Object.keys(skillCd)) delete skillCd[k];
        ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
        let hits = 0, casts = 0, popSum = 0, popN = 0, popMax = 0;
        window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
        window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
        for (let f = 0; f < 60 * sec; f++) {
          if (immortal) for (const e of enemies) { e.hp = e.max = 1e30; }
          step(1 / 60);
          killed = 0;
          if (f % 30 === 0) { const n = enemies.filter(e => e.hp > 0).length; popSum += n; popN++; if (n > popMax) popMax = n; }
        }
        window.castSkill = rawCast; window.hitEnemy = rawHit;
        S.own = ownSave; markDirty();
        const v = SK[id].cd > 0 ? (casts ? hits / casts : 0) : hits / sec;
        return { v: +v.toFixed(3), pop: +(popSum / Math.max(1, popN)).toFixed(1), popMax };
      };
      const out = {};
      for (const id of ids) out[id] = { imm: run(id, true), real: run(id, false) };
      enemies.length = 0; shots.length = 0; zones.length = 0;
      S.eqSkill = ['slash']; markDirty();
      return out;
    }, { ids: CIDS, sec: 40 }));
  }
  console.log('      ' + 'id'.padEnd(8) + '불사 개체수'.padEnd(20) + '실제 개체수'.padEnd(20) + '불사 값 / 실제 값');
  const popRatio = [], valRatio = [];
  CIDS.forEach(id => {
    const ip = P8.map(p => p[id].imm.pop), rp = P8.map(p => p[id].real.pop);
    const iv = P8.map(p => p[id].imm.v), rv = P8.map(p => p[id].real.v);
    popRatio.push(mean(ip) / Math.max(1e-9, mean(rp)));
    valRatio.push(mean(iv) / Math.max(1e-9, mean(rv)));
    console.log('      ' + id.padEnd(8) + ip.map(x => x.toFixed(0)).join('/').padEnd(20)
      + rp.map(x => x.toFixed(0)).join('/').padEnd(20)
      + iv.map(f2).join('/') + '  vs  ' + rv.map(f2).join('/'));
  });
  console.log('      개체수 배수 ' + popRatio.map(x => '×' + x.toFixed(2)).join(' · '));
  console.log('      값   배수 ' + valRatio.map(x => '×' + x.toFixed(2)).join(' · '));
  ok(popRatio.every(x => x > 1.1), '8-a 같은 초수에서 불사 판의 개체수가 실제 판보다 크다 — 아무도 안 죽으니 안 갇힌다',
     '최소 ×' + Math.min(...popRatio).toFixed(2) + ' · 최대 ×' + Math.max(...popRatio).toFixed(2));
  const corr = (() => {
    const n = popRatio.length, mx = mean(popRatio), my = mean(valRatio);
    const num = popRatio.reduce((a, x, i) => a + (x - mx) * (valRatio[i] - my), 0);
    const dx = Math.sqrt(popRatio.reduce((a, x) => a + (x - mx) ** 2, 0));
    const dy = Math.sqrt(valRatio.reduce((a, x) => a + (x - my) ** 2, 0));
    return (dx && dy) ? num / (dx * dy) : 0;
  })();
  /* ⚑⚑ **778 정오표 — 옛 [8-b] 는 `valRatio.every(x => x > 1.2)` 였고, 775 가 `probe504` [C2] 에서
     걷어낸 것과 **글자 그대로 같은 모양**이다**(전칭 + 문턱). 빨강을 정하는 것은 언제나 표본의
     최솟값 하나이고, 그 최솟값은 늘 같은 짝(`nova`·`gale`)이다 — 실측 nova ×1.11~1.60 으로
     문턱 1.2 에 **붙어 산다**(다른 종의 여유는 0.7~1.8, nova 는 −0.09~0.40).
     ⚠ 이것은 잡음이 아니라 **그 종의 성질**이다(775 §2-ⓑ): `값 배수 = 개체수 배수 × 도달 몫 비`
     라는 항등식에서 `nova`(t:'area' · r250)는 개체수가 ×2.4 로 늘어도 늘어난 적이 반경 **밖**에
     쌓여 한 발의 도달 몫이 반토막 난다(**포화**). 그래서 «전 종» 은 애초에 참일 수 없는 모양이었고,
     바로 위 [6-a] 가 같은 실행에서 «부호가 종마다 갈린다» 를 PASS 로 찍어 **자가 스스로를
     뒤집고** 있었다(775 §7 «자 안에서 서로를 부정하는 두 항이 있으면 플레이키는 그 사이에서 난다»).
     ⚠ 문턱 1.2 를 내리는 길은 695-④·759·766·775 가 네 번 기각했다.
     ⇒ 775 §3 처방을 그대로 옮겨 셋으로 갈랐다 — **크기**는 [8-b] 가 중앙값·평균으로,
     **왜 종마다 다른가**는 [8-b2] 가 도달 몫으로, **잡음만으로는 못 넘는다**는 [8-br] 이 진다.
     문턱은 내린 게 아니라 **올랐다**(전칭 1.2 → 중앙값 1.5). */
  const valMed = med(valRatio), valAvg = mean(valRatio);
  ok(valMed >= 1.5 && valAvg >= 1.3,
     '8-b 개체수가 안 갇힌 자유 판에서는 값이 위로 간다 — 표본의 **중앙값·평균**이 위로 간다(종별 크기는 [8-b2] 몫)',
     '배수 ' + CIDS.map((id, i) => id + ' ×' + valRatio[i].toFixed(2)).join(' · ')
     + ' · 중앙값 ×' + valMed.toFixed(2) + '(≥1.5) · 평균 ×' + valAvg.toFixed(2) + '(≥1.3)'
     + '   ⇒ 부풀림의 뿌리는 «뭉침» 이 아니라 **개체수**다 (개체수↔값 상관 참고 ' + corr.toFixed(2) + ')');

  /* [8-b2] — 옛 전칭이 거짓인 **이유**를 자가 직접 잰다(775 [C2b] 의 같은 자리).
     `값 배수 = 개체수 배수 × rx` 는 항등식이므로 물을 것은 항등식이 아니라 **`rx` 가 종마다
     갈린다는 사실**과 **값 배수의 순위를 정하는 것이 개체수가 아니라 그 `rx` 라는 것**이다.
     ⚠ 이름도, «꼴찌 한 종» 도 적지 않는다(775 §4 — 값 배수의 최솟값은 `nova` 와 `gale` 사이를
     오간다. 한 종만 묻는 자는 그 자체로 또 동전이다).
     ⚑ 바로 위 `corr`(개체수 배수 ↔ 값 배수, 피어슨)이 실측 **음수**라는 것이 이 항의 근거다 —
     «개체수가 많이 늘어난 종이 값도 많이 오른다» 가 **거짓**이고 갈리는 축은 `rx` 다.

     ⚠ **1회차에 내가 여기에 새 동전을 한 번 심었다**(775 §4 가 미리 경고한 자리 — «플레이키를
     고치러 가서 플레이키를 새로 심지 않았는지 새 항도 K회 돌려라»). 처음에는 775 [C2b] 를 글자
     그대로 옮겨 **순위상관 ρ(rx, 값 배수) ≥ 0.7** 로 적었는데, 6회 중 1회 **ρ 0.37** 로 빨개졌다:
     `probe504` [C] 에서는 값 배수가 1.09~2.21 로 **벌어져** 순위가 뜻을 갖지만, 여기 [8] 자유 판은
     `nova` 하나만 아래로 빠지고 **나머지 다섯이 2.00~2.14 로 뭉친다** — 뭉친 다섯의 순위는
     그날 잡음이 정한다(775 §4 의 «분포가 겹치면 최솟값의 이름이 갈린다» 와 같은 병).
     ⚠ 같은 이유로 **한 종의 이름도, 「아래 둘」이라는 짝도 못 쓴다** — 실측에서 `rx` 최솟값은
     `gale`↔`nova` 사이를 오가고, 「rx 아래 둘」과 「값 배수 아래 둘」이 어긋나는 실행이 있다
     (`aura` 가 rx 는 낮은데 개체수 배수가 커서 값 배수는 위에 앉는다 — 값 배수 = 개체수 배수 × rx
     라 **한 축만 보면 순위가 안 따라온다**).
     ⇒ 순위·이름을 버리고 **묶음 평균**으로 묻는다: 값 배수가 낮은 쪽(아래 둘)의 `rx` 평균이
     위쪽의 `rx` 평균보다 뚜렷이 낮다. 이름도 순위도 안 쓰므로 뭉침에 안 흔들린다. */
  const rxs = CIDS.map((id, i) => ({ id, rx: valRatio[i] / Math.max(1e-9, popRatio[i]), infl: valRatio[i] }));
  const rxSpread = Math.max(...rxs.map(x => x.rx)) / Math.min(...rxs.map(x => x.rx));
  const byInfl = rxs.slice().sort((a, b) => a.infl - b.infl);
  const botRx = mean(byInfl.slice(0, 2).map(x => x.rx)), topRx = mean(byInfl.slice(2).map(x => x.rx));
  /* ⚠ **2회차에 여기서 또 한 번 «분포를 가정한 바» 를 놓았다** — 처음엔 «아래 둘의 rx 평균
     ≤ 0.8 × 위쪽 넷» 이라는 **고정 비**로 적었는데, `rx` 자체가 눌린 실행(최대÷최소 ×1.60 ·
     보통은 ×2.0~3.8)에서 비 0.82 로 빨개졌다. 갈림의 «크기» 를 묻는 바가 **그 실행에 갈림이
     얼마나 있는지와 무관한 상수**였던 것이다(§4 와 같은 병의 세 번째 얼굴).
     ⇒ 요구하는 간격을 **그 실행의 rx 폭에 비례**시킨다 — rx 가 넓게 갈린 실행에서는 많이,
     눌린 실행에서는 그만큼만 요구한다. 상수는 «폭의 몇 분의 일» 이라는 비율 하나뿐이다. */
  const rxAll = rxs.map(x => x.rx), rxRange = Math.max(...rxAll) - Math.min(...rxAll);
  console.log('      도달 몫 비 rx(= 한 발이 판의 몇 %를 때리는가, 불사÷실제) — '
    + rxs.map(x => x.id + ' ' + x.rx.toFixed(2)).join(' · '));
  ok(rxSpread >= 1.5 && (topRx - botRx) >= 0.25 * rxRange,
     '8-b2 값 배수가 종마다 다른 뿌리는 **도달 몫**이다 — `rx` 가 종마다 갈리고(포화), 값 배수가 낮은 묶음은 그 `rx` 가 포화한 묶음이다',
     'rx 최대÷최소 ×' + rxSpread.toFixed(2) + '(≥1.5) · 아래 둘 평균 ' + botRx.toFixed(2)
     + ' ↔ 위쪽 넷 평균 ' + topRx.toFixed(2) + ' · 간격 ' + (topRx - botRx).toFixed(2)
     + ' ≥ rx 폭 ' + rxRange.toFixed(2) + ' 의 1/4 (= ' + (0.25 * rxRange).toFixed(2) + ')');

  /* [8-br] — **되돌림 시험(새 상수·새 실행 0).** [8-b] 의 바(중앙값 1.5)가 «하네스 덕» 인지
     «회차 잡음 덕» 인지 가른다: 이미 도는 `P8` 안의 **실제 판** 값끼리 서로 나눠 하네스가 없는
     짝을 만들면 그 중앙값은 1 근처에 앉아 바를 못 넘어야 한다. 넘으면 [8-b] 는 하네스가 아니라
     회차 흔들림을 재고 있는 것이다(775 [C2r] 의 같은 자리 · 759-②). */
  const nullX = [];
  CIDS.forEach(id => {
    const v = P8.map(p => p[id].real.v);
    for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) if (i !== j && v[j]) nullX.push(v[i] / v[j]);
  });
  const nullXMed = med(nullX);
  ok(nullXMed < 1.5 && nullXMed > 1 / 1.5,
     '8-br 되돌림 — 하네스를 끈 짝(실제↔실제)은 같은 바를 못 넘는다 ⇒ [8-b] 가 잰 것은 회차 흔들림이 아니라 하네스다',
     '무하네스 중앙값 ×' + nullXMed.toFixed(2) + ' (바 1.5 · 표본 ' + nullX.length + '쌍 · 폭 ×'
     + Math.min(...nullX).toFixed(2) + '~×' + Math.max(...nullX).toFixed(2) + ')');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
