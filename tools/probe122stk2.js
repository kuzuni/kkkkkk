/* 작업 122 · 23회차 프로브 — **판정 없는 측정 전용**.
   «획은 광택 위» 불변식이 **마일리지 패널에서 몇 자리나 비어 있는가**를 센다.
   22회차(§27-4·27-9)가 버튼·Lv 게이지·상품 아이콘에서 세 번 같은 구멍을 메웠고,
   교훈이 «장치가 둘이면 사이에 낀 자리가 빈다» 였다 — 그래서 한 판을 통째로 훑는다.

   재는 것: 검은 잉크 마스크(기준선 L ≤ 30)를 **기준선에서 한 번만** 잡고,
   16위상에서 그 마스크의 평균 루마 Δ 를 본다. 양수 = «획이 들린다»(광택이 획 위).
   ⚠ `--jz-amp:0` 으로 얼린다 — 둥실이 섞이면 마스크가 흐르고 절반이 허깨비가 된다(§27-9).

   실행: node tools/probe122stk2.js */
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

async function measure(p, clip, key, keepMask) {
  const b64 = (await p.screenshot({ clip })).toString('base64');
  return await p.evaluate(async ([src, k, keep]) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const n = c.width * c.height, L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
    window.__stkMask = window.__stkMask || {};
    if (keep) {
      const m = []; for (let i = 0; i < n; i++) if (L[i] <= 30) m.push(i);
      window.__stkMask[k] = m;
    }
    const m = window.__stkMask[k] || [];
    let s = 0, hi = -1; for (const i of m) { s += L[i]; if (L[i] > hi) hi = L[i]; }
    return { mean: m.length ? s / m.length : 0, max: m.length ? hi : 0, mask: m.length };
  }, [b64, key, !!keepMask]);
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
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { document.getElementById('shopw').style.setProperty('--jz-amp', '0'); });
  await p.waitForTimeout(120);

  const SPOTS = [
    ['아이콘 em(잉크)', '.cn-ml>em'],
    ['게이지 .bar(검정 테 5px)', '.cn-ml>.bar'],
    ['제목 .tt(획 8px)', '.cn-ml>.tt'],
    ['수량 .ct(획 8px)', '.cn-ml>.ct'],
    ['보상줄 .rw(획 6px)', '.cn-ml>.rw'],
    ['[교환] 버튼(테 7px)', '.cn-ml>.ex'],
  ];
  const clips = await p.evaluate(sels => {
    const ml = document.querySelector('.cn-ml');
    if (ml) ml.scrollIntoView({ block: 'center' });
    return sels.map(([lab, sel]) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.y < 0 || r.y + r.height > 2280) return null;
      return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
               width: Math.round(r.width), height: Math.round(r.height) };
    });
  }, SPOTS);

  const patch = txt => p.evaluate(x => {
    let e = document.getElementById('stkprobe');
    if (!x) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = 'stkprobe'; document.head.appendChild(e); }
    e.textContent = x;
  }, txt);
  const BANDS = '.cn-ml::after,.cn-ml::before,.cn-ml>.ex::after';

  console.log('작업 122 · 23회차 프로브 — 마일리지 판 «획은 광택 위» 전수');
  console.log('(양수 Δ = 획이 들린다 · --jz-amp:0 · 16위상 4800ms)\n');

  await patch(BANDS + '{opacity:0!important}');
  await seek(p, 0);
  const base = [];
  for (let i = 0; i < SPOTS.length; i++) base.push(clips[i] ? await measure(p, clips[i], 't' + i, true) : null);
  await patch('');

  for (let i = 0; i < SPOTS.length; i++) {
    if (!clips[i]) { console.log('  · ' + SPOTS[i][0] + ' — 못 찾음/화면 밖'); continue; }
    const vs = [];
    for (let k = 0; k < 16; k++) { await seek(p, Math.round(4800 * k / 16)); vs.push(await measure(p, clips[i], 't' + i, false)); }
    const d = vs.map(v => v.mean - base[i].mean);
    const dmax = Math.max(...d), pxmax = Math.max(...vs.map(v => v.max)) - base[i].max;
    console.log('  · ' + SPOTS[i][0] + '  마스크 ' + base[i].mask + 'px · 기준 평균 ' + base[i].mean.toFixed(2));
    console.log('      Δ평균 최대 +' + dmax.toFixed(2) + '  |  화소 최대 Δ +' + pxmax.toFixed(1)
      + '  → ' + (dmax > 1 ? '⚠ 들린다' : 'OK'));
  }

  await b.close();
})();
