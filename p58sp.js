/* 29차 2인 공통 ①-4: «씬 B 퍼짐이 사양 0.22s 대비 80~137ms 길다 — 씬 A 는 191ms 완료인데
   씬 B 만 1.6~1.9배 느리다». 코드는 두 씬이 같은 FX3_SPREAD·같은 이징을 쓴다 → rAF 마다
   **화면에 실제로 찍히는 클러스터 x 폭**을 재서 어느 쪽이 맞는지 본다.
   재는 것: 최대 폭 대비 도달률(%)이 85%·95%·99% 를 넘는 시각. */
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
    const out = [];
    for (const scene of ['gain','quest']) {
      if (scene === 'gain') {
        S.gold = 0; fxSeen.gold=0; fxDisp.gold=0; fxAcc.gold=0; fxHold.gold=0;
        document.querySelectorAll('#fxl b, #fxl s').forEach(e=>e.remove());
        fxAt({ x:540, y:1400 });
      } else {
        S.gold = 820; fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
        const q = QUESTS.find(x=>x.id==='kill'); S.quest.kill.base = q.get()-questGoal(q);
        openQuest('rep'); await sleep(420);
      }
      const trace=[]; let stop=false, t0=0;
      const tick=()=>{
        const els=[...document.querySelectorAll('#fxl .fx-fly')];
        if(els.length){
          if(!t0) t0=performance.now();
          const xs=els.map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
          if(xs.length>1){
            const l=Math.min(...xs.map(r=>r.left)), rr=Math.max(...xs.map(r=>r.right));
            const tp=Math.min(...xs.map(r=>r.top)), bt=Math.max(...xs.map(r=>r.bottom));
            trace.push({t:Math.round(performance.now()-t0), w:rr-l, h:bt-tp, n:xs.length});
          }
        }
        if(!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      if(scene==='gain') S.gold += 128000;
      else { const btn=document.querySelector('#mbox [data-q="kill"]:not([disabled])');
        const rc=btn.getBoundingClientRect();
        const pe=t=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
        btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click(); }
      await sleep(900); stop=true;
      /* 퍼짐 구간 = 아이콘 수가 최대인 동안(흡수 시작 전) */
      const nmax=Math.max(...trace.map(r=>r.n));
      const sp=trace.filter(r=>r.n===nmax && r.t<600);
      const wmax=Math.max(...sp.map(r=>r.w));
      const hit=p=>{ const r=sp.find(r=>r.w>=wmax*p); return r?r.t:null; };
      out.push(`[${scene}] n=${nmax} · 퍼짐 최대폭 ${wmax.toFixed(0)}px`
        + ` | 도달 85% ${hit(.85)}ms · 95% ${hit(.95)}ms · 99% ${hit(.99)}ms`
        + ` | 최대폭 시각 ${sp.find(r=>r.w>=wmax).t}ms`);
      out.push('   폭 궤적: ' + sp.filter((_,i)=>i%2===0).slice(0,14).map(r=>`${r.t}:${r.w.toFixed(0)}`).join(' '));
      if(scene==='quest'){ closeModal(); await sleep(300); }
      await sleep(1600);
      document.querySelectorAll('#fxl b, #fxl s').forEach(e=>e.remove());
    }
    return out.join('\n');
  }));
  await b.close();
})();
