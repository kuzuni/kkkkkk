#!/usr/bin/env node
/* 작업 356 10회차 — «전 화면 × DSF2 × 그려진 잉크» 스윕 (측정 전용 · 판정은 verify356.js)
 *
 *   node tools/scan356px.js                # 전 화면 순회 → 스냅으로 찌그러지는 아이콘 목록
 *   node tools/scan356px.js --json
 *   node tools/scan356px.js --screen '70'  # 화면 이름 부분일치로 스코프를 좁힌다
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * scan356.js 와 **무엇이 다른가**
 *
 *   scan356  : «선언» 을 본다 — 누적 transform·object-fit:fill 의 비균등. 지금 **0자리**다.
 *   scan356px: «찍히는 것» 을 본다 — 선언은 등방인데 **소수 상자가 소수 좌표에 앉아**
 *              페인트 스냅이 한 축만 1px 더 먹는 자리. 8·9회차가 33 재화 정보(1.10%)와
 *              70 출석(1.30%)에서 손으로 찾아낸 계열이고, **선언 스캐너에는 영원히 안 걸린다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 두 단계인가 — 9회차가 남긴 «다음은 스윕» 을 그대로 돌리면 너무 비싸다
 *
 *   9회차의 자(`probe356r9`)는 노드 하나마다 «불투명도 켠 장 ↔ 끈 장» 두 번을 찍어 차분한다.
 *   전 화면(42) × 아이콘 3천여 개 × DSF 4단이면 몇 시간이다. 그래서 이 자는
 *
 *     [1] 산술 예측 (전 노드 · 스크린샷 0장)
 *         스냅된 장치 픽셀 상자는 `round((x+w)·D) − round(x·D)` 다. 이 값이 두 축에서
 *         **CSS 종횡비를 안 지키면** 그 노드는 스냅으로 찌그러진다. 이것은 **필요조건**이고
 *         공짜다 — 소수 상자·소수 좌표가 아니면 애초에 후보가 아니다.
 *     [2] 잉크 확인 (후보만 · DSF 2·3·4)
 *         후보에만 9회차의 차분 자를 대어 **찍힌 픽셀**로 확인하고, 배율을 올려
 *         **수렴하는지** 본다(9회차 판정: 안 줄면 기하 · 줄면 측정 바닥).
 *
 *   ⚠ [1] 은 필요조건일 뿐 충분조건이 아니다 — 그래서 [1] 의 목록을 결과로 쓰지 마라.
 *     `--json` 의 `confirmed` 만이 결함이고 `candidates` 는 «봐야 할 자리» 다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚑ 스코프가 **이모지를 뺀 것**은 게으름이 아니라 기전이다 (10회차가 실측으로 정했다)
 *
 *   이 계열의 기전은 «상자를 장치 픽셀 격자에 스냅하면서 대체 콘텐츠를 그 상자에 늘려 넣는 것» 이다.
 *   그래서 **상자에 채워지는 것**(IMG·CANVAS·SVG)에만 붙는다. 이모지 글리프는 상자가 아니라
 *   **글리프 래스터라이저**가 서브픽셀 자리에 직접 그리므로 상자의 소수 1px 이 글리프를 못 늘린다.
 *   실제로 8·9회차가 찾아낸 두 자리도 **둘 다 `img.cic`** 였다.
 *
 *   ⚠ 첫 판에 이모지를 넣었다가 **거짓 양성 4건**을 봤다(70 출석 👑·💀·💬·🔒 가 −15~−40%).
 *     그것은 스냅이 아니라 «글리프 잉크의 종횡비 ≠ 상자의 종횡비» 라는 당연한 사실이다 —
 *     💀 는 상자가 가로로 길어도 글리프는 세로로 길다. **이모지의 «원본 비율» 을 알려면
 *     같은 글리프를 큰 크기로 따로 그려 봐야 하고, 그것은 이 자의 축이 아니다.**
 *     (이모지 아이콘의 비균등은 transform 축이고 그건 `scan356` 이 이미 0자리로 잡고 있다.)
 *
 * ⚠ 9회차 교훈 두 개를 그대로 지킨다:
 *   · 차분 두 장 사이에 다른 것이 바뀌면 bbox 가 부푼다 → 애니를 끝내고 타이머를 끈다.
 *   · 여백(PAD)이 넓으면 이웃 칸을 차분에 끌어들인다 → 8px.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { SCREENS, URL } = require('./scan356');
const { chromium } = pw();

const JSON_OUT = process.argv.includes('--json');
const SCREEN_Q = (() => { const i = process.argv.indexOf('--screen'); return i > 0 ? process.argv[i + 1] : null; })();
const TOL = Number(process.env.SCAN356PX_TOL || 0.005);   /* 스냅 종횡 왜곡 허용치 (0.5%) */
const MINPX = 8;                                          /* 이보다 작은 아이콘은 안 센다 */

