/* 작업 453 재현 프로브 — «전투 중 던전 내비·승급전 팝업 열기 금지 + 전투 입장 전면 차단»
 *
 *   node tools/probe453.js                 (현재 트리)
 *   node tools/probe453.js <index.html 경로> (수리 전 사본과 대조할 때)
 *
 * 338 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * 등재문(PROGRESS 453)의 주장:
 *   ⓐ 「전투 중」의 단일 판정 `bossMode()` 는 이미 있는데 **입구 가드가 제각각**이다.
 *   ⓑ `openDungeon()` 에 가드가 **없어서** 전투 중에도 03 던전 페이지가 열린다.
 *   ⓒ `openPromo()` 에 가드가 **없어서** 전투 중에도 승급전 팝업이 열린다.
 *   ⓓ 입장 함수 넷(`startDunRun`·`challengeTower`·`startRaid`·`startArena`)이
 *      `dunRun|raidOn|arena` **셋만** 보고 `promo`·스테이지 보스전(`bossOn`)을 안 본다
 *      ⇒ 「던전 중에 승급전」「승급전 중에 던전」「스테이지 보스전 중에 던전·승급전」이 전부 열린다.
 *   ⓔ 예외 — 339 자동 도전·31 클리어 [다음]/[재도전] 은 `endDunRun()` 이 `dunRun = null` 로
 *      만든 **뒤**에 불리므로 막히면 안 된다.
 *
 * 이 자는 **찍힌 상태**로만 말한다(«열렸나» 는 DOM 클래스, «들어갔나» 는 전역 상태).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../index.html');
const URL = 'file://' + TARGET;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 다섯 전투 모드를 «제품의 실제 진입점» 으로 만든다 — 상태를 손으로 짓지 않는다(LESSONS 46-③).
   자원(입장권·다이아·해금)은 세이브가 합법적으로 가질 수 있는 값으로만 채운다. */
