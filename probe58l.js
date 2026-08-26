#!/usr/bin/env node
/* 58 22회차 — 21회차 비평(AJ·AK)이 JPEG 에서 잰 «가림» 4건을 DOM 좌표로 다시 잰다.
 *
 *   node probe58l.js
 *
 * probe58k 와 같은 취지(29 교훈 1): 비평가 수치를 처방 전에 DOM 으로 재현해 두고,
 * 수정 뒤 같은 스크립트를 다시 돌려 «전/후» 를 숫자로 비교한다.
 *
 * (1) quest — fxCheck 원판이 «보상 받기» 라벨 잉크를 몇 % 덮는가 (AJ #2)
 * (2) quest — 수령 뒤 버튼 배경이 초록에서 회색으로 언제 바뀌는가 (AJ #3)
 * (3) toast — 상단 토스트 bbox 가 «STAGE n» 라벨을 몇 px 덮는가 (AJ #5)
 * (4) gain  — HUD 금 알약·다이아 알약의 정지 여백과, 펄스 최대 배율에서의 여백 (AJ #1)
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
const R = r => ({ x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) });
const ovl = (a, b) => {           /* 교차 면적 / b 면적 (%) */
  if(!a || !b) return null;
  const w = Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
  return { w, h, pct: b.w*b.h ? +(100*w*h/(b.w*b.h)).toFixed(1) : null };
};

