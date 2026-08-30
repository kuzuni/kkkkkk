const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const URL='file://'+path.resolve('/home/user/kkkkkk','index.html');
(async()=>{
 let b; try{b=await chromium.launch();}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});}
 const p=await(await b.newContext()).newPage(); await p.goto(URL);
 await p.waitForFunction(()=>typeof SKILLS!=='undefined');
 const r=await p.evaluate(()=>{
  const H=s=>s.id==='shuri'?8:s.id==='bolt'?3:s.id==='multi'?3:(s.hits||1);
  const D=s=>s.cd>0? s.m*H(s)/s.cd : s.m*3;
  const all=SKILLS.map(s=>({id:s.id,g:s.g,cd:s.cd,m:s.m,h:H(s),d:+D(s).toFixed(4)}));
  const mean=all.reduce((a,x)=>a+x.d,0)/all.length;
  const gm={}; all.forEach(x=>{(gm[x.g]=gm[x.g]||[]).push(x.d)});
  return {all,mean:+mean.toFixed(4),gmean:Object.keys(gm).map(g=>({g,m:+(gm[g].reduce((a,b)=>a+b,0)/gm[g].length).toFixed(4),n:gm[g].length}))};
 });
 console.log('전체 평균 dps =',r.mean);
 console.log('등급 평균:',JSON.stringify(r.gmean));
 const REF=1.84;
 console.log('\nREF='+REF);
 r.all.forEach(x=>{
  const nm = x.cd>0 ? REF*x.cd/x.h : REF/3;
  console.log(`  ${x.id.padEnd(8)} g${x.g} cd${x.cd.toFixed(2)} h${x.h} m ${x.m} -> ${(Math.round(nm*10000)/10000)}  (dps ${x.d} -> ${REF})`);
 });
 await b.close();
})();
