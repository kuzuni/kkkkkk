/* 255 — 「던전에 보스가 없다 — 들어가자마자 보스 없이 바로 클리어된다」 실측 프로브.
   178 이 «보스 개체» 를 넣었지만 **클리어 판정은 여전히 «누적 피해 ≥ 요구 피해» 하나** 다
   (index.html step() 던전 분기). 그래서 보스가 서기도 전에, 혹은 서자마자 런이 끝난다 —
   주인 보고 «보스 없이 바로 클리어» 는 그 판정 이야기다.

   재는 것(판당):
     · bossSpawned  — 보스가 실제로 필드에 섰는가(스폰 딜레이까지 지났는가)
     · bossKilled   — 그 보스를 잡았는가
     · bossLiveSec  — 보스가 필드에 서 있던 시간(초)
     · sec          — 런이 끝난 시각
   실행: node tools/probe255.js [RUNS]
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const RUNS = +(process.argv[2] || 3);
/* 보스 체력 계수 스윕 — `DUN_BOSS_HPK` 는 const 라 재대입할 수 없으므로, 보스가 필드에
   선 **첫 틱**에 hp/max 를 갈아 끼워 같은 효과를 낸다(스폰부 index.html ~17435 와 같은 식). */
const HPKS = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
const CASES = [
  { stage: 1,  dun: 'gold',   f: 1 },
  { stage: 12, dun: 'gold',   f: 3 },
  { stage: 12, dun: 'dia',    f: 3 },
  { stage: 25, dun: 'relic1', f: 2 },
  { stage: 40, dun: 'relic2', f: 2 },
  { stage: 60, dun: 'relic3', f: 3 }
];
/* 「전투력이 요구치를 크게 웃도는」 플레이어 — 주인이 본 장면이 이쪽이다.
   x1 = 딱 맞는 플레이어(178 이 잰 지점), x4 = 넉넉히 넘는 플레이어. */
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

  const one = (c, mul, hpk) => page.evaluate(([stage, dunId, f, pmul, hk]) => {
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
    const cpv = cp();
    startDunRun(d, f);
    if (!dunRun) return { err: 'startDunRun 실패' };
    const need = dunRun.need;
    const origEnd = endDunRun;
    let clearedBy = null, downAtEnd = 0, inAtEnd = 0;
    /* 「보스를 잡고 끝났는가」 는 밖에서 셀 수 없다 — 격파한 그 틱 안에서 endDunRun 이 런을
       지우고 나가므로 루프는 `dunRun` 이 이미 null 인 것만 본다(1차 실측에서 처치 0.00 이 나왔다).
       판정 직전의 깃발을 여기서 가로챈다. */
    endDunRun = function (cleared, quit) {
      if (clearedBy === null) {
        clearedBy = !!cleared && !quit;
        downAtEnd = dunRun && dunRun.bossDown ? 1 : 0;
        inAtEnd = dunRun && dunRun.bossIn ? 1 : 0;
      }
      return origEnd.apply(this, arguments);
    };
    let ticks = 0, bossTicks = 0, bossSpawned = 0, prevBoss = 0, deaths = 0, wasDead = false;
    for (let k = 0; k < 1800 && dunRun; k++) {
      step(1 / 60); ticks++;
      if (!dunRun) break;
      if (player.dead > 0 && !wasDead) { deaths++; wasDead = true; }
      if (player.dead <= 0) wasDead = false;
      const bs = enemies.filter(e => e.tk === 'dunboss');
      if (hk > 0) for (const b of bs) if (!b.__hk) { b.__hk = 1; b.hp = b.max = Math.max(1, need * hk); }
      const nb = bs.length;
      if (nb > prevBoss) bossSpawned = 1;
      if (nb > 0) bossTicks++;
      prevBoss = nb;
    }
    const cleared = clearedBy === true;
    if (dunRun) endDunRun(false, true);
    endDunRun = origEnd;
    document.querySelectorAll('.mw.on').forEach(el => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
    return { cp: cpv, need, cleared, sec: +(ticks / 60).toFixed(1), deaths,
             bossSpawned: bossSpawned || inAtEnd, bossKilled: downAtEnd,
             bossLiveSec: +(bossTicks / 60).toFixed(1) };
  }, [c.stage, c.dun, c.f, mul, hpk || 0]);

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  console.log('\n255 프로브 — RUNS=' + RUNS + '/케이스 · 판당 최대 30초(step 1800틱)');
  for (const hpk of (HPKS.length ? HPKS : [0])) {
    if (hpk) console.log('\n══ DUN_BOSS_HPK = ' + hpk + ' (보스 체력 = 요구 피해 × 이 값)');
    for (const mul of POWER) {
      console.log('\n  ■ 전투력 = 요구 전투력 × ' + mul);
      console.log('  케이스              클리어    클리어초   보스 등장   보스 격파   보스 생존초   사망');
      for (const c of CASES) {
        const acc = { sec: [], live: [], sp: [], kill: [], dth: [] }; let cl = 0;
        for (let i = 0; i < RUNS; i++) {
          const r = await one(c, mul, hpk);
          if (r.err) { console.log('  ' + c.dun + ' — ' + r.err); continue; }
          if (r.cleared) cl++;
          acc.sec.push(r.sec); acc.live.push(r.bossLiveSec); acc.dth.push(r.deaths);
          acc.sp.push(r.bossSpawned); acc.kill.push(r.bossKilled);
          await page.waitForTimeout(40);
        }
        console.log('  ' + ('S' + c.stage + ' ' + c.dun + ' ' + c.f + '층').padEnd(20)
          + (cl + '/' + RUNS).padEnd(10)
          + (avg(acc.sec).toFixed(1) + 's').padEnd(11)
          + avg(acc.sp).toFixed(2).padEnd(12)
          + avg(acc.kill).toFixed(2).padEnd(12)
          + (avg(acc.live).toFixed(1) + 's').padEnd(14)
          + avg(acc.dth).toFixed(1));
      }
    }
  }
  if (errs.length) console.log('\n  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  else console.log('\n  콘솔 에러 0건');
  await browser.close();
})();
