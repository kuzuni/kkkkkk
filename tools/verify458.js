#!/usr/bin/env node
/* 게이트 — 작업 458 「모든 보스전: 도중에 죽으면 즉시 실패」 (저장소 주인 지시 2026-08-30)
 *
 *   node tools/verify458.js
 *
 * 재현은 `tools/probe458.js`(수리 전 표: 던전·탑·승급전·레이드 **4모드가 죽고도 계속 싸운다**).
 * 여기는 **수리가 살아 있는가**를 묻는다.
 *
 *   [전제] 수리가 index.html 에 있다 — 없으면 아래가 전부 헛초록이다.
 *   [1]    던전(30)   — 사망 프레임에 런이 끝나고 실패 통보가 나간다 · 레벨·재화 Δ0
 *   [2]    탑(209/210) — 같은 한 줄을 탄다(`S.tower` Δ0)
 *   [3]    승급전      — `promo` 가 끝나고 계급 Δ0 · 통보가 **사망**을 사유로 말한다(시간 초과가 아니다)
 *   [4]    레이드(46)  — 런이 끝나고 기록이 안 남는다 · 문구가 «레이드 실패»(«중단» 이 아니다)
 *   [5]    대조군      — 스테이지 보스(273 그대로: 패배 화면 + 파밍 + 그 자리 부활) · 아레나(123)
 *   [6]    425 등장 국면 — 국면 동안에는 **죽을 수 없다**(액터 정지 = 접촉 피해 0). 지시 ③
 *   [7]    339 연속 도전 — 실패 뒤에는 안 이어진다(클리어 화면이 안 뜨므로 카운트다운 자체가 없다)
 *   [8]    문구        — 실패로 끝난 판에서는 «부활 중...» 이 안 뜬다(94 규약 · 부활하지 않으니 거짓말)
 *   [§R]   되돌림 시험 — 옛 가드(`if(arena || raidOn || dunRun || promo) return;`) 사본에서는
 *                        [1]~[4] 가 **빨개진다**(4모드 전부 죽고도 만피로 계속 싸운다).
 *                        대조군 둘은 사본에서도 초록이다 = 이 자가 «아무거나 흔들면 빨개지는» 항등식이 아니다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const is = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* ── 되돌림 시험용 «수리 전» 사본 ──────────────────────────────────────────
   갈아 끼울 자리는 한 곳이다 — 458 이 지운 «조기 return» 을 그대로 되돌린다. */
const GUARD_NEW = `  if(md === 'arena') return false;                    /* 123 — step 의 아레나 절이 받는다 */
  if(md === 'dun')  { endDunRun(false); return true; }  /* 30·209 — 206 실패 통보(보스 체력 n% 남음) */
  if(md === 'promo'){ endPromo(false, true); return true; }
  if(md === 'raid') { endRaid(false, true);  return true; }`;
const GUARD_OLD = `  if(arena || raidOn || dunRun || promo) return false;`;

