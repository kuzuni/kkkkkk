/* 122 20회차 — 칸별 링 보정계수 `--jz-rk` 를 **수치로 푼다**.
 *
 * 왜 푸는가: 20회차에 «ΔE 목표 / 현재 ΔE» 로 배수를 한 번에 역산했더니 거의 안 움직였다
 * (칸1 ×1.127 을 줬는데 ΔE 15.97 → 16.37, 칸3 ×0.820 에 21.96 → 21.45).
 * Δ루마는 α 에 거의 비례하지만 **ΔE 는 아니다** — ⓐ 밝은 카드 면에서는 합성값이 채널 상한(255)에
 * 붙어 피크가 안 오르고 ⓑ Lab 자체가 세제곱근 압축이라 색차가 α 보다 훨씬 천천히 는다.
 * 그래서 «한 번 나누기» 가 아니라 이분탐색으로 푼다.
 *
 * 목표: 다섯 칸의 ΔE 를 한 값으로 모은다. 목표값은 **가장 약한 칸(칸1·칸5 ≈ 15.8)** 이다 —
 * 올리는 쪽은 α 포화라 못 닿고(위 ⓐ), 내리는 쪽은 언제나 닿기 때문이다.
 * 부수 효과로 §17 이 읽는 칸1 은 rk 1.0 그대로라 Δ루마 밴드(19~25)를 건드리지 않는다.
 *
 * 쓰는 법: node tools/solve122rk.js  → 칸별 rk 를 찍는다. 그 값을 index.html 에 박는다.
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

async function isoOn(p, sel) {
  await p.evaluate(() => {
    const st = document.getElementById('slv') || document.createElement('style');
    st.id = 'slv';
    st.textContent = '*,*::before,*::after{animation-name:none !important}';
    document.head.appendChild(st);
    document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
  });
  await p.evaluate(s => {
    document.getElementById('slv').textContent += s + '{animation-name:jz122Ring !important}';
  }, sel);
}
async function isoOff(p) {
  await p.evaluate(() => {
    const s = document.getElementById('slv');
    if (s) s.textContent = '*,*::before,*::after{animation-name:none !important}';
    document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
    const s2 = document.getElementById('slv'); if (s2) s2.remove();
  });
  await p.waitForTimeout(50);
}
/* rk 를 덮어쓰는 별도 스타일(격리 스타일과 섞으면 isoOn 이 통째로 다시 쓸 때 날아간다) */
const setRk = (p, i, v) => p.evaluate(([n, val]) => {
  let e = document.getElementById('slvrk');
  if (!e) { e = document.createElement('style'); e.id = 'slvrk'; document.head.appendChild(e); }
  e.textContent = '#shopList .shp-card:nth-child(' + n + '){--jz-rk:' + val + ' !important}';
}, [i, v]);

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

/* ⚑ 20회차 함정 — 한 페이지에서 격리(isoOn/isoOff)를 반복하면 **뒤로 갈수록 값이 망가진다.**
   `seek()` 가 pause 한 애니메이션은 API 소유가 되고 cancel 로 걷어낸 뒤에도 몇 바퀴 돌면
   일부가 죽은 채 남는다(LESSONS 60-⑤ 첫 함정의 누적판). 실제로 칸1~3 은 멀쩡한데
   칸4 가 ΔE 59.7 · Δ루마 64.02 라는 허깨비를 냈다 — 같은 상태를 3번 재면 소수점까지 같으니
   **자가 흔들린 게 아니라 페이지 상태가 오염된 것**이다.
   → 한 번 잴 때마다 페이지를 새로 연다. 느리지만 이 자리는 정확도가 전부다. */
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

(async () => {
  const TARGET = +(process.argv[2] || 15.85);
  const browser = await launch(chromium);

  console.log('목표 ΔE = ' + TARGET + ' (가장 약한 칸에 맞춘다 — 올리는 쪽은 α 포화라 못 닿는다)');
  const out = [];
  for (let i = 1; i <= 5; i++) {
    const sel = '#shopList .shp-card:nth-child(' + i + ') .cbtn.b1';
    let lo = .20, hi = 1.60, best = null, bestV = null;
    const probe = async (rk, n) => {
      const p = await fresh(browser);
      await setRk(p, i, rk.toFixed(4));
      await isoOn(p, sel);
      const m = await measure(p, sel, 900, n);
      await p.close();
      return m;
    };
    for (let it = 0; it < 6; it++) {
      const mid = (lo + hi) / 2;
      const m = await probe(mid, 10);
      if (!m) { console.log('  칸' + i + ' 못 잼'); break; }
      if (best == null || Math.abs(m.dE - TARGET) < Math.abs(best - TARGET)) { best = m.dE; bestV = mid; }
      if (m.dE > TARGET) hi = mid; else lo = mid;
    }
    if (bestV != null) {
      const fin = await probe(bestV, 12);
      out.push({ i, rk: +bestV.toFixed(3), dE: fin.dE, dL: fin.dL });
      console.log('  칸' + i + '  rk ' + bestV.toFixed(3) + '  → ΔE ' + fin.dE + ' · Δ루마 ' + fin.dL);
    }
  }
  if (out.length === 5) {
    const es = out.map(o => o.dE);
    console.log('');
    console.log('ΔE 산포 ' + (Math.max(...es) / Math.min(...es)).toFixed(2) + '배');
    console.log('CSS:');
    out.forEach(o => console.log('  .shp-card:nth-child(' + o.i + '){--jz-rk:' + o.rk + '}'));
  }
  await browser.close();
})();
