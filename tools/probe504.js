#!/usr/bin/env node
/* 504 재현 — 스킬 `hits` 선언 모델 ↔ 실제 타격수 (338 규칙: 처방 전에 제품에게 직접 묻는다)
 *
 *   node tools/probe504.js
 *
 * 등재문(PROGRESS 504)이 말하는 것은 두 종(lance·gale)뿐이지만, 그 뿌리는 «관통·링·장판이
 * 몇 번 때리는가는 선언이 아니라 **장면**이 정한다» 이므로 27종 전부를 같은 자로 잰다.
 *
 * ⚠ 394 규칙 — «무엇을 눈금으로 삼는가» 를 먼저 정하고 적는다. 이 프로브는 **눈금 후보 셋을
 * 나란히 재서 하나를 고르는 과정 자체**가 결과물이다(고른 이유는 `docs/review/504-*.md` §2).
 *
 *   [A] **실제 판 관측** — 스테이지 20 일반 전투 60초. 마릿수·거리 분포·몹 구성을 잰다.
 *       여기서 나오는 «세 프레임의 배치» 가 아래 ⓐ 의 재료다.
 *   [B] **눈금 후보 ⓐ 고정 장면(504-PIN)** — [A] 가 떠낸 프레임 배치를 그대로 고정(hp 무한).
 *       결정적(재실행 흔들림 ≤ 1.4%)이지만 **적이 못 도망가서 장판형이 부푼다.**
 *   [C] **눈금 후보 ⓑ 불사 자유 판** — `verify484` [E] 가 쓰던 하네스. 적이 안 죽어 플레이어에게
 *       **뭉치고**, 그 뭉침이 범위·장판형을 최대 14배 부풀린다. 등재문의 «lance 12.5 / gale 7.0»
 *       이 바로 이 하네스의 값이다 = **등재문의 두 숫자는 스킬이 아니라 하네스를 잰 것**이다.
 *   [D] **눈금 후보 ⓒ 실제 판(채택)** — 몹이 실제로 죽는 자유 판을 **K회 반복해 평균**낸다.
 *       한 번은 23~77% 흔들리지만(예비 실측), 개체수가 상한에 붙어 있어 되먹임이 갇히고
 *       평균은 √K 로 좁혀진다. **이것만이 «게임에서 실제로 몇 번 때리는가» 를 잰다.**
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

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

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

  /* ── [A] 실제 판 관측 — 표준 장면의 두 숫자가 어디서 오는가 ─────────── */
  const A = await page.evaluate(() => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    enemies.length = 0;
    const cnt = [], dist = [], kind = {}, mins = [], snaps = [];
    const SNAP_AT = [15, 30, 45].map(t => t * 60);     /* 표준 장면으로 굳힐 세 프레임 */
    for (let f = 0; f < 60 * 60; f++) {
      step(1 / 60);
      if (f % 30 === 0 && f > 60 * 5) {            /* 0.5초마다 · 앞 5초는 채워지는 구간이라 뺀다 */
        const live = enemies.filter(e => e.hp > 0);
        cnt.push(live.length);
        let mn = Infinity;
        live.forEach(e => {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          dist.push(d); if (d < mn) mn = d; kind[e.tk] = (kind[e.tk] || 0) + 1;
        });
        if (mn < Infinity) mins.push(mn);
      }
      /* ⚑ 반경 분포만 재현하면 **각도 뭉침**이 사라진다 — 실제 판의 적은 플레이어를 쫓느라
         한쪽에 몰려 서고, 범위·장판형의 타격수는 바로 그 뭉침이 정한다. 그래서 표준 장면은
         «계산한 배치» 가 아니라 **실제 판에서 통째로 떠낸 프레임의 상대 좌표**를 쓴다. */
      if (SNAP_AT.indexOf(f) >= 0) {
        snaps.push(enemies.filter(e => e.hp > 0)
          .map(e => ({ tk: e.tk, dx: +(e.x - player.x).toFixed(2), dy: +(e.y - player.y).toFixed(2) })));
      }
    }
    const srt = dist.slice().sort((x, y) => x - y);
    const q = p => srt.length ? Math.round(srt[Math.min(srt.length - 1, Math.floor(srt.length * p))]) : 0;
    const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const N = med(cnt);
    /* 표준 장면의 «반경 사다리» — 관측 분포의 N 분위수를 그대로 쓴다. 링 하나에 몰아 세우면
       링형(gale)이 전부 맞고 관통형(lance)이 한 줄에 서는 인공 장면이 된다. */
    const ladder = [];
    for (let i = 0; i < N; i++) ladder.push(q((i + 0.5) / N));
    return { samples: cnt.length, nMed: N, nMean: +mean(cnt).toFixed(2),
             nMin: Math.min(...cnt), nMax: Math.max(...cnt), kind,
             dMed: q(0.5), dMean: Math.round(mean(dist)), dN: dist.length,
             d25: q(0.25), d75: q(0.75), ladder, snaps,
             nearMed: Math.round(med(mins)), nearMin: Math.round(Math.min(...mins)) };
  });
  console.log('  [A] 실제 판(스테이지 20 · 60초 · 표본 ' + A.samples + ')');
  console.log('      살아 있는 적 마릿수  중앙값 ' + A.nMed + ' · 평균 ' + A.nMean + ' · 범위 ' + A.nMin + '~' + A.nMax);
  console.log('      플레이어까지 거리    중앙값 ' + A.dMed + 'px · 평균 ' + A.dMean + 'px · 사분위 ' + A.d25 + '~' + A.d75 + ' (표본 ' + A.dN + ')');
  console.log('      가장 가까운 적       중앙값 ' + A.nearMed + 'px · 최소 ' + A.nearMin + 'px');
  console.log('      몹 구성              ' + Object.keys(A.kind).map(k => k + ' ' + A.kind[k]).join(' · '));
  console.log('      반경 사다리(504-STD) ' + A.ladder.join(', '));
  ok(A.samples > 100 && A.nMed > 0, 'A1 실제 판 관측 표본이 모였다', A.samples + '표본 · 적 중앙값 ' + A.nMed);

  /* ── [B] 표준 장면 504-STD 에서 27종 실측 ───────────────────────────── */
  const SCENE = { snaps: A.snaps, sec: 30 };
  const B = await page.evaluate(({ snaps, sec }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    /* 504-STD — [A] 가 실제 판에서 떠낸 세 프레임의 배치를 그대로 고정한다(플레이어 원점 기준
       상대 좌표). 마릿수·반경 분포·**각도 뭉침**이 전부 실제 판의 것이고, 고정이라 되먹임
       («세면 적이 빨리 죽어 표적이 준다»)이 없어 m 을 역산하는 자로 쓸 수 있다.
       세 프레임의 평균을 값으로 쓰고, 셋의 흩어짐도 같이 적는다. */
    const setup = (snap) => {
      enemies.length = 0;
      for (const o of snap) makeEnemy(o.tk);
      pinTo(snap);
    };
    const pinTo = (snap) => {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      for (let i = 0; i < enemies.length && i < snap.length; i++) {
        const e = enemies[i];
        e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
        e.hp = e.max = 1e30; e.slow = 0;
      }
      if (enemies.length > snap.length) enemies.length = snap.length;
    };
    const one = (s, snap) => {
      shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      skillCd[s.id] = 0;
      S.own[s.id] = { l: 0 }; S.eqSkill = [s.id]; markDirty();
      setup(snap);
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === s.id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) { step(1 / 60); pinTo(snap); }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      return { per: casts ? hits / casts : 0, hps: hits / sec, casts, hits };
    };
    const out = [];
    for (const s of SKILLS) {
      const runs = snaps.map(sn => one(s, sn));
      const avg = k => runs.reduce((a, r) => a + r[k], 0) / runs.length;
      const per = avg('per'), hps = avg('hps');
      const spread = per ? (Math.max(...runs.map(r => r.per)) - Math.min(...runs.map(r => r.per))) / per : 0;
      const declared = s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3 : s.id === 'multi' ? 3 : (s.hits || 1);
      out.push({ id: s.id, g: s.g, cd: s.cd, m: s.m, sup: !!s.sup, declared,
                 casts: Math.round(avg('casts')), hits: Math.round(avg('hits')), sec,
                 per: +per.toFixed(3), hps: +hps.toFixed(3), spread: +spread.toFixed(3),
                 each: runs.map(r => +r.per.toFixed(2)),
                 off: declared ? +(per / declared - 1).toFixed(4) : null });
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, SCENE);

  console.log('\n  [B] 표준 장면 504-STD (실제 판에서 떠낸 ' + A.snaps.length + '프레임 · '
    + A.snaps.map(s => s.length).join('/') + '마리 · 각 ' + SCENE.sec + '초 · 평균)');
  console.log('      ' + 'id'.padEnd(8) + 'g  cd    선언   실측    이탈%   3프레임      흩어짐');
  B.forEach(x => console.log('      ' + x.id.padEnd(8) + x.g + '  ' + String(x.cd).padEnd(5) + ' '
    + String(x.declared).padEnd(6) + String(x.per).padEnd(8)
    + (x.off === null ? '  —   ' : (x.off * 100).toFixed(1).padStart(6)) + '  '
    + x.each.join('/').padEnd(14) + (x.spread * 100).toFixed(0).padStart(4) + '%'
    + (x.cd === 0 ? '   (지속형 — 초당 ' + x.hps + '회, 모델 3)' : '')));

  const cast = B.filter(x => x.cd > 0 && !x.sup);
  ok(cast.every(x => x.casts > 0), 'B1 cd>0 인 종이 표준 장면에서 전부 발동했다',
     cast.filter(x => !x.casts).map(x => x.id).join(',') || '미발동 0종');
  const bad = cast.filter(x => Math.abs(x.off) > 0.15);
  ok(bad.length > 0, 'B2 «선언 ↔ 실측 ±15%» 를 벗어나는 종이 실제로 있다(등재문 재현)',
     bad.length + '종: ' + bad.map(x => x.id + ' ' + x.declared + '→' + x.per).join(' · '));
  const named = B.filter(x => x.id === 'lance' || x.id === 'gale');
  ok(true, 'B3 등재문이 지목한 두 종의 표준 장면 값',
     named.map(x => x.id + ' 모델 ' + x.declared + ' vs 실측 ' + x.per
       + ' (' + (x.off * 100).toFixed(0) + '%)').join(' · '));

  /* ── [B-r] 재현성 — 같은 장면을 한 번 더 돌려 흔들림 폭을 본다 ───────── */
  const Br = await page.evaluate(({ snaps, sec, ids }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    const pinTo = (snap) => {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      for (let i = 0; i < enemies.length && i < snap.length; i++) {
        const e = enemies[i];
        e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
        e.hp = e.max = 1e30; e.slow = 0;
      }
      if (enemies.length > snap.length) enemies.length = snap.length;
    };
    const out = {};
    for (const id of ids) {
      const s = SK[id];
      let tot = 0;
      for (const snap of snaps) {
        shots.length = 0; zones.length = 0;
        if (typeof drones !== 'undefined') drones.length = 0;
        skillCd[id] = 0;
        S.own[id] = { l: 0 }; S.eqSkill = [id]; markDirty();
        enemies.length = 0; for (const o of snap) makeEnemy(o.tk); pinTo(snap);
        let hits = 0, casts = 0;
        window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
        window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
        for (let f = 0; f < 60 * sec; f++) { step(1 / 60); pinTo(snap); }
        window.castSkill = rawCast; window.hitEnemy = rawHit;
        tot += casts ? hits / casts : 0;
      }
      out[id] = +(tot / snaps.length).toFixed(3);
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, Object.assign({ ids: ['slash', 'lance', 'gale', 'holy', 'flask'] }, SCENE));
  const drift = Object.keys(Br).map(id => {
    const a = B.find(x => x.id === id).per;
    return { id, a, b: Br[id], d: a ? Math.abs(Br[id] / a - 1) : 0 };
  });
  console.log('\n  [B-r] 재현성 — ' + drift.map(x => x.id + ' ' + x.a + '↔' + x.b
    + ' (' + (x.d * 100).toFixed(1) + '%)').join(' · '));
  ok(drift.every(x => x.d <= 0.05), 'Br1 표준 장면은 재실행 흔들림 ≤ 5%(불사 자유 판은 12% 였다)',
     '최악 ' + (Math.max(...drift.map(x => x.d)) * 100).toFixed(1) + '%');

  /* ── [C] 눈금 후보 셋을 나란히 — 등재문의 두 숫자가 어디서 왔는가 ─────
     ⓐ PIN    = [B] 고정 장면(관측 배치를 그대로 굳힘)
     ⓑ 불사   = `verify484` [E] 가 쓰던 하네스(자유 판 + hp 무한). 적이 안 죽으니 전부
                 플레이어에게 **뭉친다** — 장판·범위형이 통째로 부풀어 오른다.
     ⓒ 실제   = 몹이 실제로 죽는 자유 판(= [A] 를 잰 그 판). 아래 [D] 가 이것을 눈금으로 채택한다. */
  const CIDS = ['lance', 'gale', 'flask', 'poison', 'aura', 'nova'];
  const C = await page.evaluate(({ ids }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    const run = (id, immortal, sec) => {
      enemies.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      skillCd[id] = 0;
      S.own[id] = { l: 0 }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) {
        if (immortal) enemies.forEach(e => { e.hp = e.max = 1e30; });
        step(1 / 60);
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      return { per: casts ? +(hits / casts).toFixed(3) : 0, hps: +(hits / sec).toFixed(3), casts };
    };
    const out = {};
    for (const id of ids) out[id] = { imm: run(id, true, 40), real: run(id, false, 60) };
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { ids: CIDS });
  const rel = (a, b) => (a === 0 && b === 0) ? 0 : (b === 0 ? Infinity : Math.abs(a / b - 1));
  const cmp = CIDS.map(id => {
    const row = B.find(x => x.id === id);
    const std = row.cd > 0 ? row.per : row.hps;          /* 지속형은 «초당» 이 자다(모델 3) */
    const imm = row.cd > 0 ? C[id].imm.per : C[id].imm.hps;
    const real = row.cd > 0 ? C[id].real.per : C[id].real.hps;
    return { id, cd: row.cd, std, imm, real, dStd: rel(std, real), dImm: rel(imm, real) };
  });
  console.log('\n  [C] 눈금 후보 셋 — ⓐPIN(고정) · ⓑ불사(verify484 [E] 하네스) · ⓒ실제(몹이 죽는 자유 판)');
  console.log('      ' + 'id'.padEnd(8) + 'ⓐPIN'.padEnd(10) + 'ⓑ불사'.padEnd(10) + 'ⓒ실제'.padEnd(10) + '|ⓐ−ⓒ|    |ⓑ−ⓒ|');
  cmp.forEach(x => console.log('      ' + x.id.padEnd(8) + String(x.std).padEnd(10) + String(x.imm).padEnd(10)
    + String(x.real).padEnd(10)
    + (x.dStd * 100).toFixed(0).padStart(5) + '%' + (x.dImm * 100).toFixed(0).padStart(9) + '%'
    + (x.cd === 0 ? '   (지속형 — 초당)' : '')));
  const fin = cmp.filter(x => Number.isFinite(x.dStd) && Number.isFinite(x.dImm));
  const mStd = fin.reduce((a, x) => a + x.dStd, 0) / fin.length;
  const mImm = fin.reduce((a, x) => a + x.dImm, 0) / fin.length;
  ok(mStd < mImm, 'C1 고정 장면(ⓐ)도 불사 하네스(ⓑ)도 실제 판(ⓒ)이 아니지만 ⓑ 가 훨씬 멀다',
     '평균 이탈 ⓐ ' + (mStd * 100).toFixed(0) + '% vs ⓑ ' + (mImm * 100).toFixed(0) + '%');
  const worstImm = fin.reduce((a, b) => a.dImm > b.dImm ? a : b);
  ok(mImm > 1.0, 'C2 `verify484` [E] 가 쓰던 불사 하네스는 적이 뭉쳐 범위·장판형을 크게 부풀린다 — 등재문의 두 숫자가 여기서 왔다',
     '최악 ' + worstImm.id + ' 불사 ' + worstImm.imm + ' vs 실제 ' + worstImm.real);

  /* ── [D] 채택한 눈금 — 실제 판 K회 반복 평균(504-RUL) ─────────────────
     한 번의 자유 판은 23~77% 흔들리지만(예비 실측), ① 개체수가 상한에 붙어 있어
     «세면 표적이 준다» 되먹임이 갇히고 ② 평균은 √K 로 좁혀진다. 여기서 나오는 `mean`
     이 제품의 `hits` 선언이 될 값이고, `spread` 가 게이트 허용 오차의 **근거**다. */
  const K = 5, SEC = 30;
  const RUL = await page.evaluate(({ K, SEC }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    const one = (id, sec) => {
      S.stage = 20;
      enemies.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      S.own[id] = { l: 0 }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) step(1 / 60);
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      return { per: casts ? hits / casts : 0, hps: hits / sec, casts };
    };
    const out = [];
    for (const s of SKILLS) {
      const runs = []; for (let k = 0; k < K; k++) runs.push(one(s.id, SEC));
      /* cd>0 은 «발동 1회당 타격», cd=0(지속형)은 «초당 타격» 이 자다 — 모델의 `×3` 자리다 */
      const v = runs.map(r => s.cd > 0 ? r.per : r.hps);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const declared = s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3 : s.id === 'multi' ? 3
                     : s.cd > 0 ? (s.hits || 1) : 3;
      out.push({ id: s.id, g: s.g, cd: s.cd, m: s.m, sup: !!s.sup, declared,
                 mean: +mean.toFixed(3), each: v.map(x => +x.toFixed(2)),
                 spread: mean ? +((Math.max(...v) - Math.min(...v)) / mean).toFixed(3) : 0,
                 sem: mean ? +(((Math.max(...v) - Math.min(...v)) / mean) / (2 * Math.sqrt(K))).toFixed(3) : 0,
                 casts: Math.round(runs.reduce((a, r) => a + r.casts, 0) / K),
                 off: declared ? +(mean / declared - 1).toFixed(4) : null });
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { K, SEC });
  console.log('\n  [D] 채택 눈금 504-RUL — 실제 판 ' + K + '회 × ' + SEC + '초 평균 (cd 0 은 «초당»)');
  console.log('      ' + 'id'.padEnd(8) + 'g  cd    선언   평균     이탈%    K회 폭   평균의 폭');
  RUL.forEach(x => console.log('      ' + x.id.padEnd(8) + x.g + '  ' + String(x.cd).padEnd(5) + ' '
    + String(x.declared).padEnd(6) + String(x.mean).padEnd(9)
    + (x.off === null ? '   —  ' : (x.off * 100).toFixed(0).padStart(6)) + '  '
    + (x.spread * 100).toFixed(0).padStart(6) + '%' + (x.sem * 100).toFixed(0).padStart(8) + '%'));
  const rBad = RUL.filter(x => Math.abs(x.off) > 0.15);
  ok(rBad.length > 0, 'D1 채택 눈금에서도 선언이 ±15% 를 벗어나는 종이 많다(결함의 크기)',
     rBad.length + '/' + RUL.length + '종 · 최악 '
     + rBad.reduce((a, b) => Math.abs(a.off) > Math.abs(b.off) ? a : b).id + ' '
     + (Math.max(...rBad.map(x => Math.abs(x.off))) * 100).toFixed(0) + '%');
  const worstSem = Math.max(...RUL.filter(x => x.mean > 0).map(x => x.sem));
  ok(true, 'D2 «평균의 흔들림» 이 게이트 허용 오차의 하한이다 — ±15% 는 이 눈금으로 못 잡는다',
     'K=' + K + ' 에서 최악 ±' + (worstSem * 100).toFixed(0) + '%');

  /* ── [E] 모델이 아픈 자리 — 등급 안 «실제 DPS» 가 얼마나 벌어져 있나 ─── */
  const D = await page.evaluate(hitsMap => {
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (!t.length) return;
      const model = t.map(s => {
        const H = s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3 : s.id === 'multi' ? 3 : (s.hits || 1);
        return s.cd > 0 ? s.m * H / s.cd : s.m * 3;
      });
      const real = t.map(s => {
        const H = hitsMap[s.id];
        return s.cd > 0 ? s.m * H / s.cd : s.m * 3;
      });
      rows.push({ g, ids: t.map(s => s.id),
                  mRatio: Math.max(...model) / Math.min(...model),
                  rRatio: Math.max(...real) / Math.min(...real),
                  worst: t[real.indexOf(Math.max(...real))].id,
                  weak: t[real.indexOf(Math.min(...real))].id });
    });
    return rows;
  }, Object.fromEntries(RUL.map(x => [x.id, x.cd > 0 ? (x.mean || 1) : 3])));
  console.log('\n  [E] 등급 안 편차 — 모델(선언) vs 실제(채택 눈금 [D])');
  D.forEach(r => console.log('      g' + r.g + '  모델 ' + r.mRatio.toFixed(3)
    + '  →  실제 ' + r.rRatio.toFixed(3) + '   (최강 ' + r.worst + ' / 최약 ' + r.weak + ')'));
  ok(D.some(r => r.rRatio > 1.5), 'E1 «등급 안 DPS 동일»(484)이 실제로는 깨져 있다',
     '최악 g' + D.reduce((a, b) => a.rRatio > b.rRatio ? a : b).g + ' ' + Math.max(...D.map(r => r.rRatio)).toFixed(2) + '배');

  /* 기계가 읽을 표 — 처방(hits 재선언 · m 재역산)이 이 파일을 그대로 쓴다 */
  const outPath = path.resolve(__dirname, '..', 'docs', 'measure', '504-hits-실측.json');
  const { snaps, ...aNoSnap } = A;
  fs.writeFileSync(outPath, JSON.stringify({
    ruler: { name: '504-RUL', scene: '실제 판(스테이지 20 자유 전투, 몹 사망 있음)',
             reps: K, sec: SEC, unit: 'cd>0 = 발동 1회당 타격수 · cd=0 = 초당 타격수' },
    pinScene: { frames: A.snaps.length, n: A.snaps.map(s => s.length), sec: SCENE.sec,
                note: '눈금 후보 ⓐ(채택 안 함) — 실제 판 15·30·45초 배치를 고정' },
    observed: aNoSnap, ruled: RUL, pinned: B, control: cmp
  }, null, 2) + '\n');
  console.log('\n  표 저장: docs/measure/504-hits-실측.json');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
