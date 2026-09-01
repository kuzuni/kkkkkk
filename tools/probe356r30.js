#!/usr/bin/env node
/* 작업 356 — 30회차 축: **매체 축을 짧은 프레임(9:13.3)에서도 잰다** (`verify356` [N] 의 재료)
 *
 *   node tools/probe356r30.js            # 합성 표본 — 되돌림 · 음성항 · «프레임 전용» 갈래 (빠르다)
 *   node tools/probe356r30.js --census   # 제품 전 화면 인구조사 · 2280 ↔ 1600 대조 (느리다 · 등재값의 대조군)
 *   node tools/probe356r30.js --json     # 기계 판독용
 *
 * ── 왜 이 회차인가 (29회차 인계문 §36-7 의 마지막 줄) ────────────────────────
 * 29회차가 열째 프런티어(«내용 좌표계 ↔ 표시 상자»)를 닫으면서 **자기 한계를 하나 적어 넘겼다**:
 *
 *   > ⚠ 아직 안 밟은 것 하나 — [M] 은 **2280 프레임**에서만 잰다. 1600(9:13.3)에서 상자가 줄면
 *   >   비트맵 비와 어긋날 수 있는데 그 프레임의 매체 축은 **아직 아무도 안 봤다**.
 *   >   값은 공짜다 — `sweep()` 의 리사이즈 **뒤**에 `COLLECT_MEDIA` 를 한 번 더 부르면 된다.
 *
 * 그 «공짜» 는 값이 공짜라는 뜻이지 **결과를 안다는 뜻이 아니다**(338 규칙). 그래서 이 자가 먼저 잰다.
 *
 * ── 이 층이 짧은 프레임에서 «다를 수 있는» 구조적 이유 ───────────────────────
 * [A] 축(노드에 걸린 배율)이 프레임을 타는 이유는 [F] 가 적어 놨다 — 짧아진 시트에서 요소가
 * `transform` 으로 눌린다. **매체 축이 프레임을 타는 이유는 그것과 다르다**:
 *
 *   ⓐ **캔버스 상자만 줄고 비트맵은 안 준다.** `#stagearea{flex:1}` 이 남는 높이를 흡수하므로
 *      프레임이 680px 짧아지면 전투 캔버스 **상자**가 그만큼 낮아진다. 그때 `canvas.width/height`
 *      (비트맵 = 내용 좌표계)를 같이 안 고치면 **비가 어긋나 그림이 눌린다** — 배율은 한 줄도 안 걸린다.
 *      ⇒ `resize` 핸들러가 비트맵을 다시 잡아 주는가가 이 축의 물음이고, 2280 에서는 **구조적으로 안 보인다.**
 *   ⓑ `height:100%`·`aspect-ratio` 없이 **높이만 백분율로 잡힌 매체**는 프레임을 그대로 탄다.
 *
 * ⇒ «2280 에서 0» 은 «1600 에서 0» 의 근거가 못 된다. 두 수는 다른 수다(29회차가 «자리»와 «행» 을
 *   갈라 적은 것과 같은 규율 — 하나를 다른 하나의 근거로 인용하지 마라).
 *
 * ── 29회차가 남긴 공짜 한 줄도 같이 센다 ─────────────────────────────────────
 * §36-4 는 SVG 갈래에 대해 이렇게 적고 «다음 회차의 공짜 한 줄» 로 넘겼다:
 *
 *   > 제품 SVG 중 «상자 비 ≠ 내용 비» 인 자리가 몇인지는 이 회차가 안 셌다.
 *
 * 그 수가 곧 **«상자 비로 쟀으면 헛빨강이었을 자리»** 의 제품 실측값이다(합성 표본 2자리가
 * [M-e] 를 세우고 있는데, 제품에서 몇 자리인지는 아무도 안 셌다). 이 자가 `--census` 에서 센다.
 *
 * ⚠ **자를 두 벌로 안 적는다**(13회차 [R12]) — 수집기 `COLLECT_MEDIA` 와 판정 `verdict` 는
 *   `probe356r29` 것을 **그대로 받아 쓴다.** 이 파일이 새로 세우는 것은 «두 프레임을 나란히
 *   놓고 무엇이 갈리는가» 하나뿐이다.
 */
