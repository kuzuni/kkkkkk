/* 작업 346 — 코스튬 세부 팝업 캡처(보유 칸 · 미보유 칸).
 *   node tools/cap346.js  → docs/review/346-own.png · 346-un.png
 * 레퍼런스가 없는 화면이라 채점용이 아니라 «빈 면·겹침·두 번 적기» 를 눈으로 보는 자리다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const out = n => path.resolve(__dirname, '..', 'docs', 'review', n);

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showCosDetail === 'function');
  await page.waitForTimeout(800);
  /* 전투 캔버스의 데미지 숫자가 캡처를 오염시킨다(LESSONS 28-③) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  await page.evaluate(() => {
    const id = AVATARS[0].id;
    S.avatars[id] = 1; S.cosLv = S.cosLv || {}; S.cosLv[id] = 38; S.stone = 5e7; S.rank = 3; save();
    closeModal(); showCosDetail(id);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('346-own.png') });

  await page.evaluate(() => {
    const a = AVATARS.find(x => !cosOwn(x.id));
    closeModal(); showCosDetail(a.id);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('346-un.png') });

  await browser.close();
  console.log('CAP346 → docs/review/346-own.png · 346-un.png');
})();
