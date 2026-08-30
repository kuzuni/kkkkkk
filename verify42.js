/* 작업 42 — 전투 화면 플로팅 터치 조이스틱 회귀 스크립트
   지시서 [3]-(가) «기계적 작업» 검증: 비평가 없이 헤드리스 pointer 합성으로
   조이스틱 표시·데드존·clamp·이동 벡터·자동 복귀·차단 규칙·회귀를 전수 확인한다.
   실행: node verify42.js   (playwright@1.56.0 필요)
   42 구간(#joy · joy* 함수 · step() 이동 분기)을 다시 손대는 세션은 손대기 전/후로 돌려 회귀 0 을 확인할 것. */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, 'index.html');
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '  OK   ' : '  FAIL ') + n + (d === undefined ? '' : '  → ' + d)); };
const near = (n, got, want, tol) => ok(n + ' = ' + want + ' ±' + tol, Math.abs(got - want) <= tol, got);

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 캔버스 중앙(프레임 px → 클라이언트 px) */
  const geo = async () => page.evaluate(() => {
    const r = document.getElementById('stagearea').getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height, sc: r.width / 1080 };
  });
  const st = async () => page.evaluate(() => ({
    on: joy.on, dx: joy.dx, dy: joy.dy, mag: joy.mag,
    cls: document.getElementById('joy').classList.contains('on'),
    disp: getComputedStyle(document.getElementById('joy')).display,
    px: player.x, py: player.y, vx: player.vx, vy: player.vy, aim: player.aim,
    wx: WORLD.w, wy: WORLD.h, sp: stat.speed, dead: player.dead
  }));

  console.log('\n[1] 초기 상태 / 요소 규격');
  const g = await geo();
  ok('#stagearea 스케일 1.0', Math.abs(g.sc - 1) < 0.01, g.sc.toFixed(3));
  let s = await st();
  ok('시작 시 조이스틱 숨김 (display:none)', s.disp === 'none' && !s.on && !s.cls, s.disp);
  const box = await page.evaluate(() => {
    const j = document.getElementById('joy'), k = document.getElementById('joyKnob');
    j.classList.add('on');
    const cj = getComputedStyle(j), ck = getComputedStyle(k);
    const r = { jw: parseFloat(cj.width), jh: parseFloat(cj.height), kw: parseFloat(ck.width), kh: parseFloat(ck.height),
                pe: cj.pointerEvents, z: cj.zIndex, jr: cj.borderRadius, kr: ck.borderRadius,
                zHud: getComputedStyle(document.getElementById('stinfo')).zIndex,
                ta: getComputedStyle(document.getElementById('view')).touchAction };
    j.classList.remove('on');
    return r;
  });
  near('베이스 지름', box.jw, 220, 0); near('베이스 높이', box.jh, 220, 0);
  near('노브 지름', box.kw, 100, 0); near('노브 높이', box.kh, 100, 0);
  ok('베이스·노브 원형', box.jr.startsWith('50%') && box.kr.startsWith('50%'), box.jr + ' / ' + box.kr);
  ok('#joy pointer-events:none (캔버스가 포인터를 계속 받는다)', box.pe === 'none', box.pe);
  ok('#joy z-index(2) < HUD z-index(3)', +box.z < +box.zHud, box.z + ' < ' + box.zHud);
  ok('#view touch-action:none', box.ta === 'none', box.ta);

  /* 헬퍼 — 프레임 px 좌표를 눌러 조이스틱을 띄운다 */
  const cx = g.left + g.w / 2, cy = g.top + g.h / 2;
  const knobOff = async () => page.evaluate(() => {
    const t = getComputedStyle(document.getElementById('joyKnob')).transform;
    if (t === 'none') return { x: 0, y: 0 };
    const m = t.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    return { x: m[4], y: m[5] };
  });

  console.log('\n[2] 누른 «그 자리»에 뜬다 · 처음엔 데드존(정지)');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(60);
  s = await st();
  ok('pointerdown → 조이스틱 표시', s.on && s.cls && s.disp === 'block', s.disp);
  const pos = await page.evaluate(() => {
    const j = document.getElementById('joy').getBoundingClientRect();
    return { cx: j.left + j.width / 2, cy: j.top + j.height / 2 };
  });
  near('베이스 중심 x = 누른 x', pos.cx, cx, 1.5);
  near('베이스 중심 y = 누른 y', pos.cy, cy, 1.5);
  ok('중심에서는 이동 벡터 0 (데드존)', s.mag === 0 && s.dx === 0 && s.dy === 0, 'mag=' + s.mag);

  console.log('\n[3] 데드존 15% (반경 110 → 16.5px)');
  await page.mouse.move(cx + 14, cy); await page.waitForTimeout(50);
  s = await st(); ok('14px 이동 → 데드존 안, mag 0', s.mag === 0, 'mag=' + s.mag);
  let k = await knobOff(); near('  노브는 그래도 따라온다(x)', k.x, 14, 1);
  await page.mouse.move(cx + 20, cy); await page.waitForTimeout(50);
  s = await st(); ok('20px 이동 → 데드존 밖, mag > 0', s.mag > 0, 'mag=' + s.mag.toFixed(3));
  near('  세기 = (20−16.5)/(110−16.5)', s.mag, (20 - 16.5) / (110 - 16.5), 0.005);

  console.log('\n[4] 노브 clamp (베이스 반경 110)');
  await page.mouse.move(cx + 400, cy); await page.waitForTimeout(50);
  k = await knobOff(); s = await st();
  near('노브 x offset (400 → 110 으로 clamp)', k.x, 110, 0.6);
  near('노브 y offset', k.y, 0, 0.6);
  near('이동 벡터 dx (동쪽 = +1)', s.dx, 1, 0.001);
  near('이동 벡터 dy', s.dy, 0, 0.001);
  near('세기 mag (반경 밖 = 1)', s.mag, 1, 0.001);
  await page.mouse.move(cx + 300, cy + 400); await page.waitForTimeout(50);
  k = await knobOff();
  near('대각 clamp 반경', Math.hypot(k.x, k.y), 110, 0.6);

  /* 이동 측정 준비 —
     ① 적의 «피격 넉백»(±140px/s, index.html 의 기존 로직)이 섞이면 이동량·속도가 오염된다
        → `player.inv` 을 크게 줘서 피격 자체를 막는다(넉백은 피격 경로에만 있다).
     ② `enemies` 를 «비우면» 스테이지 클리어로 처리돼 플레이어가 월드 중앙으로 리셋된다
        → 절대 비우지 말고, 필요하면 멀리 «주차»만 시킨다. (이걸 몰라 한 회차를 날렸다) */
  const clean = (x, y) => page.evaluate(([px, py]) => {
    shots.length = 0;
    player.x = px === null ? WORLD.w / 2 : px;
    player.y = py === null ? WORLD.h / 2 : py;
    player.vx = player.vy = 0; player.inv = 999; player.dead = 0; player.hp = stat.maxHp;
  }, [x === undefined ? null : x, y === undefined ? null : y]);
  const park = (x, y) => page.evaluate(([px, py]) => {
    for (const e of enemies) { e.x = px; e.y = py; }
  }, [x, y]);

  console.log('\n[5] 4방향 실제 이동 (자동 이동이 아니라 손가락 방향으로 간다)');
  const dirs = [['동', 300, 0, 1, 0], ['서', -300, 0, -1, 0], ['남', 0, 300, 0, 1], ['북', 0, -300, 0, -1]];
  for (const [nm, ox, oy, ex, ey] of dirs) {
    /* 매번 화면 중앙에서 다시 잡아 벽에 붙는 것을 피한다 */
    await page.mouse.up(); await page.waitForTimeout(30);
    await page.mouse.move(cx, cy); await page.mouse.down();
    await clean();
    await page.mouse.move(cx + ox, cy + oy); await page.waitForTimeout(500);
    const a = await st();
    const dxp = a.px - a.wx / 2, dyp = a.py - a.wy / 2;
    const main = ex ? dxp * ex : dyp * ey, perp = ex ? dyp : dxp;
    ok(nm + '쪽 드래그 → 그 방향으로 20px 이상 이동', main > 20 && Math.abs(perp) < 5,
      'Δ(' + dxp.toFixed(1) + ',' + dyp.toFixed(1) + ')');
    ok('  속도 = stat.speed 이하', Math.hypot(a.vx, a.vy) <= a.sp * 1.02 + 0.5,
      Math.hypot(a.vx, a.vy).toFixed(1) + ' / ' + a.sp);
  }

  console.log('\n[6] 세기 비례 — 데드존 바로 밖은 느리게 간다');
  await page.mouse.up(); await page.waitForTimeout(30);
  await page.mouse.move(cx, cy); await page.mouse.down(); await clean();
  await page.mouse.move(cx + 25, cy); await page.waitForTimeout(600);
  const slow = await st();
  await page.mouse.up(); await page.waitForTimeout(30);
  await page.mouse.move(cx, cy); await page.mouse.down(); await clean();
  await page.mouse.move(cx + 300, cy); await page.waitForTimeout(600);
  const fast = await st();
  const dSlow = slow.px - slow.wx / 2, dFast = fast.px - fast.wx / 2;
  ok('약한 입력도 «움직이긴» 한다', dSlow > 0, dSlow.toFixed(1));
  ok('약한 입력 < 강한 입력 (이동 거리)', dSlow * 3 < dFast, dSlow.toFixed(1) + ' vs ' + dFast.toFixed(1));

  console.log('\n[7] 자동 카이팅 OFF — 적 쪽으로 «다가갈» 수 있다');
  await page.mouse.up(); await page.waitForTimeout(30);
  /* 적 전원을 남서 구석에 주차하고 «표적» 하나만 플레이어 동쪽 60px 에 세운다.
     자동 이동은 135px 를 유지하려 하므로 그 표적에게서 «멀어져야» 한다. */
  const setup7 = () => page.evaluate(() => {
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = player.vy = 0;
    player.inv = 999; player.dead = 0; player.hp = stat.maxHp;
    for (const e of enemies) { e.x = 40; e.y = WORLD.h - 40; }
    const t = enemies[0];
    t.x = player.x + 60; t.y = player.y; t.hp = 1e9; t.maxHp = 1e9; t.sp = 0;
    return Math.hypot(t.x - player.x, t.y - player.y);
  });
  const d0 = await setup7();
  await page.waitForTimeout(500);
  const autoAway = await page.evaluate(() => Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y));
  ok('자동 이동은 60px 근접 적에게서 멀어진다(카이팅)', autoAway > d0 + 5,
    d0.toFixed(1) + ' → ' + autoAway.toFixed(1));
  await setup7();
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + 300, cy); await page.waitForTimeout(400);
  const manual = await page.evaluate(() => ({
    d: Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y), aim: player.aim
  }));
  ok('수동 이동은 적 쪽으로 파고든다(카이팅 off)', manual.d < d0 - 5,
    d0.toFixed(1) + ' → ' + manual.d.toFixed(1));
  ok('수동 이동 중에도 조준(가장 가까운 적)은 살아 있다', Number.isFinite(manual.aim), manual.aim.toFixed(3));

  console.log('\n[8] 벽 clamp 는 수동 이동에서도 유지된다 (마진 푸시가 꺼져도 하드 clamp 는 남는다)');
  await page.mouse.up(); await page.waitForTimeout(30);
  await page.mouse.move(cx, cy); await page.mouse.down();
  await clean(180, 180); await park(1, 1);
  await page.mouse.move(cx - 400, cy - 400); await page.waitForTimeout(3000);
  const wall = await st();
  ok('서쪽 벽 clamp (x = 24)', wall.px >= 24 - 0.001 && wall.px <= 25, wall.px.toFixed(2));
  ok('북쪽 벽 clamp (y = 30)', wall.py >= 30 - 0.001 && wall.py <= 31, wall.py.toFixed(2));
  const far = await page.evaluate(() => ({ x: WORLD.w - 180, y: WORLD.h - 180 }));
  await clean(far.x, far.y); await park(1, 1);
  await page.mouse.move(cx + 400, cy + 400); await page.waitForTimeout(3000);
  const wall2 = await st();
  ok('동쪽 벽 clamp (x = W−24)', wall2.px <= wall2.wx - 24 + 0.001 && wall2.px >= wall2.wx - 25,
    wall2.px.toFixed(2) + ' / ' + (wall2.wx - 24));
  ok('남쪽 벽 clamp (y = H−16)', wall2.py <= wall2.wy - 16 + 0.001 && wall2.py >= wall2.wy - 17,
    wall2.py.toFixed(2) + ' / ' + (wall2.wy - 16));

  console.log('\n[9] 떼면 사라지고 자동 이동으로 복귀');
  await page.mouse.up(); await page.waitForTimeout(80);
  s = await st();
  ok('pointerup → 조이스틱 숨김', !s.on && !s.cls && s.disp === 'none', s.disp);
  ok('  이동 벡터 초기화', s.dx === 0 && s.dy === 0 && s.mag === 0);
  const back = await setup7();
  await page.waitForTimeout(600);
  const backD = await page.evaluate(() => Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y));
  ok('손을 떼면 자동 카이팅이 즉시 복귀한다', backD > back + 5, back.toFixed(1) + ' → ' + backD.toFixed(1));

  console.log('\n[10] pointercancel 도 같은 복귀 경로');
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 200, cy);
  await page.waitForTimeout(60);
  ok('  잡힌 상태 확인', (await st()).on);
  await page.evaluate(() => document.getElementById('view')
    .dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
  await page.waitForTimeout(60);
  s = await st();
  ok('pointercancel → 조이스틱 해제', !s.on && s.disp === 'none', s.disp);
  await page.mouse.up().catch(() => {});

  console.log('\n[11] 차단 규칙 — HUD·사이드·탭바·팝업 위에서는 뜨지 않는다');
  /* 누르고 «그 자리에서» 떼면 클릭이 되어 탭·카드가 열려 버린다(다음 항목을 통째로 오염시킨다).
     누른 뒤 프레임 구석으로 옮겨서 떼면 click 이 공통 조상에서 발생해 위임 핸들러가 타지 않는다. */
  const tapBlocked = async (nm, x, y) => {
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(60);
    ok(nm + ' 위 터치 무시', !(await st()).on);
    await page.mouse.move(2, 2); await page.mouse.up(); await page.waitForTimeout(80);
  };
  const hud = await page.evaluate(() => {
    const r = document.getElementById('stinfo').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await tapBlocked('HUD(#stinfo, pointer-events:none)', hud.x, hud.y);
  for (const [nm, sel] of [['좌측 사이드 아이콘', '#sideL .ibtn'], ['우측 사이드 아이콘', '#sideR .ibtn'],
                           ['하단 탭바', '#tabbar > *'], ['우상단 메뉴 버튼', '#menub'],
                           ['좌하단 유틸 버튼', '#botleft .ubtn'], ['스킬 슬롯 영역', '#battlefoot']]) {
    const q = await page.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, sel);
    if (!q) { ok(nm + ' 위 터치 무시', false, '요소 없음'); continue; }
    await tapBlocked(nm, q.x, q.y);
  }
  /* 팝업 — 03 던전 페이지를 열고 그 위를 누른다 */
  await page.evaluate(() => openDungeon());
  await page.waitForTimeout(400);
  await tapBlocked('열린 팝업(03 던전 페이지)', cx, cy);
  await page.evaluate(() => closeDungeon());
  await page.waitForTimeout(700);          /* 닫힘 트랜지션이 끝나야 캔버스가 다시 최상단이다 */
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(80);
  const diag = await page.evaluate(([x, y]) => {
    const e = document.elementsFromPoint(x, y)[0] || {};
    return e.tagName + '#' + e.id + '.' + (typeof e.className === 'string' ? e.className : '');
  }, [cx, cy]);
  ok('팝업을 닫으면 다시 뜬다', (await st()).on, diag);
  await page.mouse.up(); await page.waitForTimeout(60);

  console.log('\n[12] 스케일된 화면(9:16, scale ≠ 1)에서도 좌표가 맞는다');
  await page.setViewportSize({ width: 540, height: 960 });
  await page.waitForTimeout(500);
  const g2 = await geo();
  ok('스케일 < 1 확인', g2.sc < 0.9, g2.sc.toFixed(3));
  const c2x = g2.left + g2.w / 2, c2y = g2.top + g2.h / 2;
  await page.mouse.move(c2x, c2y); await page.mouse.down(); await page.waitForTimeout(60);
  const pos2 = await page.evaluate(() => {
    const j = document.getElementById('joy').getBoundingClientRect();
    return { cx: j.left + j.width / 2, cy: j.top + j.height / 2, w: j.width };
  });
  near('베이스 중심 x = 누른 x (스케일 보정)', pos2.cx, c2x, 1.5);
  near('베이스 중심 y = 누른 y (스케일 보정)', pos2.cy, c2y, 1.5);
  near('베이스 화면 지름 = 220 × scale', pos2.w, 220 * g2.sc, 1.5);
  /* 프레임 반경 110 은 화면에서 110×sc — 그만큼 밀면 정확히 clamp 경계 */
  await page.mouse.move(c2x + 110 * g2.sc, c2y); await page.waitForTimeout(60);
  const s2 = await st(), k2 = await knobOff();
  near('스케일 화면에서 clamp 경계 mag', s2.mag, 1, 0.02);
  near('스케일 화면 노브 offset(프레임 px)', k2.x, 110, 1);
  await page.mouse.up();
  await page.setViewportSize({ width: 1080, height: 2280 });
  await page.waitForTimeout(400);

  console.log('\n[13] 회귀 — 조이스틱을 한 번도 안 쓰면 기존 자동 이동 그대로');
  const reg = await page.evaluate(() => ({
    on: joy.on, cls: document.getElementById('joy').classList.contains('on'),
    dead: player.dead, hp: player.hp, mh: stat.maxHp
  }));
  ok('조이스틱 해제 상태', !reg.on && !reg.cls);
  /* 북서 구석(60,60)에 두고 적을 전부 남동으로 주차하면 «벽 마진 푸시»와 «추격»이 같은 방향(+x,+y)이라
     자동 이동 분기가 그대로 살아 있는지 결정적으로 볼 수 있다. */
  await clean(60, 60);
  await page.evaluate(() => { for (const e of enemies) { e.x = WORLD.w - 60; e.y = WORLD.h - 60; } });
  await page.waitForTimeout(1000);
  const marg = await st();
  ok('조이스틱 없이도 자동 이동은 그대로 (구석 → 중앙 쪽)', marg.px > 60 && marg.py > 60,
    marg.px.toFixed(1) + ',' + marg.py.toFixed(1));
  ok('  자동 이동 속도도 stat.speed 이하', Math.hypot(marg.vx, marg.vy) <= marg.sp * 1.02 + 0.5,
    Math.hypot(marg.vx, marg.vy).toFixed(1) + ' / ' + marg.sp);
  ok('플레이어 사망 상태 아님', marg.dead <= 0);

  console.log('\n[14] 콘솔 에러');
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY42 PASS' : 'VERIFY42 FAIL') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
