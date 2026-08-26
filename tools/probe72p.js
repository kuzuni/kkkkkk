/* 작업 72 8회차 — 03 던전 리스트 스크롤 fps 만 재는 최소 프로브.
   verify121 §7 과 같은 왕복 스크롤 120프레임이지만 게이트 전체(2분)를 안 돌려도 되게 잘라 냈다.
   변종(액자 코너·드롭섀도·8fps 재그리기)을 A/B 로 빨리 재려고 만든 것이다.
   실행: node tools/probe72p.js [html경로] [반복수]  → `avg=… med=…` 한 줄. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const file = process.argv[2] || path.resolve(__dirname, '../index.html');
const REP = +(process.argv[3] || 3);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(1000);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const run = () => p.evaluate(() => new Promise(res => {
    const el = document.getElementById('dunList');
    const ts = []; let n = 0, dir = 1;
    const step = t => {
      ts.push(t); n++;
      el.scrollTop += dir * 34;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
      if (el.scrollTop <= 2) dir = 1;
      if (n < 120) requestAnimationFrame(step);
      else {
        const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
        d.sort((x, y) => x - y);
        res({ avg: +(1000 / (d.reduce((s, v) => s + v, 0) / d.length)).toFixed(1),
              med: +d[Math.floor(d.length / 2)].toFixed(1) });
      }
    };
    requestAnimationFrame(step);
  }));

  await run();                       /* 워밍업 — 첫 왕복은 큰 그라디언트 타일 래스터가 섞인다 */
  const out = [];
  for (let i = 0; i < REP; i++) out.push(await run());
  const mid = (k) => [...out].sort((x, y) => x[k] - y[k])[Math.floor(out.length / 2)][k];
  console.log(`${path.basename(file)}  avg=${mid('avg')}fps  med=${mid('med')}ms  (${out.map(o => o.avg).join('/')})`);
  await b.close();
})();
