#!/usr/bin/env node
/* 787 — 팝업 배경 «별 워터마크» 검산기.
 *
 *   node tools/star787.js
 *
 * 왜 있는가 — 5회차에 비평 G 와 J 가 **정반대**를 냈다(G «두 캡처 다 있다» · J «19 는 0개»).
 * 사람 둘이 갈리면 자로 가른다: 별 채움 #E5CAAC 와 크림 바탕 #F0D9BA 를 가르는 마스크로
 * blob 을 세어 **우리 두 화면과 레퍼런스 두 장을 같은 자로** 비교한다. J 가 옳았다.
 * 마감 실측: 우리 19 = 11개(ref 19 11) · 우리 20 = 10개(ref 20 10) · 좌표 Δ≤2px.
 *
 * 원래 검산 주석 — 별 워터마크 blob 을 우리 캡처 두 장과 레퍼런스 두 장에서 «같은 자» 로 센다.
   별 채움 #E5CAAC(229,202,172) · 크림 바탕 #F0D9BA(240,217,186) 사이를 가르는 마스크. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '../docs/review') + '/', REF = path.resolve(__dirname, '../docs/ref') + '/';
const JOBS = [
  { f: R + '787-r8-19-2280.png', nm: '우리 19 (r8)', dy: 0 },
  { f: R + '787-r8-20-2280.png', nm: '우리 20 (r8)', dy: 0 },
  { f: REF + '19-프로필-팝업.jpg', nm: 'ref  19      ', dy: 84 },
  { f: REF + '20-프로필-팝업-플레이어-스펙-정보.jpg', nm: 'ref  20      ', dy: 84 },
];
(async () => {
  const b = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 300, height: 200 } })).newPage();
  await p.goto('about:blank');
  for (const j of JOBS) {
    const mime = j.f.endsWith('.jpg') ? 'jpeg' : 'png';
    const b64 = fs.readFileSync(j.f).toString('base64');
    const r = await p.evaluate(async ({ b64, mime, dy }) => {
      const im = new Image(); im.src = `data:image/${mime};base64,` + b64; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height).data;
      /* 팝업 크림 안쪽만 본다(캡처 좌표계). 별 = 크림보다 어둡고 채도 낮은 밴드 */
      const X0 = 120, X1 = 960, Y0 = 520 + dy, Y1 = 900 + dy;
      const seen = new Uint8Array(im.width * im.height);
      const isStar = (o) => { const R = d[o], G = d[o + 1], B = d[o + 2];
        return R > 218 && R < 240 && G > 190 && G < 214 && B > 158 && B < 184; };
      const blobs = [];
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
        const idx = y * im.width + x; if (seen[idx]) continue;
        if (!isStar(idx * 4)) continue;
        let n = 0, lo = x, hi = x, top = y, bot = y; const st = [idx];
        seen[idx] = 1;
        while (st.length) { const k = st.pop(); const kx = k % im.width, ky = (k / im.width) | 0;
          n++; if (kx < lo) lo = kx; if (kx > hi) hi = kx; if (ky < top) top = ky; if (ky > bot) bot = ky;
          for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = kx + ddx, ny = ky + ddy;
            if (nx < X0 || nx > X1 || ny < Y0 || ny > Y1) continue;
            const ni = ny * im.width + nx; if (seen[ni] || !isStar(ni * 4)) continue;
            seen[ni] = 1; st.push(ni); } }
        if (n >= 250) blobs.push({ x: lo, y: top - dy, w: hi - lo + 1, h: bot - top + 1, n });
      }
      blobs.sort((a, b2) => a.y - b2.y || a.x - b2.x);
      return blobs;
    }, { b64, mime, dy: j.dy });
    console.log(`${j.nm}  별 blob **${r.length}개**` + (r.length ? '  첫 3개: ' + r.slice(0, 3).map(s => `${s.w}×${s.h}@(${s.x},${s.y})`).join(' · ') : ''));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
