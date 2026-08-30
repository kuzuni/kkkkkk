#!/usr/bin/env node
/* 467 게이트 — 05 장비 세부 팝업(`#wpnw`)이 «짧은 프레임에서도 주 행동 버튼을 스크롤 0 에서
 * 100% 보인다» 와 «탭바·HUD 판때기·미션 배너를 안 파고든다» 를 못박는다.
 *
 * 실행: node tools/verify467.js
 *
 * 왜 이 축인가: 351 재지시 ①(주인 지시 2026-08-29)이 «스크롤로 닿으면 감점 아님» 을 폐기하고
 * 주 CTA 에 «스크롤 0 에서 100%» 를 요구한다. 14회차 3인(DE·DF·DG) 최저 전원 2 — 이 루프 최저점.
 *
 * 절:
 *   [0] 선언   — 다섯 자리가 처방대로 적혀 있는가(문자열)
 *   [1] 기하   — 프레임 4종 실측: 버튼 보임 100% · 넘침 0 · 탭바/HUD 침범 0 · 배너 숨김
 *   [2] Δ0     — 2280·1920·1842 는 수리 전과 **같은 좌표**여야 한다(레퍼런스 보존)
 *   [3] 간격   — 격자 아래 세 간격(30/29/32)이 프레임과 무관하게 보존된다
 *   [4] 도달   — 1600 에서도 격자 40칸 마지막 칸에 스크롤로 닿는다(`verify186` [D] 의 짧은 프레임 짝)
 *   [R] 되돌림 — 선언을 하나씩 뺀 사본에서 결함이 **되살아난다**(무르게 푼 수리가 아님)
 *
 * ⚠ 되돌림 사본은 저장소 루트에 둔다(`.v467-neg.html`) — /tmp 에 두면 `assets/**` 가 통째로
 *   404 라 레이아웃이 달라진다(360·367·438·439·453 선례).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const NEG = path.resolve(__dirname, '../.v467-neg.html');
const R = (n) => Math.round(n * 10) / 10;

let pass = 0, fail = 0;
function ok(c, name, detail) {
  if (c) { pass++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); }
}

/* ── 측정 한 벌 — probe467 과 «같은 질문» 이다(385 자매 드리프트를 피하려고 값의 뜻을 맞춘다) */
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
    const vis = (s) => {
      const b = r(s);
      return { y1: b.top, y2: b.bottom, h: b.height,
        vis: Math.max(0, Math.min(b.bottom, bodyR.bottom) - Math.max(b.top, bodyR.top)) };
    };
    const tuto = q('#tuto');
    const grid = q('#wpnGrid');
    return {
      on: q('#wpnw').classList.contains('on'),
      wm: { y1: r('.wm').top, y2: r('.wm').bottom, h: r('.wm').height },
      body: { y1: bodyR.top, y2: bodyR.bottom, sh: body.scrollHeight, ch: body.clientHeight, st: body.scrollTop },
      inH: r('.wm-in').height, inBot: r('.wm-in').bottom,
      grid: { y1: grid.getBoundingClientRect().top, y2: grid.getBoundingClientRect().bottom, h: grid.clientHeight },
      tot: vis('.wm-tot'),
      b1: vis('#wpnBtnEq'), b2: vis('#wpnBtnUp'),
      btnOff: q('#wpnBtnEq').offsetTop,
      tabbarTop: r('#tabbar').top, pedgeBot: r('.pedge').bottom,
      tutoShown: !!tuto && getComputedStyle(tuto).display !== 'none',
      cells: grid.children.length,
    };
  });
  return { ctx, page, m, errs };
}

const covTab = (m) => R(Math.max(0, m.wm.y2 - m.tabbarTop));
const covHud = (m) => R(Math.max(0, m.pedgeBot - m.wm.y1));
const visPct = (b) => (b.h ? R(b.vis / b.h * 100) : 0);

