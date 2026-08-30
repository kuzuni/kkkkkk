/* 작업 518 3회차 — «페이지형 화면 3개»(03 던전 `#dunw` · 10 상점 `#shopw` · 89 유물 `#relw`, 전부 z28)
 * 안의 **누를 수 있는 자리 전수**를 눌러 보고 PROGRESS 518 행이 요구하는 O/X 표를 찍는다.
 *
 * 재는 것(자리마다 — 항상 «새 로드» 에서 한 자리씩):
 *   ① 재화 O/X   — 그 클릭이 실제로 재화(FXCUR 5종 + 마일리지·입장권)를 **주는가**
 *   ② 발원 O/X   — 그 경로가 `fxAt(요소)` 로 «여기서 났다» 고 **알려 주는가**(아니면 탭 추측)
 *   ③ 층         — 그 사이 태어난 재화 연출이 `#fxl`(팝업 위) 인가 `#fxlc`(팝업 아래) 인가
 *
 * ⚠ 이 표가 곧 3회차 처방의 근거다 — `fxCovered()` 를 페이지형까지 넓히면
 *   **①O + ②X** 인 자리는 «진짜 보상인데 페이지 아래로 묻히는» 자리가 된다.
 *   그래서 넓히기 **전에** 그 자리들에 `fxAt()` 를 달아야 한다(회차 기록 ⑤-2 · LESSONS 518-⑤).
 *
 * 실행: node tools/probe518p.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const PAGES = [
  { key: 'dunw',  label: '03 던전',  open: "openDungeon()",           subs: ['raid', 'dun', 'tower'], subSel: d => '#dunSub .stab[data-dsub="' + d + '"]' },
  { key: 'shopw', label: '10 상점',  open: "openShopPage(null,'%s')", subs: ['summon', 'coin', 'pass'], subSel: null },
  { key: 'relw',  label: '89 유물',  open: "openRelw()",              subs: [null], subSel: null },
];

/* 페이지 안에서 «누를 수 있는 자리» 로 세는 것 — 카드·버튼·교환 알약 전부 */
const CLICK_SEL = 'button,[data-cnad],[data-diabuy],[data-exch],[data-dunex],[data-mn],'
                + '.bt,.ex,.cbtn,.gbtn,.rw-basin,.dnc,.shp-card,.cn-cd,.rc,.sg,.stab';

const boot = async (page, file) => {
  await page.goto('file://' + file);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    /* 실행 계측 — fxAt 는 최상위 함수 선언이라 전역 프로퍼티다(호출부가 전역을 거친다) */
    if (!window.__fxAtWrapped) {
      const orig = window.fxAt;
      window.__fxAtN = 0; window.__fxAtC = 0; window.__fxAtWrapped = true;
      /* ⚠ 배경 전투가 킬마다 fxAt(…,'combat') 를 부른다 — «화면이 알려 준 발원» 은 그것이 아니라
         src 없는 UI 힌트뿐이다. 두 카운터를 갈라야 표가 오염되지 않는다(1차 실행이 그래서 전부 O 였다). */
      window.fxAt = function (t, src) { if (src === 'combat') window.__fxAtC++; else window.__fxAtN++; return orig.apply(this, arguments); };
    }
    /* 자리마다 «살 수 있다 · 받을 수 있다» 가 참이어야 경로가 실제로 돈다 */
    S.dia = 1e9; S.gold = 1e9; S.mileage = 1e9; S.relic = 1e9;
    S.daily = S.daily || {}; S.daily.adBuy = {};
    uiDirty = true;
  });
};

