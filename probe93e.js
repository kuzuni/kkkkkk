#!/usr/bin/env node
/* 93 — 형제 행 딤의 «걸리는 시각 · 풀리는 시각» 을 클릭 기준 ms 로 잰다 (비평가 Y ①② 검증) */
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{
  for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}
  throw e;});}
(async()=>{
  const b=await pwLaunch(); const c=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const page=await c.newPage(); page.on('pageerror',e=>console.log('pageerror: '+e.message));
  await page.goto(URL,{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1;}window.step=()=>{};});
  const r=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    S.dia=300; S.gold=900; fxHold.dia=0; fxHold.gold=0; await sleep(1700);
    S.quest.kill.base=-1e9; openQuest('rep'); await sleep(400);
    const bt=document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!bt) return {err:'버튼 없음'};
    const row=bt.closest('.qs-r'), par=row&&row.parentElement;
    const sibs=par?[].slice.call(par.children).filter(x=>x!==row):[];
    const t0=Date.now(); bt.click();
    let dimOn=-1, dimOff=-1, undimOn=-1, lastFly=-1, lastInBand=-1;
    const nf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
    while(Date.now()-t0<2600){
      const t=Date.now()-t0;
      const par2=document.querySelector('#mbox .qs-pn');
      const cur=par2?[].slice.call(par2.children):sibs;
      const anyDim=cur.some(x=>x.classList&&x.classList.contains('fx-dim'));
      const anyUn=cur.some(x=>x.classList&&x.classList.contains('fx-undim'));
      if(anyDim&&dimOn<0) dimOn=t;
      if(!anyDim&&dimOn>=0&&dimOff<0) dimOff=t;
      if(anyUn&&undimOn<0) undimOn=t;
      const fl=fxFlies.filter(f=>f.ui);
      if(fl.length) lastFly=t;
      for(const f of fl){ const b2=f.el.getBoundingClientRect();
        const cx=b2.left+b2.width/2, cy=b2.top+b2.height/2;
        if(cx<=976 && cy>=560 && cy<=970) lastInBand=t; }
      await nf();
    }
    return {dimOn, dimOff, undimOn, lastFly, lastInBand,
            opacityNow:(document.querySelector('#mbox .qs-pn > *')||{}).className||''};
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
