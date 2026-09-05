#!/usr/bin/env node
/* 작업 432 회귀 게이트 — 89 유물 페이지 `.rw-panel` 세로 넘침(수반 글로우 상자)
 *   실행: node tools/verify432.js   → 마지막 줄이 `VERIFY432 n/n PASS` 여야 한다.
 *
 * 등재문: «`#relw>.rw-panel` 이 1600 에서 `overflow-y:hidden` 인 채 내용이 **60px** 넘쳐
 *          스크롤로도 못 닿는다 — 2280 은 0» · 뿌리 후보는 «100 이 넣은 `--rwc` 스케일의 바닥
 *          (패널만 줄고 안의 내용은 스케일 밖 상수)».
 *
 * ⚑ **재현이 그 가설을 기각했다**(338·341·368 규칙 — `tools/probe432.js`):
 *   ① `--rwc` 는 지원 범위에서 **항상 정확히 1** 이라 스케일은 아무것도 안 줄이고 있었다.
 *   ② 넘치는 것은 «내용» 이 아니라 **수반 난색 글로우 `.rw-mid::before` 한 상자**다
 *      (864×550 · `top:-104` · `.rw-mid` 는 `top:var(--rw-bt)`) ⇒ 하변 = `--rw-bt + 446`.
 *   ③ 그래서 넘침은 프레임 상수가 아니라 **`104 − --rw-g3`** 이다 —
 *      1600 **60** · 1700 60 · 1842 45 · 1920 **34.4** · 2280 0 · 2600 0
 *      («1600 전용» 이라는 등재문의 말도 틀렸다. 1842·1920 도 넘친다.)
 *   ④ 그리고 **잘리는 잉크는 0개**다. `overflow` 를 hidden ↔ visible 로 갈아 찍어 차분하면
 *      여섯 프레임 전부 **다른 픽셀 0개** — 잘린 것은 그라디언트의 **투명한 꼬리**뿐이다
 *      (ry 275 의 72% = 중심에서 198 ⇒ 잉크는 타일 y473 에서 끝나는데 1600 은 y490 에서 자른다).
 *
 * 처방은 그래서 «높이를 만들거나 내용을 줄이는» 것이 아니라 **1600 이 이미 하고 있던 자르기(490)를
 * 전 프레임의 상자 크기로 못박는 것**이다(제품 CSS 2줄 — `height` 550→490 · `background-size` 동결).
 *   ⚠ `background-size:864px 550px` 를 **먼저 얼려야** 한다. 안 얼리면 `closest-side` 의 ry 가
 *      상자 높이를 따라 275 → 245 로 줄어 **글로우가 실제로 작아진다**(= 그림이 바뀐다).
 *      얼린 뒤에는 상자 높이가 «타일을 어디서 자르는가» 만 정한다. 그 동결이 «장식» 이 아니라
 *      **하중을 받는 부품**임은 §R2 가 못박는다.
 *
 * ⚑ **789(2026-09-02) — 재는 «창» 을 패널 상변부터로 좁혔다(문턱·기대값은 한 칸도 안 건드렸다).**
 *   이 자는 상태마다 페이지를 **새로 띄워** 전 프레임 스크린샷을 차분한다(432-④ — 한 페이지에서
 *   스타일만 갈아 끼우면 캔버스·배너·토스트가 섞인다). 그런데 프레임 **0~108** 을 덮는
 *   41 팝업 내장 재화 바(`.pcb{top:-104px}` · `#relw{top:104px}`)의 **골드가 방치 전투로 흐른다** —
 *   두 로드의 진입 시각이 몇십 ms 만 어긋나도 자릿수가 갈리고, 그 잉크가 «클립이 지운 잉크»(§2)·
 *   «글로우가 그린 잉크»(§3·§R2)로 읽혔다(`probe789` [1]~[3] — 지문 bbox 57×35 · 최대Δ255).
 *   ⇒ 차분을 **`probe789.roi()`(패널 상변 ~ 프레임 바닥)** 안에서만 센다.
 *   ⚠ **아래는 한 픽셀도 안 자른다** — §2 가 묻는 «클립이 지우는 잉크» 는 정의상 패널 **밖**
 *      (하변 아래)이라 아래를 자르면 그 항이 «무조건 0» 이 되어 통째로 무의미해진다.
 *      창이 축을 통째로 담는다는 것은 §0 `[0-f]` 가, 좁혀서 감춘 게 아니라는 것은 §R2·`[0-d]` 가 못박는다.
 *
 * 본다:
 *   §0 [전제] — 표본이 실재한다(그릇은 hidden · 글로우는 그려진다 · `--rwc` 는 1 ·
 *              **같은 상태 두 로드가 창 안에서 정확히 같다**(A/A) · 창이 축을 통째로 담는다)
 *   §1 넘침 0 — D2 의 판정식 그대로, 여섯 프레임 전부 `scrollH ≤ clientH + 2`
 *   §2 그림 Δ0 — 클립이 지우는 잉크가 **0개**(hidden ↔ visible 차분)
 *   §3 글로우가 프레임과 무관하다 — 그려진 잉크 bbox 가 여섯 프레임에서 **같고** 패널 안에 있다
 *   §4 부품 보전 — 41 재화 바 3알약이 안 잘린다(100 게이트 ⑤) · 상자 규격이 선언대로다
 *   §R 되돌림 시험 — 옛 선언(550 · background-size 자동)으로 되돌리면 **다시 빨개진다**
 *   §R2 동결이 하중을 받는가 — 높이만 490 이고 `background-size` 를 풀면 **글로우가 작아진다**
 *
 * ⚑ **903(2026-09-05) — [R2-1600] 플레이키의 뿌리는 «부분 리라스터» 였다(제품 0줄 · 창·문턱 0칸).**
 *   재현(`tools/probe903.js`)이 «몇 번에 한 번» 부터 셌다: **20회 중 10회 빨강**(무변경 트리).
 *   흔들린 것은 글로우가 **아니다** — `glowInk.h` 는 20회 전부 **391**, `looseInk` 의 본체 띠도
 *   전부 `y1002~1346` 로 같았다. bbox 를 349 → 420 으로 늘린 것은 **바깥에서 섞여 든 한 띠**다:
 *       `y929~934`(53px · Δ19) + `y964`(1px) + `y977`(202px · Δ1) = **256px**
 *   그 자리는 배수 토글 바 **`.stabs.sp4`**(y896~984 · x248.7~829.3 — 700·701·713 부품)이고
 *   글로우 축과 아무 상관이 없다. 차분 문턱이 `d > 0`(1단위)이라 **한 띠가 bbox 를 71px 늘린다.**
 *   ⚠ **창을 글로우 상자로 좁혀도 안 낫는다** — `::before` 상자 상변이 **y929** 라 그 띠가
 *      상자 **안**이다(처방 후보를 실측으로 기각했다 — `probe903` [5], 8회 중 1회 여전히 빨강).
 *   ⚑ 뿌리: **Chromium 의 부분 리라스터(타일 재사용)**. 스타일 태그를 붙였다 떼면 레이어가
 *      더러워지는데, 그 띠의 타일이 **전체 재라스터되는지 부분 재사용되는지가 판마다 갈려**
 *      같은 화면이 ±1~19 단위로 두 얼굴을 갖는다. 태그를 한 번도 안 붙이면(`when.js` 실측)
 *      6.5초 동안 **한 픽셀도** 안 변한다 — 시간·애니메이션이 아니라 **라스터 세대**다.
 *   ⇒ 처방은 **`--disable-partial-raster` 한 줄**(아래 `launch`). 창도 문턱도 판정식도 한 칸도
 *      안 건드렸다. 켜고 6회 재현 — **빨강 0/6 · `looseInk.h` 전부 349 · 판 사이 차분 0**.
 *   ⇒ 그리고 그 결정성을 **[0-g] 가 이름을 대고 지킨다**(맨 끝에 A 를 한 장 더 찍어 첫 판과
 *      비교한다). 깃발이 빠지면 이 항이 **먼저** 빨개진다(무보정 실측 8/8 비영) — §2·§3·§R2 가
 *      «글로우가 흔들렸다» 는 거짓말을 하는 대신 여기서 멈춘다(789 의 A/A 를 **판 전체**로 늘린 것).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');
/* 재는 창은 재현 자(789)에 **한 번만** 적힌다 — 두 곳에 적으면 두 자가 서로 다른 것을 잰다(385) */
const { roi } = require('./probe789');

