/* 31회차 — 착수점 4(«플로터 이동량 통일», BA P9 · BB ⑥ 2인 공통)의 **선결 실측**.
   15회차가 씬 A·B 플로터 하강을 46 → 24px 로 줄인 이유가 «STAGE 타이틀로 파고든다»(비평가 W)라,
   먼저 «알약 아래 빈 띠» 가 실제로 몇 px 인지 재지 않고 키우면 그 지적이 그대로 되돌아온다.
   재는 것: 골드·다이아 알약의 bbox, 그 아래 첫 요소(STAGE 배너 등)의 상단, 그리고 플로터가
   실제로 태어나는 y(`.fx-plus.ui` 의 top)와 애니메이션 끝점. */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.addInitScript('try{localStorage.clear()}catch(_){}');
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const R = el => { const r = el.getBoundingClientRect(); return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), b:+r.bottom.toFixed(1) }; };
    const res = { pills:{}, below:[], floater:null };
    for(const k of ['gold','dia']){
      const p = fxPill(FXCUR[k]);
      if(p) res.pills[k] = R(p);
    }
    /* 알약 아래에서 프레임 폭 안에 있는 요소들의 «상단» — 어디까지 내려갈 수 있는지 */
    const lo = Math.max(...Object.values(res.pills).map(p => p.b));
    const seen = new Set();
    for(const el of document.querySelectorAll('#app *')){
      const r = el.getBoundingClientRect();
      if(r.width < 8 || r.height < 8) continue;
      if(r.y < lo || r.y > lo + 400) continue;
      if(getComputedStyle(el).visibility === 'hidden') continue;
      const key = el.className + '|' + Math.round(r.y);
      if(seen.has(key)) continue; seen.add(key);
      res.below.push({ sel:(el.id ? '#'+el.id : '') + '.' + (el.className||'').toString().split(' ')[0],
                       y:+r.y.toFixed(1), x:+r.x.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) });
    }
    res.below.sort((a,b) => a.y - b.y);
    res.below = res.below.slice(0, 12);
    /* 플로터가 실제로 지나갈 «두 기둥»(골드 알약 열 · 다이아 알약 열) 안의 장애물만 따로 */
    res.cols = { gold:[], dia:[] };
    const COL = { gold:[695,786], dia:[955,1046] };
    for(const el of document.querySelectorAll('#app *')){
      const r = el.getBoundingClientRect();
      if(r.width < 6 || r.height < 6 || r.y < 80 || r.y > 480) continue;
      if(getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).opacity === '0') continue;
      for(const k in COL){
        if(r.right <= COL[k][0] || r.x >= COL[k][1]) continue;
        res.cols[k].push({ sel:(el.id?'#'+el.id:'') + '.' + ((el.className||'').toString().split(' ')[0]),
          y:+r.y.toFixed(1), b:+r.bottom.toFixed(1), x:+r.x.toFixed(1), w:+r.width.toFixed(1),
          t:(el.textContent||'').trim().slice(0,14) });
      }
    }
    for(const k in res.cols){ res.cols[k].sort((a,b)=>a.y-b.y); res.cols[k] = res.cols[k].slice(0,8); }
    /* 플로터를 실제로 하나 띄워서 top 을 읽는다 */
    S.gold += 128000;
    await new Promise(r => setTimeout(r, 700));
    const f = document.querySelector('#fxl .fx-plus.ui');
    if(f){ const r = f.getBoundingClientRect(); res.floater = { top:+f.style.top.replace('px','')||null,
      rect:R(f), text:f.textContent, fs:getComputedStyle(f).fontSize }; }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
