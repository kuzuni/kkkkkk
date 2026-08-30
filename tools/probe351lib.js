#!/usr/bin/env node
/* 351 프로브 공용 하네스 — «화면 목록·진입·정착» 을 probe351 과 probe351c 가 **한 벌**로 쓴다.
 *
 * 왜 가르나(385 가 등재한 «자매 자 드리프트» 를 만들지 않기 위해서다):
 *   6회차에 덮임 축(E1·E2·E3)을 재는 `probe351c` 를 새로 세웠다. 진입 경로를 복사해 두면
 *   두 자가 «서로 다른 화면» 을 재게 되는 날이 반드시 온다 — 그때 두 자의 숫자를 대조할 수
 *   없다(385 가 `verify360`·`probe360`·`cal360` 에서 등재한 것이 정확히 그 사고다).
 *   ⇒ 진입은 여기 한 곳에만 둔다. `probe351.js` 도 이 파일을 쓴다(6회차에 옮겼고, 옮긴 뒤
 *      전수 재실행이 옮기기 전과 **같은 21건 · 화면 11/45** 임을 대조로 확인했다).
 */
const path = require('path');
/* ⚑ 439 — 재는 «대상 파일» 을 밖에서 갈아 끼울 수 있게 한다(`P351_FILE`).
   왜 필요한가: 439 의 판정은 «420 규칙을 뺀 사본에서 잡히고, 지금 트리에서는 0건» 이라는
   **대조**다(407 이 `#tuto` 로 낸 «0건 → 4건 → 0건» 과 같은 꼴). 그 대조를 하려면 자가
   작업 트리의 `index.html` 을 **고쳐야** 하는데, 게이트가 제품 파일을 건드리면 중간에 죽었을 때
   트리가 더러운 채로 남는다(병렬 워커가 그것을 커밋한다). ⇒ 사본을 따로 쓰고 이 변수로
   가리킨다 — 제품 파일은 한 바이트도 안 건드린다.
   ⚠ 사본은 **저장소 루트**에 둔다(`.v439-neg.html`, .gitignore 등재) — `/tmp` 에 두면
      `index.html` 이 상대 경로로 무는 `assets/**` 가 통째로 404 라 레이아웃이 달라진다
      (360·367 이 같은 이유로 루트에 둔 선례).
   ⚠ 기본값은 그대로 저장소의 `index.html` 이다(안 주면 아무것도 안 바뀐다). */
const FILE = process.env.P351_FILE
  ? ('file://' + path.resolve(process.env.P351_FILE))
  : ('file://' + path.resolve(__dirname, '../index.html'));
/* 기준 두 해상도도 여기 둔다 — 두 자가 «다른 프레임» 을 재면 대조가 성립하지 않는다. */
const TALL = [1080, 2280];   /* 9:19 기준 */
const SHORT = [1080, 1600];  /* 9:13.3 — 지원 최저 세로 */

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page, errs };
}

