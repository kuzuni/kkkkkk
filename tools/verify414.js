#!/usr/bin/env node
/* 작업 414 회귀 게이트 — 34 축복 팝업(`#blsw`)의 «짧은 프레임 하단»
 *   실행: node tools/verify414.js   → 마지막 줄이 `VERIFY414 n/n PASS` 여야 한다.
 *
 * 등재문은 «1600 에서 초록 프로모 스트립이 앱 탭바를 164px 덮는다 ⇒ 164 를 어딘가에서 빼야 하고
 * 그건 주인 재지시 ②(«9:19 레이아웃을 바꿔서라도»)를 쓰는 자리» 였다.
 * `probe414` 가 값(164)은 그대로 재현했지만 **판정은 기각됐다.** 다섯이 같이 그것을 말한다.
 *   ⓐ **기하가 없다** — 탭바 위 띠(잉크 142 ↔ 탭바 1420 = **1278**)가 흐름 블록
 *      (`.bls` 1157 + 21 + 스트립 249 = **1427**)보다 **149px 짧다.** 164 를 빼는 유일한 길은
 *      레퍼런스 절대값을 **12.9%** 깎는 것이고, 재지시 ② 의 이탈 허용 범위는
 *      «**1600 에서 보이게 하는 데 필요한 만큼**» 인데 —
 *   ⓑ **1600 에서 이미 다 보인다** — 프레임 밖 자식 0 · `#blsw` 스크롤 0 ·
 *      겹침 띠 안쪽에서 탭바를 숨겨도 바뀌는 픽셀 **0**(가려지는 글자 0. 등재문도 그렇게 적었다).
 *   ⓒ **조작 축은 «판정 불가»** — 406 확정 규약(«덮였나» 가 아니라 «닿나» · **2280 에서 이미
 *      안 닿는 것은 뺀다»). 탭 5칸은 **2280 에서도** 딤이 포인터를 다 먹어 안 닿는다.
 *   ⓓ **덮임은 1600 이 새로 만든 것이 아니다** — `.bls-x` 는 **1920**(shortf 아님)에서도 탭바를
 *      11px 덮는다. 덮임이 감점이면 그 프레임이 먼저 빨개졌어야 한다(391 의 ⓔ 검산과 같은 꼴).
 *   ⓔ **배치는 이미 최적이다** — 391 이 세운 자(«쓸 수 있는 띠의 한가운데»)로 재면
 *      1600 에서 위 15 ↔ 아래 16 이다. 위로 더 밀면 HUD 잉크(142)에 붙고, 아래로 더 밀면 잘린다.
 *
 * ⚠ 406-④ — «덮여도 된다» 만 적으면 그건 감점을 없애는 면죄부다. 그래서 §3 이 **대가를 받는다**:
 *    스크롤 0 · 잘림 0 · 가려지는 글자 0 · 나갈 길 둘 · 띠 한가운데. 하나라도 무너지면 빨갛다.
 * ⚠ §2 [2-a] 는 **음성항**이다 — 2280 에서는 덮임이 **0** 이어야 한다. 이게 없으면 §2 는
 *    «탭바는 언제 덮여도 된다» 는 게이트가 된다(406 [7-f] 와 같은 짝).
 *
 * 본다:
 *   §1 기하 — 2280·1920·1600 의 블록·탭바·여백
 *   §2 «덮임은 결함이 아니다» 를 자로 (음성항 [2-a] 포함)
 *   §3 그 대가 — 스크롤·잘림·픽셀·나갈 길·띠 한가운데
 *   §R 되돌림 시험 — 351 1회차가 넣은 두 회수(아래 가드 clamp · shortf ✕ 재배치)를 각각 뗀
 *      **사본**에서 §3 이 실제로 무너진다. (살아 있는 페이지에 CSS 를 주입하면 거짓 초록 — LESSONS 191)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const r1 = (n) => Math.round(n * 10) / 10;

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

/* 갈아 끼울 자리 둘 — 못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방) */
const GUARD = '#blsw{padding-bottom:clamp(16px, calc(var(--frameh) - 1696px), 146px)}';
const GUARD_OFF = '#blsw{padding-bottom:146px}';
/* 826 이관 — ✕ 가 `#blsw`(프레임 좌표계) 밖 형제에서 `.bls`(그릇) 의 자식으로 옮겨졌다.
   짧은 프레임의 «코너로 올린다» 규칙은 그대로 살아 있고 좌표만 그릇 기준이다(그려지는 자리 Δ0px).
   이 줄을 떼면 ✕ 는 **긴 프레임 자리**(그릇 기준 left 422 / top 1440 = 스트립 아래 중앙)로 돌아가므로
   §R 이 묻는 것(«회수는 실재하는가»)은 한 글자도 안 바뀐다 — 1600 에서 여전히 프레임을 넘는다. */
