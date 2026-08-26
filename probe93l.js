#!/usr/bin/env node
/* 93 16회차 — 딤 위 알약 복제판(`.fx-lit`)의 «점등 램프 · 소등 동기» 실측기.
 *
 *   node probe93l.js
 *
 * 15회차 핸드오프 7번(«HUD 스포트라이트가 첫 도착보다 460~480ms 먼저, 하드컷으로 켜진다» —
 * AN·AO 2인 일치)과 그 곁가지 ⓐ«최종값이 이미 소등된 알약 위에 뜬다» ⓑ«골드·다이아 소등이
 * 96ms 어긋난다» 를 «고쳤다» 로 끝내지 않기 위한 도구다. 캡처 프레임을 세지 않고 **DOM 을
 * 직접** 트레이스한다 — 표본으로 램프를 세면 프레임 간격(25~37ms)에 위상이 먹힌다(13회차 교훈).
 *
 * 재는 것:
 *   ① 복제판이 생긴 시각 · opacity 가 0.05 → 0.95 로 오르는 데 걸린 시간(= 점등 램프)
 *   ② 첫 도착 시각과 만휘도(≥0.95) 시각의 차 — «도착보다 얼마나 이른가»
 *   ③ 골드·다이아 복제판이 소등을 «시작한» 시각의 차 (2인 지적 96ms)
 *   ④ 알약 숫자가 최종값에 정착한 시각 vs 그 알약이 소등을 시작한 시각 (최종값이 켜진 위에 찍히나)
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
  await page.waitForTimeout(700);
  await page.evaluate(() => { player.inv = 1e9; for(const e of enemies){ e.x = 1; e.y = 1; } window.step = () => {}; });

  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia;  fxDisp.dia = S.dia;  fxAcc.dia = 0;  fxHold.dia = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep'); await sleep(420);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'보상 받기 버튼 없음' };
    const gTarget = S.gold + 400 <= 0 ? null : null; void gTarget;

    const tr = [];                                     /* [t, goldOp, diaOp, 공중, goldTxt, diaTxt] */
    let firstArr = -1, air0 = 0;
    b.click();
    const t0 = performance.now();
    while(performance.now() - t0 < 2400){
      const t = Math.round(performance.now() - t0);
      let go = null, dio = null;
      for(const p of document.querySelectorAll('#fxl .fx-lit')){
        const isD = /cDia/.test(p.firstElementChild ? p.firstElementChild.className : '');
        const op = +getComputedStyle(p).opacity;
        if(isD) dio = op; else go = op;
      }
      const air = fxFlies.filter(f => f.ui).length;
      if(air > air0) air0 = air;
      if(firstArr < 0 && air0 && air < air0) firstArr = t;
      tr.push([t, go, dio, air,
               (document.getElementById('goldN')||{}).textContent || '',
               (document.getElementById('diaN')||{}).textContent || '']);
      await new Promise(r => requestAnimationFrame(() => r()));
    }
    return { tr, firstArr, gEnd:(document.getElementById('goldN')||{}).textContent,
             dEnd:(document.getElementById('diaN')||{}).textContent };
  });
  await browser.close();
  if(r.err){ console.error('probe93l 실패:', r.err); process.exit(1); }
  if(errs.length){ console.error('콘솔 에러:', errs[0]); process.exit(1); }

  const T = r.tr;
  const cross = (idx, from, to) => {                   /* op 가 from 아래에서 to 위로 처음 올라간 시각 */
    let a = -1;
    for(const row of T){ const v = row[idx];
      if(v == null) continue;
      if(a < 0 && v <= from) a = row[0];
      if(a >= 0 && v >= to) return [a, row[0]];
    }
    return null;
  };
  const born = idx => { for(const row of T) if(row[idx] != null) return row[0]; return -1; };
  const fadeStart = idx => {                           /* 만휘도 뒤 처음으로 0.95 아래로 내려간 시각 */
    let hi = false;
    for(const row of T){ const v = row[idx];
      if(v == null){ if(hi) return row[0]; continue; }
      if(v >= 0.95) hi = true;
      else if(hi) return row[0];
    }
    return -1;
  };
  const settle = (idx, want) => { for(const row of T) if(row[idx] === want) return row[0]; return -1; };

  const gRamp = cross(1, 0.10, 0.95), dRamp = cross(2, 0.10, 0.95);
  const gFade = fadeStart(1), dFade = fadeStart(2);
  const gSet = settle(4, r.gEnd), dSet = settle(5, r.dEnd);
  console.log(`첫 도착 ${r.firstArr}ms · 최종값 골드 "${r.gEnd}" 다이아 "${r.dEnd}"`);
  console.log(`① 점등 — 골드 생성 ${born(1)}ms · 램프 ${gRamp ? gRamp[0]+'→'+gRamp[1]+'ms ('+(gRamp[1]-gRamp[0])+'ms)' : '없음(하드컷)'}`);
  console.log(`         다이아 생성 ${born(2)}ms · 램프 ${dRamp ? dRamp[0]+'→'+dRamp[1]+'ms ('+(dRamp[1]-dRamp[0])+'ms)' : '없음(하드컷)'}`);
  if(gRamp) console.log(`② 만휘도(${gRamp[1]}ms) − 첫 도착(${r.firstArr}ms) = ${gRamp[1]-r.firstArr}ms  (음수 = 도착보다 이르다. 15회차 −460~−480ms)`);
  console.log(`③ 소등 시작 — 골드 ${gFade}ms · 다이아 ${dFade}ms · 차 ${Math.abs(gFade-dFade)}ms  (15회차 96ms)`);
  console.log(`④ 최종값 정착 — 골드 ${gSet}ms(소등 ${gFade}) ${gSet>=0&&gSet<gFade?'✓ 켜진 알약 위':'✗ 이미 소등된 뒤'}`
    + ` · 다이아 ${dSet}ms(소등 ${dFade}) ${dSet>=0&&dSet<dFade?'✓ 켜진 알약 위':'✗ 이미 소등된 뒤'}`);
})().catch(e => { console.error('probe93l 실패:', e.message); process.exit(1); });
