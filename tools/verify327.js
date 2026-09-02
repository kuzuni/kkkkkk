/* 작업 327 게이트 — 12 소환 결과 팝업의 창을 «세로 2배» 로 고정.
   실행: node tools/verify327.js

   주인 지시(2026-08-28): «소환결과가 창이 너무 작음. 걍 세로로 2배 정도 늘리던지 해라» (187 후속).

   187 은 «결과 행수를 따라가는 가변 패널»(2행 335 = ref Δ0 · 상한 4행 676)이었다. 그런데
     ① 저레벨 배너처럼 중복이 개수 배지로 합쳐지는 **흔한 결과**는 계속 ref 크기(539)에 머물렀고
        — 주인이 «또» 작다고 한 것이 이 흔한 쪽이다 —
     ② 상한 676(4행) 때문에 고유 30종이 나오는 최악 케이스는 **여전히 6칸이 가려졌다**.
   327 은 «가변» 을 버리고 **고정 2배**로 간다:

     · `--sm-gh` = **876px** (CSS 상수. showSummonResult 가 더는 계산하지 않는다)
     · 패널 = 204 + 876 = **1080 = ref 539 × 2.00**            ← 주인이 말한 «세로 2배»
     · 그리드 876 ≥ 30연 최악 5행(170×5 − 4 = 846)             ← **가려짐 0 — 단 «×1» 판에 한해**
     · 패널·리본이 통째로 **103 위로**(709→606 · 641→538)      ← 84 하단 앵커를 안 밀치려고
     · 결과가 적을 때의 빈 면은 `.sm-grid-in` 의 **세로 중앙정렬**이 받는다

   ⚑ **745 정정(2026-09-02) — 위 «가려짐 0» 은 결과가 ≤ 30칸일 때의 말이다.**
     327 이 그 괄호에 적어 둔 근거(«버튼이 10·10·30 뿐이라 결과는 30칸 = 5행이 상한»)는
     668 배수 토글(×1/×10/×100/×1000)이 생기면서 **더는 참이 아니다** — 한 번에 100~30,000장을
     뽑을 수 있고, 칸은 «고유 종» 만큼 늘어나므로 배너 종수(weapon·shield·amulet **36**)까지 간다.
     `probe745` 실측: **31칸(6행)부터 넘친다**(scrollH 1027 vs 그리드 868 = 넘침 159px · 가려짐 6칸).
     ⚠ **닿는 조건의 축은 «장수» 가 아니라 «소환 레벨 × 장수» 다**(`gradeProbs` 가 `l < g.unlock` 으로
       등급을 잠근다). Lv1 에서는 30,000장을 굴려도 15칸에서 멈추고 — `verify668` [H2] 가 찍고 있는
       «15칸 / 종수 36» 이 그 상태다 — **Lv50(MAX)에서는 100장(10연 ×10)이 이미 32칸**이다.
       즉 «×1000 이면» 이라고 적었으면 ×10·×100 에서 이미 깨진 것을 못 잡았다.
     ⇒ 자를 **두 축으로 가른다**: §E 는 «×1 판(≤ 30칸)» 의 «가려짐 0 · 스크롤 0»,
       **§M 은 «배수 판(> 30칸)» 의 «스크롤은 나되 회수된다»**. 제품은 0줄이다 —
       스크롤이 나는 것 자체는 187 의 원래 설계이고(726 도 09 에서 같은 답을 골랐다),
       `align-content:safe center` 라는 부품도 327 이 이미 깔아 두었다([G5] 가 그 항이다).

   ⚠ 이 게이트가 재는 것은 «커졌다» 하나가 아니라 다섯 가지다.
     ① **2배가 맞나** (§B — ref 539 대비 배율)
     ② **가려짐이 0 인가** (§E — 187 이 24/30 에서 멈췄던 자리 · **×1 판 한정**)
     ③ **창이 소환마다 튀지 않나** (§A — 187 의 실제 부작용. 고정이 되면서 사라져야 한다)
     ④ **커진 만큼 84 를 밀치지 않나** (§B·§D — 패널 하변 ↔ 버튼 상변 20px)
     ⑤ **넘치는 판이 회수되나** (§M — 745. 스크롤 0 이 아니라 «스크롤로 닿는가» 를 묻는다)
   §G 되돌림 시험이 ①②③ 각각에 «되돌리면 실제로 빨개지는가» 를 붙인다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (n, got, want, tol) => {
  const num = typeof got === 'number' && typeof want === 'number';
  const d = num ? +(got - want).toFixed(1) : 0;
  R.push({ n, got, want, d, pass: num ? Math.abs(d) <= tol : got === want });
};

/* ── 327 의 상수 ── (index.html `.sm-panel` 위 주석과 한 벌)
   ⚑ 713 이관(2026-09-02 주인 정정) — 배수 토글이 이 팝업으로 오면서 패널 **안에서** 15px 이 옮겨갔다:
     그리드 876 → **868** · 패딩분 204(106+98) → **212**(99+113). **패널 1080 은 그대로**라
     327 의 주인 지시(«세로 2배» = ref 539 × 2.00)는 한 픽셀도 안 깨진다 — 바뀐 것은 그 안의 나눔이다.
   ⚑ **그러면서 327 의 산수 하나가 정정됐다**: 이 그리드가 담아야 하는 것은 «5행 846» 이 아니다.
     개수 배지(`.ifq`)는 절대배치라 스크롤 넘침에 그대로 드는데 카드 바닥 아래로 **18.69px** 나오고,
     줄들은 세로 중앙정렬이라 그리드를 줄여도 **절반만 따라 올라온다** ⇒
         배지 하단 = (H − 846)/2 + 838 + 18.69 ≤ H  ⇔  **H ≥ 867.4** ⇒ 하한 **868**.
     876 은 그것을 담고 있었고 846·862·865·866 은 **못 담는다** — [E5] 가 그 넷에서 연달아 빨개져
     이 산수를 드러냈다(713 1회차). 그래서 713 은 −30 이 아니라 **−8** 만 가져가고
     나머지 7px 은 위 여백에서 냈다. */
