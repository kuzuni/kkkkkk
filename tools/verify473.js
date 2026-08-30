#!/usr/bin/env node
/* 게이트 — 작업 473 「보스전: 전투 시작 전에는 스킬 쿨타임이 흐르지 않고 스킬이 발동되지 않는다」
 *          (저장소 주인 지시 2026-08-30 «보스전할떄 전투시작 하기전까지 스킬 쿨타임 지나고 있으면안됨.
 *           발동되고있어서도 안됨»)
 *
 *   node tools/verify473.js
 *
 * 재현은 `tools/probe473.js`. **수리 전 실측표**(등재문의 가설이 절반만 맞았다):
 *   · 국면 «중» 84프레임 — 쿨 감소 0.000s · 시전 0건 (457 의 step() 맨 위 early-return 이 이미 막고 있었다)
 *   · 국면을 «여는» 프레임 — 시전 **2건** (그 프레임만 위를 지나 아래로 내려온다)
 *   · 국면 «전» 스폰 딜레이 83프레임(1.38s) — 쿨 감소 **2.800s** · 빈 바닥 시전 **82건** ← 사람이 보는 결손
 * 여기는 **수리가 살아 있는가**를 묻는다.
 *
 *   [전제]  수리가 index.html 에 있다 — 없으면 아래가 전부 헛초록이다
 *   [A]     5모드(스테이지 28 · 던전 30 · 탑 209 · 승급전 · 레이드 46) — «전투 시작 전» 창 전체에서
 *           `skillCd` 감소 **0.000s**(a) · `castSkill` 성공 **0회**(b) · 투사체/장판 순증 **0**(b)
 *   [B]     창의 세 조각을 **따로** 묻는다 — 스폰 딜레이 · 국면 여는 프레임 · 국면 중
 *           (하나로 합치면 «여는 프레임» 한 칸이 다시 새도 초록이다)
 *   [C]     범위 — 이 창에서 펫 탄(`shots.k==='pet'`)은 **구조적으로 0**(가드를 안 얹은 근거)
 *   [D]     459 규약 보존 — 전투 시작 프레임에 쿨 전부 0 · 첫 시전이 **0.5초 안**
 *   [E]     음성항 ① 잡몹 파밍 중에는 가드가 **안 걸린다**(스킬이 평소대로 돈다)
 *   [F]     음성항 ② 포기로 런이 사라지면 예약이 남아도 잠금은 **그 프레임에 풀린다**(453 `battleBusy`)
 *   [G]     음성항 ③ 던전 페이즈 2번째 보스 — 예약을 안 거는 갈래라 스킬이 계속 돈다(459 등재문 ②)
 *   [§R1]   되돌림 시험 ① — `preFight()` 를 항상 거짓으로 만든 사본에서는 결손이 그대로 재현된다
 *           (스테이지·던전만. 승급전·레이드는 **사본에서도 0** — 국면을 start 함수에서 여는 모드라
 *            첫 프레임부터 457 early-return 에 걸린다 = 샐 창이 없다. 348 §R 과 같은 처방)
 *   [§R2]   되돌림 시험 ② — **좁은 처방**(등재문 ① «국면만 막는다» = `preFight = () => !!bossIntro`)
 *           사본은 스폰 딜레이 82건을 **못 막는다** = 지금 폭이 «넓게 잡은 것» 이 아니라는 증거
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

/* ── 갈아 끼울 자리(수리본에 그대로 있어야 한다) ───────────────────────────── */
const GUARD = `const preFight = () => !!bossIntro || (cdArm && battleBusy());`;
const GUARD_OFF = `const preFight = () => false;`;                 /* §R1 — 수리 전 트리와 같은 뜻 */
const GUARD_NARROW = `const preFight = () => !!bossIntro;`;        /* §R2 — 등재문 ① 의 좁은 처방 */
/* ⚑ 475 이관(2026-08-30) — 같은 스킬 루프에 «전투가 **끝난** 뒤»(격파 시퀀스) 가드가 한 항 붙었다.
   473 이 지키는 것은 «시작 전 창» 이고 475 는 «끝난 뒤 창» 이라 **둘이 같은 조건 안에 있어야**
   두 지시가 한꺼번에 지켜진다(감소와 시전이 같은 가드 안이라는 473 의 규약 그대로).
   ⚠ 호출부 문자열에서 `&& !bossClear` 만 빼고 세면 «475 가 사라져도 초록» 이 되므로 항째로 옮긴다. */
