/* 작업 457 게이트 — «모든 보스전» 에 425 의 등장 국면 (스테이지 28 · 승급전 · 레이드 46)
 *
 *   node tools/verify457.js   → 마지막 줄이 `VERIFY457 PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-30): «모든 보스전할때는 던전 지금 보스 전 하듯이 보스 카메라 비추고
 * 나한테 카메라 돌아오고 전투시작하고 시간 돌아가는 식으로 해야함. 승급전, 스테이지 보스 전부 걍 모든 보스전».
 *
 * 재는 축(등재문 게이트 (a)~(f) 그대로):
 *   §A 시간   — 3모드 각각 국면 «동안» 그 모드의 시계가 한 프레임도 안 깎이고(스테이지 `bossT` ·
 *               승급전 `promo.t` · 레이드 `raidT`), 국면이 끝난 **다음** 프레임부터 깎인다.
 *               ⚑ 스테이지는 국면 **앞의 스폰 딜레이 1.4초**도 같이 잰다 — 425 가 던전에서 막은
 *                 «때릴 대상이 없는데 시계가 도는» 자리가 28 에는 그대로 남아 있었다(9.33% 유실).
 *   §B 카메라 — 왕복이 모드마다 **한 번**이다(플레이어 → 보스에 붙는다 → 국면 끝 프레임에 이미 복귀).
 *   §C 길이   — 세 모드의 국면 길이가 **던전과 같은 값**이다(모드별 상수 금지 — «던전 하듯이»).
 *   §D 아레나 — 123 은 국면 0프레임 · w 0 · 카메라 108 그대로(상대가 보스가 아니다).
 *   §E 정지   — 국면 동안 좌표·체력이 한 프레임도 안 움직이고 스프라이트 애니메이션만 돈다(425 §Z 이관).
 *   §F HUD    — 국면 동안 `#bossTmN` 이 그 모드의 만시간 표기로 멈춰 있다(28 규격 HUD 3모드 공용).
 *   §G 소스   — 국면을 여는 자리가 넷(던전·스테이지·승급전·레이드)이고 **아레나에는 없다** ·
 *               상수·상태가 모드별로 갈라지지 않았다(`BOSS_INTRO_*` 하나 · `bossIntro` 하나).
 *   §R 되돌림 — 지렛대 둘을 각각 뺀 사본이 빨개진다:
 *               R1 상수 셋 = 0  → 3모드 국면 0프레임 · w 0
 *               R2 스테이지 시계 가드 제거 → 보스가 서는 프레임의 `bossT` 가 이미 샜다
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

/* 페이지 안에서 쓸 공용 하네스 — 문자열로 넣어 §R 사본에도 똑같이 건다.
   ⚑ 상태를 손으로 만들지 않는다(T2 «기능 완성 규칙») — 네 모드 전부 **실제 진입점**으로 들어간다. */
