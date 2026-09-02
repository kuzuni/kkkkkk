/* 785 재현 — «[B2] 의 문턱이 러너 틱 속도에 붙어 있다» 를 **찍힌 표본**으로 가른다
 *
 *   node tools/probe785.js
 *
 * 등재문(PROGRESS 785)이 말하는 것: `verify683` [B2] 는 «홀드가 6회 이상 소환한다» 를 묻는데
 * 누르는 방법이 «N밀리초» 라, 문턱이 사실은 **이 기계가 1초에 몇 번 틱하는가**에 붙어 있다.
 * 753 이 3000 → 6000ms 로 늘린 것은 같은 축을 한 칸 민 것뿐이다.
 *
 * ⚑ **재현을 러너의 기분에 맡기지 않는다.** 그냥 돌리면 «오늘은 빨라서 초록» 이 나올 수 있어
 *   결론이 안 선다 ⇒ CDP `Emulation.setCPUThrottlingRate` 로 **느린 기계를 만들어** A/B 를 가른다.
 *   그래야 «문턱이 속도에 붙어 있다» 가 관측이 아니라 **증명**이 된다.
 *
 * 네 절:
 *   [1] 눈금  — 이 러너의 실제 홀드 틱 속도(제품 설계값 6~16회/초와 대조)
 *   [2] 재현  — 느린 기계에서 «고정 시간» 자는 표본이 굶는다(문턱 6 미달)
 *   [3] 수리  — 같은 느린 기계에서 `holdUntil` 은 **같은 표본을 실제로 얻는다**
 *   [4] 되돌림 — 상한은 살아 있다(도달 불가한 표본을 시키면 상한에서 끊고 `reached=false`)
 *              · 빠른 기계에서는 상한을 다 안 쓰고 일찍 뗀다(무한정 누르는 자가 아니다)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { holdUntil } = require('./holdburst');

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const NEED = 6;                 /* verify683 [B2] 의 문턱 — 한 칸도 안 내린다(334 규약) */
const FIXED = 3000;             /* 753 이전의 «고정 시간» — 재현 대상 */
const SLOW = 8;                 /* 느린 기계 배수(클라우드 러너 실측 1.3~1.9회/초를 재현) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트마다 시각을 남긴다 — 틱 «간격» 을 재려면 개수만으로는 모자란다 */
const WATCH = () => {
  window.__p785 = { t: [] };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function () { const r = o.apply(this, arguments); window.__p785.t.push(performance.now()); return r; };
  return true;
};
const RESET = () => { window.__p785.t.length = 0; };
const COUNT = () => window.__p785.t.length;

/* 고정 시간 홀드 — 수리 «전» 의 자를 그대로 옮겨 적은 사본(A/B 의 A 쪽) */
async function holdFixed(cdp, page, c, ms) {
  const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await new Promise(r => setTimeout(r, 80));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  await st.catch(() => {});
  await page.waitForTimeout(250);
  return (await ev(page, COUNT)) || 0;
}

