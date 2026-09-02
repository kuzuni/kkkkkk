/* 작업 153 — 회귀 게이트.
 *   node tools/verify153.js
 *
 * ⚑ **697(2026-09-02, 주인 지시 «걍 상점에서 구매한거 걍 다 즉시 지급으로 하자 우편함 말고»)이
 *   이 행의 앞쪽 절반을 뒤집었다.** 333 처방대로 **항을 지우지 않고 방향만** 뒤집었다:
 *   [A]·[B]·[E] 는 이제 «우편으로 가는가» 가 아니라 «즉시 지급되는가» 를 같은 세 경로에서 묻고,
 *   153 의 뒤쪽 절반(«상점발 우편은 보관 기간 무한» = [C]·[D]·[F])은 **그대로 산다** —
 *   이미 우편함에 있는 옛 상점 통과 180 월별 다이아가 그 규약 위에서 계속 돌기 때문이다
 *   (주인 «기존 우편 소급 삭제 금지»). 그래서 [C]·[D] 의 표본만 «구매» 에서 «옛 통 주입» 으로 옮겼다.
 *
 * 주인 지시(2026-08-27) 원문: «상점에서 구매한 것들은 전부 우편함으로 지급, 상점 구매분은
 * 우편함 기간 무한». 앞 절은 697 이 폐지했고, 뒤 절(«기간 무한»)은 남은 통에 그대로 적용된다.
 * 697 이후 세 경로의 지급은 `grantNow()` 한 곳으로 모인다(`sendMail` 과 같은 보상 표를 읽는다):
 *   · 다이아 상품 5종 `grantDiaPack()`  — 다이아 + 마일리지 쿠폰
 *   · 마일리지 교환 `mileageExchange()` — 다이아
 *   · 유물조각 교환 `[data-ex]`          — 유물조각
 * 제외(근거는 PROGRESS 153 비고): 소환(가챠) 결과는 즉시 결과 팝업(12) 유지 · 이용권(124/151)은
 * 물건이 아니라 계정 권한이라 즉시 반영 · 광고 상품(COIN_ADS)은 «구매» 가 아니라 무료 수령.
 *
 * 다섯 겹으로 본다:
 *   [A] 정적 — 세 경로가 `sendMail` 을 안 지나고 지급이 그 자리에 있는가 (697 이관)
 *   [B] 지급 — 구매 «직전/직후» 를 같은 tick 에서 재서 재화가 **상품 표대로** 늘고 우편은 0인가 (697 이관)
 *   [C] 무한 보관 — 미수령 상점 우편이 [읽음 전체 삭제]·세이브 라운드트립을 넘어 살아남는가
 *                  (표본 = 옛 세이브에 남아 있던 통 · 697 이후 «새로 생기지 않는다» 는 [B] 몫)
 *   [D] 실제 클릭 — 우편함 [받기] 버튼을 진짜로 눌러 지급이 되는가(핸들러가 연결돼 있는가).
 *   [E] 과교정 방지 — 이용권은 권한도 재화도 **둘 다 즉시**인가 (697 보강3 이관)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0; const fails = [];
const ok   = (m) => { pass++; console.log('  ok   ' + m); };
const fail = (m) => { fails.push(m); console.log('  FAIL ' + m); };
/* 배열·객체도 그대로 비교할 수 있게 값 비교는 JSON 으로 한다(`===` 는 배열을 항상 «다름» 으로 본다) */
const eq   = (label, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(`${label} = ${JSON.stringify(got)}`)
  : fail(`${label} = ${JSON.stringify(got)} — 기대 ${JSON.stringify(want)}`));

/* 소스에서 함수 본문 한 덩어리를 중괄호 짝으로 잘라 낸다(정적 검사 [A] 전용) */
function body(sig) {
  const i = SRC.indexOf(sig);
  if (i < 0) return null;
  const s = SRC.indexOf('{', i);
  let d = 0;
  for (let j = s; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}' && --d === 0) return SRC.slice(s, j + 1);
  }
  return null;
}

