#!/usr/bin/env node
/* 작업 356 — 29회차 축: **«내용 좌표계 ↔ 표시 상자»** (`verify356` [M] 의 재료)
 *
 *   node tools/probe356r29.js            # 합성 표본 — 되돌림 · 대조군 · 음성항 (빠르다)
 *   node tools/probe356r29.js --census   # 제품 전 화면 인구조사 (느리다 · 등재값의 대조군)
 *   node tools/probe356r29.js --json     # 기계 판독용
 *
 * ── 무엇을 묻는가 ────────────────────────────────────────────────────────────
 * 356 의 스물여덟 회차는 **찌그러짐의 출처**를 하나씩 넓혀 왔다 —
 * 자기 `transform`(1~10) → 조상 누적(A1·A2) → 개별 `scale` 프로퍼티 → 화면·상태·문·시간(11~25)
 * → 수집기 자신(26) → 의사 요소 이름(27) → 캔버스 **안** 픽셀(23·28회차/634).
 * 그 전부가 «**노드에 걸린 배율**» 을 본다.
 *
 * **그런데 매체는 배율이 하나도 안 걸려도 찌그러진다** — 내용이 제 좌표계를 가지고 있고
 * 표시 상자가 그 비와 다르면, 브라우저가 **상자에 맞춰 늘린다.** `transform` 은 `none` 이고
 * `scale` 도 `none` 이라 지금까지의 축은 **한 줄도 안 걸린다.**
 *
 * ⚑ **356 은 이 축을 이미 알고 있다 — 다만 매체 한 종에만 세웠다.**
 *   `scan356.COLLECT` 는 `IMG` 에 대해서만 «화면 종횡비 ÷ 원본 종횡비» 를 잰다
 *   (`object-fit:fill` 갈래 — `.gem>.cic{width:58;height:47}` 가 그 자리였다).
 *   그런데 같은 파일의 `isMedia()` 가 세는 매체는 **셋**이다:
 *
 *       function isMedia(el) { return t === 'IMG' || t === 'CANVAS' || t === 'svg' || t === 'SVG'; }
 *                                      ^^^자가 있다      ^^^^^^^^^^^^^^^^^^ 자가 없다
 *
 *   ⇒ **자기가 열거한 세 매체 중 하나에만 자를 세워 두고 스물여덟 회차 «전 화면 0건» 을 찍어 왔다.**
 *   24·26·27회차가 되풀이한 «못 봐서 0» 의 **다섯 번째 모양**이고, 앞의 넷과 다른 점은
 *   **놓친 자리가 남의 축이 아니라 자기 축의 나머지 절반**이라는 것이다.
 *
 * ── 실측이 가른 것 (338 규칙 — 처방 전에 재현) ──────────────────────────────
 * 합성 표본 일곱을 심고 ⓐ 현행 자가 무엇을 보는가 ⓑ **찍힌 픽셀**이 정말 찌그러졌는가를 나눠 물었다.
 *
 *   | 표본 | 상자 ÷ 내용 | 현행 자([A]) | 찍힌 잉크 | 판정 |
 *   |---|---|---|---|---|
 *   | ⓐ `<canvas 88×92>` 를 150×50 상자에 | **3.136** | **ratio 1 = 초록** | 늘어남 | **대상 · 눈 없음** |
 *   | ⓑ `<canvas 88×92>` 를 176×184 상자에 | 1.000 | ratio 1 | 등방 | 대상 · 음성항 |
 *   | ⓒ `<canvas 60×40>` CSS 크기 선언 없음 | 1.000 | ratio 1 | 등방 | 대상 · 음성항 |
 *   | ⓓ `<svg viewBox 1:1>` 기본 PAR, 상자 3:1 | 3.000 | ratio 1 | **1:1** | **사정권 밖**(레터박스) |
 *   | ⓔ `<svg viewBox 1:1 preserveAspectRatio="none">` | 3.000 | ratio 1 | **3:1** | **대상 · 눈 없음** |
 *   | ⓕ `<svg>` viewBox 없음, 상자 3:1 | 3.000 | ratio 1 | 1:1 | 사정권 밖(배율이 없다) |
 *   | ⓖ `<img object-fit:fill>` 인데 `naturalWidth===0` | (못 잼) | ratio 1 | — | **탈출구** |
 *
 * ⇒ 세 가지가 갈렸다(27회차 교훈 ②의 규율 — «0» 을 한 줄로 찍지 않는다):
 *
 *  ① **CANVAS 는 «대상인데 눈이 없다».** 비트맵(`canvas.width/height`)이 곧 내용 좌표계이고
 *     상자가 그 비와 다르면 **언제나** 늘어난다(`object-fit` 같은 손잡이가 아예 없다).
 *     [G]/[L] 이 보는 것은 캔버스 **안에 구워지는** 픽셀이라 이 층과 다르다 —
 *     `ctx.scale` 이 완벽히 등방이어도 그 결과물을 상자가 통째로 늘린다.
 *     ⇒ **이 회차가 눈을 낸다.**
 *
 *  ② **SVG 는 «상자 비로 재면 헛빨강» 이다.** 기본 `preserveAspectRatio`(`xMidYMid meet`)는
 *     비를 지키고 **남는 데를 비운다** — ⓓ 의 상자는 3:1 인데 잉크는 1:1 이었다.
 *     상자 비를 그대로 대면 ⓓ·ⓕ 가 빨개지는데 **화면의 그림은 멀쩡하다.**
 *     ⇒ 판정축은 상자 비가 아니라 **`preserveAspectRatio` 가 `none` 인가**다.
 *     제품에 `preserveAspectRatio` 는 **0건**이라 이 갈래의 0 은 «없어서 0» 이고,
 *     한 글자면 1건이 되므로 자가 **그 한 글자를 문다**(넣으면 빨개진다).
 *
 *  ③ **IMG 는 «자가 있는데 탈출구가 있다».** `scan356.COLLECT` 의 그 갈래는
 *     `if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight)` 로 시작한다 —
 *     **원본 크기를 못 읽으면 조용히 빠져나가 `ratio` 가 1(초록)로 남는다.**
 *     지금 제품에 그런 자리는 0건이지만(전 화면 IMG 109자리 전부 naturalWidth>0),
 *     «없어서 0» 과 «못 봐서 0» 을 가르는 것은 세는 쪽이 아니라 **말하는 쪽**이다
 *     ⇒ 그 자리를 초록이 아니라 **`blind`** 로 돌려 [M] 의 전제항이 물게 한다.
 *
 * ⚠ **ⓓ·ⓕ 가 이 회차의 «안 넣는 이유» 다** — 27회차가 `::part`/`::slotted` 에 세운 것과 같은 규율이다.
 *   «SVG 도 매체니까 상자 비로 같이 재자» 는 것이 자연스러운 다음 수인데, 그렇게 하면
 *   **제품의 멀쩡한 SVG 5자리가 전부 빨개진다.** 안 넣는 것이 맞고, 안 넣는 이유를 자가 말한다.
 *
 * ⚠ **번호 주의** — `probe356r28`·[L] 은 **작업 634**(캔버스 안 픽셀 축의 전 화면 확장)가 쓰고 있다.
 *   이 회차는 `probe356r29`·[M] 이다. 두 축은 **층이 다르다**:
 *   [L] = 캔버스 «안» 에 무엇이 어떻게 그려지는가 · [M] = 그 캔버스 «자체» 가 어떤 상자에 눌리는가.
 */
