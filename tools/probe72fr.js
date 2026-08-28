/* 72 18회차 — 액자(.th) DOM box vs 카드 안쪽 여백 실측 */
const path=require('path');
const {pw,launch}=require('./pwlaunch');
const {chromium}=pw();
(async()=>{
  const b=await launch(chromium,{args:['--allow-file-access-from-files']});
  const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto('file://'+path.resolve(__dirname,'../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(()=>{document.querySelector('#tabbar [data-t="adv"]').click()});
  await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#dunList .dnc').forEach((c,i)=>{
      const cb=c.getBoundingClientRect();
      const th=c.querySelector('.th'); if(!th) return;
      const tb=th.getBoundingClientRect();
      const cs=getComputedStyle(c), ts=getComputedStyle(th);
      const bw=parseFloat(cs.borderTopWidth)||0;
      out.push({i:i+1,
        card:[+cb.x.toFixed(1),+cb.y.toFixed(1),+cb.width.toFixed(1),+cb.height.toFixed(1)],
        cardBorder:bw,
        th:[+tb.x.toFixed(1),+tb.y.toFixed(1),+tb.width.toFixed(1),+tb.height.toFixed(1)],
        thShadow:ts.boxShadow.slice(0,60), thOutline:ts.outline, thBorder:ts.borderTopWidth,
        marginTop:+(tb.y-(cb.y+bw)).toFixed(1),
        marginBottom:+((cb.bottom-bw)-tb.bottom).toFixed(1),
        marginRight:+((cb.right-bw)-tb.right).toFixed(1)
      });
    });
    return out;
  });
  r.forEach(o=>console.log(JSON.stringify(o)));
  await b.close();
})();
