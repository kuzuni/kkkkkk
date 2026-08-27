/* 122 20회차 — 칸별 rk 를 **두 자로 동시에** 훑는다.
 *
 * 왜: ΔE 하나로만 풀면(`solve122rk.js`) 칸3(금색 면)이 rk .419 까지 눌려 **Δ루마가 7.43** 이 된다 —
 * 14회차가 «Δ10.0 = 너무 약하다» 고 올렸던 그 자리로 되돌아간다. 반대로 Δ루마 하나로만 풀면
 * 칸3 을 ×1.66 올리라고 하는데, ΔE 로는 이미 **가장 센 칸**이라 가장 튀는 링을 더 키우게 된다.
 * 두 자가 칸3 에서만 부호가 반대다 — 그래서 한쪽을 고르지 않고 **둘 다 나빠지지 않는** 값을 찾는다.
 *
 * 방법: 칸마다 rk 를 몇 점 찍어 (Δ루마, ΔE) 를 같이 재고, 표를 남긴다.
 * 배정은 이 표를 보고 «두 자의 산포 중 큰 쪽» 을 최소화하도록 고른다(스크립트가 같이 낸다).
 *
 * 측정마다 페이지를 새로 연다 — 한 페이지에서 격리를 반복하면 뒤 칸이 오염된다(solve122rk 주석).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
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

async function fresh(browser) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto(URL); await p.waitForTimeout(650);
  await p.evaluate(() => {
    openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
    S.daily.freeSum = {}; renderShopPage();
  });
  await p.waitForTimeout(350);
  return p;
}

async function measure(p, sel, per, n) {
  const clip = await p.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.round(r.x) - 14, y = Math.round(r.y) - 14;
    const w = Math.round(r.width) + 28, h = Math.round(r.height) + 28;
    if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
    return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
  }, sel);
  if (!clip) return null;
  const { iw, ih, ...box } = clip, cols = [], lum = [];
  for (let i = 0; i < n; i++) {
    await seek(p, Math.round(per * i / n));
    const b64 = (await p.screenshot({ clip: box })).toString('base64');
    const v = await p.evaluate(async ([src, w, h]) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let R = 0, G = 0, B = 0, L = 0, n2 = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (x >= 14 && x < 14 + w && y >= 14 && y < 14 + h) continue;
        if (x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2) continue;
        const j = (y * c.width + x) * 4;
        R += d[j]; G += d[j + 1]; B += d[j + 2];
        L += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n2++;
      }
      return n2 ? [[R / n2, G / n2, B / n2], L / n2] : null;
    }, [b64, iw, ih]);
    if (v) { cols.push(v[0]); lum.push(v[1]); }
  }
  const lab = ([R, G, B]) => {
    const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const r = f(R), g = f(G), b = f(B);
    const X = (.4124 * r + .3576 * g + .1805 * b) / .95047;
    const Y = (.2126 * r + .7152 * g + .0722 * b);
    const Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
    const k = t => t > .008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    return [116 * k(Y) - 16, 500 * (k(X) - k(Y)), 200 * (k(Y) - k(Z))];
  };
  const L = cols.map(lab);
  let dE = 0;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++)
    dE = Math.max(dE, Math.hypot(L[i][0] - L[j][0], L[i][1] - L[j][1], L[i][2] - L[j][2]));
  return { dE: +dE.toFixed(2), dL: +(Math.max(...lum) - Math.min(...lum)).toFixed(2) };
}

const setRk = (p, i, v) => p.evaluate(([n, val]) => {
  let e = document.getElementById('swrk');
  if (!e) { e = document.createElement('style'); e.id = 'swrk'; document.head.appendChild(e); }
  e.textContent = '#shopList .shp-card:nth-child(' + n + '){--jz-rk:' + val + ' !important}';
}, [i, v]);

(async () => {
  const GRID = [.60, .75, .90, 1.00, 1.15, 1.30];
  const browser = await launch(chromium);
  const table = {};
  for (let i = 1; i <= 5; i++) {
    const sel = '#shopList .shp-card:nth-child(' + i + ') .cbtn.b1';
    table[i] = [];
    for (const rk of GRID) {
      const p = await fresh(browser);
      await setRk(p, i, rk);
      await p.evaluate(s => {
        const st = document.createElement('style'); st.id = 'swiso';
        st.textContent = '*,*::before,*::after{animation-name:none !important}';
        document.head.appendChild(st);
        document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
        st.textContent += s + '{animation-name:jz122Ring !important}';
      }, sel);
      const m = await measure(p, sel, 900, 10);
      await p.close();
      if (m) table[i].push({ rk, ...m });
    }
    console.log('칸' + i + '  ' + table[i].map(r => 'rk' + r.rk.toFixed(2) + ':L' + r.dL + '/E' + r.dE).join('  '));
  }
  await browser.close();

  /* 배정 — 모든 조합에서 «Δ루마 산포» 와 «ΔE 산포» 중 큰 쪽을 최소화한다.
     한쪽만 좋아지고 다른 쪽이 무너지는 답(ΔE 단독 최적)이 여기서 걸러진다. */
  const idx = [0, 0, 0, 0, 0], best = { score: Infinity };
  const rec = (k, pick) => {
    if (k === 5) {
      const Ls = pick.map(r => r.dL), Es = pick.map(r => r.dE);
      const sL = Math.max(...Ls) / Math.min(...Ls), sE = Math.max(...Es) / Math.min(...Es);
      const score = Math.max(sL, sE);
      if (score < best.score) Object.assign(best, { score, sL, sE, pick: pick.slice() });
      return;
    }
    for (const r of table[k + 1]) rec(k + 1, pick.concat([r]));
  };
  rec(0, []);
  console.log('');
  console.log('두 자 동시 최소화 — Δ루마 산포 ' + best.sL.toFixed(2) + '배 · ΔE 산포 ' + best.sE.toFixed(2) + '배');
  console.log('  (기준: rk 전부 1.0 일 때 Δ루마 2.05배 · ΔE 1.40배)');
  best.pick.forEach((r, i) => console.log('  .shp-card:nth-child(' + (i + 1) + '){--jz-rk:' + r.rk
    + '}   → Δ루마 ' + r.dL + ' · ΔE ' + r.dE));
})();
