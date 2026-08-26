/* 작업 122 — «평생배너» 측정점 진단 (11회차 신설).
   증상: `node tools/verify122.js` 가 §13 에서 평생배너만 **ΔL 79 (밴드 26~39) · duty 22% (하한 55%)**
   로 두 항목을 떨군다. 나머지 18개 측정점은 전부 통과한다.
   10회차 기록(§15-4)은 같은 자리를 «83%» 로 적어 뒀는데, **10회차 커밋(e9a7e88)을 그대로 체크아웃해
   돌려도 지금 79/22% 가 나온다** — 즉 남의 구간이 깬 회귀가 아니라 122 자신의 문제이거나,
   측정이 환경에 따라 흔들리는 것이다. 어느 쪽인지 눈으로 보지 말고 숫자로 가른다.

   재는 것 (verify122 의 bandPeak 와 **같은 방식**으로 재현한 뒤 내부를 열어 본다):
     ① 기준 프레임(띠 opacity:0)의 클립 안 휘도 히스토그램 상위 5개 bin 과 최빈값(mode)
     ② 그 mode ±12 «평탄면» 이 클립의 몇 %를 차지하는가 + 평탄면 픽셀의 bbox
     ③ 위상 18개 각각의 ΔL(상위 2% 중앙값)과, 그 상위 2% 픽셀이 **클립 어디에 있는가**(bbox·중심)
     ④ 대조군으로 «상품 밴드»(.cn-hd, 통과 중인 측정점)를 같은 방식으로 찍어 비교

   실행: node tools/probe122a.js
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + require('path').resolve(__dirname, '../index.html');

const PHASES = Array.from({ length: 18 }, (_, i) => i * 200);

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const n = a.animationName || '';
    if (/^jz122/.test(n)) { try { a.pause(); a.currentTime = t; } catch (_) {} }
  });
}, ms);

/* verify122 의 lumaOf 와 같은 계산. store 일 때는 기준면을 저장하고 히스토그램을 돌려준다. */
async function luma(p, ms, clip, store) {
  await seek(p, ms);
  const b64 = (await p.screenshot({ clip })).toString('base64');
  return await p.evaluate(async ([src, keep]) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('decode')); img.src = 'data:image/png;base64,' + src; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const n = c.width * c.height, L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
    if (keep) {
      window.__pBase = L; window.__pW = c.width; window.__pH = c.height;
      const hh = new Int32Array(256);
      for (let i = 0; i < n; i++) hh[Math.min(255, Math.round(L[i]))]++;
      let mode = 0; for (let v = 0; v < 256; v++) if (hh[v] > hh[mode]) mode = v;
      window.__pMode = mode;
      const top = [...hh].map((c, v) => [v, c]).sort((a, b) => b[1] - a[1]).slice(0, 5);
      /* 평탄면(mode ±12) 의 넓이와 bbox */
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, cnt = 0;
      for (let i = 0; i < n; i++) {
        if (Math.abs(L[i] - mode) > 12) continue;
        cnt++;
        const x = i % c.width, y = (i / c.width) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return { mode, top, w: c.width, h: c.height, flatPct: +(100 * cnt / n).toFixed(1),
               flatBox: [x0, y0, x1, y1], flatN: cnt };
    }
    const B = window.__pBase, M = window.__pMode, W = window.__pW;
    if (!B || B.length !== n) return null;
    const sig = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(B[i] - M) > 12) continue;
      sig.push([L[i] - B[i], i]);
    }
    if (!sig.length) return null;
    sig.sort((x, y) => Math.abs(y[0]) - Math.abs(x[0]));
    const k = Math.max(1, Math.round(sig.length * 0.02));
    const win = sig.slice(0, k);
    const dl = +win[Math.floor(k / 2)][0].toFixed(1);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, sx = 0, sy = 0;
    for (const [, i] of win) {
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      sx += x; sy += y;
    }
    return { dl, k, box: [x0, y0, x1, y1], cx: Math.round(sx / k), cy: Math.round(sy / k) };
  }, [b64, !!store]);
}

