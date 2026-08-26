#!/usr/bin/env node
/* 152 계측 — 10 상점 «이용권» 탭 타이틀(`.cn-ti`) 이 얼마나 오른쪽으로 치우쳤나.
 *
 *   node tools/probe152.js            → 수치 출력 + docs/review/152-r*.png
 *
 * 재는 것: 세 탭(소환·재화·이용권)의 타이틀 **박스 중심** 과 **잉크 중심** 을
 * 프레임 폭 1080 의 중앙(540) 과 비교한다. 잉크 중심은 글자가 실제로 칠해진
 * 화소의 좌우 끝으로 잡는다(박스는 가운데인데 잉크가 치우친 경우를 가리려고).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'review');
const TAG = process.argv[2] || 'r1';

const TABS = [
  ['summon', 'sum'],
  ['coin', 'coin'],
  ['pass', 'pass'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error] ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderShopPage === 'function');
  await page.waitForTimeout(600);
  await page.evaluate(() => { S.gold = 4.2e12; S.dia = 3.5e6; drawHud(); });

  for (const [name, cat] of TABS) {
    await page.evaluate(c => {
      try { closeShopPage && closeShopPage(); } catch (e) {}
      openShopPage();
      shopCat = c; setShopCatTabs(c); renderShopPage();
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    }, cat);
    await page.waitForTimeout(500);

    const m = await page.evaluate(() => {
      const w = document.querySelector('#shopList .cn-wrap');
      const t = w && w.querySelector('.cn-ti');
      if (!t) return null;
      const i = t.querySelector('i');
      const wr = w.getBoundingClientRect(), tr = t.getBoundingClientRect(), ir = i.getBoundingClientRect();
      const sc = wr.width / 1080;                 /* 프레임 스케일 → 1080 좌표로 되돌린다 */
      const L = r => (r.left - wr.left) / sc, W = r => r.width / sc;
      const cs = getComputedStyle(t);
      return {
        txt: i.textContent,
        boxL: +L(tr).toFixed(1), boxW: +W(tr).toFixed(1),
        inkL: +L(ir).toFixed(1), inkW: +W(ir).toFixed(1),
        cssLeft: cs.left, cssWidth: cs.width, align: cs.textAlign,
        wrapW: +wr.width.toFixed(1), sc: +sc.toFixed(4),
      };
    });
    if (!m) { console.log(name + ': .cn-ti 없음'); continue; }
    const boxC = m.boxL + m.boxW / 2, inkC = m.inkL + m.inkW / 2;
    console.log(
      '[' + name + '] "' + m.txt + '"  css(left=' + m.cssLeft + ' width=' + m.cssWidth + ' align=' + m.align + ')\n'
      + '   박스 x' + m.boxL + '..' + (m.boxL + m.boxW).toFixed(1) + ' (w' + m.boxW + ')  중심 ' + boxC.toFixed(1)
      + '  → 프레임중앙 540 대비 ' + (boxC - 540 >= 0 ? '+' : '') + (boxC - 540).toFixed(1) + 'px\n'
      + '   잉크 x' + m.inkL + '..' + (m.inkL + m.inkW).toFixed(1) + ' (w' + m.inkW + ')  중심 ' + inkC.toFixed(1)
      + '  → 프레임중앙 540 대비 ' + (inkC - 540 >= 0 ? '+' : '') + (inkC - 540).toFixed(1) + 'px'
    );
    const p = path.join(OUT, '152-' + TAG + '-' + name + '.png');
    await page.screenshot({ path: p });
    console.log('   saved ' + path.relative(ROOT, p));
  }
  await browser.close();
})();
