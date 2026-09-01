#!/usr/bin/env node
/* 작업 356 — 33회차 축: **매체 축 × 시간 × WAAPI** (`verify356` [Q] 의 재료)
 *
 *   node tools/probe356r33.js            # 합성 표본 — 이 갈래가 정말 [O]·[P] 밖에 있는가
 *   node tools/probe356r33.js --census   # ⚑ 제품 — 홀드 틱(621)을 실제로 걸고 그 주기를 훑는다
 *   node tools/probe356r33.js --json     # 원시 보고
 *
 * ── 왜 이 회차인가 (32회차 인계문 ⓑ) ────────────────────────────────────────
 * 31·32회차가 «매체 × 시간» 격자를 다 채웠다 — [M](2280 한 점) · [N](1600 한 점) ·
 * [O](2280 한 주기) · [P](1600 한 주기). 그런데 그 넷이 **주기를 훑는 손은 하나뿐**이다:
 * `probe356r25.PIN` 이 `animation-play-state:paused` + 음수 `animation-delay` 로 못박는 것.
 * 그 손은 **CSS 애니메이션에만 닿는다.**
 *
 *     `Element.animate()` 로 상자를 흔드는 노드는 `getComputedStyle(el).animationName` 이
 *     **`none`** 이다 ⇒ `PIN` 이 그 노드를 **세지도 못박지도 않는다**.
 *     그래서 [O]·[P] 의 16칸 스윕은 그 노드에 대해서만 «자기가 도착한 순간» 을 열여섯 번 읽는다
 *     (25회차가 CSS 에 대해 기각한 바로 그 읽기다 — 위상이 정해지지 않은 한 점).
 *
 * ⚑ **이것은 가정이 아니라 제품에 이미 있는 매체다.** `index.html` 의 `.animate(` 두 자리 중
 *    **`jzPressTick`(39143, 작업 621 «연속 강화 중 버튼이 틱마다 원래 크기 ↔ 눌린 크기»)**
 *    은 `scale`·`translate` 를 WAAPI 로 건다. 그 호스트는 훈련·룬·단련의 [강화]/[단련] 버튼이고,
 *    583·584 이후 그 버튼 **안에 화폐 아이콘**이 산다 ⇒ 상자를 흔드는 것이 그 아이콘의 조상이다.
 *    지금 값은 등방(`scale:.94`)이라 결함이 아니다 — 결함이 아니라 **그물의 구멍**이 이 회차의 대상이다.
 *
 * ⚠ 25회차 규율 그대로 — **소스 리터럴로 판정하지 않는다.** `.animate(` 인구조사는
 *    `probe356r25.sourceCensus().wa` 가 이미 하고 있고([I-a2]), 이 파일은 **화면에서 재는 쪽**이다.
 * ⚠ 자를 두 벌로 안 적는다(13회차 [R12]) — 수집기는 `COLLECT_MEDIA`(29회차), 접기는
 *    `foldScreen`/`worstOverCycle`(31회차)를 **그대로** 받아 쓰고, 이 파일이 새로 세우는 것은
 *    **`PIN_WA` 한 손**뿐이다.
 */
const { pw, launch } = require('./pwlaunch');
const R25 = require('./probe356r25.js');
const R29 = require('./probe356r29.js');
const R31 = require('./probe356r31.js');
const { COLLECT_MEDIA } = R29;
const { PIN, PHASES } = R25;
const { foldScreen, worstOverCycle } = R31;

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

const TOL = R29.TOL;
const FRAME_D = { width: 1080, height: 2280 };

/* ── ⚑ 이 파일이 새로 세우는 유일한 것 — WAAPI 위상 못박기 ─────────────────
   ⓐ `document.getAnimations()` 는 CSS 애니(`CSSAnimation`)·전이(`CSSTransition`)까지 같이 준다.
      그 둘은 **`PIN` 몫**이라 여기서 건너뛴다 — 안 가르면 [O]·[P] 와 같은 것을 두 번 세고
      «새 축» 이 아니라 «같은 축의 사본» 이 된다(26회차 [J] 가 데인 자리).
   ⓑ 되돌릴 수 있게 **원래 시각·재생 상태를 적어 두고** 돌려놓는다(측정이 제품을 안 바꾼다).
   ⓒ 무한 반복(`iterations:Infinity`)이라 `activeDuration` 은 무한이다 — 못박는 눈금은
      **한 번의 재생 길이**(`getComputedTiming().duration`)이고 지연(`delay`)을 앞에 더한다. */