const FRAMES = [1600, 1700, 1842, 1920, 2280, 2600];
const OPENER = { label: 'tab:box', sel: '.tab[data-t="box"]' };

/* D2 의 판정식을 그대로 쓴다(`tools/probe351.js` 137행) — 게이트가 자기 문턱을 새로 정하면 안 된다 */
const D2_SLACK = 2;

const MEASURE = function () {
  /* ⚑ 859 이관 — 넘침을 담아 자르는 상자가 «패널» 에서 **«그릇(.rw-bowl)»** 으로 내려왔다.
     859 는 패널을 영역 그대로 두고 장면·내용만 ref 비례로 캡한 그릇에 넣었으므로, 패널의
     유일한 자식은 그 그릇이고 패널 자신은 절대 안 넘친다(scrollH = clientH). 432 가 재던
     «수반 글로우 상자가 구획 밖으로 넘친다» 는 그릇 안에서 그대로 일어난다. */
  const pn = document.querySelector('#relw>.rw-panel>.rw-bowl') || document.querySelector('#relw>.rw-panel');
  const mid = document.querySelector('#relw .rw-mid');
  if (!pn || !mid) return { err: 'no panel/mid' };
  const cs = getComputedStyle(pn), bs = getComputedStyle(mid, '::before');
  const pr = pn.getBoundingClientRect(), mr = mid.getBoundingClientRect();
  /* 커스텀 속성은 텍스트라 그대로 읽으면 안 풀린다 — 임시 자식에 먹여 «레이아웃이 푼 px» 을 읽는다 */
  const t = document.createElement('div');
  t.style.cssText = 'position:absolute;left:0;top:0;width:1px;visibility:hidden';
  pn.appendChild(t);
  const px = (k) => { t.style.height = `var(${k})`; return +t.getBoundingClientRect().height.toFixed(2); };
  const g3 = px('--rw-g3'), bt = px('--rw-bt');
  t.remove();
  const pcb = document.querySelector('#relw>.pcb');
  return {
    clientH: pn.clientHeight, scrollH: pn.scrollHeight,
    ovfY: pn.scrollHeight - pn.clientHeight,
    overflowY: cs.overflowY,
    panelTop: +pr.top.toFixed(1), panelBot: +pr.bottom.toFixed(1),
    midTop: +(mr.top - pr.top).toFixed(2),
    rwc: getComputedStyle(pn).getPropertyValue('--rwc').trim(),
    g3, bt,
    /* 789 — 재는 창이 글로우 상자를 담는지 물으려면 그 상자의 **프레임 절대 상변**이 필요하다.
       `::before` 는 rect 가 없으므로 계산값으로 센다(LESSONS 432-①). */
    glowTopAbs: +(mr.top + parseFloat(bs.top)).toFixed(1),
    glow: { top: bs.top, height: bs.height, width: bs.width, size: bs.backgroundSize, repeat: bs.backgroundRepeat, ptr: bs.pointerEvents },
    /* ⚠ `.pcb` 의 **자식 전부**를 세면 안 된다 — 429 가 같은 띠에 `[?]` 도움말(`.rl-help`)을
       얹으면서 자식이 4개가 됐다. 이 항이 지키려는 것은 «41 재화 **알약** 3개» 이므로
       부품 이름(`.pcb-p`)으로 집는다(형제가 늘어도 이 항의 뜻이 안 흔들린다). */
    pills: pcb ? [...pcb.querySelectorAll(':scope>.pcb-p')].map((c) => {
      const r = c.getBoundingClientRect();
      return { cls: String(c.className || ''), y1: Math.round(r.top), y2: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
    }) : [],
  };
};

/* 두 PNG 의 «다른 픽셀» 과 그 bbox — 차분이 곧 «그 층이 그린 잉크» 다.
   `r`(789 의 재는 창)를 주면 그 안만 센다 — **좌표는 페이지 절대값 그대로** 돌려주므로
   §3 의 «잉크 하변 ≤ 패널 하변» 같은 항이 창을 몰라도 된다. */
async function diffBox(dpage, a, b, r) {
  return dpage.evaluate(async ([x, y, rr]) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const A = px(ia), B = px(ib), W = ia.width, H = ia.height;
    const cx1 = rr ? Math.max(0, rr.x) : 0, cy1 = rr ? Math.max(0, rr.y) : 0;
    const cx2 = rr ? Math.min(W, rr.x + rr.width) : W, cy2 = rr ? Math.min(H, rr.y + rr.height) : H;
    let n = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, worst = 0;
    for (let yy = cy1; yy < cy2; yy++) {
      for (let xx = cx1; xx < cx2; xx++) {
        const i = (yy * W + xx) * 4;
        const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
        if (d > 0) {
          n++;
          if (xx < x1) x1 = xx; if (xx > x2) x2 = xx;
          if (yy < y1) y1 = yy; if (yy > y2) y2 = yy;
          if (d > worst) worst = d;
        }
      }
    }
    return n ? { n, x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, worst } : { n: 0, w: 0, h: 0, worst: 0, y1: -1, y2: -1 };
  }, [a.toString('base64'), b.toString('base64'), r || null]);
}

