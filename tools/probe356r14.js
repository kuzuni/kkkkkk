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
 *
 * ── 14회차 실측(2026-08-31) — **두 번 돌렸고, 두 번이 서로 달랐다** ─────────────
 *   1차: R 노드 3618 · D 3531 · 비균등 **둘 다 0** · [2] 0화면 · [3] 0노드 · onlyD **0**
 *   2차: R 노드 3618 · D 3531 · 비균등 **둘 다 0** · [2] 0화면 · [3] **2노드** · onlyD **4**
 *
 *   ⚑ **안 움직인 것과 움직인 것을 갈라 읽어라.**
 *   · 안 움직인 것 = **비균등 0 · [2] 갈린 화면 0 · 결정 축([4]) 0** — 이 게이트가 묻는 축이다.
 *   · 움직인 것 = 표본 크기와 미세 ratio. 2차의 드리프트 2노드는 둘 다
 *     `div.dnc.bgm-gold>div.th>canvas.thcv`(던전 카드 썸네일 = **애니메이션 캔버스**)이고
 *     1.0074↔1.0013 · 1.0007↔1.0057 로 **TOL 0.02 의 3분의 1** 이다. 두 화면에서 방향까지
 *     뒤집혔다 = 방법 차이가 아니라 **프레임을 언제 잡았나** 다(356-㉓ · 344·372 전례).
 *
 *   [1] 표본 크기 차는 두 번 다 같은 4화면이다 — **35 패스 네 탭**(스테이지·시련·절망 158 vs 134 ·
 *   출석 108 vs 93). 뿌리는 추측이 아니라 소스에 있다: `passWin()`(index.html **34247**)이 창을
 *   `$('psList').clientHeight` 로 잡고 `passFillRows()` 는 스크롤·재채움 때만 도는데
 *   `setViewportSize` 는 그 둘 중 어느 것도 안 부른다(493 가상 목록) ⇒ R 은 2280 창의 행을
 *   그대로 **1600 기하로** 재고 D 는 1600 창의 행만 만든다. 재는 기하는 둘 다 1600 이다.
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

  /* ── 판정 ──────────────────────────────────────────────────────────────────
     ⚠⚠ **이 대조는 결정적이 아니다.** 14회차에 같은 트리에서 두 번 돌렸더니
     `onlyD` 0 → 4 · ratio 드리프트 0 → 2노드로 값이 움직였다(움직인 자리는 던전 카드 썸네일
     `canvas.thcv` = **애니메이션 캔버스**이고 폭은 0.7% 로 TOL 0.02 의 3분의 1이다).
     ⇒ 356-㉓ 규율 그대로 — **흔들리는 자에서 뽑은 차분을 결론으로 쓰면 유령을 쫓는다.**

     그래서 판정을 «두 방법이 완전히 같은가» 로 두지 않는다. 래칫이 실제로 두려워하는 것은 하나뿐이다:
       **«D 가 비균등으로 잡는 자리를 R 이 놓치는가»**(= 거짓 초록).
     그 외의 차이 — 표본 크기, 판정을 안 뒤집는 ratio 흔들림, 균등한 노드의 들락거림 — 은
     이 게이트의 물음(«어느 자리가 눌렸나»)에 답을 바꾸지 못한다. 관찰로만 적는다. */
  const badDset = new Map();   /* D 가 비균등으로 잡은 자리 → 화면 */
  const seenRset = new Map();  /* R 이 그 자리를 보긴 했는가 / 비균등으로 봤는가 */
  for (const r of rows) {
    for (const s of r.badD) badDset.set(s.split('=')[0] + ' @' + r.screen, s);
    for (const s of r.badR) seenRset.set(s.split('=')[0] + ' @' + r.screen, s);
  }
  const missed = [...badDset.keys()].filter((k) => !seenRset.has(k));
  const onlyD = sum((r) => r.onlyD.length);
  const onlyR = sum((r) => r.onlyR.length);
  const drifted = sum((r) => r.drift.length);

  console.log(`\n[4] 결정 축 — D 가 «비균등» 으로 잡은 자리 ${badDset.size}개 중 R 이 놓친 것 ${missed.length}개`);
  for (const k of missed) console.log(`   놓침: ${k} (D ${badDset.get(k)})`);

  if (missed.length) {
    console.log(`\n판정: **갈린다 — 게이트는 1600 에서 따로 몰아야 한다.**`
      + `\n  R 이 D 의 비균등 자리 ${missed.length}개를 못 본다 = 리사이즈 방식은 거짓 초록을 낸다.`);
  } else {
    console.log(`\n판정: **리사이즈 방식으로 게이트에 올려도 된다.**`
      + `\n  D 가 비균등으로 잡은 자리 ${badDset.size}개를 R 이 하나도 안 놓친다(거짓 초록 0).`
      + `\n  ⚠ 아래는 «관찰» 이지 결격이 아니다 — 표본 크기 차 ${nodeMismatch.length}화면`
      + `(R 만 ${onlyR} · D 만 ${onlyD}) · 판정을 안 뒤집는 ratio 흔들림 ${drifted}노드.`
      + `\n  ⚠ 이 자는 실행마다 그 «관찰» 값이 움직인다(애니메이션 캔버스) — 차분을 결론으로 쓰지 마라(356-㉓).`);
  }
  process.exit(0);
})();
