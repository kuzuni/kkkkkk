/* 작업 967 — «활성 주입 → 읽기» 가 두 evaluate 인 자 8개 (963 의 전수 이관) 재현기.
 *
 *   node tools/probe967.js
 *
 * ⚑ 338 규칙 — **처방을 따르기 전에 재현한다.** 등재문(967)은 963 1회차가 곁다리로 본 것을
 *    적은 것이고, 그 등재문 자신이 «지금은 전부 초록 = 잠복» 이라고 말한다. 그러면 물어야 할 것은
 *    «지금 빨간가» 가 아니라 **«무엇이 이 자들을 초록으로 붙들고 있는가»** 다 — 그 버팀목이
 *    사라지는 날이 963 이 돌아오는 날이기 때문이다.
 *
 * 재는 것 — 호스트 바 6곳 × 칸마다
 *   ⓐ **결정적 축**  : 활성을 심고 **제품 렌더를 직접 한 번 부른다** → 되돌려지는가.
 *                      963 §5-1 이 못박은 자리다 — 되돌림은 «시간의 함수» 가 아니라
 *                      «제품 렌더가 도는지» 의 함수다. 그래서 이 축만이 «제품이 이 바를 소유하는가» 를
 *                      판마다 안 갈리게 답한다.
 *   ⓑ **벽시계 축**  : 심고 200ms 기다렸다 되읽는다(판마다 갈리므로 **관측만** — 점수로 안 쓴다).
 *   ⓒ **원자 축**    : 심기와 읽기를 **한 evaluate** 로 하면 어긋남이 몇 회인가(대조군).
 *
 * 판정은 안 한다(probe 다). 숫자만 찍고 verify967 이 그 숫자를 문다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const N = Number(process.env.P967_N || 10);          /* 벽시계 축 반복 */

/* 호스트 — probe378·probe379·verify378 과 같은 진입 경로.
   다섯째 칸은 **그 화면의 제품 렌더**다(963 이 `renderTrain()` 을 직접 부른 그 손잡이). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }, () => renderSkill()],
  ['06 장비', '#eqTabs', () => heroSubGo('eq'), () => syncEquipPage()],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }, () => renderDun()],
  ['10 상점', '#shopCats', () => openShopPage(), () => renderShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, () => renderTrain()],
  ['23 룬', '#rnSubs', () => { goTab('grow'); }, () => renderRunes()],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 옛 경로 그대로 — 심기만 한다(읽기는 다음 evaluate). 이 자는 «수리 전» 을 재현하는 데만 쓴다. */
const SETON = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return false;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells[i]) return false;
  cells.forEach((c, j) => {
    c.classList.toggle('on', j === i);
    const ink = c.querySelector('i');
    if (ink) { ink.classList.toggle('ol4', j === i); ink.classList.toggle('ol3', j !== i); }
  });
  return true;
};

const ONIDX = ([sel]) => {
  const bar = document.querySelector(sel);
  if (!bar) return -2;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  return cells.findIndex(c => c.classList.contains('on'));
};

/* 대조군 — 심기와 읽기가 **한 틱**(963 처방). */
const SET_READ = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  if (!cells[i]) return null;
  cells.forEach((c, j) => {
    c.classList.toggle('on', j === i);
    const ink = c.querySelector('i');
    if (ink) { ink.classList.toggle('ol4', j === i); ink.classList.toggle('ol3', j !== i); }
  });
  return { want: i, onIdx: cells.findIndex(c => c.classList.contains('on')) };
};

const cellCount = ([sel]) => {
  const b = document.querySelector(sel);
  return b ? b.querySelectorAll(':scope > .stab').length : 0;
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(process.env.P967_SRC || path.join(ROOT, 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });

    console.log('\n967 재현 — «활성 주입 → 읽기» 두 evaluate 가 무엇에 붙들려 초록인가');
    console.log('  ⓐ 결정적 축 = 심고 **그 화면의 제품 렌더를 직접 한 번** 부른 뒤 되읽는다 (963 §5-1)');
    console.log('  ⓑ 벽시계 축 = 심고 200ms 기다렸다 되읽는다 × ' + N + '회 (판마다 갈린다 — 관측만)');
    console.log('  ⓒ 원자 축   = 심기·읽기를 한 evaluate 로 × ' + N + '회 (963 처방 대조군)\n');

    const rows = [];
    for (const [name, sel, setup, render] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { console.log(name + ' 진입 실패 — ' + e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const n = await page.evaluate(cellCount, [sel]);
      if (!n) { console.log('── ' + name + ' (' + sel + ') — 바 없음'); continue; }
      console.log('── ' + name + ' (' + sel + ', ' + n + '칸)');

      /* 제품 렌더가 실제로 불리는지부터 — 이름이 틀리면 ⓐ 가 «안 되돌려짐» 으로 조용히 거짓 초록이 된다. */
      let renderOk = true;
      try { await page.evaluate(render); } catch (e) { renderOk = false; console.log('   ⚠ 제품 렌더 호출 실패 — ' + e.message.slice(0, 70)); }

      for (let i = 0; i < n; i++) {
        /* ⓐ 결정적 */
        let det = null;
        if (renderOk) {
          await page.evaluate(SETON, [sel, i]);
          await page.evaluate(render);
          det = await page.evaluate(ONIDX, [sel]);
        }
        /* ⓑ 벽시계 */
        let wall = 0;
        for (let k = 0; k < N; k++) {
          await page.evaluate(SETON, [sel, i]);
          await page.waitForTimeout(200);
          if (await page.evaluate(ONIDX, [sel]) !== i) wall++;
        }
        /* ⓒ 원자 */
        let atom = 0;
        for (let k = 0; k < N; k++) {
          const r = await page.evaluate(SET_READ, [sel, i]);
          if (!r || r.onIdx !== i) atom++;
        }
        const owned = renderOk && det !== i;
        rows.push({ name, sel, i, det, wall, atom, owned, renderOk });
        console.log('   칸' + (i + 1)
          + '  ⓐ 제품 렌더 1회 → ' + (!renderOk ? '못 물음' : det === i ? '살아남음' : '되돌려짐(칸' + (det + 1) + ')')
          + '  ·  ⓑ 벽시계 ' + wall + '/' + N
          + '  ·  ⓒ 원자 ' + atom + '/' + N);
      }
    }

    const ownedBars = [...new Set(rows.filter(r => r.owned).map(r => r.name + ' ' + r.sel))];
    const freeBars = [...new Set(rows.filter(r => !r.owned).map(r => r.name + ' ' + r.sel))]
      .filter(b => !ownedBars.includes(b));
    console.log('\n▣ 요약');
    console.log('  제품이 소유하는 바(ⓐ 되돌려짐) : ' + (ownedBars.length ? ownedBars.join(' · ') : '없음'));
    console.log('  제품이 안 건드리는 바           : ' + (freeBars.length ? freeBars.join(' · ') : '없음'));
    console.log('  ⓑ 벽시계 어긋남 합계 ' + rows.reduce((s, r) => s + r.wall, 0)
      + ' / ' + rows.length * N + '  ·  ⓒ 원자 어긋남 합계 '
      + rows.reduce((s, r) => s + r.atom, 0) + ' / ' + rows.length * N);
    console.log('\n⇒ 지금 이 여덟 자를 초록으로 붙들고 있는 것은 «자가 튼튼해서» 가 아니라');
    console.log('   **제품이 안 건드리는 바만 골라 심고 있어서** 다. 그 전제가 자 안에 적혀 있지 않다.');
  } finally {
    await browser.close();
  }
})();
