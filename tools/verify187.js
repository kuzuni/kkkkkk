/* 작업 187 게이트 — 12 소환 결과 팝업의 결과 그리드를 «보이는 행 2배» 로.
   실행: node tools/verify187.js

   주인 지시(2026-08-27): «소환 결과 30개 뽑으면 가려짐 — 결과 부분이 작아서, 2배 정도로».
   처방: 그리드 높이를 **결과 행수에 따라** 늘린다(`--sm-gh`).
     · 2행 이하 335  = 레퍼런스 케이스, 픽셀 Δ0   (패널 539 · 하변 1248)
     · 3행      506                               (패널 710 · 하변 1419)
     · 4행 이상 676  = 보이는 행 2→4 (상한)       (패널 880 · 하변 1589)
   한 행 = 카드 158 + gap 12 = pitch 170 · n행 높이 = 170n − 12 + 배지돌출 8 = 170n − 4.

   상한 676 의 근거 — 84 가 정한 하단 앵커를 건드리지 않고 «패널 하변 + 20 ≤ 버튼 상변» 을 지킨다.
   버튼 상변 = 프레임H − 426 − 148 이므로 패널 최대 높이 = 100% − 1303.
   2280 프레임에서는 977 이 나오지만 «2배» 상한 880 이 먼저 걸린다.

   ⚠ 여기서 재는 것은 «커졌다» 가 아니라 **커진 만큼 84·12 의 자리가 그대로인가** 다.
      그래서 A 절(10연 회귀)이 이 파일의 절반이다.

   ══ 작업 327(2026-08-28) 이 위 처방을 **대체했다** — 값은 전부 327 것으로 갈아 끼웠다 ══
   주인 재지시: «소환결과가 창이 너무 작음. 걍 세로로 2배 정도 늘리던지 해라».
   187 의 «행수 가변» 은 두 가지를 놓쳤다 —
     ① 중복이 개수로 합쳐지는 흔한 결과는 계속 ref 크기(539)였고(주인이 «또» 작다고 한 쪽),
     ② 상한 676(4행)이라 고유 30종 최악 케이스는 **여전히 6칸이 가려졌다**(C8 이 24/30 이었다).
   ⚑ 713 이관(2026-09-02) — 배수 토글이 이 팝업으로 오면서 그리드가 **868**(−8)이 됐다.
   패널 1080 은 그대로이고(패딩분 204 → 212), «가려짐 0» 도 그대로다 — 상세는 verify327 머리말.
   327 은 «가변» 을 버리고 **고정** 으로 간다: 그리드 868 · 패널 1080(= ref 539 × 2.00) ·
   패널·리본이 통째로 103 위로(709→606 · 641→538) · 빈 면은 세로 중앙정렬.
   그리드 868 ≥ 30연 최악 판(배지 돌출·중앙정렬까지 센 하한 868) 이라 **가려짐이 구조적으로 0** 이고
   스크롤도 안 쓴다.
   이 파일은 지워지지 않고 «187 이 세운 자(84·12 무회귀 + 가려짐 0)» 로 계속 산다 —
   재는 대상만 327 의 값으로 옮겼다(작업 310·333 의 게이트 이관 선례). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (n, got, want, tol) => {
  const d = typeof got === 'number' && typeof want === 'number' ? +(got - want).toFixed(1) : 0;
  R.push({ n, got, want, d, pass: typeof got === 'number' && typeof want === 'number'
    ? Math.abs(d) <= tol : got === want, tol });
};

/* 결과 n칸을 «전부 다른 아이템» 으로 만든다 — showSummonResult 가 같은 id 를 개수로 합치므로
   중복이 섞이면 행수가 줄어 실측이 흔들린다. 한 배너로는 해금 등급 탓에 30종이 안 나오므로
   전 배너를 훑는다(어느 배너 아이템이든 카드 렌더 경로는 같다 — 174 petIcon 포함). */
const SETUP = (n) => `(() => {
  S.dia = 1e12;
  const res = [], seen = new Set();
  for (const bk of BKEYS) {
    for (let i = 0; i < 4000 && res.length < ${n}; i++) {
      const r = summonOne(bk);
      if (!r || !r.it || seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    if (res.length >= ${n}) break;
  }
  showSummonResult('weapon', res.length, res, false);
  return res.length;
})()`;

/* 팝 연출(fx-pop)이 카드 rect 를 흔든다 — 12·84 게이트와 같은 방식으로 정지시키고 잰다 */
const FREEZE = `(() => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  document.querySelectorAll('.fx-pop').forEach((e) => { e.style.animation = 'none'; });
})()`;

