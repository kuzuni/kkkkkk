/* 45 검증 — 상점 카테고리 탭 4→2 (소환 · 재화)
   124(2026-08-26) — «이용권» 탭이 붙어 **3칸**(.sp3)이 됐다. 이 게이트의 «2칸» 기대값을
   3칸으로 올리고, «칸 절반» 판정을 «콘텐츠 ÷ 3» 으로 바꾼다. 소환 카드 장수는 76(상자 4종)·
   106(동료 배너) 이후 5장인데 게이트가 «3장» 으로 굳어 있어 SHOP_BOXES.length 로 파생시킨다.
   [3]-(가) 기계적 작업 검증: 레퍼런스 대조(비평가) 없이 «남은 미변환분 0 · 콘솔 에러 0 ·
   요소 겹침/잘림 0 · 탭 전환 실동작» 을 DOM 실측으로 판정한다.
   실행: node tools/verify45.js   (1080x2280 기준 · 헤드리스) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);

/* 122 — «300ms 면 열기 연출이 끝났겠지» 라는 낡은 타이밍 가정을 시각이 아니라 **상태**로 바꾼다.
   느린 러너에서는 60 페이지 등장 팝(`jzPgIn`, .12s)이 첫 프레임 지연 때문에 300~520ms 뒤에 끝난다.
   그 중간에 재면 `#shopCats` 가 **0.985 로 줄어든 채**(바 폭 990→975.1 · 좌 45→52.4) 찍혀
   45 와 무관한 FAIL 이 뜬다(main 에서도 4회 중 1회 재현). 애니메이션이 끝날 때까지 기다린다. */
