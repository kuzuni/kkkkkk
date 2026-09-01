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
 *   [§P]   양성 대조(674) — **실제로 클리어한 판**에서는 [1-g]·[1-g2] 의 눈금이 보상을 잡는다.
 *                        이 절이 없으면 «보상 0» 항은 «아무것도 안 재는 자» 와 구별되지 않는다.
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
    /* ⚑ 674 — «보상» 의 눈금을 **지급 경로**로 갈았다. 종전에는 `S.gold` 증감으로 쟀는데
       그것은 잡몹 킬 골드(`killEnemy` 의 `S.gold += g` — 22153)까지 같이 세는 자다.
       던전·탑 클리어 보상은 예외 없이 `giveReward(d.rw(f), …)`(finishDunRun 26875)를 지나므로
       그 호출을 세면 **전투 수입과 보상이 갈린다**. 재화 축은 [1-g2] 가 «사망 프레임» 창에서 따로 본다. */
    const rewards = [];
    const rn = window.notify, rs = window.showMsg, rg = window.giveReward;
    window.notify = function (t) { toasts.push(String(t).replace(/<[^>]*>/g, '')); return rn.apply(this, arguments); };
    window.showMsg = function (t) { msgs.push(String(t)); return rs.apply(this, arguments); };
    window.giveReward = function (r) {
      rewards.push(Object.keys(r || {}).map(function (k) { return k + ':' + r[k]; }).join(','));
      return rg.apply(this, arguments);
    };
    const restore = function () { window.notify = rn; window.showMsg = rs; window.giveReward = rg; };

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
    /* ⚑ 674 — 표본의 전제는 «이 창 안에서는 못 이긴다» 다. 안 세우면 표본이 **이겨서** 끝나
       결함(«죽고도 계속 싸운다»)이 설 자리 자체가 사라진다 — §R 의 탑 표본이 실제로 그랬다
       (시련의 탑 1층 need 168 · 사본에서 사망 창 안에 격파 → 클리어 → 층 1→2 → md ""). 필드에
       이미 선 개체의 체력만 창보다 크게 올린다(스폰 규칙·판정·보상 경로는 한 줄도 안 건드린다).
       ⚠ 수리본의 [1]~[4] 는 사망 프레임(1프레임)에 끝나므로 이 값에 닿지 않는다 — 이 줄이
       바꾸는 것은 **사본에서 표본이 살아남는 시간**뿐이다. */
    enemies.forEach(function (x) { if (x.max > 0) { x.max = 1e12; x.hp = 1e12; } });
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
                /* ⚑ 674 — 재화는 **사망 프레임**에서 잰다. 아래 ②③ 은 실패 뒤 10초를 더 흘리는데
                   그 창은 스테이지로 돌아간 플레이어가 잡몹을 잡는 창이라 «보상» 이 아니다. */
                gold: S.gold, dia: S.dia,
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
    out.rewards = rewards.slice();          /* 674 — 지급 경로(giveReward)를 지난 횟수·내용 */
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

/* ⚑ 674 — §P 양성 대조. [1-g]·[1-g2] 가 «아무것도 안 재는 자» 가 아님을 못박는다:
   **같은 눈금**으로 실제 클리어를 재면 지급 경로가 잡히고 재화가 그 프레임에 오른다.
   (실패 표본과 코드를 나누는 이유는 위 SCEN 이 «못 이기게» 체력을 올려 두기 때문이다 —
    양성 대조는 정반대로 «이기는» 표본이라 그 줄을 안 탄다.) */
