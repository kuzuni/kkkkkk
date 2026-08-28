/* 작업 337 — 공용 서브탭 부품을 키운 뒤 **7 호스트 전부**에서 라벨이 칸을 넘지 않는지 재는 자.
 *
 *   node tools/probe337.js
 *
 * ① 이 라벨을 +9~19% 키우므로 «03 만 맞고 다른 호스트가 넘친다» 가 이 작업의 유일한 구조적 위험이다.
 * 부품은 하나인데 칸 폭은 호스트마다 다르다(sp2 균등 · sp3 균등 · `.stab-c1~c4` 4칸 격자).
 * 라벨 잉크 상자가 칸 안쪽(좌우 여백 ≥ 8px)에 들어오는지, 그리고 옆 칸 라벨과 안 겹치는지 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const MIN_SIDE = 8;      /* 라벨 잉크 ↔ 칸 경계 최소 여백 */

const HOSTS = [
  ['07 스킬 (.sk-tabs)', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비 (#eqTabs)', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전 (#dunSub)', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점 (#shopCats)', '#shopCats', () => openShopPage()],
  ['13 재화 (#shopCats)', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click()],
  ['23 훈련 (.tr-subs)', '#trSubs', () => { goTab('grow'); }],
  /* 23 다음에 돈다 — 훈련 팝업은 이미 열려 있다. 한 evaluate 에 `goTab('grow')` 과 묶으면
     `.tr-box.rune` 이 붙기 전에 재게 되어 «안 보임» 이 나온다(부품 문제가 아니다). */
  ['47 룬 (.rn-subs)', '#rnSubs', () => setTrSub('rune')],
];

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✔ ' + name + (extra ? '   ' + extra : '')); }
  else { fail++; console.log('  ✘ ' + name + (extra ? '   ' + extra : '')); }
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);

    for (const [name, sel, setup] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(500);
      const g = await page.evaluate(s => {
        const bar = document.querySelector(s);
        if (!bar || !bar.offsetParent) return null;
        const bb = bar.getBoundingClientRect();
        const cells = [...bar.querySelectorAll('.stab')].filter(c => c.offsetParent).map(c => {
          const cb = c.getBoundingClientRect();
          const i = c.querySelector('i');
          /* ⚠ `<i>` 의 레이아웃 상자를 재면 안 된다 — 07·26·50 시트는
             `:is(#bSk,#bPet,#bCos) i{display:block}`(ID 급) 로 `.stab>i{display:inline-block}` 을
             이겨서 상자가 **칸 폭 전체**가 된다(글자는 `text-align:center` 로 가운데). 상자를 재면
             그 세 시트만 «여백 3px» 로 빨개진다 — 재야 하는 것은 글자다. Range 로 글리프 상자를 잡는다
             (transform 이 반영된 client 좌표라 scaleX 도 같이 들어온다). */
          let ib = null;
          if (i && i.firstChild) {
            const rg = document.createRange();
            rg.selectNodeContents(i);
            ib = rg.getBoundingClientRect();
          }
          return {
            txt: i ? i.textContent : '', on: c.classList.contains('on'),
            x: +cb.x.toFixed(1), r: +cb.right.toFixed(1), w: +cb.width.toFixed(1),
            ix: ib ? +ib.x.toFixed(1) : null, ir: ib ? +ib.right.toFixed(1) : null,
            iy: ib ? +ib.y.toFixed(1) : null, ib: ib ? +ib.bottom.toFixed(1) : null,
          };
        });
        return { bar: { x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) }, cells };
      }, sel);

      console.log('\n── ' + name + '  ' + (g ? JSON.stringify(g.bar) : '(안 보임)'));
      if (!g) { ok(name + ' 호스트가 보인다', false); continue; }
      ok('칸 ≥ 2', g.cells.length >= 2, g.cells.length + '칸');
      for (const c of g.cells) {
        const l = c.ix - c.x, r = c.r - c.ir;
        ok('«' + c.txt + '»' + (c.on ? '(활성)' : '') + ' 칸 안쪽 여백 ≥ ' + MIN_SIDE,
          l >= MIN_SIDE && r >= MIN_SIDE, '좌 ' + l.toFixed(1) + ' / 우 ' + r.toFixed(1) + ' (칸 w' + c.w + ')');
      }
      /* 옆 칸 라벨끼리 겹치지 않는다 — 칸 경계가 아니라 잉크 상자로 본다 */
      for (let i = 1; i < g.cells.length; i++) {
        ok('«' + g.cells[i - 1].txt + '» ↔ «' + g.cells[i].txt + '» 라벨 안 겹침',
          g.cells[i].ix > g.cells[i - 1].ir, 'gap ' + (g.cells[i].ix - g.cells[i - 1].ir).toFixed(1));
      }
      /* 라벨이 바 밖으로 안 나간다(세로) */
      for (const c of g.cells) {
        ok('«' + c.txt + '» 라벨이 바 세로 범위 안', c.iy >= g.bar.y - 1 && c.ib <= g.bar.y + g.bar.h + 1,
          c.iy + '~' + c.ib + ' vs 바 ' + g.bar.y + '~' + (g.bar.y + g.bar.h));
      }
    }
  } finally { await browser.close(); }
  console.log('\nPROBE337 ' + pass + '/' + (pass + fail) + (fail ? '  ✘ 실패 ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
