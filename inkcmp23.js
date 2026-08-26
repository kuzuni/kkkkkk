/* 23 — «같은 규칙으로 ref 와 캡처의 잉크 bbox 를 각각 재는» 대조 스캐너(16회차 신설, sess-0005-4811).
   d23.js 가 «한 줄» 비교라면 이 쪽은 «한 박스» 비교다. 회차마다 반복된 사고 —
   ref 는 비평가 눈금, 우리는 DOM/차분 눈금으로 재서 기준이 어긋나는 것(LESSONS 05-3) — 을 막는다.
   창(ref 좌표)과 잉크 판정 모드를 주면 두 이미지에서 같은 규칙으로 bbox 를 뽑아 Δ 를 찍는다.
   모드: dark(검정 외곽선 글자) · white(흰 글자심) · green(초록) · notbg(배경색과 다른 전부)
   사용: CAP23=docs/review/23-r17.png node inkcmp23.js '[{"n":"타이틀","x0":420,"x1":660,"y0":935,"y1":1020,"m":"dark"}]' */
const { chromium } = require('playwright');
const fs = require('fs');
const REF = '/home/user/kkkkkk/docs/ref/23-훈련-팝업.jpg';
const CAP = process.env.CAP23 || '/home/user/kkkkkk/docs/review/23-r17.png';
const OFF = +(process.env.OFF23 || 65);
const uri = f => 'data:' + (/\.png$/i.test(f) ? 'image/png' : 'image/jpeg') + ';base64,' + fs.readFileSync(f).toString('base64');
const jobs = JSON.parse(process.argv[2]);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.setContent('<canvas id=a></canvas><canvas id=b></canvas>');
  const out = await p.evaluate(async ([ru, cu, jobs, OFF]) => {
    const load = async (src, id) => { const im = new Image(); im.src = src; await im.decode();
      const c = document.getElementById(id); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      return { D: g.getImageData(0, 0, c.width, c.height).data, W: c.width }; };
    const R = await load(ru, 'a'), C = await load(cu, 'b');
    const px = (I, x, y) => { const i = (y * I.W + x) * 4; return [I.D[i], I.D[i + 1], I.D[i + 2]]; };
    const test = (m, c, j) => {
      const [r, g, bl] = c, L = (r + g + bl) / 3;
      if (m === 'dark') return L < 60;
      if (m === 'white') return r > 200 && g > 200 && bl > 195;
      if (m === 'green') return g > r + 30 && g > bl + 30;
      /* notbg: 창의 배경색(j.bg)과 «다른» 픽셀 — 색이 제각각인 아이콘(코인 등)의 bbox 용 */
      if (m === 'notbg') return Math.abs(r - j.bg[0]) + Math.abs(g - j.bg[1]) + Math.abs(bl - j.bg[2]) > (j.t || 60);
      return true;
    };
    const bbox = (I, j, dy) => {
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
      for (let y = j.y0 - dy; y <= j.y1 - dy; y++) for (let x = j.x0; x <= j.x1; x++)
        if (test(j.m, px(I, x, y), j)) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return n ? { x0, x1, y0: y0 + dy, y1: y1 + dy, w: x1 - x0 + 1, h: y1 - y0 + 1,
        cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 + dy } : null;
    };
    return jobs.map(j => ({ n: j.n, ref: bbox(R, j, 0), cap: bbox(C, j, OFF) }));
  }, [uri(REF), uri(CAP), jobs, OFF]);

  for (const r of out) {
    if (!r.ref || !r.cap) { console.log(`${r.n}: 잉크 없음 (ref=${!!r.ref} cap=${!!r.cap})`); continue; }
    const pc = (a, b2) => ((b2 - a) / a * 100).toFixed(1).padStart(5) + '%';
    console.log(`${r.n}`);
    console.log(`  ref  x${r.ref.x0}..${r.ref.x1} (w${r.ref.w}) · y${r.ref.y0}..${r.ref.y1} (h${r.ref.h}) · 중심 (${r.ref.cx}, ${r.ref.cy})`);
    console.log(`  cap  x${r.cap.x0}..${r.cap.x1} (w${r.cap.w}) · y${r.cap.y0}..${r.cap.y1} (h${r.cap.h}) · 중심 (${r.cap.cx}, ${r.cap.cy})`);
    console.log(`  Δ    w ${(r.cap.w - r.ref.w > 0 ? '+' : '') + (r.cap.w - r.ref.w)} (${pc(r.ref.w, r.cap.w)}) · h ${(r.cap.h - r.ref.h > 0 ? '+' : '') + (r.cap.h - r.ref.h)} (${pc(r.ref.h, r.cap.h)})`
      + ` · 중심 Δx ${(r.cap.cx - r.ref.cx).toFixed(1)} Δy ${(r.cap.cy - r.ref.cy).toFixed(1)}`);
  }
  await b.close();
})();
