#!/usr/bin/env node
/* 작업 940 게이트 — «`rwMulFit()` 의 CSS 예산 JS 사본을 지웠다 — 자 막대로 제품에게 묻는다»
 *
 *   node tools/verify940.js
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────────────
 * 등재문의 결함은 «`rwMulFit()` 이 제품 `--rw-av` 사슬을 손으로 옮겨 적은 사본인데 늙었다» 다 —
 * 879 7회차가 «아래 예약 174 → **182**» 로 제품을 옮길 때 이 사본만 안 따라와 1600 에서
 * av 139.10(제품 135.09)을 들고 있었다. 그 전에는 813 10회차가 같은 자리의 «24(g3)» 가
 * 늙은 것을 고쳤다 — **같은 자리가 두 번 늙었다.**
 *
 * ⚑ **이 결함의 얼굴이 «초록» 이라는 것이 이 자의 존재 이유다.** 배율은 다섯 프레임 전부
 *   `min()` 의 **1 에 붙어** 있어서(`verify879` §R2 «배율 1 을 강제해도 Δ0») 틀린 av 가
 *   결과를 안 바꿨다. 즉 «맞아서» 가 아니라 «안 물려서» 조용했고, 그래서 `verify879` [1]
 *   («JS 사본 드리프트 감지»)조차 이 갈림을 **못 봤다** — 클램프가 둘을 같은 1 로 뭉갠다.
 *   ⇒ 이 자는 클램프가 **안 무는 자리**를 일부러 만들어(제품 `--rw-av` 를 덮어) 거기서
 *   «제품이 예산을 옮기면 배율이 따라오는가» 를 묻는다. 사본은 안 따라오고 자는 따라온다.
 *
 *   [1] 사본 0줄  — `rwMulFit()` 본문에 예산 사슬 상수(174·182·830·1527·516·g3)가 **한 개도 없다**(소스).
 *   [2] 항등식    — 배율 = min(1, (그려진 av/rwc − 16 − 20.47) / 98) · 다섯 프레임(제품 쪽에서).
 *   [3] Δ0px     — 사본이 내던 값(1.0000)을 강제해도 그려진 바가 **다섯 프레임 전부 Δ0** —
 *                  이 수리는 그리는 것을 한 픽셀도 안 바꿨다(무해했던 갈림을 무해한 채로 닫았다).
 *   §R  ★ 이빨    — 제품 `--rw-av` 를 덮으면 **배율이 따라온다**. 그 자리에서 **옛 사본은 안 따라온다**
 *                  (사본은 CSS 를 안 읽는다) — 되돌리면 이 항이 빨개진다.
 *   §R2 닫힌 팝업 — 높이 0 에서는 **아무것도 안 얹고**(폴백 1), `openRelw()` 가 켠 뒤에 얹힌다.
 *                  926 이 상인방에 세운 «0 을 얹으면 사라진다» 난간을 배수 바도 같이 탄다.
 *
 * 127 — 브라우저 해석 tools/pwlaunch.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

/* 제품 상수와 한 벌 — 갈라지면 [2] 가 빨개진다(그것이 이 항의 일이다). */
const SHELL_H = 98;                    /* RW_MB_H  — 셸 높이 */
const PED_GAP = 16;                    /* RW_MB_FL = RW_MB_PED(16) − RW_MB_SEAT(0) */
const ROW_G = 26, GAP_K = 1.5, GTAIL = 18.53;
const RESERVE = ROW_G * GAP_K - GTAIL; /* RW_MB_GAP — 상자 하변에서 재는 예약 */
const AV_OVR = 100;                    /* §R — 클램프가 «안 무는» 자리를 만드는 덮개(px, CSS px) */

let pass = 0, fail = 0;
const ok = (c, name, got) => { c ? pass++ : fail++;
  console.log((c ? 'PASS ' : 'FAIL ') + name + (got == null ? '' : ' — ' + got)); };

