const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1200);
 await p.evaluate(()=>{S.gold=9e12;S.dia=9e6;});
 await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{
   openTrain();
   const tb=document.getElementById('tabbar'),trw=document.getElementById('trw');
   const out=[];
   out.push('immediately: tabbar.class='+tb.className+' z='+getComputedStyle(tb).zIndex+' trw z='+getComputedStyle(trw).zIndex);
   return out;
 });
 console.log(r.join('\n'));
 const r2=await p.evaluate(()=>{
   const tb=document.getElementById('tabbar');
   return 'after microtask: tabbar.class="'+tb.className+'" z='+getComputedStyle(tb).zIndex
     +' | elementFromPoint(108,2190)='+ (document.elementFromPoint(108,2190)||{}).id
     +'/'+((document.elementFromPoint(108,2190)||{}).className||'')
     +' | topmost at (540,2190)='+((document.elementFromPoint(540,2190)||{}).id||(document.elementFromPoint(540,2190)||{}).className);
 });
 console.log(r2);
 // paint order test: screenshot mid-slide by pausing
 const n=await p.evaluate(()=>{window.__a=document.getAnimations();window.__a.forEach(a=>a.pause());return window.__a.length;});
 await p.evaluate(()=>{window.__a.forEach(a=>{try{a.currentTime=60}catch(e){}})});
 await p.screenshot({path:'/tmp/claude-0/-home-user-kkkkkk/a7ced47b-81e8-5752-9441-8abf5b06f8b6/scratchpad/probe_t60.png'});
 const r3=await p.evaluate(()=>{
   const tb=document.getElementById('tabbar');
   return 'at t=60 seek: tabbar.class="'+tb.className+'" z='+getComputedStyle(tb).zIndex;
 });
 console.log('anims',n); console.log(r3);
 await b.close();
})();
