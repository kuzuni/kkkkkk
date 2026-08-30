/* 작업 425 게이트 — «던전 보스 등장 연출 · 제한 시간은 전투 시작부터»
 *
 *   node tools/verify425.js   → 마지막 줄이 `VERIFY425 PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-30): «던전은 보스 등장하면 등장하고 나서 전투 시작할때부터 시간 흘러야함.
 * 등장할때는 보스 잠깐 비췃다가 플레이어쪽으로 카메라 다시 하고 전투 시작해야함».
 *
 * 재는 축(등재문 (a)~(f) 그대로):
 *   §A 시간   — 보스가 서기 전·등장 국면 동안 `dunRun.t === DUN_SEC`(±0)이고, 국면이 끝난 **다음**
 *               프레임부터 깎인다. 「국면을 만들었다」가 아니라 「그 동안 시간이 안 샌다」를 잰다.
 *   §B 카메라 — 왕복이 **한 번**이다: 플레이어 → 보스(붙는다) → 플레이어(국면이 끝나는 프레임에 이미
 *               돌아와 있다). 「보스 쪽으로 갔다」만 보면 «돌아오지 못하는» 수리도 초록이 된다.
 *   §C 무영향 — 28 스테이지 보스·46 레이드·승급전은 `dunRun` 이 없어 가중치가 언제나 0 이고
 *               카메라–플레이어 거리가 108 그대로다(등재문 (d)).
 *   §D 페이즈 — 257 페이즈 던전의 **2번째** 보스에서는 왕복이 0회다(둘째부터 또 비추면 전투가 끊긴다).
 *   §E HUD    — 국면 동안 `#dunTmN` 이 `DUN_SEC` 그대로 멈춰 보이고, 338 체력바는 만피(574px)다.
 *   §F 전 종  — 던전 8종 + 탑 2종 전부에서 «샌 시간» 이 0 이다(한 종만 보면 표가 낡는다).
 *   §G 이관   — 108 규약: `cam` 필드는 {shake,x,y,z} 그대로이고 `CAM_*` 상수는 `CAM_K` 하나뿐이며
 *               67 의 폐기 식별자는 0건이다(주인 지시가 108 보다 우선하는 이탈은 «팬» 하나로 제한된다).
 *   §R 되돌림 — 상수 셋을 **0 으로 둔 사본**에서는 국면이 아예 안 열려 보스가 선 그 프레임부터
 *               t 가 깎이고 카메라 왕복이 0회다 = §A·§B 가 그 사본에서 빨개진다.
 *   §H 콘솔   — 페이지 에러 0건.
 *
 * LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다. §R 이 그 자리다.
 * LESSONS 161 / verify332 — 게임 루프를 얼리고 step()·camUpdate() 만이 시계다.
 * ⚠ 카메라는 step() 이 아니라 loop() 가 «실시간 dt» 로 부른다(108 주석) — 얼린 뒤에는 손으로 같이 돌린다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const le = (m, got, lim) => (got <= lim ? ok(m + ' = ' + got + ' (≤ ' + lim + ')') : no(m + ' = ' + got + ' — 상한 ' + lim));
const ge = (m, got, lim) => (got >= lim ? ok(m + ' = ' + got + ' (≥ ' + lim + ')') : no(m + ' = ' + got + ' — 하한 ' + lim));

/* 페이지 안에서 쓸 공용 하네스 — 문자열로 넣어 «상수 0» 사본에도 똑같이 건다 */
const HARNESS = `
window.__v425 = {
  DT: 1/60,
  tick(){ step(this.DT); if(typeof camUpdate === 'function') camUpdate(this.DT); },
  /* 실제 진입점으로 들어간다(T2 기능 완성 규칙 — 상태를 손으로 만들지 않는다) */
  enter(id){
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if(dunRun) endDunRun(false, true);
    if(TOWERS.some(x => x.id === id)) challengeTower(id);
    else {
      const d = DUNGEONS.find(x => x.id === id);
      S.dunTk[d.id] = 9;
      for(let k = 0; k < 8; k++){
        const u = DUN_UI[d.id];
        if(u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id]|0, u.pre.f + 1);
        if(!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    return !!dunRun;
  },
  boss(){ return enemies.find(e => e.tk === 'dunboss' && e.hp > 0) || null; },
  w(){ return typeof bossIntroW === 'function' ? bossIntroW() : 0; },
  cleanup(){
    if(dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach(el => el.classList.remove('on'));
    const cl = document.getElementById('dclw'); if(cl) cl.classList.remove('on');
    if(typeof closeModal === 'function') closeModal();
  },
  /* 457 이관 — §C 가 «다른 모드» 를 실제로 세워야 하게 됐다(종전에는 «아무 일도 안 일어난다» 를
     보는 절이라 입장이 막혀도 초록이었다). 모드를 갈아탈 때 전장을 중립으로 되돌린다 —
     안 되돌리면 앞 모드가 남아 battleBusy()(453) 가 다음 입장을 막는다. */
  reset(){
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if(dunRun) endDunRun(false, true);
    if(typeof arena !== 'undefined' && arena) endArena(null);
    if(raidOn) endRaid(false);
    if(promo) promo = null;
    if(typeof bossIntro !== 'undefined') bossIntro = null;
    bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;
    enemies.length = 0; spawnQ.length = 0; shots.length = 0; nums.length = 0; corpses.length = 0;
    player.x = WORLD.w/2; player.y = WORLD.h/2; player.hp = stat.maxHp; player.dead = 0;
    const c = camClamp(player.x, player.y); cam.x = c.x; cam.y = c.y;
    this.cleanup();
  }
};`;

