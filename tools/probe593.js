/* 작업 593 재현기 — `tools/verify460.js` [E2] 는 왜 빨간가
 *
 *   node tools/probe593.js
 *
 * 등재문(PROGRESS 593)의 주장: «[E2] 는 제품이 틀려서가 아니라 **표본이 «속도 0 인 상태» 를
 * 만들지 못해서** 빨갛다. 잔여 속도가 `stat.speed` 에 비례하는데 460 의 갈림값(`MOVE_EPS` 25)은
 * 고정이라, 580 이 `SPD_SC` 로 속도를 2배로 올리자 잔여가 임계를 넘었다.»
 *
 * 이 자가 «찍힌 값» 으로 확인하는 것 넷:
 *   [1] 옛 표본 재현 — `player.vx/vy` 를 세 프레임 내내 0 으로 박고 마지막 프레임의 anim 을 읽는다.
 *   [2] **비례** — 같은 표본을 `stat.speed` 배수만 갈아 끼워 굴린다. 잔여가 배수에 비례해서
 *       움직이고, 임계 25 를 넘는 배수부터 `run` 으로 뒤집히면 «표본이 속도 상수를 박아 뒀다» 가 참이다.
 *   [3] 제품은 옳은가 — 이동 입력을 끄고(적 0 · 조이스틱 해제 · 월드 중앙) **제품이 스스로 멈춘**
 *       프레임을 읽는다. 여기서 `idle` 이면 결손은 제품이 아니라 표본이다.
 *   [4] 새 표본이 배수에 안 흔들리는가 — [3] 을 배수 ×1·×2·×3·×5 로 굴린다(정지 쪽·이동 쪽 둘 다).
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => {
  if (c) { pass++; console.log('  ✅ ' + m + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  ❌ ' + m + (d ? ' — ' + d : '')); }
};
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const n1 = (v) => (v === null || v === undefined ? '?' : Math.round(v * 10) / 10);

/* verify460 과 같은 세이브·같은 자리에서 재현한다(스테이지 전투) */
const SETUP = `(() => {
  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 };
  S.eqSkill = ['slash'];
  S.stage = 17; S.best = S.stage; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  player.dead = 0; player.hp = stat.maxHp;
  enemies.length = 0; shots.length = 0;
  window.__spdMul = 1;
  const d = Object.getOwnPropertyDescriptor(stat, 'speed');
  if (d && d.get && !window.__spdPatched) {
    const g = d.get;
    Object.defineProperty(stat, 'speed', { get(){ return g.call(this) * window.__spdMul; }, configurable: true });
    window.__spdPatched = true;
  }
  return { base: PLAYER_SPEED, eps: MOVE_EPS };
})()`;

/* 옛 표본 — 속도를 프레임마다 0 으로 «박고» 세 프레임 굴린다(verify460 [E] 원본과 같은 모양) */
const OLD = `((mul) => {
  window.__spdMul = mul;
  enemies.length = 0; shots.length = 0;
  player.dead = 0; player.hp = stat.maxHp;
  for (let i = 0; i < 3; i++) { player.vx = 0; player.vy = 0; step(1 / 60); }
  return { anim: player.anim, sp: Math.hypot(player.vx, player.vy), speed: stat.speed };
})`;

/* 새 표본 — 입력을 끄고 «제품이 스스로 멈춘» 프레임을 읽는다 */
const NEW_STILL = `((mul) => {
  window.__spdMul = mul;
  joy.on = false; joy.dx = 0; joy.dy = 0; joy.mag = 0;
  player.dead = 0; player.hp = stat.maxHp;
  player.x = WORLD.w / 2; player.y = WORLD.h / 2;
  player.vx = 0; player.vy = 0;
  for (let i = 0; i < 6; i++) { enemies.length = 0; shots.length = 0; step(1 / 60); }
  return { anim: player.anim, sp: Math.hypot(player.vx, player.vy),
           drift: Math.hypot(player.x - WORLD.w / 2, player.y - WORLD.h / 2), speed: stat.speed };
})`;

