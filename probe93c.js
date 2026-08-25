#!/usr/bin/env node
/* 93 — «숫자 · 도착 · 펄스» 의 선후를 스폰 기준 ms 로 잰다 (비평가 J ④ 지적 검증) */
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{
  for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}
  throw e;});}
(async()=>{
  const browser=await pwLaunch();
  const ctx=await browser.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('pageerror: '+e.message));
  await page.goto(URL,{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1;}window.step=()=>{};});
  const r=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    S.gold=900; fxHold.gold=0; await sleep(1800);
    const num=document.getElementById('goldN'), before=num.textContent;
    const pn0=fxPunchN;
    fxAt(fxWorld(player.x+12,player.y-20)); S.gold+=1280;
    let t0=0;
    for(let i=0;i<300;i++){ if(fxFlies.length&&fxFlies[0].ui){t0=fxFlies[0].st;break;} await sleep(3); }
    if(!t0) return {err:'no flies'};
    const N=fxFlies.filter(f=>f.ui).length;
    let firstArr=-1, firstNum=-1, firstPunch=-1, arrTs=[], numTs=[], punchTs=[], prev=N, pp=pn0;
    const nf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
    while(performance.now()-t0<2000){
      const t=performance.now()-t0;
      const c=fxFlies.filter(f=>f.ui).length;
      if(c<prev){ for(let k=0;k<prev-c;k++) arrTs.push(Math.round(t)); if(firstArr<0)firstArr=Math.round(t); prev=c; }
      if(num.textContent!==before){ if(firstNum<0)firstNum=Math.round(t); numTs.push(Math.round(t)); }
      if(fxPunchN>pp){ for(let k=0;k<fxPunchN-pp;k++) punchTs.push(Math.round(t)); if(firstPunch<0)firstPunch=Math.round(t); pp=fxPunchN; }
      await nf();
    }
    return {N, firstArr, firstNum, firstPunch, arr:arrTs, punch:punchTs, nSteps:new Set(numTs).size,
            plusAt: null};
  });
  console.log(JSON.stringify(r,null,1));
  await browser.close();
})();