(async () => {
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { player.inv = 1e9; for(const e of enemies){ e.x = 1; e.y = 1; } });

  /* ── (4) HUD 알약 정지 기하 ─────────────────────────────────── */
  const hud = await page.evaluate(() => {
    const out = {};
    for(const k of ['gold', 'dia']){
      const el = document.querySelector('#top [data-cur="' + k + '"]');
      if(el){ const r = el.getBoundingClientRect();
        out[k] = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; }
    }
    return out;
  });

  /* ── (3) 토스트 vs STAGE 라벨 ───────────────────────────────── */
  const toast = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const st = document.getElementById('stinfo');
    const sr = st ? st.getBoundingClientRect() : null;
    /* «STAGE n» 글자 잉크 상자 — 라벨 노드의 range rect */
    let lab = null;
    if(st){
      const cand = [...st.querySelectorAll('*')].filter(e => /STAGE/i.test(e.textContent || ''));
      const t = cand[cand.length-1] || st;
      try { const rg = document.createRange(); rg.selectNodeContents(t);
        const r = rg.getBoundingClientRect(); lab = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; } catch(_){}
    }
    fxToast('퀘스트 완료');
    await sleep(220);
    const tt = document.querySelector('#fxl .fx-toast');
    const tr = tt ? tt.getBoundingClientRect() : null;
    return { stinfo: sr && { x:Math.round(sr.left), y:Math.round(sr.top), w:Math.round(sr.width), h:Math.round(sr.height) },
             label: lab,
             toast: tr && { x:Math.round(tr.left), y:Math.round(tr.top), w:Math.round(tr.width), h:Math.round(tr.height) } };
  });
  await page.waitForTimeout(1700);

  /* ── (1)(2) quest 버튼 ──────────────────────────────────────── */
  const q = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(400);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 버튼 없음' };
    const rb = b.getBoundingClientRect();
    let lab = null;
    try { const rg = document.createRange(); rg.selectNodeContents(b);
      const r = rg.getBoundingClientRect(); lab = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; } catch(_){}
    const bg0 = getComputedStyle(b).backgroundColor;
    /* 행 안 이웃 요소 — 체크 원판을 어디로 비켜야 «다른 것» 을 안 덮는지 판단용 */
    const near = {};
    const row = b.closest('.qs-r');
    for(const [k, sel] of [['row','.qs-r'], ['badge','.qs-i'], ['title','.qs-t'], ['gauge','.qs-tg']]){
      const e = k === 'row' ? row : (row && row.querySelector(sel));
      if(e){ const r = e.getBoundingClientRect();
        near[k] = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; }
    }
    const pn = b.closest('.mbox, #mbox');
    if(pn){ const r = pn.getBoundingClientRect();
      near.panel = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; }
    const t0 = performance.now();
    b.click();
    const chk = [], col = [];
    for(let i=0;i<26;i++){
      const t = Math.round(performance.now() - t0);
      const c = document.querySelector('#fxl .fx-check svg');
      if(c){ const r = c.getBoundingClientRect();
        chk.push({ t, x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
                   op:+getComputedStyle(c.parentElement).opacity }); }
      const b2 = document.querySelector('#mbox [data-q="kill"]');
      col.push({ t, bg: b2 ? getComputedStyle(b2).backgroundColor : 'none', gone: !b2 });
      await sleep(60);
    }
    return { btn:{ x:Math.round(rb.left), y:Math.round(rb.top), w:Math.round(rb.width), h:Math.round(rb.height) },
             label: lab, bg0, chk, col, near };
  });

  /* ── 출력 ───────────────────────────────────────────────────── */
  console.log('\n(4) HUD 알약 정지 기하');
  if(hud.gold && hud.dia){
    const gap = hud.dia.x - (hud.gold.x + hud.gold.w);
    console.log(`  gold ${JSON.stringify(hud.gold)}  dia ${JSON.stringify(hud.dia)}  여백 ${gap}px`);
    /* 펄스는 transform:scale 이라 «중심 고정». 배율 m 에서 우단은 cx + w/2*m */
    for(const m of [1.11, 1.22, 1.25]){
      const gr = hud.gold.x + hud.gold.w/2 + hud.gold.w/2*m;
      const dl = hud.dia.x + hud.dia.w/2 - hud.dia.w/2*m;
      console.log(`   ×${m.toFixed(2)} → 금 우단 ${Math.round(gr)} · 다이아 좌단 ${Math.round(dl)} · 여백 ${Math.round(dl-gr)}px`);
    }
  } else console.log('  알약을 못 찾음', JSON.stringify(hud));

  console.log('\n(3) 토스트 vs STAGE 라벨');
  console.log('  #stinfo', JSON.stringify(toast.stinfo), ' 라벨', JSON.stringify(toast.label), ' 토스트', JSON.stringify(toast.toast));
  if(toast.toast && toast.label){
    const o = ovl(toast.toast, toast.label);
    console.log(`  → 라벨 잉크 가림 ${o.pct}% (교차 ${o.w}×${o.h}px) · 토스트 하단 ${toast.toast.y+toast.toast.h} vs 라벨 상단 ${toast.label.y}`);
  }

  console.log('\n(1)(2) quest 버튼');
  if(q.err) console.log('  ' + q.err);
  else {
    console.log('  버튼', JSON.stringify(q.btn), ' 라벨 잉크', JSON.stringify(q.label), ' 초기 배경', q.bg0);
    for(const k of Object.keys(q.near || {})) console.log(`   ${k.padEnd(6)} ${JSON.stringify(q.near[k])}`);
    let worst = null;
    for(const c of q.chk){
      const o = ovl(c, q.label);
      if(o && (!worst || o.pct > worst.pct)) worst = { t:c.t, pct:o.pct, d:`${c.w}×${c.h}` };
      console.log(`   t${String(c.t).padStart(4)}ms  체크 ${c.w}×${c.h} @${c.x},${c.y} op${c.op.toFixed(2)}  라벨 가림 ${o ? o.pct : '-'}%`);
    }
    if(worst) console.log(`  → 최대 가림 ${worst.pct}% @t${worst.t}ms (원판 ${worst.d}, 버튼 높이 대비 세로 ${(parseInt(worst.d)/q.btn.h*100).toFixed(0)}%)`);
    console.log('  배경색 타임라인:');
    let prev = null;
    for(const c of q.col){ if(c.bg !== prev){ console.log(`   t${String(c.t).padStart(4)}ms  ${c.gone ? '(버튼 사라짐)' : c.bg}`); prev = c.bg; } }
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