/* ⚑ 789 — **한 페이지에서 찍되, 찍기 전에 시간을 세운다.**
   원래 이 자는 «상태마다 새로 띄웠다»(432-④: 한 페이지에서 스타일만 갈아 끼우고 연달아 찍으면
   그 사이에 전투 캔버스·미션 배너·토스트가 움직여 차분에 섞인다). 그 처방은 **위상**을 지웠지만
   새로 띄우는 순간 **«그 판이 얼마나 굴렀는가» 라는 새 축**이 생긴다 — 위상은 리셋돼도
   **누적값(골드·알림 문턱)은 리셋되지 않는다**. 그것이 789 가 잡은 플레이키의 본체다
   (`probe789` [1]~[3] — 41 재화 바의 골드가 로드마다 갈린다).
   ⇒ 갈래를 **뒤집는다**: 한 페이지에서 찍되 **정착 뒤 시계를 끊어**(rAF·타이머 전부) 그 사이에
     아무것도 안 움직이게 한다. 그러면 네 판이 «우리가 넣은 CSS» 말고는 **바이트로 같은 화면**이라
     432-④ 가 걱정한 것도, 789 가 잡은 것도 동시에 사라진다. **그 증거가 `[0-e]` A/A 항**이다
     (같은 페이지에서 아무 것도 안 바꾸고 두 번 찍어 **정확히 0** 을 요구한다 — 얼지 않았으면 빨개진다).
   ⚠ 얼리기는 **`settle()` 뒤**에 해야 한다 — `settle()` 자신이 `requestAnimationFrame` 을 기다린다. */
