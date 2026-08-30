#!/usr/bin/env node
/* 재현 3 — 후보 ⓑ(`content-visibility:auto`)가 **그림을 바꾸지 않는가**.
 *
 *   node tools/probe493c.js
 *
 * `content-visibility:auto` 는 «오프스크린이면 안 그린다» 만이 아니라 **`contain:layout style paint`**
 * 를 같이 건다 — `paint` 는 자식이 상자를 넘으면 **자른다**. 행(`.ps-r` 229.85px)을 넘는 자식이
 * 하나라도 있으면 그 자리가 잘린다(299 레드닷·육각이 행 경계에 걸쳐 있으면 곧바로 결함).
 *
 *   [1] 자식이 행 상자를 넘는가 — 행별 자식 bbox 를 행 bbox 와 맞댄다(전 행)
 *   [2] 찍힌 픽셀 — CSS 를 켜기 전/후 스크린샷을 맞대 다른 픽셀 수를 센다(스크롤 3자리)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');
const CV = '#psTk .ps-r{content-visibility:auto;contain-intrinsic-size:1080px 229.85px}';

/* PNG 를 페이지 안 캔버스로 되돌려 **찍힌 픽셀**을 읽는다(probe144 선례 — 파일 의존성 0).
   버퍼 길이 비교는 못 쓴다: 같은 그림이어도 PNG 압축이 갈릴 수 있고, 60 쥬시가 한 프레임을 얹으면
   길이만 보고 «다르다» 로 읽는다. 그래서 A/A 대조군(같은 상태 두 장)을 같이 잰다. */
/* 두 PNG 를 **페이지 안에서** 캔버스로 되돌려 다른 픽셀을 센다(probe144 선례 — 파일 의존성 0).
   ⚠ 픽셀 배열을 노드로 넘기면 안 된다(1080×2280×4 = 985만 칸 · 직렬화가 분 단위다) — 비교까지 안에서.
   버퍼 길이 비교도 못 쓴다: 같은 그림이어도 PNG 압축이 갈릴 수 있고 60 쥬시가 한 프레임을 얹는다.
   그래서 A/A 대조군(같은 상태 두 장)을 같이 재서 **잡음 바닥**을 깐다. */
/* 다른 픽셀이 **어디** 있나 — 처방을 고르려면 «몇 개» 보다 «어느 자리» 가 중요하다 */
async function bboxIn(p, bufA, bufB) {
  return await p.evaluate(async ([x, y]) => {
    const load = b64 => new Promise((res, rej) => { const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = 'data:image/png;base64,' + b64; });
    const grab = async b64 => { const im = await load(b64);
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      cv.getContext('2d').drawImage(im, 0, 0);
      return { d: cv.getContext('2d').getImageData(0, 0, im.width, im.height).data, W: im.width }; };
    const A = await grab(x), B = await grab(y);
    let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
    for (let i = 0; i < A.d.length; i += 4) {
      if (A.d[i] === B.d[i] && A.d[i + 1] === B.d[i + 1] && A.d[i + 2] === B.d[i + 2]) continue;
      const px = (i / 4) % A.W, py = ((i / 4) / A.W) | 0;
      if (px < x1) x1 = px; if (px > x2) x2 = px; if (py < y1) y1 = py; if (py > y2) y2 = py;
    }
    return { x1, y1, x2, y2 };
  }, [bufA.toString('base64'), bufB.toString('base64')]);
}
async function diffIn(p, bufA, bufB) {
  return await p.evaluate(async ([x, y]) => {
    const load = b64 => new Promise((res, rej) => { const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = 'data:image/png;base64,' + b64; });
    const grab = async b64 => { const im = await load(b64);
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      cv.getContext('2d').drawImage(im, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const a = await grab(x), b = await grab(y);
    if (a.length !== b.length) return -1;
    let n = 0;
    for (let i = 0; i < a.length; i += 4)
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
    return n;
  }, [bufA.toString('base64'), bufB.toString('base64')]);
}

(async () => {
  console.log('=== probe493c — content-visibility 가 그림을 바꾸는가 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);

  /* ── [1] 행 상자를 넘는 자식 ───────────────────────────────────── */
  const over = await p.evaluate(() => {
    S.best = 120; S.pass.prem = { stage: 1 }; openPass('stage');
    const out = [];
    document.querySelectorAll('#psTk .ps-r').forEach((r, i) => {
      const R = r.getBoundingClientRect();
      r.querySelectorAll('*').forEach(c => {
        const C = c.getBoundingClientRect();
        if (!C.width && !C.height) return;
        const dt = R.top - C.top, db = C.bottom - R.bottom, dl = R.left - C.left, dr = C.right - R.right;
        const m = Math.max(dt, db, dl, dr);
        if (m > 0.01) out.push({ i, cls: c.className || c.tagName, top: +dt.toFixed(2), bot: +db.toFixed(2),
                                 left: +dl.toFixed(2), right: +dr.toFixed(2) });
      });
    });
    return out;
  });
  console.log('[1] 행 상자를 넘는 자식 — ' + over.length + '건');
  over.slice(0, 8).forEach(o => console.log('    행#' + o.i + ' ' + o.cls
    + '  위 ' + o.top + ' / 아래 ' + o.bot + ' / 좌 ' + o.left + ' / 우 ' + o.right));

  /* ── [2] 찍힌 픽셀 ─────────────────────────────────────────────── */
  console.log('\n[2] 찍힌 픽셀 대조(1080×2280 · 스크롤 3자리)');
  for (const tab of ['stage', 'att', 'tower']) {
    for (const st of [0, 1, 2]) {
      await p.evaluate(([t]) => {
        S.best = 120; S.att.n = 12; S.pass.prem = { stage: 1, att: 1, tower: 1 };
        openPass(t);
      }, [tab]);
      await p.evaluate(([s]) => { const L = document.getElementById('psList');
        L.scrollTop = s === 0 ? 0 : (s === 1 ? L.scrollHeight / 2 : L.scrollHeight); }, [st]);
      await p.waitForTimeout(200);
      const a0 = await p.screenshot();
      await p.waitForTimeout(200);
      const a1 = await p.screenshot();                       /* A/A 대조군 = 잡음 바닥 */
      await p.evaluate(([css]) => { const s = document.createElement('style'); s.id = 'cvp'; s.textContent = css; document.head.appendChild(s); }, [CV]);
      await p.waitForTimeout(200);
      const b = await p.screenshot();
      const sc = await p.evaluate(() => { const L = document.getElementById('psList');
        return { top: +L.scrollTop.toFixed(1), h: L.scrollHeight }; });
      await p.evaluate(() => { const s = document.getElementById('cvp'); if (s) s.remove(); });
      const d = await diffIn(p, a1, b), noise = await diffIn(p, a0, a1);
      console.log('    ' + tab.padEnd(6) + ' 스크롤' + st + ' — 다른 픽셀 ' + d
        + ' (A/A 잡음 ' + noise + ')' + (d <= noise ? '  ✔ 잡음 이하' : '  ⚠ bbox ' + JSON.stringify(await bboxIn(p, a1, b))
          + ' scrollTop ' + JSON.stringify(sc)));
    }
  }

  await browser.close();
})();