const { pw, launch } = require('./pwlaunch');

const ARG = process.argv.slice(2);
const CENSUS = ARG.includes('--census');
const JSON_OUT = ARG.includes('--json');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

/* |상자비 ÷ 내용비 − 1| 허용치 — scan356 과 같은 값을 쓴다(자를 두 벌로 안 적는다) */
const TOL = Number(process.env.SCAN356_TOL || 0.02);

/* ── 페이지 안에서 도는 수집기 ────────────────────────────────────────────────
   `verify356` [M] 이 **이것을 그대로** 제품 스윕에 댄다. 돌려주는 줄의 뜻:
     kind   'canvas' | 'svg' | 'img'
     d      상자비 ÷ 내용비 (1 이면 등방 · 사정권 밖이면 null)
     scope  'in'    사정권 안 — d 로 판정한다
            'out'   사정권 밖 — 구조적으로 안 찌그러진다(이유는 why)
            'blind' 눈이 없다 — 초록으로 세면 안 된다(전제항이 문다)
   ⚠ `scope` 를 안 돌려주고 d 만 돌려주면 «못 봐서 0» 과 «없어서 0» 이 다시 한 줄이 된다. */
const COLLECT_MEDIA = function () {
  const app = document.getElementById('app');
  if (!app) return [];
  const out = [];

  function pathOf(el) {
    const o = []; let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = (e.tagName || '').toLowerCase();
      if (e.id) { s += '#' + e.id; o.unshift(s); break; }
      const cl = e.getAttribute && e.getAttribute('class');
      if (cl) s += '.' + String(cl).trim().split(/\s+/).slice(0, 3).join('.');
      o.unshift(s); e = e.parentElement;
    }
    return o.join('>');
  }

  for (const el of app.querySelectorAll('canvas, svg, img')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;               /* 안 보이는 것은 안 센다 (COLLECT 와 같은 규율) */
    const box = r.width / r.height;
    const row = { sel: pathOf(el), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    const tag = (el.tagName || '').toLowerCase();

    if (tag === 'canvas') {
      row.kind = 'canvas';
      row.nw = el.width; row.nh = el.height;
      if (!el.width || !el.height) { row.scope = 'blind'; row.why = '비트맵 크기가 0 — 내용 좌표계를 못 읽는다'; row.d = null; }
      else { row.scope = 'in'; row.d = +(box / (el.width / el.height)).toFixed(4); }

    } else if (tag === 'svg') {
      row.kind = 'svg';
      /* ⚠ 판정축은 상자 비가 아니라 preserveAspectRatio 다 — 기본값은 비를 지키고 남는 데를 비운다.
         `SVG_PRESERVEASPECTRATIO_NONE === 1`. 속성이 아예 없으면 baseVal 이 기본값(xMidYMid)을 준다. */
      let align = null;
      try { align = el.preserveAspectRatio && el.preserveAspectRatio.baseVal ? el.preserveAspectRatio.baseVal.align : null; } catch (e) { align = null; }
      const vb = el.viewBox && el.viewBox.baseVal ? el.viewBox.baseVal : null;
      const hasVb = !!(vb && vb.width && vb.height);
      row.par = align;
      row.vb = hasVb ? +(vb.width / vb.height).toFixed(4) : null;
      if (align === null) { row.scope = 'blind'; row.why = 'preserveAspectRatio 를 못 읽는다'; row.d = null; }
      else if (!hasVb) { row.scope = 'out'; row.why = 'viewBox 가 없다 — 내용에 배율 자체가 안 걸린다'; row.d = null; }
      else if (align !== 1 /* NONE */) { row.scope = 'out'; row.why = 'preserveAspectRatio 가 비를 지킨다(레터박스)'; row.d = null; }
      else { row.scope = 'in'; row.d = +(box / (vb.width / vb.height)).toFixed(4); }

    } else {
      row.kind = 'img';
      const fit = getComputedStyle(el).objectFit;
      row.fit = fit; row.nw = el.naturalWidth; row.nh = el.naturalHeight;
      if (fit !== 'fill') { row.scope = 'out'; row.why = 'object-fit 이 fill 이 아니다 — 잘릴 뿐 안 늘어난다'; row.d = null; }
      else if (!el.naturalWidth || !el.naturalHeight) {
        /* ⚑ 여기가 탈출구다 — scan356.COLLECT 는 이 자리를 조용히 건너뛰고 ratio 1(초록)로 남긴다 */
        row.scope = 'blind'; row.why = 'object-fit:fill 인데 원본 크기를 못 읽는다 (scan356 이 조용히 건너뛰는 자리)'; row.d = null;
      } else { row.scope = 'in'; row.d = +(box / (el.naturalWidth / el.naturalHeight)).toFixed(4); }
    }
    out.push(row);
  }
  return out;
};

