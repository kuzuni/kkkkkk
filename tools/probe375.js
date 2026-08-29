/* 작업 375 재현 프로브 — `verify122` 4건 실패의 «자리» 를 제품에게 직접 묻는다.
   실행: node tools/probe375.js  → 마지막 줄 `PROBE375 n/n`.

   338·341·350·368 규칙: 등재문의 처방을 따르기 전에 **재현**부터 한다.
   등재문 가설은 둘이다 —
     ⓐ §14·§23 의 위상 격자가 **3열 6칸**을 전제하는데 365 가 광고 상품을 **2열 4칸**으로 바꿨다.
     ⓑ §24 «재화 카드 제목 잉크 상승 5.39» 는 별개 축(광택 ↔ 제목 z).
   여기서는 둘 다 «어느 칸/어느 화소» 인지까지 좁힌다.

   §A 격자 — 칸마다 (x, y, --jz-k, 광택 delay) 를 찍고 이웃 쌍의 위상차를 원형 거리로 잰다.
        렌더가 박는 `jzK(i,rowBase)` 의 col 은 `i % 3` 이다. 광고 구획만 열이 2 이므로
        i=2,3 의 col 이 실제 열과 어긋나는지를 **좌표로** 확인한다(코드가 아니라 결과를 본다).
   §B 잉크 — §24 와 같은 자(luma<40 마스크 고정 + 한 주기 추적)를 대되,
        상승분을 **화소 위치별로** 갈라 «카드 안 / 카드 왼쪽 밖 / 카드 오른쪽 밖» 으로 나눈다.
        `.cn-cd>.hd>i` 는 `left:-30px;right:-30px` 이라 bbox 가 카드 밖으로 23px 씩 삐져나온다 —
        상승분이 밖에서 오면 «제목이 씻긴다» 가 아니라 «자가 이웃을 재고 있다» 는 뜻이다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
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
  await p.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(500);

  /* ── §A 위상 격자 ───────────────────────────────────────────── */
  console.log('§A 위상 격자 — 광고 구획의 열 수와 `--jz-k` 가 맞는가');
  const g = await p.evaluate(() => {
    const ms = v => parseFloat(v) * (/ms$/.test(String(v).trim()) ? 1 : 1000);
    const cds = [...document.querySelectorAll('#shopList .cn-cd')].map((e, i) => {
      const fr = e.querySelector(':scope>.fr');
      const s = getComputedStyle(fr || e, '::after');
      const em = e.querySelector(':scope>.pn>em');
      const se = em ? getComputedStyle(em) : null;
      const r = e.getBoundingClientRect();
      return { i, cls: e.className,
               x: Math.round(r.x), y: Math.round(r.y + window.scrollY),
               k: parseFloat(getComputedStyle(e).getPropertyValue('--jz-k')) || 0,
               dur: ms(s.animationDuration), del: ms(s.animationDelay),
               fdur: se ? ms(se.animationDuration) : 0, fdel: se ? ms(se.animationDelay) : 0 };
    });
    /* 광고 구획 = COIN_ADS 길이만큼의 앞칸 */
    return { cds, nAds: (typeof COIN_ADS !== 'undefined' ? COIN_ADS.length : -1) };
  });
  const ads = g.cds.slice(0, Math.max(0, g.nAds));
  const cols = [...new Set(ads.map(c => c.x))].sort((a, b) => a - b);
  console.log('   광고 상품 ' + g.nAds + '칸 · 실제 열 ' + cols.length + '개 (x=' + cols.join('/') + ')');
  ads.forEach(c => console.log('     ad' + c.i + ' (' + c.x + ',' + c.y + ') --jz-k=' + c.k.toFixed(4)
    + ' 광택delay=' + Math.round(c.del) + 'ms 둥실delay=' + Math.round(c.fdel) + 'ms'));
  ok(g.nAds > 0, '광고 상품 칸을 찾았다');
  ok(cols.length === 2, '365 이후 광고 구획은 2열이다 (실측 ' + cols.length + '열)');

  const ph = (del, dur) => { let v = (-del % dur) / dur; if (v < 0) v += 1; return v; };
  const dist = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };
  const pairs = (list, key) => {
    const out = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const da = key === 'fr' ? [a.del, a.dur] : [a.fdel, a.fdur];
      const db = key === 'fr' ? [b.del, b.dur] : [b.fdel, b.fdur];
      if (!da[1] || da[1] !== db[1]) continue;
      const band = (v, pitch) => { for (let n = 0; n <= 2; n++) if (Math.abs(v - n * pitch) < 40) return n; return -1; };
      const dc = band(Math.abs(a.x - b.x), 290), dr = band(Math.abs(a.y - b.y), 319);
      if (dc < 0 || dr < 0 || (dc === 0 && dr === 0) || dr > 1) continue;
      const near = (dc + dr === 1);
      out.push({ a: a.i, b: b.i, kind: dr === 0 ? (dc === 1 ? '가로' : '2열') : (dc === 0 ? '세로' : (dc === 1 ? '대각' : '2열대각')),
                 near, d: dist(ph(da[0], da[1]), ph(db[0], db[1])) });
    }
    return out;
  };
  for (const [key, label, nearLim] of [['fr', '광택(§14)', .25], ['em', '둥실(§23)', .30]]) {
    const ps = pairs(ads, key);
    const bad = ps.filter(v => v.d < (v.near ? nearLim : .16));
    console.log('   ' + label + ' 광고 구획 이웃 쌍 ' + ps.length + '개 — '
      + ps.map(v => 'ad' + v.a + '↔ad' + v.b + ' ' + v.kind + ' ' + Math.round(v.d * 100) + '%').join(' | '));
    ok(bad.length === 0, label + ' 광고 구획 이웃 쌍이 전부 문턱 이상 (미달 ' + bad.length + '쌍'
      + (bad.length ? ': ' + bad.map(v => v.kind + ' ' + Math.round(v.d * 100) + '%').join(' , ') : '') + ')');
  }

  /* ── §B §24 잉크 상승의 «자리» ───────────────────────────────── */
  console.log('§B §24 잉크 상승 — 마스크 화소가 카드 안에 있는가');
  const geo = await p.evaluate(() => {
    const t = document.querySelector('#shopList .cn-cd>.hd>i');
    const cd = t.closest('.cn-cd');
    const r = t.getBoundingClientRect(), c = cd.getBoundingClientRect();
    return { box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
             card: { x: Math.round(c.x), width: Math.round(c.width) },
             txt: t.textContent };
  });
  console.log('   제목 «' + geo.txt + '» bbox x' + geo.box.x + '..' + (geo.box.x + geo.box.width)
    + ' · 카드 x' + geo.card.x + '..' + (geo.card.x + geo.card.width)
    + ' → 왼쪽 밖 ' + (geo.card.x - geo.box.x) + 'px · 오른쪽 밖 '
    + ((geo.box.x + geo.box.width) - (geo.card.x + geo.card.width)) + 'px');
  ok(geo.box.x < geo.card.x, '`.hd>i` bbox 가 카드 왼쪽 밖으로 나간다 (left:-30px)');

  const S2 = [0, 480, 960, 1440, 1920, 2400, 2880, 3360, 3840, 4320].map(v => v + 40);
  const measure = async (geo) => {
  let mask = null, base = null, rows = [];
  for (const t of S2) {
    await seek(p, t);
    const b64 = (await p.screenshot({ clip: geo.box })).toString('base64');
    const m = await p.evaluate(async ([src, mk, cardX, cardW, boxX]) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const gg = c.getContext('2d'); gg.drawImage(img, 0, 0);
      const d = gg.getImageData(0, 0, c.width, c.height).data, n = c.width * c.height;
      const L = new Float32Array(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
      if (!mk) {
        const idx = [], zone = [];
        for (let i = 0; i < n; i++) if (L[i] < 40) {
          idx.push(i);
          const px = boxX + (i % c.width);
          zone.push(px < cardX ? 0 : (px >= cardX + cardW ? 2 : 1));
        }
        const vals = idx.map(i => L[i]);
        return { idx, zone, vals, w: c.width };
      }
      return { vals: mk.map(i => L[i]) };
    }, [b64, mask, geo.card.x, geo.card.width, geo.box.x]);
    if (!mask) { mask = m.idx; base = m.vals; rows.push({ t, vals: m.vals, zone: m.zone }); continue; }
    rows.push({ t, vals: m.vals });
  }
  const zone = rows[0].zone;
  const nz = [0, 1, 2].map(z => zone.filter(v => v === z).length);
  console.log('   마스크 ' + mask.length + '화소 — 카드 왼쪽 밖 ' + nz[0] + ' · 카드 안 ' + nz[1] + ' · 오른쪽 밖 ' + nz[2]);
  const meanZ = (vals, z) => { let s = 0, n = 0; for (let i = 0; i < vals.length; i++) if (zone[i] === z) { s += vals[i]; n++; } return n ? s / n : NaN; };
  let peak = -1e9, peakT = 0;
  for (const r of rows) { const m = r.vals.reduce((a, v) => a + v, 0) / r.vals.length; if (m > peak) { peak = m; peakT = r.t; } }
  const b0 = base.reduce((a, v) => a + v, 0) / base.length;
  console.log('   전체 상승 ' + (peak - b0).toFixed(2) + ' 루마 (t=' + peakT + 'ms · 기준 ' + b0.toFixed(2) + ')');
  for (const z of [0, 1, 2]) {
    if (!nz[z]) continue;
    const pr = rows.find(r => r.t === peakT);
    console.log('     구역' + z + '(' + ['카드 왼쪽 밖', '카드 안', '카드 오른쪽 밖'][z] + ') '
      + nz[z] + '화소 · 기준 ' + meanZ(base, z).toFixed(2) + ' → 정점 ' + meanZ(pr.vals, z).toFixed(2)
      + ' (Δ' + (meanZ(pr.vals, z) - meanZ(base, z)).toFixed(2) + ')');
  }
  /* 카드 «안» 화소만으로 다시 재면 얼마인가 — §24 가 물으려던 값 */
  let inPeak = -1e9;
  for (const r of rows) { const m = meanZ(r.vals, 1); if (m > inPeak) inPeak = m; }
  const inRise = inPeak - meanZ(base, 1);
  console.log('   카드 안 화소만: 상승 ' + inRise.toFixed(2) + ' 루마');
  return { all: peak - b0, inside: inRise, nz };
  };
  const r1 = await measure(geo);
  ok(r1.all >= 3 && r1.inside < 3,
    '§24 의 5.39 는 «카드 밖» 에서 온다 — 전체 ' + r1.all.toFixed(2) + ' vs 카드 안 ' + r1.inside.toFixed(2));

  /* ── §C 대조 — 365 이전 기하(3열 x111/401/691)로 되돌리면 같은 자가 무엇을 읽는가 ──
     저장소가 shallow 라 365 이전 커밋을 못 꺼낸다. 대신 **같은 빌드에서 열 수만** 6칸으로
     되돌려 렌더한다(`COIN_ADS.length > 4` 갈래가 3열을 고른다) — 바뀌는 변수는 «칸의 x» 하나다. */
  console.log('§C 대조 — 3열(365 이전) 기하에서 같은 자를 댄다');
  await p.evaluate(() => {
    window.__adsBak = COIN_ADS.slice();
    COIN_ADS.push(Object.assign({}, COIN_ADS[0], { id: 'zz1' }), Object.assign({}, COIN_ADS[1], { id: 'zz2' }));
    renderCoinPage(document.getElementById('shopList'));
  });
  await p.waitForTimeout(300);
  const geo3 = await p.evaluate(() => {
    const t = document.querySelector('#shopList .cn-cd>.hd>i');
    const cd = t.closest('.cn-cd');
    const r = t.getBoundingClientRect(), c = cd.getBoundingClientRect();
    return { box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
             card: { x: Math.round(c.x), width: Math.round(c.width) }, txt: t.textContent };
  });
  console.log('   3열 첫 칸 x' + geo3.card.x + ' · 제목 bbox x' + geo3.box.x + '..' + (geo3.box.x + geo3.box.width));
  const r3 = await measure(geo3);
  ok(geo3.card.x === 111, '대조가 실제로 3열 기하다 (첫 칸 x=' + geo3.card.x + ')');
  console.log('   ⇒ 2열 전체 ' + r1.all.toFixed(2) + ' / 카드안 ' + r1.inside.toFixed(2)
    + '  vs  3열 전체 ' + r3.all.toFixed(2) + ' / 카드안 ' + r3.inside.toFixed(2));
  ok(r3.inside < 3, '3열에서도 «카드 안» 잉크는 안 씻긴다 (' + r3.inside.toFixed(2) + ')');

  await b.close();
  console.log('PROBE375 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
