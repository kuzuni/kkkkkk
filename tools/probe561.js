#!/usr/bin/env node
/* 재현 — 작업 561 「56 절전 모드 `#svw .sv-r>u` 이모지 두 칸에 기본 밑줄이 살아 있다」
 *
 *   node tools/probe561.js
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문(545 §5)은 «deco=underline 이고 찍힌 픽셀이 57px 다르다»
 * 라고 적었지만, 그 관측은 545 세션의 것이다 — 이 자가 같은 트리에서 다시 물어 갈래를 정한다.
 * 148(같은 함정 · `<s>` 취소선)과 달리 여기는 `-webkit-text-stroke` 가 0 이라 «검정 막대» 가 아니라
 * «흰 선» 쪽이다.
 *
 * 묻는 것:
 *   [A] 세 슬롯의 computed `text-decoration-line` — 글자가 든 두 칸(⏱️·💀)은 underline 인가,
 *       `<img>` 만 든 세 번째 칸은 감사 판정에 안 걸리는가.
 *   [B] **찍힌 픽셀** — 아이콘 구간만 잘라 «지금» 과 «`text-decoration:none` 사본» 을 대조한다.
 *       다른 화소가 있으면 밑줄이 실제로 그려지고 있다는 뜻이다(수리 뒤에는 0 이어야 한다).
 *   [C] 잡음 대조 — 같은 상태를 두 번 찍어 0px 임을 먼저 못박는다([B] 의 전제).
 *   [D] 다른 화소의 y 줄과 색 — 밑줄이면 «연속한 몇 줄 × 가로로 긴 띠» 이고 색은 글자색(#FFF)이다.
 *   [E] 레이아웃 Δ0px — `text-decoration` 은 상자를 안 움직인다(56 은 ①~④ 8점 마감 화면이다).
 *
 * ⚠ 이 자는 아무것도 고치지 않는다. 사본은 페이지에 임시로 얹었다가 반드시 걷어낸다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const FIX = '#svw .sv-r>u{text-decoration:none}';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 절전 화면을 연다 — verify56 과 같은 오프너 */
  await page.evaluate(() => {
    document.getElementById('menub').click();
    document.querySelector('#mnw [data-mn="saver"]').click();
  });
  await page.waitForTimeout(700);
  const on = await page.evaluate(() => !!document.querySelector('#svw') &&
    getComputedStyle(document.querySelector('#svw')).display !== 'none' &&
    document.getElementById('app').classList.contains('sv'));
  ok(on, '[전제] 절전 화면이 열렸다(#app.sv)');

  /* ── [A] 세 슬롯의 선언 ─────────────────────────────────────── */
  const slots = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r>u')].map((u, i) => {
    const cs = getComputedStyle(u);
    const txt = [...u.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
    const r = u.getBoundingClientRect();
    return { i: i + 1, txt, img: !!u.querySelector('img,.cic'),
             deco: cs.textDecorationLine, stroke: +(parseFloat(cs.webkitTextStrokeWidth) || 0).toFixed(2),
             color: cs.color, box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)] };
  }));
  console.log('  · 슬롯 ' + JSON.stringify(slots));
  ok(slots.length === 3, '[A0] 슬롯이 3칸이다', slots.length);
  const glyph = slots.filter(s => s.txt);
  ok(glyph.length === 2, '[A1] 글자가 든 칸은 두 칸이다(⏱️·💀)', glyph.map(s => s.txt).join(' '));
  console.log('  · 글자 칸 deco = ' + glyph.map(s => s.i + ':' + s.deco).join(' · '));
  console.log('  · 획 두께 = ' + glyph.map(s => s.i + ':' + s.stroke).join(' · ') + '  (148 은 3.7~4.5 였다)');
  const img = slots.find(s => !s.txt);
  ok(img && img.img, '[A2] 세 번째 칸은 글자가 없다(<img>/.cic) = 감사 판정 밖', img && img.deco);

  /* ── 픽셀 도구 ─────────────────────────────────────────────── */
  const shot = async (clip) => (await page.screenshot({ clip })).toString('base64');
  const diff = (a, b) => page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(B, 0, 0);
    const db = g.getImageData(0, 0, c.width, c.height).data;
    /* ⚠ 임계값 8 — 둥근 모서리의 안티에일리어싱은 ±1 계단으로 흔들린다(같은 상태에서도).
       밑줄은 #0E0E0E 위의 흰 선이라 계단이 160 을 넘는다. 잡음과 신호는 자릿수가 다르다. */
    let n = 0, faint = 0; const rows = {}; const cols = {}; let sampleA = null, sampleB = null;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const o = (y * c.width + x) * 4;
      const d = Math.max(Math.abs(da[o] - db[o]), Math.abs(da[o + 1] - db[o + 1]), Math.abs(da[o + 2] - db[o + 2]));
      if (d === 0) continue;
      if (d <= 8) { faint++; continue; }
      n++; rows[y] = (rows[y] || 0) + 1; cols[x] = 1;
      if (!sampleA) { sampleA = [da[o], da[o + 1], da[o + 2]]; sampleB = [db[o], db[o + 1], db[o + 2]]; }
    }
    const xs = Object.keys(cols).map(Number);
    return { n, faint, w: c.width, h: c.height, rows, sampleA, sampleB,
             xspan: xs.length ? [Math.min(...xs), Math.max(...xs)] : null };
  }, [a, b]);

  /* 아이콘 구간만 자른다 — pill 좌변(#svw .sv-r 는 left 50) 기준 x 0..70 */
  const clips = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r')].slice(0, 2).map((r) => {
    const b = r.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), width: 70, height: Math.round(b.height) };
  }));

  /* ── [C] 잡음 대조 — 같은 상태 두 장 ────────────────────────── */
  const a1 = await shot(clips[0]);
  const a2 = await shot(clips[0]);
  const noise = await diff(a1, a2);
  ok(noise.n === 0, '[C] 같은 상태 두 장의 다른 화소 = 0 (전제)', noise.n + 'px');

  /* ── [E] 레이아웃 Δ0 · [B] 찍힌 픽셀 ────────────────────────── */
  /* ⚠ 값 칸 `<b>`(#svT 시계 · #svG 골드)는 절전 중에도 계속 갱신돼 폭이 흔들린다 —
     그것을 «사본이 상자를 움직였다» 로 읽으면 안 된다. 먼저 **같은 상태 두 번**으로 잡음을 잰다. */
  const boxes = () => page.evaluate(() => {
    const g = (sel) => [...document.querySelectorAll(sel)]
      .map(e => { const r = e.getBoundingClientRect(); return [+r.x.toFixed(2), +r.y.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; });
    return { u: g('#svw .sv-r>u'), i: g('#svw .sv-r>i'), b: g('#svw .sv-r>b') };
  });
  const b0 = await boxes();
  await page.waitForTimeout(120);
  const b0b = await boxes();
  ok(JSON.stringify(b0.u) === JSON.stringify(b0b.u) && JSON.stringify(b0.i) === JSON.stringify(b0b.i),
     '[E0] 같은 상태 두 번의 u·i 상자 Δ0px (전제)');
  if (JSON.stringify(b0.b) !== JSON.stringify(b0b.b))
    console.log('  · (참고) 값 칸 <b> 는 같은 상태에서도 흔들린다 = 시계·골드가 갱신된다');
  const boxBefore = b0b;

  const before = [await shot(clips[0]), await shot(clips[1])];
  await page.evaluate((css) => {
    const st = document.createElement('style'); st.id = '__p561'; st.textContent = css;
    document.head.appendChild(st);
  }, FIX);
  await page.waitForTimeout(120);
  const after = [await shot(clips[0]), await shot(clips[1])];
  const boxAfter = await boxes();
  await page.evaluate(() => { const st = document.getElementById('__p561'); if (st) st.remove(); });

  ok(JSON.stringify(boxBefore.u) === JSON.stringify(boxAfter.u) &&
     JSON.stringify(boxBefore.i) === JSON.stringify(boxAfter.i),
     '[E] `text-decoration:none` 사본에서 아이콘·라벨 상자 Δ0px (u ' + boxBefore.u.length + ' · i ' + boxBefore.i.length + ')',
     JSON.stringify(boxAfter.u));

  const d0 = await diff(before[0], after[0]);
  const d1 = await diff(before[1], after[1]);
  for (const [i, d] of [[1, d0], [2, d1]]) {
    const ys = Object.keys(d.rows).map(Number).sort((a, b) => a - b);
    console.log('  · 행' + i + ' 다른 화소 ' + d.n + 'px(잡음 ±8 이하 ' + d.faint + 'px) · y ' + (ys.length ? ys.join(',') : '-') +
                ' · x ' + JSON.stringify(d.xspan) + ' · 지금 ' + JSON.stringify(d.sampleA) +
                ' → 사본 ' + JSON.stringify(d.sampleB));
  }
  const drawn = d0.n + d1.n;
  console.log('  ⇒ 두 칸 합계 다른 화소 = ' + drawn + 'px');
  if (drawn > 0) {
    /* 수리 전 — 밑줄이 실제로 그려진다 */
    ok(true, '[B] 밑줄이 찍힌 픽셀로 보인다(수리 전)', drawn + 'px');
    const ys0 = Object.keys(d0.rows).map(Number).sort((a, b) => a - b);
    const contiguous = ys0.every((y, k) => k === 0 || y === ys0[k - 1] + 1);
    ok(contiguous && ys0.length <= 5, '[D] 다른 화소가 «연속한 몇 줄» 이다 = 띠(밑줄)', 'y ' + ys0.join(','));
    ok(d0.sampleA && d0.sampleA[0] > 200 && d0.sampleA[1] > 200 && d0.sampleA[2] > 200,
       '[D2] 그 화소는 글자색(흰색)이다', JSON.stringify(d0.sampleA));
  } else {
    /* 수리 후 — 사본과 제품이 같다 = 이미 꺼져 있다 */
    ok(glyph.every(s => s.deco === 'none'), '[B] 제품이 이미 `text-decoration:none` 이다(수리 후)',
       glyph.map(s => s.deco).join('/'));
    ok(true, '[D] 사본과 제품의 다른 화소 0px — 밑줄이 그려지지 않는다', '0px');
  }

  /* ── [F] 같은 화면 전수 — audit148 이 «직접 자식 텍스트» 만 보므로 손자에 글자가 든 자리는 못 본다 ──
     `.sv-st>s`(스컬 배지)는 글자가 `<em>` 안에 있다: `<s>` 의 line-through 는 **자손에 상속**되므로
     감사에는 안 걸리고 화면에는 그려진다. 슬롯 3(`<img>` 만)과 같은 사각지대의 반대쪽이다. */
  const sweep = await page.evaluate(() => [...document.querySelectorAll('#svw s,#svw u,#svw strike')].map((el) => {
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
    const all = (el.textContent || '').trim();
    const r = el.getBoundingClientRect();
    return { sel: el.tagName.toLowerCase() + (el.parentElement.className ? '.' + String(el.parentElement.className).split(' ')[0] + '>' : ''),
             own, all, deco: cs.textDecorationLine, box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)] };
  }));
  console.log('  · #svw 의 s/u 전수 ' + JSON.stringify(sweep));
  const hidden = sweep.filter(e => !e.own && e.all && e.deco !== 'none');
  console.log('  · 감사 사각지대(손자에만 글자 · deco 살아 있음) = ' + hidden.length + '건 ' +
              JSON.stringify(hidden.map(h => h.sel + '«' + h.all + '»')));

  const stClip = await page.evaluate(() => {
    const s = document.querySelector('#svw .sv-st>s'); if (!s) return null;
    const b = s.getBoundingClientRect();
    return { x: Math.round(b.x) - 2, y: Math.round(b.y) - 2, width: Math.round(b.width) + 4, height: Math.round(b.height) + 4 };
  });
  if (stClip) {
    const sBefore = await shot(stClip);
    await page.evaluate(() => {
      const st = document.createElement('style'); st.id = '__p561s';
      st.textContent = '#svw .sv-st>s{text-decoration:none}';
      document.head.appendChild(st);
    });
    await page.waitForTimeout(120);
    const sAfter = await shot(stClip);
    await page.evaluate(() => { const st = document.getElementById('__p561s'); if (st) st.remove(); });
    const ds = await diff(sBefore, sAfter);
    const ys = Object.keys(ds.rows).map(Number).sort((a, b) => a - b);
    console.log('  · 스컬 배지 다른 화소 ' + ds.n + 'px(잡음 ' + ds.faint + 'px) · y ' + (ys.length ? ys.join(',') : '-') +
                ' · x ' + JSON.stringify(ds.xspan) + ' · 지금 ' + JSON.stringify(ds.sampleA) + ' → 사본 ' + JSON.stringify(ds.sampleB));
    ok(true, '[F] 스컬 배지 `<s>` 의 취소선을 찍힌 픽셀로 쟀다', ds.n + 'px');
  }

  await browser.close();
  console.log((fail ? 'PROBE561 FAIL ' : 'PROBE561 PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
