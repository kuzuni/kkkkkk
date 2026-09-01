#!/usr/bin/env node
/* 697 게이트 — 상점 구매는 **전부 즉시 지급**(우편함 경유 폐지)
 *
 * 주인 원문(2026-09-02): «다이아를 다른재화로 바꾸는거는 즉각으로 바꾸는거로 해줘 우편으로
 *   오지말고» · 보강1 «광고 상품들도 우편말고 걍 바로 오는거로 해» · 보강2 «걍 상점에서 구매한거
 *   걍 다 즉시 지급으로 하자 우편함 말고» · 보강3 «이용권도 즉시적용으로».
 *
 * ⚑ 이 행은 **153 의 방침 번복**이다(«상점에서 구매한 것들은 전부 우편함으로 지급»). 그래서
 *   자의 절반은 «새 규약이 참인가» 이고 절반은 **«옛 규약이 지키던 것이 안 무너졌는가»** 다 —
 *   우편함 부품(고정 우편 5통 · 180 월별 다이아 · 이미 받아 둔 옛 상점 통)은 그대로 살아야 한다
 *   (주인 «기존 우편 소급 삭제 금지»).
 *
 * ⚑ 재현(`node tools/probe697.js`)이 먼저다 — 수리 전 12항이 빨갛고(우편으로 가던 5경로),
 *   **광고 상품·상자·룬강화석 교환은 수리 전에도 이미 즉시였다**(보강1 은 이미 지켜지고 있었다).
 *
 * 절:
 *   [A] 부품 — `grantNow()` 가 `sendMail` 과 **같은 보상 표**(MAIL_RW · g·c·r·m)를 읽는다 ·
 *       안내 기본값은 «없음»(149 «한 동작에 안내 한 장»)
 *   [B] 원화 상품 전수(다이아 팩 5 · 이용권 3 · 프리미엄 4) — 즉시 지급 · 새 우편 0
 *   [C] 재화 교환 전수(EXCHANGE 2종) + 던전 입장권 교환 — 같은 틱 지급 · 새 우편 0
 *   [D] 광고 상품 전수(COIN_ADS) — 같은 틱 지급 · 새 우편 0
 *   [E] 이용권 즉시 적용 — 권한·즉시 보석·쿠폰·매일 보석이 전부 구매/정산 그 틱에
 *   [F] 죽은 분기 철거 — 살아 있는 코드에 `PAY_INSTANT`·`ex.mail` 0건 ·
 *       `sendMail({…})` 호출부는 **월별 다이아 한 곳**뿐 (333·399: 자리는 안 비운다)
 *   [G] 우편함 회귀 — 고정 우편 5통 수령 · 옛 상점 통 수령 · 소급 삭제 0 · 레드닷 규약
 *   [H] 안내 — 한 번 사면 토스트 **1장**(1회차에 2장이 났던 자리)
 *   [R] 되돌림 — 옛 «우편 지급» 사본이면 [B]·[C]·[D] 의 판정식이 실제로 빨개진다
 *   [I] 콘솔·페이지 에러 0
 *
 * 실행: node tools/verify697.js      → 마지막 줄 VERIFY697 n/n PASS
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');       /* 살아 있는 코드만(주석 제외) */
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAME = 1080;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const ev = async (page, arg) => {
  try { return await page.evaluate(arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 표본 상태 — 재화를 넉넉히 주고 우편·결제 이력을 비운다(자 사이의 오염을 막는다) */
const reset = `
  S.dia = 1e9; S.gold = 1e9; S.relic = 1e6; S.mileage = 0; S.rstone = 0;
  S.mailx = []; S.mailSeq = 0; S.mail = {}; S.cnt.paid = 0;
  S.pass = { got:(S.pass && S.pass.got) || {} }; syncNoAds();
  S.daily = S.daily || {}; S.daily.adBuy = {};
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

  /* ═════ [A] 부품 ═════ */
  console.log('\n[A] 부품 — grantNow 가 sendMail 과 같은 표를 읽는다');
  const A = await ev(page, () => ({
    has: typeof grantNow === 'function',
    src: String(typeof grantNow === 'function' ? grantNow : ''),
    keys: typeof MAIL_RW === 'undefined' ? null : MAIL_RW.map(t => t.k),
    silent: (() => {                       /* 안내 기본값이 «없음» 인가 — 굴려서 센다 */
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      S.dia = 1000; grantNow({ t: '테스트', c: 1 });
      return document.querySelectorAll('#fxl .fx-toast').length;
    })(),
    loud: (() => {
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      grantNow({ t: '테스트', c: 1, toast: true });
      return document.querySelectorAll('#fxl .fx-toast').length;
    })(),
  }));
  ok(A && A.has, 'A1 `grantNow()` 가 있다');
  ok(A && JSON.stringify(A.keys) === JSON.stringify(['g', 'c', 'r', 'm']),
    'A2 보상 표가 `MAIL_RW` 네 키 그대로(sendMail 과 한 표 — 402 «표 두 벌» 금지)',
    A ? (A.keys || []).join('·') : 'null');
  ok(A && /MAIL_RW/.test(A.src), 'A3 `grantNow` 가 그 표를 **직접 읽는다**(사본 0)', '소스 grep');
  ok(A && /fxReward\(/.test(A.src) && /reShopIfOpen\(/.test(A.src),
    'A4 512 연출 · 547 시트 재렌더를 claimMail 과 같은 순서로 지난다', '소스 grep');
  ok(A && A.silent === 0, 'A5 안내 기본값이 «없음»(149 — 호출부가 제 안내를 갖는다)', A ? A.silent + '장' : 'null');
  ok(A && A.loud === 1, 'A6 `toast:true` 면 한 장 뜬다(안내가 필요한 호출부용)', A ? A.loud + '장' : 'null');

  /* ═════ [B] 원화 상품 전수 ═════ */
  console.log('\n[B] 원화 상품 전수 — 즉시 지급 · 새 우편 0');
  const B = await ev(page, '(() => {' + reset + `
    const out = [];
    const shot = (name, want, run) => {
      S.mailx = []; S.mailSeq = 0; S.mail = {};
      const d0 = S.dia, c0 = S.mileage | 0;
      run();
      out.push({ name, dDia: S.dia - d0, dCp: (S.mileage | 0) - c0,
                 mails: (S.mailx || []).length, want: want.dia, wantCp: want.cp });
    };
    DIA_PACKS.forEach(p => shot('팩 ' + p.id, { dia:p.dia, cp:p.cp | 0 }, () => buyDiaPack(p)));
    PASS_ITEMS.forEach(p => {
      S.pass = { got:S.pass.got || {} }; syncNoAds();
      shot('이용권 ' + p.id, { dia:p.once | 0, cp:p.cp | 0 }, () => buyPass(p.id));
    });
    Object.keys(PASS_TABS).forEach(t => {
      S.pass.prem = {};
      shot('프리미엄 ' + t, { dia:0, cp:0 }, () => buyPassPrem(t));
    });
    return out;
  })()`);
  (B || []).forEach(r => ok(r.dDia === r.want && r.dCp === r.wantCp && r.mails === 0,
    'B:' + r.name + ' 즉시 지급(다이아 +' + r.want + ' · 쿠폰 +' + r.wantCp + ') · 새 우편 0',
    '+' + r.dDia + ' / +' + r.dCp + ' · 우편 ' + r.mails));
  ok((B || []).length === 12, 'B0 원화 상품 12건을 하나도 안 빼고 굴렸다', (B || []).length + '건');

  /* ═════ [C] 재화 교환 ═════ */
  console.log('\n[C] 재화 교환 — 같은 틱 지급 · 새 우편 0');
  await ev(page, () => { openShopTab('coin'); });
  await page.waitForTimeout(600);
  for (const ex of ['relic', 'rstone']) {
    const r = await ev(page, '(() => {' + reset + `
      renderCoinPage(document.getElementById('shopList'));
      exQty = 10;
      const k = '${ex}', v0 = +S[k] || 0, d0 = S.dia;
      const b = document.querySelector('[data-ex="' + k + '"]');
      if(!b) return { err:'버튼 없음' };
      b.click();
      return { d: (+S[k] || 0) - v0, dDia: S.dia - d0, mails: (S.mailx || []).length };
    })()`);
    ok(r && r.d === 10 && r.dDia === -10 && r.mails === 0,
      'C:' + ex + ' 다이아 −10 → ' + ex + ' +10 이 같은 틱 · 새 우편 0',
      r ? (r.err || ('+' + r.d + ' · Δdia ' + r.dDia + ' · 우편 ' + r.mails)) : 'null');
  }
  /* 204 던전 입장권 교환 — 재화가 아니라 던전별 카운터라 처음부터 즉시였다(구조축) */
  const C3 = await ev(page, '(() => {' + reset + `
    const d = DUNGEONS[0], n0 = S.dunTk[d.id] | 0;
    if(typeof dunExBuy === 'function') dunExBuy(d.id);
    else { const b = document.querySelector('[data-dunex]'); if(b) b.click(); }
    return { d: (S.dunTk[d.id] | 0) - n0, mails: (S.mailx || []).length };
  })()`);
  ok(C3 && C3.d > 0 && C3.mails === 0, 'C3 던전 입장권 교환도 즉시 · 새 우편 0(204 구조축)',
    C3 ? '+' + C3.d + ' · 우편 ' + C3.mails : 'null');

  /* ═════ [D] 광고 상품 전수 ═════ */
  console.log('\n[D] 광고 상품 전수 — 같은 틱 지급 · 새 우편 0 (주인 보강1)');
  const D = await ev(page, '(() => {' + reset + `
    renderCoinPage(document.getElementById('shopList'));
    const keys = ['dia','relic','stone','tstone','gold'];
    const out = [];
    COIN_ADS.forEach(a => {
      S.mailx = []; S.mailSeq = 0;
      S.daily.adBuy[a.id] = a.cap;
      const b0 = keys.reduce((o,k) => (o[k] = +S[k] || 0, o), {});
      const pet0 = Object.keys(S.own || {}).length;
      renderCoinPage(document.getElementById('shopList'));
      const btn = document.querySelector('[data-cnad="' + a.id + '"]');
      if(!btn){ out.push({ id:a.id, err:'버튼 없음' }); return; }
      btn.click();
      const grew = keys.some(k => (+S[k] || 0) > b0[k]) || Object.keys(S.own || {}).length > pet0
                   || !!(a.r && a.r.freePet);
      out.push({ id:a.id, grew, mails:(S.mailx || []).length, left: S.daily.adBuy[a.id], cap:a.cap });
    });
    return out;
  })()`);
  (D || []).forEach(r => ok(r.grew === true && r.mails === 0 && r.left === r.cap - 1,
    'D:' + r.id + ' 광고 상품 = 같은 틱 지급 · 새 우편 0 · 오늘 횟수 −1',
    r.err || ('지급 ' + r.grew + ' · 우편 ' + r.mails + ' · 남은 ' + r.left + '/' + r.cap)));

  /* ═════ [E] 이용권 즉시 적용 ═════ */
  console.log('\n[E] 이용권 — 권한·보석·쿠폰·매일 보석이 전부 즉시 (주인 보강3)');
  const E = await ev(page, '(() => {' + reset + `
    const p = PASS_ITEMS.find(x => x.id === 'noads');
    const d0 = S.dia, c0 = S.mileage | 0;
    buyPass('noads');
    const buy = { dia:S.dia - d0, cp:(S.mileage | 0) - c0, own:passOwned('noads'),
                  mails:(S.mailx || []).length, wantDia:p.once | 0, wantCp:p.cp | 0 };
    /* 매일 보석 — 3일치가 밀린 상태를 만들고 정산한다(오프라인 정산과 같은 경로) */
    S.pass.dailyAt = { noads: Date.now() - 3 * PASS_DAY_MS - 1000 };
    const d1 = S.dia, got = passDailyTick();
    return { buy, daily:{ got, dDia:S.dia - d1, mails:(S.mailx || []).length, want:3 * p.daily } };
  })()`);
  ok(E && E.buy.own === true && E.buy.dia === E.buy.wantDia && E.buy.cp === E.buy.wantCp && E.buy.mails === 0,
    'E1 구매 그 틱에 권한 ON · 즉시 보석 +' + (E ? E.buy.wantDia : '?') + ' · 쿠폰 +' + (E ? E.buy.wantCp : '?') + ' · 우편 0',
    E ? 'own ' + E.buy.own + ' · +' + E.buy.dia + ' / +' + E.buy.cp + ' · 우편 ' + E.buy.mails : 'null');
  ok(E && E.daily.got === E.daily.want && E.daily.dDia === E.daily.want && E.daily.mails === 0,
    'E2 매일 보석 3일치가 **한 번에 · 즉시** 들어온다 · 우편 0',
    E ? '정산 ' + E.daily.got + ' · 지급 ' + E.daily.dDia + '(기대 ' + E.daily.want + ') · 우편 ' + E.daily.mails : 'null');

  /* ═════ [F] 죽은 분기 철거 ═════ */
  console.log('\n[F] 죽은 분기 철거 — 자리는 안 비운다(333·399)');
  const f1 = (CODE.match(/PAY_INSTANT/g) || []).length;
  ok(f1 === 0, 'F1 살아 있는 코드에 `PAY_INSTANT` 0건(축이 `PAY_MAIL` 로 뒤집혔다)', f1 + '건');
  const f2 = await ev(page, () => (typeof PAY_MAIL === 'undefined' ? null : PAY_MAIL.slice()));
  ok(Array.isArray(f2) && f2.length === 0,
    'F2 그 자리에 `PAY_MAIL`(아직 우편으로 가는 결제 상품)이 있고 **비어 있다**',
    f2 === null ? '선언 없음' : (f2.join(' · ') || '0건'));
  const f3 = (CODE.match(/\bex\.mail\b/g) || []).length + (CODE.match(/mail\s*:\s*[01]\s*[,}]/g) || []).length;
  ok(f3 === 0, 'F3 `EXCHANGE` 의 죽은 `mail` 칸과 그 분기가 선언째 사라졌다', f3 + '건');
  const f4 = (CODE.match(/sendMail\(\{/g) || []).length;
  ok(f4 === 1, 'F4 살아 있는 `sendMail({…})` 호출부는 **월별 다이아 한 곳**뿐(180 — 구매가 아니다)', f4 + '곳');
  const f5 = await ev(page, () => typeof sendMail === 'function' && typeof trimMailx === 'function'
                                  && typeof allMails === 'function');
  ok(f5 === true, 'F5 우편함 **부품 자체는 안 죽였다** — 고정 우편·월별이 그 위에서 돈다', String(f5));

  /* ═════ [G] 우편함 회귀 ═════ */
  console.log('\n[G] 우편함 회귀 — 옛 통은 그대로 수령된다(주인 «소급 삭제 금지»)');
  const G = await ev(page, '(() => {' + reset + `
    /* 옛 세이브 재현 — 153 스키마의 상점 우편 두 통이 미수령으로 남아 있다 */
    const a = sendMail({ t:'🛒 다이아 10,000개', c:10000, m:1, src:'shop', b:'옛 상점 지급분' });
    const b = sendMail({ t:'📦 유물조각 교환', r:50, src:'shop', b:'옛 교환 지급분' });
    const kept = (S.mailx || []).length;
    const d0 = S.dia, r0 = S.relic, c0 = S.mileage | 0;
    claimMail(a.id); claimMail(b.id);
    const fixed = MAILS.length, list = mailList().length;
    return { kept, dDia:S.dia - d0, dRel:S.relic - r0, dCp:(S.mileage | 0) - c0,
             st:[S.mail[a.id], S.mail[b.id]], fixed, list };
  })()`);
  ok(G && G.kept === 2, 'G1 옛 상점 통이 그대로 남아 있다(소급 삭제 0)', G ? G.kept + '통' : 'null');
  ok(G && G.dDia === 10000 && G.dRel === 50 && G.dCp === 1 && G.st[0] === 1 && G.st[1] === 1,
    'G2 그 통들이 표대로 수령된다', G ? '다이아 +' + G.dDia + ' · 유물 +' + G.dRel + ' · 쿠폰 +' + G.dCp : 'null');
  ok(G && G.fixed === 5 && G.list >= 5, 'G3 고정 우편 5통이 목록에 그대로 있다(92·69)',
    G ? '고정 ' + G.fixed + ' · 목록 ' + G.list : 'null');
  const G4 = await ev(page, '(() => {' + reset + `
    const dot = () => !!document.querySelector('#mnw .mn-b.alert, #menub.alert, #sideL .alert');
    sideAlert('mail', false);
    buyDiaPack(DIA_PACKS[0]);
    const afterBuy = dot();
    sendMail({ t:'📅 월별 다이아', c:100000, src:'monthly', b:'x' });
    return { afterBuy, afterMail: dot() };
  })()`);
  ok(G4 && G4.afterBuy === false && G4.afterMail === true,
    'G4 레드닷 — 구매는 안 켜고(갈 우편이 없다) 살아 있는 우편은 켠다',
    G4 ? '구매 ' + G4.afterBuy + ' · 우편 ' + G4.afterMail : 'null');

  /* ═════ [H] 안내 1장 ═════ */
  console.log('\n[H] 안내 — 한 번 사면 토스트 1장(149)');
  /* 206 토스트 큐가 마를 때까지 비운다(589 [D] 가 같은 함정을 적어 뒀다) */
  for (let i = 0; i < 12; i++) {
    await ev(page, () => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); });
    await page.waitForTimeout(180);
    const left = await ev(page, () => document.querySelectorAll('#fxl .fx-toast').length);
    if (!left) break;
  }
  await ev(page, '(() => {' + reset + '})()');
  await ev(page, () => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); buyDiaPack(DIA_PACKS[4]); });
  await page.waitForTimeout(200);
  const H = await ev(page, () => {
    const ts = [...document.querySelectorAll('#fxl .fx-toast')];
    const r = ts.length ? ts[ts.length - 1].getBoundingClientRect() : null;
    return { n: ts.length, txt: ts.map(t => t.textContent).join(' | '),
             x1: r ? +r.left.toFixed(2) : null, x2: r ? +r.right.toFixed(2) : null };
  });
  ok(H && H.n === 1, 'H1 구매 직후 토스트가 딱 1장(1회차엔 2장이었다 — 지급 안내 + 결제 안내)',
    H ? H.n + '장 — ' + H.txt : 'null');
  ok(H && /즉시 지급/.test(H.txt) && !/우편함/.test(H.txt),
    'H2 그 한 장이 «즉시 지급» 을 말하고 «우편함» 을 말하지 않는다', H ? H.txt : 'null');
  ok(H && H.x1 >= 0 && H.x2 <= FRAME, 'H3 토스트가 프레임(1080) 안', H ? H.x1 + '..' + H.x2 : 'null');

  /* ═════ [R] 되돌림 ═════ */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  const R1 = await ev(page, '(() => {' + reset + `
    /* 153 시절 사본 — 지급을 우편 한 통으로 보낸다(지갑 Δ0) */
    const p = DIA_PACKS[0], d0 = S.dia;
    sendMail({ t:'🛒 ' + diaPackName(p), c:p.dia, m:p.cp || 0, b:'되돌림 사본' });
    return { dDia: S.dia - d0, mails: (S.mailx || []).length, want: p.dia };
  })()`);
  ok(R1 && R1.dDia === 0 && R1.mails === 1,
    'R1 옛 «우편 지급» 사본은 지갑 Δ0 · 우편 1통 ⇒ [B] 의 판정식이 그 자리를 빨갛게 본다',
    R1 ? 'Δdia ' + R1.dDia + '(기대 +' + R1.want + ') · 우편 ' + R1.mails : 'null');
  const R2 = await ev(page, '(() => {' + reset + `
    /* 교환의 옛 두 갈래 사본 — 유물조각만 우편으로 보내던 분기 */
    const n = 10, d0 = S.dia, r0 = S.relic;
    S.dia -= n;
    sendMail({ t:'📦 유물조각 교환', r:n, b:'되돌림 사본' });
    return { dRel: S.relic - r0, dDia: S.dia - d0, mails: (S.mailx || []).length };
  })()`);
  ok(R2 && R2.dRel === 0 && R2.mails === 1,
    'R2 옛 «유물조각만 우편» 사본은 유물 Δ0 ⇒ [C] 가 빨갛게 본다',
    R2 ? '유물 Δ' + R2.dRel + ' · 우편 ' + R2.mails : 'null');
  /* ⚑ 음성항 — 자가 «우편 0» 만 세면 «아무것도 안 준다» 도 초록이다. 지급을 지운 사본은 빨갛다. */
  const R3 = await ev(page, '(() => {' + reset + `
    const d0 = S.dia;
    payMock({ k:'dia:x', n:'테스트', won:1000, deliver:() => null });   /* 결제만 · 지급 0 */
    return { dDia: S.dia - d0, mails: (S.mailx || []).length, paid: S.cnt.paid | 0 };
  })()`);
  ok(R3 && R3.dDia === 0 && R3.mails === 0 && R3.paid === 1,
    'R3 음성항 — «우편도 0 · 지급도 0» 인 사본은 [B] 의 «표대로 늘었다» 에서 빨갛다',
    R3 ? 'Δdia ' + R3.dDia + ' · 우편 ' + R3.mails + ' · 결제 ' + R3.paid : 'null');

  ok(errs.length === 0, 'I1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY697 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
