/* 작업 860 게이트 — 89 유물 소환 팝업(#relw) [3]-(가) 자로 재는 수치 (비평가 없음)
 *   ⓐ 「유물 소환」 라벨(.rw-basin>b) 이 scaleX 로 눌려 있지 않다
 *      — computed transform 에 가로 스케일 없음 · 잉크 폭이 측정표 ref(144) 의 자연폭(≈141) 급
 *   ⓑ 3열 행(216/463.5/711) 열 피치가 대칭(247.5/247.5) · 가운데 슬롯이 그룹 중심
 *   §R 되돌림 시험 — scaleX(.93) 을 도로 붙이면 폭이 준다 · 가운데를 462 로 되돌리면 비대칭이 산다
 * 근거: probe860 · 측정표 89 §「유물 소환」/§1행 · 859 2회차 CM ⑦.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1920, 2280];

let pass = 0, fail = 0; const bad = [];
function ck(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

(async () => {
  const browser = await launch(chromium);
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const geom = await page.evaluate(async () => {
        RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
        S.relic = 99999; openRelw(); void document.body.offsetHeight;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const sig = () => [...document.querySelectorAll('#relw .rw-c')].map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(1)},${q.top.toFixed(1)}`; }).join('|');
        let prev = '', same = 0, w = 0;
        while (w < 4000) { await wait(60); w += 60; const s = sig(); same = (s === prev && s) ? same + 1 : 0; prev = s; if (same >= 3) break; }
        const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
        const F = el => { const q = el.getBoundingClientRect(); return { l: (q.left - ar.left) / sc, t: (q.top - ar.top) / sc, w: q.width / sc, h: q.height / sc }; };
        const cs = [...document.querySelectorAll('#relw .rw-c')];
        const row1 = [F(cs[0]), F(cs[1]), F(cs[2])];
        const row3 = [F(cs[7]), F(cs[8]), F(cs[9])];
        const b = document.querySelector('#relw .rw-basin>b');
        const m = getComputedStyle(b).transform;      // 'none' | 'matrix(a,..)'
        const sx = m === 'none' ? 1 : parseFloat(m.slice(m.indexOf('(') + 1).split(',')[0]);
        return { sc, ar: { l: ar.left, t: ar.top }, row1, row3, sx, bRect: F(b), rwpos: RW_POS };
      });

      // 라벨 잉크 화소 자
      const measureInk = async () => {
        const br = geom.bRect;
        const clip = { x: Math.max(0, Math.round(br.l) - 10), y: Math.round(br.t) - 6, width: Math.min(1080, Math.round(br.w) + 20), height: Math.round(br.h) + 12 };
        const shot = await page.screenshot({ clip });
        return await page.evaluate(async ({ dataUrl, ox }) => {
          const img = new Image(); await new Promise(r => { img.onload = r; img.src = dataUrl; });
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          const lum = (x, y) => { const i = ((y * c.width + x) << 2); return .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; };
          let minX = 1e9, maxX = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (lum(x, y) > 170) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
          return maxX < 0 ? null : { w: maxX - minX + 1, cx: ox + (minX + maxX) / 2 };
        }, { dataUrl: 'data:image/png;base64,' + shot.toString('base64'), ox: clip.x });
      };

      ck(`[${H}] 페이지 오류 0`, errs.length === 0, errs.slice(0, 2).join(' | '));

      // ── ⓐ 라벨 ──
      ck(`[${H}] ⓐ 라벨 가로 스케일 없음 (scaleX ≈ 1)`, Math.abs(geom.sx - 1) < 1e-3, `scaleX=${geom.sx}`);
      const ink = await measureInk();
      ck(`[${H}] ⓐ 라벨 잉크 폭 ≥ 137 (자연폭 141 급 · scaleX(.93) 의 131 을 배제)`, ink && ink.w >= 137, ink ? `${ink.w}px (ref 144, ${(100 * (ink.w / 144 - 1)).toFixed(1)}%)` : 'null');
      ck(`[${H}] ⓐ 라벨 잉크 폭 ≤ 150 (ref 144 +4% 상한)`, ink && ink.w <= 150, ink ? `${ink.w}px` : 'null');
      ck(`[${H}] ⓐ 라벨 잉크 중심 540±2 (가운데 정렬 유지)`, ink && Math.abs(ink.cx - 540) <= 2, ink ? `cx=${ink.cx.toFixed(1)}` : 'null');

      // ── ⓑ 피치 (1행·3행 두 3열 행) ──
      for (const [tag, row] of [['1행', geom.row1], ['3행', geom.row3]]) {
        const L = row.map(s => s.l);
        const p0 = L[1] - L[0], p1 = L[2] - L[1];
        const gc = (L[0] + L[2] + 151) / 2, midC = L[1] + 151 / 2;
        ck(`[${H}] ⓑ ${tag} 피치 대칭 (|Δ| ≤ 0.6px)`, Math.abs(p0 - p1) <= 0.6, `${p0.toFixed(1)} / ${p1.toFixed(1)}`);
        ck(`[${H}] ⓑ ${tag} 가운데 슬롯 = 그룹 중심 (|편차| ≤ 0.6px · 462 의 −1.5 를 배제)`, Math.abs(midC - gc) <= 0.6, `편차 ${(midC - gc).toFixed(2)}px`);
        ck(`[${H}] ⓑ ${tag} 피치 247.5±1 (측정표 환산 246.7~248.9)`, Math.abs(p0 - 247.5) <= 1 && Math.abs(p1 - 247.5) <= 1, `${p0.toFixed(1)} / ${p1.toFixed(1)}`);
      }

      // ── §R 되돌림 시험 ──
      if (H === HEIGHTS[HEIGHTS.length - 1]) {
        // R1 — scaleX(.93) 을 도로 붙이면 잉크 폭이 준다 (눌림 재현)
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = 'scaleX(.93)'; void document.body.offsetHeight; });
        await page.waitForTimeout(60);
        const inkR = await measureInk();
        ck(`[${H}] §R1 scaleX(.93) 재부착 시 잉크 폭 < 137 (게이트가 헛초록 아님)`, inkR && inkR.w < 137, inkR ? `${inkR.w}px` : 'null');
        await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = ''; });
        // R2 — 소스 상수 462 되돌림은 그룹 중심에서 1.5px 벗어난다 (수식 검산 · RW_POS 원본 확인)
        const midX = geom.rwpos[1][0];
        ck(`[${H}] §R2 RW_POS 가운데 x = 463.5 (462 로 되돌리면 편차 −1.5 = 비대칭)`, Math.abs(midX - 463.5) < 1e-6, `RW_POS[1].x=${midX}`);
        const devIf462 = (462 + 151 / 2) - ((216 + 711 + 151) / 2);
        ck(`[${H}] §R2 대조 — 462 였다면 편차 ${devIf462}px`, Math.abs(devIf462 - (-1.5)) < 1e-6, `${devIf462}px`);
      }

      await ctx.close();
    }
    console.log(`\nVERIFY860  ${pass}/${pass + fail}` + (fail ? '  FAIL: ' + bad.join(' · ') : '  PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})();
