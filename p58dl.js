/* 30회차 — fx-delta 방향 반전이 «경로 봉투를 한 픽셀도 안 바꾼다» 는 주장을 실측으로 확인한다.
   훈련 카드 기준 y272~356 안에 머무는지 · 아이콘(.ci)·버튼(.cb) 을 안 무는지. */
const { pw, launch } = require('./tools/pwlaunch');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  const errs=[]; pg.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  await pg.goto('file://' + require('path').resolve(__dirname,'index.html') + '');
  await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    closeModal(); S.gold = 1e13;
    fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
    document.querySelectorAll('#fxl b, #fxl s').forEach(e=>e.remove());
    openTrain(); await sleep(500);
    const c = document.querySelector('#trw [data-tr]');
    const cr = c.getBoundingClientRect();
    const ci = c.querySelector('.ci'), cb = c.querySelector('.cb'), cv = c.querySelector('.cv');
    const R = e => { const r = e && e.getBoundingClientRect(); return r ? {t:+(r.top-cr.top).toFixed(0), b:+(r.bottom-cr.top).toFixed(0)} : null; };
    const parts = { card:{t:0,b:+cr.height.toFixed(0)}, ci:R(ci), cv:R(cv), cb:R(cb) };
    const trace=[]; let stop=false;
    const tick=()=>{ const d=document.querySelector('#fxl .fx-delta');
      if(d){ const r=d.getBoundingClientRect();
        if(r.height>0) trace.push({t:+(r.top-cr.top).toFixed(1), b:+(r.bottom-cr.top).toFixed(1)}); }
      if(!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    await sleep(900); stop=true;
    if(!trace.length) return '델타 플로터가 안 생겼다';
    const top=Math.min(...trace.map(r=>r.t)), bot=Math.max(...trace.map(r=>r.b));
    const dir = trace[trace.length-1].t > trace[0].t ? '아래로' : '위로';
    return `카드기준 부품: 아이콘 ${JSON.stringify(parts.ci)} · .cv ${JSON.stringify(parts.cv)} · 버튼 ${JSON.stringify(parts.cb)}\n`
      + `델타 경로 봉투 y ${top.toFixed(0)}~${bot.toFixed(0)} · 방향 **${dir}** · 표본 ${trace.length}\n`
      + `아이콘 침범 ${trace.filter(r=>r.t < parts.ci.b).length}프레임 · 버튼 침범 ${trace.filter(r=>r.b > parts.cb.t).length}프레임\n`
      + `궤적 ${trace.filter((_,i)=>i%4===0).slice(0,10).map(r=>r.t.toFixed(0)).join('→')}`;
  }));
  await b.close();
  console.log('콘솔 에러 ' + errs.length + '건' + (errs.length?': '+errs.slice(0,3).join(' | '):''));
})();
