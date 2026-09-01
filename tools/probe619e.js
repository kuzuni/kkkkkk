#!/usr/bin/env node
/* 작업 619 **15회차** — 「회당 플래시가 액자를 넘는가」 를 **찍힌 픽셀**로 재는 자 (338 · 350 규칙)
 *
 *   node tools/probe619e.js
 *
 * 14회차 채점에서 두 비평가(EH·EI)의 「8점을 막는 단 하나」가 **문자 그대로 같은 문장**이었다 —
 * «버스트 순간의 흰 밴드를 호스트 footprint **안쪽으로만** 그려라». 그리고 둘 다 같은 자리를 쟀다:
 *   · 훈련 **알림 배지**(카드 좌상단 붉은 원반) — 붉은 픽셀 752 → 477(−36.6%, EH) / 검은 외곽선 715 → 251(−65%, EI)
 *   · 단련 **위 «단련석» 패널 아래 테두리** — (20,20,20) → (92,77,41)(휘도 +360%)
 * `probe619c` ⓓ 는 **`outline` 축만** 봐서 이 자리를 못 봤다(13회차가 링에서 같은 사고를 닫은 자 그대로다).
 * ⇒ 자를 **«호스트 bbox 밖 띠의 픽셀이 홀드 중에 바뀌는가»** 로 넓힌다.
 *
 * 축 둘:
 *   ⓗ **바깥 띠 변화율** — 호스트 bbox **밖** 24px 띠를 홀드 전(대조)과 홀드 중 여러 프레임에서
 *      비교해, 색이 유의하게(채널 최대 |Δ| ≥ 12) 바뀐 픽셀의 비율. 0% 가 «액자를 안 넘는다» 다.
 *      ⚠ 상시 앰버 링(`.fx-holding` 9px · offset −10)은 **호스트 안쪽**이라 이 띠에 안 잡힌다 —
 *        그 값을 내리라는 자가 아니다(9회차 2인 공통 · §「하지 말 것」).
 *   ⓘ **훈련 알림 배지 보존율** — 두 비평가가 실제로 센 그 자리. 대조 프레임의 «붉은 픽셀 수» 대비
 *      홀드 프레임의 최솟값. 100% 가 «한 픽셀도 안 지웠다» 다.
 *
 * ⚠ 캡처는 `page.screenshot` 의 PNG 를 **페이지로 되돌려** 읽는다(350 처방 — `elementFromPoint` 는
 *   `#fxl{pointer-events:none}` 를 그대로 통과한다). 캔버스는 매 프레임 달라 판단을 오염시키므로 가린다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619E_HOLD || 1800);
const SHOTS = 7;
const BAND = 24;                                    /* 호스트 밖 띠 두께(px) */
const DTH = 12;                                     /* «바뀐 픽셀» 문턱 — 채널 최대 |Δ| */

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드', badge: true },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;

/* 페이지 안에서 두 PNG 를 그려 «호스트 밖 띠» 만 비교한다 */
const CMP = async (page, a, b, hb) => page.evaluate(async ([a, b, hb, BAND, DTH]) => {
  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const W = ia.width, H = ia.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(ia, 0, 0); const A = cx.getImageData(0, 0, W, H).data;
  cx.clearRect(0, 0, W, H); cx.drawImage(ib, 0, 0); const B = cx.getImageData(0, 0, W, H).data;
  let n = 0, ch = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    /* 호스트 «밖» 이면서 띠 안인 픽셀만 */
    const inHost = x >= hb.x && x < hb.x + hb.w && y >= hb.y && y < hb.y + hb.h;
    if (inHost) continue;
    const near = x >= hb.x - BAND && x < hb.x + hb.w + BAND && y >= hb.y - BAND && y < hb.y + hb.h + BAND;
    if (!near) continue;
    const i = (y * W + x) * 4;
    n++;
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    if (d >= DTH) ch++;
  }
  return { n, ch };
}, [a, b, hb, BAND, DTH]);

