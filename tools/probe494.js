#!/usr/bin/env node
/* 작업 494 재현 프로브 — «봇 플레이어 시뮬은 무엇 위에 설 수 있는가»
 *
 *   node tools/probe494.js
 *
 * 338 규칙: 처방(`tools/bot199.js` 신설)을 따르기 전에 **먼저 재현한다.**
 * 여기서 재는 것은 «버그» 가 아니라 **등재문 설계 ③ 이 서 있는 네 개의 전제**다.
 * 하나라도 무너지면 봇의 구조가 통째로 달라지므로, 코드를 쓰기 전에 못을 박는다.
 *
 *   A 시계  — 가짜 `Date` 로 «하루» 경계를 넘길 수 있는가(`today()` · `dailyCheck()` 리셋)
 *   B 시간  — rAF 루프를 세우고 `step(dt)` 를 **손으로** 굴려 전투가 진행되는가(그리기 off)
 *   C 예산  — `step(dt)` 한 번의 실비용. 30일 ≤ 2분(등재문 목표)이 «실전 표본» 으로 몇 초까지 되는가
 *   D 손잡이 — 하루 루틴 20종이 **전역 함수로 호출 가능**한가(봇이 UI 를 안 거치고 제품을 직접 부른다)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

/* 가짜 시계 — 페이지가 처음 한 줄을 돌기 전에 심는다.
   `today()`(19114)·`monthKey()`(19118) 가 `new Date()` 를 쓰므로 **생성자까지** 갈아야 한다. */
