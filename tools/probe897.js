/* 작업 897 재현기 — `fxPunch2` 의 «한 프레임 최대 이동 90.4%» 는 어느 프레임인가.

   ── 등재문이 준 것 ────────────────────────────────────────────────────────
   894 §7 이 곁다리로 넘겼다: 「`fxPunch2` 의 한 프레임 최대 이동이 진폭의 **90.4%** —
   `.16s` 안에 «팝 22ms → 고원 70ms → 복귀 35ms → 안착 32ms» 라 **복귀가 두 프레임**이다.
   93 39회차가 형(`fxPunch`)에서 고친 «복귀가 한 프레임에 끝난다» 와 같은 얼굴인데
   그 처방을 동생이 못 받았다」.

   ⚑ 338 규칙 — **처방을 따르기 전에 재현한다.** 등재문의 수치를 그대로 옮기지 않는다.
     이 자는 등재문이 한 문장에 섞어 놓은 셋을 따로 묻는다:

   [P1] 그 **90.4% 가 어느 프레임인가** — 복귀인가, 팝인가.
        (프레임 격자는 애니 시작에 안 맞춰지므로 위상을 0.02ms 씩 쓸어 최악을 찾는다)
   [P2] 복귀 구간 **자신의** 한 프레임 최악은 얼마인가 — 등재문이 실제로 지목한 자리.
   [P3] ⚑⚑ 그 곡선이 **화면에 나오기는 하는가** — 클래스 `.fx-punch2` 가 실제로 붙는가.

   ── 이 자가 수리 뒤에도 도는 방법 ─────────────────────────────────────────
   897 의 처방은 «그 곡선을 삭제» 다. 그래서 [P1]·[P2]·[P3] 의 **재현 대상은 수리 전 트리**이고,
   ① 고정 SHA(`PRE`)에서 꺼내 보되(756 사다리 — 얕은 클론이면 알아서 판다)
   ② 못 꺼내면 **아래 `DEAD` 리터럴**(지운 원문 그대로)로 재현한다.
   둘 다 될 때는 **서로 대조**한다([P0]) — 리터럴이 원문과 어긋나면 그 자리가 먼저 빨개진다.
   [P4] 만 지금 제품을 본다(«정말 사라졌는가» — 자는 `verify897` 이 따로 있다).

   실행: node tools/probe897.js  [--no-browser]
*/
const path = require('path');
const P = require('./probe894.js');
const G = require('./gitrev756.js');

const NOBR = process.argv.includes('--no-browser');
const F = P.FRAME_MS;
let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

/* 897 착수 시점의 main(= 수리 전). 이 SHA 가 창 밖이면 756 사다리가 판다. */
const PRE = '750245c';

/* ── 지운 원문(리터럴 폴백) ────────────────────────────────────────────────
   ⚠ 손으로 옮겨 적은 값이 아니라 **삭제 직전의 index.html 에서 그대로 오려 온 것**이다.
     [P0] 이 매 실행 원문과 대조하므로, 어긋나면 여기가 아니라 저기가 진실이다. */
const DEAD = {
  css: '@keyframes fxPunch2{0%{transform:scale(1);outline:3px solid rgba(255,255,255,0)}\n'
     + '    14%{transform:scale(1.095);outline:4px solid rgba(255,255,255,.62)}\n'
     + '    58%{transform:scale(1.09);outline:4px solid rgba(255,255,255,.44)}\n'
     + '    80%{transform:scale(1.02);outline:3px solid rgba(255,255,255,.14)}\n'
     + '    100%{transform:scale(1);outline:3px solid rgba(255,255,255,0)}}\n'
     + '  .fx-punch2{animation:fxPunch2 .16s ease-out both}',
  /* 그 곡선을 걸던(=걸지 못하던) 세 줄 */
  js: ["const gap = soft ? FX3_PUNCH : 420;",
       "const cls = soft ? 'fx-punch2' : 'fx-punch';",
       "el.classList.remove('fx-punch'); el.classList.remove('fx-punch2');"],
};

/* ── 수리 전 트리 확보 ────────────────────────────────────────────────────── */
let preSrc = null, preWhy = '';
{
  const r = G.ensure(PRE);
  if (r.ok) {
    /* ⚠ `show()` 는 **버퍼**를 준다(`.out` 이 아니다 — 4.2MB 짜리라 문자열로 안 담는다).
       인코딩은 `probe894` 와 같은 latin1 이어야 바이트 오프셋이 어긋나지 않는다. */
    const s = G.show(PRE, 'index.html');
    if (s.ok && s.buf) preSrc = s.buf.toString('latin1');
    else preWhy = s.why || '`git show` 가 내용을 못 줬다';
  } else preWhy = (r.why || '') + (r.env ? ' (⏸ 환경 — 얕은 클론)' : '');
}

