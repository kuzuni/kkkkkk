/* 작업 153 — «상점 구매품은 전부 우편함으로 지급 · 상점발 우편은 보관 기간 무한» 회귀 게이트.
 *   node tools/verify153.js
 *
 * 주인 지시(2026-08-27) 원문: «상점에서 구매한 것들은 전부 우편함으로 지급, 상점 구매분은
 * 우편함 기간 무한». 구현은 `sendMail()` 한 곳으로 모았고 대상은 **지급품(재화·패키지)** 이다.
 *   · 다이아 상품 5종 `grantDiaPack()`  — 다이아 + 마일리지 쿠폰
 *   · 마일리지 교환 `mileageExchange()` — 다이아
 *   · 유물조각 교환 `[data-ex]`          — 유물조각
 * 제외(근거는 PROGRESS 153 비고): 소환(가챠) 결과는 즉시 결과 팝업(12) 유지 · 이용권(124/151)은
 * 물건이 아니라 계정 권한이라 즉시 반영 · 광고 상품(COIN_ADS)은 «구매» 가 아니라 무료 수령.
 *
 * 다섯 겹으로 본다:
 *   [A] 정적 — 세 경로의 본문에 «직접 가산»(S.dia +=, S.relic +=, S.mileage =) 이 되살아났는가.
 *   [B] 지급 — 구매 «직전/직후» 를 같은 tick 에서 재서 재화 Δ가 0 이고 우편이 1통 늘었는가.
 *              그리고 그 우편을 받으면 그제서야 정확히 그 수량이 들어오는가.
 *   [C] 무한 보관 — 미수령 상점 우편이 [읽음 전체 삭제]·세이브 라운드트립을 넘어 살아남는가.
 *   [D] 실제 클릭 — 우편함 [받기] 버튼을 진짜로 눌러 지급이 되는가(핸들러가 연결돼 있는가).
 *   [E] 과교정 방지 — 이용권 구매는 여전히 «즉시» 권한이 서는가.
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
    console.log('[A] 정적 — 구매 경로에 «직접 가산» 이 없는가');
    const bGrant = body('function grantDiaPack(p)');
    const bMile  = body('function mileageExchange()');
    bGrant ? ok('grantDiaPack 본문 확보') : fail('grantDiaPack 본문을 못 찾았다');
    bMile  ? ok('mileageExchange 본문 확보') : fail('mileageExchange 본문을 못 찾았다');
    if (bGrant) {
      /^[\s\S]*$/.test(bGrant) && !/S\.dia\s*\+=/.test(bGrant)
        ? ok('grantDiaPack — S.dia 직접 가산 없음')
        : fail('grantDiaPack 이 S.dia 를 직접 더한다 — 153 회귀');
      !/S\.mileage\s*=\s*\(S\.mileage/.test(bGrant)
        ? ok('grantDiaPack — 쿠폰 직접 가산 없음')
        : fail('grantDiaPack 이 마일리지 쿠폰을 직접 더한다 — 153 회귀');
      /sendMail\(/.test(bGrant) ? ok('grantDiaPack — sendMail 경유') : fail('grantDiaPack 이 sendMail 을 안 쓴다');
    }
    if (bMile) {
      !/S\.dia\s*\+=/.test(bMile) ? ok('mileageExchange — S.dia 직접 가산 없음')
                                  : fail('mileageExchange 가 S.dia 를 직접 더한다 — 153 회귀');
      /sendMail\(/.test(bMile) ? ok('mileageExchange — sendMail 경유') : fail('mileageExchange 가 sendMail 을 안 쓴다');
    }
    /* 유물조각 교환은 핸들러 안 블록이라 근처 창으로 본다 */
    const exI = SRC.indexOf("const ex = EXCHANGE.find(");
    const exW = exI >= 0 ? SRC.slice(exI, exI + 900) : '';
    exI >= 0 ? ok('유물조각 교환 블록 확보') : fail('유물조각 교환 블록을 못 찾았다');
    if (exI >= 0) {
      !/S\.relic\s*\+=/.test(exW) ? ok('유물조각 교환 — S.relic 직접 가산 없음')
                                  : fail('유물조각 교환이 S.relic 을 직접 더한다 — 153 회귀');
      /sendMail\(/.test(exW) ? ok('유물조각 교환 — sendMail 경유') : fail('유물조각 교환이 sendMail 을 안 쓴다');
    }
    /* 삭제가 «수령 완료» 만 고르는가 — 무한 보관의 뿌리 */
    const bDel = body('function delReadMail()');
    bDel && /S\.mail\[m\.id\] === 1/.test(bDel)
      ? ok('delReadMail — 수령 완료(1) 만 고른다')
      : fail('delReadMail 이 미수령 우편까지 고른다 — 보관 무한이 깨진다');

    const d = await open(browser);

    /* ================= [B] 지급 — 구매는 우편으로만 ================= */
    console.log('[B] 지급 — 구매 즉시 재화 Δ0 · 우편 1통 · 수령 시 정확히 지급');

    /* B-1 다이아 패키지 d5(다이아 1,000,000 · 쿠폰 2) */
    const b1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = 0;
      const p = DIA_PACKS.find(x => x.id === 'd5');
      const d0 = S.dia, m0 = S.mileage || 0, paid0 = S.cnt.paid || 0, n0 = S.mailx.length;
      devBuyDia('d5');
      const after = { dDia: S.dia - d0, dCp: (S.mileage || 0) - m0,
                      dPaid: (S.cnt.paid || 0) - paid0, dMail: S.mailx.length - n0 };
      const mail = S.mailx[S.mailx.length - 1];
      const c0 = S.dia, cp0 = S.mileage || 0;
      claimMail(mail.id);
      return { want: { dia: p.dia, cp: p.cp }, after,
               mail: { c: mail.c, m: mail.m, g: mail.g, r: mail.r, id: mail.id },
               claimed: { dDia: S.dia - c0, dCp: (S.mileage || 0) - cp0, state: S.mail[mail.id] } };
    });
    eq('d5 구매 직후 ΔS.dia', b1.after.dDia, 0);
    eq('d5 구매 직후 Δ쿠폰', b1.after.dCp, 0);
    eq('d5 구매 직후 Δ우편 통수', b1.after.dMail, 1);
    eq('d5 구매 직후 Δ결제 카운터', b1.after.dPaid, 1);
    eq('d5 우편 보상 다이아', b1.mail.c, b1.want.dia);
    eq('d5 우편 보상 쿠폰', b1.mail.m, b1.want.cp);
    eq('d5 우편 보상 골드·유물', [b1.mail.g, b1.mail.r], [0, 0]);
    eq('d5 수령 후 ΔS.dia', b1.claimed.dDia, b1.want.dia);
    eq('d5 수령 후 Δ쿠폰', b1.claimed.dCp, b1.want.cp);
    eq('d5 우편 상태(1=수령 완료)', b1.claimed.state, 1);

    /* B-2 마일리지 교환 */
    const b2 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = MILE_NEED;
      const d0 = S.dia, n0 = S.mailx.length;
      const r = mileageExchange();
      const after = { r, dDia: S.dia - d0, cp: S.mileage, dMail: S.mailx.length - n0 };
      const mail = S.mailx[S.mailx.length - 1];
      const c0 = S.dia;
      claimMail(mail.id);
      return { want: MILE_DIA, after, mailC: mail.c, dClaim: S.dia - c0 };
    });
    eq('마일리지 교환 반환값', b2.after.r, true);
    eq('교환 직후 ΔS.dia', b2.after.dDia, 0);
    eq('교환 직후 남은 쿠폰', b2.after.cp, 0);
    eq('교환 직후 Δ우편 통수', b2.after.dMail, 1);
    eq('교환 우편 보상 다이아', b2.mailC, b2.want);
    eq('교환 수령 후 ΔS.dia', b2.dClaim, b2.want);

    /* B-3 유물조각 교환 — 진짜 카드 버튼을 클릭한다 */
    const b3 = await d.page.evaluate(async () => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.dia = 5e6; S.relic = 0;
      openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      await new Promise(r => setTimeout(r, 60));
      const btn = document.querySelector('#shopList [data-ex]');
      if (!btn) return { err: '유물조각 교환 버튼 없음' };
      const ex = EXCHANGE.find(v => v.dia === +btn.dataset.ex);
      const d0 = S.dia, r0 = S.relic, n0 = S.mailx.length;
      btn.click();
      const after = { dDia: S.dia - d0, dRel: S.relic - r0, dMail: S.mailx.length - n0 };
      const mail = S.mailx[S.mailx.length - 1];
      const rr = S.relic;
      claimMail(mail.id);
      return { want: { dia: ex.dia, rel: ex.rel }, after, mailR: mail.r, dClaim: S.relic - rr };
    });
    if (b3.err) fail(b3.err);
    else {
      eq('유물조각 교환 직후 ΔS.dia', b3.after.dDia, -b3.want.dia);
      eq('유물조각 교환 직후 ΔS.relic', b3.after.dRel, 0);
      eq('유물조각 교환 직후 Δ우편 통수', b3.after.dMail, 1);
      eq('유물조각 우편 보상', b3.mailR, b3.want.rel);
      eq('유물조각 수령 후 ΔS.relic', b3.dClaim, b3.want.rel);
    }

    /* ================= [C] 무한 보관 ================= */
    console.log('[C] 보관 무한 — 미수령 상점 우편은 삭제·재기동을 넘어 남는다');
    const c1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      devBuyDia('d1');                       /* 미수령 상점 우편 1통 */
      devBuyDia('d2'); const keep = S.mailx[1].id;
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
    eq('load() 뒤 그 우편의 다이아 보상', c2.c, 35000);
    c2.seq >= 2 ? ok(`load() 뒤 mailSeq 가 id 보다 앞서 있다 = ${c2.seq}`)
                : fail(`load() 뒤 mailSeq = ${c2.seq} — 재사용 id 가 나올 수 있다`);
    eq('mailx 없는 구 세이브 로드', c2.legacy, 0);

    /* 상점 우편 행이 «기한 없음» 으로 그려지는가 — 무한 보관의 화면 쪽 표기 */
    const c3 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      devBuyDia('d2');
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
      devBuyDia('d4');                        /* 다이아 450,000 · 쿠폰 1 */
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
      eq('클릭 수령 ΔS.dia', dGot.dDia, 450000);
      eq('클릭 수령 Δ쿠폰', dGot.dCp, 1);
      eq('클릭 수령 후 우편 상태', dGot.state, 1);
    }

    /* ================= [E] 이용권 — 권한은 즉시 · 재화는 우편 ================= */
    console.log('[E] 이용권(151) — 계정 권한은 즉시, 쿠폰·보석은 우편');
    const e1 = await d.page.evaluate(() => {
      S.mailx = []; S.mailSeq = 0; S.mail = {}; S.pass.noAds = false; S.dia = 1e9; S.mileage = 0;
      openShopPage(); shopCat = 'pass'; setShopCatTabs('pass'); renderShopPage();
      const p = PASS_ITEMS.find(x => x.id === 'noads');
      const d0 = S.dia, m0 = S.mileage || 0;
      const r = buyPass('noads');
      const bought = { dDia: S.dia - d0, dCp: (S.mileage || 0) - m0, mails: S.mailx.length };
      const mail = S.mailx[0];
      const c0 = S.dia, cp0 = S.mileage || 0;
      if (mail) claimMail(mail.id);
      return { r, noAds: !!S.pass.noAds, want: { once: p.once || 0, cp: p.cp || 0 }, bought,
               mail: mail ? { c: mail.c, m: mail.m } : null,
               claimed: { dDia: S.dia - c0, dCp: (S.mileage || 0) - cp0 } };
    });
    eq('이용권 구매 반환값', e1.r, true);
    eq('이용권 — 구매 즉시 권한(계정 권한은 우편에 담지 않는다)', e1.noAds, true);
    /* 구매 직후 다이아 Δ는 «가격만» 나가야 한다 — 즉시 보석이 여기서 들어오면 우편을 우회한 것이다 */
    eq('이용권 구매 직후 Δ쿠폰', e1.bought.dCp, 0);
    eq('이용권 구매로 생긴 우편 통수', e1.bought.mails, e1.want.once || e1.want.cp ? 1 : 0);
    if (e1.mail) {
      eq('이용권 우편 — 즉시 보석', e1.mail.c, e1.want.once);
      eq('이용권 우편 — 마일리지 쿠폰', e1.mail.m, e1.want.cp);
      eq('이용권 우편 수령 후 Δ다이아', e1.claimed.dDia, e1.want.once);
      eq('이용권 우편 수령 후 Δ쿠폰', e1.claimed.dCp, e1.want.cp);
    }

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
      const sum = S.mailx.reduce((a, m) => a + m.c, 0);
      const c0 = S.dia;
      S.mailx.slice().forEach(m => claimMail(m.id));
      return { after, sum, dClaim: S.dia - c0 };
    });
    if (e2.skip) fail('daily 보석이 붙은 영구 이용권이 없다 — 표가 바뀌었으면 게이트를 고칠 것');
    else {
      eq('매일 보석 3일치 — 정산 직후 ΔS.dia', e2.after.dDia, 0);
      eq('매일 보석 3일치 — 우편 통수(모아서 1통)', e2.after.mails, 1);
      eq('매일 보석 우편 합계 = 정산액', e2.sum, e2.after.got);
      eq('매일 보석 수령 후 ΔS.dia', e2.dClaim, e2.after.got);
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
