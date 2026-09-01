#!/usr/bin/env node
/* 작업 418 — «소수 상자» 전 화면 스윕 (측정 전용 · 판정은 verify356.js [S3])
 *
 *   node tools/scan418.js            # 전 화면 순회 → 페인트 스냅이 한 축만 먹는 자리 목록
 *   node tools/scan418.js --json     # 기계 판독용(게이트가 이 형식을 읽는다)
 *   node tools/scan418.js --revert   # 되돌림 — 8·9회차가 넣은 정수 상자를 떼고 다시 센다
 *   node tools/scan418.js --all      # 후보(소수 상자) 전부를 찍는다(대조용)
 *
 * ── 왜 이 자가 필요한가 (356 8·9회차 → 418 등재문) ─────────────────────────
 * `.cic{width:1.08em;height:1.08em}` 에 소수 `font-size` 가 곱해지면 **소수 상자**가 되고,
 * 그 상자가 **소수 좌표**에 앉은 자리만 래스터 스냅이 한 축을 1px 더 먹어 아이콘이 찌그러진다.
 * 356 의 기존 자 셋은 이것을 **구조적으로 못 본다**:
 *   · `scan356`      — «선언된 변환» 만 본다(상자는 등방이라 초록)
 *   · `verify356 [A]`— 같은 층
 *   · `cal356r7`·비평 캡처 — DSF 1 이라 그 1px 이 반올림에 묻힌다
 * 그래서 8회차(33 재화 정보)·9회차(70 출석)는 **비평가가 우연히 그 화면을 열어야** 나왔고,
 * `verify356` 의 [S3]·[S4] 는 그 두 화면짜리 **상수 두 벌**로 굳었다.
 * ⇒ 이 자는 그 물음을 **화면별 상수에서 빼고 스윕 한 벌**로 만든다.
 *
 * ── 무엇을 재는가 ────────────────────────────────────────────────────────
 * 스크린샷 차분이 아니라 **스냅 산수**다. 다만 재는 것은 상자가 아니라 «그림이 실제로 앉는 칸»
 * = `object-fit` 이 정한 **콘텐츠 사각형**이다(상자가 아니다 — `.cic` 는 `contain` 이라
 * 상자가 89.43×88.55 처럼 살짝 안 맞아도 그림은 **정사각 88.55** 로 앉는다. 상자 종횡비를 재면
 * 그 자리가 «−0.99% 결함» 으로 잘못 읽힌다 — 1회차에 실제로 그렇게 읽혔다).
 * 그 사각형 (ix, iy, s×s) 이 배율 d 에서 먹는 디바이스 픽셀은
 *     sw = round((ix+iw)·d) − round(ix·d)     sh = round((iy+ih)·d) − round(iy·d)
 * 이고, 콘텐츠 폭·높이가 정수면 좌표가 무엇이든 sw/sh 는 원본 종횡비와 같다. **소수 칸**만
 * «좌표에 따라» 한 축이 1 커지거나 작아진다 = **자리마다 우연**(9회차: 같은 격자 7칸 중 3칸).
 * 편차는 `dev = (sw/sh) ÷ (원본 종횡비) − 1` 이고 [S3] 과 같은 **0.5%** 를 넘으면 후보다.
 * ⚠ **판정 배율은 DSF 2 다**(등재문 · [S3] ④). DSF 3·4 는 «수렴하는가» 를 보라고 같이 찍는다.
 * ⚠ 스냅 산수는 **선별기**다 — 잉크로 확정하는 것은 `tools/probe418.js` 몫이고,
 *   «진짜 기하 ↔ 측정 바닥» 은 거기서 **DSF 를 올려 수렴하는가**로 가른다(9회차 규칙).
 *
 * ⚠ 화면 목록은 `scan356.js` 의 SCREENS 를 **그대로 빌려 쓴다**(사본을 만들면 한쪽만 늘어난다 —
 *   397 이 고친 «스코프 구멍» 이 바로 그 사고다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ 356 13회차 — 구동기는 `scan356.STEP` 한 벌이다(자기 손으로 다시 적으면 `js:<식>` 단계를
   조용히 건너뛴다 · `verify356` [R12] 가 지킨다). */
const { SCREENS, URL, STEP } = require('./scan356');

const JSON_OUT = process.argv.includes('--json');
const REVERT = process.argv.includes('--revert');
const ALL = process.argv.includes('--all');
const DSFS = [2, 3, 4];
const TOL = Number(process.env.SCAN418_TOL || 0.005);   /* [S3] ④ 와 같은 0.5% */

/* 되돌림 — 지금까지 놓인 «정수 상자» 다섯 줄을 전부 떼면 옛 소수 상자가 돌아온다.
   이 자가 그것들을 다시 잡는지가 **이 자가 살아 있다는 유일한 증거**다.
   ⚠ 줄을 더할 때는 **정수화한 자리를 여기에도 반드시 같이 적는다** — 안 적으면 그 자리는
     «고쳤다는 사실만 남고 무엇이 그것을 지키는지 아무도 안 묻는» 상태가 된다. */
