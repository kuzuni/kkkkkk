/* 작업 894 게이트 — «정지점 3개 이상 × 비선형 이징» 이 계단을 남기지 않는가.

   ── 이 자가 무엇을 묻는가 ──────────────────────────────────────────────────
   890 은 `fxFlash` **한 부품**을 닫으며 「여러 정지점 `@keyframes` 에 이즈아웃을 걸지 마라」를
   UI-REFERENCE 58 규약으로 올렸고, 「같은 조합이 더 있는지」를 894 로 넘겼다(8건 목록).
   ⚑ **그 목록은 `animation:` 약칭의 timing-function 하나를 전 구간에 건 모형이다.**
     CSS 는 그 위에 **키프레임 안의 `animation-timing-function`** 을 얹고, 그 선언이 있는 구간은
     약칭이 아니라 **그 함수**로 굴러간다. 그 우선순위를 지켜 다시 재면 목록의 머리(`fxSpark`)가
     **이미 전 구간 linear** 다 — 등재문의 «Δ0.1725 > 문턱 0.15» 는 실물이 아니다(실효 Δ0.1154).
     그래서 이 자는 **글자(`linear` 인가)가 아니라 성질**을 묻되, 성질을 **실효 이징**으로 푼다.

   ── 축이 둘이다(등재문 ⚠⚠ «문턱을 그대로 옮기지 마라») ─────────────────────
   [α] **알파 계단** — 면을 덮는 워시(890 의 축, 문턱 0.15). 8건 전수로 «넘는 것 0건» 을 묻는다.
   [v] **속도 계단** — 움직이는 것의 축. 890 의 0.15 는 여기 못 쓴다(진폭·수명이 부품마다 다르다).
       대신 **이징이 «자기 몫으로» 만든 계단**만 센다 — 같은 키프레임 값을 linear 로 굴린 것과
       나눈다(890 [R4] 의 명제 «뿌리는 값이 아니라 구간별 이징» 을 자로 옮긴 것).

   ── 절(節) ────────────────────────────────────────────────────────────────
   [A] 선언 불변항 — 894 는 `fxPay` 의 **timing-function 한 토큰**과 그 사본 하나만 건드린다
   [B] 성질      — 재가속 · 진폭 Δ0 · 알파 전수 · 이징 몫 래칫 · `fxSpark` 실효 linear
   [R] 되돌림 시험(양방향) — 옛 이징을 도로 끼우면 [B1] 이 **실제로** 빨개진다(422 교훈)
   [C] 실물 대조 — 브라우저가 굴리는 값 ↔ 산수(열창 없는 자 · 890 §2 선례)

   실행: node tools/verify894.js   (--no-browser 로 [C] 생략)
*/
const path = require('path');
const P = require('./probe894.js');

const NOBR = process.argv.includes('--no-browser');
let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (d ? '  — ' + d : '')); c ? pass++ : fail++; };

/* ── 문턱 ─────────────────────────────────────────────────────────────────
   [B1] 재가속 **3.0배**. 지금 판 `fxPay` = **1.00배**(완전 단조) · 옛 판 = **16.07배**.
        고친 쪽에서 3.0배 · 깨진 쪽에서 5.36배 떨어져 있어 한쪽으로 무르지 않다(890 §6 규율).
   ⚠ 「한 프레임 최대 이동」 축으로는 문턱을 못 세운다 — `fxPay` 는 27.8% ↔ 41.6% 로 사이가
     1.50배뿐이라 890 의 «양쪽 1.6배» 를 못 채운다(그 축은 수명 .3s 가 지배한다). 그래서
     그 값은 **찍기만 하고 문턱으로 안 쓴다.** 문턱을 세울 자리와 못 세울 자리를 갈라 적는다.
   [B4] 알파 0.15 — 890 이 «면을 덮는 워시» 에서 세운 값 그대로. 여기서는 **처방의 근거가 아니라
        «넘는 자리가 있는가» 를 묻는 스윕**으로만 쓴다(입자에 그 문턱을 옮겨 처방하지 말라는
        등재문 경고를 지킨다).
   [B5] 이징 몫 래칫 **2.0배** — 지금 제품의 최댓값은 1.72배(`fxHandRing`·`fxHandTap`)다.
        새 이즈아웃이 다중 정지점에 들어오면 이 항이 먼저 빨개진다. */