const CALL = `    if(!preFight() && !bossClear){`;

/* 페이지 안에서 도는 시나리오 — 수리본·사본이 **같은 코드**를 돈다.
   창을 셋으로 갈라(W1 스폰 딜레이 · open 국면 여는 프레임 · W2 국면 중) 프레임마다 찍는다. */
const SCEN = function (arg) {
  const md = arg.md, eq = arg.eq, small = arg.small, DT = 1 / 60;
  const out = { md };
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    eq.forEach(function (id) { S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = eq.slice();
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999; S.gold = 1e7;
    var pid = (typeof PETS !== 'undefined' && PETS[0]) ? PETS[0].id : null;
    if (pid) { S.pet = S.pet || {}; S.pet[pid] = { n: 1, l: 1 }; S.eqPet = [pid]; }
    arena = null; raidOn = null; promo = null;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    if (typeof syncPets === 'function') syncPets();
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });

    var casts = [], fr = 0;
    var rc = window.castSkill;
    window.castSkill = function (s) { var ok = rc.apply(this, arguments); if (ok) casts.push({ id: s && s.id, fr: fr }); return ok; };
    var restore = function () { window.castSkill = rc; };

    var cdSum = function () { return eq.reduce(function (a, id) { return a + Math.max(0, skillCd[id] || 0); }, 0); };
    var petShots = function () { return shots.filter(function (s) { return s.k === 'pet'; }).length; };
    var fx = function () { return shots.length + zones.length + bolts.length; };
    var on = function () { return typeof bossIntro !== 'undefined' && !!bossIntro; };
    var win = function () { return { fr: 0, cdDrop: 0, casts: 0, petShots: 0, fxUp: 0 }; };

    if (md === 'dun' || md === 'tower') {
      if (md === 'tower') challengeTower(TOWERS[0].id);
      else { var d = DUNGEONS[0]; S.dunTk[d.id] = 9; challengeDungeon(d); }
      if (!dunRun) { restore(); out.err = '던전 진입 실패'; return out; }
    } else if (md === 'promo') { startPromo(); if (!promo) { restore(); out.err = '승급전 진입 실패'; return out; } }
    else if (md === 'raid') { startRaid(RAIDS[0]); if (!raidOn) { restore(); out.err = '레이드 진입 실패'; return out; } }
    else if (md === 'stage') { startBoss(); if (!bossOn) { restore(); out.err = '보스전 진입 실패'; return out; } }

    /* 매 프레임 «쿨이 거의 다 찼다» 를 다시 심는다 — 심지 않으면 «안 나갔다» 가 «나갈 게 없었다» 와
       구별이 안 된다(수리 전에는 이 압력에서 82건이 나왔다). 전투가 시작된 뒤(W3)에는 안 심는다. */
    /* ⚠ 「= small」 이 아니라 **상한**이다 — 매 프레임 0.02 로 되돌리면 dt(0.0167)보다 커서
       쿨이 0 에 영영 안 닿고 «안 나갔다» 가 헛초록이 된다(1회차에 실제로 그랬다). */
    var seed = function () { eq.forEach(function (id) { skillCd[id] = Math.min(skillCd[id] === undefined ? small : skillCd[id], small); }); };
    seed();

    var W1 = win(), W2 = win(), W3 = win(), open = null;
    var sawIntro = false, done = false, fightFr = -1, armFlipFr = -1;

    for (var i = 0; i < 900; i++, fr++) {
      var pOn = on(), pCd = cdSum(), pC = casts.length, pP = petShots(), pF = fx();
      var pArm = (typeof cdArm !== 'undefined') ? cdArm : null;
      step(DT);
      if (pArm === true && cdArm === false && armFlipFr < 0) armFlipFr = fr;
      var qOn = on();
      var rec = { cdDrop: Math.max(0, pCd - cdSum()), casts: casts.length - pC,
                  petShots: Math.max(0, petShots() - pP), fxUp: Math.max(0, fx() - pF) };
      var bucket = null;
      if (!pOn && qOn) { sawIntro = true; open = { fr: fr, cdDrop: +rec.cdDrop.toFixed(4), casts: rec.casts, petShots: rec.petShots, fxUp: rec.fxUp }; }
      else if (pOn) { sawIntro = true; bucket = W2; if (!qOn) done = true; }
      else if (!sawIntro) bucket = W1;
      else { bucket = W3; done = true; }
      if (bucket) { bucket.fr++; bucket.cdDrop += rec.cdDrop; bucket.casts += rec.casts; bucket.petShots += rec.petShots; bucket.fxUp += rec.fxUp; }
      if (bucket === W3 && fightFr < 0) fightFr = fr;   /* 국면이 닫힌 «다음» 프레임 = 전투 첫 프레임 */
      if (done && W3.fr >= 30) break;
      if (bucket !== W3) seed();
    }
    restore();
    var fin = function (w) { return { fr: w.fr, sec: +(w.fr / 60).toFixed(3), cdDrop: +w.cdDrop.toFixed(4), casts: w.casts, petShots: w.petShots, fxUp: w.fxUp }; };
    out.sawIntro = sawIntro; out.W1 = fin(W1); out.W2 = fin(W2); out.W3 = fin(W3); out.open = open;
    out.fightFr = fightFr; out.armFlipFr = armFlipFr;
    /* 전투 시작 뒤 첫 시전까지(초) — 459 규약 */
    var first = null;
    for (var k = 0; k < casts.length; k++) if (casts[k].fr >= fightFr) { first = +((casts[k].fr - fightFr) / 60).toFixed(3); break; }
    out.firstCast = first;
  } catch (e) { out.err = String((e && e.message) || e).split('\n')[0].slice(0, 200); }
  return out;
};

