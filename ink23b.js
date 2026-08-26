/* 23 — «잉크 bbox 범용 스캐너»(16회차 신설, sess-0005-4811).
   ink23.js 가 카드 아이콘 하나만 재는 전용 스캐너인 반면 이 쪽은 **셀렉터를 받아** 아무 요소나 잰다.
   방법: 정상 스크린샷 A · 그 요소만 visibility:hidden 한 스크린샷 B 를 픽셀 차분 → 바뀐 픽셀의 bbox.
   글리프 잉크(스트로크 포함)의 실bbox 라서 «폰트 크기 비율»(②⑥) 지적을 수치로 확정하는 데 쓴다.
   사용: node ink23b.js '.tr-head>i' '.tr-rib>u' '.tr-card:nth-child(1)>.cb>s'
   출력 y 는 **ref 절대 좌표**(캡처 y + 65). */
const { chromium } = require('playwright');
const path = require('path');
const OFF = +(process.env.OFF23 || 65);
const SELS = process.argv.slice(2);
if (!SELS.length) { console.log('셀렉터를 하나 이상 넘겨라'); process.exit(1); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
    gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1,
    lv: { atk: 98 }, buyQty: 1, autoBuy: false, tuto: 3,
    seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 } })));
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { openTrain(); });
  await p.waitForTimeout(600);
  /* 유휴 루프가 값을 바꾸면 차분이 오염된다 — 렌더 루프를 멈춘다 */
  await p.evaluate(() => { window.__stop = 1; if (window.renderTrainLive) window.renderTrainLive = () => {}; });

  const A = (await p.screenshot()).toString('base64');
  const shots = { A };
  const rects = [];
  for (let i = 0; i < SELS.length; i++) {
    rects.push(await p.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }, SELS[i]));
    await p.evaluate(s => { const el = document.querySelector(s); if (el) el.style.visibility = 'hidden'; }, SELS[i]);
    shots['B' + i] = (await p.screenshot()).toString('base64');
    await p.evaluate(s => { const el = document.querySelector(s); if (el) el.style.visibility = ''; }, SELS[i]);
  }

  const out = await p.evaluate(async ([shots, sels, rects]) => {
    const load = async src => { const im = new Image(); im.src = 'data:image/png;base64,' + src; await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, c.width, c.height).data; };
    const W = 1080, H = 2280;
    const A = await load(shots.A);
    const res = [];
    for (let i = 0; i < sels.length; i++) {
      const B = await load(shots['B' + i]);
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
      /* 배경(전투 캔버스·HUD)이 두 샷 사이에 계속 움직이므로 **요소 rect ±60px 창** 안에서만 센다 */
      const r = rects[i] || { x: 0, y: 0, w: W, h: H };
      const PAD = 60;
      const ya = Math.max(0, r.y - PAD), yb = Math.min(H - 1, r.y + r.h + PAD);
      const xa = Math.max(0, r.x - PAD), xb = Math.min(W - 1, r.x + r.w + PAD);
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const j = (y * W + x) * 4;
        if (Math.abs(A[j] - B[j]) + Math.abs(A[j + 1] - B[j + 1]) + Math.abs(A[j + 2] - B[j + 2]) > 24) {
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      res.push({ sel: sels[i], n, x0, x1, y0, y1 });
    }
    return res;
  }, [shots, SELS, rects]);

  for (const r of out) {
    if (r.n === 0) { console.log(r.sel.padEnd(34) + ' — 잉크 0 (요소 없음/투명)'); continue; }
    console.log(r.sel.padEnd(34)
      + ` x${r.x0}..${r.x1} (w${r.x1 - r.x0 + 1})`
      + ` · y${r.y0 + OFF}..${r.y1 + OFF} (h${r.y1 - r.y0 + 1})`
      + ` · 중심 (${((r.x0 + r.x1) / 2).toFixed(1)}, ${((r.y0 + r.y1) / 2 + OFF).toFixed(1)})`);
  }
  await b.close();
})();