const REACCEL_MAX = 3.0;
const ALPHA_MAX = 0.15;
const SHARE_MAX = 2.0;
/* 오버슈트(1 을 넘는 제어점)는 «바운스» 축이라 계단 자로 재면 오독한다 — 등재문 ⚠ */
const BOUNCE = new Set(['fxToastIn']);

function measure(name) {
  const body = P.blockOf(name), dec = P.declOf(name);
  if (!body || !dec || !dec.durMs) return null;
  const stops = P.stopsOf(body);
  const effSeg = stops.slice(0, Math.max(1, stops.length - 1)).map((s) => s.atf || dec.timing);
  const out = { name, durMs: dec.durMs, timing: dec.timing, stops, effSeg,
                allLin: effSeg.every(P.isLinear), ch: {} };
  for (const [key, get] of Object.entries(P.CH)) {
    const cs = P.chanStops(stops, get);
    if (cs.length < 2) continue;
    const tr = P.traceOf(cs, dec.timing, dec.durMs);
    const trL = P.traceOf(cs.map((c) => ({ ...c, atf: 'linear' })), 'linear', dec.durMs);
    out.ch[key] = key === 'opacity'
      ? { kind: 'a', n: cs.length, drop: P.alphaMetric(tr).drop, at: P.alphaMetric(tr).at,
          dropLin: P.alphaMetric(trL).drop }
      : (() => { const s = P.speedMetric(tr), l = P.speedMetric(trL);
          return { kind: 'v', n: cs.length, amp: s.amp, frameMax: s.frameMax, frameMaxLin: l.frameMax,
                   reaccel: s.reaccel, reaccelLin: l.reaccel,
                   share: s.frameMax / Math.max(l.frameMaxLin === undefined ? l.frameMax : l.frameMax, 1e-9) }; })();
  }
  return out;
}

