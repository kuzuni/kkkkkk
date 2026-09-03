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
 * ⚑⚑ 정오표(작업 848, 2026-09-03) — **위 ⓔ 와 §1 [1-e]·§3 [3-e][3-f][3-g] 의 상수 넷은 등재 당시의
 *    앵커 모드에 매인 값이었고, 그 모드가 그 뒤 «두 번» 갈렸다.** `probe848` 이 세 걸음을 산수와 실측으로
 *    같이 세웠다(짧은 프레임 1600 · 블록 1427 은 세 걸음 내내 **불변** — 움직인 것은 크기가 아니라 앵커다):
 *      ① **하단 정렬**(754 이전 · 이 자가 굳힌 값) 상변 1600 − 16 − 1427 = **157** · 덮임 **164** · 위 15/아래 16
 *      ② **중앙**(754 7회차 — ① 을 «하단 정렬이라 결함» 이라고 못박고 되돌린 자리) 상변 **141.5** · 덮임 148.5
 *      ③ **상단 가드**(821 — .shortf 경계의 71.5px 계단을 없앤 자리) 상변 **126** · 덮임 **133** ← 지금
 *    ⇒ 넷은 서로 다른 결함이 아니라 **한 값(블록 상변)의 네 얼굴**이다(`probe848` [2-f]: 덮임의 차 31 =
 *      상변의 차 31). 그래서 여기서도 **따로 재겨누지 않고 «상변을 무엇에 못박는가» 한 자리로 모은다** —
 *      «띠 한가운데»(391 자)는 754·821 이 각자의 게이트(`verify754`·`verify821`)와 함께 폐기한 규약이므로
 *      그 자를 되살리면 **821 을 되돌리라는 뜻**이 된다. 자리는 비우지 않는다(333 처방).
 *    ⚠ [3-g] 만 뿌리가 다르다 — ✕ 는 826 이 `.bls` 의 자식으로 옮겨 **그릇과 함께 움직이므로**
 *      «프레임 슬롯의 한가운데» 라는 물음 자체가 사라졌다(상변이 어디든 ✕↔안내문 간격은 −5 로 고정 ·
 *      `probe848` [3-d]). 남은 뜻은 §3 자신의 규약 «**가려지는 글자 0**»([3-c])이라 거기에 맞춰 다시 겨눴고,
 *      실제로 가리는 글자가 **0px**(알약의 둥근 코너 채움 97px 뿐)임을 픽셀로 잰다.
 *
 * ⚠ 406-④ — «덮여도 된다» 만 적으면 그건 감점을 없애는 면죄부다. 그래서 §3 이 **대가를 받는다**:
 *    스크롤 0 · 잘림 0 · 가려지는 글자 0 · 나갈 길 둘 · 상변이 가드에 붙음. 하나라도 무너지면 빨갛다.
 * ⚠ §2 [2-a] 는 **음성항**이다 — 2280 에서는 덮임이 **0** 이어야 한다. 이게 없으면 §2 는
 *    «탭바는 언제 덮여도 된다» 는 게이트가 된다(406 [7-f] 와 같은 짝).
 *
 * 본다:
 *   §1 기하 — 2280·1920·1600 의 블록·탭바·여백
 *   §2 «덮임은 결함이 아니다» 를 자로 (음성항 [2-a] 포함)
 *   §3 그 대가 — 스크롤·잘림·픽셀·나갈 길·**상변을 가드에 못박음**(848 재겨눔)
 *   §R 되돌림 시험 — 회수·규약 네 자리를 각각 흔든 **사본**에서 §3 이 실제로 무너진다
 *      (아래 가드 clamp · shortf ✕ 재배치 · **821 상단 가드 붙임** · **✕ 를 글자 위로**).
 *      (살아 있는 페이지에 CSS 를 주입하면 거짓 초록 — LESSONS 191)
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
/* 848 이관 — [3-e] 가 묻는 규약(821: 짧은 프레임 상변을 가드에 붙인다)의 되돌림 시험 자리.
   이 줄을 떼면 상변이 754 의 «중앙»(141.5)으로 돌아가므로 [3-e] 가 빨개져야 한다. */
