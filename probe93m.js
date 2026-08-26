#!/usr/bin/env node
/* 93 17회차 — **아이콘 «렌더 폭» 자**(비행 · 딤 위 복제판 · 실 HUD 를 한 자로 잰다).
 *
 *   node probe93m.js
 *
 * 왜 만드나 — r17 비평가 2명이 독립으로 같은 것을 지적했고, 15회차 AN·AO 도 같은 지적이었다
 * (**4명 3회차**):
 *   AR #3 «비행 다이아 23px vs 코인 32px = 0.719 인데 실 HUD 는 57/56 = 1.018»
 *   AS #3 «비행 젬 19×19 vs 비행 코인 32×32 = 0.59 인데 HUD 는 1.00»
 *   AR #1 «딤 위 복제 젬 49×56 vs 실 HUD 젬 57×54 — 폭 −14.0%»
 * 두 사람의 **절대값이 서로 다르다**(23 vs 19). 채도 마스크 임계가 다르면 다이아처럼 뾰족한
 * 도형은 «몸통 폭» 이 크게 흔들리기 때문이다 — 그래서 화소 마스크가 아니라 **레이아웃 박스**를
 * 잰다. 두 재화가 같은 SVG 렌더 경로(`.cic` <img>)를 쓰므로 잉크비 = 박스비 × (SVG 잉크/viewBox)
 * 이고, SVG 잉크 비율은 파일에 박힌 상수다(gold 60/64 · dia 56/64). 박스만 정확히 재면 된다.
 * `getBoundingClientRect()` 는 transform 을 포함하므로 `scaleX(1.16)` 도 그대로 잡힌다.
 *
 * 이 자가 확인하려는 가설: **원인은 «비행 아이콘이 작다» 가 아니라 «HUD 만 보정을 받는다» 다.**
 *   index.html:345  `#app:not(...) #top .curs .cDia i>.cic{transform:scaleX(1.16)}`
 *   index.html:353  `#app:not(...) #top .curs .cGold i>.cic{width:65.3px;height:65.3px}`
 * 두 규칙 다 **`#top .curs` 안에서만** 걸린다. `.fx-fly`(비행)와 `.fx-lit`(딤 위 복제판)은
 * 그 밖이라 보정을 통째로 잃는다 — 그래서 같은 화면 안에서 두 재화의 크기비가 갈린다.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

/* SVG 잉크가 viewBox 를 채우는 비율 — 파일에 박힌 상수(자산이 바뀌면 여기도 바뀐다) */
const INK = { gold: 60/64, dia: 56/64 };               /* gold: ellipse r30+stroke2 → 4..60 아님, 2..62 = 60 */

