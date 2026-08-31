/* 작업 603 — 재현(338 규칙: 처방 전에 «흔들림의 폭» 부터 찍는다).
 *
 * 잡은 것: `tools/verify592.js` [6c] «창이 끝날 때 표시값이 실제 보유량을 따라잡았다» 가
 *          실행마다 흔들린다(한 번은 「남은 차이 1.184686」 로 빨갛고 같은 트리에서 재실행하면 초록).
 *
 * 등재문의 1순위 가설:
 *   ⓐ 「창 길이·롤링 계단 수가 헤드리스 부하에 따라 한 프레임 모자란다」 = 프레임 예산 문제.
 * 이 자가 갈라 보려는 다른 갈래:
 *   ⓑ 창이 짧아서가 아니라 **창이 끝나는 그 순간 근처에 수입이 한 번 더 들어와서**다.
 *      롤링은 `FXROLL = 0.32s` 짜리 고정 트윈이고 **목표가 바뀔 때마다 처음부터 다시 시작**한다
 *      (`if(!R || R.to !== t){ fxRoll[k] = {from:fxDisp[k], to:t, s:now}; }`).
 *      씬은 `S.bossFarm = true` 로 새 보스전만 막고 **주변 자동 전투는 그대로 돈다** —
 *      그 킬이 마지막 320ms 안에 한 번 떨어지면 마지막 프레임의 표시값은 «아직 구르는 중» 이 맞다.
 *      즉 빨간 것은 제품도 창 길이도 아니라 **«한 순간을 찍어 보는» 축 자체**다.
 *
 * 재는 것 — KILLS 씬을 R 회 반복하며 매 회:
 *   [1] endLag            — 현행 [6c] 가 보는 값(마지막 프레임의 S.gold − fxDisp.gold)
 *   [2] sinceLastGain     — 마지막 프레임 기준 «마지막 수입» 이 몇 ms 전이었나
 *   [3] tailGains         — 꼬리 90프레임 동안 수입이 몇 번 들어왔나 / 마지막 320ms 안에 몇 번
 *   [4] frameMs           — 프레임 길이 중앙값·최대(ⓐ «헤드리스 부하» 가설의 자)
 *   [5] maxStaleMs        — «수입이 끊긴 뒤에도 못 따라잡고 있는 시간» 의 최대치
 *                           (= 제품이 정말 안 따라잡으면 커지는 값. ⓑ 가 맞다면 롤 길이 안에 머문다)
 *   [6] converged         — 꼬리 동안 «따라잡은» 프레임이 한 번이라도 있었나(축이 헛되지 않다는 증거)
 *
 * 실행: node tools/probe603.js [--runs 12]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const RUNS = (() => { const i = process.argv.indexOf('--runs'); return i > 0 ? +process.argv[i + 1] : 12; })();

/* verify592 의 KILLS 씬과 **같은 절차**로 굴린다(다른 씬을 재면 다른 것을 재게 된다).
   더한 것은 계측뿐 — 프레임마다 수입 시각·표시 지연·프레임 길이를 적는다. */
