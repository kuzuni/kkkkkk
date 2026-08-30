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
  };
  window.BOT = B;

  /* ── 시드 고정 난수 (등재문 ④ — 시드 20개) ───────────────────────────── */
  const REAL_RANDOM = Math.random;
  let rngS = 1;
  const setSeed = (n) => { rngS = (n >>> 0) || 1; };
  Math.random = function () {                       /* xorshift32 — 재현 가능 */
    rngS ^= rngS << 13; rngS >>>= 0;
    rngS ^= rngS >> 17;
    rngS ^= rngS << 5;  rngS >>>= 0;
    return rngS / 4294967296;
  };
  B.setSeed = setSeed;
  B.realRandom = REAL_RANDOM;

  /* ── rAF 정지 (probe494 [B]) ─────────────────────────────────────────── */
  B.freeze = () => { window.requestAnimationFrame = () => 0; };

  /* ── 시계 ────────────────────────────────────────────────────────────── */
  const MIN = 60000;
  B.now = () => window.__botT;
  B.advance = (ms) => { window.__botT += ms; };

  /* ── 피해 감시 — `hitEnemy` 는 함수 선언이라 window 속성이다 ─────────── */
  let dmgAcc = 0, killAcc = 0, hpAcc = 0, goldAcc = 0;
  const rawHit = window.hitEnemy, rawKill = window.killEnemy;
  window.hitEnemy = function (e, dmg, crit) {
    dmgAcc += Math.min(dmg, e ? e.hp : dmg);        /* 넘치는 피해는 «넣은 피해» 가 아니다 */
    return rawHit.apply(this, arguments);
  };
  window.killEnemy = function (e) {
    if (e) { killAcc++; hpAcc += e.max || 0; }
    const g0 = S.gold; const r = rawKill.apply(this, arguments); goldAcc += S.gold - g0;
    return r;
  };
  const meterReset = () => { dmgAcc = killAcc = hpAcc = goldAcc = 0; };

  /* ── try 래퍼 — 한 손잡이가 없어져도 봇 전체가 안 죽는다(LESSONS 319) ── */
  const T = (tag, fn) => { try { return fn(); } catch (e) { B.warn.push(tag + ': ' + String(e && e.message || e).slice(0, 120)); return null; } };

  /* ── 재화 장부 ───────────────────────────────────────────────────────── */
  let diaPrev = 0;
  const ledger = (src) => {
    const d = S.dia - diaPrev; diaPrev = S.dia;
    if (d > 0) B.diaIn[src] = (B.diaIn[src] || 0) + d;
    else if (d < 0) B.diaOut[src] = (B.diaOut[src] || 0) - d;
  };
  B.ledgerSync = () => { diaPrev = S.dia; };

  /* ======================================================================
     1. 보정치 — 구간 표본 (실전 60초)
     ====================================================================== */
  /* 재는 것 셋:
       κ_dps  = 실전 초당 유효 피해 / `stat.dps`      («수식 DPS 를 실전으로 환산»)
       κ_hp   = 실전 처치 몹 평균 체력 / `eHp(s)`     («몹 섞임» 을 한 수로)
       κ_gold = 실전 킬당 골드 / `eGold(s)`           («골드 배수» 를 한 수로)
     ⚠ 표본은 «지금 이 세이브» 가 아니라 **스테이지만 갈아 끼운 같은 캐릭터**로 찍는다 —
       세 비는 스탯이 아니라 «전장의 모양» 을 재는 값이라야 접기가 성립한다. */
  B.calibrate = (stages, sec) => {
    const keep = { stage: S.stage, best: S.best, farm: S.bossFarm };
    const out = [];
    for (const s of stages) {
      S.stage = s; S.bossFarm = false;
      T('cal.spawn', () => { bossOn = false; enemies.length = 0; spawnStage(); });
      /* 준비 프레임 — 첫 스폰·접근이 표본을 오염시키지 않게 5초 버린다 */
      for (let i = 0; i < 150; i++) step(1 / 30);
      meterReset();
      const n = Math.round(sec * 30);
      for (let i = 0; i < n; i++) step(1 / 30);
      const dps = stat.dps || 1;
      out.push({
        s, sec,
        realDps: dmgAcc / sec, formDps: dps, kDps: (dmgAcc / sec) / dps,
        kills: killAcc,
        kHp: killAcc ? (hpAcc / killAcc) / eHp(s) : null,
        kGold: killAcc ? (goldAcc / killAcc) / eGold(s) : null,
      });
    }
    S.stage = keep.stage; S.best = keep.best; S.bossFarm = keep.farm;
    T('cal.restore', () => { bossOn = false; enemies.length = 0; spawnStage(); });
    const avg = (k) => { const v = out.map(o => o[k]).filter(x => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 1; };
    B.cal = { rows: out, kDps: avg('kDps'), kHp: avg('kHp'), kGold: avg('kGold') };
    return B.cal;
  };

  /* ======================================================================
     2. 접힌 파밍 — 1분 틱
     ====================================================================== */
  /* 한 틱이 하는 일: (a) 이번 분의 처치·골드 (b) 50킬 차면 보스 판정 (c) 강화 한 바퀴.
     보스 판정이 이 게임의 «벽» 그 자체다 — `BOSS_SEC` 안에 못 잡으면 스테이지가 안 오른다.
     ⚑ 스테이지를 올리는 것은 이 함수뿐이고, 「같은 스테이지에 30분」 이 곧 벽 1개다. */
  const MOB_N = ENEMY_COUNT;
  B.farmMinute = () => {
    const c = B.cal;
    const dps = Math.max(1e-9, stat.dps * c.kDps);
    const s = S.stage;
    const mobHp = eHp(s) * c.kHp;
    const tKill = mobHp / dps;                         /* 한 마리에 몇 초 */
    let left = 60, kills = 0;
    while (left > 0) {
      const need = MOB_N - (S.botKills || 0);
      const canKill = Math.min(Math.max(0, need), Math.floor(left / tKill));
      if (canKill > 0) {
        kills += canKill; left -= canKill * tKill;
        S.botKills = (S.botKills || 0) + canKill;
        S.gold += canKill * eGold(s) * c.kGold * stat.goldMul;
      }
      if ((S.botKills || 0) < MOB_N) break;             /* 남은 시간은 다음 마리에 쓴다(반올림 손실은 다음 분으로) */
      /* ── 보스 판정 ── */
      const bossHp = eHp(s) * ETYPE.boss.hp * bossGateHp(s);
      const tBoss = bossHp / dps;
      if (tBoss <= BOSS_SEC) {
        left -= tBoss;
        S.botKills = 0;
        S.gold += eGold(s - 1 > 0 ? s - 1 : 1) * 20;    /* 클리어 보상(제품 `bonusG` 배수와 같은 자리) */
        S.stage = s + 1; if (S.stage > S.best) S.best = S.stage;
        S.bossFarm = false;
        return { kills, cleared: true };
      }
      /* 실패 — 파밍으로 되돌아간다(제품 `failBoss` 와 같은 상태). 50킬은 다시 안 센다. */
      left -= BOSS_SEC;
      S.botKills = Math.max(0, MOB_N - 1);              /* 보스 재도전은 «한 마리만 더» 로 다시 열린다 */
      S.bossFarm = true;
      return { kills, cleared: false };
    }
    return { kills, cleared: false };
  };

  /* ======================================================================
     3. 하루 루틴 — 손잡이들
     ====================================================================== */
  const R = {};

  R.attend = () => T('출석', () => { const before = S.dia; claimAttend(null); ledger('출석'); return S.dia - before; });
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
  const runBattle = (maxSec, done) => {
    const N = Math.round(maxSec * 30);
    for (let i = 0; i < N; i++) { step(1 / 30); if (done()) return i / 30; }
    return maxSec;
  };
  R.dungeons = () => T('던전', () => {
    let runs = 0, clears = 0;
    for (const d of DUNGEONS) {
      let guard = 0;
      while ((S.dunTk[d.id] | 0) > 0 && guard++ < 12) {
        const tk0 = S.dunTk[d.id] | 0;
        challengeDungeon(d);
        if ((S.dunTk[d.id] | 0) === tk0) break;             /* 잠김·전투 중 — 더 못 돈다 */
        runs++;
        runBattle(DUN_SEC + 8, () => !dunRun);
        if (dunRun) { T('던전:포기', () => { if (typeof endDunRun === 'function') endDunRun(); }); }
        if (S.dunLv && S.dunLv[d.id] != null) clears += 0;   /* 층 수는 아래 표에서 직접 읽는다 */
      }
    }
    ledger('던전');
    return { runs, clears };
  });
  R.towers = () => T('탑', () => {
    let runs = 0;
    for (const id of ['tower', 'tower2']) {
      let guard = 0;
      while (guard++ < 6) {
        const lv0 = S[id] | 0;
        T('탑:' + id, () => challengeTower(id));
        runs++;
        runBattle(BOSS_SEC + 8, () => !inBossFight || !inBossFight());
        if ((S[id] | 0) === lv0) break;                     /* 못 올라갔다 = 여기가 그 유저의 탑 한계 */
      }
    }
    ledger('탑');
    return runs;
  });

  R.bless = () => T('축복', () => { let n = 0; for (const b of BLESS) { if (!blessOn(b.k) && typeof blessStart === 'function') { blessStart(b.k); n++; } } return n; });

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
    const cnt = () => SHOP_BOXES.map(x => ({ b: x.b, n: (S.cnt && S.cnt['sum_' + x.b]) || 0 }));
    let guard = 0;
    while (guard++ < 400) {
      const order = cnt().sort((a, b) => a.n - b.n);
      const b = order[0].b;
      const cost = summonCost(b, 10);
      if (S.dia < cost * 1.0) break;
      const d0 = S.dia; doSummon(b, 10);
      if (S.dia === d0) break;
      S.cnt['sum_' + b] = ((S.cnt && S.cnt['sum_' + b]) || 0) + 10;
      n += 10;
    }
    ledger('소환');
    return n;
  });
  R.relicSummon = () => T('유물소환', () => {
    let n = 0, guard = 0;
    while (guard++ < 200) { const r0 = S.relic; doSummon('relic', 1); if (S.relic === r0) break; n++; }
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

  R.train = () => T('훈련', () => {
    let n = 0, guard = 0;
    while (guard++ < 4000) {
      let any = false;
      for (const id of TRAIN_STATS) { if (trainBuy(id)) { any = true; n++; } }
      if (typeof trainReady === 'function' && trainReady()) { T('훈련단계', () => trainUp()); any = true; }
      if (!any) break;
    }
    return n;
  });
  R.upgrade = () => T('강화', () => {
    let n = 0, guard = 0;
    if (typeof UPG === 'undefined') return 0;
    while (guard++ < 4000) {
      let any = false;
      for (const u of UPG) { const bi = buyInfo(u); if (bi && bi.ok && bi.n > 0) { applyBuy(u, bi.n, bi.cost); markDirty(); any = true; n++; } }
      if (!any) break;
    }
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
    let n = 0, guard = 0;
    while (guard++ < 3000) { let any = false; for (const t of TEMPERS) { const b = S.temper ? JSON.stringify(S.temper) : ''; temperUp(t.k); if (JSON.stringify(S.temper || {}) !== b) { any = true; n++; } } if (!any) break; }
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
      const cap = S.eqSkill.length ? S.eqSkill.length : 1;
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

async function runOne(page, pol, seed, days, onRow) {
  const P = POLICIES[pol];
  const res = await page.evaluate(async (a) => {
    const B = window.BOT, R = B.R;
    B.setSeed(a.seed);
    B.freeze();
    B.ledgerSync();
    const out = { rows: [], walls: [], day1: [], sessions: 0 };
    let lastLogout = null;
    let minute = 0, lastStage = -1, stageSince = 0;

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
        }
        out.sessions++;
        /* ── 수령 ── */
        R.attend(); R.mail(); R.quest(); R.guide(); R.pass(); R.ads(); R.roulette();
        R.bless();
        /* ── 실전(던전·탑) ── */
        R.dungeons(); R.towers();
        /* ── 재화 소진 ── */
        R.spendAll();
        R.equipBest();
        B.audit('day' + day + '/h' + h);
        /* ── 활성 파밍 ── */
        for (let m = 0; m < a.activeMin; m++) {
          B.farmMinute();
          if (m % 5 === 4) R.spendGold();          /* 재도전 사이 «강화 한 바퀴» */
          minute++; B.advance(60000);
          if (S.stage !== lastStage) {
            if (lastStage >= 0 && minute - stageSince >= a.wallMin)
              out.walls.push({ stage: lastStage, min: stageSince, len: minute - stageSince });
            lastStage = S.stage; stageSince = minute;
          }
          if (day === 1 && minute % 10 === 0) mark('D1+' + minute + 'm');
        }
        lastLogout = B.now();
      }
      mark('D' + day);
      B.audit('day' + day + ' 끝');
    }
    /* 마지막 정체도 벽으로 센다 */
    if (lastStage >= 0 && minute - stageSince >= a.wallMin)
      out.walls.push({ stage: lastStage, min: stageSince, len: minute - stageSince });
    out.diaIn = B.diaIn; out.diaOut = B.diaOut; out.viol = B.viol.slice(); out.warn = B.warn.slice();
    out.final = B.snap('final', minute);
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
    await page.goto(URL);
    await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
    await page.evaluate(BOT_SRC, {});
    report.cal = await page.evaluate(([st, sec]) => { window.BOT.freeze(); return window.BOT.calibrate(st, sec); }, [CAL_STAGES, CAL_SEC]);
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
  L.push('| 스테이지 | 실전 DPS | 수식 `stat.dps` | κ_dps | 처치 | κ_hp | κ_gold |');
  L.push('|---|---|---|---|---|---|---|');
  for (const r of rep.cal.rows)
    L.push(`| ${r.s} | ${fmtN(r.realDps)} | ${fmtN(r.formDps)} | ${r.kDps.toFixed(3)} | ${r.kills} | ${r.kHp == null ? '—' : r.kHp.toFixed(3)} | ${r.kGold == null ? '—' : r.kGold.toFixed(3)} |`);
  L.push('');
  L.push(`**평균 — κ_dps ${rep.cal.kDps.toFixed(3)} · κ_hp ${rep.cal.kHp.toFixed(3)} · κ_gold ${rep.cal.kGold.toFixed(3)}**`);
  L.push('');
  L.push('· κ_dps < 1 이면 «수식 DPS 가 실전보다 후하다» 는 뜻이다 — 접근·스폰 대기·투사체 비행이 그 차이다.');
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
    /* 벽 */
    const wallsAll = runs.map(r => r.walls.length);
    L.push(`### [D] 벽 — ${P} (같은 스테이지 ${WALL_MIN}분 이상 정체)`);
    L.push('');
    L.push(`벽 개수 p10/p50/p90 = ${q(wallsAll, 0.1)} / ${med(wallsAll)} / ${q(wallsAll, 0.9)}`);
    L.push('');
    L.push('| # | 스테이지 | 시작(분) | 길이(분) | 시작 시각 |');
    L.push('|---|---|---|---|---|');
    (runs[0] ? runs[0].walls : []).slice(0, 24).forEach((w, i) => {
      const h = Math.floor(w.min / 60), m = w.min % 60;
      L.push(`| ${i + 1} | ${w.stage} | ${w.min} | ${w.len} | ${h}시간 ${m}분 |`);
    });
    L.push('');
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
