/* 작업 983 재현기 — 979 와 **같은 기계**를 나머지 셋(`fxCvSwap`·`fxPop`·`fxHit`)에서 다시 판다.
 *
 *   `cubic-bezier(.34,1.56,.64,1)` 는 y 가 1 을 넘는(최대 1.0978) **오버슛** 곡선이고
 *   CSS 는 timing-function 을 **구간마다 다시** 건다 ⇒ 정지점이 셋이면 그 오버슛이 두 번 돈다:
 *     ① 올라가는 구간이 **선언한 봉우리를 넘고**  ② 내려오는 구간이 **정지값을 파고든다**.
 *
 *   ⚑ 이 자는 **양쪽을 다 판다** — 지금 판(`linear`)과, 토큰만 옛 곡선으로 되돌린 사본.
 *     수리가 끝난 뒤에도 «수리 전이 정말 그랬는가» 를 다시 물을 수 있어야 하기 때문이다(338).
 *
 *   ⚠ 894 «재가속» 축은 이 셋에서 **문턱으로 못 쓴다**(979 가 fxCvSwapS 에서 쓴 ≤3.0).
 *     linear 로 갈아도 3.69·5.96·7.30 인데 **같은 값·linear 와 정확히 같다** = 이징 몫 0 이다.
 *     그 절대값은 «정지점이 셋인 팝» 이라는 **값의 성질**이지 이징의 죄가 아니다 ⇒
 *     이 자와 `verify983` 은 **이징 몫(비)** 으로 묻는다(894 교훈 3 의 같은 산수).
 *
 *   실행: node tools/probe983.js
 */
const fs = require('fs');
const path = require('path');
const P894 = require('./probe894');
const P979 = require('./probe979');
const { blockOf, declOf, stopsOf, chanStops, CH, valueAt, traceOf, speedMetric } = P894;

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const OLD_TIMING = 'cubic-bezier(.34,1.56,.64,1)';

/* 이 행의 스코프 셋 — 선언 한 줄과 그 키프레임 이름 (⚠ `fxToastIn` 은 894 §5-2 가 «등장 오버슛 =
   바운스 축» 으로 이미 판정한 자리라 **이 행이 아니다**) */
const TARGETS = [
  { kf: 'fxCvSwap', cls: 'fx-cvswap', now: '.fx-cvswap{animation:fxCvSwap .34s linear both}',
    old: '.fx-cvswap{animation:fxCvSwap .34s ' + OLD_TIMING + ' both}' },
  { kf: 'fxPop', cls: 'fx-pop', now: '.fx-pop{animation:fxPop .34s linear both}',
    old: '.fx-pop{animation:fxPop .34s ' + OLD_TIMING + ' both}' },
  { kf: 'fxHit', cls: 'fx-hit', now: '.fx-hit{animation:fxHit .26s linear both}',
    old: '.fx-hit{animation:fxHit .26s ' + OLD_TIMING + ' both}' },
];

/* 한 부품의 «선언 ↔ 실효» — timing 을 갈아 끼운 가정도 같이 푼다 */
function auditWith(kf, timing) {
  const body = blockOf(kf), dec = declOf(kf);
  if (!body || !dec || !dec.durMs) return null;
  const cs = chanStops(stopsOf(body), CH.scale);
  const a = P979.peakAudit(cs, timing || dec.timing, dec.durMs);
  const aL = P979.peakAudit(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs);
  a.easedOver = a.effMax - aL.effMax;
  a.easedUnder = aL.minAfter - a.minAfter;
  a.durMs = dec.durMs;
  a.timing = timing || dec.timing;
  a.declTiming = dec.timing;
  a.nStops = cs.length;
  a.perKf = stopsOf(body).filter((s) => s.atf).length;
  a.cs = cs;
  const sp = speedMetric(traceOf(cs, a.timing, dec.durMs));
  const spL = speedMetric(traceOf(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs));
  a.reaccel = sp.reaccel; a.reaccelLin = spL.reaccel;
  a.easeShare = spL.reaccel > 0 ? sp.reaccel / spL.reaccel : 0;   /* 894 교훈 3 — 이징 «몫» */
  return a;
}

