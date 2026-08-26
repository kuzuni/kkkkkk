/* 58 23회차 검증 — 흡수 경로가 «출발 행의 콘텐츠»(제목 · 게이지 · 버튼 라벨)를 몇 프레임이나
   덮는지 DOM 좌표로 센다. 22차 비평 AL·AM 이 JPEG 에서 잰 것과 같은 양을 코드에서 재서
   처방 전/후를 숫자로 비교한다. 형제 행 관통(verify93 [2b])·역주행도 같이 센다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.dia = 300; S.gold = 4e5; fxHold.dia = 0; fxHold.gold = 0; await sleep(1600);
    S.quest.kill.base = -1e9;
    openQuest('rep'); await sleep(400);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!btn) return { err:'보상 받기 버튼 없음' };
    const row = btn.closest('.qs-r'), par = row.parentElement;
    const R = fxRect(row);
    const sibs = [].slice.call(par.children).filter(c => c !== row).map(c => fxRect(c)).filter(Boolean);
    /* 비평가가 이름을 댄 세 부품 */
    const part = {};
    const t = row.querySelector('.qs-t'), p = row.querySelector('.qs-p'), lb = row.querySelector('.qs-b');
    if(t) part.title = fxRect(t);
    if(p) part.gauge = fxRect(p);
    if(lb) part.btn = fxRect(lb);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true }));
    btn.click();
    const hit = { title:0, gauge:0, btn:0 }, hitF = { title:0, gauge:0, btn:0 };
    const hitA = { title:0, gauge:0, btn:0 }, hitAF = { title:0, gauge:0, btn:0 };
    let sib = 0, backs = 0, samp = 0, frames = 0, legMinY = 9999, horizY = [];
    const prev = new Map(); let f3prev = new Map();
    const nf = () => new Promise(r => requestAnimationFrame(() => r()));
    for(let i=0;i<80;i++){
      const f3 = new Map();
      for(const f of fxFlies) if(f.ui && f.el) f3.set(f.el, f.t >= f.ha ? 'abs' : 'pre');
      const els = document.querySelectorAll('#fxl .fx-fly');
      let any = false;
      const seen = { title:false, gauge:false, btn:false };
      const seenA = { title:false, gauge:false, btn:false };
      for(const e of els){
        if(e.classList.contains('fx-land') || e.classList.contains('fx-land2')) continue;
        const r = e.getBoundingClientRect(), sc = fxSc();
        const cx = (r.left + r.width/2 - sc.x)/sc.s, cy = (r.top + r.height/2 - sc.y)/sc.s;
        any = true;
        for(const k in part){
          const q = part[k];
          if(q && cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h){
            hit[k]++; seen[k] = true;
            if(f3.get(e) === 'abs'){ hitA[k]++; seenA[k] = true; }   /* 흡수(경로) 구간만 */
          }
        }
        for(const q of sibs) if(cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h) sib++;
        const pv = prev.get(e);
        if(pv){ samp++; if(cy > pv[1] + 1.5 && f3.get(e) === 'abs' && f3prev.get(e) === 'abs') backs++; }
        /* leg1 수평 주행이 실제로 어느 y 를 타는가 — x 가 행 안(<=행 우변)일 때의 y */
        if(f3.get(e) === 'abs' && cx > R.x && cx < R.x + R.w) horizY.push(Math.round(cy));
        if(f3.get(e) === 'abs') legMinY = Math.min(legMinY, cy);
        prev.set(e, [cx, cy]);
      }
      for(const k in seen) if(seen[k]) hitF[k]++;
      for(const k in seenA) if(seenA[k]) hitAF[k]++;
      if(any) frames++;
      f3prev = f3;
      await nf();
    }
    horizY.sort((a,c) => a - c);
    return { row:{ x:Math.round(R.x), y:Math.round(R.y), w:Math.round(R.w), h:Math.round(R.h) },
      part: Object.fromEntries(Object.entries(part).map(([k,v]) => [k, Math.round(v.y) + '~' + Math.round(v.y+v.h)])),
      ey: (fxFlies.find(f => f.ui && f.ey != null) || {}).ey,
      hit, hitF, hitA, hitAF, frames, sib, backs, samp,
      horizN: horizY.length,
      horizY: horizY.length ? { min:horizY[0], med:horizY[horizY.length>>1], max:horizY[horizY.length-1] } : null };
  });
  console.log(JSON.stringify(out));
  await b.close();
})();
