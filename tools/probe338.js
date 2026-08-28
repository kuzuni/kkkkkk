/* 작업 338 재현 프로브 — «던전 보스 체력바가 격파 후에도 덜 깎여 있음»
 *
 *   node tools/probe338.js
 *
 * 주인 보고: «던전 종류에 체력바 부분 ui가 반영이 제대로 안되더라. 보스 죽었는데 hp바가 다 깎여있지를 않음».
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는** 자리다.
 * 던전 전 종(8) + 탑 2 종, 보스 1/2/3마리 · 동시/페이즈 전 조합에서
 *   ① 매 프레임 dunBarF 실측 폭(px)
 *   ② 마지막 보스 hp 0 도달 프레임의 폭
 *   ③ 332 시퀀스(터짐 → «클리어» → 1초) 동안의 폭
 * 를 찍는다.
 *
 * ⚑ **이 프로브가 등재문의 가설을 기각했다.** 등재문은 «바가 덜 찬다» 를 의심했는데,
 *   수리 전 실측은 전 조합에서 격파 프레임의 폭이 **예외 없이 574px = 가득**이었다
 *   (`docs/review/338-던전보스체력바.md` §2 «수리 전» 표). 즉 결손은 «눈금이 안 따라온다» 가
 *   아니라 **«눈금이 거꾸로다»** 였다 — 같은 부품인 39 보스 체력바(`#bossHp`)는 줄어드는데
 *   던전만 차오르니 «보스 죽었는데 hp바가 다 깎여있지를 않음» 으로 보인 것이다.
 * 그래서 **기대값을 뒤집었다**: 등장 딜레이 = 574(만피) · 마지막 격파 프레임부터 = **0 으로 굳는다**.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
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
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계 (verify332 와 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 던전 8종 **+ 탑 2종**(209·210). 264 이후 탑도 «보스 격파 = 클리어» 라 같은 바를 탄다 —
     주인 보고의 «던전 종류에» 를 빠짐없이 덮으려면 탑도 같은 자에 올려야 한다. */
  const DUNS = await ev(() => DUNGEONS.concat(TOWERS)
    .map((d) => ({ id: d.id, n: d.n, bn: dunBossN(d), bm: dunBossMd(d), tw: isTower(d) })));
  if (DUNS.__err) { console.log('던전 목록 실패: ' + DUNS.__err); await browser.close(); process.exit(1); }

  console.log('던전·탑 ' + DUNS.length + '종 — id / 이름 / 보스수 / 방식');
  for (const d of DUNS) console.log('   ' + d.id.padEnd(9) + d.n.padEnd(12) + 'bn=' + d.bn + ' ' + d.bm + (d.tw ? ' (탑)' : ''));

  /* 한 던전을 «실제 진입 → 실제 피해로 격파» 로 굴리며 매 프레임 바 폭을 찍는다.
     killEnemy 를 직접 부르지 않는 이유: 주인이 본 것은 «전투 중의 바» 이므로 hitEnemy 경로를 그대로 탄다. */
  const run = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const tw = TOWERS.find((x) => x.id === i);
    if (tw) {
      challengeTower(i);                       /* 탑은 제 진입점이 따로다(209·210) */
    } else {
      const d = DUNGEONS.find((x) => x.id === i);
      S.dunTk[d.id] = 9;
      for (let k = 0; k < 8; k++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    if (!dunRun) return { err: '입장 실패' };

    const barW = () => parseFloat(getComputedStyle(document.getElementById('dunBarF')).width) || 0;
    const log = [];
    const snap = (tag) => {
      const r = dunRun;
      log.push({ tag,
        w: +barW().toFixed(2),
        prog: r ? +dunRunProg().toFixed(4) : null,
        killed: r ? r.bossKilled : null,
        up: r ? r.bossUp : null,
        down: r ? !!r.bossDown : null,
        clrT: r ? +(r.clrT || 0).toFixed(3) : null,
        live: enemies.filter((e) => e.tk === 'dunboss').length,
        hp: enemies.filter((e) => e.tk === 'dunboss').map((e) => +(e.hp / e.max).toFixed(3)) });
    };

    /* 스폰 딜레이를 없애고 보스를 세운다 */
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    step(1 / 60); drawHud(); snap('보스 등장');

    let guard = 0, prevKilled = 0;
    /* 살아 있는 보스를 «조금씩» 때린다 — 한 방에 죽이지 않고 바가 차는 과정을 본다 */
    while (dunRun && !dunRun.bossDown && guard++ < 1200) {
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (b) {
        const before = enemies.length;
        hitEnemy(b, b.max / 3.0);            /* 3방이면 죽는다 */
        step(1 / 60); drawHud();
        if (enemies.length < before || (dunRun && dunRun.bossKilled !== prevKilled)) {
          prevKilled = dunRun ? dunRun.bossKilled : prevKilled;
          snap('격파 직후 killed=' + prevKilled);
        } else if (guard % 1 === 0 && log.length < 400) snap('타격');
      } else {
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60); drawHud(); snap('대기/다음페이즈');
      }
    }
    if (!dunRun) return { err: '런이 사라짐(격파 전)', log };
    snap('★ 마지막 격파 프레임');

    /* 332 시퀀스 — 완료 화면이 뜰 때까지 프레임을 흘리며 계속 찍는다 */
    let seq = 0;
    while (dunRun && seq++ < 60 * 8) {
      step(1 / 60); drawHud();
      if (seq % 10 === 0 || !dunRun) snap('시퀀스 t=' + (seq / 60).toFixed(2));
    }
    snap('완료 화면 (dunRun=null)');
    const clOn = !!(document.getElementById('dclw') || {}).classList &&
                 document.getElementById('dclw').classList.contains('on');

    /* 뒷정리 */
    if (dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    const cl = document.getElementById('dclw'); if (cl) cl.classList.remove('on');
    if (typeof closeModal === 'function') closeModal();
    return { log, clOn };
  }, [id]);

  let bad = 0;
  for (const d of DUNS) {
    console.log('\n══ ' + d.id + ' (' + d.n + ') bn=' + d.bn + ' ' + d.bm + (d.tw ? ' (탑)' : '') + ' ═══════════════');
    const r = await run(d.id);
    if (r.__err) { console.log('  평가 실패: ' + r.__err); bad++; continue; }
    if (r.err) { console.log('  ' + r.err); bad++; }
    const log = r.log || [];
    /* ★ 표시 프레임과 그 뒤 시퀀스만 자세히, 앞은 요약 */
    const star = log.findIndex((x) => x.tag.startsWith('★'));
    const head = star < 0 ? log : log.slice(0, star);
    const tail = star < 0 ? [] : log.slice(star);
    /* 앞부분은 격파·페이즈 전환만 */
    for (const x of head) {
      if (/격파|등장|페이즈/.test(x.tag))
        console.log('   ' + x.tag.padEnd(22) + 'w=' + String(x.w).padStart(7) +
                    '  prog=' + String(x.prog).padStart(6) + '  killed=' + x.killed +
                    ' up=' + x.up + ' live=' + x.live + ' hp=[' + x.hp.join(',') + ']');
    }
    for (const x of tail) {
      /* 338 — 격파 깃발이 선 뒤로는 «다 깎인» 0px 이어야 한다(수리 전에는 여기가 574 였다) */
      const flag = (x.down && x.w > 0.5) ? '   ⚠ 격파했는데 0px 이 아니다' : '';
      console.log('   ' + x.tag.padEnd(22) + 'w=' + String(x.w).padStart(7) +
                  '  prog=' + String(x.prog).padStart(6) + '  killed=' + x.killed +
                  ' down=' + x.down + ' clrT=' + x.clrT + ' live=' + x.live + flag);
      if (flag) bad++;
    }
    console.log('   완료 화면(#dclw.on) = ' + r.clOn);
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('PROBE338 — 어긋난 프레임 ' + bad + '건');
  await browser.close();
})();
