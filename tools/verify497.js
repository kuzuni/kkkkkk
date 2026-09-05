#!/usr/bin/env node
/* 497 검증 — 다이아 팩 5종 지급량 «×2» · 마일리지 교환 다이아 «×2» · 가격·쿠폰 수 불변
 *
 *   node tools/verify497.js
 *
 * 지시서 [3]-(가) 기계적/상수 작업이므로 비평가는 띄우지 않는다. PROGRESS 497 «게이트» 항목 그대로:
 *   [A] 상수 — 5팩 dia = 116 값 ×2(10,000 / 70,000 / 150,000 / 900,000 / 2,000,000) ·
 *       `MILE_DIA` 500만 · `won`·`cp`·`MILE_NEED`·상품 id 불변
 *   [B] 표기 — 카드 수량 라벨이 `fmt(dia)` 파생(손으로 적은 문자열 없음) · 카드 안쪽 넘침 0칸(470/477 규약) ·
 *       마일리지 패널 문구·33 재화 정보 «마일리지» 획득처가 **팩 표에서 파생**(하드코딩 잔재 부재)
 *   [C] 지급 경로 — `devBuyDia` 5종 → 우편 1통 → 수령 시 `S.dia` 증가분이 새 값(153 회귀) ·
 *       마일리지 교환 10개 → 500만
 *   [D] 안 건드린 것 — 룰렛·광고 상품 다이아 수량은 지시 ③ 대로 불변
 *       ⚠ **588(2026-08-31) 이관** — 이 절이 «이용권 대체가 `PASS_OFFPLUS_DIA` 5만 불변» 으로 재던 자리는
 *       주인 지시(«그 이용권들은 다이아로 못사게 하기»)로 **선언째 사라졌다.** 497 의 결정이 뒤집힌 것이
 *       아니라 그 상품의 다이아 경로 자체가 없어진 것이므로, 자리를 비우지 않고(333 처방) 같은 성질을
 *       **반대 방향**으로 묻는다: 세 상수·`PASS_ITEMS[].dia` 가 전부 없고, 그래도 497 이 만진 판매
 *       축(`DIA_PACKS`)은 한 칸도 안 흔들렸는가.
 *   [E] 구 세이브 — 이미 받은 다이아·쿠폰 무변경(마이그레이션 없음, KEY 안 올림)
 *   [R] 되돌림 시험 — 116 의 «÷2» 값으로 되돌린 사본은 [A]·[C] 가 빨개진다(무르게 풀지 않았다는 증거)
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* 기대값은 «화면이 쓴 식» 이 아니라 «화면이 써야 할 근거» 에서 만든다(LESSONS 212-①).
   근거 = 116 이 절반으로 내리기 전의 값 = 주인 확정 «×2». */
