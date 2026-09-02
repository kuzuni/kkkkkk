#!/usr/bin/env node
/* 재현기 — 작업 414 「34 축복 팝업의 초록 프로모 스트립이 1600 에서 앱 탭바를 164px 덮는다」
 *
 *   node tools/probe414.js
 *
 * 338·341·350·391 규칙: **처방 전에 재현한다.** 등재문은 값(164px)까지 적어 뒀지만
 * «그래서 그게 결함인가» 를 안 정하고 넘겼다 — 오히려 스스로 «가려지는 글자는 0 이다»
 * 라고 적어 두고 **ⓓ 조작 한 축만** 남겼다. 그런데 그 축은 406 이 이미 규약을 확정한 축이다
 * («덮임» 이 아니라 **«닿나»** 로 재고, **2280 에서 이미 안 닿는 것은 «판정 불가»**).
 *
 * 그래서 이 자는 «덮는가» 가 아니라 **«덮임이 무엇을 망가뜨리는가»** 를 축으로 세운다.
 *   ⓐ 기하   — 블록(`.bls` + 간격 + `.bls-promo` + `.bls-x`) · 탭바 · HUD 잉크 끝(`.pedge` 142)
 *              · 위/아래 여백을 3프레임에서.
 *   ⓑ 가림의 성질 — 딤 알파 · **탭 5칸 전부**의 `elementFromPoint`(406-①: 스택이 아니라 포인터).
 *   ⓒ 조작   — 팝업이 열린 채 탭을 **실제로 클릭**하면 화면이 바뀌는가 + **나갈 길**(406-④):
 *              딤·✕ 가 1600 에서 실제로 닫는가.
 *   ⓓ 잘림·스크롤 — 프레임 밖으로 나간 자식 0 · `#blsw` 스크롤 0(351 재지시 ① «스크롤 안 해도 보이게»)
 *              · **가려지는 글자 0** 을 «찍힌 픽셀» 로 (탭바를 숨겨도 겹침 띠가 한 픽셀도 안 바뀐다).
 *   ⓔ 기하가 없다 — 탭바 위 띠(142..1420 = **1278**)가 블록(1157+21+249 = **1427**)보다 **149px 짧다.**
 *              ⇒ 164 를 «어딘가에서 빼는» 길은 레퍼런스 절대값을 12.9% 깎는 것뿐이다.
 *   ⓕ 검산   — 1600 의 배치는 **이미 띠 한가운데**다(391 이 세운 자): 위 15 ↔ 아래 16.
 *              그리고 **1920 에서도 덮는다**(`.bls-x` 11px) — 덮임이 감점이면 그 화면이 먼저 빨개진다.
 *
 * ⚠ 이 자는 **«수리 전» 사본**에서도 돈다 — 351 1회차가 넣은 아래 가드 회수
 *   (`padding-bottom:clamp(16px, …, 146px)`)를 그 전의 고정 `146px` 로 되돌린 임시 파일을 만든다.
 *   갈아 끼울 자리를 못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname, '..', 'index.html');
const NEW = '#blsw{padding-bottom:clamp(16px, calc(var(--frameh) - 1696px), 146px)}';
const OLD = '#blsw{padding-bottom:146px}';

const INK = 142;      /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차가 못박은 축) */
const TABH = 180;     /* 앱 탭바 높이 (390 이 못박은 띠의 아래끝) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (n) => Math.round(n * 10) / 10;

async function measure(browser, file, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const q = (s) => document.querySelector(s);
    const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left, h: r.height, w: r.width }; };
    const w = document.getElementById('blsw');
    const cs = getComputedStyle(w);
    const tb = document.getElementById('tabbar');
    const tbb = box(tb);
    /* 826 이관 — ✕ 가 `.bls` 안으로 들어가 `#blsw.children` 에서 빠졌다. 이 표는 «그려지는 조각» 을
       세는 자리(덮임 · 프레임 밖)라 ✕ 를 이름으로 다시 넣는다(verify414 와 같은 이관). */
    const parts = [...w.children];
    const xEl = w.querySelector('.bls-x');
    if (xEl && !parts.includes(xEl)) parts.push(xEl);
    const kids = parts.map((e) => ({ c: (e.className || e.id || '?').toString().split(' ')[0], ...box(e) }));
    /* ⓑ 탭 5칸 전부 — 포인터가 실제로 가 닿는 하나(406-①) */
    const hits = [...document.querySelectorAll('.tab[data-t]')].map((t) => {
      const r = t.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { t: t.dataset.t, hit: h ? (h.id || String(h.className).split(' ')[0] || h.tagName) : null,
        isTab: !!(h && h.closest && h.closest('.tab[data-t]')) };
    });
    const cover = (e) => { const b = box(e); return b ? Math.max(0, b.b - tbb.t) : 0; };
    return {
      frameH: app.height, open: w.classList.contains('on'), shortf: document.getElementById('app').classList.contains('shortf'),
      dim: cs.backgroundColor, padT: parseFloat(cs.paddingTop), padB: parseFloat(cs.paddingBottom),
      scrollH: w.scrollHeight, clientH: w.clientHeight,
      inkEnd: q('.pedge') ? box(q('.pedge')).b : null,
      tabTop: tbb.t, tabH: tbb.h,
      bls: box(q('#blsw .bls')), promo: box(q('#blsw .bls-promo')), x: box(q('#blsw .bls-x')),
      kids,
      /* 흐름 블록 = 스크롤 안에서 실제로 쌓인 것들 (✕ 는 shortf 에서 흐름 밖) */
      /* 826 이관 — ✕ 는 이제 어느 프레임에서든 흐름 밖이다(`.bls` 의 abspos 자식). */
      flowTop: Math.min(...kids.filter((k) => k.c !== 'bls-x').map((k) => k.t)),
      flowBot: Math.max(...kids.filter((k) => k.c !== 'bls-x').map((k) => k.b)),
      coverPromo: cover(q('#blsw .bls-promo')), coverX: cover(q('#blsw .bls-x')),
      coverAny: Math.max(...kids.map((k) => Math.max(0, k.b - tbb.t))),
      out: kids.filter((k) => k.b > app.height + 0.5 || k.t < -0.5).map((k) => k.c),
      hits,
    };
  });

  /* ⓒ 조작 — 팝업이 열린 채 탭바의 탭을 실제로 클릭한다 */
  const snap = () => page.evaluate(() => ({
    bls: document.getElementById('blsw').classList.contains('on'),
    on: document.querySelector('.tab.on') ? document.querySelector('.tab.on').dataset.t : null,
    panel: (document.querySelector('#panel .pg.on') || {}).id || null,
  }));
  const before = await snap();
  const tabs = await page.$$('.tab[data-t]');
  await tabs[1].click({ timeout: 1500, force: true }).catch(() => {});
  await page.waitForTimeout(350);
  const after = await snap();
  /* 탭이 «켜졌는가» 가 판정이다 — 2280 에서는 그 점이 딤이라 클릭이 팝업을 «닫는다»(= 나갈 길).
     그것까지 «안 바뀜» 으로 묶으면 자가 거짓말을 한다(406-①: 묻는 것이 다르면 자도 다르다). */
  m.tabActivated = after.on !== before.on || after.panel !== before.panel;
  m.tabClickClosed = before.bls && !after.bls;
  m.stillOpen = after.bls;

  /* ⓓ 가려지는 글자 0 — 겹침 띠(프로모 x 구간 × 탭바 y 구간)를 탭바 있/없 두 번 찍어 픽셀로 센다.
     ⚠ 스트립은 `border-radius:20px` 이라 **아래 두 코너**에서는 탭바가 그대로 비친다 — 그건 덮인 자리가
     아니다. 그래서 «전체 띠» 와 «코너를 뺀 안쪽» 을 따로 센다(안쪽이 0 이어야 «가려지는 글자 0» 이다). */
  if (m.coverPromo > 0) {
    const R = 20;
    const clip = { x: Math.round(m.promo.l), y: Math.round(m.tabTop), width: Math.round(m.promo.w), height: Math.round(m.promo.b - m.tabTop) };
    const a = await page.screenshot({ clip });
    await page.evaluate(() => { document.getElementById('tabbar').style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    const b = await page.screenshot({ clip });
    await page.evaluate(() => { document.getElementById('tabbar').style.visibility = ''; });
    m.bandPx = clip.width * clip.height;
    const d = await page.evaluate(async ([da, db, w, h, r]) => {
      const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(da), load(db)]);
      const cv = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, w, h).data; };
      const A = cv(ia), B = cv(ib);
      let n = 0, inner = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) {
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          /* 코너를 뺀 «스트립이 실제로 덮은» 안쪽 */
          if (x >= r && x < w - r && y < h - r) inner++;
        }
      }
      return { n, inner, box: x1 < 0 ? null : [x0, y0, x1, y1] };
    }, ['data:image/png;base64,' + a.toString('base64'), 'data:image/png;base64,' + b.toString('base64'), clip.width, clip.height, R]);
    m.bandDiff = d.n; m.bandInner = d.inner; m.bandBox = d.box; m.bandR = R;
  } else { m.bandPx = 0; m.bandDiff = null; m.bandInner = null; }

  /* ⓒ 나갈 길(406-④) — 딤과 ✕ 가 1600 에서 실제로 닫는가 */
  await page.evaluate(() => { const w = document.getElementById('blsw'); if (!w.classList.contains('on')) w.classList.add('on'); });
  await page.waitForTimeout(200);
  const dimPt = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const pr = document.querySelector('#blsw .bls-promo').getBoundingClientRect();
    /* 프로모 왼쪽 바깥, 탭바 높이대의 딤 자리 */
    const x = app.left + (pr.left - app.left) / 2, y = pr.top + pr.height / 2;
    const h = document.elementFromPoint(x, y);
    return { x, y, id: h ? (h.id || String(h.className).split(' ')[0]) : null };
  });
  await page.mouse.click(dimPt.x, dimPt.y);
  await page.waitForTimeout(400);
  m.dimCloses = !(await page.evaluate(() => document.getElementById('blsw').classList.contains('on')));
  await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  await page.waitForTimeout(500);
  await page.click('#blsX', { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(400);
  m.xCloses = !(await page.evaluate(() => document.getElementById('blsw').classList.contains('on')));
  m.dimHit = dimPt.id;

  m.errs = errs.length;
  await ctx.close();
  return m;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(NEW)) {
    console.error('probe414: `#blsw` 아래 가드(351 1회차의 clamp)를 못 찾았다 — 자리가 옮겨졌다. 갱신할 것.');
    process.exit(2);
  }
  const tmp = path.join(os.tmpdir(), 'probe414-pre.html');
  fs.writeFileSync(tmp, src.replace(NEW, OLD));

  const browser = await launch(chromium);
  const A = {}, B = {};
  for (const H of [2280, 1920, 1600]) {
    A[H] = await measure(browser, SRC, H);   /* 현재 */
    B[H] = await measure(browser, tmp, H);   /* 아래 가드 회수 전(고정 146) */
  }
  await browser.close();

  console.log('\n── ⓐ 기하 (프레임 좌표) ───────────────────────────────────────────');
  console.log('  frameH │ 잉크 │ pad ↑/↓  │ .bls            │ promo           │ ✕               │ 탭바 덮임');
  for (const H of [2280, 1920, 1600]) {
    const M = A[H];
    console.log(`  ${H}   │ ${M.inkEnd} │ ${M.padT}/${r1(M.padB)}  │ ${r1(M.bls.t)}..${r1(M.bls.b)} │ `
      + `${r1(M.promo.t)}..${r1(M.promo.b)} │ ${r1(M.x.t)}..${r1(M.x.b)} │ promo ${r1(M.coverPromo)} · ✕ ${r1(M.coverX)}`);
  }
  console.log('\n  1600 여백 — 위(잉크→블록) ' + r1(A[1600].flowTop - INK) + ' · 아래(블록→프레임) ' + r1(A[1600].frameH - A[1600].flowBot));

  console.log('\n── 판정 ──────────────────────────────────────────────────────────');

  /* ⓐ 등재문 재현 */
  ok(Math.round(A[1600].coverPromo) === 164,
    `[ⓐ 1600] 등재문 «프로모가 탭바를 164px 덮는다» 재현 — 실측 ${r1(A[1600].coverPromo)} (가로 ${r1(A[1600].promo.w)})`);
  ok(Math.round(A[2280].coverAny) === 0,
    `[ⓐ 2280] 기준 프레임은 한 자식도 탭바를 안 덮는다 (${r1(A[2280].coverAny)})`);

  /* ⓔ 기하가 없다 — 띠가 블록보다 149px 짧다 */
  const band = A[1600].tabTop - INK;
  const block = A[1600].flowBot - A[1600].flowTop;
  ok(Math.round(band) === 1278 && Math.round(block) === 1427,
    `[ⓔ 1600] 탭바 위 띠 ${r1(band)} < 흐름 블록 ${r1(block)} — ${r1(block - band)}px 이 구조적으로 모자란다`);
  ok(block - band > 100,
    `[ⓔ] 164 를 «어딘가에서 뺀다» = 레퍼런스 절대값(.bls 1157 / 스트립 249)을 ${r1((block - band) / 1157 * 100)}% 깎는 것`);

  /* ⓕ 검산 1 — 이미 띠 한가운데다(391 이 세운 자) */
  const gTop = A[1600].flowTop - INK, gBot = A[1600].frameH - A[1600].flowBot;
  ok(Math.abs(gTop - gBot) <= 2,
    `[ⓕ 1600] 블록은 이미 «띠(잉크 142 ↔ 프레임 1600) 한가운데» — 위 ${r1(gTop)} ≈ 아래 ${r1(gBot)} (391 자)`);
  /* ⓕ 검산 2 — 1920 도 덮는다 */
  ok(A[1920].coverAny > 0,
    `[ⓕ 1920] 짧지 않은 프레임(shortf ${A[1920].shortf})도 탭바를 덮는다 — ✕ ${r1(A[1920].coverX)}px ⇒ «덮임» 은 1600 이 새로 만든 것이 아니다`);

  /* ⓑ 가림의 성질 — 탭 5칸이 두 해상도 모두 안 닿는다 */
  for (const H of [2280, 1600]) {
    const M = A[H];
    ok(M.hits.length === 5 && M.hits.every((h) => !h.isTab),
      `[ⓑ ${H}] 탭 ${M.hits.length}칸 전부 포인터가 안 닿는다 — ${M.hits.map((h) => h.t + ':' + h.hit).join(' · ')}`);
  }
  ok(A[2280].hits.every((h) => !h.isTab),
    `[ⓑ 406 규약] 2280 에서 **이미** 안 닿는다 ⇒ 조작 축은 «판정 불가»(406-① · LESSONS 351-④ 의 짝)`);

  /* ⓒ 조작 — 클릭해도 아무 일 없다 · 나갈 길은 둘 다 산다 */
  for (const H of [2280, 1920, 1600]) {
    ok(!A[H].tabActivated,
      `[ⓒ ${H}] 팝업이 열린 채 탭을 눌러도 탭이 안 켜진다 (그 클릭이 한 일: ${A[H].tabClickClosed ? '딤이 먹고 팝업이 닫힘 = 나갈 길' : '아무 일 없음'})`);
  }
  for (const H of [2280, 1600]) {
    ok(A[H].dimCloses && A[H].xCloses,
      `[ⓒ ${H}] 나갈 길 둘 다 산다 — 딤(${A[H].dimHit}) 닫힘 ${A[H].dimCloses} · ✕ 닫힘 ${A[H].xCloses}`);
  }

  /* ⓓ 잘림 0 · 스크롤 0 · 가려지는 글자 0 */
  for (const H of [2280, 1920, 1600]) {
    ok(A[H].out.length === 0 && A[H].errs === 0,
      `[ⓓ ${H}] 자식이 프레임 밖으로 안 나간다 · 콘솔 에러 0 (밖 ${A[H].out.length}건)`);
    ok(A[H].scrollH <= A[H].clientH,
      `[ⓓ ${H}] #blsw 스크롤 0 — 스크롤 안 해도 다 보인다 (scrollH ${A[H].scrollH} ≤ clientH ${A[H].clientH})`);
  }
  ok(A[1600].bandInner === 0,
    `[ⓓ 1600] 겹침 띠 ${r1(A[1600].promo.w)}×${r1(A[1600].coverPromo)} = ${A[1600].bandPx}px — 탭바를 숨겨도 스트립이 덮은 안쪽은 `
    + `**0px** 바뀐다 ⇒ 가려지는 글자 0 (코너 반경 ${A[1600].bandR} 안쪽 ${A[1600].bandDiff}px 은 탭바가 그대로 비치는 자리 · bbox ${JSON.stringify(A[1600].bandBox)})`);

  /* §R 되돌림 — 아래 가드 회수(351 1회차)를 되돌리면 실제로 무너진다 */
  ok(B[1600].scrollH > B[1600].clientH && A[1600].scrollH <= A[1600].clientH,
    `[§R 1600] 아래 가드를 고정 146 으로 되돌린 사본은 스크롤이 생긴다 (scrollH ${B[1600].scrollH} > ${B[1600].clientH}) — 현재는 ${A[1600].scrollH}`);
  ok(Math.round(B[2280].coverAny) === 0 && Math.round(B[2280].bls.t) === Math.round(A[2280].bls.t),
    `[§R 2280] 되돌린 사본과 현재가 기준 프레임에서 같다 (bls top ${r1(B[2280].bls.t)} = ${r1(A[2280].bls.t)}) — 회수는 짧은 프레임 전용`);

  console.log(`\nPROBE414 ${pass}/${pass + fail}` + (fail ? ' — FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})();
