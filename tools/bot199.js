#!/usr/bin/env node
/* 작업 494 — «봇 플레이어» 시뮬 (199 최종 밸런스의 입력표를 만드는 자)
 *
 *   node tools/bot199.js [--days=30] [--policy=diligent|casual|both] [--seeds=20] [--quick]
 *                        [--out=docs/review/199-bot-<날짜>.md] [--json=<경로>]
 *
 * ── 이 도구가 무엇인가 ────────────────────────────────────────────────────
 * 주인 지시(2026-08-31): «던전도 다 돌고 모든 보상도 다 받고 광고도 다 보고 돈 있을 때마다
 * 소환 골고루 다 뽑고 … 실제 유저가 하는 것처럼 해서 밸런스 조절». 즉 이것은 **수식 모형이
 * 아니라 플레이어**다 — `sim112`·`sim177`·`sim249` 가 «한 축» 을 푸는 계산기라면, 이 자는
 * 게임을 **실제로 켜서** 하루 루틴을 돌리고 그 결과(스테이지·전투력·재화·벽)를 적는다.
 *
 * ── 왜 «전부 실전» 이 아닌가 (probe494 [C] 의 실측이 정한 구조) ──────────
 * `step(dt)` 를 손으로 굴리면 실시간의 **×402** 로 돈다. 30일 = 2,592,000초를 전부 실전으로
 * 돌리면 **107분**이라 등재문 목표(≤ 2분)의 53배다. 그래서 등재문 설계 ③ 대로 접는다:
 *
 *   · **실전으로 도는 것** — 구간 표본(스테이지 체크포인트마다 60초) · 던전 8종 · 탑 2종.
 *     이 셋은 전투 자체가 «판정» 이라 접으면 뜻이 사라진다(던전은 15초 제한, 탑은 죽을 때까지).
 *   · **접는 것** — 스테이지 파밍. 표본에서 뽑은 **보정치 3개**(κ_dps · κ_hp · κ_gold)로
 *     «수식 DPS(`stat.dps`)» 를 실전 값으로 환산해 «한 스테이지에 몇 초» 를 계산한다.
 *
 * 보정치를 세 개로 가른 이유: 하나(κ_dps)로 뭉치면 «몹이 실제로 몇 대 맞고 죽는가»(접근·스폰
 * 대기·투사체 비행)와 «골드가 실제로 얼마 들어오는가»(몹 종류 섞임)가 같은 상수에 접혀,
 * 곡선을 하나 고치면 나머지 둘이 조용히 틀어진다.
 *
 * ── 산출 ─────────────────────────────────────────────────────────────────
 *   [A] 보정치 표     — 구간 표본 6개의 실전/수식 비
 *   [B] 1일차 분 단위 — 10분 간격 행(주인 지시 «1일차 안에도 벽이 있어야 한다»)
 *   [C] 날짜별        — 스테이지·전투력·재화 잔고·등급 분포
 *   [D] 벽            — 같은 스테이지 30분 이상 정체
 *   [E] 다이아 유입/씽크
 *   [F] 규칙 위반     — 0 이어야 결과를 믿는다(등재문 ⑦)
 *
 * ── 안 하는 것 ───────────────────────────────────────────────────────────
 * **계수는 한 줄도 안 건드린다.** 이 작업은 «봇을 만들고 현재 계수로 한 번 돌려 표를 남기는
 * 것까지» 이고 조정은 199 몫이다(등재문 마지막 줄).
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — 페이지 안 예외는 즉사시키지 말고 그 블록만 빨갛게(여기서는 `viol` 에 적는다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* ---------------- 인자 ---------------- */
const ARG = {};
process.argv.slice(2).forEach(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) ARG[m[1]] = m[2] === undefined ? true : m[2];
});
const DAYS    = Math.max(1, parseInt(ARG.days || (ARG.quick ? 3 : 30), 10));
const SEEDS   = Math.max(1, parseInt(ARG.seeds || (ARG.quick ? 3 : 20), 10));
const POLICY  = String(ARG.policy || 'both');
const POLS    = POLICY === 'both' ? ['diligent', 'casual'] : [POLICY];
const STAMP   = new Date().toISOString().slice(0, 10);
const OUT     = ARG.out ? path.resolve(ROOT, String(ARG.out))
                        : path.join(ROOT, 'docs', 'review', `199-bot-${STAMP}.md`);

/* ---------------- 가짜 시계 ----------------
   `today()`(index.html 19114)·`monthKey()`(19118)이 `new Date()` 를 쓰므로 **생성자까지** 간다.
   probe494 [A] 가 이 한 줄로 «하루» 경계를 넘길 수 있음을 못박았다. */
const CLOCK = (t0) => {
  const R = Date;
  window.__botT = t0;
  function F(...a) { return a.length ? new R(...a) : new R(window.__botT); }
  F.now = () => window.__botT;
  F.parse = R.parse; F.UTC = R.UTC; F.prototype = R.prototype;
  Object.defineProperty(F, 'name', { value: 'Date' });
  window.Date = F;
};

/* ---------------- 시드 고정 난수 ----------------
   ⚑ **`BOT` 안에서 심으면 늦다.** 6회차 게이트 [6] 이 그것을 잡았다 — 같은 시드 두 번이
   s290 / s291 로 갈렸다. 봇이 붙기 전에 이미 `load()`·`buildFloor()`·`spawnStage()` 가
   `Math.random()` 을 수십 번 쓰고, 그 몫이 **첫 파도의 적 좌표**로 남아 있기 때문이다.
   그래서 난수는 페이지가 첫 줄을 돌기 전에(=`addInitScript`) 심는다. */
const SEEDRNG = (seed) => {
  /* ⚑ **rAF 도 여기서 끊는다.** 부팅이 끝나고 봇이 `freeze()` 를 부르기까지의 사이에 실제
     프레임이 «몇 장» 도는지는 기계 사정이라 매 실행 달랐다 — 그 몇 장이 첫 파도의 좌표와
     난수 스트림을 밀어 같은 시드가 s43 / s44 로 갈렸다(6회차 게이트 [6]·[R] 이 잡은 자리).
     `loop()` 는 자기 맨 위에서 rAF 를 다시 걸므로, 처음부터 no-op 이면 **한 장도 안 돈다**.
     `step(dt)` 는 봇이 손으로 굴리므로 잃는 것이 없다(그리기는 어차피 안 쓴다). */
  window.requestAnimationFrame = () => 0;
  let s0 = (seed >>> 0) || 1;
  window.__setSeed = (n) => { s0 = (n >>> 0) || 1; };
  Math.random = function () {                       /* xorshift32 — 재현 가능 */
    s0 ^= s0 << 13; s0 >>>= 0;
    s0 ^= s0 >> 17;
    s0 ^= s0 << 5;  s0 >>>= 0;
    return s0 / 4294967296;
  };
};

/* ==========================================================================
   페이지 안에서 도는 봇 본체
   ========================================================================== */
