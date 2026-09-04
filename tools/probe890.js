/* 작업 890 — **세 번째 자**: 공용 `@keyframes fxFlash` 의 «구간별 이징» 이 절벽을 만드는가.

   ── 왜 세 번째 자가 필요한가 (등재문 «두 채점자가 각자 자를 보여 줬는데 결론이 반대다») ──
   * **EC(절벽 있다)** — 열창 = 카드 아트 `x240-380,y200-275` + 바 면 `x250-370,y282-288`.
     20ms 최대 낙폭 Δ0.258@177ms · 순간 감쇠율 559배 · 끝단 0.203→0.015 를 20ms 에 버린다.
   * **ED(절벽 없다)** — 열창 = 카드 몸통 `x231..388,y155..315` 중앙값 ΔL.
     마지막 두 칸 낙폭 −.0253 · −.0243(4% 차 = 등속) · t≈279ms 에 중간 알파 프레임이 실재한다.

   둘 다 **찍힌 픽셀의 휘도(ΔL)로 opacity 를 «추정»** 했고, 그래서 ① 열창 밑에 무엇이 깔렸는가
   ② 어떤 격자로 표본했는가 에 답이 흔들린다. **이 자는 추정하지 않는다** —
   `getComputedStyle(el).opacity` 로 **애니메이션이 실제로 굴리는 그 속성값 자체**를 읽는다.
   열창이 없으므로 «어디를 봤는가» 로 갈릴 자리가 아예 없다(879 §19 · 813 35회차 규율).

   ── 자를 두 겹으로 세운다 (한 겹은 상대를 못 이긴다) ──
   [A] **산수** — `index.html` 의 선언에서 키프레임과 timing-function 을 **읽어 와** opacity(t) 를 푼다.
       CSS 는 timing-function 을 **구간마다** 다시 적용하므로(구간별 이징) opacity(t) 는 닫힌 식이다.
       ⚠ 상수를 손으로 적지 않는다 — 제품이 바뀌면 자도 같이 바뀌어야 한다(402 «사본을 지운다»).
   [B] **브라우저** — 실제로 `fxFlash()` 를 켜고 `currentTime` 을 감아 가며 `getComputedStyle` 로 읽는다.
       [A] 와 [B] 가 붙으면 «계단은 표본 거칠기가 아니라 CSS 에 있다» 가 못박힌다.

   ── 그리고 두 채점자를 각자의 격자로 다시 세운다 ──
   [3] 같은 opacity(t) 를 **ED 의 80ms 격자**로 다시 표본해 ED 의 «등속» 이 재현되는가를 본다.
       (나이퀴스트 — 16.7ms 짜리 사건은 80ms 격자에 원리적으로 안 잡힌다.)

   실행: node tools/probe890.js
*/
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'latin1');

let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

/* ── 제품에서 선언을 읽어 온다 (손 상수 0개) ───────────────────────────── */
function readDecl() {
  const a = SRC.match(/animation:\s*fxFlash\s+([\d.]+)s\s+([a-z-]+\([^)]*\)|[a-z-]+)/);
  if (!a) throw new Error('`animation:fxFlash …` 선언을 못 찾았다');
  const k = SRC.match(/@keyframes\s+fxFlash\s*\{([\s\S]*?)\n\s*\/\*|@keyframes\s+fxFlash\s*\{([\s\S]{0,600}?)\}\}/);
  const body = SRC.slice(SRC.indexOf('@keyframes fxFlash'));
  const stops = [];
  const re = /(\d+)%\s*\{\s*opacity:\s*([\d.]+)/g;
  let m, guard = 0;
  const seg = body.slice(0, body.indexOf('}}') + 2);
  while ((m = re.exec(seg)) && guard++ < 40) stops.push([Number(m[1]) / 100, Number(m[2])]);
  if (stops.length < 3) throw new Error('`@keyframes fxFlash` opacity 정지점을 못 읽었다');
  return { durMs: Number(a[1]) * 1000, timing: a[2], stops };
}

