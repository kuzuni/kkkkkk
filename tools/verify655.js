/* 게이트 655 — 10 상점 «소환» 배너 카드: 레벨 알약 «Lv.n» 이 경험치 게이지에 덮이지 않는다.
 *
 * 무엇을 지키는가 —
 *   측정표 10 §2 #8 · 주석 119 가 못박은 관계는 «경험치 바가 알약 **아래로** 30px 물린다»,
 *   «바 왼쪽 끝은 알약이 덮어 직접 못 잰다» 다. 즉 이 둘은 **겹치는 것이 정답**이고
 *   알약이 위인 것이 정답이다. 470 은 이 부품을 «잘림 없음» 으로 닫았는데 그 축은
 *   [C] 하드 클립 · [B] 테두리 물림 · [S] 획 파먹힘 셋뿐이라 **«덮임» 을 못 봤다**.
 *   122 22회차가 검은 프레임 사본 `.stkbar`(z-index:2)를 얹으면서 그 사본이 같은 z +
 *   나중 DOM 순서로 알약 **위**가 됐고, 사본의 왼쪽 테두리 3px 가 글자를 세로로 잘랐다.
 *
 * ⚠ 헛초록 방지 — 이 자는 «값» 이 아니라 **관계**를 지킨다:
 *   [A2] 가 «알약과 바가 실제로 겹친다» 를 먼저 요구한다. 겹침이 사라지면(둘을 떼어 놓는
 *   수리) 덮임 0 은 공짜로 참이 되고 이 자는 아무것도 안 보게 된다 — 그때 [A2] 가 빨개진다.
 *   [B2] 는 «잉크 0 으로 얻은 초록» 을 막는다.
 *   [R1] 은 z 를 2 로 되돌리면 이 자가 실제로 빨개지는지 본다(양성 통제).
 *
 * 자릿수 스윕: 도달 가능한 레벨 **전수 1..SUM_MAXLV**(= 50, «MAX» 문자열 포함).
 *
 * 실행: node tools/verify655.js        (종료 코드 0 = PASS)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* 페이지 안에서 «지워진 잉크» 를 세는 공용 절차 — probe655 와 같은 정의다.
   잉크 마스크 = (바 감춤 + 글자 켬) vs (바 감춤 + 글자 끔) 차분.
   덮임    = 바를 켜면 그 픽셀이 «글자 없는 장» 으로 되돌아간다. */
const BAR_SEL = ['.cbar', '.stkbar'];

