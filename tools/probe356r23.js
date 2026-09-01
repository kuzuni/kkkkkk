#!/usr/bin/env node
/* 작업 356 — 23회차 재현자: **찌그러짐의 출처가 «CSS transform» 하나가 아니다** (338 규칙 — 처방 전에 재현)
 *
 *   node tools/probe356r23.js                현행 트리
 *   node tools/probe356r23.js --pre          616 직전 트리(.p356r23-pre616.html)로 **같은 자**를 돌린다
 *   node tools/probe356r23.js --json
 *
 * ── 왜 이 자가 필요한가 ────────────────────────────────────────────────────────
 * 22회차까지 `scan356` 은 71화면 · 3,790노드를 훑고 **0건**을 보고했다. 그런데 같은 날
 * **616**(다른 워커)이 눈으로 찾아낸 것이 있었다 — 레이드 측정장 마법사 **×1.45** ·
 * 아레나 기사 **×1.65**. 22회차 동안 스캐너가 그 자리를 «초록» 으로 지나쳤다.
 *
 * 게을러서가 아니라 **판정식이 보는 축이 하나뿐**이었기 때문이다. `scan356.COLLECT` 는
 *   ⓐ 자기 + 조상의 `transform`/`scale` 누적  ⓑ `IMG` 의 «상자 종횡 ÷ 원본 종횡»(object-fit:fill)
 * 둘만 본다. 616 의 자리는 그 둘 **어느 쪽도 아니다** — `drawSpriteTo()` 가
 * `ctx.drawImage(atlas, sx,sy,sw,sh, dx,dy, W, H−padY*2)` 로 **캔버스 안에서** 늘려 그렸다.
 * DOM 에는 흔적이 없다. `getComputedStyle` 로는 영원히 안 보인다.
 *
 * ⇒ 이 자는 «그림이 찌그러지는 방법» 을 축으로 갈라 전수로 센다:
 *     [2-a] 캔버스 **비트맵 종횡 ↔ CSS 상자 종횡**            (DOM · 스캐너 눈 밖)
 *     [2-b] `ctx.drawImage` 의 **(dw/dh) ÷ (sw/sh)**          (런타임 훅 · 616 이 눈으로 찾은 축)
 *     [3]   `svg` 의 **viewBox 종횡 ↔ 상자 종횡**             (preserveAspectRatio="none" 일 때만 늘어난다)
 *
 * ⚠ **[1] 역방향 증명이 이 자의 본체다**(21회차 교훈 — «노드가 없어서 0건» 과 «값이 옳아서 0건» 은
 *    다른 말이고, 자는 둘을 같은 초록으로 찍는다). 616 «직전» 트리를 같은 자로 돌려
 *    ×1.45·×1.65 를 **실제로 받아내야** 현행의 0건이 뜻을 갖는다.
 *
 * ⚠ 화면 목록·단계는 `scan356` 에서 **그대로 가져온다**(자를 두 벌로 안 적는다 — 13회차 [R12]).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, STEP, TOL, HTML } = require('./scan356.js');

const ROOT = path.resolve(__dirname, '..');
const PRE = process.argv.includes('--pre');
const JSON_OUT = process.argv.includes('--json');
const PRE_REL = '.p356r23-pre616.html';                 /* 저장소 루트 — assets/** 를 상대 경로로 문다 */
const PRE_ABS = path.join(ROOT, PRE_REL);
const FILE = PRE ? PRE_ABS : HTML;
const URL = 'file://' + FILE.replace(/\\/g, '/');

/* 616 직전 = `wip(616) 1회차` 의 부모. 없으면 뽑는다(끝나면 지운다 — .gitignore 등재). */
const PRE_REV = process.env.P356R23_PRE || '319277e^';

