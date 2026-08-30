/* 작업 459 재현 프로브 — «보스전 시작할 때 스킬 쿨타임 전부 초기화»
 *
 *   node tools/probe459.js
 *
 * 주인 원문: «보스전 시작할떄 스킬 전부 쿨타임 초기화 되있어야함».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify459.js`)가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는**
 * 자리다(338 규칙 — 처방을 따르기 전에 먼저 재현한다. 338·341 은 여기서 등재문 가설이 기각됐다).
 *
 * 여섯 모드(스테이지 보스 28 · 던전 30 · 탑 209 · 승급전 · 레이드 46 · 아레나 123)를 **실제 진입점**으로
 * 굴리며 세 가지를 찍는다:
 *   ① «잡몹 파밍 끝에 큰 스킬을 막 쓴» 상태(모든 `skillCd` = 큰 값)로 들어가면
 *      **전투 시작 프레임에 남아 있는 쿨타임**(초) — 등재문의 가설은 «그대로 안고 들어간다» 다.
 *   ② 전투 시작 후 **첫 시전까지 걸린 시간**(초) — 사람이 보는 결손은 이 값이다.
 *   ③ 각 모드의 «전투 시작» 이 언제인가 — 보스가 **필드에 실제로 서는** 프레임까지의 지연.
 *      (스테이지·던전은 `spawnQ` 1.4초 딜레이가 있고, 승급전·레이드·아레나는 start 함수 안에서 선다.)
 *
 * ⚑ ③ 이 처방의 갈림길이다 — 스테이지 보스는 `startBoss()` 와 «보스가 서는 프레임» 이 1.4초 떨어져 있다.
 *    start 함수 안에서 쿨을 0 으로 두면 그 1.4초 동안 **대상 없이도 성공하는 스킬**(poison·meteor 는
 *    `nearest()` 폴백이 있다)이 빈 바닥에 나가 쿨을 도로 물고 보스를 맞는다. ④ 절이 그것을 센다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const MODES = ['stage', 'dun', 'tower', 'promo', 'raid', 'arena'];
const EQ = ['slash', 'poison', 'meteor', 'holy'];   /* 표적 필수 2 + 대상 없어도 나가는 2 */
const BIG = 4.0;                                    /* «막 쓴» 상태 — 남은 쿨 4초 */

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계(probe458 과 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const CD = await ev((eq) => eq.map((id) => ({ id, cd: SK[id] ? SK[id].cd : null })), EQ);
  if (CD.__err) { console.log('스킬 표 읽기 실패: ' + CD.__err); await browser.close(); process.exit(1); }
  console.log('장착 표본 4종 — ' + CD.map((s) => s.id + ' cd ' + s.cd + 's').join(' · '));
  console.log('«막 쓴» 상태 주입값 skillCd = ' + BIG.toFixed(1) + 's\n');

  const run = (arg) => ev(([md, eq, big]) => {
    const out = { md };
    const DT = 1 / 60;
    try {
      localStorage.clear();
      Object.assign(S, DEF());
      eq.forEach((id) => { S.own[id] = { n: 0, l: 1 }; });
      S.eqSkill = eq.slice();
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      S.rank = 0; S.dia = 99999; S.gold = 1e7;
      arena = null; raidOn = null; promo = null;
      if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
      spawnStage();
      document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));

      /* 시전을 가로챈다 — «언제 무엇이 나갔나» 를 프레임 번호로 적는다 */
      const casts = [];
      let fr = 0;
      const rc = window.castSkill;
      window.castSkill = function (s) {
        const ok = rc.apply(this, arguments);
        if (ok) casts.push({ id: s.id, fr });
        return ok;
      };
      const restore = () => { window.castSkill = rc; };

      /* ── ① «막 쓴» 상태를 만든다 ── */
      eq.forEach((id) => { skillCd[id] = big; });

      /* ── 진입 ── */
      if (md === 'dun' || md === 'tower') {
        if (md === 'tower') challengeTower(TOWERS[0].id);
        else { const d = DUNGEONS[0]; S.dunTk[d.id] = 9; challengeDungeon(d); }
        if (!dunRun) { restore(); out.err = '던전 진입 실패'; return out; }
      } else if (md === 'promo') {
        startPromo();
        if (!promo) { restore(); out.err = '승급전 진입 실패'; return out; }
      } else if (md === 'raid') {
        startRaid(RAIDS[0]);
        if (!raidOn) { restore(); out.err = '레이드 진입 실패'; return out; }
      } else if (md === 'arena') {
        startArena();
        if (!arena) { restore(); out.err = '아레나 진입 실패'; return out; }
      } else if (md === 'stage') {
        startBoss();
        if (!bossOn) { restore(); out.err = '보스전 진입 실패'; return out; }
      }
      out.cdAtStart = eq.map((id) => +(skillCd[id] || 0).toFixed(3));

      /* ── ③ «전투 시작» 프레임을 찾는다 = 보스가 필드에 실제로 서고, 등장 국면이 끝난 프레임 ── */
      /* «전투 시작» = 보스가 **표적이 되는** 프레임이다 — `nearest()` 가 `born < 0.3` 을 건너뛴다 */
      const bossUp = () => enemies.some((e) => e.hp > 0 && e.born >= 0.3 &&
        (e.tk === 'dunboss' || e.tk === 'boss' || e.tk === 'promo' || e.tk === 'arena' || e.raid));
      let fightFr = -1;
      for (; fr < 600; fr++) {
        if (bossUp() && !(typeof bossIntro !== 'undefined' && bossIntro)) { fightFr = fr; break; }   /* 457 — 국면은 모든 보스전 공용 */
        step(DT);
      }
      out.fightSec = fightFr < 0 ? null : +(fightFr * DT).toFixed(3);
      out.cdAtFight = eq.map((id) => +(skillCd[id] || 0).toFixed(3));
      out.castsBeforeFight = casts.slice();       /* ④ — 보스가 서기 전에 빈 바닥으로 나간 시전 */

      /* ── ② 전투 시작 후 첫 시전까지 ── */
      const fr0 = fr;
      const seen = {};
      for (let i = 0; i < 600 && Object.keys(seen).length < eq.length; i++, fr++) {
        enemies.forEach((e) => { e.dmg = 0; });      /* 죽으면 2.4초 부활 연출이 «첫 시전» 을 밀어낸다 */
        step(DT);
        /* 전투 시작 «프레임 안» 에서 초기화가 먹었는지 — step 뒤에 읽어야 보인다(수리 전에는 그대로 4초) */
        if (i === 0) out.cdInFight = eq.map((id) => +(skillCd[id] || 0).toFixed(3));
        casts.forEach((c) => { if (c.fr >= fr0 && seen[c.id] === undefined) seen[c.id] = +((c.fr - fr0) * DT).toFixed(3); });
      }
      out.firstCast = eq.map((id) => (seen[id] === undefined ? null : seen[id]));
      restore();
    } catch (e) { out.err = String((e && e.message) || e).split('\n')[0].slice(0, 200); }
    return out;
  }, arg);

  const rows = [];
  for (const md of MODES) {
    const r = await run([md, EQ, BIG]);
    rows.push(r);
    if (r.__err || r.err) { console.log(md.padEnd(6) + ' — 실패: ' + (r.__err || r.err)); continue; }
    console.log(md.padEnd(6) +
      ' · 보스가 서기까지 ' + (r.fightSec === null ? '못 섬' : r.fightSec.toFixed(2) + 's') +
      ' · 진입 직후 쿨 [' + r.cdAtStart.join(', ') + ']' +
      ' · 시작 직전 쿨 [' + r.cdAtFight.join(', ') + ']' +
      ' · **전투 시작 프레임 안 쿨 [' + (r.cdInFight || []).join(', ') + ']**');
    console.log('       첫 시전까지(초) [' + r.firstCast.map((v) => (v === null ? '—' : v.toFixed(2))).join(', ') + ']' +
      ' · 보스 서기 전 시전 ' + r.castsBeforeFight.length + '건' +
      (r.castsBeforeFight.length ? ' (' + r.castsBeforeFight.map((c) => c.id).join(',') + ')' : ''));
  }

  /* ── ④ 갈림길 실측 — 스테이지 보스에서 «start 함수 안에서 0 으로 두면» 무엇이 빈 바닥에 나가는가 ── */
  const burn = await ev(([eq]) => {
    const out = {}; const DT = 1 / 60;
    try {
      localStorage.clear();
      Object.assign(S, DEF());
      eq.forEach((id) => { S.own[id] = { n: 0, l: 1 }; });
      S.eqSkill = eq.slice();
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      arena = null; raidOn = null; promo = null;
      if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
      spawnStage();
      const casts = [];
      const rc = window.castSkill;
      window.castSkill = function (s) { const ok = rc.apply(this, arguments); if (ok) casts.push(s.id); return ok; };
      startBoss();
      if (typeof cdArm !== 'undefined') cdArm = false; /* 수리본의 예약을 끄고 «기각한 설계» 만 재현한다 */
      eq.forEach((id) => { skillCd[id] = 0; });        /* «start 함수 안에서 초기화» 가정 */
      for (let i = 0; i < 200 && !enemies.some((e) => e.tk === 'boss'); i++) step(DT);
      window.castSkill = rc;
      out.casts = casts.slice();
      out.cdAtBoss = eq.map((id) => +(skillCd[id] || 0).toFixed(3));
    } catch (e) { out.err = String((e && e.message) || e).split('\n')[0].slice(0, 200); }
    return out;
  }, [EQ]);
  console.log('\n④ 스테이지 보스 — start 함수 안에서 쿨을 0 으로 두면 (보스는 1.4초 뒤에 선다)');
  if (burn.__err || burn.err) console.log('   실패: ' + (burn.__err || burn.err));
  else console.log('   빈 바닥 시전 ' + burn.casts.length + '건 (' + (burn.casts.join(',') || '없음') + ')' +
                   ' · 보스가 선 프레임의 쿨 [' + burn.cdAtBoss.join(', ') + ']');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})();
