/* 게이트 979 — `fxCvSwapS` 가 **선언한 상수를 지키는가**.
 *
 *   축이 894 와 다르다. 894 는 «이징이 만든 계단»(속도)을 쟀고, 이 자는 **값의 항등**을 잰다:
 *     [B1] 실효 봉우리 ≡ 키프레임에 적힌 봉우리      (오버슛 이징은 이것을 못 지킨다)
 *     [B2] 봉우리 뒤로 **정지값을 안 파고든다**      («커졌다 돌아온다» 가 «작아졌다» 로 안 끝난다)
 *   그리고 그 두 값에 걸려 있던 **840 [+] 뱃지 keep-out** 을 실효 봉우리로 다시 검산한다.
 *
 *   ⚠ 값(.84/1.18/1)·수명(340ms)·채움(`both`)은 **814 3회차 소유**다 — 이 자는 그것들이
 *     한 글자도 안 바뀌었는지부터 묻는다([A1]~[A2]). 완화를 «진폭을 줄여서» 얻으면 빨갛다.
 *
 *   실행: node tools/verify979.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const P894 = require('./probe894');
const P979 = require('./probe979');
const { blockOf, declOf, stopsOf, chanStops, CH, valueAt, traceOf, speedMetric } = P894;

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v979-neg-' + process.pid + '.html');
const OLD_TIMING = 'cubic-bezier(.34,1.56,.64,1)';
const NAME = 'fxCvSwapS';
const EPS_PEAK = 0.01;          /* 등재문이 준 항등 허용치 */
const REACCEL_MAX = 3.0;        /* 894 [B5] 와 같은 문턱 — 894 판 1.00~1.72, 옛 판 13.79 */
/* 자매 — 같은 오버슛 약칭 × 되돌아오는 팝. **줄이지 마라**(늘어나면 [B5] 가 빨개진다) */
const SIBLINGS = ['fxCvSwap', 'fxPop', 'fxHit', 'fxToastIn'];

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const html = fs.readFileSync(SRC, 'utf8');

/* ── [A] 선언 ──────────────────────────────────────────────────────────── */
console.log('\n[A] 선언 — 값·수명·채움은 814 소유(Δ0), 갈린 것은 이징 한 토큰뿐이다');
const body = blockOf(NAME), dec = declOf(NAME);
const stops = body ? stopsOf(body) : [];
const cs = body ? chanStops(stops, CH.scale) : [];
const vals = cs.map((c) => [Math.round(c.p * 100), c.v]);
ok(JSON.stringify(vals) === JSON.stringify([[0, 0.84], [55, 1.18], [100, 1]]),
   `[A1] 키프레임 값 셋이 814 3회차 그대로다 — 0% .84 · 55% 1.18 · 100% 1 [${JSON.stringify(vals)}]`);
const declLine = (html.match(/\.sk-clv\.fx-cvswap\{[^}]*\}/) || [''])[0];
ok(/animation:fxCvSwapS \.34s [^,]*both/.test(declLine) && /fxCvLit \.34s linear/.test(declLine),
   `[A2] 수명 .34s · 채움 \`both\` · 짝 \`fxCvLit .34s linear\` 가 한 선언 안에 그대로다`);
ok(dec && dec.timing === 'linear',
   `[A3] ★ 약칭이 \`linear\` 다 — 오버슛(\`${OLD_TIMING}\`)이 아니다 [\`${dec ? dec.timing : '—'}\`]`);
const perKf = stops.filter((s) => s.atf).length;
ok(perKf === 0,
   `[A4] 키프레임 «안» 에 \`animation-timing-function\` 사본이 0건이다 (${perKf}건) — 남으면 그 구간만 옛 이징으로 되돌아간다(894 [A4])`);
