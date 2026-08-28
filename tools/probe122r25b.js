/* 122 25회차 — **«어느 밴드가 사양의 정의인가» 를 못 박는 자.**
 *
 * 왜: 24회차 AY 가 마일리지 판 글로우를 **Δ16.4**(사양 22±3, −25.6%)로 재고 ②③⑤ 를 깎았다.
 *     같은 자리를 게이트 §17 은 **Δ24.3 · 바닥 56%** 로 통과시킨다. 값이 아니라 **밴드가 다르다** —
 *     §17 은 요소 테두리 «바깥 **2~14px**» 띠, AY 는 «바깥 **1~3px**» 띠다.
 *     AY 는 자 검증을 붙였다(「같은 밴드로 gm 을 재면 23.9 = 게이트 24.3 과 1.6% 일치」).
 *     → 두 밴드가 gm 에서는 맞고 마일리지에서는 갈린다면, 갈리는 이유는 **글로우의 반경 프로파일**이다.
 *       그러면 «어느 밴드가 사양의 정의인가» 를 정하지 않고 값을 고치는 것은
 *       §27-9·§28-10·§29-10 과 같은 «자 갈림» 을 하나 더 만드는 짓이다(§29-11 2번의 경고).
 *
 * 이 도구는 다섯 글로우 자리를 **두 밴드로 동시에** 재서 표로 낸다. 값을 고치지 않는다 — 판정용이다.
 *   · A 밴드 = 바깥 2~14px (§17 · 14~15회차가 Δ22±3 밴드를 세울 때 쓴 자)
 *   · B 밴드 = 바깥 1~3px (24회차 AY)
 * 덤으로 **반경 프로파일**(바깥 1px 씩 20px 까지 링별 Δ루마)을 같이 찍는다 —
 * 두 밴드가 갈리는 이유를 «해석» 이 아니라 **곡선**으로 보여 준다.
 *
 * 실행: node tools/probe122r25b.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const PAD = 36;                 /* 클립 여유 — «누출 거리»(마일리지 ~22px · 평생배너 ~40px)까지 담으려면 24px 로도 모자라다 */

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

/* 한 프레임에서 «바깥 d px 링» 별 평균 루마를 한 번에 낸다(d = 1..PAD).
   링 d = 요소 테두리에서 d−1 ~ d px 떨어진 화소들. 밴드 평균은 이 링들의 화소가중 평균이다. */
async function rings(p, box, iw, ih) {
  const b64 = (await p.screenshot({ clip: box })).toString('base64');
  return p.evaluate(async ([src, w, h, pad]) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + src)).blob());
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const sum = new Float64Array(pad + 1), cnt = new Float64Array(pad + 1);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const inx = x >= pad && x < pad + w, iny = y >= pad && y < pad + h;
      if (inx && iny) continue;                       /* 요소 면 — 뺀다 */
      /* 요소 사각형까지의 체비쇼프 거리 */
      const dx = x < pad ? pad - x : (x >= pad + w ? x - (pad + w) + 1 : 0);
      const dy = y < pad ? pad - y : (y >= pad + h ? y - (pad + h) + 1 : 0);
      const dist = Math.max(dx, dy);
      if (dist < 1 || dist > pad) continue;
      const j = (y * c.width + x) * 4;
      sum[dist] += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; cnt[dist]++;
    }
    return { sum: [...sum], cnt: [...cnt] };
  }, [b64, iw, ih, PAD]);
}

const bandMean = (r, lo, hi) => {
  let s = 0, n = 0;
  for (let d = lo; d <= hi; d++) { s += r.sum[d]; n += r.cnt[d]; }
  return n ? s / n : null;
};

