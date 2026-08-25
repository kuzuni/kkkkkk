/* 작업 50 — 코스튬 팝업(아바타 이관) 기능 감사.
 *  T2 «기능 완성 규칙»(2026-08-25 저장소 주인 지시): «만들어 놓음» 이 아니라
 *  «실제 게임 데이터로 동작하고 결과가 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료다.
 *  버튼별로 «눌렀을 때 무엇이 바뀌는지» 를 DOM·S·localStorage 3곳에서 확인한다.
 *
 *  실행: node tools/func50.js   → 마지막 줄이 `FUNC50 PASS` 여야 한다.
 *
 *  주의(LESSONS 44-①): 세이브는 반드시 `addInitScript` 로 **페이지 스크립트보다 먼저** 심는다.
 *  게임 루프가 5초마다 자동 저장하므로 로드 후에 localStorage 를 고치면 옛 값이 덮어쓴다.
 */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const pass = [], fail = [];
const ok = (m) => { pass.push(m); console.log('  ✓ ' + m); };
const no = (m) => { fail.push(m); console.log('  ✗ ' + m); };
const eq = (m, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(`${m} = ${JSON.stringify(got)}`) : no(`${m}: ${JSON.stringify(got)} (기대 ${JSON.stringify(want)})`));

async function open(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}
/* 영웅 탭 → 06 서브탭 «코스튬» 으로 들어간다 */
async function toCos(page) {
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(400);
  await tap(page, '#eqTabs [data-eqtab="cos"]');
  await page.waitForTimeout(400);
}
const S = (page, expr) => page.evaluate(`(() => (${expr}))()`);
/* 클릭은 반드시 **한 번의 evaluate 안에서 query+click** 한다.
   `page.$eval` 은 «셀렉터 resolve → 핸들로 평가» 2왕복이라 그 사이 `renderCos()` 가
   `#bCos.innerHTML` 을 갈아끼우면 **detach 된 노드를 클릭**하게 되고, 위임 핸들러(`#bCos`)가
   조상에서 끊겨 이벤트가 안 탄다 — «클릭했는데 아무 일도 안 일어나는» 간헐 실패가 이것이었다
   (LESSONS 25-⑤ «page.click 은 재렌더에 진다» 의 `$eval` 판). */
const tap = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) throw new Error('없는 셀렉터: ' + s);
  el.click(); return true;
}, sel);

