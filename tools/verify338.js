/* 작업 338 게이트 — «던전 보스 체력바가 격파 후에도 덜 깎여 있음» (주인 보고 2026-08-29)
 *
 *   node tools/verify338.js   → 마지막 줄이 `VERIFY338 n/n PASS` 여야 한다.
 *
 * 주인 원문: «던전 종류에 체력바 부분 ui가 반영이 제대로 안되더라. 보스 죽었는데 hp바가 다 깎여있지를 않음».
 *
 * ⚑ **등재문의 가설(«바가 덜 찬다»)은 기각됐다.** `tools/probe338.js` 로 던전 8종·탑 2종 ×
 *   보스 1/2/3마리 × 동시/페이즈 전 조합을 실제 진입·실제 피해로 굴려 보면, 수리 전 격파 프레임의
 *   폭은 **예외 없이 574px = 가득**이었다(0건도 덜 차지 않았다). 결손은 «눈금이 안 따라온다» 가
 *   아니라 **«눈금이 거꾸로다»** 였다:
 *     · 이 바는 레퍼런스에서 39 보스전의 **보스 체력바와 같은 부품**이다
 *       (측정표 30 §1 «보스 체력바» · §4-4 «39 의 체력바 끝 두개골과 1px 이내로 같은 에셋»).
 *     · 우리 게임의 그 부품(`#bossHp`)은 `hp/max` 로 **줄어드는데** 던전만 **차오르고** 있었다.
 *     · 바 안 수치도 레퍼런스는 «남은 체력»(측정표 §4-3 `9.61C`)인데 우리는 «누적 피해» 였다 —
 *       255 이전 «누적 피해 ≥ 요구 피해 = 클리어» 시절의 눈금이 남은 것(LESSONS 295-②).
 *   그래서 이 게이트가 잠그는 것은 «574 에 닿는가» 가 아니라 **«격파하면 0px 로 다 깎이는가»** 다.
 *
 * 재는 축:
 *   §1 방향   — 같은 부품 두 자리(`#bossHp` · `#dunBar`)가 **같은 방향**이다(체력이 줄면 바도 준다).
 *   §2 전 조합 — 던전 8 + 탑 2, 보스 1/2/3 · 동시/페이즈. 등장 딜레이 = 만피 574 · 격파마다 계단 하강 ·
 *               마지막 격파 = **0px**. 주인 보고의 «던전 종류에» 를 빠짐없이 덮는다.
 *   §3 시퀀스 — 332 격파 시퀀스(터짐 → «클리어» → 1초) **내내** 0px 로 유지되고 완료 화면까지 간다.
 *   §4 수치   — 바 안 숫자가 «남은 보스 체력» 이다. 누적 피해를 5배로 밀어도 안 움직이고, 격파하면 0 이다.
 *   §5 오버헤드 — 격파 뒤 개별 HP 바를 그릴 개체가 0 이다(시체는 hp/max 를 안 들고 온다 = 잔량으로 굳지 않는다).
 *   §R 되돌림 시험 — 옛 식(`dunRunProg()*574` · `fmtB(dunRun.dmg)`)을 그 자리에 주입하면 §2·§4 가 빨개지고,
 *               원복하면 초록으로 돌아온다. LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — page.evaluate 예외는 게이트를 즉사시키지 말고 그 절만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const W = 574;                       /* 30 측정표 §4-2 — 채움 100% 기준(계단 앞) */
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(2) + ' (기대 ' + (+want).toFixed(2) + ')')
  : no(m + ' = ' + (+got).toFixed(2) + ' — 기대 ' + (+want).toFixed(2) + ' (허용 ' + tol + ')'));

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
  const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계다(LESSONS 161 · verify332 와 같은 처방).
     얼리지 않으면 evaluate 왕복 사이에 rAF 가 틱을 더 흘려 «격파 프레임» 이 어디인지 흔들린다. */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 실제 진입점으로 들어간다(T2 기능 완성 규칙 — 상태를 손으로 만들지 않는다).
     탑은 제 진입점(`challengeTower`)이 따로다(209·210). */
  const enter = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    if (TOWERS.some((t) => t.id === i)) { challengeTower(i); }
    else {
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
    return { bn: dunRun.bossN, mode: dunRun.bossMode };
  }, [id]);

  const cleanup = () => ev(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    const cl = document.getElementById('dclw'); if (cl) cl.classList.remove('on');
    if (typeof closeModal === 'function') closeModal();
  });

  /* ═══ §1 방향 — 같은 부품 두 자리가 같은 방향인가 ═════════════════════════════ */
  console.log('\n[1] 방향 — 39 보스 체력바(#bossHp)와 던전 바(#dunBar)가 «같은 부품·같은 방향»');
  {
    /* 스테이지 보스: 162 흐름대로 «몹 전멸 → startBoss()» 로 세운다(상태를 손으로 안 만든다) */
    const r = await ev(() => {
      localStorage.clear(); Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      if (dunRun) endDunRun(false, true);
      spawnStage(); enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(1 / 60);                                  /* 이 틱이 startBoss() 를 부른다 */
      spawnQ.forEach((q) => { if (q.t === 'boss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'boss');
      if (!b) return { err: '스테이지 보스가 안 선다' };
      const w = () => { drawHud(); return parseFloat(document.getElementById('bossHpF').style.width); };
      const out = { mode: bossMode() };
      b.hp = b.max;        out.full = w();
      b.hp = b.max * 0.5;  out.half = w();
      b.hp = 1;            out.low = w();
      return out;
    });
    if (!blk('§1 스테이지 보스', r)) {
      if (r.err) no('§1 — ' + r.err);
      else {
        is('스테이지 보스전 진입(bossMode)', r.mode, 'stage');
        (r.full > r.half && r.half > r.low)
          ? ok('#bossHpF — 체력이 줄면 바도 준다 (' + r.full.toFixed(0) + ' → ' + r.half.toFixed(0) + ' → ' + r.low.toFixed(0) + 'px)')
          : no('#bossHpF — 체력이 줄어도 바가 안 준다 (' + r.full.toFixed(0) + ' → ' + r.half.toFixed(0) + ' → ' + r.low.toFixed(0) + 'px)');
      }
    }
    const d = await ev(() => {
      if (dunRun) endDunRun(false, true);
      return null;
    });
    void d;
    const p = await enter('gold');
    if (!blk('§1 던전 입장', p) && !p.err) {
      const q = await ev(() => {
        const w = () => { drawDunHud(); return parseFloat(document.getElementById('dunBarF').style.width); };
        dunBossTick(); spawnQ.forEach((x) => { if (x.t === 'dunboss') x.delay = 0; }); step(1 / 60);
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (!b) return { err: '던전 보스가 안 선다' };
        const out = {};
        b.hp = b.max;       out.full = w();
        b.hp = b.max * 0.5; out.half = w();
        b.hp = 1;           out.low = w();
        return out;
      });
      if (!blk('§1 던전 바', q)) {
        if (q.err) no('§1 — ' + q.err);
        else (q.full > q.half && q.half > q.low)
          ? ok('#dunBarF — 체력이 줄면 바도 준다 (' + q.full.toFixed(0) + ' → ' + q.half.toFixed(0) + ' → ' + q.low.toFixed(0) + 'px) = 같은 방향')
          : no('#dunBarF — 39 와 반대 방향이다 (' + q.full.toFixed(0) + ' → ' + q.half.toFixed(0) + ' → ' + q.low.toFixed(0) + 'px)');
      }
    }
    await cleanup();
  }

  /* ═══ §2·§3·§4·§5 — 던전 8 + 탑 2 전 조합 ══════════════════════════════════ */
  const LIST = await ev(() => DUNGEONS.concat(TOWERS)
    .map((d) => ({ id: d.id, n: d.n, bn: dunBossN(d), bm: dunBossMd(d), tw: isTower(d) })));
  if (LIST.__err) { no('던전 목록 — ' + LIST.__err); }

  console.log('\n[2·3·4·5] 전 조합 — 던전 8 + 탑 2 · 보스 1/2/3 · 동시/페이즈');
  for (const d of (LIST.__err ? [] : LIST)) {
    const tag = d.id + '(bn' + d.bn + '·' + d.bm + (d.tw ? '·탑' : '') + ')';
    const p = await enter(d.id);
    if (blk(tag + ' 입장', p) || p.err) { if (p.err) no(tag + ' — ' + p.err); await cleanup(); continue; }

    const r = await ev(() => {
      const bar = document.getElementById('dunBarF');
      const num = document.getElementById('dunBarN');
      const w = () => parseFloat(getComputedStyle(bar).width);
      const out = { steps: [], seq: [], bn: dunRun.bossN };

      /* ① 등장 딜레이 — 보스가 아직 안 섰다. 만피여야 한다(#bossHp 의 «스폰 딜레이 = 만피» 규약) */
      drawHud(); out.pre = w(); out.preNum = num.textContent;

      /* ② 누적 피해를 5배로 밀어도 바·수치가 안 움직인다(폐지된 옛 눈금의 회귀 잠금) */
      dunRun.dmg = dunRun.need * 5; drawHud();
      out.dmgW = w(); out.dmgNum = num.textContent;

      /* ②-b 수치원 — 보스를 세우고 **첫 보스를 딱 반만** 깎아 «남은 체력» 절대값을 잰다.
         격파 계단만으로는 보스 1마리 던전에서 기대값이 0 이라 «수치가 무엇인가» 를 못 묻는다
         (bn1 이면 첫 격파의 기대값이 총량×0 = 0 이고, 0 은 어떤 식으로도 맞을 수 있다). */
      dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60);
      {
        const b0 = enemies.find((e) => e.tk === 'dunboss');
        const tot = dunRun.need * DUN_BOSS_HPK;
        if (b0) {
          b0.hp = b0.max * 0.5; drawHud();
          /* 남은 합 = (안 잡은 보스 − 1)마리 만피 + 반피 1마리 = tot × (1 − 0.5/bn) */
          out.midWant = +(tot * (1 - 0.5 / dunRun.bossN)).toFixed(3);
          out.midVal = +(dunBossHpVal()).toFixed(3);
          out.midW = +w().toFixed(3);
          out.midNum = num.textContent;
          out.midNumWant = fmtB(out.midWant);
          b0.hp = b0.max;                       /* 원복 — 아래 격파 계단은 만피에서 시작한다 */
          drawHud();
        }
      }

      /* ③ 보스를 세우고 한 마리씩 실제 피해로 잡는다 — 격파마다 폭·수치를 찍는다 */
      let guard = 0;
      while (dunRun && !dunRun.bossDown && guard++ < 600) {
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (b) {
          const k0 = dunRun.bossKilled;
          hitEnemy(b, b.max / 2.5);                 /* 여러 방에 나눠 때린다(한 방 즉사가 아니다) */
          step(1 / 60); drawHud();
          if (dunRun && dunRun.bossKilled !== k0)
            out.steps.push({ killed: dunRun.bossKilled, w: +w().toFixed(3), num: num.textContent,
                             val: +(dunBossHpVal()).toFixed(3), tot: +(dunRun.need * DUN_BOSS_HPK).toFixed(3) });
        } else {
          dunBossTick();
          spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
          step(1 / 60); drawHud();
        }
      }
      if (!dunRun) return { err: '격파 전에 런이 사라졌다', out };
      out.down = !!dunRun.bossDown;
      out.killW = +w().toFixed(3); out.killNum = num.textContent;
      /* ⑤ 오버헤드 — 개별 HP 바는 `enemies` 만 그린다. 격파 뒤 대상이 0 이고,
         시체(die 애니)는 hp/max 를 안 들고 오므로 «잔량으로 굳는» 경로가 구조적으로 없다. */
      out.liveAtKill = enemies.filter((e) => e.tk === 'dunboss').length;
      out.corpses = corpses.length;
      out.corpseHp = corpses.filter((c) => 'hp' in c || 'max' in c).length;

      /* ③ 332 시퀀스 — 완료 화면이 뜰 때까지 **매 프레임** 폭을 본다(한 프레임도 되살아나면 안 된다) */
      let g2 = 0, worst = 0;
      while (dunRun && g2++ < 60 * 10) {
        step(1 / 60); drawHud();
        const cur = w(); if (cur > worst) worst = cur;
        if (g2 % 20 === 0) out.seq.push({ t: +(g2 / 60).toFixed(2), w: +cur.toFixed(3) });
      }
      out.seqWorst = +worst.toFixed(3);
      out.seqFrames = g2;
      out.clear = document.getElementById('dclw').classList.contains('on');
      return out;
    });
    if (blk(tag, r)) { await cleanup(); continue; }
    if (r.err) { no(tag + ' — ' + r.err); await cleanup(); continue; }

    /* §2 */
    near('§2 ' + tag + ' 등장 딜레이 = 만피 ' + W, r.pre, W, 0.5);
    near('§2 ' + tag + ' 누적 피해 5배로도 안 움직인다', r.dmgW, W, 0.5);
    is('§2 ' + tag + ' 격파 계단 수 = 보스 수', r.steps.length, r.bn);
    let mono = true;
    for (let k = 0; k < r.steps.length; k++) {
      const want = W * (1 - (k + 1) / r.bn);
      if (Math.abs(r.steps[k].w - want) > 1.5) mono = false;
    }
    mono ? ok('§2 ' + tag + ' 격파마다 574×(남은/총) 로 내려간다 [' + r.steps.map((s) => s.w.toFixed(0)).join(' → ') + ']')
         : no('§2 ' + tag + ' 격파 계단이 «남은 체력» 눈금과 어긋난다 [' + r.steps.map((s) => s.w.toFixed(0)).join(' → ') + ']');
    is('§2 ' + tag + ' 마지막 격파 = bossDown', r.down, true);
    near('§2 ' + tag + ' 마지막 격파 프레임 = 다 깎임 0px', r.killW, 0, 0.5);

    /* §3 */
    near('§3 ' + tag + ' 332 시퀀스 ' + r.seqFrames + '프레임 내내 최대 폭 0px', r.seqWorst, 0, 0.5);
    is('§3 ' + tag + ' 시퀀스 끝 = 완료 화면(31)', r.clear, true);

    /* §4 */
    is('§4 ' + tag + ' 누적 피해 5배로도 수치가 안 바뀐다', r.dmgNum, r.preNum);
    is('§4 ' + tag + ' 격파 시 수치 = 0', r.killNum, '0');
    /* 첫 보스 반피 — 수치·폭이 둘 다 «남은 보스 체력 합» 이다(0 이 아닌 자리에서 묻는다) */
    if (r.midVal == null) no('§4 ' + tag + ' 반피 표본을 못 만들었다');
    else {
      near('§4 ' + tag + ' 첫 보스 반피 — 수치원 = need×HPK×(1−0.5/bn)', r.midVal, r.midWant, Math.max(1, r.midWant * 1e-6));
      is('§4 ' + tag + ' 첫 보스 반피 — 바 안 글자 = fmtB(남은 체력)', r.midNum, r.midNumWant);
      near('§4 ' + tag + ' 첫 보스 반피 — 폭 = 574×(1−0.5/bn)', r.midW, W * (1 - 0.5 / r.bn), 1);
    }
    {
      const s0 = r.steps[0];
      /* 격파 계단의 절대값도 같은 식이다 — bn1 은 기대값이 0 이라 위 반피 표본이 본체다 */
      const wantVal = s0 ? s0.tot * (1 - 1 / r.bn) : 0;
      s0 && Math.abs(s0.val - wantVal) <= Math.max(1, wantVal * 1e-6)
        ? ok('§4 ' + tag + ' 첫 격파 수치원 = need×HPK×남은비 (' + s0.num + ')')
        : no('§4 ' + tag + ' 첫 격파 수치원이 «남은 보스 체력» 이 아니다 (' + (s0 ? s0.val : '?') + ' ≠ ' + wantVal.toFixed(2) + ')');
    }

    /* §5 */
    is('§5 ' + tag + ' 격파 프레임 잔존 보스 개체 0', r.liveAtKill, 0);
    is('§5 ' + tag + ' 시체가 hp/max 를 안 들고 온다(오버헤드 잔존 0)', r.corpseHp, 0);
    (r.corpses > 0) ? ok('§5 ' + tag + ' 시체(die 애니)는 실제로 남아 있다 ' + r.corpses + '구 = 위 0 이 «시체가 없어서» 가 아니다')
                    : no('§5 ' + tag + ' 시체가 하나도 없다 — §5 가 헛초록이다');
    await cleanup();
  }

  /* ═══ §R 되돌림 시험 ═══════════════════════════════════════════════════════
     옛 식을 그 자리에 그대로 주입해 «이 게이트가 실제로 무엇을 잡는가» 를 보인다. */
  console.log('\n[R] 되돌림 시험 — 옛 식을 주입하면 빨개지고, 원복하면 초록이다');
  {
    const p = await enter('rstone');                    /* 3마리·동시 — 계단이 가장 많은 조합 */
    if (!blk('§R 입장', p) && !p.err) {
      const r = await ev(() => {
        const bar = document.getElementById('dunBarF'), num = document.getElementById('dunBarN');
        const w = () => parseFloat(getComputedStyle(bar).width);
        let guard = 0;
        /* ⚠ 여기서는 `killEnemy` 를 직접 부르면 안 된다 — 그러면 `dunRun.dmg` 가 0 이라
           R2(«옛 수치 식은 0 이 아니다»)가 성립하지 않는다. 실제 피해 경로로 잡는다. */
        while (dunRun && !dunRun.bossDown && guard++ < 600) {
          const b = enemies.find((e) => e.tk === 'dunboss');
          if (b) { hitEnemy(b, b.max / 2.5); step(1 / 60); }
          else { dunBossTick(); spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; }); step(1 / 60); }
        }
        if (!dunRun) return { err: '격파 전에 런이 사라졌다' };
        drawHud();
        const out = { newW: +w().toFixed(3), newNum: num.textContent };
        /* R1 — 옛 폭 식(«진행도») 주입 */
        bar.style.width = (dunRunProg() * 574) + 'px';
        out.oldW = +w().toFixed(3);
        /* R2 — 옛 수치 식(«누적 피해») 주입 */
        num.textContent = fmtB(dunRun.dmg);
        out.oldNum = num.textContent;
        /* R3 — 제품 함수로 원복 */
        drawHud();
        out.backW = +w().toFixed(3); out.backNum = num.textContent;
        out.dmg = +dunRun.dmg.toFixed(1);
        return out;
      });
      if (!blk('§R', r)) {
        if (r.err) no('§R — ' + r.err);
        else {
          near('R0 수리 후 격파 폭 = 0px', r.newW, 0, 0.5);
          (Math.abs(r.oldW - W) <= 0.5)
            ? ok('R1 옛 폭 식(dunRunProg×574)을 넣으면 ' + r.oldW.toFixed(0) + 'px = 주인이 본 «다 안 깎인» 그림 → §2 가 빨개진다')
            : no('R1 옛 폭 식이 574 가 아니다 (' + r.oldW.toFixed(2) + ') — 되돌림 시험이 성립 안 함');
          (r.oldNum !== '0' && r.dmg > 0)
            ? ok('R2 옛 수치 식(fmtB(dunRun.dmg))을 넣으면 «' + r.oldNum + '» ≠ 0 → §4 가 빨개진다')
            : no('R2 옛 수치 식이 0 이다 — 되돌림 시험이 성립 안 함');
          near('R3 drawHud() 로 원복하면 다시 0px', r.backW, 0, 0.5);
          is('R3 수치도 원복하면 0', r.backNum, '0');
        }
      }
    }
    await cleanup();
  }

  is('콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join('\n    '));
  console.log('\nVERIFY338 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
