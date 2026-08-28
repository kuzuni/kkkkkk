/* 257 — 「던전 종류 — 보스 1/2/3마리 + 등장 방식 «한꺼번에»·«페이즈»」 기능 게이트.
   지시 원문: «보스 1개짜리 던전, 2개짜리 던전, 3개짜리 던전 그런 거 만들라 했는데 /
   던전 보스들 한꺼번에 등장이랑 / 페이즈 식으로 등장하는 것도 만들라 했음».

   ROUTINE.md «기능 완성 규칙» — «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
   HUD·다른 화면에 반영됨» 을 잰다. 그래서 이 게이트는 데이터(표)만 보지 않고 **런을 돌려**
   ① 표에 적힌 수만큼 실제로 서는지 ② 방식대로 서는지(동시=한꺼번에 / 페이즈=1마리씩)
   ③ 전부 잡아야 클리어인지 ④ 총 체력·총 공격력이 보스 1마리 때와 같은지(결정 ②)
   ⑤ 진행바·타이틀 ●●○ 가 그것을 반영하는지 ⑥ 04 세부 팝업이 «보스 n (동시/순차)» 를 말하는지
   ⑦ 동시 등장 보스가 서로 겹쳐 서지 않는지 를 본다.

   실행: node tools/verify257.js
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

  /* 던전 하나를 «보스 국면 직전» 까지 세운다 — verify255 의 prep 과 같은 절차(같은 자를 쓴다) */
  const prep = (dunId) => page.evaluate(([id]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    const d = DUNGEONS.find((x) => x.id === id);
    S.dunTk[d.id] = 9;
    for (let i = 0; i < 8; i++) {
      const u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    const f = S.dun[d.id];
    challengeDungeon(d);
    if (!dunRun) return { err: 'startDunRun 실패' };
    return { f, need: dunRun.need, bn: dunRun.bossN, mode: dunRun.bossMode };
  }, [dunId]);

  const cleanup = () => page.evaluate(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    if (typeof closeModal === 'function') closeModal();
  });

  const DUNS = await page.evaluate(() => DUNGEONS.map((d) => d.id));

  /* ── [1] 표 — 여덟 던전이 «1/2/3 마리» 와 «동시/페이즈» 를 **둘 다** 덮는가 ───────────── */
  console.log('\n[1] 데이터 — 보스 수 1·2·3 과 등장 방식 2종이 전부 실재한다');
  const tbl = await page.evaluate(() => DUNGEONS.map((d) => ({
    id: d.id, bn: dunBossN(d), mode: dunBossMd(d), tag: dunBossTag(d), atOnce: dunBossAtOnce(d)
  })));
  for (const t of tbl) console.log('       ' + t.id.padEnd(8) + ' 보스 ' + t.bn + ' · ' + t.mode + t.tag);
  const ns = new Set(tbl.map((t) => t.bn));
  for (const n of [1, 2, 3]) (ns.has(n) ? ok : no)('보스 ' + n + '마리 던전이 있다');
  for (const m of ['all', 'phase']) {
    const has = tbl.some((t) => t.bn > 1 && t.mode === m);
    (has ? ok : no)('«' + (m === 'all' ? '한꺼번에' : '페이즈') + '» 등장 던전이 있다');
  }
  is('보스 수는 1~3 안에 든다', tbl.every((t) => t.bn >= 1 && t.bn <= 3), true);
  is('동시 등장 수 = 동시면 bn · 페이즈면 1', tbl.every((t) => t.atOnce === (t.mode === 'all' ? t.bn : 1)), true);
  /* 탑(209·210)은 264 의 몫이라 1마리·페이즈 그대로여야 한다 */
  const tw = await page.evaluate(() => TOWERS.map((t) => ({ id: t.id, bn: dunBossN(t), mode: dunBossMd(t) })));
  is('탑은 1마리 그대로다(264 의 몫)', tw.every((t) => t.bn === 1), true);

  /* ── [2] 런 — 표에 적힌 수·방식대로 «실제로» 선다 ─────────────────────────────────── */
  console.log('\n[2] 런 — 표대로 스폰된다 (등장 방식이 실제로 갈린다)');
  for (const id of DUNS) {
    const p = await prep(id);
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(() => {
      /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const bs = enemies.filter((e) => e.tk === 'dunboss');
      return { up: bs.length, bn: dunRun.bossN, mode: dunRun.bossMode,
               sumHp: bs.reduce((s, e) => s + e.max, 0), need: dunRun.need,
               sumDmg: bs.reduce((s, e) => s + e.dmg, 0), oneDmg: bs.length ? bs[0].dmg : 0,
               eDmg: eDmg(S.stage), dmgk: DUN_BOSS_DMGK, hpk: DUN_BOSS_HPK };
    });
    is(id + ' — 첫 국면 등장 수 (보스 ' + r.bn + ' · ' + r.mode + ')', r.up, r.mode === 'all' ? r.bn : 1);
    /* 결정 ② — «동시» 던전의 첫 국면 총 체력·총 공격력은 보스 1마리 던전과 **같다** */
    if (r.mode === 'all') {
      near(id + ' — 동시 등장 총 체력 / 요구 피해', r.sumHp / r.need, r.hpk, 0.002);
      near(id + ' — 동시 등장 총 공격력 / eDmg', r.sumDmg / r.eDmg, r.dmgk, 0.002);
    } else {
      near(id + ' — 페이즈 1마리 공격력 / eDmg', r.oneDmg / r.eDmg, r.dmgk, 0.002);
    }
    await cleanup();
  }

  /* ── [3] 클리어 — «전부» 잡아야 끝난다 · 페이즈는 잡을 때마다 다음이 선다 ──────────── */
  console.log('\n[3] 클리어 판정 — n 마리를 전부 잡아야 끝난다');
  for (const id of DUNS) {
    const p = await prep(id);
    if (p.err) { no(id + ' — ' + p.err); continue; }
    const r = await page.evaluate(() => {
      /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const bn = dunRun.bossN, seen = [];
      const downs = [];
      let guard = 0;
      while (dunRun && !dunRun.bossDown && guard++ < 400) {
        seen.push(enemies.filter((e) => e.tk === 'dunboss').length);
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (b) { killEnemy(b); downs.push(dunRun ? !!dunRun.bossDown : true); continue; }
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
      }
      const killed = dunRun ? dunRun.bossKilled : bn;
      const down = !!(dunRun && dunRun.bossDown);
      const maxAtOnce = Math.max.apply(null, seen.concat([0]));
      /* 마지막 격파에서만 깃발이 서야 한다 = downs 의 앞 n-1 개는 전부 false */
      const early = downs.slice(0, -1).some(Boolean);
      /* 332 이관 — «전부 잡으면 끝난다» 앞에 «터짐 → 클리어 → 1초» 시퀀스가 들어갔다.
         한 틱으로는 아직 안 끝나고(seq), 시퀀스를 다 돌리면 끝난다(ended). */
      step(1 / 60);
      const seq = !!dunRun;
      for (let g = 0; g < 600 && dunRun; g++) step(1 / 60);
      return { bn, killed, down, maxAtOnce, early, seq, ended: !dunRun };
    });
    is(id + ' — 격파 수 = 보스 수', r.killed, r.bn);
    is(id + ' — 마지막 한 마리에서만 클리어 깃발', r.early, false);
    is(id + ' — 332 — 전부 잡은 다음 틱에는 아직 시퀀스 중', r.seq, true);
    is(id + ' — 전부 잡고 시퀀스가 끝나면 런이 끝난다', r.ended, true);
    is(id + ' — 동시에 선 최대 수', r.maxAtOnce, (await page.evaluate(([i]) =>
      dunBossMd(DUNGEONS.find((x) => x.id === i)) === 'all'
        ? dunBossN(DUNGEONS.find((x) => x.id === i)) : 1, [id])));
    await cleanup();
  }

  /* ── [4] HUD — 진행바가 «보스 체력 합» 이고, 타이틀 ●●○ 가 남은 수를 말한다 ─────────── */
  console.log('\n[4] HUD 반영 — 진행바(574px) · 타이틀 ●●○');
  {
    const id = (await page.evaluate(() => DUNGEONS.map((d) => d.id)
      .find((i) => dunBossN(DUNGEONS.find((x) => x.id === i)) === 3)));
    const p = await prep(id);
    if (p.err) no(id + ' — ' + p.err);
    else {
      const r = await page.evaluate(() => {
        const out = { bn: dunRun.bossN };
        const W = 574, w = () => parseFloat(getComputedStyle(document.getElementById('dunBarF')).width);
        const ttl = () => document.getElementById('dunTtl').textContent;
        /* ⚑ 331 이관 — 옛 두 줄은 «소환 눈금 절반·도달» 에서 바가 574×0.3×0.5·574×0.3 이라는
           **앞 국면 눈금**을 쟀다. 몹 국면이 폐지돼 앞 국면이 없으므로 같은 두 표본을
           «누적 피해는 바를 못 민다»(둘 다 0px)로 뒤집어 옮긴다 — 앞 국면 잔재의 회귀 잠금이다.
           ⚑ 338 이관 — 바가 «남은 보스 체력» 이 됐다(39 보스 체력바와 같은 부품·같은 방향).
           «누적 피해는 못 민다» 는 항 그대로이고 **기준선만** 0px → 574px(만피) 로 옮긴다.
           «3마리 중 1마리 격파» 도 «찬 폭 1/3» 이 아니라 **«남은 폭 2/3»** 로 읽는다. */
        dunRun.dmg = dunRun.need * 0.15; drawDunHud(); out.half1 = w();
        dunRun.dmg = dunRun.need * 0.30; drawDunHud(); out.gate = w();
        out.ttl0 = ttl();
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60); drawDunHud();
        out.ttlA = ttl();
        /* 1마리 격파 — 3마리 중 1 이 빠지면 «보스 체력 합» 이 1/3 준다 */
        const b = enemies.find((e) => e.tk === 'dunboss');
        killEnemy(b);
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60); drawDunHud();
        out.after1 = w(); out.ttlB = ttl();
        out.W = W;
        return out;
      });
      near('331 — 누적 피해 15% 로는 바가 안 움직인다', r.half1, r.W, 1);
      near('331 — 옛 소환 눈금(30%) 에 닿아도 바가 안 움직인다', r.gate, r.W, 1);
      /* 338 — 3마리 중 1마리를 잡으면 «남은 체력 합» 이 2/3 다(옛 «찬 폭 1/3» 의 뒤집음) */
      near('338 — 3마리 중 1마리 격파 = 남은 574 × 2/3', r.after1, r.W * 2 / 3, 2);
      is('보스 등장 전 타이틀에 ● 3개', /●●●$/.test(r.ttlA.trim()), true);
      is('1마리 격파 후 타이틀 ●●○', /●●○$/.test(r.ttlB.trim()), true);
      await cleanup();
    }
  }
  /* 보스 1마리 던전의 타이틀은 **한 글자도 안 바뀐다**(30 측정표 무영향) */
  {
    const p = await prep('gold');
    if (p.err) no('gold — ' + p.err);
    else {
      const r = await page.evaluate(() => {
        drawDunHud();
        return { ttl: document.getElementById('dunTtl').textContent, bn: dunRun.bossN };
      });
      is('보스 1마리 던전 타이틀 = 옛 문자열 그대로', r.ttl, '황금 동굴 - 레벨 1');
      await cleanup();
    }
  }

  /* ── [5] 04 세부 팝업 — 들어가기 전에 «보스 n (동시/순차)» 를 말한다 ──────────────── */
  console.log('\n[5] 04 세부 팝업 — 상태 리본이 보스 수·방식을 말한다');
  {
    const r = await page.evaluate(() => {
      localStorage.clear(); Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      const out = [];
      for (const d of DUNGEONS) {
        for (let i = 0; i < 8; i++) {
          const u = DUN_UI[d.id];
          if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
          if (!dunLocked(d)) break;
        }
        openDunDetail(d);
        const t = document.getElementById('dgdState');
        out.push({ id: d.id, txt: t.textContent, bn: dunBossN(d), mode: dunBossMd(d),
                   w: t.getBoundingClientRect().width,
                   box: t.parentElement.getBoundingClientRect().width });
        closeDunDetail();
      }
      return out;
    });
    for (const t of r) {
      if (t.bn > 1) is(t.id + ' — 리본이 «보스 ' + t.bn + '» 을 말한다 («' + t.txt + '»)',
                       t.txt.indexOf('보스 ' + t.bn) >= 0, true);
      else is(t.id + ' — 보스 1마리 던전은 옛 문구 그대로 («' + t.txt + '»)',
              /보스/.test(t.txt), false);
      (t.w <= t.box - 8 ? ok : no)(t.id + ' — 리본 안에 든다 (글자 ' + t.w.toFixed(0)
        + 'px ≤ 리본 ' + t.box.toFixed(0) + 'px − 8)');
    }
  }

  /* ── [6] 동시 등장 보스가 겹쳐 서지 않는다(단독 개체끼리의 분리) ─────────────────── */
  /* 344(2026-08-29) — 이 절은 «rstone 1회 · 프레임 12 부터» 를 재다가 4회에 1번 빨갰다.
     원인은 게이트의 난수 운이 **아니었다**(probe344): 스폰 좌표가 이웃을 안 봐서 24회 중 12회가
     반지름 합 안(최악 12%)에서 태어났고, `e.born < 0.3` 의 등장 창 18프레임 동안 겹친 채 서 있었다.
     제품이 스폰에서 겹침을 막게 됐으므로(index.html `soloClash`) 이 절도 다시 적는다:
       ① 표본을 «동시 등장 던전 전부 × 3뽑기» 로 늘린다 — 한 번의 뽑기 운으로 초록이 될 수 없다.
       ② «k < 12 를 건너뛴다» 를 지운다 — 건너뛰던 그 창이 바로 결손이 살던 자리였다.
       ③ 「최소 간격 ≥ 97%」 한 항을 **네 항으로 가른다**(LESSONS 326 «칸을 갈라 써라»).
          이동 중에는 위치 해소가 반씩 미느라 **한 프레임짜리** 잔차(실측 바닥 97.4%)가 남는데,
          그 잔차와 «겹쳐 서 있다» 를 같은 자로 재면 임계 0.4%p 위에서 또 흔들린다. 그래서
          정지 창(스폰·등장)은 **100%** 로 조이고, 이동 창은 «깊이(≥90%)» 와 «지속(연속 ≤2프레임)»
          으로 나눠 묻는다. 실측(probe344 72뽑기)은 깊이 97.4% · 97% 아래 프레임 **0개**다. */
  console.log('\n[6] 동시 등장 — 보스끼리 겹치지 않는다 (중심 거리 ≥ 반지름 합)');
  const SIM = await page.evaluate(() => DUNGEONS.filter((d) => dunBossN(d) > 1 && dunBossMd(d) === 'all')
    .map((d) => ({ id: d.id, bn: dunBossN(d) })));
  /* 한 판을 굴리며 창을 갈라 잰다. k<17 = 제품이 `e.born < 0.3` 으로 통째로 건너뛰는 «등장 창» */
  const runSep = (frames) => page.evaluate(([N]) => {
    /* 331 — 소환 눈금 폐지: 보스는 startDunRun 이 이미 예약했다(dmg 를 안 건드린다) */
    dunBossTick();
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    const sep = () => {
      const bs = enemies.filter((e) => e.tk === 'dunboss');
      if (bs.length < 2) return -1;
      let m = 9;
      for (let a = 0; a < bs.length; a++) for (let b = a + 1; b < bs.length; b++)
        m = Math.min(m, Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y) / (bs[a].r + bs[b].r));
      return m;
    };
    let spawnSep = -1, born = 9, all = 9, up = 0, run = 0, runMax = 0, seen = 0;
    for (let k = 0; k < N; k++) {
      step(1 / 60);
      if (!dunRun) break;
      const s = sep();
      if (s < 0) { run = 0; continue; }
      seen = Math.max(seen, enemies.filter((e) => e.tk === 'dunboss').length);
      if (spawnSep < 0) spawnSep = s;
      all = Math.min(all, s);
      if (k < 17) born = Math.min(born, s);
      if (s < 0.97) { up++; run++; runMax = Math.max(runMax, run); } else run = 0;
    }
    return { spawnSep, born: born === 9 ? -1 : born, all: all === 9 ? -1 : all, up, runMax, seen };
  }, [frames]);
  {
    (SIM.length >= 2 ? ok : no)('전제 — 동시 등장 던전이 ' + SIM.length + '종 있다 ('
      + SIM.map((t) => t.id + ':' + t.bn).join(' · ') + ')');
    const DRAW = 3;
    for (const t of SIM) {
      const rows = [];
      for (let n = 0; n < DRAW; n++) {
        const p = await prep(t.id);
        if (p.err) { no(t.id + ' — ' + p.err); break; }
        rows.push(await runSep(600));
        await cleanup();
      }
      if (rows.length < DRAW) continue;
      const mn = (f) => rows.reduce((a, r) => Math.min(a, f(r)), 9);
      const mx = (f) => rows.reduce((a, r) => Math.max(a, f(r)), 0);
      const pct = (v) => (v * 100).toFixed(1) + '%';
      /* 전제 — 셋(둘)이 «같은 프레임에» 실제로 서지 않으면 아래 세 항은 잴 것이 없다(헛초록 방지) */
      (mn((r) => r.seen) >= t.bn ? ok : no)(t.id + ' 전제 — 보스 ' + t.bn + '마리가 실제로 필드에 섰다 (뽑기 '
        + DRAW + '회 최소 ' + mn((r) => r.seen) + '마리)');
      (mn((r) => r.spawnSep) >= 1 ? ok : no)(t.id + ' ① 스폰 프레임 겹침 0 — 최소 간격 '
        + pct(mn((r) => r.spawnSep)) + ' (기대 ≥ 100%)');
      (mn((r) => r.born) >= 1 ? ok : no)(t.id + ' ② 등장 창(k<17, 아무도 안 움직이는 18프레임) '
        + pct(mn((r) => r.born)) + ' (기대 ≥ 100%)');
      (mn((r) => r.all) >= 0.90 ? ok : no)(t.id + ' ③ 런 전체 최소 간격 ' + pct(mn((r) => r.all))
        + ' (기대 ≥ 90% — «한 마리로 보이는» 겹침 0)');
      (mx((r) => r.runMax) <= 2 ? ok : no)(t.id + ' ④ 97% 아래가 이어진 최대 프레임 '
        + mx((r) => r.runMax) + '프레임 (기대 ≤ 2 — 이동 중 한 프레임 잔차만 허용) · 총 '
        + rows.reduce((a, r) => a + r.up, 0) + '프레임');
    }
  }

  /* ── [6-R] 되돌림 시험 — 위 네 항에 이빨이 있는가 ──────────────────────────────── */
  /* 334-③ 처방: «옛 상태를 만들어 보는 것» 으로 5줄이면 된다. 여기서는 344 이전의 스폰
     (= 이웃을 안 보고 뽑은 좌표)을 손으로 재현한다. 두 가지를 동시에 못박는다:
       R1 겹쳐 태어나면 등장 창·런 전체 단언이 **실제로 빨개진다**(무르게 풀린 항이 아니다)
       R2 그 상태에서 굴리면 257 의 위치 해소가 **여전히 살아 있어** 97% 위로 돌아온다 */
  console.log('\n[6-R] 되돌림 시험 — 옛 스폰(겹쳐 태어남)을 손으로 만들어 본다');
  {
    const t = SIM[SIM.length - 1];
    const p = await prep(t.id);
    if (p.err) no(t.id + ' — ' + p.err);
    else {
      const r = await page.evaluate(() => {
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);                                   /* 보스가 서는 프레임 */
        const bs = enemies.filter((e) => e.tk === 'dunboss');
        if (bs.length < 2) return { err: '보스가 2마리 미만' };
        const sep = () => {
          const b = enemies.filter((e) => e.tk === 'dunboss');
          let m = 9;
          for (let a = 0; a < b.length; a++) for (let c = a + 1; c < b.length; c++)
            m = Math.min(m, Math.hypot(b[a].x - b[c].x, b[a].y - b[c].y) / (b[a].r + b[c].r));
          return m;
        };
        /* 옛 스폰 재현 — 두 번째 보스를 첫 보스 위(반지름 합의 12% = probe344 최악 표본)로 옮기고
           등장 창을 되돌린다(born=0). 344 이전이면 이 상태가 «난수로 뽑혀» 나왔다. */
        bs[1].x = bs[0].x + (bs[0].r + bs[1].r) * 0.12; bs[1].y = bs[0].y;
        bs.forEach((e) => { e.born = 0; });
        const at0 = sep();
        let bornMin = 9;
        for (let k = 0; k < 17; k++) { step(1 / 60); bornMin = Math.min(bornMin, sep()); }
        let after = 9;
        for (let k = 0; k < 40; k++) { step(1 / 60); after = sep(); }
        return { at0, bornMin, after };
      });
      if (r.err) no(t.id + ' — ' + r.err);
      else {
        (r.at0 < 0.90 ? ok : no)('R1 옛 스폰을 심으면 간격이 ' + (r.at0 * 100).toFixed(1)
          + '% — ③(≥90%) 이 실제로 빨개진다');
        (r.bornMin < 1 ? ok : no)('R1 등장 창 18프레임 내내 ' + (r.bornMin * 100).toFixed(1)
          + '% — ②(≥100%) 도 빨개진다 (제품은 이 창에서 아무것도 안 한다)');
        (r.after >= 0.97 ? ok : no)('R2 그대로 40프레임 굴리면 ' + (r.after * 100).toFixed(1)
          + '% 로 복구 — 257 의 위치 해소는 살아 있다');
        await cleanup();
      }
    }
  }

  /* ── [7] 회귀 — 보스가 1마리인 판의 거동은 한 줄도 안 바뀐다 ─────────────────────── */
  console.log('\n[7] 회귀 — 단독 개체 하나뿐이면 분리력이 0 이다 (66·172 불변)');
  {
    const r = await page.evaluate(() => {
      localStorage.clear(); Object.assign(S, DEF());
      S.stage = 30; S.best = 30; S.guide.idx = 99;
      spawnStage();
      enemies.length = 0; spawnQ.length = 0;
      makeEnemy('boss');
      const e = enemies[enemies.length - 1];
      e.x = player.x + 200; e.y = player.y; e.born = 1;
      const x0 = e.x, y0 = e.y;
      /* 몹을 잔뜩 붙여 둔다 — 보스는 무리 몹과는 분리하지 않으므로(66) 좌표가 몹 때문에 밀리면 안 된다 */
      for (let k = 0; k < 8; k++) { makeEnemy('zombie'); const m = enemies[enemies.length - 1];
        m.x = e.x + (k % 3) * 4; m.y = e.y + ((k / 3) | 0) * 4; m.born = 1; }
      const px = player.x, py = player.y;
      player.dead = 99;                       /* 플레이어를 얼려 추격 성분만 남긴다 */
      const before = Math.hypot(e.x - px, e.y - py);
      for (let k = 0; k < 60; k++) step(1 / 60);
      const after = Math.hypot(e.x - px, e.y - py);
      return { before, after, moved: Math.hypot(e.x - x0, e.y - y0) };
    });
    (r.after < r.before ? ok : no)('스테이지 보스는 몹 8마리에 둘러싸여도 플레이어에게 다가간다 ('
      + r.before.toFixed(0) + 'px → ' + r.after.toFixed(0) + 'px)');
  }

  console.log('\n[8] 콘솔 에러');
  errs.length ? no('콘솔/페이지 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '))
              : ok('콘솔·페이지 에러 0건');

  console.log('\nVERIFY257 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' ok / ' + fail + ' fail');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
