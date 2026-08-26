#!/usr/bin/env node
/* 93 14회차 — 비평 2건을 자체 덤프로 가른다.
   ⓐ **«사각(死角)»** — AM: «씬A 는 트리거 +234ms, 씬B 는 +181ms 까지 화면에 아무것도 없다».
      cap93 정답표는 62ms 에 이미 «비행 16개» 다. 즉 DOM 에는 있는데 **안 보이는** 것인지,
      아니면 비평가가 못 본 것인지를 «렌더 opacity × 렌더 폭 × 화면 안» 으로 가른다.
   ⓑ **«도착 실패»** — AM: «마지막 코인이 알약 94px(씬A)·340px(씬B) 앞에서 소멸».
      LESSONS «작업 93» 오독 2번(«도착한 아이콘은 DOM 에서 즉시 지워지므로 마지막으로 «보인»
      자리는 도착점이 아니다»)의 재발인지, 아니면 진짜인지를 **아이콘별로 끝까지 추적**해서 가른다.
      아이콘마다 «마지막 렌더 좌표 · 그때 opacity · 제 알약(골드=gold pill · 다이아=dia pill)까지 거리» 를 낸다.
      ⚠ 다이아는 골드 알약이 아니라 **제 알약**까지 재야 한다(262px 떨어져 있다 — 이걸 안 나누면
      다이아 전부가 «260px 미달» 로 보인다).                                                    */
const path = require('path'); const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
function pwLaunch(){ const fs2 = require('fs'); return chromium.launch().catch(e => {
  for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){ try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  throw e; }); }

const TRACK = `
window.track2 = async function track2(ms){
  const nf = () => new Promise(r => requestAnimationFrame(() => r()));
  const t0 = performance.now();
  const pc = k => { const p = fxPill(FXCUR[k]), i = p && p.querySelector('i'); return i ? fxPt(i) : null; };
  const pill = { gold:pc('gold'), dia:pc('dia') };
  const vis = [];        /* [t, DOM 개수, «보이는» 개수, 최대 렌더 폭, 최대 opacity] */
  const track = new Map();   /* fly -> 마지막 렌더 기록 */
  const gone = [];
  let seq = 0; const idOf = new WeakMap();
  while(performance.now() - t0 < ms){
    await nf();
    const t = performance.now() - t0;
    const fl = fxFlies.filter(f => f.ui);
    const alive = new Set();
    let seen = 0, wMax = 0, opMax = 0;
    for(const f of fl){
      if(!idOf.has(f)) idOf.set(f, ++seq);
      const id = idOf.get(f); alive.add(id);
      const rr = fxRect(f.el); if(!rr) continue;
      const op = +getComputedStyle(f.el).opacity;
      const onScreen = rr.x + rr.w > 0 && rr.x < 1080 && rr.y + rr.h > 0 && rr.y < 2280;
      /* «보인다» = 화면 안 · opacity>0.08 · 렌더 폭 ≥6px */
      if(onScreen && op > 0.08 && rr.w >= 6) seen++;
      wMax = Math.max(wMax, rr.w); opMax = Math.max(opMax, op);
      track.set(id, { t, cur:f.cur, x:+(rr.x+rr.w/2).toFixed(1), y:+(rr.y+rr.h/2).toFixed(1),
                      w:+rr.w.toFixed(1), op:+op.toFixed(2), ph:(f.t < f.sd ? 'spread' : (f.t < f.ha ? 'hold' : 'absorb')) });
    }
    for(const [id, v] of track){ if(!alive.has(id)){ gone.push({ id, ...v }); track.delete(id); } }
    vis.push({ t:+t.toFixed(0), dom:fl.length, seen, w:+wMax.toFixed(1), op:+opMax.toFixed(2) });
    /* 착지 포즈까지 포함한 «화면에 코인이 있나» */
    const land = document.querySelectorAll('#fxl .fx-land2').length;
    vis[vis.length-1].land = land;
  }
  for(const [id, v] of track) gone.push({ id, ...v });
  return { vis, gone, pill };
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
    return await track2(1800);
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
    return await track2(2000);
  });

  const rep = (tag, R) => {
    if(R.err){ console.log(tag + ': ' + R.err); return; }
    console.log(`\n=== ${tag} ===  골드 알약 (${R.pill.gold.x.toFixed(0)},${R.pill.gold.y.toFixed(0)}) · 다이아 알약 (${R.pill.dia.x.toFixed(0)},${R.pill.dia.y.toFixed(0)})`);
    /* ⓐ 사각 */
    const first = R.vis.find(v => v.seen > 0);
    const firstDom = R.vis.find(v => v.dom > 0);
    console.log(`  DOM 에 처음 생긴 t = ${firstDom ? firstDom.t : -1}ms · **화면에 처음 «보이는» t = ${first ? first.t : -1}ms**`);
    console.log('  앞 400ms (t/DOM/보임/최대폭/최대op): ' + R.vis.filter(v => v.t <= 400)
      .map(v => `${v.t}:${v.dom}/${v.seen}/${v.w}/${v.op}`).join('  '));
    /* ⓑ 도착 — 재화별로 제 알약까지 */
    for(const k of ['gold','dia']){
      const px = R.pill[k]; if(!px) continue;
      const g = R.gone.filter(z => z.cur === k);
      if(!g.length) continue;
      const ds = g.map(z => Math.hypot(z.x - px.x, z.y - px.y));
      const srt = [...ds].sort((a,z)=>a-z);
      const far = g.filter((z,i) => ds[i] > 40);
      console.log(`  [${k}] 마지막 렌더 → 제 알약 거리: ${g.length}개 · 중앙 ${srt[srt.length>>1].toFixed(1)}px · 최소 ${srt[0].toFixed(1)} · 최대 ${srt[srt.length-1].toFixed(1)}`);
      console.log(`       40px 넘게 남기고 사라진 아이콘 ${far.length}/${g.length}개`
        + (far.length ? ' → ' + far.slice(0,4).map(z => `t${z.t.toFixed(0)} (${z.x},${z.y}) op${z.op} ${z.ph}`).join(' · ') : ''));
    }
  };
  rep('씬A(gain)', A); rep('씬B(quest)', B);
  await b.close();
})().catch(e => { console.error('probe93h 실패:', e.message); process.exit(1); });
