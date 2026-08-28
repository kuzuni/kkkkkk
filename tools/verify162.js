/* 작업 162 회귀 게이트 — 스테이지 진행 규칙 (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify162.js   → 마지막 줄이 `VERIFY162 n/n PASS` 여야 한다.

   주인 지시: «스테이지마다 몬스터 50마리 죽이면 보스 도전되는 식으로 — 현재는 10스테이지마다 보스 뜸».
   즉 스테이지 한 판 = **몹 ENEMY_COUNT 킬 → 보스 도전 → 보스 격파가 클리어** 다.

   본다 (전부 «소스에 그렇게 적혀 있나» 가 아니라 «게임을 굴렸을 때 그렇게 되나»):
     §1 소스     구 `isBossStage`(= S.stage % 10) 가 한 글자도 안 남았다 · 단계 플래그 선언 존재.
     §2 몹 구간  스테이지 시작은 언제나 몹 구간 — 보스 0마리 · 큐 ENEMY_COUNT 마리 · 진행바 «0 / 50».
     §3 도전     **모든 스테이지**에서 50킬이 보스를 부른다(1·3·7·10·23 — 구 규칙이면 10 만 떴다).
                 보스는 «단독» 이고 제한 시간이 BOSS_SEC 로 서며 진행바가 «/ 1» 로 갈린다.
                 50킬 «전»(49킬)에는 절대 안 뜬다 — 경계 확인.
     §4 클리어   보스를 잡아야 S.stage 가 오른다. 몹 50마리를 잡은 것만으로는 **오르지 않는다**
                 (구 규칙 «웨이브 전멸 = 클리어» 가 죽었다는 증거). 클리어 후 다음 스테이지는 다시 몹 구간.
     §5 실패     시간 초과·사망 → 스테이지 유지 + 파밍(S.bossFarm) + 몹 재충전 + [재도전] 노출.
                 [재도전]은 50킬을 다시 요구하지 않고 보스를 곧장 세운다.
                 ⚠ 273(2026-08-27, 주인 지시)으로 «파밍 중 50킬 = 자동 재도전» 은 **폐기**됐다 —
                   대기 중에는 파도 보너스만 주고 다음 파도를 채우며, 보스는 [재도전] 으로만 선다.
                   그 규칙의 게이트는 `tools/verify273.js` 이고, 여기서는 «자동으로 서지 않는다» 만 확인한다.
     §6 회귀     던전·레이드·아레나 진입이 보스 단계를 비운다 · 레이드 샌드백(tk 'boss') 처치가
                 스테이지를 올리지 않는다(28·46·123 구간 불변).
     §7 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
/* «없어야 한다» 검사는 주석을 빼고 본다 — 폐기한 규칙을 «왜 폐기했는지» 적어 둔 주석까지
   위반으로 잡으면, 기록을 남기지 못하게 만드는 게이트가 된다(주석은 실행되지 않는다). */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 게임 루프를 얼린다 — 얼리지 않으면 박아 둔 killed·bossOn 을 다음 프레임이 곧바로 되돌린다(161 교훈). */
const freeze = (p) => p.evaluate(() => { window.requestAnimationFrame = () => 0; });

/* 전장을 «스테이지 st 시작» 상태로 되돌린다. 던전·레이드·아레나·승급전은 전부 끈다. */
const atStage = (p, st) => p.evaluate((st) => {
  arena = null; raidOn = null; dunRun = null; promo = null;
  S.stage = st; S.best = st;                              /* «최고 기록 갱신» 보상 경로를 그대로 타게 한다 */
  spawnStage();
  player.dead = 0; player.hp = stat.maxHp;
  return { bossOn, killed, total: stageTotal(), boss: spawnQ.filter(q => q.t === 'boss').length,
           mobs: spawnQ.length, farm: S.bossFarm, stage: S.stage };
}, st);

/* killed 를 n 으로 박고 전장을 비운 뒤 step 한 프레임 — «파도를 다 잡았다» 와 같은 상태다. */
const killTo = (p, n) => p.evaluate((n) => {
  enemies.length = 0; spawnQ.length = 0; killed = n;
  player.dead = 0; player.hp = stat.maxHp;
  step(0.016);
  return { bossOn, bossT: Math.round(bossT * 10) / 10, stage: S.stage, killed,
           total: stageTotal(), farm: S.bossFarm,
           bossQ: spawnQ.filter(q => q.t === 'boss').length, q: spawnQ.length };
}, n);

/* 큐에 선 보스가 실제로 나올 때까지 step 을 돌린다(스폰 딜레이 1.4초). */
const spawnBoss = (p) => p.evaluate(() => {
  for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
  const b = enemies.find(e => e.tk === 'boss');
  return { has: !!b, mobs: enemies.filter(e => e.tk !== 'boss').length, bossOn };
});