(async () => {
  const file = path.resolve(__dirname, '../index.html');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  console.log('\n=== probe518p — 페이지형 3화면 «재화를 주는 자리» 전수 표');

  const rows = [];
  for (const P of PAGES) {
    for (const sub of P.subs) {
      await boot(page, file);
      /* 이 (페이지, 서브탭) 의 자리 수를 먼저 센다 */
      const n = await page.evaluate(async ({ P, sub, SEL }) => {
        eval(P.open.replace('%s', sub || ''));
        await new Promise(r => setTimeout(r, 400));
        if (P.subSel && sub) { const t = document.querySelector(P.subSel.replace('{d}', sub)); if (t) { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); t.click(); } }
        await new Promise(r => setTimeout(r, 400));
        const root = document.getElementById(P.key);
        return [...root.querySelectorAll(SEL)].filter(e => e.getBoundingClientRect().width > 0).length;
      }, { P: { ...P, subSel: P.subSel ? P.subSel('{d}') : null }, sub, SEL: CLICK_SEL });

      for (let i = 0; i < n; i++) {
        await boot(page, file);
        const r = await page.evaluate(async ({ P, sub, SEL, i }) => {
          const CUR = ['gold', 'dia', 'relic', 'stone', 'tstone', 'rstone', 'mileage'];
          const snap = () => { const o = {}; CUR.forEach(k => o[k] = S[k] || 0); o.tk = Object.values(S.dunTk || {}).reduce((a, v) => a + (v | 0), 0); return o; };
          eval(P.open.replace('%s', sub || ''));
          await new Promise(r2 => setTimeout(r2, 400));
          if (P.subSel && sub) { const t = document.querySelector(P.subSel.replace('{d}', sub)); if (t) { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); t.click(); } }
          await new Promise(r2 => setTimeout(r2, 400));
          const root = document.getElementById(P.key);
          const list = [...root.querySelectorAll(SEL)].filter(e => e.getBoundingClientRect().width > 0);
          const el = list[i];
          if (!el) return { skip: '자리 없음' };
          const name = (el.id ? '#' + el.id : '') + (el.dataset && Object.keys(el.dataset).length ? '[' + Object.keys(el.dataset).map(k => k + '=' + el.dataset[k]).join(',') + ']' : '')
            + ' .' + String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.')
            + ' «' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18) + '»';

          /* ⚠ 배경 전투가 700ms 동안 골드를 계속 번다 — «이 자리가 준 재화» 는 **클릭 핸들러가
             동기적으로** 올린 몫이다(수령·교환 경로는 전부 동기다). 그래서 클릭 직후(같은 틱)에
             한 번, 700ms 뒤에 한 번 잰다: 앞의 것이 표의 «재화» 칸, 뒤의 것은 참고다. */
          const before = snap();
          const at0 = window.__fxAtN;
          const layers = [];
          const mo = new MutationObserver(recs => {
            for (const rec of recs) for (const nd of rec.addedNodes) {
              if (nd.nodeType !== 1 || !nd.closest) continue;
              if (!/fx-fly|fx-lit|fx-plus|fx-spark/.test(nd.className || '')) continue;
              const L = nd.closest('#fxl') ? 'fxl' : (nd.closest('#fxlc') ? 'fxlc' : '?');
              if (!layers.includes(L)) layers.push(L);
            }
          });
          mo.observe(document.body, { childList: true, subtree: true });
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          el.click();
          const sync = snap();                                  /* 같은 틱 — 배경 전투가 끼어들기 전 */
          const atSync = window.__fxAtN - at0;
          await new Promise(r2 => setTimeout(r2, 700));
          mo.disconnect();
          const gains = CUR.concat('tk').filter(k => sync[k] > before[k]).map(k => k + '+' + Math.round(sync[k] - before[k]));
          return { name, gains, fxAt: atSync, fxAtLate: window.__fxAtN - at0, layers, covered: fxCovered() };
        }, { P: { ...P, subSel: P.subSel ? P.subSel('{d}') : null }, sub, SEL: CLICK_SEL, i });

        if (r.skip) continue;
        rows.push({ page: P.label + (sub ? '/' + sub : ''), ...r });
      }
    }
  }

  const hdr = '  ' + '화면'.padEnd(14) + '자리'.padEnd(46) + ' 재화 발원 층';
  console.log(hdr);
  console.log('  ' + '-'.repeat(84));
  const need = [];
  for (const r of rows) {
    const got = r.gains.length ? 'O' : '·';
    const src = r.fxAt ? 'O' : (r.fxAtLate ? '~' : '·');
    const bad = r.gains.length && !r.fxAtLate;
    if (bad) need.push(r);
    console.log('  ' + (bad ? '!' : ' ') + r.page.padEnd(13) + r.name.slice(0, 45).padEnd(46)
      + '  ' + got + '   ' + src + '   ' + (r.layers.join(',') || '-')
      + (r.gains.length ? '  ' + r.gains.join(' ') : ''));
  }
  console.log('\n자리 ' + rows.length + '개 중 «재화 O + 발원 X»(넓히면 묻히는 자리) = **' + need.length + '개**'
    + (need.length ? '\n  → ' + need.map(x => x.page + ' ' + x.name.slice(0, 40)).join('\n  → ') : ''));
  console.log('콘솔 에러 ' + errs.length + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  process.exit(0);
})();
