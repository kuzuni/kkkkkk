#!/usr/bin/env node
/* 637 재현기 — `tools/verify98.js` §E 음성 대조항(«전투 중 coin 이 실제로 울리긴 함») 1건 실패(51/52)의
 * «찍힌 값» 을 처방 전에 먼저 받는다 (338 규칙 — 등재문의 가설을 코드보다 먼저 재현으로 가른다).
 *
 *   node tools/probe637.js
 *
 * 등재문이 세운 갈래를 자로 가른다:
 *   [1] 현행 — 전투 60초에 킬은 나는데 `sfx('coin')` 호출·발화가 정말 0 인가(표본이 빈 것인가,
 *       아니면 억제가 과한 것인가). fxAt('combat') 발원 표시가 몇 번 찍히는지도 같이 센다.
 *   [2] 원인 대조 — **같은 하네스에서 `FX_COMBAT_FX.kill` 만 true 로 되돌리면** coin 이 울리는가.
 *       울리면 빨강의 뿌리는 «자가 낡았다»(592 가 ⑴ 킬 드랍을 주인 지시로 껐다)이고,
 *       안 울리면 뿌리는 다른 데(억제·오디오 경로)에 있다. 얕은 클론이라 git 이력으로는
 *       못 가르는 자리를 **런타임 한 표(`FX_COMBAT_FX`)로** 가른다.
 *   [3] 592 가 **일부러 남긴** ⑵⑶(스테이지 클리어·파도 전멸 보너스)이 살아 있는가 —
 *       그 경로로 coin 이 여전히 우는가. 자의 음성 대조를 여기로 옮겨도 되는지를 이 값이 정한다.
 *
 * verify98 §E 와 **같은 하네스**(같은 서버·같은 플래그·같은 부팅 대기·같은 sfx 후킹)를 쓴다 —
 * 자리가 달라지면 재현이 아니다. 판정은 값 찍기가 원칙이나 «등재문이 맞았는지» 는 [P] 항으로 못박는다.
 */
const path = require('path');
const { launch, serve } = require('./aud98.js');

const SEC = Number(process.env.P637_SEC || 60);
const line = [];
const fails = [];
const ck = (name, ok, info) => {
  line.push((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : ''));
  if (!ok) fails.push(name);
};

/* 페이지 안에서 도는 계측기 — verify98 §E 와 같은 방식(auLast 변화로 «실제 발화» 를 센다).
   fxAt 도 같이 후킹해 «전투 발원 표시가 몇 번 찍혔나» 를 센다(⑴ 킬 · ⑵⑶ 보너스 구분용). */
async function measureWindow(pg, ms, patch) {
  return pg.evaluate(([ms, patch]) => new Promise(done => {
    const origSfx = window.sfx, origAt = window.fxAt;
    const before = { kills: S.totalKills, gold: S.gold, stage: S.stage };
    const saveKill = FX_COMBAT_FX.kill, saveFarm = S.bossFarm;
    if (patch && patch.killFx != null) FX_COMBAT_FX.kill = patch.killFx;
    if (patch && patch.bossFarm != null) S.bossFarm = patch.bossFarm;
    /* ⑵⑶ 표본 — 파도 전멸(③)은 `killed >= ENEMY_COUNT` 에서만 선다. 기본 속도로는 50킬에
       43초가 걸려 창 하나에 한 번 설까 말까라 표본이 «운» 이 된다 ⇒ 눈금을 한 칸 앞에 세워
       **제품의 그 분기 그대로** 밟게 한다(보너스 계산·발원 표시·골드 증가는 한 줄도 안 흉내낸다). */
    let armT = null;
    if (patch && patch.armWave) armT = setInterval(() => { if (killed < ENEMY_COUNT - 1) killed = ENEMY_COUNT - 1; }, patch.armWave);
    let calls = 0, fired = 0, atCombat = 0;
    window.fxAt = function (t, src) { if (src === 'combat') atCombat++; return origAt.apply(this, arguments); };
    window.sfx = function (n) {
      if (n !== 'coin') return origSfx.apply(this, arguments);
      calls++; const b = auLast.coin; const r = origSfx.apply(this, arguments);
      if (auLast.coin !== b) fired++; return r;
    };
    const t0 = performance.now();
    setTimeout(() => {
      window.sfx = origSfx; window.fxAt = origAt;
      if (armT) clearInterval(armT);
      FX_COMBAT_FX.kill = saveKill; S.bossFarm = saveFarm;
      done({
        calls, fired, atCombat,
        kills: S.totalKills - before.kills,
        goldUp: S.gold - before.gold,
        stageUp: S.stage - before.stage,
        sec: +((performance.now() - t0) / 1000).toFixed(2),
      });
    }, ms);
  }), [ms, patch || null]);
}