const CLOCK = (t0) => {
  const R = Date;
  window.__botT = t0;
  function F(...a){ return a.length ? new R(...a) : new R(window.__botT); }
  F.now = () => window.__botT;
  F.parse = R.parse; F.UTC = R.UTC; F.prototype = R.prototype;
  Object.defineProperty(F, 'name', { value: 'Date' });
  window.Date = F;
  window.__realDate = R;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  /* 2026-01-01 09:00 (로컬) — 날짜 경계를 넘기기 쉬운 자리 */
  const T0 = new Date(2026, 0, 1, 9, 0, 0).getTime();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.addInitScript(CLOCK, T0);
  await page.goto(URL);
  /* ⚠ 제품의 `S`·`stat`·`cp` 는 `const` 선언이라 **`window` 의 속성이 아니다**(전역 렉시컬 환경).
     `window.S` 로 물으면 영원히 undefined 다 — 반드시 **맨 이름**으로 읽는다(probe482 선례). */
  await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
  await page.waitForTimeout(800);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const blk = (name, r) => { if (r && r.__err) { ok(false, name + ' — evaluate 예외: ' + r.__err); return null; } return r; };

  /* ── A 시계 ─────────────────────────────────────────────────────────── */
  console.log('[A] 가짜 시계로 «하루» 경계를 넘길 수 있는가');
  const a = blk('A', await ev(() => {
    const d0 = today();
    const spins0 = S.daily.spins;
    S.daily.spins = 0;                       /* 오늘 다 썼다 */
    window.__botT += 24 * 3600 * 1000;       /* +1일 */
    const d1 = today();
    dailyCheck();
    return { d0, d1, spins0, spinsAfter: S.daily.spins, date: S.daily.date, rouTry: ROUL_TRY };
  }));
  if (a) {
    ok(a.d0 !== a.d1, `today() 가 시계를 따라 바뀐다: ${a.d0} → ${a.d1}`);
    ok(a.spinsAfter === a.rouTry, `dailyCheck() 가 룰렛 횟수를 리셋한다: 0 → ${a.spinsAfter} (ROUL_TRY ${a.rouTry})`);
    ok(a.date === a.d1, `S.daily.date 가 새 날짜로 갱신된다: ${a.date}`);
  }

  /* ── B 시간 ─────────────────────────────────────────────────────────── */
  console.log('[B] rAF 를 세우고 step(dt) 를 손으로 굴리면 전투가 진행되는가');
  const b = blk('B', await ev(async () => {
    /* loop() 는 자기 맨 위에서 rAF 를 다시 건다 — rAF 를 no-op 으로 갈면 다음 프레임에 멎는다 */
    window.__raf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    await new Promise(r => setTimeout(r, 120));      /* 마지막 프레임이 빠져나갈 틈 */
    const t0 = S.playtime, k0 = S.totalKills, g0 = S.gold;
    const drew = [];
    /* 그리기 off — draw() 를 안 부르는 것이 곧 «렌더 off» 다(loop 이 멎었으므로 저절로) */
    for (let i = 0; i < 600; i++) step(1 / 30);      /* 20초 */
    return { dt: 20, kills: S.totalKills - k0, gold: S.gold - g0, ptime: S.playtime - t0, drew: drew.length,
             stage: S.stage, enemies: enemies.length };
  }));
  if (b) {
    ok(b.enemies > 0, `필드에 적이 서 있다: ${b.enemies}마리`);
    ok(b.kills > 0, `20초(step 600회) 동안 처치가 일어난다: ${b.kills}킬`);
    ok(b.gold > 0, `골드가 실제로 들어온다: +${b.gold}`);
    ok(Math.abs(b.ptime) < 0.001, `S.playtime 은 loop() 몫이라 안 오른다(봇이 따로 센다): Δ${b.ptime.toFixed(3)}`);
  }

  /* ── C 예산 ─────────────────────────────────────────────────────────── */
  console.log('[C] step(dt) 실비용 — 등재문 «30일 ≤ 2분» 이 실전 표본 몇 초를 살 수 있는가');
  const c = blk('C', await ev(() => {
    const N = 6000;                                   /* 200초 분량 */
    const t0 = performance.now();
    for (let i = 0; i < N; i++) step(1 / 30);
    const ms = performance.now() - t0;
    return { N, ms, perStep: ms / N, simSecPerRealSec: (N / 30) / (ms / 1000) };
  }));
  if (c) {
    console.log(`       step 1회 ${c.perStep.toFixed(4)}ms · 실시간 배속 ×${c.simSecPerRealSec.toFixed(0)}`);
    ok(c.simSecPerRealSec > 100, `실시간 대비 ×${c.simSecPerRealSec.toFixed(0)} — 표본 60초가 ${(60 / c.simSecPerRealSec).toFixed(2)}초`);
    const budget = 90;                                /* 2분 중 전투 표본에 쓸 수 있는 몫 */
    console.log(`       ⇒ 전투 표본 예산 ${budget}초면 총 ${(budget * c.simSecPerRealSec / 60).toFixed(0)}분 분량의 «실전» 을 찍을 수 있다`);
    ok(budget * c.simSecPerRealSec > 6 * 60, `구간 표본 6개 × 60초(=360초)가 예산 안에 든다`);
  }

  /* ── D 손잡이 ───────────────────────────────────────────────────────── */
  console.log('[D] 하루 루틴이 전역 함수로 호출 가능한가 (UI 를 안 거친다)');
  const d = blk('D', await ev(() => {
    const names = ['claimAttend', 'spinRoulette', 'doSummon', 'doSummonFree', 'challengeDungeon', 'challengeTower',
                   'claimQuest', 'claimAllQuests', 'claimGuide', 'claimAllMail', 'giveReward', 'levelUpAll',
                   'trainBuy', 'runeTry', 'temperUp', 'claimColl', 'collUpAll', 'passClaimAll', 'passClaim',
                   'startPromo', 'claimOffline', 'offlineReward', 'toggleEquip', 'cosUpgrade', 'blessOn',
                   'dailyCheck', 'save', 'load', 'bonus', 'cp', 'markDirty', 'step'];
    const T = n => { try { return eval('typeof ' + n); } catch (_) { return 'undefined'; } };
    const miss = names.filter(n => T(n) !== 'function');
    const tables = ['S', 'stat', 'DUNGEONS', 'ROULETTE', 'ATTEND', 'QUESTS', 'DQUESTS', 'SKILLS', 'EQUIPS',
                    'PETS', 'RELICS', 'BLESS', 'RUNES', 'TEMPERS', 'SHOP_BOXES', 'COIN_ADS', 'enemies', 'player'];
    const missT = tables.filter(n => T(n) === 'undefined');
    return { miss, missT, n: names.length, nt: tables.length };
  }));
  if (d) {
    ok(d.miss.length === 0, `전역 함수 ${d.n}종 전부 호출 가능` + (d.miss.length ? ' — 없는 것: ' + d.miss.join(',') : ''));
    ok(d.missT.length === 0, `전역 표 ${d.nt}종 전부 읽기 가능` + (d.missT.length ? ' — 없는 것: ' + d.missT.join(',') : ''));
  }

  ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await browser.close();
  console.log(`\nPROBE494 ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
