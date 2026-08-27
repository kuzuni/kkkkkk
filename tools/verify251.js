#!/usr/bin/env node
/* 251 검증 — «같은 등급 안에서도 티어가 낮은 것은 뜰 확률을 더 적게» (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify251.js
 *
 * 지시 원문의 «티어» = 그 등급 안에서의 **세기 순위**다(260 이 확정한 정의).
 * 그러므로 요구는 «세기 순위가 낮은 개체일수록 뽑힐 확률이 작다» 이고, 등급 자체의 확률
 * (`gradeProbs`)은 **한 톨도 바뀌면 안 된다**.
 *
 * 검사 항목:
 *   [A] 가중치 함수 `tierWeights` — Σw = 1 · 세기 순위와 같은 방향으로 단조 · 양 끝 비 = TIER_W_RATIO
 *                                 · 1종 풀은 [1] · 방향 상수가 지시문 쪽(+1)
 *   [B] 등급 확률 불변 — 한 등급 항목 확률의 합 = `gradeProbs` 그 등급 값(전 배너 × 전 이정표)
 *   [C] 실제 추첨 — Math.random 을 고정 수열(mulberry32)로 갈아 40만 표본. 관측 비율이 가중치와 일치하고,
 *                  «약한 티어가 더 드물다» 가 등급마다 실제로 성립한다. 등급 분포는 gradeProbs 그대로.
 *   [D] 표시 = 추첨 — 11 확률 팝업(`#prbList`)의 행별 % 가 `tierWeights` 계산값과 같다.
 *                    (표기만 바꾸고 추첨을 안 바꾸면 그게 곧 버그라는 등재문 지시)
 *   [E] 데이터 불변 — 260 이 세운 표(EQUIPS 108 · PETS 36 · SKILLS 27 의 id·v·m·cd)에 손대지 않았다.
 *                    스킬은 «배열 순서 ≠ 세기 순서» 인 등급이 실제로 있으므로 순위를 계산해야 한다는 못.
 *   [F] 저장 구조 불변(KEY) · 콘솔 에러 0
 *
 * 되돌림 시험(156 비고 5): `tierWeights` 를 균등(1/n)으로 되돌리면 **A2·A3·C2 가 빨개진다**(24/27).
 * ⚠ C1·D1 은 그때도 초록이다 — 그 둘이 묻는 것은 «추첨과 표시가 서로 같은가» 이지 «차등이 걸렸는가»
 *   가 아니기 때문이다(균등으로 되돌리면 둘 다 균등이라 서로 일치한다). 요구 자체를 지키는 못은
 *   A2·A3(가중치 방향·폭)과 C2(실제 표본에서의 순서)다. 둘을 갈라 놓은 것이 이 게이트의 요지다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
/* [C] 표본 수 — 가장 얇은 칸(일반 등급 최약 티어 ≈ 전체의 0.65%)도 2,500 표본이 넘는다.
   ⚠ 난수는 **32비트 정수 연산만 쓰는 mulberry32** 로 고정한다. 흔한 LCG
   (`(1103515245*s + 12345) % 2^31`)를 JS 로 그대로 쓰면 곱이 2^53 을 넘어 정밀도가 깨지고
   하위 비트 주기까지 짧아, «등급 뽑기 → 티어 뽑기» 두 번 연속 호출이 강하게 상관된다
   (실제로 이 게이트 첫 판이 그 이유로 C1~C3 을 전부 빨갛게 냈다 — 제품이 아니라 자가 틀렸다). */
