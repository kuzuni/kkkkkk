#!/usr/bin/env node
/* 작업 634 — 356 의 **캔버스 축을 전 화면으로** (28회차 축 · `verify356` [L] 의 재료)
 *
 *   node tools/probe356r28.js          # 되돌림 · [A] 대조 · 음성항 (한 화면 — 빠르다)
 *   node tools/probe356r28.js --all    # 전 화면 스윕으로 커버리지 실측(느리다 · 등재문 수치의 대조군)
 *   node tools/probe356r28.js --json   # 기계 판독용
 *
 * ── 무엇을 묻는가 ────────────────────────────────────────────────────────────
 * 23회차가 세운 **캔버스 안 픽셀** 축([G-b] drawImage 비균등 · [G-g] 비균등 컨텍스트 변환)은
 * `verify356` 에서 **대표 4화면**만 돈다. 26회차 인계문이 그 접기를 이렇게 정당화했다 —
 *   « [G]·[I] 는 [A] 가 이미 도는 축의 «다른 각도» 라 대표 화면으로 접어도 되지만,
 *     의사 요소는 [A] 가 **구조적으로 못 보는** 노드라 대표 화면으로 접으면 그만큼이 그냥 구멍이다. »
 * **기준은 옳은데 [G] 가 잘못 분류돼 있었다.** [I](시간)는 정말로 «[A] 가 도는 그 노드의 다른
 * 위상» 이지만, [G] 가 보는 것은 캔버스 **안에 구워진** 픽셀이고 23회차 자신이
 * «`getComputedStyle` 로는 영영 안 보인다» 고 적어 뒀다 = **[A] 가 구조적으로 못 보는 자리**다.
 * 그 기준을 그대로 대면 이 축이야말로 «접으면 구멍» 이다.
 *
 * ── 왜 값이 공짜인가 ─────────────────────────────────────────────────────────
 * [J](26회차 의사 축)·[F](14회차 프레임 축)와 **같은 손**이다: 스윕을 한 벌 더 돌지 않고,
 * 이미 열려 있는 페이지에 훅을 얹어 `evaluate` 를 한 번 더 한다. 화면 진입 비용(컨텍스트·goto·
 * 단계 클릭)이 이 자의 거의 전부이므로, 71화면 커버리지가 **evaluate 71번** 값이 된다.
 *
 * ⚠ **훅을 새로 적지 않는다**(13회차 [R12]) — `probe356r23.initHook` 을 그대로 받아 쓴다.
 *   그 훅이 `getTransform()` 을 **일부러 안 부르는** 이유가 거기 주석에 있다(60fps 전투 캔버스에서
 *   훅 자체가 게임을 느리게 만든다 · 23회차 1판이 그래서 71화면을 다 못 돌았다).
 *   대신 변환을 **거는 쪽**(scale/transform/setTransform)을 훅해 컨텍스트마다 표시를 남긴다.
 *
 * ⚠ 번호·이름 주의 — `probe356r27`·[K] 는 **다른 27회차**(의사 «이름» 축)가 이미 쓴 이름이다.
 *   이 작업은 `probe356r28`·[L] 이다(등재문의 당부).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, COLLECT, URL, STEP } = require('./scan356.js');
const R23 = require('./probe356r23.js');

const TOL = 0.02;
const JSON_OUT = process.argv.includes('--json');
const ALL = process.argv.includes('--all');

/* ── 주입 셋 — 되돌림·음성항 ──────────────────────────────────────────────────
   전부 `addInitScript` 로 **훅 «뒤»** 에 얹는다. 그러면 제품 호출이
   주입 → 훅 → 원본 순으로 흘러 훅이 «주입된 뒤의 인자» 를 본다.
   ⚠ 제품을 고쳐서 되돌림을 만들지 않는다 — 페이지 안에서만 산다. */

/* 되돌림 — **세로만** ×0.6. 캔버스 안에서 눌러 그리므로 DOM 에는 흔적이 없다
   (= [A] 축이 구조적으로 못 보는 자리라는 것을 이 주입 하나가 실측으로 만든다). */
function SQUASH_Y() {
  const P = CanvasRenderingContext2D.prototype;
  const o = P.drawImage;
  P.drawImage = function () {
    const a = Array.prototype.slice.call(arguments);
    if (a.length === 9) a[8] = a[8] * 0.6;
    else if (a.length === 5) a[4] = a[4] * 0.6;
    return o.apply(this, a);
  };
}

