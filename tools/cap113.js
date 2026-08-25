/* 작업 113 캡처 — 가이드 미션 «손가락» 포인터.
   실행: node tools/cap113.js [회차]   → docs/review/113-r<회차>-<장면>.png
   장면마다 미션을 그 미션으로 맞추고 배너를 눌러 이동시킨 뒤, 탭 애니메이션의 «누른 순간»
   근처에서 1장 찍는다(0.9s 루프의 22% 지점 ≈ 200ms). 지시서 [3]-(가) 기계적 확인용이다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');

const R = process.argv[2] || '1';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = path.resolve(__dirname, '../docs/review');

/* [미션 인덱스, 파일 이름, 상태 주입] */
const SCENES = [
  [0,  '10상점-스킬상자', ''],
  [4,  '23훈련-공격력',   ''],
  [9,  '03던전-첫카드',   ''],
  [1,  '07스킬-보유카드', "S.own['slash']={l:1,n:0}; S.eqSkill=[];"],
  [12, '89유물-소환',     '']
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto(URL);
  await p.waitForFunction(() => typeof GUIDE !== 'undefined' && typeof fxHand === 'function');
  await p.waitForTimeout(400);
  for (const [i, name, mut] of SCENES) {
    await p.evaluate(([i, mut]) => {
      gmHandOff(); gmCloseAll(); closeModal();
      Object.assign(S, DEF());
      if (mut) eval(mut);
      S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
      gmBase(GUIDE[i]); uiDirty = true; renderUI(); drawTuto();
      gmGo();
    }, [i, mut]);
    await p.waitForTimeout(420);                 /* 이동 + 탭 루프 «누른» 구간 */
    const f = path.join(OUT, `113-r${R}-${name}.png`);
    await p.screenshot({ path: f });
    console.log('  ·', path.basename(f));
  }
  await browser.close();
  console.log('CAP113 done');
})();
