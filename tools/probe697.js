#!/usr/bin/env node
/* 작업 697 재현 프로브 — «상점에서 구매한 것은 전부 즉시 지급(우편함 경유 폐지)»
 *
 *   node tools/probe697.js
 *
 * 338·341·350·363·372·429·654·683·726 규칙 — **처방을 따르기 전에 등재문의 주장이
 * 참인지 제품에게 직접 묻는다.** 주인 원문: «다이아를 다른재화로 바꾸는거는 즉각으로
 * 바꾸는거로 해줘 우편으로 오지말고» · «광고 상품들도 우편말고 걍 바로 오는거로 해»
 * · 보강 «걍 상점에서 구매한거 걍 다 즉시 지급으로 하자 우편함 말고» · «이용권도 즉시적용으로».
 *
 * 등재문은 «우편으로 간다» 를 통째로 주장하지만 **경로마다 답이 다를 수 있다** — 그래서
 * 이 자는 상점 지급 경로를 하나씩 굴려 **한 틱 안에서 두 수를 같이** 찍는다:
 *   ⓐ 대상 재화 잔액 Δ (즉시 지급이면 > 0)
 *   ⓑ `S.mailx` 통 수 Δ (우편 경유면 +1)
 * «즉시» 의 정의는 이 둘의 조합이다 — ⓐ>0 · ⓑ=0 이어야 즉시다.
 *
 * 절:
 *   [1] 다이아 팩(44·589 IAP 목업)      — 수리 전 우편(ⓑ=1·ⓐ=0)이 정상 = 등재문이 참
 *   [2] 마일리지 교환(44)               — 같은 축
 *   [3] 유물조각 교환(490 EXCHANGE) — 같은 축 · 실제 DOM 클릭
 *   [4] 이용권 구매 보상(151 grantPass)  — cp·once 재화분
 *   [5] 이용권 매일 보석(151 passDailyTick)
 *   [6] 프리미엄 패스(589 buyPassPrem)   — 보상 0통짜리 «구매 확인» 우편
 *   [7] 광고 상품(365 COIN_ADS)          — **구조축**(수리 전에도 즉시여야 한다)
 *   [8] 상자 무료 10연(SHOP_BOXES)        — **구조축**(소환은 12 결과 팝업 = 우편 0)
 *   [9] 룬강화석 교환(EXCHANGE 다른 줄)   — **구조축**(원래도 즉시였다)
 *   [10] 기존 우편 수령 회귀              — **구조축**(고정 우편 MAILS 는 계속 수령된다)
 *   [11] 콘솔 에러 0                      — **구조축**
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다. [7]~[11] 은 구조축(양쪽 같은 답),
 *   [1]~[6] 은 «등재문이 참인가» 를 묻는 자리라 **수리 전에 빨간 것이 정상**이다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 경로를 굴리고 «잔액 Δ · 우편 Δ» 를 같이 받는다. `run` 은 페이지 안에서 도는 문자열 본문이다.
   재화 키는 S 의 실제 필드명(dia·gold·relic·mileage·rstone …)을 그대로 쓴다. */
const SHOT = ({ keys, run }) => {
  const bal = () => keys.reduce((o, k) => (o[k] = +(S[k] || 0), o), {});
  const mx = () => (Array.isArray(S.mailx) ? S.mailx.length : 0);
  const b0 = bal(), m0 = mx();
  let err = '';
  try { (new Function(run))(); } catch (e) { err = e.message.split('\n')[0]; }
  const b1 = bal(), m1 = mx();
  const d = {};
  keys.forEach(k => { d[k] = b1[k] - b0[k]; });
  return { d, mail: m1 - m0, err, mailx: (S.mailx || []).slice(-1).map(x => x.t) };
};

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof save === 'function');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

