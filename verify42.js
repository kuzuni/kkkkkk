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
     자동 이동은 135px 를 유지하려 하므로 그 표적에게서 «멀어져야» 한다.
     ⚑ 546(2026-08-30) — **속도만 0 으로 두는 주차는 359 이후 결정적이 아니다.**
       적 이동식(index.html ~21335)은 `spd = (isBoss ? … : e.sp)` 인데 **돌진 중에는 그 식을 통째로
       건너뛰고** `spd = stat.speed × DASH.mob.spd`(115×2.6 = 299px/s)를 쓴다 = `e.sp = 0` 이 안 먹는다.
       표적은 [1]~[6] 을 지나며 20여 초를 산 개체라 setup7 시점에 예고(0.42s)·돌진(0.26s) 한복판일 수
       있고, 그 회차만 «멀어지기는커녕 가까워졌다» 로 빨개졌다(`node tools/probe546.js` [1]·[2] ·
       수리 전 트리 12회 연속 실행에서 **2회 빨강**, 그때 표적이 정확히 79.7px = 돌진 1회 거리만큼
       서쪽으로 왔다). ⇒ **대시 상태 기계까지 같이 주차한다.** 허용 오차는 한 칸도 안 넓혔다. */
  const setup7 = () => page.evaluate(() => {
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = player.vy = 0;
    player.inv = 999; player.dead = 0; player.hp = stat.maxHp;
    for (const e of enemies) { e.x = 40; e.y = WORLD.h - 40; e.dashT = 0; e.dashD = 0; e.dashCd = 1e9; }
    const t = enemies[0];
    t.x = player.x + 60; t.y = player.y; t.hp = 1e9; t.maxHp = 1e9; t.sp = 0;
    return Math.hypot(t.x - player.x, t.y - player.y);
  });
  const tpos = () => page.evaluate(() => ({ x: enemies[0].x, y: enemies[0].y }));
  const d0 = await setup7();
  const t0 = await tpos();
  await page.waitForTimeout(500);
  const autoAway = await page.evaluate(() => Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y));
  const t1 = await tpos();
  /* [전제 7] — 546. 위 항은 «플레이어가 물러났나» 를 재는 자다. 표적이 스스로 움직이면 재는 것이
     달라지므로, 주차가 실제로 먹었는지를 **먼저** 묻는다. 새 이동 경로가 생겨 주차가 다시 뚫리면
     카이팅 항이 아니라 이 항이 빨개져 원인을 그 자리에서 말한다. */
  ok('[전제] 표적은 측정 구간 내내 제자리다 (주차가 실제로 먹었다)',
    Math.hypot(t1.x - t0.x, t1.y - t0.y) < 0.5, 'Δ' + Math.hypot(t1.x - t0.x, t1.y - t0.y).toFixed(2) + 'px');
  ok('자동 이동은 60px 근접 적에게서 멀어진다(카이팅)', autoAway > d0 + 5,
    d0.toFixed(1) + ' → ' + autoAway.toFixed(1));
  /* [7-b] 음성항(546) — 자가 «항상 멀어진다» 를 세는 헛초록이 아님을 반대쪽으로 못박는다.
     같은 자동 이동이 **135±30 밖**(여기선 400px)에서는 «다가가야» 한다(index.html `want = 135`). */
  const d0far = await page.evaluate(() => {
    const t = enemies[0]; t.x = player.x + 400; t.y = player.y;
    player.vx = player.vy = 0;
    return Math.hypot(t.x - player.x, t.y - player.y);
  });
  await page.waitForTimeout(500);
  const autoNear = await page.evaluate(() => Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y));
  ok('[음성] 400px 먼 적에게는 반대로 «다가간다» (자가 상수가 아니다)', autoNear < d0far - 5,
    d0far.toFixed(1) + ' → ' + autoNear.toFixed(1));
  /* §R 되돌림 시험(546) — 주차를 «푼» 사본(돌진 상태를 되돌려 주입)에서는 위 두 항이 실제로
     빨개져야 한다. 즉 546 의 수리는 «단언을 무르게 푼 것» 이 아니라 «표본을 결정적으로 만든 것» 이다. */
  const dR = await page.evaluate(() => {
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = player.vy = 0;
    player.inv = 999; player.dead = 0; player.hp = stat.maxHp;
    const t = enemies[0];
    t.x = player.x + 60; t.y = player.y; t.sp = 0;                 /* 구 주차 주문 그대로 */
    t.dashT = 0; t.dashD = DASH.mob.dur; t.dvx = -1; t.dvy = 0;    /* 예고가 막 끝난 순간 */
    return Math.hypot(t.x - player.x, t.y - player.y);
  });
  /* ⚑ 580 이관(2026-08-31) — 이 절은 **끝 거리 한 장**으로 쟀는데, 580 이 플레이어 이속을 ×2 로
     올리자 500ms 창 안에서 돌진(dur 0.26초)이 끝나고 **그 뒤 플레이어가 계속 달아나는 구간**까지
     한 장에 섞였다(실측 60.0 → 134.1). 즉 «주차가 풀렸다» 는 상태는 그대로인데 재는 자리가
     창 밖으로 밀린 것이라, 표본을 «구간 최소 거리» 로 바꾼다 — 돌진이 카이팅을 뚫고 실제로
     닿았는지가 이 절이 묻는 것이고, 그건 속도가 몇 배가 되든 같은 질문이다(368 처방 —
     상수·타이밍을 게이트에 박아 두지 말고 제품에게 묻는다). 허용 오차는 한 칸도 안 넓혔다. */
  const minD = await page.evaluate(() => new Promise(res => {
    let m = Infinity;
    const t0 = performance.now();
    const tick = () => {
      const e = enemies[0];
      if (e) m = Math.min(m, Math.hypot(e.x - player.x, e.y - player.y));
      if (performance.now() - t0 < 500) requestAnimationFrame(tick); else res(m);
    };
    tick();
  }));
  const awayR = await page.evaluate(() => ({
    d: Math.hypot(enemies[0].x - player.x, enemies[0].y - player.y),
    moved: Math.abs(enemies[0].x - (WORLD.w / 2 + 60))
  }));
  ok('§R 되돌림 — 구 주차 주문(sp=0)만으로는 돌진이 안 멈춘다 (표적이 70px 넘게 온다)',
    awayR.moved > 70, 'Δ' + awayR.moved.toFixed(1) + 'px');
  ok('§R 되돌림 — 그 상태에서는 카이팅 항이 실제로 빨개진다 (이 절은 헛초록이 아니다)',
    !(minD > dR + 5), dR.toFixed(1) + ' → 구간 최소 ' + minD.toFixed(1) + ' (끝 ' + awayR.d.toFixed(1) + ')');
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
  /* 작업 535(2026-08-30) — 이 절의 표본 «우측 사이드 아이콘 #sideR .ibtn» 이 «요소 없음» 으로 빨갰다.
     재현(`node tools/probe535.js`)이 «제품이 아니라 자가 뒤처진 쪽» 임을 확정했다: **작업 49**(2026-08-25,
     저장소 주인 지시)가 우측 사이드 컬럼(#sideR — 이벤트·특권 잠금 아이콘 + 시설 배너)을 통째로 지웠고,
     index.html 15011 주석이 «우측에 남는 UI 는 우상단 ▦ 메뉴(#menub) 하나뿐» 이라고 못박고 있다.
     ⚑ 빨강을 «항 삭제» 로 지우는 길은 반려다(333 처방 — 자리를 비우지 마라). 표본을 **살아 있는
     «캔버스 위에 얹힌 우측 UI»** 로 옮겼다: 우하단 진행형 미션 배너 **#tuto**(620..1080 × 1779..1929 ⊂
     캔버스 #view 0..1080 × 104..2100 · pointer-events:auto) — 죽은 #sideR 과 **같은 계열의 표본**이다
     (캔버스를 덮는 우측 DOM 크롬이라 pointerdown 이 cvs 에 닿지 않는다는 같은 기전을 묻는다).
     #menub 은 바로 아래 항이 이미 쓰고 있어 겹치지 않게 피했다. 후보 실측표는 `tools/probe535.js` [2]. */
  ok('우측 사이드 레일은 폐지 상태다 (작업 49 — 되살아나면 이 절에 #sideR 표본을 되돌릴 것)',
    await page.evaluate(() => !document.getElementById('sideR')));
  let tutoQ = null;
  for (const [nm, sel] of [['좌측 사이드 아이콘', '#sideL .ibtn'], ['우하단 미션 배너(49 이후 우측 UI)', '#tuto'],
                           ['하단 탭바', '#tabbar > *'], ['우상단 메뉴 버튼', '#menub'],
                           ['좌하단 유틸 버튼', '#botleft .ubtn'], ['스킬 슬롯 영역', '#battlefoot']]) {
    const q = await page.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, sel);
    if (!q) { ok(nm + ' 위 터치 무시', false, '요소 없음'); continue; }
    if (sel === '#tuto') tutoQ = q;
    await tapBlocked(nm, q.x, q.y);
  }
  /* §R 되돌림 시험(535) — 새 표본이 «무엇을 해도 초록» 인 헛초록이 아님을 못박는다.
     #tuto 에서 포인터를 빼앗으면(pointer-events:none) 그 자리 터치는 캔버스로 떨어져 조이스틱이 **떠야**
     한다 — 즉 위 항은 «우측 배너가 터치를 실제로 막고 있다» 는 사실 하나에 매달려 있다. */
  if (tutoQ) {
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'r535';
      s.textContent = '#tuto{pointer-events:none !important}'; document.head.appendChild(s);
    });
    await page.mouse.move(tutoQ.x, tutoQ.y); await page.mouse.down(); await page.waitForTimeout(60);
    ok('§R 되돌림 — #tuto 가 포인터를 안 받으면 그 자리에서 조이스틱이 뜬다 (위 항 = 헛초록 아님)',
      (await st()).on);
    await page.mouse.move(2, 2); await page.mouse.up(); await page.waitForTimeout(80);
    await page.evaluate(() => { const s = document.getElementById('r535'); if (s) s.remove(); });
    ok('§R 원복 — #tuto 가 다시 포인터를 받는다', await page.evaluate(
      () => getComputedStyle(document.getElementById('tuto')).pointerEvents === 'auto'));
  } else ok('§R 되돌림 시험 — 표본 좌표를 못 잡았다', false, '#tuto 없음');
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
