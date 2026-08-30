#!/usr/bin/env node
/* 게이트 — 작업 515 「승급전 «권장 스테이지» 한 줄 = 가운데 정렬」 (저장소 주인 지시 2026-08-31)
 *
 *   node tools/verify515.js
 *
 * 지키는 성질 (PROGRESS 515 행의 ⑴~⑸ 그대로)
 *   [A] 선언   — `.pr-cond` 계산 `text-align === 'center'` · 그 값을 주는 규칙이 **하나뿐**이고
 *                인라인이 안 끼어 있다(고칠 자리가 한 곳이라는 것 자체가 성질이다).
 *   [B] 찍힌 픽셀 — 잉크 bbox 중심 x 가 상자 **안쪽 폭** 중심 ±2px (412·471 방식).
 *                계급 전부를 돈다 — 320 이 남긴 한 줄은 계급마다 자릿수가 다르다.
 *   [C] 기하   — 상자 rect(x·폭·높이)·`padding`·`border-radius`·`margin-top` 이 **수리 전과 동일**.
 *                179/320 실측값이라 한 픽셀도 못 움직인다. 값은 `probe515` 가 수리 전 트리에서 잰 것.
 *   [D] 색     — `<b>`·`<p>` 잉크가 `#EADCC6` 유지(320 특이도 0-4-1 회귀 — 셀렉터를 건드리면
 *                `.mbody p b`(갈색)로 되돌아가 179 결함이 재발한다). 남색 상자 위 밝기도 화소로 본다.
 *   [E] 범위   — 주인이 지목한 것은 «권장 스테이지 그거» 한 줄이다. 형제(`.pr-note` 가운데·
 *                `.pr-rw-t` 왼쪽)의 정렬은 **안 건드린다**.
 *   [F] 짝 프레임 — 9:13.3(1080×1600)에서도 같은 성질(351 규약 — 9:19 만 보고 닫지 않는다).
 *   [G] 되돌림 시험 — `text-align:left` 를 도로 심으면 [B] 가 **실제로 빨개진다**.
 *                (없으면 «이미 참인 것을 굳힌 게이트» 와 구별이 안 된다 — 338 교훈.)
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «선언 → 찍힌 픽셀» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280, H2 = 1600;

/* 수리 전 실측(probe515 [C], 2026-08-31 · 1080×2280) — 이 값이 움직이면 «글자만» 이 아니다 */
const GEO0 = { x: 130, w: 820, h: 153.59, pad: '36px 44px', radius: '40px', mt: '36px' };
const INK = 'rgb(234, 220, 198)';   /* #EADCC6 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 찍힌 잉크 bbox — 상자 배경(#0e1428) 위 밝은 화소.
   ⚠ `border-radius:40px` 이라 rect 네 모서리 밖으로 베이지 본문이 비친다. 그 화소를 세면
   bbox 가 매번 «상자 폭» 이 되어 밀림이 항상 0 으로 읽힌다(probe515 1회차에 실제로 그랬다).
   ⇒ 세로는 **radius 안쪽 띠**만 본다 — 그 구간은 상자 폭 전체가 남색이다. */
async function inkBox(page, sel) {
  const r = await page.evaluate(q => {
    const e = document.querySelector(q); if (!e) return null;
    const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return {
      x: b.x, y: b.y, w: b.width, h: b.height,
      pl: parseFloat(cs.paddingLeft), pr: parseFloat(cs.paddingRight),
      bl: parseFloat(cs.borderLeftWidth), br: parseFloat(cs.borderRightWidth),
      rad: parseFloat(cs.borderTopLeftRadius),
    };
  }, sel);
  if (!r) return null;
  const buf = await page.screenshot({ clip: { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) } });
  const ink = await page.evaluate(async ([b64, rad]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const yA = Math.ceil(rad), yB = Math.floor(c.height - rad);
    let x0 = 1e9, x1 = -1, n = 0, bright = 0;
    for (let y = yA; y < yB; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum > 120) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (lum > 180) bright++; }
    }
    return { x0, x1, n, bright, cw: c.width };
  }, [buf.toString('base64'), r.rad]);
  if (!ink.n) return { ...r, ink, inkCx: null, off: null };
  const innerL = r.bl + r.pl, innerR = r.w - r.br - r.pr;
  return {
    ...r, ink,
    inkW: ink.x1 - ink.x0 + 1,
    inkCx: p2((ink.x0 + ink.x1 + 1) / 2),
    innerCx: p2((innerL + innerR) / 2),
    off: p2((ink.x0 + ink.x1 + 1) / 2 - (innerL + innerR) / 2),
  };
}

