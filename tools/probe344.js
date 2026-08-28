/* 344 — `verify257` [6] «보스 3마리 최소 간격» 이 왜 간헐적으로 빨간가.
   등재문의 처방은 둘 중 하나를 «고르고 근거를 남기라» 였다:
     ⓐ 게이트가 난수를 고정한다   ⓑ 제품이 «최소 간격» 을 실제로 보장한다
   고르기 전에 **원인을 재현으로 좁힌다.** 이 probe 는 같은 런을 N 회 굴리며
   프레임별 최소 간격(중심 거리 / 반지름 합)을 창을 갈라 재고, 최솟값이 «언제» 나오는지 찍는다.

   실행: node tools/probe344.js [반복수]
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const REP = +(process.argv[2] || 24);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 동시 등장(=같은 프레임에 여럿이 서는) 던전 전부를 돈다 — 2마리 판도 같은 병을 앓는다 */
  const ids = await page.evaluate(() => DUNGEONS.filter((d) => dunBossN(d) > 1 && dunBossMd(d) === 'all')
    .map((d) => ({ id: d.id, bn: dunBossN(d) })));
  console.log('동시 등장 던전 ' + ids.map((t) => t.id + '(보스 ' + t.bn + ')').join(' · ') + '  · 각 ' + REP + '회');

  const rows = [];
  for (let n = 0; n < REP * ids.length; n++) {
    const id = ids[n % ids.length].id;
    const r = await page.evaluate(([dunId]) => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      const d = DUNGEONS.find((x) => x.id === dunId);
      S.dunTk[d.id] = 9;
      for (let i = 0; i < 8; i++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
      if (!dunRun) return { err: 'startDunRun 실패' };
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });

      const sep = () => {
        const bs = enemies.filter((e) => e.tk === 'dunboss');
        if (bs.length < 2) return 9;
        let m = 9;
        for (let a = 0; a < bs.length; a++) for (let b = a + 1; b < bs.length; b++)
          m = Math.min(m, Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y) / (bs[a].r + bs[b].r));
        return m;
      };
      /* 창을 셋으로 가른다:
         born  = 태어난 직후 «등장 정지» 창(제품이 e.born < 0.3 이면 이동·분리를 통째로 건너뛴다)
         gate  = 게이트가 실제로 재는 창(k ≥ 12)
         move  = 제품이 움직이기 시작한 뒤(k ≥ 17, born ≥ 0.3) */
      let spawnSep = -1, mBorn = 9, mGate = 9, mMove = 9, argmin = -1, mAll = 9;
      let under = 0, run = 0, runMax = 0;      /* 97% 아래 프레임 수 · 그 연속 길이 */
      for (let k = 0; k < 900; k++) {
        step(1 / 60);
        if (!dunRun) break;
        const s = sep();
        if (s === 9) { run = 0; continue; }
        if (spawnSep < 0) spawnSep = s;
        if (s < mAll) { mAll = s; argmin = k; }
        if (k < 17) mBorn = Math.min(mBorn, s); else mMove = Math.min(mMove, s);
        if (k >= 12) mGate = Math.min(mGate, s);
        if (s < 0.97) { under++; run++; runMax = Math.max(runMax, run); } else run = 0;
      }
      const bs0 = enemies.filter((e) => e.tk === 'dunboss');
      const rr = bs0.length >= 2 ? bs0[0].r + bs0[1].r : 0;
      endDunRun(false, true);
      return { spawnSep, mBorn, mGate, mMove, argmin, mAll, rsum: rr, under, runMax };
    }, [id]);
    if (r.err) { console.log('  ' + r.err); break; }
    rows.push(r);
    console.log('  #' + String(n + 1).padStart(2) + ' ' + id.padEnd(7) + ' 스폰 ' + (r.spawnSep * 100).toFixed(0).padStart(4)
      + '%  |  등장창(k<17) ' + (r.mBorn * 100).toFixed(0).padStart(4)
      + '%  게이트창(k≥12) ' + (r.mGate * 100).toFixed(0).padStart(4)
      + '%  이동후(k≥17) ' + (r.mMove * 100).toFixed(0).padStart(4)
      + '%  최소 프레임 k=' + String(r.argmin).padStart(3)
      + '  <97% 프레임 ' + String(r.under).padStart(3) + '개(연속 최대 ' + r.runMax + ')');
  }

  const cnt = (f) => rows.filter(f).length;
  const min = (f) => rows.reduce((a, r) => Math.min(a, f(r)), 9);
  console.log('\n─ 요약 (' + rows.length + '회) ─');
  console.log('  반지름 합(마지막 표본) = ' + rows[rows.length - 1].rsum.toFixed(1) + 'px');
  console.log('  게이트창(k≥12) < 97% : ' + cnt((r) => r.mGate < 0.97) + '회'
    + '   최솟값 ' + (min((r) => r.mGate) * 100).toFixed(1) + '%');
  console.log('  이동후(k≥17)  < 97% : ' + cnt((r) => r.mMove < 0.97) + '회'
    + '   최솟값 ' + (min((r) => r.mMove) * 100).toFixed(1) + '%');
  console.log('  스폰 좌표가 겹침(<100%) : ' + cnt((r) => r.spawnSep < 1) + '회'
    + '   최솟값 ' + (min((r) => r.spawnSep) * 100).toFixed(1) + '%');
  console.log('  <97% 프레임 총합 ' + rows.reduce((a, r) => a + r.under, 0)
    + '개 · 연속 최대 ' + rows.reduce((a, r) => Math.max(a, r.runMax), 0) + '프레임');
  console.log('  런 전체 최소 간격 = ' + (min((r) => r.mAll) * 100).toFixed(1) + '%');
  console.log('  최솟값이 등장창(k<17) 안 : ' + cnt((r) => r.argmin < 17) + '회 / '
    + rows.length + '  (밖 ' + cnt((r) => r.argmin >= 17) + '회)');
  console.log('\n콘솔 에러 ' + errs.length + '건');
  await browser.close();
})();