const DIA116 = [5000, 35000, 75000, 450000, 1000000];
const DIA = DIA116.map(d => d * 2);           /* 10,000 / 70,000 / 150,000 / 900,000 / 2,000,000 */
const MILE116 = 2500000, MILE = MILE116 * 2;  /* 5,000,000 */
const WON = [1000, 5000, 11000, 55000, 110000];
const CP = [0, 0, 0, 1, 2];
const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const openCoin = page => page.evaluate(() => {
  openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await page.waitForTimeout(400);

  /* ================= [A] 상수 ================= */
  const A = await page.evaluate(() => ({
    dia: DIA_PACKS.map(p => p.dia), won: DIA_PACKS.map(p => p.won), cp: DIA_PACKS.map(p => p.cp),
    ids: DIA_PACKS.map(p => p.id), mile: MILE_DIA, need: MILE_NEED,
  }));
  ok(JSON.stringify(A.dia) === JSON.stringify(DIA), 'A1 5팩 dia = ' + DIA.map(comma).join(' / ') + ' (116 값 ×2)', A.dia.join('·'));
  ok(A.dia.every((d, i) => d === DIA116[i] * 2), 'A2 다섯 칸이 «정확히 2배» — 곡선을 새로 짜지 않았다',
     A.dia.map((d, i) => (d / DIA116[i]).toFixed(2)).join('/'));
  ok(A.mile === MILE, 'A3 MILE_DIA = ' + comma(MILE) + ' (250만 ×2)', String(A.mile));
  ok(JSON.stringify(A.won) === JSON.stringify(WON), 'A4 가격(won) 불변 — 지시 ③', A.won.join('·'));
  ok(JSON.stringify(A.cp) === JSON.stringify(CP), 'A5 쿠폰 수(cp) 0/0/0/1/2 불변 — 지시 ③', A.cp.join('·'));
  ok(A.need === 10, 'A6 MILE_NEED = 10 불변 — 지시 ③', String(A.need));
  ok(JSON.stringify(A.ids) === JSON.stringify(['d1', 'd2', 'd3', 'd4', 'd5']), 'A7 상품 id 5종 유지(세이브가 id 로 기억한다)', A.ids.join('·'));
  /* 116 값의 «부재» 는 런타임으로 못 본다 — 소스 스캔이다(LESSONS 111-1 ⓐ) */
  const back = [/dia:\s*5000\b/, /dia:\s*35000\b/, /dia:\s*75000\b/, /dia:\s*450000\b/, /dia:\s*1000000\b/,
    /MILE_DIA\s*=\s*2500000/];
  ok(back.every(r => !r.test(SRC)), 'A8 116 «÷2» 리터럴 부재(소스 스캔)',
     back.filter(r => r.test(SRC)).map(String).join(' ') || '0건');

  /* ================= [B] 표기 ================= */
  await openCoin(page);
  await page.waitForTimeout(200);
  if (page.settle291) await page.settle291();   /* 921 — 여는 동작 뒤 <250ms 대기라 291 훅이 구조적으로 안 돈다(915 선례) */
  const B = await page.evaluate(() => {
    const cards = [];
    document.querySelectorAll('#shopList .cn-cd.dia').forEach(cd => {
      const q = cd.querySelector('.qt'), bg = cd.querySelector('.bg');
      const qr = q.getBoundingClientRect(), br = bg.getBoundingClientRect();
      cards.push({ t: q.textContent, w: +qr.width.toFixed(1),
        l: +(qr.left - br.left).toFixed(1), r: +(br.right - qr.right).toFixed(1) });
    });
    const rw = document.querySelector('#cnMile .rw');
    return {
      cards,
      derived: DIA_PACKS.every(p => p.q === '×' + fmt(p.dia)),
      name: diaPackName(DIA_PACKS[4]),
      mileTxt: rw ? rw.textContent.replace(/\s+/g, ' ').trim() : '(없음)',
      ways: CURINFO.mile.ways.slice(),
      cpPacks: DIA_PACKS.filter(p => p.cp).map(p => p.dia),
      nan: (document.getElementById('shopList').innerText.match(/NaN|undefined/g) || []).length,
    };
  });
  ok(B.cards.length === 5, 'B1 다이아 카드 5칸 렌더', String(B.cards.length));
  ok(JSON.stringify(B.cards.map(c => c.t)) === JSON.stringify(DIA.map(d => '×' + comma(d))),
     'B2 카드 라벨 = ' + DIA.map(d => '×' + comma(d)).join(' '), B.cards.map(c => c.t).join(' '));
  ok(B.derived, 'B3 라벨은 손으로 적은 문자열이 아니라 fmt(dia) 파생 — 값과 라벨이 어긋날 수 없다');
  const over = B.cards.filter(c => c.l < 0 || c.r < 0);
  ok(over.length === 0, 'B4 라벨이 카드 안쪽(.bg)을 넘치는 칸 0 — 470/477 규약',
     over.length ? over.map(c => c.t + ' l' + c.l + '/r' + c.r).join(', ')
                 : '좌여백 최소 ' + Math.min(...B.cards.map(c => c.l)).toFixed(1) + 'px · 우여백 ' + B.cards[0].r + 'px');
  ok(B.name === '다이아 ' + comma(DIA[4]) + '개', 'B5 구매 팝업 상품명도 같은 표기', B.name);
  ok(B.mileTxt.includes(comma(MILE)), 'B6 마일리지 패널 문구에 ' + comma(MILE), B.mileTxt);
  /* 하드코딩 잔재 — 116 이 값을 내린 뒤 이 줄만 «90만 · 200만» 으로 굳어 실제 팩과 어긋나 있었다(probe497 [4]).
     497 에서 팩 표 파생으로 바꿨으므로 «값이 또 움직여도 문구가 따라온다» 를 여기서 못박는다. */
  ok(B.cpPacks.every(d => B.ways[0].includes(comma(d))),
     'B7 33 재화 정보 «마일리지» 획득처가 쿠폰 팩(cp>0) 값과 일치', '«' + B.ways[0] + '»');
  ok(!/90만|200만|45만|100만/.test(B.ways[0]), 'B8 그 문구에 손으로 적은 «n만» 잔재 0건', '«' + B.ways[0] + '»');
  ok(B.ways[1].includes(comma(MILE)), 'B9 획득처 둘째 줄(교환)도 MILE_DIA 파생', '«' + B.ways[1] + '»');
  ok(B.nan === 0, 'B10 13 재화 탭 텍스트에 NaN/undefined 0건', String(B.nan));

  /* ================= [C] 지급 경로 ================= */
  const C = await page.evaluate(ids => ids.map(id => {
    const d0 = S.dia, m0 = S.mileage || 0, n0 = (S.mailx || []).length;
    devBuyDia(id);
    const dMail = S.mailx.length - n0;
    const immediate = S.dia - d0;                 /* 697 — 구매 직후에 상품 표대로 들어와야 한다 */
    return { id, immediate, dDia: S.dia - d0, dCp: (S.mileage || 0) - m0, dMail };
  }), ['d1', 'd2', 'd3', 'd4', 'd5']);
  C.forEach((r, i) => ok(r.dDia === DIA[i], 'C' + (i + 1) + ' ' + r.id + ' 구매 그 틱에 S.dia +' + comma(DIA[i]), '+' + r.dDia));
  /* 697 이관 — 497 이 지키는 것은 «수량» 이고 경로는 153 → 697 로 뒤집혔다(우편 0 · 즉시). */
  ok(C.every((r, i) => r.immediate === DIA[i] && r.dMail === 0), 'C6 지급은 즉시(구매 직후 표대로 · 새 우편 0) — 697',
     C.map(r => r.immediate + '/' + r.dMail).join(' '));
  ok(JSON.stringify(C.map(r => r.dCp)) === JSON.stringify(CP), 'C7 쿠폰 지급 0/0/0/1/2 불변', C.map(r => r.dCp).join('/'));
  const E1 = await page.evaluate(() => {
    S.mileage = MILE_NEED;
    const d0 = S.dia, n0 = S.mailx.length, r = mileageExchange();
    const dMail = S.mailx.length - n0;
    return { r, d: S.dia - d0, m: S.mileage, dMail };
  });
  ok(E1.r === true && E1.d === MILE, 'C8 마일리지 10개 교환 → 그 틱에 다이아 +' + comma(MILE), '+' + E1.d);
  ok(E1.m === 0 && E1.dMail === 0, 'C9 쿠폰 −10 · 새 우편 0통(697)', '쿠폰 ' + E1.m + ' · 우편 ' + E1.dMail);

  /* ================= [D] 안 건드린 것 ================= */
  const D = await page.evaluate(() => ({
    /* 588 이관 — 옛 «5만 불변» 이 아니라 «셋 다 선언째 없다» 를 묻는다 */
    passDiaConst: ['PASS_ADFREE_DIA', 'PASS_ABLESS_DIA', 'PASS_OFFPLUS_DIA']
      .filter(k => { try { return typeof eval(k) !== 'undefined'; } catch (e) { return false; } }),
    passDiaField: (typeof PASS_ITEMS === 'undefined' ? [] : PASS_ITEMS).filter(q => 'dia' in q).map(q => q.id),
    passWon: (typeof PASS_ITEMS === 'undefined' ? [] : PASS_ITEMS).map(q => q.won),
    newDia: typeof NEW_DIA === 'undefined' ? null : NEW_DIA,
    monthDia: typeof MONTHLY_DIA === 'undefined' ? null : MONTHLY_DIA,
    adDia: (typeof COIN_ADS === 'undefined' ? [] : COIN_ADS).map(a => (a.r && a.r.dia) || 0),
  }));
  ok(D.passDiaConst.length === 0 && D.passDiaField.length === 0,
     'D1 588 — 이용권 다이아 대체가가 상수·필드 **둘 다** 0건(값만 0 으로 남기지 않았다)',
     '상수 ' + (D.passDiaConst.join(',') || '0건') + ' · 필드 ' + (D.passDiaField.join(',') || '0건'));
  /* 588 이 이용권을 «못 사는 상품» 으로 만들지 않았다는 것까지가 이 절의 짝이다 — 원화가는 그대로 산다 */
  ok(JSON.stringify(D.passWon) === JSON.stringify([14900, 22900, 7500]),
     'D1-b 588 이후에도 이용권 원화가(14,900·22,900·7,500)는 그대로 — 가격을 지운 것이 아니다',
     D.passWon.join('/'));
  ok(D.adDia.filter(Boolean).every(v => v === 100), 'D2 13 광고 상품 보석 ×100 불변(365)', D.adDia.join('/'));
  /* 497 은 «상점 재화로 파는 것» 만 만졌다 — 같은 화폐의 **수급** 축(180 신규 100만 · 월별 10만)은
     손이 미끄러지기 쉬운 자리라 여기서 불변을 못박는다. 그 곡선은 498·199 몫이다. */
  ok(D.newDia === 1000000 && D.monthDia === 100000,
     'D3 다이아 수급 축(180 신규 NEW_DIA 100만 · MONTHLY_DIA 10만) 불변 — 497 은 판매만 만졌다',
     D.newDia + ' · ' + D.monthDia);

  /* ================= [E] 구 세이브 ================= */
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(() => {
    /* 44 교훈 1 — 살아 있는 페이지에서 localStorage 를 고치면 5초 자동 저장이 옛 값을 되쓴다 */
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({ dia: 123456789, mileage: 6, gold: 1000 }));
  });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto(URL);
  await p2.waitForFunction(() => typeof S !== 'undefined');
  await p2.waitForTimeout(400);
  const E = await p2.evaluate(() => ({ dia: S.dia, mile: S.mileage }));
  ok(E.dia === 123456789, 'E1 구 세이브의 보유 다이아 무변경(마이그레이션 없음 · KEY 안 올림)', String(E.dia));
  ok(E.mile === 6, 'E2 구 세이브의 마일리지 쿠폰 무변경', String(E.mile));
  ok(errs2.length === 0, 'E3 구 세이브 로드 시 런타임 에러 0건', errs2.join(' | '));

  /* ================= [R] 되돌림 시험 ================= */
  /* 116 의 «÷2» 로 되돌린 사본을 만들어 [A]·[C] 가 실제로 빨개지는지 본다.
     이 절이 없으면 «값을 아무렇게나 적어도 초록인 게이트» 가 된다(334 처방). */
  const tmp = path.join(ROOT, 'tools', `.v497-revert-${process.pid}.html`);
  let rev = SRC
    .replace(/dia:10000,   won:1000/, 'dia:5000,   won:1000')
    .replace(/dia:70000,   won:5000/, 'dia:35000,   won:5000')
    .replace(/dia:150000,  won:11000/, 'dia:75000,  won:11000')
    .replace(/dia:900000,  won:55000/, 'dia:450000,  won:55000')
    .replace(/dia:2000000, won:110000/, 'dia:1000000, won:110000')
    .replace(/MILE_DIA = 5000000/, 'MILE_DIA = 2500000');
  fs.writeFileSync(tmp, rev);
  const p3 = await (await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p3.goto('file://' + tmp.replace(/\\/g, '/'));
  await p3.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await p3.waitForTimeout(400);
  const R = await p3.evaluate(() => {
    const d0 = S.dia, n0 = (S.mailx || []).length;
    devBuyDia('d5');
    claimMail(S.mailx[S.mailx.length - 1].id);
    return { dia: DIA_PACKS.map(p => p.dia), mile: MILE_DIA, d5: S.dia - d0, q: DIA_PACKS[4].q };
  });
  ok(JSON.stringify(R.dia) !== JSON.stringify(DIA) && R.mile !== MILE,
     'R1 «÷2» 사본은 [A] 상수 단언이 빨개진다', R.dia.join('·') + ' · ' + R.mile);
  ok(R.d5 !== DIA[4], 'R2 «÷2» 사본은 [C] 지급 단언이 빨개진다', '+' + R.d5 + ' (기대 ' + comma(DIA[4]) + ')');
  ok(R.q === '×' + comma(DIA116[4]), 'R3 라벨이 값을 그대로 따라간다(파생) — 사본에서 옛 문자열이 나온다', R.q);
  try { fs.unlinkSync(tmp); } catch (e) {}

  ok(errs.length === 0, 'H1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY497 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
