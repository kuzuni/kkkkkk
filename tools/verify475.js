/* 작업 475 게이트 — «모든 보스전» 격파 시퀀스 (보스가 터지고 → 알림 → 1초 → 후속)
 *
 *   node tools/verify475.js   → 마지막 줄이 `VERIFY475 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-30): «보스전들 전부 다 죽을떄 쩄뜬 연출있게 하고나서 그다음에
 * 다음스테이지 가던지 뭐 클리어 알림뜨던지 그렇게 하라».
 * 332 는 이 시퀀스를 **던전에만** 세웠다. 스테이지 보스는 죽는 프레임에 `S.stage++` 가 돌아
 * 시체가 터지기도 전에 다음 스테이지가 깔렸고, 승급전은 그 프레임에 `endPromo(true)` 로
 * 팝업이 떴다. 475 는 그 시퀀스를 **모드 공용 상태 `bossClear` 하나**로 승격한다.
 *
 * 재는 축(등재문 (a)~(f)):
 *   §0 전제   — 상태·시퀀스·세 진입이 소스에 있고, 홀드는 **던전과 같은 상수 하나**다(새 상수 0개).
 *   §A 스테이지 — 격파부터 die 애니 동안 `S.stage` 불변 → die 에 «STAGE CLEAR!» → die+1 에 다음 스테이지.
 *   §B 승급전  — 같은 시각표. 시퀀스 중 `promo.t` 는 안 흐르고 계급도 안 오른다.
 *   §C 던전    — 332 의 그 시퀀스가 **같은 공용 상태**로 돈다(`clrT`·`clrMsg` 는 얇은 접근자).
 *   §D 정지    — 시퀀스 중 스킬 쿨 감소 0 · 시전(투사체·장판) 0 · 잡몹 큐 0 · 플레이어 피해 0.
 *   §R 되돌림  — 홀드를 걷어낸 사본(= 옛 «죽는 프레임에 바로») 은 §A·§B 의 자로 **빨갛다**.
 *
 * LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다. §R 이 그 자리다.
 * LESSONS 319 — page.evaluate 예외는 그 절만 빨갛게(ev/blk).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const yes = (m, v, info) => (v ? ok(m) : no(m + (info !== undefined ? ' — ' + info : '')));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(3) + 's (기대 ' + (+want).toFixed(3) + 's)')
  : no(m + ' = ' + (+got).toFixed(3) + 's — 기대 ' + (+want).toFixed(3) + 's (허용 ' + tol + ')'));

const HOLD = 1.0;                 /* 주인 지시의 «1초» — 소스의 DUN_CLR_HOLD 와 같은 값이어야 한다 */
const TOL = 2 / 60 + 1e-6;        /* 시각 단언 허용 = 2프레임(1프레임 경계 + 반올림) */