const open = async (ctx, url) => {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.evaluate(HARNESS);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 160) }; }
  };
  return { page, errs, ev };
};
const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

/* 한 던전을 «입장 → 보스 등장 → 국면 → 전투» 로 굴리며 프레임마다 t·카메라를 찍는다 */
const RUN = ([id]) => {
  const H = window.__v425;
  if (!H.enter(id)) return { err: '입장 실패' };
  const t0 = dunRun.t, SEC = DUN_SEC;
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let f = 0, fIn = -1, fFightFirst = -1, tAtIn = null, hudAtIn = null, barAtIn = null;
  let tMinBeforeFight = t0, camBossMin = Infinity, camPlayMaxIntro = 0, wMax = 0;
  let camPlayAtEnd = null, fIntroEnd = -1, introFrames = 0, tAtIntroEnd = null;
  let wRises = 0, wFalls = 0, wPrev = 0, wZeroAfterOne = false, sawOne = false;
  /* 2회차 — 국면 «정지» 축. 비평가 CQ·CR 2인 독립 1순위였다: 시계만 멈추고 전투가 돌면
     «시간이 안 흐르는 창에서 치명타가 들어간다». 좌표·체력이 한 프레임도 안 움직이는지 본다. */
  let frz = null, frzMoveMax = 0, frzHpBoss = 0, frzHpPlayer = 0, frzAnim = 0;
  let bornEnd = null, growMin = 1, popOnCam = 1;
  const bar = () => parseFloat(getComputedStyle(document.getElementById('dunBarF')).width) || 0;
  const hud = () => (document.getElementById('dunTmN') || {}).textContent;
  while (dunRun && f < 60 * 10) {
    const wasIntro = !!dunRun.introOn;
    H.tick(); drawHud(); f++;
    const r = dunRun; if (!r) break;
    const w = H.w();
    wMax = Math.max(wMax, w);
    if (w > wPrev + 1e-9) wRises++;
    if (w < wPrev - 1e-9) { wFalls++; if (sawOne && w === 0) wZeroAfterOne = true; }
    if (w >= 1 - 1e-9) sawOne = true;
    wPrev = w;
    if (fIn < 0 && r.bossIn) { fIn = f; tAtIn = +r.t.toFixed(6); hudAtIn = hud(); barAtIn = +bar().toFixed(1); }
    if (r.introOn) {
      introFrames++;
      const b = H.boss();
      /* 카메라가 맞추는 자리는 발밑 앵커가 아니라 **몸통 중심**(`e.y - e.r`)이다(2회차) */
      /* 3회차 — 비추는 자리는 아틀라스에서 뽑은 «그려지는 스프라이트 중심» 이다(bossIntroMid) */
      if (b) { const m = bossIntroMid(b); camBossMin = Math.min(camBossMin, d2(cam, { x: b.x + m.x, y: b.y + m.y })); }
      camPlayMaxIntro = Math.max(camPlayMaxIntro, d2(cam, player));
      /* ⚑ «그려지는 크기» 축(2회차 비평 CT). `drawEnemy` 는 `born < 0.3` 인 적을 `born/0.3` 배로
         그린다 — 국면이 born 을 세우면 보스가 5.6% 크기로 찍혀 «등장 연출인데 빈 바닥» 이 된다. */
      /* 5회차 — 팝인을 팬의 절반만큼 늦췄다. 「온전한 크기」는 팬이 끝나고 팝인이 도는 만큼 뒤에
         성립한다: (PAN/2 + 0.3) 초 = 0.475s ⇒ 0.55초(33프레임) 뒤부터 본다. */
      if (b) { bornEnd = b.born; if (introFrames > 33) growMin = Math.min(growMin, b.born < 0.3 ? b.born / 0.3 : 1); }
      if (b && !r.fight) { const g = b.born < 0.3 ? b.born/0.3 : 1; if (r.introT >= 0.35) popOnCam = Math.min(popOnCam, g); }
      const now = { bx: b ? b.x : null, by: b ? b.y : null, bhp: b ? b.hp : null,
                    px: player.x, py: player.y, php: player.hp,
                    at: b ? b.at : null, pat: player.at };
      if (frz) {
        if (now.bx !== null && frz.bx !== null) frzMoveMax = Math.max(frzMoveMax, Math.hypot(now.bx - frz.bx, now.by - frz.by));
        frzMoveMax = Math.max(frzMoveMax, Math.hypot(now.px - frz.px, now.py - frz.py));
        if (now.bhp !== null && frz.bhp !== null && now.bhp !== frz.bhp) frzHpBoss++;
        if (now.php !== frz.php) frzHpPlayer++;
        if (now.at !== null && frz.at !== null && now.at !== frz.at) frzAnim++;
      }
      frz = now;
    }
    if (wasIntro && !r.introOn && fIntroEnd < 0) {
      fIntroEnd = f; tAtIntroEnd = +r.t.toFixed(6);
      camPlayAtEnd = +d2(cam, player).toFixed(2);
    }
    if (!r.introOn) tMinBeforeFight = Math.min(tMinBeforeFight, r.t);
    if (fFightFirst < 0 && r.t < t0 - 1e-9) fFightFirst = f;
    if (fFightFirst > 0 && fIn > 0 && f > fFightFirst + 30) break;
  }
  const r = dunRun;
  const out = {
    SEC, t0, f, fIn, tAtIn, hudAtIn, barAtIn,
    fIntroEnd, tAtIntroEnd, introFrames, fFightFirst,
    camBossMin: camBossMin === Infinity ? null : +camBossMin.toFixed(2),
    camPlayMaxIntro: +camPlayMaxIntro.toFixed(2), camPlayAtEnd,
    wMax: +wMax.toFixed(4), wRises, wFalls, wZeroAfterOne,
    frzMoveMax: +frzMoveMax.toFixed(4), frzHpBoss, frzHpPlayer, frzAnim,
    bornEnd: bornEnd === null ? null : +bornEnd.toFixed(3), growMin: +growMin.toFixed(4),
    popOnCam: +popOnCam.toFixed(4),
    tNow: r ? +r.t.toFixed(4) : null, camKeys: Object.keys(cam).sort().join(','),
  };
  H.cleanup();
  return out;
};