/* 표본의 «날짜» — 작업 631. 얕은 클론에서 표본을 파 올 때 깊이를 **커밋 수로 세면 썩는다**:
   26회차가 세운 `--deepen=40` 은 그날에만 맞던 값이고, 워커 4대가 도는 이 저장소는 시간당
   약 26커밋이라 그 40 이 덮는 것은 **약 1.5시간**뿐이었다(631 실측 — 그 뒤 뜨는 컨테이너는
   전부 `verify356` 187/188 을 봤다). **날짜는 표본이 고정인 한 안 썩는다.**
   ⚠ **표본(`PRE_REV`)을 옮기면 이 줄도 같이 옮겨라** — 둘은 한 벌이다.
   값은 표본 `319277e`(2026-09-01T01:09:45Z)와 그 부모 `25c21c2`(01:31:49Z — 리베이스 때문에
   부모가 더 «나중» 이다) **둘 다보다 앞선** 시각으로, 여유 2시간을 얹었다. */
const PRE_DATE = process.env.P356R23_PRE_DATE || '2026-08-31T23:00:00Z';

/* 표본을 이 클론에 데려온다(없으면 판다) — 631.
   ⓐ **날짜로 판다**(`--shallow-since=PRE_DATE`) · ⓑ 서버가 날짜를 거절하면 배수 깊이 그물
   (160 → 640) · 못 닿으면 **null 을 돌려준다**(호출부가 빨개진다).
   ⚠ «못 팠으니 건너뛴다» 는 금지다 — 26회차 교훈 ④(표본을 못 가져오면 여전히 빨갛다).
   돌려주는 문자열은 PASS 문구에 그대로 붙는 «어떻게 팠는지» 꼬리표다(빈 문자열 = 이미 있었다). */
function digPre(rev = PRE_REV, since = PRE_DATE, budgetMs = 240000) {
  /* 756 — 사다리(날짜 → 배수 깊이 → 전체)는 **공용 부품 한 벌**에 있다. 여기는 축(표본·날짜)만 세운다.
     ⚠ 자를 두 벌로 안 적는다(13회차 [R12]) — 631 이 이 함수에 대고 세운 [A]·[B]·[C]·[R] 은
     그대로 서 있고, «날짜를 먼저 세운다» 는 이제 `tools/gitrev756.js` 의 `ladder()` 가 답한다. */
  return require('./gitrev756').dig(rev, { since, budgetMs, cwd: ROOT });
}

let PASS = 0, FAIL = 0;
const ok = (c, m) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✓' : '✗'} ${m}`); return c; };

/* ── 페이지에 심는 훅 — 첫 스크립트보다 먼저 돈다 ──────────────────────────────
   drawImage 는 **프로토타입**에 있으므로 컨텍스트가 만들어지기 전에 갈아 끼워야 전수가 된다. */
