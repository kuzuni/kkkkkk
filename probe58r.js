/* 58 24회차 — 착수점 2 «꼬리 코인이 알약에 도착하지 않고 소멸».
   AN 은 «골드 아이콘 중심에서 34.5px 어긋난 우하단에서 소멸», AP 는 «(811,308) 에서 소멸 —
   알약까지 343px 남음» 으로 **10배 다른 값**을 냈다. 어느 쪽이 맞는지부터 확정한다(05 교훈 3).
   방법: rAF 마다 살아 있는 아이콘의 중심을 기억해 두고, 그 아이콘이 사라진 «마지막 프레임의
   좌표» 를 알약 아이콘 중심과 비교한다. 착지 클래스(.fx-land/.fx-land2)가 붙었는지도 같이 본다. */
const { chromium } = require('playwright');
const path = require('path');

const scene = process.argv[2] || 'quest';

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async (scene) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    S.dia = 300; S.gold = 4e5; fxHold.dia = 0; fxHold.gold = 0; await sleep(1600);
    const pillC = cur => {
      const p = fxPill(FXCUR[cur]); if(!p) return null;
      const i = p.querySelector('i') || p, r = i.getBoundingClientRect();
      return { x:+(r.left + r.width/2).toFixed(1), y:+(r.top + r.height/2).toFixed(1) };
    };
    if(scene === 'quest'){
      S.quest.kill.base = -1e9;
      openQuest('rep'); await sleep(400);
      const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
      if(!btn) return { err:'보상 받기 버튼 없음' };
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
      btn.click();
    }else{
      fxAt({ x:540, y:1400 }); S.gold += 1e5;      /* 씬 A — 메인 화면 재화 획득 */
    }
    const tgt = { gold:pillC('gold'), dia:pillC('dia') };
    const last = new Map(), meta = new Map(), t0 = performance.now();
    for(const f of fxFlies) if(f.ui && f.el) meta.set(f.el, f.cur);
    for(let i=0;i<200;i++){
      for(const f of fxFlies) if(f.ui && f.el) meta.set(f.el, f.cur);
      /* fxFlies 에서 빠진 뒤에도 «.fx-land2 트랜지션» 이 남으므로 **DOM 으로** 끝까지 쫓는다 */
      for(const el of document.querySelectorAll('#fxl .fx-fly')){
        const cur = meta.get(el); if(!cur) continue;
        const r = el.getBoundingClientRect(); if(!r.width) continue;
        const p = last.get(el) || { off:null };
        const cl = el.classList.contains('fx-land2') ? 2 : (el.classList.contains('fx-land') ? 1 : 0);
        last.set(el, { x:+(r.left + r.width/2).toFixed(1), y:+(r.top + r.height/2).toFixed(1),
          t:Math.round(performance.now() - t0), cur, land:cl,
          op:+parseFloat(getComputedStyle(el).opacity).toFixed(2),
          off: p.off != null ? p.off : (fxFlies.some(f => f.el === el) ? null : Math.round(performance.now() - t0)) });
      }
      await frame();
    }
    const rows = [...last.values()].sort((a, b2) => a.t - b2.t).map(v => ({
      ...v, d: tgt[v.cur] ? +Math.hypot(v.x - tgt[v.cur].x, v.y - tgt[v.cur].y).toFixed(1) : null }));
    return { tgt, rows };
  }, scene);
  if(out.err){ console.log(out.err); await b.close(); return; }
  console.log('씬 ' + scene + ' · 알약 중심 골드 ' + JSON.stringify(out.tgt.gold) + ' 다이아 ' + JSON.stringify(out.tgt.dia));
  console.log('\n 소멸t  재화   마지막좌표        알약까지  착지클래스  opacity  비행끝t');
  for(const r of out.rows) console.log(
    String(r.t).padStart(6) + '  ' + r.cur.padEnd(5) + ' (' + String(r.x).padStart(6) + ',' + String(r.y).padStart(6) + ')'
    + String(r.d).padStart(10) + String(r.land).padStart(10) + String(r.op).padStart(9) + String(r.off).padStart(9));
  const bad = out.rows.filter(r => r.d > 20);
  console.log('\n알약에서 20px 넘게 떨어져 사라진 아이콘 ' + bad.length + '/' + out.rows.length
    + (bad.length ? ' · 최대 ' + Math.max(...bad.map(r => r.d)).toFixed(1) + 'px' : ''));
  await b.close();
})();
