/* 30회차 — 29차 2인 공통 ②-2 «골드/다이아 펀치 진폭 4~5배 차»(AY «gain +21~28% vs quest
   +5.5~6.9%(다이아 +6%)» · AZ «골드 +23~24% vs 다이아 +4~6%, 임계 3종 부호 동일»).
   코드는 두 재화에 같은 fxPzHit/FX3_PZ_HIT 를 쓴다 — 그러면 왜 다른가를 직접 잰다.
   rAF 마다 «각 알약(원본·복제판)의 실효 배율» 과 비트 로그를 기록한다. */
const { pw, launch } = require('./tools/pwlaunch');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await pg.goto('file://' + require('path').resolve(__dirname,'index.html') + '');
  await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    const out = [];
    for (const scene of ['gain','quest']) {
      if (scene === 'gain') {
        S.gold = 0; fxSeen.gold=0; fxDisp.gold=0; fxAcc.gold=0; fxHold.gold=0;
        fxAt({ x:540, y:1400 });
      } else {
        S.gold = 820; fxSeen.gold=S.gold; fxDisp.gold=S.gold; fxAcc.gold=0; fxHold.gold=0;
        const q = QUESTS.find(x=>x.id==='kill'); S.quest.kill.base = q.get()-questGoal(q);
        openQuest('rep'); await sleep(420);
      }
      const t0 = performance.now();
      fxBeatLog.length = 0;
      const trace = [];
      let stop = false;
      const tick = () => {
        const rec = { t: Math.round(performance.now()-t0) };
        for (const key of ['gold','dia']) {
          const C = FXCUR[key]; const p = C && fxPill(C); if (!p) continue;
          const m = (p.style.transform||'').match(/scale\(([\d.]+)\)/);
          rec[key] = m ? +m[1] : 1;
          const lit = fxLit.get(p);
          if (lit) { const m2 = (lit.p.style.transform||'').match(/scale\(([\d.]+)\)/); rec[key+'L'] = m2 ? +m2[1] : 1; }
        }
        trace.push(rec);
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      if (scene === 'gain') { S.gold += 128000; }
      else {
        const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
        const rc = btn.getBoundingClientRect();
        const pe = t => new PointerEvent(t,{bubbles:true,cancelable:true,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2});
        btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
      }
      await sleep(2000); stop = true;
      const peak = k => Math.max(...trace.map(r => r[k]||1));
      const beats = fxBeatLog.slice();
      out.push(`[${scene}] 원본 피크 골드 ×${peak('gold').toFixed(3)} · 다이아 ×${peak('dia').toFixed(3)}`
        + ` | 복제판 피크 골드 ×${peak('goldL').toFixed(3)} · 다이아 ×${peak('diaL').toFixed(3)}`
        + ` | 비트 골드 ${beats.filter(x=>x[1]==='g').length}회 · 다이아 ${beats.filter(x=>x[1]==='d').length}회`);
      const gb = beats.filter(x=>x[1]==='g').map(x=>x[0]), db = beats.filter(x=>x[1]==='d').map(x=>x[0]);
      const iv = a => a.slice(1).map((v,i)=>v-a[i]);
      out.push(`   비트 간격 골드 [${iv(gb).join(',')}] · 다이아 [${iv(db).join(',')}]`);
      /* 다이아 알약이 실제로 존재하는지 · 복제판이 몇 번 갈렸는지 */
      out.push(`   다이아 배율 표본 중 >1.01 인 프레임 ${trace.filter(r=>(r.dia||1)>1.01||(r.diaL||1)>1.01).length}/${trace.length}`
             + ` · 골드 ${trace.filter(r=>(r.gold||1)>1.01||(r.goldL||1)>1.01).length}/${trace.length}`);
      if (scene==='quest'){ closeModal(); await sleep(300); }
    }
    return out.join('\n');
  }));
  await b.close();
})();
