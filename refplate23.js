/* 23 — ref 카드 아이콘 «판» 실루엣 재구성기(16회차 신설, sess-0005-4811).
   ref 는 판 위에 아트가 얹혀 중앙이 가려지므로 «행별 좌/우 끝 베이지 x» 만 모아 도형을 복원한다.
   11회차는 «좌 꼭짓점 행 1619..1632 → 중심 y1625.5», 16회차 비평가 2명은 «중앙열 베이지 1566..1715
   → 중심 1640.5» 로 정반대 결론을 냈다 — 어느 쪽이 맞는지는 실루엣이 정한다.
   사용: node refplate23.js [카드번호 1|2|3] */
const { chromium } = require('playwright');
const fs = require('fs');
const REF = '/home/user/kkkkkk/docs/ref/23-훈련-팝업.jpg';
const CARD = +(process.argv[2] || 1);
const CX = [197.5, 539.5, 880.5][CARD - 1];
const uri = f => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.setContent('<canvas id=a></canvas>');
  const rows = await p.evaluate(async ([u, cx]) => {
    const im = new Image(); im.src = u; await im.decode();
    const c = document.getElementById('a'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data, W = c.width;
    const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    /* 판 베이지 기준색 — 행마다 명암이 조금 다르므로 폭넓게 잡고 «흰 카드 배경»(250+,250+,240+) 은 제외 */
    const isPlate = ([r, gr, bl]) => r > 205 && r < 250 && gr > 185 && gr < 232 && bl > 150 && bl < 210
      && r - bl > 25 && r - bl < 70;
    const out = [];
    for (let y = 1540; y <= 1740; y++) {
      let L = null, R = null;
      for (let x = Math.round(cx) - 100; x <= Math.round(cx) + 100; x++) if (isPlate(px(x, y))) { L = x; break; }
      for (let x = Math.round(cx) + 100; x >= Math.round(cx) - 100; x--) if (isPlate(px(x, y))) { R = x; break; }
      out.push([y, L, R]);
    }
    return out;
  }, [uri(REF), CX]);

  const hit = rows.filter(r => r[1] !== null);
  console.log(`카드${CARD} (중심 x=${CX}) — ref 판 베이지 행별 좌/우 끝`);
  for (const [y, L, R] of hit) if (y % 4 === 0 || y === hit[0][0] || y === hit[hit.length - 1][0])
    console.log(`  y${y}  L=${L} R=${R}  w=${R - L + 1}  중심x=${((L + R) / 2).toFixed(1)}`);
  const top = hit[0][0], bot = hit[hit.length - 1][0];
  const widest = hit.reduce((a, r) => (r[2] - r[1] > a[2] - a[1] ? r : a));
  console.log(`\n  세로 범위 y${top}..${bot} (h${bot - top + 1})`);
  console.log(`  최대폭 행 y${widest[0]}  L=${widest[1]} R=${widest[2]} w=${widest[2] - widest[1] + 1}`);
  const wide = hit.filter(r => r[2] - r[1] >= (widest[2] - widest[1]) - 2);
  console.log(`  최대폭±2 행 범위 y${wide[0][0]}..${wide[wide.length - 1][0]} → 세로 중심 ${((wide[0][0] + wide[wide.length - 1][0]) / 2).toFixed(1)}`);
  await b.close();
})();
