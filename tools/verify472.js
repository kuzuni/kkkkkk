#!/usr/bin/env node
/* 472 검증 — 장비 «장착 효과» 계단표(주인 확정 수치 2026-08-30)
 *
 *   node tools/verify472.js
 *
 * 주인 확정: «맨 처음 것(일반 1티어) 장착 효과 10% · 같은 등급 안에서 티어가 하나 오를 때마다 ×1.5 ·
 *             등급이 하나 오르면 새 등급 1티어 = 이전 등급 5티어의 ×3».
 *
 *   [A] 표 자체 — EQ_BASE 상수 3개 · 전 칸(3부위 × 8등급 × 티어) 실값이 식과 일치
 *   [B] 계단   — 등급 안 인접 칸 비 = 1.5 · 등급 경계 비 = 3.0 · 260 순서 규칙(그 등급 최강 < 다음 1티어)
 *   [C] 정규화 — Lv1 일반 1티어 = 정확히 10.00% (주인이 말한 «맨 처음 것»)
 *   [D] 안 건드린 축 — 보유 효과(ownVal)·GRADE.mul·gWear·도감 세트 배율이 전부 그대로
 *   [E] 실동작 — 장착/해제가 stat 에 반영 · `power()` 순서 = 배열 순서(482 자동 선택의 자)
 *   [F] 표시   — 08 세부 팝업·05 시트가 접힌 표기로 그릇 안에 든다(477 계열 잘림 0)
 *   [G] 세이브 — 이관 0줄이 정답(계수만 바뀜) · 구 세이브가 그대로 살아난다
 *   [R] 되돌림 시험 — 옛 식(gWear × v)으로 되돌리면 [B]·[C] 가 빨개진다
 *   [Z] 콘솔 에러 0건
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const EPS = 1e-6;
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof EQUIPS !== 'undefined'
    && typeof EQ_BASE === 'function' && typeof equipVal === 'function');
  await page.waitForTimeout(500);

  /* ── [A] 표 자체 ────────────────────────────────────────── */
  const A = await page.evaluate(() => {
    const at1 = it => { const keep = S.own[it.id]; S.own[it.id] = { l: 1 };
      const v = equipVal(it); if (keep) S.own[it.id] = keep; else delete S.own[it.id]; return v; };
    const bad = [];
    EQUIPS.forEach(e => {
      const want = EQ_BASE(e.g, e.j || 0);
      if (Math.abs(at1(e) - want) > 1e-9 * Math.max(1, want)) bad.push(e.id);
    });
    return { t0: EQ_T0, tier: EQ_TIER, grade: EQ_GRADE, bad, n: EQUIPS.length,
             tierMax: Math.max(...EQUIPS.map(e => e.j || 0)),
             g7n: EQUIPS.filter(e => e.g === 7).length };
  });
  ok(Math.abs(A.t0 - 0.10) < EPS, 'A1 EQ_T0 = 0.10 (일반 1티어 10%)', String(A.t0));
  ok(Math.abs(A.tier - 1.5) < EPS, 'A2 EQ_TIER = 1.5 (티어 한 칸)', String(A.tier));
  ok(Math.abs(A.grade - 15.1875) < EPS, 'A3 EQ_GRADE = 1.5⁴ × 3 = 15.1875 (등급 한 칸)', String(A.grade));
  ok(A.bad.length === 0, 'A4 108종 전부 equipVal(Lv1) = EQ_BASE(등급, 티어)', A.bad.slice(0, 4).join(' / ') || '위반 0');
  ok(A.tierMax === 4, 'A5 티어는 0~4 다섯 칸', 't최대 ' + A.tierMax);
  ok(A.g7n === 3, 'A6 불멸(g7)은 부위당 1종 = t0 하나', '3부위 합 ' + A.g7n);

  /* ── [B] 계단 ───────────────────────────────────────────── */
  const B = await page.evaluate(() => {
    const at1 = it => { const keep = S.own[it.id]; S.own[it.id] = { l: 1 };
      const v = equipVal(it); if (keep) S.own[it.id] = keep; else delete S.own[it.id]; return v; };
    const inStep = [], edge = [], order = [];
    SLOTS.forEach(s => {
      const tiers = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s.k && e.g === g));
      tiers.forEach(t => {
        const vals = t.map(at1);
        for (let j = 1; j < vals.length; j++) {
          inStep.push(vals[j] / vals[j - 1]);
          if (!(vals[j] > vals[j - 1])) order.push(t[j].id);
        }
      });
      for (let g = 0; g + 1 < tiers.length; g++) {
        if (!tiers[g].length || !tiers[g + 1].length) continue;
        edge.push(Math.min(...tiers[g + 1].map(at1)) / Math.max(...tiers[g].map(at1)));
      }
    });
    return { inStep, edge, order };
  });
  const near = (a, x) => Math.abs(a - x) < 1e-6;
  ok(B.inStep.every(r => near(r, 1.5)), 'B1 등급 안 인접 티어 비 = 1.5 (전 칸)',
     B.inStep.length + '칸 · ' + Math.min(...B.inStep).toFixed(4) + '~' + Math.max(...B.inStep).toFixed(4));
  ok(B.edge.every(r => near(r, 3)), 'B2 등급 경계 비 = 3.0 (그 등급 5티어 → 다음 등급 1티어)',
     B.edge.length + '경계 · ' + Math.min(...B.edge).toFixed(4) + '~' + Math.max(...B.edge).toFixed(4));
  ok(B.order.length === 0, 'B3 260 순서 규칙 — 등급 안 뒤로 갈수록 세다', B.order.join(' / ') || '위반 0');

  /* ── [C] 정규화 ─────────────────────────────────────────── */
  const C = await page.evaluate(() => {
    const w = EQUIPS.find(e => e.slot === 'weapon' && e.g === 0 && (e.j || 0) === 0);
    const out = {};
    [0, 1, 2, 10].forEach(l => { S.own[w.id] = { l }; out['lv' + l] = equipVal(w); });
    delete S.own[w.id];
    return { id: w.id, ...out, lvStep: LV_STEP };
  });
  ok(Math.abs(C.lv1 - 0.10) < 1e-12, 'C1 Lv1 일반 1티어 = 정확히 10.00%', (C.lv1 * 100).toFixed(6) + '%');
  ok(Math.abs(C.lv2 / C.lv1 - (1 + 2 * C.lvStep) / (1 + C.lvStep)) < 1e-9,
     'C2 레벨 축(lvWear)은 지시 밖 — 기울기 그대로', 'Lv2/Lv1 = ' + (C.lv2 / C.lv1).toFixed(6));
  ok(C.lv0 < C.lv1, 'C3 Lv0(미보유 표시용)은 Lv1 보다 작다 — 정규화가 값을 뒤집지 않았다',
     (C.lv0 * 100).toFixed(4) + '% < ' + (C.lv1 * 100).toFixed(4) + '%');

  /* ── [D] 안 건드린 축 ───────────────────────────────────── */
  const D = await page.evaluate(() => ({
    mul: GRADE.map(g => g.mul), wear: GRADE.map(g => g.wear), jump: GRADE_JUMP,
    /* 보유 효과는 여전히 gMul × lvMul × v 다 — v 가 살아 있어야 한다 */
    ownG4: (() => { const e = EQUIPS.find(x => x.slot === 'weapon' && x.g === 4 && (x.j || 0) === 4);
      S.own[e.id] = { l: 1 }; const o = ownVal(e); delete S.own[e.id];
      return { got: o, want: 0.02 * GRADE[4].mul * (1 + 1 * 0.18) * e.v, v: e.v }; })(),
    vAlive: EQUIPS.every(e => typeof e.v === 'number' && e.v >= 0.90 && e.v <= 1.15)
  }));
  ok(D.jump === 3 && D.wear.join(',') === '1,3,9,27,81,243,729,2187',
     'D1 gWear(197 계단)는 한 글자도 안 바뀌었다', 'JUMP ' + D.jump + ' · ' + D.wear.join('·'));
  ok(D.mul.join(',') === '1,1.5,2.3,3.6,6,10,16,26', 'D2 GRADE.mul(도감·유물 가중치) 불변', D.mul.join('·'));
  ok(Math.abs(D.ownG4.got - D.ownG4.want) < 1e-12, 'D3 보유 효과(ownVal)는 식·값 전부 그대로',
     (D.ownG4.got * 100).toFixed(4) + '% (v ' + D.ownG4.v + ' 가 살아 있다)');
  ok(D.vAlive, 'D4 개체차 v 는 삭제되지 않았다(보유 축의 것) — 108종 전부 0.90~1.15');

  /* ── [E] 실동작 ─────────────────────────────────────────── */
  const E = await page.evaluate(() => {
    const w0 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 0 && (e.j || 0) === 0);
    const w4 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 0 && (e.j || 0) === 4);
    S.own[w0.id] = { l: 1 }; S.own[w4.id] = { l: 1 };
    S.eqSlot.weapon = null; markDirty(); const off = stat.dmg;
    S.eqSlot.weapon = w0.id; markDirty(); const on0 = stat.dmg;
    S.eqSlot.weapon = w4.id; markDirty(); const on4 = stat.dmg;
    /* ⚑ 724 — 장부 값은 **치우기 전에** 읽는다(치운 뒤엔 보유 Σ 0 · Lv0 이라 다른 물건이 된다) */
    const own = EQUIPS.reduce((t, e) => (has(e.id) && e.slot === 'weapon') ? t + ownVal(e) : t, 0);
    const ev0 = equipVal(w0), ev4 = equipVal(w4);
    S.eqSlot.weapon = null; delete S.own[w0.id]; delete S.own[w4.id]; markDirty();
    /* power() 순서 = 배열 순서(482 «제일 좋은 것» 자동 선택이 읽는 자) */
    const badPow = [];
    SLOTS.forEach(s => GRADE.forEach((_, g) => {
      const t = EQUIPS.filter(e => e.slot === s.k && e.g === g);
      for (let j = 1; j < t.length; j++) if (!(power(t[j]) > power(t[j - 1]))) badPow.push(t[j].id);
    }));
    /* ⚑ 724 — 장비는 «보유 + 장착» 이 한 카테고리라 장착 배수가 보유 Σ 로 희석된다.
       그래서 관측비의 기댓값도 장부 꼴로 준다 — 지키는 뜻(«1티어 = +10%»)은 그대로다. */
    return { off, on0, on4, r0: on0 / off, r4: on4 / off, badPow, own, ev0, ev4 };
  });
  ok(Math.abs(E.r0 - (1 + E.own + E.ev0) / (1 + E.own)) < 1e-9,
     'E1 일반 1티어 장착 = 공격력 +' + (E.ev0 * 100).toFixed(2) + '%(장비 장부 · 724)',
     '×' + E.r0.toFixed(6) + ' = (1+보유Σ ' + E.own.toFixed(4) + '+' + E.ev0.toFixed(4) + ')/(1+보유Σ)');
  ok(Math.abs(E.ev0 - 0.10) < 1e-9, 'E1b 장착 효과 자체는 일반 1티어 = +10% 그대로',
     (E.ev0 * 100).toFixed(4) + '%');
  ok(Math.abs(E.ev4 / E.ev0 - Math.pow(1.5, 4)) < 1e-9, 'E2 같은 등급 5티어는 1티어보다 ×1.5⁴ 만큼 위',
     '×' + (E.ev4 / E.ev0).toFixed(6) + ' (' + (E.ev4 * 100).toFixed(3) + '% / ' + (E.ev0 * 100).toFixed(3) + '%)');
  ok(E.badPow.length === 0, 'E3 power() 순서 = 배열 순서(482 자동 선택의 자)',
     E.badPow.slice(0, 4).join(' / ') || '위반 0');

  /* ── [F] 표시(477 계열 잘림 0) ──────────────────────────── */
  const F = await page.evaluate(async () => {
    const top = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
    S.own[top.id] = { l: 1 };
    showItem(top.id);
    await new Promise(r => setTimeout(r, 120));
    const box = document.querySelector('#modal .sk-db');
    const txt = box ? box.innerText : '';
    const over = box ? { w: box.scrollWidth - box.clientWidth, h: box.scrollHeight - box.clientHeight } : null;
    const line = (txt.split('\n').find(l => l.indexOf('장착 효과') >= 0) || '');
    if (typeof closeModal === 'function') closeModal();
    delete S.own[top.id];
    return { line, over, len: line.length, digits: (line.match(/\d/g) || []).length };
  });
  ok(!!F.line, 'F1 08 세부 팝업에 «장착 효과» 줄이 있다', F.line);
  ok(F.digits <= 8, 'F2 그 줄의 숫자가 8자 이하로 접힌다(pctB — 477 계열 잘림 예방)',
     '숫자 ' + F.digits + '자 / 줄 길이 ' + F.len);
  ok(F.over && F.over.w <= 0 && F.over.h <= 0, 'F3 `.sk-db` 상자가 안 넘친다',
     F.over ? ('가로 ' + F.over.w + ' · 세로 ' + F.over.h) : '상자 못 찾음');

  /* ── [G] 세이브 — 이관 0줄이 정답 ───────────────────────── */
  const G = await page.evaluate(() => {
    const w = EQUIPS.find(e => e.slot === 'weapon' && e.g === 1 && (e.j || 0) === 4);
    /* 구 세이브가 저장하는 것은 «무엇을 갖고 있고 몇 레벨인가» 뿐 — 계수는 코드에만 있다 */
    const raw = JSON.stringify({ own: { [w.id]: { l: 7 } }, eqSlot: { weapon: w.id } });
    const parsed = JSON.parse(raw);
    S.own = Object.assign({}, S.own, parsed.own); S.eqSlot.weapon = parsed.eqSlot.weapon; markDirty();
    const v = equipVal(EQ[w.id]);
    const want = EQ_BASE(1, 4) * lvWear(7) / lvWear(1);
    delete S.own[w.id]; S.eqSlot.weapon = null; markDirty();
    return { got: v, want, key: (typeof KEY !== 'undefined' ? KEY : '?') };
  });
  ok(Math.abs(G.got - G.want) < 1e-9, 'G1 구 세이브(id + Lv)가 새 표를 그대로 탄다 — 이관 0줄이 정답',
     'Lv7 고급 5티어 = ' + (G.got * 100).toFixed(2) + '%');

  /* ── [R] 되돌림 시험 ────────────────────────────────────── */
  const R = await page.evaluate(() => {
    /* 옛 식으로 되돌린 사본을 만들어 [B]·[C] 를 다시 재면 빨개져야 한다 */
    const old1 = it => { const keep = S.own[it.id]; S.own[it.id] = { l: 1 };
      const v = 0.10 * gWear(it.g) * lvWear(1) * ((it.slot && it.v) ? it.v : 1);
      if (keep) S.own[it.id] = keep; else delete S.own[it.id]; return v; };
    const t = EQUIPS.filter(e => e.slot === 'weapon' && e.g === 0);
    const steps = []; for (let j = 1; j < t.length; j++) steps.push(old1(t[j]) / old1(t[j - 1]));
    return { steps, lv1: old1(t[0]) };
  });
  ok(!R.steps.every(s => Math.abs(s - 1.5) < 1e-6), 'R1 옛 식으로 되돌리면 B1(티어 ×1.5)이 빨개진다',
     '옛 비 ' + R.steps.map(s => s.toFixed(3)).join('·'));
  ok(Math.abs(R.lv1 - 0.10) > 1e-6, 'R2 옛 식으로 되돌리면 C1(Lv1 = 10.00%)이 빨개진다',
     '옛 값 ' + (R.lv1 * 100).toFixed(2) + '%');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
