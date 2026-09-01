/* 작업 669 재현 — 10 상점 «소환» 배너 카드의 소환 레벨(«Lv.n»)·소환 경험치(«exp/need») 글씨가 작다.
 *
 * 주인 원문(2026-09-02 01:02): «소환레벨, 소환경험치 글씨 크기 너무작음. 좀더 키워줘 가독성 좋게».
 *
 * 655 가 «덮여서 안 보임» 을 닫았고(제품 1값 — `.clv` z 2→3), 이 작업은 **«작아서 안 보임»** 이다.
 * 두 축이 한 자리에 겹쳐 있으므로 이 자는 **크기와 침범을 같이** 잰다(PROGRESS 669 ②).
 *
 * 축:
 *   [A] 잉크 실측 — «찍힌 픽셀» 로 잰다(340·350 처방 · 470 ⓐ «색으로 잉크를 가르지 않는다»).
 *       그 노드만 visibility 로 껐다 켠 두 장의 차분 = 잉크 마스크. Range bbox 는 참고값으로만 찍는다
 *       (Range 는 글리프가 아니라 **줄 상자**라 line-height 를 그대로 먹어 «글씨 크기» 의 자가 못 된다).
 *   [B] 그릇 여유 — 잉크 bbox ↔ 호스트(알약 캡슐 · 게이지 트랙) 안쪽 네 변의 거리.
 *       음수면 그릇 밖으로 나간 것이다.
 *   [C] 이웃 침범 — 경험치 글자 잉크가 **알약 rect 안**으로 들어오는가(알약이 게이지 좌측 31px 를
 *       덮고 있다 — 측정표 10 §2 #8). 655 가 닫은 «덮임» 이 글씨를 키우면 되살아나는 자리다.
 *   [D] 두 프레임 — 1080×2280(9:19) · 1080×1600(9:13.3). 좁은 쪽이 판정 프레임(351 규약).
 *
 * 레벨 스윕: 1 · 10 · 31(655 의 주인 표본) · 49(가장 긴 경험치 문자열) · 50(MAX).
 *
 * 실행: node tools/probe669.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* `x` = 그 레벨에서 **가장 긴 경험치 문자열**(exp = need−1) — 49 에서 «10489/10490» 11자가 최악이다.
   최악 표본을 안 넣으면 «지금 화면은 안 넘친다» 만 보고 넘친 자리를 놓친다. */
const LEVELS = [1, 10, 31, 49, { lv: 49, x: 1 }, 50];
const FRAMES = [{ w: 1080, h: 2280, n: '9:19' }, { w: 1080, h: 1600, n: '9:13.3' }];

/* 잰다 = «그 노드만 껐다 켠 두 장의 차분». 상자는 호스트 rect 를 넉넉히 감싼 clip 안 좌표계다. */
async function inkOf(p, sel, clip) {
  const shotOn = (await p.screenshot({ clip })).toString('base64');
  /* sel 이 없는 선택자면 «같은 상태 두 장» = 널 대조가 된다 */
  await p.evaluate((s) => { const n = document.querySelector(s); if (n) n.style.visibility = 'hidden'; }, sel);
  await p.waitForTimeout(60);
  const shotOff = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate((s) => { const n = document.querySelector(s); if (n) n.style.visibility = ''; }, sel);
  await p.waitForTimeout(60);
  return await p.evaluate(async ({ a, b, w, h }) => {
    const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const g = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const [dA, dB] = [g(A), g(B)];
    let n = 0, x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9;
    /* 행별 잉크 좌·우끝 — 캡슐(둥근 모서리) 여유는 bbox 로는 못 잰다(모서리에서 그릇이 좁아진다) */
    const rowsX = [];
    for (let y = 0; y < h; y++) {
      let a2 = 1e9, b2 = -1e9;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const d = Math.max(Math.abs(dA[i] - dB[i]), Math.abs(dA[i + 1] - dB[i + 1]), Math.abs(dA[i + 2] - dB[i + 2]));
        if (d <= 40) continue;
        n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        if (x < a2) a2 = x; if (x > b2) b2 = x;
      }
      if (b2 >= 0) rowsX.push({ y, a: a2, b: b2 });
    }
    return n ? { n, x1, x2, y1, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, rowsX } : { n: 0, rowsX: [] };
  }, { a: shotOn, b: shotOff, w: clip.width, h: clip.height });
}