(async () => {
  console.log('=== verify894 — 연출 곡선의 «구간별 이징» 계단 전수 ===');
  const M = Object.fromEntries(P.LIST.map((n) => [n, measure(n)]));
  const pay = M.fxPay, spark = M.fxSpark;

  /* ── [A] 선언 불변항 ──────────────────────────────────────────────────── */
  console.log('\n[A] 선언 불변항 — 894 가 건드린 것은 `fxPay` 의 timing 한 토큰 + 사본 하나뿐이다');
  ok(!!pay, '[A0] `@keyframes fxPay` / `animation:fxPay` 선언을 읽었다');
  const payScale = P.chanStops(pay.stops, P.CH.scale).map((c) => [c.p, c.v]);
  const wantPay = [[0, 1], [.2, .925], [.56, .962], [1, 1]];
  ok(payScale.length === wantPay.length && payScale.every((s, i) =>
      Math.abs(s[0] - wantPay[i][0]) < 1e-9 && Math.abs(s[1] - wantPay[i][1]) < 1e-9),
     '[A1] `fxPay` 키프레임 값이 58 43·44회차가 놓은 그대로다(894 는 값을 안 건드렸다)',
     payScale.map(([p, v]) => (p * 100) + '%:' + v).join(' '));
  ok(Math.abs(pay.durMs - 300) < 1e-9, '[A2] `fxPay` 길이 300ms 불변', pay.durMs + 'ms');
  ok(/\.fx-pay\{animation:fxPay [^}]*both\}/.test(P.SRC),
     '[A3] `.fx-pay` 가 여전히 `both`(채움 모드)로 붙는다 — 43회차의 «HUD 반응» 규약');
  ok(P.chanStops(pay.stops, P.CH.scale).every((c) => !c.atf),
     '[A4] ★ 키프레임 안에 남은 `animation-timing-function` **사본 0건** — '
     + '남기면 마지막 구간만 옛 이징으로 되돌아간다(402 규약)');
  ok(P.stopsOf(P.blockOf('fxSpark')).length === 9,
     '[A5] `fxSpark` 정지점 9 불변 — 894 는 `fxSpark` 를 한 글자도 안 건드렸다(681·838·881 구간)');
  /* ⚑ 897 이관 — 894 의 목록에서 한 건이 **제품째** 사라졌다(`fxPunch2` = 93 4회차 이후 한 번도 안
     붙던 죽은 곡선). 목록을 조용히 7건으로 줄이면 이 자의 전수 축이 «누가 언제 빠졌는지» 를 잃는다
     ⇒ 이력(`LIST0`)은 8건 그대로 두고, **빠진 것이 그 하나뿐인지**를 이름으로 묻는다.
     다른 부품이 사라지면(또는 `fxPunch2` 가 되살아나면) 여기가 먼저 빨개진다. */
  ok(P.MISSING.length === 1 && P.MISSING[0] === 'fxPunch2',
     '[A6] ★ 894 의 8건 중 제품에서 사라진 것은 **`fxPunch2` 하나뿐**이다 — 897 이 지운 죽은 곡선이고, '
     + '나머지 7건은 전부 제자리에 있다',
     '사라짐 [' + (P.MISSING.join(', ') || '없음') + '] · 남음 ' + P.LIST.length + '건');

  /* ── [B] 성질 ────────────────────────────────────────────────────────── */
  console.log('\n[B] 성질');
  const ps = pay.ch.scale;
  console.log('    fxPay — 재가속 ' + ps.reaccel.toFixed(2) + '배 · 한 프레임 최대 이동 '
    + (ps.frameMax * 100).toFixed(1) + '%(진폭 ' + ps.amp.toFixed(3) + ') · 실효 이징 ['
    + pay.effSeg.join(', ') + ']');
  ok(ps.reaccel <= REACCEL_MAX,
     '[B1] ★ `fxPay` 가 «느려졌다 다시 빨라지는» 톱니를 ' + REACCEL_MAX + '배 넘게 만들지 않는다',
     ps.reaccel.toFixed(2) + '배 ≤ ' + REACCEL_MAX);
  const dip = Math.min(...payScale.map((s) => s[1])), top = Math.max(...payScale.map((s) => s[1]));
  ok(Math.abs(dip - .925) < 1e-9 && Math.abs(top - 1) < 1e-9,
     '[B2] ★ 딥 .925 · 시작·끝 1 — 완화를 «움푹을 얕게 해서» 얻지 않았다(무르게 푼 수리가 아니다)',
     '딥 ' + dip + ' · 최대 ' + top);
  ok(ps.frameMax <= ps.frameMaxLin + 1e-9,
     '[B3] 한 프레임 최대 이동이 «같은 값·linear» 보다 크지 않다(문턱이 아니라 부등식이다)',
     (ps.frameMax * 100).toFixed(1) + '% ≤ ' + (ps.frameMaxLin * 100).toFixed(1) + '%');

  console.log('\n    [α] 890 축 전수 — 한 프레임 opacity 낙폭(문턱 ' + ALPHA_MAX + ')');
  const over = [];
  for (const n of P.LIST) {
    const a = M[n] && M[n].ch.opacity; if (!a) continue;
    console.log('      ' + n.padEnd(12) + ' Δ' + a.drop.toFixed(4) + ' @' + a.at.toFixed(0)
      + 'ms  (같은 값·linear Δ' + a.dropLin.toFixed(4) + ')');
    if (a.drop > ALPHA_MAX) over.push(n + ' Δ' + a.drop.toFixed(4));
  }
  ok(over.length === 0,
     '[B4] ★ 등재문 8건(897 이 죽은 하나를 지워 지금 7건) 중 890 의 알파 문턱을 넘는 자리 **0건** — 실효 이징으로 재면 목록이 비어 있다',
     over.join(' · ') || '최대 Δ' + Math.max(...P.LIST.map((n) => (M[n].ch.opacity || { drop: 0 }).drop)).toFixed(4));

  console.log('\n    [v] 이징 몫(한 프레임 최대 이동 ÷ 같은 값·linear · 래칫 ' + SHARE_MAX + '배)');
  const bad = [];
  for (const n of P.LIST) {
    for (const [k, c] of Object.entries(M[n].ch)) {
      if (c.kind !== 'v') continue;
      const mark = BOUNCE.has(n) ? '  ← 바운스 축(오버슈트 · 계단 자로 안 잰다)' : '';
      console.log('      ' + (n + '·' + k).padEnd(20) + '×' + c.share.toFixed(2)
        + '  (재가속 ' + c.reaccel.toFixed(2) + '배)' + mark);
      if (!BOUNCE.has(n) && c.share > SHARE_MAX) bad.push(n + '·' + k + ' ×' + c.share.toFixed(2));
    }
  }
  ok(bad.length === 0,
     '[B5] ★ 계단 축 부품 전부 — 이징이 «자기 몫으로» 만드는 한 프레임 계단이 ' + SHARE_MAX + '배 이내다',
     bad.join(' · ') || '최대 ×' + Math.max(...P.LIST.filter((n) => !BOUNCE.has(n))
       .flatMap((n) => Object.values(M[n].ch).filter((c) => c.kind === 'v').map((c) => c.share))).toFixed(2));
  ok(spark.allLin,
     '[B6] ★ `fxSpark` 는 **실효 전 구간 linear** 다 — 등재문의 «정지점 9 × ease-out» 은 '
     + '약칭만 읽은 모형이었다(키프레임 안 `animation-timing-function` 이 약칭을 이긴다)',
     '실효 [' + spark.effSeg.join(', ') + ']');

  /* ── [R] 되돌림 시험(양방향) ─────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 옛 이징을 도로 끼운 사본');
  const csPay = P.chanStops(pay.stops, P.CH.scale);
  const old = P.speedMetric(P.traceOf(csPay, 'ease-out', pay.durMs));
  const oldCopy = P.speedMetric(P.traceOf(
    csPay.map((c) => (Math.abs(c.p - .56) < 1e-9 ? { ...c, atf: 'ease-out' } : c)), 'linear', pay.durMs));
  console.log('    약칭을 `ease-out` 으로 되돌리면 재가속 ' + old.reaccel.toFixed(2)
    + '배 · 한 프레임 ' + (old.frameMax * 100).toFixed(1) + '%');
  ok(old.reaccel > REACCEL_MAX,
     '[R1] ★ 되돌리면 [B1] 이 **실제로** 빨개진다 — 음성항이 공허하지 않다(422 교훈)',
     old.reaccel.toFixed(2) + '배 > ' + REACCEL_MAX);
  ok(oldCopy.reaccel > 1.0001,
     '[R2] ★ **56% 의 사본 한 줄만** 되살려도 마지막 구간이 옛 이징으로 돌아간다 — '
     + '[A4] 가 공허하지 않다', '재가속 ' + oldCopy.reaccel.toFixed(2) + '배');
  /* 890 [R4] 의 명제를 이 부품에서도 남긴다 — 값을 펴는 것으로는 못 고친다 */
  const flat = [{ p: 0, v: 1 }, { p: .25, v: .925 }, { p: .625, v: .962 }, { p: 1, v: 1 }];
  const mf = P.speedMetric(P.traceOf(flat, 'ease-out', pay.durMs));
  ok(mf.reaccel > REACCEL_MAX,
     '[R3] ★ 키프레임 값·간격을 고르게 펴도 옛 이징이면 여전히 빨갛다 — '
     + '뿌리는 값이 아니라 **구간별 이징**이다(890 [R4] 와 같은 명제)',
     '재가속 ' + mf.reaccel.toFixed(2) + '배');

  /* ── [C] 실물 대조 ───────────────────────────────────────────────────── */
  if (!NOBR) {
    console.log('\n[C] 브라우저 실물 대조 — `Animation.currentTime` + `getComputedStyle`');
    const { pw, launch } = require('./pwlaunch');
    const { chromium } = pw();
    const b = await launch(chromium);
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await p.waitForTimeout(1200);
    const live = await p.evaluate(async () => {
      const out = {};
      const mk = (css) => { const d = document.createElement('div');
        d.style.cssText = 'position:fixed;left:-9999px;top:0;width:40px;height:40px;' + css;
        document.body.appendChild(d); return d; };
      /* fxPay — 제품 클래스 그대로 */
      const a = mk(''); a.className = 'fx-pay';
      const an = a.getAnimations()[0];
      if (an) { an.pause(); const s = [];
        for (let t = 0; t <= 300; t += 1) { an.currentTime = t;
          const m = new DOMMatrixReadOnly(getComputedStyle(a).transform); s.push(m.a); }
        out.pay = s; }
      a.remove();
      /* fxSpark — 실물이 정말 linear 로 구르는가(등재문 기각의 실물 근거) */
      const c = mk('--dx:100px;--dy:-100px;animation:fxSpark .38s ease-out forwards');
      const an2 = c.getAnimations()[0];
      if (an2) { an2.pause(); const s = [];
        for (let t = 0; t <= 380; t += 1) { an2.currentTime = t; s.push(Number(getComputedStyle(c).opacity)); }
        out.spark = s; }
      c.remove();
      return out;
    });
    await b.close();
    if (!live.pay) ok(false, '[C1] `.fx-pay` 애니메이션을 못 잡았다');
    else {
      let mx = 0, at = 0;
      for (let t = 0; t < live.pay.length; t++) {
        const e = Math.abs(live.pay[t] - P.valueAt(csPay, pay.timing, pay.durMs, t));
        if (e > mx) { mx = e; at = t; }
      }
      ok(mx < 0.002, '[C1] ★ `fxPay` 산수 모형이 실제 렌더와 붙는다', '최대 오차 ' + mx.toFixed(5) + ' @' + at + 'ms');
      const d = Math.round(P.FRAME_MS); const sp = [];
      for (let i = 0; i + d < live.pay.length; i += d) sp.push(Math.abs(live.pay[i] - live.pay[i + d]));
      let re = 1; for (let i = 1; i < sp.length; i++) if (sp[i - 1] > 1e-6) re = Math.max(re, sp[i] / sp[i - 1]);
      ok(re <= REACCEL_MAX, '[C2] ★ 브라우저 실측에서도 프레임 속도가 다시 빨라지지 않는다', '×' + re.toFixed(2));
    }
    if (!live.spark) ok(false, '[C3] `fxSpark` 애니메이션을 못 잡았다');
    else {
      const d = Math.round(P.FRAME_MS); let mxd = 0;
      for (let i = 0; i + d < live.spark.length; i++) mxd = Math.max(mxd, live.spark[i] - live.spark[i + d]);
      ok(mxd <= ALPHA_MAX,
         '[C3] ★ **실물 `fxSpark` 의 한 프레임 낙폭이 890 문턱 아래다** — 등재문의 Δ0.1725 는 '
         + '약칭 모형의 값이고 브라우저는 그렇게 안 굴린다', 'Δ' + mxd.toFixed(4) + ' ≤ ' + ALPHA_MAX);
      ok(errs.length === 0, '[C4] 페이지 에러 0건', errs.slice(0, 2).join(' | '));
    }
  }

  console.log('\n=== VERIFY894 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + ' ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
