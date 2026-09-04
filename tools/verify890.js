/* 작업 890 게이트 — 공용 `@keyframes fxFlash` 의 감쇠가 «한 프레임 절벽» 을 만들지 않는가.

   ── 이 자가 무엇을 묻는가 (328~330 「누른 항을 묻는 항」) ──
   토큰이 `linear` 인지를 **글자로** 묻지 않는다. 그러면 다음에 다른 이징이 들어와도 초록이거나,
   반대로 뜻이 같은 표기에 빨개진다. 묻는 것은 **성질**이다 —
     「60fps **한 프레임(16.67ms)** 안에서 opacity 가 떨어지는 최대 폭이 문턱 아래인가」.
   그 값은 제품 선언(키프레임 + timing-function)에서 **읽어 와** 푼다(손 상수 0개 · 402 규약).

   ⚠ **CSS 는 timing-function 을 구간마다 다시 건다** — 이것이 890 의 전부다.
     이즈아웃 하나가 다섯 구간에서 다섯 번 반복돼 «급락 → 정체» 를 5단으로 쌓았고,
     868 이 키프레임 «값» 을 아무리 고르게 펴도 그 계단은 안 없어졌다.

   ── 절(節) ──
   [A] 선언 불변항 — 키프레임 opacity·`FXFLASH_MS`·`FXFLASH_PEAK` 가 890 전과 같다
       (890 은 timing-function **한 토큰**만 건드린다 ⇒ `verify619` [F2] 가 그대로여야 한다)
   [B] 성질 — 한 프레임 최대 낙폭 · 감쇠율 고르기 · 노출(∫·≥0.5) · 봉우리
   [C] 실물 대조 — 브라우저가 굴리는 `getComputedStyle().opacity` 가 산수와 붙는가
   [R] **되돌림 시험(양방향)** — 옛 이징을 도로 끼운 사본은 [B] 가 빨개져야 한다.
       ⚠ 음성항이 «공허» 하지 않아야 한다(422 교훈) — 이 자가 절벽을 **볼 수는 있는지**를
         [R] 이 실제 값으로 못박는다.

   실행: node tools/verify890.js   (--no-browser 로 [C] 생략)
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'latin1');
const NOBR = process.argv.includes('--no-browser');

let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

/* ── 문턱 ─────────────────────────────────────────────────────────────────
   0.15 = 「지금 판(linear) 0.090」 과 「옛 판(cubic-bezier) 0.236」 의 사이.
   양쪽에서 각각 1.6배 이상 떨어져 있어 한쪽으로 무르지 않다.
   근거: 한 프레임에 진폭의 1/4 가까이(0.236) 사라지면 채점자 셋이 각자 절벽으로 읽었다
   (814 12회차 EC · 868 4인 · 890 등재문). 0.15 = 진폭의 15%. */
const FRAME_MS = 1000 / 60;
const MAX_FRAME_DROP = 0.15;
/* 감쇠율이 «한 애니 안에서» 몇 배까지 흔들려도 되는가. linear 13.4배 ↔ 옛 판 98,103배. */
const MAX_RATE_RATIO = 60;