function initHook(tol) {
  window.__r23 = { calls: 0, err: 0, bad: {}, ctxNonUni: 0 };
  const P = CanvasRenderingContext2D.prototype;
  const orig = P.drawImage;
  const sel = (c) => {
    if (!c) return '(no canvas)';
    const out = [];
    let e = c, n = 0;
    while (e && e !== document.body && n++ < 5) {
      let s = e.tagName ? e.tagName.toLowerCase() : '?';
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  };
  /* ⚠ **컨텍스트 변환은 drawImage 안에서 안 읽는다.** `getTransform()` 은 호출마다 DOMMatrix 를
     새로 만들어서, 60fps 전투 캔버스(초당 수천 호출)에서는 훅 자체가 게임을 느리게 만든다
     — 1회차 실행이 그래서 71화면을 다 못 돌았다. 대신 **변환을 거는 쪽**(scale/transform/
     setTransform)을 훅해 «비균등 변환이 걸린 적이 있는가» 를 컨텍스트마다 표시로 남긴다.
     이쪽은 호출 수가 몇 자리 적고, 축의 뜻은 같다(뒤집기 scale(-1,1) 은 |sx|=|sy| 라 안 걸린다). */
  const NU = new WeakMap();                              /* ctx → 비균등 변환이 걸린 적 있는가 */
  const mark = (ctx, sx, sy) => {
    if (!(sx > 0) || !(sy > 0)) { sx = Math.abs(sx); sy = Math.abs(sy); }
    if (sx > 0 && sy > 0 && Math.abs(sx / sy - 1) > 1e-6) {
      NU.set(ctx, (NU.get(ctx) || 0) + 1);
      window.__r23.ctxNonUni++;
    }
  };
  const oScale = P.scale, oTr = P.transform, oSet = P.setTransform;
  P.scale = function (x, y) { try { mark(this, x, y); } catch (e) {} return oScale.apply(this, arguments); };
  P.transform = function (a1, b1, c1, d1) {
    try { mark(this, Math.hypot(a1, b1), Math.hypot(c1, d1)); } catch (e) {}
    return oTr.apply(this, arguments);
  };
  P.setTransform = function (a1, b1, c1, d1) {
    try { if (typeof a1 === 'number') mark(this, Math.hypot(a1, b1), Math.hypot(c1, d1)); } catch (e) {}
    return oSet.apply(this, arguments);
  };

  P.drawImage = function (img) {
    const a = arguments;
    try {
      let sw = 0, sh = 0, dw = 0, dh = 0;
      if (a.length === 9) { sw = a[3]; sh = a[4]; dw = a[7]; dh = a[8]; }
      else if (a.length === 5) {
        sw = img.naturalWidth || img.videoWidth || img.width || 0;
        sh = img.naturalHeight || img.videoHeight || img.height || 0;
        dw = a[3]; dh = a[4];
      } else { /* 3인자꼴 = 원본 크기 그대로. 늘어날 수가 없다 */ }
      window.__r23.calls++;
      if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
        const ratio = (dw / dh) / (sw / sh);
        if (Math.abs(ratio - 1) > tol) {
          const c = this.canvas;
          const key = sel(c) + ' | ' + ratio.toFixed(3);
          const b = window.__r23.bad[key] || (window.__r23.bad[key] = {
            sel: sel(c), ratio: +ratio.toFixed(4), n: 0,
            connected: !!(c && c.isConnected),
            inApp: !!(c && c.closest && c.closest('#app')),
            ctxNU: !!NU.get(this),
            src: `${sw}×${sh} → ${dw}×${dh}`,
          });
          b.n++;
        }
      }
    } catch (e) { window.__r23.err++; }
    return orig.apply(this, a);
  };
}

/* ── DOM 축 두 개 — 캔버스 비트맵↔상자, svg viewBox↔상자 ── */
const DOMAXES = function (tol) {
  const out = { cv: [], svg: [] };
  const app = document.getElementById('app');
  if (!app) return out;
  const pathOf = (el) => {
    const o = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 5) {
      let s = e.tagName ? String(e.tagName).toLowerCase() : '?';
      if (e.id) { s += '#' + e.id; o.unshift(s); break; }
      const cl = e.getAttribute && e.getAttribute('class');
      if (cl) s += '.' + cl.trim().split(/\s+/).slice(0, 3).join('.');
      o.unshift(s);
      e = e.parentElement;
    }
    return o.join('>');
  };
  for (const c of app.querySelectorAll('canvas')) {
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height || !c.width || !c.height) continue;
    const ratio = (r.width / r.height) / (c.width / c.height);
    if (Math.abs(ratio - 1) > tol) {
      out.cv.push({ sel: pathOf(c), ratio: +ratio.toFixed(4),
        bmp: c.width + '×' + c.height, box: r.width.toFixed(1) + '×' + r.height.toFixed(1) });
    }
  }
  for (const s of app.querySelectorAll('svg')) {
    const r = s.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const vb = s.getAttribute('viewBox');
    if (!vb) continue;
    const v = vb.trim().split(/[\s,]+/).map(Number);
    if (v.length !== 4 || !v[2] || !v[3]) continue;
    /* 늘어나는 것은 preserveAspectRatio="none" 일 때뿐이다 — 기본값(xMidYMid meet)은 담는다 */
    const pa = (s.getAttribute('preserveAspectRatio') || '').trim();
    if (!/^none/.test(pa)) continue;
    const ratio = (r.width / r.height) / (v[2] / v[3]);
    if (Math.abs(ratio - 1) > tol) {
      out.svg.push({ sel: pathOf(s), ratio: +ratio.toFixed(4),
        vb: v[2] + '×' + v[3], box: r.width.toFixed(1) + '×' + r.height.toFixed(1) });
    }
  }
  return out;
};