/* eslint-disable no-undef */
const BOT_SRC = function (cfg) {
  /* 제품의 `S`·`stat`·`cp` 는 `const` 선언이라 window 속성이 아니다 — 맨 이름으로 읽는다.
     반대로 `function` 선언(step·giveReward…)은 window 속성이라 감쌀 수 있다(κ 측정이 그것을 쓴다). */
  const B = {
    viol: [],            /* 규칙 위반 — 0 이어야 결과를 믿는다 */
    warn: [],            /* 경로가 없어 대체한 자리(구조 변화 감지용) */
    cal: null,           /* 보정치 */
    rows: [],            /* 분/일 단위 행 */
    diaIn: {},           /* 다이아 유입 출처별 */
    diaOut: {},          /* 다이아 씽크 */
    seedN: 0,
    cnt: { dunRun: 0, dunReplay: 0, dunClear: 0, towerRun: 0, towerFold: 0, towerUp: 0, simSec: 0, simN: 0 },
  };
  window.BOT = B;

  /* ── 시드 (등재문 ④ — 시드 20개) ─────────────────────────────────────
     난수 자체는 `SEEDRNG` 가 **부팅 전에** 이미 심었다(위 주석). 여기서는 필요할 때
     같은 생성기를 다시 세우기만 한다 — 부팅이 쓴 몫까지 시드에 포함되는 것이 맞다. */
  B.setSeed = (n) => { if (typeof window.__setSeed === 'function' && n != null) window.__setSeed(n); };

  /* ── rAF 정지 + «무대장치» 끄기 (probe494 [B]) ───────────────────────── */
  /* ⚑ 4회차 실측 — 예산을 먹던 것은 전투가 아니라 **`save()`** 였다. `trainBuy`·`applyBuy`·
     `giveReward` 가 한 번 팔릴 때마다 `save()` 를 부르고, 그것이 세이브 전체를 `JSON.stringify`
     해 `localStorage` 에 쓴다 — 봇은 그 함수를 분당 수천 번 지난다. 봇에게 «디스크» 는 아무
     뜻도 없으므로(한 컨텍스트가 곧 한 플레이어다) 시각 갱신만 남기고 직렬화를 끊는다.
     같은 이유로 순수 UI 함수(토스트·연출·재렌더)도 끈다 — 그리기는 loop() 와 함께 이미 멎었지만
     이 넷은 **손잡이 안에서 직접** 불리므로 rAF 를 세워도 계속 돈다.
     ⚠ 끄는 것은 **상태를 안 바꾸는 함수만**이다. `markDirty`·`dailyCheck`·`giveReward` 처럼
       판정·재화가 걸린 것은 한 줄도 안 건드린다. */
  B.freeze = () => {
    window.requestAnimationFrame = () => 0;
    window.save = function () { S.time = Date.now(); };
    /* ⚑ 5회차 프로파일 — 하루의 절반을 **유물 소환**이 먹고 있었다(10일 24.5초/47초). 전투가 아니라
       `summonRelic`(28743)이 매 회 `renderRelw()` 로 격자를 통째로 다시 그리고 `querySelector` 로
       칸을 찾아 `fxUpOk` 를 걸기 때문이다 — 봇은 그 함수를 하루 수천 번 지난다.
       ⚠ 끄는 것은 **순수 UI 함수만**이다. 재화·판정·상태를 한 줄이라도 바꾸는 함수는 여기 없다
         (`markDirty`·`giveReward`·`summonRelic` 본체·`openDunClear` 는 그대로 둔다 —
          마지막 것은 339 연속 도전이 읽는 상태를 세운다). */
    ['notify', 'fxToast', 'fxReward', 'fxAt', 'fxPop', 'fxFlash', 'fxCheck', 'fxBurst', 'fxFly', 'fxUpOk',
     'renderUI', 'renderRelw', 'renderCoinPage', 'renderTrain', 'renderPcb', 'renderBless', 'drawHud',
     'syncSummonBtns', 'showSummonResult', 'hbBeat', 'openStatUp', 'openUpAll', 'showMsg'].forEach((n) => {
      if (typeof window[n] === 'function') window[n] = function () {};
    });
    /* ⚑ 8회차 — 던전 한 판이 **0.40초**(≈ 23 시뮬초)나 걸렸다. 판 수가 아니라 **`step()` 한 번이
       고스테이지에서 8배 느려서**다: 처치마다 `burst()` 가 파티클 수십 개를 만들고, 그것들을
       그 뒤 모든 프레임이 다시 굴린다(그리지도 않는데). 파티클은 **판정에 한 줄도 안 걸린다** —
       피해는 `hitEnemy`/`areaDamage` 가 따로 한다. 그래서 «만드는 쪽» 을 끊는다.
       ⚠ `boomFx`·`chainBoomFx` 는 **안 끊는다** — 연쇄·범위 계열이 그 안에서 대상을 고른다. */
    /* ⚠ `fxRing`·`fxRingFlat` 는 **못 끊는다** — 호출부가 `rings[rings.length-1]` 로 방금 넣은 고리를
       되받아 표식을 단다(`castSkill`, 21250). 끊으면 그 줄이 즉사한다. 실제로 그렇게 죽여 봤다. */
    ['burst', 'debris', 'dmgNum'].forEach((n) => {
      if (typeof window[n] === 'function') window[n] = function () {};
    });
  };

  /* ── 시계 ────────────────────────────────────────────────────────────── */
  const MIN = 60000;
  B.now = () => window.__botT;
  B.advance = (ms) => { window.__botT += ms; };

  /* ── 피해 감시 — `hitEnemy` 는 함수 선언이라 window 속성이다 ─────────── */
  let dmgAcc = 0, killAcc = 0, hpRat = 0, goldRat = 0;
  const rawHit = window.hitEnemy, rawKill = window.killEnemy;
  window.hitEnemy = function (e, dmg, crit) {
    dmgAcc += Math.min(dmg, e ? e.hp : dmg);        /* 넘치는 피해는 «넣은 피해» 가 아니다 */
    return rawHit.apply(this, arguments);
  };
  /* ⚑ 비(比)를 **처치 순간의 스테이지**로 나눠 쌓는다. 절대값으로 쌓아 두고 나중에 나누면,
     표본 도중 스테이지가 오른 순간(보스 격파) 분모가 통째로 틀어진다 — 2회차에 κ_gold 가
     221 로 나온 것이 정확히 그것이었다(s10 으로 나눴는데 실제로는 s40 대에서 번 골드다). */
  window.killEnemy = function (e) {
    const s = S.stage, boss = e && (e.tk === 'boss' || e.tk === 'dunboss');
    const g0 = S.gold, gm = stat.goldMul;
    const r = rawKill.apply(this, arguments);
    /* ⚑ `stat.goldMul` 을 **나눠서** 쌓는다 — 그것은 «전장의 모양» 이 아니라 **플레이어 스탯**이다
       (`stat.goldMul = U.gold.val(lv('gold')) * mulGold()`, 19849). 3회차에 이걸 안 나눠 κ_gold 가
       s200 에서 383 이 됐고, 접기 쪽에서 goldMul 을 **한 번 더** 곱해 골드가 제곱으로 튀었다. */
    if (e && !boss) { killAcc++; hpRat += (e.max || 0) / eHp(s); goldRat += (S.gold - g0) / (eGold(s) * (gm || 1)); }
    return r;
  };
  const meterReset = () => { dmgAcc = killAcc = hpRat = goldRat = 0; };

  /* ── try 래퍼 — 한 손잡이가 없어져도 봇 전체가 안 죽는다(LESSONS 319) ── */
  B.prof = {};
  const T = (tag, fn) => {
    const t0 = performance.now();
    try { return fn(); }
    catch (e) { B.warn.push(tag + ': ' + String(e && e.message || e).slice(0, 120)); return null; }
    finally { B.prof[tag] = (B.prof[tag] || 0) + (performance.now() - t0); }
  };

  /* ── 재화 장부 ───────────────────────────────────────────────────────── */
  let diaPrev = 0;
  const ledger = (src) => {
    const d = S.dia - diaPrev; diaPrev = S.dia;
    if (d > 0) B.diaIn[src] = (B.diaIn[src] || 0) + d;
    else if (d < 0) B.diaOut[src] = (B.diaOut[src] || 0) - d;
  };
  B.ledgerSync = () => { diaPrev = S.dia; };
  B.ledger = ledger;

  /* ======================================================================
     1. 보정치 — 구간 표본 (실전 60초)
     ====================================================================== */
  /* 재는 것 다섯:
       κ_dps  = 실전 초당 유효 피해 / `stat.dps`      («수식 DPS 를 실전으로 환산»)
       κ_hp   = 실전 처치 몹 평균 체력 / `eHp(s)`     («몹 섞임» 을 한 수로)
       κ_gold = 실전 킬당 골드 / `eGold(s)`           («골드 배수» 를 한 수로)
       κ_boss = 실전 보스 DPS / `stat.dps`            (보스는 «쫓아다니지 않는다» — 몹과 다른 값이다)
       tFloor = 처치 간격 하한(초)                    («화력이 무한해도 이보다 빨리는 못 잡는다»)
     ⚑ **tFloor 가 없으면 이 시뮬은 통째로 거짓말이다.** 1회차 모형은 `tKill = mobHp/dps` 라
       화력이 커지면 처치 간격이 0 으로 갔고, 그 결과 «분당 스테이지» 가 내가 넣은 인공 상한
       (1개/분)에만 걸려 있었다. 실측은 그 반대를 말한다 — 갓 시작한 캐릭터가 s1 에서 이미
       60초에 62마리(0.97초/마리)이고, 화력을 1,000배로 올려도 그 값은 거의 안 내려간다.
       하한을 정하는 것은 화력이 아니라 **스폰·접근·이동**이다.
     ⚑ **표본은 «그 구간에 어울리는 캐릭터» 로 찍는다.** 1회차는 갓 시작한 캐릭터로 s200 을
       재서 «60초에 0마리» = κ_hp·κ_gold 가 통째로 null 이었다. 체크포인트마다 골드를 부어
       «보스를 제한 시간의 절반에 잡는» 화력까지 올린 뒤 잰다 — 세 비(比)는 스탯이 아니라
       «전장의 모양» 을 재는 값이므로, 그 모양이 성립하는 대역에서 재야 뜻이 있다.
     ⚠ 이 부풀리기는 **보정치 전용 컨텍스트**에서만 일어난다(Node 쪽이 페이지를 따로 연다).
       봇 본 실행은 새 세이브에서 시작한다. */
  /* ⚠ **한 번에 다 사면 안 된다.** 2회차는 `S.gold = 1e100` 을 붓고 «살 수 있는 만큼» 을
     한 호출에 샀는데, MAX 수량이라 첫 바퀴에 목표를 **1,500만 배** 넘겨 버렸다(s10 표본의
     `stat.dps` 가 1.9e9). 한 레벨씩 올려 목표를 처음 넘는 자리에서 멈춘다 — 과충은 최대 한 바퀴. */
  const pumpTo = (target) => {
    const qty0 = S.buyQty;
    S.buyQty = 1;
    let guard = 0;
    while (stat.dps < target && guard++ < 4000) {
      let bought = false;
      for (const u of UPG) {
        const bi = buyInfo(u);
        if (!bi || !bi.n) continue;
        S.gold = Math.max(S.gold, bi.cost);
        applyBuy(u, bi.n, bi.cost); markDirty(); bought = true;
      }
      for (const id of TRAIN_STATS) {
        const bi = trainBuyInfo(id);
        if (!bi || bi.full || !bi.n) continue;
        S.gold = Math.max(S.gold, bi.cost);
        if (trainBuy(id)) bought = true;
      }
      if (typeof trainReady === 'function' && trainReady()) { T('cal.trainUp', () => trainUp()); bought = true; }
      if (!bought) break;                             /* 더 올라갈 손잡이가 없다 */
    }
    S.buyQty = qty0;
    S.gold = 0;
    return stat.dps;
  };
  /* 몹 표본은 **파밍 상태**(`S.bossFarm = true`)에서 찍는다 — 제품이 그 상태에서 보스를 안 부르므로
     60초 표본 도중에 스테이지가 오르지 않는다(2회차에 표본이 오염된 자리). */
  const sampleMobs = (s, sec) => {
    S.stage = s; S.bossFarm = true;
    T('cal.spawn', () => { bossOn = false; enemies.length = 0; spawnStage(); });
    for (let i = 0; i < 150; i++) step(1 / 30);        /* 준비 5초 — 첫 스폰·접근은 버린다 */
    meterReset();
    const n = Math.round(sec * 30);
    for (let i = 0; i < n; i++) step(1 / 30);
    return { dmg: dmgAcc, kills: killAcc, hpRat, goldRat };
  };
  /* ⚠ 보스는 **스폰 큐를 지나 선다**(`startBoss` 는 예약만 한다 · 425 등장 국면까지 있다).
     3회차는 예약 직후 «보스가 없다» 를 종료로 읽어 전 행이 0.00초였다 — 먼저 «섰다» 를 기다린 뒤
     그 프레임에서 계량을 연다. */
  const sampleBoss = (s) => {
    T('cal.bossSpawn', () => { enemies.length = 0; S.bossFarm = false; bossOn = false; startBoss(); });
    const cap = Math.round((BOSS_SEC * 4 + 12) * 30);
    let f = 0, seen = false, f0 = 0;
    for (; f < cap; f++) {
      step(1 / 30);
      const on = enemies.some(e => e.tk === 'boss' && e.born >= 0.3);
      if (on && !seen) { seen = true; f0 = f; meterReset(); }
      else if (seen && !on) break;
    }
    const sec = seen ? (f - f0) / 30 : 0;
    return { sec, dmg: dmgAcc, killed: seen && f < cap };
  };

  B.calibrate = (stages, sec) => {
    const out = [];
    let kGuess = 1;
    for (const s of stages) {
      S.stage = s; S.best = Math.max(S.best, s);
      const target = eHp(s) * ETYPE.boss.hp * bossGateHp(s) / (BOSS_SEC * 0.5) / kGuess;
      const dpsNow = pumpTo(target);
      const m = sampleMobs(s, sec);
      const b = sampleBoss(s);
      const kDps = (m.dmg / sec) / (dpsNow || 1);
      if (m.kills > 3) kGuess = kDps;                 /* 다음 체크포인트의 목표에 되먹인다 */
      out.push({
        s, sec, formDps: dpsNow, realDps: m.dmg / sec, kDps,
        kills: m.kills,
        tKill: m.kills ? sec / m.kills : null,
        kHp: m.kills ? m.hpRat / m.kills : null,
        kGold: m.kills ? m.goldRat / m.kills : null,
        bossSec: b.sec, bossKilled: b.killed,
        kBoss: b.sec > 0 ? (b.dmg / b.sec) / (dpsNow || 1) : null,
      });
    }
    /* ── 처치 간격 하한 — 화력을 대역의 1,000배로 올려 «스폰·접근» 만 남긴다 ── */
    S.stage = 1;
    pumpTo(eHp(1) * ETYPE.boss.hp / (BOSS_SEC * 0.5) * 1000);
    const f = sampleMobs(1, 30);
    const tFloor = f.kills ? 30 / f.kills : 1;

    const avg = (k) => { const v = out.map(o => o[k]).filter(x => x != null && isFinite(x) && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 1; };
    B.cal = { rows: out, kDps: avg('kDps'), kHp: avg('kHp'), kGold: avg('kGold'), kBoss: avg('kBoss'),
              tFloor, floorKills: f.kills };
    return B.cal;
  };

  /* ======================================================================
     2. 접힌 파밍 — 1분 틱
     ====================================================================== */
  /* 한 틱이 하는 일: (a) 이번 분의 처치·골드 (b) 50킬 차면 보스 판정 (c) 강화 한 바퀴.
     보스 판정이 이 게임의 «벽» 그 자체다 — `BOSS_SEC` 안에 못 잡으면 스테이지가 안 오른다.
     ⚑ 스테이지를 올리는 것은 이 함수뿐이고, 「같은 스테이지에 30분」 이 곧 벽 1개다. */
  const MOB_N = ENEMY_COUNT;
  B.botKills = 0;                                       /* 이번 스테이지에서 잡은 잡몹 수(제품 `killed` 자리) */
  /* 보정치는 **한 수가 아니라 곡선**이다 — 표본 6개 사이를 log(스테이지)로 선형 보간한다.
     3회차 표가 그것을 강제했다: κ_dps 가 s1 0.50 → s100 0.78 → s200 2.07 로 단조로 움직인다
     (빌드가 커질수록 `stat.dps` 가 실전을 **과소**평가한다 — 치명타·펫이 그 식 밖이다).
     평균 한 수로 접으면 저구간은 2배 빠르고 고구간은 3배 느린 봇이 된다. */
  const kAt = (key, s) => {
    const rows = B.cal.rows.filter(r => r[key] != null && isFinite(r[key]) && r[key] > 0);
    if (!rows.length) return B.cal[key] || 1;
    if (s <= rows[0].s) return rows[0][key];
    for (let i = 1; i < rows.length; i++) {
      if (s <= rows[i].s) {
        const a = rows[i - 1], b = rows[i];
        const t = (Math.log(s) - Math.log(a.s)) / (Math.log(b.s) - Math.log(a.s));
        return a[key] + (b[key] - a[key]) * t;
      }
    }
    return rows[rows.length - 1][key];
  };
  B.kAt = kAt;
  B.farmMinute = () => {
    const c = B.cal;
    const dpsMob  = Math.max(1e-9, stat.dps * kAt('kDps', S.stage));
    const dpsBoss = Math.max(1e-9, stat.dps * kAt('kBoss', S.stage));
    let left = 60, kills = 0, cleared = 0, tries = 0;
    while (left > 1e-6 && tries++ < 200) {
      const s = S.stage;
      const mobHp = eHp(s) * kAt('kHp', s);
      /* ⚑ 하한 — 화력이 아무리 커도 «스폰·접근» 아래로는 못 내려간다(보정치 tFloor) */
      const tKill = Math.max(c.tFloor, mobHp / dpsMob);
      const need = MOB_N - B.botKills;
      const canKill = Math.min(Math.max(0, need), Math.floor(left / tKill));
      if (canKill > 0) {
        kills += canKill; left -= canKill * tKill;
        B.botKills += canKill;
        S.gold += canKill * eGold(s) * kAt('kGold', s) * stat.goldMul;
      }
      if (B.botKills < MOB_N) break;                    /* 남은 시간은 다음 마리 몫 — 반올림 손실은 다음 분으로 */
      /* ── 보스 판정. 이 게임의 «벽» 은 전부 여기서 선다 ── */
      const bossHp = eHp(s) * ETYPE.boss.hp * bossGateHp(s);
      const tBoss = bossHp / dpsBoss;
      if (tBoss <= BOSS_SEC) {
        left -= tBoss;
        B.botKills = 0;
        S.gold += eGold(Math.max(1, s - 1)) * 12 * stat.goldMul;   /* 제품 `bonusG`(22250)와 **같은 식** */
        S.stage = s + 1; if (S.stage > S.best) S.best = S.stage;
        S.bossFarm = false; cleared++;
        continue;                                       /* 남은 시간으로 다음 스테이지를 계속 민다 */
      }
      /* 실패 — 제품 `failBoss` 와 같이 파밍 상태로 돌아간다.
         ⚑ 남은 시간을 **버리지 않는다.** 주인이 확인한 재도전 규칙이 «지면 잡몹 파밍으로 골드를
            모아 강화 한 바퀴 돌린 뒤 재도전» 이므로, 벽 안에서도 골드는 계속 들어온다.
            여기서 끊으면 벽이 «수입 0» 이 되어 영원히 안 뚫리는 가짜 하드락이 된다. */
      left -= BOSS_SEC;
      const farmN = Math.max(0, Math.floor(left / tKill));
      if (farmN > 0) { kills += farmN; S.gold += farmN * eGold(s) * kAt('kGold', s) * stat.goldMul; }
      B.botKills = Math.max(0, MOB_N - 1);              /* 재도전은 «한 마리만 더» 로 열린다 */
      S.bossFarm = true;
      break;                                            /* 이번 분은 여기까지 — 강화 한 바퀴 뒤에 다시 민다 */
    }
    return { kills, cleared };
  };

  /* ======================================================================
     3. 하루 루틴 — 손잡이들
     ====================================================================== */
  const R = {};

  /* ⚑ 199 8회차(정정8) — 출석 **1일차 «환영» 칸**은 498 의 첫날 100만 축에 속한 값이고
     7회차(§7-3)가 제품에서 «첫 순환 1회성» 으로 굳혔는데(`attRow`), 장부에서는 아직 «출석» 한
     바구니에 섞여 **지속 수급 분모 안**에 있었다. ④ 도달일이 그만큼 후하게 나온다.
     ⇒ 첫 순환의 1일차 수령만 따로 적는다(`S.att.n === 0` 인 단 한 번 — 8일차는 이미 380 곡선). */
  R.attend = () => T('출석', () => {
    const before = S.dia, first = !((S.att && S.att.n) > 0);
    claimAttend(null);
    ledger(first ? '출석(1일차 환영)' : '출석');
    return S.dia - before;
  });
  R.mail   = () => T('우편', () => { claimAllMail(); ledger('우편'); });
  R.quest  = () => T('퀘스트', () => { claimAllQuests(); ledger('퀘스트'); });
  R.guide  = () => T('가이드미션', () => { for (let i = 0; i < 12; i++) { const b = S.dia; claimGuide(); if (S.dia === b) break; } ledger('가이드미션'); });
  R.pass   = () => T('패스', () => { for (const k of Object.keys(PASS_TABS || {})) { T('패스:' + k, () => passClaimAll(k)); } ledger('패스'); });

  /* 광고 상품 — 클릭 핸들러 안에 있어 부를 함수가 없다. 지급 자체는 `giveReward` 한 곳을
     지나므로 그 함수로 넣고 잔여만 제품과 같은 키에 적는다(경로 대체 1건으로 기록). */
  R.ads = () => T('광고상품', () => {
    if (!S.daily.adBuy) S.daily.adBuy = {};
    let n = 0;
    for (const a of COIN_ADS) {
      let left = adLeft(a);
      while (left > 0) {
        S.daily.adBuy[a.id] = --left;
        if (a.r.goldMul) S.gold += Math.round(eGold(S.stage) * a.r.goldMul);
        else giveReward(a.r);
        n++;
      }
    }
    ledger('광고상품');
    return n;
  });

  R.roulette = () => T('룰렛', () => {
    let n = 0;
    /* 181 — 팝업이 닫혀 있으면 `roulSpinTo` 가 «지급만 하고» 끝난다(rAF 없이도 돈다) */
    while (S.daily.spins > 0 && n < 20) { const b = S.daily.spins; spinRoulette(); if (S.daily.spins === b) break; n++; }
    ledger('룰렛');
    return n;
  });

  /* 던전·탑 — **실전**. 제한 시간이 곧 판정이라 접으면 뜻이 사라진다. */
  /* ⚑ 6회차 — **접기 주기를 상수로 두면 예산이 «봇이 얼마나 세냐» 를 따라 터진다.**
     5회차의 `FOLD_STEP = 10` 은 30일 실행에서 시드 하나에 4분이 걸렸다(s540 · 벽 21) —
     전투력이 커질수록 도는 판이 늘어 실전 판도 같은 비율로 늘기 때문이다.
     그래서 주기가 아니라 **«실전은 하루 던전·탑마다 REAL_CAP 판까지» 라는 상한**을 쓴다.
     남은 판은 그 실전 판의 결과(클리어/실패)가 유지되는 동안 제품 보상표로 접는다.
     ⚠ 상한을 낮추면 «클리어하다가 어느 층에서 막히는가» 의 해상도가 떨어진다 — 3 은
       «처음·중간·끝» 을 보는 최소값이다. */
  const REAL_CAP = 2;             /* 던전·탑마다 하루 실전으로 도는 판 수 */
  /* ⚑ 8회차 — 실전 판 하나가 **평균 15.5 시뮬초 · 0.6 실초**다(30일에 351판 = 251초). 고스테이지에서
     `step()` 한 번이 저스테이지의 **20배**로 느려지기 때문인데(관통·투사체·펫·장판이 전부 그 프레임에 있다),
     이것은 «판을 줄여서» 가 아니라 «**결과가 이미 정해진 판을 안 돌아서**» 줄여야 한다.
     ⇒ 같은 던전이 실전으로 **연속 STREAK_OK 번** 클리어하면 그 던전은 «지금 화력으로는 확실하다» 로 보고
       `RECHECK_EVERY` 일마다만 실전으로 재확인한다. 실패하면 연속 기록이 0 으로 돌아가 다음 날 다시 실전이다.
     ⚠ **벽은 언제나 실전이 판정한다** — 접기는 «직전 실전 판이 클리어했다» 를 전제로만 열린다. */
  const STREAK_OK = 3, RECHECK_EVERY = 4;
  B.streak = {};
  const skipReal = (key, day) => (B.streak[key] || 0) >= STREAK_OK && (day % RECHECK_EVERY !== 0);
  /* ⚑ **«들어갈까» 는 제품이 이미 답을 갖고 있다.** 03 던전 카드가 `ok = cp() >= d.req(f)`(26346)로
     칠해지고 04 세부도 같은 값을 쓴다 — 즉 요구 전투력에 못 미치면 **플레이어가 애초에 안 들어간다.**
     8회차까지 봇은 그것을 안 보고 매일 들어가 15초를 다 쓰고 졌다(30일에 실전 348판 · 그중 대부분이
     같은 층의 반복 실패 = 257초). 판을 줄이는 것이 아니라 **안 들어갈 판을 안 들어가는 것**이 답이다.
     ⚠ 이것은 근사가 아니다 — 제품이 화면에 칠하는 그 조건 그대로다. 남는 표는 버려지지 않고 쌓인다(204). */
  const canEnter = (d, f) => { try { return typeof d.req !== 'function' || cp() >= d.req(f); } catch (_) { return true; } };
  const TOWER_DAY_MAX = 60;       /* 탑은 입장권이 없다 — «하루에 오르는 층» 의 상한을 봇이 정한다 */
  const runBattle = (maxSec, done) => {
    const N = Math.round(maxSec * 30);
    for (let i = 0; i < N; i++) { step(1 / 30); if (done()) { B.cnt.simSec += i / 30; B.cnt.simN++; return i / 30; } }
    B.cnt.simSec += maxSec; B.cnt.simN++;
    return maxSec;
  };
  /* ⚑ **입장권이 많으면 실전만으로는 예산이 안 선다.** 490 이 다이아→입장권 교환을 1,000 으로
     열어 둔 뒤로 부지런한 봇은 하루 150장 넘게 산다 — 한 판 20초씩 실전으로 돌리면 30일 1시드가
     2시간이다(4회차 실측: 3일 1시드 56.6초). 그래서 **던전마다 하루 한 판만 실전으로 돌고,
     그 판이 층을 못 올렸으면(= 같은 층·같은 전투력이라 결과가 같다) 나머지 표는 그 판의
     재화 델타를 그대로 복제**한다. 층이 올랐으면 판이 달라졌으므로 다시 실전으로 돈다.
     ⚠ 복제 상한(`REPLAY_CAP`)을 두는 이유는 예산이 아니라 **자기 검증**이다 — 상한에 닿았다는
       것은 «봇이 하루에 이만큼 도는 것이 정상인가» 를 199 가 봐야 한다는 뜻이라 표에 적는다. */
  /* ⚑ **입장권이 많으면 실전만으로는 예산이 안 선다.** 490 이 다이아→입장권 교환을 1,000 으로
     열어 둔 뒤로 부지런한 봇은 하루 150장 넘게 사고, 지금 곡선에서는 **그 판을 거의 다 클리어한다**
     (4회차 실측: 3일에 던전 472판 중 467판 클리어 = 3일 1시드 52초 · 30일 20시드면 2시간).
     그래서 «실전 한 판 → 그 결과가 유지되는 동안 수식으로 접기» 를 던전에도 그대로 쓴다:
       · 실전 한 판을 돌아 **클리어했는가**를 본다.
       · 클리어했으면 다음 `FOLD_STEP−1` 판은 **제품의 보상표 `d.rw(f)` 로 직접** 정산한다
         (근사가 아니다 — `finishDunRun`(25277)이 하는 일이 정확히 «층 +1 · `giveReward(d.rw(f))`» 다).
       · `FOLD_STEP` 판마다 다시 실전으로 돌아 «아직도 클리어하는가» 를 확인한다.
         이 재확인이 없으면 요구 전투력(`d.req(f)`)이 봇을 앞지른 뒤에도 영원히 클리어한다.
       · 실전 판이 **실패**하면 접지 않는다 — 남은 표는 그대로 두고 그 던전을 접는다.
     ⚠ 클리어를 못 하는 구간에서는 접기가 아예 안 열리므로 «벽» 은 언제나 실전이 판정한다. */
  R.dungeons = (day) => T('던전', () => {
    let real = 0, fold = 0;
    const lv0 = DUNGEONS.reduce((n, d) => n + ((S.dun && S.dun[d.id]) | 0), 0);
    for (const d of DUNGEONS) {
      /* 확실한 던전은 실전을 건너뛰고 오늘 표를 통째로 접는다 */
      if (skipReal('d:' + d.id, day) && (S.dunTk[d.id] | 0) > 0) {
        let n = S.dunTk[d.id] | 0;
        while (n-- > 0 && canEnter(d, S.dun[d.id])) { const f = S.dun[d.id]; S.dunTk[d.id]--; S.dun[d.id]++; T('던전:접기', () => giveReward(d.rw(f))); fold++; }
        continue;
      }
      let shots = 0;
      while ((S.dunTk[d.id] | 0) > 0 && shots < REAL_CAP) {
        const tk0 = S.dunTk[d.id] | 0, f0 = (S.dun && S.dun[d.id]) | 0;
        if (!canEnter(d, f0)) break;                        /* 요구 전투력 미달 — 플레이어는 안 들어간다 */
        challengeDungeon(d);
        if ((S.dunTk[d.id] | 0) === tk0) break;             /* 잠김·전투 중 — 더 못 돈다 */
        real++; shots++;
        runBattle(DUN_SEC + 8, () => !dunRun);
        if (dunRun) { T('던전:포기', () => { if (typeof endDunRun === 'function') endDunRun(); }); }
        if (((S.dun && S.dun[d.id]) | 0) === f0) { B.streak['d:' + d.id] = 0; break; }   /* 실패 — 여기가 한계다 */
        B.streak['d:' + d.id] = (B.streak['d:' + d.id] || 0) + 1;
        /* 클리어했다 — 남은 표를 «다음 실전 판까지» 만큼 제품 보상표로 접는다 */
        let n = Math.min(Math.ceil((S.dunTk[d.id] | 0) / (REAL_CAP - shots + 1)), S.dunTk[d.id] | 0);
        while (n-- > 0 && canEnter(d, S.dun[d.id])) {
          const f = S.dun[d.id];
          S.dunTk[d.id]--; S.dun[d.id]++;
          T('던전:접기', () => giveReward(d.rw(f)));
          fold++;
        }
      }
    }
    const clears = DUNGEONS.reduce((n, d) => n + ((S.dun && S.dun[d.id]) | 0), 0) - lv0;
    B.cnt.dunRun += real; B.cnt.dunReplay += fold; B.cnt.dunClear += clears;
    ledger('던전');
    return { real, fold, clears };
  });
  /* 탑도 던전과 **같은 접기**를 쓴다(`challengeTower` 는 `startDunRun` 을 탄다 — 24780).
     ⚠ 진행 키가 다르다: `finishDunRun`(25284)은 탑에서 `towerSetFloor(d, f+1)` 를 쓰고
       던전에서만 `S.dun[id]++` 를 쓴다. 접기도 그 함수를 그대로 따라가야 한다. */
  R.towers = (day) => T('탑', () => {
    let real = 0, up = 0, fold = 0;
    for (const id of ['tower', 'tower2']) {
      const t = towerById(id);
      if (skipReal('t:' + id, day)) {
        for (let k = 0; k < TOWER_DAY_MAX && canEnter(t, towerFloor(t)); k++) {
          const f = towerFloor(t);
          T('탑:접기', () => { towerSetFloor(t, f + 1); giveReward(t.rw(f)); });
          up++; fold++;
        }
        continue;
      }
      let shots = 0, climbed = 0;
      while (shots < REAL_CAP && climbed < TOWER_DAY_MAX) {
        const lv0 = S[id] | 0;
        if (!canEnter(t, towerFloor(t))) break;             /* 요구 전투력 미달 — 안 들어간다 */
        T('탑:' + id, () => challengeTower(id));
        if (!dunRun) break;                                 /* 잠김·전투 중 — 못 들어갔다 */
        real++; shots++;
        runBattle(DUN_SEC + 8, () => !dunRun);
        if (dunRun) T('탑:포기', () => { if (typeof endDunRun === 'function') endDunRun(); });
        if ((S[id] | 0) === lv0) { B.streak['t:' + id] = 0; break; }   /* 못 올라갔다 = 그 유저의 탑 한계 */
        B.streak['t:' + id] = (B.streak['t:' + id] || 0) + 1;
        up++; climbed++;
        /* 클리어했다 — 다음 실전 확인까지의 층을 제품 보상표로 접는다 */
        const blk = Math.ceil((TOWER_DAY_MAX - climbed) / (REAL_CAP - shots + 1));
        for (let k = 0; k < blk && climbed < TOWER_DAY_MAX && canEnter(t, towerFloor(t)); k++) {
          const f = towerFloor(t);
          T('탑:접기', () => { towerSetFloor(t, f + 1); giveReward(t.rw(f)); });
          up++; fold++; climbed++;
        }
      }
    }
    B.cnt.towerRun += real; B.cnt.towerUp += up; B.cnt.towerFold += fold;
    ledger('탑');
    return real;
  });
  /* ⚠ 함수 이름은 `activateBless`(30068)다. 7회차까지 `blessStart` 를 `typeof` 로 감싸 부르고 있었는데,
     그 가드는 «없으면 조용히 넘어간다» 라 **축복 3종이 30일 내내 한 번도 안 켜졌고 경고도 안 났다** —
     LESSONS 494-⑥ 이 말하는 그 실패를 내 코드가 그대로 저지른 자리다. 이제 맨 이름으로 부른다:
     이름이 바뀌면 `T` 가 잡아 경고에 적고 게이트 [3] 이 빨개진다. */
  R.bless = () => T('축복', () => { let n = 0; for (const b of BLESS) { if (!blessOn(b.k) && activateBless(b.k)) n++; } return n; });

  /* ── 재화 소진 ─────────────────────────────────────────────────────── */
  /* 소환은 «골고루» — 가장 적게 뽑은 배너부터(주인 원문). 무료분을 먼저 쓴다. */
  R.summon = () => T('소환', () => {
    let n = 0;
    for (const x of SHOP_BOXES) {
      let guard = 0;
      while ((S.daily.freeSum && S.daily.freeSum[x.b] > 0) && guard++ < 5) {
        const f = S.daily.freeSum[x.b];
        doSummonFree(x.b, 10, 0);
        if (S.daily.freeSum[x.b] === f) break;
        n += 10;
      }
    }
    /* «골고루» 의 자는 봇이 센다 — 제품 `S.cnt` 에 없는 키를 심으면 세이브를 오염시킨다 */
    if (!B.sumCnt) B.sumCnt = {};
    const cnt = () => SHOP_BOXES.map(x => ({ b: x.b, n: B.sumCnt[x.b] || 0 }));
    let guard = 0;
    while (guard++ < 400) {
      const order = cnt().sort((a, b) => a.n - b.n);
      const b = order[0].b;
      const cost = summonCost(b, 10);
      if (S.dia < cost * 1.0) break;
      const d0 = S.dia; doSummon(b, 10);
      if (S.dia === d0) break;
      B.sumCnt[b] = (B.sumCnt[b] || 0) + 10;
      n += 10;
    }
    ledger('소환');
    return n;
  });
  /* 89 유물 소환은 상자(`SHOP_BOXES`) 계열이 아니라 **자기 함수**를 쓴다(`summonRelic`, 28744).
     3회차에 `doSummon('relic', 1)` 로 부르다 «Cannot read properties of undefined» 로 통째로
     빠져 있었다 — 경고 한 줄이 그것을 잡았다(경고 표를 남긴 이유가 이것이다). */
  R.relicSummon = () => T('유물소환', () => {
    let n = 0, guard = 0;
    while (guard++ < 500 && relicSummonReady()) { if (!summonRelic(true)) break; n++; }
    ledger('유물소환');
    return n;
  });
  /* 490 — 남는 다이아는 던전 입장권으로(교환가 `DUN_EX_PRICE`). 소환을 다 하고 남은 것만. */
  R.dunExchange = () => T('입장권교환', () => {
    let n = 0;
    while (S.dia >= DUN_EX_PRICE * 4 && n < 200) {
      const d = DUNGEONS[n % DUNGEONS.length];
      S.dia -= DUN_EX_PRICE; S.dunTk[d.id] = (S.dunTk[d.id] | 0) + 1; n++;
    }
    ledger('입장권교환');
    return n;
  });

  /* ⚑ **«한 번에 한 레벨» 이 예산을 먹는다.** 4회차에 하루가 4.3초였고 그 대부분이 전투가 아니라
     이 두 고리였다 — 봇은 5분마다 «강화 한 바퀴» 를 도는데 골드가 1e19 급이면 한 바퀴가
     수천 번의 매수다. 제품이 이미 «MAX 구매»(`maxBuy`, 25936 · 한 번에 500레벨)와 수량 탭을
     갖고 있으므로 그것을 쓴다 — **식은 한 줄도 안 바꾸고 «누르는 단위» 만 키운다.**
     ⚠ `S.buyQty` 는 강화·훈련이 **공유**한다(`trainQty()` 25969 는 [1,10,30] 만 받고 그 밖은 1 이다).
       그래서 고리마다 값을 세우고 끝나면 되돌린다. 훈련 쪽은 수량표에 500 이 없으므로
       `trainQty` 자체를 봇 하네스에서 500 으로 덮는다(«버튼을 몇 번 누르는가» 일 뿐 곡선이 아니다). */
  R.train = () => T('훈련', () => {
    const q0 = S.buyQty, tq0 = window.trainQty;
    S.buyQty = 30; window.trainQty = () => 500;
    let n = 0, guard = 0;
    while (guard++ < 2000) {
      let any = false;
      for (const id of TRAIN_STATS) { if (trainBuy(id)) { any = true; n++; } }
      if (typeof trainReady === 'function' && trainReady()) { T('훈련단계', () => trainUp()); any = true; }
      if (!any) break;
    }
    S.buyQty = q0; window.trainQty = tq0;
    return n;
  });
  R.upgrade = () => T('강화', () => {
    if (typeof UPG === 'undefined') return 0;
    const q0 = S.buyQty; S.buyQty = 'MAX';
    let n = 0, guard = 0;
    while (guard++ < 2000) {
      let any = false;
      for (const u of UPG) { const bi = buyInfo(u); if (bi && bi.ok && bi.n > 0) { applyBuy(u, bi.n, bi.cost); markDirty(); any = true; n++; } }
      if (!any) break;
    }
    S.buyQty = q0;
    return n;
  });
  R.levelAll = () => T('일괄강화', () => {
    const pools = [SKILLS, EQUIPS, PETS, RELICS];
    let n = 0;
    for (const p of pools) { const r = levelUpAll(p.filter(x => has(x.id))); if (r) n += r.n; }
    return n;
  });
  R.runes = () => T('룬', () => {
    let n = 0, guard = 0;
    while (guard++ < 3000) { let any = false; for (const r of RUNES) { if (runeTryOk(r.id)) { runeTry(r.id); any = true; n++; } } if (!any) break; }
    ledger('룬');
    return n;
  });
  R.temper = () => T('단련', () => {
    /* JSON.stringify 로 변화를 보던 4회차 판은 고리마다 세이브 조각을 통째로 직렬화했다 —
       레벨 합 한 수로 충분하다. */
    const sum = () => TEMPERS.reduce((a, t) => a + ((S.temper && S.temper[t.k]) | 0), 0);
    let n = 0, guard = 0;
    while (guard++ < 3000) { const b = sum(); for (const t of TEMPERS) temperUp(t.k); if (sum() === b) break; n++; }
    return n;
  });
  R.costume = () => T('코스튬강화', () => {
    let n = 0, guard = 0;
    if (typeof AVATARS === 'undefined') return 0;
    while (guard++ < 500) { let any = false; for (const a of AVATARS) { if (cosUpOk(a.id)) { cosUpgrade(a.id); any = true; n++; } } if (!any) break; }
    return n;
  });
  R.collection = () => T('도감', () => { T('도감일괄', () => collUpAll()); return 0; });

  /* 482 척도 — «제일 좋은 것» 재선정. 장착은 봇이 «플레이어로서» 한다(263 과 양립). */
  R.equipBest = () => T('장착', () => {
    let n = 0;
    T('장비', () => {
      SLOTS.forEach(sl => {
        const own = EQUIPS.filter(e => e.slot === sl.k && has(e.id));
        if (!own.length) return;
        own.sort((a, b) => equipVal(b) - equipVal(a));
        if (S.eqSlot[sl.k] !== own[0].id) { S.eqSlot[sl.k] = own[0].id; n++; }
      });
    });
    T('스킬', () => {
      const own = SKILLS.filter(s => has(s.id));
      own.sort((a, b) => tierScore(b, 'skill') - tierScore(a, 'skill'));
      /* 272 — 상한은 «해금된 칸 수» 이고 제품이 그것을 `skSlotMax()` 로 이미 안다(24405).
         현재 장착 수로 대신하면 «한 칸 열렸는데 영원히 안 채우는» 봇이 된다. */
      const cap = (typeof skSlotMax === 'function') ? skSlotMax() : S.eqSkill.length;
      const want = own.slice(0, Math.max(1, cap)).map(s => s.id);
      if (want.length && want.join() !== S.eqSkill.join()) { S.eqSkill = want; n++; }
    });
    T('펫', () => {
      const own = PETS.filter(p => has(p.id));
      own.sort((a, b) => tierScore(b, 'pet') - tierScore(a, 'pet'));
      const cap = (S.eqPet && S.eqPet.length) ? S.eqPet.length : 3;
      const want = own.slice(0, cap).map(p => p.id);
      if (want.length && S.eqPet && want.join() !== S.eqPet.join()) { S.eqPet = want; n++; syncPets(); }
    });
    markDirty();
    return n;
  });

  /* 강화 한 바퀴 — «재도전 사이» 에 도는 것(등재문 재도전 규칙) */
  R.spendGold = () => { R.train(); R.upgrade(); R.levelAll(); R.temper(); R.equipBest(); };
  R.spendAll  = () => { R.summon(); R.relicSummon(); R.runes(); R.costume(); R.collection(); R.dunExchange(); R.spendGold(); };

  B.R = R;

  /* ======================================================================
     4. 규칙 위반 감시 (등재문 ⑦)
     ====================================================================== */
  B.audit = (where) => {
    if (S.dia < 0) B.viol.push(where + ': 다이아 음수 ' + S.dia);
    if (S.gold < 0) B.viol.push(where + ': 골드 음수 ' + S.gold);
    if (S.relic < 0) B.viol.push(where + ': 유물조각 음수 ' + S.relic);
    for (const d of DUNGEONS) if ((S.dunTk[d.id] | 0) < 0) B.viol.push(where + ': 입장권 음수 ' + d.id);
    if (S.eqSkill && S.eqSkill.length > 8) B.viol.push(where + ': 스킬 슬롯 초과 ' + S.eqSkill.length);
    if (S.eqPet && S.eqPet.length > 3) B.viol.push(where + ': 펫 슬롯 초과 ' + S.eqPet.length);
    if (S.eqSkill) for (const id of S.eqSkill) if (!has(id)) B.viol.push(where + ': 미보유 스킬 장착 ' + id);
    if (S.eqPet) for (const id of S.eqPet) if (!has(id)) B.viol.push(where + ': 미보유 펫 장착 ' + id);
    for (const k in (S.eqSlot || {})) if (S.eqSlot[k] && !has(S.eqSlot[k])) B.viol.push(where + ': 미보유 장비 장착 ' + S.eqSlot[k]);
  };

  /* ======================================================================
     5. 스냅숏
     ====================================================================== */
  B.snap = (label, minute) => {
    const grade = [0, 0, 0, 0, 0, 0];
    T('등급분포', () => {
      SKILLS.concat(EQUIPS, PETS, RELICS).forEach(it => { if (has(it.id) && it.g != null) grade[it.g] = (grade[it.g] || 0) + 1; });
    });
    return {
      label, minute,
      stage: S.stage, best: S.best, cp: cp(), dps: Math.round(stat.dps),
      gold: Math.round(S.gold), dia: S.dia, relic: S.relic,
      trainStage: S.trainStage, own: Object.keys(S.own).length, grade,
      tower: S.tower | 0, tower2: S.tower2 | 0,
      dunTk: DUNGEONS.reduce((n, d) => n + (S.dunTk[d.id] | 0), 0),
    };
  };

  return true;
};
/* eslint-enable no-undef */

/* ==========================================================================
   Node 쪽 — 하루/세션 편성
   ========================================================================== */
/* 정책 두 벌(등재문 ⑤). «접속 시각» 과 «접속당 활성 분» 만 다르고 손잡이는 같다. */
const POLICIES = {
  diligent: { name: '부지런한 유저', logins: [8, 12.5, 19, 22.5], activeMin: 45, offlineMul: 1.5, summonAll: true },
  casual:   { name: '대충 유저',     logins: [21],                 activeMin: 30, offlineMul: 1.0, summonAll: false },
};
const CAL_STAGES = [1, 10, 30, 50, 100, 200];
const CAL_SEC = 60;
const WALL_MIN = 30;           /* 같은 스테이지 이 분 이상 정체 = 벽 1개 */
/* 199 4회차 — 정체를 «벽» 과 «상승면 멈춤» 으로 가른다.
   ES_RAMP(밴드 내 상승면)가 생기면 벽 사이의 «오르막» 에서 하루 주기 성장 사이의 숨(수 시간
   멈춤)이 끼는데, 이것을 벽으로 세면 주인 목표 벽 목록(±20%)에 «없어야 할 벽» 이 잔뜩 생긴다.
   실측이 가른다 — 진짜 벽은 len/시작시각 이 0.17~0.81(막힘이 진행 시간의 큰 몫), 오르막 숨은
   0.01~0.05 로 **한 자릿수 차이**다(r4 스윕 4시드 전수). 문턱 0.08 은 그 사이 빈 구간의 값이고,
   주인 목표 «간격 ×1.4» 자체가 «벽 = 그 구간의 큰 몫» 을 함의한다(스윕 표 §4-2).
   ⚠ 원 목록(30분 이상 전부)도 표에 그대로 남긴다 — 문턱을 옮기면 숫자가 어떻게 갈라지는지
   다음 회차가 검산할 수 있어야 한다. */
const WALL_FRAC = 0.08;        /* (구 판정, 대조용으로만 남긴다) len ≥ 이 비율 × 시작(분) = 벽 */
/* ⚠ 7회차 — 구 판정은 **달력 자**로 정의된 것이다(len·min 둘 다 벽시계였다). 7회차가 `len` 을
   활성 분으로 바꿨으므로 이 칸만 `lenCal`(벽시계 길이)로 읽어 **옛 판정을 옛 자로** 유지한다 —
   섞어 읽으면 «구 판정» 칸이 두 자의 잡종이 되어 대조 칸의 뜻을 잃는다. */
const isWallFrac = w => (w.lenCal != null ? w.lenCal : w.len) >= WALL_FRAC * Math.max(1, w.min);
/* ⚑ 199 5회차 — 분류를 «비율» 에서 **기제**로 바꾼다 (4회차 비평 J·K·L 3인 일치).
   4회차의 WALL_FRAC 0.08 은 **부지런 시드1에서만** 갈렸다: 부지런 간극 ×3.3 ○ 인데
   대충은 ×1.39 뿐이라 #7(1,433분·0.101 = 벽) ↔ #9(1,420분·0.071 = 멈춤)이 **길이 차 0.9%**
   에 판정이 반대로 났다 — 가른 것은 정체의 성질이 아니라 **달력**(시작 시각이 분모라
   같은 정체도 30일째면 «멈춤», 3일째면 «벽»)이다. 48.5시간 정체(#13)가 «벽 아님» 이 된 것도
   같은 뿌리다.
   기제는 이 게임 안에 이미 있다 — `BOSS_GATE_N = ES_BAND` 의 배수 스테이지가 **관문**
   (보스 체력 ×BOSS_GATE_HP)이고, 그 사이는 `ES_RAMP` 비탈뿐인 **밴드 안**이다. 그래서
     · 관문 스테이지에서의 정체 = **벽**(구간 점프를 못 넘은 것)
     · 밴드 안 스테이지에서의 정체 = **멈춤**(오르막 중 하루 주기 성장을 기다리는 숨)
   로 가른다. 문턱도 분모도 없으니 **달력 의존이 소멸**한다(K 처방 — 부지런 24건 중 판정이
   바뀌는 것은 1건(s720)뿐임을 4회차 비평이 미리 검산했다).
   ⚠ 구 판정(WALL_FRAC)도 표에 «구 판정» 칸으로 그대로 남긴다 — 두 자가 어디서 갈리는지
   다음 회차가 검산할 수 있어야 한다(4회차 규약 그대로). */
const isWall = (w, band) => w.stage % Math.max(1, band || 40) === 0;

async function runOne(page, pol, seed, days, onRow) {
  const P = POLICIES[pol];
  const res = await page.evaluate(async (a) => {
    const B = window.BOT, R = B.R;
    B.freeze();
    B.ledgerSync();
    /* 3회차([E] 장부 결손 수리) — 새 세이브의 시작 잔고(NEW_DIA 100만)는 ledgerSync 가 diaPrev 로
       삼켜 유입 표에서 통째로 빠졌다. 그래서 «씽크+잔고−유입» 이 3표 전수 +100만이었다(2회차 2-6).
       시작 잔고를 유입 행으로 싣는다 — 이것이 «신규 지급» 의 장부상 자리다. */
    B.diaIn['시작(신규 지급)'] = S.dia;
    const out = { rows: [], walls: [], day1: [], sessions: 0 };
    let lastLogout = null;
    /* ⚑ 199 7회차 — 시계가 둘이다(6회차 비평 R · 정정6).
       `minute` 은 **벽시계**라 접속 점프(`minute = target`)를 그대로 먹는다 — 로그아웃 15시간이
       «같은 스테이지에 서 있던 시간» 으로 계상돼 대충 유저 «멈춤» p50 이 1,415분(로그인 주기
       1,440분의 98.3%)이었다. 정체의 길이는 **활성 분**(파밍 루프가 실제로 돈 분)으로 잰다.
         · `minute`/`stageSince` = 벽시계 — ① 목표 칸 «시각»(w.min)은 달력 자라 그대로 쓴다
         · `amin`/`stageSinceA` = 활성 — 길이(w.len)·문턱(wallMin)·③ 분모가 이 자를 쓴다
       두 축을 다 실어야 [D2] 상승면이 «벽 끝 → 다음 벽 시작» 을 같은 자 안에서 뺄 수 있다. */
    let minute = 0, lastStage = -1, stageSince = 0;
    let amin = 0, stageSinceA = 0;
    const pushWall = () => out.walls.push({
      stage: lastStage, min: stageSince, amin: stageSinceA,
      len: amin - stageSinceA, lenCal: minute - stageSince,
    });

    const mark = (label) => {
      const s = B.snap(label, minute);
      out.rows.push(s);
      if (minute <= 24 * 60) out.day1.push(s);
      return s;
    };

    for (let day = 1; day <= a.days; day++) {
      for (const h of a.logins) {
        /* ── 접속 ── */
        const target = (day - 1) * 24 * 60 + h * 60;
        if (target > minute) { B.advance((target - minute) * 60000); minute = target; }
        dailyCheck();
        if (lastLogout != null) {
          try { offlineReward(lastLogout); claimOffline(a.offlineMul); } catch (_) {}
          B.ledger('오프라인');        /* 안 적으면 이 몫이 다음 장부(출석)에 얹혀 출처가 몇 % 틀어진다 */
        }
        out.sessions++;
        /* ── 수령 ── */
        R.attend(); R.mail(); R.quest(); R.guide(); R.pass(); R.ads(); R.roulette();
        R.bless();
        /* ── 실전(던전·탑) — **하루의 첫 접속에서만** ──
           입장권은 출석 수령(하루 1회)으로 들어오고 탑은 «질 때까지» 오르는 것이라, 실제 유저도
           이 둘은 한 자리에서 몰아 한다. 접속마다 돌리면 봇이 하루에 던전 수백 판을 도는데
           그것이 6회차에 30일 1시드를 4분으로 만든 자리다. */
        if (h === a.logins[0]) { R.dungeons(day); R.towers(day); }
        /* ── 재화 소진 ── */
        R.spendAll();
        R.equipBest();
        B.audit('day' + day + '/h' + h);
        /* ── 활성 파밍 ── */
        for (let m = 0; m < a.activeMin; m++) {
          const _t = performance.now();
          B.farmMinute();
          B.prof['파밍'] = (B.prof['파밍'] || 0) + (performance.now() - _t);
          if (m % 5 === 4) R.spendGold();          /* 재도전 사이 «강화 한 바퀴» */
          minute++; amin++; B.advance(60000);
          if (S.stage !== lastStage) {
            if (lastStage >= 0 && amin - stageSinceA >= a.wallMin) pushWall();
            lastStage = S.stage; stageSince = minute; stageSinceA = amin;
          }
          if (day === 1 && minute % 10 === 0) mark('D1+' + minute + 'm');
        }
        lastLogout = B.now();
      }
      mark('D' + day);
      B.audit('day' + day + ' 끝');
    }
    /* 마지막 정체도 벽으로 센다 */
    if (lastStage >= 0 && amin - stageSinceA >= a.wallMin) pushWall();
    /* 3회차 — 장부 항등식을 [F] 규칙 위반으로 검사한다. 마지막 ledger 호출 뒤의 잔여 diff 를
       «기타(미귀속)» 으로 flush 하면 매 diff 가 어느 행엔가 실리므로(망원 합) 유입−씽크 = 잔고가
       구성상 정확히 성립해야 한다 — 어긋나면 봇의 어떤 경로가 장부 밖에서 다이아를 만든 것이다. */
    B.ledger('기타(미귀속)');
    {
      const inSum  = Object.values(B.diaIn).reduce((a, b) => a + b, 0);
      const outSum = Object.values(B.diaOut).reduce((a, b) => a + b, 0);
      if (Math.abs(inSum - outSum - S.dia) > 0.5)
        B.viol.push('장부 항등식 위반: 유입 ' + inSum + ' − 씽크 ' + outSum + ' − 잔고 ' + S.dia + ' = ' + (inSum - outSum - S.dia));
    }
    /* 199 5회차 — 분류·순 이동을 재는 데 필요한 두 값. 밴드 주기는 상수를 손으로 적지 않고
       **제품에게 묻는다**(ES_BAND 를 199 가 다시 돌리면 자가 조용히 옛 주기로 센다). */
    out.band = (typeof ES_BAND === 'number' ? ES_BAND : 40);
    out.minutes = minute;
    out.amin = amin;               /* 7회차 — ③ 의 분모(활성 총 분 = 로그인 수 × activeMin) */
    out.diaIn = B.diaIn; out.diaOut = B.diaOut; out.viol = B.viol.slice(); out.warn = B.warn.slice();
    out.final = B.snap('final', minute);
    out.cnt = B.cnt;
    out.prof = B.prof;
    return out;
  }, { seed, days, logins: P.logins, activeMin: P.activeMin, offlineMul: P.offlineMul, wallMin: WALL_MIN });
  if (onRow) onRow(res);
  return res;
}

/* ---------------- 실행 ---------------- */
(async () => {
  const t0 = Date.now();
  const browser = await launch(chromium);
  const report = { stamp: STAMP, days: DAYS, seeds: SEEDS, policies: {}, cal: null, viol: [], warn: [] };

  /* 보정치는 «깨끗한 세이브 한 벌» 에서 한 번만 찍는다 — 정책·시드와 무관한 값이다 */
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.addInitScript(CLOCK, new Date(2026, 0, 1, 8, 0, 0).getTime());
    await page.addInitScript(SEEDRNG, 1);
    await page.goto(URL);
    await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
    await page.evaluate(BOT_SRC, {});
    report.cal = await page.evaluate(([st, sec]) => { window.BOT.freeze(); return window.BOT.calibrate(st, sec); }, [CAL_STAGES, CAL_SEC]);
    /* 게이트 전용 손잡이(`verify494` 되돌림 시험) — 처치 간격 하한을 0 으로 두면 «화력이 크면
       무한히 빨리 잡는다» 는 5회차 이전의 거짓 모형으로 돌아간다. 그 차이가 표에 실제로
       나타나는지를 게이트가 확인한다. 본 실행에서는 절대 쓰지 마라. */
    if (ARG.nofloor) { report.cal.tFloor = 0; report.nofloor = true; }
    await ctx.close();
    console.log('[A] 보정치 — κ_dps ' + report.cal.kDps.toFixed(3) + ' · κ_hp ' + report.cal.kHp.toFixed(3) + ' · κ_gold ' + report.cal.kGold.toFixed(3));
  }

  for (const pol of POLS) {
    const runs = [];
    for (let i = 0; i < SEEDS; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 160)));
      await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
      await page.addInitScript(CLOCK, new Date(2026, 0, 1, 8, 0, 0).getTime());
      await page.addInitScript(SEEDRNG, i + 1);
      await page.goto(URL);
      await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
      await page.evaluate(BOT_SRC, {});
      await page.evaluate((c) => { window.BOT.cal = c; }, report.cal);
      const r = await runOne(page, pol, i + 1, DAYS);
      r.seed = i + 1; r.errs = errs;
      runs.push(r);
      report.viol.push(...r.viol.map(v => pol + '#' + (i + 1) + ' ' + v));
      await ctx.close();
      process.stdout.write(`\r[${pol}] 시드 ${i + 1}/${SEEDS} — s${r.final.stage} cp${r.final.cp} 벽${r.walls.length}   `);
      if (ARG.prof && r.cnt) console.log(`\n  실전 전투 ${r.cnt.simN}판 · 시뮬 ${Math.round(r.cnt.simSec)}초 · 판당 ${(r.cnt.simSec / Math.max(1, r.cnt.simN)).toFixed(1)}초`);
      if (ARG.prof && r.prof) console.log('\n  프로파일: ' + Object.keys(r.prof).sort((x, y) => r.prof[y] - r.prof[x]).slice(0, 10).map(k => k + ' ' + (r.prof[k] / 1000).toFixed(1) + 's').join(' · '));
    }
    console.log('');
    report.policies[pol] = runs;
    /* 경고(경로 대체)는 첫 시드 것만 대표로 남긴다 — 시드마다 같다 */
    if (runs[0] && runs[0].warn) report.warn = Array.from(new Set(report.warn.concat(runs[0].warn)));
  }
  await browser.close();
  report.elapsedSec = (Date.now() - t0) / 1000;

  writeReport(report);
  if (ARG.json) fs.writeFileSync(path.resolve(ROOT, String(ARG.json)), JSON.stringify(report, null, 1));

  console.log(`\nBOT199 — ${report.elapsedSec.toFixed(1)}초 · 규칙 위반 ${report.viol.length}건 · 표 ${path.relative(ROOT, OUT)}`);
  process.exit(report.viol.length === 0 ? 0 : 1);
})();

