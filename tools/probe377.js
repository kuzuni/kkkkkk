#!/usr/bin/env node
/* 재현기 — 작업 377 「13 재화 탭 «보석 ×100» 카드의 수량 라벨이 카드 안쪽 경계에서 잘린다」
 *
 *   node tools/probe377.js
 *
 * 등재문의 가설: `.cn-cd>.qt` 의 **잉크 우변**(외곽선 8px 의 절반 4px 포함)이 자르는 조상
 * `.cn-cd{overflow:hidden}` 의 우변을 **+1.13px** 넘는다. 365 가 격자를 3열 → 2열로 바꾸면서
 * 자릿수가 하나 더 긴 «×100» 이 처음 이 자리에 왔다는 것이 뿌리라고 적혀 있다.
 *
 * ⚑ 338·341·368 규칙 — 처방을 따르기 전에 **직접 재현**한다. 그리고 이 결함은
 *   **자를 잘못 대면 안 보인다**(등재문):
 *     · `scrollWidth == clientWidth` (넘침 0) — advance 상자는 안 넘는다
 *     · `.qt` 의 `getBoundingClientRect()` 우변도 카드 **안쪽** 2.87px
 *   넘치는 것은 **글자 외곽선(잉크)** 이다. 그래서 이 프로브는 상자가 아니라 **찍힌 픽셀**을 잰다.
 *
 * 재는 법 — 잘린 것은 화면에 안 나오므로 캡처만으로는 «얼마나» 를 못 잰다. 그래서
 *   ⓐ 실제 카드에서 상자(rect)·계산 스타일을 읽고,
 *   ⓑ 같은 계산 스타일을 그대로 복사한 **사본**을 마젠타 판 위에 띄워 찍은 뒤 잉크 bbox 를 재고,
 *   ⓒ 사본의 잉크 오프셋을 실제 상자에 되붙여 «잘리지 않았다면 어디까지 갔을 것인가» 를 얻는다.
 * ⓓ 는 그 값이 진짜임을 화면 픽셀로 교차 검증한다 — `overflow:visible` 로 풀어 찍은 캡처와
 *   기본(잘린) 캡처에서 라벨 띠의 잉크 우변을 각각 세어, 기본 쪽이 **카드 우변에서 멈추는지** 본다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
/* 인자로 다른 `index.html` 사본을 줄 수 있다 — «수리 전 커밋에서도 같은 값인가» 를 재는 데 쓴다
   (338·344 규칙). 예: `git show <sha>:index.html > /tmp/old.html && node tools/probe377.js /tmp/old.html` */