/* «즉시 지급» 판정 한 벌 — 세 항을 같은 이름으로 찍는다(수리 전 [a]·[b] 가 빨갛다) */
function judge(tag, r, key) {
  if (r === null) { ok(false, tag + ' 측정 실패(evaluate 예외)'); return; }
  if (r.err) info(tag + ' 실행 예외', r.err);
  ok(r.d[key] > 0, tag + ' [a] 대상 재화가 같은 틱에 늘었다', key + ' Δ' + r.d[key]);
  ok(r.mail === 0, tag + ' [b] 새 우편 0통', '우편 Δ' + r.mail + (r.mail > 0 ? ' · «' + r.mailx.join('') + '»' : ''));
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser);

  blk('[1] 다이아 팩 — 44·589 IAP 목업(buyDiaPack)');
  let r = await ev(page, SHOT, { keys: ['dia', 'mileage'], run: 'buyDiaPack(DIA_PACKS[3]);' });
  judge('[1]', r, 'dia');
  if (r) ok(r.d.mileage > 0, '[1] [c] 쿠폰(마일리지)도 같은 틱에 늘었다', 'mileage Δ' + r.d.mileage);

  blk('[2] 마일리지 교환 — 44 mileageExchange()');
  r = await ev(page, SHOT, { keys: ['dia', 'mileage'], run: 'S.mileage = MILE_NEED; mileageExchange();' });
  judge('[2]', r, 'dia');

  blk('[3] 유물조각 교환 — 490 EXCHANGE · 실제 DOM 클릭(수리 전 `mail:1` 갈래)');
  await ev(page, () => { S.dia = 1e9; save(); openShopPage(null, 'coin'); uiDirty = true; });
  await page.waitForTimeout(400);
  r = await ev(page, SHOT, { keys: ['relic', 'dia'], run: 'exQty = 1; var b = document.querySelector(\'[data-ex="relic"]\'); if(!b) throw new Error("교환 버튼 없음"); b.click();' });
  judge('[3]', r, 'relic');

  blk('[4] 이용권 구매 보상 — 151 grantPass(cp·once)');
  r = await ev(page, SHOT, { keys: ['dia', 'mileage'], run: 'S.pass = { got:(S.pass && S.pass.got) || {} }; syncNoAds && syncNoAds(); grantPass("noads");' });
  judge('[4]', r, 'dia');

  blk('[5] 이용권 매일 보석 — 151 passDailyTick()');
  r = await ev(page, SHOT, {
    keys: ['dia'],
    run: 'S.pass = S.pass || {}; S.pass.noAds = true; S.pass.dailyAt = { noads: Date.now() - 3 * PASS_DAY_MS - 1000 }; passDailyTick();'
  });
  judge('[5]', r, 'dia');

  blk('[6] 프리미엄 패스 — 589 buyPassPrem(«구매 확인» 우편)');
  r = await ev(page, SHOT, { keys: ['dia'], run: 'S.pass = S.pass || {}; S.pass.got = S.pass.got || {}; S.pass.prem = {}; buyPassPrem("stage");' });
  if (r === null) ok(false, '[6] 측정 실패');
  else {
    if (r.err) info('[6] 실행 예외', r.err);
    ok(r.mail === 0, '[6] [b] 새 우편 0통 — 권한 상품도 우편을 안 쓴다', '우편 Δ' + r.mail + (r.mail > 0 ? ' · «' + r.mailx.join('') + '»' : ''));
    const on = await ev(page, () => !!(S.pass && S.pass.prem && S.pass.prem.stage));
    ok(on === true, '[6] [a] 권한은 즉시 반영', 'prem.stage=' + on);
  }

  blk('[7] 광고 상품 — 365 COIN_ADS (구조축: 수리 전에도 즉시)');
  r = await ev(page, SHOT, {
    keys: ['dia', 'relic', 'stone', 'tstone'],
    run: 'openShopPage(null, "coin");'
       + ' var a = COIN_ADS.find(function(x){ return x.r && x.r.dia; }) || COIN_ADS[0];'
       + ' S.daily = S.daily || {}; S.daily.adBuy = S.daily.adBuy || {}; S.daily.adBuy[a.id] = a.cap;'
       + ' var b = document.querySelector(\'[data-cnad="\' + a.id + \'"]\'); if(!b) throw new Error("광고 상품 버튼 없음"); b.click();'
  });
  if (r === null) ok(false, '[7] 측정 실패');
  else {
    const sum = Object.values(r.d).reduce((a, b) => a + b, 0);
    ok(sum > 0, '[7] [a] 대상 재화가 같은 틱에 늘었다', 'Σ Δ' + sum);
    ok(r.mail === 0, '[7] [b] 새 우편 0통', '우편 Δ' + r.mail);
  }

  blk('[8] 상자 무료 10연 — SHOP_BOXES (구조축: 결과 팝업 · 우편 0)');
  r = await ev(page, SHOT, {
    keys: ['dia'],
    run: 'S.daily = S.daily || {}; S.daily.freeSum = S.daily.freeSum || {}; S.daily.freeSum.weapon = SHOP_FREE;'
       + ' if(typeof doSummonFree === "function") doSummonFree("weapon", 10, 1); else throw new Error("doSummonFree 없음");'
  });
  if (r === null) ok(false, '[8] 측정 실패');
  else ok(r.mail === 0, '[8] 소환 결과는 우편을 안 쓴다', '우편 Δ' + r.mail);

  blk('[9] 룬강화석 교환 — EXCHANGE (구조축: 수리 전에도 즉시였다)');
  await ev(page, () => { S.dia = 1e9; openShopPage(null, 'coin'); uiDirty = true; });
  await page.waitForTimeout(300);
  r = await ev(page, SHOT, { keys: ['rstone'], run: 'exQty = 1; var b = document.querySelector(\'[data-ex="rstone"]\'); if(!b) throw new Error("교환 버튼 없음"); b.click();' });
  if (r === null) ok(false, '[9] 측정 실패');
  else {
    ok(r.d.rstone > 0, '[9] [a] 룬강화석 즉시 지급', 'rstone Δ' + r.d.rstone);
    ok(r.mail === 0, '[9] [b] 새 우편 0통', '우편 Δ' + r.mail);
  }

  blk('[10] 기존 우편 수령 회귀 — 고정 우편(MAILS)은 그대로 수령된다 (구조축)');
  const mr = await ev(page, () => {
    const id = MAILS[0].id;
    S.mail = S.mail || {}; delete S.mail[id];
    const before = { g: +S.gold || 0, c: +S.dia || 0, r: +S.relic || 0, m: +S.mileage || 0 };
    let err = '';
    try { claimMail(id); } catch (e) { err = e.message.split('\n')[0]; }
    const rw = MAILS[0];
    const want = (rw.g || 0) + (rw.c || 0) + (rw.r || 0) + (rw.m || 0);
    const got = (+S.gold - before.g) + (+S.dia - before.c) + (+S.relic - before.r) + (+S.mileage - before.m);
    return { state: S.mail[id], want, got, err };
  });
  if (mr === null) ok(false, '[10] 측정 실패');
  else {
    if (mr.err) info('[10] 실행 예외', mr.err);
    ok(mr.state === 1, '[10] [a] 수령 상태로 바뀐다', 'S.mail = ' + mr.state);
    ok(mr.got > 0 && mr.want > 0, '[10] [b] 보상이 실제로 들어온다', 'want Σ' + mr.want + ' · got Σ' + mr.got);
  }

  blk('[11] 콘솔 에러');
  ok(errs.length === 0, '콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  console.log('\nPROBE697 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  await ctx.close(); await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
