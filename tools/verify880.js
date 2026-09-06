#!/usr/bin/env node
/* 작업 880 — **89 유물 소환 버스트가 배수 토글 바(`#rwMulBar`)를 안 밟는다**를 지키는 자.
 *
 *   node tools/verify880.js
 *
 * 자의 뼈대는 `probe880.js`(재현기)와 **같은 경로·같은 시드·같은 시각표**다 — 다른 것은
 * «현상을 빨갛게 세운다» 대신 «고쳐진 상태를 못 되돌리게 못박는다» 하나다.
 *
 * 절이 셋이다:
 *   §1 [C1~C3]  가림 — 전 프레임·전 칸 덮임 0% · 간격이 신고 여유(`FXB_INPAD`) 이상 · 알 수 불변
 *   §2 [C4~C6]  «각도는 안 건드렸다» — 방향 단위벡터가 벽 유무에 무관하게 동일 ·
 *               벽에 안 걸리는 알은 거리도 동일 · 잘린 알이 «한 줄» 로 안 눌린다(838 3회차 서명)
 *   §R [R1~R4]  되돌림 — 신고(`--burst-block`)를 지우면 즉시 빨개진다 · 안 신고한 호스트는 무변경 ·
 *               호스트 자신/자손은 벽이 아니다 · 벽 없는 방향의 광선은 `Infinity`
 *
 * ⚠ [R1] 이 이 자의 본체다. 없으면 «`--burst-block` 이 통째로 사라져도 초록인 게이트» 가 된다
 *   (334 교훈 · 818 [R1~R3] 과 같은 짝 항).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const { STOPS, SEED } = require('./cap681');
const T = [], ok = (n, c, d) => { T.push([n, !!c, d || '']); };

/* 한 판(벽 신고 있음/없음 × 발원 지금/990 이전)을 굴려 여덟 프레임을 재고, 스폰 기하도 같이 돌려준다.
   ⚑⚑ 990 이관 — 둘째 손잡이 `reach` 가 생긴 이유(자를 무르게 푼 것이 아니다):
     990 이 **발원을 그릇 아가리에서 가격바 화폐 아이콘으로 내리면서**(≈114px 아래) 이 버스트의
     상향 사거리가 배수 바에 **아예 안 닿게** 됐다. 그러면 §1 의 «덮임 0%» 는 여전히 참이지만
     [C5b]·[C6]·[R1]·[R1b] — 즉 **«벽이 실제로 알을 잘랐는가»** 를 묻는 네 항이 «잘린 알 0개» 로
     빨개진다. 그것은 880 이 깨졌다는 뜻이 아니라 **880 이 막던 상황이 이 화면에서 사라졌다**는 뜻이다.
     ⚠ 여기서 네 항을 지우면 «`--burst-block` 이 통째로 사라져도 초록인 게이트» 가 되어 이 자가
       머리말에서 스스로 금지한 것을 하는 셈이다(334 교훈). ⇒ 항을 지우지 않고 **묻는 판을 옮겼다**
       (333 처방): 벽이 사거리 «안» 인 판을 자가 직접 만들어(발원을 990 이전 자리로 되돌린다 —
       제품 파일은 한 줄도 안 건드린다) 거기서 넷을 묻는다. 그러면 이 자는 이제 둘을 다 말한다 —
       ① 지금 화면은 안 밟는다(§1) ② 벽이 사거리 안이어도 안 밟는다, 그리고 그때 실제로 잘린다(§2·§R). */
