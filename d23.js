/* 23 훈련팝업 «차분기» — ref(1080x2340) 와 캡처(1080x2280) 를 세로 OFF(=65) 정렬해 나란히 비교한다.
   9회차 비평가 P 가 만들었다. probe23.js 가 «한 이미지 한 스캔» 이라면 이 쪽은 «두 이미지 같은 줄» 이다 —
   요소별 bbox 채점으로는 안 잡히는 «통째로 빠진 레이어 / 두께가 절반인 레이어» 를 찾는 데 쓴다.
   사용: node d23.js '[{"job":"vcmp","x":700,"y0":1225,"y1":1285,"tol":9}]'   (vcmp=세로열, hcmp=가로행)
   ⚠ CAP 상수를 새 캡처 파일로 바꿔서 쓸 것. */
const { chromium } = require('playwright');
const fs = require('fs');
const REF='/home/user/kkkkkk/docs/ref/23-훈련-팝업.jpg';
const CAP=process.env.CAP23||'/home/user/kkkkkk/docs/review/23-r10.png';
const OFF=+(process.env.OFF23||65); /* 2026-08-25: 캡처 1080x2280 전환 → 바닥시트 오프셋 425→65 */
const uri=(f)=>'data:'+(/\.png$/i.test(f)?'image/png':'image/jpeg')+';base64,'+fs.readFileSync(f).toString('base64');
const jobs = JSON.parse(process.argv[2]);
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage();
await p.setContent('<canvas id=a></canvas><canvas id=b></canvas>');
const out=await p.evaluate(async([ru,cu,jobs,OFF])=>{
  const load=async(src,id)=>{const im=new Image();im.src=src;await im.decode();const c=document.getElementById(id);c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return {D:g.getImageData(0,0,c.width,c.height).data,W:c.width,H:c.height};};
  const R=await load(ru,'a'), C=await load(cu,'b');
  const px=(I,x,y)=>{const i=(y*I.W+x)*4;return [I.D[i],I.D[i+1],I.D[i+2]];};
  const res=[];
  const runs=(I,axis,fixed,a0,a1,tol)=>{
    const get=t=>axis==='v'?px(I,fixed,t):px(I,t,fixed);
    const o=[];let s=a0,cur=get(a0);
    for(let t=a0+1;t<=a1;t++){const q=get(t);
      if(Math.abs(q[0]-cur[0])>tol||Math.abs(q[1]-cur[1])>tol||Math.abs(q[2]-cur[2])>tol){o.push([s,t-1,t-s,cur]);s=t;cur=q;}}
    o.push([s,a1,a1-s+1,cur]);return o;};
  for(const j of jobs){
    const tol=j.tol===undefined?9:j.tol;
    if(j.job==='vcmp'){ // 세로 대조: ref y0..y1, cap = ref-OFF
      const a=runs(R,'v',j.x,j.y0,j.y1,tol);
      const c=runs(C,'v',j.x,j.y0-OFF,j.y1-OFF,tol);
      res.push({job:'vcmp',x:j.x,ref:a.map(r=>r[0]+'-'+r[1]+'('+r[2]+') '+r[3]),cap:c.map(r=>(r[0]+OFF)+'-'+(r[1]+OFF)+'('+r[2]+') '+r[3])});
    }
    if(j.job==='hcmp'){
      const a=runs(R,'h',j.y,j.x0,j.x1,tol);
      const c=runs(C,'h',j.y-OFF,j.x0,j.x1,tol);
      res.push({job:'hcmp',refy:j.y,ref:a.map(r=>r[0]+'-'+r[1]+'('+r[2]+') '+r[3]),cap:c.map(r=>r[0]+'-'+r[1]+'('+r[2]+') '+r[3])});
    }
    if(j.job==='px'){
      res.push({job:'px',x:j.x,y:j.y,ref:px(R,j.x,j.y),cap:px(C,j.x,j.y-OFF)});
    }
  }
  return res;
},[uri(REF),uri(CAP),jobs,OFF]);
for(const r of out){
  if(r.job==='px'){console.log(`PX x=${r.x} refy=${r.y}  ref=${r.ref}  cap=${r.cap}`);continue;}
  console.log('==== '+(r.job==='vcmp'?('VCOL x='+r.x):('HROW ref_y='+r.refy))+' (cap좌표는 ref기준 +OFF 환산표기)');
  console.log('  --REF--'); for(const l of r.ref) console.log('   R '+l);
  console.log('  --CAP--'); for(const l of r.cap) console.log('   C '+l);
}
await b.close();
})();