/* ---------- [1] 산술 예측 — 페이지 안에서 돈다 ---------- */
const PREDICT = function (opt) {
  const PIC = /\p{Extended_Pictographic}/u;
  const app = document.getElementById('app');
  if (!app) return [];

  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s;
  }
  function isMedia(el) {
    const t = el.tagName;
    return t === 'IMG' || t === 'CANVAS' || t === 'svg' || t === 'SVG';
  }
  /* scan356 과 **같은** 아이콘 판정을 쓰되, 스냅 기전이 닿는 «대체 콘텐츠» 만 남긴다.
     이모지를 왜 빼는지는 파일 머리말 «스코프가 이모지를 뺀 것» 절에 실측과 함께 적었다. */
  function iconKind(el) {
    if (isMedia(el)) return 'media';
    const raw = ownText(el).replace(/[\s‍️︎]/g, '');
    if (raw) { for (const ch of raw) if (!PIC.test(ch)) return null; return null; /* emoji — 스코프 밖 */ }
    return null;
  }
  function pathOf(el) {
    const out = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  }
  /* 같은 선택자가 여러 개면 몇 번째인지 알아야 [2] 가 그 노드를 다시 집는다 */
  function nthOf(el, sel) {
    const all = [...document.querySelectorAll(sel)];
    return all.indexOf(el);
  }

  const D = opt.dsf;
  const out = [];
  for (const el of app.querySelectorAll('*')) {
    const kind = iconKind(el);
    if (!kind) continue;
    const r = el.getBoundingClientRect();
    if (r.width < opt.minpx || r.height < opt.minpx) continue;

    /* 스냅된 장치 픽셀 상자 */
    const dw = Math.round((r.x + r.width) * D) - Math.round(r.x * D);
    const dh = Math.round((r.y + r.height) * D) - Math.round(r.y * D);
    if (!dw || !dh) continue;

    /* 스냅이 **새로 만든** 왜곡만 센다 — CSS 상자가 이미 비정사각인 것은 356 의 대상이 아니다
       (그건 선언이고 scan356 이 본다). 그래서 «찍힌 종횡 ÷ CSS 종횡» 이 자다. */
    const distort = (dw / dh) / (r.width / r.height);

    /* **기대 잉크 종횡비** — [2] 가 «찍힌 것» 을 견줄 상대. 이것을 못 정하는 노드는
       ink 판정을 안 한다(자가 없는데 점수를 매기면 그게 헛초록·헛빨강이다). */
    let exp = null, expWhy = '';
    if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight) {
      const fit = getComputedStyle(el).objectFit;
      if (fit === 'contain' || fit === 'scale-down') { exp = el.naturalWidth / el.naturalHeight; expWhy = `원본 ${el.naturalWidth}×${el.naturalHeight}`; }
      else { exp = r.width / r.height; expWhy = `object-fit:${fit} → 상자`; }
    } else if (el.tagName === 'CANVAS' && el.width && el.height) {
      /* 캔버스는 그린 내용이 비트맵의 어디를 쓰는지 모른다 — 잉크 기대치를 못 세운다.
         대신 «비트맵 → 상자» 배율이 등방인지는 선언으로 볼 수 있어 그것만 남긴다. */
      expWhy = `비트맵 ${el.width}×${el.height} · 배율 ${(r.width / el.width).toFixed(4)}×${(r.height / el.height).toFixed(4)}`;
    }

    out.push({
      kind, tag: el.tagName, sel: pathOf(el), nth: nthOf(el, pathOf(el)),
      txt: (ownText(el).trim() || el.getAttribute('class') || '').slice(0, 14),
      w: +r.width.toFixed(4), h: +r.height.toFixed(4),
      x: +r.x.toFixed(4), y: +r.y.toFixed(4),
      dw, dh, distort: +distort.toFixed(5),
      exp: exp === null ? null : +exp.toFixed(5), expWhy,
      frac: (Math.abs(r.width - Math.round(r.width)) > 1e-4 || Math.abs(r.height - Math.round(r.height)) > 1e-4),
    });
  }
  return out;
};

