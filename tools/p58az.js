/* 작업 58 — 43회차 프로브 «전투 발 도착 봉투» + «연속 획득 스트레스»  (2인 공통ㄹ)
 *
 *  ⓐ 봉투 — 전투 발 한 묶음의 **첫 도착 · 마지막 도착**을 잰다(사양 0.28 / 0.62s).
 *     42차 실측은 첫 272~331ms(✔) · 마지막 **331~466ms**(사양 620) 였다.
 *     «도착» 은 fxFlies 에서 그 비행이 빠지는 순간(= 꽂힘)으로 잡는다 — 캡처 격자와 무관한 결정적 신호다.
 *  ⓑ 스트레스 — 42차 지시문의 경고(«전투 발은 초당 수십 회라 스프레드를 늘리면 화면이 코인으로
 *     덮인다»)를 검산한다. 연속 획득을 2초 동안 퍼부어 **동시 코인 최대치**와
 *     «자리가 없어 개수가 깎인 묶음» 을 센다. 상한은 `FXFLY_MAX_C`(12)다.
 *
 *   node tools/p58az.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function boot(b) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
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
  return { p, errs };
}

(async () => {
  const b = await launch(chromium);

  /* ── ⓐ 한 묶음의 도착 봉투 (5회 반복) ── */
  {
    const { p, errs } = await boot(b);
    const runs = await p.evaluate(async () => {
      const shot = () => new Promise(async (res) => {
        const e = enemies[0]; const pt = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
        const t0 = performance.now();
        fxAt(pt, 'combat'); S.gold += 128000;
        let born = 0, seen = 0, first = null, last = null;
        for (let i = 0; i < 200; i++) {
          await new Promise(r => requestAnimationFrame(r));
          const n = fxFlies.length;
          if (n > born) born = n;
          if (born && n < seen) { /* 줄어든 만큼이 도착 */ }
          if (born) {
            if (first === null && n < born) first = performance.now() - t0;
            if (n === 0 && born) { last = performance.now() - t0; break; }
          }
          seen = n;
        }
        res({ cnt: born, first: first == null ? null : Math.round(first), last: last == null ? null : Math.round(last) });
      });
      const out = [];
      for (let k = 0; k < 5; k++) {
        out.push(await shot());
        await new Promise(r => setTimeout(r, 1400));
        try { fxSeen.gold = S.gold; } catch (e) {}
      }
      return out;
    });
    console.log('── 전투 발 도착 봉투 (5묶음) ── 사양: 첫 280ms · 마지막 **620±40ms**');
    runs.forEach((r, i) => console.log('  묶음 ' + (i + 1) + ': 코인 ' + r.cnt
      + '개 · 첫 도착 ' + r.first + 'ms · 마지막 도착 **' + r.last + 'ms**'));
    const ls = runs.map(r => r.last).filter(v => v != null);
    const fs = runs.map(r => r.first).filter(v => v != null);
    if (ls.length) console.log('  평균 — 첫 ' + Math.round(fs.reduce((a, c) => a + c, 0) / fs.length)
      + 'ms · 마지막 **' + Math.round(ls.reduce((a, c) => a + c, 0) / ls.length) + 'ms**'
      + ' · 산포 ' + Math.round(ls.reduce((a, c) => a + c, 0) / ls.length - fs.reduce((a, c) => a + c, 0) / fs.length) + 'ms (사양 340)');
    if (errs.length) console.log('  ⚠ 에러 ' + errs.length + '건');
    await p.context().close();
  }

  /* ── ⓑ 연속 획득 스트레스 ── */
  {
    const { p, errs } = await boot(b);
    const st = await p.evaluate(async () => {
      let maxFly = 0, maxDom = 0, cut = 0, shots = 0;
      const t0 = performance.now();
      const iv = setInterval(() => {
        const e = enemies[0]; const pt = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
        fxAt(pt, 'combat'); S.gold += 4000; shots++;
      }, 50);                                        /* 초당 20회 획득 — «초당 수십 회» 의 상한 쪽 */
      while (performance.now() - t0 < 2000) {
        await new Promise(r => requestAnimationFrame(r));
        maxFly = Math.max(maxFly, fxFlies.length);
        maxDom = Math.max(maxDom, fxLC() ? fxLC().childElementCount : 0);
        if (fxFlies.length >= FXFLY_MAX_C) cut++;    /* 상한에 닿아 room 이 개수를 깎는 프레임 */
      }
      clearInterval(iv);
      await new Promise(r => setTimeout(r, 1200));
      return { shots, maxFly, maxDom, cut, leftover: fxFlies.length,
        domLeft: fxLC() ? fxLC().childElementCount : 0, cap: FXFLY_MAX_C };
    });
    console.log('\n── 연속 획득 스트레스 (초당 20회 × 2초) ──');
    console.log('  획득 ' + st.shots + '회 · 동시 코인 최대 **' + st.maxFly + '** / 상한 ' + st.cap
      + ' · #fxlc DOM 최대 ' + st.maxDom);
    console.log('  상한에 닿은 프레임 ' + st.cut + '개(닿으면 room 이 개수를 깎는다 — 연출이 사라지지는 않는다)');
    console.log('  1.2초 뒤 잔여 비행 ' + st.leftover + ' · 잔여 DOM ' + st.domLeft + ' (둘 다 0 이어야 한다)');
    if (errs.length) console.log('  ⚠ 에러 ' + errs.length + '건: ' + errs.slice(0, 2).join(' | '));
    await p.context().close();
  }
  await b.close();
})();
