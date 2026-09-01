#!/usr/bin/env node
/* 작업 684·685 재현기 — 「대량 소환에도 ⚔️ 토스트」 · 「연속 강화 **중에도** 알림」
 *
 *   node tools/probe684.js                    (소환 3구성 + 훈련 홀드 2회)
 *   node tools/probe684.js --hold=2400
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 각각 갈래를 열어 뒀고 이 자가 그것을 가른다.
 *
 * [1] 684 «대량 소환에서 전투력 토스트가 안 뜨거나 삼켜진다»
 *     ⓐ **묶음은 열리는데 Δ 가 0** — 소환이 `cp()` 를 아예 안 올린다(263 «자동 장착 폐지» 이후
 *        얻은 물건이 장착되지 않으므로 전투력에 안 실린다) ⇒ 324 규약(Δ≤0 침묵)대로 «정상 침묵».
 *     ⓑ **Δ 는 나는데 토스트가 삼켜진다** — 결과 팝업 경로가 토스트 스택(4장)을 채우거나
 *        `cpPrev` 기준선이 배치 전이 아니라 배치 후로 밀린다.
 *     두 갈래는 **`cp()` 차분과 토스트 장수를 같은 배치에서 같이 찍으면** 갈린다.
 *
 * [2] 685 «연속 강화 중에도 떠야 한다»
 *     324 는 «홀드 = 합계 1장(끝나고)» 이 **주인 승인 설계**였고 677 이 그것을 시간이 아니라
 *     홀드 상태로 굳혔다. 그러므로 수리 전 예상은 **홀드 한복판 토스트 0장**이고, 이 자는
 *     그 0 을 «결함» 이 아니라 **개정 전 규약의 실측**으로 찍어 둔다(되돌림 시험의 기준선).
 *
 * ⚠ 계측기는 제품을 한 줄도 안 고친다 — 페이지 안에서 함수를 감싸기만 한다(probe677 선례).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const HOLD_MS = Number(arg('hold', 2400));

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 페이지에 심는 계측기 — 제품 0줄 */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__p684 = { toasts: [], adds: [], live: [], t0: 0 });
  const L = document.getElementById('fxl');
  /* 토스트가 `#fxl` 에 «붙은» 시각 — verify619/probe677 과 같은 관측점 */
  new MutationObserver(ms => {
    const t = performance.now();
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      if (/fx-toast/.test((nd.className || '') + '')) P.toasts.push({ t, txt: (nd.textContent || '').slice(0, 40) });
    }
  }).observe(L, { childList: true });
  /* ★ 685 는 «장수» 가 아니라 «그 순간 화면에 있는가» 가 과녁이다 — 표본을 프레임마다 뜬다 */
  P.sample = () => {
    const els = [...L.querySelectorAll('.fx-toast')].filter(e => /전투력/.test(e.textContent || ''));
    P.live.push({ t: performance.now() - P.t0, n: els.length, txt: els.length ? els[0].textContent.trim() : '' });
  };
};

