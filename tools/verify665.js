/* 작업 665 게이트 — «스테이지 도전 중 던전·승급전 진입 개방 + 모드 전환 오판정 근절»
 *
 *   node tools/verify665.js
 *
 * 주인 지시(2026-09-02 00:35) 원문: «그냥 그 스테이지 도전하다가 던전, 승급전 도전 가능하게 해주기.
 * 근데 원래 그거 막은 이유가 — 스테이지 보스전하다가 던전 도전하면 갑자기 스테이지 클리어 되고,
 * 승급전 도전중에 던전 도전하면 승급전 클리어 되고 그런 류의 버그가 있었음. 그런거 해결해줘야함».
 *
 * 이 자가 지키는 것 다섯:
 *   [A] **판정 축** — 입장의 자가 `battleLocked()`(= `bossMode()` 파생, 열린 모드는 stage 하나)이고,
 *       승급전의 승리 판정이 **런 소속 깃발**(`promo.down`)이다. 필드 파생(`!enemies.some(promo)`)
 *       이 한 자리도 안 남는다 — 그것이 주인이 말한 오판정의 뿌리다.
 *   [B] **교차 진입 매트릭스 전수** — {스테이지 몹·보스전·등장 국면·격파 시퀀스 · 승급전 · 던전 · 탑}
 *       × {던전 · 승급전 · 탑}. 칸마다 넷을 센다:
 *         ① 진입 순간 이전 모드 «클리어/실패» 오판정 0건(Δstage·Δrank·Δ던전·Δ탑)
 *         ② 새 모드 정상 개시(`bossMode()` 가 목표 모드)
 *         ③ 이전 모드 복귀 상태 온전(스테이지 번호 보존)
 *         ④ 보상 이중 지급 0건(Δ다이아 · 진행도)
 *   [C] **정상 경로는 그대로 산다** — 수호자를 실제로 잡으면 승급하고, 시간 초과면 실패한다.
 *   [D] **격파 시퀀스 창은 잠긴다** — 그 2초 안에 갈아타면 이미 이긴 판이 증발하기 때문이다.
 *   [R] **되돌림 시험** — ⓐ 승급 판정을 옛 «필드 파생» 으로 되돌린 사본은 `promo → 던전` 에서
 *       다시 «승급 성공» 이 난다 · ⓑ `bossClear` 항을 뺀 사본은 «클리어 증발» 이 다시 난다.
 *       이 절이 없으면 «이미 참인 것을 굳힌 게이트»(338 이 잡은 그 모양)와 구별되지 않는다.
 *
 * 재현기는 `tools/probe665.js`(수리 전 표 · «그냥 열어 본» 사본).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 상대 경로로 무는 assets/** 가 통째로 404 다
   (360·367·438·439·453 이 같은 이유로 루트에 둔 선례. .gitignore 에 등재돼 있다). */
