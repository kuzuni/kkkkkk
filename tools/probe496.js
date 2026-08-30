/* 작업 496 재현 — 소환 레벨이 «배너마다 따로» 인지, 그리고 개편이 무엇을 바꾸는지를
 * **수리 전 트리에서 먼저 찍는다**(338 규칙 — 등재문의 처방을 따르기 전에 재현부터).
 *
 * 등재문의 «현행 실측» 세 줄을 그대로 판정한다:
 *   ⓐ 소환 레벨·경험치가 배너마다 따로다 — `S.sum[b].lv/.exp`
 *      ⇒ 무기 배너로만 100 회 뽑으면 무기만 오르고 나머지 넷은 Lv1 그대로여야 «참» 이다.
 *   ⓑ 1 뽑 = 경험치 1 · 만렙 25 · 표 16 칸(그 뒤 5,000 고정) ⇒ 배너 하나 만렙 76,450 뽑
 *   ⓒ 등급 해금 사다리 1/1/5/8/12/16 (+ 초월 20 · 불멸 24)
 *
 * 그리고 개편이 «어디를 밟는지» 를 같은 실행에서 같이 잰다(처방을 고르는 근거):
 *   ⓓ 10 상점 소환 카드 5 장의 «Lv.n» 알약 — 지금은 배너마다 **다른 값**이 찍힌다
 *      (공용 레벨이 되면 다섯 장이 같은 값을 보인다 = 지시 ⑤ 가 말하는 자리)
 *   ⓔ ★ 해금 사다리를 «전부 ×2» 하면 어떻게 되는가 — `unlock:1` 두 행까지 2 로 밀면
 *      Lv1 에서 전 등급 가중치가 0 이 된다. 그때 `gradeProbs` 가 무엇을 돌려주는지,
 *      실제로 뽑으면 어떤 등급이 나오는지를 **찍어서** 확인한다(지시 ③ 의 «나머지 ×2»
 *      를 바닥 행에까지 적용하면 안 되는 이유가 추측이 아니라 실측이어야 한다).
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

  console.log('PROBE496 — 소환 레벨 «배너별 → 공용» 개편 재현');
  console.log('');

  /* ---- ⓐ 배너별 독립: 무기로만 뽑으면 무기만 오른다 ---- */
  const A = await p.evaluate(() => {
    S.dia = 1e9; S.relic = 1e9;
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    sumAddExp('weapon', 100);
    const snap = {};
    BKEYS.forEach(k => snap[k] = S.sum[k].lv + '/' + S.sum[k].exp);
    /* ⚠ 100 을 주면 Lv1→2 (need 50) 를 지나 «2/50» 이 된다 — 뽑기 수는 «소비분 + 잔여» 로 되돌려 센다 */
    let tot = S.sum.weapon.exp;
    for (let lv = 1; lv < S.sum.weapon.lv; lv++) tot += sumNeedExp(lv);
    return { snap, keys: BKEYS.slice(), maxlv: SUM_MAXLV,
             indep: BKEYS.filter(k => k !== 'weapon').every(k => S.sum[k].lv === 1 && S.sum[k].exp === 0),
             wep: tot };
  });
  console.log('[ⓐ] 배너별 독립 — 무기 배너에만 경험치 100');
  ok(A.indep, 'ⓐ1 ★ 무기 외 4 배너는 Lv1/exp0 그대로 = «배너마다 따로» 참',
     A.keys.map(k => k + ' ' + A.snap[k]).join(' · '));
  ok(A.wep === 100, 'ⓐ2 1 뽑 = 경험치 1 (무기 누적 = 소비분 + 잔여 = 100)', String(A.wep));

  /* ---- ⓑ 현행 곡선: 배너 하나 만렙까지 몇 뽑인가 ---- */
  const B = await p.evaluate(() => {
    const need = [];
    for (let lv = 1; lv < SUM_MAXLV; lv++) need.push(sumNeedExp(lv));
    const one = need.reduce((a, c) => a + c, 0);
    return { maxlv: SUM_MAXLV, tbl: SUM_EXP_TABLE.slice(), need, one, all: one * BKEYS.length,
             nBanner: BKEYS.length };
  });
  console.log('');
  console.log('[ⓑ] 현행 경험치 곡선');
  ok(B.maxlv === 25, 'ⓑ1 SUM_MAXLV = 25', String(B.maxlv));
  ok(B.tbl.length === 16, 'ⓑ2 표 16 칸(그 뒤 마지막 값 고정)', B.tbl.join(','));
  ok(B.one === 76450, 'ⓑ3 배너 하나 만렙 = 76,450 뽑', B.one.toLocaleString());
  ok(B.all === 382250, 'ⓑ4 ★ 5 배너 전부 만렙 = ' + B.all.toLocaleString() + ' 뽑(공용 하나가 되면 이 값이 사라진다)',
     B.all.toLocaleString());

  /* ---- ⓒ 해금 사다리 ---- */
  const C = await p.evaluate(() => ({
    base: GRADE_ROLL.map(g => g.unlock),
    eq: GRADE_ROLL_EQ.map(g => g.unlock),
    immP: (() => { const o = S.sum.weapon.lv; S.sum.weapon.lv = SUM_MAXLV;
                   const p = gradeProbs('weapon')[7]; S.sum.weapon.lv = o; return p; })()
  }));
  console.log('');
  console.log('[ⓒ] 등급 해금 사다리');
  ok(C.base.join(',') === '1,1,5,8,12,16', 'ⓒ1 6 행 표 = 1/1/5/8/12/16', C.base.join(','));
  ok(C.eq.join(',') === '1,1,5,8,12,16,20,24', 'ⓒ2 8 행 표 = +초월 20 · 불멸 24', C.eq.join(','));
  ok(Math.abs(C.immP - 0.001) < 5e-5, 'ⓒ3 불멸 실효 @만렙 ≈ 0.1%(115 규약 — 개편 뒤에도 같아야 한다)',
     (C.immP * 100).toFixed(4) + '%');

  /* ---- ⓓ 10 상점 소환 카드 5 장의 Lv 알약 — 지금은 «제각각» ---- */
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
  console.log('[ⓓ] 10 상점 소환 카드 — 배너별 레벨을 12/8/3/20/5 로 두고 렌더');
  ok(D.lvs.length === 5, 'ⓓ1 카드 5 장', D.lvs.join(' · '));
  ok(D.uniq === 5, 'ⓓ2 ★ 지금은 다섯 장이 «서로 다른 Lv» 를 보인다(공용화 뒤엔 1 종이 된다)',
     D.lvs.join(' · ') + '  |  ' + D.bars.join(' · '));

  /* ---- ⓔ «전부 ×2» 를 바닥 행(unlock 1)에까지 적용하면? ---- */
  const E = await p.evaluate(() => {
    /* 제품을 건드리지 않고 «만약» 만 계산한다 — gradeProbs 와 같은 식을 그대로 옮겨 쓴다 */
    const sim = (rows, l, maxlv) => {
      const w = rows.map(g => {
        if (l < g.unlock) return 0;
        const t = Math.max(0, Math.min(1, (l - g.unlock) / Math.max(1, maxlv - g.unlock)));
        return g.p0 + (g.p1 - g.p0) * Math.pow(t, 0.9);
      });
      const tot = w.reduce((a, c) => a + c, 0) || 1;
      return { w, tot, p: w.map(x => x / tot) };
    };
    const rows = GRADE_ROLL_EQ.map(g => ({ unlock: g.unlock, p0: g.p0, p1: g.p1 }));
    const x2   = rows.map(g => ({ ...g, unlock: g.unlock * 2 }));
    const keep = rows.map(g => ({ ...g, unlock: g.unlock === 1 ? 1 : g.unlock * 2 }));
    return {
      x2Lv1:   sim(x2,   1, 50),
      keepLv1: sim(keep, 1, 50),
      x2Ladder: x2.map(g => g.unlock).join(','),
      keepLadder: keep.map(g => g.unlock).join(',')
    };
  });
  console.log('');
  console.log('[ⓔ] 지시 ③ «나머지 ×2» — 바닥 행(unlock 1)까지 밀면 Lv1 이 어떻게 되나');
  ok(E.x2Lv1.w.every(v => v === 0),
     'ⓔ1 ★ 전부 ×2(' + E.x2Ladder + ') 면 Lv1 에서 전 등급 가중치 0 — 뽑을 등급이 없다',
     'Σw = ' + E.x2Lv1.w.reduce((a, c) => a + c, 0));
  ok(E.x2Lv1.p.every(v => v === 0),
     'ⓔ2 ★ 그 결과 확률이 전부 0 이 된다(`|| 1` 폴백이 합을 1 로 만들지만 분자가 0)',
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
