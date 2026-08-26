/* 작업 13 (2차 폴리시 라운드) — 상점 팝업 «재화 탭» 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 레퍼런스 docs/ref/13-상점-팝업-재화-탭.jpg 는 1080×2340,
   변환은 단 하나: 프레임 y = 레퍼런스 y − 84 (가로 1:1).

   1차 라운드(1~5회차)는 1080×1920 · «ref y − 88» 시절이라 좌표계가 다르다.
   2차 라운드는 이 하네스로만 잰다.

   진입: 정식 경로 openShopPage() → 카테고리 «재화» 탭 클릭(사용자와 같은 경로).
   상태 주입 — 레퍼런스와 같은 «① 칸만 구매 완료, 나머지는 남아 있음»:
     S.daily.adBuy = { a1: 0 }  (a1 = 보석 ×100, cap 1 → 0 이면 «구매 완료» 오버레이)
   HUD/탭바 크롬도 레퍼런스 상태다(coin 스코프 민바 + A1 ✕ 칸) — 페이지만 맞추면 ①②④ 가 깎인다(1차 라운드 교훈 1).

   LESSONS 28-③ — 전투 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨긴다.
   LESSONS 51-③ — 유휴 루프/상시 연출(122)이 굴리는 값은 픽셀 회귀에서 빼야 하므로 멈춘다.

   실행: node tools/cap13.js [출력경로] [--geo]
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const out = process.argv[2] || 'docs/review/13-r6.png';
const GEO = process.argv.includes('--geo');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    S.dia = 30000; S.gold = 1e9; S.relic = 5000;
    S.daily = S.daily || {};
    /* 레퍼런스 ① 칸 = 구매 완료. 나머지 5칸은 «받기»(남은 횟수 그대로) */
    S.daily.adBuy = { a1: 0 };
    /* 레퍼런스 탭바는 **NEW 리본이 없고 작은 레드닷만** 있다(측정표 §8: 리본 픽셀 0개).
       NEW 리본은 «아직 한 번도 안 연 탭» 표식(`S.seen`)이라 캡처 상태 문제다 — 전부 본 것으로
       놓고 `.fresh` 를 다시 계산한다(1차 라운드 4회차와 같은 주입). */
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    document.querySelectorAll('#tabbar .tab').forEach((x) => x.classList.remove('fresh'));
    openShopPage();
  });
  await p.waitForTimeout(400);
  /* 카테고리 «재화» 탭을 사용자와 같은 경로로 누른다 */
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('#shopCats [data-cat]')].find(x => x.dataset.cat === 'coin');
    if (t) t.click();
  });
  await p.waitForTimeout(1000);

  /* 정지 캡처: 유휴 루프·전투 캔버스·122 상시 연출 정지 */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
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
    R('banner', '.cn-bn'); R('title', '.cn-ti>i'); R('hd', '.cn-hd>i');
    R('hl1', '.cn-hl'); R('reset', '.cn-rs'); R('ribbon', '.cn-rb');
    R('a2', '.cn-a2'); R('a2t', '.cn-a2t>i'); R('move', '.cn-mv');
    R('milerb', '#cnDiaRb');
    const cards = [...document.querySelectorAll('.cn-cd:not(.dia):not(.rel)')];
    g.adCardCount = cards.length;
    g.adCards = cards.map((c) => {
      const o = box(c.getBoundingClientRect());
      const q = c.querySelector('.qt'), hd = c.querySelector('.hd>i'), bt = c.querySelector('.bt');
      o.qt = q ? box(q.getBoundingClientRect()) : null;
      o.hd = hd ? box(hd.getBoundingClientRect()) : null;
      o.bt = bt ? box(bt.getBoundingClientRect()) : null;
      o.done = c.classList.contains('done');
      return o;
    });
    const pills = [...document.querySelectorAll('#top .cbox')];
    g.pills = pills.map((c) => box(c.getBoundingClientRect()));
    const tabs = [...document.querySelectorAll('.tab')];
    g.tabs = tabs.map((t) => Object.assign(box(t.getBoundingClientRect()),
      { close: t.classList.contains('close'), t: t.dataset.t }));
    g.scrollTop = document.getElementById('shopList').scrollTop;
    return g;
  });

  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', out) });
  if (GEO) console.log(JSON.stringify(geo, null, 1));
  console.log('errors:', errs.length ? errs.slice(0, 5) : 0);
  console.log('saved', out, 'frameH', geo.frameH, 'adCards', geo.adCardCount);
  await b.close();
})();
