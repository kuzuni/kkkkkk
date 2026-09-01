#!/usr/bin/env node
/* 735 게이트 — «배수를 바꿔도 아무것도 커졌다 작아졌다 하지 않는다» (주인 지시 2026-09-02 04:30)
 *
 *   node tools/verify735.js
 *
 * 주인 원문: «그 x1 x10 x100 x1000 바꿀때 팝업 크기 커졌다 작아졌다 그런거 하지마»
 * 주인 보강: «소환결과부분이 현재 그러네» ⇒ 자리 = 12 소환 결과 팝업(713 이 토글을 옮긴 그 자리).
 *
 * ⚑ `probe735` 재현이 **처방을 바꿨다**. 등재문은 «팝업/버튼 줄 크기가 출렁인다» 로 읽고
 *   «최장 상태 기준으로 폭을 예약하라» 를 처방했는데, 재현해 보니 **그릇은 이미 전부 Δ0px** 였다
 *   (배수 4상태 × 14상자 = 42건). 달라지는 것은 오직 **글자 크기**였다 — 713 이 668 에서 옮겨 온
 *   `fitN` 계단이 ×1000 에서만 35 → 33 · 33 → 31 로 걸렸다. ⇒ 고친 것은 그 계단이다.
 *
 * 절:
 *   [A] 그릇   — 배수 4상태에서 팝업 상자 일곱(패널·리본·그리드·버튼 줄·닫기·배수 바·스킵)이 Δ0px
 *   [B] 버튼   — 세 버튼과 그 안 라벨·가격 상자도 Δ0px
 *   [C] 글자   — 라벨·가격의 **font-size 와 클래스**가 배수와 무관하다 (735 의 본체)
 *   [D] 잘림 0 — 그 한 크기로 ×1000 까지 검정 테두리(6) 안에 들어온다
 *   [R] 되돌림 — 668 의 계단을 되살린 사본에서는 [C] 가 곧바로 빨개진다(자가 무르지 않다)
 *
 * ⚠ 두 프레임(2280 · 1600)에서 같은 것을 묻는다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const BOXES = ['panel', 'rb', 'grid', 'btns', 'close', 'bar', 'skip'];
const BTNS = ['b1', 'b2', 'b3', 'lab2', 'lab3', 'cost2', 'cost3'];

const SNAP = () => {
  const R = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return [+r.left.toFixed(2), +r.top.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  const fs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null; };
  /* 잘림 자 — 라벨·가격 잉크가 검정 테두리(6) 안에 있는가 */
  const over = [];
  ['sumB10', 'sumB30'].forEach(id => {
    const btn = document.getElementById(id), br = btn.getBoundingClientRect();
    btn.querySelectorAll('.lab i,.cost i').forEach(u => {
      const ir = u.getBoundingClientRect();
      if (ir.width > 0 && (ir.left < br.left + 6 - .5 || ir.right > br.right - 6 + .5))
        over.push(id + ' ' + u.parentElement.className + ' ' + ir.left.toFixed(1) + '..' + ir.right.toFixed(1));
    });
  });
  return {
    panel: R('.sm-panel'), rb: R('.sm-rb'), grid: R('.sm-grid'), btns: R('.sm-btns'),
    close: R('.sm-close'), bar: R('#sumMulBar'), skip: R('#sumSkip'),
    b1: R('#sumBF'), b2: R('#sumB10'), b3: R('#sumB30'),
    lab2: R('#sumB10 .lab'), lab3: R('#sumB30 .lab'),
    cost2: R('#sumB10c'), cost3: R('#sumB30c'),
    fs: [fs('#sumB10 .lab'), fs('#sumB30 .lab'), fs('#sumB10c'), fs('#sumB30c')].join('/'),
    cls: [(document.querySelector('#sumB10 .lab') || {}).className,
          (document.getElementById('sumB10c') || {}).className].join('/'),
    over
  };
};

