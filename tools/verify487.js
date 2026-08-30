/* 게이트 487 — 21 도감 카드 라벨 «Lv. n/m» 이 카드 안에서 잘리지 않는다.
 *
 * 자(尺)는 `tools/probe487.js` 와 **같은 것을 읽는다**(RAISE·MEASURE·TABS·CASES 를 그대로 가져온다).
 * 스캐너와 게이트가 서로 다른 정의를 쓰면 자는 스캐너가 실제로 본 것을 못 지킨다(397 교훈).
 *
 *   [A] 전제 — 6탭이 실제로 열리고 카드 라벨을 그린다. 표본이 0 이면 아래 초록은
 *       «아무것도 안 본» 초록이다(341 이 [전제] 절을 본체와 가른 이유 그대로).
 *   [B] 본체 — 다섯 상태(Lv 1·10·99·100 × 받은 단계 0·9) × 6탭에서 잉크가 `.cd` 클라이언트
 *       박스 안에 있고 **좌우 여백 ≥ 2px**. 최장 문자열 «Lv. 100/10» 이 여기 들어 있다 —
 *       등재문이 본 «Lv. 100/1»(−2.9) 이 아니라 이쪽(−17.3)이 실재하는 최악이다.
 *   [C] 레퍼런스 불변 — 짧은 문자열은 **한 픽셀도 안 움직인다**. 측정표 21 의 ref 라벨(85×20)에
 *       맞춰 둔 11회차 값(fs 26 · scaleX 1.05)이 살아 있다는 뜻이고, 등재문의 처방 ⓐ(fs 26→24)·
 *       ⓑ(letter-spacing 음수)를 안 고른 이유가 이 항이다 — 그 둘은 이 값을 통째로 옮긴다.
 *   [D] 처방 기각 — ⓐ(fs 24) 사본은 최장 문자열에서 **여전히 잘린다**. 등재문의 처방을 그대로
 *       따랐으면 −2.9 자리만 닫고 −17.3 자리는 그대로였을 것이다(338 규칙).
 *   [R] 되돌림 시험 — 자가 무른지 시험한다.
 *       R1 fit 을 `!important` 로 무력화한 사본은 **빨개진다**(고친 것을 되돌리면 빨갛다).
 *       R2 방(room)을 억지로 넓힌 사본도 **빨개진다**(자가 «여백» 을 실제로 세고 있다).
 *   [H] 페이지 에러 0.
 *
 * 실행: node tools/verify487.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { TABS, CASES, RAISE, MEASURE } = require('./probe487.js');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const MARGIN = 2;                       /* 등재문이 적은 통과선 — 좌우 여백 ≥ 2px */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 한 사본을 통째로 굴린다 — extraCss 가 «되돌림» 축이다. */
async function sweep(p, extraCss) {
  await p.reload();
  await p.waitForTimeout(700);
  if (extraCss) await p.addStyleTag({ content: extraCss });
  const out = [];
  for (const [lv, got] of CASES) {
    await p.evaluate(RAISE(lv, got));
    await p.waitForTimeout(120);
    await p.evaluate(() => {
      const w = document.getElementById('collw');
      if (!w || !w.classList.contains('on')) {
        const o = document.querySelector('.side .ibtn[data-pop="coll"]'); if (o) o.click();
      }
    });
    await p.waitForTimeout(320);
    for (const [tn, sel] of TABS) {
      const opened = await p.evaluate((s) => {
        const e = document.querySelector(s); if (!e) return false; e.click(); return true;
      }, sel).catch(() => false);
      if (!opened) { out.push({ lv, got, tab: tn, miss: true }); continue; }
      await p.waitForTimeout(220);
      const rows = await p.evaluate(MEASURE);
      const seen = new Set();
      for (const r of rows) {
        if (seen.has(r.txt)) continue; seen.add(r.txt);
        out.push({ lv, got, tab: tn, ...r });
      }
    }
  }
  return out;
}

