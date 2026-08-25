#!/usr/bin/env node
/* 115 검증 — «불멸» 등급은 소환 만렙(Lv 100)에서도 실효 ≈0.1% 만 나온다
 *
 *   node tools/verify115.js
 *
 * 지시서(PROGRESS 115 «검증 [3]-(가)») 가 요구한 항목 그대로:
 *   [A] 상수 — 목표 실효 확률 상수(IMMORTAL_P_MAX = 0.0010) 가 있고, 표의 p1 은 «손으로 적은 값» 이 아니라
 *       그 상수에서 역산한 값이다(p1 = T·Σ다른행/(1−T)). 옛 리터럴 0.03 부재. 해금 Lv75 유지.
 *   [B] gradeProbs 만렙 — 장비·동료 배너 불멸 = 0.0010 ± 0.0001 (구현 = 2.75% 였다)
 *   [C] Lv75 = 0 (해금 시점은 0) · 76~100 단조 증가 · Lv90 은 (0, 0.0010) 사이
 *   [D] 100만 회 시뮬 — 불멸 빈도 0.08~0.12%
 *   [E] 11 확률 팝업 — 무기 MAX 단계 불멸 헤더가 «0.10%» · «0%»·빈 문자열·NaN 0건
 *   [F] 표기 함수 fmtProbPct — 0.10 → «0.10» · 0.001 → «<0.01» · 5 → «5» · 0 → «0»
 *   [G] 스킬 배너(6행 표) 불변 — 만렙 신화 확률·행 수 그대로
 *   [H] 콘솔 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SRC = require('fs').readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof gradeProbs === 'function');
  await page.waitForTimeout(600);

  /* ---- [A] 상수 — «목표 실효 확률» 로 적혔는가 (LESSONS 106-1: 값이 식을 따라야 한다) ---- */
  const A = await page.evaluate(() => ({
    tgt: typeof IMMORTAL_P_MAX === 'number' ? IMMORTAL_P_MAX : null,
    p1:  GRADE_ROLL_EQ[7].p1,
    calc: (typeof IMMORTAL_P_MAX === 'number')
      ? IMMORTAL_P_MAX * (GRADE_ROLL.reduce((a, g) => a + g.p1, 0) + GRADE_ROLL_EQ[6].p1) / (1 - IMMORTAL_P_MAX)
      : NaN,
    u7: GRADE_ROLL_EQ[7].unlock, u6: GRADE_ROLL_EQ[6].unlock, len: GRADE_ROLL_EQ.length,
    tr: GRADE_ROLL_EQ[6].p1,
  }));
  ok(A.tgt === 0.0010, 'A1 목표 실효 확률 상수 IMMORTAL_P_MAX = 0.0010', String(A.tgt));
  ok(A.len === 8 && A.u6 === 55 && A.u7 === 75, 'A2 8행 표 · 해금 Lv 55/75 유지', A.u6 + '/' + A.u7);
  ok(Math.abs(A.p1 - A.calc) < 1e-12, 'A3 표의 p1 은 상수에서 역산한 값(손으로 적은 값 아님)',
     A.p1.toFixed(8) + ' vs ' + A.calc.toFixed(8));
  ok(Math.abs(A.tr - 0.06) < 1e-12, 'A4 초월 가중치 0.06 미변경(② 는 제안만)', String(A.tr));
  ok(!/\{\s*unlock:75,\s*p0:0\.00,\s*p1:0\.03\s*\}/.test(SRC), 'A5 옛 리터럴 `unlock:75 … p1:0.03` 부재(소스 스캔)');

  /* ---- [B] 만렙 실효 확률 ---- */
  const B = await page.evaluate(() => {
    const at = (b, L) => { const o = S.sum[b].lv; S.sum[b].lv = L; const p = gradeProbs(b); S.sum[b].lv = o; return p; };
    const r = {};
    ['weapon', 'shield', 'amulet', 'pet'].forEach(b => { const p = at(b, 100); r[b] = { g7: p[7], g6: p[6], sum: p.reduce((a, c) => a + c, 0) }; });
    return r;
  });
  ['weapon', 'shield', 'amulet', 'pet'].forEach(b => {
    ok(Math.abs(B[b].g7 - 0.0010) <= 0.0001, 'B ' + b + ' 만렙 불멸 = 0.0010 ± 0.0001',
       (B[b].g7 * 100).toFixed(4) + '%');
  });
  ok(Object.values(B).every(x => Math.abs(x.sum - 1) < 1e-9), 'B5 확률 합 = 1 (재정규화 유지)');
  ok(B.weapon.g6 > B.weapon.g7 * 20, 'B6 초월 ≫ 불멸 (간격 확보)',
     '초월 ' + (B.weapon.g6 * 100).toFixed(3) + '% / 불멸 ' + (B.weapon.g7 * 100).toFixed(3) + '%');

  /* ---- [C] 해금 구간 — Lv75 = 0, 76→100 단조 증가 ---- */
  const C = await page.evaluate(() => {
    const seq = [];
    for (let L = 74; L <= 100; L++) seq.push(gradeProbsAt('weapon', L)[7]);
    return { l74: seq[0], l75: seq[1], l90: seq[16], seq,
             mono: seq.slice(1).every((v, i) => i === 0 || v > seq[i]) };
  });
  ok(C.l74 === 0 && C.l75 === 0, 'C1 Lv74·Lv75 불멸 = 0 (해금 시점 t=0)', C.l74 + '/' + C.l75);
  ok(C.mono, 'C2 Lv76~100 단조 증가');
  ok(C.l90 > 0 && C.l90 < 0.0010, 'C3 Lv90 은 0 과 0.10% 사이', (C.l90 * 100).toFixed(4) + '%');
  ok(Math.abs(C.seq[26] - 0.0010) <= 0.0001, 'C4 Lv100 종점 = 0.10%', (C.seq[26] * 100).toFixed(4) + '%');

  /* ---- [D] 100만 회 시뮬 (summonOne 과 동일한 누적 추첨) ---- */
  const D = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 100;
    const p = gradeProbs('weapon'); S.sum.weapon.lv = o;
    const N = 1e6; let hit = 0;
    for (let k = 0; k < N; k++) {
      let r = Math.random(), acc = 0, g = 0;
      for (let i = 0; i < p.length; i++) { acc += p[i]; if (r < acc) { g = i; break; } }
      if (g === 7) hit++;
    }
    return { hit, N, pct: hit / N * 100 };
  });
  ok(D.pct >= 0.08 && D.pct <= 0.12, 'D1 100만 회 시뮬 불멸 빈도 0.08~0.12%',
     D.hit + '/' + D.N + ' = ' + D.pct.toFixed(4) + '%');
  ok(/function summonOne\(b\)\{[\s\S]{0,200}?gradeProbs\(b\)[\s\S]{0,200}?acc \+= p\[i\]/.test(SRC),
     'D2 summonOne 이 gradeProbs 결과로 누적 추첨한다(시뮬과 같은 경로)');

  /* ---- [E] 11 확률 팝업 표시 ---- */
  const E = await page.evaluate(() => {
    openProbInfo('weapon', 100);
    const h = document.getElementById('prbList').innerHTML;
    const m = h.match(/불멸 \(([^)]*)\)/);
    const t = h.match(/초월 \(([^)]*)\)/);
    closeProbInfo();
    return { imm: m ? m[1] : null, tr: t ? t[1] : null, bad: /NaN|undefined/.test(h),
             empty: /\(\s*%\)/.test(h), zero: /불멸 \(0%\)/.test(h) };
  });
  ok(E.imm === '0.10%', 'E1 무기 MAX 팝업 불멸 헤더 «0.10%»', String(E.imm));
  ok(!E.zero && !E.empty, 'E2 «0%»·빈 확률 문자열 0건');
  ok(!E.bad, 'E3 팝업 NaN/undefined 0건');
  ok(E.tr && /^5\.\d\d%$/.test(E.tr), 'E4 초월 헤더는 종전 표기 유지', String(E.tr));

  /* ---- [F] fmtProbPct 단위 검사 ---- */
  const F = await page.evaluate(() => ({
    a: fmtProbPct(0.10), b: fmtProbPct(0.001), c: fmtProbPct(5), d: fmtProbPct(0),
    e: fmtProbPct(5.6547), f: fmtProbPct(0.53), g: fmtProbPct(30),
  }));
  ok(F.a === '0.10', 'F1 0.10 → «0.10» (뒤 0 안 지운다)', F.a);
  ok(F.b === '&lt;0.01', 'F2 0.001 → «<0.01»', F.b);
  ok(F.c === '5' && F.g === '30', 'F3 정수는 정수 그대로', F.c + '/' + F.g);
  ok(F.d === '0', 'F4 0 → «0»', F.d);
  ok(F.e === '5.65' && F.f === '0.53', 'F5 1% 이상은 종전 규칙(fmtPct) · 1% 미만은 2자리 고정', F.e + '/' + F.f);

  /* ---- [G] 스킬 배너(6행 표) 불변 ---- */
  const G = await page.evaluate(() => {
    const o = S.sum.skill.lv; S.sum.skill.lv = 100;
    const p = gradeProbs('skill'); S.sum.skill.lv = o;
    return { rows: GRADE_ROLL.length, g5: p[5], g6: p[6], g7: p[7] };
  });
  ok(G.rows === 6 && G.g6 === 0 && G.g7 === 0, 'G1 스킬은 6행 표 유지(초월·불멸 0)');
  ok(Math.abs(G.g5 - 0.10) < 1e-9, 'G2 스킬 만렙 신화 = 10% 불변', (G.g5 * 100).toFixed(2) + '%');

  /* ---- [H] 콘솔 ---- */
  ok(errs.length === 0, 'H1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY115 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
