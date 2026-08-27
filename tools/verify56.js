/* 작업 56 — 절전 모드 «실동작» 게이트.
   레이아웃이 아니라 «절전이 실제로 절전인가 / 전투는 계속 도는가 / 해제가 되는가» 만 본다.
   실행: node tools/verify56.js   → 마지막 줄이 `VERIFY56 PASS n/n` 이어야 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const R = [];
const ok = (n, c, d) => { R.push({ n, c }); console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? '  — ' + d : '')); };

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);

  /* 캔버스 드로우 콜을 센다 — «렌더 최소화» 를 말이 아니라 숫자로 본다 */
  await p.evaluate(() => {
    window.__dc = 0;
    const proto = CanvasRenderingContext2D.prototype, of = proto.fillRect;
    proto.fillRect = function(){ window.__dc++; return of.apply(this, arguments); };
  });

  const open = () => p.evaluate(() => {
    document.getElementById('menub').click();
    document.querySelector('#mnw [data-mn="saver"]').click();
  });
  const st = () => p.evaluate(() => ({
    on: document.getElementById('svw').classList.contains('on'),
    cls: document.getElementById('app').classList.contains('sv'),
    saver: typeof saverOn !== 'undefined' ? saverOn : null,
    topVis: getComputedStyle(document.getElementById('top')).visibility,
    tabVis: getComputedStyle(document.getElementById('tabbar')).visibility,
    clk: document.getElementById('svClk').textContent,
    dt: document.getElementById('svDt').textContent,
    stg: document.getElementById('svSt').textContent,
    t: document.getElementById('svT').textContent,
    k: document.getElementById('svK').textContent,
    g: document.getElementById('svG').textContent,
    bat: document.getElementById('svBat').textContent,
    batShown: getComputedStyle(document.querySelector('#svw .sv-bat')).display !== 'none',
    play: S.playtime, kills: S.totalKills, gold: S.gold, dc: window.__dc,
    el: Math.floor((performance.now() - svT0)/1000),
  }));

  /* ---------- 1. 진입 ---------- */
  console.log('[1] ▦ 메뉴 → 🔋 절전 진입');
  const before = await st();
  await open();
  await p.waitForTimeout(400);
  let a = await st();
  ok('#svw 가 열린다', a.on && a.saver === true, 'svw.on=' + a.on + ' saverOn=' + a.saver);
  ok('#app.sv 상태 클래스', a.cls);
  ok('하위 레이어가 실제로 가려진다(HUD·탭바 visibility:hidden)',
    a.topVis === 'hidden' && a.tabVis === 'hidden', 'top=' + a.topVis + ' tabbar=' + a.tabVis);
  ok('메뉴가 닫힌 채로 진입', !(await p.evaluate(() => document.getElementById('mnw').classList.contains('on'))));

  /* ---------- 2. 렌더는 멈추고 전투 로직은 돈다 ---------- */
  console.log('[2] 렌더 정지 · 전투 로직 지속');
  const s0 = await st();
  await p.waitForTimeout(1500);
  const s1 = await st();
  ok('절전 중 캔버스 드로우가 멈춘다', s1.dc - s0.dc === 0, `1.5초 동안 fillRect ${s1.dc - s0.dc}회`);
  ok('절전 중에도 전투 로직(playtime)은 흐른다', s1.play - s0.play > 0.8,
    `Δplaytime ${(s1.play - s0.play).toFixed(2)}s`);
  ok('방치 시간이 라이브로 올라간다', s1.t !== s0.t, `${s0.t} → ${s1.t} (실경과 ${s1.el}s)`);
  ok('시계·날짜가 실제 값이다', /^\d\d:\d\d$/.test(s1.clk) && /^\d{4}\/\d\d\/\d\d$/.test(s1.dt),
    s1.clk + ' / ' + s1.dt);
  ok('STAGE 표기가 S.stage 와 같다',
    s1.stg === 'STAGE ' + (await p.evaluate(() => S.stage)), s1.stg);
  ok('배터리 배지는 실제 잔량(없으면 숨김)',
    !s1.batShown || /^\d{1,3}%$/.test(s1.bat), 'shown=' + s1.batShown + ' ' + s1.bat);

  /* ---------- 3. 패널 3행이 «진입 이후 증분» 이다 ---------- */
  console.log('[3] 방치 요약 3행 = 진입 이후 증분');
  /* 자동 플레이가 도는 중이라 절대값이 아니라 «주입 전후 차이» 로 본다(LESSONS 51-③) */
  const inc = await p.evaluate(() => {
    renderSaver();
    const b = +document.getElementById('svK').textContent;
    S.totalKills += 7; S.gold += 12345; renderSaver();
    return { d: +document.getElementById('svK').textContent - b,
             g: document.getElementById('svG').textContent };
  });
  ok('처치 수가 증분으로 오른다', inc.d >= 7, '처치 +7 → 표시 Δ' + inc.d);
  ok('골드가 «+» 접두사 증분으로 오른다', inc.g.startsWith('+') && inc.g !== '+0', '골드 +12345 → ' + inc.g);

  /* ---------- 4. 해제 ---------- */
  console.log('[4] 해제 제스처');
  await p.mouse.move(540, 1800); await p.mouse.down(); await p.mouse.move(540, 1770); await p.mouse.up();
  await p.waitForTimeout(250);
  let a2 = await st();
  ok('짧은 드래그(30px)로는 안 풀린다', a2.saver === true);

  await p.mouse.move(540, 1800); await p.mouse.down(); await p.mouse.move(540, 1600, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(300);
  a2 = await st();
  ok('200px 스와이프로 해제된다', a2.saver === false && !a2.on);
  ok('해제 후 HUD·탭바가 돌아온다', a2.topVis === 'visible' && a2.tabVis === 'visible',
    'top=' + a2.topVis + ' tabbar=' + a2.tabVis);
  const d0 = (await st()).dc;
  await p.waitForTimeout(600);
  ok('해제 후 캔버스 렌더가 재개된다', (await st()).dc - d0 > 5, `0.6초 동안 fillRect ${(await st()).dc - d0}회`);

  /* ---------- 5. 탭 해제 (UI-REFERENCE «터치로 해제») ---------- */
  console.log('[5] 탭 1회 해제 · 재진입');
  await open();
  await p.waitForTimeout(350);
  ok('재진입된다', (await st()).saver === true);
  const t0 = await p.evaluate(() => document.getElementById('svT').textContent);
  ok('재진입 시 방치 시간이 0 부터 다시 센다', t0 === '00:00:00', t0);
  await p.mouse.click(540, 900);
  await p.waitForTimeout(250);
  ok('탭 1회로 해제된다', (await st()).saver === false);

  /* ---------- 6. 콘솔 ---------- */
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

  const pass = R.filter((r) => r.c).length;
  console.log(`\nVERIFY56 ${pass === R.length ? 'PASS' : 'FAIL'} ${pass}/${R.length}`);
  await ctx.close();
  await b.close();
  if (pass !== R.length) process.exit(1);
})();
