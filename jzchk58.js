/* 22회차 — «트리거 직후 무반응»(AJ #6 · AK #4·#5)이 게임 결함인지 하네스 결함인지 가른다.
   60 쥬시의 press 피드백은 pointerdown 에 걸려 있는데, cap58 의 quest 는 b.click() 로만 누른다. */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html');
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport:{width:1080,height:2280} })).newPage();
  await p.goto(URL, { waitUntil:'load' }); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const snap = b => ({ cls:b.className, tr:getComputedStyle(b).transform });
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(400);
    let b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    out.before = snap(b);
    b.click(); await sleep(30);
    out.afterClick = snap(b);
    /* 다시 열어서 pointerdown 경로로 */
    await sleep(1800); closeModal(); await sleep(200);
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(400);
    b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    const rc = b.getBoundingClientRect();
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:rc.left+rc.width/2, clientY:rc.top+rc.height/2 }));
    await sleep(30);
    out.afterPd = snap(b);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await br.close();
})();
