/* 122 21회차 — «글로우 진폭 Δ루마 22±3» 규약이 **재는 창(window)에 얼마나 좌우되는가**.
 *
 * 왜: 21회차 비평가 AT 가 73 강제 상자 글로우를 **테두리 바깥 4~16px** 띠로 재어 Δ**14.4** 를 내고
 *     «규약 22±3 대비 −35%» 로 감점했다. 그런데 게이트 §17 은 **같은 연출을 2~14px 띠**로 재어
 *     Δ**24.3**(밴드 안)을 낸다. 두 자가 1.7배 갈린다.
 *     §17 의 자는 임의가 아니라 **14회차가 규약 22±3 을 정의할 때 쓴 그 자**다 —
 *     즉 «규약 위반» 판정은 그 자로만 성립한다. 이 프로브는 창을 바꿔 가며 재서
 *     ① 두 값이 정말 창 때문에 갈리는지 ② [무료] 링(좁은 파문)과 gm(넓은 글로우)의
 *     창 민감도가 다른지를 **같은 실행에서** 보인다.
 *
 * 실행: node tools/probe122gm.js
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

/* 바깥 여백 PAD 를 넉넉히 잡아 두고, 띠 [lo,hi) 는 읽을 때 고른다 —
   한 번 찍은 프레임을 여러 창으로 재야 «창만 다르다» 가 성립한다. */
const PAD = 30;

async function amp(p, sel, per, n, wins) {
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
  const series = wins.map(() => []);
  for (let i = 0; i < n; i++) {
    await seek(p, Math.round(per * i / n));
    const b64 = (await p.screenshot({ clip: box })).toString('base64');
    const vals = await p.evaluate(async ([src, w, h, pad, ws]) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      return ws.map(([lo, hi]) => {
        let s = 0, n2 = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          /* 요소 바깥으로의 거리(맨해튼이 아니라 «가장 가까운 변까지») */
          const dx = x < pad ? pad - x : (x >= pad + w ? x - (pad + w - 1) : 0);
          const dy = y < pad ? pad - y : (y >= pad + h ? y - (pad + h - 1) : 0);
          const dist = Math.max(dx, dy);
          if (dist < lo || dist >= hi) continue;
          const j = (y * c.width + x) * 4;
          s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n2++;
        }
        return n2 ? s / n2 : null;
      });
    }, [b64, iw, ih, PAD, wins]);
    vals.forEach((v, k) => { if (v != null) series[k].push(v); });
  }
  return series.map(v => v.length
    ? { d: +(Math.max(...v) - Math.min(...v)).toFixed(2),
        floor: +((Math.min(...v) - 0) / (Math.max(...v) || 1)).toFixed(3) }
    : null);
}

(async () => {
  const WINS = [[1, 14], [2, 14], [4, 16], [2, 20], [2, 26], [1, 30]];
  const browser = await launch(chromium);
  console.log('\n창(요소 바깥 거리 px) → Δ루마   ※ 규약 «22±3» 은 §17 의 «2~14px» 창 + «무료 소진» 상태에서 정의됐다\n');
  console.log('상태 · 연출'.padEnd(46) + WINS.map(w => (w[0] + '~' + w[1]).padStart(9)).join(''));
  /* free = 무료 횟수가 남은 상태(21회차 납품 캡처가 이 상태다) · used = §17 의 상태(무료 소진 + ▶AD 뱃지) */
  for (const st of ['free', 'used']) {
    const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(700);
    await p.evaluate(s => {
      openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
      S.dia = 5e6;
      /* ⚑ §17 과 **같은 상태**로 맞춰야 값이 맞는다 — 상태가 다르면 같은 창으로 재도 어긋난다. */
      if (s === 'free') S.daily.freeSum = {};
      else SHOP_BOXES.forEach(x => { if (freeLeft(x.b) > 0) useFreeSum(x.b); else S.daily.noAdSum[x.b] = 0; });
      renderShopPage();
    }, st);
    await p.waitForTimeout(350);
    const gmSel = await p.evaluate(() =>
      document.querySelector('#shopList .shp-card.gm>.cfr') ? '#shopList .shp-card.gm>.cfr' : null);
    const targets = [
      ['73 강제 상자 글로우(2.8s · 번짐 20~23px)', gmSel, 2800],
      ['[무료] 링 칸1(0.9s · 좁은 파문)',
        st === 'free' ? '#shopList .shp-card:nth-child(1) .cbtn.b1'
                      : '#shopList .shp-card .cbtn.b1:not(.lack)', 900]
    ];
    for (const [name, sel, per] of targets) {
      const label = (st + ' · ' + name).padEnd(46);
      if (!sel) { console.log(label + '  (해당 카드 없음)'); continue; }
      const r = await amp(p, sel, per, 16, WINS);
      if (!r) { console.log(label + '  (프레임 밖)'); continue; }
      console.log(label + r.map(v => (v ? v.d.toFixed(2) : '—').padStart(9)).join(''));
    }
    await p.close();
  }
  console.log('\n해석: 같은 창에서도 «상태» 가 다르면 값이 갈린다. 그리고 창을 바꾸면 좁은 파문은 희석되고');
  console.log('      넓은 글로우는 잘린다 — 자를 맞추기 전에는 «규약 위반» 을 판정할 수 없다.');
  await browser.close();
})();
