#!/usr/bin/env node
/* 재현기 — 작업 380 「13 재화 카드 수량 라벨 `×N` 의 잉크 «높이» 가 ref 대비 +20%」
 *
 *   node tools/probe380.js            (현행 index.html)
 *   node tools/probe380.js <사본>     (옛 커밋 사본 — «수리 전에도 같은 값인가» 대조. 338·344 규칙)
 *
 * 등재문(377 곁다리 실측): `×100` 잉크 101×37 ↔ ref 97~98×**31** · `×50` 82×36 ↔ ref 81×**30**.
 * 가로는 377 이 `--qx` 로 ref 에 맞췄고 **세로만 남았다** — 세로 축은 `.cn-cd>.qt{font-size}` 이고
 * 그 값은 §7 다이아 판매(116)·§9 유물조각·§10 입장권과 **공용**이라 «여기만» 줄일 수 없다는 것이 등재문의 ⚠ 다.
 *
 * ⚑ 338·341·368 규칙 — 처방을 따르기 전에 직접 재현한다. 377 이 못박은 함정을 그대로 물려받는다:
 *   잉크는 `-webkit-text-stroke`(8px = 바깥 4px)까지라 **상자 자(rect·scrollWidth)로는 안 보인다**.
 *   그래서 계산 스타일을 그대로 복사한 **사본을 마젠타 판 위에 띄워 찍고 잉크 bbox 를 잰다**.
 *   ⚠ 사본은 반드시 **저장소 폴더 안**의 파일로 열 것 — /tmp 사본은 웹폰트(126)를 못 찾아 다른 수를 낸다.
 *   ⚠ 판은 **뷰포트 안**에 들어가야 하고(넘치면 잘린 자리가 통째로 «잉크» 로 읽힌다),
 *     행 창은 **pitch 보다 좁아야** 한다(넓으면 이웃 행이 섞여 높이가 두 배로 읽힌다). 둘 다 1회차에 겪었다.
 *
 * 이 프로브가 답하는 것 넷:
 *   ⓐ 광고 4칸의 잉크 높이가 정말 ref +19~20% 인가 (재현)
 *   ⓑ 가로는 377 이 맞춘 그대로인가 (= 남은 축은 세로 하나)
 *   ⓒ 같은 `font-size` 를 쓰는 다른 계열(dia·rel·dtk)도 같은 높이인가 (= «여기만 못 줄인다» 가 사실인가)
 *   ⓓ `font-size` 를 내리면 폭이 얼마나 줄어드는가 — **선형이 아니다**(외곽선 8px 은 fs 를 안 따라간다).
 *     그래서 폭 보존 배수는 «fs 역수» 가 아니라 **문자열마다 실측**해야 한다. 이 표가 그 값을 준다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const OLD = !!process.argv[2];
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const W = 1080, H = 2280;

/* 레퍼런스 목표 — 측정표 docs/measure/13-상점팝업재화탭.md §5-2 6행·§5-3 (index.html 6회차 정오 포함) */
const REF = { '×100': { w: 97.5, h: 31 }, '×50': { w: 81, h: 30 } };
/* 수리 전 실측(1회차, 이 프로브) — 계열별 렌더 폭. 수리는 **세로만** 바꾸는 것이 목표라
   여기서 멀어지면 «남의 칸 폭까지 밀었다» 는 뜻이다. */
