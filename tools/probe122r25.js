/* 122 25회차 — **`ringiso` 격리 세트가 «정말로 격리됐는지» 를 찍기 전에 잰다.**
 *
 * 왜: 24회차에 AZ 는 격리 세트로 링 바닥/피크·칸별 세기를 판정했고, AY 는 같은 회차에
 *     **그 세트의 칸3·칸4 가 격리되지 않았다**는 것을 실측했다(버튼에서 70px 떨어진 자리의
 *     8위상 루마 변동: 칸2 0.0 · 칸5 0.0 · **칸4 15.3** · **칸3 42.3**).
 *     즉 AZ 의 «칸4 바닥/피크 32%» · «보정이 뒤집혔다» 는 오염된 두 칸에서 나온 값이다.
 *     → 25회차의 첫 일은 «값 고치기» 가 아니라 **자를 자로 재는 것**이다.
 *
 * 이 도구가 하는 일 (셋 다 «찍기 전에» 답이 나와야 한다):
 *   ① 현재/후보 끄기 목록으로 격리한 뒤, 각 [무료] 버튼의 **70px 밖 띠**(expand 66~74px)
 *      평균 루마를 8위상에서 재서 변동(max−min)을 낸다. 0.0 이어야 격리된 것이다.
 *   ② 오염이 있으면 **범인을 이름으로 짚는다** — 격리 상태에서 아직 살아 있는 jz122 애니메이션
 *      중 그 띠와 겹치는 요소를 전부 나열한다(선택자·애니메이션명·rect).
 *   ③ 두 스크롤 자리(칸1~3 · 칸3~5)를 각각 돌아 **다섯 칸 전부** 판정한다
 *      (24회차 세트는 칸1 이 아예 없었다 — AZ 지적).
 *
 * 실행: node tools/probe122r25.js [--iso=cur|new] [--n=8]
 *   --iso=cur  24회차 끄기 목록 그대로
 *   --iso=new  25회차 후보 목록(기본)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const ISO = arg('iso') || 'new';
const N = +(arg('n') || 8);
const FREE_STOPS = [80, 192, 305, 417, 530, 642, 755, 867];

/* 24회차(현재) 끄기 목록 — cap122.js `capRingIso` 와 한 글자도 다르지 않아야 한다 */
const ISO_CUR = '#shopList .cfr::after,#shopList .chd::before,#shopList .chd::after,'
  + '#shopList .cn-cd>.fr::after,#shopList .cn-cd>.fr::before,#shopList .cn-cd::before,'
  + '#shopw>.jzb{opacity:0!important}';

/* 25회차 후보 — 위에 더해 «버튼 밖 70px 을 흔드는 나머지 층» 을 끈다.
   목록은 ②(범인 지목)의 결과로 채운다 — 지금은 실측 전 후보다. */
const ISO_NEW = ISO_CUR
  /* ⚑ 24회차 목록이 «광택 3겹» 이라고 부른 것에 **카드 본문 전면 광택이 빠져 있다.**
     그 띠는 LESSONS 122-1(«가두는 규칙은 부모의 몫») 때 `.cfr::after` 에서
     **마스크 밖 형제 레이어 `.cbg>.jzs::after` 로 옮겨졌는데**, 끄기 목록은 옛 이름 그대로였다.
     §23-2 가 지목한 «반치폭 64~70px 짜리 본문 광택» 이 정확히 이 층이다. */
  + '#shopList .shp-card>.cbg>.jzs::after{opacity:0!important}'
  /* 강제 상자(gm) 글로우는 **카드 밖으로 새는 유일한 층**이다(§0-1 «카드 밖 누출 0 — gm 만 예외»).
     소환 4번째 칸이 gm 이라 칸3·칸4 의 70px 띠가 이 글로우 안에 든다. */
  + '#shopList .shp-card.gm>.cfr{animation-name:none!important}';

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

/* 클립 한 장을 페이지 안에서 디코드해 «띠 평균 루마» 를 낸다.
   띠 = 버튼 rect 를 66px 부풀린 사각형 밖 ~ 74px 부풀린 사각형 안 (두께 8px 의 액자). */
async function bandLuma(p, box, inner) {
  const b64 = (await p.screenshot({ clip: box })).toString('base64');
  return p.evaluate(async ([src, w, h, ix, iy, iw, ih]) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + src)).blob());
    const c = new OffscreenCanvas(w, h), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let s = 0, n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x >= ix && x < ix + iw && y >= iy && y < iy + ih) continue; /* 안쪽 구멍 */
        const i = (y * w + x) * 4;
        s += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; n++;
      }
    }
    return { mean: s / n, px: n };
  }, [b64, box.width, box.height, inner.x, inner.y, inner.width, inner.height]);
}