/* 60 쥬시 개봉 연출이 도는 중에 재면 scale 구간이 잡혀 오검출이 난다(smoke.js 135 주석). */
async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
  /* ⚑ 10회차(2026-08-29) — **끝나지 않는 연출은 «기다릴» 수가 없으니 «세운다».**
     위 대기는 `iterations !== Infinity` 라 상시 반복 연출(카드 광택 `.cfr::after` · `.jzs` 스윕)을
     일부러 뺀다 — 그것들은 영원히 도니까 기다리면 timeout 이다. 그런데 이 자의 판정은
     «2280 판 결함 집합 ↔ 1600 판 결함 집합» 의 **차분**이고 두 판은 서로 다른 page load 라,
     같은 장식이 한쪽에서만 위상에 걸리면 **«1600 전용 결함» 이라는 유령**이 된다.
     실측(10회차 재현): `.cfr` 의 `scrollW-clientW` 는 주기의 약 40% 구간에서 0 → 265 로 오르고
     **2280 43% · 1600 40% 로 두 프레임이 같다**(= 프레임 탓이 아니다). 유령 확률은 한 자리당 ~24%.
     ⇒ 재기 직전에 무한 반복 연출만 **위상 0 으로 세운다**. 위상이 두 판에서 같아지므로 차분이
     장식을 자동으로 소거한다. 실재하는 넘침은 위상과 무관하므로 그대로 잡힌다(§되돌림 시험). */
  /* ⚑ 421(2026-08-29) — **«세운다» 는 말은 맞았는데 «0 에» 가 안 됐다.** 10회차가 적은 순서
     `a.currentTime = 0; a.pause()` 는 실측에서 위상을 **50~83ms(3~5프레임) 자리에** 굳혔다
     (`node tools/verify421.js` [3] 되돌림 시험이 그 값을 찍는다). 웹애니메이션 규약 탓이다:
       · **도는** 애니메이션에 `currentTime` 을 넣으면 hold time 이 아니라 **start time 이 옮겨진다**
         («지금 위상을 0 으로 본다» 는 뜻일 뿐, 시계는 계속 간다).
       · `pause()` 는 그 자리에서 멈추는 게 아니라 **보류 작업(pending pause task)** 을 걸고,
         hold time 은 그 작업이 **실제로 도는 프레임의 시각**으로 정해진다 ⇒ 세운 자리는
         «0 + 보류 작업이 늦은 만큼» 이고, 그 지연은 실행마다 다르다.
     결과가 421 이 등재한 플레이키다 — 122 재화 탭의 20초 회전 광선(`.cn-cd.dia.top>.pn>.ray`,
     판 256 안의 260px 상자)이 위상 0 에서는 `ovfX 2`(D2 문턱 = clientW+2 이하 ⇒ 안 걸림)인데
     0.9~1.5° 만 돌아도 회전 bbox 가 넓어져 **3~5px** 가 되고, 두 해상도가 서로 다른 위상에
     굳으면 차분이 그것을 «1600 전용 결함» 으로 낸다(7회 중 3회).
     ⇒ **순서를 뒤집는다**: 먼저 `pause()` 로 보류 작업을 걸고 그 다음 `currentTime = 0` 을 넣으면
        규약이 «보류 작업을 취소하고 hold time 을 그 값으로 확정» 하도록 정해 놓았다 ⇒ 정확히 0.
     ⚠ **문턱(2)도 기대값도 한 칸 안 건드렸다**(334 처방) — 실재하는 넘침은 위상과 무관하므로
        `--selftest` 되돌림 시험이 그대로 2건을 낸다(`verify421` [4]). */
  await page.evaluate(async () => {
    const app = document.getElementById('app'); if (!app) return;
    const zero = () => {
      for (const a of app.getAnimations({ subtree: true })) {
        const t = a.effect && a.effect.getTiming();
        if (!t || t.iterations !== Infinity) continue;
        if (a.playState === 'paused' && Number(a.currentTime) === 0) continue;
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      }
    };
    zero();
    /* 한 프레임 뒤 한 번 더 — 그 사이에 새로 붙은(재렌더·지연 시작) 무한 연출도 같이 세운다. */
    await new Promise((r) => requestAnimationFrame(() => r()));
    zero();
  }).catch(() => {});
}

