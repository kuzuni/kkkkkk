#!/usr/bin/env node
/* 작업 356 — 32회차 축: **매체 축 × 시간 × 짧은 프레임** (`verify356` [P] 의 재료)
 *
 *   node tools/probe356r32.js            # 합성 표본 — 되돌림 · 음성항 · 전제 (빠르다)
 *   node tools/probe356r32.js --census   # 제품 전 화면 인구조사 · 2280 한 주기 ↔ 1600 한 주기 대조 (느리다)
 *   node tools/probe356r32.js --json     # 기계 판독용
 *
 * ── 왜 이 회차인가 (31회차 인계문 §38-8 의 «다음 자리 후보 ⓐ») ─────────────────
 * 31회차가 열두째 프런티어(«매체 축 × 시간»)를 닫으면서 다음 자리를 이름까지 적어 넘겼다:
 *
 *   > ⓐ **매체 축 × 시간 × 짧은 프레임** — [O] 는 2280 에서만 주기를 훑는다.
 *   >   [N] 이 프레임을 열었고 [O] 가 시간을 열었지만 **둘의 곱은 아직 아무도 안 봤다**.
 *
 * 24회차 규율이 그것을 이 회차의 일로 만든다 — **«자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»**
 * ⚠ 그리고 «다음 자리를 안다» 는 «결과를 안다» 가 아니다(338 규칙) — 그래서 자를 올리기 전에 **재현부터** 한다.
 * ⚠ 31회차가 못박은 대로 «값이 공짜»(리사이즈 뒤에 위상 스윕을 한 번 더)는 «결과가 공짜» 가 아니다.
 *
 * ── 이 층이 **두 축의 곱**에서만 보이는 «구조적 이유» ────────────────────────
 * [N](30회차)이 프레임을 타는 이유: 상자가 뷰포트에 매여 있는데 내용 좌표계(비트맵·viewBox)는 고정.
 * [O](31회차)가 시간을 타는 이유: 배율이 한 줄도 안 걸린 채 상자만 키프레임으로 흔들린다.
 * **이 절이 곱에서만 보이는 이유**: 키프레임의 값 자체가 **프레임에 매인 단위**(`vh`·`%`·`min()`)일 때다.
 *   그런 노드는 2280 에서 주기를 다 훑어도 상자가 비트맵 비와 계속 맞을 수 있고(=[O] 초록),
 *   1600 에서 **가라앉은 한 점**만 보면 그 점은 0%/100% 위상이라 역시 맞는다(=[N] 초록).
 *   어긋나는 것은 **짧은 프레임의 주기 한복판** 하나뿐이라 두 자 어느 쪽도 구조적으로 못 본다.
 *
 * ⚠ **«2280 한 주기에서 0» 도 «1600 한 점에서 0» 도 «1600 한 주기에서 0» 의 근거가 못 된다** —
 *   29·30·31회차가 되풀이한 그 규율(하나를 다른 하나의 근거로 인용하지 마라)의 곱셈 판이다.
 *
 * ⚠ **자를 두 벌로 안 적는다**(13회차 [R12]):
 *     수집기 `COLLECT_MEDIA` 와 판정 `verdict` 는 `probe356r29`,
 *     위상 못박기 `PIN` 과 주기 칸수 `PHASES` 는 `probe356r25`,
 *     한 주기 접기 `foldScreen`·`worstOverCycle` 과 배율 분류기 `MEDIA_TR` 은 `probe356r31` 것을 **그대로 받아 쓴다.**
 *   이 파일이 새로 세우는 것은 **«두 프레임의 한 주기를 나란히 놓고 무엇이 갈리는가»**(`pairCycle`) 하나다.
 */
const { pw, launch } = require('./pwlaunch');
const R29 = require('./probe356r29.js');
const R25 = require('./probe356r25.js');
const R31 = require('./probe356r31.js');
const { COLLECT_MEDIA, verdict } = R29;
const { PIN, PHASES } = R25;
const { foldScreen, worstOverCycle, MEDIA_TR, MEDIA_ANIM } = R31;

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

