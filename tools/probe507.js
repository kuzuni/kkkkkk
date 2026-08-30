/* 작업 507 재현기 — `tools/verify193.js` 9건 실패의 «찍힌 값» 을 제품에게 직접 묻는다.
   실행: node tools/probe507.js
   지시서 [3]-(가) · 338 규칙(«처방 전에 재현부터»).

   등재문의 가설 둘을 각각 재현으로 가른다.
     ⓐ «185 넉백 0» 8종이 **전부 같은 79.733px** — 스킬이 미는 것이 아니라 «적 자신의 이동» 일 것
     ⓑ «등급 대조군 발동당 피해 밴드» 1건 — 484·504 이후 같은 것은 «DPS» 이지 총 피해가 아닐 것

   [A] 재현      — 현행 하네스(`e.sp = 0` 만 끈다) 로 8종 + **스킬 없음 대조군**의 최대 변위
   [B] 원인      — 변위가 일어나는 프레임의 개체 상태(`dashT`/`dashD`)와 그때의 속도
   [C] 처방 검산 — 359 대시 상태까지 끈 하네스에서 최대 변위
   [D] 자의 눈   — 대시를 끈 하네스에 «넉백 한 줄» 을 주입하면 그 자가 본다(되돌림)
   [E] 밴드 축   — 27종 «선언 DPS»(`m × skillHits() / cd`) 와 현행 «총 피해» 축을 등급별로 나란히 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const NEW = ['drone', 'curve', 'spiral', 'whirl', 'rico', 'laser', 'bounce', 'flask'];
const GN = ['일반', '고급', '희귀', '영웅', '전설', '신화'];
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

/* verify193 의 RUN 과 같은 배치. `noDash` 만 새 손잡이다 —
   359 가 잡몹에게도 준 «대시» 상태 기계를 프레임마다 쿨다운으로 되돌려 못 들어가게 한다.
   `kick` 은 [D] 되돌림용 — 지정 프레임에 적 0번을 그만큼 옆으로 민다(= 넉백 한 줄). */
