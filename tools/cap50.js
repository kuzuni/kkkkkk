/* 작업 50 — 코스튬 시트 캡처(기록용). 레퍼런스 스크린샷이 없는 화면이라 채점용이 아니라
 * «07 규격을 그대로 물려받았는지» 를 눈으로 확인하고 review 에 남기기 위한 것이다.
 *   node tools/cap50.js   → docs/review/50-r{1,2}.png
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const out = (n) => path.resolve(__dirname, '..', 'docs', 'review', n);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ avatar: 'av2', avatars: { av0: 1, av1: 1, av2: 1 }, dia: 400000 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(600);
  /* 캔버스 데미지 숫자가 캡처를 오염시킨다(LESSONS 28-③) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: out('50-r1.png') });
  /* 상세 팝업(08 껍데기) */
  await page.evaluate(() => document.querySelector('#bCos [data-cosun]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('50-r2.png') });
  await browser.close();
  console.log('CAP50 OK — docs/review/50-r1.png · 50-r2.png');
})();