/* 그려진 상자에서 되잰다 — 자 막대는 제품 `rwRuler` 가 쓰는 것과 같은 꼴이다. */
const MEASURE = `(() => {
  const el = document.getElementById('relw');
  const panel = el.querySelector('.rw-bowl') || el.querySelector('.rw-panel');
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const px = (e) => { ruler.style.height = e; return ruler.getBoundingClientRect().height; };
  const sc = px('calc(1000px * var(--rwc,1))') / 1000;
  const av = px('var(--rw-av)');
  ruler.remove();
  const bar = el.querySelector('#rwMulBar').getBoundingClientRect();
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    sc, av, avCss: av / sc,
    mbs: parseFloat(el.style.getPropertyValue('--rw-mbs')) || null,
    mbsRaw: el.style.getPropertyValue('--rw-mbs'),
    bar: { w: r2(bar.width), h: r2(bar.height), x: r2(bar.x), y: r2(bar.y) },
    /* 940 이 지운 **옛 JS 사본** — 이 자 안에서만 되살려 «사본은 안 따라온다» 를 보인다.
       (제품에는 한 줄도 없다 — [1] 이 그것을 소스에서 못박는다.) */
    copy: (() => {
      const s = sc;
      const panelH = frameH - RW_TOP - RW_BOT - RW_PCB;
      const bowlH = Math.min(panelH, 1527 * s);
      const sp = bowlH - 830 * s;
      const g3 = Math.min(24 * s, Math.max(17 * s, sp * 0.033 + 1.9 * s));
      const tt = bowlH - (88 + 12 + 226) * s - g3 - 516 * s;
      const avc = Math.min(186 * s, (tt - 174 * s) / 2, tt - 285 * s);
      return { av: avc, avCss: avc / s };
    })(),
  };
})()`;

async function open(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(250);
  return { ctx, page };
}

async function measure(browser, H, css) {
  const { ctx, page } = await open(browser, H, css);
  const m = await page.evaluate(MEASURE);
  await ctx.close();
  return m;
}

/* 배율의 항등식 — 제품이 푸는 것과 **같은 식**을 그려진 av 에 적용한다. */
const want = (avCss) => Math.min(1, (avCss - PED_GAP - RESERVE) / SHELL_H);