ok(/@keyframes fxCvLit\{0%\{color:#FFC02E\}30%\{color:#FFC02E\}100%\{color:var\(--clv-c\)\}\}/.test(html),
   `[A5] 색 채널 \`fxCvLit\` 은 한 글자도 안 건드렸다(814 3회차 30% 고원 그대로)`);

/* ── [B] 성질 ──────────────────────────────────────────────────────────── */
console.log('\n[B] 성질 — 선언 ↔ 실효 항등');
const A = P979.audit(NAME, true);
ok(!!A && Math.abs(A.effMax - A.declMax) <= EPS_PEAK,
   `[B1] ★ 실효 봉우리 ${A ? A.effMax.toFixed(4) : '—'} ≡ 선언 봉우리 ${A ? A.declMax.toFixed(4) : '—'} (±${EPS_PEAK}) @${A ? A.effAt.toFixed(1) : '—'}ms`);
ok(!!A && A.minAfter >= A.rest - 0.001,
   `[B2] ★ 봉우리 뒤로 정지값(${A ? A.rest.toFixed(3) : '—'})을 안 파고든다 — 최소 ${A ? A.minAfter.toFixed(4) : '—'} @${A ? A.minAt.toFixed(1) : '—'}ms`);
ok(!!A && A.reaccel <= REACCEL_MAX,
   `[B3] 894 재가속 축 ${A ? A.reaccel.toFixed(2) : '—'}배 ≤ ${REACCEL_MAX} (같은 값·linear ${A ? A.reaccelLin.toFixed(2) : '—'}배)`);
/* [B5] 전수 래칫 — 제품에서 «이징이 선언을 못 지키는» 자리를 다시 센다 */
const rows = P979.sweep();
const bad = rows.filter((r) => r.easedOver > 1e-4 || r.easedUnder > 1e-4).map((r) => r.name).sort();
ok(!bad.includes(NAME), `[B4] 전수 스윕에서 \`${NAME}\` 이 «못 지키는» 목록에 없다`);
ok(JSON.stringify(bad) === JSON.stringify([...SIBLINGS].sort()),
   `[B5] 남은 자리는 등재 980 의 그 넷뿐이다 — 늘면 여기가 먼저 빨개진다 [${bad.join(' · ')}]`);

/* ── 실물 ──────────────────────────────────────────────────────────────── */
const SETUP = () => {
  if (typeof window.step === 'function') window.step = () => {};
  S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
  S.avatars = S.avatars || {};
  for (const a of AVATARS) S.avatars[a.id] = 1;
  S.avatar = AVATARS[0].id;
  S.cosLv = S.cosLv || {};
  for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
  goTab('hero'); heroSubGo('cos');
  uiDirty = true; if (typeof renderUI === 'function') renderUI();
};
/* 카드 하나의 값 줄에 팝을 걸고 **애니를 세워** 그 시각의 상자를 잰다(974 — 재렌더로 풀리므로 pause) */
const MEASURE = (times) => {
  const card = [...document.querySelectorAll('#bCos .sk-card')]
    .find((c) => c.querySelector('.sk-eq') && c.querySelector('.sk-clv'));
  if (!card) return { err: '표본 카드 없음' };
  const lv = card.querySelector('.sk-clv'), eq = card.querySelector('.sk-eq');
  lv.classList.remove('fx-cvswap'); void lv.offsetWidth; lv.classList.add('fx-cvswap');
  const an = lv.getAnimations().find((a) => String(a.animationName || '') === 'fxCvSwapS');
  if (!an) return { err: '팝 애니가 안 걸렸다' };
  an.pause();
  const R = (n) => { const q = n.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const card0 = R(card), eq0 = R(eq);
  const out = [];
  for (const t of times) {
    an.currentTime = t;
    const m = new DOMMatrixReadOnly(getComputedStyle(lv).transform);
    const r = R(lv);
    out.push({ t, s: m.a, left: r.x - card0.x, right: r.x + r.w - card0.x });
  }
  return { out, eqRight: eq0.x + eq0.w - card0.x, cardW: card0.w };
};

async function boot(file) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + file);
  await p.waitForTimeout(1200);
  await p.evaluate(SETUP);
  await p.waitForTimeout(300);
  return { b, p, errs };
}

(async () => {
  const TIMES = [0, 80, 107.1, 160, 187, 240, 274.5, 340];
  const now = await boot(SRC);
  const m = await now.p.evaluate(MEASURE, TIMES);
  if (m.err) { ok(false, `[C0] 실물 표본 실패 — ${m.err}`); }
  else {
    console.log('\n[C] 실물 — 산수 ↔ 렌더, 그리고 840 [+] 뱃지 keep-out 재검산');
    let worst = 0;
    for (const r of m.out) worst = Math.max(worst, Math.abs(r.s - valueAt(cs, dec.timing, dec.durMs, r.t)));
    ok(worst <= 0.001, `[C1] 실물 scale 이 산수와 같다 — 최대 오차 ${worst.toFixed(5)} ≤ 0.001 (${TIMES.length}표본)`);
    const peak = m.out.reduce((a, r) => (r.s > a.s ? r : a));
    console.log(`    · [+] 뱃지 우변 카드+${m.eqRight.toFixed(1)} · 실물 봉우리 ${peak.s.toFixed(4)} @${peak.t}ms → «Lv. n» 좌단 카드+${peak.left.toFixed(2)}`);
    ok(peak.left >= m.eqRight,
       `[C2] ★ 실물 봉우리에서도 «Lv. n» 이 [+] 뱃지를 안 밟는다 — 여백 ${(peak.left - m.eqRight).toFixed(2)}px (840 «겹침 0» 을 실효로 재검산)`);
    const at160 = m.out.find((r) => r.t === 160);
    ok(at160 && at160.left - m.eqRight >= 1,
       `[C3] 14회차 2인 일치 지적 자리(160ms)에서 여백 ${at160 ? (at160.left - m.eqRight).toFixed(2) : '—'}px ≥ 1 (EE «6px → 0px» · EF «6px → 1px»)`);
    ok(now.errs.length === 0, `[C4] 콘솔 에러 0건 (${now.errs.length})`);
  }
  await now.b.close();

  /* ── [R] 되돌림 시험 — 토큰 하나만 옛 곡선으로 ───────────────────────── */
  console.log('\n[R] 되돌림 시험 — 약칭을 옛 오버슛으로 되돌리면 실제로 빨개지는가');
  const negSrc = html.replace('.sk-clv.fx-cvswap{animation:fxCvSwapS .34s linear both',
                              '.sk-clv.fx-cvswap{animation:fxCvSwapS .34s ' + OLD_TIMING + ' both');
  ok(negSrc !== html, '[R-a] 되돌림 사본을 만들었다(토큰 하나만 갈아 끼운다)');
  fs.writeFileSync(NEG, negSrc);
  try {
    const negCs = cs.map((c) => ({ ...c }));
    const negA = P979.peakAudit(negCs, OLD_TIMING, dec.durMs);
    ok(negA.effMax - negA.declMax > EPS_PEAK,
       `[R-b] 되돌리면 실효 봉우리가 ${negA.effMax.toFixed(4)} 로 선언(${negA.declMax})을 +${((negA.effMax - negA.declMax) / negA.declMax * 100).toFixed(2)}% 넘는다 ⇒ [B1] 빨강`);
    ok(negA.minAfter < negA.rest - 0.001,
       `[R-c] 되돌리면 봉우리 뒤 최소가 ${negA.minAfter.toFixed(4)} 로 정지값을 −${((negA.rest - negA.minAfter) / negA.rest * 100).toFixed(2)}% 파고든다 ⇒ [B2] 빨강`);
    const negSp = speedMetric(traceOf(negCs.map((c) => ({ ...c, atf: null })), OLD_TIMING, dec.durMs));
    ok(negSp.reaccel > REACCEL_MAX,
       `[R-d] 되돌리면 894 재가속도 ${negSp.reaccel.toFixed(2)}배 > ${REACCEL_MAX} ⇒ [B3] 빨강 (두 축이 같은 토큰에 물려 있다)`);
    const neg = await boot(NEG);
    const nm = await neg.p.evaluate(MEASURE, TIMES);
    if (nm.err) ok(false, `[R-e] 되돌림 사본 실물 표본 실패 — ${nm.err}`);
    else {
      const np = nm.out.reduce((a, r) => (r.s > a.s ? r : a));
      ok(np.left < nm.eqRight,
         `[R-e] ★ 되돌림 사본은 실물에서도 봉우리 ${np.s.toFixed(4)} @${np.t}ms 에 «Lv. n» 좌단 카드+${np.left.toFixed(2)} 로 [+] 뱃지(카드+${nm.eqRight.toFixed(1)})를 ${(nm.eqRight - np.left).toFixed(2)}px 밟는다 ⇒ [C2] 빨강`);
    }
    await neg.b.close();
  } finally { try { fs.unlinkSync(NEG); } catch (e) {} }

  console.log(`\nVERIFY979 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(String(e)); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