/* 새 표본(이동 쪽) — 조이스틱을 잡아 제품이 «스스로» 달리게 한다(속도 상수를 안 적는다) */
const NEW_MOVE = `((mul) => {
  window.__spdMul = mul;
  player.dead = 0; player.hp = stat.maxHp;
  player.x = WORLD.w / 2; player.y = WORLD.h / 2;
  player.vx = 0; player.vy = 0;
  joy.on = true; joy.dx = 1; joy.dy = 0; joy.mag = 1;
  for (let i = 0; i < 20; i++) { enemies.length = 0; shots.length = 0; step(1 / 60); }
  const r = { anim: player.anim, sp: Math.hypot(player.vx, player.vy), speed: stat.speed };
  joy.on = false; joy.dx = 0; joy.dy = 0; joy.mag = 0;
  return r;
})`;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

  const ev = async (expr, arg) => {
    try { return await page.evaluate(new Function('a', 'return ' + expr + '(a)'), arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  const setup = await ev('(() => ' + SETUP + ')');
  blk('[0] 전제 — 하네스가 섰다');
  ok(setup && !setup.__err, '0-a 세이브·전투 상태를 세웠다',
     setup && !setup.__err ? 'PLAYER_SPEED ' + setup.base + ' · MOVE_EPS ' + setup.eps : String(setup && setup.__err));
  const EPS = (setup && setup.eps) || 25;

  /* ── [1] 옛 표본 재현 ─────────────────────────────────────────────── */
  blk('[1] 옛 표본(속도를 0 으로 «박는다») — 지금 트리');
  const o2 = await ev(OLD, 2);
  ok(!o2.__err && o2.anim === 'run',
     '1-a 등재문대로 옛 표본은 지금 `run` 이다(= [E2] 가 빨간 자리)',
     o2.__err ? o2.__err : '찍힘 ' + o2.anim + ' · 잔여 ' + n1(o2.sp) + ' > 임계 ' + EPS + ' · stat.speed ' + n1(o2.speed));

  /* ── [2] 잔여가 속도에 비례하는가 ─────────────────────────────────── */
  blk('[2] 잔여 속도는 `stat.speed` 에 비례한다 — 표본이 상수를 박아 뒀다');
  const rows = [];
  for (const mul of [0.5, 1, 1.5, 2, 3]) rows.push([mul, await ev(OLD, mul)]);
  for (const [mul, r] of rows) {
    console.log('     배수 ×' + mul + ' → stat.speed ' + n1(r.speed) +
                ' · 잔여 ' + n1(r.sp) + ' · anim ' + r.anim);
  }
  const good = rows.filter(([, r]) => !r.__err);
  const ratio = good.length >= 2
    ? good.map(([mul, r]) => r.sp / (mul || 1)).reduce((a, b) => Math.max(a, b), 0) /
      Math.max(1e-9, good.map(([mul, r]) => r.sp / (mul || 1)).reduce((a, b) => Math.min(a, b), Infinity))
    : null;
  ok(ratio !== null && ratio < 1.05,
     '2-a 잔여 ÷ 배수 가 배수 5종에서 같다(= 정확히 비례)', '최대÷최소 ' + (ratio === null ? '?' : Math.round(ratio * 1000) / 1000));
  /* ⚠ 배수는 `PLAYER_SPEED`(= 115 × SPD_SC 2) **위에** 곱해진다 — 580 이전 트리(115)는 ×0.5,
     지금 트리(230)는 ×1 이다. 두 값이 등재문의 17.2 · 34.5 와 같은 자리인지가 이 항의 뜻이다. */
  const pre = good.find(([mul]) => mul === 0.5), now = good.find(([mul]) => mul === 1);
  ok(pre && now && pre[1].anim === 'idle' && now[1].anim === 'run',
     '2-b 580 이전 속도(115)에는 `idle`, 580 이후(230)에는 `run` — 뒤집힌 것은 배수 하나뿐이다',
     (pre ? '115 → 잔여 ' + n1(pre[1].sp) + ' · ' + pre[1].anim : '?') + ' · ' +
     (now ? '230 → 잔여 ' + n1(now[1].sp) + ' · ' + now[1].anim : '?'));

  /* ── [3] 제품은 옳은가 ────────────────────────────────────────────── */
  blk('[3] 제품 — 입력을 끄면 스스로 멈춘다(결손은 표본이지 제품이 아니다)');
  const s2 = await ev(NEW_STILL, 2);
  ok(!s2.__err && s2.anim === 'idle',
     '3-a 지금 트리(×2)에서도 «스스로 멈춘» 프레임은 `idle`',
     s2.__err ? s2.__err : '찍힘 ' + s2.anim + ' · 잔여 ' + n1(s2.sp) + ' · 중앙에서 ' + n1(s2.drift) + 'px');
  ok(!s2.__err && s2.sp < EPS,
     '3-b 그 프레임의 실제 속도가 임계 아래다(헛초록이 아니다)', '잔여 ' + n1(s2.sp) + ' < ' + EPS);

  /* ── [4] 새 표본이 배수에 안 흔들리는가 ───────────────────────────── */
  blk('[4] 새 표본은 속도 배수와 무관하다(×1 ~ ×5)');
  const stills = [], moves = [];
  for (const mul of [1, 2, 3, 5]) {
    stills.push([mul, await ev(NEW_STILL, mul)]);
    moves.push([mul, await ev(NEW_MOVE, mul)]);
  }
  for (let i = 0; i < stills.length; i++) {
    const [mul, s] = stills[i], m = moves[i][1];
    console.log('     배수 ×' + mul + ' → 정지 anim ' + s.anim + '(잔여 ' + n1(s.sp) + ')' +
                ' · 이동 anim ' + m.anim + '(속도 ' + n1(m.sp) + ')');
  }
  ok(stills.every(([, s]) => !s.__err && s.anim === 'idle'),
     '4-a 정지 쪽은 배수 4종 전부 `idle`', stills.map(([mul, s]) => '×' + mul + ' ' + s.anim).join(' · '));
  ok(moves.every(([, m]) => !m.__err && m.anim === 'run'),
     '4-b 이동 쪽은 배수 4종 전부 `run`', moves.map(([mul, m]) => '×' + mul + ' ' + m.anim).join(' · '));

  ok(errs.length === 0, '콘솔 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '');

  await page.close(); await ctx.close(); await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('PROBE593: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})();
