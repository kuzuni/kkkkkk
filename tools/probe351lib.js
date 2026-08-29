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

async function drive(page, o) {
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(() => {});
  if (o.sel) await page.click(o.sel, { timeout: 3000, force: true }).catch(() => {});
  else if (o.hero) {
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
