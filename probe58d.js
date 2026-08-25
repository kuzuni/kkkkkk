const path=require('path');const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERROR',e.message));
await p.goto('file://'+path.resolve('index.html'),{waitUntil:'load'});await p.waitForTimeout(1200);
await p.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1};window.step=()=>{}});
const r=await p.evaluate(async()=>{
  const s=ms=>new Promise(r=>setTimeout(r,ms));
  S.quest.kill.base=-1e9; openQuest('rep'); await s(400);
  const btn=document.querySelector('#mbox [data-q="kill"]:not([disabled])');
  const out=[]; const t0=Date.now(); btn.click();
  for(let i=0;i<40;i++){
    const t=document.querySelector('#fxl .fx-toast');
    const rc=t?t.getBoundingClientRect():null;
    out.push({dt:Date.now()-t0, has:!!t, op:t?+(+getComputedStyle(t).opacity).toFixed(2):null,
      top:rc?Math.round(rc.top):null, left:rc?Math.round(rc.left):null,
      w:rc?Math.round(rc.width):null, h:rc?Math.round(rc.height):null});
    await s(20);
  }
  return out;
});
r.filter((x,i)=>i<14).forEach(x=>console.log(`dt=${x.dt}ms has=${x.has} op=${x.op} top=${x.top} left=${x.left} ${x.w}x${x.h}`));
await b.close();})();
