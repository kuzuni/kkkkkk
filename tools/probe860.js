/* 작업 860 재현 자 — 89 유물 소환 팝업(#relw)
 *   ⓐ 「유물 소환」 라벨(.rw-basin>b) 잉크 폭이 scaleX(.93) 로 눌려 있는가 (356 폐기 관행)
 *      — 현행 vs scaleX 제거 후 vs 측정표 ref(w144×h33) 를 같은 화소 자로 잰다.
 *   ⓑ 3열 행(RW_POS 인덱스 0·2·8·9 중 3열: 216/462/711) 열 피치가 246/249 비대칭인가
 *      — ref 환산 247.8/247.8 대칭(측정표 §1행: ref x 97/208~209/320) 과 대조.
 * [3]-(가) 자로 재는 수치 — 비평가 없음. 338 규칙(처방 전 재현).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const H = 2280;

(async () => {
  const browser = await launch(chromium);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(700);

    // 상태 주입 + 팝업 오픈
    const geom = await page.evaluate(async () => {
      RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      openRelw();
      void document.body.offsetHeight;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      // 기하 정착 대기
      const sig = () => [...document.querySelectorAll('#relw .rw-c')]
        .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(1)},${q.top.toFixed(1)}`; }).join('|');
      let prev = '', same = 0, w = 0;
      while (w < 4000) { await wait(60); w += 60; const s = sig(); same = (s === prev && s) ? same + 1 : 0; prev = s; if (same >= 3) break; }

      const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
      const F = el => { const q = el.getBoundingClientRect();
        return { l: (q.left - ar.left) / sc, t: (q.top - ar.top) / sc, r: (q.right - ar.left) / sc, b: (q.bottom - ar.top) / sc, w: q.width / sc, h: q.height / sc }; };
      // 3열 슬롯 (RW_POS y=0 행: 인덱스 0·1·2) — 좌변 x
      const cs = [...document.querySelectorAll('#relw .rw-c')];
      const row1 = [cs[0], cs[1], cs[2]].map(F);            // 216 / 462 / 711 행
      const b = document.querySelector('#relw .rw-basin>b');
      const bStyle = getComputedStyle(b).transform;
      return { sc, ar: { l: ar.left, t: ar.top, w: ar.width, h: ar.height },
               row1, bRect: F(b), bStyle };
    });

    // ── ⓐ 라벨 잉크 화소 자 ── 라벨 밴드를 스크린샷해 흰 잉크(밝은 화소) 좌우·상하 끝을 잰다.
    const measureInk = async () => {
      const br = geom.bRect; // frame coords
      const clip = { x: Math.max(0, Math.round(br.l) - 10), y: Math.round(br.t) - 6,
                     width: Math.min(1080, Math.round(br.w) + 20), height: Math.round(br.h) + 12 };
      const shot = await page.screenshot({ clip });
      return await page.evaluate(async ({ dataUrl, cw, ch, ox }) => {
        const img = new Image(); await new Promise(r => { img.onload = r; img.src = dataUrl; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const lum = (x, y) => { const i = ((y * c.width + x) << 2); return .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; };
        let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          if (lum(x, y) > 170) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
        return maxX < 0 ? null : { w: (maxX - minX + 1), h: (maxY - minY + 1), cx: ox + (minX + maxX) / 2 };
      }, { dataUrl: 'data:image/png;base64,' + shot.toString('base64'), cw: clip.width, ch: clip.height, ox: clip.x });
    };

    const inkNow = await measureInk();
    // scaleX 제거하고 재측정
    await page.evaluate(() => { document.querySelector('#relw .rw-basin>b').style.transform = 'none'; void document.body.offsetHeight; });
    await page.waitForTimeout(80);
    const inkNoScale = await measureInk();

    // 출력
    const r1 = geom.row1;
    const lefts = r1.map(s => s.l);
    const pitch = [lefts[1] - lefts[0], lefts[2] - lefts[1]];
    const gc = (lefts[0] + lefts[2] + 151) / 2;       // 그룹 중심 (슬롯 폭 151)
    const midC = lefts[1] + 151 / 2;

    console.log('=== 작업 860 재현 (frameH ' + H + ') ===');
    console.log('페이지 오류:', errs.length, errs.slice(0, 3));
    console.log('\nⓐ 라벨 「유물 소환」 (.rw-basin>b) — computed transform:', geom.bStyle);
    console.log('   현행(scaleX .93)  잉크: w=' + inkNow.w + ' h=' + inkNow.h + ' cx=' + inkNow.cx.toFixed(1));
    console.log('   scaleX 제거 후    잉크: w=' + inkNoScale.w + ' h=' + inkNoScale.h + ' cx=' + inkNoScale.cx.toFixed(1));
    console.log('   측정표 ref: w=144 h=33  ⇒ 현행 폭 ' + (100 * (inkNow.w / 144 - 1)).toFixed(1) + '% · 제거후 폭 ' + (100 * (inkNoScale.w / 144 - 1)).toFixed(1) + '%');
    console.log('\nⓑ 3열 행 슬롯 좌변:', lefts.map(v => v.toFixed(1)).join(' / '));
    console.log('   피치: ' + pitch[0].toFixed(1) + ' / ' + pitch[1].toFixed(1) + '  (측정표 ref 환산 246.7/248.9, 859 대칭 247.8)');
    console.log('   그룹중심=' + gc.toFixed(2) + ' · 가운데슬롯중심=' + midC.toFixed(2) + ' ⇒ 편차 ' + (midC - gc).toFixed(2) + 'px (음수=왼쪽)');
  } finally { await browser.close(); }
})();