const PIN_WA = function (frac) {
  let n = 0;
  const list = (typeof document.getAnimations === 'function') ? document.getAnimations() : [];
  for (const a of list) {
    const cn = (a.constructor && a.constructor.name) || '';
    if (cn === 'CSSAnimation' || cn === 'CSSTransition') continue;
    const t = a.effect && a.effect.target;
    if (!t || typeof t.closest !== 'function' || !t.closest('#app')) continue;
    n++;
    if (frac === null) {
      const o = a.__r33;
      try { if (o) { a.currentTime = o.ct; if (o.ps !== 'paused') a.play(); } else a.play(); } catch (_) {}
      continue;
    }
    if (!a.__r33) { try { a.__r33 = { ct: a.currentTime, ps: a.playState }; } catch (_) { a.__r33 = null; } }
    let d = 0, dl = 0;
    try { const tm = a.effect.getComputedTiming(); d = +tm.duration || 0; dl = +tm.delay || 0; } catch (_) {}
    if (!d || !isFinite(d)) continue;
    try { a.pause(); a.currentTime = dl + frac * d; } catch (_) {}
  }
  return n;
};

/* 지금 이 페이지에 «WAAPI 로 도는» 애니가 몇 개인가 — 0 의 뜻을 가르는 전제
   («없어서 0» ↔ «못 봐서 0». 31회차 `MEDIA_ANIM` 과 같은 규율). */
const WA_CENSUS = function () {
  const out = { total: 0, inApp: 0, css: 0, tr: 0, wa: [], drift: null };
  const list = (typeof document.getAnimations === 'function') ? document.getAnimations() : [];
  out.total = list.length;
  for (const a of list) {
    const cn = (a.constructor && a.constructor.name) || '';
    if (cn === 'CSSAnimation') { out.css++; continue; }
    if (cn === 'CSSTransition') { out.tr++; continue; }
    const t = a.effect && a.effect.target;
    if (!t || typeof t.closest !== 'function' || !t.closest('#app')) continue;
    out.inApp++;
    let d = 0; try { d = +a.effect.getComputedTiming().duration || 0; } catch (_) {}
    let sel = (t.tagName || '?').toLowerCase();
    if (t.id) sel += '#' + t.id;
    else if (t.getAttribute && t.getAttribute('class')) sel += '.' + String(t.getAttribute('class')).trim().split(/\s+/).slice(0, 3).join('.');
    /* 이 노드가 **매체를 품고 있는가** — 상자를 흔드는 것이 아이콘의 조상이면 그 아이콘이 이 축의 표본이다. */
    let media = 0;
    try { media = t.querySelectorAll ? t.querySelectorAll('canvas, svg, img').length : 0; } catch (_) {}
    let ct = null; try { ct = a.currentTime; } catch (_) {}
    out.wa.push({ sel, dur: d, state: a.playState, ct, media, cssName: getComputedStyle(t).animationName });
  }
  return out;
};

/* 한 주기를 훑는다 — **어느 손으로 못박는지만** 갈린다(수집·접기는 29·31회차 것을 그대로).
     mode 'css'  = [O]·[P] 가 쓰는 손(`PIN` 만)
     mode 'wa'   = 이 회차의 손(`PIN` + `PIN_WA`)
   ⚠ `css` 모드에서도 WAAPI 애니는 **계속 흐른다** — 그것이 이 절이 말하려는 바라서
      스윕 전·후의 `currentTime` 을 같이 재 «이 스윕이 주기의 몇 %를 봤는가» 를 숫자로 남긴다. */
