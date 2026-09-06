/* 작업 968 — `.stabs` 두 과녁 재수립(폴리시 판단) 게이트.
 *
 *   node tools/verify968.js
 *
 * 968 은 «자 작업» 이 아니라 **과녁 작업**이다. 958 2회차가 `probe352.py` 를 부분 화소로 갈면서
 * 세 수를 남겼고(코너 원호지수 32.0 → **30.6** · 구분선 h 55 → **54.59** · 상변 +22 → **+22.14**),
 * 등재문은 그것을 **제품 선언**(반경 30 · h 54 · top 16 ⇒ 셸 바깥 +23)과 나란히 놓아
 * «어긋남 2.0 → 0.6» · «대역 0.6 이 54.59 를 98% 로 담는다» · «0.86px 은 자인가 제품인가» 셋을 물었다.
 *
 * 이 게이트가 그 셋의 답을 못박는다 — **셋 다 «두 자를 섞은 짝» 이었다.**
 *
 *   ⓐ 30.6 은 **rx 가 아니라 «원호지수»** 다. 이 코너는 원이 아니라 **타원**이고
 *      (`.stab.on::after{border-radius:30px/33px}` · `top:-3px` 이라 링 상단이 `pill_t` 보다 3 위)
 *      자는 거기에 **원 모델** `r = (d+ins) + √(2·d·ins)` 를 씌운다. 참값이 CSS 로 **30** 인
 *      우리 캡처를 같은 자로 재면 **28.1**(모델 예측 **28.03** · Δ0.07) — 자는 정상이고 눈금이 rx 가 아니다.
 *      ⇒ 과녁은 «ref 30.6 ↔ 우리 28.1 (Δ+2.5)» 이고, 모델로 옮기면 **rx = 32.7 ± 1.3**.
 *      선언 30 과 눈금을 직접 빼는 짝은 **폐기**. 제품 이동은 409 코너 장치를 다시 세우는
 *      레이아웃 판단이라 **970** 으로 등재했다(969 는 등재 경쟁으로 남에게 갔다 · 968 제품 `index.html` **0줄**).
 *   ⓑ `near(h, 54, 0.6)` 이 담는 것은 **DOM 값**(우리 54.00)이지 ref 의 54.59 가 아니다.
 *      «좁히면 즉시 빨개진다» 는 **기각** — 0.05 로 좁혀도 통과한다. 그래서 좁히지도 않는다
 *      (좁혀서 잡는 것이 0 이고 0.6 은 호스트·반올림 여유다).
 *   ⓒ 0.86px 은 «자가 못 잰 것» 도 «제품이 밀린 것» 도 아니라 **원점 리터럴이 낡은 것**이었다 —
 *      437 이 바 상변을 1961 → 1960 으로 옮겼는데 `sep(cap7, 775, 1961)` 만 안 따라왔다.
 *      원점을 **같은 자로** 재면 cap **+23.00 = CSS 항등식(테두리 7 + top 16) Δ0.00** ·
 *      ref **+22.40**. ⚑⚑ 그리고 그 0.60 과 h 의 0.59 는 **한 사실이다** —
 *      하변이 ref **+76.99** ↔ 우리 **+77.00** 로 **Δ0.01** 이라 구분선은 «키가 다른 것» 이 아니라
 *      **상변만 0.6 위**다.
 *
 * ⚠ 이 게이트는 그림이 없어도 온전히 돈다(모델 절 + 소스 절 + DOM 절). 캡처가 있으면
 *   [1] 의 대조군·[4] 의 cap 절이 **실측으로 바뀐다**(없으면 958 2회차가 남긴 값으로 판정).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { py } = require('./pydep937');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');

let bad = 0, tot = 0;
const ok = (name, cond, got) => {
  tot++;
  if (cond) console.log('  PASS ' + name + (got === undefined ? '' : ' — ' + got));
  else { bad++; console.log('  FAIL ' + name + (got === undefined ? '' : ' — ' + got)); }
};
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const near = (a, b, t) => Math.abs(a - b) <= t;

/* ── 모델 — `probe352.py` ⓐ 가 «무엇을 재는가» 를 그림 없이 다시 그린다 ────────────
   코너를 타원(rx, ry)으로 두고 상단에서 (d + off) 만큼 내려온 행의 가로 인셋을 낸 뒤,
   자가 쓰는 **원 역산**을 그대로 먹인다. 자의 셈과 같은 자리만 쓴다(d ≥ 3 · 중앙값). */
