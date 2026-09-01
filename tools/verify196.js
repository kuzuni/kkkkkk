#!/usr/bin/env node
/* 196 검증 — 소환 레벨 개편: 필요 경험치 «주인 확정값» + 총 레벨 (496 으로 갱신)
 *
 *   node tools/verify196.js
 *
 * 주인 지시(2026-08-27):
 *   · 소환 만렙 **100 → 25**
 *   · 필요 경험치는 Lv1 부터 순서대로 50 · 200 · … · 5000(16 칸), 그 뒤는 5000 유지
 *   · ⚠ 해금 사다리 재배치 필수 — 구 사다리(희귀5·영웅15·전설30·신화40·초월55·불멸75)는
 *     30 이상이 전부 새 만렙 25 를 넘어 **전설 이상이 영원히 안 나온다**.
 *
 * ⚑ 갱신(2026-08-31, 작업 496 — 주인 확정): 만렙 **25 → 50** · 곡선은 표가 아니라 **식**
 *   `need(n) = 200 + 210·n`(누적 267,050 뽑) · 해금 사다리는 «25 기준 → 50 기준» 비례로
 *   1/1/**10/16/24/32** (+ 초월 **40** · 불멸 **만렙 − 1 = 49**).
 *   이 게이트가 묻는 **질문은 한 줄도 안 바뀌었다** — 「만렙·곡선·사다리가 주인 확정값인가,
 *   그리고 사다리가 만렙 안에 들어오는가」다. 바뀐 것은 대조할 **값**뿐이라, 자리를 비우지 않고
 *   값을 갈아 끼웠다(333 처방). 496 이 새로 가져온 축(«레벨이 하나인가» · «5 벌 → 하나 이관에서
 *   뽑기 수를 안 잃는가»)은 이 게이트가 아니라 `tools/verify496.js` 가 묻는다 — 둘이 같은 것을
 *   두 번 묻지 않게 갈라 뒀다.
 *
 * 검사 항목:
 *   [A] 상수 — SUM_MAXLV = 25 · SUM_EXP_TABLE 16칸이 확정표와 «값·순서» 일치 · 옛 식 소스 부재
 *   [B] sumNeedExp — Lv1~16 은 표 그대로 · Lv17~24 는 5000 · 만렙까지 총 76,450
 *   [C] 해금 사다리 — 6행 1/1/5/8/12/16 · 8행 +20/24 · **전 행 unlock ≤ SUM_MAXLV**(핵심 회귀)
 *       + 만렙에서 8등급 전부 확률 > 0 (=«전설 이상이 안 나옴» 이 아님을 실제 확률로 증명)
 *   [D] sumAddExp 실동작 — 경계(need−1 / need) · 여러 단계 한 번에 · 만렙 클램프 + exp 0
 *   [E] 11 확률 팝업 이정표 — 표에서 뽑히고(리터럴 아님) 각 단계 렌더에 NaN/빈 확률 0건
 *   [F] 세이브 이관 — 구·손댄 세이브가 정상값으로 접히는가 · 멱등
 *       (496 — «5 벌을 합칠 때 뽑기 수를 안 잃는가» 는 `verify496` [D] 몫이다)
 *   [G] 10 상점 카드 — Lv 표기 · 채움률 0~100 · 만렙 MAX
 *   [H] 콘솔 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SRC = require('fs').readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

/* 주인 확정값 — 게이트에 한 번만 적고, 아래 단언은 전부 이것과 대조한다(496 갱신) */
const MAXLV = 50;
const EXP_A = 200, EXP_B = 210;
const NEED = lv => EXP_A + EXP_B * Math.min(Math.max(lv | 0, 1), MAXLV - 1);
const LADDER    = '1,1,10,16,24,32';
const LADDER_EQ = LADDER + ',40,' + (MAXLV - 1);
/* 만렙까지 총 경험치 = Σ need(1..MAXLV−1) */
const TOTAL = (() => { let t = 0; for (let n = 1; n < MAXLV; n++) t += NEED(n); return t; })();
/* 소스 스캔은 주석을 걷어낸 사본에 댄다(496 설명 주석이 옛 이름을 인용한다) */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');

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
  /* 되돌림 시험(구 소스)에서 `SUM_EXP_TABLE` 이 아예 없으면 evaluate 가 던져 게이트가 «즉사» 한다 —
     즉사는 FAIL 보고가 아니다. typeof 로 감싸 «없음» 도 한 건의 FAIL 로 세게 한다. */
  const A = await page.evaluate(() => ({
    max: typeof SUM_MAXLV === 'number' ? SUM_MAXLV : null,
    a: typeof SUM_EXP_A === 'number' ? SUM_EXP_A : null,
    b: typeof SUM_EXP_B === 'number' ? SUM_EXP_B : null
  }));
  ok(A.max === MAXLV, 'A1 SUM_MAXLV = ' + MAXLV + ' (496 — 25 → 50)', String(A.max));
  ok(A.a === EXP_A && A.b === EXP_B,
    'A2 곡선 상수 둘이 주인 확정값 — need(n) = ' + EXP_A + ' + ' + EXP_B + '·n', A.a + ' / ' + A.b);
  ok(!/sumNeedExp\s*=\s*lv\s*=>\s*5\s*\+/.test(CODE), 'A3 옛 식 `sumNeedExp = lv => 5 + (lv-1)*4` 부재(소스 스캔)');
  ok(!/const\s+SUM_MAXLV\s*=\s*(100|25)\b/.test(CODE),
    'A4 옛 리터럴 `SUM_MAXLV = 100` · `= 25` 부재(소스 스캔 — `SUM_MAXLV_V196` 은 이관 전용이라 별개 이름이다)');

  /* ================= [B] sumNeedExp ================= */
  console.log('[B] 필요 경험치 곡선');
  const B = await page.evaluate(mx => {
    const need = [];
    for (let lv = 1; lv < mx; lv++) need.push(sumNeedExp(lv));
    return { need, tot: need.reduce((a, c) => a + c, 0), nan: need.some(v => !Number.isFinite(v)) };
  }, MAXLV);
  ok(!B.nan, 'B1 Lv1~' + (MAXLV - 1) + ' need 전부 유한(NaN/undefined 0건)');
  ok(B.need.length === MAXLV - 1 && B.need.every((v, i) => v === NEED(i + 1)),
    'B2 Lv1~' + (MAXLV - 1) + ' 이 식과 한 칸도 안 어긋난다',
    B.need.slice(0, 3).join(',') + ' … ' + B.need.slice(-2).join(','));
  ok(B.need[0] === 410 && B.need[24] === 5450 && B.need[MAXLV - 2] === 10490,
    'B3 이정표 — Lv1→2 410 · Lv25 5,450 · Lv' + (MAXLV - 1) + ' 10,490',
    [B.need[0], B.need[24], B.need[MAXLV - 2]].join(' · '));
  ok(B.tot === TOTAL, 'B4 만렙까지 총 경험치 = ' + TOTAL.toLocaleString() + ' 회', B.tot.toLocaleString());

  /* ================= [C] 해금 사다리 ================= */
  console.log('[C] 해금 사다리 — «전설 이상이 영원히 안 나옴» 방지가 핵심');
  const C = await page.evaluate(() => {
    /* 714 — 레벨은 **그 배너의 칸**이다(496 의 공용 스칼라 둘은 사라졌다).
       묻는 것은 안 바뀐다 — «레벨 L 에서 그 배너의 확률표가 어떤가» 다. */
    const at = (b, L) => { const o = sumLv(b); S.sum[b].lv = L; const p = gradeProbs(b); S.sum[b].lv = o; return p; };
    return {
      base: GRADE_ROLL.map(g => g.unlock), eq: GRADE_ROLL_EQ.map(g => g.unlock),
      over: GRADE_ROLL_EQ.filter(g => g.unlock > SUM_MAXLV).length,
      pMax: at('weapon', SUM_MAXLV), pSkill: at('skill', SUM_MAXLV),
      pMaxSum: at('weapon', SUM_MAXLV).reduce((a, c) => a + c, 0)
    };
  });
  ok(C.base.join(',') === LADDER, 'C1 6행 표 해금 ' + LADDER.replace(/,/g, '/'), C.base.join(','));
  ok(C.eq.join(',') === LADDER_EQ, 'C2 8행 표 해금 +초월 40 · 불멸 ' + (MAXLV - 1), C.eq.join(','));
  ok(C.over === 0, 'C3 ★ 만렙(' + MAXLV + ')을 넘는 해금 레벨 0개 — 전 등급 도달 가능', '초과 ' + C.over + '행');
  ok(C.pMax.slice(0, 8).every(v => v > 0), 'C4 장비 배너 만렙 — 8등급 전부 확률 > 0',
    C.pMax.slice(0, 8).map(v => (v * 100).toFixed(3) + '%').join(' / '));
  ok(Math.abs(C.pMaxSum - 1) < 1e-9, 'C5 만렙 확률 합 = 1', C.pMaxSum.toFixed(9));
  ok(C.pSkill.slice(0, 6).every(v => v > 0) && C.pSkill[6] === 0 && C.pSkill[7] === 0,
    'C6 스킬 배너(6행)는 6등급 전부 > 0 · 초월·불멸 0 (회귀)');

  /* ================= [D] sumAddExp 실동작 ================= */
  console.log('[D] 레벨업 실동작');
  const D = await page.evaluate(mx => {
    /* 714 — 실동작은 «무기 배너의 칸» 에서 잰다(496 은 공용 스칼라였다).
       레벨업 규약(need−1 유지 · need 정확히 → 1단계 · 만렙 클램프)은 한 줄도 안 바뀌었다. */
    const set = (lv, exp) => { S.sum.weapon.lv = lv; S.sum.weapon.exp = exp; };
    const snap = () => ({ lv: S.sum.weapon.lv, exp: S.sum.weapon.exp });
    const o = snap();
    const r = {};
    set(1, 0); sumAddExp('weapon', sumNeedExp(1) - 1); r.justUnder = snap();       /* 49 → Lv1 */
    set(1, 0); r.up1 = { up: sumAddExp('weapon', sumNeedExp(1)), ...snap() };      /* 50 → Lv2 */
    set(1, 0); r.up2 = { up: sumAddExp('weapon', sumNeedExp(1) + sumNeedExp(2)), ...snap() };
    /* 표 전량 = 정확히 만렙 */
    set(1, 0); let tot = 0; for (let lv = 1; lv < mx; lv++) tot += sumNeedExp(lv);
    r.upAll = { up: sumAddExp('weapon', tot), ...snap(), tot };
    /* 만렙 초과 소환 — lv 는 안 넘고 exp 는 0 으로 고정 */
    r.overflow = { up: sumAddExp('weapon', 99999), ...snap() };
    /* 714 — 뽑은 배너만 움직였는지도 같이 본다(오염 0) */
    r.others = BKEYS.filter(k => k !== 'weapon').map(k => sumLv(k) + '/' + sumExp(k));
    set(o.lv, o.exp);
    return r;
  }, MAXLV);
  ok(D.justUnder.lv === 1 && D.justUnder.exp === NEED(1) - 1,
    'D1 need−1(' + (NEED(1) - 1) + ') 에서는 Lv1 유지', JSON.stringify(D.justUnder));
  ok(D.up1.lv === 2 && D.up1.exp === 0 && D.up1.up === 1,
    'D2 need(' + NEED(1) + ') 정확히 채우면 Lv2 · 잔여 0', JSON.stringify(D.up1));
  ok(D.up2.lv === 3 && D.up2.up === 2, 'D3 두 단계분을 한 번에 주면 2단계 상승', JSON.stringify(D.up2));
  ok(D.upAll.lv === MAXLV && D.upAll.up === MAXLV - 1 && D.upAll.tot === TOTAL,
    'D4 총 ' + TOTAL.toLocaleString() + ' 경험치 = 정확히 만렙 Lv' + MAXLV, JSON.stringify(D.upAll));
  ok(D.overflow.lv === MAXLV && D.overflow.exp === 0 && D.overflow.up === 0,
    'D5 만렙 초과분은 lv 클램프 + exp 0', JSON.stringify(D.overflow));

  /* ================= [E] 11 확률 팝업 이정표 ================= */
  console.log('[E] 확률 팝업 이정표');
  const E = await page.evaluate(() => {
    const out = { steps: PRB_STEPS.join(','), stepsEq: PRB_STEPS_EQ.join(','),
                  maxlv: SUM_MAXLV, bad: [], empty: [] };
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
  /* 250 — 이정표 나열이 «띄엄띄엄» 이라 폐기됐다(주인 지시). 두 배너 모두 1..만렙 연속.
     196 이 지키려던 «만렙을 리터럴로 굳히지 않는다» 는 SUM_MAXLV 로 세는 형태로 유지. */
  const CONSEC = Array.from({ length: E.maxlv }, (_, i) => i + 1).join(',');
  ok(E.steps === CONSEC, 'E1 PRB_STEPS = 소환 레벨 1..' + E.maxlv + ' 연속 (250)', E.steps.slice(0, 40) + '…');
  ok(E.stepsEq === CONSEC, 'E2 PRB_STEPS_EQ = 소환 레벨 1..' + E.maxlv + ' 연속 (250)', E.stepsEq.slice(0, 40) + '…');
  ok(!/PRB_STEPS\s*=\s*\[1,\s*5,\s*15/.test(CODE), 'E3 옛 리터럴 이정표 [1,5,15,30,40,…] 부재(소스 스캔)');
  ok(E.bad.length === 0, 'E4 전 단계 렌더 NaN/undefined 0건', E.bad.join(' '));
  ok(E.empty.length === 0, 'E5 전 단계에 항목 행이 그려진다(빈 확률 0건)', E.empty.join(' '));

  /* ================= [F] 세이브 이관 =================
     ⚠ 살아 있는 페이지에 localStorage 를 쓰고 reload 하면 그 페이지의 자동 저장이 먼저 덮어쓴다
     (LESSONS 87-3 · 43-①). 주입은 «새 컨텍스트 + addInitScript» 로 한다(LESSONS 44-①). */
  console.log('[F] 세이브 이관');
  const KEYV = await page.evaluate(() => KEY);
  const inject = async obj => {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await c.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEYV, JSON.stringify(obj.sum || obj.sumLv !== undefined ? obj : { sum: obj })]);
    const p2 = await c.newPage();
    p2.on('pageerror', e => errs.push('pageerror(세이브 이관): ' + String(e)));
    await p2.goto(URL);
    await p2.waitForTimeout(900);
    /* 714 — 읽는 자리가 배너 칸으로 옮겨졌다. 아래 단언 모양을 지키려고 대표 한 칸(무기)을
       `lv`·`exp` 에 싣고, 다섯 칸 전부는 `alias` 로 그대로 넘긴다. */
    const r = await p2.evaluate(() => ({ lv: S.sum.weapon.lv, exp: S.sum.weapon.exp,
      alias: JSON.parse(JSON.stringify(BKEYS.map(k => S.sum[k].lv + '/' + S.sum[k].exp))) }));
    await c.close();
    return r;
  };
  /* 714 — 저장 자리가 다시 «배너 5 벌» 이다(496 의 공용 스칼라 둘은 폐지). 이 절이 196 시절부터
     묻던 질문은 «손댄·구 세이브가 들어와도 정상값으로 접히는가» 이고 그건 그대로 유효하다.
     ⚑ [F1]·[F3] 만 방향이 뒤집혔다(333 처방) — 496 은 «다섯이 한 값으로 접힌다» 를 물었고
     714 는 «다섯이 각자 접힌다» 를 묻는다. 자리는 안 비웠다.
     «배너마다 뽑기 수를 안 잃는가» 는 `verify496` [D] · `verify714` [C] 가 묻는다. */
  const F1 = await inject({ weapon: { lv: 100, exp: 37 }, skill: { lv: 60, exp: 4 },
                            shield: { lv: 3, exp: 4 }, amulet: { lv: 25, exp: 0 },
                            pet: { lv: 1, exp: 0 } });
  ok(F1.alias.every(a => { const [l, e] = a.split('/').map(Number);
                           return l >= 1 && l <= MAXLV && Number.isFinite(e); }),
    'F1 구 세이브(배너별 100/60/3/25/1)가 **배너마다** 정상 범위로 접힌다', JSON.stringify(F1.alias));
  ok(F1.alias.every(a => { const [l, e] = a.split('/').map(Number); return l >= MAXLV || e < NEED(l); }),
    'F2 잔여 경험치는 언제나 need 미만(채움률 1000% 가 안 뜬다)', F1.alias.join(' · '));
  ok(new Set(F1.alias).size > 1,
    'F3 ★ 다섯 칸이 **각자** 접힌다 — 496 의 «한 값으로 접힌다» 를 714 가 뒤집었다',
    F1.alias.join(' · '));

  const F2 = await inject({ weapon: { lv: -7, exp: -3 }, skill: { lv: '9', exp: 'x' },
                            shield: { lv: 1 / 0, exp: NaN }, amulet: null, pet: { lv: 1, exp: 0 } });
  ok(F2.alias.every(a => a === '1/0'), 'F4 음수·문자열·비유한·null 만 든 세이브 → 다섯 칸 Lv1/0',
    F2.alias.join(' · '));
  const F2b = await inject({ sumLv: -7, sumExp: 'x' });
  ok(F2b.alias.every(a => a === '1/0'), 'F5 496 세이브도 손댄 값이면 Lv1/0', F2b.alias.join(' · '));
  const F2c = await inject({ sumLv: 9999, sumExp: 9999999 });
  ok(F2c.alias.every(a => a === MAXLV + '/0'),
    'F6 만렙 초과 → 다섯 칸 Lv' + MAXLV + ' · exp 0(496 값은 다섯에 복제된다)', F2c.alias.join(' · '));
  const F2d = await inject({ sumLv: 2, sumExp: 999999 });
  ok(F2d.alias.every(a => a === '2/' + (NEED(2) - 1)), 'F7 need 초과 exp → need−1 로 클램프',
    F2d.alias.join(' · '));
  const F3 = await inject({ sumVer: 2, sum: { weapon:{lv:F1.lv,exp:F1.exp}, skill:{lv:F1.lv,exp:F1.exp},
                                              shield:{lv:F1.lv,exp:F1.exp}, amulet:{lv:F1.lv,exp:F1.exp},
                                              pet:{lv:F1.lv,exp:F1.exp} } });
  ok(F3.lv === F1.lv && F3.exp === F1.exp, 'F8 이관은 멱등(두 번 돌아도 같은 값)',
    JSON.stringify(F3.alias));
  ok([F1, F2, F2b, F2c, F2d, F3].every(o => Number.isFinite(o.lv) && Number.isFinite(o.exp)),
    'F9 이관 후 lv·exp 유한(NaN 0건)');

  /* ================= [G] 10 상점 카드 ================= */
  console.log('[G] 10 상점 소환 카드 표시');
  /* 714 — 레벨이 다시 배너별이라 «무기 칸만 Lv4, 스킬 칸만 만렙» 을 **동시에** 만들 수 있다.
     그래도 이 절의 표본 순서(차례로 두 상태)는 496 것을 그대로 둔다 — 여기가 묻는 것은
     «그 카드가 그 배너의 값을 제대로 찍는가» 이고, 다섯 칸의 독립은 `verify714` [D] 몫이다. */
  const G = await page.evaluate(mx => {
    BKEYS.forEach(k => { S.sum[k].lv = 4; S.sum[k].exp = Math.floor(sumNeedExp(4) / 2); });
    openShopPage(null, 'sum'); renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const read = i => ({ lv: cards[i].querySelector('.clv>i').textContent,
                         bar: cards[i].querySelector('.cbar>b').textContent,
                         w: cards[i].querySelector('.cbar .trk>i').style.width });
    const idx = SHOP_BOXES.findIndex(x => x.b === 'weapon');
    const all = cards.map((_, i) => read(i));
    const w = read(idx), n = cards.length;
    const bad1 = all.some(x => /NaN|undefined/.test(x.lv + x.bar));
    const pct1 = all.map(x => parseFloat(x.w) || 0);
    BKEYS.forEach(k => { S.sum[k].lv = mx; S.sum[k].exp = 0; }); renderShopPage();
    const cards2 = [...document.querySelectorAll('#shopList .shp-card')];
    const idxS = SHOP_BOXES.findIndex(x => x.b === 'skill');
    const s2 = { lv: cards2[idxS].querySelector('.clv>i').textContent,
                 bar: cards2[idxS].querySelector('.cbar>b').textContent,
                 w: cards2[idxS].querySelector('.cbar .trk>i').style.width };
    const all2 = cards2.map(c => ({ lv: c.querySelector('.clv>i').textContent,
                                    bar: c.querySelector('.cbar>b').textContent,
                                    w: c.querySelector('.cbar .trk>i').style.width }));
    return { w, s: s2, n,
             bad: bad1 || all2.some(x => /NaN|undefined/.test(x.lv + x.bar)),
             pct: pct1.concat(all2.map(x => parseFloat(x.w) || 0)) };
  }, MAXLV);
  ok(G.n === 5, 'G1 소환 카드 5장', String(G.n));
  ok(G.w.lv === 'Lv.4' && G.w.bar === Math.floor(NEED(4) / 2) + '/' + NEED(4),
    'G2 Lv4 카드가 «n/' + NEED(4) + '»(식 값)로 찍힌다', G.w.lv + ' ' + G.w.bar);
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