/* [M] 이 쓰는 판정 — 자를 두 벌로 안 적는다 */
function verdict(rows, tol) {
  const inScope = rows.filter((r) => r.scope === 'in');
  const blind = rows.filter((r) => r.scope === 'blind');
  const outs = rows.filter((r) => r.scope === 'out');
  const bad = inScope.filter((r) => Math.abs(r.d - 1) > tol);
  return { inScope, blind, outs, bad };
}

/* ── 합성 표본 — 표의 ⓐ~ⓖ ───────────────────────────────────────────────── */
const SYN = `<!doctype html><meta charset="utf-8"><body style="margin:0"><div id="app">
  <canvas id="cSquash" width="88" height="92" style="width:150px;height:50px"></canvas>
  <canvas id="cOk"     width="88" height="92" style="width:176px;height:184px"></canvas>
  <canvas id="cBare"   width="60" height="40"></canvas>
  <svg id="sDefault" viewBox="0 0 10 10" width="150" height="50"><rect width="10" height="10" fill="red"/></svg>
  <svg id="sNone" viewBox="0 0 10 10" preserveAspectRatio="none" width="150" height="50"><rect width="10" height="10" fill="red"/></svg>
  <svg id="sNoVb" width="150" height="50"><rect width="10" height="10" fill="red"/></svg>
  <img id="iNoNat" style="width:150px;height:50px;object-fit:fill">
</div></body>`;