const GH = 868;            // 그리드 높이 (CSS 상수 --sm-gh)
const PAD = 212;           // 패널 border-box 패딩분 (상 102 + 하 113 — 113 = 크롬 15 + 배수 바 98)
const PH = PAD + GH;       // 패널 1080 (713 이관 뒤에도 같은 값)
const WORST = 868;         // 스크롤 0 을 지키는 그리드 하한 (배지 돌출 18.69 + 중앙정렬 절반 몫)
const REF_PH = 539;        // ref 패널 높이 (793~1331) — «2배» 의 분모
const REF_TOP = 709;       // ref 패널 top
const REF_RB = 641;        // ref 리본 top
const BTN_Y = 1706;        // 2280 프레임의 버튼 상변 (84 하단 앵커) — 안 움직여야 한다
const GAP = 20;            // 패널 하변 ↔ 버튼 상변
const PITCH = 170;         // 카드 158 + gap 12
const BADGE_PAD = 8;       // .sm-grid-in padding-bottom (배지 돌출분)

/* n행일 때 카드 블록 높이 = 170n − 12 (마지막 gap 없음) · 세로 중앙정렬 오프셋은 그 나머지의 절반 */
const cardsH = (n) => PITCH * n - 12;
const centerY = (gridY, gridH, n) => gridY + (gridH - BADGE_PAD - cardsH(n)) / 2;

/* 결과 n칸을 «전부 다른 아이템» 으로 만든다(187 게이트와 같은 방식 — 중복이 섞이면 행수가 흔들린다) */
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

const FREEZE = `(() => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  document.querySelectorAll('.fx-pop').forEach((e) => { e.style.animation = 'none'; });
})()`;

/* ⚠ fit() 이 #app 을 scale() 로 줄이는 화면비에서는 rect 가 **화면 px** 다 — 배율로 나눠
   프레임 px 로 되돌린다(187 D 절이 이것 때문에 헛FAIL 했다). scrollHeight 는 레이아웃 값이라
   나누면 안 된다. */