/* 페이즈 던전 — 1번째 보스의 국면이 끝난 뒤 그 보스를 죽이고, 2번째 보스 구간의 왕복을 센다 */
const RUN_PHASE2 = ([id]) => {
  const H = window.__v425;
  if (!H.enter(id)) return { err: '입장 실패' };
  if (dunRun.bossMode !== 'phase' || dunRun.bossN < 2) { H.cleanup(); return { skip: true }; }
  let g = 0;
  while (dunRun && !dunRun.bossIn && g++ < 900) H.tick();
  /* ⚠ 국면이 **끝날 때까지** 흘린다 — 국면이 막 열린 프레임의 w 도 0(이징 시작점)이라
     w 로 while 을 돌면 첫 왕복의 꼬리가 아래 표본에 섞인다. */
  let g2 = 0;
  while (dunRun && dunRun.introOn && g2++ < 900) H.tick();
  const before = { up: dunRun.bossUp, killed: dunRun.bossKilled };
  const b1 = enemies.find((e) => e.tk === 'dunboss');
  if (b1) killEnemy(b1);
  let k = 0, w2 = 0, introFrames2 = 0, t0 = dunRun ? dunRun.t : 0, sawSecond = false;
  /* ⚠ 457 1회차 — «샌 시간» 을 **루프가 끝난 뒤** `dunRun.t` 로 재면 그 값이 «런이 그때까지 살아
     있었나» 에 걸린다. 2번째 보스는 145~180프레임에 죽는 판이 흔해서(재현 `dbg` 12/12) 런이 먼저
     사라지면 `dunRun` 이 null 이라 답이 «0초» 로 읽혔다 — 결함이 아니라 **표본이 없어진 것**이다.
     질문은 그대로 두고 재는 법만 고친다: 매 프레임 t 를 보고 «본 것 중 가장 작은 값» 으로 낙차를
     누적한다. 런이 언제 끝나든 그때까지 흐른 시간이 그대로 남는다. */
  let tMin = t0;
  while (dunRun && !dunRun.bossDown && k++ < 900) {
    H.tick();
    if (!dunRun) break;
    tMin = Math.min(tMin, dunRun.t);
    w2 = Math.max(w2, H.w());
    if (dunRun.introOn) introFrames2++;
    if (dunRun.bossUp > before.up && enemies.some((e) => e.tk === 'dunboss')) sawSecond = true;
    if (sawSecond && k > 180) break;
  }
  const out = { w2: +w2.toFixed(4), introFrames2, sawSecond,
                drop: +(t0 - tMin).toFixed(3), frames: k };
  H.cleanup();
  return out;
};