function readDecl() {
  const a = SRC.match(/animation:\s*fxFlash\s+([\d.]+)s\s+([a-z-]+\([^)]*\)|[a-z-]+)/);
  if (!a) throw new Error('`animation:fxFlash …` 선언을 못 찾았다');
  const body = SRC.slice(SRC.indexOf('@keyframes fxFlash'));
  const seg = body.slice(0, body.indexOf('}}') + 2);
  const stops = []; const re = /(\d+)%\s*\{\s*opacity:\s*([\d.]+)/g;
  let m, guard = 0;
  while ((m = re.exec(seg)) && guard++ < 40) stops.push([Number(m[1]) / 100, Number(m[2])]);
  const sc = []; const re2 = /(\d+)%\s*\{[^}]*transform:\s*scale\(([\d.]+)\)/g;
  let m2; guard = 0;
  while ((m2 = re2.exec(seg)) && guard++ < 40) sc.push(Number(m2[2]));
  return { durMs: Number(a[1]) * 1000, timing: a[2], stops, scales: sc };
}
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t, fy = (t) => ((ay * t + by) * t + cy) * t;
  const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => { let t = x;
    for (let i = 0; i < 24; i++) { const e = fx(t) - x; if (Math.abs(e) < 1e-10) break;
      const d = dfx(t); if (Math.abs(d) < 1e-10) break; t -= e / d; }
    return fy(Math.min(1, Math.max(0, t))); };
}
function easingOf(tok) {
  if (tok === 'linear') return (x) => x;
  const m = tok.match(/cubic-bezier\(([^)]*)\)/);
  if (m) { const n = m[1].split(',').map(Number); return bezier(n[0], n[1], n[2], n[3]); }
  const T = { ease: [.25, .1, .25, 1], 'ease-out': [0, 0, .58, 1], 'ease-in': [.42, 0, 1, 1], 'ease-in-out': [.42, 0, .58, 1] };
  if (T[tok]) return bezier(...T[tok]);
  throw new Error('모르는 timing-function: ' + tok);
}
/* ⚑ 구간별 이징 — CSS 의 정의 그대로 */
function opacityAt(stops, ease, durMs, tMs) {
  const p = Math.min(1, Math.max(0, tMs / durMs));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, oa] = stops[i], [b, ob] = stops[i + 1];
    if (p >= a && p <= b) { const q = (b - a) === 0 ? 0 : (p - a) / (b - a); return oa + (ob - oa) * ease(q); }
  }
  return stops[stops.length - 1][1];
}
function metricsOf(stops, ease, durMs) {
  const STEP = 0.1, tr = [];
  for (let t = 0; t <= durMs + 1e-9; t += STEP) tr.push(opacityAt(stops, ease, durMs, t));
  const d = Math.round(FRAME_MS / STEP);
  let mx = 0, at = 0;
  for (let i = 0; i + d < tr.length; i++) { const v = tr[i] - tr[i + d]; if (v > mx) { mx = v; at = i * STEP; } }
  let rmin = Infinity, rmax = 0;
  for (let i = 0; i + 1 < tr.length; i++) {
    const r = (tr[i] - tr[i + 1]) / STEP;
    if (tr[i] > 0.02 && r > 1e-7) { rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
  }
  let integ = 0, exp5 = 0;
  for (let i = 0; i + 1 < tr.length; i++) { integ += (tr[i] + tr[i + 1]) / 2 * STEP; if (tr[i] >= 0.5) exp5 += STEP; }
  return { drop: mx, at, ratio: rmax / rmin, integ, exp5, peak: Math.max(...tr), tr };
}

(async () => {
  console.log('=== verify890 — fxFlash 감쇠의 「한 프레임 절벽」 ===');
  const d = readDecl();
  const ease = easingOf(d.timing);
  const m = metricsOf(d.stops, ease, d.durMs);

  console.log('\n[A] 선언 불변항 (890 은 timing-function 한 토큰만 건드린다)');
  console.log('    duration ' + d.durMs + 'ms · timing `' + d.timing + '`');
  console.log('    keyframes opacity ' + d.stops.map(([q, o]) => (q * 100) + '%:' + o).join(' · '));
  const wantStops = [[0, 1], [.22, .97], [.52, .8], [.74, .45], [.88, .22], [1, 0]];
  const sameStops = d.stops.length === wantStops.length
    && d.stops.every((s, i) => Math.abs(s[0] - wantStops[i][0]) < 1e-9 && Math.abs(s[1] - wantStops[i][1]) < 1e-9);
  ok(sameStops, '[A1] 키프레임 opacity 가 868 이 놓은 값 그대로다(890 은 값을 안 건드렸다)',
     d.stops.map(([q, o]) => (q * 100) + '%:' + o).join(' '));
  ok(/const FXFLASH_MS = 340\b/.test(SRC), '[A2] `FXFLASH_MS` 340 불변');
  ok(/const FXFLASH_PEAK = 1\.06\b/.test(SRC), '[A3] `FXFLASH_PEAK` 1.06 불변');
  ok(Math.abs(d.durMs - 340) < 1e-9, '[A4] CSS duration 이 `FXFLASH_MS` 와 같다', d.durMs + 'ms');
  ok(d.scales.length > 0 && Math.abs(Math.max(...d.scales) - 1.06) < 1e-9,
     '[A5] 키프레임 최대 scale 이 `FXFLASH_PEAK` 와 같다(`verify619` [F2] 규약)',
     '최대 ' + Math.max(...d.scales));

  console.log('\n[B] 성질 — 감쇠가 고른가 (문턱: 한 프레임 낙폭 ≤ ' + MAX_FRAME_DROP + ')');
  console.log('    한 프레임(16.67ms) 최대 낙폭 Δ' + m.drop.toFixed(4) + ' @' + m.at.toFixed(0) + 'ms');
  console.log('    감쇠율 최대/최소 ' + m.ratio.toFixed(1) + '배 · ∫opacity·dt ' + m.integ.toFixed(1)
            + 'ms · opacity≥0.5 ' + m.exp5.toFixed(1) + 'ms');
  ok(m.drop <= MAX_FRAME_DROP,
     '[B1] ★ 한 프레임에 진폭의 ' + (MAX_FRAME_DROP * 100) + '% 넘게 사라지지 않는다',
     'Δ' + m.drop.toFixed(4) + ' ≤ ' + MAX_FRAME_DROP);
  ok(m.ratio <= MAX_RATE_RATIO,
     '[B2] 감쇠율이 한 애니 안에서 ' + MAX_RATE_RATIO + '배 넘게 흔들리지 않는다',
     m.ratio.toFixed(1) + '배');
  ok(Math.abs(m.peak - 1) < 1e-9, '[B3] 봉우리 opacity 1.000 — 강조는 안 줄었다', m.peak.toFixed(3));
  /* 완화를 «봉우리를 깎아서» 얻지 않았음을 노출로 못박는다(무르게 푼 수리의 전형) */
  ok(m.integ >= 225 && m.exp5 >= 235,
     '[B4] 노출이 옛 판(∫211.0 · ≥0.5 204.8ms)보다 늘었다 — 깎아서 얻은 완화가 아니다',
     '∫' + m.integ.toFixed(1) + 'ms · ≥0.5 ' + m.exp5.toFixed(1) + 'ms');

  /* ── [R] 되돌림 시험(양방향) ─────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 옛 이징을 도로 끼운 사본');
  const OLD = 'cubic-bezier(.2,.8,.3,1)';
  const mo = metricsOf(d.stops, easingOf(OLD), d.durMs);
  console.log('    `' + OLD + '` 로 되돌리면 한 프레임 낙폭 Δ' + mo.drop.toFixed(4)
            + ' @' + mo.at.toFixed(0) + 'ms · 감쇠율 ' + mo.ratio.toFixed(0) + '배');
  ok(mo.drop > MAX_FRAME_DROP,
     '[R1] ★ 옛 이징을 되돌리면 [B1] 이 빨개진다 — 음성항이 공허하지 않다(422 교훈)',
     'Δ' + mo.drop.toFixed(4) + ' > ' + MAX_FRAME_DROP);
  ok(mo.ratio > MAX_RATE_RATIO, '[R2] 되돌리면 [B2] 도 빨개진다', mo.ratio.toFixed(0) + '배');
  /* 절벽 자리 — 890 의 판정이 「꼬리가 아니라 한복판」 이었다는 것을 자에 남긴다 */
  ok(mo.at > d.durMs * 0.4 && mo.at < d.durMs * 0.75,
     '[R3] ★ 옛 판의 절벽은 **한복판(52% 경계 ≈177ms)** 이다 — ED 가 본 꼬리가 아니다',
     mo.at.toFixed(0) + 'ms / ' + d.durMs + 'ms');
  /* 그리고 «값을 펴는 것» 으로는 못 고쳤다는 것도 — 868 이 왜 실패했는지 자가 안다 */
  const flat = [[0, 1], [.22, .8], [.52, .6], [.74, .4], [.88, .2], [1, 0]];
  const mf = metricsOf(flat, easingOf(OLD), d.durMs);
  ok(mf.drop > MAX_FRAME_DROP,
     '[R4] ★ 키프레임 값을 **완전 등간격**으로 펴도 옛 이징이면 여전히 빨갛다 — '
     + '뿌리는 값이 아니라 **구간별 이징**이다(868 이 못 없앤 이유)',
     'Δ' + mf.drop.toFixed(4));

  /* ── [C] 실물 대조 ───────────────────────────────────────────────────── */
  if (!NOBR) {
    console.log('\n[C] 브라우저 실물 대조 — `getComputedStyle().opacity`');
    const { pw, launch } = require('./pwlaunch');
    const { chromium } = pw();
    const b = await launch(chromium);
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await p.goto('file://' + path.join(ROOT, 'index.html'));
    await p.waitForTimeout(1200);
    const live = await p.evaluate(async (durMs) => {
      if (typeof window.step === 'function') window.step = () => {};
      goTab('growth');
      await new Promise((z) => setTimeout(z, 350));
      const host = document.querySelector('#trCards [data-tr]') || document.body;
      const L = document.getElementById('fxl');
      for (const nd of [...L.querySelectorAll('.fx-keep,.fx-flash')]) nd.remove();
      fxFlash(host);
      await new Promise((z) => setTimeout(z, 40));
      const el = L.querySelector('.fx-flash');
      if (!el) return { err: '.fx-flash 노드가 안 섰다' };
      const an = el.getAnimations().find((a) => (a.animationName || '') === 'fxFlash') || el.getAnimations()[0];
      if (!an) return { err: '애니메이션을 못 잡았다' };
      an.pause();
      const out = [];
      for (let t = 0; t <= durMs; t += 1) { an.currentTime = t; out.push(Number(getComputedStyle(el).opacity)); }
      return { op: out };
    }, d.durMs);
    await b.close();
    if (live.err) { ok(false, '[C1] 브라우저 표본', live.err); }
    else {
      let mx = 0, at = 0;
      for (let t = 0; t < live.op.length; t++) {
        const e = Math.abs(live.op[t] - opacityAt(d.stops, ease, d.durMs, t));
        if (e > mx) { mx = e; at = t; }
      }
      ok(mx < 0.01, '[C1] ★ 산수 모형이 실제 렌더와 붙는다(열창 없는 자 — 890 의 판정 근거)',
         '최대 오차 ' + mx.toFixed(5) + ' @' + at + 'ms');
      let lf = 0; const dd = Math.round(FRAME_MS);
      for (let i = 0; i + dd < live.op.length; i++) lf = Math.max(lf, live.op[i] - live.op[i + dd]);
      ok(lf <= MAX_FRAME_DROP, '[C2] 브라우저 실측 한 프레임 낙폭도 문턱 아래다', 'Δ' + lf.toFixed(4));
      ok(errs.length === 0, '[C3] 페이지 에러 0건', errs.slice(0, 2).join(' | '));
    }
  }

  console.log('\n=== VERIFY890 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
