/* 작업 745 재현자 — «배수 소환의 결과 칸이 327 의 전제(고유 종 ≤ 30)를 넘어서는가»
   실행: node tools/probe745.js

   등재문(PROGRESS 745·737 — 같은 관측이 두 번 등재됐다)의 주장은 이렇다:
     «668 의 ×1000 은 한 번에 30,000장을 뽑아 **배너 종수(36)까지** 고유 칸이 날 수 있고,
      36칸 = 6행 = 1016px 이라 그리드(868)를 넘어 **스크롤이 생긴다**.»

   ⚠ 338 교훈 — **등재문의 가설을 그대로 게이트로 굳히지 말고 먼저 재현한다.**
      338 은 «격파 후에도 덜 깎인 체력바» 를 재현했더니 수리 전에도 예외 없이 가득이었고,
      등재문 처방을 그대로 따랐으면 이미 참인 것을 게이트로 굳힐 뻔했다.
      여기서 물어야 하는 것은 두 층이고 **답이 다를 수 있다**:
        ⓐ **구조적으로** 30칸을 넘는 판이 그려질 수 있는가 (칸 수 → 행 → 넘침)
        ⓑ **실제 플레이로** 그 칸 수에 닿는가 (×1000 = 30,000장을 실제로 굴렸을 때 고유 종)
      ⓐ 가 참이고 ⓑ 가 거짓이면 «닿지 않는 여지» 이고, 둘 다 참이면 327 의 머리말
      («스크롤조차 안 쓴다»)이 배수 상황에서 **거짓**이다.

   이 자는 아무것도 고치지 않는다 — 수치만 찍는다. 처방·게이트는 verify745 가 든다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (cond, n, got) => R.push({ n, pass: !!cond, got });
const say = (n, got) => R.push({ n, pass: null, got });   /* 관측만 — 통과/실패를 안 매긴다 */

const GH = 868;          /* 그리드 높이 (CSS 상수 --sm-gh · 713 이관 뒤 값) */
const PITCH = 170;       /* 카드 158 + gap 12 */
const cardsH = (n) => PITCH * n - 12;

/* verify327 의 GEO 와 같은 식을 쓴다 — 값이 두 벌이 되지 않게 */
const GEO = `(() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const k = A.height / app.offsetHeight;
  const grid = document.getElementById('sumGrid');
  const gb = grid.getBoundingClientRect();
  const cards = [...document.getElementById('sumGridIn').children];
  const full = cards.filter((c) => { const b = c.getBoundingClientRect();
    return b.top >= gb.top - 0.5 && b.bottom <= gb.bottom + 0.5; });
  const rowsOf = (l) => new Set(l.map((c) =>
    Math.round(c.getBoundingClientRect().top - gb.top + grid.scrollTop))).size;
  const cols = (() => { if (!cards.length) return 0;
    const t = Math.round(cards[0].getBoundingClientRect().top);
    return cards.filter((c) => Math.round(c.getBoundingClientRect().top) === t).length; })();
  return {
    cards: cards.length, fullCards: full.length,
    rowsTotal: rowsOf(cards), rowsFull: rowsOf(full), cols,
    gridH: +gb.height.toFixed(1), scrollH: grid.scrollHeight, scrollTop: grid.scrollTop,
    over: +(grid.scrollHeight - gb.height).toFixed(1)
  };
})()`;

