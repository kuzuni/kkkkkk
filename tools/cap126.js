/* 126 — 서체·토큰 적용 결과를 «화면 5장» 으로 캡처한다(1080×2280).
 * 지시서 검증의 «화면 5장 나란히 놓고 같은 게임으로 보이는가» 판정용.
 *   node tools/cap126.js [접미사]     → docs/review/126-s02[-접미사].png …
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SUF = process.argv[2] ? '-' + process.argv[2] : '';

const SCREENS = [
  { k: 's02-메인', steps: [] },
  { k: 's23-훈련', steps: ['.tab[data-t="grow"]'] },
  { k: 's10-상점', steps: ['.tab[data-t="shop"]'] },
  { k: 's22-퀘스트', steps: ['.side .ibtn[data-pop="quest"]'] },
  { k: 's19-프로필', steps: ['#profBtn'] },
];

(async () => {
  const browser = await launch(chromium);
  for (const s of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(600); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(300);
    const out = path.join(ROOT, 'docs/review', `126-${s.k}${SUF}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log('saved', path.basename(out));
    await ctx.close();
  }
  await browser.close();
})();