const SETUP = {
  stage: `S.bossFarm = false; bossOn = false; startBoss();`,
  dun:   `S.dunTk[DUNGEONS[0].id] = 9; challengeDungeon(DUNGEONS[0]);`,
  promo: `S.rank = 0; startPromo();`,
  raid:  `S.daily.raid = 9; S.best = 9999; startRaid(RAIDS[0]);`,
  arena: `S.dia = 999999; S.daily.arena = 9; S.best = 9999; startArena();`,
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
  };

  console.log('\n' + '='.repeat(72) + '\n  대상 ' + TARGET + '\n' + '='.repeat(72));

  /* ── ⓐ 단일 판정이 이미 있는가 ────────────────────────────────── */
  blk('ⓐ 「전투 중」 단일 판정');
  const a = await ev(() => ({
    hasBossMode: typeof bossMode === 'function',
    hasBusy: typeof battleBusy === 'function' || typeof battleBusy !== 'undefined',
    idle: typeof bossMode === 'function' ? bossMode() : null,
  }));
  if (a.__err) { fail++; console.log('  ❌ ⓐ 블록 예외: ' + a.__err); }
  else {
    ok(a.hasBossMode, 'bossMode() 가 있다');
    ok(a.idle === '', '부팅 직후 bossMode() = "" (전투 중이 아니다) — 찍힘: ' + JSON.stringify(a.idle));
    console.log('     battleBusy() 존재: ' + (a.hasBusy ? '있음(수리 후)' : '없음(수리 전)'));
  }

  /* ── ⓑⓒⓓ 다섯 모드 × 여덟 입구 ────────────────────────────────── */
  const MODES = ['stage', 'dun', 'promo', 'raid', 'arena'];
  const rows = [];
  for (const md of MODES) {
    blk('전투 모드 «' + md + '» 에서 입구 8곳');
    const r = await ev(async (arg) => {
      /* 매번 깨끗한 상태로 되돌린다 — 앞 모드가 남으면 판정이 섞인다 */
      arena = null; raidOn = null; dunRun = null; promo = null;
      bossOn = false; S.bossFarm = false; stageWin = false;
      closeModal(); closeDungeon();
      S.stage = 20; S.best = Math.max(S.best, 9999);
      // eslint-disable-next-line no-eval
      eval(arg.setup);
      const mode = bossMode();
      const out = { mode, tries: {} };
      const snap = () => ({ dun: !!dunRun, raid: !!raidOn, ar: !!arena, promo: !!promo, boss: bossOn });
      const before = snap();
      const T = (k, fn) => {
        const modalWas = document.getElementById('modal').classList.contains('on');
        const pageWas = document.getElementById('dunw').classList.contains('on');
        try { fn(); } catch (e) { out.tries[k] = { err: String(e && e.message || e).slice(0, 120) }; return; }
        const s = snap();
        out.tries[k] = {
          /* 「열렸다」 = 이 호출로 팝업/페이지가 새로 켜졌다 */
          opened: (!modalWas && document.getElementById('modal').classList.contains('on'))
               || (!pageWas && document.getElementById('dunw').classList.contains('on')),
          /* 「들어갔다」 = 이 호출로 전투 상태가 바뀌었다 */
          entered: JSON.stringify(s) !== JSON.stringify(before),
          state: s,
        };
        /* 다음 항을 위해 원래 모드로 되돌린다 */
        closeModal(); closeDungeon();
        if (JSON.stringify(snap()) !== JSON.stringify(before)) {
          arena = null; raidOn = null; dunRun = null; promo = null;
          bossOn = false; S.bossFarm = false; stageWin = false;
          document.getElementById('app').classList.remove('dunrun');
          // eslint-disable-next-line no-eval
          eval(arg.setup);
        }
      };
      T('openDungeon', () => openDungeon());
      T('openPromo', () => openPromo());
      T('challengeDungeon', () => challengeDungeon(DUNGEONS[0]));
      T('challengeTower', () => challengeTower(TOWERS[0].id));
      T('startRaid', () => startRaid(RAIDS[0]));
      T('startArena', () => startArena());
      T('startPromo', () => startPromo());
      T('startBoss', () => startBoss());
      return out;
    }, { setup: SETUP[md] });

    if (r.__err) { fail++; console.log('  ❌ «' + md + '» 블록 예외: ' + r.__err); continue; }
    ok(r.mode === md, 'setup 이 실제로 모드 «' + md + '» 를 만들었다 — 찍힘: ' + r.mode);
    for (const k of Object.keys(r.tries)) {
      const t = r.tries[k];
      if (t.err) { fail++; console.log('  ❌ ' + k + ' 예외: ' + t.err); continue; }
      const leaked = !!(t.opened || t.entered);
      rows.push({ md, k, opened: !!t.opened, entered: !!t.entered });
      ok(!leaked, k + ' 이 막혔다 (열림 ' + (t.opened ? 'O' : '-') + ' · 입장 ' + (t.entered ? 'O' : '-') + ')');
    }
  }

  /* ── ⓔ 예외: 31 클리어 화면·339 자동 도전은 막히면 안 된다 ─────── */
  blk('ⓔ 예외 — 던전 클리어 직후에는 다시 들어갈 수 있어야 한다');
  const e = await ev(() => {
    arena = null; raidOn = null; promo = null; bossOn = false; S.bossFarm = false; stageWin = false;
    closeModal(); closeDungeon();
    S.dunTk[DUNGEONS[0].id] = 9;
    challengeDungeon(DUNGEONS[0]);
    const inRun = !!dunRun;
    /* 실제 클리어 경로를 그대로 탄다 — endDunRun(true) 가 dunRun 을 비우고 31 화면을 연다 */
    endDunRun(true, false);
    const afterMode = bossMode();
    const canAuto = typeof dclAutoCan === 'function' ? dclAutoCan() : null;
    const tkBefore = S.dunTk[DUNGEONS[0].id];
    challengeDungeon(DUNGEONS[0]);
    return { inRun, afterMode, canAuto, reEntered: !!dunRun, tkBefore, tkAfter: S.dunTk[DUNGEONS[0].id] };
  });
  if (e.__err) { fail++; console.log('  ❌ ⓔ 블록 예외: ' + e.__err); }
  else {
    ok(e.inRun, '던전에 들어갔다');
    ok(e.afterMode === '', '클리어 직후 bossMode() = "" — 찍힘: ' + JSON.stringify(e.afterMode));
    ok(e.canAuto === true, 'dclAutoCan() = true (339 카운트다운이 켜진다) — 찍힘: ' + e.canAuto);
    ok(e.reEntered, '[다음]/자동 도전 경로가 실제로 다시 입장했다');
    ok(e.tkAfter === e.tkBefore - 1, '입장권이 정상 차감됐다 ' + e.tkBefore + ' → ' + e.tkAfter);
  }

  /* ── 요약 표 ────────────────────────────────────────────────── */
  blk('요약 — 모드 × 입구 (O = 뚫림)');
  const keys = ['openDungeon', 'openPromo', 'challengeDungeon', 'challengeTower', 'startRaid', 'startArena', 'startPromo', 'startBoss'];
  console.log('  ' + 'mode'.padEnd(7) + keys.map(k => k.slice(0, 9).padStart(10)).join(''));
  for (const md of MODES) {
    const line = keys.map(k => {
      const r = rows.find(x => x.md === md && x.k === k);
      return (!r ? '?' : (r.opened || r.entered) ? 'O' : '-').padStart(10);
    }).join('');
    console.log('  ' + md.padEnd(7) + line);
  }
  const leaks = rows.filter(r => r.opened || r.entered).length;
  console.log('\n  뚫린 자리: ' + leaks + ' / ' + rows.length);

  /* 대조용 사본은 저장소 밖에 두므로 상대 경로 에셋이 404 가 된다 — 그건 이 자의 관심사가 아니다.
     콘솔 에러는 «현재 트리» 를 볼 때만 단언한다. */
  const IS_REPO = TARGET === path.resolve(__dirname, '../index.html');
  if (IS_REPO) ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  else console.log('  ⏭ 콘솔 에러 단언 생략(저장소 밖 사본 — 에셋 404 는 대조와 무관) · 찍힌 건수 ' + errs.length);

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('probe453: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})();
