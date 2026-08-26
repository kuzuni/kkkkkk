/* 31회차 검산 — 반영 ⓒ(씬 A 발원 버스트)가 실제로 붙는지 + 260ms 간격 가드가 도는지.
   «만들어 놨다» 가 아니라 «실제로 DOM 에 생겼다» 를 본다(기능 완성 규칙). */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.addInitScript('try{localStorage.clear()}catch(_){}');
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    for(const e of enemies){ e.x = 1; e.y = 1; }
    document.querySelectorAll('#fxl s, #fxlc s').forEach(e => e.remove());
    const out = {};
    /* ① 전투 발 1회 — 버스트가 #fxlc(팝업 아래 레이어)에 생겨야 한다 */
    fxAt(fxWorld(player.x + 12, player.y - 20), 'combat'); S.gold += 5000;
    await sleep(70);
    out.combat_fxlc = document.querySelectorAll('#fxlc s').length;
    out.combat_fxl  = document.querySelectorAll('#fxl s').length;
    /* ② 260ms 가드 — 곧바로 한 번 더 쏘면 버스트가 «안 늘어야» 한다 */
    const before = document.querySelectorAll('#fxlc s').length;
    fxAt(fxWorld(player.x + 12, player.y - 20), 'combat'); S.gold += 5000;
    await sleep(70);
    out.guard_delta = document.querySelectorAll('#fxlc s').length - before;
    /* ③ 260ms 뒤에는 다시 나야 한다 */
    await sleep(420);
    document.querySelectorAll('#fxlc s').forEach(e => e.remove());
    fxAt(fxWorld(player.x + 12, player.y - 20), 'combat'); S.gold += 5000;
    await sleep(70);
    out.after_guard = document.querySelectorAll('#fxlc s').length;
    /* ④ UI 발(퀘스트)에는 이 버스트가 붙으면 안 된다 — 씬 B 는 자기 버튼 버스트가 있다 */
    document.querySelectorAll('#fxl s, #fxlc s').forEach(e => e.remove());
    S.gold = 820; fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    await sleep(80);
    const n0 = document.querySelectorAll('#fxlc s').length;
    fxTapEl = document.querySelector('#tabbar button') || document.body; fxTapT = performance.now();
    S.gold += 4000;
    await sleep(90);
    out.ui_fxlc_delta = document.querySelectorAll('#fxlc s').length - n0;
    return out;
  }), null, 1));
  await b.close();
})();
