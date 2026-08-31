#!/usr/bin/env node
/* 작업 549 — 재현: `verify86` 247행 · `verify193` 524행이 `PRB_STEPS[i].unlock` 을 넘긴다.
 *
 *   node tools/probe549.js
 *
 * 등재문(538 §5 곁다리): «`PRB_STEPS` 는 250 이후 «소환 레벨 숫자 배열»(1..SUM_MAXLV)이라
 *   `.unlock` 은 `undefined` 다. `openProbInfo(bank, lv)` 는 `lv != null` 이 거짓이면 예외 없이
 *   «현재 소환 레벨» 로 떨어지므로 두 자는 일반·희귀 10행만 보게 된다.
 *   ⚑ 지금 초록인 이유는 바로 다음 줄 `prbStep = i; renderProbInfo();` 가 단계를 덮어쓰기 때문이다 —
 *   즉 인자는 죽었고 결과만 우연히 맞다. 그 한 줄을 누가 정리하는 순간 두 자는
 *   조용히 좁아진 채 계속 초록이 된다.»
 *
 * ⚑ 이 자가 가르는 것은 «지금 빨간가» 가 아니다(지금은 둘 다 초록이다).
 *   가르는 것은 **«두 줄 중 어느 줄이 단계를 정하는가»** 하나뿐이다.
 *   그래서 절을 «인자만» · «덮어쓰기만» · «둘 다» 로 갈라 각각 몇 종이 보이는지 직접 센다 —
 *   등재문이 참이라면 «인자만(.unlock)» 이 좁아지고, «인자만(값)» 은 안 좁아져야 한다.
 *
 *   [1] 표의 모양 — `PRB_STEPS` 가 정말 «숫자 배열» 인가 (제품에게 직접 묻는다)
 *   [2] 인자의 생사 — `PRB_STEPS[i].unlock` 이 `undefined` 이고 예외가 안 난다
 *   [3] 네 조합 실측 — 덮어쓰기 유/무 × 인자 `.unlock`/값 각각의 «본 종 수»
 *   [4] 두 자의 현행 절을 그대로 재현 — 우연히 초록임을 수치로 못박는다
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  (c ? pass++ : fail++);
  console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra === undefined ? '' : '  [' + extra + ']'));
};

(async () => {
  const br = await launch(chromium);
  const pg = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL);
  await pg.waitForTimeout(1500);

  /* ── [1] 표의 모양 ── */
  console.log('[1] `PRB_STEPS` 의 모양 — 제품에게 직접 묻는다 (250 이후)');
  const one = await pg.evaluate(() => ({
    isArr:   Array.isArray(PRB_STEPS),
    len:     PRB_STEPS.length,
    maxlv:   SUM_MAXLV,
    allNum:  PRB_STEPS.every(v => typeof v === 'number'),
    first:   PRB_STEPS[0],
    last:    PRB_STEPS[PRB_STEPS.length - 1],
    contig:  PRB_STEPS.every((v, i) => v === i + 1),
    eqSame:  PRB_STEPS.length === PRB_STEPS_EQ.length
             && PRB_STEPS.every((v, i) => v === PRB_STEPS_EQ[i]),
    skillG8: !!(BANNERS.skill && BANNERS.skill.g8),
  }));
  ok(one.isArr && one.allNum, '`PRB_STEPS` 는 «숫자 배열» 이다 (객체 배열이 아니다)');
  ok(one.contig && one.first === 1 && one.last === one.maxlv,
     '값은 1..SUM_MAXLV 연속이다', one.first + '..' + one.last + ' (SUM_MAXLV ' + one.maxlv + ')');
  ok(one.eqSame, '`PRB_STEPS_EQ` 도 같은 표다 (`prbSteps()` 가 어느 쪽을 골라도 같다)');

  /* ── [2] 인자의 생사 ── */
  console.log('[2] 인자 `PRB_STEPS[i].unlock` — 죽었는데 예외가 안 난다 (522-②)');
  const two = await pg.evaluate(() => {
    const u = PRB_STEPS.map(s => s.unlock);
    let threw = false;
    try { openProbInfo('skill', PRB_STEPS[3].unlock); } catch (e) { threw = true; }
    const stepAfterUndef = prbStep;
    openProbInfo('skill', PRB_STEPS[3]);
    const stepAfterVal = prbStep;
    closeProbInfo();
    return { allUndef: u.every(v => v === undefined), threw, stepAfterUndef, stepAfterVal,
             cur: sumLv('skill') };
  });
  ok(two.allUndef, '`PRB_STEPS[i].unlock` 은 전 칸 `undefined` 다');
  ok(!two.threw, '그런데 `openProbInfo` 는 예외를 안 던진다 — 조용히 «현재 레벨» 로 떨어진다');
  ok(two.stepAfterUndef !== 3 && two.stepAfterVal === 3,
     '⚑ 같은 i=3 인데 인자에 따라 단계가 다르다 — `.unlock` 은 단계를 못 정한다',
     'undef → prbStep ' + two.stepAfterUndef + ' (현재 Lv ' + two.cur + ') · 값 → prbStep ' + two.stepAfterVal);

  /* ── [3] 네 조합 실측 ── */
  console.log('[3] 네 조합 — 덮어쓰기 유/무 × 인자 `.unlock`/값 이 각각 몇 종을 보는가');
  const three = await pg.evaluate(() => {
    const sweep = (useVal, overwrite) => {
      const seen = new Set();
      PRB_STEPS.forEach((st, i) => {
        openProbInfo('skill', useVal ? st : st.unlock);
        if (overwrite) { prbStep = i; renderProbInfo(); }
        document.querySelectorAll('#prbList .prb-row .nm>i').forEach(e => seen.add(e.textContent));
      });
      closeProbInfo();
      return seen.size;
    };
    return {
      unlockNoOw: sweep(false, false),   /* 인자 죽음 · 덮어쓰기 없음 = 등재문이 말한 «조용히 좁아진» 자 */
      unlockOw:   sweep(false, true),    /* 현행 두 자 = 우연히 초록 */
      valNoOw:    sweep(true,  false),   /* 처방 = verify75 246행 꼴 */
      valOw:      sweep(true,  true),    /* 처방 + 덮어쓰기(중복) */
      total:      SKILLS.length,
    };
  });
  ok(three.valNoOw === three.total,
     '처방(값을 그대로 넘김 · 덮어쓰기 없음)이 전 종을 본다', three.valNoOw + '/' + three.total);
  ok(three.unlockNoOw < three.total,
     '⚑ 등재문이 참이다 — 인자만 남기면(`.unlock`) 조용히 좁아진다',
     three.unlockNoOw + '/' + three.total + ' 종 (일반·희귀만)');
  ok(three.unlockOw === three.total,
     '⚑ 지금 초록인 이유는 인자가 아니라 «덮어쓰기 줄» 이다 — 인자는 죽었고 결과만 맞다',
     three.unlockOw + '/' + three.total);
  ok(three.valOw === three.valNoOw,
     '값을 넘기면 덮어쓰기 줄이 있으나 없으나 같다 — 그 줄은 처방 뒤엔 군더더기다',
     three.valOw + ' = ' + three.valNoOw);

  /* ── [4] 두 자의 현행 절을 그대로 재현 ── */
  console.log('[4] `verify86` [5] · `verify193` 확률 절 — 현행 코드를 그대로 돌린 값');
  const four = await pg.evaluate(() => {
    /* verify86 247행 · verify193 524행과 글자 그대로 같은 절 */
    const seen = new Set();
    PRB_STEPS.forEach((_, i) => {
      openProbInfo('skill', PRB_STEPS[i].unlock);
      prbStep = i; renderProbInfo();
      document.querySelectorAll('#prbList .prb-row .nm>i').forEach(e => seen.add(e.textContent));
    });
    document.getElementById('prbw').classList.remove('on');
    return { rows: seen.size, want: SKILLS.length };
  });
  ok(four.rows === four.want,
     '현행 절은 27종을 본다 = 두 자가 초록인 것은 사실이다 (결함은 «지금 빨강» 이 아니라 «잠복»)',
     four.rows + '/' + four.want);

  ok(errs.length === 0, '콘솔/페이지 에러 0건', errs.slice(0, 3).join(' | '));

  await br.close();
  console.log('\nPROBE549 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
