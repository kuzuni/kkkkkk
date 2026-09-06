/* 게이트 983 — `fxCvSwap`·`fxPop`·`fxHit` 이 **선언한 상수를 지키는가**(979 의 자매 셋).
 *
 *   축은 979 와 같다 — 894 가 «이징이 만든 계단»(속도)을 쟀다면 이 자는 **값의 항등**을 잰다:
 *     [B1] 실효 봉우리 ≡ 키프레임에 적힌 봉우리   (오버슛 이징은 이것을 못 지킨다)
 *     [B2] 봉우리 뒤로 **정지값을 안 파고든다**   («커졌다 돌아온다» 가 «작아졌다» 로 안 끝난다)
 *
 *   ⚠⚠ **979 의 [B3](재가속 절대값 ≤3.0)은 여기서 못 쓴다 — 옮겨 적었으면 셋 다 빨갰다.**
 *     이 셋은 `linear` 로 갈아도 3.69·5.96·7.30 인데 **같은 값·linear 와 정확히 같다**(이징 몫 ×1.00).
 *     그 절대값은 «정지점이 셋인 팝» 이라는 **값의 성질**이지 이징의 죄가 아니다(894 교훈 3 의 산수
 *     — «이징이 자기 몫으로 만든 것» 만 센다). ⇒ [B3] 은 **비(ratio)** 로 묻는다.
 *
 *   ⚠ 값(.84/1.07/1 · 0/1.2/1 · 1/1.05/1)·수명·채움은 이 행의 소유가 아니다(58·93·12·683 계열).
 *     완화를 «진폭을 줄여서» 얻으면 [A1*] 이 빨개진다.
 *
 *   실행: node tools/verify983.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const P894 = require('./probe894');
const P979 = require('./probe979');
const P983 = require('./probe983');
const { blockOf, declOf, stopsOf, chanStops, CH, valueAt } = P894;

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v983-neg-' + process.pid + '.html');
const OLD_TIMING = P983.OLD_TIMING;
/* ⚠⚠ **979 의 허용치 0.01 을 그대로 옮기면 셋 중 가장 작은 판이 자를 빠져나간다.**
   `fxHit` 의 이징 몫 초과는 +0.0049(1.050 → 1.0549) 라 0.01 안에 통째로 숨는다 —
   즉 옛 곡선으로 되돌려도 [B1c]·[C1c] 가 **초록인 자**가 된다(첫 판이 실제로 그랬다: [R-d] 가
   «셋 다» 를 물었는데 fxHit 만 안 잡혀 빨개졌다). 산수 ↔ 렌더 오차가 0.00000 이고 표본이
   봉우리 시각을 정확히 밟으므로 허용치는 **부동소수 몫**이면 된다. */
const EPS_PEAK = 0.002;         /* 항등 허용치 — 선례(0.01)가 아니라 이 셋의 최소 진폭에서 정한다 */
const EPS_SHARE = 0.001;        /* 이징 «몫» — linear 와 같아야 한다(×1.00) */
/* 남아 있어도 되는 자리 — 894 §5-2 가 «등장 구간 오버슛 = 바운스 축» 으로 판정해 둔 하나뿐.
   ⚠ **늘리지 마라**(늘면 [B5] 가 빨개진다 = 새 오버슛이 다중 정지점 팝에 들어왔다는 뜻). */
const REMAIN = ['fxToastIn'];
/* 이 행의 셋 — 선언 값은 «지금 판» 이 아니라 **소유자가 정한 값**을 적어 둔다(줄이면 빨강) */
const SPEC = [
  { kf: 'fxCvSwap', cls: 'fx-cvswap', dur: 340, vals: [[0, 0.84], [55, 1.07], [100, 1]],
    decl: '.fx-cvswap{animation:fxCvSwap .34s linear both}',
    old:  '.fx-cvswap{animation:fxCvSwap .34s ' + OLD_TIMING + ' both}' },
  { kf: 'fxPop', cls: 'fx-pop', dur: 340, vals: [[0, 0], [55, 1.2], [100, 1]],
    decl: '.fx-pop{animation:fxPop .34s linear both}',
    old:  '.fx-pop{animation:fxPop .34s ' + OLD_TIMING + ' both}' },
  { kf: 'fxHit', cls: 'fx-hit', dur: 260, vals: [[0, 1], [34, 1.05], [100, 1]],
    decl: '.fx-hit{animation:fxHit .26s linear both}',
    old:  '.fx-hit{animation:fxHit .26s ' + OLD_TIMING + ' both}' },
];

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const html = fs.readFileSync(SRC, 'utf8');
const tag = (i) => 'abc'[i];

