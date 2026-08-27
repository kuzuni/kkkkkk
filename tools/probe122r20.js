/* 122 20회차 프로브 — §24-12 의 1·2번을 «값이 아니라 정의부터» 가른다.
 *
 * 1) 칸별 [무료] 링 세기 (AP[1] 1.7배 · AO[13] 2.6배 — 2인 일치)
 *    §17 은 [무료] 링을 **한 칸만** 잰다. 비평가 둘은 칸1~4 를 각각 재서 «칸마다 1.7~2.6배» 라고 했다.
 *    원인은 14회차가 이미 적어 둔 «Δ = α × (링색 − 바탕색)» 이다 — 링색(83,230,250)은 다섯 칸이 같은데
 *    카드 본문색이 파랑/분홍/금/보라로 갈려 같은 α 가 다른 Δ 로 읽힌다.
 *    → 칸1~5 를 §25 와 **같은 격리 자**(링만 남기고 나머지 jz122 를 끈다)로 각각 재고,
 *      밴드 중앙(Δ22)에 맞추는 칸별 `--jz-ring` 배수를 역산해 찍는다.
 *
 * 2) AO[2] «[무료]·[교환] 링이 주기의 27~48% 동안 완전 소멸» vs §17 «바닥 0.59~0.75»
 *    두 사람이 다른 자를 썼다(23-2 의 교훈: 값이 아니라 정의부터 맞춘다).
 *      · §17 자   = 버튼 밖 **2~14px 띠 평균**   → 바닥/피크 비
 *      · AO 자    = 버튼 테두리 **바로 바깥 한 열** → 그 열의 바닥/피크 비
 *    같은 위상 표본에서 두 자를 동시에 대서, 어느 쪽이 «소멸» 을 보는지 가른다.
 *
 * 게이트가 아니다. 결과는 review 20회차 절에 남긴다.
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

/* §25 의 격리 3단계를 그대로 옮긴다 — ① 전부 끄고 ② cancel 로 API 소유분을 걷고 ③ 대상만 다시 켠다.
   순서가 틀리면 «껐는데 값이 그대로» 거나 «켰는데 둘 다 0» 이 된다(19회차가 두 번 데인 자리). */
async function isoOn(p, sel, name) {
  await p.evaluate(() => {
    const st = document.getElementById('pr20iso') || document.createElement('style');
    st.id = 'pr20iso';
    st.textContent = '*,*::before,*::after{animation-name:none !important}';
    document.head.appendChild(st);
    document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
  });
  if (sel) await p.evaluate(([s, n]) => {
    const st = document.getElementById('pr20iso');
    st.textContent += s + '{animation-name:' + n + ' !important}';
  }, [sel, name]);
}
async function isoOff(p) {
  await p.evaluate(() => {
    const s = document.getElementById('pr20iso');
    if (s) s.textContent = '*,*::before,*::after{animation-name:none !important}';
    document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
  });
  await p.evaluate(() => { const s = document.getElementById('pr20iso'); if (s) s.remove(); });
  await p.waitForTimeout(60);
}

/* 한 요소를 한 주기 n 위상에서 찍어 **두 자를 동시에** 낸다.
   band = 밖 2~14px 띠 평균(§17) · edge = 테두리 바로 바깥 1~3px 한 겹 평균(AO) */
