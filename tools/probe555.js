/* 작업 555 재현 — `verify193` 안에 남은 «옛 주차»(`e.sp = 0` 하나)가 359 돌진을 못 막는지 찍는다.
   실행: node tools/probe555.js

   등재문의 주장은 셋이다 —
     ⓐ 옛 주차는 «돌진 중 속도가 `e.sp` 가 아니라 `stat.speed × DASH.mob.spd` 로 갈아 끼워지는» 자리를 못 막는다
        (index.html 22150 근처 `else if(dashing) spd = stat.speed * DK.spd`).
     ⓑ 하필 스킬 표본이 적을 **ring 150~200** 에 세우는데 `DASH.mob` 사거리가 **120~380** 이라 창 한복판이다.
     ⓒ 지금 안 빨간 것은 «안 걸려서» 가 아니라 **쿨다운이 그 짧은 루프 안에서 잘 안 끝나서**다.
        ⇒ 초기 쿨다운은 `rnd(0.6, cd1=8.0)` 이므로 3.33초짜리 화염병 루프(200프레임)에서는 **실제로 걸린다**.

   [A] 사거리 — ring 150·200 이 DASH.mob 창(120~380) 안인가
   [B] 옛 주차(`e.sp = 0` 만) — 쿨다운을 «끝난 상태» 로 두면 적이 얼마나 옮겨지는가
   [C] 새 주차(130행과 같은 줄) — 같은 조건에서 0px 인가
   [D] 크기 — [B] 가 `DASH.mob` 산식(`stat.speed × spd × dur`)과 맞는가 = 넉백이 아니라 돌진이다
   [E] 잠복률 — 초기 쿨다운을 제품 그대로(`rnd(0.6, 8.0)`) 두고 표본 루프 길이만큼 돌렸을 때
                옛 주차에서 «움직인» 표본의 비율(= 지금 뜨고 지는 확률) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

(async () => {
  const b = await launch(chromium);
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof player !== 'undefined' && typeof step === 'function',
                          null, { timeout: 20000 });
  await p.waitForTimeout(900);

  /* 표본 하나를 굴린다.
       mode 'old' = 옛 주차(`e.sp = 0` 만) · 'new' = 130행과 같은 줄 · 'none' = 주차 없음(대조군)
       cd  = 초기 쿨다운을 손으로 박는다(null 이면 제품의 `rnd(0.6, cd1)` 그대로) */
  const RUN = ({ ring, frames, mode, cd }) => {
    S.own = {}; S.eqSkill = []; skillCd = {};
    shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0; drones.length = 0;
    enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    player.dead = 0; player.inv = 99; player.hp = stat.maxHp;
    makeEnemy('zombie');
    const e = enemies[0];
    e.born = 1; e.hp = e.max = 1e12;
    e.x = player.x + ring; e.y = player.y;
    if (cd !== null && cd !== undefined) { e.dashCd = cd; e.dashT = 0; e.dashD = 0; e.dvx = 0; e.dvy = 0; }
    const x0 = e.x, y0 = e.y;
    let dashed = 0;
    for (let i = 0; i < frames; i++) {
      if (mode === 'old') enemies.forEach(q => { q.sp = 0; });
      if (mode === 'new') enemies.forEach(q => { q.sp = 0; q.dashT = 0; q.dashD = 0; q.dashCd = 1e9; });
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      player.hp = stat.maxHp; player.inv = 99; player.dead = 0;
      step(1 / 60);
      if (e.dashD > 0 || e.dashT > 0) dashed = 1;
    }
    return { move: Math.hypot(e.x - x0, e.y - y0), dashed };
  };

  console.log('[A] 사거리 — 표본 링이 DASH.mob 돌진 창 안인가');
  const dk = await p.evaluate(() => ({ ...DASH.mob, spd0: stat.speed }));
  ok(dk.min < 150 && 150 < dk.max && dk.min < 200 && 200 < dk.max,
     'ring 150·200 이 DASH.mob 창 ' + dk.min + '~' + dk.max + ' 한복판이다 (등재문 ⓑ)');
  ok(dk.cd0 === 5 && dk.cd1 === 8,
     '잡몹 쿨다운 ' + dk.cd0 + '~' + dk.cd1 + 's — 짧은 루프에서 «두 번째» 돌진은 안 온다 (등재문 ⓒ 앞머리)');

  console.log('[B] 옛 주차 — 쿨다운이 끝난 상태면 적이 옮겨진다');
  const oldR = await p.evaluate(RUN, { ring: 200, frames: 60, mode: 'old', cd: 0 });
  ok(oldR.dashed === 1 && oldR.move > 20,
     '`e.sp = 0` 만 걸면 적이 ' + oldR.move.toFixed(2) + 'px 옮겨진다 (돌진 진입 ' + oldR.dashed + ') = 등재문 ⓐ 확인');

  console.log('[C] 새 주차 — 같은 조건에서 0px');
  const newR = await p.evaluate(RUN, { ring: 200, frames: 60, mode: 'new', cd: 0 });
  ok(newR.move === 0 && newR.dashed === 0,
     '130행과 같은 줄이면 ' + newR.move.toFixed(2) + 'px · 돌진 진입 ' + newR.dashed + ' = 창이 닫힌다');

  console.log('[D] 크기 — 넉백이 아니라 «돌진» 이다');
  const expect = dk.spd0 * dk.spd * dk.dur;
  ok(Math.abs(oldR.move - expect) < 4,
     '[B] 의 ' + oldR.move.toFixed(2) + 'px 가 DASH.mob 산식 ' + dk.spd0 + '×' + dk.spd + '×' + dk.dur
     + ' = ' + expect.toFixed(2) + 'px 와 같다 (507 [B3] 선례)');

  console.log('[E] 잠복률 — 제품의 초기 쿨다운 `rnd(0.6, 8.0)` 그대로 두면 얼마나 자주 걸리나');
  /* 화염병 표본(345행)이 200프레임 = 3.33s · 드론 만료 표본(362행)이 180프레임 = 3.0s 다.
     초기 쿨다운이 그 안에 끝나면 옛 주차는 그대로 뚫린다. */
  const N = 40;
  const hit = { f200: 0, f180: 0, f40: 0 };
  for (const [k, fr] of [['f200', 200], ['f180', 180], ['f40', 40]]) {
    for (let i = 0; i < N; i++) {
      const r = await p.evaluate(RUN, { ring: 150, frames: fr, mode: 'old', cd: null });
      if (r.move > 1) hit[k]++;
    }
  }
  console.log('    표본 ' + N + '회 — 200프레임(화염병) ' + hit.f200 + ' · 180프레임(드론 만료) '
              + hit.f180 + ' · 40프레임(레이저·드론) ' + hit.f40);
  ok(hit.f200 > 0 || hit.f180 > 0,
     '긴 루프(3.0~3.33s)에서 옛 주차가 실제로 뚫린다 — 200프레임 ' + hit.f200 + '/' + N
     + ' · 180프레임 ' + hit.f180 + '/' + N + ' (등재문 ⓒ: 지금 초록인 것은 «안 걸려서» 가 아니다)');
  ok(hit.f40 <= hit.f200,
     '짧은 루프(0.67s)일수록 덜 걸린다 — 40프레임 ' + hit.f40 + '/' + N + ' ≤ 200프레임 ' + hit.f200 + '/' + N);

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
  console.log('\nPROBE555 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
