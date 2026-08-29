/* 작업 405 재현 프로브 — `tools/fnchk125.js` 3건 실패(12/15)의 뿌리를 가른다
 *
 *   node tools/probe405.js
 *
 * 등재문(2026-08-29, 402 곁다리 관측)의 물음 셋:
 *   ① 「재화 탭 [유물조각 교환] 다이아 감소·유물조각 증가」 가 **−1000 / +0**
 *      — 잔고를 못 받는 것인지(제품 결함), 자가 옛 자리를 보는 것인지(게이트 부패)
 *   ② 「다이아 부족 상태에서 [교환] 부족 팝업 제목이 깨끗한 한글」 이 **"우편함"**
 *      — 부족 팝업이 아니라 다른 팝업이 떠 있는지, 자가 제목을 남의 노드에서 읽는지
 *   ③ 「부족 팝업 다이아 알약이 빨갛게 튄다」 **false** — ②가 참이면 ③은 파생이므로 ②부터 가른다
 *
 * 338 규칙 — 처방 전에 **재현부터**. 이 파일은 «고쳤다» 를 재는 게이트가 아니라
 * 실제 진입점을 눌러 «무엇이 실제로 일어나는가» 를 찍어 두는 자리다.
 * 찍는 것:
 *   §1 교환 클릭이 실제로 부르는 것 — S.dia · S.relic · S.mailx 세 축을 같은 순간에
 *   §2 그 우편을 수령하면 유물조각이 실제로 오는가 (흐름 완결 여부)
 *   §3 부족 경로가 팝업인가 토스트인가 — `#modal.on` · `#fxl .fx-toast` · `$('mtitle')` 잔재
 *   §4 60 쥬시 «부족 알약 튐» — 토스트 경로에서 뜨는가 / 부품(jzModalMood) 자체는 살아 있는가
 *   §5 범위 — 부족 안내 자리가 몇 개나 같은 꼴인가(골드 부족도 같은가)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✅ ' + m + (d ? ' — ' + d : '')); } else { fail++; console.log('  ❌ ' + m + (d ? ' — ' + d : '')); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(400);
  /* LESSONS 319 — 블록 하나가 던져도 나머지는 계속 돈다 */
  const ev = async (fn, tag) => {
    try { return await page.evaluate(fn); } catch (e) { ok(false, tag + ' — evaluate 예외', String(e).slice(0, 140)); return null; }
  };

  /* ==================================================================
     §1 교환 클릭이 실제로 부르는 것 — 세 축을 같은 순간에 찍는다
     ================================================================== */
  blk('§1 [유물조각 교환] 클릭 — 다이아·유물조각·우편함');
  const s1 = await ev(() => {
    S.dia = 1e9; S.relic = 0; S.mailx = [];
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    if (!btn) return { err: '교환 버튼 없음' };
    const price = +btn.dataset.ex, row = EXCHANGE.find(v => v.dia === price);
    const d0 = S.dia, r0 = S.relic, m0 = (S.mailx || []).length;
    btn.click();
    const mails = (S.mailx || []).slice(m0);
    return { price, rel: row && row.rel, dd: S.dia - d0, dr: S.relic - r0,
             mailN: mails.length, mailT: mails[0] && mails[0].t, mailR: mails[0] && mails[0].r };
  }, '§1');
  if (s1 && !s1.err) {
    ok(s1.dd === -s1.price, '다이아는 즉시 나간다', s1.dd + ' (가격 ' + s1.price + ')');
    ok(s1.dr === 0, '유물조각은 그 순간 안 는다 — fnchk125 ①의 «+0» 재현', 'Δrelic ' + s1.dr);
    ok(s1.mailN === 1 && s1.mailR === s1.rel,
       '대신 우편이 한 통 온다 — 153 «상점 지급품은 우편으로»',
       JSON.stringify(s1.mailT) + ' r=' + s1.mailR + ' (표 ' + s1.rel + ')');
  } else ok(false, '§1 교환 클릭', (s1 && s1.err) || 'null');

  /* ==================================================================
     §2 그 우편을 수령하면 유물조각이 오는가 — 흐름이 끊긴 것인지 확인
     ================================================================== */
  blk('§2 우편 수령까지 — 흐름은 완결되는가');
  const s2 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const r0 = S.relic;
    openMail(); claimAllMail(); await sleep(120);
    return { dr: S.relic - r0, left: (S.mailx || []).length };
  }, '§2');
  if (s2) {
    ok(s2.dr > 0, '우편 [일괄 수령] 이 유물조각을 실제로 준다', '+' + s2.dr);
    console.log('  · 수령 뒤 남은 우편 ' + s2.left + '통 (부팅 시드 우편이 섞인다 — 이 프로브의 관심 밖)');
  }

  /* ==================================================================
     §3 부족 경로 — 팝업인가 토스트인가, 자가 읽는 자리는 무엇인가
     ================================================================== */
  blk('§3 다이아 부족 상태에서 [교환] — 무엇이 뜨는가');
  const s3 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); closeShopPage(); await sleep(350);
    const titleBefore = ($('mtitle') || {}).textContent || '';
    /* 앞 절이 띄운 토스트(수명 1060ms)가 남아 있으면 «부족» 이 아니라 그 잔재를 읽는다 */
    document.querySelectorAll('#fxl .fx-toast').forEach(n => n.remove());
    S.dia = 0;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    btn && btn.click();
    await sleep(120);
    const t = document.querySelector('#fxl .fx-toast');
    return { modalOn: $('modal').classList.contains('on'),
             titleBefore, titleAfter: ($('mtitle') || {}).textContent || '',
             toast: t ? t.textContent.trim() : null,
             toastN: document.querySelectorAll('#fxl .fx-toast').length };
  }, '§3');
  if (s3) {
    ok(s3.modalOn === false, '부족 «팝업» 은 뜨지 않는다 — 206 이 전면 토스트로 내렸다', 'modal.on=' + s3.modalOn);
    ok(!!s3.toast && /더 필요합니다/.test(s3.toast || ''), '대신 토스트가 뜬다', JSON.stringify(s3.toast));
    ok(s3.titleAfter === s3.titleBefore,
       'fnchk125 가 읽는 $(mtitle) 은 클릭으로 한 글자도 안 바뀐다 = **직전 팝업의 잔재**',
       JSON.stringify(s3.titleBefore) + ' → ' + JSON.stringify(s3.titleAfter));
  }

  /* 검산 — 우편함을 한 번도 안 연 새 페이지에서 같은 클릭. "우편함" 이 정말 §2 의 잔재라면
     여기서는 다른 값(부팅 직후 빈 값)이 나와야 한다. */
  const p2 = await ctx.newPage();
  await p2.goto(URL);
  await p2.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await p2.waitForTimeout(400);
  const s3b = await p2.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.dia = 0;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    btn && btn.click();
    await sleep(120);
    const t = document.querySelector('#fxl .fx-toast');
    return { title: ($('mtitle') || {}).textContent || '', toast: t ? t.textContent.trim() : null };
  }).catch(e => ({ err: String(e) }));
  ok(s3b && !s3b.err && s3b.title === '',
     '검산 — 팝업을 한 번도 안 연 페이지에서는 같은 자리가 **빈 값**이다',
     JSON.stringify(s3b && s3b.title));
  await p2.close();

  /* ==================================================================
     §4 60 쥬시 «부족 알약 튐» — 경로가 죽은 것인가 부품이 죽은 것인가
     ================================================================== */
  blk('§4 60 쥬시 — 부족 알약이 빨갛게 튀는가');
  const s4 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* ⓐ 토스트 경로(현행) */
    closeModal(); await sleep(350);
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    S.dia = 0;
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    btn && btn.click();
    let viaToast = false;
    for (let i = 0; i < 30 && !viaToast; i++) {
      viaToast = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!viaToast) await sleep(20);
    }
    /* ⓑ 부품 자체 — 옛 경로(팝업)를 인위로 띄우면 아직 튀는가 */
    await sleep(700);
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    popup('다이아 부족', '<p>인위 호출 — 부품 생존 확인</p>');
    let viaModal = false;
    for (let i = 0; i < 30 && !viaModal; i++) {
      viaModal = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!viaModal) await sleep(20);
    }
    closeModal();
    return { viaToast, viaModal, hasFn: typeof jzBadPill === 'function' && typeof jzModalMood === 'function' };
  }, '§4');
  if (s4) {
    /* ⚑ 수리 **전** 이 자리의 값은 `viaToast=false / viaModal=true` 였다 — 그것이 fnchk125 ③ 의
       false 이고, «죽은 것은 부품이 아니라 경로» 라는 이 작업의 진단이다(318 계열).
       수리 뒤에는 둘 다 true 여야 한다 — 경로가 하나 더 생겼을 뿐 부품은 그대로다. */
    ok(s4.viaToast === true, '토스트 경로에서 알약이 튄다 (405 수리 — 수리 전 false)', String(s4.viaToast));
    ok(s4.viaModal === true, '팝업 경로도 그대로 튄다 (부품 무회귀)', String(s4.viaModal));
    ok(s4.hasFn === true, 'jzBadPill·jzModalMood 둘 다 살아 있다', String(s4.hasFn));
  }

  /* ==================================================================
     §5 범위 — 같은 꼴의 «부족» 안내가 몇 자리인가
     ================================================================== */
  blk('§5 범위 — 부족 안내가 토스트로 내려간 자리');
  /* 소스에 실제로 적혀 있는 문구 다섯 꼴을 그대로 `notify()` 에 태워, 어느 자리가 어느 알약을
     튀기는지 표로 남긴다. 재화 이름이 **글자로는 한 번도 안 나오는** 첫 꼴이 이 작업의 발단이다. */
  const s5 = await ev(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); await sleep(350);
    const cases = [
      ['아이콘만 · 다이아(13 교환·204 입장권)', () => curIc('dia') + ' <b>1,000</b> 더 필요합니다', 'cDia'],
      ['아이콘만 · 유물조각(15 유물 소환)', () => curIc('relic') + ' <b>50</b> 더 필요합니다', ''],
      ['아이콘+이름 · 다이아(29 단련 초기화)', () => curIc('dia') + ' <b>다이아</b>가 부족합니다', 'cDia'],
      ['아이콘만 · 강화석(28 스킬)', () => curIc('stone') + ' <b>강화석</b>이 부족합니다', ''],
      ['글자만 · 재화 아님(26 펫)', () => '강화 가능한 <b>펫</b>이 없습니다', ''],
      ['음성항 · 부족이 아닌 안내(69 우편)', () => '우편 3통 수령 — ' + curIc('gold') + ' 1.2M', '']
    ];
    const out = [];
    for (const [name, mk, want] of cases) {
      document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
      document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
      await sleep(60);
      notify(mk());
      let got = '';
      for (let i = 0; i < 20 && !got; i++) {
        if (document.querySelector('.cDia.jz-bad')) got = 'cDia';
        else if (document.querySelector('.cGold.jz-bad')) got = 'cGold';
        else await sleep(20);
      }
      out.push({ name, want, got });
    }
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    return out;
  }, '§5');
  if (s5) {
    s5.forEach(r => ok(r.got === r.want, r.name,
      '기대 ' + (r.want || '없음') + ' · 실제 ' + (r.got || '없음')));
  }

  ok(errs.length === 0, '전 과정 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await browser.close();
  console.log('\nPROBE405 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
