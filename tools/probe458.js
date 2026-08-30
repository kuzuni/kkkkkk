/* 작업 458 재현 프로브 — «보스전 도중에 죽어도 안 진다»
 *
 *   node tools/probe458.js
 *
 * 주인 원문: «보스전 도중에 죽으면 실패되는거로 해야함».
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는** 자리다
 * (338 규칙 — 처방을 따르기 전에 먼저 재현한다. 338·341 은 여기서 등재문 가설이 기각됐다).
 *
 * 여섯 모드를 **실제 진입점 · 실제 접촉 피해**로 굴려 사망시키고 세 시점을 찍는다:
 *   ① 사망 프레임      — bossMode() 가 바뀌었나(= 모드가 끝났나) · 결과 통보/화면이 떴나
 *   ② +4초(240 프레임) — 만피로 되살아나 **그 보스전을 계속 싸우고 있나**
 *   ③ 보상·진행       — 실패인데 층·계급이 올랐나(보상 0 확인)
 *
 * 모드: 던전(30) · 탑(209/210) · 승급전 · 레이드(46) · 아레나(123, 대조군) · 스테이지 보스(28, 대조군).
 * 대조군 둘은 **수리 전에도 이미 실패로 끝나는** 자리라 «자가 제대로 재고 있는지» 를 검산한다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

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

  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계(161 교훈 · verify273 과 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const run = (mode) => ev(([md]) => {
    /* ---- 공통 준비 ---- */
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999;
    arena = null; raidOn = null; promo = null;
    if (dunRun) endDunRun(false, true);
    spawnStage();
    document.getElementById('defw').classList.remove('on');
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));

    /* notify 를 가로챈다 — 실패 «결과» 가 실제로 나갔는지 본다(206 규약) */
    const toasts = [];
    const realNotify = window.notify;
    window.notify = (t) => { toasts.push(String(t).replace(/<[^>]*>/g, '')); return realNotify(t); };
    const msgs = [];
    const realShow = window.showMsg;
    window.showMsg = (t) => { msgs.push(String(t)); return realShow(t); };

    const before = {};
    let entered = true;

    /* ---- 모드별 진입 ---- */
    if (md === 'dun' || md === 'tower') {
      if (md === 'tower') {
        challengeTower(TOWERS[0].id);
      } else {
        const d = DUNGEONS[0];
        S.dunTk[d.id] = 9;
        challengeDungeon(d);
      }
      if (!dunRun) entered = false;
      else {
        before.floor = md === 'tower' ? S.tower : S.dun[dunRun.d.id];
        /* 보스를 즉시 세우고 425 등장 국면을 건너뛴다(국면 중에는 아무도 안 때린다 — 지시 ③) */
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        for (let i = 0; i < 30 && !enemies.some((e) => e.tk === 'dunboss'); i++) step(1 / 60);
        for (let i = 0; i < 200 && dunRun && dunRun.introOn; i++) step(1 / 60);
      }
    } else if (md === 'promo') {
      startPromo();
      if (!promo) entered = false; else before.rank = S.rank;
    } else if (md === 'raid') {
      startRaid(RAIDS[0]);
      if (!raidOn) entered = false;
    } else if (md === 'arena') {
      startArena();
      if (!arena) entered = false;
    } else if (md === 'stage') {
      startBoss();
      for (let i = 0; i < 200 && !enemies.length; i++) step(1 / 60);
    }
    if (!entered) { window.notify = realNotify; window.showMsg = realShow; return { err: '진입 실패(' + md + ')' }; }

    const mdIn = bossMode();
    const intro = !!(dunRun && dunRun.introOn);

    /* ---- 실제 접촉 피해로 죽인다(273 dieToMob 과 같은 경로) ---- */
    player.hp = 1; player.inv = 0; player.dead = 0;
    let e = enemies[0];
    if (!e) { makeEnemy('zombie'); e = enemies[enemies.length - 1]; }
    e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9; e.x = player.x; e.y = player.y;
    /* «죽었다» 는 사망 «경로» 로 센다 — 실패로 끝난 모드는 같은 프레임에 spawnStage() 로
       `player.dead` 를 0 · hp 를 만피로 되돌리므로, 사후 상태만 보면 «안 죽었다» 로 읽힌다. */
    let deaths = 0;
    const realDied = window.playerDied;
    window.playerDied = function(){ deaths++; return realDied.apply(this, arguments); };
    let fr = 0;
    for (; fr < 60 && !deaths; fr++) step(1 / 60);
    window.playerDied = realDied;
    const died = deaths > 0;

    /* ① 사망 프레임 직후 */
    const at0 = { md: bossMode(), dun: !!dunRun, promo: !!promo, raid: !!raidOn, arena: !!arena,
                  defw: document.getElementById('defw').classList.contains('on'),
                  farm: !!S.bossFarm, toasts: toasts.slice(), msgs: msgs.slice() };

    /* ② +4초 — 만피로 되살아나 계속 싸우는가 */
    for (let i = 0; i < 240; i++) step(1 / 60);
    const at4 = { md: bossMode(), dun: !!dunRun, promo: !!promo, raid: !!raidOn, arena: !!arena,
                  hp: +(player.hp / Math.max(1, stat.maxHp)).toFixed(3), dead: +player.dead.toFixed(2),
                  foes: enemies.length, toasts: toasts.slice() };

    /* ③ 보상·진행 */
    const after = {};
    if (md === 'dun') after.floor = S.dun[DUNGEONS[0].id];
    if (md === 'tower') after.floor = S.tower;
    if (md === 'promo') after.rank = S.rank;

    /* 뒷정리 */
    window.notify = realNotify; window.showMsg = realShow;
    if (dunRun) endDunRun(false, true);
    arena = null; raidOn = null; promo = null;
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    document.getElementById('defw').classList.remove('on');
    if (typeof closeModal === 'function') closeModal();
    return { mdIn, intro, died, frames: fr, at0, at4, before, after };
  }, [mode]);

  const MODES = [
    ['dun',   '던전(30)'],
    ['tower', '탑(209/210)'],
    ['promo', '승급전'],
    ['raid',  '레이드(46)'],
    ['arena', '아레나(123, 대조군)'],
    ['stage', '스테이지 보스(28, 대조군)'],
  ];
  let bad = 0;
  for (const [id, n] of MODES) {
    console.log('\n══ ' + n + ' ═══════════════════════════════');
    const r = await run(id);
    if (r.__err) { console.log('  평가 실패: ' + r.__err); bad++; continue; }
    if (r.err)   { console.log('  ' + r.err); bad++; continue; }
    console.log('   진입 bossMode()  = "' + r.mdIn + '"' + (r.intro ? ' (등장 국면 중)' : ''));
    console.log('   사망              = ' + r.died + ' (' + r.frames + ' 프레임 만에)');
    console.log('   ① 사망 프레임     bossMode()="' + r.at0.md + '" dun=' + r.at0.dun +
                ' promo=' + r.at0.promo + ' raid=' + r.at0.raid + ' arena=' + r.at0.arena +
                ' 패배화면=' + r.at0.defw + ' 파밍=' + r.at0.farm);
    console.log('      통보 ' + (r.at0.toasts.length ? r.at0.toasts.map((t) => '«' + t.slice(0, 46) + '»').join(' ') : '없음') +
                ' · 문구 ' + (r.at0.msgs.length ? r.at0.msgs.map((t) => '«' + t + '»').join(' ') : '없음'));
    console.log('   ② +4초           bossMode()="' + r.at4.md + '" hp=' + r.at4.hp +
                ' dead=' + r.at4.dead + ' 적=' + r.at4.foes +
                ' 통보 ' + (r.at4.toasts.length ? r.at4.toasts.map((t) => '«' + t.slice(0, 46) + '»').join(' ') : '없음'));
    if (r.before.floor !== undefined) console.log('   ③ 진행 레벨 ' + r.before.floor + ' → ' + r.after.floor);
    if (r.before.rank  !== undefined) console.log('   ③ 계급 ' + r.before.rank + ' → ' + r.after.rank);
    /* «죽어도 안 지는 보스전» = 사망했는데 4초 뒤에도 같은 모드가 살아 있고 만피다 */
    const alive = r.died && r.at4.md === r.mdIn && r.at4.md !== '' && r.at4.hp >= 0.99;
    if (alive) { console.log('   ⚠ 죽고도 계속 싸운다 — «' + r.mdIn + '» 가 4초 뒤에도 살아 있고 만피(hp=' + r.at4.hp + ')'); bad++; }
    else console.log('   → 사망이 모드를 끝냈다(bossMode "' + r.mdIn + '" → "' + r.at4.md + '")');
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('PROBE458 — «죽어도 안 지는» 모드 ' + bad + '건');
  await browser.close();
})();
