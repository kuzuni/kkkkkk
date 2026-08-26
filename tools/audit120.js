/* 120 — 캡처 «픽셀» 감사. 비평가가 «슬롯이 4칸뿐이다 / 금테가 없다» 처럼
   게이트(DOM 실측)와 정면으로 어긋나는 보고를 했을 때, 어느 쪽이 맞는지 픽셀로 확정한다.
   (LESSONS 21-(2) — 캡처·게이트 신뢰성. 비평가 실측을 그대로 믿고 움직이면 회차가 날아간다.)

   검사:
     1. 슬롯 브론즈 테두리(#A67B50 계열)로 10칸의 좌변 x 를 세로 스캔해 찾는다.
     2. 금색 프레임(#B29661)이 패널 좌·우 세로줄과 상·하 가로줄에 실제로 있는가.
   실행: node tools/audit120.js docs/review/120-r2-2280.png
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const file = process.argv[2] || 'docs/review/120-r2-2280.png';

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext()).newPage();
  const url = 'data:image/png;base64,' + fs.readFileSync(path.resolve(file)).toString('base64');
  const out = await p.evaluate(async (u) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = u; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const near = (p1, p2, t) => Math.abs(p1[0] - p2[0]) <= t && Math.abs(p1[1] - p2[1]) <= t && Math.abs(p1[2] - p2[2]) <= t;

    const BRONZE = [0xA6, 0x7B, 0x50], GOLD = [0xB2, 0x96, 0x61];
    /* 1. 슬롯 — 브론즈 테두리 픽셀을 전부 모아 연결된 사각형의 좌상단을 뽑는다 */
    const hits = [];
    for (let y = 108; y < c.height - 180; y += 1) {
      for (let x = 0; x < c.width; x += 1) if (near(at(x, y), BRONZE, 22)) hits.push([x, y]);
    }
    /* 좌상단 후보: 위·왼쪽이 브론즈가 아닌 브론즈 픽셀 */
    const set = new Set(hits.map(([x, y]) => y * c.width + x));
    const corners = hits.filter(([x, y]) => !set.has((y - 1) * c.width + x) && !set.has(y * c.width + (x - 1)));
    /* 근접 병합 */
    const boxes = [];
    for (const [x, y] of corners) {
      if (!boxes.some(bx => Math.abs(bx.x - x) < 30 && Math.abs(bx.y - y) < 30)) boxes.push({ x, y });
    }
    /* 각 상자의 폭·높이 = 그 행/열에서 브론즈가 이어지는 범위 */
    const sized = boxes.map(bx => {
      let w = 0, h = 0;
      while (set.has(bx.y * c.width + (bx.x + w))) w++;
      while (set.has((bx.y + h) * c.width + bx.x)) h++;
      /* 오른쪽 변까지 = 같은 행에서 다음 브론즈 덩어리 끝 */
      let x2 = bx.x;
      for (let x = bx.x; x < Math.min(c.width, bx.x + 200); x++) if (near(at(x, bx.y + 3), BRONZE, 22)) x2 = x;
      let y2 = bx.y;
      for (let y = bx.y; y < Math.min(c.height, bx.y + 200); y++) if (near(at(bx.x + 3, y), BRONZE, 22)) y2 = y;
      return { x: bx.x, y: bx.y, w: x2 - bx.x + 1, h: y2 - bx.y + 1 };
    }).filter(s => s.w > 100 && s.h > 100);
    sized.sort((a, b2) => (a.y - b2.y) || (a.x - b2.x));

    /* 2. 금색 프레임 — 패널 좌·우 세로줄 / 상·하 가로줄 */
    const PT = 108, PB = c.height - 180;
    const colGold = x => { let n = 0; for (let y = PT + 20; y < PB - 20; y += 4) if (near(at(x, y), GOLD, 40)) n++; return n; };
    const rowGold = y => { let n = 0; for (let x = 20; x < c.width - 20; x += 4) if (near(at(x, y), GOLD, 40)) n++; return n; };
    const leftCols = [], rightCols = [];
    for (let x = 0; x < 14; x++) leftCols.push([x, colGold(x)]);
    for (let x = c.width - 14; x < c.width; x++) rightCols.push([x, colGold(x)]);
    const topRows = [], botRows = [];
    for (let y = PT; y < PT + 14; y++) topRows.push([y, rowGold(y)]);
    for (let y = PB - 14; y < PB; y++) botRows.push([y, rowGold(y)]);
    return { w: c.width, h: c.height, slots: sized, leftCols, rightCols, topRows, botRows,
      colSamples: Math.ceil((PB - 20 - (PT + 20)) / 4), rowSamples: Math.ceil((c.width - 40) / 4) };
  }, url);

  console.log(`${file}  ${out.w}×${out.h}`);
  console.log(`\n[슬롯] 브론즈 테두리로 검출된 상자 ${out.slots.length}개`);
  out.slots.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  x${s.x} y${s.y}  ${s.w}×${s.h}`));
  const rows = {};
  out.slots.forEach(s => { rows[s.y] = (rows[s.y] || 0) + 1; });
  console.log('  행 구성: ' + Object.entries(rows).map(([y, n]) => `y${y}×${n}칸`).join(' · '));
  console.log(`\n[금테] 좌측 열 (열당 세로 표본 ${out.colSamples})`);
  console.log('  ' + out.leftCols.map(([x, n]) => `x${x}:${n}`).join(' '));
  console.log(`  우측 열`);
  console.log('  ' + out.rightCols.map(([x, n]) => `x${x}:${n}`).join(' '));
  console.log(`  상변 행 (행당 가로 표본 ${out.rowSamples})`);
  console.log('  ' + out.topRows.map(([y, n]) => `y${y}:${n}`).join(' '));
  console.log(`  하변 행`);
  console.log('  ' + out.botRows.map(([y, n]) => `y${y}:${n}`).join(' '));
  await b.close();
})();