/* ---------------- 화면 목록 (smoke.js [2] 오프너와 같은 경로) ---------------- */
async function collectOpeners(browser) {
  const openers = [];
  const { ctx, page } = await fresh(browser, ...TALL);
  const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
  const pops = await page.$$eval('.side .ibtn[data-pop]', (els) => els.map((e) => e.dataset.pop)).catch(() => []);
  tabs.forEach((t) => openers.push({ label: 'tab:' + t, sel: `.tab[data-t="${t}"]` }));
  pops.forEach((p) => openers.push({ label: 'side:' + p, sel: `.side .ibtn[data-pop="${p}"]` }));
  if (await page.$('#menub')) openers.push({ label: 'menu', sel: '#menub' });
  if (await page.$('#chw')) openers.push({ label: 'util:chat', sel: '#botleft .ubtn[data-util="chat"]' });
  const mns = await page.$$eval('#mnw [data-mn]', (els) => els.map((e) => e.dataset.mn)).catch(() => []);
  mns.forEach((k) => openers.push({ label: 'menu:' + k, mn: k }));
  const curs = await page.$$eval('[data-cur]', (els) => els.map((e) => e.dataset.cur)).catch(() => []);
  [...new Set(curs)].forEach((c) => openers.push({ label: 'cur:' + c, sel: `[data-cur="${c}"]` }));
  const dsubs = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => e.dataset.dsub)).catch(() => []);
  dsubs.forEach((k) => openers.push({ label: 'dunsub:' + k, dun: `#dunSub [data-dsub="${k}"]` }));
  const tsubs = await page.$$eval('#trSubs [data-trsub]', (els) => els.map((e) => e.dataset.trsub)).catch(() => []);
  tsubs.forEach((k) => openers.push({ label: 'trsub:' + k, tr: `#trSubs [data-trsub="${k}"]` }));
  const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
  cats.forEach((k) => openers.push({ label: 'shopcat:' + k, shop: `#shopCats .shp-ct[data-cat="${k}"]` }));
  const eqtabs = await page.$$eval('#eqTabs [data-eqtab]', (els) => els.map((e) => e.dataset.eqtab)).catch(() => []);
  eqtabs.forEach((k) => openers.push({ label: 'eqtab:' + k, hero: `#eqTabs [data-eqtab="${k}"]` }));
  /* ⚑ 14회차(2026-08-30) — **`eqslot`·`costab` 두 줄은 «묻는 시점» 이 틀렸다.** 8·10·12·13회차에
     이은 **같은 사고의 다섯 번째**이고, 앞 넷과 뿌리가 또 다르다:
       · 8회차 = `drive` 에 갈래가 없었다 · 10회차 = 대상이 호스트 밖이라 상자가 0×0
       · 12회차 = 손으로 적은 표(`ptab`)가 제품에 뒤처졌다 · 13회차 = 문(`[data-opencoll]`)이 죽었다
       · **이번 = 셀렉터도 갈래도 살아 있는데, 호스트를 열기 «전» 에 물었다.**
     `#eqCards` 는 08 영웅 시트를 열어야 채워지는 **빈 그릇**이라(`index.html` 14813 —
     `<div id="eqCards"></div>`) 부팅 직후 물으면 언제나 `[]` 다 ⇒ `eqslot:*` 오프너가
     **한 번도 만들어진 적이 없다.** `drive()` 의 `o.hero` 갈래도 `cap351` 의 `kind === 'eqslot'`
     갈래도 처음부터 멀쩡히 있었는데 **부를 일이 없었다.**
     ⚠ **`smoke.js` 는 같은 자리를 옳게 한다**(155행 — `.tab[data-t="hero"]` 를 먼저 누르고 묻는다).
        이 자는 그 줄을 옮겨 오면서 **앞의 클릭만 빠뜨렸다** = 385 «자매 자 드리프트» 의 조용한 꼴.
     피해: 부위 슬롯 3칸(무기·방패·목걸이)이 여는 **05 장비 세부 팝업(`#wpnw`)** 을
     1~13회차 내내 자도 눈도 본 적이 없다(재현 표는 `docs/review/351-913가독성.md` 14회차 절).
     ⇒ **호스트를 열고 묻는다. 0개면 던진다**(8·13회차와 같은 이유 — 조용한 실패가 초록으로 읽히면 안 된다).
        묻는 자리를 수집 **맨 끝**으로 옮겼다: 시트를 연 페이지 상태가 뒤 질문(`#profBtn`·`#collTabs`·
        `#psBar`)에 섞이지 않게 하기 위해서다(그 셋은 정적 마크업이라 지금은 무해하지만,
        «앞 질문이 뒤 질문의 화면을 바꾼다» 는 것 자체가 이 사고의 뿌리다).
     ⚑ `costab` 갈래는 **지웠다** — `data-costab` 은 제품에 **0건**이다(`grep -c` 확인).
        50 코스튬 시트의 서브탭은 공용 `#eqTabs` 로 흡수됐고(작업 50·96), 남은 이 줄은
        13회차의 `[data-opencoll]` 과 같은 **죽은 셀렉터**다. 되살릴 화면이 없으므로 던지지 않고 없앤다. */
  if (await page.$('#profBtn')) {
    openers.push({ label: 'prof:19', sel: '#profBtn' });
    openers.push({ label: 'prof:20-스펙', prof: '.pf-tgl>.lb' });
  }
  /* ⚑ 13회차(2026-08-30) — **이 갈래의 «문» 이 죽은 속성이었다.** 8·10·12회차와 **같은 사고의 네 번째**다.
     21 도감의 옛 진입점은 «소환 탭 컬렉션 섹션의 [세트 도감] 버튼»(`[data-opencoll]`)이었는데 그 노드는
     지금 `index.html` 에 **한 글자도 없다**(사이드 레일 `.ibtn[data-pop="coll"]` 이 대신한다 — 14450).
     `if (await page.$('[data-opencoll]'))` 가 **false 라 블록이 통째로 안 돌았고**, 그 결과
     ① `coll21` 도 ② `colltab:*` **여섯 칸도 오프너가 아예 만들어진 적이 없다** = 자가 도감 카테고리 탭을
     **한 번도 연 적이 없다.** `side:coll` 이 도감을 열긴 하지만 그것은 **기본 탭(무기) 한 칸**뿐이라
     나머지 다섯(스킬·방패·목걸이·펫·유물)은 5~13회차 내내 «결함 없음» 으로 읽혔다.
     ⚠ 하필 **436·447 이 방금 `.cl-tabs` 기하를 1600 에서 옮긴 자리**다(리본 −26 · 탭 줄 −11).
     ⇒ 402·12회차 처방 그대로 **살아 있는 문을 쓰고, 0개면 던진다**(8회차 `OPENER_KEYS` 와 같은 이유 —
        조용한 실패가 초록으로 읽히면 안 된다). `coll21`(보물상자 경유)은 **경로가 사라져** 되살리지 않는다
        — 되살려도 `side:coll` 과 같은 화면이라 서명 중복만 하나 는다. */
  if (await page.$('.side .ibtn[data-pop="coll"]')) {
    const cts = await page.$$eval('#collTabs .cltab[data-ct]', (els) => els.map((e) => e.dataset.ct)).catch(() => []);
    if (!cts.length) {
      throw new Error('[351lib] 도감 진입(`.side .ibtn[data-pop="coll"]`)은 있는데 ' +
        '`#collTabs .cltab[data-ct]` 이 0개다 — 카테고리 탭이 통째로 안 열린 채 «결함 없음» 으로 읽힌다.');
    }
    cts.forEach((k) => openers.push({ label: 'colltab:' + k, coll: `#collTabs .cltab[data-ct="${k}"]` }));
  }
  openers.push({ label: 'qtab:daily', quest: 'daily' });
  openers.push({ label: 'qtab:rep', quest: 'rep' });
  if (await page.$('#psw')) {
    openers.push({ label: 'pass:35', pass: true });
    /* ⚑ 12회차(2026-08-30) — 이 한 줄만 **손으로 적은 목록**이었고, 그래서 뒤처졌다.
       428(«보물상자 · 시련의탑» → «시련의 탑 · 절망의 탑»)이 `box` 를 지우고 `tower2` 를 만들자
       ① `ptab:box` 는 `if(el) el.click()` 이 **아무 것도 안 눌러** 스테이지 탭을 «상자 탭» 이라 부르며
          스캔했고(유령 화면 — 8·10회차와 **같은 사고**) ② `ptab:tower2`(절망의 탑)는 자가
          **한 번도 연 적이 없다.** 위 서브탭 계열이 전부 `$$eval` 로 제품에게 묻는데 여기만 표였다.
       ⇒ 402 «표는 손으로 적는 목록이라 뒤처진다» 처방 그대로 **제품에게 묻는다.** */
    const ptabs = await page.$$eval('#psBar [data-ptab]', (els) => els.map((e) => e.dataset.ptab)).catch(() => []);
    if (!ptabs.length) {
      throw new Error('[351lib] `#psw` 는 있는데 `#psBar [data-ptab]` 이 0개다 — ' +
        '패스 탭이 통째로 안 열린 채 «결함 없음» 으로 읽힌다. 마크업을 확인할 것.');
    }
    ptabs.forEach((k) => openers.push({ label: 'ptab:' + k, pass: `#psBar [data-ptab="${k}"]` }));
  }
  openers.push({ label: 'saver:56', saver: true });
  /* 14회차 — «호스트를 열어야 보이는» 질문은 여기, 수집의 **맨 끝**에서 한다(위 주석 참조).
     바로 뒤가 `ctx.close()` 라 이 클릭이 다른 질문의 화면을 바꿀 여지가 원리적으로 없다. */
  await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot)).catch(() => []);
  if (!slots.length) {
    throw new Error('[351lib] 08 영웅 시트를 열었는데 `#eqCards [data-eqslot]` 이 0개다 — ' +
      '06 장비 부위 슬롯(→ 05 세부 팝업)이 통째로 안 열린 채 «결함 없음» 으로 읽힌다.');
  }
  slots.forEach((k) => openers.push({ label: 'eqslot:' + k, hero: `#eqCards [data-eqslot="${k}"]` }));
  await ctx.close();
  return openers;
}