async function boot(browser, h) {
  const ctx = await browser.newContext({ viewport: { width: W, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 30, totalKills: 5000 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPromo === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; });   /* 554 처방 — 측정 창에서 전투를 세운다 */
  return { page, errs };
}
const open = (page, ri) => page.evaluate(r => { closeModal(); S.rank = r - 1; openPromo(); }, ri);

(async () => {
  const browser = await launch(chromium);
  const code = fs.readFileSync(SRC, 'utf8');

  /* ══ [A] 선언 ══════════════════════════════════════════════════════════════ */
  const declLine = (code.match(/\.mbody \.pr179 \.pr-cond\{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ');
  ok(/text-align:center/.test(declLine), '[A0] 소스 — `.pr-cond` 선언이 `text-align:center`', declLine.slice(0, 90));
  ok(!/text-align:\s*left/.test(declLine), '[A0] 소스 — 옛 `left` 가 같은 선언에 안 남아 있다');

  const { page, errs } = await boot(browser, H);
  const ranks = await page.evaluate(() => RANKS.length);
  await open(page, 1);
  await page.waitForTimeout(220);

  const decl = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond'), p = e.querySelector('p');
    const win = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (_) { continue; }
      for (const r of rules || []) {
        if (!r.selectorText || !r.style || !r.style.textAlign) continue;
        try { if (e.matches(r.selectorText) || p.matches(r.selectorText)) win.push(r.selectorText); } catch (_) {}
      }
    }
    return { box: getComputedStyle(e).textAlign, p: getComputedStyle(p).textAlign,
      inline: e.getAttribute('style') || '', rules: win };
  });
  ok(decl.box === 'center', '[A1] 계산 `text-align === center`', decl.box);
  ok(decl.p === 'center', '[A2] 자식 `<p>` 까지 상속된다', decl.p);
  ok(decl.rules.length === 1 && /\.pr-cond/.test(decl.rules[0]) && decl.inline === '',
    '[A3] 정렬을 주는 규칙은 `.pr-cond` 하나뿐 · 인라인 0', decl.rules.join('|') || '(없음)');

  /* ══ [B] 찍힌 픽셀 — 계급 전부 ══════════════════════════════════════════════ */
  const rows = [];
  for (let ri = 1; ri <= ranks - 1; ri++) {
    await open(page, ri);
    await page.waitForTimeout(150);
    const m = await inkBox(page, '#modal .pr179 .pr-cond');
    const txt = await page.evaluate(() => document.querySelector('#modal .pr-cond').textContent.replace(/\s+/g, ' ').trim());
    rows.push({ ri, txt, ...m });
  }
  console.log(rows.map(r => '      계급 ' + String(r.ri).padStart(2) + ' «' + r.txt + '» 잉크 '
    + String(r.inkW).padStart(3) + 'px · 밀림 ' + String(r.off).padStart(6)).join('\n'));
  ok(rows.every(r => r.ink.n > 500), '[B1] 계급 ' + (ranks - 1) + '개 전부에서 잉크가 찍힌다',
    '최소 ' + Math.min(...rows.map(r => r.ink.n)) + 'px');
  ok(rows.every(r => Math.abs(r.off) <= 2), '[B2] 잉크 중심이 상자 안쪽 중심 ±2px',
    '최대 |밀림| ' + p2(Math.max(...rows.map(r => Math.abs(r.off)))) + 'px');
  ok(rows.every(r => r.inkW >= 300 && r.inkW <= 400),
    '[B3] 잉크 폭이 수리 전 범위(315~343) 그대로 — 글자 크기·자간을 안 건드렸다',
    Math.min(...rows.map(r => r.inkW)) + '~' + Math.max(...rows.map(r => r.inkW)) + 'px');
  ok(rows.every(r => /^권장 스테이지 /.test(r.txt)) && rows.length === ranks - 1,
    '[B4] 320 회귀 — 상자 안은 «권장 스테이지 n» 한 줄 그대로');

  /* ══ [C] 기하 — 수리 전과 동일 ══════════════════════════════════════════════ */
  await open(page, 1);
  await page.waitForTimeout(150);
  const geo = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond'), cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { x: Math.round(r.x * 100) / 100, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
      pad: cs.padding, radius: cs.borderRadius, mt: cs.marginTop, bg: cs.backgroundColor };
  });
  ok(geo.x === GEO0.x && geo.w === GEO0.w, '[C1] 상자 x·폭 Δ0 (수리 전 ' + GEO0.x + '/' + GEO0.w + ')', geo.x + '/' + geo.w);
  ok(Math.abs(geo.h - GEO0.h) < 0.5, '[C2] 상자 높이 Δ0 (수리 전 ' + GEO0.h + ')', String(geo.h));
  ok(geo.pad === GEO0.pad && geo.radius === GEO0.radius && geo.mt === GEO0.mt,
    '[C3] padding·radius·margin-top Δ0', [geo.pad, geo.radius, geo.mt].join(' · '));
  ok(geo.bg === 'rgb(14, 20, 40)', '[C4] 상자 배경 #0e1428 그대로', geo.bg);

  /* ══ [D] 색 — 320 특이도 회귀 ══════════════════════════════════════════════ */
  const col = await page.evaluate(() => {
    const e = document.querySelector('#modal .pr179 .pr-cond');
    return { p: getComputedStyle(e.querySelector('p')).color, b: getComputedStyle(e.querySelector('b')).color };
  });
  ok(col.b === INK, '[D1] `<b>` 색 #EADCC6 — `.mbody p b`(갈색)를 여전히 이긴다', col.b);
  ok(col.p === INK, '[D2] `<p>` 색 #EADCC6', col.p);
  const bright = rows[0].ink.bright;
  ok(bright > 1000, '[D3] 남색 상자 위 잉크가 화소로도 밝다(179 결함 재발 감시)', bright + 'px');

  /* ══ [E] 범위 — 형제는 안 건드렸다 ════════════════════════════════════════ */
  const sib = await page.evaluate(() => {
    const g = q => { const e = document.querySelector(q); return e ? getComputedStyle(e).textAlign : null; };
    return { note: g('#modal .pr179 .pr-note'), rwt: g('#modal .pr179 .pr-rw-t'), rwh: g('#modal .pr179 .pr-rw>h3') };
  });
  ok(sib.rwt === 'left', '[E1] `.pr-rw-t`(보상 글줄)은 왼쪽 정렬 그대로 — 범위 밖', String(sib.rwt));
  ok(/\.pr-rw-t\{[^}]*text-align:left/.test(code.replace(/\s+/g, '')),
    '[E2] 소스 — `.pr-rw-t{text-align:left}` 선언이 살아 있다');
  ok(sib.note !== 'left', '[E3] `.pr-note` 는 본문 정렬(가운데) 그대로', String(sib.note));

  /* ══ [F] 짝 프레임 9:13.3 ═════════════════════════════════════════════════ */
  const { page: p16, errs: e16 } = await boot(browser, H2);
  await open(p16, 3);
  await p16.waitForTimeout(220);
  const m16 = await inkBox(p16, '#modal .pr179 .pr-cond');
  const a16 = await p16.evaluate(() => getComputedStyle(document.querySelector('#modal .pr179 .pr-cond')).textAlign);
  ok(a16 === 'center' && m16 && Math.abs(m16.off) <= 2,
    '[F1] 9:13.3(1080×1600)에서도 가운데 — 밀림 ' + (m16 ? m16.off : 'n/a') + 'px', a16);
  ok(e16.length === 0, '[F2] 9:13.3 콘솔 에러 0건', e16.slice(0, 2).join(' | '));
  await p16.context().close();

  /* ══ [G] 되돌림 시험 ══════════════════════════════════════════════════════ */
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'rev515';
    st.textContent = '.mbody .pr179 .pr-cond{text-align:left}';
    document.head.appendChild(st);
  });
  await open(page, 3);
  await page.waitForTimeout(180);
  const rev = await inkBox(page, '#modal .pr179 .pr-cond');
  ok(Math.abs(rev.off) > 100, '[G1] `left` 로 되돌리면 [B2] 가 실제로 빨개진다 (무른 자가 아니다)',
    '밀림 ' + rev.off + 'px');
  await page.evaluate(() => { const s = document.getElementById('rev515'); if (s) s.remove(); });
  await open(page, 3);
  await page.waitForTimeout(180);
  const back = await inkBox(page, '#modal .pr179 .pr-cond');
  ok(Math.abs(back.off) <= 2, '[G2] 되돌림을 걷으면 다시 초록', '밀림 ' + back.off + 'px');

  ok(errs.length === 0, '[H1] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nVERIFY515 ' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
