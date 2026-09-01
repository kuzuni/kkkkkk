/* 게이트 669 — 10 상점 소환 카드의 «Lv.n»(소환 레벨) · «exp/need»(소환 경험치) 글씨 크기.
 *
 * 주인 지시(2026-09-02 01:02): «소환레벨, 소환경험치 글씨 크기 너무작음. 좀더 키워줘 가독성 좋게».
 *
 * 이 자가 지키는 것은 **셋이 동시에**다 — 하나만 보면 무르다:
 *   [B] 크다        — 잉크 높이 하한(수리 전 Lv 17 · 경험치 15 를 근거로 세운 값)
 *   [C] 안 넘친다   — 알약은 rect 가 아니라 **캡슐(stadium r=22) 곡선** 안, 게이지는 트랙 안,
 *                     그리고 경험치 잉크가 **알약 rect 를 침범하지 않는다**(655 가 닫은 «덮임» 의 반대편)
 *   [R] 되돌림      — 옛 값(fs 23/20 + `scaleX(.85)`)으로 되돌리면 [B] 가 빨개지고,
 *                     반대로 과하게 키우면 [C] 가 빨개진다. 한 방향만 보는 자는 «크게만 하면 초록» 이다.
 *
 * 잉크는 «찍힌 픽셀» 로 잰다(340·350 처방) — 그 노드만 껐다 켠 두 장의 차분.
 * ⚠ 카드 `filter:drop-shadow` 는 자식 하나를 감춰도 실루엣째 다시 래스터돼 잡음을 만든다
 *   (probe655 §3 · 669 가 verify655 를 캡슐 마스크로 고친 이유). 여기서는 잴 동안만 그 필터를 끈다 —
 *   재는 대상은 글리프이지 카드 그림자가 아니고, 좌표·글꼴은 한 값도 안 바뀐다.
 *
 * 두 프레임(9:19 1080×2280 · 9:13.3 1080×1600) 전부. 실행: node tools/verify669.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* 수리 전 실측(probe669 baseline) — 하한의 근거다 */
const WAS = { lv: 17, ex: 15 };
/* 하한 — 실측 23 / 20 에서 반올림 잡음 1px 만 빼고 잡는다(무르게 잡으면 «조금만 키워도 초록») */
const MIN = { lv: 22, ex: 22 };
const LEVELS = [1, 10, 31, 49, { lv: 49, x: 1 }, 50];
const FRAMES = [{ w: 1080, h: 2280, n: '9:19' }, { w: 1080, h: 1600, n: '9:13.3' }];
const CAP_R = 22;

async function inkOf(p, sel, clip) {
  const A = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(s => { const n = document.querySelector(s); if (n) n.style.visibility = 'hidden'; }, sel);
  await p.waitForTimeout(60);
  const B = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(s => { const n = document.querySelector(s); if (n) n.style.visibility = ''; }, sel);
  await p.waitForTimeout(60);
  return await p.evaluate(async ({ a, b, w, h }) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB] = [g(A), g(B)];
    let n = 0, x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9;
    const rowsX = [];
    for (let y = 0; y < h; y++) {
      let a2 = 1e9, b2 = -1e9;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (Math.max(Math.abs(dA[i] - dB[i]), Math.abs(dA[i + 1] - dB[i + 1]), Math.abs(dA[i + 2] - dB[i + 2])) <= 40) continue;
        n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        if (x < a2) a2 = x; if (x > b2) b2 = x;
      }
      if (b2 >= 0) rowsX.push({ y, a: a2, b: b2 });
    }
    return n ? { n, x1, x2, y1, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, rowsX } : { n: 0, rowsX: [] };
  }, { a: A, b: B, w: clip.width, h: clip.height });
}

