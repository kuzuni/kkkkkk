/* 작업 122 · 23회차 프로브 — **판정 없는 측정 전용**.
   §27-11 1번: AU❹ «마일리지 패널 광택만 흰 잉크를 −39 로 깎는다(다른 자리는 전부 가산)».
   §15 는 «심/측엽 **비**»(r ≤ 2.4)만 보고 **부호**를 안 본다 — 그래서 이 자를 하나 더 댄다.

   재는 것(§19 와 같은 자, 호스트만 다르다):
     ⓐ 흰 잉크 화소 수(L ≥ 240) — 띠를 전부 끈 기준선 vs 16위상 최소·최대
     ⓑ 잉크 마스크 안 **평균 루마 Δ** — 기준선 대비. 음수면 «깎인다», 양수면 «가산».
     ⓒ 자리별로 따로(제목 `.tt` · 수량 `.ct` · 보상줄 `.rw` · [교환] 라벨 `.ex>i`).
   ⚠ `--jz-amp:0` 으로 얼리고 잰다 — 22회차가 «둥실이 섞이면 절반이 허깨비» 를 두 번 겪었다(§27-9).

   실행: node tools/probe122ml.js */
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

/* 클립 한 장을 페이지 안에서 디코딩해 «흰 화소 수 · 흰 마스크 평균 루마» 를 돌려준다.
   마스크는 **기준선(띠 끔)에서 한 번만** 잡아 두고 이후 위상에서 그대로 쓴다 —
   위상마다 다시 잡으면 «어두워져 마스크에서 빠진 화소» 가 평균에서도 빠져 Δ 가 0 으로 읽힌다
   (§24-8 함정의 사촌 — 22회차가 같은 자리에서 한 번 속았다). */
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
    window.__mlMask = window.__mlMask || {};
    if (keep) {
      const m = [];
      for (let i = 0; i < n; i++) if (L[i] >= 240) m.push(i);
      window.__mlMask[k] = m;
    }
    const m = window.__mlMask[k] || [];
    let white = 0; for (let i = 0; i < n; i++) if (L[i] >= 240) white++;
    let s = 0, lo = 999; for (const i of m) { s += L[i]; if (L[i] < lo) lo = L[i]; }
    return { white, mean: m.length ? s / m.length : 0, min: m.length ? lo : 0, mask: m.length };
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
  /* 얼린다 — 둥실·호흡이 섞이면 마스크가 흐른다 */
  await p.evaluate(() => { document.getElementById('shopw').style.setProperty('--jz-amp', '0'); });
  await p.waitForTimeout(120);

  const SPOTS = [
    ['제목 .tt', '.cn-ml>.tt'],
    ['수량 .ct', '.cn-ml>.ct'],
    ['보상줄 .rw', '.cn-ml>.rw'],
    ['[교환] 라벨', '.cn-ml>.ex>i'],
    /* 대조군 — 재화 카드(§19 가 지키는 자리). 여기는 «가산» 이어야 한다 */
    ['⚑ 상품 구획 헤더', '#shopList .cn-hd>i'],
    ['대조 재화카드 제목', '#shopList .cn-cd:not(.done)>.hd>i'],
  ];
  const clips = await p.evaluate(sels => {
    const hd = document.querySelector('#shopList .cn-hd');
    if (hd) hd.scrollIntoView({ block: 'center' });
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
    let e = document.getElementById('mlprobe');
    if (!x) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = 'mlprobe'; document.head.appendChild(e); }
    e.textContent = x;
  }, txt);

  /* 마일리지 패널을 덮는 띠 전부 + 대조군 띠 전부 */
  const BANDS = '.cn-ml::after,.cn-ml::before,.cn-ml>.ex::after,.cn-hd::after,.cn-hd::before,'
    + '#shopList .cn-cd>.fr::after,#shopList .cn-cd>.fr::before,#shopList .cn-cd::before';

  console.log('작업 122 · 23회차 프로브 — 마일리지 패널 광택의 «부호»');
  console.log('(--jz-amp:0 으로 얼림 · 마스크는 기준선에서 한 번만 · 16위상 4800ms)\n');

  await patch(BANDS + '{opacity:0!important}');
  await seek(p, 0);
  const base = [];
  for (let i = 0; i < SPOTS.length; i++) {
    base.push(clips[i] ? await measure(p, clips[i], 's' + i, true) : null);
  }
  await patch('');

  const runs = SPOTS.map(() => []);
  for (let k = 0; k < 16; k++) {
    await seek(p, Math.round(4800 * k / 16));
    for (let i = 0; i < SPOTS.length; i++) {
      if (clips[i]) runs[i].push(await measure(p, clips[i], 's' + i, false));
    }
  }

  for (let i = 0; i < SPOTS.length; i++) {
    const [lab] = SPOTS[i];
    if (!clips[i]) { console.log('  · ' + lab + ' — 못 찾음/화면 밖'); continue; }
    const b0 = base[i], vs = runs[i];
    const dmean = vs.map(v => v.mean - b0.mean);
    const dmin = Math.min(...dmean), dmax = Math.max(...dmean);
    const wlo = Math.min(...vs.map(v => v.white)), whi = Math.max(...vs.map(v => v.white));
    const worst = Math.min(...vs.map(v => v.min)) - b0.min;
    console.log('  · ' + lab + '  마스크 ' + b0.mask + 'px · 기준 평균 ' + b0.mean.toFixed(2));
    console.log('      Δ평균 ' + dmin.toFixed(2) + ' ~ ' + dmax.toFixed(2)
      + '  |  흰 화소 ' + b0.white + ' → ' + wlo + '~' + whi
      + ' (' + Math.round(wlo / Math.max(1, b0.white) * 100) + '%)'
      + '  |  화소 최저 Δ ' + worst.toFixed(1));
    console.log('      → ' + (dmin < -1 ? '⚠ 깎인다(음수)' : '가산(음수 없음)'));
  }

  await b.close();
})();
