/* 작업 284 (구 277ⓑ — 281 이 번호를 옮겼다) 게이트 — «모든 보스전은 다 보스 UI 가 제대로 뜬다 — 해당 HP 바랑 시간 얼마 남았는지»
 *
 *   node tools/verify284.js   → 마지막 줄이 `VERIFY284 n/n PASS` 여야 한다.
 *
 * 저장소 주인 보고(2026-08-27): «스테이지 보스 하다가 승급전으로 넘어갔더니 UI가 스테이지 보스
 * 하던 UI였다. 승급전이나 던전, 쨋든 모든 보스전은 다 보스 UI 제대로 떠야 함».
 *
 * T2 «기능 완성 규칙» — «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작» 이어야 완료다.
 * 그래서 전부 실제 진입점(startBoss / startPromo / startDunRun / startRaid / startArena)을 불러
 * 실제 상태를 만든 뒤, drawHud() 를 한 프레임 돌린 «화면의 실제 DOM» 을 잰다.
 *
 *   §1 소스     «지금 어떤 보스전인가» 가 한 곳(bossMode)에 있고 drawBossHud 가 그것만 본다.
 *   §2 승급전   승급전에 들어가면 ⏱ 타이머 = 승급전 남은 시간 · 체력바 = 승급 수호자 체력.
 *   §3 전환     **이번 보고의 재현** — 스테이지 보스전 도중에 승급전을 시작하면 HUD 가
 *               스테이지 보스 것(bossT · 보스 체력)이 아니라 승급전 것으로 갈린다.
 *   §4 잔존 0   파밍(S.bossFarm) 상태에서 승급전·던전·레이드·아레나에 들어가면
 *               [스테이지 재도전](#bossRt — 포인터가 살아 있는 «버튼» 이다)이 남지 않는다.
 *   §5 던전     던전 런은 자기 HUD(⏱#dunTm · 진행바#dunBar = 보스 국면엔 보스 체력)를 쓰고,
 *               28 규격 HUD 4종은 전부 꺼져 있다. 아레나도 같다.
 *   §6 회귀     레이드(46)·스테이지 보스(28)·평상시(02) 표시가 284 이전과 같다.
 *   §7 음성항   옛 식으로 되돌리면 잡히는가 — «파밍 조건이 !inBossFight() 였다면» / «승급전 분기가 없었다면»
 *               을 같은 상태에서 계산해 보여 «이 게이트가 무엇을 막는지» 를 증명한다.
 *   §8 에러     콘솔·페이지 에러 0건.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const eq = (m, got, want) => ok(got === want, m, `기대 ${want} · 실제 ${got}`);

/* 승급 조건(최고 스테이지 · 전투력)을 넉넉히 넘기는 세이브 — 208 이 쓰는 그것 */
const SAVE = {
  rank: 0, best: 9999, stage: 50, gold: 1e30, dia: 1e12, trainStage: 6,
  lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
};

/* 게임 루프를 얼린다 — 얼리지 않으면 박아 둔 상태를 다음 프레임이 곧바로 되돌린다(161 교훈). */
const freeze = p => p.evaluate(() => { window.requestAnimationFrame = () => 0; });

/* 한 프레임 그린 «화면의 실제 상태». 28 규격 HUD 5종 + 던전/아레나 HUD. */
const HUD = `(() => {
  drawHud();
  const si = document.getElementById('stinfo'), on = id => document.getElementById(id).classList.contains('on');
  const w = id => Math.round(parseFloat(getComputedStyle(document.getElementById(id)).width) || 0);
  return {
    md: bossMode(),
    fight: si.classList.contains('bfight'), farm: si.classList.contains('bfarm'),
    tm: on('bossTm'), hp: on('bossHp'), gv: on('bossGv'), rt: on('bossRt'),
    tmTx: document.getElementById('bossTmN').textContent,
    hpTx: document.getElementById('bossHpN').textContent,
    hpW: w('bossHpF'),
    dunTx: document.getElementById('dunTmN').textContent, dunW: w('dunBarF'),
    dunVis: getComputedStyle(document.getElementById('dunHud')).display
  };
})()`;
const hud = p => p.evaluate(HUD);

