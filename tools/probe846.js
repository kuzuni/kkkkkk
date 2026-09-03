#!/usr/bin/env node
/* 작업 846 재현 — 「`verify818` [R1]·[R2] 가 느린 러너에서 «≥5% 표본 0개» 로 뒤집힌다」
 * (T1 «버그(게이트 · 표본 수)» · 344·574·825 계열 · 상세는 PROGRESS 846 행)
 *
 *   node tools/probe846.js
 *   P846_RATES=1,6 node tools/probe846.js
 *
 * ⚠ 338 규칙 — 처방보다 재현이 먼저다. 등재문이 시킨 것이 바로 이 곡선이다:
 *   «`V818_CPU` ×2·×4·×6 을 각각 돌려 **표본 수 ↔ 잡히는 덮임 수** 곡선부터 그려라».
 *
 *   [1] 재현      — 옛 표본기(홀드하며 벽시계로 뜬다)는 러너가 느려질수록 표본이 사라지고
 *                   그와 함께 «≥5% 덮임» 도 사라진다. 값이 아니라 **표본**이 원인이다.
 *   [2] 등재문 처방 ⓑ **기각** — «페이지 안 rAF 로 옮긴다» 로는 안 낫는다. ×6 에서는 rAF 자신이
 *                   3fps 라 왕복을 0회로 만들어도 표본이 한 자릿수다.
 *   [3] 한 세대의 봉우리 — 겹침의 정도는 홀드 틱 사슬이 정하므로 **러너가 정한다**.
 *                   ⇒ 어떤 «벽시계 표본기» 로도 못 고친다(그래서 ⓑ 가 기각된다).
 *                   ⚑⚑ **872 정정(2026-09-03)** — 이 절은 «한 세대만 걸으면 봉우리가 5% 문턱 아래
 *                   (1.5~2.9%)» 를 **한 판**으로 물었다. 두 곳이 틀렸다:
 *                   ⓐ **한 판으로 못 묻는다** — 알 방향(`--dx/--dy`)이 발화마다 무작위라 같은 트리에서
 *                      봉우리가 판마다 갈린다(단련 15판 실측 **8.7 ~ 16.4%** · 룬 **16.1 ~ 38.3%**).
 *                      이 파일 자신이 `fxsample846.js` 머리말에 «3세대에서 12.5% ↔ 4.0% 로 갈렸다 —
 *                      러너가 아니라 **제비뽑기**» 라고 적어 두고도 판정은 한 판으로 했다.
 *                   ⓑ **값의 방향이 바뀌었다** — 846 당시의 «1.5~2.9%» 는 그 시절 알 크기의 값이다.
 *                      지금은 단련 15판 · 룬 15판이 **30/30 판 전부 5% 위**다(838 계열이 알 크기·사거리를
 *                      키운 뒤의 자리). ⇒ 문턱은 그대로 두고 **방향만 뒤집고**(333 처방),
 *                      **G판 중앙값**으로 묻는다. 되돌림 시험 [3r] 이 무르게 푼 수리가 아님을 못박는다.
 *                   ⚠ 그래서 «덮임 = 세대 겹침» 은 더 이상 근거가 아니다 — ⓑ 를 기각하는 것은
 *                      [2a](rAF 자신이 3.9fps)와 [1](표본이 사라진다)이고, [3] 은 그 곁의 기록이다.
 *   [4] 처방      — 애니메이션 시간으로 걷고 겹침을 제품 상수로 다시 만든다(`tools/fxsample846.js`).
 *                   표본 수·덮임이 ×1 ↔ ×6 에서 같다.
 *   [5] 등가      — 새 자가 816·818 의 소박한 이중 루프와 **픽셀 단위로 같다**(자를 안 바꿨다).
 *   [6] 헛초록 방지 — 수리 후 선언에서는 새 자도 0 이다(무뎌진 게 아니다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COV_RUN, NAIVE_COV } = require('./fxsample846');
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.P846_HOLD || 2600);
const RATES = (process.env.P846_RATES || '1,2,4,6').split(',').map(Number);
const TICK = 160, LIFE = 380, CSTEP = 16, GENS = 12;
/* 872 — [3] 이 «한 세대» 를 몇 판 뽑아 분포로 묻는가(한 판은 제비뽑기라 못 묻는다).
   `G1N` 은 판정용 본 표본 · `G1R` 은 되돌림 시험용(수리 후 선언이라 0 이 나오는 것만 본다). */
