/* 작업 193 게이트 — «신규 공격 스킬 8종 추가 + 버프 5종 폐기» (주인 지시 2026-08-27)
   실행: node tools/verify193.js        표: node tools/verify193.js --table
   지시서 [3]-(가) + «기능 완성 규칙»(T2 는 실제로 동작해야 완료).

   [1] 구조   — 27종 · 등급 분포 [4,4,5,5,5,4] · 버프 5종 부재 · 신설 8종 존재 ·
                기존 19종 (a) id·등급·cd 불변 = 구 세이브 호환 ·
                          (b) `m` 이동은 등재분(260)뿐 = 밸런스 이력이 게이트에 남는다
   [2] 기능   — 신설 8종 각각 «시전 → 무엇이 생기고 적이 얼마나 깎이는가» 헤드리스 실측 +
                **8종 고유 메커니즘**을 수치로 확인(휨 각속도 · 나선 반경 증가 · 벽 반사 ·
                적→적 도약 · 드론 2기 연사 · 빔 축 · 착탄 장판 · 링 발사 반경)
   [3] 준수   — 185(넉백 폐지): 신규 8종 시전 중 적 변위 0 · 184(풀스크린 플래시 폐지):
                신규 8종이 `cam.flash`/전면 오버레이를 만들지 않는다
   [4] 저장   — 버프 5종을 들고 있던 구 세이브가 후임 스킬로 이관(레벨·보유 수 보존, 멱등, 중복 제거)
   [5] 밸런스 — 신규 8종의 «등급 정규화 피해»가 같은 등급 기존 스킬의 실측 범위 안
   [6] 파급   — 04 격자 27장(5×6) · 도감 스킬 세트 6개/구성원 27 · 11 확률 27행 ·
                시전음 매핑 8종 · 콘솔 에러 0 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const GN = ['일반', '고급', '희귀', '영웅', '전설', '신화'];
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

/* 193 이 신설한 8종 — 주인 원문 순서 그대로 */
const NEW = [
  { id: 'drone',  g: 4, n: '드론 소환',    mech: '소환수 2기 + 연사' },
  { id: 'curve',  g: 0, n: '곡선탄',       mech: '곡선 궤적' },
  { id: 'spiral', g: 2, n: '나선탄',       mech: '나선 방출' },
  { id: 'whirl',  g: 1, n: '주변 참격',    mech: '주위 근접 참격' },
  { id: 'rico',   g: 2, n: '반사탄',       mech: '화면 벽 반사' },
  { id: 'laser',  g: 5, n: '레이저',       mech: '지속 빔' },
  { id: 'bounce', g: 3, n: '도약 연쇄탄',  mech: '적→적 근접 연쇄' },
  { id: 'flask',  g: 4, n: '화염병',       mech: '착탄 불 장판' }
];
/* 193 이 폐기한 버프 5종 → 후임(같은 등급) */
const MOVE = { vigor: 'curve', mend: 'whirl', haste: 'rico', ward: 'drone', rage: 'laser' };
/* 193 이 **한 글자도 건드리지 않은** 기존 19종 (id: [g, cd, m]) — 193 시점 기준선.
   ⚠ 이 표가 지키는 것은 «193 의 증설이 기존 스킬을 안 건드렸다» 이지 «m 을 영원히 못 고친다» 가
   아니다 — 세이브는 **id 로만** 보유·장착을 저장하므로 m·cd 는 밸런스 값이다(verify86 OLD 표와 같은 근거).
   따라서 **아래 표는 기준선 그대로 두고**, 뒤에 온 밸런스 작업의 이동분은 `M_MOVED` 에 «누가·왜» 와 함께
   따로 등재한다 — 그래야 «어느 작업이 무엇을 옮겼나» 가 게이트에 남는다(기대값을 제품에서 베끼면 사라진다). */
