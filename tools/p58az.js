/* 작업 58 — 43회차 프로브 «전투 발 도착 봉투» + «연속 획득 스트레스»  (2인 공통ㄹ)
 *
 *  ⓐ 봉투 — 전투 발 한 묶음의 **첫 도착 · 마지막 도착**을 잰다(사양 0.28 / 0.62s).
 *     42차 실측은 첫 272~331ms(✔) · 마지막 **331~466ms**(사양 620) 였다.
 *     «도착» 을 **두 자로** 잰다(43차에 두 자가 갈렸다 — 아래):
 *       ⒜ `fxFlies` 에서 그 비행이 빠지는 순간(= 꽂힘 완료). 캡처 격자와 무관한 결정적 신호다.
 *       ⒝ **화면에서 코인이 마지막으로 «보이는» 순간** — 41·42회차의 census 규약과 같은 자
 *          (불투명도 ≥ 0.06 · 화면 안 · **렌더 bbox 최소변 ≥ 12px**).
 *     ⚑ 44회차 — ⒝ 를 신설한 이유. 43차 두 비평가가 **같은 수**를 냈는데 내 자와 어긋났다:
 *       BK «비행 코인의 마지막은 gain-13 = **485ms**, 흡수 코인은 gain-14 = **543ms**. f15~17 에는
 *          화면 어디에도 코인이 없다» · BL «R−B>22 까지 완화해도 gain-14~17 코인 잉크 **0** —
 *          마지막 도착 ∈ (485, 543]ms, 사양 620 대비 **−77~−135ms**».
 *       내 ⒜ 자로는 612ms 였다. 둘 다 맞다 — 착지 직후 `scale(.18)` 로 오므린 코인은 **불투명도 1 인데
 *       화면에 자국이 없다**(42회차가 census 에 12px 하한을 넣은 바로 그 현상)라, ⒜ 와 ⒝ 사이에
 *       «보이지 않는 꼬리» 70ms 가 있다. **사양 0.62 는 «꽂힘 0.14 까지 포함한» 값**이므로
 *       (`fxFly` 주석의 예산식) 비평가의 자 ⒝ 가 사양에 맞는 자다. 값은 ⒝ 로 맞춘다.
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
        let born = 0, first = null, last = null, vis = null;
        /* ⒝ «보이는» 코인 — census 규약(α ≥ 0.06 · 화면 안 · 렌더 최소변 ≥ 12px) */
        const visN = () => {
          let k = 0;
          for (const el of document.querySelectorAll('.fx-fly')) {
            if (+getComputedStyle(el).opacity < 0.06) continue;
            const r = el.getBoundingClientRect();
            if (Math.min(r.width, r.height) < 12) continue;
            if (r.right < 0 || r.bottom < 0 || r.left > 1080 || r.top > 2280) continue;
            k++;
          }
          return k;
        };
        for (let i = 0; i < 300; i++) {
          await new Promise(r => requestAnimationFrame(r));
          const n = fxFlies.length, v = visN(), now = performance.now() - t0;
          if (n > born) born = n;
          if (born) {
            if (first === null && n < born) first = now;
            if (v > 0) vis = now;                      /* 마지막으로 «보인» 시각을 계속 덮어쓴다 */
            if (n === 0) { last = now; break; }
          }
        }
        res({ cnt: born, first: first == null ? null : Math.round(first),
              last: last == null ? null : Math.round(last), vis: vis == null ? null : Math.round(vis) });
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
      + '개 · 첫 도착 ' + r.first + 'ms · ⒜꽂힘완료 ' + r.last + 'ms · **⒝마지막 «보이는» 코인 '
      + r.vis + 'ms**'));
    const avg = (a) => Math.round(a.reduce((x, c) => x + c, 0) / a.length);
    const ls = runs.map(r => r.last).filter(v => v != null);
    const vsv = runs.map(r => r.vis).filter(v => v != null);
    const fs = runs.map(r => r.first).filter(v => v != null);
    if (ls.length) console.log('  평균 — 첫 ' + avg(fs) + 'ms · ⒜꽂힘완료 ' + avg(ls)
      + 'ms · **⒝마지막 «보이는» 코인 ' + avg(vsv) + 'ms** (사양 620±40 = 580~660 — 이 자로 맞춘다)'
      + ' · 보이지 않는 꼬리 ' + (avg(ls) - avg(vsv)) + 'ms');
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