/* [E]·[F]·[G] 음성항 — 가드가 «잠긴 채로 남지» 않는가 */
const NEG = function (arg) {
  const eq = arg.eq, DT = 1 / 60, out = {};
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    eq.forEach(function (id) { S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = eq.slice();
    S.stage = 20; S.best = 20; S.guide.idx = 99; S.dia = 99999; S.gold = 1e7;
    arena = null; raidOn = null; promo = null;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });
    var casts = 0;
    var rc = window.castSkill;
    window.castSkill = function (s) { var ok = rc.apply(this, arguments); if (ok) casts++; return ok; };
    var seed = function () { eq.forEach(function (id) { skillCd[id] = Math.min(skillCd[id] === undefined ? 0.02 : skillCd[id], 0.02); }); };

    /* ── [E] 잡몹 파밍 — 보스전이 아니므로 가드가 안 걸린다 ── */
    S.bossFarm = true; bossOn = false;
    casts = 0; seed();
    for (var i = 0; i < 120; i++) { step(DT); seed(); }
    out.farmCasts = casts;
    out.farmPreFight = (typeof preFight === 'function') ? preFight() : null;

    /* ── [F] 던전에 들어갔다가 «보스가 서기 전에» 포기 — 예약(cdArm)은 남고 전투는 끝났다 ── */
    var d = DUNGEONS[0]; S.dunTk[d.id] = 9; challengeDungeon(d);
    out.armedIn = (typeof cdArm !== 'undefined') ? cdArm : null;
    for (var j = 0; j < 20; j++) step(DT);           /* 보스는 1.4초 뒤에 선다 — 아직 안 섰다 */
    endDunRun(false, true);                          /* 포기 */
    out.armedAfter = (typeof cdArm !== 'undefined') ? cdArm : null;
    out.preFightAfter = (typeof preFight === 'function') ? preFight() : null;
    casts = 0; seed();
    for (var k = 0; k < 120; k++) { step(DT); seed(); }
    out.afterAbortCasts = casts;

    /* ── [G] 던전 페이즈 2번째 보스 — 예약을 안 거는 갈래(459 등재문 ②) ── */
    var ph = null;
    for (var q = 0; q < DUNGEONS.length; q++) if (DUNGEONS[q].bossN > 1 && DUNGEONS[q].bossMode !== 'all') { ph = DUNGEONS[q]; break; }
    if (ph) {
      S.dunTk[ph.id] = 9; challengeDungeon(ph);
      /* 1번째 보스를 세우고 국면을 끝낸 뒤 즉사시켜 페이즈 2 로 넘긴다 */
      for (var a = 0; a < 400 && !(dunRun && dunRun.bossIn && !bossIntro); a++) step(DT);
      var b = enemies.filter(function (e) { return e.tk === 'dunboss'; })[0];
      if (b) { b.hp = 0; killEnemy(b); }
      casts = 0; seed();
      for (var c = 0; c < 90 && dunRun; c++) { step(DT); seed(); }
      out.phaseCasts = casts;
      out.phaseArmed = (typeof cdArm !== 'undefined') ? cdArm : null;
    }
    window.castSkill = rc;
  } catch (e) { out.err = String((e && e.message) || e).split('\n')[0].slice(0, 200); }
  return out;
};

