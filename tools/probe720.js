#!/usr/bin/env node
/* 작업 720 재현 프로브 — «스킬 팝업이 «도감 완성» 으로 Lock 된다»
 *
 *   node tools/probe720.js
 *
 * 338·341·350·363·372·429·654·683 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지
 * 제품에게 직접 묻는다.** 주인 원문: «스킬팝업-> 도감완성 으로 해서 Lock돼지말고
 * 최대치 달성으로 하고 Lock되게 하기».
 *
 * 등재문이 지목한 자리는 **10 상점 소환 탭의 스킬 카드 딤**(`.shp-card>.clk`, index.html
 * ~32229 «도감 완성 🏆»)과 그 짝인 소환 차단 안내(`doSummon` ~27312)다. 갈라야 할 것은 둘:
 *   ⓐ **판정** — 지금 Lock 이 «도감 완성(전 종 보유)» 에서 걸리는가, «최대치 달성
 *      (전 종 보유 + 전 종 만렙)» 에서 걸리는가.  ← 여기가 빨가면 제품 로직을 고친다
 *   ⓑ **문구** — 그 Lock 이 스스로를 무엇이라 부르는가(«도감 완성» ↔ «최대치 달성»)
 *
 * 절:
 *   [1] 스킬 — «도감 완성 · 만렙 미달»(전 종 보유 Lv1) → 딤 0건 · 소환 실행됨
 *   [2] 스킬 — «최대치 달성»(전 종 보유 Lv100)         → ⚑ **800 이관: 딤 0건 · 소환 실행**
 *   [3] 문구 — 딤/안내가 무엇을 말하는가 → ⚑ **800 이관: 둘 다 아예 없다**
 *   [4] 펫 — [1]·[2] 와 같은 축(자매 배너)
 *   [5] 장비(무기) — 최상위 등급 `maxLv=Infinity` 라 **구조적으로 안 잠긴다**(수리 전·후 동일)
 *   [6] 콘솔 에러 0
 *
 * ⚑⚑ **800(주인 지시 2026-09-02, 720 보다 나중)이 이 재현자의 절반을 뒤집었다** — «스킬 환급
 *   만들었으니까 뽑는거 막지마봐 도감완성으로» ⇒ 소환 Lock 자체가 폐지됐다. 720 이 확인한
 *   구조 사실([1]·[5])은 그대로 살아 있고, «Lock 이 뜬다» 를 묻던 [2]·[3]·[4-b] 는 **«안 뜬다»**
 *   로 방향만 돌렸다(333 처방 — 자리를 비우지 않는다). 부재의 전체 계약은 `verify800` 이 맡는다.
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

/* notify 를 감싸 «차단 안내» 문구를 그 자리에서 받는다(토스트 DOM 을 쫓지 않는다) */
const WATCH = () => {
  window.__p720 = { notes: [] };
  const orig = window.notify;
  window.notify = function (m) { window.__p720.notes.push(String(m)); return orig.apply(this, arguments); };
};

/* 한 배너의 전 종을 «보유 + 레벨 lv» 로 심고 상점 소환 탭을 다시 그린다.
   ⚠ 조각(n)은 0 으로 둔다 — 이 자가 묻는 것은 «강화 가능» 이 아니라 «Lock 판정» 이다. */
const SEED = ({ b, lv }) => {
  const list = BANNERS[b].list;
  list.forEach(it => { S.own[it.id] = { n: 0, l: lv }; });
  S.dia = 1e9;
  save();
  window.__p720.notes = [];
  openShopPage(null, 'summon');
  renderShopPage();
  const card = [...document.querySelectorAll('#shopList .shp-card')]
    .find(c => c.querySelector('[data-shsum]') && c.querySelector('[data-shsum]').dataset.shsum === b);
  const clk = card ? card.querySelector('.clk') : null;
  return {
    n: list.length,
    allOwned: list.every(it => has(it.id)),
    allMax: list.every(it => atMax(it)),
    maxLvSample: String(maxLv(list[list.length - 1])),
    clk: !!clk,
    clkText: clk ? clk.textContent.trim() : ''
  };
};

/* 실제 소환 버튼(유료 10연)을 눌러 «막혔는가» 를 카운터로 잰다 */
const FIRE = ({ b }) => {
  const before = S.summons;
  window.__p720.notes = [];
  const btn = [...document.querySelectorAll('#shopList .cbtn[data-shsum]')]
    .find(x => x.dataset.shsum === b && !x.dataset.shfree && x.dataset.shn === '10');
  if (!btn) return { err: 'no-btn' };
  btn.click();
  const notes = window.__p720.notes.slice();
  /* 결과 팝업이 열렸으면 닫는다(다음 절이 같은 화면에서 이어진다) */
  const w = document.getElementById('sumw');
  if (w && w.classList.contains('on')) w.classList.remove('on');
  return { fired: S.summons - before, notes };
};

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(700);
  await ev(page, WATCH);
  await ev(page, () => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  return { ctx, page, errs };
}

