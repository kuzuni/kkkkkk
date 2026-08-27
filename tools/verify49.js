/* 작업 49 검증 — 메인 우측 사이드(이벤트·특권 · 시설 배너) 제거.
   지시서 [3]-(가) 기계적 작업 검증용:
     ① 콘솔/페이지 에러 0
     ② #sideR · #facb · #facTm · #facBg · [data-lock] 가 DOM 에 0건
     ③ 우측에 남는 것은 #menub 하나뿐(프레임 우측 절반 x>540 에 걸치는 고정 UI 검사)
     ④ 좌측 컬럼(#sideL) 행 좌표가 제거 전후로 Δ0
     ⑤ 프레임 밖으로 삐져나오는 사이드 요소 0 · 인접 행 겹침 0
   사용: node tools/verify49.js [불러올.html] [출력.json]
   브라우저: PW_CHROMIUM 또는 /opt/pw-browsers/chromium-1194/chrome-linux/chrome */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium',
                 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  for (const p of cands) { try { if (fs.statSync(p).isFile()) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  const target = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
  const out = process.argv[3] || null;
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(target));
  await page.waitForTimeout(1400);

  const r = await page.evaluate(() => {
    const app = document.getElementById('app');
    const ar = app.getBoundingClientRect();
    const sc = ar.width / 1080;               /* 프레임 → 뷰포트 배율 */
    const F = el => { const b = el.getBoundingClientRect();
      return { x: +((b.left - ar.left)/sc).toFixed(2), y: +((b.top - ar.top)/sc).toFixed(2),
               w: +(b.width/sc).toFixed(2), h: +(b.height/sc).toFixed(2) }; };
    const rows = [...document.querySelectorAll('#sideL .ibtn')].map(b => {
      const g = F(b), sl = b.querySelector('.sl');
      return { key: b.dataset.pop || '?', label: sl ? sl.textContent : '', box: g };
    });
    /* 겹침: 좌측 인접 행의 bbox 가 서로 침범하는지 */
    const overlap = [];
    for (let i = 1; i < rows.length; i++){
      const a = rows[i-1].box, b = rows[i].box;
      if (a.y + a.h > b.y + 0.5) overlap.push(rows[i-1].key + '↔' + rows[i].key);
    }
    /* 프레임 밖 삐짐 */
    const bleed = rows.filter(o => o.box.x < 0 || o.box.x + o.box.w > 1080)
                      .map(o => o.key + ' x=' + o.box.x + ' w=' + o.box.w);
    /* 우측 절반(x>540)에 걸치는 «메인 화면 고정 UI» — #stagearea 위 오버레이만 본다 */
    const rightSide = [];
    ['#sideL .ibtn', '#sideR', '#sideR .ibtn', '#facb', '#menub'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const g = F(el);
        if (g.w > 0 && g.x + g.w > 540) rightSide.push(sel + ' @' + g.x + ',' + g.y);
      });
    });
    const gone = {
      sideR:  document.querySelectorAll('#sideR').length,
      facb:   document.querySelectorAll('#facb').length,
      facTm:  document.querySelectorAll('#facTm').length,
      facBg:  document.querySelectorAll('#facBg').length,
      dataLock: document.querySelectorAll('[data-lock]').length,
      sideCols: document.querySelectorAll('.side').length,
      menub:  document.querySelectorAll('#menub').length,
    };
    /* drawFac() 가 DOM 없이도 던지지 않는지 직접 호출 */
    let drawFacOk = 'n/a';
    try { if (typeof drawFac === 'function'){ drawFac(); drawFacOk = 'ok'; } }
    catch (e) { drawFacOk = 'THREW: ' + e.message; }
    return { rows, overlap, bleed, rightSide, gone, drawFacOk,
             ih: getComputedStyle(app).getPropertyValue('--ih').trim(),
             itop: getComputedStyle(app).getPropertyValue('--itop').trim() };
  });

  r.errors = errs;
  const txt = JSON.stringify(r, null, 1);
  if (out) fs.writeFileSync(out, txt);
  console.log(txt);
  await browser.close();
})();
