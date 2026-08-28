/* 작업 309 회귀 게이트 — 하단 탭바 NEW 리본이 프레임 좌단에서 잘린다 (2026-08-28, T1 버그).
   실행: node tools/verify309.js   → 마지막 줄이 `VERIFY309 n/n PASS` 여야 한다.

   증상: 새 세이브는 탭 5칸이 전부 `.fresh` 라 NEW 리본이 5개 뜨는데(`renderUI`
   `x.classList.toggle('fresh', !S.seen[x.dataset.t])`), **첫 칸(영웅) 리본만 프레임 밖으로 나가 잘렸다.**
   나머지 4칸은 옆칸을 덮을 뿐이라 눈에 안 띄었다.

   원인이 **둘**이다 — 하나만 고치면 «가만히 있을 때는 멀쩡한데 맥박마다 잘리는» 상태가 된다.

   ① 가로 앵커가 5.51px 왼쪽 (정지)
      `.tab .nw` 8회차 주석의 «리본은 레퍼런스대로 칸 왼쪽 경계를 6px 넘어간다» 가 **폐기된 측정치**다.
      측정표 `docs/measure/A1-탭바.md` §7-2 원 측정의 «위치: 상점 칸 좌상단 앵커, 칸 왼쪽 경계에서 잘림»
      인데, 그 절은 **§7-1 정오표(A1 6회차)** 가 «빨강 마스크(r>90·r−g>40·r−b>30)가 주황인 옆 가게
      일러스트까지 물었다» 로 뒤집어 ref bbox 를 **x864..980/981 (w117) · 상점 칸(864..1080) 안에
      온전히** 로 다시 냈다. 즉 리본은 칸을 넘어가지 않는다.
      → ref bbox 중심(칸 기준 **58.5**)에 우리 bbox 중심을 맞춘다: `left: −1.3px → 6.5px`.
        (bbox 중심 = left + width/2. `transform-origin:50% 50%` 이라 회전이 중심을 안 옮긴다.)
        폭 112.43 은 A1 10회차에 비평가 M·N 이 좁힌 값이라 **안 건드린다** → 정지 bbox 는 칸 기준 2.28..114.71.

   ② 60 쥬시의 «점» 배율을 112px 리본이 그대로 탄다 (동적)
      `jzDotIn`(0→**1.3**→1, 오버슈트 이징) · `jzDotPulse`(2초마다 **1.14**)는 20px 짜리 레드닷 기준이다.
      리본은 bbox 112.43 이라 같은 배율이 절대값으로 5.6배 — 실측 맥박 정점 폭 128.17(±7.87) ·
      등장 정점 배율 **1.353**(±19.8). 그래서 ① 만 고쳐도 첫 칸이 맥박마다 x −5.59,
      등장 때 −17.5 로 **나갔다 들어왔다** 한다(`display:none↔block` 마다 다시 도는 연출이라 탭 여닫이마다).
      → 60 의 공용 키프레임·다른 대상은 **한 글자도 안 건드리고**, 탭바 리본에만 전용 키프레임
        `nwIn`(.88→1.015→1) · `nwPulse`(1.025) 를 건다. 절대 진폭을 점과 맞춘 값이다
        (점 맥박 ±1.4px ↔ 리본 맥박 1.025 = ±1.4px). 한계 배율은 **58.5 ÷ 56.215 = 1.0406** —
        이보다 낮아야 좌단이 프레임 안에 남는다.

   본다:
     §1 잘림   **로드 직후부터**(등장 팝 포함) 그리고 **맥박 한 주기**를 rAF 로 훑어 리본 5개의
               최소 x · 최대 우단이 프레임(0..1080) 안에 있다. 정지 1장만 재던 옛 방식은 ②를 놓친다.
     §2 ref    5칸 모두 bbox 중심이 ref 중심(칸 기준 58.5)이고 bbox 가 ref bbox(0..117) 안에 든다.
     §3 음성   ⓐ 앵커를 옛 값(−1.3px)으로 되돌리면 정지 상태에서 다시 음수 x ·
               ⓑ 앵커는 그대로 두고 60 의 «점» 배율을 다시 씌우면 정지는 멀쩡한데 **맥박 정점에서** 음수 x.
               두 원인이 각각 살아 있음을 게이트가 스스로 증명한다(189-③ «헛초록» 방지).
     §4 기하   A1 은 2차 폴리시 라운드 ①~④ 8점 통과 화면이다. 탭바·탭 5칸·리본의
               **세로·폭·높이·기울기** 가 한 픽셀도 움직이면 안 된다(내가 만진 것은 가로 앵커 + 진폭뿐).
               60 의 공용 키프레임(`jzDotIn`·`jzDotPulse`)도 원문 그대로여야 한다.
     §5 노출   새 세이브에서 리본 5개가 `display:block` 이고 `pointer-events:none`(74/142 재발 방지).
     §6 화면비 1600·1920·2280·2600 네 프레임에서 §1 이 그대로 · 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 측정표 A1 §2(탭 5칸 완전 균등 5분할) · §7-1 정오표(ref 리본 bbox) */