async function run(blank, reach) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
  });
  await p.waitForTimeout(700);
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});

  const out = await p.evaluate(({ stops, sd, blank, reach }) => {
    /* §R1 — 신고를 지우는 판. 인라인 빈 값이 CSS 선언을 이기므로 `fxbBlockRects` 가 빈 배열을 낸다
       (= 880 수리 «전» 과 같은 상태. 제품 코드는 한 줄도 안 되돌린다) */
    const basin = document.getElementById('rwBasin');
    if (blank) basin.style.setProperty('--burst-block', ' ');
    /* 990 이관 — «벽이 사거리 안» 인 판. 발원을 990 이전 자리(666 3회차의 그릇 아가리 = 상자
       높이의 28%)로 되돌린다. 제품의 `rwPayFrom()` 만 창에서 갈아 끼우므로 파일은 안 건드린다. */
    if (reach) window.rwPayFrom = function () {
      const r = fxRect(basin); return r ? { x: r.x + r.w / 2, y: r.y + r.h * 0.28 } : null; };

    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    basin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    basin.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    window.requestAnimationFrame = () => 0;
    try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
    window.setTimeout = () => 0; window.setInterval = () => 0;

    /* 스폰 기하 — 봉투와 무관한 «적힌 값» 이다(§2 는 이것만 본다) */
    const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
    const spawn = [...document.querySelectorAll('#fxl > *')]
      .filter(n => /fx-cic/.test((n.className || '') + ''))
      .map(n => ({ x: num(n.style.left), y: num(n.style.top),
                   dx: num(n.style.getPropertyValue('--dx')) || 0,
                   dy: num(n.style.getPropertyValue('--dy')) || 0,
                   w: num(n.style.width) || 0 }));

    const fop = n => { const m = /opacity\(([\d.]+)\)/.exec(getComputedStyle(n).filter || '');
      return m ? parseFloat(m[1]) : 1; };
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity * fop(n) > 0.06 && Math.min(bb.width, bb.height) >= 6; };
    const cells = () => [...document.querySelectorAll('#rwMulBar > [data-mul]')].map(c => {
      const b = c.getBoundingClientRect();
      return { mul: c.dataset.mul, x: b.left, y: b.top, w: b.width, h: b.height };
    });
    const measure = () => {
      const eggs = [...document.querySelectorAll('#fxl > *')].filter(vis)
        .map(n => { const b = n.getBoundingClientRect();
          return { x: b.left, y: b.top, w: b.width, h: b.height }; })
        .filter(b => b.w > 0 && b.h > 0);
      const cov = (cell) => {
        const parts = eggs.map(e => ({
          x0: Math.max(cell.x, e.x), x1: Math.min(cell.x + cell.w, e.x + e.w),
          y0: Math.max(cell.y, e.y), y1: Math.min(cell.y + cell.h, e.y + e.h) }))
          .filter(q => q.x1 > q.x0 && q.y1 > q.y0);
        if (!parts.length) return 0;
        const xs = [...new Set(parts.flatMap(q => [q.x0, q.x1]))].sort((a, b) => a - b);
        let area = 0;
        for (let i = 0; i < xs.length - 1; i++) {
          const a = xs[i], b = xs[i + 1], w = b - a;
          if (w <= 0) continue;
          const iv = parts.filter(q => q.x0 <= a && q.x1 >= b).map(q => [q.y0, q.y1]).sort((u, v) => u[0] - v[0]);
          let cy = -Infinity, h = 0;
          for (const [y0, y1] of iv) { const s0 = Math.max(y0, cy); if (y1 > s0) { h += y1 - s0; cy = y1; } }
          area += w * h;
        }
        return area / (cell.w * cell.h) * 100;
      };
      const gap = (cell) => {
        let best = Infinity;
        for (const e of eggs) {
          const dx = Math.max(cell.x - (e.x + e.w), e.x - (cell.x + cell.w), 0);
          const dy = Math.max(cell.y - (e.y + e.h), e.y - (cell.y + cell.h), 0);
          best = Math.min(best, Math.hypot(dx, dy));
        }
        return best;
      };
      const cs = cells();
      return { eggs: eggs.length,
               cov: Math.max(...cs.map(cov)), gap: Math.min(...cs.map(gap)), cells: cs.length };
    };
    const frames = [];
    for (const t of stops) {
      /* 814 9·10회차 — 스타일 플러시를 끼워 **두 번 감는다**(한 번이면 갓 등록된 알이 안 잡힌다) */
      for (let w = 0; w < 2; w++) {
        void document.body.offsetHeight;
        try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = t; } catch (e) {} }); } catch (e) {}
      }
      frames.push(Object.assign({ t }, measure()));
    }

    /* §R2~R4 — 부품 자신의 계약(브라우저 안에서 바로 묻는다).
       ⚠ 「신고를 안 해서 0」 과 「신고했는데 자기 자신이라 0」 은 **다른 항**이다 — 앞의 것만 재면
         «호스트 제외» 규약이 통째로 사라져도 초록이다(334 «합본 단언» 함정). 그래서 벽 신고를
         **그 요소에 직접 얹어 놓고** 0 이 나오는지를 묻는다. */
    const unit = {};
    try {
      const grid = document.getElementById('rwGrid');
      unit.noDecl = grid ? fxbBlockRects(grid, 4).length : -1;      /* ① 안 신고한 호스트 = 빈 배열 */
      const bar = document.getElementById('rwMulBar');
      bar.style.setProperty('--burst-block', '#rwMulBar');           /* ② 신고했는데 «그게 나 자신» */
      unit.selfHost = fxbBlockRects(bar, 4).length;
      const kid = document.createElement('div');
      kid.className = 'v880kid'; kid.style.cssText = 'width:20px;height:20px';
      bar.appendChild(kid);
      bar.style.setProperty('--burst-block', '.v880kid');            /* ③ 신고한 것이 «내 자손» */
      unit.selfKid = fxbBlockRects(bar, 4).length;
      /* ④ 같은 신고를 «남» 이 하면 그 자손도 정상적으로 벽이 된다(위 둘이 헛초록이 아님을 못박는다) */
      const out = document.getElementById('rwGrid');
      if (out) { out.style.setProperty('--burst-block', '.v880kid'); unit.otherKid = fxbBlockRects(out, 4).length;
                 out.style.removeProperty('--burst-block'); }
      kid.remove(); bar.style.removeProperty('--burst-block');
      unit.rayFree = fxbRayLimit([{ x: 0, y: 0, w: 10, h: 10 }], 500, 500, 1, 0, 0);  /* 반대 방향 = 벽 없음 */
      unit.rayHit = fxbRayLimit([{ x: 100, y: 0, w: 10, h: 1000 }], 0, 500, 1, 0, 0); /* 정면 100px */
      unit.rayHalf = fxbRayLimit([{ x: 100, y: 0, w: 10, h: 1000 }], 0, 500, 1, 0, 20); /* 반폭 20 ⇒ 80 */
    } catch (e) { unit.err = String(e); }

    /* 봉투와 무관한 **기하** 단언용 — 끝 상자와 바를 같은 좌표계(프레임 px)로 돌려준다 */
    return { spawn, frames, unit, barF: fxRect(document.getElementById('rwMulBar')) };
  }, { stops: STOPS, sd: SEED, blank, reach });
  await b.close();
  return { out, errs };
}