console.log('=== probe897 — `fxPunch2` 의 90.4% 는 어느 프레임인가 ===');
console.log('  수리 전 표본: ' + (preSrc ? '`' + PRE + '` 에서 꺼냈다(' + preSrc.length + '자)'
  : '못 꺼냈다 — 리터럴로 재현한다  [' + preWhy + ']'));

/* ── [P0] 리터럴 ↔ 원문 대조 ─────────────────────────────────────────────── */
console.log('\n[P0] 지운 원문과 리터럴이 같은가');
if (preSrc) {
  const cssOk = preSrc.includes(DEAD.css);
  const jsOk = DEAD.js.every((l) => preSrc.includes(l));
  ok(cssOk && jsOk,
     '[P0] ★ `' + PRE + '` 의 index.html 안에 지운 원문(CSS 12줄 + JS 3줄)이 **글자 그대로** 있다 — '
     + '아래 재현이 «내가 기억하는 곡선» 이 아니라 «있던 곡선» 을 잰다',
     'CSS ' + (cssOk ? 'OK' : '어긋남') + ' · JS ' + (jsOk ? 'OK' : '어긋남'));
} else {
  console.log('  ⏸ 보류(환경) — 수리 전 트리를 못 가져와 대조를 못 한다. **세지 않는다**(756 규약 ②)');
}

/* ── 지운 곡선을 «그 자리에 있던 대로» 푼다 ──────────────────────────────── */
const DEAD_SRC = preSrc || DEAD.css;
function parseFrom(src, name) {
  const i = src.search(new RegExp('@keyframes\\s+' + name + '\\s*\\{'));
  if (i < 0) return null;
  let k = src.indexOf('{', i), d = 0, end = k;
  for (let p = k; p < src.length; p++) { if (src[p] === '{') d++; else if (src[p] === '}') { d--; if (!d) { end = p; break; } } }
  const body = src.slice(k + 1, end);
  const m = new RegExp('animation:\\s*' + name + '\\s+([\\d.]+)(ms|s)\\s+([a-z-]+|cubic-bezier\\([^)]*\\))').exec(src);
  const stops = P.stopsOf(body);
  return { name, stops, cs: P.chanStops(stops, P.CH.scale),
           durMs: m ? Number(m[1]) * (m[2] === 'ms' ? 1 : 1000) : 160, timing: m ? m[3] : 'ease-out' };
}
function load(name) {                                   /* 지금 제품에서 */
  const body = P.blockOf(name), dec = P.declOf(name);
  if (!body || !dec || !dec.durMs) return null;
  const st = P.stopsOf(body);
  return { name, stops: st, cs: P.chanStops(st, P.CH.scale), durMs: dec.durMs, timing: dec.timing };
}
const val = (m, t) => P.valueAt(m.cs, m.timing, m.durMs, Math.max(0, Math.min(m.durMs, t)));
const ampOf = (m) => Math.max(...m.cs.map((c) => c.v)) - Math.min(...m.cs.map((c) => c.v));
/* 위상 스윕 — [t0,t1] 안에 **온전히 들어가는** 60fps 창 중 최대 이동 */
function worstIn(m, t0, t1, step = 0.02) {
  const amp = ampOf(m);
  let d = 0, at = 0;
  for (let s = t0; s + F <= t1 + 1e-9; s += step) {
    const v = Math.abs(val(m, s + F) - val(m, s));
    if (v > d) { d = v; at = s; }
  }
  return { pct: d / amp * 100, at };
}
function holdMs(m, thr, step = 0.02) {
  let a = null, b = null;
  for (let t = 0; t <= m.durMs; t += step) { const v = val(m, t); if (v >= thr) { if (a === null) a = t; b = t; } }
  return a === null ? 0 : b - a;
}
/* 실효 복귀 — 진폭의 95% 지점에서 5% 지점까지(93 39회차의 «복귀 101 → 202ms» 와 같은 뜻) */
function effReturnMs(m, step = 0.02) {
  const lo = Math.min(...m.cs.map((c) => c.v)), amp = ampOf(m);
  let hi = null, end = null, peakT = 0, peakV = -Infinity;
  for (let t = 0; t <= m.durMs; t += step) { const v = val(m, t); if (v > peakV) { peakV = v; peakT = t; } }
  for (let t = peakT; t <= m.durMs; t += step) {
    const f = (val(m, t) - lo) / amp;
    if (hi === null && f <= 0.95) hi = t;
    if (hi !== null && f <= 0.05) { end = t; break; }
  }
  return (hi !== null && end !== null) ? end - hi : null;
}

