/* 589 게이트 — 결제 목업: «클릭 = 결제 완료» · 지급은 우편함 · «우편함을 확인하세요»
 *
 * 주인 원문(2026-08-31): «결제시스템 아직 연동안햇으니까 일단 그리고 개발중이니까 **클릭시 걍
 *   결제된거로 쳐주기**» · «결제하는거들 클릭시 결제된거로 치고 재화 주던지 하쇼 그리고
 *   **우편함으로 보내줘야함**. **우편함확인하라고 해주기**».
 *
 * ⚠ **이 행은 방침 번복이다** — 44(«결제 미연동»)와 34 축복 위 주석이 «같은 사유로 **목업을
 *    만들지 않는다**» 고 적어 뒀다. 주인이 «개발중이니까» 라며 정반대를 지시했으므로 그 주석도
 *    같이 갱신했다. 번복 범위는 **원화 표기 상품**뿐이다(광고·게임 내 다이아 소비는 그대로).
 *
 * ⚠ **절반은 이미 있었다** — 153(2026-08-27)이 «상점 구매품은 전부 우편함으로» 를 만들어
 *    `sendMail()` 을 세워 뒀다. 이 행은 «새로 만들기» 가 아니라 **빠진 자리를 그 규약에 편입**이다.
 *
 * 절:
 *   [A] 진입점이 하나 — `payMock()` · 원화 상품 3계열(다이아 팩 · 이용권 · 프리미엄 패스)이
 *       전부 그 한 곳을 지난다 · 상품별 «결제 완료» 안내 0건
 *   [B] 원화 상품 전수 실동작 — 클릭 → 결제 1건 · `S.dia` 감소 0
 *   [C] 지급이 우편함에만 — 즉시 지급 0. 예외는 **선언된 목록**(`PAY_INSTANT` = 계정 권한)뿐이고
 *       그 목록 밖의 상품이 즉시 지급하면 빨개진다
 *   [D] 안내 — 구매 직후 «우편함» 안내가 **1건** · 팝업이 아니라 토스트(149) · 프레임(1080) 안
 *   [E] 레드닷 — `sideAlert('mail')` 이 켜진다
 *   [F] 수령 — 우편을 받으면 재화가 **상품 표대로** 들어온다
 *   [G] `S.mailx` 상한 — 100회 구매 뒤에도 목록·성능 정상 · **미수령은 한 통도 안 지운다**
 *   [I] 안 건드린 것 — 게임 내 다이아 소비(소환·룰렛·강화)는 불변
 *   [J] 199 이관 기록 — 목업 기간 동안 유료 축은 밸런스 근거가 될 수 없다
 *   [R] 되돌림 — 옛 «준비 중» 안내로 되돌린 사본에서 [B] 가 빨개진다 ·
 *       안내 우편의 «썸네일 예외» 를 빼면 프리미엄 구매가 우편을 못 만든다
 *   [H] 콘솔·페이지 에러 0
 *
 * 실행: node tools/verify589.js      → 마지막 줄 VERIFY589 n/n PASS
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');   /* 살아 있는 코드만 */
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAME = 1080;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const reset = `
  S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
  S.dia = 500000; S.gold = 1e9; S.mileage = 0;
  S.mailx = []; S.mailSeq = 0; S.mail = {};
  S.cnt = S.cnt || {}; S.cnt.paid = 0;
  syncNoAds();
`;

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: FRAME, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ═════ [A] 진입점이 하나 ═════ */
  console.log('\n[A] 결제 진입점이 하나 — payMock');
  const A = await page.evaluate(() => ({
    hasPayMock: typeof payMock === 'function',
    src: String(payMock),
    instant: typeof PAY_INSTANT === 'undefined' ? null : PAY_INSTANT.slice(),
    diaSrc: String(buyDiaPack), passSrc: String(buyPass), premSrc: String(buyPassPrem),
    grantDiaSrc: String(grantDiaPack),
  }));
  ok(A.hasPayMock, 'A1 `payMock()` 이 있다');
  ok(/S\.cnt\.paid/.test(A.src) && /notify\(/.test(A.src),
    'A2 결제 카운터와 안내가 그 한 함수 안에 있다', '소스 grep');
  /* «세지 않는다» = 카운터에 **대입하지 않는다**. 반환 객체에 현재 값을 실어 보내는 것은 세는 것이 아니다. */
  ok(!/S\.cnt\.paid\s*=/.test(A.grantDiaSrc),
    'A3 지급 함수(`grantDiaPack`)가 결제 카운터에 대입하지 않는다 — 결제 사건은 payMock 한 곳',
    (A.grantDiaSrc.match(/S\.cnt\.paid[^,;\n]*/g) || []).join(' | ') || '참조 0건');
  ['diaSrc', 'passSrc', 'premSrc'].forEach((k, i) => {
    ok(/payMock\(/.test(A[k]), 'A4-' + (i + 1) + ' ' + ['다이아 팩', '이용권', '프리미엄 패스'][i]
      + ' 구매가 payMock 을 지난다', '소스 grep');
  });
  const hits = (CODE.match(/notify\('💳 결제 완료/g) || []).length;
  ok(hits === 1, 'A5 «결제 완료» 안내가 살아 있는 코드에 딱 한 곳(상품별 흉내 0건)', hits + '곳');
  ['결제 준비 중입니다', '결제 연동 준비 중입니다'].forEach(t => {
    ok(!CODE.includes(t), 'A6 옛 «' + t + '» 이 살아 있는 코드에 0건', CODE.includes(t) ? '되살아났다' : '0건');
  });
  ok(Array.isArray(A.instant) && A.instant.length > 0,
    'A7 «즉시 반영» 예외가 목록으로 선언돼 있다(`PAY_INSTANT`)', (A.instant || []).join(' · '));

  /* ═════ [B] 원화 상품 전수 — 클릭 = 결제 1건 · 다이아 감소 0 ═════ */
  console.log('\n[B] 원화 상품 전수 — 결제 1건 · S.dia 감소 0');
  /* 13 재화 탭 다이아 팩 5종 — 실제 카드 버튼을 누른다(배선까지 본다) */
  await page.evaluate(() => { openShopTab('coin'); });
  await page.waitForTimeout(700);
  for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    await page.evaluate('(() => {' + reset + 'renderCoinPage(document.getElementById("shopList"));})()');
    await page.waitForTimeout(120);
    const d0 = await page.evaluate(() => S.dia);
    await page.locator('#shopList [data-diabuy="' + id + '"]').click();
    await page.waitForTimeout(220);
    const r = await page.evaluate((i) => {
      const p = DIA_PACKS.find(x => x.id === i), m = (S.mailx || [])[0] || null;
      return { dia: S.dia, paid: S.cnt.paid | 0, mails: (S.mailx || []).length,
               mailC: m ? m.c : null, mailM: m ? m.m : null, want: p.dia, wantCp: p.cp | 0 };
    }, id);
    ok(r.dia === d0 && r.paid === 1 && r.mails === 1 && r.mailC === r.want && r.mailM === r.wantCp,
      'B1:' + id + ' 클릭 = 결제 1건 · 다이아 Δ0 · 우편 1통(다이아 ' + r.want + ' · 쿠폰 ' + r.wantCp + ')',
      'dia ' + d0 + '→' + r.dia + ' · paid ' + r.paid + ' · 우편 ' + r.mails + ' · c=' + r.mailC + ' m=' + r.mailM);
  }
  /* 10 상점 이용권 3종 */
  await page.evaluate(() => { openShopTab('pass'); });
  await page.waitForTimeout(700);
  for (const id of ['noads', 'abless', 'offplus']) {
    const r = await page.evaluate('(() => {' + reset + `
      renderPassPage(document.getElementById('shopList'));
      const d0 = S.dia, r = buyPass('${id}');
      const p = PASS_ITEMS.find(x => x.id === '${id}'), m = (S.mailx || [])[0] || null;
      return { r, dDia: S.dia - d0, paid: S.cnt.paid | 0, mails: (S.mailx || []).length,
               mailC: m ? m.c : null, want: p.once, own: passOwned('${id}') };
    })()`);
    ok(r.r === true && r.dDia === 0 && r.paid === 1 && r.mails === 1 && r.mailC === r.want && r.own === true,
      'B2:' + id + ' 클릭 = 결제 1건 · 다이아 Δ0 · 우편 1통 · 권한 즉시',
      'Δdia ' + r.dDia + ' · paid ' + r.paid + ' · 우편 ' + r.mails + ' · own ' + r.own);
  }
  /* 35 프리미엄 패스 4탭 — `#psBuy` 배선까지 */
  const B3 = await page.evaluate('(() => {' + reset + `
    const out = [];
    Object.keys(PASS_TABS).forEach(t => {
      S.pass.prem = {}; S.mailx = []; S.mailSeq = 0; S.mail = {}; S.cnt.paid = 0;
      const d0 = S.dia, r = buyPassPrem(t), m = (S.mailx || [])[0] || null;
      out.push({ t, r, dDia: S.dia - d0, paid: S.cnt.paid | 0, mails: (S.mailx || []).length,
                 prem: !!S.pass.prem[t], ic: m ? m.ic : null, rw: m ? (m.g + m.c + m.r + m.m) : null });
    });
    return out;
  })()`);
  B3.forEach(r => {
    ok(r.r === true && r.dDia === 0 && r.paid === 1 && r.mails === 1 && r.prem === true && r.rw === 0 && !!r.ic,
      'B3:' + r.t + ' 프리미엄 = 결제 1건 · 다이아 Δ0 · 권한 즉시 · **보상 0통** 구매 확인 우편 1통',
      'Δdia ' + r.dDia + ' · paid ' + r.paid + ' · 우편 ' + r.mails + '(보상 ' + r.rw + ' · 썸네일 ' + r.ic + ')');
  });
  const B4 = await page.evaluate(() => /buyPassPrem\(\)/.test(String(document.getElementById('psBuy').onclick)));
  ok(B4, 'B4 `#psBuy` 버튼이 실제로 그 경로에 배선돼 있다', '핸들러 grep');

  /* ═════ [C] 지급은 우편함에만 — 예외는 선언된 목록뿐 ═════ */
  console.log('\n[C] 지급이 우편함에만 — 예외는 PAY_INSTANT 목록뿐');
  const C = await page.evaluate('(() => {' + reset + `
    /* 원화 상품 전수를 한 번씩 사고, «지갑이 즉시 늘었는가» 를 본다 */
    const before = { dia: S.dia, gold: S.gold, mile: S.mileage | 0, relic: S.relic | 0 };
    DIA_PACKS.forEach(p => buyDiaPack(p));
    PASS_ITEMS.forEach(p => buyPass(p.id));
    Object.keys(PASS_TABS).forEach(t => buyPassPrem(t));
    const after = { dia: S.dia, gold: S.gold, mile: S.mileage | 0, relic: S.relic | 0 };
    /* 예외 목록이 말하는 «권한» 만 즉시 켜졌는가 */
    const perms = { noads: passOwned('noads'), abless: passOwned('abless'), offplus: passOwned('offplus'),
                    prem: Object.keys(S.pass.prem || {}).length };
    return { before, after, mails: (S.mailx || []).length, perms,
             instant: PAY_INSTANT.slice(), paid: S.cnt.paid | 0 };
  })()`);
  ok(C.after.dia === C.before.dia && C.after.mile === C.before.mile && C.after.relic === C.before.relic,
    'C1 원화 상품 12건을 다 사도 지갑이 즉시 안 늘어난다(즉시 지급 0)',
    'dia ' + C.before.dia + '→' + C.after.dia + ' · 마일 ' + C.before.mile + '→' + C.after.mile);
  ok(C.paid === 12, 'C2 그 12건이 전부 결제로 세어졌다', C.paid + '건');
  ok(C.mails === 12, 'C3 12건이 전부 우편 한 통씩을 만들었다', C.mails + '통');
  /* 예외는 «계정 권한» 뿐이고, 그 목록이 실제로 그 셋을 덮는가 */
  const wantInstant = ['pass:noads', 'pass:abless', 'pass:offplus', 'prem:stage', 'prem:att', 'prem:tower', 'prem:despair'];
  ok(JSON.stringify(C.instant) === JSON.stringify(wantInstant),
    'C4 예외 목록이 계정 권한 7건 그대로(그 밖은 예외가 아니다)', C.instant.join(' · '));
  ok(C.perms.noads && C.perms.abless && C.perms.offplus && C.perms.prem === 4,
    'C5 그 목록의 권한만 즉시 반영됐다', JSON.stringify(C.perms));
  /* 목록 밖의 계열(다이아 팩)이 즉시 지급으로 새면 C1 이 잡는다 — 그 대응을 명시 */
  ok(!C.instant.some(k => k.indexOf('dia:') === 0),
    'C6 다이아 팩(재화 상품)은 예외 목록에 없다 — 반드시 우편이다', '목록 grep');

  /* ═════ [D] 안내 ═════ */
  console.log('\n[D] 안내 — «우편함을 확인하세요» 1건 · 토스트 · 프레임 안');
  /* ⚠ [C] 가 12건을 연달아 샀으므로 토스트 **큐**(206)에 밀린 것이 남아 있다. 지운 노드만 세면
     그 큐가 뒤늦게 새 토스트를 밀어 넣어 «1건» 이 4건으로 읽힌다 — 큐가 마를 때까지 비운다. */
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); });
    await page.waitForTimeout(180);
    const left = await page.evaluate(() => document.querySelectorAll('#fxl .fx-toast').length);
    if (!left) break;
  }
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); });
  await page.evaluate('(() => {' + reset + '})()');
  await page.evaluate(() => { buyDiaPack(DIA_PACKS[4]); });
  await page.waitForTimeout(160);
  const D = await page.evaluate(() => {
    const ts = [...document.querySelectorAll('#fxl .fx-toast')];
    const modal = document.querySelectorAll('.modal.on, #modal.on').length;
    const r = ts.length ? ts[ts.length - 1].getBoundingClientRect() : null;
    return { n: ts.length, txt: ts.map(t => t.textContent).join(' | '), modal,
             x1: r ? +r.left.toFixed(2) : null, x2: r ? +r.right.toFixed(2) : null };
  });
  ok(D.n === 1, 'D1 구매 직후 안내가 딱 1건', D.n + '건 — ' + D.txt);
  ok(/우편함/.test(D.txt) && /결제 완료/.test(D.txt),
    'D2 안내가 «결제 완료» 와 «우편함» 을 둘 다 말한다', D.txt);
  ok(D.modal === 0, 'D3 팝업이 아니라 토스트다(149)', '열린 모달 ' + D.modal + '개');
  ok(D.x1 !== null && D.x1 >= 0 && D.x2 <= FRAME,
    'D4 토스트가 프레임(1080) 안 — 149 폭 예산', D.x1 + '..' + D.x2);
  /* 워스트케이스 — 가장 긴 상품 이름으로도 안 넘친다 */
  await page.evaluate(() => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); });
  await page.evaluate(() => notify('💳 결제 완료 — ' + '오프라인 보상 증가 이용권' + ' · 우편함을 확인하세요'));
  await page.waitForTimeout(140);
  const D5 = await page.evaluate(() => {
    const t = [...document.querySelectorAll('#fxl .fx-toast')].pop();
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x1: +r.left.toFixed(2), x2: +r.right.toFixed(2), w: +r.width.toFixed(2) };
  });
  ok(D5 && D5.x1 >= 0 && D5.x2 <= FRAME,
    'D5 워스트케이스(가장 긴 이용권 이름)에서도 프레임 안', D5 ? D5.x1 + '..' + D5.x2 + ' (w ' + D5.w + ')' : 'null');

  /* ═════ [E] 레드닷 ═════ */
  console.log('\n[E] 우편 레드닷');
  const E = await page.evaluate('(() => {' + reset + `
    const off = document.querySelectorAll('#sideL .alert, #mnw .alert').length;
    buyDiaPack(DIA_PACKS[0]);
    return { on: !!(document.querySelector('#mnw .mn-b.alert, #menub.alert, #sideL .alert')), off };
  })()`);
  ok(E.on, 'E1 구매가 ▦ 메뉴 우편 레드닷을 켠다(`sideAlert(\'mail\')`)', String(E.on));

  /* ═════ [F] 수령 — 상품 표대로 ═════ */
  console.log('\n[F] 수령 — 재화가 상품 표대로 들어온다');
  const F = await page.evaluate('(() => {' + reset + `
    const out = [];
    DIA_PACKS.forEach(p => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      const d0 = S.dia, c0 = S.mileage | 0;
      buyDiaPack(p);
      /* ⚠ claimAllMail() 을 쓰면 **고정 우편(m1~m5)** 까지 같이 받는다(S.mail 을 비운 직후라
         매 회차 되받아진다) — 이 절이 재는 것은 «이 구매의 우편» 하나다. */
      claimMail(S.mailx[S.mailx.length - 1].id);
      out.push({ id: p.id, dDia: S.dia - d0, dCp: (S.mileage | 0) - c0, want: p.dia, wantCp: p.cp | 0 });
    });
    return out;
  })()`);
  F.forEach(r => ok(r.dDia === r.want && r.dCp === r.wantCp,
    'F1:' + r.id + ' 우편 수령 → 다이아 +' + r.want + ' · 쿠폰 +' + r.wantCp,
    '+' + r.dDia + ' / +' + r.dCp));

  /* ═════ [G] S.mailx 상한 ═════ */
  console.log('\n[G] S.mailx 상한 — 100회 구매 뒤에도 정상 · 미수령은 안 지운다');
  const G = await page.evaluate('(() => {' + reset + `
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) { buyDiaPack(DIA_PACKS[0]); claimAllMail(); }
    const capped = (S.mailx || []).length;
    /* 미수령만 100통 — 한 통도 안 지워져야 한다(받을 보상이 조용히 사라지면 안 된다) */
    S.mailx = []; S.mailSeq = 0; S.mail = {};
    for (let i = 0; i < 100; i++) buyDiaPack(DIA_PACKS[0]);
    const unread = (S.mailx || []).length;
    const unreadKept = (S.mailx || []).filter(m => !S.mail[m.id]).length;
    const ms = +(performance.now() - t0).toFixed(1);
    return { capped, unread, unreadKept, ms, max: MAILX_MAX };
  })()`);
  ok(G.capped <= G.max, 'G1 수령한 우편은 상한(' + G.max + ') 안으로 정리된다', G.capped + '통');
  ok(G.unread === 100 && G.unreadKept === 100,
    'G2 **미수령은 한 통도 안 지운다** — 100통 그대로', G.unread + '통(미수령 ' + G.unreadKept + ')');
  ok(G.ms < 8000, 'G3 200회 구매·수령이 8초 안(성능)', G.ms + 'ms');
  const G4 = await page.evaluate(async () => {
    const t = performance.now();
    openMail();
    await new Promise(r => setTimeout(r, 0));
    const rows = document.querySelectorAll('.ml-r').length;
    closeModal();
    return { ms: +(performance.now() - t).toFixed(1), rows };
  });
  ok(G4.rows > 0 && G4.ms < 3000, 'G4 그 상태에서 우편함이 정상적으로 열린다',
    G4.rows + '행 · ' + G4.ms + 'ms');

  /* ═════ [I] 안 건드린 것 ═════ */
  console.log('\n[I] 안 건드린 것 — 게임 내 다이아 소비는 불변');
  const I = await page.evaluate(() => ({
    packs: DIA_PACKS.map(p => p.dia), mile: MILE_DIA,
    /* 소환은 게임 내 소비다 — 이 행의 범위가 아니다. 차감은 `payFor()` 가 한다. */
    sumSrc: typeof doSummon === 'function' ? String(doSummon) : '',
    payForSrc: typeof payFor === 'function' ? String(payFor) : '',
    /* 실제로 다이아를 쓰는지 굴려 본다(문자열 grep 만으로는 «죽은 분기» 를 못 가른다) */
    spend: (() => {
      S.dia = 1e9; S.relic = 1e9; const d0 = S.dia;
      const c = summonCost('skill', 1);
      const okp = payFor('skill', c);
      return { okp, spent: d0 - S.dia, cost: c };
    })(),
  }));
  ok(JSON.stringify(I.packs) === JSON.stringify([10000, 70000, 150000, 900000, 2000000]),
    'I1 다이아 팩 수량 불변(497)', I.packs.join('/'));
  ok(I.mile === 5000000, 'I2 마일리지 교환 불변(497)', String(I.mile));
  ok(I.spend.okp === true && I.spend.spent === I.spend.cost && I.spend.cost > 0,
    'I3 소환은 여전히 다이아를 **쓴다**(게임 내 소비 — 이 행의 범위 밖)',
    '1회 비용 ' + I.spend.cost + ' · 실제 차감 ' + I.spend.spent);
  ok(/S\.dia\s*-=/.test(I.payForSrc), 'I4 그 차감이 `payFor()` 한 곳에 있다(589 가 안 건드린 경로)', '소스 grep');

  /* ═════ [J] 199 이관 기록 ═════ */
  console.log('\n[J] 199 이관 — 목업 기간의 유료 축');
  console.log('  ⚠ «클릭 = 결제 완료» 는 **모든 유료 상품이 사실상 무료**라는 뜻이다.');
  console.log('    497(다이아 팩 ×2 = ₩110,000/200만) · 496(소환 레벨) · 498(첫날 100만)이 세운');
  console.log('    수급·목표는 목업이 켜져 있는 동안 **밸런스 근거가 될 수 없다.**');
  console.log('  ⇒ 199 는 유료 축을 «실제 결제가 붙은 뒤» 로 미루고, 목업 기간은 무과금 축만으로 잰다.');
  console.log('  · 원화 상품 전수: 다이아 팩 5 + 이용권 3 + 프리미엄 패스 4 = **12건** (전부 목업)');

  /* ═════ [R] 되돌림 ═════ */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  const R1 = await page.evaluate('(() => {' + reset + `
    /* 옛 «준비 중» 경로 사본 — 클릭이 안내만 하고 아무것도 안 준다 */
    const d0 = S.dia, p0 = S.cnt.paid | 0, n0 = (S.mailx || []).length;
    notify('다이아 2,000,000개 <b>110,000원</b> — 결제 준비 중입니다');
    return { dDia: S.dia - d0, dPaid: (S.cnt.paid | 0) - p0, dMail: (S.mailx || []).length - n0 };
  })()`);
  ok(R1.dDia === 0 && R1.dPaid === 0 && R1.dMail === 0,
    'R1 옛 «준비 중» 사본은 결제 0 · 우편 0 = [B] 의 자가 그 차이를 본다',
    '결제 ' + R1.dPaid + ' · 우편 ' + R1.dMail);
  const R2 = await page.evaluate('(() => {' + reset + `
    /* 안내 우편의 «썸네일 예외» 를 빼면(=보상 0통 금지 그대로면) 프리미엄이 우편을 못 만든다 */
    const noIc = sendMail({ t:'테스트 — 보상 0 · 썸네일 없음', b:'' });
    const withIc = sendMail({ t:'테스트 — 보상 0 · 썸네일 있음', ic:'🎫', iq:'프리미엄', ig:4, b:'' });
    return { noIc: noIc === null, withIc: !!withIc, ic: withIc ? withIc.ic : null };
  })()`);
  ok(R2.noIc === true, 'R2 보상 0 + 썸네일 없음 = 우편을 만들지 않는다(153 규약 유지)', String(R2.noIc));
  ok(R2.withIc === true && R2.ic === '🎫',
    'R2b 보상 0 + 썸네일 있음 = 안내 우편을 만든다(589 가 넓힌 정확한 폭)', R2.ic);
  const R3 = await page.evaluate(() => {
    /* 안내 우편 행이 «0» 배지를 안 달고, 썸네일이 제 아이콘인가 — 화면까지 확인 */
    S.mailx = []; S.mailSeq = 0; S.mail = {};
    const m = sendMail({ t:'🎫 프리미엄 패스 — 스테이지', ic:'🎫', iq:'프리미엄', ig:4, b:'x' });
    const html = mailRowHtml(m);
    return { hasQty: /ifq/.test(html), hasIc: html.indexOf('🎫') >= 0, sum: /프리미엄/.test(html) };
  });
  ok(R3.hasQty === false && R3.hasIc && R3.sum,
    'R3 안내 우편 행 — 수량 배지 없음 · 썸네일 🎫 · 요약 «프리미엄»', JSON.stringify(R3));

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  const line = 'VERIFY589 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
