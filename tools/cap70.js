/* 작업 70 — 출석 보상 팝업 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: 메인 좌측 사이드 1행 📅 (data-pop="attend").
   실행: node tools/cap70.js [출력경로] [--geo] [--day N]
     --geo    주요 요소의 프레임 좌표를 JSON + ref 환산(y+84) 표로 찍는다.
     --day N  «오늘» 이 N일차가 되도록 S.att.n 을 주입한다(기본 3 → 4일차가 오늘).
   LESSONS 28-③ — 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨기고 평탄한 중간톤을 깐다.
   playwright 번들 브라우저가 없으면 /opt/pw-browsers/chromium 으로 떨어진다(smoke.js 와 같은 처방). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/70-r1.png';
const GEO = args.includes('--geo');
const di = args.indexOf('--day');
const DAY = di >= 0 ? Number(args[di + 1]) : 3;      /* S.att.n — «오늘» 은 DAY+1 일차 */

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await chromium.launch(o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 상태 주입 — 1~DAY 일차는 «수령 완료», DAY+1 일차가 «오늘(수령 가능)», 그 뒤는 «미래» */
  await p.evaluate((d) => { S.att.n = d; S.att.date = ''; }, DAY);

  /* 위임 핸들러를 타야 하므로 query 와 click 을 같은 태스크 안에서(LESSONS 50-①) */
  await p.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });
  await p.waitForTimeout(480);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', '#app'); R('mbox', '.mbox'); R('mhead', '.mhead'); R('mbody', '#mbox');
    R('grid', '.at-g'); R('week', '.at-wk'); R('btn', '.at-btn'); R('close', '.at-close');
    const cs = document.querySelectorAll('.at-c');
    g.cardCount = cs.length;
    cs.forEach((_, i) => {
      R('c' + (i + 1), `.at-c:nth-of-type(${i + 1})`);
      R('c' + (i + 1) + 'b', `.at-c:nth-of-type(${i + 1}) .at-bd`);
      R('c' + (i + 1) + 'f', `.at-c:nth-of-type(${i + 1}) .at-if`);
      R('c' + (i + 1) + 'v', `.at-c:nth-of-type(${i + 1}) .at-v`);
    });
    R('d7', '.at-c7'); R('d7b', '.at-c7 .at-bd');
    ['1', '2', '3'].forEach((n, i) => R('d7f' + n, `.at-c7 .at-if:nth-of-type(${i + 1})`));
    R('crown', '.at-cr');
    return g;
  });

  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    console.log('-- ref 환산(y+84) --');
    for (const [k, v] of Object.entries(geo))
      if (v && v.w !== undefined) console.log(`  ${k}\tref x${v.x} y${(v.y + 84).toFixed(1)}  ${v.w}x${v.h}`);
  }

  /* 재현성 — 전투 캔버스를 숨기고 평탄한 중간톤을 깐다(52 와 같은 처방) */
  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.getElementById('stagearea'); if (st) st.style.background = '#6A3844';
  });
  await p.waitForTimeout(60);

  await p.screenshot({ path: path.resolve(__dirname, '..', out) });
  console.log('capture →', out, '| console errors:', errs.length);
  if (errs.length) errs.slice(0, 8).forEach((e) => console.log('  ERR', e));
  await b.close();
})();
