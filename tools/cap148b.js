/* 작업 148 — 미션 텍스트 요소별 «타이트 크롭» 캡처(1:1 · 배경 투명 제외 없이 그대로).
   실행: node tools/cap148b.js  → docs/review/148-r1-e-*.png
   요소 bbox 를 브라우저에서 직접 받아 그 자리만 잘라낸다 → scan148.py 로 카운터 생존율을 잰다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const out = f => path.resolve(__dirname, '../docs/review/' + f);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);

  const shot = async (sel, name, pad = 6) => {
    const r = await p.evaluate(([sel, pad]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x) - pad, y: Math.round(b.y) - pad,
               width: Math.round(b.width) + pad * 2, height: Math.round(b.height) + pad * 2 };
    }, [sel, pad]);
    if (!r || r.width <= 0) { console.log('MISS ' + sel); return; }
    await p.screenshot({ path: out(name), clip: r });
    console.log('ok ' + name + ' ' + JSON.stringify(r));
  };

  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(400);
  await shot('#tuto .tbtn', '148-r1-e-L1라벨.png');
  await shot('#tuto .tt',   '148-r1-e-L2문구.png');
  await shot('#tuto .tpg',  '148-r1-e-L3진행.png');
  await shot('#tuto .tsub', '148-r1-e-보상수량.png');

  await p.evaluate(() => { openProfile(); });
  await p.waitForTimeout(700);
  await shot('.pf-msn', '148-r1-e-해금미션바.png', 2);

  await p.evaluate(() => { closeModal(); openQuest(); });
  await p.waitForTimeout(700);
  await shot('.mbox .mhead h2', '148-r1-e-퀘스트헤더.png');
  await shot('#qsList .qs-r:nth-child(1)', '148-r1-e-퀘스트행.png', 2);

  await b.close();
})();
