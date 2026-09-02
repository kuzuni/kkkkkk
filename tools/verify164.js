#!/usr/bin/env node
/* 164 검증 — 01 오프라인 보상 팝업의 [이동] 은 «파는 곳»(이용권 탭)으로 착지한다.
 *
 *   node tools/verify164.js
 *
 * 버그(주인 보고 2026-08-27): [이동] 바로 위 홍보 문구가 «오프라인 보상 최대 시간 4시간 증가»
 *   인데, 버튼은 `openShopPage()` 를 부르고 그 함수는 열 때마다 `shopCat = 'summon'` 으로
 *   강제 리셋한다 → 사용자가 **소환 탭**에 떨어져 상품을 못 찾는다.
 *   («홍보 · 착지 · 상품» 세 층이 어긋난 자리 — LESSONS «156 비고» 2.)
 *
 * 검사 항목 (156 비고 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 실사용 경로 — 팝업을 띄우고 [이동] 을 **마우스로** 눌러 이용권 탭에 착지
 *   [B] 과교정 잠금 — 탭바 «상점» 으로 여는 정상 경로는 **여전히 소환 탭**
 *   [C] 73 ① 회귀 — `openShopPage('shield')` 는 소환 탭 + 그 카드로 스크롤
 *   [D] 헬퍼 인자 — coin 착지 / 인자 없음·모르는 값은 summon 폴백
 *   [E] 한 번만 그린다 — 착지 한 번에 `renderShopPage()` 1회 (열고 나서 탭 갈아 끼우기 = 2회)
 *   [F] 124 회귀 — 재화 탭의 [이동](#cnMove)도 종전대로 이용권 탭
 *   [G] 콘솔·페이지 에러 0
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const fails = [];
let n = 0;
const fail = (m) => { n++; fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const eq = (label, got, want) => (got === want ? ok(label + ' = ' + JSON.stringify(got))
                                              : fail(label + ' = ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(want) + ')'));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);

  /* 열려 있을 수 있는 것들을 정리하고 시작한다(로드 직후 오프라인 보상이 스스로 뜰 수 있다) */
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward();
                              if (typeof closeShopPage === 'function') closeShopPage();
                              if (typeof closeModal === 'function') closeModal(); });

  /* ---- [A] 실사용 경로 ---- */
  console.log('[A] 오프라인 보상 [이동] → 이용권 탭');
  await page.evaluate(() => { showOfflineReward(3600, 1e6, 10); });
  await page.waitForTimeout(500);
  eq('  팝업 열림 #offw.on', await page.evaluate(() => $('offw').classList.contains('on')), true);
  /* 홍보 문구가 «이용권 상품» 을 가리키는지 — 착지 지점을 이 문구에 맞추는 것이 이 작업이다 */
  const promo = await page.evaluate(() => [...document.querySelectorAll('#offw .ofr-t1, #offw .ofr-t2')]
    .map(x => x.textContent.trim()).join(' '));
  /* ⚑ 199 21회차 이관(333) — 상품이 «+4시간» 에서 «×배율» 로 바뀌었다(결3 ⓑ). 164 가 지키는 것은
     «홍보 문구와 착지가 같은 상품을 가리키는가» 이므로, 문자열을 새로 박지 않고 **제품의 상수에서
     기대값을 만든다**(문구만 옛 값으로 남는 부패를 이 항이 잡는다). */
  /* 725 이관 — 표기가 «n% 증가» 에서 «×N배» 로 갔다. 기대값은 여전히 **제품 상수에서** 만든다. */
  const pct = await page.evaluate(() => fmtMul(PASS_OFF_MUL));
  (promo.includes(pct) && !/4시간/.test(promo) ? ok : fail)(
    '  홍보 문구가 3번 카드의 배율과 같은 말을 한다(«' + pct + '» 포함 · 옛 «4시간» 없음): ' + JSON.stringify(promo));
  /* 애니메이션이 끝난 뒤 실제 좌표로 누른다(버튼이 아직 움직이는 중이면 헛클릭이 난다) */
  await page.evaluate(() => Promise.all(document.getAnimations({ subtree: true })
    .filter(a => { try { return a.effect && a.effect.getComputedTiming().iterations !== Infinity; } catch (e) { return false; } })
    .map(a => a.finished.catch(() => {}))).catch(() => {}));
  await page.click('#ofrGo');
  await page.waitForTimeout(600);
  const A = await page.evaluate(() => ({
    offOn:   $('offw').classList.contains('on'),
    shopOn:  $('shopw').classList.contains('on'),
    cat:     shopCat,
    tabOn:   (document.querySelector('#shopCats .stab.on') || {}).dataset?.cat || null,
    tabsOn:  document.querySelectorAll('#shopCats .stab.on').length,
    pv:      !!document.querySelector('#shopList .cn-wrap.pv'),
    ti:      (document.querySelector('#shopList .cn-ti i') || {}).textContent || '',
    boxes:   document.querySelectorAll('#shopList [data-shsum]').length,
    /* 151 — 이용권 카드는 `.pvc` 3장으로 교체됐다(옛 `.cn-cd.pv` 는 폐기) */
    passCards: document.querySelectorAll('#shopList .pvc').length,
    scroll:  $('shopList').scrollTop,
  }));
  eq('  오프라인 팝업 닫힘', A.offOn, false);
  eq('  상점 페이지 열림 #shopw.on', A.shopOn, true);
  eq('  shopCat', A.cat, 'pass');
  eq('  활성 서브탭 data-cat', A.tabOn, 'pass');
  eq('  활성 서브탭 개수', A.tabsOn, 1);
  eq('  이용권 본문(.cn-wrap.pv) 렌더', A.pv, true);
  eq('  타이틀', A.ti.trim(), '이용권 상점');
  eq('  소환 상자 카드 0건', A.boxes, 0);
  (A.passCards >= 2 ? ok : fail)('  이용권 카드 ' + A.passCards + '장 (≥2)');
  eq('  리스트 스크롤 최상단', A.scroll, 0);

  /* ---- [B] 과교정 잠금 — 탭바 «상점» 은 소환 탭 ---- */
  console.log('[B] 과교정 잠금 — 탭바 «상점» 정상 경로');
  await page.evaluate(() => { closeShopPage(); goTab('shop'); });
  await page.waitForTimeout(400);
  const B = await page.evaluate(() => ({
    shopOn: $('shopw').classList.contains('on'),
    cat: shopCat,
    tabOn: (document.querySelector('#shopCats .stab.on') || {}).dataset?.cat || null,
    boxes: document.querySelectorAll('#shopList [data-shsum]').length,
  }));
  eq('  상점 열림', B.shopOn, true);
  eq('  shopCat', B.cat, 'summon');
  eq('  활성 서브탭 data-cat', B.tabOn, 'summon');
  (B.boxes > 0 ? ok : fail)('  소환 버튼 ' + B.boxes + '개 (>0)');

  /* ---- [C] 73 ① 회귀 — focus 인자 ---- */
  console.log('[C] 73 ① 회귀 — openShopPage(focus)');
  const C = await page.evaluate(() => {
    closeShopPage();
    const key = (typeof SHOP_BOXES !== 'undefined' && SHOP_BOXES[SHOP_BOXES.length - 1]) ? SHOP_BOXES[SHOP_BOXES.length - 1].b : 'skill';
    openShopPage(key);
    const li = $('shopList');
    return { key: key, cat: shopCat, scroll: li.scrollTop, room: li.scrollHeight - li.clientHeight,
             tabOn: (document.querySelector('#shopCats .stab.on') || {}).dataset?.cat || null };
  });
  eq('  shopCat', C.cat, 'summon');
  eq('  활성 서브탭 data-cat', C.tabOn, 'summon');
  (C.room <= 0 || C.scroll > 0 ? ok : fail)('  마지막 상자(' + C.key + ')로 스크롤: ' + C.scroll + ' / 여지 ' + C.room);

  /* ---- [D] 헬퍼 인자 ---- */
  console.log('[D] openShopTab 인자');
  const D = await page.evaluate(() => {
    const r = {};
    closeShopPage(); openShopTab('coin');
    r.coin = [shopCat, (document.querySelector('#shopCats .stab.on') || {}).dataset?.cat || null,
              !!document.querySelector('#shopList .cn-wrap')];
    closeShopPage(); openShopTab();
    r.none = shopCat;
    closeShopPage(); openShopTab('없는탭');
    r.bogus = shopCat;
    closeShopPage(); openShopTab('pass');
    r.pass = shopCat;
    return r;
  });
  eq("  openShopTab('coin') → shopCat", D.coin[0], 'coin');
  eq("  openShopTab('coin') → 서브탭", D.coin[1], 'coin');
  eq("  openShopTab('coin') → 재화 본문 렌더", D.coin[2], true);
  eq('  openShopTab() → summon 폴백', D.none, 'summon');
  eq("  openShopTab('없는탭') → summon 폴백", D.bogus, 'summon');
  eq("  openShopTab('pass') → pass", D.pass, 'pass');

  /* ---- [E] 한 번만 그린다 ---- */
  console.log('[E] 착지 1회 = renderShopPage 1회');
  const E = await page.evaluate(() => {
    closeShopPage();
    const orig = window.renderShopPage;
    let n = 0;
    window.renderShopPage = function () { n++; return orig.apply(this, arguments); };
    openShopTab('pass');
    const got = n;
    window.renderShopPage = orig;
    return got;
  });
  eq('  renderShopPage 호출 횟수', E, 1);

  /* ---- [F] 124 회귀 — 재화 탭 [이동] ---- */
  console.log('[F] 124 회귀 — 재화 탭 #cnMove');
  const F = await page.evaluate(async () => {
    closeShopPage();
    /* 광고 제거를 이미 산 세이브에서는 이 버튼이 잠긴다(off) — 미보유 상태로 맞춘다 */
    if (S.pass) S.pass.noAds = false;
    if (typeof syncNoAds === 'function') syncNoAds();
    openShopTab('coin');
    const mv = document.getElementById('cnMove');
    if (!mv) return { found: false };
    mv.click();
    await new Promise(r => setTimeout(r, 300));
    return { found: true, cat: shopCat, tabOn: (document.querySelector('#shopCats .stab.on') || {}).dataset?.cat || null,
             pv: !!document.querySelector('#shopList .cn-wrap.pv') };
  });
  eq('  #cnMove 존재', F.found, true);
  if (F.found) {
    eq('  shopCat', F.cat, 'pass');
    eq('  활성 서브탭 data-cat', F.tabOn, 'pass');
    eq('  이용권 본문 렌더', F.pv, true);
  }

  /* ---- [G] 에러 ---- */
  console.log('[G] 콘솔·페이지 에러');
  eq('  에러 건수', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    ' + e));

  await browser.close();
  console.log('\nVERIFY164 ' + (n - fails.length) + '/' + n + ' ' + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
