/* 작업 48 검증 — 좌측 사이드 스택의 행 좌표를 «프레임 px» 로 뽑는다.
   지시서 [3]-(가) 기계적 작업 검증용: 던전 행 제거 전후로 남은 행들의 y 가 Δ0 인지(승급전만 한 행 위로)
   그리고 콘솔 에러 0 · 요소 겹침 0 을 본다.
   사용: node tools/verify48.js [출력.json]
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
  const out = process.argv[2] || null;
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const app = document.getElementById('app');
    const ar = app.getBoundingClientRect();
    const sc = ar.width / 1080;               /* 프레임 → 뷰포트 배율 */
    const F = el => { const b = el.getBoundingClientRect();
      return { x: +((b.left - ar.left)/sc).toFixed(2), y: +((b.top - ar.top)/sc).toFixed(2),
               w: +(b.width/sc).toFixed(2), h: +(b.height/sc).toFixed(2) }; };
    const rows = side => [...document.querySelectorAll('#' + side + ' .ibtn')].map(b => {
      const g = F(b), si = b.querySelector('.si'), sl = b.querySelector('.sl');
      return { key: b.dataset.pop || b.dataset.lock || '?', label: sl ? sl.textContent : '',
               box: g, si: si ? F(si) : null };
    });
    /* 겹침: 같은 컬럼 안 인접 행의 bbox 가 서로 침범하는지 */
    const overlap = list => { const bad = [];
      for (let i = 0; i + 1 < list.length; i++){
        const a = list[i].box, b = list[i+1].box;
        if (a.y + a.h > b.y + 0.5) bad.push(list[i].key + '↔' + list[i+1].key);
      } return bad; };
    const L = rows('sideL'), R = rows('sideR');
    const foot = document.getElementById('battlefoot');
    const fb = foot ? F(foot) : null;
    const last = L[L.length - 1];
    return { L, R, overlapL: overlap(L), overlapR: overlap(R),
             vars: { ih: getComputedStyle(app).getPropertyValue('--ih').trim(),
                     igap: getComputedStyle(app).getPropertyValue('--igap').trim(),
                     itop: getComputedStyle(app).getPropertyValue('--itop').trim(),
                     ilf: getComputedStyle(app).getPropertyValue('--ilf').trim() },
             stackBottom: last ? +(last.box.y + last.box.h).toFixed(2) : null,
             footTop: fb ? fb.y : null };
  });
  r.consoleErrors = errs;
  await browser.close();

  const w = s => { process.stdout.write(s + '\n'); };
  w('--- #sideL 행 (프레임 px) ---');
  r.L.forEach((b, i) => w(`  ${i+1}행 ${b.key.padEnd(7)} ${(b.label||'(라벨없음)').padEnd(5)} y=${b.box.y} h=${b.box.h} x=${b.box.x} w=${b.box.w}`));
  w('--- #sideR 행 ---');
  r.R.forEach((b, i) => w(`  ${i+1}행 ${b.key.padEnd(7)} y=${b.box.y} h=${b.box.h}`));
  w('vars: ' + JSON.stringify(r.vars));
  w('스택 하단 y=' + r.stackBottom + ' / battlefoot top=' + r.footTop);
  w('겹침 L=' + (r.overlapL.length ? r.overlapL.join(',') : '0건') + ' R=' + (r.overlapR.length ? r.overlapR.join(',') : '0건'));
  w('콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.join(' | ') : ''));
  if (out) { fs.writeFileSync(out, JSON.stringify(r, null, 2)); w('→ ' + out); }
})();