/* 12 소환 결과 그리드에서 «좌단 카드가 그릇 클립을 얼마나 밟는가» — `.sm-grid{overflow-x:hidden}` */
const CLIP_SETUP = () => {
  if (typeof window.step === 'function') window.step = () => {};
  S.dia = 1e9;
  const res = [], seen = new Set();
  for (let i = 0; i < 4000 && res.length < 10; i++) {
    const r = summonOne('weapon');
    if (seen.has(r.it.id)) continue;
    seen.add(r.it.id); res.push(r);
  }
  showSummonResult('weapon', 10, res, false);
};
const CLIP_MEASURE = (times) => {
  const grid = document.querySelector('.sm-grid');
  const cards = [...document.querySelectorAll('.sm-c')];
  if (!grid || !cards.length) return { err: '소환 결과 그리드 없음' };
  const g = grid.getBoundingClientRect();
  /* 첫 행 좌단 칸 — ⚠ **레이아웃 좌표**(`offsetTop`/`offsetLeft`)로 고른다.
     `getBoundingClientRect()` 로 고르면 그 순간 팝이 걸린 칸이 (스케일 때문에) 위·왼쪽으로
     번져 «가장 위·가장 왼쪽» 을 가로챈다 — 첫 판이 그래서 6열 칸을 집었다. */
  const y0 = Math.min(...cards.map((c) => c.offsetTop));
  const first = cards.filter((c) => c.offsetTop <= y0 + 1)
                     .sort((a, b) => a.offsetLeft - b.offsetLeft)[0];
  first.classList.remove('fx-pop'); void first.offsetWidth; first.classList.add('fx-pop');
  const an = first.getAnimations().find((a) => String(a.animationName || '') === 'fxPop');
  if (!an) return { err: '팝 애니가 안 걸렸다' };
  an.pause();
  /* ⚠ 60 쥬시 스태거가 카드마다 `animation-delay` 를 준다 — `currentTime` 은 지연을 **포함**하므로
     그냥 t 를 넣으면 전부 «아직 시작 전»(scale 0) 이 찍힌다(첫 판이 그렇게 찍혔다). */
  const delay = an.effect.getComputedTiming().delay || 0;
  /* 폭은 레이아웃 값으로 읽는다 — `getBoundingClientRect()` 는 transform 이 곱해진 뒤라 scale 0 에서 0 이다 */
  const w0 = first.offsetWidth;
  const out = [];
  for (const t of times) {
    an.currentTime = delay + t;
    const m = new DOMMatrixReadOnly(getComputedStyle(first).transform);
    const r = first.getBoundingClientRect();
    out.push({ t, s: m.a, clip: +(g.left - r.left).toFixed(2) });
  }
  return { out, cardW: +w0.toFixed(2), gridLeft: +g.left.toFixed(1), delay: +delay.toFixed(1) };
};

module.exports = { TARGETS, auditWith, OLD_TIMING, CLIP_SETUP, CLIP_MEASURE };
if (require.main !== module) return;

console.log('=== probe983 — 「오버슛 이징 × 정지점 셋」 나머지 셋 (979 자매) ===');
console.log('  ⚑ 등재문의 수치를 옮겨 적지 않는다 — 제품에서 읽어 다시 푼다(338 규칙).\n');
console.log('  부품'.padEnd(12) + '수명   정지점  지금 약칭   선언 → 실효(지금)      되돌리면(옛 오버슛)      이징 몫 초과/파고듦');
for (const T of TARGETS) {
  const now = auditWith(T.kf, null);
  const old = auditWith(T.kf, OLD_TIMING);
  if (!now || !old) { console.log('  ! ' + T.kf + ' 를 못 읽었다'); continue; }
  console.log('  ' + T.kf.padEnd(12) + String(now.durMs).padStart(4) + 'ms' + String(now.nStops).padStart(6)
    + '   ' + now.declTiming.padEnd(10)
    + ' ' + (now.declMax.toFixed(3) + ' → ' + now.effMax.toFixed(4)).padEnd(20)
    + '  ' + (old.declMax.toFixed(3) + ' → ' + old.effMax.toFixed(4) + ' / ' + old.minAfter.toFixed(4)).padEnd(24)
    + '  +' + (old.easedOver / old.declMax * 100).toFixed(2) + '% / −' + (old.easedUnder / old.rest * 100).toFixed(2) + '%');
  console.log('       지금: 봉우리 ' + now.effMax.toFixed(4) + ' @' + now.effAt.toFixed(1) + 'ms (선언 ' + now.declMax.toFixed(4)
    + ' @' + now.declAt.toFixed(1) + 'ms) · 봉우리 뒤 최소 ' + now.minAfter.toFixed(4)
    + ' · 재가속 ' + now.reaccel.toFixed(2) + '배(같은 값·linear ' + now.reaccelLin.toFixed(2) + '배 ⇒ 이징 몫 ×' + now.easeShare.toFixed(2) + ')');
  console.log('       되돌리면: 봉우리 ' + old.effMax.toFixed(4) + ' @' + old.effAt.toFixed(1) + 'ms · 최소 ' + old.minAfter.toFixed(4)
    + ' @' + old.minAt.toFixed(1) + 'ms · 재가속 ' + old.reaccel.toFixed(2) + '배(이징 몫 ×' + old.easeShare.toFixed(2) + ')');
}

