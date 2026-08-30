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

  /* ⚑ 425 이관(2026-08-30) — **«시간은 언제나 흐른다» 는 전제가 깨졌다.**
     주인 지시로 던전은 «보스가 서고 등장 국면이 끝난 뒤» 부터 제한 시간이 흐른다(`dunRun.fight`).
     아래 [E] 는 `dunRun.t = 0.005` 한 줄로 시간 초과를 만드는데, 국면 전에는 t 가 한 프레임도
     안 깎이므로 그 표본이 통째로 «영원히 안 끝나는 런» 이 됐다.
     ⚠ 항을 눌러 초록으로 되돌리지 않는다(LESSONS 328) — **표본을 살아 있는 자리로 옮기고**,
        «국면 중에는 시간 초과가 안 일어난다» 를 묻는 항을 [E-0] 으로 **새로 세운다**.
     표본을 옮기는 절차는 각 [E] 블록 **안에서** 돈다 — 이 게이트는 rAF 를 얼리지 않아
     evaluate 경계에 실제 루프가 끼어들기 때문이다(그 함정은 [E] 첫 블록 주석에 적어 두었다). */

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

  /* ⚑ 331 이관 — 옛 제목은 «소환 눈금(요구 피해 × DUN_BOSS_P)을 채우면 … 보스로 선다» 였다.
     몹 국면이 폐지돼 «채운다» 는 행위 자체가 없어졌으므로 단언을 **지우지 않고** 그 부류로 옮긴다
     (LESSONS 317-②): 재는 것은 그대로 «그 카드의 몬스터가 보스로 서는가» 이고, 세우는 계기만
     «눈금을 채웠다» → «입장했다» 로 바뀌었다. 아래에서 dmg 를 건드리지 않는 것이 곧 그 증명이다. */
  console.log('\n[B] 던전에 입장하면 그 카드의 몬스터가 보스로 선다 (331 — 눈금 없이)');
  for (const id of DUNS) {
    const p = await prep(id, { fill: null });
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(async ([did]) => {
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      const u = DUN_UI[did];
      /* 257 — 보스가 여럿인 던전이 생겼다. 체력은 **머릿수로 나뉜** 값이고 총량만 0.3 이다
         (index.html «결정 ②» — 수는 연출 축이지 난이도 축이 아니다). 그래서 이 절은
         «1마리 = 0.3» 이 아니라 «1마리 = 0.3/bn · 동시 등장 합 = 0.3» 을 잰다. */
      const bs = enemies.filter((e) => e.tk === 'dunboss');
      return { seen: !!b, atlas: b && b.T.atlas, want: u && u.thk,
               hpk: b ? b.max / dunRun.need : null,
               bn: dunRun.bossN, mode: dunRun.bossMode, up: bs.length,
               sumk: bs.reduce((s, e) => s + e.max, 0) / dunRun.need,
               bossIn: dunRun.bossIn };
    }, [id]);
    r.seen ? ok(id + ' — 보스가 섰다 (' + r.atlas + ')') : no(id + ' — 보스가 안 선다');
    is(id + ' — 보스 아틀라스 = 카드 썸네일 아틀라스', r.atlas, r.want);
    if (r.hpk != null) near(id + ' — 보스 1마리 체력 / 요구 피해 (보스 ' + r.bn + '마리)', r.hpk, 0.3 / r.bn, 0.001);
    /* 257 — «동시» 던전은 첫 국면에 bn 마리가 한꺼번에 서고 그 체력 합이 0.3 이다.
       «페이즈» 는 1마리씩이라 합이 0.3/bn 이고, 나머지는 잡을 때마다 뒤에 선다([C] 가 잰다). */
    is(id + ' — 첫 국면 등장 수 (' + r.mode + ')', r.up, r.mode === 'all' ? r.bn : 1);
    near(id + ' — 첫 국면 보스 체력 합 / 요구 피해', r.sumk, r.mode === 'all' ? 0.3 : 0.3 / r.bn, 0.001);
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
      /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (!b) return { err: '보스 없음' };
      /* 257 — «전부» 잡아야 클리어다. 한 마리를 잡고도 깃발이 서면 안 되고(아래 mid),
         남은 마리(동시는 필드에, 페이즈는 다음 국면)를 마저 잡으면 그때 선다. */
      const bn = dunRun.bossN;
      killEnemy(b);
      const mid = !!(dunRun && dunRun.bossDown);       /* 1마리째 격파 직후의 깃발 */
      for (let g = 0; g < 400 && dunRun && !dunRun.bossDown; g++) {
        const nb = enemies.find((e) => e.tk === 'dunboss');
        if (nb) { killEnemy(nb); continue; }
        dunBossTick();                                 /* 페이즈 — 다음 보스를 세운다 */
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
      }
      const down = !!(dunRun && dunRun.bossDown);
      /* ⚑ 332 이관 — 옛 단언은 «격파 **다음 틱에** 런이 끝난다» 였다. 332 가 그 사이에
         «터짐 → 클리어 → 1초» 시퀀스를 넣었으므로 단언을 지우지 않고 **두 개로 가른다**
         (LESSONS 317-②): ⓐ 다음 틱에는 **아직** 안 끝난다(시퀀스가 실재한다) ⓑ 시퀀스를
         끝까지 돌리면 그때 끝난다(옛 단언이 재던 «격파 → 클리어» 는 그대로 살아 있다). */
      const seqSec = dunRun ? dunRun.clrDie + DUN_CLR_HOLD : 0;
      step(1 / 60);
      const run1 = !!dunRun;                          /* ⓐ 격파 다음 틱 — 시퀀스 중이라 살아 있어야 한다 */
      for (let g = 0; g < 600 && dunRun; g++) step(1 / 60);   /* ⓑ 시퀀스를 끝까지 */
      giveReward = origGive;
      const rw = d.rw(f0), key = Object.keys(rw)[0];
      return { down, mid, bn, run1, seqSec, run: !!dunRun, f1: S.dun[did],
               rwKey: key, paid: paid ? paid[key] : null, want: rw[key],
               cls: document.getElementById('app').classList.contains('dunrun') };
    }, [id, p.f]);
    if (r.err) { no(id + ' — ' + r.err); await cleanup(); continue; }
    /* 257 — 보스가 여럿인 던전은 1마리째 격파로 클리어되면 안 된다(«전부 잡아야 클리어») */
    is(id + ' — 1마리째 격파로는 안 끝난다 (보스 ' + r.bn + '마리)', r.mid, r.bn <= 1);
    is(id + ' — 격파가 bossDown 깃발을 세운다', r.down, true);
    is(id + ' — 격파 다음 틱에는 아직 안 끝난다 (332 시퀀스 ' + (+r.seqSec).toFixed(2) + '초)', r.run1, true);
    is(id + ' — 시퀀스가 끝나면 런이 끝난다', r.run, false);
    is(id + ' — .dunrun 해제', r.cls, false);
    is(id + ' — 층 해금 ' + p.f + '→' + r.f1, r.f1, p.f + 1);
    (r.paid != null && Math.abs(r.paid - r.want) < 1e-6)
      ? ok(id + ' — 보상 ' + r.rwKey + ' ' + Math.round(r.want) + ' 지급(giveReward 실호출)')
      : no(id + ' — 보상 ' + r.rwKey + ' 이상 · 기대 ' + r.want + ' · 실제 ' + r.paid);
    await cleanup();
  }

  console.log('\n[D] 던전 보스 체력바 — «보스 체력이 얼마나 남았나» 를 그린다 (30 측정표 폭 574px)');
  {
    const p = await prep('gold', { fill: null });
    const r = await page.evaluate(async () => {
      const w = () => { drawDunHud(); return parseFloat(document.getElementById('dunBarF').style.width); };
      const out = {};
      /* ⚑ 331 이관 — 옛 [D] 는 «앞 0.30 = 소환 눈금(누적 피해) · 뒤 0.70 = 보스 체력» 두 국면 눈금을
         쟀다. 몹 국면이 폐지돼 앞 국면이 없어졌으므로 단언을 지우지 않고 **뒤집어** 옮긴다
         (LESSONS 317-②·295-②): 옛 «누적 피해가 바를 민다» 를 이제 **«누적 피해는 바를 못 민다»** 로
         잰다 — 30% 를 남겨 두면 보스가 서기도 전에 바가 30% 차 있는 거짓 눈금이 되고, 그 회귀를
         잡는 것이 이 절의 새 일이다. 뒷 구간(보스 체력)은 0.70 배율이 빠져 0→1 전 구간이 됐다.
         ⚑ **338 이관 — 방향이 뒤집혔다.** 이 바는 39 보스전 체력바(`#bossHp`)와 **같은 부품**이라
         «남은 체력» 을 그린다(측정표 30 §1·§4-4). 331 이 세운 «누적 피해는 바를 못 민다» 는
         한 항도 안 없어지고 **기준선만** 0px → 574px(만피) 로 옮겨 간다 — 옛 눈금이 되살아나면
         여기서 그대로 걸린다. 바뀌는 것은 «어느 쪽이 가득인가» 뿐이고, 폐지된 눈금을 재는
         항 자체는 살려 둔다(LESSONS 328 — 눌러서 초록으로 만들지 말고 뜻을 옮긴다). */
      dunRun.dmg = 0;                       out.zero = w();
      dunRun.dmg = dunRun.need * 0.15;      out.half1 = w();
      dunRun.dmg = dunRun.need * 0.30;      out.gate = w();
      dunRun.dmg = dunRun.need * 5;                out.over = w();   /* 요구치를 5배 넘겨도 바는 만피다 */
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      b.hp = b.max * 0.5;                   out.bossHalf = w();
      b.hp = 1;                             out.bossLow = w();
      dunRun.bossDown = true;               out.down = w();
      return out;
    });
    near('338 — 보스가 서기 전(등장 딜레이) = 만피 574px', r.zero, 574, 0.5);
    near('331 — 누적 피해 15% 로는 바가 안 움직인다', r.half1, 574, 0.5);
    near('331 — 옛 소환 눈금(30%) 에 닿아도 바가 안 움직인다', r.gate, 574, 0.5);
    near('331 — 요구치를 5배 넘겨도 바는 만피다 (앞 국면 잔재 없음)', r.over, 574, 0.5);
    near('331 — 보스 체력 절반 = 574 × 0.5 (옛 0.3+0.7×0.5 가 아니다)', r.bossHalf, 574 * 0.5, 1);
    (r.bossLow < r.bossHalf) ? ok('338 — 보스 체력이 줄수록 바가 줄어든다 (' + r.bossHalf.toFixed(0) + ' → ' + r.bossLow.toFixed(0) + 'px)')
                             : no('338 — 보스 체력이 줄어도 바가 안 깎인다 (' + r.bossHalf.toFixed(0) + ' → ' + r.bossLow.toFixed(0) + 'px)');
    near('338 — 격파 = 다 깎임 0px (주인 보고의 그 자리)', r.down, 0, 0.5);
    await cleanup();
  }

  console.log('\n[E] 실패 — 시간 초과면 층이 안 오르고, 통보가 «보스» 를 말한다');
  {
    const p = await prep('gold', { fill: null });
    /* ⚠ [E-0]·[E] 를 **한 evaluate 안에서** 끝낸다. 이 게이트는 rAF 를 얼리지 않으므로 evaluate 사이에
       실제 게임 루프가 돈다 — `t = 0.005 · fight = true` 로 둔 채 evaluate 를 나가면 그 사이에 런이
       끝나 다음 블록이 `dunRun` null 을 만진다(1차 실측에서 정확히 그렇게 터졌다). */
    const r = await page.evaluate(async ([f0]) => {
      let msg = '', introSeen = 0, g = 0;
      /* 425 — [E-0] 음성항. 등장 국면(과 그 앞 스폰 딜레이) 동안에는 t 가 0.005 여도 시간 초과가 없다.
         이 항이 없으면 아래 [E] 를 «국면 뒤로 옮긴 것» 이 무른 수리인지 규약인지 구분되지 않는다. */
      dunRun.t = 0.005;
      for (let i = 0; i < 60 && dunRun && !dunRun.fight; i++) { if (dunRun.introOn) introSeen++; step(1 / 60); }
      const e0 = { run: !!dunRun, t: dunRun ? dunRun.t : null };
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      while (dunRun && !dunRun.fight && g++ < 900) { if (dunRun.introOn) introSeen++; step(1 / 60); }
      const fight = !!(dunRun && dunRun.fight);
      const on = notify; notify = function (m) { msg = String(m); return on.apply(this, arguments); };
      if (dunRun) { dunRun.t = 0.005; step(1 / 60); }
      notify = on;
      return { e0, fight, introSeen, frames: g, run: !!dunRun, f1: S.dun.gold, f0, msg };
    }, [p.f]);
    is('[E-0] 425 — 등장 국면 전/중에는 t=0.005 여도 런이 안 끝난다', r.e0.run, true);
    is('[E-0] 그 구간 동안 t 는 한 프레임도 안 깎인다', r.e0.t, 0.005);
    is('[E-0] 국면을 지나 전투가 시작됐다 (' + r.frames + '프레임 · 국면 ' + r.introSeen + '프레임)', r.fight, true);
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
      /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      /* 425 — 등장 국면이 끝날 때까지 흘린다(그 전에는 t 가 안 깎여 «시간 초과 실패» 자체가 없다) */
      for (let i = 0; i < 900 && dunRun && !dunRun.fight; i++) step(1 / 60);
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

  /* 264(2026-08-27, 저장소 주인 지시 «시련의 탑도 보스가 떠야 하는 거고») — 탑도 255 판정으로 넘어왔다.
     255 가 여기에 «탑은 옛 누적 피해 판정 그대로» 로 못박아 둔 두 단언을 **뒤집는다**:
       ① 요구 피해를 다 채워도 그것만으로는 클리어가 아니다(런이 계속된다 · 층 불변)
       ② 보스를 잡은 그 틱에 클리어된다(층 +1)
     ⚠ 근거를 손으로 적지 않는다 — 탑도 던전과 **같은 경로**(killEnemy → bossDown → step)를 탄다는
       사실 자체를 재는 것이라, 아래 절차는 [B] 던전 절과 한 글자도 다르지 않다. */
  console.log('\n[F] 264 — 탑(209·210)도 «보스 격파 = 클리어» 다');
  for (const tid of ['tower', 'despair']) {
    const r = await page.evaluate(async ([id]) => {
      localStorage.clear(); Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      challengeTower(id);
      if (!dunRun) return { err: 'challengeTower 실패' };
      const t = dunRun.d, f0 = towerFloor(t);
      /* ① 요구 피해를 통째로 채워 본다 — 옛 판정이면 여기서 끝났다 */
      dunRun.dmg = dunRun.need;
      step(1 / 60);
      const mid = { run: !!dunRun, f: towerFloor(t) };
      if (!dunRun) return { err: '요구 피해만으로 런이 끝났다(옛 판정이 남아 있다)', f0, mid };
      /* ② 보스를 실제로 세우고 잡는다 */
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (!b) return { err: '탑에 보스가 안 선다', f0, mid };
      const bn = dunRun.bossN;
      /* 332 — 탑도 같은 시퀀스를 탄다(던전 계열). 격파 다음 틱에는 아직 «연출 중» 이고,
         시퀀스를 끝까지 돌려야 완료 화면·층 해금이 온다 — [C] 와 같은 이관이다. */
      killEnemy(b); step(1 / 60);
      const run1 = !!dunRun;
      for (let g = 0; g < 600 && dunRun; g++) step(1 / 60);
      return { f0, mid, bn, run1, run: !!dunRun, f1: towerFloor(t) };
    }, [tid]);
    if (r.err) { no(tid + ' — ' + r.err); continue; }
    is(tid + ' — 보스가 1마리다 (층 하나 = 보스 하나)', r.bn, 1);
    is(tid + ' — ① 요구 피해를 채워도 런이 계속된다', r.mid.run, true);
    is(tid + ' — ① 그때 층은 그대로 ' + r.f0, r.mid.f, r.f0);
    is(tid + ' — ② 격파 다음 틱에는 아직 안 끝난다 (332 시퀀스)', r.run1, true);
    is(tid + ' — ② 시퀀스가 끝나면 런 종료', r.run, false);
    is(tid + ' — ② 층 ' + r.f0 + '→' + r.f1, r.f1, r.f0 + 1);
    await cleanup();
  }

  console.log('\n[G] 회귀 — 던전 보스 격파가 스테이지를 건드리지 않는다 (178 의 단언)');
  {
    await prep('gold', { fill: null });
    const r = await page.evaluate(async () => {
      const st = S.stage;
      /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
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
