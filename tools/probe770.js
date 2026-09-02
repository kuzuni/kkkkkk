#!/usr/bin/env node
/* 작업 770 재현기 — 「`verify619` [R2] 「원복하면 같은 자로 다시 초록」이 문턱에 붙어 흔들린다」
 *
 *   node tools/probe770.js [--runs N] [--hold ms]
 *
 * 등재문(2026-09-01, sess-1804-10088 워커 A)의 실측: 4회 중 1~2회 `13/14 = 0.93` · `11/13 = 0.85`.
 * 처방 후보로 «표본을 늘린다 / 문턱을 연속 프레임으로 / 플레이키 가족과 한 벌» 셋이 적혀 있는데,
 * **셋 다 «자를 무르게 푸는» 쪽이라 338 규칙대로 먼저 재현해서 «무엇이 빠지는가» 를 이름으로 찍는다.**
 *
 * 재는 것 — [R2] 와 **같은 순서**(무력화 홀드 3자리 → 원복 → 훈련 홀드 1회)로 굴리고,
 * 그 마지막 홀드의 **강화 한 건 한 건**에 대해
 *   ⓐ 그 강화 근처(−12 … +55ms · [R2] 의 창)에서 `#fxl` 에 붙은 노드가 있었는가
 *   ⓑ 없다면 «가장 가까운 발화» 가 몇 ms 떨어져 있는가 (= 창 밖으로 밀린 것인지, 아예 없는 것인지)
 *   ⓒ 그 틱의 간격(`h.iv`)·순번·`upFx` 반환값(상한에 걸려 조용히 빠진 발화 = blocked)
 * 를 표로 찍는다. 같은 페이지에서 **[B2] 와 같은 «깨끗한» 홀드**도 한 번 재서 둘을 나란히 놓는다.
 *
 * ⚠ 제품(`index.html`)은 한 줄도 안 고친다 — 계측은 전부 페이지 안 래퍼다(619 의 ARM 과 같은 꼴).
 *
 * ── ⚑⚑ 803 (2026-09-02) — [P1] 의 축을 «수리 전 트리» 가 아니라 «수리 전 사본» 으로 옮겼다 ──────
 * 등재 당시의 [P1] 은 «자연 실행에서 옛 축(±ms 창)이 실제로 흔들린다» 였다. 그런데 그 흔들림은
 * **그 기계에서 발화가 58.1~65.7ms 늦었다**는 조건이고(LESSONS 770-①), 조건이 없는 기계에서는
 * 영원히 빨갛다 — 797 이 관측점을 코어(`temperUpOne`·`runeTryOne`)로 이관해 «시도 0회» 라는
 * 헛초록이 걷히자 이 자리가 그대로 드러났다(803 등재 · LESSONS 797-5 «0 이 나오는 계측기는
 * 빨개지지 않는다»). 착수 실측(4런): 옛 축 1/1/1/1 · 빠진 강화 0건 ⇒ [P1] FAIL · [P2] 는 분모 0 으로
 * **공허하게 초록**이었다.
 * ⇒ 등재문이 잰 «밀림» 을 기다리지 말고 **만든다**(§D): [R2] 홀드의 **같은 기록**을 발화 시각만
 *   `LATE`(기본 58ms = 등재문 최소 밀림 58.1ms) 민 세계에서 두 축으로 다시 잰다
 *   (681-③ «재현기를 수리 전 트리가 아니라 수리 전 **사본** 에 매달면 고친 뒤에도 산다»).
 *   그 사본에서 옛 축은 **무너지고**(P1) 새 축은 **임자를 그대로 찾는다**(P1b) — 축의 성질이라
 *   기계의 운을 안 탄다. 자연 실행의 옛 축 분포는 **기계 의존**이라 판정에서 빼고 관측으로만
 *   찍는다(그 값이 초록인 이유 = 발화 지연 최댓값도 같이 찍는다).
 * ⚑ [P2]«제품이 빠뜨린 발화 0건» 도 분모를 갈았다 — «빠진 강화» 만 보면 빠진 게 0건인 기계에서
 *   **공허하게 초록**이다(797-5). ⇒ **강화 전수**를 분모로, 「그 강화의 구간 안에 `upFx` 호출이 있고
 *   반환이 true 인가」를 묻는다. 밀린 건의 «창 뒤로 밀림 / 발화 자체 없음» 분류는 그대로 찍는다.
 * ⚠ 문턱은 한 칸도 안 건드렸다(334 규약) — 새 축(P3·P4)·되돌림(P5)의 0.95·0.7 은 그대로다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V619_HOLD || (arg('--hold') || 2400));
const RUNS = Number(arg('--runs') || 4);
/* 803 — «수리 전 사본» 의 밀림 상수. 등재문(LESSONS 770-①)이 실측한 **최소** 밀림 58.1ms 를 쓴다
   (창 55 보다 크고, 착수 실측의 최소 강화 간격 96.5ms 보다 넉넉히 작다 — 밀린 발화가 다음 강화의
   구간을 넘지 않아야 새 축의 «임자» 가 흐려지지 않는다). */