/* 페이지 안에서 도는 시나리오 — 수리본·사본이 **같은 코드**를 돈다(자가 두 벌이면 비교가 안 된다) */
const SCEN = function (md) {
  const out = { md };
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999; S.gold = 1e7;
    arena = null; raidOn = null; promo = null;
    if (dunRun) endDunRun(false, true);
    spawnStage();
    document.getElementById('defw').classList.remove('on');
    document.getElementById('dclw').classList.remove('on');
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });

    const toasts = [], msgs = [];
    const rn = window.notify, rs = window.showMsg;
    window.notify = function (t) { toasts.push(String(t).replace(/<[^>]*>/g, '')); return rn.apply(this, arguments); };
    window.showMsg = function (t) { msgs.push(String(t)); return rs.apply(this, arguments); };
    const restore = function () { window.notify = rn; window.showMsg = rs; };

    /* ── 진입 ── */
    if (md === 'dun' || md === 'tower' || md === 'intro' || md === 'auto') {
      if (md === 'tower') challengeTower(TOWERS[0].id);
      else { const d = DUNGEONS[0]; S.dunTk[d.id] = 9; if (md === 'auto') dgdAutoOn = true; challengeDungeon(d); }
      if (!dunRun) { restore(); out.err = '던전 진입 실패'; return out; }
      out.before = { floor: md === 'tower' ? S.tower : S.dun[DUNGEONS[0].id], gold: S.gold, dia: S.dia };
      if (md === 'auto') dunRun.auto = true;
      spawnQ.forEach(function (q) { if (q.t === 'dunboss') q.delay = 0; });
      for (let i = 0; i < 30 && !enemies.some(function (e) { return e.tk === 'dunboss'; }); i++) step(1 / 60);
      /* [6] 은 국면 «안» 에서 죽여 보는 것이 목적이라 국면을 넘기지 않는다 */
      if (md !== 'intro') for (let i = 0; i < 300 && dunRun && dunRun.introOn; i++) step(1 / 60);
      out.introOn = !!(dunRun && dunRun.introOn);
    } else if (md === 'promo') {
      startPromo();
      if (!promo) { restore(); out.err = '승급전 진입 실패'; return out; }
      out.before = { rank: S.rank, cos: Object.keys(S.avatars || {}).length, ttl: Object.keys(S.titles || {}).length, gold: S.gold, dia: S.dia };
    } else if (md === 'raid') {
      startRaid(RAIDS[0]);
      if (!raidOn) { restore(); out.err = '레이드 진입 실패'; return out; }
      out.before = { best: JSON.stringify(S.raidBest || {}), gold: S.gold, dia: S.dia };
    } else if (md === 'arena') {
      startArena();
      if (!arena) { restore(); out.err = '아레나 진입 실패'; return out; }
      out.before = { gold: S.gold, dia: S.dia };
    } else if (md === 'stage') {
      startBoss();
      for (let i = 0; i < 200 && !enemies.length; i++) step(1 / 60);
      out.before = { gold: S.gold, dia: S.dia };
    }
    out.mdIn = bossMode();

    /* ── 실제 접촉 피해로 죽인다(273 dieToMob 과 같은 경로 — 사망 «갈림» 이 경로 안에 있는지 본다) ── */
    let deaths = 0;
    const rd = window.playerDied;
    window.playerDied = function () { deaths++; return rd.apply(this, arguments); };
    player.hp = 1; player.inv = 0; player.dead = 0;
    let e = enemies[0];
    if (!e) { makeEnemy('zombie'); e = enemies[enemies.length - 1]; }
    e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9; e.x = player.x; e.y = player.y;
    const hp0 = player.hp;
    let fr = 0;
    /* [6] 은 «국면이 끝날 때까지» 붙여 놓는 것이 시험이다 — 90 프레임을 세면 국면(1.4초)이
       끝난 **뒤** 프레임까지 세어 «국면 중에 죽었다» 로 잘못 읽힌다(1회차에 그렇게 빨갰다). */
    for (; fr < (md === 'intro' ? 400 : 90) && !deaths &&
           (md !== 'intro' || (dunRun && dunRun.introOn)); fr++) step(1 / 60);
    window.playerDied = rd;
    out.died = deaths > 0; out.frames = fr;
    out.hpKept = player.hp === hp0;                    /* [6] — 국면 중에는 한 대도 안 맞는다 */

    /* ① 사망 «프레임» 직후 = 같은 step 안에서 모드가 끝났는가 */
    out.at0 = { md: bossMode(), dun: !!dunRun, promo: !!promo, raid: !!raidOn, arena: !!arena,
                defw: document.getElementById('defw').classList.contains('on'),
                dclw: document.getElementById('dclw').classList.contains('on'),
                farm: !!S.bossFarm, toasts: toasts.slice(), msgs: msgs.slice(),
                introOn: !!(dunRun && dunRun.introOn) };

    /* ② +4초 — 사망 연출(2.4초)이 끝나고도 그 보스전이 살아 있는가 = «죽어도 안 지는 보스전» */
    for (let i = 0; i < 240; i++) step(1 / 60);
    out.at4 = { md: bossMode(), dun: !!dunRun, promo: !!promo, raid: !!raidOn, arena: !!arena,
                hp: +(player.hp / Math.max(1, stat.maxHp)).toFixed(3) };

    /* ③ +10초 — 되살아나 계속 싸우는가 · 339 자동 도전이 이어지는가 */
    for (let i = 0; i < 360; i++) step(1 / 60);
    out.at10 = { md: bossMode(), dun: !!dunRun, promo: !!promo, raid: !!raidOn, arena: !!arena,
                 hp: +(player.hp / Math.max(1, stat.maxHp)).toFixed(3),
                 dclw: document.getElementById('dclw').classList.contains('on'),
                 toasts: toasts.slice(), msgs: msgs.slice() };

    /* ③ 보상·진행 */
    out.after = { gold: S.gold, dia: S.dia };
    if (md === 'dun' || md === 'intro' || md === 'auto') out.after.floor = S.dun[DUNGEONS[0].id];
    if (md === 'tower') out.after.floor = S.tower;
    if (md === 'promo') { out.after.rank = S.rank; out.after.cos = Object.keys(S.avatars || {}).length, out.after.ttl = Object.keys(S.titles || {}).length; }
    if (md === 'raid') out.after.best = JSON.stringify(S.raidBest || {});

    restore();
    if (dunRun) endDunRun(false, true);
    arena = null; raidOn = null; promo = null; dgdAutoOn = false;
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });
    document.getElementById('defw').classList.remove('on');
    document.getElementById('dclw').classList.remove('on');
  } catch (err) { out.err = String((err && err.message) || err).slice(0, 200); }
  return out;
};