const CELL_W  = 216;
const REF_L   = 0;      /* ref bbox 좌단 — 상점 칸 864 기준 864 */
const REF_R   = 117;    /* ref bbox 우단 — 981 */
const REF_CX  = 58.5;   /* ref bbox 중심 — 922.5 */
const OUR_W   = 112.43; /* A1 10회차에 비평가 M·N 이 좁힌 폭 (w104 · t43 · −20°) */
const REST_L  = 2.28;   /* 정지 좌단 = REF_CX − OUR_W/2 */
const LIMIT_S = REF_CX / (OUR_W / 2);   /* 1.0406 — 이 배율을 넘으면 좌단이 프레임 밖 */
const OLD_IN  = 1.353;  /* 309 이전 등장 정점 실측 (jzDotIn 1.3 + 오버슈트) */
const OLD_PUL = 1.14;   /* jzDotPulse 정점 (60 쥬시 ⑥) */
const BEFORE_L = -5.51; /* 309 착수 전 정지 실측 — 첫 칸이 프레임 밖으로 나가던 값 */

/* 정지 스캔 — 프레임(1080) 좌표계로 정규화한 rect. #app 은 fit() 으로 스케일된다. */
const SCAN = `(() => {
  const f = document.getElementById('app').getBoundingClientRect();
  const sc = f.width / 1080;
  const R = e => { const r = e.getBoundingClientRect();
    return { x:+((r.x-f.x)/sc).toFixed(2), y:+((r.y-f.y)/sc).toFixed(2),
             w:+(r.width/sc).toFixed(2), h:+(r.height/sc).toFixed(2) }; };
  const bar = document.getElementById('tabbar');
  return { bar: R(bar), rows: [...bar.querySelectorAll('.tab')].map((t, i) => {
    const nw = t.querySelector('.nw'), cs = nw && getComputedStyle(nw), tr = R(t);
    const nr = nw ? R(nw) : null;
    return { i, t: t.dataset.t, fresh: t.classList.contains('fresh'), tab: tr,
      nw: nr, disp: cs && cs.display, pe: cs && cs.pointerEvents,
      tf: cs && cs.transform, left: cs && cs.left, top: cs && cs.top,
      relL: nr ? +(nr.x - tr.x).toFixed(2) : null,
      relR: nr ? +(nr.x + nr.w - tr.x).toFixed(2) : null,
      relC: nr ? +(nr.x + nr.w / 2 - tr.x).toFixed(2) : null };
  }) };
})`;

/* 맥박·등장 스캔 — rAF 로 ms 동안 훑어 칸마다 최소 x · 최대 우단 · 최대 폭을 낸다.
   `retrig` 이면 `.fresh` 를 껐다 켜서 등장 연출(`display:none↔block`)을 다시 돌린다.
   정지 1장으로는 2초 주기 맥박도, 0.3초 등장 팝도 놓친다. */
