/* 30회차 — «씬 B 는 t=283 에 재화가 화면에 없다»(BB ① · 29차 AZ ①-3, 라운드 건너 2인)의
   **게임 대 하네스** 판정. CDP 스크린캐스트는 부하가 걸리면 낡은 합성을 내보낸다(28회차 실측
   «바닥 56~68ms · 부하 시 488ms»). `page.screenshot()` 은 **강제로 새로 합성**하므로,
   같은 시각에 스크린샷에는 코인이 있고 스크린캐스트에는 없으면 결함은 캡처 쪽이다.
   느린 스크린샷(337~629ms)을 «연속 프레임» 으로 쓸 수는 없지만 **한 시각의 진위 판정**에는 쓸 수 있다. */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path'), fs = require('fs');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname,'index.html'));
  await pg.waitForTimeout(1500);
  /* rAF 를 죽여 정지시키므로 **표본마다 페이지를 다시 연다** — 안 그러면 첫 표본 뒤로 setup 이 못 돈다 */
  const setup = async () => { await pg.goto('file://' + path.resolve(__dirname,'index.html'));
    await pg.waitForTimeout(1500);
    return pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    closeModal(); await sleep(200);
    document.querySelectorAll('#fxl b, #fxl s, #fxl i').forEach(e=>e.remove());
    S.gold = 820; fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
    const q = QUESTS.find(x=>x.id==='kill'); S.quest.kill.base = q.get()-questGoal(q);
    openQuest('rep'); await sleep(420);
  }); };
  const out = [];
  for (const want of [0, 150, 283, 383]) {
    await setup();
    /* 기준(트리거 전) 한 장 */
    if (want === 0) { fs.writeFileSync('/tmp/p58ai-base.png', await pg.screenshot()); out.push('기준 저장'); continue; }
    await pg.evaluate(async (w) => {
      const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
      const rc = btn.getBoundingClientRect();
      const pe=t=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
      const t0 = performance.now();
      btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
      /* 목표 시각까지 rAF 로 대기한 뒤 **게임을 정지**시켜, 느린 스크린샷이 그 시각의 화면을 찍게 한다 */
      while (performance.now()-t0 < w) await new Promise(r=>requestAnimationFrame(r));
      /* 30회차 2차 — 프레임 진행을 **rAF 자체를 막아** 정지시킨다. 첫 시도(`fxTick` 교체)는
         전역 바인딩이 아니라 안 먹은 자리가 있어 283·383 표본이 «코인 0» 으로 나왔다. */
      window.__frz = true;
      window.requestAnimationFrame = () => 0;
      window.__t = Math.round(performance.now()-t0);
    }, want);
    const png = await pg.screenshot();
    fs.writeFileSync(`/tmp/p58ai-${want}.png`, png);
    out.push(`t≈${want}ms 스크린샷 저장 (실제 정지 시각 ${await pg.evaluate(()=>window.__t)}ms)`);
  }
  await b.close();
  console.log(out.join('\n'));
})();