/* 한 판을 헤드리스로 굴리는 공용 조각 — 실제 진입점만 쓴다(T2 «기능 완성 규칙»: 상태를 손으로 안 만든다) */
const SETUP = `
  localStorage.clear();
  Object.assign(S, DEF());
  S.guide.idx = 99;
  /* 대상이 없어도 «성공하는» 스킬 둘을 장착한다(459 주석) — 시퀀스 중 시전 0 을 진짜로 재려면
     실패로 걸러지는 slash 가 아니라 이 둘이어야 한다. */
  S.own.poison = { n: 0, l: 1 }; S.own.meteor = { n: 0, l: 1 };
  S.eqSkill = ['poison', 'meteor'];
`;

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── §0 전제 ─────────────────────────────────────────────── */
  console.log('[0] 전제 — 공용 상태와 세 진입이 소스에 있다');
  yes('[0-a] 공용 상태 `bossClear` 선언', /let\s+bossClear\s*=\s*null;/.test(src));
  yes('[0-b] 문구 표 `BOSS_CLR_TXT` 에 세 모드가 다 있다',
      /BOSS_CLR_TXT\s*=\s*\{[^}]*stage:[^}]*promo:[^}]*dun:[^}]*\}/.test(src));
  yes('[0-c] 스테이지 보스가 시퀀스로 들어간다(killEnemy)', /bossClearStart\('stage', e\)/.test(src));
  yes('[0-d] 승급 수호자가 시퀀스로 들어간다(killEnemy)', /bossClearStart\('promo', e\)/.test(src));
  yes('[0-e] 던전 보스가 같은 시퀀스로 들어간다(killEnemy)', /bossClearStart\('dun', e, dunRun\.clrDie\)/.test(src));
  /* ⚑ 새 홀드 상수를 만들면 «던전만 1초» 로 되돌아간다 — 상수는 하나뿐이어야 한다 */
  /* ⚑ 699 이관(2026-09-01) — 홀드가 «상수 한 줄» 에서 «시퀀스가 열릴 때 정해지는 값»(`bossClear.hold`)이
     됐다(전투 연출 스킵 토글: ON 이면 0). **묻는 것은 그대로다** — 값의 출처가 여전히 `DUN_CLR_HOLD`
     하나이고 모드별 새 상수가 없는가. 항을 지우지 않고 방향만 새 자리로 옮긴다(333). */
  yes('[0-f] 홀드는 던전 상수 `DUN_CLR_HOLD` 를 공유한다(새 상수 0개)',
      /bossClear\.t >= bossClear\.die \+ \(bossClear\.hold != null \? bossClear\.hold : DUN_CLR_HOLD\)/.test(src)
      && /hold: sk \? 0 : DUN_CLR_HOLD/.test(src) && !/BOSS_CLR_HOLD/.test(src));
  /* 699 — 스킵이 꺼져 있으면 홀드는 예전과 같은 한 값이다(모드별로 갈라지지 않는다) */
  yes('[0-f2] 스킵 OFF 면 홀드가 `DUN_CLR_HOLD` 그대로다',
      /hold: sk \? 0 : DUN_CLR_HOLD/.test(src) && !/hold: *[0-9]/.test(src));
  is('[0-g] `DUN_CLR_HOLD` 값', (src.match(/const DUN_CLR_HOLD = ([\d.]+)/) || [])[1], '1.0');
  /* 옛 거동이 «남아 있지 않다» 를 두 자리에서 각각 못 박는다 — 새 상태만 확인하면 옛 즉시 처리가
     같이 남아도 초록이다(그러면 스테이지가 격파 프레임에 한 번, 시퀀스 끝에 또 오른다). */
  yes('[0-h] 스테이지: 격파 프레임의 즉시 예약(`stageWin = true`)이 killEnemy 에서 사라졌다',
      !/if\(bossOn\)\{ bossOn = false; stageWin = true; \}/.test(src)
      && /if\(bossOn && !bossClearStart\('stage', e\)\)/.test(src));
  yes('[0-i] 승급전: 시계·결과 처리가 시퀀스 가드 «안» 에 있다',
      /if\(bossClear\)\{[^}]*\}\s*\n\s*else\{\s*\n\s*promo\.t -= dt;/.test(src));
  yes('[0-j] 스테이지 클리어 분기에서 문구·소리가 시퀀스로 옮겨 갔다(같은 문구 두 번 금지)',
      !/const msg = 'STAGE CLEAR!';/.test(src) && !/showMsg\(msg\);/.test(src));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 160) }; }
  };
  const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

  /* 게임 루프를 얼린다(LESSONS 161 · verify332 와 같은 처방) — 아래 step() 호출만이 유일한 시계다 */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* ── §A 스테이지 보스 ───────────────────────────────────── */
  console.log('[A] 스테이지 보스 — 터짐 → «STAGE CLEAR!» → 1초 → 다음 스테이지');
  const A = await ev(([setup]) => {
    eval(setup);
    S.stage = 12; S.best = 12;
    spawnStage();
    /* 실제 경로: 50킬을 채우면 step 이 보스를 세운다(162 ③) */
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
    const b = enemies.find((e) => e.tk === 'boss');
    if (!b) return { err: '보스가 안 섰다' };
    const die = bossDieSec(b), stage0 = S.stage, gold0 = S.gold;
    msgTxt = ''; msgT = 0;
    killEnemy(b);
    const atKill = { stage: S.stage, seq: !!bossClear, msg: msgTxt, corpses: corpses.length };
    let t = 0, msgAt = -1, doneAt = -1, stageDuring = true, mobsDuring = 0, corpseAdv = false;
    const at0 = corpses.length ? corpses[0].at : -1;
    for (let i = 0; i < 600 && doneAt < 0; i++) {
      step(1 / 60); t += 1 / 60;
      if (msgAt < 0 && msgTxt === 'STAGE CLEAR!') msgAt = t;
      if (doneAt < 0 && S.stage !== stage0) doneAt = t;
      if (doneAt < 0) {
        if (S.stage !== stage0) stageDuring = false;
        mobsDuring = Math.max(mobsDuring, spawnQ.length + enemies.length);
        if (corpses.length && corpses[0].at > at0) corpseAdv = true;
      }
    }
    return { die, atKill, msgAt, doneAt, stageDuring, mobsDuring, corpseAdv,
             stage: S.stage, gold: S.gold - gold0, msg: msgTxt, farm: S.bossFarm, bossOn,
             killed, total: stageTotal(), queued: spawnQ.length };
  }, [SETUP]);
  if (!blk('[A]', A)) {
    if (A.err) no('[A] ' + A.err);
    else {
      is('[A-a] 격파 프레임에는 스테이지가 안 오른다', A.atKill.stage, 12);
      yes('[A-b] 격파 프레임에 시퀀스가 선다(bossClear)', A.atKill.seq);
      is('[A-c] 격파 프레임에는 클리어 문구가 아직 없다', A.atKill.msg, '');
      is('[A-d] 시체(터지는 그림)가 실제로 생겼다', A.atKill.corpses > 0, true);
      near('[A-e] «STAGE CLEAR!» 는 die 애니가 끝나는 시점에', A.msgAt, A.die, TOL);
      near('[A-f] 다음 스테이지는 그로부터 1초 뒤', A.doneAt, A.die + HOLD, TOL);
      yes('[A-g] 시퀀스 내내 스테이지는 그대로였다', A.stageDuring);
      is('[A-h] 시퀀스 중 잡몹은 한 마리도 안 깔린다', A.mobsDuring, 0);
      yes('[A-i] 시체 die 애니는 시퀀스 동안 계속 돈다(멈춘 그림이 아니다)', A.corpseAdv);
      is('[A-j] 후속: 스테이지 +1', A.stage, 13);
      yes('[A-k] 후속: 클리어 골드가 들어왔다(170 — 보상은 골드뿐)', A.gold > 0, A.gold);
      is('[A-l] 후속: 다음 판은 몹 구간(50킬 분모)', A.total, 50);
      is('[A-m] 후속: 다음 파도가 깔렸다', A.queued, 50);
      yes('[A-n] 후속: 보스전·파밍 깃발이 풀렸다', !A.bossOn && !A.farm);
      is('[A-o] 화면에 남는 문구는 다음 스테이지의 «STAGE n»', A.msg, 'STAGE 13');
    }
  }

  /* ── §B 승급전 ──────────────────────────────────────────── */
  console.log('[B] 승급전 — 터짐 → «승급 성공!» → 1초 → 승급 팝업');
  const B = await ev(([setup]) => {
    eval(setup);
    S.stage = 30; S.best = 30;
    spawnStage();
    startPromo();
    if (!promo) return { err: '승급전 입장 실패' };
    for (let i = 0; i < 600 && bossIntro; i++) step(1 / 60);
    const g = enemies.find((e) => e.tk === 'promo');
    if (!g) return { err: '수호자가 없다' };
    const die = bossDieSec(g), rank0 = S.rank;
    msgTxt = ''; msgT = 0;
    document.getElementById('modal').classList.remove('on');
    killEnemy(g);
    const atKill = { rank: S.rank, seq: !!bossClear, promo: !!promo, msg: msgTxt };
    const tSeq = promo ? promo.t : -1;
    let t = 0, msgAt = -1, doneAt = -1, tMin = tSeq, tMax = tSeq;
    for (let i = 0; i < 600 && doneAt < 0; i++) {
      step(1 / 60); t += 1 / 60;
      if (msgAt < 0 && msgTxt === '승급 성공!') msgAt = t;
      if (promo) { tMin = Math.min(tMin, promo.t); tMax = Math.max(tMax, promo.t); }
      if (doneAt < 0 && !promo) doneAt = t;
    }
    return { die, atKill, msgAt, doneAt, tSeq, tMin, tMax, rank: S.rank, rank0,
             pop: document.getElementById('modal').classList.contains('on'),
             msg: msgTxt };
  }, [SETUP]);
  if (!blk('[B]', B)) {
    if (B.err) no('[B] ' + B.err);
    else {
      is('[B-a] 격파 프레임에는 승급이 확정되지 않는다', B.atKill.rank, B.rank0);
      yes('[B-b] 격파 프레임에 시퀀스가 선다', B.atKill.seq);
      yes('[B-c] 격파 프레임에는 승급전이 아직 안 끝났다', B.atKill.promo);
      near('[B-d] «승급 성공!» 은 die 애니가 끝나는 시점에', B.msgAt, B.die, TOL);
      near('[B-e] 승급 처리(팝업)는 그로부터 1초 뒤', B.doneAt, B.die + HOLD, TOL);
      is('[B-f] 시퀀스 중 승급전 시계가 안 흐른다(최솟값 = 격파 시점 값)', +B.tMin.toFixed(4), +B.tSeq.toFixed(4));
      is('[B-g] 시퀀스 중 승급전 시계가 안 흐른다(최댓값)', +B.tMax.toFixed(4), +B.tSeq.toFixed(4));
      is('[B-h] 후속: 계급이 올랐다', B.rank, B.rank0 + 1);
      yes('[B-i] 후속: 승급 팝업이 떴다', B.pop);
    }
  }

  /* ── §C 던전 — 332 의 시퀀스가 «같은» 상태로 돈다 ───────── */
  console.log('[C] 던전 — 332 의 시퀀스가 공용 상태 위에서 돈다');
  const C = await ev(() => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.find((x) => x.id === 'gold');
    S.dunTk[d.id] = 9;
    challengeDungeon(d);
    if (!dunRun) return { err: '던전 입장 실패' };
    const clrDie = dunRun.clrDie;
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'dunboss') || bossIntro); i++) step(1 / 60);
    const b = enemies.find((e) => e.tk === 'dunboss');
    if (!b) return { err: '던전 보스가 안 섰다' };
    const t0 = dunRun.t;
    killEnemy(b);
    const md = bossClear ? bossClear.md : '';
    const die = bossClear ? bossClear.die : -1;
    /* 얇은 접근자 — 옛 이름으로 읽어도 공용 상태가 보여야 한다(헛초록 방지) */
    step(1 / 60);
    const mirror = { clrT: dunRun ? dunRun.clrT : -1, seqT: bossClear ? bossClear.t : -1,
                     clrMsg: dunRun ? dunRun.clrMsg : null, tFrozen: dunRun ? dunRun.t : -1, t0 };
    let t = 0, doneAt = -1;
    for (let i = 0; i < 600 && doneAt < 0; i++) { step(1 / 60); t += 1 / 60; if (!dunRun) doneAt = t + 1 / 60; }
    return { md, die, clrDie, mirror, doneAt };
  });
  if (!blk('[C]', C)) {
    if (C.err) no('[C] ' + C.err);
    else {
      is('[C-a] 던전 시퀀스도 같은 공용 상태다', C.md, 'dun');
      is('[C-b] 길이는 런이 재 둔 `clrDie` 그대로', +C.die.toFixed(4), +C.clrDie.toFixed(4));
      is('[C-c] `dunRun.clrT` 는 공용 상태를 그대로 비춘다(얇은 접근자)',
         +C.mirror.clrT.toFixed(4), +C.mirror.seqT.toFixed(4));
      is('[C-d] 시퀀스 중 던전 제한 시간이 안 흐른다', +C.mirror.tFrozen.toFixed(4), +C.mirror.t0.toFixed(4));
      near('[C-e] 완료 화면까지 die + 1초', C.doneAt, C.clrDie + HOLD, TOL + 1 / 60);
    }
  }

  /* ── §D 시퀀스 중 정지(스킬·펫·잡몹·피해) ───────────────── */
  console.log('[D] 정지 — 시퀀스 중에는 쿨도 안 흐르고 아무것도 안 나간다');
  const D = await ev(([setup]) => {
    eval(setup);
    S.stage = 12; S.best = 12;
    spawnStage();
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
    /* ⚠ 시계를 «반쯤 쓴» 상태로 만든다(0.5초). 시작값 그대로면 `bossT < BOSS_SEC` 가 거짓이라
       시계 블록이 애초에 안 돌아, [D-h] 가 «이미 참인 것» 을 재게 된다(338 교훈). */
    for (let i = 0; i < 30; i++) step(1 / 60);
    const b = enemies.find((e) => e.tk === 'boss');
    if (!b) return { err: '보스가 안 섰다' };
    /* 시전 직전까지 쿨을 몰아 둔다 — «안 흐른다» 를 재려면 흐르면 곧 터질 상태여야 한다 */
    for (const id of S.eqSkill) skillCd[id] = 0.05;
    shots.length = 0; zones.length = 0; booms.length = 0;   /* 전투 중 나간 것은 세지 않는다 */
    const hp0 = player.hp;
    killEnemy(b);
    const cd0 = S.eqSkill.map((id) => skillCd[id]);
    /* ⏱ 는 격파 프레임에 «0» 으로 떨어지지 않고 그 시점 값으로 언다(던전과 같은 그림) */
    const tm0 = bossT;
    let tmMin = bossT, tmMax = bossT;
    let shotsMax = 0, zonesMax = 0, boomsMax = 0, hpMin = hp0, mobs = 0;
    while (bossClear) {
      step(1 / 60);
      /* ⚠ 시퀀스가 끝나는 프레임은 **후속 처리 프레임**이다(spawnStage 가 다음 파도 50 을 깐다) —
         그 프레임을 «시퀀스 중» 으로 세면 [D-e] 가 영원히 50 으로 빨갛다. 재는 것은 그 앞까지다. */
      if (!bossClear) break;
      shotsMax = Math.max(shotsMax, shots.length);
      zonesMax = Math.max(zonesMax, zones.length);
      boomsMax = Math.max(boomsMax, booms.length);
      hpMin = Math.min(hpMin, player.hp);
      mobs = Math.max(mobs, spawnQ.length);
      tmMin = Math.min(tmMin, bossT); tmMax = Math.max(tmMax, bossT);
    }
    const cd1 = S.eqSkill.map((id) => skillCd[id]);
    return { cd0, cd1, shotsMax, zonesMax, boomsMax, hp0, hpMin, mobs,
             tm0, tmMin, tmMax, tmEnd: bossT, fight: bossOn };
  }, [SETUP]);
  if (!blk('[D]', D)) {
    if (D.err) no('[D] ' + D.err);
    else {
      is('[D-a] 시퀀스 동안 스킬 쿨이 한 프레임도 안 줄었다', D.cd1.join('/'), D.cd0.join('/'));
      is('[D-b] 시전된 투사체 0', D.shotsMax, 0);
      is('[D-c] 깔린 장판 0(poison)', D.zonesMax, 0);
      is('[D-d] 터진 운석 0(meteor)', D.boomsMax, 0);
      is('[D-e] 시퀀스 중 잡몹 큐 0', D.mobs, 0);
      is('[D-f] 시퀀스 중 플레이어 피해 0(잔존 투사체 포함)', D.hpMin, D.hp0);
      /* ⏱ — 격파 프레임에 0 으로 떨어지면 이긴 판이 «시간 초과» 처럼 읽힌다(던전은 얼어붙는다) */
      yes('[D-g] 격파 시점의 ⏱ 가 0 이 아니다(얼어붙는다)', D.tm0 > 0, D.tm0);
      is('[D-h] 시퀀스 중 ⏱ 가 한 프레임도 안 줄었다(최솟값)', +D.tmMin.toFixed(4), +D.tm0.toFixed(4));
      is('[D-i] 시퀀스 중 ⏱ 가 안 늘었다(최댓값)', +D.tmMax.toFixed(4), +D.tm0.toFixed(4));
      is('[D-j] 후속 프레임에서 다음 판이 ⏱ 를 0 으로 되돌린다(spawnStage)', D.tmEnd, 0);
      yes('[D-k] 후속 프레임에 보스전 깃발이 풀린다', !D.fight);
    }
  }

  /* ── §R 되돌림 — 홀드를 걷어낸 사본은 §A·§B 의 자로 빨갛다 ── */
  console.log('[R] 되돌림 시험 — 옛 «죽는 프레임에 바로» 거동을 재면 빨간가');
  const rev = path.join(path.dirname(SRC), `.verify475-r1-${process.pid}.html`);
  const FROM = 'if(bossClear.t >= bossClear.die + (bossClear.hold != null ? bossClear.hold : DUN_CLR_HOLD)) bossClearDone();';
  const TO   = 'bossClearDone();';
  if (src.indexOf(FROM) < 0) no('[R] 되돌릴 자리를 못 찾았다 — 시퀀스 홀드 줄이 바뀌었나');
  else {
    fs.writeFileSync(rev, src.replace(FROM, TO));
    const p2 = await ctx.newPage();
    await p2.goto('file://' + rev);
    await p2.waitForTimeout(1200);
    const R = await p2.evaluate(([setup]) => {
      window.requestAnimationFrame = () => 0;
      eval(setup);
      S.stage = 12; S.best = 12;
      spawnStage();
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
      const b = enemies.find((e) => e.tk === 'boss');
      if (!b) return { err: '보스가 안 섰다' };
      const die = bossDieSec(b), stage0 = S.stage;
      killEnemy(b);
      let t = 0, doneAt = -1;
      for (let i = 0; i < 600 && doneAt < 0; i++) { step(1 / 60); t += 1 / 60; if (S.stage !== stage0) doneAt = t; }
      return { die, doneAt };
    }, [SETUP]);
    await p2.close();
    try { fs.unlinkSync(rev); } catch (e) {}
    if (R.err) no('[R] ' + R.err);
    else {
      yes('[R-a] 사본은 한 프레임 만에 다음 스테이지로 넘어간다(= 주인이 본 그림)',
          R.doneAt <= 2 / 60 + 1e-6, R.doneAt.toFixed(3) + 's');
      yes('[R-b] 그래서 §A-f(die + 1초)의 자가 그 사본에서는 빨개진다',
          Math.abs(R.doneAt - (R.die + HOLD)) > TOL,
          '실제 ' + R.doneAt.toFixed(3) + 's vs 기대 ' + (R.die + HOLD).toFixed(3) + 's');
    }
  }

  console.log('[E] 콘솔 에러');
  is('콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach((e) => console.log('       ' + e));

  await browser.close();
  console.log('\nVERIFY475 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})();
