/* 작업 258 진단 프로브 ② — «무엇이» 깜빡이는지 픽셀로 찍는다.
 *
 * probe258.js 는 DOM 이 조용하다는 것까지만 밝혔다(#dgdw 서브트리 mutation 이 열림 직후 말고는 없음).
 * 그러면 깜빡임은 **캔버스 픽셀** 이거나 **CSS 애니메이션**이다. 여기서는 팝업이 열린 뒤
 * 연속 스크린샷을 찍어 프레임 사이 diff 의 bbox 를 낸다 — 바뀌는 영역이 어디인지가 곧 원인이다.
 *
 * 실행: node tools/probe258b.js [--n 24] [--gap 60]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const N = arg('--n', 24), GAP = arg('--gap', 60);
const OUT = path.join(ROOT, 'docs', 'review', '258-frames');

const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(SEED);
  await p.evaluate(() => { openDungeon(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => { openDunDetail(DUNGEONS[0]); });
  await p.waitForTimeout(1200);          /* 60 열림 연출이 끝난 뒤부터 잰다 */

  const box = await p.evaluate(() => {
    const r = document.querySelector('#dgdw .dgd-box').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log('.dgd-box rect = ' + JSON.stringify(box));

  const files = [];
  for (let i = 0; i < N; i++) {
    const f = path.join(OUT, `f${i}.png`);
    await p.screenshot({ path: f });
    files.push(f);
    await p.waitForTimeout(GAP);
  }

  const imgs = files.map(f => PNG.sync.read(fs.readFileSync(f)));
  const W = imgs[0].width, H = imgs[0].height;
  console.log(`\n=== 프레임 간 diff (${N}장 · ${GAP}ms 간격 · ${W}x${H}) ===`);
  /* 팝업 영역 안/밖을 나눠 센다 — 밖(전투 캔버스)은 늘 움직이므로 원인이 아니다 */
  const inBox = (x, y) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
  const heat = new Map();     /* y 밴드(20px) → 변한 픽셀 수 합 */
  for (let k = 1; k < imgs.length; k++) {
    const A = imgs[k - 1].data, B = imgs[k].data;
    let nIn = 0, nOut = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (Math.abs(A[i] - B[i]) > 8 || Math.abs(A[i + 1] - B[i + 1]) > 8 || Math.abs(A[i + 2] - B[i + 2]) > 8) {
        if (inBox(x, y)) {
          nIn++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          const band = Math.floor((y - box.y) / 20) * 20;
          heat.set(band, (heat.get(band) || 0) + 1);
        } else nOut++;
      }
    }
    console.log(`  f${k - 1}→f${k}: 팝업안 ${String(nIn).padStart(6)}px` +
      (nIn ? ` bbox [${x0},${y0}]-[${x1},${y1}] (${x1 - x0 + 1}×${y1 - y0 + 1}, 로컬 y ${y0 - box.y}~${y1 - box.y})` : '') +
      ` | 팝업밖 ${nOut}px`);
  }
  console.log('\n=== 팝업 로컬 y 밴드별 변화 누적 (상위 12) ===');
  [...heat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([y, n]) => console.log(`  local y ${y}~${y + 19}: ${n}px`));

  await ctx.close(); await b.close();
})();
