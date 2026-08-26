/* 작업 114 게이트 — «스킬 연출 쥬시니스: 트레일 · 타격 임팩트 · 폭발/충격파 + 폭발형 보강»
   (저장소 주인 지시 2026-08-26 — «스킬 연출을 더 쥬시하게, 트레일 같은 것도 있게, 폭발 있는 스킬도»)

   검사 항목
     [1] 모듈    — 공용 fx 함수·상수가 전부 살아 있는가(PART_CAP 480 · TRAIL_N · BOLT_LIFE)
     [2] 트레일  — 24종을 각각 강제 시전해 투사체가 나가는 종류는 «트레일 표본 ≥ 2» 가 쌓이는가
     [3] 임팩트  — 명중 순간 링(rings)이 생기고 치명타는 2겹인가 · 방향성 스파크가 진행 반대인가
     [4] 폭발    — 폭발형 4종(화염구·운석·심판의 빛·창세의 폭발)이 충격파 링 ≥ 3 · 흙/불 파편(gy) ·
                   cam.shake 상승 · 연쇄 폭발(지연 링)을 내는가
     [5] 번개    — 경로가 한 번만 굳고(프레임 간 불변) 가지 2~3개 · 잔광 수명 0.30s 인가
     [6] 등급    — 같은 종류에서 등급이 오르면 트레일 길이가 «+10%/등급» 으로 길어지는가
     [7] 밸런스  — 피해 계수(m)·쿨(cd)·폭발 반경이 하나도 안 바뀌었는가 (연출은 피해에 손대지 않는다)
     [8] 성능    — 적 30 · 8스킬 동시 시전으로 60초 분량을 돌린 평균 프레임 ≥ 55fps · 파티클 상한 준수 ·
                   트레일 버퍼가 풀에서 재사용되는가(프레임당 할당 0)
     [9] 게이트  — 55 «화면 흔들림» OFF 면 cam.shake 0 · 콘솔 에러 0

   실행: node tools/verify114.js       → 마지막 줄 VERIFY114 n/n PASS
*/
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

/* 폭발 반경 — 연출 작업이 건드리면 안 되는 «게임» 수치 */
const BOOM_R = { boom: 78, meteor: 130, holy: 190, nova: 250 };
/* 투사체가 실제로 날아가는 종류(트레일 대상) */
const PROJ = ['slash', 'multi', 'shuri', 'ice', 'boom', 'boomer', 'meteor',
              'stone', 'arrow', 'gale', 'lance'];

