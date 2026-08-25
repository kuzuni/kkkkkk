const path=require('path');
const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk/index.html');
const OUT='/tmp/claude-0/-home-user-kkkkkk/a7ced47b-81e8-5752-9441-8abf5b06f8b6/scratchpad/';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1200);
 await p.evaluate(()=>{S.gold=9e12;S.dia=9e6;}); await p.waitForTimeout(300);
 const t0=Date.now();
 const info=await p.evaluate(async()=>{
   document.querySelector('.tab[data-t="hero"]').click();
   await Promise.resolve(); await Promise.resolve();
   const A=document.getAnimations(); A.forEach(a=>a.pause());
   window.__A=A;
   A.forEach(a=>{try{a.currentTime=90}catch(_){}});
   const tb=document.getElementById('tabbar');
   const hit=document.elementFromPoint(148,2190);
   return 'tabbar.class="'+tb.className+'" z='+getComputedStyle(tb).zIndex
     +' | hit@(148,2190)='+(hit?(hit.id||hit.className):'null')
     +' | .tx scale='+getComputedStyle(document.querySelector('.tab[data-t="hero"] .tx')).scale;
 });
 console.log('elapsed before shot(ms)=',Date.now()-t0);
 console.log(info);
 await p.screenshot({path:OUT+'true_t90.png'});
 const after=await p.evaluate(()=>'after shot: tabbar.class="'+document.getElementById('tabbar').className+'"');
 console.log('elapsed after shot(ms)=',Date.now()-t0); console.log(after);
 await b.close();
})();
