/* 178 — 던전 보스 회귀 게이트.
   T2(주인 지시) 작업의 완료 조건은 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작함» 이다
   (ROUTINE.md «기능 완성 규칙»). 그래서 여기서 재는 것은 전부 **런타임 상태**다 —
   기대값도 코드 상수(`DUN_UI`·`ATLAS`·`ETYPE`)에서 그때그때 읽는다(212-① — 게이트에
   숫자를 손으로 박으면 제품이 바뀐 뒤에도 옛 값을 지키며 초록으로 남는다).

   실행: node tools/verify178.js
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const is = (m, got, want) => (got === want ? ok : no)(m + ' = ' + JSON.stringify(got)
  + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'));
const near = (m, got, want, tol) => {
  if (got == null || !isFinite(got)) return no(m + ' — 값 없음(' + got + ')');
  const d = Math.abs(got - want);
  (d <= tol ? ok : no)(m + ' = ' + (+got).toFixed(1) + ' (기대 ' + want + ', Δ' + d.toFixed(1) + ', 허용 ' + tol + ')');
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 던전 하나를 보스 국면까지 굴리고 그 순간의 상태를 통째로 떠 온다 */
  const run = (dunId, floor) => page.evaluate(([id, f]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 12; S.best = 12; S.guide.idx = 99;
    const d = DUNGEONS.find(x => x.id === id);
    S.daily.dun[d.id] = 9; S.dun[d.id] = Math.max(S.dun[d.id] | 0, f);
    if (dunRun) endDunRun(false, true);
    startDunRun(d, f);
    const need = dunRun.need;
    /* 진행률 트리거(30%)를 직접 넘겨 보스를 부른다 — 실제 경로(dunBossTick)를 그대로 탄다 */
    dunRun.dmg = need * DUN_BOSS_P;
    let spawnedAt = -1;
    for (let k = 0; k < 600 && dunRun; k++) {
      step(1 / 60);
      if (!dunRun) break;
      dunRun.dmg = need * DUN_BOSS_P;            /* 클리어로 끝나 버리지 않게 진행률을 고정 */
      if (spawnedAt < 0 && enemies.some(e => e.tk === 'dunboss')) spawnedAt = k;
      if (spawnedAt >= 0 && k > spawnedAt + 30) break;
    }
    const e = enemies.find(x => x.tk === 'dunboss');
    const u = DUN_UI[id];
    const A = e && ATLAS[e.T.atlas];
    /* 이 애니에서 가장 큰 프레임 — 그려진 높이를 여기서 잰다 */
    let mh = 0, mw = 0;
    if (A && A.a[e.T.walk]) for (const n of A.a[e.T.walk]) { const fr = A.f[n]; if (fr && fr[3] > mh) { mh = fr[3]; mw = fr[2]; } }
    const mobs = enemies.filter(x => x.tk !== 'dunboss').length;
    const out = e ? {
      found: true, spawnedAt,
      atlas: e.T.atlas, walk: e.T.walk, atk: e.T.atk, die: e.T.die,
      cardAtlas: u.thk, cardIdle: u.thi,
      drawnH: mh * e.T.scale, drawnW: mw * e.T.scale,
      r: e.T.r, hp: e.hp, max: e.max, need,
      /* 178 — 그려진 «발밑» 이 땅에서 얼마나 떠 있나. 보정(yo) 을 반영한 값이다 */
      foot: (function(){
        let fr = null;
        for (const n of A.a[e.T.walk]) { const q = A.f[n]; if (q && (!fr || q[3] > fr[3])) fr = q; }
        return (fr[7] - fr[5] - fr[3]) * e.T.scale - (e.T.yo || 0);
      })(),
      hasAtkAnim: !!(A && A.a[e.T.atk]), hasDieAnim: !!(A && A.a[e.T.die]),
      solo: !!SOLO_CHASER[e.tk], mobs,
      frameOK: !!(A && A.image && A.f[curFrame(e)])
    } : { found: false };
    if (dunRun) endDunRun(false, true);
    document.querySelectorAll('.mw.on').forEach(el => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
    return out;
  }, [dunId, floor]);

  /* 28 스테이지 보스의 그려진 높이 — 기대값을 코드에서 읽는다 */
  const base = await page.evaluate(() => {
    const A = ATLAS[ETYPE.boss.atlas];
    let f = null;
    for (const n of A.a[ETYPE.boss.walk]) { const q = A.f[n]; if (q && (!f || q[3] > f[3])) f = q; }
    return { h: f[3] * ETYPE.boss.scale, foot: (f[7] - f[5] - f[3]) * ETYPE.boss.scale };
  });
  const stageBossH = base.h;
  console.log('\n[0] 기준 — 28 스테이지 보스: 그려진 높이 ' + stageBossH.toFixed(1)
    + 'px · 발밑 여백 ' + base.foot.toFixed(1) + 'px');

  const IDS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4'];
  for (const id of IDS) {
    console.log('\n[' + id + ']');
    const r = await run(id, 2);
    if (!r.found) { no(id + ' — 보스가 스폰되지 않았다'); continue; }
    /* ① 모습 = 그 던전 카드 썸네일(72)의 몬스터 (주인 확정 요구) */
    is('① 아틀라스 = 카드 썸네일(DUN_UI.thk)', r.atlas, r.cardAtlas);
    is('① 걷기 애니 = 카드 아이들(DUN_UI.thi)', r.walk, r.cardIdle);
    /* ② 크기 = 28 스테이지 보스와 같은 «그려진 높이» */
    near('② 그려진 높이(최대 프레임)', r.drawnH, stageBossH, 1.0);
    /* ③ 애니 3벌이 아틀라스에 실재한다 — 없는 이름을 넣으면 그리기가 조용히 실패한다 */
    is('③ 공격 애니 실재', r.hasAtkAnim, true);
    is('③ 사망 애니 실재', r.hasDieAnim, true);
    is('③ 현재 프레임이 아틀라스에 있다(폴백 원이 아니다)', r.frameOK, true);
    /* ④ 172 와 같은 «1:1 단독 개체» 예외를 탄다 */
    is('④ SOLO_CHASER 직진 추격', r.solo, true);
    /* ⑤ 체력 = 그 층의 요구 피해 × DUN_BOSS_HPK */
    const hpk = await page.evaluate(() => DUN_BOSS_HPK);
    near('⑤ 체력 = 요구 피해 × ' + hpk, r.hp / r.need, hpk, 0.001);
    /* ⑥ 판정 반경이 몸통 안에 든다(스프라이트 폭의 1/4~2/3) */
    (r.r >= r.drawnW * 0.22 && r.r <= r.drawnW * 0.7 ? ok : no)(
      '⑥ 판정 반경 ' + r.r + ' 이 그려진 폭 ' + r.drawnW.toFixed(0) + ' 의 22~70% 안');
    /* ⑥-b 발밑이 땅에 닿는다 — 배율을 키우면 논리 프레임의 아래 빈 칸만큼 공중에 뜬다 */
    near('⑥-b 발밑 여백(보정 후) = 28 보스와 같음', r.foot, base.foot, 1.0);
    /* ⑦ 보스가 살아 있어도 몹 파도가 흐른다 — 옛 리필 판정이면 여기서 0 이 된다 */
    (r.mobs > 0 ? ok : no)('⑦ 보스와 함께 몹이 남아 있다(리필이 안 멈춤) — ' + r.mobs + '마리');
  }

  /* ---------- 회귀: 28 스테이지 보스는 한 줄도 안 바뀌었다 ---------- */
  console.log('\n[회귀] 28 스테이지 보스 · 판정 플래그');
  const reg = await page.evaluate(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 5; S.best = 5;
    if (dunRun) endDunRun(false, true);
    spawnStage();
    startBoss();
    for (let k = 0; k < 200; k++) step(1 / 60);
    /* HUD 클래스는 rAF 루프의 drawHud() 가 켠다 — step() 만 돌리면 영원히 꺼져 있다.
       (1차 실측에서 이 한 줄이 없어 «스테이지 보스전인데 #bossHp 가 꺼짐» 이 거짓 FAIL 로 떴다) */
    drawBossHud();
    const b = enemies.find(e => e.tk === 'boss');
    const r1 = { bossOn: bossOn, bossKind: !!b, hpFromStage: b ? Math.abs(b.max - eHp(5) * ETYPE.boss.hp) < 1 : false,
                 hudOn: document.getElementById('bossHp').classList.contains('on') };
    /* 던전 보스는 스테이지 진행을 건드리지 않는다 */
    enemies.length = 0; spawnQ.length = 0; bossOn = false; stageWin = false; S.bossFarm = false;
    const d = DUNGEONS[0];
    S.daily.dun[d.id] = 9; S.dun[d.id] = 2; S.guide.idx = 99;
    startDunRun(d, 2);
    spawnDunBoss();
    for (let k = 0; k < 200; k++) step(1 / 60);
    const e = enemies.find(x => x.tk === 'dunboss');
    const before = { stage: S.stage, farm: S.bossFarm };
    if (e) killEnemy(e);
    drawBossHud();
    const r2 = { stageKept: S.stage === before.stage, bossOn: bossOn, stageWin: stageWin,
                 bossT: bossT, farm: S.bossFarm === before.farm,
                 hudOff: !document.getElementById('bossHp').classList.contains('on') };
    if (dunRun) endDunRun(false, true);
    return { r1, r2 };
  });
  is('스테이지 보스는 그대로 뜬다', reg.r1.bossKind, true);
  is('스테이지 보스 체력은 여전히 eHp(stage)×ETYPE.boss.hp', reg.r1.hpFromStage, true);
  is('스테이지 보스전이면 #bossHp 가 켜진다', reg.r1.hudOn, true);
  is('던전 보스를 잡아도 스테이지가 오르지 않는다', reg.r2.stageKept, true);
  is('던전 보스를 잡아도 stageWin 이 서지 않는다', reg.r2.stageWin, false);
  is('던전 보스를 잡아도 bossOn 이 서지 않는다', reg.r2.bossOn, false);
  is('던전 보스를 잡아도 S.bossFarm 이 안 바뀐다', reg.r2.farm, true);
  is('던전 런에서는 #bossHp 가 꺼져 있다(30 의 HUD 를 안 건드림)', reg.r2.hudOff, true);

  /* ---------- 콘솔 ---------- */
  console.log('');
  is('콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 5).join('\n    '));
  console.log('\nVERIFY178  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