/* 한 프레임에서 레벨 스윕을 돌려 표를 만든다 */
async function sweep(p) {
  const out = [];
  for (const spec of LEVELS) {
    const lv = (typeof spec === 'object') ? spec.lv : spec, worst = (typeof spec === 'object') && spec.x;
    await p.evaluate(({ lv, worst }) => {
      S.sumLv = lv;
      S.sumExp = (lv >= SUM_MAXLV) ? 0 : (worst ? sumNeedExp(lv) - 1 : Math.min(655, sumNeedExp(lv) - 1));
      renderShopPage();
    }, { lv, worst });
    await p.waitForTimeout(150);

    const g = await p.evaluate(() => {
      const card = document.querySelector('#shopList .shp-card');
      const r = n => { const q = n.getBoundingClientRect(); return { x1: q.left, x2: q.right, y1: q.top, y2: q.bottom }; };
      const clv = card.querySelector('.clv'), cbar = card.querySelector('.cbar');
      return {
        lvTxt: clv.querySelector('i').textContent, exTxt: cbar.querySelector('b').textContent,
        card: r(card), pill: r(clv), bar: r(cbar), trk: r(cbar.querySelector('.trk')),
        z: getComputedStyle(clv).zIndex
      };
    });
    const pad = 8;
    const clipP = { x: Math.round(g.pill.x1) - pad, y: Math.round(g.pill.y1) - pad, width: Math.round(g.pill.x2 - g.pill.x1) + pad * 2, height: Math.round(g.pill.y2 - g.pill.y1) + pad * 2 };
    const clipB = { x: Math.round(g.bar.x1) - pad, y: Math.round(g.bar.y1) - pad, width: Math.round(g.bar.x2 - g.bar.x1) + pad * 2, height: Math.round(g.bar.y2 - g.bar.y1) + pad * 2 };
    const iLv = await inkOf(p, '#shopList .shp-card .clv>i', clipP);
    const iEx = await inkOf(p, '#shopList .shp-card .cbar>b', clipB);
    const abs = (i, c) => i.n ? { x1: i.x1 + c.x, x2: i.x2 + c.x, y1: i.y1 + c.y, y2: i.y2 + c.y, w: i.w, h: i.h, n: i.n } : { n: 0 };
    const L = abs(iLv, clipP), E = abs(iEx, clipB);

    /* 캡슐 여유 — 행마다 잰다(모서리에서 그릇이 좁아진다) */
    const pw2 = g.pill.x2 - g.pill.x1, ph2 = g.pill.y2 - g.pill.y1;
    let capMin = Infinity;
    for (const rx of (iLv.rowsX || [])) {
      const yy = (rx.y + clipP.y) - g.pill.y1;
      if (yy < 0 || yy > ph2) { capMin = -1; break; }
      const dy = (yy < CAP_R) ? (CAP_R - yy) : (yy > ph2 - CAP_R ? yy - (ph2 - CAP_R) : 0);
      const ins = CAP_R - Math.sqrt(Math.max(0, CAP_R * CAP_R - dy * dy));
      capMin = Math.min(capMin, ((rx.a + clipP.x) - g.pill.x1) - ins, (pw2 - ins) - ((rx.b + clipP.x) - g.pill.x1));
    }
    const trkMin = E.n ? Math.min(E.x1 - g.trk.x1, g.trk.x2 - E.x2, E.y1 - g.trk.y1, g.trk.y2 - E.y2) : -1;
    out.push({ lv, worst, L, E, capMin, trkMin, g, inv: E.n ? Math.max(0, g.pill.x2 - E.x1) : 0 });
  }
  return out;
}

/* 임시 오버라이드 스타일 — 되돌림 시험용 */
async function css(p, id, text) {
  await p.evaluate(({ id, text }) => {
    let s = document.getElementById(id);
    if (!text) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
    s.textContent = text;
  }, { id, text });
  await p.waitForTimeout(120);
}

