#!/usr/bin/env node
/* 캡처 하네스 — 작업 414 「34 축복 팝업 · 짧은 프레임(1600) 하단」
 *   node tools/cap414.js  → docs/review/414-cap-{2280,1600}.png
 * 351 규칙: 9:19(2280)·9:13.3(1600) 을 **짝으로** 찍어 비평가에게 둘 다 준다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'docs', 'review');
(async () => {
  const b = await launch(chromium);
  for (const H of [2280, 1600]) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto('file://' + SRC, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    await p.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, `414-cap-${H}.png`) });
    console.log('  →', `414-cap-${H}.png`);
    await ctx.close();
  }
  await b.close();
})();