/* ---------------- 표 ---------------- */
function pct(a, b) { return b ? ((a / b) * 100).toFixed(1) + '%' : '—'; }
function med(v) { const w = v.slice().sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)] : 0; }
function q(v, p) { const w = v.slice().sort((a, b) => a - b); return w.length ? w[Math.min(w.length - 1, Math.floor(w.length * p))] : 0; }
function fmtN(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

function writeReport(rep) {
  const L = [];
  L.push(`# 199 봇 플레이 표 — ${rep.stamp}`);
  L.push('');
  L.push(`> \`node tools/bot199.js --days=${rep.days} --seeds=${rep.seeds}\` · 실행 ${rep.elapsedSec.toFixed(1)}초`);
  L.push('> **이 표는 계수를 안 건드린 «현재 값» 의 사진이다.** 조정은 199 몫(작업 494 등재문 마지막 줄).');
  L.push('');
  L.push('## [A] 보정치 — 실전/수식');
  L.push('');
  L.push('| 스테이지 | 실전 DPS | 수식 `stat.dps` | κ_dps | 60초 처치 | 처치 간격 | κ_hp | κ_gold | 보스 실전(초) | κ_boss |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rep.cal.rows)
    L.push(`| ${r.s} | ${fmtN(r.realDps)} | ${fmtN(r.formDps)} | ${r.kDps.toFixed(3)} | ${r.kills} | ${r.tKill == null ? '—' : r.tKill.toFixed(2) + 's'} | ${r.kHp == null ? '—' : r.kHp.toFixed(3)} | ${r.kGold == null ? '—' : r.kGold.toFixed(3)} | ${r.bossSec.toFixed(2)}${r.bossKilled ? '' : ' (미격파)'} | ${r.kBoss == null ? '—' : r.kBoss.toFixed(3)} |`);
  L.push('');
  L.push(`**처치 간격 하한 tFloor = ${rep.cal.tFloor.toFixed(3)}초** (s1 에서 대역의 1,000배 화력 · 30초에 ${rep.cal.floorKills}마리)`);
  L.push('');
  L.push('· κ_dps 는 «수식 `stat.dps` 를 실전으로 환산하는 비» 다. **한 수로 접지 않는다** — 표 안에서 단조로 움직이므로');
  L.push('  봇은 log(스테이지) 선형 보간으로 읽는다(저구간에서 `stat.dps` 는 실전보다 후하고, 고구간에서는 반대로 과소평가한다).');
  L.push('· κ_gold 에서 `stat.goldMul` 은 **나눠 뒀다** — 그것은 전장이 아니라 플레이어 스탯이라 접기 쪽에서 따로 곱한다.');
  L.push(`· 참고 평균(한 수로 봐야 할 때만) — κ_dps ${rep.cal.kDps.toFixed(3)} · κ_hp ${rep.cal.kHp.toFixed(3)} · κ_gold ${rep.cal.kGold.toFixed(3)} · κ_boss ${rep.cal.kBoss.toFixed(3)}`);
  L.push('');

  for (const pol of Object.keys(rep.policies)) {
    const runs = rep.policies[pol];
    const P = { diligent: '부지런한 유저', casual: '대충 유저' }[pol] || pol;
    L.push(`## [C] 날짜별 — ${P} (시드 ${runs.length})`);
    L.push('');
    L.push('| 일 | 스테이지 p10 | p50 | p90 | 전투력 p50 | 훈련단계 p50 | 보유 종수 p50 | 다이아 잔고 p50 | 골드 잔고 p50 |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (let d = 1; d <= rep.days; d++) {
      const rows = runs.map(r => r.rows.filter(x => x.label === 'D' + d)[0]).filter(Boolean);
      if (!rows.length) continue;
      const st = rows.map(x => x.stage);
      L.push(`| ${d} | ${q(st, 0.1)} | ${med(st)} | ${q(st, 0.9)} | ${fmtN(med(rows.map(x => x.cp)))} | ${med(rows.map(x => x.trainStage))} | ${med(rows.map(x => x.own))} | ${fmtN(med(rows.map(x => x.dia)))} | ${fmtN(med(rows.map(x => x.gold)))} |`);
    }
    L.push('');
    /* 1일차 분 단위 */
    L.push(`### [B] 1일차 분 단위 — ${P} (시드 1, 10분 간격)`);
    L.push('');
    L.push('| 경과(분) | 스테이지 | 전투력 | 다이아 | 골드 | 보유 종수 |');
    L.push('|---|---|---|---|---|---|');
    for (const s of (runs[0] ? runs[0].day1 : []))
      L.push(`| ${s.minute} | ${s.stage} | ${fmtN(s.cp)} | ${fmtN(s.dia)} | ${fmtN(s.gold)} | ${s.own} |`);
    L.push('');
    /* 벽 — 199 5회차: 분류는 **기제**(관문 스테이지 정체 = 벽 · 밴드 안 정체 = 멈춤)다.
       구 판정(WALL_FRAC)은 대조 칸으로만 남는다. */
    const BAND = (runs[0] && runs[0].band) || 40;
    const wallsAll  = runs.map(r => r.walls.filter(w =>  isWall(w, r.band)).length);
    const pausesAll = runs.map(r => r.walls.filter(w => !isWall(w, r.band)).length);
    /* ⚑ 7회차 — 상승면·실오르막도 **활성 자**로 잰다(정정6). 벽시계로 재면 상승면이 로그아웃
       시간을 통째로 삼켜 ③ 의 분자가 부풀고, 분모(달력 총 분)와 함께 두 쪽이 다 오염된다.
       `w.amin` = 정체 시작의 활성 분 · `w.len` = 정체의 활성 길이 ⇒ 같은 자 안에서 뺀다. */
    const wA = (w) => (w.amin != null ? w.amin : w.min);
    const actTot = (r) => (r.amin != null ? r.amin : (r.minutes || rep.days * 1440));
    const ACT = med(runs.map(actTot)) || (rep.days * 1440);
    const faceOf = (r) => {
      const w = r.walls.filter(x => isWall(x, r.band)); const f = [];
      for (let i = 0; i + 1 < w.length; i++) f.push(wA(w[i + 1]) - (wA(w[i]) + w[i].len));
      return f;
    };
    /* ⚑ 199 5회차 — «실오르막»(순 이동). 4회차의 «상승면 9.64%» 는 3인 비평이 실측으로
       뒤집었다: 그 95.4% 가 같은 스테이지에 30분 이상 서 있는 **멈춤**이었고 순 이동은
       203분(0.47%)뿐이었다. 상승면은 «벽과 벽 사이의 달력 길이» 라 멈춤을 통째로 삼킨다.
       ⇒ 목표 축을 **정체를 뺀 시간**으로 옮긴다 — 이 표에서 ③ 을 읽을 때는 이 줄을 봐라.
         · 순 이동 = 전체 경과 − Σ(30분 이상 정체 전부: 벽 + 멈춤)
         · 벽당 실오르막 = 상승면 하나에서 그 안의 멈춤을 뺀 값 (목표: 벽당 ≥ 60분 급) */
    const stallOf   = (r) => r.walls.reduce((a, w) => a + w.len, 0);
    const netOf     = (r) => Math.max(0, actTot(r) - stallOf(r));
    const faceNetOf = (r) => {
      const w = r.walls.filter(x => isWall(x, r.band)); const f = [];
      for (let i = 0; i + 1 < w.length; i++) {
        const a = wA(w[i]) + w[i].len, b = wA(w[i + 1]);
        const pause = r.walls.filter(x => !isWall(x, r.band) && wA(x) >= a && wA(x) < b)
                             .reduce((s, x) => s + Math.min(x.len, b - wA(x)), 0);
        f.push(Math.max(0, b - a - pause));
      }
      return f;
    };
    const faceSum = runs.map(r => faceOf(r).reduce((a, b) => a + b, 0));
    const netAll  = runs.map(netOf);
    const faceNet = runs.map(r => faceNetOf(r));
    const faceNetMed = med(faceNet.map(f => f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0));
    L.push(`### [D] 벽 — ${P} (같은 스테이지 **활성** ${WALL_MIN}분 이상 정체 · **벽 = 관문 스테이지(${BAND}의 배수) 정체 · 멈춤 = 밴드 안 정체**)`);
    L.push('');
    /* ⚑ 5회차 비평 3인 일치 — «적중 n/8 · 첫 벽 · 간격 기하평균» 은 ① 의 채점 축인데 표에 없어서
       회차마다 손으로 세다가 빠졌다(5회차 §5-5 가 셋 다 누락). 자가 매번 찍는다.
       주인 목록(분): 30 · 180 · 1440 · 3600 · 7200 · 12960 · 21600 · 36000 (간격 ×1.4) · ±20%. */
    const TARGET = [30, 180, 1440, 3600, 7200, 12960, 21600, 36000];
    /* ⚑ 199 7회차 — ① 의 자 두 곳을 주인 목록에서 **역산한 값**으로 바꾼다(6회차 비평 P·Q).
       ⓐ **분모** — 30분·3h 칸은 **첫 접속 이전**이다(부지런 첫 로그인 480분 · 대충 1,260분).
          봇이 아직 한 분도 안 논 시각에 벽이 설 길이 없으므로 그 두 칸은 «못 맞힌 것» 이 아니라
          **구조적 도달 불가**다. 분모를 도달 가능한 6칸(1,440~36,000)으로 하고, 옛 8칸 분모도
          괄호로 남긴다(회차 간 비교용).
       ⓑ **간격 목표 ×1.4 는 주인 목록의 값이 아니다** — 목록 자체의 기하평균은
          6칸 구간 (36000/1440)^(1/5) = **1.904** · 전 8칸 (36000/30)^(1/7) = **2.754** 다.
          «×1.4» 는 주인이 말한 «간격이 커진다» 의 어림수였고, 자는 **목록에서 역산한 값**을 쓴다. */
    const gmOf   = (a) => a.length < 2 ? 0
      : Math.pow(a[a.length - 1] / a[0], 1 / (a.length - 1));
    const SPAN_T8 = gmOf(TARGET);                          /* 2.754 */
    const wallsOf = (r) => r.walls.filter(w => isWall(w, r.band));
    /* ⚑ 199 8회차 — ① 의 자를 **네 곳** 고친다(7회차 비평 S·U 독립 일치 · 정정7·9·10).
       7회차까지의 ① 은 «점수를 못 매기는 자» 였고, 5·6·7회차가 세 번 연속 그 위에서 계수를 돌렸다.
         ⓐ **분모가 정책 공통 6칸이었다.** 대충은 첫 로그인 1,260분 · 세션 30활성분이라
            1,440칸(창 1,152~1,728)에 벽을 세우려면 **첫 세션 30분 전부**를 한 스테이지에 서 있어야
            한다([B] 실측은 같은 30분에 s55 → s164) ⇒ 1/6 은 실은 **1/5** 였다(정정7).
            도달 가능은 상수 목록이 아니라 **누적 활성 분**으로 판정한다 — 창 끝(1.2t)까지 쌓인
            활성 분이 벽 문턱(${WALL_MIN}분)을 **넘어야** 그 칸에 벽이 설 수 있다.
            같은 한 줄이 7회차의 «30분·3h 는 첫 접속 이전» 도 포함한다(부지런 6칸 · 대충 5칸).
         ⓑ **`hitIn` 이 §0 의 절반만 쟀다**(정정10) — «칸마다 벽이 하나라도 있나» 만 세어
            한 벽이 여러 칸에 · 여러 벽이 한 칸에 겹쳐 세어졌다(부지런 시드1 벽 13 vs 칸 6 ·
            36,000칸 하나에 3중 계상). ⇒ **1:1 유일 배정**(상대오차가 작은 짝부터)으로 바꾸고,
            어느 칸에도 못 붙은 **«잉여 벽»** 을 헤드라인에 같이 찍는다 — 그것이 §0 의 나머지
            절반(«없어야 할 벽이 없다»)이다.
         ⓒ **`spanOf` 의 지수가 «벽 개수−1»** 이었다(정정9). 목표 SPAN_T 는 «칸 개수−1» 에서
            나온 값이라 한 줄에 비교 불가능한 두 수를 찍고 있었다(같은 표를 벽 11개로 재면 1.474 ·
            칸 6으로 재면 2.346 으로 **부호가 뒤집힌다**) ⇒ 지수를 **칸 개수−1** 로 통일한다.
         ⓓ **벽의 ① 좌표가 정체의 왼쪽 끝**이었다. 대충 #4 는 활성 330분을 달력 15,840분에 편
            정체라 최대 배치 오차가 ±15,840분이다 ⇒ **달력 중앙**(min + lenCal/2)으로 잰다. */
    const wallT  = (w) => w.min + (w.lenCal != null ? w.lenCal : 0) / 2;      /* ⓓ */
    const actBy  = (a, t) => {          /* 시각 t(달력 분)까지 쌓인 활성 분 */
      let s = 0;
      for (let d = 0; d * 1440 <= t; d++)
        for (const h of a.logins) {
          const st = d * 1440 + h * 60;
          if (st < t) s += Math.min(a.activeMin, t - st);
        }
      return s;
    };
    const POL_A  = POLICIES[pol] || POLICIES.diligent;
    const REACH  = TARGET.filter(t => t <= rep.days * 1440                    /* ⓐ 정책별 */
      && actBy(POL_A, 1.2 * t) > WALL_MIN);
    const SPAN_T = gmOf(REACH);
    const pairOf = (r) => {             /* ⓑ 1:1 유일 배정 — 상대오차가 작은 짝부터 */
      const ws = wallsOf(r), cand = [];
      REACH.forEach((t, si) => ws.forEach((w, wi) => {
        const e = Math.abs(wallT(w) - t) / t;
        if (e <= 0.2) cand.push({ si, wi, e });
      }));
      cand.sort((x, y) => x.e - y.e);
      const us = new Set(), uw = new Set();
      for (const c of cand) {
        if (us.has(c.si) || uw.has(c.wi)) continue;
        us.add(c.si); uw.add(c.wi);
      }
      return { hit: us.size, extra: ws.length - uw.size };
    };
    const hitOf   = (r) => pairOf(r).hit;
    const extraOf = (r) => pairOf(r).extra;
    /* 옛 자(회차 간 비교용) — 겹쳐 세는 구 판정 그대로. 8칸 분모·왼쪽 끝 좌표. */
    const hitOld = (list, r) => {
      const ws = wallsOf(r);
      return list.filter(t => t <= rep.days * 1440
        && ws.some(w => Math.abs(w.min - t) <= 0.2 * t)).length;
    };
    const hit8Of = (r) => hitOld(TARGET, r);
    const spanOf = (r) => {           /* ⓒ 지수는 «칸 개수−1» — 목표 SPAN_T 와 같은 자 */
      const ws = wallsOf(r);
      if (ws.length < 2 || REACH.length < 2) return 0;
      return Math.pow(wallT(ws[ws.length - 1]) / Math.max(1, wallT(ws[0])), 1 / (REACH.length - 1));
    };
    const firstOf = (r) => { const ws = wallsOf(r); return ws.length ? Math.round(wallT(ws[0])) : 0; };
    const tgtN  = REACH.length;
    const tgtN8 = TARGET.filter(t => t <= rep.days * 1440).length;
    L.push(`**① 축 — 목표 칸 적중 p50 = ${med(runs.map(hitOf))}/${tgtN} (±20% · 1:1 유일 배정 · 달력 중앙 좌표)`
      + ` · **잉여 벽 p50 = ${med(runs.map(extraOf))}**(어느 칸에도 안 드는 벽 = «없어야 할 벽»)`
      + ` · 첫 벽 p50 = ${med(runs.map(firstOf))}분 (목표 = 첫 도달 가능 칸 ${REACH[0] || '—'}분)`
      + ` · 벽 간격 기하평균 p50 = ${med(runs.map(spanOf)).toFixed(2)} (목표 ×${SPAN_T.toFixed(3)})**`);
    L.push('');
    L.push(`_도달 가능 칸(정책별 · 창 끝 1.2t 까지 쌓인 활성 분 > ${WALL_MIN}) = ${REACH.join(' · ')}분_`);
    L.push('');
    L.push(`_(옛 자 — 8칸 분모·겹쳐 세기·왼쪽 끝 좌표: 적중 ${med(runs.map(hit8Of))}/${tgtN8}`
      + ` · 간격 목표 ×${SPAN_T8.toFixed(3)} · 첫 벽 옛 목표 30분)_`);
    L.push('');
    L.push(`벽 개수 p10/p50/p90 = ${q(wallsAll, 0.1)} / ${med(wallsAll)} / ${q(wallsAll, 0.9)}`
      + ` · 밴드 안 멈춤 p50 = ${med(pausesAll)}`
      + ` (30분 이상 정체 전부 = p50 ${med(runs.map(r => r.walls.length))}`
      + ` · 구 판정(len ≥ ${WALL_FRAC}×시작) 벽 p50 = ${med(runs.map(r => r.walls.filter(isWallFrac).length))})`);
    /* ⚑ 5회차 비평 N — «밴드 안 멈춤» 이 몇 시간짜리인지 안 찍으면 «숨» 이라는 이름이 판정을 흐린다
       (r5 부지런 15개가 전부 ≥184분 · 대충은 ≈23.5시간짜리가 다섯). 길이를 같이 적는다. */
    {
      const plen = runs.flatMap(r => r.walls.filter(w => !isWall(w, r.band)).map(w => w.len));
      if (plen.length) L.push('')
        , L.push(`멈춤 길이 — p50 ${med(plen)}분 · p90 ${q(plen, 0.9)}분 · 최대 ${Math.max.apply(null, plen)}분`
          + ` (합 p50 = ${med(runs.map(r => r.walls.filter(w => !isWall(w, r.band)).reduce((a, w) => a + w.len, 0)))}분`
          + ` = 활성 시간의 ${(100 * med(runs.map(r => r.walls.filter(w => !isWall(w, r.band)).reduce((a, w) => a + w.len, 0))) / ACT).toFixed(1)}%)`);
    }
    L.push('');
    /* ⚑ 8회차 — «① 좌표»(달력 중앙)와 «배정된 칸» 을 같이 찍는다. 앞 회차들이 이 표를 눈으로
       세면서 왼쪽 끝을 좌표로 읽었고, 그것이 정정10 의 3중 계상이 안 보이던 이유다. */
    {
      const r0 = runs[0];
      const ws0 = r0 ? r0.walls.filter(w => isWall(w, r0.band)) : [];
      const seat = new Map();                       /* 벽 → 배정된 칸 (1:1) */
      if (r0) {
        const cand = [];
        REACH.forEach((t) => ws0.forEach((w, wi) => {
          const e = Math.abs(wallT(w) - t) / t;
          if (e <= 0.2) cand.push({ t, wi, e });
        }));
        cand.sort((x, y) => x.e - y.e);
        const us = new Set();
        for (const c of cand) {
          if (us.has(c.t) || seat.has(c.wi)) continue;
          us.add(c.t); seat.set(c.wi, c.t);
        }
      }
      let wi = -1;
      L.push('| # | 스테이지 | 시작(분·달력) | **① 좌표(달력 중앙)** | 길이(활성 분) | 길이(달력 분) | 시작 시각 | 판정(기제) | **배정 칸** | 구 판정(비율·달력) |');
      L.push('|---|---|---|---|---|---|---|---|---|---|');
      (r0 ? r0.walls : []).slice(0, 40).forEach((w, i) => {
        const h = Math.floor(w.min / 60), m = w.min % 60;
        const isW = isWall(w, r0.band);
        if (isW) wi++;
        const st = isW ? (seat.has(wi) ? seat.get(wi) + '분' : '**잉여**') : '—';
        L.push(`| ${i + 1} | ${w.stage} | ${w.min} | ${Math.round(wallT(w))} | ${w.len} | ${w.lenCal == null ? '—' : w.lenCal} | ${h}시간 ${m}분 |`
          + ` ${isW ? '벽' : '멈춤'} | ${st} | ${isWallFrac(w) ? '벽' : '멈춤'} |`);
      });
    }
    L.push('');
    L.push(`### [D2] 상승면 · **실오르막** — ${P} (상승면 = 벽 끝 → 다음 벽 시작(멈춤 포함) · 실오르막 = 거기서 멈춤을 뺀 순 이동) — **7회차부터 활성 분 자**`);
    L.push('');
    const faceNetSum = faceNet.map(f => f.reduce((a, b) => a + b, 0));
    /* ⚑ 5회차 비평 3인 일치 — «벽당» 을 시드별 평균의 p50 으로 내면 sum/count 보다 3~18% 후하다.
       **합 ÷ 구간 수**(= 3인이 검산에 쓴 정의)를 헤드라인으로 쓰고 옛 값은 괄호로 남긴다.
       그리고 «벽당» 은 벽이 줄기만 해도 오르는 값이라(분모 효과) **합 쪽이 ③ 의 축**이다 — 두 수를
       한 줄에 두어 다음 회차가 분모 효과를 헤드라인으로 못 쓰게 한다. */
    const faceCnt   = med(faceNet.map(f => f.length));
    const perWall   = faceCnt ? med(faceNetSum) / faceCnt : 0;
    L.push(`**실오르막 합(벽 사이 순 이동) p50 = ${med(faceNetSum)}분`
      + ` (활성 시간 ${ACT}분의 ${(100 * med(faceNetSum) / ACT).toFixed(2)}% — ③ 의 축) ·`
      + ` 벽당 = 합÷구간 ${perWall.toFixed(1)}분 (구 표기 «시드평균의 p50» ${faceNetMed.toFixed(0)}분)**`
      + ` — 목표 벽당 ≥60분 급 · ⚠ 벽당은 벽 개수가 줄기만 해도 오른다(분모 효과)`);
    L.push('');
    L.push(`정체 밖 시간 p50 = ${med(netAll)}분 (활성 시간 ${ACT}분의 ${(100 * med(netAll) / ACT).toFixed(2)}%`
      + ` — 첫 벽 이전·마지막 벽 이후와 30분 미만의 숨을 포함한 넓은 자)`);
    L.push('');
    L.push(`상승면 합 p50 = ${med(faceSum)}분 (활성 시간의 ${(100 * med(faceSum) / ACT).toFixed(2)}% — 멈춤 포함, 4회차까지의 축)`
      + ` · 시드1 상승면(분): ${faceOf(runs[0] || { walls: [], band: BAND }).join(' · ') || '-'}`);
    L.push(`시드1 실오르막(분): ${faceNetOf(runs[0] || { walls: [], band: BAND }).join(' · ') || '-'}`);
    L.push('');
    /* 실전으로 돈 전투 */
    const cnts = runs.map(r => r.cnt).filter(Boolean);
    if (cnts.length) {
      const m = (k) => med(cnts.map(c => c[k]));
      L.push(`### 실전으로 돈 전투 — ${P} (시드 중앙값)`);
      L.push('');
      L.push('| 던전 실전 | 던전 접기 | 던전 층 상승 | 탑 실전 | 탑 접기 | 탑 레벨 상승 |');
      L.push('|---|---|---|---|---|---|');
      L.push(`| ${m('dunRun')} | ${m('dunReplay')} | ${m('dunClear')} | ${m('towerRun')} | ${m('towerFold')} | ${m('towerUp')} |`);
      L.push('');
    }
    /* 다이아 */
    const inAll = {}, outAll = {};
    runs.forEach(r => { for (const k in r.diaIn) inAll[k] = (inAll[k] || 0) + r.diaIn[k] / runs.length; for (const k in r.diaOut) outAll[k] = (outAll[k] || 0) + r.diaOut[k] / runs.length; });
    const inTot = Object.values(inAll).reduce((a, b) => a + b, 0);
    L.push(`### [E] 다이아 유입/씽크 — ${P} (${rep.days}일 평균)`);
    L.push('');
    L.push('| 출처 | 합계 | 비중 | 하루 평균 |');
    L.push('|---|---|---|---|');
    Object.keys(inAll).sort((a, b) => inAll[b] - inAll[a]).forEach(k =>
      L.push(`| ${k} | ${fmtN(inAll[k])} | ${pct(inAll[k], inTot)} | ${fmtN(inAll[k] / rep.days)} |`));
    L.push(`| **합** | **${fmtN(inTot)}** | 100% | **${fmtN(inTot / rep.days)}** |`);
    L.push('');
    L.push('| 씽크 | 합계 |');
    L.push('|---|---|');
    Object.keys(outAll).sort((a, b) => outAll[b] - outAll[a]).forEach(k => L.push(`| ${k} | ${fmtN(outAll[k])} |`));
    L.push('');
  }

  /* ⚑ 199 5회차 — [G] 정책 대조. 4회차 비평 ⓒ 는 «스윕 표에 정책비 열이 없어 ④ 가 창 밖으로
     밀린 것을 사전에 못 봤다»(측정 누락)였다. 손잡이 하나를 돌릴 때마다 두 정책의 비가 같이
     찍히게 한다 — 한 정책만 재면 ④ 는 언제나 사후에 발견된다. */
  {
    const pols = Object.keys(rep.policies);
    if (pols.length > 1) {
      /* ⚑ 199 5회차 비평 3인 일치 — «지속 수급» 의 장부가 회차마다 달라지면 ④ 를 못 잰다.
         1~4회차의 «지속» 은 **일회성 3종(시작 신규 지급 100만 · 가이드미션 60만 · 우편 30만)을
         전부 뺀** 값이고(그 자로 r4 부지런 268,527 · 대충 152,569 · 비 1.760), 5회차가 시작만
         빼면서 같은 이름이 다른 수를 가리켰다. ⇒ **두 정의를 나란히 찍는다**(구 = 회차 간 비교용). */
      /* ⚑ 199 8회차(정정8 · U) — 네 번째 항 «출석(1일차 환영)» 을 넣는다. §7-3 이 스스로
         «첫날 축에 속한 값이지 지속 수급이 아니다» 라고 선언한 100,000 이 아직 분모(3,333/일)
         안이었다. 이 한 줄을 고치기 전에는 ④ 를 «창 안» 이라고 부를 수 없다. */
      const ONCE = ['시작(신규 지급)', '가이드미션', '우편', '출석(1일차 환영)'];
      const dayIn = (pol) => {
        const runs = rep.policies[pol];
        const tot = runs.reduce((a, r) => a + Object.values(r.diaIn).reduce((x, y) => x + y, 0), 0) / runs.length;
        const st  = runs.reduce((a, r) => a + (r.diaIn[ONCE[0]] || 0), 0) / runs.length;
        const one = runs.reduce((a, r) => a + ONCE.reduce((x, k) => x + (r.diaIn[k] || 0), 0), 0) / runs.length;
        return { all: tot / rep.days, cont: (tot - st) / rep.days, cont0: (tot - one) / rep.days };
      };
      const netPct = (pol) => {
        const runs = rep.policies[pol];
        /* 7회차 — 분자·분모 둘 다 **활성 분**이다(정정6). 벽시계로 재면 분모가 로그아웃까지
           세어 ③ 이 구조적으로 1% 아래에 눌린다(43,200 vs 5,400). */
        const at = (r) => (r.amin != null ? r.amin : (r.minutes || rep.days * 1440));
        const v = runs.map(r => Math.max(0, at(r) - r.walls.reduce((a, w) => a + w.len, 0)));
        const d = med(runs.map(at)) || (rep.days * 1440);
        return 100 * med(v) / d;
      };
      const stg = (pol) => med(rep.policies[pol].map(r => r.final.stage));
      /* ⚑ 199 8회차(정정3 · T·U 독립 일치) — §0 의 «한 축 ≤50%» 를 자가 한 번도 안 찍었다.
         7회차에 두 장부의 판정이 실제로 갈렸는데(유입 38.4% 통과 ↔ 지속 54.47% 초과) 그것을
         손으로 세어야 알 수 있었다. 두 값을 나란히 찍고 **최대 축의 이름까지** 적는다 —
         어느 장부가 §0 의 축인가는 결2 로 올라간다. */
      const topOf = (pol, cont) => {
        const runs = rep.policies[pol], acc = {};
        runs.forEach(r => { for (const k in r.diaIn) {
          if (cont && ONCE.indexOf(k) >= 0) continue;
          acc[k] = (acc[k] || 0) + r.diaIn[k] / runs.length;
        } });
        const tot = Object.values(acc).reduce((a, b) => a + b, 0);
        let nm = '—', mx = 0;
        for (const k in acc) if (acc[k] > mx) { mx = acc[k]; nm = k; }
        return { pct: tot ? 100 * mx / tot : 0, name: nm };
      };
      /* ⚑ 199 7회차 — ④ 는 «며칠에 닿는가» 인데 자가 «하루에 얼마» 까지만 찍어 회차마다 손으로
         나눴다(6회차 비평 Q·R 독립 일치). 도달일을 **두 장부로** 찍는다 — 결2 가 아직 미응답이라
         어느 쪽이 ④ 의 축인지 주인만 정할 수 있고, 두 장부의 판정이 실제로 갈린다.
           · 유입 장부  = 유입 전체 − 일회성 3종 (1~6회차의 ④ 는 이 자)
           · 소환 예산 장부(결2 ⓑ) = 거기서 **소환 이외의 씽크**(입장권교환 등)를 더 뺀다
         도달일 = (목표 2,730만 − 일회성 선지급) ÷ 지속 수급/일 — 일회성은 첫날 통째로 들어오므로
         분자에서 빼는 것이 «누적이 목표를 지나는 날» 의 정의다(§0 ②). */
      const GOAL_DIA = 27300000;
      /* ⚑ 199 8회차(정정1 · S·T 독립 일치) — 7회차의 «비 1.840» 은 **시드별 도달일의 중앙값끼리
         나눈 값**이었다. 도달일 두 칸의 분자는 같은 (목표 − 일회성) 이므로 비는 **반드시 지속
         수급의 비와 같아야 한다**(정책이 일회성을 같은 값으로 받으므로). med(비) ≠ 비(med) 라
         그 항등식이 0.3% 깨져 있었고, 하한 1.8 대비 마진이 2.2% → 1.9% 로 다르게 읽혔다.
         ⇒ 도달일을 **성분의 중앙값**으로 짓는다 — 그러면 비가 지속 수급 비와 소수점까지 같다. */
      const reachOf = (pol, mode) => {
        const runs = rep.policies[pol];
        const one = med(runs.map(r => ONCE.reduce((x, k) => x + (r.diaIn[k] || 0), 0)));
        const per = med(runs.map(r => {
          const inAll = Object.values(r.diaIn).reduce((a, b) => a + b, 0);
          const o1    = ONCE.reduce((x, k) => x + (r.diaIn[k] || 0), 0);
          const off   = mode === 'summon'
            ? Object.keys(r.diaOut || {}).filter(k => k !== '소환')
                    .reduce((a, k) => a + r.diaOut[k], 0)
            : 0;
          return (inAll - o1 - off) / rep.days;
        }));
        return per > 0 ? (GOAL_DIA - one) / per : 0;
      };
      L.push('## [G] 정책 대조 — ④ 정책 간격 · ③ 순 이동 (손잡이를 돌릴 때마다 같이 본다)');
      L.push('');
      L.push('| 축 | ' + pols.map(p => POLICIES[p].name).join(' | ') + ' | 비 |');
      L.push('|---|' + pols.map(() => '---|').join('') + '---|');
      const rows = [
        ['유입 합/일', p => dayIn(p).all, fmtN],
        ['**지속 수급/일 — 구 정의(일회성 3종 제외 · 1~4회차와 같은 자 · ④ 는 이 줄로 잰다)**', p => dayIn(p).cont0, fmtN],
        ['지속 수급/일 — 시작 지급만 제외(5회차 [G] 초판)', p => dayIn(p).cont, fmtN],
        [`${rep.days}일 스테이지 p50`, stg, fmtN],
        ['순 이동 비중(%) — ③ 축(④ 와 무관)', netPct, x => x.toFixed(2)],
        ['**§0 «한 축 ≤50%» — 최대 유입 축 비중(%) · 지속 장부**(일회성 4종 제외)',
          p => topOf(p, true).pct, x => x.toFixed(2)],
        ['§0 «한 축 ≤50%» — 최대 유입 축 비중(%) · 유입 장부(전체)',
          p => topOf(p, false).pct, x => x.toFixed(2)],
        ['**④ 도달일(2,730만) — 유입 장부** · 목표 부지런 100±10 · 대충 180~200 · 비 1.8~2.0',
          p => reachOf(p, 'in'), x => x.toFixed(1), true],
        ['④ 도달일(2,730만) — 소환 예산 장부(결2 ⓑ · 소환 외 씽크 차감)',
          p => reachOf(p, 'summon'), x => x.toFixed(1), true],
      ];
      /* 비 칸 — 기본은 부지런/대충이지만 **도달일만 대충/부지런**이다(주인 목표 1.8~2.0 이 그 향이다).
         한 표에서 향이 섞이면 다음 회차가 역수를 그대로 읽는다 — 행마다 향을 적는다. */
      for (const [name, f, fmt, inv] of rows) {
        const v = pols.map(f);
        const ratio = inv ? (v[0] ? (v[1] / v[0]).toFixed(3) + ' (대충/부지런)' : '-')
                          : (v[1] ? (v[0] / v[1]).toFixed(3) : '-');
        L.push(`| ${name} | ${v.map(fmt).join(' | ')} | ${ratio} |`);
      }
      L.push('');
      L.push('_최대 유입 축의 이름 — ' + pols.map(p =>
        `${POLICIES[p].name}: 지속 «${topOf(p, true).name}» · 유입 «${topOf(p, false).name}»`).join(' / ') + '_');
      L.push('');
    }
  }

  L.push('## [F] 규칙 위반 (등재문 ⑦ — 0 이어야 결과를 믿는다)');
  L.push('');
  L.push(rep.viol.length ? rep.viol.map(v => '- ' + v).join('\n') : '**0건.**');
  L.push('');
  if (rep.warn.length) {
    L.push('### 경로 대체·경고 (구조가 바뀌면 여기가 먼저 늘어난다)');
    L.push('');
    rep.warn.forEach(w => L.push('- ' + w));
    L.push('');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, L.join('\n'));
}