const SCEN_CLR = function () {
  const out = {};
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999; S.gold = 1e7;
    arena = null; raidOn = null; promo = null;
    if (dunRun) endDunRun(false, true);
    spawnStage();
    const rewards = [];
    const rg = window.giveReward;
    let goldAtPay = null, diaAtPay = null;
    window.giveReward = function (r) {
      rewards.push(Object.keys(r || {}).map(function (k) { return k + ':' + r[k]; }).join(','));
      const v = rg.apply(this, arguments);
      goldAtPay = S.gold; diaAtPay = S.dia;
      return v;
    };
    const d = DUNGEONS[0]; S.dunTk[d.id] = 9;
    challengeDungeon(d);
    if (!dunRun) { window.giveReward = rg; out.err = '던전 진입 실패'; return out; }
    out.before = { gold: S.gold, dia: S.dia, floor: S.dun[d.id] };
    spawnQ.forEach(function (q) { if (q.t === 'dunboss') q.delay = 0; });
    for (let i = 0; i < 30 && !enemies.some(function (e) { return e.tk === 'dunboss'; }); i++) step(1 / 60);
    for (let i = 0; i < 300 && dunRun && dunRun.introOn; i++) step(1 / 60);
    /* 보스를 «한 대면 죽는» 상태로 두고 실제 전투로 격파한다(판정·지급은 제품 경로 그대로) */
    let n = 0;
    for (let i = 0; i < 900 && dunRun; i++) {
      const b = enemies.find(function (e) { return e.tk === 'dunboss' && e.hp > 0; });
      if (b) { b.hp = 1; b.x = player.x + 8; b.y = player.y; n++; }
      step(1 / 60);
    }
    out.bossFrames = n;
    out.rewards = rewards.slice();
    out.goldAtPay = goldAtPay; out.diaAtPay = diaAtPay;
    out.after = { gold: S.gold, dia: S.dia, floor: S.dun[d.id] };
    window.giveReward = rg;
    if (dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });
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
  /* ⚑ 674 — 종전 [1-g] 는 «`S.gold` 가 안 늘었나» 를 **실패 뒤 10초를 더 흘린 뒤**에 물었다.
     그 창은 스테이지로 돌아간 플레이어가 잡몹을 잡는 창이라(`killEnemy` 의 `S.gold += g`)
     보상이 0 이어도 골드는 늘어난다 — 자가 **전투 수입을 보상으로 세고 있었다**(실측 +865).
     축은 «클리어 보상이 안 나갔다» 하나인데 눈금이 둘이었으므로 눈금을 갈랐다:
       [1-g]  지급 경로(`giveReward`)를 한 번도 안 지났다  ← 보상의 정의 그 자체
       [1-g2] **사망 프레임**의 골드·다이아 Δ0            ← 재화 축, 창을 지급 프레임으로 좁혔다
     이 눈금이 «아무것도 안 재는 자» 가 아니라는 것은 §P(양성 대조 — 실제 클리어)가 못박는다. */
  is(d.rewards && d.rewards.length === 0, '[1-g] 보상 지급 경로(giveReward)를 한 번도 안 지났다',
     d.rewards && (d.rewards.length + '건' + (d.rewards.length ? ' — ' + d.rewards.join(' | ') : '')));
  is(d.before && d.at0 && d.at0.gold === d.before.gold && d.at0.dia === d.before.dia,
     '[1-g2] 사망 프레임의 골드·다이아 Δ0(전투 수입이 아니라 지급 프레임을 본다)',
     d.before && d.at0 && (d.before.gold + '/' + d.before.dia + ' → ' + d.at0.gold + '/' + d.at0.dia));
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

  /* ── [§P] 양성 대조(674) — 같은 눈금이 «실제 보상» 은 잡는다 ── */
  console.log('\n[§P] 양성 대조 — 클리어한 판에서는 [1-g]·[1-g2] 의 눈금이 보상을 잡는다');
  const P = await page.evaluate(SCEN_CLR);
  if (P.err) is(false, '[P] 표본을 못 세웠다', P.err);
  else {
    is(P.after && P.before && P.after.floor === P.before.floor + 1,
       '[P-a] (준비) 실제로 클리어했다(층이 올랐다)', P.before && (P.before.floor + ' → ' + P.after.floor));
    is(P.rewards && P.rewards.length >= 1, '[P-b] ★ [1-g] 의 눈금이 지급 경로를 잡는다',
       P.rewards && (P.rewards.length + '건 — ' + P.rewards.join(' | ')));
    is(P.goldAtPay !== null && P.before && P.goldAtPay > P.before.gold,
       '[P-c] ★ [1-g2] 의 눈금(지급 프레임의 재화)이 오른다',
       P.before && (P.before.gold + ' → ' + P.goldAtPay));
  }

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
    /* ⚑ 674 — **전제**: 표본이 «이겨서» 끝나면 결함이 설 자리가 없고, 그때 나오는 md="" 는
       수리가 아니라 클리어다. 종전에는 이 자리가 안 물어져 [R-tower] 가 «수리가 재현 안 된다»
       처럼 보였다(사본에서 시련의 탑 1층 need 168 → 사망 창 안에 격파 → 층 1→2). */
    is(!(v.rewards && v.rewards.length),
       '[R-' + k + '-전제] 그 표본이 **클리어로** 끝나지 않았다(보상 지급 0건 — 674)',
       v.rewards ? v.rewards.length + '건' + (v.rewards.length ? ' — ' + v.rewards.join(' | ') : '') : '?');
  }
  is(RV.stage.at0 && RV.stage.at0.defw === true && RV.stage.at0.farm === true,
     '[R-stage] 사본에서도 스테이지는 실패한다 = 이 자는 «아무거나 흔들면 빨개지는» 항등식이 아니다');
  is(RV.arena.at0 && RV.arena.at0.arena === false, '[R-arena] 사본에서도 아레나는 실패한다(123 은 이 수리와 무관)');
  is(rerrs.length === 0, '[R-e] 사본 콘솔·페이지 오류 0건', rerrs.length ? rerrs.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nVERIFY458 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