const KEEP = {
  slash: [0, 0.85, 1.00], shuri: [0, 2.20, 0.55], stone: [0, 1.30, 1.35],
  multi: [1, 1.10, 0.80], orbit: [1, 0.00, 0.45], ice: [1, 1.60, 1.30],
  aura: [2, 0.00, 0.55], bolt: [2, 1.40, 1.60], arrow: [2, 1.50, 1.15],
  boom: [3, 2.00, 2.40], poison: [3, 3.20, 0.80], drain: [3, 2.60, 2.00], frost: [3, 2.10, 1.45],
  boomer: [4, 2.40, 1.80], meteor: [4, 4.00, 5.00], gale: [4, 2.80, 1.05],
  holy: [5, 3.00, 4.00], lance: [5, 2.30, 3.20], nova: [5, 3.60, 5.20]
};
/* 193 이후 기존 19종의 `m` 을 옮긴 작업 — id: [옮긴 값, 근거].
   작업 260(2026-08-27, 저장소 주인 지시 «같은 등급 안에서 세기가 뒤죽박죽») 이 «등급 안 세기 편차 ≤ 3.0»
   을 맞추려고 5건을 조였다(영웅 12.73 · 전설 6.00 · 신화 3.13 → 전부 ≤ 3.0). 그중 bounce 는 193 신설분이라
   KEEP 대상이 아니고, 여기 오는 것은 **기존 19종 중 4건**이다. 갱신하지 않으면 260 의 기준선과 이 표가
   서로를 부순다(둘 다 통과할 수 없다). 같은 5건을 verify86 은 자기 OLD 표에서 이미 갱신했다.
   ※ 260 은 `m` 만 건드렸다 — g·cd·id 는 19종 전부 193 기준선 그대로여야 한다(아래 [1-a] 가 그것을 가른다). */
const M_MOVED = {
  drain: [2.40, '260 — 영웅 등급 최약이라 올림'],
  frost: [1.25, '260 — 영웅 등급 최강이라 내림(hits 4)'],
  gale:  [0.85, '260 — 전설 등급 최강이라 내림(hits 12)'],
  lance: [3.00, '260 — 신화 등급 최강이라 내림(hits 3)']
};
/* 같은 등급 기존 스킬 — [5] 밸런스 대조군 */
const PEER = { 0: ['slash', 'stone'], 1: ['ice', 'multi'], 2: ['arrow', 'bolt'],
               3: ['frost', 'boom', 'poison'], 4: ['gale', 'boomer'], 5: ['holy', 'lance', 'nova'] };

/* 페이지 안에서 한 스킬만 장착해 결정적으로 돌린다.
   적은 죽지 않게 hp 를 되돌리고(피해는 따로 누적) 플레이어는 제자리에 못박는다. */
const RUN = ({ id, frames, chase, ring }) => {
  sbufClear();
  S.own = {}; S.own[id] = { n: 0, l: 1 };
  S.eqSkill = [id]; skillCd = {};
  shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0; drones.length = 0;
  enemies.length = 0; spawnQ.length = 0;
  markDirty();
  player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
  player.dead = 0; player.inv = 99;
  for (let i = 0; i < 6; i++) makeEnemy('zombie');
  /* 결정적 배치 — 플레이어 주위 링(난수 없음). 위치가 결과를 바꾸는 항목은 [2] 에서 따로 세운다 */
  enemies.forEach((e, i) => {
    const a = i * (6.2832 / 6);
    e.born = 1; e.hp = e.max = 1e12;
    e.x = player.x + Math.cos(a) * (ring || (70 + i * 16));
    e.y = player.y + Math.sin(a) * (ring || (70 + i * 16));
  });
  const p0 = enemies.map(e => ({ x: e.x, y: e.y }));
  const hp0 = enemies.reduce((s, e) => s + e.hp, 0);
  let shotsSeen = 0, zonesSeen = 0, dronesSeen = 0, boomsSeen = 0, boltsSeen = 0;
  let maxMove = 0, maxDrones = 0, zoneKinds = {}, flash = 0;
  for (let f = 0; f < frames; f++) {
    if (!chase) enemies.forEach(e => { e.sp = 0; });   /* 185 하네스 — 추격을 끄면 남는 이동은 넉백뿐 */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    player.hp = stat.maxHp; player.inv = 99; player.dead = 0;
    const s0 = shots.length, z0 = zones.length, d0 = drones.length,
          m0 = booms.length, b0 = bolts.length;
    step(1 / 60);
    if (shots.length > s0) shotsSeen += shots.length - s0;
    if (zones.length > z0) zonesSeen += zones.length - z0;
    if (drones.length > d0) dronesSeen += drones.length - d0;
    if (booms.length > m0) boomsSeen += booms.length - m0;
    if (bolts.length > b0) boltsSeen += bolts.length - b0;
    maxDrones = Math.max(maxDrones, drones.length);
    zones.forEach(z => zoneKinds[z.k || 'poison'] = 1);
    if (cam.flash) flash = 1;                          /* 184 — 화면 전체 «팍» 플래시 금지 */
    enemies.forEach((e, i) => {
      if (p0[i]) maxMove = Math.max(maxMove, Math.hypot(e.x - p0[i].x, e.y - p0[i].y));
      if (e.hp < 1e11) e.hp = 1e12;
    });
  }
  return { dmg: hp0 - enemies.reduce((s, e) => s + e.hp, 0),
           shotsSeen, zonesSeen, dronesSeen, boomsSeen, boltsSeen,
           maxMove, maxDrones, zoneKinds: Object.keys(zoneKinds), flash };
};