/* cubic-bezier(x1,y1,x2,y2) — CSS 정의 그대로(뉴턴법으로 t 를 푼다) */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t;
  const fy = (t) => ((ay * t + by) * t + cy) * t;
  const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 24; i++) {
      const e = fx(t) - x; if (Math.abs(e) < 1e-10) break;
      const d = dfx(t); if (Math.abs(d) < 1e-10) break;
      t -= e / d;
    }
    return fy(Math.min(1, Math.max(0, t)));
  };
}
function easingOf(tok) {
  if (tok === 'linear') return (x) => x;
  const m = tok.match(/cubic-bezier\(([^)]*)\)/);
  if (m) { const n = m[1].split(',').map(Number); return bezier(n[0], n[1], n[2], n[3]); }
  if (tok === 'ease') return bezier(.25, .1, .25, 1);
  if (tok === 'ease-out') return bezier(0, 0, .58, 1);
  if (tok === 'ease-in') return bezier(.42, 0, 1, 1);
  if (tok === 'ease-in-out') return bezier(.42, 0, .58, 1);
  throw new Error('모르는 timing-function: ' + tok);
}

/* ⚑ 이 한 줄이 이 작업의 전부다 — timing-function 은 **구간마다** 다시 걸린다 */
function opacityAt(stops, ease, durMs, tMs) {
  const p = Math.min(1, Math.max(0, tMs / durMs));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, oa] = stops[i], [b, ob] = stops[i + 1];
    if (p >= a && p <= b) {
      const q = (b - a) === 0 ? 0 : (p - a) / (b - a);
      return oa + (ob - oa) * ease(q);
    }
  }
  return stops[stops.length - 1][1];
}

