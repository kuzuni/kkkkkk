#!/usr/bin/env node
/* 작업 619 **18회차** — 「회당 플래시 상자가 호스트의 어디에 앉는가」 를 재는 자 (338 · 350 규칙)
 *
 *   node tools/probe619h.js
 *   P619H_SRC=/tmp/pin1.html node tools/probe619h.js     되돌림 사본으로 재기(§R)
 *
 * ## 왜 새 자가 필요했나
 * 17회차까지의 자 `probe619e` ⓗ(«호스트 밖 24px 띠에서 바뀐 픽셀 비율»)는 **문턱으로 못 쓴다** —
 * 621 눌림 왕복(`jzPressTick`)과 488 맥박(`jz-hb`)이 **호스트 자신을 확대**하므로 정적 bbox 밖 띠는
 * 플래시가 없어도 매 틱 바뀐다(그 자의 머리말이 스스로 «참고» 라고 적어 뒀다. 실측 20~42%).
 * 17회차 기록이 «넘침이 실제로 생기면 그때 **«액자선» 기준으로** 새 자를 세운다» 로 넘긴 자리다.
 *
 * ## 축 셋
 *   ⓙ **대상 액자선 잉크 보존율** — 호스트 rect 안쪽 `EDGE`px 테두리 띠의 **어두운 픽셀**(luma ≤ DARK)
 *      개수를, 대조(누르기 전) 대비 홀드 프레임 **최솟값**으로. 100% 가 «자기 액자를 한 픽셀도 안 잃었다».
 *   ⓚ **이웃 액자선 잉크 보존율** — **같은 프레임의 이웃 카드/행**에 같은 자를 댄다.
 *      16회차 EJ ⑤ 와 두 비평가가 실제로 쓴 판정법이다(«대상 카드만 자기 액자를 잃는다 —
 *      같은 프레임의 이웃 카드는 (20,20,20) 그대로»). ⓚ 가 같이 떨어지면 그 하락은 플래시 몫이 아니다.
 *   ⓛ **워시 상자가 호스트 «액자 링» 바로 안에 앉는가**(기하) — 17회차 두 비평가의
 *      「8점을 막는 단 하나」가 완전 일치한 그 자리다(EP «패딩 박스보다 좁게 그린다» ·
 *      EQ «세로 모서리가 라벨 글자 한가운데서 끝난다»).
 *      ⚑ **재 보니 «패딩 박스» 라는 것이 없었다** — 세 호스트는 `border`·`padding` 이 0/0/0/0 이고
 *        액자를 `box-shadow: rgb(20,20,20) 0 0 0 **8px inset**` 으로 그린다. 그래서 자의 기준을
 *        **«액자 링 안쪽 상자»**(호스트 rect 를 링 두께만큼 들인 상자)로 세웠다. Δ 는 네 변 각각
 *        «상자가 링보다 얼마나 더 안으로 들어갔는가» 이고 **0 이 정답**이다:
 *          음수 = 흰 테두리(9px)가 **액자선을 덮는다**(16회차 EJ ⑤ 가 잡은 손해) ·
 *          큰 양수 = 링을 지나 **라벨 글리프 위로** 들어간다(17회차 EP·EQ).
 *      ⚠ `getBoundingClientRect` 로 상자를 재면 안 된다 — `@keyframes fxFlash` 의 scale 이 섞여
 *        «봉우리에 걸린 프레임» 이냐 아니냐로 6% 흔들린다. 상자는 `style` 값(transform 전)으로 읽는다.
 *      ⚠ 호스트 rect 와 상자를 **서로 다른 순간에** 읽어도 안 된다(위상 잡음 −9.83 · −252px 를 찍었다).
 *        771 이 쓴 「두 프레임 연속 정적」 에서만 읽는다.
 *
 * ## 문턱
 *   ⓛ 네 변 전부 |Δ| ≤ TOL(1.5px, 세 자리 전부) — **이것이 18회차의 게이트다.**
 *   ⓙ·ⓚ 는 «대가» 를 적는 축이다. 문턱은 **ⓙ 가 ⓚ 보다 크게 떨어지지 않는가** 가 아니라
 *      (플래시는 대상만 밝히는 것이 일이라 대상이 더 떨어지는 것이 정상이다) **수치를 남기는 것**이
 *      목적이다 — 다음 회차가 «림을 만졌더니 어떻게 됐나» 를 이 표로 비교한다.
 *      단 ⓚ 가 85% 밑으로 떨어지면 **이웃 침범**이라 빨강이다(그건 대가가 아니라 결함이다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = process.env.P619H_SRC || path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;

const HOLD_MS = Number(process.env.P619H_HOLD || 1800);
const SHOTS = Number(process.env.P619H_SHOTS || 7);
const EDGE = Number(process.env.P619H_EDGE || 6);     /* 액자선 띠 두께(px) — 호스트 rect 안쪽 */
const DARK = Number(process.env.P619H_DARK || 60);    /* «액자선 잉크» 문턱 — luma */
const KEEP_NB = 0.85;                                 /* ⓚ 이웃 보존 하한 */
const TOL = Number(process.env.P619H_TOL || 1.5);     /* ⓛ 허용 어긋남(px) — 링 두께에서 벗어나는 양 */

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',
    host: '#trCards [data-tr]', hostN: 0, nb: '#trCards [data-tr]', nbN: 1, n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',
    host: '#trRunes .tr-rn',    hostN: 0, nb: '#trRunes .tr-rn',    nbN: 1, n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb',
    host: '#trTemper .tr-tp.k0', hostN: 0, nb: '#trTemper .tr-tp',  nbN: 1, n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;

