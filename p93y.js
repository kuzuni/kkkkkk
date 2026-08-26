/* 하네스 검증 — page.screenshot() 으로 트리거 +N ms 상태를 직접 찍는다.
   cap93 의 CDP 스크린캐스트가 앞 200ms 를 «빈 프레임» 으로 싣는지, 아니면 브라우저가 정말
   그동안 안 그리는지를 가른다. screenshot 은 느리지만(337~629ms) «찍기 시작한 순간» 의 상태다. */
const path=require('path');const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk','index.html').replace(/\\/g,'/');
function pwLaunch(){const fs2=require('fs');return chromium.launch().catch(e=>{for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium']){try{if(p&&fs2.existsSync(p))return chromium.launch({executablePath:p});}catch(_){}}throw e;});}
const AT = +(process.argv[2]||90);
(async()=>{const b=await pwLaunch();const c=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});const page=await c.newPage();
await page.goto(URL,{waitUntil:'load'});await page.waitForTimeout(1200);
await page.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1;}window.step=()=>{};});
/* 기준(트리거 전) */
await page.screenshot({path:'/home/user/kkkkkk/docs/review/93-h0.png'});
const info=await page.evaluate(async(at)=>{
 S.gold=0;fxSeen.gold=0;fxDisp.gold=0;fxAcc.gold=0;fxHold.gold=0;
 await new Promise(r=>setTimeout(r,600));
 window.__t0=performance.now();
 fxAt(fxWorld(player.x+12,player.y-20));S.gold+=128000;
 await new Promise(r=>setTimeout(r,at));
 const fl=fxFlies.filter(f=>f.ui);
 const rs=fl.map(f=>fxRect(f.el)).filter(Boolean);
 return {t:+(performance.now()-window.__t0).toFixed(0),n:fl.length,
   x1:rs.length?Math.min(...rs.map(r=>r.x)).toFixed(0):-1,
   y1:rs.length?Math.min(...rs.map(r=>r.y)).toFixed(0):-1,
   x2:rs.length?Math.max(...rs.map(r=>r.x+r.w)).toFixed(0):-1,
   y2:rs.length?Math.max(...rs.map(r=>r.y+r.h)).toFixed(0):-1};},AT);
await page.screenshot({path:'/home/user/kkkkkk/docs/review/93-h1.png'});
const after=await page.evaluate(()=>+(performance.now()-window.__t0).toFixed(0));
console.log(`DOM 기준: 촬영 시작 t=${info.t}ms · 비행 ${info.n}개 · bbox (${info.x1},${info.y1})-(${info.x2},${info.y2})`);
console.log(`촬영 종료 t=${after}ms`);
await b.close();})().catch(e=>{console.error(e.message);process.exit(1)});