function launch(){
  const c = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'];
  for(const p of c){ try { if(p && fs.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  return chromium.launch();
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);

  /* 씬B 와 같은 상태를 만든다 — 퀘스트 모달에서 보상 수령(딤 위 복제판이 뜬다) */
  await page.evaluate(() => {
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia;  fxDisp.dia = S.dia;  fxAcc.dia = 0;  fxHold.dia = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) throw new Error('퀘스트 보상 버튼을 못 찾았다');
    b.click();
  });
  await page.waitForTimeout(420);                      /* 퍼짐~머묾 — 비행 아이콘이 다 살아 있는 시점 */

  const M = await page.evaluate(() => {
    const w = el => el ? +el.getBoundingClientRect().width.toFixed(2) : null;
    const h = el => el ? +el.getBoundingClientRect().height.toFixed(2) : null;
    const one = sel => document.querySelector(sel);
    /* ⚠ 비행 아이콘은 부모 `.fx-fly` 에 프레임마다 다른 scale 이 걸린다 — rect 를 그대로 쓰면
       «어느 아이콘을 골랐나» 가 값을 지배한다(첫 판에서 골드 45.2 / 다이아 48.03 이 나온 이유).
       고치려는 것은 **아이콘 자체의 규격**이므로 부모 scale 을 타지 않는 «레이아웃 폭 × 자기 transform»
       으로 잰다. 같은 방식을 세 자리에 똑같이 적용해야 세 줄이 비교 가능하다. */
    const own = el => {
      if(!el) return null;
      const cs = getComputedStyle(el);
      const lw = parseFloat(cs.width) || 0, lh = parseFloat(cs.height) || 0;
      const m = cs.transform;
      let sx = 1, sy = 1;
      if(m && m !== 'none'){
        const v = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number);
        if(v.length >= 6){ sx = Math.hypot(v[0], v[1]); sy = Math.hypot(v[2], v[3]); }
      }
      return { w:+(lw*sx).toFixed(2), h:+(lh*sy).toFixed(2) };
    };
    const flyW = cur => {
      const a = [...document.querySelectorAll('#fxl .fx-fly>.cic[data-cur-ic="' + cur + '"]')];
      if(!a.length) return null;
      const o = own(a[0]);
      return { n:a.length, w:o.w, h:o.h };
    };
    return {
      hudGold: own(one('#top .curs .cGold i>.cic')),
      hudDia : own(one('#top .curs .cDia i>.cic')),
      litGold: own(one('#fxl .fx-lit .cGold i>.cic')),
      litDia : own(one('#fxl .fx-lit .cDia i>.cic')),
      flyGold: flyW('gold'),
      flyDia : flyW('dia')
    };
  });
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); process.exit(1); }

  const ink = (box, cur) => box == null ? null : +(box * INK[cur]).toFixed(2);
  const row = (name, g, d) => {
    if(!g || !d || g.w == null || d.w == null){ console.log(`  ${name}: 측정 실패 (${JSON.stringify(g)} / ${JSON.stringify(d)})`); return null; }
    const gi = ink(g.w, 'gold'), di = ink(d.w, 'dia'), r = +(di/gi).toFixed(3);
    console.log(`  ${name.padEnd(16)} 골드 박스 ${String(g.w).padStart(6)} → 잉크 ${String(gi).padStart(6)}  ·  다이아 박스 ${String(d.w).padStart(6)} → 잉크 ${String(di).padStart(6)}  ·  **잉크 폭비 ${r}**`);
    return r;
  };
  console.log('93 아이콘 렌더 폭 (박스는 transform 포함 · 잉크 = 박스 × SVG 잉크비 gold .9375 / dia .875)');
  const rHud = row('실 HUD', M.hudGold, M.hudDia);
  const rLit = row('딤 위 복제판', M.litGold, M.litDia);
  const rFly = row('비행', M.flyGold, M.flyDia);
  console.log(`  · 비행 아이콘 표본: 골드 ${M.flyGold ? M.flyGold.n : 0}개 · 다이아 ${M.flyDia ? M.flyDia.n : 0}개`);

  let bad = 0;
  const chk = (name, r, lo, hi) => {
    if(r == null){ console.log(`  ✗ ${name}: 못 쟀다`); bad++; return; }
    const ok = r >= lo && r <= hi;
    console.log(`  ${ok ? '✓' : '✗'} ${name} 잉크 폭비 ${r} (${lo}~${hi})`);
    if(!ok) bad++;
  };
  /* 판정 — 세 자리의 «다이아/골드 잉크 폭비» 가 서로 5% 안에 들어야 한다.
     실 HUD 가 기준이다(비평가 두 사람이 «HUD 비와 맞춰라» 로 처방했다). */
  console.log('');
  chk('실 HUD', rHud, 0.90, 1.10);
  if(rHud != null){
    chk('딤 위 복제판 (실 HUD 대비)', rLit == null ? null : +(rLit/rHud).toFixed(3), 0.95, 1.05);
    chk('비행 (실 HUD 대비)',         rFly == null ? null : +(rFly/rHud).toFixed(3), 0.95, 1.05);
  }
  console.log(bad ? `\nPROBE93M FAIL (${bad}건)` : '\nPROBE93M PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93m 실패:', e.message); process.exit(1); });
