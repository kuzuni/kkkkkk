#!/usr/bin/env node
/* 356 14회차 재현기 — **프레임 축을 게이트에 올리기 전에, 싸게 재는 방법이 정말 같은 값을 주는지** 묻는다
 *
 *   node tools/probe356r14.js          # 두 방법을 나란히 돌려 대조
 *   node tools/probe356r14.js --json
 *
 * ── 왜 이 자가 필요한가 (338 규칙 — 처방 전에 재현) ──────────────────────────
 * 13회차가 넘긴 숙제는 한 줄이다: «[B] 프레임 축(1080×1600)을 [S3] 처럼 **래칫**으로 게이트에
 * 올리고 지금 값 0 을 상한으로 적어라». 그런데 같은 문장이 **왜 아직 안 올렸는지**도 적어 뒀다 —
 * «56화면 × 1프레임을 더 도는 값이라 `verify356` 이 그만큼 길어진다».
 *
 * 값이 싸지는 길이 하나 있다. 게이트의 `sweep()` 은 화면마다
 *   ① 새 컨텍스트 → ② `goto` → ③ 단계 클릭 n번 → ④ `COLLECT`
 * 를 도는데, ①~③ 이 비용의 거의 전부이고 ④ 는 한 번의 `page.evaluate` 다.
 * ⇒ **④ 를 두 번** 하면(2280 에서 한 번, `setViewportSize(1080×1600)` 뒤에 한 번)
 *    프레임 축이 «스윕 한 벌» 이 아니라 «evaluate 한 번» 값이 된다.
 *
 * ⚠ 단, 그것은 **같은 값일 때만** 정당하다. 두 방법은 원리적으로 갈릴 수 있다:
 *   · 열 때 JS 가 인라인으로 치수를 박는 시트·팝업은 리사이즈에 안 따라온다(= 2280 기하를 그대로 잰다)
 *   · 반대로 리사이즈 핸들러(`fit()`)가 도는 자리는 따라온다
 *   둘이 갈리면 싼 방법은 **헛초록**이다 — 12·13회차가 «조용히 빠진 화면» 으로 두 번 데인 그 모양이다.
 *
 * 그래서 이 자는 판정을 안 한다. **두 방법을 같은 트리에서 나란히 돌려 세 축으로 대조**한다:
 *   [1] 화면별 관측 노드 수      — 리사이즈 뒤에 노드가 사라지거나 늘어나는가
 *   [2] 비균등(|ratio−1|>TOL) 자리 — 한쪽만 잡는 자리가 있는가 (이것이 헛초록의 얼굴이다)
 *   [3] 공통 노드의 ratio 차     — 같은 셀렉터를 두 방법이 다른 비율로 재는가 (가장 예민한 축)
 *
 * 판정은 `verify356` 이 하고, 이 자는 그 판정을 **올려도 되는지** 만 답한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ 13회차 [R12] — 수집기(COLLECT)뿐 아니라 **구동기(STEP)도** 스캐너에서 받아 쓴다.
   손으로 다시 적으면 `js:` 같은 새 단계 종류를 만났을 때 화면 하나가 조용히 빠진다. */
