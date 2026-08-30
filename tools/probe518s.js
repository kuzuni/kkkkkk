/* 작업 518 — «전수 스윕»: 오프너 목록의 **전 화면**을 돌며
 * «그 화면이 재화를 준 적이 없는데 재화 획득 연출이 화면 위(#fxl)에 뜨는가» 를 센다.
 *
 * 주인 지시가 «루프 돌려서라도 싹다 잡아라 · 전 화면 0» 이므로, 한 자리를 고친 뒤에는
 * 반드시 이 자를 돌려 **남은 자리 목록**을 회차 기록에 남긴다.
 *
 * 재는 것(화면마다):
 *   · 화면을 연다 → 그 안의 «재화를 주지 않는» 노드를 하나 누른다(오프너 자신 또는 첫 버튼)
 *   · 2.5초 동안 #fxl(z60 = 모든 팝업 위)에 태어나는 재화 연출 노드를 센다
 *       fx-fly(코인) · fx-lit(딤 위 알약 복제) · fx-plus(+n) · fx-spark 중 재화색
 *   · 그동안 실제로 «그 화면이» 준 재화는 없다(배경 전투가 버는 골드뿐) ⇒ **0 이어야 한다**
 *
 * ⚠ 이 자는 «덮는 층» 화면만 0 을 요구한다 — 메인 화면(덮는 층 없음)의 UI 발은 정상이다.
 *   그래서 화면마다 `fxCovered()` 도 같이 찍어 «덮는 화면인데 위로 샜다» 만 결함으로 센다.
 *
 * 실행: node tools/probe518s.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const WATCH_MS = 2500;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(1000);

  /* 오프너 수집 — smoke.js 와 같은 축(탭 · 사이드 · 메뉴 · 메뉴 8칸 · 서브탭) */
  const openers = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.tab[data-t]').forEach(n => out.push({ label: 'tab:' + n.dataset.t, sel: '.tab[data-t="' + n.dataset.t + '"]' }));
    document.querySelectorAll('.side .ibtn[data-pop]').forEach(n => out.push({ label: 'side:' + n.dataset.pop, sel: '.side .ibtn[data-pop="' + n.dataset.pop + '"]' }));
    if (document.getElementById('menub')) out.push({ label: 'menu', sel: '#menub' });
    document.querySelectorAll('[data-mn]').forEach(n => out.push({ label: 'menu:' + n.dataset.mn, sel: '#menub', then: '[data-mn="' + n.dataset.mn + '"]' }));
    document.querySelectorAll('[data-cur]').forEach(n => {
      const k = n.dataset.cur;
      if (!out.some(o => o.label === 'cur:' + k)) out.push({ label: 'cur:' + k, sel: '[data-cur="' + k + '"]' });
    });
    return out;
  });

  console.log('\n=== probe518s — 전수 스윕 (오프너 ' + openers.length + ')');
  const rows = [];
  for (const o of openers) {
    const r = await page.evaluate(async ({ o, ms }) => {
      const raf = () => new Promise(r2 => requestAnimationFrame(r2));
      /* 이전 화면 정리 — 열려 있는 층이 없어질 때까지 ESC 대신 «덮는 층» 이 걷힐 때까지 기다린다 */
      if (typeof closeAllModals === 'function') { try { closeAllModals(); } catch (e) {} }
      document.querySelectorAll('#app > .on').forEach(n => n.classList.remove('on'));
      for (let i = 0; i < 60 && fxCovered(); i++) await raf();
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      S.dia = 1e9;

      const click = sel => { const n = document.querySelector(sel); if (!n) return false; n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); n.click(); return true; };
      if (!click(o.sel)) return { label: o.label, skip: '오프너 없음' };
      await new Promise(r2 => setTimeout(r2, 350));
      if (o.then && !click(o.then)) return { label: o.label, skip: '2단계 노드 없음' };
      await new Promise(r2 => setTimeout(r2, 350));

      /* 화면 안의 «재화를 주지 않는» 자리 하나를 누른다 — 이것이 주인이 겪은 순서다
         (탭 → 1.2초 안에 배경 전투 골드) */
      const inner = document.querySelector('#app > .on button, #app > .on [data-q], #app > .on .rc') ;
      if (inner) inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      const covered = fxCovered();
      const gold0 = S.gold, dia0 = S.dia;
      const CURC = ['#FFDE6A', '#8FE9FF', 'rgb(255, 222, 106)', 'rgb(143, 233, 255)'];
      const hits = [];
      const mo = new MutationObserver(recs => {
        for (const rec of recs) for (const n of rec.addedNodes) {
          if (n.nodeType !== 1 || !n.classList || !n.closest('#fxl')) continue;
          const c = n.className || '';
          const col = n.style.getPropertyValue('--c') || n.style.color || '';
          if (/fx-fly|fx-lit/.test(c)) hits.push(c.split(' ')[0]);
          else if (/fx-plus|fx-spark/.test(c) && CURC.includes(col)) hits.push(c.split(' ')[0] + ' ' + col);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      await new Promise(r2 => setTimeout(r2, ms));
      mo.disconnect();
      const sm = {};
      hits.forEach(h => { sm[h] = (sm[h] || 0) + 1; });
      return { label: o.label, covered, goldUp: S.gold - gold0, diaUp: S.dia - dia0, n: hits.length, kinds: sm };
    }, { o, ms: WATCH_MS });
    rows.push(r);
    if (r.skip) { console.log('  --   ' + r.label.padEnd(18) + ' ' + r.skip); continue; }
    const bad = r.covered && r.n > 0;
    console.log('  ' + (bad ? 'LEAK' : ' ok ') + ' ' + r.label.padEnd(18)
      + ' 덮음 ' + (r.covered ? 'O' : '·')
      + ' · #fxl 재화연출 ' + String(r.n).padStart(3)
      + ' · 배경 골드 +' + r.goldUp
      + (r.n ? ' · ' + JSON.stringify(r.kinds) : ''));
  }

  const leaks = rows.filter(r => !r.skip && r.covered && r.n > 0);
  const covered = rows.filter(r => !r.skip && r.covered);
  console.log('\n덮는 화면 ' + covered.length + '개 중 **샌 화면 ' + leaks.length + '개**'
            + (leaks.length ? ' — ' + leaks.map(l => l.label).join(', ') : ' (전 화면 0)'));
  console.log('콘솔 에러 ' + errs.length + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  process.exit(leaks.length ? 1 : 0);
})();
