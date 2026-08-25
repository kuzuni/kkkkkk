const path=require('path');
const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1200);
 await p.evaluate(()=>{S.gold=9e12;S.dia=9e6;}); await p.waitForTimeout(300);

 // ---- dialog close, all seeks inside ONE evaluate (no wall-clock gaps) ----
 await p.evaluate(()=>openProfile()); await p.waitForTimeout(600);
 const dlg=await p.evaluate(()=>{
   document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}});
   closeProfile();
   const A=document.getAnimations(); A.forEach(a=>a.pause());
   const el=document.getElementById('pfw');
   const box=el.firstElementChild;
   const out=['anims='+A.length+' pfw.class='+el.className];
   for(const t of [0,15,35,60,85,105,120,140]){
     A.forEach(a=>{try{a.currentTime=t}catch(_){}});
     const cs=getComputedStyle(el), bs=getComputedStyle(box);
     out.push('t='+t+' pfwDisp='+cs.display+' pfwOp='+cs.opacity+' boxScale='+bs.scale+' boxOp='+bs.opacity);
   }
   return out;
 });
 console.log('=== dlgclose (timers not yet fired) ===\n'+dlg.join('\n'));

 await p.waitForTimeout(800);
 await p.evaluate(()=>{document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}})});
 // ---- sheet close ----
 await p.evaluate(()=>openTrain()); await p.waitForTimeout(600);
 const sh=await p.evaluate(()=>{
   document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}});
   closeTrain();
   const A=document.getAnimations(); A.forEach(a=>a.pause());
   const el=document.getElementById('trw');
   const out=['anims='+A.length+' trw.class='+el.className];
   for(const t of [0,15,40,65,90,110,130,150]){
     A.forEach(a=>{try{a.currentTime=t}catch(_){}});
     const cs=getComputedStyle(el);
     out.push('t='+t+' disp='+cs.display+' translate='+cs.translate+' op='+cs.opacity+' rectTop='+Math.round(el.getBoundingClientRect().top));
   }
   return out;
 });
 console.log('=== sheetclose ===\n'+sh.join('\n'));
 await b.close();
})();
