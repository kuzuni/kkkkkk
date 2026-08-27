/* 53 가방 팝업 — 기능·기하 회귀 게이트.
 *   node tools/verify53.js   → 마지막 줄 `VERIFY53 PASS n/n`
 *
 * 보는 것:
 *   A. 진입 — 52 ▦ 메뉴 → «가방» 칸이 실제로 #bagw 를 연다
 *   B. 기하 — 측정표(docs/measure/53-가방팝업.md)의 프레임 좌표와 Δ≤1.5px
 *   C. 기능 — 두 탭이 «실제 게임 데이터» 를 읽는다(값을 바꾸면 칸 수·수량이 따라 바뀐다)
 *   D. 격자 — 항상 20칸, 등급 내림차순, 빈 칸은 플레이스홀더 없음
 *   E. 닫기 — 딤 클릭으로 닫힌다
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
             panel: q('.bg53-panel'), grid: q('.bg53-grid'), tabs: q('.bg53-tabs'), pill: q('.bg53-tabs>s.on'),
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
    ['탭 트랙 792×93 @(151,1638)', g.tabs, 151, 1638, 792, 93],
    /* 5회차 정정 — 알약은 트랙(93)과 같은 높이가 아니라 **100** 이고 트랙 위·아래로 3.5px 씩 돌출한다.
       측정표 §5 가 «420×93» 으로 잘못 적어 뒀고, 비평가 B(3회차)·D(4회차)가 독립적으로 «알약이 작다» 고
       짚었다(둘 다 겹을 잘못 짝지어 수치는 틀렸지만 «여기가 이상하다» 는 맞았다 — LESSONS 70-③).
       ref 실측(x880 세로): 외곽테 1719 · 카키 1723~1731 · 코어 1734~1807 · 카키 1808~1815 · 외곽테 ~1818. */
    ['활성 알약 420×100 @(523,1634.5)', g.pill, 523, 1634.5, 420, 100],
    ['칸 148×147 @(126,915)', g.c1, 126, 915, 148, 147]
  ];
  W.forEach(([n, r, x, y, w, h]) =>
    chk(n, r && near(r.x, x) && near(r.y, y) && near(r.w, w) && near(r.h, h),
      r ? `실측 ${r.w.toFixed(1)}×${r.h.toFixed(1)} @(${r.x.toFixed(1)},${r.y.toFixed(1)})` : '요소 없음'));
  chk('가로 pitch 170', g.c2 && near(g.c2.x - g.c1.x, 170), g.c2 ? String(g.c2.x - g.c1.x) : '-');
  chk('세로 pitch 170', g.c6 && near(g.c6.y - g.c1.y, 170), g.c6 ? String(g.c6.y - g.c1.y) : '-');

  /* ---- C. 기능: 두 탭이 실제 데이터를 읽는가 ---- */
  console.log('[C] 기능 — 탭이 실제 게임 데이터를 읽는다');
  const cur0 = await page.evaluate(() => {
    S.own = {}; S.gold = 1234; S.dia = 77; S.relic = 0; S.mileage = 0; S.sp = 0;
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => [e.dataset.bagn, e.dataset.bagq]);
  });
  chk('재화 탭 — 보유 0 인 재화는 빠지고 골드·다이아만 남는다', cur0.length === 2, JSON.stringify(cur0));
  chk('재화 탭 — 골드 수량이 S.gold 를 그대로 읽는다',
    cur0.some((r) => r[0] === '골드' && r[1] === '1234'), JSON.stringify(cur0));

  const cur1 = await page.evaluate(() => {
    S.relic = 500; S.own[SKILLS[0].id] = { n: 9, l: 1 };
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => [e.dataset.bagn, e.dataset.bagq]);
  });
  chk('재화 탭 — 유물석을 넣으면 칸이 늘어난다', cur1.length === cur0.length + 2, JSON.stringify(cur1));
  chk('재화 탭 — S.own 보유 재료가 이름·수량으로 나온다',
    cur1.some((r) => r[1] === '9'), JSON.stringify(cur1));

  const useTab = await page.evaluate(() => {
    S.daily.spins = 3;
    document.querySelector('#bagTabs [data-bagtab="use"]').click();
    return { rows: [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) => [e.dataset.bagn, e.dataset.bagq]),
             pill: document.getElementById('bagPill').style.marginLeft,
             act: document.querySelector('#bagTabs .act').dataset.bagtab };
  });
  chk('소모품 탭으로 전환된다', useTab.act === 'use');
  chk('소모품 탭 — 활성 알약이 왼쪽 칸으로 이동한다', useTab.pill === '0px', useTab.pill);
  chk('소모품 탭 — 던전 입장권·룰렛 등 실제 소모품이 나온다', useTab.rows.length > 0, JSON.stringify(useTab.rows));
  chk('소모품 탭 — 룰렛 남은 횟수가 S.daily.spins 를 읽는다',
    useTab.rows.some((r) => r[0] === '룰렛 횟수' && r[1] === '3'), JSON.stringify(useTab.rows));

  const back = await page.evaluate(() => {
    document.querySelector('#bagTabs [data-bagtab="cur"]').click();
    return { act: document.querySelector('#bagTabs .act').dataset.bagtab,
             pill: document.getElementById('bagPill').style.marginLeft };
  });
  chk('재화 탭으로 되돌아온다', back.act === 'cur');
  chk('재화 탭 — 활성 알약이 오른쪽(372px)으로 돌아온다', back.pill === '372px', back.pill);

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

  const sorted = await page.evaluate(() => {
    S.own = {}; S.gold = 100; S.dia = 100;
    [4, 2, 3, 1].forEach((gr) => {
      const it = [].concat(SKILLS, EQUIPS, PETS, RELICS).find((x) => x.g === gr);
      if (it) S.own[it.id] = { n: 1, l: 1 };
    });
    renderBag();
    return [...document.querySelectorAll('#bagGrid [data-bagn]')].map((e) =>
      getComputedStyle(e).getPropertyValue('--g').trim());
  });
  const ORDER = ['#C0304B', '#D27B12', '#9B26D7', '#347DC1', '#98C135', '#6E6A63'];
  const idx = sorted.map((c) => ORDER.indexOf(c));
  chk('등급 내림차순으로 정렬된다', idx.every((v, i) => i === 0 || idx[i - 1] <= v), JSON.stringify(sorted));

  /* ---- E. 닫기 ---- */
  console.log('[E] 닫기');
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
