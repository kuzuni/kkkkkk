/* 작업 496 재현 — 소환 레벨이 «배너마다 따로» 인지, 그리고 개편이 무엇을 바꾸는지를
 * **수리 전 트리에서 먼저 찍는다**(338 규칙 — 등재문의 처방을 따르기 전에 재현부터).
 *
 * ⚑ 이 자는 **수리 전·후 둘 다에서 돈다**(455 방식). 트리를 `S.sumLv` 유무로 스스로 갈라
 *   같은 질문에 대한 답을 각각 단언한다 — 그래야 «수리 뒤에 못 도는 재현기» 가 안 된다.
 *
 * 묻는 것과, 두 트리의 답:
 *                                        수리 전(배너별)          수리 후(496 공용)
 *   ⓐ 무기로만 100 뽑으면?               무기만 오른다             다섯이 같이 오른다
 *   ⓑ 만렙 · 만렙까지 뽑기 수            25 · 배너당 76,450        50 · 계정당 267,050
 *                                        (5 배너 전부 = 382,250)   (한 주머니)
 *   ⓒ 등급 해금 사다리                   1/1/5/8/12/16 +20/24      1/1/10/16/24/32 +40/49
 *      불멸 실효 @만렙                    0.100%                    0.100% (115 규약 — 불변)
 *   ⓓ 10 상점 소환 카드 5 장의 Lv 알약    서로 다른 값 5 종         같은 값 1 종
 *
 * ⓔ 는 트리와 무관한 «만약» 계산이다 — 지시 ③ 의 «나머지 ×2» 를 바닥 행(`unlock:1`)에까지
 *    적용하면 Lv1 에서 전 등급 가중치가 0 이 되어 **뽑을 등급이 없는 레벨**이 생긴다는 것을
 *    `gradeProbs` 와 같은 식으로 찍는다(제품은 안 건드린다). 바닥을 1 로 둔 안과 나란히 본다.
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

  /* 어느 트리인가 — 496 이 들어간 트리에는 공용 스칼라 `S.sumLv` 가 있다 */
  const SHARED = await p.evaluate(() => typeof S.sumLv === 'number');
  console.log('PROBE496 — 소환 레벨 «배너별 → 공용» 개편 재현');
  console.log('트리: ' + (SHARED ? '수리 후 (496 공용 레벨)' : '수리 전 (배너별 레벨 5 벌)'));
  console.log('');

  /* ---- ⓐ 무기 배너로만 100 뽑 ---- */
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
  console.log('[ⓐ] 무기 배너에만 경험치 100 — 다른 배너가 따라 오르는가');
  ok(A.wep === 100, 'ⓐ1 1 뽑 = 경험치 1 (무기 누적 = 소비분 + 잔여 = 100)', String(A.wep));
  ok(SHARED ? A.others.every(v => v === 100) : A.others.every(v => v === 0),
     SHARED ? 'ⓐ2 ★ 다섯 배너가 «같은 주머니» — 나머지 넷도 100'
            : 'ⓐ2 ★ 무기 외 4 배너는 0 그대로 = «배너마다 따로» 참',
     A.keys.map(k => k + ' ' + A.snap[k]).join(' · '));

  /* ---- ⓑ 만렙 곡선 ---- */
  const B = await p.evaluate(() => {
    const need = [];
    for (let lv = 1; lv < SUM_MAXLV; lv++) need.push(sumNeedExp(lv));
    const one = need.reduce((a, c) => a + c, 0);
    return { maxlv: SUM_MAXLV, need, one, all: one * BKEYS.length, n: BKEYS.length,
             head: need.slice(0, 3), tail: need.slice(-2) };
  });
  console.log('');
  console.log('[ⓑ] 경험치 곡선 — 만렙까지 몇 뽑인가');
  ok(B.maxlv === (SHARED ? 50 : 25), 'ⓑ1 SUM_MAXLV = ' + (SHARED ? 50 : 25), String(B.maxlv));
  if (SHARED) {
    ok(B.need[0] === 410 && B.need[B.need.length - 1] === 10490,
       'ⓑ2 need(n) = 200 + 210·n — Lv1→2 410 · Lv49→50 10,490',
       B.head.join(',') + ' … ' + B.tail.join(','));
    ok(B.one === 267050, 'ⓑ3 ★ 계정 하나 만렙 = 267,050 뽑 (주인 목표 268,000 의 −0.35%)',
       B.one.toLocaleString());
    ok(Math.abs(B.one - 268000) / 268000 < 0.01, 'ⓑ4 목표 268,000 ±1% 안',
       ((B.one - 268000) / 268000 * 100).toFixed(2) + '%');
  } else {
    ok(B.one === 76450, 'ⓑ2 배너 하나 만렙 = 76,450 뽑', B.one.toLocaleString());
    ok(B.all === 382250, 'ⓑ3 ★ 5 배너 전부 만렙 = 382,250 뽑(공용 하나가 되면 이 값이 사라진다)',
       B.all.toLocaleString());
    ok(true, 'ⓑ4 (수리 전 트리 — 목표 대조는 수리 후에만)', '—');
  }

  /* ---- ⓒ 해금 사다리 · 불멸 실효(115 규약) ---- */
  const C = await p.evaluate(() => ({
    base: GRADE_ROLL.map(g => g.unlock),
    eq: GRADE_ROLL_EQ.map(g => g.unlock),
    immP: (() => { const o = S.sum.weapon.lv; S.sum.weapon.lv = SUM_MAXLV;
                   const p = gradeProbs('weapon')[7]; S.sum.weapon.lv = o; return p; })(),
    over: GRADE_ROLL_EQ.filter(g => g.unlock > SUM_MAXLV).length
  }));
  const LAD = SHARED ? '1,1,10,16,24,32' : '1,1,5,8,12,16';
  const LADE = SHARED ? LAD + ',40,49' : LAD + ',20,24';
  console.log('');
  console.log('[ⓒ] 등급 해금 사다리');
  ok(C.base.join(',') === LAD, 'ⓒ1 6 행 표 = ' + LAD, C.base.join(','));
  ok(C.eq.join(',') === LADE, 'ⓒ2 8 행 표 = ' + LADE, C.eq.join(','));
  ok(C.over === 0, 'ⓒ3 만렙을 넘는 해금 레벨 0 개 — 전 등급 도달 가능', '초과 ' + C.over + ' 행');
  ok(Math.abs(C.immP - 0.001) < 5e-5,
     'ⓒ4 ★ 불멸 실효 @만렙 ≈ 0.1%(115 규약 — 개편 전후로 같아야 한다)',
     (C.immP * 100).toFixed(4) + '%');

  /* ---- ⓓ 10 상점 소환 카드 5 장의 Lv 알약 ---- */
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
  console.log('[ⓓ] 10 상점 소환 카드 — 배너별로 12/8/3/20/5 를 «넣어 보고» 렌더');
  ok(D.lvs.length === 5, 'ⓓ1 카드 5 장', D.lvs.join(' · '));
  ok(D.uniq === (SHARED ? 1 : 5),
     SHARED ? 'ⓓ2 ★ 다섯 장이 «같은 Lv» 1 종 — 마지막에 쓴 값 하나로 접힌다(공용이므로)'
            : 'ⓓ2 ★ 지금은 다섯 장이 «서로 다른 Lv» 를 보인다(공용화 뒤엔 1 종이 된다)',
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
    /* 사다리는 «196 의 것»(1,1,5,8,12,16,20,24)에서 출발해야 «×2 하면?» 이라는 질문이 성립한다 */
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

  ok(errs.length === 0, 'Z1 콘솔 에러 0 건', errs.slice(0, 2).join(' | '));

  console.log('');
  console.log('PROBE496 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  await b.close();
  process.exit(fail === 0 ? 0 : 1);
})();