const HARNESS = `
window.__v457 = {
  DT: 1/60,
  tick(){ step(this.DT); if(typeof camUpdate === 'function') camUpdate(this.DT); },
  /* 어느 모드에서 나오든 전장을 같은 «중립» 으로 되돌린다 — 안 되돌리면 다음 모드의 입구가
     battleBusy()(453) 에 막혀 «국면 0회» 가 조용히 초록으로 읽힌다(1회차에 실제로 그랬다). */
  reset(){
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if(dunRun) endDunRun(false, true);
    if(arena) endArena(null);
    if(raidOn) endRaid(false);
    if(promo) promo = null;
    bossIntro = null; bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;
    enemies.length = 0; spawnQ.length = 0; shots.length = 0; nums.length = 0; corpses.length = 0;
    player.x = WORLD.w/2; player.y = WORLD.h/2; player.hp = stat.maxHp; player.dead = 0;
    var c = camClamp(player.x, player.y); cam.x = c.x; cam.y = c.y;
    document.querySelectorAll('.modal.on, .mw.on').forEach(function(el){ el.classList.remove('on'); });
    if(typeof closeModal === 'function') closeModal();
  },
  /* 실제 진입점. 돌려주는 값 = «그 모드가 실제로 섰는가» */
  enter(md){
    this.reset();
    if(md === 'stage'){ startBoss(); return inBossFight(); }
    if(md === 'promo'){ startPromo(); return !!promo; }
    if(md === 'raid'){ startRaid(RAIDS[0]); return !!raidOn; }
    if(md === 'arena'){ startArena(); return !!arena; }
    return false;
  },
  /* 그 모드의 «남은 제한 시간» — 세 모드가 같은 28 규격 HUD 를 쓰지만 시계 변수는 각자다 */
  clock(md){
    if(md === 'stage') return bossT;
    if(md === 'promo') return promo ? promo.t : null;
    if(md === 'raid')  return raidT;
    if(md === 'arena') return arena ? arena.t : null;
    return null;
  },
  boss(md){
    var k = md === 'stage' ? 'boss' : md === 'promo' ? 'promo' : md === 'arena' ? 'arena' : 'boss';
    return enemies.find(function(e){ return e.tk === k && e.hp > 0; }) || null;
  },
  w(){ return typeof bossIntroW === 'function' ? bossIntroW() : 0; },
  on(){ return !!bossIntro; }
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

/* 한 모드를 «입장 → 보스 등장 → 국면 → 전투» 로 굴리며 프레임마다 시계·카메라를 찍는다.
   던전(425)의 RUN 과 같은 모양이다 — 다른 것은 «어느 시계를 보느냐» 하나뿐이고, 그 갈래는
   하네스의 `clock(md)` 한 곳에만 있다(같은 값을 두 곳에 적지 않는다). */
const RUN = ([md]) => {
  const H = window.__v457;
  if (!H.enter(md)) return { err: md + ' 입장 실패' };
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const t0 = H.clock(md);
  let f = 0, fStood = -1, clockAtStood = null, hudAtStood = null;
  let fIntroEnd = -1, clockAtIntroEnd = null, introFrames = 0, fFirstDrop = -1;
  let wMax = 0, wRises = 0, wFalls = 0, wPrev = 0, sawOne = false, wZeroAfterOne = false;
  let camBossMin = Infinity, camPlayMaxIntro = 0, camPlayAtEnd = null, lagMax = 0;
  let frz = null, frzMoveMax = 0, frzHpBoss = 0, frzHpPlayer = 0, frzAnim = 0;
  let clockMinBeforeFight = t0, sawBoss = 0;
  const hud = () => (document.getElementById('bossTmN') || {}).textContent;
  while (f < 60 * 8) {
    const wasIntro = H.on();
    H.tick(); if (typeof drawHud === 'function') drawHud(); f++;
    const c = H.clock(md);
    if (c === null) break;                       /* 모드가 끝났다(실패·클리어) */
    const w = H.w();
    wMax = Math.max(wMax, w);
    if (w > wPrev + 1e-9) wRises++;
    if (w < wPrev - 1e-9) { wFalls++; if (sawOne && w === 0) wZeroAfterOne = true; }
    if (w >= 1 - 1e-9) sawOne = true;
    wPrev = w;
    const b = H.boss(md);
    if (b) sawBoss++;
    if (fStood < 0 && b) { fStood = f; clockAtStood = +c.toFixed(6); hudAtStood = hud(); }
    if (H.on()) {
      introFrames++;
      if (b) { const m = bossIntroMid(b); camBossMin = Math.min(camBossMin, d2(cam, { x: b.x + m.x, y: b.y + m.y })); }
      camPlayMaxIntro = Math.max(camPlayMaxIntro, d2(cam, player));
      /* 425 §Z 이관 — «시계만 멈추고 전투는 돈다» 를 못 하게 하는 자리. 좌표·체력이 한 프레임도
         안 움직이고 그림(프레임 번호)만 돈다. */
      const now = { bx: b ? b.x : null, by: b ? b.y : null, bhp: b ? b.hp : null,
                    px: player.x, py: player.y, php: player.hp,
                    at: b ? b.at : null };
      if (frz) {
        if (now.bx !== null && frz.bx !== null) frzMoveMax = Math.max(frzMoveMax, Math.hypot(now.bx - frz.bx, now.by - frz.by));
        frzMoveMax = Math.max(frzMoveMax, Math.hypot(now.px - frz.px, now.py - frz.py));
        if (now.bhp !== null && frz.bhp !== null && now.bhp !== frz.bhp) frzHpBoss++;
        if (now.php !== frz.php) frzHpPlayer++;
        if (now.at !== null && frz.at !== null && now.at !== frz.at) frzAnim++;
      }
      frz = now;
    } else {
      /* 108 과 같은 자 — 월드 경계 클램프가 걸린 프레임은 «못 따라가는 게 정상» 이라 제외한다 */
      const hw = VW / 2, hh = VH / 2;
      const tx = WORLD.w <= hw * 2 ? WORLD.w / 2 : Math.min(Math.max(player.x, hw), WORLD.w - hw);
      const ty = WORLD.h <= hh * 2 ? WORLD.h / 2 : Math.min(Math.max(player.y, hh), WORLD.h - hh);
      if (tx === player.x && ty === player.y) lagMax = Math.max(lagMax, d2(cam, player));
    }
    if (wasIntro && !H.on() && fIntroEnd < 0) {
      fIntroEnd = f; clockAtIntroEnd = +c.toFixed(6);
      camPlayAtEnd = +d2(cam, player).toFixed(2);
    }
    if (!H.on()) clockMinBeforeFight = Math.min(clockMinBeforeFight, c);
    if (fFirstDrop < 0 && c < t0 - 1e-9) fFirstDrop = f;
    /* 감소가 시작된 뒤 60프레임만 더 본다 — 아레나처럼 «처음부터 흐르는» 모드도 표본이
       충분히 쌓이게 여유를 둔다(1회차에 30 이면 아레나 표본이 32프레임밖에 안 됐다). */
    if (fFirstDrop > 0 && fStood > 0 && f > fFirstDrop + 60) break;
  }
  const out = {
    md, t0, f, fStood, clockAtStood, hudAtStood, sawBoss,
    fIntroEnd, clockAtIntroEnd, introFrames, fFirstDrop,
    camBossMin: camBossMin === Infinity ? null : +camBossMin.toFixed(2),
    camPlayMaxIntro: +camPlayMaxIntro.toFixed(2), camPlayAtEnd, lagMax: +lagMax.toFixed(1),
    wMax: +wMax.toFixed(4), wRises, wFalls, wZeroAfterOne,
    frzMoveMax: +frzMoveMax.toFixed(4), frzHpBoss, frzHpPlayer, frzAnim,
    camKeys: Object.keys(cam).sort().join(','),
  };
  H.reset();
  return out;
};

/* 던전(425) 한 판 — §C «길이가 던전과 같다» 의 대조군. 국면 프레임 수만 센다. */
const RUN_DUN = () => {
  const H = window.__v457;
  H.reset();
  const d = DUNGEONS[0];
  S.dunTk[d.id] = 9;
  challengeDungeon(d);
  if (!dunRun) return { err: '던전 입장 실패' };
  let f = 0, introFrames = 0, wMax = 0;
  while (dunRun && f < 60 * 8) {
    H.tick(); f++;
    if (bossIntro) introFrames++;
    wMax = Math.max(wMax, H.w());
    if (introFrames > 0 && !bossIntro) break;
  }
  const out = { introFrames, wMax: +wMax.toFixed(4) };
  H.reset();
  return out;
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── §G 소스: 여는 자리가 넷 · 아레나에는 없다 · 상수/상태가 하나다 ─────── */
  console.log('[G] 소스 — 국면을 여는 자리 넷 · 아레나 0 · 상수·상태는 모드 공용 하나');
  const CONST_RE = /const BOSS_INTRO_PAN\s*=\s*([\d.]+);[\s\S]{0,400}?const BOSS_INTRO_STAY\s*=\s*([\d.]+);[\s\S]{0,400}?const BOSS_INTRO_BACK\s*=\s*([\d.]+);/;
  const m = src.match(CONST_RE);
  if (!m) no('[G-a] BOSS_INTRO_PAN/STAY/BACK 세 상수를 못 찾았다 — 수리가 사라졌다');
  else ok('[G-a] 공용 상수 셋 = PAN ' + m[1] + 's · STAY ' + m[2] + 's · BACK ' + m[3] + 's (합 ' +
          (+m[1] + +m[2] + +m[3]).toFixed(2) + 's)');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1 ');
  const starts = [...code.matchAll(/bossIntroStart\(\s*'(\w+)'/g)].map((x) => x[1]).sort();
  is('[G-b] 국면을 여는 모드 목록', starts.join(','), 'dun,promo,raid,stage');
  is('[G-c] 아레나(123)는 국면을 안 연다', /bossIntroStart\(\s*'arena'/.test(code), false);
  /* «모드별 상수» 가 다시 생기면 «던전 하듯이» 가 깨진다 — 이름째 금지한다 */
  is('[G-d] 모드별 국면 상수 0개(STAGE_INTRO_*·PROMO_INTRO_*·RAID_INTRO_*)',
     (code.match(/\b(STAGE|PROMO|RAID|DUN)_INTRO_[A-Z]+\b/g) || []).length, 0);
  is('[G-e] 국면 상태는 전역 하나(`let bossIntro`)',
     (code.match(/\blet\s+bossIntro\b/g) || []).length, 1);
  /* 425 가 만든 이름은 «얇은 접근자» 로 남아 던전 계열 게이트 아홉이 그대로 읽는다 */
  is('[G-f] `dunRun.introOn` 이 접근자로 남아 있다(던전 게이트 이관 없이 산다)',
     /introOn:\s*\{[\s\S]{0,200}?get\(\)\{ return !!\(bossIntro/.test(src), true);

  /* §R 사본 둘 — 상대 경로 자산 때문에 반드시 같은 폴더에 둔다(probe350 함정) */
  const revPath = path.join(path.dirname(SRC), '.verify457-zero.html');
  const gatePath = path.join(path.dirname(SRC), '.verify457-nogate.html');
  let revOk = false, gateOk = false;
  if (m) {
    const zeroed = src
      .replace(/const BOSS_INTRO_PAN\s*=\s*[\d.]+;/, 'const BOSS_INTRO_PAN  = 0;')
      .replace(/const BOSS_INTRO_STAY\s*=\s*[\d.]+;/, 'const BOSS_INTRO_STAY = 0;')
      .replace(/const BOSS_INTRO_BACK\s*=\s*[\d.]+;/, 'const BOSS_INTRO_BACK = 0;');
    revOk = /const BOSS_INTRO_PAN  = 0;/.test(zeroed) && /const BOSS_INTRO_STAY = 0;/.test(zeroed) &&
            /const BOSS_INTRO_BACK = 0;/.test(zeroed);
    if (revOk) fs.writeFileSync(revPath, zeroed);
  }
  {
    /* 지렛대 둘째 — «스테이지 시계는 보스가 서고 국면이 끝난 뒤에만 흐른다» 가드를 걷어낸 사본.
       상수(지렛대 첫째)를 그대로 두므로 «국면은 도는데 시계가 새는» 수리 전 상태를 정확히 재현한다. */
    /* ⚑ 475 이관(2026-08-30) — 같은 줄에 «격파 뒤 연출 창»(`!bossClear`) 항이 하나 더 붙었다.
       475 는 보스가 죽는 프레임에 `bossT` 를 0 으로 떨구지 않고 시퀀스 동안 얼리므로, 그 항이 없으면
       이긴 판이 연출 도중 시간 초과로 뒤집힌다. 457 이 재는 것(국면 동안 안 샌다)은 그대로다 —
       사본은 두 항을 **같이** 걷어내 «수리 전» 상태를 만든다. */
    const GATE = "if(bossT > 0 && !promo && !bossIntro && !bossClear && (bossT < BOSS_SEC || enemies.some(e => e.tk === 'boss'))){";
    if (src.indexOf(GATE) >= 0) {
      fs.writeFileSync(gatePath, src.replace(GATE, 'if(bossT > 0 && !promo){'));
      gateOk = true;
    }
  }
  process.on('exit', () => {
    try { fs.unlinkSync(revPath); } catch (e) {}
    try { fs.unlinkSync(gatePath); } catch (e) {}
  });

  /* 425 4회차 — `frameInk` 가 아틀라스 픽셀을 읽는다(bossIntroMid). file:// 는 이 플래그가 없으면
     캔버스가 «교차 출처» 로 오염돼 rect 중심 폴백으로 떨어진다(verify348 선례). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await open(ctx, 'file://' + SRC.replace(/\\/g, '/'));

  const SEC = await cur.ev(() => ({ boss: BOSS_SEC, raid: RAIDS[0].sec, len: bossIntroLen() }));
  if (blk('[전제] 상수', SEC)) { console.log('\nVERIFY457 FAIL'); await browser.close(); process.exit(1); }
  ok('[전제] BOSS_SEC ' + SEC.boss + 's · 레이드 ' + SEC.raid + 's · 국면 ' + SEC.len + 's');
  const introF = Math.round(SEC.len * 60);

  const R = {};
  for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
    const r = await cur.ev(RUN, [md]);
    if (blk('[전제] ' + nm + ' 표본', r)) continue;
    if (r.err) { no('[전제] ' + nm + ' — ' + r.err); continue; }
    R[md] = r;
    ok('[전제] ' + nm + ' 표본 — 보스가 선 프레임 ' + r.fStood + ' · 국면 ' + r.introFrames +
       '프레임 · 감소 시작 ' + r.fFirstDrop);
  }

  /* ═══ §A 시간 ══════════════════════════════════════════════════════════ */
  console.log('\n[A] 시간 — 3모드 전부 «전투 시작» 부터 흐른다(국면·스폰 딜레이 동안 0)');
  for (const [md, nm, full] of [['stage', '28 스테이지 보스', SEC.boss], ['promo', '승급전', SEC.boss],
                                ['raid', '46 레이드', SEC.raid]]) {
    const r = R[md]; if (!r) continue;
    is('[A-a] ' + nm + ' — 보스가 «필드에 선» 프레임의 시계', r.clockAtStood, full);
    is('[A-b] ' + nm + ' — 국면이 끝나는 프레임에도 시계가 그대로(감소는 다음 프레임부터)', r.clockAtIntroEnd, full);
    is('[A-c] ' + nm + ' — 감소 시작이 국면 종료 «다음» 프레임', r.fFirstDrop === r.fIntroEnd + 1, true);
    ge('[A-d] ' + nm + ' — 전투가 실제로 시작됐다(시계가 줄었다)', r.fFirstDrop > 0 ? 1 : 0, 1);
  }
  /* ⚑ 스테이지만 «스폰 딜레이» 가 따로 있다 — 425 가 던전에서 막은 그 유실이 28 에 남아 있었다 */
  if (R.stage) ge('[A-e] 28 — 보스가 서기까지 걸린 프레임(스폰 딜레이 1.4s ≈ 84)', R.stage.fStood, 60);

  /* ═══ §B 카메라 ════════════════════════════════════════════════════════ */
  console.log('\n[B] 카메라 — 모드마다 왕복 한 번(플레이어 → 보스 → 플레이어)');
  for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
    const r = R[md]; if (!r) continue;
    is('[B-a] ' + nm + ' — 가중치 최대 w', r.wMax, 1);
    ge('[B-b] ' + nm + ' — 국면 중 카메라가 플레이어에게서 떨어진 최대(px)', Math.round(r.camPlayMaxIntro), 100);
    le('[B-c] ' + nm + ' — 카메라–보스 «그려지는 스프라이트 중심» 최소 거리(px)', r.camBossMin, 1);
    is('[B-d] ' + nm + ' — w 가 0 → 1 → 0 으로 한 번만 왕복', r.wZeroAfterOne, true);
    le('[B-e] ' + nm + ' — 국면이 끝난 프레임의 카메라–플레이어 거리(px)', r.camPlayAtEnd, 40);
    is('[B-f] ' + nm + ' — 108 규약: cam 필드는 그대로', r.camKeys, 'shake,x,y,z');
  }

  /* ═══ §C 길이 ══════════════════════════════════════════════════════════ */
  console.log('\n[C] 길이 — 세 모드의 국면이 **던전과 같은 값**이다(모드별 상수 금지)');
  const dun = await cur.ev(RUN_DUN);
  if (!blk('[C] 던전 대조군', dun)) {
    if (dun.err) no('[C] ' + dun.err);
    else {
      ok('[C-a] 던전(425) 국면 = ' + dun.introFrames + '프레임 (상수 ' + SEC.len + 's ≈ ' + introF + ')');
      for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
        const r = R[md]; if (!r) continue;
        le('[C-b] ' + nm + ' — 던전과의 국면 프레임 차', Math.abs(r.introFrames - dun.introFrames), 1);
      }
    }
  }

  /* ═══ §D 아레나 제외 ═══════════════════════════════════════════════════ */
  console.log('\n[D] 아레나(123) — 상대가 보스가 아니다: 국면 0회 · 카메라 108 그대로');
  const ar = await cur.ev(RUN, ['arena']);
  if (!blk('[D] 아레나 표본', ar)) {
    if (ar.err) no('[D] ' + ar.err);
    else {
      ge('[D-a] 아레나가 실제로 섰다(상대가 필드에 있는 프레임 수)', ar.sawBoss, 60);
      is('[D-b] 등장 국면 프레임 수', ar.introFrames, 0);
      is('[D-c] 가중치 최대 w', ar.wMax, 0);
      le('[D-d] 카메라–플레이어 최대 거리(px, 클램프 밖)', ar.lagMax, 60);
      ge('[D-e] 아레나 시계는 처음부터 흐른다', ar.fFirstDrop > 0 && ar.fFirstDrop <= 2 ? 1 : 0, 1);
    }
  }

  /* ═══ §E 정지 (425 §Z 이관) ════════════════════════════════════════════ */
  console.log('\n[E] 정지 — 국면 동안 액터는 한 프레임도 안 움직이고, 그림만 돈다');
  for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
    const r = R[md]; if (!r) continue;
    is('[E-a] ' + nm + ' — 국면 중 좌표 이동 최대(px)', r.frzMoveMax, 0);
    is('[E-b] ' + nm + ' — 국면 중 보스 체력이 바뀐 프레임 수', r.frzHpBoss, 0);
    is('[E-c] ' + nm + ' — 국면 중 플레이어 체력이 바뀐 프레임 수', r.frzHpPlayer, 0);
    ge('[E-d] ' + nm + ' — 그래도 스프라이트 애니메이션은 돈다', r.frzAnim, 1);
  }

  /* ═══ §F HUD ═══════════════════════════════════════════════════════════ */
  console.log('\n[F] HUD — 28 규격 시계가 국면 동안 만시간 표기로 멈춰 있다');
  for (const [md, nm, full] of [['stage', '28 스테이지 보스', SEC.boss], ['promo', '승급전', SEC.boss],
                                ['raid', '46 레이드', SEC.raid]]) {
    const r = R[md]; if (!r) continue;
    is('[F] ' + nm + ' — 보스가 선 프레임의 `#bossTmN`', r.hudAtStood, full.toFixed(1));
  }

  /* ═══ §R 되돌림 ════════════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 — 지렛대를 하나씩 뺀 사본이 빨개진다');
  if (!revOk) no('[R1] «상수 0» 사본을 못 만들었다 — 상수 선언 모양이 바뀌었다');
  else {
    const zero = await open(ctx, 'file://' + revPath.replace(/\\/g, '/'));
    for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
      const z = await zero.ev(RUN, [md]);
      if (blk('[R1] ' + nm + ' 사본', z)) continue;
      if (z.err) { no('[R1] ' + nm + ' — ' + z.err); continue; }
      is('[R1-a] 사본 ' + nm + ' — 국면 프레임 수 0(§B·§C 가 빨개진다)', z.introFrames, 0);
      is('[R1-b] 사본 ' + nm + ' — 카메라 왕복 없음(w 최대 0)', z.wMax, 0);
    }
    is('[R1-c] 사본 콘솔·페이지 에러 0건', zero.errs.length, 0);
    await zero.page.close();
  }
  if (!gateOk) no('[R2] «스테이지 시계 가드 제거» 사본을 못 만들었다 — 그 줄 모양이 바뀌었다');
  else {
    const ng = await open(ctx, 'file://' + gatePath.replace(/\\/g, '/'));
    const z = await ng.ev(RUN, ['stage']);
    if (!blk('[R2] 사본 표본', z) && !z.err) {
      /* 가드를 빼면 스폰 딜레이 1.4초가 통째로 샌다 = 보스가 서는 프레임의 시계가 이미 줄어 있다 */
      is('[R2-a] 사본 — 보스가 선 프레임의 시계가 이미 샜다(§A-a 가 빨개진다)',
         z.clockAtStood < SEC.boss - 0.5, true);
      ok('[R2-b] 사본 — 그 값 ' + z.clockAtStood + 's (현재 파일: ' + (R.stage ? R.stage.clockAtStood : '?') + 's)');
      is('[R2-c] 사본 콘솔·페이지 에러 0건', ng.errs.length, 0);
    } else if (z && z.err) no('[R2] 사본 표본 실패 — ' + z.err);
    await ng.page.close();
  }

  /* ═══ §H 콘솔 ══════════════════════════════════════════════════════════ */
  console.log('\n[H] 콘솔 에러');
  is('[H] 콘솔·페이지 에러 0건', cur.errs.length, 0);
  if (cur.errs.length) cur.errs.slice(0, 5).forEach((e) => console.log('       ' + String(e).slice(0, 200)));

  console.log('\nVERIFY457 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
