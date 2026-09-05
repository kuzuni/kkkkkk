#!/usr/bin/env node
/* 946 재현기 — «`par 7` 부하에서 흔들리는 자 다섯» 중 첫 자(`probe305`)의 흔들림이
 * **제품의 관성이 죽는 것인가 / 자의 스톱워치가 늦게 눌리는 것인가** 를 가른다.
 *
 *   node tools/probe946.js [반복수=10]          단독(한가할 때)
 *   node tools/probe946.js [반복수] --int       중간 보고(회차마다 한 줄)
 *
 * 왜 이 자가 따로 있나 —
 *   `probe305` 는 관성을 **왕복 두 번**으로 잰다: 뗀 «직후» `page.evaluate` 로 t0 를,
 *   450ms 뒤 다시 t1 을 읽고 `t1 − t0 > 20` 이면 통과다. 한가할 때는 그 «직후» 가 진짜
 *   직후지만, 부하에서는 왕복 자체가 수십~수백 ms 걸린다 — 그 사이 관성이 이미 굴러가
 *   **t0 가 관성분을 삼킨다**(그러면 남은 450ms 의 몫만 세게 된다). 게다가 관성은
 *   `requestAnimationFrame` 으로 돈다(index.html `dsFling`) — 프레임이 굶으면 **벽시계
 *   450ms 안에 도는 프레임 수 자체가 준다**. 곧 자의 과녁은 «프레임 예산이 건강하다» 를
 *   전제로 한 벽시계 창인데, 부하에서는 그 전제가 깨진다.
 *
 *   그래서 이 자는 왕복을 쓰지 않는다. **페이지 안에서** pointerup 순간의 scrollTop 을
 *   동기로 찍고(= 진짜 기준선), 그 뒤 rAF 마다 (t, scrollTop) 을 3초까지 적어
 *   궤적을 통째로 들고 나온다. 그러면 한 표본에서 셋을 같이 볼 수 있다:
 *     ⓐ 게이트의 눈  = (450ms 지점) − (첫 왕복이 읽은 t0)        ← `probe305` 의 판정
 *     ⓑ 벽시계 창    = (450ms 지점) − (뗀 순간)                   ← 왕복을 뺀 같은 창
 *     ⓒ 관성 총 이동 = (정착 지점)  − (뗀 순간)                   ← 프레임 수와 무관한 사실
 *   ⓐ 만 빨갛고 ⓑⓒ 가 멀쩡하면 «스톱워치가 늦게 눌린 것» 이고,
 *   ⓒ 까지 0 이면 «관성이 정말 죽은 것» 이다. 둘은 처방이 다르다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '10', 10);
const INT = process.argv.includes('--int');

/* 관성이 «정착했다» 고 볼 조용한 구간 — dsFling 은 DS_DAMP 0.95/프레임 이라
   60fps 에서 200ms(≈12프레임)면 배수가 0.54 다. 그동안 1px 도 안 움직였으면 끝난 것이다. */
