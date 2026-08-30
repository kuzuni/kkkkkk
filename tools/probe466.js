/* 작업 466 재현 프로브 — «`tools/verify338.js` §2 «던전 입장 실패» 10건(3/13)»
 *
 *   node tools/probe466.js
 *
 * 338·341·350·372 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341 은 여기서 등재문이 기각됐고, 350·363·455·464 는 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 466)의 주장:
 *   ⓐ `verify338` §1 이 스테이지 보스전을 **켜 둔 채** 끝낸다(`spawnStage(); killed = ENEMY_COUNT; step()`).
 *   ⓑ 453 이후 `battleBusy()` 가 그 상태에서 던전 입장을 막는다(`startDunRun` 첫 줄 가드).
 *   ⓒ 그래서 §2 의 10종이 전부 «입장 실패» 다 — **제품이 아니라 게이트의 전제가 낡았다**(제품 0줄 예상).
 *
 * 이 자가 묻는 것:
 *   [1] 신선 부팅에서 던전 8 + 탑 2 가 **전부 들어가진다** — 제품은 멀쩡하다(= 제품 0줄의 근거).
 *   [2] §1 의 «그 코드 그대로» 를 굴린 뒤 남는 상태(`bossOn`·`bossT`·`bossMode()`·`battleBusy()`).
 *   [3] 그 상태에서 `challengeDungeon` 을 부르면 `dunRun` 이 안 선다 = 등재문의 재현.
 *   [4] **음성항** — 게이트가 지금 하는 `endDunRun(false, true)` 만으로는 안 풀린다(던전이 아니라
 *       **스테이지** 보스전이 켜져 있으므로). «남이 치워 주겠지» 가 성립하지 않는다는 증거.
 *   [5] `verify457` 꼴 `reset()`(전 모드 중립화)을 걸면 같은 자리에서 10종이 전부 들어간다 = 처방 확인.
 *   [6] **헛초록** — 지금 게이트는 §1 던전 절과 §R 절을 `if(!blk(...) && !p.err)` 로 감싸
 *       입장이 실패하면 **한 줄도 안 찍고 지나간다**. 그 자리 수를 소스에서 센다
 *       (그래서 13항 중 10항만 빨갛고 나머지가 «없는 것» 이 됐다).
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464 규약). [1]~[5] 는 **제품**에게 묻는
 *   것이라 수리 전·후 둘 다 같은 값이고(제품 0줄), 갈리는 것은 [6] 의 «조용한 건너뜀 자리 수»
 *   (수리 전 2 → 수리 후 0)뿐이라 그 항만 «트리에 따라 기대값이 갈린다» 고 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + JSON.stringify(got)) : no(m + ' — 기대 ' + JSON.stringify(want) + ' · 실제 ' + JSON.stringify(got)));
const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

/* §1 이 실제로 쓰는 «스테이지 보스 세우기» 를 **글자 그대로** 옮겨 둔다(verify338.js ~106행).
   이 문자열이 곧 재현 대상이다 — 게이트를 안 고쳐도 여기서 같은 상태가 나와야 한다. */
const STAGE_BOSS = `
  localStorage.clear(); Object.assign(S, DEF());
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (dunRun) endDunRun(false, true);
  spawnStage(); enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
  step(1/60);
  spawnQ.forEach(function(q){ if (q.t === 'boss') q.delay = 0; });
  step(1/60);
`;

/* verify338 이 지금 §2 진입 전에 하는 준비(= 등재문이 «낡았다» 고 지목한 그것). */
const OLD_PREP = `
  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (dunRun) endDunRun(false, true);
`;

/* verify457 §HARNESS 의 reset() — 전 모드 중립화. 처방 후보 그대로. */
const NEW_PREP = OLD_PREP + `
  if (typeof arena !== 'undefined' && arena) endArena(null);
  if (typeof raidOn !== 'undefined' && raidOn) endRaid(false);
  if (typeof promo !== 'undefined' && promo) promo = null;
  bossIntro = null; bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;
  enemies.length = 0; spawnQ.length = 0; shots.length = 0; nums.length = 0; corpses.length = 0;
  player.x = WORLD.w/2; player.y = WORLD.h/2; player.hp = stat.maxHp; player.dead = 0;
  var _c = camClamp(player.x, player.y); cam.x = _c.x; cam.y = _c.y;
  document.querySelectorAll('.modal.on, .mw.on').forEach(function(el){ el.classList.remove('on'); });
  if (typeof closeModal === 'function') closeModal();
`;