/* 전장을 «아무 보스전도 아닌 스테이지 몹 구간» 으로 되돌린다. */
const reset = p => p.evaluate(() => {
  if (promo) promo = null;
  if (dunRun) dunRun = null;
  if (raidOn) raidOn = null;
  if (arena) arena = null;
  $('app').classList.remove('dunrun', 'arn');
  S.stage = 50; spawnStage();
  player.dead = 0; player.hp = stat.maxHp;
});

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  let ctx;
  try {
    ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify(SAVE)]);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => typeof drawHud === 'function' && typeof startPromo === 'function');
    await p.waitForTimeout(1400);
    await freeze(p);

    /* ── §1 소스 ─────────────────────────────────────────────── */
    console.log('\n§1 소스 — 모드 판정이 한 곳에 있다');
    ok(/function\s+bossMode\s*\(/.test(SRC), '§1 bossMode() 가 있다');
    ok(/BOSS_HUD28\s*=\s*\{[^}]*promo\s*:/.test(CODE), '§1 승급전이 28 규격 HUD 모드에 등록돼 있다');
    const body = (CODE.match(/function drawBossHud\(\)\{[\s\S]*?\n\}/) || [''])[0];
    ok(/bossMode\(\)/.test(body), '§1 drawBossHud 가 bossMode() 로만 갈린다');
    ok(!/S\.bossFarm\s*&&\s*!bf/.test(body), '§1 옛 파밍 조건(`S.bossFarm && !bf`)이 안 남아 있다');
    ok(/md\s*===\s*'promo'/.test(body), '§1 drawBossHud 에 승급전 분기가 있다');

    /* ── §2 승급전 ───────────────────────────────────────────── */
    console.log('\n§2 승급전 — ⏱ 남은 시간 + 승급 수호자 체력바');
    const g2 = await p.evaluate(() => {
      startPromo();
      const e = enemies.find(x => x.tk === 'promo');
      if (!e) return null;
      e.max = 1000; e.hp = 250;             /* 25% — 바 폭으로 되읽는다 */
      promo.t = 12.3;
      return { hp: e.hp, max: e.max };
    });
    ok(!!g2, '§2 (준비) 승급 수호자가 실제로 섰다');
    const h2 = await hud(p);
    eq('§2 모드 판정', h2.md, 'promo');
    ok(h2.fight, '§2 28 규격 보스 헤더(.bfight)가 켜진다');
    ok(h2.tm && h2.hp, '§2 ⏱ 타이머·체력바가 둘 다 켜진다');
    eq('§2 ⏱ 가 승급전 남은 시간', h2.tmTx, '12.3');
    ok(h2.hpW === Math.round(671 * 0.25), '§2 체력바가 수호자 체력 25% 폭', `${h2.hpW}px (기대 ${Math.round(671 * 0.25)})`);
    ok(!h2.rt && !h2.farm, '§2 [스테이지 재도전]·재도전 헤더는 안 뜬다');
    ok(!h2.gv, '§2 [포기하기]는 안 뜬다(승급전은 중간에 그만둘 수 없다)');

    /* ── §3 전환 — 주인 보고 재현 ────────────────────────────── */
    console.log('\n§3 전환 — 스테이지 보스전 → 승급전 (주인 보고 재현)');
    await reset(p);
    const g3a = await p.evaluate(() => {
      killed = ENEMY_COUNT; startBoss();
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      if (b) { b.max = 1000; b.hp = 900; }         /* 90% — 승급전이 이 값을 물려받으면 실패다 */
      bossT = 27.7;
      return { bossOn, has: !!b };
    });
    ok(g3a.bossOn && g3a.has, '§3 (준비) 스테이지 보스전이 실제로 진행 중이다');
    const h3a = await hud(p);
    eq('§3 (준비) 스테이지 보스 ⏱', h3a.tmTx, '27.7');
    ok(h3a.hpW === Math.round(671 * 0.9), '§3 (준비) 스테이지 보스 체력바 90%', h3a.hpW + 'px');

    /* ⚑ 734(2026-09-01) — 453 이 갈아 끼웠던 표본을 **다시 뒤집는다.**
       453(주인 지시 2026-08-30 «보스전 … 도중에 … 승급전 팝업못열고 입장도 못하게»)은 이 전환을
       막았고, 이 절은 그 «막힌다» 를 항으로 세운 뒤 §3 의 원래 뜻은 «파밍 대기» 우회로로 쟀다.
       그런데 **665(주인 지시 2026-09-02 «그냥 그 스테이지 도전하다가 던전, 승급전 도전 가능하게
       해주기»)가 그 차단을 정면으로 뒤집었다** — 입장 판정이 `battleBusy()`(지금 전투 중인가)에서
       `battleLocked()`(지금 판을 버리고 갈아탈 수 없는가)로 갈렸고, 스테이지 보스전은 «갈아탈 수
       있는» 쪽이다. 그래서 453 이 세운 두 항이 굳어 빨개졌다(60/62).
       죽은 표본을 붙들지도, 자리를 비우지도 않는다(333 처방) — 방향을 뒤집고 넷으로 나눈다:
         ⓐ 그 전환이 **열린다**(665 가 세운 살아 있는 규칙). 453 의 «막힌다» 를 그냥 지웠으면
            «665 가 통째로 되돌아가도 초록인 자» 가 된다.
         ⓑ 그 전환이 이전 스테이지 런을 **명시 종료**하고 온다(`leaveStageRun` → `failBoss('모드 전환')`).
            **이것이 «stale 값을 물려받지 않는다» 의 뿌리다** — 665 가 그 한 줄을 빼면 ⓒ 가 빨개진다.
         ⓒ §3 의 원래 뜻(«승급전 HUD 가 직전 스테이지 보스의 값을 물려받지 않는다»)을 이제
            **주인이 284 에서 보고한 그 전환 자체**로 잰다(453 의 우회로보다 강하다 — 우회로는
            보스가 이미 죽은 뒤라 «물려받을 값» 이 절반만 남아 있었다).
         ⓓ 453 의 «막힌다» 가 통째로 사라진 것은 아니다 — 입장권·도전 횟수를 이미 치른 모드와
            격파 시퀀스 창은 665 도 잠근 채로 뒀다. 그 살아 있는 절반을 §3-c 가 못박는다. */
    const g3b = await p.evaluate(() => {
      startPromo();                                  /* 665 — 보스전 «도중» 진입이 열렸다 */
      const opened = !!promo;
      const left = { bossOn, bossT, boss: enemies.filter(x => x.tk === 'boss').length };
      const e = enemies.find(x => x.tk === 'promo');
      if (!e) return { opened, made: false, left };
      e.max = 1000; e.hp = 400;                      /* 40% */
      promo.t = 8.8;
      return { opened, made: true, left };
    });
    ok(g3b.opened, '§3+665 보스전 «도중» 승급전 진입이 열린다(주인 지시 2026-09-02 — 453 뒤집음)');
    ok(g3b.made, '§3 (준비) 그 자리에 승급 수호자가 선다');
    eq('§3 스테이지 보스는 전장에서 치워진다', g3b.left.boss, 0);
    ok(g3b.left.bossOn === false && g3b.left.bossT === 0,
      '§3+665 그 전환이 직전 스테이지 런을 명시 종료한다 — bossOn false · bossT 0(stale 의 뿌리)',
      `bossOn=${g3b.left.bossOn} · bossT=${g3b.left.bossT}`);
    const h3b = await hud(p);
    eq('§3 모드가 승급전으로 갈린다', h3b.md, 'promo');
    eq('§3 ⏱ 가 스테이지 보스 시계(27.7)가 아니라 승급전 시계', h3b.tmTx, '8.8');
    ok(h3b.hpW === Math.round(671 * 0.4),
      '§3 체력바가 «직전 스테이지 보스 90%» 가 아니라 수호자 40%', h3b.hpW + 'px');
    ok(!h3b.rt && !h3b.gv, '§3 스테이지 보스전 버튼([포기하기]·[재도전])이 안 남는다');

    /* §3-b — 453 이 §3 대신 쓰던 «보스전 실패 → 파밍 대기 → 승급전» 우회로. 665 이후에도 살아 있는
       경로라 지우지 않고 자기 절로 남긴다(파밍 잔존은 §4 가 모드별로 따로 본다). */
    await reset(p);
    const g3c = await p.evaluate(() => {
      killed = ENEMY_COUNT; startBoss();
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      if (b) { b.max = 1000; b.hp = 900; }
      bossT = 27.7;
      failBoss('시간');                              /* 28 — 시간 초과 → 파밍 대기(전투 중이 아니다) */
      const farmed = !!S.bossFarm && !bossOn;
      startPromo();
      const e = enemies.find(x => x.tk === 'promo');
      if (!e) return { farmed, made: false };
      e.max = 1000; e.hp = 400;
      promo.t = 8.8;
      return { farmed, made: true };
    });
    ok(g3c.farmed, '§3-b (준비) 보스전이 실패로 끝나 파밍 대기로 내려왔다');
    ok(g3c.made, '§3-b 파밍 대기에서도 승급전에 들어갈 수 있다(665 가 안 건드린 경로)');
    const h3c = await hud(p);
    eq('§3-b 모드가 승급전으로 갈린다', h3c.md, 'promo');
    eq('§3-b ⏱ 가 직전 보스 시계(27.7)가 아니라 승급전 시계', h3c.tmTx, '8.8');
    ok(!h3c.rt && !h3c.farm, '§3-b 파밍에서 왔어도 [스테이지 재도전]·재도전 헤더가 안 남는다');

    /* §3-c — 665 가 **안 연** 절반. `battleLocked()` 는 «스테이지가 아닌 모드»(던전·탑·레이드·
       아레나·승급전)와 격파 시퀀스 창을 잠근 채로 둔다. 이 항이 없으면 가드가 통째로 사라져도
       ⓐ 만 보고 초록이 나온다 — 453 이 지키던 «갈아타면 입장권이 조용히 사라진다» 가 그 자리다. */
    await reset(p);
    const g3d = await p.evaluate(() => {
      startDunRun(DUNGEONS[0], 1);
      const inDun = bossMode() === 'dun';
      startPromo();
      return { inDun, blocked: !promo, md: bossMode() };
    });
    ok(g3d.inDun, '§3-c (준비) 던전 런에 들어가 있다');
    ok(g3d.blocked && g3d.md === 'dun',
      '§3-c+665 던전 런 «도중» 승급전 진입은 여전히 막힌다(battleLocked — 453 의 살아 있는 절반)',
      `md=${g3d.md}`);

    /* ── §4 파밍 잔존 0 ──────────────────────────────────────── */
    console.log('\n§4 잔존 0 — 파밍 상태에서 다른 보스전에 들어가도 [스테이지 재도전]이 안 남는다');
    await reset(p);
    await p.evaluate(() => { S.bossFarm = true; bossOn = false; });
    const h4base = await hud(p);
    ok(h4base.rt && h4base.farm, '§4 (준비) 평상시 파밍에서는 [스테이지 재도전]이 뜬다');

    const modes = [
      ['promo', () => { startPromo(); const e = enemies.find(x => x.tk === 'promo'); if (e) e.hp = e.max = 1e30; }],
      ['dun', () => { startDunRun(DUNGEONS[0], 1); }],
      ['raid', () => { startRaid(RAIDS[0]); }],
      ['arena', () => { startArena(); }]
    ];
    for (const [name] of modes) {
      await reset(p);
      const made = await p.evaluate((n) => {
        S.bossFarm = true;
        if (n === 'promo') { startPromo(); const e = enemies.find(x => x.tk === 'promo'); if (e) e.hp = e.max = 1e30; }
        if (n === 'dun') startDunRun(DUNGEONS[0], 1);
        if (n === 'raid') startRaid(RAIDS[0]);
        if (n === 'arena') startArena();
        return bossMode();
      }, name);
      eq(`§4 ${name} 진입이 모드로 잡힌다`, made, name);
      const h = await hud(p);
      ok(!h.rt, `§4 ${name} 중에 [스테이지 재도전]이 안 남는다`);
      ok(!h.farm, `§4 ${name} 중에 재도전 헤더(.bfarm)가 안 남는다`);
    }

    /* ── §5 던전·아레나 ──────────────────────────────────────── */
    console.log('\n§5 던전·아레나 — 자기 HUD(⏱ + 체력/진행바)를 쓰고 28 규격은 전부 꺼진다');
    await reset(p);
    const g5 = await p.evaluate(() => {
      startDunRun(DUNGEONS[0], 1);
      dunRun.t = 9.5;
      /* 보스 국면으로 밀어 넣는다 — 진행바가 «보스 체력 합» 으로 갈리는 구간(257) */
      dunRun.dmg = dunRun.need * 10;
      for (let i = 0; i < 200 && !enemies.some(e => e.tk === 'dunboss'); i++) step(0.05);
      dunRun.t = 9.5;
      const b = enemies.filter(e => e.tk === 'dunboss');
      return { boss: b.length, prog: Math.round(dunRunProg() * 1000) / 1000 };
    });
    ok(g5.boss > 0, '§5 (준비) 던전 보스가 실제로 섰다', '보스 ' + g5.boss + '마리');
    const h5 = await hud(p);
    eq('§5 모드 판정', h5.md, 'dun');
    eq('§5 던전 HUD 가 보인다', h5.dunVis, 'block');
    eq('§5 던전 ⏱ 가 남은 시간을 띄운다', h5.dunTx, '9.5');
    ok(h5.dunW > 0, '§5 던전 진행바(보스 국면 = 보스 체력)가 그려진다', h5.dunW + 'px');
    ok(!h5.tm && !h5.hp && !h5.gv && !h5.rt, '§5 28 규격 HUD 4종은 전부 꺼진다');
    ok(!h5.fight && !h5.farm, '§5 스테이지 헤더 상태도 안 남는다');

    await reset(p);
    await p.evaluate(() => { startArena(); });
    const h5b = await hud(p);
    eq('§5 아레나 모드 판정', h5b.md, 'arena');
    ok(!h5b.tm && !h5b.hp && !h5b.gv && !h5b.rt, '§5 아레나에서도 28 규격 HUD 4종이 전부 꺼진다');

    /* ── §6 회귀 ─────────────────────────────────────────────── */
    console.log('\n§6 회귀 — 레이드·스테이지 보스·평상시는 284 이전과 같다');
    await reset(p);
    const g6 = await p.evaluate(() => {
      startRaid(RAIDS[0]); raidT = 21.5; raidDmg = 0;
      return { sec: raidOn.sec };
    });
    const h6 = await hud(p);
    eq('§6 레이드 모드 판정', h6.md, 'raid');
    ok(h6.fight && h6.tm && h6.hp, '§6 레이드가 28 규격 HUD 를 그대로 쓴다');
    eq('§6 레이드 ⏱ 가 남은 시간', h6.tmTx, '21.5');
    ok(h6.gv, '§6 레이드 [포기하기]는 그대로 뜬다');
    ok(g6.sec > 0, '§6 (준비) 레이드 제한 시간이 있다');

    await reset(p);
    const g6b = await p.evaluate(() => {
      killed = ENEMY_COUNT; startBoss();
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      if (b) { b.max = 1000; b.hp = 500; }
      bossT = 15;
      return { has: !!b };
    });
    ok(g6b.has, '§6 (준비) 스테이지 보스가 섰다');
    const h6b = await hud(p);
    eq('§6 스테이지 보스 모드 판정', h6b.md, 'stage');
    ok(h6b.fight && h6b.tm && h6b.hp && h6b.gv, '§6 스테이지 보스 HUD 4종 그대로');
    eq('§6 스테이지 보스 ⏱', h6b.tmTx, '15.0');
    ok(h6b.hpW === Math.round(671 * 0.5), '§6 스테이지 보스 체력바 50%', h6b.hpW + 'px');

    await reset(p);
    await p.evaluate(() => { S.bossFarm = false; bossOn = false; });
    const h6c = await hud(p);
    eq('§6 평상시 모드 판정', h6c.md, '');
    ok(!h6c.fight && !h6c.farm && !h6c.tm && !h6c.hp && !h6c.gv && !h6c.rt,
      '§6 평상시(02)에는 보스 HUD 가 하나도 안 뜬다');

    /* ── §7 음성항 ───────────────────────────────────────────── */
    console.log('\n§7 음성항 — 옛 식이었다면 어떻게 됐는가');
    const neg = await p.evaluate(() => {
      /* ⓐ 파밍 조건이 옛 식(`S.bossFarm && !bf`)이었다면 — 승급전 위에 [재도전]이 떴다.
         옛 `bf` 는 `inBossFight()` = **스테이지 보스 전용 플래그** 였고 승급전은 그것을 안 켠다.
         그래서 «보스에게 지고 파밍 중 → 승급전» 이면 승급전 화면에 [스테이지 재도전] 버튼이
         남았다(던전·레이드·아레나는 진입 함수가 S.bossFarm 을 비워 이 구멍을 피해 갔다). */
      S.stage = 50; spawnStage();
      S.bossFarm = true; bossOn = false;
      startPromo();
      const pe = enemies.find(x => x.tk === 'promo'); if (pe) pe.hp = pe.max = 1e30;
      const md = bossMode();
      const oldFm = !!(S.bossFarm && !inBossFight());
      const newFm = !!(S.bossFarm && md === '');
      promo = null; enemies.length = 0;
      /* ⓑ 승급전 분기가 없었다면 — 모드가 'stage' 로 읽혀 ⏱ 가 bossT 를 띄웠다.
         ⚑ 734(2026-09-01) — 453 이 «도달할 수 없다» 고 적어 둔 이 항의 원래 표본(«보스전 도중
            승급전»)이 **665 로 다시 도달 가능해졌다.** 손으로 주입한 stale 값 대신 **제품이 실제로
            지나는 경로**로 잰다(453 은 진입이 막혀 있어 그럴 수 없었다):
              ① 보스전 도중 진입이 **열린다** — 665 의 살아 있는 규칙(453 의 «막힌다» 를 뒤집은 자리).
              ② 그 전환에서 `leaveStageRun()` 이 런을 끝내 `bossT` 가 **0 으로 비워진다**
                 = stale 보스 시계가 승급전 화면까지 따라올 값 자체가 없다.
              ③ «옛 식 vs 새 식» 은 그 상태에서 그대로 물을 수 있다 — 옛 식은 `bossT`(주입 없이도
                 옛 코드가 읽었을 27.7 을 여기서 되살려 비교한다), 새 식은 `promo.t` 를 읽는다. */
      S.stage = 50; spawnStage(); killed = ENEMY_COUNT; startBoss(); bossT = 27.7;
      startPromo();                               /* 665 — 보스전 도중 진입이 열렸다 */
      const openedInBoss = !!promo;
      const bossTAfterSwap = bossT;               /* 0 이어야 한다 — 전환이 런을 끝내고 온다 */
      const e = enemies.find(x => x.tk === 'promo'); if (e) e.hp = e.max = 1e30;
      /* ⚠ 278 처방 — 진입이 막힌 사본(453 되돌림)에서는 `promo` 가 null 이다. 그대로 `promo.t` 를
         쓰면 자가 **예외로 즉사**해 §7 뒤쪽과 §8 이 통째로 안 돈다(319 가 고친 그 모양). 이 절만
         빨개지게 두고 계속 간다. */
      if (promo) promo.t = 8.8;
      bossT = 27.7;                               /* ③ 옛 식이 읽었을 stale 값을 되살려 대조 */
      const oldTm = Math.max(0, bossT).toFixed(1), newTm = promo ? Math.max(0, promo.t).toFixed(1) : '—';
      promo = null; enemies.length = 0; bossT = 0;
      return { oldFm, newFm, oldTm, newTm, openedInBoss, bossTAfterSwap };
    });
    ok(neg.openedInBoss, '§7+665 보스전 도중 승급전 진입이 열린다(453 뒤집음 · 주인 지시 2026-09-02)');
    ok(neg.bossTAfterSwap === 0,
      '§7+665 그 전환 직후 `bossT` 가 0 — stale 보스 시계가 승급전까지 따라올 값이 없다',
      String(neg.bossTAfterSwap));
    ok(neg.oldFm && !neg.newFm,
      '§7 ⓐ 옛 파밍 조건이면 승급전 위에 [재도전]이 떴다 (옛 true → 새 false)');
    ok(neg.oldTm === '27.7' && neg.newTm === '8.8',
      '§7 ⓑ 승급전 분기가 없었다면 ⏱ 가 직전 스테이지 보스 시계를 띄웠다 (27.7 → 8.8)');

    /* ── §8 에러 ─────────────────────────────────────────────── */
    console.log('\n§8 콘솔 에러');
    ok(errs.length === 0, '§8 pageerror/console.error 0건', errs.slice(0, 3).join(' | '));
  } catch (e) {
    fail++; console.log('  FAIL 예외 — ' + e.message);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
    await browser.close();
  }
  console.log(`\nVERIFY284 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
