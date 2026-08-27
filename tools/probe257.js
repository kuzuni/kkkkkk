/* 257 — 「던전 보스 수(1/2/3) · 등장 방식(동시/페이즈)」 실측 프로브.
   255 의 `tools/probe255.js` 와 **같은 자**(같은 성장 루프·같은 30초 예산)를 쓴다 — 그래야
   «수를 늘려도 난이도가 그대로인가»(결정 ②)를 255 의 18/18 과 직접 비교할 수 있다.

   재는 것(판당):
     · cleared      — 클리어했는가
     · sec          — 런이 끝난 시각
     · bossSpawned  — 보스가 실제로 필드에 섰는가
     · bossKilled   — 몇 마리를 잡았는가(수가 여럿이므로 «수» 다)
     · maxAtOnce    — 동시에 필드에 서 있던 최대 보스 수(= 동시/페이즈가 실제로 갈리는가)
     · minSep       — 보스끼리 가장 가까웠던 거리 ÷ (반지름 합) — 1 미만이면 겹친 것이다
     · deaths       — 판당 사망

   실행: node tools/probe257.js [RUNS]
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const RUNS = +(process.argv[2] || 3);
/* 8던전을 «보스 수 × 등장 방식» 이 전부 한 번씩 나오게 고른다.
   스테이지·층은 probe255 의 케이스를 그대로 물려받는다(같은 자 = 직접 비교 가능). */
const CASES = [
  { stage: 1,  dun: 'gold',   f: 1 },   /* 1 · (단독) */
  { stage: 12, dun: 'gold',   f: 3 },   /* 1 · (단독) */
  { stage: 12, dun: 'dia',    f: 3 },   /* 1 · (단독) */
  { stage: 25, dun: 'relic1', f: 2 },   /* 1 · (단독) */
  { stage: 40, dun: 'relic2', f: 2 },   /* 2 · 페이즈 */
  { stage: 60, dun: 'relic3', f: 3 },   /* 2 · 동시   */
  { stage: 60, dun: 'relic4', f: 2 },   /* 3 · 페이즈 */
  { stage: 40, dun: 'stone',  f: 2 },   /* 2 · 동시   */
  { stage: 60, dun: 'rstone', f: 2 }    /* 3 · 동시   */
];
/* x1 = 「자기 전투력 = 요구 전투력」 인 딱 맞는 플레이어(255 가 18/18 을 잰 지점) */
const POWER = [1, 4];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const one = (c, mul) => page.evaluate(([stage, dunId, f, pmul]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = stage; S.best = stage; S.guide.idx = 99;
    const d = DUNGEONS.find(x => x.id === dunId);
    S.dunTk[d.id] = 9;
    S.dun[d.id] = Math.max(S.dun[d.id] | 0, f);
    const req = d.req(f) * pmul, keys = Object.keys(S.lv);
    let g = 0;
    while (cp() < req && g < 5000) { g++; for (const k of keys) S.lv[k] = g; }
    startDunRun(d, f);
    if (!dunRun) return { err: 'startDunRun 실패' };
    const bossN = dunRun.bossN, mode = dunRun.bossMode;
    /* probe255 와 같은 이유 — 격파한 그 틱 안에서 endDunRun 이 런을 지우므로 깃발을 가로챈다 */
    const origEnd = endDunRun;
    let clearedBy = null, killAtEnd = 0, inAtEnd = 0, leftAtEnd = 1;
    endDunRun = function (cleared, quit) {
      if (clearedBy === null) {
        clearedBy = !!cleared && !quit;
        killAtEnd = dunRun ? dunRun.bossKilled : 0;
        inAtEnd = dunRun && dunRun.bossIn ? 1 : 0;
      }
      const rv = origEnd.apply(this, arguments);
      return rv;
    };
    let ticks = 0, bossSpawned = 0, deaths = 0, wasDead = false, maxAtOnce = 0, minSep = 9;
    for (let k = 0; k < 1800 && dunRun; k++) {
      step(1 / 60); ticks++;
      if (!dunRun) break;
      if (player.dead > 0 && !wasDead) { deaths++; wasDead = true; }
      if (player.dead <= 0) wasDead = false;
      const bs = enemies.filter(e => e.tk === 'dunboss');
      if (bs.length) bossSpawned = 1;
      if (bs.length > maxAtOnce) maxAtOnce = bs.length;
      for (let a = 0; a < bs.length; a++) for (let b = a + 1; b < bs.length; b++) {
        const s = Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y) / (bs[a].r + bs[b].r);
        if (s < minSep) minSep = s;
      }
    }
    const cleared = clearedBy === true;
    if (dunRun) endDunRun(false, true);
    endDunRun = origEnd;
    document.querySelectorAll('.mw.on').forEach(el => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
    return { bossN, mode, cleared, sec: +(ticks / 60).toFixed(1), deaths,
             bossSpawned: bossSpawned || inAtEnd, bossKilled: killAtEnd,
             maxAtOnce, minSep: minSep === 9 ? -1 : +minSep.toFixed(2) };
  }, [c.stage, c.dun, c.f, mul]);

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  console.log('\n257 프로브 — RUNS=' + RUNS + '/케이스 · 판당 최대 30초(step 1800틱)');
  for (const mul of POWER) {
    console.log('\n  ■ 전투력 = 요구 전투력 × ' + mul);
    console.log('  케이스              보스     클리어    클리어초   등장   격파수   동시최대   최소간격   사망');
    for (const c of CASES) {
      const acc = { sec: [], sp: [], kill: [], dth: [], mx: [], sep: [] }; let cl = 0, tag = '?';
      for (let i = 0; i < RUNS; i++) {
        const r = await one(c, mul);
        if (r.err) { console.log('  ' + c.dun + ' — ' + r.err); continue; }
        tag = r.bossN + (r.bossN > 1 ? (r.mode === 'all' ? '동시' : '순차') : '단독');
        if (r.cleared) cl++;
        acc.sec.push(r.sec); acc.dth.push(r.deaths); acc.sp.push(r.bossSpawned);
        acc.kill.push(r.bossKilled); acc.mx.push(r.maxAtOnce);
        if (r.minSep >= 0) acc.sep.push(r.minSep);
        await page.waitForTimeout(40);
      }
      console.log('  ' + ('S' + c.stage + ' ' + c.dun + ' ' + c.f + '층').padEnd(20)
        + tag.padEnd(9)
        + (cl + '/' + RUNS).padEnd(10)
        + (avg(acc.sec).toFixed(1) + 's').padEnd(11)
        + avg(acc.sp).toFixed(2).padEnd(7)
        + avg(acc.kill).toFixed(2).padEnd(9)
        + avg(acc.mx).toFixed(2).padEnd(11)
        + (acc.sep.length ? avg(acc.sep).toFixed(2) : '—').padEnd(11)
        + avg(acc.dth).toFixed(1));
    }
  }
  if (errs.length) console.log('\n  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  else console.log('\n  콘솔 에러 0건');
  await browser.close();
})();