(async () => {
  const b = await launch(chromium);
  console.log('VERIFY669 — 소환 레벨·경험치 글씨 크기 (수리 전 잉크 높이 Lv ' + WAS.lv + ' · 경험치 ' + WAS.ex + ')');

  for (const F of FRAMES) {
    const ctx = await b.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);
    await p.evaluate(() => { S.dia = 2e6; S.gold = 1e9; S.daily = S.daily || {}; S.daily.freeSum = {}; openShopPage(); });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
      const st = document.createElement('style'); st.id = 'v669stop';
      st.textContent = '*{animation:none !important;transition:none !important}'
        + '.shp-card{filter:none !important}.shp-card>.cbg>s{display:none !important}';
      document.head.appendChild(st);
    });
    await p.waitForTimeout(200);

    console.log('[' + F.n + '] 전제 — 그릇 기하는 Δ0 이어야 한다(측정표 10 §2 #6·#9)');
    const rows = await sweep(p);
    const r0 = rows[0], cd = r0.g.card;
    const rel = (a, b2) => (a - b2);
    ok(Math.abs(rel(r0.g.pill.x1, cd.x1) - 55) < 0.6 && Math.abs(rel(r0.g.pill.y1, cd.y1) - 363) < 0.6
      && Math.abs((r0.g.pill.x2 - r0.g.pill.x1) - 89) < 0.6 && Math.abs((r0.g.pill.y2 - r0.g.pill.y1) - 44) < 0.6,
      'A1 ' + F.n + ' 알약 = (55,363,89×44) — 실측 ('
      + rel(r0.g.pill.x1, cd.x1).toFixed(0) + ',' + rel(r0.g.pill.y1, cd.y1).toFixed(0) + ','
      + (r0.g.pill.x2 - r0.g.pill.x1).toFixed(0) + '×' + (r0.g.pill.y2 - r0.g.pill.y1).toFixed(0) + ')');
    /* 2회차 — 그릇을 같이 키웠다(바깥 33→40 ⇒ 안쪽 27→34). 측정표 10 §5 정오표 · verify655 [C2] 이관 */
    ok(Math.abs((r0.g.trk.x2 - r0.g.trk.x1) - 300) < 0.6 && Math.abs((r0.g.trk.y2 - r0.g.trk.y1) - 34) < 0.6,
      'A2 ' + F.n + ' 게이지 트랙 = 300×34 — 실측 '
      + (r0.g.trk.x2 - r0.g.trk.x1).toFixed(0) + '×' + (r0.g.trk.y2 - r0.g.trk.y1).toFixed(0));
    ok(r0.g.z === '3', 'A3 ' + F.n + ' 655 규약 유지 — `.clv` z-index 3 (덮임 축을 되살리지 않았다) — ' + r0.g.z);

    console.log('[' + F.n + '] 크다 — 잉크 높이 하한 (하한 Lv ' + MIN.lv + ' · 경험치 ' + MIN.ex + ')');
    const minLv = Math.min(...rows.map(r => r.L.h || 0)), minEx = Math.min(...rows.map(r => r.E.h || 0));
    ok(rows.every(r => r.L.n > 0 && r.E.n > 0), 'B0 ' + F.n + ' 두 글자 잉크가 ' + rows.length + '표본 전부 찍힌다'
      + ' («잉크 0 으로 얻은 초록» 금지)');
    ok(minLv >= MIN.lv, 'B1 ' + F.n + ' Lv 잉크 높이 최소 ' + minLv + 'px ≥ ' + MIN.lv
      + ' (수리 전 ' + WAS.lv + ' → +' + ((minLv / WAS.lv - 1) * 100).toFixed(0) + '%)');
    ok(minEx >= MIN.ex, 'B2 ' + F.n + ' 경험치 잉크 높이 최소 ' + minEx + 'px ≥ ' + MIN.ex
      + ' (수리 전 ' + WAS.ex + ' → +' + ((minEx / WAS.ex - 1) * 100).toFixed(0) + '%)');

    console.log('[' + F.n + '] 안 넘친다 — 캡슐·트랙·이웃');
    const capMin = Math.min(...rows.map(r => r.capMin));
    ok(capMin >= 2, 'C1 ' + F.n + ' Lv 잉크가 **캡슐 곡선** 안 — 최소 여유 ' + capMin.toFixed(1) + 'px ≥ 2'
      + ' (rect 로 재면 모서리가 안 보인다)');
    const trkMin = Math.min(...rows.map(r => r.trkMin));
    ok(trkMin >= 2, 'C2 ' + F.n + ' 경험치 잉크가 트랙 안 — 최소 여유 ' + trkMin.toFixed(1) + 'px ≥ 2');
    ok(rows.every(r => r.inv === 0), 'C3 ' + F.n + ' 경험치 잉크가 알약 rect 를 안 침범한다 — 최악 문자열('
      + rows.find(r => r.worst).g.exTxt + ') 포함');
    ok(errs.length === 0, 'E ' + F.n + ' 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

    /* ── 되돌림 ─────────────────────────────────────────────────────── */
    if (F.n === '9:19') {
      console.log('[R] 되돌림 — 자가 두 방향을 다 보는가');
      await css(p, 'v669r1',
        '.shp-card .clv>i{font-size:23px !important}'
        + '.shp-card .cbar>b{font-size:20px !important;transform:translateY(2px) scaleX(.85) !important}');
      const R1 = await sweep(p);
      const r1lv = Math.min(...R1.map(r => r.L.h || 0)), r1ex = Math.min(...R1.map(r => r.E.h || 0));
      ok(r1lv < MIN.lv && r1ex < MIN.ex,
        'R1 옛 값(fs 23/20 + scaleX(.85))으로 되돌리면 B1·B2 가 빨개진다 — Lv ' + r1lv + ' · 경험치 ' + r1ex);
      await css(p, 'v669r1', '');

      await css(p, 'v669r2', '.shp-card .clv>i{font-size:36px !important}');
      const R2 = await sweep(p);
      const r2cap = Math.min(...R2.map(r => r.capMin));
      ok(r2cap < 2, 'R2 과하게 키우면(fs 36) C1 이 빨개진다 — 캡슐 여유 ' + r2cap.toFixed(1) + 'px < 2'
        + ' («크게만 하면 초록» 이 아니다)');
      await css(p, 'v669r2', '');

      await css(p, 'v669r3', '.shp-card .cbar>b{font-size:52px !important}');
      const R3 = await sweep(p);
      const r3trk = Math.min(...R3.map(r => r.trkMin));
      ok(r3trk < 2, 'R3 경험치를 과하게 키우면(fs 52) C2 가 빨개진다 — 트랙 여유 ' + r3trk.toFixed(1) + 'px < 2');
      await css(p, 'v669r3', '');

      const H = await sweep(p);
      ok(Math.min(...H.map(r => r.L.h)) >= MIN.lv && Math.min(...H.map(r => r.E.h)) >= MIN.ex
        && Math.min(...H.map(r => r.capMin)) >= 2 && Math.min(...H.map(r => r.trkMin)) >= 2,
        'H1 되돌림 시험 뒤 원복 확인 — Lv ' + Math.min(...H.map(r => r.L.h)) + ' · 경험치 ' + Math.min(...H.map(r => r.E.h)));
    }

    await ctx.close();
  }

  await b.close();
  console.log('VERIFY669 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