const LATE = Number(arg('--late') || 58);

function arg(k) { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; }

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 619 의 계측기 + 「어느 발화가 어느 강화에 붙었는가」를 가리기 위한 추가 기록 */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__p770 = { buys: [], tries: [], nodes: [], blocked: 0, ivs: [], upfx: [], up: 0 });
  /* 770 — 손 뗌 시각(캡처 단계라 앱의 정산 연출보다 먼저 찍힌다). 새 축의 **마지막 구간**을 여기서 닫는다 */
  addEventListener('pointerup', () => { P.up = performance.now(); }, true);
  addEventListener('mouseup', () => { if (!P.up) P.up = performance.now(); }, true);
  const wrap = (name, kind, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); const t = performance.now();
      P.tries.push({ kind, t }); if (okOf(r)) P.buys.push({ kind, t }); return r; };
  };
  /* 훈련 — 살 때의 «단계·레벨·남은 칸» 을 같이 적는다(상한 경계가 범인인지 가른다) */
  { const f = window.trainBuy; if (typeof f === 'function') window.trainBuy = function (...a) {
      const r = f.apply(this, a); const t = performance.now();
      let st = null; try { st = { lv: lv(a[0]), cap: trainCap(), stage: trainStage() }; } catch (_) {}
      P.tries.push({ kind: 'train', t, st }); if (r) P.buys.push({ kind: 'train', t, st }); return r; }; }
  wrap('temperUpBtn', 'temper', r => !!r);
  /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어 `temperUpOne`·`runeTryOne` 이다
     (옛 이름은 «막힌 첫 누름의 안내» 로만 남았다 · 홀드에서 배타적이라 같은 장부에 더한다). */
  wrap('temperUpOne', 'temper', () => true);
  { const f = window.runeTryOne; if (typeof f === 'function') window.runeTryOne = function (...a) {
      const r = f.apply(this, a); const t = performance.now();
      P.tries.push({ kind: 'rune', t }); if (r && r.up) P.buys.push({ kind: 'rune', t });
      return r; }; }
  /* upFx — 반환값(발화가 실제로 노드를 붙였는가)과 부른 시각을 같이 적는다 */
  { const f = window.upFx; if (typeof f === 'function') window.upFx = function (...a) {
      const t0 = performance.now(); const r = f.apply(this, a); const t = performance.now();
      P.upfx.push({ t0, t, key: a[0], noFlash: !!a[4], iv: a[5], r: !!r });
      if (!r) P.blocked++; return r; }; }
  const L = document.getElementById('fxl');
  const kindOf = el => {
    const c = (el.className || '') + '';
    if (/fx-flash/.test(c)) return 'flash';
    if (/fx-spark/.test(c)) return 'spark';
    if (/fx-spd/.test(c)) return 'spend';
    if (/fx-toast/.test(c)) return 'toast';
    if (/fx-plus/.test(c)) return 'float';
    return 'etc';
  };
  new MutationObserver(ms => {
    const t = performance.now();
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      P.nodes.push({ k: kindOf(nd), t });
    }
  }).observe(L, { childList: true });
};