(async () => {
  const A = await run(false);           /* 신고 있음 = 제품 현재 상태(990 발원) */
  const B = await run(true);            /* 신고 없음 = 880 수리 전과 같은 상태(되돌림) */
  /* 990 이관 — «벽이 사거리 안» 인 짝(위 `run` 머리말). C = 신고 있음 · D = 신고 없음 */
  const C = await run(false, true);
  const D = await run(true, true);

  const INPAD = 4;                      /* index.html `FXB_INPAD` — 신고 여유 */
  const fa = A.out.frames, fb = B.out.frames;

  /* ── §1 가림 ─────────────────────────────────────────────────────── */
  const worstCov = Math.max(...fa.map(f => f.cov));
  const minGap = Math.min(...fa.map(f => f.gap));
  ok('[C1] 전 프레임·전 칸 덮임 0%', worstCov < 0.005, '최악 ' + worstCov.toFixed(3) + '%');
  ok('[C2] 간격 ≥ 신고 여유 ' + INPAD + 'px', minGap >= INPAD, '최소 ' + minGap.toFixed(1) + 'px');
  ok('[C3] 배수 칸 넷을 다 봤다', fa.every(f => f.cells === 4), fa[0].cells + '칸 × ' + fa.length + '프레임');
  const same = fa.length === fb.length && fa.every((f, i) => f.eggs === fb[i].eggs);
  ok('[C3b] 알을 한 개도 안 버렸다(벽 유무로 보이는 알 수 동일)', same,
     fa.map(f => f.eggs).join('/') + ' vs ' + fb.map(f => f.eggs).join('/'));

  /* ── §2 «각도는 안 건드렸다» ───────────────────────────────────────── */
  /* ⚑ 990 이관 — §2 는 **«벽이 사거리 안» 인 짝(C·D)** 에 대고 묻는다. 지금 발원(A·B)에서는 벽이
     사거리 밖이라 «잘린 알» 표본이 0 이고, 0 을 대상으로 한 «각도 불변»·«한 줄로 안 눌린다» 는
     아무것도 안 지키는 항이 된다(위 `run` 머리말). 지금 화면 몫은 §1 과 [C7] 이 그대로 지킨다. */
  const sa = C.out.spawn, sb = D.out.spawn;
  ok('[C4a] 두 판의 알 수가 같다', sa.length === sb.length && sa.length > 0, sa.length + ' vs ' + sb.length);
  const dirEq = sa.length === sb.length && sa.every((e, i) => {
    const g = sb[i];
    if (e.x !== g.x || e.y !== g.y || e.w !== g.w) return false;     /* 탄생점·크기도 불변 */
    const ma = Math.hypot(e.dx, e.dy), mg = Math.hypot(g.dx, g.dy);
    if (ma < 1e-6 || mg < 1e-6) return ma === mg;
    return Math.abs(e.dx / ma - g.dx / mg) < 2e-3 && Math.abs(e.dy / ma - g.dy / mg) < 2e-3;
  });
  ok('[C4] 방향 단위벡터·탄생점·크기가 벽 유무에 무관하게 동일 (각도 0줄 변경)', dirEq);
  const cut = sa.map((e, i) => ({ i, a: Math.hypot(e.dx, e.dy), b: Math.hypot(sb[i].dx, sb[i].dy), e }))
    .filter(q => q.b - q.a > 0.05);
  const untouched = sa.map((e, i) => ({ a: Math.hypot(e.dx, e.dy), b: Math.hypot(sb[i].dx, sb[i].dy) }))
    .filter(q => q.b - q.a <= 0.05);
  ok('[C5] 벽에 안 걸리는 알은 거리도 종전과 동일', untouched.every(q => Math.abs(q.a - q.b) < 0.2),
     '무변경 ' + untouched.length + '알 · 줄어든 알 ' + cut.length);
  ok('[C5b] 실제로 줄어든 알이 있다(자가 헛돌지 않는다)', cut.length > 0, cut.length + '알');
  /* 838 3회차 서명 — 잘린 알들이 «한 줄» 로 눌리면 각도가 지워진 것이다 */
  const ends = cut.map(q => ({ x: q.e.x + q.e.dx, y: q.e.y + q.e.dy }));
  const spanY = ends.length > 1 ? Math.max(...ends.map(p => p.y)) - Math.min(...ends.map(p => p.y)) : Infinity;
  const spanX = ends.length > 1 ? Math.max(...ends.map(p => p.x)) - Math.min(...ends.map(p => p.x)) : Infinity;
  ok('[C6] 잘린 알의 끝점이 «한 줄» 로 안 눌린다(가로 퍼짐 > 세로 퍼짐)', !(spanX <= spanY),
     '끝점 퍼짐 x ' + (spanX === Infinity ? '—' : spanX.toFixed(1)) + ' · y '
     + (spanY === Infinity ? '—' : spanY.toFixed(1)));
  /* [C7] 봉투와 무관한 **기하** 단언 — 끝 상자(알 반폭 포함)와 바 사이의 간격을 직접 잰다.
     §1 은 «찍힌 프레임» 을 보고 여기는 «적힌 궤적» 을 본다 — 표본 시각이 바뀌어도 안 흔들린다.
     ⚠ **문턱을 «정확히 4» 로 두면 안 된다** — 벽에 걸린 알은 신고 여유의 **경계에 정확히** 서고
       `--dx/--dy` 는 `toFixed(1)` 로 적히므로 반올림 한 톨(≤0.05px)이 그 경계를 파고든다.
       제품 주석이 같은 자리에서 이미 경고한다(«딱 맞추면 반올림 한 톨에 [C1] 이 흔들린다 —
       574·709·825»). ⇒ 한 톨(0.1px)을 빼고 묻는다. */
  const bar = C.out.barF;
  const barGap = (sp) => Math.min(...sp.map(e => {
    const h = e.w / 2, ex = e.x + e.dx, ey = e.y + e.dy;
    const dx = Math.max(bar.x - (ex + h), (ex - h) - (bar.x + bar.w), 0);
    const dy = Math.max(bar.y - (ey + h), (ey - h) - (bar.y + bar.h), 0);
    return Math.hypot(dx, dy);
  }));
  ok('[C7] 끝 상자 ↔ 바 간격 ≥ 신고 여유 ' + INPAD + 'px (반올림 한 톨 허용 · 벽이 사거리 안인 판)',
     barGap(sa) >= INPAD - 0.1,
     '최소 ' + barGap(sa).toFixed(2) + 'px (바 프레임좌표 y '
     + bar.y.toFixed(1) + '..' + (bar.y + bar.h).toFixed(1) + ')');
  /* ⚑ 990 신설 — **지금 화면 몫**의 같은 물음. [C7] 이 «벽이 사거리 안이어도 안 밟는다» 를 지키고
     이 항이 «지금 발원에서는 애초에 못 닿는다» 를 수치로 남긴다(둘은 다른 말이라 항도 둘이다). */
  const barA = A.out.barF;
  const barGapA = Math.min(...A.out.spawn.map(e => {
    const h = e.w / 2, ex = e.x + e.dx, ey = e.y + e.dy;
    const dx = Math.max(barA.x - (ex + h), (ex - h) - (barA.x + barA.w), 0);
    const dy = Math.max(barA.y - (ey + h), (ey - h) - (barA.y + barA.h), 0);
    return Math.hypot(dx, dy);
  }));
  ok('[C7b] 지금 발원(990 — 가격바 화폐 아이콘)에서는 끝 상자가 바에 애초에 못 닿는다',
     barGapA >= INPAD - 0.1, '최소 ' + barGapA.toFixed(2) + 'px');

  /* ── §R 되돌림 ────────────────────────────────────────────────────── */
  /* ⚑ 990 이관 — 되돌림도 **벽이 사거리 안인 짝(C·D)** 에서 묻는다. 지금 발원(A·B)에서는 신고를
     지워도 애초에 못 닿아 이 항이 «신고가 통째로 사라져도 초록» 이 된다 — 이 자가 머리말에서
     스스로 금지한 자리다. 아래 [C1c] 가 그 짝의 양성 대조다. */
  const covD = Math.max(...D.out.frames.map(f => f.cov));
  const covC = Math.max(...C.out.frames.map(f => f.cov));
  ok('[C1c] 벽이 사거리 안인 판에서도 덮임 0% (880 의 본 주장)', covC < 0.005, '최악 ' + covC.toFixed(3) + '%');
  ok('[R1] 신고(`--burst-block`)를 지우면 다시 밟는다(≥1%)', covD >= 1,
     '신고 없음 최악 ' + covD.toFixed(2) + '% ↔ 있음 ' + covC.toFixed(3) + '%');
  ok('[R1b] 신고를 지운 판은 끝 상자가 실제로 바 안으로 들어간다(기하)', barGap(sb) === 0,
     '최소 간격 ' + barGap(sb).toFixed(2) + 'px ↔ 신고 있음 ' + barGap(sa).toFixed(2) + 'px');
  ok('[R2] 안 신고한 호스트는 벽이 0개(무변경 보장)', A.out.unit.noDecl === 0, '반환 ' + A.out.unit.noDecl);
  ok('[R3a] 신고한 것이 «호스트 자신» 이면 벽이 아니다', A.out.unit.selfHost === 0, '반환 ' + A.out.unit.selfHost);
  ok('[R3b] 신고한 것이 «내 자손» 이면 벽이 아니다', A.out.unit.selfKid === 0, '반환 ' + A.out.unit.selfKid);
  ok('[R3c] 같은 신고를 «남» 이 하면 그 자손도 벽이 된다(위 둘이 헛초록이 아니다)',
     A.out.unit.otherKid === 1, '반환 ' + A.out.unit.otherKid);
  ok('[R4a] 벽이 없는 방향의 광선은 무한대', A.out.unit.rayFree === null || A.out.unit.rayFree > 1e9,
     String(A.out.unit.rayFree));
  ok('[R4b] 정면 벽까지의 거리를 정확히 잰다(100px)', Math.abs(A.out.unit.rayHit - 100) < 1e-6,
     String(A.out.unit.rayHit));
  ok('[R4c] 알 반폭만큼 미리 멈춘다(반폭 20 ⇒ 80px)', Math.abs(A.out.unit.rayHalf - 80) < 1e-6,
     String(A.out.unit.rayHalf));
  ok('[R5] 콘솔 에러 0건', A.errs.length === 0 && B.errs.length === 0,
     'A ' + A.errs.length + ' · B ' + B.errs.length);

  console.log('# verify880 — 89 유물 소환 버스트 ↔ 배수 토글 바 (시드 ' + SEED + ')\n');
  console.log('| t(ms) | 최악 덮임 | 최소 간격 | 보이는 알 |');
  console.log('|---|---|---|---|');
  for (const f of fa) console.log('| ' + f.t + ' | ' + f.cov.toFixed(2) + '% | ' + f.gap.toFixed(1) + 'px | ' + f.eggs + ' |');
  console.log('');
  let pass = 0;
  for (const [n, c, d] of T) { if (c) pass++; console.log((c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); }
  console.log('\nVERIFY880 ' + pass + '/' + T.length + ' ' + (pass === T.length ? 'PASS' : 'FAIL'));
  process.exit(pass === T.length ? 0 : 1);
})();
