/* 작업 72 14회차 — 액자 안 그림의 «잉크 중심» 보정값을 잰다.
 *
 * 12회차가 배율을 사이클 상수로 고정했지만, 그림은 여전히 **아틀라스 rect 중심**에 앉는다.
 * rect 는 스프라이트 시트의 칸이고 잉크가 그 칸 안에서 가운데 있으리라는 보장이 없다 —
 * `dragon/fly` 의 아이들 창(f2·f3·f4)은 용이 칸 아래쪽에 몰려 있어 액자 중심에서 24~34px 내려앉는다
 * (11회차 AB #8 +25.5 · 13회차 AD #2 c1 +24/c4 +34 · AE #3 +25.5 — 비평가 3명 독립 검출).
 *
 * 보정은 **사이클 전체의 잉크 합집합**을 액자 중심에 맞추는 상수 하나다(프레임마다 맞추면 애니가
 * 제자리걸음이 된다 — 움직임은 애니의 몫이고, 액자에 앉히는 것만 우리 몫이다).
 *
 * 값은 **원본(아틀라스) 픽셀 단위**로 낸다 — 배율 k 는 카드마다 다르고 앞으로도 바뀌므로,
 * 그리는 쪽에서 `× k` 해서 쓴다. 이 스크립트의 출력을 `index.html` 의 `TH_INKC` 표에 적는다.
 *
 * 실행: node tools/scan72c.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  /* file:// 이미지는 캔버스를 오염시켜 getImageData 가 막힌다 — 계측 전용 플래그(제품은 픽셀을 안 읽는다) */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    const seen = {}, res = [];
    const inkOf = (A, fn) => {
      const fr = A.f[fn]; if (!fr) return null;
      const t = document.createElement('canvas');
      t.width = fr[2]; t.height = fr[3];
      const g = t.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      const d = g.getImageData(0, 0, fr[2], fr[3]).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < fr[3]; y++) for (let x = 0; x < fr[2]; x++) {
        if (d[(y * fr[2] + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : { fw: fr[2], fh: fr[3], x0, y0, x1, y1 };
    };
    [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')].forEach((cv) => {
      const key = cv.dataset.thk, anim = cv.dataset.thi;
      const id = key + '/' + (anim || '#' + cv.dataset.thf);
      if (seen[id]) return;
      seen[id] = 1;
      const A = ATLAS[key]; if (!A || !A.image) return;
      const list = TH_IDLE[key + '/' + anim] || (anim && A.a[anim]) || [cv.dataset.thf];
      /* rect 를 «중심 정렬» 했을 때의 잉크 상대 좌표(원본 단위)로 합집합을 낸다 */
      let L = 1e9, T = 1e9, R = -1e9, B = -1e9, n = 0;
      for (const fn of list) {
        const k = inkOf(A, fn); if (!k) continue;
        n++;
        L = Math.min(L, k.x0 - k.fw / 2);
        R = Math.max(R, k.x1 + 1 - k.fw / 2);
        T = Math.min(T, k.y0 - k.fh / 2);
        B = Math.max(B, k.y1 + 1 - k.fh / 2);
      }
      if (!n) return;
      res.push({ id, n, ox: +(-(L + R) / 2).toFixed(2), oy: +(-(T + B) / 2).toFixed(2),
                 ink: [+(R - L).toFixed(1), +(B - T).toFixed(1)] });
    });
    return res;
  });

  console.log('/* tools/scan72c.js 실측 — 원본(아틀라스) 픽셀 단위 잉크 중심 보정 */');
  console.log('const TH_INKC = {');
  out.forEach((r) => {
    console.log(`  '${r.id}':${' '.repeat(Math.max(1, 22 - r.id.length))}[${r.ox}, ${r.oy}],`
      + `   /* ${r.n}프레임 · 잉크 합집합 ${r.ink.join('×')} */`);
  });
  console.log('};');
  await b.close();
})();
