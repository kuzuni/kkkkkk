/* 178 — 던전 런 «보스 국면» 밸런스 프로브.
   30 던전 런의 판정은 «30초 누적 피해 ≥ 요구 피해» 하나뿐이고, 그 계수 `DUN_DMG_K = 1.2` 는
   **«자기 전투력 = 요구 전투력» 인 플레이어가 딱 통과하도록** 잡힌 값이다(index.html ~18496).
   그래서 재야 할 것도 그 지점이다 — 보스를 넣기 전·후로 **그 플레이어의 `dmg/need`** 가
   1.0 근처에서 얼마나 움직이는지.

   ⚠ 초기 판(스킬 1개짜리 생캐릭터)으로 재면 어느 스테이지에서든 8번씩 죽어 보스 한 마리의
      영향이 통째로 과장된다. 여기서는 케이스마다 **훈련 레벨을 균일하게 올려 `cp() ≥ req(f)`**
      가 되는 «딱 맞는 플레이어» 를 만든다.

   두 팔을 **같은 페이지·같은 트리**에서 잰다:
     · off — `dunBossTick` 을 빈 함수로 덮어 보스 국면을 끈다(= 178 이전 거동)
     · on  — 그대로(= 178)
   난수(스폰 각도·크리)에 시드가 없으므로 RUNS 번 돌려 평균한다.
   실시간 30초를 기다리지 않고 `step(1/60)` 을 1800번 직접 돌린다.

   실행: node tools/probe178.js [RUNS]
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const RUNS = +(process.argv[2] || 5);
/* 스테이지 × 던전 × 층 — 여섯 던전이 서로 다른 아틀라스(=다른 보스)를 쓰므로 골고루 넣는다 */
const CASES = [
  { stage: 1,  dun: 'gold',   f: 1 },
  { stage: 12, dun: 'gold',   f: 3 },
  { stage: 12, dun: 'dia',    f: 3 },
  { stage: 25, dun: 'relic1', f: 2 },
  { stage: 40, dun: 'relic2', f: 2 },
  { stage: 60, dun: 'relic3', f: 3 }
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  /* 178 을 끄고 켜는 스위치 — 원본 함수를 붙잡아 둔다(전역 함수 선언이라 재대입된다) */
  await page.evaluate(() => { window.__bossTick = dunBossTick; });

  const one = (c, arm) => page.evaluate(([stage, dunId, f, on]) => {
    dunBossTick = on ? window.__bossTick : function(){};
    localStorage.clear();
    Object.assign(S, DEF());
    /* 부팅 절차(index.html ~25533)가 새 게임에 주는 기본 스킬 — 없으면 피해가 0 이다(평타 없음) */
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = stage; S.best = stage; S.guide.idx = 99;
    const d = DUNGEONS.find(x => x.id === dunId);
    S.daily.dun[d.id] = 9;
    S.dun[d.id] = Math.max(S.dun[d.id] | 0, f);
    /* «자기 전투력 = 요구 전투력» 인 플레이어를 만든다 — 훈련 레벨을 균일하게 올린다.
       실제 플레이어의 배분과 똑같지는 않지만, 두 팔에 **같은 캐릭터**가 들어가므로 차분은 유효하다. */
    const req = d.req(f), keys = Object.keys(S.lv);
    let g = 0;
    while (cp() < req && g < 5000) { g++; for (const k of keys) S.lv[k] = g; }
    const cpv = cp();
    startDunRun(d, f);
    if (!dunRun) return { err: 'startDunRun 실패' };
    const need = dunRun.need;
    /* «클리어로 끝났는가» 는 마지막 틱의 dmg 로는 알 수 없다 — endDunRun 이 그 틱 안에서
       dunRun 을 지우고 나가므로 밖에서 본 마지막 값은 언제나 요구치 **직전**이다.
       판정을 그 값으로 하면 이기는 판이 통째로 «실패» 로 집계된다(1차 실측에서 실제로 그랬다). */
    const origEnd = endDunRun;
    let clearedBy = null;
    endDunRun = function (cleared, quit) { if (clearedBy === null) clearedBy = !!cleared && !quit; return origEnd.apply(this, arguments); };
    let last = 0, deaths = 0, wasDead = false, bossSeen = 0, bossAlive = 0, ticks = 0;
    for (let k = 0; k < 1800 && dunRun; k++) {
      const before = dunRun.dmg;
      step(1 / 60); ticks++;
      if (!dunRun) { last = Math.max(last, before); break; }
      last = dunRun.dmg;
      if (player.dead > 0 && !wasDead) { deaths++; wasDead = true; }
      if (player.dead <= 0) wasDead = false;
      const nb = enemies.filter(e => e.tk === 'dunboss').length;
      if (nb > bossAlive) bossSeen++;
      bossAlive = nb;
    }
    const cleared = clearedBy === true;
    /* 클리어로 끝난 판은 정의상 요구치를 채웠다 — 위 «직전 값» 대신 1.0 으로 적는다.
       거기에 걸린 시간(초)이 그 판의 진짜 난이도라 따로 남긴다. */
    const ratio = cleared ? 1 : last / need;
    if (dunRun) endDunRun(false, true);
    endDunRun = origEnd;
    document.querySelectorAll('.mw.on').forEach(el => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
    return { cp: cpv, lv: g, need, ratio, cleared, sec: +(ticks / 60).toFixed(1), deaths, bossSeen };
  }, [c.stage, c.dun, c.f, arm === 'on']);

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const rows = [];
  for (const c of CASES) {
    const res = {};
    for (const arm of ['off', 'on']) {
      const acc = { ratio: [], deaths: [], boss: [], sec: [], cleared: 0, cp: 0, lv: 0 };
      for (let i = 0; i < RUNS; i++) {
        const r = await one(c, arm);
        if (r.err) { console.log('  ' + c.dun + ' — ' + r.err); continue; }
        acc.ratio.push(r.ratio); acc.deaths.push(r.deaths); acc.boss.push(r.bossSeen);
        if (r.cleared) { acc.cleared++; acc.sec.push(r.sec); }
        acc.cp = r.cp; acc.lv = r.lv;
        await page.waitForTimeout(40);
      }
      res[arm] = { ratio: avg(acc.ratio), deaths: avg(acc.deaths), boss: avg(acc.boss),
                   sec: avg(acc.sec), cleared: acc.cleared, cp: acc.cp, lv: acc.lv };
    }
    rows.push({ c, res });
  }

  console.log('\n178 던전 런 밸런스 — RUNS=' + RUNS + '/팔 · 판당 30초(step 1800틱) · «cp ≥ 요구 전투력» 인 플레이어');
  console.log('  케이스            훈련Lv   dmg/need(off→on)     클리어(off→on)   클리어초(off→on)   사망(off→on)  보스');
  for (const r of rows) {
    const o = r.res.off, n = r.res.on;
    console.log('  ' + ('S' + r.c.stage + ' ' + r.c.dun + ' ' + r.c.f + '층').padEnd(18)
      + String(o.lv).padStart(5)
      + ('   ' + o.ratio.toFixed(3) + ' → ' + n.ratio.toFixed(3)).padEnd(19)
      + ('  ' + o.cleared + '/' + RUNS + ' → ' + n.cleared + '/' + RUNS).padEnd(16)
      + ('  ' + o.sec.toFixed(1) + 's → ' + n.sec.toFixed(1) + 's').padEnd(19)
      + ('  ' + o.deaths.toFixed(1) + ' → ' + n.deaths.toFixed(1)).padEnd(14)
      + n.boss.toFixed(1).padStart(5));
  }
  if (errs.length) console.log('\n  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  else console.log('\n  콘솔 에러 0건');
  await browser.close();
})();
