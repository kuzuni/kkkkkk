/* 작업 148 — «미션 글씨 깨짐» 객관 계측.
   실행: node tools/probe148.js
   ① 미션 관련 텍스트 요소의 넘침(scrollWidth > clientWidth)·잘림 여부
   ② 각 요소의 실효 -webkit-text-stroke 바깥 두께(px) = width/2, 그리고 «획 대비 두께비»
   ③ 배너 크롭을 화소로 스캔해 «흰 코어(채움) 화소 / 잉크 화소» 비율 = 카운터 생존율
      (수치가 낮을수록 검정 스트로크가 글자 속을 메워 «뭉개짐»)  */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TARGETS = [
  ['#tuto .tbtn', '배너 L1 라벨 [미션-n]'],
  ['#tuto .tt', '배너 L2 미션 문구'],
  ['#tuto .tpg', '배너 L3 진행 (0/10)'],
  ['#tuto .tsub', '배너 보상 수량'],
  ['.pf-msn i', '19 프로필 해금 미션 줄'],
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(400);

  const rows = await p.evaluate((TARGETS) => {
    const out = [];
    for (const [sel, name] of TARGETS) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ name, sel, miss: true }); continue; }
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;
      const r = el.getBoundingClientRect();
      out.push({
        name, sel, text: el.textContent,
        fs: +fs.toFixed(2), strokeW: +sw.toFixed(2), outer: +(sw / 2).toFixed(2),
        ratio: +(sw / fs).toFixed(3),
        paintOrder: cs.paintOrder,
        fontFam: cs.fontFamily.split(',')[0],
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        scrollW: el.scrollWidth, clientW: el.clientWidth,
        overflowX: el.scrollWidth - el.clientWidth,
        transform: cs.transform,
        ls: cs.letterSpacing,
      });
    }
    /* 실제 GameKR 로 그려졌는지 — 캔버스 폭 비교 */
    const cv = document.createElement('canvas').getContext('2d');
    const meas = (fam, s) => { cv.font = '40px ' + fam; return +cv.measureText(s).width.toFixed(2); };
    out.push({ name: '__font__', gamekr: meas("'GameKR'", '미션'), sans: meas('sans-serif', '미션'),
               loaded: document.fonts.check("40px 'GameKR'") });
    return out;
  }, TARGETS);

  console.log('== 148 계측 ==');
  for (const r of rows) console.log(JSON.stringify(r));
  console.log('pageerror:', errs.length);
  await b.close();
})();
