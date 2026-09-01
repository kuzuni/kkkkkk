#!/usr/bin/env node
/* 작업 356 — 31회차 축: **매체 축 × 시간** (`verify356` [O] 의 재료)
 *
 *   node tools/probe356r31.js            # 합성 표본 — 되돌림 · 음성항 · 전제 (빠르다)
 *   node tools/probe356r31.js --census   # 제품 전 화면 인구조사 · 한 점 ↔ 한 주기 대조 (느리다)
 *   node tools/probe356r31.js --json     # 기계 판독용
 *
 * ── 왜 이 회차인가 (30회차 인계문 §37-8 의 «다음 자리 후보 ⓐ») ─────────────────
 * 30회차가 열한째 프런티어(«매체 축 × 프레임»)를 닫으면서 다음 자리를 이름까지 적어 넘겼다:
 *
 *   > ⓐ **매체 축 × 시간** — [I] 가 [A] 축에 대해 한 «한 주기 위상 스윕» 을 이 층은 안 한다.
 *   >    캔버스 상자를 애니메이션으로 흔드는 자리가 생기면 두 프레임의 **한 점**만 보는 지금 자는 못 본다.
 *
 * 24회차 규율이 그것을 이 회차의 일로 만든다 — **«자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»**
 * ⚠ 그리고 «다음 자리를 안다» 는 «결과를 안다» 가 아니다(338 규칙) — 그래서 자를 올리기 전에 **재현부터** 한다.
 *
 * ── 이 층이 시간을 타는 «구조적 이유» ([I] 의 이유와 다르다) ────────────────────
 *   [I](25회차)가 시간을 타는 이유: 노드에 걸린 **배율**이 키프레임 안에서 종횡이 갈린다.
 *   이 절이 시간을 타는 이유: **배율이 한 줄도 안 걸린 채** `width`/`height`(또는 `inset`·`flex`)가
 *   키프레임으로 움직여 **상자만** 흔들리고 내용 좌표계(비트맵·viewBox·원본)는 그대로 있는 것이다.
 *   ⇒ 그 노드는 [A]·[I] 에게 `transform:none` 이고 [M]·[N] 에게는 «가라앉은 뒤의 한 점» 이라 초록이다.
 *
 * ⚠ **«한 점에서 0» 은 «한 주기에서 0» 의 근거가 못 된다** — 29·30회차가 되풀이한 그 규율
 *   (하나를 다른 하나의 근거로 인용하지 마라)의 시간 판이다.
 *
 * ⚠ **자를 두 벌로 안 적는다**(13회차 [R12]):
 *     수집기 `COLLECT_MEDIA` 와 판정 `verdict` 는 `probe356r29` 것을,
 *     위상 못박기 `PIN` 과 주기 칸수 `PHASES` 는 `probe356r25` 것을 **그대로 받아 쓴다.**
 *   이 파일이 새로 세우는 것은 **«한 주기에서의 최악 위상을 노드마다 접는 것»**(`worstOverCycle`) 하나다.
 */
const { pw, launch } = require('./pwlaunch');
const R29 = require('./probe356r29.js');
const R25 = require('./probe356r25.js');
const { COLLECT_MEDIA, verdict } = R29;
const { PIN, PHASES } = R25;

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

const TOL = R29.TOL;
const FRAME_D = { width: 1080, height: 2280 };

/* ── 합성 표본 ────────────────────────────────────────────────────────────────
   ⓙ 상자 **높이만** 키프레임으로 흔들리는 캔버스. 0%·100% 는 비트맵 비와 맞고 한복판만 어긋난다
      ⇒ 가라앉은 한 점([M]·[N] 이 재는 그 점)에서는 **초록**이고 주기 한복판에서만 빨갛다.
   ⓚ 음성항 — 상자가 흔들리되 **종횡이 같이** 커진다. 어느 위상에서도 비가 안 어긋난다
      ⇒ «애니메이션이 걸려 있으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다. */
