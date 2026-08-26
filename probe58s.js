/* 58 24회차 — 착수점 3·4·5 를 한 번에 잰다(씬 C = 훈련 강화 피드백).
   3 «마지막 303ms 가 죽은 꼬리»  4 «세 씬 플로터 크기 일관성»  5 «플로터가 카드 아이콘을 관통».
   판정은 전부 DOM 실측 — 캡처(cap58)와 어긋나면 0번(중복 페인트)과 같은 계열이므로 여기가 기준이다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    S.gold = 1e12; S.dia = 1e6; fxHold.gold = 0; fxHold.dia = 0; await sleep(1500);
    /* ── 씬 A(메인 재화 획득)·씬 B(퀘스트 수령) 의 «+n» 잉크 크기 ── */
    const inkOf = el => { const r = el.getBoundingClientRect();
      return { fs:getComputedStyle(el).fontSize, h:+r.height.toFixed(1), w:+r.width.toFixed(1) }; };
    fxAt({ x:540, y:1400 }); S.gold += 12345;
    let a = null; for(let i=0;i<90;i++){ const e = document.querySelector('#fxl .fx-plus:not(.fx-delta)');
      if(e){ a = inkOf(e); break; } await frame(); }
    await sleep(2200);
    document.querySelectorAll('#fxl .fx-plus, #fxl .fx-fly').forEach(e => e.remove());
    /* ── 씬 C ── */
    openTrain(); await sleep(600);
    const card = document.querySelector('#trw [data-tr]');
    if(!card) return { err:'훈련 카드를 찾지 못했다' };
    const R = el => { const r = el.getBoundingClientRect();
      return { x:+r.left.toFixed(1), y:+r.top.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) }; };
    const geo = { card:R(card), ci:R(card.querySelector('.ci')), cv:R(card.querySelector('.cv')),
                  cn:R(card.querySelector('.cn')), cb:R(card.querySelector('.cb')) };
    const ov = (box, r) => {
      const w = Math.max(0, Math.min(box.x + box.w, r.right) - Math.max(box.x, r.left));
      const h = Math.max(0, Math.min(box.y + box.h, r.bottom) - Math.max(box.y, r.top));
      return { w, h, pct:+(100*w*h/(box.w*box.h)).toFixed(1), wp:+(100*w/box.w).toFixed(1) };
    };
    const t0 = performance.now();
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    const rows = []; let c = null, lastMove = 0, prevSig = '';
    for(let i=0;i<70;i++){
      const t = Math.round(performance.now() - t0);
      const d = document.querySelector('#fxl .fx-delta');
      const fx = [...document.querySelectorAll('#fxl > *')];
      let sig = '';
      for(const e of fx){ const r = e.getBoundingClientRect();
        sig += Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + ','
             + (+parseFloat(getComputedStyle(e).opacity).toFixed(2)) + ';'; }
      /* 카드 자체(버스트·플래시·펀치)도 «변화» 다 — transform·filter 를 서명에 넣는다 */
      const cs = getComputedStyle(card);
      sig += '|' + cs.transform + '|' + cs.filter + '|' + getComputedStyle(card.querySelector('.cv')).opacity;
      if(sig !== prevSig){ lastMove = t; prevSig = sig; }
      if(d){ const r = d.getBoundingClientRect();
        if(!c) c = inkOf(d);
        rows.push({ t, n:fx.length, y:Math.round(r.top), ci:ov(geo.ci, r).pct, ciw:ov(geo.ci, r).wp,
                    cv:ov(geo.cv, r).pct, cn:ov(geo.cn, r).pct });
      }else rows.push({ t, n:fx.length, y:null, ci:0, ciw:0, cv:0, cn:0 });
      await frame();
    }
    return { a, c, geo, rows, lastMove };
  });
  if(out.err){ console.log(out.err); await b.close(); return; }
  console.log('[4] 플로터 잉크 — 씬A/B «+n» ' + JSON.stringify(out.a) + '\n               씬C 델타   ' + JSON.stringify(out.c));
  const g = out.geo, rel = k => ({ x:+(g[k].x - g.card.x).toFixed(0), y:+(g[k].y - g.card.y).toFixed(0), w:g[k].w, h:g[k].h });
  console.log('\n[5] 카드 ' + JSON.stringify(g.card) + '  (카드 기준) 아이콘 ' + JSON.stringify(rel('ci'))
    + ' 수치 ' + JSON.stringify(rel('cv')) + ' 이름 ' + JSON.stringify(rel('cn')) + ' 버튼 ' + JSON.stringify(rel('cb')));
  console.log('\n t(ms)  #fxl  델타y   아이콘덮음%  (가로%)  수치행%  이름행%');
  for(const r of out.rows) if(r.t % 30 < 18) console.log(
    String(r.t).padStart(5) + String(r.n).padStart(6) + String(r.y).padStart(7)
    + String(r.ci).padStart(12) + String(r.ciw).padStart(9) + String(r.cv).padStart(9) + String(r.cn).padStart(9));
  console.log('\n[3] 마지막으로 «무엇이든 바뀐» 시각 = ' + out.lastMove + 'ms (그 뒤 프레임은 정지 프레임이다)');
  console.log('    현행 upg 캡처 슬롯 100/210/320/380/550/690/850 — ' + out.lastMove + 'ms 이후 슬롯은 빈 화면을 잰다');
  await b.close();
})();
