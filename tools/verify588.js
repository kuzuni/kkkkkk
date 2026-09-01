/* 588 게이트 — 10 상점 «이용권» 3종을 **다이아로 못 산다**
 *
 * 주인 원문(2026-08-31): «그 이용권들은 다이아로 못사게 하기».
 *
 * ⚠ 이 행의 함정은 «지우면 끝» 이 아니라는 것이다 — 다이아는 이용권의 **가격**이 아니라
 *    44 «결제 미연동» 관례가 만든 **대체가**였다(6755 · 30031 · 30051 주석). 그래서 그냥 지우면
 *    이용권이 «못 사는 상품» 이 된다. 그 자리는 **589 의 원화 목업 결제**가 받는다.
 *    ⇒ 이 게이트는 «없어졌다» 와 «그래도 살 수 있다» 를 **한 벌로** 잰다. 앞만 재면 588 은
 *      «상품을 죽인 작업» 이 되고, 뒤만 재면 대체가가 되살아나도 초록이다.
 *
 * 절:
 *   [A] 선언 — `PASS_*_DIA` 상수 0건 · `PASS_ITEMS[].dia` 필드 0건 · `buyPass` 본문에 다이아 차감 0건
 *       (값만 0 으로 두는 «아무도 안 읽는 상태» 를 막는다 — LESSONS 295-② · 460 선례)
 *   [B] 실동작 — 이용권 3종을 사는 **어떤 경로에서도** `S.dia` 가 1도 안 줄어든다
 *       (함수 호출 · 카드 버튼 실클릭 두 경로 다)
 *   [C] 표기 — 카드·하단 띠 어디에도 «대체가» 문구 0건, 그래도 원화 가격 버튼 3개는 살아 있다
 *   [D] 589 와의 짝 — 다이아 0 원에서도 살 수 있다(못 사는 상품이 되지 않았다) ·
 *       결제 1건 · 지급 우편 1통 · 권한 즉시
 *   [E] 구 세이브 — 이미 다이아로 산 사람의 권한은 **그대로 유지**(회수 금지) · KEY 안 올림
 *   [F] 안 건드린 것 — 게임 내 다이아 소비(소환·룰렛·강화)와 13 재화 탭 다이아 팩 수량은 불변
 *   [G] 다이아 소비처 전·후 표 — 199 로 넘길 근거(실패 항목이 아니라 기록)
 *   [R] 되돌림 — 대체가를 되살린 사본에서 [A] 가 빨개진다 · 차감식을 도로 심으면 [B] 가 빨개진다
 *   [H] 콘솔·페이지 에러 0
 *
 * 실행: node tools/verify588.js      → 마지막 줄 VERIFY588 n/n PASS
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 주석에는 «무엇을 왜 지웠는가» 가 설명으로 남아 있다 — 살아 있는 코드만 본다(§367 방식) */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const IDS = ['noads', 'abless', 'offplus'];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const openPass = async (page) => {
  await page.evaluate(() => { S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(700);
  await page.evaluate(() => Promise.all(
    document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ═════ [A] 선언이 통째로 사라졌는가 ═════ */
  console.log('\n[A] 선언 — 값만 0 으로 남기지 않았다');
  const A = await page.evaluate(() => ({
    consts: ['PASS_ADFREE_DIA', 'PASS_ABLESS_DIA', 'PASS_OFFPLUS_DIA']
      .filter(k => { try { return typeof eval(k) !== 'undefined'; } catch (e) { return false; } }),
    fields: PASS_ITEMS.filter(p => 'dia' in p).map(p => p.id),
    wons: PASS_ITEMS.map(p => p.won),
    buySrc: String(buyPass), grantSrc: String(grantPass),
  }));
  ok(A.consts.length === 0, 'A1 `PASS_*_DIA` 상수 0건(선언째 제거)', A.consts.join(',') || '0건');
  ok(A.fields.length === 0, 'A2 `PASS_ITEMS[].dia` 필드 0건', A.fields.join(',') || '0건');
  ok(!/S\.dia\s*-=/.test(A.buySrc) && !/S\.dia\s*-=/.test(A.grantSrc),
    'A3 `buyPass`·`grantPass` 본문에 다이아 차감식 0건', '소스 grep');
  ok(!/PASS_ADFREE_DIA|PASS_ABLESS_DIA|PASS_OFFPLUS_DIA/.test(CODE),
    'A4 살아 있는 코드에 옛 상수 이름 0건(주석 설명은 허용)', '소스 grep');
  /* 588 이 «가격을 지운 작업» 이 아님을 같은 절에서 못박는다 */
  ok(JSON.stringify(A.wons) === JSON.stringify([14900, 22900, 7500]),
    'A5 원화가 14,900·22,900·7,500 은 그대로 — 지운 것은 «대체가» 뿐이다', A.wons.join('/'));

  /* ═════ [B] 어떤 경로로 사도 다이아가 안 줄어든다 ═════ */
  console.log('\n[B] 실동작 — S.dia 가 1도 안 줄어든다');
  await openPass(page);
  for (const id of IDS) {
    const r = await page.evaluate((i) => {
      S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
      S.dia = 1234567; S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = 0;
      syncNoAds();
      const d0 = S.dia, r = buyPass(i);
      return { r, dDia: S.dia - d0, own: passOwned(i), once: (PASS_ITEMS.find(x => x.id === i) || {}).once | 0 };
    }, id);
    /* 697 — «Δ0» 은 «차감이 없다» 는 뜻이었다. 즉시 보석이 그 틱에 들어오면서 Δ가 «+once» 가 됐고
       588 축은 그 등식 안에 그대로 산다(차감이 되살아나면 Δ가 once 보다 작아진다). */
    ok(r.r === true && r.dDia === r.once && r.own === true,
      'B1:' + id + ' 함수 경로 — 구매 성공 · 차감 0(Δ = 즉시 보석 ' + r.once + ') · 권한 즉시',
      'r=' + r.r + ' Δdia=' + r.dDia + ' own=' + r.own);
  }
  /* 실클릭 경로 — 배선이 다른 함수를 부르고 있으면 여기서 갈린다 */
  const before = await page.evaluate(() => {
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    S.dia = 999999; S.mailx = []; S.mailSeq = 0; S.mail = {};
    syncNoAds(); renderPassPage(document.getElementById('shopList'));
    return S.dia;
  });
  await page.waitForTimeout(140);
  await page.locator('.pvc[data-pv="abless"] .bt').click();
  await page.waitForTimeout(260);
  const clicked = await page.evaluate(() => ({ dia: S.dia, own: passOwned('abless'),
    once: (PASS_ITEMS.find(x => x.id === 'abless') || {}).once | 0 }));
  ok(clicked.dia === before + clicked.once && clicked.own === true,
    'B2 카드 [₩22,900] 실클릭 — 차감 0(Δ = 즉시 보석) · 권한 즉시',
    before + ' → ' + clicked.dia + '(기대 +' + clicked.once + ') · own=' + clicked.own);

  /* ═════ [C] 표기 ═════ */
  console.log('\n[C] 표기 — «대체가» 가 화면에 0건');
  const C = await page.evaluate(() => {
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    syncNoAds(); renderShopPage();
    const list = document.getElementById('shopList');
    return { pvd: document.querySelectorAll('.pvc>.pvd').length,
             txt: list.innerText,
             buys: [...document.querySelectorAll('.pvc>.bt[data-pvbuy]')].map(b => b.textContent.trim()),
             note: [...document.querySelectorAll('.pv-bt')].map(e => e.textContent.trim()) };
  });
  ok(C.pvd === 0, 'C1 `.pvd`(카드 안 대체가) 0개', C.pvd + '개');
  ok(!/대체/.test(C.txt), 'C2 이용권 탭 글자에 «대체» 0건',
    (C.txt.match(/[^\s]{0,8}대체[^\s]{0,8}/g) || []).join(' / ') || '0건');
  ok(C.buys.length === 3 && C.buys.every(t => /원$/.test(t)),
    'C3 원화 가격 버튼 3개가 살아 있다(못 사는 상품이 되지 않았다)', C.buys.join(' | '));
  /* 697 — 총론 한 줄이 말해야 하는 «지급처» 가 우편함에서 즉시로 바뀌었다(주인 «이용권도 즉시적용으로») */
  ok(C.note.some(t => /즉시/.test(t)) && !C.note.some(t => /우편함/.test(t)) && !C.note.some(t => /대체 결제/.test(t)),
    'C4 하단 총론 한 줄이 «즉시» 를 말하고 «우편함»·«대체 결제» 는 0건', C.note.join(' / '));

  /* ═════ [D] 589 와의 짝 ═════ */
  console.log('\n[D] 589 짝 — 다이아 0 에서도 산다');
  const D = await page.evaluate(() => {
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    S.dia = 0; S.mileage = 0; S.mailx = []; S.mailSeq = 0; S.mail = {};
    syncNoAds();
    const p0 = S.cnt.paid | 0, d1 = S.dia, c1 = S.mileage | 0;
    const r = buyPass('noads');
    const item = PASS_ITEMS.find(x => x.id === 'noads');
    return { r, dia: S.dia, own: passOwned('noads'), dPaid: (S.cnt.paid | 0) - p0,
             mails: (S.mailx || []).length,
             buyDia: S.dia - d1, buyCp: (S.mileage | 0) - c1,
             once: item.once, cp: item.cp };
  });
  ok(D.r === true && D.own === true, 'D1 다이아 0 에서도 구매 성공 · 권한 즉시', 'r=' + D.r + ' own=' + D.own);
  ok(D.dPaid === 1, 'D2 결제 1건으로 세어진다(589 `payMock`)', '+' + D.dPaid);
  ok(D.mails === 0,
    'D3 지급이 우편을 **안 지난다**(697 — 153 의 반대 방향)', D.mails + '통');
  ok(D.buyDia === D.once && D.buyCp === D.cp,
    'D4 그 재화가 **구매 그 틱에** 들어온다(즉시 보석 ' + D.once + ' · 쿠폰 ' + D.cp + ')',
    '+' + D.buyDia + ' / +' + D.buyCp);

  /* ═════ [E] 구 세이브 — 이미 산 사람의 권한은 회수하지 않는다 ═════ */
  console.log('\n[E] 구 세이브 — 이미 다이아로 산 권한은 그대로');
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(([key]) => {
    /* 44 교훈 1 — 살아 있는 페이지에서 고치면 자동 저장이 되쓴다. 페이지 스크립트보다 먼저 심는다.
       «588 이전에 다이아로 이용권 3종을 다 산» 세이브다. */
    localStorage.setItem(key, JSON.stringify({
      dia: 12345, gold: 5000,
      pass: { prem:{}, got:{}, noAds:true, offPlus:true,
              autoBlessUntil: Date.now() + 20 * 24 * 3600 * 1000, dailyAt:{} }
    }));
  }, [KEY]);
  const page2 = await ctx2.newPage();
  page2.on('pageerror', e => errs.push('old: ' + e));
  await page2.goto(URL);
  await page2.waitForTimeout(900);
  const E = await page2.evaluate(() => ({
    noAds: !!(S.pass && S.pass.noAds), offPlus: !!(S.pass && S.pass.offPlus),
    bless: typeof autoBlessOn === 'function' && autoBlessOn(),
    dia: S.dia, offMul: offMul(),
    cls: document.getElementById('app').classList.contains('noads'),
    ver: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}')).v || null,
  }));
  ok(E.noAds && E.offPlus && E.bless, 'E1 구 세이브의 이용권 3종 권한이 전부 살아 있다(회수 0)',
    'noAds=' + E.noAds + ' offPlus=' + E.offPlus + ' 자동축복=' + E.bless);
  ok(E.dia === 12345, 'E2 남은 다이아를 되돌려 주지도 뺏지도 않는다', String(E.dia));
  /* ⚑ 199 21회차 이관(333) — 옛 «상한 6+4 = 10시간» 은 제품에서 사라졌다(결3 ⓑ: 1회 상한 폐지,
     151 은 ×배율 상품). 588 이 지키는 것은 «구 세이브의 권한이 살아 있는가» 이므로 축만 갈아 끼운다. */
  ok(Math.abs(E.offMul - 1.2) < 1e-9, 'E3 구 세이브의 offPlus 권한이 새 상품(오프라인 ×배율)으로 이어진다',
    '×' + E.offMul);
  ok(E.cls === true, 'E4 `#app.noads` 표식도 그대로', String(E.cls));
  /* KEY 는 안 올렸다 — 저장 구조가 안 바뀌었고(필드를 지운 것은 **상수**다), 올리면 구 세이브가
     전멸한다(LESSONS 44-②: 키 하나로 읽는 load() 에서 KEY 상승 = 구 세이브 전멸). */
  ok(SRC.includes("idle_hunter_save_v4") && !/idle_hunter_save_v5/.test(SRC),
    'E5 세이브 KEY 를 안 올렸다(구조 무변경 — 지운 것은 상수다)', 'v4');
  await ctx2.close();

  /* ═════ [F] 안 건드린 것 ═════ */
  console.log('\n[F] 안 건드린 것 — 게임 내 다이아 소비는 불변');
  const F = await page.evaluate(() => ({
    packs: DIA_PACKS.map(p => p.dia),
    mile: MILE_DIA, mileNeed: MILE_NEED,
    sumCost: typeof SUMMON_COST === 'undefined' ? null : SUMMON_COST,
    adDia: (typeof COIN_ADS === 'undefined' ? [] : COIN_ADS).map(a => (a.r && a.r.dia) || 0),
  }));
  ok(JSON.stringify(F.packs) === JSON.stringify([10000, 70000, 150000, 900000, 2000000]),
    'F1 13 다이아 팩 5종 수량 불변(497)', F.packs.join('/'));
  ok(F.mile === 5000000 && F.mileNeed === 10, 'F2 마일리지 교환 불변(497)', F.mile + ' / ' + F.mileNeed);
  ok(F.adDia.filter(Boolean).every(v => v === 100), 'F3 13 광고 상품 보석 ×100 불변(365)', F.adDia.join('/'));

  /* ═════ [G] 다이아 소비처 전·후 표 — 199 이관 근거(기록) ═════ */
  console.log('\n[G] 다이아 소비처(sink) 전·후 — 199 로 넘길 근거');
  console.log('  · 588 이전: 이용권 3종 대체가 75,000 + 35,000 + 50,000 = 160,000 (1회성)');
  console.log('  · 588 이후: 0 — 이 sink 는 통째로 사라졌다(원화 목업으로 이관)');
  console.log('  · 남은 다이아 소비처(불변): 소환(가챠) · 룰렛 · 강화/도감 · 13 재화 탭 교환 · 던전 입장권 교환');
  console.log('  ⇒ 497(팩 ×2)·496(소환 레벨)이 잡아 둔 수급 균형이 −160,000(1회성) 만큼 느슨해진다.');
  console.log('    계수 확정은 199 몫이다 — 이 게이트는 값을 단언하지 않는다(측정만).');

  /* ═════ [R] 되돌림 ═════ */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  const R1 = await page.evaluate(() => {
    /* 대체가를 상품표에 도로 심는다 — [A2] 의 자가 그것을 본다 */
    PASS_ITEMS[0].dia = 75000;
    const seen = PASS_ITEMS.filter(p => 'dia' in p).map(p => p.id);
    delete PASS_ITEMS[0].dia;
    const back = PASS_ITEMS.filter(p => 'dia' in p).length;
    return { seen, back };
  });
  ok(R1.seen.length === 1 && R1.back === 0,
    'R1 대체가를 도로 심으면 [A2] 가 그것을 본다(헛초록 아님)',
    '주입 시 ' + R1.seen.join(',') + ' → 원복 ' + R1.back + '건');
  const R2 = await page.evaluate(() => {
    /* 차감식을 도로 심은 «구매» 사본을 만들어 [B] 의 자가 실제로 잡는지 본다 */
    const p = PASS_ITEMS.find(x => x.id === 'offplus');
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    S.dia = 100000; S.mailx = []; S.mailSeq = 0; S.mail = {};
    const d0 = S.dia;
    const legacyBuy = (id) => { const q = PASS_ITEMS.find(x => x.id === id);
      const price = 50000; if (S.dia < price) return false; S.dia -= price; grantPass(q.id); return true; };
    const r = legacyBuy(p.id);
    /* 697 — `grantPass()` 가 이제 즉시 보석을 그 자리에서 준다. 사본의 순 Δ는 «−가격 + once» 이고,
       재는 것은 여전히 «차감이 실제로 일어났는가» 다(기대값을 상수로 적지 않고 표에서 뽑는다). */
    return { r, dDia: S.dia - d0, once: p.once | 0 };
  });
  ok(R2.r === true && R2.dDia === -50000 + R2.once,
    'R2 옛 «차감 → 지급» 사본은 다이아를 실제로 깎는다 = [B] 의 자가 그 차이를 본다',
    'Δ' + R2.dDia + '(기대 −50000 + 즉시 보석 ' + R2.once + ')');
  /* 소스 수준 되돌림 — 상수를 되살린 사본에서 [A4] 가 빨개진다 */
  const REV = SRC.replace('const PASS_ABLESS_DAYS = 30;',
    'const PASS_ADFREE_DIA = 75000;\nconst PASS_ABLESS_DAYS = 30;');
  const REV_CODE = REV.replace(/\/\*[\s\S]*?\*\//g, ' ');
  ok(REV !== SRC && /PASS_ADFREE_DIA/.test(REV_CODE),
    'R3 상수를 되살린 사본에서는 [A4] 의 grep 이 그것을 찾는다',
    REV === SRC ? '사본이 안 만들어졌다' : '주석 제외 grep 에서 검출');

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  const line = 'VERIFY588 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