/* PNG 를 페이지로 되돌려 읽는다(350 처방 — `elementFromPoint` 는 `#fxl{pointer-events:none}` 를 통과한다) */
const INK = async (page, src, boxes) => page.evaluate(async ([src, boxes, EDGE, DARK]) => {
  const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
  const im = await load(src);
  const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0);
  const D = cx.getImageData(0, 0, im.width, im.height).data;
  const W = im.width, H = im.height;
  return boxes.map(b => {
    let n = 0;
    for (let y = Math.max(0, b.y); y < Math.min(H, b.y + b.h); y++) {
      for (let x = Math.max(0, b.x); x < Math.min(W, b.x + b.w); x++) {
        /* 테두리 «띠» 안의 픽셀만 — 안쪽(내용)은 안 센다 */
        const inner = x >= b.x + EDGE && x < b.x + b.w - EDGE && y >= b.y + EDGE && y < b.y + b.h - EDGE;
        if (inner) continue;
        const i = (y * W + x) * 4;
        const l = 0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2];
        if (l <= DARK) n++;
      }
    }
    return n;
  });
}, [src, boxes, EDGE, DARK]);

/* ⓛ — 살아 있는 `.fx-flash` 의 **레이아웃 상자** ↔ 호스트 **«액자 링 안쪽» 상자** 네 변 Δ (0 = 링에 딱)
   ⚠ 호스트로 고르는 것은 «마지막 노드» 가 아니라 **`__fxHost` 가 그 호스트인 장**이다 —
     1차 시도가 룬에서 «상자 896×160»(= 다른 자리의 플래시)을 집어 −252 를 찍었다. */
