/* 작업 32 — 캡처(1080×2280 PNG)에서 가이드 미션 배너 요소들의 잉크 bbox 를 픽셀 실측한다.
   측정표 docs/measure/61-가이드미션.md 의 기대값과 대조한다.

   ⚠ 세로 변환 — 이 화면의 배너는 **하단 앵커** 요소다(탭바 위에 붙어 있다).
     · 화면 위쪽 기준 요소 : 프레임 y = ref y − 84   (상단 상태바 84 제거)
     · **하단 앵커 요소**   : 프레임 y = ref y − 60   (ref 2340 ↔ 프레임 2280. 잔차 24 는 전투 캔버스가 흡수)
     탭바 상단이 ref 2160 ↔ 프레임 2100 인 것으로 실측 확인됐다.
   따라서 아래 출력의 «ref 환산» 은 전부 «캡처 y + 60» 이다.
   실행: node tools/probe32.js [캡처파일]   */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OFF = 60;                                   /* 하단 앵커 변환 상수 */
const capPath = path.resolve(__dirname, '..', process.argv[2] || 'docs/review/32-r1.png');
const img = PNG.sync.read(fs.readFileSync(capPath));
const W = img.width;
const px = (x, y) => { const i = (y * W + x) * 4; return [img.data[i], img.data[i+1], img.data[i+2]]; };

function bbox(test, win){
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = win.y0; y <= win.y1; y++)
    for (let x = win.x0; x <= win.x1; x++){
      const c = px(x, y);
      if (test(c[0], c[1], c[2], x, y)){ n++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
  return n ? { x0, y0, x1, y1, w: x1-x0+1, h: y1-y0+1, n } : null;
}
const row = (label, b, ex) => {
  if (!b){ console.log('  ' + label.padEnd(16) + '없음'); return; }
  const got = `x ${b.x0}..${b.x1} / ref y ${b.y0+OFF}..${b.y1+OFF}  ${b.w}×${b.h}`;
  let d = '';
  if (ex) d = `   Δ x0 ${b.x0-ex[0]} / y0 ${b.y0+OFF-ex[1]} / w ${b.w-ex[2]} / h ${b.h-ex[3]}   (기대 x${ex[0]} ref y${ex[1]} ${ex[2]}×${ex[3]})`;
  console.log('  ' + label.padEnd(16) + got + d);
};

/* 텍스트 칸 · 보상칸 창 (프레임 y = ref − 60) */
const TXT = x => x >= 621 && x <= 947;
const w = (y0, y1, x0 = 621, x1 = 947) => ({ x0, x1, y0: y0 - OFF, y1: y1 - OFF });

/* ── 배너 껍데기 ── */
let edge = null;
for (let x = 560; x < 900; x++){
  const a = px(x-1, 1854), b = px(x, 1854);
  if (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) > 40){ edge = x; break; }
}
function vEdge(x, from, to, dir){
  for (let y = from; dir > 0 ? y < to : y > to; y += dir){
    const a = px(x, y - dir), b = px(x, y);
    if (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) > 40) return y;
  }
  return null;
}
const top = vEdge(700, 1750, 1820, 1), bot = vEdge(700, 1950, 1880, -1);

console.log('capture: ' + path.basename(capPath) + '   (하단 앵커 변환: ref y = 캡처 y + 60)');
console.log('─ 배너 껍데기 ───────────────────────────────────────────────');
console.log('  좌단 x          : ' + edge + '   (ref 620, Δ ' + (edge-620) + ')');
console.log('  상단 ref y      : ' + (top+OFF) + '   (ref 1840, Δ ' + (top+OFF-1840) + ')');
console.log('  하단 ref y      : ' + (bot+OFF) + '   (ref 1989, Δ ' + (bot+OFF-1989) + ')');
console.log('  높이            : ' + (bot-top) + '   (ref 150)');

console.log('─ 텍스트 3줄 (칸 x621..947, ref 중심 L1 793.5 · L2/L3 785) ──');
row('L1 민트',   bbox((r,g,b,x)=>TXT(x)&&g>170&&b>150&&r<g-60,               w(1845, 1890)), [714,1852,160,27]);
row('L2 흰',     bbox((r,g,b,x)=>TXT(x)&&r>225&&g>225&&b>225,                w(1895, 1930)), [677,1903,217,24]);
row('L2 주황숫자',bbox((r,g,b,x)=>TXT(x)&&r>210&&g>100&&g<175&&b<125,         w(1895, 1930)), null);
row('L3 연금색', bbox((r,g,b,x)=>TXT(x)&&r>215&&g>160&&g<225&&b>70&&b<160,   w(1928, 1965)), [741,1934,89,23]);

console.log('─ 보상칸 ────────────────────────────────────────────────────');
row('보상칸 금색', bbox((r,g,b,x)=>x>940&&((r>190&&g>140&&b<120)||(r>170&&g>95&&b<70)), w(1850, 1980, 940, 1079)), [948,1855,118,119]);
row('젬 시안잉크', bbox((r,g,b,x)=>x>950&&b>190&&g>165&&r<175,                          w(1875, 1955, 940, 1079)), [978,1885,58,60]);
row('수량 200',    bbox((r,g,b,x)=>x>940&&r>225&&g>225&&b>225,                          w(1950, 1995, 940, 1079)), [969,1957,75,26]);
console.log('─ 레드닷(있으면 감점) ───────────────────────────────────────');
const dot = bbox((r,g,b)=>r>180&&g<90&&b<110, w(1840, 1895, 1000, 1079));
console.log('  붉은 픽셀       : ' + (dot ? dot.n + '개 ⚠ (ref 0개 — 미완료 상태엔 레드닷 없음)' : '0개 ✅'));
