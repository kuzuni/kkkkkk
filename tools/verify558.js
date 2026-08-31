#!/usr/bin/env node
/* 558 게이트 — 05 장비 세부 팝업(`#wpnw`)의 **바깥 여백 두 짝**을 못박는다.
 *
 * 실행: node tools/verify558.js
 *
 * 무엇이 결손이었나: 467 이 «띠(위 `.pedge` 하변 142 · 아래 탭바 상변 frameH−180)» 를 갚느라
 * 상자 높이에서 60 을 빼고 가운데 정렬에 맡겼는데, 눌린 프레임(frameH < 1805)에서는 남는 여유가
 * **합 14 뿐**이고 그 14 가 **전부 위로** 갔다 ⇒ 하변이 탭바에 **0.0px 로 맞닿는다**.
 * 351 18회차에서 비평가 셋(DT·DU·DV)이 그 자리를 0 / 1 / 0 으로 갈려 읽은 것이 이 자리다.
 *
 * ⚠ **등재문의 수치는 틀렸고 자가 정정했다**(`tools/probe558.js`, 이 게이트와 같은 질문):
 *   등재문 «위 52 : 아래 0 · HUD 하변 104» → 실측 **«위 14 : 아래 0 · HUD 하변 142»**.
 *   104 는 351 4회차가 «HUD 상자» 에서 «HUD 잉크»(`.pedge` 142)로 통일하며 폐기한 옛 축이다.
 *   ⇒ 나눌 몫은 52 가 아니라 **14** 이고, 처방 ⓑ 는 «26/26» 이 아니라 **«7/7»** 이다.
 *
 * 절:
 *   [0] 선언   — `#wpnw{--wm-sk}` 와 그것을 읽는 패딩이 처방대로 적혀 있는가(문자열)
 *   [1] 나눔   — 눌린 프레임(1600·1779·1798)에서 위·아래 여유가 **7 씩** · 치우침 0 ·
 *                 «아래 여유 ≥ 7» (등재문이 요구한 항)
 *   [2] Δ0     — 2280·1920·1842·1805 는 558 **이전 실측 좌표 그대로**(레퍼런스·467 보존)
 *   [3] 불변   — 상자 높이·본문 넘침·버튼 보임이 558 이전과 같다(«높이 불변» = ⓑ 를 골랐다는 증거)
 *   [4] 연속   — 문턱 1805 를 지나며 튀지 않는다(1806 → 1805 → 1801 → 1798 이 단조·연속)
 *   [R] 되돌림 — `--wm-sk` 를 0 으로 되돌린 사본에서 «아래 여유 0» 이 되살아나고,
 *                 2280 은 되돌려도 **Δ0** 다(문턱 위에서는 이 선언이 원리적으로 안 걸린다)
 *
 * ⚠ 되돌림 사본은 저장소 루트에 둔다(`.v558-neg.html`) — /tmp 에 두면 `assets/**` 가 404 라
 *   레이아웃이 달라진다(360·367·438·439·453·467 선례).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const NEG = path.resolve(__dirname, '../.v558-neg.html');
const R = (n) => Math.round(n * 10) / 10;

let pass = 0, fail = 0;
function ok(c, name, detail) {
  if (c) { pass++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); }
}

/* 측정 한 벌 — probe558·probe467·verify467 과 «같은 질문» 이다(385 자매 드리프트 방지). */
async function shot(browser, file, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(420);
  await page.evaluate(() => { const e = document.querySelector('#eqCards [data-eqslot="weapon"]'); if (e) e.click(); });
  await page.waitForTimeout(520);
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const r = (s) => q(s).getBoundingClientRect();
    const body = q('.wm-body'), bodyR = body.getBoundingClientRect();
    const btn = q('#wpnBtnEq').getBoundingClientRect();
    const cs = getComputedStyle(q('#wpnw'));
    return {
      on: q('#wpnw').classList.contains('on'),
      wm: { y1: r('.wm').top, y2: r('.wm').bottom, h: r('.wm').height },
      tabbarTop: r('#tabbar').top, pedgeBot: r('.pedge').bottom,
      over: body.scrollHeight - body.clientHeight,
      btnVis: btn.height
        ? Math.max(0, Math.min(btn.bottom, bodyR.bottom) - Math.max(btn.top, bodyR.top)) / btn.height * 100
        : 0,
      padT: parseFloat(cs.paddingTop), padB: parseFloat(cs.paddingBottom),
    };
  });
  return { ctx, m, errs };
}

const gapTop = (m) => R(m.wm.y1 - m.pedgeBot);
const gapBot = (m) => R(m.tabbarTop - m.wm.y2);