/* 한 줄기(1ms 격자)에서 재는 값들 — «절벽» 의 정의를 여기 한 곳에만 적는다 */
const FRAME = 1000 / 60;          /* 60fps 한 프레임 = 16.67ms — «눈이 보는 한 칸» */
function metrics(trace, durMs) {   /* trace[i] = opacity at i*step ms */
  const step = durMs / (trace.length - 1);
  const idx = (ms) => Math.round(ms / step);
  const drop = (w) => {            /* 폭 w(ms) 창에서의 최대 낙폭 */
    let mx = 0, at = 0; const d = idx(w);
    for (let i = 0; i + d < trace.length; i++) {
      const v = trace[i] - trace[i + d];
      if (v > mx) { mx = v; at = i * step; }
    }
    return { v: mx, at };
  };
  /* 순간 감쇠율 — 봉우리가 살아 있는 구간(opacity>0.02)에서만 본다 */
  let rmin = Infinity, rmax = 0;
  for (let i = 0; i + 1 < trace.length; i++) {
    const r = (trace[i] - trace[i + 1]) / step;
    if (trace[i] > 0.02 && r > 1e-7) { rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
  }
  let integ = 0, exp5 = 0;
  for (let i = 0; i + 1 < trace.length; i++) {
    integ += (trace[i] + trace[i + 1]) / 2 * step;
    if (trace[i] >= 0.5) exp5 += step;
  }
  return { frame: drop(FRAME), w20: drop(20), rmax, rmin, ratio: rmax / rmin, integ, exp5 };
}
const traceOf = (stops, ease, durMs, step) => {
  const out = [];
  for (let t = 0; t <= durMs + 1e-9; t += step) out.push(opacityAt(stops, ease, durMs, t));
  return out;
};

(async () => {
  console.log('=== probe890 — 세 번째 자: 애니메이션이 굴리는 `opacity` 값 자체를 읽는다 ===');
  console.log('정의: 「절벽」 = 60fps **한 프레임(16.67ms)** 안에서 opacity 가 떨어지는 최대 폭.');
  console.log('      (EC 는 20ms · ED 는 80ms 격자로 봤다 — 격자를 밝히지 않으면 두 사람이 안 갈린다)\n');

  const decl = readDecl();
  console.log('[0] 제품 선언(읽어 온 값 — 손 상수 없음)');
  console.log('    duration ' + decl.durMs + 'ms · timing-function `' + decl.timing + '`');
  console.log('    keyframes opacity ' + decl.stops.map(([p, o]) => (p * 100) + '%:' + o).join(' · '));
  ok(decl.stops.length >= 5, '[0-a] 정지점을 5개 이상 읽었다', decl.stops.length + '개');

  const OLD_TF = 'cubic-bezier(.2,.8,.3,1)';   /* EC·ED 가 채점한 판 — 재현의 못 */
  const easeOld = easingOf(OLD_TF);            /* [1]~[3] 은 이 판을 잰다 */
  const easeNow = easingOf(decl.timing);       /* [4] 는 지금 제품을 잰다 */
  const STEP = 0.1;
  const cur = traceOf(decl.stops, easeOld, decl.durMs, STEP);   /* 옛 판(재현 대상) */
  const lin = traceOf(decl.stops, (x) => x, decl.durMs, STEP);  /* linear(처방) */
  const nowT = traceOf(decl.stops, easeNow, decl.durMs, STEP);  /* 지금 제품 */
  const mCur = metrics(cur, decl.durMs), mLin = metrics(lin, decl.durMs);
  const mNow = metrics(nowT, decl.durMs);

  /* ── [1] 브라우저가 산수와 같은 값을 굴리는가 ─────────────────────────── */
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(1200);

  /* ⚑ **재현은 «채점자가 본 판» 에 못을 박는다** — 이 자가 가르려는 것은 EC·ED 가 각자 잰
     그 화면(옛 이징)이다. 제품이 나중에 어느 쪽으로 가든 재현은 그 판을 계속 재야 하므로
     타이밍을 **인라인으로 강제**해서 잰다(그 다음에 «지금 제품» 도 따로 잰다). */
  const sample = async (forceTiming) => await p.evaluate(async ([durMs, force]) => {
    if (typeof window.step === 'function') window.step = () => {};
    goTab('growth');
    await new Promise((z) => setTimeout(z, 350));
    const host = document.querySelector('#trCards [data-tr]') || document.body;
    const L = document.getElementById('fxl');
    for (const nd of [...L.querySelectorAll('.fx-keep,.fx-flash')]) nd.remove();
    fxFlash(host);                                   /* 단발 호출 = 09·12·17 과 같은 경로 */
    await new Promise((z) => setTimeout(z, 40));
    const el = L.querySelector('.fx-flash');
    if (!el) return { err: '.fx-flash 노드가 안 섰다' };
    if (force) el.style.animationTimingFunction = force;
    const an = el.getAnimations().find((a) => (a.animationName || '') === 'fxFlash')
            || el.getAnimations()[0];
    if (!an) return { err: 'fxFlash 애니메이션을 못 잡았다' };
    an.pause();
    const dur = (an.effect && an.effect.getTiming) ? an.effect.getTiming().duration : durMs;
    const eff = getComputedStyle(el).animationTimingFunction;
    const out = [];
    for (let t = 0; t <= durMs; t += 1) {            /* 1ms 격자 — 열창 없음 */
      an.currentTime = t;
      out.push(Number(getComputedStyle(el).opacity));
    }
    return { dur, op: out, eff };
  }, [decl.durMs, forceTiming]);

  const OLD = 'cubic-bezier(.2,.8,.3,1)';            /* EC·ED 가 채점한 판 */
  const live = await sample(OLD);                    /* [1]~[3] = 재현(옛 판) */
  const now = await sample(null);                    /* [4] = 지금 제품 */
  await b.close();

  if (live.err) { ok(false, '[1] 브라우저 표본', live.err); process.exit(1); }
  ok(Math.abs(live.dur - decl.durMs) < 1,
     '[1-a] 브라우저가 굴리는 duration 이 선언과 같다', live.dur + 'ms');

  let maxErr = 0, atErr = 0;
  for (let t = 0; t < live.op.length; t++) {
    const e = Math.abs(live.op[t] - opacityAt(decl.stops, easeOld, decl.durMs, t));
    if (e > maxErr) { maxErr = e; atErr = t; }
  }
  console.log('\n[1] 산수 ↔ 브라우저 — **재현판**(강제 `' + OLD_TF + '` · 실효 `' + live.eff + '`)');
  console.log('    (1ms 격자 · ' + live.op.length + '점)');
  console.log('    최대 오차 ' + maxErr.toFixed(5) + ' @' + atErr + 'ms');
  ok(maxErr < 0.01,
     '[1-b] ★ 산수 모형이 실제 렌더와 붙는다 ⇒ 「계단은 표본이 아니라 CSS 에 있다」',
     '최대 오차 ' + maxErr.toFixed(5));

  const mLive = metrics(live.op, decl.durMs);

  /* ── [2] 절벽이 있는가 · 어디인가 ───────────────────────────────────── */
  console.log('\n[2] **채점자가 본 판** `' + OLD_TF + '` — 60fps 한 프레임 낙폭');
  console.log('    브라우저 실측 : Δ' + mLive.frame.v.toFixed(4) + ' @' + mLive.frame.at.toFixed(0) + 'ms');
  console.log('    산수          : Δ' + mCur.frame.v.toFixed(4) + ' @' + mCur.frame.at.toFixed(0) + 'ms');
  console.log('    20ms 낙폭(EC 격자): Δ' + mCur.w20.v.toFixed(4) + ' @' + mCur.w20.at.toFixed(0) + 'ms'
            + '   (EC 보고값 Δ0.258@177ms)');
  console.log('    ∫opacity·dt ' + mCur.integ.toFixed(1) + 'ms · opacity≥0.5 노출 ' + mCur.exp5.toFixed(1) + 'ms');
  ok(mLive.frame.v > 0.15,
     '[2-a] ★ 한 프레임에 진폭의 큰 몫이 사라진다 = **EC 의 「절벽」 은 실재한다**',
     'Δ' + mLive.frame.v.toFixed(4) + ' / 프레임');

  /* 절벽이 «어디» 인가 — 이것이 두 채점자를 가르는 자리다 */
  const cliffAt = mLive.frame.at;
  const bounds = decl.stops.map(([q]) => q * decl.durMs);
  const nearest = bounds.reduce((a, x) => (Math.abs(x - cliffAt) < Math.abs(a - cliffAt) ? x : a), bounds[0]);
  console.log('    절벽 자리 ' + cliffAt.toFixed(0) + 'ms = 키프레임 경계 '
            + nearest.toFixed(0) + 'ms(' + (nearest / decl.durMs * 100).toFixed(0) + '%) 근처');
  ok(cliffAt < decl.durMs * 0.75,
     '[2-b] ★ 절벽은 **꼬리가 아니라 한복판**에 있다 — ED 가 본 꼬리와 다른 자리다',
     cliffAt.toFixed(0) + 'ms / ' + decl.durMs + 'ms');

  /* ── [3] ED 의 80ms 격자로 다시 표본하면 무엇이 보이는가 ─────────────── */
  const grid = [0, 80, 160, 240, 320, 400].filter((t) => t <= decl.durMs + 80);
  const g = grid.map((t) => opacityAt(decl.stops, easeOld, decl.durMs, Math.min(t, decl.durMs)));
  const gd = [];
  for (let i = 0; i + 1 < g.length; i++) gd.push(g[i] - g[i + 1]);
  console.log('\n[3] 같은 곡선을 **ED 의 80ms 격자**로 다시 표본');
  console.log('    표본 ' + grid.map((t, i) => t + 'ms:' + g[i].toFixed(3)).join(' · '));
  console.log('    칸 낙폭 ' + gd.map((d) => d.toFixed(4)).join(' · '));
  const tail2 = gd.slice(-3, -1);                    /* 마지막 «살아 있는» 두 칸 */
  const near = tail2.length === 2 && Math.abs(tail2[0] - tail2[1]) / Math.max(...tail2) < 0.30;
  ok(near,
     '[3-a] ★ 80ms 격자에서는 꼬리 두 칸이 «거의 등속» 으로 읽힌다 = **ED 도 안 틀렸다**',
     tail2.map((d) => d.toFixed(4)).join(' ↔ '));
  const binLo = grid.filter((t) => t <= cliffAt).pop(), binHi = grid.find((t) => t > cliffAt);
  ok(binLo !== undefined && binHi !== undefined && binHi - binLo >= 80,
     '[3-b] ★ 절벽(' + cliffAt.toFixed(0) + 'ms)이 ED 의 한 칸 [' + binLo + ',' + binHi + '] **안쪽**에 숨는다 '
     + '— 80ms 격자로는 16.7ms 사건을 원리적으로 못 본다(나이퀴스트)');

  /* ED 의 양성 주장 — «중간 알파 프레임이 실재한다» 는 이 자로도 참이다 */
  const t279 = opacityAt(decl.stops, easeOld, decl.durMs, 279);
  ok(t279 > 0.05 && t279 < 0.5,
     '[3-c] ★ ED 의 «t≈279ms 에 중간 알파 프레임이 실재한다» 도 참이다',
     'opacity(279ms) = ' + t279.toFixed(3));

  /* ── [4] 처방(→ linear)의 대가 · 그리고 «지금 제품» 실측 ──────────────── */
  console.log('\n[4] `linear` 로 갈면 (키프레임 값·FXFLASH_MS·FXFLASH_PEAK 전부 불변)');
  console.log('    한 프레임 낙폭 Δ' + mCur.frame.v.toFixed(4) + ' → Δ' + mLin.frame.v.toFixed(4)
            + '  (' + (mCur.frame.v / mLin.frame.v).toFixed(1) + '배 완화)');
  console.log('    20ms 낙폭     Δ' + mCur.w20.v.toFixed(4) + ' → Δ' + mLin.w20.v.toFixed(4)
            + '   (EC 검산 Δ0.258 → Δ0.108)');
  console.log('    감쇠율 최대/최소 ' + mCur.ratio.toFixed(0) + '배 → ' + mLin.ratio.toFixed(1) + '배');
  console.log('    ∫opacity·dt ' + mCur.integ.toFixed(1) + ' → ' + mLin.integ.toFixed(1) + 'ms'
            + ' · opacity≥0.5 노출 ' + mCur.exp5.toFixed(1) + ' → ' + mLin.exp5.toFixed(1) + 'ms');
  ok(mLin.frame.v < mCur.frame.v * 0.6,
     '[4-a] linear 가 한 프레임 최대 낙폭을 실질적으로 줄인다',
     'Δ' + mCur.frame.v.toFixed(4) + ' → Δ' + mLin.frame.v.toFixed(4));
  ok(mLin.integ > mCur.integ && mLin.exp5 > mCur.exp5,
     '[4-b] 노출은 줄지 않는다(봉우리를 깎아서 얻은 완화가 아니다)',
     '∫ +' + (mLin.integ - mCur.integ).toFixed(1) + 'ms · ≥0.5 +' + (mLin.exp5 - mCur.exp5).toFixed(1) + 'ms');
  const peakCur = Math.max(...cur), peakLin = Math.max(...lin);
  ok(Math.abs(peakCur - peakLin) < 1e-9,
     '[4-c] 봉우리 opacity Δ0 — 강조는 한 칸도 안 줄었다',
     peakCur.toFixed(3) + ' ↔ ' + peakLin.toFixed(3));

  /* «지금 제품» 을 같은 자로 실측 — 재현판([1]~[3])과 달리 강제 없이 선언 그대로 굴린다.
     ⚑ 이 절이 있어야 이 자가 «옛 판 기록» 으로만 남지 않는다(제품이 지금 어디 서 있는지 찍는다). */
  if (now.err) { ok(false, '[4-d] 지금 제품 표본', now.err); }
  else {
    let nErr = 0;
    for (let t = 0; t < now.op.length; t++)
      nErr = Math.max(nErr, Math.abs(now.op[t] - opacityAt(decl.stops, easeNow, decl.durMs, t)));
    let nFrame = 0; const dF = Math.round(FRAME);
    for (let i = 0; i + dF < now.op.length; i++) nFrame = Math.max(nFrame, now.op[i] - now.op[i + dF]);
    console.log('\n    지금 제품 `' + decl.timing + '`(실효 `' + now.eff + '`) 실측 — '
              + '한 프레임 낙폭 Δ' + nFrame.toFixed(4) + ' · 산수 오차 ' + nErr.toFixed(5));
    ok(nErr < 0.01, '[4-d] 지금 제품도 산수와 붙는다', '최대 오차 ' + nErr.toFixed(5));
    ok(nFrame < mCur.frame.v * 0.6,
       '[4-e] ★ 지금 제품의 한 프레임 낙폭이 채점자가 본 판보다 실질적으로 작다',
       'Δ' + mCur.frame.v.toFixed(4) + '(옛) → Δ' + nFrame.toFixed(4) + '(지금)');
  }

  console.log('\n콘솔 에러 ' + errs.length + '건');
  ok(errs.length === 0, '[5] 페이지 에러 0건', errs.slice(0, 2).join(' | '));

  console.log('\n=== PROBE890 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