const OLD = !!process.argv[2];
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const W = 1080, H = 2280;

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

  /* 정식 경로로 재화 탭 — cap13 하네스와 같다 */
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
  await p.evaluate(() => {
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });
  await p.waitForTimeout(150);

  /* ── ⓐ·ⓑ·ⓒ — 광고 카드 4칸의 «잘리지 않았다면» 잉크 우변 ─────────────────── */
  const M = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.shp-list.coin .cn-cd:not(.dia):not(.rel):not(.dtk)')];
    /* 사본을 띄울 마젠타 판 — 배경과 절대 안 겹치는 색 */
    const host = document.createElement('div');
    const HX = 60, HY = 300, PAD = 240;
    host.style.cssText = 'position:fixed;left:' + HX + 'px;top:' + HY + 'px;width:900px;height:' + (10 + cards.length * 60 + 50) + 'px;'
      + 'background:#FF00FF;z-index:2147483647;overflow:visible;pointer-events:none';
    document.body.appendChild(host);
    const CP = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'color', 'white-space', 'text-indent', 'transform', 'transform-origin', 'paint-order',
      '-webkit-text-stroke-width', '-webkit-text-stroke-color'];

    const out = cards.map((c, i) => {
      const q = c.querySelector('.qt');
      const cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
      const cs = getComputedStyle(q);
      const clone = document.createElement('div');
      clone.textContent = q.textContent;
      CP.forEach(k => clone.style.setProperty(k, cs.getPropertyValue(k)));
      clone.style.position = 'absolute';
      clone.style.left = PAD + 'px';
      clone.style.top = (10 + i * 0) + 'px';
      clone.style.height = cs.height;
      host.appendChild(clone);
      const clr = clone.getBoundingClientRect();
      return {
        i, txt: q.textContent, cls: c.className,
        card: { l: cr.left, r: cr.right, w: cr.width },
        qt: { l: qr.left, r: qr.right, w: qr.width },
        origin: cs.transformOrigin, transform: cs.transform,
        stroke: parseFloat(cs.getPropertyValue('-webkit-text-stroke-width')) || 0,
        fs: parseFloat(cs.fontSize),
        /* advance 상자 넘침(등재문의 «자를 잘못 대면 안 보인다» — 여기서 0 이 나와야 한다) */
        scrollOver: q.scrollWidth - q.clientWidth,
        cloneBox: { l: clr.left, r: clr.right, t: clr.top, b: clr.bottom },
        host: { l: HX, t: HY }
      };
    });
    /* 사본은 한 줄에 하나씩 **겹치지 않게** 깐다 — 행 간격이 잉크 높이(외곽선 포함)보다 좁으면
       이웃 행의 잉크가 스캔 창에 섞여 «형제 칸이 더 넓다» 같은 유령이 나온다(1회차에 실제로 나왔다). */
    [...host.children].forEach((el, i) => { el.style.top = (10 + i * 60) + 'px'; });
    return { cards: out, host: { x: HX, y: HY, w: 900, h: 10 + cards.length * 60 + 50 }, pitch: 60 };
  });

  /* 사본 판을 찍어 잉크 bbox 를 잰다 */
  const shotHost = await p.screenshot({ clip: { x: M.host.x, y: M.host.y, width: M.host.w, height: M.host.h } });
  const inkRows = await p.evaluate(async ([b64, hw, hh]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = hw; cv.height = hh;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, hw, hh).data;
    /* 마젠타(255,0,255) 에서 얼마나 먼가 = 잉크. ⚠ A3 교훈 ⓑ — «크기» 는 임계 하나로 재지 말고
       스윕해서 **부호가 안 바뀌는지** 본다. T8 은 AA 후광까지, T100 은 코어만 센다. */
    const rows = { 8: [], 40: [], 100: [] };
    for (let y = 0; y < hh; y++) {
      const acc = { 8: [-1, -1], 40: [-1, -1], 100: [-1, -1] };
      for (let x = 0; x < hw; x++) {
        const o = (y * hw + x) * 4;
        const dist = Math.max(255 - d[o], d[o + 1], 255 - d[o + 2]);
        [8, 40, 100].forEach(T => { if (dist > T) { if (acc[T][0] < 0) acc[T][0] = x; acc[T][1] = x; } });
      }
      [8, 40, 100].forEach(T => rows[T].push(acc[T]));
    }
    return rows;
  }, [shotHost.toString('base64'), M.host.w, M.host.h]);

  /* 행 구간(사본 i 는 top 10 + i*32, 높이 30)마다 잉크 bbox 로 합친다 */
  console.log('== ⓐⓑⓒ 잘리지 않았다면 어디까지 가는가 (사본 실측)');
  const res = [];
  M.cards.forEach((c, i) => {
    const y0 = Math.max(0, 10 + i * M.pitch - 12), y1 = Math.min(M.host.h - 1, 10 + i * M.pitch + 30 + 12);
    const bbox = (T) => {
      let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
      for (let y = y0; y <= y1; y++) { const [a, z] = inkRows[T][y]; if (a >= 0) { l = Math.min(l, a); r = Math.max(r, z); t = Math.min(t, y); b = Math.max(b, y); } }
      return { l, r, t, b, w: (r + 1) - l, h: (b + 1) - t };
    };
    const sw = { 8: bbox(8), 40: bbox(40), 100: bbox(100) };
    const { l, r, t, b } = sw[40];
    /* 사본 판 좌표 → 사본 상자 좌표 → 실제 카드 좌표 */
    const cloneL = M.cards[i].cloneBox.l - M.host.x;          // 사본 상자 좌변(판 기준)
    const inkOffR = (r + 1) - cloneL;                          // 상자 좌변에서 잉크 우변까지
    const inkOffL = l - cloneL;
    const realInkR = c.qt.l + inkOffR, realInkL = c.qt.l + inkOffL;
    const over = realInkR - c.card.r;
    res.push({ txt: c.txt, cardR: c.card.r, qtR: c.qt.r, realInkL, realInkR, over, scrollOver: c.scrollOver,
      inkW: (r + 1) - l, inkH: (b + 1) - t, dxL: realInkL - c.card.l, dxR: realInkR - c.card.l });
    console.log('   [' + i + '] ' + c.txt.padEnd(6) + ' 카드우변 ' + r1(c.card.r)
      + ' · qt 상자우변 ' + r1(c.qt.r) + '(여유 ' + r1(c.card.r - c.qt.r) + ')'
      + ' · **잉크 ' + ((r + 1) - l) + '×' + ((b + 1) - t) + ' dx' + r1(realInkL - c.card.l) + '..' + r1(realInkR - c.card.l) + '**'
      + ' ⇒ ' + (over > 0 ? '넘침 +' + r1(over) : '여유 ' + r1(-over))
      + ' · scrollW−clientW=' + c.scrollOver);
    console.log('        임계 스윕 잉크폭 — T8 ' + sw[8].w + ' · T40 ' + sw[40].w + ' · T100 ' + sw[100].w
      + ' (부호가 안 바뀌어야 «크다» 가 진짜다 — A3 교훈 ⓑ)');
  });
  /* 레퍼런스 목표(측정표 §5-3 · index.html 6회차 정오) — ×100 = 97~98×31 @ dx168 · ×50 = 81×30 @ dx171 */
  console.log('   [ref] ×100 잉크 97~98×31 @ dx168..265.5 · ×50 잉크 81×30 @ dx171..252');

  const dia = res[0];
  ok(dia && /100/.test(dia.txt), '[1] 첫 칸이 «×100» 이다', dia && dia.txt);
  ok(dia && dia.scrollOver === 0, '[2] advance 상자는 안 넘는다(scrollWidth==clientWidth) — 상자 자로는 안 보인다', dia && dia.scrollOver);
  ok(dia && dia.cardR - dia.qtR > 2, '[3] `.qt` 상자 우변도 카드 안쪽이다 — rect 자로도 안 보인다', dia && r1(dia.cardR - dia.qtR) + 'px 안쪽');
  if (OLD) {
    ok(dia && dia.over > 0, '[4] ⚑ 재현(옛 사본) — «×100» 의 **잉크** 우변이 카드 우변을 넘는다', dia && '+' + r1(dia.over) + 'px');
  } else {
    ok(dia && dia.over < -8, '[4] 수리 후 — «×100» 잉크가 카드 안쪽으로 들어왔다(검정 테 7px 안쪽까지)',
      dia && '여유 ' + r1(-dia.over) + 'px');
  }
  res.slice(1).forEach((x, i) => ok(x.over < 0, '[5-' + (i + 1) + '] 형제 칸 «' + x.txt + '» 은 안 넘는다', '여유 ' + r1(-x.over) + 'px'));
  /* ⚑ 등재문의 뿌리(«365 의 4종 2열 재배치») 를 기각하는 두 줄 —
     ① 같은 문자열의 칸은 **열이 달라도 카드 기준 dx 가 같다**(넘침은 열 위치와 무관)
     ② 옛 사본(365 이전)에도 같은 넘침이 있다 → `node tools/probe377.js <옛 index.html>` */
  const same = res.filter(x => x.txt === res[res.length - 1].txt);
  ok(same.length > 1 && same.every(x => Math.abs(x.dxR - same[0].dxR) < 0.5),
    '[R] 같은 «' + same[0].txt + '» 은 좌·우열에서 카드 기준 dx 가 같다 = 넘침은 **열 위치와 무관**하다(365 기각)',
    same.map(x => 'dx' + r1(x.dxR)).join(' · '));

  /* ── ⓓ — 화면 픽셀 교차 검증: 잘린 캡처는 카드 우변에서 멈춘다 ─────────────── */
  const band = await p.evaluate(() => {
    const c = document.querySelector('.shp-list.coin .cn-cd:not(.dia):not(.rel):not(.dtk)');
    const q = c.querySelector('.qt'), cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
    return { x: Math.floor(cr.left) - 20, y: Math.floor(qr.top) - 6, w: Math.ceil(cr.width) + 60, h: Math.ceil(qr.height) + 12, cardR: cr.right };
  });
  /* ⚠ 122 «상시 연출»(둥실·광택)은 **의사요소**에도 걸려 있어 요소 인라인 `animation:none` 으로는 안 멈춘다
     (LESSONS A1 «리셋은 ::before/::after 를 못 잡는다»). 안 멈추면 두 캡처의 차분이 연출 때문에 벌어져
     «클립 때문에 달라졌다» 로 오독한다 — 1회차에 실제로 카드 한복판(x282..373)이 빨갛게 나왔다. */
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p377freeze';
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
  });
  await p.waitForTimeout(150);
  const shotBand = async () => (await p.screenshot({ clip: { x: band.x, y: band.y, width: band.w, height: band.h } })).toString('base64');
  const b64Clipped = await shotBand();
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p377';
    st.textContent = '.cn-cd{overflow:visible !important}';
    document.head.appendChild(st);
  });
  await p.waitForTimeout(120);
  const b64Free = await shotBand();
  await p.evaluate(() => { const s = document.getElementById('p377'); if (s) s.remove(); });

  const D = await p.evaluate(async ([a, b, w, h]) => {
    const dec = async (s) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, w, h).data;
    };
    const A = await dec(a), B = await dec(b);
    let n = 0, xl = 1e9, xr = -1, whiteA = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (Math.abs(A[o] - B[o]) > 12 || Math.abs(A[o + 1] - B[o + 1]) > 12 || Math.abs(A[o + 2] - B[o + 2]) > 12) {
        n++; xl = Math.min(xl, x); xr = Math.max(xr, x);
      }
      if (A[o] > 235 && A[o + 1] > 235 && A[o + 2] > 235) whiteA = Math.max(whiteA, x);
    }
    return { n, xl: xl === 1e9 ? -1 : xl, xr, whiteA };
  }, [b64Clipped, b64Free, band.w, band.h]);

  const whiteR = band.x + D.whiteA, rim = band.cardR - 7;   // `.fr` border 7px 안쪽 우변
  console.log('== ⓓ 화면 픽셀 (띠 좌변 ' + band.x + ' 기준)');
  console.log('   흰 채움 우변 ' + whiteR + ' · 검정 테 안쪽 우변 ' + r1(rim) + ' · 카드 우변 ' + r1(band.cardR)
    + ' ⇒ ' + (whiteR > rim ? '테 위로 +' + r1(whiteR - rim) : '테까지 여유 ' + r1(rim - whiteR)));
  console.log('   `overflow:visible` 로 풀었을 때 달라지는 픽셀 ' + D.n + '개 · 절대 x'
    + (D.xl < 0 ? '—' : (band.x + D.xl) + '..' + (band.x + D.xr))
    + '   ⚠ 카드 밖(>' + r1(band.cardR) + ')에 새 픽셀이 안 보이는 것은 정상이다 — 넘치는 부분은'
    + ' **검정 외곽선**이고 그 자리는 `.fr` 검정 테라 검정 위의 검정이다(사람이 보는 것은 아래 [6]).');
  if (OLD) {
    ok(whiteR > rim, '[6] ⚑ 재현(옛 사본) — 흰 글자 채움이 카드 검정 테(안쪽 우변 ' + r1(rim) + ') 위로 올라탄다',
      '흰 우변 ' + whiteR);
  } else {
    ok(whiteR <= rim - 6, '[6] 수리 후 — 흰 글자 채움과 검정 테 사이에 여백이 돌아왔다',
      '흰 우변 ' + whiteR + ' ≤ ' + r1(rim - 6) + ' (여유 ' + r1(rim - whiteR) + 'px)');
  }

  ok(errs.length === 0, '[7] 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  console.log('\nPROBE377 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