/* ── 실물 ─────────────────────────────────────────────────────────────── */
(async () => {
  const { pw, launch } = require('./pwlaunch');
  const { chromium } = pw();
  const NEG = path.join(ROOT, '.p983-neg-' + process.pid + '.html');
  const html = fs.readFileSync(FILE, 'utf8');
  let neg = html;
  for (const T of TARGETS) neg = neg.replace(T.now, T.old);
  fs.writeFileSync(NEG, neg);

  async function boot(file) {
    const b = await launch(chromium);
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await p.goto('file://' + file);
    await p.waitForTimeout(1100);
    return { b, p };
  }

  /* ① 산수 ↔ 렌더 — 세 부품 전부 */
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
      for (const t of sp.times) {
        an.currentTime = t;
        rows.push([t, new DOMMatrixReadOnly(getComputedStyle(el).transform).a]);
      }
      out[sp.kf] = { rows };
      host.remove();
    }
    return out;
  };
  const specs = TARGETS.map((T) => {
    const a = auditWith(T.kf, null);
    const D = a.durMs;
    return { kf: T.kf, cls: T.cls, times: [0, D * 0.2, D * 0.315, D * 0.45, D * 0.55, D * 0.7, D * 0.81, D] };
  });

  for (const [label, file] of [['지금 판(linear)', FILE], ['되돌림 사본(옛 오버슛)', NEG]]) {
    const { b, p } = await boot(file);
    const got = await p.evaluate(SAMPLE, specs);
    console.log('\n── 실물 대조 — ' + label + ' (`Animation.currentTime` + `getComputedStyle`) ──');
    for (const T of TARGETS) {
      const a = auditWith(T.kf, file === NEG ? OLD_TIMING : null);
      const g = got[T.kf];
      if (!g || g.err) { console.log('   ' + T.kf + ' — ! ' + (g ? g.err : '표본 없음')); continue; }
      let worst = 0, mx = -Infinity, mxAt = 0, mn = Infinity;
      for (const [t, s] of g.rows) {
        worst = Math.max(worst, Math.abs(s - valueAt(a.cs, a.timing, a.durMs, t)));
        if (s > mx) { mx = s; mxAt = t; }
      }
      for (const [t, s] of g.rows) if (t > mxAt && s < mn) mn = s;
      console.log('   ' + T.kf.padEnd(10) + ' 표본 최대 오차 ' + worst.toFixed(5)
        + (worst <= 0.001 ? ' (산수 = 렌더)' : ' ⚠ 산수가 렌더와 다르다')
        + ' · 표본 최대 ' + mx.toFixed(4) + ' @' + mxAt.toFixed(1) + 'ms'
        + (isFinite(mn) ? ' · 그 뒤 최소 ' + mn.toFixed(4) : ''));
    }

    /* ② 12 소환 결과 — 좌단 카드가 `.sm-grid{overflow-x:hidden}` 을 얼마나 밟는가 */
    await p.evaluate(CLIP_SETUP);
    await p.waitForTimeout(500);
    const a = auditWith('fxPop', file === NEG ? OLD_TIMING : null);
    const clip = await p.evaluate(CLIP_MEASURE, [0, a.declAt, a.effAt, a.durMs]);
    if (clip.err) console.log('   ! 클립 표본 실패 — ' + clip.err);
    else {
      console.log('   12 소환 결과 좌단 칸(폭 ' + clip.cardW + ') — 그릇 `.sm-grid{overflow-x:hidden}` 클립량');
      for (const r of clip.out)
        console.log('     t=' + String(r.t.toFixed(1)).padStart(6) + 'ms  scale ' + r.s.toFixed(4)
          + '  클립 ' + r.clip.toFixed(2) + 'px   (산수 w(s−1)/2 = ' + (clip.cardW * (r.s - 1) / 2).toFixed(2) + ')');
    }
    await b.close();
  }
  try { fs.unlinkSync(NEG); } catch (e) {}
})().catch((e) => { console.error(String(e)); process.exit(3); });