const SYN_T = `<!doctype html><meta charset="utf-8"><style>
  @keyframes __t31sq  {0%,100%{height:100px}50%{height:300px}}
  @keyframes __t31prop{0%,100%{width:200px;height:100px}50%{width:400px;height:200px}}
  #cSq  {width:200px;height:100px;animation:__t31sq   40s linear infinite}
  #cProp{width:200px;height:100px;animation:__t31prop 40s linear infinite}
</style><body style="margin:0"><div id="app">
  <canvas id="cSq"   width="200" height="100"></canvas>
  <canvas id="cProp" width="200" height="100"></canvas>
  <div class="dup"><canvas class="cd" width="100" height="100" style="width:100px;height:100px"></canvas></div>
  <div class="dup"><canvas class="cd" width="100" height="100" style="width:60px;height:60px"></canvas></div>
</div></body>`;
/* ⚠ 뒤의 둘(`div.dup>canvas.cd`)은 **애니메이션이 없고 크기만 다른 쌍둥이**다 — 경로 문자열이 똑같아서
   접기 키에 순번이 없으면 «한 자리가 40px 움직였다» 로 세진다(13 재화 탭에서 실제로 그랬다).
   `[5]`/`[O-e3]` 이 그 함정을 문다. */

/* 한 주기를 훑어 **노드마다 최악 위상**을 접는다. 이 파일이 새로 세우는 유일한 것.
   ⚠ 키는 «화면 + 셀렉터» 다([N] `pairUp` 과 같은 규약 — 같은 셀렉터가 화면마다 다른 상자를 갖는다). */
function worstOverCycle(perPhase, tol) {
  const worst = new Map();
  for (const { at, rows } of perPhase) {
    for (const r of rows) {
      if (r.scope !== 'in' || r.d == null) continue;
      const key = (r.screen || '') + '|' + r.sel;
      const dev = Math.abs(r.d - 1);
      const cur = worst.get(key);
      if (!cur || dev > cur.dev) worst.set(key, { key, dev, at, row: r });
    }
  }
  const all = [...worst.values()];
  return { all, bad: all.filter((x) => x.dev > tol).sort((a, b) => b.dev - a.dev) };
}

/* 한 화면분 위상 표본을 **하나의 줄**로 접는다 — `verify356` [O] 가 이것을 그대로 받아 쓴다.
   ⚠ `boxMoved` 가 이 회차의 무음 실패 감시다([N-a2] 와 같은 규율): 위상을 열여섯 번 바꿨는데
      매체 상자가 한 자리도 안 움직였으면 그 0 은 **같은 순간을 열여섯 번 잰 0** 이다. */
function foldScreen(perPhase, tol, opt) {
  const cyc = worstOverCycle(perPhase, tol);
  const rest = verdict((perPhase[0] || { rows: [] }).rows, tol);
  const box = new Map();
  for (const { rows, tr } of perPhase) {
    /* ⚠⚠ **셀렉터는 한 화면에서 유일하지 않다** — `.gem>img.cic` 같은 경로는 카드마다 같은 문자열이다.
       그것을 키로 삼아 «최소↔최대 상자» 를 접으면 **서로 다른 노드의 크기 차이가 «움직임» 으로 둔갑한다**
       (1판이 그렇게 짰다가 13 재화 탭에서 «전용 4자리» 를 만들어 냈는데, 같은 노드를 위상별로 찍어 보니
        열여섯 칸 전부 79.91×79.91 로 **한 번도 안 움직였다**). ⇒ 키에 **등장 순번**을 붙인다.
       ⚠ 순번은 DOM 순서라 위상마다 같은 노드를 가리킨다(위상 스윕은 렌더를 안 바꾼다). */
    const seenSel = new Map();
    const idxOf = (sel) => { const n = (seenSel.get(sel) || 0); seenSel.set(sel, n + 1); return n; };
    const trSeen = new Map();
    const trBy = new Map((tr || []).map((t) => {
      const n = (trSeen.get(t.sel) || 0); trSeen.set(t.sel, n + 1);
      return [t.sel + '#' + n, t.ident];
    }));
    for (const r of rows) {
      const n = idxOf(r.sel);
      /* `naiveKey` 는 **반사실 대조군**이다 — 순번을 안 붙이면 무엇이 세지는지를 같은 자로 보여 준다
         (자를 두 벌로 안 적으려고 별도 구현이 아니라 **깃발**로 뒀다). */
      const key = (r.screen || '') + '|' + r.sel + ((opt && opt.naiveKey) ? '' : '#' + n);
      const cur = box.get(key);
      const trKey = key.slice(key.indexOf('|') + 1);
      const ident = trBy.has(trKey) ? trBy.get(trKey) : null;
      if (!cur) box.set(key, { key, w0: r.w, w1: r.w, h0: r.h, h1: r.h, everScaled: ident === false, sawTr: ident !== null });
      else {
        cur.w0 = Math.min(cur.w0, r.w); cur.w1 = Math.max(cur.w1, r.w);
        cur.h0 = Math.min(cur.h0, r.h); cur.h1 = Math.max(cur.h1, r.h);
        if (ident === false) cur.everScaled = true;
        if (ident !== null) cur.sawTr = true;
      }
    }
  }
  const moved = [...box.values()].filter((b) => (b.w1 - b.w0) > 0.5 || (b.h1 - b.h0) > 0.5);
  /* «이 절 전용» — 배율이 한 위상에서도 안 걸렸는데 상자가 움직인 자리. 배율이 미는 자리는 [A]·[I] 몫이다. */
  const movedTrFree = moved.filter((b) => b.sawTr && !b.everScaled);
  return {
    rows: (perPhase[0] || { rows: [] }).rows.length,
    restBad: rest.bad.length,
    cycBad: cyc.bad,
    maxDev: cyc.all.reduce((m, x) => Math.max(m, x.dev), 0),
    maxDevKey: (cyc.all.sort((a, b) => b.dev - a.dev)[0] || { key: null }).key,
    boxMoved: moved.length,
    movedKeys: moved.map((b) => b.key),
    boxMovedTrFree: movedTrFree.length,
    trFreeKeys: movedTrFree.slice(0, 3).map((b) => b.key),
  };
}

