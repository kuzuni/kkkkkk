#!/usr/bin/env node
/* 805 재현기 — «`tools/fnchk115.js` 8번(동료/펫 배너 확률 팝업)이 «불멸=null» 로 빨갛다» 를
 * 고치기 **전에** 제품에게 직접 물어 갈래를 가른다(338 규칙 — 처방 전에 재현).
 *
 *   node tools/probe805.js
 *
 * 묻는 것 — 등재문의 판정(«제품은 옳고 자가 낡았다»)이 사실인가:
 *   [1] `PETS` 의 최고 등급이 정말 초월(g6)인가 — 757 이 «펫 불멸 폐지» 를 데이터로 굳혔는가
 *   [2] `rollOf('pet')` 행 수가 그 최고 등급에서 **파생**되는가(손으로 적힌 8 이 아닌가)
 *   [3] 펫 확률 팝업 MAX 단계에 «불멸» 행이 **0건**인가(= 자가 찾던 문자열이 사라진 이유)
 *   [4] 그 팝업의 최상단 등급 행이 `GRADE[topG('pet')].n` 인가 — 그리고 그 확률은 얼마인가
 *   [5] 그 표시 확률이 **실제 추첨**(`summonOne('pet')` 20만 회)과 일치하는가
 *       — 251 «표시와 추첨이 같은 함수» 가 펫 배너에서도 살아 있는가
 *   [6] 장비 배너의 «만렙 0.10% 램프» 는 그대로인가(805 가 그 축을 지우면 안 된다는 못)
 *   [7] `fnchk115.js:126` 의 `closeSumRes` — 제품에 그런 이름이 있는가, 실제 이름은 무엇인가
 *       (EVGUARD 731 이 «삼켜진 evaluate 예외» 로 신고한 자리)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, got) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + ' — ' + got); b ? pass++ : fail++; };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof gradeProbs === 'function');
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    ['weapon', 'shield', 'amulet', 'pet'].forEach(b => { S.sum[b].lv = SUM_MAXLV; S.sum[b].exp = 0; });
    S.dia = 1e9;
  });

  /* [1][2] 데이터에게 묻는다 */
  const d = await page.evaluate(() => ({
    petTop: topG('pet'), eqTop: topG('equip'),
    petTopName: GRADE[topG('pet')].n, eqTopName: GRADE[topG('equip')].n,
    petRows: rollOf('pet').length, eqRows: rollOf('weapon').length,
    gradeLen: GRADE.length,
    petG7: PETS.filter(x => x.g === 7).length,
    eqG7: EQUIPS.filter(x => x.g === 7).length,
    maxlv: SUM_MAXLV,
  }));
  ok(d.petTop === 6 && d.petTopName === '초월' && d.petG7 === 0,
     '[1] PETS 최고 등급 = 초월(g6) · 불멸(g7) 종 0개',
     'topG(pet)=' + d.petTop + '(' + d.petTopName + ') · g7 종=' + d.petG7);
  ok(d.petRows === d.petTop + 1 && d.eqRows === d.eqTop + 1 && d.petRows !== d.eqRows,
     '[2] rollOf 행 수가 최고 등급에서 파생 — 펫 7행 · 장비 8행',
     'pet=' + d.petRows + '행 (topG+1=' + (d.petTop + 1) + ') · equip=' + d.eqRows + '행');

  /* [3][4] 팝업이 실제로 그리는 것 */
  const p = await page.evaluate(() => {
    openProbInfo('pet', SUM_MAXLV);
    const h = document.getElementById('prbList').innerHTML;
    const heads = [...h.matchAll(/<i>([^(<]+)\(([^)]*)\)<\/i>/g)].map(m => [m[1].trim(), m[2]]);
    const lv = document.getElementById('prbLv').textContent;
    closeProbInfo();
    return { lv, heads, imm: /불멸/.test(h) };
  });
  ok(p.imm === false, '[3] 펫 팝업 MAX 에 «불멸» 행 0건 (자가 찾던 문자열이 사라진 이유)',
     '불멸 문자열=' + p.imm + ' · 단계=' + p.lv);
  ok(p.heads.length > 0 && p.heads[0][0] === d.petTopName,
     '[4] 최상단 등급 행 = GRADE[topG(pet)].n',
     '최상단=' + JSON.stringify(p.heads[0]) + ' · 전체 ' + p.heads.length + '행 ' + JSON.stringify(p.heads));

  /* [5] 표시 ↔ 실제 추첨 */
  const f = await page.evaluate(() => {
    const snap = JSON.stringify(S.own), N = 2e5, g = topG('pet');
    let hit = 0;
    for (let k = 0; k < N; k++) if (summonOne('pet').it.g === g) hit++;
    S.own = JSON.parse(snap);
    return { hit, N, pct: hit / N * 100, shown: gradeProbsAt('pet', SUM_MAXLV)[g] * 100 };
  });
  const rel = Math.abs(f.pct - f.shown) / f.shown;
  ok(rel < 0.10, '[5] 표시 확률 ↔ 실제 추첨 20만 회 (251 «표시와 추첨이 같은 함수»)',
     '표시=' + f.shown.toFixed(4) + '% · 실측=' + f.pct.toFixed(4) + '% (' + f.hit + '/' + f.N + ') · 상대오차=' + (rel * 100).toFixed(2) + '%');

  /* [6] 장비 램프는 그대로 — 805 가 지우면 안 되는 축 */
  const e = await page.evaluate(() => {
    openProbInfo('weapon', SUM_MAXLV);
    const h = document.getElementById('prbList').innerHTML;
    const m = h.match(/불멸 \(([^)]*)\)/);
    closeProbInfo();
    return m ? m[1] : null;
  });
  ok(e === '0.10%', '[6] 장비 배너 «만렙 0.10% 불멸 램프» 는 살아 있다', '무기 MAX 불멸=' + e);

  /* [7] 삼켜진 예외의 실제 이름 */
  const n = await page.evaluate(() => ({
    sumRes: typeof closeSumRes, summonResult: typeof closeSummonResult,
  }));
  ok(n.sumRes === 'undefined' && n.summonResult === 'function',
     '[7] `closeSumRes` 는 제품에 없다 — 실제 이름은 `closeSummonResult`',
     'closeSumRes=' + n.sumRes + ' · closeSummonResult=' + n.summonResult);

  /* ── §R 되돌림 시험 — 고친 8번이 «무르게 푼» 항이 아님을 못박는다 ───────────────────────
     8번의 ③(«표시 확률 = 실제 추첨 빈도»)이 동어반복이 아니라는 것을, **표시 경로만** 망가뜨려
     보고 그 항이 실제로 빨개지는지로 확인한다. 표시는 `gradeProbsAt`, 추첨은 `gradeProbs` 로
     경로가 갈려 있으므로 한쪽만 비틀 수 있다(251 이 «같은 함수» 라고 부른 것은 **공식**이다).
     [R1] 표시 경로를 비틀면 ③ 이 빨개진다 — 안 빨개지면 ③ 은 자기 자신에게 되묻는 항이다.
     [R2] 원복하면 다시 초록 — 비튼 것이 원인이었음을 못박는다. */
  const r = await page.evaluate(() => {
    const orig = gradeProbsAt, g = topG('pet'), N = 5e4;
    const draw = () => { let h = 0; for (let k = 0; k < N; k++) if (summonOne('pet').it.g === g) h++; return h / N * 100; };
    const snap = JSON.stringify(S.own);
    /* 표시 경로만 비튼다: 최고 등급 몫을 두 배로 부풀린 뒤 재정규화 */
    gradeProbsAt = (b, L) => { const p = orig(b, L).slice(); p[g] *= 2; const t = p.reduce((a, c) => a + c, 0); return p.map(x => x / t); };
    const bentShown = gradeProbsAt('pet', SUM_MAXLV)[g] * 100, bentDraw = draw();
    gradeProbsAt = orig;
    const okShown = gradeProbsAt('pet', SUM_MAXLV)[g] * 100, okDraw = draw();
    S.own = JSON.parse(snap);
    const rel = (a, b2) => Math.abs(a - b2) / (a || 1);
    return { bent: rel(bentShown, bentDraw), good: rel(okShown, okDraw),
             bentShown, bentDraw, okShown, okDraw };
  });
  ok(r.bent >= 0.10, '[R1] 표시 경로를 비틀면 8번 ③ 이 빨개진다 (동어반복 아님)',
     '표시=' + r.bentShown.toFixed(4) + '% ↔ 추첨=' + r.bentDraw.toFixed(4) + '% · 상대오차=' + (r.bent * 100).toFixed(2) + '% (문턱 10%)');
  ok(r.good < 0.10, '[R2] 원복하면 다시 초록',
     '표시=' + r.okShown.toFixed(4) + '% ↔ 추첨=' + r.okDraw.toFixed(4) + '% · 상대오차=' + (r.good * 100).toFixed(2) + '%');

  await browser.close();
  console.log('\nPROBE805 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
