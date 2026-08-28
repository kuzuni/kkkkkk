/* 355 — `verify64` §3 «300ms 유지 → 1회 (350ms 전에는 반복 없음)» 가 왜 간헐적으로 빨간가.
   등재문의 가설: 하네스가 «눌러 둔 시간» 을 `waitForTimeout(300)` 이라는 **벽시계**로 재는데
   머신이 밀리면 실제 접촉이 `TR_HOLD_DELAY`(350ms) 임계를 넘겨 반복이 한 번 더 돌아 Δ2 가 된다
   = 제품이 아니라 하네스의 자가 타이밍 경합.

   338·341 규칙대로 **처방을 따르기 전에 재현**한다. 페이지가 스스로 찍은 시각으로
     ⓐ 실제 접촉 구간(pointerdown → pointerup)
     ⓑ `trainBuy` 가 성공한 시각(접촉 시작 기준 상대 ms)
   을 잡아, «Δ2 가 나온 실행은 예외 없이 접촉이 350ms 를 넘긴 실행인가» 를 본다.
   넘긴 실행에서 Δ2 라면 그것은 **제품이 규약대로 동작한 것**이고 빨간 것은 자다.

   실행: node tools/probe355.js [반복수] [--load]
     --load : `node -e 'while(1);'` 를 코어 수만큼 띄워 머신을 밀어 놓고 잰다(재현용).
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const REP = +(process.argv[2] || 12);
const LOAD = process.argv.includes('--load');
const CARD = '#trw [data-tr="atk"]';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  — ' + detail : '')); }
};

/* verify64 의 reset 과 같은 결정적 초기 상태 */
async function reset(page) {
  const wasOpen = await page.evaluate(() => {
    step = () => {};
    S.autoBuy = false; S.trainStage = 1;
    S.lv.atk = 0; S.lv.hp = 0; S.lv.regen = 0;
    S.gold = 1e12; S.buyQty = 1;
    save();
    const w = $('trw').classList.contains('on');
    if (!w) openTrain(); else renderTrain();
    return w;
  });
  await page.waitForTimeout(wasOpen ? 60 : 420);
}

/* 페이지가 직접 찍는다 — 왕복 지연이 섞이지 않는다 */
async function armProbe(page) {
  await page.evaluate(() => {
    window.__d = 0; window.__u = 0; window.__b = [];
    if (!window.__orig) window.__orig = trainBuy;
    trainBuy = function (id) { const r = window.__orig(id); if (r) window.__b.push(performance.now()); return r; };
    window.__fd = () => { window.__d = performance.now(); };
    window.__fu = () => { window.__u = performance.now(); };
    addEventListener('pointerdown', window.__fd, true);
    addEventListener('pointerup', window.__fu, true);
  });
}
async function readProbe(page) {
  return page.evaluate(() => {
    removeEventListener('pointerdown', window.__fd, true);
    removeEventListener('pointerup', window.__fu, true);
    trainBuy = window.__orig;
    return { hold: window.__u - window.__d, t: window.__b.map(v => v - window.__d), lv: S.lv.atk | 0 };
  });
}

async function run(page, ms) {
  await reset(page);
  await armProbe(page);
  const p = await page.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, CARD);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(400);
  return readProbe(page);
}

(async () => {
  const hogs = [];
  if (LOAD) {
    for (let i = 0; i < Math.max(2, os.cpus().length); i++)
      hogs.push(spawn(process.execPath, ['-e', 'const t=Date.now();while(Date.now()-t<120000);'], { stdio: 'ignore' }));
    console.log('부하 ' + hogs.length + '개 띄움');
  }
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);
  const THR = await page.evaluate(() => TR_HOLD_DELAY);
  console.log('TR_HOLD_DELAY = ' + THR + 'ms · 반복 ' + REP + '회' + (LOAD ? ' (부하)' : ''));

  /* ── ⓐ 옛 판정(«waitForTimeout(300) 뒤 Δ==1») 을 그대로 재현한다 ── */
  const rows = [];
  for (let i = 0; i < REP; i++) rows.push(await run(page, 300));
  rows.forEach((r, i) => console.log('  #' + String(i + 1).padStart(2) + '  접촉 ' + r.hold.toFixed(1).padStart(6) +
    'ms · Δ' + r.lv + ' · 구매 t=[' + r.t.map(v => v.toFixed(0)).join(', ') + ']'));

  const over = rows.filter(r => r.hold > THR);
  const d2 = rows.filter(r => r.lv !== 1);
  console.log('  접촉이 임계(' + THR + 'ms)를 넘긴 실행 ' + over.length + '/' + rows.length +
    ' · 옛 단언이 빨개지는 실행 ' + d2.length + '/' + rows.length);

  ok('«눌러 둔 시간» 은 요청값(300ms)이 아니다 — 실측 최댓값이 300 을 넘는다',
    Math.max.apply(null, rows.map(r => r.hold)) > 300,
    '최소 ' + Math.min.apply(null, rows.map(r => r.hold)).toFixed(0) + 'ms · 최대 ' + Math.max.apply(null, rows.map(r => r.hold)).toFixed(0) + 'ms');
  ok('Δ2 인 실행은 예외 없이 접촉이 임계를 넘긴 실행이다 (= 제품은 규약대로다)',
    d2.every(r => r.hold > THR), d2.length ? d2.map(r => 'Δ' + r.lv + '@' + r.hold.toFixed(0) + 'ms').join(' · ') : 'Δ2 실행 0건');
  ok('임계 전에 반복이 돈 실행 0건 (제품 무결 — 이것이 §3 이 정말 재려던 것이다)',
    rows.every(r => r.t.filter(v => v < THR - 5).length === 1),
    rows.map(r => r.t.filter(v => v < THR - 5).length).join(''));
  ok('반복이 있었다면 첫 반복은 임계 직후다',
    rows.every(r => r.t.length < 2 || (r.t[1] >= THR - 5 && r.t[1] <= THR + 200)),
    rows.filter(r => r.t.length > 1).map(r => r.t[1].toFixed(0)).join(' · ') || '반복 0건');
  ok('뗀 뒤 구매 0 (pointerup 즉시 정지)',
    rows.every(r => r.t.every(v => v <= r.hold + 30)));

  /* ── ⓑ 되돌림 시험 — 임계를 100ms 로 낮추면 «임계 전 반복 없음» 이 빨개져야 한다 ── */
  await reset(page);
  await page.evaluate(() => {
    window.__origStart = trHoldStart;
    trHoldStart = function (key, card) { window.__origStart(key, card); if (trHold) { clearTimeout(trHold.timer); trHold.timer = setTimeout(trHoldTick, 100); } };
  });
  const bad = await run(page, 300);
  await page.evaluate(() => { trHoldStart = window.__origStart; });
  console.log('  되돌림(임계 100ms): 접촉 ' + bad.hold.toFixed(0) + 'ms · 구매 t=[' + bad.t.map(v => v.toFixed(0)).join(', ') + ']');
  ok('되돌림 시험 — 임계를 100ms 로 낮추면 «임계 전 구매 1회» 가 깨진다',
    bad.t.filter(v => v < THR - 5).length > 1, bad.t.filter(v => v < THR - 5).length + '회');

  /* 원복 확인 */
  const back = await run(page, 300);
  ok('되돌림 원복 후 다시 «임계 전 1회»', back.t.filter(v => v < THR - 5).length === 1);

  await browser.close();
  hogs.forEach(h => h.kill('SIGKILL'));
  console.log('\nPROBE355 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
