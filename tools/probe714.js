/* 작업 714 재현 — «소환 레벨·경험치가 배너 공유인가» 를 **먼저 찍는다**(338 규칙 · 주인 지시
 * 원문의 «사실이면 분리» 가 조건문이라 재현이 곧 착수 근거다).
 *
 * ⚑ 이 자는 **수리 전·후 두 트리에서 다 돈다**(455·probe496 방식). 트리는 스스로 가른다:
 *     `typeof S.sumLv === 'number'`  → 496 트리(공용 스칼라 둘) = **수리 전**
 *     `S.sum.weapon` 이 실제 칸       → 714 트리(배너 독립 다섯 벌) = **수리 후**
 *   그리고 `P714_SRC` 에 «수리 전» index.html 경로를 주면 그 트리로 겨눈다
 *   (`git show <sha>:index.html > /tmp/pre.html` — 738 의 `P738_SRC` 선례).
 *
 * 묻는 것과 두 트리의 답:
 *                                          수리 전(496 공용)        수리 후(714 배너별)
 *   ⓐ 무기로만 100 뽑으면?                 다섯이 같이 100          무기만 100 · 나머지 0
 *   ⓑ 10 상점 카드 5 장의 Lv 알약           같은 값 1 종             넣은 값 그대로 5 종
 *   ⓒ 한 배너를 만렙으로 올리면              다섯 다 만렙 확률표      그 배너만. 나머지는 Lv1 표
 *   ⓓ 세이브에 담기는 자리                  `sumLv`·`sumExp` 스칼라  `sum` 다섯 벌 + `sumVer`
 *   ⓔ «전 배너 만렙» 총 뽑기 수             267,050(계정 하나)       1,335,250(배너 ×5)
 *
 * ⓔ 는 199 통지용 수치다 — 트리와 무관하게 곡선에서 센다(제품은 안 건드린다).
 *
 * 실행: node tools/probe714.js  ·  P714_SRC=/tmp/pre.html node tools/probe714.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + (process.env.P714_SRC
  ? path.resolve(process.env.P714_SRC).replace(/\\/g, '/')
  : path.resolve(__dirname, '../index.html'));

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  (b ? pass++ : fail++);
  console.log((b ? 'OK  ' : 'BAD ') + name + (detail != null ? ' — ' + detail : ''));
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  const SHARED = await p.evaluate(() => typeof S.sumLv === 'number');
  console.log('PROBE714 — 소환 레벨 «공용 하나 → 배너 독립 다섯» 재현');
  console.log('트리: ' + (SHARED ? '수리 전 (496 공용 스칼라 둘)' : '수리 후 (714 배너 독립)')
              + (process.env.P714_SRC ? '  ← P714_SRC' : ''));
  console.log('');

  /* ---- ⓐ 무기 배너에만 100 뽑 ---- */
  console.log('[ⓐ] 무기 배너에만 경험치 100 — 나머지 넷이 따라 오르는가');
  const A = await p.evaluate(() => {
    BKEYS.forEach(k => { if (S.sum[k]) { S.sum[k].lv = 1; S.sum[k].exp = 0; } });
    if (typeof S.sumLv === 'number') { S.sumLv = 1; S.sumExp = 0; }
    sumAddExp('weapon', 100);
    return { snap: BKEYS.map(k => k + ' ' + sumLv(k) + '/' + sumExp(k)), w: sumExp('weapon') };
  });
  ok(A.w === 100, 'ⓐ1 무기 배너는 100 이 들어갔다', String(A.w));
  const kinds = new Set(A.snap.map(s => s.split(' ')[1])).size;
  ok(SHARED ? kinds === 1 : kinds === 2,
    'ⓐ2 ★ ' + (SHARED ? '다섯이 «같은 주머니» — 나머지 넷도 100(= 주인 보고의 «같이 뭉쳐놓은 느낌»)'
                      : '무기만 100 · 나머지 넷은 0 — 배너 독립'),
    A.snap.join(' · '));

  /* ---- ⓑ 10 상점 소환 카드 ---- */
  console.log('');
  console.log('[ⓑ] 10 상점 소환 카드 — 배너마다 12/8/3/20/5 를 넣고 렌더');
  const WANT = { skill: 20, weapon: 12, shield: 8, amulet: 3, pet: 5 };
  const B = await p.evaluate(want => {
    S.dia = 2e6;
    BKEYS.forEach(k => { if (S.sum[k]) { S.sum[k].lv = want[k]; S.sum[k].exp = 0; } });
    if (typeof S.sumLv === 'number') { BKEYS.forEach(k => { S.sumLv = want[k]; S.sumExp = 0; }); }
    openShopPage(null, 'sum'); renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    return { n: cards.length,
             lv: cards.map(c => c.querySelector('.clv>i').textContent.trim()),
             bar: cards.map(c => c.querySelector('.cbar>b').textContent.trim()) };
  }, WANT);
  ok(B.n === 5, 'ⓑ1 소환 카드 5 장', String(B.n));
  const lvKinds = new Set(B.lv).size;
  ok(SHARED ? lvKinds === 1 : lvKinds === 5,
    'ⓑ2 ★ ' + (SHARED ? '다섯 장이 «같은 Lv» 1 종 — 마지막에 쓴 값 하나로 접힌다'
                      : '다섯 장이 넣은 값 그대로 5 종'),
    B.lv.join(' · '));

  /* ---- ⓒ 한 배너만 만렙 — 확률표가 배너를 따라가는가 ---- */
  console.log('');
  console.log('[ⓒ] 무기만 만렙 — 다른 배너의 확률표가 같이 오르는가');
  const C = await p.evaluate(() => {
    BKEYS.forEach(k => { if (S.sum[k]) { S.sum[k].lv = 1; S.sum[k].exp = 0; } });
    if (typeof S.sumLv === 'number') { S.sumLv = 1; S.sumExp = 0; }
    if (S.sum.weapon) S.sum.weapon.lv = SUM_MAXLV;
    if (typeof S.sumLv === 'number') S.sumLv = SUM_MAXLV;
    const top = b => gradeProbs(b)[7] || 0;             /* 8 행 표의 불멸 칸 */
    return { w: top('weapon'), s: top('shield'), lvW: sumLv('weapon'), lvS: sumLv('shield') };
  });
  ok(C.w > 0, 'ⓒ1 무기 배너는 만렙 확률표 — 불멸 칸 > 0', (C.w * 100).toFixed(4) + '%');
  ok(SHARED ? C.s === C.w : C.s < C.w,
    'ⓒ2 ★ ' + (SHARED ? '방패 배너도 «같이» 만렙 확률 — 한 번도 안 뽑은 배너가 만렙표를 쓴다'
                      : '방패 배너는 Lv' + C.lvS + ' 확률표 그대로 — 오염 0'),
    '무기 ' + (C.w * 100).toFixed(4) + '% · 방패 ' + (C.s * 100).toFixed(4) + '%');

  /* ---- ⓓ 세이브에 담기는 자리 ---- */
  console.log('');
  console.log('[ⓓ] 세이브 모양');
  const D = await p.evaluate(() => JSON.stringify(S));
  const hasScalar = /"sumLv":/.test(D) && /"sumExp":/.test(D);
  const hasCells  = /"sum":\{/.test(D);
  const hasVer    = /"sumVer":/.test(D);
  ok(SHARED ? (hasScalar && !hasCells) : (hasCells && hasVer && !hasScalar),
    'ⓓ1 ★ ' + (SHARED ? '스칼라 둘만 담긴다(`sum` 키 부재)' : '`sum` 다섯 벌 + `sumVer` — 스칼라 둘 부재'),
    'sumLv/sumExp ' + hasScalar + ' · sum ' + hasCells + ' · sumVer ' + hasVer);

  /* ---- ⓔ 199 통지용 수치 — 곡선에서만 센다 ---- */
  console.log('');
  console.log('[ⓔ] 199 통지 — «만렙까지» 뽑기 수가 배너 독립으로 몇 배가 되는가');
  const E = await p.evaluate(() => {
    let one = 0; for (let n = 1; n < SUM_MAXLV; n++) one += sumNeedExp(n);
    let imm = 0; const U = GRADE_ROLL_EQ[7].unlock;
    for (let n = 1; n < U; n++) imm += sumNeedExp(n);
    return { one, imm, n: BKEYS.length, unlock: U };
  });
  ok(E.one === 267050, 'ⓔ1 배너 하나 만렙 = 267,050 뽑(496 곡선 그대로)', E.one.toLocaleString());
  ok(E.one * E.n === 1335250,
    'ⓔ2 ★ 다섯 배너 전부 만렙 = ' + (E.one * E.n).toLocaleString() + ' 뽑 = ×' + E.n + ' (199 통지)',
    (E.one * E.n).toLocaleString() + ' 뽑 · ' + (E.one * E.n * 100).toLocaleString() + ' 다이아');
  ok(E.imm > 0,
    'ⓔ3 ★ 불멸 해금(Lv' + E.unlock + ') 까지 = 배너당 ' + E.imm.toLocaleString()
      + ' 뽑 · 다섯이면 ' + (E.imm * E.n).toLocaleString() + ' 뽑 (199 «한 벌» 축)',
    E.imm.toLocaleString() + ' × ' + E.n);

  console.log('');
  ok(errs.length === 0, 'Z1 콘솔 에러 0 건', errs.slice(0, 3).join(' | '));
  console.log('');
  console.log('PROBE714 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
