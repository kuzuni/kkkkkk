/* 작업 258 진단 프로브 ③ — 팝업 안에서 «바뀌는 자리» 를 격자 히트맵으로 찍는다.
 * probe258b 의 단일 bbox 는 서로 떨어진 변화 두 곳을 한 상자로 합쳐 버려 자리를 못 가른다.
 * 실행: node tools/probe258c.js [--n 12] [--gap 60]
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
const N = arg('--n', 12), GAP = arg('--gap', 60);
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
  await p.waitForTimeout(1400);

  const geo = await p.evaluate(() => {
    const o = {};
    const r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; };
    o.box = r(document.querySelector('#dgdw .dgd-box'));
    document.querySelectorAll('#dgdw .dgd-box *').forEach(e => {
      const k = e.id || e.className.toString().split(' ')[0] || e.nodeName;
      if (!o[k]) o[k] = r(e);
    });
    return o;
  });
  const box = { x: geo.box[0], y: geo.box[1], w: geo.box[2], h: geo.box[3] };

  const files = [];
  for (let i = 0; i < N; i++) {
    const f = path.join(OUT, `c${i}.png`);
    await p.screenshot({ path: f });
    files.push(f); await p.waitForTimeout(GAP);
  }
  const imgs = files.map(f => PNG.sync.read(fs.readFileSync(f)));
  const W = imgs[0].width;

  const CELL = 40;
  const cols = Math.ceil(box.w / CELL), rows = Math.ceil(box.h / CELL);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let k = 1; k < imgs.length; k++) {
    const A = imgs[k - 1].data, B = imgs[k].data;
    for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * W + x) * 4;
      if (Math.abs(A[i] - B[i]) > 8 || Math.abs(A[i + 1] - B[i + 1]) > 8 || Math.abs(A[i + 2] - B[i + 2]) > 8)
        grid[Math.floor((y - box.y) / CELL)][Math.floor((x - box.x) / CELL)]++;
    }
  }
  const max = Math.max(...grid.flat());
  const ch = n => n === 0 ? '.' : n < max * .05 ? '1' : n < max * .15 ? '2' : n < max * .3 ? '3'
    : n < max * .5 ? '5' : n < max * .75 ? '7' : '#';
  console.log(`\n=== 변화 히트맵 (셀 ${CELL}px · ${N - 1} 프레임쌍 누적 · max ${max}) ===`);
  console.log('     ' + Array.from({ length: cols }, (_, c) => (c * CELL / 100 | 0) % 10).join(''));
  grid.forEach((r, i) => console.log(String(i * CELL).padStart(5) + ' ' + r.map(ch).join('')));

  console.log('\n=== 팝업 자식 요소 로컬 좌표 ===');
  Object.entries(geo).forEach(([k, v]) => {
    if (k === 'box') return;
    console.log(`  ${k.padEnd(14)} local x${v[0] - box.x} y${v[1] - box.y} ${v[2]}×${v[3]}`);
  });

  await ctx.close(); await b.close();
})();