/* `collectOpeners` 가 만드는 오프너의 «갈래 키» 전부. `drive` 가 모르는 키가 생기면 **즉시 던진다**.
   ⚑ 8회차(2026-08-29) — 이 목록이 없어서 자가 세 화면을 **한 번도 연 적이 없다**:
   `shopcat:{summon,coin,pass}` 는 `{shop: …}` 로 만들어지는데 `drive` 에 그 갈래가 없어
   **아무 것도 안 누르고** 메인 화면을 그대로 스캔했다. 그 결과가 «결함 없음» 으로 읽혔고,
   8회차 비평가 셋(CH·CI·CJ)이 각자 1순위로 짚은 «상점 [받기]·[이동] 이 스크롤 0 에서 0% 보임» 을
   자는 5·6·7회차 내내 조용히 지나쳤다. 조용한 실패가 초록으로 읽히는 것을 막는 것이
   이 목록의 유일한 일이다(LESSONS 356-⑬ «진입 서명» 과 같은 처방, 341 [전제] 절과 같은 이유). */
const OPENER_KEYS = ['sel', 'hero', 'mn', 'dun', 'tr', 'shop', 'pass', 'cos', 'prof', 'coll', 'quest', 'saver'];

async function drive(page, o) {
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(() => {});
  if (!OPENER_KEYS.some((k) => k in o)) {
    throw new Error(`[351lib] 오프너 «${o.label}» 의 갈래를 drive() 가 모른다 — ` +
      `키 ${Object.keys(o).filter((k) => k !== 'label').join(',') || '(없음)'}. ` +
      '갈래를 추가하지 않으면 아무 것도 안 누른 채 메인 화면을 스캔해 «결함 없음» 으로 읽힌다.');
  }
  if (o.sel) {
    /* ⚑ 10회차(2026-08-29) — **누를 것이 지금 화면에 없으면 «호스트» 를 먼저 연다.**
       `cur:relic`(`[data-cur="relic"]`)이 8회차의 상점 세 화면과 **같은 사고**를 내고 있었다:
       유물조각 알약은 89 유물 페이지(`#relw`) 안 `.pcb` 에만 있어(index.html 14265 — 골드·다이아와
       달리 HUD 에는 없다) 메인 화면에서는 **상자가 0×0** 이다. `force:true` 도 상자가 없으면 못 누르고
       `.catch()` 가 삼켜 **아무 것도 안 누른 채 메인 화면을 스캔**했다 = 「결함 없음」.
       10회차 비평가 CN·CP 가 **각자 독립으로** «13-relic 은 두 장 다 필드 화면» 이라고 짚어 드러났다.
       ⚠ 처방은 «relic → 보물상자 탭» 표가 아니다(402 «표는 뒤처진다») — **제품에게 묻는다**:
       탭을 하나씩 눌러 보며 대상이 실제로 그려지는 탭을 찾는다. 못 찾으면 **던진다**(8회차 OPENER_KEYS
       와 같은 이유 — 조용한 실패가 초록으로 읽히면 안 된다). */
    const drawn = () => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, o.sel).catch(() => false);
    if (await drawn()) {
      await page.click(o.sel, { timeout: 3000, force: true }).catch(() => {});
    } else {
      const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
      let host = null;
      for (const t of tabs) {
        await page.click(`.tab[data-t="${t}"]`, { timeout: 3000, force: true }).catch(() => {});
        await page.waitForTimeout(320);
        if (await drawn()) { host = t; break; }
      }
      if (!host) {
        throw new Error(`[351lib] 오프너 «${o.label}» 의 대상 ${o.sel} 이 어느 탭에서도 안 그려진다 — ` +
          '눌리지 않은 채 메인 화면이 스캔되면 «결함 없음» 으로 읽힌다. 진입 경로를 확인할 것.');
      }
      await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.sel);
    }
  } else if (o.hero) {
    await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.hero);
  } else if (o.mn) {
    await ev(() => document.querySelector('#menub').click());
    await page.waitForTimeout(320);
    await ev((k) => { const el = document.querySelector(`#mnw [data-mn="${k}"]`); if (el) el.click(); }, o.mn);
  } else if (o.dun) {
    await page.click('.tab[data-t="adv"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.dun);
  } else if (o.tr) {
    await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.tr);
  } else if (o.shop) {
    /* 8회차 신설 — `dun`·`tr` 과 같은 «탭 → 서브탭» 꼴이다(상점 탭을 연 뒤 구획 알약을 누른다). */
    await page.click('.tab[data-t="shop"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.shop);
  } else if (o.pass) {
    await ev(() => document.getElementById('menub').click());
    await page.waitForTimeout(300);
    await ev(() => document.getElementById('psGo').click());
    await page.waitForTimeout(400);
    if (typeof o.pass === 'string') await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.pass);
  } else if (o.cos) {
    await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev(() => { const el = document.querySelector('#eqTabs [data-eqtab="cos"]'); if (el) el.click(); });
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.cos);
  } else if (o.prof) {
    await page.click('#profBtn', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.prof);
  } else if (o.coll) {
    /* 13회차 — 옛 경로(보물상자 탭 → `[data-opencoll]`)는 **문이 사라졌다**. 살아 있는 진입은
       사이드 레일 «📚 도감» 하나뿐이다(collectOpeners 의 같은 주석). */
    await page.click('.side .ibtn[data-pop="coll"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    if (typeof o.coll === 'string') await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.coll);
  } else if (o.quest) {
    await page.click('.side .ibtn[data-pop="quest"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    if (o.quest === 'rep') {
      await ev(() => { const el = document.querySelector('.qs-tg b[data-t="daily"]'); if (el) el.click(); });
      await page.waitForTimeout(300);
    }
    await ev((t) => { const el = document.querySelector(`.qs-tg b[data-t="${t}"]`); if (el) el.click(); }, o.quest);
  } else if (o.saver) {
    await ev(() => { if (typeof openSaver === 'function') openSaver(); });
  }
  await page.waitForTimeout(450);
}


module.exports = { fresh, settle, collectOpeners, drive, FILE, TALL, SHORT };
