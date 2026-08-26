/* 58 24회차 — 비평가 AR ①-1 «gain t=851~921 에서 중간 비행 코인 6개가 70ms 동안 완전 정지
   (앞뒤 420 → 0 → 1,140px/s). 같은 두 프레임에서 HUD 는 4,092px 이 바뀌었으므로 캡처 중복이 아니다».
   `verify93` [2b] 의 «정지 프레임 ≤2%» 는 **퀘스트 씬**만 재므로 gain 은 감시 밖이었다.
   여기서는 gain 씬을 rAF 마다 훑어 아이콘별 프레임간 변위를 내고, «변위 0 인데 다른 아이콘은
   움직인 프레임» 을 따로 센다 — 그게 AR 이 본 것이면 렌더 누락이고, 전부 같이 멈췄으면 rAF 결손이다. */
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
    S.gold = 0; S.dia = 1e5; fxHold.gold = 0; fxHold.dia = 0; await sleep(1500);
    const p = fxWorld(player.x + 12, player.y - 20);
    fxAt(p); S.gold += 128000;
    const rows = []; let prev = new Map(); const t0 = performance.now();
    for(let i=0;i<80;i++){
      const t = Math.round(performance.now() - t0);
      const cur = new Map(); let moved = 0, still = 0, maxd = 0, mind = 1e9;
      for(const f of fxFlies){
        if(!f.ui || !f.el || !f.el.isConnected) continue;
        if(f.el.classList.contains('fx-land2')) continue;   /* 착지 포즈는 «설계상 정지» */
        const r = f.el.getBoundingClientRect(); if(!r.width) continue;
        const c = [r.left + r.width/2, r.top + r.height/2];
        cur.set(f.el, c);
        const pv = prev.get(f.el);
        if(pv){ const d = Math.hypot(c[0] - pv[0], c[1] - pv[1]);
          if(d < 0.5) still++; else moved++;
          maxd = Math.max(maxd, d); mind = Math.min(mind, d); }
      }
      const n = still + moved;
      rows.push({ t, n, still, moved, maxd:+maxd.toFixed(1), mind:n ? +mind.toFixed(1) : 0 });
      prev = cur;
      await frame();
    }
    return rows;
  });
  console.log(' t(ms)  대상  정지  이동   최대변위  최소변위   판정');
  let mixed = 0, allStill = 0, samp = 0, froze = 0;
  for(const r of out){
    if(!r.n) continue;
    samp += r.n; froze += r.still;
    let v = '';
    if(r.still && r.moved){ v = '⚠ 일부만 정지 (렌더 누락 후보)'; mixed++; }
    else if(r.still && !r.moved){ v = '· 전부 정지 (rAF 결손/이징 평탄)'; allStill++; }
    console.log(String(r.t).padStart(5) + String(r.n).padStart(6) + String(r.still).padStart(6)
      + String(r.moved).padStart(6) + String(r.maxd).padStart(11) + String(r.mind).padStart(10) + '   ' + v);
  }
  console.log('\n정지 표본 ' + froze + '/' + samp + ' = ' + (100*froze/samp).toFixed(1)
    + '%  ·  «일부만 정지» 프레임 ' + mixed + '  ·  «전부 정지» 프레임 ' + allStill);
  console.log(mixed ? '→ 아이콘별로 갈리면 개별 렌더 누락이다(AR ①-1 이 본 것).'
                    : '→ 아이콘별로 안 갈린다 — 멈춘 프레임은 전부 같이 멈췄다(rAF 결손 계열).');
  await b.close();
})();