const GEO = `(() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const k = A.height / app.offsetHeight;
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { y: +((b.top - A.top) / k).toFixed(1), bot: +((b.bottom - A.top) / k).toFixed(1),
             h: +(b.height / k).toFixed(1) }; };
  const grid = document.getElementById('sumGrid');
  const gb = grid.getBoundingClientRect();
  const cards = [...document.getElementById('sumGridIn').children];
  const full = cards.filter((c) => { const b = c.getBoundingClientRect();
    return b.top >= gb.top - 0.5 && b.bottom <= gb.bottom + 0.5; });
  const rowsOf = (l) => new Set(l.map((c) =>
    Math.round(c.getBoundingClientRect().top - gb.top + grid.scrollTop))).size;
  const first = cards[0] && cards[0].getBoundingClientRect();
  const last = cards.length && cards[cards.length - 1].getBoundingClientRect();
  return {
    frameH: +app.offsetHeight.toFixed(1),
    panel: r('.sm-panel'), rb: r('.sm-rb'), btns: r('.sm-btns'), close: r('.sm-close'),
    grid: { y: +((gb.top - A.top) / k).toFixed(1), h: +(gb.height / k).toFixed(1),
            bot: +((gb.bottom - A.top) / k).toFixed(1), sh: grid.scrollHeight, st: grid.scrollTop },
    cards: cards.length, fullCards: full.length,
    rowsTotal: rowsOf(cards), rowsFull: rowsOf(full),
    firstY: first ? +((first.top - A.top) / k).toFixed(1) : null,
    lastBot: last ? +((last.bottom - A.top) / k).toFixed(1) : null,
    gh: getComputedStyle(document.querySelector('.sm-panel')).getPropertyValue('--sm-gh').trim()
  };
})()`;

const errs = [];
const openAt = async (b, vp, n, css) => {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(HTML);
  await p.waitForTimeout(900);
  if (css) await p.addStyleTag({ content: css });
  await p.evaluate(SETUP(n));
  await p.waitForTimeout(1200);
  await p.evaluate(FREEZE);
  await p.waitForTimeout(80);
  return { p, c, g: await p.evaluate(GEO) };
};

