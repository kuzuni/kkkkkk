/* 작업 453 게이트 — «전투 중에는 던전 내비·승급전 팝업을 못 열고, 어떤 전투에도 못 들어간다»
 *
 *   node tools/verify453.js
 *
 * 주인 지시(2026-08-30) 원문: «보스전, 승급전, 던전, 탑, 컨텐츠 하는 도중에 던전네비팝업 못열고
 * 승급전 팝업못열고 입장도 못하게 해줘».
 *
 * ⚑ **665(주인 지시 2026-09-02)가 이 자의 «다섯 모드 전부» 를 «네 모드» 로 좁혔다.**
 * 원문: «그냥 그 스테이지 도전하다가 던전, 승급전 도전 가능하게 해주기». 453 은 «전투 중인가»
 * 한 자로 표시와 입장을 둘 다 물었는데, 665 가 입장의 자를 «갈아탈 수 없는가»(`battleLocked`)로
 * 갈랐다 — 스테이지(일반·보스전)는 열려 있고, 나머지 넷과 격파 시퀀스 창만 막힌다.
 * ⚠ 333 처방대로 **항을 지우지 않고 방향을 뒤집었다**: `stage` 행은 이제 «열린다» 를 단언한다.
 *   그냥 지웠으면 «453 이 통째로 사라져도 초록인 게이트» 가 된다.
 *
 * 이 자가 지키는 것 다섯:
 *   [A] 판정이 **한 곳**이다 — `battleBusy() = bossMode() !== ''`. 새 전역 상태 0개이고,
 *       입구마다 손으로 적던 `dunRun || raidOn || arena` 3항 가드가 한 자리도 안 남는다.
 *   [B] **잠기는 네 모드**(던전·승급전·레이드·아레나)에서 **열기**(03 던전 내비 · 승급전 팝업)가
 *       막힌다 + 안내 토스트가 뜬다. **스테이지 행은 반대로 «열린다»**(665).
 *   [C] 그 네 모드에서 **입장**(던전·탑·레이드·아레나·승급전·스테이지 보스) 여섯 길이 막힌다.
 *       **스테이지 행은 반대로 일곱 길이 열리고 `startBoss` 하나만 막힌다**(이미 보스전이다 · 665).
 *   [D] 예외가 살아 있다 — 클리어 직후 재입장(31 [다음] · 339 자동) · 비전투 상태의 정상 입장.
 *   [E] 신호가 따라온다 — **잠기는 모드**에서는 탭 «모험»·사이드 «승급전» 레드닷이 꺼지고 `.busy`
 *       로 흐려진다. **스테이지 보스전에서는 그대로 켜져 있다**(665 — 실제로 누를 수 있으므로).
 *       ⚠ **기하는 Δ0px** 여야 한다(딤은 opacity 뿐이다).
 *   [R] 되돌림 시험 — 판정을 무력화한 사본(`.v453-neg.html`)은 **다시 뚫린다**.
 *       이 절이 없으면 «이미 참인 것을 굳힌 게이트»(338 이 잡은 그 모양)와 구별되지 않는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가
   통째로 404 다(360·367·438·439 가 같은 이유로 루트에 둔 선례. .gitignore 에 등재돼 있다). */
