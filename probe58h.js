/* upg 경로가 gain 보다 139ms 늦게 반응한다(비평가 U·V 공통) — 어디서 나오는지 실측 */
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{
  for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}throw e;});}
(async()=>{
  const b=await pwLaunch();
  const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const page=await ctx.newPage();
  await page.goto(URL,{waitUntil:'load'}); await page.waitForTimeout(1500);
  const r=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    S.gold=1e13; fxSeen.gold=S.gold; fxDisp.gold=S.gold; openTrain(); await sleep(600);
    const card=document.querySelector('#trw [data-tr]');
    /* renderTrainLive 단독 비용 */
    const t1=performance.now(); renderTrainLive(); const dLive=performance.now()-t1;
    /* fxUpOk 단독 비용 */
    const t2=performance.now(); fxUpOk(card,card); const dFx=performance.now()-t2;
    document.querySelectorAll('#fxl s').forEach(e=>e.remove());
    await sleep(400);
    /* 실제 누름 → 플래시 opacity 궤적 */
    const t0=performance.now();
    card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    const dHandler=performance.now()-t0;
    const tr=[];
    for(let i=0;i<40;i++){
      const f=document.querySelector('#fxl .fx-flash');
      tr.push({t:Math.round(performance.now()-t0), o:f?+(+getComputedStyle(f).opacity).toFixed(2):null,
               sp:document.querySelectorAll('#fxl .fx-spark').length});
      await sleep(10);
    }
    closeTrain();
    return {dLive:+dLive.toFixed(1), dFx:+dFx.toFixed(1), dHandler:+dHandler.toFixed(1), tr};
  });
  console.log('renderTrainLive():',r.dLive,'ms / fxUpOk():',r.dFx,'ms / pointerdown 핸들러 전체:',r.dHandler,'ms');
  let prev=null;
  for(const s of r.tr){ const k=s.o+'/'+s.sp; if(k!==prev){ console.log(`  t=${String(s.t).padStart(3)} flash.opacity=${s.o} spark=${s.sp}`); prev=k; } }
  await b.close();
})();
