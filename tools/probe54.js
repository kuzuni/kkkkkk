/* 54 — 단상 캐릭터 캔버스의 «실제 잉크 bbox» 를 캔버스 안에서 직접 잰다(PIL 불필요). */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
function lo(){ for(const p of [process.env.PW_CHROMIUM,'/opt/pw-browsers/chromium'].filter(Boolean)){ try{ if(fs.existsSync(p)) return {executablePath:p}; }catch(e){} } return {}; }
(async()=>{
  const args=['--allow-file-access-from-files'];
  let b; try{ b = await chromium.launch({args}); }catch(e){ b = await chromium.launch(Object.assign({args},lo())); }
  const ctx = await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const p = await ctx.newPage();
  await p.goto('file://'+path.resolve('index.html'),{waitUntil:'load'});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ if(typeof openRank==='function') openRank(); else document.querySelector('[data-page="rank"],#rkw')&&0; });
  await p.waitForTimeout(1500);
  const out = await p.evaluate(()=>{
    const r = {};
    for(const k of [1,2,3]){
      const cv = document.getElementById('rkCh'+k); if(!cv){ r['c'+k]='no canvas'; continue; }
      const g = cv.getContext('2d'), d = g.getImageData(0,0,cv.width,cv.height).data;
      let x0=1e9,y0=1e9,x1=-1,y1=-1;
      for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++){
        if(d[(y*cv.width+x)*4+3]>16){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      }
      const host = cv.parentElement.getBoundingClientRect();
      r['c'+k] = { canvas:[cv.width,cv.height], ink:[x1-x0+1, y1-y0+1], inkAt:[x0,y0,x1,y1],
                   box:[Math.round(host.width),Math.round(host.height)] };
    }
    // 프레임 좌표계로 환산하려면 #app scale 필요
    const app = document.getElementById('app');
    r.scale = app ? (app.getBoundingClientRect().width/1080) : 1;
    return r;
  });
  console.log(JSON.stringify(out,null,1));
  await b.close();
})();
