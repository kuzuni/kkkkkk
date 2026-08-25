/* 작업 05 — 무기 팝업 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 변환은 단 하나: 프레임 y = 레퍼런스 y − 84 (가로 1:1).
   진입: 06 장비 시트의 무기 슬롯 → openWeapon(null,'weapon'). 여기서는 상태를 주입하고 직접 연다.
   실행: node tools/cap05.js [출력경로] [--geo]
     --geo  주요 요소의 프레임 좌표를 JSON + ref 환산(y+84) 로 찍는다.
   상태 — 레퍼런스와 같게: 녹슨 검(g0) 보유·Lv5, 강철 장검(g1) 보유·Lv2·장착 중, 선택은 장착품.
   LESSONS 28-③ — 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨긴다.
   playwright 번들 브라우저가 없으면 /opt/pw-browsers/chromium 으로 떨어진다(smoke.js 와 같은 처방). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/05-r1.png';
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
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    S.own.weapon0 = { n: 0, l: 5 };
    S.own.weapon1 = { n: 2, l: 2 };
    S.eqSlot.weapon = 'weapon1';
    openWeapon('weapon1');
  });
  await p.waitForTimeout(420);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, sel) => {
      const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', '#app'); R('wm', '.wm'); R('head', '.wm-head'); R('body', '.wm-body');
    R('info', '.wm-info'); R('ic', '.wm-ic'); R('cat', '.wm-cat'); R('name', '.wm-nm');
    R('grade', '.wm-gd'); R('bar', '.wm-bar'); R('lv', '.wm-lv'); R('tb', '.wm-tb');
    R('tbhd', '.wm-tb .hd'); R('tbbd', '.wm-tb .bd'); R('tbdv', '.wm-tb .dv');
    R('h1', '.wm-tb .h1'); R('h2', '.wm-tb .h2'); R('l1', '.wm-tb .l1'); R('v1', '.wm-tb .v1');
    R('grid', '.wm-grid'); R('tot', '.wm-tot');
    R('b1', '.wm-b1'); R('b2', '.wm-b2'); R('arL', '.wm-ar.l'); R('arR', '.wm-ar.r');
    const cs = document.querySelectorAll('#wpnGrid .wgc');
    g.cardCount = cs.length;
    [0, 1, 4, 5, 10, 15].forEach((i) => { if (cs[i]) R('c' + i, cs[i]); });
    return g;
  });

  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    console.log('-- ref 환산(y+84) --');
    for (const [k, v] of Object.entries(geo))
      if (v && v.w !== undefined) console.log(`  ${k}\tref x${v.x} y${(v.y + 84).toFixed(1)}  ${v.w}x${v.h}`);
  }

  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.getElementById('stagearea'); if (st) st.style.background = '#2A2130';
  });
  await p.waitForTimeout(60);

  await p.screenshot({ path: path.resolve(__dirname, '..', out) });
  console.log('capture →', out, '| console errors:', errs.length);
  if (errs.length) errs.slice(0, 8).forEach((e) => console.log('  ERR', e));
  await b.close();
})();