async function ringSeries(p, sel, per, n) {
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
  const { iw, ih, ...box } = clip, band = [], edge = [], rgb = [];
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
      let bs = 0, bn = 0, es = 0, en = 0, br = 0, bg2 = 0, bb = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const inBox = (x >= 14 && x < 14 + w && y >= 14 && y < 14 + h);
        if (inBox) continue;
        const j = (y * c.width + x) * 4;
        const L = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
        /* §17 자 — 바깥 2~14px 띠(가장자리 2px 은 이웃 오염을 피해 뺀다) */
        if (!(x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2)) {
          bs += L; bn++; br += d[j]; bg2 += d[j + 1]; bb += d[j + 2];
        }
        /* AO 자 — 테두리 «바로 바깥» 1~3px 한 겹만 */
        const dx = x < 14 ? 14 - x : (x >= 14 + w ? x - (14 + w) + 1 : 0);
        const dy = y < 14 ? 14 - y : (y >= 14 + h ? y - (14 + h) + 1 : 0);
        const dist = Math.max(dx, dy);
        if (dist >= 1 && dist <= 3) { es += L; en++; }
      }
      return [bn ? +(bs / bn).toFixed(3) : null, en ? +(es / en).toFixed(3) : null,
              bn ? [br / bn, bg2 / bn, bb / bn] : null];
    }, [b64, iw, ih]);
    band.push(v[0]); edge.push(v[1]); rgb.push(v[2]);
  }
  const stat = a => {
    const v = a.filter(x => x != null); if (!v.length) return null;
    const mx = Math.max(...v), mn = Math.min(...v);
    return { max: +mx.toFixed(2), min: +mn.toFixed(2), d: +(mx - mn).toFixed(2) };
  };
  /* ⚑ 세 번째 자 — **ΔE(CIELAB)**. 루마 자는 «청록 글로우가 금색 면 위에서 얼마나 도드라지나» 를
     구조적으로 과소평가한다: 청록(83,230,250)과 금(240,192,90)은 **밝기가 거의 같고 색상만 반대**라
     Δ루마는 작지만 눈에는 또렷하다. 사람이 보는 «세기» 는 luma 차가 아니라 색차다. */
  const lab = ([R, G, B]) => {
    const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const r = f(R), g = f(G), b = f(B);
    const X = (.4124 * r + .3576 * g + .1805 * b) / .95047;
    const Y = (.2126 * r + .7152 * g + .0722 * b);
    const Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
    const k = t => t > .008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    return [116 * k(Y) - 16, 500 * (k(X) - k(Y)), 200 * (k(Y) - k(Z))];
  };
  const labs = rgb.filter(Boolean).map(lab);
  let dE = null;
  if (labs.length > 1) {
    let mx = 0;
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const d = Math.hypot(labs[i][0] - labs[j][0], labs[i][1] - labs[j][1], labs[i][2] - labs[j][2]);
      if (d > mx) mx = d;
    }
    dE = +mx.toFixed(2);
  }
  return { band: stat(band), edge: stat(edge), bandV: band, edgeV: edge, dE, rgbV: rgb };
}

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(700);
  /* 소환 탭 · 무료 소환이 «남은» 상태(=`.b1:not(.lack)` 이라야 링 규칙이 붙는다) */
  await p.evaluate(() => {
    openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
    S.daily.freeSum = {};
    /* [교환] 링은 «교환할 마일리지가 있을 때» 만 켜진다(`.cn-ml:not(.off)`) — 게이트 §17 과 같은 상태를 만든다.
       이걸 빼면 `.cn-ml.off` 라 링 규칙이 통째로 안 붙어 «Δ0 = 죽은 링» 이라는 허깨비가 나온다. */
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    renderShopPage();
  });
  await p.waitForTimeout(400);

  console.log('[1] 칸별 [무료] 링 Δ루마 — §25 와 같은 격리(링만 남긴다) · 0.9s 12위상');
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const sel = '#shopList .shp-card:nth-child(' + i + ') .cbtn.b1';
    const has = await p.evaluate(s => {
      const e = document.querySelector(s);
      return !!e && !e.classList.contains('lack') && getComputedStyle(e).animationName === 'jz122Ring';
    }, sel);
    if (!has) { console.log('  칸' + i + ' — [무료] 링이 없다(.lack 이거나 버튼 없음)'); continue; }
    await isoOn(p, sel, 'jz122Ring');
    const r = await ringSeries(p, sel, 900, 12);
    await isoOff(p);
    if (!r) { console.log('  칸' + i + ' — 화면 밖이라 못 쟀다'); continue; }
    rows.push({ i, ...r });
    console.log('  칸' + i + '  띠Δ루마 ' + r.band.d + ' (max ' + r.band.max + ' / min ' + r.band.min + ')'
      + '  | 띠ΔE(Lab) ' + r.dE
      + '  | 한겹Δ ' + r.edge.d);
  }
  if (rows.length >= 2) {
    const ds = rows.map(r => r.band.d);
    const mx = Math.max(...ds), mn = Math.min(...ds);
    console.log('  → 칸별 산포 ' + (mn ? (mx / mn).toFixed(2) : '?') + '배 (AP 1.7배 · AO 2.6배)');
    console.log('  → 밴드 중앙 22 로 맞추는 칸별 --jz-ring 배수(현재 값 대비): '
      + rows.map(r => '칸' + r.i + ' ×' + (22 / r.band.d).toFixed(3)).join(' · '));
    const es = rows.map(r => r.dE).filter(x => x != null);
    if (es.length >= 2) {
      const emx = Math.max(...es), emn = Math.min(...es);
      console.log('  → ΔE(Lab) 칸별 ' + rows.map(r => '칸' + r.i + ' ' + r.dE).join(' · '));
      console.log('  → ΔE 산포 ' + (emn ? (emx / emn).toFixed(2) : '?') + '배  '
        + '(루마 자 ' + (mn ? (mx / mn).toFixed(2) : '?') + '배)');
      console.log('  → ΔE 중앙값에 맞추는 배수: '
        + rows.map(r => '칸' + r.i + ' ×' + (es.slice().sort((a, b) => a - b)[Math.floor(es.length / 2)] / r.dE).toFixed(3)).join(' · '));
    }
  }

  console.log('');
  console.log('[2] AO[2] «주기의 27~48% 완전 소멸» vs §17 «바닥 0.59~0.75» — 자를 «같은 정의» 로 맞춘다');
  console.log('    ⚠ 정의가 두 군데서 갈린다 — 마스크(띠 2~14px ↔ 한 겹 1~3px)와 **기준선**이다.');
  console.log('    §17 은 `box-shadow:none` 기준선을 빼고 **초과분**의 min/max 를 낸다(= «링이 얼마나 남았나»).');
  console.log('    생루마 min/max 는 바탕이 밝을수록 1 에 붙어 «안 꺼진다» 로 읽힌다 — 그래서 둘 다 낸다.');
  const TARGETS = [
    ['[무료] 링', '#shopList .shp-card:nth-child(1) .cbtn.b1', 'jz122Ring', 900, 'summon'],
    ['[교환] 링', '#shopList .cn-ml>.ex', 'jz122Ring2', 1200, 'coin'],
    ['[이동] 링', '#shopList .cn-mv', 'jz122Ring2', 1350, 'coin'],
  ];
  let curCat = 'summon';
  for (const [name, sel, anim, per, cat] of TARGETS) {
    if (cat !== curCat) {
      await p.evaluate(c => { shopCat = c; setShopCatTabs(c); renderShopPage(); }, cat);
      await p.waitForTimeout(300); curCat = cat;
    }
    const exists = await p.evaluate(s => !!document.querySelector(s), sel);
    if (!exists) { console.log('  ' + name + ' — 없다'); continue; }
    await isoOn(p, sel, anim);
    const r = await ringSeries(p, sel, per, 16);
    /* §17 과 **같은 기준선**: 이 요소의 box-shadow 를 끈 한 장 */
    await p.evaluate(s => {
      let e = document.getElementById('pr20base');
      if (!e) { e = document.createElement('style'); e.id = 'pr20base'; document.head.appendChild(e); }
      e.textContent = s + '{box-shadow:none !important}';
    }, sel);
    const b = await ringSeries(p, sel, per, 2);
    await p.evaluate(() => { const e = document.getElementById('pr20base'); if (e) e.remove(); });
    await isoOff(p);
    if (!r || !b) { console.log('  ' + name + ' — 화면 밖'); continue; }
    const rep = (label, series, stat, base) => {
      const v = series.filter(x => x != null);
      const ex = v.map(x => x - base);
      const hi = Math.max(...ex), lo = Math.min(...ex);
      const dead = hi > .5 ? ex.filter(x => x <= hi * .03).length / ex.length : 1;
      console.log('    ' + label + ' 생루마 피크 ' + stat.max + ' 바닥 ' + stat.min
        + ' (생 바닥비 ' + (stat.max ? (stat.min / stat.max).toFixed(3) : '?') + ')'
        + ' | 기준선 ' + base.toFixed(2) + ' → **초과분 바닥비 '
        + (hi > .5 ? (lo / hi).toFixed(3) : '?') + '** · 초과 피크 ' + hi.toFixed(2));
      console.log('      «초과분이 피크의 3% 이하(=사실상 소멸)» 인 위상 = ' + Math.round(dead * 100)
        + '%  (AO 주장 27~48%)');
    };
    console.log('  ' + name);
    rep('§17 자(띠 2~14px)  :', r.bandV, r.band, b.band.max);
    rep('AO 자(한 겹 1~3px) :', r.edgeV, r.edge, b.edge.max);
  }

  console.log('');
  console.log('콘솔 에러 ' + errs.length);
  await browser.close();
})();
