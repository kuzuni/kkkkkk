/* 작업 655 재현 — 10 상점 «소환» 배너 카드: 레벨 알약 «Lv.n» 이 경험치 게이지에 덮인다.
 *
 * 주인 스크린샷(2026-09-01 23:15)의 문자열은 «Lv.31» + «655/6710» 이고
 * `sumNeedExp(31) = 200 + 210×31 = 6710` 이라 **이 카드가 맞다**(다른 화면은 이 두 수를 같이 안 낸다).
 *
 * 470 은 같은 부품을 «잘림 없음» 으로 닫았다. 그 회차는 `SUM_MAXLV = 25` 시절이고
 * 축이 «잉크가 알약 밖으로 나가는가»(클립·테두리 물림) 하나뿐이었다.
 * 주인이 이번에 보고한 것은 **잘림이 아니라 덮임**이다 — 알약 위에 다른 노드가 얹힌다.
 * ⇒ 이 자는 470 이 안 세운 축을 세운다:
 *
 *   [Z] 페인트 순서 — 알약 잉크가 있는 픽셀 위에 «알약보다 나중에 그려지는» 형제가 있는가
 *       (elementsFromPoint 사슬에서 `.clv` 위에 무엇이 있는지, z-index·DOM 순서 실측)
 *   [P] 찍힌 픽셀 — 경험치 바 계열(`.cbar`·`.trk`·`.stkbar`)을 **감췄다 켠 두 장의 차분**으로
 *       «바가 실제로 지우는 알약 잉크 픽셀 수» 를 센다(470 ⓐ 처방 — 색으로 잉크를 가르지 않는다).
 *   [G] 기하 — 알약 rect ↔ 바 rect 겹침 폭 · 잉크 우변 ↔ 바 좌변 거리(음수 = 침범)
 *
 * 레벨 스윕: 1 · 9 · 10 · 31(주인 표본) · 49 · 50(MAX) — 자릿수 1~2 와 «MAX» 문자열까지.
 *
 * 실행: node tools/probe655.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const LEVELS = [1, 9, 10, 31, 49, 50];
/* 바 계열 = 알약과 같은 줄을 쓰는 형제 전부 */
const BAR_SEL = ['.cbar', '.stkbar'];

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

  /* 유휴 루프·상시 연출 정지(LESSONS 28-③ · 51-③) + 122 쥬시 애니 정지 —
     이 카드는 광택·링이 상시로 돌아 같은 화면을 두 번 찍어도 픽셀이 흔들린다(470 ⓒ). */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.createElement('style');
    st.id = 'p655stop';
    st.textContent = '*{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
    document.documentElement.style.scrollBehavior = 'auto';
  });
  await p.waitForTimeout(200);

  console.log('PROBE655 — 10 상점 소환 카드 «Lv.n» 알약 ↔ 경험치 게이지 (SUM_MAXLV=' + maxlv + ')');
  console.log('');

  /* ── [Z] 페인트 순서 ─────────────────────────────────────────────── */
  const zinfo = await p.evaluate((BAR_SEL) => {
    const card = document.querySelector('#shopList .shp-card');
    if (!card) return null;
    const kids = [...card.children];
    const info = n => {
      const cs = getComputedStyle(n);
      return {
        sel: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\s+/).join('.') : ''),
        i: kids.indexOf(n), z: cs.zIndex, pos: cs.position, bg: cs.backgroundColor
      };
    };
    const clv = card.querySelector('.clv');
    const out = { clv: info(clv), bars: [] };
    for (const s of BAR_SEL) { const n = card.querySelector(s); if (n) out.bars.push(info(n)); }
    const trk = card.querySelector('.cbar>.trk'); if (trk) out.bars.push(info(trk));
    const bb = card.querySelector('.cbar>b'); if (bb) out.bars.push(info(bb));
    return out;
  }, BAR_SEL);

  console.log('[Z] 카드 자식 페인트 순서 (같은 z-index 면 DOM 순서가 위)');
  console.log('  ' + zinfo.clv.sel.padEnd(22) + ' idx=' + String(zinfo.clv.i).padStart(2)
    + ' z=' + String(zinfo.clv.z).padStart(4) + ' bg=' + zinfo.clv.bg);
  for (const x of zinfo.bars) {
    const above = (x.z === zinfo.clv.z) ? (x.i > zinfo.clv.i || x.i === -1 ? '위' : '아래')
      : (Number(x.z || 0) > Number(zinfo.clv.z || 0) ? '위' : '아래');
    console.log('  ' + x.sel.padEnd(22) + ' idx=' + String(x.i).padStart(2)
      + ' z=' + String(x.z).padStart(4) + ' bg=' + x.bg + '  → 알약보다 ' + above);
  }
  console.log('');

  /* ── 레벨 스윕 ───────────────────────────────────────────────────── */
  console.log('[G]+[P] 레벨 스윕 — 알약 잉크 ↔ 바 좌변');
  console.log('lv   문자열      잉크 x1..x2   알약 rect      바 좌변  잉크우변−바좌변  지워진 잉크px  판정');

  const rows = [];
  for (const lv of LEVELS) {
    await p.evaluate((lv) => {
      /* 714 — 소환 레벨·경험치는 배너 칸이다(496 공용 스칼라 폐지). 이 자는 카드 잉크를 재므로
         다섯 칸을 같은 값으로 놓는다 — 안 놓으면 카드가 Lv.1 로 그려져 **헛초록**이 된다. */
      BKEYS.forEach(k => {
        S.sum[k].lv = lv;
        S.sum[k].exp = (lv >= SUM_MAXLV) ? 0 : Math.min(655, sumNeedExp(lv) - 1);
      });
      renderShopPage();
    }, lv);
    await p.waitForTimeout(160);

    const g = await p.evaluate(() => {
      const card = document.querySelector('#shopList .shp-card');
      const clv = card.querySelector('.clv'), i = clv.querySelector('i');
      const cbar = card.querySelector('.cbar'), stk = card.querySelector('.stkbar');
      const r = n => { const b = n.getBoundingClientRect(); return { x1: b.left, x2: b.right, y1: b.top, y2: b.bottom }; };
      /* 잉크 상자 = Range 글리프 상자(scaleX 변환 포함) */
      const rg = document.createRange(); rg.selectNodeContents(i);
      const ib = rg.getBoundingClientRect();
      return {
        txt: i.textContent,
        pill: r(clv), ink: { x1: ib.left, x2: ib.right, y1: ib.top, y2: ib.bottom },
        bar: r(cbar), stk: stk ? r(stk) : null
      };
    });

    /* [P] 바 계열을 감췄다 켠 두 장의 차분 — «바가 실제로 지우는 알약 잉크» 를 센다 */
    const clip = {
      x: Math.round(g.pill.x1) - 6, y: Math.round(g.pill.y1) - 6,
      width: Math.round(g.pill.x2 - g.pill.x1) + 12, height: Math.round(g.pill.y2 - g.pill.y1) + 12
    };
    const shotOn = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate((BAR_SEL) => {
      const card = document.querySelector('#shopList .shp-card');
      for (const s of BAR_SEL) { const n = card.querySelector(s); if (n) n.style.visibility = 'hidden'; }
    }, BAR_SEL);
    await p.waitForTimeout(80);
    const shotOff = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate((BAR_SEL) => {
      const card = document.querySelector('#shopList .shp-card');
      for (const s of BAR_SEL) { const n = card.querySelector(s); if (n) n.style.visibility = ''; }
    }, BAR_SEL);
    await p.waitForTimeout(80);

    /* 그리고 «글자만» 껐다 켠 차분으로 잉크 마스크를 만든다(470 ⓐ) — 바를 감춘 장 위에서 */
    await p.evaluate((BAR_SEL) => {
      const card = document.querySelector('#shopList .shp-card');
      for (const s of BAR_SEL) { const n = card.querySelector(s); if (n) n.style.visibility = 'hidden'; }
      card.querySelector('.clv>i').style.visibility = 'hidden';
    }, BAR_SEL);
    await p.waitForTimeout(80);
    const shotNoInk = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate((BAR_SEL) => {
      const card = document.querySelector('#shopList .shp-card');
      for (const s of BAR_SEL) { const n = card.querySelector(s); if (n) n.style.visibility = ''; }
      card.querySelector('.clv>i').style.visibility = '';
    }, BAR_SEL);
    await p.waitForTimeout(80);

    /* ⚠ 마스크를 **알약 안쪽으로 제한**한다 — 카드 본문은 광택·입자 레이어가 상시로 재래스터돼
       같은 상태를 두 번 찍어도 흔들린다(470 ⓒ). 알약은 z3 불투명 검정이라 그 안은 정지 화면이다. */
    /* 상자는 «알약 rect ∩ 글자 잉크 bbox(+2)» — 알약 rect 만 쓰면 캡슐 **모서리 밖**(둥근 코너 바깥)이
       들어와 카드 본문이 섞이고, `.cbar` 를 감출 때 카드 `filter:drop-shadow` 실루엣이 바뀌며
       그 자리가 통째로 흔들린다(널 대조로 확인). 잉크 bbox 는 DOM Range 라 페인트와 무관하다. */
    const box = {
      x1: Math.max(Math.round(g.pill.x1) + 1, Math.floor(g.ink.x1) - 2) - clip.x,
      x2: Math.min(Math.round(g.pill.x2) - 1, Math.ceil(g.ink.x2) + 2) - clip.x,
      y1: Math.max(Math.round(g.pill.y1) + 1, Math.floor(g.ink.y1) - 2) - clip.y,
      y2: Math.min(Math.round(g.pill.y2) - 1, Math.ceil(g.ink.y2) + 2) - clip.y
    };
    const px = await p.evaluate(async ({ a, b, c, w, h, box }) => {
      const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
      const [A, B, C] = await Promise.all([load(a), load(b), load(c)]);
      const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const [dA, dB, dC] = [g(A), g(B), g(C)];
      const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
      /* 잉크 마스크 = (바 감춤 + 글자 켬) vs (바 감춤 + 글자 끔) 차분 */
      let inkN = 0, killed = 0, x1 = 1e9, x2 = -1e9, kx1 = 1e9, kx2 = -1e9;
      for (let y = box.y1; y < box.y2; y++) for (let x = box.x1; x < box.x2; x++) {
        const i = (y * w + x) * 4;
        if (d(dB, dC, i) <= 40) continue;          /* 잉크 아님 */
        inkN++; if (x < x1) x1 = x; if (x > x2) x2 = x;
        /* 바를 켜면 그 픽셀이 «글자 없는 장» 쪽으로 되돌아가는가 = 바가 잉크를 지웠다 */
        if (d(dA, dB, i) > 40 && d(dA, dC, i) <= 40) { killed++; if (x < kx1) kx1 = x; if (x > kx2) kx2 = x; }
      }
      return { inkN, killed, x1, x2, kx1, kx2 };
    }, { a: shotOn, b: shotOff, c: shotNoInk, w: clip.width, h: clip.height, box });

    const barL = g.bar.x1;
    const gap = barL - g.ink.x2;                    /* 음수 = 바 좌변이 잉크 위로 들어왔다 */
    const bad = px.killed > 0;
    rows.push({ lv, txt: g.txt, gap, killed: px.killed, ink: px.inkN, bad });
    console.log(
      String(lv).padStart(3) + '  ' + g.txt.padEnd(10)
      + ' ' + (g.ink.x1.toFixed(1) + '..' + g.ink.x2.toFixed(1)).padStart(13)
      + ' ' + (g.pill.x1.toFixed(0) + '..' + g.pill.x2.toFixed(0)).padStart(12)
      + ' ' + barL.toFixed(1).padStart(8)
      + ' ' + gap.toFixed(1).padStart(15)
      + ' ' + String(px.killed).padStart(13)
      + '  ' + (bad ? '★ 덮임 (' + px.killed + '/' + px.inkN + ' = ' + (px.killed / px.inkN * 100).toFixed(1) + '%)' : '초록')
    );
  }

  console.log('');

  /* ── [K] 범인 지목 — 바 계열을 «하나씩» 감춰 지워진 잉크가 얼마나 되돌아오는지 ── */
  const KILL_SEL = ['.stkbar', '.cbar>b', '.cbar>.trk', '.cbar'];
  await p.evaluate(() => { BKEYS.forEach(k => { S.sum[k].lv = 31; S.sum[k].exp = 655; }); renderShopPage(); });
  await p.waitForTimeout(160);
  const gk = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const c = card.querySelector('.clv').getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(card.querySelector('.clv>i'));
    const k = rg.getBoundingClientRect();
    const x = Math.round(c.left) - 6, y = Math.round(c.top) - 6;
    return { x, y, width: Math.round(c.width) + 12, height: Math.round(c.height) + 12,
      bx1: Math.max(Math.round(c.left) + 1, Math.floor(k.left) - 2) - x,
      bx2: Math.min(Math.round(c.right) - 1, Math.ceil(k.right) + 2) - x,
      by1: Math.max(Math.round(c.top) + 1, Math.floor(k.top) - 2) - y,
      by2: Math.min(Math.round(c.bottom) - 1, Math.ceil(k.bottom) + 2) - y };
  });
  const capBase = async (hide) => {
    await p.evaluate(({ hide }) => {
      const card = document.querySelector('#shopList .shp-card');
      card.querySelectorAll('.cbar,.stkbar,.cbar>b,.cbar>.trk,.clv>i').forEach(n => n.style.visibility = '');
      for (const s of hide) card.querySelectorAll(s).forEach(n => n.style.visibility = 'hidden');
    }, { hide });
    await p.waitForTimeout(200);   /* drop-shadow 레이어 재래스터가 끝날 때까지 (470 ⓒ) */
    return (await p.screenshot({ clip: gk })).toString('base64');
  };
  const ALLBAR = ['.cbar', '.stkbar'];
  const sOn = await capBase([]);
  const sOn2 = await capBase([]);           /* 널 대조 — 같은 상태를 두 번 (470 ⓒ: drop-shadow 재래스터 잡음) */
  const sOff = await capBase(ALLBAR);
  const sNoInk = await capBase([...ALLBAR, '.clv>i']);

  const noise = await p.evaluate(async ({ a, b, w, h }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB] = [g(A), g(B)];
    const B0 = window.__p655box || { x1: 0, y1: 0, x2: w, y2: h };
    let n = 0, mx = 0;
    for (let y = B0.y1; y < B0.y2; y++) for (let x = B0.x1; x < B0.x2; x++) { const i = (y * w + x) * 4;
      const d = Math.max(Math.abs(dA[i] - dB[i]), Math.abs(dA[i + 1] - dB[i + 1]), Math.abs(dA[i + 2] - dB[i + 2]));
      if (d > 40) n++; if (d > mx) mx = d;
    }
    return { n, mx };
  }, { a: sOn, b: sOn2, w: gk.width, h: gk.height });
  console.log('[N] 널 대조 — 같은 상태 두 장의 차이 ' + noise.n + '픽셀 · 최대 Δ' + noise.mx
    + '  (문턱 40 · 「X」 판정은 두 조건을 동시에 요구하므로 이 잡음으로는 안 선다)');

  await p.evaluate(bx => { window.__p655box = bx; }, { x1: gk.bx1, y1: gk.by1, x2: gk.bx2, y2: gk.by2 });
  console.log('[K] 범인 지목 (Lv.31 · 655/6710) — 그 노드 하나만 감췄을 때 되살아나는 잉크');
  const baseKill = await p.evaluate(async ({ a, b, c, w, h }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B, C] = await Promise.all([load(a), load(b), load(c)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB, dC] = [g(A), g(B), g(C)];
    window.__p655 = { dB, dC, w, h, box: window.__p655box };
    const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
    const B0 = window.__p655box; let k = 0;
    for (let y = B0.y1; y < B0.y2; y++) for (let x = B0.x1; x < B0.x2; x++) { const i = (y * w + x) * 4;
      if (d(dB, dC, i) > 40 && d(dA, dB, i) > 40 && d(dA, dC, i) <= 40) k++; }
    return k;
  }, { a: sOn, b: sOff, c: sNoInk, w: gk.width, h: gk.height });
  console.log('  (감춘 것 없음 = 지금 화면) 지워진 잉크 ' + baseKill + 'px');
  for (const sel of KILL_SEL) {
    const s1 = await capBase([sel]);
    const k = await p.evaluate(async ({ a, w, h }) => {
      const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
      const A = await load(a);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const x = cv.getContext('2d'); x.drawImage(A, 0, 0);
      const dA = x.getImageData(0, 0, w, h).data;
      const { dB, dC, box: B0 } = window.__p655;
      const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
      let k = 0;
      for (let y = B0.y1; y < B0.y2; y++) for (let x = B0.x1; x < B0.x2; x++) { const i = (y * w + x) * 4;
        if (d(dB, dC, i) > 40 && d(dA, dB, i) > 40 && d(dA, dC, i) <= 40) k++; }
      return k;
    }, { a: s1, w: gk.width, h: gk.height });
    console.log('  ' + sel.padEnd(12) + ' 만 감춤 → 지워진 잉크 ' + String(k).padStart(3) + 'px'
      + '  (회수 ' + (baseKill - k) + 'px)');
  }
  await capBase([]);
  console.log('');

  /* ── 글리프 지도 — 주인이 본 그림(470 §4 방식) ── */
  const map = await p.evaluate(async ({ w, h }) => {
    const shot = window.__p655;
    return null;
  }, { w: gk.width, h: gk.height });

  const sFinal = await capBase([]);
  const glyph = await p.evaluate(async ({ a, w, h }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const A = await load(a);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); x.drawImage(A, 0, 0);
    const dA = x.getImageData(0, 0, w, h).data;
    const { dB, dC } = window.__p655;
    const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
    const B0 = window.__p655.box;
    const rows = [];
    for (let y = B0.y1; y < B0.y2; y++) {
      let s = '';
      for (let xx = B0.x1; xx < B0.x2; xx++) {
        const i = (y * w + xx) * 4;
        const isInk = d(dB, dC, i) > 40;
        if (!isInk) { s += '.'; continue; }
        s += (d(dA, dB, i) > 40 && d(dA, dC, i) <= 40) ? 'X' : '#';
      }
      if (s.indexOf('#') >= 0 || s.indexOf('X') >= 0) rows.push(String(y).padStart(2) + '|' + s);
    }
    return rows;
  }, { a: sFinal, w: gk.width, h: gk.height });
  console.log('글리프 지도 (Lv.31) — «#» = 보이는 잉크 · «X» = 바가 지운 잉크');
  for (const r of glyph) console.log('  ' + r);
  console.log('');

  const badRows = rows.filter(r => r.bad);
  console.log('요약 — 표본 ' + rows.length + ' 중 덮임 ' + badRows.length
    + (badRows.length ? ' (' + badRows.map(r => r.txt).join(' · ') + ')' : ''));
  console.log('페이지 에러: ' + errs.length + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  process.exitCode = 0;
})();
