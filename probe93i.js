#!/usr/bin/env node
/* 93 14회차 — «+n» 플로터(`.fx-plus.ui`) 를 실측한다.
   이 항목은 12·13·14회차 비평가 **5명**(AH·AI·AJ·AK·AM)이 각각 «아래로 흐른다 · 수명이 연출보다
   길다 · 총액을 먼저 발설한다» 로 올렸다. 그중 두 가지는 **이미 내려진 설계 결정**이라 되돌리면 안 된다:
     · «위로 안 뜬다» — 10회차. 알약이 화면 최상단이라 위로 뜨면 정산된 HUD 숫자와 겹친다.
     · «총액을 먼저 낸다» — 3회차. 마지막 도착에 걸면 «+n» 이 0.6초 늦어 숫자 롤링보다 뒤에 떠서
       인과가 역전된다(비평가 C·D 공통).
   남은 하나 «수명» 만 진짜 회수 가능하다. 그래서 재는 것은 하나다:
     **플로터가 사라지는 시각 vs 연출이 끝나는 시각(마지막 코인이 화면에서 사라지는 시각).**
   7회차가 `.fx-plus.ui{animation-duration:1.42s}` 로 «도착 1.26s 까지 살린다» 고 적었는데,
   그 1.42s 는 «트리거» 가 아니라 **«첫 도착»** 부터 세므로 실제 종료는 그만큼 뒤로 밀린다.       */
const path = require('path'); const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){ const fs2 = require('fs'); return chromium.launch().catch(e => {
  for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){ try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  throw e; }); }

const TRACK = `
window.track3 = async function track3(ms){
  const nf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  const pc = k => { const p = fxPill(FXCUR[k]), i = p && p.querySelector('i'); return i ? fxPt(i) : null; };
  const pill = { gold:pc('gold'), dia:pc('dia') };
  const plus = [];    /* 플로터 표본 */
  let coinEnd = -1;   /* 코인(비행 + 착지 포즈)이 화면에서 마지막으로 «보인» 시각 */
  let arr0 = -1;      /* 첫 도착 = 비행수가 처음 줄어든 시각 */
  let nPrev = -1;
  while(performance.now() - t0 < ms){
    await nf();
    const t = performance.now() - t0;
    const n = fxFlies.filter(f => f.ui).length;
    if(nPrev > 0 && n < nPrev && arr0 < 0) arr0 = t;
    if(n > 0) nPrev = n; else if(nPrev > 0) nPrev = 0;
    let coin = false;
    for(const el of document.querySelectorAll('#fxl .fx-fly, #fxl .fx-land2')){
      if(+getComputedStyle(el).opacity > 0.05){ coin = true; break; }
    }
    if(coin) coinEnd = t;
    for(const el of document.querySelectorAll('#fxl .fx-plus')){
      const rr = fxRect(el); if(!rr) continue;
      plus.push({ t:+t.toFixed(0), txt:(el.textContent||'').slice(0,12),
                  x:+(rr.x+rr.w/2).toFixed(1), y:+(rr.y+rr.h/2).toFixed(1),
                  op:+(+getComputedStyle(el).opacity).toFixed(3) });
    }
  }
  return { plus, coinEnd, arr0, pill };
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
    return await track3(2600);
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
    return await track3(2800);
  });

  const rep = (tag, R) => {
    if(R.err){ console.log(tag + ': ' + R.err); return; }
    console.log(`\n=== ${tag} ===  골드 알약 아이콘 (${R.pill.gold.x.toFixed(0)},${R.pill.gold.y.toFixed(0)}) · 다이아 (${R.pill.dia.x.toFixed(0)},${R.pill.dia.y.toFixed(0)})`);
    console.log(`  첫 도착 ${R.arr0.toFixed(0)}ms · **코인이 화면에서 마지막으로 보인 시각 ${R.coinEnd.toFixed(0)}ms**`);
    const by = new Map();
    for(const p of R.plus){ if(!by.has(p.txt)) by.set(p.txt, []); by.get(p.txt).push(p); }
    for(const [txt, arr] of by){
      const vis = arr.filter(p => p.op > 0.05);
      if(!vis.length) continue;
      const t0 = vis[0].t, t1 = vis[vis.length-1].t;
      const ys = vis.map(p => p.y);
      const over = t1 - R.coinEnd;
      console.log(`  «${txt}» ${t0}→${t1}ms (수명 ${t1-t0}ms) · y ${ys[0].toFixed(0)} → ${ys[ys.length-1].toFixed(0)} (${(ys[ys.length-1]-ys[0]).toFixed(0)>0?'+':''}${(ys[ys.length-1]-ys[0]).toFixed(0)}px) · x ${vis[0].x.toFixed(0)}`);
      console.log(`     → 연출이 끝난 뒤 **${over.toFixed(0)}ms** 더 남는다 ${over > 120 ? '⚠' : ''}`);
    }
  };
  rep('씬A(gain)', A); rep('씬B(quest)', B);
  await b.close();
})().catch(e => { console.error('probe93i 실패:', e.message); process.exit(1); });
