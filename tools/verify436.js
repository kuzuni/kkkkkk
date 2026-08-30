#!/usr/bin/env node
/* 436 게이트 — «오버레이 하변 ↔ 고정 내비 상변» 여유가 **어느 프레임에서도 음수가 아니다**.
 *
 * 실행: node tools/verify436.js
 *
 * 이 자가 지키는 것 두 가지 (둘이 서로 다른 축이다 — 섞지 마라):
 *
 *  [A] **390 의 띠는 «꽉 참»(gap 0.0)이 정상이고, 그것은 고정점이다.**
 *      436 이 등재문의 «0.0 인 셋은 다음 414·415 다» 를 재현으로 기각한 근거가 이 절이다.
 *      셋 다 `max-height:…100%` 로 띠에 묶여 있어 **프레임이 짧아지면 상자가 같이 줄고 gap 은
 *      0.0 에 머문다.** 그러니 여기서 지켜야 할 것은 «0.0 이라는 값» 이 아니라 **«음수가 아니다»** 다.
 *      ⚠ 값 자체(0.0)를 단언하면 «띠를 넓혀 여유를 준 개선» 까지 빨개진다 — 부호만 묻는다.
 *
 *  [B] **390 이 `.shortf` 안에서만 갚은 11px 이 문턱 위에 남아 있던 것**(436 이 고친 자리).
 *      `side:coll` 깃발 서브탭 `.cl-tabs` 가 1842 ≤ frameH < 2009 에서 탭바를 **11px** 파고들었다.
 *      ⚑ 그 구간에 **1080×1920(9:16)** 이 들어 있고 `smoke.js` 412행이 도는 화면비 4종 중 하나다.
 *      ⚑ **351 의 2해상도 차분(2280 ↔ 1600)은 이 자리를 원리적으로 못 본다** — 양 끝이 둘 다
 *         음수가 아니라(135.5 · 0.0) 차분에서 소거된다. 그래서 이 자는 **프레임 축**으로 훑는다.
 *
 *  [R] **되돌림 시험** — 무르게 푼 수리가 아님을 못박는다(334·348 처방).
 *      처방한 흡수항을 뺀 사본을 주입하면 1920 에서 `.cl-tabs` 가 **다시 −11** 이어야 한다.
 *      이 절이 빨개지면 [B] 는 «이미 참인 것을 굳힌 항» 이라는 뜻이다.
 *
 *  [C] **레퍼런스 불변** — 흡수항은 `h ≥ 2009` 에서 0 이므로 2280·2600 은 Δ0px 여야 한다.
 *      (LESSONS 351-③ — 패딩은 «가운데 정렬» 의 입력이라 상수를 더하면 상자가 통째로 움직인다.
 *       index.html 8220행 검산 «.cl top 272.5» 가 그 값이다.)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const { fresh, settle, collectOpeners, drive } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  if (c) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg + (extra !== undefined ? '   → ' + extra : '')); }
};

/* 한 프레임에서 «상자 하변 ↔ 탭바 상변» 여유를 잰다. */
const GAP = function (sel) {
  const tb = document.getElementById('tabbar');
  const el = document.querySelector(sel);
  if (!tb || !el) return null;
  const t = tb.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { gap: Math.round((t.top - r.bottom) * 10) / 10,
           top: Math.round(r.top * 10) / 10,
           bottom: Math.round(r.bottom * 10) / 10,
           h: Math.round(r.height * 10) / 10 };
};