/* «최대치» 를 말하는가 — 우리 문구 규약은 «최대치 달성». «도감»/«완성» 만 말하면 빨강 */
const saysMax = t => /최대치/.test(t);

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser);

  /* ───────── [1] 스킬 — 도감 완성 · 만렙 미달 ───────── */
  blk('[1] 스킬 배너 — 전 종 보유 · Lv1 (도감은 완성, 최대치는 미달)');
  const s1 = await ev(page, SEED, { b: 'skill', lv: 1 });
  if (!s1) { ok(false, '[1] 표본 주입 실패'); }
  else {
    info('종수 ' + s1.n + ' · 전 종 보유 ' + s1.allOwned + ' · 전 종 만렙 ' + s1.allMax + ' · maxLv ' + s1.maxLvSample);
    ok(s1.allOwned && !s1.allMax, '[1-a] 표본 = «도감 완성 · 최대치 미달»', '보유 ' + s1.allOwned + ' / 만렙 ' + s1.allMax);
    ok(!s1.clk, '[1-b] 카드 딤(Lock) 0건', s1.clk ? '딤 있음: ' + s1.clkText : '없음');
    const f1 = await ev(page, FIRE, { b: 'skill' });
    info('소환 실행 ' + (f1 ? f1.fired : '?') + '회 · 안내 ' + JSON.stringify(f1 ? f1.notes : []));
    ok(!!f1 && f1.fired === 10, '[1-c] 소환이 실제로 실행된다(차단 아님)', f1 ? f1.fired + '회' : 'n/a');
  }

  /* ───────── [2] 스킬 — 최대치 달성 ───────── */
  blk('[2] 스킬 배너 — 전 종 보유 · Lv100 (최대치 달성)');
  const s2 = await ev(page, SEED, { b: 'skill', lv: 100 });
  if (!s2) { ok(false, '[2] 표본 주입 실패'); }
  else {
    info('전 종 만렙 ' + s2.allMax + ' · 딤 ' + s2.clk + ' · 문구 «' + s2.clkText + '»');
    ok(s2.allMax, '[2-a] 표본 = «최대치 달성»', String(s2.allMax));
    ok(!s2.clk, '[2-b] ★ 800 — 최대치 달성이어도 카드 딤 0건', s2.clk ? '딤 «' + s2.clkText + '»' : '없음');
    const f2 = await ev(page, FIRE, { b: 'skill' });
    info('소환 실행 ' + (f2 ? f2.fired : '?') + '회 · 안내 ' + JSON.stringify(f2 ? f2.notes : []));
    ok(!!f2 && f2.fired === 10, '[2-c] ★ 800 — 소환이 실제로 실행된다(차단 아님)', f2 ? f2.fired + '회' : 'n/a');

    /* ───────── [3] 문구 ───────── */
    blk('[3] 문구 — 800 이후엔 말할 것이 없다(딤도 안내도 없다)');
    ok(!s2.clkText, '[3-a] ★ 카드 딤 문구가 아예 없다', '«' + s2.clkText + '»');
    const note = (f2 && f2.notes.length) ? f2.notes.join(' | ') : '';
    ok(!note, '[3-b] ★ 소환 차단 안내가 아예 없다', '«' + note + '»');
  }

  /* ───────── [4] 펫 — 자매 배너 ───────── */
  blk('[4] 펫 배너 — 같은 축');
  const p1 = await ev(page, SEED, { b: 'pet', lv: 1 });
  if (p1) ok(p1.allOwned && !p1.allMax && !p1.clk, '[4-a] 도감 완성 · 만렙 미달 → 딤 0건',
    '보유 ' + p1.allOwned + ' / 만렙 ' + p1.allMax + ' / 딤 ' + p1.clk);
  const p2 = await ev(page, SEED, { b: 'pet', lv: 100 });
  if (p2) ok(p2.allMax && !p2.clk, '[4-b] ★ 800 — 최대치 달성이어도 딤 0건', '만렙 ' + p2.allMax + ' / 딤 ' + p2.clk);

  /* ───────── [5] 장비 — 구조적으로 안 잠긴다 ───────── */
  blk('[5] 장비(무기) 배너 — 최상위 등급 maxLv=Infinity (구조축)');
  const w1 = await ev(page, SEED, { b: 'weapon', lv: 100 });
  if (w1) {
    info('전 종 보유 ' + w1.allOwned + ' · 전 종 만렙 ' + w1.allMax + ' · 마지막 종 maxLv ' + w1.maxLvSample);
    ok(w1.allOwned && !w1.allMax && !w1.clk, '[5-a] 전 종 Lv100 이어도 «최대치 달성» 이 아니다(무한 강화 등급)',
      '만렙 ' + w1.allMax + ' / 딤 ' + w1.clk);
  }

  /* ───────── [6] 콘솔 ───────── */
  blk('[6] 콘솔');
  ok(errs.length === 0, '[6] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await ctx.close(); await browser.close();
  console.log('\nPROBE720 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