/* ── [A] 선언 ──────────────────────────────────────────────────────────── */
console.log('\n[A] 선언 — 값·수명·채움은 소유자 몫(Δ0), 갈린 것은 이징 한 토큰뿐이다');
let atfAll = 0;
SPEC.forEach((S, i) => {
  const body = blockOf(S.kf), dec = declOf(S.kf);
  const stops = body ? stopsOf(body) : [];
  const cs = body ? chanStops(stops, CH.scale) : [];
  const vals = cs.map((c) => [Math.round(c.p * 100), c.v]);
  atfAll += stops.filter((s) => s.atf).length;
  ok(JSON.stringify(vals) === JSON.stringify(S.vals),
     `[A1${tag(i)}] \`${S.kf}\` 키프레임 값 셋이 그대로다 — ${S.vals.map((v) => v[0] + '% ' + v[1]).join(' · ')} [${JSON.stringify(vals)}]`);
  ok(!!dec && Math.abs(dec.durMs - S.dur) < 0.5 && html.includes(S.decl),
     `[A2${tag(i)}] 수명 ${S.dur}ms · 채움 \`both\` 가 선언 한 줄에 그대로다 [${dec ? dec.durMs : '—'}ms]`);
  ok(!!dec && dec.timing === 'linear',
     `[A3${tag(i)}] ★ 약칭이 \`linear\` 다 — 오버슛(\`${OLD_TIMING}\`)이 아니다 [\`${dec ? dec.timing : '—'}\`]`);
});
ok(atfAll === 0,
   `[A4] 셋의 키프레임 «안» 에 \`animation-timing-function\` 사본이 0건이다 (${atfAll}건) — 남으면 그 구간만 옛 이징으로 되돌아간다(894 [A4])`);
const popOp = chanStops(stopsOf(blockOf('fxPop')), CH.opacity).map((c) => [Math.round(c.p * 100), c.v]);
ok(JSON.stringify(popOp) === JSON.stringify([[0, 0], [55, 1], [100, 1]]),
   `[A5] \`fxPop\` 의 opacity 채널은 한 글자도 안 건드렸다 — 0% 0 · 55% 1 · 100% 1 [${JSON.stringify(popOp)}]`);

/* ── [B] 성질 ──────────────────────────────────────────────────────────── */
console.log('\n[B] 성질 — 선언 ↔ 실효 항등 (이 행의 셋 전부)');
SPEC.forEach((S, i) => {
  const A = P983.auditWith(S.kf, null);
  ok(!!A && Math.abs(A.effMax - A.declMax) <= EPS_PEAK,
     `[B1${tag(i)}] ★ \`${S.kf}\` 실효 봉우리 ${A ? A.effMax.toFixed(4) : '—'} ≡ 선언 ${A ? A.declMax.toFixed(4) : '—'} (±${EPS_PEAK}) @${A ? A.effAt.toFixed(1) : '—'}ms`);
  ok(!!A && A.minAfter >= A.rest - 0.001,
     `[B2${tag(i)}] ★ \`${S.kf}\` 봉우리 뒤로 정지값(${A ? A.rest.toFixed(3) : '—'})을 안 파고든다 — 최소 ${A ? A.minAfter.toFixed(4) : '—'}`);
  ok(!!A && A.easeShare <= 1 + EPS_SHARE,
     `[B3${tag(i)}] \`${S.kf}\` 894 재가속의 **이징 몫** ×${A ? A.easeShare.toFixed(3) : '—'} ≤ 1.00 (절대값 ${A ? A.reaccel.toFixed(2) : '—'}배는 같은 값·linear ${A ? A.reaccelLin.toFixed(2) : '—'}배와 같다 = 값의 성질)`);
});
const bad = P979.sweep().filter((r) => r.easedOver > 1e-4 || r.easedUnder > 1e-4).map((r) => r.name).sort();
ok(SPEC.every((S) => !bad.includes(S.kf)),
   `[B4] 전수 스윕에서 이 행의 셋이 «선언을 못 지키는» 목록에 없다 [${bad.join(' · ') || '—'}]`);
