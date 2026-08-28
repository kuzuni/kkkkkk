/* 작업 294 — «소환 가능(무료·광고)» 레드닷 두 자리의 **기하 실측** 프로브
 *
 *   실행: node tools/probe294.js   (1080x2280 · 헤드리스)
 *
 * verify166 이 «켜지나/꺼지나» 를 보는 반면, 여기서는 지시서 [3]-(가) 가 요구하는
 * «요소 겹침·잘림 0건» 을 숫자로 남긴다. 판정 3개:
 *   ① 배지가 스크롤 뷰포트(`#shopList`)·프레임(`#app`) 밖으로 안 나간다 (잘림 0)
 *   ② 배지가 카드 안 «읽어야 하는» 요소(헤더 제목 잉크 · 버튼 3개 · 확률 🔍)와 안 겹친다
 *   ③ 두 배지가 서로, 그리고 위 카드의 배지와 안 겹친다
 * 캡처 1장(`docs/review/294-shop.png`)도 같이 남긴다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
const R = [];
const ok = (n, c, got) => R.push({ n, c: !!c, got });
const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1100);

  await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    openShopPage(); uiDirty = true; renderUI(); renderShopPage();
  });
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const rc = e => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    return {
      app: rc(document.getElementById('app')),
      list: rc(document.getElementById('shopList')),
      catBdg: rc(document.querySelector('#shopCats .stab[data-cat="summon"] .bdg')),
      catBar: rc(document.getElementById('shopCats')),
      catCell: rc(document.querySelector('#shopCats .stab[data-cat="summon"]')),
      catLab: rc(document.querySelector('#shopCats .stab[data-cat="summon"]>i')),
      /* 03 던전 서브탭은 페이지가 닫혀 있으면 rect 가 전부 0 이라 «계산된 CSS 값» 으로 비교한다 */
      off: ['#shopCats .stab[data-cat="summon"] .bdg', '#dunSub .stab>.bdg'].map(sel => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const s = getComputedStyle(e);
        return { sel, right: s.right, top: s.top, w: s.width, h: s.height };
      }),
      cards: cards.map(c => ({
        card: rc(c),
        dot: rc(c.querySelector('.updot')),
        hd: rc(c.querySelector('.chd>i')),
        mag: rc(c.querySelector('.cmag')),
        btns: [...c.querySelectorAll('.cbtn[data-shsum]')].map(rc),
      })),
    };
  });

  /* ① 잘림 — 배지 전체가 뷰포트·프레임 안에 있는가.
     ⚠ 세로는 «스크롤 위치» 라 판정 대상이 아니다(5번째 카드는 스크롤 아래에 있는 게 정상).
     잘림이 생길 수 있는 축은 `#shopList{overflow-x:hidden}` 인 **가로**뿐이고,
     세로는 «지금 뷰포트에 다 들어와 있는 카드» 에 대해서만 본다. */
  const inside = (a, b) => a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5;
  const inX = (a, b) => a.left >= b.left - .5 && a.right <= b.right + .5;
  const outX = m.cards.filter(c => !inX(c.dot, m.list));
  ok('① 상자 카드 배지 ' + m.cards.length + '개가 `#shopList` 가로 안에 전부 들어간다 (overflow-x:hidden 잘림 0)',
    outX.length === 0,
    outX.length ? outX.map(c => Math.round(c.dot.left) + '~' + Math.round(c.dot.right)).join(' / ')
      : '리스트 x ' + Math.round(m.list.left) + '~' + Math.round(m.list.right)
        + ' · 배지 x ' + Math.round(m.cards[0].dot.left) + '~' + Math.round(m.cards[0].dot.right));
  const vis = m.cards.filter(c => inside(c.card, m.list));
  const outY = vis.filter(c => !inside(c.dot, m.list));
  ok('① 뷰포트에 다 들어온 카드 ' + vis.length + '장은 배지도 같이 들어온다 (세로 잘림 0)',
    vis.length > 0 && outY.length === 0,
    outY.length ? outY.map(c => Math.round(c.dot.top) + '~' + Math.round(c.dot.bottom)).join(' / ')
      : '리스트 y ' + Math.round(m.list.top) + '~' + Math.round(m.list.bottom));
  ok('① 소환 탭 배지가 프레임 안에 들어간다 (잘림 0)', inside(m.catBdg, m.app),
    'x ' + Math.round(m.catBdg.left) + '~' + Math.round(m.catBdg.right)
      + ' · y ' + Math.round(m.catBdg.top) + '~' + Math.round(m.catBdg.bottom));
  ok('① 배지 크기 = 공용 규격 27x27', Math.round(m.catBdg.w) === 27 && Math.round(m.catBdg.h) === 27
    && m.cards.every(c => Math.round(c.dot.w) === 27 && Math.round(c.dot.h) === 27),
    Math.round(m.catBdg.w) + 'x' + Math.round(m.catBdg.h));

  /* ② 겹침 — 읽어야 하는 요소를 가리지 않는가 */
  const bad2 = [];
  m.cards.forEach((c, i) => {
    if (hit(c.dot, c.hd)) bad2.push('카드' + (i + 1) + ' 헤더제목');
    if (hit(c.dot, c.mag)) bad2.push('카드' + (i + 1) + ' 🔍');
    c.btns.forEach((b, j) => { if (hit(c.dot, b)) bad2.push('카드' + (i + 1) + ' 버튼' + (j + 1)); });
  });
  ok('② 상자 카드 배지가 헤더 제목 잉크·🔍·소환 버튼 3개와 안 겹친다 (겹침 0)',
    bad2.length === 0, bad2.length ? bad2.join(' / ') : m.cards.length + '카드 × 5요소 전수');
  /* 소환 탭 배지는 좌표를 새로 적지 않고 공용 `.stab>.bdg`(right:23 top:−6) 를 쓴다.
     그래서 «03 던전 서브탭 배지와 칸 기준 오프셋이 같은가» 가 옳은 판정이다 — 값이 갈라지면
     같은 부품이 화면마다 다른 자리에 뜨는 것이고, 그게 299(«레드닷 우상단 통일») 가 없애려는 병이다. */
  ok('② 소환 탭 배지가 라벨 잉크와 안 겹친다', !hit(m.catBdg, m.catLab),
    '배지 x ' + Math.round(m.catBdg.left) + '~' + Math.round(m.catBdg.right)
      + ' · 라벨 x ' + Math.round(m.catLab.left) + '~' + Math.round(m.catLab.right));
  const [a0, a1] = m.off;
  ok('② 소환 탭 배지 좌표 = 03 던전 서브탭 배지와 동일 (공용 `.stab>.bdg` 재사용 · 우상단, 새 좌표 0줄)',
    !!a0 && !!a1 && a0.right === a1.right && a0.top === a1.top && a0.w === a1.w && a0.h === a1.h,
    a0 ? '소환 ' + a0.right + '/' + a0.top + ' ' + a0.w + 'x' + a0.h
       + ' · 던전 ' + (a1 ? a1.right + '/' + a1.top + ' ' + a1.w + 'x' + a1.h : '없음') : '없음');

  /* ③ 배지끼리 — 위 카드와 서로 안 겹친다 */
  const bad3 = [];
  for (let i = 0; i < m.cards.length; i++)
    for (let j = i + 1; j < m.cards.length; j++)
      if (hit(m.cards[i].dot, m.cards[j].dot)) bad3.push(i + '×' + j);
  m.cards.forEach((c, i) => { if (i > 0 && hit(c.dot, m.cards[i - 1].card)) bad3.push('배지' + (i + 1) + '×윗카드'); });
  ok('③ 배지끼리 · 윗 카드 본체와 안 겹친다 (카드 사이 여백 29px 안에 뜬다)',
    bad3.length === 0, bad3.length ? bad3.join(' / ') : '쌍 전수 0건');

  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs', 'review', '294-shop.png') });
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? '  ok   ' : '  FAIL ') + r.n + (r.got === undefined ? '' : '  [' + r.got + ']')));
  console.log('\nPROBE294 ' + (bad.length ? 'FAIL' : 'PASS') + ' ' + (R.length - bad.length) + '/' + R.length);
  process.exit(bad.length ? 1 : 0);
})();