(async () => {
  const { srv, port } = await serve();
  const br = await launch(['--autoplay-policy=no-user-gesture-required', '--mute-audio']);
  const pg = await br.newPage();
  const cerr = [];
  pg.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
  pg.on('pageerror', e => cerr.push(String(e.message || e)));
  await pg.setViewportSize({ width: 1080, height: 2280 });
  await pg.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  await pg.mouse.click(540, 1200);            /* auInit — 첫 제스처(verify98 과 같은 자리) */
  await pg.waitForTimeout(1500);

  /* 선언 자체를 먼저 찍는다 — 592 가 무엇을 껐는지 «소스가 아니라 런타임» 에서 확인한다. */
  const decl = await pg.evaluate(() => ({ ...FX_COMBAT_FX, enemyCount: ENEMY_COUNT, auMin: AU_MIN.coin }));
  console.log('[0] 런타임 선언');
  console.log('  FX_COMBAT_FX = ' + JSON.stringify(decl) );

  console.log('[1] 현행 — 전투 ' + SEC + '초 (592 기본값 kill:false)');
  const now = await measureWindow(pg, SEC * 1000, null);
  console.log('  ' + JSON.stringify(now));
  ck('킬은 실제로 난다(표본이 살아 있다)', now.kills > 0, now.kills + '킬');
  ck('그런데 coin 호출이 0 이다(억제가 아니라 «부르는 데가 없다»)', now.calls === 0, now.calls + '회 호출');
  ck('따라서 발화도 0', now.fired === 0, now.fired + '회 발화');
  ck('전투 발원 표시(fxAt combat)도 0', now.atCombat === 0, now.atCombat + '회');

  console.log('[2] 원인 대조 — 같은 창에서 `FX_COMBAT_FX.kill` 만 true 로 되돌린다');
  const back = await measureWindow(pg, SEC * 1000, { killFx: true });
  console.log('  ' + JSON.stringify(back));
  ck('되돌리면 coin 이 다시 운다 ⇒ 빨강의 뿌리는 592(주인 지시)이지 오디오 회귀가 아니다',
     back.fired > 0, back.fired + '회 발화 / ' + back.calls + '회 호출 / ' + back.kills + '킬');
  ck('되돌린 창에서도 발화율은 상한 안 (≤ 7회/s)', back.fired / back.sec <= 7,
     (back.fired / back.sec).toFixed(2) + '회/s');

  console.log('[3] 592 가 남긴 ⑵⑶ — 파도 전멸 보너스(S.bossFarm=true)가 서는가');
  const farm = await measureWindow(pg, SEC * 1000, { bossFarm: true, armWave: 1500 });
  console.log('  ' + JSON.stringify(farm));
  ck('⑵⑶ 경로의 전투 발원 표시가 실제로 찍힌다', farm.atCombat > 0, farm.atCombat + '회');
  ck('그 경로로 coin 이 여전히 운다(연출이 통째로 죽은 게 아니다)', farm.fired > 0,
     farm.fired + '회 발화 / ' + farm.calls + '회 호출');

  console.log('[P] 등재문 판정');
  ck('등재문대로 — §E 음성 대조항은 «자가 낡았다»(제품 회귀 아님)',
     now.fired === 0 && back.fired > 0 && farm.fired > 0);
  ck('콘솔 에러 0', cerr.length === 0, cerr.slice(0, 3).join(' / '));

  await br.close(); srv.close();
  console.log('');
  console.log(line.join('\n'));
  const n = line.length;
  console.log('\nPROBE637 ' + (n - fails.length) + '/' + n + (fails.length ? ' FAIL — ' + fails.join(' / ') : ' PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
