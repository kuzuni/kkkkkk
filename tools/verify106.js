#!/usr/bin/env node
/* 106 검증 — 동료(펫) 소환 배너 추가 + 동료 8등급 36종 확장
 *
 *   node tools/verify106.js
 *
 * 지시서 [3]-(가) 기계적·기능 작업 — 비평가 없이 헤드리스 실동작만 본다.
 * (카드·격자 기하는 07/26 규격 그대로라 레이아웃 채점 대상이 아니다. 늘어난 것은 «종 수» 뿐이다.)
 *
 *   [A] 데이터   PETS 36종 · 분포 (5,5,5,5,5,5,5,1) · 무기 종 수와 동일 · id 중복 0 · 구 9종 완전 보존
 *   [B] 곡선     PET_M = 0.45·mul^0.88 · PET_CD = 1.30·mul^-0.20 · 신설분 m = PET_M[g]·v
 *                · 등급 간 DPS(m/cd) 단조(등급 g 최댓값 < 등급 g+1 최솟값)
 *   [C] 확률표   rollOf('pet') = 8행(GRADE_ROLL_EQ) · 해금 Lv55/75 · 확률 합 1 · 이정표 8개
 *   [D] 상점     SHOP_BOXES 5장 · «동료 상자» 카드 DOM · 가격 2,250/6,750 · 무료 2/2
 *   [E] 실동작   10연 → 다이아 차감 · 결과 팝업 10장 · S.cnt.sumPet +10 · 보유 종 수 증가 · 소환 Lv 상승
 *   [F] 구 세이브 구 9종 보유 + eqPet 3마리 세이브를 로드해도 보유·장착·레벨 그대로
 *   [G] 26 시트  카드 36장 · 격자 안쪽 스크롤 성립 · [동료 소환] → 상점 동료 상자로 이동
 *   [H] 도감     pet 세트 8개 · 구성원 합 36 · 세트 키 pet:0~7
 *   [I] 콘솔 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, e) => Math.abs(a - b) <= e;

/* 세이브를 심고 새 컨텍스트를 연다(87 교훈 3 · 91 교훈 2 — 살아 있는 페이지에 심으면 자동 저장과 경합한다) */
async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  if (seed) await page.addInitScript(s => { try { localStorage.setItem('idle_hunter_save_v4', s); } catch (_) {} }, seed);
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await open(browser, null);

  /* ---------------- [A] 데이터 ---------------- */
  const A = await page.evaluate(() => {
    const dist = new Array(GRADE.length).fill(0);
    PETS.forEach(p => dist[p.g]++);
    const legacy = {
      bird0: { n: '꼬마 새', g: 0, m: 0.45, cd: 1.30 }, bird1: { n: '화염 조', g: 1, m: 0.60, cd: 1.20 },
      robo0: { n: '수호 로봇', g: 1, m: 0.65, cd: 1.40 }, bird2: { n: '서리 조', g: 2, m: 0.85, cd: 1.10 },
      robo1: { n: '전투 드론', g: 2, m: 0.95, cd: 1.20 }, drag0: { n: '아기 드래곤', g: 3, m: 1.30, cd: 1.10 },
      robo2: { n: '파괴 병기', g: 3, m: 1.40, cd: 1.00 }, drag1: { n: '홍염 드래곤', g: 4, m: 2.20, cd: 0.95 },
      drag2: { n: '황금 드래곤', g: 5, m: 3.40, cd: 0.80 }
    };
    const bad = Object.keys(legacy).filter(id => {
      const p = PT[id], q = legacy[id];
      return !p || p.n !== q.n || p.g !== q.g || p.m !== q.m || p.cd !== q.cd;
    });
    const ids = PETS.map(p => p.id);
    const allIds = SKILLS.concat(EQUIPS, PETS, RELICS).map(x => x.id);
    return {
      len: PETS.length, dist, weapons: EQUIPS.filter(e => e.slot === 'weapon').length,
      uniq: new Set(ids).size, bad, badN: PETS.filter(p => !p.n || /^\d|^$/.test(p.n)).length,
      crossDup: allIds.length - new Set(allIds).size,
      sp: [...new Set(PETS.map(p => p.sp))].sort().join(','),
      noSprite: PETS.filter(p => !PET_SP[p.sp]).length
    };
  });
  ok(A.len === 36, 'A1 PETS 36종', String(A.len));
  ok(JSON.stringify(A.dist) === '[5,5,5,5,5,5,5,1]', 'A2 등급 분포 (5,5,5,5,5,5,5,1)', JSON.stringify(A.dist));
  ok(A.len === A.weapons, 'A3 무기 부위 종 수와 동일', A.len + ' vs ' + A.weapons);
  ok(A.uniq === A.len && A.crossDup === 0, 'A4 id 중복 0 (계열 간 포함)', 'uniq=' + A.uniq + ' cross=' + A.crossDup);
  ok(A.bad.length === 0, 'A5 구 9종 id·이름·등급·m·cd 완전 보존', A.bad.join(',') || '전부 일치');
  ok(A.badN === 0, 'A6 이름이 «사람이 읽는 이름» (자동 생성 번호 금지)', String(A.badN));
  ok(A.sp === 'bird,dragon,robo' && A.noSprite === 0, 'A7 스프라이트 3종만 사용 · 전부 PET_SP 에 있음', A.sp);

  /* ---------------- [B] 곡선 ---------------- */
  const B = await page.evaluate(() => {
    const mErr = GRADE.map((g, i) => Math.abs(PET_M[i] - 0.45 * Math.pow(g.mul, 0.88)));
    const cErr = GRADE.map((g, i) => Math.abs(PET_CD[i] - 1.30 * Math.pow(g.mul, -0.20)));
    /* 신설분(구 9종 제외)은 m 이 PET_M[g] × v 여야 한다 */
    const legacy = ['bird0', 'bird1', 'robo0', 'bird2', 'robo1', 'drag0', 'robo2', 'drag1', 'drag2'];
    const off = PETS.filter(p => legacy.indexOf(p.id) < 0)
      .filter(p => Math.abs(p.m - Math.round(PET_M[p.g] * p.v * 1000) / 1000) > 1e-9 || p.cd !== PET_CD[p.g])
      .map(p => p.id);
    const vs = PETS.filter(p => legacy.indexOf(p.id) < 0).map(p => p.v);
    const dps = {};
    PETS.forEach(p => { (dps[p.g] = dps[p.g] || []).push(p.m / p.cd); });
    const mono = [];
    for (let g = 0; g < GRADE.length - 1; g++) {
      if (!dps[g] || !dps[g + 1]) continue;
      mono.push(Math.max.apply(null, dps[g]) < Math.min.apply(null, dps[g + 1]));
    }
    return { mErr: Math.max.apply(null, mErr), cErr: Math.max.apply(null, cErr), off,
             vMin: Math.min.apply(null, vs), vMax: Math.max.apply(null, vs),
             mono: mono.every(Boolean), monoN: mono.length,
             top: Math.max.apply(null, dps[7]) / Math.min.apply(null, dps[0]) };
  });
  ok(B.mErr <= 0.0005, 'B1 PET_M = 0.45 × mul^0.88', '최대 오차 ' + B.mErr.toFixed(5));
  ok(B.cErr <= 0.005, 'B2 PET_CD = 1.30 × mul^-0.20', '최대 오차 ' + B.cErr.toFixed(5));
  ok(B.off.length === 0, 'B3 신설 27종 m = PET_M[g]×v · cd = PET_CD[g]', B.off.join(',') || '전부 곡선 위');
  ok(B.vMin >= 0.90 && B.vMax <= 1.15, 'B4 개체차 v 는 0.90~1.15', B.vMin + '~' + B.vMax);
  ok(B.mono && B.monoN === 7, 'B5 등급 간 DPS 단조 (g 최대 < g+1 최소)', B.monoN + '경계');
  console.log('     · 불멸/일반 DPS 배수 = ×' + B.top.toFixed(1));

  /* ---------------- [C] 확률표 ---------------- */
  const C = await page.evaluate(() => {
    const r = rollOf('pet'), sum = a => a.reduce((x, y) => x + y, 0);
    const at = L => gradeProbsAt('pet', L);
    prbBank = 'pet';
    const steps = prbSteps().join(',');
    prbBank = 'weapon';
    return { rows: r.length, eq: r === GRADE_ROLL_EQ, u6: r[6] && r[6].unlock, u7: r[7] && r[7].unlock,
             len: at(100).length, s100: sum(at(100)), s1: sum(at(1)),
             p6at54: at(54)[6], p7at74: at(74)[7], p6at100: at(100)[6], p7at100: at(100)[7],
             nan: at(100).concat(at(1)).some(x => !isFinite(x)), steps,
             skillRows: rollOf('skill').length };
  });
  ok(C.rows === 8 && C.eq, 'C1 rollOf(\'pet\') = 8행 표(GRADE_ROLL_EQ)', String(C.rows));
  ok(C.u6 === 55 && C.u7 === 75, 'C2 초월 Lv55 · 불멸 Lv75 해금(85 와 동일)', C.u6 + '/' + C.u7);
  ok(near(C.s100, 1, 1e-9) && near(C.s1, 1, 1e-9) && !C.nan, 'C3 확률 합 1 · NaN 0',
    C.s100.toFixed(6) + ' / ' + C.s1.toFixed(6));
  ok(C.p6at54 === 0 && C.p7at74 === 0 && C.p6at100 > 0 && C.p7at100 > 0,
    'C4 해금 전 0 · 만렙 >0', 'Lv54 g6=' + C.p6at54 + ' · Lv74 g7=' + C.p7at74
    + ' · Lv100 g6=' + (C.p6at100 * 100).toFixed(2) + '% g7=' + (C.p7at100 * 100).toFixed(2) + '%');
  ok(C.steps === '1,5,15,30,40,55,75,100', 'C5 11 확률 팝업 이정표 8개', C.steps);
  ok(C.skillRows === 6, 'C6 스킬 배너는 6행 표 그대로(회귀)', String(C.skillRows));

  /* ---------------- [D] 상점 ---------------- */
  await page.evaluate(() => { S.dia = 1e9; goTab('shop'); });
  await page.waitForTimeout(350);
  const D = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const i = SHOP_BOXES.findIndex(x => x.b === 'pet');
    const card = cards[i];
    const cost = [...(card ? card.querySelectorAll('.cost') : [])].map(e => e.textContent);
    const free = card ? (card.querySelector('.b1 .sub') || {}).textContent : null;
    return { boxes: SHOP_BOXES.length, i, cards: cards.length, on: $('shopw').classList.contains('on'),
             name: card ? card.querySelector('.chd i').textContent : null, cost, free,
             c10: summonCost('pet', 10), c30: summonCost('pet', 30),
             btns: card ? card.querySelectorAll('[data-shsum="pet"]').length : 0 };
  });
  ok(D.boxes === 5 && D.cards === 5, 'D1 상점 소환 탭 상자 5장', D.cards + '장');
  ok(D.i === 4 && D.name === '동료 상자', 'D2 5번째 카드 = «동료 상자»', D.name);
  ok(D.btns === 3, 'D3 소환 버튼 3개(무료 10연 / 💎10연 / 💎30연)', String(D.btns));
  ok(D.c10 === 2250 && D.c30 === 6750, 'D4 펫 가격 현행 유지(73 «펫 현행 유지»)', D.c10 + '/' + D.c30);
  ok(D.cost.join('/') === '2,250/6,750', 'D5 카드 가격 표기 쉼표', D.cost.join('/'));
  ok(D.free === '2/2', 'D6 무료 10연 2/2 (SHOP_FREE 자동 적용)', String(D.free));

  /* ---------------- [E] 10연 실동작 ---------------- */
  /* 73 ③ 회귀 — 가이드 소환 미션(스킬) 진행 중에는 동료 상자도 막힌다. 확인한 뒤 미션을 끝내고 소환한다. */
  const E0 = await page.evaluate(() => {
    S.guide.idx = 0; gmStart();
    const dia = S.dia, blocked = gmBlocked('pet');
    closeModal();
    S.guide.idx = GUIDE.length; gmStart();
    return { blocked, keptDia: S.dia === dia, free: gmBlocked('pet') };
  });
  ok(E0.blocked && E0.keptDia, 'E0 가이드 소환 미션 중 동료 상자 차단(73 ③ 회귀 · 재화 불변)',
    'blocked=' + E0.blocked);
  ok(E0.free === false, 'E0b 미션 종료 후 차단 해제', String(E0.free));

  const E = await page.evaluate(async () => {
    S.dia = 100000; S.cnt.sumPet = 0; S.sum.pet.lv = 1; S.sum.pet.exp = 0;
    const before = { dia: S.dia, own: Object.keys(S.own).filter(k => PT[k]).length, lv: S.sum.pet.lv };
    doSummon('pet', 10);
    await new Promise(r => setTimeout(r, 250));
    const cards = [...document.querySelectorAll('#sumGridIn .sm-c')];
    const n = cards.reduce((a, c) => a + (parseInt((c.querySelector('.sm-fat') || {}).textContent, 10) || 0), 0);
    const petsOnly = Object.keys(S.own).filter(k => PT[k]);
    return { paid: before.dia - S.dia, cnt: S.cnt.sumPet, open: $('sumw').classList.contains('on'),
             cards: cards.length, n, gained: petsOnly.length - before.own, lvUp: S.sum.pet.lv - before.lv,
             onlyPets: petsOnly.length === Object.keys(S.own).filter(k => PT[k]).length,
             stray: Object.keys(S.own).filter(k => !PT[k] && !SK[k] && !EQ[k] && !RL[k]) };
  });
  ok(E.paid === 2250, 'E1 다이아 2,250 차감', String(E.paid));
  ok(E.cnt === 10, 'E2 S.cnt.sumPet +10', String(E.cnt));
  ok(E.open && E.n === 10, 'E3 12 결과 팝업 열림 · 카드 개수 합 10', E.cards + '칸 / 합 ' + E.n);
  ok(E.gained > 0, 'E4 보유 동료 종 수 증가', '+' + E.gained + '종');
  ok(E.lvUp > 0, 'E5 소환 Lv 상승(경험치 연동)', '+' + E.lvUp);
  ok(E.stray.length === 0, 'E6 S.own 에 미확인 id 유입 0', E.stray.join(',') || '없음');

  /* [E7] 11 확률 팝업이 펫 배너로 열리고 36행이 나온다 */
  await page.evaluate(() => { closeSummonResult && closeSummonResult(); openProbInfo('pet', 100); });
  await page.waitForTimeout(250);
  const E7 = await page.evaluate(() => ({
    on: $('prbw').classList.contains('on'),
    rows: document.querySelectorAll('#prbList .prb-row').length,
    heads: document.querySelectorAll('#prbList .prb-gh').length,
    empty: [...document.querySelectorAll('#prbList .prb-row .ic')].filter(e => !e.textContent.trim()).length,
    q: [...document.querySelectorAll('#prbList .prb-row .ic')].filter(e => e.textContent.trim() === '❔').length
  }));
  ok(E7.on && E7.rows === 36 && E7.heads === 8, 'E7 11 확률 팝업 — 8등급 · 36행',
    E7.heads + '등급 / ' + E7.rows + '행');
  ok(E7.empty === 0 && E7.q === 0, 'E8 확률 팝업 아이콘 빈칸·❔ 0건', 'empty=' + E7.empty + ' ❔=' + E7.q);
  await page.evaluate(() => closeProbInfo());

  /* ---------------- [G] 26 동료 시트 ---------------- */
  await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
  await page.waitForTimeout(450);
  const G = await page.evaluate(() => {
    const gp = document.querySelector('#bPet .sk-gp');
    const cards = document.querySelectorAll('#bPet .sk-card');
    const bad = [...cards].filter(c => /undefined/.test(c.getAttribute('style') || '')).length;
    const last = cards[cards.length - 1];
    return { cards: cards.length, sh: gp ? gp.scrollHeight : 0, ch: gp ? gp.clientHeight : 0,
             bad, lastTop: last ? parseFloat(last.style.top) : 0,
             sp: !!document.querySelector('#bPet .sk-gsp') };
  });
  ok(G.cards === 36, 'G1 26 시트 카드 36장', String(G.cards));
  ok(G.sp && G.sh > G.ch, 'G2 격자 안쪽 스크롤 성립(스페이서)', G.sh + ' > ' + G.ch);
  ok(G.bad === 0, 'G3 카드 색 undefined 0건(SK_FILL/SK_RIM 8단)', String(G.bad));

  /* 격자 실제 스크롤 — 마지막 행까지 닿는다 */
  const G4 = await page.evaluate(async () => {
    const gp = document.querySelector('#bPet .sk-gp');
    gp.scrollTop = gp.scrollHeight;
    await new Promise(r => setTimeout(r, 60));
    return { top: gp.scrollTop, max: gp.scrollHeight - gp.clientHeight };
  });
  ok(G4.top > 0 && near(G4.top, G4.max, 1), 'G4 격자 끝까지 스크롤', G4.top + '/' + G4.max);

  /* [G5] [동료 소환] → 상점 «동료 상자» 로 이동 (73 이 «막다른 길» 로 남긴 경로) */
  await page.evaluate(() => {
    const b = document.querySelector('#bPet [data-ptsum]');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const G5 = await page.evaluate(() => {
    const li = $('shopList'), i = SHOP_BOXES.findIndex(x => x.b === 'pet');
    const card = li.children[i];
    const top = card ? card.offsetTop - li.children[0].offsetTop : -1;
    return { on: $('shopw').classList.contains('on'), cat: shopCat, scrolled: li.scrollTop,
             want: Math.max(0, Math.min(top, li.scrollHeight - li.clientHeight)) };
  });
  ok(G5.on && G5.cat === 'summon', 'G5 [동료 소환] → 10 상점 소환 탭 열림', G5.cat);
  ok(near(G5.scrolled, G5.want, 2), 'G6 동료 상자 카드까지 스크롤', G5.scrolled + ' ≈ ' + G5.want);

  /* ---------------- [H] 도감 ---------------- */
  const H = await page.evaluate(() => {
    const sets = COLL_SETS.filter(s => s.tab === 'pet');
    return { n: sets.length, keys: sets.map(s => s.key).join(','),
             members: sets.reduce((a, s) => a + s.it.length, 0),
             dist: sets.map(s => s.it.length).join(','),
             tabs: COLL_TABS.length };
  });
  ok(H.n === 8, 'H1 도감 펫 세트 8개(등급별)', String(H.n));
  ok(H.keys === 'pet:0,pet:1,pet:2,pet:3,pet:4,pet:5,pet:6,pet:7', 'H2 세트 키 pet:0~7', H.keys);
  ok(H.members === 36 && H.dist === '5,5,5,5,5,5,5,1', 'H3 구성원 합 36 · 분포 유지', H.dist);
  ok(H.tabs === 6, 'H4 도감 탭 6개 유지(회귀)', String(H.tabs));

  /* ---------------- [I] 콘솔 에러 ---------------- */
  ok(errs.length === 0, 'I1 콘솔 에러 0건 (본런)', errs.slice(0, 3).join(' | ') || '없음');
  await ctx.close();

  /* ---------------- [F] 구 세이브 호환 ---------------- */
  const seed = JSON.stringify({
    v: 4, gold: 1e6, dia: 5000, stage: 40, best: 40,
    own: { bird0: { n: 3, l: 7 }, robo0: { n: 1, l: 4 }, drag2: { n: 0, l: 12 } },
    eqPet: ['drag2', 'robo0', 'bird0'], eqSkill: [], eqSlot: {},
    coll: {}, sum: { pet: { lv: 12, exp: 3 } }
  });
  const F0 = await open(browser, seed);
  const F = await F0.page.evaluate(() => ({
    own: ['bird0', 'robo0', 'drag2'].map(id => (S.own[id] ? S.own[id].l : 0)).join(','),
    frag: ['bird0', 'robo0', 'drag2'].map(id => (S.own[id] ? S.own[id].n : -1)).join(','),
    eq: S.eqPet.join(','), pets: pets.length, lv: S.sum.pet.lv,
    /* 구 세이브의 «펫» 키가 전부 새 표에 살아 있는지만 본다(로드가 스킬 등 다른 계열을 새로 줄 수 있다) */
    lost: ['bird0', 'robo0', 'drag2'].filter(id => !PT[id]),
    total: PETS.length
  }));
  ok(F.own === '7,4,12', 'F1 구 세이브 동료 레벨 유지', F.own);
  ok(F.frag === '3,1,0', 'F2 구 세이브 조각 수 유지', F.frag);
  ok(F.eq === 'drag2,robo0,bird0', 'F3 S.eqPet 3마리 순서까지 유지', F.eq);
  ok(F.pets === 3, 'F4 전투 동료 3마리 스폰(syncPets)', String(F.pets));
  ok(F.lv === 12, 'F5 소환 Lv 유지', String(F.lv));
  ok(F.lost.length === 0 && F.total === 36, 'F6 구 펫 id 전부 새 표에 존재 · 36종',
    F.lost.join(',') || (F.total + '종'));
  ok(F0.errs.length === 0, 'F7 구 세이브 로드 콘솔 에러 0건', F0.errs.slice(0, 3).join(' | ') || '없음');
  await F0.ctx.close();

  await browser.close();
  console.log('\nVERIFY106 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
