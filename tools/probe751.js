/* 작업 751 재현자 — `verify162.js` §6 4항이 왜 빨간지, 그 자리의 «지금 참인 것» 이 무엇인지 잰다.
   실행: node tools/probe751.js   → 마지막 줄이 `PROBE751 n/n PASS` 여야 한다.

   뿌리: 665(주인 지시 2026-09-02 «스테이지 도전하다가 던전·승급전 도전 가능하게»)가
   `battleBusy()` 가드를 `battleLocked()` 로 갈아 **스테이지 보스전 중 입장을 열어 주었다.**
   162 §6 은 453(2026-08-30) 시절의 «막힌다» 를 아직 단언하므로 폐지된 규약을 붙들고 있는 쪽이 자다
   (333·399·728 계열 — 나중 지시가 남의 자를 뒤집는다).

   여기서 재는 것은 «막히나» 가 아니라 **«들어간 뒤 이전 스테이지 런이 어떻게 끝났나»** 다:
     [A] 던전 — 스테이지 보스전 한복판에서 입장이 **열린다**(dunRun 이 선다).
     [B] 던전 — 들어가는 길에 `leaveStageRun()` → `failBoss('모드 전환')` 이 돌아
         이전 런이 **명시 종료**된다(보스 단계 해제 · 클리어 예약 해제 · 시계 0).
     [C] 아레나 — [A]·[B] 와 같은 짝.
     [D] 대조군 — 파밍 대기(S.bossFarm)에서의 입장은 665 전후로 거동이 같다(162 가 원래 잡던 자리).
   판정하지 않고 **찍기만** 한다 — 게이트는 `verify162.js` §6 이 진다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC;
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 상대 경로로 무는 assets/** 가 통째로 404 다
   (360·367·438·439·453·665 선례. .gitignore 에 등재돼 있다). */
