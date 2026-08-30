/* 작업 339 게이트 — 던전 «연속 도전» 실동작
 *
 *   node tools/verify339.js   → 마지막 줄이 `VERIFY339 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-29): «연속도전 체크해놨으면 클리어보상 떴을때 거기에도 연속도전 토글
 * 있게 하고 거기서 5초 카운트 지나면 다음꺼 자동도전된다카고 다음거 도전되게 해».
 * 종전 04 세부 팝업의 체크박스는 **표시 전용**이었다(`dgdAutoOn` — «자동 반복은 미구현»).
 *
 * 재는 축:
 *   §A 미체크 — 체크가 꺼져 있으면 카운트다운 문구 자체가 없고, 20초를 흘려도 자동 입장 0.
 *   §B 체크   — 5→4→3→2→1 이 **1초 단위**로 줄고 **정확히 5초에** 다음 층 런이 선다(층 +1 · 입장권 −1).
 *               「토글을 그렸다」가 아니라 「그만큼 걸려 실제로 들어간다」 — 던전 8종 전부.
 *   §C 중단   — 토글 해제 · 화면 닫기 · 입장권 소진 셋 다 자동 입장이 **0** 이다(④).
 *   §D 동기   — 04 토글 ↔ 31 토글이 한 값이다(양방향 — 어느 쪽을 눌러도 둘 다 움직인다).
 *   §E 소탕   — 소탕 경유 화면은 «자동 소탕»(같은 층 반복)이다: 입장권 −1 · 층 불변 · 화면 재등장.
 *   §F 스냅샷 — «연속 도전» 은 런이 시작될 때 굳는다(`dunRun.auto`) — 결과 화면이 그 값을 따른다.
 *   §G 이음   — 332 의 «격파 → die 애니 → 1초» **뒤에** 이 5초가 붙는다(합 = die + 1 + 5).
 *   §H 탑     — 209 시련의 탑도 같은 규칙이되 입장권이 없다(무제한 — «입장권 없음» 이 안 뜬다).
 *   §R 되돌림 — 시계(`dclAutoTick`)를 무력화하면 §B 가 실제로 빨개진다(LESSONS 307-④).
 *   §I 콘솔   — 에러 0건.
 *
 * ⚠ 게임 루프를 얼리고 `step(1/60)` 만을 시계로 쓴다(verify285·verify332 와 같은 처방) —
 *    카운트다운이 `step(dt)` 를 타므로 이 게이트는 rAF 없이 틱 단위로 잴 수 있다.
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
const is = (m, got, want) => (got === want ? ok(m + ' = ' + JSON.stringify(got))
  : no(m + ' — 기대 ' + JSON.stringify(want) + ' · 실제 ' + JSON.stringify(got)));
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

  /* LESSONS 319 — evaluate 안에서 터진 예외가 게이트를 즉사시키지 않게 감싼다 */
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 160) }; }
  };
  const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

  await ev(() => { window.requestAnimationFrame = () => 0; });

  const cleanup = () => ev(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    const cl = document.getElementById('dclw'); if (cl) { cl.classList.remove('on'); }
    if (typeof closeDunClear === 'function') closeDunClear();
    if (typeof closeModal === 'function') closeModal();
    dgdAutoOn = false;
  });

  /* 실제 진입점으로 들어가 «클리어 화면이 떠 있는» 상태까지 세운다(T2 기능 완성 규칙 — 손으로 안 만든다).
     auto = 입장 전에 켜 두는 «연속 도전» 체크. 반환은 클리어 화면이 뜬 직후의 상태다. */
  const clearTo = (id, auto, tk) => ev(([i, a, t]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.find((x) => x.id === i);
    S.dunTk[d.id] = t;
    for (let k = 0; k < 8; k++) {
      const u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    dgdAutoOn = !!a;
    challengeDungeon(d);
    if (!dunRun) return { err: '입장 실패' };
    const snap = dunRun.auto, f0 = dunRun.f, die = dunRun.clrDie, hold = DUN_CLR_HOLD;
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    /* 마지막 보스까지 잡는다 */
    let guard = 0;
    while (dunRun && !dunRun.bossDown && guard++ < 400) {
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (b) { killEnemy(b); continue; }
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
    }
    if (!dunRun || !dunRun.bossDown) return { err: '마지막 격파에 도달 못 함' };
    /* 332 의 시퀀스(die 애니 + 1초)를 흘려 완료 화면까지 간다 */
    let seq = 0;
    for (let k = 0; k < 60 * 12 && dunRun; k++) { step(1 / 60); seq = (k + 1) / 60; }
    return { snap, f0, die, hold, seq,
             on: document.getElementById('dclw').classList.contains('on'),
             cd: document.getElementById('dclCd').textContent,
             chk: document.getElementById('dclAuto').classList.contains('on'),
             tk: S.dunTk[i], floor: S.dun[i] };
  }, [id, auto, tk]);

  /* 클리어 화면이 뜬 뒤 n 틱을 흘리며 «자동 입장» 을 지켜본다. 표시 문구도 초마다 걷는다. */
  const watch = (ticks) => ev(([n]) => {
    const seen = [];
    let goAt = -1;
    for (let k = 0; k < n; k++) {
      const t = document.getElementById('dclCd').textContent;
      if (!seen.length || seen[seen.length - 1] !== t) seen.push(t);
      step(1 / 60);
      if (goAt < 0 && dunRun) { goAt = (k + 1) / 60; break; }
    }
    return { seen, goAt,
             run: dunRun ? { f: dunRun.f, id: dunRun.d.id } : null,
             on: document.getElementById('dclw').classList.contains('on'),
             cd: document.getElementById('dclCd').textContent };
  }, [ticks]);

  const DUNS = await ev(() => DUNGEONS.map((d) => d.id));
  const CD = await ev(() => DCL_AUTO_SEC);
  is('카운트다운 길이 상수 DCL_AUTO_SEC', CD, 5);

  /* ═══ §A 미체크 — 카운트다운 자체가 없다 ═════════════════════════════════ */
  console.log('\n[A] 미체크 — 카운트다운 문구 0 · 20초를 흘려도 자동 입장 0');
  {
    const p = await clearTo('gold', false, 5);
    if (blk('§A 클리어', p) || p.err) { no('§A — ' + (p.err || '')); }
    else {
      is('§A 완료 화면이 떠 있다', p.on, true);
      is('§A 31 토글이 꺼져 있다', p.chk, false);
      is('§A 카운트다운 문구가 없다', p.cd, '');
      const w = await watch(60 * 20);
      if (!blk('§A 관찰', w)) {
        is('§A 20초를 흘려도 자동 입장 0', w.run, null);
        is('§A 그동안 문구는 내내 빈 줄', w.seen.join('|'), '');
        is('§A 완료 화면은 그대로 떠 있다', w.on, true);
      }
    }
    await cleanup();
  }

  /* ═══ §B 체크 — 5초 뒤 다음 레벨 자동 도전 (던전 8종) ══════════════════════ */
  console.log('\n[B] 체크 — 5→1 카운트다운 · 5초에 다음 층 입장 (층 +1 · 입장권 −1) · 던전 8종');
  for (const id of DUNS) {
    const p = await clearTo(id, true, 5);
    if (blk(id + ' 클리어', p) || p.err) { no(id + ' — ' + (p.err || '')); await cleanup(); continue; }
    is(id + ' — 31 토글이 켜져 있다', p.chk, true);
    is(id + ' — 첫 문구', p.cd, '5초 뒤 다음 레벨 자동 도전');
    const w = await watch(60 * 8);
    if (blk(id + ' 관찰', w)) { await cleanup(); continue; }
    /* ① 그만큼 실제로 걸린다 — 한 틱 오차만 허용 */
    near(id + ' — 자동 입장까지(초)', w.goAt, CD, 2 / 60 + 1e-6);
    /* ② 1초 단위로 5→4→3→2→1 (⑥) */
    is(id + ' — 문구가 1초 단위로 준다',
       w.seen.map((s) => (s.match(/^(\d+)/) || [])[1]).join(','), '5,4,3,2,1');
    /* ③ «다음 층» 이 실제로 선다: 층 +1 · 입장권 −1 */
    is(id + ' — 다음 층 런이 섰다', !!(w.run && w.run.id === id), true);
    if (w.run) is(id + ' — 층 +1', w.run.f, p.f0 + 1);
    is(id + ' — 완료 화면은 닫혔다', w.on, false);
    const after = await ev(([i]) => ({ tk: S.dunTk[i] }), [id]);
    if (!blk(id + ' 입장권', after)) is(id + ' — 입장권 −1', after.tk, p.tk - 1);
    await cleanup();
  }

  /* ═══ §C 중단 조건 셋 ════════════════════════════════════════════════════ */
  console.log('\n[C] 중단 — 토글 해제 · 화면 닫기 · 입장권 소진');
  {
    /* ① 토글 해제 */
    const p = await clearTo('gold', true, 5);
    if (blk('§C① 클리어', p) || p.err) no('§C① — ' + (p.err || ''));
    else {
      const r = await ev(() => {
        for (let k = 0; k < 120; k++) step(1 / 60);          /* 2초쯤 흘린 뒤 끈다 */
        document.getElementById('dclAuto').click();
        const cd = document.getElementById('dclCd').textContent;
        const chk = document.getElementById('dclAuto').classList.contains('on');
        for (let k = 0; k < 60 * 20; k++) { step(1 / 60); if (dunRun) break; }
        return { cd, chk, auto: dgdAutoOn, run: !!dunRun,
                 on: document.getElementById('dclw').classList.contains('on') };
      });
      if (!blk('§C①', r)) {
        is('§C① 토글을 끄면 체크가 풀린다', r.chk, false);
        is('§C① 카운트다운 문구가 사라진다', r.cd, '');
        is('§C① 04 토글 값도 같이 꺼진다(양방향)', r.auto, false);
        is('§C① 그 뒤 20초를 흘려도 자동 입장 0', r.run, false);
        is('§C① 완료 화면은 그대로 떠 있다', r.on, true);
      }
    }
    await cleanup();

    /* ② 화면 닫기 — 딤을 탭한다(«터치하여 닫기») */
    const q = await clearTo('gold', true, 5);
    if (blk('§C② 클리어', q) || q.err) no('§C② — ' + (q.err || ''));
    else {
      const r = await ev(() => {
        for (let k = 0; k < 120; k++) step(1 / 60);
        document.getElementById('dclw').click();             /* e.target === #dclw → closeDunClear */
        const on = document.getElementById('dclw').classList.contains('on');
        for (let k = 0; k < 60 * 20; k++) { step(1 / 60); if (dunRun) break; }
        return { on, run: !!dunRun };
      });
      if (!blk('§C②', r)) {
        is('§C② 딤을 탭하면 화면이 닫힌다', r.on, false);
        is('§C② 닫으면 자동 도전도 취소', r.run, false);
      }
    }
    await cleanup();

    /* ③ 입장권 소진 — 마지막 한 장으로 들어갔으니 클리어 시점에 0 이다 */
    const s = await clearTo('gold', true, 1);
    if (blk('§C③ 클리어', s) || s.err) no('§C③ — ' + (s.err || ''));
    else {
      is('§C③ 클리어 시점 입장권 0', s.tk, 0);
      is('§C③ 카운트다운 대신 «입장권 없음»', s.cd, '입장권 없음');
      is('§C③ 토글은 켜진 채로 유지된다(④)', s.chk, true);
      const w = await watch(60 * 20);
      if (!blk('§C③ 관찰', w)) {
        is('§C③ 20초를 흘려도 자동 입장 0', w.run, null);
        is('§C③ 완료 화면은 그대로', w.on, true);
      }
    }
    await cleanup();
  }

  /* ═══ §D 04 토글 ↔ 31 토글 동기 ══════════════════════════════════════════ */
  console.log('\n[D] 04 세부 팝업 토글과 31 클리어 화면 토글이 한 값이다');
  {
    const p = await clearTo('gold', false, 5);
    if (blk('§D 클리어', p) || p.err) no('§D — ' + (p.err || ''));
    else {
      const r = await ev(() => {
        const cb = document.getElementById('dclAuto'), dg = document.getElementById('dgdAuto');
        const a0 = { chk: cb.classList.contains('on'), auto: dgdAutoOn };
        cb.click();                                    /* 31 에서 켠다 → 04 값도 켜져야 한다 */
        const a1 = { chk: cb.classList.contains('on'), auto: dgdAutoOn,
                     cd: document.getElementById('dclCd').textContent };
        /* 04 쪽에서 끈다 → 31 토글·카운트다운이 따라 꺼져야 한다 */
        dg.onclick();
        const a2 = { chk: cb.classList.contains('on'), auto: dgdAutoOn, dgOn: dg.classList.contains('on'),
                     cd: document.getElementById('dclCd').textContent };
        return { a0, a1, a2 };
      });
      if (!blk('§D', r)) {
        is('§D 처음엔 둘 다 꺼짐', r.a0.chk === false && r.a0.auto === false, true);
        is('§D 31 에서 켜면 04 값도 켜진다', r.a1.chk === true && r.a1.auto === true, true);
        is('§D 켜는 즉시 카운트다운이 선다', r.a1.cd, '5초 뒤 다음 레벨 자동 도전');
        is('§D 04 에서 끄면 31 토글도 꺼진다', r.a2.chk === false && r.a2.auto === false, true);
        is('§D 04 토글의 표시도 꺼져 있다', r.a2.dgOn, false);
        is('§D 끄면 카운트다운 문구가 사라진다', r.a2.cd, '');
      }
    }
    await cleanup();
  }

  /* ═══ §E 소탕 — «다음 층» 이 아니라 «같은 소탕의 반복» ═══════════════════ */
  console.log('\n[E] 소탕 경유 화면 — «자동 소탕»(층 불변 · 입장권 −1 · 화면 재등장)');
  {
    const p = await ev(() => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      if (dunRun) endDunRun(false, true);
      const d = DUNGEONS[0];
      S.dun[d.id] = 4; S.dunTk[d.id] = 5;
      dgdAutoOn = true;
      sweepDungeon(d);
      return { id: d.id, on: document.getElementById('dclw').classList.contains('on'),
               cd: document.getElementById('dclCd').textContent,
               chk: document.getElementById('dclAuto').classList.contains('on'),
               tk: S.dunTk[d.id], floor: S.dun[d.id] };
    });
    if (blk('§E 소탕', p)) { /* 이미 빨갛다 */ }
    else {
      is('§E 소탕도 완료 화면을 연다', p.on, true);
      is('§E 토글이 켜져 있다', p.chk, true);
      is('§E 문구가 «자동 소탕» 이다', p.cd, '5초 뒤 자동 소탕');
      const r = await ev(([i, tk0, f0]) => {
        let goAt = -1;
        for (let k = 0; k < 60 * 8; k++) {
          step(1 / 60);
          if (S.dunTk[i] < tk0) { goAt = (k + 1) / 60; break; }
        }
        return { goAt, tk: S.dunTk[i], floor: S.dun[i], run: !!dunRun,
                 on: document.getElementById('dclw').classList.contains('on'),
                 cd: document.getElementById('dclCd').textContent };
      }, [p.id, p.tk, p.floor]);
      if (!blk('§E 관찰', r)) {
        near('§E 자동 소탕까지(초)', r.goAt, CD, 2 / 60 + 1e-6);
        is('§E 입장권 −1', r.tk, p.tk - 1);
        is('§E 층은 그대로(소탕은 «다음 층» 이 아니다)', r.floor, p.floor);
        is('§E 전투 런은 서지 않는다(즉시 보상)', r.run, false);
        is('§E 완료 화면이 다시 떠 있다', r.on, true);
        is('§E 다음 회차 카운트다운이 다시 선다', r.cd, '5초 뒤 자동 소탕');
      }
    }
    await cleanup();
  }

  /* ═══ §F 스냅샷 — 런이 시작될 때 굳는다 ═════════════════════════════════ */
  console.log('\n[F] «연속 도전» 은 런 시작 시 `dunRun.auto` 로 굳는다');
  {
    const r = await ev(() => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      if (dunRun) endDunRun(false, true);
      const d = DUNGEONS[0];
      S.dunTk[d.id] = 5;
      dgdAutoOn = true;
      challengeDungeon(d);
      if (!dunRun) return { err: '입장 실패' };
      const snap = dunRun.auto;
      dgdAutoOn = false;                 /* 런 도중에 값을 바꿔도 이 런의 결과 화면은 안 흔들린다 */
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      let guard = 0;
      while (dunRun && !dunRun.bossDown && guard++ < 400) {
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (b) { killEnemy(b); continue; }
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
      }
      for (let k = 0; k < 60 * 12 && dunRun; k++) step(1 / 60);
      return { snap, chk: document.getElementById('dclAuto').classList.contains('on'),
               cd: document.getElementById('dclCd').textContent };
    });
    if (!blk('§F', r) && !r.err) {
      is('§F 런 시작 시 스냅샷이 찍힌다', r.snap, true);
      is('§F 도중에 값이 바뀌어도 결과 화면은 스냅샷을 따른다', r.chk, true);
      is('§F 카운트다운도 스냅샷 기준으로 선다', r.cd, '5초 뒤 다음 레벨 자동 도전');
    } else if (r.err) no('§F — ' + r.err);
    await cleanup();
  }

  /* ═══ §G 332 이음 — die 애니 + 1초 «뒤에» 5초가 붙는다 ═══════════════════ */
  console.log('\n[G] 332 시퀀스(격파 → die 애니 → 1초) 뒤에 이 5초가 이어진다');
  {
    const p = await clearTo('gold', true, 5);
    if (blk('§G 클리어', p) || p.err) no('§G — ' + (p.err || ''));
    else {
      const w = await watch(60 * 8);
      if (!blk('§G 관찰', w)) {
        near('§G 격파 → 완료 화면(초) = die + 1', p.seq, p.die + p.hold, 3 / 60 + 1e-6);
        near('§G 완료 화면 → 자동 입장(초) = 5', w.goAt, CD, 2 / 60 + 1e-6);
        near('§G 격파 → 자동 입장 합(초)', p.seq + w.goAt, p.die + p.hold + CD, 4 / 60 + 1e-6);
        /* 5초는 시퀀스가 «끝난 뒤» 시작한다 — 겹쳐 흐르면 합이 5초 미만이 된다 */
        (w.goAt > p.hold) ? ok('§G 5초가 1초 홀드와 겹쳐 흐르지 않는다')
                          : no('§G 5초가 시퀀스와 겹쳐 흘렀다 — ' + w.goAt.toFixed(3) + 's');
      }
    }
    await cleanup();
  }

  /* ═══ §H 탑(209) — 같은 규칙 · 입장권 없음 ═══════════════════════════════ */
  console.log('\n[H] 시련의 탑 — 같은 카운트다운, 입장권 제한은 없다');
  {
    const r = await ev(() => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      if (dunRun) endDunRun(false, true);
      const t = TOWERS[0];
      dgdAutoOn = true;
      challengeTower(t.id);
      if (!dunRun) return { err: '탑 입장 실패' };
      const f0 = dunRun.f;
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      let guard = 0;
      while (dunRun && !dunRun.bossDown && guard++ < 400) {
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (b) { killEnemy(b); continue; }
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
      }
      for (let k = 0; k < 60 * 12 && dunRun; k++) step(1 / 60);
      const cd = document.getElementById('dclCd').textContent;
      let goAt = -1;
      for (let k = 0; k < 60 * 8; k++) { step(1 / 60); if (dunRun) { goAt = (k + 1) / 60; break; } }
      return { f0, cd, goAt, f1: dunRun ? dunRun.f : null };
    });
    if (!blk('§H', r) && !r.err) {
      is('§H 탑에서도 카운트다운이 뜬다', r.cd, '5초 뒤 다음 레벨 자동 도전');
      near('§H 자동 입장까지(초)', r.goAt, CD, 2 / 60 + 1e-6);
      is('§H 다음 층으로 자동 입장', r.f1, r.f0 + 1);
    } else if (r.err) no('§H — ' + r.err);
    await cleanup();
  }

  /* ═══ §R 되돌림 시험 — 시계를 죽이면 §B 가 실제로 빨개진다 ═══════════════ */
  console.log('\n[R] 되돌림 시험 — `dclAutoTick` 을 무력화하면 자동 입장이 사라진다');
  {
    await ev(() => { window.__dclTick = window.dclAutoTick; window.dclAutoTick = () => {}; });
    const p = await clearTo('gold', true, 5);
    if (blk('§R 클리어', p) || p.err) no('§R — ' + (p.err || ''));
    else {
      is('§R 토글·문구는 그대로 그려진다(«그렸다» 만으로는 통과 못 한다)', p.cd, '5초 뒤 다음 레벨 자동 도전');
      const w = await watch(60 * 20);
      if (!blk('§R 관찰', w)) {
        (w.run === null)
          ? ok('되돌림 시험 — 시계가 없으면 20초를 흘려도 자동 입장 0 → §B 가 빨개진다')
          : no('되돌림 시험 실패 — 시계를 죽였는데도 자동 입장이 일어났다(§B 가 가짜 초록이다)');
        is('§R 그동안 문구도 5 에서 멈춘다', w.seen.join('|'), '5초 뒤 다음 레벨 자동 도전');
      }
    }
    await ev(() => { window.dclAutoTick = window.__dclTick; });
    await cleanup();
    /* 원복 확인 — 되돌림 시험이 게이트를 오염시키지 않았다 */
    const q = await clearTo('gold', true, 5);
    if (!blk('§R 원복', q) && !q.err) {
      const w = await watch(60 * 8);
      if (!blk('§R 원복 관찰', w)) near('§R 원복 후 자동 입장까지(초)', w.goAt, CD, 2 / 60 + 1e-6);
    }
    await cleanup();
  }

  /* ═══ §I 콘솔 ════════════════════════════════════════════════════════════ */
  console.log('\n[I] 콘솔 에러');
  is('콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach((e) => console.log('       ' + String(e).slice(0, 200)));

  console.log('\nVERIFY339 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