/* 실제 진입점으로 던전·탑에 들어간다(verify338 enter() 의 몸통과 같다 — 준비 절만 갈아 끼운다). */
const ENTER_BODY = `
  if (TOWERS.some(function(t){ return t.id === __id; })) { challengeTower(__id); }
  else {
    var d = DUNGEONS.find(function(x){ return x.id === __id; });
    S.dunTk[d.id] = 9;
    for (var k = 0; k < 8; k++) {
      var u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    challengeDungeon(d);
  }
  return !!dunRun;
`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

  const ev = async (src, id) => {
    try { return await page.evaluate('(function(__id){' + src + '})(' + JSON.stringify(id === undefined ? null : id) + ')'); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  const LIST = await ev('return DUNGEONS.concat(TOWERS).map(function(d){ return d.id; });');
  if (blk('던전·탑 목록', LIST)) { await browser.close(); process.exit(1); }

  /* ── [1] 제품은 멀쩡하다 — 신선 준비에서 10종 전부 입장 ────────────────────── */
  console.log('\n[1] 제품 — 중립 상태에서 던전 8 + 탑 2 가 전부 들어가진다(제품 0줄의 근거)');
  {
    const okIds = [], noIds = [];
    for (const id of LIST) {
      const r = await ev(NEW_PREP + ENTER_BODY, id);
      if (blk('[1] ' + id, r)) continue;
      (r ? okIds : noIds).push(id);
      await ev('if (dunRun) endDunRun(false, true); return 1;');
    }
    is('[1] 입장 성공 수 (중립 상태)', okIds.length, LIST.length);
    if (noIds.length) console.log('       실패: ' + noIds.join(', '));
  }

  /* ── [2] §1 이 남기는 상태 ──────────────────────────────────────────────── */
  console.log('\n[2] `verify338` §1 의 코드 그대로 — 끝난 뒤 남는 상태');
  const st = await ev(STAGE_BOSS + `
    return { boss: !!enemies.find(function(e){ return e.tk === 'boss'; }),
             bossOn: !!bossOn, bossT: +bossT.toFixed(2),
             mode: bossMode(), busy: battleBusy(), dunRun: !!dunRun };
  `);
  if (!blk('[2]', st)) {
    is('[2] 스테이지 보스가 실제로 섰다', st.boss, true);
    is('[2] `bossOn` 이 켜진 채로 남는다', st.bossOn, true);
    (st.bossT > 0) ? ok('[2] `bossT` 가 도는 채로 남는다 = ' + st.bossT + 's') : no('[2] `bossT` 가 0 이다 — 등재문의 전제와 다르다');
    is('[2] `bossMode()`', st.mode, 'stage');
    is('[2] `battleBusy()` — 453 판정', st.busy, true);
    is('[2] 던전 런은 안 서 있다(= 막는 것은 던전이 아니라 스테이지 보스전)', st.dunRun, false);
  }

  /* ── [3] 그 상태에서 던전 입장 = 실패(등재문 재현) ─────────────────────────── */
  console.log('\n[3] 재현 — §1 이 남긴 보스전 위에서 던전·탑 입장');
  {
    const okIds = [], noIds = [];
    for (const id of LIST) {
      const r = await ev(STAGE_BOSS + ENTER_BODY, id);   /* 매번 §1 상태를 다시 세운다 */
      if (blk('[3] ' + id, r)) continue;
      (r ? okIds : noIds).push(id);
      await ev('if (dunRun) endDunRun(false, true); bossOn = false; bossT = 0; enemies.length = 0; spawnQ.length = 0; return 1;');
    }
    is('[3] 입장 실패 수 = 등재문의 «10건»', noIds.length, LIST.length);
    if (okIds.length) console.log('       성공해 버린 것: ' + okIds.join(', '));
  }

  /* ── [4] 음성항 — 게이트가 지금 하는 준비만으로는 안 풀린다 ─────────────────── */
  console.log('\n[4] 음성항 — `endDunRun(false,true)` 만 하는 현행 준비로는 그대로 막힌다');
  {
    const r = await ev(STAGE_BOSS + OLD_PREP + `
      var pre = { busy: battleBusy(), mode: bossMode() };
      ` + ENTER_BODY.replace('return !!dunRun;', 'return { pre: pre, entered: !!dunRun };'), 'gold');
    if (!blk('[4]', r)) {
      is('[4] 현행 준비 뒤에도 `battleBusy()`', r.pre.busy, true);
      is('[4] 현행 준비 뒤에도 `bossMode()`', r.pre.mode, 'stage');
      is('[4] 현행 준비로 gold 입장', r.entered, false);
    }
    await ev('if (dunRun) endDunRun(false, true); bossOn = false; bossT = 0; return 1;');
  }

  /* ── [5] 처방 확인 — reset() 꼴이면 같은 자리에서 전부 들어간다 ──────────────── */
  console.log('\n[5] 처방 — `verify457` 꼴 `reset()`(전 모드 중립화)을 §1 상태 위에 걸면');
  {
    const okIds = [], noIds = [];
    for (const id of LIST) {
      const r = await ev(STAGE_BOSS + NEW_PREP + ENTER_BODY, id);
      if (blk('[5] ' + id, r)) continue;
      (r ? okIds : noIds).push(id);
      await ev('if (dunRun) endDunRun(false, true); bossOn = false; bossT = 0; return 1;');
    }
    is('[5] 입장 성공 수 (보스전 위 + reset)', okIds.length, LIST.length);
    if (noIds.length) console.log('       실패: ' + noIds.join(', '));
  }

  /* ── [6] 헛초록 — 입장이 실패하면 조용히 지나가는 자리 ─────────────────────── */
  console.log('\n[6] 헛초록 — 입장 실패를 한 줄도 안 찍고 지나가는 자리(소스 전수)');
  {
    const gate = fs.readFileSync(path.resolve(__dirname, 'verify338.js'), 'utf8');
    /* `if (!blk(...) && !p.err) {` — 실패하면 no() 없이 블록을 통째로 건너뛴다 */
    const silent = (gate.match(/&& !p\.err\)/g) || []).length;
    const loud = (gate.match(/if \(p\.err\)[^\n]*no\(/g) || []).length;
    console.log('       조용한 자리 ' + silent + '곳 · 실패를 찍는 자리 ' + loud + '곳');
    (silent === 2)
      ? ok('[6] 조용한 건너뜀 2곳(§1 던전 방향 · §R 되돌림) — 수리 전 트리의 기대값')
      : (silent === 0
        ? ok('[6] 조용한 건너뜀 0곳 — 수리 후 트리의 기대값')
        : no('[6] 조용한 건너뜀 ' + silent + '곳 — 수리 전 2 / 수리 후 0 중 어느 쪽도 아니다'));
  }

  is('콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join('\n    '));
  console.log('\nPROBE466 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
