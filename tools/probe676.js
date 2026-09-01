/* 작업 676 재현 — `tools/verify122.js` §21 «골드 광선이 판에 실제로 보인다» 1건 빨강(기여 1.59 < 4).
 *
 * 등재문(2026-09-01, sess-1343-16462)은 결함을 둘로 적었다:
 *   ① §21 기여도 항이 빨갛다 — «켜져 있는데 안 보이는» 상태로 되돌아갔나?
 *   ② 그 자가 FAIL 을 내고도 **종료 코드 0** 이라 워커·verifyProgress 의 E2 축이 영원히 초록으로 센다.
 *
 * ⚠ 338 규칙 — 처방 전에 재현부터. 그런데 같은 실행의 **이웃 두 항이 초록**이라 등재문의
 * «안 보인다» 는 그 자리에서 이미 모순이다:
 *     ✗ 기준선 대비 섹터 최대 편차 **1.59** (>=4)
 *     ✓ 각도 섹터 산포 **46.31** (>=1.5)
 *     ✓ 반주기(1250ms) 섹터 최대 변화 **16.83** (>=1.5)
 * 광선이 «안 보인다» 면 산포도 회전도 같이 죽어야 한다. 산포 46 · 회전 16.8 은
 * **판 위에서 뚜렷하게 돌고 있다**는 뜻이므로, 의심해야 할 것은 제품이 아니라
 * **기준선(off) 을 만드는 방법**이다 — 즉 «광선만 끈 판» 이 정말로 광선이 꺼진 판인가.
 *
 * 그래서 이 자는 세 축으로 묻는다:
 *   [A] DOM — `.cn-cd.dia.top>.pn` 의 자식 전수 · `.ray` 로 잡히는 노드 수 · 계산된 스타일
 *       (display · --jz-glow · background · mask · animation) · rect.
 *   [B] 끄기가 먹는가 — §21 이 쓰는 그 규칙(`display:none!important`)을 넣은 채로
 *       **광선 노드의 계산된 display 와 애니메이션 수**를 다시 읽는다.
 *   [C] 찍힌 픽셀 — 판을 세 번 찍어(on t=0 · on t=1250 · off t=0) 반지름 대역별로
 *       |Δ루마| 를 센다. §21 이 쓰는 고리(r 34..76)만이 아니라 **0..130 전 대역**을 훑어
 *       «광선의 잉크가 실제로 어느 반지름에 있는가» 를 밝힌다.
 *       ⚠ 여기서 «off 와 on 이 같다» 가 나오면 결함은 제품이 아니라 자다.
 *
 * 실행: node tools/probe676.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SEL = '#shopList .cn-cd.dia.top>.pn>.ray';
const OFFCSS = '.cn-cd.dia.top>.pn>.ray{display:none!important}';

/* verify122 와 같은 seek — jz122* 만 t 로 세우고 나머지 상시 애니는 취소한다 */
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

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => { S.dia = 2e6; S.gold = 1e9; openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(400);

  console.log('PROBE676 — verify122 §21 «골드 광선» 기여도 항 재현');
  console.log('');

  /* ── [A] DOM ─────────────────────────────────────────────── */
  console.log('[A] DOM — 광선 노드와 그 이웃');
  const dom = await p.evaluate(sel => {
    const r = document.querySelector(sel);
    if (!r) return null;
    r.scrollIntoView({ block: 'center' });
    const pn = r.parentElement;
    const cs = getComputedStyle(r);
    const kids = [...pn.children].map(e => {
      const c = getComputedStyle(e), b = e.getBoundingClientRect();
      return {
        tag: e.tagName.toLowerCase(), cls: e.className || '(none)',
        z: c.zIndex, disp: c.display, pos: c.position,
        w: Math.round(b.width), h: Math.round(b.height),
        anim: c.animationName,
        bg: c.backgroundImage.slice(0, 46)
      };
    });
    const pb = pn.getBoundingClientRect(), rb = r.getBoundingClientRect();
    return {
      rays: document.querySelectorAll(sel).length,
      raysAny: document.querySelectorAll('#shopList .ray').length,
      pnKids: kids,
      glow: cs.getPropertyValue('--jz-glow').trim(),
      per: cs.getPropertyValue('--jz-per').trim(),
      disp: cs.display, opa: cs.opacity, anim: cs.animationName,
      mask: (cs.maskImage || cs.webkitMaskImage || '').slice(0, 120),
      bg: cs.backgroundImage.slice(0, 160),
      pn: { x: Math.round(pb.x), y: Math.round(pb.y), w: Math.round(pb.width), h: Math.round(pb.height) },
      ray: { x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height) }
    };
  }, SEL);
  if (!dom) { console.log('  ✗ 광선 노드를 못 찾음 — 여기서 끝'); await b.close(); process.exitCode = 1; return; }
  console.log('    · `' + SEL + '` 로 잡히는 노드 ' + dom.rays + '개 · `#shopList .ray` 전체 ' + dom.raysAny + '개');
  console.log('    · 판 .pn ' + dom.pn.w + '×' + dom.pn.h + ' @(' + dom.pn.x + ',' + dom.pn.y + ')'
    + ' · 광선 상자 ' + dom.ray.w + '×' + dom.ray.h + ' @(' + dom.ray.x + ',' + dom.ray.y + ')');
  console.log('    · display=' + dom.disp + ' opacity=' + dom.opa + ' animation=' + dom.anim
    + ' --jz-glow=' + (dom.glow || '(빈값)') + ' --jz-per=' + (dom.per || '(빈값)'));
  console.log('    · mask: ' + dom.mask);
  console.log('    · bg  : ' + dom.bg);
  console.log('    · .pn 자식:');
  for (const k of dom.pnKids) {
    console.log('        - ' + k.tag + '.' + k.cls + '  ' + k.w + '×' + k.h
      + ' disp=' + k.disp + ' pos=' + k.pos + ' z=' + k.z + ' anim=' + k.anim + ' bg=' + k.bg);
  }
  ok(dom.rays === 1, '§21 선택자가 잡는 광선 노드는 1개다 (실측 ' + dom.rays + ')');
  ok(dom.disp !== 'none', '광선이 기본 상태에서 켜져 있다 (display=' + dom.disp + ')');

  /* ── [B] 끄기가 먹는가 ───────────────────────────────────── */
  console.log('');
  console.log('[B] `display:none!important` 이 실제로 광선을 끄는가');
  const pray = txt => p.evaluate(x => {
    let e = document.getElementById('jz676ray');
    if (!x) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = 'jz676ray'; document.head.appendChild(e); }
    e.textContent = x;
  }, txt);
  const rayState = () => p.evaluate(sel => {
    const r = document.querySelector(sel);
    const anims = document.getAnimations().filter(a => /^jz122Ray/.test(a.animationName || '')).length;
    if (!r) return { found: false, anims };
    const b = r.getBoundingClientRect();
    return { found: true, disp: getComputedStyle(r).display, w: Math.round(b.width), h: Math.round(b.height), anims };
  }, SEL);
  const stOn = await rayState();
  await pray(OFFCSS);
  await p.waitForTimeout(120);
  const stOff = await rayState();
  console.log('    · ON  — display=' + stOn.disp + ' rect ' + stOn.w + '×' + stOn.h + ' · jz122Ray 애니 ' + stOn.anims + '개');
  console.log('    · OFF — display=' + stOff.disp + ' rect ' + stOff.w + '×' + stOff.h + ' · jz122Ray 애니 ' + stOff.anims + '개');
  ok(stOff.disp === 'none', 'OFF 규칙이 계산된 display 를 none 으로 만든다 (실측 ' + stOff.disp + ')');
  await pray('');
  await p.waitForTimeout(120);

  /* ── [C] 찍힌 픽셀 — 반지름 대역별 기여 ──────────────────── */
  console.log('');
  console.log('[C] 찍힌 픽셀 — 판 클립을 세 장 찍어 반지름 대역별로 잰다');
  const box = await p.evaluate(sel => {
    const r = document.querySelector(sel);
    const b = r.parentElement.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
  }, SEL);
  /* 아이콘 상자 — «광선이 보일 수 없는 자리» 를 제품에서 파생시킨다(상수 아님) */
  const emBox = await p.evaluate(sel => {
    const pn = document.querySelector(sel).parentElement;
    const em = pn.querySelector('em');
    const pb = pn.getBoundingClientRect(), eb = em.getBoundingClientRect();
    return { x: eb.x - pb.x, y: eb.y - pb.y, w: eb.width, h: eb.height };
  }, SEL);
  console.log('    · 아이콘 상자(판 기준) x ' + emBox.x.toFixed(1) + '..' + (emBox.x + emBox.w).toFixed(1)
    + ' · y ' + emBox.y.toFixed(1) + '..' + (emBox.y + emBox.h).toFixed(1));
  /* 한 장을 반지름 12px 대역 × 각도 12섹터로 쪼개 R−B(황색도)와 루마를 낸다 */
  const shot = async () => {
    const b64 = (await p.screenshot({ clip: box })).toString('base64');
    return p.evaluate(async ([src, ex]) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const cx = c.width / 2, cy = c.height / 2;
      const NB = 11;                                   /* 0..132px 를 12px 대역 11개로 */
      const yb = new Array(NB).fill(0), nb = new Array(NB).fill(0);
      /* 대역 × 섹터(12) 의 황색도 — §21 과 같은 R−B 축 */
      const sec = [], cnt = [];
      for (let i = 0; i < NB; i++) { sec.push(new Array(12).fill(0)); cnt.push(new Array(12).fill(0)); }
      /* 후보 축 — «아이콘 상자 밖» 만 각도 12섹터로 (반지름 상수 0개) */
      const so = new Array(12).fill(0), co = new Array(12).fill(0);
      const sall = new Array(12).fill(0), call = new Array(12).fill(0);
      const px = [];
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const j = (y * c.width + x) * 4;
        const L = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
        px.push(L);
        const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy);
        let a = Math.atan2(dy, dx) * 180 / Math.PI; if (a < 0) a += 360;
        const k = Math.min(11, Math.floor(a / 30));
        const inEm = x >= ex.x && x < ex.x + ex.w && y >= ex.y && y < ex.y + ex.h;
        if (!inEm) { so[k] += d[j] - d[j + 2]; co[k]++; }
        sall[k] += d[j] - d[j + 2]; call[k]++;
        const bi = Math.floor(rr / 12); if (bi >= NB) continue;
        yb[bi] += L; nb[bi]++;
        sec[bi][k] += d[j] - d[j + 2]; cnt[bi][k]++;
      }
      return {
        w: c.width, h: c.height, px,
        band: yb.map((v, i) => nb[i] ? v / nb[i] : 0),
        bandN: nb,
        sec: sec.map((row, i) => row.map((v, k) => cnt[i][k] ? v / cnt[i][k] : 0)),
        out: so.map((v, i) => co[i] ? v / co[i] : 0), outN: co,
        all: sall.map((v, i) => call[i] ? v / call[i] : 0), allN: call
      };
    }, [b64, emBox]);
  };
  await seek(p, 0); const on0 = await shot();
  await seek(p, 1250); const on1 = await shot();
  await pray(OFFCSS);
  await seek(p, 0); const off = await shot();
  await pray('');

  console.log('    · 클립 ' + on0.w + '×' + on0.h + ' (판 상자)');
  /* 픽셀이 하나라도 바뀌는가 — 자가 아니라 «화면» 이 답한다 */
  let diffN = 0, diffMax = 0;
  for (let i = 0; i < on0.px.length; i++) {
    const dd = Math.abs(on0.px[i] - off.px[i]);
    if (dd > 1) diffN++;
    if (dd > diffMax) diffMax = dd;
  }
  const pct = (100 * diffN / on0.px.length).toFixed(2);
  console.log('    · ON(t=0) ↔ OFF 픽셀 차 — |Δ루마|>1 인 화소 ' + diffN + '/' + on0.px.length
    + ' (' + pct + '%) · 최대 Δ ' + diffMax.toFixed(1));
  let sdiffN = 0, sdiffMax = 0;
  for (let i = 0; i < on0.px.length; i++) {
    const dd = Math.abs(on0.px[i] - on1.px[i]);
    if (dd > 1) sdiffN++;
    if (dd > sdiffMax) sdiffMax = dd;
  }
  console.log('    · ON(t=0) ↔ ON(t=1250) 픽셀 차 — |Δ루마|>1 인 화소 ' + sdiffN + '/' + on0.px.length
    + ' (' + (100 * sdiffN / on0.px.length).toFixed(2) + '%) · 최대 Δ ' + sdiffMax.toFixed(1));

  console.log('    · 반지름 대역별 (섹터 최대 편차 = §21 과 같은 축, 대역만 갈랐다):');
  console.log('        r대역     화소     ON↔OFF 섹터최대   ON↔ON1 섹터최대   대역 평균루마');
  const bandMax = [];
  for (let i = 0; i < on0.band.length; i++) {
    const cOff = Math.max(...on0.sec[i].map((v, k) => Math.abs(v - off.sec[i][k])));
    const cSpin = Math.max(...on0.sec[i].map((v, k) => Math.abs(v - on1.sec[i][k])));
    bandMax.push(cOff);
    console.log('        ' + String(i * 12).padStart(3) + '..' + String(i * 12 + 12).padEnd(4)
      + String(on0.bandN[i]).padStart(7)
      + (on0.bandN[i] ? cOff.toFixed(2).padStart(16) + cSpin.toFixed(2).padStart(18)
        + on0.band[i].toFixed(1).padStart(16) : '            (빈 대역)'));
  }
  /* §21 이 쓰는 고리(34..76)를 그대로 재현 */
  const ring = async (lo, hi, A, B) => {
    return p.evaluate(([a, bb, lo2, hi2, w, h]) => {
      /* 두 장의 픽셀 배열을 그대로 받아 고리만 다시 센다 */
      const cx = w / 2, cy = h / 2;
      const sa = new Array(12).fill(0), ca = new Array(12).fill(0);
      const sb = new Array(12).fill(0), cb = new Array(12).fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy);
        if (rr < lo2 || rr > hi2) continue;
        let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang < 0) ang += 360;
        const k = Math.min(11, Math.floor(ang / 30));
        const i = y * w + x;
        sa[k] += a[i]; ca[k]++; sb[k] += bb[i]; cb[k]++;
      }
      const A2 = sa.map((v, i) => ca[i] ? v / ca[i] : 0), B2 = sb.map((v, i) => cb[i] ? v / cb[i] : 0);
      return Math.max(...A2.map((v, i) => Math.abs(v - B2[i])));
    }, [A, B, lo, hi, on0.w, on0.h]);
  };
  console.log('');
  console.log('    · §21 고리(r 34..76) 재현 — 루마 축으로 본 ON↔OFF 최대 섹터 편차 '
    + (await ring(34, 76, on0.px, off.px)).toFixed(2));
  console.log('    · 같은 고리 ON↔ON(1250) '
    + (await ring(34, 76, on0.px, on1.px)).toFixed(2));

  const bestBand = bandMax.indexOf(Math.max(...bandMax));
  console.log('');
  console.log('    ⇒ ON↔OFF 기여가 가장 큰 대역 = r ' + (bestBand * 12) + '..' + (bestBand * 12 + 12)
    + ' (섹터 최대 편차 ' + bandMax[bestBand].toFixed(2) + ')');
  ok(diffN > 0, 'OFF 규칙이 판의 화소를 실제로 바꾼다 (바뀐 화소 ' + diffN + ')');
  ok(Math.max(...bandMax) >= 4, '어느 대역에서든 광선 기여가 4 계조 이상이다 (최대 '
    + Math.max(...bandMax).toFixed(2) + ')');

  /* ── [D] 이웃 두 항이 «헛초록» 인가 ──────────────────────────
     §21 은 세 항인데 빨간 것은 기여도 하나다. 나머지 둘(산포 ≥1.5 · 반주기 변화 ≥1.5)은
     **광선을 끈 판에서도 같은 값이 나오면** 광선이 통째로 사라져도 초록인 항이다.
     그래서 같은 두 축을 **off 두 장**(t=0 · t=1250)으로 그대로 다시 잰다.
     ⚠ 판에는 광선 말고도 jz122Float(아이콘 120×157 이 뜬다)가 있고 seek 는 그것도 t 로 세운다. */
  console.log('');
  console.log('[D] 이웃 두 항(산포 · 반주기 회전)이 광선을 재고 있는가');
  await pray(OFFCSS);
  await seek(p, 1250); const off1 = await shot();
  await pray('');
  const RING = 2;  /* r 34..76 은 대역 2(24..36)~6(72..84) 에 걸린다 — §21 고리와 같은 자리 */
  const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length;
    return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
  const ringRB = async (imgs, lo, hi) => {
    /* 대역표를 고리로 합친다 — sec[band][k] 는 이미 대역×섹터 평균이라
       고리에 걸치는 대역들을 화소 수로 가중 평균하면 §21 의 고리 평균과 같은 축이 된다 */
    const out = [];
    for (let k = 0; k < 12; k++) {
      let s = 0, n = 0;
      for (let bnd = Math.floor(lo / 12); bnd <= Math.floor((hi - 1) / 12); bnd++) {
        if (!imgs.bandN[bnd]) continue;
        const c = imgs.bandN[bnd] / 12;
        s += imgs.sec[bnd][k] * c; n += c;
      }
      out.push(n ? s / n : 0);
    }
    return out;
  };
  const onR0 = await ringRB(on0, 34, 76), onR1 = await ringRB(on1, 34, 76);
  const offR0 = await ringRB(off, 34, 76), offR1 = await ringRB(off1, 34, 76);
  const spinOn = Math.max(...onR0.map((v, i) => Math.abs(v - onR1[i])));
  const spinOff = Math.max(...offR0.map((v, i) => Math.abs(v - offR1[i])));
  console.log('    · 고리(34..76) 섹터 산포 — 광선 ON ' + sd(onR0).toFixed(2)
    + ' · 광선 OFF ' + sd(offR0).toFixed(2) + '   (§21 문턱 ≥1.5)');
  console.log('    · 고리(34..76) 반주기 섹터 최대 변화 — 광선 ON ' + spinOn.toFixed(2)
    + ' · 광선 OFF ' + spinOff.toFixed(2) + '   (§21 문턱 ≥1.5)');
  ok(sd(offR0) < 1.5, '«산포» 항이 광선을 잰다 — 광선을 끄면 1.5 아래로 내려간다 (실측 '
    + sd(offR0).toFixed(2) + ')');
  ok(spinOff < 1.5, '«반주기 회전» 항이 광선을 잰다 — 광선을 끄면 1.5 아래로 내려간다 (실측 '
    + spinOff.toFixed(2) + ')');

  /* ── [E] 후보 축 — «아이콘 상자 밖 × 광선 차분» ─────────────
     [C]·[D] 가 말하는 결손은 하나다: §21 의 세 항이 **판을 그대로 재고 있다**.
     판에는 광선 말고 아이콘(jz122Float)이 있고 그게 값의 거의 전부다.
     ⇒ 축을 «판의 절대값» 에서 **«광선을 껐다 켠 차분»** 으로 옮기면 세 항이 전부 광선을 잰다.
     창은 상수(고리 34..76)가 아니라 제품에서 파생시킨다 — **아이콘 상자 밖**(DOM rect).
     ⚠ 문턱(4 · 1.5 · 1.5)은 한 칸도 안 건드린다(672 규약 — «문턱이 아니라 창»).
     그리고 이 축이 «언제나 초록» 이 아님을 **되돌림 시험**이 못박는다:
     광선 노드·마스크·애니는 그대로 두고 **칠(background)만** 걷으면 셋 다 문턱 아래로 내려가야 한다. */
  console.log('');
  console.log('[E] 후보 축 — 창 = 아이콘 상자 밖 · 값 = 광선 ON−OFF 차분');
  const trio = (o0, f0, o1, f1, key) => {
    const K = key || 'out';
    const d0 = o0[K].map((v, i) => v - f0[K][i]);
    const d1 = o1[K].map((v, i) => v - f1[K][i]);
    const m = d0.reduce((x, y) => x + y, 0) / d0.length;
    return {
      contrib: Math.max(...d0.map(Math.abs)),
      contrib1: Math.max(...d1.map(Math.abs)),
      spread: Math.sqrt(d0.reduce((x, y) => x + (y - m) * (y - m), 0) / d0.length),
      spin: Math.max(...d0.map((v, i) => Math.abs(v - d1[i])))
    };
  };
  const now = trio(on0, off, on1, off1);
  const nowAll = trio(on0, off, on1, off1, 'all');
  console.log('    · 창=아이콘상자 밖 — 기여 ' + now.contrib.toFixed(2) + ' (>=4) · 산포 '
    + now.spread.toFixed(2) + ' (>=1.5) · 반주기 변화 ' + now.spin.toFixed(2) + ' (>=1.5)');
  console.log('      섹터별 차분(R−B): ' + on0.out.map((v, i) => (v - off.out[i]).toFixed(1)).join(' '));
  console.log('    · 창=판 전체    — 기여 ' + nowAll.contrib.toFixed(2) + ' (>=4) · 산포 '
    + nowAll.spread.toFixed(2) + ' (>=1.5) · 반주기 변화 ' + nowAll.spin.toFixed(2) + ' (>=1.5)');
  console.log('      섹터별 차분(R−B) t=0    : ' + on0.all.map((v, i) => (v - off.all[i]).toFixed(1)).join(' '));
  console.log('      섹터별 차분(R−B) t=1250 : ' + on1.all.map((v, i) => (v - off1.all[i]).toFixed(1)).join(' ')
    + '   → 위상별 기여 t0 ' + nowAll.contrib.toFixed(2) + ' / t1250 ' + nowAll.contrib1.toFixed(2));
  ok(nowAll.contrib >= 4, '[E] 판 전체 기여 ' + nowAll.contrib.toFixed(2) + ' ≥ 4');
  ok(nowAll.spread >= 1.5, '[E] 판 전체 산포 ' + nowAll.spread.toFixed(2) + ' ≥ 1.5');
  ok(nowAll.spin >= 1.5, '[E] 판 전체 반주기 변화 ' + nowAll.spin.toFixed(2) + ' ≥ 1.5');

  /* 되돌림 시험 — 칠만 걷는다(노드·마스크·회전은 그대로) */
  const KILL = '.cn-cd.dia.top>.pn>.ray{background:none!important}';
  await pray(KILL); await seek(p, 0); const k0 = await shot();
  await seek(p, 1250); const k1 = await shot();
  await pray(KILL + OFFCSS); await seek(p, 0); const kf0 = await shot();
  await seek(p, 1250); const kf1 = await shot();
  await pray('');
  const dead = trio(k0, kf0, k1, kf1, 'all');
  console.log('    · 되돌림(칠만 제거 · 창=판 전체) — 기여 ' + dead.contrib.toFixed(2) + ' · 산포 '
    + dead.spread.toFixed(2) + ' · 반주기 변화 ' + dead.spin.toFixed(2));
  ok(dead.contrib < 4, '[R] 칠을 걷으면 기여가 문턱 아래 (' + dead.contrib.toFixed(2) + ' < 4)');
  ok(dead.spread < 1.5, '[R] 칠을 걷으면 산포가 문턱 아래 (' + dead.spread.toFixed(2) + ' < 1.5)');
  ok(dead.spin < 1.5, '[R] 칠을 걷으면 반주기 변화가 문턱 아래 (' + dead.spin.toFixed(2) + ' < 1.5)');

  console.log('');
  ok(errs.length === 0, '콘솔 에러 0 (' + errs.slice(0, 2).join(' | ') + ')');
  await b.close();
  console.log('\nPROBE676 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exitCode = fail ? 1 : 0;
})();
