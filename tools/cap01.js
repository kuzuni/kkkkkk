/* 작업 01 — 오프라인 보상 팝업 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: showOfflineReward() 직접 호출(레퍼런스 상태 = 0시간 6분 · 6.49A).
   실행: node tools/cap01.js [출력경로] [--geo]
     --geo   `.ofrs` 스테이지 좌표 + 프레임 좌표 + ref 환산(frame y + 84)을 찍는다.
   좌표계: `.ofrs`(1080×972) 는 ref 원점 y772 짜리 1:1 프레임이므로 ref y = stage y + 772.
   LESSONS 28-③ — 전투 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨기고 평탄한 중간톤을 깐다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/01-r5.png';
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

  /* 레퍼런스와 같은 상태 — 6분 경과 · 보상 6.49A (LESSONS 04-① 캡처 상태 일치) */
  await p.evaluate(() => {
    showOfflineReward(360, 0, 0);
    document.getElementById('ofrAmt').textContent = '6.49A';
  });
  await p.waitForTimeout(420);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const St = document.querySelector('.ofrs').getBoundingClientRect();
    const g = { _stageTopInFrame: +(St.top - A.top).toFixed(1) };
    const R = (k, sel, root) => {
      const e = (root || document).querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { sx: +(r.left - St.left).toFixed(1), sy: +(r.top - St.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               fy: +(r.top - A.top).toFixed(1) };
    };
    R('box', '.ofr-box'); R('head', '.ofr-head'); R('in', '.ofr-in');
    R('max', '.ofr-max i'); R('pill', '.ofr-pill'); R('pillTx', '.ofr-pill i');
    R('clock', '.ofr-clock'); R('lead', '.ofr-lead i');
    R('rw', '.ofr-rw'); R('fr', '.ofr-fr'); R('frIn', '.ofr-fr i'); R('amt', '.ofr-amt i');
    R('btnG', '.ofr-b.g'); R('btnB', '.ofr-b.b'); R('btnGi', '.ofr-b.g i'); R('btnBi', '.ofr-b.b i');
    R('ad', '.ofr-ad');
    R('bn', '.ofr-bn'); R('bnU', '.ofr-bn>u'); R('art', '.ofr-art');
    R('t1', '.ofr-t1 i'); R('t2', '.ofr-t2:not(.s) i');
    R('go', '.ofr-go'); R('goI', '.ofr-go i'); R('tag', '.ofr-tag'); R('tagI', '.ofr-tag i');
    return g;
  });

  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    console.log('-- ref 환산 (stage y + 772 = ref y) --');
    for (const [k, v] of Object.entries(geo))
      if (v && v.w !== undefined)
        console.log(`  ${k}\tref x${v.sx} y${(v.sy + 772).toFixed(1)}  ${v.w}x${v.h}   (frame y${v.fy})`);
  }

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
