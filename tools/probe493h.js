#!/usr/bin/env node
/* 재현 8 — 처방 후보 ⓒ 를 **제품을 고치기 전에** 모의로 검산한다.
 *   node tools/probe493h.js
 *
 * probe493c 가 `content-visibility:auto` 를 «찍힌 픽셀» 로 기각한 이유는 층이다 —
 * `.ps-r` 이 스태킹 컨텍스트가 되면 `.ps-hex`(z5)가 행 안에 갇혀 `.ps-spine`(z2)·`.ps-eg`(z3)·
 * `.ps-tk::before`(z4) 아래로 내려간다. 그런데 **행 안에서 층을 타야 하는 것은 육각 하나뿐**이다:
 * 컬럼 배경(`.ps-cf`/`.ps-cp`)과 칸(`.ps-bx`)은 지금도 셋 **아래**에 그려진다.
 *
 * ⇒ 후보 ⓒ: 행 안에 **껍데기 하나**(`.ps-cv`)를 세워 컬럼·칸만 담고 거기에 `content-visibility` 를 건다.
 *   육각은 행의 직속 자식으로 남으므로 행은 스태킹 컨텍스트가 **안 된다** = 층이 그대로다.
 *
 *   [1] 속도 — A(지금) vs C(껍데기+CV) 교차 12회
 *   [2] 찍힌 픽셀 — 탭 3 × 스크롤 3, A/A 잡음과 맞대서
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');

/* 렌더 뒤 DOM 을 손으로 재배치해 후보 ⓒ 를 흉내 낸다(제품 0줄) */
const WRAP = () => {
  document.querySelectorAll('#psTk .ps-r').forEach(r => {
    if (r.querySelector(':scope>.ps-cv')) return;
    const cv = document.createElement('div');
    cv.className = 'ps-cv';
    [...r.children].forEach(c => { if (!c.classList.contains('ps-hex')) cv.appendChild(c); });
    r.appendChild(cv);
  });
};
const CSS = '#psTk .ps-cv{position:absolute;left:0;right:0;top:0;bottom:0;'
          + 'content-visibility:auto;contain-intrinsic-size:1080px 229.85px}'
          + '#psTk .ps-cv>*{position:absolute}';

async function diffIn(p, a, b) {
  return await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const grab = async s => { const im = await load(s); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const A = await grab(x), B = await grab(y);
    if (A.length !== B.length) return -1;
    let n = 0;
    for (let i = 0; i < A.length; i += 4)
      if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) n++;
    return n;
  }, [a.toString('base64'), b.toString('base64')]);
}

(async () => {
  console.log('=== probe493h — 후보 ⓒ(껍데기 + content-visibility) 모의 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);

  const speed = await p.evaluate(([css, wrapSrc]) => {
    const wrap = new Function('return (' + wrapSrc + ')')();
    S.best = 1500;
    const st = document.createElement('style'); st.id = 'cvw'; st.textContent = css;
    const A = [], C = [];
    for (let i = 0; i < 16; i++) {
      st.remove();
      closePass(); let t = performance.now(); openPass('stage'); const a = performance.now() - t;
      closePass(); document.head.appendChild(st);
      t = performance.now(); openPass('stage'); wrap(); const c = performance.now() - t;
      if (i >= 4) { A.push(a); C.push(c); }
    }
    st.remove();
    const med = v => { v = v.slice().sort((x, y) => x - y); return +v[v.length >> 1].toFixed(1); };
    return { a: med(A), c: med(C), aAll: A.map(x => Math.round(x)), cAll: C.map(x => Math.round(x)) };
  }, [CSS, WRAP.toString()]);

  console.log('[1] 속도(600행 · 교차 12회 중앙값)');
  console.log('    A 지금 그대로        ' + speed.a + 'ms  ' + JSON.stringify(speed.aAll));
  console.log('    C 껍데기 + CV        ' + speed.c + 'ms  ' + JSON.stringify(speed.cAll));
  console.log('    Δ ' + (speed.a - speed.c).toFixed(1) + 'ms (' + ((1 - speed.c / speed.a) * 100).toFixed(0) + '% 절감)');

  console.log('\n[2] 찍힌 픽셀(1080×2280)');
  for (const tab of ['stage', 'att', 'tower']) {
    for (const st of [0, 1, 2]) {
      await p.evaluate(([t]) => { S.best = 120; S.att.n = 12; S.pass.prem = { stage: 1, att: 1, tower: 1 }; openPass(t); }, [tab]);
      await p.evaluate(([s]) => { const L = document.getElementById('psList');
        L.scrollTop = s === 0 ? 0 : (s === 1 ? L.scrollHeight / 2 : L.scrollHeight); }, [st]);
      await p.waitForTimeout(220);
      const a0 = await p.screenshot();
      await p.waitForTimeout(220);
      const a1 = await p.screenshot();
      await p.evaluate(([css, wrapSrc]) => {
        const s = document.createElement('style'); s.id = 'cvw'; s.textContent = css; document.head.appendChild(s);
        new Function('return (' + wrapSrc + ')')()();
      }, [CSS, WRAP.toString()]);
      await p.waitForTimeout(260);
      const b = await p.screenshot();
      const d = await diffIn(p, a1, b), noise = await diffIn(p, a0, a1);
      console.log('    ' + tab.padEnd(6) + ' 스크롤' + st + ' — 다른 픽셀 ' + d + ' (A/A 잡음 ' + noise + ')'
        + (d <= Math.max(noise, 0) ? '  ✔' : '  ⚠'));
      await p.evaluate(() => { const s = document.getElementById('cvw'); if (s) s.remove(); renderPass(); });
    }
  }
  await browser.close();
})();
