/* 작업 379 — «균등분할 서브탭 바(.sp2/.sp3)의 칸 격자 기준 상자가 4칸 격자와 다르다
 *              + 활성 알약의 «칸 대비 오버행» 규칙 누락» 재현기.
 *
 *   node tools/probe379.js
 *
 * ⚑ 338·341·350·363·368·371·378 규칙 — **처방을 따르기 전에 재현한다.**
 *    등재문(352 §13)은 비평가 AT·AV 가 «03 캡처 한 장»에서 읽은 값이다. 그 한 장이
 *    부품 전체의 이야기인지를 **살아 있는 호스트 전부**에서 직접 재는 것이 이 도구의 일이다.
 *
 * 재는 것 — 호스트별로
 *   ⓐ 기준 상자 : 바 «바깥 상자»(border-box) 를 N 등분한 격자 ↔ 실제 칸 상자
 *                 (`.sp2/.sp3` 는 `width:50%/33.3333%` = **패딩박스** 균등분할이라 어긋난다)
 *   ⓑ 오버행    : 활성 알약이 자기 «칸» 보다 좌·우로 몇 px 넓은가
 *                 (ref 는 ~11.5~12.3px/변 — 4칸 격자 `.stab-c2` 는 그 값을 결과로 품고 있다)
 *
 * 판정은 안 한다(probe 다). 숫자만 찍고 verify379 가 그 숫자를 문다.
 *
 * ⚠ 좌표는 전부 **바 바깥 상자 좌변 기준 상대값**이다 — 호스트마다 프레임 절대좌표가 달라
 *    절대값으로는 서로 비교가 안 된다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');

/* 호스트 — probe378 · verify352 와 같은 진입 경로(부품이 하나임을 그 게이트가 이미 못박았다). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
  ['23 룬', '#rnSubs', () => { goTab('grow'); }],
];

const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const sgn = v => (v >= 0 ? '+' : '') + f2(v);

/* 활성 칸을 n 번째로 옮긴다 — probe378 과 같은 손잡이. */
const SETON = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells[i]) return null;
  cells.forEach((c, j) => {
    c.classList.toggle('on', j === i);
    const ink = c.querySelector('i');
    if (ink) { ink.classList.toggle('ol4', j === i); ink.classList.toggle('ol3', j !== i); }
  });
  return true;
};

/* 전 칸 비활성 — ⓐ(칸 격자)를 잴 때만 쓴다. 활성 칸은 알약이라 상자가 다르다. */
const SETOFF = ([sel]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  [...bar.querySelectorAll(':scope > .stab')].forEach(c => {
    c.classList.remove('on');
    const ink = c.querySelector('i');
    if (ink) { ink.classList.remove('ol4'); ink.classList.add('ol3'); }
  });
  return true;
};

/* ⚑ probe378 교훈 — «내가 켠 칸» 이 아니라 **지금 실제로 켜져 있는 칸**을 읽는다
   (renderUI() 가 매 틱 `.on` 을 다시 그리는 바가 있다). */
const READ = ([sel]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells.length) return null;
  const cs = getComputedStyle(bar);
  const bb = bar.getBoundingClientRect();
  const bw = parseFloat(cs.borderLeftWidth);
  const onIdx = cells.findIndex(c => c.classList.contains('on'));
  return {
    /* 바 바깥 상자(border-box) — 이것이 4칸 격자가 나누는 상자다 */
    outer: { x: bb.x, w: bb.width },
    border: bw,
    /* 패딩박스 — `.sp2/.sp3` 의 % 가 나누는 상자 */
    padW: bb.width - bw * 2,
    n: cells.length,
    onIdx,
    mode: bar.classList.contains('sp2') ? 'sp2'
        : bar.classList.contains('sp3') ? 'sp3' : 'grid4',
    cells: cells.map(c => {
      const r = c.getBoundingClientRect();
      return {
        l: r.x - bb.x,            /* 바 바깥 좌변 기준 */
        w: r.width,
        on: c.classList.contains('on'),
        label: (c.querySelector('i') || {}).textContent || '',
      };
    }),
  };
};

