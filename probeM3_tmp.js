const path=require('path');
const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1200);
 await p.evaluate(()=>{S.gold=9e12;S.dia=9e6;}); await p.waitForTimeout(300);

 await p.evaluate(()=>openProfile()); await p.waitForTimeout(600);
 const dlg=await p.evaluate(async()=>{
   document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}});
   closeProfile();
   await Promise.resolve(); await Promise.resolve();   // let MutationObserver deliver
   const el=document.getElementById('pfw'); const box=el.firstElementChild;
   const A=document.getAnimations(); A.forEach(a=>a.pause());
   const out=['anims='+A.length+' pfw.class="'+el.className+'" disp='+getComputedStyle(el).display];
   for(const t of [0,15,35,60,85,105,120,140]){
     A.forEach(a=>{try{a.currentTime=t}catch(_){}});
     out.push('t='+t+' pfwOp='+getComputedStyle(el).opacity+' boxScale='+getComputedStyle(box).scale+' boxOp='+getComputedStyle(box).opacity);
   }
   return out;
 });
 console.log('=== dlgclose ===\n'+dlg.join('\n'));
 await p.waitForTimeout(900);
 await p.evaluate(()=>{document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}})});

 await p.evaluate(()=>openTrain()); await p.waitForTimeout(600);
 const sh=await p.evaluate(async()=>{
   document.getAnimations().forEach(a=>{try{a.finish()}catch(_){}});
   closeTrain();
   await Promise.resolve(); await Promise.resolve();
   const el=document.getElementById('trw');
   const A=document.getAnimations(); A.forEach(a=>a.pause());
   const out=['anims='+A.length+' trw.class="'+el.className+'" disp='+getComputedStyle(el).display+' tabbar="'+document.getElementById('tabbar').className+'"'];
   for(const t of [0,15,40,65,90,110,130,150]){
     A.forEach(a=>{try{a.currentTime=t}catch(_){}});
     out.push('t='+t+' translate='+getComputedStyle(el).translate+' op='+getComputedStyle(el).opacity+' rectTop='+Math.round(el.getBoundingClientRect().top));
   }
   return out;
 });
 console.log('=== sheetclose ===\n'+sh.join('\n'));
 await b.close();
})();