const settled = async page => {
  await page.evaluate(() => Promise.all(
    document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);
};

(async () => {
  /* 번들 브라우저가 없으면 컨테이너의 chromium-1194 로 떨어진다(LESSONS 57 환경 메모) */
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(900);

  /* ---- 1. 마크업: 탭 2개, 라벨 소환·재화, ✦ 1개, 제거 대상 0 ---- */
  console.log('\n[1] 카테고리 탭 구성');
  const mk = await page.evaluate(() => ({
    cats: [...document.querySelectorAll('#shopCats .shp-ct')].map(e => e.dataset.cat),
    labels: [...document.querySelectorAll('#shopCats .shp-ct > i')].map(e => e.textContent),
    cs: document.querySelectorAll('#shopCats .shp-cs').length,
    pills: document.querySelectorAll('#shopCats .shp-cat-pill').length,
    on: [...document.querySelectorAll('#shopCats .shp-ct.on')].map(e => e.dataset.cat),
    shared: document.querySelectorAll('#shopCats.stabs > .stab').length,
    dead: document.querySelectorAll('.shp-new, .shp-soon, [data-cat="special"], [data-cat="daily"]').length,
  }));
  ok('탭 3개', mk.cats.length === 3, JSON.stringify(mk.cats));
  ok('data-cat = summon,coin,pass', mk.cats.join(',') === 'summon,coin,pass', mk.cats.join(','));
  ok('라벨 = 소환,재화,이용권', mk.labels.join(',') === '소환,재화,이용권', mk.labels.join(','));
  /* 96 — 공용 서브탭 부품(.stabs>.stab)으로 교체. ✦ 구분선·노랑 화살촉 알약은 폐기됐다 */
  ok('96 공용 부품 .stabs > .stab 3칸', mk.shared === 3, mk.shared + '칸');
  ok('96 ✦ 구분선 폐기(0개)', mk.cs === 0, mk.cs + '개');
  ok('96 활성 알약 노드 폐기(0개)', mk.pills === 0, mk.pills + '개');
  ok('활성 칸 1개 = 소환', mk.on.join(',') === 'summon', mk.on.join(','));
  ok('제거 대상 잔존 0 (NEW리본·준비중·특별·일일)', mk.dead === 0, mk.dead + '개');

  /* ---- 2. 소환 탭 기하 — 바 990x107 유지 · 칸 2등분 · 알약/라벨/✦ 중앙 ---- */
  console.log('\n[2] 소환 탭 기하 (바 990x99 · 칸 326 x3)');
  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300); await settled(page);
  const g = await page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2 }; };
    const bar = document.getElementById('shopCats');
    return {
      bar: r(bar),
      cells: [...bar.querySelectorAll('.shp-ct')].map(r),
      labels: [...bar.querySelectorAll('.shp-ct > i')].map(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const b = rg.getBoundingClientRect();      /* 글자 실폭(잉크) — 박스 폭이 아니다 */
        return { ink: { x: b.x, w: b.width, cx: b.x + b.width / 2 }, box: r(e) };
      }),
      on: r(bar.querySelector('.shp-ct.on')),
      onTab: [...bar.querySelectorAll('.shp-ct.on')].map(e => e.dataset.cat),
      bw: parseFloat(getComputedStyle(bar).borderTopWidth),
    };
  });
  ok('바 폭 990', near(g.bar.w, 990), g.bar.w.toFixed(1));
  /* 96 — 바 껍데기가 공용 부품 규격(h99 · 검정 6)으로 통일됐다 */
  ok('바 높이 99 (96 공용 부품)', near(g.bar.h, 99), g.bar.h.toFixed(1));
  ok('바 좌 45', near(g.bar.x, 45), g.bar.x.toFixed(1));
  const inner = g.bar.w - g.bw * 2, sw = inner / 3;
  ok('칸 3개가 패딩박스를 정확히 3등분', g.cells.length === 3 && g.cells.every(c => near(c.w, sw)),
    g.cells.map(c => c.w.toFixed(1)).join(' / ') + ' (패딩박스 ' + inner.toFixed(0) + ')');
  for (let i = 1; i < 3; i++)
    ok('칸' + i + '↔' + (i + 1) + ' 맞닿음(빈틈·겹침 0)',
      near(g.cells[i - 1].x + g.cells[i - 1].w, g.cells[i].x),
      '경계 ' + (g.cells[i - 1].x + g.cells[i - 1].w).toFixed(1) + ' vs ' + g.cells[i].x.toFixed(1));
  ok('칸3이 바 우측 안쪽 끝에서 끝남', near(g.cells[2].x + g.cells[2].w, g.bar.x + g.bar.w - g.bw),
    (g.cells[2].x + g.cells[2].w).toFixed(1));
  g.labels.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 중앙 (±3px)',
    near(l.ink.cx, g.cells[i].cx, 3), '잉크중심 ' + l.ink.cx.toFixed(1) + ' vs 칸중심 ' + g.cells[i].cx.toFixed(1)));
  g.labels.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 안에 들어감(잘림 0)',
    l.ink.x >= g.cells[i].x - 0.5 && l.ink.x + l.ink.w <= g.cells[i].x + g.cells[i].w + 0.5,
    '잉크 ' + l.ink.x.toFixed(1) + '~' + (l.ink.x + l.ink.w).toFixed(1)));
  /* 96 — 활성 «칸» 자체가 알약이다(별도 노드 없음). 칸을 정확히 덮는지만 본다 */
  ok('활성 칸이 소환 칸과 일치', near(g.on.x, g.cells[0].x) && near(g.on.w, g.cells[0].w),
    g.on.x.toFixed(1) + '+' + g.on.w.toFixed(1) + ' vs ' + g.cells[0].x.toFixed(1) + '+' + g.cells[0].w.toFixed(1));
  ok('활성 칸이 바 안쪽에 들어감(돌출 0)',
    g.on.x >= g.bar.x + g.bw - 0.5 && g.on.x + g.on.w <= g.bar.x + g.bar.w - g.bw + 0.5,
    '칸 ' + g.on.x.toFixed(1) + '~' + (g.on.x + g.on.w).toFixed(1));
  ok('활성 탭 = 소환 1개', g.onTab.join(',') === 'summon', g.onTab.join(','));

  /* ---- 3. 재화 탭 전환 — 알약 이동 · coin 렌더 · 기하 ---- */
  console.log('\n[3] 재화 탭 전환 (실동작)');
  await page.click('#shopCats .shp-ct[data-cat="coin"]');
  await page.waitForTimeout(300); await settled(page);
  const c = await page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2 }; };
    const bar = document.getElementById('shopCats');
    return {
      bar: r(bar), bw: parseFloat(getComputedStyle(bar).borderTopWidth),
      cells: [...bar.querySelectorAll('.shp-ct')].map(r),
      on: r(bar.querySelector('.shp-ct.on')),
      onTab: [...bar.querySelectorAll('.shp-ct.on')].map(e => e.dataset.cat),
      coinCls: document.getElementById('shopList').classList.contains('coin'),
      items: document.querySelectorAll('#shopList .cn-card, #shopList > *').length,
      cat: window.shopCat === undefined ? 'n/a' : window.shopCat,
    };
  });
  ok('활성 탭 = 재화', c.onTab.join(',') === 'coin', c.onTab.join(','));
  ok('활성 칸이 재화 칸으로 이동', near(c.on.x, c.cells[1].x) && near(c.on.w, c.cells[1].w),
    c.on.x.toFixed(1) + '+' + c.on.w.toFixed(1) + ' vs ' + c.cells[1].x.toFixed(1) + '+' + c.cells[1].w.toFixed(1));
  ok('재화 탭에서도 바 규격이 같다(96 — 13 전용 덮어쓰기 폐기)', near(c.bar.h, 99) && near(c.bw, 6),
    'h' + c.bar.h.toFixed(1) + ' · 테두리 ' + c.bw.toFixed(1));
  ok('활성 칸이 바 안쪽에 들어감(우측 돌출 0)', c.on.x + c.on.w <= c.bar.x + c.bar.w - c.bw + 0.5,
    '칸우 ' + (c.on.x + c.on.w).toFixed(1) + ' vs 바안쪽 ' + (c.bar.x + c.bar.w - c.bw).toFixed(1));
  ok('#shopList.coin 켜짐 (13 재화 페이지 렌더)', c.coinCls === true, String(c.coinCls));
  ok('재화 페이지 내용 있음', c.items > 0, c.items + '개 노드');

  /* ---- 4. 소환 탭 복귀 ---- */
  console.log('\n[4] 소환 탭 복귀');
  await page.click('#shopCats .shp-ct[data-cat="summon"]');
  await page.waitForTimeout(300); await settled(page);
  const s = await page.evaluate(() => ({
    onTab: [...document.querySelectorAll('#shopCats .shp-ct.on')].map(e => e.dataset.cat),
    coinCls: document.getElementById('shopList').classList.contains('coin'),
    cards: document.querySelectorAll('#shopList .shp-card').length,
    boxes: (typeof SHOP_BOXES !== 'undefined') ? SHOP_BOXES.length : -1,
  }));
  ok('활성 탭 = 소환', s.onTab.join(',') === 'summon', s.onTab.join(','));
  ok('coin 클래스 해제', s.coinCls === false, String(s.coinCls));
  /* 76·106 으로 상자가 늘어 «3장» 이 굳은 값이었다 — 데이터에서 파생시킨다 */
  ok('소환 상자 카드 = SHOP_BOXES 수', s.cards === s.boxes && s.cards > 0, s.cards + '장 / SHOP_BOXES ' + s.boxes);

  /* ---- 5. 재화 탭에서 닫고 다시 열기 → 알약 리셋 (45 에서 고친 잔존 상태 버그) ---- */
  console.log('\n[5] 재화 탭 상태로 닫았다 다시 열기 (알약 리셋)');
  await page.click('#shopCats .shp-ct[data-cat="coin"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => closeShopPage());
  await page.waitForTimeout(200);
  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300); await settled(page);
  const rz = await page.evaluate(() => ({
    onTab: [...document.querySelectorAll('#shopCats .shp-ct.on')].map(e => e.dataset.cat),
    cards: document.querySelectorAll('#shopList .shp-card').length,
    boxes: (typeof SHOP_BOXES !== 'undefined') ? SHOP_BOXES.length : -1,
  }));
  ok('재진입 시 활성 탭 = 소환', rz.onTab.join(',') === 'summon', rz.onTab.join(','));
  ok('재진입 시 소환 카드 = SHOP_BOXES 수', rz.cards === rz.boxes && rz.cards > 0,
    rz.cards + '장 / SHOP_BOXES ' + rz.boxes);

  /* ---- 6. 콘솔 에러 ---- */
  console.log('\n[6] 콘솔');
  ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/45-cats.png') });
  await browser.close();
  console.log('\nVERIFY45 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
