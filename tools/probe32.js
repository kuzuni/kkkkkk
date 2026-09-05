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
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

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
  if (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) > 120){ edge = x; break; }
}
function vEdge(x, from, to, dir, th){
  for (let y = from; dir > 0 ? y < to : y > to; y += dir){
    const a = px(x, y - dir), b = px(x, y);
    if (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) > th) return y;   /* 전투 캔버스가 살아 움직이므로 «반투명 검정 진입» 만 잡히도록 임계값을 높인다 */
  }
  return null;
}
const top = vEdge(700, 1770, 1800, 1, 120), bot = vEdge(700, 1940, 1915, -1, 60);

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
/* 금색 마스크는 **검정 5px 테두리 안쪽**만 잡는다 → ref 기대값도 안쪽(118−10 × 119−10 @ 953,1860) 이다 */
/* ⚠ 보상칸 하단은 `200` 의 검정 외곽선이 파고들어(ref 도 그렇다) 마스크가 잘린다 →
   **좌측 기둥(x953..968)만** 훑어 세로 범위를 잰다. 가로는 상단 밴드(ref 1866~1876)에서 잰다. */
/* 라운드 코너(radius 34) 때문에 가장자리 띠에서는 금색이 안쪽으로 들어간다 —
   **직선 구간**(세로 중앙 밴드)에서만 가로 폭을 재고, 박스 자체의 기하는 `node tools/verify32.js`
   가 DOM 으로 검사한다(여기서 다시 재지 마라). */
row('보상칸 금색(중앙밴드)', bbox((r,g,b,x)=>((r>190&&g>140&&b<120)||(r>170&&g>95&&b<70)), w(1910, 1918, 940, 1079)), [953,1910,108,9]);
row('젬 시안잉크', bbox((r,g,b,x)=>x>950&&b>190&&g>165&&r<175,                          w(1875, 1955, 940, 1079)), [978,1885,58,60]);
row('수량 200',    bbox((r,g,b,x)=>x>940&&r>225&&g>225&&b>225,                          w(1950, 1995, 940, 1079)), [969,1957,75,26]);
console.log('─ 레드닷(있으면 감점) ───────────────────────────────────────');
const dot = bbox((r,g,b)=>r>180&&g<90&&b<110, w(1840, 1895, 1000, 1079));
console.log('  붉은 픽셀       : ' + (dot ? dot.n + '개 ⚠ (ref 0개 — 미완료 상태엔 레드닷 없음)' : '0개 ✅'));

/* ── 글리프 열 런 (측정표 §2-3 형식) ─────────────────────────────────────────
   `node tools/probe32.js <캡처> runs` 로 켠다. 줄마다 «열 런 = 글리프» 를 뽑고
   **각 런의 잉크 상·하단(ref y)** 을 같이 낸다 — 베이스라인 정렬을 보려면 이게 필요하다.
   ref 실측(§2-3 · 비평가 I): L1 `[`25 `미션`27 `227`23 이 **모두 같은 바닥**에 선다.        */
if (process.argv[3] === 'runs'){
  const lines = [
    ['L1 [미션-227]', (r,g,b)=>g>170&&b>150&&r<g-60,                     1845, 1890, 621, 947],
    ['L2 본문',       (r,g,b)=>(r>225&&g>225&&b>225)||(r>210&&g>100&&g<175&&b<125), 1895, 1930, 621, 947],
    ['L3 (0/10)',     (r,g,b)=>r>215&&g>160&&g<225&&b>70&&b<160,          1928, 1965, 621, 947],
    ['수량 200',      (r,g,b)=>r>225&&g>225&&b>225,                       1950, 1995, 940, 1079]
  ];
  console.log('\n─ 글리프 열 런 (런 = x0-x1 · 잉크 ref y 상..하) ────────────────');
  for (const [name, test, ry0, ry1, rx0, rx1] of lines){
    const cols = [];
    for (let x = rx0; x <= rx1; x++){
      let t = 1e9, bm = -1;
      for (let y = ry0 - OFF; y <= ry1 - OFF; y++){
        const c = px(x, y);
        if (test(c[0], c[1], c[2])){ if(y<t)t=y; if(y>bm)bm=y; }
      }
      cols.push(bm < 0 ? null : [t + OFF, bm + OFF]);
    }
    const runs = [];
    let s = -1;
    for (let i = 0; i <= cols.length; i++){
      if (cols[i] && s < 0) s = i;
      else if (!cols[i] && s >= 0){
        let t = 1e9, bm = -1;
        for (let j = s; j < i; j++){ if(cols[j][0]<t)t=cols[j][0]; if(cols[j][1]>bm)bm=cols[j][1]; }
        runs.push((rx0+s) + '-' + (rx0+i-1) + '(w' + (i-s) + ' y' + t + '..' + bm + ' h' + (bm-t+1) + ')');
        s = -1;
      }
    }
    console.log('  ' + name.padEnd(14) + runs.join(' · '));
  }
}
