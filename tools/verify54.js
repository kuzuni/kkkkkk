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
  ['.rk-pod.p1', 378, 449, 324, 243],
  ['.rk-pod.p2', 50, 463, 328, 229],   /* 8회차 — 윗면 원근 기울기를 담으려고 위로 19px 확장 */
  ['.rk-pod.p2>b', 50, 463, 328, 76],
  ['.rk-pod.p3', 702, 471, 329, 221],
  ['.rk-mid', 0, 702, 1080, 1203],
  ['.rk-sep.e0', 195, 2086, 4, 164],
  ['.rk-sep.e1', 488, 2086, 4, 164],
  ['.rk-ch.c1', 386, 146, 309, 301],
  ['.rk-ch.c2', 24, 155, 357, 326],
  ['.rk-ch.c3', 700, 148, 342, 321],
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
  /* 시상대 알약은 ref 잉크 폭 166 이 «N 스테이지» 라 단위까지 붙는다(비평 F①) */
  ck(pod[0].n === '세븐하이머' && pod[0].s === '452 스테이지', `포디움 1위 «${pod[0].n}/${pod[0].s}»`);
  const pv = pod.map((x) => parseInt(x.s, 10));
  ck(pv[0] > pv[1] && pv[1] > pv[2], '포디움 1·2·3위 점수가 내림차순이 아님');

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

  /* ---- 8회차: 시상대 윗면을 «실효 렌더값» 으로 잰다 (ROUTINE/LESSONS «게이트는 선언값을 읽지 마라»).
     clip-path 는 getBoundingClientRect 에 안 잡히므로 박스 기하만으로는 평행사변형을 검증할 수 없다.
     그래서 실제 캔버스를 찍어 «열마다 윗면 색이 몇 y 부터 몇 y 까지인가» 를 직접 센다.
     기대값은 ref 열스캔(docs/measure/54-랭킹팝업.md §3-1a, 프레임 = ref y − 84). ---- */
  await page.addStyleTag({ content: '#fxl{display:none!important}' });
  await page.waitForTimeout(150);
  const shot = (await page.locator('#app').screenshot()).toString('base64');
  /* PNG 디코드는 크로미움 자신에게 시킨다 — npm 의존성 0 (pngjs 는 이 환경에 없다).
     data: URL 은 캔버스를 오염시키지 않으므로 getImageData 가 그대로 된다. */
  const probe = await page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const W = cv.width;
    const px = (x, y) => { const i = (W * y + x) << 2; return [d[i], d[i + 1], d[i + 2]]; };
    const near = (c, hex, tol) => {
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), bl = parseInt(hex.slice(4, 6), 16);
      return Math.abs(c[0] - r) <= tol && Math.abs(c[1] - g) <= tol && Math.abs(c[2] - bl) <= tol;
    };
    const span = (x, y0, y1, hex, tol) => {
      let a = -1, b = -1;
      for (let y = y0; y <= y1; y++) if (near(px(x, y), hex, tol)) { if (a < 0) a = y; b = y; }
      return [a, b];
    };
    let bright = 0;
    for (let y = 470; y <= 690; y++) if (near(px(990, y), '8A6A44', 24)) bright++;
    return {
      size: [cv.width, cv.height],
      top2: [85, 150, 320, 345].map((x) => [x].concat(span(x, 455, 560, '91AFCB', 8))),
      rim2: [[85, 487], [345, 469]].map(([x, y]) => [x, y].concat(px(x, y - 3))),
      front2: span(85, 522, 686, '4A5978', 8),
      gold1: span(440, 440, 520, 'FFDC62', 8),
      bright3: bright
    };
  }, shot);
  ck(probe.size[0] === 1080 && probe.size[1] === 2280, `캡처 크기 ${probe.size.join('x')} (기대 1080x2280)`);
  /* 2위 윗면(#91AFCB) — 먼 모서리는 기울고 가까운 모서리는 프레임 518 에서 평평하다 */
  const WANT2 = { 85: 487, 150: 483, 320: 471, 345: 469 };
  for (const [x, a, b] of probe.top2) {
    ck(a >= 0 && Math.abs(a - WANT2[x]) <= 3, `2위 윗면 먼 모서리 x${x} — 기대 ${WANT2[x]} · 실제 ${a}`);
    ck(b >= 0 && Math.abs(b - 518) <= 3, `2위 윗면 가까운 모서리 x${x} — 기대 518(ref 603 − 84 − 1) · 실제 ${b}`);
  }
  /* 윗면 위에는 검정 실루엣 띠가 있어야 한다 */
  for (const [x, y, r, g, b] of probe.rim2) {
    ck(r < 70 && g < 70 && b < 70, `2위 윗면 위 검정 띠 x${x} y${y - 3} — 실제 rgb(${r},${g},${b})`);
  }
  /* 앞면은 단일 톤이라 «가로 경계» 가 없어야 한다 (ref 604..774 가 한 덩어리) */
  ck(probe.front2[0] >= 0 && probe.front2[0] <= 525 && probe.front2[1] >= 684,
    `2위 앞면 단일 톤 — 실제 ${probe.front2.join('..')} (기대 ≈521..686)`);
  /* 1위 금색 윗면 — ref 538..577 → 프레임 454..493 */
  ck(probe.gold1[0] >= 0 && Math.abs(probe.gold1[0] - 455) <= 3, `1위 윗면 먼 모서리 — 기대 455 · 실제 ${probe.gold1[0]}`);
  ck(probe.gold1[1] >= 0 && Math.abs(probe.gold1[1] - 492) <= 3, `1위 윗면 가까운 모서리 — 기대 492(ref 577) · 실제 ${probe.gold1[1]}`);
  /* 3위 — ref 에 밝은 슬래브가 없다(윗면·앞면 모두 짙은 갈색). 옛 #8A6A44 가 남아 있으면 실패 */
  ck(probe.bright3 === 0, `3위에 ref 에 없는 밝은 슬래브가 ${probe.bright3}px 남아 있다`);

  ck(errs.length === 0, '콘솔 에러: ' + errs.join(' | '));

  console.log(`VERIFY54 ${pass}/${pass + fails.length}`);
  fails.forEach((f) => console.log('  ✗ ' + f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
