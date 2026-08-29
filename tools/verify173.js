#!/usr/bin/env node
/* 173 검증 — 사용자 노출 명칭 «동료» → «펫» 전수 통일 (주인 재지시 2026-08-27)
 *
 *   node tools/verify173.js
 *
 * 지시: «펫·동료 이름 펫으로 통일하라 했는데 안 했네».
 *   106 이 «동료» 로 들어오면서 기존 «펫»(PETS·notify «펫은 최대 3마리…»)과 혼용이 고착됐다.
 *   **사용자 노출 텍스트만** 전부 «펫» — 주석·변수명·id 는 그대로 둔다(지시서 원문).
 *
 * 검사 항목 («틀린 것을 잡는 칸» + «맞은 것을 지키는 칸» 을 짝으로 — LESSONS 156 비고 4):
 *   [A] 소스 전수 — 주석(/* *\/ · <!-- -->)을 걷어낸 index.html 에 «동료» 0건.
 *       반대편: 주석은 그대로 남아 있어야 한다(«기록을 지우는 것» 이 이 작업이 아니다).
 *   [B] 06 서브탭 · 07/26/50 시트 안 서브탭 4칸 라벨 = 장비·스킬·코스튬·**펫**
 *   [C] 26 시트 — 헤더 «펫» · 소환 버튼 «펫 소환» · 일괄강화 재료 부족 notify «…<b>펫</b>이 없습니다»
 *   [D] 10 상점 소환 탭 — 5번째 카드 DOM «펫 상자» · BANNERS.pet.n === '펫'
 *   [E] 21 도감 — 카테고리명 «펫» · 세트명 «전설 펫» 계열 8종 · 효과명 «펫 피해»
 *   [F] 13 재화 탭 — 카드 라벨에 «동료» 0건 + **이름만 바뀐 칸의 fs/sx/qx 불변**
 *       (측정표 §5-3 의 ref 잉크 폭은 레퍼런스의 옛 문자열 기준이라 새 문자열엔 목표폭이 없다 — LESSONS 05-2.
 *        대신 «칸을 넘치지 않는가» 만 본다)
 *       ⚑ **이관(2026-08-29, 작업 365)** — 이 절의 원래 표본이던 a6 «일반 펫 소환 열쇠» 는 **상품 자체가
 *       주인 지시로 폐기**됐다(광고 상품 4종 개편). 자리를 비우지 않고 **같은 규약이 걸린 살아 있는 표본**
 *       으로 갈아 끼웠다 — a2 는 «공물» → «유물» 로 이름만 바뀌고 fs/sx/qx 를 그대로 뒀으므로 «재보정 금지»
 *       라는 뜻이 그대로 산다(333 이 verify149 에서 쓴 것과 같은 처방. 지우기만 하면 규약이 게이트에서 사라진다).
 *   [G] 우편 — m4 본문 «든든한 펫을 만나보세요!»
 *   [H] 넘침 0 — 위 라벨 자리 전부 scrollWidth ≤ clientWidth (LESSONS 32 «최장 문자열에서 넘침 0»)
 *   [I] 회귀 — 이름만 갈았지 경로는 그대로: [펫 소환] → 10 상점 소환 탭 · 펫 상자까지 스크롤
 *   [J] 콘솔·페이지 에러 0
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const fails = [];
let n = 0;
const fail = (m) => { n++; fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const eq = (label, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(label + ' = ' + JSON.stringify(got))
  : fail(label + ' = ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(want) + ')'));

/* 주석만 걷어낸다 — 블록 주석 / HTML 주석. 문자열 안의 «동료» 는 남는다(그게 검사 대상이다). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
}

(async () => {
  /* ---------------- [A] 소스 전수 ---------------- */
  console.log('[A] 소스 — 주석 밖 «동료» 0건');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bare = stripComments(src);
  const left = (bare.match(/동료/g) || []).length;
  const lines = [];
  if (left) {
    /* 남았으면 어디인지 찍어 준다(다음 세션이 grep 을 다시 안 돌리게) */
    stripComments(src).split('\n').forEach((l, i) => { if (l.includes('동료')) lines.push(i + 1 + ': ' + l.trim().slice(0, 90)); });
  }
  eq('  A1 주석 밖 «동료» 건수', left, 0);
  if (lines.length) lines.forEach((l) => console.log('       ' + l));
  /* 반대편 — 주석의 기록(106·50·73 이력)은 지우지 않았다 */
  (((src.match(/동료/g) || []).length) >= 20 ? ok : fail)(
    '  A2 주석 안 «동료» 기록은 보존 (' + ((src.match(/동료/g) || []).length) + '건)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    if (typeof closeOfflineReward === 'function') closeOfflineReward();
    if (typeof closeShopPage === 'function') closeShopPage();
    if (typeof closeModal === 'function') closeModal();
  });

  /* ---------------- [B] 서브탭 4칸 ---------------- */
  console.log('[B] 서브탭 라벨 — 06 · 07 · 26 · 50');
  const WANT = ['장비', '스킬', '코스튬', '펫'];
  eq('  B1 HERO_TABS 라벨', await page.evaluate(() => HERO_TABS.map((t) => t[1])), WANT);
  eq('  B2 06 서브탭 DOM', await page.$$eval('#eqTabs .eqtc', (els) => els.map((e) => e.textContent.trim())), WANT);
  for (const [key, sel, label] of [['sk', '#bSk', 'B3 07 스킬 시트'], ['pet', '#bPet', 'B4 26 펫 시트'], ['cos', '#bCos', 'B5 50 코스튬 시트']]) {
    await page.evaluate((k) => gmHero(k), key);
    await page.waitForTimeout(300);
    eq('  ' + label + ' 안 서브탭', await page.$$eval(sel + ' .sk-tab', (els) => els.map((e) => e.textContent.trim())), WANT);
  }

  /* ---------------- [C] 26 펫 시트 ---------------- */
  console.log('[C] 26 펫 시트 — 헤더 · 버튼 · notify');
  await page.evaluate(() => gmHero('pet'));
  await page.waitForTimeout(350);
  eq('  C1 시트 헤더', await page.$eval('#bPet .sk-head i', (e) => e.textContent.trim()), '펫');
  eq('  C2 소환 버튼', await page.$eval('#bPet [data-ptsum] i', (e) => e.textContent.trim()), '펫 소환');
  /* 강화 재료가 없는 상태를 만들고 [일괄 강화] 를 눌러 실제 notify 문구를 읽는다 */
  const note = await page.evaluate(async () => {
    const g0 = S.gold; S.gold = 0; renderPet();
    document.querySelector('#bPet [data-ptup]').click();
    await new Promise((r) => setTimeout(r, 250));
    const t = document.querySelector('.fx-toast');
    const txt = t ? t.textContent.trim() : '';
    S.gold = g0; renderPet();
    return txt;
  });
  (/강화 가능한\s*펫이 없습니다/.test(note.replace(/\s+/g, ' ')) ? ok : fail)(
    '  C3 일괄강화 재료 부족 notify = ' + JSON.stringify(note.slice(0, 40)));

  /* ---------------- [D] 10 상점 소환 탭 ---------------- */
  console.log('[D] 10 상점 — 5번째 상자 카드');
  const D = await page.evaluate(() => {
    closeShopPage(); openShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card .chd i')].map((e) => e.textContent.trim());
    return { cards, banner: BANNERS.pet.n, box: SHOP_BOXES[4].n };
  });
  await page.waitForTimeout(250);
  eq('  D1 BANNERS.pet.n', D.banner, '펫');
  eq('  D2 SHOP_BOXES[4].n', D.box, '펫 상자');
  eq('  D3 5번째 카드 DOM', D.cards[4], '펫 상자');
  eq('  D4 앞 4장은 불변', D.cards.slice(0, 4), ['무기 상자', '방패 상자', '목걸이 상자', '스킬 상자']);

  /* ---------------- [E] 21 도감 ---------------- */
  console.log('[E] 21 도감 — 카테고리 · 세트명 · 효과명');
  const E = await page.evaluate(() => ({
    cat: COLL_CATN.pet,
    eff: COLL_EFFN.pet,
    sets: COLL_SETS.filter((s) => s.cat === 'pet').map((s) => s.n)
  }));
  eq('  E1 카테고리명', E.cat, '펫');
  eq('  E2 효과명', E.eff, '펫 피해');
  eq('  E3 펫 세트 8종 전부 «… 펫»', E.sets.filter((x) => / 펫$/.test(x)).length, E.sets.length);
  eq('  E4 세트명에 «동료» 0건', E.sets.filter((x) => x.includes('동료')).length, 0);

  /* ---------------- [F] 13 재화 탭 광고 상품 ---------------- */
  console.log('[F] 13 재화 탭 — 카드 라벨 «동료» 0건 + 이름만 바뀐 칸의 fs/sx/qx 불변');
  const F = await page.evaluate(() => {
    closeShopPage(); openShopPage(null, 'coin');
    const a2 = COIN_ADS.find((a) => a.id === 'a2');
    const dom = [...document.querySelectorAll('#shopList .cn-cd > .hd > i')].map((e) => e.textContent.trim())
      .slice(0, COIN_ADS.length);
    return { n: a2.n, q: a2.q, fs: a2.fs, sx: a2.sx, qx: a2.qx, dom, gone: !COIN_ADS.some((a) => a.id === 'a6') };
  });
  await page.waitForTimeout(250);
  eq('  F1 이름만 바뀐 칸(a2) 라벨', F.n, '유물');
  /* ⚑ 377 이관(2026-08-29) — 옛 F2 는 `fs/sx/qx` 셋을 **한 덩어리로** 묶어 1.24 에 못 박고 있었다.
     그런데 이 규약(«이름만 바뀐 칸은 재보정 금지»)이 지키는 것은 **이름(«공물»→«유물»)에서 나온 값**,
     즉 헤더 잉크 폭 보정 `fs`·`sx` 다. `qx` 는 같은 칸의 **수량 문자열 «×50» 의 가로 보정**이고
     그 문자열은 173 이 한 글자도 안 바꿨다 — 그래서 «새 문자열에는 ref 목표폭이 없다» 는 이 절의
     근거가 `qx` 에는 애초에 걸리지 않는다(레퍼런스 ② 공물 칸의 «×50» 잉크 폭 81 이 측정표 §5-3 에 있다).
     377 이 그 ref 81 에서 역산해 1.24 → 1.08 로 내렸다(수리 전 실측 93 = ref +15%).
     ⇒ 규약이 진짜 지키던 두 값은 **그대로 못 박아 두고**(F2), 수량 축만 갈라 새 값으로 옮긴다(F2b).
     이렇게 갈라야 나중에 누가 «유물» 기준으로 헤더를 재보정하면 F2 가 여전히 빨개진다. */
  eq('  F2 그 칸의 fs/sx 불변(이름에서 나온 값 — ref 폭은 옛 문자열 기준이라 재보정 금지)', [F.fs, F.sx], [39.4, 0.894]);
  eq('  F2b 수량 문자열은 그대로 «×50» 이다 — 이 축에는 ref 목표폭이 있다(측정표 §5-3 잉크 81)', F.q, '×50');
  /* ⚑ 380 이관(2026-08-29) — 이 항이 지키는 뜻(«수량 축은 ref 잉크 81 에서 역산한다»)은 그대로이고
     **눈금만** 옮겼다. 380 이 공용 세로 축 `.cn-cd>.qt{font-size}` 를 39.3 → 31 로 내리자
     같은 ref 폭 81 을 내는 배율이 1.08 → 1.33 이 됐다(fs 31·qx 1.08 실측 66 ⇒ 1.08 × 81/66 = 1.3255).
     «그 폭이 정말 ref 인가» 는 `verify377` [C] 가 렌더 잉크로 따로 잰다 — 여기서는 축이 살아 있는지만 본다. */
  eq('  F2c 그 축의 보정 `qx` = ref 81 에서 역산한 현행 값(380 이 fs 를 내려 눈금이 옮겨졌다)', F.qx, 1.33);
  eq('  F3 카드 DOM 전 칸 «동료» 0건', F.dom.filter((x) => x.includes('동료')).length, 0);
  /* 원 표본 a6 «일반 펫 소환 열쇠» 는 365(주인 지시)로 상품째 사라졌다 — «사라졌다» 를 단언해
     둬야 나중에 되살아났을 때 [A] 소스 전수와 이 절이 어긋나지 않는다 */
  eq('  F4 구 표본 a6(«일반 펫 소환 열쇠») 은 365 로 폐기됐다', F.gone, true);

  /* ---------------- [G] 우편 ---------------- */
  console.log('[G] 우편 m4 본문');
  eq('  G1 m4 본문', await page.evaluate(() => MAILS.find((m) => m.id === 'm4').b), '든든한 펫을 만나보세요!');
  eq('  G2 우편 전체 «동료» 0건',
    await page.evaluate(() => MAILS.filter((m) => (m.t + m.b).includes('동료')).length), 0);

  /* ---------------- [H] 넘침 0 ---------------- */
  console.log('[H] 라벨 넘침 0 (scrollWidth ≤ clientWidth + 1)');
  const H = await page.evaluate(async () => {
    const out = [];
    const push = (id, sel) => document.querySelectorAll(sel).forEach((e, i) => {
      const over = e.scrollWidth - e.clientWidth;
      if (over > 1) out.push(id + '[' + i + '] +' + over + 'px «' + e.textContent.trim() + '»');
    });
    closeShopPage(); openShopPage();
    push('상점 소환 카드', '#shopList .shp-card .chd i');
    closeShopPage(); openShopPage(null, 'coin');
    push('재화 광고 카드', '#shopList .cn-cd > .hd > i');
    closeShopPage();
    gmHero('pet'); await new Promise((r) => setTimeout(r, 300));
    push('26 헤더', '#bPet .sk-head i');
    push('26 버튼', '#bPet .sk-btn i');
    push('26 서브탭', '#bPet .sk-tab i, #bPet .sk-tab');
    push('06 서브탭', '#eqTabs .eqtc i, #eqTabs .eqtc');
    return out;
  });
  eq('  H1 넘친 라벨 건수', H.length, 0);
  H.forEach((x) => console.log('       ' + x));

  /* ---------------- [I] 회귀 — 경로는 그대로 ---------------- */
  console.log('[I] 회귀 — [펫 소환] → 10 상점 소환 탭 · 펫 상자까지 스크롤');
  const I = await page.evaluate(async () => {
    closeShopPage(); gmHero('pet');
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector('#bPet [data-ptsum]').click();
    await new Promise((r) => setTimeout(r, 700));
    const list = document.getElementById('shopList');
    const card = list ? list.querySelectorAll('.shp-card')[4] : null;
    return {
      on: $('shopw').classList.contains('on'),
      cat: shopCat,
      name: card ? card.querySelector('.chd i').textContent.trim() : null,
      scrolled: list ? Math.round(list.scrollTop) : -1
    };
  });
  eq('  I1 상점 소환 탭 열림', [I.on, I.cat], [true, 'summon']);
  eq('  I2 착지 카드 = 펫 상자', I.name, '펫 상자');
  (I.scrolled > 0 ? ok : fail)('  I3 펫 상자까지 스크롤 = ' + I.scrolled + 'px');

  /* ---------------- [J] 콘솔 ---------------- */
  console.log('[J] 콘솔');
  eq('  J1 콘솔·페이지 에러 건수', errs.length, 0);
  errs.forEach((e) => console.log('       ' + e));

  await ctx.close();
  await browser.close();
  console.log('\nVERIFY173 ' + (n - fails.length) + '/' + n + (fails.length ? ' FAIL' : ' PASS'));
  if (fails.length) { fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
})();
