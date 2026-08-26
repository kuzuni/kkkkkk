/* 위 p58pz 로 «코드 배율은 두 재화 다 ×1.220» 임을 확인했다. 그런데 비평가 둘이 화면에서
   골드 +23~24% vs 다이아 +4~6% 를 쟀다 → **화면에 실제로 찍히는 rect** 를 재서 어디서 갈리는지 본다. */
const { pw, launch } = require('./tools/pwlaunch');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.goto('file://' + require('path').resolve(__dirname,'index.html') + '');
  await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    S.gold = 820; fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
    const q = QUESTS.find(x=>x.id==='kill'); S.quest.kill.base = q.get()-questGoal(q);
    openQuest('rep'); await sleep(420);
    const base = {};
    for (const k of ['gold','dia']) { const p = fxPill(FXCUR[k]); const r = p.getBoundingClientRect();
      base[k] = { w:r.width, h:r.height, x:r.left, y:r.top }; }
    const trace = [];
    let stop=false;
    const tick=()=>{ const rec={t:Math.round(performance.now())};
      for(const k of ['gold','dia']){ const p=fxPill(FXCUR[k]); const lit=fxLit.get(p);
        const el = lit ? lit.p : p; const r = el.getBoundingClientRect();
        rec[k]={w:+r.width.toFixed(1), h:+r.height.toFixed(1), clone:!!lit}; }
      trace.push(rec); if(!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    const rc = btn.getBoundingClientRect();
    const pe=t=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    await sleep(2000); stop=true;
    const o=[];
    o.push(`기준 rect 골드 ${base.gold.w.toFixed(1)}×${base.gold.h.toFixed(1)} · 다이아 ${base.dia.w.toFixed(1)}×${base.dia.h.toFixed(1)}`);
    for(const k of ['gold','dia']){
      const ws = trace.map(r=>r[k].w), hs = trace.map(r=>r[k].h);
      const w0 = ws[0], h0 = hs[0];
      o.push(`${k}: rect 폭 ${w0.toFixed(1)} → 최대 ${Math.max(...ws).toFixed(1)} (+${(100*(Math.max(...ws)/w0-1)).toFixed(1)}%)`
        + ` · 높이 ${h0.toFixed(1)} → 최대 ${Math.max(...hs).toFixed(1)} (+${(100*(Math.max(...hs)/h0-1)).toFixed(1)}%)`
        + ` · 복제판 프레임 ${trace.filter(r=>r[k].clone).length}/${trace.length}`);
      /* 100ms 리듬으로 표본하면 무엇이 잡히나 — 위상 0~90ms 를 10ms 씩 옮겨 본다 */
      const peaks=[];
      for(let ph=0; ph<100; ph+=10){
        let mx=1; for(let t=ph; t<2000; t+=100){
          const i = Math.min(trace.length-1, Math.round(t/16.7));
          mx = Math.max(mx, trace[i][k].w/w0);
        }
        peaks.push((100*(mx-1)).toFixed(1));
      }
      o.push(`   → 100ms 리듬 표본의 «관측 최대 +%» (위상 0~90ms): ${peaks.join(' / ')}`);
    }
    return o.join('\n');
  }));
  await b.close();
})();