/* 입장 연출 settle — verify47·probe378 과 같은 것. 안 기다리면 `jzPgIn scale(.985)` 중에 읽는다. */
const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

(async () => {
  const browser = await launch(chromium);
  let hosts = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });

    console.log('\n379 재현 — 좌표는 전부 «바 바깥 상자 좌변» 기준 상대값');
    console.log('  ⓐ 기준 상자 : 바깥 W 를 N 등분한 격자 ↔ 실제 칸');
    console.log('  ⓑ 오버행    : 활성 알약 변 − 자기 칸 변 (ref ≈ +11.5~12.3 / 변)\n');

    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) {
        console.log(name + ' 진입 실패 — ' + e.message.slice(0, 60)); continue;
      }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);

      /* ⓐ 는 «칸» 을 재는 절이다 — 활성 칸은 알약이라 상자가 다르다(오버행). 전부 끄고 읽는다.
         ⚠ 못 끄는 바(renderUI 가 매 틱 다시 그린다)가 있으므로 되읽기로 확인하고 그 칸은 표시한다. */
      await page.evaluate(SETOFF, [sel]);
      await page.evaluate(SETTLE);
      const base = await page.evaluate(READ, [sel]);
      if (!base) { console.log(name + ' — 바 없음\n'); continue; }
      hosts++;
      const { outer, border, padW, n, mode } = base;
      const gridCell = outer.w / n;          /* 바깥 상자 균등분할 = 기준 격자 */
      console.log('── ' + name + '  (' + sel + ', ' + mode + ', ' + n + '칸)');
      console.log('   바깥 W ' + f2(outer.w) + ' · 테두리 ' + border
        + ' · 패딩박스 ' + f2(padW) + ' · 바깥/' + n + ' = ' + f2(gridCell));

      /* ⓐ 칸 격자 */
      console.log('   ⓐ 칸 — [실제 좌..우 / 폭]  vs  [바깥 격자 좌..우 / 폭]'
        + (base.onIdx >= 0 ? '   ⚠ 칸' + (base.onIdx + 1) + ' 은 «못 끈 활성 칸»(알약 상자다)' : ''));
      base.cells.forEach((c, i) => {
        const gl = i * gridCell, gr = (i + 1) * gridCell;
        console.log('      칸' + (i + 1) + ' «' + (c.label || '?') + '»  '
          + f2(c.l) + '..' + f2(c.l + c.w) + ' / ' + f2(c.w)
          + '   vs  ' + f2(gl) + '..' + f2(gr) + ' / ' + f2(gridCell)
          + '   Δ좌 ' + sgn(c.l - gl) + ' Δ우 ' + sgn(c.l + c.w - gr) + ' Δ폭 ' + sgn(c.w - gridCell));
      });

      /* ⓑ 오버행 — 칸을 차례로 활성으로 만들고 알약 상자를 «그 칸의 격자» 와 견준다 */
      console.log('   ⓑ 오버행 — 활성 알약 변 − 바깥 격자 칸 변');
      for (let i = 0; i < n; i++) {
        if (!await page.evaluate(SETON, [sel, i])) continue;
        await page.evaluate(SETTLE);
        const r = await page.evaluate(READ, [sel]);
        if (!r || r.onIdx < 0) { console.log('      칸' + (i + 1) + ' — 활성 주입 되돌려짐(건너뜀)'); continue; }
        const j = r.onIdx;                    /* 실제로 켜진 칸 */
        const p = r.cells[j];
        const gl = j * gridCell, gr = (j + 1) * gridCell;
        console.log('      칸' + (j + 1) + ' «' + (p.label || '?') + '» 활성  알약 '
          + f2(p.l) + '..' + f2(p.l + p.w) + ' / 폭 ' + f2(p.w)
          + '   오버행 좌 ' + sgn(gl - p.l) + ' 우 ' + sgn(p.l + p.w - gr)
          + '   (기대 폭 ' + f2(gridCell + 23.33) + ' → Δ ' + sgn(p.w - (gridCell + 23.33)) + ')');
      }
      console.log('');
    }
    console.log('호스트 ' + hosts + '곳 측정 완료.\n');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
