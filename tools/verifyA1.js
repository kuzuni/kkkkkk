/* 작업 A1 하단 탭바 — 회귀 게이트
   실행: node tools/verifyA1.js          → "VERIFYA1 n/n PASS"

   왜 있나: A1 이 1차 라운드에서 «칸별 아이콘 bbox» 를 레퍼런스에 맞춰 놨는데,
   24(모험→던전 ⚔️)·89(보물상자→유물 🔮)가 칸 내용을 갈아 끼우면서 역산값을 안 고쳐
   6회차에 폭 −25%~+3% · 높이 −10%~+27% 로 무너져 있었다(A2-① 이 A1 에서 재발).
   **칸을 건드리는 작업이 이 게이트를 깨면 그 작업의 범위에 «재역산» 이 들어 있다는 뜻이다.**
   재역산 방법은 `docs/measure/A1-탭바.md` §10 주석 참조.

   측정 방식: `getBoundingClientRect` 만 쓴다(픽셀 스캔 아님) — 아이콘 «잉크» 가 아니라
   **박스·칸·부속의 기하**를 본다. 잉크 bbox 는 `tools/scanA1.py` 가 따로 본다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const T = [];
const ok = (name, got, want, tol) => {
  const pass = Math.abs(got - want) <= tol;
  T.push({ name, got, want, tol, pass });
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  /* 60 쥬시의 무한 펄스가 걸린 채로 재면 리본·닷이 최대 +14% 로 읽힌다 */
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 37; S.best = 37;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI();
  });
  await p.waitForTimeout(600);
  /* ⚠ 배지 클래스를 박기 «전에» 게임 자신의 렌더 루프를 세워야 한다.
     안 그러면 `renderUI` 가 알림 조건을 다시 계산해 `.alert` 를 도로 떼고, 그 타이밍이 실행마다
     달라 **같은 코드에서 62/62 와 53/62 가 번갈아 나온다**(실제로 그랬다).
     LESSONS 21 «60 쥬시 이후 고정 waitForTimeout 게이트는 전부 흔들린다» 의 A1 판. */
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i);
  });
  await p.evaluate(() => document.querySelectorAll('.tab').forEach(t => {
    const k = t.dataset.t;
    t.classList.toggle('alert', k === 'grow' || k === 'adv' || k === 'box');
    t.classList.toggle('fresh', k === 'shop');
  }));
  await p.waitForTimeout(150);

  const read = () => p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { if (!e) return null; const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(1), y: +(b.y - app.y).toFixed(1),
               w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    return {
      bar: g(document.getElementById('tabbar')),
      tabs: [...document.querySelectorAll('.tab')].map(e => ({
        t: e.dataset.t, cell: g(e), ti: g(e.querySelector('.ti')),
        bdg: g(e.querySelector('.bdg')), nw: g(e.querySelector('.nw')), tx: g(e.querySelector('.tx')),
        /* 509 — 배지의 «그려진 외곽» 은 상자가 아니라 링(box-shadow spread)까지다.
           바깥 링 반지름 = 상자 반지름 + 가장 큰 spread. 링이 사라지면 이 값이 곧바로 무너진다. */
        bdgRing: (() => {
          const b = e.querySelector('.bdg'); if (!b) return null;
          const sh = getComputedStyle(b).boxShadow || '';
          let mx = 0;
          sh.replace(/rgba?\([^)]*\)/g, 'C').split(',').forEach(part => {
            if (/inset/.test(part)) return;
            const px = part.match(/-?[\d.]+px/g) || [];
            if (px.length >= 4) mx = Math.max(mx, parseFloat(px[3]));   /* x y blur spread */
          });
          return +(b.getBoundingClientRect().width + 2 * mx).toFixed(1);
        })(),
        vis: getComputedStyle(e.querySelector('.tx')).display,
        cs: getComputedStyle(e), tiFs: getComputedStyle(e.querySelector('.ti')).fontSize
      }))
    };
  });

  /* ── 닫힘 상태 ───────────────────────────────────────────── */
  const A = await read();
  ok('바 높이', A.bar.h, 180, 0);                       // 측정표 §1
  ok('바 상단 y (= 2280 − 180)', A.bar.y, 2100, 0);
  ok('바 폭', A.bar.w, 1080, 0);
  A.tabs.forEach((t, i) => {
    ok('닫힘 칸' + (i + 1) + ' 폭 216', t.cell.w, 216, 0.6);   // 측정표 §2
    ok('닫힘 칸' + (i + 1) + ' x', t.cell.x, i * 216, 0.6);
  });

  /* 아이콘 — 칸별 역산값이 «지금 이모지» 에 맞는지. 잉크가 아니라 «상자 × scaleX» 로 본다.
     ref bbox 는 측정표 §4. 실측 잉크가 상자를 꽉 채우는지는 scanA1.py 가 본다. */
  /* ★ 356 이관(주인 지시 2026-08-29 «아이콘은 원본 비율») — 칸별 `--sx` 는 **폐기**됐다.
     adv 만 --sf 가 107.1 → **97.2**(= 107.1 × 옛 --sx .908): 356 규칙이 «작은 쪽으로»(s = min(sx,sy))라
     --sx 가 1 미만이던 칸은 그 값을 등방으로 흡수한다. 나머지 넷은 --sx 가 1 초과여서 --sf 를 안 건드린다.
     폐기한 옛 값(되살리지 마라): grow 1.488 · adv .908 · box 1.2366 · shop 1.476 */
  const SF = { hero: 64, grow: 91.3, adv: 97.2, box: 109.2, shop: 102 };
  /* ⚑ 이 줄은 «--sx 가 없다» 를 묻는다 — 항을 지우면 «356 이 통째로 사라져도 초록인 게이트» 가 된다
     (328 교훈). 값이 아니라 **선언 자체가 비어 있는지**를 본다. */
  const SX = { hero: 1, grow: 1, adv: 1, box: 1, shop: 1 };
  /* shop 7.8 → 6.5 (10회차): M «ref rel34 vs 우리 35» · N «ref local33 vs 우리 35» · 자체 스캔
     «ref 2134 vs 우리 2135» — 세 계측 모두 «1~2px 낮다» 로 부호가 같아 중앙값 1.3px 을 올렸다. */
  const DY = { hero: 4, grow: 13.5, adv: 9.3, box: 9.2, shop: 6.5 };
  const GLYPH = { hero: '🐾', grow: '⚒️', adv: '⚔️', box: '🔮', shop: '🏪' };
  const marks = await p.evaluate(() => [...document.querySelectorAll('.tab')].map(e => ({
    t: e.dataset.t, g: e.querySelector('.ti').textContent.trim(),
    sf: getComputedStyle(e).getPropertyValue('--sf').trim(),
    sx: getComputedStyle(e).getPropertyValue('--sx').trim(),
    dy: getComputedStyle(e).getPropertyValue('--dy').trim()
  })));
  marks.forEach(m => {
    ok('아이콘 ' + m.t + ' --sf', parseFloat(m.sf), SF[m.t], 0.05);
    ok('아이콘 ' + m.t + ' --sx', parseFloat(m.sx || '1'), SX[m.t], 0.005);
    /* 356 — «선언이 비어 있는가» 를 따로 묻는다(--sx:1 로 적어 두는 것도 막는다: 다음 세션이
       «값이 있으니 조정해도 되는 손잡이» 로 읽는다) */
    T.push({ name: '아이콘 ' + m.t + ' --sx 선언 없음 (356 · 아이콘은 원본 비율)',
             got: m.sx || '(없음)', want: '(없음)', tol: '-', pass: m.sx === '' });
    ok('아이콘 ' + m.t + ' --dy', parseFloat(m.dy || '0'), DY[m.t], 0.05);
    /* ⚑ 이모지가 바뀌면 역산값이 통째로 무효다 (A2-①) */
    T.push({ name: '아이콘 ' + m.t + ' 글리프 = ' + GLYPH[m.t] + ' (바뀌면 --sf/--sx 재역산 필요)',
             got: m.g, want: GLYPH[m.t], tol: '-', pass: m.g === GLYPH[m.t] });
  });
  /* ⚠ `.ti` 는 «상자» 이고 측정표 §4 값은 «잉크» 다. rect 는 translateY(--dy) 를 포함하므로
     상자 중심 = 2187 + dy 가 정상이다. 여기서는 dy 가 적용됐는지만 본다.
     잉크가 실제로 §4 의 칸별 top(2131/2147/2131/2131/2130)에 앉는지는 `scanA1.py` 가 본다
     (7회차 실측: 5칸 전부 Δ0, 높이 Δ0~1%). */
  A.tabs.forEach(t => {
    ok('아이콘 상자 ' + t.t + ' 중심 = 2187 + dy', t.ti.y + t.ti.h / 2, 2187 + DY[t.t], 0.6);
  });

  /* 레드닷 — 측정표 §6 (+ 6회차 정오: 외곽 41 / 코어 31, 중심 y = 바 상단 +21)
     ⚑ **정오 (2026-08-30, 작업 471 4회차) — 이 절은 clean main 에서 6건이 빨갰다(61/67).**
     471(주인 지시 «빨간점은 어디서나 호스트 오른쪽 위 코너에 딱»)이 1회차에 이 배지를 옮기면서
     여기 못을 안 옮겼다. 두 축의 답이 다르다 — **가로는 A1 이 옳고 세로는 471 이 옳다**:
       · 가로: A1 의 레퍼런스 못 «칸 오른쪽 −21» 은 **닷 자기 바깥 반지름(41/2 = 20.5)** 과
         같은 값 = «프레임 변에 정확히 접하는 최소 후퇴량». 471 이 1회차에 근거 없이 넣은 28 을
         4회차에 20.5 로 되돌리자 **이 세 항이 저절로 초록**이 됐다(비평가 BT 가 «01 과 19 가 같은
         사유인데 값이 7.1px 다르다» 로 독립 관측 — A1 의 못이 그 판정을 편들었다).
       · 세로: 2119.5 는 닷 상단이 칸 상변보다 **1px 위**에 그치는 값이라 «코너에 걸친다» 가 안 된다.
         471 1회차 비평(BM «위쪽 넘김 0px, 기준은 0.56r» · BN 2인 독립)이 그것을 지적했고,
         주인 지시가 레퍼런스보다 우선이므로 **의도적 이탈**이다(354·360·403 선례).
         ⇒ 못을 규약값 «칸 상변 +11»(= `--dot-in`)로 옮긴다. 측정표 A1 §6 에 정오표. */
  A.tabs.filter(t => t.bdg && ['grow', 'adv', 'box'].includes(t.t)).forEach(t => {
    /* ★ 509 이관(2026-08-31) — 못 하나를 **둘로 쪼갰다**(334 처방 ①).
       수리 전 이 항은 «상자 폭 41» 을 물었고, 그 41 은 «코어 31 + 검정 테 5×2» 였다.
       509 가 이 배지를 표준 닷 부품으로 갈면서 상자는 **코어만**(27) 남고 분홍·검정은
       `box-shadow` 링으로 갔다 — 상자 폭만 물으면 링이 통째로 사라져도 초록이다.
       ⇒ ① 코어 상자 27 ② **그려진 외곽 42**(= 상자 + spread×2) 를 **각각** 단언한다.
       레퍼런스 근거: 03 §3-6 «코어 Ø24~26 · 밝은 림 포함 Ø31~33 · 검정 포함 Ø41~43».
       이 표(§6)의 «채움 31» 은 그 «밝은 림 포함» 지름이라 정오표를 같이 썼다. */
    ok('레드닷 ' + t.t + ' 코어 상자 ⌀27 (509 표준 부품)', t.bdg.w, 27, 0.6);
    ok('레드닷 ' + t.t + ' 그려진 외곽 ⌀42 (링 포함 — ref 41~43)', t.bdgRing, 42, 1.0);
    ok('레드닷 ' + t.t + ' 중심 x = 칸 오른쪽 −21 (= 자기 바깥 반지름 · 471 예외식)',
       t.bdg.x + t.bdg.w / 2, t.cell.x + t.cell.w - 21, 1.0);
    ok('레드닷 ' + t.t + ' 중심 y = 칸 상변 +11 (471 규약 · 레퍼런스 2119.5 에서 의도적 이탈)',
       t.bdg.y + t.bdg.h / 2, t.cell.y + 11, 1.0);
  });

  /* NEW 리본 — **10회차 갱신**. 측정표 §7-1 정오의 «bbox 117×79 · 좌상단 x864·y2103» 중
     상변 2103 은 그대로 두되, 폭은 비평가 M(ref 113)·N(ref 110) 2인이 **둘 다 정오표보다 좁게**
     읽어 중간값 112 로 내렸다. 상변은 앞 값 2099 가 **정오표 자신의 2103 과도 어긋나 있었다** —
     게이트가 어긋난 구현을 4px 그대로 고정하고 있었던 자리다(N 이 «바 상단 테두리를 넘는다» 로 지적).
     역산 근거는 index.html `.tab .nw` 주석 참조 (w104 · t43 → bbox 112.4×76.0). */
  const shop = A.tabs.find(t => t.t === 'shop');
  ok('NEW 리본 bbox 폭 112', shop.nw.w, 112.4, 2.0);
  ok('NEW 리본 bbox 높이 76', shop.nw.h, 76.0, 2.0);
  /* ★ 작업 309(2026-08-28, T1 버그) — 좌변 기대값 **858 → 866.3**.
     옛 858 은 «리본이 칸 경계(864)보다 왼쪽으로 나간다» 는 전제였는데, 그 전제의 근거인
     측정표 §7-2 원 측정(«칸 왼쪽 경계에서 잘림»)은 **§7-1 정오표가 이미 뒤집은 값**이다 —
     정오표의 ref bbox 는 x864..981 로 상점 칸(864..1080) **안**이다. 바로 위 주석이 그 정오표를
     인용하면서 좌변만 옛 전제로 남아 있었다(게이트 부패). 그 5.5px 계통 오차 때문에
     **첫 칸 리본이 프레임 밖(x −5.5)으로 나가 잘렸다.**
     새 기대값 = ref bbox 중심 922.5 에 우리 폭 112.43 의 중심을 맞춘 값(922.5 − 56.215 = 866.29).
     상세·회귀는 `node tools/verify309.js`. */
  ok('NEW 리본 좌변 866.3 (ref bbox 중심 922.5 정렬 · 309)', shop.nw.x, 866.3, 2.0);
  /* ★ 상변은 **rect(검정 border-top 포함) 기준 2096** 이다. 측정표 §7-1 의 ref «2103» 은
     **적색만 잡는 마스크**로 잰 값이라 여기에 그대로 박으면 안 된다 — 10회차에 그 둘을 맞대어
     «4px 위로 샜다» 는 없는 오차를 만들고 리본을 거꾸로 4px 내렸다(11회차에 O·P 가 잡아냈다).
     rect 상변 2096 ↔ 적색 상변 2101 (≈ref rel+1) 로, 둘의 차 ~5px 이 검정 테두리+반올림이다. */
  ok('NEW 리본 상변 2096 (rect = 검정 테두리 포함 · 적색 상변은 여기서 +5)', shop.nw.y, 2096, 2.0);
  T.push({ name: 'NEW 리본 침범 2px 이내(ref 도 2px 넘친다)', got: shop.nw.x.toFixed(1), want: '≥856',
           tol: '-', pass: shop.nw.x >= 856 });

  /* ── 열림 상태 (측정표 §2·§8) ─────────────────────────────── */
  await p.evaluate(() => goTab('hero'));
  await p.waitForTimeout(500);
  const B = await read();
  const closeTab = B.tabs.find(t => t.vis !== 'none');
  T.push({ name: '열림 시 ✕ 칸이 하나 생김', got: closeTab ? closeTab.t : '없음', want: 'hero',
           tol: '-', pass: !!closeTab && closeTab.t === 'hero' });
  if (closeTab) {
    ok('✕ 칸 폭 300', closeTab.cell.w, 300, 1.0);
    ok('✕ 원판 외곽 108', closeTab.tx.w, 108, 1.0);
    ok('✕ 원판 중심 y 2187', closeTab.tx.y + closeTab.tx.h / 2, 2187, 3.0);
    B.tabs.filter(t => t !== closeTab).forEach((t, i) =>
      ok('열림 나머지 칸' + (i + 1) + ' 폭 195', t.cell.w, 195, 1.0));
  }
  ok('열림 5칸 합 1080', B.tabs.reduce((s, t) => s + t.cell.w, 0), 1080, 1.0);

  T.push({ name: '콘솔 에러 0', got: errs.length, want: 0, tol: 0, pass: errs.length === 0 });

  await b.close();
  const bad = T.filter(t => !t.pass);
  bad.forEach(t => console.log('  ✗ ' + t.name + ' : got ' + t.got + ' / want ' + t.want +
    (t.tol === '-' ? '' : ' ±' + t.tol)));
  console.log('VERIFYA1 ' + (T.length - bad.length) + '/' + T.length + (bad.length ? ' FAIL' : ' PASS'));
  process.exit(bad.length ? 1 : 0);
})();
