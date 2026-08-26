/* 작업 10 (2차 폴리시 라운드) — 상점 팝업 «소환 탭» 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 레퍼런스 docs/ref/10-상점-팝업-소환-탭.jpg 는 1080×2340,
   변환은 단 하나: 프레임 y = 레퍼런스 y − 84 (가로 1:1).

   진입: 정식 경로 openShopPage() (탭바 🏪 와 같은 경로).
   상태 주입은 레퍼런스와 같은 값으로 맞춘다 —
     무기 Lv.2 100/130 · 방어구 Lv.2 120/130 · 스킬 Lv.3 70/500 · 무료 2/2 · 다이아 충분.

   LESSONS 28-③ — 전투 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨긴다.
   LESSONS 51-③ — 유휴 루프/상시 연출(122)이 굴리는 값은 픽셀 회귀에서 빼야 하므로 멈춘다.

   실행: node tools/cap10.js [출력경로] [--geo]
*/
const { chromium } = require('playwright');
const path = require('path');

const out = process.argv[2] || 'docs/review/10-r3.png';
const GEO = process.argv.includes('--geo');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    /* 레퍼런스와 같은 «10연은 살 수 있고 30연은 못 사는» 상태 —
       b2 는 rich(노랑), b3 는 lack(회색+빨강 숫자) 로 찍혀야 색·상태가 레퍼런스와 대응한다. */
    S.dia = 2000; S.gold = 1e9;
    /* 레퍼런스와 같은 카드 상태 */
    const set = (k, lv, exp) => { if (S.sum[k]) { S.sum[k].lv = lv; S.sum[k].exp = exp; } };
    set('weapon', 2, 100); set('shield', 2, 120); set('skill', 3, 70);
    S.daily = S.daily || {};
    S.daily.freeSum = {};                     /* 무료 2/2 로 복구 */
    openShopPage();
  });
  await p.waitForTimeout(1200);

  /* 정지 캡처: 유휴 루프·전투 캔버스·122 상시 연출 정지 */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
  });
  await p.waitForTimeout(150);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = { frameH: +A.height.toFixed(1), ref: 'frame y = ref y - 84' };
    const box = (r) => ({
      x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bot: +(A.bottom - r.bottom).toFixed(1)
    });
    const R = (k, sel, root) => {
      const e = (root || document).querySelector(sel); if (!e) { g[k] = null; return null; }
      g[k] = box(e.getBoundingClientRect()); return e;
    };
    R('shopw', '#shopw'); R('list', '.shp-list'); R('cats', '.shp-cats');
    R('tabbar', '#tabbar'); R('top', '#top');
    const cards = [...document.querySelectorAll('.shp-card')];
    g.cardCount = cards.length;
    g.cards = cards.slice(0, 3).map((c) => box(c.getBoundingClientRect()));
    const c1 = cards[0];
    if (c1) {
      const o = c1.getBoundingClientRect();
      const rel = (k, sel) => {
        const e = c1.querySelector(sel); if (!e) { g[k] = null; return; }
        const r = e.getBoundingClientRect();
        g[k] = { dx: +(r.left - o.left).toFixed(1), dy: +(r.top - o.top).toFixed(1),
                 w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      };
      rel('c_hd', '.chd'); rel('c_art', '.cart'); rel('c_mag', '.cmag');
      rel('c_lv', '.clv'); rel('c_bar', '.cbar');
      rel('c_b1', '.b1'); rel('c_ad', '.adbadge'); rel('c_b2', '.b2'); rel('c_b3', '.b3');
    }
    const tabs = [...document.querySelectorAll('.shp-cats .stab')];
    g.tabCount = tabs.length;
    g.tabCenters = tabs.map((t) => {
      const r = t.getBoundingClientRect();
      return +(r.left + r.width / 2 - A.left).toFixed(1);
    });
    return g;
  });

  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', out) });
  if (GEO) console.log(JSON.stringify(geo, null, 1));
  console.log('errors:', errs.length, errs.slice(0, 5));
  await b.close();
})();