/* 28 스테이지 보스 · 46 레이드 · 승급전 · 123 아레나 — 425 의 국면이 그 모드에서 도는지 본다.
   ⚑ 457 이관: 이 절의 «답» 이 뒤집혔다. 425 때는 넷 다 «국면 0회» 가 정답이었지만(등재문이
   범위를 던전 런으로 못박았다), 457(주인 지시 «모든 보스전»)이 그 제한을 풀어 **아레나만** 0회다. */
const RUN_OTHER = ([mode]) => {
  const H = window.__v425;
  H.reset();
  if (mode === 'boss') { if (typeof startBoss === 'function') startBoss(); }
  /* 46 — `startRaid(r)` 는 «어느 레이드냐» 를 받는다(RAIDS 표의 행). 인자 없이 부르면 그 안에서 죽는다. */
  else if (mode === 'raid') { if (typeof startRaid === 'function' && typeof RAIDS !== 'undefined') startRaid(RAIDS[0]); }
  else if (mode === 'promo') { if (typeof startPromo === 'function') startPromo(); }
  else if (mode === 'arena') { if (typeof startArena === 'function') startArena(); }
  let wMax = 0, lagMax = 0, n = 0, sawBoss = 0, introFrames = 0;
  for (let f = 0; f < 60 * 6; f++) {
    H.tick(); n++;
    const w = H.w();
    wMax = Math.max(wMax, w);
    if (typeof bossIntro !== 'undefined' && bossIntro) introFrames++;
    /* 108 과 같은 자 — 월드 경계 클램프가 걸린 프레임은 «못 따라가는 게 정상» 이라 제외한다.
       ⚑ 국면 프레임은 «카메라가 일부러 플레이어를 떠나는» 창이라 여기서 제외한다(457) —
          국면 밖에서는 108 그대로여야 한다는 질문 자체는 그대로 살아 있다. */
    if (!(typeof bossIntro !== 'undefined' && bossIntro)) {
      const hw = VW / 2, hh = VH / 2;
      const tx = WORLD.w <= hw * 2 ? WORLD.w / 2 : Math.min(Math.max(player.x, hw), WORLD.w - hw);
      const ty = WORLD.h <= hh * 2 ? WORLD.h / 2 : Math.min(Math.max(player.y, hh), WORLD.h - hh);
      if (tx === player.x && ty === player.y) lagMax = Math.max(lagMax, Math.hypot(cam.x - player.x, cam.y - player.y));
    }
    if (enemies.some((e) => e.tk === 'boss' || e.tk === 'raid' || e.tk === 'promo' || e.tk === 'arena')) sawBoss++;
  }
  const out = { wMax: +wMax.toFixed(4), lagMax: +lagMax.toFixed(1), n, sawBoss, introFrames, dun: !!dunRun };
  H.reset();
  return out;
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── 전제: 수리가 소스에 실제로 있다 ─────────────────────────────────── */
  console.log('[전제] 수리가 소스에 있다');
  /* 457 이관 — 상수가 «던전 전용» 에서 «모든 보스전 공용» 으로 승격되며 이름이 갈렸다
     (`DUN_INTRO_*` → `BOSS_INTRO_*`). 425 의 보장은 그대로이고 읽는 이름만 바뀐다. */
  const CONST_RE = /const BOSS_INTRO_PAN\s*=\s*([\d.]+);[\s\S]{0,200}?const BOSS_INTRO_STAY\s*=\s*([\d.]+);[\s\S]{0,200}?const BOSS_INTRO_BACK\s*=\s*([\d.]+);/;
  const m = src.match(CONST_RE);
  if (!m) { no('[전제] BOSS_INTRO_PAN/STAY/BACK 세 상수를 못 찾았다 — 수리가 사라졌다'); }
  else ok('[전제] 상수 셋 = PAN ' + m[1] + 's · STAY ' + m[2] + 's · BACK ' + m[3] + 's (합 ' +
          (+m[1] + +m[2] + +m[3]).toFixed(2) + 's)');
  /* 2회차 — 국면은 `step()` **맨 위**의 배타적 상태 블록으로 옮겼다(액터 정지 + introT 진행 + return).
     그 자리를 소스에서 못박는다: `if(dunRun && dunRun.introOn && !dunRun.bossDown){ … return; }` */
  const EXCL = /if\(bossIntro && !\(dunRun && dunRun\.bossDown\)\)\{[\s\S]{0,2000}?\n    return;\n  \}/;
  is('[전제] 등장 국면이 step() 의 배타적 상태다(액터 정지 + return)', EXCL.test(src), true);
  const excl = (src.match(EXCL) || [''])[0];
  is('[전제] 그 블록이 국면 경과를 굴린다', /bossIntro\.t \+= dt;/.test(excl), true);
  /* 도는 것은 «그림» 뿐이다 — 스프라이트 프레임(stepAnim)과 등장 팝인 시계(born).
     좌표를 옮기거나 피해를 주는 줄이 한 줄이라도 들어오면 이 항이 빨개진다. */
  is('[전제] 그 블록이 그림만 돌린다(좌표·판정 0줄)',
     /stepAnim\(player, dt\);/.test(excl) && /stepAnim\(e, dt\)/.test(excl) &&
     /e\.born \+= dt;/.test(excl) &&
     !/\.x \+=|\.y \+=|hitEnemy|hurtPlayer|\.hp -=/.test(excl), true);
  is('[전제] 전투 깃발이 선 뒤에만 t 가 깎인다', /else if\(dunRun\.fight\)\{\s*\n?\s*dunRun\.t -= dt;/.test(src), true);

  /* §R 용 «상수 0» 사본 — 상대 경로 자산 때문에 반드시 같은 폴더에 둔다(probe350 함정) */
  const revPath = path.join(path.dirname(SRC), '.verify425-zero.html');
  let revOk = false;
  if (m) {
    const zeroed = src
      .replace(/const BOSS_INTRO_PAN\s*=\s*[\d.]+;/, 'const BOSS_INTRO_PAN  = 0;')
      .replace(/const BOSS_INTRO_STAY\s*=\s*[\d.]+;/, 'const BOSS_INTRO_STAY = 0;')
      .replace(/const BOSS_INTRO_BACK\s*=\s*[\d.]+;/, 'const BOSS_INTRO_BACK = 0;');
    revOk = /const BOSS_INTRO_PAN  = 0;/.test(zeroed) && /const BOSS_INTRO_STAY = 0;/.test(zeroed) &&
            /const BOSS_INTRO_BACK = 0;/.test(zeroed);
    if (revOk) fs.writeFileSync(revPath, zeroed);
  }
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  /* 425 4회차 — `frameInk` 가 아틀라스 픽셀을 읽는다. file:// 는 이 플래그가 없으면
     캔버스가 «교차 출처» 로 오염돼 rect 중심 폴백으로 떨어진다(verify348 선례). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await open(ctx, 'file://' + SRC.replace(/\\/g, '/'));

  const DUNS = await cur.ev(() => DUNGEONS.concat(TOWERS)
    .map((d) => ({ id: d.id, n: d.n, bn: dunBossN(d), bm: dunBossMd(d), tw: isTower(d) })));
  if (blk('[전제] 던전 목록', DUNS)) { console.log('\nVERIFY425 FAIL'); await browser.close(); process.exit(1); }
  ok('[전제] 던전·탑 ' + DUNS.length + '종 (' + DUNS.filter((d) => !d.tw).length + ' + 탑 ' + DUNS.filter((d) => d.tw).length + ')');

  /* ═══ §A·§B·§E — 대표 던전 하나를 프레임 단위로 ═══════════════════════ */
  console.log('\n[A] 시간 — 보스가 서기 전·등장 국면 동안 제한 시간이 안 흐른다');
  const g = await cur.ev(RUN, ['gold']);
  let gold = null;
  if (!blk('[A] 표본', g) && !g.err) {
    gold = g;
    is('[A-a] 보스가 «필드에 선» 프레임의 t 가 DUN_SEC 그대로', g.tAtIn, g.SEC);
    is('[A-b] 그때 HUD `#dunTmN` 도 DUN_SEC 표기', g.hudAtIn, g.SEC.toFixed(1));
    ge('[A-c] 등장 국면 프레임 수', g.introFrames, 60);
    is('[A-d] 국면이 끝나는 프레임에도 t 는 DUN_SEC 그대로(감소는 다음 프레임부터)', g.tAtIntroEnd, g.SEC);
    ok('[A-e] t 가 처음 줄어든 프레임 = ' + g.fFightFirst + ' (국면 종료 ' + g.fIntroEnd + ' 의 바로 다음)');
    is('[A-f] 감소 시작이 국면 종료 «다음» 프레임이다', g.fFightFirst === g.fIntroEnd + 1, true);
    ge('[A-g] 전투가 실제로 시작됐다(t 가 줄었다)', +(g.t0 - g.tNow).toFixed(3) > 0 ? 1 : 0, 1);
  } else if (g && g.err) no('[A] 표본 실패 — ' + g.err);

  console.log('\n[B] 카메라 — 왕복 한 번(플레이어 → 보스 → 플레이어), 국면이 끝날 때 이미 돌아와 있다');
  if (gold) {
    is('[B-a] 가중치 최대 w = 1 에 도달(보스에 완전히 붙는다)', gold.wMax, 1);
    ge('[B-b] 국면 중 카메라가 플레이어에게서 떨어진 최대 거리(px)', Math.round(gold.camPlayMaxIntro), 100);
    le('[B-c] 국면 중 카메라–보스 «그려지는 스프라이트 중심» 최소 거리(px) — 실제로 «비춘다»', gold.camBossMin, 1);
    is('[B-d] w 가 0 → 1 → 0 으로 **한 번만** 왕복(내려간 뒤 다시 안 올라간다)', gold.wZeroAfterOne, true);
    le('[B-e] 국면이 끝난 프레임의 카메라–플레이어 거리(px) — 이음매 없이 전투로', gold.camPlayAtEnd, 40);
    is('[B-f] 108 규약 — cam 필드는 그대로', gold.camKeys, 'shake,x,y,z');
  }

  /* ═══ §Z — 국면 «정지» (2회차 · 비평가 CQ·CR 2인 독립 1순위) ═════════════ */
  console.log('\n[Z] 정지 — 국면 동안 액터는 한 프레임도 안 움직이고, 그림만 돈다');
  if (gold) {
    is('[Z-a] 국면 중 보스·플레이어 좌표 이동 최대(px)', gold.frzMoveMax, 0);
    is('[Z-b] 국면 중 보스 체력이 바뀐 프레임 수', gold.frzHpBoss, 0);
    is('[Z-c] 국면 중 플레이어 체력이 바뀐 프레임 수(재생·피격 둘 다 멈춘다)', gold.frzHpPlayer, 0);
    ge('[Z-d] 그래도 스프라이트 애니메이션은 돈다(프레임 번호가 움직인 프레임 수)', gold.frzAnim, 1);
    /* ⚑ 2회차 비평(CS·CT 2인 독립) — 「born 까지 세우면 `drawEnemy` 의 `grow = born/0.3` 이 얼어
       보스가 **6.6% 알파·크기**로 찍힌다 = 등장 연출인데 빈 바닥」. 그려지는 크기를 항으로 세운다. */
    is('[Z-e] 국면 0.4초 뒤부터 보스가 «온전한 크기»로 그려진다(grow = born/0.3 이 1)', gold.growMin, 1);
    ge('[Z-f] 국면이 끝날 때 born 이 팝인 창(0.3s)을 넘겼다 — 전투 시작에 보스가 즉시 유효한 표적',
       gold.bornEnd !== null && gold.bornEnd >= 0.3 ? 1 : 0, 1);
    /* ⚑ 5회차(CY·CZ 2인 독립 1순위) — «등장 커짐» 이 카메라 밖에서 끝나면 안 된다.
       카메라가 도착한 뒤(introT ≥ PAN)에도 팝인이 **아직 돌고 있어야** 한다 = 그때 grow < 1 인 프레임이 있다.
       동시에 팬 도중에 «빈 바닥» 이 되면 안 되므로 [Z-h] 가 그 반대편을 묶는다(2회차 CT 결함 재발 방지). */
    ok('[Z-g] 카메라 도착(0.35s) 시점의 팝인 진행도 = ' + (gold.popOnCam * 100).toFixed(1) + '% (1 이면 카메라 밖에서 끝난 것)');
    is('[Z-g] 그 진행도가 1 미만 — 커짐의 일부가 화면 한가운데서 돈다', gold.popOnCam < 1, true);
    is('[Z-h] 그래도 팬 도착 시점에 보스가 절반 이상 자라 있다(빈 바닥 금지 · 2회차 CT)', gold.popOnCam >= 0.5, true);
  }

  console.log('\n[E] HUD — 국면 동안 시계는 멈춰 보이고 338 체력바는 만피다');
  if (gold) {
    is('[E-a] 보스가 선 프레임의 시계 표기', gold.hudAtIn, gold.SEC.toFixed(1));
    is('[E-b] 그 프레임의 체력바 폭 = 574px(만피 · 338)', gold.barAtIn, 574);
  }

  /* ═══ §F — 던전 8종 + 탑 2종 전수 ════════════════════════════════════ */
  console.log('\n[F] 전 종 — 던전 8 + 탑 2 에서 «샌 시간» 이 0 이다');
  let leak = 0, noIntro = 0, seen = 0;
  for (const d of DUNS) {
    const r = await cur.ev(RUN, [d.id]);
    if (r && r.__err) { no('[F] ' + d.id + ' 평가 실패: ' + r.__err); continue; }
    if (r.err) { no('[F] ' + d.id + ' — ' + r.err); continue; }
    seen++;
    if (r.tAtIn !== r.SEC) { leak++; no('[F] ' + d.id + ' — 보스가 설 때 t ' + r.tAtIn + ' (기대 ' + r.SEC + ')'); }
    if (r.introFrames < 60 || r.wMax < 1) { noIntro++; no('[F] ' + d.id + ' — 국면 ' + r.introFrames + '프레임 · wMax ' + r.wMax); }
  }
  is('[F-a] 표본 던전·탑 수', seen, DUNS.length);
  is('[F-b] 제한 시간이 새는 던전 수', leak, 0);
  is('[F-c] 등장 국면이 안 열리는 던전 수', noIntro, 0);

  /* ═══ §D — 페이즈 2번째 보스 ═════════════════════════════════════════ */
  console.log('\n[D] 페이즈 던전 — 2번째 보스에서는 왕복이 0회다');
  const ph = DUNS.find((d) => d.bm === 'phase' && d.bn >= 2);
  if (!ph) no('[D] 페이즈 던전(bn≥2)이 표에 없다 — 표본을 못 세웠다');
  else {
    const p = await cur.ev(RUN_PHASE2, [ph.id]);
    if (!blk('[D] 표본', p)) {
      if (p.skip) no('[D] ' + ph.id + ' 이 페이즈 던전이 아니다 — 표본 실패');
      else if (p.err) no('[D] ' + p.err);
      else {
        is('[D-a] ' + ph.id + ' 2번째 보스가 실제로 섰다', p.sawSecond, true);
        is('[D-b] 그 구간의 등장 국면 프레임 수', p.introFrames2, 0);
        is('[D-c] 그 구간의 가중치 최대 w', p.w2, 0);
        ge('[D-d] 그 구간에는 제한 시간이 정상적으로 흐른다(초)', +p.drop > 0 ? 1 : 0, 1);
      }
    }
  }

  /* ═══ §C — 다른 모드 (457 이관: «무영향» → «같은 국면, 아레나만 예외») ══════ */
  /* ⚑ 이관을 «항을 눌러» 하지 않았다(LESSONS 328). 425 의 §C 는 «28·46·승급전은 국면이 0회» 를
     물었고 457 이 그 답을 뒤집었다 — 항을 그냥 지우거나 0 → 1 로 고치기만 하면 «457 이 통째로
     사라져도 초록인 게이트» 가 된다. 그래서 **같은 자리에서 새 질문**을 한다:
     ① 세 모드에서 국면이 실제로 돈다(457 이 사라지면 빨개진다) ·
     ② 그래도 **아레나는 0회**다(425 가 지키던 «범위가 있다» 는 성질이 여기로 옮겨 왔다) ·
     ③ 국면 «밖» 에서는 카메라가 108 그대로다(425 가 원래 묻던 것 — 그대로 산다). */
  console.log('\n[C] 다른 모드 — 457 이후 28·46·승급전에도 같은 국면이 돌고, 아레나만 0회다');
  for (const [mode, nm, want] of [['boss', '28 스테이지 보스', 1], ['raid', '46 레이드', 1],
                                  ['promo', '승급전', 1], ['arena', '123 아레나', 0]]) {
    const r = await cur.ev(RUN_OTHER, [mode]);
    if (blk('[C] ' + nm, r)) continue;
    ge('[C] ' + nm + ' — 그 모드가 실제로 섰다(적이 필드에 있는 프레임 수)', r.sawBoss, 30);
    is('[C] ' + nm + ' — 등장 국면 가중치 최대 w', r.wMax, want);
    is('[C] ' + nm + ' — 던전 런이 서지 않는다(모드가 안 섞였다)', r.dun, false);
    le('[C] ' + nm + ' — 국면 «밖» 카메라–플레이어 최대 거리(px, 클램프 밖) — 108 그대로', r.lagMax, 60);
  }

  /* ═══ §G — 108 이관 ══════════════════════════════════════════════════ */
  console.log('\n[G] 108 이관 — 폐기 식별자 0건 · CAM_* 상수는 CAM_K 하나');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1 ');
  const DEAD = [
    ['cam.lx / cam.ly (리드)', /\bcam\s*\.\s*l[xy]\b/g],
    ['cam.bx / cam.by (빈사 편향)', /\bcam\s*\.\s*b[xy]\b/g],
    ['cine 연출 함수', /\bcine\b|\bcineBossIn\b|\bcineBossKill\b|\bcineBusy\b/g],
    ['CINE_* 상수', /\bCINE_[A-Z_]+\b/g],
    ['camTimeScale (슬로모)', /\bcamTimeScale\b/g],
    ['ctx.scale (카메라 줌)', /ctx\s*\.\s*scale\s*\(\s*([A-Za-z_$][\w$]*|1\.\d+)\s*,\s*\1\s*\)/g],
  ];
  for (const [nm, re] of DEAD) is('[G] ' + nm + ' 참조', (code.match(re) || []).length, 0);
  const camConsts = [...code.matchAll(/\bconst\s+(CAM_[A-Z_]*)\s*=/g)].map((x) => x[1]);
  is('[G] CAM_* 상수 목록', camConsts.join(','), 'CAM_K');
  is('[G] cam.z 를 읽는 곳은 있어도 «쓰는» 곳은 없다(줌 부활 금지)', /\bcam\s*\.\s*z\s*=/.test(code), false);

  /* ═══ §R — 되돌림 시험 ═══════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 상수 셋을 0 으로 둔 사본에서는 §A·§B 가 빨개진다');
  if (!revOk) no('[R] «상수 0» 사본을 못 만들었다 — 상수 선언 모양이 바뀌었다');
  else {
    const zero = await open(ctx, 'file://' + revPath.replace(/\\/g, '/'));
    const z = await zero.ev(RUN, ['gold']);
    if (!blk('[R] 사본 표본', z) && !z.err) {
      is('[R-a] 사본 — 등장 국면 프레임 수 0(국면이 아예 안 열린다)', z.introFrames, 0);
      is('[R-b] 사본 — 카메라 왕복 없음(w 최대 0)', z.wMax, 0);
      is('[R-c] 사본 — 보스가 선 그 프레임의 다음 프레임부터 t 가 깎인다',
         z.fFightFirst === z.fIn + 1, true);
      ok('[R-d] 사본 — 보스 등장 ' + z.fIn + '프레임 · 감소 시작 ' + z.fFightFirst + '프레임 (현재 파일: ' +
         (gold ? gold.fIn + ' / ' + gold.fFightFirst : '?') + ')');
      is('[R-e] 그래서 §A-c(국면 ≥ 60프레임)·§B-a(w=1) 가 사본에서 빨갛다',
         z.introFrames < 60 && z.wMax < 1, true);
      is('[R-f] 사본 콘솔·페이지 에러 0건', zero.errs.length, 0);
    } else if (z && z.err) no('[R] 사본 표본 실패 — ' + z.err);
    await zero.page.close();
  }

  /* ═══ §H — 콘솔 ══════════════════════════════════════════════════════ */
  console.log('\n[H] 콘솔 에러');
  is('[H] 콘솔·페이지 에러 0건', cur.errs.length, 0);
  if (cur.errs.length) cur.errs.slice(0, 5).forEach((e) => console.log('       ' + String(e).slice(0, 200)));

  console.log('\nVERIFY425 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
