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

/* ⚑⚑ 963 (2026-09-06) — **켜기와 읽기를 한 틱 안에서 한다.**
   전에는 `SETON` · `SETTLE` · `READ` 세 evaluate 였고, 그 사이가 **틱 경계**였다.
   `#trSubs` 는 제품이 그 자리를 소유한다 — `renderRunes()`(index.html ~40219)가
   `el.classList.toggle('on', el.dataset.trsub === trSub)` 로 **내가 심은 활성을 되돌린다**.
   실측(963 1회차): 되돌림까지 **72.5ms** · 되돌아가는 칸은 언제나 칸1(`trSub='train'`) ·
   현행 틱 넘김 경로는 20회 중 **3회** 어긋났고(15%) 같은 틱 경로는 **0/20** 이다.
   그래서 probe379 를 세 번 돌리면 세 번째 판의 ⓑ 가 «칸3 «단련»» 자리에 **칸1 «훈련» 을 한 번 더**
   찍었다(6회 중 4쌍이 서로 다르다 — 등재 963).
   ⚠ 그 전에도 «되읽기»(아래 onIdx)는 있었지만 그것은 **조용한 대체**였다 — 틀린 칸을 찍되
     틀렸다고 말하지 않아, 쓰는 사람은 칸3 을 잰 표로 읽는다. 되읽기는 남기고(전제 검사로 쓴다)
     **어긋나면 값을 찍지 않고 큰 소리로 신고**한다(아래 ⓑ). 문턱·허용치는 한 칸도 안 넓혔다.
   ⚠ 같은 틱이 안전한 이유: `.stab`/`.stab.on` 은 전환(transition)이 없는 **순수 클래스 기하**라
     (`.stabs.sp2/.sp3/.sp4` 규칙 — index.html ~13924~13950) `getBoundingClientRect()` 가
     강제 리플로 뒤 최종값을 돌려준다. 그래서 `SETTLE`(입장 연출 대기)은 **호스트 진입 뒤 한 번**만
     필요하고 칸 순회 안에서는 필요 없다.
   i < 0 이면 «전 칸 끄기»(ⓐ 칸 격자를 잴 때 — 활성 칸은 알약이라 상자가 다르다). */
const SET_READ = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells.length) return null;
  if (i >= 0 && !cells[i]) return null;
  cells.forEach((c, j) => {
    const on = i >= 0 && j === i;
    c.classList.toggle('on', on);
    const ink = c.querySelector('i');
    if (ink) { ink.classList.toggle('ol4', on); ink.classList.toggle('ol3', !on); }
  });
  const cs = getComputedStyle(bar);
  const bb = bar.getBoundingClientRect();
  const bw = parseFloat(cs.borderLeftWidth);
  const onIdx = cells.findIndex(c => c.classList.contains('on'));
  return {
    want: i,                        /* 963 — «내가 켠 칸». onIdx 와 다르면 그 판은 못 잰 것이다 */
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
         963 — 끄기와 읽기가 **한 틱**이라 제품 렌더가 그 사이에 못 끼어든다. 그래도 되읽기는
         남긴다(전제 검사) — 켜진 칸이 남아 있으면 그건 클래스 말고 다른 것이 켜고 있다는 뜻이다. */
      const base = await page.evaluate(SET_READ, [sel, -1]);
      if (!base) { console.log(name + ' — 바 없음\n'); continue; }
      hosts++;
      const { outer, border, padW, n, mode } = base;
      const gridCell = outer.w / n;          /* 바깥 상자 균등분할 = 기준 격자 */
      console.log('── ' + name + '  (' + sel + ', ' + mode + ', ' + n + '칸)');
      console.log('   바깥 W ' + f2(outer.w) + ' · 테두리 ' + border
        + ' · 패딩박스 ' + f2(padW) + ' · 바깥/' + n + ' = ' + f2(gridCell));

      /* ⓐ 칸 격자 */
      console.log('   ⓐ 칸 — [실제 좌..우 / 폭]  vs  [바깥 격자 좌..우 / 폭]'
        + (base.onIdx >= 0
          ? '   ⚠⚠ 칸' + (base.onIdx + 1) + ' 이 «한 틱 안에서도 안 꺼졌다» — 그 칸은 알약 상자다(963)'
          : ''));
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
        const r = await page.evaluate(SET_READ, [sel, i]);
        if (!r) { console.log('      칸' + (i + 1) + ' — 칸 없음(건너뜀)'); continue; }
        /* 963 — **어긋나면 값을 안 찍는다.** 전에는 «지금 켜져 있는 칸» 으로 조용히 갈아 끼워
           칸1 을 두 번 찍고 칸3 을 한 번도 안 쟀다(그러고도 표는 3줄이라 멀쩡해 보였다). */
        if (r.onIdx !== i) {
          console.log('      칸' + (i + 1) + ' — ⚠⚠ 못 쟀다: 한 틱 안에서 활성이 '
            + (r.onIdx < 0 ? '전부 꺼졌다' : '칸' + (r.onIdx + 1) + ' 로 되돌려졌다')
            + ' (제품이 이 자리를 소유한다 — 963)');
          continue;
        }
        const j = r.onIdx;                    /* == i. 되읽기로 확인한 값이다 */
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