async function scanScroll(p, label, out) {
  const boxes = await p.evaluate(() => {
    const lw = document.getElementById('shopList'), lr = lw.getBoundingClientRect();
    return [...document.querySelectorAll('#shopList .cbtn.b1')].map((e, i) => {
      const r = e.getBoundingClientRect();
      const card = e.closest('.shp-card');
      const idx = card ? [...card.parentNode.children].indexOf(card) + 1 : 0;
      const x = Math.round(r.x) - 74, y = Math.round(r.y) - 74;
      const w = Math.round(r.width) + 148, h = Math.round(r.height) + 148;
      const vis = r.top >= lr.top && r.bottom <= lr.bottom;
      const fits = x >= 0 && y >= 0 && x + w <= innerWidth && y + h <= innerHeight;
      /* 링 밴드 — 버튼 테두리 바깥 1~12px (§17 코드가 세는 그 띠) */
      const rx = Math.round(r.x) - 12, ry = Math.round(r.y) - 12;
      const rw = Math.round(r.width) + 24, rh = Math.round(r.height) + 24;
      return { idx, vis, fits, box: { x, y, width: w, height: h },
        inner: { x: 8, y: 8, width: w - 16, height: h - 16 },
        rbox: { x: rx, y: ry, width: rw, height: rh },
        rin: { x: 12, y: 12, width: rw - 24, height: rh - 24 },
        gm: !!(card && card.classList.contains('gm')) };
    });
  });
  for (const b of boxes) {
    if (!b.vis || !b.fits) continue;
    if (out[b.idx]) continue;               /* 두 자리에 겹쳐 나오면 먼저 잡힌 쪽을 쓴다 */
    const vals = [];
    for (const t of FREE_STOPS.slice(0, N)) {
      await seek(p, t);
      vals.push((await bandLuma(p, b.box, b.inner)).mean);
    }
    const mx = Math.max(...vals), mn = Math.min(...vals);
    /* ⚑ 그리고 **바로 그 자리에서** 링 자체의 세기를 «사양이 정의된 밴드» 로 잰다.
       25회차가 밴드를 못 박았다(`probe122r25b.js`): 사양 Δ22±3 을 세운 자는 게이트 §17 의
       **코드**가 세는 «버튼 테두리 바깥 1~12px» 띠다(§17 주석의 «2~14px» 은 오기).
       격리가 확인된 칸에서만 이 값을 쓴다 — 그것이 24회차가 못 한 «판정» 이다. */
    const rv = [];
    for (const t of FREE_STOPS.slice(0, N)) {
      await seek(p, t);
      rv.push((await bandLuma(p, b.rbox, b.rin)).mean);
    }
    out[b.idx] = { idx: b.idx, gm: b.gm, at: label, d: mx - mn, mean: (mx + mn) / 2,
      ring: Math.max(...rv) - Math.min(...rv), vals: vals.map(v => +v.toFixed(2)) };
  }
}

