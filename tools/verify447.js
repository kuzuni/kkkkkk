#!/usr/bin/env node
/* 447 게이트 — 21 도감(`#collw`) 리본이 HUD 판때기를 무는 구간이 없다.
 *
 * 실행: node tools/verify447.js
 *
 * 무엇을 못박나:
 *   390 은 «리본이 HUD 를 물던 26» 과 «깃발탭이 탭바를 물던 11» 을 **`.shortf`(frameH < 1842)
 *   안에서만** 갚았다. 436 이 아래쪽 11 을 문턱 위로 옮겼고, 447 이 위쪽 26 을 옮긴다.
 *
 * ⚑ **이 자의 본체는 «위를 갚느라 아래가 깨지지 않았다» 는 항이다([B]).**
 *   패딩은 «가운데 정렬» 의 입력이라 위 흡수항 a 는 상자를 **아래로 a/2** 민다. 그래서
 *   등재문의 처방(위만 `clamp(0, 2039 − h, 26)`)은 **2009 ≤ h < 2013 에서 깃발탭 여유를
 *   다시 −11 로 되돌린다** — 위축만 보는 자에게는 그것이 완벽한 초록으로 보인다.
 *   §R2 가 그 경로를 **실제로 주입해** 빨갛게 만든다(= 이 자는 공허하지 않다).
 *
 * 산수(리본 = 상자 상변 − 10 · 깃발탭 = 상자 하변 + 149 · 띠 = 142 … h − 180):
 *   상자가 상한(1543)에 걸린 구간 —  위 gap = a − 26 · 아래 gap = b − 11
 *   상한 밖(가운데 정렬) 구간   —  위 gap = (h + a − b − 2039)/2 · 아래 gap = (h + b − a − 2009)/2
 *   ⇒ 둘이 동시에 0 이상이려면 h ≥ **2024** ⇒ 그 아래는 상자를 반드시 누른다(a = 26 · b = 11).
 *   제품: a = clamp(0, 2050 − h, 26) · b = clamp(0, 2035 − h, 11) — 무릎이 둘 다 2024.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { fresh, settle, drive } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  if (c) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg + (extra !== undefined ? '   → ' + extra : '')); }
};

const OPENER = { sel: '.side .ibtn[data-pop="coll"]' };

/* 한 프레임에서 위·아래 두 축을 **같은 순간**에 읽는다 — 따로 읽으면 두 축이 서로 다른
   프레임의 값이 되어 «위는 갚고 아래는 깼다» 를 못 본다(385 «자매 자 드리프트»). */
const READ = () => {
  const app = document.getElementById('app'), A = app.getBoundingClientRect();
  const L = (v) => Math.round((v - A.top) * 10) / 10;
  const R = (s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { top: L(r.top), bot: L(r.bottom), h: Math.round(r.height * 10) / 10 };
  };
  const host = document.getElementById('collw');
  const cs = host ? getComputedStyle(host) : null;
  const body = document.querySelector('#collw .cl-body');
  const pedge = document.querySelector('.pedge');
  const tabs = document.getElementById('tabbar');
  return {
    frameH: Math.round(A.height),
    on: !!(host && host.classList.contains('on')),
    padT: cs ? Math.round(parseFloat(cs.paddingTop) * 10) / 10 : null,
    padB: cs ? Math.round(parseFloat(cs.paddingBottom) * 10) / 10 : null,
    box: R('#collw .cl'), rib: R('#collw .cl-rib'), tabsBox: R('#collw .cl-tabs'),
    bodyOver: body ? Math.round(body.scrollHeight - body.clientHeight) : null,
    bodyH: body ? Math.round(body.clientHeight) : null,
    pedgeBot: pedge ? Math.round((pedge.getBoundingClientRect().bottom - A.top) * 10) / 10 : null,
    tabsTop: tabs ? Math.round((tabs.getBoundingClientRect().top - A.top) * 10) / 10 : null,
  };
};

/* 되돌림 사본 — §R 에서만 주입한다.
   ⚠ `.shortf`(h < 1842) 는 자기 선언이 따로 있으므로 주입도 그 자리를 같이 덮어야 한다. */
const REVERT_TOP = `
  #collw{padding-top:168px !important}
  #app.shortf #collw{padding-top:168px !important}`;
/* 등재문이 적어 둔 «위만» 처방 — 아래는 436 의 원래 상수(2009) 그대로다. */
const NAIVE = `
  #collw{padding-top:calc(168px + clamp(0px, 2039px - var(--frameh, 2280px), 26px)) !important;
         padding-bottom:calc(276px + clamp(0px, 2009px - var(--frameh, 2280px), 11px)) !important}`;

