/* 122 21회차 — 칸2·칸5 [무료] 링의 `--jz-rk` 를 몇 점 찍어 (Δ루마, ΔE) 를 **같이** 재는 스윕.
 *
 * 왜 이 두 칸만: 21회차 비평가 AT 와 자체 격리 실측이 **독립으로** «칸3·칸5 가 규약 밴드
 * (Δ루마 19~25) 아래» 라고 읽었다. 칸3 은 §26-2 에서 α 로는 못 올린다는 것이 확정됐다(포화).
 * 남은 것이 칸5 다 — 그리고 칸5 는 **ΔE 도 다섯 칸 중 최저**(14.80)라, 올리면 두 자가 **같이**
 * 좋아질 수 있는 유일한 자리다(20회차가 겪은 «한 자를 고치면 다른 자가 무너진다» 의 반대 경우).
 * 칸2 는 두 자가 갈리는지 확인하는 대조군이다(Δ루마 19.32 = 밴드 하한 근처 · ΔE 18.65 = 중상위).
 *
 * ⚠ 칸1 은 스윕 대상이 아니다 — 게이트 §17 이 [무료] 링을 칸1 로 재므로 rk 1.0 고정이다(20회차).
 * ⚠ 한 번 잴 때마다 페이지를 새로 연다(20회차 오염 함정).
 *
 * 실행: node tools/sweep122r21.js
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
const setRk = (p, i, v) => p.evaluate(([n, val]) => {
  let e = document.getElementById('slvrk');
  if (!e) { e = document.createElement('style'); e.id = 'slvrk'; document.head.appendChild(e); }
  e.textContent = '#shopList .shp-card:nth-child(' + n + ') .cbtn.b1:not(.lack){--jz-ring:calc(.85 * ' + val + ') !important}';
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

async function fresh(browser) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto(URL); await p.waitForTimeout(650);
  await p.evaluate(() => {
    openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
    S.daily.freeSum = {}; S.dia = 5e6; renderShopPage();
  });
  await p.waitForTimeout(350);
  return p;
}

(async () => {
  const browser = await launch(chromium);
  const RKS = [0.60, 0.75, 0.90, 1.00, 1.15, 1.30];
  console.log('\n칸 · rk →  Δ루마 / ΔE      ※ 밴드 Δ루마 19~25 · 현재 ΔE 대역 14.8~21.2\n');
  for (const i of [2, 5]) {
    const sel = '#shopList .shp-card:nth-child(' + i + ') .cbtn.b1';
    const line = [];
    for (const rk of RKS) {
      const p = await fresh(browser);
      await setRk(p, i, rk.toFixed(3));
      await isoOn(p, sel);
      const m = await measure(p, sel, 900, 12);
      await p.close();
      line.push(m ? rk.toFixed(2) + ': ' + m.dL.toFixed(2) + '/' + m.dE.toFixed(2) : rk.toFixed(2) + ': —');
    }
    console.log('  칸' + i + '  ' + line.join('   '));
  }
  console.log('\n※ 두 자가 같은 방향으로 오르는 칸만 손댈 값이 있다. 한쪽만 오르면 20회차가 걸러 낸 답이다.');
  await browser.close();
})();
