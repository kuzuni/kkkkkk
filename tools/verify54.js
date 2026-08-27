/* 54 랭킹 페이지 — 기하 + 기능 게이트.
   기하는 측정표 docs/measure/54-랭킹팝업.md 의 «프레임 좌표(= ref y − 84)» 를 그대로 기대값으로 쓴다.
   기능은 «눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 실제 확인한다(ROUTINE «기능 완성 규칙»).
   사용: node tools/verify54.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
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
  /* 12회차 — 테두리 9px→1px. 안쪽 상자(50..1029 / 811..1875)는 불변이고 «외곽»만 상하좌우로 8px 줄었다.
     측정표 §11 «외곽 41..1038 / 886..1968 · 테두리 9px» 은 오기(재지 않고 안쪽에서 역산한 값) — review 10~12회차 참고 */
  ['.rk-panel', 42, 802, 997, 1082],  /* 19회차 — 띠 1px→8px 를 «바깥으로» 키웠다. 안쪽 50/1030/810/1876 은 불변 */
  ['.rk-row:nth-child(1)', R, ROW1, 950, 151],
  ['.rk-row:nth-child(2)', R, ROW1 + PITCH, 950, 151],
  ['.rk-row:nth-child(6)', R, ROW1 + PITCH * 5, 950, 151],
  ['.rk-row:nth-child(1) .rk-lc', R + 6, ROW1 + 5, 148, 138],
  ['.rk-row:nth-child(1) .rk-rc', R + 731, ROW1 + 5, 213, 138],
  ['.rk-row:nth-child(1) .rk-bd', R + 29, ROW1 + 34, 102, 80],
  ['.rk-row:nth-child(4) .rk-bd', R + 32, ROW1 + PITCH * 3 + 26, 96, 96],
  ['.rk-row:nth-child(1) .rk-av', R + 192, ROW1 + 17, 111, 113],
  ['.rk-row:nth-child(1) .rk-tt', R + 317, ROW1 + 34, 256, 47],
  ['.rk-row:nth-child(1) .rk-sc', R + 759, ROW1 + 64, 179, 50],
  ['.rk-me', 0, 1905, 1080, 172],
  ['.rk-mp', 6, 1910, 149, 164],
  ['.rk-me .rk-av', 206, 1926, 122, 122],  /* 20회차 — ref 검정 외곽 1926..2047 = h122(X⑩·Z⑧·Y⑩ 3인 공통) */
  ['.rk-me .rk-tt', 343, 1943, 278, 48],   /* 12회차 — ref col 480 검정 테두리 2028..2075 = 48px */
  ['.rk-me .rk-sc', 888, 1982, 179, 50],
  ['.rk-div2', 0, 2077, 1080, 8],
  ['.rk-nav', 0, 2086, 1080, 164],
  ['.rk-back', 53, 2127, 94, 82],
  ['.rk-tab.t1', 199, 2086, 288, 164],
  ['.rk-tab.t2', 492, 2086, 188, 164],
  ['.rk-tab.t3', 685, 2086, 190, 164],
  ['.rk-pod.p1', 376, 449, 327, 243],  /* 21회차 — 받침 외곽 376..703 을 담으려고 378/324 에서 넓혔다 */
  ['.rk-pod.p2', 50, 463, 328, 229],   /* 8회차 — 윗면 원근 기울기를 담으려고 위로 19px 확장 */
  ['.rk-pod.p2>b', 50, 463, 328, 76],
  ['.rk-pod.p3', 702, 464, 329, 228],  /* 17회차 — 먼 모서리 평평 468 + 검정 3.5px 균일 */
  ['.rk-mid', 0, 702, 1080, 1203],
  ['.rk-sep.e0', 195, 2086, 4, 164],
  ['.rk-sep.e1', 488, 2086, 4, 164],
  /* 작업 101(주인 지시 2026-08-26) — `.rk-ch.c3a`(⛵) 와 `.rk-fl.f1/f2/f3`(🛸👑 🤖👻 🛸🎃) 는 폐기.
     기하 기대값 대신 아래 «폐기» 절에서 «존재하지 않음» 으로 검사한다.
     `.rk-ch.c1/c2/c3b` 의 기하도 여기서 뺐다 — **작업 80 이 단상 위 이모지를 스프라이트 캔버스로
     바꾸면서 소유권이 `tools/verify80.js` 로 넘어갔다**(A3 캔버스 1:1 규격 · A4 상자 위치가 정답값).
     여기 남아 있던 «10회차 M·N 공통분» 값(c1 360/261/340/205 · c2 24/196/314/274 · c3b 845/275/196/205)은
     이모지 잉크 bbox 기준이라 80 이후로는 영구 FAIL 이었다 — LESSONS 52-⑤ «구현이 아니라 검사가 낡은 것». */
  ['.rk-sep.e2', 680, 2086, 5, 164],
  ['.rk-sep.e3', 875, 2086, 5, 164],
  ['.rk-sh.s1', 489, 461, 102, 88],
  ['.rk-sh.s2', 164, 482, 102, 73],
  ['.rk-sh.s3', 814, 484, 102, 78],
  ['.rk-rb.rk-pr1', 435, 548, 210, 37],   /* 12회차 — 기둥 중심 539.5 정렬(O·P 공통, 구 439 는 +4.5px 우측) */
  ['.rk-rb.rk-pr2', 111, 559, 208, 36],
  ['.rk-rb.rk-pr3', 759, 561, 211, 36],
  ['.rk-pp.q1', 425, 625, 230, 45],
  ['.rk-pp.q2', 100, 635, 230, 45],
  ['.rk-pp.q3', 750, 637, 230, 45]
];

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
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

  /* ---- 폐기(작업 101, 주인 지시 2026-08-26): 단상 위 부유 장식·탈것 «존재하지 않음» ----
     ① `.rk-fl`(🛸👑 🤖👻 🛸🎃) 3군집 · ② `.rk-ch.c3a`(⛵) 는 마크업·CSS 모두 삭제됐다.
     ③ 씬 안에 남는 <em> 은 순위 방패 3개(🥇🥈🥉)뿐이다 — 개수는 «방패 수» 에서 세므로
        방패가 늘거나 줄어도 이 게이트는 안 깨진다(LESSONS 52-⑤ 처방 1·2). */
  const dec = await page.evaluate(() => ({
    fl: document.querySelectorAll('#rkw .rk-fl').length,
    c3a: document.querySelectorAll('#rkw .rk-ch.c3a').length,
    em: document.querySelectorAll('#rkw .rk-scene em').length,
    sh: document.querySelectorAll('#rkw .rk-scene .rk-sh').length,
    chEm: document.querySelectorAll('#rkw .rk-ch em').length
  }));
  ck(dec.fl === 0, `폐기 — 부유 장식 .rk-fl 이 ${dec.fl}개 남아 있음 (기대 0)`);
  ck(dec.c3a === 0, `폐기 — 탈것 .rk-ch.c3a 가 ${dec.c3a}개 남아 있음 (기대 0)`);
  ck(dec.chEm === 0, `폐기 — 단상 캐릭터 자리는 캔버스뿐이어야 하는데 <em> 이 ${dec.chEm}개 (기대 0)`);
  ck(dec.em === dec.sh, `폐기 — 씬 <em> ${dec.em}개 · 순위 방패 ${dec.sh}개 (기대: 방패뿐이라 같아야 함)`);

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
  /* 작업 147(2026-08-26) — **이 절의 probe 는 전부 «단상 판» 기하다. 캐릭터를 숨기고 찍는다.**
     이 파일은 세 회차(8·14·17회차) 연속으로 «표본 열이 캐릭터에 가려 검정이라 값을 잘못 읽었다» 를
     겪었고(측정표 §3-1b 정오표 · 이 파일 top3/top3b 주석), 147 이 2·3위 스프라이트를 sc5 → sc7 로
     키우자 **2위 단상은 가림 없는 열이 x72..81 뿐**이 됐다(잉크가 x54..361 로 단상 폭 72..359 를 덮는다).
     표본 열을 옮기면 기대값을 슬로프로 다시 풀어야 해 «검사가 측정을 재정의» 하게 된다 —
     대신 `visibility:hidden` 으로 캐릭터만 빼고 찍으면 **기대값을 한 줄도 안 바꾸고** 판을 그대로 잰다.
     (`visibility` 라 레이아웃은 안 움직인다. 캐릭터 자체의 검증 소유권은 verify80/verify147 이다.) */
  await page.addStyleTag({ content: '#rkw .rk-ch{visibility:hidden!important}' });
  await page.waitForTimeout(150);
  const shot = (await page.locator('#app').screenshot()).toString('base64');
  /* 캡처가 끝났으면 바로 되돌린다 — 뒤에 붙는 검사가 «캐릭터 없는 화면» 을 보게 두지 않는다 */
  await page.addStyleTag({ content: '#rkw .rk-ch{visibility:visible!important}' });
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
    return {
      size: [cv.width, cv.height],
      top2: [85, 150, 320, 345].map((x) => [x].concat(span(x, 455, 560, '91AFCB', 8))),
      rim2: [[85, 487], [345, 469]].map(([x, y]) => [x, y].concat(px(x, y - 3))),
      front2: span(85, 522, 686, '4A5978', 8),
      gold1: span(440, 440, 520, 'FFDC62', 8),
      /* 15회차 — 3위 윗면은 «없다» 가 아니라 «밝은 띠 + 립» 2단이다(측정표 §3-1a 정오표)
         17회차 — ref 상판이 «L80 #694C2E + L95 #7B5A39(하이라이트 12px)» **2톤**임이 확인돼
         구현도 2톤이 됐다. 그래서 «먼 모서리» 는 하이라이트가 아니라 **L80 톤**으로 잰다.
         그리고 «3위 윗변이 기울었다» 는 오독이 세 회차째 재발하므로 **두 열 + 평평함**으로 못박는다:
         ref 는 가림 없는 x856..877 · x952..1000 에서 갈색 시작이 **둘 다 467.8** 이다
         (x878~950 은 캐릭터의 청회색 덩어리가 덮는다. 신설 `tools/p3prof.py`). */
      /* 21회차 — «세 몸통 폭이 서로 다르다»(Y ⑦, 2차 라운드 1순위)를 **양성 형식**으로 못박는다.
         씬 배경은 radial glow 때문에 x 마다 달라 «배경색과 다르다» 로는 못 자른다 → 가로 밝기의 «급변»
         (|ΔL| ≥ 20)으로 경계를 잡는다. 단상 외곽은 검정이라 배경과의 대비가 항상 이 문턱을 넘는다.
         행은 텍스트·아트가 없는 전면 밴드 f620 (ref 70..360 / 395..685 / 720..1010 — 셋 다 291·간격 34). */
      front3: (() => {
        const y = 620, L = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
        /* 씬 배경 = 자주빛 마룬(r ≫ g, b ≳ g, 어둡다). 단상 채움 셋(2위 청회 · 1위 주황 · 3위 암갈)과
           흰 글자는 이 셋 중 하나를 반드시 어긴다 — 특히 3위 암갈(52,37,19)은 밝기가 배경과 비슷해
           «밝기» 로는 못 가른다(b ≪ g 로 갈린다). */
        const bgLike = (c) => c[2] >= c[1] - 8 && c[0] > c[1] + 20 && L(c) < 80;
        const blk = (c) => L(c) < 25;
        const edge = []; let s = -1;
        for (let x = 0; x < W; x++) {
          if (blk(px(x, y))) { if (s < 0) s = x; continue; }
          if (s >= 0) {
            if (x - s >= 4) {
              const lo = s - 5 >= 0 && bgLike(px(s - 5, y)), hi = x + 4 < W && bgLike(px(x + 4, y));
              if (lo && !hi) edge.push(['L', s]);
              else if (hi && !lo) edge.push(['R', x - 1]);
            }
            s = -1;
          }
        }
        const seg = [];
        for (let i = 0; i + 1 < edge.length; i++) {
          if (edge[i][0] === 'L' && edge[i + 1][0] === 'R') { seg.push([edge[i][1], edge[i + 1][1]]); i++; }
        }
        return seg;
      })(),
      top3: span(990, 460, 512, '694C2E', 10),
      top3b: span(760, 460, 512, '694C2E', 10),
      hi3: span(990, 460, 524, '7B5A39', 10),
      lip3: span(990, 512, 552, '60462D', 12)
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
  /* 10회차 — 캐릭터가 슬래브 앞에서 11px 겹치므로(ref 동일) 먼 모서리는 455..469 사이에서 드러난다 */
  ck(probe.gold1[0] >= 455 - 3 && probe.gold1[0] <= 469, `1위 윗면 먼 모서리 — 기대 455~469(캐릭터 겹침) · 실제 ${probe.gold1[0]}`);
  ck(probe.gold1[1] >= 0 && Math.abs(probe.gold1[1] - 492) <= 3, `1위 윗면 가까운 모서리 — 기대 492(ref 577) · 실제 ${probe.gold1[1]}`);
  /* 3위 윗면 — **검사가 낡았던 항목**(LESSONS 52-⑤). 8회차까지 이 게이트는 «3위엔 밝은 슬래브가 없어야 한다»
     (`bright3 === 0`)를 걸고 있었다. 근거였던 측정표 §3-1a 는 x990·x735 두 열만 봤는데 x735 는 캐릭터에
     가려 검정이었다 — 즉 «없다» 를 가림 때문에 잘못 읽은 것이다. 비평가 4명(O·P·R·Q)이 두 회차에 걸쳐
     «3위만 윗면이 없다» 고 짚었고, 가림 없는 열을 훑으니 ref 에 또렷하다(y, col 775·950·995 셋 다 동일):
       밝은 윗면 …602 → 604..625 립 → 627..639 어두운 테 → 641.. 앞면
     그래서 «없어야 한다» 를 **«있어야 한다 + 경계가 어디여야 한다»** 로 뒤집는다(2위 top2 와 같은 형식). */
  /* 21회차 — 시상대 3블록 전면 몸통: 폭·간격·피치가 ref 와 같아야 한다 */
  ck(probe.front3.length === 3, `f620 전면 몸통 3개가 잡혀야 한다 — 실제 ${probe.front3.length}개 ${JSON.stringify(probe.front3)}`);
  if (probe.front3.length === 3) {
    const WANT = [[70, 360], [395, 685], [720, 1010]], NM = ['2위', '1위', '3위'];
    probe.front3.forEach((s, i) => {
      ck(Math.abs(s[0] - WANT[i][0]) <= 2 && Math.abs(s[1] - WANT[i][1]) <= 2,
        `${NM[i]} 전면 외곽 f620 — 기대 ${WANT[i].join('..')} · 실제 ${s.join('..')}`);
    });
    const w = probe.front3.map((s) => s[1] - s[0] + 1);
    ck(Math.max(...w) - Math.min(...w) <= 2, `전면 몸통 폭은 셋이 같아야 한다 — 실제 ${w.join('/')} (ref 291/291/291)`);
    const c = probe.front3.map((s) => (s[0] + s[1]) / 2);
    ck(Math.abs((c[1] - c[0]) - 325) <= 2 && Math.abs((c[2] - c[1]) - 325) <= 2,
      `전면 몸통 피치 — 기대 325/325(ref) · 실제 ${(c[1] - c[0]).toFixed(1)}/${(c[2] - c[1]).toFixed(1)}`);
  }
  ck(probe.top3[0] >= 0 && Math.abs(probe.top3[0] - 468) <= 3,
    `3위 윗면 먼 모서리 x990 — 기대 468(ref 갈색 시작 467.8) · 실제 ${probe.top3[0]}`);
  /* 17회차 — 먼 모서리는 **평평**하다. 한 열만 재면 «기울었다/낮다» 는 오독을 못 막는다 → 왼쪽 열도 같이. */
  ck(probe.top3b[0] >= 0 && Math.abs(probe.top3b[0] - 468) <= 3,
    `3위 윗면 먼 모서리 x760 — 기대 468(ref 갈색 시작 467.8) · 실제 ${probe.top3b[0]}`);
  ck(probe.top3[0] >= 0 && probe.top3b[0] >= 0 && Math.abs(probe.top3b[0] - probe.top3[0]) <= 2,
    `3위 먼 모서리는 평평해야 한다 — x760 vs x990 Δ${probe.top3b[0] - probe.top3[0]} (기대 ≤2)`);
  /* 상판 하이라이트(#7B5A39)는 ref 에서 x720~1005 전부 507..518 로 평평하다 */
  ck(probe.hi3[0] >= 0 && Math.abs(probe.hi3[0] - 506) <= 3,
    `3위 상판 하이라이트 상단 x990 — 기대 506(ref 590) · 실제 ${probe.hi3[0]}`);
  ck(probe.hi3[1] >= 0 && Math.abs(probe.hi3[1] - 518) <= 3,
    `3위 윗면 가까운 모서리 x990 — 기대 518(ref 602) · 실제 ${probe.hi3[1]}`);
  ck(probe.lip3[0] >= 0 && Math.abs(probe.lip3[0] - 520) <= 3,
    `3위 슬래브 립 상단 x990 — 기대 520(ref 604) · 실제 ${probe.lip3[0]}`);
  ck(probe.lip3[1] >= 0 && Math.abs(probe.lip3[1] - 541) <= 3,
    `3위 슬래브 립 하단 x990 — 기대 541(ref 625) · 실제 ${probe.lip3[1]}`);

  ck(errs.length === 0, '콘솔 에러: ' + errs.join(' | '));

  console.log(`VERIFY54 ${pass}/${pass + fails.length}`);
  fails.forEach((f) => console.log('  ✗ ' + f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
