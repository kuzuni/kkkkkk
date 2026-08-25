/* 작업 97 — 레이드 카드 썸네일 후보 스프라이트 «잉크 bbox» 실측 프로브.
   LESSONS 72-② («아트 자리 종횡비에 맞는 글리프를 먼저 재고 고른다») 를 스프라이트에 적용한 것.
   아틀라스 프레임 rect 는 트림돼 있다고 «가정» 하지 말고, 알파 bbox 를 직접 잰다.
   실행: node tools/probe97.js */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  /* file:// 의 이미지는 캔버스를 오염시켜 getImageData 가 SecurityError 를 낸다 */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 } })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    const CAND = [
      ['elves', 'blue_idle_0'], ['elves', 'blue_idle_2'], ['elves', 'blue_attack_2'],
      ['elves', 'blue_attack_3'], ['elves', 'green_idle_0'], ['elves', 'green_attack_2'],
      ['dragon', 'f0'], ['dragon', 'f3'], ['dragon', 'f6'],
      ['robo', 'Running_000'], ['robo', 'Running_005'],
      ['zombie', 'walk_000'], ['zombie', 'walk_004']
    ];
    const res = [];
    for (const [k, fn] of CAND) {
      const A = ATLAS[k], fr = A && A.f[fn];
      if (!A || !A.image || !fr) { res.push({ k, fn, err: 'no frame/image' }); continue; }
      const c = document.createElement('canvas');
      c.width = fr[2]; c.height = fr[3];
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) {
          on++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      res.push({ k, fn, src: [fr[2], fr[3]], ink: [w, h], asp: +(w / h).toFixed(3),
                 fill: +(on / (w * h)).toFixed(3) });
    }
    return res;
  });
  out.forEach(r => console.log(JSON.stringify(r)));
  await b.close();
})();