const N_DRAW = 400000;
const TOL_REL = 0.01;       /* [C] 상대 오차 여유 — 실제 판정은 여기에 4σ(통계 오차)를 더해서 한다 */
const C2_MIN  = 8000;       /* [C2] 관측 단조를 물을 최소 등급 표본 — 이보다 얇으면 통계가 안 된다 */
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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof BANNERS !== 'undefined'
    && typeof renderUI === 'function');
  await page.waitForTimeout(600);

  /* ── [A] 가중치 함수 ───────────────────────────────────── */
  const A = await page.evaluate(() => {
    if (typeof tierWeights !== 'function' || typeof tierScore !== 'function')
      return { missing: true };
    const badSum = [], badMono = [], badRatio = [];
    let pools = 0;
    BKEYS.forEach(b => {
      const B = BANNERS[b];
      GRADE.forEach((_, g) => {
        const pool = B.list.filter(x => x.g === g);
        if (!pool.length) return;
        pools++;
        const w = tierWeights(pool, b);
        const sum = w.reduce((a, c) => a + c, 0);
        if (Math.abs(sum - 1) > 1e-12) badSum.push(b + 'g' + g + ' Σ=' + sum);
        if (pool.length < 2) return;
        /* 세기 오름차순으로 줄 세운 뒤 가중치가 «방향대로» 단조인지 */
        const ord = pool.map((it, i) => ({ i, s: tierScore(it, b) }))
                        .sort((a, c) => (a.s - c.s) || (a.i - c.i));
        for (let r = 1; r < ord.length; r++) {
          const prev = w[ord[r - 1].i], cur = w[ord[r].i];
          const good = TIER_W_DIR > 0 ? cur > prev : cur < prev;
          if (!good) badMono.push(b + 'g' + g + ' r' + r + ' ' + prev.toFixed(5) + '→' + cur.toFixed(5));
        }
        const lo = w[ord[0].i], hi = w[ord[ord.length - 1].i];
        const ratio = TIER_W_DIR > 0 ? hi / lo : lo / hi;
        if (Math.abs(ratio - TIER_W_RATIO) > 1e-9)
          badRatio.push(b + 'g' + g + ' ' + ratio.toFixed(6));
      });
    });
    /* 1종 풀(불멸) — 반드시 [1] */
    const one = tierWeights(BANNERS.weapon.list.filter(x => x.g === 7), 'weapon');
    return { missing: false, pools, badSum, badMono, badRatio,
             oneOk: one.length === 1 && one[0] === 1,
             emptyOk: tierWeights([], 'weapon').length === 0,
             dir: TIER_W_DIR, ratio: TIER_W_RATIO };
  });
  ok(!A.missing, 'A0 `tierWeights`·`tierScore` 존재', A.missing ? '없음(251 미구현/되돌림)' : '있음');
  if (A.missing) { console.log('\nVERIFY251 ' + pass + '/' + (pass + fail) + ' FAIL ' + fail); await browser.close(); process.exit(1); }
  ok(A.badSum.length === 0, 'A1 전 풀 Σw = 1 (' + A.pools + '풀)', A.badSum.join(' / ') || '오차 ≤1e-12');
  ok(A.badMono.length === 0, 'A2 세기 순위와 같은 방향으로 단조 — 약한 티어가 더 드물다',
     A.badMono.slice(0, 4).join(' / ') || '위반 0');
  ok(A.badRatio.length === 0, 'A3 등급 안 양 끝 비 = TIER_W_RATIO(' + A.ratio + ')',
     A.badRatio.slice(0, 4).join(' / ') || '전 풀 일치');
  ok(A.oneOk && A.emptyOk, 'A4 1종 풀 = [1] · 빈 풀 = []');
  ok(A.dir === 1, 'A5 방향 상수가 지시문 쪽(+1 = 티어 낮은 것이 드물다)', 'TIER_W_DIR=' + A.dir);
  ok(A.ratio > 1, 'A6 차등이 실제로 걸려 있다(RATIO > 1 — 1 이면 종전 균등)', String(A.ratio));

  /* ── [B] 등급 확률 불변 ────────────────────────────────── */
  const B = await page.evaluate(() => {
    const bad = [];
    BKEYS.forEach(b => {
      const BN = BANNERS[b];
      prbStepsOf(rollOf(b)).forEach(L => {
        const gp = gradeProbsAt(b, L);
        GRADE.forEach((_, g) => {
          const pool = BN.list.filter(x => x.g === g);
          if (!pool.length) return;
          const s = tierWeights(pool, b).reduce((a, c) => a + c, 0) * gp[g];
          if (Math.abs(s - gp[g]) > 1e-12) bad.push(b + '@' + L + 'g' + g);
        });
      });
    });
    /* 등급 확률 자체는 항상 합이 1 이어야 한다(251 이 gradeProbs 를 안 건드렸다는 확인) */
    const sums = BKEYS.map(b => gradeProbsAt(b, SUM_MAXLV).reduce((a, c) => a + c, 0));
    return { bad, sumBad: sums.filter(x => Math.abs(x - 1) > 1e-9).length };
  });
  ok(B.bad.length === 0, 'B1 한 등급 항목 확률의 합 = gradeProbs 그 등급 값', B.bad.slice(0, 4).join(' / ') || '전 배너 × 전 이정표 일치');
  ok(B.sumBad === 0, 'B2 gradeProbs 총합 = 1 (등급 확률 미변경)');

  /* ── [C] 실제 추첨 ─────────────────────────────────────── */
  const C = await page.evaluate(({ n, tol, c2min }) => {
    let s = 987654321 >>> 0;
    const real = Math.random;
    Math.random = () => {                       /* mulberry32 — 32비트 정수 연산만 쓴다(정밀도 손실 없음) */
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rows = [], badFit = [], badMono = [], badGrade = [];
    ['weapon', 'skill', 'pet'].forEach(b => {
      const BN = BANNERS[b];
      S.sum[b].lv = SUM_MAXLV;
      const own = S.own; S.own = {};
      const cnt = {};
      for (let i = 0; i < n; i++) { const r = summonOne(b); cnt[r.it.id] = (cnt[r.it.id] || 0) + 1; }
      S.own = own;
      const gp = gradeProbs(b);
      GRADE.forEach((_, g) => {
        const pool = BN.list.filter(x => x.g === g);
        if (!pool.length) return;
        const got = pool.map(it => cnt[it.id] || 0);
        const gTot = got.reduce((a, c) => a + c, 0);
        /* 등급 분포 — 기대 표본 1000 이상만(그보다 얇으면 통계가 안 된다). 판정은 4σ + 상대 여유 */
        const gExp = gp[g] * n;
        if (gExp >= 1000 && Math.abs(gTot - gExp) > 4 * Math.sqrt(gExp) + tol * gExp)
          badGrade.push(b + 'g' + g + ' ' + gTot + ' vs ' + gExp.toFixed(0));
        if (pool.length < 2 || gTot < 2000) return;
        const w = tierWeights(pool, b);
        got.forEach((c, i) => {
          const exp = w[i] * gTot;
          if (Math.abs(c - exp) > 4 * Math.sqrt(exp) + tol * exp)
            badFit.push(b + 'g' + g + '[' + i + '] ' + c + ' vs ' + exp.toFixed(0));
        });
        /* «약한 티어가 더 드물다» 를 관측 카운트로 직접 확인 — 표본이 두꺼운 등급만 */
        const ord = pool.map((it, i) => ({ i, sc: tierScore(it, b) }))
                        .sort((a, c) => (a.sc - c.sc) || (a.i - c.i));
        if (gTot >= c2min)
          for (let r = 1; r < ord.length; r++)
            if (!(got[ord[r].i] > got[ord[r - 1].i]))
              badMono.push(b + 'g' + g + ' r' + r + ' ' + got[ord[r - 1].i] + '→' + got[ord[r].i]);
        rows.push(b + ' g' + g + '  ' + ord.map(o => got[o.i]).join(' < ')
          + (gTot < c2min ? '  (표본 얇음 — C2 제외)' : ''));
      });
    });
    Math.random = real;
    return { rows, badFit, badMono, badGrade };
  }, { n: N_DRAW, tol: TOL_REL, c2min: C2_MIN });
  C.rows.forEach(r => console.log('     ' + r));
  ok(C.badFit.length === 0, 'C1 관측 비율 = tierWeights (4σ + ' + (TOL_REL * 100) + '%, ' + N_DRAW + '표본)',
     C.badFit.slice(0, 4).join(' / ') || '전 풀 일치');
  ok(C.badMono.length === 0, 'C2 등급마다 «약한 티어가 실제로 더 적게 나온다»',
     C.badMono.slice(0, 4).join(' / ') || '위반 0');
  ok(C.badGrade.length === 0, 'C3 등급 분포는 gradeProbs 그대로', C.badGrade.slice(0, 4).join(' / ') || '일치');

  /* ── [D] 표시 = 추첨 ───────────────────────────────────── */
  const D = await page.evaluate(() => {
    const out = [];
    ['weapon', 'skill', 'pet'].forEach(b => {
      openProbInfo(b, SUM_MAXLV);
      const BN = BANNERS[b];
      let gp = gradeProbsAt(b, SUM_MAXLV).slice();
      for (let g = GRADE.length - 1; g > 0; g--)
        if (!BN.list.some(x => x.g === g)) { gp[g - 1] += gp[g]; gp[g] = 0; }
      /* 화면이 그린 행을 위에서부터 그대로 읽어 기대값과 짝짓는다 */
      const shown = [...document.querySelectorAll('#prbList .prb-row .pc')].map(e => e.textContent.trim());
      const want = [];
      for (let g = GRADE.length - 1; g >= 0; g--) {
        const items = BN.list.filter(x => x.g === g);
        if (gp[g] <= 1e-9 || !items.length) continue;
        const w = tierWeights(items, b);
        items.forEach((_, i) => want.push((gp[g] * w[i] * 100).toFixed(5) + '%'));
      }
      const mism = [];
      shown.forEach((v, i) => { if (v !== want[i]) mism.push(i + ': ' + v + ' ≠ ' + want[i]); });
      /* 등급 헤더 % 는 그 등급 행들의 합과 맞아야 한다(합이 깨지면 표가 거짓말을 한다) */
      let headOk = true;
      const heads = [...document.querySelectorAll('#prbList .prb-gh i')].map(e => e.textContent);
      const nums = shown.map(v => parseFloat(v));
      let k = 0;
      for (let g = GRADE.length - 1; g >= 0; g--) {
        const items = BN.list.filter(x => x.g === g);
        if (gp[g] <= 1e-9 || !items.length) continue;
        const sum = nums.slice(k, k + items.length).reduce((a, c) => a + c, 0);
        if (Math.abs(sum - gp[g] * 100) > 0.001) headOk = false;
        k += items.length;
      }
      closeProbInfo();
      out.push({ b, rows: shown.length, want: want.length, mism, headOk, heads: heads.length,
                 bad: shown.some(v => /NaN|undefined/.test(v)) });
    });
    return out;
  });
  D.forEach(d => {
    ok(d.rows === d.want && d.mism.length === 0,
       'D1 ' + d.b + ' 확률 팝업 행별 % = tierWeights 계산값 (' + d.rows + '행)',
       d.mism.slice(0, 3).join(' / ') || '전 행 일치');
    ok(d.headOk, 'D2 ' + d.b + ' 등급 헤더 % = 그 등급 행 합');
    ok(!d.bad, 'D3 ' + d.b + ' 확률 팝업 NaN/undefined 0건');
  });

  /* ── [E] 데이터 불변 · 스킬 티어 축 ────────────────────── */
  const E = await page.evaluate(() => {
    /* 스킬은 260 이 «오름차순 강제» 를 면제했다 → 배열 순서 ≠ 세기 순서인 등급이 실제로 있다.
       그 사실이 «스킬 티어는 자리(j)가 아니라 세기로 잡아야 한다» 는 이 작업의 근거다. */
    let skShuffled = 0;
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g);
      if (t.length < 2) return;
      const sc = t.map(s => tierScore(s, 'skill'));
      for (let i = 1; i < sc.length; i++) if (sc[i] < sc[i - 1]) { skShuffled++; break; }
    });
    /* 장비·펫은 배열 순서 = 세기 순서여야 한다(260 의 못) — 여기서 재확인한다 */
    const eqBad = [], ptBad = [];
    SLOTS.forEach(s => GRADE.forEach((_, g) => {
      const t = EQUIPS.filter(e => e.slot === s.k && e.g === g);
      for (let i = 1; i < t.length; i++) if (!(tierScore(t[i], 'weapon') > tierScore(t[i - 1], 'weapon'))) eqBad.push(s.k + g);
    }));
    GRADE.forEach((_, g) => {
      const t = PETS.filter(p => p.g === g);
      for (let i = 1; i < t.length; i++) if (!(tierScore(t[i], 'pet') > tierScore(t[i - 1], 'pet'))) ptBad.push('g' + g);
    });
    return { eq: EQUIPS.length, pt: PETS.length, sk: SKILLS.length, skShuffled, eqBad, ptBad,
             key: typeof KEY === 'string' ? KEY : null };
  });
  ok(E.eq === 108 && E.pt === 36 && E.sk === 27, 'E1 표 규모 불변 — 장비 108 · 펫 36 · 스킬 27(193 증설분 포함)',
     E.eq + '/' + E.pt + '/' + E.sk);
  ok(E.eqBad.length === 0 && E.ptBad.length === 0, 'E2 장비·펫은 배열 순서 = 세기 순서(260 재확인)',
     (E.eqBad.concat(E.ptBad)).slice(0, 4).join(' / ') || '위반 0');
  ok(E.skShuffled > 0, 'E3 스킬은 배열 순서 ≠ 세기 순서인 등급이 있다(티어를 세기로 잡는 근거)',
     E.skShuffled + '개 등급');

  /* ── [F] 저장 구조 · 에러 ──────────────────────────────── */
  const F = await page.evaluate(() => {
    /* 251 은 세이브에 아무 키도 더하지 않는다 — 소환 결과 저장 경로가 종전 그대로인지 본다 */
    const before = JSON.stringify(Object.keys(S).sort());
    S.sum.weapon.lv = SUM_MAXLV;
    const r = summonOne('weapon');
    const after = JSON.stringify(Object.keys(S).sort());
    return { same: before === after, own: !!(S.own[r.it.id] && S.own[r.it.id].l >= 1), key: KEY };
  });
  ok(F.same, 'F1 소환 뒤에도 세이브 최상위 키 집합 불변(251 은 저장 구조를 안 바꾼다)');
  ok(F.own, 'F2 소환 결과가 종전대로 `S.own` 에 들어간다', String(F.key));
  ok(errs.length === 0, 'F3 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY251 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
