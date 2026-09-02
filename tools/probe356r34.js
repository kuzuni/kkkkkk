#!/usr/bin/env node
/* 작업 356 — 34회차 축: **매체 축 × 시간 × 전이(`transition`)** (`verify356` [R] 의 재료)
 *
 *   node tools/probe356r34.js            # 합성 표본 — 이 갈래가 정말 [O]·[P]·[Q] 밖에 있는가
 *   node tools/probe356r34.js --census   # ⚑ 제품 — 60 쥬시 누름(`jz-dn`)을 제품 자신의 경로로 걸고 그 전이를 훑는다
 *   node tools/probe356r34.js --json     # 원시 보고
 *
 * ── 왜 이 회차인가 (33회차 인계문 ⓒ · 31·32·33 세 회차 이월) ───────────────────
 * 시간 축을 못박는 손이 이제 둘이다 — `probe356r25.PIN`(CSS 애니메이션) · `probe356r33.PIN_WA`(WAAPI).
 * 그런데 **둘 다 `CSSTransition` 을 일부러 건너뛴다**:
 *
 *     `PIN`    은 `animation-play-state` + 음수 `animation-delay` 로 못박는다 — 전이에는 그 손잡이가 없다.
 *     `PIN_WA` 는 `getAnimations()` 에서 `CSSAnimation`·**`CSSTransition`** 을 걸러 낸다(33회차 §40-4).
 *
 * ⇒ **전이 «도중» 의 상자는 지금 아무도 안 본다.** 33회차 교훈 ④ 가 그 `continue` 한 줄을
 *    «다음 프런티어의 주소» 라고 적어 넘겼고, 이 파일이 그 주소로 간다.
 *
 * ⚑ **이것은 가정이 아니라 제품에 이미 있는 매체다.** `index.html` 의 상자를 미는 전이는 두 벌이고
 *    둘 다 아이콘의 **조상**에 걸린다:
 *      `.jz-dn{scale:.94;translate:0 8px;transition:scale .06s,translate .06s}`  (60 쥬시 누름 · 13929)
 *      `.tr-rn,.tr-tp{transition:scale .07s,translate .07s}`                      (23 훈련·룬 카드 · 13956)
 *    지금 값은 등방(`scale` 한 값)이라 결함이 아니다 — 결함이 아니라 **그물의 구멍**이 이 회차의 대상이다.
 *
 * ⚠ 25회차 규율 그대로 — 자를 두 벌로 안 적는다(13회차 [R12]). 수집기는 `COLLECT_MEDIA`(29회차),
 *    접기는 `foldScreen`/`worstOverCycle`(31회차), 배율 가름은 `MEDIA_TR`(31회차)을 **그대로** 받아 쓰고,
 *    이 파일이 새로 세우는 것은 **`PIN_TR` 한 손**뿐이다.
 * ⚠ 33회차 교훈 ③ 그대로 — 가라앉은 화면에 전이는 **하나도 없다**(전이는 «상태가 바뀌는 동안» 만 산다).
 *    그래서 «전 화면 0» 은 커버리지가 아니라 **«없어서 0»** 이고, 제품 판정은 **제품 자신의 경로**로
 *    누름을 만들어서 한다(합성 키프레임·합성 클래스를 주입하지 않는다 — `pointerdown` 을 실제로 쏜다).
 */
const { pw, launch } = require('./pwlaunch');
const R25 = require('./probe356r25.js');
const R29 = require('./probe356r29.js');
const R31 = require('./probe356r31.js');
const { COLLECT_MEDIA } = R29;
const { PIN, PHASES } = R25;
const { foldScreen, worstOverCycle } = R31;
const R33 = require('./probe356r33.js');
const { PIN_WA } = R33;

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

const TOL = R29.TOL;
const FRAME_D = { width: 1080, height: 2280 };

