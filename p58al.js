/* 31회차 검산 — 반영 ⓐ(플로터 이동량 38 → 62px)가 **화면에서** 그대로 나오는지.
   키프레임 값만 보고 «됐다» 로 적으면 A3 6회차의 «폭이 맞으면 크기가 맞은 것이 아니다» 와 같은
   사고가 난다. `getAnimations()` 로 애니를 시각별로 seek 해 잉크 상자를 직접 읽는다.
   같이 재는 것: 종점 잉크 하단 vs 그 기둥의 다음 장애물(골드 `#chapN` · 다이아 `#menub` 점 잉크). */
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
    S.dia = (S.dia||0) + 500; S.gold += 128000;
    await new Promise(r => setTimeout(r, 620));
    const res = { floaters:[], obstacles:{} };
    for(const f of document.querySelectorAll('#fxl .fx-plus.ui')){
      const an = f.getAnimations().find(a => (a.animationName || (a.effect && a.effect.getComputedTiming && 'x')) );
      const anim = f.getAnimations()[0];
      if(!anim) continue;
      const dur = anim.effect.getComputedTiming().duration;
      const pts = [];
      for(const pct of [0, 0.14, 0.25, 0.40, 0.50, 0.68, 1.0]){
        anim.currentTime = dur * pct; anim.pause();
        const r = f.getBoundingClientRect();
        pts.push({ pct, top:+r.y.toFixed(1), bot:+r.bottom.toFixed(1) });
      }
      res.floaters.push({ txt:f.textContent, left:f.style.left, base:f.style.top, dur, pts,
        travel:+(pts[6].top - pts[0].top).toFixed(1) });
    }
    const R = s => { const e = document.querySelector(s); if(!e) return null;
      const r = e.getBoundingClientRect(); return { y:+r.y.toFixed(1), b:+r.bottom.toFixed(1), x:+r.x.toFixed(1), r:+r.right.toFixed(1) }; };
    res.obstacles.chapN = R('#chapN');
    res.obstacles.menub = R('#menub');
    /* 메뉴 버튼의 «보이는 점» 잉크 — 자식 중 가장 위 */
    const mb = document.querySelector('#menub');
    if(mb){ let top = 1e9, box = null;
      for(const c of mb.querySelectorAll('*')){ const r = c.getBoundingClientRect();
        if(r.width>4 && r.height>4 && r.y < top){ top = r.y; box = { y:+r.y.toFixed(1), x:+r.x.toFixed(1), r:+r.right.toFixed(1) }; } }
      res.obstacles.menuDots = box; }
    res.obstacles.bdg = R('#menub .bdg') || R('.bdg');
    return res;
  });
  for(const f of out.floaters){
    console.log(`플로터 «${f.txt}» left=${f.left} base_top=${f.base} dur=${f.dur}ms  이동량=${f.travel}px`);
    console.log('   ' + f.pts.map(p => `${(p.pct*100).toFixed(0)}%:y${p.top}`).join(' '));
    console.log(`   종점 잉크 하단 = ${f.pts[6].bot}`);
  }
  console.log('장애물:', JSON.stringify(out.obstacles));
  await b.close();
})();
