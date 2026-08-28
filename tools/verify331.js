/* 작업 331 게이트 — «던전 «잡몹 국면» 폐지 — 입장하면 잡몹이 쏟아지는데, 던전은 보스전이어야 함»
 *
 *   node tools/verify331.js   → 마지막 줄이 `VERIFY331 n/n PASS` 여야 한다.
 *
 * 저장소 주인 보고(2026-08-28): «그 던전들에 왜 잡몹들이 존나 나오지. 보스전으로 하라했는데».
 * 255·257 의 **재지시**다 — 255 는 «클리어 판정» 만 보스 격파로 옮겼고 «누적 피해가 눈금에 차면
 * 보스를 부른다» 는 **앞 국면(몹 국면)을 그대로 뒀다**. 그래서 입장 직후엔 여전히 잡몹 50마리가
 * 쏟아졌고(startDunRun 의 queueMobs) 런 내내 리필까지 돌았다.
 *
 * 이 게이트가 보는 것은 «몹 국면이 **실제로** 사라졌는가» 하나다. 재는 축은 네 개:
 *   §A 입장 — 던전 8종 + 탑 2종 전부, 입장 3초 안에 dunboss 가 필드에 선다(등장음 틈만 남는다).
 *   §B 몹 0 — 런 전체(제한 시간)를 돌려도 일반 몹이 **한 마리도** 안 뜬다(스폰 대기열 포함).
 *   §C 상수 — 옛 소환 눈금 DUN_BOSS_P · 시간 폴백 DUN_BOSS_AT 이 **선언째** 없다(되살아남 잠금).
 *   §D 진행바 — 눈금이 «보스 체력» 한 국면이다(앞 0.3 몫이 남으면 보스가 서기 전에 30% 차 있다).
 *   §E 회귀 — `queueMobs()` 자체는 스테이지·failBoss 가 계속 쓴다(던전에서만 안 쓰는 것이다).
 *   §F 자기 검진 — §B 의 «재는 법» 이 몹을 실제로 볼 수 있는지 주입해서 확인한다(가짜 초록 방지).
 *
 * LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다. §F 가 그 자리다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 주석을 지운 «진짜 코드» — 주석에 남은 옛 상수 이름(331 이 이력으로 남긴 것)에 안 속는다 */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(2) + ' (기대 ' + want + ')')
  : no(m + ' = ' + (+got).toFixed(2) + ' — 기대 ' + want + ' (허용 ' + tol + ')'));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);
/* LESSONS 319 — page.evaluate 안에서 터진 예외는 게이트를 **즉사**시켜, 그 뒤 절이 한 번도 안 돈다
   (verify204 가 `bagUse is not defined` 한 줄로 통째로 죽어 §5 후반·§6 이 영영 안 돌던 그 병).
   예외를 잡아 { __err } 로 돌려주고, 부르는 쪽이 **그 절만** 빨갛게 만든다 — 되돌림 시험에서
   상수가 없어져도 «몇 절이 왜 빨간지» 가 그대로 보인다. */
