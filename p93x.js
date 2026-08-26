const path=require('path');const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk','index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}throw e;});}
(async()=>{const b=await pwLaunch();const c=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});const page=await c.newPage();
await page.goto(URL,{waitUntil:'load'});await page.waitForTimeout(1200);
await page.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1;}window.step=()=>{};});
const R=await page.evaluate(async()=>{
 const nf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
 S.gold=0;fxSeen.gold=0;fxDisp.gold=0;fxAcc.gold=0;fxHold.gold=0;
 await new Promise(r=>setTimeout(r,600));
 const t0=performance.now();
 fxAt(fxWorld(player.x+12,player.y-20));S.gold+=128000;
 const out=[];
 while(performance.now()-t0<420){await nf();const t=performance.now()-t0;
  const fl=fxFlies.filter(f=>f.ui);if(!fl.length){out.push({t:+t.toFixed(0),n:0});continue;}
  const rs=fl.map(f=>fxRect(f.el)).filter(Boolean);
  const xs=rs.map(r=>r.x+r.w/2),ys=rs.map(r=>r.y+r.h/2);
  const par=fl[0].el.parentElement;
  out.push({t:+t.toFixed(0),n:fl.length,
   x1:Math.min(...xs).toFixed(0),x2:Math.max(...xs).toFixed(0),
   y1:Math.min(...ys).toFixed(0),y2:Math.max(...ys).toFixed(0),
   w:rs[0].w.toFixed(1),op:getComputedStyle(fl[0].el).opacity,
   par:par?par.id||par.className:'?',
   pop:par?getComputedStyle(par).opacity:'?',
   pz:par?getComputedStyle(par).zIndex:'?',
   pvis:par?getComputedStyle(par).visibility+'/'+getComputedStyle(par).display:'?',
   fs:getComputedStyle(fl[0].el).fontSize, ftx:(fl[0].el.textContent||'').slice(0,3),
   bg:getComputedStyle(fl[0].el).backgroundImage.slice(0,28)});
 }
 return out;});
for(const r of R.filter((_,i)=>i%3===0)) console.log(JSON.stringify(r));
await b.close();})().catch(e=>{console.error(e.message);process.exit(1)});
