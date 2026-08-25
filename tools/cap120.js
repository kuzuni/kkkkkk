/* 작업 120 — 89 유물 페이지(#relw) «영역 꽉 채우기» 캡처 하네스.
   120 의 채점 대상은 «레퍼런스 대조» 가 아니라 «재화 바 밑 ~ 탭바 위 영역을 꽉 채우는가» 다.
   그래서 89(cap89.js)처럼 패널만 크롭하지 않고 **프레임 전체**를 찍는다 —
   검은 띠는 «패널 밖» 에 생기므로 크롭하면 정작 보려던 결함이 안 보인다.

   실행: node tools/cap120.js <회차> [높이…]
     예) node tools/cap120.js r1              → 1600·1920·2280·2600 4장
         node tools/cap120.js r2 2280         → 2280 한 장
   출력: docs/review/120-<회차>-<H>.png (1080×H 전체 프레임)

   상태 주입은 cap89 와 같다 — 유물 10종 보유·점등(Lv 두 자리 포함) + 유물조각 충분.
   비용 숫자는 119 곡선(100 + 소환 횟수)의 실제 값을 그대로 둔다(레퍼런스 822 고정 안 함) —
   120 은 잉크 대조가 아니라 배치 채움을 본다. */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const args = process.argv.slice(2);
const RND = args[0] || 'r1';
const HEIGHTS = (args.slice(1).length ? args.slice(1) : ['1600', '1920', '2280', '2600']).map(Number);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const b = await launch(chromium);
  let errTotal = 0;
  for (const H of HEIGHTS) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL);
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    await p.waitForTimeout(450);
    const out = `docs/review/120-${RND}-${H}.png`;
    await p.screenshot({ path: out });
    console.log(`saved ${out} (1080×${H} full frame) · console errors ${errs.length}`);
    errs.slice(0, 3).forEach(e => console.log('   ' + e));
    errTotal += errs.length;
    await ctx.close();
  }
  await b.close();
  if (errTotal) process.exitCode = 1;
})();
