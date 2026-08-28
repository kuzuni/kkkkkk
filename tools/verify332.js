/* 작업 332 게이트 — «보스 격파 시퀀스: 보스 터짐 → «클리어» 표시 → 1초 뒤 완료 화면»
 *
 *   node tools/verify332.js   → 마지막 줄이 `VERIFY332 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-28): «보스 죽이면 보스 터지고 나서 클리어 라고 뜨고 1초 뒤에 완료 화면 뜨게 해야함».
 * 255 까지는 `killEnemy` 가 `bossDown` 을 세운 **그 다음 틱에** `endDunRun(true) → openDunClear` 가 돌아
 * 완료 화면이 사망 연출을 통째로 덮었다 — 보스가 터지는 것을 볼 수 없었다.
 *
 * 재는 축:
 *   §A 길이   — 격파부터 완료 화면까지 **≥ die 애니 + 1초**. 「연출을 넣었다」가 아니라 「실제로 그만큼 걸린다」.
 *   §B 표시   — 그 사이에 «클리어» 가 실제로 화면 문구로 뜨고, 그 시각이 **터진 뒤**(die 애니 이후)다.
 *   §C 길이원 — die 애니 길이를 손으로 적은 사본이 아니라 **아틀라스에서** 잰다(LESSONS 90-①).
 *   §D 포기   — 시퀀스 도중 나가면 잔존 0: 런·완료 화면·상태가 남지 않고, 이후 아무 틱에도 안 뜬다.
 *   §E 경합   — 시퀀스 중에는 제한 시간이 안 흐른다(연출 도중 «시간 초과 실패» 로 뒤집히지 않는다).
 *   §F 페이즈 — 257 페이즈 던전은 **마지막 보스**에만 시퀀스가 붙는다(중간 격파는 그대로).
 *   §G 결과   — 시퀀스가 끝나면 완료 화면(31)이 실제로 뜨고 층·보상이 들어온다.
 *   §H 자기검진 — §A 의 자가 «옛 거동(다음 틱 종료)» 을 빨갛게 볼 수 있는지 주입해서 보인다.
 *
 * LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다. §H 가 그 자리다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(3) + ' (기대 ' + (+want).toFixed(3) + ')')
  : no(m + ' = ' + (+got).toFixed(3) + ' — 기대 ' + (+want).toFixed(3) + ' (허용 ' + tol + ')'));

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

  /* ⚠ 게임 루프를 얼린다(LESSONS 161 · verify285 와 같은 처방). 이 게이트는 «격파부터 완료 화면까지
     몇 초» 를 **틱 단위로** 재는데, 얼리지 않으면 evaluate 왕복 사이에 rAF 루프가 제 마음대로 틱을
     더 흘려 시퀀스가 1~2틱 먼저 끝난 것처럼 보인다(1차 실측에서 정확히 그렇게 빨갰다).
     얼린 뒤로는 아래 step() 호출만이 유일한 시계다 = 재현 가능한 측정. */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 실제 진입점으로 들어가 **보스가 필드에 선 상태**까지 세운다(T2 기능 완성 규칙 — 상태를 손으로 안 만든다) */
  const enter = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.find((x) => x.id === i);
    S.dunTk[d.id] = 9;
    for (let k = 0; k < 8; k++) {
      const u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    challengeDungeon(d);
    if (!dunRun) return { err: '입장 실패' };
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    step(1 / 60);
    return { clrDie: dunRun.clrDie, hold: DUN_CLR_HOLD, bn: dunRun.bossN,
             mode: dunRun.bossMode, f: S.dun[i], up: enemies.filter((e) => e.tk === 'dunboss').length };
  }, [id]);

  /* 남은 보스를 전부 잡아 «마지막 격파» 까지 간다. 반환은 그 직후(아직 아무 틱도 안 흐른) 상태. */
  const killAll = () => ev(() => {
    let guard = 0;
    while (dunRun && !dunRun.bossDown && guard++ < 400) {
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (b) { killEnemy(b); continue; }
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
    }
    return { down: !!(dunRun && dunRun.bossDown), clrT: dunRun ? dunRun.clrT : null };
  });

  const cleanup = () => ev(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    /* 31 클리어 화면(#dclw)은 .modal/.mw 가 아니라 제 클래스로 뜬다 — 여기서 안 걷으면
       앞 절이 띄운 화면이 다음 절의 «완료 화면이 떴나» 를 통째로 거짓 초록으로 만든다. */
    const cl = document.getElementById('dclw'); if (cl) cl.classList.remove('on');
    if (typeof closeModal === 'function') closeModal();
  });

  const DUNS = await ev(() => DUNGEONS.map((d) => d.id));

  /* ═══ §A·§B 길이와 표시 — 던전 8종 전부 ═══════════════════════════════════ */
  console.log('\n[A·B] 격파 → «클리어» → 1초 → 완료 화면 (던전 8종)');
  for (const id of DUNS) {
    const p = await enter(id);
    if (blk(id + ' 입장', p) || p.err) { if (p.err) no(id + ' — ' + p.err); await cleanup(); continue; }
    const k = await killAll();
    if (blk(id + ' 격파', k) || !k.down) { if (!k.__err) no(id + ' — 마지막 격파에 도달 못 함'); await cleanup(); continue; }
    const r = await ev(() => {
      /* 한 틱씩 흘리며 «클리어» 가 뜬 시각과 런이 끝난 시각을 **같은 시계**로 잰다 */
      let msgAt = -1, endAt = -1;
      for (let k = 0; k < 60 * 8; k++) {
        step(1 / 60);
        const t = (k + 1) / 60;
        if (msgAt < 0 && msgTxt === DUN_CLR_TXT) msgAt = t;
        if (!dunRun) { endAt = t; break; }
      }
      return { msgAt, endAt,
               clw: document.getElementById('dclw').classList.contains('on') };
    });
    if (blk(id + ' §A·B', r)) { await cleanup(); continue; }
    const want = p.clrDie + p.hold;
    /* ①「연출을 넣었다」가 아니라 「그만큼 실제로 걸린다」 — 한 틱(1/60) 오차만 허용한다 */
    near(id + ' — 격파 → 완료 화면 (초)', r.endAt, want, 2 / 60 + 1e-6);
    (r.endAt >= want - 1e-9)
      ? ok(id + ' — die 애니(' + p.clrDie.toFixed(2) + 's) + 1초 이상 걸렸다')
      : no(id + ' — 시퀀스가 짧다 ' + r.endAt.toFixed(3) + 's < ' + want.toFixed(3) + 's');
    /* ② «클리어» 가 실제로 떴고, 그 시각이 **보스가 터진 뒤**다 */
    (r.msgAt > 0) ? ok(id + ' — «클리어» 표시가 떴다 (' + r.msgAt.toFixed(2) + 's)')
                  : no(id + ' — «클리어» 표시가 안 뜬다');
    near(id + ' — «클리어» 시각 = die 애니 직후', r.msgAt, p.clrDie, 2 / 60 + 1e-6);
    /* ③ «클리어» 와 완료 화면 사이가 주인이 말한 1초다 */
    near(id + ' — «클리어» → 완료 화면 = 1초', r.endAt - r.msgAt, p.hold, 2 / 60 + 1e-6);
    is(id + ' — 완료 화면(31)이 떠 있다', r.clw, true);
    await cleanup();
  }

  /* ═══ §C 길이의 출처 — 아틀라스에서 잰 값인가 ═════════════════════════════ */
  console.log('\n[C] die 애니 길이는 아틀라스에서 잰다 (손으로 적은 사본이 아니다)');
  {
    const r = await ev(() => {
      const out = [];
      for (const d of DUNGEONS) {
        const u = DUN_UI[d.id] || DUN_UI.gold;
        const A = ATLAS[u.thk], nm = dunBossAnims(u).die;
        const n = (A && A.a && A.a[nm] && A.a[nm].length) || 0;
        out.push({ id: d.id, anim: nm, frames: n, got: dunBossDieSec(d),
                   want: Math.min(Math.max(n / CORPSE_FPS, 0.3), CORPSE_LIFE) });
      }
      return { out, fps: CORPSE_FPS, life: CORPSE_LIFE };
    });
    if (!blk('§C', r)) {
    is('시체 재생 fps 상수가 있다', r.fps, 10);
    is('시체 수명 상수가 있다', r.life, 1.6);
    for (const e of r.out)
      near(e.id + ' — dunBossDieSec = ' + e.anim + ' ' + e.frames + '프레임 ÷ ' + r.fps + 'fps',
           e.got, e.want, 1e-9);
    /* 상한이 시체 수명이다 — 그보다 길게 기다리면 «이미 사라진 시체» 를 기다리는 것이다 */
    is('전부 시체 수명(1.6s) 이하', r.out.every((e) => e.got <= r.life + 1e-9), true);
    is('전부 하한 0.3s 이상 (die 애니가 없는 아틀라스도 터지는 틈이 있다)',
       r.out.every((e) => e.got >= 0.3 - 1e-9), true); }
  }

  /* ═══ §D 포기 — 시퀀스 도중 나가면 잔존 0 ═════════════════════════════════ */
  console.log('\n[D] 포기 — 시퀀스 도중 나가면 잔존 0 (타이머 체인이 아니라 상태다)');
  {
    const p = await enter('gold');
    if (p.err) no('gold — ' + p.err);
    else {
      await killAll();
      const r = await ev(() => {
        step(1 / 60); step(1 / 60);                    /* 시퀀스 한복판 */
        const mid = { run: !!dunRun, clrT: dunRun ? dunRun.clrT : null };
        /* ◀ 나가기 = endDunRun(false, true) — 123 아레나와 공용인 그 경로 그대로 */
        document.getElementById('dunOut').click();
        const after = { run: !!dunRun,
                        cls: document.getElementById('app').classList.contains('dunrun'),
                        clw: document.getElementById('dclw').classList.contains('on') };
        /* 잔존 확인 — 넉넉히 돌려도 완료 화면이 뒤늦게 튀어나오면 안 된다(타이머 체인이면 여기서 뜬다) */
        let late = false;
        for (let k = 0; k < 60 * 5; k++) {
          step(1 / 60);
          if (document.getElementById('dclw').classList.contains('on')) { late = true; break; }
        }
        return { mid, after, late, f: S.dun.gold };
      });
      if (!blk('§D 포기', r)) {
      is('시퀀스 중이었다 (clrT > 0)', r.mid.clrT > 0, true);
      is('나가면 런이 즉시 없어진다', r.after.run, false);
      is('나가면 .dunrun 이 즉시 풀린다', r.after.cls, false);
      is('나간 순간 완료 화면이 안 뜬다', r.after.clw, false);
      is('5초를 더 돌려도 완료 화면이 뒤늦게 안 뜬다 (잔존 0)', r.late, false);
      is('포기했으므로 층이 안 오른다', r.f, p.f); }
      await cleanup();
    }
  }

  /* ═══ §E 경합 — 시퀀스 중에는 제한 시간이 안 흐른다 ═══════════════════════ */
  console.log('\n[E] 경합 — 연출 도중 «시간 초과 실패» 로 뒤집히지 않는다');
  {
    const p = await enter('gold');
    if (p.err) no('gold — ' + p.err);
    else {
      const r = await ev(() => {
        /* 남은 시간을 «한 틱이면 0» 으로 몰아 놓고 격파한다 — 옛 구조(타이머 체인)라면
           연출이 흐르는 동안 t 가 0 을 지나 실패 통보가 먼저 터진다. */
        dunRun.t = 0.005;
        let msg = '';
        const on = notify; notify = function (m) { msg = String(m); return on.apply(this, arguments); };
        let guard = 0;
        while (dunRun && !dunRun.bossDown && guard++ < 400) {
          const b = enemies.find((e) => e.tk === 'dunboss');
          if (b) { killEnemy(b); continue; }
          dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
        }
        const t0 = dunRun ? dunRun.t : null;
        for (let k = 0; k < 60 * 8 && dunRun; k++) step(1 / 60);
        notify = on;
        return { t0, msg, f: S.dun.gold,
                 clw: document.getElementById('dclw').classList.contains('on') };
      });
      if (!blk('§E 경합', r)) {
      near('격파 시점의 남은 시간 (0 직전)', r.t0, 0.005, 1e-9);
      is('시퀀스가 시간 초과로 안 뒤집힌다 — 완료 화면이 떴다', r.clw, true);
      is('실패 통보(💀)가 안 뜬다', /💀/.test(r.msg), false);
      is('층이 올랐다 (클리어로 끝났다)', r.f, p.f + 1); }
      await cleanup();
    }
  }

  /* ═══ §F 페이즈 — 마지막 보스에만 붙는다 ═════════════════════════════════ */
  console.log('\n[F] 257 페이즈 던전 — 중간 격파에는 시퀀스가 안 붙는다');
  {
    const id = await ev(() => DUNGEONS.map((d) => d.id)
      .find((i) => dunBossN(DUNGEONS.find((x) => x.id === i)) >= 2));
    const p = await enter(id);
    if (p.err) no(id + ' — ' + p.err);
    else {
      const r = await ev(() => {
        const b = enemies.find((e) => e.tk === 'dunboss');
        killEnemy(b);                                   /* 1마리째 */
        const mid = { down: dunRun.bossDown, clrT: dunRun.clrT, killed: dunRun.bossKilled, bn: dunRun.bossN };
        step(1 / 60);
        const mid2 = { run: !!dunRun, clrT: dunRun ? dunRun.clrT : null, msg: msgTxt };
        return { mid, mid2 };
      });
      if (!blk('§F 페이즈', r)) {
      is(id + ' — 1마리째로는 격파 깃발이 안 선다 (' + r.mid.killed + '/' + r.mid.bn + ')', r.mid.down, false);
      is(id + ' — 그래서 시퀀스도 안 시작한다 (clrT = 0)', r.mid.clrT, 0);
      is(id + ' — 한 틱 뒤에도 시퀀스가 안 흐른다', r.mid2.clrT, 0);
      is(id + ' — 중간 격파에 «클리어» 가 안 뜬다', r.mid2.msg === '클리어', false);
      is(id + ' — 런은 계속된다', r.mid2.run, true); }
      await cleanup();
    }
  }

  /* ═══ §G 자기 검진 — §A 의 자가 옛 거동을 빨갛게 볼 수 있는가 ═════════════ */
  console.log('\n[G] 자기 검진 — «다음 틱에 끝나는» 옛 거동을 §A 의 자로 재면 빨간가');
  {
    const p = await enter('gold');
    if (p.err) no('gold — ' + p.err);
    else {
      await killAll();
      const r = await ev(() => {
        /* 시퀀스를 이미 다 지난 것처럼 밀어 놓는다 = «격파 다음 틱에 끝난다»(255 거동) */
        dunRun.clrT = 1e6;
        let endAt = -1, msgAt = -1;
        for (let k = 0; k < 60 * 8; k++) {
          step(1 / 60);
          const t = (k + 1) / 60;
          if (msgAt < 0 && msgTxt === '클리어') msgAt = t;
          if (!dunRun) { endAt = t; break; }
        }
        return { endAt, msgAt };
      });
      if (blk('§G 자기 검진', r) || blk('§G 입장', p)) { await cleanup(); }
      else {
      const want = p.clrDie + p.hold;
      (r.endAt >= 0 && r.endAt < want - 1e-9)
        ? ok('되돌림 시험 — 옛 거동이면 ' + r.endAt.toFixed(3) + 's 로 끝나 §A(≥ ' + want.toFixed(3) + 's)가 빨개진다')
        : no('되돌림 시험 실패 — 옛 거동을 밀어 넣었는데도 ' + r.endAt.toFixed(3) + 's (§A 가 가짜 초록이다)');
      is('되돌림 시험 — 그때는 «클리어» 도 안 뜬다', r.msgAt < 0, true); }
      await cleanup();
    }
  }

  /* ═══ §H 콘솔 ═════════════════════════════════════════════════════════════ */
  console.log('\n[H] 콘솔 에러');
  is('콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach((e) => console.log('       ' + String(e).slice(0, 200)));

  console.log('\nVERIFY332 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