(async () => {
  const browser = await launch(chromium);

  /* ── [1] 사본 0줄 (소스) ────────────────────────────────────────────────── */
  const fn = SRC.match(/function rwMulFit\(\)\{[\s\S]*?\n\}/);
  const body = fn ? fn[0] : '';
  /* 예산 사슬의 상수들 — 하나라도 되살아나면 사본이 돌아온 것이다.
     ⚠ 문자열이 아니라 **수**로 찾는다(주석은 위에 있고 본문만 잘라 왔다). */
  const back = ['174', '182', '830', '1527', '516', '285', '186'].filter(n => new RegExp('\\b' + n + '\\b').test(body));
  ok(fn && back.length === 0 && /rwRuler\(/.test(body) && /var\(--rw-av\)/.test(body),
    '[1] ★ `rwMulFit()` 본문에 **예산 사슬 상수가 한 개도 없다** — 식을 옮겨 적지 않고 `rwRuler` 로 제품 `--rw-av` 에게 묻는다(402 «사본을 지운다»)',
    fn ? (back.length ? '되살아난 상수 ' + back.join('·') : '사본 0줄 · rwRuler ✓ · var(--rw-av) ✓')
       : '`function rwMulFit()` 를 못 찾았다(인자를 받는 옛 꼴인가)');

  /* ── [2] 항등식 — 다섯 프레임 ──────────────────────────────────────────── */
  const r = {};
  for (const H of FRAMES) r[H] = await measure(browser, H, '');
  const bad2 = FRAMES.filter(H => Math.abs(r[H].mbs - want(r[H].avCss)) > 0.0005);
  ok(bad2.length === 0,
    '[2] ★ 배율 = min(1, (**그려진** 니치 av − ' + PED_GAP + ' − ' + RESERVE.toFixed(2) + ') / ' + SHELL_H + ') — 다섯 프레임 전부 제품이 그린 av 와 맞는다',
    FRAMES.map(H => H + ':' + r[H].mbs.toFixed(4) + '↔' + want(r[H].avCss).toFixed(4)
      + '(av ' + r[H].avCss.toFixed(2) + ')').join(' · '));

  /* ── [2b] 갈림이 실재했다 — 1600 에서 사본 av ≠ 제품 av ─────────────────
     이 항이 «수리 전에 정말 갈려 있었는가» 를 매 실행 다시 찍는다(등재문의 139.10 ↔ 135.09). */
  ok(Math.abs(r[1600].copy.avCss - r[1600].avCss) > 3,
    '[2b] ★ 1600 에서 **옛 사본 av ↔ 제품 av 가 실제로 갈려 있다** — 등재문의 갈림이 유령이 아니었음을 매 실행 찍는다(사본은 이 자 안에만 남았다)',
    '사본 ' + r[1600].copy.avCss.toFixed(2) + ' ↔ 제품 ' + r[1600].avCss.toFixed(2)
      + ' (Δ ' + (r[1600].copy.avCss - r[1600].avCss).toFixed(2) + ')');

  /* ── [3] Δ0px — 사본이 내던 값을 강제해도 그려진 바가 안 움직인다 ──────── */
  const bad3 = [];
  for (const H of FRAMES) {
    const c = want(r[H].copy.avCss);                    /* 사본이 냈을 배율 */
    const { ctx, page } = await open(browser, H, '');
    const b = await page.evaluate((v) => {
      document.getElementById('relw').style.setProperty('--rw-mbs', v.toFixed(4));
      const q = document.querySelector('#relw #rwMulBar').getBoundingClientRect();
      const r2 = (x) => Math.round(x * 100) / 100;
      return { w: r2(q.width), h: r2(q.height), x: r2(q.x), y: r2(q.y) };
    }, c);
    await ctx.close();
    const d = ['w', 'h', 'x', 'y'].map(k => Math.abs(b[k] - r[H].bar[k]));
    if (Math.max(...d) > 0.01) bad3.push(H + '(Δ' + Math.max(...d).toFixed(2) + ')');
  }
  ok(bad3.length === 0,
    '[3] ★ 사본이 내던 배율을 강제해도 그려진 바가 **다섯 프레임 전부 Δ0px** — 이 수리는 그리는 것을 한 픽셀도 안 바꿨다(무해했던 갈림을 무해한 채로 닫았다)',
    bad3.length ? '움직인 프레임 ' + bad3.join(' · ')
      : FRAMES.map(H => H + ':' + r[H].bar.w.toFixed(1) + '×' + r[H].bar.h.toFixed(1)).join(' · '));

  /* ── §R ★ 이빨 — 제품이 예산을 옮기면 배율이 따라온다 ────────────────────
     클램프가 다섯 프레임 전부 1 에 붙어 있어서 «사본이 늙었다» 는 그냥은 안 보인다
     (그래서 `verify879` [1] 도 못 봤다). 여기서는 제품 `--rw-av` 를 덮어 클램프를 풀고 묻는다. */
  /* ⚠ 덮개는 `#relw` 가 아니라 **`.rw-panel`** 에 얹는다 — 예산 변수가 거기 살아서
     `#relw` 에 얹으면 더 가까운 선언이 이겨 **아무 일도 안 일어난다**(`verify879` 5회차가
     한 번 겪었고 그 자의 주석이 적어 둔 함정 · 이 자도 1회차에 그대로 밟았다). */
  const { ctx: ctxR, page: pageR } = await open(browser, 1600, '');
  const ovr = await pageR.evaluate(async (v) => {
    document.querySelector('#relw .rw-panel').style.setProperty('--rw-av', v + 'px', 'important');
    rwMulFit();                                          /* 덮개를 얹은 뒤 다시 재게 한다 */
    await new Promise(r => setTimeout(r, 60));
    return null;
  }, AV_OVR).then(() => pageR.evaluate(MEASURE));
  await ctxR.close();
  const wantOvr = want(AV_OVR);                          /* 자로 재면 따라오는 값 */
  const copyOvr = want(ovr.copy.avCss);                  /* 사본은 CSS 를 안 읽어 안 따라온다 */
  ok(Math.abs(ovr.mbs - wantOvr) < 0.002 && wantOvr < 0.95 && Math.abs(copyOvr - 1) < 1e-9,
    '§R ★ 제품 `--rw-av` 를 ' + AV_OVR + 'px 로 덮으면 **배율이 따라온다**(자로 재니까) — 그 자리에서 **옛 사본은 1 에 붙은 채 안 따라온다**. 사본으로 되돌리면 이 항이 빨개진다',
    '얹힌 ' + ovr.mbs.toFixed(4) + ' ↔ 자 ' + wantOvr.toFixed(4)
      + ' · 사본 ' + copyOvr.toFixed(4) + '(av ' + ovr.copy.avCss.toFixed(2) + ' — 덮개를 못 본다)');

  /* ── §R2 닫힌 팝업 — 아무것도 안 얹는다 · 켠 뒤에 얹힌다 ─────────────────── */
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
  const page2 = await ctx2.newPage();
  await page2.goto(URL);
  await page2.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  const shut = await page2.evaluate(() => {
    rwFit();                                   /* 닫힌 채로 부른다 — 패널 높이 0 */
    return document.getElementById('relw').style.getPropertyValue('--rw-mbs');
  });
  const lit = await page2.evaluate(async () => {
    S.relic = 1e9; openRelw();
    await new Promise(r => setTimeout(r, 200));
    return document.getElementById('relw').style.getPropertyValue('--rw-mbs');
  });
  await ctx2.close();
  ok(shut.trim() === '' && parseFloat(lit) > 0,
    '§R2 ★ 닫힌 팝업(높이 0)에서는 **아무것도 안 얹고**(폴백 `var(--rw-mbs,1)` 이 이긴다) `openRelw()` 가 켠 뒤에 얹힌다 — 926 이 상인방에 세운 난간을 배수 바도 같이 탄다',
    '닫힘 «' + shut + '»(빈 값이 정답) → 켠 뒤 ' + lit);

  await browser.close();
  console.log('\nVERIFY940 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