const TOL = R29.TOL;
const FRAME_D = { width: 1080, height: 2280 };   /* 기준(9:19) — [O] 가 훑는 프레임 */
const FRAME_F = { width: 1080, height: 1600 };   /* 짧은 프레임(9:13.3) — [F]·[N] 과 같은 값 */

/* ── 합성 표본 — «두 축의 곱 전용» 갈래를 손으로 만든다 ───────────────────────
   ⓛ **키프레임 값이 뷰포트에 매인 캔버스.** 비트맵 200×100(2:1)이고 상자는 200×100 에서 출발한다.
      한복판 위상의 높이는 `4.3859649vh` = 2280 에서 **정확히 100px** 이라 2280 에서는 주기를 다 훑어도
      상자가 200×100 그대로다(=[O] 초록). 1600 으로 줄이면 같은 위상이 **70.18px** 이 되어 d≈1.42 로 어긋난다.
      가라앉은 한 점(위상 0%)은 두 프레임 다 100px 이라 [M]·[N] 도 초록이다.
      ⇒ **오직 «1600 × 한복판 위상»** 에서만 빨갛다. 이 자가 그것을 볼 수 있어야 [P] 가 사는 자다.
   ⓜ 음성항 — 같은 `vh` 키프레임이되 **종횡을 같이** 민다. 두 프레임 어느 위상에서도 비가 안 어긋난다
      ⇒ «프레임에 매인 애니메이션이 걸렸으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다.
   ⓝ 대조군 — 프레임과 무관한 고정 상자. 두 프레임 · 모든 위상에서 초록. */
const SYN_FT = `<!doctype html><meta charset="utf-8"><style>
  /* 4.3859649vh = 2280 에서 100px · 1600 에서 70.18px */
  @keyframes __t32vh   {0%,100%{height:100px}50%{height:4.3859649vh}}
  @keyframes __t32prop {0%,100%{width:200px;height:100px}50%{width:8.7719298vh;height:4.3859649vh}}
  #cVhKf {width:200px;height:100px;animation:__t32vh   40s linear infinite}
  #cProp {width:200px;height:100px;animation:__t32prop 40s linear infinite}
  #cFix  {width:200px;height:100px}
</style><body style="margin:0"><div id="app">
  <canvas id="cVhKf" width="200" height="100"></canvas>
  <canvas id="cProp" width="200" height="100"></canvas>
  <canvas id="cFix"  width="200" height="100"></canvas>
</div></body>`;

/* 한 프레임에서 «한 주기» 를 훑어 화면 한 장을 접는다 — `foldScreen`(31회차) 을 그대로 쓰되
   **리사이즈 뒤에 다시 못박는 것**이 이 파일의 일이다(PIN 은 인라인 delay 라 프레임이 바뀌어도 남지만,
   새로 나타난 노드·재계산된 duration 을 놓치지 않으려면 프레임마다 다시 부른다). */
async function sweepCycle(page, label) {
  const pinned = await page.evaluate(PIN, 0);
  const perPhase = [];
  for (let k = 0; k < PHASES; k++) {
    await page.evaluate(PIN, k / PHASES);
    const rows = (await page.evaluate(COLLECT_MEDIA)).map((r) => Object.assign({ screen: label }, r));
    perPhase.push({ at: k / PHASES, rows, tr: await page.evaluate(MEDIA_TR) });
  }
  await page.evaluate(PIN, null);
  return { pinned, perPhase, fold: foldScreen(perPhase, TOL), cyc: worstOverCycle(perPhase, TOL) };
}

/* ⚑ **이 파일이 새로 세우는 유일한 것** — 두 프레임의 «한 주기» 를 짝지어 무엇이 갈리는지 가른다.
   키는 `worstOverCycle` 의 키(«화면|셀렉터»)를 그대로 쓴다([N] `pairUp` 과 같은 규약).
     onlyShort  1600 한 주기에서만 빨간 자리   ← **이 절의 존재 이유**
     both       두 프레임의 주기 모두에서 빨간 자리(= [O] 도 보는 자리)
     onlyTall   2280 에서만 빨간 자리(프레임을 줄이면 사라지는 자리 — 있으면 그 자체가 관측이다)
   ⚠ «상자가 프레임 사이에 실제로 달라졌는가» 도 같이 센다 — 안 세면 두 수가 같은 프레임의 수일 수 있다. */
