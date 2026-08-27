/* 작업 02 기본 메인 화면 — 캡처 하네스 (1080×2280, 2026-08-25 기준 해상도)
   실행: node tools/cap02.js <회차>   → docs/review/02-r<회차>.png
   레퍼런스 `docs/ref/02-기본-메인-화면.jpg` 와 같은 «상태» 로 맞춰 찍는다:
     · 하단 패널 닫힘(순수 전투 화면)   · STAGE 37
     · 스테이지 진행바 채움 ≈ 32%(레퍼런스 실측 128/398)
     · 가이드 배너는 «보상받기»(금색) 상태 — 미완료(어두운 .todo)는 작업 32 의 화면이다 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const r = process.argv[2] || '1';
const out = path.resolve(__dirname, '../docs/review/02-r' + r + '.png');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  /* 58 연출 모듈의 재화 파티클(#fxl)이 헤더·배너 위를 지나가 채점을 오염시킨다(53 이 같은 사고).
     레퍼런스는 정지 화면이므로 캡처에서만 끈다 — 게임 코드는 건드리지 않는다. */
  await p.addStyleTag({ content: '#fxl{display:none!important}' });

  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 37; S.best = 37;
    S.gold = 1234567; S.dia = 8900;
    /* 가이드 미션 6번(적 100마리 처치)을 «달성» 상태로 → 배너가 금색 [보상받기] 가 된다 */
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0;
    S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  /* 진행바는 킬 수로 결정된다 — 캡처 직전에 레퍼런스 비율로 고정한다 */
  await p.evaluate(() => {
    killed = Math.round(stageTotal() * 0.32);
    $('prF').style.width = (killed / stageTotal() * 100) + '%';
  });
  await p.waitForTimeout(120);
  await p.screenshot({ path: out });

  const box = await p.evaluate(() => {
    const g = id => { const e = document.getElementById(id); if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    /* 189 — `spdb`(배속)은 삭제됐다. 늘 null 로 찍혀 «못 쟀다» 와 구별이 안 되므로 뺀다. */
    return { stinfo: g('stinfo'), menub: g('menub'), tuto: g('tuto'), app: g('app') };
  });
  await b.close();
  console.log('CAP02 r' + r + ' →', path.basename(out));
  console.log('errors:', errs.length ? errs : 0);
  console.log(JSON.stringify(box));
})();
