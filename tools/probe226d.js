#!/usr/bin/env node
/* 226 인과 증명(결정론) — 클릭 직후 **매 프레임** 옛 식을 재서
 * «옛 게이트가 FAIL 하는 프레임이 실재하고, 그 프레임이 정확히 `jz-st` 배율 창» 임을 보인다.
 *
 *   node tools/probe226d.js [반복횟수]
 *
 * 고정 대기(320ms 등)로 창을 «맞히는» 방식은 부하에 따라 빗나가므로(그래서 원래 증상이 «간헐» 이다)
 * 창 전체를 훑는다. scrollTop 은 전 프레임 586 고정, want 만 4~5 부푼다는 것이 요지다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const N = Math.max(1, parseInt(process.argv[2] || '3', 10));

(async () => {
  const browser = await launch(chromium);
  for (let run = 1; run <= N; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
    await page.waitForTimeout(400);
    await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
    await page.waitForTimeout(450);

    const r = await page.evaluate(async () => {
      const li = () => document.getElementById('shopList');
      const meas = () => {
        const l = li(), i = SHOP_BOXES.findIndex(x => x.b === 'pet'), card = l.children[i];
        const top = card.offsetTop - l.children[0].offsetTop;
        const cs = getComputedStyle(card);
        return { scrolled: l.scrollTop, sh: l.scrollHeight,
                 want: Math.max(0, Math.min(top, l.scrollHeight - l.clientHeight)),
                 st: card.classList.contains('jz-st'), scale: cs.scale, tf: cs.transform };
      };
      document.querySelector('#bPet [data-ptsum]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const t0 = performance.now(), rows = [];
      while (performance.now() - t0 < 1200) {
        await new Promise(x => requestAnimationFrame(x));
        rows.push(Object.assign({ t: Math.round(performance.now() - t0) }, meas()));
      }
      return rows;
    });

    const bad = r.filter(x => Math.abs(x.scrolled - x.want) > 2);
    const scrolls = [...new Set(r.map(x => x.scrolled))];
    console.log('--- run ' + run + ' — 프레임 ' + r.length + '개 · scrollTop 값 집합 [' + scrolls.join(',') + ']');
    console.log('    옛 식이 FAIL 하는 프레임: ' + bad.length + '개'
      + (bad.length ? ' (' + bad[0].t + '~' + bad[bad.length - 1].t + 'ms)' : ''));
    for (const b of bad.slice(0, 6))
      console.log('      ' + String(b.t).padStart(4) + 'ms  scrolled=' + b.scrolled + ' want=' + b.want
        + ' (Δ' + (b.want - b.scrolled) + ')  sh=' + b.sh + '  jz-st=' + b.st + '  scale=' + b.scale);
    await ctx.close();
  }
  await browser.close();
})();