ok(JSON.stringify(bad) === JSON.stringify([...REMAIN].sort()),
   `[B5] ★ 남은 자리는 894 §5-2 가 판정한 \`fxToastIn\` 하나뿐이다 — 늘면 여기가 먼저 빨개진다 [${bad.join(' · ') || '—'}]`);

/* ── 실물 ──────────────────────────────────────────────────────────────── */
const SAMPLE = (specs) => {
  const out = {};
  for (const sp of specs) {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;width:200px;height:200px;visibility:hidden';
    const el = document.createElement('div');
    el.className = sp.cls; el.textContent = 'x';
    host.appendChild(el); document.body.appendChild(host);
    const an = el.getAnimations().find((a) => String(a.animationName || '') === sp.kf);
    if (!an) { out[sp.kf] = { err: '애니 없음' }; host.remove(); continue; }
    an.pause();
    const rows = [];
    for (const t of sp.times) { an.currentTime = t; rows.push([t, new DOMMatrixReadOnly(getComputedStyle(el).transform).a]); }
    out[sp.kf] = { rows };
    host.remove();
  }
  return out;
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
  return { b, p, errs };
}
/* 표본 시각 — 각 부품의 «선언 봉우리 · 실효 봉우리 · 그 사이» 를 다 지나게 */
const timesFor = (kf, timing) => {
  const A = P983.auditWith(kf, timing);
  const D = A.durMs;
  return [...new Set([0, D * 0.2, A.effAt, D * 0.315, A.declAt, D * 0.7, D * 0.81, D].map((t) => +t.toFixed(2)))];
};

