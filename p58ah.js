/* 30회차 — BB ① / 29차 AZ ①-3 (라운드 건너 2인): «씬 B 는 트리거 후 한참 재화가 안 그려진다».
   r30 캡처의 픽셀로도 확인됐다 — 밴드 행 골드 화소가 f4(283ms) 664 → f5(383ms) 5149.
   그런데 정답표(=DOM 질의)는 t=91 에 이미 16개다. **DOM 에는 있는데 안 보인다** → 왜인지 잰다.
   같은 레이어(#fxl)의 체크·버스트는 t=91 에 이미 픽셀로 잡히므로 레이어 자체는 그려지고 있다. */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname,'index.html'));
  await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    S.gold = 820; fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
    const q = QUESTS.find(x=>x.id==='kill'); S.quest.kill.base = q.get()-questGoal(q);
    openQuest('rep'); await sleep(420);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    const rc = btn.getBoundingClientRect();
    const pe=t=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
    const t0 = performance.now();
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    const rows=[];
    for (const want of [40, 90, 150, 220, 290, 380, 470]) {
      while (performance.now()-t0 < want) await new Promise(r=>requestAnimationFrame(r));
      const els=[...document.querySelectorAll('#fxl .fx-fly')];
      const t=Math.round(performance.now()-t0);
      if(!els.length){ rows.push(`t=${t} .fx-fly 0개`); continue; }
      const e0=els[0], r0=e0.getBoundingClientRect(), cs=getComputedStyle(e0);
      const img=e0.querySelector('img'), ir=img?img.getBoundingClientRect():null;
      const cx=r0.left+r0.width/2, cy=r0.top+r0.height/2;
      const hit=document.elementFromPoint(cx,cy);
      const xs=els.map(e=>e.getBoundingClientRect());
      const vis=xs.filter(r=>r.width>2&&r.height>2).length;
      rows.push(`t=${t} n=${els.length} 보이는rect ${vis}`
        + ` | 첫개체 rect ${r0.width.toFixed(0)}x${r0.height.toFixed(0)} @${cx.toFixed(0)},${cy.toFixed(0)}`
        + ` op=${cs.opacity} vis=${cs.visibility} disp=${cs.display}`
        + ` | img ${ir?ir.width.toFixed(0)+'x'+ir.height.toFixed(0):'없음'}`
        + (img?` complete=${img.complete} nw=${img.naturalWidth}`:'')
        + ` | 그 점의 최상위 요소 <${hit?hit.tagName.toLowerCase()+(hit.className?'.'+String(hit.className).split(' ')[0]:''):'없음'}>`);
    }
    return rows.join('\n');
  }));
  await b.close();
})();