async function run(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function'
    && typeof SUM_MULS !== 'undefined');
  await page.waitForTimeout(300);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  await page.evaluate(() => {
    S.dia = 1e12; S.relic = 1e12;
    doSummon((typeof gmBan === 'function' && gmBan()) || 'weapon', 10);
  });
  await page.waitForFunction(() => {
    const r = document.querySelector('.sm-panel').getBoundingClientRect();
    const k = r.top.toFixed(2) + ',' + r.height.toFixed(2);
    if (window.__k === k) return (window.__n = (window.__n || 0) + 1) >= 3;
    window.__k = k; window.__n = 0; return false;
  }, null, { timeout: 8000 });
  await page.waitForTimeout(150);
  const snaps = {};
  for (const m of [1, 10, 100, 1000]) {
    snaps[m] = await page.evaluate(({ m, SNAP }) => {
      document.querySelector('#sumMulBar [data-mul="' + m + '"]').click();
      return eval('(' + SNAP + ')')();
    }, { m, SNAP: SNAP.toString() });
    await page.waitForTimeout(60);
  }
  return { ctx, page, snaps };
}

const diff = (snaps, keys) => {
  const bad = [];
  for (const m of [10, 100, 1000]) for (const k of keys) {
    const a = snaps[1][k], b = snaps[m][k];
    if (!a || !b) continue;
    if (a.some((v, i) => Math.abs(v - b[i]) > 0.5))
      bad.push('×' + m + ' ' + k + ' ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
  }
  return bad;
};

(async () => {
  const browser = await launch(chromium);

  for (const H of [2280, 1600]) {
    const { ctx, snaps } = await run(browser, H);
    const tag = '(' + H + ') ';
    {
      const bad = diff(snaps, BOXES);
      ok(!bad.length, tag + '[A] 팝업 그릇 일곱이 배수 4상태에서 Δ0px',
        bad.length ? bad.slice(0, 3).join(' | ') : BOXES.length + '상자 × 3배수 = 21건 Δ0');
    }
    {
      const bad = diff(snaps, BTNS);
      ok(!bad.length, tag + '[B] 세 버튼·라벨·가격 상자도 Δ0px',
        bad.length ? bad.slice(0, 3).join(' | ') : BTNS.length + '상자 × 3배수 = 21건 Δ0');
    }
    {
      const same = [10, 100, 1000].every(m => snaps[m].fs === snaps[1].fs);
      ok(same, tag + '[C1] 라벨·가격 **글자 크기**가 배수와 무관하다(735 의 본체)',
        '×1 ' + snaps[1].fs + ' ↔ ×1000 ' + snaps[1000].fs);
      const sameC = [10, 100, 1000].every(m => snaps[m].cls === snaps[1].cls);
      ok(sameC, tag + '[C2] 라벨·가격 클래스도 배수와 무관하다(668 의 `fitN` 계단이 안 걸린다)',
        '×1 "' + snaps[1].cls + '" ↔ ×1000 "' + snaps[1000].cls + '"');
    }
    {
      const bad = [1, 10, 100, 1000].filter(m => snaps[m].over.length);
      ok(!bad.length, tag + '[D] 그 한 크기로 ×1000 까지 검정 테두리(6) 안에 들어온다(잘림 0)',
        bad.length ? snaps[bad[0]].over.slice(0, 2).join(' | ') : '4상태 넘침 0건');
    }
    await ctx.close();
  }

  /* ================= [R] 되돌림 시험 ================= */
  /* 668 의 계단을 되살린 사본을 만든다 — CSS 만 넣고 라벨에 클래스를 직접 씌워
     «계단이 살아 있으면 [C1] 이 곧바로 빨개진다» 를 보인다. */
  {
    const { ctx, page } = await run(browser, 2280, '.sm-b>.lab.fit1{font-size:33px}');
    const r = await page.evaluate(() => {
      const u = document.querySelector('#sumB10 .lab');
      const before = getComputedStyle(u).fontSize;
      u.className = 'lab fit1';
      return { before, after: getComputedStyle(u).fontSize };
    });
    ok(r.before !== r.after && r.after === '33px',
      '[R] 계단을 되살린 사본에서는 글자 크기가 곧바로 갈린다(자가 무르지 않다)',
      r.before + ' → ' + r.after);
    await ctx.close();
  }

  await browser.close();
  console.log('\nverify735: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