/* ⚑ **이 층 «전용» 자리를 가르는 자** — 상자가 움직였다고 전부 이 절의 것이 아니다.
   상자를 미는 것이 **배율**(transform·scale 프로퍼티)이면 그 자리는 [A]·[I] 도 본다(그쪽 축이다).
   이 절만 보는 자리는 **배율이 항등인 채** 상자가 움직인 자리다(`width`/`height` 키프레임 · 레이아웃).
   ⇒ 위상마다 «자신·조상에 배율이 걸렸는가» 를 같이 재서 `foldScreen` 이 둘을 가른다.
   ⚠ 안 가르면 «상자가 27자리 움직였다» 가 이 절의 커버리지인 것처럼 읽힌다 — 27자리 전부가
      남의 축이 미는 것일 수 있고, 그러면 이 절의 0 은 «없어서 0» 이지 «봐서 0» 이 아니다. */
const MEDIA_TR = function () {
  const app = document.getElementById('app');
  if (!app) return [];
  const out = [];
  function pathOf(el) {
    const o = []; let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = (e.tagName || '').toLowerCase();
      if (e.id) { s += '#' + e.id; o.unshift(s); break; }
      const cl = e.getAttribute && e.getAttribute('class');
      if (cl) s += '.' + String(cl).trim().split(/\s+/).slice(0, 3).join('.');
      o.unshift(s); e = e.parentElement;
    }
    return o.join('>');
  }
  const IDENT = /^(none|matrix\(1,\s*0,\s*0,\s*1,)/;
  for (const el of app.querySelectorAll('canvas, svg, img')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let ident = true;
    for (let e = el, n = 0; e && e !== document.body && n < 10; n++, e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (!IDENT.test(cs.transform || 'none')) { ident = false; break; }
      const sc = cs.scale;
      if (sc && sc !== 'none' && !/^1(\s+1)?(\s+1)?$/.test(String(sc).trim())) { ident = false; break; }
    }
    out.push({ sel: pathOf(el), ident });
  }
  return out;
};

/* 매체가 실제로 «흔들릴 수 있는 자리» 에 놓여 있는가 — 0 의 뜻을 가르는 전제(«없어서 0» ↔ «못 봐서 0»).
   자신 또는 조상에 `animation-name` 이 걸린 매체를 센다(상자는 조상이 흔들려도 흔들린다). */
const MEDIA_ANIM = function () {
  const app = document.getElementById('app');
  if (!app) return { total: 0, self: 0, anc: 0, names: [] };
  let total = 0, self = 0, anc = 0;
  const names = new Set();
  for (const el of app.querySelectorAll('canvas, svg, img')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    total++;
    let e = el, hitSelf = false, hitAnc = false;
    for (let n = 0; e && e !== document.body && n < 8; n++, e = e.parentElement) {
      const an = getComputedStyle(e).animationName;
      if (an && an !== 'none') {
        String(an).split(',').forEach((x) => names.add(x.trim()));
        if (n === 0) hitSelf = true; else hitAnc = true;
      }
    }
    if (hitSelf) self++;
    if (hitAnc) anc++;
  }
  return { total, self, anc, names: [...names] };
};