const { COLLECT, URL, TOL, SCREENS, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');
const TALL = { width: 1080, height: 2280 };
const SHORT = { width: 1080, height: 1600 };
/* [3] 축의 문턱 — TOL(0.02) 의 1/4. 같은 값이라면 반올림 자리(0.0001)에서만 갈려야 한다. */
const DRIFT = 0.005;

const key = (r) => r.sel;

async function drive(browser, viewport, steps, resizeTo) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const miss = [];
  let got = [];
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    for (const s of steps) {
      if (!(await STEP(page, s))) miss.push(s);
      await page.waitForTimeout(420);
    }
    await page.waitForTimeout(250);
    if (resizeTo) {
      await page.setViewportSize(resizeTo);
      /* `fit()` 은 resize 핸들러에서 돌고, 그 뒤 레이아웃·페인트가 한 프레임 더 필요하다. */
      await page.waitForTimeout(420);
    }
    got = await page.evaluate(COLLECT, { all: false });
  } catch (e) {
    miss.push('EX:' + String(e.message || e).split('\n')[0]);
  }
  await ctx.close();
  return { got, miss };
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const [label, steps] of SCREENS) {
    /* R = 2280 에서 몰고 → 1600 으로 리사이즈 → 수집 (싼 방법) */
    const R = await drive(browser, TALL, steps, SHORT);
    /* D = 처음부터 1600 에서 몰고 → 수집 (13회차 probe356r12 [B] 와 같은 방법) */
    const D = await drive(browser, SHORT, steps, null);

    const badR = R.got.filter((g) => Math.abs(g.ratio - 1) > TOL);
    const badD = D.got.filter((g) => Math.abs(g.ratio - 1) > TOL);
    const mapR = new Map(R.got.map((g) => [key(g), g]));
    const mapD = new Map(D.got.map((g) => [key(g), g]));
    const drift = [];
    for (const [k, gR] of mapR) {
      const gD = mapD.get(k);
      if (!gD) continue;
      if (Math.abs(gR.ratio - gD.ratio) > DRIFT) drift.push({ sel: k, R: gR.ratio, D: gD.ratio });
    }
    const onlyR = [...mapR.keys()].filter((k) => !mapD.has(k));
    const onlyD = [...mapD.keys()].filter((k) => !mapR.has(k));
    rows.push({
      screen: label,
      nR: R.got.length, nD: D.got.length,
      badR: badR.map((g) => `${g.sel}=${g.ratio}`), badD: badD.map((g) => `${g.sel}=${g.ratio}`),
      drift, onlyR, onlyD, missR: R.miss, missD: D.miss,
    });
  }
  await browser.close();

  const sum = (f) => rows.reduce((a, r) => a + f(r), 0);
  const nodeMismatch = rows.filter((r) => r.nR !== r.nD);
  const badMismatch = rows.filter((r) => r.badR.join('|') !== r.badD.join('|'));
  const driftRows = rows.filter((r) => r.drift.length);
  const missRows = rows.filter((r) => r.missR.length || r.missD.length);

  if (JSON_OUT) { console.log(JSON.stringify({ TOL, DRIFT, rows }, null, 1)); process.exit(0); }

  console.log(`[probe356r14] 두 방법 대조 — ${SCREENS.length}화면 · TOL ${TOL} · 드리프트 문턱 ${DRIFT}`);
  console.log(`  R(2280 구동 → 1600 리사이즈 → 수집)  노드 ${sum((r) => r.nR)}개 · 비균등 ${sum((r) => r.badR.length)}개`);
  console.log(`  D(1600 구동 → 수집 · 13회차 방법)     노드 ${sum((r) => r.nD)}개 · 비균등 ${sum((r) => r.badD.length)}개`);

  console.log(`\n[1] 화면별 관측 노드 수 — 어긋난 화면 ${nodeMismatch.length}개`);
  for (const r of nodeMismatch) console.log(`   ${r.screen}: R ${r.nR} vs D ${r.nD} (R만 ${r.onlyR.length} · D만 ${r.onlyD.length})`);

  console.log(`\n[2] 비균등 자리 — 두 방법이 갈린 화면 ${badMismatch.length}개`);
  for (const r of badMismatch) console.log(`   ${r.screen}: R [${r.badR.join(' ')}] vs D [${r.badD.join(' ')}]`);

  console.log(`\n[3] 공통 노드 ratio 드리프트(>${DRIFT}) — ${driftRows.length}화면 · ${sum((r) => r.drift.length)}노드`);
  for (const r of driftRows) for (const d of r.drift) console.log(`   ${r.screen}  ${d.sel}  R ${d.R} vs D ${d.D}`);

  console.log(`\n[!] 무음 실패 — ${missRows.length}화면`);
  for (const r of missRows) console.log(`   ${r.screen}: R [${r.missR.join(' ')}] D [${r.missD.join(' ')}]`);

  const same = !nodeMismatch.length && !badMismatch.length && !driftRows.length;
  console.log(`\n판정: 두 방법은 ${same ? '**같은 값**을 준다 — 리사이즈 방식으로 게이트에 올려도 된다' : '**갈린다** — 게이트는 1600 에서 따로 몰아야 한다'}`);
  process.exit(0);
})();