const NEG = path.join(ROOT, `.v751-neg-${process.pid}.html`);
const freeze = (p) => p.evaluate(() => { window.requestAnimationFrame = () => 0; });
const show = (o) => JSON.stringify(o);

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

  /* ── [A]·[B] 던전 ─────────────────────────────────────────────── */
  console.log('[A]·[B] 던전 — 스테이지 보스전 한복판에서 입장');
  const dun = await p.evaluate(() => {
    arena = null; raidOn = null; dunRun = null; promo = null;
    S.stage = 20; spawnStage(); killed = 30;
    startBoss();
    const before = { bossOn, bossT: Math.round(bossT * 10) / 10, farm: S.bossFarm, stageWin, locked: battleLocked() };
    startDunRun(DUNGEONS[0], 1);
    const after = { run: !!dunRun, bossOn, bossT: Math.round(bossT * 10) / 10, farm: S.bossFarm,
                    stageWin, stage: S.stage, mode: bossMode() };
    endDunRun(false, true);
    return { before, after };
  }).catch(e => ({ err: String(e) }));
  ok(!dun.err, '[A] 던전 경로가 예외 없이 돈다', dun.err);
  if (!dun.err) {
    console.log('    수리 전 상태:', show(dun.before));
    console.log('    입장 후 상태:', show(dun.after));
    ok(dun.before.bossOn && !dun.before.locked, '[A] (준비) 스테이지 보스전이 섰고 락은 안 걸렸다');
    ok(dun.after.run, '[A] 665 이후 — 보스전 한복판에서도 던전에 **들어간다**');
    ok(!dun.after.bossOn, '[B] 이전 런 명시 종료 — 보스 단계 해제(bossOn false)');
    ok(dun.after.bossT === 0, '[B] 이전 런 명시 종료 — 보스 시계 0');
    ok(!dun.after.stageWin, '[B] 이전 런 명시 종료 — 클리어 예약 해제(stageWin false)');
    ok(dun.after.stage === 20, '[B] 스테이지는 유지된다 (기대 20 · 실제 ' + dun.after.stage + ')');
  }

  /* ── [C] 아레나 ───────────────────────────────────────────────── */
  console.log('[C] 아레나 — 같은 짝');
  const arn = await p.evaluate(() => {
    arena = null; raidOn = null; dunRun = null; promo = null;
    S.stage = 40; spawnStage(); killed = 10;
    startBoss();
    const before = { bossOn, bossT: Math.round(bossT * 10) / 10, locked: battleLocked() };
    startArena();
    const after = { on: !!arena, bossOn, bossT: Math.round(bossT * 10) / 10, farm: S.bossFarm,
                    stageWin, stage: S.stage, mode: bossMode() };
    arena = null; S.stage = 40; spawnStage();
    return { before, after };
  }).catch(e => ({ err: String(e) }));
  ok(!arn.err, '[C] 아레나 경로가 예외 없이 돈다', arn.err);
  if (!arn.err) {
    console.log('    수리 전 상태:', show(arn.before));
    console.log('    입장 후 상태:', show(arn.after));
    ok(arn.before.bossOn && !arn.before.locked, '[C] (준비) 스테이지 보스전이 섰고 락은 안 걸렸다');
    ok(arn.after.on, '[C] 665 이후 — 보스전 한복판에서도 아레나에 **들어간다**');
    ok(!arn.after.bossOn && arn.after.bossT === 0 && !arn.after.stageWin,
       '[C] 이전 런 명시 종료 — 보스 단계·시계·클리어 예약 전부 해제');
  }

  /* ── [D] 대조군 — 파밍 대기에서의 입장 ────────────────────────── */
  console.log('[D] 대조군 — 파밍 대기(S.bossFarm)에서의 입장 (665 전후 거동 동일)');
  const farm = await p.evaluate(() => {
    arena = null; raidOn = null; dunRun = null; promo = null;
    S.stage = 20; spawnStage();
    bossOn = false; stageWin = false; S.bossFarm = true; bossT = 7;
    const before = { bossOn, farm: S.bossFarm, bossT, locked: battleLocked() };
    startDunRun(DUNGEONS[0], 1);
    const after = { run: !!dunRun, bossOn, bossT, farm: S.bossFarm, stage: S.stage };
    endDunRun(false, true);
    return { before, after };
  }).catch(e => ({ err: String(e) }));
  ok(!farm.err, '[D] 파밍 대기 경로가 예외 없이 돈다', farm.err);
  if (!farm.err) {
    console.log('    수리 전 상태:', show(farm.before));
    console.log('    입장 후 상태:', show(farm.after));
    ok(farm.after.run, '[D] 파밍 대기에서 던전에 들어간다');
    ok(!farm.after.bossOn && farm.after.bossT === 0 && !farm.after.farm,
       '[D] 입장이 보스 단계·파밍 깃발을 비운다(162 원래 축)');
  }

  console.log('[E] 콘솔 에러');
  ok(errs.length === 0, '[E] pageerror/console.error 0건', errs.slice(0, 3).join(' | '));

  /* ── §R 되돌림 시험 — 새 단언이 «이미 참인 것을 굳힌 게이트» 가 아님을 못박는다 ──────────
     ⚑ 이 절이 잡아낸 것: «선 보스 단계를 비운다» 를 지키는 기전이 **둘이고 서로 여벌**이다.
       ⓐ `startDunRun`/`startArena` 안의 «162 — 보스 단계 플래그도 함께 비운다» 한 줄
          (`S.bossFarm = false; bossT = 0; bossOn = false; stageWin = false;`)
       ⓑ 665 가 넣은 `leaveStageRun()` → `failBoss('모드 전환')`
     하나만 무력화하면 **다른 하나가 받아 내 초록이 그대로다** — 그래서 한 자리만 되돌리는
     흔한 음성항으로는 이 단언의 값어치를 증명할 수 없다(338 이 잡은 «헛자» 와 구별이 안 된다).
     둘을 **같이** 끄면 비로소 빨개진다 ⇒ 단언이 지키는 것은 «ⓐ 또는 ⓑ 가 산다» 는 논리곱이다.
     던전·아레나는 ⓐ 를 **각자의 사본**으로 갖고 있어(둘 다 같은 한 줄) 자리마다 따로 꺼야 한다. */
  console.log('[R] 되돌림 시험 — ⓐ 플래그 정리 한 줄 + ⓑ leaveStageRun 을 «같이» 무력화');
  const src = fs.readFileSync(SRC, 'utf8');
  const FLAG = 'S.bossFarm = false; bossT = 0; bossOn = false; stageWin = false;';
  /* 실측 — 같은 한 줄이 `startDunRun`·`startRaid`·`startArena` **세 자리**에 사본으로 있다
     (§6 이 셋 다 «입장이 보스 단계를 비운다» 로 잡고 있는 그 자리들이다). */
  const hits = src.split(FLAG).length - 1;
  ok(hits === 3, `[R] (준비) ⓐ 플래그 정리 줄이 던전·레이드·아레나 세 자리에 있다 (기대 3 · 실제 ${hits})`);
  fs.writeFileSync(NEG, src.split(FLAG).join('S.bossFarm = false;'));
  try {
    const np = await ctx.newPage();
    await np.goto('file://' + NEG);
    await np.waitForFunction(() => typeof step === 'function' && typeof startBoss === 'function');
    await np.waitForTimeout(900);
    await np.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await np.waitForTimeout(120);
    const rev = await np.evaluate(() => {
      window.leaveStageRun = function () {};                 /* ⓑ 도 끈다 */
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 20; spawnStage(); killed = 30; startBoss();
      startDunRun(DUNGEONS[0], 1);
      const dun = { run: !!dunRun, bossOn, bossT, stageWin };
      endDunRun(false, true); dunRun = null;
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 40; spawnStage(); killed = 10; startBoss();
      startArena();
      const arn = { on: !!arena, bossOn, bossT, stageWin };
      arena = null;
      return { dun, arn };
    }).catch(e => ({ err: String(e) }));
    ok(!rev.err, '[R] 음성 사본이 예외 없이 돈다', rev.err);
    if (!rev.err) {
      console.log('    음성 사본 던전 입장 후:', show(rev.dun));
      console.log('    음성 사본 아레나 입장 후:', show(rev.arn));
      ok(rev.dun.bossOn || rev.dun.bossT !== 0 || rev.dun.stageWin,
         '[R] 둘 다 끄면 던전 단언이 **빨개진다**(= 헛자가 아니다)', show(rev.dun));
      ok(rev.arn.bossOn || rev.arn.bossT !== 0 || rev.arn.stageWin,
         '[R] 둘 다 끄면 아레나 단언이 **빨개진다**(= 헛자가 아니다)', show(rev.arn));
    }
    await np.close();
  } finally {
    try { fs.unlinkSync(NEG); } catch (e) { /* 남아도 .gitignore 가 받는다 */ }
  }

  await browser.close();
  console.log(`\nPROBE751 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