const FREEZE = function () {
  window.requestAnimationFrame = function () { return 0; };
  const top = setTimeout(function () {}, 0);
  for (let i = 1; i <= top; i++) { clearTimeout(i); clearInterval(i); }
  clearTimeout(top);
};

/* 한 판 찍기 — `css` 를 넣고 찍은 뒤 **그 style 태그를 도로 뗀다**(다음 판이 깨끗하게 시작한다) */
async function shotCss(page, css) {
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  await page.waitForTimeout(120);            /* rAF 를 끊었으므로 드라이버 쪽 시계로 기다린다 */
  const b = await page.screenshot({ type: 'png' });
  if (tag) await tag.evaluate((n) => n.remove());
  return b;
}

async function openFrozen(browser, h) {
  const { ctx, page } = await fresh(browser, 1080, h);
  await drive(page, OPENER);
  await settle(page);
  await page.evaluate(FREEZE);
  await page.waitForTimeout(150);
  return { ctx, page, m: await page.evaluate(MEASURE) };
}

(async () => {
  /* ⚑ 903 — 부분 리라스터를 끈다. 이 자는 «같은 페이지에서 스타일만 갈아 끼운 판» 을 차분하므로
     타일 재사용이 살아 있으면 축과 무관한 띠가 판마다 두 얼굴을 갖는다(위 903 절 · [0-g] 가 지킨다). */
  const browser = await launch(chromium, { args: ['--disable-partial-raster'] });
  const rows = [];
  try {
    const dctx = await browser.newContext({ viewport: { width: 300, height: 300 } });
    const dpage = await dctx.newPage();
    for (const h of FRAMES) {
      const S = await openFrozen(browser, h);
      const A = { m: S.m, b: await shotCss(S.page, null) };                               /* 지금 판 */
      const A2 = { b: await shotCss(S.page, null) };                                      /* 789 — A/A 대조판 */
      const V = { b: await shotCss(S.page, '#relw>.rw-panel,#relw>.rw-panel>.rw-bowl{overflow:visible !important}') };
      const N = { b: await shotCss(S.page, '#relw .rw-mid::before{display:none !important}') };
      const L = { b: await shotCss(S.page, '#relw .rw-mid::before{background-size:auto !important}') };
      /* 903 — **끝 판**. 네 상태를 다 찍고 나서 처음 상태로 돌아와 한 장 더 찍는다(아래 [0-g]) */
      const Z = { b: await shotCss(S.page, null) };
      /* 789 — 재는 창(패널 상변 ~ 프레임 바닥). `.pcb`(프레임 0~108)는 이 축이 닿을 수 없는 띠다 */
      const R = roi(A.m, h);
      /* §0 [0-e] — A/B 를 묻기 전에 A/A 부터(432-④). 창 안이 0 이 아니면 아래 세 차분은 못 읽는다 */
      const aaInk = await diffBox(dpage, A.b, A2.b, R);
      /* 903 [0-g] — 판 다섯 장을 찍는 **내내** 얼어 있었는가(A/A 는 처음 두 장만 본다) */
      const zzInk = await diffBox(dpage, A.b, Z.b, R);
      /* §2 — 클립을 풀면 달라지는 픽셀이 있는가(= 클립이 지우는 잉크) */
      const clipInk = await diffBox(dpage, A.b, V.b, R);
      /* §3 — 글로우를 끄면 달라지는 픽셀 = 글로우가 그린 잉크 */
      const glowInk = await diffBox(dpage, A.b, N.b, R);
      /* §R2 — 높이만 490 이고 background-size 를 풀면 글로우가 작아지는가 */
      const looseInk = await diffBox(dpage, L.b, N.b, R);
      /* §R — 옛 선언으로 되돌린 판의 넘침(레이아웃 값이라 같은 페이지에서 재도 안전하다).
         ⚠ 789 — 시계를 끊었으므로 `requestAnimationFrame` 을 기다리면 **영영 안 온다**.
            `scrollHeight` 읽기 자체가 강제 동기 레이아웃이라 기다릴 것이 없다.
         ⚑ 875 — 875 가 top 을 g3 축에 묶어 넘침을 0 으로 만들었으므로 §R 도 top 을 되돌려야
            의미가 있다(안 그러면 이 자가 잰 «되돌림» 이 875 뒤 상태의 절반만 되돌린 것이 된다).
            432 이전 원본은 top:-104 · height:550 · background-size:auto 셋 다였다. */
      const rev = await S.page.evaluate(() => {
        const s = document.createElement('style');
        s.textContent = '#relw .rw-mid::before{top:-104px !important;height:550px !important;background-size:auto !important}';
        document.head.appendChild(s);
        const pn = document.querySelector('#relw>.rw-panel>.rw-bowl') || document.querySelector('#relw>.rw-panel');
        const v = { ovfY: pn.scrollHeight - pn.clientHeight };
        s.remove();
        return v;
      });
      rows.push({ h, m: A.m, R, aaInk, zzInk, clipInk, glowInk, rev, looseInk });
      await S.ctx.close();
    }
    await dctx.close();
  } finally { await browser.close(); }

  let pass = 0, fail = 0;
  const ok = (c, msg) => { if (c) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };
  const uniq = (a) => [...new Set(a)];

  console.log('\n§0 [전제] 표본이 실재한다 ────────────────────────────────────');
  ok(rows.every((r) => !r.m.err), `[0-a] 여섯 프레임 전부 89 유물 패널이 열린다 — ${rows.map((r) => r.h).join('·')}`);
  ok(rows.every((r) => r.m.overflowY === 'hidden'),
    `[0-b] 그릇이 정말 overflow-y:hidden 이다(아니면 이 축이 통째로 무의미) — ${uniq(rows.map((r) => r.m.overflowY)).join(',')}`);
  ok(rows.every((r) => Number(r.m.rwc) === 1),
    `[0-c] **등재문의 뿌리 후보 기각** — \`--rwc\` 는 지원 범위 전체에서 정확히 1 이다(스케일은 아무것도 안 줄인다): ${uniq(rows.map((r) => r.m.rwc)).join(',')}`);
  ok(rows.every((r) => r.glowInk.n > 0),
    `[0-d] 글로우가 실제로 그려진다 — 끄면 달라지는 픽셀 ${rows.map((r) => r.glowInk.n).join('·')}개 (0 이면 «없는 것을 지키는 게이트» 다)`);
  /* 789 — **A/B 대조 전에 A/A 대조**(432-④). 이 항이 빨가면 아래 §2·§3·§R2 는 «내 잉크» 가
     아니라 «그 사이에 흐른 무언가» 를 읽고 있는 것이다 — 그때 이 자는 조용히 흔들리는 대신
     **여기서 이름을 대고 멈춘다**(그것이 789 가 고친 결함이다). */
  ok(rows.every((r) => r.aaInk.n === 0),
    `[0-e] **A/A** — 아무것도 안 바꾸고 두 번 찍으면 창 안이 정확히 같다(= 화면이 정말 얼었다): ${rows.map((r) => `${r.h}:${r.aaInk.n}`).join(' · ')}` +
    (rows.some((r) => r.aaInk.n) ? ` ⚠ 비영 bbox ${rows.filter((r) => r.aaInk.n).map((r) => `${r.aaInk.w}×${r.aaInk.h}@y${r.aaInk.y1}`).join('·')}` : ''));
  /* 903 — A/A 는 **처음 두 장**만 본다. 정작 §R2 가 읽는 판(N·L)은 그 뒤에 찍히므로,
     그 사이에 라스터 세대가 갈리면 A/A 는 초록인 채로 §R2 만 조용히 흔들렸다(무보정 실측 8/8).
     ⇒ 마지막에 **처음 상태로 돌아와 한 장 더** 찍어 첫 판과 비교한다. `--disable-partial-raster`
        가 빠지면 이 항이 먼저, 이름을 대고 빨개진다. */
  ok(rows.every((r) => r.zzInk.n === 0),
    `[0-g] **판 전체가 얼어 있었다** — 다섯 판을 다 찍고 처음 상태로 돌아와 찍은 판이 첫 판과 정확히 같다: ${rows.map((r) => `${r.h}:${r.zzInk.n}`).join(' · ')}` +
    (rows.some((r) => r.zzInk.n) ? ` ⚠ 비영 bbox ${rows.filter((r) => r.zzInk.n).map((r) => `${r.zzInk.w}×${r.zzInk.h}@y${r.zzInk.y1}`).join('·')} — 부분 리라스터 의심(903)` : ''));
  ok(rows.every((r) => r.m.glowTopAbs >= r.R.y && r.R.y + r.R.height >= r.m.panelBot + 104),
    `[0-f] 그 창이 축을 **통째로** 담는다 — 글로우 상변 ${rows.map((r) => r.m.glowTopAbs).join('·')} ≥ 창 상변 ${rows.map((r) => r.R.y).join('·')} · 창 하변은 패널 하변 + 104(넘침 최댓값)보다 아래다`);

  console.log('\n§1 넘침 0 — D2 판정식 그대로 ─────────────────────────────────');
  for (const r of rows) {
    ok(r.m.scrollH <= r.m.clientH + D2_SLACK,
      `[1-${r.h}] ovfY ${r.m.ovfY} (scrollH ${r.m.scrollH} ≤ clientH ${r.m.clientH} + ${D2_SLACK})`);
  }
  ok(rows.every((r) => r.m.ovfY === 0), `[1-z] 여섯 프레임 전부 **정확히 0** — ${rows.map((r) => `${r.h}:${r.m.ovfY}`).join(' · ')}`);

  console.log('\n§2 그림 Δ0 — 클립이 지우는 잉크가 없다 ───────────────────────');
  for (const r of rows) {
    ok(r.clipInk.n === 0,
      `[2-${r.h}] overflow hidden ↔ visible 차분 **${r.clipInk.n}px**` + (r.clipInk.n ? ` (bbox ${r.clipInk.w}×${r.clipInk.h} · 최대Δ${r.clipInk.worst})` : ''));
  }

  console.log('\n§3 글로우 잉크는 프레임과 무관하다 ───────────────────────────');
  const gw = rows.map((r) => r.glowInk.w), gh = rows.map((r) => r.glowInk.h);
  const spread = (a) => Math.max(...a) - Math.min(...a);
  /* ⚠ 문턱 3 은 «알파가 0 으로 떨어지는 가장자리» 의 반올림 폭이다(실측 진폭 2px).
     이것을 «같다» 로 무르게 푼 것이 아님은 §R2 가 못박는다 — `background-size` 를 풀면
     같은 자가 **46px** 를 잡는다(395 → 349). 진짜 회귀는 이 문턱의 15배다.
     ── ⚑ 813 10회차 — **3 → 5.** 무르게 푼 것이 아니라 «재는 그림» 이 바뀌었다:
     이 자는 «글로우를 껐다 켠 차분» 을 재므로 **수반이 덮는 몫만큼 잉크가 줄어든다**.
     10회차가 1600 에서 안내문 쌍을 압축해 수반을 6px 내리자 그만큼이 더 덮여 1600 만
     393 → **391**(진폭 2 → 4)이 됐다. 글로우 자체는 한 픽셀도 안 바뀐다 —
     상자는 g3 와 무관하고(875 의 `bottom = 패널 하변` 항등식 · §1 넘침 0 이 매 실행 증명한다)
     타일도 얼려 둔 채다. 진짜 회귀(46px)와의 여유는 여전히 **9배**다. */
  ok(spread(gw) <= 5 && spread(gh) <= 5,
    `[3-a] 그려진 잉크 크기가 프레임을 **안 따라간다** — 폭 ${JSON.stringify(gw)}(진폭 ${spread(gw)}) · 높이 ${JSON.stringify(gh)}(진폭 ${spread(gh)})`);
  ok(Math.min(...gh) >= 388 && Math.max(...gh) <= 400,
    `[3-b] 그 높이가 타일 기하와 맞는다(ry 275 × 72% × 2 = 396) — 실측 ${Math.min(...gh)}~${Math.max(...gh)}px`);
  for (const r of rows) {
    ok(r.glowInk.y2 <= r.m.panelBot,
      `[3-${r.h}] 잉크 하변 ${r.glowInk.y2} ≤ 패널 하변 ${r.m.panelBot} (여유 ${+(r.m.panelBot - r.glowInk.y2).toFixed(1)}px)`);
  }

  console.log('\n§4 부품 보전 ────────────────────────────────────────────────');
  ok(rows.every((r) => r.m.pills.length === 3 && r.m.pills.every((p) => p.h > 30 && p.w > 100)),
    `[4-a] 41 재화 바 3알약이 그대로다(100 게이트 ⑤) — ${rows[0].m.pills.map((p) => `${p.cls.split(' ').pop()}${p.w}×${p.h}`).join(' · ')}`);
  ok(uniq(rows.map((r) => r.m.glow.height)).length === 1 && rows[0].m.glow.height === '490px',
    `[4-b] 글로우 상자 높이가 프레임 무관 **490px** 로 얼어 있다 — ${uniq(rows.map((r) => r.m.glow.height)).join(',')}`);
  ok(rows.every((r) => r.m.glow.size === '864px 550px'),
    `[4-c] \`background-size\` 가 **864px 550px** 로 얼어 있다(안 얼리면 ry 가 상자를 따라 줄어든다) — ${uniq(rows.map((r) => r.m.glow.size)).join(',')}`);
  ok(rows.every((r) => r.m.glow.ptr === 'none'),
    `[4-d] 글로우는 여전히 \`pointer-events:none\` 이다(조작을 막지 않는다)`);

  console.log('\n§R 되돌림 시험 — 옛 선언으로 되돌리면 다시 빨개진다 ──────────');
  /* ⚑ 875 — 옛 값(top:-104 · height:550) 복원 시 넘침 = mid_top + top + 550 − P
                                                    = (P − 326 − g3) − 104 + 550 − P = **120 − g3**.
     432 등재문의 «104 − g3» 는 866 이전(bt 식이 −216) 셈이라 늙었다 — 866 이 −216→−226 으로
     10px 을 더 뺐고, 858(맞은편 상수 226→266 라인) 다음에 실제 상수는 다시 226 이 됐다.
     지금 실측(g3=24)이 정확히 96 = 120 − 24 이라 새 식이 자와 맞는다. */
  for (const r of rows) {
    const want = Math.max(0, +(120 - r.m.g3).toFixed(2));   /* 넘침 = 120 − --rw-g3 (top:-104 · height:550 복원) */
    ok(Math.abs(r.rev.ovfY - want) <= 1,
      `[R-${r.h}] 옛 선언(top:-104 · h:550 · size auto) 복원 시 ovfY **${r.rev.ovfY}** ≈ 120 − g3(${r.m.g3}) = ${want}`);
  }
  ok(rows.some((r) => r.rev.ovfY >= 30),
    `[R-z] 그 중 실제로 큰 값이 있다(축이 죽지 않았다) — 최대 ${Math.max(...rows.map((r) => r.rev.ovfY))}px`);

  console.log('\n§R2 `background-size` 동결이 하중을 받는가 ───────────────────');
  for (const r of rows) {
    ok(r.looseInk.h > 0 && r.looseInk.h < r.glowInk.h - 20,
      `[R2-${r.h}] size 를 풀면 글로우가 **작아진다** — 잉크 높이 ${r.glowInk.h} → ${r.looseInk.h}px (동결이 «장식» 이 아니다)`);
  }

  console.log(`\nVERIFY432 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