(async () => {
  const browser = await launch(chromium);
  const seen = [];
  try {
    const measure = async (h, css) => {
      const { ctx, page } = await fresh(browser, 1080, h);
      if (css) await page.addStyleTag({ content: css });
      await settle(page);
      await drive(page, OPENER);
      await page.waitForTimeout(220);
      const d = await page.evaluate(READ).catch(() => null);
      await ctx.close();
      if (d && !css) seen.push(d);
      return d;
    };
    /* 여유는 «둘 다» 낸다 — 한쪽만 보는 자가 이 결함을 만들었다. */
    const gaps = (d) => (d && d.box && d.rib && d.tabsBox && typeof d.pedgeBot === 'number' && typeof d.tabsTop === 'number')
      ? { t: Math.round((d.rib.top - d.pedgeBot) * 10) / 10, b: Math.round((d.tabsTop - d.tabsBox.bot) * 10) / 10 }
      : null;

    /* ── [전제] 자가 무엇을 재고 있는지 ─────────────────────────────────────────── */
    console.log('\n[전제] 재는 자리 — 오버레이가 실제로 열렸고, 리본이 «상자 밖» 부품이다');
    const p19 = await measure(1920);
    ok(p19 && p19.on && p19.box && p19.box.h > 100,
      '[전제] 1920 에서 `#collw` 가 실제로 열렸다(안 열린 화면을 재고 초록을 주지 않는다)',
      p19 ? `on=${p19.on} 상자 h=${p19.box ? p19.box.h : '?'}` : '측정 실패');
    ok(p19 && p19.rib && p19.box && Math.abs((p19.box.top - p19.rib.top) - 10) < 0.6,
      '[전제] 리본이 상자 위로 정확히 10px 삐져나온다(= 이 자리의 바깥선은 상자가 아니다)',
      p19 && p19.rib && p19.box ? `상자 ${p19.box.top} · 리본 ${p19.rib.top}` : '측정 실패');
    const p22 = await measure(2280);
    ok(p19 && p22 && p19.pedgeBot === 142 && p22.pedgeBot === 142,
      '[전제] `.pedge` 하변은 프레임과 무관하게 142 다(기준선이 상수)',
      p19 && p22 ? `1920 ${p19.pedgeBot} · 2280 ${p22.pedgeBot}` : '측정 실패');

    /* ── [A] 위축 — 리본이 HUD 를 안 문다 ───────────────────────────────────────── */
    console.log('\n[A] 리본 상변 ≥ HUD 하변(142) — 390 의 26 을 문턱 위에서도 갚았다');
    const FR = [1842, 1900, 1920, 1987, 1998, 2009, 2013, 2020, 2024, 2035, 2050];
    const got = {};
    for (const h of FR) {
      const d = await measure(h); got[h] = d;
      const g = gaps(d);
      ok(g && g.t >= 0, `[A] @${h} — 리본 여유 ≥ 0`, g ? `gap ${g.t}` : '측정 실패(판정 불가)');
    }
    /* ⚠ 1920 은 `smoke.js` 가 도는 화면비 4종 중 하나(9:16)다 — 표본에서 빠지면 안 된다. */
    ok(FR.includes(1920), '[A] 표본에 1080×1920(9:16)이 들어 있다');

    /* ── [B] 아래축 — 위를 갚느라 436 이 갚은 자리를 깨지 않았다 ────────────────── */
    console.log('\n[B] 깃발탭 하변 ≤ 탭바 상변 — 같은 프레임에서 «동시에» 참이다');
    for (const h of FR) {
      const g = gaps(got[h]);
      ok(g && g.b >= 0, `[B] @${h} — 깃발탭 여유 ≥ 0`, g ? `gap ${g.b}` : '측정 실패(판정 불가)');
    }

    /* ── [C] 임계 점프 0 — 415 가 `--pfsh` 로 피한 사고를 안 만든다 ─────────────── */
    console.log('\n[C] 임계 점프 — 경계에서 여유가 안 튄다(연속 흡수항의 증거)');
    for (const [a, b] of [[1841, 1842], [2023, 2024], [2050, 2051]]) {
      const da = await measure(a), db = got[b] || await measure(b);
      const ga = gaps(da), gb = gaps(db);
      ok(ga && gb && Math.abs(ga.t - gb.t) <= 1 && Math.abs(ga.b - gb.b) <= 1,
        `[C] ${a} ↔ ${b} 에서 위·아래 여유가 안 튄다(≤ 1px)`,
        ga && gb ? `위 ${ga.t}→${gb.t} · 아래 ${ga.b}→${gb.b}` : '측정 실패');
    }

    /* ── [D] 레퍼런스 불변 — 흡수항은 h ≥ 2050 에서 0 이다 ─────────────────────── */
    console.log('\n[D] 레퍼런스 불변 — 2100·2280·2600 은 Δ0px');
    for (const [h, want] of [[2100, 182.5], [2280, 272.5], [2600, 432.5]]) {
      const d = h === 2280 ? p22 : await measure(h);
      ok(d && d.box && Math.abs(d.box.top - want) < 0.6,
        `[D] ${h} \`.cl\` 상변 ${want} (8220행 검산값 계열) Δ0px`, d && d.box ? d.box.top : '측정 실패');
      ok(d && d.padT === 168 && d.padB === 276, `[D] ${h} 패딩이 기본값 168/276 그대로다`,
        d ? `${d.padT}/${d.padB}` : '측정 실패');
    }

    /* ── [E] 반대급부 — 상자를 누른 만큼만 누르고, 본문은 스크롤로 닿는다 ────────── */
    console.log('\n[E] 반대급부(351-③ «이중 차감») — 띠에 묶인 상자 · 본문은 잘리지 않는다');
    ok(got[1920] && got[1920].box && Math.abs(got[1920].box.h - (1920 - 481)) < 1,
      '[E] 1920 상자 높이 = 프레임 − 481(= 142 위 + 180 탭바 + 리본 10 + 깃발탭 149) — 띠에 정확히 꽉 찼다',
      got[1920] && got[1920].box ? `${got[1920].box.h} vs ${1920 - 481}` : '측정 실패');
    ok(got[1920] && got[1920].bodyOver > 0 && got[1920].bodyH > 900,
      '[E] 1920 목록 그릇이 살아 있다(스크롤 가능 · 높이 > 900) — 눌렀지 «없앤» 게 아니다',
      got[1920] ? `그릇 ${got[1920].bodyH} · 넘침 ${got[1920].bodyOver}` : '측정 실패');
    const b19 = await measure(1920, REVERT_TOP);
    ok(b19 && got[1920] && Math.abs((b19.box.h - got[1920].box.h) - 26) < 1,
      '[E] 그 대가는 정확히 26px 이다(흡수항을 빼면 상자가 26 커진다 = 390 이 `.shortf` 에서 이미 낸 값)',
      b19 && got[1920] ? `${b19.box.h} → ${got[1920].box.h}` : '측정 실패');

    /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 두 항이 각각 «공허하지 않다»');
    const gR1 = gaps(b19);
    ok(gR1 && gR1.t <= -25.5 && gR1.t >= -26.5,
      '[R1] 위 흡수항을 뺀 사본은 1920 에서 리본 여유가 −26 이다(등재문 실측값)',
      gR1 ? `gap ${gR1.t}` : '측정 실패');
    /* ⚑ 이 자의 본체 — «위만 갚는» 등재문 처방을 실제로 주입해 아래축을 깨 본다. */
    const nv = await measure(2009, NAIVE);
    const gR2 = gaps(nv);
    ok(gR2 && gR2.b <= -10.5 && gR2.b >= -11.5,
      '[R2] «위만» 처방(2039/26 + 436 의 2009/11)은 2009 에서 깃발탭 여유가 −11 이다 — 위·아래는 한 축이다',
      gR2 ? `위 ${gR2.t} · 아래 ${gR2.b}` : '측정 실패');
    const nv13 = await measure(2013, NAIVE);
    const gR3 = gaps(nv13);
    ok(gR3 && gR3.b < 0, '[R2] 같은 사본이 2013 에서도 아래축을 깬다(한 프레임의 우연이 아니다)',
      gR3 ? `아래 ${gR3.b}` : '측정 실패');
    const back = await measure(2009);
    const gR4 = gaps(back);
    ok(gR4 && gR4.t >= 0 && gR4.b >= 0,
      '[R3] 주입을 걷으면 같은 프레임이 다시 초록이다(주입이 새지 않았다)',
      gR4 ? `위 ${gR4.t} · 아래 ${gR4.b}` : '측정 실패');

    /* ── [S] 제품 선언 — «다른 길로 우연히 초록» 을 막는다 ──────────────────────── */
    console.log('\n[S] 제품 선언 — 연속 흡수항 두 항이 같은 무릎에서 끝난다');
    const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const mT = src.match(/#collw\{padding-top:calc\(168px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\);/);
    const mB = src.match(/padding-bottom:calc\(276px \+ clamp\(0px, (\d+)px - var\(--frameh, 2280px\), (\d+)px\)\)\}/);
    ok(!!mT, '[S] 위 흡수항이 clamp 다(상수 분기가 아니다)', mT ? mT[0] : '없음');
    ok(!!mT && +mT[2] === 26, '[S] 위 흡수량이 390 의 26 그대로다', mT ? mT[2] : '못 읽음');
    ok(!!mT && !!mB && +mT[1] - +mT[2] === +mB[1] - +mB[2] && +mT[1] - +mT[2] === 2024,
      '[S] 두 흡수항의 무릎이 2024 로 같다(위·아래 조건이 동시에 참이 되는 최소 프레임)',
      mT && mB ? `위 ${+mT[1] - +mT[2]} · 아래 ${+mB[1] - +mB[2]}` : '못 읽음');
    /* «검사한 수» 를 같이 찍는다 — 표본이 조용히 0 이 되면 위 항들이 전부 헛초록이다(357 처방). */
    ok(seen.length >= FR.length + 3, '[S] 위 항들이 실제로 여러 프레임을 돌았다(표본 수 ≥ 프레임 수)',
      `표본 ${seen.length} · 프레임 ${FR.length}`);
  } finally { await browser.close(); }

  console.log(`\nVERIFY447 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