const G1N = Number(process.env.P846_GEN1 || 7);
const G1R = Number(process.env.P846_GEN1R || 3);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

const T = {
  temper: { name: '단련', sub: 'temper', host: '#trw .tr-tp.k0 .tb', num: '.tbn',
            far: "S.tstone = 1e12; const o = temperObj(); o.alloc = o.alloc || {}; o.alloc.atk = 100000; renderTemper();" },
  rune:   { name: '룬',   sub: 'rune',   host: '#trw .tr-rn .rbt.b1', num: '.rbn',
            far: "S.rstone = 1e12; S.rune = S.rune || {}; S.rune.r1 = 400; renderRunes();" }
};

/* 옛 표본기 — 846 이전 `verify818` 의 홀드 루프를 그대로 옮겨 왔다. 이것이 «수리 전 사본» 이다. */
const OLD_SAMPLE = (sel) => {
  const host = document.querySelector(sel.host);
  const inkOf = el => {
    if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const L = document.getElementById('fxl');
  const eggs = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                     .map(nd => nd.getBoundingClientRect()) : [];
  return { n: eggs.length, num: cov(inkOf(host && host.querySelector(sel.num)), eggs) };
};

/* 등재문 처방 ⓑ — 같은 자를 **페이지 안 rAF** 로 옮긴 것(왕복 0회). 기각을 기록하려고 남긴다. */
const RAF_START = (sel) => {
  const host = document.querySelector(sel.host);
  const st = { frames: 0, ticks: 0, max: 0, n05: 0, stop: false, t0: performance.now(), t1: 0 };
  window.__p846 = st;
  const inkOf = el => {
    if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const tick = () => {
    if (st.stop) return;
    st.ticks++;
    const L = document.getElementById('fxl');
    const eggs = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                       .map(nd => nd.getBoundingClientRect()) : [];
    if (eggs.length) {
      const c = cov(inkOf(host && host.querySelector(sel.num)), eggs);
      st.frames++; if (c > st.max) st.max = c; if (c >= 0.05) st.n05++;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const RAF_STOP = () => {
  const st = window.__p846; window.__p846 = null;
  if (!st) return null;
  st.stop = true; st.t1 = performance.now();
  return { frames: st.frames, ticks: st.ticks, max: st.max, n05: st.n05,
           iv: st.ticks ? (st.t1 - st.t0) / st.ticks : 0 };
};

/* 한 세대만 끝까지 걸어 본다 — «겹침이 있어야 5% 를 넘는가» 를 직접 묻는 자 */
const ONE_GEN = (arg) => new Promise(res => {
  const sel = arg.sel, host = document.querySelector(sel.host), L = document.getElementById('fxl');
  const inkOf = el => {
    if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  let done = false;
  const origRemove = Element.prototype.remove;
  let guarded = true;
  Element.prototype.remove = function () {
    if (guarded && this.nodeType === 1 && /fx-spark/.test(this.className + '')) return;
    return origRemove.call(this);
  };
  /* 옛 자는 문자열로 건너온다 — 함수로 되살려 쓴다(그대로 부르면 «string 은 함수가 아니다» 로
     콜백이 죽고, `done` 이 이미 참이라 아래 타임아웃도 안 깨워 **자가 통째로 멎는다**) */
  const naive = new Function('return ' + arg.naive)();
  const bail = e => { guarded = false; Element.prototype.remove = origRemove; res({ err: String(e) }); };
  const mo = new MutationObserver(recs => {
    if (done) return;
    const born = [];
    for (const r of recs) for (const nd of r.addedNodes)
      if (nd.nodeType === 1 && /fx-spark/.test(nd.className + '')) born.push(nd);
    if (!born.length) return;
    done = true; mo.disconnect();
    try {
    const anims = [];
    for (const nd of born) for (const a of nd.getAnimations()) { a.pause(); anims.push(a); }
    const ink = inkOf(host && host.querySelector(sel.num));
    let max = 0, n = 0;
    for (let tt = 0; tt <= arg.life; tt += arg.step) {
      for (const a of anims) { try { a.currentTime = tt; } catch (_) {} }
      const rs = born.map(nd => nd.getBoundingClientRect())
                     .filter(b => b.width && b.height)
                     .map(b => ({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }));
      const c = naive(ink, rs);
      if (c > max) max = c;
      n++;
    }
    guarded = false; Element.prototype.remove = origRemove;
    for (const nd of [...L.children]) if (/fx-spark/.test(nd.className + '')) { try { nd.remove(); } catch (_) {} }
    res({ eggs: born.length, steps: n, max });
    } catch (e) { bail(e); }
  });
  mo.observe(L, { childList: true });
  setTimeout(() => { if (!done) { done = true; mo.disconnect(); guarded = false;
                                  Element.prototype.remove = origRemove; res(null); } }, 12000);
});

async function arm(page, t, keep) {
  await page.evaluate(s => { setTrSub(s); }, t.sub);
  await page.waitForTimeout(220);
  await page.evaluate(a => {
    for (const el of document.querySelectorAll(a.host)) {
      if (a.keep === null) el.style.removeProperty('--burst-keep');
      else el.style.setProperty('--burst-keep', a.keep);
    }
  }, { host: t.host, keep });
  await page.waitForFunction(() => {
    const L = document.getElementById('fxl');
    return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
  }, null, { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(120);
  return page.evaluate(s => {
    const h = document.querySelector(s.host); if (!h) return null;
    const b = h.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, t);
}

/* mode: 'old'(벽시계 · 왕복) · 'raf'(벽시계 · 페이지 안) · 'gen1'(한 세대 스텝) · 'cov'(846 처방) */
async function hold(page, t, keep, mode, rects) {
  const g = await arm(page, t, keep);
  if (!g) return null;
  let pr = null;
  if (mode === 'raf') await page.evaluate(RAF_START, { host: t.host, num: t.num });
  if (mode === 'gen1') pr = page.evaluate(ONE_GEN, { sel: { host: t.host, num: t.num },
                                                     life: LIFE, step: CSTEP, naive: NAIVE_COV.toString() });
  if (mode === 'cov') pr = page.evaluate(COV_RUN, { sel: { host: t.host, num: t.num },
                                                    gens: GENS, tick: TICK, step: CSTEP,
                                                    timeout: 20000, rects: rects || 0 });
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  let r = null;
  const rows = [];
  const t0 = Date.now();
  if (mode === 'old') {
    while (Date.now() - t0 < HOLD_MS) { rows.push(await page.evaluate(OLD_SAMPLE, { host: t.host, num: t.num })); }
  } else if (mode === 'raf') {
    await page.waitForTimeout(HOLD_MS);
  } else {
    r = await pr;
  }
  await page.mouse.up();
  const wall = Date.now() - t0;
  if (mode === 'raf') r = await page.evaluate(RAF_STOP);
  await page.waitForTimeout(150);
  if (mode === 'old') {
    const live = rows.filter(x => x.n > 0);
    r = { frames: live.length, n05: live.filter(x => x.num >= 0.05).length,
          max: live.length ? Math.max(...live.map(x => x.num)) : 0,
          iv: rows.length ? wall / rows.length : 0 };
  }
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; openTrain(); });
  for (const k of Object.keys(T)) await page.evaluate(src => { new Function(src)(); }, T[k].far);
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  const throttle = r => cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
  const lo = RATES[0], hi = RATES[RATES.length - 1];

  /* ── [1] 재현 곡선 ────────────────────────────────────────────────── */
  console.log('[1] 표본 수 ↔ 잡히는 덮임 수 — «818 이전 사본»(`--burst-keep:none`) 홀드 ' + HOLD_MS + 'ms');
  console.log('  대상   ×CPU |  옛 표본기(벽시계 · 왕복)');
  console.log('  ─────────────┼──────────────────────────────────────────');
  const old = { temper: {}, rune: {} };
  for (const k of Object.keys(T)) for (const rate of RATES) {
    await throttle(rate);
    const r = await hold(page, T[k], 'none', 'old');
    old[k][rate] = r;
    console.log('  ' + T[k].name.padEnd(4) + '   ×' + String(rate).padEnd(4)
      + '| 표본 ' + String(r.frames).padStart(3) + ' · ≥5% ' + String(r.n05).padStart(3)
      + ' · 최대 ' + String(p1(r.max * 100)).padStart(5) + '% · 간격 ' + p1(r.iv) + 'ms');
  }
  for (const k of Object.keys(T)) {
    ok(old[k][lo].n05 > 0, '[1a] ' + T[k].name + ' 옛 표본기는 ×' + lo + ' 에서 덮임을 잡는다(자가 원래 옳았다)',
       '표본 ' + old[k][lo].frames + ' · ≥5% ' + old[k][lo].n05 + '개');
    ok(old[k][hi].frames < old[k][lo].frames * 0.5,
       '[1b] ' + T[k].name + ' ×' + hi + ' 에서 **표본이 절반 아래로 사라진다**',
       old[k][lo].frames + ' → ' + old[k][hi].frames + '표본 (간격 ' + p1(old[k][lo].iv) + ' → ' + p1(old[k][hi].iv) + 'ms)');
  }
  ok(old.temper[hi].n05 === 0 || old.rune[hi].n05 === 0,
     '[1c] 그 결과 ×' + hi + ' 에서 «≥5% 표본 0개» 가 실제로 나온다 — 등재문이 본 [R1]·[R2] 의 얼굴',
     '단련 ' + old.temper[hi].n05 + '개 · 룬 ' + old.rune[hi].n05 + '개');

  /* ── [2] 등재문 처방 ⓑ 기각 ──────────────────────────────────────── */
  console.log('\n[2] 등재문 처방 ⓑ(«페이지 안 rAF 로 옮긴다») — 왕복을 0회로 만들면 낫는가');
  const raf = {};
  for (const rate of [lo, hi]) {
    await throttle(rate);
    raf[rate] = await hold(page, T.temper, 'none', 'raf');
    console.log('  단련 ×' + rate + ' → rAF 틱 간격 ' + p1(raf[rate].iv) + 'ms('
      + p1(1000 / Math.max(raf[rate].iv, 1e-9)) + 'fps) · 표본 ' + raf[rate].frames + ' · ≥5% ' + raf[rate].n05);
  }
  ok(raf[hi].frames < 20,
     '[2a] **기각** — ×' + hi + ' 에서는 rAF 자신이 한 자릿수 fps 라 왕복을 없애도 표본이 안 는다',
     'rAF ' + p1(1000 / Math.max(raf[hi].iv, 1e-9)) + 'fps · 표본 ' + raf[hi].frames + '개(옛 자 '
     + old.temper[hi].frames + '개)');

  /* ── [3] 한 세대의 봉우리 — 872 정정: 한 판이 아니라 G판 분포로 묻는다 ─ */
  console.log('\n[3] 한 세대만 끝까지 걸으면 봉우리가 얼마인가 — ' + G1N + '판 분포로 묻는다(872)');
  await throttle(lo);
  const gen1 = async (keep, n) => {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const r = (await hold(page, T.temper, keep, 'gen1')) || {};
      if (r.err || r.max === undefined) { console.log('  · ' + (i + 1) + '판 오류 ' + (r.err || 'null')); continue; }
      rows.push(r);
    }
    const pk = rows.map(r => r.max * 100).sort((a, b) => a - b);
    return { rows, pk, min: pk[0], med: pk[Math.floor(pk.length / 2)], max: pk[pk.length - 1],
             steps: rows.length ? Math.min(...rows.map(r => r.steps)) : 0 };
  };
  const g1 = await gen1('none', G1N);
  console.log('  단련 한 세대 ' + g1.pk.length + '판 → 알 '
    + [...new Set(g1.rows.map(r => r.eggs))].sort((a, b) => a - b).join('/')
    + ' · 봉우리 ' + g1.pk.map(p1).join(' · ') + ' %');
  console.log('  최소 ' + p1(g1.min) + '% · **중앙 ' + p1(g1.med) + '%** · 최대 ' + p1(g1.max)
    + '% · 갈림폭 ' + p1(g1.max - g1.min) + '%p · ≥5% ' + g1.pk.filter(p => p >= 5).length + '/' + g1.pk.length);
  ok(g1.pk.length >= 3 && g1.steps > 10 && g1.med >= 5,
     '[3a] 한 세대의 봉우리 **중앙값**이 5% 문턱 **위**다 — 지금은 겹침 없이도 넘는다(846 당시 «1.5~2.9%» 폐기)',
     G1N + '판 중앙 ' + p1(g1.med) + '% ≥ 5% · 갈림폭 ' + p1(g1.max - g1.min) + '%p');
  ok(old.temper[lo].max >= 0.05,
     '[3b] 같은 자리를 겹침째 재면 5% 를 넘는다 — 그래서 «벽시계 표본기» 로는 못 고친다(겹침을 러너가 정한다)',
     '겹침 포함 ' + p1(old.temper[lo].max * 100) + '%');
  /* [3r] 되돌림 시험 — [3a] 가 «무뎌서 초록» 이 아님을 못박는다(334 규율).
     수리 후 선언(`--burst-keep:.tbn` = 818 이 넣은 그 가둠)에서는 알이 숫자 잉크에 못 닿으므로
     같은 자·같은 판수로 물어도 중앙값이 0 이어야 한다 ⇒ 그 트리에서는 [3a] 가 빨갛다. */
  const g1r = await gen1('.tbn', G1R);
  console.log('  되돌림 — 수리 후 선언(`--burst-keep:.tbn`) ' + g1r.pk.length + '판 → 봉우리 '
    + g1r.pk.map(p1).join(' · ') + ' % (중앙 ' + p1(g1r.med) + '%)');
  ok(g1r.pk.length >= 2 && g1r.max === 0,
     '[3r] 되돌림 — 가둠이 살아 있는 선언에서는 한 세대 봉우리가 **전 판 0** 이다(⇒ 거기서는 [3a] 가 빨갛다)',
     G1R + '판 최대 ' + p1(g1r.max) + '%');

  /* ── [4] 처방 — 애니메이션 시간 · 제품 상수 겹침 ─────────────────── */
  console.log('\n[4] 846 처방 — 발화 ' + GENS + '세대를 잡아 애니메이션 시간으로 걷는다(겹침 = 제품 틱 ' + TICK + 'ms)');
  const neo = { temper: {}, rune: {} };
  for (const k of Object.keys(T)) for (const rate of [lo, hi]) {
    await throttle(rate);
    const r = await hold(page, T[k], 'none', 'cov');
    neo[k][rate] = r;
    console.log('  ' + T[k].name.padEnd(4) + ' ×' + rate + ' → 세대 ' + r.gens + ' · 스텝 ' + r.frames
      + ' · 봉우리알 ' + r.peak + ' · 최대 ' + p1(r.max * 100) + '% · ≥5% ' + r.n05 + ' · out ' + r.out);
  }
  for (const k of Object.keys(T)) {
    ok(neo[k][lo].frames === neo[k][hi].frames && neo[k][lo].frames > 100,
       '[4a] ' + T[k].name + ' 표본 수가 ×' + lo + ' ↔ ×' + hi + ' 에서 **같다**(러너가 식에서 빠졌다)',
       neo[k][lo].frames + ' ↔ ' + neo[k][hi].frames + '스텝');
    ok(neo[k][lo].n05 > 0 && neo[k][hi].n05 > 0,
       '[4b] ' + T[k].name + ' ×' + hi + ' 에서도 덮임을 잡는다 — [R1]·[R2] 가 안 뒤집힌다',
       '≥5% ' + neo[k][lo].n05 + ' ↔ ' + neo[k][hi].n05 + '개');
  }
  /* [3c] 기록만(872) — «겹침이 봉우리를 키우는가». 판정에 안 쓴다(LESSONS 239-① «흔들리는 양은 기록으로만»).
     12세대 겹침의 봉우리가 한 세대 G판의 [최소,최대] 안에 들면 «겹침 = 덮임의 원인» 이 아니라는 뜻이다. */
  console.log('\n[3c] 기록 — 겹침이 봉우리를 키우는가(판정 아님)');
  console.log('  단련 한 세대 ' + G1N + '판 [' + p1(g1.min) + ' ~ ' + p1(g1.max) + '%] · 중앙 ' + p1(g1.med)
    + '%  ↔  12세대 겹침 ×' + lo + ' ' + p1(neo.temper[lo].max * 100) + '% (봉우리알 ' + neo.temper[lo].peak
    + ' · 세대당 평균 ' + p1(neo.temper[lo].eggs) + '알)'
    + '  ⇒ ' + (neo.temper[lo].max * 100 <= g1.max ? '분포 **안**(겹침이 안 키운다)' : '분포 **밖**(겹침이 키운다)'));

  /* ── [5] 등가 — 눈금을 안 바꿨다 ─────────────────────────────────── */
  console.log('');
  await throttle(lo);
  const eq = await hold(page, T.temper, 'none', 'cov', 40);
  const cmp = await page.evaluate(a => {
    const naive = new Function('return ' + a.src)();
    const fast = (ink, eggs) => {
      if (!ink || !ink.width || !ink.height || !eggs.length) return 0;
      const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
      const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
      let n = 0;
      for (let y = 0; y < h; y++) {
        const py = y0 + y + 0.5;
        const iv = [];
        for (const e of eggs) if (py > e.top && py < e.bottom) iv.push([e.left, e.right]);
        if (!iv.length) continue;
        iv.sort((p, q) => p[0] - q[0]);
        let s = iv[0][0], t = iv[0][1];
        for (let i = 1; i <= iv.length; i++) {
          if (i < iv.length && iv[i][0] <= t) { if (iv[i][1] > t) t = iv[i][1]; continue; }
          const lo2 = Math.max(0, Math.floor(s - x0 - 0.5) + 1);
          const hi2 = Math.min(w - 1, Math.ceil(t - x0 - 0.5) - 1);
          if (hi2 >= lo2) n += hi2 - lo2 + 1;
          if (i < iv.length) { s = iv[i][0]; t = iv[i][1]; }
        }
      }
      return n / (w * h);
    };
    let worst = 0, nz = 0;
    for (const r of a.rects) { const A = naive(r.ink, r.eggs), B = fast(r.ink, r.eggs); if (A > 0) nz++; worst = Math.max(worst, Math.abs(A - B)); }
    return { n: a.rects.length, nz, worst };
  }, { rects: eq.rects, src: NAIVE_COV.toString() });
  ok(cmp.n >= 10, '[5a] 등가 대조 표본이 실제로 있다(빈 배열로 초록이 아니다)', cmp.n + '프레임 · 덮인 프레임 ' + cmp.nz);
  ok(cmp.nz > 0, '[5b] 그중 «실제로 덮인» 프레임이 있다 — 0 만 비교하고 등가라 하지 않는다', cmp.nz + '프레임');
  ok(cmp.worst === 0, '[5c] 816·818 의 소박한 이중 루프와 **픽셀 단위로 같다**(자를 안 바꿨다)', '최대 차 ' + cmp.worst);

  /* ── [6] 헛초록 방지 ─────────────────────────────────────────────── */
  console.log('');
  for (const rate of [lo, hi]) {
    await throttle(rate);
    const r = await hold(page, T.temper, null, 'cov');
    ok(r && r.n05 === 0 && r.max < 0.05,
       '[6] ×' + rate + ' — 수리 후 선언(`--burst-keep:.tbn`)에서는 새 자도 덮임 0 이다(무뎌진 게 아니다)',
       '스텝 ' + r.frames + ' · ≥5% ' + r.n05 + '개 · 최대 ' + p1(r.max * 100) + '%');
  }
  await throttle(1);

  await browser.close();
  console.log('\nPROBE846 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