const SCENE = `async ({ n }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  S.bossFarm = true;
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  await new Promise(r => setTimeout(r, 900));
  document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n2 => n2.remove());
  fxTapEl = null;

  const g0 = S.gold;
  let killed2 = 0;
  let prevGold = S.gold, tLastGain = performance.now(), tPrev = performance.now();
  const fms = [];                       /* 프레임 길이 */
  let tailGains = 0, maxStale = 0, converged = 0, frames = 0;
  const trace = [];                     /* 꼬리 마지막 12프레임 — 「한 프레임 모자란가」 를 눈으로 본다 */

  for (let i = 0; i < 40 && killed2 < n; i++) {
    if (enemies.length < 3) queueMobs();
    for (let j = 0; j < 4 && killed2 < n && enemies.length; j++) { killEnemy(enemies[0]); killed2++; }
    await raf();
    const now = performance.now();
    if (S.gold > prevGold + 1e-9) { tLastGain = now; prevGold = S.gold; }
    tPrev = now;
  }
  const tTailStart = performance.now();
  for (let i = 0; i < 90; i++) {
    await raf(); frames++;
    const now = performance.now();
    const fm = now - tPrev; fms.push(fm); tPrev = now;
    if (S.gold > prevGold + 1e-9) { tailGains++; tLastGain = now; prevGold = S.gold; }
    const lag = S.gold - fxDisp.gold;
    const stale = now - tLastGain;      /* 마지막 수입으로부터 흐른 시간 */
    if (lag > 1e-9) maxStale = Math.max(maxStale, stale); else converged++;
    if (i >= 78) trace.push({ i, lag: +lag.toFixed(6), stale: Math.round(stale), fm: Math.round(fm) });
  }
  const now = performance.now();
  const ms = fms.slice().sort((a,b) => a-b);
  return {
    endLag: +Math.max(0, S.gold - fxDisp.gold).toFixed(6),
    sinceLastGain: Math.round(now - tLastGain),
    tailGains, maxStaleMs: Math.round(maxStale), convergedFrames: converged, frames,
    tailMs: Math.round(now - tTailStart),
    frameMed: +ms[Math.floor(ms.length/2)].toFixed(1), frameMax: +ms[ms.length-1].toFixed(1),
    gold: +(S.gold - g0).toFixed(3), rollDur: FXROLL * 1000,
    trace
  };
}`;

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  return { ctx, p };
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  console.log('\n=== probe603 — verify592 [6c] 흔들림의 폭 (runs=' + RUNS + ') ===');
  const b = await launch(chromium);
  const rows = [];
  for (let r = 0; r < RUNS; r++) {
    const s = await boot(b);
    const v = await s.p.evaluate(eval('(' + SCENE + ')'), { n: 20 });
    await s.ctx.close();
    rows.push(v);
    console.log('  #' + String(r + 1).padStart(2) + ' endLag=' + String(v.endLag).padEnd(10)
      + ' sinceLastGain=' + String(v.sinceLastGain).padStart(5) + 'ms'
      + ' tailGains=' + String(v.tailGains).padStart(2)
      + ' maxStale=' + String(v.maxStaleMs).padStart(4) + 'ms'
      + ' conv=' + String(v.convergedFrames).padStart(2) + '/' + v.frames
      + ' frame(med/max)=' + v.frameMed + '/' + v.frameMax + 'ms'
      + ' tail=' + v.tailMs + 'ms');
  }
  await b.close();

  const red = rows.filter(v => v.endLag !== 0);
  const roll = rows[0].rollDur;
  console.log('\n--- 요약 ---');
  console.log('  롤 길이(FXROLL) = ' + roll + 'ms · 꼬리 창 = ' + Math.round(rows.reduce((a, v) => a + v.tailMs, 0) / rows.length) + 'ms(평균)');
  console.log('  [6c] 빨강 ' + red.length + '/' + rows.length + ' — endLag ' + JSON.stringify(rows.map(v => v.endLag)));
  console.log('  마지막 수입으로부터 ' + JSON.stringify(rows.map(v => v.sinceLastGain)) + ' ms');
  console.log('  수입이 끊긴 뒤 못 따라잡은 최대 시간 = ' + JSON.stringify(rows.map(v => v.maxStaleMs)) + ' ms');
  if (red.length) console.log('  빨간 회차의 마지막 프레임들: ' + JSON.stringify(red[0].trace));

  /* ── 판정 — 두 가설을 가른다 ─────────────────────────────────────────── */
  ok(rows.every(v => v.tailMs > roll * 2),
     '[1] 꼬리 창은 롤 길이의 2배가 넘는다(= «창이 짧아서» 가 아니다) — 창 '
     + Math.min(...rows.map(v => v.tailMs)) + '~' + Math.max(...rows.map(v => v.tailMs)) + 'ms vs 롤 ' + roll + 'ms');
  ok(rows.every(v => v.maxStaleMs <= roll + Math.max(60, v.frameMax * 2)),
     '[2] 수입이 끊긴 뒤에는 **언제나** 롤 길이 안에 따라잡는다(제품은 안 멈춰 있다) — 최대 '
     + Math.max(...rows.map(v => v.maxStaleMs)) + 'ms (허용 ' + roll + '+2프레임)');
  ok(red.length === 0 || red.every(v => v.sinceLastGain < roll),
     '[3] 빨간 회차는 **예외 없이** 「마지막 수입이 롤 길이 안에 들어온」 회차다 — '
     + (red.length ? JSON.stringify(red.map(v => v.sinceLastGain)) + 'ms < ' + roll : '이번엔 빨간 회차가 안 나왔다(관측만)'));
  ok(rows.every(v => v.convergedFrames > 0),
     '[4] 꼬리 동안 «따라잡은» 프레임이 회차마다 있다(축이 헛되지 않다) — 최소 '
     + Math.min(...rows.map(v => v.convergedFrames)) + '프레임');
  ok(rows.every(v => v.tailGains > 0),
     '[5] 꼬리 창에도 주변 자동 전투 수입이 계속 들어온다(= 「한 순간을 찍는」 축이 흔들리는 뿌리) — 회차별 '
     + JSON.stringify(rows.map(v => v.tailGains)) + '회');

  console.log('\nPROBE603 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
