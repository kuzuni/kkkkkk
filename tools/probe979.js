/* 작업 979 재현기 — 「오버슛 이징 × 정지점 3개」가 **선언한 상수를 못 지킨다**.

   ⚑ 894 가 센 축은 «이징이 만든 계단»(재가속·한 프레임 이동)이었다. 이 자의 축은 **다른 것**이다:
     `cubic-bezier(.34,1.56,.64,1)` 는 y 가 1 을 넘는(최대 **1.0978**) **오버슛** 곡선이고,
     CSS 는 timing-function 을 **구간마다 다시** 건다 ⇒ 정지점이 셋이면 그 오버슛이 **두 번** 돈다:
       ① 올라가는 구간이 **선언한 봉우리를 넘고**(선언 1.18 → 실효 1.2133)
       ② 내려오는 구간이 **정지값 밑으로 파고든다**(1.18 → 0.9824 = 정지보다 −1.76%).
     «커졌다 돌아온다» 가 «커졌다 → 정지보다 작아졌다 → 돌아온다» 로 끝난다.

   ⚠ 이것은 «계단» 자로는 안 잡힌다 — 894 의 [v] 축은 **속도**를 재지 값의 **초과**를 안 잰다.
     그래서 자를 새로 세운다: **선언 상수 ↔ 실효 극값의 항등**.

   실행: node tools/probe979.js  [--all]   (--all = 제품 전 `@keyframes` 스윕)
*/
const fs = require('fs');
const path = require('path');
const P894 = require('./probe894');
const { SRC, blockOf, declOf, stopsOf, chanStops, CH, valueAt, traceOf, speedMetric, easingOf } = P894;

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const STEP = 0.05;                       /* ms — 실효 극값 표본 간격 */

/* ── 축: 한 채널의 «선언 상수 ↔ 실효 극값» ───────────────────────────────── */
/* 되돌아오는 곡선(마지막 값 = 정지값)에서
     · 선언 봉우리 = 키프레임에 **적힌** 최대값
     · 실효 봉우리 = 구간별 이징을 지켜 푼 값의 최대
     · 정지 뒤 최소 = 봉우리 시각 이후의 최소값 (정지값보다 작으면 «파고든다») */
function peakAudit(cs, timing, durMs) {
  const declMax = Math.max(...cs.map((c) => c.v));
  const rest = cs[cs.length - 1].v;
  let effMax = -Infinity, effAt = 0;
  const tr = [];
  for (let t = 0; t <= durMs + 1e-9; t += STEP) {
    const v = valueAt(cs, timing, durMs, t);
    tr.push([t, v]);
    if (v > effMax) { effMax = v; effAt = t; }
  }
  let minAfter = Infinity, minAt = 0;
  for (const [t, v] of tr) if (t > effAt && v < minAfter) { minAfter = v; minAt = t; }
  if (!isFinite(minAfter)) { minAfter = rest; minAt = durMs; }
  const declAt = (cs.find((c) => c.v === declMax) || { p: 0 }).p * durMs;
  return { declMax, declAt, effMax, effAt, rest, minAfter, minAt,
           over: effMax - declMax, under: rest - minAfter };
}

/* 되돌아오는 «팝» 인가 — 값이 올라갔다가 마지막에 정지값으로 돌아오는 채널 */
function isPop(cs) {
  if (cs.length < 3) return false;
  const rest = cs[cs.length - 1].v;
  const mx = Math.max(...cs.map((c) => c.v));
  const iMax = cs.findIndex((c) => c.v === mx);
  return mx > rest && iMax > 0 && iMax < cs.length - 1;
}