(async () => {
  const browser = await launch(chromium);
  try {
    const openers = await collectOpeners(browser);
    const find = (l) => openers.find((o) => o.label === l);

    const measure = async (label, sel, h, css) => {
      const o = find(label);
      if (!o) return null;
      const { ctx, page } = await fresh(browser, 1080, h);
      if (css) await page.addStyleTag({ content: css });
      await drive(page, o);
      await settle(page);
      const r = await page.evaluate(GAP, sel).catch(() => null);
      await ctx.close();
      return r;
    };

    /* ── [A] 390 의 띠 — 셋 다 «음수가 아니다» 를 짧은 프레임 전 구간에서 ────────────── */
    console.log('\n[A] 390 의 띠 — 여유 0.0 은 고정점이다(음수로 안 내려간다)');
    for (const [label, sel] of [['side:quest', '#modal .mbox'], ['menu:conf', '.cf55'], ['side:coll', '.cl-tabs']]) {
      for (const h of [1600, 1700, 1841]) {
        const r = await measure(label, sel, h);
        ok(r && r.gap >= 0, `[A] ${label} ${sel} @${h} — 여유 ≥ 0`, r ? `gap ${r.gap}` : '측정 실패');
      }
    }
    /* ⚑ **띠에 묶여 있다는 것 자체**를 묻는 항 — 프레임이 줄면 상자도 줄어야 한다.
       이것이 «고정점» 판정의 본체다(높이가 고정이면 414·415 처럼 음수로 넘어간다). */
    for (const [label, sel] of [['side:quest', '#modal .mbox'], ['menu:conf', '.cf55']]) {
      const a = await measure(label, sel, 1600);
      const b = await measure(label, sel, 1700);
      ok(a && b && b.h > a.h, `[A] ${label} ${sel} — 프레임이 100 늘면 상자도 늘어난다(띠에 묶여 있다)`,
        a && b ? `1600 h${a.h} → 1700 h${b.h}` : '측정 실패');
    }

    /* ── [B] 436 이 고친 자리 — 문턱 위 11px ─────────────────────────────────────── */
    console.log('\n[B] `.cl-tabs` — 390 이 `.shortf` 안에서만 갚은 11px 이 문턱 위에도 갚였다');
    for (const h of [1842, 1900, 1920, 1987, 1998, 2009]) {
      const r = await measure('side:coll', '.cl-tabs', h);
      ok(r && r.gap >= 0, `[B] side:coll .cl-tabs @${h} — 여유 ≥ 0`, r ? `gap ${r.gap}` : '측정 실패');
    }
    /* 문턱(1842)에서 이어지는가 — 임계 점프가 있으면 415 가 `--pfsh` 로 피한 그 사고다. */
    const j1 = await measure('side:coll', '.cl-tabs', 1841);
    const j2 = await measure('side:coll', '.cl-tabs', 1842);
    ok(j1 && j2 && Math.abs(j1.gap - j2.gap) <= 1,
      '[B] `.shortf` 문턱 1841↔1842 에서 여유가 안 튄다(임계 점프 ≤ 1px)',
      j1 && j2 ? `1841 gap ${j1.gap} ↔ 1842 gap ${j2.gap}` : '측정 실패');

    /* ── [C] 레퍼런스 불변 ────────────────────────────────────────────────────── */
    console.log('\n[C] 레퍼런스 불변 — 흡수항은 h ≥ 2050 에서 0 이다(447 이관 전 2009)');
    const ref = await measure('side:coll', '.cl', 2280);
    ok(ref && Math.abs(ref.top - 272.5) < 0.6, '[C] 2280 `.cl` 상변 272.5 (8220행 검산값) Δ0px', ref ? ref.top : '측정 실패');
    const ref26 = await measure('side:coll', '.cl', 2600);
    ok(ref26 && Math.abs(ref26.top - 432.5) < 0.6, '[C] 2600 `.cl` 상변 432.5 Δ0px', ref26 ? ref26.top : '측정 실패');

    /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 흡수항을 빼면 1920 에서 다시 −11 이어야 한다');
    const REVERT = '#collw{padding-bottom:276px !important}';
    const rv = await measure('side:coll', '.cl-tabs', 1920, REVERT);
    ok(rv && rv.gap <= -10.5 && rv.gap >= -11.5,
      '[R] 흡수항을 뺀 사본은 1920 에서 `.cl-tabs` 여유가 −11 이다(= 이 항은 공허하지 않다)',
      rv ? `gap ${rv.gap}` : '측정 실패');
    /* 되돌림이 **원본을 안 건드렸다**는 검산 — 같은 프레임을 주입 없이 다시 재면 0 이상이다. */
    const rv2 = await measure('side:coll', '.cl-tabs', 1920);
    ok(rv2 && rv2.gap >= 0, '[R] 주입을 걷으면 같은 프레임이 다시 초록이다(주입이 새지 않았다)',
      rv2 ? `gap ${rv2.gap}` : '측정 실패');

    /* 제품 쪽 선언이 실제로 그 모양인지 — 자가 «다른 길로 우연히 초록» 이 되는 것을 막는다.
       ⚑ **447 이관(2026-08-30)** — 447 이 같은 규칙의 **위쪽**에도 흡수항을 붙이면서 아래쪽 상수가
       2009 → **2035** 로 옮겨졌다(위 흡수항 a 가 상자를 아래로 a/2 밀어 «상자가 상한에 걸리는»
       구간이 26 늘어난다 ⇒ 아래 11 도 그만큼 더 오래 내야 한다. 안 옮기면 2009 ≤ h < 2013 에서
       `.cl-tabs` 가 다시 −11 이 된다 — 실제로 447 1회차가 그 경로를 산수로 기각했다).
       ⚠ **낡은 상수를 빼서 초록으로 돌리지 않았다** — 항을 **더 조였다**: 두 흡수항이 **같은 무릎**
       (2050 − 26 = 2035 − 11 = **2024**)에서 끝난다는 것까지 묻는다. 그 짝이 어긋나면 위·아래
       조건(h + a − b ≥ 2039 · h + b − a ≥ 2009)이 동시에 성립하는 구간이 갈라져 한쪽이 음수가 된다. */
    const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const mTop = src.match(/#collw\{padding-top:calc\(168px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\);/);
    const mBot = src.match(/padding-bottom:calc\(276px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\)\}/);
    ok(!!mTop && !!mBot, '[B] 처방이 «연속 흡수항» 그대로다(상수 분기가 아니라 clamp — 위·아래 두 항)',
      `위 ${mTop ? mTop[0] : '없음'} · 아래 ${mBot ? mBot[0] : '없음'}`);
    /* ⚑ **451 이관(2026-08-30)** — 위 흡수량이 26 → **38** 이 됐다(390 의 26 + 451 이 이 이음매에
       준 «햇빛» 12). 436 이 지키는 것은 **아래축**이므로 위 값을 리터럴로 붙잡을 이유가 없다:
       아래 11 만 그대로 묻고, 위는 «390 의 26 이상» 으로 바닥만 지킨다(그 아래로 내려가면
       447 이 되살아난다). 이렇게 갈라야 위쪽 정책이 또 바뀌어도 이 자가 헛빨강을 안 낸다. */
    ok(!!mTop && !!mBot && +mTop[2] >= 26 && +mBot[2] === 11,
      '[B] 아래 흡수량이 390 이 `.shortf` 에서 낸 11 그대로다(위는 26 이상 — 451 이 12 를 더했다)',
      mTop && mBot ? `위 ${mTop[2]} · 아래 ${mBot[2]}` : '못 읽음');
    /* ⚠ **무릎 리터럴(2024)을 새 리터럴(2036)로 갈아 끼우지 않았다** — 넷을 낳는 항등식을 묻는다.
       무릎 = 1987 + A + B · Xa = 1987 + 2A + B · Xb = 1987 + A + 2B.
       검산: 447 당시 26/11 → 2024·2050·2035 ✔ · 451 뒤 38/11 → 2036·2074·2047 ✔ (둘 다 초록). */
    const A2 = mTop ? +mTop[2] : null, B2 = mBot ? +mBot[2] : null;
    ok(!!mTop && !!mBot && +mTop[1] - A2 === +mBot[1] - B2 && +mTop[1] - A2 === 1987 + A2 + B2,
      '[B] 두 흡수항의 «무릎» 이 같고 그 값이 «1987 + A + B» 다(리터럴이 아니라 항등식)',
      mTop && mBot ? `위 ${+mTop[1] - A2} · 아래 ${+mBot[1] - B2} · 1987+A+B ${1987 + A2 + B2}` : '못 읽음');
    ok(!!mTop && !!mBot && +mTop[1] === 1987 + 2 * A2 + B2 && +mBot[1] === 1987 + A2 + 2 * B2,
      '[B] 두 상수가 그 무릎에서 파생됐다(Xa = 1987+2A+B · Xb = 1987+A+2B)',
      mTop && mBot ? `Xa ${+mTop[1]} vs ${1987 + 2 * A2 + B2} · Xb ${+mBot[1]} vs ${1987 + A2 + 2 * B2}` : '못 읽음');
  } finally { await browser.close(); }

  console.log(`\nVERIFY436 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