const { pw, launch } = require('./pwlaunch');
const R29 = require('./probe356r29.js');
const { COLLECT_MEDIA, verdict } = R29;

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

const TOL = R29.TOL;
const FRAME_D = { width: 1080, height: 2280 };   /* 기준(9:19) */
const FRAME_F = { width: 1080, height: 1600 };   /* 짧은 프레임(9:13.3) — [F] 와 같은 값 */

/* ── 합성 표본 — «프레임 전용» 갈래를 손으로 만든다 ─────────────────────────
   제품에서 그런 자리가 0건이더라도, **이 자가 그 자리를 볼 수 있다는 것**은 합성으로 선다.
   ⓗ 는 위 ⓐ 를 그대로 흉내낸 것이다: 상자 높이가 뷰포트에 매여 있고 비트맵은 고정.
   ⓘ 는 음성항 — 상자도 비트맵도 프레임과 무관해 두 프레임에서 똑같이 등방이다. */
const SYN_F = `<!doctype html><meta charset="utf-8"><body style="margin:0"><div id="app">
  <canvas id="cVh"   width="200" height="100" style="width:200px;height:100vh"></canvas>
  <canvas id="cFix"  width="200" height="100" style="width:200px;height:100px"></canvas>
</div></body>`;

/* 두 프레임의 줄을 셀렉터로 짝지어 «프레임 전용» 을 가른다.
   ⚠ 짝짓기 키는 «화면 + 셀렉터» 다 — 같은 셀렉터가 화면마다 다른 상자를 가질 수 있다. */
function pairUp(rowsD, rowsF, tol) {
  const key = (r) => (r.screen || '') + '|' + r.sel;
  const mapD = new Map();
  for (const r of rowsD) if (!mapD.has(key(r))) mapD.set(key(r), r);
  const isBad = (r) => r && r.scope === 'in' && Math.abs(r.d - 1) > tol;
  const onlyF = [], both = [], newInF = [], boxMoved = [];
  for (const f of rowsF) {
    const d = mapD.get(key(f));
    if (!d) { newInF.push(f); if (isBad(f)) onlyF.push(f); continue; }
    if (Math.abs(d.h - f.h) > 0.5 || Math.abs(d.w - f.w) > 0.5) boxMoved.push({ sel: f.sel, screen: f.screen, d: [d.w, d.h], f: [f.w, f.h] });
    if (isBad(f) && !isBad(d)) onlyF.push(f);
    else if (isBad(f) && isBad(d)) both.push(f);
  }
  return { onlyF, both, newInF, boxMoved };
}

