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
  const SF = { hero: 64, grow: 91.3, adv: 107.1, box: 109.2, shop: 103.8 };
  const SX = { hero: 1, grow: 1.488, adv: 0.908, box: 1.267, shop: 1.468 };
  const DY = { hero: 4, grow: 13.5, adv: 9.3, box: 9.2, shop: 4.9 };
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

  /* 레드닷 — 측정표 §6 (+ 6회차 정오: 외곽 41 / 코어 31, 중심 y = 바 상단 +21) */
  A.tabs.filter(t => t.bdg && ['grow', 'adv', 'box'].includes(t.t)).forEach(t => {
    ok('레드닷 ' + t.t + ' 외곽 ⌀41', t.bdg.w, 41, 0.6);
    ok('레드닷 ' + t.t + ' 중심 x = 칸 오른쪽 −21',
       t.bdg.x + t.bdg.w / 2, t.cell.x + t.cell.w - 21, 1.0);
    ok('레드닷 ' + t.t + ' 중심 y 2119.5', t.bdg.y + t.bdg.h / 2, 2119.5, 1.0);
  });

  /* NEW 리본 — 측정표 §7-1 정오: bbox 117×79, 칸 왼쪽 경계(x864)·y2103 에 좌상단 밀착 */
  const shop = A.tabs.find(t => t.t === 'shop');
  ok('NEW 리본 bbox 폭 117', shop.nw.w, 117, 2.0);
  ok('NEW 리본 bbox 높이 79', shop.nw.h, 79, 2.0);
  ok('NEW 리본 좌변 858 (ref x862 는 칸 경계보다 2px 왼쪽)', shop.nw.x, 858, 2.0);
  ok('NEW 리본 상변 2099', shop.nw.y, 2099, 2.0);
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
    ok('✕ 칸 폭 296', closeTab.cell.w, 296, 1.0);
    ok('✕ 원판 외곽 108', closeTab.tx.w, 108, 1.0);
    ok('✕ 원판 중심 y 2187', closeTab.tx.y + closeTab.tx.h / 2, 2187, 3.0);
    B.tabs.filter(t => t !== closeTab).forEach((t, i) =>
      ok('열림 나머지 칸' + (i + 1) + ' 폭 196', t.cell.w, 196, 1.0));
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