const boot = async (ctx, url) => {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof step === 'function');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* 161 — 얼리지 않으면 다음 프레임이 되돌린다 */
  return { page, errs };
};

const EQ = ['slash', 'poison', 'meteor', 'holy'];   /* 표적 필수 2 + 대상 없어도 성공하는 2(poison·meteor) */
const SMALL = 0.02;
const MODES = ['stage', 'dun', 'tower', 'promo', 'raid'];
const runAll = async (page, modes) => {
  const r = {};
  for (const m of modes) r[m] = await page.evaluate(SCEN, { md: m, eq: EQ, small: SMALL });
  return r;
};
const preWin = (v) => ({                            /* 창 셋을 합친 «전투 시작 전» 전체 */
  cdDrop: +(v.W1.cdDrop + v.W2.cdDrop + (v.open ? v.open.cdDrop : 0)).toFixed(4),
  casts: v.W1.casts + v.W2.casts + (v.open ? v.open.casts : 0),
  petShots: v.W1.petShots + v.W2.petShots + (v.open ? v.open.petShots : 0),
  fxUp: v.W1.fxUp + v.W2.fxUp + (v.open ? v.open.fxUp : 0),
  fr: v.W1.fr + v.W2.fr + (v.open ? 1 : 0),
});

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[전제] 수리가 index.html 에 있다');
  is(src.indexOf(GUARD) >= 0, '[전제-a] `preFight()` 선언이 있다(459 예약 + 453 battleBusy + 국면)');
  is(src.split(CALL).length - 1 === 1, '[전제-b] 스킬 루프가 그 가드 «안» 에 있다(호출 1곳)',
     (src.split(CALL).length - 1) + '곳');
  is(/preFight/.test(src) && src.match(/preFight/g).length === 3,
     '[전제-c] `preFight` 는 선언 1 · 주석 1 · 호출 1 = 3회만 등장한다(가드가 흩어지지 않았다)',
     (src.match(/preFight/g) || []).length + '회');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const rev1 = path.join(path.dirname(SRC), '.verify473-r1.html');
  const rev2 = path.join(path.dirname(SRC), '.verify473-r2.html');
  fs.writeFileSync(rev1, src.replace(GUARD, GUARD_OFF));
  fs.writeFileSync(rev2, src.replace(GUARD, GUARD_NARROW));
  process.on('exit', () => { [rev1, rev2].forEach((p) => { try { fs.unlinkSync(p); } catch (e) {} }); });

  const { page, errs } = await boot(ctx, 'file://' + SRC);
  const V = await runAll(page, MODES);

  console.log('\n[A] 전투 시작 전 창 전체 — 쿨 감소 0 · 시전 0 · fx 순증 0');
  for (const md of MODES) {
    const v = V[md];
    if (v.err || v.__err) { is(false, '[A-' + md + '] 시나리오 실행', v.err || v.__err); continue; }
    const p = preWin(v);
    is(v.sawIntro, '[A-' + md + '-0] 등장 국면이 열렸다', v.sawIntro ? '열림' : '안 열림');
    is(p.cdDrop === 0, '[A-' + md + '-a] 쿨타임 감소 0.000s', p.cdDrop.toFixed(3) + 's · ' + p.fr + '프레임');
    is(p.casts === 0, '[A-' + md + '-b] 스킬 시전 0건', p.casts + '건');
    is(p.fxUp === 0, '[A-' + md + '-c] 투사체·장판 순증 0', p.fxUp + '개');
  }

  console.log('\n[B] 창을 셋으로 갈라서 — 하나라도 새면 여기서 걸린다');
  for (const md of MODES) {
    const v = V[md];
    if (v.err || v.__err) continue;
    is(v.W1.casts === 0 && v.W1.cdDrop === 0,
       '[B-' + md + '-1] 스폰 딜레이(국면 전) ' + v.W1.fr + '프레임 — 시전 0 · 감소 0',
       v.W1.casts + '건 · ' + v.W1.cdDrop.toFixed(3) + 's');
    is(!v.open || (v.open.casts === 0 && v.open.cdDrop === 0),
       '[B-' + md + '-2] ★ 국면을 «여는» 그 한 프레임 — 시전 0 · 감소 0(수리 전 2건)',
       v.open ? (v.open.casts + '건 · ' + v.open.cdDrop.toFixed(3) + 's') : '국면이 start 함수에서 열린 모드');
    is(v.W2.casts === 0 && v.W2.cdDrop === 0,
       '[B-' + md + '-3] 국면 중 ' + v.W2.fr + '프레임 — 시전 0 · 감소 0',
       v.W2.casts + '건 · ' + v.W2.cdDrop.toFixed(3) + 's');
  }

  console.log('\n[C] 범위 — 이 창에서 펫 탄은 구조적으로 0(가드를 안 얹은 근거)');
  for (const md of MODES) {
    const v = V[md];
    if (v.err || v.__err) continue;
    is(preWin(v).petShots === 0, '[C-' + md + '] 펫 탄 0발', preWin(v).petShots + '발');
  }

  console.log('\n[D] 459 규약 보존 — 전투 시작 프레임에 쿨 0 · 첫 시전 0.5초 안');
  for (const md of MODES) {
    const v = V[md];
    if (v.err || v.__err) continue;
    is(v.armFlipFr >= 0 && v.armFlipFr === v.fightFr,
       '[D-' + md + '-a] 459 예약이 풀리는 프레임 = 국면이 닫힌 다음 프레임(= 전투 첫 프레임)',
       'arm@' + v.armFlipFr + ' vs fight@' + v.fightFr);
    is(v.firstCast !== null && v.firstCast <= 0.5,
       '[D-' + md + '-b] 첫 시전이 0.5초 안', v.firstCast === null ? '없음' : v.firstCast + 's');
    is(v.W3.casts > 0, '[D-' + md + '-c] 전투가 시작되면 스킬이 평소대로 돈다(0.5초에 ' + v.W3.casts + '건)');
  }

  const N = await page.evaluate(NEG, { eq: EQ });
  console.log('\n[E]~[G] 음성항 — 가드가 «잠긴 채로 남는» 자리를 안 만든다');
  if (N.err || N.__err) is(false, '[E] 음성항 시나리오 실행', N.err || N.__err);
  else {
    is(N.farmCasts > 0, '[E] 잡몹 파밍 중에는 스킬이 평소대로 돈다(가드 안 걸림)', N.farmCasts + '건');
    is(N.farmPreFight === false, '[E-b] 파밍 중 `preFight()` 가 거짓', String(N.farmPreFight));
    is(N.armedIn === true, '[F-a] 던전에 들어가면 459 예약이 걸린다', String(N.armedIn));
    is(N.armedAfter === true, '[F-b] 포기해도 예약 자체는 남는다(459 설계 — 푸는 자리가 하나뿐이다)', String(N.armedAfter));
    is(N.preFightAfter === false,
       '[F-c] ★ 그런데 잠금은 풀려 있다 — `battleBusy()` 가 거짓이라(453)', String(N.preFightAfter));
    is(N.afterAbortCasts > 0, '[F-d] 그래서 포기 뒤 스킬이 정상으로 돈다', N.afterAbortCasts + '건');
    if (N.phaseCasts !== undefined)
      is(N.phaseCasts > 0, '[G] 던전 페이즈 2번째 보스 — 예약을 안 거는 갈래라 스킬이 계속 돈다(459 등재문 ②)',
         N.phaseCasts + '건 · cdArm ' + String(N.phaseArmed));
  }
  is(errs.length === 0, '[H] 콘솔·페이지 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  /* ── [§R1] 되돌림 ① — 가드를 항상 거짓으로 ── */
  console.log('\n[§R1] 되돌림 시험 ① — `preFight()` 를 끈 사본에서는 결손이 그대로 재현된다');
  const { page: p1, errs: e1 } = await boot(ctx, 'file://' + rev1);
  const V1 = await runAll(p1, ['stage', 'dun', 'promo']);
  for (const md of ['stage', 'dun']) {
    const v = V1[md];
    if (v.err || v.__err) { is(false, '[R1-' + md + '] 사본 시나리오 실행', v.err || v.__err); continue; }
    const p = preWin(v);
    is(p.casts > 0, '[R1-' + md + '] 사본에서는 전투 시작 전 시전이 나간다', p.casts + '건 · 감소 ' + p.cdDrop.toFixed(3) + 's');
  }
  /* ⚑ 승급전·레이드는 **사본에서도 0** 이다 — 여기가 이 작업의 실측 경계다. 두 모드는 국면을
     start 함수 «안» 에서 열어(24973·27448) 첫 프레임부터 step() 맨 위 early-return 에 걸리므로
     샐 창이 애초에 없다. 전부가 빨개지기를 기대했으면 이 자는 영원히 빨간 게이트가 됐다
     (348 §R 의 «밖 4자리 중 2자리를 세어서 단언한다» 와 같은 처방). */
  {
    const v = V1.promo, p = v && !v.err && !v.__err ? preWin(v) : null;
    is(!!p && p.casts === 0,
       '[R1-promo] ★ 승급전은 사본에서도 0건 — 국면을 start 함수에서 여는 모드에는 샐 창이 없다',
       p ? p.casts + '건' : (v && (v.err || v.__err)));
  }
  is(V1.stage.open && V1.stage.open.casts > 0,
     '[R1-open] ★ 사본의 «국면 여는 프레임» 에서 시전이 나간다 = 그 한 칸이 실재한다',
     V1.stage.open ? V1.stage.open.casts + '건' : '?');
  is(e1.length === 0, '[R1-e] 사본 콘솔 오류 0건', e1.length ? e1.slice(0, 2).join(' | ') : '0건');

  /* ── [§R2] 되돌림 ② — 좁은 처방(국면만) ── */
  console.log('\n[§R2] 되돌림 시험 ② — 등재문 ①(국면만 막는다)은 스폰 딜레이를 못 막는다');
  const { page: p2, errs: e2 } = await boot(ctx, 'file://' + rev2);
  const V2 = await runAll(p2, ['stage', 'dun']);
  for (const md of ['stage', 'dun']) {
    const v = V2[md];
    if (v.err || v.__err) { is(false, '[R2-' + md + '] 사본 시나리오 실행', v.err || v.__err); continue; }
    is(v.W1.casts > 0,
       '[R2-' + md + '-a] ★ 좁은 사본은 스폰 딜레이에서 빈 바닥에 시전한다(= 지금 폭이 필요하다)',
       v.W1.casts + '건 · 감소 ' + v.W1.cdDrop.toFixed(3) + 's');
    is(v.W2.casts === 0, '[R2-' + md + '-b] 다만 국면 «중» 은 좁은 사본도 0이다(457 early-return 몫)', v.W2.casts + '건');
  }
  is(e2.length === 0, '[R2-e] 사본 콘솔 오류 0건', e2.length ? e2.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nVERIFY473 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
