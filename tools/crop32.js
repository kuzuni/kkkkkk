/* 작업 32 — 배너 구간만 잘라 2배 확대한 대조쌍을 만든다.
   레퍼런스(1080×2340, jpg) 와 캡처(1080×2280, png) 의 세로 변환은 «ref y − 84» 하나뿐이다.
   자르는 창: ref x 580..1080 / y 1800..2030 (500×230) → 캡처는 같은 x / y 1716..1946.
   출력: docs/review/32-crop-ref-x2.png · docs/review/32-crop-cap-x2.png
   실행: node tools/crop32.js [캡처파일]  */
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const R = path.resolve(__dirname, '../docs/ref/32-가이드미션-미완료-상태.jpg');
const capPath = path.resolve(__dirname, '..', process.argv[2] || 'docs/review/32-r1.png');
const OUT = path.resolve(__dirname, '../docs/review');

const X0 = 580, X1 = 1080, W = X1 - X0, H = 230;
const REF_Y0 = 1800, CAP_Y0 = REF_Y0 - 60;   /* 하단 앵커 요소 — ref 2340 ↔ 프레임 2280 */
const SCALE = 2;

function cropScale(src, sw, y0, name){
  const png = new PNG({ width: W * SCALE, height: H * SCALE });
  for (let y = 0; y < H * SCALE; y++){
    for (let x = 0; x < W * SCALE; x++){
      const sx = X0 + Math.floor(x / SCALE), sy = y0 + Math.floor(y / SCALE);
      const si = (sy * sw + sx) * 4, di = (y * W * SCALE + x) * 4;
      png.data[di]   = src[si];
      png.data[di+1] = src[si+1];
      png.data[di+2] = src[si+2];
      png.data[di+3] = 255;
    }
  }
  const f = path.join(OUT, name);
  fs.writeFileSync(f, PNG.sync.write(png));
  console.log('wrote ' + f + '  (' + (W*SCALE) + 'x' + (H*SCALE) + ')');
}

const ref = jpeg.decode(fs.readFileSync(R), { useTArray: true });
cropScale(ref.data, ref.width, REF_Y0, '32-crop-ref-x2.png');

const cap = PNG.sync.read(fs.readFileSync(capPath));
cropScale(cap.data, cap.width, CAP_Y0, '32-crop-cap-x2.png');