const XMOVE = '#app.shortf .bls-x{left:848px;top:0}';
const XMOVE_OFF = '#app.shortf .bls-x{}';

const INK = 142;    /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차) */
const TABH = 180;   /* 앱 탭바 높이 (390) */
const BLS = 1157, GAP = 21, PROMO = 249;   /* 레퍼런스 절대값 — 측정표 34 */

async function measure(browser, file, H, opt) {
  opt = opt || {};
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const app = document.getElementById('app');
    const A = app.getBoundingClientRect();
    const q = (s) => document.querySelector(s);
    const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { t: r.top - A.top, b: r.bottom - A.top, l: r.left - A.left, w: r.width, h: r.height }; };
    const w = document.getElementById('blsw');
    const tb = box(document.getElementById('tabbar'));
    const shortf = app.classList.contains('shortf');
    /* 826 이관 — ✕ 가 `.bls` 안으로 들어가 `#blsw.children` 에서 빠졌다. 이 표는 «그려지는 조각» 을
       세는 자리(덮임 `coverAny` · 프레임 밖 `out`)라 ✕ 를 이름으로 다시 넣는다 —
       안 넣으면 [2-b]·[3-b] 가 ✕ 를 못 보고 **조용히 초록**이 된다(328 교훈). */
    const parts = [...w.children];
    const xEl = w.querySelector('.bls-x');
    if (xEl && !parts.includes(xEl)) parts.push(xEl);
    const kids = parts.map((e) => ({ c: (e.className || e.id || '?').toString().split(' ')[0], ...box(e) }));
    /* 826 이관 — ✕ 는 이제 `.bls` 의 자식이라 `#blsw` 의 흐름 자식은 어느 프레임에서든 «팝업 + 스트립» 둘뿐이다
       (수리 전에는 짧은 프레임에서만 ✕ 를 빼야 했다). 그래서 걸러 낼 것이 남지 않았다 — 남은 것을 «흐름» 으로 적는다. */
    const flow = kids.filter((k) => k.c !== 'bls-x');
    /* 2회차 비평 CN 의 반론 둘을 자로 — ① 상단 HUD 가 «살아 있는 터치 영역» 인가
       ② 2280 ✕ 가 있던 가로 대역(x471..609)의 하단이 1600 에서 조작 요소가 되는가 */
    const topHits = [...document.getElementById('top').querySelectorAll('*')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20; })
      .map((e) => { const r = e.getBoundingClientRect();
        const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!(h && h.closest && h.closest('#top')); });
    /* 423 이관 — 이 표본은 원래 «조작 요소가 아니다» 만 물었다. 423 이 짧은 프레임에서
       프로모 스트립을 «나가는 길» 로 만들면서 95% 표본이 `bls-promo` → `blsw`(딤 = 닫힘)로
       바뀌므로, 그 뜻을 잃지 않게 **닫힘인지**를 같이 적는다(328 교훈 — 누른 항을 묻는 항을
       한 줄 더 넣지 않으면 «423 이 통째로 사라져도 초록인 게이트» 가 된다). */
    const xBand = [0.25, 0.5, 0.75, 0.95].map((f) => {
      const y = A.top + A.height * f, x = A.left + 540;
      const h = document.elementFromPoint(x, y);
      return { f, el: h ? (h.id || String(h.className).split(' ')[0] || h.tagName) : null,
        act: !!(h && h.closest && h.closest('button,[onclick],.gb,.tab,.ibtn')),
        close: h === w || !!(h && h.closest && h.closest('#blsX')),
        inPromo: !!(h && h.closest && h.closest('.bls-promo')) };
    });
    /* 423 이관의 표본 — 프레임 높이가 달라 «95%» 는 두 프레임에서 다른 것을 가리킨다.
       그래서 비율이 아니라 **스트립 한복판**(x540 · 프로모 세로 중앙 = 버튼 밖)을 직접 잰다. */
    const pr = box(q('#blsw .bls-promo'));
    const ph = pr ? document.elementFromPoint(A.left + 540, A.top + pr.t + pr.h / 2) : null;
    const promoMid = { el: ph ? (ph.id || String(ph.className).split(' ')[0] || ph.tagName) : null,
      close: ph === w, inPromo: !!(ph && ph.closest && ph.closest('.bls-promo')) };
    const hits = [...document.querySelectorAll('.tab[data-t]')].map((t) => {
      const r = t.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { t: t.dataset.t, hit: h ? (h.id || String(h.className).split(' ')[0] || h.tagName) : null,
        isTab: !!(h && h.closest && h.closest('.tab[data-t]')) };
    });
    return {
      frameH: A.height, shortf, open: w.classList.contains('on'),
      inkEnd: q('.pedge') ? box(q('.pedge')).b : null,
      tabTop: tb.t, tabH: tb.h,
      bls: box(q('#blsw .bls')), promo: box(q('#blsw .bls-promo')), x: box(q('#blsw .bls-x')),
      note: box(q('#blsw .bls-note')), top: box(document.getElementById('top')),
      flowTop: Math.min(...flow.map((k) => k.t)), flowBot: Math.max(...flow.map((k) => k.b)),
      coverPromo: Math.max(0, box(q('#blsw .bls-promo')).b - tb.t),
      coverAny: Math.max(...kids.map((k) => Math.max(0, k.b - tb.t))),
      scrollH: w.scrollHeight, clientH: w.clientHeight,
      out: kids.filter((k) => k.b > A.height + 0.5 || k.t < -0.5).map((k) => k.c),
      hits, topHits, xBand, promoMid, errs: 0,
    };
  });
  m.errs = errs.length;

  if (opt.pixels && m.coverPromo > 0) {
    const R = 20;   /* `.bls-promo{border-radius:20px}` — 코너에서는 탭바가 그대로 비친다 */
    const clip = { x: Math.round(m.promo.l), y: Math.round(m.tabTop), width: Math.round(m.promo.w), height: Math.round(m.promo.b - m.tabTop) };
    const a = await page.screenshot({ clip });
    await page.evaluate(() => { document.getElementById('tabbar').style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    const b = await page.screenshot({ clip });
    await page.evaluate(() => { document.getElementById('tabbar').style.visibility = ''; });
    m.band = await page.evaluate(async ([da, db, w, h, r]) => {
      const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(da), load(db)]);
      const px = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, w, h).data; };
      const A = px(ia), B = px(ib);
      let n = 0, inner = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) { n++; if (x >= r && x < w - r && y < h - r) inner++; }
      }
      return { n, inner, total: w * h };
    }, ['data:image/png;base64,' + a.toString('base64'), 'data:image/png;base64,' + b.toString('base64'), clip.width, clip.height, R]);
  }

  if (opt.exits) {
    /* 나갈 길 둘 — 딤(프로모 바깥 왼쪽)과 ✕ */
    const pt = await page.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const pr = document.querySelector('#blsw .bls-promo').getBoundingClientRect();
      return { x: A.left + (pr.left - A.left) / 2, y: pr.top + pr.height / 2 };
    });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
    m.dimCloses = !(await page.evaluate(() => document.getElementById('blsw').classList.contains('on')));
    await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await page.click('#blsX', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(400);
    m.xCloses = !(await page.evaluate(() => document.getElementById('blsw').classList.contains('on')));
  }
  await ctx.close();
  return m;
}