const REVERT_CSS = `
  .ci-ic>i>.cic{width:1.08em !important;height:1.08em !important}   /* 356 8회차 — 33 재화 정보 */
  .ci-ic>i{transform:scale(.93878) !important}
  .at-if>em>.cic{width:1.08em !important;height:1.08em !important}  /* 356 9회차 — 70 출석 */
  .qs-i>.cic{width:1.08em !important;height:1.08em !important}      /* 418 — 22 퀘스트 */
  .ps-bx>i>.cic{width:1.08em !important;height:1.08em !important}   /* 418 — 35 패스 */
  #tuto .trew .ri>.cic{width:1.08em !important;height:1.08em !important} /* 418 — 전 화면 미션 배너 */
`;
/* 정수화가 끝난 다섯 자리 — 게이트 [S3] ② 가 «상자가 아직 정수인가» 를 묻는다.
   ⚠ «0칸» 이 아니라 **«정수 상자»** 를 묻는 이유: 정수화해도 소수 «좌표» 가 남는 자리가 있고
     (36 출석 패스는 행 y 가 …​.5 라 잉크에 1px 이 남는다 = +0.61%), 그건 상자가 만든 것이 아니다.
     0칸을 물으면 이 항이 «상자와 무관한 이유로» 빨개져 결국 눌러 끄게 된다 — 그러면 정수 상자가
     통째로 사라져도 초록인 게이트가 남는다(328 교훈). 좌표가 남긴 잔여는 아래 래칫이 센다. */
const FIXED = [
  { lab: '33 재화 정보 `#ciIcon`(356 8회차)', open: ['[data-cur="dia"]'], sel: '#ciw #ciIcon>img.cic', box: 98 },
  { lab: '70 출석 `.at-if>em`(356 9회차)', open: ['.side .ibtn[data-pop="attend"]'], sel: '.at-if>em>img.cic', box: 82 },
  { lab: '22 퀘스트 `.qs-i`(418 · 644 가 55 로)', open: ['.side .ibtn[data-pop="quest"]'], sel: '.qs-i>img.cic', box: 55 },
  { lab: '35 패스 `.ps-bx>i`(418)', open: ['#menub', '#psGo'], sel: '#psTk .ps-bx>i>img.cic', box: 88 },
  { lab: '미션 배너 `#tutoRew`(418)', open: [], sel: '#tuto .trew .ri>img.cic', box: 67 },
];

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT418 = function () {
  const app = document.getElementById('app');
  if (!app) return [];
  const near = (v) => Math.abs(v - Math.round(v)) < 1e-4;

  function pathOf(el) {
    const out = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  }

  /* 원본(내재) 종횡비 — img 는 natural, canvas 는 backing 속성, svg 는 viewBox */
  function natural(el) {
    if (el.tagName === 'IMG') return el.naturalWidth && el.naturalHeight ? [el.naturalWidth, el.naturalHeight] : null;
    if (el.tagName === 'CANVAS') return el.width && el.height ? [el.width, el.height] : null;
    const vb = el.viewBox && el.viewBox.baseVal;
    if (vb && vb.width && vb.height) return [vb.width, vb.height];
    return null;
  }

  const out = [];
  /* 스코프 = «상자가 그림을 정하는» 노드 — img/canvas/svg 전부.
     `.cic` 만 보면 같은 뿌리를 가진 다른 부품을 놓친다(등재문 «64자리» 는 `.cic` 만 센 값이다). */
  const nodes = app.querySelectorAll('img, canvas, svg');
  let idx = 0;
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;          /* 안 보이는 것·먼지는 안 센다 */
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const nat = natural(el);
    const fit = cs.objectFit;
    /* 그림이 실제로 앉는 칸 — object-fit 이 정한다 */
    let iw = r.width, ih = r.height, ix = r.left, iy = r.top;
    if (nat && (fit === 'contain' || fit === 'scale-down')) {
      const s = Math.min(r.width / nat[0], r.height / nat[1]);
      const k = fit === 'scale-down' ? Math.min(1, s) : s;
      iw = nat[0] * k; ih = nat[1] * k;
      ix = r.left + (r.width - iw) / 2; iy = r.top + (r.height - ih) / 2;
    } else if (nat && fit === 'none') {
      iw = nat[0]; ih = nat[1];
      ix = r.left + (r.width - iw) / 2; iy = r.top + (r.height - ih) / 2;
    } else if (nat && fit === 'cover') {
      const s = Math.max(r.width / nat[0], r.height / nat[1]);
      iw = nat[0] * s; ih = nat[1] * s;
      ix = r.left + (r.width - iw) / 2; iy = r.top + (r.height - ih) / 2;
    }
    /* `fill`(캔버스 기본)은 칸 = 상자 그대로 */
    out.push({
      sel: pathOf(el), cls: (el.getAttribute('class') || '').slice(0, 24),
      tag: el.tagName.toLowerCase(), fit,
      x: r.left, y: r.top, w: r.width, h: r.height,
      ix, iy, iw, ih, nat: nat ? nat[0] / nat[1] : null,
      intBox: near(iw) && near(ih),
      i: idx++,
    });
  }
  return out;
};