const SWEEP = `(async (ms, retrig) => {
  const app = document.getElementById('app');
  const tabs = [...document.querySelectorAll('#tabbar .tab')];
  if (retrig) {
    tabs.forEach(t => t.classList.remove('fresh'));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    tabs.forEach(t => t.classList.add('fresh'));
  }
  const acc = tabs.map(() => ({ minX: Infinity, maxR: -Infinity, maxW: 0 }));
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    const f = app.getBoundingClientRect(), sc = f.width / 1080;
    tabs.forEach((t, i) => {
      const nw = t.querySelector('.nw');
      if (!nw || getComputedStyle(nw).display === 'none') return;
      const r = nw.getBoundingClientRect();
      const x = (r.x - f.x) / sc, w = r.width / sc;
      const a = acc[i];
      if (x < a.minX) a.minX = x;
      if (x + w > a.maxR) a.maxR = x + w;
      if (w > a.maxW) a.maxW = w;
    });
    n++;
  }
  return { n, rows: acc.map((a, i) => ({ i,
    minX: +a.minX.toFixed(2), maxR: +a.maxR.toFixed(2), maxW: +a.maxW.toFixed(2),
    peak: +(a.maxW / ${OUR_W}).toFixed(4) })) };
})`;
const SWEEP_MS = 2600;   /* jzDotPulse/nwPulse 주기 2초 + 등장 .3s 여유 */

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));

  /* «정지» 를 재려면 맥박을 세워야 한다 — 안 세우면 표본이 우연히 정점 근처에 떨어져
     bbox 폭이 넓게 잡히고(중심은 그대로) 좌단 단언이 뜨고 지는 FAIL 이 된다.
     `#tabbar …` 는 id 가 있어 60 쥬시 규칙(`.tab.fresh .nw`, 0-3-0)보다 특정도가 높다 → !important 불필요. */
  const FREEZE = '#tabbar .tab .nw{animation:none}';
  const style = async (id, css) => {
    await p.evaluate(([i, t]) => {
      let e = document.getElementById(i);
      if (!t) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = i; document.head.appendChild(e); }
      e.textContent = t;
    }, [id, css]);
    await p.waitForTimeout(150);
  };

  /* ── §1 잘림 (등장 팝 + 맥박 한 주기) ── */
  console.log('§1 잘림 — 등장 팝과 맥박을 다 훑어도 리본 5개가 프레임 안');
  await p.goto(URL);           /* 세이브 없는 첫 실행 = 탭 5칸 전부 .fresh */
  const load = await p.evaluate(`${SWEEP}(3200, false)`);   /* 로드 직후부터 = 등장 팝 포함 */
  ok(load.n >= 80, `로드 스윕 rAF 표본 ${load.n}장`);
  for (const r of load.rows) {
    ok(r.minX >= 0, `[${r.i}] 등장 포함 최소 x ${r.minX} ≥ 0`);
    ok(r.maxR <= 1080, `[${r.i}] 등장 포함 최대 우단 ${r.maxR} ≤ 1080`);
  }
  const retrig = await p.evaluate(`${SWEEP}(${SWEEP_MS}, true)`);  /* 탭 여닫이 재현 */
  for (const r of retrig.rows) {
    ok(r.minX >= 0, `[${r.i}] 등장 재트리거 최소 x ${r.minX} ≥ 0`);
    ok(r.maxR <= 1080, `[${r.i}] 등장 재트리거 최대 우단 ${r.maxR} ≤ 1080`);
  }
  const peak = Math.max(...load.rows.map(r => r.peak), ...retrig.rows.map(r => r.peak));
  ok(peak < LIMIT_S, `정점 배율 ${peak} < 한계 ${LIMIT_S.toFixed(4)} (= ${REF_CX} ÷ ${(OUR_W / 2).toFixed(3)})`);
  ok(peak < OLD_PUL, `60 «점» 맥박 배율 ${OLD_PUL} 보다 낮다 (${peak})`);
  ok(peak > 1.005, `그래도 맥박이 죽지는 않았다 (${peak})`);

  /* ── §2 ref 대조 (측정표 A1 §7-1 정오표) ── */
  console.log('§2 ref 대조 — 5칸 모두 ref 중심 · ref bbox 안');
  await style('v309freeze', FREEZE);          /* 이후 §2·§4·§5 는 «정지» 상태로 읽는다 */
  const s = await p.evaluate(`${SCAN}()`);
  const rows = s.rows;
  eq('탭 칸 수', rows.length, 5);
  for (const r of rows) {
    near(`[${r.i} ${r.t}] bbox 중심 = ref 중심 ${REF_CX}`, r.relC, REF_CX, 0.03);
    near(`[${r.i} ${r.t}] 정지 좌단`, r.relL, REST_L, 0.03);
    ok(r.relL >= REF_L - 0.05 && r.relR <= REF_R + 0.05,
       `[${r.i} ${r.t}] bbox ${r.relL}..${r.relR} 이 ref ${REF_L}..${REF_R} 안`);
  }
  const shop = rows[4];
  eq('상점 칸 x (측정표 §2)', shop.tab.x, 864);
  near('상점 리본 프레임 중심 (ref 922.5)', +(shop.nw.x + shop.nw.w / 2).toFixed(2), 922.5, 0.03);

  /* ── §3 음성 대조 — 두 원인이 각각 살아 있다 ── */
  console.log('§3 음성 대조 ⓐ — 앵커를 옛 값(left:-1.3px)으로 되돌리면 정지 상태에서 잘린다');
  await style('v309neg', '#tabbar .tab .nw{left:-1.3px}');
  const oldA = (await p.evaluate(`${SCAN}()`)).rows;
  near('되돌린 정지 좌단', oldA[0].relL, BEFORE_L, 0.05);
  ok(oldA[0].nw.x < 0, `옛 앵커에서는 정지 상태로 프레임 밖 (x ${oldA[0].nw.x} < 0)`);

  console.log('§3 음성 대조 ⓑ — 앵커는 그대로 두고 60 «점» 배율을 다시 씌우면 맥박·등장에서 잘린다');
  await style('v309freeze', '');               /* 맥박을 다시 켠다 */
  await style('v309neg', '#tabbar .tab.fresh .nw{animation:jzDotIn .3s var(--jzs) both,'
    + 'jzDotPulse 2s ease-in-out .3s infinite}');
  const halfRest = await p.evaluate(`${SCAN}()`);
  /* 배율은 중심을 안 옮기므로 «앵커는 ① 로 고쳐진 채» 라는 것을 중심으로 확인한다
     (좌단은 애니메이션 위상에 따라 흔들려 정지값으로 못 쓴다 — 그게 바로 ②의 증상이다). */
  near('앵커는 ① 대로 ref 중심에 그대로 있다', halfRest.rows[0].relC, REF_CX, 0.05);
  const halfSweep = await p.evaluate(`${SWEEP}(${SWEEP_MS}, true)`);
  ok(halfSweep.rows[0].minX < 0,
     `그런데 등장·맥박 정점에서는 프레임 밖 (최소 x ${halfSweep.rows[0].minX} < 0) — ② 가 살아 있다`);
  ok(halfSweep.rows[0].peak >= OLD_PUL,
     `그때의 정점 배율 ${halfSweep.rows[0].peak} ≥ 60 «점» 맥박 ${OLD_PUL} (등장 정점은 ${OLD_IN} 안팎)`);
  near('그때의 최소 x = 중심 58.5 − 정점 반폭', halfSweep.rows[0].minX,
       REF_CX - OUR_W * halfSweep.rows[0].peak / 2, 0.4);

  await style('v309neg', '');
  await style('v309freeze', FREEZE);
  const back = (await p.evaluate(`${SCAN}()`)).rows;
  eq('덧씌운 스타일을 걷어냈다', back[0].relL, rows[0].relL);

  /* ── §4 A1 기하 회귀 (측정표 A1 §1·§2 · ①~④ 8점 통과 근거) ── */
  console.log('§4 기하 — 가로 앵커·진폭 말고는 한 픽셀도 안 움직였다');
  eq('탭바 y (바닥 고정 프레임 2280 − 180)', s.bar.y, 2100);
  eq('탭바 h (측정표 §1)', s.bar.h, 180);
  eq('탭바 w', s.bar.w, 1080);
  rows.forEach((r, i) => {
    eq(`[${i}] 탭 칸 x (${i * CELL_W})`, r.tab.x, i * CELL_W);
    eq(`[${i}] 탭 칸 w (균등 5분할 ${CELL_W})`, r.tab.w, CELL_W);
    near(`[${i}] 리본 bbox w (10회차 확정)`, r.nw.w, OUR_W, 0.03);
    near(`[${i}] 리본 bbox h (10회차 확정)`, r.nw.h, 75.98, 0.03);
    eq(`[${i}] 리본 top (11·12회차 확정)`, r.top, '12.5px');
    near(`[${i}] 리본 bbox y (칸 기준 −4 · 검정 border-top)`, +(r.nw.y - r.tab.y).toFixed(2), -3.99, 0.03);
  });
  eq('리본 기울기 −20° 유지', rows[0].tf, 'matrix(0.939693, -0.34202, 0.34202, 0.939693, 0, 0)');
  const flat = SRC.replace(/\s*\n\s*/g, '');
  ok(/\.tab \.nw\{[^}]*width:104px;height:43px/.test(flat), 'CSS 원본의 width104 · height43 불변');
  ok(/\.tab \.nw\{[^}]*top:12\.5px/.test(flat), 'CSS 원본의 top 12.5px 불변');
  eq('60 공용 `jzDotIn` 원문 그대로',
     (SRC.match(/@keyframes jzDotIn\{0%\{scale:0\}62%\{scale:1\.3\}100%\{scale:1\}\}/g) || []).length, 1);
  eq('60 공용 `jzDotPulse` 원문 그대로',
     (SRC.match(/@keyframes jzDotPulse\{0%,72%,100%\{scale:1\}84%\{scale:1\.14\}\}/g) || []).length, 1);
  eq('60 공용 규칙의 대상 목록을 안 건드렸다',
     (SRC.match(/\.ibtn\.on \.bdg,#menub\.alert \.bdg,\.tab\.fresh \.nw,/g) || []).length, 1);

  /* ── §5 노출 ── */
  console.log('§5 노출 — 새 세이브에서 5개가 실제로 뜬다');
  for (const r of rows) {
    ok(r.fresh, `[${r.i} ${r.t}] 새 세이브라 .fresh`);
    eq(`[${r.i} ${r.t}] display`, r.disp, 'block');
    eq(`[${r.i} ${r.t}] pointer-events (74/142 재발 방지)`, r.pe, 'none');
  }
  eq('CSS 원본의 앵커', (SRC.match(/\.tab \.nw\{[^}]*?left:([-\d.]+px)/) || [])[1], '6.5px');
  eq('CSS 원본의 리본 전용 등장 키프레임',
     (SRC.match(/@keyframes nwIn\{0%\{scale:\.88\}62%\{scale:1\.015\}100%\{scale:1\}\}/g) || []).length, 1);
  eq('CSS 원본의 리본 전용 맥박 키프레임',
     (SRC.match(/@keyframes nwPulse\{0%,72%,100%\{scale:1\}84%\{scale:1\.025\}\}/g) || []).length, 1);
  ok(/#tabbar \.tab\.fresh \.nw\{animation:nwIn [^}]*nwPulse [^}]*\}/.test(SRC),
     '리본 전용 규칙이 `#tabbar` 로 60 규칙보다 특정도가 높다');

  /* ── §6 화면비 4종 ── */
  console.log('§6 화면비 4종');
  await style('v309freeze', '');                 /* 맥박을 켠 채로 훑는다 */
  for (const h of [1600, 1920, 2280, 2600]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.waitForTimeout(400);
    const q = await p.evaluate(`${SWEEP}(${SWEEP_MS}, true)`);
    const bad = q.rows.filter(r => r.minX < 0 || r.maxR > 1080);
    eq(`[${h}] 등장·맥박에서 프레임 밖으로 나간 리본`, bad.length, 0, JSON.stringify(bad));
    const r0 = (await p.evaluate(`${SCAN}()`)).rows;
    near(`[${h}] 첫 칸 중심 = ref ${REF_CX}`, r0[0].relC, REF_CX, 0.06);
    near(`[${h}] 상점 칸 중심 = ref ${REF_CX}`, r0[4].relC, REF_CX, 0.06);
  }
  eq('콘솔 에러', errs.length, 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY309 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
