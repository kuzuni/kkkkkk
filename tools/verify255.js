/* 255 — 「던전에 보스가 없다 — 들어가자마자 보스 없이 바로 클리어된다」 기능 게이트.
   178 이 던전 런에 «보스 개체» 를 넣었지만 **클리어 판정은 여전히 «누적 피해 ≥ 요구 피해»** 여서
   보스를 잡지 않고 런이 끝났다(tools/probe255.js — 6케이스 × 두 배율 전부 «보스 격파 0판»).
   255 는 그 판정을 **보스 격파**로 바꾼다. 이 게이트가 보는 것은 «판정이 실제로 그렇게 도는가» 다.

   ROUTINE.md «기능 완성 규칙» 의 기능 체크 표 — 버튼별 «눌렀을 때 무엇이 바뀌는지» 를
   던전 **8종 전부**(gold·dia·relic1~4·stone·rstone)에 대해 헤드리스로 확인한다.

   실행: node tools/verify255.js
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(1) + ' (기대 ' + want + ', Δ' + Math.abs(got - want).toFixed(1) + ')')
  : no(m + ' = ' + (+got).toFixed(1) + ' — 기대 ' + want + ' (허용 ' + tol + ')'));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 던전 하나를 «보스 국면 직전» 까지 세우는 공용 준비 절차.
     전투를 실시간으로 돌리지 않고 눈금(dmg)만 채워 국면 판정을 태운다 — 밸런스는 probe255 의 몫이다. */
  const prep = (dunId, opt) => page.evaluate(([id, o]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    const d = DUNGEONS.find((x) => x.id === id);
    S.dunTk[d.id] = 9;
    /* 잠금 해제 — relic2~4 는 «앞 단 던전 n층 클리어»(DUN_UI[id].pre)가 조건이라
       그것을 안 풀면 challengeDungeon 이 조용히 되돌아간다(1차 실측에서 3종이 «startDunRun 실패»). */
    for (let i = 0; i < 8; i++) {
      const u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    const f = S.dun[d.id];
    challengeDungeon(d);
    if (!dunRun) return { err: 'startDunRun 실패' };
    if (o.fill != null) dunRun.dmg = dunRun.need * o.fill;
    if (o.tick) { dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60); }
    return { f, need: dunRun.need };
  }, [dunId, opt || {}]);

  const cleanup = () => page.evaluate(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
  });

  const DUNS = await page.evaluate(() => DUNGEONS.map((d) => d.id));

  console.log('\n[A] 요구 피해만으로는 클리어되지 않는다 (255 의 핵심 — 던전 8종)');
  for (const id of DUNS) {
    const p = await prep(id, { fill: 10 });          /* 요구치를 열 배로 채운다 */
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) step(1 / 60);
      return { run: !!dunRun, dmg: dunRun ? dunRun.dmg / dunRun.need : null };
    });
    r.run ? ok(id + ' — 누적 피해 ' + (r.dmg || 0).toFixed(0) + '배인데도 런이 계속된다')
          : no(id + ' — 누적 피해만으로 런이 끝났다(옛 판정이 살아 있다)');
    await cleanup();
  }

  console.log('\n[B] 소환 눈금(요구 피해 × DUN_BOSS_P)을 채우면 그 카드의 몬스터가 보스로 선다');
  for (const id of DUNS) {
    const p = await prep(id, { fill: null });
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(async ([did]) => {
      dunRun.dmg = dunRun.need * DUN_BOSS_P;
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      const u = DUN_UI[did];
      return { seen: !!b, atlas: b && b.T.atlas, want: u && u.thk, hpk: b ? b.max / dunRun.need : null, bossIn: dunRun.bossIn };
    }, [id]);
    r.seen ? ok(id + ' — 보스가 섰다 (' + r.atlas + ')') : no(id + ' — 보스가 안 선다');
    is(id + ' — 보스 아틀라스 = 카드 썸네일 아틀라스', r.atlas, r.want);
    if (r.hpk != null) near(id + ' — 보스 체력 / 요구 피해', r.hpk, 0.3, 0.001);
    is(id + ' — bossIn 깃발이 섰다', r.bossIn, true);
    await cleanup();
  }

  console.log('\n[C] 보스를 격파하면 그 자리에서 클리어 — 층 해금 + 보상 지급');
  for (const id of DUNS) {
    const p = await prep(id, { fill: null });
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(async ([did, f0]) => {
      const d = DUNGEONS.find((x) => x.id === did);
      /* 보상 지급은 giveReward 한 곳을 지난다 — 전투 골드(killEnemy 의 `S.gold += e.gold`)가
         섞이지 않게 «그 함수에 무엇이 넘어갔는가» 로 본다(1차 실측에서 gold 던전이 +19% 로 보였다). */
      let paid = null;
      const origGive = giveReward;
      giveReward = function (rw) { if (paid === null) paid = rw; return origGive.apply(this, arguments); };
      dunRun.dmg = dunRun.need * DUN_BOSS_P;
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (!b) return { err: '보스 없음' };
      killEnemy(b);
      const down = !!(dunRun && dunRun.bossDown);
      step(1 / 60);                                   /* 판정은 step() 던전 분기가 한다 */
      giveReward = origGive;
      const rw = d.rw(f0), key = Object.keys(rw)[0];
      return { down, run: !!dunRun, f1: S.dun[did],
               rwKey: key, paid: paid ? paid[key] : null, want: rw[key],
               cls: document.getElementById('app').classList.contains('dunrun') };
    }, [id, p.f]);
    if (r.err) { no(id + ' — ' + r.err); await cleanup(); continue; }
    is(id + ' — 격파가 bossDown 깃발을 세운다', r.down, true);
    is(id + ' — 격파 다음 틱에 런이 끝난다', r.run, false);
    is(id + ' — .dunrun 해제', r.cls, false);
    is(id + ' — 층 해금 ' + p.f + '→' + r.f1, r.f1, p.f + 1);
    (r.paid != null && Math.abs(r.paid - r.want) < 1e-6)
      ? ok(id + ' — 보상 ' + r.rwKey + ' ' + Math.round(r.want) + ' 지급(giveReward 실호출)')
      : no(id + ' — 보상 ' + r.rwKey + ' 이상 · 기대 ' + r.want + ' · 실제 ' + r.paid);
    await cleanup();
  }

  console.log('\n[D] 진행바 — «클리어까지 얼마나 왔나» 를 그린다 (30 측정표 폭 574px)');
  {
    const p = await prep('gold', { fill: null });
    const r = await page.evaluate(async () => {
      const w = () => { drawDunHud(); return parseFloat(document.getElementById('dunBarF').style.width); };
      const out = {};
      dunRun.dmg = 0;                       out.zero = w();
      dunRun.dmg = dunRun.need * DUN_BOSS_P * 0.5; out.half1 = w();
      dunRun.dmg = dunRun.need * DUN_BOSS_P;       out.gate = w();
      dunRun.dmg = dunRun.need * 5;                out.over = w();   /* 눈금을 넘겨도 앞 국면에서 멈춘다 */
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      b.hp = b.max * 0.5;                   out.bossHalf = w();
      b.hp = 1;                             out.bossLow = w();
      dunRun.bossDown = true;               out.down = w();
      return out;
    });
    near('빈 런 = 0px', r.zero, 0, 0.5);
    near('소환 눈금 절반 = 574 × 0.3 × 0.5', r.half1, 574 * 0.3 * 0.5, 1);
    near('소환 눈금 도달 = 574 × 0.3', r.gate, 574 * 0.3, 1);
    near('눈금을 5배 넘겨도 앞 국면에서 멈춘다', r.over, 574 * 0.3, 1);
    near('보스 체력 절반 = 574 × (0.3 + 0.7×0.5)', r.bossHalf, 574 * 0.65, 1);
    (r.bossLow > r.bossHalf) ? ok('보스 체력이 줄수록 바가 찬다 (' + r.bossHalf.toFixed(0) + ' → ' + r.bossLow.toFixed(0) + 'px)')
                             : no('보스 체력이 줄어도 바가 안 찬다');
    near('격파 = 꽉 참 574px', r.down, 574, 0.5);
    await cleanup();
  }

  console.log('\n[E] 실패 — 시간 초과면 층이 안 오르고, 통보가 «보스» 를 말한다');
  {
    const p = await prep('gold', { fill: null });
    const r = await page.evaluate(async ([f0]) => {
      let msg = '';
      const on = notify; notify = function (m) { msg = String(m); return on.apply(this, arguments); };
      dunRun.t = 0.005; step(1 / 60);
      notify = on;
      return { run: !!dunRun, f1: S.dun.gold, f0, msg };
    }, [p.f]);
    is('시간 초과 → 런 종료', r.run, false);
    is('층 유지 (' + r.f1 + ')', r.f1, p.f);
    /보스\s*(미등장|체력)/.test(r.msg.replace(/<[^>]+>/g, '')) ? ok('실패 통보가 보스를 말한다 — «' + r.msg.replace(/<[^>]+>/g, '') + '»')
                                                              : no('실패 통보가 옛 «피해 n/m» 그대로다 — «' + r.msg + '»');
    await cleanup();
  }
  {
    const p = await prep('gold', { fill: null });
    const r = await page.evaluate(async () => {
      let msg = '';
      dunRun.dmg = dunRun.need * DUN_BOSS_P;
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      b.hp = b.max * 0.4;
      const on = notify; notify = function (m) { msg = String(m); return on.apply(this, arguments); };
      dunRun.t = 0.005; step(1 / 60);
      notify = on;
      return { msg };
    });
    /보스 체력 40% 남음/.test(r.msg.replace(/<[^>]+>/g, '')) ? ok('보스를 잡다 만 실패는 남은 체력을 말한다 — «' + r.msg.replace(/<[^>]+>/g, '') + '»')
                                            : no('남은 체력 통보 이상 — «' + r.msg + '»');
    await cleanup();
  }

  console.log('\n[F] 회귀 — 탑(209·210)은 옛 «누적 피해» 판정 그대로다 (264 의 몫)');
  for (const tid of ['tower', 'despair']) {
    const r = await page.evaluate(async ([id]) => {
      localStorage.clear(); Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      challengeTower(id);
      if (!dunRun) return { err: 'challengeTower 실패' };
      const t = dunRun.d, f0 = towerFloor(t);
      dunRun.dmg = dunRun.need;
      step(1 / 60);
      return { run: !!dunRun, f0, f1: towerFloor(t) };
    }, [tid]);
    if (r.err) { no(tid + ' — ' + r.err); continue; }
    is(tid + ' — 요구 피해 충족 → 클리어(옛 판정 유지)', r.run, false);
    is(tid + ' — 층 ' + r.f0 + '→' + r.f1, r.f1, r.f0 + 1);
    await cleanup();
  }

  console.log('\n[G] 회귀 — 던전 보스 격파가 스테이지를 건드리지 않는다 (178 의 단언)');
  {
    await prep('gold', { fill: null });
    const r = await page.evaluate(async () => {
      const st = S.stage;
      dunRun.dmg = dunRun.need * DUN_BOSS_P;
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      killEnemy(b);
      return { win: stageWin, on: bossOn, farm: S.bossFarm, st, now: S.stage };
    });
    is('stageWin 이 안 선다', r.win, false);
    is('bossOn 이 안 선다', r.on, false);
    is('S.bossFarm 불변', r.farm, false);
    is('스테이지 불변 (' + r.st + ')', r.now, r.st);
    await cleanup();
  }

  console.log('\n[H] 콘솔 에러');
  errs.length ? errs.forEach((e) => no('콘솔: ' + e)) : ok('콘솔 에러 0건');

  await ctx.close(); await browser.close();
  console.log('\nVERIFY255 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})();
