/* 작업 894 재현기 — «정지점 3개 이상 × 비선형 이징» 이 실제로 계단을 남기는가.

   ⚑ 등재문(890 §4 꼬리)이 8건을 세어 넘겼다. 그 목록은 `animation:` **약칭의**
     timing-function 하나를 전 구간에 걸어 계산한 값이다. CSS 는 그 위에
     **키프레임 안의 `animation-timing-function`** 을 얹는다 — 그 선언이 있는 구간은
     약칭이 아니라 **그 함수**로 굴러간다. 이 자는 그 우선순위를 지켜서 다시 잰다.
     (338 규칙 — 처방 전에 재현한다. 등재문의 수치를 그대로 옮기지 않는다.)

   ── 축이 둘이다(등재문 ⚠⚠ «문턱을 그대로 옮기지 마라») ─────────────────────
   [α] **알파 계단** — 면을 덮는 워시(890 의 축). 60fps 한 프레임에 opacity 가
       얼마나 떨어지는가. 890 문턱 0.15.
   [v] **속도 계단** — 움직이는 것(이동·크기)의 축. 알파와 눈금이 다르다.
       93 29회차가 쓴 자와 같다: 구간마다 이징이 다시 걸리면 «급출발 → 정지» 가
       반복돼 **한 애니 안에서 프레임 속도가 몇 배까지 흔들리는가**(재가속비)로 읽힌다.

   실행: node tools/probe894.js  [--all]   (--all 이면 제품의 전 `@keyframes` 스윕)
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'latin1');
const FRAME_MS = 1000 / 60;

/* ── 이징 ───────────────────────────────────────────────────────────────── */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t, fy = (t) => ((ay * t + by) * t + cy) * t;
  const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 24; i++) {
      const e = fx(t) - x; if (Math.abs(e) < 1e-10) break;
      const dd = dfx(t); if (Math.abs(dd) < 1e-10) break; t -= e / dd;
    }
    return fy(Math.min(1, Math.max(0, t)));
  };
}
const NAMED = {
  linear: null,
  ease: [.25, .1, .25, 1],
  'ease-out': [0, 0, .58, 1],
  'ease-in': [.42, 0, 1, 1],
  'ease-in-out': [.42, 0, .58, 1],
};
function easingOf(tok) {
  const t = String(tok || 'linear').trim();
  if (t === 'linear') return (x) => x;
  const m = t.match(/cubic-bezier\(([^)]*)\)/);
  if (m) { const n = m[1].split(',').map(Number); return bezier(n[0], n[1], n[2], n[3]); }
  if (NAMED[t]) return bezier(...NAMED[t]);
  if (/^steps?\(/.test(t)) return null;      /* 계단이 «의도» 인 자리 — 이 자의 축이 아니다 */
  return null;
}
const isLinear = (tok) => String(tok || '').trim() === 'linear';

