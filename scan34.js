// scan34.js — PIL 없는 환경용 픽셀 스캐너 (playwright chromium 의 canvas 로 JPEG 디코드)
// 사용: node scan34.js <cmd> [args...]
//   box                       팝업 껍데기 경계 추정 (행/열 프로파일)
//   row <y> [x0] [x1]         한 행의 색 전이점 나열
//   col <x> [y0] [y1]         한 열의 색 전이점 나열
//   rect <x0> <y0> <x1> <y1>  영역 평균색·히스토그램 top
//   px <x> <y>                단일 픽셀
//   mask <x0> <y0> <x1> <y1> <mode>  마스크 bbox (mode: dark|bright|cream|notcream)
//   rowsum <x0> <y0> <x1> <y1> <mode>  행별 마스크 픽셀 수
//   colsum <x0> <y0> <x1> <y1> <mode>  열별 마스크 픽셀 수
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const IMG = process.env.SCAN_IMG || 'docs/ref/34-축복-버프팝업.jpg';

(async () => {
  const b64 = fs.readFileSync(path.resolve(IMG)).toString('base64');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const args = process.argv.slice(2);
  const out = await page.evaluate(async ([b64, args]) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const c = document.getElementById('c');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = c.width, H = c.height;
    const D = ctx.getImageData(0, 0, W, H).data;
    const P = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    const MASK = {
      dark: p => Math.max(...p) < 45,
      bright: p => Math.min(...p) > 190,
      cream: p => dist(p, [240, 217, 186]) < 60,
      notcream: p => dist(p, [240, 217, 186]) >= 60,
      pale: p => p[0] > 200 && p[1] > 185 && p[2] > 110,
      yellow: p => p[0] > 190 && p[1] > 140 && p[2] < 140 && p[0] - p[2] > 80,
      green: p => p[1] > 150 && p[1] - p[0] > 30 && p[1] - p[2] > 60,
      noty: p => !(p[0] > 180 && p[1] > 130 && p[2] < 150 && p[0] - p[2] > 70),
      mag: p => p[0] > 110 && p[0] - p[1] > 60 && p[0] - p[2] > 25 && p[2] > p[1],
      any: () => true,
    };
    const cmd = args[0];
    const N = i => parseInt(args[i], 10);
    let R = { W, H, cmd };

    if (cmd === 'box') {
      // 행별: 어두운(검정 테두리) 픽셀 최장 연속 런 + 크림 픽셀 수
      const rows = [];
      for (let y = 0; y < H; y++) {
        let run = 0, best = 0, cream = 0, bl = 0;
        for (let x = 0; x < W; x++) {
          const p = P(x, y);
          if (MASK.dark(p)) { run++; if (run > best) best = run; bl++; } else run = 0;
          if (MASK.cream(p)) cream++;
        }
        rows.push([y, best, cream, bl]);
      }
      const cols = [];
      for (let x = 0; x < W; x++) {
        let run = 0, best = 0, cream = 0;
        for (let y = 0; y < H; y++) {
          const p = P(x, y);
          if (MASK.dark(p)) { run++; if (run > best) best = run; } else run = 0;
          if (MASK.cream(p)) cream++;
        }
        cols.push([x, best, cream]);
      }
      R.rows = rows; R.cols = cols;
    } else if (cmd === 'row' || cmd === 'col') {
      const isRow = cmd === 'row';
      const fixed = N(1);
      const a = args[2] !== undefined ? N(2) : 0;
      const b = args[3] !== undefined ? N(3) : (isRow ? W - 1 : H - 1);
      const seg = [];
      let prev = null, start = a;
      for (let t = a; t <= b; t++) {
        const p = isRow ? P(t, fixed) : P(fixed, t);
        if (prev === null) { prev = p; start = t; continue; }
        if (dist(p, prev) > 26) {
          seg.push({ from: start, to: t - 1, n: t - start, rgb: prev, hex: hex(prev) });
          start = t;
        }
        prev = p;
      }
      seg.push({ from: start, to: b, n: b - start + 1, rgb: prev, hex: hex(prev) });
      R.seg = seg;
    } else if (cmd === 'rect') {
      const [x0, y0, x1, y1] = [N(1), N(2), N(3), N(4)];
      let s = [0, 0, 0], n = 0; const hist = new Map();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const p = P(x, y); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++;
        const k = p.map(v => v >> 3 << 3).join(',');
        hist.set(k, (hist.get(k) || 0) + 1);
      }
      R.mean = s.map(v => +(v / n).toFixed(1)); R.n = n;
      R.top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([k, v]) => ({ rgb: k, n: v, pct: +(100 * v / n).toFixed(1) }));
    } else if (cmd === 'map') {
      // 거친 블록 지도: <x0> <y0> <x1> <y1> <step>
      const [x0, y0, x1, y1] = [N(1), N(2), N(3), N(4)];
      const st = args[5] ? N(5) : 20;
      const lines = [];
      for (let y = y0; y <= y1; y += st) {
        let s = '';
        for (let x = x0; x <= x1; x += st) {
          let a = [0, 0, 0], n = 0;
          for (let yy = y; yy < Math.min(y + st, y1 + 1); yy++)
            for (let xx = x; xx < Math.min(x + st, x1 + 1); xx++) {
              const p = P(xx, yy); a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; n++;
            }
          const m = a.map(v => v / n);
          const [r, g, b] = m;
          let ch = '?';
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx < 50) ch = 'K';                       // 검정
          else if (mx < 100) ch = 'd';                 // 어두운 갈색
          else if (r > 215 && g > 195 && b > 160 && r - b < 75) ch = 'C'; // 크림
          else if (r > 190 && g > 140 && b < 130) ch = 'Y'; // 금/노랑
          else if (r > 130 && g < 90 && b > 60 && b < 140) ch = 'M'; // 마젠타
          else if (b > r + 20) ch = 'B';               // 파랑
          else if (g > r + 20) ch = 'G';               // 초록
          else if (mx - mn < 25) ch = 'g';             // 회색
          else ch = '.';
          s += ch;
        }
        lines.push(String(y).padStart(4) + ' ' + s);
      }
      R.map = lines;
      R.header = '     ' + (() => { let s = ''; for (let x = x0; x <= x1; x += st) s += (Math.floor(x / st) % 10 === 0 ? '|' : ' '); return s; })();
    } else if (cmd === 'raw') {
      // raw row|col <fixed> <a> <b> — 픽셀 단위 나열
      const isRow = args[1] === 'row';
      const f = N(2), a = N(3), b = N(4);
      R.raw = [];
      for (let t = a; t <= b; t++) {
        const p = isRow ? P(t, f) : P(f, t);
        R.raw.push(`${t}\t${p[0]},${p[1]},${p[2]}\t${hex(p)}`);
      }
    } else if (cmd === 'px') {
      const p = P(N(1), N(2)); R.px = { rgb: p, hex: hex(p) };
    } else if (cmd === 'mask' || cmd === 'rowsum' || cmd === 'colsum') {
      const [x0, y0, x1, y1] = [N(1), N(2), N(3), N(4)];
      const m = MASK[args[5]] || MASK.dark;
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1, cnt = 0;
      const rs = [], cs = new Array(x1 - x0 + 1).fill(0);
      for (let y = y0; y <= y1; y++) {
        let rc = 0;
        for (let x = x0; x <= x1; x++) {
          if (m(P(x, y))) {
            cnt++; rc++; cs[x - x0]++;
            if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
            if (y < by0) by0 = y; if (y > by1) by1 = y;
          }
        }
        rs.push(rc);
      }
      R.bbox = { x0: bx0, y0: by0, x1: bx1, y1: by1, w: bx1 - bx0 + 1, h: by1 - by0 + 1, n: cnt };
      if (cmd === 'rowsum') R.rows = rs.map((v, i) => [y0 + i, v]);
      if (cmd === 'colsum') R.cols = cs.map((v, i) => [x0 + i, v]);
    }
    return R;
  }, [b64, args]);
  await browser.close();

  // 출력 압축
  const cmd = out.cmd;
  if (cmd === 'box') {
    console.log(`IMG ${IMG} ${out.W}x${out.H}`);
    console.log('-- rows: y, 최장검정런, 크림수, 검정수 (변화 있는 구간만) --');
    let prev = null;
    for (const [y, run, cream, bl] of out.rows) {
      const k = `${Math.round(run / 20)},${Math.round(cream / 20)}`;
      if (k !== prev) { console.log(`y${y}\trun${run}\tcream${cream}\tblack${bl}`); prev = k; }
    }
    console.log('-- cols: x, 최장검정런, 크림수 --');
    prev = null;
    for (const [x, run, cream] of out.cols) {
      const k = `${Math.round(run / 20)},${Math.round(cream / 20)}`;
      if (k !== prev) { console.log(`x${x}\trun${run}\tcream${cream}`); prev = k; }
    }
  } else if (cmd === 'row' || cmd === 'col') {
    for (const s of out.seg) if (s.n >= 2) console.log(`${s.from}..${s.to} (${s.n}) ${s.hex} ${s.rgb}`);
  } else if (cmd === 'raw') {
    for (const l of out.raw) console.log(l);
  } else if (cmd === 'map') {
    console.log(out.header);
    for (const l of out.map) console.log(l);
  } else if (cmd === 'rowsum') {
    console.log(JSON.stringify(out.bbox));
    for (const [y, v] of out.rows) console.log(`${y}\t${v}`);
  } else if (cmd === 'colsum') {
    console.log(JSON.stringify(out.bbox));
    for (const [x, v] of out.cols) console.log(`${x}\t${v}`);
  } else {
    console.log(JSON.stringify(out, null, 1));
  }
})();
