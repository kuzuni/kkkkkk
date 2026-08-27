#!/usr/bin/env node
/* 250 검증 — 11 소환 «확률 정보» 팝업의 단계를 연속으로
 *
 *   node tools/verify250.js
 *
 * 저장소 주인 지시(2026-08-27):
 *   «11 소환 확률 정보 팝업의 단계가 띄엄띄엄 — 1·2·3·4·5·6 처럼 연속으로 다 있어야 함»
 *
 * 196 까지의 단계는 «각 등급 해금 레벨 + 만렙» **이정표**였다 → 1 → 5 → 8 → 12 → 16 → MAX.
 * 해금 사이 레벨(2·3·4 …)에서도 확률은 t^0.9 로 계속 움직이는데 볼 방법이 없었다.
 * 196 이 만렙을 100 → 25 로 줄여 «전 레벨 나열» 이 25쪽으로 현실적이 됐으므로
 * 단계 = 소환 레벨 1..SUM_MAXLV 전부로 바꾼다.
 *
 * 검사 항목:
 *   [A] 단계 배열   — PRB_STEPS·PRB_STEPS_EQ 가 1..SUM_MAXLV 연속 · 옛 이정표 리터럴 부재
 *   [B] 실동작      — ▶ 를 끝까지 눌러 «단계» 표기가 1,2,3,…,MAX 로 한 칸씩 간다 (버튼 실클릭)
 *                     ◀ 로 되돌아온다 · 양 끝에서 화살표가 off
 *   [C] 내용 유효   — 전 단계에 등급 헤더·항목 행이 있고 NaN/undefined 0건 · 확률 합 100%
 *   [D] 해금 표현   — 해금 레벨 경계(직전/당일)에서 그 등급 행이 없다→있다로 바뀐다
 *   [E] 진입 단계   — openProbInfo 가 «현재 소환 레벨» 단계로 정확히 연다(이정표 내림이 아님)
 *   [F] 콘솔 에러 0건
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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderProbInfo === 'function');
  await page.waitForTimeout(600);

  const MAXLV = await page.evaluate(() => SUM_MAXLV);

  /* ================= [A] 단계 배열 ================= */
  console.log('[A] 단계 배열');
  const A = await page.evaluate(() => ({
    steps: PRB_STEPS.slice(), stepsEq: PRB_STEPS_EQ.slice(),
    /* 배너별 실제 반환값도 본다 — prbSteps() 가 g8 로 갈라지므로 둘 다 확인 */
    byBank: ['weapon', 'skill', 'pet'].map(b => { prbBank = b; return prbSteps().join(','); })
  }));
  const CONSEC = Array.from({ length: MAXLV }, (_, i) => i + 1);
  const isConsec = a => a.length === MAXLV && a.every((v, i) => v === CONSEC[i]);
  ok(isConsec(A.steps), 'A1 PRB_STEPS = 1..' + MAXLV + ' 연속 (건너뜀 0)',
    A.steps.slice(0, 8).join(',') + '…' + A.steps.slice(-2).join(','));
  ok(isConsec(A.stepsEq), 'A2 PRB_STEPS_EQ = 1..' + MAXLV + ' 연속 (8행 배너도 동일)',
    A.stepsEq.slice(0, 8).join(',') + '…' + A.stepsEq.slice(-2).join(','));
  ok(A.byBank.every(s => s === CONSEC.join(',')), 'A3 prbSteps() 가 전 배너에서 같은 연속 단계',
    A.byBank.map(s => s.split(',').length + '칸').join(' / '));
  ok(!/\[\s*1\s*,\s*5\s*,\s*15\s*,\s*30/.test(SRC), 'A4 옛 리터럴 이정표 [1,5,15,30,…] 부재(소스 스캔)');
  ok(!/roll\s*=>\s*roll\.map\(g\s*=>\s*g\.unlock\)/.test(SRC),
    'A5 «해금 레벨만 뽑는» 옛 prbStepsOf 부재(소스 스캔)');

  /* ================= [B] 실동작 — ▶ 를 실제로 누른다 ================= */
  console.log('[B] ◀▶ 실동작 (버튼 실클릭)');
  await page.evaluate(() => { S.sum.weapon.lv = 1; openProbInfo('weapon', 1); });
  await page.waitForTimeout(120);
  const seq = [];
  const readLv = () => page.evaluate(() => ({
    lv: document.getElementById('prbLv').textContent,
    prevOff: document.getElementById('prbPrev').classList.contains('off'),
    nextOff: document.getElementById('prbNext').classList.contains('off')
  }));
  let st = await readLv();
  seq.push(st.lv);
  const firstPrevOff = st.prevOff;
  for (let i = 0; i < MAXLV - 1; i++) {
    await page.click('#prbNext');
    st = await readLv();
    seq.push(st.lv);
  }
  const lastNextOff = st.nextOff;
  /* 1,2,3,…,MAXLV−1,MAX — 마지막만 'MAX' 표기(종전 규칙 유지) */
  const want = CONSEC.map(v => (v >= MAXLV ? 'MAX' : String(v)));
  ok(seq.length === MAXLV && seq.every((v, i) => v === want[i]),
    'B1 ▶ 를 ' + (MAXLV - 1) + '번 눌러 단계가 1,2,3,…,MAX 로 한 칸씩 (건너뜀 0)',
    seq.slice(0, 8).join(',') + '…' + seq.slice(-2).join(','));
  ok(firstPrevOff && lastNextOff, 'B2 양 끝에서 ◀/▶ 가 off (1 에서 ◀ · MAX 에서 ▶)',
    '첫 ◀off=' + firstPrevOff + ' 끝 ▶off=' + lastNextOff);
  /* ◀ 로 되돌아오기 */
  const back = [];
  for (let i = 0; i < MAXLV - 1; i++) { await page.click('#prbPrev'); back.push((await readLv()).lv); }
  ok(back.length === MAXLV - 1 && back[back.length - 1] === '1' &&
     back.every((v, i) => v === want[MAXLV - 2 - i]),
    'B3 ◀ 로 같은 순서를 역으로 되돌아온다 (1 까지)', back.slice(0, 4).join(',') + '… → ' + back[back.length - 1]);

  /* ================= [C] 전 단계 내용 ================= */
  console.log('[C] 전 단계 내용');
  const C = await page.evaluate(() => {
    const bad = [], empty = [], sums = [];
    ['weapon', 'skill', 'pet'].forEach(b => {
      const ST = (BANNERS[b].g8 ? PRB_STEPS_EQ : PRB_STEPS);
      ST.forEach((L, i) => {
        openProbInfo(b, L); prbStep = i; renderProbInfo();
        const el = document.getElementById('prbList'), h = el.innerHTML;
        if (/NaN|undefined/.test(h)) bad.push(b + '@' + L);
        if (!/prb-gh/.test(h) || !/prb-row/.test(h)) empty.push(b + '@' + L);
        /* 등급 헤더 확률의 합 = 100% (표시 반올림 오차 허용) */
        const tot = [...el.querySelectorAll('.prb-gh i')]
          .map(e => parseFloat((e.textContent.match(/\(([\d.]+)%\)/) || [0, '0'])[1]) || 0)
          .reduce((a, c) => a + c, 0);
        sums.push({ k: b + '@' + L, tot });
      });
    });
    closeProbInfo();
    return { bad, empty, off: sums.filter(x => Math.abs(x.tot - 100) > 0.6).map(x => x.k + '=' + x.tot.toFixed(2)),
             n: sums.length };
  });
  ok(C.n === MAXLV * 3, 'C1 3배너 × ' + MAXLV + '단계 = ' + (MAXLV * 3) + '쪽 전수 렌더', String(C.n));
  ok(C.bad.length === 0, 'C2 전 단계 NaN/undefined 0건', C.bad.slice(0, 4).join(' '));
  ok(C.empty.length === 0, 'C3 전 단계에 등급 헤더 + 항목 행이 있다(빈 쪽 0건)', C.empty.slice(0, 4).join(' '));
  ok(C.off.length === 0, 'C4 전 단계 등급 확률 합 ≈ 100%', C.off.slice(0, 4).join(' '));

  /* ================= [D] 해금 경계 — 연속 단계라야 볼 수 있는 것 ================= */
  console.log('[D] 해금 경계 (연속 단계의 목적)');
  const D = await page.evaluate(() => {
    const r = rollOf('weapon');
    const heads = L => { openProbInfo('weapon', L); return [...document.querySelectorAll('#prbList .prb-gh i')]
      .map(e => e.textContent.replace(/\s*\(.*/, '')); };
    const out = r.map((g, i) => {
      /* 해금 레벨에서는 t=0 이라 가중치 p0(=0)  → 확률 0 → 행이 안 그려진다(설계. fnchk115 «해금 시점 0»).
         실제로 등장하는 첫 단계는 unlock+1 이고, 그 단계는 옛 이정표 목록에 **없던** 레벨이다
         — 250 이 연속 단계로 바꾼 덕분에 비로소 볼 수 있는 쪽이다. */
      const at   = heads(g.unlock);
      const next = g.unlock < SUM_MAXLV ? heads(g.unlock + 1) : at;
      return { g: i, u: g.unlock, n: GRADE[i].n, at: at.includes(GRADE[i].n), next: next.includes(GRADE[i].n) };
    });
    closeProbInfo();
    return out;
  });
  /* 해금 레벨이 1 인 등급(일반·고급)은 p0 > 0 이라 1단계부터 보인다 → D2 에서 따로 본다 */
  const bnd = D.filter(x => x.u > 1);
  ok(bnd.length > 0 && bnd.every(x => !x.at && x.next),
    'D1 해금 단계는 확률 0 으로 비고 다음 단계(unlock+1)에서 등장 (' + bnd.length + '등급 전수)',
    bnd.map(x => x.n + ' ' + x.u + (x.at ? '✗보임' : '없음') + '→' + (x.u + 1) + (x.next ? '보임' : '✗없음')).join(' · '));
  ok(D.filter(x => x.u === 1).every(x => x.at), 'D2 Lv1 해금 등급은 1단계부터 보인다',
    D.filter(x => x.u === 1).map(x => x.n).join('/'));

  /* ================= [E] 진입 단계 ================= */
  console.log('[E] 진입 단계');
  const E = await page.evaluate(() => {
    const probe = lv => { S.sum.weapon.lv = lv; openProbInfo('weapon');
      return { lv, txt: document.getElementById('prbLv').textContent }; };
    const out = [3, 7, 13, 24, SUM_MAXLV].map(probe);
    closeProbInfo();
    return out;
  });
  ok(E.every(x => x.txt === (x.lv >= MAXLV ? 'MAX' : String(x.lv))),
    'E1 현재 소환 레벨 단계로 정확히 열린다 (이정표로 내림 안 함)',
    E.map(x => x.lv + '→' + x.txt).join(' '));

  /* ================= [F] 콘솔 ================= */
  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\n기능 체크 표');
  console.log('  · ▶ (prbNext)      → 단계 1 → 2 → 3 … → MAX, 한 번에 한 칸(' + MAXLV + '쪽), MAX 에서 off');
  console.log('  · ◀ (prbPrev)      → 같은 순서를 역으로, 1 에서 off');
  console.log('  · 🔍 (openProbInfo) → 현재 소환 Lv 단계로 진입 (' + E.map(x => x.lv + '→' + x.txt).join(' · ') + ')');
  console.log('  · 각 단계 표        → 등급 헤더 + 항목 행 렌더, 확률 합 100%, NaN 0건 (' + C.n + '쪽 전수)');

  await browser.close();
  console.log('\nVERIFY250 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