/* 음성항 — **등방** ×2. 크기 변경은 결함이 아니다(23회차 [G-d] 규율). */
function ISO2() {
  const P = CanvasRenderingContext2D.prototype;
  const o = P.drawImage;
  P.drawImage = function () {
    const a = Array.prototype.slice.call(arguments);
    if (a.length === 9) { a[7] = a[7] * 2; a[8] = a[8] * 2; }
    else if (a.length === 5) { a[3] = a[3] * 2; a[4] = a[4] * 2; }
    return o.apply(this, a);
  };
}

/* [G-g] 축의 되돌림 — 컨텍스트에 비균등 변환을 **한 번** 건다.
   `save()`/`restore()` 로 감싸 그림 자체는 안 건드린다(축이 사는지만 묻는다). */
const CTX_NU = function () {
  const c = document.querySelector('canvas');
  if (!c) return 0;
  const x = c.getContext('2d');
  if (!x) return 0;
  x.save(); x.scale(1, 0.6); x.restore();
  return 1;
};

/* ── 한 화면을 열어 «훅 값» 과 «[A] 축 값» 을 같이 꺼낸다 ─────────────────────
   [A] 대조가 같은 페이지·같은 순간에서 나와야 «구조적으로 못 본다» 가 실측이 된다. */
async function shot(browser, { screen = SCREENS[0], inject = null, ctxNu = false, tol = TOL } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const out = { label: screen[0], hk: null, aSeen: 0, aBad: 0, err: null, ctxNuInjected: 0 };
  try {
    await page.addInitScript(R23.initHook, tol);
    if (inject) await page.addInitScript(inject);
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    for (const s of screen[1]) { try { await STEP(page, s); } catch (e) {} await page.waitForTimeout(320); }
    await page.waitForTimeout(400);
    const rows = await page.evaluate(COLLECT, { all: false });
    out.aSeen = rows.length;
    out.aBad = rows.filter((r) => Math.abs(r.ratio - 1) > tol).length;
    if (ctxNu) out.ctxNuInjected = await page.evaluate(CTX_NU);
    out.hk = await page.evaluate(() => window.__r23 || null);
  } catch (e) { out.err = String(e.message || e).split('\n')[0]; }
  await ctx.close();
  return out;
}

/* ── 화면별 훅 스냅샷을 접는다 — `verify356` [L] 이 이것을 그대로 쓴다 ────────
   입력은 `[label, hk]` 줄의 배열. `hk` 는 `window.__r23` 그대로.
   ⚠ 자리(bad)는 **키(셀렉터+비율)** 로 접는다 — [B]·[F] 래칫과 같은 규율이다
     (호출 수로 접으면 프레임마다 값이 흔들린다). */
function fold(seen) {
  let calls = 0, err = 0, ctxNU = 0, live = 0;
  const bad = new Map();
  const dead = [];
  for (const [label, hk] of seen) {
    if (!hk) { dead.push(`${label}(훅 없음)`); continue; }
    calls += hk.calls; err += hk.err; ctxNU += hk.ctxNonUni;
    if (hk.calls > 0) live++; else dead.push(`${label}(호출 0)`);
    for (const k of Object.keys(hk.bad || {})) {
      if (!bad.has(k)) bad.set(k, Object.assign({ screen: label }, hk.bad[k]));
    }
  }
  return { screens: seen.length, live, dead, calls, err, ctxNU, bad: [...bad.values()] };
}

/* ── 전 화면 커버리지 실측(--all) — 등재문 수치의 대조군 ─────────────────────
   ⚠ 이것은 «비상시 자» 다. 상시 판정은 `verify356` [L] 이 **주 스윕 위에서 공짜로** 한다. */
async function sweepAll(browser) {
  const seen = [];
  for (const line of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    let hk = null;
    try {
      await page.addInitScript(R23.initHook, TOL);
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of line[1]) { try { await STEP(page, s); } catch (e) {} await page.waitForTimeout(400); }
      await page.waitForTimeout(200);
      hk = await page.evaluate(() => window.__r23 || null);
    } catch (e) {}
    await ctx.close();
    seen.push([line[0], hk]);
  }
  return seen;
}

module.exports = { SQUASH_Y, ISO2, CTX_NU, shot, fold, sweepAll, TOL };

