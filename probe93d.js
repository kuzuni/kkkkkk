#!/usr/bin/env node
/* 93 — (a) 알약 펄스가 93ms 간격 표본에 몇 % 걸리나 (b) 아이콘의 «실제 렌더 크기» 가 단계별로 얼마나 되나 */
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
    const pb=document.querySelector('.cGold');
    fxAt(fxWorld(player.x+12,player.y-20)); S.gold+=1280;
    let t0=0;
    for(let i=0;i<300;i++){ if(fxFlies.length&&fxFlies[0].ui){t0=fxFlies[0].st;break;} await sleep(3); }
    if(!t0) return {err:'no flies'};
    /* (a) 93ms 간격 — 캡처와 같은 리듬으로 알약 배율을 표본 */
    const pill=[], sizes={spread:[],hold:[],abs:[]}; let maxSz={w:0,at:''};
    for(let i=0;i<80;i++){
      const t=performance.now()-t0;
      const m=String(getComputedStyle(pb).transform).match(/matrix\(([\d.\-]+)/);
      const live=document.querySelector('.cGold');
      pill.push([Math.round(t), m?+(+m[1]).toFixed(3):1,
                 (pb.getAnimations?pb.getAnimations().length:-1),
                 pb.classList.contains('fx-punch2')?1:0,
                 pb===live?1:0, pb.isConnected?1:0]);
      for(const f of fxFlies){
        if(!f.ui||!f.el.isConnected) continue;
        const b=f.el.getBoundingClientRect(); const w=Math.round(b.width);
        const ph = f.t<f.sd?'spread' : f.t<f.ha?'hold' : 'abs';
        sizes[ph].push(w);
        if(w>maxSz.w) maxSz={w, at:ph+'@'+Math.round(f.t*1000)+'ms s='+ (f.t<f.sd? '-' : '')};
      }
      await sleep(20);
    }
    const st=a=>a.length?[Math.min(...a),Math.max(...a),Math.round(a.reduce((x,y)=>x+y,0)/a.length)]:[];
    return { pill, maxSz, spread:st(sizes.spread), hold:st(sizes.hold), abs:st(sizes.abs),
             hits: pill.filter(p=>p[1]>=1.05).length, n: pill.length };
  });
  if(r.err){ console.log(r.err); } else {
    console.log('t:scale:anim:cls:same:conn ->'); console.log(r.pill.map(p=>p.join(':')).join(' '));
    console.log('≥1.05 표본', r.hits+'/'+r.n, '· 93ms 리듬 환산', r.pill.filter((_,i)=>i%5===0).filter(p=>p[1]>=1.05).length+'/'+Math.ceil(r.n/5));
    console.log('아이콘 렌더 폭 [min,max,avg] — 퍼짐', JSON.stringify(r.spread), '머묾', JSON.stringify(r.hold), '흡수', JSON.stringify(r.abs));
    console.log('최대', JSON.stringify(r.maxSz));
  }
  await browser.close();
})();