/* 격리 상태에서 «아직 살아 있는» jz122 애니메이션 중 70px 띠와 겹치는 요소를 이름으로 짚는다 */
async function culprits(p) {
  return p.evaluate(() => {
    const sel = e => {
      if (!e || !e.tagName) return String(e);
      let s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id;
      if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/).join('.');
      return s;
    };
    const lw = document.getElementById('shopList'), lr = lw.getBoundingClientRect();
    const bands = [...document.querySelectorAll('#shopList .cbtn.b1')].map(e => {
      const r = e.getBoundingClientRect(), card = e.closest('.shp-card');
      return { idx: card ? [...card.parentNode.children].indexOf(card) + 1 : 0,
        vis: r.top >= lr.top && r.bottom <= lr.bottom,
        o: { l: r.left - 74, t: r.top - 74, r: r.right + 74, b: r.bottom + 74 },
        i: { l: r.left - 66, t: r.top - 66, r: r.right + 66, b: r.bottom + 66 } };
    }).filter(b => b.vis);
    const hits = {};
    for (const a of document.getAnimations()) {
      const nm = a.animationName || '';
      if (!/^jz122/.test(nm)) continue;
      const tgt = a.effect && a.effect.target;
      if (!tgt || !tgt.getBoundingClientRect) continue;
      const ps = a.effect.pseudoElement || '';
      /* 의사요소는 호스트 rect 로 근사한다(정확한 상자를 못 얻는다) */
      const r = tgt.getBoundingClientRect();
      const cs = ps ? getComputedStyle(tgt, ps) : getComputedStyle(tgt);
      if (parseFloat(cs.opacity) === 0) continue;          /* 이미 끈 층 */
      /* ⚠ 의사요소의 opacity 는 호스트의 opacity 를 상속하지 않는다 — 호스트를 0 으로 껐어도
         `getComputedStyle(host,'::after').opacity` 는 1 이라 «살아 있다» 로 잘못 센다.
         (24회차 목록의 `#shopw>.jzb` 가 그래서 다섯 칸 전부에 범인으로 찍혔다.) */
      if (ps && parseFloat(getComputedStyle(tgt).opacity) === 0) continue;
      for (const b of bands) {
        const overOuter = !(r.right < b.o.l || r.left > b.o.r || r.bottom < b.o.t || r.top > b.o.b);
        const insideInner = r.left >= b.i.l && r.right <= b.i.r && r.top >= b.i.t && r.bottom <= b.i.b;
        if (overOuter && !insideInner) {
          const k = b.idx + '|' + sel(tgt) + ps + '|' + nm;
          hits[k] = (hits[k] || 0) + 1;
        }
      }
    }
    return Object.keys(hits).sort();
  });
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
  await p.evaluate(() => {
    shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage();
    S.daily.freeSum = {}; renderShopPage();
    if (typeof window.step === 'function') window.step = () => {};
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
  });
  await p.waitForTimeout(500);
  await p.evaluate(css => {
    const s = document.createElement('style'); s.id = 'capRingIso'; s.textContent = css;
    document.head.appendChild(s);
  }, ISO === 'cur' ? ISO_CUR : ISO_NEW);
  await p.waitForTimeout(300);

  const out = {};
  /* 자리 ① — 칸1 을 가운데로(24회차 세트에 빠져 있던 칸이다) */
  await p.evaluate(() => {
    const c = document.querySelector('#shopList .shp-card');
    if (c) c.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const lw = document.getElementById('shopList');
    if (lw) lw.scrollTop = 0;
  });
  await p.waitForTimeout(300);
  const c1 = await culprits(p);
  await scanScroll(p, 'top', out);
  /* 자리 ② — 리스트 바닥(칸3~5) */
  await p.evaluate(() => { const lw = document.getElementById('shopList'); lw.scrollTop = lw.scrollHeight; });
  await p.waitForTimeout(400);
  const c2 = await culprits(p);
  await scanScroll(p, 'bottom', out);

  console.log('=== 격리 목록: ' + ISO + ' · ' + N + '위상 ===');
  console.log('칸 | 자리   | gm | 70px 밖 변동 | 격리 | 링 Δ루마(밖 1~12px · 사양 22±3)');
  for (let i = 1; i <= 8; i++) {
    const r = out[i]; if (!r) continue;
    console.log(' ' + r.idx + ' | ' + r.at.padEnd(6) + ' | ' + (r.gm ? 'Y' : ' ') + '  | '
      + r.d.toFixed(2).padStart(11) + ' | ' + (r.d < .5 ? ' ✓  ' : ' ✗  ') + ' | '
      + r.ring.toFixed(2).padStart(6) + (r.d < .5 ? (r.ring < 19 || r.ring > 25 ? '  ← 밴드 밖' : '') : '  ← 오염 칸, 쓰지 마라'));
  }
  const iso = [1, 2, 3, 4, 5].map(i => out[i]).filter(r => r && r.d < .5);
  if (iso.length >= 2) {
    const g = iso.map(r => r.ring);
    console.log('  · 격리된 ' + iso.length + '칸의 링 산포 = '
      + (Math.max(...g) / Math.min(...g)).toFixed(2) + '배 (게이트 §17 규약 <=2.2배)');
  }
  const miss = [1, 2, 3, 4, 5].filter(i => !out[i]);
  if (miss.length) console.log('⚠ 두 자리 어디에도 안 잡힌 칸: ' + miss.join(','));
  const cul = [...new Set([...c1, ...c2])];
  console.log('\n=== 띠와 겹치는, 아직 살아 있는 jz122 층 (칸|요소|애니) ===');
  if (!cul.length) console.log('  없음');
  else cul.forEach(s => console.log('  ' + s));
  await b.close();
})();