(async () => {
  for (const [s, n] of [[GUARD, '#blsw 아래 가드 clamp'], [XMOVE, 'shortf ✕ 재배치']]) {
    if (!SRC.includes(s)) { console.error(`verify414: «${n}» 자리를 못 찾았다 — 갈아 끼울 앵커가 옮겨졌다. 갱신할 것.`); process.exit(2); }
  }
  const tmpG = path.join(os.tmpdir(), 'verify414-noguard.html');
  const tmpX = path.join(os.tmpdir(), 'verify414-nox.html');
  fs.writeFileSync(tmpG, SRC.replace(GUARD, GUARD_OFF));
  fs.writeFileSync(tmpX, SRC.replace(XMOVE, XMOVE_OFF));

  const browser = await launch(chromium);
  const M = {};
  for (const H of [2280, 1920, 1600]) M[H] = await measure(browser, FILE, H, { pixels: H === 1600, exits: H === 1600 });
  const RG = await measure(browser, tmpG, 1600);
  const RX = await measure(browser, tmpX, 1600);
  const RG2 = await measure(browser, tmpG, 2280);
  const RX2 = await measure(browser, tmpX, 2280);
  await browser.close();

  console.log('\n§1 기하 ───────────────────────────────────────────────────────');
  for (const H of [2280, 1920, 1600]) {
    const m = M[H];
    console.log(`  ${H} (shortf ${m.shortf}) │ 잉크 ${m.inkEnd} │ 탭바 ${r1(m.tabTop)} │ `
      + `블록 ${r1(m.flowTop)}..${r1(m.flowBot)} │ ✕ ${r1(m.x.t)}..${r1(m.x.b)} │ 덮임 promo ${r1(m.coverPromo)} · 최대 ${r1(m.coverAny)}`);
  }
  for (const H of [2280, 1920, 1600]) {
    const m = M[H];
    ok(m.open && m.inkEnd === INK && Math.round(m.tabH) === TABH,
      `[1-${H}] 팝업이 열리고 축이 제자리 — 잉크 ${m.inkEnd} · 탭바 높이 ${r1(m.tabH)}`);
    ok(Math.round(m.bls.h) === BLS && Math.round(m.promo.h) === PROMO && Math.round(m.promo.t - m.bls.b) === GAP,
      `[1-${H}] 레퍼런스 절대값 불변 — .bls ${r1(m.bls.h)} · 간격 ${r1(m.promo.t - m.bls.b)} · 스트립 ${r1(m.promo.h)}`);
  }
  ok(Math.round(M[1600].coverPromo) === 164,
    `[1-e] 등재문 값 재현 — 1600 에서 스트립이 탭바를 ${r1(M[1600].coverPromo)}px 덮는다 (기대 164)`);

  console.log('\n§2 «덮임» 은 결함이 아니다 ────────────────────────────────────');
  /* [2-a] 음성항 — 기준 프레임에서는 0 이어야 한다 */
  ok(Math.round(M[2280].coverAny) === 0,
    `[2-a] **음성항** — 2280 에서는 어떤 자식도 탭바를 안 덮는다 (${r1(M[2280].coverAny)}) ⇒ «언제나 덮여도 된다» 가 아니다`);
  ok(M[1920].coverAny > 0 && !M[1920].shortf,
    `[2-b] 1920(shortf 아님)도 덮는다 — ✕ ${r1(M[1920].coverAny)}px ⇒ 덮임은 1600 이 새로 만든 것이 아니다`);
  for (const H of [2280, 1600]) {
    ok(M[H].hits.length === 5 && M[H].hits.every((h) => !h.isTab),
      `[2-c ${H}] 탭 5칸 전부 포인터가 안 닿는다 (${M[H].hits.map((h) => h.t + ':' + h.hit).join(' · ')})`);
  }
  /* [2-e]·[2-f] — 2회차 비평(CN)의 반론 둘을 «닿나» 로 되물은 자리(406-① 의 방법 그대로) */
  for (const H of [2280, 1600]) {
    ok(M[H].topHits.length > 0 && M[H].topHits.every((t) => !t),
      `[2-e ${H}] 상단 HUD(#top · z6 < #blsw z41) 안 ${M[H].topHits.length}개 요소 전부 포인터가 안 닿는다 `
      + `⇒ ✕ 를 위로 빗맞혀도 재화 바를 못 친다 (두 해상도 같다)`);
  }
  ok(M[1600].xBand.every((b) => !b.act),
    `[2-f 1600] 2280 ✕ 가 있던 가로 대역(x540)의 세로 전 구간에 조작 요소가 없다 — `
    + `${M[1600].xBand.map((b) => Math.round(b.f * 100) + '%:' + b.el).join(' · ')} (마지막은 딤 = 닫힘)`);
  /* [2-f2] 423 이관 — 그 대역의 «아래쪽» 은 이제 «조작 요소가 아니다» 가 아니라 **«닫힘이다»** 다.
     423 이 짧은 프레임에서만 스트립을 딤에 넘겼으므로 1600 은 닫힘 · 2280 은 스트립 그대로여야 한다.
     두 프레임을 같이 물어야 «423 이 사라져도 초록» 이 안 된다(328 교훈). */
  const pm = (H) => M[H].promoMid;
  ok(pm(1600).close && !pm(1600).inPromo && pm(2280).inPromo && !pm(2280).close,
    `[2-f2] 423 이관 — 스트립 한복판(x540)이 1600 에서는 «닫힘»(${pm(1600).el}) 이고 2280 에서는 스트립 그대로다(${pm(2280).el}) `
    + `⇒ ✕ 가 비운 자리를 스트립이 짧은 프레임에서만 물려받았다 (게이트 tools/verify423.js)`);

  const band = M[1600].tabTop - INK, block = M[1600].flowBot - M[1600].flowTop;
  ok(Math.round(band) === 1278 && Math.round(block) === 1427,
    `[2-d] 기하가 없다 — 탭바 위 띠 ${r1(band)} < 블록 ${r1(block)} (${r1(block - band)}px 부족 = 레퍼런스의 ${r1((block - band) / BLS * 100)}%)`);

  console.log('\n§3 그 대가(406-④) ────────────────────────────────────────────');
  for (const H of [2280, 1920, 1600]) {
    ok(M[H].scrollH <= M[H].clientH,
      `[3-a ${H}] 스크롤 0 — 스크롤 안 해도 다 보인다 (scrollH ${M[H].scrollH} ≤ ${M[H].clientH})`);
    ok(M[H].out.length === 0 && M[H].errs === 0,
      `[3-b ${H}] 프레임 밖 자식 0 · 콘솔 에러 0 (밖 ${M[H].out.length}건 · err ${M[H].errs})`);
  }
  ok(M[1600].band && M[1600].band.inner === 0,
    `[3-c] 가려지는 글자 0 — 겹침 띠 ${M[1600].band ? M[1600].band.total : '?'}px 중 스트립이 덮은 안쪽에서 탭바를 숨겨도 `
    + `**${M[1600].band ? M[1600].band.inner : '?'}px** 바뀐다 (코너 포함 전체 ${M[1600].band ? M[1600].band.n : '?'}px)`);
  ok(M[1600].dimCloses && M[1600].xCloses,
    `[3-d] 나갈 길이 산다 — 딤 ${M[1600].dimCloses} · ✕ ${M[1600].xCloses} `
    + `(423 이 짧은 프레임에서 셋째 길 «프로모 스트립» 을 더했다 — 그 길은 [2-f2]·tools/verify423.js 가 잡는다)`);
  const gTop = M[1600].flowTop - INK, gBot = M[1600].frameH - M[1600].flowBot;
  ok(Math.abs(gTop - gBot) <= 2,
    `[3-e] 블록이 «쓸 수 있는 띠(142..1600)» 한가운데 — 위 ${r1(gTop)} ≈ 아래 ${r1(gBot)} (391 자)`);
  ok(gTop >= 0 && gBot >= 0,
    `[3-f] 위는 HUD 잉크를 안 물고 아래는 프레임을 안 넘는다 (위 ${r1(gTop)} ≥ 0 · 아래 ${r1(gBot)} ≥ 0)`);
  /* ✕ 는 shortf 에서 팝업 우상단 코너로 올라간다 — 그 자리는 위아래로 막힌 슬롯이다:
     위 = 살아 있는 상단 재화 바 `#top`(하변 104) · 아래 = 본문 안내문 `.bls-note`(상변 298).
     ⇒ 슬롯 194 안에 138 짜리 ✕ 를 넣으면 남는 것이 56 뿐이고, 지금은 30/26 으로 거의 한가운데다. */
  const X = M[1600].x, xUp = X.t - M[1600].top.b, xDn = M[1600].note.t - X.b;
  ok(xUp > 0 && xDn > 0 && Math.abs(xUp - xDn) <= 6,
    `[3-g] 1600 ✕ 가 «HUD 재화 바 ↔ 본문 안내문» 슬롯의 한가운데 — 위 ${r1(xUp)} ≈ 아래 ${r1(xDn)} `
    + `(슬롯 ${r1(M[1600].note.t - M[1600].top.b)} · ✕ ${r1(X.b - X.t)} ⇒ 남는 것은 ${r1(xUp + xDn)} 뿐)`);
  ok(X.t >= 126 && X.b <= M[1600].frameH,
    `[3-h] 1600 ✕ 가 HUD 가드(126) 아래이고 프레임 안 (${r1(X.t)}..${r1(X.b)} ⊂ 126..${M[1600].frameH}) — verify351 [1-g][1-h] 와 같은 축`);

  console.log('\n§R 되돌림 시험 ───────────────────────────────────────────────');
  ok(RG.scrollH > RG.clientH,
    `[R-a] 아래 가드를 고정 146 으로 되돌린 사본은 1600 에서 **스크롤이 생긴다** (scrollH ${RG.scrollH} > ${RG.clientH}) ⇒ [3-a] 는 공허하지 않다`);
  ok(RX.scrollH > RX.clientH && RX.x.t > RX.promo.b,
    `[R-b] shortf ✕ 재배치를 뗀 사본은 ✕ 가 긴 프레임 자리로 돌아와(${r1(RX.x.t)}..${r1(RX.x.b)} > 스트립 ${r1(RX.promo.b)}) `
    + `1600 에서 ${RX.scrollH - RX.clientH}px 넘친다 (scrollH ${RX.scrollH}) ⇒ 회수는 실재한다`);
  ok(Math.round(RG2.bls.t) === Math.round(M[2280].bls.t) && Math.round(RX2.bls.t) === Math.round(M[2280].bls.t)
     && Math.round(RG2.coverAny) === 0 && Math.round(RX2.coverAny) === 0,
    `[R-c] 두 회수 모두 **짧은 프레임 전용** — 2280 에서 사본과 현재가 같다 (bls top ${r1(RG2.bls.t)} · ${r1(RX2.bls.t)} = ${r1(M[2280].bls.t)})`);

  console.log(`\nVERIFY414 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