function pairCycle(cycD, cycF) {
  const badKey = (c) => new Set(c.bad.map((x) => x.key));
  const kD = badKey(cycD), kF = badKey(cycF);
  const onlyShort = cycF.bad.filter((x) => !kD.has(x.key));
  const onlyTall = cycD.bad.filter((x) => !kF.has(x.key));
  const both = cycF.bad.filter((x) => kD.has(x.key));
  /* 프레임이 실제로 상자를 움직였는가 — 위상별 최악이 아니라 **같은 위상(0%)의 상자**로 잰다. */
  const boxOf = (c) => new Map(c.all.map((x) => [x.key, x.row]));
  const bD = boxOf(cycD), bF = boxOf(cycF);
  let frameMoved = 0;
  for (const [k, r] of bF) {
    const d = bD.get(k);
    if (d && (Math.abs(d.w - r.w) > 0.5 || Math.abs(d.h - r.h) > 0.5)) frameMoved++;
  }
  return { onlyShort, onlyTall, both, frameMoved };
}

module.exports = { SYN_FT, sweepCycle, pairCycle, FRAME_D, FRAME_F };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 이 자가 «곱 전용» 자리를 볼 수 있는가 ── */
  {
    const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN_FT);
    await page.waitForTimeout(150);

    const tall = await sweepCycle(page, 'syn');
    await page.setViewportSize(FRAME_F);
    await page.waitForTimeout(150);
    const innerH = await page.evaluate(() => window.innerHeight);
    const short = await sweepCycle(page, 'syn');
    const pair = pairCycle(tall.cyc, short.cyc);
    report.syn = {
      pinned: [tall.pinned, short.pinned], innerH,
      tallCyc: tall.cyc.bad.length, shortCyc: short.cyc.bad.length,
      tallRest: tall.fold.restBad, shortRest: short.fold.restBad,
      onlyShort: pair.onlyShort.map((x) => ({ key: x.key, at: x.at, d: x.row.d })),
    };
    const pick = (c, id) => c.bad.find((x) => x.key.indexOf('#' + id) >= 0);

    console.log('[1] 전제 — 두 프레임에서 정말 못박았고, 프레임이 정말 줄었는가 (0 이면 아래 초록은 전부 헛초록)');
    if (tall.pinned > 0 && short.pinned > 0 && innerH <= FRAME_F.height)
      ok(`[1] 애니 노드 못박기 2280 ${tall.pinned}개 · 1600 ${short.pinned}개 · innerHeight ${innerH} · 주기 ${PHASES}칸`);
    else bad(`[1] 전제 실패 — 못박기 ${tall.pinned}/${short.pinned} · innerHeight ${innerH}`);

    console.log('[2] 되돌림 — 키프레임 값이 vh 인 캔버스: 2280 한 주기·1600 한 점은 초록인데 «1600 한 주기» 만 빨갛다');
    const sTall = pick(tall.cyc, 'cVhKf'), sShort = pick(short.cyc, 'cVhKf');
    const restShort = short.fold.restBad;
    if (!sTall && sShort && !restShort)
      ok(`[2] ⓛ 2280 한 주기 ${tall.cyc.bad.length}자리 · 1600 한 점 ${restShort}자리 ↔ **1600 한 주기 ${short.cyc.bad.length}자리** — `
        + `최악 d=${sShort.row.d} @위상 ${(sShort.at * 100).toFixed(0)}% (상자 ${sShort.row.w}×${sShort.row.h} · 비트맵 ${sShort.row.nw}×${sShort.row.nh} · 배율은 한 줄도 안 걸렸다)`);
    else bad(`[2] ⓛ 가 안 갈린다 — 2280 주기 ${JSON.stringify(sTall ? sTall.row : null)} / 1600 한 점 ${restShort}자리 / 1600 주기 ${JSON.stringify(sShort ? sShort.row : null)}`);

    console.log('[3] 음성항 — 짧은 프레임에서 종횡이 «같이» 흔들리는 상자는 어느 위상에도 안 빨개진다 (헛빨강 아님)');
    const propBad = pick(short.cyc, 'cProp');
    const propAll = short.cyc.all.find((x) => x.key.indexOf('#cProp') >= 0);
    if (propAll && !propBad) ok(`[3] ⓜ 1600 주기 최악 편차 ${propAll.dev.toFixed(4)} ≤ 허용 ${TOL} — «프레임에 매인 애니메이션» 이라는 이유만으로는 안 빨개진다`);
    else bad(`[3] ⓜ 음성항이 빨갛다: ${JSON.stringify(propBad ? propBad.row : null)}`);

    console.log('[4] 갈래 — `pairCycle` 이 «1600 한 주기에서만» 을 실제로 가르는가');
    if (pair.onlyShort.length === 1 && pair.onlyShort[0].key.indexOf('#cVhKf') >= 0 && pair.frameMoved > 0)
      ok(`[4] onlyShort ${pair.onlyShort.length}자리(«${pair.onlyShort[0].key}») · both ${pair.both.length} · onlyTall ${pair.onlyTall.length} · `
        + `프레임 사이에 상자가 움직인 자리 ${pair.frameMoved} — 두 수는 정말 다른 프레임의 수다`);
    else bad(`[4] 갈래가 안 선다 — onlyShort ${JSON.stringify(pair.onlyShort.map((x) => x.key))} · frameMoved ${pair.frameMoved}`);

    console.log('[5] 대조군 — 같은 자리를 [O](2280 한 주기)·[N](1600 한 점)은 무엇이라 하는가');
    const fixTall = tall.cyc.all.find((x) => x.key.indexOf('#cFix') >= 0);
    const vhAtRestShort = (short.perPhase[0].rows || []).find((r) => r.sel.indexOf('#cVhKf') >= 0);
    if (fixTall && Math.abs(fixTall.dev) <= TOL && vhAtRestShort && Math.abs(vhAtRestShort.d - 1) <= TOL)
      ok(`[5] ⓝ 고정 상자는 2280 주기 편차 ${fixTall.dev.toFixed(4)} · ⓛ 은 **1600 의 가라앉은 한 점에서 d=${vhAtRestShort.d}(초록)** `
        + `⇒ [N] 이 재는 그 점에는 이 결함의 눈이 없다`);
    else bad(`[5] 대조군이 안 선다: ${JSON.stringify(fixTall ? fixTall.row : null)} / ${JSON.stringify(vhAtRestShort || null)}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 (--census) — 화면마다 2280 한 주기 → 리사이즈 → 1600 한 주기 ── */
  if (CENSUS) {
    const S = require('./scan356.js');
    const t0 = Date.now();
    const perScreen = [];
    let pinnedAll = 0, rowsAll = 0, movedAll = 0, trFreeAll = 0, frameMovedAll = 0;
    const animAgg = { total: 0, self: 0, anc: 0 };
    for (const [label, steps] of S.SCREENS) {
      const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        for (const st of (steps || [])) { try { await S.STEP(page, st); } catch (_) {} await page.waitForTimeout(180); }
        await page.waitForTimeout(200);
        const tall = await sweepCycle(page, label);
        await page.setViewportSize(FRAME_F);
        await page.waitForTimeout(420);
        const innerH = await page.evaluate(() => window.innerHeight);
        const am = await page.evaluate(MEDIA_ANIM);
        animAgg.total += am.total; animAgg.self += am.self; animAgg.anc += am.anc;
        const short = await sweepCycle(page, label);
        const pair = pairCycle(tall.cyc, short.cyc);
        pinnedAll += short.pinned; rowsAll += short.fold.rows;
        movedAll += short.fold.boxMoved; trFreeAll += short.fold.boxMovedTrFree;
        frameMovedAll += pair.frameMoved;
        perScreen.push({ label, innerH, pinned: short.pinned, rows: short.fold.rows,
          restF: short.fold.restBad, cycD: tall.cyc.bad.length, cycF: short.cyc.bad.length,
          onlyShort: pair.onlyShort.length, frameMoved: pair.frameMoved,
          maxDev: short.fold.maxDev, worst: short.cyc.bad[0] || null, boxMoved: short.fold.boxMoved });
        console.log(`   · ${label} — 매체 ${short.fold.rows} · 애니 ${short.pinned} · 상자 이동 ${short.fold.boxMoved}(배율 없이 ${short.fold.boxMovedTrFree})`
          + ` · 프레임 이동 ${pair.frameMoved} · 최악 편차 ${short.fold.maxDev.toFixed(4)} · 1600 주기 비균등 ${short.cyc.bad.length}(그중 1600 전용 ${pair.onlyShort.length})`);
      } catch (e) { perScreen.push({ label, err: String(e.message || e).slice(0, 60) }); }
      await ctx.close();
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const sum = (k) => perScreen.reduce((a, s) => a + (s[k] || 0), 0);
    const wrongResize = perScreen.filter((s) => !s.err && s.innerH > FRAME_F.height);
    report.census = { screens: perScreen.length, phases: PHASES, pinnedAll, rowsAll, movedAll, trFreeAll, frameMovedAll,
      cycF: sum('cycF'), cycD: sum('cycD'), onlyShort: sum('onlyShort'), restF: sum('restF'),
      wrongResize: wrongResize.length, secs, animMedia: animAgg };

    console.log(`\n[6] 제품 인구조사 — ${perScreen.length}화면 × 두 프레임 × 주기 ${PHASES}칸 (${secs}s)`);
    console.log(`     1600 매체 행 ${rowsAll} · 못박은 애니 노드 ${pinnedAll} · 위상 사이 상자 이동 ${movedAll}자리(그중 «배율 없이» ${trFreeAll}자리) · 프레임 사이 상자 이동 ${frameMovedAll}자리`);
    console.log(`     한 점(1600) 비균등 ${sum('restF')} · 2280 한 주기 ${sum('cycD')} · **1600 한 주기 ${sum('cycF')}**(그중 «1600 주기 전용» ${sum('onlyShort')})`);
    console.log(`     애니메이션이 걸린 매체 — 자신 ${animAgg.self} · 조상 ${animAgg.anc} / 매체 ${animAgg.total}`);
    for (const s of perScreen) {
      if (s.err) { console.log(`       ⚠ ${s.label} — 진입 실패: ${s.err}`); continue; }
      if (s.cycF) console.log(`       ⚠ ${s.label} — 1600 한 주기 비균등 ${s.cycF}자리 (최악 d=${s.worst.row.d} @${(s.worst.at * 100).toFixed(0)}% · ${s.worst.row.sel})`);
    }
    if (!rowsAll || !pinnedAll) bad(`[6] 전제 실패 — 매체 행 ${rowsAll} · 못박은 애니 노드 ${pinnedAll} (0 이면 이 인구조사는 헛초록)`);
    else if (wrongResize.length) bad(`[6] 리사이즈가 안 먹은 화면 ${wrongResize.length}개 — 이 인구조사는 2280 을 두 번 잰 값이다`);
    else if (!frameMovedAll) bad('[6] 프레임 사이에 상자가 한 자리도 안 움직였다 — 두 수가 같은 프레임의 수다 (헛초록 방지)');
    else if (sum('cycF')) bad(`[6] 제품에 «1600 한 주기» 매체 비균등 ${sum('cycF')}자리(그중 1600 전용 ${sum('onlyShort')})`);
    else ok(`[6] 제품 1600 한 주기 비균등 0자리 — 매체 ${rowsAll}행 · 애니 ${pinnedAll}개를 실제로 못박고, 프레임이 상자를 ${frameMovedAll}자리 움직인 채로 잰 0 이다`);
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r32: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