const NEG = (n) => path.join(ROOT, `.v665-neg${n}-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* [이전 모드, 새 모드, 기대] — 기대는 'open'(들어가진다) · 'lock'(막힌다) 둘뿐이다. */
const CELLS = [
  ['stageMob', 'dun', 'open'], ['stageMob', 'promo', 'open'], ['stageMob', 'tower', 'open'],
  ['stageBoss', 'dun', 'open'], ['stageBoss', 'promo', 'open'], ['stageBoss', 'tower', 'open'],
  ['stageIntro', 'dun', 'open'], ['stageIntro', 'promo', 'open'],
  ['stageClr', 'dun', 'lock'], ['stageClr', 'promo', 'lock'],
  ['promo', 'dun', 'lock'], ['promo', 'tower', 'lock'],
  ['dun', 'promo', 'lock'], ['dun', 'dun', 'lock'],
  ['tower', 'promo', 'lock'],
];

/* 한 칸을 굴린다. probe665 와 **같은 절차**다(자와 재현기가 갈리면 둘 다 못 믿는다). */
/* eslint-disable no-undef */
const CELL = ([from, to]) => {
  const DT = 1 / 60;
  /* 플레이어를 죽지 않게 고정한다 — 죽으면 `playerDied()` 가 그 모드를 실패로 끝내 «세우기» 가
     랜덤으로 무너진다(probe665 1회차 실측). 판정·보상 경로는 한 줄도 안 건드린다. */
  const tick = (sec) => {
    for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); }
  };
  const dg = DUNGEONS[0], dg2 = DUNGEONS[1];

  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
  S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 99999; S.gold = 99999;
  for (const d of DUNGEONS) S.dunTk[d.id] = 9;
  for (const t of TOWERS) S.dunTk[t.id] = 9;
  arena = null; raidOn = null; promo = null;
  if (dunRun) endDunRun(false, true);
  spawnStage();
  document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));

  const toasts = [];
  const on = notify; notify = (h) => { toasts.push(String(h).replace(/<[^>]*>/g, '')); };
  const op = popup; popup = (t) => { toasts.push('[팝업]' + String(t).replace(/<[^>]*>/g, '')); };

  const enter = (md) => {
    if (md === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
    else if (md === 'dun2') startDunRun(dg2, (S.dun[dg2.id] || 0) + 1);
    else if (md === 'tower') startDunRun(TOWER, towerFloor(TOWER));
    else if (md === 'promo') startPromo();
  };

  let setupOk = true;
  if (from === 'stageMob') tick(0.5);
  else if (from === 'stageIntro') {
    startBoss();
    for (let i = 0; i < 900 && !bossIntro; i++) tick(DT);
    setupOk = !!bossIntro;
  } else if (from === 'stageBoss' || from === 'stageClr') {
    startBoss();
    for (let i = 0; i < 900 && !(enemies.some((e) => e.tk === 'boss') && !bossIntro); i++) tick(DT);
    setupOk = bossMode() === 'stage' && enemies.some((e) => e.tk === 'boss') && !bossIntro;
    if (from === 'stageClr') {
      const b = enemies.find((e) => e.tk === 'boss');
      if (b) killEnemy(b); else setupOk = false;
      setupOk = setupOk && !!bossClear;
    }
  } else if (from === 'promo') { startPromo(); tick(2.0); setupOk = bossMode() === 'promo'; }
  else if (from === 'dun' || from === 'tower') {
    enter(from);
    for (let i = 0; i < 900 && !(dunRun && dunRun.fight); i++) tick(DT);
    setupOk = bossMode() === 'dun' && !!dunRun && dunRun.fight && !dunRun.bossDown;
  }

  const pre = { stage: S.stage, rank: S.rank, dun: { ...S.dun }, tower: S.tower, tower2: S.tower2,
                dia: S.dia, md: bossMode() };
  toasts.length = 0;

  enter(to === 'dun' && from === 'dun' ? 'dun2' : to);
  const entered = bossMode();
  tick(0.2);                        /* 오판정은 전환 직후 몇 프레임에 터진다(창을 넓히면 정상 전투가 섞인다) */
  const post = { stage: S.stage, rank: S.rank, dun: { ...S.dun }, tower: S.tower, tower2: S.tower2,
                 dia: S.dia, md: bossMode() };
  tick(3.0);                        /* 새 모드가 실제로 굴러가는지 */
  const late = bossMode();
  notify = on; popup = op;

  return {
    setupOk, preMd: pre.md, entered, late,
    dStage: post.stage - pre.stage, dRank: post.rank - pre.rank,
    dunUp: Object.keys(post.dun).filter((k) => (post.dun[k] || 0) > (pre.dun[k] || 0)).length,
    dTower: (post.tower - pre.tower) + (post.tower2 - pre.tower2),
    dDia: post.dia - pre.dia,
    toasts: toasts.slice(0, 3),
  };
};
/* eslint-enable no-undef */

async function sweep(page) {
  const out = [];
  for (const [from, to, want] of CELLS) {
    let r;
    try { r = await page.evaluate(CELL, [from, to]); }
    catch (e) { r = { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
    out.push({ from, to, want, r });
  }
  return out;
}

const openPage = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* step() 만이 유일한 시계 */
  return { ctx, page };
};

(async () => {
  /* ── [A] 판정 축 — 소스 단언 ─────────────────────────────────────── */
  blk('[A] 판정 축 — 소스');
  const src = fs.readFileSync(SRC, 'utf8');
  ok(/const\s+battleLocked\s*=\s*\(\)\s*=>\s*\{\s*const md = bossMode\(\);/.test(src),
     'A1 입장의 자 `battleLocked()` 가 `bossMode()` 파생이다(새 전역 0개)');
  ok(/md !== ''\s*&&\s*md !== 'stage'/.test(src),
     "A2 열린 모드는 «stage» 하나다 — 주인이 연 것은 스테이지 도전뿐");
  ok(/\|\|\s*!!bossClear;/.test(src),
     'A3 격파 시퀀스(475) 창은 잠긴다 — 그 안에서 갈아타면 이미 이긴 판이 증발한다');
  console.log('  ℹ  (참고) 등장 국면(bossIntro)은 축에서 뺐다 — 근거는 [B] 의 stageIntro 두 칸이다');
  ok(/rank:r,\s*down:false\s*\}/.test(src),
     'A4 승급전 런에 «잡았다» 깃발(`down`)이 있다(332 규약 — 판정은 런 소속)');
  ok(/promo\.down = true;\s*bossClearStart\('promo'/.test(src),
     'A5 그 깃발은 `killEnemy` 한 곳에서만 선다');
  ok(/if\(promo\.down\) endPromo\(true\);/.test(src),
     'A6 step() 의 승리 판정이 그 깃발을 본다');
  /* ⚑ 이 항이 본체다 — 필드 파생 판정이 한 자리라도 살아 있으면 뿌리가 안 죽은 것이다.
     `killEnemy` 안의 «죽은 뒤 남은 수» 는 깃발을 **세우는** 자리라 판정이 아니다(그 줄은 남는다). */
  const fieldWin = (src.match(/if\(!enemies\.some\([^)]*'promo'\)\)\s*endPromo/g) || []).length;
  ok(fieldWin === 0, "A7 «필드에 수호자가 없으면 승급» 판정이 0건 — 찍힘: " + fieldWin);
  ok(/function leaveStageRun\(\)\{ if\(bossOn\) failBoss\(/.test(src),
     'A8 갈아탈 때 이전 스테이지 보스전을 **명시 종료**한다(458 원칙 — 새 종료 경로를 안 만든다)');
  const leaveN = (src.match(/leaveStageRun\(\);/g) || []).length;
  ok(leaveN >= 4, 'A9 네 입장 함수가 전부 그것을 부른다 — 찍힘: ' + leaveN);

  const browser = await launch(chromium);
  const errs = [];
  const { ctx, page } = await openPage(browser, 'file://' + SRC);
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  /* ── [B] 교차 진입 매트릭스 ──────────────────────────────────────── */
  blk('[B] 교차 진입 매트릭스 — 오판정 0 · 정상 개시 · 상태 온전 · 이중 지급 0');
  const rows = await sweep(page);
  let misN = 0;
  for (const { from, to, want, r } of rows) {
    if (r.__err) { fail++; console.log('  ❌ B «' + from + ' → ' + to + '» 블록 예외: ' + r.__err); continue; }
    ok(r.setupOk === true, 'B0 «' + from + '» 를 실제 진입점으로 세웠다 — 찍힘 모드: ' + JSON.stringify(r.preMd));
    /* ① 오판정 — 전환만으로 진행도·계급·다이아가 움직이면 안 된다.
       ⚠ 격파 시퀀스 칸(stageClr)은 «시퀀스가 살아서 스테이지가 오른다» 가 정상이므로 Δstage 를 뺀다. */
    const mis = (r.dRank !== 0) || (r.dunUp > 0) || (r.dTower !== 0) || (r.dDia !== 0)
      || (from !== 'stageClr' && r.dStage !== 0);
    if (mis) misN++;
    ok(!mis, 'B1 «' + from + ' → ' + to + '» 전환만으로 오판정·이중 지급 0 — Δstage ' + r.dStage
       + ' Δrank ' + r.dRank + ' Δ던전 ' + r.dunUp + ' Δ탑 ' + r.dTower + ' Δ다이아 ' + r.dDia
       + (r.toasts.length ? ' / ' + r.toasts.join(' · ') : ''));
    /* ② 새 모드 정상 개시 / 차단 */
    if (want === 'open') {
      const wantMd = to === 'promo' ? 'promo' : 'dun';
      ok(r.entered === wantMd, 'B2 «' + from + ' → ' + to + '» 가 열린다 — 찍힘: ' + JSON.stringify(r.entered));
    } else {
      ok(r.entered === r.preMd, 'B2 «' + from + ' → ' + to + '» 가 막힌다(이전 모드 유지) — 찍힘: '
         + JSON.stringify(r.preMd) + ' → ' + JSON.stringify(r.entered));
    }
  }
  ok(misN === 0, 'B-합 오판정 칸 0 / ' + rows.length + ' — 찍힘: ' + misN);

  /* ── [C] 정상 경로 — 승급전 승리·실패가 그대로 산다 ───────────────── */
  blk('[C] 정상 경로 — 승급전 승리·실패');
  let c;
  try {
    /* eslint-disable no-undef */
    c = await page.evaluate(() => {
      const DT = 1 / 60;
      const tick = (n) => { for (let i = 0; i < n; i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); } };
      const setup = () => {
        localStorage.clear(); Object.assign(S, DEF());
        S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
        S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 0;
        arena = null; raidOn = null; promo = null; if (dunRun) endDunRun(false, true);
        spawnStage();
        document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));
      };
      /* ① 실제로 잡으면 승급한다 */
      setup(); startPromo(); tick(30);
      const g = enemies.find((e) => e.tk === 'promo');
      if (g) killEnemy(g);
      tick(300);                                   /* 격파 시퀀스(die + 홀드 1초)를 넘긴다 */
      const win = { rank: S.rank, promo: !!promo, md: bossMode() };
      /* ② 시간 초과면 실패한다(계급 그대로).
         ⚠ 수호자를 **못 잡게** 체력을 올려 둔다 — 안 그러면 15초 안에 잡혀서 이 항이 ①의 사본이
         된다(1회차 실측: rank 1). 체력만 만지고 판정·보상 경로는 한 줄도 안 건드린다. */
      setup(); startPromo();
      { const t0 = enemies.find((e) => e.tk === 'promo'); if (t0) { t0.hp = t0.max = 1e15; } }
      tick(Math.ceil(BOSS_SEC / DT) + 120);
      const lose = { rank: S.rank, promo: !!promo };
      /* ③ «필드를 비워도» 승급하지 않는다 — 뿌리 그 자체를 직접 묻는다 */
      setup(); startPromo(); tick(30);
      enemies.length = 0;                          /* 옛 판정이 곧바로 승급시키던 자리 */
      tick(30);
      const empty = { rank: S.rank, promo: !!promo };
      setup();
      return { win, lose, empty };
    });
    /* eslint-enable no-undef */
  } catch (e) { c = { __err: String((e && e.message) || e).slice(0, 200) }; }
  if (c.__err) { fail++; console.log('  ❌ [C] 블록 예외: ' + c.__err); }
  else {
    ok(c.win.rank === 1 && c.win.promo === false, 'C1 수호자를 잡으면 승급한다 — rank ' + c.win.rank);
    ok(c.lose.rank === 0 && c.lose.promo === false, 'C2 시간 초과면 실패한다(계급 그대로) — rank ' + c.lose.rank);
    ok(c.empty.rank === 0, 'C3 ⚑ **필드를 비워도 승급하지 않는다** — rank ' + c.empty.rank + ' (뿌리 그 자체)');
    ok(c.empty.promo === true, 'C4 그때 승급전은 끝나지도 않는다(시계만 계속 간다) — promo ' + c.empty.promo);
  }

  ok(errs.length === 0, 'E-콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await page.close(); await ctx.close();

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────── */
  blk('[R] 되돌림 시험 — 처방을 되돌리면 다시 빨개진다');
  const negRun = async (label, mut, pick) => {
    const f = NEG(label);
    try {
      const neg = mut(src);
      if (neg === src) { fail++; console.log('  ❌ R' + label + ' 치환이 한 곳도 안 걸렸다'); return null; }
      fs.writeFileSync(f, neg);
      const { ctx: c2, page: p2 } = await openPage(browser, 'file://' + f);
      const out = await p2.evaluate(CELL, pick);
      await p2.close(); await c2.close();
      return out;
    } catch (e) { fail++; console.log('  ❌ R' + label + ' 예외: ' + String((e && e.message) || e).slice(0, 160)); return null; }
    finally { try { fs.unlinkSync(f); } catch (_) { /* 이미 없으면 그만 */ } }
  };

  /* R1 — 승급 판정을 옛 «필드 파생» 으로 되돌리고 락을 열면, `promo → 던전` 이 다시 승급시킨다. */
  const r1 = await negRun(1, (t) => t
    .replace('if(promo.down) endPromo(true);', "if(!enemies.some(e => e.tk === 'promo')) endPromo(true);")
    .replace(/if\(battleLocked\(\)\) return;/g, ''), ['promo', 'dun']);
  if (r1) {
    ok(r1.dRank === 1, 'R1 옛 «필드 파생» 판정으로 되돌린 사본은 `promo → 던전` 에서 다시 승급한다 — Δrank ' + r1.dRank);
    ok(r1.dDia > 0, 'R1b 그때 첫 승급 다이아까지 이중 지급된다 — Δ다이아 ' + r1.dDia);
  }
  /* R2 — 깃발은 그대로 두고 **락만** 열면 승급은 안 난다 = 뿌리 수리가 단독으로 유효하다. */
  const r2 = await negRun(2, (t) => t.replace(/if\(battleLocked\(\)\) return;/g, ''), ['promo', 'dun']);
  if (r2) ok(r2.dRank === 0 && r2.entered === 'dun',
    'R2 락만 열고 깃발을 남긴 사본은 **들어가되 승급하지 않는다**(뿌리 수리 단독 유효) — Δrank '
    + r2.dRank + ' · 모드 ' + JSON.stringify(r2.entered));
  /* R3 — `bossClear` 항을 뺀 사본은 격파 시퀀스 창에서 «클리어 증발» 이 다시 난다. */
  const r3 = await negRun(3, (t) => t.replace("|| !!bossClear;", ';'), ['stageClr', 'dun']);
  if (r3) ok(r3.entered === 'dun' && r3.dStage === 0,
    'R3 `bossClear` 항을 뺀 사본은 격파 시퀀스 창에서 클리어가 증발한다 — 모드 '
    + JSON.stringify(r3.entered) + ' · Δstage ' + r3.dStage + ' (수리 후에는 그 창이 잠겨 Δstage +1 로 완주한다)');

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('verify665: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