(async () => {
  const b = await launch(chromium);

  /* ══ A. 고정성 — 결과 개수가 뭐든 창은 한 치도 안 움직인다 ══
     187 의 실제 부작용이 «소환할 때마다 창이 커졌다 작아졌다» 였다. 327 의 첫 약속이 이것이다. */
  const seen = [];
  for (const n of [1, 10, 18, 30]) {
    const a = await openAt(b, { width: 1080, height: 2280 }, n, null);
    seen.push(a.g);
    ok(`A${n} --sm-gh`, a.g.gh, GH + 'px', 0);
    ok(`A${n} 그리드 h`, a.g.grid.h, GH, 0);
    ok(`A${n} 패널 h`, a.g.panel.h, PH, 0);
    ok(`A${n} 패널 top`, a.g.panel.y, 606, 0);
    ok(`A${n} 리본 top`, a.g.rb.y, 538, 0);
    await a.c.close();
  }
  ok('A★ 네 경우의 패널 높이가 전부 같다',
    new Set(seen.map((g) => g.panel.h)).size, 1, 0);
  ok('A★ 네 경우의 패널 top 이 전부 같다',
    new Set(seen.map((g) => g.panel.y)).size, 1, 0);

  const [g1, g10, g18, g30] = seen;

  /* ══ B. «2배» 검산 + 84 앵커 무회귀 ══ */
  ok('B1 패널 배율 (ref 539 대비)', +(g10.panel.h / REF_PH).toFixed(3), 2.0, 0.01);
  ok('B2 패널 = 212 + 868 = 1080 (713 이관 — 나눔만 바뀌고 합은 그대로)', g10.panel.h, PH, 0);
  ok('B3 패널·리본이 같은 만큼 떴다 (103)',
    +(REF_TOP - g10.panel.y).toFixed(1), +(REF_RB - g10.rb.y).toFixed(1), 0);
  ok('B4 리본 = 패널 top − 68', +(g10.panel.y - g10.rb.y).toFixed(1), 68, 0);
  ok('B5 버튼 상변 무회귀 (84 앵커)', g10.btns.y, BTN_Y, 0);
  ok('B6 패널 하변 ↔ 버튼 상변 = 20', +(g10.btns.y - g10.panel.bot).toFixed(1), GAP, 0);
  ok('B7 닫기 잉크 프레임 안', g10.close.bot <= 2280.5, true, 0);
  ok('B8 리본이 프레임 위로 안 넘친다', g10.rb.y >= 0, true, 0);

  /* ══ C. 세로 중앙정렬 — 빈 면이 «아래로 몰리지» 않고 위아래로 갈린다 ══
     327 이 «고정 확대» 를 쓸 수 있는 유일한 근거다(187 이 고정을 물린 이유가 340px 빈 검은 면). */
  for (const [n, g] of [[1, g1], [2, g10], [3, g18], [5, g30]]) {
    const want = centerY(g.grid.y, g.grid.h, n);
    ok(`C${n}행 첫 카드 y = 중앙정렬 계산값`, g.firstY, want, 1);
  }
  ok('C★ 결과가 적을수록 카드가 더 내려간다 (1행 > 5행)', g1.firstY > g30.firstY, true, 0);
  ok('C★ 위아래 여백이 같다 (5행)',
    +((g30.firstY - g30.grid.y) - (g30.grid.bot - BADGE_PAD - g30.lastBot)).toFixed(1), 0, 1.5);

  /* ══ D. 화면비 4종 × 30연 — 겹침 0 · 프레임 이탈 0 ══
     #app 높이 = 1080 × 안전영역높이/폭, clamp 1600~2600.
     패널 top 은 «필요한 만큼만» 오르므로 프레임이 짧을수록 더 뜬다 — 리본이 위로 새는지 본다. */
  for (const vp of [{ width: 1080, height: 2280 }, { width: 1080, height: 1920 },
                    { width: 1920, height: 1080 }, { width: 1080, height: 2800 }]) {
    const d = await openAt(b, vp, 30, null);
    const g = d.g, tag = 'D ' + vp.width + 'x' + vp.height;
    ok(tag + ' 패널↔버튼 안 겹침', g.btns.y >= g.panel.bot, true, 0);
    ok(tag + ' 패널↔버튼 여유 ≥ 20', g.btns.y - g.panel.bot >= GAP - 0.5, true, 0);
    ok(tag + ' 버튼↔닫기 안 겹침', g.close.y >= g.btns.bot, true, 0);
    ok(tag + ' 닫기 프레임 안', g.close.bot <= g.frameH + 0.5, true, 0);
    ok(tag + ' 리본 프레임 안 (top ≥ 0)', g.rb.y >= 0, true, 0);
    ok(tag + ' 패널 h = 1080 (짧은 프레임에서도)', g.panel.h, PH, 0);
    ok(tag + ' 30칸 전부 보임', g.fullCards, 30, 0);
    await d.c.close();
  }

  /* ══ E. 가려짐 0 — 187 이 24/30 에서 멈췄던 자리 ══
     ⚑ 745 — 이 절의 주어는 **«×1 의 10·30연», 즉 결과가 ≤ 30칸인 판**이다. 그 위(배수 판)는 §M 이 든다.
       `probe745` 실측으로 **×1 은 어떤 소환 레벨에서도 30칸을 못 넘는다**(Lv50 30연 = 고유 19칸)
       — 그러니 여기 «가려짐 0» 은 좁게 적힌 채로 여전히 참이고, 무르게 푼 것이 아니다. */
  ok('E1 30연 결과 칸 수(고유 30)', g30.cards, 30, 0);
  ok('E2 행수 5', g30.rowsTotal, 5, 0);
  ok('E3 완전히 보이는 행 = 5', g30.rowsFull, 5, 0);
  ok('E4 완전히 보이는 칸 = 30 (가려짐 0)', g30.fullCards, 30, 0);
  /* 713 — «참/거짓» 이 아니라 **수치**로 적는다: 빨개졌을 때 몇 px 이 넘치는지 바로 보여야
     다음 세션이 그리드 높이를 얼마나 되돌려야 하는지 안다(1회차에 이 항이 «false» 로만 빨갰다). */
  ok('E5 스크롤 넘침 0 (scrollHeight ≤ 그리드 h)', g30.grid.sh, Math.round(g30.grid.h), 0.5);
  ok('E6 그리드 868 ≥ 하한 868 (713 이관 — 배지 돌출 + 중앙정렬까지 센 값)', GH >= WORST, true, 0);
  ok('E7 열릴 때 scrollTop 0', g30.grid.st, 0, 0);
  ok('E8 마지막 카드 하단이 그리드 안', g30.lastBot <= g30.grid.bot + 0.5, true, 0);

  /* ══ M. 배수 판(> 30칸) — 스크롤은 «나되 회수된다» ══  (745, 2026-09-02)
     668 배수 토글이 생긴 뒤로 결과 칸은 30 을 넘을 수 있다. §E 의 «스크롤 0» 을 그대로 배수 판에
     들이대면 자가 거짓말을 하거나(헛초록) 설계를 결함으로 오인한다(헛빨강) — 그래서 축을 가른다.
     여기가 묻는 것은 «안 넘치는가» 가 아니라 **«넘친 칸에 실제로 닿는가»** 다.
     ⚠ 726 함정: 격자에 스크롤을 주면 «아무 데나 탭하면 닫힘» 이 끄는 손짓을 삼킬 수 있다.
       이 팝업은 닫기가 **click** 에 걸려 있어 굴림 제스처가 click 을 안 낳는다 — M6 이 그것을 못박는다. */
  {
    /* M0·M1 — «넘치는 판이 실재하는가» 를 제품 데이터로 묻는다(DOM 이 아니라 모델 쪽 근거).
       ⚠ 표본을 «×1000» 으로 적지 마라 — 축은 «소환 레벨 × 장수» 이고, Lv MAX 에서는
         100장(10연 ×10)이 이미 30칸을 넘는다(probe745 표). ×1000 으로 적은 자는
         ×10·×100 에서 이미 깨진 것을 못 잡는다. */
    /* `hasTouch` — M7·M8 은 **진짜 터치 드래그**로 잰다(합성 TouchEvent 는 스크롤을 안 낳아서
       «굴림 뒤 click 이 오는가» 를 물어볼 수가 없다 — 726 이 물은 것이 정확히 그 click 이다). */
    const mc = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1,
                                    hasTouch: true });
    const mp = await mc.newPage();
    mp.on('pageerror', (e) => errs.push(String(e)));
    mp.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await mp.goto(HTML);
    await mp.waitForTimeout(900);
    await mp.evaluate(`(() => { S.guide.idx = GUIDE.length;
      if (typeof gmStart === 'function') gmStart(); })()`);

    const model = await mp.evaluate(`(() => {
      const spec = Math.max(...BKEYS.map((k) => BANNERS[k].list.length));
      const muls = (typeof SUM_MULS !== 'undefined' ? SUM_MULS : [1]);
      const seed = (s) => { let a = s >>> 0; Math.random = () => {
        a = (a + 0x6D2B79F5) >>> 0; let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      const orig = Math.random;
      /* 씨앗은 **고정 목록**이다 — RNG 를 갈아 끼웠으므로 실행마다 같은 값이 나온다(플레이키 아님).
         한 씨앗만 쓰면 «넘칠 수 있다» 가 그 한 표본의 운에 걸린다(×10 100장은 32 ↔ 30 사이를 오간다). */
      const SEEDS = [1, 7, 31, 20260902];
      const run = (bk, lv, times, s) => { seed(s);
        S.dia = 1e12; S.relic = 1e12; S.own = {}; S.summons = 0;
        BKEYS.forEach((k) => { S.sum[k].lv = lv; S.sum[k].exp = 0; });
        return new Set(summonBatch(bk, times).res.map((r) => r.it.id)).size; };
      const best = (lv, times) => Math.max(...BKEYS.map((k) =>
        Math.max(...SEEDS.map((s) => run(k, lv, times, s)))));
      const big = best(SUM_MAXLV, 10 * Math.max(...muls));
      const x1  = best(SUM_MAXLV, 30);
      const x10 = best(SUM_MAXLV, 100);
      Math.random = orig;
      return { spec, maxMul: Math.max(...muls), big, x1, x10 };
    })()`);
    ok('M0 배너 종수 상한이 30 을 넘는다 (칸의 천장)', model.spec > 30, true, 0);
    ok('M1 배수 최대(×' + model.maxMul + ')로 굴리면 30칸을 넘는다 — 넘치는 판은 실재한다',
      model.big > 30, true, 0);
    ok('M2 ×10(100장)에서 이미 30칸을 넘는다 — «×1000 이면» 이라고 적으면 안 된다',
      model.x10 > 30, true, 0);
    /* M3 은 «뽑은 장수 ≥ 고유 종수» 라는 산수라 레벨과 무관하게 참이다(30장에서 31종이 날 수 없다).
       그래도 자에 적어 두는 이유: §E 의 주어(«≤ 30칸»)가 **왜** 좁게 참인지를 자가 말해야
       다음 세션이 버튼 수(10·30)를 바꿀 때 §E 가 같이 무너진다는 것을 안다. */
    ok('M3 ×1(30연 = 30장)은 칸이 30 을 못 넘는다 — §E 의 주어가 좁게 참인 근거',
      model.x1 <= 30, true, 0);

    /* M4~M7 — 천장 판(종수만큼)을 실제로 그려 놓고 «회수» 를 잰다 */
    await mp.evaluate(SETUP(model.spec));
    await mp.waitForTimeout(1000);
    await mp.evaluate(FREEZE);
    await mp.waitForTimeout(60);
    const gm = await mp.evaluate(GEO);
    ok('M4 천장 판은 그리드를 넘친다 (스크롤이 생긴다 — 설계)', gm.grid.sh > gm.grid.h + 0.5, true, 0);
    ok('M5 열릴 때 scrollTop 0 (미리 내려가 있지 않다)', gm.grid.st, 0, 0);
    ok('M6 넘쳐도 첫 행이 위로 안 잘린다 (align-content:safe)',
      +(gm.firstY - gm.grid.y).toFixed(1), 0, 0.5);

    const mbox = await mp.evaluate(`(() => {
      const r = document.getElementById('sumGrid').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), top: Math.round(r.top), h: Math.round(r.height) };
    })()`);
    const cdp = await mc.newCDPSession(mp);
    const my0 = mbox.top + Math.round(mbox.h * 0.8), my1 = mbox.top + Math.round(mbox.h * 0.25);
    const tp = (y) => [{ x: mbox.x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(my0) });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent',
        { type: 'touchMove', touchPoints: tp(Math.round(my0 + (my1 - my0) * i / 10)) });
      await mp.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mp.waitForTimeout(500);
    const rec = await mp.evaluate(`(() => {
      const grid = document.getElementById('sumGrid');
      const cards = [...document.getElementById('sumGridIn').children];
      const gb = grid.getBoundingClientRect();
      const last = cards[cards.length - 1].getBoundingClientRect();
      return { open: document.getElementById('sumw').classList.contains('on'),
               st: Math.round(grid.scrollTop),
               lastVisible: last.bottom <= gb.bottom + 0.5 && last.top >= gb.top - 0.5 };
    })()`);
    ok('M7 터치 드래그가 실제로 굴린다 · 굴림이 «배경 탭 = 닫기» 로 오인되지 않는다 (726 함정)',
      rec.st > 0 && rec.open, true, 0);
    ok('M8 끝까지 굴리면 마지막 칸이 보인다 (가려짐이 스크롤로 회수된다)', rec.lastVisible, true, 0);
    /* M9 — «굴림이 안 닫는다» 를 무르게 통과시키지 않는 짝 항: **그냥 탭하면 닫혀야 한다**.
       이게 없으면 «닫기가 통째로 고장 나도 M7 은 초록» 이다(84·363 이 지킨 그 닫기다). */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(my1) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mp.waitForTimeout(400);
    const tapClosed = await mp.evaluate(`!document.getElementById('sumw').classList.contains('on')`);
    ok('M9 [짝] 굴리지 않고 그냥 탭하면 닫힌다 (M7 이 «닫기 고장» 으로 초록이 아님)', tapClosed, true, 0);
    await mc.close();
  }

  /* ══ F. 기능 체크 — 커진 뒤에도 실제로 눌리고, 다시 소환해도 창이 안 튄다 ══ */
  const fc = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const fp = await fc.newPage();
  const ferr = [];
  fp.on('pageerror', (e) => ferr.push(String(e)));
  fp.on('console', (m) => { if (m.type() === 'error') ferr.push(m.text()); });
  await fp.goto(HTML);
  await fp.waitForTimeout(900);
  /* 73 가이드 소환 미션이 «지정된 상자» 외 소환을 막는다 — 84·187 게이트와 같은 처리 */
  await fp.evaluate(`(() => {
    S.dia = 1e12;
    const bk = (typeof gmBan === 'function' && gmBan()) || 'weapon';
    const res = []; for (let i = 0; i < 30; i++) res.push(summonOne(bk));
    showSummonResult(bk, 30, res, false);
  })()`);
  await fp.waitForTimeout(900);
  for (const [k, id] of [['F1 10연(💎) 버튼', '#sumB10'], ['F2 30연(💎) 버튼', '#sumB30']]) {
    const before = await fp.evaluate('({ dia: S.dia, sum: S.summons })');
    await fp.click(id, { timeout: 8000 });
    await fp.waitForTimeout(700);
    const after = await fp.evaluate(
      "({ dia: S.dia, sum: S.summons, on: document.getElementById('sumw').classList.contains('on'),"
      + " h: document.querySelector('.sm-panel').getBoundingClientRect().height })");
    R.push({ n: k, got: '💎−' + (before.dia - after.dia) + ' / +' + (after.sum - before.sum)
      + '회 / 패널 ' + Math.round(after.h), want: '차감 + 소환 + 패널 1080 고정', d: 0,
      pass: after.dia < before.dia && after.sum > before.sum && after.on
            && Math.abs(after.h - PH) <= 0.5 });
  }
  /* ★ 187 이 잡던 «결과가 줄면 패널도 줄어든다» 의 정반대 — 327 은 안 줄어야 한다 */
  await fp.evaluate(SETUP(10));
  await fp.waitForTimeout(400);
  const shrink = await fp.evaluate(GEO);
  ok('F3 결과가 10칸으로 줄어도 패널 1080', shrink.panel.h, PH, 0);
  ok('F4 결과가 줄어도 패널 top 606', shrink.panel.y, 606, 0);
  await fp.mouse.click(540, 300);          /* 딤 탭 — 버튼·패널이 아닌 좌표 */
  await fp.waitForTimeout(300);
  ok('F5 «터치하여 닫기» 동작',
    await fp.evaluate("!document.getElementById('sumw').classList.contains('on')"), true, 0);
  ok('F6 기능 체크 런타임 에러', ferr.length, 0, 0);
  await fc.close();

  ok('G0 콘솔·런타임 에러', errs.length, 0, 0);

  /* ══ G. 되돌림 시험 — 187 의 값으로 되돌리면 §A·§C·§E 가 **실제로** 빨개지는가 ══
     («있으나 마나 한 단언» 방지: 186 이 남긴 교훈, 187 G 절이 쓴 방식 그대로) */
  const rv = await openAt(b, { width: 1080, height: 2280 }, 30,
    '#sumw{--sm-gh:676px !important}');
  ok('G1 되돌리면 그리드 676', rv.g.grid.h, 676, 0);
  ok('G2 되돌리면 패널 894 (2배가 깨진다 → §A 가 FAIL)', rv.g.panel.h, PAD + 676, 0);
  ok('G3 되돌리면 다시 가려진다 (§E 가 FAIL)', rv.g.fullCards < 30, true, 0);
  ok('G4 되돌리면 보이는 행 4 (= 187 의 상한)', rv.g.rowsFull, 4, 0);
  /* ★ `safe center` 의 존재 이유 — 내용이 상자보다 커지면 중앙이 아니라 **위** 정렬이라
     첫 행이 위로 잘려 못 닿는 일이 없다. 676 < 846 인 이 상태가 바로 그 경우다. */
  ok('G5 넘칠 때는 첫 행이 그리드 맨 위에 붙는다(safe)',
    +(rv.g.firstY - rv.g.grid.y).toFixed(1), 0, 1);
  ok('G6 넘칠 때는 스크롤이 생긴다', rv.g.grid.sh > rv.g.grid.h, true, 0);
  await rv.c.close();

  await b.close();

  const bad = R.filter((r) => !r.pass);
  R.forEach((r) => console.log((r.pass ? '  ok ' : '  XX ') + String(r.n).padEnd(38)
    + ' got=' + String(r.got).padEnd(14) + ' want=' + String(r.want).padEnd(14)
    + (r.d ? ' Δ=' + r.d : '')));
  if (errs.length) console.log('errors: ' + errs.slice(0, 5).join(' | '));
  console.log('VERIFY327 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