/* ⚠ fit() 이 #app 을 scale() 로 줄이는 화면비에서는 getBoundingClientRect 가 **화면 px** 다.
   1920×1080 에서는 프레임 1600 이 0.675 배로 찍혀 «패널 539» 가 364 로 읽힌다(D 절 첫 실행이
   그렇게 헛FAIL 했다). 배율 k = rect 높이 / offsetHeight 로 나눠 전부 **프레임 px** 로 되돌린다.
   scrollHeight·scrollTop 은 레이아웃 값이라 이미 프레임 px 다 — 나누면 안 된다. */
const GEO = `(() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const k = A.height / app.offsetHeight;
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { y: +((b.top - A.top) / k).toFixed(1), bot: +((b.bottom - A.top) / k).toFixed(1),
             h: +(b.height / k).toFixed(1), w: +(b.width / k).toFixed(1) }; };
  const grid = document.getElementById('sumGrid');
  const gb = grid.getBoundingClientRect();
  const cards = [...document.getElementById('sumGridIn').children];
  /* «완전히 보이는» 카드 = 배지 돌출분을 뺀 카드 본체가 그리드 보임창 안에 다 들어온 것 */
  const full = cards.filter((c) => { const b = c.getBoundingClientRect();
    return b.top >= gb.top - 0.5 && b.bottom <= gb.bottom + 0.5; });
  const rowsOf = (list) => new Set(list.map((c) =>
    Math.round(c.getBoundingClientRect().top - gb.top + grid.scrollTop))).size;
  return {
    frameH: +app.offsetHeight.toFixed(1), scale: +k.toFixed(4),
    panel: r('.sm-panel'), btns: r('.sm-btns'), close: r('.sm-close'), rb: r('.sm-rb'),
    grid: { h: +(gb.height / k).toFixed(1), sh: grid.scrollHeight, st: grid.scrollTop },
    cards: cards.length, fullCards: full.length,
    rowsTotal: rowsOf(cards), rowsFull: rowsOf(full),
    gh: getComputedStyle(document.querySelector('.sm-panel')).getPropertyValue('--sm-gh').trim()
  };
})()`;

const errs = [];
const openAt = async (b, vp, n) => {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(HTML);
  await p.waitForTimeout(900);
  const made = await p.evaluate(SETUP(n));
  await p.waitForTimeout(1200);
  await p.evaluate(FREEZE);
  await p.waitForTimeout(80);
  const g = await p.evaluate(GEO);
  g.made = made;
  return { p, g };
};

