#!/usr/bin/env node
/* 405 검증 — «부족·실패 안내» 의 60 쥬시가 뜨는 경로와 무관하게 서는가
 *
 *   node tools/verify405.js
 *
 * 발단은 `tools/fnchk125.js` 3건 실패(12/15)였고, `tools/probe405.js` 재현이 셋을 둘로 갈랐다:
 *   · ①「교환하면 유물조각이 는다」 와 ②「부족 **팝업** 제목」 은 **게이트 부패**다 —
 *     제품은 153(«상점 지급품은 우편으로»)·206(«안내는 전부 토스트»)이라는 **나중 주인 지시**를
 *     따르고 있고, 자가 그 이전 세계의 자리를 계속 보고 있었다.
 *   · ③「부족 알약이 빨갛게 튄다」 만 **진짜 결손**이었다 — 149·206 이 안내를 팝업에서 토스트로
 *     내리면서 `jzModalMood()`(모달이 열릴 때만 돈다)를 지나지 않게 됐다. 부품은 멀쩡하고
 *     **경로가 한 칸 짧았다**(318 계열). probe405 §4 가 «같은 부품을 팝업으로 부르면 지금도 튄다» 로 못박는다.
 *
 * 이 자가 보는 것:
 *   [A] 쥬시   — 부족 안내가 **토스트로 뜰 때도** 해당 재화 알약이 튄다 · 팝업 경로 무회귀 ·
 *                재화 판정이 **아이콘(data-cur-ic)** 축으로 선다(문구에 재화 «이름» 이 없는 자리가 다수다) ·
 *                큐를 탄 안내도 튄다(그래서 `notify()` 가 아니라 `fxToast()` 에 걸었다) · 음성항 셋.
 *   [B] 자리   — 안내는 팝업이 아니다(206 되돌림 감시) · 문구가 깨끗하다(태그가 글자로 안 샌다).
 *   [C] 교환   — 153 계약: 다이아는 즉시 나가고 유물조각은 **우편으로** 온다 · 수령하면 실제로 는다 ·
 *                부족이면 한 푼도 안 나간다.
 *   [D] 58     — 토스트 자신의 등장·퇴장 애니메이션은 한 프레임도 안 바뀌었다(`.fx-toast` 의
 *                `animation` 은 58 소유다. `jz-bad` 를 토스트에 얹지 **않은** 이유가 이 항이다).
 *   §R 되돌림 시험 — 무르게 푼 자가 아님을 못 박는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof notify === 'function');
  await page.waitForTimeout(500);

  const ev = async (fn, arg, tag) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { ok(false, tag + ' — evaluate 예외', String(e).slice(0, 140)); return null; }
  };

  /* 공용 — 레이어를 비우고 한 건 띄운 뒤 «어느 알약이 튀었나» 를 돌려준다.
     플래시는 «한 시점» 이 아니라 구간이라(작업 145) 뜰 때까지 기다렸다가 판정한다. */
  const FLASH = `async (txt) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    await sleep(60);
    notify(txt);
    let got = '';
    for (let i = 0; i < 25 && !got; i++) {
      if (document.querySelector('.cDia.jz-bad, #fxl .jz-badp')) got = document.querySelector('.cDia.jz-bad') ? 'cDia' : 'badp';
      if (!got && document.querySelector('.cGold.jz-bad')) got = 'cGold';
      if (!got) await sleep(20);
    }
    const t = document.querySelector('#fxl .fx-toast');
    return { got, toast: t ? t.textContent.trim() : null,
             raw: t ? /<(img|b)\\b/i.test(t.textContent) : false,
             icons: t ? [...t.querySelectorAll('img.cic')].map(i => i.dataset.curIc).join(',') : '' };
  }`;

  /* ==================================================================
     [A] 쥬시 — 부족 안내는 뜨는 경로와 무관하게 알약을 튀긴다
     ================================================================== */
  blk('[A] 60 쥬시 — 부족 알약 튐');

  /* A1 — 실제 진입점. 13 재화 탭 유물조각 교환을 다이아 0 으로 누른다(fnchk125 ③ 의 그 자리) */
  const a1 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(300);
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    S.dia = 0;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    if (!btn) return { err: '교환 버튼 없음' };
    btn.click();
    let bad = false;
    for (let i = 0; i < 25 && !bad; i++) {
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    const t = document.querySelector('#fxl .fx-toast');
    return { bad, modalOn: $('modal').classList.contains('on'),
             toast: t ? t.textContent.trim() : null,
             icons: t ? [...t.querySelectorAll('img.cic')].map(i => i.dataset.curIc).join(',') : '' };
  }, null, '[A1]');
  if (a1 && !a1.err) {
    ok(a1.bad === true, 'A1 13 교환 [부족] — 다이아 알약이 빨갛게 튄다(실제 클릭)', String(a1.bad));
  } else ok(false, 'A1 13 교환 [부족]', (a1 && a1.err) || 'null');

  /* A2 — 팝업 경로 무회귀. 부품(jzModalMood)은 원래 하던 일을 그대로 한다 */
  const a2 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(500);
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    popup('다이아 부족', '<p>회귀 확인</p>');
    let bad = false;
    for (let i = 0; i < 25 && !bad; i++) {
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    closeModal();
    return bad;
  }, null, '[A2]');
  ok(a2 === true, 'A2 팝업 경로도 그대로 튄다(jzModalMood 무회귀)', String(a2));

  /* A3~A6 — 문구 다섯 꼴. 소스에 실제로 적혀 있는 모양 그대로다.
     ⚑ 첫 꼴이 이 작업의 발단이다 — 재화 «이름» 이 글자로 한 번도 안 나온다(아이콘뿐). */
  const CASES = [
    ['A3 아이콘만 · 다이아 「💎 <b>n</b> 더 필요합니다」(13 교환·204 입장권·35 패스)', "'<b>1,000</b> 더 필요합니다'", 'dia', 'cDia'],
    ['A4 아이콘+이름 · 다이아 「💎 <b>다이아</b>가 부족합니다」(29 단련 초기화)', "'<b>다이아</b>가 부족합니다'", 'dia', 'cDia'],
    ['A5 HUD 알약이 없는 재화 — 유물조각은 아무 알약도 안 튀긴다', "'<b>50</b> 더 필요합니다'", 'relic', ''],
    ['A6 재화가 아예 없는 실패 안내 — 안 튄다', "'강화 가능한 <b>펫</b>이 없습니다'", '', '']
  ];
  /* `page.evaluate` 는 «식 문자열» 도 받는다 — 문구를 제품 함수(`curIc`)로 만들어야 해서
     클로저 대신 식을 조립한다. 손으로 적은 아이콘 마크업을 쓰면 그 순간 자가 제품과 따로 논다. */
  const flash = (expr) => page.evaluate('(' + FLASH + ')(' + expr + ')').catch((e) => ({ err: String(e) }));
  for (const [name, tail, cur, want] of CASES) {
    const got = await flash((cur ? "curIc('" + cur + "') + ' ' + " : '') + tail);
    ok(got && !got.err && (got.got === want || (want === 'cDia' && got.got === 'badp')),
       name, got ? ('기대 ' + (want || '없음') + ' · 실제 ' + (got.got || got.err || '없음') + ' · 아이콘 [' + (got.icons || '') + ']') : 'null');
  }

  /* A7 — 음성항: «부족» 이 아닌 안내는 안 튄다(우편 수령 요약에도 재화 아이콘이 들어 있다) */
  const a7 = await flash("'우편 3통 수령 — ' + curIc('gold') + ' 1.2M · ' + curIc('dia') + ' 400'");
  ok(a7 && a7.got === '', 'A7 음성항 — 부족이 아닌 안내(우편 수령)는 알약을 안 튀긴다',
     a7 ? ('실제 ' + (a7.got || '없음') + ' · 아이콘 [' + a7.icons + ']') : 'null');

  /* A8 — 큐를 탄 안내도 튄다. `fxToast` 는 4장부터 조용히 드롭하고 206 이 그것을 큐로 바꿨다 —
     `notify()` 에 걸었으면 큐를 탄 안내만 조용히 안 튀는 «반쯤 고침» 이 된다. */
  const a8 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(500);
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    for (let i = 0; i < 4; i++) notify('채움 ' + i);           /* 스택을 가득 채운다 */
    const stack = document.querySelectorAll('#fxl .fx-toast').length;
    notify(curIc('dia') + ' <b>1,000</b> 더 필요합니다');       /* 이건 큐로 간다 */
    const queued = document.querySelectorAll('#fxl .fx-toast').length === stack;
    let bad = false;
    for (let i = 0; i < 140 && !bad; i++) {                     /* 앞 4장이 사라지고 큐가 풀릴 때까지 */
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    return { stack, queued, bad };
  }, null, '[A8]');
  ok(a8 && a8.stack === 4 && a8.queued === true && a8.bad === true,
     'A8 큐를 탄 부족 안내도 튄다(4장 드롭 → notePump 경로)',
     a8 ? ('스택 ' + a8.stack + ' · 큐로 감 ' + a8.queued + ' · 튐 ' + a8.bad) : 'null');

  /* ==================================================================
     [B] 자리 — 안내는 팝업이 아니다 · 문구가 깨끗하다
     ================================================================== */
  blk('[B] 안내의 자리 — 206 되돌림 감시');
  ok(a1 && a1.modalOn === false,
     'B1 부족 안내로 «팝업» 이 열리지 않는다(149·206 되돌림이면 여기서 빨개진다)',
     a1 ? 'modal.on=' + a1.modalOn : 'null');
  ok(a1 && /더 필요합니다/.test(a1.toast || '') && !/[<>]/.test(a1.toast || ''),
     'B2 토스트 문구가 깨끗한 한글이다(태그가 글자로 새지 않는다)', a1 ? JSON.stringify(a1.toast) : 'null');
  ok(a1 && /dia/.test(a1.icons || ''),
     'B3 문구의 재화는 이모지가 아니라 `curIc()` 이미지다(125 규약)', a1 ? '[' + a1.icons + ']' : 'null');

  /* ==================================================================
     [C] 153 계약 — 다이아는 즉시 · 유물조각은 우편
     ================================================================== */
  blk('[C] 13 유물조각 교환 — 153 «상점 지급품은 우편으로»');
  const c = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(200);
    /* ⓐ 부족이면 한 푼도 안 나간다
       ⚠ 490 이후 `data-ex` 는 «가격» 이 아니라 **재화 키**다(1:1 이라 가격 = 고른 수량).
       ⚠ 715 이관 — 수량 탭(`.cn-qty`)이 슬라이더로 바뀌었다. «못 산다» 는 상태를 만드는 길도
         «×100 을 켠다» 가 아니라 **한 개 값보다 잔액이 적다**(0 다이아)로 바뀐다 — 그 상태에서는
         팝업이 아예 안 열리므로 그것까지 같이 잰다(자리를 비우지 않고 방향만 뒤집었다 — 333). */
    S.dia = 0; S.relic = 0; S.mailx = [];
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    let btn = document.querySelector('#shopList .bt.buy[data-ex="relic"]');
    if (!btn) return { err: '교환 버튼 없음' };
    const price = 100, row = { rel: price };     /* 490 — 1:1 (100개를 고른다) */
    btn.click();
    const poor = { dia: S.dia, mail: (S.mailx || []).length,
                   open: document.getElementById('modal').classList.contains('on') };
    /* ⓑ 살 수 있으면 그 자리에서 지급된다(697) */
    S.dia = price; S.mailx = [];
    renderShopPage();
    btn = document.querySelector('#shopList .bt.buy[data-ex="relic"]');
    btn.click(); exSet(price); exRun();
    const m = (S.mailx || [])[0];
    const mid = { dia: S.dia, relic: S.relic, mailN: (S.mailx || []).length, mailT: m && m.t, mailR: m && m.r };
    /* ⓒ 수령 단계가 **없다** — 교환이 만든 통이 우편함에 0건이다.
       ⚠ «받아 보고 Δrelic 0» 으로 재면 안 된다 — 우편함에는 이 교환과 무관한 통(부팅 세이브·앞
         절이 넣은 것)이 있어서 그 수령분이 섞여 들어온다(실측 +1000). 물음은 «내 교환이 통을
         만들었는가» 이므로 **제목으로 골라** 센다(185-④ 자리 옮김 규칙). */
    const mine = (S.mailx || []).filter(x => /교환|유물조각/.test((x && x.t) || '')).length;
    return { price, want: row && row.rel, poor, mid, mine };
  }, null, '[C]');
  if (c && !c.err) {
    ok(c.poor.dia === 0 && c.poor.mail === 0 && c.poor.open === false,
       'C1 한 개도 못 사면 다이아가 한 푼도 안 나가고 **팝업조차 안 열린다**(715)',
       '다이아 ' + c.poor.dia + ' · 우편 ' + c.poor.mail + '통 · 팝업 ' + c.poor.open);
    ok(c.mid.dia === 0, 'C2 살 수 있으면 다이아는 **즉시** 나간다', String(c.price) + ' → ' + c.mid.dia);
    /* ⚠ 697 이관(2026-09-02, 작업 715 가 같은 흐름을 지나며 마저 옮겼다) — C3·C4 는 **153 의 우편
       단계**를 단언하고 있었고 그 단계는 697(주인 «교환은 즉각으로 · 우편으로 오지말고»)이 없앴다.
       **수리 전 트리에서도 같은 2건이 빨갛다**(대조 실행으로 확인 — 338·344 규약). 자리를 비우지
       않고 방향만 뒤집는다(333): «그 순간 안 는다» → «그 순간 는다» · «우편 한 통» → «우편 0». */
    ok(c.mid.relic === c.want, 'C3 그 순간 유물조각이 **그 자리에서** 는다(697 — 153 의 우편 단계 폐지)',
       'Δrelic ' + c.mid.relic + ' (기대 ' + c.want + ')');
    ok(c.mid.mailN === 0, 'C4 새 우편은 한 통도 안 온다(697)', c.mid.mailN + '통');
    ok(c.mine === 0, 'C5 수령 단계가 없다 — 우편함에 «교환» 통이 0건이다(697)', c.mine + '통');
    ok(c.price === 100 && c.want === 100,
       'C6 490 — 교환비가 **1:1** 이다(고른 수량 100 → 다이아 100)', c.price + ' 다이아 → ' + c.want + '개');
  } else ok(false, '[C] 교환 흐름', (c && c.err) || 'null');

  /* ==================================================================
     [D] 58 무회귀 — 토스트 자신의 애니메이션은 안 건드렸다
     ================================================================== */
  blk('[D] 58 — 토스트 등장·퇴장 애니메이션 무회귀');
  const d = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    notify(curIc('dia') + ' <b>1,000</b> 더 필요합니다');
    await sleep(60);
    const t = document.querySelector('#fxl .fx-toast');
    if (!t) return { err: '토스트 없음' };
    const inN = getComputedStyle(t).animationName;
    const cls = t.className;
    t.classList.add('out');
    const outN = getComputedStyle(t).animationName;
    return { inN, outN, cls };
  }, null, '[D]');
  if (d && !d.err) {
    ok(d.inN === 'fxToastIn', 'D1 등장 애니메이션이 그대로 `fxToastIn` 이다', String(d.inN));
    ok(d.outN === 'fxToastOut', 'D2 `.out` 퇴장이 그대로 `fxToastOut` 이다', String(d.outN));
    ok(!/jz-bad/.test(d.cls || ''),
       'D3 토스트에 `jz-bad` 를 얹지 않았다(얹으면 `animation` 이 교체돼 등장·퇴장이 사라진다)', String(d.cls));
  } else ok(false, '[D] 58 무회귀', (d && d.err) || 'null');

  /* 선언 층 — 제품이 실제로 «아이콘 축» 으로 재화를 고르는가(그린 것 = 선언, 402 H3 처방) */
  ok(/function jzToastMood/.test(SRC) && /jzToastMood\(el\)/.test(SRC),
     'D4 `jzToastMood` 가 선언돼 있고 `fxToast` 가 그것을 부른다(큐 경로까지 덮는 자리)',
     '선언 ' + /function jzToastMood/.test(SRC) + ' · 호출 ' + /jzToastMood\(el\)/.test(SRC));

  /* ==================================================================
     §R 되돌림 시험 — 무르게 푼 자가 아님을 못 박는다
     ================================================================== */
  blk('§R 되돌림 시험');

  /* R1 — 수리를 통째로 되돌린다(호출을 no-op 으로 덮는다). A1 표본이 실제로 빨개져야 한다.
     ⚠ 402 §R 의 함정 — `const` 로 선언된 함수는 덮어써도 아무것도 안 바뀌어 시험이 «항상 초록» 이 된다.
       `jzToastMood` 는 **함수 선언**이라 전역 객체 속성으로 덮인다. 그 사실 자체를 R1b 가 잰다. */
  const r1 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const orig = window.jzToastMood;
    window.jzToastMood = function () { /* 405 이전 세계 */ };
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    await sleep(60);
    notify(curIc('dia') + ' <b>1,000</b> 더 필요합니다');
    let bad = false;
    for (let i = 0; i < 25 && !bad; i++) {
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    const patched = window.jzToastMood !== orig;
    window.jzToastMood = orig;
    /* 원복하면 다시 튀는가 — 시험 자체가 살아 있음을 같은 자리에서 확인한다 */
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    await sleep(60);
    notify(curIc('dia') + ' <b>1,000</b> 더 필요합니다');
    let back = false;
    for (let i = 0; i < 25 && !back; i++) {
      back = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!back) await sleep(20);
    }
    return { bad, back, patched };
  }, null, '[R1]');
  if (r1) {
    ok(r1.patched === true, 'R1a 수리를 덮어쓸 수 있다(함수 선언 — 402 의 `const` 함정이 아니다)', String(r1.patched));
    ok(r1.bad === false, 'R1b 수리를 되돌리면 알약이 **안 튄다**(수리 전 상태 = fnchk125 ③ 의 false)', String(r1.bad));
    ok(r1.back === true, 'R1c 원복하면 다시 튄다(시험 자체가 살아 있다)', String(r1.back));
  }

  /* R2 — 재화 판정 축. 옛 «글자만» 규칙(jzModalMood 식)을 같은 표본에 통과시켜 값을 대조한다.
     제품 함수를 덮지 않고 두 판정식을 나란히 돌린다(402 처방 — 덮어쓰기는 헛초록의 온상이다). */
  const r2 = await ev(() => {
    const texts = [
      "💎 <b>1,000</b> 더 필요합니다",          /* 13 교환·204 입장권 — 이름이 글자로 없다 */
      "💎 <b>다이아</b>가 부족합니다",           /* 29 단련 초기화 — 이름이 있다 */
      "💎 다이아 부족 — 추가 도전 <b>2</b> 필요"  /* 18 아레나 — 이름이 있다 */
    ];
    const wordOnly = t => /다이아/.test(t);      /* 옛 규칙 */
    return { old: texts.map(t => wordOnly(t)), n: texts.length };
  }, null, '[R2]');
  ok(r2 && r2.old[0] === false && r2.old[1] === true && r2.old[2] === true,
     'R2 옛 «글자만» 규칙은 세 문구 중 첫 꼴을 못 잡는다 = 아이콘 축이 실제로 필요했다',
     r2 ? JSON.stringify(r2.old) : 'null');

  /* R3 — «부족» 판정 정규식. `더 필요` 항을 빼면 이 작업의 발단 문구가 통째로 빠진다. */
  const r3 = await ev(() => {
    const t = '1,000 더 필요합니다';
    return { now: /부족|실패|없습니다|불가|더 필요/.test(t), cut: /부족|실패|없습니다|불가/.test(t) };
  }, null, '[R3]');
  ok(r3 && r3.now === true && r3.cut === false,
     'R3 정규식에서 `더 필요` 를 빼면 발단 문구가 안 걸린다(그 항이 장식이 아니다)',
     r3 ? ('현행 ' + r3.now + ' · 뺀 것 ' + r3.cut) : 'null');

  blk('콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY405 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
