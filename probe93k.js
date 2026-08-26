#!/usr/bin/env node
/* 93 16회차 — 씬B(퀘스트 보상) 궤적 기하 실측기.
 *
 *   node probe93k.js
 *
 * 15회차 핸드오프 3번(«씬B 경로 L자 우회 — 4명 2회차»)의 처방 «차선을 출발부터 가른다» 를
 * 넣기 «전·후» 로 같은 잣대로 재기 위한 도구다. 비평가가 잰 세 수치를 코드에서 직접 뽑는다:
 *   ⓐ 직선(출발→알약) 대비 최대 이탈 px            (AN: 654px = 화면폭 61%)
 *   ⓑ 골드 궤적이 **다이아 알약** 중심에 가장 가까이 붙는 거리 (AO: f8 (838,339) — 알약 x844 바로 밑)
 *   ⓒ dx 가 1px 도 안 줄어드는 «순수 상승» 구간의 세로 길이   (AO: 402px = 세로 여정의 43%)
 *   ⓓ 게이트 보존용 — 형제 행 밴드(y 577~956) 통과 구간의 최소 x (verify93 [2c] 골드 ≥976)
 *   ⓔ 총 주행 길이 ÷ 직선거리 (AO: +50%)
 *
 * 표본은 «화면 좌표» 다 — fxFlies 의 좌표 계산을 그대로 다시 돌리지 않고, 실제 DOM 요소의
 * bbox 중심을 매 프레임 읽는다(43 교훈 1: 내가 재는 것이 화면에 그려지는 그것인지부터 본다).
 */
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
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForFunction(() => typeof fxFlies !== 'undefined' && typeof openQuest === 'function');
  await page.waitForTimeout(600);

  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia;  fxDisp.dia = S.dia;  fxAcc.dia = 0;  fxHold.dia = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep'); await sleep(400);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'보상 받기 버튼 없음' };

    const pillC = sel => { const p = document.querySelector(sel); if(!p) return null;
      const x = p.getBoundingClientRect(); return { x:x.left + x.width/2, y:x.top + x.height/2 }; };
    const gp = pillC('#top .cGold'), dp = pillC('#top .cDia');

    b.click();
    /* 아이콘 하나하나를 «id» 로 따라간다 — DOM 순서는 프레임마다 안 바뀌므로 인덱스로 충분하다 */
    const trk = new Map();                              /* el → {cur, pts:[[x,y]…]} */
    for(let i=0;i<200;i++){
      for(const f of fxFlies){
        if(!f.ui || !f.el) continue;
        const bb = f.el.getBoundingClientRect();
        /* 생성 직후(투명 · transform 미적용) 프레임은 left:0/top:0 이라 (23,23) 로 찍힌다 —
           이것을 «출발점» 으로 삼으면 현이 화면 대각선이 되어 ⓐ·ⓔ 가 통째로 틀린다. */
        if(!bb.width || f.el.style.opacity === '0' || !f.el.style.transform) continue;
        let t = trk.get(f.el);
        if(!t){ t = { cur:f.cur, tx:f.tx, ty:f.ty, ax:f.ax, ay:f.ay, ox:f.ox, cy2:f.cy2, pts:[] }; trk.set(f.el, t); }
        t.pts.push([bb.left + bb.width/2, bb.top + bb.height/2]);
      }
      if(i > 30 && !fxFlies.some(f => f.ui)) break;
      await sleep(12);
    }
    return { gp, dp, trk:[...trk.values()].map(t => ({ cur:t.cur, tx:t.tx, ty:t.ty, ax:t.ax, ay:t.ay,
      ox:t.ox, cy2:t.cy2, pts:t.pts })) };
  });
  await browser.close();
  if(r.err){ console.error('probe93k 실패:', r.err); process.exit(1); }
  if(errs.length){ console.error('콘솔 에러:', errs[0]); process.exit(1); }

  const near = (p, c) => Math.hypot(p[0] - c.x, p[1] - c.y);
  const seg = (p, a, b) => {                            /* 점 p 와 선분 ab 사이 거리 */
    const vx = b[0]-a[0], vy = b[1]-a[1], L2 = vx*vx + vy*vy || 1;
    let t = ((p[0]-a[0])*vx + (p[1]-a[1])*vy)/L2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0]+vx*t), p[1] - (a[1]+vy*t));
  };
  const med = a => { const s = a.slice().sort((x,y)=>x-y); return s.length ? s[s.length>>1] : 0; };
  const per = {};
  for(const t of r.trk){
    if(t.pts.length < 6) continue;
    /* 현은 «흡수가 시작되는 자리»(퍼짐 끝점 ax/ay) → 알약이다. 배지에서 재면 퍼짐 구간까지
       우회로 잡혀 두 배가 된다 — 비평가가 재는 것은 «흡수 경로» 다. */
    const A = [t.ax, t.ay], B = [t.tx, t.ty];
    let dev = 0, run = 0, minx = 1e9, dnear = 1e9;
    let rise0 = null, rise = 0;                          /* dx 가 안 줄어드는 순수 상승 세로 길이 */
    for(let i=0;i<t.pts.length;i++){
      const p = t.pts[i];
      dev = Math.max(dev, seg(p, A, B));
      if(i){ run += Math.hypot(p[0]-t.pts[i-1][0], p[1]-t.pts[i-1][1]); }
      if(p[1] >= 577 && p[1] <= 956) minx = Math.min(minx, p[0]);
      if(t.cur === 'gold' && r.dp) dnear = Math.min(dnear, near(p, r.dp));
      if(i){
        const dxPrev = Math.abs(t.pts[i-1][0] - t.tx), dxNow = Math.abs(p[0] - t.tx);
        if(dxNow >= dxPrev - 1 && p[1] < t.pts[i-1][1]){ if(rise0 == null) rise0 = t.pts[i-1][1]; rise = Math.max(rise, rise0 - p[1]); }
        else rise0 = null;
      }
    }
    const k = t.cur;
    (per[k] = per[k] || { dev:[], run:[], minx:[], dnear:[], rise:[], ox:t.ox, cy2:t.cy2, tx:t.tx, ty:t.ty });
    per[k].dev.push(Math.round(dev)); per[k].minx.push(Math.round(minx));
    per[k].rise.push(Math.round(rise));
    per[k].run.push(+(run/Math.hypot(B[0]-A[0], B[1]-A[1])).toFixed(3));
    if(t.cur === 'gold') per[k].dnear.push(Math.round(dnear));
  }
  console.log('알약 중심 — 골드 (' + Math.round(r.gp.x) + ',' + Math.round(r.gp.y) + ') · 다이아 ('
    + Math.round(r.dp.x) + ',' + Math.round(r.dp.y) + ')');
  for(const k in per){
    const p = per[k];
    console.log(`[${k}] 표본 ${p.dev.length} · 복도 ox ${Math.round(p.ox)} · 코너 cy2 ${Math.round(p.cy2)} · 목표 (${Math.round(p.tx)},${Math.round(p.ty)})`);
    console.log(`   ⓐ 직선 대비 최대 이탈  중앙 ${med(p.dev)}px  (최대 ${Math.max(...p.dev)})`);
    console.log(`   ⓒ 순수 상승 세로 길이  중앙 ${med(p.rise)}px  (최대 ${Math.max(...p.rise)})`);
    console.log(`   ⓓ 행 밴드 통과 최소 x  최소 ${Math.min(...p.minx)}  (게이트: 골드 ≥976)`);
    console.log(`   ⓔ 주행 ÷ 직선          중앙 ${med(p.run)}배`);
    if(p.dnear.length)
      console.log(`   ⓑ 다이아 알약까지 최근접 중앙 ${med(p.dnear)}px  (최소 ${Math.min(...p.dnear)})`);
  }
})().catch(e => { console.error('probe93k 실패:', e.message); process.exit(1); });