const APIN = '#app.shortf #blsw .bls{margin-top:0}';
const APIN_OFF = '#app.shortf #blsw .bls{}';
/* 848 이관 — 재겨눈 [3-g]«가리는 글자 0» 의 되돌림 시험 자리. ✕ 를 안내문 글자 위로 옮긴 사본에서는
   실제로 글자가 덮여야 한다. 안 덮이면 [3-g] 는 «잴 줄 모르는 자» 다(공허한 0).
   ⚠ 착수 중 실측 — **안내문을 위로 올리는 사본으로는 이 시험이 안 선다**: 글자는 900 폭 알약의
     한가운데(x≈528)에 있고 ✕ 는 x 897..1035 라 세로로 아무리 겹쳐도 **가로가 안 만난다**.
     그래서 흔드는 것은 안내문이 아니라 **✕ 자신**이다(물음의 주어가 ✕ 이므로 그쪽이 맞기도 하다). */
const XOVER_OFF = '#app.shortf .bls-x{left:400px;top:120px}';

const INK = 142;    /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차) */
const TABH = 180;   /* 앱 탭바 높이 (390) */
/* 848 — `#blsw{padding-top:126}` = 짧은 기기에서 HUD 를 파고들지 않게 막는 **가드**(값이 아니라 규약이다.
   index.html 15096 주석 · verify351 [1-g][1-h] 가 같은 126 을 쓴다). 821 이 .shortf 의 블록 상변을
   여기에 못박았으므로 이 자의 «상변» 물음은 전부 이 상수 하나로 모인다. */