module.exports = { SYN_T, worstOverCycle, foldScreen, MEDIA_ANIM, MEDIA_TR, PHASES, FRAME_D };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 이 자가 «시간 전용» 자리를 볼 수 있는가 ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 600, height: 500 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN_T);
    await page.waitForTimeout(150);

    const pinned = await page.evaluate(PIN, 0);
    const perPhase = [];
    for (let k = 0; k < PHASES; k++) {
      await page.evaluate(PIN, k / PHASES);
      perPhase.push({ at: k / PHASES, rows: await page.evaluate(COLLECT_MEDIA), tr: await page.evaluate(MEDIA_TR) });
    }
    await page.evaluate(PIN, null);
    const atRest = verdict(perPhase[0].rows, TOL);
    const cyc = worstOverCycle(perPhase, TOL);
    report.syn = { pinned, atRest: atRest.bad.length, cycle: cyc.bad.length, worst: cyc.bad[0] || null };

    console.log('[1] 전제 — 위상을 정말 못박았는가 (못박은 게 0 이면 아래 초록은 전부 헛초록)');
    if (pinned > 0) ok(`[1] 애니 노드 ${pinned}개를 못박았다 · 주기 ${PHASES}칸을 훑었다`);
    else bad('[1] 못박은 애니 노드가 0개 — 이 자는 시간 축을 못 본다');

    console.log('[2] 되돌림 — 상자 «높이만» 흔들리는 캔버스: 한 점은 초록인데 한 주기는 빨갛다');
    const sq = cyc.bad.find((x) => x.key.indexOf('#cSq') >= 0);
    const sqRest = atRest.bad.find((r) => r.sel.indexOf('#cSq') >= 0);
    if (sq && !sqRest)
      ok(`[2] ⓙ 한 점(위상 0) 비균등 ${atRest.bad.length}자리 ↔ 한 주기 ${cyc.bad.length}자리 — `
        + `최악 d=${sq.row.d} @위상 ${(sq.at * 100).toFixed(0)}% (상자 ${sq.row.w}×${sq.row.h} · 비트맵 ${sq.row.nw}×${sq.row.nh} · 배율은 한 줄도 안 걸렸다)`);
    else bad(`[2] ⓙ 가 안 갈린다 — 한 점 ${JSON.stringify(sqRest || null)} / 한 주기 ${JSON.stringify(sq ? sq.row : null)}`);

    console.log('[3] 음성항 — 종횡이 같이 흔들리는 상자는 어느 위상에도 안 빨개진다 (헛빨강 아님)');
    const prop = cyc.all.find((x) => x.key.indexOf('#cProp') >= 0);
    const propBad = cyc.bad.find((x) => x.key.indexOf('#cProp') >= 0);
    if (prop && !propBad) ok(`[3] ⓚ 주기 최악 편차 ${prop.dev.toFixed(4)} ≤ 허용 ${TOL} — «애니메이션이 걸렸다» 는 이유만으로는 안 빨개진다`);
    else bad(`[3] ⓚ 음성항이 빨갛다: ${JSON.stringify(propBad ? propBad.row : null)}`);

    console.log('[5] 함정 — 같은 셀렉터를 쓰는 «크기만 다른 쌍둥이» 를 «움직였다» 로 세지 않는가');
    {
      const f = foldScreen(perPhase, TOL);
      const naive = foldScreen(perPhase, TOL, { naiveKey: true });
      const dupF = f.movedKeys.filter((k) => k.indexOf('canvas.cd') >= 0);
      const dupN = naive.movedKeys.filter((k) => k.indexOf('canvas.cd') >= 0);
      if (!dupF.length && dupN.length)
        ok(`[5] 순번 키: 쌍둥이 0자리 · **순번 없는 키(반사실 대조군)**: ${dupN.length}자리 ⇒ 13 재화 탭의 «전용 4자리» 는 이 겹침이 만든 유령이었다`);
      else bad(`[5] 함정이 안 재현되거나 안 막힌다 — 순번 키 ${dupF.length}자리 / 순번 없는 키 ${dupN.length}자리`);
    }

    console.log('[4] 대조군 — 같은 자리를 [A] 축(scan356.COLLECT)은 무엇이라 하는가');
    await page.evaluate(PIN, 0.5);
    const { COLLECT } = require('./scan356.js');
    const seen = await page.evaluate(COLLECT, { all: true });
    await page.evaluate(PIN, null);
    const sqOld = seen.find((s) => s.sel.indexOf('#cSq') >= 0);
    report.oldAxis = sqOld || null;
    if (!sqOld || Math.abs((sqOld.ratio ?? 1) - 1) <= 1e-6)
      ok(`[4] [A] 축은 한복판 위상의 ⓙ 를 ratio ${sqOld ? sqOld.ratio : '(안 셈)'} = 초록이라 한다 — 이 층의 눈이 [A] 에는 없다`);
    else bad(`[4] 대조군이 안 선다 — [A] 가 이미 본다: ${JSON.stringify(sqOld)}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 (--census) ── */
  if (CENSUS) {
    const S = require('./scan356.js');
    const t0 = Date.now();
    const perScreen = [];
    let pinnedAll = 0, rowsAll = 0, boxMovedAll = 0, trFreeAll = 0;
    const animAgg = { total: 0, self: 0, anc: 0, names: new Set() };
    for (const [label, steps] of S.SCREENS) {
      const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        for (const st of (steps || [])) { try { await S.STEP(page, st); } catch (_) {} await page.waitForTimeout(180); }
        await page.waitForTimeout(200);
        const am = await page.evaluate(MEDIA_ANIM);
        animAgg.total += am.total; animAgg.self += am.self; animAgg.anc += am.anc;
        am.names.forEach((n) => animAgg.names.add(n));
        const pinned = await page.evaluate(PIN, 0);
        const perPhase = [];
        for (let k = 0; k < PHASES; k++) {
          await page.evaluate(PIN, k / PHASES);
          const rows = (await page.evaluate(COLLECT_MEDIA)).map((r) => Object.assign({ screen: label }, r));
          perPhase.push({ at: k / PHASES, rows, tr: await page.evaluate(MEDIA_TR) });
        }
        await page.evaluate(PIN, null);
        const f = foldScreen(perPhase, TOL);
        pinnedAll += pinned; rowsAll += f.rows; boxMovedAll += f.boxMoved; trFreeAll += f.boxMovedTrFree;
        perScreen.push({ label, pinned, rows: f.rows, rest: f.restBad, cycle: f.cycBad.length, worst: f.cycBad[0] || null,
          maxDev: f.maxDev, boxMoved: f.boxMoved, animMedia: am.self + am.anc });
        console.log(`   · ${label} — 매체 ${f.rows} · 애니 ${pinned} · 상자 이동 ${f.boxMoved}(배율 없이 ${f.boxMovedTrFree}) · 최악 편차 ${f.maxDev.toFixed(4)} · 주기 비균등 ${f.cycBad.length}`);
      } catch (e) { perScreen.push({ label, err: String(e.message || e).slice(0, 60) }); }
      await ctx.close();
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const cycTotal = perScreen.reduce((a, s) => a + (s.cycle || 0), 0);
    const restTotal = perScreen.reduce((a, s) => a + (s.rest || 0), 0);
    report.census = { screens: perScreen.length, phases: PHASES, pinnedAll, rowsAll, boxMovedAll, trFreeAll, restTotal, cycTotal, secs,
      animMedia: { total: animAgg.total, self: animAgg.self, anc: animAgg.anc, names: [...animAgg.names] } };

    console.log(`\n[5] 제품 인구조사 — ${perScreen.length}화면 × 주기 ${PHASES}칸 (${secs}s)`);
    console.log(`     매체 행 ${rowsAll} · 못박은 애니 노드 ${pinnedAll} · 위상 사이에 상자가 움직인 매체 ${boxMovedAll}자리(그중 배율이 한 번도 안 걸린 «이 절 전용» ${trFreeAll}자리) · 한 점 비균등 ${restTotal} · **한 주기 비균등 ${cycTotal}**`);
    console.log(`     애니메이션이 걸린 매체 — 자신 ${animAgg.self} · 조상 ${animAgg.anc} / 매체 ${animAgg.total}`);
    console.log(`     걸린 이름: ${[...animAgg.names].slice(0, 12).join(' · ') || '(없음)'}`);
    for (const s of perScreen) {
      if (s.err) { console.log(`       ⚠ ${s.label} — 진입 실패: ${s.err}`); continue; }
      if (s.cycle) console.log(`       ⚠ ${s.label} — 한 주기 비균등 ${s.cycle}자리 (최악 d=${s.worst.row.d} @${(s.worst.at * 100).toFixed(0)}% · ${s.worst.row.sel})`);
    }
    if (!rowsAll || !pinnedAll) bad(`[5] 전제 실패 — 매체 행 ${rowsAll} · 못박은 애니 노드 ${pinnedAll} (0 이면 이 인구조사는 헛초록)`);
    else if (cycTotal) bad(`[5] 제품에 «주기 안에서만» 어긋나는 매체 ${cycTotal}자리`);
    else ok(`[5] 제품 한 주기 비균등 0자리 — 매체 ${rowsAll}행 · 애니 노드 ${pinnedAll}개를 실제로 못박고 잰 0 이다`);
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r31: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
