#!/usr/bin/env node
/* 작업 990 — **89 유물 소환 «지불 버스트» 의 발원이 어디인가**를 찍힌 기하로 재현한다.
 *
 *   node tools/probe990.js            수리 «전» 이면 [P1] 이 빨갛다(= 재현 성공)
 *   node tools/probe990.js --json     기계용
 *
 * 왜 재현부터인가(338 규칙): 등재문(990)의 수치는 **838 11회차 채점 2인(DL·DM)이 캡처 PNG 위에서**
 * 손으로 역투영한 값이고, 그 캡처는 `docs/shots/` 라 커밋되지 않는다(.gitignore). 등재문의 처방을
 * 바로 넣으면 «이미 참인 것을 게이트로 굳히는» 338 의 그 사고를 되풀이한다 — 먼저 **이 저장소 안의
 * 자**로 같은 수를 세운다.
 *
 * 자(尺) — 두 사람이 쓴 «알 궤적 최소자승 교점» 을 그대로 코드로 옮긴다. 다만 사람은 프레임 사이
 * 변위로 방향을 얻었고, 여기서는 제품이 알마다 노드에 적어 둔 **`--dx`/`--dy`(그 알이 갈 방향·거리)**
 * 를 읽는다 — 같은 직선의 방향 벡터라 교점은 같고, 프레임 샘플링 오차가 없다.
 *   ⓐ 알 i 의 직선  L_i : p_i + t·d_i     (p_i = style.left/top = 탄생점 · d_i = (--dx,--dy) 정규화)
 *   ⓑ 최소자승 교점  x* = (Σ(I − d dᵀ))⁻¹ · Σ(I − d dᵀ)p        ← 두 사람이 쓴 그 식
 *   ⓒ 잔차 = 각 직선까지의 수직거리 (평균·최대)
 * 대는 자리 셋(전부 제품이 그리는 그대로 잰다 — 손 상수 0개):
 *   · **가격바 유물화폐 아이콘**(`#rwCost [data-cur-slot]`) 중심 — 처방이 지목한 자리
 *   · **수반 액면**(`#rwBasin` 상자에서 `RW_FX_Y` 만큼 내려온 점) — 지금 제품이 쓰는 자리
 *   · 수반 상자 자신 — «버튼 안인가»(666 규약) 확인용
 *
 * 판정 [P1]: 교점 ↔ 아이콘 중심 거리가 **아이콘 지름의 1.0배** 를 넘으면 빨강.
 *   (등재문 실측 DL 4.38배 · DM 4.30배 · 838 5회차 2인 4.1배 — 세 회차 네 사람이 같은 자리를 적었다.
 *    대조로 838 씬 A(훈련 골드)는 같은 계측이 0.095배다.)
 * 판정 [P2]: 교점이 **`#rwBasin` 상자 안**인가(666 «스폰 = 버튼뿐» — 수리 전후 둘 다 참이어야 한다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const JSON_OUT = process.argv.includes('--json');
const SEED = 20260902;              /* cap681 씬 B 와 같은 시드 — 두 사람이 본 그 버스트 */
const RUNS = 3;                     /* 위상 수열(682)이 버스트마다 돌므로 세 판을 잰다 */
const THRESH = 1.0;                 /* 아이콘 지름 배수 — [P1] 문턱 */

function lsIntersect(rays) {
  /* x* = (Σ M_i)⁻¹ Σ M_i p_i,  M_i = I − d_i d_iᵀ  (2×2 이라 손으로 푼다) */
  let a = 0, b = 0, c = 0, ex = 0, ey = 0;
  for (const { p, d } of rays) {
    const mxx = 1 - d.x * d.x, mxy = -d.x * d.y, myy = 1 - d.y * d.y;
    a += mxx; b += mxy; c += myy;
    ex += mxx * p.x + mxy * p.y;
    ey += mxy * p.x + myy * p.y;
  }
  const det = a * c - b * b;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;
  return { x: (c * ex - b * ey) / det, y: (a * ey - b * ex) / det };
}
function residuals(rays, q) {
  const r = rays.map(({ p, d }) => {
    const vx = q.x - p.x, vy = q.y - p.y;
    return Math.abs(vx * d.y - vy * d.x);            /* |v × d| = 수직거리 (d 는 단위벡터) */
  });
  return { avg: r.reduce((s, v) => s + v, 0) / r.length, max: Math.max(...r) };
}