function audit(name, quiet) {
  const body = blockOf(name), dec = declOf(name);
  if (!body || !dec || !dec.durMs) return null;
  const stops = stopsOf(body);
  const cs = chanStops(stops, CH.scale);
  if (!isPop(cs)) return null;
  const a = peakAudit(cs, dec.timing, dec.durMs);
  /* ⚑ 894 교훈 3 — «이징이 **자기 몫으로** 만든 것» 만 센다.
     같은 키프레임 값을 linear 로 굴린 것과 나눠야 «선언된 딥»(fxPunch·fxHandTap)과
     «이징이 만든 파고듦»(오버슛)이 갈린다. 안 가르면 설계와 결함이 한 표에 나란히 빨갛다. */
  const aL = peakAudit(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs);
  a.declaredDip = aL.rest - aL.minAfter;      /* 값이 스스로 적은 딥 */
  a.easedOver = a.effMax - aL.effMax;         /* 이징 몫 초과 */
  a.easedUnder = aL.minAfter - a.minAfter;    /* 이징 몫 파고듦 */
  const perKf = stops.filter((s) => s.atf).length;
  const sp = speedMetric(traceOf(cs, dec.timing, dec.durMs));
  const spL = speedMetric(traceOf(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs));
  const out = { name, durMs: dec.durMs, timing: dec.timing, nStops: cs.length, perKf, ...a,
                reaccel: sp.reaccel, reaccelLin: spL.reaccel };
  if (!quiet) {
    console.log('\n── ' + name + '  (' + dec.durMs + 'ms · 약칭 `' + dec.timing + '` · scale 정지점 '
      + cs.length + (perKf ? ' · 키프레임 안 timing ' + perKf + '건' : '') + ')');
    console.log('   키프레임 값: ' + cs.map((c) => (c.p * 100).toFixed(0) + '% ' + c.v).join(' → '));
    console.log('   선언 봉우리 ' + a.declMax.toFixed(4) + ' @' + a.declAt.toFixed(1) + 'ms'
      + '   ↔ 실효 봉우리 **' + a.effMax.toFixed(4) + '** @' + a.effAt.toFixed(1) + 'ms'
      + '   (초과 ' + (a.over >= 0 ? '+' : '') + (a.over / a.declMax * 100).toFixed(2) + '%)');
    console.log('   정지값 ' + a.rest.toFixed(4) + '   ↔ 봉우리 뒤 최소 **' + a.minAfter.toFixed(4)
      + '** @' + a.minAt.toFixed(1) + 'ms   (' + (a.under > 0 ? '정지보다 −' + (a.under / a.rest * 100).toFixed(2) + '%' : '파고듦 없음') + ')');
    console.log('   [894 축] 재가속 ' + out.reaccel.toFixed(2) + '배 (같은 값·linear ' + out.reaccelLin.toFixed(2) + '배)');
  }
  return out;
}

/* ── 제품 전수: «오버슛 이징 × 되돌아오는 팝» 자리 ───────────────────────── */
function sweep() {
  const names = [...new Set([...SRC.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g)].map((m) => m[1]))];
  const rows = [];
  for (const nm of names) { const r = audit(nm, true); if (r) rows.push(r); }
  return rows;
}

module.exports = { peakAudit, isPop, audit, sweep, STEP };
if (require.main !== module) return;

console.log('=== probe979 — 「오버슛 이징 × 정지점 3개」 선언 ↔ 실효 ===');
console.log('  ⚑ 등재문의 수치를 옮겨 적지 않는다 — 제품에서 읽어 다시 푼다(338 규칙).');

const target = audit('fxCvSwapS');
if (!target) { console.log('  ! fxCvSwapS 를 못 읽었다'); process.exit(3); }

console.log('\n── 자매 스윕 — 같은 얼굴이 더 있는가 ─────────────────────────');
const rows = sweep();
console.log('  ⚑ «이징 몫» 만 결함이다 — 같은 값을 linear 로 굴린 것과 나눈다(894 교훈 3).');
console.log('  이름'.padEnd(16) + '정지점  약칭'.padEnd(34) + '선언→실효 봉우리      이징 몫 초과/파고듦');
const BAD = (r) => r.easedOver > 1e-4 || r.easedUnder > 1e-4;
for (const r of rows) {
  console.log('  ' + r.name.padEnd(16) + String(r.nStops).padStart(3) + '   '
    + ('`' + r.timing + '`').padEnd(32)
    + (r.declMax.toFixed(3) + ' → ' + r.effMax.toFixed(4)).padEnd(18)
    + '  +' + (r.easedOver / r.declMax * 100).toFixed(2) + '% / −' + (r.easedUnder / r.rest * 100).toFixed(2) + '%'
    + (BAD(r) ? '  ⚠' : '')
    + (r.declaredDip > 1e-6 ? '   (선언된 딥 ' + r.declaredDip.toFixed(3) + ')' : ''));
}
console.log('  합계 ' + rows.length + '건 · 그중 **이징이 선언을 못 지키는** 자리 '
  + rows.filter(BAD).length + '건 — ' + rows.filter(BAD).map((r) => r.name).join(' · '));