(async () => {
  const b = await launch(chromium);
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof player !== 'undefined' && typeof step === 'function',
                          null, { timeout: 20000 });
  await p.waitForTimeout(900);

  /* ---------------- [1] 구조 ---------------- */
  console.log('[1] 구조');
  const st = await p.evaluate(() => ({
    len: SKILLS.length,
    dist: [0, 1, 2, 3, 4, 5].map(g => SKILLS.filter(s => s.g === g).length),
    ids: SKILLS.map(s => s.id),
    all: SKILLS.map(s => [s.id, s.g, s.cd, s.m]),
    sup: SKILLS.filter(s => s.sup).length,
    buffT: SKILLS.filter(s => s.t === 'buff').length,
    move: typeof SK193_MOVE === 'object' ? SK193_MOVE : null,
    sfx: SKILLS.filter(s => s.cd > 0).filter(s => !SK_CAST_SFX[s.id]).map(s => s.id)
  }));
  ok(st.len === 27, 'SKILLS 27종 (24 − 버프 5 + 신설 8) (실측 ' + st.len + ')');
  ok(JSON.stringify(st.dist) === '[4,4,5,5,5,4]',
     '등급 분포 [4,4,5,5,5,4] (실측 ' + JSON.stringify(st.dist) + ')');
  ok(new Set(st.ids).size === st.len, 'id 중복 없음');
  const alive = Object.keys(MOVE).filter(id => st.ids.includes(id));
  ok(alive.length === 0, '버프 5종(vigor·mend·haste·ward·rage) 전부 폐기'
     + (alive.length ? ' — 남음: ' + alive.join(',') : ''));
  ok(st.sup === 0 && st.buffT === 0, '`sup:1`·`t:\'buff\'` 를 쓰는 스킬 0종 (실측 '
     + st.sup + '/' + st.buffT + ')');
  NEW.forEach(x => ok(st.ids.includes(x.id),
    '신설 ' + x.n + '(' + x.id + ', ' + GN[x.g] + ') 존재 — ' + x.mech));
  const gBad = NEW.filter(x => { const r = st.all.find(a => a[0] === x.id); return !r || r[1] !== x.g; });
  ok(!gBad.length, '신설 8종 등급 배치가 표와 일치 (어긋남 ' + gBad.length + '건)');
  /* [1-a] 세이브가 실제로 의존하는 축 — id·등급·cd 는 19종 전부 193 기준선 그대로여야 한다.
     밸런스 작업이 지나가도 여기는 안 움직인다(260 은 `m` 만 건드렸다). */
  const axisBad = Object.keys(KEEP).filter(id => {
    const r = st.all.find(a => a[0] === id);
    return !r || r[1] !== KEEP[id][0] || r[2] !== KEEP[id][1];
  });
  ok(axisBad.length === 0 && Object.keys(KEEP).length === 19,
     '기존 19종 id·등급·cd 불변 = 구 세이브 호환 (어긋남 ' + axisBad.length + '건'
     + (axisBad.length ? ': ' + axisBad.join(',') : '') + ')');
  /* [1-b] `m` 은 밸런스 값이라 움직일 수 있다 — 단 «움직인 것이 등재된 것뿐» 이어야 한다.
     기준선에서 벗어난 id 집합이 M_MOVED 의 키 집합과 **정확히 같아야** 통과: 미등재 이동(누가 몰래
     조였다)도, 등재해 놓고 제품이 안 따라온 것(260 이 되돌려졌다)도 여기서 빨개진다. */
  const mOf = id => (st.all.find(a => a[0] === id) || [])[3];
  const drift = Object.keys(KEEP).filter(id => mOf(id) !== KEEP[id][2]);
  const declared = Object.keys(M_MOVED);
  const undeclared = drift.filter(id => !M_MOVED[id]);                       /* 등재 없이 움직임 */
  const wrongVal = declared.filter(id => mOf(id) !== M_MOVED[id][0]);        /* 등재값과 제품이 다름 */
  ok(undeclared.length === 0 && wrongVal.length === 0
     && drift.length === declared.length && declared.length === 4,
     '기존 19종 `m` 이동은 등재분 4건뿐 — 260(등급 안 편차 ≤ 3.0)이 옮긴 '
     + declared.map(id => id + ' ' + KEEP[id][2].toFixed(2) + '→' + M_MOVED[id][0].toFixed(2)).join(' · ')
     + ' · 나머지 ' + (Object.keys(KEEP).length - declared.length) + '종은 193 기준선 그대로'
     + (undeclared.length ? ' — 미등재 이동: ' + undeclared.join(',') : '')
     + (wrongVal.length ? ' — 등재값 불일치: '
        + wrongVal.map(id => id + ' 기대 ' + M_MOVED[id][0] + ' 실측 ' + mOf(id)).join(',') : ''));
  ok(st.move && JSON.stringify(st.move) === JSON.stringify(MOVE),
     'SK193_MOVE 이관표가 게이트와 같다 (' + JSON.stringify(st.move) + ')');
  ok(st.sfx.length === 0, '시전음 매핑 누락 0건(지속형 cd 0 제외)'
     + (st.sfx.length ? ' — ' + st.sfx.join(',') : ''));

  /* ---------------- [2] 기능 — 신설 8종 실동작 ---------------- */
  console.log('[2] 기능 — 신설 8종 헤드리스 실측');
  const table = [];
  for (const sk of NEW) {
    const r = await p.evaluate(RUN, { id: sk.id, frames: 600, chase: false });
    const made = r.shotsSeen + r.zonesSeen + r.dronesSeen + r.boomsSeen + r.boltsSeen;
    const note = '피해 ' + Math.round(r.dmg) + ' · 투사체 ' + r.shotsSeen
               + ' · 장판 ' + r.zonesSeen + ' · 드론 ' + r.dronesSeen + ' · 폭발 ' + r.boomsSeen;
    ok(r.dmg > 0 && made > 0, sk.n + '(' + sk.id + ') — ' + note);
    ok(r.maxMove < 0.5, sk.n + ' — 185 넉백 0: 적 최대 변위 ' + r.maxMove.toFixed(3) + 'px');
    ok(!r.flash, sk.n + ' — 184 준수: 풀스크린 플래시 없음');
    table.push({ ...sk, dmg: Math.round(r.dmg), note, ok: r.dmg > 0 && made > 0 });
  }

  /* 고유 메커니즘 — 8종을 «수치» 로 하나씩 */
  console.log('[2b] 고유 메커니즘 실측');
  const mech = await p.evaluate(() => {
    const setup = (id, ring, foes) => {
      sbufClear();
      S.own = {}; S.own[id] = { n: 0, l: 1 };
      S.eqSkill = [id]; skillCd = {};
      shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0; drones.length = 0;
      enemies.length = 0; spawnQ.length = 0; markDirty();
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      player.dead = 0; player.inv = 99;
      for (let i = 0; i < (foes === undefined ? 6 : foes); i++) makeEnemy('zombie');
      enemies.forEach((e, i) => {
        const a = i * (6.2832 / Math.max(1, enemies.length));
        e.born = 1; e.hp = e.max = 1e12; e.sp = 0;
        e.x = player.x + Math.cos(a) * ring; e.y = player.y + Math.sin(a) * ring;
      });
    };
    const out = {};

    /* ② 곡선탄 — 발사 직후와 0.3s 뒤의 진행각이 유의하게 다르고, 두 발이 서로 반대로 휜다 */
    setup('curve', 220);
    castSkill(SK.curve);
    const c0 = shots.map(b => Math.atan2(b.vy, b.vx));
    for (let i = 0; i < 18; i++) step(1 / 60);
    const c1 = shots.slice(0, c0.length).map(b => Math.atan2(b.vy, b.vx));
    out.curve = { n: c0.length,
                  d: c0.map((a, i) => (c1[i] === undefined ? 0 : ((c1[i] - a + Math.PI * 3) % 6.283) - Math.PI)) };

    /* ③ 나선탄 — 극반경 sr 이 단조 증가하고 각 sa 가 돈다 */
    setup('spiral', 240);
    castSkill(SK.spiral);
    const sp0 = shots.map(b => ({ r: b.sr, a: b.sa }));
    for (let i = 0; i < 24; i++) step(1 / 60);
    const live = shots.filter(b => b.sr !== undefined);
    out.spiral = { n: sp0.length, hasPolar: sp0.every(x => x.r !== undefined),
                   dR: live.length ? live[0].sr - sp0[0].r : 0,
                   dA: live.length ? live[0].sa - sp0[0].a : 0 };

    /* ④ 주변 참격 — 8발이 «플레이어에서 r0 만큼 떨어진 링» 에서 나고 수명이 짧다 */
    setup('whirl', 200);
    castSkill(SK.whirl);
    const wr = shots.map(b => Math.hypot(b.x - player.x, b.y - (player.y - 22)));
    out.whirl = { n: shots.length, rMin: Math.min(...wr), rMax: Math.max(...wr),
                  life: shots[0] && shots[0].life,
                  angs: new Set(shots.map(b => Math.round(Math.atan2(b.vy, b.vx) * 100))).size };

    /* ⑤ 반사탄 — 카메라 rect 벽으로 강제로 밀어 넣고 «부호 반전 + wb 감소» 를 본다 */
    setup('rico', 200);
    castSkill(SK.rico);
    const rb = shots[0];
    const wb0 = rb.wb;
    rb.x = -camOx + 18; rb.vx = -Math.abs(rb.vx) || -400; rb.vy = 0;
    const vx0 = rb.vx;
    step(1 / 60);
    out.rico = { wb0, wb1: rb.wb, vx0, vx1: rb.vx, flipped: rb.vx > 0 && vx0 < 0 };

    /* ⑦ 도약 연쇄탄 — 첫 표적을 맞힌 뒤 «가장 가까운 다른 적» 으로 각이 꺾인다 */
    setup('bounce', 120, 4);
    castSkill(SK.bounce);
    const bb = shots[shots.length - 1];
    const bnc0 = bb.bnc, ang0 = Math.atan2(bb.vy, bb.vx);
    let turned = 0, hitN = 0;
    for (let i = 0; i < 60 && shots.indexOf(bb) >= 0; i++) {
      const h0 = bb.hit.length;
      step(1 / 60);
      if (bb.hit.length > h0) {
        hitN += bb.hit.length - h0;
        if (Math.abs(((Math.atan2(bb.vy, bb.vx) - ang0 + Math.PI * 3) % 6.283) - Math.PI) > 0.2) turned = 1;
      }
      enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
    }
    out.bounce = { bnc0, bnc1: bb.bnc, hitN, turned };

    /* ⑥ 레이저 — zones 에 k:'laser' 가 얹히고, «빔 축 위» 적만 깎인다 */
    setup('laser', 200, 2);
    /* 적 2기를 정반대에 세운다 — 빔이 향한 쪽만 맞아야 한다 */
    enemies[0].x = player.x + 200; enemies[0].y = player.y - 22;
    enemies[1].x = player.x - 200; enemies[1].y = player.y - 22;
    castSkill(SK.laser);
    const lz = zones.find(z => z.k === 'laser');
    const lh0 = enemies.map(e => e.hp);
    for (let i = 0; i < 40; i++) { step(1 / 60); enemies.forEach(e => { e.sp = 0; }); }
    out.laser = { made: !!lz, len: lz && lz.len, w: lz && lz.r,
                  d0: lh0[0] - enemies[0].hp, d1: lh0[1] - enemies[1].hp };

    /* ⑧ 화염병 — 착탄 자리에 k:'fire' 장판이 깔리고 지속 피해가 들어간다 */
    setup('flask', 150, 3);
    castSkill(SK.flask);
    let fz = null;
    const fh0 = enemies.reduce((s, e) => s + e.hp, 0);
    for (let i = 0; i < 200; i++) {
      step(1 / 60);
      enemies.forEach(e => { e.sp = 0; });
      if (!fz) fz = zones.find(z => z.k === 'fire') || null;
    }
    out.flask = { made: !!fz, r: fz && fz.r, life: fz && fz.life,
                  dmg: fh0 - enemies.reduce((s, e) => s + e.hp, 0) };

    /* ① 드론 — 2기가 뜨고, 각자 연사하고, dur 이 지나면 사라진다 */
    setup('drone', 200, 3);
    castSkill(SK.drone);
    const dn0 = drones.length;
    let shotsFromDrone = 0, peak = drones.length;
    for (let i = 0; i < 40; i++) {
      const s0 = shots.length; step(1 / 60);
      shotsFromDrone += Math.max(0, shots.length - s0);
      peak = Math.max(peak, drones.length);
      enemies.forEach(e => { e.sp = 0; if (e.hp < 1e11) e.hp = 1e12; });
    }
    for (let i = 0; i < 180; i++) { step(1 / 60); enemies.forEach(e => { e.sp = 0; }); }
    out.drone = { spawned: dn0, peak, shotsFromDrone, gone: drones.length };
    return out;
  });

  ok(mech.curve.n === 2 && mech.curve.d.every(d => Math.abs(d) > 0.3)
     && mech.curve.d[0] * mech.curve.d[1] < 0,
     '② 곡선탄 — 2발이 0.3s 에 각각 ' + mech.curve.d.map(d => d.toFixed(2)).join(' / ')
     + ' rad, 부호가 반대(좌우로 벌어지며 휜다)');
  ok(mech.spiral.n === 6 && mech.spiral.hasPolar && mech.spiral.dR > 40 && Math.abs(mech.spiral.dA) > 1.2,
     '③ 나선탄 — 6발 극좌표 방출, 0.4s 에 반경 +' + mech.spiral.dR.toFixed(1)
     + 'px · 각 ' + mech.spiral.dA.toFixed(2) + 'rad');
  ok(mech.whirl.n === 8 && mech.whirl.rMin > 18 && mech.whirl.rMax < 42
     && mech.whirl.life <= 0.4 && mech.whirl.angs === 8,
     '④ 주변 참격 — 8방향이 반경 ' + mech.whirl.rMin.toFixed(0) + '~' + mech.whirl.rMax.toFixed(0)
     + 'px 링에서 나고 수명 ' + mech.whirl.life + 's (근접)');
  ok(mech.rico.flipped && mech.rico.wb1 === mech.rico.wb0 - 1,
     '⑤ 반사탄 — 화면 좌벽에서 vx ' + mech.rico.vx0.toFixed(0) + ' → ' + mech.rico.vx1.toFixed(0)
     + ', 남은 반사 ' + mech.rico.wb0 + ' → ' + mech.rico.wb1);
  ok(mech.laser.made && mech.laser.d0 > 0 && mech.laser.d1 === 0,
     '⑥ 레이저 — 빔(len ' + mech.laser.len + ' · 폭 ' + mech.laser.w + ') 축 위 적만 피해 '
     + Math.round(mech.laser.d0) + ' / 반대편 ' + Math.round(mech.laser.d1));
  ok(mech.bounce.hitN >= 2 && mech.bounce.turned && mech.bounce.bnc1 < mech.bounce.bnc0,
     '⑦ 도약 연쇄탄 — ' + mech.bounce.hitN + '회 명중하며 각이 꺾인다(남은 도약 '
     + mech.bounce.bnc0 + ' → ' + mech.bounce.bnc1 + ')');
  ok(mech.flask.made && mech.flask.dmg > 0,
     '⑧ 화염병 — 착탄 자리에 불 장판(r ' + mech.flask.r + ') · 지속 피해 ' + Math.round(mech.flask.dmg));
  ok(mech.drone.spawned === 2 && mech.drone.shotsFromDrone >= 6 && mech.drone.gone === 0,
     '① 드론 — 2기 소환 · 0.67s 안에 ' + mech.drone.shotsFromDrone + '발 연사 · 수명 뒤 소멸');

  /* ---------------- [3] 되돌림 시험 ---------------- */
  console.log('[3] 되돌림 시험 — 메커니즘을 끄면 게이트가 빨개진다');
  const rev = await p.evaluate(() => {
    const r = {};
    /* ⓐ 곡률을 0 으로 만들면 곡선탄이 직선이 된다 */
    const cv = SK.curve.cv; SK.curve.cv = 0;
    S.own = { curve: { n: 0, l: 1 } }; S.eqSkill = ['curve']; skillCd = {};
    shots.length = 0; enemies.length = 0; makeEnemy('zombie');
    enemies[0].born = 1; enemies[0].hp = enemies[0].max = 1e12; enemies[0].sp = 0;
    enemies[0].x = player.x + 200; enemies[0].y = player.y;
    castSkill(SK.curve);
    const a0 = shots.map(b => Math.atan2(b.vy, b.vx));
    for (let i = 0; i < 18; i++) step(1 / 60);
    const a1 = shots.slice(0, a0.length).map(b => Math.atan2(b.vy, b.vx));
    r.curveStraight = a0.every((a, i) => a1[i] === undefined || Math.abs(a1[i] - a) < 1e-6);
    SK.curve.cv = cv;
    /* ⓑ 벽 반사 횟수를 0 으로 만들면 반사탄이 안 튕긴다 */
    const wb = SK.rico.wb; SK.rico.wb = 0;
    S.own = { rico: { n: 0, l: 1 } }; S.eqSkill = ['rico']; skillCd = {};
    shots.length = 0; castSkill(SK.rico);
    const rb = shots[0];
    rb.x = -camOx + 18; rb.vx = -400; rb.vy = 0;
    step(1 / 60);
    r.ricoNoBounce = rb && rb.vx < 0;
    SK.rico.wb = wb;
    return r;
  });
  ok(rev.curveStraight, 'ⓐ `cv`(곡률)를 0 으로 되돌리면 «휜다» 단언이 깨진다 = 게이트가 진짜로 곡률을 본다');
  ok(rev.ricoNoBounce, 'ⓑ `wb`(반사 횟수)를 0 으로 되돌리면 «튕긴다» 단언이 깨진다');

  /* ---------------- [4] 세이브 이관 ---------------- */
  console.log('[4] 세이브 이관 — 버프 5종을 들고 있던 구 세이브');
  const mig = await p.evaluate((MOVE) => {
    Object.assign(S, DEF());
    S.own = { slash: { n: 3, l: 4 }, vigor: { n: 5, l: 7 }, mend: { n: 1, l: 2 },
              haste: { n: 0, l: 3 }, ward: { n: 2, l: 9 }, rage: { n: 4, l: 6 } };
    S.eqSkill = ['slash', 'vigor', 'mend', 'haste', 'ward', 'rage'];
    save(); load();
    const a = { own: JSON.parse(JSON.stringify(S.own)), eq: S.eqSkill.slice(), cp: cp() };
    save(); load();                                   /* 멱등 — 두 번 돌려도 같아야 한다 */
    const b2 = { own: JSON.parse(JSON.stringify(S.own)), eq: S.eqSkill.slice() };
    /* 이미 후임을 가진 세이브 — 레벨이 큰 쪽이 남고 칸이 중복되지 않아야 한다 */
    Object.assign(S, DEF());
    S.own = { rage: { n: 4, l: 6 }, laser: { n: 1, l: 9 } };
    S.eqSkill = ['rage', 'laser'];
    save(); load();
    return { a, b2, merged: JSON.parse(JSON.stringify(S.own)), mergedEq: S.eqSkill.slice() };
  }, MOVE);
  const oldGone = Object.keys(MOVE).every(o => !(o in mig.a.own));
  ok(oldGone, '구 버프 id 5개가 `S.own` 에서 사라진다');
  ok(mig.a.own.curve && mig.a.own.curve.l === 7 && mig.a.own.drone && mig.a.own.drone.l === 9,
     '레벨·보유 수가 후임으로 보존된다 (vigor Lv7 → curve Lv'
     + (mig.a.own.curve && mig.a.own.curve.l) + ' · ward Lv9 → drone Lv'
     + (mig.a.own.drone && mig.a.own.drone.l) + ')');
  ok(mig.a.eq.join() === 'slash,curve,whirl,rico,drone,laser',
     '장착 칸이 순서 그대로 후임으로 바뀐다 (' + mig.a.eq.join(',') + ')');
  ok(mig.a.eq.every(id => id !== 'undefined') && Number.isFinite(mig.a.cp) && mig.a.cp > 0,
     '전투력 유한값 (' + mig.a.cp + ') — NaN 없음');
  ok(JSON.stringify(mig.a) !== '{}' && JSON.stringify(mig.b2.own) === JSON.stringify(mig.a.own)
     && mig.b2.eq.join() === mig.a.eq.join(), '이관은 멱등 — 두 번 로드해도 같다');
  ok(mig.merged.laser && mig.merged.laser.l === 9 && !mig.merged.rage,
     '이미 후임을 가진 세이브는 «레벨이 큰 쪽» 이 남는다 (rage Lv6 + laser Lv9 → laser Lv'
     + (mig.merged.laser && mig.merged.laser.l) + ')');
  ok(mig.mergedEq.join() === 'laser', '이관으로 겹친 장착 칸은 중복이 제거된다 ('
     + mig.mergedEq.join(',') + ')');

  /* ---------------- [5] 밸런스 — 같은 등급 기존 스킬 범위 안 ---------------- */
  console.log('[5] 밸런스 — 등급 정규화 피해가 동급 기존 스킬 범위 안');
  const peers = {};
  for (const g of Object.keys(PEER)) {
    peers[g] = [];
    for (const id of PEER[g]) {
      const r = await p.evaluate(RUN, { id, frames: 600, chase: false });
      peers[g].push({ id, dmg: r.dmg });
    }
  }
  const balRows = [];
  for (const sk of NEW) {
    const r = await p.evaluate(RUN, { id: sk.id, frames: 600, chase: false });
    /* 허용 폭 [0.45×동급 최소, 1.80×동급 최대] — 대조군 자체의 폭(예: 신화 lance 12.6k ~ holy 25.2k)이
       2 배라 «동급» 은 원래 이 정도로 넓다. 이 하네스는 적 6기를 링에 세우므로 범위 스킬이 유리하고
       단일 표적 지속형(레이저)은 불리하다 — 그 편향까지 감안한 폭이다(review §4). */
    const lo = Math.min(...peers[sk.g].map(x => x.dmg)) * 0.45;
    const hi = Math.max(...peers[sk.g].map(x => x.dmg)) * 1.80;
    const good = r.dmg >= lo && r.dmg <= hi;
    ok(good, sk.n + ' 피해 ' + Math.round(r.dmg) + ' ∈ [' + Math.round(lo) + ', ' + Math.round(hi)
       + '] (' + GN[sk.g] + ' 대조군 ' + peers[sk.g].map(x => x.id + ' ' + Math.round(x.dmg)).join(' · ') + ')');
    balRows.push({ ...sk, dmg: Math.round(r.dmg), lo: Math.round(lo), hi: Math.round(hi), good });
  }

  /* ---------------- [6] 파급 ---------------- */
  console.log('[6] 파급 — 04 격자 · 도감 · 확률 팝업');
  const ui = await p.evaluate(() => {
    Object.assign(S, DEF());
    SKILLS.forEach(s => S.own[s.id] = { n: 0, l: 1 });
    S.eqSkill = SKILLS.slice(0, 8).map(s => s.id);
    uiDirty = true; renderUI(); gmHero('sk');
    const gp = document.querySelector('#bSk .sk-gp');
    const cards = [...document.querySelectorAll('#bSk .sk-card')];
    const xs = [...new Set(cards.map(c => parseFloat(c.style.left)))].sort((a, b) => a - b);
    const ys = [...new Set(cards.map(c => parseFloat(c.style.top)))].sort((a, b) => a - b);
    const cs = getComputedStyle(gp);
    const sets = COLL_SETS.filter(x => x.tab === 'skill');
    const ids = new Set(sets.reduce((a, x) => a.concat(x.it), []));
    const seen = new Set();
    PRB_STEPS.forEach((_, i) => {
      openProbInfo('skill', PRB_STEPS[i].unlock);
      prbStep = i; renderProbInfo();
      document.querySelectorAll('#prbList .prb-row .nm>i').forEach(e => seen.add(e.textContent));
    });
    document.getElementById('prbw').classList.remove('on');
    return { cards: cards.length, cols: xs.length, rows: ys.length,
             colPitch: xs.length > 1 ? xs[1] - xs[0] : 0, rowPitch: ys.length > 1 ? ys[1] - ys[0] : 0,
             clientH: gp.clientHeight, scrollH: gp.scrollHeight, ovf: cs.overflowY,
             top: cs.top, h: cs.height,
             sets: sets.length, members: ids.size, all: SKILLS.every(s => ids.has(s.id)),
             pool: BANNERS.skill.list.length, prb: seen.size };
  });
  ok(ui.cards === 27 && ui.cols === 5 && ui.rows === 6,
     '04 스킬 격자 27장 · 5열 × 6행 (실측 ' + ui.cards + '장 ' + ui.cols + '×' + ui.rows + ')');
  ok(ui.colPitch === 190 && ui.rowPitch === 220 && ui.top === '387px' && ui.h === '680px',
     '격자 기하 불변 — 열 190 · 행 220 · top 387 · h 680');
  ok(ui.ovf === 'auto' && ui.scrollH > ui.clientH + 100,
     '한 행 늘어난 만큼 안쪽 스크롤이 받는다 (' + ui.clientH + ' → ' + ui.scrollH + ')');
  ok(ui.sets === 6 && ui.members === 27 && ui.all,
     '도감 스킬 세트 6개 · 구성원 27종 = 전 종 (실측 ' + ui.sets + '/' + ui.members + ')');
  ok(ui.pool === 27, '스킬 소환 풀 27종 (실측 ' + ui.pool + ')');
  ok(ui.prb === 27, '11 확률 팝업이 전 단계에 걸쳐 27종 표기 (실측 ' + ui.prb + ')');

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();

  if (process.argv.includes('--table')) {
    console.log('\n| # | 스킬 | 등급 | 메커니즘 | 시전했을 때 무엇이 바뀌는가(실측) | 동급 허용 범위 |');
    console.log('|---|---|---|---|---|---|');
    balRows.forEach((t, i) => console.log('| ' + (i + 1) + ' | ' + t.n + ' (`' + t.id + '`) | '
      + GN[t.g] + ' | ' + t.mech + ' | ' + (table[i] ? table[i].note : '') + ' | '
      + (t.good ? '✅ ' : '❌ ') + t.dmg + ' ∈ [' + t.lo + ', ' + t.hi + '] |'));
  }

  console.log('\nVERIFY193 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
