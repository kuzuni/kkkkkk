/* 작업 473 재현 프로브 — «보스 등장 국면 동안 스킬 쿨타임이 흐르면 안 되고 발동돼서도 안 된다»
 *
 *   node tools/probe473.js
 *
 * 주인 원문: «보스전할떄 전투시작 하기전까지 스킬 쿨타임 지나고 있으면안됨. 발동되고있어서도 안됨».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify473.js`)가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는**
 * 자리다(338 규칙 — 처방을 따르기 전에 먼저 재현한다. 338·341·464 는 여기서 등재문 가설이 기각됐다).
 *
 * 등재문의 가설: «step 의 스킬 루프가 국면 중에도 매 프레임 돈다».
 * 실측 축은 넷이고, **프레임을 세 창으로 갈라서** 잰다:
 *   W1 진입 ~ 국면이 열리기 전(스테이지·던전의 스폰 딜레이 1.4초 — 보스가 아직 안 섰다)
 *   W2 국면 중(= `bossIntro` 가 살아 있는 프레임) — **여는 프레임을 따로 뗀다**
 *      (457 이 `bossT` 에서 «국면이 열리는 그 프레임은 이미 위를 지나 아래로 내려온다» 를 적어 뒀다)
 *   W3 국면이 끝난 뒤(459 초기화 → 첫 시전)
 * 각 창에서 ① `skillCd` 합계 감소량 ② `castSkill` 성공 횟수 ③ 펫 탄(`shots.k==='pet'`) 생성 수
 * ④ 투사체·장판(`shots`/`zones`/`bolts`) 순증을 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const MODES = ['stage', 'dun', 'tower', 'promo', 'raid'];
const EQ = ['slash', 'poison', 'meteor', 'holy'];   /* 표적 필수 2 + 대상 없어도 나가는 2 */
const SMALL = 0.02;                                 /* «쿨이 거의 다 찼다» — 국면 중에 반드시 터질 값 */

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

  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계(probe458·probe459 와 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const LEN = await ev(() => ({
    pan: typeof BOSS_INTRO_PAN !== 'undefined' ? BOSS_INTRO_PAN : null,
    len: typeof bossIntroLen === 'function' ? bossIntroLen() : null,
  }));
  console.log('등장 국면 길이 ' + (LEN.len === null ? '?' : LEN.len.toFixed(3) + 's')
    + ' (팬 ' + (LEN.pan === null ? '?' : LEN.pan) + 's) · 주입 skillCd = ' + SMALL + 's · dt = 1/60\n');

  const run = (arg) => ev(([md, eq, small]) => {
    const out = { md, W1: null, open: null, W2: null, W3: null };
    const DT = 1 / 60;
    try {
      localStorage.clear();
      Object.assign(S, DEF());
      eq.forEach((id) => { S.own[id] = { n: 0, l: 1 }; });
      S.eqSkill = eq.slice();
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      S.rank = 0; S.dia = 99999; S.gold = 1e7;
      S.pets = S.pets || {};
      /* 펫 한 마리를 반드시 세운다 — 처방 ③(펫 자동 공격)의 축이다 */
      const pid = (typeof PETS !== 'undefined' && PETS[0]) ? PETS[0].id : null;
      if (pid) { S.pet = S.pet || {}; S.pet[pid] = { n: 1, l: 1 }; S.eqPet = [pid]; }
      arena = null; raidOn = null; promo = null;
      if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
      spawnStage();
      if (typeof syncPets === 'function') syncPets();
      document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));

      /* 시전을 가로챈다 — «언제 무엇이 나갔나» 를 프레임 번호로 적는다 */
      const casts = [];
      let fr = 0;
      const rc = window.castSkill;
      window.castSkill = function (s) {
        const ok = rc.apply(this, arguments);
        if (ok) casts.push({ id: s && s.id, fr });
        return ok;
      };
      const restore = () => { window.castSkill = rc; };

      const cdSum = () => eq.reduce((a, id) => a + Math.max(0, skillCd[id] || 0), 0);
      const petShots = () => shots.filter((s) => s.k === 'pet').length;
      const fx = () => shots.length + zones.length + bolts.length;
      const introOn = () => typeof bossIntro !== 'undefined' && !!bossIntro;
      const win = () => ({ fr: 0, cdDrop: 0, casts: 0, petShots: 0, fxUp: 0 });

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
      } else if (md === 'stage') {
        startBoss();
        if (!bossOn) { restore(); out.err = '보스전 진입 실패'; return out; }
      }
      /* 459 의 «전투 시작 프레임 0 초기화» 예약이 창을 가리지 않게, 매 프레임 다시 심는다 */
      const seed = () => { eq.forEach((id) => { skillCd[id] = Math.min(skillCd[id] === undefined ? small : skillCd[id], small); }); };
      seed();

      const W1 = win(), W2 = win(), W3 = win();
      let open = null;
      let sawIntro = false, introDone = false;

      for (let i = 0; i < 900; i++, fr++) {
        const pre = { on: introOn(), cd: cdSum(), c: casts.length, ps: petShots(), fx: fx() };
        step(DT);
        const post = { on: introOn(), cd: cdSum(), c: casts.length, ps: petShots(), fx: fx() };
        const rec = { cdDrop: Math.max(0, pre.cd - post.cd), casts: post.c - pre.c,
                      petShots: Math.max(0, post.ps - pre.ps), fxUp: Math.max(0, post.fx - pre.fx) };
        let bucket = null;
        if (!pre.on && post.on) {              /* 국면이 «열린» 프레임 — 위를 지나 아래로 내려온다 */
          sawIntro = true;
          open = { fr, cdDrop: +rec.cdDrop.toFixed(4), casts: rec.casts, petShots: rec.petShots, fxUp: rec.fxUp };
        } else if (pre.on) {                    /* 국면 «중» (닫히는 프레임 포함) */
          sawIntro = true; bucket = W2;
          if (!post.on) introDone = true;
        } else if (!sawIntro) bucket = W1;      /* 국면 이전 */
        else { bucket = W3; introDone = true; } /* 국면 이후 */
        if (bucket) {
          bucket.fr++; bucket.cdDrop += rec.cdDrop; bucket.casts += rec.casts;
          bucket.petShots += rec.petShots; bucket.fxUp += rec.fxUp;
        }
        if (introDone && W3.fr >= 30) break;    /* 국면 뒤 0.5초만 본다 */
        if (bucket !== W3) seed();              /* 창 안에서 «쿨이 다 찼다» 를 유지 */
      }
      restore();
      out.sawIntro = sawIntro;
      const fin = (w) => ({ fr: w.fr, sec: +(w.fr / 60).toFixed(3), cdDrop: +w.cdDrop.toFixed(4),
                            casts: w.casts, petShots: w.petShots, fxUp: w.fxUp });
      out.W1 = fin(W1); out.W2 = fin(W2); out.W3 = fin(W3); out.open = open;
    } catch (e) { out.err = String((e && e.message) || e).split('\n')[0].slice(0, 200); }
    return out;
  }, arg);

  const line = (tag, w) => '   ' + tag.padEnd(26) + ' 프레임 ' + String(w.fr).padStart(3)
    + ' (' + w.sec.toFixed(2) + 's) · 쿨 감소 ' + w.cdDrop.toFixed(3) + 's'
    + ' · 시전 ' + w.casts + '건 · 펫 탄 ' + w.petShots + '발 · fx 순증 ' + w.fxUp;

  const rows = [];
  for (const md of MODES) {
    const r = await run([md, EQ, SMALL]);
    rows.push(r);
    console.log('── ' + md);
    if (r.__err || r.err) { console.log('   실패: ' + (r.__err || r.err)); continue; }
    if (!r.sawIntro) { console.log('   등장 국면이 열리지 않았다(국면 없는 모드이거나 진입 경로가 다르다)'); continue; }
    console.log(line('W1 국면 전(스폰 딜레이)', r.W1));
    console.log('   ' + '국면 «여는» 프레임'.padEnd(24) + ' fr ' + String(r.open ? r.open.fr : -1).padStart(3)
      + '        · 쿨 감소 ' + (r.open ? r.open.cdDrop.toFixed(3) : '?') + 's'
      + ' · 시전 ' + (r.open ? r.open.casts : '?') + '건 · 펫 탄 ' + (r.open ? r.open.petShots : '?') + '발'
      + ' · fx 순증 ' + (r.open ? r.open.fxUp : '?'));
    console.log(line('W2 국면 중', r.W2));
    console.log(line('W3 국면 뒤 0.5초', r.W3));
  }

  console.log('\n요약 — 국면 중(W2 + 여는 프레임)에 새는 것');
  for (const r of rows) {
    if (r.__err || r.err || !r.sawIntro) continue;
    const cd = r.W2.cdDrop + (r.open ? r.open.cdDrop : 0);
    const ca = r.W2.casts + (r.open ? r.open.casts : 0);
    const ps = r.W2.petShots + (r.open ? r.open.petShots : 0);
    console.log('   ' + r.md.padEnd(6) + ' 쿨 감소 ' + cd.toFixed(3) + 's · 시전 ' + ca + '건 · 펫 탄 ' + ps + '발');
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})();