/* ── 제품에서 읽어 온다(손 상수 0개 · 402 규약) ─────────────────────────── */
function blockOf(name) {
  const i = SRC.indexOf('@keyframes ' + name + '{');
  const j = i < 0 ? SRC.search(new RegExp('@keyframes\\s+' + name + '\\s*\\{')) : i;
  if (j < 0) return null;
  let k = SRC.indexOf('{', j), depth = 0, end = k;
  for (let p = k; p < SRC.length; p++) {
    if (SRC[p] === '{') depth++;
    else if (SRC[p] === '}') { depth--; if (depth === 0) { end = p; break; } }
  }
  return SRC.slice(k + 1, end);
}
/* `animation: <name> <dur>s <timing>` 약칭에서 길이·전역 이징을 읽는다 */
function declOf(name) {
  const re = new RegExp('animation:[^;}]*?\\b' + name + '\\s+(?:calc\\([^)]*\\)|[\\d.]+m?s)[^;}]*', 'g');
  const m = re.exec(SRC);
  if (!m) return null;
  const seg = m[0].slice(m[0].indexOf(name));
  const dur = seg.match(/([\d.]+)(ms|s)\b/);
  const tim = seg.match(/(cubic-bezier\([^)]*\)|linear|ease-in-out|ease-out|ease-in|ease|steps\([^)]*\))/);
  return {
    durMs: dur ? Number(dur[1]) * (dur[2] === 'ms' ? 1 : 1000) : null,
    timing: tim ? tim[1] : 'ease',        /* CSS 기본값 */
    raw: m[0].trim().slice(0, 120),
  };
}
/* 키프레임 정지점: [{ p, atf, decl }] — atf 는 «이 정지점에서 시작하는 구간» 의 이징 */
function stopsOf(body) {
  const out = [];
  const re = /([\d.]+%(?:\s*,\s*[\d.]+%)*)\s*\{([^}]*)\}/g;
  let m, guard = 0;
  while ((m = re.exec(body)) && guard++ < 200) {
    const decl = m[2];
    const atf = (decl.match(/animation-timing-function:\s*([^;}]+)/) || [])[1];
    for (const pc of m[1].split(',')) out.push({ p: parseFloat(pc) / 100, atf: atf ? atf.trim() : null, decl });
  }
  return out.sort((a, b) => a.p - b.p);
}
/* 채널 값 추출 — 선언이 없는 정지점은 «그 채널의 정지점이 아니다»(CSS 그대로) */
const CH = {
  opacity: (d) => { const m = d.match(/opacity:\s*([\d.]+)/); return m ? Number(m[1]) : null; },
  scale: (d) => {
    let m = d.match(/transform:[^;}]*?\bscale\(([\d.]+)\)/); if (m) return Number(m[1]);
    m = d.match(/(?:^|[;{\s])scale:\s*([\d.]+)/); return m ? Number(m[1]) : null;
  },
  move: (d) => {
    /* 경로 진행률 — fxSpark 처럼 `calc(var(--dx)*k)` 면 k, 아니면 px 값(세로 우선) */
    let m = d.match(/translate\(\s*calc\(var\(--dx\)\s*\*\s*([\d.]+)\)/); if (m) return Number(m[1]);
    m = d.match(/translate\(\s*var\(--dx\)/); if (m) return 1;
    m = d.match(/translate\(\s*-?[\d.]+%\s*,\s*(-?[\d.]+)px/); if (m) return Number(m[1]);
    m = d.match(/(?:^|[;{\s])translate:\s*-?[\d.]+p?x?\s+(-?[\d.]+)px/); if (m) return Number(m[1]);
    m = d.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/); if (m) return Number(m[2]);
    return null;
  },
};
function chanStops(stops, get) {
  const s = [];
  for (const st of stops) { const v = get(st.decl); if (v !== null) s.push({ p: st.p, v, atf: st.atf }); }
  return s;
}
/* 구간별 이징을 지켜 값(t) 을 푼다 — «구간 시작 정지점의 atf, 없으면 약칭» */
function valueAt(cs, globalTok, durMs, tMs) {
  const p = Math.min(1, Math.max(0, tMs / durMs));
  if (p <= cs[0].p) return cs[0].v;
  for (let i = 0; i < cs.length - 1; i++) {
    const a = cs[i], b = cs[i + 1];
    if (p >= a.p && p <= b.p) {
      const ease = easingOf(a.atf || globalTok) || ((x) => x);
      const q = (b.p - a.p) === 0 ? 0 : (p - a.p) / (b.p - a.p);
      return a.v + (b.v - a.v) * ease(q);
    }
  }
  return cs[cs.length - 1].v;
}
function traceOf(cs, globalTok, durMs, step = 0.1) {
  const tr = [];
  for (let t = 0; t <= durMs + 1e-9; t += step) tr.push(valueAt(cs, globalTok, durMs, t));
  return tr;
}
/* [α] 알파 축 — 한 프레임 최대 낙폭(890 과 같은 자) */
function alphaMetric(tr, step = 0.1) {
  const d = Math.round(FRAME_MS / step);
  let mx = 0, at = 0;
  for (let i = 0; i + d < tr.length; i++) { const v = tr[i] - tr[i + d]; if (v > mx) { mx = v; at = i * step; } }
  return { drop: mx, at };
}
/* [v] 속도 축 — 프레임 이동량의 «재가속비»(급출발 → 정지 → 급출발) */
function speedMetric(tr, step = 0.1) {
  const d = Math.round(FRAME_MS / step);
  const amp = Math.max(...tr) - Math.min(...tr);
  const sp = [];
  for (let i = 0; i + d < tr.length; i += d) sp.push(Math.abs(tr[i] - tr[i + d]));
  const mx = Math.max(...sp);
  if (!(mx > 0) || amp <= 0) return { frameMax: 0, reaccel: 1, amp };
  /* 재가속 = «느려졌다가 다시 빨라지는» 최대 배수. 봉우리 대비 2% 미만 프레임은 정지로 본다 */
  let re = 1;
  for (let i = 1; i + 1 < sp.length; i++) {
    if (sp[i] < mx * 0.02) continue;
    const prevMax = Math.max(...sp.slice(0, i));
    if (sp[i] > prevMax * 1.0000001) continue;          /* 아직 가속 중 */
    let dip = sp[i];
    for (let j = i + 1; j < sp.length; j++) { if (sp[j] > dip * 1.0000001) { re = Math.max(re, sp[j] / Math.max(dip, mx * 0.005)); break; } dip = Math.min(dip, sp[j]); }
  }
  return { frameMax: mx / amp, reaccel: re, amp };
}

function report(name, opt = {}) {
  const body = blockOf(name);
  if (!body) { console.log('  ! `@keyframes ' + name + '` 없음'); return null; }
  const dec = declOf(name);
  if (!dec || !dec.durMs) { console.log('  ! `animation:' + name + '` 선언을 못 읽었다'); return null; }
  const stops = stopsOf(body);
  const perKf = stops.filter((s) => s.atf).length;
  const eff = stops.map((s) => s.atf || dec.timing);
  /* «실효 이징» — 마지막 정지점(끝)은 구간을 안 여니 뺀다 */
  const effSeg = eff.slice(0, Math.max(1, stops.length - 1));
  const allLin = effSeg.every(isLinear);
  const out = { name, durMs: dec.durMs, timing: dec.timing, nStops: stops.length, perKf, allLin, ch: {} };
  console.log('\n── ' + name + '  (' + dec.durMs + 'ms · 약칭 `' + dec.timing + '` · 정지점 '
    + stops.length + ' · 키프레임 안 timing 선언 ' + perKf + '건)');
  console.log('   실효 구간 이징: ' + effSeg.map((t, i) => (stops[i].p * 100).toFixed(2).replace(/\.00$/, '') + '%→`' + t + '`').join(' · '));
  if (allLin) console.log('   ⇒ **실효 전 구간 linear** — 약칭만 읽으면 비선형으로 보이지만 굴러가는 것은 linear 다');
  for (const [key, get] of Object.entries(CH)) {
    const cs = chanStops(stops, get);
    if (cs.length < 2) continue;
    const tr = traceOf(cs, dec.timing, dec.durMs);
    const trLin = traceOf(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs);
    if (key === 'opacity') {
      const a = alphaMetric(tr), al = alphaMetric(trLin);
      out.ch[key] = { drop: a.drop, at: a.at, dropLin: al.drop, n: cs.length };
      console.log('   [α] opacity 정지점 ' + cs.length + ' — 한 프레임 최대 낙폭 Δ'
        + a.drop.toFixed(4) + ' @' + a.at.toFixed(0) + 'ms   (전 구간 linear 면 Δ' + al.drop.toFixed(4) + ')');
    } else {
      const s = speedMetric(tr), sl = speedMetric(trLin);
      out.ch[key] = { frameMax: s.frameMax, frameMaxLin: sl.frameMax, reaccel: s.reaccel, reaccelLin: sl.reaccel,
                      amp: s.amp, n: cs.length, share: s.frameMax / Math.max(sl.frameMax, 1e-9) };
      console.log('   [v] ' + key + ' 정지점 ' + cs.length + ' (진폭 ' + s.amp.toFixed(3) + ') — 프레임 최대 이동 '
        + (s.frameMax * 100).toFixed(1) + '%  (같은 값·linear ' + (sl.frameMax * 100).toFixed(1) + '% ⇒ 이징 몫 ×'
        + (s.frameMax / Math.max(sl.frameMax, 1e-9)).toFixed(2) + ')  · 재가속비 ' + s.reaccel.toFixed(2)
        + '배 (linear ' + sl.reaccel.toFixed(2) + '배)');
    }
  }
  return out;
}

const LIST = ['fxSpark', 'fxHandTap', 'fxPunch', 'fxPunch2', 'fxPay', 'fxToastIn', 'fxHandRing', 'jzSlam'];

/* 자(`verify894`)가 같은 산수를 두 번 적지 않게 내보낸다(402 «사본을 지운다») */
module.exports = { SRC, FRAME_MS, LIST, easingOf, isLinear, blockOf, declOf, stopsOf,
                   chanStops, CH, valueAt, traceOf, alphaMetric, speedMetric };
if (require.main !== module) return;

console.log('=== probe894 — «정지점 3개 이상 × 비선형 이징» 재현 ===');
console.log('  ⚑ 키프레임 안 `animation-timing-function` 이 약칭을 이긴다 — 그 우선순위를 지켜서 잰다.');
const res = LIST.map((n) => report(n)).filter(Boolean);

console.log('\n── 요약(등재문 8건 ↔ 실효) ──────────────────────────────────');
for (const r of res) {
  const tag = r.allLin ? '실효 linear — 계단 축 아님'
    : (r.ch.opacity ? 'α Δ' + r.ch.opacity.drop.toFixed(4) : '')
      + (r.ch.move ? ' · 이동 재가속 ' + r.ch.move.reaccel.toFixed(2) + '배' : '')
      + (r.ch.scale ? ' · 크기 재가속 ' + r.ch.scale.reaccel.toFixed(2) + '배' : '');
  console.log('  ' + r.name.padEnd(12) + ' 정지점 ' + String(r.nStops).padStart(2)
    + ' · 약칭 `' + r.timing + '`' + (r.perKf ? ' + 안쪽 ' + r.perKf + '건' : '') + '  → ' + tag);
}

/* ── --all: 제품 전 `@keyframes` 스윕 (같은 조합이 더 있는가) ─────────────── */
if (process.argv.includes('--all')) {
  console.log('\n── 전수 스윕 — 정지점 ≥3 × 실효 비선형 구간이 있는 `@keyframes` ────');
  const names = [...new Set([...SRC.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g)].map((m) => m[1]))];
  let n = 0;
  for (const nm of names) {
    const body = blockOf(nm), dec = declOf(nm);
    if (!body || !dec || !dec.durMs) continue;
    const stops = stopsOf(body);
    if (stops.length < 3) continue;
    const effSeg = stops.slice(0, stops.length - 1).map((s) => s.atf || dec.timing);
    if (effSeg.every(isLinear)) continue;
    n++;
    const cs = chanStops(stops, CH.opacity);
    let extra = '';
    if (cs.length >= 2) {
      const a = alphaMetric(traceOf(cs, dec.timing, dec.durMs));
      extra = ' · α 한 프레임 Δ' + a.drop.toFixed(4);
    }
    console.log('  ' + nm.padEnd(16) + ' 정지점 ' + String(stops.length).padStart(2)
      + ' · ' + String(dec.durMs).padStart(5) + 'ms · `' + dec.timing + '`' + extra);
  }
  console.log('  합계 ' + n + '건 (`@keyframes` 총 ' + names.length + ')');
}
