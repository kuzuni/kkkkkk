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

    /* 아치는 «격자 ± 186» 이다(120 2회차) — 격자 top = (H−820)×.5075 (4회차 재배분) */
    const spare = H - 820;
    const archTop = PT + spare * 0.5075 - 186;
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
    /* C. 아치 하변 부근 1차 차분.
       ⚠ 창을 그냥 ±40 으로 잡으면 **짧은 프레임에서 수반 상단이 창 안에 들어온다**
       (1600 → 아치 하변 1045 · 수반 상단 1035). 수반 림은 밝아서 Δ22 짜리 «급점프» 로
       잡히는데 그건 아치 절단선이 아니다. 수반 구획 위로 창을 자른다. */
    const midTop = PT + spare * 0.8675 + 516;
    const ab = Math.round(archBot);
    const yLo = ab - 40, yHi = Math.round(Math.min(ab + 40, midTop - 12));
    /* 5회차 재정의 — «행평균» 을 그대로 쓰면 석벽 켜 줄눈(주기 47px)이 아치 하변과
       우연히 겹칠 때 줄눈 점프를 «절단선» 으로 오인한다(2600 에서 실제로 y1567 에 겹쳤다).
       줄눈은 **전 폭**에 걸리므로 «아치 안쪽 − 아치 바깥» 차분을 보면 상쇄된다.
       아치만의 절단선은 안쪽에만 생기므로 이 차분에 남는다. */
    const diff = [];
    for (let y = yLo; y <= yHi; y++) {
      const inside = rowStat(y, 250, 826).mean;
      const outside = (rowStat(y, 60, 200).mean + rowStat(y, 880, 1020).mean) / 2;
      diff.push(inside - outside);
    }
    let maxJump = 0, jumpY = 0;
    const jumps = [];
    for (let i = 1; i < diff.length; i++) {
      const j = Math.abs(diff[i] - diff[i - 1]);
      jumps.push(j);
      if (j > maxJump) { maxJump = j; jumpY = yLo + i; }
    }
    /* 5회차 — 석벽 «켜 줄눈»(주기 47px)을 깐 뒤로는 창 안의 최대 급점프가 줄눈일 수도 있다.
       C 가 잡으려는 것은 «아치 하변에만 있는 전폭 절단선» 이므로,
       ⓐ 아치 하변 바로 그 자리(±3px)의 점프와 ⓑ 창 전체 점프의 중앙값을 같이 낸다.
       ⓐ ≈ ⓑ 면 아치 하변은 특별하지 않다 = 절단선이 아니다. */
    const sorted = [...jumps].sort((a, b) => a - b);
    const medJump = sorted[Math.floor(sorted.length / 2)] || 0;
    let atArch = 0;
    for (let y = ab - 3; y <= ab + 3; y++) {
      const i = y - yLo;
      if (i >= 1 && i < diff.length) atArch = Math.max(atArch, Math.abs(diff[i] - diff[i - 1]));
    }
    /* 6회차 — «절단선» 과 «접합부» 를 가른다.
       6회차에 아치 하변과 **같은 y** 에 전폭 바닥선(.rw-floor)을 깔았다(비평 P·Q 공통 처방:
       «아치가 착지하지 않는다»). 그러면 아치 안쪽은 거기서 끝나는 게 맞고, 그건 결함이 아니라
       **바닥과 만나는 접합부**다. 둘의 차이는 «바깥에도 단이 있는가» 다 —
       허공에서 잘리면 안쪽에만 단이 서고, 바닥에 닿으면 **전폭**이라 바깥에도 선다. */
    let atArchOut = 0;
    for (let y = ab - 4; y <= ab + 4; y++) {
      const o0 = (rowStat(y - 1, 60, 200).mean + rowStat(y - 1, 880, 1020).mean) / 2;
      const o1 = (rowStat(y, 60, 200).mean + rowStat(y, 880, 1020).mean) / 2;
      atArchOut = Math.max(atArchOut, Math.abs(o1 - o0));
    }
    /* D. «단색 평면» 비율 — 24×24 블록의 국소 표준편차. 비평 M 이 쓴 지표 그대로.
       ref 크롭을 같은 배율로 환산했을 때 std<1 = 24.2% · std<2 = 42.6% 였다(M 실측).
       E. 아치 «안쪽 평균 휘도» 와 «테두리 최대 기울기» — M 의 ⑤-2·⑤-4.
          안쪽이 너무 어두우면 «채워진 구조» 가 아니라 «뚫린 구멍» 으로 읽힌다. */
    let b1 = 0, b2 = 0, bT = 0;
    for (let by = PT + 4; by + 24 < PB - 4; by += 24) {
      for (let bx = 8; bx + 24 < c.width - 8; bx += 24) {
        let s = 0, s2 = 0, n = 0;
        for (let y = by; y < by + 24; y += 3) for (let x = bx; x < bx + 24; x += 3) {
          const v = lum(x, y); s += v; s2 += v * v; n++;
        }
        const sd = Math.sqrt(Math.max(0, s2 / n - (s / n) * (s / n)));
        bT++; if (sd < 1) b1++; if (sd < 2) b2++;
      }
    }
    /* 아치 안쪽 평균(슬롯이 없는 두 밴드) */
    const bandMean = (y0, y1) => { let s = 0, n = 0;
      for (let y = y0; y <= y1; y += 2) for (let x = 250; x <= 826; x += 2) { s += lum(x, y); n++; }
      return s / n; };
    const gridTop = PT + spare * 0.5075, gridBot = gridTop + 516, gridBot0 = gridBot;
    const upper = bandMean(Math.round(archTop) + 20, Math.round(gridTop) - 12);
    const lower = bandMean(Math.round(gridBot) + 12, Math.round(archBot) - 20);
    /* 테두리 기울기 — 아치 좌변 x244 / 우변 x833 을 가로지르는 행들의 최대 |dL/dx| */
    let edgeMax = 0;
    for (let y = Math.round(gridBot) + 20; y < Math.round(archBot) - 30; y += 6) {
      for (const ex of [244, 833]) {
        for (let x = ex - 14; x < ex + 14; x++) {
          const g2 = Math.abs(lum(x + 1, y) - lum(x, y));
          if (g2 > edgeMax) edgeMax = g2;
        }
      }
    }
    /* F. «전폭 무특징 띠» — 비평 S 의 지표. 행의 max−min < 25/255 이면 그 행은 사실상
       한 색이다. 그런 행이 **연속으로 몇 px** 이어지는지가 «죽은 띠» 의 길이다.
       ref 는 같은 기준으로 최장 111px(환산) 하나뿐이었다(S 실측). */
    let run = 0, runMax = 0, runAt = 0, deadRows = 0;
    for (let y = PT + 8; y < PB - 8; y++) {
      let mn = 1e9, mx = -1e9;
      for (let x = 12; x < 1068; x += 4) { const v = lum(x, y); if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx - mn < 25) { run++; deadRows++; if (run > runMax) { runMax = run; runAt = y - run + 1; } }
      else run = 0;
    }
    /* G. 아치 «안쪽» 에 에지가 있는가 — S 는 x400 의 y1210~1400 에서 검출 0 을 지적했다 */
    let archEdges = 0;
    {
      const y0 = Math.round(gridBot0) + 10, y1 = Math.round(archBot) - 20;
      for (let y = y0 + 1; y < y1; y++) {
        let a = 0; for (const x of [340, 400, 460, 620, 700]) a += Math.abs(lum(x, y) - lum(x, y - 1));
        if (a / 5 >= 2) archEdges++;
      }
    }
    return { w: c.width, h: c.height, PT, PB, archBottom: ab, arch, floor, maxJump, jumpY, medJump, atArch, atArchOut,
      runMax, runAt, deadPct: deadRows / (PB - PT - 16) * 100, archEdges,
      flat1: b1 / bT * 100, flat2: b2 / bT * 100, blocks: bT,
      archUpper: upper, archLower: lower, edgeMax };
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
  console.log(`\nC. 아치 하변 절단선 — «안−밖» 차분 기준. 하변 자리(±3px) 점프 ${f(out.atArch)} vs 창 중앙값 ${f(out.medJump)}  (창 최대 ${f(out.maxJump)} @y${out.jumpY})`);
  const junction = out.atArchOut >= 3;      /* 전폭 바닥선이 같은 자리에 있다 = 접합부 */
  const bare = out.atArch > Math.max(3, out.medJump * 2.5) && !junction;
  console.log(`   바깥(전폭) 단 ${f(out.atArchOut)} → ${junction ? '바닥선과 만나는 «접합부»' : '바깥엔 단 없음'}`);
  console.log(`   판정: ${bare ? '★ 허공 절단선 의심' : '허공 절단선 없음'}`);
  console.log(`\nD. 단색 평면 비율 (24×24 블록 ${out.blocks}개) — std<1 ${f(out.flat1)}%  ·  std<2 ${f(out.flat2)}%`);
  console.log(`   목표: std<1 < 30% (ref 환산 24.2% · M 실측)`);
  console.log(`\nE. 아치 안쪽 평균 휘도 — 슬롯 위 ${f(out.archUpper)} · 슬롯 아래 ${f(out.archLower)}   (목표 ≥ 22 — 더 어두우면 «뚫린 구멍»)`);
  console.log(`   아치 테두리 최대 기울기 ${f(out.edgeMax)} 휘도/px   (목표 ≥ 8 — 그 미만이면 «선이 없다»)`);
  console.log(`\nF. 전폭 무특징 띠 — 최장 연속 ${out.runMax}px @y${out.runAt} · 무특징 행 비율 ${f(out.deadPct)}%`);
  console.log(`   목표: 최장 < 110px (ref 최장 111px · S 실측)`);
  console.log(`\nG. 아치 «안쪽» 세로 에지 행 수 ${out.archEdges}  (0 이면 통로 안이 무텍스처 — S ⑤-3)`);
  await b.close();
})();
