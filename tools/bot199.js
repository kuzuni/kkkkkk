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
/* ⚑ 199 9회차(정정9 — V) — [A] 보정치가 매 실행 실측이라 같은 설정 두 실행이 ③ 에서 11.7%
   갈렸다(κ_dps s100 0.752 ↔ 0.866 · κ_boss 0.806 ↔ 0.636). `--calib=<파일>` 로 κ 표를 캐시한다:
   파일이 있으면 읽어 실측을 생략하고, 없으면 실측해 저장한다. 어느 쪽이든 표 머리에 κ 표의
   sha256(12자)을 찍는다 — 두 표의 해시가 같아야 «같은 자로 잰 비교» 다. */
const CALIB   = ARG.calib ? path.resolve(ROOT, String(ARG.calib)) : null;
/* ⚑ 199 9회차(8-7 2 — X 경고) — `isWall` 이 `stage % ES_BAND` 라 밴드를 올리면 관문 후보
   자체가 준다(40→60: 30일 도달권에서 20→13개). 두 밴드를 «같은 벽 정의» 로 비교할 때만
   `--wallband=40` 으로 분류 주기를 제품 밴드에서 분리한다. 본 판정 표에서는 쓰지 마라
   (자연 정의 = 제품의 관문이 §0 의 자다) — 쓰면 표 머리에 경고가 찍힌다. */
const WALLBAND = ARG.wallband ? Math.max(1, parseInt(ARG.wallband, 10)) : null;
/* ⚑ 18회차 정정C(비평 XX8 · 13회차 II 패턴) — **사다리 끝 강제**(게이트 픽스처 전용 · 판정 실행
   금지 · 쓰면 표 머리에 경고). 정정2 가 신설한 «창 밖 = 사다리 안/밖» 분해는 관측창이 사다리
   (172,800분)보다 짧으면 **밖 분기가 구조적으로 0** 이라, 게이트가 그 분기를 한 번도 못 밟는다.
   이 손잡이가 짧은 실행에서 두 분기를 다 세워 «항이 공허참이 아님» 을 증명한다. */
const LADDEREND = ARG.ladderend ? Math.max(1, parseInt(ARG.ladderend, 10)) : null;
/* ⚑ 199 12회차 — **보정 프로브 전용 손잡이 둘**(판정 실행 금지 · 쓰면 표 머리에 경고).
   `--pumpcap=<골드>` · `--pumprcap=<다이아>` 는 `pumpTo` 의 예산 상한(기본 1e33 · 1e12)을 연다.
   왜 필요한가: 11회차가 «도달 가능 화력 상한 = 1.17e33 dps» 라고 적었는데 그 수는 **이 두
   상수가 정한 보정 캐릭터의 지갑**이기도 하다. «게임의 벽» 과 «자의 지갑» 을 가르는 길은
   지갑을 열어 같은 앵커를 다시 재 보는 것 하나뿐이다.
   `--calstages=a,b,c` 는 그 스윕을 앵커 몇 개로 좁혀 싸게 돌린다(전 앵커 재보정은 40초급). */
const PUMPCAP  = ARG.pumpcap  ? Number(ARG.pumpcap)  : null;
const PUMPRCAP = ARG.pumprcap ? Number(ARG.pumprcap) : null;
const PUMPSTEPS = ARG.pumpsteps ? Math.max(1, parseInt(ARG.pumpsteps, 10)) : null;   /* 12회차 — 소환·강화 눈금 반복 상한(기본 600) */
const BOTCFG   = { ...(PUMPCAP ? { pumpCap: PUMPCAP } : {}), ...(PUMPRCAP ? { pumpRCap: PUMPRCAP } : {}), ...(PUMPSTEPS ? { pumpSteps: PUMPSTEPS } : {}) };
/* ⚑ 199 10회차(9-9 4 — Y·AA) — «창 안 중복 8~10» 의 뿌리는 등간격 관문(밴드 배수 ~31개) vs
   등비 목표 9칸이다. `--wallgeo=<g0>,<r>` 는 관문 격자를 **기하 수열**(g0·r^k 를 제품 밴드의
   배수로 스냅)로 바꿔 리플레이 재분류만 한다 — 제품은 0줄, 판정 표에는 쓰지 마라(경고가 찍힌다).
   기하 격자에서 빠진 밴드 배수의 정체는 «멈춤» 으로 내려간다(관문 체력 스파이크가 없으면
   그 자리 정체의 대부분이 서지 않는다는 가정 — 유망하면 제품 스윕으로 확인한다. 결6·결7 대기). */
const GEO = ARG.wallgeo ? String(ARG.wallgeo).split(',').map(Number) : null;
const geoSetOf = (band) => {
  const b = Math.max(1, band || 40), s = new Set();
  let last = 0;
  for (let k = 0; ; k++) {
    const v = Math.max(last + b, Math.round(GEO[0] * Math.pow(GEO[1], k) / b) * b);
    if (v > 40000) break;
    s.add(v); last = v;
  }
  return s;
};
/* `--replay=<json>` — 이전 실행의 `--json` 산출을 다시 표로 접는다(시뮬 없음). 같은 런을
   다른 벽 정의(--wallband)로 재분류할 때 5분짜리 재실행을 아끼는 자리다. */
