#!/usr/bin/env node
/* 93 14회차 — 핸드오프 ①«잔류 스프라이트» 를 자체 덤프로 확인한다.
   13회차 비평가 AJ ①: «알약 정중앙에 24~25px 코인이 마지막 도착 +317ms 까지 남는다».
   11회차에 넣은 착지 주행(`.fx-land2`)과 24회차(58)가 페이드를 주행 뒤로 미룬 것의 합이
   얼마인지 재는 것이 목적이다. 재는 값:
     ⓐ 마지막 «비행» 이 끝난 시각(fxFlies 의 ui 항목이 0 이 되는 t)
     ⓑ 그 뒤로 #fxl 에 «보이는»(opacity>0.05) 코인이 몇 ms 더 남는가
     ⓒ 그 코인의 렌더 폭(px)과 알약 중심까지의 거리 — 정중앙에 겹쳐 있으면 «잔류» 로 읽힌다
     ⓓ opacity 궤적(고원이 얼마나 긴가)
   판정이 아니라 **관측**이다. 게이트는 verify93.js 가 한다.                                */
const path = require('path'); const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){ const fs2 = require('fs'); return chromium.launch().catch(e => {
  for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){ try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  throw e; }); }

const TRACK = `
window.trackTail = async function trackTail(ms){
  const nf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  const pillC = () => { const p = fxPill(FXCUR.gold), i = p && p.querySelector('i'); return i ? fxPt(i) : null; };
  const samp = [];        /* [t, 비행수, 보이는 코인들] */
  let lastFly = -1;       /* ui 비행이 마지막으로 «있었던» 시각 */
  while(performance.now() - t0 < ms){
    await nf();
    const t = performance.now() - t0;
    const n = fxFlies.filter(f => f.ui).length;
    if(n > 0) lastFly = t;
    const coins = [];
    for(const el of document.querySelectorAll('#fxl .fx-fly, #fxl .fx-land2')){
      const op = +getComputedStyle(el).opacity;
      const rr = fxRect(el); if(!rr) continue;
      coins.push({ op:+op.toFixed(3), w:+rr.w.toFixed(1), h:+rr.h.toFixed(1),
                   x:+(rr.x+rr.w/2).toFixed(1), y:+(rr.y+rr.h/2).toFixed(1),
                   land:el.classList.contains('fx-land2') });
    }
    samp.push({ t:+t.toFixed(1), n, coins });
  }
  return { samp, lastFly, pill:pillC() };
};
`;

(async () => {
  const b = await pwLaunch();
  const c = await b.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await c.newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil:'load' }); await page.waitForTimeout(1200);
  await page.evaluate(() => { player.inv = 1e9; for(const e of enemies){ e.x = 1; e.y = 1; } window.step = () => {}; });
  await page.evaluate(TRACK);

  const A = await page.evaluate(async () => {
    S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
    await new Promise(r => setTimeout(r, 600));
    fxAt(fxWorld(player.x + 12, player.y - 20));
    S.gold += 128000;
    return await trackTail(2400);
  });
  const B = await page.evaluate(async () => {
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia; fxDisp.dia = S.dia; fxAcc.dia = 0; fxHold.dia = 0;
    document.querySelectorAll('#fxl .fx-plus, #fxl .fx-fly').forEach(e => e.remove());
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
    await new Promise(r => setTimeout(r, 500));
    const bt = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!bt) return { err:'버튼 없음' };
    bt.click();
    return await trackTail(2600);
  });

  const rep = (tag, R) => {
    if(R.err){ console.log(tag + ': ' + R.err); return; }
    const px = R.pill;
    console.log(`\n=== ${tag} ===  알약 중심 (${px.x.toFixed(0)}, ${px.y.toFixed(0)})`);
    console.log(`  마지막 «비행» 종료 t = ${R.lastFly.toFixed(0)}ms`);
    /* 비행이 끝난 뒤에도 보이는 코인 */
    const tail = R.samp.filter(s => s.t > R.lastFly);
    const vis = tail.filter(s => s.coins.some(cn => cn.op > 0.05));
    if(!vis.length){ console.log('  꼬리 잔류 없음 (비행 종료와 동시에 사라진다)'); }
    else {
      const last = vis[vis.length - 1];
      console.log(`  꼬리 잔류 **${(last.t - R.lastFly).toFixed(0)}ms** (t ${R.lastFly.toFixed(0)} → ${last.t.toFixed(0)}) · 표본 ${vis.length}프레임`);
      const ws = [], ds = [];
      for(const s of vis) for(const cn of s.coins){ if(cn.op <= 0.05) continue;
        ws.push(cn.w); ds.push(Math.hypot(cn.x - px.x, cn.y - px.y)); }
      ws.sort((a,z)=>a-z); ds.sort((a,z)=>a-z);
      console.log(`  그 코인 렌더 폭 중앙 ${ws[ws.length>>1].toFixed(1)}px (최소 ${ws[0].toFixed(1)} · 최대 ${ws[ws.length-1].toFixed(1)})`);
      console.log(`  알약 중심까지 중앙 ${ds[ds.length>>1].toFixed(1)}px (최소 ${ds[0].toFixed(1)} · 최대 ${ds[ds.length-1].toFixed(1)})`);
      const tr = vis.map(s => { const cn = s.coins.filter(z => z.op > 0.05).sort((a,z)=>z.op-a.op)[0];
        return `${(s.t - R.lastFly).toFixed(0)}:${cn.op.toFixed(2)}`; });
      console.log('  꼬리 opacity 궤적(Δt:op) ' + tr.join('  '));
    }
    /* 도착 직후 «보이는» 착지 포즈가 몇 프레임인지 — 24회차(58)가 노린 것 */
    const lands = R.samp.filter(s => s.coins.some(cn => cn.land && cn.op > 0.25)).length;
    console.log(`  착지 포즈가 opacity>0.25 로 잡힌 프레임 ${lands}개 (24회차 «도착이 한 프레임 이상 보인다» 의 실측)`);
  };
  rep('씬A(gain)', A); rep('씬B(quest)', B);
  await b.close();
})().catch(e => { console.error('probe93g 실패:', e.message); process.exit(1); });
