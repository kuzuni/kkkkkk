/* 19~20회차 — 토스트 퇴장 순간이동(AE +103px · AG +112px) 재현·회수 확인 */
const path=require('path');
const {pw,launch}=require('./tools/pwlaunch');
const {chromium}=pw();
const URL='file://'+path.resolve(__dirname,'index.html');
(async()=>{
  const b=await launch(chromium);
  const ctx=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1400);
  const r=await p.evaluate(async()=>{
    document.querySelectorAll('#fxl .fx-toast').forEach(e=>e.remove());
    fxToast('퀘스트 완료');
    const el=document.querySelector('#fxl .fx-toast');
    const cx=()=>{const b=el.getBoundingClientRect();return Math.round((b.left+b.right)/2*10)/10;};
    const nf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
    await new Promise(r=>setTimeout(r,400));
    const before=cx();
    el.classList.add('out');
    const s=[]; for(let i=0;i<8;i++){ await nf(); s.push(cx()); }
    return {before, after:s, max:Math.max(...s.map(v=>Math.abs(v-before)))};
  });
  console.log('토스트 중심 x — 퇴장 직전:', r.before);
  console.log('퇴장 후 8프레임:', r.after.join(', '));
  console.log('최대 이탈:', r.max.toFixed(1)+'px', r.max<=6?'→ PROBE58J PASS (≤6px)':'→ PROBE58J FAIL');
  await b.close();
  process.exit(r.max<=6?0:1);
})();