async function measure(p, sel, per, n) {
  await seek(p, 0);                                  /* §17 함정 — clip 전에 등장 연출을 걷는다 */
  const clip = await p.evaluate(([s, pad]) => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.round(r.x) - pad, y = Math.round(r.y) - pad;
    const w = Math.round(r.width) + pad * 2, h = Math.round(r.height) + pad * 2;
    if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
    return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
  }, [sel, PAD]);
  if (!clip) return null;
  const { iw, ih, ...box } = clip;
  const frames = [];
  for (let i = 0; i < n; i++) {
    await seek(p, Math.round(per * i / n));
    frames.push(await rings(p, box, iw, ih));
  }
  const amp = (lo, hi) => {
    const v = frames.map(f => bandMean(f, lo, hi)).filter(x => x != null);
    return v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(2) : null;
  };
  /* 반경 프로파일 — 링 d 하나만의 Δ루마 */
  const prof = [];
  for (let d = 1; d <= 20; d++) prof.push(amp(d, d));
  /* ⚑ «봉우리 위상 누출» — AY ⑤ 가 «28px(표 ~22px, +27%)» 로 깎은 축이다.
     진폭 프로파일(위상 간 변동)로는 못 잰다 — 그건 «얼마나 흔들리나» 지 «얼마나 새나» 가 아니다.
     **글로우를 통째로 끈 기준선**과 대야 «새는 거리» 다: 진폭이 최대인 위상에서
     링 d 의 평균 루마가 기준선보다 **1루마 이상** 밝은 마지막 d.
     (§0-1 «마일리지 ~22px» 은 4회차가 «번짐 16~18px + 확산 2~3px» 로 일부러 남긴 몫의 실측값이다.) */
  const bandv = frames.map(f => bandMean(f, 1, 12));
  const peak = bandv.indexOf(Math.max(...bandv.filter(x => x != null)));
  await seek(p, Math.round(per * peak / n));
  await p.evaluate(s => {
    let e = document.getElementById('jz122r25b');
    if (!e) { e = document.createElement('style'); e.id = 'jz122r25b'; document.head.appendChild(e); }
    e.textContent = s + '{box-shadow:none!important}';
  }, sel);
  const base = await rings(p, box, iw, ih);
  await p.evaluate(() => { const e = document.getElementById('jz122r25b'); if (e) e.remove(); });
  await seek(p, Math.round(per * peak / n));
  const pkf = await rings(p, box, iw, ih);
  let leak = 0;
  for (let d = 1; d <= PAD; d++) {
    const a = pkf.cnt[d] ? pkf.sum[d] / pkf.cnt[d] : null;
    const b0 = base.cnt[d] ? base.sum[d] / base.cnt[d] : null;
    if (a != null && b0 != null && a - b0 >= 1) leak = d;
  }
  /* ⚠ §17 은 주석에 «바깥 2~14px» 이라 적혀 있지만 **코드가 실제로 세는 것은 바깥 1~12px** 이다.
     (pad 14 에서 «가장 바깥 2px» 을 빼면 남는 것은 테두리로부터 거리 1~12 이다.)
     사양 Δ22±3 을 세운 자는 «코드» 지 «주석» 이므로 둘을 나눠서 낸다. */
  return { G: amp(1, 12), A: amp(2, 14), B: amp(1, 3), prof, leak };
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
    if (typeof window.step === 'function') window.step = () => {};
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
  });
  await p.waitForTimeout(700);
  /* §17 과 같은 상태 고정 — ▶AD 뱃지가 [무료] 링 띠 안에 드나 마나로 값이 흔들린다 */
  await p.evaluate(() => {
    shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage();
    SHOP_BOXES.forEach(x => { if (freeLeft(x.b) > 0) useFreeSum(x.b); else S.daily.noAdSum[x.b] = 0; });
    renderShopPage();
  });
  await p.waitForTimeout(200);

  const rows = [];
  for (const [l, s, per] of [['강제 상자(2.8s)', '#shopList .shp-card.gm>.cfr', 2800],
                             ['[무료] 링(0.9s)', '#shopList .shp-card .cbtn.b1:not(.lack)', 900]]) {
    rows.push([l, await measure(p, s, per, 16)]);
  }
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(200);
  for (const [l, s, per] of [['마일리지 판(2.6s)', '#shopList .cn-ml', 2600],
                             ['[교환] 링(1.2s)', '#shopList .cn-ml>.ex', 1200],
                             ['[이동] 링(1.35s)', '#shopList .cn-mv', 1350]]) {
    rows.push([l, await measure(p, s, per, 16)]);
  }

  console.log('=== 글로우 진폭 — 두 밴드 대조 (한 주기 16위상) ===');
  console.log('자리                 | G: 밖 1~12px(§17 코드) | A: 밖 2~14px(§17 주석) | B: 밖 1~3px(AY) | B/G  | 누출');
  for (const [l, r] of rows) {
    if (!r) { console.log(l.padEnd(20) + ' | 측정 불가'); continue; }
    console.log(l.padEnd(20) + ' | ' + String(r.G).padStart(22) + ' | ' + String(r.A).padStart(22)
      + ' | ' + String(r.B).padStart(15) + ' | ' + (r.B / r.G).toFixed(2) + ' | ' + r.leak + 'px');
  }
  console.log('\n=== 반경 프로파일 — 바깥 d px 링 하나만의 Δ루마 ===');
  console.log('자리                 | ' + Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(5)).join(''));
  for (const [l, r] of rows) {
    if (!r) continue;
    console.log(l.padEnd(20) + ' | ' + r.prof.map(v => (v == null ? '  -  ' : v.toFixed(1).padStart(5))).join(''));
  }
  await b.close();
})();