/* ---------- 스냅 산수 ----------
   기준 종횡비는 «상자» 가 아니라 그림이 앉는 칸(iw/ih) 이다 — object-fit 이 이미 상자를 흡수했다. */
function snapDev(rec, d) {
  const sw = Math.round((rec.ix + rec.iw) * d) - Math.round(rec.ix * d);
  const sh = Math.round((rec.iy + rec.ih) * d) - Math.round(rec.iy * d);
  if (!sh) return null;
  return { sw, sh, dev: (sw / sh) / (rec.iw / rec.ih) - 1 };
}

module.exports = { COLLECT418, snapDev, DSFS, TOL, REVERT_CSS, FIXED };

if (require.main !== module) return;

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        if (!(await STEP(page, s))) errs.push(`${label}: 무음 실패 — 단계 '${s}' 가 안 먹었다`);
        await page.waitForTimeout(420);
      }
      if (REVERT) await page.addStyleTag({ content: REVERT_CSS });
      await page.waitForTimeout(300);
      const got = await page.evaluate(COLLECT418);
      for (const g of got) rows.push(Object.assign({ screen: label }, g));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  const frac = rows.filter((r) => !r.intBox);
  const bad = [];
  for (const r of rows) {
    const per = {};
    let worst = 0;
    for (const d of DSFS) {
      const s = snapDev(r, d);
      if (!s) continue;
      per['d' + d] = s;
      if (Math.abs(s.dev) > Math.abs(worst)) worst = s.dev;
    }
    /* ⚠ 후보 판정은 **DSF 2 하나로** 한다(등재문·[S3] ④). 3·4 는 «수렴하는가» 참고용이다 —
       DSF 를 올리면 같은 1px 이 상대적으로 작아지므로 «3·4 에서만 넘는» 자리는 자의 바닥에 가깝다. */
    const hit = !!(per.d2 && Math.abs(per.d2.dev) > TOL);
    if (hit || ALL) bad.push(Object.assign({}, r, { per, worst, hit }));
  }

  /* 같은 자리가 화면마다·칸마다 반복되므로 «선택자» 로 접되 칸 수를 센다 */
  const byKey = new Map();
  for (const r of bad.filter((z) => z.hit)) {
    if (!byKey.has(r.sel)) byKey.set(r.sel, { sel: r.sel, cls: r.cls, n: 0, screens: new Set(), sample: r, worst: 0 });
    const g = byKey.get(r.sel);
    g.n++; g.screens.add(r.screen);
    if (Math.abs(r.per.d2.dev) > Math.abs(g.worst)) { g.worst = r.per.d2.dev; g.sample = r; }
  }
  const list = [...byKey.values()].map((g) => ({
    sel: g.sel, cls: g.cls, cells: g.n, screens: [...g.screens], worst: +(g.worst * 100).toFixed(2),
    box: `${g.sample.iw.toFixed(4)}×${g.sample.ih.toFixed(4)}`,
    at: `${g.sample.ix.toFixed(4)},${g.sample.iy.toFixed(4)}`,
    snap: DSFS.map((d) => `DSF${d} ${g.sample.per['d' + d] ? g.sample.per['d' + d].sw + '×' + g.sample.per['d' + d].sh : '—'}`).join(' · '),
  })).sort((a, b) => Math.abs(b.worst) - Math.abs(a.worst));

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, revert: REVERT, scanned: rows.length, frac: frac.length,
      cells: bad.filter((z) => z.hit).length, groups: list, errs }, null, 1));
  } else {
    console.log(`[scan418]${REVERT ? ' «되돌림»' : ''} 그림 노드 ${rows.length}개 관측 · 소수 상자 ${frac.length}개 · ` +
      `스냅 편차 >${(TOL * 100).toFixed(1)}% 인 칸 ${bad.filter((z) => z.hit).length}개 → ${list.length}자리`);
    for (const g of list) {
      console.log(`  ${g.worst > 0 ? '+' : ''}${g.worst}%  ${g.sel}  «${g.cls}»  ${g.cells}칸`);
      console.log(`      상자 ${g.box} @ ${g.at} · ${g.snap}`);
      console.log(`      화면: ${g.screens.join(', ')}`);
    }
    if (errs.length) { console.log('\n[!] 화면 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
