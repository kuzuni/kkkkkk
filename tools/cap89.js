/* 작업 89 — 유물 소환 페이지(#relw) 캡처 + 기하 덤프.
   기준 화면비 9:19(1080×2280). 레퍼런스 docs/ref/89-유물-팝업.png 는 팝업 패널만 잘린
   1080×1527 크롭(측정표 §서두)이라, 기본 출력은 .rw-panel 영역(y370~1897)을 같은 크기로
   잘라 «가로 1:1 · ref y = cap y» 로 바로 대조할 수 있게 한다.
   실행: node tools/cap89.js [출력경로] [--full] [--geo]
     --full  1080×2280 전체 프레임을 그대로 저장(기본은 패널 크롭 1080×1527)
     --geo   주요 요소의 패널 좌표(JSON)를 찍는다
   상태 주입: 유물 10종 전부 보유(레퍼런스처럼 전 칸 점등) + 비용 표기는 ref 값 822 로 고정.
   playwright 번들 브라우저가 없으면 /opt/pw-browsers/chromium 으로 떨어진다(smoke.js 처방). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/cap89.png';
const FULL = args.includes('--full');
const GEO = args.includes('--geo');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

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
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    /* 레퍼런스 상태: 10칸 전부 보유·점등, Lv 두 자리 포함 */
    RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11,10,13,9,10,12,10,11,9,10][i] }; });
    S.relic = 99999;
    document.querySelector('#tabbar [data-t="box"]').click();
  });
  await p.waitForTimeout(400);
  /* 레이아웃 대조용 — 비용 «잉크» 를 ref 와 같은 822 로 (자릿수 차이가 ③ 판정을 오염시키지 않게) */
  await p.evaluate(() => { document.querySelector('#rwCost b').textContent = '822'; });
  await p.waitForTimeout(120);

  if (GEO) {
    const geo = await p.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const P = document.querySelector('.rw-panel').getBoundingClientRect();
      const g = { panelAbs: { x: P.left - A.left, y: P.top - A.top, w: P.width, h: P.height } };
      const R = (k, sel) => {
        const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
        const r = e.getBoundingClientRect();
        g[k] = { x: +(r.left - P.left).toFixed(1), y: +(r.top - P.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      };
      ['basin', 'stone', 'cost', 'cap'].forEach((k, i) => R(k, ['.rw-basin', '.rw-stone', '.rw-cost', '.rw-cap'][i]));
      document.querySelectorAll('.rw-c').forEach((e, i) => {
        const r = e.getBoundingClientRect();
        g['c' + (i + 1)] = { x: +(r.left - P.left).toFixed(1), y: +(r.top - P.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      });
      return g;
    });
    console.log(JSON.stringify(geo, null, 1));
  }

  const clip = FULL ? undefined : { x: 0, y: 370, width: 1080, height: 1527 };
  await p.screenshot({ path: out, clip });
  console.log('saved ' + out + (FULL ? ' (1080x2280 full)' : ' (1080x1527 panel crop, frame y370~1897)'));
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log('  ' + e)); process.exitCode = 1; }
  else console.log('console errors: 0');
  await b.close();
})();
