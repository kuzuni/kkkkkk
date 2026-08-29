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
const FILE = 'file://' + path.resolve(__dirname, '../index.html');
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
  await page.evaluate(() => {
    const app = document.getElementById('app'); if (!app) return;
    for (const a of app.getAnimations({ subtree: true })) {
      const t = a.effect && a.effect.getTiming();
      if (!t || t.iterations !== Infinity) continue;
      try { a.currentTime = 0; a.pause(); } catch (_) {}
    }
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
  const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot)).catch(() => []);
  slots.forEach((k) => openers.push({ label: 'eqslot:' + k, hero: `#eqCards [data-eqslot="${k}"]` }));
  const costabs = await page.$$eval('#bCos [data-costab]', (els) => els.map((e) => e.dataset.costab)).catch(() => []);
  costabs.forEach((k) => openers.push({ label: 'costab:' + k, cos: `#bCos [data-costab="${k}"]` }));
  if (await page.$('#profBtn')) {
    openers.push({ label: 'prof:19', sel: '#profBtn' });
    openers.push({ label: 'prof:20-스펙', prof: '.pf-tgl>.lb' });
  }
  if (await page.$('[data-opencoll]')) {
    openers.push({ label: 'coll21', coll: true });
    const cts = await page.$$eval('#collTabs .cltab[data-ct]', (els) => els.map((e) => e.dataset.ct)).catch(() => []);
    cts.forEach((k) => openers.push({ label: 'colltab:' + k, coll: `#collTabs .cltab[data-ct="${k}"]` }));
  }
  openers.push({ label: 'qtab:daily', quest: 'daily' });
  openers.push({ label: 'qtab:rep', quest: 'rep' });
  if (await page.$('#psw')) {
    openers.push({ label: 'pass:35', pass: true });
    for (const k of ['stage', 'box', 'tower', 'att']) openers.push({ label: 'ptab:' + k, pass: `#psBar [data-ptab="${k}"]` });
  }
  openers.push({ label: 'saver:56', saver: true });
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
    await page.click('.tab[data-t="box"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev(() => { const el = document.querySelector('[data-opencoll]'); if (el) el.click(); });
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