async function measure(p, opts = {}) {
  const hideExtra = opts.hideExtra || [];
  const g = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const clv = card.querySelector('.clv'), i = clv.querySelector('i');
    const cbar = card.querySelector('.cbar');
    const r = n => { const b = n.getBoundingClientRect(); return { x1: b.left, x2: b.right, y1: b.top, y2: b.bottom }; };
    const rg = document.createRange(); rg.selectNodeContents(i);
    const k = rg.getBoundingClientRect();
    return { txt: i.textContent, pill: r(clv), bar: r(cbar), ink: { x1: k.left, x2: k.right, y1: k.top, y2: k.bottom } };
  });
  const clip = {
    x: Math.round(g.pill.x1) - 6, y: Math.round(g.pill.y1) - 6,
    width: Math.round(g.pill.x2 - g.pill.x1) + 12, height: Math.round(g.pill.y2 - g.pill.y1) + 12
  };
  /* 상자 = 알약 rect ∩ 잉크 bbox(+2). 캡슐 코너 «밖» 을 넣으면 카드 `filter:drop-shadow` 가
     `.cbar` 를 감출 때 실루엣째 다시 래스터돼 그 자리가 흔들린다(probe655 널 대조).
     ⚑ 669 이관 — 그 «넣으면 안 되는 코너» 를 **rect 로는 못 뺀다.** 알약은 stadium(r=22)이라
     글자가 커져 잉크 bbox 가 캡슐의 곧은 구간보다 넓어지는 순간 상자가 코너 «밖» 을 도로 삼킨다
     (669 가 fs 23 → 28 로 키우자 실제로 그랬다 — 회차마다 다른 레벨이 2~16px 로 빨개졌고
     `diag669` 로 세어 보니 그 픽셀이 **예외 없이 캡슐 밖**이었다: 캡슐안 0 · 캡슐밖 1~2).
     ⇒ 상자를 좁히는 대신 **세는 마스크를 캡슐 모양으로** 깎는다. 이건 무르게 푸는 것이 아니다 —
     캡슐 밖은 카드 본문이지 «알약 잉크» 가 아니고, 진짜 덮임은 잉크 픽셀에서 일어나며 그 잉크는
     캡슐 안에 여유 3.6px 로 들어 있다(`probe669` [B1b]). 되돌림 [R1] 이 여전히 빨간 것이 증거다. */
  const CAP_R = 22;
  const box = {
    x1: Math.max(Math.round(g.pill.x1) + 1, Math.floor(g.ink.x1) - 2) - clip.x,
    x2: Math.min(Math.round(g.pill.x2) - 1, Math.ceil(g.ink.x2) + 2) - clip.x,
    y1: Math.max(Math.round(g.pill.y1) + 1, Math.floor(g.ink.y1) - 2) - clip.y,
    y2: Math.min(Math.round(g.pill.y2) - 1, Math.ceil(g.ink.y2) + 2) - clip.y
  };
  const setVis = async hide => {
    await p.evaluate(({ hide }) => {
      const card = document.querySelector('#shopList .shp-card');
      card.querySelectorAll('.cbar,.stkbar,.clv>i').forEach(n => (n.style.visibility = ''));
      for (const s of hide) card.querySelectorAll(s).forEach(n => (n.style.visibility = 'hidden'));
    }, { hide });
    await p.waitForTimeout(90);
    return (await p.screenshot({ clip })).toString('base64');
  };
  const A = await setVis(hideExtra);
  const B = await setVis([...BAR_SEL, ...hideExtra]);
  const C = await setVis([...BAR_SEL, ...hideExtra, '.clv>i']);
  await setVis(hideExtra);

  const px = await p.evaluate(async ({ a, b, c, w, h, box, cap }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B, C] = await Promise.all([load(a), load(b), load(c)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB, dC] = [g(A), g(B), g(C)];
    const d = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
    /* 캡슐(stadium) 안인가 — 좌표는 clip 안 픽셀 좌표, cap 은 그 좌표계로 옮겨 온 알약 상자다 */
    const inCap = (x, y) => {
      const px2 = x - cap.x, py = y - cap.y;
      if (px2 < 0 || py < 0 || px2 > cap.w || py > cap.h) return false;
      const cx = px2 < cap.r ? cap.r : (px2 > cap.w - cap.r ? cap.w - cap.r : px2);
      const cy = py < cap.r ? cap.r : (py > cap.h - cap.r ? cap.h - cap.r : py);
      return (px2 - cx) * (px2 - cx) + (py - cy) * (py - cy) <= cap.r * cap.r;
    };
    let ink = 0, killed = 0;
    for (let y = box.y1; y < box.y2; y++) for (let x = box.x1; x < box.x2; x++) {
      if (!inCap(x, y)) continue;
      const i = (y * w + x) * 4;
      if (d(dB, dC, i) <= 40) continue;
      ink++;
      if (d(dA, dB, i) > 40 && d(dA, dC, i) <= 40) killed++;
    }
    return { ink, killed };
  }, {
    a: A, b: B, c: C, w: clip.width, h: clip.height, box,
    cap: {
      x: g.pill.x1 - clip.x, y: g.pill.y1 - clip.y,
      w: g.pill.x2 - g.pill.x1, h: g.pill.y2 - g.pill.y1, r: CAP_R
    }
  });
  return { ...g, ...px };
}

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
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.createElement('style'); st.id = 'v655stop';
    st.textContent = '*{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
  });
  await p.waitForTimeout(200);
  const setLv = async lv => {
    await p.evaluate(lv => {
      /* 714 — 소환 레벨·경험치는 배너 칸이다(496 공용 스칼라 폐지). 이 자는 카드 잉크를 재므로
         다섯 칸을 같은 값으로 놓는다 — 안 놓으면 카드가 Lv.1 로 그려져 **헛초록**이 된다. */
      BKEYS.forEach(k => {
        S.sum[k].lv = lv;
        S.sum[k].exp = (lv >= SUM_MAXLV) ? 0 : Math.min(655, sumNeedExp(lv) - 1);
      });
      renderShopPage();
    }, lv);
    await p.waitForTimeout(120);
  };
  /* 되돌림·통제용 스타일 한 장 */
  const spat = async css => { await p.evaluate(c => {
    let n = document.getElementById('v655pat');
    if (!n) { n = document.createElement('style'); n.id = 'v655pat'; document.head.appendChild(n); }
    n.textContent = c;
  }, css); await p.waitForTimeout(120); };

  console.log('VERIFY655 — 소환 카드 «Lv.n» 알약 ↔ 경험치 게이지 덮임 (SUM_MAXLV=' + maxlv + ')');

  /* ── [A] 전제: 이 자가 볼 것이 실재하는가 ───────────────────────── */
  console.log('[A] 전제 — 알약과 게이지는 «겹치는 것이 정답» 이고 알약이 위여야 한다');
  await setLv(31);
  const A = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const kids = [...card.children];
    const zi = n => { const z = getComputedStyle(n).zIndex; return z === 'auto' ? 0 : Number(z); };
    const clv = card.querySelector('.clv'), cbar = card.querySelector('.cbar'), stk = card.querySelector('.stkbar');
    const R = n => n.getBoundingClientRect();
    const over = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);
    /* 페인트 순서: (z, DOM 순서) 사전식 — 같은 z 면 나중 자식이 위 */
    const later = n => (zi(n) > zi(clv)) || (zi(n) === zi(clv) && kids.indexOf(n) > kids.indexOf(clv));
    const bars = [cbar, stk].filter(Boolean);
    return {
      hasStk: !!stk,
      overlap: over(R(clv), R(cbar)),
      aboveNames: bars.filter(later).map(n => n.className),
      rectSame: stk ? ['x', 'y', 'width', 'height'].every(k => Math.abs(R(cbar)[k] - R(stk)[k]) < 0.01) : false,
      zclv: zi(clv), zbar: zi(cbar), zstk: stk ? zi(stk) : null,
      /* 카드 5장이 같은 부품인지 */
      cards: document.querySelectorAll('#shopList .shp-card').length,
      allSame: [...document.querySelectorAll('#shopList .shp-card')].every(c => {
        const a = c.querySelector('.clv'), d = c.querySelector('.cbar');
        return a && d && Math.abs(over(R(a), R(d)) - over(R(clv), R(cbar))) < 0.01;
      })
    };
  });
  ok(A.hasStk, 'A1 122 프레임 사본 `.stkbar` 가 실재한다 (없으면 이 자가 볼 것이 없다)');
  ok(A.overlap >= 25, 'A2 알약 ↔ 게이지 겹침 ' + A.overlap.toFixed(1) + 'px ≥ 25 (측정표 10 «30px 물림»)');
  ok(A.aboveNames.length === 0, 'A3 게이지 계열 중 알약보다 나중에 그려지는 것 0개'
    + (A.aboveNames.length ? ' — ' + A.aboveNames.join(' / ') : '')
    + '  [z: clv ' + A.zclv + ' · cbar ' + A.zbar + ' · stkbar ' + A.zstk + ']');
  ok(A.rectSame, 'A4 `.stkbar` rect = `.cbar` rect (122 22회차 규약 — 사본 기하는 안 건드렸다)');
  ok(A.cards === 5 && A.allSame, 'A5 카드 5장이 같은 겹침을 쓴다 (' + A.cards + '장)');

  /* ── [B] 찍힌 픽셀 — 도달 가능한 레벨 전수 스윕 ──────────────────── */
  console.log('[B] 찍힌 픽셀 — 레벨 전수 스윕 1..' + maxlv);
  let worst = null, inkMin = 1e9, killTot = 0, killLv = [];
  for (let lv = 1; lv <= maxlv; lv++) {
    await setLv(lv);
    const m = await measure(p);
    if (m.ink < inkMin) { inkMin = m.ink; worst = m.txt; }
    if (m.killed > 0) { killTot += m.killed; killLv.push(m.txt + '(' + m.killed + 'px)'); }
  }
  ok(killTot === 0, 'B1 지워진 잉크 0px — ' + maxlv + '표본 전수'
    + (killTot ? ' — ' + killLv.slice(0, 6).join(' · ') : ''));
  ok(inkMin >= 150, 'B2 «잉크 0 으로 얻은 초록» 금지 — 최소 잉크 ' + inkMin + 'px (' + worst + ') ≥ 150');

  /* ── [C] 기하 Δ0 — 수리가 자리를 안 옮겼다 ─────────────────────── */
  await setLv(31);
  const C = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const cr = card.getBoundingClientRect();
    const rel = s => { const r = card.querySelector(s).getBoundingClientRect();
      return { l: r.left - cr.left, t: r.top - cr.top, w: r.width, h: r.height }; };
    return { clv: rel('.clv'), cbar: rel('.cbar') };
  });
  const near = (a, b) => Math.abs(a - b) < 0.6;
  ok(near(C.clv.l, 55) && near(C.clv.t, 363) && near(C.clv.w, 89) && near(C.clv.h, 44),
    'C1 알약 = 측정표 10 §2 #6 (55,363,89×44) — 실측 ('
    + C.clv.l.toFixed(1) + ',' + C.clv.t.toFixed(1) + ',' + C.clv.w.toFixed(1) + '×' + C.clv.h.toFixed(1) + ')');
  /* ⚑ 669 이관 — 게이지 바깥이 33 → **40**(top 369 → 365) 로 커졌다(측정표 10 §5 정오표 갱신).
     ⚠ 이 자가 지키던 뜻은 «치수 상수» 가 아니라 «알약과의 상하 관계» 다 — 그래서 값만 갈아 끼우고
     [A2] 겹침 31px·[A3] z 순서·[C1] 알약 기하는 한 칸도 안 건드렸다. 세로 중심 387 은 Δ0 이고
     바는 여전히 알약 span(363..407) 안에 들어간다(그 관계가 깨지면 [A2]·[A3] 이 먼저 빨개진다). */
  ok(near(C.cbar.l, 113) && near(C.cbar.t, 365) && near(C.cbar.w, 306) && near(C.cbar.h, 40),
    'C2 게이지 = 측정표 10 §2 #8 정오표 + 669 (113,365,306×40) — 실측 ('
    + C.cbar.l.toFixed(1) + ',' + C.cbar.t.toFixed(1) + ',' + C.cbar.w.toFixed(1) + '×' + C.cbar.h.toFixed(1) + ')');

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────── */
  console.log('[R] 되돌림 — 탐지기가 «그 자리» 를 보는가');
  await spat('.shp-card .clv{z-index:2 !important}');
  const R1 = await measure(p);
  ok(R1.killed > 0, 'R1 알약 z 를 2 로 되돌리면 지워진 잉크 ' + R1.killed + 'px > 0 (수리 전 상태 재현)');
  await spat('');

  await spat('.shp-card .clv{z-index:2 !important} .shp-card .stkbar{display:none !important}');
  const R2 = await measure(p);
  ok(R2.killed === 0, 'R2 z 를 되돌려도 `.stkbar` 를 걷으면 0px — 범인이 사본 하나임을 못박는다 ('
    + R2.killed + 'px)');
  await spat('');

  /* R3 — 알약을 게이지에서 떼어 놓는 «가짜 수리» 는 [A2] 가 잡는다 */
  await spat('.shp-card .clv{z-index:2 !important;width:40px !important}');
  const R3 = await p.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const a = card.querySelector('.clv').getBoundingClientRect(), d = card.querySelector('.cbar').getBoundingClientRect();
    return Math.min(a.right, d.right) - Math.max(a.left, d.left);
  });
  ok(R3 < 25, 'R3 알약을 좁혀 겹침을 없애면 A2 가 빨개진다 — 그 사본의 겹침 ' + R3.toFixed(1) + 'px < 25');
  await spat('');

  /* ── [H] ─────────────────────────────────────────────────────── */
  const post = await measure(p);
  ok(post.killed === 0, 'H1 되돌림 시험 뒤 원복 확인 — 지워진 잉크 ' + post.killed + 'px');
  ok(errs.length === 0, 'H2 페이지 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  await b.close();
  console.log('VERIFY655 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  process.exitCode = fail ? 1 : 0;
})();
