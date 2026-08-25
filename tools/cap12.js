/* 작업 84 — 12 소환 결과 팝업 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: S.dia 를 충분히 준 뒤 doSummon('weapon', 10) 직접 호출.
   실행: node tools/cap12.js [출력경로] [--geo]
   LESSONS 28-③ — 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨긴다.
   LESSONS 51-③ — 유휴 루프가 굴리는 값은 픽셀 회귀에서 빼야 하므로 루프를 멈춘다. */
const { chromium } = require('playwright');
const path = require('path');

const out = process.argv[2] || 'docs/review/12-84-r1.png';
const GEO = process.argv.includes('--geo');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 결과 팝업을 띄운다 — 73 가이드 소환 미션(`gmBlocked`)이 초반 세이브에서 doSummon 을 막으므로
     소환 결과 자체를 만들어 showSummonResult 로 직접 연다(12 의 레이아웃은 호출 경로와 무관하다). */
  await p.evaluate(() => {
    S.dia = 1e9;
    const res = [];
    for (let i = 0; i < 10; i++) res.push(summonOne('weapon'));
    showSummonResult('weapon', 10, res, false);
  });
  /* 58 카드 팝(fx-pop)·버스트가 끝날 때까지 — 12 는 등장 애니메이션이 카드에만 걸린다 */
  await p.waitForTimeout(1400);

  /* 정지 캡처: 유휴 루프·전투 캔버스 정지(LESSONS 28-③·51-③) */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('.fx-pop').forEach((e) => { e.style.animation = 'none'; });
  });
  await p.waitForTimeout(120);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = { frameH: +A.height.toFixed(1) };
    const R = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = {
        x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        bot: +(A.bottom - r.bottom).toFixed(1)      /* 프레임 하단에서의 거리(하단 앵커 검산용) */
      };
    };
    R('panel', '.sm-panel'); R('rb', '.sm-rb'); R('band', '.sm-band');
    R('btns', '.sm-btns'); R('b1', '.sm-b1'); R('b2', '.sm-b2'); R('b3', '.sm-b3');
    R('close', '.sm-close'); R('closeI', '.sm-close i');
    return g;
  });

  await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', out) });
  if (GEO) console.log(JSON.stringify(geo, null, 1));
  console.log('errs=' + errs.length + (errs.length ? ' :: ' + errs.slice(0, 5).join(' | ') : ''));
  console.log('saved ' + out);
  await b.close();
})();
