/* run52.js — «획 두께» 실측. 흰 잉크의 **가로 런렝스 히스토그램**을 낸다.
   비평가 B 가 4회차에 라벨 획을 이 방법으로 쟀다(ref 최빈 4px vs 우리 2px = −45%).
   같은 코드로 레퍼런스와 캡처를 둘 다 재야 비교가 성립한다(LESSONS 21 «같은 자로 재라»).

   사용: node tools/run52.js <img> <x0> <x1> <y0> <y1> [th=150]
     예) 레퍼런스 「설정」 라벨: node tools/run52.js docs/ref/52-메뉴-버튼-클릭시.jpg 808 851 962 986
         우리 캡처 「설정」 라벨: node tools/run52.js docs/review/52-r6.png 808 850 768 792
   출력: 런 길이별 개수 + 최빈값 + 잉크 밀도(bbox 대비). */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const IMG = process.argv[2];
const X0 = +process.argv[3], X1 = +process.argv[4], Y0 = +process.argv[5], Y1 = +process.argv[6];
const TH = +(process.argv[7] || 150);
const MIME = /\.png$/i.test(IMG) ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';

(async () => {
  const b64 = fs.readFileSync(path.resolve(IMG)).toString('base64');
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const r = await p.evaluate(async ({ src, X0, X1, Y0, Y1, TH }) => {
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = src; });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    c.getContext('2d').drawImage(im, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, im.width, im.height).data;
    const white = (x, y) => {
      const i = (y * im.width + x) * 4;
      return Math.min(d[i], d[i + 1], d[i + 2]) > TH;
    };
    const hist = {}; let ink = 0, tot = 0;
    for (let y = Y0; y <= Y1; y++) {
      let run = 0;
      for (let x = X0; x <= X1 + 1; x++) {
        const w = x <= X1 && white(x, y);
        if (w) { run++; ink++; } else if (run) { hist[run] = (hist[run] || 0) + 1; run = 0; }
        if (x <= X1) tot++;
      }
    }
    return { hist, ink, tot, w: im.width, h: im.height };
  }, { src: MIME + b64, X0, X1, Y0, Y1, TH });
  await b.close();

  const rows = Object.entries(r.hist).map(([k, v]) => [+k, v]).sort((a, c) => a[0] - c[0]);
  const mode = rows.slice().sort((a, c) => c[1] - a[1])[0];
  console.log(`RUN52 ${IMG} (${r.w}x${r.h})  bbox x${X0}..${X1} y${Y0}..${Y1} th${TH}`);
  console.log('  런 길이:개수  ' + rows.map(([k, v]) => `${k}:${v}`).join('  '));
  console.log(`  최빈 런 = ${mode ? mode[0] : '-'}px (${mode ? mode[1] : 0}회)  ·  잉크 밀도 ${(r.ink / r.tot).toFixed(3)}`);
})();
