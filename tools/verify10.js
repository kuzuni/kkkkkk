/* 작업 10 게이트 — 상점 «소환 탭» 기하 회귀 검사 (1080×2280).
   근거: docs/measure/10-상점팝업소환탭.md §1·§2 + 3회차 픽셀 실측(docs/review/10-상점팝업소환탭.md).
   변환은 «프레임 y = 레퍼런스 y − 84» 단 하나. 카드 내부는 카드 좌상단 기준 상대좌표.

   실행: node tools/verify10.js        → 마지막 줄 «VERIFY10 n/n PASS»
   실패하면 어느 항목이 몇 px 어긋났는지 찍는다.

   ⚠ 여기 박힌 값은 «레퍼런스 실측» 이지 «지금 CSS» 가 아니다. CSS 를 바꿔서 이 게이트가 깨지면
      게이트를 고치지 말고 CSS 를 되돌려라(레퍼런스가 바뀐 게 아니면).
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const T = [];   /* [이름, 실제값, 기대값, 허용오차] */
const chk = (n, got, want, tol = 2) => T.push([n, got, want, tol]);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const g = await p.evaluate(() => {
    S.dia = 2000; S.gold = 1e9;
    const set = (k, lv, exp) => { if (S.sum[k]) { S.sum[k].lv = lv; S.sum[k].exp = exp; } };
    set('weapon', 2, 100); set('shield', 2, 120); set('skill', 3, 70);
    S.daily = S.daily || {}; S.daily.freeSum = {};
    /* 190 — ▶AD 뱃지는 이제 **상태에 달렸다**: «오늘 무광고 1회» 가 남아 있는 동안은 감춰지고,
       그 1회를 쓴 뒤부터 나온다(주인 지시 «그럴 때는 광고 표시 없게»). 레퍼런스 10 이 찍은 것은
       뱃지가 **보이는** 상태(= 광고 소환)이므로, 제품이 실제로 쓰는 문(`useFreeSum`)으로 그 상태를
       만든 뒤 잰다 — 여기서 `noAdSum` 을 손으로 0 으로 적으면 그 문이 검사 밖으로 빠진다.
       뱃지 기하는 카드 직속 자식이라 남은 횟수(2/2 → 1/2)와 무관하다. */
    SHOP_BOXES.forEach(x => useFreeSum(x.b));
    openShopPage();
    const A = document.getElementById('app').getBoundingClientRect();
    const o = {};
    const abs = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { o[k] = null; return; }
      const r = e.getBoundingClientRect();
      o[k] = { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height,
               bot: A.bottom - r.bottom };
    };
    abs('page', '#shopw'); abs('cats', '.shp-cats'); abs('tabbar', '#tabbar');
    const cards = [...document.querySelectorAll('.shp-card')];
    o.n = cards.length;
    o.card = cards.slice(0, 3).map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height };
    });
    const c1 = cards[0], or = c1.getBoundingClientRect();
    const rel = (k, sel) => {
      const e = c1.querySelector(sel); if (!e) { o[k] = null; return; }
      const r = e.getBoundingClientRect();
      o[k] = { dx: r.left - or.left, dy: r.top - or.top, w: r.width, h: r.height };
    };
    /* .cart 는 3회차부터 `transform:scaleX()` 로 폭을 채웠고, **356(주인 지시 2026-08-29)이 그것을
       폐기했다** — 아이콘은 원본 비율이 우선이다. 레이아웃 슬롯은 그때나 지금이나 offset* 로 잰다. */
    { const e = c1.querySelector('.cart');
      o.art = { dx: e.offsetLeft, dy: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; }
    /* 5칸 **전부** 를 본다 — 356 은 `.cart` 기본 규칙과 nth-child(2)~(5) 다섯 자리를 같이 뗐다.
       한 칸만 재면 «한 칸만 되살아난» 재발을 놓친다. */
    o.artTf = cards.map((c) => { const e = c.querySelector('.cart'); return e ? getComputedStyle(e).transform : 'x'; });
    rel('hd', '.chd'); rel('mag', '.cmag'); rel('lv', '.clv');
    rel('bar', '.cbar'); rel('b1', '.b1'); rel('b2', '.b2'); rel('b3', '.b3');
    rel('ad', '.adbadge'); rel('pan', '.b2>.pan'); rel('exp', '.cbar>b');
    /* 상태 색 — 레퍼런스와 같은 «10연 rich / 30연 lack» */
    o.b2rich = c1.querySelector('.b2').classList.contains('rich');
    o.b3lack = c1.querySelector('.b3').classList.contains('lack');
    return o;
  });

  /* ── 껍데기 ── */
  chk('페이지 top (HUD 하단)', g.page.y, 104);
  chk('페이지 bottom (탭바 높이)', g.page.bot, 180);
  chk('카테고리 바 x', g.cats.x, 45);
  chk('카테고리 바 w', g.cats.w, 990);
  chk('바 하단 ↔ 앱탭바 상단 (ref 42)', g.tabbar.y - (g.cats.y + g.cats.h), 41);

  /* ── 카드 3장: ref 250/729/1209 − 84 ── */
  [[166, 450], [645, 451], [1125, 450]].forEach(([y, h], i) => {
    chk(`카드${i + 1} x`, g.card[i].x, 50);
    chk(`카드${i + 1} w`, g.card[i].w, 980);
    chk(`카드${i + 1} y (ref−84)`, g.card[i].y, y, 3);
    chk(`카드${i + 1} h`, g.card[i].h, h, 2);
  });
  chk('카드 간 gap', g.card[1].y - (g.card[0].y + g.card[0].h), 29);

  /* ── 카드 내부 (측정표 §2) ── */
  const R = {
    hd: [7, 8, 967, 96], art: [99, 160, 274, 204], mag: [381, 128, 59, 58],
    /* ⚑ 669 이관 — 경험치 바 세로가 «ref 32(정오표 33) · dy 369» 에서 **40 · dy 365** 로 바뀌었다
       (주인 지시 «소환경험치 글씨 크기 너무작음» → 같은 27px 트랙 안에서는 «크게» 와 «여유» 가
       맞바꿈이라 그릇을 같이 키웠다. 측정표 10 §5 정오표 #8·#9 · 의도적 ref 이탈, 360 선례).
       ⚠ 가로(113 · 307)는 **Δ0** 이고 아래 [669] 항이 «세로 중심은 안 움직였다» 를 따로 못박는다 —
       값만 갈아 끼우면 «바가 어디로든 자라도 초록» 이 되기 때문이다(328 교훈). */
    lv: [55, 363, 89, 44], bar: [113, 365, 307, 40],
    b1: [720, 146, 200, 98], b2: [476, 262, 208, 127], b3: [717, 262, 206, 127]
  };
  for (const [k, [dx, dy, w, h]] of Object.entries(R)) {
    chk(`${k} dx`, g[k].dx, dx, 2); chk(`${k} dy`, g[k].dy, dy, 2);
    chk(`${k} w`, g[k].w, w, 2);    chk(`${k} h`, g[k].h, h, 2);
  }
  /* 인셋 패널 — 측정표 §2 #19: 카드기준 (505,326) 150×37 */
  chk('b2 인셋 패널 dx', g.pan.dx, 505, 2);
  chk('b2 인셋 패널 dy', g.pan.dy, 326, 2);
  chk('b2 인셋 패널 w', g.pan.w, 150, 2);
  chk('b2 인셋 패널 h', g.pan.h, 37, 2);
  /* [669] 바를 키운 방향 — 세로 «중심» 은 안 움직였고 바는 알약 span 안에 그대로 있다.
     이 두 항이 655 의 «알약이 게이지 계열 전부의 위» 가 성립하는 전제다(알약 363..407). */
  chk('[669] 바 세로 중심 = 알약 세로 중심', g.bar.dy + g.bar.h / 2, g.lv.dy + g.lv.h / 2, 1);
  chk('[669] 바 상변이 알약 안', Math.max(0, g.lv.dy - g.bar.dy), 0, 0.6);
  chk('[669] 바 하변이 알약 안', Math.max(0, (g.bar.dy + g.bar.h) - (g.lv.dy + g.lv.h)), 0, 0.6);
  /* 경험치 라벨은 «Lv 알약 오른쪽» 이 아니라 안쪽 트랙(dx116..418) 중앙 = 267 */
  chk('경험치 라벨 중심 dx (트랙 중앙)', g.exp.dx + g.exp.w / 2, 267, 4);
  /* ▶AD 뱃지 — ⚠ 측정표 §2 #15 의 «65×53» 은 드롭섀도를 같이 센 오측이다(9회차 정정).
     레퍼런스 가로 단면(카드기준 dy226)에서 어두운 띠는 좌우 2px 뿐이고 태그 바깥은 x708..762 = **55px**,
     금색 채움 51×41 과도 맞물린다(51 + 2×2 = 55). 구현 55×45 · 검정 2px · rotate(−6°)
     → 회전 bbox = 55·cos6 + 45·sin6 = 59.4 / 55·sin6 + 45·cos6 = 50.5 */
  /* ⚠ 356(주인 지시 2026-08-29) 이관 — 옛 기대 «상자 아트 scaleX 1.334(잉크 폭 채움)» 는 **뒤집혔다**.
     아이콘은 원본 비율이 우선이라 다섯 칸 전부 스케일 선언이 없어야 한다. 항을 지우지 않고
     기대값만 뒤집는다(328 교훈) — 지웠으면 «356 이 통째로 사라져도 초록인 게이트» 가 된다.
     슬롯 상자(274×204 · dx99 dy160)는 위에서 그대로 재고 있으므로 «폭이 줄었다» 는 여기 안 섞인다. */
  chk('상자 아트 — 5칸 전부 스케일 선언 없음 (356)', g.artTf.join('|'), 'none|none|none|none|none', 0);
  chk('AD 뱃지 w(회전 bbox)', g.ad.w, 59.4, 2);
  chk('AD 뱃지 h(회전 bbox)', g.ad.h, 50.5, 2);

  /* ── 상태 ── */
  T.push(['b2 = rich(노랑, 10연 구매 가능)', g.b2rich, true, 0]);
  T.push(['b3 = lack(회색, 30연 부족)', g.b3lack, true, 0]);
  T.push(['콘솔 에러 0', errs.length, 0, 0]);

  let bad = 0;
  for (const [n, got, want, tol] of T) {
    /* 356 이관으로 문자열 기대값이 생겼다(«transform 이 none 인가»). 숫자 자에 문자열을 태우면
       `Math.abs(NaN) <= tol` 가 항상 false 라 **영원히 빨간 항**이 된다 — 갈래를 하나 더 둔다. */
    const ok = typeof want === 'boolean' || typeof got === 'boolean'
      || typeof want === 'string' || typeof got === 'string'
      ? got === want
      : Math.abs(got - want) <= tol;
    if (!ok) { bad++; console.log(`  ✗ ${n}: ${typeof got === 'number' ? got.toFixed(1) : got} (기대 ${want}${tol ? ' ±' + tol : ''})`); }
  }
  if (errs.length) console.log('  콘솔 에러:', errs.slice(0, 3));
  console.log(`VERIFY10 ${T.length - bad}/${T.length} ${bad ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
