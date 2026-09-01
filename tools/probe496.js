/* 작업 496 재현 — 소환 레벨·곡선·해금 사다리가 어느 판인지를 **제품에서 역산해** 찍는다.
 *
 * ⚑ 774 (2026-09-01) — 이 자는 «갈래 키 하나로 두 축을 갈랐다» 가 뿌리인 게이트 부패였다.
 *   원판은 `typeof S.sumLv === 'number'` **하나**로 «496 수리 전/후» 를 갈랐는데, 그 뒤
 *   **714 가 레벨을 다시 배너별로 돌려놓으면서** 오늘 트리가 «수리 전» 으로 읽혔고,
 *   496·196·767 이 차례로 옮긴 **오늘의 값**(만렙 50 · 사다리 1,1,10,16,24,32,40,49)에
 *   **196 시절 손 상수**(만렙 25 · 1,1,5,8,12,16,20,24)를 들이대 5 항이 빨갰다.
 *   `probe568` 이 이미 «갈래를 가르는 키가 둘이 됐다 — `sumVer`(714) · `sumLv`(496)» 라고 적어 뒀다.
 *
 *   ⇒ **축이 둘이므로 키도 둘이다.** 서로 독립이다:
 *     · **공유 축**  `typeof S.sumLv === 'number'` — 다섯 배너가 «한 주머니» 인가 (496 이 켜고 714 가 껐다)
 *     · **곡선 축**  `typeof SUM_EXP_A === 'number'` — 곡선이 «식» 인가 «196 표» 인가 (496 이 켠 뒤 그대로다)
 *   판이 셋이라 갈래도 셋이다(`SUM_VER` 주석과 같은 셈):
 *                                    공유   곡선     만렙        사다리(8행)
 *     ⓐ 196 이전(구 판)              배너별  표      25          1,1,5,8,12,16,20,24
 *     ⓑ 496                          공용    식      50          1,1,10,16,24,32,40,49
 *     ⓒ 714(오늘)                    배너별  식      50          1,1,10,16,24,32,40,49
 *
 * ⚑ 774 가 같이 걷어낸 것: **손 상수**다(LESSONS 522-① «만렙을 손으로 적지 마라 — 게이트가 더 잘 썩는다»).
 *   만렙·해금 레벨·불멸 확률을 숫자로 적지 않고 전부 제품 상수에서 역산한다
 *   (`SUM_MAXLV` · `SUM_EXP_A/B` · `GRADE_ROLL(_EQ)` · `rollOf` · `IMMORTAL_P_MAX` · `SUM_MAXLV_V196`).
 *   그래야 다음 이동에도 안 부패한다. 남긴 숫자는 **딱 하나** — ⓑ4 의 «199 과녁 268,000» 이고,
 *   그것은 제품 상수의 거울이 아니라 **주인이 밖에서 못박은 과녁**이라 곡선이 움직이면
 *   **빨개지는 것이 옳다**(밸런스 게이트).
 *
 * ⚠ 항등식만 남기면 «그 절이 통째로 사라져도 초록» 이다(LESSONS 522-③). 그래서 파생 옆에는
 *   **그 자리에서만 참인 조항**을 같이 세웠다 — 496 이 규칙으로 못박은 «불멸은 만렙 직전
 *   1레벨 램프»(`unlock === SUM_MAXLV − 1`) · «바닥 두 행은 ×2 하지 않는다»(아래 ⓔ 의 결론).
 *   무르게 풀지 않았음은 **[R] 되돌림 시험 4 항**이 못박는다(옛 값을 도로 넣으면 빨개진다).
 *
 * 묻는 것:
 *   ⓐ 무기로만 100 뽑으면 다른 배너가 따라 오르는가        (공유 축)
 *   ⓑ 살아 있는 곡선이 «식» 인가 · 만렙까지 몇 뽑인가       (곡선 축)
 *   ⓒ 등급 해금 사다리 · 불멸 실효 @만렙                    (제품 역산 · 전 판 공통)
 *   ⓓ 10 상점 소환 카드 5 장의 Lv 알약                      (공유 축)
 *   ⓔ 지시 ③ 의 «나머지 ×2» 를 바닥 행까지 밀면?           (트리 무관 «만약» — 제품 미변경)
 *   R  되돌림 시험 — 옛 값을 도로 넣으면 위 단언이 빨개지는가
 *
 * 실행: node tools/probe496.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  (b ? pass++ : fail++);
  console.log((b ? 'OK  ' : 'BAD ') + name + (detail != null ? ' — ' + detail : ''));
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* ---- 어느 판인가 — 축 둘을 따로 읽는다(774) ---- */
  const T = await p.evaluate(() => ({
    shared: typeof S.sumLv === 'number',              /* 496 공용 스칼라 */
    curve : typeof SUM_EXP_A === 'number',            /* 496 이 세운 «식» 곡선 */
    ver   : typeof SUM_VER === 'number' ? SUM_VER : 0 /* 714 가 붙인 세이브 판 */
  }));
  const SHARED = T.shared, NEW = T.curve;
  const ERA = SHARED ? '496 (공용 레벨 · 식 곡선)'
            : NEW    ? '714 (배너별 레벨 5 벌 · 496 식 곡선)'
                     : '196 이전 (배너별 레벨 5 벌 · 표 곡선)';
  console.log('PROBE496 — 소환 레벨·곡선·사다리 재현 (갈래 키 둘: 공유 축 · 곡선 축)');
  console.log('트리: ' + ERA + '  |  sumLv ' + (SHARED ? '있음' : '없음')
              + ' · SUM_EXP_A ' + (NEW ? '있음' : '없음') + ' · SUM_VER ' + T.ver);
  console.log('');

  /* ---- ⓐ 무기 배너로만 100 뽑 (공유 축) ---- */
  const A = await p.evaluate(() => {
    S.dia = 1e9; S.relic = 1e9;
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    sumAddExp('weapon', 100);
    const snap = {};
    BKEYS.forEach(k => snap[k] = S.sum[k].lv + '/' + S.sum[k].exp);
    /* 뽑기 수는 «소비분 + 잔여» 로 되돌려 센다(100 을 주면 레벨이 오르며 exp 가 깎인다) */
    const pulls = k => { let t = S.sum[k].exp; for (let lv = 1; lv < S.sum[k].lv; lv++) t += sumNeedExp(lv); return t; };
    return { snap, keys: BKEYS.slice(),
             others: BKEYS.filter(k => k !== 'weapon').map(k => pulls(k)),
             wep: pulls('weapon') };
  });
  console.log('[ⓐ] 무기 배너에만 경험치 100 — 다른 배너가 따라 오르는가  (공유 축)');
  ok(A.wep === 100, 'ⓐ1 1 뽑 = 경험치 1 (무기 누적 = 소비분 + 잔여 = 100)', String(A.wep));
  ok(SHARED ? A.others.every(v => v === 100) : A.others.every(v => v === 0),
     SHARED ? 'ⓐ2 ★ 496 판 — 다섯 배너가 «같은 주머니» 라 나머지 넷도 100'
            : 'ⓐ2 ★ 714 판 — 무기 외 4 배너는 0 그대로 = «배너마다 따로» 참',
     A.keys.map(k => k + ' ' + A.snap[k]).join(' · '));

  /* ---- ⓑ 곡선 (곡선 축 · 전부 제품 역산) ---- */
  const B = await p.evaluate(() => {
    const M = SUM_MAXLV;
    const need = [];
    for (let lv = 1; lv < M; lv++) need.push(sumNeedExp(lv));
    const one = need.reduce((a, c) => a + c, 0);
    const o = { maxlv: M, need, one, all: one * BKEYS.length, n: BKEYS.length,
                head: need.slice(0, 3), tail: need.slice(-2),
                mono: need.every((v, i) => i === 0 || v >= need[i - 1]) };
    if (typeof SUM_EXP_A === 'number') {
      o.A = SUM_EXP_A; o.B = SUM_EXP_B;
      /* «식» 인가 — 전 구간에서 A + B·n 과 한 칸도 안 어긋나는가 */
      o.linear = need.every((v, i) => v === SUM_EXP_A + SUM_EXP_B * (i + 1));
      /* 루프 합 ↔ 닫힌식 Σ(A + B·n), n = 1..M−1 */
      o.closed = SUM_EXP_A * (M - 1) + SUM_EXP_B * (M * (M - 1) / 2);
      /* 구 곡선은 «이관 전용» 인가 — 살아 있는 자리에 안 새어 들었는가 */
      o.v196 = { maxlv: SUM_MAXLV_V196, cols: SUM_EXP_TABLE_V196.length,
                 first: sumNeedExpV196(1), liveFirst: sumNeedExp(1) };
    }
    return o;
  });
  console.log('');
  console.log('[ⓑ] 경험치 곡선 — 살아 있는 곡선은 무엇이고 만렙까지 몇 뽑인가  (곡선 축 · 제품 역산)');
  if (NEW) {
    ok(B.linear === true,
       'ⓑ1 ★ 살아 있는 곡선은 «표» 가 아니라 **식** — 전 구간이 A + B·n 과 Δ0 (A=' + B.A + ' · B=' + B.B + ')',
       'Lv1→2 ' + B.head[0].toLocaleString() + ' … Lv' + (B.maxlv - 1) + '→' + B.maxlv
         + ' ' + B.tail[B.tail.length - 1].toLocaleString());
    ok(B.v196.maxlv < B.maxlv && B.v196.cols === 16 && B.v196.first !== B.v196.liveFirst,
       'ⓑ2 ★ 구(196) 곡선은 **이관 전용**으로만 남았다 — 만렙·표가 살아 있는 곡선에 안 샌다',
       '구 만렙 ' + B.v196.maxlv + ' < 산 만렙 ' + B.maxlv
         + ' · 구 표 ' + B.v196.cols + '칸 · Lv1→2 구 ' + B.v196.first + ' ↔ 산 ' + B.v196.liveFirst);
    ok(B.one === B.closed,
       'ⓑ3 ★ 만렙까지 누적 = 닫힌식 A(M−1) + B·M(M−1)/2 (루프 합과 항등)',
       B.one.toLocaleString() + ' 뽑 (닫힌식 ' + B.closed.toLocaleString() + ')');
    ok(Math.abs(B.one - 268000) / 268000 < 0.01,
       'ⓑ4 ★ **199 과녁** 268,000 뽑 ±1% (제품 상수의 거울이 아니라 주인이 밖에서 못박은 과녁)',
       ((B.one - 268000) / 268000 * 100).toFixed(2) + '%');
  } else {
    ok(B.mono === true, 'ⓑ1 (구 판 · 기록) 표 곡선은 단조 비감소',
       B.head.join(',') + ' … ' + B.tail.join(','));
    ok(B.one > 0, 'ⓑ2 (구 판 · 기록) 배너 하나 만렙 = ' + B.one.toLocaleString() + ' 뽑',
       '만렙 ' + B.maxlv);
    ok(B.all === B.one * B.n,
       'ⓑ3 (구 판 · 기록) 배너별이므로 5 배너 전부 = 하나 × ' + B.n, B.all.toLocaleString() + ' 뽑');
    ok(true, 'ⓑ4 (구 판 — 199 과녁 대조는 식 곡선에서만)', '—');
  }

  /* ---- ⓒ 해금 사다리 · 불멸 실효 (전 판 공통 · 전부 제품 역산 — LESSONS 522-①) ---- */
  const C = await p.evaluate(() => {
    const base = GRADE_ROLL.map(g => g.unlock);
    const eq   = GRADE_ROLL_EQ.map(g => g.unlock);
    const last = rollOf('weapon').length - 1;      /* 757 — 그 배너의 최고 등급 행 = 불멸 */
    return {
      base, eq, maxlv: SUM_MAXLV,
      /* 바닥 두 행은 «해금 레벨» 이 아니라 «항상 열려 있다» 는 바닥이다(아래 ⓔ 의 결론) */
      floors: base[0] === 1 && base[1] === 1,
      /* 바닥 위는 순증가 */
      rising: base.slice(2).every((v, i) => v > (i === 0 ? base[1] : base[i + 1])),
      /* 8행 표는 6행 표 + 2행이고 앞 6행이 그대로다 */
      extends: eq.length === base.length + 2 && base.every((v, i) => eq[i] === v),
      transc: eq[eq.length - 2], immo: eq[eq.length - 1],
      /* 496 규칙 — «불멸은 만렙 직전 1레벨 램프» (522-③ 이 요구한 «그 자리에서만 참인 조항») */
      rampRule: eq[eq.length - 1] === SUM_MAXLV - 1,
      immP: (() => { const o = S.sum.weapon.lv; S.sum.weapon.lv = SUM_MAXLV;
                     const q = gradeProbs('weapon')[last]; S.sum.weapon.lv = o; return q; })(),
      immTarget: IMMORTAL_P_MAX,
      over: GRADE_ROLL_EQ.filter(g => g.unlock > SUM_MAXLV).length
    };
  });
  console.log('');
  console.log('[ⓒ] 등급 해금 사다리 — 손 상수 0 · 전부 제품에서 역산');
  ok(C.base.length === 6 && C.floors && C.rising,
     'ⓒ1 ★ 6 행 표 — 바닥 두 행은 `unlock:1`(×2 금지) · 그 위는 순증가',
     C.base.join(','));
  ok(C.extends && C.transc < C.immo && C.rampRule,
     'ⓒ2 ★ 8 행 표 = 6 행 + 초월·불멸 · **불멸 해금 = 만렙 − 1**(496 «만렙 직전 1레벨 램프» 규칙)',
     C.eq.join(',') + '  |  만렙 ' + C.maxlv + ' → 불멸 ' + C.immo);
  ok(C.over === 0, 'ⓒ3 만렙을 넘는 해금 레벨 0 개 — 전 등급 도달 가능', '초과 ' + C.over + ' 행');
  ok(Math.abs(C.immP - C.immTarget) < C.immTarget * 0.05,
     'ⓒ4 ★ 불멸 실효 @만렙 ≈ `IMMORTAL_P_MAX`(115 규약 — 손 상수 대신 제품 목표치 파생)',
     (C.immP * 100).toFixed(4) + '% ↔ 목표 ' + (C.immTarget * 100).toFixed(4) + '%');

  /* ---- ⓓ 10 상점 소환 카드 5 장의 Lv 알약 (공유 축) ---- */
  const D = await p.evaluate(() => {
    const set = { weapon: 12, shield: 8, amulet: 3, skill: 20, pet: 5 };
    Object.keys(set).forEach(k => { S.sum[k].lv = set[k]; S.sum[k].exp = 0; });
    openShopPage();
    renderShopPage();
    const lvs = [...document.querySelectorAll('.shp-card .clv>i')].map(e => e.textContent.trim());
    const bars = [...document.querySelectorAll('.shp-card .cbar>b')].map(e => e.textContent.trim());
    return { lvs, bars, uniq: new Set(lvs).size };
  });
  await p.waitForTimeout(400);
  console.log('');
  console.log('[ⓓ] 10 상점 소환 카드 — 배너별로 12/8/3/20/5 를 «넣어 보고» 렌더  (공유 축)');
  ok(D.lvs.length === 5, 'ⓓ1 카드 5 장', D.lvs.join(' · '));
  ok(D.uniq === (SHARED ? 1 : 5),
     SHARED ? 'ⓓ2 ★ 496 판 — 다섯 장이 «같은 Lv» 1 종으로 접힌다(공용이므로)'
            : 'ⓓ2 ★ 714 판 — 다섯 장이 «서로 다른 Lv» 5 종을 보인다(배너마다 따로)',
     D.lvs.join(' · ') + '  |  ' + D.bars.join(' · '));

  /* ---- ⓔ «전부 ×2» 를 바닥 행(unlock 1)에까지 적용하면? (트리 무관 · 제품 미변경) ---- */
  const E = await p.evaluate(() => {
    const sim = (rows, l, maxlv) => {
      const w = rows.map(g => {
        if (l < g.unlock) return 0;
        const t = Math.max(0, Math.min(1, (l - g.unlock) / Math.max(1, maxlv - g.unlock)));
        return g.p0 + (g.p1 - g.p0) * Math.pow(t, 0.9);
      });
      const tot = w.reduce((a, c) => a + c, 0) || 1;
      return { w, p: w.map(x => x / tot) };
    };
    /* 사다리는 «196 의 것»(1,1,5,8,12,16,20,24)에서 출발해야 «×2 하면?» 이라는 질문이 성립한다.
       ⚠ 774 — 이 여덟 숫자는 «오늘의 제품» 이 아니라 **질문의 전제**(196 시절 표)라 손으로 적는다.
          아래 R2 가 «오늘의 제품 사다리» 로 같은 함정을 다시 밟아 이 결론이 여전히 참임을 못박는다. */
    const rows = [1, 1, 5, 8, 12, 16, 20, 24].map((u, i) => ({
      unlock: u, p0: i < 2 ? [0.80, 0.20][i] : 0, p1: [0.05, 0.15, 0.30, 0.25, 0.15, 0.10, 0.06, 0.001][i]
    }));
    const x2   = rows.map(g => ({ ...g, unlock: g.unlock * 2 }));
    const keep = rows.map(g => ({ ...g, unlock: g.unlock === 1 ? 1 : g.unlock * 2 }));
    return { x2Lv1: sim(x2, 1, 50), keepLv1: sim(keep, 1, 50),
             x2Ladder: x2.map(g => g.unlock).join(','), keepLadder: keep.map(g => g.unlock).join(',') };
  });
  console.log('');
  console.log('[ⓔ] 지시 ③ «나머지 ×2» — 바닥 행(unlock 1)까지 밀면 Lv1 이 어떻게 되나');
  ok(E.x2Lv1.w.every(v => v === 0),
     'ⓔ1 ★ 전부 ×2(' + E.x2Ladder + ') 면 Lv1 에서 전 등급 가중치 0 — 뽑을 등급이 없다',
     'Σw = ' + E.x2Lv1.w.reduce((a, c) => a + c, 0));
  ok(E.x2Lv1.p.every(v => v === 0),
     'ⓔ2 ★ 그 결과 확률이 전부 0 이 된다(`|| 1` 폴백은 분모만 1 로 만든다)',
     'Σp = ' + E.x2Lv1.p.reduce((a, c) => a + c, 0));
  ok(Math.abs(E.keepLv1.p.reduce((a, c) => a + c, 0) - 1) < 1e-9 && E.keepLv1.p[0] > 0,
     'ⓔ3 바닥 두 행을 1 로 두면(' + E.keepLadder + ') Lv1 확률 합 = 1 · 일반 > 0',
     'p0 = ' + E.keepLv1.p[0].toFixed(3) + ' · p1 = ' + E.keepLv1.p[1].toFixed(3));

  /* ---- [R] 되돌림 시험 — 옛 값을 도로 넣으면 위 단언이 빨개지는가 (774 신설) ----
     ⚑ 파생으로 다시 적은 단언이 «무르게 푼 수리» 가 아님을 못박는 자리다. 제품은 0 줄도 안 건드리고
        **같은 술어를 옛 값 위에서** 돌려 빨강을 확인한다(334 의 되돌림 시험 방식). */
  const R = await p.evaluate(() => {
    const M = SUM_MAXLV;
    /* R1 — ⓑ1 의 술어(«전 구간이 A + B·n») 를 **구 표 곡선** 위에서 */
    const needOld = [];
    for (let lv = 1; lv < SUM_MAXLV_V196; lv++) needOld.push(sumNeedExpV196(lv));
    const r1 = needOld.every((v, i) => v === SUM_EXP_A + SUM_EXP_B * (i + 1));
    /* R2 — ⓒ1 의 바닥 술어를 **오늘의 사다리를 전부 ×2 한 것** 위에서 */
    const x2 = GRADE_ROLL.map(g => g.unlock * 2);
    const r2 = x2[0] === 1 && x2[1] === 1;
    /* R3 — ⓒ2 의 «만렙 − 1» 규칙을 **196 시절 손 상수 24** 위에서 */
    const r3 = 24 === M - 1;
    /* R4 — ⓒ2 의 «초월 < 불멸» 을 **두 행을 맞바꾼 표** 위에서 */
    const eq = GRADE_ROLL_EQ.map(g => g.unlock);
    const sw = eq.slice(); const t = sw[sw.length - 1]; sw[sw.length - 1] = sw[sw.length - 2]; sw[sw.length - 2] = t;
    const r4 = sw[sw.length - 2] < sw[sw.length - 1];
    return { r1, r2, r3, r4, x2: x2.join(','), sw: sw.join(','), old: needOld.slice(0, 3).join(','), m: M };
  });
  console.log('');
  console.log('[R] 되돌림 시험 — 옛 값을 도로 넣으면 빨개지는가 (제품 0 줄 · 술어만 재사용)');
  ok(R.r1 === false, 'R1 ★ 구(196) 표 곡선은 ⓑ1 의 «식» 술어를 통과하지 못한다', '구 표 앞 3 칸 ' + R.old);
  ok(R.r2 === false, 'R2 ★ 오늘 사다리를 전부 ×2 하면 ⓒ1 의 바닥 술어가 깨진다', R.x2);
  ok(R.r3 === false, 'R3 ★ 불멸 해금을 손 상수 24 로 적으면 ⓒ2 의 «만렙 − 1» 이 깨진다',
     '24 ≠ ' + (R.m - 1));
  ok(R.r4 === false, 'R4 ★ 초월·불멸 두 행을 맞바꾸면 ⓒ2 의 순서 술어가 깨진다', R.sw);

  ok(errs.length === 0, 'Z1 콘솔 에러 0 건', errs.slice(0, 2).join(' | '));

  console.log('');
  console.log('PROBE496 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})();