const dead = parseFrom(DEAD_SRC, 'fxPunch2');
const alive = load('fxPunch');
if (!dead || !alive) { console.log('  ! 표본을 못 읽었다'); process.exit(1); }

/* ── [P1] 90.4% 의 자리 ──────────────────────────────────────────────────── */
console.log('\n[P1] «한 프레임 최대 이동» 이 일어나는 프레임을 찾는다 (위상 스윕)');
const NAME = ['팝', '고원', '복귀', '안착'];
for (const m of [dead, alive]) {
  const w = worstIn(m, 0, m.durMs);
  const segs = [];
  for (let i = 0; i + 1 < m.cs.length; i++) segs.push({ a: m.cs[i].p * m.durMs, b: m.cs[i + 1].p * m.durMs, i });
  const seg = segs.find((s) => w.at >= s.a - 1e-9 && w.at < s.b) || segs[0];
  console.log('  ' + m.name.padEnd(9) + ' ' + m.durMs + 'ms · 진폭 ' + ampOf(m).toFixed(4)
    + ' · 구간 ' + segs.map((s, i) => (NAME[i] || '구간' + i) + ' ' + (s.b - s.a).toFixed(1) + 'ms').join(' → '));
  console.log('             최악 프레임 ' + w.pct.toFixed(1) + '%  @' + w.at.toFixed(1) + '→'
    + (w.at + F).toFixed(1) + 'ms  = **' + (NAME[seg.i] || '구간' + seg.i) + '** 구간');
}
const wd = worstIn(dead, 0, dead.durMs);
const popEnd = dead.cs[1].p * dead.durMs;
ok(Math.abs(wd.pct - 90.4) < 1.0, '[P1-a] 등재문의 «90.4%» 가 재현된다', wd.pct.toFixed(1) + '%');
ok(wd.at < popEnd,
   '[P1-b] ★ 그 프레임은 **복귀가 아니라 «팝»** 이다 — 0ms 에서 시작하는 첫 프레임이 진폭의 대부분을 먹는다',
   '@' + wd.at.toFixed(1) + 'ms < 팝 끝 ' + popEnd.toFixed(1) + 'ms');
const popFloor = Math.min(1, F / popEnd) * 100;
ok(popFloor > 70,
   '[P1-c] ★ 팝 구간(' + popEnd.toFixed(1) + 'ms)이 한 프레임(16.7ms)보다 겨우 길어서 **어떤 이징으로도** '
   + '이 축은 못 내린다 — 하한이 linear 의 ' + popFloor.toFixed(1) + '%',
   '내리려면 «고원 시작 14%» 를 옮겨야 하고 그 값은 93 3회차 것이다 ⇒ 등재문의 처방으로는 안 움직였을 축');

/* ── [P2] 복귀 구간 자신 ─────────────────────────────────────────────────── */
console.log('\n[P2] 등재문이 실제로 지목한 자리 — **복귀 구간 자신**의 한 프레임 최악');
const dDesc = worstIn(dead, dead.cs[2].p * dead.durMs, dead.durMs);
const aDesc = worstIn(alive, alive.cs[2].p * alive.durMs, alive.durMs);
console.log('  fxPunch2(지운 것) 하강 최악 ' + dDesc.pct.toFixed(1) + '%  · 실효 복귀 '
  + effReturnMs(dead).toFixed(1) + 'ms (' + (effReturnMs(dead) / F).toFixed(2) + '프레임)');
console.log('  fxPunch (사는 것) 하강 최악 ' + aDesc.pct.toFixed(1) + '%  · 실효 복귀 '
  + effReturnMs(alive).toFixed(1) + 'ms (' + (effReturnMs(alive) / F).toFixed(2) + '프레임)  ← 93 39회차가 고친 형');
ok(dDesc.pct > aDesc.pct,
   '[P2-a] ★ 동생의 하강이 형보다 나쁘다 — 등재문의 «형만 처방을 받았다» 는 **참이었다**',
   dDesc.pct.toFixed(1) + '% > ' + aDesc.pct.toFixed(1) + '%');
ok((dead.cs[3].p - dead.cs[2].p) * dead.durMs < 2.2 * F,
   '[P2-b] «복귀가 두 프레임» — 복귀 구간 ' + ((dead.cs[3].p - dead.cs[2].p) * dead.durMs).toFixed(1) + 'ms = '
   + (((dead.cs[3].p - dead.cs[2].p) * dead.durMs) / F).toFixed(2) + '프레임');
console.log('  고원(≥1.085) ' + holdMs(dead, 1.085).toFixed(1) + 'ms   ← 93 3회차가 «14~58% = 70ms» 로 만든 창');

