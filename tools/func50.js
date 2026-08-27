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
/* 110 공용 부트스트랩 — 번들 브라우저가 없는 환경(클라우드 컨테이너)에서도 뜨게 한다 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
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
  /* 182 — §3 이 «승급 성공 팝업의 코스튬 그림이 실제로 칠해졌나» 를 픽셀로 본다.
     file:// 에서 아틀라스를 그린 캔버스는 기본적으로 «오염» 되어 getImageData 가 막힌다
     (verify87 이 같은 이유로 같은 플래그를 쓴다). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
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
        ['장비', '스킬', '코스튬', '펫']);
      eq('시트 안 서브탭 라벨', await page.$$eval('#bCos .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '펫']);
      eq('잠금 아이콘 0개(06+시트)',
        await page.evaluate(() => document.querySelectorAll('#eqTabs .eqli, #bCos .sk-tabs .sk-lock').length), 0);
      eq('활성 칸 = 코스튬', await page.$eval('#bCos .sk-tab.on', (e) => e.textContent.trim()), '코스튬');
      /* 다른 시트에서도 같은 4칸이 보이는가 (07·26) */
      await tap(page, '#bCos [data-costab="sk"]'); await page.waitForTimeout(350);
      eq('시트 안 «스킬» → #bSk', await page.$eval('#bSk', (e) => e.classList.contains('on')), true);
      eq('07 서브탭 라벨', await page.$$eval('#bSk .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '펫']);
      await tap(page, '#bSk [data-sktab="pet"]'); await page.waitForTimeout(350);
      eq('시트 안 «펫» → #bPet', await page.$eval('#bPet', (e) => e.classList.contains('on')), true);
      eq('26 서브탭 라벨', await page.$$eval('#bPet .sk-tab', (els) => els.map((e) => e.textContent.trim())),
        ['장비', '스킬', '코스튬', '펫']);
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
      /* 185 — 87 이 코스튬을 6종 → **50종** 으로 늘렸다. «잠금 4장 = [av2..av5]» 같은 **고정 목록**은
         데이터가 늘 때마다 썩는다(이 단언이 그렇게 죽어 있었다). 기대값을 게임 데이터에서 런타임에
         계산해 **집합으로** 비교한다 — 격자는 등급별로 묶여 DOM 순서가 id 순이 아니다. */
      const lkGot  = (await page.$$eval('#bCos .sk-card.lk', (e) => e.map((x) => x.dataset.cosit))).sort();
      const lkWant = (await S(page, 'AVATARS.filter(a => !S.avatars[a.id]).map(a => a.id)')).sort();
      eq('미보유 카드 = AVATARS − 보유', lkGot, lkWant);
      eq('미보유 장수 = 전체 − 보유 2', lkGot.length, (await S(page, 'AVATARS.length')) - 2);
      /* 182 — 87 ③ 이 갈라 놓았던 «가격 / 🔒조건» 두 갈래가 **한 갈래**로 합쳐졌다:
         구매가 없어져 미보유 카드 바닥은 전부 «🔒 <계급> 승급전 클리어» 다. */
      const bar = await page.evaluate(() => {
        const o = {};
        document.querySelectorAll('#bCos .sk-card.lk').forEach((c) => {
          const b = c.querySelector('.sk-bar>b'), w = c.querySelector('.sk-bar');
          o[c.dataset.cosit] = { rq: !!w && w.classList.contains('rq'), t: b ? b.textContent : null };
        });
        return o;
      });
      const ids = Object.keys(bar);
      eq('미보유 카드 바닥이 전부 «🔒 …승급전 클리어»',
        ids.every((id) => bar[id].t && bar[id].t.indexOf('🔒') === 0
                       && /승급전 클리어$/.test(bar[id].t)), true);
      eq('가격(💎 숫자) 표기가 한 칸도 없다',
        ids.some((id) => /\d/.test(bar[id].t || '')), false);
      const reqId = ids[0];
      eq('미보유 카드 문구 = cosReqText', bar[reqId].t,
        await S(page, `'🔒' + cosReqText(AV[${JSON.stringify(reqId)}])`));
      eq('계급 미달 카드는 .rq', bar[reqId].rq, true);
      eq('착용 슬롯 1칸', await page.$$eval('#bCos .sk-eqp .sk-slot', (e) => e.map((x) => x.dataset.cosun)), ['av1']);
      /* 총 보유 효과가 실제 곱연산(bonus() 의 아바타 합산)과 같은가 */
      const shown = await page.$eval('#bCos .sk-tot em', (e) => e.textContent);
      const want = await S(page, "'공격력 +' + pct(AVATARS.reduce((m,a)=>S.avatars[a.id]?m*(1+a.atk):m,1)-1)");
      eq('총 보유 효과', shown, want);
      await ctx.close();
    }

    /* ---------- 3. 지급 = 승급전 클리어 (182) ---------- */
    console.log('[3] 승급전 클리어 → 코스튬 지급 · 저장 · 전투력');
    {
      const { ctx, page, errs } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999, rank: 0 });
      await toCos(page);
      const before = await S(page, '({own:!!S.avatars.av2, n:Object.keys(S.avatars).length, cp:cp()})');
      /* 계급 2(골드) 승급전을 실제로 통과시킨다 — av2 백은의 용사는 희귀 = 그 묶음이다 */
      await page.evaluate(() => {
        S.rank = 1; promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true);
      });
      await page.waitForTimeout(700);
      const after = await S(page, '({own:!!S.avatars.av2, n:Object.keys(S.avatars).length, cp:cp(), cur:S.avatar})');
      const want  = await S(page, 'PROMO_COS[2].length');
      eq('묶음이 통째로 지급됨', after.n - before.n, want);
      eq('av2 보유 처리', after.own, true);
      eq('착용은 안 바뀐다(구매 시절의 «즉시 착용» 은 없다)', after.cur, 'av0');
      ok(`전투력 ${before.cp} → ${after.cp} (보유 효과 반영: ${after.cp > before.cp ? '증가' : '변화 없음'})`);
      if (!(after.cp > before.cp)) no('지급해도 전투력이 안 오른다 — bonus() 합산 미반영');
      /* 저장(S) 반영 — localStorage 까지 */
      const raw = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
      eq('localStorage.avatars.av2', !!raw.avatars.av2, true);
      eq('localStorage.rank', raw.rank, 2);
      /* 화면 반영 — 카드가 «보유» 로 다시 그려졌는가 */
      await page.evaluate(() => { renderCos(); });
      await page.waitForTimeout(250);
      eq('카드 잠금 해제', await page.$eval('#bCos [data-cosit="av2"]', (e) => e.classList.contains('lk')), false);
      /* 194 — 보유 카드의 진행바는 «보유» 가 아니라 **강화 진행도(Lv/500)** 다 */
      eq('카드 바닥 강화 진행도', await page.$eval('#bCos [data-cosit="av2"] .sk-bar>b', (e) => e.textContent),
        await S(page, "'0/' + COS_MAXLV"));
      /* 182 ③ — 승급 성공 팝업이 획득 코스튬을 **그림으로** 보여 준다 */
      await page.evaluate(() => { S.rank = 2; promo = { t: 60, max: 60, rank: nextRank() }; endPromo(true); });
      await page.waitForTimeout(300);
      const fx = await page.evaluate(() => ({
        cards: document.querySelectorAll('#mbox .pr182 .pg-c').length,
        painted: [...document.querySelectorAll('#mbox .pr182 canvas')].filter((c) => {
          try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true; } catch (e) {} return false;
        }).length
      }));
      eq('승급 성공 팝업에 획득 코스튬 격자', fx.cards, await S(page, 'PROMO_COS[3].length'));
      eq('격자 스프라이트가 실제로 그려짐', fx.painted, fx.cards);
      await page.evaluate(() => closeModal());
      if (errs.length) errs.forEach((e) => no('지급 중 ' + e)); else ok('콘솔 에러 0');
      await ctx.close();
    }

    /* ---------- 4. 구매 경로 폐기 확인 (182) ---------- */
    console.log('[4] 구매 경로 폐기 — 버튼·함수·가격 표기가 전부 없다');
    {
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 1e9 });
      await toCos(page);
      eq('[구매] 버튼 없음', await page.$$eval('#bCos [data-cosbuy]', (e) => e.length), 0);
      /* 194 — 시트 2번 칸은 [승급전] → **[강화]** 로 바뀌었다(승급전 진입은 상세 팝업이 갖는다) */
      eq('[강화] 버튼 있음', await page.$$eval('#bCos [data-cosup]', (e) => e.length), 1);
      eq('시트에서 [승급전] 은 빠짐', await page.$$eval('#bCos [data-cospromo]', (e) => e.length), 0);
      eq('buyAvatar() 폐기', await S(page, "typeof buyAvatar"), 'undefined');
      eq('AVATARS 에 cost 필드 없음', await S(page, 'AVATARS.every(a => a.cost === undefined)'), true);
      eq('다이아가 아무리 많아도 보유가 안 늘어난다',
        await S(page, 'Object.keys(S.avatars).length'), 1);
      /* 194 — 상세 팝업의 [승급전] 이 승급전 팝업으로 간다(미보유 카드에서만 뜬다) */
      await page.evaluate(() => showCosDetail('av2'));
      await page.waitForTimeout(300);
      eq('상세 버튼 라벨', await page.$eval('#mLv b', (e) => e.textContent), '승급전');
      await tap(page, '#mLv'); await page.waitForTimeout(400);
      eq('[승급전] → 승급전 팝업', await page.$$eval('#mbox .pr179', (e) => e.length), 1);
      await page.evaluate(() => closeModal());
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
      /* 194 — 슬롯 라벨은 «등급명» → **Lv.n**(07 스킬 슬롯과 같은 자리·같은 뜻) */
      eq('슬롯 Lv 라벨', await page.$eval('#bCos .sk-eqp .sk-slv', (e) => e.textContent),
        await S(page, "'Lv. ' + cosLvOf('av3')"));
      /* 전투 렌더에 실제로 쓰이는가 — 아바타 tint 가 플레이어 스프라이트 경로에 들어간다 */
      eq('전투 렌더 tint 연결', await S(page, "AV[S.avatar].tint !== null"), true);
      /* 카드의 [+] 뱃지로도 착용된다 */
      await tap(page, '#bCos [data-coseq="av0"]'); await page.waitForTimeout(500);
      eq('카드 뱃지 착용', await S(page, 'S.avatar'), 'av0');
      /* 미보유 착용 가드 */
      await tap(page, '#bCos [data-cosit="av4"]'); await page.waitForTimeout(200);
      await tap(page, '#bCos [data-coswear]'); await page.waitForTimeout(300);
      eq('미보유 착용 차단', await S(page, 'S.avatar'), 'av0');
      /* 185 — §4 와 같이 149 의 토스트 이관. «#mtitle 에 미보유» 는 이제 상세 팝업(§6)의 것이다. */
      eq('미보유 착용 안내(토스트)',
        await page.$eval('.fx-toast', (e) => e.textContent.includes('승급전에서 획득해야 착용합니다')), true);
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
      /* 185 — 82·87 이 «미보유는 ???» 를 뒤집었다: 코스튬은 «이름을 모르는 것» 이 아니라
         «아직 안 산 외형» 이라 미보유도 이름·그림을 보여 주고, **상태 줄**이 미보유를 말한다.
         그래서 «미보유임» 을 재는 자리는 제목이 아니라 `.sk-lv` 다. */
      eq('제목 = 코스튬 이름(미보유도 노출)', await page.$eval('#mtitle', (e) => e.textContent),
        await S(page, 'AV.av1.n'));
      eq('상태 줄 = 미보유', await page.$eval('#mbox .sk-lv b', (e) => e.textContent), '미보유');
      eq('[착용] 비활성(미보유)', await page.$eval('#mEq', (e) => e.disabled), true);
      /* 182 — 상세의 두 번째 버튼도 [구매] → [승급전] 이다 */
      eq('[승급전] 활성(미보유 + 도전 계급 남음)', await page.$eval('#mLv', (e) => e.disabled), false);
      eq('[승급전] 라벨', await page.$eval('#mLv', (e) => e.textContent.trim()), '승급전');
      eq('획득 조건 행', await page.$eval('#mbox .sk-ct .hd b', (e) => e.textContent), '획득 조건');
      eq('획득 조건 값 = cosReqText', await page.$eval('#mbox .sk-ct .vl b', (e) => e.textContent),
        await S(page, 'cosReqText(AV.av1)'));
      await tap(page, '#mLv'); await page.waitForTimeout(600);
      eq('상세에서 [승급전] → 승급전 팝업', await page.$$eval('#mbox .pr179', (e) => e.length), 1);
      eq('상세 [승급전] 은 코스튬을 주지 않는다', await S(page, '!!S.avatars.av1'), false);
      /* 착용 슬롯을 눌러도 상세가 열린다 */
      await page.evaluate(() => closeModal());
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
      /* 185 — 이 블록이 `FUNC50 CRASH` 의 자리였다. 작업 68 이 구버전(파란 스킨) 상점 패널 `#bShop` 을
         **통째로 폐기**했는데 여기는 아직 그 패널을 열어 «안에 아바타가 없는지» 를 물었다 —
         `page.$eval('#bShop', …)` 이 «셀렉터 없음» 으로 던져 §7·§8 이 아예 안 돌았다.
         물음을 뒤집는다: «패널 안에 아바타가 없다» → **«패널 자체가 없다»**.
         LESSONS 57-② «안 보이니까 없는 것이 아니다» 는 그대로 지킨다 — 상점 탭을 실제로 눌러
         렌더가 끝난 뒤에 DOM 전역을 읽는다(마크업뿐 아니라 렌더 경로에서도 안 살아나야 한다). */
      await tap(page, '.tab[data-t="shop"]');
      await page.waitForTimeout(600);
      eq('상점 탭 → 10 상점 페이지(#shopw)', await page.$eval('#shopw', (e) => e.classList.contains('on')), true);
      eq('구버전 패널 #bShop 없음', await page.evaluate(() => document.querySelector('#bShop') === null), true);
      eq('구버전 [data-av] 0개(문서 전역)', await page.$$eval('[data-av]', (e) => e.length), 0);
      eq('구버전 [data-pack] 0개(문서 전역)', await page.$$eval('[data-pack]', (e) => e.length), 0);
      eq('빈 #panel 이 열리지 않음', await page.$eval('#panel', (e) => !e.classList.contains('on')), true);
      /* 이관된 두 가지는 «없어졌나» 가 아니라 «어디로 갔나» 로 묻는다 — 둘 다 13 재화 탭
         (`renderCoinPage`, `#shopList`)이다: 유물조각 교환 §9 `[data-ex]` · 44 다이아 상품 §7 `[data-diabuy]`. */
      await page.evaluate(() => { openShopPage(null, 'coin'); });
      await page.waitForTimeout(500);
      eq('13 재화 탭 활성', await S(page, "shopCat === 'coin'"), true);
      eq('유물조각 교환소 보존(13 재화 탭)', await page.$$eval('#shopList [data-ex]', (e) => e.length > 0), true);
      eq('교환 칸 수 = EXCHANGE 수', await page.$$eval('#shopList [data-ex]', (e) => e.length),
        await S(page, 'EXCHANGE.length'));
      eq('다이아 상점 보존(13 재화 탭)', await page.$$eval('#shopList [data-diabuy]', (e) => e.length),
        await S(page, 'DIA_PACKS.length'));
      eq('재화 탭에 «아바타» 문자열 0회',
        await page.$eval('#shopList', (e) => (e.textContent.match(/아바타/g) || []).length), 0);
      await page.evaluate(() => { closeShopPage(); });
      await page.waitForTimeout(350);
      /* 레드닷: 살 수 있는 코스튬이 있으면 영웅 탭에 붙고 상점 탭엔 안 붙는다.
         185 — 여기가 이 게이트에서 **한 번도 실행된 적 없는** 단언이었다(위 §7 크래시에 가려 있었다).
         그대로 켜면 «상점 탭 레드닷 없음» 이 틀린다 — 166 ③ 이 상점 탭 레드닷에 **자기 조건**
         (`SHOP_BOXES.some(freeLeft > 0)` = 상자별 하루 무료 10연 잔여)을 새로 실었기 때문이고,
         이 게이트가 물어야 하는 «상점 탭이 코스튬 때문에 켜지지는 않는가» 와는 다른 축이다.
         그래서 **무료 10연을 소진시켜 166 축을 끈 뒤** 코스튬 축만 남겨 놓고 묻는다. */
      await page.evaluate((bs) => {
        S.daily.freeSum = S.daily.freeSum || {};
        bs.forEach((b) => { S.daily.freeSum[b] = 0; });
        uiDirty = true; renderUI();
      }, await S(page, 'SHOP_BOXES.map(x => x.b)'));
      await page.waitForTimeout(300);
      eq('무료 10연 잔여 0(166 축 끔)', await S(page, 'SHOP_BOXES.some(x => freeLeft(x.b) > 0)'), false);
      /* 182 — «살 수 있는 코스튬» 레드닷 항이 폐기됐다(구매 경로 소멸). 미보유 49종 + 다이아 1e9
         이어도 영웅 탭은 안 켜져야 하고, 승급 알림은 사이드 `promo` 아이콘이 갖는다. */
      eq('미보유 코스튬 49종 + 다이아 넉넉', await S(page,
        'AVATARS.filter(a => !S.avatars[a.id]).length > 0 && S.dia > 1e5'), true);
      eq('영웅 탭 레드닷 안 켜짐(코스튬 항 폐기)',
        await page.$eval('.tab[data-t="hero"]', (e) => e.classList.contains('alert')), false);
      eq('상점 탭 레드닷 없음(코스튬으로는 안 켜진다)',
        await page.$eval('.tab[data-t="shop"]', (e) => e.classList.contains('alert')), false);
      /* 승급 조건을 채우면 사이드 «승급» 아이콘이 그 자리를 대신 알린다 */
      await page.evaluate(() => {
        const nx = nextRank(); S.best = Math.max(S.best, nx.stage); S.stage = S.best;
        for (let i = 0; i < 4000 && cp() < nx.cp; i++) { S.lv.atk = (S.lv.atk | 0) + 50; S.lv.hp = (S.lv.hp | 0) + 50; }
        markDirty(); uiDirty = true; renderUI();
      });
      await page.waitForTimeout(300);
      eq('승급 가능 → 사이드 «승급» 아이콘 점등',
        await page.$eval('.side .ibtn[data-pop="promo"]', (e) => e.classList.contains('alert') || e.classList.contains('on')), true);
      await ctx.close();
    }

    /* ---------- 8. 새로고침 후 유지 ---------- */
    console.log('[8] 저장 구조 — 새로고침 후 유지');
    {
      /* ⚠ 여기서는 `addInitScript` 세이브를 쓰면 안 된다 — reload 때 **다시 주입**돼
         구매 결과를 덮어쓰고 «저장이 안 됐다» 로 오진한다(LESSONS 43-① «내가 쓴 assert 를 먼저 의심하라»).
         다이아는 페이지 안에서 올린다. */
      const { ctx, page } = await open(browser);
      /* 182 — 획득은 승급전이다. 계급 4(다이아) 승급전을 통과시켜 전설 묶음(av4 포함)을 받고 착용한다 */
      await page.evaluate(() => {
        S.rank = 3; promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true); closeModal();
        S.avatar = 'av4'; save();
      });
      await page.waitForTimeout(500);
      await page.reload(); await page.waitForTimeout(900);
      eq('reload 후 보유', await S(page, '!!S.avatars.av4'), true);
      eq('reload 후 착용', await S(page, 'S.avatar'), 'av4');
      eq('reload 후 계급', await S(page, 'S.rank'), 4);
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
