#!/usr/bin/env node
/* 85 검증 — 장비 8등급 체계(마지막 등급 1종 · 그 외 등급당 5종 = 부위당 36, 총 108)
 *
 *   node tools/verify85.js
 *
 * 검사 항목:
 *   [A] 데이터 — EQUIPS 108종 · 부위별 등급 분포 [5,5,5,5,5,5,5,1] · id 유일 · 구 54종 id 전부 보존
 *   [B] 등급 상수 — GRADE 8단(초월·불멸) · SUM_CARD/WGRADE/BAG_G 8행 · GRADE_ROLL_EQ 8행(20/24 해금 — 196)
 *       757 이관 — 옛 «REFUND 8행» 은 표가 폐지돼(환급가 = 소환 1회 단가 파생) B3b 로 뒤집혔다
 *   [C] 최고 등급 판정 — topG: 장비 g7 만 top, g6 은 아님 · «신화 스킬 = MAX» 유지(비장비는 5 가 top)
 *   [D] 확률 — 장비 배너 **만렙**(SUM_MAXLV)에서 g6·g7 > 0, 합 = 1 · 스킬 배너는 g6·g7 = 0 (6행 표 유지)
 *   [E] 소환 시뮬 — 무기 10연 ×300 (**만렙**) 에서 8등급(g7) 실제 등장 + 아이템 undefined 0건
 *   ⚠ 528(2026-08-31) — [D]·[E]·[G] 의 «만렙» 은 제품 `SUM_MAXLV` 에서 읽는다. 손으로 적으면
 *      만렙이 바뀌는 날 조용히 다른 레벨을 재게 된다(115 → 196 → 496 에서 두 번 그랬다 — 522·528).
 *   [F] 합성 — **719 이관**: weapon5(Lv100+5개) → 같은 등급 다음 티어 weapon5_3 고정(랜덤 폐지) ·
 *       등급 끝 weapon6_4 → 다음 등급 최저 티어 weapon7 · weapon7 은 canCraft false
 *   [G] 11 확률 팝업 — 무기 MAX 단계에 «초월·불멸» 행 · 스킬 팝업엔 없음 · NaN/undefined 0건
 *   [H] 05 팝업 — (186) 페이징 폐지: 한 화면에 8행 40칸 · 초월·불멸 행 렌더 · NaN/undefined 0건
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

  /* A6 — 260(2026-08-27, 주인 보고) 회귀 방지. 등급 안에서 «1번째가 최약 → 마지막이 최강» 이고
     그 등급 최강이 다음 등급 최약을 못 넘는다. 종을 새로 덧붙이거나 v 를 손댈 때 여기서 잡힌다.
     상세 판정·근거는 `tools/verify260.js` [A]. */
  const A6 = await page.evaluate(() => {
    const bad = [];
    SLOTS.forEach(s => {
      const tiers = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s.k && e.g === g));
      tiers.forEach((t, g) => { for (let j = 1; j < t.length; j++)
        if (!(t[j].v > t[j - 1].v)) bad.push(s.k + 'g' + g + '[' + j + ']'); });
      for (let g = 0; g + 1 < tiers.length; g++) {
        if (!tiers[g].length || !tiers[g + 1].length) continue;
        if (!(gWear(g) * Math.max(...tiers[g].map(e => e.v))
            < gWear(g + 1) * Math.min(...tiers[g + 1].map(e => e.v)))) bad.push(s.k + ' 경계 g' + g);
      }
    });
    return bad;
  });
  ok(A6.length === 0, 'A6 등급 안 v 단조 증가 + 등급 경계 비역전 (260)', A6.slice(0, 4).join(' / ') || '위반 0');

  /* [B] 등급 상수 */
  const B = await page.evaluate(() => ({
    gl: GRADE.length, g6: GRADE[6].n, g7: GRADE[7].n, m6: GRADE[6].mul, m7: GRADE[7].mul,
    /* 757 — 옛 `REFUND` 8행 표는 폐지됐다(환급가 = 소환 1회 단가 파생). 자리를 비우지 않고
       «표가 정말 사라졌는가 + 파생이 항등을 지키는가» 로 방향을 뒤집는다(333 처방). */
    refundGone: typeof REFUND === 'undefined',
    rfUnit: refundUnit(SKILLS[0]), rfSum1: summonCost('skill', 1), rfSum10: summonCost('skill', 10),
    rfEq: refundAmount(EQUIPS.filter(e => e.slot === 'weapon')),
    sumCard: SUM_CARD.length, wg: WGRADE.length, bag: BAG_G.length,
    rollEq: GRADE_ROLL_EQ.length, u6: GRADE_ROLL_EQ[6].unlock, u7: GRADE_ROLL_EQ[7].unlock,
    roll: GRADE_ROLL.length, steps: PRB_STEPS_EQ.join(','), maxlv: SUM_MAXLV
  }));
  ok(B.gl === 8 && B.g6 === '초월' && B.g7 === '불멸', 'B1 GRADE 8단 (초월·불멸)', B.g6 + '/' + B.g7);
  ok(B.m6 === 16 && B.m7 === 26, 'B2 mul 16·26 기하급수', B.m6 + '/' + B.m7);
  ok(B.sumCard === 8 && B.wg === 8 && B.bag === 8, 'B3 SUM_CARD·WGRADE·BAG_G 8행',
    [B.sumCard, B.wg, B.bag].join('/'));
  /* 757 이관 — 여기 있던 «REFUND 8행» 은 표 자체가 폐지돼 물을 수 없다. 지우지 않고
     **뒤집어서** 남긴다: ⓐ 표가 진짜 없어졌는가 ⓑ 파생 단가가 소환 1회가와 같은가
     ⓒ 주인이 못박은 항등 «환급가 × 10 = 10회 소환가» ⓓ 장비는 환급 대상이 아니다(0). */
  ok(B.refundGone && B.rfUnit === B.rfSum1 && B.rfUnit * 10 === B.rfSum10 && B.rfEq === 0,
    'B3b 757 환급가 = 소환 1회 단가 파생 · ×10 = 10회가 · 장비 0',
    'gone=' + B.refundGone + ' unit=' + B.rfUnit + ' x1=' + B.rfSum1 + ' x10=' + B.rfSum10 + ' eq=' + B.rfEq);
  /* 196 — 만렙 100 → 25 로 줄면서 해금 사다리가 5/8/12/16/**20/24** 로 옮겨졌다.
     묻는 것은 그대로다 — «장비 배너는 8행 표를 쓰고 초월·불멸 해금이 만렙 밑에 있는가». */
  /* 496 — 만렙이 25 → 50 이 되면서 사다리가 비례 이동했다(초월 20 → 40 · 불멸 24 → 만렙 − 1 = 49).
     이 항이 묻는 것은 «장비만 8 행이고 그 두 행의 해금이 사다리 꼭대기 둘인가» 이지 숫자 20·24 가
     아니므로, 값을 갈아 끼우되 **불멸은 만렙에서 역산**해 또 바뀌어도 따라가게 한다(LESSONS 106-1). */
  ok(B.rollEq === 8 && B.roll === 6 && B.u6 === 40 && B.u7 === B.maxlv - 1,
    'B4 장비 8행 표(초월 40 · 불멸 만렙−1) · 공용 6행 유지',
    'eq=' + B.rollEq + ' base=' + B.roll + ' unlock=' + B.u6 + '/' + B.u7);
  /* 250 — 이정표(1,5,8,12,16,20,24,25) 폐기. 단계는 소환 레벨 1..만렙 연속이다.
     묻는 것은 그대로 — «장비 배너 단계에 초월·불멸 해금 레벨과 만렙이 들어 있는가». */
  ok(B.steps === Array.from({ length: B.maxlv }, (_, i) => i + 1).join(','),
    'B5 PRB_STEPS_EQ = 소환 레벨 1..' + B.maxlv + ' 연속 (250)', B.steps.slice(0, 40) + '…');

  /* [C] 최고 등급 판정 */
  const C = await page.evaluate(() => ({
    e7: isTopGrade(EQ.weapon7), e6: isTopGrade(EQ.weapon6), s5: isTopGrade(SK.holy),
    /* 106 — 동료가 8등급이 되면서 «펫 top = 신화» 는 폐기됐다. 무한 강화는 여전히 불멸 «장비» 전용.
       ⚑ 757 이관(2026-09-02, 주인 보강) — 펫 불멸이 폐지돼 **펫 top 은 초월(g6)** 이다.
         id 를 손으로 적어 두면 등급이 접히는 날 자가 통째로 죽는다(실제로 `PT.pet7_0` 이
         undefined 가 돼 이 evaluate 가 즉사했다) ⇒ **가장 센 펫을 데이터에서 고른다**. */
    p7: isTopGrade(PETS.reduce((m, x) => (x.g > m.g || (x.g === m.g && x.j > m.j)) ? x : m, PETS[0])),
    pTopName: GRADE[topG('pet')].n, pTopG: topG('pet'),
    p5: !isTopGrade(PT.drag2), r5: isTopGrade(RL.rl8),
    lvP: maxLv(PETS[PETS.length - 1]) === MAX_LEVEL,
    lvInf: maxLv(EQ.weapon7) === Infinity, lv6: maxLv(EQ.weapon6) === MAX_LEVEL, lvS: maxLv(SK.holy) === MAX_LEVEL
  }));
  ok(C.e7 && !C.e6, 'C1 장비 top = g7 (g6 은 아님)');
  ok(C.s5 && C.r5, 'C2 스킬·유물은 신화(g5)가 top — «신화 = MAX» 유지');
  ok(C.p7 && C.p5 && C.pTopG === 6,
    'C2b 106 → 757 — 펫 top 은 초월(g6), 구 신화 동료는 top 아님', C.pTopName + '(g' + C.pTopG + ')');
  ok(C.lvP, 'C2c 최고 등급 펫도 Lv100 상한(무한 강화는 불멸 장비 전용)');
  ok(C.lvInf && C.lv6 && C.lvS, 'C3 무한 강화는 불멸 장비만 (g6 장비·신화 스킬은 Lv100 상한)');

  /* [D] 확률 — **만렙에서** 재는 절이다.
     528(2026-08-31) — 옛 코드는 `S.sum.weapon.lv = 100` 을 세웠다. 100 은 만렙 100 시절의 숫자이고
     196·496 이 만렙을 25 → 50 으로 옮긴 뒤에는 **합법 레벨이 아니다**. 지금 초록인 것은 맞아서가
     아니라 `gradeProbs` 의 `t` 가 1 로 clamp 돼 «우연히» 만렙과 같은 값이 나오기 때문이다
     (`probe528` A3). 만렙이 100 **이상**으로 오르는 날 이 절은 조용히 «만렙 아래 한 레벨» 을 재고
     D2 가 거짓이 된다(`probe528` B4 — 그 사본에서 최고 등급 확률이 0.0000%). 숫자를 50 으로 갈아
     끼우면 522 가 fnchk115 에서 겪은 부패를 **세 번째로** 되풀이하므로 제품에서 역산한다.
     ⚠ 「만렙에 서 있다」는 것 자체를 D0 이 단언한다 — 별칭 뷰에 클램프가 생기거나 접근자가 바뀌어
        `S.sum[b].lv` 가 만렙을 못 받게 되면 아래 셋이 조용히 «다른 레벨» 을 재는 대신 여기가 빨개진다. */
  const D = await page.evaluate(() => {
    S.sum.weapon.lv = SUM_MAXLV; S.sum.skill.lv = SUM_MAXLV;
    const pw = gradeProbs('weapon'), ps = gradeProbs('skill');
    const sum = a => a.reduce((x, y) => x + y, 0);
    return { lw: pw.length, ls: ps.length, w6: pw[6], w7: pw[7], s6: ps[6], s7: ps[7],
             max: SUM_MAXLV, lv: sumLv('weapon'), lvS: sumLv('skill'),
             sw: sum(pw), ss: sum(ps), nan: pw.concat(ps).some(x => !isFinite(x)) };
  });
  ok(D.lv === D.max && D.lvS === D.max, 'D0 전제 — 두 배너가 실제로 만렙(Lv' + D.max + ')에 서 있다',
     'weapon Lv' + D.lv + ' · skill Lv' + D.lvS + ' / 만렙 ' + D.max);
  ok(D.lw === 8 && D.ls === 8, 'D1 확률 배열 GRADE.length 로 패딩', D.lw + '/' + D.ls);
  ok(D.w6 > 0 && D.w7 > 0, 'D2 장비 만렙(Lv' + D.max + ')에서 초월·불멸 확률 > 0',
     D.w6.toFixed(4) + '/' + D.w7.toFixed(4));
  ok(D.s6 === 0 && D.s7 === 0, 'D3 스킬 배너는 초월·불멸 0 (6행 표 유지)');
  ok(Math.abs(D.sw - 1) < 1e-9 && Math.abs(D.ss - 1) < 1e-9 && !D.nan, 'D4 확률 합 1 · NaN 없음');

  /* [E] 소환 시뮬 — 무기 10연 ×300, **만렙**(528 — D 와 같은 이유로 숫자를 제품에서 읽는다.
     불멸은 만렙 직전 1레벨 램프라 이 절이 만렙에 안 서면 E2 가 0건이 된다 — `probe528` B5). */
  const E = await page.evaluate(() => {
    S.sum.weapon.lv = SUM_MAXLV;
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

  /* [F] 합성 — ⚑ 719(2026-09-02, 주인 지시)로 **종착지가 «다음 등급 랜덤» → «다음 티어» 로 뒤집혔다.**
     333 처방대로 표본(weapon5 계열)은 그대로 두고 **방향만** 갈아 끼운다: 자리를 비우면 «85 가
     세우던 합성 축» 이 통째로 사라진다. 새 산식의 전수·되돌림은 `verify719` [A]·[R] 가 지고,
     여기서는 85 가 원래 묻던 세 가지(가능한가 · 등급 경계는 어디로 · 최고 등급은 막히는가)를 묻는다. */
  const F = await page.evaluate(() => {
    S.own.weapon5 = { n: 5, l: 100 };
    const can5 = canCraft(EQ.weapon5);
    /* 랜덤이 폐지됐으므로 60번 물어도 «한 칸» 이어야 한다(옛 F1 의 «5종 풀» 과 정확히 반대) */
    const res5 = new Set();
    for (let i = 0; i < 60; i++) { const nx = nextTierItem(EQ.weapon5); if (nx) res5.add(nx.id + ':' + nx.g); }
    S.own.weapon6_4 = { n: 5, l: 100 };                    /* g6 의 **마지막 티어**(j4) */
    const can6 = canCraft(EQ.weapon6_4);
    const nx6 = nextTierItem(EQ.weapon6_4);
    const can7 = (S.own.weapon7 = { n: 5, l: 100 }, canCraft(EQ.weapon7));
    const canSk = canCraft(SK.holy);
    delete S.own.weapon6_4; delete S.own.weapon7;
    return { can5, pool5: res5.size, one5: [...res5][0], can6, nx6: nx6 && nx6.id, can7, canSk };
  });
  ok(F.can5 && F.pool5 === 1 && F.one5 === 'weapon5_3:5',
     'F1 weapon5 합성 → **같은 등급 다음 티어** 고정(랜덤 폐지)', F.one5 + ' · 표본 ' + F.pool5 + '종');
  ok(F.can6 && F.nx6 === 'weapon7', 'F2 등급 끝(weapon6_4) 합성 → 다음 등급 최저 티어 weapon7', String(F.nx6));
  ok(!F.can7 && !F.canSk, 'F3 불멸 장비·신화 스킬은 합성 불가');

  /* [G] 11 확률 팝업 — 이 절의 단언문이 «MAX 단계» 라고 말하므로 **MAX 단계에 서야** 한다.
     528(2026-08-31) — 옛 코드는 `openProbInfo('weapon', 100)` 이었다. `openProbInfo` 는 «cur 이하
     가장 높은 단계» 로 떨어지므로 100 > 만렙 50 인 지금은 MAX 로 튕겨 우연히 초록이다(`probe528` A1).
     만렙이 100 이상이 되는 날엔 그냥 «Lv100 단계» 를 열고 불멸 행이 사라져 단언문과 화면이 어긋난다
     (`probe528` B2). 만렙은 제품에서 읽는다 — 522 가 fnchk115 ③ 에서 쓴 길과 같다.
     ⚠ G0 이 「정말 MAX 단계인가」를 화면 라벨(`#prbLv`)로 되묻는다. 이 항이 없으면 «단계가 어디든
        초월·불멸 행만 있으면 초록» 이라 openProbInfo 의 단계 규칙이 바뀌어도 조용하다. */
  const G = await page.evaluate(() => {
    openProbInfo('weapon', SUM_MAXLV);
    const hw = document.getElementById('prbList').innerHTML;
    const lvW = document.getElementById('prbLv').textContent;
    openProbInfo('skill', SUM_MAXLV);
    const hs = document.getElementById('prbList').innerHTML;
    const lvS = document.getElementById('prbLv').textContent;
    closeProbInfo();
    return { w6: hw.includes('초월'), w7: hw.includes('불멸'), s6: hs.includes('초월') || hs.includes('불멸'),
             lvW, lvS, max: SUM_MAXLV, bad: /NaN|undefined/.test(hw + hs) };
  });
  ok(G.lvW === 'MAX' && G.lvS === 'MAX', 'G0 전제 — 두 배너 모두 실제로 MAX 단계를 열었다(만렙 ' + G.max + ')',
     '무기 «' + G.lvW + '» · 스킬 «' + G.lvS + '»');
  ok(G.w6 && G.w7, 'G1 무기 확률 팝업 MAX 단계에 초월·불멸 행');
  ok(!G.s6, 'G2 스킬 확률 팝업엔 초월·불멸 없음');
  ok(!G.bad, 'G3 확률 팝업 NaN/undefined 0건');

  /* [H] 05 팝업 — 186(2026-08-27, 주인 지시 «(잠긴 등급도) 미리 보여야지») 이 4행 페이징을
     폐지했다. 묻는 것은 그대로다: **초월·불멸 행이 실제로 보이는가.** 옛 판정은 «2페이지로
     넘겨서 보이는가» 였고, 지금 같은 단언은 «넘기지 않아도 한 격자에 8행 40칸이 있는가» 다.
     ◀▶(`#wpnPrev`/`#wpnNext`)·`wpnPages()` 가 되살아나면 H3 이 잡는다(되돌림 감지). */
  const H = await page.evaluate(() => {
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const h = g.innerHTML, cells = g.children.length;
    /* 스크롤 없이 «격자 안에» 8행이 다 들어와 있는지 — 마지막 칸의 격자-로컬 bottom */
    const last = g.children[cells - 1];
    const lastBottom = last ? last.offsetTop + last.offsetHeight : 0;
    const scrollable = g.scrollHeight > g.clientHeight + 1;
    /* 맨이름 `typeof` — 최상위 `const` 는 window 에 안 붙어서 `window.wpnPages` 로 물으면
       폐지 전에도 undefined 다(186 되돌림 시험에서 확인). */
    const dead = !!(document.getElementById('wpnPrev') || document.getElementById('wpnNext')
                    || typeof wpnPages === 'function');
    closeWeapon();
    return { cells, lastBottom, scrollable, dead,
             hasG7: h.includes('♾️'), hasG6: h.includes('🌀'), bad: /NaN|undefined/.test(h) };
  });
  ok(H.cells === 40, 'H1 격자가 8등급 × 5칸 = 40칸을 한 번에 렌더', String(H.cells) + '칸');
  ok(H.hasG6 && H.hasG7 && !H.bad, 'H2 페이지 넘김 없이 초월·불멸 행 렌더 · NaN 없음');
  ok(!H.dead, 'H3 ◀▶ 페이지 화살표·wpnPages() 잔존 0건(186 되돌림 감지)');
  ok(H.scrollable && H.lastBottom > 1400,
    'H4 8행이 격자 스크롤 안에 쌓인다(마지막 칸 bottom > 1400)', String(H.lastBottom));

  /* [I] 도감 — 91 이 «카테고리 × need 티어» 를 «부위 × 등급 세트» 로 전면 교체하면서
     이 절이 읽던 `COLL.equip.tiers` 가 사라져 게이트가 여기서 즉사하고 있었다(85 이후 줄곧 미실행).
     묻는 것은 그대로다: **도감이 8등급 108종을 하나도 빠뜨리지 않고 담는가.**
     새 구조에서는 «장비 세트 24개(3부위 × 8등급) · 구성원 합 108» 이 같은 단언이다. */
  const I = await page.evaluate(() => {
    const eq = COLL_SETS.filter(s => s.cat === 'equip');
    const ids = new Set(eq.reduce((a, s) => a.concat(s.it), []));
    let err = null; try { renderColl21(); } catch (e) { err = String(e); }
    return { sets: eq.length, members: ids.size, all: EQUIPS.every(e => ids.has(e.id)),
             g7: eq.filter(s => /:7$/.test(s.key)).length, err };
  });
  ok(I.sets === 24 && I.members === 108 && I.all,
    'I1 도감 장비 세트 24개 · 구성원 108종(전 종 포함)', I.sets + '세트 / ' + I.members + '종');
  ok(I.g7 === 3, 'I1b 불멸(g7) 세트가 부위마다 1개', String(I.g7));
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
  ok(J.atMax && !J.canLv && !J.canCr && J.canCr2 && J.refund, 'J2 lv120 → MAX 취급 · 5개 모으면 다음 티어 합성 가능(719)');

  /* [K] 콘솔 */
  ok(errs.length === 0, 'K1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY85 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
