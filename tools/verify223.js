/* verify223.js — 작업 223 회귀 게이트.  실행: node tools/verify223.js
 *
 * 저장소 주인 지시(2026-08-27):
 *   ① «보스한테 졌을 때만 패배 화면 뜨게 하고, 그냥 잡몹한테 질 때는 안 뜨게»
 *   ② «죽게 되면 그 스테이지에서 보스 도전 버튼 누르기 전까지는 계속 그 스테이지 잡몹만 잡는 식»
 *   ③ «스테이지 도전 버튼 누르면 스테이지 보스 도전»
 *   ④ «클리어 시 또 평소대로 자동 도전 계속»
 *
 * 보는 것(전부 «게임을 굴렸을 때 그렇게 되나»):
 *   §1 잡몹 사망 — 18 패배 화면(#defw.on) 이 뜨지 않고, «보스 도전 대기»(S.bossFarm)로 들어간다
 *   §2 보스 사망 — 그때만 패배 화면이 뜬다(+ 28 파밍 전환은 그대로)
 *   §3 대기 중   — 50킬을 채워도 보스가 자동으로 서지 않는다(파도 보너스 + 재충전만)
 *   §4 버튼      — [스테이지 재도전](#bossRt)이 떠 있고, 누르면 그 자리에서 보스가 선다
 *   §5 클리어 후 — 대기가 풀려 다음 스테이지는 50킬 → **자동** 보스 도전으로 돌아온다
 *   §6 예외      — 던전·레이드·아레나 사망은 이 규칙이 건드리지 않는다(각자 결과 화면이 받는다)
 *   §7 콘솔 에러 0
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 루프를 얼린다 — 얼리지 않으면 박아 둔 killed·bossOn 을 다음 프레임이 되돌린다(161 교훈) */
const freeze = p => p.evaluate(() => { window.requestAnimationFrame = () => 0; });

/* 스테이지 st 시작 상태. 던전·레이드·아레나·승급전은 전부 끈다. 패배 화면도 닫아 둔다. */
const atStage = (p, st) => p.evaluate(st => {
  arena = null; raidOn = null; dunRun = null; promo = null;
  S.stage = st; S.best = st;
  spawnStage();
  player.dead = 0; player.hp = stat.maxHp;
  document.getElementById('defw').classList.remove('on');
}, st);

/* «맞아 죽는다» 를 실제 경로로 만든다 — 적을 플레이어에 붙이고 체력을 1 로 깎은 뒤 step.
   openDefeat()/failBoss() 를 직접 부르지 않는다: 갈림이 사망 «경로» 안에 있는지 봐야 한다. */
