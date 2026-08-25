#!/usr/bin/env node
/* 85 검증 — 장비 8등급 체계(마지막 등급 1종 · 그 외 등급당 5종 = 부위당 36, 총 108)
 *
 *   node tools/verify85.js
 *
 * 검사 항목:
 *   [A] 데이터 — EQUIPS 108종 · 부위별 등급 분포 [5,5,5,5,5,5,5,1] · id 유일 · 구 54종 id 전부 보존
 *   [B] 등급 상수 — GRADE 8단(초월·불멸) · REFUND/SUM_CARD/WGRADE/BAG_G 8행 · GRADE_ROLL_EQ 8행(55/75 해금)
 *   [C] 최고 등급 판정 — topG: 장비 g7 만 top, g6 은 아님 · «신화 스킬 = MAX» 유지(비장비는 5 가 top)
 *   [D] 확률 — 장비 배너 Lv100 에서 g6·g7 > 0, 합 = 1 · 스킬 배너는 g6·g7 = 0 (6행 표 유지)
 *   [E] 소환 시뮬 — 무기 10연 ×300 (Lv100) 에서 8등급(g7) 실제 등장 + 아이템 undefined 0건
 *   [F] 합성 — weapon5(Lv100+5개) → g6 5종 중 하나 · weapon6 → 'weapon7' 고정 · weapon7 은 canCraft false
 *   [G] 11 확률 팝업 — 무기 MAX 단계에 «초월·불멸» 행 · 스킬 팝업엔 없음 · NaN/undefined 0건
 *   [H] 05 팝업 — wpnPages()=2 · 2페이지에 초월·불멸 행 렌더 · NaN/undefined 0건
 *   [I] 도감 — COLL.equip.tiers 마지막 need === 108(전 종 수집)
 *   [J] 구 세이브 호환 — weapon5 lv120(옛 무한강화) 이 로드돼도 판정 함수들이 안 깨진다
 *   [K] 콘솔 에러 0건
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof EQUIPS !== 'undefined' && typeof renderUI === 'function');
  await page.waitForTimeout(800);

  /* [A] 데이터 */
  const A = await page.evaluate(() => {
    const bySlot = {};
    SLOTS.forEach(s => { bySlot[s.k] = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s.k && e.g === g).length); });
    const ids = EQUIPS.map(e => e.id);
    const oldCnt = [4, 4, 3, 3, 2, 2];               /* 75 시절 등급별 종수 — 이 id 들이 전부 남아 있어야 구 세이브가 산다 */
    const oldIds = [];
    SLOTS.forEach(s => oldCnt.forEach((n, g) => { for (let j = 0; j < n; j++) oldIds.push(s.k + g + (j ? '_' + j : '')); }));
    return {
      total: EQUIPS.length, bySlot,
      uniq: new Set(ids).size === ids.length,
      oldKept: oldIds.filter(id => !EQ[id]).length,
      vBad: EQUIPS.filter(e => !(e.v >= 0.90 && e.v <= 1.15)).length
    };
  });
  ok(A.total === 108, 'A1 EQUIPS.length === 108', String(A.total));
  const want = JSON.stringify([5, 5, 5, 5, 5, 5, 5, 1]);
  ok(Object.values(A.bySlot).every(d => JSON.stringify(d) === want), 'A2 부위별 등급 분포 [5,5,5,5,5,5,5,1]', JSON.stringify(A.bySlot));
  ok(A.uniq, 'A3 id 전부 유일');
  ok(A.oldKept === 0, 'A4 구 54종 id 전부 보존', '누락 ' + A.oldKept);
  ok(A.vBad === 0, 'A5 v 전부 0.90~1.15', '위반 ' + A.vBad);

  /* [B] 등급 상수 */
  const B = await page.evaluate(() => ({
    gl: GRADE.length, g6: GRADE[6].n, g7: GRADE[7].n, m6: GRADE[6].mul, m7: GRADE[7].mul,
    refund: REFUND.length, sumCard: SUM_CARD.length, wg: WGRADE.length, bag: BAG_G.length,
    rollEq: GRADE_ROLL_EQ.length, u6: GRADE_ROLL_EQ[6].unlock, u7: GRADE_ROLL_EQ[7].unlock,
    roll: GRADE_ROLL.length, steps: PRB_STEPS_EQ.join(',')
  }));
  ok(B.gl === 8 && B.g6 === '초월' && B.g7 === '불멸', 'B1 GRADE 8단 (초월·불멸)', B.g6 + '/' + B.g7);
  ok(B.m6 === 16 && B.m7 === 26, 'B2 mul 16·26 기하급수', B.m6 + '/' + B.m7);
  ok(B.refund === 8 && B.sumCard === 8 && B.wg === 8 && B.bag === 8, 'B3 REFUND·SUM_CARD·WGRADE·BAG_G 8행',
    [B.refund, B.sumCard, B.wg, B.bag].join('/'));
  ok(B.rollEq === 8 && B.roll === 6 && B.u6 === 55 && B.u7 === 75, 'B4 장비 8행 표(55/75) · 공용 6행 유지',
    'eq=' + B.rollEq + ' base=' + B.roll + ' unlock=' + B.u6 + '/' + B.u7);
  ok(B.steps === '1,5,15,30,40,55,75,100', 'B5 PRB_STEPS_EQ 이정표', B.steps);

  /* [C] 최고 등급 판정 */
  const C = await page.evaluate(() => ({
    e7: isTopGrade(EQ.weapon7), e6: isTopGrade(EQ.weapon6), s5: isTopGrade(SK.holy),
    p5: isTopGrade(PT.drag2), r5: isTopGrade(RL.rl8),
    lvInf: maxLv(EQ.weapon7) === Infinity, lv6: maxLv(EQ.weapon6) === MAX_LEVEL, lvS: maxLv(SK.holy) === MAX_LEVEL
  }));
  ok(C.e7 && !C.e6, 'C1 장비 top = g7 (g6 은 아님)');
  ok(C.s5 && C.p5 && C.r5, 'C2 비장비(스킬·펫·유물)는 신화(g5)가 top — «신화 = MAX» 유지');
  ok(C.lvInf && C.lv6 && C.lvS, 'C3 무한 강화는 불멸 장비만 (g6 장비·신화 스킬은 Lv100 상한)');

  /* [D] 확률 */
  const D = await page.evaluate(() => {
    S.sum.weapon.lv = 100; S.sum.skill.lv = 100;
    const pw = gradeProbs('weapon'), ps = gradeProbs('skill');
    const sum = a => a.reduce((x, y) => x + y, 0);
    return { lw: pw.length, ls: ps.length, w6: pw[6], w7: pw[7], s6: ps[6], s7: ps[7],
             sw: sum(pw), ss: sum(ps), nan: pw.concat(ps).some(x => !isFinite(x)) };
  });
  ok(D.lw === 8 && D.ls === 8, 'D1 확률 배열 GRADE.length 로 패딩', D.lw + '/' + D.ls);
  ok(D.w6 > 0 && D.w7 > 0, 'D2 장비 Lv100 에서 초월·불멸 확률 > 0', D.w6.toFixed(4) + '/' + D.w7.toFixed(4));
  ok(D.s6 === 0 && D.s7 === 0, 'D3 스킬 배너는 초월·불멸 0 (6행 표 유지)');
  ok(Math.abs(D.sw - 1) < 1e-9 && Math.abs(D.ss - 1) < 1e-9 && !D.nan, 'D4 확률 합 1 · NaN 없음');

  /* [E] 소환 시뮬 — 무기 10연 ×300, Lv100 */
  const E = await page.evaluate(() => {
    S.sum.weapon.lv = 100;
    const got = {}; let bad = 0;
    for (let i = 0; i < 3000; i++) {
      const r = summonOne('weapon');
      if (!r || !r.it || !EQ[r.it.id]) { bad++; continue; }
      got[r.it.g] = (got[r.it.g] || 0) + 1;
    }
    return { got, bad };
  });
  ok(E.bad === 0, 'E1 3,000연 아이템 전부 유효', '불량 ' + E.bad);
  ok((E.got[7] || 0) > 0, 'E2 8등급(불멸) 실제 등장', JSON.stringify(E.got));
  ok((E.got[6] || 0) > 0, 'E3 7등급(초월) 실제 등장', String(E.got[6] || 0));

  /* [F] 합성 */
  const F = await page.evaluate(() => {
    S.own.weapon5 = { n: 5, l: 100 };
    const can5 = canCraft(EQ.weapon5);
    const res5 = new Set();
    for (let i = 0; i < 60; i++) { const nx = nextGradeItem(EQ.weapon5); if (nx) res5.add(nx.id + ':' + nx.g); }
    const g6ok = [...res5].every(x => x.endsWith(':6'));
    S.own.weapon6 = { n: 5, l: 100 };
    const can6 = canCraft(EQ.weapon6);
    const nx6 = nextGradeItem(EQ.weapon6);
    const can7 = (S.own.weapon7 = { n: 5, l: 100 }, canCraft(EQ.weapon7));
    const canSk = canCraft(SK.holy);
    delete S.own.weapon6; delete S.own.weapon7;
    return { can5, pool5: res5.size, g6ok, can6, nx6: nx6 && nx6.id, can7, canSk };
  });
  ok(F.can5 && F.g6ok && F.pool5 >= 2, 'F1 weapon5 합성 → 초월 5종 중 랜덤', '표본 ' + F.pool5 + '종');
  ok(F.can6 && F.nx6 === 'weapon7', 'F2 weapon6 합성 → weapon7 고정(1종)', String(F.nx6));
  ok(!F.can7 && !F.canSk, 'F3 불멸 장비·신화 스킬은 합성 불가');

  /* [G] 11 확률 팝업 */
  const G = await page.evaluate(() => {
    openProbInfo('weapon', 100);
    const hw = document.getElementById('prbList').innerHTML;
    openProbInfo('skill', 100);
    const hs = document.getElementById('prbList').innerHTML;
    closeProbInfo();
    return { w6: hw.includes('초월'), w7: hw.includes('불멸'), s6: hs.includes('초월') || hs.includes('불멸'),
             bad: /NaN|undefined/.test(hw + hs) };
  });
  ok(G.w6 && G.w7, 'G1 무기 확률 팝업 MAX 단계에 초월·불멸 행');
  ok(!G.s6, 'G2 스킬 확률 팝업엔 초월·불멸 없음');
  ok(!G.bad, 'G3 확률 팝업 NaN/undefined 0건');

  /* [H] 05 팝업 2페이지 */
  const H = await page.evaluate(() => {
    openWeapon(null, 'weapon');
    const pages = wpnPages();
    document.getElementById('wpnNext').onclick();
    const h = document.getElementById('wpnGrid').innerHTML;
    closeWeapon();
    return { pages, hasG7: h.includes('♾️'), hasG6: h.includes('🌀'), bad: /NaN|undefined/.test(h) };
  });
  ok(H.pages === 2, 'H1 wpnPages() === 2', String(H.pages));
  ok(H.hasG6 && H.hasG7 && !H.bad, 'H2 2페이지에 초월·불멸 행 렌더 · NaN 없음');

  /* [I] 도감 */
  const I = await page.evaluate(() => {
    const t = COLL.equip.tiers;
    let err = null; try { renderColl21(); } catch (e) { err = String(e); }
    return { last: t[t.length - 1].need, asc: t.every((x, i) => !i || x.need > t[i - 1].need), err };
  });
  ok(I.last === 108 && I.asc, 'I1 도감 마지막 티어 = 108종(전 종) · 오름차순', String(I.last));
  ok(!I.err, 'I2 renderColl21 에러 없음', I.err || '');

  /* [J] 구 세이브 호환 — 옛 신화 무한강화(lv120) 소지자 */
  const J = await page.evaluate(() => {
    S.own.weapon5 = { n: 3, l: 120 };
    let err = null, r = {};
    try {
      r = { atMax: atMax(EQ.weapon5), canLv: canLevel(EQ.weapon5), canCr: canCraft(EQ.weapon5),
            refund: isFinite(refundAmount(EQUIPS.filter(e => e.slot === 'weapon'))) };
      S.own.weapon5.n = 5; r.canCr2 = canCraft(EQ.weapon5);
      renderWpn();
    } catch (e) { err = String(e); }
    return { err, ...r };
  });
  ok(!J.err, 'J1 옛 lv120 신화 장비 로드 후 판정·렌더 무에러', J.err || '');
  ok(J.atMax && !J.canLv && !J.canCr && J.canCr2 && J.refund, 'J2 lv120 → MAX 취급 · 5개 모으면 초월 합성 가능');

  /* [K] 콘솔 */
  ok(errs.length === 0, 'K1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY85 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
