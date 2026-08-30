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
    console.log('\n[C] 레퍼런스 불변 — 흡수항은 h ≥ 2009 에서 0 이다');
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

    /* 제품 쪽 선언이 실제로 그 모양인지 — 자가 «다른 길로 우연히 초록» 이 되는 것을 막는다. */
    const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    ok(/#collw\{padding-bottom:calc\(276px \+ clamp\(0px, 2009px - var\(--frameh, 2280px\), 11px\)\)\}/.test(src),
      '[B] 처방이 «연속 흡수항» 그대로다(상수 분기가 아니라 clamp)');
  } finally { await browser.close(); }

  console.log(`\nVERIFY436 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