/* ── ⚑ 이 파일이 새로 세우는 유일한 것 — 전이 위상 못박기 ─────────────────────
   ⓐ `document.getAnimations()` 에서 **`CSSTransition` «만»** 남긴다 — `CSSAnimation` 은 `PIN` 몫,
      나머지(WAAPI)는 `PIN_WA` 몫이다. 안 가르면 [O]·[P]·[Q] 와 같은 것을 두 번 세고
      «새 축» 이 아니라 «같은 축의 사본» 이 된다(26회차 [J] 가 데인 자리 · 33회차 교훈 ④).
   ⓑ 되돌릴 수 있게 **원래 시각·재생 상태를 적어 두고** 돌려놓는다(측정이 제품을 안 바꾼다).
   ⓒ 전이는 반복이 없다(`iterations:1`) — 눈금은 한 번의 재생 길이(`getComputedTiming().duration`)이고
      지연(`delay`)을 앞에 더한다. 길이가 0 인 전이(`transition:none`)는 못박을 것이 없어 건너뛴다.
   ⚠ ⓓ **전이는 «상태가 바뀌는 동안» 만 산다** — 못박기 전에 그 상태 변화를 만들어야 하고,
      그 변화는 **제품 자신의 경로**로 만든다(아래 `WAKE_PRESS`). */
const PIN_TR = function (frac) {
  let n = 0;
  const list = (typeof document.getAnimations === 'function') ? document.getAnimations() : [];
  for (const a of list) {
    const cn = (a.constructor && a.constructor.name) || '';
    if (cn !== 'CSSTransition') continue;
    const t = a.effect && a.effect.target;
    if (!t || typeof t.closest !== 'function' || !t.closest('#app')) continue;
    n++;
    if (frac === null) {
      const o = a.__r34;
      try { if (o) { a.currentTime = o.ct; if (o.ps !== 'paused') a.play(); } else a.play(); } catch (_) {}
      continue;
    }
    if (!a.__r34) { try { a.__r34 = { ct: a.currentTime, ps: a.playState }; } catch (_) { a.__r34 = null; } }
    let d = 0, dl = 0;
    try { const tm = a.effect.getComputedTiming(); d = +tm.duration || 0; dl = +tm.delay || 0; } catch (_) {}
    if (!d || !isFinite(d)) continue;
    try { a.pause(); a.currentTime = dl + frac * d; } catch (_) {}
  }
  return n;
};

/* 지금 이 페이지에 «전이» 가 몇 개인가 — 0 의 뜻을 가르는 전제(«없어서 0» ↔ «못 봐서 0»).
   ⚠ 33회차 `WA_CENSUS` 와 **같은 물음의 다른 칸**이라 모양을 맞춰 적는다(읽는 사람이 나란히 본다). */
const TR_CENSUS = function () {
  const out = { total: 0, css: 0, wa: 0, inApp: 0, tr: [] };
  const list = (typeof document.getAnimations === 'function') ? document.getAnimations() : [];
  out.total = list.length;
  for (const a of list) {
    const cn = (a.constructor && a.constructor.name) || '';
    if (cn === 'CSSAnimation') { out.css++; continue; }
    if (cn !== 'CSSTransition') { out.wa++; continue; }
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
    out.tr.push({ sel, prop: (a.transitionProperty || null), dur: d, state: a.playState, ct, media,
      cssName: getComputedStyle(t).animationName });
  }
  return out;
};

/* ⚑ 제품 자신의 경로로 누름을 만든다 — 합성 클래스를 손으로 붙이지 않는다.
   `index.html` 42902 의 `#app` 캡처 리스너가 `pointerdown` 에서 `jzTarget()` 을 찾아 `.jz-dn` 을 건다
   ⇒ 그 순간 `scale`·`translate` 전이 두 벌이 태어난다(13929). 우리가 하는 것은 **손가락 노릇**뿐이다.
   ⚠ 호스트 목록을 손으로 적지 마라(33회차 교훈 ③) — «매체를 품은 눌리는 노드» 를 화면에서 찾는다.
   ⚠ 되돌릴 수 있게 누른 노드를 돌려준다(측정이 제품 상태를 안 남긴다 — `pointerup` 으로 푼다). */