(async () => {
  const browser = await launch(chromium);
  const css = fs.readFileSync(SRC, 'utf8');

  /* ── [0] 선언 ─────────────────────────────────────────────────────────── */
  console.log('\n[0] 선언 — 처방 다섯 자리');
  ok(/\.wm\{[^}]*max-height:calc\(100% - 60px\)/.test(css),
    '[0-a] `.wm{max-height:calc(100% - 60px)}` — 탭바 30 을 가운데 정렬이 두 번 치른다');
  ok(/\.wm-in\{[^}]*height:min\(1347px, 100%\)/.test(css),
    '[0-b] `.wm-in{height:min(1347px,100%)}` — 콘텐츠 = 뷰포트(403·404 축)');
  ok(/\.wm-grid\{[^}]*height:calc\(100% - 726px\)/.test(css),
    '[0-c] `.wm-grid{height:calc(100% - 726px)}` — 남는 높이는 격자가 흡수');
  ok(/\.wm-tot\{[^}]*bottom:192px/.test(css) && !/\.wm-tot\{[^}]*top:1109px/.test(css),
    '[0-d] `.wm-tot` 앵커가 아래(192)로 뒤집혔다');
  ok(/\.wm-btn\{[^}]*bottom:32px/.test(css) && !/\.wm-btn\{[^}]*top:1184px/.test(css),
    '[0-e] `.wm-btn` 앵커가 아래(32)로 뒤집혔다');
  ok(/#app:has\(:is\([^)]*#wpnw[^)]*\)\.on\) #tuto\{display:none\}/.test(css),
    '[0-f] 419 배너 숨김 목록에 `#wpnw` 가 있다');

  /* ── [1] 기하 · [2] Δ0 · [3] 간격 ─────────────────────────────────────── */
  /* 2280·1920·1842 의 기대값은 **수리 전 실측**이다(probe467 baseline, 351 14회차 표와 같다). */
  const REF = {
    2280: { wm: [393.5, 1862.5], btn: [1678.5, 1809.5], grid: 621 },
    1920: { wm: [213.5, 1682.5], btn: [1498.5, 1629.5], grid: 621 },
    1842: { wm: [174.5, 1643.5], btn: [1459.5, 1590.5], grid: 621 },
  };
  console.log('\n[1] 기하 — 프레임 4종(2280·1920·1842·1600)');
  const seen = {};
  for (const h of [2280, 1920, 1842, 1600]) {
    const { ctx, m, errs } = await shot(browser, SRC, h);
    seen[h] = m;
    ok(m.on, `[1-${h}] 팝업이 열렸다`);
    ok(visPct(m.b1) === 100 && visPct(m.b2) === 100,
      `[1-${h}] 주 행동 버튼 2개 — 스크롤 0 에서 100% 보임`,
      `[장착] ${visPct(m.b1)}% · [일괄 강화] ${visPct(m.b2)}%`);
    ok(m.body.st === 0, `[1-${h}] 스크롤 0 에서 잰 값이다`, 'scrollTop ' + m.body.st);
    ok(m.body.sh - m.body.ch === 0, `[1-${h}] 본문 넘침 0`,
      `sh/ch ${m.body.sh}/${m.body.ch}`);
    ok(covTab(m) === 0, `[1-${h}] `.padEnd(0) + `.wm 이 탭바(상변 ${R(m.tabbarTop)})를 안 파고든다`,
      `하변 ${R(m.wm.y2)} · 침범 ${covTab(m)}`);
    ok(covHud(m) === 0, `[1-${h}] .wm 이 HUD 판때기(하변 ${R(m.pedgeBot)})를 안 파고든다`,
      `상변 ${R(m.wm.y1)} · 침범 ${covHud(m)}`);
    ok(!m.tutoShown, `[1-${h}] 미션 배너는 팝업이 열린 동안 숨는다(419)`);
    ok(visPct(m.tot) === 100, `[1-${h}] «총 보유 효과» 줄도 100% 보인다`, visPct(m.tot) + '%');
    await ctx.close();
  }

  console.log('\n[2] Δ0 — 기준 프레임의 좌표는 수리 전과 같아야 한다');
  for (const h of [2280, 1920, 1842]) {
    const m = seen[h], e = REF[h];
    ok(R(m.wm.y1) === e.wm[0] && R(m.wm.y2) === e.wm[1],
      `[2-${h}] .wm ${e.wm[0]}..${e.wm[1]}`, `${R(m.wm.y1)}..${R(m.wm.y2)}`);
    ok(R(m.b1.y1) === e.btn[0] && R(m.b1.y2) === e.btn[1],
      `[2-${h}] 버튼 ${e.btn[0]}..${e.btn[1]}`, `${R(m.b1.y1)}..${R(m.b1.y2)}`);
    ok(m.grid.h === e.grid, `[2-${h}] 격자 높이 ${e.grid}`, String(m.grid.h));
    ok(m.inH === 1347, `[2-${h}] .wm-in 높이 1347`, String(R(m.inH)));
    ok(m.btnOff === 1184, `[2-${h}] 버튼 offsetTop 1184 (verify171 이 묻는 값)`, String(m.btnOff));
  }

  /* 격자가 흡수해도 그 **아래** 세 간격은 한 픽셀도 안 움직인다 — 이것이 «격자만 흡수한다» 의 뜻이다. */
  /* ⚠ 마지막 간격의 기준은 «본문 그릇 하변» 이 아니라 **`.wm-in` 하변**이다 — 긴 프레임에서는
     그릇(1352)이 래퍼(1347)보다 5px 크다(그 5px 은 원래부터 있던 여백이고 이 작업과 무관하다). */
  console.log('\n[3] 간격 — 격자 하변→총효과 30 · 총효과 하변→버튼 29 · 버튼 하변→래퍼 32');
  for (const h of [2280, 1920, 1842, 1600]) {
    const m = seen[h];
    const g1 = R(m.tot.y1 - m.grid.y2), g2 = R(m.b1.y1 - m.tot.y2), g3 = R(m.inBot - m.b1.y2);
    ok(g1 === 30 && g2 === 29 && g3 === 32, `[3-${h}] 간격 30/29/32`, `${g1}/${g2}/${g3}`);
  }

  /* ── [4] 도달 — 짧은 프레임에서도 40칸 마지막 칸에 스크롤로 닿는다 ────── */
  console.log('\n[4] 도달 — 1600 에서 격자 마지막 칸');
  {
    const { ctx, page, m } = await shot(browser, SRC, 1600);
    const D = await page.evaluate(async () => {
      const g = document.getElementById('wpnGrid');
      g.scrollTop = g.scrollHeight;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const last = g.children[g.children.length - 1];
      const lr = last.getBoundingClientRect(), gr = g.getBoundingClientRect();
      return { n: g.children.length, inside: lr.bottom <= gr.bottom + 1 && lr.top >= gr.top - 1 };
    });
    ok(m.cells === 40, '[4-a] 격자 40칸', String(m.cells));
    ok(D.inside, '[4-b] 마지막 칸이 스크롤 끝에서 격자 안에 온전히 들어온다');
    await ctx.close();
  }

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 선언을 빼면 결함이 되살아난다');
  const negs = [
    /* R1 은 **수리 전 트리 그대로**다 — 두 선언을 같이 되돌려 351 14회차가 실측한 값
       (1600 넘침 140 · 버튼 17.6%)을 그대로 재현한다. 이 값이 안 나오면 자가 다른 것을 재고 있다. */
    { id: 'R1', name: '두 선언을 같이 되돌리면 = 수리 전(1600 넘침 140 · 버튼 17.6%)',
      apply: (s) => s.replace('height:min(1347px, 100%)}', 'height:1347px}')
        .replace('max-height:calc(100% - 60px)', 'max-height:100%'),
      check: (m) => m.body.sh - m.body.ch === 140 && visPct(m.b1) === 17.6 },
    /* R1b — 흡수만 빼고 띠 수리는 남긴다. 띠를 갚느라 60px 을 더 내놓았으므로 넘침이 200 으로
       **커지고** 버튼은 0% 다 = «띠 수리의 값은 격자 흡수가 치른다» 를 값으로 못박는다. */
    { id: 'R1b', name: '흡수만 빼면 넘침이 140 → 200 으로 커지고 버튼은 0%',
      apply: (s) => s.replace('height:min(1347px, 100%)}', 'height:1347px}'),
      check: (m) => m.body.sh - m.body.ch === 200 && visPct(m.b1) === 0 },
    { id: 'R2', name: '`.wm{max-height:100%}` 로 되돌리면 1600 탭바 30 · HUD 16 침범',
      apply: (s) => s.replace('max-height:calc(100% - 60px)', 'max-height:100%'),
      check: (m) => covTab(m) === 30 && covHud(m) === 16 },
    { id: 'R3', name: '419 목록에서 `#wpnw` 를 빼면 배너가 팝업 밑에 다시 깔린다',
      apply: (s) => s.replace('#specw,#cfw,#wpnw).on) #tuto', '#specw,#cfw).on) #tuto'),
      check: (m) => m.tutoShown },
    /* ⚑ R4 는 «양성항» 이다 — 격자 흡수를 빼고 `.wm-in` 만 줄이면 버튼이 그릇 **위로** 밀려
       올라가 총효과·버튼이 격자와 겹친다. 흡수처를 안 정하면 병이 자리만 옮긴다는 것을 못박는다. */
    { id: 'R4', name: '격자 흡수(`calc(100% - 726px)`)만 빼면 격자가 총효과·버튼을 덮는다',
      apply: (s) => s.replace('height:calc(100% - 726px);border-radius:22px', 'height:621px;border-radius:22px'),
      check: (m) => m.grid.y2 > m.tot.y1 },
  ];
  for (const n of negs) {
    const src = fs.readFileSync(SRC, 'utf8');
    const out = n.apply(src);
    if (out === src) { ok(false, `[${n.id}] 사본 만들기 — 바꿀 문자열을 못 찾았다(자가 제품에 뒤처졌다)`); continue; }
    fs.writeFileSync(NEG, out);
    const { ctx, m } = await shot(browser, NEG, 1600);
    ok(n.check(m), `[${n.id}] ${n.name}`,
      `넘침 ${m.body.sh - m.body.ch} · 버튼 ${visPct(m.b1)}% · 탭바 ${covTab(m)} · HUD ${covHud(m)} · 배너 ${m.tutoShown ? '보임' : '숨김'} · 격자하변 ${R(m.grid.y2)} ↔ 총효과 ${R(m.tot.y1)}`);
    await ctx.close();
    fs.unlinkSync(NEG);
  }

  await browser.close();
  console.log(`\nVERIFY467 ${pass}/${pass + fail}  ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
