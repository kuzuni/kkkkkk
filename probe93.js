#!/usr/bin/env node
/* 93 — UI 발 재화 흡수 3박자 실측 프로브 (개수 · 퍼짐 최대 반경 시각 · 첫/마지막 도착 · 알약 펄스 수) */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){
  const fs2 = require('fs');
  return chromium.launch().catch(e => {
    for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){
      try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){}
    }
    throw e;
  });
}
(async () => {
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { player.inv = 1e9; for(const e of enemies){ e.x = 1; e.y = 1; } window.step = () => {}; });

  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 90000; fxHold.gold = 0; await sleep(1400);
    const pb = document.querySelector('.cGold');
    const pi = (pb.querySelector('i') || pb).getBoundingClientRect();
    const T = { x:pi.left + pi.width/2, y:pi.top + pi.height/2 };
    const base = pb.getBoundingClientRect().width;
        const want = fmt(S.gold + 128000);
    const num = document.getElementById('goldN');
    const tTrig = performance.now();
    const pn0 = fxPunchN;
    fxAt(fxWorld(player.x + 140, player.y - 30));
    S.gold += 128000;
    let t0 = 0;
    for(let i=0;i<200;i++){ if(fxFlies.length && fxFlies[0].ui){ t0 = fxFlies[0].st; break; } await sleep(4); }
    if(!t0) return { err:'비행이 생성되지 않았다' };
    const spawnLag = Math.round(t0 - tTrig);
    const f0 = fxFlies[0], scv = fxSc(), sc = scv.s;
    const org = { x:scv.x + f0.sx*sc, y:scv.y + f0.sy*sc };
    const trace = [];
    let n0 = 0, first = -1, last = -1, prev = 0, pmax = 1, radT = -1, radMax = 0, rollDone = -1;
    while(performance.now() - t0 < 2200){
      const t = performance.now() - t0;
      /* «도착» 은 DOM 이 아니라 fxFlies 배열에서 빠지는 순간이다 — DOM 은 .fx-land 페이드 45ms 뒤에
         지워져 그만큼 늦게 읽힌다(43 교훈 1: 내 assert 가 어디를 재는지부터 확인). */
      const c = fxFlies.filter(f => f.ui).length;
      if(c > n0) n0 = c;
      /* «퍼짐 반경» — 출발점(프레임 px)에서의 평균 거리. 퍼짐 0.22s 에 최대가 되고 머묾 동안 그대로,
         흡수가 시작되면 알약 쪽으로 빠져나가며 «남아 있는 아이콘의 평균» 이 흔들리므로 0.40s 까지만 본다. */
      const els = document.querySelectorAll('#fxl .fx-fly');
      if(els.length && t > 60 && t < 420){
        let sum = 0;
        for(const e of els){ const b = e.getBoundingClientRect();
          sum += Math.hypot((b.left + b.width/2 - org.x)/sc, (b.top + b.height/2 - org.y)/sc); }
        const dd = sum/els.length;
        trace.push([Math.round(t), Math.round(dd)]);
        if(dd > radMax){ radMax = dd; radT = t; }
      }
      if(prev && c < prev){ if(first < 0) first = t; last = t; }
      prev = c;
      const mm = String(getComputedStyle(pb).transform).match(/matrix\(([\d.\-]+)/);
      pmax = Math.max(pmax, mm ? +mm[1] : 1, pb.getBoundingClientRect().width / base);
      if(rollDone < 0 && num.textContent === want) rollDone = t;
      await sleep(8);
    }
    return { n0, spawnLag, first:Math.round(first), last:Math.round(last),
             punchN:fxPunchN - pn0, pmax:+pmax.toFixed(3),
             radT:Math.round(radT), radMax:Math.round(radMax), rollDone:Math.round(rollDone),
             trace:trace.filter((_,i)=>i%3===0),
             rest: document.getElementById('fxl').childElementCount };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
