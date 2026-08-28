/* 122 21회차 — **[무료] 링(b1) 과 보조 링(b2/b3) 의 세기 비**를 칸마다 격리로 잰다.
 *
 * 왜: 20회차 비평가 AR[5] 가 «칸3 에서 링 계층이 뒤집힌다» 고 짚었다 —
 *     b3/b1 이 칸1 .49 · 칸2 .39 · 칸4 .44 인데 **칸3 만 .88**.
 *     사양 §0-1 은 «보조 링 = [무료]의 절반» 이 설계값이라고 못박고 있으므로 판정 가능한 지적이다.
 *     CSS 상으로는 `--jz-ring` 이 .85×rk (b1) vs .28×rk (b2/b3) 라 **rk 가 약분돼** 비가 칸마다
 *     같아야 하는데, 칸3 만 rk 1.15 라 b1 쪽이 α 포화 구간에 들어가 비가 무너진 것이 가설이다.
 *
 * 방법: `solve122rk.js` 와 같은 격리 자를 쓴다 — 한 번 잴 때마다 페이지를 새로 열고(20회차 함정),
 *       그 버튼 하나만 애니메이션을 켠 뒤 한 주기(0.9s)를 n등분해 버튼 **바깥 테두리 띠**의
 *       평균색·평균루마를 찍어 Δ루마(최대−최소)와 ΔE(최대 쌍거리)를 낸다.
 *
 * 실행: node tools/probe122r21.js [n표본=12]
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

/* 그 버튼 하나만 켠다. b1 은 jz122Ring · b2/b3 은 jz122RingP 로 이름이 다르다 */
async function isoOn(p, sel, anim) {
  await p.evaluate(() => {
    const st = document.getElementById('slv') || document.createElement('style');
    st.id = 'slv';
    st.textContent = '*,*::before,*::after{animation-name:none !important}';
    document.head.appendChild(st);
    document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
  });
  await p.evaluate(([s, a]) => {
    document.getElementById('slv').textContent += s + '{animation-name:' + a + ' !important}';
  }, [sel, anim]);
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
        if (x >= 14 && x < 14 + w && y >= 14 && y < 14 + h) continue;   /* 버튼 안쪽은 뺀다 */
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
  const N = +(process.argv[2] || 12);
  const browser = await launch(chromium);
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const base = '#shopList .shp-card:nth-child(' + i + ') ';
    const out = {};
    for (const [key, sel, anim] of [['b1', base + '.cbtn.b1', 'jz122Ring'],
                                    ['b3', base + '.cbtn.b3', 'jz122RingP']]) {
      const p = await fresh(browser);
      await isoOn(p, sel, anim);
      out[key] = await measure(p, sel, 900, N);
      await p.close();
    }
    if (!out.b1 || !out.b3) { console.log('  칸' + i + ' 못 잼'); continue; }
    rows.push({ i, b1: out.b1, b3: out.b3,
                rL: out.b3.dL / out.b1.dL, rE: out.b3.dE / out.b1.dE });
  }
  console.log('\n칸 | b1 Δ루마 / ΔE | b3 Δ루마 / ΔE | b3÷b1 (루마) | b3÷b1 (ΔE)');
  rows.forEach(r => console.log('  ' + r.i + ' | ' + r.b1.dL.toFixed(2) + ' / ' + r.b1.dE.toFixed(2)
    + ' | ' + r.b3.dL.toFixed(2) + ' / ' + r.b3.dE.toFixed(2)
    + ' | ' + r.rL.toFixed(3) + ' | ' + r.rE.toFixed(3)));
  if (rows.length) {
    const rl = rows.map(r => r.rL);
    console.log('\n설계값 0.50 — 루마비 산포 ' + Math.min(...rl).toFixed(3) + ' ~ ' + Math.max(...rl).toFixed(3)
      + ' (' + (Math.max(...rl) / Math.min(...rl)).toFixed(2) + '배)');
  }
  await browser.close();
})();