/* 게이트(`verify356` [G])가 **같은 훅·같은 축**을 받아 쓴다 — 자를 두 벌로 안 적는다(13회차 [R12]).
   ⚠ 아래 `require.main` 가드가 없으면 verify356 이 이 파일을 require 하는 순간 전수 스윕이 같이 돈다. */
module.exports = { initHook, DOMAXES, PRE_REL, PRE_ABS, PRE_REV, PRE_DATE, digPre };

if (require.main !== module) return;

(async () => {
  if (PRE && !fs.existsSync(PRE_ABS)) {
    const { execFileSync } = require('child_process');
    /* 631 — 얕은 클론이면 여기서도 표본이 없다. 게이트와 **같은 한 벌**(`digPre`)로 판다. */
    const dug = digPre();
    if (dug === null) {
      console.error(`[!] ${PRE_REV} 가 이 클론에 없다(얕은 클론) — `
        + `\`git fetch --shallow-since=${PRE_DATE} origin main\` 이 실패했다`);
      process.exit(2);
    }
    if (dug) console.log(`[i]${dug}`);
    const src = execFileSync('git', ['show', PRE_REV + ':index.html'], { cwd: ROOT, maxBuffer: 1 << 28 });
    fs.writeFileSync(PRE_ABS, src);
    console.log(`[i] ${PRE_REL} 을 ${PRE_REV} 에서 뽑았다 (${(src.length / 1048576).toFixed(1)} MiB)`);
  }

  const browser = await launch(chromium);
  const drawBad = new Map();
  const domCv = new Map(), domSvg = new Map();
  let calls = 0, hookErr = 0, ctxNonUni = 0;
  const errs = [];

  /* 회차 중 한 화면만 다시 볼 때 — 판정용 실행은 언제나 전수다(필터 없이 돌린다) */
  const ONLY = process.env.P356R23_ONLY || '';
  const LIST = ONLY ? SCREENS.filter(([l]) => l.includes(ONLY)) : SCREENS;

  for (const [label, steps] of LIST) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.addInitScript(initHook, TOL);
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        const found = await STEP(page, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}'`);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(250);
      const dom = await page.evaluate(DOMAXES, TOL);
      const hk = await page.evaluate(() => window.__r23 || null);
      if (!hk) { errs.push(label + ': 훅이 안 심겼다'); }
      else {
        calls += hk.calls; hookErr += hk.err; ctxNonUni += hk.ctxNonUni;
        for (const k of Object.keys(hk.bad)) {
          const b = hk.bad[k];
          if (!drawBad.has(k)) drawBad.set(k, Object.assign({}, b, { screens: new Set() }));
          const g = drawBad.get(k); g.n += b.n; g.screens.add(label);
        }
      }
      for (const c of dom.cv) {
        const k = c.sel + '|' + c.ratio;
        if (!domCv.has(k)) domCv.set(k, Object.assign({}, c, { screens: new Set() }));
        domCv.get(k).screens.add(label);
      }
      for (const c of dom.svg) {
        const k = c.sel + '|' + c.ratio;
        if (!domSvg.has(k)) domSvg.set(k, Object.assign({}, c, { screens: new Set() }));
        domSvg.get(k).screens.add(label);
      }
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  const fold = (m) => [...m.values()].map((r) => { r.screens = [...r.screens]; return r; })
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));
  const draw = fold(drawBad), cvs = fold(domCv), svgs = fold(domSvg);
  const inApp = draw.filter((r) => r.inApp);
  const off = draw.filter((r) => !r.inApp);

  if (JSON_OUT) {
    console.log(JSON.stringify({ pre: PRE, tol: TOL, calls, hookErr, ctxNonUni,
      draw, cvs, svgs, errs }, null, 1));
    process.exit(0);
  }

  console.log(`\n[probe356r23] ${PRE ? '**616 직전 트리**' : '현행 트리'} · TOL ${TOL} · 화면 ${LIST.length}`
    + (ONLY ? ` (P356R23_ONLY='${ONLY}' — 판정용 아님)` : ''));

  console.log('\n[0] 드리프트 가드 — 훅이 실제로 돌았는가');
  ok(calls > 0, `drawImage 호출 ${calls}건 관측 (0 이면 훅이 안 걸린 것 = 아래 초록이 전부 헛초록)`);
  ok(hookErr === 0, `훅 내부 예외 ${hookErr}건`);
  ok(errs.length === 0, `화면 진입 무음 실패 ${errs.length}건`);

  const show = (title, rows) => {
    console.log(title);
    for (const r of rows) {
      const pct = ((r.ratio - 1) * 100).toFixed(1);
      console.log(`    ×${r.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  ${r.sel}` +
        (r.src ? `  ${r.src}` : '') + (r.bmp ? `  비트맵 ${r.bmp} ↔ 상자 ${r.box}` : '') +
        (r.vb ? `  viewBox ${r.vb} ↔ 상자 ${r.box}` : '') + (r.n ? `  ×${r.n}회` : ''));
      console.log(`      화면: ${r.screens.slice(0, 6).join(', ')}${r.screens.length > 6 ? ' …' : ''}`);
    }
  };

  if (PRE) {
    console.log('\n[1] 역방향 증명 — 616 직전 트리에서 이 자가 «실제로 빨개지는가»');
    show(`  drawImage 비균등 ${inApp.length}자리:`, inApp);
    ok(inApp.length > 0, `#app 안 캔버스에서 비균등 그리기 ${inApp.length}자리 검출 (0 이면 이 자는 아무것도 못 보는 자다)`);
    const worst = inApp.length ? Math.max(...inApp.map((r) => Math.abs(r.ratio - 1))) : 0;
    ok(worst > 0.30, `최악 자리 ${(worst * 100).toFixed(1)}% — 616 등재문의 ×1.45 / ×1.65 급인가`);
  } else {
    console.log('\n[2-b] drawImage 비균등 — #app 안 캔버스');
    show(`  ${inApp.length}자리:`, inApp);
    ok(inApp.length === 0, `#app 안 비균등 그리기 ${inApp.length}자리`);
    console.log('\n[2-b′] 화면 밖 캔버스(아틀라스 준비 등) — 참고만');
    show(`  ${off.length}자리:`, off);
    console.log('\n[2-a] 캔버스 비트맵 종횡 ↔ CSS 상자 종횡');
    show(`  ${cvs.length}자리:`, cvs);
    ok(cvs.length === 0, `상자가 비트맵을 늘리는 캔버스 ${cvs.length}자리`);
    console.log('\n[2-c] 컨텍스트 변환 축 — ctx.scale/transform 이 비균등으로 걸린 적이 있는가');
    ok(ctxNonUni === 0, `비균등 컨텍스트 변환 ${ctxNonUni}회 (뒤집기 scale(-1,1) 은 |sx|=|sy| 라 안 센다)`);
    console.log('\n[3] svg preserveAspectRatio="none" 로 늘어난 자리');
    show(`  ${svgs.length}자리:`, svgs);
    ok(svgs.length === 0, `viewBox 종횡을 어기는 svg ${svgs.length}자리`);
  }

  if (errs.length) { console.log('\n[!] 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  console.log(`\n[probe356r23] ${PASS}/${PASS + FAIL} ${FAIL ? 'FAIL' : 'PASS'}`);
  process.exit(FAIL ? 1 : 0);
})();