/* ── [P3] 그 곡선이 화면에 나오기는 했는가 — **수리 전 트리**에 대고 묻는다 ── */
console.log('\n[P3] 수리 전, `.fx-punch2` 가 실제로 붙기는 했는가');
if (preSrc) {
  const CODE = preSrc.replace(/\/\*[\s\S]*?\*\//g, '');
  const flat = CODE.replace(/\s/g, '');
  ok(flat.includes('if(soft)returnfxPzHit('),
     '[P3-a] ★ `fxPunch(el, soft)` 는 **soft 면 첫 줄에서 `fxPzHit` 으로 빠진다**(93 4회차) — '
     + '그 아래 `soft ? \'fx-punch2\' : \'fx-punch\'` 는 **닿을 수 없는 가지**였다');
  const refs = [...CODE.matchAll(/\bFX3_PUNCH\b/g)].length;
  ok(refs > 0 && !/(?:const|let|var)\s+FX3_PUNCH\b/.test(CODE),
     '[P3-b] ⚑⚑ 그 가지가 **선언된 적 없는 `FX3_PUNCH`** 를 읽고 있었다 — 살아 있었다면 첫 UI 발 도착에서 '
     + '`ReferenceError` 로 즉사했을 지뢰다(319 `bagUse is not defined` 와 같은 얼굴)',
     '선언 0건 · 참조 ' + refs + '건');
} else {
  console.log('  ⏸ 보류(환경) — 수리 전 트리가 없어 [P3-a]·[P3-b] 는 **세지 않는다**(756 규약 ②)');
}

/* ── [P4] 지금 제품 ──────────────────────────────────────────────────────── */
console.log('\n[P4] 지금 제품 — 그 곡선이 정말 사라졌는가(자는 `verify897`)');
const NOW = P.SRC.replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/@keyframes\s+fxPunch2\b/.test(NOW) && !/fx-punch2/.test(NOW) && !/\bFX3_PUNCH\b/.test(NOW),
   '[P4-a] ★ 제품(주석 제외)에 `fxPunch2`·`fx-punch2`·`FX3_PUNCH` 0건');
ok(/if\(soft\)\s*return\s+fxPzHit\(/.test(NOW),
   '[P4-b] 93 4회차의 조기 반환은 그대로다 — 897 은 «경로» 를 안 건드렸다');

(async () => {
  if (!NOBR) {
    console.log('\n[P4] 브라우저 실물 — UI 발 도착에 클래스가 한 번이라도 붙는가');
    const { pw, launch } = require('./pwlaunch');
    const { chromium } = pw();
    const b = await launch(chromium);
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await p.waitForTimeout(1500);
    const live = await p.evaluate(async () => {
      const out = { seen2: 0, seen1: 0 };
      const add0 = DOMTokenList.prototype.add;
      DOMTokenList.prototype.add = function (...a) {
        if (a.includes('fx-punch2')) out.seen2++;
        if (a.includes('fx-punch')) out.seen1++;
        return add0.apply(this, a);
      };
      const pill = document.querySelector('.cbox') || document.body;
      try { fxPunch(pill, true, true); } catch (e) { out.softErr = e.message; }
      out.softCls = pill.classList.contains('fx-punch2');
      try { fxPz.delete(pill); } catch (_) {}
      pill.style.transform = ''; pill.style.transformOrigin = '';
      try { fxPunch(pill, false, true); } catch (e) { out.hardErr = e.message; }
      out.hardCls = pill.classList.contains('fx-punch');
      DOMTokenList.prototype.add = add0;
      return out;
    });
    await b.close();
    console.log('  add(\'fx-punch2\') ' + live.seen2 + '회 · add(\'fx-punch\') ' + live.seen1 + '회'
      + (live.softErr ? ' · soft 예외 ' + live.softErr : '') + (live.hardErr ? ' · hard 예외 ' + live.hardErr : ''));
    ok(live.seen2 === 0 && live.softCls === false,
       '[P4-c] ★ **UI 발(soft) 도착에 `.fx-punch2` 가 한 번도 안 붙는다** — 지우기 전에도 이랬고 지금도 그렇다',
       'add 0회');
    ok(live.seen1 > 0 && live.hardCls === true,
       '[P4-d] 전투 발(`.fx-punch`)은 정상 부착 — 자가 «아무것도 안 붙는 것» 을 보고 있는 게 아니다',
       'add ' + live.seen1 + '회');
    ok(errs.length === 0, '[P4-e] 페이지 에러 0건', errs.slice(0, 2).join(' | '));
  }

  console.log('\n=== PROBE897 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
