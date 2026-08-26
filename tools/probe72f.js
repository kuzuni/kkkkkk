/* 작업 72 10회차 — 액자 안 그림이 **아이들 애니 전 프레임에서** 안 잘리는지 본다.
   verify72 [1-2] 는 «한 순간» 만 재는데, 아틀라스 애니는 프레임마다 rect 크기가 다르다
   (예: zombie walk 201×178 / 197×198 / 178×225). contain 배율이 프레임마다 다시 풀리므로
   한 장이 통과했다고 전부 통과가 아니다.
   실행: node tools/probe72f.js [--unlock] */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const UNLOCK = process.argv.includes('--unlock');

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  if (UNLOCK) await p.evaluate(() => {
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach(u => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    const res = [];
    const cvs = [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')];
    cvs.forEach((cv, ci) => {
      const A = ATLAS[cv.dataset.thk];
      const list = (A && A.a[cv.dataset.thi]) || [cv.dataset.thf];
      const rows = [];
      for (const fn of list) {
        const fr = A.f[fn]; if (!fr) continue;
        /* 화면과 같은 경로로 그린다 */
        drawSpriteTo(cv, { k: cv.dataset.thk, frame: fn, tint: '', fit: TH_PAD,
                           bright: +cv.dataset.thbr || 1 });
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          if (d[(y * cv.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) { rows.push({ fn, empty: true }); continue; }
        rows.push({ fn, src: fr[2] + 'x' + fr[3],
                    m: [x0, y0, cv.width - 1 - x1, cv.height - 1 - y1] });   /* 좌 상 우 하 여백 */
      }
      res.push({ card: ci + 1, k: cv.dataset.thk, anim: cv.dataset.thi,
                 cv: [cv.width, cv.height], rows });
    });
    return res;
  });
  let worst = 999;
  out.forEach(c => {
    const mins = c.rows.filter(r => r.m).map(r => Math.min(...r.m));
    const mn = Math.min(...mins);
    worst = Math.min(worst, mn);
    console.log(`카드${c.card} ${c.k}/${c.anim} 캔버스 ${c.cv.join('x')} — 프레임 ${c.rows.length}장, 최소 여백 ${mn}`);
    c.rows.forEach(r => console.log(`    ${r.fn} src=${r.src} 여백(좌상우하)=${(r.m || []).join(',')}`));
  });
  console.log(`\n전 카드 전 프레임 최소 여백 = ${worst}`);
  await b.close();
})();
