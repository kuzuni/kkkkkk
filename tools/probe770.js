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
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V619_HOLD || (arg('--hold') || 2400));
const RUNS = Number(arg('--runs') || 4);

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
  const rows = buys.map((b, i) => {
    const inWin = fires.filter(f => f.t >= b.t - BACK && f.t <= b.t + WIN);
    /* 가장 가까운 발화 — 창 밖으로 밀린 것인지, 아예 없는 것인지 가른다 */
    let near = null;
    for (const f of fires) { const dt = f.t - b.t; if (!near || Math.abs(dt) < Math.abs(near.dt)) near = { dt, k: f.k }; }
    /* 그 강화 직후의 upFx 호출 — 반환값이 false 면 «발화가 조용히 빠졌다» */
    const u = d.upfx.find(x => x.t0 >= b.t - BACK && x.t0 <= b.t + WIN) || null;
    return { i, t: b.t, hit: inWin.length > 0, n: inWin.length, st: b.st || null,
             nearDt: near ? p2(near.dt) : null, nearK: near ? near.k : null,
             upfx: u ? { r: u.r, noFlash: u.noFlash, iv: u.iv ? p2(u.iv) : null, lag: p2(u.t - u.t0) } : null,
             gap: i ? p2(b.t - buys[i - 1].t) : null };
  });
  const hit = rows.filter(r2 => r2.hit).length;
  /* ⚑ 새 축(770 처방) — **같은 기록**에 «강화 경계 분할» 을 대 본다. 두 축을 같은 표본에서 재야
     «축을 바꿔서 초록» 인지 «다시 재서 우연히 초록» 인지 갈린다(재측정 잡음을 뺀다). */
  let hit2 = 0;
  buys.forEach((b, i) => {
    /* 마지막 구간은 **손 뗌**에서 닫는다 — 게이트와 같은 자여야 여기 결과가 그대로 옮겨간다 */
    const lo = b.t - BACK, hi = (i + 1 < buys.length) ? buys[i + 1].t - BACK : (d.up || Infinity);
    if (fires.some(f => f.t >= lo && f.t < hi)) hit2++;
  });
  return { buys: buys.length, tries: d.tries.filter(t => t.kind === sp.id).length, hit,
           ratio: buys.length ? p2(hit / buys.length) : 0,
           hit2, ratio2: buys.length ? p2(hit2 / buys.length) : 0,
           fires: fires.length, blocked: d.blocked, rows };
}

const fmtRows = (d, only) => d.rows.filter(r => !only || !r.hit)
  .map(r => '      #' + r.i + (r.hit ? ' hit ' + r.n : ' MISS')
    + ' · 앞 강화와 ' + (r.gap === null ? '첫' : r.gap + 'ms')
    + ' · 가장 가까운 발화 ' + (r.nearDt === null ? '없음' : r.nearDt + 'ms(' + r.nearK + ')')
    + ' · upFx ' + (r.upfx ? (r.upfx.r ? 'true' : 'FALSE') + (r.upfx.noFlash ? '/noFlash' : '') + '/iv' + r.upfx.iv + '/lag' + r.upfx.lag + 'ms' : '없음')
    + (r.st ? ' · Lv' + r.st.lv + '/cap' + r.st.cap + '(단계' + r.st.stage + ')' : ''))
  .join('\n');

(async () => {
  const browser = await launch(chromium);
  const stat = { r2: [], b2: [], r2n: [], b2n: [], alt: [] };
  const misses = [];
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
    for (const r of d.rows) if (!r.hit) misses.push({ run, ...r });

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

  console.log('\n[판정]');
  ok(red2 > 0, 'P1 [R2] 가 실제로 흔들린다(등재문 재현 — 이 항이 빨가면 재현 실패다)',
     '미달 ' + red2 + '/' + RUNS + ' · 값 ' + stat.r2.join('/'));
  /* 빠진 강화가 «발화가 아예 없었다» 인지 «창 밖으로 밀렸다» 인지 — 이 둘은 처방이 정반대다 */
  const late = misses.filter(m => m.nearDt !== null && m.nearDt > WIN && m.nearDt < 400).length;
  const none = misses.filter(m => m.nearDt === null || Math.abs(m.nearDt) >= 400).length;
  const early = misses.filter(m => m.nearDt !== null && m.nearDt < -BACK && m.nearDt > -400).length;
  console.log('  빠진 강화 ' + misses.length + '건 — 창 뒤로 밀림(>' + WIN + 'ms) ' + late
    + ' · 창 앞(<−' + BACK + 'ms) ' + early + ' · 발화 자체 없음 ' + none);
  const fal = misses.filter(m => m.upfx && !m.upfx.r).length;
  console.log('  그 중 `upFx` 가 false(상한에 걸려 조용히 빠진 발화) ' + fal + '건');
  if (misses.length) {
    const dts = misses.map(m => m.nearDt).filter(v => v !== null).sort((a, b2) => a - b2);
    console.log('  가장 가까운 발화까지의 거리 — 최소 ' + dts[0] + 'ms · 중앙 ' + dts[Math.floor(dts.length / 2)] + 'ms · 최대 ' + dts[dts.length - 1] + 'ms');
    console.log('  빠진 자리의 순번 — ' + misses.map(m => '#' + m.i + '/run' + m.run).join(' · '));
  }
  ok(late === misses.length && none === 0 && fal === 0,
     'P2 ★ 빠진 강화는 전부 «같은 틱의 발화가 창 밖으로 밀린 것» 이다 — 제품이 빠뜨린 발화 0건',
     '밀림 ' + late + ' / 없음 ' + none + ' / upFx false ' + fal);
  ok(red2n === 0, 'P3 ★ 같은 표본을 «강화 경계 분할» 로 다시 재면 [R2] 가 전부 초록(축을 바꾼 것이지 다시 잰 것이 아니다)',
     '새 축 미달 ' + red2n + '/' + RUNS + ' · 값 ' + stat.r2n.join('/'));
  ok(redBn === 0, 'P4 [B2] 도 새 축에서 전부 초록(같은 부품을 쓰므로 같이 낫는다)',
     '새 축 미달 ' + redBn + '/' + RUNS + ' · 값 ' + stat.b2n.join('/'));
  ok(stat.alt.length > 0 && stat.alt.every(v => v <= 0.7),
     'P5 ★ 되돌림 — 틱 하나 걸러 발화를 죽인 사본은 **새 축도** 무너진다(≤0.7 · 무르게 푼 자가 아님)',
     stat.alt.join(' · '));
  console.log('\n' + (fail ? 'PROBE770 FAIL' : 'PROBE770 PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
