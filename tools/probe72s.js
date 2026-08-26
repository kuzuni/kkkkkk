/* 작업 72(2026-08-26 주인 재지시) — 던전 카드 6장에 넣을 «실제 스프라이트» 후보 잉크 bbox 실측.
   97 `probe97.js` 의 던전판. 아틀라스 프레임 rect 가 트림돼 있다고 가정하지 말고 알파 bbox 를 직접 잰다.
   슬롯 종횡: 카드1 311×305(1.020) · 카드2 296×289(1.024) · 잠금 330×330(1.000).
   실행: node tools/probe72s.js */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 } })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);

  const out = await p.evaluate(() => {
    const res = [];
    for (const k of Object.keys(ATLAS)) {
      const A = ATLAS[k];
      if (!A.image) { res.push({ k, err: 'no image' }); continue; }
      for (const anim of Object.keys(A.a)) {
        const list = A.a[anim];
        /* 애니 안에서 프레임 3장만 표본(0 · 중간 · 끝) */
        const pick = [...new Set([0, Math.floor(list.length / 2), list.length - 1])];
        for (const idx of pick) {
          const fn = list[idx], fr = A.f[fn];
          if (!fr) continue;
          const c = document.createElement('canvas');
          c.width = fr[2]; c.height = fr[3];
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0, lum = 0;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            if (d[i + 3] > 8) {
              on++; lum += (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114);
              if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
          if (on === 0) continue;
          const w = x1 - x0 + 1, h = y1 - y0 + 1;
          res.push({ k, anim, fn, src: fr[2] + 'x' + fr[3], ink: w + 'x' + h,
                     pad: [x0, y0, fr[2] - 1 - x1, fr[3] - 1 - y1].join(','),
                     asp: +(w / h).toFixed(3), fill: +(on / (w * h)).toFixed(3),
                     lum: Math.round(lum / on) });
        }
      }
    }
    return res;
  });
  out.forEach(r => console.log(JSON.stringify(r)));
  await b.close();
})();