const SPOTS = [
  { id: 'train', tab: 'train', sel: '#trCards [data-tr]' },
  { id: 'rune', tab: 'rune', sel: '#trRunes .rbt.b1' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb' },
];
const WIN = 55, BACK = 12;   /* [R2]·[B2] 가 쓰는 창 그대로 */

async function hold(page, sp, opt) {
  const tap = !!(opt && opt.tap);
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const P = window.__p770; P.buys.length = 0; P.tries.length = 0; P.nodes.length = 0; P.upfx.length = 0; P.blocked = 0; P.up = 0; });
  const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sp.sel);
  if (!r || !r.w) return null;
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(tap ? 20 : HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(420);
  const d = await page.evaluate(() => { const P = window.__p770;
    return { buys: P.buys.slice(), nodes: P.nodes.slice(), tries: P.tries.slice(), upfx: P.upfx.slice(), blocked: P.blocked, up: P.up }; });
  const fires = d.nodes.filter(n => n.k === 'flash' || n.k === 'spark' || n.k === 'spend');
  const buys = d.buys.filter(b => b.kind === sp.id);
  return axes(buys, fires, d, 0, sp.id);
}

/* ⚑ 803 — **재는 일**을 홀드에서 떼어 냈다. 같은 표본을 «발화가 shift ms 늦은 세계» 로 다시 잴 수 있어야
   [P1] 이 기계의 운을 안 탄다(§D — 아래 머리말). shift 는 **발화 시각에만** 건다: 등재문이 잰 것은
   «`upFx` 호출이 60.6ms 걸려 노드가 늦게 붙었다» 이지 «호출이 늦었다» 가 아니다(LESSONS 770-①). */
function axes(buys, fires0, d, shift, kind) {
  const fires = shift ? fires0.map(f => ({ k: f.k, t: f.t + shift })) : fires0;
  const rows = buys.map((b, i) => {
    const inWin = fires.filter(f => f.t >= b.t - BACK && f.t <= b.t + WIN);
    /* ⚑ 새 축(770 처방) — **같은 기록**에 «강화 경계 분할» 을 대 본다. 두 축을 같은 표본에서 재야
       «축을 바꿔서 초록» 인지 «다시 재서 우연히 초록» 인지 갈린다(재측정 잡음을 뺀다).
       마지막 구간은 **손 뗌**에서 닫는다 — 게이트와 같은 자여야 여기 결과가 그대로 옮겨간다. */
    const lo = b.t - BACK, hi = (i + 1 < buys.length) ? buys[i + 1].t - BACK : (d.up || Infinity);
    const inSeg = fires.filter(f => f.t >= lo && f.t < hi);
    /* 가장 가까운 발화 — 창 밖으로 밀린 것인지, 아예 없는 것인지 가른다 */
    let near = null;
    for (const f of fires) { const dt = f.t - b.t; if (!near || Math.abs(dt) < Math.abs(near.dt)) near = { dt, k: f.k }; }
    /* 803 — «이 강화 몫으로 볼 첫 발화»(뒤로만 본다)와 다음 강화까지의 간격. §D 사본에서 밀린 발화가
       **다음 강화를 넘어섰는지**를 이 둘로 정확히 가른다 — 넘어선 자리는 어떤 축으로도 임자를 못 정한다. */
    let mine = null;
    for (const f of fires) { const dt = f.t - b.t; if (dt >= -BACK && (mine === null || dt < mine)) mine = dt; }
    const gapNext = (i + 1 < buys.length) ? p2(buys[i + 1].t - b.t) : null;
    /* 그 강화 직후의 upFx 호출 — 반환값이 false 면 «발화가 조용히 빠졌다».
       803 — 창(`upfx`)과 구간(`useg`) 둘 다 적는다. 밀린 사본에서는 호출 자체가 창 밖이라
       창으로만 찾으면 «기록 없음» 이 되어 «upFx 가 false 였는가» 항이 다시 공허해진다. */
    const fu = x => ({ r: x.r, noFlash: x.noFlash, iv: x.iv ? p2(x.iv) : null, lag: p2(x.t - x.t0) });
    const u = d.upfx.find(x => x.t0 >= b.t - BACK && x.t0 <= b.t + WIN) || null;
    const us = d.upfx.find(x => x.t0 >= lo && x.t0 < hi) || null;
    return { i, t: b.t, hit: inWin.length > 0, n: inWin.length, own: inSeg.length > 0, st: b.st || null,
             nearDt: near ? p2(near.dt) : null, nearK: near ? near.k : null,
             upfx: u ? fu(u) : null, useg: us ? fu(us) : null,
             last: i + 1 === buys.length, mineDt: mine === null ? null : p2(mine), gapNext,
             gap: i ? p2(b.t - buys[i - 1].t) : null };
  });
  const hit = rows.filter(r2 => r2.hit).length;
  const hit2 = rows.filter(r2 => r2.own).length;
  /* 803 관측 — 발화가 강화보다 얼마나 늦는가. 옛 축이 초록인 기계인지(≤55) 아닌지를 이 값이 말한다. */
  const lags = rows.map(r2 => r2.nearDt).filter(v => v !== null && v >= 0);
  return { buys: buys.length, tries: d.tries.filter(t => t.kind === kind).length, hit,
           ratio: buys.length ? p2(hit / buys.length) : 0,
           hit2, ratio2: buys.length ? p2(hit2 / buys.length) : 0,
           maxLag: lags.length ? p2(Math.max(...lags)) : null,
           fires: fires.length, blocked: d.blocked, raw: { buys, fires: fires0, d, kind }, rows };
}