const WAKE_PRESS = function (max) {
  const app = document.getElementById('app');
  if (!app) return { hosts: 0, woke: 0 };
  /* ⚑ «무엇이 눌리는 노드인가» 를 **제품에게 묻는다** — `jzTarget()`(60 쥬시)이 그 판정의 주인이다.
     셀렉터 표를 손으로 적으면 부품이 바뀔 때마다 늙고, 늙은 표는 «호스트 0곳» 을 커버리지로 읽게 만든다.
     매체(아이콘)에서 위로 올라가 눌리는 조상을 찾으므로 **«매체를 품은 누름» 만** 남는다. */
  const hosts = new Set();
  for (const m of app.querySelectorAll('canvas, svg, img')) {
    const r = m.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    let t = null;
    try { t = (typeof jzTarget === 'function') ? jzTarget(m) : null; } catch (_) { t = null; }
    if (!t) t = m.closest('button, .rbt, .ifbtn, .cbtn, .tr-up, [class*="btn"]');
    if (t && t.closest('#app')) hosts.add(t);
  }
  const cand = [...hosts];
  let woke = 0;
  for (const el of cand.slice(0, max || 4)) {
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, isPrimary: true }));
      woke++;
    } catch (_) {}
  }
  /* 스타일을 강제로 갱신해 전이를 **이 태스크 안에서** 태어나게 한다(안 하면 다음 프레임까지 없다) */
  try { void app.offsetWidth; for (const el of cand.slice(0, max || 4)) void getComputedStyle(el).scale; } catch (_) {}
  return { hosts: cand.length, woke };
};

const RELEASE_PRESS = function () {
  try { dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1, isPrimary: true })); } catch (_) {}
  return true;
};

/* 한 주기를 훑는다 — **어느 손으로 못박는지만** 갈린다(수집·접기는 29·31회차 것을 그대로).
     mode 'old' = [O]·[P]·[Q] 가 쓰는 손(`PIN` + `PIN_WA`)
     mode 'tr'  = 이 회차의 손(`PIN` + `PIN_WA` + `PIN_TR`)
   ⚠ `old` 모드에서도 전이는 **계속 흐른다** — 그것이 이 절이 말하려는 바라서 스윕 전·후의
      `currentTime` 을 같이 재 «이 스윕이 전이의 몇 %를 봤는가» 를 숫자로 남긴다. */
async function sweepCycle(page, label, mode) {
  const t0 = await page.evaluate(TR_CENSUS);
  const pinned = await page.evaluate(PIN, 0);
  const pinnedWa = await page.evaluate(PIN_WA, 0);
  let pinnedTr = 0;
  if (mode === 'tr') pinnedTr = await page.evaluate(PIN_TR, 0);
  const perPhase = [];
  for (let k = 0; k < PHASES; k++) {
    await page.evaluate(PIN, k / PHASES);
    await page.evaluate(PIN_WA, k / PHASES);
    if (mode === 'tr') await page.evaluate(PIN_TR, k / PHASES);
    const rows = (await page.evaluate(COLLECT_MEDIA)).map((r) => Object.assign({ screen: label }, r));
    perPhase.push({ at: k / PHASES, rows, tr: await page.evaluate(R31.MEDIA_TR) });
  }
  const t1 = await page.evaluate(TR_CENSUS);
  await page.evaluate(PIN, null);
  await page.evaluate(PIN_WA, null);
  if (mode === 'tr') await page.evaluate(PIN_TR, null);
  /* 스윕이 도는 동안 전이가 자기 시간으로 얼마나 흘렀는가(길이 대비 %) */
  let seen = null;
  const a0 = (t0.tr || [])[0], a1 = (t1.tr || [])[0];
  if (a0 && a1 && a0.dur) seen = Math.abs((a1.ct - a0.ct) / a0.dur);
  return {
    pinned, pinnedWa, pinnedTr, trCount: t0.inApp, seenFrac: seen,
    perPhase, fold: foldScreen(perPhase, TOL), cyc: worstOverCycle(perPhase, TOL),
  };
}

/* ⚠ **제품의 전이는 60~70ms 다** — 깨운 뒤 다음 `evaluate` 왕복(수십 ms)이면 이미 끝나 있다.
   1판이 그렇게 짰다가 23 훈련·23 룬에서 «전이 0→2 인데 못박음 0» 이 나왔다(= 재기도 전에 죽었다).
   ⇒ «깨우기» 와 «못박기» 를 **한 태스크 안에서** 한다. 손을 두 벌로 안 적으려고(13회차 [R12])
      `PIN_TR`·`WAKE_PRESS` 의 **원본을 그대로** 페이지에 심어 두고 그것을 부른다. */
async function wakeAndPin(page, max) {
  await page.evaluate(([ps, ws]) => {
    window.__r34pinTr = eval('(' + ps + ')');
    window.__r34wake = eval('(' + ws + ')');
  }, [PIN_TR.toString(), WAKE_PRESS.toString()]);
  return page.evaluate((m) => {
    const w = window.__r34wake(m);
    w.pinnedAtBirth = window.__r34pinTr(0);       /* 태어나자마자 세운다 — 왕복 한 번을 안 준다 */
    return w;
  }, max);
}

