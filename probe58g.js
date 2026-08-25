/* 클릭 → 첫 페인트 사이 150ms 가 어디서 나오는지 — rAF 프레임 길이와 각 단계 소요 실측 */
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
    /* 1) 평상시 rAF 프레임 길이 (메인 화면) */
    const fr=[]; let last=performance.now();
    await new Promise(res=>{let n=0;const tick=()=>{const t=performance.now();fr.push(+(t-last).toFixed(1));last=t;
      if(++n<30) requestAnimationFrame(tick); else res();};requestAnimationFrame(tick);});
    /* 2) 퀘스트 팝업 열고 각 단계 시간 */
    S.quest.kill.base=-1e9;
    const tA=performance.now(); openQuest('rep'); const dOpen=performance.now()-tA;
    await sleep(400);
    const fr2=[]; last=performance.now();
    await new Promise(res=>{let n=0;const tick=()=>{const t=performance.now();fr2.push(+(t-last).toFixed(1));last=t;
      if(++n<20) requestAnimationFrame(tick); else res();};requestAnimationFrame(tick);});
    /* 3) 클릭 핸들러 자체 소요 + 두 rAF 소요 + claim 소요 */
    const btn=document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    const t0=performance.now();
    let raf1=0,raf2=0;
    const mark=[];
    const origRAF=requestAnimationFrame;
    btn.click();
    const dHandler=performance.now()-t0;
    await new Promise(res=>origRAF(()=>{raf1=performance.now()-t0;origRAF(()=>{raf2=performance.now()-t0;res();});}));
    await sleep(300);
    /* 4) save() 단독 소요 */
    const tS=performance.now(); save(); const dSave=performance.now()-tS;
    const tR=performance.now(); openQuest('rep'); const dRender=performance.now()-tR;
    return {fr,fr2,dOpen:+dOpen.toFixed(1),dHandler:+dHandler.toFixed(1),
            raf1:+raf1.toFixed(1),raf2:+raf2.toFixed(1),dSave:+dSave.toFixed(1),dRender:+dRender.toFixed(1)};
  });
  console.log('메인 rAF 프레임 길이(ms):', r.fr.slice(2).join(' '));
  console.log('퀘스트 팝업 열린 뒤 rAF(ms):', r.fr2.slice(2).join(' '));
  console.log('openQuest 최초:', r.dOpen, 'ms / 재렌더:', r.dRender, 'ms / save():', r.dSave, 'ms');
  console.log('클릭 핸들러 자체:', r.dHandler, 'ms / raf1:', r.raf1, 'ms / raf2:', r.raf2, 'ms');
  await b.close();
})();
