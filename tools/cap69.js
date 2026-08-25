/* 작업 69 — 우편함 팝업 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: ▦ 메뉴 → 우편 (52 메뉴 항목).
   실행: node tools/cap69.js [출력경로] [--geo]
     --geo  주요 요소의 프레임 좌표를 JSON + 표로 찍는다.
   LESSONS 28-③ — 캔버스가 잉크 스캔을 오염시키므로 캡처 직전 #view 를 숨기고 평탄한 중간톤을 깐다.
   LESSONS 51-③ — 유휴 루프가 굴리는 값(전투력·닉네임)은 픽셀 회귀에서 빼야 하므로 루프를 멈춘다. */
const { chromium } = require('playwright');
const path = require('path');

const out = process.argv[2] || 'docs/review/69-r1.png';
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

  /* 메뉴 → 우편. 위임 핸들러를 타야 하므로 query 와 click 을 같은 태스크 안에서(LESSONS 50-①) */
  await p.evaluate(() => { document.querySelector('#menub').click(); });
  await p.waitForTimeout(320);
  await p.evaluate(() => { document.querySelector('#mnw [data-mn="mail"]').click(); });
  /* ⚠ 60 쥬시니스의 등장 애니메이션은 **오버슛 바운스**라 고정 대기로는 «정점/내리막» 프레임이 찍힌다
     (그러면 비평가가 −8% 또는 +1.3% 로 어긋난 캡처를 채점한다). 변환이 항등이 될 때까지 기다린다. */
  for (let i = 0; i < 60; i++) {
    const done = await p.evaluate(() => {
      const ident = (t) => t === 'none' || /^matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)$/.test(t);
      for (let e = document.querySelector('.mbox'); e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (!ident(cs.transform) || (cs.scale && cs.scale !== 'none' && cs.scale !== '1')) return false;
        if (parseFloat(cs.opacity) < 0.999) return false;
      }
      return true;
    });
    if (done) break;
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(120);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', '#app'); R('mbox', '.mbox'); R('mhead', '.mhead'); R('mbody', '#mbox');
    R('pn', '.ml-pn'); R('note', '.ml-note'); R('btns', '.ml-btns');
    /* 92 — 하단 버튼은 2개다: 좌 #mailDel(빨강 삭제) · 우 #mailBtn(초록 수령) */
    R('all', '.ml-all'); R('bDel', '#mailDel'); R('bAll', '#mailBtn'); R('close', '.ml-close');
    R('empty', '.ml-empty');
    const rows = document.querySelectorAll('.ml-r');
    g.rowCount = rows.length;
    rows.forEach((_, i) => {
      R('r' + (i + 1), `.ml-r:nth-of-type(${i + 1})`);
      R('r' + (i + 1) + 'i', `.ml-r:nth-of-type(${i + 1}) .ml-i`);
      R('r' + (i + 1) + 't', `.ml-r:nth-of-type(${i + 1}) .ml-t`);
      R('r' + (i + 1) + 's', `.ml-r:nth-of-type(${i + 1}) .ml-s`);
      R('r' + (i + 1) + 'd', `.ml-r:nth-of-type(${i + 1}) .ml-d`);
      R('r' + (i + 1) + 'b', `.ml-r:nth-of-type(${i + 1}) .ml-b`);
    });
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