/* ── 합성 표본 — «전이 전용» 갈래를 손으로 만든다 ─────────────────────────────
   ⓣ **전이로 한 축만 미는 캔버스.** 비트맵 200×100(2:1) · 상자가 200 → 140 으로 **200초에 걸쳐** 흐른다.
      위상 0% 는 200×100 이라 [M]·[N] 은 초록이고, `animationName` 이 `none` 이라 `PIN` 이 못 세고,
      `CSSTransition` 이라 `PIN_WA` 가 **일부러 건너뛴다** ⇒ [O]·[P]·[Q] 가 전부 초록이다.
   ⓤ **같은 결함을 CSS 애니로 건 쌍둥이.** 값·길이·이징이 ⓣ 와 **한 글자도 안 다르다**(`forwards` 로
      같은 200→140 램프) ⇒ [O]·[P] 가 이것은 잡는다. 두 줄을 나란히 놓아야 «못 보는 것이 결함의
      모양이 아니라 **못박는 손**» 이라는 말이 실측이 된다(33회차 교훈 ②).
   ⓥ 음성항 — 전이로 **종횡을 같이** 민다(제품 `.jz-dn` 의 꼴). 어느 위상에도 안 빨갛다.
   ⓦ 대조군 — 아무것도 안 걸린 고정 상자.
   ⓧ 결정성 전용 — **짧은(1.2초) 전이**. [6] 에서만 깨운다(길면 «풀어 준 뒤 흐른다» 가 안 보인다). */
const SYN_TR = `<!doctype html><meta charset="utf-8"><style>
  @keyframes __t34css {from{width:200px} to{width:140px}}
  #cCssKf{animation:__t34css 200s linear forwards}
  #app canvas{display:block;width:200px;height:100px}
  #cTrKf {transition:width 200s linear}
  #cTrKf.go {width:140px}
  #cTrIso{transition:width 200s linear, height 200s linear}
  #cTrIso.go{width:140px;height:70px}
  #cTrDet{transition:width 1.2s linear}
  #cTrDet.go{width:140px}
</style><body style="margin:0"><div id="app">
  <canvas id="cTrKf"  width="200" height="100"></canvas>
  <canvas id="cTrIso" width="200" height="100"></canvas>
  <canvas id="cCssKf" width="200" height="100"></canvas>
  <canvas id="cFix"   width="200" height="100"></canvas>
  <canvas id="cTrDet" width="200" height="100"></canvas>
</div></body>`;

