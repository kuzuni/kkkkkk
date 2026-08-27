/* 작업 32 — 가이드 미션 «미완료» 상태 배너 캡처 (1080×2280).
   레퍼런스 docs/ref/32-가이드미션-미완료-상태.jpg 와 픽셀 대조가 가능하도록
   배너 텍스트를 **레퍼런스와 같은 문자열**로 주입한다(측정표 61 §2 — 세 줄 모두 중심 정렬이라
   문자열 길이가 다르면 잉크 bbox 가 통째로 달라져 비교가 불가능하다).
   실행: node tools/cap32.js [출력경로]   */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const out = process.argv[2] || 'docs/review/32-r1.png';
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
    /* 레퍼런스 32 와 같은 문자열·수치로 배너를 고정한다. drawTuto 를 통째로 갈아끼워
       렌더 루프가 다시 돌아도 값이 흔들리지 않게 한다. */
    window.drawTuto = function(){
      const box = document.getElementById('tuto');
      box.classList.remove('off', 'ready');
      box.classList.add('todo');
      document.getElementById('tutoBtn').innerHTML    = '<b>[</b><i>미션</i><s>-</s><em>227</em><b>]</b>';
      document.getElementById('tutoBtn').disabled     = true;
      document.getElementById('tutoName').innerHTML   = '아무거나 소환 <em><u>1</u>0</em>회';
      document.getElementById('tutoPg').innerHTML     = '<b>(</b><em>0</em><s>/</s><em><u>1</u>0</em><b>)</b>';
      document.getElementById('tutoRew').textContent  = '💎';
      document.getElementById('tutoSub').textContent  = '200';
    };
    drawTuto();
  });
  await p.waitForTimeout(120);
  await p.evaluate(() => { drawTuto(); });
  await p.screenshot({ path: out });
  console.log('captured ' + out + (errs.length ? '  ⚠ 콘솔 에러 ' + errs.length + ': ' + errs.join(' | ') : '  콘솔 에러 0'));
  await b.close();
})();