async function once(seed) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await p.waitForTimeout(900);

  const out = await p.evaluate(async () => {
    S.relic = 250000; S.gold = 1e18; S.dia = 1e9;
    try { fxSeen.relic = S.relic; } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
    await new Promise(r => setTimeout(r, 500));
    const L = fxL(); if (L) [...L.children].forEach(n => n.remove());

    const el = document.getElementById('rwBasin');
    /* ⚠ 기하는 **트리거 «전»** 에 잰다 — `hbBeat('#rwBasin')` 의 맥박이 버튼 상자를 늘였다 줄인다
       (871 이 훈련에서 겪은 «표본 시각 상자로 재면 판정이 제비뽑기» 와 같은 자리). 가격 알약은
       버튼의 **형제**라 맥박을 안 타므로, 아이콘 축은 이 값이 곧 제품이 쓴 값이다. */
    const ic0 = document.querySelector('#rwCost [data-cur-slot]');
    const icR = ic0 ? fxRect(ic0) : null;
    const bR = fxRect(el);
    const before = new Set(L ? L.children : []);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    /* ⚠ 한 번의 pointerdown 이 **이미터 둘**을 돌린다 — 683/753 의 «획득» 알(`.fx-rlic` · 원점 =
       당첨 카드)과 666 의 «지불» 버스트(`.fx-cic` · 원점 = 이 행이 재는 자리). 클래스로 가르지
       않으면 두 이미터의 직선이 섞여 교점이 둘 사이로 끌려간다(첫 판에 잔차 최대 676px 로 그랬다). */
    const born = [];
    if (L) for (const nd of L.children) if (!before.has(nd) && nd.classList.contains('fx-cic')) born.push(nd);
    const rays = [];
    for (const nd of born) {
      const px = parseFloat(nd.style.left), py = parseFloat(nd.style.top);
      const dx = parseFloat(nd.style.getPropertyValue('--dx'));
      const dy = parseFloat(nd.style.getPropertyValue('--dy'));
      if (![px, py, dx, dy].every(Number.isFinite)) continue;
      const m = Math.hypot(dx, dy); if (!(m > 0.5)) continue;
      rays.push({ p: { x: px, y: py }, d: { x: dx / m, y: dy / m } });
    }
    return {
      rays, n: born.length,
      icon: icR ? { x: icR.x + icR.w / 2, y: icR.y + icR.h / 2, d: (icR.w + icR.h) / 2, w: icR.w, h: icR.h } : null,
      basin: bR,
      basinFx: bR ? { x: bR.x + bR.w / 2, y: bR.y + bR.h * 0.28 } : null,   /* 666 3회차가 쓰던 «그릇 아가리» — 대조용 */
    };
  });
  await b.close();
  out.errs = errs;
  return out;
}

(async () => {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(SEED + i));

  const rows = runs.map((o, i) => {
    if (!o.rays || o.rays.length < 2 || !o.icon) return { i, bad: true };
    const q = lsIntersect(o.rays);
    if (!q) return { i, bad: true };
    const res = residuals(o.rays, q);
    const dIcon = Math.hypot(q.x - o.icon.x, q.y - o.icon.y);
    const dBasin = o.basinFx ? Math.hypot(q.x - o.basinFx.x, q.y - o.basinFx.y) : NaN;
    const inBtn = !!o.basin && q.x >= o.basin.x && q.x <= o.basin.x + o.basin.w
                            && q.y >= o.basin.y && q.y <= o.basin.y + o.basin.h;
    return { i, n: o.n, q, res, icon: o.icon, basinFx: o.basinFx, basin: o.basin,
             dIcon, ratio: dIcon / o.icon.d, dBasin, inBtn, errs: o.errs };
  });

  const ok = rows.filter(r => !r.bad);
  const worst = ok.length ? Math.max(...ok.map(r => r.ratio)) : Infinity;
  const allIn = ok.length === RUNS && ok.every(r => r.inBtn);
  const p1 = ok.length === RUNS && worst <= THRESH;
  const p2 = allIn;
  const errN = runs.reduce((s, o) => s + (o.errs ? o.errs.length : 0), 0);
  const p3 = errN === 0;

  if (JSON_OUT) { console.log(JSON.stringify({ rows, worst, p1, p2, p3 }, null, 1)); }
  else {
    console.log('작업 990 — 유물 지불 버스트 발원 재현 (알 궤적 최소자승 교점)');
    for (const r of rows) {
      if (r.bad) { console.log(`  판 ${r.i + 1}: 측정 불가(알 ${r.n || 0}개)`); continue; }
      console.log(`  판 ${r.i + 1}: 알 ${r.n}개 · 교점 (${r.q.x.toFixed(1)}, ${r.q.y.toFixed(1)})`
        + ` · 잔차 평균 ${r.res.avg.toFixed(1)} 최대 ${r.res.max.toFixed(1)}`);
      console.log(`           아이콘 중심 (${r.icon.x.toFixed(1)}, ${r.icon.y.toFixed(1)}) Ø${r.icon.d.toFixed(1)}`
        + ` → 거리 ${r.dIcon.toFixed(1)}px = **${r.ratio.toFixed(2)}배**`);
      console.log(`           수반 액면 (${r.basinFx.x.toFixed(1)}, ${r.basinFx.y.toFixed(1)})`
        + ` → 거리 ${r.dBasin.toFixed(1)}px · 버튼 안 ${r.inBtn ? 'O' : 'X'}`);
    }
    console.log(`  [P1] 교점↔아이콘 ≤ ${THRESH.toFixed(1)}배 : ${p1 ? 'PASS' : 'FAIL'} (최악 ${Number.isFinite(worst) ? worst.toFixed(2) : '—'}배)`);
    console.log(`  [P2] 교점이 #rwBasin 안(666 «스폰 = 버튼뿐») : ${p2 ? 'PASS' : 'FAIL'}`);
    console.log(`  [P3] 콘솔 에러 0 : ${p3 ? 'PASS' : 'FAIL'} (${errN})`);
    console.log(`PROBE990 ${[p1, p2, p3].filter(Boolean).length}/3 ${p1 && p2 && p3 ? 'PASS' : 'FAIL'}`);
  }
  process.exit(p1 && p2 && p3 ? 0 : 1);
})();