const dieToMob = p => p.evaluate(() => {
  player.hp = 1; player.inv = 0; player.dead = 0;
  const e = enemies[0] || (makeEnemy('zombie'), enemies[enemies.length - 1]);
  e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9;
  e.x = player.x; e.y = player.y;
  for (let i = 0; i < 40 && player.dead <= 0; i++) step(0.016);
  return { dead: player.dead > 0, defw: document.getElementById('defw').classList.contains('on'),
           farm: S.bossFarm, bossOn, stage: S.stage };
});

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await freeze(p);

  const N = await p.evaluate(() => ({ mobs: ENEMY_COUNT, sec: BOSS_SEC }));

  /* ── §1 잡몹에게 죽었다 — 패배 화면 없음 · 보스 도전 대기 ─────────────── */
  console.log('§1 잡몹 사망');
  await atStage(p, 7);
  const mob = await dieToMob(p);
  ok(mob.dead, '§1 (준비) 잡몹 접촉으로 실제로 사망했다');
  ok(!mob.defw, '§1 패배 화면(18)이 뜨지 않는다 — 주인 지시 ①', 'defw=' + mob.defw);
  ok(mob.farm, '§1 «보스 도전 대기»(S.bossFarm)로 들어간다 — 주인 지시 ②');
  ok(!mob.bossOn, '§1 보스전으로 넘어가지 않는다');
  eq('§1 스테이지 유지', mob.stage, 7);
  const hudMob = await p.evaluate(() => {
    drawBossHud();
    return { retry: document.getElementById('bossRt').classList.contains('on'),
             fight: document.getElementById('stinfo').classList.contains('bfight'),
             farm: document.getElementById('stinfo').classList.contains('bfarm') };
  });
  ok(hudMob.retry && hudMob.farm && !hudMob.fight, '§1 [스테이지 재도전] 버튼이 뜬다(.bfarm HUD)');

  /* ── §2 보스에게 죽었다 — 그때만 패배 화면 ────────────────────────── */
  console.log('§2 보스 사망');
  await atStage(p, 7);
  const boss = await p.evaluate(() => {
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    step(0.016);                                    /* 50킬 → 자동 보스 도전(대기 아님) */
    return { bossOn, q: spawnQ.filter(x => x.t === 'boss').length };
  });
  ok(boss.bossOn && boss.q === 1, '§2 (준비) 50킬로 보스전이 섰다');
  const bossDeath = await dieToMob(p);              /* 붙어 있는 개체가 보스다 */
  ok(bossDeath.dead, '§2 (준비) 보스전 중 사망');
  ok(bossDeath.defw, '§2 보스전 사망에서는 패배 화면이 뜬다 — 주인 지시 ①');
  ok(bossDeath.farm && !bossDeath.bossOn, '§2 28 파밍 전환은 그대로(스테이지 유지 + 대기)');
  eq('§2 스테이지 유지', bossDeath.stage, 7);
  await p.evaluate(() => document.getElementById('defw').classList.remove('on'));

  /* ── §3 대기 중 50킬 — 자동 도전 없음 ─────────────────────────────── */
  console.log('§3 대기 중 50킬');
  const wait = await p.evaluate(() => {
    player.dead = 0; player.hp = stat.maxHp;
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    const g0 = S.gold;
    step(0.016);
    return { bossOn, farm: S.bossFarm, killed, mobs: spawnQ.length + enemies.length,
             gold: S.gold - g0, stage: S.stage };
  });
  ok(!wait.bossOn, '§3 보스가 자동으로 서지 않는다 — 주인 지시 ②');
  ok(wait.farm, '§3 대기 상태가 유지된다');
  eq('§3 killed 되감김', wait.killed, 0);
  eq('§3 다음 파도 재충전', wait.mobs, N.mobs);
  ok(wait.gold > 0, '§3 파도 전멸 보너스 골드는 그대로 준다(28 거동)');
  eq('§3 스테이지 유지', wait.stage, 7);

  /* ── §4 버튼을 누르면 그때 보스가 선다 ────────────────────────────── */
  console.log('§4 [스테이지 재도전]');
  const btn = await p.evaluate(() => {
    document.getElementById('bossRt').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { bossOn, bossT: Math.round(bossT * 10) / 10, farm: S.bossFarm, killed,
             bossQ: spawnQ.filter(x => x.t === 'boss').length, q: spawnQ.length, stage: S.stage };
  });
  ok(btn.bossOn, '§4 버튼 클릭으로 보스 도전이 시작된다 — 주인 지시 ③');
  eq('§4 제한 시간 재충전', btn.bossT, N.sec);
  ok(!btn.farm, '§4 대기 해제');
  eq('§4 보스 단독 큐', btn.bossQ + '/' + btn.q, '1/1');
  eq('§4 스테이지 유지', btn.stage, 7);

  /* ── §5 클리어하면 자동 도전 복귀 ─────────────────────────────────── */
  console.log('§5 클리어 후 자동 도전 복귀');
  const clear = await p.evaluate(() => {
    /* 보스를 잡은 상태를 만든다 — 클리어 예약 플래그는 killEnemy 가 세우는 그것이다 */
    enemies.length = 0; spawnQ.length = 0; stageWin = true;
    player.dead = 0; player.hp = stat.maxHp;
    step(0.016);
    return { stage: S.stage, farm: S.bossFarm, bossOn, killed, mobs: spawnQ.length + enemies.length };
  });
  eq('§5 보스 격파 = 스테이지 클리어', clear.stage, 8);
  ok(!clear.farm, '§5 대기 해제 — 주인 지시 ④');
  eq('§5 새 스테이지는 몹 구간부터', clear.mobs, N.mobs);
  const auto = await p.evaluate(() => {
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    player.dead = 0; player.hp = stat.maxHp;
    step(0.016);
    return { bossOn, stage: S.stage, bossQ: spawnQ.filter(x => x.t === 'boss').length };
  });
  ok(auto.bossOn && auto.bossQ === 1, '§5 다음 스테이지는 50킬 → **자동** 보스 도전 — 주인 지시 ④');
  eq('§5 스테이지 유지(클리어는 보스를 잡아야)', auto.stage, 8);

  /* ── §6 던전·레이드·아레나 사망은 건드리지 않는다 ──────────────────── */
  console.log('§6 다른 모드의 사망');
  const dun = await p.evaluate(() => {
    arena = null; raidOn = null; promo = null;
    S.stage = 12; S.best = 12; spawnStage();
    S.bossFarm = false;
    dunRun = { d: DUNGEONS[0], f: 1, t: 60, dmg: 0, need: 1e9, stage: S.stage };
    document.getElementById('defw').classList.remove('on');
    const r = (() => {
      player.hp = 1; player.inv = 0; player.dead = 0;
      const e = enemies[0] || (makeEnemy('zombie'), enemies[enemies.length - 1]);
      e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9; e.x = player.x; e.y = player.y;
      for (let i = 0; i < 40 && player.dead <= 0; i++) step(0.016);
      return { dead: player.dead > 0, defw: document.getElementById('defw').classList.contains('on'),
               farm: S.bossFarm };
    })();
    dunRun = null;
    return r;
  });
  ok(dun.dead, '§6 (준비) 던전 런 중 사망');
  ok(!dun.defw, '§6 던전 사망 — 패배 화면 없음(잡몹이다)');
  ok(!dun.farm, '§6 던전 사망 — 스테이지 쪽 대기 상태를 건드리지 않는다');
  const arn = await p.evaluate(() => {
    dunRun = null; raidOn = null;
    S.bossFarm = false;
    arena = { op: { n: '더미', avatar: null, cp: 1 }, t: 30, stage: S.stage, foe: null };
    document.getElementById('defw').classList.remove('on');
    openDefeat();                                   /* 123 — 아레나에서는 표시 자체가 막혀 있다 */
    const r = { defw: document.getElementById('defw').classList.contains('on') };
    arena = null;
    return r;
  });
  ok(!arn.defw, '§6 아레나 — openDefeat() 자체가 막혀 있다(123 불변)');

  /* ── §7 콘솔 ── */
  console.log('§7 콘솔 에러');
  ok(errs.length === 0, '§7 pageerror/console.error 0건', errs.slice(0, 3).join(' | '));

  await b.close();
  console.log('\nVERIFY223 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