const BEFORE = {
  'ad ×100': 101, 'ad ×50': 82,
  'dia ×5,000': 118, 'dia ×35,000': 139, 'dia ×75,000': 140, 'dia ×450,000': 171, 'dia ×1,000,000': 204,
  'rel ×100': 93, 'rel ×1,000': 129, 'rel ×10,000': 134,      /* ⚠ rel 의 «×100» 은 ad 와 문자열이 같다 — 키를 계열까지 붙인다 */
  'dtk ×1': 43
};
const FS_SWEEP = [39.3, 36, 34, 33, 32, 31.5, 31, 30.5, 30, 29];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (v) => Math.round(v * 100) / 100;

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    window.step = () => {};
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.dia = 30000; S.gold = 1e9; S.relic = 5000;
    S.daily = S.daily || {}; S.daily.adBuy = {};
    openShopPage();
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('#shopCats [data-cat]')].find(x => x.dataset.cat === 'coin');
    if (t) t.click();
  });
  await p.waitForTimeout(700);

  /* 한 판(뷰포트 안)에 최대 26행까지만 깐다 — 배치를 나눠 두 번 잰다 */
  const HX = 40, HY = 180, PAD = 300, PITCH = 72, CAP = 26;

  /* specs: [{ sel:'card index', fs:override|null }] — 카드 인덱스는 `.shp-list.coin .cn-cd` 순서 */
  const measureBatch = async (specs) => {
    const M = await p.evaluate(([specs, HX, HY, PAD, PITCH]) => {
      const cards = [...document.querySelectorAll('.shp-list.coin .cn-cd')];
      const old = document.getElementById('p380host'); if (old) old.remove();
      const host = document.createElement('div');
      host.id = 'p380host';
      host.style.cssText = 'position:fixed;left:' + HX + 'px;top:' + HY + 'px;width:1000px;height:'
        + (10 + specs.length * PITCH + 60) + 'px;background:#FF00FF;z-index:2147483647;overflow:visible;pointer-events:none';
      document.body.appendChild(host);
      const CP = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
        'color', 'white-space', 'text-indent', 'transform', 'transform-origin', 'paint-order',
        '-webkit-text-stroke-width', '-webkit-text-stroke-color'];
      const out = specs.map((s, i) => {
        const c = cards[s.card], q = c.querySelector('.qt');
        const cs = getComputedStyle(q), cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
        const clone = document.createElement('div');
        clone.textContent = q.textContent;
        CP.forEach(k => clone.style.setProperty(k, cs.getPropertyValue(k)));
        if (s.fs) clone.style.fontSize = s.fs + 'px';
        clone.style.position = 'absolute';
        clone.style.left = PAD + 'px';
        clone.style.top = (10 + i * PITCH) + 'px';
        clone.style.height = cs.height;
        host.appendChild(clone);
        const b = clone.getBoundingClientRect();
        return Object.assign({}, s, {
          txt: q.textContent,
          fam: c.classList.contains('dia') ? 'dia' : c.classList.contains('rel') ? 'rel'
            : c.classList.contains('dtk') ? 'dtk' : 'ad',
          fsNow: parseFloat(cs.fontSize),
          qx: getComputedStyle(c).getPropertyValue('--qx').trim(),
          card: { l: cr.left, r: cr.right, t: cr.top },
          qt: { l: qr.left, r: qr.right, t: qr.top },
          box: { l: b.left - HX, t: b.top - HY }
        });
      });
      return { rows: out, host: { x: HX, y: HY, w: 1000, h: 10 + specs.length * PITCH + 60 } };
    }, [specs, HX, HY, PAD, PITCH]);

    if (M.host.y + M.host.h > H) throw new Error('사본 판이 뷰포트를 넘는다 — ' + (M.host.y + M.host.h));
    await p.waitForTimeout(120);
    const shot = await p.screenshot({ clip: { x: M.host.x, y: M.host.y, width: M.host.w, height: M.host.h } });
    const rows = await p.evaluate(async ([b64, hw, hh]) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = hw; cv.height = hh;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, hw, hh).data;
      const out = { 8: [], 40: [], 100: [] };
      for (let y = 0; y < hh; y++) {
        const acc = { 8: [-1, -1], 40: [-1, -1], 100: [-1, -1] };
        for (let x = 0; x < hw; x++) {
          const o = (y * hw + x) * 4;
          const dist = Math.max(255 - d[o], d[o + 1], 255 - d[o + 2]);
          [8, 40, 100].forEach(T => { if (dist > T) { if (acc[T][0] < 0) acc[T][0] = x; acc[T][1] = x; } });
        }
        [8, 40, 100].forEach(T => out[T].push(acc[T]));
      }
      return out;
    }, [shot.toString('base64'), M.host.w, M.host.h]);

    const bbox = (i, T) => {
      const y0 = Math.max(0, 10 + i * PITCH - 12), y1 = Math.min(M.host.h - 1, 10 + i * PITCH + 44);
      let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
      for (let y = y0; y <= y1; y++) { const [a, z] = rows[T][y]; if (a >= 0) { l = Math.min(l, a); r = Math.max(r, z); t = Math.min(t, y); b = Math.max(b, y); } }
      return { l, r, t, b, w: (r + 1) - l, h: (b + 1) - t };
    };
    await p.evaluate(() => { const h = document.getElementById('p380host'); if (h) h.remove(); });
    return M.rows.map((r, i) => {
      const bb = bbox(i, 40), b8 = bbox(i, 8), b100 = bbox(i, 100);
      return Object.assign({}, r, {
        inkW: bb.w, inkH: bb.h, w8: b8.w, h8: b8.h, w100: b100.w, h100: b100.h,
        dxL: (r.qt.l - r.card.l) + (bb.l - r.box.l),
        dyTop: (r.qt.t - r.card.t) + (bb.t - r.box.t)
      });
    });
  };

  const nCards = await p.evaluate(() => document.querySelectorAll('.shp-list.coin .cn-cd').length);
  /* ── ⓐⓑⓒ 실제 칸 전부(현행 font-size) ─────────────────────────────────────── */
  const realA = await measureBatch([...Array(Math.min(nCards, CAP)).keys()].map(i => ({ card: i })));
  const realB = nCards > CAP ? await measureBatch([...Array(nCards - CAP).keys()].map(i => ({ card: CAP + i }))) : [];
  const real = realA.concat(realB);

  console.log('== ⓐⓑⓒ 실제 칸 ' + real.length + '개의 `×N` 잉크 (사본 실측 · T40)');
  const fams = ['ad', 'dia', 'rel', 'dtk'];
  fams.forEach((f) => {
    const rows = real.filter(c => c.fam === f);
    if (!rows.length) return;
    console.log('   [' + f + '] ' + rows.length + '칸 · font-size ' + rows[0].fsNow + 'px');
    rows.forEach(c => {
      const was = BEFORE[c.fam + ' ' + c.txt];
      console.log('        ' + c.txt.padEnd(12) + ' 잉크 ' + String(c.inkW).padStart(4) + '×' + c.inkH
        + ' (T8 ' + c.w8 + '×' + c.h8 + ' · T100 ' + c.w100 + '×' + c.h100 + ')'
        + ' · dx' + r1(c.dxL) + ' dy' + r1(c.dyTop) + ' · --qx ' + c.qx
        + (was ? '   [수리 전 폭 ' + was + ' → Δ' + (c.inkW - was >= 0 ? '+' : '') + (c.inkW - was)
          + ' · 폭 보존 배수 ' + r1(was / c.inkW) + ']' : ''));
    });
  });
  console.log('   [ref] ×100 잉크 97~98×**31** @ dx168 dy167~172 · ×50 잉크 81×**30** @ dx171 (측정표 §5-2 6행·§5-3)');

  const ad = real.filter(c => c.fam === 'ad');
  const a100 = ad.find(c => /100/.test(c.txt)), a50 = ad.find(c => /×50/.test(c.txt));
  ok(ad.length === 4, '[1] 광고 카드 4칸을 찾았다', ad.length + '칸');
  if (OLD) {
    ok(a100 && a100.inkH >= 35, '[2] ⚑ 재현(사본) — «×100» 잉크 높이가 ref 31 보다 크다',
      a100 && a100.inkH + ' vs ref 31 (+' + r1((a100.inkH / REF['×100'].h - 1) * 100) + '%)');
    ok(a50 && a50.inkH >= 34, '[3] ⚑ 재현(사본) — «×50» 잉크 높이도 같은 비율로 크다',
      a50 && a50.inkH + ' vs ref 30 (+' + r1((a50.inkH / REF['×50'].h - 1) * 100) + '%)');
  } else {
    ok(a100 && Math.abs(a100.inkH - REF['×100'].h) <= 1, '[2] «×100» 잉크 높이가 ref 31 (±1)',
      a100 && a100.inkH + ' vs ref 31');
    ok(a50 && Math.abs(a50.inkH - REF['×50'].h) <= 1, '[3] «×50» 잉크 높이가 ref 30 (±1)',
      a50 && a50.inkH + ' vs ref 30');
  }
  ok(a100 && Math.abs(a100.h8 - a100.h100) <= 1,
    '[4] 임계를 8~100 으로 스윕해도 높이의 부호가 안 바뀐다(A3 교훈 ⓑ)',
    a100 && 'T8 ' + a100.h8 + ' · T40 ' + a100.inkH + ' · T100 ' + a100.h100);
  ok(a100 && Math.abs(a100.inkW - REF['×100'].w) <= 5 && a50 && Math.abs(a50.inkW - REF['×50'].w) <= 5,
    '[5] 광고 4칸의 가로는 ref 폭 ±5 안에 있다(377 이 세운 축 — 이 작업이 무너뜨리면 안 된다)',
    a100 && '×100 ' + a100.inkW + ' vs ' + REF['×100'].w + ' · ×50 ' + a50.inkW + ' vs ' + REF['×50'].w);
  const others = real.filter(c => c.fam !== 'ad');
  ok(others.length > 0 && others.every(c => Math.abs(c.fsNow - ad[0].fsNow) < 0.01),
    '[6] dia·rel·dtk 도 **같은 `font-size`** 를 쓴다 — 이 축은 계열 공용이다(등재문 ⚠)',
    others.length + '칸 모두 ' + ad[0].fsNow + 'px · 잉크 높이 ' + [...new Set(others.map(c => c.inkH))].sort().join('/'));
  /* 수리 후에는 «남의 칸 폭» 이 그대로인지가 이 작업의 경계다 */
  const drift = others.filter(c => BEFORE[c.fam + ' ' + c.txt] != null)
    .map(c => ({ t: c.fam + ' ' + c.txt, d: c.inkW - BEFORE[c.fam + ' ' + c.txt] }));
  const maxDrift = drift.length ? Math.max(...drift.map(x => Math.abs(x.d))) : 0;
  if (!OLD) {
    ok(maxDrift <= 2, '[7] dia·rel·dtk 의 **렌더 폭**이 수리 전 그대로다(±2px) — 바뀐 축은 세로 하나',
      drift.map(x => x.t + ' Δ' + (x.d >= 0 ? '+' : '') + x.d).join(' · '));
  } else {
    ok(true, '[7] (사본 모드) 계열별 폭 기준선', drift.map(x => x.t + ' ' + (BEFORE[x.t] + x.d)).join(' · '));
  }

  /* ── ⓓ font-size 스윕 (광고 두 문자열) ──────────────────────────────────────── */
  const a100i = real.indexOf(a100), a50i = real.indexOf(a50);
  const sweepSpecs = [];
  FS_SWEEP.forEach(fs => sweepSpecs.push({ card: a100i, fs, tag: '×100' }));
  FS_SWEEP.forEach(fs => sweepSpecs.push({ card: a50i, fs, tag: '×50' }));
  const sw = await measureBatch(sweepSpecs);
  console.log('\n== ⓓ `font-size` 스윕 — 잉크 높이·폭 (qx 는 현행 그대로)');
  ['×100', '×50'].forEach((tag) => {
    const rows = sw.filter(s => s.tag === tag);
    console.log('   ' + tag + ' (ref ' + REF[tag].w + '×' + REF[tag].h + ')');
    rows.forEach(s => console.log('        fs ' + String(s.fs).padStart(5) + ' → 잉크 ' + String(s.inkW).padStart(4) + '×' + String(s.inkH).padStart(3)
      + '  (ref h Δ' + (s.inkH - REF[tag].h >= 0 ? '+' : '') + (s.inkH - REF[tag].h) + ')'
      + '  ref 폭까지 필요한 qx 배수 ' + r1(REF[tag].w / s.inkW)));
  });
  const hits = FS_SWEEP.filter(fs => ['×100', '×50'].every((tag) => {
    const r = sw.find(s => s.tag === tag && Math.abs(s.fs - fs) < 0.01);
    return r && Math.abs(r.inkH - REF[tag].h) <= 1;
  }));
  ok(hits.length > 0, '[8] 두 문자열을 **한 값**으로 ref 높이(±1)에 넣는 `font-size` 구간이 있다',
    hits.length ? hits.map(f => f + 'px').join(' · ') : '스윕 구간에 없음');
  /* 폭은 fs 에 **선형이 아니다** — 외곽선 8px 은 fs 를 안 따라가므로 짧은 문자열일수록 덜 준다.
     ⇒ 폭 보존 배수를 «fs 역수» 로 지어내면 안 되고 문자열마다 실측해야 한다. */
  const linDev = ['×100', '×50'].map((tag) => {
    const base = sw.find(s => s.tag === tag && Math.abs(s.fs - 39.3) < 0.01);
    const at31 = sw.find(s => s.tag === tag && Math.abs(s.fs - 31) < 0.01);
    return Math.abs((at31.inkW / base.inkW) / (31 / 39.3) - 1);
  });
  ok(Math.max(...linDev) > 0.005,
    '[9] 폭은 `font-size` 에 **선형이 아니다**(외곽선 8px 은 fs 를 안 따라간다) ⇒ 보존 배수는 실측해야 한다',
    'fs 39.3→31 에서 선형 예측 대비 ' + linDev.map(v => '+' + r1(v * 100) + '%').join(' · '));

  ok(errs.length === 0, '[10] 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  console.log('\nPROBE380' + (OLD ? '(사본 ' + path.basename(SRC) + ')' : '') + ' ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
