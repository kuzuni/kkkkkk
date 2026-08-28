/* 53 가방 팝업 — 기능·기하 회귀 게이트.
 *   node tools/verify53.js   → 마지막 줄 `VERIFY53 PASS n/n`
 *
 * 보는 것:
 *   A. 진입 — 52 ▦ 메뉴 → «가방» 칸이 실제로 #bagw 를 연다
 *   B. 기하 — 측정표(docs/measure/53-가방팝업.md)의 프레임 좌표와 Δ≤1.5px
 *   C. 기능 — 칸이 «실제 게임 데이터» 를 읽는다(값을 바꾸면 칸 수·수량이 따라 바뀐다)
 *   D. 격자 — 항상 20칸, 등급 내림차순, 빈 칸은 플레이스홀더 없음
 *   E. 닫기 — 딤 클릭으로 닫힌다
 *   F. 292 — 칸 클릭 → 33 재화 정보 팝업(#ciw) 이 **화폐 전수**로 열린다
 *
 * 292(주인 지시 «가방에는 재화 즉 화폐들만»)로 바뀐 전제 — 이 게이트가 지킨다:
 *   · 소모품 탭(bagUse)·하단 탭 스트립(.bg53-tabs)은 **폐기**됐다. 되살아나면 [B]·[C] 가 빨개진다.
 *   · S.own 보유 재료(스킬·장비·펫·유물)는 가방에 **안 나온다** — 화폐가 아니다.
 *   · 모든 칸은 CURINFO 키를 들고 있어야 한다(k 없는 칸 = 클릭이 죽는 칸).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, total = 0;
const chk = (name, cond, extra) => {
  total++;
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else console.log('  ✗ ' + name + (extra ? ' — ' + extra : ''));
};
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1.5 : eps);

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);

  /* ---- A. 진입: ▦ 메뉴 → 가방 ---- */
  console.log('[A] 진입 (52 ▦ 메뉴 → 가방)');
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(250);
  const hasCell = await page.evaluate(() => !!document.querySelector('#mnw [data-mn="bag"]'));
  chk('메뉴에 «가방» 칸이 있다', hasCell);
  await page.evaluate(() => document.querySelector('#mnw [data-mn="bag"]').click());
  await page.waitForTimeout(350);
  chk('#bagw 가 열린다', await page.evaluate(() => document.getElementById('bagw').classList.contains('on')));
  chk('메뉴는 닫힌다', await page.evaluate(() => !document.getElementById('mnw').classList.contains('on')));

  /* ---- B. 기하 (측정표 대조) ---- */
  console.log('[B] 기하 — 측정표 프레임 좌표 대조');
  const g = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const q = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left - app.left, y: r.top - app.top, w: r.width, h: r.height }; };
    return { box: q('.bg53'), head: q('.bg53-head'), body: q('.bg53-body'), banner: q('.bg53-tip'),
             panel: q('.bg53-panel'), grid: q('.bg53-grid'),
             tabs: q('.bg53-tabs'), pill: q('.bg53-tabs>s.on'),
             c1: q('.bg53-grid>.bg53-c:nth-child(1)'), c2: q('.bg53-grid>.bg53-c:nth-child(2)'),
             c6: q('.bg53-grid>.bg53-c:nth-child(6)') };
  });
  /* 측정표 값: ref 좌표 − 84 */
  const W = [
    ['팝업 948×967 @(66,660)', g.box, 66, 660, 948, 967],
    ['헤더 932×91 @(74,668)', g.head, 74, 668, 932, 91],
    ['크림 908×848 @(86,759)', g.body, 86, 759, 908, 848],
    ['배너 882×100 @(99,779)', g.banner, 99, 779, 882, 100],
    ['패널 882×700 @(99,899)', g.panel, 99, 899, 882, 700],
    ['격자 828×657 @(126,915)', g.grid, 126, 915, 828, 657],
    /* 292 — «탭 트랙 792×93 @(151,1638)» · «활성 알약 420×100 @(523,1634.5)» 두 줄은 폐기했다.
       그 실측(5회차 정정분 포함)은 측정표 §5 에 남아 있다 — 되살릴 일이 생기면 거기서 꺼낸다. */
    ['칸 148×147 @(126,915)', g.c1, 126, 915, 148, 147]
  ];
  W.forEach(([n, r, x, y, w, h]) =>
    chk(n, r && near(r.x, x) && near(r.y, y) && near(r.w, w) && near(r.h, h),
      r ? `실측 ${r.w.toFixed(1)}×${r.h.toFixed(1)} @(${r.x.toFixed(1)},${r.y.toFixed(1)})` : '요소 없음'));
  chk('가로 pitch 170', g.c2 && near(g.c2.x - g.c1.x, 170), g.c2 ? String(g.c2.x - g.c1.x) : '-');
  chk('세로 pitch 170', g.c6 && near(g.c6.y - g.c1.y, 170), g.c6 ? String(g.c6.y - g.c1.y) : '-');
  /* 292 — 폐기 확인은 «이름» 이 아니라 «칸» 으로 묻는다(277·279 의 부패 처방): 클래스 문자열이 아니라
     실제 DOM 노드가 0개인지 본다. 스트립을 되살리면 여기가 먼저 빨개진다. */
  chk('292 · 하단 탭 스트립이 없다', g.tabs === null, g.tabs ? JSON.stringify(g.tabs) : '-');
  chk('292 · 활성 알약이 없다', g.pill === null, g.pill ? JSON.stringify(g.pill) : '-');
  chk('292 · 탭 라벨 노드 0개',
    await page.evaluate(() => document.querySelectorAll('#bagw [data-bagtab]').length) === 0);

  /* ---- C. 기능: 칸이 실제 데이터를 읽는가 (292 — 화폐 전용) ---- */
  console.log('[C] 기능 — 칸이 실제 게임 데이터를 읽는다 (292 화폐 전용)');
  const cur0 = await page.evaluate(() => {
    S.own = {}; S.gold = 1234; S.dia = 77;
    S.relic = 0; S.stone = 0; S.rstone = 0; S.tstone = 0; S.mileage = 0;
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => [e.dataset.bagn, e.dataset.bagq]);
  });
  chk('보유 0 인 재화는 빠지고 골드·다이아만 남는다', cur0.length === 2, JSON.stringify(cur0));
  chk('골드 수량이 S.gold 를 그대로 읽는다',
    cur0.some((r) => r[0] === '골드' && r[1] === '1234'), JSON.stringify(cur0));

  const cur1 = await page.evaluate(() => {
    S.relic = 500;
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => [e.dataset.bagn, e.dataset.bagq]);
  });
  chk('유물조각을 넣으면 칸이 하나 는다', cur1.length === cur0.length + 1, JSON.stringify(cur1));
  chk('유물조각 수량이 S.relic 을 읽는다',
    cur1.some((r) => r[0] === '유물조각' && r[1] === '500'), JSON.stringify(cur1));

  /* 292 ① — S.own 보유 재료는 «화폐가 아니다». 넣어도 가방에 나오면 안 된다. */
  const noItem = await page.evaluate(() => {
    S.own[SKILLS[0].id] = { n: 9, l: 1 };
    S.own[EQUIPS[0].id] = { n: 4, l: 1 };
    renderBag();
    return { names: [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => e.dataset.bagn),
             skill: SKILLS[0].n, equip: EQUIPS[0].n };
  });
  chk('292 · S.own 스킬 재료가 가방에 안 나온다', noItem.names.indexOf(noItem.skill) < 0, JSON.stringify(noItem.names));
  chk('292 · S.own 장비 재료가 가방에 안 나온다', noItem.names.indexOf(noItem.equip) < 0, JSON.stringify(noItem.names));

  /* 292 ② — 소모품(던전 입장권·무료 소환권·룰렛 횟수)이 가방에 남아 있으면 안 된다. */
  const noUse = await page.evaluate(() => {
    S.daily.spins = 3;
    if (S.dunTk) DUNGEONS.forEach((d) => { S.dunTk[d.id] = 5; });
    renderBag();
    return { names: [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => e.dataset.bagn),
             hasFn: typeof window.bagUse === 'function' || typeof window.bagTab !== 'undefined' };
  });
  chk('292 · 룰렛 횟수가 가방에 없다', noUse.names.indexOf('룰렛 횟수') < 0, JSON.stringify(noUse.names));
  chk('292 · 던전 입장권이 가방에 없다',
    !noUse.names.some((n) => /입장권$/.test(n || '')), JSON.stringify(noUse.names));
  chk('292 · 무료 소환권이 가방에 없다',
    !noUse.names.some((n) => /무료 소환$/.test(n || '')), JSON.stringify(noUse.names));

  /* 292 ③ — 모든 칸이 CURINFO 키를 든다(k 가 빈 칸 = 클릭이 죽는 칸). */
  const keyed = await page.evaluate(() => {
    S.gold = 1e6; S.dia = 5e4; S.relic = 500; S.stone = 40; S.rstone = 30; S.tstone = 20; S.mileage = 6;
    renderBag();
    return [...document.querySelectorAll('#bagGrid .bg53-c:not(.em)')].map((e) =>
      [e.dataset.bagn, e.dataset.bagk, e.dataset.cur]);
  });
  chk('292 · 화폐 7종이 모두 칸으로 나온다', keyed.length === 7, JSON.stringify(keyed));
  chk('292 · 모든 칸에 data-bagk 가 있다', keyed.every((r) => !!r[1]), JSON.stringify(keyed));
  chk('292 · 모든 칸에 data-cur 가 있고 bagk 와 같다',
    keyed.every((r) => r[2] && r[2] === r[1]), JSON.stringify(keyed));
  const inCurinfo = await page.evaluate((ks) => ks.every((k) => !!CURINFO[k]), keyed.map((r) => r[1]));
  chk('292 · 모든 칸의 키가 CURINFO 에 있다(가방 목록 = CURINFO 종류)', inCurinfo,
    JSON.stringify(keyed.map((r) => r[1])));

  /* ---- D. 격자 ---- */
  console.log('[D] 격자');
  const grid = await page.evaluate(() => {
    const all = [...document.querySelectorAll('#bagGrid .bg53-c')];
    const filled = all.filter((e) => !e.classList.contains('em'));
    const em = all.filter((e) => e.classList.contains('em'));
    return { n: all.length, filled: filled.length, em: em.length,
             emHasArt: em.some((e) => e.children.length > 0),
             emBg: em.length ? getComputedStyle(em[0]).backgroundImage : 'none',
             cols: getComputedStyle(document.getElementById('bagGrid')).gridTemplateColumns };
  });
  chk('항상 20칸을 채운다', grid.n === 20, String(grid.n));
  chk('빈 칸은 플레이스홀더가 없다(자식 0)', !grid.emHasArt);
  chk('빈 칸은 배경도 없다(패널이 그대로 비친다)', grid.emBg === 'none', grid.emBg);
  chk('5열 격자', (grid.cols.match(/px/g) || []).length === 5, grid.cols);

  /* 292 — 정렬 표본을 «S.own 재료» 에서 «화폐» 로 갈았다. 화폐만으로도 등급이 4단(1·2·3·4) 걸린다:
     골드 g1(고급) · 유물조각 g2(희귀) · 다이아·강화석·룬강화석·단련석 g3(영웅) · 마일리지 g4(전설). */
  const sorted = await page.evaluate(() => {
    S.own = {}; S.gold = 100; S.dia = 100; S.relic = 100;
    S.stone = 100; S.rstone = 100; S.tstone = 100; S.mileage = 100;
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) =>
      getComputedStyle(e).getPropertyValue('--g').trim());
  });
  const ORDER = ['#C0304B', '#D27B12', '#9B26D7', '#347DC1', '#98C135', '#6E6A63'];
  const idx = sorted.map((c) => ORDER.indexOf(c));
  chk('등급 내림차순으로 정렬된다', idx.every((v, i) => i === 0 || idx[i - 1] <= v), JSON.stringify(sorted));

  /* ---- F. 292 — 칸 클릭 → 33 재화 정보 팝업(#ciw). 전수 + «진짜 포인터 클릭» ---- */
  console.log('[F] 292 — 칸 클릭 → 33 재화 정보 팝업 (화폐 전수)');
  const KEYS = ['gold', 'dia', 'relic', 'stone', 'rstone', 'tstone', 'mile'];
  await page.evaluate(() => {
    S.own = {}; S.gold = 1e6; S.dia = 5e4; S.relic = 500; S.stone = 40; S.rstone = 30; S.tstone = 20; S.mileage = 6;
    renderBag();
  });
  await page.waitForTimeout(120);
  for (const k of KEYS) {
    const sel = '#bagGrid .bg53-c[data-cur="' + k + '"]';
    const has = await page.evaluate((s) => !!document.querySelector(s), sel);
    if (!has) { chk('칸 «' + k + '» 이 있다', false); continue; }
    /* 헤드리스 «진짜 클릭» — dispatchEvent 가 아니라 포인터로 누른다(LESSONS 65-②) */
    await page.locator(sel).click();
    await page.waitForTimeout(160);
    const st = await page.evaluate(() => ({
      open: document.getElementById('ciw').classList.contains('on'),
      key: typeof curInfoKey === 'undefined' ? null : curInfoKey,
      title: (document.getElementById('ciTitle') || {}).textContent,
      have: (document.getElementById('ciHave') || {}).textContent,
      ways: document.querySelectorAll('#ciWays>div').length,
      /* 33 이 가방 «위» 에 서는지 — z 가 낮으면 열려도 안 보인다(292 의 두 번째 함정) */
      zCi: +getComputedStyle(document.getElementById('ciw')).zIndex,
      zBag: +getComputedStyle(document.getElementById('bagw')).zIndex,
      bagStillOpen: document.getElementById('bagw').classList.contains('on')
    }));
    chk('«' + k + '» 칸 클릭 → #ciw 가 열린다', st.open, JSON.stringify(st));
    chk('«' + k + '» — 팝업이 그 재화로 열린다', st.key === k, String(st.key));
    chk('«' + k + '» — 제목·보유·획득처가 채워진다',
      !!st.title && /^보유: /.test(st.have || '') && st.ways > 0, JSON.stringify(st));
    chk('«' + k + '» — 33 이 가방 위에 선다(z)', st.zCi > st.zBag, st.zCi + ' vs ' + st.zBag);
    chk('«' + k + '» — 가방은 뒤에 열린 채 남는다', st.bagStillOpen);
    /* 딤을 눌러 33 만 닫고 가방으로 돌아온다 */
    await page.evaluate(() => {
      const w = document.getElementById('ciw'), r = w.getBoundingClientRect();
      w.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 }));
    });
    await page.waitForTimeout(120);
    const back2 = await page.evaluate(() => ({
      ci: document.getElementById('ciw').classList.contains('on'),
      bag: document.getElementById('bagw').classList.contains('on') }));
    chk('«' + k + '» — 33 을 닫으면 가방으로 돌아온다', !back2.ci && back2.bag, JSON.stringify(back2));
  }
  /* 빈 칸은 아무 일도 없어야 한다 */
  const emClick = await page.evaluate(() => {
    const em = document.querySelector('#bagGrid .bg53-c.em');
    if (!em) return 'no-em';
    em.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return document.getElementById('ciw').classList.contains('on') ? 'opened' : 'quiet';
  });
  chk('빈 칸을 눌러도 팝업이 안 열린다', emClick === 'quiet', emClick);

  /* ---- E. 닫기 ---- */
  console.log('[E] 닫기');
  await page.evaluate(() => { if (!document.getElementById('bagw').classList.contains('on')) openBag(); });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const w = document.getElementById('bagw'), r = w.getBoundingClientRect();
    w.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 }));
  });
  await page.waitForTimeout(200);
  /* 위 dispatch 는 target 이 #bagw 자신이라 딤 클릭과 같다 */
  chk('딤을 누르면 닫힌다', await page.evaluate(() => !document.getElementById('bagw').classList.contains('on')));

  chk('콘솔 에러 0건', errs.length === 0, errs.join(' | '));

  await browser.close();
  console.log('\n' + (pass === total ? 'VERIFY53 PASS ' : 'VERIFY53 FAIL ') + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
