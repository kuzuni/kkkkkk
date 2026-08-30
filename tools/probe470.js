/* 작업 470 재현 — 10 상점 «소환» 탭 배너 카드의 레벨 알약 «Lv.n» 글씨 잘림.
 *
 * 338 규칙: 등재문의 처방을 따르기 전에 «주인이 본 그림» 을 픽셀로 먼저 재현한다.
 * 등재문의 가설은 둘이었다 — ⓐ 글자 폭이 알약 안쪽 폭보다 크다 · ⓑ 알약(또는 조상)이
 * `overflow:hidden` 인데 글자가 밖으로 나간다. 둘 다 «찍힌 픽셀» 로 판정한다.
 *
 * 재는 것(카드 5장 × 레벨 1·2·6·10·24·SUM_MAXLV):
 *   ① 레이아웃 상자 — `.clv` rect · `.clv>i` rect(변환 후) · 조상 overflow 사슬
 *   ② 찍힌 픽셀 — 알약 둘레를 넉넉히 둘러싼 클립을 캡처해 페이지로 되돌리고(350 처방)
 *      시안 잉크(#7DE5ED 계열) bbox 와 검정 알약(#000) bbox 를 각각 스캔한다.
 *      · 잉크가 알약 밖으로 나갔나 = ink.x1 < pill.x1 || ink.x2 > pill.x2
 *      · 잉크 좌우 여백(알약 안쪽 기준) = ink.x1 − pill.x1 · pill.x2 − ink.x2
 *   ③ 경험치 바 «n/need» 도 같은 축으로(최대 문자열)
 *
 * ⚠ 알약은 캡슐(radius 22)이라 «안쪽 폭» 은 사각이 아니다 — 글자 잉크 높이 구간에서
 *   실제로 검정이 있는 x 범위를 픽셀로 재야 «물림» 이 나온다(사각 rect 로 재면 안 나온다).
 *
 * 실행: node tools/probe470.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const LEVELS = [1, 2, 6, 10, 24, 25];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const maxlv = await p.evaluate(() => {
    S.dia = 2e6; S.gold = 1e9;
    S.daily = S.daily || {}; S.daily.freeSum = {};
    openShopPage();
    return SUM_MAXLV;
  });
  await p.waitForTimeout(700);

  /* 유휴 루프·상시 연출 정지(LESSONS 28-③ · 51-③) */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  });

  console.log('PROBE470 — 10 상점 소환 탭 «Lv.n» 알약 (SUM_MAXLV=' + maxlv + ')');
  console.log('');

  /* 조상 overflow 사슬 — 등재문 가설 ⓑ */
  const chain = await p.evaluate(() => {
    const el = document.querySelector('.shp-card .clv');
    if (!el) return null;
    const out = []; let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      out.push({
        tag: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\s+/).join('.') : ''),
        ov: cs.overflow, clip: cs.clipPath, br: cs.borderRadius,
      });
      n = n.parentElement;
    }
    return out;
  });
  console.log('[A] 조상 overflow 사슬 (`.clv` → 위로)');
  chain.slice(0, 7).forEach(c => console.log('    ' + c.tag.slice(0, 44).padEnd(46) + ' overflow=' + c.ov + ' radius=' + c.br));
  const clipped = chain.some(c => /hidden|clip|scroll|auto/.test(c.ov) && c.tag !== 'html');
  console.log('    ⇒ 잘라내는 조상 ' + (clipped ? '있음' : '**없음** — 가설 ⓑ(overflow 클리핑) 기각'));
  console.log('');

  /* 인라인 요소에는 transform 이 안 먹는다 — 실제로 먹고 있는지 확인 */
  const dispInfo = await p.evaluate(() => {
    const i = document.querySelector('.shp-card .clv>i');
    const cs = getComputedStyle(i);
    return { display: cs.display, transform: cs.transform, fs: cs.fontSize, ls: cs.letterSpacing,
             stroke: cs.webkitTextStrokeWidth, po: cs.paintOrder, ff: cs.fontFamily.slice(0, 40) };
  });
  console.log('[B] `.clv>i` computed — display=' + dispInfo.display + ' transform=' + dispInfo.transform);
  console.log('    font-size=' + dispInfo.fs + ' letter-spacing=' + dispInfo.ls
    + ' text-stroke=' + dispInfo.stroke + ' paint-order=' + dispInfo.po);
  console.log('');

  const rows = [];
  for (const lv of LEVELS) {
    await p.evaluate((L) => {
      Object.keys(S.sum).forEach(k => { S.sum[k].lv = Math.min(L, SUM_MAXLV); S.sum[k].exp = Math.floor(sumNeedExp(S.sum[k].lv) * 0.5); });
      renderShopPage();
      /* ⚠ 차분 마스크는 «두 장 사이에 글자 말고는 아무것도 안 변한다» 가 전제다 —
         122 의 상시 연출(광택 스윕·글로우 호흡·레드닷 맥동)이 돌면 클립 전체가 잉크로 읽힌다
         (2회차에 잉크 141×96 = 클립 전체가 그것이다). 렌더가 DOM 을 새로 만드므로 **매 렌더마다** 끈다. */
      document.querySelectorAll('#shopw, #shopw *').forEach(e => {
        e.style.animation = 'none'; e.style.transition = 'none';
      });
    }, lv);
    await p.waitForTimeout(160);

    const nCard = await p.evaluate(() => document.querySelectorAll('.shp-card').length);
    if (!nCard) { console.log('카드 0장 — 진입 실패'); break; }
    /* ⚠ `.shp-list` 는 스크롤 그릇이라 아래 카드는 뷰포트 밖이다 — 캡처 전에 한 장씩 끌어온다 */
    const boxes = [];
    for (let ci = 0; ci < nCard; ci++) {
      const bx = await p.evaluate((i) => {
        const card = document.querySelectorAll('.shp-card')[i];
        card.scrollIntoView({ block: 'center' });
        const pill = card.querySelector('.clv'); const ink = card.querySelector('.clv>i');
        const bt = card.querySelector('.cbar>b');
        if (!pill) return null;
        const r = pill.getBoundingClientRect();
        return { i, txt: ink.textContent, btxt: bt ? bt.textContent : '',
          pill: [r.x, r.y, r.width, r.height] };
      }, ci);
      if (bx) boxes.push(bx);
    }
    await p.waitForTimeout(120);

    /* 찍힌 픽셀 — 알약 주변을 넉넉히 캡처해 페이지 캔버스로 되돌린다(350 처방) */
    for (const bx of boxes) {
      /* ⚠ 스크롤이 두 캡처 사이에도 «움직이고» 있으면 차분이 화면 전체를 잉크로 만든다 —
         3회차에 가운데 카드(이미 화면 안이라 스크롤 0)만 깨끗했던 것이 그 자국이다.
         ⇒ 부드러운 스크롤을 끄고, 위치가 두 프레임 연속 같아질 때까지 기다린 뒤에 rect 를 읽는다. */
      await p.evaluate((i) => {
        const card = document.querySelectorAll('.shp-card')[i];
        const list = document.getElementById('shopList');
        if (list) list.style.scrollBehavior = 'auto';
        card.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, bx.i);
      const now = await p.evaluate((i) => new Promise(res => {
        const card = document.querySelectorAll('.shp-card')[i];
        let last = null;
        const tick = () => {
          const r = card.querySelector('.clv').getBoundingClientRect();
          const k = r.x + ',' + r.y;
          if (k === last) return res([r.x, r.y, r.width, r.height]);
          last = k; requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), bx.i);
      bx.pill = now;
      const [px, py, pw_, ph] = now;
      const pad = 26;
      const clip = { x: Math.round(px - pad), y: Math.round(py - pad),
                     width: Math.round(pw_ + pad * 2), height: Math.round(ph + pad * 2) };
      /* ⚠ 색만으로는 못 가른다 — 1번 카드(무기)의 본문색 `#5BCAF5` 가 글자색 `#7DE5ED` 에서
         겨우 ΔRGB 44 라 «본문 배경» 이 통째로 잉크로 읽혔다(1회차에 잉크 141×96 이 그것이다).
         ⇒ 글자를 **껐다 켠 두 장의 차분**으로 마스크를 만든다 — 색과 무관하게 «글자가 칠한 픽셀» 만 남는다. */
      const shotOn = (await p.screenshot({ clip })).toString('base64');
      /* ⚠ 같은 화면을 두 번 찍어도 픽셀이 같지 않다 — 이 카드의 `filter:drop-shadow` 레이어가
         다시 래스터되면서 본문 그라디언트가 흔들린다(널 대조 실측: 2052 픽셀 · 최대 Δ51).
         ⇒ **널 대조를 표본마다 같이 찍어 잡음 바닥을 재고**, 잉크 문턱을 그 위(90)에 세운다.
         잡음 바닥이 문턱을 넘으면 그 표본은 «판정 불가» 로 내보낸다(조용히 틀리지 않게). */
      const shotCtl = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate((i) => { document.querySelectorAll('.shp-card')[i].querySelector('.clv>i').style.visibility = 'hidden'; }, bx.i);
      const shotOff = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate((i) => { document.querySelectorAll('.shp-card')[i].querySelector('.clv>i').style.visibility = ''; }, bx.i);

      const scan = await p.evaluate(async ({ a64, b64, c64, w, h }) => {
        const load = async (s) => {
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, w, h).data;
        };
        const A = await load(a64), B0 = await load(b64), C = await load(c64);
        const isBlk = (r, gg, bb) => r < 34 && gg < 34 && bb < 34;
        const dmax = (X, Y, o) => Math.max(Math.abs(X[o] - Y[o]), Math.abs(X[o + 1] - Y[o + 1]), Math.abs(X[o + 2] - Y[o + 2]));
        const TH = 90;                                  /* 잉크 문턱 — 널 대조 바닥(≈51) 위 */
        let floor = 0;
        const I = { x1: 1e9, y1: 1e9, x2: -1, y2: -1, n: 0 };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const o = (y * w + x) * 4;
          const f = dmax(A, C, o); if (f > floor) floor = f;
          if (dmax(A, B0, o) > TH) { I.n++; if (x < I.x1) I.x1 = x; if (x > I.x2) I.x2 = x; if (y < I.y1) I.y1 = y; if (y > I.y2) I.y2 = y; }
        }
        /* 잉크 높이 구간에서 «검정 알약이 실제로 있는» x 범위 — 캡슐 곡선 보정.
           글자를 끈 장(B0)에서 재야 글자가 알약 밖으로 나간 자리를 안 세운다. */
        let cx1 = 1e9, cx2 = -1;
        if (I.n) for (let y = I.y1; y <= I.y2; y++) {
          for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (isBlk(B0[o], B0[o + 1], B0[o + 2])) { if (x < cx1) cx1 = x; if (x > cx2) cx2 = x; }
          }
        }
        return { I, cx1, cx2, floor, TH };
      }, { a64: shotOn, b64: shotOff, c64: shotCtl, w: clip.width, h: clip.height });

      const { I, cx1, cx2, floor, TH } = scan;
      if (!I.n) { console.log('  ink 0 — 카드' + bx.i); continue; }
      if (floor >= TH) { console.log('  판정 불가(잡음 바닥 ' + floor + ' ≥ 문턱 ' + TH + ') — 카드' + bx.i); continue; }
      /* 알약 좌표계(캡처 클립 기준) */
      const ml = I.x1 - cx1, mr = cx2 - I.x2;
      rows.push({ lv, card: bx.i, txt: bx.txt, inkW: I.x2 - I.x1 + 1, inkH: I.y2 - I.y1 + 1,
        ml, mr, pillW: cx2 - cx1 + 1, box: bx.pill[2], btxt: bx.btxt, floor });
    }
  }

  console.log('[C] 찍힌 픽셀 — «Lv.n» 잉크 ↔ 검정 알약 (잉크 높이 구간의 검정 x 범위 기준)');
  console.log('     lv 카드 문자열  잉크w×h   알약 실폭  좌여백  우여백   판정');
  let worst = 99, bad = 0;
  for (const r of rows) {
    const v = Math.min(r.ml, r.mr);
    if (v < worst) worst = v;
    const verdict = v < 0 ? '★ 물림(잘려 보임)' : v < 8 ? '△ 여백 <8' : '초록';
    if (v < 8) bad++;
    console.log('    ' + String(r.lv).padStart(3) + ' ' + String(r.card).padStart(3) + '  '
      + String(r.txt).padEnd(8) + String(r.inkW + '×' + r.inkH).padStart(8) + '  '
      + String(r.pillW).padStart(7) + '  ' + String(r.ml).padStart(6) + '  ' + String(r.mr).padStart(6)
      + '   ' + verdict);
  }
  console.log('');
  console.log('    최소 여백 = ' + worst + 'px · «여백 <8» 표본 ' + bad + '/' + rows.length);
  console.log('    ⇒ 가설 ⓐ(글자 폭 > 알약 안쪽 폭) ' + (worst < 0 ? '**확인**' : worst < 8 ? '부분 확인(물리진 않지만 8px 미달)' : '기각'));
  console.log('');

  /* ─────────────────────────────────────────────────────────────────────────
     [D] 등재문이 가리킨 자리가 초록이면 «주인이 본 화면» 은 다른 데다.
     주인 원문의 스크린샷 문자열 «Lv.6 · 5/1500» 은 소환 배너(Lv.n + exp/need)가 아니라
     **05 장비 세부 팝업 `#wpnw`** 의 «Lv. n» 알약(`#wpnLv`) + 재료 바(`#wpnBarT` = got/need)와
     같은 꼴이고, «레벨**들**»(복수)도 그 팝업의 격자 배지(`.wgc .lv`, 한 화면 20칸)와 맞는다.
     ⇒ 같은 자(잉크 ↔ 호스트 안쪽 박스)를 그 자리에도 댄다.
     ───────────────────────────────────────────────────────────────────────── */
  const ok = await p.evaluate(async () => {
    document.querySelector('.tab[data-t="hero"]').click();
    await new Promise(r => setTimeout(r, 450));
    const s = document.querySelector('#eqCards [data-eqslot="weapon"]');
    if (!s) return false;
    s.click();
    return true;
  });
  await p.waitForTimeout(700);
  if (!ok) { console.log('[D] 05 팝업 진입 실패'); }
  else {
    await p.evaluate(() => {
      document.querySelectorAll('#wpnw, #wpnw *').forEach(e => { e.style.animation = 'none'; e.style.transition = 'none'; });
    });
    console.log('[D] 05 장비 세부 팝업 `#wpnw` — «Lv.» 잉크 ↔ 호스트 안쪽 박스 (찍힌 픽셀)');
    console.log('     레벨  대상            문자열     잉크w×h   안쪽폭  좌여백  우여백  상여백  하여백  판정');
    const D = [];
    for (const lv of [1, 6, 10, 25]) {
      await p.evaluate((L) => {
        Object.keys(S.sum).forEach(k => { S.sum[k].lv = Math.min(L, SUM_MAXLV); });
        /* 격자 배지는 «보유 아이템의 강화 레벨(oLv)» 이라 소환 레벨과 다른 축이다 — 둘 다 올린다 */
        Object.keys(S.own || {}).forEach(id => { if (S.own[id]) S.own[id].lv = L; });
        renderWpn();
        document.querySelectorAll('#wpnw, #wpnw *').forEach(e => { e.style.animation = 'none'; e.style.transition = 'none'; });
      }, lv);
      await p.waitForTimeout(200);

      const targets = await p.evaluate(() => {
        const out = [];
        const pill = document.querySelector('#wpnLv');
        if (pill) out.push({ key: '#wpnLv 알약', host: '#wpnLv', ink: '#wpnLv>i' });
        const g = document.querySelectorAll('#wpnGrid .wgc');
        /* 격자는 20칸이라 전부 재면 느리다 — 문자열이 가장 긴 칸 + 첫 칸을 본다 */
        let best = -1, bestLen = -1;
        g.forEach((c, i) => { const t = c.querySelector('.lv>i'); if (t && t.textContent.length > bestLen) { bestLen = t.textContent.length; best = i; } });
        if (best >= 0) out.push({ key: '.wgc[' + best + '] .lv', host: '#wpnGrid .wgc:nth-of-type(' + (best + 1) + ')', ink: '#wpnGrid .wgc:nth-of-type(' + (best + 1) + ') .lv>i' });
        const bt = document.querySelector('#wpnBarT');
        if (bt) out.push({ key: '#wpnBarT 재료바', host: '#wpnBarT', ink: '#wpnBarT>i' });
        return out;
      });

      for (const t of targets) {
        const geo = await p.evaluate((t) => {
          const h = document.querySelector(t.host), i = document.querySelector(t.ink);
          if (!h || !i) return null;
          const r = h.getBoundingClientRect(), cs = getComputedStyle(h);
          const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
          const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
          return { r: [r.x, r.y, r.width, r.height], b: [bl, bt, br, bb], txt: i.textContent,
                   ov: cs.overflow };
        }, t);
        if (!geo) continue;
        const [hx, hy, hw, hh] = geo.r, [bl, bt2, br2, bb2] = geo.b;
        const pad = 30;
        const clip = { x: Math.max(0, Math.round(hx - pad)), y: Math.max(0, Math.round(hy - pad)),
                       width: Math.round(hw + pad * 2), height: Math.round(hh + pad * 2) };
        const a = (await p.screenshot({ clip })).toString('base64');
        const c = (await p.screenshot({ clip })).toString('base64');
        await p.evaluate((sel) => { document.querySelector(sel).style.visibility = 'hidden'; }, t.ink);
        const off = (await p.screenshot({ clip })).toString('base64');
        await p.evaluate((sel) => { document.querySelector(sel).style.visibility = ''; }, t.ink);
        const sc = await p.evaluate(async ({ a64, b64, c64, w, h }) => {
          const load = async (s) => { const img = new Image();
            await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
            const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
            const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
          const A = await load(a64), B0 = await load(b64), C = await load(c64);
          const dm = (X, Y, o) => Math.max(Math.abs(X[o] - Y[o]), Math.abs(X[o + 1] - Y[o + 1]), Math.abs(X[o + 2] - Y[o + 2]));
          const I = { x1: 1e9, y1: 1e9, x2: -1, y2: -1, n: 0 }; let floor = 0;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4; const f = dm(A, C, o); if (f > floor) floor = f;
            if (dm(A, B0, o) > 90) { I.n++; if (x < I.x1) I.x1 = x; if (x > I.x2) I.x2 = x; if (y < I.y1) I.y1 = y; if (y > I.y2) I.y2 = y; }
          }
          return { I, floor };
        }, { a64: a, b64: off, c64: c, w: clip.width, h: clip.height });
        if (!sc.I.n) { console.log('    잉크 0 — ' + t.key); continue; }
        if (sc.floor >= 90) { console.log('    판정 불가(잡음 ' + sc.floor + ') — ' + t.key); continue; }
        /* 호스트 «안쪽 박스»(테두리 제외) — 클립 좌표계 */
        const ix1 = (hx + bl) - clip.x, ix2 = (hx + hw - br2) - clip.x - 1;
        const iy1 = (hy + bt2) - clip.y, iy2 = (hy + hh - bb2) - clip.y - 1;
        const ml = Math.round(sc.I.x1 - ix1), mr = Math.round(ix2 - sc.I.x2);
        const mt = Math.round(sc.I.y1 - iy1), mb = Math.round(iy2 - sc.I.y2);
        const v = Math.min(ml, mr);
        D.push({ lv, key: t.key, txt: geo.txt, w: sc.I.x2 - sc.I.x1 + 1, h: sc.I.y2 - sc.I.y1 + 1,
                 inner: Math.round(hw - bl - br2), ml, mr, mt, mb, v });
        console.log('    ' + String(lv).padStart(4) + '  ' + t.key.padEnd(16) + String(geo.txt).padEnd(10)
          + String((sc.I.x2 - sc.I.x1 + 1) + '×' + (sc.I.y2 - sc.I.y1 + 1)).padStart(8) + '  '
          + String(Math.round(hw - bl - br2)).padStart(6) + String(ml).padStart(8) + String(mr).padStart(8)
          + String(mt).padStart(8) + String(mb).padStart(8) + '   '
          + (v < 0 ? '★ 물림(테두리를 파고든다)' : v < 8 ? '△ 여백 <8' : '초록'));
      }
    }
    const worstD = D.length ? Math.min(...D.map(x => x.v)) : 99;
    console.log('');
    console.log('    최소 좌우 여백 = ' + worstD + 'px · «여백 <8» 표본 ' + D.filter(x => x.v < 8).length + '/' + D.length);
  }
  console.log('');
  console.log('페이지 에러 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();