const ivs = ts => { const out = []; for (let i = 1; i < ts.length; i++) out.push(+(ts[i] - ts[i - 1]).toFixed(1)); return out; };

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  const cdp = await p.context().newCDPSession(p);
  const throttle = async r => cdp.send('Emulation.setCPUThrottlingRate', { rate: r }).catch(() => {});

  const armed = await ev(p, WATCH);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  const c = await ev(p, () => { const b = document.getElementById('rwBasin').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });

  blk('1] 눈금 — 이 러너의 홀드 틱 속도 (제품 설계 = TR_HOLD_DELAY 350ms 뒤 160→60ms 가속 = 6~16회/초)');
  ok(armed === true && !!c, '0 관찰자·누를 자리가 섰다');
  await ev(p, RESET);
  const nBase = await holdFixed(cdp, p, c, FIXED);
  const tBase = (await ev(p, () => window.__p785.t)) || [];
  const ivBase = ivs(tBase);
  const rateBase = +(nBase / (FIXED / 1000)).toFixed(2);
  info('무던한 조건 · 고정 ' + FIXED + 'ms', nBase + '회 = ' + rateBase + '회/초');
  info('틱 간격(ms)', ivBase.length ? ivBase.join(', ') : '표본 부족');
  const design = ivBase.length ? Math.min(...ivBase) : 0;
  info('가장 짧은 틱 간격', design ? design + 'ms (설계 최소 60ms)' : 'n/a');

  blk('2] 재현 — **느린 기계**(CPU ×' + SLOW + ')에서 «고정 시간» 자는 표본이 굶는다');
  await throttle(SLOW);
  await p.waitForTimeout(300);
  const fixedRuns = [];
  for (let i = 0; i < 3; i++) { await ev(p, RESET); fixedRuns.push(await holdFixed(cdp, p, c, FIXED)); }
  const worst = Math.min(...fixedRuns);
  info('고정 ' + FIXED + 'ms × 3회', fixedRuns.join(' · ') + '회 (문턱 ' + NEED + ')');
  ok(worst < NEED,
     '2-a ★ 고정 시간 자가 문턱 ' + NEED + ' 을 못 채운다 — [B2] 가 «제품» 이 아니라 **기계 속도**에 걸려 빨개진다',
     '최악 ' + worst + '회 / ' + NEED);
  /* ⚠ «6000ms 로 늘리면 되지 않나» 에 답해 둔다 — 늘린 값도 같은 축이다(753 이 민 자리). */
  await ev(p, RESET);
  const n6000 = await holdFixed(cdp, p, c, 6000);
  info('753 이 민 값 · 고정 6000ms', n6000 + '회 (문턱 ' + NEED + ')');
  ok(true, '2-b 관측 — 시간을 늘리는 길은 **같은 축을 한 칸 미는 것**이다(기계가 더 느려지면 다시 빨개진다)',
     '6000ms → ' + n6000 + '회');

  blk('3] 수리 — 같은 느린 기계에서 `holdUntil` 은 **같은 표본을 실제로 얻는다**');
  const waitRuns = [];
  for (let i = 0; i < 3; i++) {
    await ev(p, RESET);
    const Hh = await holdUntil(p, { at: c, need: NEED, count: COUNT, maxMs: 30000, mode: 'touch', cdp });
    waitRuns.push(Hh);
    info('실행 #' + (i + 1), Hh.note);
  }
  ok(waitRuns.every(h => h.n >= NEED),
     '3-a ★ 세 실행 전부 문턱 ' + NEED + ' 을 채운다 — 문턱이 기계 속도에서 떨어졌다',
     waitRuns.map(h => h.n + '회/' + h.ms + 'ms').join(' · '));
  ok(waitRuns.every(h => h.reached),
     '3-b 상한에 걸려 끊긴 실행 0 — 기다림이 실제로 표본을 받아냈다',
     waitRuns.filter(h => !h.reached).length + '건 끊김');

  blk('4] 되돌림 — 상한은 살아 있다 · 빠른 기계에서는 일찍 뗀다');
  await ev(p, RESET);
  const cap = await holdUntil(p, { at: c, need: 9999, count: COUNT, maxMs: 4000, mode: 'touch', cdp });
  ok(!cap.reached && cap.ms >= 3500 && cap.ms < 8000,
     '4-a ★ 도달 불가한 표본을 시키면 **상한에서 끊고** `reached=false` 로 알린다(무한정 안 누른다)',
     cap.note);
  await throttle(1);
  await p.waitForTimeout(300);
  await ev(p, RESET);
  const fast = await holdUntil(p, { at: c, need: NEED, count: COUNT, maxMs: 30000, mode: 'touch', cdp });
  ok(fast.reached && fast.ms < 30000,
     '4-b 빠른 기계에서는 상한을 다 안 쓰고 표본이 차는 즉시 뗀다', fast.note);
  ok(fast.ms < waitRuns[0].ms,
     '4-c ★ 같은 문턱인데 **누른 시간이 기계 속도를 따라간다** — 이것이 «문턱을 시간에서 떼어냈다» 의 뜻',
     '빠른 ' + fast.ms + 'ms ↔ 느린(×' + SLOW + ') ' + waitRuns[0].ms + 'ms');

  ok(errs.length === 0, '5 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nPROBE785 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
