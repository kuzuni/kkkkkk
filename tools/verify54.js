/* 54 랭킹 페이지 — 기하 + 기능 게이트.
   기하는 측정표 docs/measure/54-랭킹팝업.md 의 «프레임 좌표(= ref y − 84)» 를 그대로 기대값으로 쓴다.
   기능은 «눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 실제 확인한다(ROUTINE «기능 완성 규칙»).
   사용: node tools/verify54.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

const R = 65;                    /* 행 좌단(프레임 x) — 행 로컬 좌표의 원점 */
const ROW1 = 827;                /* 1행 top(프레임) */
const PITCH = 165;

/* [셀렉터, x, y, w, h] — y 는 프레임 절대값 */
const GEO = [
  ['.rk-scene', 0, 0, 1080, 692],
  ['.rk-title', 297, 20, 486, 114],
  ['.rk-div1', 0, 692, 1080, 10],
  ['.rk-tip', 0, 702, 1080, 99],
  ['.rk-panel', 41, 802, 998, 1083],
  ['.rk-row:nth-child(1)', R, ROW1, 950, 149],
  ['.rk-row:nth-child(2)', R, ROW1 + PITCH, 950, 149],
  ['.rk-row:nth-child(6)', R, ROW1 + PITCH * 5, 950, 149],
  ['.rk-row:nth-child(1) .rk-lc', R + 6, ROW1 + 5, 148, 138],
  ['.rk-row:nth-child(1) .rk-rc', R + 731, ROW1 + 5, 213, 138],
  ['.rk-row:nth-child(1) .rk-bd', R + 29, ROW1 + 34, 102, 80],
  ['.rk-row:nth-child(4) .rk-bd', R + 32, ROW1 + PITCH * 3 + 26, 96, 96],
  ['.rk-row:nth-child(1) .rk-av', R + 192, ROW1 + 17, 111, 113],
  ['.rk-row:nth-child(1) .rk-tt', R + 317, ROW1 + 34, 256, 47],
  ['.rk-row:nth-child(1) .rk-sc', R + 759, ROW1 + 64, 179, 50],
  ['.rk-me', 0, 1905, 1080, 172],
  ['.rk-mp', 6, 1910, 149, 164],
  ['.rk-me .rk-av', 206, 1926, 122, 118],
  ['.rk-me .rk-tt', 343, 1943, 278, 44],
  ['.rk-me .rk-sc', 888, 1982, 179, 50],
  ['.rk-div2', 0, 2077, 1080, 8],
  ['.rk-nav', 0, 2086, 1080, 164],
  ['.rk-back', 53, 2127, 94, 82],
  ['.rk-tab.t1', 199, 2086, 288, 164],
  ['.rk-tab.t2', 492, 2086, 188, 164],
  ['.rk-tab.t3', 685, 2086, 190, 164],
  ['.rk-pod.p1', 385, 449, 309, 243],
  ['.rk-pod.p2', 58, 482, 313, 210],
  ['.rk-pod.p3', 707, 471, 324, 221],
  ['.rk-mid', 0, 702, 1080, 1203],
  ['.rk-sep.e1', 488, 2086, 4, 164],
  ['.rk-sep.e2', 680, 2086, 5, 164],
  ['.rk-sep.e3', 875, 2086, 5, 164],
  ['.rk-sh.s1', 489, 461, 102, 88],
  ['.rk-sh.s2', 164, 482, 102, 73],
  ['.rk-sh.s3', 814, 484, 102, 78],
  ['.rk-rb.rk-pr1', 439, 548, 210, 37],
  ['.rk-rb.rk-pr2', 111, 559, 208, 36],
  ['.rk-rb.rk-pr3', 759, 561, 211, 36],
  ['.rk-pp.q1', 425, 625, 230, 45],
  ['.rk-pp.q2', 100, 635, 230, 45],
  ['.rk-pp.q3', 750, 637, 230, 45]
];

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  let pass = 0; const fails = [];
  const ck = (c, m) => { c ? pass++ : fails.push(m); };

  /* ---- 기능 1: ▦ 메뉴 → «랭킹» 으로 열린다 (위임 핸들러를 타야 하므로 query+click 한 evaluate 안에서) ---- */
  await page.evaluate(() => { S.autoBuy = false; S.spAuto = false; S.nick = '용사_9174'; S.best = 50; S.rank = 2; });
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#mnw [data-mn="rank"]').click());
  await page.waitForTimeout(400);
  ck(await page.evaluate(() => document.getElementById('rkw').classList.contains('on')), '▦ 메뉴 → 랭킹 이 안 열림');

  /* ---- 기하 ---- */
  const geo = await page.evaluate((list) => {
    const app = document.getElementById('app').getBoundingClientRect();
    return list.map(([s]) => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return [+(r.left - app.left).toFixed(1), +(r.top - app.top).toFixed(1),
              +r.width.toFixed(1), +r.height.toFixed(1)];
    });
  }, GEO);
  GEO.forEach((g, i) => {
    const got = geo[i];
    if (!got) { fails.push(`${g[0]} — 요소 없음`); return; }
    const want = g.slice(1);
    const d = want.map((v, k) => Math.abs(got[k] - v));
    ck(Math.max(...d) <= 1.0, `${g[0]} — 기대 ${want.join('/')} · 실제 ${got.join('/')} (Δ ${d.map(x=>x.toFixed(1)).join('/')})`);
  });

  /* ---- 기능 2: 리스트 구성 (1~3위 메달 · 4위↓ 숫자) ---- */
  const list = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.rk-row')];
    return {
      n: rows.length,
      medal: rows.slice(0, 3).every((r) => r.querySelector('.rk-bd.m')),
      flat: rows.slice(3).every((r) => r.querySelector('.rk-bd.f')),
      no4: (rows[3].querySelector('.rk-bd.f b') || {}).textContent,
      ribW: [...new Set(rows.slice(0, 6).map((r) => Math.round(r.querySelector('.rk-tt').getBoundingClientRect().width)))]
    };
  });
  ck(list.n === 41, `리스트 행 수 ${list.n} (기대 41 = 더미 40 + 나)`);
  ck(list.medal, '1~3위 배지가 메달(.rk-bd.m) 이 아님');
  ck(list.flat, '4위 이하 배지가 플랫(.rk-bd.f) 이 아님');
  ck(list.no4 === '4', `4위 배지 숫자 «${list.no4}»`);
  ck(list.ribW.length === 1, `칭호 리본 폭이 행마다 다름: ${list.ribW.join(',')} (측정표: 256 고정)`);

  /* ---- 기능 3·4: 내 순위가 실제 기록으로 계산되고, 기록이 오르면 순위가 «오른다» ---- */
  const r1 = await page.evaluate(() => ({
    no: document.getElementById('rkMyNo').textContent,
    nm: document.getElementById('rkMyNm').textContent,
    sc: document.getElementById('rkMySc').textContent
  }));
  ck(r1.no === '27', `S.best 50 일 때 내 순위 «${r1.no}» (기대 27)`);
  ck(r1.nm === '용사_9174', `내 닉네임 «${r1.nm}»`);
  ck(r1.sc === '50', `내 최고 스테이지 «${r1.sc}»`);
  const r2 = await page.evaluate(() => { S.best = 300; openRank();
    return { no: document.getElementById('rkMyNo').textContent, sc: document.getElementById('rkMySc').textContent }; });
  ck(+r2.no < +r1.no, `S.best 50→300 인데 순위가 안 올랐다 (${r1.no} → ${r2.no})`);
  ck(r2.sc === '300', `기록 갱신이 알약에 반영 안 됨 «${r2.sc}»`);
  /* 포디움도 같은 데이터로 다시 그려진다 */
  const pod = await page.evaluate(() => [1, 2, 3].map((k) => ({
    n: document.getElementById('rkPn' + k).textContent,
    s: document.getElementById('rkPs' + k).textContent })));
  ck(pod[0].n === '세븐하이머' && pod[0].s === '452', `포디움 1위 «${pod[0].n}/${pod[0].s}»`);
  ck(+pod[0].s > +pod[1].s && +pod[1].s > +pod[2].s, '포디움 1·2·3위 점수가 내림차순이 아님');

  /* ---- 기능 5: 행 클릭 → 상세 팝업 ---- */
  await page.evaluate(() => document.querySelector('.rk-row').click());
  await page.waitForTimeout(250);
  const pop = await page.evaluate(() => {
    const m = document.getElementById('modal');
    const on = m && (m.classList.contains('on') || getComputedStyle(m).display !== 'none');
    return { on: !!on, t: (document.querySelector('#modal .mhead, #modal h3, #modal .mtitle') || {}).textContent || '' };
  });
  ck(pop.on, '행을 눌러도 상세 팝업이 안 뜬다');
  await page.evaluate(() => { const b = document.querySelector('#modal .mbtn, #modal button'); if (b) b.click(); });
  await page.waitForTimeout(250);

  /* ---- 기능 6: 잠금 탭은 안내만 띄우고 리스트를 바꾸지 않는다 ---- */
  const before = await page.evaluate(() => document.getElementById('rkList').textContent.slice(0, 60));
  await page.evaluate(() => document.querySelector('[data-rktab="tower"]').click());
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    same: document.getElementById('rkList').textContent.slice(0, 60),
    pop: !!document.querySelector('#modal') && getComputedStyle(document.getElementById('modal')).display !== 'none'
  }));
  ck(after.pop, '잠금 탭(시련의 탑)을 눌러도 안내가 없다');
  ck(after.same === before, '잠금 탭이 리스트를 바꿔버렸다');
  await page.evaluate(() => { const b = document.querySelector('#modal .mbtn, #modal button'); if (b) b.click(); });
  await page.waitForTimeout(200);

  /* ---- 기능 7: ← 뒤로가기로 닫힌다 ---- */
  await page.evaluate(() => document.getElementById('rkBack').click());
  await page.waitForTimeout(300);
  ck(!(await page.evaluate(() => document.getElementById('rkw').classList.contains('on'))), '← 를 눌러도 안 닫힌다');

  /* ---- NaN/undefined ---- */
  await page.evaluate(() => openRank());
  await page.waitForTimeout(250);
  const bad = await page.evaluate(() => {
    const t = document.getElementById('rkw').textContent;
    return ['NaN', 'undefined', 'null', 'Infinity'].filter((k) => t.includes(k));
  });
  ck(bad.length === 0, `랭킹 화면 텍스트에 ${bad.join(',')}`);
  ck(errs.length === 0, '콘솔 에러: ' + errs.join(' | '));

  console.log(`VERIFY54 ${pass}/${pass + fails.length}`);
  fails.forEach((f) => console.log('  ✗ ' + f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
