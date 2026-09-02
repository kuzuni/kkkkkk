#!/usr/bin/env node
/* 115 검증 — «불멸» 등급은 소환 만렙(SUM_MAXLV)에서도 실효 ≈0.1% 만 나온다
 *
 * 196 (2026-08-27) — 만렙이 100 → **25** 로 줄고 해금 사다리가 55/75 → **20/24** 로 옮겨졌다.
 * 이 게이트가 묻는 것은 «만렙에서 0.1%» 이지 «Lv100 에서 0.1%» 가 아니므로, 리터럴 100·75·90 을
 * 전부 **표에서 뽑은 값**(SUM_MAXLV · GRADE_ROLL_EQ[7].unlock)으로 바꿨다. 만렙이 또 바뀌어도
 * 이 게이트는 굳지 않는다(LESSONS 106-1 «값이 식을 따라야 한다» 의 게이트판).
 *
 *   node tools/verify115.js
 *
 * 지시서(PROGRESS 115 «검증 [3]-(가)») 가 요구한 항목 그대로:
 *   [A] 상수 — 목표 실효 확률 상수(IMMORTAL_P_MAX = 0.0010) 가 있고, 표의 p1 은 «손으로 적은 값» 이 아니라
 *       그 상수에서 역산한 값이다(p1 = T·Σ다른행/(1−T)). 옛 리터럴 0.03 부재. 해금 Lv 20/24(196).
 *   [B] gradeProbs 만렙 — 장비·동료 배너 불멸 = 0.0010 ± 0.0001 (구현 = 2.75% 였다)
 *   [C] 해금 Lv = 0 (해금 시점은 0) · 해금→만렙 단조 증가 · 램프 중간점은 (0, 0.0010) 사이
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
    maxlv: SUM_MAXLV,
  }));
  ok(A.tgt === 0.0010, 'A1 목표 실효 확률 상수 IMMORTAL_P_MAX = 0.0010', String(A.tgt));
  /* 496 — 사다리 비례 이동(만렙 25 → 50). 115 가 지키는 것은 «불멸이 만렙 직전 1 레벨 램프» 라
     불멸은 만렙에서 역산해 적는다 — 만렙이 또 바뀌어도 이 줄은 안 바뀐다(LESSONS 106-1). */
  ok(A.len === 8 && A.u6 === 40 && A.u7 === A.maxlv - 1,
    'A2 8행 표 · 해금 Lv 초월 40 · 불멸 만렙−1 (196 → 496)', A.u6 + '/' + A.u7);
  ok(Math.abs(A.p1 - A.calc) < 1e-12, 'A3 표의 p1 은 상수에서 역산한 값(손으로 적은 값 아님)',
     A.p1.toFixed(8) + ' vs ' + A.calc.toFixed(8));
  ok(Math.abs(A.tr - 0.06) < 1e-12, 'A4 초월 가중치 0.06 미변경(② 는 제안만)', String(A.tr));
  ok(!/\{\s*unlock:75,\s*p0:0\.00,\s*p1:0\.03\s*\}/.test(SRC), 'A5 옛 리터럴 `unlock:75 … p1:0.03` 부재(소스 스캔)');

  /* ---- [B] 만렙 실효 확률 ----
     ⚑ 805 (2026-09-02) 이관 — 이 절은 네 배너 **전부**에 «만렙 불멸 = 0.10%» 를 물었다.
     757 이 펫 불멸 1종(`pet7_0`)을 데이터에서 걷어낸 뒤 펫에는 8행째가 없으므로 `p[7]` 은 0 이고,
     그 항만 빨간 채 굳어 있었다(`probe805` [1]~[2] · `fnchk115` 8번과 **같은 뿌리**).
     ⚠ 항을 지우거나 펫을 목록에서 빼면 «펫 배너를 아무도 안 보는» 게이트가 된다 —
     333 처방대로 **방향만 뒤집는다**: 배너가 8행이면 «0.10%», 7행이면 «불멸 0 · 최고 등급은 초월».
     기대값을 손으로 가르지 않고 `rollOf(b)`(= `topG(coll)` 파생)에게 물으므로, 다음에 어느 배너의
     최고 등급이 또 접히거나 되살아나도 이 절은 저절로 따라온다(LESSONS 106-1 · 368 «제품에게 물어라»). */
  const B = await page.evaluate(() => {
    const at = (b, L) => { const o = S.sum[b].lv; S.sum[b].lv = L; const p = gradeProbs(b); S.sum[b].lv = o; return p; };
    const r = {};
    ['weapon', 'shield', 'amulet', 'pet'].forEach(b => {
      const p = at(b, SUM_MAXLV);
      r[b] = { g7: p[7], g6: p[6], sum: p.reduce((a, c) => a + c, 0),
               rows: rollOf(b).length, top: topG(BANNERS[b].coll), topName: GRADE[topG(BANNERS[b].coll)].n };
    });
    return r;
  });
  ['weapon', 'shield', 'amulet', 'pet'].forEach(b => {
    const has7 = B[b].rows > 7;                 /* 그 배너에 불멸 행이 있는가 — 데이터가 답한다 */
    ok(has7 ? Math.abs(B[b].g7 - 0.0010) <= 0.0001 : (B[b].g7 === 0 && B[b].g6 > 0),
       'B ' + b + (has7 ? ' 만렙 불멸 = 0.0010 ± 0.0001'
                        : ' 불멸 행 없음(757) → 불멸 0 · 최고 등급 ' + B[b].topName + ' > 0'),
       (B[b].g7 * 100).toFixed(4) + '% · ' + B[b].rows + '행 · 최고=' + B[b].topName
       + ' ' + (B[b].g6 * 100).toFixed(4) + '%');
  });
  /* B4b — 위 갈래가 «둘 다 있는» 상태에서만 뜻이 산다(장비 8행 ↔ 펫 7행). 한쪽으로 굳으면
     갈래 한 줄이 죽은 코드가 되므로 그것을 여기서 못박는다(333 «자리를 비우지 마라»). */
  ok(B.weapon.rows === 8 && B.pet.rows === 7 && B.weapon.topName === '불멸' && B.pet.topName === '초월',
     'B4b 배너마다 최고 등급이 다르다 — 장비 8행(불멸) · 펫 7행(초월)',
     '장비 ' + B.weapon.rows + '행/' + B.weapon.topName + ' · 펫 ' + B.pet.rows + '행/' + B.pet.topName);
  ok(Object.values(B).every(x => Math.abs(x.sum - 1) < 1e-9), 'B5 확률 합 = 1 (재정규화 유지)');
  ok(B.weapon.g6 > B.weapon.g7 * 20, 'B6 초월 ≫ 불멸 (간격 확보)',
     '초월 ' + (B.weapon.g6 * 100).toFixed(3) + '% / 불멸 ' + (B.weapon.g7 * 100).toFixed(3) + '%');

  /* ---- [C] 해금 구간 — 해금 Lv = 0, 해금 → 만렙 단조 증가 ----
     196: 해금(24)과 만렙(25) 사이에 «정수 레벨» 이 없다. gradeProbsAt 은 L 을 그대로 받는 순수
     함수라 **소수 레벨로 곡선을 훑는다**(20 등분). 램프가 1레벨이어도 t^0.9 곡선 자체는 그대로다. */
  const C = await page.evaluate(() => {
    const U = GRADE_ROLL_EQ[7].unlock, span = SUM_MAXLV - U, N = 20, seq = [];
    for (let i = 0; i <= N; i++) seq.push(gradeProbsAt('weapon', U + span * i / N)[7]);
    return { before: gradeProbsAt('weapon', U - 1)[7], at0: seq[0], mid: seq[N / 2], end: seq[N],
             U, span, mono: seq.slice(1).every((v, i) => v > seq[i]) };
  });
  ok(C.before === 0 && C.at0 === 0, 'C1 해금 직전·해금 시점 불멸 = 0 (t=0)',
     'Lv' + (C.U - 1) + '=' + C.before + ' / Lv' + C.U + '=' + C.at0);
  ok(C.mono, 'C2 해금 → 만렙 단조 증가', 'Lv' + C.U + '~' + (C.U + C.span) + ' 20등분');
  ok(C.mid > 0 && C.mid < 0.0010, 'C3 램프 중간점은 0 과 0.10% 사이', (C.mid * 100).toFixed(4) + '%');
  ok(Math.abs(C.end - 0.0010) <= 0.0001, 'C4 만렙 종점 = 0.10%', (C.end * 100).toFixed(4) + '%');

  /* ---- [D] 100만 회 시뮬 (summonOne 과 동일한 누적 추첨) ---- */
  const D = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = SUM_MAXLV;
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
    openProbInfo('weapon', SUM_MAXLV);
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
    const o = S.sum.skill.lv; S.sum.skill.lv = SUM_MAXLV;
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