(async () => {
  const b = await launch(chromium);
  let fail = 0, pass = 0;
  const say = (ok, s) => { if (ok) pass++; else fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + s); };

  console.log('PROBE669 — 10 상점 소환 카드 «Lv.n» · «exp/need» 글씨 크기 실측');
  console.log('');

  for (const F of FRAMES) {
    const ctx = await b.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      S.dia = 2e6; S.gold = 1e9;
      S.daily = S.daily || {}; S.daily.freeSum = {};
      openShopPage();
    });
    await p.waitForTimeout(700);
    /* 유휴 루프·상시 연출 정지(LESSONS 28-③ · 51-③ · 470 ⓒ) */
    await p.evaluate(() => {
      try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
      const st = document.createElement('style');
      st.id = 'p669stop';
      /* ⚠ 470 ⓒ + probe655 §3 의 잡음 함정 — `.shp-card{filter:drop-shadow}` 때문에 자식 하나를
         감추면 **카드 그림자 실루엣이 바뀌어 레이어가 통째로 다시 래스터**된다(널 대조 867px).
         잉크만 재려면 그 필터와 상시 광택 레이어를 끄고 재야 한다 — 재는 대상은 글리프지
         카드 그림자가 아니다. 좌표·글꼴은 이 스타일이 한 값도 안 건드린다. */
      st.textContent = '*{animation:none !important;transition:none !important}'
        + '.shp-card{filter:none !important}'
        + '.shp-card>.cbg>s{display:none !important}';
      document.head.appendChild(st);
    });
    await p.waitForTimeout(200);

    console.log('── 프레임 ' + F.n + ' (' + F.w + '×' + F.h + ') ' + '─'.repeat(40));
    console.log('lv   문자열        Lv 잉크 w×h   알약여유 L/R/T/B      경험치 잉크 w×h  트랙여유 L/R/T/B   알약침범');

    const rows = [];
    for (const spec of LEVELS) {
      const lv = (typeof spec === 'object') ? spec.lv : spec, worst = (typeof spec === 'object') && spec.x;
      await p.evaluate(({ lv, worst }) => {
        /* 714 — 소환 레벨·경험치는 배너 칸이다(496 공용 스칼라 폐지). 이 자는 카드 잉크를
           재므로 다섯 칸을 같은 값으로 놓는다 — 안 놓으면 카드가 Lv.1 로 그려져 헛초록이 된다. */
        const e = (lv >= SUM_MAXLV) ? 0
          : (worst ? sumNeedExp(lv) - 1 : Math.min(655, sumNeedExp(lv) - 1));
        BKEYS.forEach(k => { S.sum[k].lv = lv; S.sum[k].exp = e; });
        renderShopPage();
      }, { lv, worst });
      await p.waitForTimeout(160);

      const g = await p.evaluate(() => {
        const card = document.querySelector('#shopList .shp-card');
        const r = n => { const q = n.getBoundingClientRect(); return { x1: q.left, x2: q.right, y1: q.top, y2: q.bottom }; };
        const clv = card.querySelector('.clv'), lvi = clv.querySelector('i');
        const cbar = card.querySelector('.cbar'), trk = cbar.querySelector('.trk'), bb = cbar.querySelector('b');
        const fs = n => getComputedStyle(n).fontSize;
        return {
          lvTxt: lvi.textContent, exTxt: bb.textContent,
          pill: r(clv), trk: r(trk), bar: r(cbar),
          lvFs: fs(lvi), exFs: fs(bb)
        };
      });

      const pad = 8;
      const clipP = {
        x: Math.round(g.pill.x1) - pad, y: Math.round(g.pill.y1) - pad,
        width: Math.round(g.pill.x2 - g.pill.x1) + pad * 2, height: Math.round(g.pill.y2 - g.pill.y1) + pad * 2
      };
      const clipB = {
        x: Math.round(g.bar.x1) - pad, y: Math.round(g.bar.y1) - pad,
        width: Math.round(g.bar.x2 - g.bar.x1) + pad * 2, height: Math.round(g.bar.y2 - g.bar.y1) + pad * 2
      };
      /* 널 대조 — 같은 상태 두 장(아무것도 안 감춤). 여기서 0 이 아니면 아래 수치는 못 믿는다. */
      const nul = await inkOf(p, '#shopList .shp-card .cnull-does-not-exist,#nope669', clipP).catch(() => ({ n: -1 }));
      const iLv = await inkOf(p, '#shopList .shp-card .clv>i', clipP);
      const iEx = await inkOf(p, '#shopList .shp-card .cbar>b', clipB);

      /* clip 좌표 → 뷰포트 좌표 */
      const abs = (i, c) => i.n ? { x1: i.x1 + c.x, x2: i.x2 + c.x, y1: i.y1 + c.y, y2: i.y2 + c.y, w: i.w, h: i.h, n: i.n } : { n: 0 };
      const L = abs(iLv, clipP), E = abs(iEx, clipB);

      /* [B] 그릇 여유 — 알약은 캡슐이라 안쪽 기준선을 반경(22)만큼 들여 잡지 않는다(글자는 가운데) */
      const pL = L.n ? L.x1 - g.pill.x1 : NaN, pR = L.n ? g.pill.x2 - L.x2 : NaN;
      const pT = L.n ? L.y1 - g.pill.y1 : NaN, pB = L.n ? g.pill.y2 - L.y2 : NaN;
      const tL = E.n ? E.x1 - g.trk.x1 : NaN, tR = E.n ? g.trk.x2 - E.x2 : NaN;
      const tT = E.n ? E.y1 - g.trk.y1 : NaN, tB = E.n ? g.trk.y2 - E.y2 : NaN;
      /* [C] 경험치 잉크가 알약 rect 안으로 들어왔는가(양수 = 침범 px) */
      const inv = E.n ? Math.max(0, g.pill.x2 - E.x1) : 0;

      /* [B1b] 캡슐 여유 — 알약은 stadium(r=22)이라 **모서리에서 그릇이 좁아진다**.
         bbox 만 보면 «rect 안» 인데 실제로는 곡선 밖인 글리프가 통과해 버린다. 행마다 잰다. */
      const R = 22, pw2 = g.pill.x2 - g.pill.x1, ph2 = g.pill.y2 - g.pill.y1;
      let capMin = Infinity;
      for (const rx of (iLv.rowsX || [])) {
        const yy = (rx.y + clipP.y) - g.pill.y1;             /* 알약 안 y */
        if (yy < 0 || yy > ph2) { capMin = -1; break; }
        /* 그 행에서 캡슐의 좌·우 안쪽 x(알약 좌표계) */
        const dy = (yy < R) ? (R - yy) : (yy > ph2 - R ? yy - (ph2 - R) : 0);
        const ins = R - Math.sqrt(Math.max(0, R * R - dy * dy));
        const la = (rx.a + clipP.x) - g.pill.x1, rb = (rx.b + clipP.x) - g.pill.x1;
        capMin = Math.min(capMin, la - ins, (pw2 - ins) - rb);
      }

      rows.push({ lv, L, E, pL, pR, pT, pB, tL, tR, tT, tB, inv, g, nul: nul.n, capMin });
      const f2 = v => (Number.isFinite(v) ? v.toFixed(1) : '—').padStart(5);
      console.log(
        String(lv).padStart(3) + '  ' + (g.lvTxt + ' ' + g.exTxt).padEnd(14)
        + ' ' + ((L.n ? L.w + '×' + L.h : '없음')).padStart(11)
        + '  ' + f2(pL) + '/' + f2(pR) + '/' + f2(pT) + '/' + f2(pB)
        + '   ' + ((E.n ? E.w + '×' + E.h : '없음')).padStart(11)
        + '  ' + f2(tL) + '/' + f2(tR) + '/' + f2(tT) + '/' + f2(tB)
        + '   ' + (inv > 0 ? '★ ' + inv.toFixed(1) + 'px' : '0')
        + '   캡슐여유 ' + (Number.isFinite(capMin) ? capMin.toFixed(1) : '—')
      );
    }

    console.log('');
    console.log('  글꼴 크기(선언): Lv ' + rows[0].g.lvFs + ' · 경험치 ' + rows[0].g.exFs
      + '   / 알약 ' + (rows[0].g.pill.x2 - rows[0].g.pill.x1).toFixed(0) + '×' + (rows[0].g.pill.y2 - rows[0].g.pill.y1).toFixed(0)
      + ' · 트랙 ' + (rows[0].g.trk.x2 - rows[0].g.trk.x1).toFixed(0) + '×' + (rows[0].g.trk.y2 - rows[0].g.trk.y1).toFixed(0));

    /* ── 판정 ─────────────────────────────────────────────────────── */
    console.log('');
    const minLvH = Math.min(...rows.map(r => r.L.h || 0));
    const minExH = Math.min(...rows.map(r => r.E.h || 0));
    say(rows.every(r => r.nul === 0), '[N] ' + F.n + ' 널 대조(같은 상태 두 장) 0픽셀 — 최대 '
      + Math.max(...rows.map(r => r.nul)) + 'px');
    say(rows.every(r => r.L.n > 0), '[A1] ' + F.n + ' Lv 잉크가 5표본 전부 찍힌다');
    say(rows.every(r => r.E.n > 0), '[A2] ' + F.n + ' 경험치 잉크가 5표본 전부 찍힌다');
    console.log('  · Lv 잉크 높이 최소 ' + minLvH + 'px · 경험치 잉크 높이 최소 ' + minExH + 'px');
    say(rows.every(r => r.pL >= 0 && r.pR >= 0 && r.pT >= 0 && r.pB >= 0),
      '[B1] ' + F.n + ' Lv 잉크가 알약 밖으로 안 나간다');
    say(rows.every(r => r.capMin > 0), '[B1b] ' + F.n + ' Lv 잉크가 **캡슐 곡선** 안 — 최소 여유 '
      + Math.min(...rows.map(r => r.capMin)).toFixed(1) + 'px');
    say(rows.every(r => r.tL >= 0 && r.tR >= 0 && r.tT >= 0 && r.tB >= 0),
      '[B2] ' + F.n + ' 경험치 잉크가 트랙 밖으로 안 나간다');
    say(rows.every(r => r.inv === 0), '[C1] ' + F.n + ' 경험치 잉크가 알약 rect 를 안 침범한다');
    say(errs.length === 0, '[E] ' + F.n + ' 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));
    console.log('');
    await ctx.close();
  }

  await b.close();
  console.log('PROBE669 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
