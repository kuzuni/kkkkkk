#!/usr/bin/env node
/* 작업 418 — «그려진 잉크» 전 화면 스윕 (측정 전용 · 판정은 verify356.js [S3])
 *
 *   node tools/probe418.js                 # 전 화면 × DSF2 × 그려진 잉크
 *   node tools/probe418.js --dsf 3         # 배율을 올려 «수렴하는가» 를 본다(9회차 규칙)
 *   node tools/probe418.js --json
 *   node tools/probe418.js --revert        # 8·9회차가 놓은 정수 상자를 떼고 다시 잰다(되돌림)
 *   node tools/probe418.js --screen 70     # 화면 이름에 이 말이 든 것만
 *
 * ── 왜 «산수» 가 아니라 «찍힌 픽셀» 인가 ────────────────────────────────
 * 1회차에 스냅을 산수로 흉내 냈다(`round((x+w)·d) − round(x·d)`). 그 모형은 8회차의
 * 33 재화 정보는 잡았지만 **9회차의 70 출석은 못 잡았다** — 되돌림으로 소수 상자
 * 82.0781 @ x…​.4531 을 도로 심어도 산수는 164×164 로 «깨끗» 하다고 답했다.
 * 실제 크로미움은 상자 모서리를 반올림하는 게 아니라 LayoutUnit(1/64px) → 합성 레이어 →
 * SVG 래스터라이즈까지 여러 층을 지나며, 그 결과가 **잉크에서만** 1~2px 로 나타난다.
 * ⇒ 이 자는 등재문 그대로 **찍힌 픽셀**을 잰다. 산수(`scan418`)는 참고용 선별기로 남긴다.
 *
 * ── 어떻게 싸게 재는가 ──────────────────────────────────────────────────
 * 노드마다 두 장을 찍으면 900노드 × 2 = 1800장이라 못 돌린다. 그래서 화면마다 **두 장**만
 * 찍는다 — ① 그대로 ② 대상 노드 전부 `opacity:0`. 두 장의 차분을 **노드 상자별로 잘라** 읽으면
 * 노드마다 잉크 bbox 가 나온다(probe356r8·r9 의 «opacity 토글 차분» 을 전 화면으로 올린 것).
 * ⚠ 상자가 겹치는 노드는 이웃의 잉크가 차분에 끼어든다 — 그런 노드는 «겹침» 으로 표시하고
 *   **한 장씩 따로** 다시 잰다(그 수는 적다). 안 그러면 이웃 아이콘이 만든 유령을 쫓는다.
 * ⚠ 애니·타이머를 끄고 재는 것은 8회차 교훈이다(차분 두 장 사이에 다른 게 바뀌면 bbox 가 분다).
 *
 * ── 판정 ────────────────────────────────────────────────────────────────
 * 잉크 종횡 `w/h` 를 **원본 종횡비**와 견준다(`object-fit:contain` 이라 상자가 아니라 원본이 기준).
 * 편차 > 0.5%(= [S3] ④) 면 후보. **진짜 기하 ↔ 측정 바닥**은 DSF 를 올려 가른다 —
 * 편차가 0 으로 수렴하면 자의 바닥, 안 줄면 기하다(356 9회차).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL } = require('./scan356');
const { REVERT_CSS } = require('./scan418');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const REVERT = argv.includes('--revert');
const DSF = Number((argv[argv.indexOf('--dsf') + 1]) || 2) || 2;
const ONLY = argv.includes('--screen') ? argv[argv.indexOf('--screen') + 1] : null;
const TOL = Number(process.env.PROBE418_TOL || 0.005);
const PAD = 3;                    /* 잉크가 상자를 살짝 넘는 자리(그림자·획)를 위한 여유 */

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT = function () {
  const app = document.getElementById('app');
  if (!app) return [];
  function pathOf(el) {
    const out = []; let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s); e = e.parentElement;
    }
    return out.join('>');
  }
  function natural(el) {
    if (el.tagName === 'IMG') return el.naturalWidth && el.naturalHeight ? [el.naturalWidth, el.naturalHeight] : null;
    if (el.tagName === 'CANVAS') return el.width && el.height ? [el.width, el.height] : null;
    const vb = el.viewBox && el.viewBox.baseVal;
    if (vb && vb.width && vb.height) return [vb.width, vb.height];
    return null;
  }
  const out = [];
  let i = 0;
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const nat = natural(el);
    el.setAttribute('data-p418', String(i));
    out.push({ id: i++, sel: pathOf(el), cls: (el.getAttribute('class') || '').slice(0, 24),
      tag: el.tagName.toLowerCase(), fit: cs.objectFit, nat: nat ? nat[0] / nat[1] : null,
      src: el.tagName === 'IMG' ? (el.currentSrc || el.src || '') : '',
      x: r.left, y: r.top, w: r.width, h: r.height });
  }
  return out;
};

