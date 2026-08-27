/* 작업 169 진단 — 04 던전 세부 팝업의 «배너 몬스터 썸네일 · 소탕 버튼» 실측(읽기 전용).
   게이트(verify169.js)가 문턱을 정하기 전에 «지금 값이 얼마인가» 를 눈으로 보기 위한 자다.
   실행: node tools/probe169.js
*/
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/* 던전을 전부 열고 층·입장 횟수를 넉넉히 준다 — 소탕 조건(`left>0 && f>1`)을 만족시키기 위함 */
const SEED = () => {
  S.guide.idx = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  S.best = 99;
  save();
};

(async () => {
  /* 72/97 선례 — file:// 이미지는 캔버스를 오염시켜 `getImageData` 가 막힌다 */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.evaluate(SEED);

  for (const id of ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4']) {
    await p.evaluate(i => openDunDetail(DUNGEONS.find(d => d.id === i)), id);
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const cv = document.getElementById('dgdTh'), bn = document.getElementById('dgdBn');
      const b2 = bn.querySelector('b'), sw = document.getElementById('dgdSweep');
      const r = cv.getBoundingClientRect(), br = bn.getBoundingClientRect();
      /* 캔버스 픽셀에서 잉크 bbox 를 잰다(투명이 아닌 화소) */
      const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3] > 8) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return {
        thOn: bn.classList.contains('th-on'),
        silhouette: getComputedStyle(b2).display,
        cvPx: cv.width + '×' + cv.height,
        cvCss: r.width.toFixed(1) + '×' + r.height.toFixed(1),
        cvLocal: (r.left - br.left).toFixed(1) + ',' + (r.top - br.top).toFixed(1),
        k: cv.dataset.thk, f: cv._fr,
        ink: n ? `${x1 - x0 + 1}×${y1 - y0 + 1} @${x0},${y0}` : '없음',
        inkPx: n,
        sweep: { lk: sw.classList.contains('lk'), dis: sw.disabled, txt: sw.innerText.trim(), fil: sw.style.filter },
      };
    });
    console.log(id, JSON.stringify(m));
  }

  /* 레이드·아레나 분기 */
  await p.evaluate(() => { closeDunDetail(); openRaidDetail(RAIDS[0]); });
  await p.waitForTimeout(500);
  console.log('raid ', JSON.stringify(await p.evaluate(() => {
    const cv = document.getElementById('dgdTh'), bn = document.getElementById('dgdBn'), sw = document.getElementById('dgdSweep');
    return { thOn: bn.classList.contains('th-on'), k: cv.dataset.thk, f: cv._fr, lk: sw.classList.contains('lk'), dis: sw.disabled };
  })));
  await p.evaluate(() => { closeDunDetail(); openArenaDetail(); });
  await p.waitForTimeout(500);
  console.log('arena', JSON.stringify(await p.evaluate(() => {
    const bn = document.getElementById('dgdBn'), sw = document.getElementById('dgdSweep');
    return { thOn: bn.classList.contains('th-on'), sil: getComputedStyle(bn.querySelector('b')).display, lk: sw.classList.contains('lk'), dis: sw.disabled };
  })));

  console.log('errs', errs.length, errs.slice(0, 3));
  await b.close();
})();
