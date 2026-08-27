/* 작업 214 ⓑ — «파밍 보너스 골드가 실제로 들어오는가» 실측 (게이트가 아니라 «측정»).
 *
 * 등재문(PROGRESS 214)이 요구한 순서: ⓑ 를 먼저 «실측» 한다. verify94 의
 * `파밍 · 3회 모두 골드는 들어온다` 가 false,false,false 인 것이 ①진짜 지급 누락(T1 버그)인지
 * ②162 이후 하네스가 파밍 분기에 못 닿는 것인지 가르는 것이 이 파일의 유일한 목적이다.
 *
 * 162 이후 한 스테이지는 «몹 50킬 → 보스 도전 → 보스 격파» 3단계이고,
 * 파밍 보너스(index.html ~16530 `if(S.bossFarm){ bonusG = eGold(S.stage)*12*goldMul }`)는
 * **`killed >= ENEMY_COUNT` 분기 안**에 있다. 즉 «웨이브 전멸» 이 아니라 «50킬 달성» 이 조건이다.
 * verify94 의 하네스는 `enemies`/`spawnQ` 만 비우고 `killed` 는 0 그대로라 그 분기에 닿지 못한다.
 *
 * 그래서 여기서는 «전장을 비우는» 흉내가 아니라 **실제 킬 경로**(killEnemy — S.gold += e.gold 가
 * 지나는 그 함수)로 50마리를 잡아 파밍 한 바퀴를 돌린다.
 *
 * 실행: node tools/probe214.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const FILE = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const br = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE);
  await p.waitForFunction(() => typeof step === 'function', null, { timeout: 15000 });
  await p.waitForTimeout(900);

  const out = await p.evaluate(() => {
    const log = [];
    const rec = [];
    const orig = showMsg;
    showMsg = t => { rec.push(String(t)); orig(t); };
    let err = '';
    try {
      /* 보스전 중 상태를 만든다 — 162 흐름대로 «50킬 → startBoss» 를 거친다 */
      S.stage = 10; S.gold = 0; goldWin = 0;
      spawnStage();                       /* 몹 구간 시작(killed=0, 50마리 예약) */
      log.push({ 단계: 'spawnStage', killed, bossFarm: S.bossFarm, bossOn, msg: rec.slice() });

      /* ① 50킬 — 첫 도전이므로 파밍 보너스는 «없어야» 한다(이중 지급 방지, index.html ~16527 주석) */
      const drive = (lim) => {
        /* 실제 킬 경로로 몹을 채워 잡는다. step() 이 spawnQ 를 소비해 enemies 를 만든다. */
        let guard = 0;
        while (killed < lim && guard++ < 4000) {
          step(0.016);
          while (enemies.length && killed < lim) killEnemy(enemies[0]);
        }
        return guard;
      };
      rec.length = 0;
      const g0 = S.gold;
      drive(ENEMY_COUNT);
      const gKill = S.gold - g0;          /* 몹 드랍 골드(파밍 보너스와 구분하려고 따로 잰다) */
      const before = S.gold;
      step(0.016);                        /* killed >= ENEMY_COUNT → 보스 도전 분기 */
      log.push({ 단계: '첫 50킬 후 step', 몹드랍: Math.round(gKill), 분기증가: Math.round(S.gold - before),
                 bossOn, bossFarm: S.bossFarm, msg: rec.slice() });

      /* ② 보스전 실패 → 파밍 상태 */
      rec.length = 0;
      bossT = 30; player.dead = 0;
      failBoss('시간 초과');
      log.push({ 단계: 'failBoss', killed, bossFarm: S.bossFarm, bossOn, msg: rec.slice() });

      /* ③ 파밍 50킬 3바퀴 — 매 바퀴 «분기 증가분» 이 보너스 골드다 */
      const expect = () => Math.round(eGold(S.stage) * 12 * stat.goldMul);
      for (let w = 0; w < 3; w++) {
        rec.length = 0;
        drive(ENEMY_COUNT);
        const b0 = S.gold;
        step(0.016);                      /* 파밍 분기 진입 */
        const got = S.gold - b0;
        log.push({ 단계: '파밍 ' + (w + 1) + '바퀴', 보너스: Math.round(got), 기대: expect(),
                   일치: Math.abs(got - expect()) < 1, bossOn, bossFarm: S.bossFarm, msg: rec.slice() });
        /* 다음 바퀴를 위해 보스전을 다시 실패시킨다 */
        bossT = 30; player.dead = 0; failBoss('시간 초과');
      }

      /* ④ verify94 하네스와 «똑같이» 해 본다 — enemies/spawnQ 만 비우고 step */
      rec.length = 0;
      const h0 = S.gold, hk = killed;
      enemies.length = 0; spawnQ.length = 0; player.dead = 0;
      step(0.016);
      log.push({ 단계: 'verify94 하네스 재현', killed_직전: hk, 증가: Math.round(S.gold - h0),
                 탄분기: killed === 0 && spawnQ.length > 0 ? '④ queueMobs(재충전)' : '?' });
    } catch (e) { err = String((e && e.message) || e); }
    showMsg = orig;
    try { S.stage = 3; S.bossFarm = false; bossT = 0; spawnStage(); msgT = 0; msgTxt = ''; msgLast = ''; } catch (_) {}
    return { log, err };
  });

  console.log('== 작업 214 ⓑ 파밍 보너스 골드 실측 ==');
  out.log.forEach(r => console.log(JSON.stringify(r, null, 0)));
  if (out.err) console.log('ERR: ' + out.err);
  console.log('콘솔 에러: ' + (errs.length ? errs.join(' | ') : '0건'));
  await br.close();
})();
