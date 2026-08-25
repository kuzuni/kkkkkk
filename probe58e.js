const path=require('path');const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1080,height:2280},deviceScaleFactor:1});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERROR',e.message));
await p.goto('file://'+path.resolve('index.html'),{waitUntil:'load'});await p.waitForTimeout(1200);
await p.evaluate(()=>{player.inv=1e9;for(const e of enemies){e.x=1;e.y=1};window.step=()=>{}});

// (A) 훈련 카드 — 실제 입력(pointerdown/up)으로 눌렀을 때 카드 bbox 가 실제로 커지나
const card=await p.evaluate(async()=>{
  const s=ms=>new Promise(r=>setTimeout(r,ms));
  S.gold=1e13; openTrain(); await s(500);
  const key=document.querySelector('#trw [data-tr]').dataset.tr;
  const q=()=>document.querySelector('#trw [data-tr="'+key+'"]');
  const base=q().getBoundingClientRect().width;
  const t0=Date.now(); const out=[];
  q().dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  for(let i=0;i<26;i++){
    const el=q();
    const r=el?el.getBoundingClientRect():null;
    out.push({dt:Date.now()-t0, w:r?+(r.width/base).toFixed(3):null,
      cls:el?el.className:'', anim:el?getComputedStyle(el).animationName:''});
    await s(20);
  }
  closeTrain();
  return {base:Math.round(base), out};
});
console.log('[A] 훈련 카드 base 폭', card.base);
card.out.filter((_,i)=>i<16).forEach(r=>console.log(`   dt=${r.dt}ms  w×${r.w}  anim=${r.anim}  cls="${r.cls}"`));

// (B) HUD 알약 — 실제 재화 획득 경로에서 알약 bbox 가 커지나
const pill=await p.evaluate(async()=>{
  const s=ms=>new Promise(r=>setTimeout(r,ms));
  S.gold=90000; fxHold.gold=0; await s(1200);
  const el=document.querySelector('.cGold');
  const base=el.getBoundingClientRect().width;
  const t0=Date.now(); const out=[];
  fxAt(fxWorld(player.x,player.y)); S.gold+=128000;
  for(let i=0;i<34;i++){
    const r=el.getBoundingClientRect();
    out.push({dt:Date.now()-t0, w:+(r.width/base).toFixed(3), n:document.getElementById('goldN').textContent,
      fly:document.querySelectorAll('#fxl .fx-fly').length});
    await s(20);
  }
  return {base:Math.round(base), out};
});
console.log('[B] 알약 base 폭', pill.base);
pill.out.forEach(r=>console.log(`   dt=${r.dt}ms  w×${r.w}  골드=${r.n}  비행=${r.fly}`));
await b.close();})();
