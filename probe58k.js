#!/usr/bin/env node
/* 58 21회차 — 20회차 핸드오프 «남은 문제» 1·4·3 의 **현재값 실측**.
 *
 *   node probe58k.js
 *
 * 비평가가 캡처에서 잰 값(링 세로 175px · 재화 아이콘 등장 205~299ms · 코인 궤도 x616~660)을
 * DOM 좌표로 다시 재서 «처방 전/후» 를 숫자로 비교할 수 있게 한다(29 교훈 1).
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
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }
    window.step = () => {};
  });

  /* ── (1) quest 버스트 링 vs 버튼 ─────────────────────────────── */
  const q = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(350);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 버튼 없음' };
    const rb = b.getBoundingClientRect();
    /* 라벨(«보상 받기») 잉크 상자 — 버튼 안 텍스트 노드의 range rect */
    let rl = null;
    try {
      const rg = document.createRange(); rg.selectNodeContents(b);
      const r = rg.getBoundingClientRect();
      rl = { x:r.left, y:r.top, w:r.width, h:r.height };
    } catch(_){}
    /* 같은 행의 제목·게이지 (남은 문제 2 의 기준값도 같이 남긴다) */
    const row = b.closest('.qs-r') || b.parentElement;
    const rr = row ? row.getBoundingClientRect() : null;
    const t0 = performance.now();
    b.click();
    const snap = [];
    for(let i=0;i<16;i++){
      const ss = [...document.querySelectorAll('#fxl .fx-spark')];
      if(ss.length){
        let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9, over=0;
        for(const s of ss){
          const r = s.getBoundingClientRect();
          x0=Math.min(x0,r.left); y0=Math.min(y0,r.top);
          x1=Math.max(x1,r.right); y1=Math.max(y1,r.bottom);
          if(rl){                                   /* 라벨 잉크와 겹치는 파티클 수 */
            if(r.right>rl.x && r.left<rl.x+rl.w && r.bottom>rl.y && r.top<rl.y+rl.h) over++;
          }
        }
        snap.push({ t:Math.round(performance.now()-t0), n:ss.length,
          w:Math.round(x1-x0), h:Math.round(y1-y0), over });
      } else snap.push({ t:Math.round(performance.now()-t0), n:0 });
      await sleep(45);
    }
    return { btn:{ w:Math.round(rb.width), h:Math.round(rb.height) },
             label: rl ? { w:Math.round(rl.w), h:Math.round(rl.h) } : null,
             row: rr ? { x:Math.round(rr.left), y:Math.round(rr.top), w:Math.round(rr.width), h:Math.round(rr.height) } : null,
             snap };
  });
  console.log('[1] quest 버스트 링 vs 버튼');
  if(q.err) console.log('  ! ' + q.err);
  else {
    console.log('  버튼 ' + q.btn.w + '×' + q.btn.h + ' · 라벨 잉크 ' + (q.label ? q.label.w+'×'+q.label.h : '—')
      + ' · 행 ' + (q.row ? q.row.w+'×'+q.row.h : '—'));
    for(const s of q.snap) if(s.n) console.log('   t=' + String(s.t).padStart(4) + 'ms  n=' + String(s.n).padStart(2)
      + '  링 ' + String(s.w).padStart(4) + '×' + String(s.h).padStart(4)
      + '  (세로 ' + Math.round(s.h/q.btn.h*100) + '% of 버튼)  라벨 겹침 ' + s.over + '개');
  }

  /* ── (2) quest 재화 아이콘이 «읽히는» 시각 ────────────────────── */
  const f = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(400);
    S.quest.dmg && (S.quest.dmg.base = -1e9);
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(350);
    const b = document.querySelector('#mbox [data-q]:not([disabled])');
    if(!b) return { err:'두 번째 퀘스트 버튼 없음' };
    const t0 = performance.now();
    b.click();
    const out = [];
    for(let i=0;i<14;i++){
      const fl = [...document.querySelectorAll('#fxl .fx-fly')];
      const sp = document.querySelectorAll('#fxl .fx-spark').length;
      let box = 0, base = 0;
      if(fl.length){
        const r = fl[0].getBoundingClientRect();
        box = Math.round(Math.max(r.width, r.height));
        base = Math.round(parseFloat(getComputedStyle(fl[0]).fontSize));
      }
      out.push({ t:Math.round(performance.now()-t0), fly:fl.length, spark:sp, box, base });
      await sleep(40);
    }
    return { out };
  });
  console.log('\n[2] quest 첫 300ms — 크림 구슬(spark) vs 재화 아이콘(fly)');
  if(f.err) console.log('  ! ' + f.err);
  else for(const o of f.out) console.log('   t=' + String(o.t).padStart(4) + 'ms  spark=' + String(o.spark).padStart(2)
    + '  fly=' + String(o.fly).padStart(2) + '  아이콘 실측 ' + String(o.box).padStart(3) + 'px (기준 ' + o.base + 'px)');

  /* ── (3) gain 흡수 경로 vs 상단 STAGE 진행바 ─────────────────── */
  const g = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(400);
    /* 진행바 트랙 — 비평가가 x325~798 · y234~300 으로 잰 대상 */
    const cand = ['#stbar', '#stinfo', '#stprog', '.stbar', '.st-bar'];
    let tr = null, sel = null;
    for(const s of cand){ const el = document.querySelector(s); if(el){ const r = el.getBoundingClientRect();
      if(r.width > 200 && r.height > 10){ tr = { x:r.left, y:r.top, w:r.width, h:r.height }; sel = s; break; } } }
    fxAt(fxWorld(player.x + 140, player.y - 30));
    S.gold += 128000;
    const t0 = performance.now();
    const rows = [];
    for(let i=0;i<32;i++){
      const fl = [...document.querySelectorAll('#fxl .fx-fly')];
      let hit = 0, x0=1e9, x1=-1e9, dim = 1;
      for(const el of fl){
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right);
        if(tr && r.right>tr.x && r.left<tr.x+tr.w && r.bottom>tr.y && r.top<tr.y+tr.h){
          hit++; dim = Math.min(dim, +el.style.opacity || 1);
        }
      }
      if(fl.length) rows.push({ t:Math.round(performance.now()-t0), n:fl.length, hit, dim,
        x0:Math.round(x0), x1:Math.round(x1) });
      await sleep(45);
    }
    return { sel, tr: tr ? { x:Math.round(tr.x), y:Math.round(tr.y), w:Math.round(tr.w), h:Math.round(tr.h) } : null, rows };
  });
  console.log('\n[3] gain 흡수 경로 vs STAGE 진행바 (' + g.sel + ' ' + JSON.stringify(g.tr) + ')');
  let tot = 0;
  for(const r of g.rows){ tot += r.hit;
    if(r.hit) console.log('   t=' + String(r.t).padStart(4) + 'ms  n=' + String(r.n).padStart(2)
      + '  바 위 ' + String(r.hit).padStart(2) + '개  op ' + r.dim + '  코인 x' + r.x0 + '~' + r.x1); }
  console.log('   바 관통 표본 합계 ' + tot);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
