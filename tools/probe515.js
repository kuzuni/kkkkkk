#!/usr/bin/env node
/* 작업 515 — 「승급전 «권장 스테이지» 줄이 왼쪽 정렬이라 남색 상자 안에서 한쪽에 쏠려 보인다」 **재현**
 * (338 규칙 — 고치기 전에 제품에게 먼저 묻는다. 338·341·477 은 여기서 등재문이 기각·정정됐던 자리다.)
 *
 *   node tools/probe515.js
 *
 * 등재문은 뿌리를 «CSS 2117 `.pr-cond{text-align:left}` 한 곳» 으로 적었다. 확인할 것이 넷이다:
 *   [A] 선언  — `.pr-cond` 의 계산된 `text-align` 이 정말 `left` 이고, 그 값을 주는 규칙이 2117 인가
 *               (다른 규칙·인라인이 이기고 있으면 그 한 줄을 고쳐도 안 낫는다)
 *   [B] 잉크  — **찍힌 픽셀**로 글자 잉크 bbox 중심 x 가 상자 «안쪽 폭» 중심에서 몇 px 밀려 있는가
 *               (DOM 이 아니라 화면. 412·471 이 쓴 방식 — `<p>` 상자는 폭 100% 라 rect 로는 안 보인다)
 *   [C] 기하  — 상자 rect·radius·padding·margin-top (수리가 **한 픽셀도** 안 건드려야 하는 값들)
 *   [D] 처방  — `center` 를 손으로 먹여 보면 [B] 의 밀림이 실제로 0 이 되는가
 *               (= «한 줄 고치면 낫는다» 를 고치기 전에 확인한다. 안 낫는다면 뿌리가 다른 데 있다)
 *
 * 표본은 계급 전부(RANKS 1..n-1) — 320 이 남긴 한 줄은 계급마다 자릿수가 다르다(1 · 246 · 3,000 …).
 * 자릿수가 늘면 왼쪽 정렬의 «쏠림» 이 커지므로 한 계급만 보면 크기를 못 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 남색 상자(#0e1428) 위 밝은 잉크(#EADCC6)의 **찍힌** bbox — 배경과 잉크의 명도차가 커서
   임계 하나로 갈린다(배경 lum ≈ 20 · 잉크 lum ≈ 220). 반올림 오차를 피해 clip 은 정수로 잡는다.
   ⚠ 1회차 함정 — 상자는 `border-radius:40px` 이라 **rect 네 모서리 밖으로 베이지 본문**
   (`#F7ECDA` lum ≈ 237)이 비친다. 그 화소를 세면 잉크 bbox 가 매번 «폭 = 상자 폭» 이 되어
   밀림이 항상 0 으로 읽힌다(실제로 그렇게 읽혔다). ⇒ 세로는 **radius 안쪽 띠**만 본다 —
   그 구간은 모서리와 무관하게 상자 폭 전체가 남색이다. 글자 잉크는 그 띠 안에 들어온다
   (패딩 36 < radius 40 이지만 잉크는 줄 상자 한복판이라 위아래로 4px 씩 잘려도 안 닿는다). */