/* 결과 n칸을 «전부 다른 아이템» 으로 만들어 팝업에 직접 넣는다 (verify327 SETUP 과 같은 식) */
const INJECT = (n) => `(() => {
  S.dia = 1e12;
  const res = [], seen = new Set();
  for (const bk of BKEYS) {
    for (let i = 0; i < 20000 && res.length < ${n}; i++) {
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

const errs = [];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(HTML);
  await page.waitForTimeout(900);
  /* 73 ③ 가이드 소환 미션이 «지정된 상자» 외 소환을 막는다 — 84·187·327 게이트와 같은 처리 */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });

  /* ══ [A] 배너별 종수 — 한 팝업이 그릴 수 있는 고유 칸의 천장 ══
     한 번의 소환은 **한 배너**에서만 뽑으므로, 칸의 상한은 «전체 아이템» 이 아니라 그 배너의 list 길이다. */
  const spec = await page.evaluate(() => {
    const o = {}; BKEYS.forEach(k => { o[k] = BANNERS[k].list.length; }); return o;
  });
  const maxSpec = Math.max(...Object.values(spec));
  const maxBanner = Object.keys(spec).find(k => spec[k] === maxSpec);
  say('[A1] 배너별 종수', Object.entries(spec).map(([k, v]) => k + ' ' + v).join(' · '));
  say('[A2] 가장 종수가 많은 배너', maxBanner + ' ' + maxSpec + '종');
  ok(maxSpec > 30, '[A3] 종수가 327 의 전제(결과 ≤ 30칸)를 넘는 배너가 있다', maxSpec + '종 > 30');

  /* ══ [B] 구조적 최악 — 그 종수만큼의 칸을 실제로 그리면 넘치는가 ══ */
  const at = async (n) => {
    const made = await page.evaluate(INJECT(n));
    await page.waitForTimeout(700);
    await page.evaluate(FREEZE);
    await page.waitForTimeout(60);
    const g = await page.evaluate(GEO);
    g.made = made;
    return g;
  };

  const g30 = await at(30);
  say('[B0] 그리드 높이 (--sm-gh) · 팝업이 열린 상태에서', g30.gridH + 'px');
  ok(g30.cards === 30 && g30.over <= 0.5 && g30.fullCards === 30,
    '[B1] ×1 30연 (327 이 실제로 잰 판) — 넘침 0 · 30칸 전부 보임',
    g30.cards + '칸 / ' + g30.rowsTotal + '행 / 넘침 ' + g30.over + 'px / 보임 ' + g30.fullCards);

  const gMax = await at(maxSpec);
  say('[B2] 종수만큼 그린 판', gMax.made + '칸 / ' + gMax.rowsTotal + '행 / ' + gMax.cols + '열'
    + ' / scrollH ' + gMax.scrollH + ' vs 그리드 ' + gMax.gridH);
  ok(gMax.over > 0.5, '[B3] 그 판은 그리드를 넘친다 (스크롤이 생긴다)', '넘침 ' + gMax.over + 'px');
  ok(gMax.fullCards < gMax.cards, '[B4] 그래서 «가려짐 0» 이 깨진다 (스크롤 전 안 보이는 칸이 있다)',
    '보임 ' + gMax.fullCards + '/' + gMax.cards + ' → 가려짐 ' + (gMax.cards - gMax.fullCards) + '칸');
  say('[B5] 등재문 산수 대조 (36칸 = 6행 = 1016px)',
    '실측 ' + gMax.rowsTotal + '행 · 카드블록 ' + cardsH(gMax.rowsTotal) + 'px · scrollH ' + gMax.scrollH);

  /* ══ [C] 문턱 — 몇 칸부터 넘치는가 ══ */
  let thr = null;
  for (let n = 31; n <= maxSpec; n++) {
    const g = await at(n);
    if (g.over > 0.5) { thr = { n, g }; break; }
  }
  if (thr) ok(true, '[C1] 넘침이 시작되는 칸 수',
    thr.n + '칸 (' + thr.g.rowsTotal + '행) — 넘침 ' + thr.g.over + 'px');
  else say('[C1] 넘침이 시작되는 칸 수', '종수 안에서는 안 넘친다');

  /* ══ [D] 실제 도달 — 진짜로 굴리면 고유 칸이 몇이 되나 ══
     ⓐ 가 참이어도 여기서 30칸을 안 넘으면 «닿지 않는 여지» 다.
     ⚠ **소환 레벨을 1 로 고정해 놓고 재면 안 된다** — 레벨은 세이브에 쌓이는 값이고,
       `gradeProbs` 가 `l < g.unlock` 으로 등급을 잠그므로 **뽑히는 주머니의 크기 자체가 레벨의 함수**다.
       레벨 1 에서 30,000장을 굴려도 그 배치가 올리는 레벨(≈16)까지만 열린다. 오래 한 계정은
       처음부터 높은 레벨로 시작하므로, 재야 하는 축은 «장수» 가 아니라 **«레벨 × 장수»** 다.
     그래서 레벨 3벌 × 장수 8벌(버튼 10·30 × 배수 1·10·100·1000) × 배너 5 × 씨앗 2 를 훑는다. */
  const SHOTS = await page.evaluate(() => [10, 30, 100, 300, 1000, 3000, 10000, 30000]);
  const real = await page.evaluate(({ SHOTS }) => {
    const out = [];
    const seedRnd = (s) => { let a = s >>> 0; Math.random = () => {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const origRnd = Math.random;
    const LVS = [1, Math.round(SUM_MAXLV / 2), SUM_MAXLV];
    for (const bk of BKEYS) {
      for (const lv of LVS) {
        for (const times of SHOTS) {
          let best = 0;
          for (const seed of [1, 20260902]) {
            seedRnd(seed);
            S.dia = 1e12; S.relic = 1e12; S.own = {}; S.summons = 0;
            BKEYS.forEach(k => { S.sum[k].lv = lv; S.sum[k].exp = 0; });
            const { res } = summonBatch(bk, times);
            best = Math.max(best, new Set(res.map(r => r.it.id)).size);
          }
          out.push({ bk, lv, times, uniq: best, species: BANNERS[bk].list.length });
        }
      }
    }
    Math.random = origRnd;
    return { out, maxLv: SUM_MAXLV };
  }, { SHOTS });
  const rows = real.out;
  const best = rows.reduce((a, c) => (c.uniq > a.uniq ? c : a), rows[0]);
  say('[D0] 소환 레벨 상한 (SUM_MAXLV)', String(real.maxLv));
  /* 레벨별로 «장수 → 최대 고유» 한 줄씩 — 어느 축이 칸을 늘리는지 표로 보이게 */
  for (const lv of [...new Set(rows.map(r => r.lv))]) {
    say('[D1] 레벨 ' + lv + ' — 장수별 최대 고유 칸(전 배너)',
      SHOTS.map(t => t + '장:' + Math.max(...rows.filter(r => r.lv === lv && r.times === t).map(r => r.uniq)))
        .join(' · '));
  }
  say('[D2] 전체 최댓값', best.bk + ' Lv' + best.lv + ' × ' + best.times + '장 → 고유 '
    + best.uniq + '/' + best.species + '종');
  ok(best.uniq > 30, '[D3] 실제 굴림이 30칸을 넘는다 (여지가 아니라 실재다)',
    '최대 고유 ' + best.uniq + '칸');
  const over30 = rows.filter(r => r.uniq > 30);
  const minTimes = over30.length ? Math.min(...over30.map(r => r.times)) : null;
  say('[D4] 30칸을 넘기는 가장 작은 장수',
    minTimes === null ? '없음' : minTimes + '장 (버튼 '
      + (minTimes % 30 === 0 ? '30연 ×' + (minTimes / 30) : '10연 ×' + (minTimes / 10)) + ')');
  ok(minTimes !== null && minTimes > 30, '[D5] ×1(10·30연)만으로는 30칸을 못 넘는다 — 327 의 원래 판은 안전하다',
    minTimes === null ? '못 넘음' : '최소 ' + minTimes + '장');

  /* ══ [E] 실굴림 결과를 그대로 그려 본다 — 진짜 팝업에서 넘치는가 ══ */
  const drawn = await page.evaluate(({ bk, seed, lv, times }) => {
    let a = seed >>> 0; const origRnd = Math.random;
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    S.dia = 1e12; S.relic = 1e12; S.own = {}; S.summons = 0;
    BKEYS.forEach(k => { S.sum[k].lv = lv; S.sum[k].exp = 0; });
    const { res } = summonBatch(bk, times);
    Math.random = origRnd;
    showSummonResult(bk, times, res, false);
    return res.length;
  }, { bk: best.bk, seed: 1, lv: best.lv, times: best.times });
  await page.waitForTimeout(900);
  await page.evaluate(FREEZE);
  await page.waitForTimeout(60);
  const gr = await page.evaluate(GEO);
  say("[E1] 실굴림을 그린 팝업", drawn + '장 → ' + gr.cards + '칸 / ' + gr.rowsTotal + '행'
    + ' / scrollH ' + gr.scrollH + ' vs ' + gr.gridH);
  ok(gr.over > 0.5, '[E2] 실굴림 판이 그리드를 넘친다', '넘침 ' + gr.over + 'px');
  ok(gr.fullCards < gr.cards, '[E3] 실굴림 판에 스크롤 전 안 보이는 칸이 있다',
    '보임 ' + gr.fullCards + '/' + gr.cards);
  ok(gr.scrollTop === 0, '[E4] 열릴 때 scrollTop 은 0 이다 (스크롤은 «생긴다», 미리 내려가 있지 않다)',
    'scrollTop ' + gr.scrollTop);

  /* ══ [F] «스크롤로 회수» 가 말뿐인지 — 넘친 6칸에 실제로 닿는가 ══
     ⚠ 726 이 바로 이 함정을 밟았다: «격자에 스크롤을 준 순간 «아무 데나 탭하면 닫힘» 이
       끄는 손짓을 삼킨다» ⇒ 10px 이동 가드를 넣었다. 이 팝업의 `#sumw` 도 «배경 아무 데나
       탭하면 닫힘» 을 **click** 으로 걸고 있다. 처방 ⓐ 가 «가려짐 0 → 스크롤 허용» 으로
       말을 바꾸려면, 그 스크롤이 **실제로 되는지**를 먼저 확인해야 한다.
       (여기서 «닫혀 버린다» 가 나오면 ⓐ 는 거짓말이 되고 처방이 바뀐다.) */
  /* ① 진짜 브라우저 스크롤 — 합성 이벤트가 아니라 휠로 굴린다(«정말 굴러가는가» 는 이쪽이 답한다) */
  const gbox = await page.evaluate(() => {
    const r = document.getElementById('sumGrid').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.move(gbox.x, gbox.y);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  const wheel = await page.evaluate(() => ({
    st: Math.round(document.getElementById('sumGrid').scrollTop),
    open: document.getElementById('sumw').classList.contains('on')
  }));
  ok(wheel.st > 0 && wheel.open, '[F0] 휠로 실제 스크롤된다 · 팝업은 열린 채',
    'scrollTop ' + wheel.st + ' · ' + (wheel.open ? '열림' : '닫힘'));

  const drag = await page.evaluate(() => {
    const grid = document.getElementById('sumGrid');
    grid.scrollTop = 0;
    const r = grid.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y0 = Math.round(r.top + r.height * 0.75), y1 = Math.round(r.top + r.height * 0.25);
    const T = (t, id, cx, cy) => new Touch({ identifier: id, target: grid, clientX: cx, clientY: cy });
    const fire = (type, cx, cy) => grid.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      touches: type === 'touchend' ? [] : [T(type, 1, cx, cy)],
      targetTouches: type === 'touchend' ? [] : [T(type, 1, cx, cy)],
      changedTouches: [T(type, 1, cx, cy)] }));
    fire('touchstart', x, y0);
    for (let i = 1; i <= 6; i++) fire('touchmove', x, Math.round(y0 + (y1 - y0) * i / 6));
    /* 브라우저가 실제로 굴려 주지는 않으므로(합성 터치는 스크롤을 안 낳는다) 손짓의 **결과**를
       직접 준 뒤, 그 손짓이 «닫기» 로 오인되는지만 본다 — 726 이 물은 것이 그 오인이다. */
    grid.scrollTop = grid.scrollHeight;
    fire('touchend', x, y1);
    const openedAfterDrag = document.getElementById('sumw').classList.contains('on');
    const st = grid.scrollTop;
    const cards = [...document.getElementById('sumGridIn').children];
    const gb = grid.getBoundingClientRect();
    const full = cards.filter(c => { const b = c.getBoundingClientRect();
      return b.top >= gb.top - 0.5 && b.bottom <= gb.bottom + 0.5; }).length;
    /* 마지막 칸이 스크롤 끝에서 보이는가 = «회수됨» 의 실질 */
    const last = cards[cards.length - 1].getBoundingClientRect();
    const lastVisible = last.bottom <= gb.bottom + 0.5 && last.top >= gb.top - 0.5;
    return { openedAfterDrag, st, full, lastVisible, cards: cards.length };
  });
  ok(drag.st > 0, '[F1] 그리드가 실제로 굴러간다 (scrollTop > 0)', 'scrollTop ' + drag.st);
  ok(drag.openedAfterDrag, '[F2] 굴리는 손짓이 «배경 탭 = 닫기» 로 오인되지 않는다 (726 함정)',
    drag.openedAfterDrag ? '팝업 열린 채' : '닫혀 버렸다');
  ok(drag.lastVisible, '[F3] 끝까지 굴리면 마지막 칸이 보인다 (스크롤로 회수된다)',
    '보임 ' + drag.full + '/' + drag.cards + ' · 마지막 칸 ' + (drag.lastVisible ? '보임' : '못 봄'));

  ok(!errs.length, '[Z] 콘솔 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  await ctx.close(); await browser.close();

  let pass = 0, fail = 0;
  R.forEach((r) => {
    if (r.pass === null) { console.log('  ··  ' + r.n + ' — ' + r.got); return; }
    if (r.pass) pass++; else fail++;
    console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.n + ' — ' + r.got);
  });
  console.log('\nprobe745: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
