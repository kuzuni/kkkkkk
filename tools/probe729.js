#!/usr/bin/env node
/* 작업 729 재현기 — `verify488` [H1] 「홀드 내내 여러 장이 «흐르고» 있다」가 부하에서 흔들린다
 *
 *   node tools/probe729.js [--runs N] [--dense]
 *
 * 등재문(sess-1618-14814, 709 부하 재현의 곁다리)이 못박은 것: **처방 전에 분포부터**(344 규약).
 * 그래서 이 자는 고치지 않는다 — [H] 절이 재는 것과 **정확히 같은 홀드**를 굴리고,
 * 상수 스냅숏 시각(700/1400/2200/3000ms)의 «동시 생존 장수» 를 여러 번 재서 분포를 찍는다.
 *
 * 등재문의 가설: 첫 스냅숏이 «첫 발(`.lng` HB_LIFE_LONE 1300ms)과 반복분(HB_LIFE 310ms)이
 * 같이 살아 있는 창» 에 걸리는데, 부하로 홀드 가속(TR_HOLD_IV0 160 → IVMIN 60)이 늦어지면
 * 그 창이 뒤로 밀린다. 그 가설을 가르려면 «장수» 만으로는 모자라므로 세 가지를 같이 찍는다:
 *   ⓐ 상수 시각의 장수(= [H1] 이 지금 보는 값)
 *   ⓑ **조밀 궤적** — 25ms 간격으로 홀드 내내 장수를 재서 «2장 이상인 순간이 정말 없는가» 를 가른다
 *   ⓒ 스폰 시각 — `.fx-plus.hb` 노드가 붙은 시각(MutationObserver)으로 비트 간격을 잰다
 *
 * 종료 코드는 언제나 0 이다(재현기 · 판정하지 않는다). 판정은 사람이 표를 보고 한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const RUNS = Number((process.argv.find(a => a.startsWith('--runs=')) || '').split('=')[1] || 1);
const HTS = [700, 1400, 2200, 3000];      /* verify488 [H] 의 상수 스냅숏 시각 — 사본 */
const HOLD_MS = 3600;   /* 3000ms 창의 «앞대기» 를 재려면 마지막 상수 시각 뒤로 여유가 있어야 한다 */
const STEP = 25;                          /* 조밀 궤적 간격 */

const one = async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });
  const cdp = await ctx.newCDPSession(p);

  /* [H] 절과 같은 상태 — 룬 r1 · 확률 0(실패 갈래가 660 이후 유일한 회당 채널) */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
    window.__born = [];
    new MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const c = (n.className || '') + '';
        if (/\bfx-plus\b/.test(c) && /\bhb\b/.test(c)) window.__born.push({ t: performance.now(), lone: /\blng\b/.test(c) });
      }
    }).observe(document.getElementById('fxl'), { childList: true, subtree: true });
    runeRate = () => 0;
    try { closeModal(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);

  const bb = await p.locator('#trRunes .tr-rn[data-rune="r1"] .rbt.b1').first().boundingBox();
  const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  const t0 = Date.now();
  await p.evaluate(() => { window.__t0 = performance.now(); });

  const trace = [];
  for (let t = STEP; t <= HOLD_MS; t += STEP) {
    while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 3));
    const s = await p.evaluate(tt => {
      const rs = [...document.querySelectorAll('#fxl .fx-plus.hb')]
        .filter(n => parseFloat(getComputedStyle(n).opacity) > 0.08)
        .map(n => n.getBoundingClientRect());
      let ov = 0;
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i], b = rs[j];
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) ov++;
      }
      return { want: tt, real: Math.round(performance.now() - window.__t0), n: rs.length, ov,
               w: rs.length ? Math.round(Math.max(...rs.map(r => r.width))) : 0 };
    }, t);
    trace.push(s);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await st.catch(() => {});
  const born = await p.evaluate(() => window.__born.map(b => ({ t: Math.round(b.t - window.__t0), lone: b.lone })));
  await browser.close();
  return { trace, born };
};

(async () => {
  console.log('PROBE729 — [H1] 「홀드 내내 ≥2장」 분포 (runs=' + RUNS + ')');
  const rows = [];
  for (let i = 0; i < RUNS; i++) {
    const { trace, born } = await one();
    /* ⓐ 상수 시각의 장수 — 궤적에서 그 시각에 가장 가까운 표본을 고른다 */
    const at = HTS.map(t => {
      let best = trace[0];
      for (const s of trace) if (Math.abs(s.real - t) < Math.abs(best.real - t)) best = s;
      return best.n;
    });
    /* ⓑ 상수 시각 ±120ms 창에서의 최대 장수 — «그 창에 2장이 정말 없었나» */
    const win = HTS.map(t => Math.max(...trace.filter(s => Math.abs(s.real - t) <= 120).map(s => s.n), 0));
    const dead = trace.filter(s => s.real >= 400 && s.n < 2).map(s => s.real);
    /* ⓓ **앞으로만 기다리는 대기** — 상수 시각 t 부터 «≥2장» 이 처음 보일 때까지 몇 ms 인가.
       574·630 처방(«시각을 상수로 박지 말고 창을 기다린다»)의 슬랙을 실측으로 정하기 위한 값이다. */
    const wait = HTS.map(t => {
      const s = trace.find(x => x.real >= t && x.n >= 2);
      return s ? s.real - t : -1;
    });
    const ovMax = Math.max(...trace.map(s => s.ov), 0);
    const nMax = Math.max(...trace.map(s => s.n), 0);
    const wMax = Math.max(...trace.map(s => s.w), 0);
    rows.push({ at, win, wait, dead, ovMax, nMax, wMax, born: born.length });
    console.log('  run ' + (i + 1) + ' · 상수시각 ' + at.join('·') +
      ' · [H1] ' + (at.every(n => n >= 2) ? 'ok' : 'FAIL') +
      ' · 앞대기(ms) ' + wait.join('·') +
      ' · 조밀 전구간 최대 겹침 ' + ovMax + ' · 최대 동시 ' + nMax + ' · 최대 폭 ' + wMax +
      ' · <2장 표본 ' + dead.length);
  }
  const fails = rows.filter(r => !r.at.every(n => n >= 2)).length;
  console.log('요약 — [H1] 빨강(상수 시각) ' + fails + '/' + RUNS +
    ' · 1장인 자리: ' + HTS.map((t, i) => t + 'ms=' + rows.filter(r => r.at[i] < 2).length).join(' '));
  console.log('     ±120창 기준 빨강 ' + rows.filter(r => !r.win.every(n => n >= 2)).length + '/' + RUNS +
    ' · 앞대기 최댓값 ' + Math.max(...rows.flatMap(r => r.wait)) + 'ms · 못 채운 창 ' +
    rows.flatMap(r => r.wait).filter(w => w < 0).length);
  console.log('     조밀 표본 전체 — 최대 겹침 ' + Math.max(...rows.map(r => r.ovMax)) +
    ' · 최대 동시 ' + Math.max(...rows.map(r => r.nMax)) + ' · 최대 잉크 폭 ' + Math.max(...rows.map(r => r.wMax)));
})();
