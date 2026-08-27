#!/usr/bin/env node
/* 251 임시 프로브 — 등급 안 티어 가중치와 실제 추첨 분포를 눈으로 본다.
 *   node tools/probe251.js
 * (게이트는 tools/verify251.js. 이 파일은 수치를 «보려고» 두는 것이다.)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof BANNERS !== 'undefined' && typeof tierWeights === 'function');

  const out = await page.evaluate(() => {
    const lines = [];
    lines.push('TIER_W_RATIO=' + TIER_W_RATIO + ' TIER_W_DIR=' + TIER_W_DIR);
    BKEYS.forEach(b => {
      const B = BANNERS[b];
      GRADE.forEach((G, g) => {
        const pool = B.list.filter(x => x.g === g);
        if (pool.length < 2) return;
        const w = tierWeights(pool, b);
        lines.push(b + ' g' + g + ' (' + G.n + ') n=' + pool.length + '  Σw=' + w.reduce((a, c) => a + c, 0).toFixed(12));
        pool.forEach((it, i) => lines.push('    ' + (w[i] * 100).toFixed(3) + '%  score=' +
          tierScore(it, b).toFixed(4) + '  ' + it.n));
      });
    });
    return lines.join('\n');
  });
  console.log(out);

  /* 실제 추첨 표본 — Math.random 을 LCG 로 고정해 재현 가능하게 */
  const draw = await page.evaluate(() => {
    let s = 123456789;
    const real = Math.random;
    Math.random = () => (s = (1103515245 * s + 12345) % 2147483648) / 2147483648;
    const res = {};
    ['weapon', 'skill', 'pet'].forEach(b => {
      S.sum[b].lv = SUM_MAXLV;
      const own = S.own; S.own = {};
      const cnt = {};
      for (let i = 0; i < 200000; i++) { const r = summonOne(b); cnt[r.it.id] = (cnt[r.it.id] || 0) + 1; }
      S.own = own;
      res[b] = cnt;
    });
    Math.random = real;
    return res;
  });
  Object.entries(draw).forEach(([b, cnt]) => {
    console.log('\n== ' + b + ' 20만 표본 ==');
    Object.entries(cnt).sort((a, c) => c[1] - a[1]).forEach(([id, n]) =>
      console.log('   ' + String(n).padStart(7) + '  ' + id));
  });
  console.log('\n콘솔 에러 ' + errs.length + '건');
  await browser.close();
})();