/* ---------- [2] 잉크 확인 — 9회차 probe356r9 의 차분 자 ---------- */
const OPA = ([sel, i, v]) => { const e = document.querySelectorAll(sel)[i]; if (e) e.style.opacity = v; };
const RECT = ([sel, i]) => {
  const e = document.querySelectorAll(sel)[i]; if (!e) return null;
  const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const DIFF = async ([a, b]) => {
  const load = async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
  };
  const A = await load(a), B = await load(b);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
    const i = (y * A.W + x) * 4;
    const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
    if (dd > 12) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
};

const QUIET = () => {
  for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
  for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
  window.requestAnimationFrame = () => 0;
};

async function openScreen(page, steps) {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const miss = [];
  for (const s of steps) {
    const found = await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, s);
    if (!found) miss.push(s);
    await page.waitForTimeout(420);
  }
  await page.waitForTimeout(250);
  return miss;
}

(async () => {
  const browser = await launch(chromium);
  const calc = await browser.newPage(); await calc.setContent('<body></body>');

  const screens = SCREENS.filter(([lab]) => !SCREEN_Q || lab.includes(SCREEN_Q));
  const errs = [];
  const candidates = [];
  let scanned = 0;

  /* ── [1] 전 화면 산술 예측 (DSF2) ── */
  for (const [label, steps] of screens) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    try {
      const miss = await openScreen(page, steps);
      for (const m of miss) errs.push(`${label}: 무음 실패 — '${m}' 가 DOM 에 없다`);
      await page.evaluate(QUIET);
      const got = await page.evaluate(PREDICT, { dsf: 2, minpx: MINPX });
      scanned += got.length;
      for (const g of got) if (Math.abs(g.distort - 1) > TOL) candidates.push(Object.assign({ screen: label }, g));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }

  /* 같은 자리가 화면마다 반복되므로 «선택자 + 왜곡» 으로 접는다 (scan356 과 같은 접기) */
  const byKey = new Map();
  for (const c of candidates) {
    const k = c.sel + '|' + c.distort;
    if (!byKey.has(k)) byKey.set(k, Object.assign({}, c, { screens: new Set(), n: 0 }));
    const g = byKey.get(k); g.screens.add(c.screen); g.n++;
  }
  const groups = [...byKey.values()]
    .map((g) => { g.screens = [...g.screens]; return g; })
    .sort((a, b) => Math.abs(b.distort - 1) - Math.abs(a.distort - 1));

  /* ── [2] 후보만 잉크로 확인 · DSF 2·3·4 수렴 판정 ── */
  const confirmed = [];
  const noRuler = [];
  for (const g of groups) {
    /* 기대 종횡비가 없으면 **판정하지 않는다** — 자가 없는 자리에 점수를 매기면 헛초록이 된다.
       (캔버스가 여기 온다. 그 자리는 `expWhy` 의 «비트맵 → 상자 배율» 로 눈에 보이게만 남긴다.) */
    if (g.exp === null) { g.verdict = '자 없음(캔버스 — 잉크 기대치 없음)'; noRuler.push(g); continue; }
    const steps = (SCREENS.find(([l]) => l === g.screens[0]) || [null, []])[1];
    const ink = {};
    for (const dsf of [2, 3, 4]) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: dsf });
      const page = await ctx.newPage();
      try {
        await openScreen(page, steps);
        await page.evaluate(QUIET);
        const r = await page.evaluate(RECT, [g.sel, g.nth]);
        if (!r) { ink['DSF' + dsf] = null; await ctx.close(); continue; }
        const PAD = 8;                                   /* 9회차 교훈 — 넓으면 이웃 칸을 끌어들인다 */
        const clip = {
          x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
          width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2),
        };
        await page.waitForTimeout(120);
        const on = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(OPA, [g.sel, g.nth, '0']);
        await page.waitForTimeout(120);
        const off = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(OPA, [g.sel, g.nth, '']);
        const d = await calc.evaluate(DIFF, [on, off]);
        /* 찍힌 잉크 종횡 ÷ **기대 종횡**(원본 비율 또는 상자) — 주인 지시의 «원본 비율» 이 곧 이 자다 */
        ink['DSF' + dsf] = d ? { w: d.w, h: d.h, dev: +(((d.w / d.h) / g.exp - 1) * 100).toFixed(2) } : null;
      } catch (e) {
        ink['DSF' + dsf] = null;
      }
      await ctx.close();
    }
    /* 9회차 판정 — 배율을 올려도 **안 줄면 기하**, 0 으로 수렴하면 측정 바닥 */
    const devs = [2, 3, 4].map((d) => (ink['DSF' + d] ? Math.abs(ink['DSF' + d].dev) : null)).filter((v) => v !== null);
    const verdict = devs.length < 2 ? '측정 실패'
      : (devs[devs.length - 1] > 0.5 && devs[devs.length - 1] > devs[0] * 0.5) ? '기하(진짜)'
      : '측정 바닥(기각)';
    g.ink = ink; g.verdict = verdict;
    if (verdict === '기하(진짜)') confirmed.push(g);
  }

  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, scanned, screens: screens.length, candidates: groups, confirmed, noRuler, errs }, null, 1));
  } else {
    console.log(`[scan356px] ${screens.length}화면 · 대체 콘텐츠 아이콘 노드 ${scanned}개 관측(DSF2 · 이모지는 스코프 밖 — 머리말 참조)`);
    console.log(`[1] 산술 예측 — 스냅 왜곡 > ${(TOL * 100).toFixed(1)}% 인 후보 ${groups.length}자리`);
    for (const g of groups) {
      const pct = ((g.distort - 1) * 100).toFixed(2);
      console.log(`  ${pct > 0 ? '+' : ''}${pct}%  [${g.tag}] ${g.sel}  «${g.txt}»  CSS ${g.w}×${g.h} @ ${g.x},${g.y} → 장치 ${g.dw}×${g.dh}`);
      console.log(`      화면: ${g.screens.join(', ')}${g.expWhy ? '  ·  ' + g.expWhy : ''}`);
      console.log(`      잉크: ` + [2, 3, 4].map((d) => {
        const v = g.ink && g.ink['DSF' + d];
        return `DSF${d} ` + (v ? `${v.w}×${v.h} (${v.dev > 0 ? '+' : ''}${v.dev}%)` : '—');
      }).join(' | ') + `  ⇒ ${g.verdict}`);
    }
    console.log(`\n[2] 잉크 확인 — **결함 ${confirmed.length}자리**` + (confirmed.length ? '' : ' (후보는 전부 측정 바닥이었다)'));
    for (const g of confirmed) console.log(`  ✗ ${g.sel} «${g.txt}» — ${g.screens.join(', ')}`);
    if (noRuler.length) {
      console.log(`\n[!] 자 없음 ${noRuler.length}자리 — 캔버스는 «그린 내용이 비트맵의 어디인지» 를 몰라 잉크 기대치를 못 세운다`);
      for (const g of noRuler) console.log(`  ? ${g.sel} «${g.txt}» — ${g.expWhy} — ${g.screens.join(', ')}`);
    }
    if (errs.length) { console.log('\n[!] 화면 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