async function sweepCycle(page, label, mode) {
  const t0 = await page.evaluate(WA_CENSUS);
  const pinned = await page.evaluate(PIN, 0);
  let pinnedWa = 0;
  if (mode === 'wa') pinnedWa = await page.evaluate(PIN_WA, 0);
  const perPhase = [];
  for (let k = 0; k < PHASES; k++) {
    await page.evaluate(PIN, k / PHASES);
    if (mode === 'wa') await page.evaluate(PIN_WA, k / PHASES);
    const rows = (await page.evaluate(COLLECT_MEDIA)).map((r) => Object.assign({ screen: label }, r));
    perPhase.push({ at: k / PHASES, rows, tr: await page.evaluate(R31.MEDIA_TR) });
  }
  const t1 = await page.evaluate(WA_CENSUS);
  await page.evaluate(PIN, null);
  if (mode === 'wa') await page.evaluate(PIN_WA, null);
  /* 스윕이 도는 동안 WAAPI 가 자기 시간으로 얼마나 흘렀는가(주기 대비 %) */
  let seen = null;
  const a0 = (t0.wa || [])[0], a1 = (t1.wa || [])[0];
  if (a0 && a1 && a0.dur) seen = Math.abs((a1.ct - a0.ct) / a0.dur);
  return {
    pinned, pinnedWa, waCount: t0.inApp, seenFrac: seen,
    perPhase, fold: foldScreen(perPhase, TOL), cyc: worstOverCycle(perPhase, TOL),
  };
}

/* ── 합성 표본 — «WAAPI 전용» 갈래를 손으로 만든다 ───────────────────────────
   ⓞ **WAAPI 로 한 축만 미는 캔버스.** 비트맵 200×100(2:1) · 상자는 200×100 에서 출발해
      주기 한복판에 140×100 이 된다(d = 0.70). 위상 0% 는 200×100 이라 [M]·[N] 은 초록이고,
      `animationName` 이 `none` 이라 `PIN` 은 이 노드를 **세지도 못하므로** [O]·[P] 도 초록이다.
   ⓟ **같은 결함을 CSS 로 건 쌍둥이.** 값·길이·모양이 ⓞ 와 **한 글자도 안 다르고** 매체만 CSS 다
      ⇒ [O]·[P] 가 이것은 잡는다. 두 줄을 나란히 놓아야 «못 보는 것이 결함의 모양이 아니라
      **못박는 손**» 이라는 말이 실측이 된다.
   ⓠ 음성항 — WAAPI 로 **종횡을 같이** 민다(제품의 `jzPressTick` 이 이 꼴이다). 어느 위상에도 안 빨갛다.
   ⓡ 대조군 — 아무것도 안 걸린 고정 상자. */
const SYN_WA = `<!doctype html><meta charset="utf-8"><style>
  @keyframes __t33css {0%,100%{width:200px}50%{width:140px}}
  #cCssKf{animation:__t33css 200s linear infinite}
  #app canvas{display:block;width:200px;height:100px}
</style><body style="margin:0"><div id="app">
  <canvas id="cWaKf"   width="200" height="100"></canvas>
  <canvas id="cWaProp" width="200" height="100"></canvas>
  <canvas id="cCssKf"  width="200" height="100"></canvas>
  <canvas id="cFix"    width="200" height="100"></canvas>
</div><script>
  document.getElementById('cWaKf').animate(
    [{width:'200px'},{width:'140px'},{width:'200px'}],
    {duration:200000, iterations:Infinity, easing:'linear'});
  document.getElementById('cWaProp').animate(
    [{width:'200px',height:'100px'},{width:'140px',height:'70px'},{width:'200px',height:'100px'}],
    {duration:200000, iterations:Infinity, easing:'linear'});
<\/script></body>`;