module.exports = { PIN_TR, TR_CENSUS, WAKE_PRESS, RELEASE_PRESS, sweepCycle, SYN_TR, FRAME_D };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 이 자가 «전이 전용» 자리를 볼 수 있는가 ── */
  {
    const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN_TR);
    await page.waitForTimeout(200);
    /* 전이는 «상태가 바뀌는 동안» 만 산다 — 클래스를 붙여 200초짜리 램프를 태어나게 한다 */
    await page.evaluate(() => {
      document.getElementById('cTrKf').classList.add('go');
      document.getElementById('cTrIso').classList.add('go');
      void document.getElementById('app').offsetWidth;
    });
    await page.waitForTimeout(120);

    const cen = await page.evaluate(TR_CENSUS);
    const oldArm = await sweepCycle(page, 'syn', 'old');
    const trArm = await sweepCycle(page, 'syn', 'tr');
    const pick = (c, id) => c.bad.find((x) => x.key.indexOf('#' + id) >= 0);
    const seen = (c, id) => c.all.find((x) => x.key.indexOf('#' + id) >= 0);
    report.syn = {
      census: cen, oldPinned: oldArm.pinned, oldPinnedWa: oldArm.pinnedWa, trPinned: trArm.pinnedTr,
      oldBad: oldArm.cyc.bad.map((x) => x.key), trBad: trArm.cyc.bad.map((x) => x.key),
      seenFrac: oldArm.seenFrac,
    };

    console.log('[1] 전제 — 전이는 `animationName:none` 이라 `PIN` 이 못 세고, `CSSTransition` 이라 `PIN_WA` 가 일부러 건너뛴다');
    const trRows = cen.tr || [];
    const noneName = trRows.filter((w) => w.cssName === 'none').length;
    if (cen.inApp === 3 && noneName === 3 && oldArm.pinned === 1 && oldArm.pinnedWa === 0 && trArm.pinnedTr === 3)
      ok(`[1] 전이 ${cen.inApp}개(셋 다 animationName=none · width/height 램프) · CSS 애니 ${cen.css}개 ⇒ `
        + `PIN 이 못박은 노드 ${oldArm.pinned}개(= CSS 쌍둥이 하나뿐) · PIN_WA 가 못박은 것 ${oldArm.pinnedWa}개(0 = 걸러 낸다) · `
        + `PIN_TR 이 못박은 전이 ${trArm.pinnedTr}개`);
    else bad(`[1] 전제 실패 — 전이 ${cen.inApp}개(none ${noneName}) · CSS ${cen.css} · WAAPI ${cen.wa} · `
      + `PIN ${oldArm.pinned} · PIN_WA ${oldArm.pinnedWa} · PIN_TR ${trArm.pinnedTr}`);

    console.log('[2] 본체 — [O]·[P]·[Q] 의 손(`PIN`+`PIN_WA`)으로 훑으면 ⓣ 는 **안 보이고** 같은 램프의 CSS 쌍둥이 ⓤ 는 보인다');
    const trMissed = !pick(oldArm.cyc, 'cTrKf'), cssCaught = pick(oldArm.cyc, 'cCssKf');
    const trSeenRow = seen(oldArm.cyc, 'cTrKf');
    if (trMissed && cssCaught)
      ok(`[2] PIN+PIN_WA 스윕 — ⓣ(전이) 최악 편차 ${trSeenRow ? trSeenRow.dev.toFixed(4) : '?'} ≤ 허용 ${TOL} = **초록(못 봤다)** ↔ `
        + `ⓤ(CSS 애니, 값·길이·이징 동일) 최악 d=${cssCaught.row.d} @위상 ${(cssCaught.at * 100).toFixed(0)}% = 빨강. `
        + `이 스윕이 ⓣ 의 램프에서 실제로 본 구간은 ${(oldArm.seenFrac * 100).toFixed(2)}% 뿐이다`);
    else bad(`[2] 갈리지 않는다 — ⓣ ${JSON.stringify(pick(oldArm.cyc, 'cTrKf') || null)} / ⓤ ${JSON.stringify(cssCaught ? cssCaught.row : null)}`);

    console.log('[3] 되돌림 — `PIN_TR` 을 얹으면 같은 페이지·같은 수집기에서 ⓣ 가 빨개진다');
    const trNow = pick(trArm.cyc, 'cTrKf');
    if (trNow)
      ok(`[3] PIN+PIN_WA+PIN_TR 스윕 — ⓣ 최악 d=${trNow.row.d} @위상 ${(trNow.at * 100).toFixed(0)}% `
        + `(상자 ${trNow.row.w}×${trNow.row.h} · 비트맵 ${trNow.row.nw}×${trNow.row.nh}) ⇒ 빨강. 고친 것은 **못박는 손** 하나다`);
    else bad(`[3] PIN_TR 을 얹어도 ⓣ 가 안 잡힌다: ${JSON.stringify(seen(trArm.cyc, 'cTrKf') || null)}`);

    console.log('[4] 음성항 — 전이로 «종횡을 같이» 미는 상자(제품 `.jz-dn` 의 꼴)는 어느 위상에도 안 빨갛다');
    const isoBad = pick(trArm.cyc, 'cTrIso'), isoAll = seen(trArm.cyc, 'cTrIso');
    if (isoAll && !isoBad)
      ok(`[4] ⓥ 한 램프 최악 편차 ${isoAll.dev.toFixed(4)} ≤ ${TOL} — «전이가 걸렸으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다`);
    else bad(`[4] ⓥ 음성항이 빨갛다: ${JSON.stringify(isoBad ? isoBad.row : null)}`);

    console.log('[5] 대조군 — 가라앉은 한 점([M]·[N] 이 재는 자리)에는 이 결함의 눈이 없다');
    const rest0 = (trArm.perPhase[0].rows || []).find((r) => r.sel.indexOf('#cTrKf') >= 0);
    const fix = seen(trArm.cyc, 'cFix');
    if (rest0 && Math.abs(rest0.d - 1) <= TOL && fix && fix.dev <= TOL)
      ok(`[5] ⓣ 는 위상 0% 에서 d=${rest0.d}(초록) · ⓦ 고정 상자 편차 ${fix.dev.toFixed(4)} `
        + `⇒ 한 점에서 재는 [M]·[N] 도, 배율을 보는 [A]·[I] 도 이 자리를 못 본다(배율은 한 줄도 안 걸렸다)`);
    else bad(`[5] 대조군이 안 선다: ${JSON.stringify(rest0 || null)} / ${JSON.stringify(fix ? fix.row : null)}`);

    console.log('[6] 결정성 — 못박은 위상에서 두 번 읽으면 같아야 하고, 풀어 주면 흘러야 한다');
    await page.evaluate(() => { document.getElementById('cTrDet').classList.add('go'); void document.getElementById('app').offsetWidth; });
    await page.evaluate(PIN_TR, 0.5);
    const r1 = await page.evaluate(COLLECT_MEDIA);
    await page.waitForTimeout(260);
    const r2 = await page.evaluate(COLLECT_MEDIA);
    const g1 = r1.find((r) => r.sel.indexOf('#cTrDet') >= 0), g2 = r2.find((r) => r.sel.indexOf('#cTrDet') >= 0);
    await page.evaluate(PIN_TR, null);
    await page.waitForTimeout(700);
    const r3 = await page.evaluate(COLLECT_MEDIA);
    const g3 = r3.find((r) => r.sel.indexOf('#cTrDet') >= 0);
    if (g1 && g2 && Math.abs(g1.w - g2.w) < 0.01 && g3 && Math.abs(g3.w - g2.w) > 1)
      ok(`[6] 못박은 채 260ms 뒤 다시 읽어도 ${g1.w}px 로 동일 · 풀어 주면 700ms 만에 ${g3.w}px 로 흐른다 `
        + `⇒ 못박기가 실제로 시간을 세운다(무음 실패 감시)`);
    else bad(`[6] 결정성 실패 — 못박음 ${g1 && g1.w} → ${g2 && g2.w} · 푼 뒤 ${g3 && g3.w}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 (--census) — 60 쥬시 누름을 **제품 자신의 경로로** 걸고 그 전이를 훑는다 ──
     ⚠ 가라앉은 화면에는 전이가 **하나도 없다**(전이는 상태가 바뀌는 동안만 산다).
        그래서 «전 화면 0» 은 커버리지가 아니라 **없어서 0** 이다 — 이 절은 그 0 을 부풀려 읽지 않으려고
        `pointerdown` 을 실제로 쏴서 `#app` 캡처 리스너(42902)가 `.jz-dn` 을 걸게 한다. */
  if (CENSUS) {
    const S = require('./scan356.js');
    /* 상자를 미는 전이가 사는 자리 — 60 쥬시(`jz-dn`)는 전 화면 공용이고, 23 훈련·룬은 카드 전이(`tr-rn`)도 있다 */
    const PICK = [
      ['02 메인', []],
      ['23 훈련', ['.tab[data-t="grow"]']],
      ['23 룬', ['.tab[data-t="grow"]', '#trSubs [data-trsub="rune"]']],
      ['10 상점', ['.tab[data-t="shop"]']],
    ];
    const per = [];
    for (const [label, steps] of PICK) {
      const ctx = await browser.newContext({ viewport: FRAME_D, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        for (const st of steps) { try { await S.STEP(page, st); } catch (_) {} await page.waitForTimeout(200); }
        await page.waitForTimeout(300);
        const before = await page.evaluate(TR_CENSUS);
        /* ⚑ **한 번에 하나만 누른다** — 60 쥬시는 한 손가락짜리다(`jzDown` 은 스칼라이고 매 `pointerdown`
           머리에서 `jzRelease()` 가 앞의 `.jz-dn` 을 뗀다 · index.html 42916). 넷을 누르면 표본이
           넓어지는 게 아니라 **앞의 셋이 취소되고 마지막 하나만 남는다**(1판이 «누른 노드 4 · 전이 2» 로
           그 사실을 찍었다). 자리 커버리지는 «여러 노드» 가 아니라 **여러 화면**으로 얻는다. */
        const woke = await wakeAndPin(page, 1);
        const after = await page.evaluate(TR_CENSUS);
        const arm = await sweepCycle(page, label, 'tr');
        /* ⚠ 여기서 «옛 손» 대조군을 한 벌 더 돌리지 않는다 — `PIN_TR(null)` 로 풀면 60ms 짜리 전이가
           그 자리에서 끝나 버려서 그 스윕의 0 은 «못 봐서 0» 이 아니라 «없어서 0» 이 된다.
           옛 손이 이 갈래를 못 본다는 것은 합성 [2] 가 **같은 램프를 두 매체로** 걸어 못박는다. */
        await page.evaluate(RELEASE_PRESS);
        per.push({ label, hosts: woke.hosts, woke: woke.woke, atBirth: woke.pinnedAtBirth,
          before: before.inApp, after: after.inApp,
          pinnedTr: arm.pinnedTr, media: arm.fold.rows, bad: arm.cyc.bad.length,
          maxDev: arm.fold.maxDev, moved: arm.fold.boxMoved, trFree: arm.fold.boxMovedTrFree,
          trMedia: (after.tr || []).reduce((a, w) => a + w.media, 0),
          props: [...new Set((after.tr || []).map((w) => w.prop).filter(Boolean))].slice(0, 4),
          worst: arm.cyc.bad[0] || null });
        console.log(`   · ${label} — 호스트 ${woke.hosts} · 누른 노드 ${woke.woke} · 태어나자마자 못박음 ${woke.pinnedAtBirth} · 전이 ${before.inApp}→${after.inApp}`
          + ` (${[...new Set((after.tr || []).map((w) => w.prop).filter(Boolean))].join(',') || '-'})`
          + ` · 그 안의 매체 ${(after.tr || []).reduce((a, w) => a + w.media, 0)}개 · 못박음 ${arm.pinnedTr}`
          + ` · 매체 ${arm.fold.rows}행 · 위상 사이 상자 이동 ${arm.fold.boxMoved} · 이 절 전용 ${arm.fold.boxMovedTrFree}`
          + ` · 램프 비균등 ${arm.cyc.bad.length} · 최악 편차 ${arm.fold.maxDev.toFixed(4)}`);
      } catch (e) { per.push({ label, err: String(e.message || e).slice(0, 70) }); }
      await ctx.close();
    }
    report.census = per;
    const sum = (k) => per.reduce((a, s) => a + (s[k] || 0), 0);
    console.log('\n[7] 제품 — 누름을 만든 뒤의 «전이 한 램프»');
    const anyWoke = per.filter((s) => !s.err && s.after > s.before).length;
    if (!anyWoke) bad(`[7] 어느 화면에서도 전이가 안 태어났다 — 이 절의 0 은 헛초록이다 (${JSON.stringify(per.map((s) => s.err || `${s.before}→${s.after}`))})`);
    /* ⚠ 무음 실패 감시(31회차 `boxMoved` 와 같은 규율) — 위상을 열여섯 번 옮겼는데 상자가
       한 자리도 안 움직였으면 그 0 은 «같은 순간을 열여섯 번 잰 0» 이다. */
    else if (!sum('pinnedTr')) bad(`[7] 전이는 태어났는데 스윕이 한 개도 못박지 못했다 — 왕복 사이에 죽은 것이다(이 0 은 «안 재서 0» 이다): `
      + JSON.stringify(per.map((s) => `${s.label} ${s.before}→${s.after} 태어날때 ${s.atBirth} 스윕 ${s.pinnedTr}`)));
    else if (!sum('moved')) bad(`[7] 못박기는 했는데 위상 사이에 상자가 한 자리도 안 움직였다 — 이 0 은 같은 순간을 ${PHASES}번 잰 0 이다`);
    else if (sum('bad')) bad(`[7] 제품에 «전이 한 램프» 매체 비균등 ${sum('bad')}자리 — ${JSON.stringify(per.find((s) => s.bad).worst)}`);
    else ok(`[7] 화면 ${anyWoke}곳에서 누름을 만들어(${sum('woke')}노드 · 전이 안의 매체 ${sum('trMedia')}개) 못박은 ${sum('pinnedTr')}개 × 램프 ${PHASES}칸 — `
      + `매체 ${sum('media')}행 · 위상 사이 상자 이동 ${sum('moved')}자리(이 절 전용 ${sum('trFree')}자리) · 비균등 **0자리** · `
      + `최악 편차 ${Math.max(...per.filter((s) => !s.err).map((s) => s.maxDev)).toFixed(4)}. `
      + '제품의 `.jz-dn` 은 등방(`scale` 한 값)이라 이 0 은 «값이 옳아서 0» 이다');
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r34: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
