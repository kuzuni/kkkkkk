/* 58 11회차 — 퀘스트 수령 비행의 «정지 구간» 실측 (비평가 Q·R 공통 지적: 327→453ms 126ms 정지) */
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.resolve(__dirname,'index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{
  for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}throw e;});}
(async()=>{
  const b=await pwLaunch();
  const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const page=await ctx.newPage();
  await page.goto(URL,{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1;}window.step=()=>{};});
  await page.evaluate(()=>{S.quest.kill.base=-1e9;openQuest('rep');});
  await page.waitForTimeout(400);
  const r=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const btn=document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!btn) return {err:'버튼 없음'};
    const t0=Date.now(); btn.click();
    const log=[];
    for(let i=0;i<110;i++){
      const fl=[...document.querySelectorAll('#fxl .fx-fly')].map(e=>{
        const m=/matrix\(([^)]+)\)/.exec(getComputedStyle(e).transform);
        const v=m?m[1].split(',').map(Number):null;
        return v?{x:Math.round(v[4]),y:Math.round(v[5]),o:+(+getComputedStyle(e).opacity).toFixed(2)}:null;
      }).filter(Boolean);
      const tst=document.querySelector('#fxl .fx-toast');
      const chk=document.querySelector('#fxl .fx-check');
      log.push({t:Date.now()-t0,n:fl.length,
        lead: fl.length? fl.map(f=>f.x+','+f.y).join(' | '):'-',
        toast: tst?+(+getComputedStyle(tst).opacity).toFixed(2):null,
        check: chk?+(+getComputedStyle(chk).opacity).toFixed(2):null});
      await sleep(8);
    }
    return {log};
  });
  if(r.err){console.log(r.err);process.exit(1);}
  let prev=null;
  for(const l of r.log){
    if(l.n===0 && !prev) { if(l.t<200) console.log(`t=${String(l.t).padStart(4)} 비행0 toast=${l.toast} check=${l.check}`); continue; }
    if(l.lead!==prev) console.log(`t=${String(l.t).padStart(4)} n=${l.n} toast=${l.toast} check=${l.check}  ${l.lead}`);
    else console.log(`t=${String(l.t).padStart(4)} n=${l.n} ---- 변화없음 ----`);
    prev=l.lead;
  }
  await b.close();
})();
