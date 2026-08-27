#!/usr/bin/env node
/* 196 검증 — 소환 레벨 개편: 필요 경험치 «주인 확정표» + 총 레벨 25
 *
 *   node tools/verify196.js
 *
 * 주인 지시(2026-08-27):
 *   · 소환 만렙 **100 → 25**
 *   · 필요 경험치는 Lv1 부터 순서대로
 *     50 · 200 · 500 · 800 · 1200 · 1500 · 1800 · 2100 · 2300 · 2600 · 3000 · 3300 · 3600 · 4000 · 4500 · 5000,
 *     그 뒤(Lv17~24)는 **5000 유지**
 *   · ⚠ 해금 사다리 재배치 필수 — 구 사다리(희귀5·영웅15·전설30·신화40·초월55·불멸75)는
 *     30 이상이 전부 새 만렙 25 를 넘어 **전설 이상이 영원히 안 나온다**. 예시 사다리 5/8/12/16/20/24.
 *
 * 검사 항목:
 *   [A] 상수 — SUM_MAXLV = 25 · SUM_EXP_TABLE 16칸이 확정표와 «값·순서» 일치 · 옛 식 소스 부재
 *   [B] sumNeedExp — Lv1~16 은 표 그대로 · Lv17~24 는 5000 · 만렙까지 총 76,450
 *   [C] 해금 사다리 — 6행 1/1/5/8/12/16 · 8행 +20/24 · **전 행 unlock ≤ SUM_MAXLV**(핵심 회귀)
 *       + 만렙에서 8등급 전부 확률 > 0 (=«전설 이상이 안 나옴» 이 아님을 실제 확률로 증명)
 *   [D] sumAddExp 실동작 — 경계(need−1 / need) · 여러 단계 한 번에 · 만렙 클램프 + exp 0
 *   [E] 11 확률 팝업 이정표 — 표에서 뽑히고(리터럴 아님) 각 단계 렌더에 NaN/빈 확률 0건
 *   [F] 세이브 이관 — 구 세이브 lv 100·60 → 25(exp 0) · 진행 중 세이브 보존 · 손댄 값 정화 · 멱등
 *   [G] 10 상점 카드 — Lv 표기 · 채움률 0~100 · 만렙 MAX
 *   [H] 콘솔 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SRC = require('fs').readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

/* 주인 확정표 — 게이트에 한 번만 적고, 아래 단언은 전부 이 배열과 대조한다 */
const TBL = [50, 200, 500, 800, 1200, 1500, 1800, 2100, 2300, 2600,
             3000, 3300, 3600, 4000, 4500, 5000];