(async () => {
  const browser = await chromium.launch();
  try {
    /* ---------- 1. 진입 · 서브탭 구조 ---------- */
    console.log('[1] 진입 · 서브탭 4칸');
    {
      const { ctx, page, errs } = await open(browser);
      await toCos(page);
      eq('#bCos 활성', await page.$eval('#bCos', (e) => e.classList.contains('on')), true);
      eq('시트 껍데기 높이', await page.$eval('#panel', (e) => Math.round(e.getBoundingClientRect().height / (e.getBoundingClientRect().width / 1080))), 1484);
      /* 06 시트 서브탭 · 시트 안 서브탭이 같은 4칸이어야 한다 */
      eq('06 서브탭 라벨', await page.$$eval('#eqTabs .eqtc', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '동료']);
      eq('시트 안 서브탭 라벨', await page.$$eval('#bCos .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '동료']);
      eq('잠금 아이콘 0개(06+시트)',
        await page.evaluate(() => document.querySelectorAll('#eqTabs .eqli, #bCos .sk-tabs .sk-lock').length), 0);
      eq('활성 칸 = 코스튬', await page.$eval('#bCos .sk-tab.on', (e) => e.textContent.trim()), '코스튬');
      /* 다른 시트에서도 같은 4칸이 보이는가 (07·26) */
      await tap(page, '#bCos [data-costab="sk"]'); await page.waitForTimeout(350);
      eq('시트 안 «스킬» → #bSk', await page.$eval('#bSk', (e) => e.classList.contains('on')), true);
      eq('07 서브탭 라벨', await page.$$eval('#bSk .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '동료']);
      await tap(page, '#bSk [data-sktab="pet"]'); await page.waitForTimeout(350);
      eq('시트 안 «동료» → #bPet', await page.$eval('#bPet', (e) => e.classList.contains('on')), true);
      eq('26 서브탭 라벨', await page.$$eval('#bPet .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '동료']);
      await tap(page, '#bPet [data-pttab="eq"]'); await page.waitForTimeout(350);
      eq('시트 안 «장비» → 06 오버레이', await page.$eval('#eqw', (e) => e.classList.contains('on')), true);
      if (errs.length) errs.forEach((e) => no('진입 중 ' + e)); else ok('콘솔 에러 0');
      await ctx.close();
    }

    /* ---------- 2. 카드 상태 · 총 보유 효과 ---------- */
    console.log('[2] 카드 상태 · 총 보유 효과');
    {
      const { ctx, page } = await open(browser, { avatar: 'av1', avatars: { av0: 1, av1: 1 }, dia: 20000 });
      await toCos(page);
      eq('카드 수 = AVATARS 수', await page.$$eval('#bCos .sk-card', (e) => e.length),
        await S(page, 'AVATARS.length'));
      eq('«착용 중» 라벨 1개', await page.$$eval('#bCos .sk-on', (e) => e.map((x) => x.textContent)), ['착용 중']);
      eq('착용 중 카드 = av1', await page.$eval('#bCos .sk-card.dim', (e) => e.dataset.cosit), 'av1');
      eq('미보유 카드 = 잠금 4장', await page.$$eval('#bCos .sk-card.lk', (e) => e.map((x) => x.dataset.cosit)),
        ['av2', 'av3', 'av4', 'av5']);
      eq('미보유 카드에 다이아 가격 표시',
        await page.$eval('#bCos .sk-card.lk .sk-bar>b', (e) => e.textContent.startsWith('💎')), true);
      eq('착용 슬롯 1칸', await page.$$eval('#bCos .sk-eqp .sk-slot', (e) => e.map((x) => x.dataset.cosun)), ['av1']);
      /* 총 보유 효과가 실제 곱연산(bonus() 의 아바타 합산)과 같은가 */
      const shown = await page.$eval('#bCos .sk-tot em', (e) => e.textContent);
      const want = await S(page, "'공격력 +' + pct(AVATARS.reduce((m,a)=>S.avatars[a.id]?m*(1+a.atk):m,1)-1)");
      eq('총 보유 효과', shown, want);
      await ctx.close();
    }

    /* ---------- 3. [구매] 버튼 ---------- */
    console.log('[3] [구매] — 다이아 차감 · 보유 · 저장 · 전투력');
    {
      const { ctx, page, errs } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      await toCos(page);
      const before = await S(page, '({dia:S.dia, own:!!S.avatars.av2, cp:cp()})');
      await tap(page, '#bCos [data-cosit="av2"]');   /* 선택 */
      await page.waitForTimeout(250);
      eq('선택 링(.sel) = av2', await page.$eval('#bCos .sk-card.sel', (e) => e.dataset.cosit), 'av2');
      await tap(page, '#bCos [data-cosbuy]');
      await page.waitForTimeout(700);
      const after = await S(page, '({dia:S.dia, own:!!S.avatars.av2, cur:S.avatar, cp:cp()})');
      const cost = await S(page, 'AV.av2.cost');
      eq('다이아 차감', before.dia - after.dia, cost);
      eq('보유 처리', after.own, true);
      eq('구매 즉시 착용', after.cur, 'av2');
      ok(`전투력 ${before.cp} → ${after.cp} (보유 효과 반영: ${after.cp > before.cp ? '증가' : '변화 없음'})`);
      if (!(after.cp > before.cp)) no('구매해도 전투력이 안 오른다 — bonus() 합산 미반영');
      /* 저장(S) 반영 — localStorage 까지 */
      const raw = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
      eq('localStorage.avatars.av2', !!raw.avatars.av2, true);
      eq('localStorage.avatar', raw.avatar, 'av2');
      /* 화면 반영 — 착용 슬롯·카드 상태가 다시 그려졌는가 */
      eq('착용 슬롯 갱신', await page.$eval('#bCos .sk-eqp .sk-slot', (e) => e.dataset.cosun), 'av2');
      eq('«착용 중» 카드 갱신', await page.$eval('#bCos .sk-card.dim', (e) => e.dataset.cosit), 'av2');
      if (errs.length) errs.forEach((e) => no('구매 중 ' + e)); else ok('콘솔 에러 0');
      await ctx.close();
    }

    /* ---------- 4. [구매] — 다이아 부족 ---------- */
    console.log('[4] [구매] — 다이아 부족 가드');
    {
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 0 });
      await toCos(page);
      await tap(page, '#bCos [data-cosit="av5"]'); await page.waitForTimeout(200);
      await tap(page, '#bCos [data-cosbuy]'); await page.waitForTimeout(500);
      eq('모달 열림', await page.$eval('#modal', (e) => e.classList.contains('on')), true);
      eq('다이아 부족 안내', await page.$eval('#mtitle', (e) => e.textContent.includes('다이아 부족')), true);
      eq('보유 안 됨', await S(page, '!!S.avatars.av5'), false);
      eq('다이아 그대로', await S(page, 'S.dia'), 0);
      await ctx.close();
    }

    /* ---------- 5. [착용] 버튼 ---------- */
    console.log('[5] [착용] — 외형(S.avatar) 변경 · 저장');
    {
      const { ctx, page } = await open(browser,
        { avatar: 'av0', avatars: { av0: 1, av3: 1 }, dia: 10 });
      await toCos(page);
      eq('시작 착용', await S(page, 'S.avatar'), 'av0');
      await tap(page, '#bCos [data-cosit="av3"]'); await page.waitForTimeout(250);
      await tap(page, '#bCos [data-coswear]'); await page.waitForTimeout(600);
      eq('착용 변경', await S(page, 'S.avatar'), 'av3');
      eq('저장 반영', (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).avatar, 'av3');
      eq('슬롯 등급 라벨', await page.$eval('#bCos .sk-eqp .sk-slv', (e) => e.textContent),
        await S(page, 'GRADE[AV.av3.g].n'));
      /* 전투 렌더에 실제로 쓰이는가 — 아바타 tint 가 플레이어 스프라이트 경로에 들어간다 */
      eq('전투 렌더 tint 연결', await S(page, "AV[S.avatar].tint !== null"), true);
      /* 카드의 [+] 뱃지로도 착용된다 */
      await tap(page, '#bCos [data-coseq="av0"]'); await page.waitForTimeout(500);
      eq('카드 뱃지 착용', await S(page, 'S.avatar'), 'av0');
      /* 미보유 착용 가드 */
      await tap(page, '#bCos [data-cosit="av4"]'); await page.waitForTimeout(200);
      await tap(page, '#bCos [data-coswear]'); await page.waitForTimeout(500);
      eq('미보유 착용 차단', await S(page, 'S.avatar'), 'av0');
      eq('미보유 착용 안내', await page.$eval('#mtitle', (e) => e.textContent.includes('미보유')), true);
      await ctx.close();
    }

    /* ---------- 6. 08 껍데기 상세 팝업 ---------- */
    console.log('[6] 상세 팝업(08 껍데기 재사용)');
    {
      const { ctx, page, errs } = await open(browser,
        { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      await toCos(page);
      await tap(page, '#bCos [data-cosit="av1"]'); await page.waitForTimeout(250);
      await tap(page, '#bCos [data-cosit="av1"]'); await page.waitForTimeout(450);
      eq('08 껍데기(.sk8)', await page.$eval('#modal', (e) => e.classList.contains('sk8')), true);
      eq('제목 = ???(미보유)', await page.$eval('#mtitle', (e) => e.textContent), '???');
      eq('[착용] 비활성(미보유)', await page.$eval('#mEq', (e) => e.disabled), true);
      eq('[구매] 활성', await page.$eval('#mLv', (e) => e.disabled), false);
      await tap(page, '#mLv'); await page.waitForTimeout(600);
      eq('상세에서 구매 → 보유', await S(page, '!!S.avatars.av1'), true);
      eq('상세 갱신(제목)', await page.$eval('#mtitle', (e) => e.textContent), await S(page, 'AV.av1.n'));
      /* 착용 슬롯을 눌러도 상세가 열린다 */
      await tap(page, '#modal'); await page.waitForTimeout(350);
      await tap(page, '#bCos [data-cosun]'); await page.waitForTimeout(450);
      eq('착용 슬롯 → 상세', await page.$eval('#modal', (e) => e.classList.contains('on') && e.classList.contains('sk8')), true);
      if (errs.length) errs.forEach((e) => no('상세 중 ' + e)); else ok('콘솔 에러 0');
      await ctx.close();
    }

    /* ---------- 7. 구버전 진입점 폐기 · 레드닷 이관 ---------- */
    console.log('[7] 구버전 아바타 섹션 폐기 · 레드닷');
    {
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      /* 구버전 상점 패널(#bShop)을 강제로 열어 «👤 아바타» 섹션이 정말 없는지 본다.
         LESSONS 57-② «안 보이니까 없는 것이 아니다» — 렌더 결과를 직접 읽는다. */
      await page.evaluate(() => { goTab('shop', true); });
      await page.waitForTimeout(500);
      eq('#bShop 렌더됨', await page.$eval('#bShop', (e) => e.innerHTML.length > 0), true);
      eq('구버전 [data-av] 0개', await page.$$eval('#bShop [data-av]', (e) => e.length), 0);
      eq('«아바타» 문자열 0회', await page.$eval('#bShop', (e) => (e.textContent.match(/아바타/g) || []).length), 0);
      eq('유물석 교환소는 보존', await page.$$eval('#bShop [data-ex]', (e) => e.length > 0), true);
      eq('다이아 상점은 보존', await page.$$eval('#bShop [data-pack]', (e) => e.length > 0), true);
      /* 레드닷: 살 수 있는 코스튬이 있으면 영웅 탭에 붙고 상점 탭엔 안 붙는다 */
      await page.evaluate(() => { uiDirty = true; renderUI(); });
      await page.waitForTimeout(300);
      eq('영웅 탭 레드닷', await page.$eval('.tab[data-t="hero"]', (e) => e.classList.contains('alert')), true);
      eq('상점 탭 레드닷 없음', await page.$eval('.tab[data-t="shop"]', (e) => e.classList.contains('alert')), false);
      await ctx.close();
    }

    /* ---------- 8. 새로고침 후 유지 ---------- */
    console.log('[8] 저장 구조 — 새로고침 후 유지');
    {
      /* ⚠ 여기서는 `addInitScript` 세이브를 쓰면 안 된다 — reload 때 **다시 주입**돼
         구매 결과를 덮어쓰고 «저장이 안 됐다» 로 오진한다(LESSONS 43-① «내가 쓴 assert 를 먼저 의심하라»).
         다이아는 페이지 안에서 올린다. */
      const { ctx, page } = await open(browser);
      await page.evaluate(() => { S.dia = 9e6; save(); });
      await toCos(page);
      await tap(page, '#bCos [data-cosit="av4"]'); await page.waitForTimeout(200);
      await tap(page, '#bCos [data-cosbuy]'); await page.waitForTimeout(800);
      await page.reload(); await page.waitForTimeout(900);
      eq('reload 후 보유', await S(page, '!!S.avatars.av4'), true);
      eq('reload 후 착용', await S(page, 'S.avatar'), 'av4');
      await toCos(page);
      eq('reload 후 화면 반영', await page.$eval('#bCos .sk-card.dim', (e) => e.dataset.cosit), 'av4');
      /* 옛 세이브(코스튬 필드 없음)도 죽지 않는가 — LESSONS 44-② */
      await ctx.close();
      const legacy = await open(browser, { dia: 100 });
      await toCos(legacy.page);
      eq('필드 없는 옛 세이브 기본값', await S(legacy.page, 'S.avatar'), 'av0');
      eq('옛 세이브에서도 카드 렌더', await legacy.page.$$eval('#bCos .sk-card', (e) => e.length > 0), true);
      if (legacy.errs.length) legacy.errs.forEach((e) => no('옛 세이브 ' + e)); else ok('옛 세이브 콘솔 에러 0');
      await legacy.ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${fail.length ? 'FUNC50 FAIL' : 'FUNC50 PASS'} — ${pass.length}/${pass.length + fail.length}`);
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('FUNC50 CRASH', e); process.exit(2); });