const SAVE = { gold: 5e7, dia: 5e6, relic: 0, mileage: 0 };

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ================= [A] 정적 — 직접 가산이 되살아났는가 ================= */
    console.log('[A] 정적 — 구매 경로가 우편을 안 지나고 그 자리에서 지급하는가(697)');
    const bGrant = body('function grantDiaPack(p)');
    /* 715 이관 — `mileageExchange` 에 «몇 회» 인자가 생겼다(`(n)`). 153 이 지키는 것은 시그니처가
       아니라 «우편을 안 지나고 grantNow 로 그 자리에서 준다» 이므로 찾는 열쇠만 넓힌다. */
    const bMile  = body('function mileageExchange(');
    bGrant ? ok('grantDiaPack 본문 확보') : fail('grantDiaPack 본문을 못 찾았다');
    bMile  ? ok('mileageExchange 본문 확보') : fail('mileageExchange 본문을 못 찾았다');
    if (bGrant) {
      !/sendMail\(/.test(bGrant) ? ok('grantDiaPack — sendMail 안 지난다(697)')
                                 : fail('grantDiaPack 이 다시 우편으로 보낸다 — 697 회귀');
      /grantNow\(/.test(bGrant) ? ok('grantDiaPack — grantNow 경유(즉시 지급)')
                                : fail('grantDiaPack 이 grantNow 를 안 쓴다 — 697 회귀');
    }
    if (bMile) {
      !/sendMail\(/.test(bMile) ? ok('mileageExchange — sendMail 안 지난다(697)')
                                : fail('mileageExchange 가 다시 우편으로 보낸다 — 697 회귀');
      /grantNow\(/.test(bMile) ? ok('mileageExchange — grantNow 경유(즉시 지급)')
                               : fail('mileageExchange 가 grantNow 를 안 쓴다 — 697 회귀');
    }
    /* 유물조각 교환은 «지급하는 자리» 를 창으로 본다.
       ⚠ 715 이관 — 지급이 클릭 핸들러에서 **교환 정의**(`exDefCur`)의 `run()` 으로 옮겨졌다
         (수량 슬라이더로 확정한 뒤에 지급한다). 핸들러 창을 계속 보면 «지급을 안 한다» 로
         빨개지는데 그것은 자리가 옮겨진 것이지 697 회귀가 아니다 — 창을 새 집으로 옮긴다. */
    const exI = SRC.indexOf("const exDefCur = x => ({");
    /* ⚠ 창을 **주석 제거 후** 본다 — 697 의 설명 주석이 «`ex.mail` 은 선언째 사라졌다» 라고
       적고 있어서, 날것 창으로 grep 하면 «갈래가 되살아났다» 로 잘못 읽힌다(1회차에 실제로 그랬다). */
    const exW = exI >= 0 ? SRC.slice(exI, exI + 1200).replace(/\/\*[\s\S]*?\*\//g, ' ') : '';
    exI >= 0 ? ok('유물조각 교환 블록 확보') : fail('유물조각 교환 블록을 못 찾았다');
    if (exI >= 0) {
      /S\[x\.k\]\s*=/.test(exW) ? ok('유물조각 교환 — 그 자리에서 지급한다(697)')
                                : fail('유물조각 교환이 지급을 안 한다 — 697 회귀');
      !/sendMail\(/.test(exW) ? ok('유물조각 교환 — sendMail 안 지난다(697)')
                              : fail('유물조각 교환이 다시 우편으로 보낸다 — 697 회귀');
      !/ex\.mail/.test(exW) ? ok('유물조각 교환 — 죽은 `ex.mail` 갈래가 없다(333·399)')
                            : fail('`ex.mail` 갈래가 되살아났다 — 697 회귀');
    }
    /* 삭제가 «수령 완료» 만 고르는가 — 무한 보관의 뿌리 */
    const bDel = body('function delReadMail()');
    bDel && /S\.mail\[m\.id\] === 1/.test(bDel)
      ? ok('delReadMail — 수령 완료(1) 만 고른다')
      : fail('delReadMail 이 미수령 우편까지 고른다 — 보관 무한이 깨진다');

    const d = await open(browser);

    /* ================= [B] 지급 — 구매는 우편으로만 ================= */
    console.log('[B] 지급 — 구매 그 틱에 상품 표대로 · 새 우편 0 (697 이관)');

    /* B-1 다이아 패키지 d5(다이아 1,000,000 · 쿠폰 2) */
    const b1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = 0;
      const p = DIA_PACKS.find(x => x.id === 'd5');
      const d0 = S.dia, m0 = S.mileage || 0, paid0 = S.cnt.paid || 0, n0 = S.mailx.length;
      const g0 = S.gold, r0 = S.relic;
      devBuyDia('d5');
      const after = { dDia: S.dia - d0, dCp: (S.mileage || 0) - m0,
                      dPaid: (S.cnt.paid || 0) - paid0, dMail: S.mailx.length - n0,
                      dGold: S.gold - g0, dRel: S.relic - r0 };
      return { want: { dia: p.dia, cp: p.cp }, after };
    });
    eq('d5 구매 직후 ΔS.dia', b1.after.dDia, b1.want.dia);
    eq('d5 구매 직후 Δ쿠폰', b1.after.dCp, b1.want.cp);
    eq('d5 구매 직후 Δ우편 통수', b1.after.dMail, 0);
    eq('d5 구매 직후 Δ결제 카운터', b1.after.dPaid, 1);
    /* 표 밖의 재화가 따라 늘면 «표대로» 가 아니다 — 음성항 */
    eq('d5 구매가 안 준 재화(골드·유물)', [b1.after.dGold, b1.after.dRel], [0, 0]);

    /* B-2 마일리지 교환 */
    const b2 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = MILE_NEED;
      const d0 = S.dia, n0 = S.mailx.length;
      const r = mileageExchange();
      const after = { r, dDia: S.dia - d0, cp: S.mileage, dMail: S.mailx.length - n0 };
      return { want: MILE_DIA, after };
    });
    eq('마일리지 교환 반환값', b2.after.r, true);
    eq('교환 직후 ΔS.dia', b2.after.dDia, b2.want);
    eq('교환 직후 남은 쿠폰', b2.after.cp, 0);
    eq('교환 직후 Δ우편 통수', b2.after.dMail, 0);

    /* B-3 유물조각 교환 — 진짜 카드 버튼을 클릭한다 */
    const b3 = await d.page.evaluate(async () => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.dia = 5e6; S.relic = 0;
      openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      await new Promise(r => setTimeout(r, 60));
      /* 490 — `data-ex` 는 재화 키다(1:1). 유물조각 칸만 고른다.
         715 이관 — 수량은 «수량 탭»(`exQtyN`)이 아니라 팝업 슬라이더가 정하고, 지급은 확정에서 난다.
         153 이 여기서 지키는 것은 «우편이 안 온다» 이므로 자리만 확정 뒤로 옮긴다. */
      const btn = document.querySelector('#shopList [data-ex="relic"]');
      if (!btn) return { err: '유물조각 교환 버튼 없음' };
      const ex = { dia: 10, rel: 10 };
      const d0 = S.dia, r0 = S.relic, n0 = S.mailx.length;
      btn.click(); exSet(10); exRun();
      const after = { dDia: S.dia - d0, dRel: S.relic - r0, dMail: S.mailx.length - n0 };
      return { want: { dia: ex.dia, rel: ex.rel }, after };
    });
    if (b3.err) fail(b3.err);
    else {
      eq('유물조각 교환 직후 ΔS.dia', b3.after.dDia, -b3.want.dia);
      eq('유물조각 교환 직후 ΔS.relic', b3.after.dRel, b3.want.rel);
      eq('유물조각 교환 직후 Δ우편 통수', b3.after.dMail, 0);
    }

    /* ================= [C] 무한 보관 ================= */
    console.log('[C] 보관 무한 — 옛 미수령 상점 우편은 삭제·재기동을 넘어 남는다');
    /* 697 — 구매가 더는 우편을 만들지 않으므로 표본은 **옛 세이브에 남아 있던 통**이다
       (주인 «기존 우편 소급 삭제 금지» 가 지키라고 한 바로 그것). 153 스키마 그대로 주입한다. */
    const c1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      const oldMail = id => { const p = DIA_PACKS.find(x => x.id === id);
        return sendMail({ t:'🛒 ' + diaPackName(p), c:p.dia, m:p.cp || 0, src:'shop', b:'옛 상점 지급분' }); };
      oldMail('d1');                         /* 미수령 상점 우편 1통 */
      oldMail('d2'); const keep = S.mailx[1].id;
      claimMail(S.mailx[0].id);              /* 한 통만 수령 → 삭제 대상 */
      const before = S.mailx.length;
      delReadMail();
      return { before, after: S.mailx.length, keep,
               kept: S.mailx.some(m => m.id === keep),
               keptState: S.mail[keep] == null ? 0 : S.mail[keep],
               listed: mailList().some(m => m.id === keep) };
    });
    eq('[읽음 전체 삭제] 전 상점 우편 통수', c1.before, 2);
    eq('삭제 후 남은 상점 우편 통수', c1.after, 1);
    c1.kept ? ok('미수령 상점 우편이 살아남았다') : fail('미수령 상점 우편이 지워졌다 — 보관 무한 위반');
    eq('살아남은 우편 상태(0=미수령)', c1.keptState, 0);
    c1.listed ? ok('목록에도 그대로 보인다') : fail('살아남았는데 목록에서 빠졌다');

    /* 세이브 라운드트립은 **`load()` 를 직접 태워서** 본다 — `page.reload()` 는 이 게이트 자신의
       `addInitScript` 가 매 로드마다 초기 세이브를 다시 써 넣어 «저장이 안 됐다» 로 오판한다. */
    const c2 = await d.page.evaluate(() => {
      save();
      const raw = JSON.parse(localStorage.getItem(KEY));
      load();                                     /* ⚠ load() 는 값을 돌려주지 않고 전역 `S` 를 갈아 끼운다 */
      const kept = (S.mailx || []).filter(m => !S.mail[m.id]);
      const seq = S.mailSeq;
      /* 구 세이브(mailx 키 자체가 없음)도 깨지지 않는가 */
      const old = JSON.parse(JSON.stringify(raw));
      delete old.mailx; delete old.mailSeq;
      localStorage.setItem(KEY, JSON.stringify(old));
      load();
      const legacy = Array.isArray(S.mailx) ? S.mailx.length : -1;
      localStorage.setItem(KEY, JSON.stringify(raw));
      load();
      return { rawN: (raw.mailx || []).length, n: kept.length, c: kept[0] && kept[0].c, seq, legacy };
    });
    eq('저장된 상점 우편 통수(localStorage)', c2.rawN, 1);
    eq('load() 뒤 남은 미수령 상점 우편 통수', c2.n, 1);
    eq('load() 뒤 그 우편의 다이아 보상', c2.c, 70000);   /* 497 — d2 팩이 ×2. 보존 경로는 그대로다 */
    c2.seq >= 2 ? ok(`load() 뒤 mailSeq 가 id 보다 앞서 있다 = ${c2.seq}`)
                : fail(`load() 뒤 mailSeq = ${c2.seq} — 재사용 id 가 나올 수 있다`);
    eq('mailx 없는 구 세이브 로드', c2.legacy, 0);

    /* 상점 우편 행이 «기한 없음» 으로 그려지는가 — 무한 보관의 화면 쪽 표기 */
    const c3 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      const p = DIA_PACKS.find(x => x.id === 'd2');
      sendMail({ t:'🛒 ' + diaPackName(p), c:p.dia, m:p.cp || 0, src:'shop', b:'옛 상점 지급분' });
      openMail();
      const row = [...document.querySelectorAll('#mbox .ml-r')]
        .find(r => r.querySelector('[data-ml^="x"]'));
      const html = document.getElementById('mbox').innerHTML;
      return { dtxt: row ? (row.querySelector('.ml-d i') || {}).textContent : '',
               sum: row ? (row.querySelector('.ml-s i') || {}).textContent : '',
               nan: /NaN|undefined/.test(html) };
    });
    eq('상점 우편 행의 기한 표기', c3.dtxt, '기한 없음');
    eq('상점 우편 행의 보상 요약', c3.sum, '다이아');
    eq('우편함 렌더에 NaN·undefined 없음', c3.nan, false);

    /* ================= [D] 실제 클릭 경로 ================= */
    console.log('[D] 우편함 [받기] 버튼을 진짜로 눌러 지급되는가');
    const dSel = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = 0;
      /* 697 — 옛 통 주입(다이아 900,000 · 쿠폰 1 · 497 «×2»). 재는 것은 «받기 버튼이 도는가» 다 */
      const p = DIA_PACKS.find(x => x.id === 'd4');
      sendMail({ t:'🛒 ' + diaPackName(p), c:p.dia, m:p.cp || 0, src:'shop', b:'옛 상점 지급분' });
      openMail();
      const b = document.querySelector('#mbox [data-ml="' + S.mailx[0].id + '"]');
      window.__b153 = { d0: S.dia, m0: S.mileage || 0, id: S.mailx[0].id };
      return !!b;
    });
    dSel ? ok('상점 우편 행의 [받기] 버튼이 렌더됐다') : fail('상점 우편 행 버튼이 없다');
    if (dSel) {
      await d.page.click('#mbox [data-ml="' + (await d.page.evaluate(() => window.__b153.id)) + '"]');
      await d.page.waitForTimeout(1800);      /* 58/93 FXHOLD 를 넘긴다 */
      const dGot = await d.page.evaluate(() => ({
        dDia: S.dia - window.__b153.d0, dCp: (S.mileage || 0) - window.__b153.m0,
        state: S.mail[window.__b153.id]
      }));
      eq('클릭 수령 ΔS.dia', dGot.dDia, 900000);   /* 497 — 팩 값이 ×2. 경로(우편 경유)는 그대로다 */
      eq('클릭 수령 Δ쿠폰', dGot.dCp, 1);
      eq('클릭 수령 후 우편 상태', dGot.state, 1);
    }

    /* ================= [E] 이용권 — 권한은 즉시 · 재화는 우편 ================= */
    console.log('[E] 이용권(151·697) — 권한도 쿠폰·보석도 **둘 다 즉시**');
    const e1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.pass.noAds = false; S.dia = 1e9; S.mileage = 0;
      openShopPage(); shopCat = 'pass'; setShopCatTabs('pass'); renderShopPage();
      const p = PASS_ITEMS.find(x => x.id === 'noads');
      const d0 = S.dia, m0 = S.mileage || 0;
      const r = buyPass('noads');
      const bought = { dDia: S.dia - d0, dCp: (S.mileage || 0) - m0, mails: S.mailx.length };
      return { r, noAds: !!S.pass.noAds, want: { once: p.once || 0, cp: p.cp || 0 }, bought };
    });
    eq('이용권 구매 반환값', e1.r, true);
    eq('이용권 — 구매 즉시 권한(계정 권한은 우편에 담지 않는다)', e1.noAds, true);
    /* 697 보강3 «이용권도 즉시적용으로» — 권한만이 아니라 그 상품의 보석·쿠폰도 같은 틱이다.
       588 축(«결제가 다이아를 깎지 않는다»)은 이 등식 안에 그대로 산다 — 차감이 되살아나면 Δ가 안 맞는다. */
    eq('이용권 구매 직후 Δ다이아(즉시 보석)', e1.bought.dDia, e1.want.once);
    eq('이용권 구매 직후 Δ쿠폰', e1.bought.dCp, e1.want.cp);
    eq('이용권 구매로 생긴 우편 통수', e1.bought.mails, 0);

    /* E-2 «매일 보석» 누적분도 우편으로 — 며칠치가 밀려도 한 통이다 */
    const e2 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      const p = PASS_ITEMS.find(x => x.daily && x.perm);
      if (!p) return { skip: true };
      S.pass.noAds = true; S.pass.offPlus = true;
      S.pass.dailyAt = {};
      PASS_ITEMS.forEach(x => { S.pass.dailyAt[x.id] = Date.now() - 3 * PASS_DAY_MS - 1000; });
      const d0 = S.dia;
      const got = passDailyTick();
      const after = { dDia: S.dia - d0, mails: S.mailx.length, got };
      return { after };
    });
    if (e2.skip) fail('daily 보석이 붙은 영구 이용권이 없다 — 표가 바뀌었으면 게이트를 고칠 것');
    else {
      /* 697 — «며칠치가 밀려도 **한 번에**» 라는 153 의 성질은 그대로다. 바뀐 것은 그 한 번이
         «우편 한 통» 이 아니라 «지급 한 번» 이라는 것뿐이다(오프라인 정산이 30번 터지지 않는다). */
      eq('매일 보석 3일치 — 정산 직후 ΔS.dia = 정산액(즉시)', e2.after.dDia, e2.after.got);
      eq('매일 보석 3일치 — 새 우편 0통', e2.after.mails, 0);
      e2.after.got > 0 ? ok(`매일 보석 정산액 = ${e2.after.got}`) : fail('3일치 정산인데 0 이 나왔다');
    }

    /* ========= [F] 새 보상 키(마일리지 쿠폰)가 행에 제대로 앉는가 ========= */
    console.log('[F] MAIL_RW 확장 — 마일리지 쿠폰이 행 썸네일·배지로 그려진다');
    const f1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      sendMail({ t:'🛒 쿠폰만', m:2 });                  /* 쿠폰 단독 = 대표 썸네일이 쿠폰이 된다 */
      openMail();
      const row = [...document.querySelectorAll('#mbox .ml-r')]
        .find(r => r.querySelector('[data-ml^="x"]'));
      if (!row) return { err: '행이 없다' };
      const fr = row.querySelector('.ml-i');
      const g4 = SUM_CARD[4];
      return { sum: (row.querySelector('.ml-s i') || {}).textContent,
               q: (row.querySelector('.ifq') || {}).textContent,
               face: fr && fr.style.getPropertyValue('--face').trim(), want: g4.face,
               ic: !!(fr && fr.querySelector('img[data-cur-ic="mile"]')) };
    });
    if (f1.err) fail(f1.err);
    else {
      eq('쿠폰 단독 우편 — 보상 요약', f1.sum, '마일리지 쿠폰');
      eq('쿠폰 단독 우편 — 수량 배지', f1.q, '2');
      eq('쿠폰 단독 우편 — 프레임 색(SUM_CARD[4])', f1.face, f1.want);
      f1.ic ? ok('쿠폰 썸네일이 125 화폐 아이콘(mile)이다') : fail('쿠폰 썸네일이 CUR_ICON 을 안 쓴다');
    }

    const errs = d.errs.filter(e => !/favicon|net::ERR/i.test(e));
    eq('콘솔 에러', errs.length, 0);
    if (errs.length) errs.slice(0, 3).forEach(e => console.log('       ' + e));
    await d.ctx.close();

    const total = pass + fails.length;
    console.log(fails.length ? `\nVERIFY153 ${pass}/${total} FAIL` : `\nVERIFY153 ${pass}/${total} PASS`);
    process.exitCode = fails.length ? 1 : 0;
  } finally {
    await browser.close();
  }
})();