/* 찍힌 픽셀로 되묻는 자 — «상자가 3:1 이면 그림도 3:1 인가» 를 잉크 bbox 로 판정한다.
   ⚠ 이 되물음이 이 회차의 ②(SVG 헛빨강)를 세우는 유일한 근거다 — 계산값만 보면 ⓓ 와 ⓔ 가 똑같다. */
const INK = async function (ids) {
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    const xml = new XMLSerializer().serializeToString(el);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))); });
    const c = document.createElement('canvas'); c.width = Math.round(r.width); c.height = Math.round(r.height);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    out[id] = x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1, ratio: +((x1 - x0 + 1) / (y1 - y0 + 1)).toFixed(3) };
  }
  return out;
};

module.exports = { COLLECT_MEDIA, verdict, TOL, SYN };

if (require.main !== module) return;

(async () => {
  const { chromium } = pw();
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const report = {};

  /* ── 합성: 되돌림 · 대조군 · 음성항 ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(SYN);
    await page.waitForTimeout(150);

    const rows = await page.evaluate(COLLECT_MEDIA);
    const by = (id) => rows.find((r) => r.sel.indexOf('#' + id) >= 0);
    report.syn = rows;

    console.log('[1] 되돌림 — 캔버스 비트맵 ↔ 상자가 어긋난 자리를 이 자가 보는가');
    const a = by('cSquash');
    if (a && a.scope === 'in' && Math.abs(a.d - 1) > TOL) ok(`[1] ⓐ canvas 88×92 → 150×50 상자: 왜곡비 ${a.d} 를 잡는다`);
    else bad(`[1] ⓐ 를 못 잡는다: ${JSON.stringify(a)}`);

    console.log('[2] 대조군 — 같은 자리를 현행 자(scan356.COLLECT)는 무엇이라고 하는가');
    const { COLLECT } = require('./scan356.js');
    const seen = await page.evaluate(COLLECT, { all: true });
    const aOld = seen.find((s) => s.sel.indexOf('#cSquash') >= 0);
    if (aOld && Math.abs(aOld.ratio - 1) <= 1e-6) ok(`[2] 현행 자는 ⓐ 를 ratio ${aOld.ratio} = 초록이라고 한다 (= [A] 축에는 이 층의 눈이 없다)`);
    else bad(`[2] 대조군이 안 선다 — 현행 자가 ⓐ 를 이미 본다: ${JSON.stringify(aOld)}`);

    console.log('[3] 음성항 — 비가 맞는 캔버스는 안 빨개진다 (헛빨강 아님)');
    const b = by('cOk'), c = by('cBare');
    if (b && b.scope === 'in' && Math.abs(b.d - 1) <= TOL && c && c.scope === 'in' && Math.abs(c.d - 1) <= TOL)
      ok(`[3] ⓑ 176×184 상자 d=${b.d} · ⓒ CSS 크기 선언 없음 d=${c.d} — 둘 다 등방`);
    else bad(`[3] 음성항이 빨갛다: ⓑ ${JSON.stringify(b)} / ⓒ ${JSON.stringify(c)}`);

    console.log('[4] 찍힌 픽셀 — SVG 기본 preserveAspectRatio 는 상자가 3:1 이어도 그림을 안 늘린다');
    const ink = await page.evaluate(INK, ['sDefault', 'sNone']);
    report.ink = ink;
    if (ink.sDefault && Math.abs(ink.sDefault.ratio - 1) <= 0.05)
      ok(`[4] ⓓ 상자 3:1 · 잉크 ${ink.sDefault.w}×${ink.sDefault.h} = ${ink.sDefault.ratio}:1 (레터박스 — 안 찌그러진다)`);
    else bad(`[4] ⓓ 가 예상과 다르다: ${JSON.stringify(ink.sDefault)}`);

    console.log('[5] 찍힌 픽셀 — preserveAspectRatio="none" 은 그림을 늘린다');
    if (ink.sNone && Math.abs(ink.sNone.ratio - 3) <= 0.15)
      ok(`[5] ⓔ 상자 3:1 · 잉크 ${ink.sNone.w}×${ink.sNone.h} = ${ink.sNone.ratio}:1 (찌그러진다)`);
    else bad(`[5] ⓔ 가 예상과 다르다: ${JSON.stringify(ink.sNone)}`);

    console.log('[6] ⇒ SVG 판정축은 상자 비가 아니라 preserveAspectRatio — 상자 비로 재면 ⓓ·ⓕ 가 헛빨강이다');
    const d = by('sDefault'), e = by('sNone'), f = by('sNoVb');
    const boxRatioWouldFail = [d, f].every((r) => r && Math.abs((r.w / r.h) / 1 - 1) > TOL);
    if (d && d.scope === 'out' && f && f.scope === 'out' && e && e.scope === 'in' && Math.abs(e.d - 1) > TOL && boxRatioWouldFail)
      ok(`[6] ⓓ·ⓕ 는 사정권 밖(${d.why} / ${f.why}) · ⓔ 만 대상(d=${e.d}) — 상자 비로 쟀으면 ⓓ·ⓕ 가 3.00 으로 빨개졌다`);
    else bad(`[6] 갈래가 안 선다: ⓓ ${JSON.stringify(d)} / ⓔ ${JSON.stringify(e)} / ⓕ ${JSON.stringify(f)}`);

    console.log('[7] 탈출구 — object-fit:fill 인데 원본 크기를 못 읽는 IMG 는 «초록» 이 아니라 «눈 없음» 이다');
    const g = by('iNoNat');
    const gOld = seen.find((s) => s.sel.indexOf('#iNoNat') >= 0);
    if (g && g.scope === 'blind' && gOld && Math.abs(gOld.ratio - 1) <= 1e-6)
      ok(`[7] ⓖ — 현행 자는 ratio ${gOld.ratio}(초록)로 남기고, 이 자는 blind 로 돌린다: ${g.why}`);
    else bad(`[7] ⓖ 가 안 갈린다: ${JSON.stringify(g)} / 현행 ${JSON.stringify(gOld)}`);

    await ctx.close();
  }

  /* ── 제품 인구조사 (--census) ── */
  if (CENSUS) {
    const S = require('./scan356.js');
    const agg = new Map();
    for (const [label, steps] of S.SCREENS) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(S.URL, { waitUntil: 'load' });
        await page.waitForTimeout(400);
        for (const st of (steps || [])) { await S.STEP(page, st); await page.waitForTimeout(150); }
        await page.waitForTimeout(200);
        for (const r of await page.evaluate(COLLECT_MEDIA)) {
          const k = r.sel + '|' + r.w + 'x' + r.h + '|' + (r.nw || r.vb || '') + 'x' + (r.nh || '');
          if (!agg.has(k)) agg.set(k, Object.assign({ screen: label }, r));
        }
      } catch (e) { /* 진입 실패는 smoke 의 몫 */ }
      await ctx.close();
    }
    const rows = [...agg.values()];
    const v = verdict(rows, TOL);
    report.census = { total: rows.length, in: v.inScope.length, out: v.outs.length, blind: v.blind.length, bad: v.bad.length };
    console.log(`\n[8] 제품 인구조사 — 매체 ${rows.length}자리 (canvas ${rows.filter((r) => r.kind === 'canvas').length} · svg ${rows.filter((r) => r.kind === 'svg').length} · img ${rows.filter((r) => r.kind === 'img').length})`);
    for (const k of ['canvas', 'svg', 'img']) {
      const kk = rows.filter((r) => r.kind === k);
      const kv = verdict(kk, TOL);
      console.log(`     ${k.padEnd(7)} 사정권 안 ${String(kv.inScope.length).padStart(3)} · 밖 ${String(kv.outs.length).padStart(3)} · 눈 없음 ${kv.blind.length} · **비균등 ${kv.bad.length}**`);
    }
    for (const r of v.bad) console.log('       ⚠ ' + r.screen + ' · ' + r.sel + ' d=' + r.d);
    for (const r of v.blind) console.log('       ◻ (눈 없음) ' + r.screen + ' · ' + r.sel + ' — ' + r.why);
    if (!rows.length) bad('[8] 매체를 한 자리도 못 봤다 (헛초록 방지)');
    else if (v.bad.length) bad(`[8] 제품에 비균등 매체 ${v.bad.length}자리`);
    else ok(`[8] 제품 비균등 0자리 — 사정권 안 ${v.inScope.length} · 눈 없음 ${v.blind.length}`);
  }

  await browser.close();
  if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
  console.log(`\nprobe356r29: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