module.exports = { SYN_F, pairUp, FRAME_D, FRAME_F };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 이 자가 «프레임 전용» 자리를 볼 수 있는가 ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN_F);
    await page.waitForTimeout(120);
    const tall = await page.evaluate(COLLECT_MEDIA);
    await page.setViewportSize({ width: 400, height: 200 });
    await page.waitForTimeout(120);
    const short = await page.evaluate(COLLECT_MEDIA);
    report.syn = { tall, short };
    const by = (rs, id) => rs.find((r) => r.sel.indexOf('#' + id) >= 0);

    console.log('[1] 되돌림 — 상자만 프레임을 타고 비트맵은 고정인 캔버스를 «짧은 프레임에서만» 잡는가');
    const vhT = by(tall, 'cVh'), vhS = by(short, 'cVh');
    /* 600px 뷰포트: 상자 200×600 ÷ 비트맵 2:1 ⇒ d = 0.333/2 … 둘 다 어긋나면 «프레임 전용» 이 아니다.
       그래서 큰 프레임 쪽을 비트맵 비에 맞춰 놓고(200×100) 시작할 수는 없다 —
       대신 **두 프레임의 d 가 서로 다르다**는 것으로 «이 축이 프레임을 탄다» 를 세운다. */
    if (vhT && vhS && Math.abs(vhT.d - vhS.d) > TOL)
      ok(`[1] ⓗ 상자 높이가 뷰포트에 매인 캔버스: 큰 프레임 d=${vhT.d} → 짧은 프레임 d=${vhS.d} (이 축은 프레임을 탄다)`);
    else bad(`[1] ⓗ 가 프레임을 안 탄다 — 이 자는 프레임 축을 못 본다: ${JSON.stringify(vhT)} / ${JSON.stringify(vhS)}`);

    console.log('[2] 음성항 — 프레임과 무관한 매체는 두 프레임에서 같은 값이다 (헛빨강 아님)');
    const fxT = by(tall, 'cFix'), fxS = by(short, 'cFix');
    if (fxT && fxS && Math.abs(fxT.d - 1) <= TOL && Math.abs(fxS.d - 1) <= TOL)
      ok(`[2] ⓘ 고정 상자 캔버스: 두 프레임 다 d=${fxT.d}/${fxS.d} — 프레임을 줄였다고 빨개지지 않는다`);
    else bad(`[2] ⓘ 음성항이 빨갛다: ${JSON.stringify(fxT)} / ${JSON.stringify(fxS)}`);

    console.log('[3] 짝짓기 — `pairUp` 이 «짧은 프레임에서만 빨간 자리» 를 실제로 가르는가');
    const p = pairUp(tall.map((r) => Object.assign({ screen: 'syn' }, r)),
                     short.map((r) => Object.assign({ screen: 'syn' }, r)), TOL);
    const sawMove = p.boxMoved.some((m) => m.sel.indexOf('#cVh') >= 0);
    const sawFix = p.boxMoved.some((m) => m.sel.indexOf('#cFix') >= 0);
    if (sawMove && !sawFix) ok(`[3] 상자가 실제로 움직인 자리 ${p.boxMoved.length}개 — ⓗ 는 잡히고 ⓘ 는 안 잡힌다 (리사이즈 무음 실패 감시가 선다)`);
    else bad(`[3] 짝짓기가 안 선다: 움직인 자리 ${JSON.stringify(p.boxMoved)}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 — 같은 페이지를 2280 에서 재고, 줄여서 1600 에서 한 번 더 잰다 ── */
  if (CENSUS) {
    const S = require('./scan356.js');
    const rowsD = [], rowsF = [], seenF = [];
    for (const [label, steps] of S.SCREENS) {
      const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(400);
        for (const st of (steps || [])) { await S.STEP(page, st); await page.waitForTimeout(150); }
        await page.waitForTimeout(200);
        for (const r of await page.evaluate(COLLECT_MEDIA)) rowsD.push(Object.assign({ screen: label }, r));
        await page.setViewportSize(FRAME_F);
        await page.waitForTimeout(420);
        seenF.push([label, await page.evaluate(() => window.innerHeight)]);
        for (const r of await page.evaluate(COLLECT_MEDIA)) rowsF.push(Object.assign({ screen: label }, r));
      } catch (e) { /* 진입 실패는 smoke 의 몫 */ }
      await ctx.close();
    }

    const vD = verdict(rowsD, TOL), vF = verdict(rowsF, TOL);
    const pair = pairUp(rowsD, rowsF, TOL);
    const wrongResize = seenF.filter(([, h]) => h > 1600);
    report.census = {
      rowsD: rowsD.length, rowsF: rowsF.length,
      badD: vD.bad.length, badF: vF.bad.length,
      blindD: vD.blind.length, blindF: vF.blind.length,
      onlyF: pair.onlyF.length, boxMoved: pair.boxMoved.length, newInF: pair.newInF.length,
      screens: seenF.length, wrongResize: wrongResize.length,
    };

    console.log(`\n[4] 리사이즈 전제 — 1600 수집에 닿은 화면 ${seenF.length}개 · innerHeight>1600 인 화면 ${wrongResize.length}개`);
    if (!seenF.length) bad('[4] 1600 수집에 한 번도 못 닿았다 (헛초록 방지)');
    else if (wrongResize.length) bad(`[4] 리사이즈가 안 먹은 화면 ${wrongResize.length}개 — 이 인구조사는 2280 을 두 번 잰 값이다`);
    else ok(`[4] ${seenF.length}화면 전부 1600 으로 줄었다`);

    console.log(`\n[5] 두 프레임 인구조사`);
    for (const [nm, rs] of [['2280', rowsD], ['1600', rowsF]]) {
      const line = ['canvas', 'svg', 'img'].map((k) => {
        const v = verdict(rs.filter((r) => r.kind === k), TOL);
        return `${k} 안 ${v.inScope.length}/밖 ${v.outs.length}/눈없음 ${v.blind.length}/비균등 ${v.bad.length}`;
      }).join(' · ');
      console.log(`     ${nm}: 행 ${rs.length} — ${line}`);
    }
    console.log(`     상자가 실제로 움직인 자리 ${pair.boxMoved.length} · 1600 에만 있는 행 ${pair.newInF.length}`);
    for (const r of vF.bad.slice(0, 12)) console.log('       ⚠ (1600 비균등) ' + r.screen + ' · ' + r.sel + ' d=' + r.d + ' 상자 ' + r.w + '×' + r.h + ' 내용 ' + (r.nw || r.vb) + '×' + (r.nh || ''));
    for (const r of vF.blind.slice(0, 8)) console.log('       ◻ (1600 눈 없음) ' + r.screen + ' · ' + r.sel + ' — ' + r.why);

    console.log('\n[6] 무음 실패 감시 — 상자가 한 자리도 안 움직였으면 이 인구조사는 같은 프레임을 두 번 잰 것이다');
    if (pair.boxMoved.length > 0) ok(`[6] 상자가 움직인 매체 ${pair.boxMoved.length}자리 — 두 수는 정말 다른 프레임의 수다`);
    else bad('[6] 상자가 한 자리도 안 움직였다 — 리사이즈가 매체에 안 닿았다(헛초록)');

    console.log('\n[7] 판정 — 짧은 프레임의 매체 비균등');
    if (!rowsF.length) bad('[7] 1600 에서 매체를 한 자리도 못 봤다 (헛초록 방지)');
    else if (vF.bad.length) bad(`[7] 1600 매체 비균등 ${vF.bad.length}행 (그중 «1600 에서만» ${pair.onlyF.length}행) — 제품 결함이다`);
    else ok(`[7] 1600 매체 비균등 0행 (사정권 안 ${vF.inScope.length} · 밖 ${vF.outs.length} · 눈 없음 ${vF.blind.length})`);

    /* ── 29회차가 넘긴 «공짜 한 줄» — 제품 SVG 중 상자 비 ≠ 내용 비 인 자리 수 ── */
    console.log('\n[8] 29회차가 넘긴 한 줄 — 제품 SVG 를 «상자 비» 로 쟀으면 헛빨강이었을 자리는 몇인가');
    const svgGhost = (rs) => {
      const seen = new Map();
      for (const r of rs) {
        if (r.kind !== 'svg') continue;
        const k = (r.screen || '') + '|' + r.sel;
        if (seen.has(k)) continue;
        const boxR = r.w / r.h;
        const contR = r.vb;                      /* viewBox 비 — 없으면 내용 비가 아예 없다 */
        seen.set(k, { r, ghost: contR ? Math.abs(boxR / contR - 1) > TOL : Math.abs(boxR - 1) > TOL });
      }
      return [...seen.values()];
    };
    const gD = svgGhost(rowsD), gF = svgGhost(rowsF);
    const nD = gD.filter((x) => x.ghost).length, nF = gF.filter((x) => x.ghost).length;
    report.svgGhost = { at2280: { total: gD.length, ghost: nD }, at1600: { total: gF.length, ghost: nF } };
    ok(`[8] 제품 SVG 자리 2280 ${gD.length}개 중 상자 비 ≠ 내용 비 **${nD}개** · 1600 ${gF.length}개 중 **${nF}개** `
      + `⇒ [M-e]/[N] 이 상자 비를 판정축으로 썼다면 그만큼이 헛빨강이었다 (실제 판정축은 preserveAspectRatio 라 0)`);
    for (const x of gD.filter((x) => x.ghost).slice(0, 8))
      console.log(`       · ${x.r.screen} ${x.r.sel} 상자 ${(x.r.w / x.r.h).toFixed(3)} vs 내용 ${x.r.vb === null ? '(viewBox 없음)' : x.r.vb}`);
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r30: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