const REPLAY  = ARG.replay ? path.resolve(ROOT, String(ARG.replay)) : null;

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
  /* ⚑ 12회차(615) — 이 함수는 원래 «화력이 목표에 닿을 때까지» 하나만 알았다. 축이 둘이 되면서
     («화력» 과 «생존») **손잡이를 도는 몸통은 그대로 두고 재는 자만 인자로 받는다** — 사본을
     한 벌 더 짜면 두 축의 «한 눈금씩» 규약이 조용히 갈린다(402 처방). `have`·`need` 는 매번
     다시 읽는 함수다: 생존 축의 `need` 는 방어력을 사면 **내려가므로** 상수로 굳히면 안 된다. */
  const pumpBy = (have, need, stop) => {
    const qty0 = S.buyQty;
    S.buyQty = 1;
    /* 615 — `stop()` 은 «여기서 더 밀면 그 구간의 캐릭터가 아니다» 는 상한이다(생존 축이 쓴다).
       없으면 종전과 한 글자도 다르지 않다 — 화력 축은 상한 없이 목표까지 민다. */
    const go = () => have() < need() && !(stop && stop());
    const goldOnce = () => {                          /* 골드 손잡이 한 눈금 — 샀으면 true */
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
      return bought;
    };
    let guard = 0;
    while (go() && guard++ < 4000) if (!goldOnce()) break;
    /* ⚑ 10회차(정정2) — s400+ 목표는 골드 손잡이(UPG·훈련)만으로는 **물리적으로 닿지 않는다**
       (상한 ≈1.3e10 vs s400 목표 3.1e21 — 실측. 옆 주석의 «어울리는 캐릭터» 규약이 s>200 에서
       깨져 있었다 — 옆 주석이 1회차에 s200 에서 잡은 바로 그 병의 재발이다). 그 구간의
       캐릭터는 소환 축(장비·스킬·펫·일괄 강화)을 가진다 — 보정 전용 컨텍스트에서만 다이아를
       부어 소환 한 바퀴와 골드 한 바퀴를 **교대로** 돈다(소환이 새 등급을 열면 강화 여지도
       새로 생긴다). 골드와 같은 «무한 재화 + 실측» 원칙이고, 이 컨텍스트는 본 실행과 분리된
       페이지라 세이브·장부를 오염시키지 않는다(ledger 는 이 컨텍스트의 B.diaIn 에만 적혀 버려진다). */
    /* ⚑ 12회차 — 예산 상한을 **밖에서 열 수 있게** 했다(`--pumpcap`, 기본값은 옛 상수 그대로).
       11회차가 «도달 가능 화력 상한 1.17e33» 이라고 적은 수는 이 두 상수(일괄 강화 골드 1e33 ·
       유물 다이아 1e12)가 정한 **보정 캐릭터의 예산 상한**이기도 하다 — 그 둘을 구분하지 않으면
       «게임의 벽» 과 «자의 지갑» 이 같은 수로 읽힌다. 열어서 재 보는 것이 그 구분의 유일한 길이다.
       ⚠ 본 판정 실행에서는 쓰지 마라 — 쓰면 표 머리에 경고가 찍힌다(--wallband·--nofloor 규약). */
    let sg = 0, budget = 1e6, rbudget = 1e5;
    /* ⚑⚑ 199 15회차 — **기본 상한이 자의 결함이었다.** 12회차가 «지갑 ↔ 게임» 을 가르는 손잡이를
       열어 두고도 기본값을 옛 상수(1e33·1e12)로 뒀기 때문에, 그 지갑이 마르는 자리마다 행이
       `failBy:'power'`(= «게임의 벽»)로 찍혔다. 15회차 실측이 그 이름을 반증한다 —
       **s700 은 pumpcap 1e60 에서 pump 0.038(«벽»), 1e200 에서 pump 1.094(앵커가 선다)** 이다.
       그 한 상수가 14회차의 «κ_hp 가 s893.8 에서 0 을 지난다» 와 «도달 화력 상한» 서술 전부의
       뿌리였다(11·12·13·14회차가 네 번 이어 적은 문장이다).
       ⇒ 기본값을 **정신 상한**(1e300·1e250)으로 올린다 — 지갑은 앵커의 유효성을 결정하는 자리가
       아니어야 한다. `--pumpcap`/`--pumprcap` 은 그대로 남는다(옛 지갑 재현·스윕용).
       ⚠⚠ **상한만 올리면 거꾸로 간다 — 15회차가 그 함정을 먼저 밟았다.** 예산 눈금을 ×1e6 으로
       키워 1e300 에 «빨리» 닿게 했더니 `budget >= GCAP` 브레이크가 **49 바퀴만에** 걸려 s660 이
       7.46e34 → 1.17e33 으로 **내려갔다**. 화력을 만드는 것은 골드가 아니라 **바퀴 수**다
       (한 바퀴 = 10뽑 한 눈금 + equipBest + 일괄 강화 — 골드는 ×1e140 이 화력을 ×29 밖에
       안 올린다, power ≈ gold^0.036). ⇒ 눈금은 **옛 ×2 그대로** 두고(10회차 과충 클리핑 자리
       불변) **바퀴 상한을 600 → 4000** 으로 연다. 옛 지갑 재현은 `--pumpcap=1e33 --pumprcap=1e12`. */
    const GCAP = (cfg && cfg.pumpCap) || 1e300;       /* 일괄 강화 골드 예산 상한(정신 상한) */
    const RCAP = (cfg && cfg.pumpRCap) || 1e250;      /* 유물 소환 다이아 예산 상한(정신 상한) */
    const SGMAX = (cfg && cfg.pumpSteps) || 4000;     /* 소환·강화 눈금 반복 상한 — 15회차 600 → 4000(위 주석) */
    const STEP = 1.05;                                /* «눈금이 올렸다» 의 문턱 — 5% */
    /* 병합(12회차 ↔ 615) — 양쪽을 다 살린다: 조건·기준값은 615 의 `go()`/`have()`(생존 축까지
       본다), 반복 상한은 12회차의 `SGMAX`(15회차 4000 — 옛 상수 600 은 s660 위를 못 세웠다). */
    /* ⚑ 15회차 — **포화 브레이크는 기각했다**(실측으로 반증). «STALL 바퀴 누적 5% 미만이면
       축이 말랐다» 로 끊어 보니 s680 이 pump0 1.772 → **0.311** 로 무너졌다(STALL 40 · 200 둘 다).
       성공하는 펌프에도 **200 바퀴짜리 평지**가 있다 — 소환 축은 «등급이 열릴 때» 계단으로만
       오르기 때문이다. ⇒ 바퀴는 끊지 않는다. 대신 위 `SGMAX` 를 4000 으로 두고, 그 대가(보정
       시간)는 `--calib` 캐시가 문다(판정 실행은 표를 한 번만 만든다). */
    while (go() && sg++ < SGMAX) {
      const d0 = have(), R2 = B.R;
      if (!R2) break;
      /* ⓐ 10뽑 한 눈금 — 제일 덜 뽑은 배너 하나만. 한 번에 R.summon 을 통째로 돌리면
         (10뽑 ×400 가드) 목표를 수백 배 넘겨 κ_dps 가 «오버킬 클리핑» 으로 무너진다 —
         2회차 «한 번에 다 사면 안 된다» 와 같은 병이라 같은 처방(한 눈금씩)이다. */
      if (!B.sumCnt) B.sumCnt = {};
      let bb = null;
      for (const x of SHOP_BOXES) { const c = (B.sumCnt[x.b] || 0); if (!bb || c < bb.c) bb = { b: x.b, c }; }
      if (bb) {
        S.dia = Math.max(S.dia, summonCost(bb.b, 10));
        T('cal.sum10', () => doSummon(bb.b, 10));
        B.sumCnt[bb.b] = (B.sumCnt[bb.b] || 0) + 10;
        S.dia = 0;
      }
      T('cal.equip', () => R2.equipBest());
      if (!go()) break;
      /* ⓑ 뽑기 눈금이 5% 도 못 올리면 강화 «예산 눈금» — 골드를 10배씩 늘려 가며 일괄 강화.
         예산이 점프 폭을 묶는다(무한 골드로 levelUpAll 을 부르면 한 호출이 만렙까지 간다). */
      if (have() < d0 * STEP && have() < need() / 5) {
        /* 거친 손잡이(일괄 강화·소환 레벨)는 목표의 1/5 아래에서만 — 마지막 구간은 10뽑·골드
           눈금으로만 다가간다. 과충(오버킬 클리핑)보다 소폭 미달이 자로서 안전하다:
           미달은 표본이 «느리게 잡는» 진짜 그림이고, 과충은 실전 DPS 를 처리량 상한으로
           눌러 κ_dps 를 거짓으로 깎는다(10회차 실측 — s200 과충 ×12 에서 κ_dps 2.64 → 0.19). */
        S.gold = budget;
        T('cal.lvl', () => { R2.levelAll(); R2.equipBest(); });
        budget = Math.min(budget * 2, GCAP);
        /* ⓒ 그래도 안 오르면 나머지 축(유물 소환·룬·도감·골드 손잡이) 한 바퀴 */
        if (have() < d0 * STEP) {
          /* 유물 다이아도 예산 눈금 — 고정 1e9 를 주면 이 한 바퀴가 ×10 이상을 점프해
             s200 표본을 ×12 과충시켰다(10회차 실측). */
          S.dia = Math.max(S.dia, rbudget); S.gold = Math.max(S.gold, budget);
          T('cal.rest', () => { R2.relicSummon(); R2.runes(); R2.collection(); R2.equipBest(); });
          rbudget = Math.min(rbudget * 2, RCAP);
          S.dia = 0;
          guard = 0;
          while (go() && guard++ < 400) if (!goldOnce()) break;
          /* ⓓ 마지막 축 — 소환 «레벨»(등급 개방 · `S.sum[b].lv`). 만렙 50 까지 26.8만 뽑이라
             뽑기로 올리면 보정이 분 단위가 된다 — 레벨을 한 눈금씩 직접 올린다. 늦은 구간
             (s800+)의 캐릭터는 실플레이로도 이 레벨대를 갖고 있으므로(d120 실측 — 봇이
             하루 천여 뽑을 한다) «어울리는 캐릭터» 규약 안이다. 다른 어떤 손잡이 조합도
             s800 목표에 못 닿는 것을 실측한 뒤에만 온다(이 분기 순서가 그 증명이다). */
          if (have() < d0 * STEP) {
            /* ⚑ 714 (주인 지시 2026-09-02) — 소환 레벨이 **배너마다 독립**이 됐다.
               봇의 «한 눈금» 도 다섯 칸을 같이 올린다(한 칸만 올리면 다른 네 배너의 등급 개방이
               영영 Lv1 에 묶여 «어울리는 캐릭터» 가 아니게 된다). ⚠ 199 는 이 축의 비용이
               ×5 가 된 것을 계수에 반영해야 한다 — 만렙까지 26.8만 뽑 → **133.5만 뽑**. */
            if (typeof SUM_MAXLV === 'number' && BKEYS.some(k => (S.sum[k].lv | 0) < SUM_MAXLV))
              BKEYS.forEach(k => { if ((S.sum[k].lv | 0) < SUM_MAXLV) S.sum[k].lv = (S.sum[k].lv | 0) + 1; });
            /* ⚑ 12회차 — 이 줄이 «진짜 상한» 을 선언하던 자리다. 문턱이 예산 상한과 **같은 수**
               여야 뜻이 선다(«지갑을 다 쓰고도 안 오른다»). 1e33 을 손으로 박아 두면
               `--pumpcap` 을 열어도 옛 자리에서 그대로 끊겨 «열어 봤지만 그대로다» 라는
               거짓 검산이 나온다 — 실제로 이 회차의 첫 스윕이 그렇게 읽혔다. */
            else if (budget >= GCAP) break;            /* 전 축이 다 올랐다 — 예산 상한까지 써도 안 오른다 */
          }
        }
      }
    }
    S.buyQty = qty0;
    S.gold = 0; S.dia = 0;
    return have();
  };
  const pumpTo = (target) => pumpBy(() => stat.dps, () => target);
  /* ══ 615 — 생존 축 ═══════════════════════════════════════════════════════════
     11회차가 남긴 처방: «보정 캐릭터는 `pumpTo` 가 **화력만** 목표에 맞추고 생존은 안 맞춘다
     ⇒ «그 구간에 어울리는 캐릭터» 규약을 생존 축(체력·회복)까지 넓힌다.»
     ⚑ **목표는 취향이 아니라 물리다** — 보스 접촉 피해는 `e.dmg · stat.defMul · sbDef()`
     (index.html 22965)이고 `e.dmg` 는 `eDmg(s) · ETYPE.boss.dmg` 다. 피격 무적이 `player.inv`
     0.4초라 **초당 최대 2.5대**이므로, 제한 시간을 버티는 조건은
         체력 + 창 안 회복  ≥  (한 대 피해) × (BOSS_SEC / 0.4)
     ⚠ `0.4` 는 제품 리터럴(22965)이고 제품이 밖으로 안 내놓는다 — 여기 상수로 적되
       `verify615` 가 «두 값이 같은가» 를 소스로 확인한다(상수를 손으로 두 벌 적는 것의 값).
     ⚠ 이것은 **최악**이다(매 무적 창마다 한 대씩 맞는다). 실제로는 카이팅으로 덜 맞으므로
       목표를 넘긴 캐릭터가 반드시 격파하는 것도, 못 넘긴 캐릭터가 반드시 죽는 것도 아니다 —
       그래서 이 값을 «유효 조건» 이 아니라 **행이 들고 다니는 수(`survPump`)** 로 둔다.
     ⚑ **순서가 곧 분리다** — 이 펌프는 `sampleMobs` **뒤**에 돈다. 몹 축(κ_dps·κ_hp·κ_gold)은
       이미 «화력이 목표에 맞는 캐릭터» 로 찍힌 뒤라 이 펌프가 그 셋을 한 자리도 안 흔든다.
       대신 κ_boss 의 분모는 «이 창을 찍은 캐릭터» 의 화력이어야 한다(calibrateOne 의 dpsBoss). */
  const HIT_IV = 0.4;                               /* = index.html 22965 `player.inv = 0.4` */
  const survNeed = (s) => eDmg(s) * ETYPE.boss.dmg * stat.defMul * sbDef() * (BOSS_SEC / HIT_IV);
  const survHave = () => stat.maxHp + stat.regen * BOSS_SEC;
  /* 방어력·체력·회복은 `stat.dps` 에 한 항도 안 들어가므로(`stat.dps` 는 atk·aspd·crit·cdmg·
     pierce 와 `bonus().atk` 로만 만들어진다) 이 세 손잡이는 화력을 안 흔든다 — 그래서 **먼저**
     민다. 여기서 목표에 닿으면 공용 축(소환·일괄 강화)을 안 건드리고 끝난다. */
  const survOnce = () => {
    let bought = false;
    for (const id of ['hp', 'regen', 'def']) {
      const u = U[id]; if (!u) continue;
      const bi = buyInfo(u);
      if (!bi || !bi.n) continue;
      S.gold = Math.max(S.gold, bi.cost);
      applyBuy(u, bi.n, bi.cost); markDirty(); bought = true;
    }
    for (const id of TRAIN_STATS) {
      if (id === 'atk') continue;                   /* 훈련 «공격력» 은 화력 축이라 여기서 안 산다 */
      const bi = trainBuyInfo(id);
      if (!bi || bi.full || !bi.n) continue;
      S.gold = Math.max(S.gold, bi.cost);
      if (trainBuy(id)) bought = true;
    }
    return bought;
  };
  /* ⚑ 615 — «어울리는 캐릭터» 는 **두 쪽이다.** 생존을 맞추려고 화력을 무한히 밀면 그 캐릭터는
     보스를 한 대에 지워 버리고(실측 s500 에서 창 1.00초 · 과충 ×3.96e7), κ_boss 는 «죽기 전까지»
     대신 **오버킬 클리핑**을 재게 된다 — 결손을 옆으로 옮긴 것뿐이다. 그래서 공용 축으로 넘어간
     구간에는 상한을 둔다. 값 4 는 **관측된 자연 폭의 두 배**다(r10·r11 유효 행의 pump 1.03~2.24).
     ⚠ 문턱을 표본에 맞춰 깎은 것이 아님을 그 폭이 말한다 — s200 이 목표를 채우려면 **×1.75e3**,
       s500 은 **×3.96e7** 이 필요하다(probe615 실측). 4 를 40 이나 400 으로 적어도 판정은 같다. */
  const BOSS_OVER = 4;
  const pumpSurv = (s, dps0) => {
    const qty0 = S.buyQty; S.buyQty = 1;
    let guard = 0;
    while (survHave() < survNeed(s) && guard++ < 4000) if (!survOnce()) break;
    S.buyQty = qty0; S.gold = 0;
    /* 순수 생존 손잡이가 바닥나면 공용 축(소환·장비·유물·룬·도감)으로 이어 민다 —
       방패 슬롯이 `bonus().hp` 를 올리는 유일한 큰 축이다(index.html `bonus()` — shield → b.hp).
       ⚠ 이 구간은 화력도 같이 올리므로 위 상한에서 멈춘다. 행이 `dpsBoss`·`bossOver` 를 들고
       다니므로 «어디서 멈췄는가» 는 표가 말한다. */
    const base = dps0 > 0 ? dps0 : stat.dps;
    if (survHave() < survNeed(s))
      pumpBy(() => survHave(), () => survNeed(s), () => stat.dps > base * BOSS_OVER);
    const have = survHave(), need = survNeed(s);
    return { have, need, ratio: need > 0 ? have / need : null };
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
    let f = 0, seen = false, f0 = 0, hp0 = 0;
    /* ⚑ 12회차(615) — **창이 왜 끝났는가**를 행이 들고 다닌다. 11회차는 «격파했나» 만 참말로
       만들었고 «아니면 무엇이었나» 는 여전히 표 밖(본문 추적)이었다 — 그래서 원인이 다시
       잠복할 수 있었다. 사망은 판정이 아니라 **관측**이다: `playerDied()` 가 부르는 실패 경로가
       `enemies` 를 비우므로(458) 그 프레임에 보스도 같이 사라진다 = 옛 판정이 «격파» 로 읽던 그 길. */
    let died = false, pHp0 = 0, pMin = Infinity;
    for (; f < cap; f++) {
      step(1 / 30);
      if (seen) { pMin = Math.min(pMin, player.hp); if (player.hp <= 0 || player.dead > 0) died = true; }
      const b = enemies.find(e => e.tk === 'boss' && e.born >= 0.3);
      if (b && !seen) { seen = true; f0 = f; hp0 = b.hp; pHp0 = player.hp; pMin = player.hp; meterReset(); }
      else if (seen && !b) break;
    }
    const sec = seen ? (f - f0) / 30 : 0;
    /* ⚑ 11회차 — «격파» 를 «보스가 필드에서 사라졌다»(seen && f < cap)로 읽던 것을 고쳤다.
       실패 프로브 3행(s640·800·1200)이 **전부 «격파 true»** 로 나왔는데 실측은 그 반대다:
       화력 1.17e33 · 보스 실전 2.67초에 준 피해가 보스 체력의 0.1% 다. 보스가 사라진 것은
       격파가 아니라 **판이 끝난 것**이고(플레이어 사망 — s640 은 60초 처치 0마리인 자리다),
       옛 자는 그 둘을 못 갈랐다.
       ⚠ 제품 신호 `bossClear` 를 읽는 길은 막혀 있다 — 23330 안전망이 «`bossClear.md !==
       bossMode()` 면 그 프레임에 null» 이라 보정 컨텍스트에서는 프레임 밖에서 절대 안 보인다
       (실측: 격파 여부와 무관하게 clr 프레임 0). `S.stage` 증가도 475 가 시퀀스 끝으로 옮겨
       같은 안전망에 걸린다.
       ⇒ **물리로 판정한다** — 창 안에 준 피해가 창 시작 시점의 보스 체력을 덮었는가.
       (`meterReset()` 과 `hp0` 을 같은 프레임에 잡으므로 두 값은 같은 자 위에 있다.) */
    /* ⚠ 여유 1e-9 — `dmgAcc` 는 매 타격을 `min(dmg, e.hp)` 로 잘라 더한 값이라 격파면 합이
       `hp0` «과 같아야» 하는데 부동소수 누적이 마지막 자리에서 모자란다(s100 실측 0.999…).
       여유가 없으면 실제 격파가 «미격파» 로 읽힌다 — 이 자리는 문턱이 아니라 반올림이다. */
    const killed = seen && hp0 > 0 && dmgAcc >= hp0 * (1 - 1e-9);
    /* 창이 끝난 이유 — 넷뿐이고 순서가 곧 우선순위다(격파 프레임에 사망이 겹칠 수 있다). */
    const endBy = !seen ? 'none' : killed ? 'kill' : died ? 'death' : f >= cap ? 'cap' : 'gone';
    return { sec, dmg: dmgAcc, killed, hp0, endBy, died,
             pHp0, pMin: isFinite(pMin) ? pMin : null, pMaxHp: stat.maxHp };
  };

  /* ⚑ 10회차 — 앵커마다 **새 캐릭터**로 잰다(Node 가 앵커마다 새 페이지에서 calibrateOne 을
     부른다). 한 캐릭터로 체크포인트를 이어 돌면 소환 축이 생긴 뒤로는 앞 앵커의 화력이
     다음 앵커의 목표를 이미 넘어(실측 s200 에서 ×12.25) 내릴 방법이 없다 — 과충은 오버킬
     클리핑으로 κ_dps 를 거짓으로 깎는다. kGuess 되먹임은 Node 쪽이 행 사이에서 잇는다. */
  /* 11회차(정정7) — 앵커가 «그 구간에 어울리는 캐릭터» 로 찍혔는가를 **행 자신이** 들고 다닌다.
     둘 다여야 유효: ⓐ 화력이 목표에 닿았다(pump ≥ 0.5) ⓑ 몹 표본이 대역 안이다(60초 처치 > 3
     — 231행 «60초 0마리 = 대역 밖»). r10 유효 7행은 pump 1.03~2.24 · 처치 62~153 이라 이
     문턱 어디에도 안 걸린다 — 문턱을 표본에 맞춰 깎은 것이 아님을 그 폭이 말한다.
     ⚠ **«보스를 잡았는가» 는 유효 조건에서 뺐다** — 넣었더니 12앵커 중 **8개가 무효**가 됐고,
     그것이 이 회차의 두 번째 실측이다(등재 615): 보스 표본이 격파로 끝나는 것은 **4/12**
     (s10·30·50·100)뿐이고 **s1 과 s200 이상은 전부 플레이어 사망으로 끝난다**(s1 추적 실측 —
     체력 165 → 0 · 보스 체력 잔량 47% · `bossT` 13/15 라 시간 초과도 아니다 · 창 안 피해가
     보스 체력의 s200 13.0% · s400 18.8% · s500 7.1% · s560 6.2%).
     κ_boss 는 그 구간에서 «격파까지» 가 아니라 «죽기 전까지» 를 잰 값이라 축을 다시 세워야
     하는데, 그 자리에서 κ_hp·κ_gold·κ_dps(몹 축 — 별도 60초 파밍 표본이라 이 결손과 무관)까지
     같이 버리면 자가 통째로 선다.
     ⇒ 몹 축은 살리고 보스 축의 결손은 **`bossKilled` 를 참말로 만들어 표에 드러낸 채** 넘긴다. */
  const PUMP_MIN = 0.5;
  /* ⚑ 199 13회차 — 유효 조건이 **셋**이 됐다(12회차 정정3·4 · EE 처방 1·2).
     ⓒ **판정 분모에서 `kGuess` 되먹임을 뺀다**(`pump0`). 옛 `pump` 는 목표가
        `target0 / kGuess` 라, 같은 s640 이 앵커 목록에 따라 ×1.678 움직였다(12-2-1 실측) —
        스윕마다 문턱의 뜻이 달라지는 자였다. `pump0 = formDps / target0` 은 제품항만의 비다.
        ⚠ `kGuess < 1` 이라 `pump0 = pump / kGuess ≥ pump` = **문턱이 느슨해지는 방향**이다.
        r12 표에서 유효 행은 pump 1.03~2.24 · 실패 행은 ≤ 0.02 라 이 교체로 뒤집히는 행은 없다
        (s640 은 0.0311 → 0.052 로 여전히 미달) — 축을 바꾸되 표본은 안 건드렸다는 증거다.
     ⓓ **«다른 캐릭터인가»** — 12회차가 s600·620·630·639 에 앵커를 끼워 «창을 줄였다» 고
        적었으나 넷의 `formDps` 가 16자리까지 같았다(같은 캐릭터에 목표만 낮게 준 것).
        그 위에서 κ_dps 가 ±17% 로 흔들리고 `kAt` 이 그것을 곡선으로 읽는다. ⇒ 직전 **유효**
        앵커 대비 화력이 ×1.05 이상 오른 행만 유효로 세고, 미달 행은 `sameBuild` 로 접는다. */
  const BUILD_MIN = 1.05;
  const calValid = r => r.pump0 != null && isFinite(r.pump0) && r.pump0 >= PUMP_MIN
                     && (r.kills | 0) > 3
                     && !(r.buildRat != null && r.buildRat < BUILD_MIN);
  /* ⚑ 615 — **보스 축은 자기 유효 조건을 따로 갖는다.** 몹 축(κ_dps·κ_hp·κ_gold)과 보스 축
     (κ_boss)은 서로 다른 캐릭터로 찍히므로(생존 펌프가 그 사이에 돈다) 한 `valid` 로 묶으면
     둘 중 하나가 반드시 거짓말을 한다. 둘 다여야 유효:
       ⓐ **창이 격파로 끝났다** — 11회차가 물리로 세운 그 판정. 안 그러면 κ_boss 는
          «죽기 전까지» 를 잰 값이다(이 행이 등재된 이유 그 자체).
       ⓑ **화력 과충이 상한 안이다** — 격파했어도 한 대에 지웠으면 그 수는 클리핑이다.
     판정식은 여기 한 곳이다(표 두 벌 금지 — `calValid` 와 같은 규약). */
  const bossValid = r => r.bossKilled === true
                      && r.bossOver != null && isFinite(r.bossOver) && r.bossOver <= BOSS_OVER;
  /* ⚑ 16회차(정정5) — **κ_hp·κ_gold(몹 성질 축)도 자기 유효 조건을 따로 갖는다.**
     둘은 «처치당 비»(mob.hpRat/kills · goldRat/kills)라 **표본이 대역 안이기만 하면**(처치 > 3)
     캐릭터의 화력 사정과 무관하다 — 몹 하나의 체력·골드는 누가 잡아도 같은 수다.
     15회차까지는 `valid`(화력 축: pump0 ≥ 0.5 · 같은 캐릭터 접기)로 같이 걸러서,
     s700(86킬 · buildRat 1.000 «접힘»)·s760(34킬 · pump0 0.33 «화력 미달»)의 몹 표본이
     통째로 버려졌고 그 결과 s840 에서 κ_hp·κ_gold 가 1e-9 바닥에 물렸다([C] 골드 −98.3% —
     15-9 정정4 «이 회차가 만든 손해»). 넣으면 s840 κ_hp → 0.492 · κ_gold → 0.831(정정5 실측).
     ⚠ **κ_dps 는 그대로 `valid` 로 거른다** — 그 비의 분모가 `formDps`(그 행을 찍은 캐릭터)라
     같은 캐릭터 중복 행이 ±17% 잡음을 만들던 자리(13회차 ⓓ)가 바로 κ_dps 다.
     판정식은 여기 한 곳이다(표 두 벌 금지 — `calValid`·`bossValid` 와 같은 규약). */
  const mobValid = r => (r.kills | 0) > 3;
  /* 615 — 재현 프로브가 **같은 조각**을 부른다(사본을 짜면 자와 프로브가 갈린다). */
  B.pumpTo = pumpTo; B.pumpSurv = pumpSurv; B.BOSS_OVER = BOSS_OVER; B.sampleBoss = sampleBoss; B.sampleMobs = sampleMobs;
  B.survHave = survHave; B.survNeed = survNeed;
  B.calibrateOne = (s, sec, kGuess, prevForm) => {
    S.stage = s; S.best = Math.max(S.best, s);
    /* 13회차 — 목표를 둘로 가른다. `target0` = 제품항만(되먹임 없음, 판정의 분모) ·
       `target` = 그것을 직전 유효 앵커의 κ_dps 로 나눈 값(옛 규칙 그대로, 펌프의 목표). */
    const target0 = eHp(s) * ETYPE.boss.hp * bossGateHp(s) / (BOSS_SEC * 0.5);
    const target = target0 / (kGuess || 1);
    const dpsNow = pumpTo(target);
    const m = sampleMobs(s, sec);
    /* ⚑ 12회차(615) — 여기서 축이 갈린다. 몹 표본은 위에서 «화력이 목표에 맞는 캐릭터» 로
       이미 찍혔고, 보스 표본은 그 아래에서 «그 보스전을 실제로 치를 수 있는 캐릭터» 로 찍는다.
       순서를 바꾸면(생존 펌프를 몹 표본 앞에 두면) κ_dps 가 과충 클리핑으로 무너진다. */
    const sv = pumpSurv(s, dpsNow);
    const dpsBoss = stat.dps;                        /* κ_boss 의 분모 = **이 창을 찍은** 캐릭터 */
    const b = sampleBoss(s);
    const kDps = (m.dmg / sec) / (dpsNow || 1);
    const row = {
      s, sec, formDps: dpsNow, realDps: m.dmg / sec, kDps,
      pump: target > 0 ? dpsNow / target : null,   /* 달성/목표 비 — 1 에서 멀면 «어울리는 캐릭터» 밖 */
      /* 13회차 — **판정은 이 칸**이다(되먹임 없는 제품항 비). `pump` 는 재현·회차 간 비교용으로 남긴다. */
      pump0: target0 > 0 ? dpsNow / target0 : null,
      target, target0,                             /* 재현용 — 실패 프로브의 «목표» 가 표에 남아야 좌표가 산다 */
      /* 13회차 — 직전 «유효» 앵커 대비 화력비. null 이면 첫 유효 앵커(비교 대상 없음). */
      buildRat: prevForm > 0 ? dpsNow / prevForm : null,
      kills: m.kills,
      tKill: m.kills ? sec / m.kills : null,
      kHp: m.kills ? m.hpRat / m.kills : null,
      kGold: m.kills ? m.goldRat / m.kills : null,
      bossSec: b.sec, bossKilled: b.killed,
      /* 12회차(615) — 창이 왜 끝났는가 + 생존 축의 실측치. 이 넷이 없으면 «격파 n/N» 은
         숫자만 있고 원인이 없다(11회차가 본문 추적으로만 갖고 있던 자리). */
      bossEndBy: b.endBy, bossDied: b.died, pMaxHp: b.pMaxHp, pMin: b.pMin,
      /* 11회차 — «격파» 판정의 두 재료를 행에 남긴다(판정만 남기면 왜 그렇게 읽혔는지 못 캔다) */
      bossHp0: b.hp0, bossDmg: b.dmg, bossDmgRat: b.hp0 > 0 ? b.dmg / b.hp0 : null,
      /* 12회차(615) — 생존 축의 달성/목표. `pump` 와 같은 꼴이라 나란히 읽힌다.
         ⚠ 1 을 넘겨도 «반드시 격파» 는 아니다 — 목표가 최악(초당 2.5대)이라 여유가 있는 쪽이다. */
      survHave: sv.have, survNeed: sv.need, survPump: sv.ratio, dpsBoss,
      bossOver: dpsNow > 0 ? dpsBoss / dpsNow : null,   /* 생존 펌프가 화력을 몇 배 밀었나 */
      kBoss: b.sec > 0 ? (b.dmg / b.sec) / (dpsBoss || 1) : null,
    };
    row.valid = calValid(row);
    /* 13회차 — «왜 무효인가» 를 행이 들고 다닌다(판정만 남기면 다음 세대가 원인을 못 캔다).
       ⚠ 한 행이 **둘 다** 어길 수 있다(s800 은 화력도 미달이고 앞 앵커와 같은 캐릭터이기도
       하다). 그때의 이름은 «화력 미달» 이다 — 좌표 문장이 읽는 것이 그 갈래이고, 접기는
       «앵커가 남아돈다» 는 뜻일 뿐 좌표와 무관하다. */
    row.sameBuild = row.buildRat != null && row.buildRat < BUILD_MIN;
    row.powerOk = row.pump0 != null && isFinite(row.pump0) && row.pump0 >= PUMP_MIN && (row.kills | 0) > 3;
    row.failBy = row.valid ? null : (row.powerOk ? 'build' : 'power');
    row.bossValid = bossValid(row);
    /* 16회차(정정5) — κ_hp·κ_gold 는 이 칸으로 걸러진다(행이 판정을 들고 다닌다 — 615 규약). */
    row.mobValid = mobValid(row);
    return row;
  };
  B.calibrateFloor = () => {
    S.stage = 1;
    pumpTo(eHp(1) * ETYPE.boss.hp / (BOSS_SEC * 0.5) * 1000);
    const f = sampleMobs(1, 30);
    return { tFloor: f.kills ? 30 / f.kills : 1, floorKills: f.kills };
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
    /* 11회차(정정7) — 캐시에 «실패 프로브» 행(화력이 목표에 못 닿은 앵커)이 같이 실린다.
       그 행의 κ 는 «전장의 모양» 이 아니라 화력 미달이 만든 수라 자에서 뺀다.
       옛 세대 캐시(r10 이하)에는 `valid` 가 없고 유효 행만 실려 있었다 → «없으면 유효». */
    /* ⚑ 12회차(615) — 축마다 유효 조건이 다르다. κ_boss 는 «격파로 끝났고 과충이 상한 안인»
       행만 읽는다(`bossValid`) — 안 그러면 «죽기 전까지» 를 잰 수가 곡선에 들어온다.
       옛 세대 캐시(r11 이하)에는 `bossValid` 가 없다 → «없으면 유효»(11회차 `valid` 와 같은 규약).
       ⚑ 16회차(정정5) — κ_hp·κ_gold 는 `mobValid`(처치 > 3)로 읽는다: 처치당 비라 화력 축
       탈락(접힘·미달)과 무관하다. s700·s760 이 여기 들어와 s840 κ_hp 1e-9 → 0.492 가 된다.
       κ_dps 는 그대로 `valid`(분모가 그 행의 캐릭터라 중복 행 잡음이 실재하는 축).
       옛 세대 캐시(r15 이하)에는 `mobValid` 가 없다 → `valid` 로 되짚는다(같은 규약). */
    const okRow = r => key === 'kBoss' ? r.bossValid !== false
                : (key === 'kHp' || key === 'kGold') ? (r.mobValid != null ? r.mobValid === true : r.valid !== false)
                : r.valid !== false;
    const rows = B.cal.rows.filter(r => okRow(r) && r[key] != null && isFinite(r[key]) && r[key] > 0);
    if (!rows.length) return B.cal[key] || 1;
    if (s <= rows[0].s) return rows[0][key];
    for (let i = 1; i < rows.length; i++) {
      if (s <= rows[i].s) {
        const a = rows[i - 1], b = rows[i];
        const t = (Math.log(s) - Math.log(a.s)) / (Math.log(b.s) - Math.log(a.s));
        return a[key] + (b[key] - a[key]) * t;
      }
    }
    /* 10회차(정정2 — Z) — 마지막 앵커 밖은 클램프가 아니라 **같은 log(s) 선형의 외삽**이다.
       9회차까지는 s>200 전부가 s200 값 고정이었다(«결정적 ≠ 정확»). 외삽 폭이 큰 실행은
       표 머리의 «κ 외삽» 경고가 같이 말한다 — 앵커(s1200)를 넘는 구간이 좁을 때만 믿어라. */
    if (rows.length < 2) return rows[rows.length - 1][key];
    const a = rows[rows.length - 2], b = rows[rows.length - 1];
    const t = (Math.log(s) - Math.log(a.s)) / (Math.log(b.s) - Math.log(a.s));
    return Math.max(1e-9, a[key] + (b[key] - a[key]) * t);
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
  /* ⚑ 199 10회차(정정4 — Z) — 우편은 한 바구니가 아니다. «📅 월별 다이아»(180 · `src:'monthly'`
     · 월 100,000)는 영구 반복인데 9회차까지 통째로 일회성 장부(`ONCE`)에 있어 대충 꼬리율이
     +3,333/일(+7.7%) 과소였다. 수령 직전에 월별분을 세어 두고, 수령 후 그 몫만 «우편(월)» 로
     옮긴다 — 장부 항등식(유입−씽크=잔고)은 행 사이 이동이라 그대로 성립한다. */
  R.mail   = () => T('우편', () => {
    const mon = (typeof allMails === 'function' ? allMails() : [])
      .filter(m => !S.mail[m.id] && m.src === 'monthly')
      .reduce((a, m) => a + (m.c || 0), 0);
    claimAllMail();
    ledger('우편(1회성)');
    const moved = Math.min(mon, B.diaIn['우편(1회성)'] || 0);
    if (moved > 0) {
      B.diaIn['우편(1회성)'] -= moved;
      B.diaIn['우편(월)'] = (B.diaIn['우편(월)'] || 0) + moved;
    }
  });
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
      /* 10회차(정정1 — 3인 일치) — ④ 는 «나눈 값» 이 아니라 **교차 실측**으로 잰다. 그 자가
         스냅마다 누적 장부 세 값을 실어야 선다: 유입 전체 · 일회성 몫 · 소환 외 씽크. */
      inAll: Object.values(B.diaIn).reduce((a, b) => a + b, 0),
      inOnce: (B.onceKeys || []).reduce((a, k) => a + (B.diaIn[k] || 0), 0),
      outNS: Object.keys(B.diaOut).reduce((a, k) => a + (k === '소환' ? 0 : B.diaOut[k]), 0),
      /* ⚑ 14회차 — 13-12 1 «JJ(진행 연동 축) ↔ II(비연동 축) 가 갈리는 유일한 자리이니
         재현으로 먼저 갈라라». 그러려면 **말미 창의 축별 몫**이 있어야 하는데 [E] 는 30일
         누적 평균뿐이었다. 스냅마다 축별 누적을 실으면 D23↔D30 차분 한 번으로 갈린다.
         (표 두 벌 금지 — `inAll` 은 이 사전의 합이라 항등식으로 검산된다: §14-1 [E2].) */
      inBy: Object.assign({}, B.diaIn),
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
/* ⚑ 199 10회차(정정2 — Z) — 앵커가 s200 에서 끝나는데 시뮬은 s1,240 까지 갔다. s>200 전부가
   s200 값 고정(클램프) 위였고 캐시가 그 오차를 7표에 복제했다. 앵커를 s1200 까지 늘리고
   `kAt` 는 마지막 앵커 밖을 클램프가 아니라 **외삽**으로 읽는다(표 머리에 외삽 경고).
   (실측 비용은 9앵커 전체 보정 포함 12초급 — verify494 의 예산(30일 1시드 ≤ 120초) 안이다.) */
/* ⚑ 199 11회차(정정2·정정7 — BB·CC·DD 3인 일치 1순위) — 10회차는 s800·1200 을 «접었다».
   접은 것이 문제였다: ⓐ 상한이 s400 과 s800 사이 어디인지 좌표가 없어 s400 밖 수치(①③④)가
   전부 외삽 위였고 ⓑ «달성/목표 1.2e-13» 이라는 이 루프 최대 실측이 본문·주석에만 있고
   **캐시에 행이 없어 재현 경로가 없었다**(정정7).
   ⇒ 앵커를 **s500·560·640 으로 촘촘히** 세워 상한을 좁히고, 닿지 않는 자리(s800·1200)는
   «접는» 대신 **실패 프로브 행으로 캐시에 남긴다**. 대역 판정은 행 자신이 들고 다닌다
   (`calibrateOne` 이 찍는 `valid` — 측정이 판정한다, 목록이 아니라) 하고, `kAt` 는
   **유효 행만** 보간·외삽에 쓴다. 판정식은 BOT_SRC 안 `calValid` **한 곳**이다(표 두 벌 금지).
   ⚠ 실패 행을 kAt 가 읽으면 안 된다 — pump 1e-13 자리의 κ 는 «전장의 모양» 이 아니라
   화력 미달이 만든 수라, 자에 넣으면 10회차가 걷어낸 클램프보다 더 나쁜 거짓 곡선이 된다.
   ⚠ r10 이하 캐시 행에는 `valid` 가 없다 — 그 세대는 유효 행만 저장했으므로 «없으면 유효» 로
   읽는다(`r.valid !== false`). */
/* ⚑ 199 12회차(11-3 «12회차에게 남긴 지렛대») — 11회차가 상한 좌표를 s560(유효) … s640(실패)
   **80 스테이지 창**으로 좁혔다. `valid` 축이 생긴 뒤로는 앵커를 더 끼우는 것이 싸므로
   그 창 안에 **s580·600·620** 세 자리를 더 세워 창을 **20 스테이지**로 줄인다.
   ⚠ 새 앵커가 셋 다 유효면 상한 창은 s620…s640, 셋 다 실패면 s560…s580 이다 — 어느 쪽이든
   창이 20 으로 준다. 앵커를 늘리면 κ 세대가 바뀌므로 **r11 표와 직접 비교 금지**(정정9 규약).
   ⚠ 유효 행이 늘어난 만큼 참고 평균(kDps·kHp·kGold·kBoss)도 움직인다 — 그 값들은 `kAt` 이
   구간 보간을 못 할 때의 폴백이라 세대 비교 때 같이 봐야 한다.
   ⚑⚑ 첫 스윕(s580·600·620 전부 유효 · s640 실패)이 창을 20 으로 줄이면서 **기제**까지 드러냈다 —
   적 곡선은 완만한 오르막이 아니라 **밴드 계단**이다(`eScale` = 밴드 값 + 밴드 안 ES_RAMP 비탈).
   밴드 안 40 스테이지가 ×2.57 인데 **경계 한 칸이 ×49.49** 다(eHp s639 3.609e32 → s640 1.786e34,
   ⚠ 12회차 비평 FF·GG 정정 — 최초 기록의 «×1.62» 는 20칸 값이었다,
   거기에 관문 ×1.44 가 겹친다). 그래서 «상한이 창 어디에 있는가» 는 창을 반으로 쪼개는 문제가
   아니라 **어느 밴드 경계에서 넘는가** 다 ⇒ 밴드 안 끝(s630·**s639**)을 세워 «경계 직전까지
   닿는가» 를 직접 묻는다. 둘이 유효면 벽의 좌표는 창이 아니라 **한 칸(s640)** 으로 확정된다. */
/* ⚑ 199 15회차 — 앵커를 **s640 위로** 늘렸다(660·680·700·760). 14회차까지 이 목록의 마지막
   유효 앵커가 s639 라 봇 p50(s840~960)의 **전 구간이 외삽**이었고, 14-11 1 이 3회차째 이월한
   처방이 그것이다. 위 `GCAP`/`SGMAX` 수리로 660·680·700 이 실제로 선다(실측 pump0
   **1.529 · 1.772 · 1.573** — 확정 표 `199-calib-r15.json` 의 값이다. ⚠ 15회차가 여기 한 번
   1.75·1.49·1.96 을 적었었는데 그것은 **버린 `--pumpcap=1e60` 스윕**의 값이다(비평가 NN R10 ·
   14-10 정정13 과 같은 사고). s760 은 부분(34킬 · pump0 0.33) · s800·s1200 은 실패 프로브로 남긴다 —
   ⚠ **그 둘의 실패는 이제 «지갑» 이 아니라 배정밀도 상한**이다(골드 예산이 1e300 에서 멎는다). */
/* ⚠ 15회차 — **먼 실패 프로브 둘(s800·s1200)을 뺐다.** 지갑을 고친 뒤 그 행들의 pump0 는
   2.8e-2 · 3.2e-23 이라 좌표를 못 준다 — 프런티어는 **유효 마지막 s680 ↔ 첫 실패 s760**(pump0
   0.33 · 34킬)이 집는다. 뺀 이유는 값이 아니라 **시간**이다: 가망 없는 앵커는 예산이 1e300 에
   닿을 때까지 바퀴(4000)를 다 태워 둘이 보정 시간의 **39.1%**(138 → 84초 · 54초)를 먹었고, 그것이
   `verify494` [2](«30일 1시드 ≤ 120초»)를 빨갛게 만들었다. 필요하면 `--calstages=…,800,1200`. */
const CAL_STAGES = [1, 10, 30, 50, 100, 200, 400, 500, 560, 580, 600, 620, 630, 639, 640, 660, 680, 700, 760];
/* 12회차 — `--calstages=` 로 프로브 스윕을 좁힌다(위 손잡이와 한 벌 · 판정 실행 금지). */
const CAL_LIST = ARG.calstages ? String(ARG.calstages).split(',').map(Number).filter(n => n > 0) : CAL_STAGES;
const CAL_SEC = 60;
/* 615 — 표가 쓰는 «화력 과충 상한» 사본. 판정 자체는 BOT_SRC 안 `BOSS_OVER` 한 곳이고
   여기는 **문장에 수를 적기 위한 것**뿐이다 — `verify615` 가 «두 수가 같은가» 를 소스로 확인한다. */
const BOSS_OVER_DOC = 4;
/* ⚑ 199 10회차 — 일회성 장부 키를 한 곳에 모은다(스냅 `inOnce` 와 [G] 가 같은 목록을 읽어야
   ④ 의 두 자가 어긋나지 않는다). 정정4 — «우편» 을 «우편(1회성)/우편(월)» 로 갈랐다:
   월별분은 지속 수급이다. 레거시 키 «우편» 은 옛 --json 리플레이용으로 남긴다(옛 실행은
   전체 우편이 그 키 하나였고, 그때의 뜻(통째 일회성)을 그대로 보존해 읽는다). */
const ONCE_KEYS = ['시작(신규 지급)', '가이드미션', '우편', '우편(1회성)', '출석(1일차 환영)'];
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
/* 9회차 — WALLBAND(비교 전용 강제 주기)가 있으면 그것이 이긴다. 없으면 제품 밴드.
   10회차 — GEO(기하 관문 격자 재분류)가 있으면 그것이 또 이긴다(리플레이 전용). */
const isWall = (w, band) => GEO ? geoSetOf(band).has(w.stage)
  : w.stage % Math.max(1, WALLBAND || band || 40) === 0;

async function runOne(page, pol, seed, days, onRow) {
  const P = POLICIES[pol];
  const res = await page.evaluate(async (a) => {
    const B = window.BOT, R = B.R;
    B.freeze();
    B.onceKeys = a.once;                /* 10회차 — 스냅 `inOnce` 가 [G] 와 같은 일회성 목록을 읽는다 */
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
    /* ⚑ 199 13회차(12회차 정정1 · GG 처방 2) — **테이프의 끝은 벽이 아니다.**
       12회차가 «대충 20/20 이 밴드 경계 s600 에 걸려 있다» 고 적었는데, 그 정체는 창이 끝나
       잘린 것이었다(45일로 늘리자 전 시드가 돌파). 판별식은 «정체가 관측 끝까지 이어졌는가»
       = `w.amin + w.len === out.amin` 이고, 그것을 사후에 재계산하지 말고 **자를 때 표식**한다.
       표에는 남기되 ① 적중·개수·간격에서는 뺀다(§12-1 실패 프로브와 같은 규약). */
    const pushWall = (trunc) => out.walls.push({
      stage: lastStage, min: stageSince, amin: stageSinceA,
      len: amin - stageSinceA, lenCal: minute - stageSince,
      trunc: !!trunc,
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
          /* ⚑ 673 — 봇은 **버튼을 누르는 유저**여야 한다. `claimOffline(a.offlineMul)` 을 직접 부르면
             650 이 API 쪽에 일부러 남겨 둔 «결손A» 난간(실효 이득 0 인 ×1.5 는 안 준다)에 그대로
             막혀, 부지런 프로필 4번째 수령 **337.5분 = 하루 예산의 23.44%** 가 봇 표에서만 버려진다
             (`node tools/probe673.js` — 유저 1,440분/107,998다이아 vs 옛 봇 1,102.5분/82,686다이아).
             실제 유저의 광고 버튼은 650 이후 이 상태에서 ×1 로 부른다(`#ofrGet15` onclick).
             ⇒ **그 판정을 그대로 읽는다** — 새 문턱을 여기 적으면 402 «표 두 벌» 이 그대로 재발한다. */
          try { offlineReward(lastLogout); claimOffline(offNoGain() ? 1 : a.offlineMul); } catch (_) {}
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
    /* 마지막 정체도 벽으로 센다 — 단 이것은 **관측 창이 끝나서** 잘린 정체다(13회차 `trunc`). */
    if (lastStage >= 0 && amin - stageSinceA >= a.wallMin) pushWall(true);
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
  }, { seed, days, logins: P.logins, activeMin: P.activeMin, offlineMul: P.offlineMul, wallMin: WALL_MIN, once: ONCE_KEYS });
  if (onRow) onRow(res);
  return res;
}

/* ---------------- 재사용 입구(615) ----------------
   ⚑ 615 — 재현 프로브(`tools/probe615.js`)가 **같은 `BOT_SRC` 를** 페이지에 심어야 한다.
   프로브가 자기 사본을 들고 있으면 «표 두 벌» 이라 자와 프로브가 조용히 갈린다(402 처방).
   그래서 이 파일을 `require` 하면 실행부는 돌지 않고 조각만 넘긴다 — CLI 로 부르면 그대로다. */
module.exports = { BOT_SRC, CLOCK, SEEDRNG, URL, ROOT, CAL_STAGES, CAL_SEC };

/* ---------------- 실행 ---------------- */
if (require.main === module) (async () => {
  const t0 = Date.now();

  /* ---- 리플레이 — 시뮬 없이 이전 --json 산출을 현재 분류(--wallband)로 다시 접는다 ---- */
  if (REPLAY) {
    const report = JSON.parse(fs.readFileSync(REPLAY, 'utf8'));
    report.calHash = calHashOf(report.cal);
    report.replayFrom = path.relative(ROOT, REPLAY);
    writeReport(report);
    console.log(`BOT199 — 리플레이 ${report.replayFrom} → ${path.relative(ROOT, OUT)}` + (WALLBAND ? ` (벽 분류 강제 ${WALLBAND})` : ''));
    process.exit(0);
  }

  const browser = await launch(chromium);
  /* 18회차 정정D — 재현줄이 정책을 찍으려면 스냅이 그것을 기억해야 한다(리플레이 포함). */
  const report = { stamp: STAMP, days: DAYS, seeds: SEEDS, policy: POLICY, policies: {}, cal: null, viol: [], warn: [] };

  /* 보정치는 «깨끗한 세이브 한 벌» 에서 한 번만 찍는다 — 정책·시드와 무관한 값이다.
     9회차(정정9) — 값이 «정책·시드와 무관» 이어야 하는데 실측이 실행마다 15% 갈렸다.
     캐시가 있으면 실측 자체를 생략한다(재현 가능성이 정확도보다 먼저다 — 잡음 바닥 ±11.7%
     가 ④ 의 창 ±10% 보다 넓으면 어떤 스윕도 판정 불가다). */
  if (CALIB && fs.existsSync(CALIB)) {
    report.cal = JSON.parse(fs.readFileSync(CALIB, 'utf8'));
    report.calFrom = '캐시 ' + path.relative(ROOT, CALIB);
    if (ARG.nofloor) { report.cal.tFloor = 0; report.nofloor = true; }
  } else {
    /* 10회차 — 앵커마다 새 페이지(새 캐릭터). 한 캐릭터로 이어 돌면 소환 축 이후 앞 앵커의
       화력이 다음 앵커 목표를 이미 넘는다(과충 ×12 실측 — kAt 위 주석). kGuess 는 여기서 잇는다. */
    const calPage = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
      await page.addInitScript(CLOCK, new Date(2026, 0, 1, 8, 0, 0).getTime());
      await page.addInitScript(SEEDRNG, 1);
      await page.goto(URL);
      await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
      await page.evaluate(BOT_SRC, BOTCFG);
      return { ctx, page };
    };
    const rows = [];
    let kGuess = 1;
    /* 13회차 — 직전 «유효» 앵커의 화력. `calValid` 의 ⓓ 항이 이 값을 쓴다(앵커를 끼워도
       같은 캐릭터면 창이 안 줄고 κ 잡음만 는다 — 12회차 정정4). 되먹임과 **같은 자리에서**
       잇는다: 무효 행은 kGuess 도 prevForm 도 안 움직인다. */
    let prevForm = 0;
    for (const s of CAL_LIST) {
      const { ctx, page } = await calPage();
      const row = await page.evaluate(([st, sec, kg, pf]) => { window.BOT.freeze(); return window.BOT.calibrateOne(st, sec, kg, pf); }, [s, CAL_SEC, kGuess, prevForm]);
      await ctx.close();
      /* 11회차 — 되먹임도 **유효 행에서만** 잇는다. 실패 프로브(s800·1200)의 kDps 는 화력
         미달이 만든 수라, 그것을 다음 앵커 목표에 나누면 목표가 거짓으로 헐거워진다.
         (실패 행 뒤에 유효 앵커가 오는 순서는 지금 목록엔 없지만, 앵커를 더 끼울 다음 회차가
         이 줄을 다시 읽는다 — 순서 가정에 기대지 않는다.) */
      if (row.valid) { kGuess = row.kDps; prevForm = row.formDps; }   /* 다음 앵커의 목표·화력 기준에 되먹인다 */
      rows.push(row);
    }
    const fl = await (async () => {
      const { ctx, page } = await calPage();
      const f = await page.evaluate(() => { window.BOT.freeze(); return window.BOT.calibrateFloor(); });
      await ctx.close();
      return f;
    })();
    /* 11회차 — 참고 평균도 **유효 행만**(kAt 과 같은 표를 봐야 한다).
       16회차(정정5) — «같은 표» 가 축마다 다르다: kHp·kGold 는 `mobValid` · kBoss 는 `bossValid` ·
       kDps 는 `valid`. 평균이 kAt 과 다른 행을 읽으면 표 머리의 참고값이 자와 갈린다. */
    const avgOk = (o, k) => k === 'kBoss' ? o.bossValid !== false
                    : (k === 'kHp' || k === 'kGold') ? (o.mobValid != null ? o.mobValid === true : o.valid !== false)
                    : o.valid !== false;
    const avg = (k) => { const v = rows.filter(o => avgOk(o, k)).map(o => o[k]).filter(x => x != null && isFinite(x) && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 1; };
    report.cal = { rows, kDps: avg('kDps'), kHp: avg('kHp'), kGold: avg('kGold'), kBoss: avg('kBoss'),
                   tFloor: fl.tFloor, floorKills: fl.floorKills };
    /* 캐시는 nofloor 오염 전 원본으로 저장한다 — 게이트 손잡이가 캐시에 굳으면 안 된다 */
    if (CALIB) { fs.writeFileSync(CALIB, JSON.stringify(report.cal, null, 1)); report.calFrom = '실측 → 저장 ' + path.relative(ROOT, CALIB); }
    /* 게이트 전용 손잡이(`verify494` 되돌림 시험) — 처치 간격 하한을 0 으로 두면 «화력이 크면
       무한히 빨리 잡는다» 는 5회차 이전의 거짓 모형으로 돌아간다. 그 차이가 표에 실제로
       나타나는지를 게이트가 확인한다. 본 실행에서는 절대 쓰지 마라. */
    if (ARG.nofloor) { report.cal.tFloor = 0; report.nofloor = true; }
  }
  report.calHash = calHashOf(report.cal);
  console.log('[A] 보정치(' + (report.calFrom || '실측') + ' · sha ' + report.calHash + ') — κ_dps ' + report.cal.kDps.toFixed(3) + ' · κ_hp ' + report.cal.kHp.toFixed(3) + ' · κ_gold ' + report.cal.kGold.toFixed(3));

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
      await page.evaluate(BOT_SRC, BOTCFG);
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
/* 9회차 — κ 표 지문. rows 의 수치만 접는다(파일 경로·주석 무관). 12자면 눈으로 대조하기 충분하다. */
function calHashOf(cal) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(cal)).digest('hex').slice(0, 12);
}
function pct(a, b) { return b ? ((a / b) * 100).toFixed(1) + '%' : '—'; }
function med(v) { const w = v.slice().sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)] : 0; }
/* ⚑ 199 13회차(12회차 정정10 — FF #7 · **3회차째 미이행분을 여기서 닫는다**) — 짝수 표본에서
   `med` 는 «상위 한 점» 이라 20시드면 11번째 시드 하나가 판정을 정한다(부지런 최종 dps
   1.784e41 ↔ 보간 1.717e41 = 3.9% 차). 판정은 회차 간 연속성 때문에 `med` 로 두되,
   **판정 줄에는 보간 중앙값을 병기**한다 — 두 수가 갈리면 그 자리가 한 시드에 물린 자리다. */
function medI(v) {
  const w = v.slice().sort((a, b) => a - b);
  if (!w.length) return 0;
  const i = (w.length - 1) / 2, lo = Math.floor(i), hi = Math.ceil(i);
  return w[lo] + (w[hi] - w[lo]) * (i - lo);
}
function q(v, p) { const w = v.slice().sort((a, b) => a - b); return w.length ? w[Math.min(w.length - 1, Math.floor(w.length * p))] : 0; }
function fmtN(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

function writeReport(rep) {
  const L = [];
  L.push(`# 199 봇 플레이 표 — ${rep.stamp}`);
  L.push('');
  /* ⚑ 18회차 정정D(비평 YY 불일치②) — 재현줄이 `--policy` 를 안 찍었다. 단일 정책 표를 그
     명령으로 재실행하면 **[G] 가 있는 다른 표**가 나온다 — 정정1 이 요구한 «원표만으로 재현»
     이 되돌림 시험의 증거물 자신에서 깨져 있었다. */
  L.push(`> \`node tools/bot199.js --days=${rep.days} --seeds=${rep.seeds} --policy=${rep.policy || POLICY}\` · ${rep.replayFrom ? '리플레이 ' + rep.replayFrom : '실행 ' + rep.elapsedSec.toFixed(1) + '초'}`);
  L.push('> **이 표는 계수를 안 건드린 «현재 값» 의 사진이다.** 조정은 199 몫(작업 494 등재문 마지막 줄).');
  L.push(`> [A] κ 표 ${rep.calFrom || '실측(캐시 없음)'} · **calib sha ${rep.calHash || calHashOf(rep.cal)}** — 해시가 같은 표끼리만 «같은 자로 잰 비교» 다(정정9).`);
  if (WALLBAND) L.push(`> ⚠ **벽 분류 주기 강제 ${WALLBAND}** (\`--wallband\` — 밴드 비교 전용. §0 판정에는 자연 정의 표를 써라).`);
  if (LADDEREND) L.push(`> ⚠ **사다리 끝 강제 ${LADDEREND}분** (\`--ladderend\` — 게이트 픽스처 전용. §0 판정에는 자연 정의(172,800분) 표를 써라).`);
  if (GEO) L.push(`> ⚠ **벽 분류 = 기하 관문 격자 ${GEO[0]}×${GEO[1]}^k** (\`--wallgeo\` — 재분류 스윕 전용. §0 판정에는 자연 정의 표를 써라).`);
  if (PUMPSTEPS) L.push(`> ⚠ **보정 프로브 눈금 반복 상한 강제 ${PUMPSTEPS}** (\`--pumpsteps\` — 스윕 전용).`);
  if (PUMPCAP || PUMPRCAP) L.push(`> ⚠ **보정 프로브 예산 상한 강제** (\`--pumpcap\`${PUMPCAP ? ' 골드 ' + PUMPCAP.toExponential(1) : ''}${PUMPRCAP ? ' · 유물 다이아 ' + PUMPRCAP.toExponential(1) : ''} — «자의 지갑 ↔ 게임의 벽» 을 가르는 스윕 전용. §0 판정 표에는 쓰지 마라).`);
  if (ARG.calstages) L.push(`> ⚠ **보정 앵커 목록 강제** (\`--calstages=${ARG.calstages}\` — 프로브 스윕 전용. κ 표가 부분집합이라 본 판정에 쓰면 안 된다).`);
  /* 10회차(정정2 — Z) — 시뮬 최고 스테이지가 κ 앵커 밖이면 그 구간의 ①③④ 전부가 외삽 위다.
     앵커 안이 될 때까지(또는 앵커를 늘릴 때까지) 장기 수치를 표식 없이 믿지 마라. */
  {
    /* 11회차(정정2·정정7) — «마지막 행» 이 아니라 «마지막 **유효** 행» 이 앵커 끝이다.
       실패 프로브 행이 캐시에 실리므로 마지막 행을 읽으면 s1200 이 앵커인 척한다. */
    const calRows = (rep.cal && rep.cal.rows) || [];
    const okRows = calRows.filter(r => r.valid !== false);
    /* ⚑ 13회차 — 무효 행이 **두 종류**가 됐다. 「화력 미달」(pump0 < 0.5 — «이 지갑으로는 못
       세운다» 는 그 좌표) 과 「같은 캐릭터」(화력비 < 1.05 — 앵커가 남아돈다는 뜻일 뿐,
       좌표와 무관하다). 둘을 섞으면 머리글이 «끝 = s639 … s580» 처럼 **거꾸로** 찍힌다
       (13회차 1회차 실측 — sameBuild 로 접힌 s580 이 `badRows[0]` 이 됐다).
       ⇒ 좌표 문장은 **화력 미달 행으로만** 쓴다. */
    /* `failBy` 는 판정 자리(`calibrateOne`)가 붙인다. 13회차 이전 캐시에는 없으므로 그때만
       저장된 칸에서 되짚는다 — 판정을 다시 하는 것이 아니라 **이미 난 판정의 이름**만 붙인다. */
    const failOf = (r) => r.failBy || (r.powerOk === true || (r.pump0 != null && isFinite(r.pump0) && r.pump0 >= 0.5 && (r.kills | 0) > 3) ? 'build' : 'power');
    const foldRows = calRows.filter(r => r.valid === false && failOf(r) === 'build');
    const badRows = calRows.filter(r => r.valid === false && failOf(r) === 'power');
    const maxAnchor = okRows.length ? okRows[okRows.length - 1].s : 0;
    const allRuns = [].concat(...Object.values(rep.policies || {}));
    const maxStage = allRuns.reduce((m, r) => Math.max(m, (r.final && (r.final.best || r.final.stage)) || 0), 0);
    /* ⚠ 유효 앵커가 0 이어도 표는 나와야 한다 — 그 상태 자체가 실측 결과이고, 여기서 죽으면
       «자가 그렇게 읽었다» 는 증거가 통째로 사라진다(LESSONS 319 — 즉사 대신 그 칸만 빨갛게). */
    if (!okRows.length) L.push(`> ⛔ **유효 κ 앵커 0개** — ${calRows.length}행 전부 «대역 밖» 으로 읽혔다. 아래 ①③④ 는 자가 서 있지 않다(κ 는 폴백 1.0). [A] 표의 «자에 쓰나» 열부터 읽어라.`);
    if (badRows.length && okRows.length) {
      const firstBad = badRows[0], lastOk = okRows[okRows.length - 1];
      L.push(`> ⚑⚑ **보정 프로브가 닿는 화력의 끝 — 실측 좌표 s${maxAnchor} … s${firstBad.s} 사이**(11회차 · 정정7 · ⚠ **12회차 정정: 이것은 «게임의 벽» 이 아니라 «이 지갑으로 세운 캐릭터의 끝» 이다** — **15회차 정정: 그 «지갑» 이 기본값이었던 것이 자의 결함이었다** — 기본 상한을 1e33·1e12 → **1e300·1e250**, 바퀴 상한을 600 → **4000** 으로 열자 같은 손잡이 없이 s660·s680·s700 이 선다(확정 표 pump0 **1.529·1.772·1.573** · 프런티어 s639 → s680). 지금 남은 실패는 **예산 상한 1e300 + 수확체감 지수 0.0105**(15-9 정정7 — 필요 예산 ≈1e448 이 double 이 담을 수 있는 수를 넘는다: 형(型)이 아니라 펌프의 수확체감이 벽이다)이다. 같은 표의 30일 봇이 그 위를 걷는 것이 그 증거다). 유효 앵커 마지막 = **s${maxAnchor}**(pump ${lastOk.pump == null ? '—' : lastOk.pump.toFixed(2)}) · 첫 실패 프로브 = **s${firstBad.s}**(pump ${firstBad.pump == null ? '—' : firstBad.pump.toExponential(1)} — 전 축 만개 후에도 목표의 그만큼). 실패 행도 [A] 표에 «✖ 대역 밖» 으로 실려 있다(재현 경로 있음).`);
      /* ⚑ 12회차 — 창이 «밴드 경계 한 칸» 으로 좁혀졌으면 표가 그렇게 말해야 한다.
         적 곡선은 완만한 오르막이 아니라 밴드 계단이라(밴드 안 40칸 ×2.57 ↔ 경계 한 칸 ×49.49),
         상한이 창의 «어디쯤» 인가가 아니라 **어느 경계에서 넘는가** 가 답이다.
         마지막 유효 앵커가 경계 직전 칸이면 좌표는 창이 아니라 한 칸이다. */
      const BANDA = (allRuns[0] && allRuns[0].band) || 40;
      if (firstBad.s % BANDA === 0 && maxAnchor === firstBad.s - 1) {
        /* ⚑ 12회차 비평 FF(#2) 정정 — 목표 비(`target`)에는 `kGuess` 되먹임이 섞여 있어
           «제품의 계단» 이 아니다. 계단은 제품항만으로 찍는다(관문 배수 포함).
           `target = eHp·boss.hp·bossGateHp / (BOSS_SEC·0.5) / kGuess` 이므로 제품항 비는
           `eHp·bossGateHp` 비다 — 행에 남은 두 수로는 못 나누니 캐시에 실린 목표에서
           kGuess 몫을 빼지 못한다. ⇒ 비 대신 **두 수를 그대로 병기**하고 «자의 추정 포함» 을 밝힌다. */
        const jump = firstBad.target && lastOk.target ? firstBad.target / lastOk.target : null;
        L.push(`> ⚑ **그 좌표는 기본 지갑 아래에서 한 칸이다 — 밴드 경계 s${firstBad.s}**(12회차). 경계 직전 칸 s${maxAnchor} 은 닿고(pump ${lastOk.pump == null ? '—' : lastOk.pump.toFixed(2)}) 경계 첫 칸 s${firstBad.s} 은 못 닿는다(pump ${firstBad.pump == null ? '—' : firstBad.pump.toExponential(1)}) — 한 칸 사이 목표 ×${jump == null ? '—' : jump.toPrecision(3)}(⚠ \`kGuess\` 되먹임 포함 — 제품항만의 계단은 \`eHp·bossGateHp\` 비로 따로 재라. 12회차 실측 ×71.26). 밴드 안 오르막이 아니라 **경계 계단**이 화력을 추월한다(밴드 폭 ${BANDA} · 관문 배수 포함).`);
      }
    }
    /* ⚑ 13회차 — 접힌 앵커를 머리글이 직접 말한다. 12회차가 «앵커를 끼워 창을 줄였다» 고
       적은 자리가 여기다 — 접힌 개수가 곧 «그 주장이 몇 칸에서 성립 안 했나» 다. */
    if (foldRows.length) L.push(`> ⚑ **같은 캐릭터로 접힌 앵커 ${foldRows.length}개 — s${foldRows.map(r => r.s).join(' · s')}**(13회차 · 12회차 정정4). 직전 유효 앵커 대비 화력비가 ×1.05 미만이라 «새 캐릭터로 잰 새 좌표» 가 아니다(실측 화력비 ${foldRows.map(r => '×' + (r.buildRat == null ? '—' : r.buildRat.toPrecision(3))).join(' · ')}). 12회차가 이 앵커들을 끼우고 «창을 s620…s640 으로 줄였다» 고 적었으나, 접고 나면 그 주장이 근거로 삼은 칸이 사라진다 — 남는 것은 창이 아니라 **κ 잡음**이다.`);
    if (maxStage > maxAnchor) L.push(`> ⚠⚠ **κ 외삽** — 시뮬 최고 s${maxStage} > κ 유효 앵커 s${maxAnchor}. 그 밖 구간은 log(s) 선형 외삽이다(정정2) — 앵커를 s${maxStage} 이상으로 늘려 재보정하기 전에는 그 구간 수치에 (외삽) 표식을 붙여 읽어라.${badRows.length ? ` ⚠ 그런데 s${badRows[0].s} 은 **화력 축(κ_dps) 앵커로는 못 선다**(pump0 미달 — 위 줄) — 단 16회차(정정5)부터 **몹 성질 축(κ_hp·κ_gold)에는 그 행의 몹 표본이 쓰인다**([A] «몹 축» △ 칸). «앵커를 늘리면 풀리는» 외삽이 아니라 지갑·수확체감의 문제라는 12·15회차 실측은 그대로다.` : ''}`);
  }
  L.push('');
  L.push('## [A] 보정치 — 실전/수식');
  L.push('');
  /* 13회차 — 칸 둘 신설: **`pump0`**(되먹임 없는 판정 분모 · 정정3) · **화력비**(직전 유효
     앵커 대비 · 정정4). 옛 `pump` 도 남긴다 — 회차 간 비교와 재현 경로가 그 칸에 있다. */
  L.push('| 스테이지 | 실전 DPS | 수식 `stat.dps` | κ_dps | 60초 처치 | 처치 간격 | κ_hp | κ_gold | 보스 실전(초) | 창이 끝난 이유 | 생존(달성/목표) | κ_boss | pump(되먹임 포함) | **pump0(판정)** | **화력비(직전 유효)** | 몹 축 | 보스 축 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rep.cal.rows) {
    /* 11회차 — pump 가 1e-3 아래로 내려가면 소수점 두 자리는 «0.00» 이라 좌표를 못 읽는다 */
    const pumpTxt = r.pump == null ? '— (10회차 이전 표)' : (r.pump < 0.01 ? r.pump.toExponential(1) : r.pump.toFixed(2));
    /* 12회차(615) — «창이 끝난 이유» 와 «생존 달성/목표» 를 표가 직접 말한다.
       옛 표(r11 이하)에는 두 칸이 없다 — 그 세대는 «—» 로 읽는다. */
    const endTxt = r.bossEndBy == null ? (r.bossKilled ? '격파' : '— (11회차 이전 표)')
                 : ({ kill: '격파', death: '**플레이어 사망**', cap: '시간 초과(cap)', gone: '사라짐(원인 미상)', none: '보스 안 섬' })[r.bossEndBy] || r.bossEndBy;
    const svTxt = r.survPump == null ? '—' : (r.survPump < 0.01 ? r.survPump.toExponential(1) : r.survPump.toFixed(2))
                 + (r.bossOver != null && r.bossOver > 1.0000001 ? ` (화력 과충 ×${r.bossOver.toExponential(1)})` : '');
    const p0Txt = r.pump0 == null ? '— (12회차 이전 표)' : (r.pump0 < 0.01 ? r.pump0.toExponential(1) : r.pump0.toFixed(2));
    /* 13회차 — 화력비가 1.05 미만이면 «앵커를 끼웠지만 같은 캐릭터» 다. 그 사실이 표에 없으면
       다음 세대가 또 «창을 줄였다» 고 읽는다(12회차 정정4 가 그렇게 났다). */
    const brTxt = r.buildRat == null ? '— (첫 유효 앵커)'
                : `×${r.buildRat.toPrecision(3)}${r.sameBuild ? ' ⚠ **같은 캐릭터**' : ''}`;
    /* 13회차 — 이름은 «둘 다 어기면 화력 미달» 규약(`failBy`). 옛 캐시는 저장된 칸에서 되짚는다. */
    const failWhy = r.valid === false
      ? (r.failBy || (r.pump0 != null && isFinite(r.pump0) && r.pump0 >= 0.5 && (r.kills | 0) > 3 ? 'build' : 'power')) : null;
    /* 16회차(정정5) — 화력 축 탈락 행도 몹 표본이 대역 안이면 κ_hp·κ_gold 는 자에 쓴다. */
    const mobOkTx = r.mobValid != null ? r.mobValid === true : r.valid !== false;
    const badTxt = failWhy === 'build' ? (mobOkTx ? '△ **접힘**(κ_dps 만 제외 · κ_hp·κ_gold 는 자에 쓴다)' : '✖ **같은 캐릭터**(화력비 < 1.05)')
                 : failWhy === 'power' ? (mobOkTx ? '△ **화력 미달**(κ_dps 만 제외 · κ_hp·κ_gold 는 자에 쓴다)' : '✖ **대역 밖**(실패 프로브)') : '✔';
    L.push(`| ${r.s} | ${fmtN(r.realDps)} | ${fmtN(r.formDps)} | ${r.kDps.toFixed(3)} | ${r.kills} | ${r.tKill == null ? '—' : r.tKill.toFixed(2) + 's'} | ${r.kHp == null ? '—' : r.kHp.toFixed(3)} | ${r.kGold == null ? '—' : r.kGold.toFixed(3)} | ${r.bossSec.toFixed(2)}${r.bossKilled ? '' : ' (미격파)'} | ${endTxt} | ${svTxt} | ${r.kBoss == null ? '—' : r.kBoss.toFixed(3)} | ${pumpTxt} | ${p0Txt} | ${brTxt} | ${badTxt} | ${r.bossValid === false ? '✖ **대역 밖**' : '✔'} |`);
  }
  {
    /* 13회차 — 이 절은 «화력 미달» 행의 재현 경로다. 접힌 행(같은 캐릭터)은 목표에 닿았으므로
       여기 섞으면 «달성/목표» 문장이 거짓이 된다(머리글과 같은 갈래). */
    const bad = (rep.cal.rows || []).filter(r => r.valid === false
      && (r.failBy ? r.failBy === 'power' : !(r.pump0 != null && isFinite(r.pump0) && r.pump0 >= 0.5 && (r.kills | 0) > 3)));
    if (bad.length) {
      L.push('');
      L.push(`· ✖ 행은 **화력 축(κ_dps)과 되먹임에서 뺀다** — 그 자리의 κ_dps 는 «전장의 모양» 이 아니라 **화력 미달**이 만든 수다. ⚠ 16회차(정정5): **κ_hp·κ_gold(처치당 비)는 처치 > 3 이면 그 행도 자에 쓴다** — 몹 하나의 체력·골드는 누가 잡아도 같은 수라 화력 사정과 무관하다(«몹 축» 칸의 △ 표시가 그 행이다).`);
      L.push(`  실패 프로브를 표에 남기는 이유는 10회차 최대 실측(«달성/목표 ${bad[0].pump == null ? '—' : bad[0].pump.toExponential(1)}»)이 본문에만 있고 재현 경로가 없었기 때문이다(정정7).`);
      L.push(`  목표 DPS(재현용): ${bad.map(r => `s${r.s} ${fmtN(r.target)}`).join(' · ')} — 전 축(UPG·훈련·소환·일괄 강화·유물·룬·도감·소환 레벨) 만개 후의 달성치가 앞 칸 «수식 \`stat.dps\`» 다.`);
    }
    /* ⚑ 11회차 등재 615 — 보스 표본이 «격파» 로 끝나는 행이 몇 개인가. 옛 자는 «보스가 필드에서
       사라졌다» 를 격파로 읽어 전 행이 참이었다(거짓 참). 물리 판정(창 안 피해 ≥ 창 시작 체력)
       으로 바꾸자 격파가 **0건**으로 드러났다 — 감추지 말고 표가 매 실행 말하게 한다. */
    const withBoss = (rep.cal.rows || []).filter(r => r.bossDmgRat != null);
    const killedN = withBoss.filter(r => r.bossKilled).length;
    const bOk = withBoss.filter(r => r.bossValid !== false);
    if (withBoss.length) {
      L.push('');
      L.push(`· **보스 축(615)** — 보정 보스 표본 ${withBoss.length}행 중 **격파 ${killedN}행 · κ_boss 를 자에 쓰는 행 ${bOk.length}행**${bOk.length ? `(s${bOk.map(r => r.s).join(' · s')})` : ''}.`);
      if (killedN < withBoss.length)
        L.push(`  · 미격파 ${withBoss.length - killedN}행은 창 안 피해가 보스 체력의 ${withBoss.filter(r => !r.bossKilled).map(r => `s${r.s} ${(r.bossDmgRat * 100).toFixed(1)}%`).join(' · ')} 에서 끝났다 — 끝 이유 칸이 그 원인을 말한다(**플레이어 사망**이면 그 행의 κ_boss 는 «격파까지» 가 아니라 «죽기 전까지» 이고, «보스 실전(초)» 칸도 «격파 소요» 가 아니라 «판이 끝난 시각» 이다).`);
      const over = withBoss.filter(r => r.bossOver != null && r.bossOver > 1.0000001);
      if (over.length)
        L.push(`  · 생존 펌프가 공용 축(소환·장비)까지 간 행 ${over.length}건 — ${over.map(r => `s${r.s} 화력 ×${r.bossOver.toExponential(1)}`).join(' · ')}. 상한은 ×${BOSS_OVER_DOC} 이고 **눈금 하나만큼 넘길 수 있다**(문턱을 눈금 앞에서 본다). 거기서 멈춘 채 생존이 1 에 못 미친 행은 **생존과 화력을 동시에 만족시키는 캐릭터가 그 구간에 없다**는 실측이다.`);
      L.push(`  ⚠ 몹 축(κ_dps·κ_hp·κ_gold)은 이 결손과 무관하다 — 별도 60초 파밍 표본이고, 생존 펌프는 그 표본 **뒤**에 돈다.`);
    }
  }
  L.push('');
  L.push(`**처치 간격 하한 tFloor = ${rep.cal.tFloor.toFixed(3)}초** (s1 에서 대역의 1,000배 화력 · 30초에 ${rep.cal.floorKills}마리)`);
  L.push('');
  L.push('· κ_dps 는 «수식 `stat.dps` 를 실전으로 환산하는 비» 다. **한 수로 접지 않는다** — 표 안에서 단조로 움직이므로');
  L.push('  봇은 log(스테이지) 선형 보간으로 읽는다(저구간에서 `stat.dps` 는 실전보다 후하고, 고구간에서는 반대로 과소평가한다).');
  L.push('· κ_gold 에서 `stat.goldMul` 은 **나눠 뒀다** — 그것은 전장이 아니라 플레이어 스탯이라 접기 쪽에서 따로 곱한다.');
  L.push(`· 참고 평균(한 수로 봐야 할 때만) — κ_dps ${rep.cal.kDps.toFixed(3)} · κ_hp ${rep.cal.kHp.toFixed(3)} · κ_gold ${rep.cal.kGold.toFixed(3)} · κ_boss ${rep.cal.kBoss.toFixed(3)}`);
  L.push('');

  /* ⚑ 17회차(16-8 정정3 — QQ6·RR3·SS6 3인 일치) — ③ 의 축(실오르막)을 [D2] 와 [G] 가
     **같은 함수**로 읽도록 함수 스코프로 끌어올렸다. 16회차까지 [G] «③ 축» 줄은 `netPct`
     (정체 밖 시간 = [D2] 가 «넓은 자 · ③ 축 아님» 이라 명기한 값)를 찍고 있었다 — 같은
     라벨이 두 값을 가리키는 «표 두 벌» 사고(402 계보). 정의는 5·7·13회차의 것 그대로다. */
  /* ⚑⚑ 18회차(17-7 정정1 — TT·VV 1순위 · UU 결손, **3인 일치**) — ④ 교차와 ② 말미 한계를
     [G] 블록 밖(함수 스코프)으로 끌어올렸다. 17회차까지 이 둘은 `if (pols.length > 1)` 안에만
     있어서 **단일 정책 실행은 자기 교차를 자가 못 찍었고**(17-4 가 --policy=casual 로 돌린
     d260 표가 그 자리다), 그 회차의 헤드라인 네 수(248.2 · 215.5 · 103,764 · 92,466)가 전부
     **표 밖 수기 계산**이 됐다 — 세 비평가가 «원표만으로 재현 불가» 로 일치 반박했다.
     ⇒ 정의는 한 벌 그대로 두고 **읽는 자리만 둘로 늘린다**(정책 절 [E2] + [G] 대조표).
     둘이 같은 함수 하나를 읽으므로 «표 두 벌»(402 계보)이 아니다 — 게이트가 두 자리의 값이
     같은 수인지 직접 대조한다(`verify494` [8]). */
  const wA = (w) => (w.amin != null ? w.amin : w.min);
  const actTot = (r) => (r.amin != null ? r.amin : (r.minutes || rep.days * 1440));
  const faceNetOf = (r) => {
    const w = r.walls.filter(x => isWall(x, r.band) && x.trunc !== true); const f = [];
    for (let i = 0; i + 1 < w.length; i++) {
      const a = wA(w[i]) + w[i].len, b = wA(w[i + 1]);
      const pause = r.walls.filter(x => !isWall(x, r.band) && wA(x) >= a && wA(x) < b)
                           .reduce((s, x) => s + Math.min(x.len, b - wA(x)), 0);
      f.push(Math.max(0, b - a - pause));
    }
    return f;
  };

  /* 10회차(정정12 — Z) — §0 의 자기 산수는 소환 Lv50 26,705,000 + 불멸 기대 5종×1,000뽑
     ×100다이아 = 500,000 ⇒ **27,205,000** 이다. 주인의 «2,730만» 은 그 반올림 호칭이고,
     상수가 27,300,000 이면 교차일이 +0.5일급으로 밀린다. 산수 쪽으로 정오한다
     (옛 값 27,300,000 — 1~9회차 표의 도달일은 그 상수 위 수다). */
  const GOAL_DIA = 27205000;
  /* 13회차 — §0 ② 의 «하루 27만» (주인 확정 2026-08-31 00:30). 지금까지 회차마다 손으로
     나눠 왔고 12회차가 «50.7%» 를 본문에만 적었다 — 자가 찍는다(정정7 계열). */
  const GOAL_DAY = 270000;
  /* ⚑ 10회차(정정1 — Y·Z·AA 3인 일치) — ④ 는 «하루치로 나눈 값» 이 아니라 **누적 곡선이
     목표를 지나는 날의 실측**이다. 스냅의 `inAll`/`outNS` 로 교차일을 직접 검출하고,
     창 밖(측정 일수 안에 못 지난 시드)은 **말미 구간율 외삽 + (외삽) 표식**으로 찍는다 —
     9회차의 «전(前)엔 보정, 후(後)엔 무보정» 비대칭 자가 이 한 함수로 사라진다. */
  /* ⚑ 13회차(12회차 FF #9) — 말미 창 `W` 를 **인자로 뺀다.** 12회차가 «W=3 → 199.9 ·
     7 → 174.2 · 29 → 101.2» 를 본문에만 적었는데, ④ 가 판정 줄이면서 그 창 하나에
     ±50% 를 먹는다는 사실이 표에 없으면 다음 세대는 174.2 를 단일 실측으로 읽는다.
     기본값은 옛 식 그대로라 판정 줄의 수는 안 움직인다 — 민감도 행만 늘어난다. */
  const crossOf = (pol, mode, wOpt) => {
    const runs = rep.policies[pol];
    const W = wOpt ? Math.max(1, Math.min(rep.days - 1, wOpt))
                   : Math.max(7, Math.min(30, Math.floor(rep.days / 4)));   /* 말미 구간(일) */
    const vals = [];
    let miss = 0;
    for (const r of runs) {
      const day = (d) => r.rows.filter(x => x.label === 'D' + d)[0];
      const v = (s) => (mode === 'summon' ? s.inAll - s.outNS : s.inAll);
      const end = day(rep.days);
      if (!end || end.inAll == null) { miss++; continue; }           /* 옛 --json — 필드 없음 */
      let hit = null;
      for (let d = 1; d <= rep.days; d++) { const s = day(d); if (s && v(s) >= GOAL_DIA) { hit = { d, ex: false }; break; } }
      if (!hit) {
        const w0 = day(Math.max(1, rep.days - W));
        const rate = w0 ? (v(end) - v(w0)) / Math.max(1, rep.days - Math.max(1, rep.days - W)) : 0;
        if (rate > 0) hit = { d: rep.days + (GOAL_DIA - v(end)) / rate, ex: true };
      }
      if (hit) vals.push(hit);
    }
    if (!vals.length) return null;
    const ds = vals.map(x => x.d), ex = vals.filter(x => x.ex).length;
    /* ⚑ 18회차 정정A(비평 WW6) — 창 이름 `W` 와 **실제로 쓴 구간**은 다른 수다(days=3 이면
       W=7 인데 실구간은 2일). 라벨이 W 만 찍으면 «말미 7일» 이라 읽히므로 실구간을 같이 돌려준다. */
    return { p50: med(ds), p50i: medI(ds), p10: q(ds, 0.1), p90: q(ds, 0.9), ex, n: vals.length, miss, W, span: rep.days - Math.max(1, rep.days - W) };
  };
  /* ⚑ 13회차(12회차 정정4 — «3회차째 미이행» 이라고 적힌 그 항) — **말미 한계 수급.**
     ④ 의 외삽은 «말미 W일 구간율» 로 미는데 그 구간율이 표에 없었다. 없으면 ④ 를 못 검산하고
     (외삽 20/20 이면 ④ 는 **전부** 이 수의 함수다), «수급을 어디서 올릴까» 도 못 정한다 —
     30일 평균은 일회성·초반 미션이 섞여 말미의 실제 기울기보다 크다.
     같은 장부(`inAll` / `inAll − outNS`)·같은 창(W)을 `crossOf` 와 공유한다(표 두 벌 금지). */
  const tailRate = (pol, mode, wOpt) => {
    const runs = rep.policies[pol];
    const W = wOpt ? Math.max(1, Math.min(rep.days - 1, wOpt))
                   : Math.max(7, Math.min(30, Math.floor(rep.days / 4)));
    const v = (s) => (mode === 'summon' ? s.inAll - s.outNS : s.inAll);
    const vals = [];
    for (const r of runs) {
      const day = (d) => r.rows.filter(x => x.label === 'D' + d)[0];
      const end = day(rep.days), w0 = day(Math.max(1, rep.days - W));
      if (!end || end.inAll == null || !w0) continue;
      const span = rep.days - Math.max(1, rep.days - W);
      if (span > 0) vals.push((v(end) - v(w0)) / span);
    }
    return vals.length ? { p50: med(vals), p50i: medI(vals), n: vals.length, W, span: rep.days - Math.max(1, rep.days - W) } : null;
  };
  /* ⚑ 18회차 — **셀 서식까지 공유한다.** 값을 같은 함수로 재도 서식이 갈리면 두 자리의 수가
     같은 수인지 눈으로도 자로도 대조할 수 없다(정정1 이 요구한 것은 «재현 가능» 이다). */
  const LEDGER = { in: '유입 장부', summon: '소환 예산 장부(결2 ⓐ 확정 2026-09-01 — ④ 의 판정 장부)' };
  /* ⚑ 18회차 정정B(비평 WW3·XX1·XX3) — **제목까지 한 벌**이다.
     ⓐ 밴드가 `toFixed(0)` 이라 p50 24.7 이 «[25~25]» 밖으로 읽혔다(자기 값을 안 품는 범위).
     ⓑ 제목의 «실측» 은 «교차를 검출했다» 는 뜻인데 셀의 «(외삽 n/n)» 과 한 줄에서 부딪혀
        17-1 정정3(라벨 하나가 두 값)과 동형이었다 ⇒ 제목을 «교차 검출» 로 바꾸고 **전 시드
        외삽** 셀에는 «§0 판정에 쓰지 마라» 를 셀 자신이 달게 한다(3일 quick 의 24.7 이 그 예다).
     ⓒ ② 말미 라벨의 `W` 는 창 «이름» 이라 실구간(days=3 이면 2일)과 3.5배 어긋나 있었다. */
  const crossCell = (x) => x ? `${x.p50.toFixed(1)} (보간 ${x.p50i.toFixed(1)}) [${x.p10.toFixed(1)}~${x.p90.toFixed(1)}]${x.ex ? ` (외삽 ${x.ex}/${x.n} · 말미 창 W${x.W} · 실구간 ${x.span}일 구간율)${x.ex === x.n ? ' ⚠ **전 시드 외삽 — §0 판정에 쓰지 마라**' : ' ⚠ 일부 외삽'}` : ' (전 시드 실측)'}` : '—';
  const tailCell  = (x) => x ? `${fmtN(x.p50)} (보간 ${fmtN(x.p50i)})` : '—';
  const crossTitle = (mode) => `**④ 교차일(2,720.5만 · 교차 검출 — 판정은 이 줄) 〔${LEDGER[mode]} · ${rep.days}일 창 · p50 (보간 med) [p10~p90]〕**`;
  const tailTitle  = (mode, t) => `② 말미 한계 수급/일 〔${LEDGER[mode]} · 창 W${t ? t.W : '—'} · 실구간 ${t ? t.span : '—'}일 · p50 (보간 med)〕 — ④ 외삽이 쓰는 기울기`;
  /* ⚑ 18회차 정정A(비평 WW3·XX3 — 2인 일치) — W 민감도 행도 한 벌. `WS` 가 비면
     ([3,7,14,29] 가 관측 일수보다 다 크면) 옛 [G] 는 «×1.00 (Wundefined/Wundefined)» 와
     빈 칸을 판정 표에 인쇄했다(r18 quick 실측 2건) — 신설 [E2] 에만 가드가 있었던 것이
     «서식까지 공유한다» 의 4분의 1 미이행이었다. */
  const wSensOf = (pol, mode) => {
    const WS = [3, 7, 14, 29].filter(w => w < rep.days);
    if (!WS.length) return null;
    const sp = WS.map(w => { const x = crossOf(pol, mode, w); return `W${w} ${x ? x.p50.toFixed(1) : '—'}`; }).join(' / ');
    const f0 = crossOf(pol, mode, WS[0]), fL = crossOf(pol, mode, WS[WS.length - 1]);
    return { sp, WS, swing: f0 && fL && fL.p50 > 0 ? '×' + (f0.p50 / fL.p50).toFixed(2) : '—' };
  };
  /* ⚑⚑ 20회차(19-10 정정5·정정8 — ZZ 1순위 · 6회차째 미구현) — **말미 창 «안» 의 축별 기울기.**
     ② 말미 한계 수급은 합계 하나뿐이라 «어느 축이 말미를 나르는가» 를 표가 못 말했고,
     19-5 의 «② 예측이 −7.7~−10.8% 빗나갔다» 를 그 회차가 설명하지 못한 자리가 여기다
     (14-7 2 `--dryknob` 와 같은 자리). 재료는 14회차부터 스냅에 실려 있었다(`inBy`) —
     **한 번도 읽은 적이 없다.** 창·장부·통계는 `tailRate` 와 같은 것을 쓴다(표 두 벌 금지):
     같은 W · 같은 실구간 · 시드별 차분의 p50. 합계는 [E2] 의 ② 유입 장부 줄과 맞대진다. */
  const tailBy = (pol, wOpt) => {
    const runs = rep.policies[pol];
    const W = wOpt ? Math.max(1, Math.min(rep.days - 1, wOpt))
                   : Math.max(7, Math.min(30, Math.floor(rep.days / 4)));
    const span = rep.days - Math.max(1, rep.days - W);
    if (span <= 0) return null;
    const acc = {}; let n = 0;
    for (const r of runs) {
      const day = (d) => r.rows.filter(x => x.label === 'D' + d)[0];
      const end = day(rep.days), w0 = day(Math.max(1, rep.days - W));
      if (!end || !end.inBy || !w0 || !w0.inBy) continue;
      n++;
      const keys = {};
      Object.keys(end.inBy).forEach(k => { keys[k] = 1; });
      Object.keys(w0.inBy).forEach(k => { keys[k] = 1; });
      Object.keys(keys).forEach(k => {
        (acc[k] = acc[k] || []).push(((end.inBy[k] || 0) - (w0.inBy[k] || 0)) / span);
      });
    }
    if (!n) return null;
    /* 축이 어떤 시드에만 있으면 그 시드의 몫은 0 이다 — 안 채우면 p50 이 «그 축을 가진
       시드만» 의 중앙값이 되어 축끼리 분모가 달라진다(9회차 장부 오차와 같은 병). */
    const rows = Object.keys(acc).map(k => {
      const v = acc[k].slice(); while (v.length < n) v.push(0);
      return { k, p50: med(v) };
    }).sort((a, b) => b.p50 - a.p50);
    return { rows, tot: rows.reduce((a, b) => a + b.p50, 0), W, span, n };
  };
  /* ⚑ 20회차(19-10 정정1 — ZZ·AAA·AAB **3인 일치**) — [D] 가 잰 ① 판정 수를 [G] 가 그대로
     싣게 하는 자리. 재계산하지 않는다(표 두 벌 금지 · 18회차가 ④ 에 쓴 것과 같은 규약). */
  const JUDGE = {};

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
    /* 13회차 — 개수도 잘린 정체를 뺀다(위 `wallsOf` 와 같은 규약). 잘린 개수는 따로 찍는다. */
    const wallsAll  = runs.map(r => r.walls.filter(w =>  isWall(w, r.band) && w.trunc !== true).length);
    const truncAll  = runs.map(r => r.walls.filter(w =>  isWall(w, r.band) && w.trunc === true).length);
    const pausesAll = runs.map(r => r.walls.filter(w => !isWall(w, r.band)).length);
    /* ⚑ 7회차 — 상승면·실오르막도 **활성 자**로 잰다(정정6). 벽시계로 재면 상승면이 로그아웃
       시간을 통째로 삼켜 ③ 의 분자가 부풀고, 분모(달력 총 분)와 함께 두 쪽이 다 오염된다.
       `w.amin` = 정체 시작의 활성 분 · `w.len` = 정체의 활성 길이 ⇒ 같은 자 안에서 뺀다.
       (17회차 정정3 — `wA`·`actTot` 는 [G] 와 공유하는 함수 스코프 것을 쓴다.) */
    const ACT = med(runs.map(actTot)) || (rep.days * 1440);
    const faceOf = (r) => {
      const w = r.walls.filter(x => isWall(x, r.band) && x.trunc !== true); const f = [];
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
    /* ⚑ 13회차 비평 II(R2·R9) — ③ 도 `wallsOf` 와 **같은 벽 목록**을 써야 한다. 안 그러면
       한 표 안에서 대충 벽이 ① 에서는 2개 · ③ 에서는 3개다(같은 회차에 세 번째 «읽는 쪽을
       안 갈랐다» 사고). 잘린 정체는 «벽 끝» 이 관측 밖이라 상승면의 끝점이 될 수 없다.
       (17회차 정정3 — `faceNetOf` 본체도 [G] 와 공유하는 함수 스코프 것 하나다.) */
    const faceSum = runs.map(r => faceOf(r).reduce((a, b) => a + b, 0));
    const netAll  = runs.map(netOf);
    const faceNet = runs.map(r => faceNetOf(r));
    const faceNetMed = med(faceNet.map(f => f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0));
    L.push(`### [D] 벽 — ${P} (같은 스테이지 **활성** ${WALL_MIN}분 이상 정체 · **벽 = 관문 스테이지(${BAND}의 배수) 정체 · 멈춤 = 밴드 안 정체**)`);
    L.push('');
    /* ⚑ 5회차 비평 3인 일치 — «적중 n/8 · 첫 벽 · 간격 기하평균» 은 ① 의 채점 축인데 표에 없어서
       회차마다 손으로 세다가 빠졌다(5회차 §5-5 가 셋 다 누락). 자가 매번 찍는다.
       주인 목록(분): 30 · 180 · 1440 · 3600 · 7200 · 12960 · 21600 · 36000 (간격 ×1.4) · ±20%. */
    /* ⚑ 199 9회차 정정(AA 반박5) — §0 의 11칸 중 8칸만 적혀 있었다. 40·65·100일 칸(57,600 ·
       93,600 · 144,000분)이 빠져, 120일 표가 그 자리의 벽 4개+를 «창 밖» 으로 세었다(창밖 16 은
       ~25% 과대). 30일 표는 `t <= days*1440` 필터로 그 칸들을 원래 못 보므로 **Δ0** 이다. */
    const TARGET = [30, 180, 1440, 3600, 7200, 12960, 21600, 36000, 57600, 93600, 144000];
    /* ⚑ 18회차(17-7 정정2) — **사다리의 끝**. §0 목록의 마지막 칸(144,000분 = 100일)의 창 끝
       1.2t = 172,800분이 §0 이 무엇이든 말하는 마지막 좌표다. 그 밖의 정체는 «없어야 할 벽»
       이 아니라 **과녁이 없는 구간의 벽**이라, 창 밖 수를 이 선에서 갈라 찍는다. */
    const LADDER_END = LADDEREND || 1.2 * TARGET[TARGET.length - 1];
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
    const TARGET8 = TARGET.slice(0, 8);   /* 9회차 — «옛 자» 줄은 8칸 시절 그대로 얼린다 */
    const SPAN_T8 = gmOf(TARGET8);                         /* 2.754 */
    /* ⚑ 13회차(12회차 정정1 · GG 처방 2) — ① 의 자에서 **잘린 정체**(`trunc`)를 뺀다.
       12회차의 «대충 20/20 이 s600 에 걸려 있다» 는 그 한 줄이 없어서 난 오독이다(45일로
       늘리자 전 시드가 돌파 — §12-4-1). 잘린 정체는 «그 자리에 벽이 있다» 가 아니라
       «관측이 끝났다» 는 뜻이라, 적중·개수·간격에 넣으면 창 길이가 점수를 만든다.
       [D] 표에는 남긴다(§12-1 실패 프로브와 같은 규약 — 재현 경로를 지우지 않는다). */
    const isTrunc = (w) => w.trunc === true;
    const wallsOf = (r) => r.walls.filter(w => isWall(w, r.band) && !isTrunc(w));
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
    /* ⚑ 199 8회차 정정(V·W·X 비평) — 자 수리의 남은 네 곳. 전부 제품 0줄.
       ⓗ **비교자 불일치**(X 결손1) — 벽 검출은 `>= wallMin`(30 이상)인데 도달 가능 판정만
          `> WALL_MIN`(30 초과)이었다. 대충 1,440칸은 **정확히 30 대 30 동률**이라 이 한 글자가
          분모를 5 ↔ 6 으로 갈랐다(적중 80.0% ↔ 66.7%). **벽 검출과 같은 `>=` 로 통일**하고,
          문턱 민감도(자의성)를 자가 같이 찍는다.
       ⓘ **`spanOf`·`firstOf` 의 끝점이 «잉여 벽»** 이었다(W 반박2·3 · X 결손5 독립 일치).
          지수만 «칸» 으로 통일하고 분자는 «벽» 인 채여서, 시드1 부지런의 첫·마지막 벽
          (833 · 40,253분)이 **둘 다 어느 칸에도 안 드는 벽**이었다 — 간격 2.172(+14.1%) ·
          첫 벽 −26.1% 는 그 오염분이다. **배정된 첫/마지막 벽**으로 재면 1.928(+1.2%) ·
          −13.1%(창 안)다. ⇒ ① 세 항 중 둘이 «잉여 벽» 과 이중 계상되던 것을 끊는다.
       ⓙ **«잉여» 가 §0 의 «없어야 할 벽» 과 다른 뜻**이었다(X 결손3 · W 보강).
          부지런 시드1 의 잉여 7 중 **4개(57.1%)는 칸의 ±20% 창 «안» 에서 밀린 중복**이고
          진짜 «칸 사이의 벽» 은 3개다 ⇒ 헤드라인이 +133% 과대. **«창 밖» 과 «창 안 중복» 을
          두 줄로 쪼개고 §0 대조는 앞줄로만** 한다(처방이 정반대다 — 중복은 벽이 촘촘한 것,
          창 밖은 벽이 엉뚱한 데 선 것).
       ⓚ **좌표 선택이 점수를 뒤집는다**(V 반박3 · W 반박4 · X 반박5 3인 일치). ⓓ 는 «정확도
          수리» 로 적혔지만 대충 적중을 **2/5 → 4/5(+100%)** 로 만든 선택이고 부지런에서는
          Δ0 이다. ⇒ **두 좌표를 병기**해 다음 회차가 선택인 줄 알고 고르게 한다. */
    const wallL  = (w) => w.min;                                              /* 왼쪽 끝 좌표 */
    const POL_A  = POLICIES[pol] || POLICIES.diligent;
    const reachAt = (thr) => TARGET.filter(t => t <= rep.days * 1440
      && actBy(POL_A, 1.2 * t) >= thr);
    const REACH  = reachAt(WALL_MIN);                                         /* ⓐ+ⓗ 정책별 */
    const SPAN_T = gmOf(REACH);
    /* ⓑ 1:1 유일 배정 — 상대오차가 작은 짝부터. `coord` 로 좌표를 갈아 끼운다(ⓚ). */
    const pairBy = (r, coord) => {
      const ws = wallsOf(r), cand = [];
      REACH.forEach((t, si) => ws.forEach((w, wi) => {
        const e = Math.abs(coord(w) - t) / t;
        if (e <= 0.2) cand.push({ si, wi, e });
      }));
      cand.sort((x, y) => x.e - y.e);
      const us = new Set(), uw = new Set();
      for (const c of cand) {
        if (us.has(c.si) || uw.has(c.wi)) continue;
        us.add(c.si); uw.add(c.wi);
      }
      /* ⓙ 잉여를 둘로 — «창 안 중복»(어떤 칸의 창 안이지만 그 칸을 남에게 뺏긴 벽) 과
         «창 밖»(어느 칸의 창에도 안 드는 벽 = §0 의 «없어야 할 벽»). */
      /* ⚑ 18회차(17-7 정정2 — UU1) — «창 밖» 을 **사다리 안 / 사다리 밖**으로 쪼갠다.
         §0 의 사다리는 마지막 칸 144,000분(100일)에서 끝나는데 관측창은 그보다 길 수 있다
         (17-4 는 260일을 쟀다) — 그 뒤의 벽은 «엉뚱한 데 선 벽» 이 아니라 **과녁이 아직
         안 정해진 구간의 벽**이다. 17회차 표의 «창 밖 8» 은 그 둘이 섞인 수였고(시드1 창밖
         9 중 8개가 172,800분 이후), 섞인 채로는 §0 대조가 «없어야 할 벽» 을 과대 계상한다.
         ⇒ 두 수를 나란히 찍고 §0 대조는 **사다리 안** 쪽으로 읽는다(처방이 정반대다 —
         사다리 밖은 계수가 아니라 **과녁 길이**(결12-ⓑ)가 정할 몫이다). */
      let dup = 0, out = 0, outIn = 0, outOut = 0;
      ws.forEach((w, wi) => {
        if (uw.has(wi)) return;
        const inAny = REACH.some(t => Math.abs(coord(w) - t) / t <= 0.2);
        if (inAny) { dup++; return; }
        out++;
        if (coord(w) > LADDER_END) outOut++; else outIn++;
      });
      return { hit: us.size, extra: ws.length - uw.size, dup, out, outIn, outOut, seat: uw };
    };
    const pairOf  = (r) => pairBy(r, wallT);
    const hitOf   = (r) => pairOf(r).hit;
    const hitLOf  = (r) => pairBy(r, wallL).hit;                              /* ⓚ 대조 좌표 */
    const extraOf = (r) => pairOf(r).extra;
    const dupOf   = (r) => pairOf(r).dup;
    const outOf   = (r) => pairOf(r).out;
    /* ⓘ 배정된 벽만 골라 낸다 — 끝점이 잉여 벽이면 «간격»·«첫 벽» 이 그 벽 하나에 물린다. */
    const seatedOf = (r) => {
      const ws = wallsOf(r), s = pairOf(r).seat;
      return ws.filter((w, wi) => s.has(wi));
    };
    /* 옛 자(회차 간 비교용) — 겹쳐 세는 구 판정 그대로. 8칸 분모·왼쪽 끝 좌표. */
    const hitOld = (list, r) => {
      const ws = wallsOf(r);
      return list.filter(t => t <= rep.days * 1440
        && ws.some(w => Math.abs(w.min - t) <= 0.2 * t)).length;
    };
    const hit8Of = (r) => hitOld(TARGET8, r);
    const spanOf = (r) => {           /* ⓒ 지수 «칸 개수−1» · ⓘ 끝점은 **배정된** 벽 */
      const ws = seatedOf(r);
      if (ws.length < 2 || REACH.length < 2) return 0;
      return Math.pow(wallT(ws[ws.length - 1]) / Math.max(1, wallT(ws[0])), 1 / (REACH.length - 1));
    };
    const firstOf = (r) => { const ws = seatedOf(r); return ws.length ? Math.round(wallT(ws[0])) : 0; };
    const firstAnyOf = (r) => { const ws = wallsOf(r); return ws.length ? Math.round(wallT(ws[0])) : 0; };
    const tgtN  = REACH.length;
    const tgtN8 = TARGET8.filter(t => t <= rep.days * 1440).length;
    /* ⓙ §0 대조는 «창 밖» 줄로만 한다. ⓛ 널 기준선(V·X 독립 일치) — ±20% 창들이 측정 구간의
       몇 %를 덮는지, 그래서 «아무 데나 뿌렸을 때» 기대 적중이 몇인지 같이 찍는다.
       그 값이 곧 이 점수의 바닥이다(부지런 창 합 76.67% ⇒ 기대 3.68/6). */
    const HOR   = rep.days * 1440;
    const covPc = 100 * REACH.reduce((a, t) => a + Math.min(HOR, 1.2 * t) - 0.8 * t, 0) / HOR;
    const nullE = (() => {                       /* 벽을 균일 난수로 뿌렸을 때 기대 적중 */
      const n = med(wallsAll) || 0;
      return REACH.reduce((a, t) => {
        const w = (Math.min(HOR, 1.2 * t) - 0.8 * t) / HOR;
        return a + (1 - Math.pow(1 - w, n));
      }, 0);
    })();
    /* ⚑ 18회차(17-7 정정3 — TT3·UU2·VV2 **3인 일치** · 16-8 정정5 동형 재발, 세 회차 연속)
       — **«① 을 적을 때는 널과 간격을 한 문장에»** 를 자에 박는다. 널 기준선과 간격 이탈%는
       이미 아랫줄에 있었지만, 헤드라인만 옮겨 적으면 «적중 6/9» 가 단독으로 인용돼 세 회차
       연속 같은 오독이 났다(16회차 ③ · 17회차 ①). 값을 옮기는 게 아니라 **헤드라인 문장이
       스스로 널·간격을 데리고 다니게** 한다 — 아랫줄의 상세(창 합·산포)는 그대로 둔다. */
    const hitP50  = med(runs.map(hitOf));
    const spanP50 = med(runs.map(spanOf));
    /* ⚑⚑ 20회차(19-10 정정1 — 3인 일치, 이 회차의 가장 큰 항) — **[D] 가 방금 잰 ① 을
       [G] 대조표가 그대로 읽는다.** 19회차는 ④ 의 다리(부지런 교차 103.0)를 «①» 이라
       부르고 «창 안» 이라 적었는데, 대조표에 ① 이 한 줄도 없어서 본문이 «어느 줄이 ①인가»
       를 고를 수 있었다(17-1 정정3 «라벨 하나가 두 값» 의 재발 · 이번엔 제품 주석까지
       옮겨 갔다). 값을 다시 계산하지 않고 이 순간의 것을 그대로 싣는 이유도 같다 —
       재계산하면 자가 둘이 되고, 둘이 갈리는 날 본문이 또 고르게 된다. */
    JUDGE[pol] = {
      hit: hitP50, tgtN, nullE,
      out:    med(runs.map(outOf)),
      outIn:  med(runs.map(r => pairOf(r).outIn)),
      outOut: med(runs.map(r => pairOf(r).outOut)),
      extra:  med(runs.map(extraOf)),
      dup:    med(runs.map(dupOf)),
      first:  med(runs.map(firstOf)),
      reach0: REACH[0] || 0,
      span:   spanP50, spanT: SPAN_T,
    };
    L.push(`**① 축 — 목표 칸 적중 p50 = ${hitP50}/${tgtN}`
      + ` (**널 기준선 ${nullE.toFixed(2)} 대비 ${(hitP50 - nullE) >= 0 ? '+' : ''}${(hitP50 - nullE).toFixed(2)}칸**`
      + `${hitP50 < nullE ? ' ⚠ **난수 산포 이하**' : ''}`
      + ` · ±20% · 1:1 유일 배정 · 달력 중앙 좌표`
      + ` · 왼쪽 끝 좌표로는 ${med(runs.map(hitLOf))}/${tgtN})`
      + ` · **창 밖 벽 p50 = ${med(runs.map(outOf))}**(= §0 의 «없어야 할 벽»`
      + ` — **사다리 안 ${med(runs.map(r => pairOf(r).outIn))} · 사다리 밖 ${med(runs.map(r => pairOf(r).outOut))}**`
      + ` [사다리 끝 = ${LADDER_END}분${LADDEREND ? ' ⚠ **--ladderend 강제**(게이트 픽스처)' : ' = 마지막 칸 ' + TARGET[TARGET.length - 1] + '분의 창 끝'} · 그 밖은 §0 이 과녁을 안 정한 구간이라 §0 대조는 «사다리 안» 으로 읽어라 — 18회차 정정2`
      /* 18회차 정정C(비평 XX8 · WW9) — 분해도 p50 끼리는 못 더한다. 항등 «안+밖=창밖» 은
         시드별로만 참이므로 그 검산을 자가 직접 찍는다(17-1 정정6 과 같은 규약). */
      + ` · 시드별 항등 «사다리안+사다리밖=창밖» 검산 ${runs.filter(r => { const q = pairOf(r); return q.outIn + q.outOut === q.out; }).length}/${runs.length}])`
      /* ⚑ 17회차(16-8 정정6 — QQ5) — «창 밖 p50 + 중복 p50 = 잉여 p50» 은 시드가 다르면
         성립하지 않는 p50 끼리의 산수다(r16 부지런 3+12=15 ↔ 잉여 16 이 그 자리). 항등
         «창밖+중복=잉여» 는 **시드별**로만 참이라, 그 검산(전 시드)을 자가 직접 찍고
         p50 세 값은 «더하지 마라» 를 달아 나란히 둔다. */
      + ` · 창 안 중복 p50 = ${med(runs.map(dupOf))} · 잉여 p50 = ${med(runs.map(extraOf))}`
      + ` (⚠ p50 끼리 더하지 마라 — 시드별 항등 «창밖+중복=잉여» 검산 ${runs.filter(r => { const p = pairOf(r); return p.out + p.dup === p.extra; }).length}/${runs.length})`
      + ` · 첫 벽(배정) p50 = ${med(runs.map(firstOf))}분 (목표 = 첫 도달 가능 칸 ${REACH[0] || '—'}분`
      + ` · 배정 안 가린 첫 벽 ${med(runs.map(firstAnyOf))}분)`
      /* ⚑ 13회차 비평 JJ(R12) — 배정 벽이 2개 미만이면 `spanOf` 는 «간격 0» 이 아니라
         **미정의**를 뜻하는 0 을 돌려준다. 그것을 «0.00 (목표 ×1.904)» 로 찍으면 측정치로
         읽힌다(대충이 실제로 그랬다). 미정의는 미정의라고 적는다. */
      /* 18회차 정정3 — 간격도 «목표 대비 몇 %» 를 같은 문장에 단다(그 수를 본문이 손으로
         내던 것이 17-4 ① 행의 −22.4% 였다). 미정의는 미정의라고 적는다(13회차 JJ). */
      + ` · **벽 간격 기하평균 p50 = ${spanP50 > 0 ? spanP50.toFixed(2) : '— (미정의 · 배정 벽 2개 미만)'} (목표 ×${SPAN_T.toFixed(3)}`
      + `${spanP50 > 0 && SPAN_T > 0 ? ` · ${(100 * (spanP50 / SPAN_T - 1)) >= 0 ? '+' : ''}${(100 * (spanP50 / SPAN_T - 1)).toFixed(1)}%` : ''})**`);
    L.push('');
    L.push(`_⚠ **널 기준선** — ±20% 창의 합이 측정 구간(${HOR}분)의 **${covPc.toFixed(2)}%** 라`
      + ` 벽 ${med(wallsAll)}개를 **아무 데나 뿌려도 기대 적중 ${nullE.toFixed(2)}/${tgtN}** 이다.`
      /* ⚑ 13회차 비평 II(R3) — 부호를 `'+'` 로 **박아** 두어서 차가 음수가 된 첫 회차에
         «+-0.36칸» 이라는 부호 불능 문자열이 찍혔다(대충 적중 1 < 널 1.36 = **난수 이하**).
         이 루프는 세 회차 동안 «적중은 널과의 차로만 읽어라» 를 규약으로 적어 놓고, 그 차가
         처음 음수가 된 자리에서 그것을 못 읽었다. 부호를 값에서 뽑고, 음수면 말로도 적는다. */
      + ` 적중은 이 값과의 차로만 읽어라(지금 **${(med(runs.map(hitOf)) - nullE) >= 0 ? '+' : ''}${(med(runs.map(hitOf)) - nullE).toFixed(2)}칸**${med(runs.map(hitOf)) < nullE ? ' ⚠ **널 기준선 아래 = 난수 산포보다 나쁘다**' : ''})._`);
    L.push('');
    L.push(`_도달 가능 칸(정책별 · 창 끝 1.2t 까지 쌓인 활성 분 ≥ ${WALL_MIN} — 벽 검출과 같은 비교자)`
      + ` = ${REACH.join(' · ')}분_`);
    L.push('');
    L.push(`_⚠ **문턱 민감도**(자의성 점검) — 문턱을 ${WALL_MIN}분에서 옮기면 분모가 이렇게 바뀐다:`
      + [WALL_MIN, WALL_MIN + 1, 2 * WALL_MIN, 3 * WALL_MIN].map(t => ` ${t}분 → ${reachAt(t).length}칸`).join(' ·')
      + `_`);
    L.push('');
    L.push(`_(옛 자 — 8칸 분모·겹쳐 세기·왼쪽 끝 좌표: 적중 ${med(runs.map(hit8Of))}/${tgtN8}`
      + ` · 간격 목표 ×${SPAN_T8.toFixed(3)} · 첫 벽 옛 목표 30분)_`);
    L.push('');
    /* 13회차 — 잘린 정체를 뺐다는 사실과 그 개수를 표가 직접 말한다(안 적으면 다음 세대가
       «벽이 줄었다» 로 읽는다). 잘린 정체가 시드마다 1개면 그것이 창 끝의 구조다. */
    L.push(`**잘린 정체(관측 끝까지 이어진 관문 정체 — ① 에서 제외) p50 = ${med(truncAll)}개**`
      + ` (전 시드 합 ${truncAll.reduce((a, b) => a + b, 0)}개 · 판별식 \`w.amin + w.len === r.amin\`)`
      + ` — 12회차가 이것을 벽으로 세어 «대충은 s600 에 걸려 있다» 고 읽었다(§12-4-1 에서 45일 재측정으로 기각).`);
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
      /* ⚑ 13회차 비평 HH(R5) — 헤드라인 적중은 `wallsOf` 로 잘린 정체를 빼는데 **[D] 표의
         배정 칸은 안 뺐다.** 같은 회차에 «판정을 늘리면 읽는 쪽도 갈라라» 를 적어 놓고
         읽는 쪽을 하나 더 빠뜨린 자리다(대충에서 표 2 ↔ 헤드라인 1 로 실제로 갈렸다).
         `wallsOf` 와 **같은 필터**를 쓴다 — 두 벌로 적지 않는다. */
      const ws0 = r0 ? r0.walls.filter(w => isWall(w, r0.band) && w.trunc !== true) : [];
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

    /* ⚑⚑ 18회차(17-7 정정1 — TT·VV 1순위 · UU 결손, **3인 일치**) — **정책 절이 자기 ④ 교차를
       찍는다.** 17회차까지 이 두 자(④ 교차 · ② 말미 한계)는 [G] 안에만 있었고 [G] 는
       `pols.length > 1` 가드 뒤라, `--policy=casual` 같은 **단일 정책 실행은 판정 줄을 통째로
       못 찍었다** — 17-4 의 d260 표(1,612초짜리 실측)가 그래서 «표 밖 수기 계산» 이 됐고
       세 비평가가 «원표만으로 재현 불가» 로 일치 반박했다.
       ⇒ 자는 위 함수 스코프의 **하나**를 [G] 와 같이 읽는다(표 두 벌 금지 · 402 계보).
       이 절이 선 뒤로 이 루프에 «표 밖 수기 교차» 는 없어야 한다. */
    L.push(`### [E2] ④ 교차일 · ② 말미 한계 — ${P} (**판정 줄** · [G] 와 같은 함수 하나로 잰다 — 단일 정책 실행도 여기서 읽는다)`);
    L.push('');
    L.push('| 축 | 값 |');
    L.push('|---|---|');
    for (const mode of ['in', 'summon']) {
      const c = crossOf(pol, mode), t = tailRate(pol, mode);
      L.push(`| ${crossTitle(mode)} | ${c ? crossCell(c) : '(스냅에 누적 장부 없음 — 10회차 이전 --json)'} |`);
      const goalPct = t ? ` — 목표 ${fmtN(GOAL_DAY)}의 ${(100 * t.p50 / GOAL_DAY).toFixed(1)}%` : '';
      L.push(`| ${tailTitle(mode, t)}${goalPct} | ${tailCell(t)} |`);
      /* [G] 와 같은 규약 — 외삽 시드가 0 이면 W 를 흔들어도 같은 수라 민감도 행을 생략한다
         (그 사실 자체가 판정의 강도다 · 13회차). */
      const ws = c && c.ex ? wSensOf(pol, mode) : null;
      if (ws) L.push(`| ④ 교차일 — **말미 창 W 민감도**(외삽 시드에만 적용) 〔${LEDGER[mode]} · p50〕 | ${ws.sp} — 흔들림 ${ws.swing} (W${ws.WS[0]}/W${ws.WS[ws.WS.length - 1]}) |`);
    }
    L.push('');
    /* ⚑⚑ 20회차 — ② 말미 한계의 **분해**. 위 두 줄이 «얼마» 라면 이 표는 «어디서» 다.
       [E] 의 축별 표는 전 기간 누적이라 일회성·초반 미션이 섞여 있어서 말미의 축 구성과
       다르다 — 19-10 정정8 이 «누적 유입 +31.6% 인데 말미는 +0.44%» 로 잡은 그 어긋남이
       이 두 표의 차이다. 여기 없으면 «수급을 어느 축에서 올릴까» 를 본문이 손으로 고른다. */
    {
      const tb = tailBy(pol);
      if (tb) {
        L.push(`### [E3] ② 말미 창 안 **축별 기울기** — ${P} 〔유입 장부 · 창 W${tb.W} · 실구간 ${tb.span}일 · 시드 ${tb.n} · p50〕`);
        L.push('');
        /* ⚠ 머리글 끝을 «대비» 로 두면 안 된다 — [8] 이 [G] 머리글을 `/비 \|$/` 로 찾는데
           «목표 27만 대비 |» 가 그 정규식에 먼저 걸려 [E2]↔[G] 대조가 0/0 으로 비었다
           (20회차 1차 실행 실측). 라벨에 단위를 붙여 끝을 가른다. */
        L.push('| 축 | 말미 수급/일 | 말미 비중(%) | 목표 27만 대비(%) |');
        L.push('|---|---|---|---|');
        tb.rows.forEach(r => L.push(`| ${r.k} | ${fmtN(r.p50)} | ${pct(r.p50, tb.tot)} | ${(100 * r.p50 / GOAL_DAY).toFixed(1)}% |`));
        L.push(`| **합** | **${fmtN(tb.tot)}** | 100% | **${(100 * tb.tot / GOAL_DAY).toFixed(1)}%** |`);
        /* ⚑ 20회차 비평 AAD — 위 표는 **유입만** 분해하는데 ④ 의 판정 장부는 «유입 − 소환 외
           씽크» 다(결2 ⓐ). 씽크는 스냅이 축별로 안 싣고 합계 `outNS` 하나뿐이라 분해가
           불가능한데, 그 사실을 안 적으면 이 표가 판정 장부의 분해로 읽힌다. ⇒ 씽크를 한 줄로
           같이 놓고 판정 장부 말미를 그 자리에서 짓는다(대조는 [E2] 의 소환 예산 줄). */
        const sink = (() => {
          const vals = [];
          for (const r of runs) {
            const day = (d) => r.rows.filter(x => x.label === 'D' + d)[0];
            const end = day(rep.days), w0 = day(Math.max(1, rep.days - tb.W));
            if (!end || end.outNS == null || !w0 || w0.outNS == null) continue;
            vals.push((end.outNS - w0.outNS) / tb.span);
          }
          return vals.length ? med(vals) : null;
        })();
        if (sink != null) {
          L.push(`| _(참고) 소환 외 씽크 — **축별 분해 없음**(스냅이 합계 \`outNS\` 하나만 싣는다)_ | −${fmtN(sink)} | — | −${(100 * sink / GOAL_DAY).toFixed(1)}% |`);
          L.push(`| **= 소환 예산 장부 말미**(④ 의 판정 장부 · 유입 − 씽크) | **${fmtN(tb.tot - sink)}** | — | **${(100 * (tb.tot - sink) / GOAL_DAY).toFixed(1)}%** |`);
        }
        L.push('');
        /* 축의 p50 을 더한 값과 [E2] ② 유입 장부 줄(합계의 p50)은 **다를 수 있다** —
           시드가 다르면 med(합) ≠ Σ med(축). 그 차를 자가 직접 찍는다(8회차 정정1 규약). */
        const t2 = tailRate(pol, 'in');
        if (t2) L.push(`_⚠ 합 ${fmtN(tb.tot)} = **축별 p50 의 합**이고 [E2] ② 유입 장부 줄 ${fmtN(t2.p50)} 는 **합계의 p50** 이다`
          + ` — 시드가 다르면 med(합) ≠ Σ med(축)이라 어긋남 ${((tb.tot / (t2.p50 || 1) - 1) * 100).toFixed(2)}% 는 결함이 아니다.`
          + ` 판정에는 [E2] 줄을 쓰고, 이 표는 **구성비**를 읽어라._`);
        L.push('');
      }
    }
  }

  /* ⚑ 199 5회차 — [G] 정책 대조. 4회차 비평 ⓒ 는 «스윕 표에 정책비 열이 없어 ④ 가 창 밖으로
     밀린 것을 사전에 못 봤다»(측정 누락)였다. 손잡이 하나를 돌릴 때마다 두 정책의 비가 같이
     찍히게 한다 — 한 정책만 재면 ④ 는 언제나 사후에 발견된다. */
  {
    const pols = Object.keys(rep.policies);
    /* ⚑⚑ 20회차(19-10 정정5 — ZZ 1순위 · 18회차 정정1 의 나머지 절반) — **«정책 둘» 가드를
       걷었다.** 18회차가 ④ 교차·② 말미만 [E2] 로 빼 단일 정책도 찍게 했지만, ① 판정 ·
       §0 ② «한 축 ≤50%» · ③ 순 이동 · «비» 는 여전히 이 가드 뒤에 있었다. 그래서 19회차의
       d150(부지런)·d260(대충) 단일 실행 두 장에는 «비» 행이 아예 없었고, 본문이 **창이 다른
       두 표의 값을 손으로 나눠**(196.0 ÷ 103.0 = 1.903) 판정 줄로 썼다 — 같은 문서가
       «창을 바꾸면 부지런 추정이 +11.8% 어긋난다» 를 실측해 둔 바로 그 자리다.
       ⇒ 표는 언제나 찍고, **못 재는 칸은 못 잰다고 자가 말한다**(빈칸도 «-» 도 아니다). */
    const two = pols.length > 1;
    /* 표 밖 손계산을 막는 문장은 «비 없음» 이 아니라 «다른 표끼리 나누지 마라» 여야 한다 —
       19회차가 나눈 두 수는 각자 자기 표 안에서는 멀쩡한 실측이었다. */
    /* 칸마다 긴 문장을 반복하면 표가 안 읽힌다 — 문장은 표 머리에 한 번, 칸에는 «못 잰다» 는
       사실과 그 이유의 이름표만. 빈칸·«-» 로 두지 않는 것이 이 항의 전부다. */
    const NORATIO = '— ⚠ **정책 1개 — 못 잰다**(다른 표끼리 나누지 마라 · 19-10 정정5)';
    {
      /* ⚑ 199 5회차 비평 3인 일치 — «지속 수급» 의 장부가 회차마다 달라지면 ④ 를 못 잰다.
         1~4회차의 «지속» 은 **일회성 3종(시작 신규 지급 100만 · 가이드미션 60만 · 우편 30만)을
         전부 뺀** 값이고(그 자로 r4 부지런 268,527 · 대충 152,569 · 비 1.760), 5회차가 시작만
         빼면서 같은 이름이 다른 수를 가리켰다. ⇒ **두 정의를 나란히 찍는다**(구 = 회차 간 비교용). */
      /* ⚑ 199 8회차(정정8 · U) — 네 번째 항 «출석(1일차 환영)» 을 넣는다. §7-3 이 스스로
         «첫날 축에 속한 값이지 지속 수급이 아니다» 라고 선언한 100,000 이 아직 분모(3,333/일)
         안이었다. 이 한 줄을 고치기 전에는 ④ 를 «창 안» 이라고 부를 수 없다. */
      /* 10회차(정정4) — 목록은 모듈 상수 `ONCE_KEYS` 하나다(스냅 `inOnce` 와 같은 자).
         «우편(월)» 은 여기 없다 — 월별 다이아는 지속 수급이다. */
      const ONCE = ONCE_KEYS;
      /* ⚑ 199 8회차 정정1(V·W·X **3인 일치**) — 이 줄이 **평균**인데 ④ 도달일은 **중앙값**이라
         «비 = 지속 수급 비» 항등식이 0.27~0.35% 깨져 있었다(1.856 vs 1.861). 7회차 정정1 이
         잡은 병이 자리만 옮겨 살아남은 것이다. ⇒ **같은 통계(med)로 통일**한다. 옛 평균 값은
         회차 간 비교용으로 괄호에 남긴다(1~7회차의 이 줄은 평균이었다). */
      const dayIn = (pol) => {
        const runs = rep.policies[pol];
        const sum  = (r) => Object.values(r.diaIn).reduce((x, y) => x + y, 0);
        const one1 = (r) => ONCE.reduce((x, k) => x + (r.diaIn[k] || 0), 0);
        const mean = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
        return {
          all:   med(runs.map(r => sum(r))) / rep.days,
          cont:  med(runs.map(r => sum(r) - (r.diaIn[ONCE[0]] || 0))) / rep.days,
          cont0: med(runs.map(r => sum(r) - one1(r))) / rep.days,
          contMean: (mean(sum) - mean(one1)) / rep.days,      /* 1~7회차의 자(평균) */
        };
      };
      /* ⚑ 17회차(16-8 정정3 — QQ6·RR3·SS6 3인 일치) — 이 자리가 «③ 축» 라벨로 찍던 것은
         정체 밖 시간(첫/마지막 벽 밖 · 30분 미만 숨 포함 — [D2] 가 «넓은 자 · ③ 축 아님» 이라
         명기한 값)이었다. ③ 의 축은 [D2] 헤드라인과 같은 **실오르막 합 / 활성 분**이고,
         함수는 [D2] 와 **공유**한다(표 두 벌 금지). 넓은 자는 참고 줄로 강등해 나란히 둔다. */
      const facePct = (pol) => {
        const runs = rep.policies[pol];
        const v = runs.map(r => faceNetOf(r).reduce((a, b) => a + b, 0));
        const d = med(runs.map(actTot)) || (rep.days * 1440);
        return 100 * med(v) / d;
      };
      const netPct = (pol) => {
        const runs = rep.policies[pol];
        /* 7회차 — 분자·분모 둘 다 **활성 분**이다(정정6). 벽시계로 재면 분모가 로그아웃까지
           세어 ③ 이 구조적으로 1% 아래에 눌린다(43,200 vs 5,400). */
        const v = runs.map(r => Math.max(0, actTot(r) - r.walls.reduce((a, w) => a + w.len, 0)));
        const d = med(runs.map(actTot)) || (rep.days * 1440);
        return 100 * med(v) / d;
      };
      const stg = (pol) => med(rep.policies[pol].map(r => r.final.stage));
      /* ⚑ 199 8회차(정정3 · T·U 독립 일치) — §0 의 «한 축 ≤50%» 를 자가 한 번도 안 찍었다.
         7회차에 두 장부의 판정이 실제로 갈렸는데(유입 38.4% 통과 ↔ 지속 54.47% 초과) 그것을
         손으로 세어야 알 수 있었다. 두 값을 나란히 찍고 **최대 축의 이름까지** 적는다 —
         어느 장부가 §0 의 축인가는 결2 로 올라간다. */
      const topOf = (pol, cont, sum) => {
        const runs = rep.policies[pol], acc = {};
        runs.forEach(r => { for (const k in r.diaIn) {
          if (cont && ONCE.indexOf(k) >= 0) continue;
          acc[k] = (acc[k] || 0) + r.diaIn[k] / runs.length;
        } });
        let tot = Object.values(acc).reduce((a, b) => a + b, 0);
        /* `sum` = 소환 예산 장부: 분모에서 «소환 이외의 씽크» 를 뺀다(④ 둘째 줄과 같은 자). */
        if (sum) tot -= runs.reduce((a, r) => a + Object.keys(r.diaOut || {})
          .filter(k => k !== '소환').reduce((x, k) => x + r.diaOut[k], 0), 0) / runs.length;
        let nm = '—', mx = 0;
        for (const k in acc) if (acc[k] > mx) { mx = acc[k]; nm = k; }
        return { pct: tot > 0 ? 100 * mx / tot : 0, name: nm };
      };
      /* ⚑ 199 7회차 — ④ 는 «며칠에 닿는가» 인데 자가 «하루에 얼마» 까지만 찍어 회차마다 손으로
         나눴다(6회차 비평 Q·R 독립 일치). 도달일을 **두 장부로** 찍는다 — 결2 가 아직 미응답이라
         어느 쪽이 ④ 의 축인지 주인만 정할 수 있고, 두 장부의 판정이 실제로 갈린다.
           · 유입 장부  = 유입 전체 − 일회성 3종 (1~6회차의 ④ 는 이 자)
           · 소환 예산 장부(결2 ⓐ 확정 2026-09-01 — ④ 의 판정 장부) = 거기서 **소환 이외의 씽크**(입장권교환 등)를 더 뺀다
         도달일 = (목표 2,730만 − 일회성 선지급) ÷ 지속 수급/일 — 일회성은 첫날 통째로 들어오므로
         분자에서 빼는 것이 «누적이 목표를 지나는 날» 의 정의다(§0 ②). */
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
      L.push(`## [G] ${two ? '정책 대조' : '판정 표(정책 1개)'} — ① 벽 · ③ 순 이동 · ④ 정책 간격 (손잡이를 돌릴 때마다 같이 본다)`);
      L.push('');
      if (!two)
        L.push(`_⚠ **정책 1개 실행**(\`--policy=${pols[0]}\`) — 이 표의 «비» 칸은 **못 잰다**. 20회차부터 [G] 는 정책 하나에도 찍힌다(19-10 정정5): 못 재는 칸을 비워 두면 본문이 다른 표에서 값을 끌어와 나눈다._\n`);
      /* 10회차(정정10 — AA 처방3) — 판정 줄마다 **(장부 · 창 · 통계)** 라벨을 병기한다.
         9회차의 장부 수치 5곳 오차가 전부 «어느 장부·어느 창·어느 통계인가» 를 안 적어 생겼다. */
      L.push('| 축 | ' + pols.map(p => POLICIES[p].name).join(' | ') + ' | 비 |');
      L.push('|---|' + pols.map(() => '---|').join('') + '---|');
      const rows = [
        ['유입 합/일 〔유입 장부 · ' + rep.days + '일 · p50〕', p => dayIn(p).all, fmtN],
        /* ⚑ 8회차 정정(X 결손4) — 라벨이 «3종» 인데 `ONCE` 는 8회차에 **4종**이 됐다. 찍히는 수는
           4종 값이므로 라벨을 고치고, 회차 간 비교용 3종 값은 아래 줄에 따로 둔다. */
        ['**지속 수급/일 — 일회성 제외(`ONCE_KEYS` · 우편(월)은 지속) 〔지속 장부 · ' + rep.days + '일 · p50〕**', p => dayIn(p).cont0, fmtN],
        ['지속 수급/일 — 같은 목록·**평균**(1~7회차의 자 — 회차 간 비교용) 〔지속 장부 · ' + rep.days + '일 · 평균〕', p => dayIn(p).contMean, fmtN],
        ['지속 수급/일 — 시작 지급만 제외(5회차 [G] 초판) 〔· ' + rep.days + '일 · p50〕', p => dayIn(p).cont, fmtN],
        [`${rep.days}일 스테이지 p50`, stg, fmtN],
        ['순 이동 비중(%) — ③ 축 = 실오르막 합(④ 와 무관 · [D2] 헤드라인과 같은 자) 〔활성 분 자 · ' + rep.days + '일 · p50〕', facePct, x => x.toFixed(2)],
        ['정체 밖 시간 비중(%) — 넓은 자(첫/마지막 벽 밖·짧은 숨 포함 · **③ 축 아님 — 참고**) 〔활성 분 자 · ' + rep.days + '일 · p50〕', netPct, x => x.toFixed(2)],
        ['**§0 «한 축 ≤50%» — 최대 유입 축 비중(%) 〔지속 장부(일회성 제외) · ' + rep.days + '일 · 평균〕**',
          p => topOf(p, true).pct, x => x.toFixed(2)],
        ['§0 «한 축 ≤50%» — 최대 유입 축 비중(%) 〔유입 장부(전체) · ' + rep.days + '일 · 평균〕',
          p => topOf(p, false).pct, x => x.toFixed(2)],
        /* ⚑ 8회차 정정(W 반박5) — [G] 가 실제로 쓰는 장부는 **셋**인데 8회차 초판이 둘만 찍었고,
           빠진 셋째(소환 예산 = 지속 − 소환 외 씽크)가 제일 나쁘다. ④ 의 둘째 줄이 이미 그
           분모를 쓰고 있으므로 §0 도 같은 자로 한 줄 더 찍어야 판정이 갈리는 것이 보인다. */
        ['§0 «한 축 ≤50%» — 최대 유입 축 비중(%) 〔**소환 예산 장부**(결2 ⓐ 확정 2026-09-01 — ④ 의 판정 장부) · ' + rep.days + '일 · 평균〕',
          p => topOf(p, true, true).pct, x => x.toFixed(2)],
        /* 10회차(정정1) — «나눈 값» 두 줄은 참고로 강등한다. ④ 의 판정 줄은 아래 «교차 실측» 이다. */
        ['④ 도달일(2,720.5만 · **' + rep.days + '일 나눈 값 — 참고**) 〔유입 장부 · p50 성분〕',
          p => reachOf(p, 'in'), x => x.toFixed(1), true],
        ['④ 도달일(2,720.5만 · ' + rep.days + '일 나눈 값 — 참고) 〔소환 예산 장부(결2 ⓐ 확정 2026-09-01 — ④ 의 판정 장부) · p50 성분〕',
          p => reachOf(p, 'summon'), x => x.toFixed(1), true],
      ];
      /* 비 칸 — 기본은 부지런/대충이지만 **도달일만 대충/부지런**이다(주인 목표 1.8~2.0 이 그 향이다).
         한 표에서 향이 섞이면 다음 회차가 역수를 그대로 읽는다 — 행마다 향을 적는다. */
      for (const [name, f, fmt, inv] of rows) {
        const v = pols.map(f);
        const ratio = !two ? NORATIO
                      : inv ? (v[0] ? (v[1] / v[0]).toFixed(3) + ' (대충/부지런)' : '-')
                            : (v[1] ? (v[0] / v[1]).toFixed(3) : '-');
        L.push(`| ${name} | ${v.map(fmt).join(' | ')} | ${ratio} |`);
      }
      /* ⚑⚑ 20회차(19-10 정정1 — 3인 일치) — **① 판정 줄.** 값은 [D] 헤드라인이 잰 그 순간의
         것이다(`JUDGE` · 재계산 없음). 이 다섯 줄이 없던 동안 [G] 는 ②③④ 만 있는 표였고,
         19회차가 ④ 의 다리를 «①» 이라 부른 것을 표가 반증할 방법이 없었다. */
      if (pols.every(p => JUDGE[p])) {
        const jrat = (f, inv) => {
          if (!two) return NORATIO;
          const v = pols.map(p => f(JUDGE[p]));
          return inv ? (v[0] ? (v[1] / v[0]).toFixed(3) + ' (대충/부지런)' : '-')
                     : (v[1] ? (v[0] / v[1]).toFixed(3) : '-');
        };
        const jcell = (f) => pols.map(p => f(JUDGE[p])).join(' | ');
        L.push(`| **① 목표 칸 적중 p50 〔달력 중앙 좌표 · ±20% · 1:1 배정 · [D] 헤드라인과 같은 자〕** | `
          + jcell(j => `${j.hit}/${j.tgtN} — 널 ${j.nullE.toFixed(2)} 대비 ${(j.hit - j.nullE) >= 0 ? '+' : ''}${(j.hit - j.nullE).toFixed(2)}칸${j.hit < j.nullE ? ' ⚠ **난수 이하**' : ''}`)
          + ` | ${jrat(j => j.hit - j.nullE)} |`);
        L.push(`| **① 창 밖 벽 p50 = §0 의 «없어야 할 벽»**(사다리 안 / 밖) | `
          + jcell(j => `${j.out} (안 ${j.outIn} · 밖 ${j.outOut})`) + ` | ${jrat(j => j.out)} |`);
        L.push(`| ① 잉여 벽 p50 (그중 창 안 중복) | `
          + jcell(j => `${j.extra} (중복 ${j.dup})`) + ` | ${jrat(j => j.extra)} |`);
        L.push(`| ① 첫 벽(배정) p50 — 목표 = 첫 도달 가능 칸 | `
          /* 13회차 JJ 규약 — **미정의는 미정의라고 적는다.** 배정 벽이 0개면 `firstOf` 는
             «0분» 을 돌려주는데, 그것을 목표로 나누면 «−100.0%» 라는 측정치처럼 읽히는
             수가 찍힌다(20회차 1차 실행의 대충 열이 실제로 그랬다 — 벽이 없는 것이지
             0분에 벽이 선 것이 아니다). */
          + jcell(j => j.first > 0
            ? `${fmtN(j.first)}분 / 목표 ${fmtN(j.reach0)}분` + (j.reach0 ? ` = ${(100 * (j.first / j.reach0 - 1)) >= 0 ? '+' : ''}${(100 * (j.first / j.reach0 - 1)).toFixed(1)}%` : '')
            : '— (미정의 · 배정 벽 0개)')
          + ` | ${jrat(j => j.first)} |`);
        L.push(`| ① 벽 간격 기하평균 p50 — 목표 ×(칸 사다리) | `
          + jcell(j => j.span > 0 ? `×${j.span.toFixed(3)} / 목표 ×${j.spanT.toFixed(3)}` + (j.spanT > 0 ? ` = ${(100 * (j.span / j.spanT - 1)) >= 0 ? '+' : ''}${(100 * (j.span / j.spanT - 1)).toFixed(1)}%` : '') : '— (미정의 · 배정 벽 2개 미만)')
          + ` | ${jrat(j => j.span)} |`);
      }
      /* ⚑ 13회차 — ④ 바로 위에 **그 외삽이 쓰는 기울기**를 놓는다. 두 줄을 나란히 읽으면
         «④ 가 왜 그 값인가» 가 나눗셈 한 번으로 검산된다: (목표 − 30일 누적) ÷ 이 값 + 30. */
      for (const mode of ['in', 'summon']) {
        const nm = LEDGER[mode];   /* 18회차 — 이름표도 공유한다([E2] 와 같은 표) */
        const t = pols.map(p => tailRate(p, mode));
        if (t.every(x => !x)) continue;
        const cell = tailCell;    /* 18회차 — 함수 스코프의 공유 서식 */
        const ratio = !two ? NORATIO : (t[0] && t[1] && t[1].p50 ? (t[0].p50 / t[1].p50).toFixed(3) : '-');
        const goalPct = t[0] ? ` — 목표 27만의 ${(100 * t[0].p50 / GOAL_DAY).toFixed(1)}%` : '';
        /* ⚑ 13회차 비평 JJ(R12) — 말미 창에 소환 외 씽크가 0 이면 두 장부가 **같은 수**다.
           정보량 0 인 줄이 판정 표에 두 줄로 서는 것보다 나쁜 것은, 그 동일성이 곧
           «소환 예산 ④ 의 외삽이 앞으로 입장권 지출 0 을 가정한다» 는 뜻이라는 점이다. */
        const same = mode === 'summon' && t[0] && t[1]
          && Math.abs(t[0].p50 - (tailRate(pols[0], 'in') || {}).p50) < 0.5;
        L.push(`| **${tailTitle(mode, t[0] || t[1])}**${goalPct}${same ? ' ⚠ **유입 장부와 동일값** — 말미 창에 소환 외 씽크가 0 이라, 이 장부의 ④ 외삽은 «앞으로 입장권 교환 지출 0» 을 가정한다' : ''} | ${t.map(cell).join(' | ')} | ${ratio} |`);
      }
      /* 10회차(정정1·11) — ④ 판정 줄 = 교차 실측. p50 옆에 산포(p10~p90)와 외삽 시드 수를
         같이 찍는다(외삽 = 측정 일수 안에 목표를 못 지나 말미 구간율로 민 시드). */
      for (const mode of ['in', 'summon']) {
        const nm = LEDGER[mode];   /* 18회차 — 이름표도 공유한다([E2] 와 같은 표) */
        const c = pols.map(p => crossOf(p, mode));
        if (c.every(x => !x)) {
          L.push(`| **④ 교차일(2,720.5만 · 실측) 〔${nm}〕** | (스냅에 누적 장부 없음 — 10회차 이전 --json) | — | — |`);
          continue;
        }
        const cell = crossCell;   /* 18회차 — 함수 스코프의 공유 서식 */
        const ratio = !two ? NORATIO : (c[0] && c[1] && c[0].p50 > 0 ? (c[1].p50 / c[0].p50).toFixed(3) + ' (대충/부지런)' : '-');
        L.push(`| ${crossTitle(mode)} | ${c.map(cell).join(' | ')} | ${ratio} |`);
        /* ⚑ 13회차 — 같은 줄의 **말미 창 민감도**. 외삽 시드가 0 이면 W 가 안 쓰이므로 생략한다
           (전 시드 실측이면 W 를 흔들어도 같은 수다 — 그 사실 자체가 판정의 강도다). */
        /* 18회차 정정A — 민감도도 [E2] 와 **같은 함수**다. `WS` 가 비면 행 자체를 안 찍는다
           (옛 코드는 `Wundefined` 와 빈 칸을 인쇄했다 — r18 quick 2건). */
        const wsA = pols.map(p => c.some(x => x && x.ex) ? wSensOf(p, mode) : null);
        if (wsA[0]) {
          const W0 = wsA[0].WS;
          L.push(`| ④ 교차일 — **말미 창 W 민감도**(외삽 시드에만 적용) 〔${nm} · p50〕 | ${wsA.map(x => x ? x.sp : '—').join(' | ')} | ${wsA[0].swing} (W${W0[0]}/W${W0[W0.length - 1]} · ${POLICIES[pols[0]].name}) |`);
        }
      }
      /* ⚑⚑ 20회차(19-10 정정2 · 16-3 «최고 회차 대조» 상설 규약) — «이 루프에서 처음» 이라는
         말이 **네 번** 재발했다(13-10 정정11 · 14-10 정정1 · 15-정정10 · 19-10 정정2). 규약을
         문서에만 적어 두면 다음 회차는 그 문서를 안 읽고 자기 표만 본다 ⇒ **자가 판정 표
         안에 최고 회차를 상설로 놓는다.** 값은 §8(8회차)의 ④ 세 수다 — 그 회차가 이 루프에서
         유일하게 «3/3 창 안» 을 찍었다(1236·1266행). 회차가 «처음» 을 적으려면 이 줄과
         나란히 놓아야 하고, 나란히 놓으면 그 말이 참인지 그 자리에서 갈린다. */
      L.push(`| _⚑ **§8 대조(8회차 = 최고 회차 · 상설)** — «처음» 을 말하기 전에 이 줄과 맞대라_ | `
        + pols.map(p => `_④ ${({ diligent: '102.1', casual: '190.1' })[p] || '—'}일 (3/3 창 안)_`).join(' | ')
        /* ⚑ 20회차 비평 AAC(정정4) — 이 줄의 «비» 칸에 8회차의 1.861 을 **표식 없이** 넣었더니,
           단일 정책 표에서 «다른 실행의 수가 비 칸에 앉는» 모양이 됐다 — 이 회차가 막겠다고
           한 바로 그 경로다. 값은 남기되 **출처를 칸 자신이 말한다.** */
        + ` | _§8(8회차)의 비 **1.861** — **이 실행의 수가 아니다**(대조용)_ |`);
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