const MAXLV = 25;
/* 만렙까지 총 경험치 = 표 합(Lv1~16) + 5000 × (Lv17~24 = 8칸) */
const TOTAL = TBL.reduce((a, c) => a + c, 0) + 5000 * (MAXLV - 1 - TBL.length);

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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof sumNeedExp === 'function');
  await page.waitForTimeout(600);

  /* ================= [A] 상수 ================= */
  console.log('[A] 상수');
  const A = await page.evaluate(() => ({
    max: SUM_MAXLV, tbl: SUM_EXP_TABLE.slice(), len: SUM_EXP_TABLE.length
  }));
  ok(A.max === MAXLV, 'A1 SUM_MAXLV = 25 (100 → 25)', String(A.max));
  ok(A.len === TBL.length && A.tbl.every((v, i) => v === TBL[i]),
    'A2 SUM_EXP_TABLE 16칸이 주인 확정표와 값·순서 일치', A.tbl.join(','));
  ok(!/sumNeedExp\s*=\s*lv\s*=>\s*5\s*\+/.test(SRC), 'A3 옛 식 `sumNeedExp = lv => 5 + (lv-1)*4` 부재(소스 스캔)');
  ok(!/const\s+SUM_MAXLV\s*=\s*100\b/.test(SRC), 'A4 옛 리터럴 `SUM_MAXLV = 100` 부재(소스 스캔)');

  /* ================= [B] sumNeedExp ================= */
  console.log('[B] 필요 경험치 곡선');
  const B = await page.evaluate(mx => {
    const need = [];
    for (let lv = 1; lv < mx; lv++) need.push(sumNeedExp(lv));
    return { need, tot: need.reduce((a, c) => a + c, 0), nan: need.some(v => !Number.isFinite(v)) };
  }, MAXLV);
  ok(!B.nan, 'B1 Lv1~24 need 전부 유한(NaN/undefined 0건)');
  ok(TBL.every((v, i) => B.need[i] === v), 'B2 Lv1~16 = 확정표 그대로', B.need.slice(0, 16).join(','));
  ok(B.need.slice(16).every(v => v === 5000) && B.need.length === MAXLV - 1,
    'B3 Lv17~24 는 5000 유지 (8칸)', B.need.slice(16).join(','));
  ok(B.tot === TOTAL, 'B4 만렙까지 총 경험치 = ' + TOTAL.toLocaleString() + ' 회', B.tot.toLocaleString());

  /* ================= [C] 해금 사다리 ================= */
  console.log('[C] 해금 사다리 — «전설 이상이 영원히 안 나옴» 방지가 핵심');
  const C = await page.evaluate(() => {
    const at = (b, L) => { const o = S.sum[b].lv; S.sum[b].lv = L; const p = gradeProbs(b); S.sum[b].lv = o; return p; };
    return {
      base: GRADE_ROLL.map(g => g.unlock), eq: GRADE_ROLL_EQ.map(g => g.unlock),
      over: GRADE_ROLL_EQ.filter(g => g.unlock > SUM_MAXLV).length,
      pMax: at('weapon', SUM_MAXLV), pSkill: at('skill', SUM_MAXLV),
      pMaxSum: at('weapon', SUM_MAXLV).reduce((a, c) => a + c, 0)
    };
  });
  ok(C.base.join(',') === '1,1,5,8,12,16', 'C1 6행 표 해금 1/1/5/8/12/16', C.base.join(','));
  ok(C.eq.join(',') === '1,1,5,8,12,16,20,24', 'C2 8행 표 해금 +20/24', C.eq.join(','));
  ok(C.over === 0, 'C3 ★ 만렙(' + MAXLV + ')을 넘는 해금 레벨 0개 — 전 등급 도달 가능', '초과 ' + C.over + '행');
  ok(C.pMax.slice(0, 8).every(v => v > 0), 'C4 장비 배너 만렙 — 8등급 전부 확률 > 0',
    C.pMax.slice(0, 8).map(v => (v * 100).toFixed(3) + '%').join(' / '));
  ok(Math.abs(C.pMaxSum - 1) < 1e-9, 'C5 만렙 확률 합 = 1', C.pMaxSum.toFixed(9));
  ok(C.pSkill.slice(0, 6).every(v => v > 0) && C.pSkill[6] === 0 && C.pSkill[7] === 0,
    'C6 스킬 배너(6행)는 6등급 전부 > 0 · 초월·불멸 0 (회귀)');

  /* ================= [D] sumAddExp 실동작 ================= */
  console.log('[D] 레벨업 실동작');
  const D = await page.evaluate(mx => {
    const set = (lv, exp) => { S.sum.weapon.lv = lv; S.sum.weapon.exp = exp; };
    const snap = () => ({ lv: S.sum.weapon.lv, exp: S.sum.weapon.exp });
    const o = { lv: S.sum.weapon.lv, exp: S.sum.weapon.exp };
    const r = {};
    set(1, 0); sumAddExp('weapon', sumNeedExp(1) - 1); r.justUnder = snap();       /* 49 → Lv1 */
    set(1, 0); r.up1 = { up: sumAddExp('weapon', sumNeedExp(1)), ...snap() };      /* 50 → Lv2 */
    set(1, 0); r.up2 = { up: sumAddExp('weapon', sumNeedExp(1) + sumNeedExp(2)), ...snap() };
    /* 표 전량 = 정확히 만렙 */
    set(1, 0); let tot = 0; for (let lv = 1; lv < mx; lv++) tot += sumNeedExp(lv);
    r.upAll = { up: sumAddExp('weapon', tot), ...snap(), tot };
    /* 만렙 초과 소환 — lv 는 안 넘고 exp 는 0 으로 고정 */
    r.overflow = { up: sumAddExp('weapon', 99999), ...snap() };
    S.sum.weapon.lv = o.lv; S.sum.weapon.exp = o.exp;
    return r;
  }, MAXLV);
  ok(D.justUnder.lv === 1 && D.justUnder.exp === TBL[0] - 1,
    'D1 need−1(49) 에서는 Lv1 유지', JSON.stringify(D.justUnder));
  ok(D.up1.lv === 2 && D.up1.exp === 0 && D.up1.up === 1,
    'D2 need(50) 정확히 채우면 Lv2 · 잔여 0', JSON.stringify(D.up1));
  ok(D.up2.lv === 3 && D.up2.up === 2, 'D3 두 단계분을 한 번에 주면 2단계 상승', JSON.stringify(D.up2));
  ok(D.upAll.lv === MAXLV && D.upAll.up === MAXLV - 1 && D.upAll.tot === TOTAL,
    'D4 총 ' + TOTAL.toLocaleString() + ' 경험치 = 정확히 만렙 Lv' + MAXLV, JSON.stringify(D.upAll));
  ok(D.overflow.lv === MAXLV && D.overflow.exp === 0 && D.overflow.up === 0,
    'D5 만렙 초과분은 lv 클램프 + exp 0', JSON.stringify(D.overflow));

  /* ================= [E] 11 확률 팝업 이정표 ================= */
  console.log('[E] 확률 팝업 이정표');
  const E = await page.evaluate(() => {
    const out = { steps: PRB_STEPS.join(','), stepsEq: PRB_STEPS_EQ.join(','), bad: [], empty: [] };
    ['weapon', 'skill'].forEach(b => {
      const ST = BANNERS[b].g8 ? PRB_STEPS_EQ : PRB_STEPS;
      ST.forEach((L, i) => {
        openProbInfo(b, L); prbStep = i; renderProbInfo();
        const h = document.getElementById('prbList').innerHTML;
        if (/NaN|undefined/.test(h)) out.bad.push(b + '@' + L);
        if (/\(\s*%\)/.test(h) || !/prb-row/.test(h)) out.empty.push(b + '@' + L);
      });
    });
    closeProbInfo();
    return out;
  });
  ok(E.steps === '1,5,8,12,16,25', 'E1 PRB_STEPS = 1,5,8,12,16,25', E.steps);
  ok(E.stepsEq === '1,5,8,12,16,20,24,25', 'E2 PRB_STEPS_EQ = 1,5,8,12,16,20,24,25', E.stepsEq);
  ok(!/PRB_STEPS\s*=\s*\[1,\s*5,\s*15/.test(SRC), 'E3 옛 리터럴 이정표 [1,5,15,30,40,…] 부재(소스 스캔)');
  ok(E.bad.length === 0, 'E4 전 단계 렌더 NaN/undefined 0건', E.bad.join(' '));
  ok(E.empty.length === 0, 'E5 전 단계에 항목 행이 그려진다(빈 확률 0건)', E.empty.join(' '));

  /* ================= [F] 세이브 이관 =================
     ⚠ 살아 있는 페이지에 localStorage 를 쓰고 reload 하면 그 페이지의 자동 저장이 먼저 덮어쓴다
     (LESSONS 87-3 · 43-①). 주입은 «새 컨텍스트 + addInitScript» 로 한다(LESSONS 44-①). */
  console.log('[F] 세이브 이관');
  const KEYV = await page.evaluate(() => KEY);
  const inject = async sum => {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await c.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEYV, JSON.stringify({ sum })]);
    const p2 = await c.newPage();
    p2.on('pageerror', e => errs.push('pageerror(세이브 이관): ' + String(e)));
    await p2.goto(URL);
    await p2.waitForTimeout(900);
    const r = await p2.evaluate(() => JSON.parse(JSON.stringify(S.sum)));
    await c.close();
    return r;
  };
  const F1 = await inject({ weapon: { lv: 100, exp: 37 }, skill: { lv: 60, exp: 4 },
                            shield: { lv: 3, exp: 4 }, amulet: { lv: 25, exp: 0 },
                            pet: { lv: 1, exp: 0 } });
  ok(F1.weapon.lv === MAXLV && F1.weapon.exp === 0, 'F1 구 세이브 Lv100 → Lv25 · exp 0', JSON.stringify(F1.weapon));
  ok(F1.skill.lv === MAXLV && F1.skill.exp === 0, 'F2 구 세이브 Lv60 → Lv25 · exp 0', JSON.stringify(F1.skill));
  ok(F1.shield.lv === 3 && F1.shield.exp === 4, 'F3 진행 중 세이브(Lv3/4)는 그대로 보존', JSON.stringify(F1.shield));

  const F2 = await inject({ weapon: { lv: -7, exp: -3 }, skill: { lv: '9', exp: 'x' },
                            shield: { lv: 1 / 0, exp: NaN }, amulet: null, pet: { lv: 2, exp: 999999 } });
  ok(F2.weapon.lv === 1 && F2.weapon.exp === 0, 'F4 음수 lv·exp → Lv1/0', JSON.stringify(F2.weapon));
  ok(F2.skill.lv === 1 && F2.skill.exp === 0, 'F5 문자열 lv·exp → Lv1/0', JSON.stringify(F2.skill));
  ok(F2.shield.lv === 1 && F2.amulet.lv === 1, 'F6 비유한값·null → Lv1',
    JSON.stringify(F2.shield) + ' ' + JSON.stringify(F2.amulet));
  ok(F2.pet.lv === 2 && F2.pet.exp === TBL[1] - 1, 'F7 need 초과 exp → need−1 로 클램프', JSON.stringify(F2.pet));
  const F3 = await inject(F1);   /* 이관 결과를 다시 넣으면 그대로여야 한다(멱등) */
  ok(JSON.stringify(F3) === JSON.stringify(F1), 'F8 이관은 멱등(두 번 돌아도 같은 값)');
  const bad = Object.keys(F1).concat(Object.keys(F2))
    .filter(k => [F1, F2].some(o => o[k] && (!Number.isFinite(o[k].lv) || !Number.isFinite(o[k].exp))));
  ok(bad.length === 0, 'F9 이관 후 전 배너 lv·exp 유한(NaN 0건)', bad.join(','));

  /* ================= [G] 10 상점 카드 ================= */
  console.log('[G] 10 상점 소환 카드 표시');
  const G = await page.evaluate(mx => {
    S.sum.weapon.lv = 4; S.sum.weapon.exp = Math.floor(sumNeedExp(4) / 2);
    S.sum.skill.lv = mx; S.sum.skill.exp = 0;
    openShopPage(null, 'sum'); renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const read = i => ({ lv: cards[i].querySelector('.clv>i').textContent,
                         bar: cards[i].querySelector('.cbar>b').textContent,
                         w: cards[i].querySelector('.cbar .trk>i').style.width });
    const idx = SHOP_BOXES.findIndex(x => x.b === 'weapon');
    const idxS = SHOP_BOXES.findIndex(x => x.b === 'skill');
    const all = cards.map((_, i) => read(i));
    return { w: read(idx), s: read(idxS), n: cards.length,
             bad: all.some(x => /NaN|undefined/.test(x.lv + x.bar)),
             pct: all.map(x => parseFloat(x.w) || 0) };
  }, MAXLV);
  ok(G.n === 5, 'G1 소환 카드 5장', String(G.n));
  ok(G.w.lv === 'Lv.4' && /^\d+\/800$/.test(G.w.bar), 'G2 Lv4 카드가 «n/800»(표 4번째 값)로 찍힌다',
    G.w.lv + ' ' + G.w.bar);
  ok(G.s.lv === 'Lv.' + MAXLV && G.s.bar === 'MAX' && parseFloat(G.s.w) === 100,
    'G3 만렙 카드는 «MAX» + 채움률 100%', G.s.lv + ' ' + G.s.bar + ' ' + G.s.w);
  ok(!G.bad, 'G4 카드 표기 NaN/undefined 0건');
  ok(G.pct.every(v => v >= 0 && v <= 100), 'G5 채움률 전 카드 0~100% (구 곡선 잔재로 1000% 안 뜬다)',
    G.pct.join('/'));

  /* ================= [H] 콘솔 ================= */
  ok(errs.length === 0, 'H1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY196 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