const BOXΔ = async (page, hostSel, hostN) => page.evaluate(([s, k]) => new Promise(res => {
  const outer = document.querySelectorAll(s)[k]; if (!outer) return res(null);
  /* 619 9회차 — 룬 호스트는 `--flash-to`(자식 셀렉터)로 좁혀진다. 자도 같은 좁히기를 해야
     `__fxHost` 가 맞는다(1차 시도가 안 해서 룬만 «표본 0» 이 나왔다). */
  let host = outer;
  try { const q = getComputedStyle(outer).getPropertyValue('--flash-to').trim();
    if (q) { const c = outer.querySelector(q); if (c) host = c; } } catch (_) {}
  const L = document.getElementById('fxl'); if (!L) return res(null);
  const ringOf = el => {                                      /* 제품과 같은 읽기(`fxRingIn`) */
    let cs; try { cs = getComputedStyle(el); } catch (_) { return 0; }
    const sh = cs && cs.boxShadow; if (!sh || sh === 'none') return 0;
    for (const part of sh.split(/,(?![^(]*\))/)) {
      if (!/\binset\b/.test(part)) continue;
      const px = part.match(/-?\d*\.?\d+px/g);
      if (px && px.length >= 4) { const v = parseFloat(px[3]); if (isFinite(v) && v > 0) return v; }
    }
    return 0;
  };
  const R = () => { const b = host.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  /* ⚠⚠ **두 상자를 서로 다른 순간에 읽으면 안 된다.** 621 눌림(×0.982)·488 맥박이 호스트를 매
     프레임 흔들므로 상자는 «직전 rAF 의 rect» 로 쓰여 있고 rect 는 «지금» 이다 — 1차 시도가 그래서
     단련 −9.83 · 룬 −252 라는 **위상 잡음**을 찍었다. ⇒ 771 이 쓴 「두 프레임 연속 정적」 을 쓴다:
     rect 가 앞 프레임과 같을 때만 읽는다(그 순간엔 추적이 바로 그 rect 로 상자를 썼다). */
  let prev = null, n = 0;
  const step = () => {
    if (++n > 48) return res(null);
    const cur = R();
    const same = prev && Math.abs(prev.x - cur.x) < 0.05 && Math.abs(prev.y - cur.y) < 0.05 &&
      Math.abs(prev.w - cur.w) < 0.05 && Math.abs(prev.h - cur.h) < 0.05;
    prev = cur;
    if (!same) return requestAnimationFrame(step);
    const fl = Array.prototype.slice.call(L.children)
      .filter(nd => nd.classList && nd.classList.contains('fx-flash') && nd.__fxHost === host);
    const d = fl[fl.length - 1]; if (!d) return requestAnimationFrame(step);
    const bx = parseFloat(d.style.left), by = parseFloat(d.style.top);
    const bw = parseFloat(d.style.width), bh = parseFloat(d.style.height);
    if (!isFinite(bx) || !isFinite(bw)) return requestAnimationFrame(step);
    /* 호스트 rect 는 `fxRect` 와 같은 좌표계로 — 프레임 스케일 s 로 나눈다 */
    const f = (typeof fxSc === 'function') ? fxSc() : null; if (!f) return res(null);
    const r = { x: (cur.x - f.x) / f.s, y: (cur.y - f.y) / f.s, w: cur.w / f.s, h: cur.h / f.s };
    const ring = ringOf(host);
    /* «액자 링 안쪽 상자» — 흰 테두리가 여기에 앉으면 액자선을 안 덮고 글자에도 안 닿는다 */
    const g = { x: r.x + ring, y: r.y + ring, w: r.w - 2 * ring, h: r.h - 2 * ring };
    const rd = v => Math.round(v * 100) / 100;
    res({
      box: { w: rd(bw), h: rd(bh) }, ring: rd(ring),
      gate: { w: rd(g.w), h: rd(g.h) },
      left:   rd(bx - g.x),                                   /* + = 링보다 더 안으로(글자 쪽) */
      right:  rd((g.x + g.w) - (bx + bw)),
      top:    rd(by - g.y),
      bottom: rd((g.y + g.h) - (by + bh)),
    });
  };
  requestAnimationFrame(step);
}), [hostSel, hostN]);

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

  console.log('작업 619 18회차 — 「회당 플래시 상자가 호스트의 어디에 앉는가」 (홀드 ' + HOLD_MS + 'ms · 액자 띠 ' + EDGE + 'px · luma ≤ ' + DARK + ')');
  console.log('  자: ' + SRC);
  console.log('');
  console.log('ⓙ 대상 액자선 잉크 보존율   ⓚ 이웃(같은 프레임) 보존율   ⓛ 워시 상자 ↔ 호스트 «액자 링 안쪽» 네 변 Δ(0 = 링에 딱)');
  console.log('─'.repeat(96));

  let bad = 0;
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);

    const geo = await page.evaluate(([hs, hn, ns, nn, ts]) => {
      const pick = (s, k) => document.querySelectorAll(s)[k] || null;
      const R = e => { if (!e) return null; const b = e.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
      const t = document.querySelector(ts);
      return { host: R(pick(hs, hn)), nb: R(pick(ns, nn)),
        tgt: t ? (b => ({ x: b.x, y: b.y, w: b.width, h: b.height }))(t.getBoundingClientRect()) : null };
    }, [sp.host, sp.hostN, sp.nb, sp.nbN, sp.sel]);

    if (!geo.host || !geo.tgt) { console.log('  ' + sp.n + ' — 대상 없음'); bad++; continue; }
    if (!geo.nb) { console.log('  ' + sp.n + ' — 이웃 없음(ⓚ 생략)'); }

    /* 클립 = 대상 ∪ 이웃 (프레임 안으로 물린다) */
    const parts = [geo.host].concat(geo.nb ? [geo.nb] : []);
    const x0 = Math.max(0, Math.min.apply(null, parts.map(b => b.x)) - 2);
    const y0 = Math.max(0, Math.min.apply(null, parts.map(b => b.y)) - 2);
    const x1 = Math.min(1080, Math.max.apply(null, parts.map(b => b.x + b.w)) + 2);
    const y1 = Math.min(2280, Math.max.apply(null, parts.map(b => b.y + b.h)) + 2);
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const rel = b => ({ x: b.x - x0, y: b.y - y0, w: b.w, h: b.h });
    const boxes = [rel(geo.host)].concat(geo.nb ? [rel(geo.nb)] : []);
    const shot = async () => 'data:image/png;base64,' + (await page.screenshot({ clip })).toString('base64');

    const base = await shot();
    const b0 = await INK(page, base, boxes);

    await page.mouse.move(geo.tgt.x + geo.tgt.w / 2, geo.tgt.y + geo.tgt.h / 2);
    await page.mouse.down();

    let minH = Infinity, minN = Infinity, worst = null, seen = 0;
    for (let i = 0; i < SHOTS; i++) {
      await page.waitForTimeout(Math.round(HOLD_MS / SHOTS));
      const d = await BOXΔ(page, sp.host, sp.hostN);
      if (d) {
        seen++;
        /* 양쪽으로 벌어진다 — 음수(액자선을 덮는다)도 큰 양수(글자로 들어간다)도 벌점이다 */
        const m = Math.max(Math.abs(d.left), Math.abs(d.right), Math.abs(d.top), Math.abs(d.bottom));
        if (!worst || m > worst.dev) worst = Object.assign({ dev: m }, d);
      }
      const s = await shot();
      const k = await INK(page, s, boxes);
      minH = Math.min(minH, k[0]);
      if (k.length > 1) minN = Math.min(minN, k[1]);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);

    const keepH = b0[0] ? minH / b0[0] : 1;
    const keepN = (b0.length > 1 && b0[1]) ? minN / b0[1] : null;

    console.log('  ' + sp.n + '  (호스트 ' + geo.host.w + '×' + geo.host.h + ')');
    console.log('    ⓙ 대상 액자선 잉크 **' + b0[0] + ' → 최소 ' + minH + ' = 보존 ' + r2(keepH * 100) + '%**');
    if (keepN !== null) console.log('    ⓚ 이웃 액자선 잉크 ' + b0[1] + ' → 최소 ' + minN + ' = 보존 **' + r2(keepN * 100) + '%**');
    if (!worst) {
      console.log('    ⓛ ✗ **표본 0** — 홀드 ' + SHOTS + '장에서 `.fx-flash` 를 한 장도 못 잡았다(발화가 없거나 창이 어긋났다)');
      bad++;
    } else {
      const okL = worst.dev <= TOL;
      console.log('    ⓛ ' + (okL ? '✓' : '✗') + ' 상자 ' + worst.box.w + '×' + worst.box.h +
        ' vs 액자 링 안쪽 ' + worst.gate.w + '×' + worst.gate.h + ' (링 ' + worst.ring + 'px)' +
        ' — Δ 좌 ' + worst.left + ' · 우 ' + worst.right + ' · 상 ' + worst.top + ' · 하 ' + worst.bottom +
        ' (최악 |Δ| **' + r2(worst.dev) + '**, 표본 ' + seen + '/' + SHOTS + ')');
      if (!okL) {
        console.log('        ↳ 음수 = 흰 테두리가 **액자선(0~' + worst.ring + 'px)을 덮는다**(16회차 EJ ⑤) · ' +
          '큰 양수 = 링을 지나 **라벨 글리프 위로** 들어간다(17회차 EP·EQ)');
        bad++;
      }
    }
    if (keepN !== null && keepN < KEEP_NB) {
      console.log('    ↳ ✗ ⓚ 이웃이 ' + r2(keepN * 100) + '% 로 무너졌다(< ' + (KEEP_NB * 100) + '%) — 대가가 아니라 **이웃 침범**이다');
      bad++;
    }
  }

  console.log('─'.repeat(96));
  console.log('문턱: ⓛ 네 변 전부 |Δ| ≤ ' + TOL + 'px(= 상자가 액자 링 «바로 안» 에 앉는다 · 세 자리) · ⓚ 이웃 보존 ≥ ' + (KEEP_NB * 100) + '%   (ⓙ 는 «대가» 를 남기는 축 — 문턱 없음)');
  console.log(bad ? 'PROBE619H — ' + bad + '건 문턱 미달' : 'PROBE619H — 문턱 전부 통과');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
