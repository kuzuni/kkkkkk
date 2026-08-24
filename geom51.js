/* 작업 51 — 시트 내부 좌표 덤프. 수정 전/후 파일에 각각 돌려 diff 하면 회귀 0 을 증명할 수 있다.
   사용: NODE_PATH=/opt/node22/lib/node_modules node geom51.js <파일> <폭> <높이> > out.txt */
const { chromium } = require('playwright');
const path = require('path');

const SHEETS = [
  { id: 'trw', key: 'grow', hero: null, sel: '#trw' },
  { id: 'eqw', key: 'hero', hero: 'eq', sel: '#eqw' },
  { id: 'bSk', key: 'hero', hero: 'sk', sel: '#panel' },
  { id: 'bPet', key: 'hero', hero: 'pet', sel: '#panel' },
];

function closeAll() {
  closeTrain(); closeDungeon(); closeShopPage(); closeRelicPage(); closeRelicTab();
  if (panelOpen) { panelOpen = false; syncPanel(); }
}
function openSheet(o) {
  if (o.hero) { heroTab = o.hero; S.heroTab = o.hero; }
  goTab(o.key);
}

/* 프레임 local 좌표로 모든 자손을 «태그.클래스[n]» 키로 덤프.
   작업 51 이 새로 넣은 래퍼(.shsc/.shsc-in)는 좌표 대조 대상이 아니므로 건너뛴다. */
function dump(sel) {
  const app = document.getElementById('app'), root = document.querySelector(sel);
  const ar = app.getBoundingClientRect(), sc = ar.width / 1080 || 1;
  const seen = {}, out = [];
  const key = e => {
    const c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/)
      .filter(x => x && x !== 'shsc' && x !== 'shsc-in').join('.');
    const k = (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (c ? '.' + c : '');
    seen[k] = (seen[k] || 0) + 1;
    return k + '[' + seen[k] + ']';
  };
  root.querySelectorAll('*').forEach(e => {
    if (e.classList.contains('shsc') || e.classList.contains('shsc-in')) return;
    const b = e.getBoundingClientRect();
    if (!b.width && !b.height) return;
    out.push(key(e) + ' ' + [(b.x - ar.x) / sc, (b.y - ar.y) / sc, b.width / sc, b.height / sc]
      .map(v => v.toFixed(2)).join(' '));
  });
  return out;
}

(async () => {
  const file = process.argv[2] || 'index.html';
  const w = +(process.argv[3] || 1080), h = +(process.argv[4] || 1920);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('!! PAGEERROR ' + e.message));
  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 500000, stage: 12, best: 12, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1, grow: 1 }
    }));
  });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(700);
  for (const s of SHEETS) {
    await page.evaluate(closeAll);
    await page.evaluate(openSheet, s);
    await page.waitForTimeout(150);
    const rows = await page.evaluate(dump, s.sel);
    console.log('=== ' + s.id + ' (' + rows.length + ')');
    rows.forEach(r => console.log(r));
    await page.evaluate(closeAll);
  }
  await browser.close();
})();