async function boot(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof playerDied === 'function');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* 161 — 얼리지 않으면 다음 프레임이 되돌린다 */
  return { page, errs };
}
const runAll = async (page, modes) => {
  const r = {};
  for (const m of modes) r[m] = await page.evaluate(SCEN, m);
  return r;
};
const T = (s, re) => s.some(t => re.test(t));

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[전제] 수리가 index.html 에 살아 있는가');
  const hasGuard = src.includes(GUARD_NEW);
  const hasMd = /function playerDied\(\)\{\n  const md = bossMode\(\);/.test(src);
  const hasMsg = src.includes("if(!playerDied()) showMsg('부활 중...');");
  is(hasGuard, '[전제-a] `playerDied()` 가 던전·승급전·레이드를 각 모드의 실패 경로로 보낸다');
  is(hasMd, '[전제-b] 갈림이 284 `bossMode()` 한 곳에서 온다(모드 조건을 다시 안 적는다)');
  is(hasMsg, '[전제-c] 호출부가 «부활 중...» 을 «모드가 안 끝났을 때만» 띄운다');
  if (!hasGuard || !hasMd || !hasMsg) {
    console.log('\nVERIFY458 FAIL — 수리가 사라졌거나 갈아 끼울 자리가 바뀌었다. 아래를 돌 이유가 없다.');
    process.exit(1);
  }

  const revPath = path.join(path.dirname(SRC), `.verify458-rev-${process.pid}.html`);
  fs.writeFileSync(revPath, src.replace(GUARD_NEW, GUARD_OLD));
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const { page, errs } = await boot(ctx, 'file://' + SRC);

  const MODES = ['dun', 'tower', 'promo', 'raid', 'arena', 'stage', 'intro', 'auto'];
  const R = await runAll(page, MODES);
  for (const m of MODES) if (R[m].err) console.log('  ⚠ ' + m + ' 시나리오 오류: ' + R[m].err);

  /* ── [1] 던전 ── */
  console.log('\n[1] 던전(30) — 사망 = 즉시 실패');
  const d = R.dun;
  is(d.died === true, '[1-a] (준비) 접촉 피해로 실제로 죽었다', d.frames + ' 프레임');
  is(d.mdIn === 'dun', '[1-b] (준비) 죽기 전 bossMode() 가 "dun" 이다', '"' + d.mdIn + '"');
  is(d.at0 && d.at0.dun === false && d.at0.md === '',
     '[1-c] ★ 사망 프레임 안에 런이 끝난다(dunRun=null · bossMode="")',
     d.at0 && ('dun=' + d.at0.dun + ' md="' + d.at0.md + '"'));
  is(d.at0 && T(d.at0.toasts, /실패/), '[1-d] 실패 결과가 통보된다(206)',
     d.at0 && (d.at0.toasts.join(' | ') || '없음'));
  is(d.at10 && d.at10.md === '' && d.at10.dun === false,
     '[1-e] 10초 뒤에도 그 던전으로 돌아가 있지 않다(«죽어도 안 지는» 재발 감시)');
  is(d.before && d.after && d.after.floor === d.before.floor,
     '[1-f] 실패라 레벨이 안 오른다', d.before && (d.before.floor + ' → ' + d.after.floor));
  is(d.before && d.after && d.after.gold === d.before.gold && d.after.dia === d.before.dia,
     '[1-g] 보상 0(골드·다이아 Δ0)', d.before && (d.before.gold + '/' + d.before.dia + ' → ' + d.after.gold + '/' + d.after.dia));
  is(d.at0 && d.at0.defw === false, '[1-h] 18 패배 화면은 안 뜬다 — 던전은 제 실패 통보가 받는다(273 ①)');

  /* ── [2] 탑 ── */
  console.log('\n[2] 탑(209/210) — 던전과 같은 한 줄');
  const t = R.tower;
  is(t.died === true, '[2-a] (준비) 실제로 죽었다');
  is(t.at0 && t.at0.dun === false && t.at0.md === '', '[2-b] ★ 사망 프레임 안에 런이 끝난다');
  is(t.at0 && T(t.at0.toasts, /실패/), '[2-c] 실패 통보', t.at0 && (t.at0.toasts.join(' | ') || '없음'));
  is(t.before && t.after && t.after.floor === t.before.floor, '[2-d] `S.tower` 가 안 오른다',
     t.before && (t.before.floor + ' → ' + t.after.floor));
  is(t.at10 && t.at10.md === '', '[2-e] 10초 뒤에도 탑에 남아 있지 않다');

  /* ── [3] 승급전 ── */
  console.log('\n[3] 승급전 — 사망 = 즉시 실패 · 사유를 바르게 말한다');
  const p = R.promo;
  is(p.died === true, '[3-a] (준비) 실제로 죽었다');
  is(p.mdIn === 'promo', '[3-b] (준비) 죽기 전 bossMode() 가 "promo" 다', '"' + p.mdIn + '"');
  is(p.at0 && p.at0.promo === false && p.at0.md === '', '[3-c] ★ 사망 프레임 안에 승급전이 끝난다');
  is(p.at0 && T(p.at0.toasts, /승급 실패/), '[3-d] 승급 실패가 통보된다',
     p.at0 && (p.at0.toasts.join(' | ') || '없음'));
  is(p.at0 && T(p.at0.toasts, /쓰러졌습니다/) && !T(p.at0.toasts, /시간 안에/),
     '[3-e] ★ 통보가 **사망**을 사유로 말한다(«시간 안에 …» 는 죽어서 진 판에서 거짓말이다 — LESSONS 295-②)',
     p.at0 && (p.at0.toasts.join(' | ') || '없음'));
  is(p.before && p.after && p.after.rank === p.before.rank, '[3-f] 계급이 안 오른다',
     p.before && (p.before.rank + ' → ' + p.after.rank));
  is(p.before && p.after && p.after.cos === p.before.cos, '[3-g] 승급 보상(코스튬)이 안 나간다');
  is(p.at10 && p.at10.md === '', '[3-h] 10초 뒤에도 승급전이 안 살아 있다');

  /* ── [4] 레이드 ── */
  console.log('\n[4] 레이드(46) — 사망 = 즉시 실패 · «중단» 과 문구가 갈린다');
  const rd = R.raid;
  is(rd.died === true, '[4-a] (준비) 실제로 죽었다');
  is(rd.mdIn === 'raid', '[4-b] (준비) 죽기 전 bossMode() 가 "raid" 다', '"' + rd.mdIn + '"');
  is(rd.at0 && rd.at0.raid === false && rd.at0.md === '', '[4-c] ★ 사망 프레임 안에 레이드가 끝난다');
  is(rd.at0 && T(rd.at0.msgs, /^레이드 실패$/), '[4-d] ★ 문구가 «레이드 실패» 다(«레이드 중단» 은 [포기] 의 말이다)',
     rd.at0 && (rd.at0.msgs.join(' | ') || '없음'));
  is(rd.at0 && !T(rd.at0.msgs, /^레이드 중단$/), '[4-e] «레이드 중단» 은 안 뜬다');
  is(rd.before && rd.after && rd.after.best === rd.before.best, '[4-f] 기록이 안 남는다(record=false)',
     rd.before && (rd.before.best + ' → ' + rd.after.best));
  is(rd.at10 && rd.at10.md === '', '[4-g] 10초 뒤에도 레이드가 안 살아 있다');

  /* ── [5] 대조군 ── */
  console.log('\n[5] 대조군 — 273(스테이지)·123(아레나) 는 건드리지 않았다');
  const st = R.stage, ar = R.arena;
  is(st.died === true, '[5-a] (준비) 스테이지 보스전에서 실제로 죽었다');
  is(st.at0 && st.at0.defw === true, '[5-b] 18 패배 화면이 뜬다(273 ① 그대로)');
  is(st.at0 && st.at0.farm === true, '[5-c] 보스 도전 대기(파밍)로 넘어간다(273 ②)');
  is(st.at0 && T(st.at0.msgs, /^부활 중\.\.\.$/), '[5-d] 스테이지는 그 자리에서 부활한다 = «부활 중...» 이 참이다',
     st.at0 && (st.at0.msgs.join(' | ') || '없음'));
  is(ar.died === true, '[5-e] (준비) 아레나에서 실제로 죽었다');
  is(ar.at0 && ar.at0.arena === false, '[5-f] 아레나는 제 절(step)이 사망을 받는다 — 여기서 안 건드렸다');
  is(ar.at0 && T(ar.at0.toasts, /아레나 패배/), '[5-g] 아레나 패배 통보(123)',
     ar.at0 && (ar.at0.toasts.join(' | ') || '없음'));

  /* ── [6] 425 등장 국면 ── */
  console.log('\n[6] 425 등장 국면 — 국면 동안에는 죽을 수 없다(지시 ③)');
  const iv = R.intro;
  is(iv.introOn === true, '[6-a] (준비) 등장 국면 «안» 에서 시작했다', 'introOn=' + iv.introOn);
  is(iv.frames >= 60, '[6-a2] (준비) 국면이 끝날 때까지 보스를 붙여 놨다(≥ 1초)', iv.frames + ' 프레임');
  is(iv.died === false, '[6-b] ★ 국면 내내 붙여 놔도 사망이 없다(액터 정지)', 'died=' + iv.died);
  is(iv.hpKept === true, '[6-c] 체력이 한 톨도 안 깎인다', 'hpKept=' + iv.hpKept);
  is(iv.at0 && iv.at0.dun === true, '[6-d] 런이 살아 있다 — 국면은 실패로 끝나지 않는다');

  /* ── [7] 339 연속 도전 ── */
  console.log('\n[7] 339 «연속 도전» — 실패 뒤에는 안 이어진다');
  const au = R.auto;
  is(au.died === true, '[7-a] (준비) 연속 도전을 켠 런에서 죽었다');
  is(au.at0 && au.at0.dclw === false, '[7-b] 31 클리어 화면이 안 뜬다(카운트다운의 그릇 자체가 없다)');
  is(au.at10 && au.at10.dclw === false && au.at10.dun === false,
     '[7-c] ★ 10초를 흘려도 새 런이 안 열린다(자동 도전은 클리어 전용)');

  /* ── [8] 문구 ── */
  console.log('\n[8] 94 문구 — 실패로 끝난 판에서는 «부활 중...» 이 안 뜬다');
  for (const [k, n] of [['dun', '던전'], ['tower', '탑'], ['promo', '승급전'], ['raid', '레이드']]) {
    is(R[k].at0 && !T(R[k].at0.msgs, /^부활 중\.\.\.$/), '[8] ' + n + ' — «부활 중...» 없음',
       R[k].at0 && (R[k].at0.msgs.join(' | ') || '없음'));
  }

  is(errs.length === 0, '[9] 콘솔·페이지 오류 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  /* ── [§R] 되돌림 시험 ── */
  console.log('\n[§R] 되돌림 시험 — 옛 가드 사본에서는 [1]~[4] 가 빨개진다');
  const { page: rp, errs: rerrs } = await boot(ctx, 'file://' + revPath);
  const RV = await runAll(rp, ['dun', 'tower', 'promo', 'raid', 'arena', 'stage']);
  for (const [k, n] of [['dun', '던전'], ['tower', '탑'], ['promo', '승급전'], ['raid', '레이드']]) {
    const v = RV[k];
    /* «hp 가 만피인가» 로 재지 않는다 — 사본에서는 되살아난 즉시 다시 맞아 죽으므로 표본
       순간의 hp 는 0 일 수도 1 일 수도 있다(1회차에 그렇게 빨갰다). 결함의 정확한 모양은
       **사망 연출이 끝난 뒤에도 그 보스전이 그대로 살아 있다** 는 것이다. */
    const alive = v.died === true && v.at4 && v.at4.md === v.mdIn && v.at4.md !== '';
    is(alive, '[R-' + k + '] 사본에서는 ' + n + ' 이 «죽고도 계속 싸운다» — 결함이 재현된다',
       v.at4 && ('md="' + v.at4.md + '" hp=' + v.at4.hp));
  }
  is(RV.stage.at0 && RV.stage.at0.defw === true && RV.stage.at0.farm === true,
     '[R-stage] 사본에서도 스테이지는 실패한다 = 이 자는 «아무거나 흔들면 빨개지는» 항등식이 아니다');
  is(RV.arena.at0 && RV.arena.at0.arena === false, '[R-arena] 사본에서도 아레나는 실패한다(123 은 이 수리와 무관)');
  is(rerrs.length === 0, '[R-e] 사본 콘솔·페이지 오류 0건', rerrs.length ? rerrs.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nVERIFY458 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