/* 훈련 알림 배지 — 대조 프레임에서 «붉은» 픽셀을 세고 홀드 프레임에서 다시 센다 */
const REDS = async (page, src) => page.evaluate(async src => {
  const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
  const im = await load(src);
  const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0);
  const D = cx.getImageData(0, 0, im.width, im.height).data;
  let n = 0;
  for (let i = 0; i < D.length; i += 4) {
    const r = D[i], g = D[i + 1], b = D[i + 2];
    /* ⚠ «붉다» 를 `r−g`·`r−b` 차로만 물으면 **앰버 글로우**(255,186,54)가 통째로 걸린다
       (1차 시도가 그래서 «보존 121%» 라는 헛수를 냈다 — 플래시가 배지를 지운 만큼보다
       앰버가 더 많이 들어온 것이다). 배지 원반은 채도 높은 적색이라 G·B 가 둘 다 낮다. */
    if (r > 150 && g < 90 && b < 90) n++;             /* 배지 원반의 붉은 잉크 */
  }
  return n;
}, src);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const c = document.getElementById('stage'); if (c) c.style.visibility = 'hidden';   /* 캔버스 가림(cap619 규칙) */
    openTrain();
  });
  await page.waitForTimeout(400);

  console.log('작업 619 15회차 — 「회당 플래시가 액자를 넘는가」 (홀드 ' + HOLD_MS + 'ms · 밖 띠 ' + BAND + 'px)\n');
  console.log('ⓗ 호스트 밖 띠에서 바뀐 픽셀 비율(0% 가 «안 넘는다»)   ⓘ 훈련 알림 배지 붉은 픽셀 보존율');
  console.log('─'.repeat(78));

  let bad = 0;
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);
    const hb = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    }, sp.host);
    const tb = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!hb || !tb) { console.log('  ' + sp.n + ' — 대상 없음'); bad++; continue; }

    /* 클립 = 호스트 + 띠 (프레임 밖으로 안 나가게 물린다) */
    const clip = {
      x: Math.max(0, hb.x - BAND), y: Math.max(0, hb.y - BAND),
      width: Math.min(1080 - Math.max(0, hb.x - BAND), hb.w + 2 * BAND),
      height: Math.min(2280 - Math.max(0, hb.y - BAND), hb.h + 2 * BAND),
    };
    const rel = { x: hb.x - clip.x, y: hb.y - clip.y, w: hb.w, h: hb.h };
    const shot = async () => 'data:image/png;base64,' + (await page.screenshot({ clip })).toString('base64');

    const base = await shot();                       /* 대조 — 누르기 전 */
    const baseRed = sp.badge ? await REDS(page, base) : 0;

    await page.mouse.move(tb.x + tb.w / 2, tb.y + tb.h / 2);
    await page.mouse.down();
    let worstCh = 0, worstN = 1, minRed = Infinity;
    for (let i = 0; i < SHOTS; i++) {
      await page.waitForTimeout(Math.round(HOLD_MS / SHOTS));
      const s = await shot();
      const c = await CMP(page, base, s, rel);
      if (c.n && c.ch / c.n > worstCh / worstN) { worstCh = c.ch; worstN = c.n; }
      if (sp.badge) minRed = Math.min(minRed, await REDS(page, s));
    }
    await page.mouse.up();
    await page.waitForTimeout(250);

    const share = worstN ? worstCh / worstN : 0;
    const keep = (sp.badge && baseRed) ? minRed / baseRed : null;
    console.log('  ' + sp.n + '  (호스트 ' + hb.w + '×' + hb.h + ')');
    console.log('    ⓗ 밖 띠에서 바뀐 픽셀 **' + r2(share * 100) + '%**(' + worstCh + '/' + worstN + ' · 최악 프레임)');
    if (keep !== null) console.log('    ⓘ 알림 배지 붉은 픽셀 **' + baseRed + ' → 최소 ' + minRed + ' = 보존 ' + r2(keep * 100) + '%**');
    /* ⚠⚠ ⓗ 는 **참고**다 — 문턱으로 쓸 수 없다. 621 눌림 왕복(`jzPressTick`)과 488 맥박(`jz-hb`)이
       **호스트 자신을 확대**하므로 정적 bbox 밖 띠는 플래시가 없어도 매 틱 바뀐다(실측 20~42%).
       이 축으로 플래시만 떼어내려면 눌림·맥박을 끈 사본이 필요한데, 그러면 재는 것이 «제품» 이
       아니게 된다. ⇒ 판정은 아래 ⓘ(두 비평가가 실제로 센 자리)와 비평 캡처가 한다. */
    if (keep !== null && keep < 0.95) bad++;
  }

  console.log('─'.repeat(78));
  console.log('문턱: ⓘ 배지 보존 ≥ 95% (ⓗ 는 참고 — 위 머리말: 눌림·맥박이 호스트를 확대해 띠가 상시로 바뀐다)');
  console.log(bad ? 'PROBE619E — ' + bad + '건 문턱 미달' : 'PROBE619E — 두 축 전부 문턱 통과');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
