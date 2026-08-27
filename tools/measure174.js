/* 작업 174 측정 — 펫 그림이 «지금» 차지하는 잉크 bbox 를 네 자리에서 잰다.
   실행: node tools/measure174.js  → docs/measure/174-펫스프라이트썸네일.md 의 근거.

   왜 스크린샷 차분인가: 이모지는 텍스트라 `getBoundingClientRect` 가 «글리프 advance 상자» 를
   돌려주고 실제 잉크와 다르다(A1 교훈 «글리프 advance 보다 좁은 박스», 94-① 캔버스 차분의 DOM 판).
   그래서 같은 자리를 «글리프 보임 / visibility:hidden» 두 장 찍어 **다른 픽셀만** 모은다.

   재는 자리 4곳:
     ① 07/26 펫 시트 장착 슬롯  `#bPet .sk-slot .sk-si`      (박스 115x70 · font-size 58)
     ② 07/26 펫 시트 카드 격자  `#bPet .sk-card .sk-ci`      (박스 156x96 · font-size 78)
     ③ 12 소환 결과 팝업 칸     `#sumw .sm-c > b`            (공용 .ifr --if-ic:64)
     ④ 21 도감 세트 카드 칸     `#collw .clb .cd > i.cdic`   (박스 66x70)
   174 는 이 잉크 대역을 그대로 «스프라이트 캔버스» 로 채운다(72 «아트 자리 규칙»). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* PNG 두 장을 받아 «다른 픽셀» 의 bbox 를 돌려준다 — 디코딩은 페이지 안 캔버스로 한다 */
const diffInk = (page, a, b) => page.evaluate(async ({ a, b }) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ib] = await Promise.all([load('data:image/png;base64,' + a), load('data:image/png;base64,' + b)]);
  const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h * 2;
  const g = cv.getContext('2d');
  g.drawImage(ia, 0, 0); g.drawImage(ib, 0, h);
  const d = g.getImageData(0, 0, w, h * 2).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, q = ((y + h) * w + x) * 4;
    const df = Math.abs(d[p] - d[q]) + Math.abs(d[p + 1] - d[q + 1]) + Math.abs(d[p + 2] - d[q + 2]);
    if (df < 24) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    n++;
  }
  return n ? { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, px: n, boxW: w, boxH: h } : null;
}, { a, b });

/* 한 요소의 «잉크» — 그 요소만 숨겨 두 장 찍는다. 부모 박스를 클립으로 쓴다. */
async function inkOf(page, sel, label) {
  const el = await page.$(sel);
  if (!el) return { label, sel, err: '요소 없음' };
  const box = await el.boundingBox();
  if (!box) return { label, sel, err: 'bbox 없음' };
  const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
  const on = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(s => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  const off = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(s => { document.querySelector(s).style.visibility = ''; }, sel);
  const ink = await diffInk(page, on, off);
  return { label, sel, box: { w: Math.round(box.width), h: Math.round(box.height) }, ink };
}

const line = r => r.err ? `${r.label}: ⚠ ${r.err}`
  : `${r.label}: 박스 ${r.box.w}x${r.box.h} · 잉크 ${r.ink ? `${r.ink.w}x${r.ink.h} @(${r.ink.x0},${r.ink.y0}) px=${r.ink.px} 중심(${(r.ink.x0 + r.ink.w / 2).toFixed(1)},${(r.ink.y0 + r.ink.h / 2).toFixed(1)})` : '없음'}`;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);

  /* 3종(bird/robo/dragon)을 보유·장착시킨다 — PET_SP 의 전 스프라이트 */
  const seeded = await p.evaluate(() => {
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
    S.eqPet = pick.map(x => x.id);
    save(); uiDirty = true;
    return pick.map(x => ({ id: x.id, sp: x.sp, tint: x.tint, g: x.g }));
  });
  console.log('시드:', JSON.stringify(seeded));

  await p.evaluate(() => { goTab('hero'); heroSubGo('pet'); });
  await p.waitForTimeout(600);
  /* 재렌더가 캔버스/노드를 갈아끼우면 두 장 사이가 어긋난다 — 캡처 동안만 얼린다(LESSONS 25-⑤) */
  await p.evaluate(() => { window.__ru174 = window.renderUI; window.renderUI = () => {}; });

  const out = [];
  out.push(await inkOf(p, '#bPet .sk-slot[data-ptun] .sk-si', '① 장착 슬롯 아이콘(.sk-si)'));
  out.push(await inkOf(p, '#bPet .sk-card:not(.lk) .sk-ci', '② 카드 아이콘 — 보유(.sk-ci)'));
  out.push(await inkOf(p, '#bPet .sk-card.lk .sk-ci', '② 카드 아이콘 — 미보유 .lk(.sk-ci)'));

  await p.evaluate(() => { window.renderUI = window.__ru174; });
  /* ③ 12 소환 결과 — 실제 소환 대신 표시 경로만 태운다(결과 구성은 106 게이트 몫) */
  await p.evaluate(() => {
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    showSummonResult('pet', 3, pick.map(it => ({ it })), null);
  });
  await p.waitForTimeout(500);
  out.push(await inkOf(p, '#sumw .sm-c > b', '③ 12 소환 결과 칸(.sm-c>b)'));
  await p.evaluate(() => { closeSummonResult && closeSummonResult(); });

  /* ④ 21 도감 «펫» 탭 */
  await p.evaluate(() => { openColl21('pet'); });
  await p.waitForTimeout(500);
  out.push(await inkOf(p, '#collw .clb .cd > i.cdic', '④ 21 도감 칸(.cdic)'));

  out.forEach(r => console.log(' ', line(r)));
  console.log('\nMEASURE174 DONE');
  await browser.close();
})();