const ev = async (fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 160) }; }
};
const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);


  /* 던전/탑 하나에 **실제 진입점으로** 들어간다(상태를 손으로 세우지 않는다 — T2 기능 완성 규칙).
     잠금은 verify255 의 prep 과 같은 방식으로 푼다(relic2~4 는 앞 단 던전 클리어가 조건). */
  const enter = (id, isTower) => ev(([i, tw]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    if (tw) { challengeTower(i); }
    else {
      const d = DUNGEONS.find((x) => x.id === i);
      S.dunTk[d.id] = 9;
      for (let k = 0; k < 8; k++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    return dunRun ? { need: dunRun.need, t: dunRun.t, bn: dunRun.bossN } : { err: '입장 실패' };
  }, [id, !!isTower]);

  const cleanup = () => ev(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
  });

  const DUNS = await ev(() => DUNGEONS.map((d) => d.id));
  const TOWERS = ['tower', 'despair'];

  /* ═══ §A 입장 — 3초 안에 보스가 선다 ═══════════════════════════════════════ */
  console.log('\n[A] 입장 3초 안에 던전 보스가 필드에 선다 (몹 국면 없이)');
  for (const [id, tw] of [].concat(DUNS.map((d) => [d, false]), TOWERS.map((t) => [t, true]))) {
    const p = await enter(id, tw);
    if (blk(id + ' 입장', p) || p.err) { if (p.err) no(id + ' — ' + p.err); continue; }
    const r = await ev(() => {
      /* «예약» 이 아니라 «필드에 실제로 섰다» 를 잰다 — 스폰 딜레이 동안은 아직 선 것이 아니다(255 bossIn) */
      const q0 = spawnQ.filter((q) => q.t === 'dunboss').length;
      let at = -1;
      for (let k = 0; k < 180 && dunRun; k++) {           /* 3초 = 180틱 */
        step(1 / 60);
        if (at < 0 && enemies.some((e) => e.tk === 'dunboss')) { at = (k + 1) / 60; break; }
      }
      return { q0, at, bossQ: dunRun ? dunRun.bossQ : null };
    });
    if (blk(id + ' §A', r)) { await cleanup(); continue; }
    is(id + ' — 입장 즉시 보스가 «예약» 된다 (queueMobs 자리)', r.q0 > 0, true);
    is(id + ' — bossQ 깃발이 입장에서 이미 서 있다', r.bossQ, true);
    (r.at >= 0 && r.at <= 3)
      ? ok(id + ' — 보스가 필드에 선 시각 ' + r.at.toFixed(2) + 's (≤ 3s)')
      : no(id + ' — 3초 안에 보스가 안 선다 (at=' + r.at + ')');
    /* 남는 유일한 지연은 등장음이 울릴 틈 하나뿐이다 — 그보다 오래 걸리면 국면이 남아 있는 것이다 */
    const dly = await ev(() => DUN_BOSS_DLY);
    (r.at >= 0 && r.at <= dly + 0.1)
      ? ok(id + ' — 그 시각이 스폰 딜레이(' + dly + 's) 이내 = 국면 전환 대기가 없다')
      : no(id + ' — 보스가 스폰 딜레이보다 늦게 섰다 ' + r.at + 's (옛 눈금/폴백 잔존 의심)');
    await cleanup();
  }

  /* ═══ §B 몹 0 — 런 전체를 돌려도 일반 몹이 없다 ══════════════════════════════ */
  console.log('\n[B] 런 전체(제한 시간)를 돌려도 일반 몹 스폰 0마리');
  for (const [id, tw] of [].concat(DUNS.map((d) => [d, false]), TOWERS.map((t) => [t, true]))) {
    const p = await enter(id, tw);
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await ev(() => {
      /* 보스는 죽지 않게 만피로 붙든다 — «런이 일찍 끝나서 몹을 못 봤다» 를 «몹이 없다» 로
         오독하지 않기 위해서다. 제한 시간 전체를 실제로 돌려야 리필 경로가 드러난다. */
      let maxMob = 0, maxQ = 0, ticks = 0;
      for (let k = 0; k < 60 * 20 && dunRun; k++) {
        for (const e of enemies) if (e.tk === 'dunboss') e.hp = e.max;
        step(1 / 60); ticks++;
        /* ⚠ 런이 끝난 **그 틱**은 재지 않는다 — endDunRun 이 `spawnStage()` 로 던전 전
           스테이지를 되살리면서 일반 몹 50마리를 큐에 넣는다. 그것은 던전의 몹이 아니라
           «복귀한 스테이지» 의 몹이고, 여기서 세면 정상 복귀가 이 게이트에 빨간불로 보인다.
           (1차 실측에서 정확히 이것에 걸려 10건이 빨갰다 — 재는 창을 런 안으로 닫는다.) */
        if (!dunRun) break;
        maxMob = Math.max(maxMob, enemies.filter((e) => e.tk !== 'dunboss').length);
        maxQ = Math.max(maxQ, spawnQ.filter((q) => q.t !== 'dunboss').length);
      }
      return { maxMob, maxQ, ticks, ran: !!dunRun };
    });
    if (blk(id + ' §B', r)) { await cleanup(); continue; }
    is(id + ' — 필드에 뜬 일반 몹 최대 수 (' + (r.ticks / 60).toFixed(1) + 's 돌림)', r.maxMob, 0);
    is(id + ' — 스폰 대기열의 일반 몹 최대 수', r.maxQ, 0);
    await cleanup();
  }

  /* ═══ §C 상수 — 옛 눈금·폴백이 선언째 없다 ═════════════════════════════════ */
  console.log('\n[C] 옛 소환 눈금·시간 폴백이 되살아나지 않았다');
  const cst = await ev(() => ({
    p: typeof DUN_BOSS_P === 'undefined' ? null : DUN_BOSS_P,
    at: typeof DUN_BOSS_AT === 'undefined' ? null : DUN_BOSS_AT,
    dly: DUN_BOSS_DLY,
  }));
  blk('§C 상수 읽기', cst);
  is('DUN_BOSS_P(진행률 눈금)가 없다', cst.p, null);
  is('DUN_BOSS_AT(시간 폴백)이 없다', cst.at, null);
  is('DUN_BOSS_DLY(등장음 틈)는 남아 있다', typeof cst.dly === 'number', true);
  /* 주석이 아니라 **코드**에 선언이 없는지 본다 — 331 은 이력을 주석으로 남겼다(LESSONS 295-③) */
  is('코드에 `const DUN_BOSS_P` 선언이 없다', /const\s+DUN_BOSS_P\s*=/.test(CODE), false);
  is('코드에 `const DUN_BOSS_AT` 선언이 없다', /const\s+DUN_BOSS_AT\s*=/.test(CODE), false);
  /* 입장 경로가 몹이 아니라 보스를 예약하는가 — «클래스 이름이 CSS 에도 있는» 함정을 피해
     startDunRun 본문 안에서만 찾는다(LESSONS 295-③). */
  const body = (CODE.split('function startDunRun(')[1] || '').split('\nfunction ')[0];
  is('startDunRun 안에 queueMobs() 호출이 없다', /queueMobs\s*\(/.test(body), false);
  is('startDunRun 안에서 spawnDunBoss() 를 부른다', /spawnDunBoss\s*\(/.test(body), true);

  /* ═══ §D 진행바 — 한 국면(보스 체력) ═══════════════════════════════════════ */
  console.log('\n[D] 진행바 = 보스 체력 한 국면 (앞 국면 0.3 몫 잔재 없음)');
  {
    const p = await enter('gold', false);
    if (p.err) no('gold — ' + p.err);
    else {
      const r = await ev(() => {
        const out = {};
        out.pre = dunRunProg();                       /* 스폰 딜레이 중 — 0 이어야 한다 */
        dunRun.dmg = dunRun.need * 0.30; out.gate = dunRunProg();
        dunRun.dmg = dunRun.need * 5;    out.over = dunRunProg();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
        const b = enemies.find((e) => e.tk === 'dunboss');
        out.full = (b.hp = b.max, dunRunProg());
        b.hp = b.max * 0.5;              out.half = dunRunProg();
        b.hp = 1;                        out.low  = dunRunProg();
        dunRun.bossDown = true;          out.down = dunRunProg();
        return out;
      });
      if (blk('§D 진행바', r)) { await cleanup(); }
      else {
      near('보스 등장 전 = 0 (옛 눈금이면 여기가 이미 0.30 이다)', r.pre, 0, 0.001);
      near('누적 피해 30% 로도 0 (앞 국면 폐지)', r.gate, 0, 0.001);
      near('누적 피해 500% 로도 0', r.over, 0, 0.001);
      near('보스 만피 = 0', r.full, 0, 0.001);
      near('보스 반피 = 0.50 (옛 두 국면이면 0.65)', r.half, 0.5, 0.005);
      (r.low > r.half) ? ok('체력이 줄수록 바가 찬다 (' + r.half.toFixed(2) + ' → ' + r.low.toFixed(2) + ')')
                       : no('체력이 줄어도 바가 안 찬다');
      near('격파 = 1', r.down, 1, 0.001);
      await cleanup(); }
    }
  }

  /* ═══ §E 회귀 — queueMobs 는 던전 밖에서 그대로 산다 ═══════════════════════ */
  console.log('\n[E] 회귀 — 일반 스테이지의 몹 파도는 그대로다 (queueMobs 를 지운 게 아니다)');
  {
    const r = await ev(() => {
      if (dunRun) endDunRun(false, true);
      S.stage = 20; spawnStage();
      for (let k = 0; k < 120; k++) step(1 / 60);
      const mobs = enemies.filter((e) => e.tk !== 'dunboss').length;
      /* 28 failBoss 도 같은 함수로 몹 구간에 되돌린다 — 그 경로가 살아 있는지 소스가 아니라 동작으로 본다 */
      return { mobs, hasFn: typeof queueMobs === 'function' };
    });
    blk('§E 회귀', r);
    is('스테이지에서 일반 몹이 선다', r.mobs > 0, true);
    is('queueMobs 함수는 그대로 있다', r.hasFn, true);
    is('코드에 queueMobs 호출이 남아 있다 (스테이지·failBoss·spawnStage)',
       (CODE.match(/queueMobs\s*\(\)/g) || []).length >= 3, true);
  }

  /* ═══ §F 자기 검진 — §B 의 재는 법이 몹을 실제로 볼 수 있는가 ═══════════════ */
  console.log('\n[F] 자기 검진 — §B 의 «몹 0» 이 «못 보는 것» 이 아님을 주입해서 보인다');
  {
    const p = await enter('gold', false);
    if (p.err) no('gold — ' + p.err);
    else {
      const r = await ev(() => {
        /* 331 이 지운 그 한 줄을 손으로 되살린다 = 옛 거동. §B 와 **똑같은 자로** 잰다. */
        queueMobs();
        let maxMob = 0;
        for (let k = 0; k < 120 && dunRun; k++) {
          for (const e of enemies) if (e.tk === 'dunboss') e.hp = e.max;
          step(1 / 60);
          maxMob = Math.max(maxMob, enemies.filter((e) => e.tk !== 'dunboss').length);
        }
        return { maxMob };
      });
      blk('§F 자기 검진', r);
      (r.maxMob > 0)
        ? ok('되돌림 시험 — queueMobs() 를 손으로 부르면 §B 의 자가 ' + r.maxMob + '마리를 잡아낸다')
        : no('되돌림 시험 실패 — 몹을 넣었는데도 0마리로 읽힌다 (§B 가 가짜 초록이다)');
      await cleanup();
    }
  }

  /* ═══ §G 콘솔 ═════════════════════════════════════════════════════════════ */
  console.log('\n[G] 콘솔 에러');
  is('콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach((e) => console.log('       ' + String(e).slice(0, 200)));

  console.log('\nVERIFY331 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