const insetAt = (rx, ry, off, d) => {
  const dd = d + off;
  return dd < ry ? rx * (1 - Math.sqrt(Math.max(0, 1 - ((ry - dd) / ry) ** 2))) : rx;
};
const arcIndex = (rx, ry, off, span = 25) => {
  const est = [];
  for (let d = 3; d <= span; d++) {
    const ins = insetAt(rx, ry, off, d);
    if (ins > 0) est.push((d + ins) + Math.sqrt(2 * d * ins));
  }
  est.sort((a, b) => a - b);
  return est[Math.floor(est.length / 2)];
};
/* 눈금 → rx (종횡비 30:33 고정 · 원점 오프셋 off) */
const toRx = (index, off) => {
  let lo = 0.5, hi = 3.0;
  for (let i = 0; i < 90; i++) {
    const k = (lo + hi) / 2;
    if (arcIndex(30 * k, 33 * k, off) < index) lo = k; else hi = k;
  }
  return 30 * (lo + hi) / 2;
};

/* 958 2회차가 남긴 실측 눈금 — 캡처가 있으면 아래에서 실측으로 덮어쓴다. */
const IDX = { refCov: 30.6, capCov: 28.1, refInt: 32.0, capInt: 28.7 };

(async () => {
  const S352 = fs.readFileSync(path.join(TOOLS, 'probe352.py'), 'utf8');
  const S47 = fs.readFileSync(path.join(TOOLS, 'verify47.js'), 'utf8');
  const SV352 = fs.readFileSync(path.join(TOOLS, 'verify352.js'), 'utf8');
  const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hasCap = fs.existsSync(path.join(ROOT, 'docs/review/96-full-hero.png'));

  let COV = '', INT = '';
  try {
    COV = String(py(['tools/probe352.py'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
    INT = String(py(['tools/probe352.py', '--int'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
  } catch (e) {
    console.log('  (probe352 실행 실패 — ' + String(e.message || e).slice(0, 80) + ')');
  }
  const grab = (txt, re) => { const m = txt.match(re); return m ? m.slice(1).map(Number) : null; };
  /* «r 좌 28.1 · 우 28.2 · **평균 28.1**» 두 번(ref → cap) */
  const rAll = [...COV.matchAll(/r 좌 ([\d.]+) · 우 ([\d.]+) · \*\*평균 ([\d.]+)\*\*/g)].map(m => +m[3]);
  const rInt = [...INT.matchAll(/r 좌 ([\d.]+) · 우 ([\d.]+) · \*\*평균 ([\d.]+)\*\*/g)].map(m => +m[3]);
  if (rAll.length >= 1) IDX.refCov = rAll[0];
  if (rAll.length >= 2) IDX.capCov = rAll[1];
  if (rInt.length >= 1) IDX.refInt = rInt[0];
  if (rInt.length >= 2) IDX.capInt = rInt[1];

  /* ── [1] 모델 — «원호지수 ≠ rx» 가 그림 없이 증명된다 ───────────────────── */
  console.log('\n[1] ⓐ — `probe352` 의 반경 눈금은 rx 가 아니라 **원호지수**다 (그림 없이 닫힌다)');
  const CIRCLE = arcIndex(30, 30, 0);
  const OURS = arcIndex(30, 33, 3);
  ok('[1-a] 자 자신은 **원에 대해 정확하다** — 원 r30 을 넣으면 30.00 이 나온다 (자를 의심하는 항이 아니다)',
    near(CIRCLE, 30, 0.05), f2(CIRCLE));
  ok('[1-b] ⚑⚑ 우리 코너 기하(타원 30:33 · 링 상단 −3)를 넣으면 **28.03** — 선언 30 과 2px 어긋난다',
    near(OURS, 28.03, 0.1) && Math.abs(OURS - 30) > 1.5, f2(OURS));
  ok('[1-c] 그 예측이 **우리 캡처 실측 눈금**과 0.15 안에서 만난다 (자는 정상이고 눈금이 rx 가 아닐 뿐)',
    near(OURS, IDX.capCov, 0.15), f2(OURS) + ' ↔ 실측 ' + f2(IDX.capCov) + (hasCap ? '' : ' (958 2회차 기록값)'));
  const rxCap = toRx(IDX.capCov, 3), rxRef = toRx(IDX.refCov, 3);
  ok('[1-d] ⚑ **대조군이 닫힌다** — 눈금 28.1 을 모델로 되돌리면 rx **30.0**(참값 = CSS 선언 30)',
    near(rxCap, 30, 0.25), f2(rxCap));
  /* ⚑⚑ 970 이관 (2026-09-06) — 아래 넷은 **뜻은 그대로, 값만** 옮겼다. 968 이 «오차막대» 로
     적은 ±1.3 이 실은 `radius()` 의 ref 원점 리터럴 하나였고(ref 만 셸상변+6 · cap 은 +7),
     970 이 그것을 **2028** 로 모아 두 자를 한 규칙으로 세웠다. 그래서 눈금이 30.6 → 29.6 ·
     과녁이 32.65 → **31.62** 다. 자리를 비우지 않는다 — [1-e] 는 여전히 «같은 모델로 옮기면
     선언 30 과 얼마나 갈리나» 를 묻고, [1-f] 는 여전히 «원점 1px 이 과녁을 얼마나 흔드나» 를
     묻는다. 다만 이제 그 흔들림은 **오차막대가 아니라 고쳐진 버그**라고 적는다.
     상세·판정은 `tools/verify970.js` · `docs/review/970-알약코너반경.md`. */
  ok('[1-e] 같은 모델로 ref 눈금을 옮기면 rx **31.6** — 선언 30 과의 차는 0.6 이 아니라 **1.6** 이다',
    near(rxRef, 31.62, 0.35) && rxRef - 30 > 1.0, f2(rxRef) + ' (Δ선언 +' + f2(rxRef - 30) + ')');
  const rxLo = toRx(IDX.refCov, 2), rxHi = toRx(IDX.refCov, 4);
  ok('[1-f] ⚑ 970 — 원점 리터럴 **1px 당 ∓1.3** 은 그대로지만, 그 1px 은 오차막대가 아니라 **버그였다**(2027 → 2028)',
    near(rxRef - rxLo, 1.3, 0.2) && near(rxHi - rxRef, 1.3, 0.2)
    && /radius\(ref7, 292, 551, 2028, 'ref'\)/.test(S352),
    'off2 ' + f2(rxLo) + ' · off3 ' + f2(rxRef) + ' · off4 ' + f2(rxHi));
  ok('[1-g] 같은 자끼리의 짝만 뺀다 — ref ↔ 우리 눈금 차가 **+1.5** (옛 자로도 같은 부호)',
    IDX.refCov - IDX.capCov > 1.0 && IDX.refInt - IDX.capInt > 1.0,
    '새 자 +' + f2(IDX.refCov - IDX.capCov) + ' · 옛 자 +' + f2(IDX.refInt - IDX.capInt));
  ok('[1-h] ⚠ 등재문의 짝(«눈금 ↔ 선언 30»)은 **자를 섞은 것**이다 — 같은 자로는 그 값이 안 나온다',
    Math.abs(Math.abs(IDX.refCov - 30) - Math.abs(IDX.refCov - IDX.capCov)) > 1.0,
    '|눈금−30| ' + f2(Math.abs(IDX.refCov - 30)) + ' ↔ |눈금−우리눈금| ' + f2(IDX.refCov - IDX.capCov));

  /* ── [2] 제품은 한 자도 안 옮겼다 — 세 자리가 한 값 ────────────────────── */
  console.log('\n[2] 968 은 제품 `index.html` **0줄** — 반경 30 이 세 자리에 그대로다');
  ok('[2-a] 제품 선언 `.stab.on{border-radius:30px}`', /\.stab\.on\{border-radius:30px/.test(HTML));
  ok('[2-b] `verify352` `RADIUS = 30`', /const RADIUS = 30;/.test(SV352));
  ok('[2-c] `verify47` 이 `30px` 를 묻는다', /g\.onRadius === '30px'/.test(S47));
  ok('[2-d] 409 코너 장치가 그대로다 — 링 타원 `30px / 33px`', /border-radius:30px \/ 33px/.test(HTML));
  ok('[2-e] 409 어깨 원판도 그대로 (`23px 25.3px at 30px 33px`)',
    (HTML.match(/radial-gradient\(23px 25\.3px at/g) || []).length >= 2);
  ok('[2-f] 링이 알약 상자보다 위·아래로 3px 씩 나간다 (`top:-3px;bottom:-3px`) — [1-b] 의 off 3 의 근거',
    /\.stab\.on::after\{content:'';position:absolute;left:0;right:0;top:-3px;bottom:-3px/.test(HTML));

  /* ── [3] ⓑ — 대역 0.6 이 담는 것은 **DOM 값**이다 ───────────────────────── */
  console.log('\n[3] ⓑ — `near(h, 54, 0.6)` 이 담는 것은 우리 DOM 값이지 ref 의 54.59 가 아니다');
  const browser = await launch(chromium);
  let dom = null;
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(700);
    dom = await page.evaluate(() => {
      const bar = document.querySelector('#bSk .stabs');
      if (!bar) return null;
      const s = bar.querySelector(':scope > .stab-sep');
      if (!s) return null;
      const bb = bar.getBoundingClientRect(), sr = s.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      const b = parseFloat(cs.borderTopWidth);
      return { h: sr.height, top: sr.y - (bb.y + b), outer: sr.y - bb.y, bot: sr.y + sr.height - bb.y, border: b };
    });
  } finally { await browser.close(); }
  ok('[3-a] 07 스킬 시트의 `.stab-sep` 을 DOM 으로 읽는다', !!dom, dom ? 'h ' + f2(dom.h) : '없음');
  ok('[3-b] 우리 h 는 **54.00** — 대역 0.6 의 한복판이지 «98% 지점» 이 아니다',
    dom && near(dom.h, 54, 0.02), dom && f2(dom.h));
  ok('[3-c] ⚑ 그래서 «대역을 좁히면 즉시 빨개진다» 는 **기각**이다 — 0.05 로 좁혀도 통과한다',
    dom && near(dom.h, 54, 0.05), dom && '|Δ| ' + f2(Math.abs(dom.h - 54)));
  ok('[3-d] 상변도 같다 — 콘텐츠 상변 +16.00 · 셸 바깥 상변 +23.00 (테두리 7 + top 16 항등식)',
    dom && near(dom.top, 16, 0.02) && near(dom.outer, 23, 0.02) && near(dom.border, 7, 0.01),
    dom && '+' + f2(dom.top) + ' / +' + f2(dom.outer));
  ok('[3-e] ⚠ ref 의 54.59 는 **이 대역과 무관한 다른 자의 값**이다 — 그 사실이 `verify47` 에 적혀 있다',
    /968[^\n]*[\s\S]{0,400}?ref 의\s*\n?\s*54\.59 는 \*\*이 대역과 무관하다\*\*/.test(S47)
    || /54\.59 는 \*\*이 대역과 무관하다\*\*/.test(S47));

  /* ── [4] ⓒ — 원점이 낡았던 것이고, 어긋남 둘은 **한 사실**이다 ─────────── */
  console.log('\n[4] ⓒ — 0.86px 의 정체는 낡은 원점 리터럴 · 그리고 상변·h 는 한 사실이다');
  const lit = [...COV.matchAll(/상변에서 \*\*\+([\d.]+)\*\*  \(CSS 54 · top 16\)/g)].map(m => +m[1]);
  const der = [...COV.matchAll(/원점을 같은 자로: 셸 바깥 상변 ([\d.]+) ⇒ 오프셋 \*\*\+([\d.]+)\*\* · 하변 \*\*\+([\d.]+)\*\*/g)]
    .map(m => ({ o: +m[1], top: +m[2], bot: +m[3] }));
  const hs = [...COV.matchAll(/부분화소 y [\d.]+~[\d.]+ \(h \*\*([\d.]+)\*\*\)/g)].map(m => +m[1]);
  ok('[4-a] 재현이 ref 원점을 **리터럴이 아니라 같은 자로** 낸다', der.length >= 1 && der[0].o > 0,
    der.length ? f2(der[0].o) : '없음');
  ok('[4-b] ref 정수 원점(2021)과 부분화소 원점이 0.25 어긋난다 — 등재문 «0.86» 의 첫 조각',
    der.length >= 1 && near(2021 - der[0].o, 0.25, 0.12), der.length && f2(2021 - der[0].o));
  ok('[4-c] ⚑ **cap 리터럴이 437 과 맞다** (1961 → **1960**) — 나머지 조각이 여기 있었다',
    /sep\(cap7, 775, 1960, 'cap'\)/.test(S352) && !/sep\(cap7, 775, 1961, 'cap'\)/.test(S352));
  if (hasCap) {
    ok('[4-d] ⚑⚑ cap 이 **CSS 항등식과 Δ0.00** — 자는 잴 수 있었고 원점만 낡았던 것이다',
      der.length >= 2 && near(der[1].top, 23, 0.05), der.length >= 2 ? '+' + f2(der[1].top) : '없음');
    ok('[4-e] 리터럴 원점과 잰 원점이 cap 에서 **같은 값**을 낸다 (다시 낡으면 1.00 벌어져 빨개진다)',
      lit.length >= 2 && der.length >= 2 && near(lit[1], der[1].top, 0.05),
      lit.length >= 2 ? '리터럴 +' + f2(lit[1]) + ' ↔ 잰 것 +' + f2(der[1].top) : '없음');
    ok('[4-f] ⇒ 참 어긋남은 **0.86 이 아니라 0.60** 이다 (ref +22.40 ↔ 우리 +23.00)',
      der.length >= 2 && near(der[1].top - der[0].top, 0.60, 0.12),
      der.length >= 2 ? f2(der[1].top - der[0].top) : '없음');
    ok('[4-g] ⚑⚑ **상변 0.60 과 h 0.59 는 한 사실이다** — 하변끼리는 Δ ≤ 0.05 (ref 76.99 ↔ 우리 77.00)',
      der.length >= 2 && near(der[0].bot, der[1].bot, 0.05),
      der.length >= 2 ? f2(der[0].bot) + ' ↔ ' + f2(der[1].bot) : '없음');
    ok('[4-h] 그 «한 사실» 은 두 수의 합으로도 닫힌다 — (상변 차) + (h 차) ≈ 0',
      der.length >= 2 && hs.length >= 2
      && Math.abs((der[1].top - der[0].top) + (hs[1] - hs[0])) < 0.05,
      der.length >= 2 && hs.length >= 2
        ? f2(der[1].top - der[0].top) + ' + (' + f2(hs[1] - hs[0]) + ') = ' + f2((der[1].top - der[0].top) + (hs[1] - hs[0]))
        : '없음');
  } else {
    ok('[4-d] ⚑ 캡처가 없어도 죽지 않는다 — cap 절 넷은 «캡처 있을 때만» 이다 (958 이 아홉 번 고친 그 얼굴)',
      /캡처 없음/.test(COV) || /══════ 07 스킬 시트/.test(COV));
  }

  /* ── [5] 과녁문이 실제로 옮겨졌는가 (기록이 흩어지지 않게) ───────────────── */
  console.log('\n[5] 과녁문 이관 — 옛 «혼합 짝» 이 어디에도 안 남아 있다');
  ok('[5-a] `verify47` 에서 옛 짝(«ref 32.0 … ↔ 우리 32.0»)이 사라졌다',
    !/ref 32\.0\(좌 30\.1 · 우 33\.9\) ↔ 우리 32\.0/.test(S47));
  ok('[5-b] 그 자리에 **자를 밝힌** 새 과녁문이 들어왔다 (rx = 32 ± 1.6)',
    /원호지수/.test(S47) && /rx = 32\.7 ± 1\.3/.test(S47));
  ok('[5-c] `verify352` 의 `RADIUS` 옆에도 «선언 ≠ ref 반경» 이 적혀 있다',
    /968 \(2026-09-06\)/.test(SV352) && /원호지수/.test(SV352));
  ok('[5-d] 제품 이동은 **970** 으로 등재됐다 (여기서 조용히 옮기지 않았다 · 969 는 등재 경쟁으로 남에게 갔다)',
    /970/.test(S47) && /970/.test(SV352));
  ok('[5-e] 재현기의 새 줄이 [9-r] 규약을 안 깬다 — «셸 바깥 상변에서» 를 쓰지 않는다',
    /원점을 같은 자로: 셸 바깥 상변/.test(S352) && !/원점을 같은 자로[^\n]*셸 바깥 상변에서/.test(S352));

  /* ── [R] 되돌림 — 위 항들이 헛초록이 아니다 ─────────────────────────────── */
  console.log('\n[R] 되돌림 — 옛 읽기로 되돌리면 값이 안 맞는다');
  ok('[R1] 눈금을 그대로 rx 로 읽으면 **대조군이 깨진다** — 참값 30 인 판이 28.0 으로 읽힌다',
    Math.abs(OURS - 30) > 1.5 && Math.abs(toRx(OURS, 3) - 30) < 0.25,
    '눈금 ' + f2(OURS) + ' ↔ 모델 역산 ' + f2(toRx(OURS, 3)));
  ok('[R2] 종횡비를 원(30:30)으로 되돌리면 대조군이 30 을 못 낸다 — 타원이 [1-d] 를 떠받친다',
    (() => { let lo = .5, hi = 3; for (let i = 0; i < 90; i++) { const k = (lo + hi) / 2; if (arcIndex(30 * k, 30 * k, 3) < IDX.capCov) lo = k; else hi = k; } return Math.abs(30 * (lo + hi) / 2 - 30) > 1.5; })());
  ok('[R3] 링 오프셋을 0 으로 되돌려도 마찬가지다 — `top:-3px` 이 [1-b] 를 떠받친다',
    Math.abs(toRx(IDX.capCov, 0) - 30) > 1.5, f2(toRx(IDX.capCov, 0)));
  ok('[R4] 원점 리터럴을 1961 로 되돌리면 cap 이 CSS 항등식에서 **1.00** 벗어난다 (산수로 못박는다)',
    hasCap ? (der.length >= 2 && near((der[1].top - 1) - 23, -1, 0.05)) : true,
    hasCap && der.length >= 2 ? f2(der[1].top - 1) + ' ↔ 항등식 23' : '캡처 없음 — 건너뜀');

  console.log('\nVERIFY968 ' + (tot - bad) + '/' + tot + (bad ? ' FAIL — ' + bad + '건' : ' PASS'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
