/* 작업 30 — 던전 입장 화면 캡처 (1080×2280).
   레퍼런스 30 과 같은 상태를 만든다: 황금 동굴 입장 직후, 타이머 29.6, 진행바 83% 부근.
   실행: node tools/cap30.js [출력경로]   */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const out = process.argv[2] || 'docs/review/30-r1.png';
(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const d = DUNGEONS[0]; S.dunTk[d.id] = 3;
    challengeDungeon(d);
    /* 레퍼런스와 같은 «막 들어온» 상태로 고정한다(캡처마다 흔들리지 않게) */
    dunRun.t = 29.6;
    dunRun.dmg = dunRun.need * 0.826;     /* ref 채움 475 / 574 = 82.6% */
    drawDunHud();
  });
  await p.waitForTimeout(60);
  await p.evaluate(() => { dunRun.t = 29.6; drawDunHud(); });
  await p.screenshot({ path: out });
  console.log('captured ' + out + (errs.length ? '  ⚠ 콘솔 에러 ' + errs.length + ': ' + errs.join(' | ') : '  콘솔 에러 0'));
  await b.close();
})();
