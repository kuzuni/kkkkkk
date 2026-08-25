/* 작업 56 — 절전 모드 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: ▦ 메뉴 → 🔋 절전.
   실행: node tools/cap56.js [출력경로] [--geo]
     --geo  주요 요소의 프레임 좌표를 JSON + ref 환산(y+84) 으로 찍는다.
   LESSONS 30-② — 「STAGE N」 토스트 같은 시간 의존 상태가 캡처마다 다르게 찍히면
   회차마다 다른 화면을 채점하게 된다. 캡처 직전에 msgT 를 0 으로 눕힌다.
   playwright 번들 브라우저가 없으면 /opt/pw-browsers/chromium 으로 떨어진다(smoke.js 와 같은 처방). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/56-r1.png';
const GEO = args.includes('--geo');

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
  await p.waitForTimeout(1000);

  /* 위임 핸들러를 타야 하므로 query 와 click 을 같은 태스크 안에서(LESSONS 50-①) */
  await p.evaluate(() => { document.getElementById('menub').click(); });
  await p.waitForTimeout(320);
  await p.evaluate(() => { document.querySelector('#mnw [data-mn="saver"]').click(); });
  await p.waitForTimeout(600);

  /* 레퍼런스와 «같은 상태» 를 만든다 — ref 는 STAGE 80 · 방치 00:00:02 · 처치 0 · 골드 +0 의
     «절전 진입 직후» 스냅샷이다. 자동 플레이가 도는 중이라 그냥 두면 회차마다 값이 달라져
     같은 화면을 채점할 수 없다(LESSONS 04-① · 30-②). 값만 눕히고 레이아웃은 손대지 않는다. */
  await p.evaluate(() => {
    S.stage = 80;
    svK0 = S.totalKills; svG0 = S.gold; svT0 = performance.now() - 2000;
    renderSaver();
  });
  await p.waitForTimeout(200);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', '#app');
    R('sv', '#svw'); R('bat', '#svw .sv-bat'); R('batBody', '#svw .sv-bat>s');
    R('clk', '#svw .sv-clk'); R('dt', '#svw .sv-dt');
    R('st', '#svw .sv-st'); R('skull', '#svw .sv-st>s'); R('stTx', '#svw .sv-st>i');
    R('panel', '#svw .sv-p');
    for (let i = 1; i <= 3; i++) {
      R('r' + i, `#svw .sv-r:nth-of-type(${i})`);
      R('r' + i + 'i', `#svw .sv-r:nth-of-type(${i})>u`);
      R('r' + i + 'l', `#svw .sv-r:nth-of-type(${i})>i`);
      R('r' + i + 'v', `#svw .sv-r:nth-of-type(${i})>b`);
    }
    R('hint', '#svw .sv-hint');
    R('top', '#top'); R('tabbar', '#tabbar'); R('sideL', '#sideL'); R('slots', '#slots');
    R('battlefoot', '#battlefoot'); R('tuto', '#tuto'); R('menub', '#menub');
    g.vis = {};
    ['top','tabbar','sideL','sideR','slots','battlefoot','tuto','menub','botleft','spdb','stinfo'].forEach((id) => {
      const e = document.getElementById(id);
      g.vis[id] = e ? (getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.02) : null;
    });
    g.saverOn = (typeof saverOn !== 'undefined') ? saverOn : null;
    return g;
  });

  const abs = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await p.screenshot({ path: abs });
  console.log('saved ' + out);
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log('  ' + e)); }
  else console.log('console clean');
  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    console.log('\n--- ref 환산 (ref y = frame y + 84) ---');
    for (const [k, v] of Object.entries(geo)) {
      if (!v || typeof v !== 'object' || v.w === undefined) continue;
      console.log(`${k.padEnd(11)} x${String(v.x).padStart(7)} y${String(v.y).padStart(7)} (ref y ${(v.y + 84).toFixed(1)})  ${v.w}×${v.h}`);
    }
    console.log('vis: ' + JSON.stringify(geo.vis));
  }
  await ctx.close();
  await b.close();
})();
