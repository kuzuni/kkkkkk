#!/usr/bin/env node
/* 735 재현 — «배수를 바꾸면 팝업이 커졌다 작아졌다» 를 **토글 4상태를 순회하며 찍힌 상자**로 묻는다
 *
 *   node tools/probe735.js
 *
 * 주인 원문: «그 x1 x10 x100 x1000 바꿀때 팝업 크기 커졌다 작아졌다 그런거 하지마»
 * 주인 보강: «소환결과부분이 현재 그러네» ⇒ 발생 자리 = **12 소환 결과 팝업**(713 이 토글을 옮긴 그 자리).
 *
 * 338 규칙: 처방을 따르기 전에 재현한다. 이 자가 묻는 것은 «무엇이 출렁이는가» 다 —
 * 등재문은 «팝업/버튼 줄 크기» 를 지목했지만, 출렁이는 축이 실제로 무엇인지는 재 봐야 안다.
 *
 *   [1] 그릇   — 배수 4상태에서 패널·리본·그리드·버튼 줄·닫기의 상자가 전부 Δ0 인가
 *   [2] 버튼   — 세 버튼 각각의 상자가 Δ0 인가 (라벨이 길어져도 버튼이 안 자라야 한다)
 *   [3] 글자   — 라벨·가격의 **글자 크기**가 배수마다 달라지는가 (713 이 옮겨 온 `fitN` 계단)
 *   [4] 토글   — 배수 바 자신의 상자가 Δ0 인가
 *
 * ⚑ [3] 이 이 자의 핵심이다. [1][2] 가 전부 Δ0 인데도 주인 눈에 «커졌다 작아졌다» 로 보였다면
 *   출렁이는 것은 **그릇이 아니라 글자**다 — 그러면 처방이 «폭 예약» 이 아니라 «글자 크기 고정» 이 된다.
 *
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

const SNAP = () => {
  const R = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return [+r.left.toFixed(2), +r.top.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  const fs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null; };
  return {
    panel: R('.sm-panel'), rb: R('.sm-rb'), grid: R('.sm-grid'), btns: R('.sm-btns'),
    close: R('.sm-close'), bar: R('#sumMulBar'), skip: R('#sumSkip'),
    b1: R('#sumBF'), b2: R('#sumB10'), b3: R('#sumB30'),
    lab2: R('#sumB10 .lab'), lab3: R('#sumB30 .lab'),
    cost2: R('#sumB10c'), cost3: R('#sumB30c'),
    fsLab2: fs('#sumB10 .lab'), fsLab3: fs('#sumB30 .lab'),
    fsCost2: fs('#sumB10c'), fsCost3: fs('#sumB30c'),
    clsLab2: (document.querySelector('#sumB10 .lab') || {}).className,
    clsCost2: (document.getElementById('sumB10c') || {}).className
  };
};

(async () => {
  const browser = await launch(chromium);
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function'
      && typeof SUM_MULS !== 'undefined');
    await page.waitForTimeout(300);
    await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
    await page.evaluate(() => {
      S.dia = 1e12; S.relic = 1e12;
      doSummon((typeof gmBan === 'function' && gmBan()) || 'weapon', 10);
    });
    /* 등장 애니메이션이 앉을 때까지 */
    await page.waitForFunction(() => {
      const r = document.querySelector('.sm-panel').getBoundingClientRect();
      const k = r.top.toFixed(2) + ',' + r.height.toFixed(2);
      if (window.__k735 === k) return (window.__n735 = (window.__n735 || 0) + 1) >= 3;
      window.__k735 = k; window.__n735 = 0; return false;
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
    const tag = '(' + H + ') ';
    const base = snaps[1];
    const boxDiff = keys => {
      const bad = [];
      for (const m of [10, 100, 1000]) for (const k of keys) {
        const a = base[k], b = snaps[m][k];
        if (!a || !b) continue;
        if (a.some((v, i) => Math.abs(v - b[i]) > 0.5))
          bad.push('×' + m + ' ' + k + ' ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
      }
      return bad;
    };
    {
      const bad = boxDiff(['panel', 'rb', 'grid', 'btns', 'close', 'bar', 'skip']);
      ok(!bad.length, tag + '[1] 배수 4상태에서 **그릇**(패널·리본·그리드·버튼 줄·닫기·바·스킵) Δ0px',
        bad.length ? bad.slice(0, 3).join(' | ') : '7상자 × 3배수 = 21건 전부 Δ0');
    }
    {
      const bad = boxDiff(['b1', 'b2', 'b3', 'lab2', 'lab3', 'cost2', 'cost3']);
      ok(!bad.length, tag + '[2] 세 버튼과 그 안 라벨·가격 **상자**도 Δ0px',
        bad.length ? bad.slice(0, 3).join(' | ') : '7상자 × 3배수 = 21건 전부 Δ0');
    }
    {
      const f = m => [snaps[m].fsLab2, snaps[m].fsLab3, snaps[m].fsCost2, snaps[m].fsCost3].join('/');
      const same = [10, 100, 1000].every(m => f(m) === f(1));
      ok(same, tag + '[3] 라벨·가격 **글자 크기**가 배수와 무관하다',
        '×1 ' + f(1) + ' · ×10 ' + f(10) + ' · ×100 ' + f(100) + ' · ×1000 ' + f(1000));
    }
    {
      const same = [10, 100, 1000].every(m =>
        snaps[m].clsLab2 === snaps[1].clsLab2 && snaps[m].clsCost2 === snaps[1].clsCost2);
      ok(same, tag + '[4] 라벨·가격의 클래스가 배수와 무관하다(계단이 안 걸린다)',
        '×1 "' + snaps[1].clsLab2 + '"/"' + snaps[1].clsCost2 + '" ↔ ×1000 "'
        + snaps[1000].clsLab2 + '"/"' + snaps[1000].clsCost2 + '"');
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\nprobe735: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