(async () => {
  const specsNow = SPEC.map((S) => ({ kf: S.kf, cls: S.cls, times: timesFor(S.kf, null) }));
  const now = await boot(SRC);
  const got = await now.p.evaluate(SAMPLE, specsNow);
  console.log('\n[C] 실물 — 산수 ↔ 렌더, 그리고 12 소환 결과 좌단 칸의 클립량');
  SPEC.forEach((S, i) => {
    const A = P983.auditWith(S.kf, null), g = got[S.kf];
    if (!g || g.err) { ok(false, `[C1${tag(i)}] \`${S.kf}\` 실물 표본 실패 — ${g ? g.err : '없음'}`); return; }
    let worst = 0, mx = -Infinity;
    for (const [t, s] of g.rows) { worst = Math.max(worst, Math.abs(s - valueAt(A.cs, A.timing, A.durMs, t))); mx = Math.max(mx, s); }
    ok(worst <= 0.001 && mx <= A.declMax + EPS_PEAK,
       `[C1${tag(i)}] \`${S.kf}\` 실물 scale 이 산수와 같고(최대 오차 ${worst.toFixed(5)}) 표본 최대 ${mx.toFixed(4)} 가 선언 ${A.declMax} 을 안 넘는다 (${g.rows.length}표본)`);
  });
  /* 12 소환 결과 — 좌단 칸이 `.sm-grid{overflow-x:hidden}` 을 밟는 양이 «선언한 진폭의 산수» 와 같은가 */
  await now.p.evaluate(P983.CLIP_SETUP);
  await now.p.waitForTimeout(500);
  const Apop = P983.auditWith('fxPop', null);
  const clip = await now.p.evaluate(P983.CLIP_MEASURE, [Apop.declAt, Apop.effAt, Apop.durMs]);
  if (clip.err) ok(false, `[C2] 12 소환 결과 클립 표본 실패 — ${clip.err}`);
  else {
    const peak = clip.out.reduce((a, r) => (r.s > a.s ? r : a));
    const math = clip.cardW * (Apop.declMax - 1) / 2;
    console.log(`    · 좌단 칸 폭 ${clip.cardW} · 그릇 좌변 ${clip.gridLeft} · 스태거 지연 ${clip.delay}ms · 실물 봉우리 ${peak.s.toFixed(4)} @${peak.t}ms`);
    ok(Math.abs(peak.clip - math) <= 0.5,
       `[C2] ★ 실물 봉우리에서 좌단 칸이 그릇을 밟는 양 ${peak.clip.toFixed(2)}px 이 **선언 진폭의 산수** w(s−1)/2 = ${math.toFixed(2)}px 과 같다 (±0.5)`);
    ok(clip.out.every((r) => r.clip <= math + 0.5),
       `[C3] 표본 전 구간에서 클립량이 ${math.toFixed(2)}px 을 안 넘는다 — 옛 오버슛은 여기서 ${(clip.cardW * (P983.auditWith('fxPop', OLD_TIMING).effMax - 1) / 2).toFixed(2)}px 이었다`);
  }
  ok(now.errs.length === 0, `[C4] 콘솔 에러 0건 (${now.errs.length})`);
  await now.b.close();

  /* ── [R] 되돌림 시험 — 토큰 셋만 옛 곡선으로 ─────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 약칭을 옛 오버슛으로 되돌리면 실제로 빨개지는가');
  let negSrc = html;
  for (const S of SPEC) negSrc = negSrc.replace(S.decl, S.old);
  ok(negSrc !== html && SPEC.every((S) => negSrc.includes(S.old)),
     '[R-a] 되돌림 사본을 만들었다(셋 다 토큰 하나씩만 갈아 끼운다)');
  fs.writeFileSync(NEG, negSrc);
  try {
    SPEC.forEach((S, i) => {
      const A = P983.auditWith(S.kf, OLD_TIMING);
      ok(A.effMax - A.declMax > 1e-4 && A.minAfter < A.rest - 1e-4,
         `[R-${tag(i)}1] 되돌리면 \`${S.kf}\` 봉우리 ${A.effMax.toFixed(4)} 가 선언(${A.declMax})을 +${((A.effMax - A.declMax) / A.declMax * 100).toFixed(2)}% 넘고 최소 ${A.minAfter.toFixed(4)} 로 정지값을 −${((A.rest - A.minAfter) / A.rest * 100).toFixed(2)}% 파고든다 ⇒ [B1${tag(i)}]·[B2${tag(i)}] 빨강`);
    });
    const neg = await boot(NEG);
    const ng = await neg.p.evaluate(SAMPLE, SPEC.map((S) => ({ kf: S.kf, cls: S.cls, times: timesFor(S.kf, OLD_TIMING) })));
    const over = SPEC.filter((S) => {
      const A = P983.auditWith(S.kf, OLD_TIMING), g = ng[S.kf];
      return g && !g.err && Math.max(...g.rows.map((r) => r[1])) > A.declMax + EPS_PEAK;
    }).map((S) => S.kf);
    ok(over.length === SPEC.length,
       `[R-d] 되돌림 사본은 **실물에서도** 셋 다 선언 봉우리를 넘는다 [${over.join(' · ') || '—'}] ⇒ [C1*] 빨강`);
    await neg.p.evaluate(P983.CLIP_SETUP);
    await neg.p.waitForTimeout(500);
    const An = P983.auditWith('fxPop', OLD_TIMING);
    const nc = await neg.p.evaluate(P983.CLIP_MEASURE, [An.declAt, An.effAt, An.durMs]);
    if (nc.err) ok(false, `[R-e] 되돌림 사본 클립 표본 실패 — ${nc.err}`);
    else {
      const np = nc.out.reduce((a, r) => (r.s > a.s ? r : a));
      const math = nc.cardW * (An.declMax - 1) / 2;
      ok(np.clip > math + 0.5,
         `[R-e] ★ 되돌림 사본은 실물에서 좌단 칸을 ${np.clip.toFixed(2)}px 밟는다 — 선언 진폭의 산수 ${math.toFixed(2)}px 보다 ${(np.clip - math).toFixed(2)}px(+${((np.clip / math - 1) * 100).toFixed(1)}%) 더 잘린다 ⇒ [C2]·[C3] 빨강`);
    }
    await neg.b.close();
  } finally { try { fs.unlinkSync(NEG); } catch (e) {} }

  console.log(`\nVERIFY983 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(String(e)); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
