/* 작업 120 — «꽉 참(⑤)» 의 객관 지표 스캐너.
   비평 G 의 1회차 ⑤ 4점 근거를 그대로 수치화한다:
     A. 아치 내부(x244~832)의 «행별 고유색 수» 와 행평균 휘도 프로파일 — 단색 통짜면 1.
     B. 바닥 대역의 «행별 고유색 수» — 세로 그라디언트만 있으면 행당 1~2.
     C. 아치 하변 부근의 «행평균 휘도 1차 차분» 최대값 — 수평 절단선이면 급점프가 뜬다.
   실행: node tools/scan120.js docs/review/120-r2-2280.png [패널상단 108] [패널하단]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const file = process.argv[2] || 'docs/review/120-r2-2280.png';
const PT = Number(process.argv[3] || 108);

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext()).newPage();
  const data = 'data:image/png;base64,' + fs.readFileSync(path.resolve(file)).toString('base64');
  const out = await p.evaluate(async ({ url, PT }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const lum = (x, y) => { const [r, gg, bb] = at(x, y); return .2126 * r + .7152 * gg + .0722 * bb; };
    const PB = c.height - 180;                 /* 탭바 상변 */
    const H = PB - PT;

    /* 행별 고유색 수 + 행평균 휘도 */
    const rowStat = (y, x0, x1) => {
      const s = new Set(); let sum = 0, n = 0;
      for (let x = x0; x < x1; x += 2) { const [r, gg, bb] = at(x, y); s.add((r << 16) | (gg << 8) | bb); sum += lum(x, y); n++; }
      return { uniq: s.size, mean: sum / n };
    };

    /* 아치는 «격자 ± 186» 이다(120 2회차) — 격자 top = (H−820)×.452617 */
    const spare = H - 820;
    const archTop = PT + spare * 0.452617 - 186;
    const archBot = archTop + 888;

    /* A. 아치 내부 — 상하 40px 을 뺀 구간을 20 행 샘플 */
    const arch = [];
    for (let k = 0; k <= 20; k++) {
      const y = Math.round(archTop + 40 + (888 - 80) * k / 20);
      arch.push({ y, ...rowStat(y, 250, 826) });
    }
    /* B. 바닥 — 72% ~ 98% 를 14 행 샘플 */
    const floor = [];
    for (let k = 0; k <= 14; k++) {
      const y = Math.round(PT + H * (0.72 + (0.98 - 0.72) * k / 14));
      floor.push({ y, ...rowStat(y, 20, 1060) });
    }
    /* C. 아치 하변 부근 1차 차분 */
    const ab = Math.round(archBot);
    const diff = [];
    for (let y = ab - 40; y <= ab + 40; y++) diff.push(rowStat(y, 250, 826).mean);
    let maxJump = 0, jumpY = 0;
    for (let i = 1; i < diff.length; i++) {
      const j = Math.abs(diff[i] - diff[i - 1]);
      if (j > maxJump) { maxJump = j; jumpY = ab - 40 + i; }
    }
    return { w: c.width, h: c.height, PT, PB, archBottom: ab, arch, floor, maxJump, jumpY };
  }, { url: data, PT });

  const f = n => n.toFixed(1);
  console.log(`${file}  ${out.w}×${out.h}  패널 y${out.PT}..${out.PB}  아치 하변 ≈${out.archBottom}`);
  console.log('\nA. 아치 내부(x250~826) — 행별 고유색 / 행평균 휘도');
  console.log('  ' + out.arch.map(r => `${r.y}:${r.uniq}/${f(r.mean)}`).join('  '));
  const aU = out.arch.map(r => r.uniq), aM = out.arch.map(r => r.mean);
  console.log(`  고유색 최소 ${Math.min(...aU)} · 최대 ${Math.max(...aU)}   휘도 ${f(Math.min(...aM))} → ${f(Math.max(...aM))} (진폭 ${f(Math.max(...aM) - Math.min(...aM))})`);
  console.log('\nB. 바닥(x20~1060) — 행별 고유색 / 행평균 휘도');
  console.log('  ' + out.floor.map(r => `${r.y}:${r.uniq}/${f(r.mean)}`).join('  '));
  const fU = out.floor.map(r => r.uniq);
  console.log(`  고유색 최소 ${Math.min(...fU)} · 최대 ${Math.max(...fU)}`);
  console.log(`\nC. 아치 하변 ±40 행평균 휘도 1차 차분 최대 ${f(out.maxJump)} @y${out.jumpY}  (수평 절단선이면 급점프)`);
  await b.close();
})();
