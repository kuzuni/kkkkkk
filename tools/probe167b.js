/* 167 진단 (2) — 「손이 화살표 자신의 잉크를 가리는가」를 **픽셀로** 잰다.
   113 교훈 4: 가리키는 연출은 이웃을 덮을 수는 있어도 **대상 자신은 덮으면 안 된다**
   (가리키는데 못 읽으면 안내가 아니다). 167 은 조건이 참인 동안 계속 떠 있으므로
   113 의 8초짜리보다 이 규칙이 더 강하게 걸린다.

   방법: 같은 프레임을 «손 없음»/«손 있음» 두 장 찍어 `#trUp` bbox 안에서 달라진 화소를 센다.
   실행: node tools/probe167b.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const OUT = path.resolve(__dirname, '../docs/review');

const READY = `Object.assign(S, DEF());
  S.trainStage = 1;
  TRAIN_STATS.forEach(k => S.lv[k] = trainCap());
  S.gold = 1e12;`;

/* PNG 를 라이브러리 없이 읽는다 — 크로미움 스크린샷은 컬러타입 2(RGB) 또는 6(RGBA).
   zlib 로 IDAT 를 풀고 필터를 되돌린다(181 교훈 ③ 과 같은 경로). */
const zlib = require('zlib');
function readPNG(buf) {
  let w = 0, h = 0, ct = 0, bd = 0, idat = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(o + 8); h = buf.readUInt32BE(o + 12); bd = buf[o + 16]; ct = buf[o + 17]; }
    if (type === 'IDAT') idat.push(buf.slice(o + 8, o + 8 + len));
    o += 12 + len;
  }
  if (bd !== 8) throw new Error('bit depth ' + bd);
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : (() => { throw new Error('color type ' + ct); })();
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, px = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(px, y * stride); prev = cur;
  }
  return { w, h, bpp, px };
}

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof trHandSync === 'function');
  await p.waitForTimeout(400);
  await p.evaluate(READY);
  await p.evaluate(() => { gmCloseAll(); openTrain(); });
  await p.waitForTimeout(900);

  const rects = await p.evaluate(() => {
    const bb = s => { const n = typeof s === 'string' ? document.querySelector(s) : s; if (!n) return null;
      const q = n.getBoundingClientRect();
      return { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; };
    return {
      app: bb('#app'), trUp: bb('#trUp'), svg: bb('#trUp>svg'), prog: bb('.tr-prog'),
      qty: bb('#trQty'), cards: bb('#trCards'), rib: bb('.tr-rib'), sheet: bb('.tr-sheet'),
      q30: bb('#trQty .q:last-child'), q30i: bb('#trQty .q:last-child i'), card0: bb('#trCards .tr-card')
    };
  });
  console.log('rect:', JSON.stringify(rects));

  /* 손 있음 */
  const withHand = await p.screenshot();
  /* 손 없음 — 같은 프레임에서 오버레이만 숨긴다(레이아웃은 1px 도 안 바뀐다) */
  await p.evaluate(() => { const h = document.getElementById('fxHand'), r = document.getElementById('fxHandR');
    if (h) h.style.visibility = 'hidden'; if (r) r.style.visibility = 'hidden'; });
  await p.waitForTimeout(120);
  const noHand = await p.screenshot();

  const A = readPNG(withHand), B = readPNG(noHand);
  const diffIn = (r) => {
    let n = 0, tot = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      if (x < 0 || y < 0 || x >= A.w || y >= A.h) continue;
      const i = (y * A.w + x) * A.bpp, j = (y * B.w + x) * B.bpp;
      tot++;
      if (Math.abs(A.px[i] - B.px[j]) > 12 || Math.abs(A.px[i + 1] - B.px[j + 1]) > 12
        || Math.abs(A.px[i + 2] - B.px[j + 2]) > 12) n++;
    }
    return { changed: n, total: tot, pct: +(n / tot * 100).toFixed(1) };
  };
  /* 링은 대상 바깥 8px 을 두르므로 «대상 안» 만 본다 — 링 자체는 안내의 일부다 */
  console.log('화살표 버튼 안 변화 :', JSON.stringify(diffIn(rects.trUp)));
  console.log('화살표 «글리프» 안   :', JSON.stringify(diffIn(rects.svg)));
  console.log('배수 x30 탭 안       :', JSON.stringify(diffIn(rects.q30)));
  console.log('배수 x30 «글자» 안   :', JSON.stringify(diffIn(rects.q30i)));
  console.log('첫 훈련 카드 안      :', JSON.stringify(diffIn(rects.card0)));
  console.log('진행바 안            :', JSON.stringify(diffIn(rects.prog)));

  fs.writeFileSync(path.join(OUT, '167-probe-hand.png'), withHand);
  console.log('캡처:', path.join(OUT, '167-probe-hand.png'), '· 콘솔 에러', errs.length);
  await browser.close();
})();