/* ── CLI ─────────────────────────────────────────────────────────────────── */
if (require.main === module) (async () => {
  let PASS = 0, FAIL = 0;
  const ok = (c, m) => { (c ? PASS++ : FAIL++); if (!JSON_OUT) console.log(`  ${c ? '✓' : '✗'} ${m}`); return c; };
  const browser = await launch(chromium);
  const out = {};

  if (ALL) {
    const seen = await sweepAll(browser);
    const g = fold(seen);
    out.all = g;
    if (!JSON_OUT) {
      console.log(`[전 화면] ${g.screens}화면 · 캔버스가 도는 화면 ${g.live} · drawImage ${g.calls}건 · 훅 예외 ${g.err}건`);
      console.log(`          비균등 그리기 ${g.bad.filter((r) => r.inApp).length}자리 · 비균등 컨텍스트 변환 ${g.ctxNU}회`);
      if (g.dead.length) console.log(`          캔버스가 안 도는 화면 ${g.dead.length}: ${g.dead.join(' · ')}`);
      for (const r of g.bad.filter((x) => x.inApp)) console.log(`          · ${r.screen} ${r.sel} ×${r.ratio} (${r.src})`);
    }
    ok(g.live === SCREENS.length, `[1] 캔버스가 도는 화면 ${g.live}/${SCREENS.length} (대표 4화면이 아니라 전 화면에서 축이 산다)`);
    ok(g.calls > 0 && !g.err, `[2] drawImage 관측 ${g.calls}건 · 훅 예외 ${g.err}건`);
    ok(!g.bad.filter((r) => r.inApp).length, `[3] 지금 트리의 비균등 그리기 ${g.bad.filter((r) => r.inApp).length}자리`);
    ok(!g.ctxNU, `[4] 지금 트리의 비균등 컨텍스트 변환 ${g.ctxNU}회`);
  }

  /* ⓐ 지금 트리 — 한 화면(대조 기준선) */
  const now = await shot(browser, {});
  out.now = { calls: now.hk && now.hk.calls, aSeen: now.aSeen, aBad: now.aBad, err: now.err };
  ok(!!now.hk && now.hk.calls > 0, `[5] 전제 — «${now.label}» 에서 drawImage ${now.hk ? now.hk.calls : 0}건 관측 (훅이 살아 있다)`);
  const nowBad = now.hk ? Object.values(now.hk.bad).filter((r) => r.inApp) : [];
  ok(!nowBad.length, `[6] 지금 트리 «${now.label}» 비균등 그리기 ${nowBad.length}자리`);

  /* ⓑ 되돌림 — 세로만 ×0.6 을 심으면 잡히는가 */
  const sq = await shot(browser, { inject: SQUASH_Y });
  const sqBad = sq.hk ? Object.values(sq.hk.bad).filter((r) => r.inApp) : [];
  out.squash = { hit: sqBad.length, aBad: sq.aBad, aSeen: sq.aSeen };
  ok(sqBad.length > 0, `[7] 되돌림 — 세로만 ×0.6 을 심으면 ${sqBad.length}자리로 잡는다`
    + (sqBad.length ? ` (최악 ×${sqBad.map((r) => r.ratio).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1))[0]})` : ''));

  /* ⓒ [A] 대조 — **이 절의 본체.** 같은 주입을 [A] 축(`scan356.COLLECT`)은 못 본다.
     여기서 0 이 나와야 «[G] 는 [A] 가 도는 축의 다른 각도가 아니다» 가 실측이 된다. */
  ok(sq.aBad === 0 && sq.aSeen > 0,
    `[8] [A] 대조 — 같은 주입을 [A] 축은 ${sq.aBad}자리로 읽는다(관측 ${sq.aSeen}노드). `
    + `캔버스 안 픽셀은 \`getComputedStyle\` 에 흔적이 없다 ⇒ 대표 화면으로 접으면 그만큼이 구멍이다`);

  /* ⓓ 음성항 — 등방 ×2 는 결함이 아니다 */
  const iso = await shot(browser, { inject: ISO2 });
  const isoBad = iso.hk ? Object.values(iso.hk.bad).filter((r) => r.inApp) : [];
  out.iso = { hit: isoBad.length, calls: iso.hk && iso.hk.calls };
  ok(isoBad.length === 0 && iso.hk && iso.hk.calls > 0,
    `[9] 음성항 — 등방 ×2 는 ${isoBad.length}자리 (관측 ${iso.hk ? iso.hk.calls : 0}건 · 크기 변경은 결함이 아니다)`);

  /* ⓔ [G-g] 축 되돌림 — 비균등 컨텍스트 변환 */
  const cn = await shot(browser, { ctxNu: true });
  out.ctxNu = { injected: cn.ctxNuInjected, counted: cn.hk && cn.hk.ctxNonUni };
  ok(cn.ctxNuInjected === 1 && cn.hk && cn.hk.ctxNonUni > 0,
    `[10] 되돌림 — \`ctx.scale(1,0.6)\` 을 한 번 걸면 비균등 컨텍스트 변환 ${cn.hk ? cn.hk.ctxNonUni : 0}회로 잡는다`);

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
  console.log(`\nPROBE356R28 ${PASS}/${PASS + FAIL} ` + (FAIL ? 'FAIL' : 'PASS'));
  process.exit(FAIL ? 1 : 0);
})();