(async () => {
  const b = await launch(chromium);

  /* ══ A. 레퍼런스 케이스(2행) 무회귀 — 187 이 지켜야 할 첫 번째 것 ══ */
  const a = await openAt(b, { width: 1080, height: 2280 }, 10);
  ok('A1 프레임 높이', a.g.frameH, 2280, 0);
  ok('A2 결과 칸 수(고유 10)', a.g.cards, 10, 0);
  ok('A3 행수', a.g.rowsTotal, 2, 0);
  ok('A4 --sm-gh (327 고정 · 713 이관)', a.g.gh, '868px', 0);
  ok('A5 그리드 h (327 · 713 이관)', a.g.grid.h, 868, 0);
  ok('A6 패널 h (327 = ref × 2)', a.g.panel.h, 1080, 0);
  ok('A7 패널 top (327)', a.g.panel.y, 606, 0);
  ok('A8 패널 하변 (327 = 버튼 상변 − 20)', a.g.panel.bot, 1686, 0);
  ok('A9 리본 top (327 = 패널 top − 68)', a.g.rb.y, 538, 0);
  ok('A10 버튼 상변 (84 앵커 Δ0)', a.g.btns.y, 1706, 0);
  ok('A11 10칸 전부 보임', a.g.fullCards, 10, 0);
  /* 2행 케이스는 «스크롤이 필요 없다» — 다만 scrollHeight 는 개수 배지 **상자**(카드 바닥
     −23.7px)까지 세므로 0 이 되지는 않는다(187 이 만든 것이 아니라 원래 그렇다).
     잉크 돌출분 8 은 `.sm-grid-in` 의 padding-bottom 이 이미 받고 있다. */
  ok('A12 2행 스크롤 여유 ≤ 배지 상자(40)', a.g.grid.sh - a.g.grid.h <= 40, true, 0);
  await a.p.close();

  /* ══ B. 3행 — 중간 단계가 계단이 아니라 실제 행수를 따라가는가 ══ */
  const b3 = await openAt(b, { width: 1080, height: 2280 }, 18);
  ok('B1 결과 칸 수(고유 18)', b3.g.cards, 18, 0);
  ok('B2 행수', b3.g.rowsTotal, 3, 0);
  ok('B3 --sm-gh (327 고정 · 713 이관)', b3.g.gh, '868px', 0);
  ok('B4 그리드 h (327 고정 · 713 이관)', b3.g.grid.h, 868, 0);
  ok('B5 패널 h (327 고정)', b3.g.panel.h, 1080, 0);
  ok('B6 3행 전부 보임', b3.g.rowsFull, 3, 0);
  ok('B7 버튼 상변 무회귀', b3.g.btns.y, 1706, 0);
  ok('B8 패널↔버튼 여유 ≥ 20', b3.g.btns.y - b3.g.panel.bot >= 20, true, 0);
  await b3.p.close();

  /* ══ C. 30연 — 주인이 보고한 그 케이스 ══ */
  const c = await openAt(b, { width: 1080, height: 2280 }, 30);
  ok('C1 결과 칸 수(고유 30)', c.g.cards, 30, 0);
  ok('C2 행수', c.g.rowsTotal, 5, 0);
  ok('C3 --sm-gh (327 고정 · 713 이관)', c.g.gh, '868px', 0);
  ok('C4 그리드 h (327 = 868 ≥ 최악 판 하한 868)', c.g.grid.h, 868, 0);
  ok('C5 패널 h (327)', c.g.panel.h, 1080, 0);
  ok('C6 패널 하변', c.g.panel.bot, 1686, 0);
  /* ★ 이 게이트의 본문 — 327 이후로는 «2배» 가 아니라 **가려짐 0** 이 판정이다.
     30연이 낼 수 있는 최악(고유 30칸 = 5행 + 배지 돌출 = 868)이 그리드 868 안에 통째로 들어간다. */
  ok('C7 완전히 보이는 행 = 5 (전부)', c.g.rowsFull, 5, 0);
  ok('C8 완전히 보이는 칸 = 30 (가려짐 0)', c.g.fullCards, 30, 0);
  ok('C9 스크롤이 아예 필요 없다', c.g.grid.sh <= c.g.grid.h, true, 0);
  ok('C10 열릴 때 scrollTop 0', c.g.grid.st, 0, 0);
  ok('C11 버튼 상변 무회귀', c.g.btns.y, 1706, 0);
  ok('C12 패널↔버튼 여유 ≥ 20', c.g.btns.y - c.g.panel.bot >= 20, true, 0);
  ok('C13 패널↔버튼 안 겹침', c.g.btns.y >= c.g.panel.bot, true, 0);
  /* 스크롤해서 마지막 행까지 실제로 닿는가(95 드래그 스크롤 대상이기도 하다) */
  const sc = await c.p.evaluate(`(() => {
    const g = document.getElementById('sumGrid');
    g.scrollTop = g.scrollHeight;
    const gb = g.getBoundingClientRect();
    const last = [...document.getElementById('sumGridIn').children].pop().getBoundingClientRect();
    return { reached: last.bottom <= gb.bottom + 0.5 && last.top >= gb.top - 0.5, st: g.scrollTop };
  })()`);
  ok('C14 스크롤로 마지막 행 도달', sc.reached, true, 0);
  await c.p.close();

  /* ══ D. 화면비 4종 × 30연 — 겹침 0 (37·51·84 계열 회귀) ══
     #app 높이 = 1080 × 안전영역높이/폭, clamp 1600~2600.
     1920×1080 은 607 → 1600(하한) · 1080×2800 은 2800 → 2600(상한). */
  for (const vp of [{ width: 1080, height: 2280 }, { width: 1080, height: 1920 },
                    { width: 1920, height: 1080 }, { width: 1080, height: 2800 }]) {
    const d = await openAt(b, vp, 30);
    const g = d.g, tag = 'D ' + vp.width + 'x' + vp.height;
    ok(tag + ' 패널↔버튼 겹침', g.btns.y >= g.panel.bot, true, 0);
    ok(tag + ' 버튼↔닫기 겹침', g.close.y >= g.btns.bot, true, 0);
    ok(tag + ' 닫기 프레임 안', g.close.bot <= g.frameH + 0.5, true, 0);
    ok(tag + ' 그리드 h ≥ ref 335', g.grid.h >= 335, true, 0);
    ok(tag + ' 패널 h ≥ ref 539', g.panel.h >= 539, true, 0);
    await d.p.close();
  }

  /* ══ E. 기능 체크 — 커진 뒤에도 실제로 눌리고 닫히는가 (지시서 «기능 완성 규칙») ══ */
  const ec = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const ep = await ec.newPage();
  const ferr = [];
  ep.on('pageerror', (e) => ferr.push(String(e)));
  ep.on('console', (m) => { if (m.type() === 'error') ferr.push(m.text()); });
  await ep.goto(HTML);
  await ep.waitForTimeout(900);
  /* 73 가이드 소환 미션이 «지정된 상자» 외 소환을 막는다 — 84 게이트와 같은 처리 */
  await ep.evaluate(`(() => {
    S.dia = 1e12;
    const bk = (typeof gmBan === 'function' && gmBan()) || 'weapon';
    const res = []; for (let i = 0; i < 30; i++) res.push(summonOne(bk));
    showSummonResult(bk, 30, res, false);
  })()`);
  await ep.waitForTimeout(900);
  for (const [k, id] of [['E1 10연(💎) 버튼', '#sumB10'], ['E2 30연(💎) 버튼', '#sumB30']]) {
    await ep.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
    await ep.waitForTimeout(200);
    const before = await ep.evaluate('({ dia: S.dia, sum: S.summons })');
    await ep.click(id, { timeout: 8000 });
    await ep.waitForTimeout(700);
    const after = await ep.evaluate(
      "({ dia: S.dia, sum: S.summons, on: document.getElementById('sumw').classList.contains('on'),"
      + " gh: getComputedStyle(document.querySelector('.sm-panel')).getPropertyValue('--sm-gh').trim() })");
    R.push({ n: k, got: '💎−' + (before.dia - after.dia) + ' / +' + (after.sum - before.sum)
      + '회 / gh ' + after.gh, want: '차감 + 소환 + 그리드 재계산', d: 0,
      pass: after.dia < before.dia && after.sum > before.sum && after.on && /px$/.test(after.gh), tol: 0 });
  }
  /* 재소환으로 결과가 줄면 패널도 다시 줄어야 한다 — 커진 채 굳으면 ref 케이스가 깨진다 */
  await ep.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
  await ep.evaluate(SETUP(10));
  await ep.waitForTimeout(400);
  const shrink = await ep.evaluate(GEO);
  /* 327 — 187 과 **정반대** 단언이다. 창 크기가 소환마다 튀는 것이 187 의 부작용이었고
     주인 지시가 «걍 2배» 라, 결과가 줄어도 패널은 1080 을 지켜야 한다(빈 면은 중앙정렬이 받는다). */
  ok('E3 결과가 줄어도 패널은 1080 그대로', shrink.panel.h, 1080, 0);
  /* 딤 탭 → 닫힘 (버튼 위가 아닌 좌표) */
  await ep.mouse.click(540, 300);
  await ep.waitForTimeout(300);
  const closed = await ep.evaluate("!document.getElementById('sumw').classList.contains('on')");
  ok('E4 «터치하여 닫기» 동작', closed, true, 0);
  ok('E5 기능 체크 런타임 에러', ferr.length, 0, 0);
  await ep.close();

  ok('F1 콘솔·런타임 에러', errs.length, 0, 0);

  /* ══ G. 되돌림 시험 — CSS 를 옛 고정값으로 되돌리면 C 절이 실제로 FAIL 하는가.
     («있으나 마나 한 단언» 방지: 186 이 남긴 교훈) ══ */
  const gc = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const gp = await gc.newPage();
  await gp.goto(HTML);
  await gp.waitForTimeout(900);
  await gp.addStyleTag({ content: '.sm-panel{height:539px !important}.sm-grid{height:335px !important}' });
  await gp.evaluate(SETUP(30));
  await gp.waitForTimeout(1200);
  await gp.evaluate(FREEZE);
  const rev = await gp.evaluate(GEO);
  ok('G1 되돌리면 그리드 335 로 돌아간다', rev.grid.h, 335, 0);
  ok('G2 되돌리면 보이는 행 2 (= 옛 증상)', rev.rowsFull, 2, 0);
  ok('G3 되돌리면 C4 가 FAIL 한다', rev.grid.h !== 868, true, 0);
  await gp.close();

  await b.close();

  const bad = R.filter((r) => !r.pass);
  R.forEach((r) => console.log((r.pass ? '  ok ' : '  XX ') + String(r.n).padEnd(30)
    + ' got=' + String(r.got).padEnd(12) + ' want=' + String(r.want).padEnd(12)
    + (r.d ? ' Δ=' + r.d : '')));
  if (errs.length) console.log('errors: ' + errs.slice(0, 5).join(' | '));
  console.log('VERIFY187 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
