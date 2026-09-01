/* 작업 195 회귀 게이트 — «펫 소환 가격을 다른 배너와 동일하게»
 *
 *   주인 지시(2026-08-27): «펫도 다른 거랑 소환 가격 같게».
 *   73 ④ 가 무기·방패·목걸이·스킬 4배너를 `cost:100 + flat:1`(10회 1,000 · 30회 3,000) 로 통일하면서
 *   «펫·유물은 현행 유지» 지시 때문에 펫만 `cost:250` + 10연 0.9 할인으로 남겨 뒀다(= 2,250 / 6,750).
 *   195 가 그 예외를 폐기한다. 유물은 89 가 소환 배너 자체를 없앴으므로 대상이 아니다.
 *
 *   실행: node tools/verify195.js   → 마지막 줄이 `VERIFY195 n/n PASS` 여야 한다.
 *
 *   본다:
 *     [A] 데이터   BANNERS.pet = cost 100 · flat 참 · 5배너 전수 동일(값이 아니라 «갈리지 않음» 으로도 본다)
 *     [B] 산식     summonCost 1/10/30 이 5배너 전수 동일 · 30 = 10×3(할인 0건) · 1회 × 10 = 10연(할인 0 확인)
 *     [C] 표시     10 상점 «펫 상자» 카드 `.cost` 2칸 · 12 결과 팝업 `#sumB10c/#sumB30c` 가 1,000 / 3,000
 *     [D] 실동작   펫 상자 [💎10연]·[💎30연] **버튼을 실제로 눌러** 차감액·획득 수·결과 팝업·세이브 반영 확인
 *     [E] 부족표시 102 «회색+빨강» 경계가 새 가격을 따라간다 — 999 다이아면 lack, 1,000 이면 해제
 *     [F] 무료     무료 10연(`data-shfree`)은 가격과 무관하게 그대로 (차감 0 · freeLeft −1)
 *     [G] 체인     73 ② 가이드 보상은 `summonCost()` 결합이라 하드코딩 유입 0 · 펫 소환 미션 없음(확인)
 *                  (565 — 498 이 그 결합을 `max(곡선, 10연)` **하한**으로 남겼다. 값이 아니라
 *                   «상자 값을 올리면 따라오는가» 로 재고, 상수 사본에서 빨개지는지까지 본다)
 *     [H] 세이브   가격은 세이브에 안 들어간다 — 구 세이브를 그대로 읽고 새 가격으로 소환된다(마이그레이션 불요)
 *     [I] 콘솔     에러 0건
 *
 *   ⚠ 이 게이트는 **되돌림 시험**을 겸한다: `cost:250`/`flat` 제거로 되돌리면 [A][B][C][D][E] 가 FAIL 해야 한다
 *      (2026-08-27 실측: 되돌린 상태에서 14건 FAIL — 아래 «되돌림» 주석 참조).
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

/* 세이브를 심고 새 컨텍스트를 연다(87 교훈 3 · 91 교훈 2 — 살아 있는 페이지에 심으면 자동 저장과 경합한다) */
async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  if (seed) await page.addInitScript(s => { try { localStorage.setItem('idle_hunter_save_v4', s); } catch (_) {} }, seed);
  await page.goto(URL);
  await page.waitForFunction(() => typeof BANNERS !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

/* 226 교훈 — 60 `jzStagger` 카드 등장(scale .94 → 1.02 → 1)이 도는 동안 잰 기하는 흔들린다.
   고정 대기를 늘리지 말고 **기하가 멈출 때까지 폴링**한 뒤 잰다. */
async function settleShop(page) {
  await page.waitForFunction(() => {
    const l = document.getElementById('shopList');
    if (!l) return false;
    const k = l.scrollHeight + ':' + [...l.querySelectorAll('.shp-card')].map(c => Math.round(c.getBoundingClientRect().height)).join(',');
    if (window.__k195 === k) return (window.__n195 = (window.__n195 || 0) + 1) >= 3;
    window.__k195 = k; window.__n195 = 0; return false;
  }, null, { timeout: 8000 });
}

/* 496 — 소환 레벨이 «배너별 5 벌» 에서 «전 배너 공용 하나» 로 내려왔다. 구 세이브의 레벨 숫자는
   그대로 남지 않고 **뽑기 수를 보존한 채** 새 곡선(need = 200 + 210·n) 위로 다시 놓인다.
   이 항이 지키려던 것은 «구 세이브가 손해 없이 그대로 로드되는가» 이므로, 숫자 12 를 그대로
   기대하는 대신 **구 곡선으로 되돌려 센 뽑기 수가 보존되는가** 를 묻는다(그래야 이관이 사라지면
   빨개진다 — 숫자만 갈아 끼우면 «값이 무엇이든 초록» 인 헛초록이 된다). */
const V196_TBL = [50, 200, 500, 800, 1200, 1500, 1800, 2100, 2300, 2600,
                  3000, 3300, 3600, 4000, 4500, 5000];
const v196Need = lv => V196_TBL[Math.min(Math.max(lv | 0, 1), V196_TBL.length) - 1];
const v496Pulls = (lv, exp) => { let t = exp || 0; for (let n = 1; n < lv; n++) t += v196Need(n); return t; };

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await open(browser, null);

  /* ---------------- [A] 데이터 ---------------- */
  const A = await page.evaluate(() => ({
    cost: BANNERS.pet.cost, flat: !!BANNERS.pet.flat,
    keys: BKEYS,
    costs: BKEYS.map(k => BANNERS[k].cost),
    noFlat: BKEYS.filter(k => !BANNERS[k].flat),
    hasRelic: 'relic' in BANNERS
  }));
  ok(A.cost === 100, 'A1 BANNERS.pet.cost = 100 (250 → 100)', String(A.cost));
  ok(A.flat, 'A2 BANNERS.pet.flat 참 (10연 0.9 할인 제외)', String(A.flat));
  ok(new Set(A.costs).size === 1, 'A3 배너 전수 cost 동일 — 값이 갈리지 않는다',
    A.keys.map((k, i) => k + ':' + A.costs[i]).join(' '));
  ok(A.noFlat.length === 0, 'A4 flat 이 아닌 배너 0개', A.noFlat.join(',') || '없음');
  ok(!A.hasRelic, 'A5 유물은 소환 배너가 아니다(89 회귀 — 195 대상 아님)', String(A.hasRelic));

  /* ---------------- [B] 산식 ---------------- */
  const B = await page.evaluate(() => {
    const o = {};
    BKEYS.forEach(k => o[k] = { c1: summonCost(k, 1), c10: summonCost(k, 10), c30: summonCost(k, 30) });
    return o;
  });
  const keys = A.keys;
  ok(keys.every(k => B[k].c10 === 1000), 'B1 전 배너 10연 = 1,000',
    keys.map(k => k + ':' + B[k].c10).join(' '));
  ok(keys.every(k => B[k].c30 === 3000), 'B2 전 배너 30연 = 3,000',
    keys.map(k => k + ':' + B[k].c30).join(' '));
  ok(keys.every(k => B[k].c30 === B[k].c10 * 3), 'B3 30연 = 10연 × 3 (할인 없음)', '전 배너');
  /* 할인이 남아 있으면 `c1 × 10 !== c10` 으로 드러난다(0.9 가 붙는 지점이 정확히 여기다) */
  ok(keys.every(k => B[k].c1 * 10 === B[k].c10), 'B4 1회 × 10 = 10연 (10연 할인 0)',
    keys.map(k => k + ':' + B[k].c1 + '×10').join(' '));
  ok(B.pet.c10 === B.weapon.c10 && B.pet.c30 === B.weapon.c30,
    'B5 펫 = 무기 (주인 지시 «펫도 다른 거랑 소환 가격 같게»)',
    '펫 ' + B.pet.c10 + '/' + B.pet.c30 + ' · 무기 ' + B.weapon.c10 + '/' + B.weapon.c30);

  /* ---------------- [C] 표시 ---------------- */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; gmStart(); openShopPage('pet'); });
  await settleShop(page);
  const C = await page.evaluate(() => {
    const i = SHOP_BOXES.findIndex(x => x.b === 'pet');
    const card = document.querySelectorAll('#shopList .shp-card')[i];
    const cost = [...card.querySelectorAll('.cost')].map(e => e.textContent.trim());
    /* 12 결과 팝업의 재소환 버튼 3개는 같은 상태·같은 함수를 쓴다(index.html «syncSummonBtns») */
    sumCtx = 'pet'; syncSummonBtns();
    return { name: card.querySelector('.chd i').textContent, cost,
             b10: $('sumB10c').textContent.trim(), b30: $('sumB30c').textContent.trim() };
  });
  ok(C.name === '펫 상자', 'C0 대상 카드 = «펫 상자»', C.name);
  ok(C.cost.join('/') === '1,000/3,000', 'C1 10 상점 카드 표기 1,000 / 3,000 (쉼표)', C.cost.join('/'));
  ok(C.b10 === '1,000' && C.b30 === '3,000', 'C2 12 결과 팝업 재소환 버튼 표기', C.b10 + ' / ' + C.b30);

  /* ---------------- [D] 실동작 — 버튼을 «누른다» ---------------- */
  /* 기능 완성 규칙(2026-08-25 주인 지시): «만들어 놓음» 이 아니라 «눌렀을 때 실제로 바뀜» 이 완료 조건이다.
     evaluate 로 doSummon 을 부르면 74 «탭 유실» 계열 결함을 지나친다 — 실제 click 으로 간다. */
  await page.evaluate(() => { S.dia = 100000; S.cnt.sumPet = 0; closeSummonResult(); });
  const before10 = await page.evaluate(() => ({ dia: S.dia, cnt: S.cnt.sumPet }));
  /* ⚠ `[data-shsum="pet"][data-shn="10"]` 은 **두 칸**을 문다 — `.b1` 은 무료 10연(같은 shn=10, 여기에
     `data-shfree` 가 더 붙는다)이라 그쪽이 먼저 잡히면 차감 0 으로 «통과처럼» 보인다. 유료 칸은 `.b2` 다. */
  await page.click('#shopList .shp-card:nth-child(5) .cbtn.b2[data-shsum="pet"]');
  await page.waitForTimeout(300);
  const D10 = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#sumGridIn .sm-c')];
    return { dia: S.dia, cnt: S.cnt.sumPet, open: $('sumw').classList.contains('on'),
             n: cards.reduce((a, c) => a + (parseInt((c.querySelector('.sm-fat') || {}).textContent, 10) || 0), 0) };
  });
  ok(before10.dia - D10.dia === 1000, 'D1 [💎10연] 클릭 → 다이아 1,000 차감', String(before10.dia - D10.dia));
  ok(D10.cnt - before10.cnt === 10, 'D2 S.cnt.sumPet +10', '+' + (D10.cnt - before10.cnt));
  ok(D10.open && D10.n === 10, 'D3 12 결과 팝업 열림 · 카드 합 10', '합 ' + D10.n);

  /* 결과 팝업의 [💎30연] 재소환 버튼 — 같은 경로를 다른 진입점에서 한 번 더 */
  const before30 = await page.evaluate(() => ({ dia: S.dia, cnt: S.cnt.sumPet }));
  await page.click('#sumB30');
  await page.waitForTimeout(300);
  const D30 = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#sumGridIn .sm-c')];
    return { dia: S.dia, cnt: S.cnt.sumPet,
             n: cards.reduce((a, c) => a + (parseInt((c.querySelector('.sm-fat') || {}).textContent, 10) || 0), 0),
             saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').dia };
  });
  ok(before30.dia - D30.dia === 3000, 'D4 [💎30연] 클릭 → 다이아 3,000 차감', String(before30.dia - D30.dia));
  ok(D30.cnt - before30.cnt === 30, 'D5 S.cnt.sumPet +30', '+' + (D30.cnt - before30.cnt));
  ok(D30.n === 30, 'D6 결과 카드 합 30', '합 ' + D30.n);
  ok(D30.saved === D30.dia, 'D7 세이브(localStorage)에 차감 반영', D30.saved + ' = ' + D30.dia);

  /* ---------------- [E] 부족 표시 경계 (102) ---------------- */
  const E = await page.evaluate(() => {
    const read = () => ({ lack: $('sumB10').classList.contains('lack'), dis: $('sumB10').disabled });
    sumCtx = 'pet';
    S.dia = 999;  syncSummonBtns(); const under = read();
    S.dia = 1000; syncSummonBtns(); const at = read();
    S.dia = 2249; syncSummonBtns(); const mid = read();   /* 옛 가격(2,250)이면 여기서 lack 이어야 했다 */
    return { under, at, mid };
  });
  ok(E.under.lack && E.under.dis, 'E1 999 다이아 → 회색+빨강(lack) · disabled', JSON.stringify(E.under));
  ok(!E.at.lack && !E.at.dis, 'E2 1,000 다이아 → 해제 (경계가 새 가격을 따라간다)', JSON.stringify(E.at));
  ok(!E.mid.lack, 'E3 2,249 다이아도 구매 가능 (옛 2,250 경계 소멸)', JSON.stringify(E.mid));

  /* ---------------- [F] 무료 10연은 가격과 무관 ---------------- */
  /* 무료 횟수 차감은 `doSummonFree` 가 아니라 **호출부**(카드 클릭 핸들러)가 한다 — 함수를 직접 부르면
     차감이 안 일어나 «무료가 안 준다» 는 잘못된 결론이 난다. 그래서 여기서도 실제 `.b1` 칸을 누른다. */
  await page.evaluate(() => { S.dia = 50000; closeSummonResult(); openShopPage('pet'); });
  await settleShop(page);
  const F0 = await page.evaluate(() => ({ dia: S.dia, fl: freeLeft('pet') }));
  await page.click('#shopList .shp-card:nth-child(5) .cbtn.b1[data-shfree]');
  await page.waitForTimeout(300);
  const F = await page.evaluate(() => ({ dia: S.dia, fl: freeLeft('pet'),
    open: $('sumw').classList.contains('on') }));
  ok(F0.dia - F.dia === 0, 'F1 무료 10연 차감 0 (가격 변경과 무관)', String(F0.dia - F.dia));
  ok(F0.fl - F.fl === 1 && F.open, 'F2 무료 횟수 −1 · 결과 팝업', F0.fl + ' → ' + F.fl);

  /* ---------------- [G] 73 ② 보상 체인 ---------------- */
  /* 565 (2026-08-31) — 옛 G1 은 «함수형 보상 = 그 소환의 10연(1,000)» 을 **값으로** 물었다.
     498(주인 위임 «첫날 100만»)이 가이드 보상을 한 줄 곡선 `gmDiaAt(i)` 으로 갈면서 세 칸을
     `max(곡선, 원래 함수)` = **하한**으로 남겼고, 곡선(13,000·19,000·21,000)이 10연 정가(1,000)를
     이겨 옛 항이 빨개졌다. `probe565` 로 재현해 등재문의 갈래 ⓐ(«하드코딩으로 되돌아갔다»)를
     **기각**했다 — 표는 여전히 함수형이고, 셋 다 곡선값과 1원 단위로 같다.
     ⇒ 자리를 비우지 않고(333 처방) 같은 뜻을 **살아 있는 증언**으로 갈아 끼운다:
     «값이 1,000 인가» 가 아니라 **«그 값이 상자 가격을 실제로 따라오는가»** 를 묻는다.
     ⚠ 값만 다시 적으면(1,000 → 13,000) 곡선 상수를 베낀 사본이 되고, 결합이 통째로
        사라져도 초록이다. 그래서 [G1-b] 가 **상자를 곡선 위로 올려** 따라오는지 보고,
        [G1-d] 가 **상수로 갈아 끼운 사본**에서 그 항이 빨개지는지까지 본다. */
  const HIGH195 = 90000;   /* 10연 = 900,000 — 곡선 최대(idx19 = 49,000)보다 확실히 크다 */
  const G = await page.evaluate((HIGH) => {
    const fnIdx = GUIDE.map((m, i) => (typeof m.dia === 'function' ? i : -1)).filter(i => i >= 0);
    const vals  = fnIdx.map(i => gmDia(GUIDE[i]));
    const curve = fnIdx.map(i => gmDiaAt(i));
    const c10   = BKEYS.reduce((o, b) => (o[b] = summonCost(b, 10), o), {});
    const nextBan = fnIdx.map(i => (GUIDE[i + 1] || {}).ban || null);

    /* 상자를 한 종류씩 곡선 위로 올려 «어느 칸이 따라오는가» 를 행동으로 잰다 */
    const probe = () => {
      const moved = {};
      for (const b of BKEYS) {
        const keep = BANNERS[b].cost;
        BANNERS[b].cost = HIGH;
        const want = summonCost(b, 10);
        moved[b] = fnIdx.filter(i => gmDia(GUIDE[i]) === want);
        BANNERS[b].cost = keep;                       /* 즉시 복원 — 뒤 절을 오염시키지 않는다 */
      }
      return moved;
    };
    const moved = probe();

    /* 음성 사본 — 세 칸을 «지금 값 그대로» 상수로 굳히면 결합이 죽어야 한다 */
    const keepFns = fnIdx.map(i => GUIDE[i].dia);
    fnIdx.forEach((i, k) => { GUIDE[i].dia = vals[k]; });
    const negMoved = probe();
    fnIdx.forEach((i, k) => { GUIDE[i].dia = keepFns[k]; });

    return { fnIdx, vals, curve, c10, nextBan, moved, negMoved,
             back: fnIdx.map(i => gmDia(GUIDE[i])),
             stillFn: fnIdx.every(i => typeof GUIDE[i].dia === 'function'),
             bans: GUIDE.filter(m => m.ban).map(m => m.ban),
             petMission: GUIDE.some(m => m.ban === 'pet') };
  }, HIGH195);

  const gPair = {};
  Object.entries(G.moved).forEach(([b, a]) => a.forEach(i => { gPair[i] = b; }));
  const gMovedAll = Object.values(G.moved).reduce((a, x) => a.concat(x), []).sort((a, b) => a - b);
  const gNegAll   = Object.values(G.negMoved).reduce((a, x) => a.concat(x), []);

  ok(G.fnIdx.length === 3 && G.stillFn &&
     G.vals.every((v, k) => v === Math.max(G.curve[k], G.c10[G.nextBan[k]])),
    'G1 함수형 보상 3칸 = max(498 곡선, 다음 상자 10연) — 하한 결합 그대로',
    G.fnIdx.map((i, k) => 'idx' + i + ' ' + G.vals[k] + '=max(' + G.curve[k] + ',' + G.c10[G.nextBan[k]] + ')').join(' · '));
  ok(gMovedAll.join(',') === G.fnIdx.join(','),
    'G1-b ★ 결합이 살아 있다 — 상자 10연을 곡선 위로 올리면 세 칸이 그 값을 그대로 따라간다 (하드코딩 유입 0)',
    '[' + gMovedAll.join(',') + '] / 함수형 [' + G.fnIdx.join(',') + ']');
  ok(gMovedAll.length === new Set(gMovedAll).size &&
     G.fnIdx.every((i, k) => gPair[i] === G.nextBan[k]),
    'G1-c 73 ② — 각 칸이 반응하는 상자 = **다음 미션의 상자**(칸↔상자 1:1)',
    G.fnIdx.map((i, k) => 'idx' + i + '→' + gPair[i] + '(다음 ' + G.nextBan[k] + ')').join(' · '));
  ok(gNegAll.length === 0,
    'G1-d ☆ 되돌림 — 세 칸을 상수로 굳힌 사본에서는 어느 상자도 칸을 못 움직인다 (G1-b 가 실제로 결합을 잰다)',
    gNegAll.length ? '움직인 칸 [' + gNegAll.join(',') + ']' : '0칸');
  ok(G.back.every((v, k) => v === G.curve[k]),
    'G1-e 상자 값을 되돌리면 다시 곡선값 — max 는 «대체» 가 아니라 «하한»', G.back.join(','));
  ok(!G.petMission, 'G2 가이드에 «펫 소환» 미션 없음 → 73 ② 체인 영향 0', G.bans.join(',') || '없음');

  /* ---------------- [H] 구 세이브 ---------------- */
  /* 가격은 세이브에 안 들어간다(BANNERS 는 코드 상수) — 마이그레이션·KEY 인상 불요임을 실측으로 못박는다. */
  const seed = JSON.stringify({ dia: 5000, sum: { pet: { lv: 12, exp: 3 } },
    cnt: { sumPet: 7 }, eqPet: ['drag2', 'robo0', 'bird0'], own: { drag2: { lv: 7 }, robo0: { lv: 4 }, bird0: { lv: 12 } } });
  const { ctx: ctx2, page: p2, errs: errs2 } = await open(browser, seed);
  const H = await p2.evaluate(async () => {
    /* 714 — 소환 진행도가 다시 배너 칸이다(496 의 공용 스칼라 둘은 폐지). 이 씨앗이 담은
       것은 **펫 칸** 하나이므로 되돌려 셀 자리도 펫 칸이다 — 묻는 것(뽑기 수 보존)은 그대로. */
    const lv = S.sum.pet.lv, eq = S.eqPet.slice(), before = S.dia;
    let back = S.sum.pet.exp; for (let n = 1; n < S.sum.pet.lv; n++) back += sumNeedExp(n);
    /* 73 ③ — 구 세이브는 `S.guide.idx` 가 0(=«스킬 1회 소환» 미션)이라 펫 소환이 **차단**된다.
       여기서 보려는 건 가격이지 차단이 아니므로 가이드를 끝낸 상태로 맞춘다(차단 자체는 verify73 §4 몫). */
    S.guide.idx = GUIDE.length; gmStart(); closeModal();
    doSummon('pet', 1);
    await new Promise(r => setTimeout(r, 200));
    return { lv, back, eq: eq.join(','), paid: before - S.dia, c10: summonCost('pet', 10) };
  });
  ok(H.back === v496Pulls(12, 3) && H.eq === 'drag2,robo0,bird0',
    'H1 ★ 구 세이브 그대로 로드 — 펫 배너 진행도 ' + v496Pulls(12, 3).toLocaleString()
      + ' 뽑 보존(714 배너 독립 이관) · 장착 펫 유지',
    'Lv' + H.lv + ' = ' + H.back.toLocaleString() + ' 뽑 / ' + H.eq);
  ok(H.paid === 100, 'H2 구 세이브에서도 1회 소환 = 100 (마이그레이션 불요)', String(H.paid));
  ok(H.c10 === 1000, 'H3 구 세이브에서도 10연 = 1,000', String(H.c10));

  /* ---------------- [I] 콘솔 ---------------- */
  ok(errs.length === 0, 'I1 콘솔 에러 0건 (본런)', errs.slice(0, 2).join(' | ') || '없음');
  ok(errs2.length === 0, 'I2 콘솔 에러 0건 (구 세이브 런)', errs2.slice(0, 2).join(' | ') || '없음');

  await ctx2.close(); await ctx.close(); await browser.close();
  console.log('\nVERIFY195 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
