#!/usr/bin/env node
/* 게이트 — 작업 459 「모든 보스전: 시작할 때 스킬 쿨타임 전부 초기화」 (저장소 주인 지시 2026-08-30)
 *
 *   node tools/verify459.js
 *
 * 재현은 `tools/probe459.js`(수리 전 표: 여섯 모드 전부 «막 쓴» 쿨 4.0s 를 그대로 안고 들어가
 * 전투 시작 후 첫 시전이 2.6~4.0초 뒤였다). 여기는 **수리가 살아 있는가**를 묻는다.
 *
 *   [전제] 수리가 index.html 에 있다 — 없으면 아래가 전부 헛초록이다.
 *   [1]~[6] 여섯 모드(스테이지 28 · 던전 30 · 탑 209 · 승급전 · 레이드 46 · 아레나 123)
 *           — 초기화가 **정확히 한 번**, **보스가 표적이 되는 그 프레임**에 일어나고
 *             그 순간 장착 스킬의 쿨이 전부 0 · 첫 시전이 0.5초 안이다.
 *   [7]     페이즈 던전 2번째 보스 — 초기화 **0회 추가**(등재문 ②: 페이즈마다 하면 밸런스가 된다)
 *   [8]     음성항 — 잡몹 파밍 중에는 초기화가 **한 번도** 안 일어난다(예약이 잡몹에 안 풀린다)
 *   [9]     425 등장 국면 — 국면 **안** 에서는 0회, 국면이 닫히는 프레임에 1회
 *   [10]    범위 — 펫 쿨(`p.cd`)·자기강화 버프(`sbuf`)는 안 건드린다(주인 원문이 «스킬»)
 *   [§R1]   되돌림 시험 ① — 푸는 자리를 끈 사본에서는 [1]~[6] 이 빨개진다(쿨을 그대로 안고 들어간다)
 *   [§R2]   되돌림 시험 ② — **기각한 설계**(start 함수 «안» 에서 0)를 사본으로 되살리면
 *           스테이지에서 poison·meteor 가 빈 바닥에 나가고 전투 시작 프레임의 쿨이 0.4 를 넘는다
 *           = 지금 자리가 «무르게 푼 것» 이 아니라는 증거.
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
const FIRE_NEW = `  if(cdArm){
    for(const e of enemies){ if(cdFoeUp(e)){ cdArm = false; resetSkillCd(); break; } }
  }`;
const FIRE_OFF = `  if(false){
    for(const e of enemies){ if(cdFoeUp(e)){ cdArm = false; resetSkillCd(); break; } }
  }`;
const ARM_BOSS = `  cdArm = true;                     /* ⚑ 459 — 예약. 보스는 1.4초 뒤에 선다(그 창은 필드가 비어 있다) */`;
const ARM_BOSS_OLD = `  resetSkillCd();                   /* §R2 — 기각한 설계: start 함수 «안» 에서 0 으로 둔다 */`;

/* 페이지 안에서 도는 시나리오 — 수리본·사본이 **같은 코드**를 돈다 */
const SCEN = function (arg) {
  const md = arg.md, eq = arg.eq, BIG = arg.big, DT = 1 / 60;
  const out = { md };
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    eq.forEach(function (id) { S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = eq.slice();
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999; S.gold = 1e7;
    arena = null; raidOn = null; promo = null;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    document.querySelectorAll('.modal.on, .mw.on').forEach(function (el) { el.classList.remove('on'); });

    let fr = 0;
    const casts = [], resets = [];
    const rc = window.castSkill;
    window.castSkill = function (s) { const ok = rc.apply(this, arguments); if (ok) casts.push({ id: s.id, fr: fr }); return ok; };
    const rr = window.resetSkillCd;
    window.resetSkillCd = function () {
      const before = eq.map(function (id) { return +(skillCd[id] || 0).toFixed(3); });
      const r = rr.apply(this, arguments);
      resets.push({ fr: fr, before: before, after: eq.map(function (id) { return +(skillCd[id] || 0).toFixed(3); }) });
      return r;
    };
    const restore = function () { window.castSkill = rc; window.resetSkillCd = rr; };

    /* ① «잡몹 파밍 끝에 큰 스킬을 막 썼다» */
    eq.forEach(function (id) { skillCd[id] = BIG; });

    /* ② 진입 — 음성항([8] farm)만 아무 데도 안 들어간다 */
    if (md === 'dun' || md === 'tower' || md === 'phase') {
      if (md === 'tower') challengeTower(TOWERS[0].id);
      else {
        let d = DUNGEONS[0];
        if (md === 'phase') d = DUNGEONS.find(function (x) { return dunBossMd(x) === 'phase' && dunBossN(x) >= 2; }) || d;
        S.dunTk[d.id] = 9;
        for (let k = 0; k < 8; k++) {
          const u = DUN_UI[d.id];
          if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
          if (!dunLocked(d)) break;
        }
        challengeDungeon(d);
      }
      if (!dunRun) { restore(); out.err = '던전 진입 실패'; return out; }
      out.bossN = dunRun.bossN; out.bossMd = dunRun.bossMode;
    } else if (md === 'promo') { startPromo(); if (!promo) { restore(); out.err = '승급전 진입 실패'; return out; } }
    else if (md === 'raid') { startRaid(RAIDS[0]); if (!raidOn) { restore(); out.err = '레이드 진입 실패'; return out; } }
    else if (md === 'arena') { startArena(); if (!arena) { restore(); out.err = '아레나 진입 실패'; return out; } }
    else if (md === 'stage') { startBoss(); if (!bossOn) { restore(); out.err = '보스전 진입 실패'; return out; } }
    out.armed = (typeof cdArm !== 'undefined') ? cdArm : null;
    out.cdAtStart = eq.map(function (id) { return +(skillCd[id] || 0).toFixed(3); });
    out.petCd0 = pets.length ? +(pets[0].cd || 0).toFixed(3) : null;

    /* ③ 한 루프로 4초를 굴리며 «전투 시작 프레임»·초기화·시전을 전부 적는다.
       ⚠ 프레임 «안» 의 순서(스폰 큐 → 예약 풀기 → 적 갱신(born) → 스킬 틱)에 자를 맞추지 않는다 —
         `born` 이 0.3 을 넘는 프레임과 예약이 풀리는 프레임은 한두 프레임 어긋날 수 있고
         (특히 425 국면은 `born` 이 국면 «안» 에서 0.3 을 넘는다), 지시가 말하는 것은 프레임 번호가
         아니라 «전투가 시작될 때 쿨이 0 이다» 이다. 그래서 판정은 ⓐ 초기화 1회 ⓑ 전투 시작 ±3프레임
         ⓒ 그 순간 전부 0 ⓓ 그 전에 새어 나간 시전 0건 ⓔ 첫 시전 0.5초 안 다섯으로 잰다. */
    const foeUp = function () {
      return enemies.some(function (e) {
        return e.hp > 0 && e.born >= 0.3 &&
          (e.tk === 'dunboss' || e.tk === 'boss' || e.tk === 'promo' || e.tk === 'arena' || e.raid);
      });
    };
    out.introSeen = false; out.resetsInIntro = 0;
    let fightFr = -1;
    const LIM = md === 'farm' ? 300 : 420;
    for (let i = 0; i < LIM; i++, fr++) {
      enemies.forEach(function (e) { e.dmg = 0; });      /* 죽으면 2.4초 부활이 «첫 시전» 을 밀어낸다 */
      /* [7] 은 «2번째 보스» 를 보는 시나리오라 1번째가 이 구간에서 먼저 죽으면 안 된다 —
         쿨이 0 으로 풀린 4종이 7초면 페이즈 던전을 통째로 클리어한다(1회차에 그래서 빨갰다) */
      if (md === 'phase' && dunRun) {
        dunRun.t = DUN_SEC;
        enemies.forEach(function (e) { if (e.tk === 'dunboss') { e.max = 1e15; e.hp = 1e15; } });
      }
      if (typeof dunRun !== 'undefined' && dunRun && dunRun.introOn) { out.introSeen = true; out.resetsInIntro = resets.length; }
      step(DT);
      const inIntro = (typeof dunRun !== 'undefined' && dunRun && dunRun.introOn);
      if (fightFr < 0 && foeUp() && !inIntro) fightFr = fr;
    }
    out.fightFr = fightFr;
    out.fightSec = fightFr < 0 ? null : +(fightFr * DT).toFixed(3);
    out.resets = resets.slice();
    out.resetGap = resets.length && fightFr >= 0 ? resets[0].fr - fightFr : null;
    out.castsPre = casts.filter(function (c) { return resets.length ? c.fr < resets[0].fr : true; });
    /* «보스가 표적이 되기 전» 에 나간 시전 — 빈 바닥으로 새는 시전이 이것이다(§R2 가 세는 값) */
    out.castsPreFight = casts.filter(function (c) { return fightFr < 0 || c.fr < fightFr; });
    const s1 = casts.find(function (c) { return c.id === 'slash' && (resets.length ? c.fr >= resets[0].fr : true); });
    out.firstSlash = (s1 && resets.length) ? +((s1.fr - resets[0].fr) * DT).toFixed(3) : null;
    out.castsPost = casts.length - out.castsPre.length;

    /* ⑤ [7] 페이즈 — 1번째 보스를 잡고 2번째가 설 때까지 굴린다 */
    if (md === 'phase') {
      out.resetsAfter1 = resets.length;
      /* 2번째 보스를 «서는 것만» 보려는 시나리오다 — 그때까지 아무도 그를 못 때리게 무장을 내린다.
         (쿨이 0 으로 풀린 4종 + 장판 + 펫이면 born 창 안에서도 죽는다: `areaDamage` 는 born 을 안 본다) */
      S.eqSkill = []; pets.length = 0;
      zones.length = 0; shots.length = 0; bolts.length = 0; booms.length = 0; drones.length = 0;
      const b = enemies.find(function (e) { return e.tk === 'dunboss' && e.hp > 0; });
      out.hadBoss1 = !!b;
      if (b) { b.hp = 1; areaDamage(b.x, b.y, 400, 1e9, '#fff'); }
      out.killed1 = !enemies.some(function (e) { return e.tk === 'dunboss' && e.hp > 0; });
      let up2 = false;
      for (let i = 0; i < 600 && !up2 && dunRun; i++, fr++) {
        /* 2번째 보스도 «서기 전에» 죽으면 안 된다 — 장판(poison·meteor)은 `areaDamage` 라
           `born < 0.3` 창에서도 닿는다(1회차에 그래서 런이 클리어로 끝나 빨갰다) */
        enemies.forEach(function (e) { e.dmg = 0; if (e.tk === 'dunboss') { e.max = 1e15; e.hp = 1e15; } });
        dunRun.t = DUN_SEC;                              /* 위 420프레임 + 여기까지가 제한 15초를 넘는다 */
        step(DT);
        up2 = enemies.some(function (e) { return e.tk === 'dunboss' && e.hp > 0 && e.born >= 0.3; });
      }
      out.boss2Up = up2;
      out.dbg = { bossKilled: dunRun ? dunRun.bossKilled : null, bossDown: dunRun ? dunRun.bossDown : null,
                  dead: player.dead, hp: Math.round(player.hp) };
      out.resetsAfter2 = resets.length;
      out.runAlive = !!dunRun;
    }
    /* ⑥ [10] 범위 — 펫 쿨·자기강화 버프는 안 건드린다 */
    out.petCd1 = pets.length ? +(pets[0].cd || 0).toFixed(3) : null;
    out.sb = (typeof sbuf !== 'undefined') ? JSON.stringify(sbuf) : null;
    restore();
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
const BIG = 4.0;
const runAll = async (page, modes) => {
  const r = {};
  for (const m of modes) r[m] = await page.evaluate(SCEN, { md: m, eq: EQ, big: BIG });
  return r;
};
/* 한 모드가 «시작 프레임에 딱 한 번 · 전부 0 · 첫 시전 0.5초 안» 인가 */
const okMode = (v) => !!(v && !v.err && v.fightFr >= 0 && v.resets.length === 1 &&
  Math.abs(v.resetGap) <= 3 && v.resets[0].after.every((x) => x === 0) &&
  v.castsPre.length === 0 && v.firstSlash !== null && v.firstSlash <= 0.5);

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[전제] 수리가 index.html 에 살아 있는가');
  const hasFn = /function resetSkillCd\(\)\{\n  for\(const id in skillCd\) skillCd\[id\] = 0;/.test(src);
  const hasArmDecl = src.includes('let cdArm = false;');
  const hasFire = src.includes(FIRE_NEW);
  const arms = (src.match(/cdArm = true;/g) || []).length;
  is(hasFn, '[전제-a] `resetSkillCd()` 가 있다(값은 0 — 23418 장착 규약과 같은 값)');
  is(hasArmDecl, '[전제-b] 예약 깃발 `cdArm` 이 선언돼 있다');
  is(hasFire, '[전제-c] ★ 푸는 자리가 step() 에 **한 곳**뿐이다(스폰 큐 뒤 · 스킬 틱 앞)');
  is(arms === 5, '[전제-d] 예약을 거는 자리가 다섯(진입점 5모드 — 던전·탑은 한 함수)', arms + '곳');
  is((src.match(/resetSkillCd\(\)/g) || []).length === 2,
     '[전제-e] `resetSkillCd()` 는 선언 1 + 호출 1 뿐이다(부르는 자리를 늘리면 페이즈마다 초기화된다)',
     (src.match(/resetSkillCd\(\)/g) || []).length + '건');
  if (!hasFn || !hasArmDecl || !hasFire) {
    console.log('\nVERIFY459 FAIL — 수리가 사라졌거나 갈아 끼울 자리가 바뀌었다. 아래를 돌 이유가 없다.');
    process.exit(1);
  }

  const rev1 = path.join(path.dirname(SRC), '.verify459-r1.html');
  const rev2 = path.join(path.dirname(SRC), '.verify459-r2.html');
  fs.writeFileSync(rev1, src.replace(FIRE_NEW, FIRE_OFF));
  fs.writeFileSync(rev2, src.replace(ARM_BOSS, ARM_BOSS_OLD));
  process.on('exit', () => { [rev1, rev2].forEach((p) => { try { fs.unlinkSync(p); } catch (e) {} }); });

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const { page, errs } = await boot(ctx, 'file://' + SRC);

  const MODES = ['stage', 'dun', 'tower', 'promo', 'raid', 'arena', 'phase', 'farm'];
  const R = await runAll(page, MODES);
  for (const m of MODES) if (R[m].err) console.log('  ⚠ ' + m + ' 시나리오 오류: ' + R[m].err);

  const NAME = { stage: '스테이지 보스(28)', dun: '던전(30)', tower: '탑(209)', promo: '승급전', raid: '레이드(46)', arena: '아레나(123)' };
  let n = 0;
  for (const md of ['stage', 'dun', 'tower', 'promo', 'raid', 'arena']) {
    n++;
    const v = R[md];
    console.log('\n[' + n + '] ' + NAME[md] + ' — «막 쓴» 쿨 ' + BIG + 's 로 들어간다');
    is(v.cdAtStart && v.cdAtStart.every((x) => x === BIG),
       '[' + n + '-a] (준비) 진입 직후에는 쿨이 그대로다', v.cdAtStart && v.cdAtStart.join('/'));
    is(v.armed === true, '[' + n + '-b] (준비) 진입점이 예약을 걸었다(cdArm)', 'cdArm=' + v.armed);
    is(v.fightFr >= 0, '[' + n + '-c] (준비) 보스가 표적이 되는 프레임을 찾았다',
       v.fightSec === null ? '못 섬' : v.fightSec + 's');
    is(v.resets.length === 1, '[' + n + '-d] ★ 초기화가 **정확히 한 번** 일어난다', v.resets.length + '회');
    is(v.resets.length === 1 && Math.abs(v.resetGap) <= 3,
       '[' + n + '-e] ★ 그 한 번이 **전투 시작(보스가 표적이 되는) 프레임**이다(±3프레임)',
       v.resets.length ? 'reset@' + v.resets[0].fr + ' vs fight@' + v.fightFr + ' (Δ' + v.resetGap + ')' : '없음');
    is(v.resets.length === 1 && v.resets[0].after.every((x) => x === 0),
       '[' + n + '-f] ★ 그 순간 장착 4종의 쿨이 전부 0 이다',
       v.resets.length ? '[' + v.resets[0].before.join(',') + '] → [' + v.resets[0].after.join(',') + ']' : '없음');
    is(v.castsPreFight.length === 0,
       '[' + n + '-g] ★ 전투 시작 «전» 에는 한 발도 안 나간다(빈 바닥으로 새면 초기화가 거짓말이 된다)',
       v.castsPreFight.map((c) => c.id).join(',') || '0건');
    is(v.firstSlash !== null && v.firstSlash <= 0.5,
       '[' + n + '-h] ★ 첫 시전이 시작 후 0.5초 안이다(사거리 무제한 slash 로 잰다)',
       v.firstSlash === null ? '없음' : v.firstSlash + 's');
  }

  /* ── [7] 페이즈 던전 ── */
  console.log('\n[7] 페이즈 던전 2번째 보스 — 초기화는 **첫 시작에만**(등재문 ②)');
  const ph = R.phase;
  is(ph.bossMd === 'phase' && ph.bossN >= 2, '[7-a] (준비) 페이즈 던전이다', ph.bossMd + ' ×' + ph.bossN);
  is(ph.resetsAfter1 === 1, '[7-b] (준비) 첫 보스에서 한 번 초기화됐다', ph.resetsAfter1 + '회');
  is(ph.killed1 === true, '[7-c] (준비) 첫 보스를 실제로 잡았다');
  is(ph.boss2Up === true, '[7-d] (준비) 2번째 보스가 섰다',
     'runAlive=' + ph.runAlive + ' · killed1=' + ph.killed1 + ' · fight@' + ph.fightFr + ' · ' + JSON.stringify(ph.dbg));
  is(ph.resetsAfter2 === 1, '[7-e] ★ 2번째 보스에서는 **추가 초기화 0회**', ph.resetsAfter2 + '회(누적)');

  /* ── [8] 음성항 ── */
  console.log('\n[8] 음성항 — 잡몹 파밍 중에는 초기화가 없다');
  const fm = R.farm;
  is(fm.resets.length === 0, '[8-a] ★ 5초를 굴려도 초기화 0회', fm.resets.length + '회');
  is(fm.armed === false || fm.armed === null, '[8-b] 파밍 중에는 예약도 안 걸려 있다', 'cdArm=' + fm.armed);

  /* ── [9] 425 등장 국면 ── */
  console.log('\n[9] 425 등장 국면 — 국면 «안» 에서는 0회, 닫히는 프레임에 1회');
  const dn = R.dun;
  is(dn.introSeen === true, '[9-a] (준비) 등장 국면을 실제로 지났다');
  is(dn.resetsInIntro === 0, '[9-b] ★ 국면 동안에는 한 번도 초기화되지 않는다', dn.resetsInIntro + '회');
  is(dn.resets.length === 1 && Math.abs(dn.resetGap) <= 3,
     '[9-c] ★ 국면이 닫히는 프레임에 초기화된다(= «전투 시작부터» 라는 지시와 같은 뜻)',
     dn.resets.length ? 'reset@' + dn.resets[0].fr + ' vs 국면 종료@' + dn.fightFr : '없음');

  /* ── [10] 범위 ── */
  console.log('\n[10] 범위 — 주인 원문이 «스킬» 이다(펫·버프는 안 건드린다)');
  is(!/resetSkillCd[\s\S]{0,400}\bp\.cd\b/.test(src), '[10-a] `resetSkillCd` 가 펫 쿨(`p.cd`)을 안 만진다');
  is(!/function resetSkillCd\(\)\{[\s\S]{0,200}sbuf/.test(src), '[10-b] 자기강화 버프(`sbuf`)도 안 만진다');
  is(R.stage.petCd0 === R.stage.petCd1 || R.stage.petCd0 === null,
     '[10-c] 펫 쿨은 보스전 시작 전후로 이 자가 흔들지 않는다',
     R.stage.petCd0 + ' → ' + R.stage.petCd1);

  is(errs.length === 0, '[11] 콘솔·페이지 오류 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  /* ── [§R1] 되돌림 ① — 푸는 자리를 껐다 ── */
  console.log('\n[§R1] 되돌림 시험 ① — step 의 푸는 자리를 끄면 여섯 모드가 전부 빨개진다');
  const { page: p1, errs: e1 } = await boot(ctx, 'file://' + rev1);
  const V1 = await runAll(p1, ['stage', 'dun', 'tower', 'promo', 'raid', 'arena']);
  for (const md of ['stage', 'dun', 'tower', 'promo', 'raid', 'arena']) {
    const v = V1[md];
    is(!okMode(v) && v.resets.length === 0,
       '[R1-' + md + '] 사본에서는 초기화가 0회다 = 결함이 재현된다(쿨을 그대로 안고 들어간다)',
       (v.resets ? v.resets.length : '?') + '회 · 첫 시전 ' + (v.firstSlash === null ? '없음' : v.firstSlash + 's'));
  }
  is(e1.length === 0, '[R1-e] 사본 콘솔 오류 0건', e1.length ? e1.slice(0, 2).join(' | ') : '0건');

  /* ── [§R2] 되돌림 ② — 기각한 설계(start 함수 안에서 0) ── */
  console.log('\n[§R2] 되돌림 시험 ② — start 함수 «안» 에서 0 으로 두면(기각한 설계) 스테이지가 빨개진다');
  const { page: p2, errs: e2 } = await boot(ctx, 'file://' + rev2);
  const V2 = await runAll(p2, ['stage']);
  const s2 = V2.stage;
  is(s2.castsPreFight.length > 0,
     '[R2-a] ★ 사본에서는 보스가 서기 전 빈 바닥에 시전이 나간다(대상 없이도 성공하는 종)',
     s2.castsPreFight.map((c) => c.id).join(',') || '0건');
  is(!okMode(s2), '[R2-b] 그래서 이 자의 «시작 프레임 = 초기화» 판정이 빨개진다',
     'reset@' + (s2.resets.length ? s2.resets[0].fr : '없음') + ' vs fight@' + s2.fightFr +
     ' · 시작 전 시전 ' + s2.castsPreFight.length + '건');
  is(e2.length === 0, '[R2-e] 사본 콘솔 오류 0건', e2.length ? e2.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nVERIFY459 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