const worstOf = (rows) => rows.reduce((m, r) => (r.miss ? m : Math.min(m, r.l, r.rr)), 1e9);
const label = (r) => 'Lv' + r.lv + '/단계' + r.got + ' ' + r.tab + ' «' + r.txt + '»';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(300);

  /* ── [A] 전제 ─────────────────────────────────────────────────────────── */
  console.log('[A] 전제 — 6탭이 열리고 카드 라벨을 실제로 그린다');
  const base = await sweep(p, null);
  const miss = base.filter(r => r.miss);
  ok(miss.length === 0, 'A1 도감 6탭 문이 전부 살아 있다',
    miss.length ? miss.map(r => r.tab).join(' · ') : TABS.map(t => t[0]).join(' · '));
  const rows = base.filter(r => !r.miss);
  ok(rows.length >= CASES.length * TABS.length, 'A2 표본 ' + rows.length + '건 (기대 '
    + CASES.length * TABS.length + '건 이상)',
    '0 이면 아래 초록은 «아무것도 안 본» 초록이다');
  ok(rows.every(r => r.ov === 'hidden'), 'A3 `.cd` 는 여전히 `overflow:hidden` 이다',
    '넘친 글자는 실제로 안 그려진다 — 등재문 «푸는 길은 막혀 있다»');
  const longest = rows.filter(r => r.txt === 'Lv. 100/10');
  ok(longest.length === TABS.length, 'A4 최장 문자열 «Lv. 100/10» 이 6탭 전부에 실제로 그려진다',
    longest.length + '/' + TABS.length + ' (req = 받은 단계 + 1 이라 단계 9 에서 두 자리가 된다)');

  /* ── [B] 본체 ─────────────────────────────────────────────────────────── */
  console.log('\n[B] 본체 — 잉크가 카드 클라이언트 박스 안(좌우 여백 ≥ ' + MARGIN + 'px)');
  for (const [lv, got] of CASES) {
    const g = rows.filter(r => r.lv === lv && r.got === got);
    const bad = g.filter(r => Math.min(r.l, r.rr) < MARGIN);
    const w = g.reduce((m, r) => Math.min(m, r.l, r.rr), 1e9);
    ok(bad.length === 0, 'B Lv' + lv + '/단계' + got + ' «' + (g[0] || {}).txt + '» 6탭 전부 안쪽',
      '최소 여백 ' + (w === 1e9 ? '?' : w.toFixed(1)) + 'px'
      + (bad.length ? ' · 잘림 ' + bad.length + '건: ' + bad.slice(0, 3).map(label).join(' · ') : ''));
  }
  ok(worstOf(rows) >= MARGIN, 'B0 전 표본 최소 여백 ≥ ' + MARGIN + 'px',
    worstOf(rows).toFixed(1) + 'px · 표본 ' + rows.length + '건');

  /* ── [C] 레퍼런스 불변 ────────────────────────────────────────────────── */
  console.log('\n[C] 레퍼런스 불변 — 짧은 문자열은 한 픽셀도 안 움직인다');
  /* 측정표 21 ref 라벨 = 잉크 85×20. 11회차가 fs 26 · scaleX 1.05 로 맞춰 둔 값이 이것이다. */
  const REF = { 'Lv. 1/1': 83.4, 'Lv. 10/1': 100.2 };
  for (const k of Object.keys(REF)) {
    const g = rows.filter(r => r.txt === k);
    const off = g.map(r => Math.abs(r.w - REF[k])).reduce((a, b) => Math.max(a, b), 0);
    ok(g.length > 0 && off <= 0.6, 'C «' + k + '» 잉크폭 ' + REF[k] + 'px 유지',
      g.length ? '실측 ' + g[0].w + 'px (Δ' + off.toFixed(1) + ') · 표본 ' + g.length + '건'
               : '표본 0건');
  }
  const fitted = await p.evaluate(() => {
    const a = [...document.querySelectorAll('#collList .clb .cd > i.cl2')];
    return { n: a.length, inline: a.filter(e => e.style.fontSize).length };
  });
  ok(fitted.n > 0, 'C0 지금 화면에 라벨이 있다', fitted.n + '개');

  /* ── [D] 등재문 처방 ⓐ 기각 ───────────────────────────────────────────── */
  console.log('\n[D] 등재문 처방 ⓐ(fs 26 → 24) 는 최장 문자열을 못 닫는다');
  {
    const r24 = await sweep(p, '.clb .cd>i.cl2{font-size:24px!important}');
    const long = r24.filter(r => !r.miss && r.txt === 'Lv. 100/10');
    const w = long.reduce((m, r) => Math.min(m, r.l, r.rr), 1e9);
    ok(long.length > 0 && w < 0, 'D1 fs 24 사본은 «Lv. 100/10» 에서 여전히 잘린다',
      '최소 여백 ' + (w === 1e9 ? '?' : w.toFixed(1)) + 'px · 잉크 '
      + (long[0] ? long[0].w : '?') + 'px vs 안쪽 111px');
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 이 자가 실제로 그 자리를 보고 있는가');
  {
    /* R1 — `!important` 는 fitNum 이 거는 인라인 fs 를 이긴다 = 수리를 통째로 되돌린 사본 */
    const rr = await sweep(p, '.clb .cd>i.cl2{font-size:26px!important}');
    const g = rr.filter(r => !r.miss);
    const w = g.reduce((m, r) => Math.min(m, r.l, r.rr), 1e9);
    const bad = g.filter(r => Math.min(r.l, r.rr) < 0);
    ok(bad.length > 0 && w <= -2.5, 'R1 fit 을 무력화하면 빨개진다',
      '잘림 ' + bad.length + '건 · 최소 여백 ' + (w === 1e9 ? '?' : w.toFixed(1))
      + 'px (0건이면 이 자는 아무것도 안 본다)');
    const three = g.filter(r => /Lv\. 100/.test(r.txt) && Math.min(r.l, r.rr) < 0);
    ok(three.length >= TABS.length, 'R1b 되돌린 사본의 잘림이 3자리 문자열에 있다',
      three.length + '건 — 등재문이 잰 자리(−2.9)와 같은 자리다');
  }
  {
    /* R2 — 카드를 좁히면(방이 줄면) 짧은 문자열까지 빨개진다: 자가 «여백» 을 세고 있다 */
    const rr = await sweep(p, '.clb .cd{width:70px!important}');
    const g = rr.filter(r => !r.miss);
    const w = g.reduce((m, r) => Math.min(m, r.l, r.rr), 1e9);
    ok(w < MARGIN, 'R2 카드를 70px 로 좁히면 빨개진다',
      '최소 여백 ' + (w === 1e9 ? '?' : w.toFixed(1)) + 'px'
      + ' (fit 바닥 FITMIN 0.55 아래로는 더 못 줄이므로 여기서 반드시 넘친다)');
  }

  /* ── [H] ──────────────────────────────────────────────────────────────── */
  console.log('');
  ok(errs.length === 0, 'H 페이지 에러 0', errs.length ? errs.slice(0, 2).join(' | ') : '');

  await browser.close();
  const n = pass + fail;
  console.log('\nVERIFY487 ' + pass + '/' + n + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