/* ── 실물 대조 — 산수가 브라우저와 같은가 ─────────────────────────────── */
(async () => {
  const { pw, launch } = require('./pwlaunch');
  const { chromium } = pw();
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + FILE);
  await p.waitForTimeout(900);

  /* 제품의 그 선언 그대로 — 시험용 노드에 `.sk-clv.fx-cvswap` 를 입힌다 */
  const real = await p.evaluate((ts) => {
    const host = document.createElement('div');
    host.className = 'sk-card';
    host.style.cssText = 'position:absolute;left:0;top:0;width:200px;height:200px;visibility:hidden';
    const el = document.createElement('div');
    el.className = 'sk-clv fx-cvswap';
    el.textContent = 'Lv. 12';
    host.appendChild(el); document.body.appendChild(host);
    const an = el.getAnimations().find((a) => (a.animationName || (a.effect && a.effect.getKeyframes && 'x')) && String(a.animationName || '') === 'fxCvSwapS')
            || el.getAnimations()[0];
    if (!an) return null;
    an.pause();
    const out = [];
    for (const t of ts) {
      an.currentTime = t;
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      out.push([t, m.a]);
    }
    const names = el.getAnimations().map((a) => String(a.animationName || ''));
    host.remove();
    return { out, names };
  }, [0, 40, 80, 107, 120, 160, 187, 200, 240, 274.5, 300, 340]);

  if (!real) { console.log('\n  ! 실물 애니를 못 잡았다'); await b.close(); process.exit(3); }
  console.log('\n── 실물 대조(`Animation.currentTime` + `getComputedStyle`) ────────');
  console.log('   붙은 애니: ' + real.names.join(' · '));
  const body = blockOf('fxCvSwapS'), dec = declOf('fxCvSwapS');
  const cs = chanStops(stopsOf(body), CH.scale);
  let worst = 0;
  for (const [t, s] of real.out) {
    const m = valueAt(cs, dec.timing, dec.durMs, t);
    worst = Math.max(worst, Math.abs(m - s));
    console.log('   t=' + String(t).padStart(6) + 'ms   실물 ' + s.toFixed(5) + '   산수 ' + m.toFixed(5)
      + '   Δ' + Math.abs(m - s).toFixed(5));
  }
  console.log('   ⇒ 최대 오차 ' + worst.toFixed(5) + (worst <= 0.001 ? '  (산수 = 렌더)' : '  ⚠ 산수가 렌더와 다르다'));

  /* ── 840 ③ 여백 재검산 — 실효 봉우리에서 «Lv. n» 이 [+] 뱃지를 밟는가 ── */
  const geo = await p.evaluate(() => {
    try {
      if (typeof window.step === 'function') window.step = () => {};
      S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
      S.avatars = S.avatars || {};
      for (const a of AVATARS) S.avatars[a.id] = 1;
      S.avatar = AVATARS[0].id;
      S.cosLv = S.cosLv || {};
      for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
      goTab('hero'); heroSubGo('cos');
      uiDirty = true; if (typeof renderUI === 'function') renderUI();
    } catch (e) { return { err: String(e) }; }
    const card = [...document.querySelectorAll('#bCos .sk-card')].find((c) => c.querySelector('.sk-eq') && c.querySelector('.sk-clv'));
    if (!card) return { err: '표본 카드 없음' };
    const R = (n) => { const q = n.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
    return { card: R(card), eq: R(card.querySelector('.sk-eq')), lv: R(card.querySelector('.sk-clv')) };
  });
  if (geo.err) console.log('\n  ! 기하 표본 실패: ' + geo.err);
  else {
    const cx = geo.lv.x + geo.lv.w / 2;
    const at = (s) => cx - geo.lv.w * s / 2 - geo.card.x;      /* 카드 기준 좌단 */
    const eqR = geo.eq.x + geo.eq.w - geo.card.x;
    console.log('\n── 840 ③ 여백 재검산(변환 원점 = 상자 중심) ──────────────────');
    console.log('   «Lv. n» 상자 카드기준 ' + (geo.lv.x - geo.card.x).toFixed(1) + '..'
      + (geo.lv.x + geo.lv.w - geo.card.x).toFixed(1) + ' (w ' + geo.lv.w.toFixed(2) + ')'
      + '   ·  [+] 뱃지 우변 카드+' + eqR.toFixed(1));
    for (const s of [1, target.declMax, target.effMax]) {
      const L = at(s);
      console.log('   scale ' + s.toFixed(4) + ' → 좌단 카드+' + L.toFixed(2)
        + '   여백 ' + (L - eqR).toFixed(2) + 'px' + (L - eqR < 0 ? '  ⚠ 뱃지를 밟는다' : ''));
    }
  }
  await b.close();
})().catch((e) => { console.error(String(e)); process.exit(3); });
