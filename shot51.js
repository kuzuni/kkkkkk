/* 작업 51 — 시트 캡처. 수정 전/후 파일에 각각 돌려 픽셀 대조(9:16 회귀 0)와
   넓은 화면 시각 확인에 쓴다.
   사용: NODE_PATH=/opt/node22/lib/node_modules node shot51.js <파일> <폭> <높이> <접두사> [scrollBottom] */
const { chromium } = require('playwright');
const path = require('path');

const SHEETS = [
  { id: 'tr', key: 'grow', hero: null },
  { id: 'eq', key: 'hero', hero: 'eq' },
  { id: 'sk', key: 'hero', hero: 'sk' },
  { id: 'pet', key: 'hero', hero: 'pet' },
];

function closeAll() {
  closeTrain(); closeDungeon(); closeShopPage(); closeRelicPage(); closeRelicTab();
  if (panelOpen) { panelOpen = false; syncPanel(); }
}
function openSheet(o) {
  if (o.hero) { heroTab = o.hero; S.heroTab = o.hero; }
  goTab(o.key);
}
function scrollBottom() {
  document.querySelectorAll('.shsc').forEach(e => { e.scrollTop = e.scrollHeight; });
}

(async () => {
  const file = process.argv[2], w = +process.argv[3], h = +process.argv[4];
  const pre = process.argv[5], bot = process.argv[6] === 'bottom';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 500000, stage: 12, best: 12, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1, grow: 1 }
    }));
  });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(700);
  /* 살아 움직이는 요소(전투 캔버스·타이머 숫자)는 픽셀 대조를 방해하므로 정지시킨다 */
  await page.evaluate(() => {
    document.querySelectorAll('#stagearea,#tuto,#facTm,#goldN,#nickN,#cpN').forEach(e => e.style.visibility = 'hidden');
  });
  for (const s of SHEETS) {
    await page.evaluate(closeAll);
    await page.evaluate(openSheet, s);
    await page.waitForTimeout(200);
    if (bot) { await page.evaluate(scrollBottom); await page.waitForTimeout(120); }
    await page.screenshot({ path: pre + '-' + s.id + '.png' });
    await page.evaluate(closeAll);
  }
  await browser.close();
})();