module.exports = { PIN_WA, WA_CENSUS, sweepCycle, SYN_WA, FRAME_D };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 이 자가 «WAAPI 전용» 자리를 볼 수 있는가 ── */
  {
    const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN_WA);
    await page.waitForTimeout(200);

    const cen = await page.evaluate(WA_CENSUS);
    const cssArm = await sweepCycle(page, 'syn', 'css');
    const waArm = await sweepCycle(page, 'syn', 'wa');
    const pick = (c, id) => c.bad.find((x) => x.key.indexOf('#' + id) >= 0);
    const seen = (c, id) => c.all.find((x) => x.key.indexOf('#' + id) >= 0);
    report.syn = {
      census: cen, cssPinned: cssArm.pinned, waPinned: waArm.pinnedWa,
      cssBad: cssArm.cyc.bad.map((x) => x.key), waBad: waArm.cyc.bad.map((x) => x.key),
      seenFrac: cssArm.seenFrac,
    };

    console.log('[1] 전제 — WAAPI 로 도는 노드는 `animationName:none` 이라 `PIN` 이 세지도 못한다');
    const waRows = cen.wa || [];
    const noneName = waRows.filter((w) => w.cssName === 'none').length;
    if (cen.inApp === 2 && noneName === 2 && cssArm.pinned === 1 && waArm.pinnedWa === 2)
      ok(`[1] WAAPI 애니 ${cen.inApp}개(둘 다 animationName=none) · CSS 애니 ${cen.css}개 ⇒ `
        + `PIN 이 못박은 노드 ${cssArm.pinned}개(= CSS 쌍둥이 하나뿐) · PIN_WA 가 못박은 애니 ${waArm.pinnedWa}개`);
    else bad(`[1] 전제 실패 — WAAPI ${cen.inApp}개(none ${noneName}) · CSS ${cen.css} · PIN ${cssArm.pinned} · PIN_WA ${waArm.pinnedWa}`);

    console.log('[2] 본체 — [O]·[P] 의 손(`PIN` 만)으로 주기를 훑으면 ⓞ 는 **안 보이고** 같은 결함의 CSS 쌍둥이 ⓟ 는 보인다');
    const waMissed = !pick(cssArm.cyc, 'cWaKf'), cssCaught = pick(cssArm.cyc, 'cCssKf');
    const waSeenRow = seen(cssArm.cyc, 'cWaKf');
    if (waMissed && cssCaught)
      ok(`[2] PIN 스윕 — ⓞ(WAAPI) 최악 편차 ${waSeenRow ? waSeenRow.dev.toFixed(4) : '?'} ≤ 허용 ${TOL} = **초록(못 봤다)** ↔ `
        + `ⓟ(CSS, 값·길이 동일) 최악 d=${cssCaught.row.d} @위상 ${(cssCaught.at * 100).toFixed(0)}% = 빨강. `
        + `이 스윕이 ⓞ 의 주기에서 실제로 본 구간은 ${(cssArm.seenFrac * 100).toFixed(2)}% 뿐이다`);
    else bad(`[2] 갈리지 않는다 — ⓞ ${JSON.stringify(pick(cssArm.cyc, 'cWaKf') || null)} / ⓟ ${JSON.stringify(cssCaught ? cssCaught.row : null)}`);

    console.log('[3] 되돌림 — `PIN_WA` 를 얹으면 같은 페이지·같은 수집기에서 ⓞ 가 빨개진다');
    const waNow = pick(waArm.cyc, 'cWaKf');
    if (waNow && Math.abs(waNow.at - 0.5) < 0.13)
      ok(`[3] PIN+PIN_WA 스윕 — ⓞ 최악 d=${waNow.row.d} @위상 ${(waNow.at * 100).toFixed(0)}% `
        + `(상자 ${waNow.row.w}×${waNow.row.h} · 비트맵 ${waNow.row.nw}×${waNow.row.nh}) ⇒ 빨강. 고친 것은 **못박는 손** 하나다`);
    else bad(`[3] PIN_WA 를 얹어도 ⓞ 가 안 잡힌다: ${JSON.stringify(waNow ? waNow.row : null)}`);

    console.log('[4] 음성항 — WAAPI 로 «종횡을 같이» 미는 상자(제품 `jzPressTick` 의 꼴)는 어느 위상에도 안 빨갛다');
    const propBad = pick(waArm.cyc, 'cWaProp'), propAll = seen(waArm.cyc, 'cWaProp');
    if (propAll && !propBad)
      ok(`[4] ⓠ 한 주기 최악 편차 ${propAll.dev.toFixed(4)} ≤ ${TOL} — «WAAPI 가 걸렸으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다`);
    else bad(`[4] ⓠ 음성항이 빨갛다: ${JSON.stringify(propBad ? propBad.row : null)}`);

    console.log('[5] 대조군 — 가라앉은 한 점([M]·[N] 이 재는 자리)에는 이 결함의 눈이 없다');
    const rest0 = (waArm.perPhase[0].rows || []).find((r) => r.sel.indexOf('#cWaKf') >= 0);
    const fix = seen(waArm.cyc, 'cFix');
    if (rest0 && Math.abs(rest0.d - 1) <= TOL && fix && fix.dev <= TOL)
      ok(`[5] ⓞ 는 위상 0% 에서 d=${rest0.d}(초록) · ⓡ 고정 상자 편차 ${fix.dev.toFixed(4)} `
        + `⇒ 한 점에서 재는 [M]·[N] 도, 배율을 보는 [A]·[I] 도 이 자리를 못 본다(배율은 한 줄도 안 걸렸다)`);
    else bad(`[5] 대조군이 안 선다: ${JSON.stringify(rest0 || null)} / ${JSON.stringify(fix ? fix.row : null)}`);

    console.log('[6] 결정성 — 못박은 위상에서 두 번 읽으면 **비트까지 같아야** 한다(안 그러면 이 자의 0 은 흔들리는 0 이다)');
    await page.evaluate(PIN_WA, 0.5);
    const r1 = await page.evaluate(COLLECT_MEDIA);
    await page.waitForTimeout(260);
    const r2 = await page.evaluate(COLLECT_MEDIA);
    await page.evaluate(PIN_WA, null);
    const g1 = r1.find((r) => r.sel.indexOf('#cWaKf') >= 0), g2 = r2.find((r) => r.sel.indexOf('#cWaKf') >= 0);
    await page.waitForTimeout(300);
    const r3 = await page.evaluate(COLLECT_MEDIA);
    const g3 = r3.find((r) => r.sel.indexOf('#cWaKf') >= 0);
    if (g1 && g2 && g1.w === g2.w && g3 && Math.abs(g3.w - g2.w) > 0.01)
      ok(`[6] 못박은 채 260ms 뒤 다시 읽어도 ${g1.w}px 로 동일 · 풀어 주면 300ms 만에 ${g3.w}px 로 흐른다 `
        + `⇒ 못박기가 실제로 시간을 세운다(무음 실패 감시)`);
    else bad(`[6] 결정성 실패 — 못박음 ${g1 && g1.w} → ${g2 && g2.w} · 푼 뒤 ${g3 && g3.w}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 (--census) — 홀드 틱(621)을 **실제로 걸고** 그 주기를 훑는다 ──
     ⚠ 가라앉은 화면에는 WAAPI 애니가 **하나도 없다**(제품의 두 자리가 다 «누르는 동안» 산다).
        그래서 «전 화면 0» 은 커버리지가 아니라 **없어서 0** 이다 — 이 절은 그 0 을 부풀려 읽지 않으려고
        제품의 애니를 **제품 자신의 함수로** 깨워서 잰다. */
  if (CENSUS) {
    const S = require('./scan356.js');
    /* 홀드 틱이 사는 자리 — 훈련·룬·단련 세 탭(작업 621 · 583·584 이후 버튼 안에 화폐 아이콘이 있다) */
    const PICK = [
      ['23 훈련', ['.tab[data-t="grow"]']],
      ['23 룬', ['.tab[data-t="grow"]', '#trSubs [data-trsub="rune"]']],
      ['23 단련', ['.tab[data-t="grow"]', '#trSubs [data-trsub="temper"]']],
    ];
    /* 호스트는 손으로 안 적는다 — «매체를 품은 버튼» 을 화면에서 찾아 쓴다(셀렉터 표는 늙는다). */
    const HOST = 'button, .rbt, .tr-up, .ifbtn, .cbtn, [class*="btn"]';
    const per = [];
    for (const [label, steps] of PICK) {
      const sel = HOST;
      const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        for (const st of steps) { try { await S.STEP(page, st); } catch (_) {} await page.waitForTimeout(200); }
        await page.waitForTimeout(300);
        const before = await page.evaluate(WA_CENSUS);
        /* ⚑ 제품의 애니를 **제품 자신의 함수로** 만든다 — 합성 키프레임을 주입하지 않는다.
           길이는 제품 상수 그대로 두고(인자 없이 기본 틱), 못박기는 그 뒤에 건다. */
        const woke = await page.evaluate((s) => {
          const els = [...document.querySelectorAll(s)].filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && e.querySelectorAll('canvas, svg, img').length > 0;
          });
          let n = 0;
          for (const el of els.slice(0, 4)) {
            if (typeof jzPressTick === 'function') { jzPressTick(el, 3000); n++; }
          }
          return { hosts: els.length, woke: n };
        }, sel);
        const after = await page.evaluate(WA_CENSUS);
        const arm = await sweepCycle(page, label, 'wa');
        const armCss = await sweepCycle(page, label, 'css');
        per.push({ label, sel, hosts: woke.hosts, woke: woke.woke, before: before.inApp, after: after.inApp,
          pinnedWa: arm.pinnedWa, media: arm.fold.rows, bad: arm.cyc.bad.length, badCss: armCss.cyc.bad.length,
          maxDev: arm.fold.maxDev, moved: arm.fold.boxMoved,
          waMedia: (after.wa || []).reduce((a, w) => a + w.media, 0),
          worst: arm.cyc.bad[0] || null });
        console.log(`   · ${label} — 호스트 ${woke.hosts} · 깨운 틱 ${woke.woke} · WAAPI 애니 ${before.inApp}→${after.inApp}`
          + ` · 그 안의 매체 ${(after.wa || []).reduce((a, w) => a + w.media, 0)}개 · 못박음 ${arm.pinnedWa}`
          + ` · 매체 ${arm.fold.rows}행 · 위상 사이 상자 이동 ${arm.fold.boxMoved} · 주기 비균등 ${arm.cyc.bad.length} · 최악 편차 ${arm.fold.maxDev.toFixed(4)}`);
      } catch (e) { per.push({ label, err: String(e.message || e).slice(0, 70) }); }
      await ctx.close();
    }
    report.census = per;
    const sum = (k) => per.reduce((a, s) => a + (s[k] || 0), 0);
    console.log('\n[7] 제품 — 홀드 틱을 깨운 뒤의 «한 주기»');
    const anyWoke = per.filter((s) => !s.err && s.after > s.before).length;
    if (!anyWoke) bad(`[7] 세 화면 어디서도 WAAPI 애니가 안 깨어났다 — 이 절의 0 은 헛초록이다 (${JSON.stringify(per.map((s) => s.err || `${s.before}→${s.after}`))})`);
    /* ⚠ 무음 실패 감시(31회차 `boxMoved` 와 같은 규율) — 위상을 열여섯 번 옮겼는데 상자가
       한 자리도 안 움직였으면 그 0 은 «같은 순간을 열여섯 번 잰 0» 이다. */
    else if (!sum('moved')) bad(`[7] 못박기는 했는데 위상 사이에 상자가 한 자리도 안 움직였다 — 이 0 은 같은 순간을 ${PHASES}번 잰 0 이다`);
    else if (sum('bad')) bad(`[7] 제품에 «WAAPI 한 주기» 매체 비균등 ${sum('bad')}자리 — ${JSON.stringify(per.find((s) => s.bad).worst)}`);
    else ok(`[7] 화면 ${anyWoke}곳에서 WAAPI 애니를 깨워(${sum('woke')}틱 · 그 안의 매체 ${sum('waMedia')}개) 못박은 ${sum('pinnedWa')}개 × 주기 ${PHASES}칸 — `
      + `매체 ${sum('media')}행 · 위상 사이 상자 이동 ${sum('moved')}자리 · 비균등 **0자리** · 최악 편차 ${Math.max(...per.filter((s) => !s.err).map((s) => s.maxDev)).toFixed(4)}. `
      + '제품의 jzPressTick 은 등방(scale 한 값)이라 이 0 은 «값이 옳아서 0» 이다');
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r33: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
