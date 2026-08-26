/* 30회차 회귀 확인 — 밴드 스프레이는 `.qs-r`(퀘스트) 말고 `.ml-r`(우편) 행도 쓴다.
   폭 상수를 «슬롯 수 × 피치» 로 바꿨으므로 우편 행에서도 밴드를 안 벗어나는지 본다. */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  const errs=[]; pg.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  await pg.goto('file://' + path.resolve(__dirname,'index.html'));
  await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    if (typeof openMail !== 'function') return 'openMail 없음 — 우편 경로가 폐기됐다(작업 71)';
    openMail(); await sleep(500);
    const rows = [...document.querySelectorAll('.ml-r')];
    if (!rows.length) return '우편 행 0 — 받을 우편이 없다(회귀 확인 불가, 코드 경로는 퀘스트와 동일)';
    const btn = document.querySelector('.ml-r button:not([disabled]), .ml-r [data-ml]:not([disabled])');
    if (!btn) return `우편 행 ${rows.length}개인데 수령 가능한 버튼 0`;
    const rr = fxRect(rows[0]);
    const e0 = fx3Escape({x: rr.x + 100, y: rr.y + rr.h/2}); const e = e0 ? {ey:e0.ey, h: e0.h != null ? e0.h : NaN} : null;
    const rc = btn.getBoundingClientRect();
    const pe=t=>new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    await sleep(300);
    const f = fxFlies.filter(x=>x.ui);
    if(!f.length) return `밴드 ${e?('실폭 '+(isNaN(e.h)?'?':e.h.toFixed(0))+'px'):'없음'} · 비행체 0(수령 경로가 재화를 안 쏜다)`;
    const xs=f.map(o=>o.ax), ys=f.map(o=>o.ay);
    let near=1e9; for(let i=0;i<f.length;i++) for(let j=i+1;j<f.length;j++)
      near=Math.min(near, Math.hypot(f[i].ax-f[j].ax, f[i].ay-f[j].ay));
    const out = e && f[0].bnd
      ? `밴드 실폭 ${(isNaN(e.h)?'?':e.h.toFixed(0))}px · ey ${e.ey.toFixed(0)} | 끝점 x ${Math.min(...xs).toFixed(0)}~${Math.max(...xs).toFixed(0)}`
        + ` · y ${Math.min(...ys).toFixed(0)}~${Math.max(...ys).toFixed(0)}`
        + ` | 밴드 이탈 ${ys.filter(y=>y < e.ey-(isNaN(e.h)?26:e.h)/2-1 || y > e.ey+(isNaN(e.h)?26:e.h)/2+1).length}개 | 최근접 ${near.toFixed(1)} | n=${f.length}`
      : `밴드 미사용(부채꼴 경로) — n=${f.length} · 최근접 ${near.toFixed(1)}`;
    return out;
  }));
  await b.close();
  console.log('콘솔 에러 ' + errs.length + '건');
})();