const QUIET_MS = 200;
const TRACE_MS = 3000;

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1, hasTouch: false });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await page.waitForTimeout(1000);
    await page.evaluate(() => { S.gold = 1e15; S.dia = 1e9; S.relic = 1e6; uiDirty = true; renderUI(); });
    await page.waitForTimeout(500);

    const info = await page.evaluate((TR) => {
      openPass(); uiDirty = true; try { renderUI(); } catch (_) {}
      window.__box = () => [...document.querySelectorAll('.ps-list')]
        .filter((e) => { const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4; })
        .find((e) => e.scrollHeight - e.clientHeight > 1) || null;
      window.__top = () => { const b = window.__box(); return b ? b.scrollTop : -1; };
      /* dsFling 이 불렸는가 · 그때 v */
      window.__fl = null;
      const orig = window.dsFling;
      window.dsFling = function (r) { window.__fl = { v: r.v, acc: r.acc }; return orig.apply(this, arguments); };
      /* 뗀 순간을 **동기로** 찍는다 — 제품의 pointerup 리스너(capture, dsInit 에서 먼저 등록)가
         이미 dsFling 을 예약한 뒤 우리 차례가 온다. 이때 scrollTop 은 아직 «드래그만» 의 값이다. */
      window.__lm = 0; window.__gap = null; window.__nmv = 0;
      window.__rel = null; window.__trace = [];
      addEventListener('pointermove', () => { window.__lm = performance.now(); window.__nmv++; }, true);
      addEventListener('pointerup', () => {
        const now = performance.now();
        window.__gap = window.__lm ? now - window.__lm : 'move 0건';
        window.__drag = document.body.classList.contains('ds-drag');
        const b = window.__box();
        window.__rel = { t: now, s: b ? b.scrollTop : -1, el: b };
        /* 궤적 기록 — 관성과 **같은 rAF 줄**에 서므로 프레임이 굶으면 표본도 같이 준다.
           그래서 «표본이 몇 장 왔나» 자체가 프레임 예산의 계기판이 된다. */
        const rec = () => {
          const t = performance.now() - now;
          const bb = window.__box();
          window.__trace.push([t, bb ? bb.scrollTop : -1, bb === window.__rel.el ? 1 : 0]);
          if (t < TR) requestAnimationFrame(rec);
        };
        requestAnimationFrame(rec);
      }, true);
      const el = window.__box();
      if (!el) return { err: '컨테이너 없음' };
      el.scrollTop = 0;
      const r = el.getBoundingClientRect();
      return { max: el.scrollHeight - el.clientHeight, x: Math.round(r.x + r.width / 2),
               y: Math.round(r.y + Math.min(r.height * 0.65, r.height - 60)) };
    }, TRACE_MS);
    if (info.err) { rows.push({ i, err: info.err }); await ctx.close(); continue; }

    /* verify95 [E]·probe305 와 **완전히 같은** 제스처 (CDP 연달아 쏘기) */
    const cdp = await ctx.newCDPSession(page);
    const mev = (type, y, buttons) => cdp.send('Input.dispatchMouseEvent',
      { type, x: info.x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' });
    await mev('mousePressed', info.y, 1);
    for (let k = 1; k <= 5; k++) { await mev('mouseMoved', info.y - k * 60, 1); await page.waitForTimeout(8); }
    await Promise.all([mev('mouseMoved', info.y - 360, 1), mev('mouseReleased', info.y - 360, 0)]);

    /* ⓐ 게이트의 눈 — probe305 가 하는 그대로 «왕복 t0» 를 읽는다(늦게 눌리는 그 스톱워치) */
    const t0 = await page.evaluate(() => window.__top());
    const lag = await page.evaluate(() => performance.now() - window.__rel.t);
    await page.waitForTimeout(TRACE_MS + 200);
    const d = await page.evaluate(() => ({
      gap: window.__gap, fl: window.__fl, nmv: window.__nmv, drag: window.__drag,
      rel: { t: window.__rel.t, s: window.__rel.s }, trace: window.__trace,
    }));
    await ctx.close();

    const tr = d.trace;
    /* ⚠ «정착» 을 «QUIET_MS 동안 안 바뀐 첫 지점» 으로 잡으면 **부하에서 자기가 무너진다**
       (1회차에 이 자가 먼저 틀렸다): 프레임이 3fps 로 굶으면 200ms 창 안에 표본이 아예 없어
       첫 표본이 그대로 «정착» 이 되고, ⓒ 가 0 이나 음수로 찍힌다(실측 −50). 프레임 수에
       기대지 않는 정의로 바꾼다 — **정착값 = 궤적의 마지막 값** · **정착 시각 = 마지막으로
       값이 바뀐 시각**. 그러면 굶든 안 굶든 «관성이 데려간 곳» 을 그대로 가리킨다. */
    const n450 = tr.filter(p => p[0] <= 450).length;
    const s450 = n450 ? tr.filter(p => p[0] <= 450).pop()[1] : null;   /* 창 안 표본이 0장이면 «못 쟀다» */
    const endS = tr.length ? tr[tr.length - 1][1] : d.rel.s;
    let settleT = 0;
    for (let k = tr.length - 1; k >= 0; k--) if (tr[k][1] !== endS) { settleT = tr[k][0]; break; }
    const swap = tr.some(p => p[2] === 0);
    rows.push({ i, gap: d.gap, nmv: d.nmv, v: d.fl ? d.fl.v : null, fling: !!d.fl,
      relS: d.rel.s, lag, t0, s450, n450, settleT, settleS: endS, frames: tr.length, swap,
      moving: settleT > TRACE_MS - 400,
      gateD: s450 == null ? null : s450 - t0, wallD: s450 == null ? null : s450 - d.rel.s,
      totalD: endS - d.rel.s });
    if (INT) { const r = rows[rows.length - 1]; console.log(`  [${i}] lag ${Math.round(lag)}ms · 프레임 ${tr.length}(창 안 ${n450}) · `
      + `ⓐ${r.gateD == null ? '못잼' : Math.round(r.gateD)} ⓑ${r.wallD == null ? '못잼' : Math.round(r.wallD)} ⓒ${Math.round(r.totalD)}`); }
    if (process.argv.includes('--dump'))
      console.log('    궤적 앞 12장: ' + tr.slice(0, 12).map(p => `${Math.round(p[0])}:${Math.round(p[1])}${p[2] ? '' : '*'}`).join(' '));
  }
  await browser.close();

  const n = x => (x == null ? '—' : Math.round(x));
  console.log('\n| # | gap | v | 왕복 lag(ms) | 뗀 곳 | 왕복 t0 | 450ms(표본) | 마지막변화(ms) | 끝값 | 프레임 | ⓐ게이트 | ⓑ벽시계 | ⓒ총이동 | 게이트판정 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.err) { console.log(`| ${r.i} | — | — | — | — | — | — | — | — | — | — | — | — | ERR ${r.err} |`); continue; }
    console.log(`| ${r.i} | ${typeof r.gap === 'number' ? r.gap.toFixed(1) : r.gap} | ${r.v == null ? '—' : r.v.toFixed(3)} | `
      + `${n(r.lag)} | ${n(r.relS)} | ${n(r.t0)} | ${n(r.s450)}(${r.n450}) | ${n(r.settleT)}${r.moving ? '⇢' : ''} | ${n(r.settleS)} | `
      + `${r.frames} | ${n(r.gateD)} | ${n(r.wallD)} | ${n(r.totalD)} | ${r.gateD != null && r.gateD > 20 ? 'PASS' : 'FAIL'} |`);
  }
  const ok = rows.filter(r => !r.err);
  const gateBad = ok.filter(r => !(r.gateD != null && r.gateD > 20));
  const wallBad = ok.filter(r => !(r.wallD != null && r.wallD > 20));
  const totBad = ok.filter(r => !(r.totalD > 20));
  const noFling = ok.filter(r => !r.fling);
  console.log(`\n  표본 ${ok.length} · 관성 미발화 ${noFling.length} · 컨테이너 교체 ${ok.filter(r => r.swap).length}`
    + ` · 3초 안에 안 멎음 ${ok.filter(r => r.moving).length}`);
  console.log(`  ⓐ 게이트 눈(450ms − 왕복 t0) 미달 ${gateBad.length}`
    + ` · ⓑ 벽시계(450ms − 뗀 곳) 미달 ${wallBad.length}`
    + ` · ⓒ 총 이동(끝값 − 뗀 곳) 미달 ${totBad.length}`);
  if (ok.length) {
    const lags = ok.map(r => r.lag), frs = ok.map(r => r.frames);
    console.log(`  왕복 lag ${Math.min(...lags).toFixed(0)}~${Math.max(...lags).toFixed(0)}ms`
      + ` · 3초 rAF 표본 ${Math.min(...frs)}~${Math.max(...frs)}장(한가하면 ~180)`);
  }
  /* 이 자는 «판정» 이 아니라 «갈래» 를 낸다 — 세 축이 서로 다르게 빨간 것이 관측 결과다.
     그래도 스윕이 «없는 자» 로 지나치지 않게 마지막 줄은 PASS/FAIL 말투로 낸다. */
  const verdict = totBad.length === 0;
  console.log(verdict
    ? `\nPROBE946 PASS — 관성 총 이동은 ${ok.length}/${ok.length} 살아 있다(ⓐ 미달 ${gateBad.length}건은 벽시계 창이 삼킨 몫)`
    : `\nPROBE946 FAIL — 관성 총 이동이 ${totBad.length}/${ok.length} 에서 죽었다(제품 쪽)`);
  process.exit(verdict ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