const RUN = ({ id, frames, noDash, kick, trace }) => {
  sbufClear();
  S.own = {}; if (id) S.own[id] = { n: 0, l: 1 };
  S.eqSkill = id ? [id] : []; skillCd = {};
  shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0; drones.length = 0;
  enemies.length = 0; spawnQ.length = 0;
  markDirty();
  player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
  player.dead = 0; player.inv = 99;
  for (let i = 0; i < 6; i++) makeEnemy('zombie');
  enemies.forEach((e, i) => {
    const a = i * (6.2832 / 6);
    e.born = 1; e.hp = e.max = 1e12;
    e.x = player.x + Math.cos(a) * (70 + i * 16);
    e.y = player.y + Math.sin(a) * (70 + i * 16);
  });
  const p0 = enemies.map(e => ({ x: e.x, y: e.y }));
  const hp0 = enemies.reduce((s, e) => s + e.hp, 0);
  let maxMove = 0, dashFrames = 0, telFrames = 0, firstMove = -1, spdSeen = 0;
  const tr = [];
  for (let f = 0; f < frames; f++) {
    enemies.forEach(e => {
      e.sp = 0;
      if (noDash) { e.dashT = 0; e.dashD = 0; e.dashCd = 1e9; }
    });
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    player.hp = stat.maxHp; player.inv = 99; player.dead = 0;
    const before = enemies.map(e => ({ x: e.x, y: e.y, t: e.dashT, d: e.dashD }));
    step(1 / 60);
    if (kick && f === kick.f && enemies[0]) enemies[0].x += kick.px;
    enemies.forEach((e, i) => {
      if (e.dashD > 0) dashFrames++;
      if (e.dashT > 0) telFrames++;
      if (before[i]) {
        const step1 = Math.hypot(e.x - before[i].x, e.y - before[i].y);
        if (step1 > 0.01) spdSeen = Math.max(spdSeen, step1 * 60);
        if (step1 > 0.01 && firstMove < 0) firstMove = f;
        if (trace && step1 > 0.01 && tr.length < 6) {
          tr.push({ f, i, step: +step1.toFixed(3), dashT: +before[i].t.toFixed(3), dashD: +before[i].d.toFixed(3) });
        }
      }
      if (p0[i]) maxMove = Math.max(maxMove, Math.hypot(e.x - p0[i].x, e.y - p0[i].y));
      if (e.hp < 1e11) e.hp = 1e12;
    });
  }
  return { dmg: hp0 - enemies.reduce((s, e) => s + e.hp, 0),
           maxMove, dashFrames, telFrames, firstMove, spdSeen, tr };
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof player !== 'undefined' && typeof step === 'function',
                          null, { timeout: 20000 });
  await p.waitForTimeout(900);

  /* ---------------- [A] 재현 ---------------- */
  console.log('[A] 재현 — 현행 하네스(`e.sp = 0` 만) 의 «적 최대 변위»');
  const moves = [];
  for (const id of NEW) {
    const r = await p.evaluate(RUN, { id, frames: 600 });
    moves.push(r.maxMove);
    console.log('    ' + id.padEnd(7) + ' 변위 ' + r.maxMove.toFixed(3) + 'px · 돌진 프레임 '
                + r.dashFrames + ' · 예고 프레임 ' + r.telFrames);
  }
  const ctrl = await p.evaluate(RUN, { id: null, frames: 600, trace: true });
  console.log('    ' + '(스킬 없음)'.padEnd(7) + ' 변위 ' + ctrl.maxMove.toFixed(3) + 'px · 돌진 프레임 '
              + ctrl.dashFrames + ' · 예고 프레임 ' + ctrl.telFrames);
  const spread = Math.max(...moves) - Math.min(...moves);
  ok(Math.min(...moves) > 0.5, 'A1 8종 전부 «변위 0» 을 못 지킨다 — 최소 ' + Math.min(...moves).toFixed(3) + 'px');
  ok(spread < 0.001, 'A2 8종의 변위가 **같은 값**이다(폭 ' + spread.toFixed(4) + 'px) = 스킬이 만든 값이 아니다');
  ok(Math.abs(ctrl.maxMove - moves[0]) < 0.001,
     'A3 **스킬을 하나도 안 낀 대조군**도 같은 변위 ' + ctrl.maxMove.toFixed(3) + 'px = 넉백이 아니다');

  /* ---------------- [B] 원인 ---------------- */
  console.log('[B] 원인 — 움직인 프레임의 개체 상태');
  ctrl.tr.forEach(t => console.log('    f' + t.f + ' e' + t.i + ' 한 프레임 ' + t.step
                                   + 'px · dashT ' + t.dashT + ' · dashD ' + t.dashD));
  const K = await p.evaluate(() => ({
    mob: DASH.mob, spd: PLAYER_SPEED,
    reach: DASH.mob.spd * PLAYER_SPEED * DASH.mob.dur
  }));
  console.log('    DASH.mob = ' + JSON.stringify(K.mob) + ' · PLAYER_SPEED ' + K.spd);
  console.log('    돌진 이동거리 = spd ' + K.mob.spd + ' × ' + K.spd + ' × dur ' + K.mob.dur
              + ' = ' + K.reach.toFixed(3) + 'px');
  ok(ctrl.dashFrames > 0, 'B1 하네스 안에서 잡몹이 실제로 **돌진**한다(359) — 돌진 프레임 ' + ctrl.dashFrames);
  ok(ctrl.tr.every(t => t.dashD > 0), 'B2 움직인 프레임은 전부 «돌진 중»(dashD > 0) 이다');
  ok(Math.abs(K.reach - ctrl.maxMove) / K.reach < 0.05,
     'B3 찍힌 변위 ' + ctrl.maxMove.toFixed(3) + 'px 가 DASH.mob 산식 ' + K.reach.toFixed(3)
     + 'px 와 5% 안에서 같다 = **적 자신의 이동**');

  /* ---------------- [C] 처방 검산 ---------------- */
  console.log('[C] 처방 — 359 대시까지 끈 하네스');
  const fixed = [];
  for (const id of NEW) {
    const r = await p.evaluate(RUN, { id, frames: 600, noDash: true });
    fixed.push({ id, m: r.maxMove, dmg: r.dmg });
    console.log('    ' + id.padEnd(7) + ' 변위 ' + r.maxMove.toFixed(3) + 'px · 피해 ' + Math.round(r.dmg));
  }
  ok(fixed.every(x => x.m < 0.5), 'C1 8종 전부 변위 < 0.5px — 최대 '
     + Math.max(...fixed.map(x => x.m)).toFixed(3) + 'px');
  ok(fixed.every(x => x.dmg > 0), 'C2 대시를 꺼도 8종이 여전히 피해를 준다(하네스가 스킬을 죽이지 않았다)');

  /* ---------------- [D] 자의 눈 ---------------- */
  console.log('[D] 되돌림 — 대시를 끈 하네스에 «넉백 한 줄» 을 주입');
  const kicked = await p.evaluate(RUN, { id: 'curve', frames: 600, noDash: true, kick: { f: 30, px: 2.5 } });
  ok(kicked.maxMove >= 2.4, 'D1 2.5px 를 밀면 자가 ' + kicked.maxMove.toFixed(3)
     + 'px 로 본다 = 대시를 꺼도 **넉백은 그대로 잡힌다**(눈먼 자가 아니다)');

  /* ---------------- [E] 밴드 축 ---------------- */
  console.log('[E] 밴드 축 — «선언 DPS» vs 현행 «총 피해»');
  const dps = await p.evaluate(() => {
    const D = s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s);
    const by = {};
    SKILLS.forEach(s => { (by[s.g] = by[s.g] || []).push({ id: s.id, d: +D(s).toFixed(4), hits: skillHits(s), m: s.m, cd: s.cd }); });
    return by;
  });
  for (const g of Object.keys(dps).sort()) {
    const v = dps[g].map(x => x.d);
    console.log('    ' + GN[g] + ' — DPS ' + Math.min(...v).toFixed(3) + ' ~ ' + Math.max(...v).toFixed(3)
                + ' (최대÷최소 ' + (Math.max(...v) / Math.min(...v)).toFixed(4) + ') · '
                + dps[g].map(x => x.id + ' ' + x.d).join(' · '));
  }
  const ratios = Object.keys(dps).map(g => {
    const v = dps[g].map(x => x.d); return Math.max(...v) / Math.min(...v);
  });
  ok(Math.max(...ratios) < 1.02,
     'E1 484 이후 **같은 등급의 선언 DPS 는 사실상 하나**다(등급 안 최대÷최소 ≤ '
     + Math.max(...ratios).toFixed(4) + ') = 밴드를 이 축에 세우면 뜻이 산다');
  const totals = {};
  for (const g of Object.keys(dps)) {
    totals[g] = [];
    for (const s of dps[g]) {
      const r = await p.evaluate(RUN, { id: s.id, frames: 600, noDash: true });
      totals[g].push({ id: s.id, dmg: Math.round(r.dmg) });
    }
    const v = totals[g].map(x => x.dmg);
    console.log('    ' + GN[g] + ' — 총 피해 ' + Math.min(...v) + ' ~ ' + Math.max(...v)
                + ' (최대÷최소 ' + (Math.max(...v) / Math.min(...v)).toFixed(2) + ') · '
                + totals[g].map(x => x.id + ' ' + x.dmg).join(' · '));
  }
  const tRatios = Object.keys(totals).map(g => {
    const v = totals[g].map(x => x.dmg); return Math.max(...v) / Math.min(...v);
  });
  ok(Math.max(...tRatios) > 3,
     'E2 같은 등급인데 **총 피해는 최대 ' + Math.max(...tRatios).toFixed(1)
     + '배** 갈린다(링 6기 하네스는 광역기에 유리하다) = 이 축의 밴드는 뜻이 없다');

  console.log('\nPROBE507 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