async function inkBox(page, sel) {
  const r = await page.evaluate(q => {
    const e = document.querySelector(q); if (!e) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return {
      x: b.x, y: b.y, w: b.width, h: b.height,
      pl: parseFloat(cs.paddingLeft), pr: parseFloat(cs.paddingRight),
      bl: parseFloat(cs.borderLeftWidth), br: parseFloat(cs.borderRightWidth),
      rad: parseFloat(cs.borderTopLeftRadius),
    };
  }, sel);
  if (!r) return null;
  const clip = { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) };
  const buf = await page.screenshot({ clip });
  const ink = await page.evaluate(async ([b64, rad]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const yA = Math.ceil(rad), yB = Math.floor(c.height - rad);
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
    for (let y = yA; y < yB; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum > 120) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return n ? { x0, x1, y0, y1, n, cw: c.width, band: [yA, yB] } : { n: 0, cw: c.width, band: [yA, yB] };
  }, [buf.toString('base64'), r.rad]);
  if (!ink.n) return { ...r, ink: null };
  /* 상자 «안쪽»(패딩·테두리 안) 중심 — 잉크가 놓일 수 있는 자리의 한복판 */
  const innerL = r.bl + r.pl, innerR = r.w - r.br - r.pr;
  return {
    ...r, ink,
    inkCx: p2((ink.x0 + ink.x1 + 1) / 2),
    innerCx: p2((innerL + innerR) / 2),
    off: p2((ink.x0 + ink.x1 + 1) / 2 - (innerL + innerR) / 2),
    inkW: ink.x1 - ink.x0 + 1,
    slack: p2(innerR - innerL - (ink.x1 - ink.x0 + 1)),
  };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 30, totalKills: 5000 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPromo === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 정지 — 화소 판정 안정화(554 처방) */

  const ranks = await page.evaluate(() => RANKS.length);
  const open = (ri) => page.evaluate(r => { closeModal(); S.rank = r - 1; openPromo(); }, ri);

  /* ── [A] 선언 층 — 계산값과 캐스케이드 승자 ───────────────────────────────── */
  console.log('\n[A] 선언 — `.pr-cond` 의 text-align 은 어디서 오는가');
  await open(1);
  await page.waitForTimeout(200);
  const decl = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond');
    const p = e.querySelector('p');
    const win = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (_) { continue; }
      for (const r of rules || []) {
        if (!r.selectorText || !r.style || !r.style.textAlign) continue;
        try { if (e.matches(r.selectorText) || p.matches(r.selectorText)) win.push(r.selectorText + ' {text-align:' + r.style.textAlign + '}'); } catch (_) {}
      }
    }
    return {
      box: getComputedStyle(e).textAlign,
      p: getComputedStyle(p).textAlign,
      inline: e.getAttribute('style') || '',
      pInline: p.getAttribute('style') || '',
      rules: win,
    };
  });
  console.log('      규칙: ' + (decl.rules.join(' | ') || '(없음)'));
  ok(decl.box === 'left', 'A1 `.pr-cond` 계산 text-align 이 `left` 다 (등재문 확인)', decl.box);
  ok(decl.p === 'left', 'A2 그 값이 자식 `<p>` 에 상속된다', decl.p);
  ok(decl.inline === '' && decl.pInline === '', 'A3 인라인 style 이 안 끼어 있다 — CSS 한 곳이 전부다',
    JSON.stringify([decl.inline, decl.pInline]));
  ok(decl.rules.length === 1 && /\.pr-cond\b/.test(decl.rules[0]),
    'A4 text-align 을 주는 규칙은 `.pr-cond` **하나뿐**이다 (다른 규칙과 안 싸운다)', String(decl.rules.length) + '개');

  /* ── [B] 잉크 층 — 찍힌 픽셀로 «쏠림» 을 잰다 ─────────────────────────────── */
  console.log('\n[B] 잉크 — 계급마다 잉크 중심이 상자 안쪽 중심에서 몇 px 밀려 있나 (수리 전)');
  const before = [];
  for (let ri = 1; ri <= ranks - 1; ri++) {
    await open(ri);
    await page.waitForTimeout(160);
    const m = await inkBox(page, '#modal .pr179 .pr-cond');
    const txt = await page.evaluate(() => document.querySelector('#modal .pr-cond').textContent.replace(/\s+/g, ' ').trim());
    before.push({ ri, ...m, txt });
    console.log('      계급 ' + String(ri).padStart(2) + ' «' + txt + '» 잉크 ' + String(m.inkW).padStart(3)
      + 'px · 중심 ' + String(m.inkCx).padStart(6) + ' vs 안쪽 중심 ' + m.innerCx
      + ' ⇒ 밀림 ' + String(m.off).padStart(8) + ' · 남는 폭 ' + m.slack);
  }
  ok(before.every(b => b.ink && b.ink.n > 50), 'B1 모든 계급에서 잉크가 찍힌다 (표본이 살아 있다)',
    '최소 ' + Math.min(...before.map(b => b.ink.n)) + 'px');
  ok(before.every(b => b.off < -1), 'B2 잉크가 예외 없이 **왼쪽으로** 쏠려 있다 (등재문 확인)',
    '밀림 ' + p2(Math.min(...before.map(b => b.off))) + ' ~ ' + p2(Math.max(...before.map(b => b.off))) + 'px');
  ok(before.every(b => Math.abs(b.off + b.slack / 2) < 2.5),
    'B3 밀림 = «남는 폭 ÷ 2» 다 — 왼쪽 정렬의 산술 그대로(다른 원인이 섞이지 않았다)',
    before.map(b => p2(b.off + b.slack / 2)).join(' / '));

  /* ── [C] 기하 층 — 수리가 건드리면 안 되는 값 ─────────────────────────────── */
  console.log('\n[C] 기하 — 179/320 실측값 (수리 후 Δ0 이어야 한다)');
  await open(1);
  await page.waitForTimeout(160);
  const geo = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond');
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const b = e.querySelector('b');
    return {
      rect: [Math.round(r.x * 100) / 100, Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100],
      pad: cs.padding, radius: cs.borderRadius, mt: cs.marginTop, bg: cs.backgroundColor,
      pColor: getComputedStyle(e.querySelector('p')).color,
      bColor: b ? getComputedStyle(b).color : null,
    };
  });
  console.log('      ' + JSON.stringify(geo));
  ok(geo.pad === '36px 44px', 'C1 padding 36px 44px', geo.pad);
  ok(geo.radius === '40px', 'C2 border-radius 40px', geo.radius);
  ok(geo.mt === '36px', 'C3 margin-top 36px', geo.mt);
  ok(geo.bColor === 'rgb(234, 220, 198)', 'C4 `<b>` 색 #EADCC6 (320 특이도 0-4-1 이 이기고 있다)', geo.bColor);

  /* ── [D] 처방 층 — `center` 한 줄이 실제로 [B] 를 0 으로 만드는가 ──────────── */
  console.log('\n[D] 처방 — `text-align:center` 를 손으로 먹여 같은 자를 다시 댄다');
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'probe515';
    st.textContent = '.mbody .pr179 .pr-cond{text-align:center}';
    document.head.appendChild(st);
  });
  const after = [];
  for (let ri = 1; ri <= ranks - 1; ri++) {
    await open(ri);
    await page.waitForTimeout(160);
    const m = await inkBox(page, '#modal .pr179 .pr-cond');
    after.push({ ri, ...m });
    console.log('      계급 ' + String(ri).padStart(2) + ' 밀림 ' + String(m.off).padStart(7)
      + ' (수리 전 ' + before[ri - 1].off + ')');
  }
  ok(after.every(a => Math.abs(a.off) <= 2), 'D1 `center` 면 잉크 중심이 안쪽 중심 ±2px 안이다',
    '최대 ' + p2(Math.max(...after.map(a => Math.abs(a.off)))) + 'px');
  ok(after.every((a, i) => Math.abs(a.inkW - before[i].inkW) <= 2),
    'D2 잉크 폭은 안 변한다 — 글자 크기·자간을 안 건드린다',
    after.map((a, i) => a.inkW - before[i].inkW).join(','));
  const geo2 = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond');
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { rect: [Math.round(r.x * 100) / 100, Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100],
      pad: cs.padding, radius: cs.borderRadius, mt: cs.marginTop,
      bColor: getComputedStyle(e.querySelector('b')).color };
  });
  ok(JSON.stringify(geo2.rect) === JSON.stringify(geo.rect) && geo2.pad === geo.pad
    && geo2.radius === geo.radius && geo2.mt === geo.mt && geo2.bColor === geo.bColor,
    'D3 상자 rect·padding·radius·margin·`<b>` 색이 **전부 Δ0** (글자만 움직인다)',
    JSON.stringify(geo2.rect) + ' vs ' + JSON.stringify(geo.rect));

  ok(errs.length === 0, 'E1 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE515 ' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