const hud = (p) => p.evaluate(() => {
  drawHud();
  const si = $('stinfo');
  return { fight: si.classList.contains('bfight'), farm: si.classList.contains('bfarm'),
           retry: $('bossRt').classList.contains('on'), tm: $('bossTm').classList.contains('on'),
           prT: $('prT').textContent };
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof step === 'function' && typeof startBoss === 'function');
  await p.waitForTimeout(900);
  await freeze(p);
  await p.waitForTimeout(120);

  const N = await p.evaluate(() => ({ mobs: ENEMY_COUNT, sec: BOSS_SEC }));

  /* ── §1 소스 ────────────────────────────────────────────────── */
  console.log('§1 소스 — 구 «10 의 배수» 규칙 폐기');
  ok(!/\bisBossStage\s*[({=]/.test(CODE), '§1 isBossStage 호출·정의가 남아 있지 않다');
  ok(!/S\.stage\s*%\s*10/.test(CODE), '§1 «S.stage % 10» 이 남아 있지 않다');
  ok(/let\s+bossOn\s*=\s*false/.test(SRC), '§1 보스 단계 플래그 bossOn 선언');
  ok(/let\s+stageWin\s*=\s*false/.test(SRC), '§1 클리어 예약 플래그 stageWin 선언');
  ok(/function\s+startBoss\s*\(/.test(SRC), '§1 보스 도전 진입점 startBoss()');
  eq('§1 몹 요구치 ENEMY_COUNT', N.mobs, 50);

  /* ── §2 몹 구간 ─────────────────────────────────────────────── */
  console.log('§2 스테이지 시작 = 몹 구간');
  const s1 = await atStage(p, 1);
  ok(!s1.bossOn, '§2 스테이지 시작 시 보스전이 아니다');
  eq('§2 시작 시 보스 큐 0마리', s1.boss, 0);
  eq('§2 시작 시 몹 큐 ENEMY_COUNT', s1.mobs, N.mobs);
  eq('§2 시작 시 killed 0', s1.killed, 0);
  eq('§2 진행바 분모 = ENEMY_COUNT', s1.total, N.mobs);
  ok(!s1.farm, '§2 시작 시 파밍 아님');
  const h2 = await hud(p);
  eq('§2 진행바 표기 «0 / 50»', h2.prT, '0 / ' + N.mobs);
  ok(!h2.fight && !h2.farm && !h2.retry, '§2 시작 시 보스 HUD·재도전 전부 꺼짐');

  /* ── §3 50킬 → 보스 도전 (모든 스테이지) ────────────────────── */
  console.log('§3 50킬이 보스를 부른다 — 모든 스테이지에서');
  await atStage(p, 5);
  const near50 = await killTo(p, N.mobs - 1);
  ok(!near50.bossOn, '§3 49킬에서는 보스가 안 뜬다(경계)');
  eq('§3 49킬에서 스테이지 유지', near50.stage, 5);

  for (const st of [1, 3, 7, 10, 23]) {
    await atStage(p, st);
    const r = await killTo(p, N.mobs);
    ok(r.bossOn, `§3 스테이지 ${st} — 50킬에 보스 도전 시작`);
    eq(`§3 스테이지 ${st} — 제한 시간 BOSS_SEC`, r.bossT, N.sec);
    eq(`§3 스테이지 ${st} — 보스는 단독 큐 1마리`, r.bossQ + '/' + r.q, '1/1');
    eq(`§3 스테이지 ${st} — 스테이지는 아직 안 오른다`, r.stage, st);
    eq(`§3 스테이지 ${st} — 진행바 분모 1`, r.total, 1);
  }
  const solo = await spawnBoss(p);
  ok(solo.has, '§3 보스가 실제로 전장에 나온다');
  eq('§3 보스전에 일반 몹 0마리', solo.mobs, 0);
  const h3 = await hud(p);
  ok(h3.fight && h3.tm, '§3 보스 HUD(.bfight + ⏱) 표시');
  eq('§3 보스전 진행바 표기 «0 / 1»', h3.prT, '0 / 1');

  /* ── §4 보스 격파 = 스테이지 클리어 ─────────────────────────── */
  console.log('§4 보스 격파가 스테이지 클리어');
  await atStage(p, 12);
  const noClear = await p.evaluate(() => {
    /* 몹 50마리를 «잡아» 전장이 비었다 — 구 규칙이라면 여기서 S.stage 가 올랐다 */
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    step(0.016); step(0.016);
    return { stage: S.stage, bossOn };
  });
  eq('§4 몹 50킬만으로는 스테이지가 안 오른다', noClear.stage, 12);
  ok(noClear.bossOn, '§4 대신 보스 도전으로 넘어간다');
  const cleared = await p.evaluate(() => {
    for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
    const b = enemies.find(e => e.tk === 'boss');
    const diaB = S.dia, goldB = S.gold;
    killEnemy(b);
    const win = stageWin;
    step(0.016);
    return { stage: S.stage, win, bossOn, farm: S.bossFarm, killed, total: stageTotal(),
             mobs: spawnQ.length, dia: S.dia - diaB, gold: S.gold - goldB, pending: stageWin };
  });
  eq('§4 보스를 잡으면 스테이지 +1', cleared.stage, 13);
  ok(cleared.win, '§4 격파 프레임에 클리어가 예약된다(stageWin)');
  ok(!cleared.pending, '§4 클리어 처리 후 예약이 풀린다');
  ok(!cleared.bossOn && !cleared.farm, '§4 다음 스테이지는 몹 구간·파밍 아님');
  eq('§4 다음 스테이지 killed 0', cleared.killed, 0);
  eq('§4 다음 스테이지 분모 ENEMY_COUNT', cleared.total, N.mobs);
  eq('§4 다음 스테이지 몹 큐 ENEMY_COUNT', cleared.mobs, N.mobs);
  /* 170(2026-08-27) — 주인 지시로 클리어·보스 킬 다이아가 **폐지**됐다. «다이아 > 0» 은 감시할
     등식을 잃었으므로 지우지 않고 뒤집어 이사시킨다(LESSONS 168-②): 최고 기록을 갱신해도
     다이아는 0, 대신 골드 보너스는 그대로 들어온다 — 되살아나면 여기서 빨개진다. */
  eq('§4 최고 기록 갱신이어도 다이아 0 (170 — 클리어·보스 킬 다이아 폐지)', cleared.dia, 0);
  ok(cleared.gold > 0, '§4 클리어 보상은 골드뿐 (170)');

  /* ── §5 실패 → 파밍 → 재도전 ────────────────────────────────── */
  console.log('§5 보스 실패 → 파밍 + 재도전 (28 루프를 매 스테이지에 재사용)');
  await atStage(p, 9);
  await killTo(p, N.mobs);
  const timeout = await p.evaluate(() => {
    for (let i = 0; i < 400 && bossT > 0; i++) step(0.1);            /* 30초 경과 */
    return { stage: S.stage, bossOn, farm: S.bossFarm, killed,
             mobs: spawnQ.length + enemies.length, total: stageTotal() };
  });
  eq('§5 시간 초과 — 스테이지는 그대로', timeout.stage, 9);
  ok(!timeout.bossOn, '§5 시간 초과 — 보스전 종료');
  ok(timeout.farm, '§5 시간 초과 — 파밍 상태로 전환');
  eq('§5 파밍 — killed 0 으로 되감김', timeout.killed, 0);
  eq('§5 파밍 — 몹 ENEMY_COUNT 마리 재충전', timeout.mobs, N.mobs);
  eq('§5 파밍 — 진행바 분모 ENEMY_COUNT', timeout.total, N.mobs);
  const h5 = await hud(p);
  ok(h5.farm && h5.retry, '§5 파밍 HUD(.bfarm + [재도전]) 표시');
  ok(!h5.fight, '§5 파밍 중에는 보스 HUD 꺼짐');

  const retry = await p.evaluate(() => {
    retryBoss();
    return { bossOn, bossT: Math.round(bossT * 10) / 10, farm: S.bossFarm, killed,
             bossQ: spawnQ.filter(q => q.t === 'boss').length, q: spawnQ.length, stage: S.stage };
  });
  ok(retry.bossOn, '§5 [재도전] — 50킬을 다시 요구하지 않고 보스를 곧장 세운다');
  eq('§5 [재도전] — 제한 시간 재충전', retry.bossT, N.sec);
  ok(!retry.farm, '§5 [재도전] — 파밍 해제');
  eq('§5 [재도전] — 보스 단독 큐', retry.bossQ + '/' + retry.q, '1/1');
  eq('§5 [재도전] — 스테이지 유지', retry.stage, 9);

  const death = await p.evaluate(() => {
    failBoss('패배');                                     /* 사망 경로가 부르는 그 함수 */
    const a = { bossOn, farm: S.bossFarm, stage: S.stage };
    /* 273 — 대기 중 50킬은 **자동 재도전이 아니다**. 파도 보너스 + 재충전만 돌아야 한다.
       ⚠ 위 §5 시간 초과 루프에서 보스에게 맞아 죽어 있을 수 있다 — 클리어 분기는 `player.dead <= 0`
          게이트를 타므로 여기서 되살려 놓지 않으면 «규칙이 안 돈다» 가 아니라 «사망 중» 을 재는 셈이 된다. */
    player.dead = 0; player.hp = stat.maxHp;
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    const goldB = S.gold;
    step(0.016);
    return { ...a, auto: bossOn, stage2: S.stage, farm2: S.bossFarm, gold: S.gold - goldB,
             killed, mobs: spawnQ.length + enemies.length };
  });
  ok(!death.bossOn && death.farm, '§5 사망 경로도 같은 파밍 전환');
  ok(!death.auto, '§5 대기 중 50킬 — 보스는 자동으로 서지 않는다 (273 주인 지시)');
  eq('§5 대기 중 50킬 — 스테이지 유지', death.stage2, 9);
  ok(death.farm2, '§5 대기 중 50킬 — 대기 상태 유지([재도전]을 눌러야 선다)');
  eq('§5 대기 중 50킬 — killed 되감김', death.killed, 0);
  eq('§5 대기 중 50킬 — 다음 파도 재충전', death.mobs, N.mobs);
  ok(death.gold > 0, '§5 파밍 파도 전멸 보너스 골드 유지(28 거동)');

  /* ── §6 회귀 — 던전·레이드·아레나 ───────────────────────────── */
  console.log('§6 회귀 — 30 던전 · 46 레이드 · 123 아레나');
  const dun = await p.evaluate(() => {
    S.stage = 20; spawnStage(); killed = 30;
    startBoss();                                          /* 보스전 한복판에서 던전 입장 */
    const before = bossOn;
    startDunRun(DUNGEONS[0], 1);
    const mid = { bossOn, farm: S.bossFarm, bossT, run: !!dunRun, stage: S.stage };
    /* 던전 중에는 스테이지가 오르지 않는다 */
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    step(0.016);
    const during = { stage: S.stage, bossOn, q: spawnQ.length };
    endDunRun(false, true);
    return { before, mid, during };
  }).catch(e => ({ err: String(e) }));
  ok(!dun.err, '§6 던전 경로가 예외 없이 돈다', dun.err);
  if (!dun.err) {
    ok(dun.before, '§6 (준비) 던전 입장 직전은 보스전이었다');
    ok(!dun.mid.bossOn && dun.mid.bossT === 0, '§6 던전 입장이 보스 단계를 비운다');
    eq('§6 던전 중에는 스테이지가 안 오른다', dun.during.stage, 20);
    ok(!dun.during.bossOn, '§6 던전 중 50킬이 보스를 부르지 않는다');
    ok(dun.during.q > 0, '§6 던전 중에는 몹을 계속 리필한다(30 거동)');
  }

  const raid = await p.evaluate(() => {
    dunRun = null; raidOn = null; arena = null;
    S.stage = 30; spawnStage();
    startRaid(RAIDS[0]);
    const mid = { bossOn, farm: S.bossFarm, bossT, on: !!raidOn };
    const b = enemies.find(e => e.tk === 'boss');
    const had = !!b;
    if (b) killEnemy(b);                                  /* 샌드백도 tk 'boss' 다 */
    step(0.016);
    const after = { stage: S.stage, win: stageWin, bossOn };
    endRaid(false);
    return { mid, had, after };
  }).catch(e => ({ err: String(e) }));
  ok(!raid.err, '§6 레이드 경로가 예외 없이 돈다', raid.err);
  if (!raid.err) {
    ok(!raid.mid.bossOn && raid.mid.bossT === 0, '§6 레이드 입장이 보스 단계를 비운다');
    ok(raid.had, '§6 (준비) 레이드 샌드백이 tk «boss» 로 서 있다');
    ok(!raid.after.win, '§6 샌드백 처치가 클리어를 예약하지 않는다');
    eq('§6 레이드 중에는 스테이지가 안 오른다', raid.after.stage, 30);
  }

  const arn = await p.evaluate(() => {
    dunRun = null; raidOn = null; arena = null;
    S.stage = 40; spawnStage(); killed = 10; startBoss();
    startArena();
    const mid = { bossOn, farm: S.bossFarm, bossT, on: !!arena };
    arena = null; S.stage = 40; spawnStage();
    return { mid };
  }).catch(e => ({ err: String(e) }));
  ok(!arn.err, '§6 아레나 경로가 예외 없이 돈다', arn.err);
  if (!arn.err) ok(!arn.mid.bossOn && arn.mid.bossT === 0, '§6 아레나 입장이 보스 단계를 비운다');

  /* ── §7 콘솔 에러 ───────────────────────────────────────────── */
  console.log('§7 콘솔 에러');
  ok(errs.length === 0, '§7 pageerror/console.error 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY162 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