const SETOPA = (v) => { for (const e of document.querySelectorAll('[data-p418]')) e.style.opacity = v; };
const SETONE = ([id, v]) => { const e = document.querySelector(`[data-p418="${id}"]`); if (e) e.style.opacity = v; };

/* 차분 계산기 — 두 PNG 를 캔버스에 올리고 상자별 bbox 를 읽는다 */
const DIFF_MANY = async ([a, b, boxes, thr]) => {
  const load = async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
  };
  const A = await load(a), B = await load(b);
  const out = [];
  for (const bx of boxes) {
    const x0c = Math.max(0, Math.floor(bx[0])), y0c = Math.max(0, Math.floor(bx[1]));
    const x1c = Math.min(A.W - 1, Math.ceil(bx[2])), y1c = Math.min(A.H - 1, Math.ceil(bx[3]));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (let y = y0c; y <= y1c; y++) for (let x = x0c; x <= x1c; x++) {
      const i = (y * A.W + x) * 4;
      const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
      if (dd > thr) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    out.push(n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, n,
      edge: (x0 <= x0c) || (y0 <= y0c) || (x1 >= x1c) || (y1 >= y1c) } : null);
  }
  return out;
};

(async () => {
  const browser = await launch(chromium);
  const calc = await browser.newPage();
  await calc.setContent('<body></body>');

  const rows = [];
  const errs = [];
  for (const [label, steps] of SCREENS) {
    if (ONLY && !label.includes(ONLY)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
        await page.waitForTimeout(420);
      }
      if (REVERT) await page.addStyleTag({ content: REVERT_CSS });
      await page.waitForTimeout(350);
      /* 애니·타이머 정지 — 차분 두 장 사이에 다른 것이 바뀌면 bbox 가 분다(8회차 교훈) */
      await page.evaluate(() => {
        for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
        for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
        window.requestAnimationFrame = () => 0;
      });
      await page.waitForTimeout(200);

      const nodes = await page.evaluate(COLLECT);
      if (!nodes.length) { await ctx.close(); continue; }

      /* 겹치는 상자 표시 — 이웃 잉크가 차분에 끼어드는 자리 */
      const over = new Set();
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a.x < b.x + b.w + PAD * 2 && b.x < a.x + a.w + PAD * 2 &&
            a.y < b.y + b.h + PAD * 2 && b.y < a.y + a.h + PAD * 2) { over.add(a.id); over.add(b.id); }
      }

      const clipOf = (n) => [(n.x - PAD) * DSF, (n.y - PAD) * DSF, (n.x + n.w + PAD) * DSF, (n.y + n.h + PAD) * DSF];

      const on = (await page.screenshot()).toString('base64');
      await page.evaluate(SETOPA, '0');
      await page.waitForTimeout(150);
      const off = (await page.screenshot()).toString('base64');
      await page.evaluate(SETOPA, '');
      await page.waitForTimeout(120);

      const solo = nodes.filter((n) => !over.has(n.id));
      const got = solo.length ? await calc.evaluate(DIFF_MANY, [on, off, solo.map(clipOf), 12]) : [];
      solo.forEach((n, k) => { n.ink = got[k]; });

      /* 겹친 노드는 한 장씩 따로 — 자기만 끄고 두 장을 찍는다 */
      for (const n of nodes.filter((z) => over.has(z.id))) {
        const clip = { x: Math.max(0, Math.floor((n.x - PAD))), y: Math.max(0, Math.floor((n.y - PAD))),
          width: Math.ceil(n.w + PAD * 2), height: Math.ceil(n.h + PAD * 2) };
        const a = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '0']);
        await page.waitForTimeout(90);
        const b = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '']);
        await page.waitForTimeout(60);
        const d = await calc.evaluate(DIFF_MANY, [a, b, [[0, 0, 1e9, 1e9]], 12]);
        n.ink = d[0]; n.solo = true;
      }

      for (const n of nodes) rows.push(Object.assign({ screen: label }, n));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  const refBrowser = browser, refCalc = calc;

  /* ---------- 원본 비율 기준표 ----------
     ⚠ **기준은 viewBox 가 아니라 «그 그림의 잉크» 다**(1회차 오측 정정). `.cic` 의 SVG 는 viewBox 가
     64×64 정사각이어도 **속 그림은 정사각이 아니다** — 입장권은 94×53, 튜토 보상은 112×127 이다.
     viewBox 를 기준으로 삼으면 그 자리들이 전부 «+77% 찌그러짐» 으로 읽힌다(1회차에 그렇게 읽혔다).
     ⇒ 그림마다 **큰 정수 상자·정수 좌표**에 한 번 그려 잉크 종횡비를 재고, 그것을 기준으로 쓴다.
     그러면 남는 편차는 «상자·좌표·래스터가 만든 것» 뿐이다 = 이 작업이 찾는 것. */
  const srcs = [...new Set(rows.filter((r) => r.tag === 'img' && r.src).map((r) => r.src))];
  const REFBOX = 256, REFPAD = 32, REFCOL = 4;
  const refAsp = new Map();
  if (srcs.length) {
    const rp = await refBrowser.newPage({ viewport: { width: REFCOL * (REFBOX + REFPAD) + REFPAD,
      height: Math.ceil(srcs.length / REFCOL) * (REFBOX + REFPAD) + REFPAD }, deviceScaleFactor: 2 });
    await rp.goto(URL, { waitUntil: 'load' });          /* 같은 출처라야 file:// 이미지가 뜬다 */
    await rp.evaluate((L) => {
      document.documentElement.innerHTML = '<body style="margin:0;background:#fff"></body>';
      const [list, BOX, PAD, COL] = L;
      list.forEach((s, i) => {
        const im = document.createElement('img');
        im.src = s; im.setAttribute('data-ref', String(i));
        im.style.cssText = `position:absolute;object-fit:contain;width:${BOX}px;height:${BOX}px;` +
          `left:${PAD + (i % COL) * (BOX + PAD)}px;top:${PAD + Math.floor(i / COL) * (BOX + PAD)}px`;
        document.body.appendChild(im);
      });
    }, [srcs, REFBOX, REFPAD, REFCOL]);
    await rp.waitForTimeout(900);
    const boxes = srcs.map((s, i) => {
      const x = REFPAD + (i % REFCOL) * (REFBOX + REFPAD), y = REFPAD + Math.floor(i / REFCOL) * (REFBOX + REFPAD);
      return [(x - 4) * 2, (y - 4) * 2, (x + REFBOX + 4) * 2, (y + REFBOX + 4) * 2];
    });
    const ra = (await rp.screenshot()).toString('base64');
    await rp.evaluate(() => { for (const e of document.querySelectorAll('[data-ref]')) e.style.opacity = '0'; });
    await rp.waitForTimeout(150);
    const rbb = (await rp.screenshot()).toString('base64');
    const got = await refCalc.evaluate(DIFF_MANY, [ra, rbb, boxes, 12]);
    /* 기준은 «비율» 과 «상자를 얼마나 채우는가» 둘 다 남긴다 — 후자가 «가려짐» 판별자다 */
    srcs.forEach((s, i) => {
      if (got[i] && got[i].w >= 20 && got[i].h >= 20 && !got[i].edge) {
        refAsp.set(s, { asp: got[i].w / got[i].h, fw: got[i].w / (REFBOX * 2), fh: got[i].h / (REFBOX * 2) });
      }
    });
    await rp.close();
  }
  await refBrowser.close();

  /* ---------- 판정 ----------
     ⚠ 판정 스코프는 **원본 잉크 비율을 잴 수 있는 노드**뿐이다 — `img` + `object-fit` 이 «늘리지 않는»
     값(contain/scale-down/none). 캔버스는 «무엇을 그렸는지» 가 JS 안에 있어 원본 비율이 없다
     (70 출석의 `#porCv` 가 그 자리다 — 상자 88×92 에 사람 그림이라 잉크 168×180 이 정상이다).
     캔버스의 비균등 «변환» 은 `scan356` 이 이미 본다. */
  const JUDGE = new Set(['contain', 'scale-down']);
  const OCC = Number(process.env.PROBE418_OCC || 0.03);
  const measured = rows.filter((r) => r.ink && r.ink.w >= 6 && r.ink.h >= 6);
  for (const r of measured) {
    r.ref = r.tag === 'img' && refAsp.has(r.src) ? refAsp.get(r.src) : null;
    r.inScope = !!r.ref && JUDGE.has(r.fit);
    if (!r.inScope) continue;
    /* ⚠ **가려진 아이콘은 판정 밖이다.** 차분은 «바뀐 픽셀» 이라, 아이콘 위를 형제가 덮거나
       조상이 `overflow:hidden` 으로 자르면 bbox 가 그만큼 작아진다 — 그 자리는 비율이 아니라
       **가림**이 만든 값이다(1회차에 10 상점 알약이 «+140%» 로 읽힌 자리 · 실측 잉크 89×37).
       기준표에 «상자를 얼마나 채우는가»(fw·fh)를 같이 재 뒀으므로 예상 크기와 3% 넘게 어긋나면 뺀다.
       래스터가 만드는 결함은 **1px** 이라 이 문턱을 절대 못 넘는다(가장 큰 것도 1.3%). */
    const pw2 = r.ref.fw * r.w * DSF, ph2 = r.ref.fh * r.h * DSF;
    r.occ = Math.abs(r.ink.w / pw2 - 1) > OCC || Math.abs(r.ink.h / ph2 - 1) > OCC;
    r.judged = !r.occ;
    r.dev = (r.ink.w / r.ink.h) / r.ref.asp - 1;
  }
  const bad = measured.filter((r) => r.judged && Math.abs(r.dev) > TOL && !r.ink.edge);
  const clipped = measured.filter((r) => r.inScope && (r.ink.edge || r.occ));
  const outside = measured.filter((r) => !r.inScope);

  const byKey = new Map();
  for (const r of bad) {
    if (!byKey.has(r.sel)) byKey.set(r.sel, { sel: r.sel, cls: r.cls, cells: 0, screens: new Set(), worst: 0, sample: r });
    const g = byKey.get(r.sel);
    g.cells++; g.screens.add(r.screen);
    if (Math.abs(r.dev) > Math.abs(g.worst)) { g.worst = r.dev; g.sample = r; }
  }
  const list = [...byKey.values()].map((g) => ({
    sel: g.sel, cls: g.cls, cells: g.cells, screens: [...g.screens],
    dev: +(g.worst * 100).toFixed(2),
    ink: `${g.sample.ink.w}×${g.sample.ink.h}`,
    box: `${g.sample.w.toFixed(4)}×${g.sample.h.toFixed(4)}`,
    at: `${g.sample.x.toFixed(4)},${g.sample.y.toFixed(4)}`,
  })).sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));

  if (JSON_OUT) {
    console.log(JSON.stringify({ dsf: DSF, tol: TOL, revert: REVERT, measured: measured.length,
      judged: measured.length - outside.length, outside: outside.length,
      clipped: clipped.length, cells: bad.length, groups: list, errs }, null, 1));
  } else {
    console.log(`[probe418]${REVERT ? ' «되돌림»' : ''} DSF${DSF} · 잉크를 잰 노드 ${measured.length}개 ` +
      `(판정 ${measured.filter((r) => r.judged).length} · 원본비 없음 ${outside.length} · 가려짐·잘림 ${clipped.length}) · ` +
      `종횡 편차 >${(TOL * 100).toFixed(1)}% 인 칸 ${bad.length}개 → ${list.length}자리`);
    for (const g of list) {
      console.log(`  ${g.dev > 0 ? '+' : ''}${g.dev}%  ${g.sel}  «${g.cls}»  ${g.cells}칸 · 잉크 ${g.ink}`);
      console.log(`      상자 ${g.box} @ ${g.at} · 화면: ${g.screens.join(', ')}`);
    }
    if (errs.length) { console.log('\n[!] 화면 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