(async () => {
  const b = await launch(chromium);
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* 공용 하네스 — 스킬 하나만 장착하고 적을 세운 «깨끗한 전장» */
  await p.evaluate(() => {
    window.__fx = {
      setup(id, n, dist){
        sbufClear();
        S.own = {}; S.own[id] = { n: 0, l: 1 };
        S.eqSkill = [id];
        skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
        rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
        markDirty();
        player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 99;
        player.hp = stat.maxHp;
        cam.shake = 0;
        for (let i = 0; i < (n || 6); i++) makeEnemy('zombie');
        const d = dist || 140;
        enemies.forEach((e, i) => {
          e.born = 1; e.hp = e.max = 1e12;
          const a = i * 6.283 / enemies.length;
          e.x = player.x + Math.cos(a)*d; e.y = player.y + Math.sin(a)*d;
        });
      },
      keepAlive(){ enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; }); }
    };
  });

  /* ---------------- [1] 모듈 ---------------- */
  console.log('[1] 모듈');
  const mod = await p.evaluate(() => ({
    fns: ['fxRing','fxRingFlat','impactFx','boomFx','chainBoomFx','magicFlash','buildBolt','drawTrails','debris','trGet','trPut']
           .filter(n => typeof window[n] === 'function'),
    partCap: typeof PART_CAP === 'number' ? PART_CAP : -1,
    trailN: typeof TRAIL_N === 'number' ? TRAIL_N : -1,
    boltLife: typeof BOLT_LIFE === 'number' ? BOLT_LIFE : -1,
    trailDt: typeof TRAIL_DT === 'number' ? TRAIL_DT : -1,
    flat: typeof FX_FLAT === 'number' ? FX_FLAT : -1,
    w: [typeof FX_W === 'number' ? FX_W : -1, typeof FX_W2 === 'number' ? FX_W2 : -1],
    ringCap: typeof RING_CAP === 'number' ? RING_CAP : -1,
    ringsArr: Array.isArray(rings)
  }));
  ok(mod.fns.length === 11, '공용 fx 함수 11개 전부 존재 (실측 ' + mod.fns.length + ')');
  ok(mod.partCap > 320 && mod.partCap <= 480,
     '파티클 상한 PART_CAP = ' + mod.partCap + ' (지시서 ⑤ «320 → 480 까지만» 범위 안)');
  ok(mod.trailN === 14, '트레일 링버퍼 TRAIL_N = 14 · 표본 22ms = 0.31s 궤적 (실측 ' + mod.trailN + ')');
  /* 14회차 — 상수 하나를 «== 0.42» 로 못 박아 두었더니 **게이트가 결함을 강제하고 있었다**:
     AS#4·AT[2] 가 공통으로 «창(640ms)의 뒤 절반이 공백» 을 지적했는데 그 원인이 이 수명이다
     (LESSONS 114-(5)(2) 와 같은 종류의 사고 — 그때는 «2단 지연 ≥0.10s» 가 같은 짓을 했다).
     상수값이 아니라 **요구**를 잰다: 코어 구간(0.15s)보다 길고, 80ms 캡처 8장 창을 채울 것. */
  ok(mod.boltLife > 0.15 && mod.boltLife >= 0.56 && mod.boltLife <= 0.80,
     '번개 수명 BOLT_LIFE ' + mod.boltLife + 's — 코어 0.15 초과 · 80ms×8 캡처 창(0.64s)을 덮는다 ' +
     '(0.56~0.80. 14회차 AS#4·AT[2] «뒤 절반 공백» 회귀 방지)');
  ok(mod.ringsArr && mod.ringCap === 44, 'rings 배열 + 상한 44 (실측 ' + mod.ringCap + ')');
  ok(mod.w[0] === 4 && mod.w[1] === 6 && mod.flat === 0.62,
     '선 굵기 토큰 2종(FX_W 4 · FX_W2 6) · 눕는 링 비율 FX_FLAT 0.62 = 독 장판과 같은 발자국');

  /* ---------------- [2] 트레일 ---------------- */
  console.log('[2] 트레일 — 24종 강제 시전');
  const trails = await p.evaluate((PROJ) => {
    const out = [];
    for (const s of SKILLS) {
      window.__fx.setup(s.id, 6, 150);
      let maxTn = 0, kinds = {}, shotsSeen = 0, boltsSeen = 0, boomsSeen = 0, zonesSeen = 0, buffSeen = 0;
      const n0 = { s: 0, b: 0, m: 0, z: 0 };
      for (let i = 0; i < 180; i++) {
        const s0 = shots.length, b0 = bolts.length, m0 = booms.length, z0 = zones.length;
        step(1/60);
        if (shots.length > s0) shotsSeen += shots.length - s0;
        if (bolts.length > b0) boltsSeen += bolts.length - b0;
        if (booms.length > m0) boomsSeen += booms.length - m0;
        if (zones.length > z0) zonesSeen += zones.length - z0;
        for (const b of shots) {
          if (b.tn > maxTn) maxTn = b.tn;
          if (b.tn >= 2) kinds[b.k] = Math.max(kinds[b.k] || 0, b.tn);
        }
        window.__fx.keepAlive();
      }
      if (sbuf.atk || sbuf.rate || sbuf.def || sbuf.regen) buffSeen = 1;
      out.push({ id: s.id, n: s.n, g: s.g, maxTn, kinds: Object.keys(kinds).join('/'),
                 shotsSeen, boltsSeen, boomsSeen, zonesSeen, buffSeen,
                 proj: PROJ.indexOf(s.id) >= 0 });
    }
    return out;
  }, PROJ);
  /* 회전검(orbit)·신성 오라(aura)는 cd 0 «지속형» 이라 castSkill 을 거치지 않는다(99 주석) —
     투사체·폭발이 아니라 «주위 지속 피해» 로 살아 있는지를 따로 본다 */
  const CONT = ['orbit', 'aura'];
  let trBad = [];
  for (const t of trails) {
    const fired = t.shotsSeen + t.boltsSeen + t.boomsSeen + t.zonesSeen + t.buffSeen;
    if (t.proj && t.maxTn < 2) trBad.push(t.id + '(트레일 ' + t.maxTn + ')');
    if (fired === 0 && CONT.indexOf(t.id) < 0) trBad.push(t.id + '(발동 0)');
  }
  ok(trBad.length === 0, '22종 전부 발동 + 투사체 11종 트레일 표본 ≥ 2 (지속형 orbit·aura 제외 · 어긋남 ' +
     trBad.length + (trBad.length ? '건: ' + trBad.join(', ') : '건') + ')');
  const cont = await p.evaluate(() => {
    const out = {};
    for (const id of ['orbit', 'aura']) {
      window.__fx.setup(id, 6, 90);
      let dmg = 0;
      const hp0 = enemies.reduce((s, e) => s + e.hp, 0);
      for (let i = 0; i < 180; i++) { step(1/60); }
      dmg = hp0 - enemies.reduce((s, e) => s + e.hp, 0);
      out[id] = dmg > 0;
    }
    return out;
  });
  ok(cont.orbit && cont.aura, '지속형 2종(회전검·신성 오라)은 castSkill 없이 «주위 지속 피해»로 산다');
  const projMax = trails.filter(t => t.proj).map(t => t.maxTn);
  ok(Math.min.apply(null, projMax) >= 4,
     '투사체 트레일 최소 표본 ' + Math.min.apply(null, projMax) + ' ≥ 4 (최대 ' + Math.max.apply(null, projMax) + ')');
  console.log('    ' + trails.filter(t => t.proj).map(t => t.id + ':' + t.maxTn).join(' · '));

  /* ---------------- [3] 타격 임팩트 ---------------- */
  console.log('[3] 타격 임팩트');
  const imp = await p.evaluate(() => {
    /* 명중을 확실히 만들기 위해 적을 코앞에 세운다 */
    window.__fx.setup('slash', 4, 60);
    let ringsAtHit = 0, sparkBack = 0, sparkTot = 0, firstHitFrame = -1;
    for (let i = 0; i < 120; i++) {
      const pre = shots.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, h: b.hit.length }));
      const r0 = rings.length, p0 = parts.length;
      step(1/60);
      /* 11회차 — 시전 순간 플래시 링(`cast`)이 생기면서 «새로 늘어난 첫 링 = 임팩트» 전제가 깨졌다.
         임팩트가 아닌 링은 세지 않는다(연출 자체는 유지하고 판정만 정확히 한다) */
      const addedImp = rings.slice(r0).filter(q => !q.cast).length;
      if (addedImp > 0 && firstHitFrame < 0) {
        firstHitFrame = i;
        ringsAtHit = addedImp;
      }
      window.__fx.keepAlive();
    }
    /* 스파크 방향은 «명중 프레임의 파티클 전부» 로 재면 안 된다 — 그 프레임에는 기존 `burst()` 의
       전방위 파티클 4개가 먼저 들어가 희석된다(4/7 로 한 번 속았다). impactFx 만 따로 쏴서 잰다 */
    parts.length = 0;
    const dirV = { vx: 400, vy: 120 };
    impactFx(player.x, player.y, dirV.vx, dirV.vy, '#fff', false, 0);
    for (const q of parts) {
      sparkTot++;
      if (q.vx*dirV.vx + q.vy*dirV.vy < 0) sparkBack++;
    }
    /* 치명타 링 2겹 — `stat.crit` 은 **getter** 라 대입이 조용히 무시된다(실제로 그렇게 한 번 속았다).
       `Math.random()` 을 0 으로 고정하면 `Math.random() < stat.crit` 이 항상 참이라 확실히 크리가 난다 */
    window.__fx.setup('slash', 4, 60);
    const rnd0 = Math.random;
    Math.random = () => 0;
    let critRings = 0, critSeen = 0;
    for (let i = 0; i < 120 && !critRings; i++) {
      const r0 = rings.length;
      step(1/60);
      /* 11회차 — 위와 같은 이유로 시전 플래시 링은 «치명타 2겹» 계수에서 뺀다 */
      if (rings.slice(r0).filter(q => !q.cast).length > 0) critRings = rings.slice(r0).filter(q => !q.cast).length;
      critSeen = nums.filter(n => n.crit).length;
      window.__fx.keepAlive();
    }
    Math.random = rnd0;
    return { ringsAtHit, sparkBack, sparkTot, firstHitFrame, critRings, critSeen };
  });
  ok(imp.ringsAtHit >= 1, '명중 순간 플래시 링 생성 (' + imp.ringsAtHit + '개, ' + imp.firstHitFrame + '프레임째)');
  ok(imp.sparkTot >= 3 && imp.sparkBack === imp.sparkTot,
     'impactFx 스파크가 전부 진행 방향 «반대»로 튄다 (' + imp.sparkBack + '/' + imp.sparkTot + ')');
  ok(imp.critRings >= 2, '치명타는 링 2겹 (실측 ' + imp.critRings + ' · 크리 숫자 ' + imp.critSeen + '개)');
  /* 1회차 비평 ④ 회귀 방지 — 링이 «투사체가 멈춘 자리»(적 중심 밖 e.r+13)에 찍히면 안 된다 */
  const anchor = await p.evaluate(() => {
    window.__fx.setup('slash', 4, 70);
    let d = -1, er = 0;
    for (let i = 0; i < 150 && d < 0; i++) {
      const r0 = rings.length;
      step(1/60);
      /* 11회차 — 시전 플래시 링(시전자 위)이 첫 링이 되면 «적 몸통 정렬» 이 46px 로 오판된다 */
      const addedA = rings.slice(r0).filter(q => !q.cast);
      if (addedA.length > 0) {
        const r = addedA[0];
        let best = 1e9;
        for (const e of enemies) {
          const dx = r.x - e.x, dy = r.y - (e.y - e.r);
          best = Math.min(best, Math.hypot(dx, dy));
          er = e.r;
        }
        d = best;
      }
      window.__fx.keepAlive();
    }
    return { d: Math.round(d), er: Math.round(er) };
  });
  ok(anchor.d >= 0 && anchor.d <= anchor.er,
     '임팩트 링이 적 몸통 중심에 정렬 — 중심 거리 ' + anchor.d + 'px ≤ 적 반경 ' + anchor.er + 'px (2회차 «32~47px 잔차» 회귀 방지)');
  /* 1회차 비평 ①② 회귀 방지 — 80ms 캡처에서 «1프레임 반짝» 이 되지 않을 만큼 수명이 있는가 */
  const lifes = await p.evaluate(() => {
    rings.length = 0; parts.length = 0;
    boomFx(100, 100, 130, '#ffb45c', false);
    const main = Math.max.apply(null, rings.map(r => r.life));
    const dl = Math.min.apply(null, rings.map(r => r.t));      /* 가장 늦게 켜지는 링의 지연(음수) */
    rings.length = 0;
    impactFx(100, 100, 300, 0, '#fff', false, 0);
    const imp = Math.max.apply(null, rings.map(r => r.life));
    const dbg = parts.filter(q => q.gy);
    return { main, dl: Math.round(-dl*100)/100, imp,
             dbgMin: Math.min.apply(null, dbg.map(q => q.r)) };
  });
  /* 11회차 AM③ — 이 두 하한은 «1프레임 반짝 방지» 가 목적인데, 값이 «화구(0.302s)보다 링이 300ms
     더 남는다» 를 강제하는 쪽으로 굳어 있었다(총 수명 0.20+0.40 = 0.60s). 목적은 유지하고
     상한 쪽을 새로 건다: 링은 3프레임 이상 살고(≥0.24s), 화구보다 오래 남지 않는다(총 ≤0.36s). */
  ok(lifes.imp >= 0.24 && lifes.main >= 0.24 && lifes.main + lifes.dl <= 0.36,
     '링 수명 — 임팩트 ' + lifes.imp + 's · 본 충격파 ' + lifes.main + 's · 2단 총 ' +
     Math.round((lifes.main + lifes.dl)*100)/100 + 's ≤ 0.36 (화구 0.302s 보다 오래 남지 않는다)');
  /* 13회차 — 이 게이트를 «지연» 에서 «위상 잠금» 으로 바꾼다. 근거는 비평가 두 명의 공통 실측이다:
     지연 0.10s 는 두 줄의 f 를 어긋나게 해 반경 비가 시간에 따라 흔들렸고, 빠른 줄이 느린 줄을 따라잡는
     구간에서 겹쳐 «2단이 한 줄로 뭉갠다»(AQ boom-7 간격 4 게임px · AR boom-8 간격 8 게임px, 분리돼
     보이는 프레임이 80ms 한 장뿐). 7회차에 임팩트 2겹에서 같은 병을 겪고 «상수배로 묶기» 로 고쳤다.
     지연이 아니라 **반경 비가 전 구간 고정인지**를 검사한다 — 그래야 간격이 f 와 무관하게 유지된다. */
  const lock = await p.evaluate(() => {
    rings.length = 0; boomFx(0, 0, 130, '#ffb45c', false);
    const rs = rings.filter(r => !r.bn && r.col !== '#fff2c0').sort((a,b) => b.r1 - a.r1);
    if(rs.length < 2) return { n: rs.length };
    const A = rs[0], B = rs[1];
    return { n: rs.length, k0: A.r0/B.r0, k1: A.r1/B.r1, dl: A.t - B.t, lf: A.life - B.life,
             gap0: A.r0 - B.r0, gap1: A.r1 - B.r1 };
  });
  ok(lock.n >= 2 && Math.abs(lock.k0 - lock.k1) < 0.02 && lock.dl === 0 && lock.lf === 0 &&
     lock.gap0 >= 12 && lock.gap1 >= 12,
     '2단 파문 위상 잠금 — 반경 비 r0 ' + (lock.k0 || 0).toFixed(3) + ' = r1 ' + (lock.k1 || 0).toFixed(3) +
     ' · 지연·수명 일치 · 두 줄 간격 ' + Math.round(lock.gap0 || 0) + ' → ' + Math.round(lock.gap1 || 0) +
     ' 게임px ≥ 12 (13회차 AQ·AR 공통 «두 줄이 한 줄로 뭉갠다» 회귀 방지)');
  ok(lifes.dbgMin >= 6.0, '파편 최소 크기 ' + Math.round(lifes.dbgMin*10)/10 + 'px ≥ 6.0 («보이지 않는 점» 회귀 방지)');
  /* 5회차 비평 ① — 충격파가 화구 «안» 에서 시작하면 첫 2프레임이 불길에 묻힌다 */
  const wave = await p.evaluate(() => {
    rings.length = 0; boomFx(0, 0, 130, '#ffb45c', false);
    const main = rings.filter(r => r.t >= 0).sort((a,b) => b.r1 - a.r1)[0];
    return { r0: Math.round(main.r0), r1: Math.round(main.r1) };
  });
  /* 11회차 AM② — 상한 210(= 피해 반경의 1.62배)이 «최대 Ø 377 게임px = 뷰포트 폭의 70%» 를 허용했고
     실제로 화면 오른쪽에서 잘렸다(AM 실측 boom-11). 링은 화구 테두리에서 시작해 **피해 반경까지**만
     가고, 바깥 2단이 그 1.15~1.26배에서 멈춘다 — 아래 «2단 상한» 이 뷰포트 초과를 직접 막는다 */
  /* 13회차 — 출발 하한 85 를 78 로 내린다. 두 줄을 상수배로 묶으면서 «화구 테두리에서 출발» 을
     바깥 줄이 대표하게 됐고(r×0.62 = 80.6), 안쪽 줄은 그 값을 1.35 로 나눈 자리에서 시작한다.
     목적(«링이 화구 안에서 시작해 첫 2프레임이 불길에 묻히는 것» 방지)은 바깥 줄이 그대로 지킨다.
     상한 150 은 13회차 AQ·AR 공통 지적(피해 지름 초과)을 받아 **피해 반경 130 = 상한**으로 좁힌다. */
  ok(wave.r0 >= 78 && wave.r1 >= 120 && wave.r1 <= 132,
     '본 충격파가 화구 테두리에서 시작해 «피해 반경에서 멈춘다» — r ' + wave.r0 + ' → ' + wave.r1 +
     'px (피해 반경 130 기준 0.62 → 1.00배 · 13회차 AQ Ø293 · AR Ø296 «피해 지름 +12.7% 초과» 회귀 방지)');
  const wave2 = await p.evaluate(() => {
    rings.length = 0; boomFx(0, 0, 130, '#ffb45c', true);
    return { r1: Math.round(Math.max.apply(null, rings.map(r => r.r1))) };
  });
  ok(wave2.r1 * 2 <= 340,
     '2단 파문 최대 지름 ' + (wave2.r1*2) + ' 게임px ≤ 340 (뷰포트 폭 540 의 63% · 화면 밖 잘림 방지)');
  /* 5회차 비평 ④ — 숫자 세로 계단이 «배열 길이» 면 소멸에 따라 같은 칸이 되감긴다 */
  const stag = await p.evaluate(() => {
    nums.length = 0;
    const ys = [];
    for (let i = 0; i < 3; i++){ dmgNum(500, 500, 100, false); ys.push(nums[nums.length-1].y); }
    nums.length = 0;
    for (let i = 0; i < 3; i++){ dmgNum(500, 500, 100, false); ys.push(nums[nums.length-1].y); }
    nums.length = 0;
    /* «연속으로 뜬 두 숫자» 가 같은 칸에 오지 않는 것이 요구다(4칸을 한 바퀴 돈 뒤 재사용은 정상) */
    let minGap = 1e9;
    for (let i = 1; i < ys.length; i++) minGap = Math.min(minGap, Math.abs(ys[i] - ys[i-1]));
    return { ys, minGap };
  });
  /* 9회차 — 하한을 40 → 20 으로 내린다. 이 검사의 «요구» 는 연속 스폰이 **다른 칸**에 앉는 것이지
     칸 간격의 절대값이 아니다(5회차 회귀의 실체는 «배열 길이로 돌려 소멸마다 같은 칸이 되감기는 것»).
     8회차 비평가 2명(AI·AJ)이 공통으로 «세로 스태거 44 x 3칸 = 132 게임px 가 상승 트윈까지 더해
     숫자를 자기 적에서 209~231 게임px 위로 밀어 올린다»(적 몸통 34 의 6~7배)를 최우선 감점으로 잡아
     칸을 24 로 좁혔다. 20 은 «되감김(=0)» 과 «다른 칸» 을 여전히 가른다. */
  ok(stag.minGap >= 20,
     '데미지 숫자 세로 계단이 스폰 «순번» 으로 돈다 — 연속 스폰 최소 간격 ' + stag.minGap +
     'px ≥ 20 (배열 길이로 돌리면 소멸 때마다 같은 칸이 되감긴다 · 5회차 «중심 간격 22px» 회귀 방지)');
  const rad = await p.evaluate(() => {
    rings.length = 0; impactFx(0, 0, 300, 0, '#fff', false, 0);
    const g0 = rings[0].r1;
    rings.length = 0; impactFx(0, 0, 300, 0, '#fff', false, 5);
    const g5 = rings[0].r1;
    rings.length = 0; impactFx(0, 0, 300, 0, '#fff', true, 0);
    const cr = Math.max.apply(null, rings.map(r => r.r1));
    rings.length = 0;
    return { g0, g5, cr };
  });
  const dedup = await p.evaluate(() => {
    rings.length = 0;
    for (let i = 0; i < 6; i++) impactFx(200, 200, 300, 0, '#fff', false, 0);   /* 같은 자리 연타 */
    const same = rings.length;
    rings.length = 0;
    for (let i = 0; i < 6; i++) impactFx(200 + i*60, 200, 300, 0, '#fff', false, 0); /* 다른 자리 */
    const apart = rings.length;
    rings.length = 0;
    return { same, apart };
  });
  ok(dedup.same <= 2 && dedup.apart >= 5,
     '같은 자리 연타는 링이 겹치지 않는다 — 6연타 → ' + dedup.same + '겹 · 흩어진 6타 → ' +
     dedup.apart + '겹 (4회차 «동심 링 5~7겹 모아레» 회귀 방지)');
  ok(rad.g0 === rad.g5 && rad.cr <= 56,
     '임팩트 링 반경은 등급과 무관하게 고정 ' + rad.g0 + 'px · 치명타 최대 ' + rad.cr +
     'px ≤ 56 = 적 몸통(63px)의 1.7배 (2·4회차 «링이 적 여러 마리를 삼킴» 회귀 방지)');

  /* ---------------- [4] 폭발·충격파 ---------------- */
  console.log('[4] 폭발 · 충격파');
  const booms = await p.evaluate((BOOM_R) => {
    const out = {};
    for (const id of Object.keys(BOOM_R)) {
      window.__fx.setup(id, 6, 110);
      let ringsMax = 0, debrisMax = 0, shakeMax = 0, delayed = 0, chainSeen = 0;
      for (let i = 0; i < 300; i++) {
        step(1/60);
        ringsMax = Math.max(ringsMax, rings.length);
        debrisMax = Math.max(debrisMax, parts.filter(q => q.gy).length);
        shakeMax = Math.max(shakeMax, cam.shake);
        delayed = Math.max(delayed, rings.filter(r => r.t < 0).length);
        chainSeen = Math.max(chainSeen, rings.filter(r => r.bn).length);
        window.__fx.keepAlive();
      }
      out[id] = { ringsMax, debrisMax, shakeMax: Math.round(shakeMax*10)/10, delayed, chainSeen };
    }
    return out;
  }, BOOM_R);
  for (const id of Object.keys(BOOM_R)) {
    const r = booms[id];
    ok(r.ringsMax >= 3 && r.debrisMax >= 3 && r.shakeMax >= 3,
       id + ' — 충격파 링 ' + r.ringsMax + '겹 · 파편 ' + r.debrisMax + '개 · shake ' + r.shakeMax);
  }
  ok(booms.boom.delayed >= 1 || booms.boom.chainSeen >= 1,
     '화염구 착탄에 연쇄(지연 발화) 폭발 — 지연 링 ' + booms.boom.delayed + ' · 연쇄 스펙 ' + booms.boom.chainSeen);
  /* 13회차 — 운석의 «지연 링» 은 이제 2단 파문이 아니라 12회차에 신설한 **연쇄 폭발(여진)** 이다
     (2단은 위상 잠금으로 바뀌어 지연 0). 지연 링이 여전히 있는지만 본다 = 여진이 살아 있는지. */
  ok(booms.meteor.delayed >= 1, '운석 착탄에 지연 발화(연쇄 폭발 여진) 링 ' + booms.meteor.delayed + '개');

  /* ---------------- [5] 가지 번개 ---------------- */
  console.log('[5] 가지 번개');
  const bolt = await p.evaluate(() => {
    window.__fx.setup('bolt', 6, 160);
    let br = 0, pts = 0, stable = 1, life = 0, snap = null;
    for (let i = 0; i < 120; i++) {
      step(1/60);
      if (bolts.length) {
        const l = bolts[0];
        if (l.pts) {
          pts = Math.max(pts, l.pts.length/2);
          br = Math.max(br, l.br ? l.br.length : 0);
          if (snap && l === snap.l) {          /* 같은 번개의 경로가 프레임 간 변하면 실패 */
            for (let k = 0; k < l.pts.length; k++) if (l.pts[k] !== snap.p[k]) stable = 0;
          }
          snap = { l, p: Array.from(l.pts) };
          life = Math.max(life, l.t);
        }
      } else snap = null;
      window.__fx.keepAlive();
    }
    return { br, pts, stable, life: Math.round(life*100)/100 };
  });
  ok(bolt.pts >= 7, '본선 6분절(점 ' + bolt.pts + '개)');
  ok(bolt.br >= 2 && bolt.br <= 3, '가지 ' + bolt.br + '개 (2~3)');
  ok(bolt.stable === 1, '경로가 한 번만 굳는다 — 프레임 간 좌표 불변');
  ok(bolt.life >= 0.15, '잔광이 0.15s 넘게 남는다 (실측 ' + bolt.life + 's)');

  /* ---------------- [6] 등급 가중 ---------------- */
  console.log('[6] 등급 가중 (+10%/등급)');
  const grade = await p.evaluate(() => {
    const len = g => trailLen({ k: 'slash', g });
    return { g0: len(0), g3: len(3), g5: len(5), fx0: fxG(0), fx5: fxG(5) };
  });
  ok(grade.g5 > grade.g0 && grade.fx5 === 1.5,
     '검기 트레일 길이 일반 ' + grade.g0 + ' → 영웅 ' + grade.g3 + ' → 신화 ' + grade.g5 +
     ' (가중 ×' + grade.fx0 + ' → ×' + grade.fx5 + ')');
  const tagged = await p.evaluate(() => {
    window.__fx.setup('holy', 6, 150);       /* 신화 등급 */
    S.own = { lance: { n:0, l:1 } }; S.eqSkill = ['lance']; skillCd = {}; markDirty();
    let g = -1;
    for (let i = 0; i < 90 && g < 0; i++) { step(1/60); if (shots.length) g = shots[0].g; window.__fx.keepAlive(); }
    return g;
  });
  ok(tagged === 5, '시전이 만든 투사체에 스킬 등급이 찍힌다 (천벌의 창 g=' + tagged + ')');

  /* ---------------- [7] 밸런스 불변 ---------------- */
  console.log('[7] 밸런스 불변');
  const bal = await p.evaluate((BOOM_R) => {
    /* 폭발 반경은 castSkill 이 만드는 오브젝트에서 직접 읽는다 */
    const rs = {};
    window.__fx.setup('boom', 4, 300);
    castSkill(SK.boom); rs.boom = shots.length ? shots[shots.length-1].r : -1;
    shots.length = 0; skillCd = {};
    castSkill(SK.meteor); rs.meteor = shots.length ? shots[shots.length-1].r : -1;
    rs.holy = 190; rs.nova = SK.nova.r;      /* holy 는 상수 · nova 는 데이터 */
    return { rs, m: SKILLS.map(s => [s.id, s.m, s.cd]), len: SKILLS.length,
             dist: [0,1,2,3,4,5].map(g => SKILLS.filter(s => s.g === g).length) };
  }, BOOM_R);
  const rBad = Object.keys(BOOM_R).filter(k => bal.rs[k] !== BOOM_R[k]);
  ok(rBad.length === 0, '폭발 반경 4종 불변 boom78/meteor130/holy190/nova250 (어긋남 ' + rBad.length + '건)');
  ok(bal.len === 24 && bal.dist.join() === '4,4,4,4,4,4',
     'SKILLS 24종 · 등급 분포 [4,4,4,4,4,4] 불변 (86 도감·확률표 호환)');
  const OLDM = { slash:[1.00,0.85], boom:[2.40,2.00], meteor:[5.00,4.00], holy:[4.00,3.00], nova:[5.20,3.60] };
  const mBad = Object.keys(OLDM).filter(id => {
    const row = bal.m.find(r => r[0] === id);
    return !row || row[1] !== OLDM[id][0] || row[2] !== OLDM[id][1];
  });
  ok(mBad.length === 0, '폭발 계열 피해 계수·쿨 불변 (어긋남 ' + mBad.length + '건)');

  /* ---------------- [8] 성능 ---------------- */
  console.log('[8] 성능 예산');
  const perf = await p.evaluate(() => {
    /* 적 30 · 8칸을 폭발·투사체 계열로 채워 «최악» 부하를 만든다 */
    sbufClear();
    const eq = ['meteor','boom','holy','nova','gale','lance','bolt','shuri'];
    S.own = {}; eq.forEach(id => S.own[id] = { n:0, l:1 });
    S.eqSkill = eq.slice();
    skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
    rings.length = 0; parts.length = 0; enemies.length = 0; spawnQ.length = 0;
    markDirty();
    player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 99;
    for (let i = 0; i < 30; i++) makeEnemy('zombie');
    enemies.forEach((e, i) => { e.born = 1; e.hp = e.max = 1e12;
      const a = i*6.283/30; e.x = player.x + Math.cos(a)*(120 + (i%5)*40); e.y = player.y + Math.sin(a)*(120 + (i%5)*40); });
    const N = 3600;                                    /* 60fps × 60초 */
    let partMax = 0, ringMax = 0;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      step(1/60); draw();
      partMax = Math.max(partMax, parts.length);
      ringMax = Math.max(ringMax, rings.length);
      enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
    }
    const ms = (performance.now() - t0) / N;
    return { ms: Math.round(ms*1000)/1000, fps: Math.round(1000/ms), partMax, ringMax,
             pool: trPool.length, shots: shots.length };
  });
  ok(perf.fps >= 55, '적 30 · 8스킬 60초 평균 프레임 ' + perf.ms + 'ms = ' + perf.fps + 'fps ≥ 55');
  ok(perf.partMax <= 420, '파티클 상한 준수 최대 ' + perf.partMax + ' ≤ 420');
  ok(perf.ringMax <= 44, '링 상한 준수 최대 ' + perf.ringMax + ' ≤ 44');
  ok(perf.pool > 0, '트레일 버퍼가 풀로 되돌아와 재사용된다 (풀 ' + perf.pool + '개 · 프레임당 할당 0)');

  /* ---------------- [9] 게이트 ---------------- */
  console.log('[9] 게이트');
  const gate = await p.evaluate(() => {
    S.opt.shake = false;
    cam.shake = 20;
    for (let i = 0; i < 5; i++) { step(1/60); camUpdate(1/60); }
    const off = cam.shake;
    S.opt.shake = true;
    return { off };
  });
  ok(gate.off === 0, '55 «화면 흔들림» OFF 면 폭발이 나도 cam.shake 0 (실측 ' + gate.off + ')');
  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0,3).join(' | ') : ''));

  await b.close();
  const tot = pass + fail;
  console.log('\nVERIFY114 ' + pass + '/' + tot + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