const NEG = path.join(ROOT, `.v453-neg-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

const MODES = ['stage', 'dun', 'promo', 'raid', 'arena'];
/* ⚑ 665 — «잠기는 모드» 와 «열린 모드» 가 갈렸다. 목록을 손으로 두 번 적지 않고 여기서 한 번 나눈다. */
const LOCKED = ['dun', 'promo', 'raid', 'arena'];
/* 스테이지 행에서 **열려야 하는** 일곱 길. `startBoss` 만 남는다 — 이미 스테이지 보스전이므로
   «중복 진입 금지» 는 665 와 무관하게 그대로다(`battleBusy()` 를 계속 본다). */
const STAGE_OPEN = ['openDungeon', 'openPromo', 'challengeDungeon', 'challengeTower', 'startRaid', 'startArena', 'startPromo'];
/* 다섯 전투 모드를 «제품의 실제 진입점» 으로 만든다 — 상태를 손으로 짓지 않는다(LESSONS 46-③) */
const SETUP = {
  stage: `S.bossFarm = false; bossOn = false; startBoss();`,
  dun:   `S.dunTk[DUNGEONS[0].id] = 9; challengeDungeon(DUNGEONS[0]);`,
  promo: `S.rank = 0; startPromo();`,
  raid:  `S.daily.raid = 9; S.best = 9999; startRaid(RAIDS[0]);`,
  arena: `S.dia = 999999; S.daily.arena = 9; S.best = 9999; startArena();`,
};
const OPENERS = ['openDungeon', 'openPromo'];
const ENTRIES = ['challengeDungeon', 'challengeTower', 'startRaid', 'startArena', 'startPromo', 'startBoss'];

/* 한 페이지에서 «모드 × 입구» 를 전부 돌려 뚫린 자리를 센다. 게이트와 되돌림 시험이 같은 자를 쓴다. */
const SWEEP = async (page, setupMap) => {
  const out = {};
  for (const md of MODES) {
    try {
      out[md] = await page.evaluate((arg) => {
        arena = null; raidOn = null; dunRun = null; promo = null;
        bossOn = false; S.bossFarm = false; stageWin = false;
        closeModal(); closeDungeon();
        document.getElementById('app').classList.remove('dunrun');
        S.stage = 20; S.best = Math.max(S.best, 9999);
        // eslint-disable-next-line no-eval
        eval(arg.setup);
        const res = { mode: bossMode(), leak: {}, toast: {} };
        const snap = () => JSON.stringify({ d: !!dunRun, r: !!raidOn, a: !!arena, p: !!promo, b: bossOn });
        const base = snap();
        const reset = () => {
          closeModal(); closeDungeon();
          document.getElementById('app').classList.remove('dunrun');
          if (snap() !== base) {
            arena = null; raidOn = null; dunRun = null; promo = null;
            bossOn = false; S.bossFarm = false; stageWin = false;
            // eslint-disable-next-line no-eval
            eval(arg.setup);
          }
        };
        const run = (k, fn) => {
          const mw = document.getElementById('modal').classList.contains('on');
          const pwas = document.getElementById('dunw').classList.contains('on');
          /* 안내 토스트가 실제로 나갔는지 — notify 는 최상위 함수 선언이라 window 속성이다 */
          const said = [];
          const orig = window.notify;
          window.notify = (t) => { said.push(String(t)); return orig ? orig(t) : null; };
          try { fn(); } catch (e) { res.leak[k] = 'ERR:' + String(e && e.message || e).slice(0, 90); window.notify = orig; return; }
          window.notify = orig;
          const opened = (!mw && document.getElementById('modal').classList.contains('on'))
                      || (!pwas && document.getElementById('dunw').classList.contains('on'));
          res.leak[k] = (opened || snap() !== base);
          res.toast[k] = said.join(' | ');
          reset();
        };
        run('openDungeon', () => openDungeon());
        run('openPromo', () => openPromo());
        run('challengeDungeon', () => challengeDungeon(DUNGEONS[0]));
        run('challengeTower', () => challengeTower(TOWERS[0].id));
        run('startRaid', () => startRaid(RAIDS[0]));
        run('startArena', () => startArena());
        run('startPromo', () => startPromo());
        run('startBoss', () => startBoss());
        return res;
      }, { setup: setupMap[md] });
    } catch (e) {
      out[md] = { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) };
    }
  }
  return out;
};

(async () => {
  /* ── [A] 구조 — 판정이 한 곳인가 (소스 단언) ────────────────────── */
  blk('[A] 판정 단일화 — 소스');
  const src = fs.readFileSync(SRC, 'utf8');
  ok(/const\s+battleBusy\s*=\s*\(\)\s*=>\s*bossMode\(\)\s*!==\s*''/.test(src),
     "A1 battleBusy() 가 bossMode() 를 그대로 재사용한다(새 축을 안 만든다)");
  ok(!/\b(let|var)\s+battleBusy\b/.test(src) && !/S\.battleBusy/.test(src),
     'A2 새 «전투 중» 전역 상태가 없다(켜고 끄는 곳이 늘지 않았다)');
  /* 옛 3항 손 가드 — 세 이름이 나란히 서고 곧바로 닫히는 자리. 죽음 처리(playerDied)의
     `arena || raidOn || dunRun || promo` 는 4항이라 여기 안 걸린다(입구가 아니다). */
  const hand = src.match(/\b(dunRun|raidOn|arena)\s*\|\|\s*(dunRun|raidOn|arena)\s*\|\|\s*(dunRun|raidOn|arena)\s*\)/g) || [];
  ok(hand.length === 0, 'A3 입구에 손으로 적은 3항 가드가 0건 — 찍힘: ' + hand.length + (hand.length ? ' (' + hand.join(' / ') + ')' : ''));
  const uses = (src.match(/battleBu(sy|sy\(\))|battleBlock\(|battleLocked\(|battleLockBlock\(/g) || []).length;
  ok(uses >= 12, 'A4 단일 판정 호출부가 12곳 이상 — 찍힘: ' + uses);
  /* ⚑ 665 — 입장의 자도 **파생**이어야 한다. `bossMode()` 를 다시 읽을 뿐 새 전역을 안 만든다. */
  ok(/const\s+battleLocked\s*=\s*\(\)\s*=>\s*\{\s*const md = bossMode\(\);/.test(src),
     'A6 battleLocked() 도 bossMode() 파생이다(665 — 새 축을 안 만든다)');
  ok(!/\b(let|var)\s+battleLocked\b/.test(src) && !/S\.battleLocked/.test(src),
     'A7 새 «갈아탈 수 없다» 전역 상태가 없다');
  ok(/md !== ''\s*&&\s*md !== 'stage'/.test(src),
     'A8 열린 모드는 «stage» 하나다(665 — 주인이 연 것은 스테이지 도전뿐)');
  ok(/\.ibtn\.busy \.si,\.tab\.busy \.ti\{opacity:\.5\}/.test(src),
     'A5 딤 규칙이 선례(`.ibtn.lock .si` — 629 가 죽은 선언으로 걷어냈다)와 **같은 .5** 이고 opacity 뿐이다(기하 0줄)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + SRC);
  await page.waitForTimeout(900);

  const now = await SWEEP(page, SETUP);

  /* ── [B] 열기 차단 ─────────────────────────────────────────────── */
  blk('[B] 열기 차단 — 03 던전 내비 · 승급전 팝업');
  for (const md of MODES) {
    const r = now[md];
    if (r.__err) { fail++; console.log('  ❌ B «' + md + '» 블록 예외: ' + r.__err); continue; }
    ok(r.mode === md, 'B0 setup 이 모드 «' + md + '» 를 만들었다 — 찍힘: ' + r.mode);
    for (const k of OPENERS) {
      if (md === 'stage') {
        /* ⚑ 665 — 방향이 뒤집힌 항(333 처방). 스테이지 도전 중에는 두 화면이 **열려야** 한다. */
        ok(r.leak[k] === true, 'B «stage» ' + k + ' 가 **열린다**(665 — 주인 지시로 차단 해제)');
        ok(!/전투 중에는/.test(r.toast[k] || ''),
           'B «stage» ' + k + ' 가 반려 토스트를 안 띄운다 — 찍힘: ' + JSON.stringify((r.toast[k] || '').slice(0, 60)));
        continue;
      }
      ok(r.leak[k] === false, 'B «' + md + '» ' + k + ' 가 막혔다');
      ok(/전투 중에는 열 수 없습니다/.test(r.toast[k] || ''),
         'B «' + md + '» ' + k + ' 가 이유를 말한다 — 찍힘: ' + JSON.stringify((r.toast[k] || '').slice(0, 60)));
    }
  }

  /* ── [C] 입장 차단 ─────────────────────────────────────────────── */
  blk('[C] 입장 차단 — 던전·탑·레이드·아레나·승급전·스테이지 보스');
  for (const md of LOCKED) {
    const r = now[md];
    if (r.__err) continue;
    for (const k of ENTRIES) ok(r.leak[k] === false, 'C «' + md + '» ' + k + ' 가 막혔다');
  }
  /* ⚑ 665 — 스테이지 행은 방향이 반대다. «막혔다» 를 그대로 두면 주인 지시가 게이트에 막힌다. */
  {
    const r = now.stage;
    if (r.__err) { fail++; console.log('  ❌ C «stage» 블록 예외: ' + r.__err); }
    else {
      for (const k of ENTRIES) {
        if (k === 'startBoss') ok(r.leak[k] === false, 'C «stage» startBoss 는 그대로 막힌다(이미 보스전 — 665 와 무관)');
        else ok(r.leak[k] === true, 'C «stage» ' + k + ' 가 **열린다**(665)');
      }
    }
  }
  const leakN = LOCKED.reduce((n, md) => n + (now[md].leak ? Object.values(now[md].leak).filter(Boolean).length : 0), 0);
  ok(leakN === 0, 'C-합 잠기는 네 모드에서 뚫린 자리 0 / 32 — 찍힘: ' + leakN);
  const openN = now.stage.leak ? STAGE_OPEN.filter(k => now.stage.leak[k] === true).length : -1;
  ok(openN === STAGE_OPEN.length, 'C-합 스테이지 행에서 열린 자리 ' + STAGE_OPEN.length + ' / ' + STAGE_OPEN.length + ' — 찍힘: ' + openN);

  /* ── [D] 예외 — 막히면 안 되는 자리 ─────────────────────────────── */
  blk('[D] 예외 — 클리어 직후 재입장 · 비전투 정상 입장');
  let d;
  try {
    d = await page.evaluate(() => {
      arena = null; raidOn = null; promo = null; bossOn = false; S.bossFarm = false; stageWin = false;
      dunRun = null; closeModal(); closeDungeon();
      document.getElementById('app').classList.remove('dunrun');
      S.dunTk[DUNGEONS[0].id] = 9;
      /* ① 비전투 상태의 정상 입장 */
      challengeDungeon(DUNGEONS[0]);
      const entered = !!dunRun;
      /* ② 실제 클리어 경로 — endDunRun 이 dunRun 을 비우고 31 화면을 연다 */
      endDunRun(true, false);
      const modeAfter = bossMode();
      const canAuto = dclAutoCan();
      const tk0 = S.dunTk[DUNGEONS[0].id];
      challengeDungeon(DUNGEONS[0]);             /* 31 [다음] · 339 자동이 부르는 그 함수 */
      const re = !!dunRun;
      const tk1 = S.dunTk[DUNGEONS[0].id];
      /* ③ 스테이지 보스 자동 진입(50킬 흐름)이 살아 있다 */
      dunRun = null; document.getElementById('app').classList.remove('dunrun');
      bossOn = false; S.bossFarm = false;
      startBoss();
      const bossUp = bossOn;
      /* ④ 파밍 재도전(retryBoss)도 비전투 상태에서는 산다 */
      bossOn = false; S.bossFarm = true; retryBoss();
      const retry = bossOn;
      bossOn = false; S.bossFarm = false; stageWin = false; spawnStage();
      return { entered, modeAfter, canAuto, re, tk0, tk1, bossUp, retry };
    });
  } catch (e) { d = { __err: String((e && e.message) || e).slice(0, 200) }; }
  if (d.__err) { fail++; console.log('  ❌ [D] 블록 예외: ' + d.__err); }
  else {
    ok(d.entered, 'D1 비전투 상태에서는 던전에 정상 입장한다');
    ok(d.modeAfter === '', 'D2 클리어 직후 bossMode() = "" — 찍힘: ' + JSON.stringify(d.modeAfter));
    ok(d.canAuto === true, 'D3 dclAutoCan() = true (339 카운트다운이 켜진다)');
    ok(d.re === true, 'D4 31 [다음]·339 자동이 쓰는 challengeDungeon 이 막히지 않았다');
    ok(d.tk1 === d.tk0 - 1, 'D5 재입장이 입장권을 정상 차감 ' + d.tk0 + ' → ' + d.tk1);
    ok(d.bossUp === true, 'D6 스테이지 보스 자동 진입(startBoss)은 비전투에서 산다');
    ok(d.retry === true, 'D7 파밍 [재도전](retryBoss)도 비전투에서 산다');
  }

  /* ── [E] 신호 — 레드닷·딤, 그리고 기하 Δ0px ─────────────────────── */
  blk('[E] 신호 — 탭 «모험» · 사이드 «승급전»');
  let s;
  try {
    s = await page.evaluate(() => {
      const rd = () => {
        const tab = document.querySelector('.tab[data-t="adv"]');
        const pb = document.querySelector('.side .ibtn[data-pop="promo"]');
        const R = (el) => { const b = el.getBoundingClientRect();
                            return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
        return {
          tabAlert: tab.classList.contains('alert'), tabBusy: tab.classList.contains('busy'),
          pbAlert: pb.classList.contains('on'), pbBusy: pb.classList.contains('busy'),
          tabRect: R(tab), pbRect: R(pb),
          tabIcoOp: getComputedStyle(tab.querySelector('.ti')).opacity,
          pbIcoOp: getComputedStyle(pb.querySelector('.si')).opacity,
        };
      };
      /* 「지금 들어갈 수 있다」 를 참으로 만든 비전투 상태 — 닷이 켜져야 한다.
         ⚠ 전투력은 상수로 안 박는다 — 336 처방·341(cap72) 선례대로 **훈련 상한 안에서만** 올린다
            (세이브로서 합법한 값. `trainCap()` 을 넘기면 제품이 조용히 잘라 읽는다). */
      arena = null; raidOn = null; dunRun = null; promo = null;
      bossOn = false; S.bossFarm = false; stageWin = false;
      document.getElementById('app').classList.remove('dunrun');
      S.rank = 0; S.stage = 200; S.best = 99999;
      S.trainStage = 30;
      for (const id of TRAIN_STATS) S.lv[id] = trainCap();
      for (const x of DUNGEONS) S.dunTk[x.id] = 9;
      markDirty(); uiDirty = true; drawHud(); renderUI();
      const idle = rd();
      const ready = promoReady(), cpNow = cp();
      /* ⚑ 665 — «전투 중» 표본이 **스테이지 보스전에서 던전으로** 바뀌었다. 스테이지는 이제
         열려 있어서 «신호가 따라온다» 를 재는 표본이 될 수 없다(그 자리에서 닷이 꺼지면 이번엔
         «누를 수 있는데 안 켜지는 닷» = 반대 방향의 거짓 신호다).
         ⚠ `drawHud()` 를 직접 부른다 — 사이드 알림은 rAF 루프의 drawHud 가 갱신하고
            `renderUI()` 는 그것을 부르지 않는다(호출을 빼먹으면 한 프레임 전 값을 읽는다). */
      /* ⚠ 표본은 **승급전**이다 — 던전은 `#app.dunrun` 이 탭바·사이드를 통째로 감춰
         E9·E10 의 «기하 Δ0px» 가 [0,0,0,0] 대 실측이 되어 아무것도 안 재는 항이 된다(1회차 실측). */
      startPromo();
      uiDirty = true; drawHud(); renderUI();
      const busy = rd();
      const busyMd = bossMode();
      endPromo(false); closeModal();
      bossOn = false; S.bossFarm = false; stageWin = false; spawnStage();
      uiDirty = true; drawHud(); renderUI();
      /* ⚑ 665 — 그리고 **스테이지 보스전에서는 신호가 그대로 켜져 있어야 한다**(방향이 뒤집힌 항) */
      startBoss();
      uiDirty = true; drawHud(); renderUI();
      const stageOn = rd();
      const stageMd = bossMode();
      bossOn = false; S.bossFarm = false; stageWin = false; spawnStage();
      uiDirty = true; drawHud(); renderUI();
      return { idle, busy, ready, cpNow, busyMd, stageOn, stageMd };
    });
  } catch (e) { s = { __err: String((e && e.message) || e).slice(0, 200) }; }
  if (s.__err) { fail++; console.log('  ❌ [E] 블록 예외: ' + s.__err); }
  else {
    ok(s.ready === true, 'E0 [전제] 표본이 «승급 권장 기준 충족» 이다(훈련 상한 안에서 올린 전투력 '
       + Math.round(s.cpNow) + ') — 이게 거짓이면 E3·E4 는 아무것도 안 재는 항이 된다');
    ok(s.busyMd === 'promo', "E0b [전제] «잠긴» 표본이 실제로 승급전이다 — 찍힘: " + JSON.stringify(s.busyMd));
    ok(s.stageMd === 'stage', "E0c [전제] «열린» 표본이 실제로 스테이지 보스전이다 — 찍힘: " + JSON.stringify(s.stageMd));
    ok(s.idle.tabAlert === true, 'E1 비전투: 탭 «모험» 레드닷 켜짐');
    ok(s.busy.tabAlert === false, 'E2 잠긴 전투 중: 탭 «모험» 레드닷 꺼짐(321 «누를 수 있다» 규약)');
    ok(s.idle.pbAlert === true, 'E3 비전투: 사이드 «승급전» 레드닷 켜짐');
    ok(s.busy.pbAlert === false, 'E4 잠긴 전투 중: 사이드 «승급전» 레드닷 꺼짐');
    ok(s.idle.tabBusy === false && s.busy.tabBusy === true, 'E5 탭 «모험» 딤이 잠긴 전투 중에만 붙는다');
    ok(s.idle.pbBusy === false && s.busy.pbBusy === true, 'E6 사이드 «승급전» 딤이 잠긴 전투 중에만 붙는다');
    /* ⚑ 665 — 방향이 뒤집힌 두 항. 스테이지 보스전은 «열려 있다» 이므로 신호가 살아 있어야 한다. */
    ok(s.stageOn.tabAlert === true && s.stageOn.pbAlert === true,
       'E11 스테이지 보스전: 탭 «모험»·사이드 «승급전» 레드닷이 **켜진 채**다(665)');
    ok(s.stageOn.tabBusy === false && s.stageOn.pbBusy === false,
       'E12 스테이지 보스전: 딤이 안 붙는다(665 — 실제로 누를 수 있다)');
    ok(s.stageOn.tabIcoOp === '1' && s.stageOn.pbIcoOp === '1',
       'E13 스테이지 보스전: 아이콘 밝기 1 — 찍힘: 탭 ' + s.stageOn.tabIcoOp + ' · 사이드 ' + s.stageOn.pbIcoOp);
    ok(s.busy.tabIcoOp === '0.5' && s.busy.pbIcoOp === '0.5',
       'E7 딤 값이 선례와 같은 .5 — 찍힘: 탭 ' + s.busy.tabIcoOp + ' · 사이드 ' + s.busy.pbIcoOp);
    ok(s.idle.tabIcoOp === '1' && s.idle.pbIcoOp === '1', 'E8 비전투에서는 원래 밝기 1');
    ok(JSON.stringify(s.idle.tabRect) === JSON.stringify(s.busy.tabRect),
       'E9 탭 기하 Δ0px — ' + JSON.stringify(s.idle.tabRect) + ' vs ' + JSON.stringify(s.busy.tabRect));
    ok(JSON.stringify(s.idle.pbRect) === JSON.stringify(s.busy.pbRect),
       'E10 사이드 기하 Δ0px — ' + JSON.stringify(s.idle.pbRect) + ' vs ' + JSON.stringify(s.busy.pbRect));
  }

  ok(errs.length === 0, 'E-콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await page.close(); await ctx.close();

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────── */
  blk('[R] 되돌림 시험 — 판정을 무력화하면 다시 뚫린다');
  let negLeak = -1, negOpen = -1;
  try {
    /* ⚑ 665 — 무력화 대상이 `battleBusy` 에서 **입장의 자 `battleLocked`** 로 옮겨졌다.
       `battleBusy` 만 죽여 봐야 입구는 이제 그것을 안 보므로 «되돌려도 안 뚫리는» 헛초록이 된다. */
    const neg = src.replace(/const\s+battleLocked\s*=\s*\(\)\s*=>\s*\{[^\n]*\};/,
                            "const battleLocked = () => false;")
                   .replace(/const\s+battleBusy\s*=\s*\(\)\s*=>\s*bossMode\(\)\s*!==\s*'';/,
                            "const battleBusy = () => false;");
    if (neg === src) throw new Error('되돌림 치환이 한 곳도 안 걸렸다(판정 선언을 못 찾았다)');
    fs.writeFileSync(NEG, neg);
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    await p2.goto('file://' + NEG);
    await p2.waitForTimeout(900);
    const bad = await SWEEP(p2, SETUP);
    negLeak = LOCKED.reduce((n, md) => n + (bad[md].leak ? Object.values(bad[md].leak).filter(Boolean).length : 0), 0);
    negOpen = LOCKED.reduce((n, md) => n + (bad[md].leak ? OPENERS.filter(k => bad[md].leak[k]).length : 0), 0);
    await p2.close(); await c2.close();
  } catch (e) {
    fail++; console.log('  ❌ [R] 블록 예외: ' + String((e && e.message) || e).slice(0, 200));
  } finally {
    try { fs.unlinkSync(NEG); } catch (e) { /* 이미 없으면 그만 */ }
  }
  /* 수리 전 실측(probe453, 커밋 ca9db1e 사본)은 **26 / 40** 이었다. 되돌림 사본은 그보다
     더 뚫린다(옛 3항 가드마저 없어졌으므로) — «20 이상» 으로 잡아 브라우저 편차에 안 흔들리게 한다.
     ⚑ 665 — 셈의 분모가 «잠기는 네 모드 32자리» 다(스테이지 7자리는 지금도 정상으로 열려 있다). */
  ok(negLeak >= 16, 'R1 판정을 무력화한 사본은 다시 뚫린다 — 찍힘: ' + negLeak + ' / 32 (수리 후 0)');
  ok(negOpen === 8, 'R2 그 중 «열기» 8자리(잠기는 4모드 × 2)가 전부 뚫린다 — 찍힘: ' + negOpen);

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('verify453: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})();