const GUARD_TOP = 126;
const PB_SHORT = 16;   /* .shortf 아래 가드(351 ①) — 정오표 산수의 입력 */
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

  /* 848 — [3-g] 재겨눔의 자. ✕ 는 826 이후 `.bls` 의 자식이라 안내문과 bbox 가 5px 겹친다.
     물어야 할 것은 «상자가 겹치나» 가 아니라 §3 자신의 규약 «**가려지는 글자 0**» 이므로
     네 장(그대로 · ✕ 숨김 · ✕+글자 숨김 · ✕+알약 숨김)으로 «✕ 가 덮은 글자» 를 직접 센다.
     ⚠ 겹침 사각형이 아예 없으면 `has:false` 로 답한다 — 그때는 겹침 자체가 사라진 것이라
       [3-g] 가 «0» 을 조용히 통과시키지 않고 그 사실을 말한다(328 교훈). */
  if (opt.xink) {
    const clip = await page.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const x = document.querySelector('#blsw .bls-x').getBoundingClientRect();
      const n = document.querySelector('#blsw .bls-note').getBoundingClientRect();
      const l = Math.max(x.left, n.left), r = Math.min(x.right, n.right);
      const t = Math.max(x.top, n.top), b = Math.min(x.bottom, n.bottom);
      return { has: r > l && b > t, x: Math.round(l), y: Math.round(t),
        width: Math.max(1, Math.round(r - l)), height: Math.max(1, Math.round(b - t)),
        relX: Math.round(l - A.left), relY: Math.round(t - A.top) };
    });
    if (!clip.has) m.xink = { has: false };
    else {
      const shot = async () => (await page.screenshot({ clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } })).toString('base64');
      const a = await shot();
      await page.evaluate(() => { document.querySelector('#blsw .bls-x').style.visibility = 'hidden'; });
      await page.waitForTimeout(120);
      const b = await shot();
      const hasTxt = await page.evaluate(() => {
        const t = document.querySelector('#blsw .bls-note>i');
        if (!t) return false;
        t.style.visibility = 'hidden'; return true;
      });
      await page.waitForTimeout(120);
      const c = await shot();
      await page.evaluate(() => {
        const t = document.querySelector('#blsw .bls-note>i');
        if (t) t.style.visibility = '';
        document.querySelector('#blsw .bls-note').style.visibility = 'hidden';
      });
      await page.waitForTimeout(120);
      const d = await shot();
      const r = await page.evaluate(async ([da, db, dc, dd, w, h]) => {
        const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
        const [ia, ib, ic, id] = await Promise.all([load(da), load(db), load(dc), load(dd)]);
        const px = (im) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(im, 0, 0); return cv.getContext('2d').getImageData(0, 0, w, h).data; };
        const A = px(ia), B = px(ib), C = px(ic), D = px(id);
        const dif = (P, Q, i) => (P[i] !== Q[i] || P[i + 1] !== Q[i + 1] || P[i + 2] !== Q[i + 2]);
        let xInk = 0, overTxt = 0, overPill = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const cx = dif(A, B, i);
          if (cx) xInk++;
          if (cx && dif(B, C, i)) overTxt++;
          if (cx && dif(B, D, i)) overPill++;
        }
        return { xInk, overTxt, overPill };
      }, ['data:image/png;base64,' + a, 'data:image/png;base64,' + b, 'data:image/png;base64,' + c,
        'data:image/png;base64,' + d, clip.width, clip.height]);
      m.xink = { has: true, hasTxt, clip, ...r };
      /* 다음 절(나갈 길)이 같은 페이지를 쓰므로 되돌려 놓는다 */
      await page.evaluate(() => { document.querySelector('#blsw .bls-x').style.visibility = '';
        document.querySelector('#blsw .bls-note').style.visibility = ''; });
      await page.waitForTimeout(80);
    }
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
  for (const [s, n] of [[GUARD, '#blsw 아래 가드 clamp'], [XMOVE, 'shortf ✕ 재배치'],
    [APIN, 'shortf 상단 가드 붙임(821)']]) {
    if (!SRC.includes(s)) { console.error(`verify414: «${n}» 자리를 못 찾았다 — 갈아 끼울 앵커가 옮겨졌다. 갱신할 것.`); process.exit(2); }
  }
  const tmpG = path.join(os.tmpdir(), 'verify414-noguard.html');
  const tmpX = path.join(os.tmpdir(), 'verify414-nox.html');
  const tmpP = path.join(os.tmpdir(), 'verify414-nopin.html');
  const tmpN = path.join(os.tmpdir(), 'verify414-xover.html');
  fs.writeFileSync(tmpG, SRC.replace(GUARD, GUARD_OFF));
  fs.writeFileSync(tmpX, SRC.replace(XMOVE, XMOVE_OFF));
  fs.writeFileSync(tmpP, SRC.replace(APIN, APIN_OFF));
  fs.writeFileSync(tmpN, SRC.replace(XMOVE, XOVER_OFF));

  const browser = await launch(chromium);
  const M = {};
  for (const H of [2280, 1920, 1600]) M[H] = await measure(browser, FILE, H, { pixels: H === 1600, xink: H === 1600, exits: H === 1600 });
  const RG = await measure(browser, tmpG, 1600);
  const RX = await measure(browser, tmpX, 1600);
  const RP = await measure(browser, tmpP, 1600);
  const RN = await measure(browser, tmpN, 1600, { xink: true });
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
  /* 848 재겨눔 — 등재문의 «164» 는 ① 하단 정렬 시절의 값이다(위 정오표). 상수를 새 상수(133)로
     갈아 끼우면 앵커가 또 바뀔 때 똑같이 부패하므로, **입력을 각각 못박고 출력은 산수로 낸다**:
       덮임 = 상변(가드 126) + 블록(1427 — [2-d] 가 든다) − 탭바 상변(높이 180 — [1-*] 이 든다)
     그리고 «등재문이 본 것은 실재했다» 는 뜻은 **① 걸음의 산수**로 그대로 보존한다(≡ 164). */
  const cov = M[1600].coverPromo, blk1600 = M[1600].flowBot - M[1600].flowTop;
  const covAtBottomAlign = (M[1600].frameH - PB_SHORT - blk1600) + blk1600 - M[1600].tabTop;
  ok(cov > 0 && Math.round(cov) === Math.round(GUARD_TOP + blk1600 - M[1600].tabTop)
     && Math.round(covAtBottomAlign) === 164,
    `[1-e] 덮임은 실재하고 그 값은 «상변 + 블록 − 탭바» 산수 그대로다 — ${r1(cov)}px `
    + `(가드 ${GUARD_TOP} + 블록 ${r1(blk1600)} − 탭바 ${r1(M[1600].tabTop)}) `
    + `· 등재문의 164 는 ① 하단 정렬(상변 ${r1(M[1600].frameH - PB_SHORT - blk1600)}) 시절 값 = ${r1(covAtBottomAlign)} (정오표 · probe848 [2-e])`);

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
  /* 848 재겨눔 — «띠(142..1600) 한가운데»(391 자)는 754·821 이 폐기한 규약이라 그 자를 되살리면
     821 을 되돌리라는 뜻이 된다. 자리는 비우지 않고 **821 이 세운 규약 자체**를 묻는다:
     짧은 프레임에서 블록 상변은 «중앙» 이 아니라 **상단 가드 126 에 붙는다**(그래야 .shortf 경계의
     71.5px 계단이 0 이다 — `verify821` 과 같은 축). 대가(406-④)는 그대로 받는다: 아래로 안 넘친다. */
  const gTop = M[1600].flowTop - INK, gBot = M[1600].frameH - M[1600].flowBot;
  ok(Math.round(M[1600].flowTop) === GUARD_TOP,
    `[3-e] 블록 상변이 **상단 가드 ${GUARD_TOP}** 에 붙는다(821 규약 — 경계 계단 0) — ${r1(M[1600].flowTop)} `
    + `· 참고로 391 «띠 한가운데» 자로는 위 ${r1(gTop)} / 아래 ${r1(gBot)} (그 자는 754·821 이 폐기)`);
  /* [3-f] — 대가 두 줄. ① 아래로 안 넘친다(프레임 안) ② 가드는 **짧은 프레임 전용**이다:
     긴 프레임(1920)에서도 126 에 붙어 버리면 821 의 스코프가 샌 것이고 긴 프레임이 위로 쏠린다. */
  ok(gBot >= 0 && M[1920].flowTop > GUARD_TOP,
    `[3-f] 아래는 프레임을 안 넘고(여유 ${r1(gBot)} ≥ 0) 가드 붙임은 **짧은 프레임 전용**이다 `
    + `(1920 상변 ${r1(M[1920].flowTop)} > ${GUARD_TOP} ⇒ 821 스코프가 안 샜다)`);
  /* [3-g] 848 재겨눔 — 826 이 ✕ 를 `.bls` 의 자식으로 옮긴 뒤로 ✕ 는 그릇과 **함께** 움직인다.
     그래서 «프레임 슬롯(HUD 바 ↔ 안내문)의 한가운데» 라는 물음이 사라졌다 — 상변이 어디에 서든
     ✕ 하변(그릇 +146)과 안내문 상변(그릇 +141)의 차는 **−5 로 고정**이다(`probe848` [3-d]).
     ⇒ 남은 뜻은 §3 자신의 규약 «가려지는 글자 0»([3-c])이다. 셋을 같이 묻는다:
       ① 위로는 살아 있는 재화 바를 안 문다(>0) ② ✕ 가 가리는 **글자 0px**
       ③ bbox 겹침은 래칫 — 지금의 5px 보다 커지면 빨갛다(무르게 풀지 않는다). */
  const X = M[1600].x, xUp = X.t - M[1600].top.b, xDn = M[1600].note.t - X.b;
  const XI = M[1600].xink || {};
  ok(xUp > 0 && XI.has === true && XI.hasTxt === true && XI.overTxt === 0 && -xDn <= 5,
    `[3-g] 1600 ✕ 는 위로 재화 바를 안 물고(${r1(xUp)} > 0) 아래로 **가리는 글자 0px** `
    + `(겹친 ${XI.has ? XI.clip.width + '×' + XI.clip.height : '?'} 안에서 ✕ 잉크 ${XI.xInk} 중 글자 ${XI.overTxt} · 알약 코너 채움 ${XI.overPill}) `
    + `· bbox 겹침 래칫 ${r1(-xDn)} ≤ 5`);
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
  /* 848 신설 — 재겨눈 [3-e] 가 공허하지 않다는 증거. 821 한 줄을 뗀 사본은 754 의 «중앙» 으로
     돌아가므로 상변이 가드에서 떨어져야 하고([3-e] 가 빨개진다), 그때 덮임도 같이 움직여야 한다
     ([1-e] 의 산수가 같은 상변을 읽는다는 뜻). 둘을 한 항으로 묶어 «한 값의 두 얼굴» 을 유지한다. */
  ok(Math.round(RP.flowTop) !== GUARD_TOP && Math.round(RP.flowTop) === 142
     && Math.round(RP.coverPromo) === Math.round(RP.flowTop + (RP.flowBot - RP.flowTop) - RP.tabTop),
    `[R-d] 상단 가드 붙임(821)을 뗀 사본은 상변이 **${r1(RP.flowTop)}**(754 의 중앙)으로 돌아간다 `
    + `— 가드 ${GUARD_TOP} 에서 ${r1(RP.flowTop - GUARD_TOP)}px 떨어지고 덮임도 ${r1(M[1600].coverPromo)} → ${r1(RP.coverPromo)} `
    + `⇒ [3-e]·[1-e] 는 공허하지 않다`);
  /* 848 신설 — [3-g] 의 «가리는 글자 0» 이 **잴 줄 알아서 0** 이라는 증거.
     안내문을 60px 올린 사본에서는 ✕ 가 글자를 실제로 덮어야 하고, bbox 래칫도 같이 터져야 한다. */
  const RNI = RN.xink || {};
  ok(RNI.has === true && RNI.overTxt > 0,
    `[R-e] ✕ 를 안내문 글자 위로 옮긴 사본에서는 **글자가 ${RNI.overTxt}px 덮인다** `
    + `(✕ ${r1(RN.x.l)}..${r1(RN.x.l + 138)} × ${r1(RN.x.t)}..${r1(RN.x.b)}) ⇒ [3-g] 의 «가리는 글자 0» 은 잴 줄 알아서 나온 0 이다`);

  console.log(`\nVERIFY414 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