(async () => {
  const browser = await launch(chromium);
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [0] 선언 ─────────────────────────────────────────────────────────── */
  console.log('[0] 선언 — `--wm-sk` 한 손잡이와 그것을 읽는 패딩');
  ok(/--wm-sk:clamp\(0px, calc\(1805px - var\(--frameh, 2280px\)\), 7px\)/.test(src),
    '[0-a] `#wpnw{--wm-sk:clamp(0px, calc(1805px - var(--frameh,2280px)), 7px)}` — 문턱 1805 · 몫 7');
  ok(/padding:calc\(126px - var\(--wm-sk\)\) 91px calc\(150px \+ var\(--wm-sk\)\)/.test(src),
    '[0-b] 패딩이 «위에서 빼고 아래에 더한다» — 띠 높이(= 100%)는 `sk` 와 무관하다');
  /* ⚑ 상수를 두 곳에 적지 않았는가(385 자매 드리프트). 문턱 1805 는 `.wm` 상한이 걸리기
     시작하는 프레임이고 그 값은 `1469 + 276 + 60` 에서 나온다 — 소스에 1805 는 이 한 자리뿐이다. */
  ok((src.match(/1805px/g) || []).length === 1,
    '[0-c] 문턱 `1805px` 은 소스에 한 번만 적혀 있다(자매 드리프트 방지)',
    String((src.match(/1805px/g) || []).length) + '회');

  /* ── [1] 나눔 · [2] Δ0 · [3] 불변 ─────────────────────────────────────── */
  /* 2280·1920·1842·1805 의 기대값은 **558 이전 실측**이다(probe558 baseline · verify467 [2] 와 같은 표). */
  const KEEP = {
    2280: { wm: [393.5, 1862.5], gap: [251.5, 237.5] },
    1920: { wm: [213.5, 1682.5], gap: [71.5, 57.5] },
    1842: { wm: [174.5, 1643.5], gap: [32.5, 18.5] },
    1805: { wm: [156, 1625], gap: [14, 0] },
  };
  /* 눌린 프레임 — 여유의 **합은 14 로 상수**(상자가 띠를 꽉 채운다)이므로 반 나눔은 7/7 이다. */
  const SPLIT = [1600, 1779, 1798];
  const HEIGHT = { 1600: 1264, 1779: 1443, 1798: 1462 };

  const seen = {};
  console.log('\n[1] 나눔 — 눌린 프레임에서 위·아래 여유 7 씩(합 14 · 치우침 0)');
  for (const h of SPLIT) {
    const { ctx, m, errs } = await shot(browser, SRC, h);
    seen[h] = m;
    ok(m.on && errs.length === 0, `[1-${h}] 팝업이 열리고 pageerror 0`, errs[0] || '');
    ok(gapTop(m) === 7 && gapBot(m) === 7,
      `[1-${h}] 위 7 · 아래 7`, `${gapTop(m)} / ${gapBot(m)}`);
    ok(gapTop(m) + gapBot(m) === 14,
      `[1-${h}] 합 14 — 상자 높이를 안 건드렸다는 뜻(ⓒ «높이 26 줄이기» 를 안 골랐다)`,
      String(gapTop(m) + gapBot(m)));
    ok(gapBot(m) >= 7,
      `[1-${h}] 아래 여유 ≥ 7 — 하변이 탭바에 «맞닿지» 않는다(등재문이 요구한 항)`, String(gapBot(m)));
    ok(R(m.wm.h) === HEIGHT[h] && m.over === 0 && R(m.btnVis) === 100,
      `[1-${h}] 상자 높이·넘침·버튼 보임 불변`,
      `h${R(m.wm.h)}(기대 ${HEIGHT[h]}) · 넘침 ${m.over} · 버튼 ${R(m.btnVis)}%`);
    await ctx.close();
  }

  console.log('\n[2] Δ0 — 문턱(1805) 위 프레임은 558 이전 좌표 그대로');
  for (const h of Object.keys(KEEP).map(Number).sort((a, b) => b - a)) {
    const { ctx, m } = await shot(browser, SRC, h);
    seen[h] = m;
    const e = KEEP[h];
    ok(R(m.wm.y1) === e.wm[0] && R(m.wm.y2) === e.wm[1],
      `[2-${h}] .wm ${e.wm[0]}..${e.wm[1]}`, `${R(m.wm.y1)}..${R(m.wm.y2)}`);
    ok(gapTop(m) === e.gap[0] && gapBot(m) === e.gap[1],
      `[2-${h}] 여유 ${e.gap[0]} / ${e.gap[1]}`, `${gapTop(m)} / ${gapBot(m)}`);
    ok(R(m.padT) === 126 && R(m.padB) === 150,
      `[2-${h}] 패딩 126/150 — 문턱 위에서 ` + '`--wm-sk` 는 0 이다', `${R(m.padT)}/${R(m.padB)}`);
    await ctx.close();
  }

  /* ── [4] 연속 ─────────────────────────────────────────────────────────── */
  /* 문턱에서 26px 씩 튀는 처방(«짧으면 켠다» 식 계단)을 골랐다면 여기가 빨개진다.
     아래 여유는 프레임이 줄수록 0 → 7 로 **단조 증가**하고 그 사이에 계단이 없어야 한다. */
  console.log('\n[4] 연속 — 문턱 1805 를 지나며 튀지 않는다(계단 없음)');
  const RAMP = [1806, 1805, 1803, 1801, 1799, 1798];
  const gb = [];
  for (const h of RAMP) {
    const { ctx, m } = await shot(browser, SRC, h);
    gb.push(gapBot(m));
    await ctx.close();
  }
  console.log('       아래 여유: ' + RAMP.map((h, i) => `${h}→${gb[i]}`).join(' · '));
  /* ⚑ 곡선은 문턱 1805 에서 **V 자**다 — 그리고 그 V 는 558 이 만든 것이 아니다.
     문턱 **위**의 아래 여유는 467 의 가운데 정렬이 정하는 `(frameH − 1805) / 2` 라 프레임이
     짧아질수록 **0 으로 내려가고**, 정확히 1805 에서 0 을 지난다(1806 → 0.5 · 1805 → 0).
     558 이 손댈 수 있는 것은 상한이 걸린 뒤(= 1805 아래)뿐이고 — 위를 같이 들면 1842 Δ0
     (`verify467` [2])이 깨진다 — 거기서부터 0 → 7 로 **올린다**. ⇒ 단조는 문턱 아래에서만 묻고,
     문턱 자신이 유일한 최소(0)라는 것을 [4-d] 가 «558 이전과 같은 값» 으로 못박는다. */
  const below = gb.slice(RAMP.indexOf(1805));
  let mono = true, step = 0;
  for (let i = 1; i < below.length; i++) {
    if (below[i] < below[i - 1]) mono = false;
    step = Math.max(step, R(below[i] - below[i - 1]));
  }
  ok(mono, '[4-a] 문턱 아래(1805 → 1798)에서 프레임이 짧아질수록 아래 여유가 줄지 않는다(단조)');
  ok(step <= 2.5, '[4-b] 이웃 프레임 사이 도약 ≤ 2.5px — 계단이 아니다', `최대 ${step}px`);
  ok(gb[0] === 0.5 && gb[gb.length - 1] === 7,
    '[4-c] 양 끝: 1806 은 0.5(558 이전 값) · 1798 은 7(반 나눔 완성)', `${gb[0]} … ${gb[gb.length - 1]}`);
  ok(Math.min(...gb) === 0 && gb[RAMP.indexOf(1805)] === 0,
    '[4-d] 최소는 문턱 1805 의 0 — 467 곡선이 원래 0 으로 지나는 점이지 558 이 만든 계단이 아니다',
    `최소 ${Math.min(...gb)} @1805 ${gb[RAMP.indexOf(1805)]}`);

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 선언을 빼면 결함이 되살아난다');
  const negs = [
    { id: 'R1', name: '`--wm-sk` 를 0 으로 되돌리면 1600 에서 «아래 여유 0»(탭바에 맞닿음)이 되살아난다',
      apply: (s) => s.replace('--wm-sk:clamp(0px, calc(1805px - var(--frameh, 2280px)), 7px)', '--wm-sk:0px'),
      frame: 1600, check: (m) => gapBot(m) === 0 && gapTop(m) === 14 },
    /* ⚑ R2 는 **양성항이자 구조 증명**이다 — 되돌려도 2280 은 한 픽셀도 안 움직인다.
       «문턱 위에서는 이 선언이 원리적으로 안 걸린다»(clamp 하한 0)를 값으로 못박는다. */
    { id: 'R2', name: '되돌려도 2280 은 Δ0 — 이 선언은 문턱 위에서 원리적으로 0 이다',
      apply: (s) => s.replace('--wm-sk:clamp(0px, calc(1805px - var(--frameh, 2280px)), 7px)', '--wm-sk:0px'),
      frame: 2280, check: (m) => R(m.wm.y1) === 393.5 && R(m.wm.y2) === 1862.5 },
    /* ⚑ R3 는 **반대편 결함**이다 — 몫을 14 로 키우면 이번엔 위가 0 이 되어 HUD 잉크에 맞닿는다.
       «7 이 가운데» 임을 두 방향에서 가둔다(한 방향만 막으면 다음 세션이 값을 키운다). */
    { id: 'R3', name: '몫을 14 로 키우면 이번엔 «위 여유 0»(HUD 잉크에 맞닿음) — 7 이 가운데다',
      apply: (s) => s.replace('var(--frameh, 2280px)), 7px)', 'var(--frameh, 2280px)), 14px)'),
      frame: 1600, check: (m) => gapTop(m) === 0 && gapBot(m) === 14 },
  ];
  for (const n of negs) {
    const out = n.apply(src);
    if (out === src) { ok(false, `[${n.id}] 사본 만들기 — 바꿀 문자열을 못 찾았다(자가 제품에 뒤처졌다)`); continue; }
    fs.writeFileSync(NEG, out);
    const { ctx, m } = await shot(browser, NEG, n.frame);
    ok(n.check(m), `[${n.id}] ${n.name}`,
      `@${n.frame} .wm ${R(m.wm.y1)}..${R(m.wm.y2)} · 위 ${gapTop(m)} / 아래 ${gapBot(m)}`);
    await ctx.close();
    fs.unlinkSync(NEG);
  }

  await browser.close();
  console.log(`\nVERIFY558 ${pass}/${pass + fail}  ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
