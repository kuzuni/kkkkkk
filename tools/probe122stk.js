/* 122 22회차 §26-7 2번 — **«버튼 검은 획이 본문 광택에 들린다»(AS 5) 를 획 자체의 자로 잰다.**
 *
 * 21회차 AS: 칸1 [무료] 버튼 **아래 테두리**가 8위상에서 RGB(0,0,0) → (63,63,63)(순검정의 24.7% 손실),
 * [30회] 위 테두리도 같다. 대조로 **카드 바깥 검은 테두리 Δ0.00 · 라벨 잉크 Δ0.75** 를 들었다.
 * AT 는 이 자리를 안 쟀다(1인 · 미판정).
 *
 * §24-8 의 교훈을 그대로 적용한다 — **마스크를 «상자» 가 아니라 «획» 으로 잡는다.**
 * 알약·젬 같은 어두운 면이 섞이면 «획이 씻긴다» 가 아닌 것을 «씻긴다» 로 읽는다(19회차가 데인 자리).
 *   마스크 = ① 버튼 border-box 변에서 `bw`px 이내(테두리 링) ∩ ② **글로우를 끈 기준 프레임에서 luma < 40**
 * 그 픽셀 집합만 한 주기 16위상에서 추적해 «평균 상승 · 최대 상승» 을 낸다.
 *
 * ⚑ 22회차에 확인한 함정: **clip 을 재기 전에 `seek()` 로 등장 애니메이션을 걷어야 한다.**
 * 안 걷으면 카드가 아직 915.5×420.4(정상 980×450)라 링 마스크가 통째로 어긋난다.
 *
 * 실행: node tools/probe122stk.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

const pat = (p, txt) => p.evaluate(x => {
  let e = document.getElementById('jz122stk');
  if (!x) { if (e) e.remove(); return; }
  if (!e) { e = document.createElement('style'); e.id = 'jz122stk'; document.head.appendChild(e); }
  e.textContent = x;
}, txt);

/* 한 프레임의 링 밴드 픽셀을 [luma 배열] 로 돌려준다 (마스크는 호출자가 고른다) */
async function band(p, box, bw, iw, ih, pad) {
  const b64 = (await p.screenshot({ clip: box })).toString('base64');
  return await p.evaluate(async ([src, w, h, pad, bw]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const out = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      /* 요소 안쪽으로의 «변까지 거리» — 링(테두리) 은 0 ≤ dist < bw */
      const ix = x - pad, iy = y - pad;
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
      const dist = Math.min(ix, iy, w - 1 - ix, h - 1 - iy);
      if (dist >= bw) continue;
      const j = (y * c.width + x) * 4;
      out.push(.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]);
    }
    return out;
  }, [b64, iw, ih, pad, bw]);
}

async function measure(p, label, sel, bw, per) {
  const PAD = 2;
  await seek(p, 0);                                   /* ⚑ clip 전에 등장 애니메이션을 걷는다 */
  const clip = await p.evaluate(([s, pad]) => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.round(r.x) - pad, y = Math.round(r.y) - pad;
    const w = Math.round(r.width) + pad * 2, h = Math.round(r.height) + pad * 2;
    if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
    return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
  }, [sel, PAD]);
  if (!clip) { console.log('  ' + label.padEnd(34) + '(측정 불가)'); return null; }
  const { iw, ih, ...box } = clip;

  /* ① 기준선 — 전면 광택(.cfr::after)을 끈 프레임에서 «획» 픽셀을 고른다 */
  await pat(p, '.shp-card>.cfr::after{display:none!important}');
  await seek(p, 0);
  const base = await band(p, box, bw, iw, ih, PAD);
  await pat(p, '');
  const mask = base.map((v, i) => (v < 40 ? i : -1)).filter(i => i >= 0);
  if (!mask.length) { console.log('  ' + label.padEnd(34) + '(획 픽셀 0)'); return null; }
  const b0 = mask.reduce((s, i) => s + base[i], 0) / mask.length;

  /* ② 한 주기 16위상에서 그 픽셀들만 추적 */
  let meanHi = -1e9, pixHi = -1e9, meanAt = 0;
  for (let i = 0; i < 16; i++) {
    await seek(p, Math.round(per * i / 16));
    const v = await band(p, box, bw, iw, ih, PAD);
    const m = mask.reduce((s, k) => s + v[k], 0) / mask.length;
    const pk = Math.max(...mask.map(k => v[k] - base[k]));
    if (m > meanHi) { meanHi = m; meanAt = i; }
    if (pk > pixHi) pixHi = pk;
  }
  const r = { n: mask.length, base: +b0.toFixed(2), rise: +(meanHi - b0).toFixed(2),
              pix: +pixHi.toFixed(1), at: meanAt };
  console.log('  ' + label.padEnd(34)
    + ('획 ' + r.n + 'px').padEnd(12)
    + ('기준 루마 ' + r.base.toFixed(2)).padEnd(18)
    + ('평균 상승 +' + r.rise.toFixed(2)).padEnd(18)
    + '화소 최대 +' + r.pix.toFixed(1) + '  (위상 ' + r.at + '/16)');
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForTimeout(700);
  await p.evaluate(() => {
    openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
    S.dia = 5e6; renderShopPage();
  });
  await p.waitForTimeout(300);

  const SW = 5400;   /* 전면 광택 주기 = var(--jz-sw2) 기본값(5.4s) */
  console.log('\n전면 광택(.cfr::after · 5.4s)이 «검은 획» 을 얼마나 들어 올리는가 — 획 마스크(luma<40) 추적\n');
  console.log('대조군 — 구조적으로 보호된 자리(기대: 0)');
  await measure(p, '카드 바깥 검은 테두리(.cfr 7px)', '#shopList .shp-card:nth-child(1)>.cfr', 7, SW);
  console.log('\n문제로 등재된 자리 — 버튼 검은 테두리 6px');
  for (const [lab, sel] of [['칸1 [무료] b1', '#shopList .shp-card:nth-child(1) .cbtn.b1'],
                            ['칸1 [10회] b2', '#shopList .shp-card:nth-child(1) .cbtn.b2'],
                            ['칸1 [30회] b3', '#shopList .shp-card:nth-child(1) .cbtn.b3'],
                            ['칸4 [30회] b3', '#shopList .shp-card:nth-child(4) .cbtn.b3']]) {
    await measure(p, lab, sel, 6, SW);
  }
  console.log('\n대조군 — 이미 «광택 위» 인 자리(기대: ≈0)');
  await measure(p, '칸1 [30회] 라벨 잉크(.lab)', '#shopList .shp-card:nth-child(1) .cbtn.b3>.lab', 99, SW);
  await browser.close();
})();
