#!/usr/bin/env node
/* 504 재현 — 스킬 `hits` 선언 모델 ↔ 실제 타격수 (338 규칙: 처방 전에 제품에게 직접 묻는다)
 *
 *   node tools/probe504.js
 *
 * 등재문(PROGRESS 504)이 말하는 것은 두 종(lance·gale)뿐이지만, 그 뿌리는 «관통·링·장판이
 * 몇 번 때리는가는 선언이 아니라 **장면**이 정한다» 이므로 27종 전부를 같은 자로 잰다.
 *
 * ⚠ 394 규칙 — «무엇을 눈금으로 삼는가» 를 먼저 정하고 적는다. 이 프로브는 **눈금 후보 셋을
 * 나란히 재서 하나를 고르는 과정 자체**가 결과물이다(고른 이유는 `docs/review/504-*.md` §2).
 *
 *   [A] **실제 판 관측** — 스테이지 20 일반 전투 60초. 마릿수·거리 분포·몹 구성을 잰다.
 *       여기서 나오는 «세 프레임의 배치» 가 아래 ⓐ 의 재료다.
 *   [B] **눈금 후보 ⓐ 고정 장면(504-PIN)** — [A] 가 떠낸 프레임 배치를 그대로 고정(hp 무한).
 *       결정적(재실행 흔들림 ≤ 1.4%)이지만 **적이 못 도망가서 장판형이 부푼다.**
 *   [C] **눈금 후보 ⓑ 불사 자유 판** — `verify484` [E] 가 쓰던 하네스. 적이 안 죽어 플레이어에게
 *       **뭉치고**, 그 뭉침이 범위·장판형을 최대 14배 부풀린다. 등재문의 «lance 12.5 / gale 7.0»
 *       이 바로 이 하네스의 값이다 = **등재문의 두 숫자는 스킬이 아니라 하네스를 잰 것**이다.
 *   [D] **눈금 후보 ⓒ 개체수 고정 실제 판(채택 = 504-RUL)** — 몹이 실제로 죽는 자유 판이되
 *       **서 있는 적의 수를 관측 중앙값으로 고정**하고 K회 평균낸다. ⚑ 진단이 축을 하나로
 *       좁혔다 — 타격수를 정하는 것은 장면의 모양이 아니라 **적의 수**이고(poison: 평균 개체수
 *       13.8 / 27.4 / 52 에서 14.75 / 49.1 / 96.5), 자유 판의 개체수는 레벨 0 스킬 아래서 안 갇힌다.
 *       고정하면 흔들림이 23~77% → 12~32% 로 내려가고 이동·뭉침·사망은 실제 판 그대로 남는다.
 *
 * 출력은 전부 수치다. 처방·수정은 하지 않는다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const RULE = require('./rul504');   /* 722 — 채택 눈금(POP 고정)을 [C3] 이 읽는다. `[D]` 안의 지역 변수 `RUL` 과 이름이 겹치지 않게 `RULE` */
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  await page.waitForTimeout(500);

  /* ── [A] 실제 판 관측 — 표준 장면의 두 숫자가 어디서 오는가 ─────────── */
  const A = await page.evaluate(() => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    /* ⚑ 766 — 판을 **통째로** 되돌린다(620 규약 · 같은 파일 [B-f] 와 `rul504` 가 쓰는 그 입구).
       옛 코드는 `enemies.length = 0` 한 줄이었고 **`spawnQ` 는 그대로 남았다** — `goto` 뒤
       `waitForTimeout(500)` 동안 제품의 RAF 루프가 부팅 파도(`queueMobs()` 50마리 ·
       `delay = i*0.02 + rnd(0,0.3)`)를 몇 마리까지 꺼냈는가(= 기계 속도)가 첫 파도의 크기를
       정하고, 판 위 마릿수는 «50까지 채우고 처치로 빠지고 비면 다시 채우는» 톱니라
       60초 창이 어느 위상을 덮는지가 그것으로 갈렸다. 그래서 [A2] 가 실행마다 갈렸다
       (`probe766` [1]·[3]: 부팅 큐가 남은 실행 중앙값 **31** ↔ 다 빠진 실행 **21** · Δ10).
       ⚠ **문턱은 한 칸도 안 건드렸다** — 옮겨 간 것은 개체수가 아니라 창의 위상이고
       (`probe766` [9]·[10] 이 갈래 ⓐ·ⓑ 를 기각한다), 되돌리면 다시 가장자리에 붙는다([R]). */
    spawnStage();
    const cnt = [], dist = [], kind = {}, mins = [], snaps = [];
    const SNAP_AT = [15, 30, 45].map(t => t * 60);     /* 표준 장면으로 굳힐 세 프레임 */
    for (let f = 0; f < 60 * 60; f++) {
      step(1 / 60);
      /* 620 — 이 창의 이름은 «일반 전투» 다. `killed` 가 `ENEMY_COUNT` 에 차면 판이 도중에
         보스전으로 바뀌어(162) 마릿수·거리·몹 구성에 **다른 국면**이 섞인다(옛 장면은 실제로
         60초마다 보스가 2~3초 서 있었다 — `probe766` [5]). 눈금(`rul504`)이 POP 을 쓰는 자리와
         같은 조건으로 맞춘다. */
      killed = 0;
      if (f % 30 === 0 && f > 60 * 5) {            /* 0.5초마다 · 앞 5초는 채워지는 구간이라 뺀다 */
        const live = enemies.filter(e => e.hp > 0);
        cnt.push(live.length);
        let mn = Infinity;
        live.forEach(e => {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          dist.push(d); if (d < mn) mn = d; kind[e.tk] = (kind[e.tk] || 0) + 1;
        });
        if (mn < Infinity) mins.push(mn);
      }
      /* ⚑ 반경 분포만 재현하면 **각도 뭉침**이 사라진다 — 실제 판의 적은 플레이어를 쫓느라
         한쪽에 몰려 서고, 범위·장판형의 타격수는 바로 그 뭉침이 정한다. 그래서 표준 장면은
         «계산한 배치» 가 아니라 **실제 판에서 통째로 떠낸 프레임의 상대 좌표**를 쓴다. */
      if (SNAP_AT.indexOf(f) >= 0) {
        snaps.push(enemies.filter(e => e.hp > 0)
          .map(e => ({ tk: e.tk, dx: +(e.x - player.x).toFixed(2), dy: +(e.y - player.y).toFixed(2) })));
      }
    }
    const srt = dist.slice().sort((x, y) => x - y);
    const q = p => srt.length ? Math.round(srt[Math.min(srt.length - 1, Math.floor(srt.length * p))]) : 0;
    const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const N = med(cnt);
    /* 표준 장면의 «반경 사다리» — 관측 분포의 N 분위수를 그대로 쓴다. 링 하나에 몰아 세우면
       링형(gale)이 전부 맞고 관통형(lance)이 한 줄에 서는 인공 장면이 된다. */
    const ladder = [];
    for (let i = 0; i < N; i++) ladder.push(q((i + 0.5) / N));
    return { samples: cnt.length, nMed: N, nMean: +mean(cnt).toFixed(2),
             nMin: Math.min(...cnt), nMax: Math.max(...cnt), kind,
             dMed: q(0.5), dMean: Math.round(mean(dist)), dN: dist.length,
             d25: q(0.25), d75: q(0.75), ladder, snaps,
             nearMed: Math.round(med(mins)), nearMin: Math.round(Math.min(...mins)) };
  });
  console.log('  [A] 실제 판(스테이지 20 · 60초 · 표본 ' + A.samples + ')');
  console.log('      살아 있는 적 마릿수  중앙값 ' + A.nMed + ' · 평균 ' + A.nMean + ' · 범위 ' + A.nMin + '~' + A.nMax);
  console.log('      플레이어까지 거리    중앙값 ' + A.dMed + 'px · 평균 ' + A.dMean + 'px · 사분위 ' + A.d25 + '~' + A.d75 + ' (표본 ' + A.dN + ')');
  console.log('      가장 가까운 적       중앙값 ' + A.nearMed + 'px · 최소 ' + A.nearMin + 'px');
  console.log('      몹 구성              ' + Object.keys(A.kind).map(k => k + ' ' + A.kind[k]).join(' · '));
  console.log('      반경 사다리(504-STD) ' + A.ladder.join(', '));
  ok(A.samples > 100 && A.nMed > 0, 'A1 실제 판 관측 표본이 모였다', A.samples + '표본 · 적 중앙값 ' + A.nMed);
  /* ⚠ 766 — **밴드 [12, 32] 는 한 칸도 안 건드렸다.** 고친 것은 위 장면이고, 괄호의 범위만
     620 규약 위에서 다시 쟀다(`probe766` 17회: 15~26 · 중앙값 23 = POP). `probe766` [0] 이
     이 두 수를 **이 줄에서 읽어** 대조하므로 여기 값을 옮기면 그쪽이 따라온다(사본 0개). */
  ok(A.nMed >= 12 && A.nMed <= 32, 'A2 관측 개체수가 눈금 상수 POP=23 과 같은 자리다(실행마다 15~26 으로 흔들린다)',
     '이번 실행 ' + A.nMed + ' · 범위 ' + A.nMin + '~' + A.nMax);

  /* ── [B] 표준 장면 504-STD 에서 27종 실측 ───────────────────────────── */
  const SCENE = { snaps: A.snaps, sec: 30 };
  const B = await page.evaluate(({ snaps, sec }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    /* 504-STD — [A] 가 실제 판에서 떠낸 세 프레임의 배치를 그대로 고정한다(플레이어 원점 기준
       상대 좌표). 마릿수·반경 분포·**각도 뭉침**이 전부 실제 판의 것이고, 고정이라 되먹임
       («세면 적이 빨리 죽어 표적이 준다»)이 없어 m 을 역산하는 자로 쓸 수 있다.
       세 프레임의 평균을 값으로 쓰고, 셋의 흩어짐도 같이 적는다. */
    const setup = (snap) => {
      enemies.length = 0;
      for (const o of snap) makeEnemy(o.tk);
      pinTo(snap);
    };
    const pinTo = (snap) => {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      for (let i = 0; i < enemies.length && i < snap.length; i++) {
        const e = enemies[i];
        e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
        e.hp = e.max = 1e30; e.slow = 0;
      }
      if (enemies.length > snap.length) enemies.length = snap.length;
    };
    const one = (s, snap) => {
      shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      skillCd[s.id] = 0;
      ownSave = S.own; S.own = { [s.id]: { l: 0 } }; S.eqSkill = [s.id]; markDirty();
      setup(snap);
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === s.id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) { step(1 / 60); pinTo(snap); }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      return { per: casts ? hits / casts : 0, hps: hits / sec, casts, hits };
    };
    const out = [];
    for (const s of SKILLS) {
      const runs = snaps.map(sn => one(s, sn));
      const avg = k => runs.reduce((a, r) => a + r[k], 0) / runs.length;
      const per = avg('per'), hps = avg('hps');
      const spread = per ? (Math.max(...runs.map(r => r.per)) - Math.min(...runs.map(r => r.per))) / per : 0;
      const declared = skillHits(s);
      out.push({ id: s.id, g: s.g, cd: s.cd, m: s.m, sup: !!s.sup, declared,
                 casts: Math.round(avg('casts')), hits: Math.round(avg('hits')), sec,
                 per: +per.toFixed(3), hps: +hps.toFixed(3), spread: +spread.toFixed(3),
                 each: runs.map(r => +r.per.toFixed(2)),
                 off: declared ? +(per / declared - 1).toFixed(4) : null });
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, SCENE);

  console.log('\n  [B] 표준 장면 504-STD (실제 판에서 떠낸 ' + A.snaps.length + '프레임 · '
    + A.snaps.map(s => s.length).join('/') + '마리 · 각 ' + SCENE.sec + '초 · 평균)');
  console.log('      ' + 'id'.padEnd(8) + 'g  cd    선언   실측    이탈%   3프레임      흩어짐');
  B.forEach(x => console.log('      ' + x.id.padEnd(8) + x.g + '  ' + String(x.cd).padEnd(5) + ' '
    + String(x.declared).padEnd(6) + String(x.per).padEnd(8)
    + (x.off === null ? '  —   ' : (x.off * 100).toFixed(1).padStart(6)) + '  '
    + x.each.join('/').padEnd(14) + (x.spread * 100).toFixed(0).padStart(4) + '%'
    + (x.cd === 0 ? '   (지속형 — 초당 ' + x.hps + '회, 모델 3)' : '')));

  const cast = B.filter(x => x.cd > 0 && !x.sup);
  ok(cast.every(x => x.casts > 0), 'B1 cd>0 인 종이 표준 장면에서 전부 발동했다',
     cast.filter(x => !x.casts).map(x => x.id).join(',') || '미발동 0종');
  const bad = cast.filter(x => Math.abs(x.off) > 0.15);
  ok(bad.length > 0, 'B2 «선언 ↔ 실측 ±15%» 를 벗어나는 종이 실제로 있다(등재문 재현)',
     bad.length + '종: ' + bad.map(x => x.id + ' ' + x.declared + '→' + x.per).join(' · '));
  const named = B.filter(x => x.id === 'lance' || x.id === 'gale');
  ok(true, 'B3 등재문이 지목한 두 종의 표준 장면 값',
     named.map(x => x.id + ' 모델 ' + x.declared + ' vs 실측 ' + x.per
       + ' (' + (x.off * 100).toFixed(0) + '%)').join(' · '));

  /* ── [B-r] 재현성 — 같은 장면을 한 번 더 돌려 흔들림 폭을 본다 ───────── */
  const Br = await page.evaluate(({ snaps, sec, ids }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    const pinTo = (snap) => {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      for (let i = 0; i < enemies.length && i < snap.length; i++) {
        const e = enemies[i];
        e.x = player.x + snap[i].dx; e.y = player.y + snap[i].dy;
        e.hp = e.max = 1e30; e.slow = 0;
      }
      if (enemies.length > snap.length) enemies.length = snap.length;
    };
    const out = {};
    for (const id of ids) {
      const s = SK[id];
      let tot = 0;
      for (const snap of snaps) {
        shots.length = 0; zones.length = 0;
        if (typeof drones !== 'undefined') drones.length = 0;
        skillCd[id] = 0;
        /* ⚑ 보유 상태를 **격리**한다. `S.own` 에 앞서 시험한 스킬이 쌓이면 `bonus()` 의 보유 효과가
         커져 플레이어가 점점 세지고, 적이 빨리 죽어 장판·범위형의 타격수가 순서에 따라 갈린다
         (504 1회차에 poison 이 11.1 ↔ 18.1 로 갈린 원인이 정확히 이것이다). */
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
        enemies.length = 0; for (const o of snap) makeEnemy(o.tk); pinTo(snap);
        let hits = 0, casts = 0;
        window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
        window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
        for (let f = 0; f < 60 * sec; f++) { step(1 / 60); pinTo(snap); }
        window.castSkill = rawCast; window.hitEnemy = rawHit;
        S.own = ownSave; markDirty();
        tot += casts ? hits / casts : 0;
      }
      out[id] = +(tot / snaps.length).toFixed(3);
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, Object.assign({ ids: ['slash', 'lance', 'gale', 'holy', 'flask'] }, SCENE));
  const drift = Object.keys(Br).map(id => {
    const a = B.find(x => x.id === id).per;
    return { id, a, b: Br[id], d: a ? Math.abs(Br[id] / a - 1) : 0 };
  });
  console.log('\n  [B-r] 재현성 — ' + drift.map(x => x.id + ' ' + x.a + '↔' + x.b
    + ' (' + (x.d * 100).toFixed(1) + '%)').join(' · '));
  /* ⚑ 722 — 옛 항은 «≤ 5%» 라는 **절대 문턱**이었고 그 값이 실측 분포의 한복판이었다
     (`probe722` [4]: 실행별 최악 **1.4 ~ 8.3%** · 평균 2.6 ~ 5.4% — 8회 실행). 그래서 실행마다 갈렸다.
     문턱을 손으로 넓히는 대신 **새 상수를 안 만들었다**: 이 저장소가 이미 «잰 값» 에서 뽑아 둔
     허용 오차 바닥 `rul504.TOL_FLOOR`(0.40 = [D] 가 K=6 에서 잰 평균의 흔들림 최악 ±30% + 여유)의
     **절반**을 쓴다. 실측 최악 8.3% 의 2.4배 바깥이고, 장면이 안 고정되면(아래 대조군) 곧바로 빨개진다.
     ⚠ 옛 괄호의 «불사 자유 판은 12% 였다» 는 **620 이전의 부분 초기화 하네스**에서 나온 숫자다 —
     620 규약(`spawnStage()` 로 판을 통째로 되돌리고 `killed` 를 눌러 둔다)으로 다시 재면 같은 종의
     자유 판 2회 흔들림이 아래 [B-f] 처럼 0 ~ 4% 다. 그 괄호는 다시 인용하지 않는다(722 정오표). */
  const Bf = await page.evaluate(({ sec, ids }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    const one = (id) => {
      S.stage = 20; spawnStage();
      enemies.length = 0; spawnQ.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) { step(1 / 60); killed = 0; }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      return +((SK[id].cd > 0 ? (casts ? hits / casts : 0) : hits / sec)).toFixed(3);
    };
    const out = {};
    for (const id of ids) out[id] = { a: one(id), b: one(id) };
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { sec: SCENE.sec, ids: Object.keys(Br) });
  const fdrift = Object.keys(Bf).map(id => ({ id, a: Bf[id].a, b: Bf[id].b,
    d: Bf[id].a ? Math.abs(Bf[id].b / Bf[id].a - 1) : 0 }));
  console.log('  [B-f] 대조군 — 같은 종·같은 초수의 **자유 판** 2회(620 규약 초기화) · '
    + fdrift.map(x => x.id + ' ' + x.a + '↔' + x.b + ' (' + (x.d * 100).toFixed(1) + '%)').join(' · '));
  const wPin = Math.max(...drift.map(x => x.d));
  ok(wPin < RULE.TOL_FLOOR / 2,
     'Br1 표준 장면의 재실행 흔들림이 채택 눈금의 허용 오차 바닥(`rul504.TOL_FLOOR`)의 절반 아래다 — 새 상수 없음(722)',
     '최악 ' + (wPin * 100).toFixed(1) + '% < ' + (RULE.TOL_FLOOR / 2 * 100).toFixed(0)
     + '% (실측 분포 8회: 최악 1.4~8.3%)');

  /* ── [C] 눈금 후보 셋을 나란히 — 왜 ⓐ·ⓑ 가 아니라 ⓒ(개체수 고정)가 채택됐나 ─────
     ⓐ PIN    = [B] 고정 장면(관측 배치를 그대로 굳힘)
     ⓑ 불사   = `verify484` [E] 가 쓰던 하네스(자유 판 + hp 무한).
     ⓒ 실제   = 몹이 실제로 죽는 자유 판(= [A] 를 잰 그 판). 아래 [D] 가 이것을 눈금으로 채택한다.

     ⚑⚑ **722 정오표 — 이 절의 옛 문장 둘은 «잰 것» 이 아니라 «해석» 이었다.**
     옛 [C1]·[C2] 는 세 칸의 **점추정 하나씩**을 비율로 나눠 «ⓑ 가 훨씬 멀다»·«그 이탈이 100%
     를 넘는다» 를 물었다. 그런데 세 칸이 전부 **판 위 개체수**를 안 잡는다 — 504-② 자신이
     «타격수를 정하는 것은 서 있는 적의 수» 라고 적은 그 축이다. 그래서:
       · ⓐ 는 15·30·45초라는 **시각**으로 뜬 세 프레임이라 그 마릿수가 실행마다
         34/21/5 · 1/36/22 · 33/17/51 로 갈린다([A] 표 자신이 «범위 0~50» 이라고 적는다).
       · ⓑ·ⓒ 는 개체수 상한이 없다(불사 판은 상한 ≈49 에 붙고, 실제 판은 14~25).
       · 분모(ⓒ)가 ⏸접촉 `aura` 에서 **1 근처까지** 내려가(최소 1.03) 그 한 종의 이탈이
         807% 로 튀는 실행에서만 6종 평균이 문턱 1.0 을 넘었다 = **[C2] 를 초록으로 만들던 것은
         하네스가 아니라 한 종의 분모였다**(`probe722` [1-b]).
       · 게다가 옛 대조는 **초수까지 달랐다**(불사 40초 ↔ 실제 60초).
     ⚑ **«적이 뭉쳐서 부푼다» 는 기각됐다** — POP 을 고정하고 불사만 켜면 부호가 종마다 갈린다
     (lance·flask·poison 은 오르고 gale·aura·nova 는 내린다 — [C3]). 부풀림의 뿌리는 **개체수**다.
     ⓑ 를 버린 504 의 결론은 그대로다 — 바뀐 것은 **기계의 이름**뿐이고, 옛 «최대 14배» 는
     초수까지 다른 대조의 숫자라 다시 쓰지 않는다. 상세 `docs/review/722-*.md` §3. */
  const CIDS = ['lance', 'gale', 'flask', 'poison', 'aura', 'nova'];
  const POP_REF = RULE.POP;          /* 채택 눈금이 고정하는 개체수 — 선언은 `rul504.js` 한 곳뿐이다 */
  const C_SEC = 40, C_REPS = 3;      /* ⚑ 722 — **같은 초수**로, 그리고 한 점추정이 아니라 R회 평균으로 */
  const Cruns = [];
  for (let r = 0; r < C_REPS; r++) {
    Cruns.push(await page.evaluate(({ ids, sec }) => {
      const rawCast = window.castSkill, rawHit = window.hitEnemy;
      let ownSave;
      const run = (id, immortal) => {
        /* 620 규약 — 판 초기화는 제품의 «새 판» 입구 하나로(손목록은 뒤처진다) */
        S.stage = 20; spawnStage();
        enemies.length = 0; spawnQ.length = 0; shots.length = 0; zones.length = 0;
        if (typeof drones !== 'undefined') drones.length = 0;
        for (const k of Object.keys(skillCd)) delete skillCd[k];
        /* ⚑ 보유 상태를 **격리**한다(504 1회차에 poison 이 11.1 ↔ 18.1 로 갈린 원인) */
        ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
        let hits = 0, casts = 0, popSum = 0, popN = 0;
        window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
        window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
        for (let f = 0; f < 60 * sec; f++) {
          if (immortal) for (const e of enemies) { e.hp = e.max = 1e30; }   /* `verify484` [E] 하네스 */
          step(1 / 60);
          killed = 0;                                   /* 162 의 50킬 자동 보스 진입을 막는다(620) */
          if (f % 30 === 0) { popSum += enemies.filter(e => e.hp > 0).length; popN++; }
        }
        window.castSkill = rawCast; window.hitEnemy = rawHit;
        S.own = ownSave; markDirty();
        return { per: casts ? +(hits / casts).toFixed(3) : 0, hps: +(hits / sec).toFixed(3), casts,
                 pop: +(popSum / Math.max(1, popN)).toFixed(1) };
      };
      const out = {};
      for (const id of ids) out[id] = { imm: run(id, true), real: run(id, false) };
      enemies.length = 0; shots.length = 0; zones.length = 0;
      S.eqSkill = ['slash']; markDirty();
      return out;
    }, { ids: CIDS, sec: C_SEC }));
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const cmp = CIDS.map(id => {
    const row = B.find(x => x.id === id);
    const pick = (k, f) => avg(Cruns.map(c => row.cd > 0 ? c[id][k].per : c[id][k].hps));
    const std = row.cd > 0 ? row.per : row.hps;
    const imm = pick('imm'), real = pick('real');
    return { id, cd: row.cd, std, imm: +imm.toFixed(3), real: +real.toFixed(3),
             immPop: +avg(Cruns.map(c => c[id].imm.pop)).toFixed(1),
             realPop: +avg(Cruns.map(c => c[id].real.pop)).toFixed(1),
             infl: real ? imm / real : 0,
             popX: avg(Cruns.map(c => c[id].real.pop)) ? avg(Cruns.map(c => c[id].imm.pop)) / avg(Cruns.map(c => c[id].real.pop)) : 0,
             hold: RULE.held695({ id, decl: row.declared }) };
  });
  console.log('\n  [C] 눈금 후보 셋 — ⓐPIN(고정) · ⓑ불사(verify484 [E] 하네스) · ⓒ실제(몹이 죽는 자유 판)');
  console.log('      ⓑ·ⓒ 는 **같은 초수 ' + C_SEC + '초 · ' + C_REPS + '회 평균**이고 판 위 개체수도 같이 잰다(722)');
  console.log('      ' + 'id'.padEnd(8) + 'ⓐPIN'.padEnd(10) + 'ⓑ불사'.padEnd(10) + 'ⓒ실제'.padEnd(10)
    + '값 배수'.padEnd(9) + '불사 적수'.padEnd(11) + '실제 적수'.padEnd(11) + '적수 배수');
  cmp.forEach(x => console.log('      ' + x.id.padEnd(8) + String(x.std).padEnd(10) + String(x.imm).padEnd(10)
    + String(x.real).padEnd(10) + ('×' + x.infl.toFixed(2)).padEnd(9)
    + String(x.immPop).padEnd(11) + String(x.realPop).padEnd(11) + '×' + x.popX.toFixed(2)
    + (x.hold ? '   (⏸접촉 — 695)' : '') + (x.cd === 0 ? ' (지속형 — 초당)' : '')));

  /* [C1] — 옛 항은 «ⓑ 가 ⓐ 보다 **훨씬** 멀다» 는 부호였다. 그 부호는 잡음 안에서 갈린다
     (721 «잡음 폭 안에서 부호를 묻고 있었다» 와 같은 함정). 재현이 되는 사실만 남긴다:
     **두 자유 판은 개체수가 안 갇힌다** — 그것이 ⓒ를 «POP 고정» 으로 채택한 이유 그 자체다. */
  const popGap = cmp.filter(x => x.popX > 1.5).length;
  ok(popGap === cmp.length && cmp.every(x => Math.abs(x.immPop - POP_REF) > POP_REF * 0.5),
     'C1 ⓑ·ⓒ 두 자유 판은 판 위 개체수가 안 갇힌다 — 불사 판은 상한에 붙고 실제 판은 그 절반 이하다',
     '불사 ' + Math.min(...cmp.map(x => x.immPop)) + '~' + Math.max(...cmp.map(x => x.immPop))
     + '마리 · 실제 ' + Math.min(...cmp.map(x => x.realPop)) + '~' + Math.max(...cmp.map(x => x.realPop))
     + '마리 (채택 눈금이 고정하는 값 POP=' + POP_REF + ') · 배수 ×'
     + Math.min(...cmp.map(x => x.popX)).toFixed(2) + '~×' + Math.max(...cmp.map(x => x.popX)).toFixed(2));

  /* [C2] — 그래서 그 하네스의 값이 위로 뜬다. **같은 초수·같은 종**으로 묻고, 판정에서는
     ⏸접촉(695)을 뺀다 — «이 눈금으로 못 잰다» 고 적어 놓고 그 값을 단언에 넣으면 자가 자기
     말을 뒤집는다(695 §4-6 이 [D2] 에서 한 처분). 표에는 남겨 매 실행 찍힌다.

     ⚑⚑ **775 정오표 — 옛 판정의 «전 종» 은 이 자 자신의 [C3] 이 이미 거짓이라고 적어 둔 말이었다.**
     옛 항은 `judged.every(infl > 1.15)` 였고 `nova` 가 그 문턱에 **붙어 살았다**(4회 중 1회 빨강 ·
     실측 1.09~1.78 · 여유가 다른 종의 1/6~1/10). 그런데 [C3] 은 같은 실행에서 «개체수를 고정하면
     부호가 종마다 갈린다(gale·nova 는 내려간다)» 를 **PASS 로** 찍는다 — 즉 이 자는 한 항으로
     «전 종 균일» 을 묻고 다음 항으로 «종마다 갈린다» 를 물어 **스스로를 뒤집고 있었다.**
     ⚠ 문턱 1.15 를 내리는 길은 695-④·759·766 이 세 번 기각했고, 여기서도 답이 아니다 —
     `nova` 의 중심값 자체가 1.3 근처라 반복 수를 3 → 12 로 올려도(√ 로만 좁아진다) 여유가
     1σ 언저리에 남는다. **뿌리는 표본도 문턱도 아니라 «전칭» 이라는 판정의 모양**이다.
     ⇒ 333 처방대로 자리를 비우지 않고 방향을 갈랐다:
       · **크기**는 «전 종» 이 아니라 **중앙값·평균**이 진다([C2] — 문턱은 내린 게 아니라 1.15 →
         **1.5(중앙값)** 로 오히려 올라갔고, 실측 중앙값 1.75~2.13 이라 여유가 넉넉하다).
       · **왜 종마다 다른가**는 [C2b] 가 진다 — 항등식 `값 배수 = 개체수 배수 × 도달 몫 비` 에서
         갈리는 것은 **도달 몫**(한 발이 판의 몇 %를 때리는가)이다. `nova`(t:'area' r250)는
         개체수가 ×2.4 로 늘어도 그 반경 밖에 쌓이므로 도달 몫이 반토막 난다 = **포화**다.
       · **이 바가 잡음만으로 넘어가지 않는다**는 [C2r] 이 진다(759-② «면제를 얹으면 통째로
         사라져도 초록인지 세어 보라»의 짝) — 하네스를 끈 짝(실제↔실제)에는 같은 바를 못 넘는다.
     상세 `docs/review/775-probe504불사배수전칭단언.md`. 재현 자는 `tools/probe775.js`. */
  const judged = cmp.filter(x => !x.hold);
  const med = a => { const s = a.slice().sort((p, q) => p - q); const h = s.length >> 1;
                     return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
  const inflMed = med(judged.map(x => x.infl)), inflAvg = avg(judged.map(x => x.infl));
  ok(inflMed >= 1.5 && inflAvg >= 1.3,
     'C2 `verify484` [E] 불사 하네스는 값을 위로 민다 — ⏸접촉을 뺀 표본의 **중앙값·평균**이 위로 간다(종별 크기는 [C2b] 몫)',
     judged.map(x => x.id + ' ×' + x.infl.toFixed(2)).join(' · ')
     + ' · 중앙값 ×' + inflMed.toFixed(2) + '(≥1.5) · 평균 ×' + inflAvg.toFixed(2) + '(≥1.3)'
     + (cmp.length - judged.length ? ' (⏸접촉 제외: ' + cmp.filter(x => x.hold).map(x => x.id + ' ×' + x.infl.toFixed(2)).join(',') + ')' : ''));

  /* [C2b] — 옛 전칭이 거짓인 **이유**를 자가 직접 잰다. `infl = popX × rx` 는 항등식이므로
     (`rx` = 도달 몫 비 = 「불사 판에서 한 발이 판의 몇 %」 ÷ 「실제 판에서 한 발이 판의 몇 %」)
     묻는 것은 항등식이 아니라 **`rx` 가 종마다 갈린다는 사실**과 **`infl` 의 순위를 정하는 것이
     개체수가 아니라 그 `rx` 라는 것**이다 — 값 배수의 아래쪽은 «그날 잡음이 때린 종» 이 아니라
     **포화한 종**이다(개체수가 ×2 넘게 늘어도 반경 밖에 쌓여 도달 몫이 반토막 난다).
     ⚠ 이름도, «꼴찌 한 종» 도 적지 않았다(620·759-③ · 775 1회차 실측 — 값 배수의 최솟값은
     `nova` 와 `gale` 사이를 오간다. 그 둘은 [C3] 이 «개체수를 고정하면 내려간다» 로 이미 같이
     지목한 짝이라 **한 종만 묻는 자는 그 자체로 또 동전**이었다). 순위 상관 하나로 묻는다. */
  const rxOf = x => (x.imm / x.immPop) / (x.real / x.realPop);
  const rxs = judged.map(x => ({ id: x.id, rx: rxOf(x), infl: x.infl }));
  const rank = (arr, key) => { const s = arr.slice().sort((a, b) => a[key] - b[key]);
                               return new Map(s.map((x, i) => [x.id, i + 1])); };
  const rRx = rank(rxs, 'rx'), rIn = rank(rxs, 'infl'), n = rxs.length;
  const d2 = rxs.reduce((a, x) => a + Math.pow(rRx.get(x.id) - rIn.get(x.id), 2), 0);
  const rho = 1 - 6 * d2 / (n * (n * n - 1));            /* 스피어만 — n=5 라 인접 1회 뒤바뀜이 0.9 */
  const rxSpread = Math.max(...rxs.map(x => x.rx)) / Math.min(...rxs.map(x => x.rx));
  console.log('      [C2b] 도달 몫 비 rx(= 한 발이 판의 몇 % 를 때리는가, 불사÷실제) — '
    + rxs.map(x => x.id + ' ' + x.rx.toFixed(2)).join(' · '));
  ok(rxSpread >= 1.5 && rho >= 0.7,
     'C2b 값 배수가 종마다 다른 뿌리는 **도달 몫**이다 — `rx` 가 종마다 갈리고(포화), 값 배수의 순위를 정하는 것이 개체수가 아니라 그 `rx` 다',
     'rx 최대÷최소 ×' + rxSpread.toFixed(2) + '(≥1.5) · 순위상관 ρ(rx, 값 배수) ' + rho.toFixed(2) + '(≥0.7)'
     + ' · rx 아래 둘 ' + rxs.slice().sort((a, b) => a.rx - b.rx).slice(0, 2).map(x => x.id).join(',')
     + ' · 값 배수 아래 둘 ' + rxs.slice().sort((a, b) => a.infl - b.infl).slice(0, 2).map(x => x.id).join(','));

  /* [C2r] — **되돌림 시험(새 상수·새 실행 0).** [C2] 의 바(중앙값 1.5)가 «하네스 덕» 인지
     «잡음 덕» 인지 가른다: 같은 `Cruns` 안에서 **하네스를 끈 짝**(실제 ↔ 다른 회차의 실제)으로
     같은 비를 만들면 그 중앙값은 1 근처에 앉아 바를 못 넘어야 한다. 넘으면 [C2] 는 하네스가
     아니라 회차 흔들림을 재고 있는 것이다(722 «[C2] 를 초록으로 만들던 것은 한 종의 분모였다»). */
  const nullX = [];
  for (const x of judged) {
    const row = B.find(y => y.id === x.id), k = row.cd > 0 ? 'per' : 'hps';
    const v = Cruns.map(c => c[x.id].real[k]);
    for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) if (i !== j && v[j]) nullX.push(v[i] / v[j]);
  }
  const nullMed = med(nullX);
  ok(nullMed < 1.5 && nullMed > 1 / 1.5,
     'C2r 되돌림 — 하네스를 끈 짝(실제↔실제)은 같은 바를 못 넘는다 ⇒ [C2] 가 잰 것은 회차 흔들림이 아니라 하네스다',
     '무하네스 중앙값 ×' + nullMed.toFixed(2) + ' (바 1.5 · 표본 ' + nullX.length + '쌍 · 폭 ×'
     + Math.min(...nullX).toFixed(2) + '~×' + Math.max(...nullX).toFixed(2) + ')');

  /* [C3] — **되돌림 시험 겸 기계 확정.** 같은 불사를 «개체수를 고정한 자» 위에서 켜면
     그 부풀림이 사라지고 부호가 종마다 갈린다 ⇒ [C2] 가 잰 것은 «뭉침» 이 아니라 **개체수**다.
     이 항이 없으면 [C2] 는 «불사면 무조건 세진다» 로 읽혀 기각된 뭉침 가설이 되살아난다. */
  const cage = {};
  for (const mode of ['real', 'imm']) {
    const rows = await RULE.measure(page, CIDS, { immortal: mode === 'imm' });
    rows.forEach(x => { (cage[x.id] = cage[x.id] || {})[mode] = x.mean; });
  }
  const cageX = CIDS.map(id => ({ id, x: cage[id].real ? cage[id].imm / cage[id].real : 0 }));
  console.log('      [C3] 같은 불사를 채택 눈금(POP=' + POP_REF + ' 고정) 위에서 켜면 — '
    + cageX.map(x => x.id + ' ×' + x.x.toFixed(2)).join(' · '));
  ok(cageX.some(x => x.x > 1) && cageX.some(x => x.x < 1),
     'C3 개체수를 고정하면 그 부풀림이 사라진다 — 부호가 종마다 갈린다 ⇒ 뿌리는 «뭉침» 이 아니라 **개체수**다',
     '위 ' + cageX.filter(x => x.x > 1).map(x => x.id).join(',') + ' · 아래 '
     + cageX.filter(x => x.x < 1).map(x => x.id).join(','));

  /* ── [D] 채택한 눈금 504-RUL — 개체수를 고정한 실제 판, K회 평균 ───────
     ⚑ **여기가 이 프로브의 결론이다.** 앞의 셋을 재고 나서 진짜 축이 무엇인지 드러났다 —
     타격수를 정하는 것은 «장면의 모양» 이 아니라 **서 있는 적의 수**다(진단 실측: 같은 skill·
     같은 스테이지·같은 공격력에서 평균 개체수 13.8 / 27.4 / 52 일 때 poison 이 14.75 / 49.1 / 96.5).
     그리고 자유 판의 개체수는 **안 갇힌다** — 레벨 0 스킬이 스포너를 못 따라가면 계속 불어난다.
     ⇒ 눈금은 «자유 판» 이되 **개체수를 관측 중앙값 N 으로 고정**한다(넘치면 가장 먼 것부터 지우고
     모자라면 게임 자신의 스포너가 채운다). 이동·뭉침·사망은 전부 실제 판 그대로 남고,
     되먹임(«세면 표적이 준다»)만 갇힌다. 흔들림이 23~77% → 12~32% 로 내려간다.
     여기서 나오는 `mean` 이 제품의 `hits` 선언이 될 값이고, `spread` 가 게이트 허용 오차의 근거다. */
  /* ⚠ POP 은 **상수**여야 한다 — 관측 중앙값 자체가 실행마다 15~26 으로 흔들려서(같은 [A] 를
     반복하면 17·21·23·24·25·26 이 나온다) 그 값을 그대로 쓰면 눈금이 실행마다 달라진다.
     23 = 여러 번의 [A] 관측 중앙값이고, 게이트 `verify504` 가 같은 상수를 쓴다. */
  const K = 6, SEC = 25, POP = 23;
  const RUL = await page.evaluate(({ K, SEC, POP }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    const one = (id, sec) => {
      /* ⚑ 판을 **통째로** 되돌린다. 아래 넷 중 하나라도 남으면 «몇 번째로 잰 종인가» 가 값을
         바꾼다 — 504 1회차에 poison 이 프로브(15번째)와 게이트(8번째)에서 29.4 ↔ 42.1 로
         갈렸고, 뿌리는 `killed`(누적 처치 → 보스 소환 눈금)와 죽어 있던 플레이어였다. */
      S.stage = 20; killed = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      /* ⚑ 보유 상태를 **격리**한다. `S.own` 에 앞서 시험한 스킬이 쌓이면 `bonus()` 의 보유 효과가
         커져 플레이어가 점점 세지고, 적이 빨리 죽어 장판·범위형의 타격수가 순서에 따라 갈린다
         (504 1회차에 poison 이 11.1 ↔ 18.1 로 갈린 원인이 정확히 이것이다). */
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * sec; f++) {
        step(1 / 60);
        /* 개체수 고정 — 넘치면 **가장 먼** 것부터 지운다(가까운 것을 지우면 교전 밀도가 꺼진다) */
        while (enemies.length > POP) {
          let wi = 0, wd = -1;
          for (let i = 0; i < enemies.length; i++) {
            const d = (enemies[i].x - player.x) ** 2 + (enemies[i].y - player.y) ** 2;
            if (d > wd) { wd = d; wi = i; }
          }
          enemies.splice(wi, 1);
        }
        while (enemies.length < POP) { const b = enemies.length; makeEnemy('zombie'); if (enemies.length === b) break; }
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      return { per: casts ? hits / casts : 0, hps: hits / sec, casts };
    };
    const out = [];
    for (const s of SKILLS) {
      const runs = []; for (let k = 0; k < K; k++) runs.push(one(s.id, SEC));
      /* cd>0 은 «발동 1회당 타격», cd=0(지속형)은 «초당 타격» 이 자다 — 모델의 `×3` 자리다 */
      const v = runs.map(r => s.cd > 0 ? r.per : r.hps);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const declared = skillHits(s);   /* 504 — 제품의 발수 입구 하나(옛 삼항 사슬·«×3» 상수 없음) */
      out.push({ id: s.id, g: s.g, cd: s.cd, m: s.m, sup: !!s.sup, declared,
                 mean: +mean.toFixed(3), each: v.map(x => +x.toFixed(2)),
                 spread: mean ? +((Math.max(...v) - Math.min(...v)) / mean).toFixed(3) : 0,
                 sem: mean ? +(((Math.max(...v) - Math.min(...v)) / mean) / (2 * Math.sqrt(K))).toFixed(3) : 0,
                 casts: Math.round(runs.reduce((a, r) => a + r.casts, 0) / K),
                 off: declared ? +(mean / declared - 1).toFixed(4) : null });
    }
    enemies.length = 0; shots.length = 0; zones.length = 0;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { K, SEC, POP });
  console.log('\n  [D] 채택 눈금 504-RUL — 개체수 ' + POP + ' 고정 실제 판 · ' + K + '회 × ' + SEC + '초 평균 (cd 0 은 «초당»)');
  console.log('      ' + 'id'.padEnd(8) + 'g  cd    선언   평균     이탈%    K회 폭   평균의 폭');
  RUL.forEach(x => console.log('      ' + x.id.padEnd(8) + x.g + '  ' + String(x.cd).padEnd(5) + ' '
    + String(x.declared).padEnd(6) + String(x.mean).padEnd(9)
    + (x.off === null ? '   —  ' : (x.off * 100).toFixed(0).padStart(6)) + '  '
    + (x.spread * 100).toFixed(0).padStart(6) + '%' + (x.sem * 100).toFixed(0).padStart(8) + '%'));
  const rBad = RUL.filter(x => Math.abs(x.off) > 0.15);
  ok(rBad.length > 0, 'D1 채택 눈금에서도 선언이 ±15% 를 벗어나는 종이 많다(결함의 크기)',
     rBad.length + '/' + RUL.length + '종 · 최악 '
     + rBad.reduce((a, b) => Math.abs(a.off) > Math.abs(b.off) ? a : b).id + ' '
     + (Math.max(...rBad.map(x => Math.abs(x.off))) * 100).toFixed(0) + '%');
  const worstSem = Math.max(...RUL.filter(x => x.mean > 0).map(x => x.sem));
  ok(true, 'D2 «평균의 흔들림» 이 게이트 허용 오차의 하한이다 — ±15% 는 이 눈금으로 못 잡는다',
     'K=' + K + ' 에서 최악 ±' + (worstSem * 100).toFixed(0) + '%');

  /* ── [E] 모델이 아픈 자리 — 등급 안 «실제 DPS» 가 얼마나 벌어져 있나 ─── */
  const D = await page.evaluate(hitsMap => {
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (!t.length) return;
      const model = t.map(s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s));
      const real = t.map(s => s.cd > 0 ? s.m * hitsMap[s.id] / s.cd : s.m * hitsMap[s.id]);
      rows.push({ g, ids: t.map(s => s.id),
                  mRatio: Math.max(...model) / Math.min(...model),
                  rRatio: Math.max(...real) / Math.min(...real),
                  worst: t[real.indexOf(Math.max(...real))].id,
                  weak: t[real.indexOf(Math.min(...real))].id });
    });
    return rows;
  }, Object.fromEntries(RUL.map(x => [x.id, x.cd > 0 ? (x.mean || 1) : 3])));
  console.log('\n  [E] 등급 안 편차 — 모델(선언) vs 실제(채택 눈금 [D])');
  D.forEach(r => console.log('      g' + r.g + '  모델 ' + r.mRatio.toFixed(3)
    + '  →  실제 ' + r.rRatio.toFixed(3) + '   (최강 ' + r.worst + ' / 최약 ' + r.weak + ')'));
  ok(D.some(r => r.rRatio > 1.5), 'E1 «등급 안 DPS 동일»(484)이 실제로는 깨져 있다',
     '최악 g' + D.reduce((a, b) => a.rRatio > b.rRatio ? a : b).g + ' ' + Math.max(...D.map(r => r.rRatio)).toFixed(2) + '배');

  /* 기계가 읽을 표 — 처방(hits 재선언 · m 재역산)이 이 파일을 그대로 쓴다 */
  const outPath = path.resolve(__dirname, '..', 'docs', 'measure', '504-hits-실측.json');
  const { snaps, ...aNoSnap } = A;
  fs.writeFileSync(outPath, JSON.stringify({
    ruler: { name: '504-RUL', scene: '실제 판(스테이지 20 자유 전투, 몹 사망 있음) + 개체수 고정',
             pop: POP, reps: K, sec: SEC,
             unit: 'cd>0 = 발동 1회당 타격수 · cd=0 = 초당 타격수' },
    pinScene: { frames: A.snaps.length, n: A.snaps.map(s => s.length), sec: SCENE.sec,
                note: '눈금 후보 ⓐ(채택 안 함) — 실제 판 15·30·45초 배치를 고정' },
    observed: aNoSnap, ruled: RUL, pinned: B, control: cmp
  }, null, 2) + '\n');
  console.log('\n  표 저장: docs/measure/504-hits-실측.json');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
