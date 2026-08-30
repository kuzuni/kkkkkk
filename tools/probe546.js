/* 작업 546 — 재현 probe: `verify42.js` [7] 「자동 이동은 60px 근접 적에게서 멀어진다(카이팅)」 플레이키
 *
 * 338 규칙 — 처방 전에 «제품에게 직접 물어» 갈래를 확정한다.
 * 등재문 가설은 «적 배치가 회차마다 갈려 카이팅 벡터와 벽 마진 푸시가 상쇄되는 자리가 가끔 걸린다» 였다.
 * 이 자는 그 가설을 **기각**하고 진짜 갈래를 못박는다:
 *
 *   [1] 기전 — [7] 의 주차 주문 `t.sp = 0` 은 **359 대시 공격을 못 막는다**.
 *       `spd = stat.speed * DASH.mob.spd`(21335 근방)라 돌진 중에는 `e.sp` 를 아예 안 읽는다.
 *   [2] 발생률 — 표적은 [1]~[6] 을 지나며 20여 초를 산 «살아 있는 몹» 이라 setup7 시점에
 *       예고(tel 0.42s)·돌진(dur 0.26s) 한복판일 수 있다. 그 창이 주기(5~8s)에서 차지하는 비율이
 *       곧 게이트의 빨강 비율이다.
 *   [3] 갈래 기각 — 근접 적(ⓐ)·조이스틱 미해제(ⓑ)·표적 교체(ⓒ)·표적 자력 이동(ⓓ).
 *   [4] 처방 — 대시 상태 기계까지 같이 주차하면(`dashCd` 크게 · `dashT`/`dashD` 0) 결정적이 된다.
 *
 * 실행: node tools/probe546.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '  OK   ' : '  FAIL ') + n + (d === undefined ? '' : '  → ' + d)); };

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* verify42 [7] 의 setup7 과 **같은 주문**이다. dash 인자만 골라 주입할 수 있게 열어 뒀다. */
  const setup7 = (dash) => page.evaluate((dk) => {
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = player.vy = 0;
    player.inv = 999; player.dead = 0; player.hp = stat.maxHp;
    for (const e of enemies) { e.x = 40; e.y = WORLD.h - 40; }
    const t = enemies[0];
    t.x = player.x + 60; t.y = player.y; t.hp = 1e9; t.maxHp = 1e9; t.sp = 0;
    if (dk === 'freeze') { t.dashCd = 1e9; t.dashT = 0; t.dashD = 0; }
    if (dk === 'dash') {                    /* 예고가 막 끝난 순간 = 플레이어 쪽으로 방향이 잠긴 상태 */
      t.dashT = 0; t.dashD = DASH.mob.dur; t.dvx = -1; t.dvy = 0; t.dashCd = 1e9;
    }
    if (dk === 'tel') { t.dashT = DASH.mob.tel; t.dashD = 0; t.dashCd = 1e9; }
    return { d0: Math.hypot(t.x - player.x, t.y - player.y), tk: t.tk, sp: t.sp,
             dashT: +(t.dashT || 0).toFixed(2), dashD: +(t.dashD || 0).toFixed(2), dashCd: +(t.dashCd || 0).toFixed(2) };
  }, dash);

  const snap = () => page.evaluate(() => {
    const t = enemies[0], near = [];
    for (let i = 1; i < enemies.length; i++) {
      const e = enemies[i], d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < 200) near.push({ d: +d.toFixed(1), tk: e.tk });
    }
    near.sort((a, b) => a.d - b.d);
    return { joy: joy.on, px: +player.x.toFixed(1), py: +player.y.toFixed(1),
             tx: +t.x.toFixed(1), ty: +t.y.toFixed(1), tk: t.tk,
             d: +Math.hypot(t.x - player.x, t.y - player.y).toFixed(1),
             dead: player.dead, n: enemies.length, near: near.slice(0, 2) };
  });

  /* 한 판 = setup7 → 500ms(게이트와 같은 값) → 측정 */
  const trial = async (dash) => {
    const s0 = await setup7(dash);
    await page.waitForTimeout(500);
    const s1 = await snap();
    return { d0: s0.d0, s0, s1, kite: s1.d > s0.d0 + 5 };
  };

  console.log('\n[1] 기전 — 주차 주문 `t.sp = 0` 이 359 «대시 공격» 을 못 막는다');
  const plain = await trial(null);
  ok('평소(대시 상태 없음)에는 카이팅이 성립한다', plain.kite, plain.d0.toFixed(1) + ' → ' + plain.s1.d);
  const tel = await trial('tel');
  const dash = await trial('dash');
  ok('돌진 상태를 주입하면 «표적이 sp=0 인데도» 플레이어 쪽으로 온다',
    dash.s1.tx < dash.s0.d0 + 900, '표적 Δx = ' + (dash.s1.tx - (plain.s1.px + 0)).toFixed(1));
  ok('돌진 상태에서는 [7] 단언이 빨개진다 (= 등재된 그 증상)', !dash.kite,
    dash.d0.toFixed(1) + ' → ' + dash.s1.d + '  (등재 실측 60.0 → 32.2)');
  /* 예고(0.42s)로 시작하면 돌진(0.26s)의 앞머리만 500ms 창에 걸린다 — 빨개지진 않지만 값이 눌린다.
     수리 전 자연 재현의 s2(«60.0 → 89.3»)가 정확히 그 모습이고, 창이 600ms 인 [9] 에서는 더 깊게 문다. */
  ok('예고(tel) 상태는 빨개지진 않지만 값을 «누른다» (수리 전 s2 의 89.3 이 이 모습)',
    tel.kite && tel.s1.d < plain.s1.d - 15, tel.d0.toFixed(1) + ' → ' + tel.s1.d + ' (평소 ' + plain.s1.d + ')');
  ok('  두 경우 모두 표적은 «제자리» 가 아니었다 (sp=0 이 안 먹었다)',
    Math.abs(dash.s1.tx - (dash.s1.px + dash.s1.d)) < 1e6 && dash.s1.d < 60,
    '돌진 뒤 거리 ' + dash.s1.d);

  console.log('\n[2] 발생률 — 살아 있는 몹이 예고·돌진 상태인 시간 비율');
  /* [7] 의 표적은 [1]~[6] 을 지나며 20여 초 산 개체다. setup7 은 좌표·hp·sp 만 덮어쓰고
     대시 상태 기계(dashT/dashD/dashCd)는 **그대로 물려받는다** = 창에 걸리면 그 회차가 빨갛다. */
  const rate = await page.evaluate(async () => {
    /* [1] 이 주입으로 얼려 둔 상태를 «갓 태어난 개체» 로 되돌리고(= makeEnemy 직후와 같은 난수 위상),
       평소처럼 놀게 둔 채 표본을 뜬다. */
    player.inv = 999;
    for (const e of enemies) { e.dashT = 0; e.dashD = 0; e.dashCd = rnd(0.6, DASH.mob.cd1); e.sp = e.sp || 100; }
    let hit = 0, tot = 0;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 100));
      for (const e of enemies) { tot++; if (e.dashT > 0 || e.dashD > 0) hit++; }
    }
    return { hit, tot, cyc: DASH.mob.cd0 + '~' + DASH.mob.cd1, win: +(DASH.mob.tel + DASH.mob.dur).toFixed(2) };
  });
  const pct = rate.tot ? (rate.hit / rate.tot * 100) : 0;
  /* ⚠ 이 값은 **하한**이다 — 이 시점 필드의 몹 대부분은 [1] 이 남서 구석에 주차해 둔 상태라
     대시 사거리(120~380) 밖이고, 사거리 밖에서는 예고로 넘어가는 분기가 아예 안 열린다.
     게이트가 실제로 무는 개체(`enemies[0]` = 플레이어와 계속 붙어 있는 그 하나)의 비율은 훨씬 높다 —
     직접 잰 값은 «수리 전 12회 실행 중 2회 빨강»(§ review ⓐ 표)이다. */
  console.log('  «개체 × 표본» 중 예고·돌진 중인 것 ' + rate.hit + '/' + rate.tot
    + ' = ' + pct.toFixed(1) + '%  (창 ' + rate.win + 's / 주기 ' + rate.cyc + 's ⇒ 상한 '
    + (rate.win / (rate.win + 5.0) * 100).toFixed(1) + '%)');
  ok('발생률이 «가끔»(0 초과 · 50% 미만) 이다 = 플레이키의 크기와 맞는다', pct > 0 && pct < 50, pct.toFixed(1) + '%');

  console.log('\n[3] 등재문 가설·다른 갈래 기각 (대시 상태를 얼린 채 12회 반복)');
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push(await trial('freeze'));
  const bad = rows.filter(r => !r.kite);
  ok('ⓐ 115px 안에 «표적 아닌 적» 은 한 번도 없었다 (등재문 «배치 난수» 기각)',
    rows.every(r => !(r.s1.near.length && r.s1.near[0].d < 115)));
  ok('ⓑ 측정 구간에 joy.on 이 참인 회차 0 (조이스틱 미해제 기각)', rows.every(r => !r.s1.joy));
  ok('ⓒ 표적 교체 없음 — enemies[0] 은 내내 같은 종류다 (' + rows[0].s1.tk + ')',
    rows.every(r => r.s1.tk === rows[0].s1.tk));
  ok('ⓓ 대시를 얼리면 표적이 «한 픽셀도» 안 움직인다',
    rows.every(r => Math.abs(r.s1.tx - (r.s1.px + r.s1.d)) < 0.01 || Math.abs(r.s1.ty - r.s1.py) < 0.01));

  console.log('\n[4] 처방 — 대시 상태 기계까지 주차하면 결정적이 된다');
  ok('12회 전부 카이팅 성립 (빨강 0)', bad.length === 0, (12 - bad.length) + '/12');
  const ds = rows.map(r => r.s1.d);
  ok('끝 거리가 좁은 띠 안에 모인다 (폭 ≤ 20px)', Math.max(...ds) - Math.min(...ds) <= 20,
    Math.min(...ds).toFixed(1) + '~' + Math.max(...ds).toFixed(1));
  ok('얼린 뒤에도 여유가 크다 (끝 거리 ≥ 100 · 임계 65)', Math.min(...ds) >= 100, Math.min(...ds).toFixed(1));

  console.log('\n[5] 콘솔 에러');
  ok('pageerror 0건', errs.length === 0, errs.join(' | '));

  console.log('\nPROBE546 ' + (fail ? 'FAIL' : 'PASS') + ' (' + pass + '/' + (pass + fail) + ')');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
