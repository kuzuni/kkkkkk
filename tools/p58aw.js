/* 작업 58 — 43회차 프로브 «HUD 알약 팝의 앵커»  (2인 공통ㅁ)
 *
 * 42차 2인 공통ㅁ: «gain HUD 알약 팝이 **우측 앵커** 라 아이콘이 좌로 17px 밀린다»
 *   BI  «cx 583.0 → 566.0 → 581.0, 복귀 272ms · 폭 55 → 65(+18%)»
 *   BJ  «알약 좌단 551 → 528, 우단 819 **고정** · 아이콘 중심 −17.5px · 흰 테두리 좌단 13px 돌출»
 *
 * 소스만 읽으면 `fxPzTick` 이 `transformOrigin='1px 50%'`(= 박스 **좌변**)을 쓰므로
 * «우변 고정» 은 나올 수 없다 — 두 사람이 잰 것이 무엇인지 **화면 좌표로 직접** 재야 한다.
 * 이 프로브는 얼리지 않고 rAF 로 시간을 흘리며 매 표본마다
 *   ⓐ 원본 알약(.cbox) ⓑ 딤 위 복제판(.fx-lit 과 그 안의 .cbox) ⓒ 알약 아이콘(i / .cic)
 * 의 **화면 rect** 를 그대로 찍는다. 배율은 `getComputedStyle().transform` 에서 같이 뽑는다.
 *
 *   node tools/p58aw.js            (기본 20ms × 40표본 = 0~780ms)
 *   node tools/p58aw.js 20 60
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const STEP = +(process.argv[2] || 20);
const N = +(process.argv[3] || 40);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxAt === 'function', null, { timeout: 20000 });
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(900);

  const rows = await p.evaluate(async ({ step, n }) => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
      return { x: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), cx: +((r.left + r.right) / 2).toFixed(1) }; };
    const sx = (el) => { if (!el) return null; const m = getComputedStyle(el).transform;
      if (!m || m === 'none') return 1; const v = m.match(/matrix\(([^,]+)/); return v ? +(+v[1]).toFixed(4) : 1; };
    const pill = () => document.getElementById('goldN') ? document.getElementById('goldN').closest('.cbox') : null;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    /* 트리거 — cap58b 와 같은 두 줄(전투 발 드랍) */
    const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
    const pt = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
    const t0 = performance.now();
    fxAt(pt, 'combat'); S.gold += 128000;
    const out = [];
    for (let i = 0; i < n; i++) {
      const target = t0 + i * step;
      while (performance.now() < target) await new Promise(r => requestAnimationFrame(r));
      const el = pill();
      const lit = document.querySelector('.fx-lit');
      const litBox = lit ? lit.querySelector('.cbox') : null;
      out.push({
        t: Math.round(performance.now() - t0),
        pill: rect(el), pillS: sx(el),
        ic: rect(el ? el.querySelector('i') : null),
        cic: rect(el ? el.querySelector('.cic') : null),
        lit: rect(lit), litS: sx(lit), litIc: rect(litBox ? litBox.querySelector('.cic') : null),
        fly: document.querySelectorAll('.fx-fly').length,
      });
    }
    return out;
  }, { step: STEP, n: N });

  const f = (v) => (v == null ? '   —  ' : String(v).padStart(6));
  console.log('  t  | pill.x pill.r pill.w  s     | icon.cx icon.w | lit.x  lit.r  s      | litIc.cx | fly');
  for (const r of rows) {
    console.log(
      String(r.t).padStart(4) + ' |' + f(r.pill && r.pill.x) + f(r.pill && r.pill.r) + f(r.pill && r.pill.w)
      + f(r.pillS) + ' |' + f(r.cic && r.cic.cx) + f(r.cic && r.cic.w)
      + ' |' + f(r.lit && r.lit.x) + f(r.lit && r.lit.r) + f(r.litS)
      + ' |' + f(r.litIc && r.litIc.cx) + ' |' + String(r.fly).padStart(4));
  }
  const cxs = rows.map(r => r.litIc ? r.litIc.cx : (r.cic ? r.cic.cx : null)).filter(v => v != null);
  if (cxs.length) console.log('\n아이콘 중심 산포: min ' + Math.min(...cxs) + ' · max ' + Math.max(...cxs)
    + ' · 폭 ' + (Math.max(...cxs) - Math.min(...cxs)).toFixed(1) + 'px');
  await b.close();
})();