const fmtRows = (d, only) => d.rows.filter(r => !only || !r.hit)
  .map(r => '      #' + r.i + (r.hit ? ' hit ' + r.n : ' MISS') + '/새축 ' + (r.own ? 'hit' : 'MISS')
    + ' · 앞 강화와 ' + (r.gap === null ? '첫' : r.gap + 'ms')
    + ' · 가장 가까운 발화 ' + (r.nearDt === null ? '없음' : r.nearDt + 'ms(' + r.nearK + ')')
    + ' · upFx ' + (r.upfx || r.useg
        ? (v => (v.r ? 'true' : 'FALSE') + (v.noFlash ? '/noFlash' : '') + '/iv' + v.iv + '/lag' + v.lag + 'ms'
             + (r.upfx ? '' : '(구간)'))(r.upfx || r.useg)
        : '없음')
    + (r.st ? ' · Lv' + r.st.lv + '/cap' + r.st.cap + '(단계' + r.st.stage + ')' : ''))
  .join('\n');

(async () => {
  const browser = await launch(chromium);
  const stat = { r2: [], b2: [], r2n: [], b2n: [], alt: [], late: [], lateN: [], lateBuys: [], lag: [] };
  const misses = [];        /* 자연 실행에서 빠진 강화 */
  const lateMiss = [];      /* 803 — «수리 전 사본»(밀린 발화)에서 옛 축이 놓친 강화 */
  const segs = [];          /* 803 — [R2] 홀드의 강화 **전수**(P2 의 분모) */
  for (let run = 1; run <= RUNS; run++) {
    /* ⚠ **회차마다 새 컨텍스트**다 — 같은 컨텍스트에서 페이지만 새로 열면 `localStorage` 의 세이브가
       그대로 따라와 앞 회차가 올려 둔 훈련 단계 상한에 닿고, 홀드가 한 번도 안 먹어 0/0 이 된다
       (게이트 [K] 머리말이 적어 둔 그 자리와 같은 병 — 재현기가 자기 눈을 가리는 꼴이다). */
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(ARM);
    await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
      if (S.temper) S.temper.pts = 1e6; openTrain(); });
    await page.waitForTimeout(400);

    console.log('\n══ run ' + run + '/' + RUNS + ' ══');
    /* [B] 와 같은 자리 — 깨끗한 첫 홀드 */
    const b = await hold(page, SPOTS[0]);
    console.log('  [B2 자리] train  옛 축 ' + b.hit + '/' + b.buys + ' = ' + b.ratio
      + '  ·  새 축(경계 분할) ' + b.hit2 + '/' + b.buys + ' = ' + b.ratio2 + ' · 시도 ' + b.tries + ' · 빈 발화 ' + b.blocked);
    if (b.ratio < 0.95) console.log(fmtRows(b, true));
    stat.b2.push(b.ratio); stat.b2n.push(b.ratio2);

    /* 게이트와 **같은 순서**로 앞 절들을 굴린다 — [R2] 는 [B]·[E] 가 훈련 레벨을 올려 둔 뒤에 돈다.
       [B] 나머지 두 자리 · [E] 의 홀드 2회(겹침 측정)를 그대로 흉내 낸다. */
    for (const sp of SPOTS.slice(1)) await hold(page, sp);
    for (let e = 0; e < 2; e++) await hold(page, SPOTS[0]);   /* [E] overlapRun ×2(원본·되돌림) */

    /* [R] 무력화 3자리 → 원복 → [R2] */
    await page.evaluate(() => { window.__upFx0 = window.upFx; window.upFx = () => false; });
    for (const sp of SPOTS) await hold(page, sp);
    await page.evaluate(() => { if (window.__upFx0) window.upFx = window.__upFx0; });
    const d = await hold(page, SPOTS[0]);
    console.log('  [R2 자리] train  옛 축 ' + d.hit + '/' + d.buys + ' = ' + d.ratio
      + '  ·  새 축(경계 분할) ' + d.hit2 + '/' + d.buys + ' = ' + d.ratio2 + ' · 시도 ' + d.tries + ' · 빈 발화 ' + d.blocked);
    console.log(fmtRows(d, false));
    stat.r2.push(d.ratio); stat.r2n.push(d.ratio2);
    if (d.maxLag !== null) stat.lag.push(d.maxLag);
    for (const r of d.rows) if (!r.hit) misses.push({ run, ...r });

    /* ⚑⚑ §D (803) — **«수리 전 사본»**. 등재문이 잰 «같은 틱의 발화가 창 밖으로 밀린다» 를
       **기다리지 않고 만든다**: 방금 그 홀드의 기록을 그대로 두고 **발화 시각만 +LATE ms** 민
       세계에서 두 축을 다시 잰다(681-③ — 재현기를 수리 전 «사본» 에 매단다).
       ⚠ 1회차에는 이것을 `upFx` 를 `setTimeout` 으로 미루는 **주입**으로 짰다가 걷어냈다 —
       홀드 틱이 도는 동안 타이머가 밀려 실제 지연이 58 → 116ms 로 **한 틱을 통째로 넘었고**,
       그러면 창이 «앞 강화의 발화» 를 주워 세어(그 자체가 770 이 말한 훔쳐 세기다) 사본이
       재려던 것을 못 재게 된다. 미는 값이 실험 조건이므로 **밀기는 계측에서 한다.**
       shift 를 발화에만 거는 근거는 `axes()` 머리말에 적었다. */
    const lt = axes(d.raw.buys, d.raw.fires, d.raw.d, LATE, d.raw.kind);
    console.log('  [§D 수리 전 사본 — 같은 표본, 발화만 +' + LATE + 'ms] train  옛 축 ' + lt.hit + '/' + lt.buys + ' = ' + lt.ratio
      + '  ·  새 축(경계 분할) ' + lt.hit2 + '/' + lt.buys + ' = ' + lt.ratio2);
    stat.late.push(lt.ratio); stat.lateN.push(lt.ratio2); stat.lateBuys.push(lt.buys);
    for (const r of lt.rows) if (!r.hit) lateMiss.push({ run, ...r });
    /* 제품 쪽 단언의 분모 — «강화마다 자기 구간에 `upFx` 호출이 있고 반환이 true 인가»(P2).
       빠진 강화가 0건인 기계에서도 이 분모는 **강화 전수**라 공허해지지 않는다(797-5). */
    for (const r of d.rows) segs.push({ run, ...r });

    /* §R — **새 축이 «무르게 잡은 자» 가 아님을 못박는다.** 틱 하나 걸러 `upFx` 를 죽인 사본에서는
       절반의 강화가 임자 노드를 못 가지므로 두 축이 **같이** 무너져야 한다(첫 발은 `fxUpOk` 몫이라
       항상 맞는다 ⇒ 기대값 ≈0.5). 이 절이 빠지면 «분할» 은 그냥 창을 넓힌 것과 구분되지 않는다. */
    await page.evaluate(() => {
      const el = document.querySelector('#trCards [data-tr]'); const k = el && el.dataset.tr;
      if (k && S.lv) S.lv[k] = 0; S.gold = 1e18; if (typeof renderTrain === 'function') renderTrain();
      const f = window.upFx; window.__upFxAlt = f; let n = 0;
      window.upFx = function (...a) { return (n++ % 2) ? f.apply(this, a) : false; };
    });
    const alt = await hold(page, SPOTS[0]);
    await page.evaluate(() => { if (window.__upFxAlt) window.upFx = window.__upFxAlt; });
    console.log('  [§R 반쪽 사본] train  옛 축 ' + alt.hit + '/' + alt.buys + ' = ' + alt.ratio
      + '  ·  새 축(경계 분할) ' + alt.hit2 + '/' + alt.buys + ' = ' + alt.ratio2);
    stat.alt.push(alt.ratio2);
    await page.close(); await ctx.close();
  }
  await browser.close();

  console.log('\n[분포] (344 규약 — 문턱을 만지기 전에 분포부터 잰다)');
  const red2 = stat.r2.filter(v => v < 0.95).length, redB = stat.b2.filter(v => v < 0.95).length;
  const red2n = stat.r2n.filter(v => v < 0.95).length, redBn = stat.b2n.filter(v => v < 0.95).length;
  console.log('  [R2] 옛 축 ' + stat.r2.join(' · ') + '  → 0.95 미달 ' + red2 + '/' + RUNS);
  console.log('  [R2] 새 축 ' + stat.r2n.join(' · ') + '  → 0.95 미달 ' + red2n + '/' + RUNS);
  console.log('  [B2] 옛 축 ' + stat.b2.join(' · ') + '  → 0.95 미달 ' + redB + '/' + RUNS);
  console.log('  [B2] 새 축 ' + stat.b2n.join(' · ') + '  → 0.95 미달 ' + redBn + '/' + RUNS);
  console.log('  [§R 반쪽 사본] 새 축 ' + stat.alt.join(' · '));
  console.log('  [§D 수리 전 사본] 옛 축 ' + stat.late.join(' · ') + '  ·  새 축 ' + stat.lateN.join(' · '));
  /* 803 — 자연 실행의 옛 축이 초록인 **이유**를 같이 찍는다. 이 값이 창(55) 아래면 그 기계에서는
     등재문의 흔들림이 안 난다 — 그래서 판정은 §D 사본이 지고, 이 줄은 관측이다. */
  console.log('  [관측] 자연 실행의 발화 지연 최대 ' + (stat.lag.length ? Math.max(...stat.lag) : 'n/a')
    + 'ms (창 ' + WIN + 'ms · 이 값이 창보다 작은 기계에서는 옛 축이 안 흔들린다 — 판정 아님)');

  console.log('\n[판정]');
  /* ⚑ 803 — 등재문 재현은 **자연 실행의 운**이 아니라 §D 사본이 진다(머리말 참고). */
  const lateRed = stat.late.filter(v => v <= 0.2).length;
  ok(lateRed === RUNS && RUNS > 0,
     'P1 ★ «수리 전 사본»(발화를 +' + LATE + 'ms 민 사본)에서 옛 축(창 −' + BACK + '…+' + WIN + 'ms)이 무너진다 — 등재문의 «창 밖으로 밀린 발화» 재현',
     '옛 축 ≤0.2 인 실행 ' + lateRed + '/' + RUNS + ' · 값 ' + stat.late.join('/'));
  ok(stat.lateBuys.length === RUNS && stat.lateBuys.every(n => n >= 8),
     'P1s 표본이 있다 — 사본 홀드가 실제로 강화를 굴렸다(≥8 · 0/0 을 초록·빨강 어느 쪽으로도 안 읽는다)',
     '강화 ' + stat.lateBuys.join('/') + '회');
  /* 새 축은 **같은 사본**에서 임자를 찾아야 한다. 남는 것은 실행당 최대 1건 — 마지막 강화의 발화는
     LATEms 뒤라 **손 뗌 뒤**에 떨어지고, 770-② 가 그 구간을 손 뗌에서 닫아 두었기 때문이다. */
  const lateOwn = lateMiss.filter(m => m.own).length;
  const lateLost = lateMiss.filter(m => !m.own);
  /* 남아도 되는 자리는 딱 둘이고 **둘 다 구조적**이다 — ⓐ 마지막 강화(발화가 손 뗌 뒤로 밀린다 ·
     770-② 가 그 경계를 손 뗌에서 닫았다) ⓑ 밀린 발화가 다음 강화를 아예 넘어선 자리(어떤 축도
     임자를 못 정한다). 그 밖의 손실이 하나라도 있으면 «분할» 이 밀림을 못 견딘다는 뜻이라 빨강이다. */
  const excused = m => m.last || (m.gapNext !== null && m.mineDt !== null && m.mineDt >= m.gapNext - BACK);
  const lostBad = lateLost.filter(m => !excused(m));
  ok(lateMiss.length > 0 && lostBad.length === 0 && lateOwn > 0,
     'P1b ★ 같은 사본을 «강화 경계 분할» 로 재면 임자를 그대로 찾는다 — 남는 것은 손 뗌 뒤·다음 강화 너머로 밀린 자리뿐',
     '옛 축이 놓친 ' + lateMiss.length + '건 중 새 축이 찾은 ' + lateOwn + '건 · 남은 ' + lateLost.length
       + '건(마지막 강화 ' + lateLost.filter(m => m.last).length + ' · 다음 강화 너머 '
       + lateLost.filter(m => !m.last && excused(m)).length + ') · 설명 안 되는 손실 ' + lostBad.length);
  /* 빠진 강화가 «발화가 아예 없었다» 인지 «창 밖으로 밀렸다» 인지 — 이 둘은 처방이 정반대다.
     803 — 자연 실행 + §D 사본을 합쳐 분류만 찍는다(판정은 아래 [P2] 가 **강화 전수**로 진다). */
  const all = misses.concat(lateMiss);
  const late = all.filter(m => m.nearDt !== null && m.nearDt > WIN && m.nearDt < 400).length;
  const none = all.filter(m => m.nearDt === null || Math.abs(m.nearDt) >= 400).length;
  const early = all.filter(m => m.nearDt !== null && m.nearDt < -BACK && m.nearDt > -400).length;
  console.log('  옛 축이 놓친 강화 ' + all.length + '건(자연 ' + misses.length + ' + 사본 ' + lateMiss.length
    + ') — 창 뒤로 밀림(>' + WIN + 'ms) ' + late
    + ' · 창 앞(<−' + BACK + 'ms · 사본에서는 «앞 강화의 밀린 발화» 가 더 가까운 자리다) ' + early
    + ' · 발화 자체 없음 ' + none);
  if (all.length) {
    const dts = all.map(m => m.nearDt).filter(v => v !== null).sort((a, b2) => a - b2);
    console.log('  가장 가까운 발화까지의 거리 — 최소 ' + dts[0] + 'ms · 중앙 ' + dts[Math.floor(dts.length / 2)] + 'ms · 최대 ' + dts[dts.length - 1] + 'ms');
    console.log('  놓친 자리의 순번 — ' + all.map(m => '#' + m.i + '/run' + m.run).join(' · '));
  }
  /* ⚑ 803 — 제품 쪽 단언의 분모는 **[R2] 홀드의 강화 전수**다(빠진 게 0건이어도 공허해지지 않는다). */
  const noRec = segs.filter(s => !s.useg).length;
  const falseR = segs.filter(s => s.useg && !s.useg.r).length;
  const noFire = segs.filter(s => !s.own).length;
  console.log('  강화 전수 ' + segs.length + '건 — 자기 구간에 `upFx` 호출 없음 ' + noRec
    + ' · 그 호출이 false(상한에 걸려 조용히 빠진 발화) ' + falseR + ' · 구간에 발화 노드 없음 ' + noFire);
  ok(segs.length >= 8 * RUNS && noRec === 0 && falseR === 0 && noFire === 0 && none === 0,
     'P2 ★ 제품이 빠뜨린 발화 0건 — 강화 **전수**가 자기 구간 안에 `upFx` 호출(반환 true)과 발화 노드를 갖는다',
     '표본 ' + segs.length + ' · 호출 없음 ' + noRec + ' / false ' + falseR + ' / 발화 없음 ' + noFire
       + ' · 옛 축이 놓친 건 중 «발화 자체 없음» ' + none);
  ok(red2n === 0, 'P3 ★ 자연 실행도 «강화 경계 분할» 로 재면 [R2] 가 전부 초록(축을 바꾼 것이지 다시 잰 것이 아니다)',
     '새 축 미달 ' + red2n + '/' + RUNS + ' · 값 ' + stat.r2n.join('/'));
  ok(redBn === 0, 'P4 [B2] 도 새 축에서 전부 초록(같은 부품을 쓰므로 같이 낫는다)',
     '새 축 미달 ' + redBn + '/' + RUNS + ' · 값 ' + stat.b2n.join('/'));
  ok(stat.alt.length > 0 && stat.alt.every(v => v <= 0.7),
     'P5 ★ 되돌림 — 틱 하나 걸러 발화를 죽인 사본은 **새 축도** 무너진다(≤0.7 · 무르게 푼 자가 아님)',
     stat.alt.join(' · '));
  console.log('\n' + (fail ? 'PROBE770 FAIL' : 'PROBE770 PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
