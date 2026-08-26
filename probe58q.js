/* 58 24회차 — 착수점 1 «스폰 뭉치가 행 제목 위에서 터진다» 를 코드로 잰다.
   AN 은 «면적 %», AP 는 «클러스터 중심이 보상 아이콘에서 +125px» 로 같은 것을 짚었다.
   여기서는 둘 다 낸다: 프레임마다 (a) 뭉치 bbox·중심 (b) 제목·게이지·버튼 각각의 «덮인 면적 %».
   퍼짐 부채꼴(FX3_PA0/PA1 · FX3_PR0/PR1)이 원인인지 확정하는 것이 목적이다. */
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
    const row  = btn.closest('.qs-r');
    const R = el => { const r = el.getBoundingClientRect();
      return { x:+r.left.toFixed(1), y:+r.top.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; };
    const geo = { row:R(row), icon:R(row.querySelector('.qs-i')), title:R(row.querySelector('.qs-t')),
                  gauge:R(row.querySelector('.qs-p')), btn:R(btn) };
    /* 제목은 블록이라 rect 가 행 끝까지 간다 — «잉크» 폭을 Range 로 다시 잰다 */
    const tn = row.querySelector('.qs-t');
    const rg = document.createRange(); rg.selectNodeContents(tn);
    const ir = rg.getBoundingClientRect();
    geo.titleInk = { x:+ir.left.toFixed(1), y:+ir.top.toFixed(1), w:+ir.width.toFixed(1), h:+ir.height.toFixed(1) };
    const ov = (a, r) => {                       /* r(DOMRect) 이 a 를 덮는 면적 % */
      const w = Math.max(0, Math.min(a.x + a.w, r.right) - Math.max(a.x, r.left));
      const h = Math.max(0, Math.min(a.y + a.h, r.bottom) - Math.max(a.y, r.top));
      return w * h;
    };
    const t0 = performance.now();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true }));
    btn.click();
    const rows = [];
    for(let i=0;i<58;i++){
      const els = [...document.querySelectorAll('#fxl .fx-fly')]
        .filter(e => parseFloat(getComputedStyle(e).opacity) > 0.02);
      let box = null; const cov = { titleInk:0, gauge:0, btn:0 };
      for(const e of els){
        const r = e.getBoundingClientRect(); if(r.width < 2) continue;
        box = box ? { x0:Math.min(box.x0, r.left), y0:Math.min(box.y0, r.top),
                      x1:Math.max(box.x1, r.right), y1:Math.max(box.y1, r.bottom) }
                  : { x0:r.left, y0:r.top, x1:r.right, y1:r.bottom };
        for(const k of ['titleInk','gauge','btn']) cov[k] += ov(geo[k], r);
      }
      rows.push({ t:Math.round(performance.now() - t0), n:els.length,
        cx: box ? Math.round((box.x0 + box.x1)/2) : null, cy: box ? Math.round((box.y0 + box.y1)/2) : null,
        w: box ? Math.round(box.x1 - box.x0) : 0, h: box ? Math.round(box.y1 - box.y0) : 0,
        tp: +(100*cov.titleInk/(geo.titleInk.w*geo.titleInk.h)).toFixed(1),
        gp: +(100*cov.gauge/(geo.gauge.w*geo.gauge.h)).toFixed(1),
        bp: +(100*cov.btn/(geo.btn.w*geo.btn.h)).toFixed(1) });
      await sleep(12);
    }
    return { geo, rows, K:{ PA0:FX3_PA0*180/Math.PI, PA1:FX3_PA1*180/Math.PI, PR0:FX3_PR0, PR1:FX3_PR1,
                            SPREAD:FX3_SPREAD, HOLD0:FX3_HOLD0, HOLD1:FX3_HOLD1 } };
  });
  if(out.err){ console.log(out.err); await b.close(); return; }
  const g = out.geo;
  console.log('행 ', JSON.stringify(g.row));
  console.log('아이콘 ', JSON.stringify(g.icon), ' 중심 x=' + (g.icon.x + g.icon.w/2).toFixed(1));
  console.log('제목잉크', JSON.stringify(g.titleInk));
  console.log('게이지 ', JSON.stringify(g.gauge));
  console.log('버튼  ', JSON.stringify(g.btn));
  console.log('부채꼴 ' + out.K.PA0.toFixed(0) + '°~' + out.K.PA1.toFixed(0) + '° · 반경 '
    + out.K.PR0 + '~' + out.K.PR1 + ' · 퍼짐 ' + out.K.SPREAD + 's');
  console.log('\n t(ms)  개수  뭉치중심(x,y)   뭉치w×h   제목%  게이지%  버튼%');
  for(const r of out.rows) console.log(
    String(r.t).padStart(5) + String(r.n).padStart(6) + '   ('
    + String(r.cx).padStart(4) + ',' + String(r.cy).padStart(5) + ')  '
    + String(r.w).padStart(4) + '×' + String(r.h).padStart(4)
    + String(r.tp).padStart(8) + String(r.gp).padStart(8) + String(r.bp).padStart(8));
  await b.close();
})();
