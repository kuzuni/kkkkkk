/* 45 검증 — 상점 카테고리 탭 4→2 (소환 · 재화)
   [3]-(가) 기계적 작업 검증: 레퍼런스 대조(비평가) 없이 «남은 미변환분 0 · 콘솔 에러 0 ·
   요소 겹침/잘림 0 · 탭 전환 실동작» 을 DOM 실측으로 판정한다.
   실행: node tools/verify45.js   (1080x2280 기준 · 헤드리스) */
const { chromium } = require('playwright');
const path = require('path');

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);

(async () => {
  /* 번들 브라우저가 없으면 컨테이너의 chromium-1194 로 떨어진다(LESSONS 57 환경 메모) */
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
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
    dead: document.querySelectorAll('.shp-new, .shp-soon, [data-cat="special"], [data-cat="daily"]').length,
  }));
  ok('탭 2개', mk.cats.length === 2, JSON.stringify(mk.cats));
  ok('data-cat = summon,coin', mk.cats.join(',') === 'summon,coin', mk.cats.join(','));
  ok('라벨 = 소환,재화', mk.labels.join(',') === '소환,재화', mk.labels.join(','));
  ok('✦ 구분선 1개', mk.cs === 1, mk.cs + '개');
  ok('활성 알약 1개', mk.pills === 1, mk.pills + '개');
  ok('제거 대상 잔존 0 (NEW리본·준비중·특별·일일)', mk.dead === 0, mk.dead + '개');

  /* ---- 2. 소환 탭 기하 — 바 990x107 유지 · 칸 2등분 · 알약/라벨/✦ 중앙 ---- */
  console.log('\n[2] 소환 탭 기하 (바 990x107 · 칸 488 x2)');
  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300);
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
      pill: r(bar.querySelector('.shp-cat-pill')),
      pillIn: bar.querySelector('.shp-cat-pill').parentNode.dataset.cat,
      cs: r(bar.querySelector('.shp-cs')),
      onTab: [...bar.querySelectorAll('.shp-ct.on')].map(e => e.dataset.cat),
      bw: parseFloat(getComputedStyle(bar).borderTopWidth),
    };
  });
  ok('바 폭 990', near(g.bar.w, 990), g.bar.w.toFixed(1));
  ok('바 높이 107', near(g.bar.h, 107), g.bar.h.toFixed(1));
  ok('바 좌 45', near(g.bar.x, 45), g.bar.x.toFixed(1));
  const inner = g.bar.w - g.bw * 2;
  ok('칸 2개가 패딩박스를 정확히 2등분', near(g.cells[0].w, inner / 2) && near(g.cells[1].w, inner / 2),
    g.cells.map(c => c.w.toFixed(1)).join(' / ') + ' (패딩박스 ' + inner.toFixed(0) + ')');
  ok('칸이 맞닿음(빈틈·겹침 0)', near(g.cells[0].x + g.cells[0].w, g.cells[1].x),
    '경계 ' + (g.cells[0].x + g.cells[0].w).toFixed(1) + ' vs ' + g.cells[1].x.toFixed(1));
  ok('칸2가 바 우측 안쪽 끝에서 끝남', near(g.cells[1].x + g.cells[1].w, g.bar.x + g.bar.w - g.bw),
    (g.cells[1].x + g.cells[1].w).toFixed(1));
  g.labels.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 중앙 (±3px)',
    near(l.ink.cx, g.cells[i].cx, 3), '잉크중심 ' + l.ink.cx.toFixed(1) + ' vs 칸중심 ' + g.cells[i].cx.toFixed(1)));
  g.labels.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 안에 들어감(잘림 0)',
    l.ink.x >= g.cells[i].x - 0.5 && l.ink.x + l.ink.w <= g.cells[i].x + g.cells[i].w + 0.5,
    '잉크 ' + l.ink.x.toFixed(1) + '~' + (l.ink.x + l.ink.w).toFixed(1)));
  ok('알약이 소환 칸 안에 있음', g.pillIn === 'summon', g.pillIn);
  ok('알약 규격 250x79 유지', near(g.pill.w, 250) && near(g.pill.h, 79), g.pill.w.toFixed(1) + 'x' + g.pill.h.toFixed(1));
  ok('알약이 소환 칸 중앙 (±2px)', near(g.pill.cx, g.cells[0].cx, 2),
    g.pill.cx.toFixed(1) + ' vs ' + g.cells[0].cx.toFixed(1));
  ok('알약이 바 안쪽에 들어감(좌측 돌출 0)', g.pill.x >= g.bar.x + g.bw - 0.5,
    '알약좌 ' + g.pill.x.toFixed(1) + ' vs 바안쪽 ' + (g.bar.x + g.bw).toFixed(1));
  ok('✦ 규격 15x20 유지', near(g.cs.w, 15) && near(g.cs.h, 20), g.cs.w.toFixed(1) + 'x' + g.cs.h.toFixed(1));
  ok('✦ 가 칸 경계 부근 (±6px)', near(g.cs.cx, g.cells[0].x + g.cells[0].w, 6),
    '✦중심 ' + g.cs.cx.toFixed(1) + ' vs 경계 ' + (g.cells[0].x + g.cells[0].w).toFixed(1));
  ok('✦ 와 알약이 겹치지 않음', g.cs.x >= g.pill.x + g.pill.w || g.cs.x + g.cs.w <= g.pill.x,
    '✦ ' + g.cs.x.toFixed(1) + '~' + (g.cs.x + g.cs.w).toFixed(1) + ' / 알약 ' + g.pill.x.toFixed(1) + '~' + (g.pill.x + g.pill.w).toFixed(1));
  ok('활성 탭 = 소환 1개', g.onTab.join(',') === 'summon', g.onTab.join(','));

  /* ---- 3. 재화 탭 전환 — 알약 이동 · coin 렌더 · 기하 ---- */
  console.log('\n[3] 재화 탭 전환 (실동작)');
  await page.click('#shopCats .shp-ct[data-cat="coin"]');
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2 }; };
    const bar = document.getElementById('shopCats');
    return {
      bar: r(bar), bw: parseFloat(getComputedStyle(bar).borderTopWidth),
      cells: [...bar.querySelectorAll('.shp-ct')].map(r),
      pill: r(bar.querySelector('.shp-cat-pill')),
      pillIn: bar.querySelector('.shp-cat-pill').parentNode.dataset.cat,
      cs: r(bar.querySelector('.shp-cs')),
      onTab: [...bar.querySelectorAll('.shp-ct.on')].map(e => e.dataset.cat),
      coinCls: document.getElementById('shopList').classList.contains('coin'),
      items: document.querySelectorAll('#shopList .cn-card, #shopList > *').length,
      cat: window.shopCat === undefined ? 'n/a' : window.shopCat,
    };
  });
  ok('활성 탭 = 재화', c.onTab.join(',') === 'coin', c.onTab.join(','));
  ok('알약이 재화 칸으로 이동', c.pillIn === 'coin', c.pillIn);
  ok('재화 알약 규격 256x76 유지', near(c.pill.w, 256) && near(c.pill.h, 76), c.pill.w.toFixed(1) + 'x' + c.pill.h.toFixed(1));
  ok('재화 알약이 칸 중앙 (±2px)', near(c.pill.cx, c.cells[1].cx, 2), c.pill.cx.toFixed(1) + ' vs ' + c.cells[1].cx.toFixed(1));
  ok('재화 알약이 바 안쪽에 들어감(우측 돌출 0)', c.pill.x + c.pill.w <= c.bar.x + c.bar.w - c.bw + 0.5,
    '알약우 ' + (c.pill.x + c.pill.w).toFixed(1) + ' vs 바안쪽 ' + (c.bar.x + c.bar.w - c.bw).toFixed(1));
  ok('재화 ✦ 규격 19x19 (13 실측)', near(c.cs.w, 19) && near(c.cs.h, 19), c.cs.w.toFixed(1) + 'x' + c.cs.h.toFixed(1));
  ok('재화 ✦ 와 알약 겹침 0', c.cs.x + c.cs.w <= c.pill.x || c.cs.x >= c.pill.x + c.pill.w,
    '✦ ' + c.cs.x.toFixed(1) + '~' + (c.cs.x + c.cs.w).toFixed(1) + ' / 알약 ' + c.pill.x.toFixed(1) + '~' + (c.pill.x + c.pill.w).toFixed(1));
  ok('#shopList.coin 켜짐 (13 재화 페이지 렌더)', c.coinCls === true, String(c.coinCls));
  ok('재화 페이지 내용 있음', c.items > 0, c.items + '개 노드');

  /* ---- 4. 소환 탭 복귀 ---- */
  console.log('\n[4] 소환 탭 복귀');
  await page.click('#shopCats .shp-ct[data-cat="summon"]');
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({
    pillIn: document.querySelector('#shopCats .shp-cat-pill').parentNode.dataset.cat,
    onTab: [...document.querySelectorAll('#shopCats .shp-ct.on')].map(e => e.dataset.cat),
    coinCls: document.getElementById('shopList').classList.contains('coin'),
    cards: document.querySelectorAll('#shopList .shp-card').length,
  }));
  ok('활성 탭 = 소환', s.onTab.join(',') === 'summon', s.onTab.join(','));
  ok('알약이 소환 칸으로 복귀', s.pillIn === 'summon', s.pillIn);
  ok('coin 클래스 해제', s.coinCls === false, String(s.coinCls));
  ok('소환 상자 카드 3장', s.cards === 3, s.cards + '장');

  /* ---- 5. 재화 탭에서 닫고 다시 열기 → 알약 리셋 (45 에서 고친 잔존 상태 버그) ---- */
  console.log('\n[5] 재화 탭 상태로 닫았다 다시 열기 (알약 리셋)');
  await page.click('#shopCats .shp-ct[data-cat="coin"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => closeShopPage());
  await page.waitForTimeout(200);
  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300);
  const rz = await page.evaluate(() => ({
    pillIn: document.querySelector('#shopCats .shp-cat-pill').parentNode.dataset.cat,
    onTab: [...document.querySelectorAll('#shopCats .shp-ct.on')].map(e => e.dataset.cat),
    cards: document.querySelectorAll('#shopList .shp-card').length,
  }));
  ok('재진입 시 활성 탭 = 소환', rz.onTab.join(',') === 'summon', rz.onTab.join(','));
  ok('재진입 시 알약도 소환 칸 (활성/알약 불일치 0)', rz.pillIn === 'summon', rz.pillIn);
  ok('재진입 시 소환 카드 3장', rz.cards === 3, rz.cards + '장');

  /* ---- 6. 콘솔 에러 ---- */
  console.log('\n[6] 콘솔');
  ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/45-cats.png') });
  await browser.close();
  console.log('\nVERIFY45 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