/* 화면에 살아 있는 «전투력» 토스트를 ms 간격으로 훑는다(페이지 안 타이머 — 홀드 중에도 돈다) */
const WATCH = iv => {
  const P = window.__p684; P.live.length = 0; P.t0 = performance.now();
  P.wt = setInterval(P.sample, iv);
};
const UNWATCH = () => { const P = window.__p684; clearInterval(P.wt); P.wt = 0; };

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  console.log('[0] 전제 — 324 묶음 창과 소환 배수 칸을 소스에서 읽는다');
  const cpMs = Number((code.match(/const CP_FX_MS\s*=\s*(\d+)/) || [])[1]);
  const muls = (code.match(/const SUM_MULS\s*=\s*\[([^\]]*)\]/) || [])[1];
  ok(cpMs > 0, '0a `CP_FX_MS` 를 읽었다', 'CP_FX_MS = ' + cpMs + 'ms');
  ok(!!muls, '0b `SUM_MULS`(668 배수 칸)를 읽었다', muls ? muls.replace(/\s+/g, ' ').trim() : 'n/a');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);

  /* ── [1] 684 — 대량 소환 ─────────────────────────────────────────────────
     배너·횟수를 바꿔 가며 «cp 차분» 과 «전투력 토스트 장수» 를 같은 배치에서 같이 찍는다. */
  console.log('\n[1] 684 — 대량 소환: cp 차분 ↔ 전투력 토스트 (수리 전)');
  async function batch(b, times) {
    await page.evaluate(() => { S.dia = 1e12; S.relic = 1e12; S.gold = 1e18; });
    await page.waitForTimeout(500);                    /* 묶음 창을 비우고 기준선을 따라 올린다 */
    await page.evaluate(() => { window.__p684.toasts.length = 0; });
    const r = await page.evaluate(([bb, n]) => {
      const before = cp(), at = performance.now();
      doSummon(bb, n);
      return { before, after: cp(), at, ms: performance.now() - at };
    }, [b, times]);
    await page.waitForTimeout(2400);                   /* 묶음 창(420) + 큐(notePump 120ms) 여유 */
    const t = await page.evaluate(() => window.__p684.toasts.slice());
    const cps = t.filter(x => /전투력/.test(x.txt));
    /* ★ 스택 드롭 갈래 — `fxToast` 는 4장부터 드롭하고 `notify` 가 큐로 미룬다.
       배치가 낸 «다른» 토스트(레벨업 등)가 스택을 채우면 전투력 토스트가 늦거나 사라진다. */
    return { b, times, d: r.after - r.before, cp: cps.length, all: t.length,
             lag: cps.length ? p1(cps[0].t - r.at) : 0,
             txt: cps.map(x => x.txt.trim()).join(' | ') };
  }
  const rows = [];
  for (const [b, n] of [['skill', 1], ['skill', 10], ['skill', 100], ['skill', 1000], ['pet', 1000], ['weapon', 1000]]) {
    const r = await batch(b, n);
    rows.push(r);
    console.log("   " + b + " ×" + n + " — cp 차분 " + r.d + " · 전투력 토스트 " + r.cp + "장(지연 " + r.lag + "ms) / 전체 "
      + r.all + '장' + (r.txt ? ' · «' + r.txt + '»' : ''));
    await page.evaluate(() => { const w = document.getElementById('sumw'); if (w) w.classList.remove('on'); });
  }
  const rise = rows.filter(r => r.d > 0);
  const bulk = rows.filter(r => r.times > 1);
  ok(true, '1a 배치 표본 ' + rows.length + '건 — cp 가 오른 배치 ' + rise.length + '건',
    rows.map(r => r.b + '×' + r.times + ':Δ' + r.d + '/' + r.cp + '장').join(' · '));
  /* ★ 갈래 판정 — 「cp 가 올랐는데 토스트가 0장」 이 하나라도 있으면 ⓑ(삼켜짐)다 */
  const swallowed = rows.filter(r => r.d > 0 && r.cp === 0);
  ok(true, '1b 갈래 — Δ>0 인데 토스트 0장인 배치 ' + swallowed.length + '건'
    + (swallowed.length ? ' ⇒ ⓑ 삼켜짐' : ' ⇒ ⓐ Δ 자체가 0(정상 침묵)'),
    swallowed.map(r => r.b + '×' + r.times).join(' · ') || 'n/a');
  ok(true, '1c 대량 배치(×100) ' + bulk.length + '건 중 전투력 토스트가 난 것 '
    + bulk.filter(r => r.cp > 0).length + '건',
    bulk.map(r => r.b + ':' + r.cp + '장').join(' · '));
  const lags = rows.filter(r => r.cp > 0).map(r => r.lag);
  ok(true, '1d ★ 실제 결손은 «장수» 가 아니라 **시각** 이다 — 배치 종료 ↔ 토스트 지연 '
    + p1(Math.min(...lags)) + '~' + p1(Math.max(...lags)) + 'ms (묶음 창 ' + cpMs + 'ms 를 다 기다린다)',
    lags.map(p1).join(' · '));
  /* ★ «삼켜진다» 의 남은 갈래 — 결과 팝업(12)이 토스트를 덮는가. 뜬 상태에서 직접 물어본다. */
  await page.evaluate(() => { S.dia = 1e12; });
  await page.waitForTimeout(500);
  await page.evaluate(() => doSummon('amulet', 100));
  await page.waitForTimeout(700);
  const cover = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#fxl .fx-toast')].find(e => /전투력/.test(e.textContent || ''));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    const cs = getComputedStyle(el);
    return { top: Math.round(b.y), h: Math.round(b.height), opa: cs.opacity,
             hit: hit ? (hit.id || hit.className || hit.tagName) + '' : 'none',
             mine: !!(hit && (hit === el || el.contains(hit))),
             popup: !!document.querySelector('#sumw.on') };
  });
  ok(!!cover, '1e 결과 팝업이 열린 채 전투력 토스트를 잡았다', cover ? JSON.stringify(cover) : '토스트 없음');
  /* ⚠ `#fxl` 은 `pointer-events:none` 이라 elementFromPoint 는 **언제나** 아래를 돌려준다
     (`hit:"sumw"` 는 가려짐의 증거가 아니다). «위인가» 는 z 로 갈라야 한다. */
  const zs = await page.evaluate(() => ({
    fxl: getComputedStyle(document.getElementById('fxl')).zIndex,
    sumw: getComputedStyle(document.getElementById('sumw')).zIndex }));
  if (cover) ok(cover.top >= 0 && Number(cover.opa) > 0 && Number(zs.fxl) > Number(zs.sumw),
    '1f 토스트는 프레임 안에 불투명하게, **팝업보다 위** 에 있다 — «가려짐» 갈래 기각',
    'top ' + cover.top + ' · opacity ' + cover.opa + ' · #fxl z' + zs.fxl + ' > #sumw z' + zs.sumw
    + ' · 팝업 ' + (cover.popup ? '열림' : '닫힘'));
  await page.evaluate(() => { const w = document.getElementById('sumw'); if (w) w.classList.remove('on'); });

  /* ── [2] 685 — 훈련 홀드 한복판 ──────────────────────────────────────────
     «홀드가 도는 동안 화면에 전투력 토스트가 있는가» 를 60ms 간격으로 훑는다. */
  console.log('\n[2] 685 — 훈련 홀드 중 «살아 있는 토스트» 표본 (수리 전)');
  await page.evaluate(() => { const w = document.getElementById('sumw'); if (w) w.classList.remove('on'); });
  await page.evaluate(() => { S.gold = 1e18; S.trainStage = 400; openTrain(); });
  await page.waitForTimeout(500);

  async function hold() {
    await page.evaluate(() => { S.gold = 1e18; S.trainStage = 400;
      if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
    await page.waitForTimeout(420);
    const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#trCards [data-tr]');
    if (!r || !r.w) return null;
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.evaluate(() => { window.__p684.toasts.length = 0; });
    await page.evaluate(WATCH, 60);
    const cpBefore = await page.evaluate(() => cp());
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    const upAt = await page.evaluate(() => performance.now() - window.__p684.t0);
    await page.mouse.up();
    await page.waitForTimeout(1400);
    await page.evaluate(UNWATCH);
    const d = await page.evaluate(() => ({ live: window.__p684.live.slice(),
      toasts: window.__p684.toasts.slice(), cp: cp() }));
    const during = d.live.filter(s => s.t < upAt);
    const shown = during.filter(s => s.n > 0);
    const after = d.live.filter(s => s.t >= upAt && s.n > 0);
    const maxN = Math.max(0, ...d.live.map(s => s.n));
    const vals = [...new Set(shown.map(s => s.txt))];
    return { cpD: d.cp - cpBefore, samples: during.length, shown: shown.length, after: after.length,
             maxN, vals, cards: d.toasts.filter(t => /전투력/.test(t.txt)).length,
             txt: d.toasts.filter(t => /전투력/.test(t.txt)).map(t => t.txt.trim()) };
  }

  const hs = [];
  for (let i = 0; i < 2; i++) {
    const h = await hold();
    if (!h) { ok(false, '2x 훈련 카드를 못 찾았다'); break; }
    hs.push(h);
    console.log('   회차 ' + (i + 1) + ' — 홀드 중 표본 ' + h.samples + '개 중 «전투력 토스트가 화면에 있던» 표본 '
      + h.shown + '개 · 홀드 뒤 ' + h.after + '개 · 동시 최대 ' + h.maxN + '장 · 붙은 토스트 '
      + h.cards + '장 · cp 차분 ' + h.cpD + (h.txt.length ? ' · «' + h.txt.join(' | ') + '»' : ''));
  }
  if (hs.length) {
    const mid = hs.reduce((a, h) => a + h.shown, 0);
    const rose = hs.every(h => h.cpD > 0);
    ok(rose, '2a 전제 — 두 홀드 모두 전투력이 실제로 올랐다(표본이 «홀드» 다)',
      hs.map(h => 'Δ' + h.cpD).join(' · '));
    ok(true, '2b 수리 전 실측 — 홀드 **한복판** 에 토스트가 있던 표본 ' + mid + '개'
      + (mid === 0 ? ' ⇒ 등재문대로 «끝나고 1장» (개정 대상)' : ''),
      hs.map(h => h.shown + '/' + h.samples).join(' · '));
    ok(hs.every(h => h.after > 0), '2c 수리 전 실측 — 홀드가 끝난 뒤에는 뜬다(324 규약 그대로)',
      hs.map(h => h.after + '표본 · ' + h.cards + '장').join(' · '));
    ok(hs.every(h => h.maxN <= 1), '2d 동시 표시 ≤1장 (수리 후에도 지켜야 할 불변)',
      '최대 ' + Math.max(...hs.map(h => h.maxN)) + '장');
  }

  ok(errs.length === 0, '3a 콘솔 에러 0건', errs.slice(0, 2).join(' / ') || '없음');
  await browser.close();
  console.log('\nPROBE684 ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
