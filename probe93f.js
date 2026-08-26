#!/usr/bin/env node
/* 93 11회차 — 비평가 AF·AG 의 «2인 일치» 3건을 자체 덤프로 확인한다.
   ⓐ 씬A 스폰 지연(하네스 실측 182ms) 의 출처가 fxWatch 디바운스인가
   ⓑ 씬A «머묾» 부유 진폭이 정말 0~1px 인가 (씬B 는 6~10px 이라는데 같은 코드다)
   ⓒ 도착 «마지막 렌더 프레임» 이 알약 중심에서 몇 px 인가 · 그때 scale 은 얼마인가
   ⓓ 알약 펄스 피크 배율의 «렌더 실측» 최대값                                          */
const path = require('path'); const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){ const fs2 = require('fs'); return chromium.launch().catch(e => {
  for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){ try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  throw e; }); }

const TRACK = `
window.track = async function track(ms){
  const sleep = t => new Promise(r => setTimeout(r, t));
  const nf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  const pillC = () => { const p = fxPill(FXCUR.gold); const i = p && p.querySelector('i');
    return i ? fxPt(i) : null; };
  const samp = [];      /* [t, 비행수, 아이콘별 {id,x,y,s,phase}] */
  const last = new Map();   /* id -> 마지막 렌더 위치 */
  const gone = [];          /* 사라진 아이콘의 «마지막 렌더» */
  let spawn = -1, pzMax = 0; const landed = [];
  let seq = 0; const idOf = new WeakMap();
  while(performance.now() - t0 < ms){
    await nf();
    const t = performance.now() - t0;
    const fl = fxFlies.filter(f => f.ui);
    if(fl.length && spawn < 0) spawn = t;
    const alive = new Set();
    const rows = [];
    for(const f of fl){
      if(!idOf.has(f)) idOf.set(f, ++seq);
      const id = idOf.get(f);
      alive.add(id);
      const m = /translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\).*scale\\(([-\\d.]+)\\)/.exec(f.el.style.transform || '');
      if(!m) continue;
      const x = +m[1], y = +m[2], s = +m[3];
      const ph = f.t < f.sd ? 'spread' : (f.t < f.ha ? 'hold' : 'absorb');
      rows.push({ id, x, y, s, ph, cur:f.cur, lt:+f.t.toFixed(3) });
      last.set(id, { t, x, y, s, ph, cur:f.cur });
    }
    for(const [id, v] of last){ if(!alive.has(id)){ gone.push({ id, ...v }); last.delete(id); } }
    samp.push({ t:+t.toFixed(1), n:fl.length, rows });
    /* 착지 포즈(.fx-land2) 실렌더 위치 — 알약 중심에서 몇 px 인가 */
    for(const le of document.querySelectorAll('#fxl .fx-land2, #fxlc .fx-land2')){
      const rr = fxRect(le); if(!rr) continue;
      landed.push({ t:+t.toFixed(0), x:+(rr.x+rr.w/2).toFixed(1), y:+(rr.y+rr.h/2).toFixed(1), w:+rr.w.toFixed(0), op:+(getComputedStyle(le).opacity) });
    }
    /* 펄스 — 알약 <i> 의 실렌더 배율 */
    const p = fxPill(FXCUR.gold), ic = p && p.querySelector('i');
    if(ic){ const st = getComputedStyle(ic).transform;
      const mm = /matrix\\(\\s*([-\\d.]+)/.exec(st);
      if(mm) pzMax = Math.max(pzMax, +mm[1]);
      else { const w = ic.getBoundingClientRect().width; if(w) pzMax = Math.max(pzMax, w); } }
  }
  for(const [id, v] of last) gone.push({ id, ...v });
  return { spawn, pzMax, samp, gone, landed, pill:pillC() };
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

  /* ── 씬A ── */
  const A = await page.evaluate(async () => {
    S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
    await new Promise(r => setTimeout(r, 600));
    fxAt(fxWorld(player.x + 12, player.y - 20));
    S.gold += 128000;
    return await track(2000);
  });
  /* ── 씬B ── */
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
    return await track(2200);
  });

  const rep = (tag, R) => {
    if(R.err){ console.log(tag + ': ' + R.err); return; }
    console.log(`\n=== ${tag} ===`);
    console.log(`  스폰 지연 ${R.spawn.toFixed(0)}ms · 알약 중심 (${R.pill.x.toFixed(0)}, ${R.pill.y.toFixed(0)}) · 렌더 펄스 피크 ×${R.pzMax.toFixed(3)}`);
    /* ⓑ 머묾 진폭 — hold 단계 표본에서 아이콘별 프레임간 이동량 */
    const mv = [];
    for(let i = 1; i < R.samp.length; i++){
      const a = R.samp[i-1], b2 = R.samp[i];
      const ma = new Map(a.rows.map(r => [r.id, r]));
      for(const r of b2.rows){
        const p = ma.get(r.id); if(!p || r.ph !== 'hold' || p.ph !== 'hold') continue;
        mv.push({ dt:b2.t - a.t, d:Math.hypot(r.x - p.x, r.y - p.y) });
      }
    }
    if(mv.length){
      const ds = mv.map(m => m.d).sort((x, y) => x - y);
      const dt = (mv.reduce((s, m) => s + m.dt, 0)/mv.length);
      console.log(`  머묾 프레임간 이동 ${mv.length}표본 · 중앙 ${ds[ds.length>>1].toFixed(2)}px · 최소 ${ds[0].toFixed(2)} · 최대 ${ds[ds.length-1].toFixed(2)} (평균 프레임 ${dt.toFixed(0)}ms)`);
    } else console.log('  머묾 표본 없음');
    /* ⓒ 마지막 렌더 위치 */
    const px = R.pill;
    const g = R.gone.filter(x => x.cur === 'gold' || !x.cur);
    const ds = R.gone.map(x => ({ cur:x.cur, d:Math.hypot(x.x - px.x, x.y - px.y), s:x.s, ph:x.ph }));
    const gd = ds.filter(x => x.cur === 'gold').map(x => x.d).sort((a, b2) => a - b2);
    if(gd.length) console.log(`  골드 «마지막 렌더» 알약 중심까지 ${gd.length}개 · 중앙 ${gd[gd.length>>1].toFixed(0)}px · 최소 ${gd[0].toFixed(0)} · 최대 ${gd[gd.length-1].toFixed(0)}`);
    const gs = ds.filter(x => x.cur === 'gold').map(x => x.s).sort((a, b2) => a - b2);
    if(gs.length) console.log(`  그때 scale · 중앙 ${gs[gs.length>>1].toFixed(2)} · 최소 ${gs[0].toFixed(2)} · 최대 ${gs[gs.length-1].toFixed(2)}`);
    void g;
    /* 경로 최대 x */
    let mx = 0, mxc = null;
    for(const s of R.samp) for(const r of s.rows) if(r.x > mx){ mx = r.x; mxc = r.cur; }
    console.log(`  경로 최대 x = ${mx.toFixed(0)} (${mxc})`);
    const L = R.landed || [];
    if(L.length){
      const dd = L.map(z => Math.hypot(z.x - px.x, z.y - px.y)).sort((a,b2)=>a-b2);
      const ws = L.map(z => z.w).sort((a,b2)=>a-b2);
      console.log(`  착지 포즈(.fx-land2) ${L.length}표본 · 알약 중심까지 중앙 ${dd[dd.length>>1].toFixed(1)}px · 최대 ${dd[dd.length-1].toFixed(1)} · 폭 중앙 ${ws[ws.length>>1]}px · t ${L[0].t}~${L[L.length-1].t}ms`);
      const vis = L.filter(z => z.op > 0.25).length;
      console.log(`  그중 opacity>0.25 인 표본 ${vis}개 (${(vis/L.length*100).toFixed(0)}%)`);
    } else console.log('  착지 포즈 표본 0 — .fx-land2 가 한 프레임도 안 잡혔다');
  };
  rep('씬A(gain)', A); rep('씬B(quest)', B);
  await b.close();
})().catch(e => { console.error('probe93f 실패:', e.message); process.exit(1); });