async function probe(p, label, hostSel, testSel) {
  const clip = await p.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
    return { x, y, width: Math.min(Math.round(r.width), innerWidth - x), height: Math.min(Math.round(r.height), innerHeight - y) };
  }, hostSel);
  if (!clip) { console.log(label + ' — 호스트 못 찾음'); return; }
  await p.waitForTimeout(150);
  const css = x => p.evaluate(t => {
    let e = document.getElementById('p122');
    if (!t) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = 'p122'; document.head.appendChild(e); }
    e.textContent = t + '{opacity:0!important}';
  }, x);

  await css(testSel);
  const base = await luma(p, 0, clip, true);
  await css('');

  console.log('\n=== ' + label + '  clip ' + clip.width + '×' + clip.height + ' @(' + clip.x + ',' + clip.y + ')');
  console.log('  기준면 mode=' + base.mode + '  평탄면 ' + base.flatPct + '% (' + base.flatN + 'px) bbox=' + base.flatBox.join(','));
  console.log('  휘도 상위 bin: ' + base.top.map(([v, c]) => v + '(' + c + ')').join(' '));
  const rows = [];
  for (const t of PHASES) {
    const r = await luma(p, t, clip);
    rows.push([t, r]);
  }
  const lit = rows.filter(([, r]) => r && Math.abs(r.dl) >= 12).length;
  let peak = 0;
  rows.forEach(([, r]) => { if (r && Math.abs(r.dl) > Math.abs(peak)) peak = r.dl; });
  console.log('  peak=' + peak + '  duty=' + Math.round(100 * lit / rows.length) + '% (' + lit + '/' + rows.length + ')');
  console.log('  위상별 ΔL / 상위2% 중심(x,y) / bbox:');
  for (const [t, r] of rows) {
    if (!r) { console.log('    t=' + String(t).padStart(4) + '  측정 불가'); continue; }
    console.log('    t=' + String(t).padStart(4) + '  ΔL=' + String(r.dl).padStart(7)
      + '  n=' + String(r.k).padStart(5) + '  중심=(' + String(r.cx).padStart(4) + ',' + String(r.cy).padStart(3) + ')'
      + '  bbox=' + r.box.join(',') + (Math.abs(r.dl) >= 12 ? '  ●' : ''));
  }
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
  await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('shopw').style.setProperty('--jz-amp', '0'));

  /* 12회차 — 인자로 소환 탭 본문 측정점을 직접 파고들 수 있게 한다 */
  if (process.argv[2] === 'sum') {
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('shopw').style.setProperty('--jz-amp', '0'));
    const BD = '#shopList .shp-card>.cbg>.jzs::after';
    const HD = '#shopList .shp-card>.chd::after';
    const FR = '#shopList .shp-card>.cfr::after';
    /* ① 게이트와 똑같이 — 전면만 뮤트 */
    await p.evaluate(t => { let e = document.createElement('style'); e.id = 'pmute'; e.textContent = t + '{opacity:0!important}'; document.head.appendChild(e); }, FR);
    await probe(p, '소환 본문3 — 게이트와 동일(전면만 뮤트)', '#shopList .shp-card:nth-child(3)>.cbg', BD);
    /* ② 헤더 띠까지 뮤트하면 달라지는가 */
    await p.evaluate(t => { document.getElementById('pmute').textContent = t + '{opacity:0!important}'; }, FR + ',' + HD);
    await probe(p, '소환 본문3 — 헤더 띠까지 뮤트', '#shopList .shp-card:nth-child(3)>.cbg', BD);
    await b.close(); return;
  }
  await probe(p, '평생배너 (.cn-a2)  ✗ FAIL 중', '#shopList .cn-a2', '#shopList .cn-a2::after');
  await probe(p, '상품 밴드 (.cn-hd)  ✓ 통과 중 — 대조군', '#shopList .cn-hd', '#shopList .cn-hd::after');

  /* 배너 안 «아트 덩어리» 가 평탄면을 얼마나 갉아먹는지 — em/no/gm 을 지운 상태로 한 번 더 */
  console.log('\n--- 배너에서 아트(🎬🚫보석)를 숨기고 다시 ---');
  await p.evaluate(() => {
    const e = document.createElement('style'); e.id = 'p122art';
    e.textContent = '#shopList .cn-a2>em,#shopList .cn-a2>.no,#shopList .cn-a2>.gm{opacity:0!important}';
    document.head.appendChild(e);
  });
  await p.waitForTimeout(150);
  await probe(p, '평생배너 — 아트 숨김', '#shopList .cn-a2', '#shopList .cn-a2::after');

  await b.close();
})();
