/* 작업 32 — **보상받기(02 ④) 상태** 캡처. 32 의 수정이 `.todo` 밖으로 새지 않았음을 눈으로 확인하는 증거.
   실행: node tools/cap32ready.js [출력경로]   */
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || 'docs/review/32-ready-r4.png';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    window.drawTuto = function(){
      const box = document.getElementById('tuto');
      box.classList.remove('off', 'todo'); box.classList.add('ready');
      document.getElementById('tutoBtn').textContent  = '[보상받기]';
      document.getElementById('tutoBtn').disabled     = false;
      document.getElementById('tutoName').innerHTML   = '적 <em>50</em>마리 처치하기';
      document.getElementById('tutoRew').textContent  = '🎁';
      document.getElementById('tutoSub').textContent  = '3';
    };
    drawTuto();
  });
  await p.waitForTimeout(120);
  await p.evaluate(() => drawTuto());
  await p.screenshot({ path: out });
  console.log('captured ' + out + (errs.length ? '  ⚠ 콘솔 에러 ' + errs.length : '  콘솔 에러 0'));
  await b.close();
})();
