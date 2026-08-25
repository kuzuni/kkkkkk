#!/usr/bin/env node
/* 93 — 퍼짐 기하 실측: fx3Out 이 패널을 잡는가 · 아이콘별 반경/각도가 밴드 안인가 · 겹침률 */
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

  const geom = (tag) => `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now();
    for(let i=0;i<300;i++){ if(fxFlies.filter(f=>f.ui).length) break; await sleep(4); }
    const fl = fxFlies.filter(f => f.ui);
    if(!fl.length) return { tag:'${tag}', err:'no flies' };
    const byCur = {};
    for(const f of fl){ byCur[f.cur] = (byCur[f.cur]||0)+1; }
    const rows = fl.map(f => {
      const dx = f.ax - f.sx, dy = f.ay - f.sy;
      return { cur:f.cur, r:Math.round(Math.hypot(dx,dy)), a:Math.round(Math.atan2(dy,dx)*180/Math.PI),
               cub: f.c1x != null ? Math.round(f.c1x) : 0 };
    });
    return { tag:'${tag}', byCur, rows,
             rMin:Math.min(...rows.map(r=>r.r)), rMax:Math.max(...rows.map(r=>r.r)),
             aMin:Math.min(...rows.map(r=>r.a)), aMax:Math.max(...rows.map(r=>r.a)),
             cub: rows[0].cub };
  })()`;

  // 씬 A — 메인 화면
  const a = await page.evaluate(async (src) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 90000; fxHold.gold = 0; await sleep(1500);
    fxAt(fxWorld(player.x + 12, player.y - 20));
    S.gold += 128000;
    return await eval(src);
  }, geom('gain'));
  console.log('씬A', JSON.stringify(a.byCur), 'r', a.rMin + '~' + a.rMax, 'a', a.aMin + '~' + a.aMax, 'cubic c1x', a.cub);

  // 씬 B — 퀘스트 모달
  const b = await page.evaluate(async (src) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(1800);
    S.dia = 300; S.gold = 900; fxHold.dia = 0; fxHold.gold = 0; await sleep(1600);
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep'); await sleep(400);
    const bt = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!bt) return { err:'버튼 없음' };
    const row = bt.closest('.qs-r');
    const badge = row.querySelector('.qs-i') || row;
    const p = fxPt(badge);
    const mb = fxRect(document.getElementById('mbox'));
    const out = fx3Out(p);
    bt.click();
    const g = await eval(src);
    g.badge = { x:Math.round(p.x), y:Math.round(p.y) };
    g.mbox = mb ? { x:Math.round(mb.x), y:Math.round(mb.y), w:Math.round(mb.w), h:Math.round(mb.h) } : null;
    g.out = Math.round(out);
    return g;
  }, geom('quest'));
  console.log('씬B', JSON.stringify(b.byCur), 'r', b.rMin + '~' + b.rMax, 'a', b.aMin + '~' + b.aMax,
              'cubic c1x', b.cub, '| badge', JSON.stringify(b.badge), 'mbox', JSON.stringify(b.mbox), 'outX', b.out);
  if(b.rows) console.log('  각도 분포:', b.rows.map(r => r.cur[0] + r.a).join(' '));
  await browser.close();
})();
