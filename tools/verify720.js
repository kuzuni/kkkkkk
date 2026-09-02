#!/usr/bin/env node
/* 게이트 720 — 소환 Lock 기준은 «도감 완성» 이 아니라 «최대치 달성» 이다
 *
 *   node tools/verify720.js
 *
 * 주인 지시(2026-09-02 03:50): «스킬팝업-> 도감완성 으로 해서 Lock돼지말고 최대치 달성으로
 * 하고 Lock되게 하기». 재현(`tools/probe720.js`)이 가른 것:
 *   ⓐ **판정은 처음부터 옳았다** — `allMaxed` = 전 종 보유 **+ 전 종 만렙**.
 *      전 종 보유·Lv1(= 도감만 완성) 표본에서 딤 0건 · 소환 10회 실행.
 *   ⓑ **이름이 틀렸다** — 카드 딤 «도감 완성 🏆» · 소환 차단 안내 «… 도감 완성 — 재료를 …».
 *      게다가 그 이름이 **두 자리에 따로** 적혀 있어 판정과 표기가 갈릴 수 있었다.
 * ⇒ 720 은 이름을 `MAXED_TXT` 한 곳으로 모았고 **판정식은 한 줄도 안 바꿨다.**
 *
 * 절:
 *   [A] 판정 — «도감 완성 · 최대치 미달»(전 종 보유 Lv1)에서 Lock 0건 · 소환 실행됨
 *   [B] 판정 — «최대치 달성»(전 종 보유 Lv100)에서 Lock 1건 · 소환 차단 · 문구가 «최대치 달성»
 *   [C] 단일 출처(정적) — 두 자리가 `MAXED_TXT` 를 읽고, 제품 문자열에 옛 이름 0건
 *   [D] 기하 — 딤 상자는 카드 안 inset 7px 그대로(720 은 레이아웃 Δ0px)
 *   [E] 콘솔 에러 0
 *   [R] 되돌림 — ① 판정을 «보유만» 으로 되돌린 사본은 [A] 가 빨개진다
 *                ② 이름을 옛 문자열로 되돌린 사본은 **두 자리가 같이** 빨개진다(= 단일 출처의 증거)
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const code = fs.readFileSync(SRC, 'utf8');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  — ' + d : '')); };

/* notify 를 감싸 차단 안내를 그 자리에서 받는다 */
const WATCH = () => {
  window.__v720 = { notes: [] };
  const orig = window.notify;
  window.notify = function (m) { window.__v720.notes.push(String(m)); return orig.apply(this, arguments); };
};

/* 한 배너의 전 종을 «보유 + 레벨 lv» 로 심고 10 상점 소환 탭을 다시 그린다 */
const SEED = ({ b, lv }) => {
  BANNERS[b].list.forEach(it => { S.own[it.id] = { n: 0, l: lv }; });
  S.dia = 1e9;
  save();
  window.__v720.notes = [];
  openShopPage(null, 'summon');
  renderShopPage();
  const card = [...document.querySelectorAll('#shopList .shp-card')]
    .find(c => { const t = c.querySelector('[data-shsum]'); return t && t.dataset.shsum === b; });
  const clk = card ? card.querySelector('.clk') : null;
  const cr = card ? card.getBoundingClientRect() : null;
  const kr = clk ? clk.getBoundingClientRect() : null;
  return {
    n: BANNERS[b].list.length,
    allOwned: BANNERS[b].list.every(it => has(it.id)),
    allMax: BANNERS[b].list.every(it => atMax(it)),
    clk: !!clk,
    clkText: clk ? clk.textContent.trim() : '',
    inset: (cr && kr) ? [Math.round((kr.left - cr.left) * 100) / 100, Math.round((kr.top - cr.top) * 100) / 100,
                        Math.round((cr.right - kr.right) * 100) / 100, Math.round((cr.bottom - kr.bottom) * 100) / 100] : null
  };
};

/* 실제 유료 10연 버튼을 눌러 «막혔는가» 를 카운터로 잰다 */
const FIRE = ({ b }) => {
  const before = S.summons;
  window.__v720.notes = [];
  const btn = [...document.querySelectorAll('#shopList .cbtn[data-shsum]')]
    .find(x => x.dataset.shsum === b && !x.dataset.shfree && x.dataset.shn === '10');
  if (!btn) return { err: 'no-btn', fired: -1, notes: [] };
  btn.click();
  const notes = window.__v720.notes.slice();
  const w = document.getElementById('sumw');
  if (w && w.classList.contains('on')) w.classList.remove('on');
  return { fired: S.summons - before, notes };
};

async function boot(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(600);
  await page.evaluate(WATCH);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  return { ctx, page, errs };
}

const OLD_NAME = '도감 완성';
const NEW_NAME = '최대치 달성';

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, URL);

  console.log('\n[A] 판정 — «도감 완성 · 최대치 미달» 에서는 Lock 이 없다');
  const a = await page.evaluate(SEED, { b: 'skill', lv: 1 });
  ok(a.allOwned && !a.allMax, 'A0 표본 = 전 종 보유(' + a.n + '종) · 만렙 미달',
     '보유 ' + a.allOwned + ' / 만렙 ' + a.allMax);
  ok(!a.clk, 'A1 ★ 스킬 카드 딤 0건', a.clk ? '딤 «' + a.clkText + '»' : '없음');
  const af = await page.evaluate(FIRE, { b: 'skill' });
  ok(af.fired === 10, 'A2 소환이 실제로 실행된다(차단 아님)', af.fired + '회');
  ok(af.notes.length === 0, 'A3 차단 안내가 안 뜬다', JSON.stringify(af.notes));
  const ap = await page.evaluate(SEED, { b: 'pet', lv: 1 });
  ok(ap.allOwned && !ap.allMax && !ap.clk, 'A4 펫 배너도 같은 답(자매)',
     '보유 ' + ap.allOwned + ' / 만렙 ' + ap.allMax + ' / 딤 ' + ap.clk);

  console.log('\n[B] 판정 — «최대치 달성» 에서 Lock + 그 이름');
  const b = await page.evaluate(SEED, { b: 'skill', lv: 100 });
  ok(b.allMax, 'B0 표본 = 전 종 만렙', String(b.allMax));
  ok(b.clk, 'B1 ★ 카드 딤 1건', b.clk ? '있음' : '없음');
  ok(b.clkText.indexOf(NEW_NAME) >= 0, 'B2 ★ 딤 문구가 «' + NEW_NAME + '»', '«' + b.clkText + '»');
  ok(b.clkText.indexOf(OLD_NAME) < 0, 'B3 딤 문구에 옛 이름 0건', '«' + b.clkText + '»');
  const bf = await page.evaluate(FIRE, { b: 'skill' });
  ok(bf.fired === 0, 'B4 ★ 소환이 차단된다', bf.fired + '회');
  const note = bf.notes.join(' | ');
  ok(note.indexOf(NEW_NAME) >= 0, 'B5 ★ 차단 안내가 «' + NEW_NAME + '»', '«' + note + '»');
  ok(note.indexOf(OLD_NAME) < 0, 'B6 차단 안내에 옛 이름 0건', '«' + note + '»');
  const bp = await page.evaluate(SEED, { b: 'pet', lv: 100 });
  ok(bp.allMax && bp.clk && bp.clkText.indexOf(NEW_NAME) >= 0, 'B7 펫 배너도 같은 답(자매)',
     '딤 ' + bp.clk + ' «' + bp.clkText + '»');

  console.log('\n[C] 단일 출처 — 이름은 한 곳에서만 적힌다');
  ok(/const MAXED_TXT = '최대치 달성';/.test(code), 'C1 `MAXED_TXT` 선언이 있다');
  ok(/'<div class="clk">' \+ MAXED_TXT/.test(code), 'C2 카드 딤이 상수를 읽는다');
  ok(/notify\('🏆 ' \+ B\.n \+ ' ' \+ MAXED_TXT/.test(code), 'C3 소환 차단 안내가 상수를 읽는다');
  /* 문자열 리터럴에 남은 옛 이름 0건 — 주석은 세지 않는다(720 이 «옛 이름» 을 주석에 적어 둔다) */
  const lits = (code.match(/'[^'\n]*도감 완성[^'\n]*'/g) || []);
  ok(lits.length === 0, 'C4 ★ 제품 문자열 리터럴에 «' + OLD_NAME + '» 0건', lits.slice(0, 3).join(' | ') || '0건');

  console.log('\n[D] 기하 — 딤 상자는 카드 안 inset 7px 그대로(레이아웃 Δ0px)');
  ok(!!b.inset && b.inset.every(v => Math.abs(v - 7) <= 0.6), 'D1 딤 inset [l,t,r,b] ≈ 7',
     JSON.stringify(b.inset));

  console.log('\n[E] 콘솔');
  ok(errs.length === 0, 'E1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await ctx.close();

  console.log('\n[R] 되돌림 — 사본이 실제로 빨개지는가');
  {
    /* ① 판정을 «보유만»(= 도감 완성)으로 되돌린다 */
    const rev1 = code.replace('const allMaxed = list => list.every(it => atMax(it));',
                              'const allMaxed = list => list.every(it => has(it.id));');
    ok(rev1 !== code, 'R0 판정 되돌림 사본을 만들었다(만렙 → 보유만)');
    const t1 = path.resolve(__dirname, '../.rev720a.html');
    fs.writeFileSync(t1, rev1);
    try {
      const r = await boot(browser, 'file://' + t1);
      const s = await r.page.evaluate(SEED, { b: 'skill', lv: 1 });
      ok(s.clk, 'R1 ★ 보유만 보는 사본은 Lv1 에서도 딤이 뜬다 = [A1] 이 빨개진다',
         s.clk ? '딤 «' + s.clkText + '»' : '없음(자가 무르다)');
      const f = await r.page.evaluate(FIRE, { b: 'skill' });
      ok(f.fired === 0, 'R2 그 사본은 소환도 막는다 = [A2] 가 빨개진다', f.fired + '회');
      await r.ctx.close();
    } finally { try { fs.unlinkSync(t1); } catch (_) {} }

    /* ② 이름만 옛 문자열로 되돌린다 — 한 줄로 **두 자리가 같이** 바뀌어야 단일 출처다 */
    const rev2 = code.replace("const MAXED_TXT = '최대치 달성';", "const MAXED_TXT = '도감 완성';");
    ok(rev2 !== code, 'R3 이름 되돌림 사본을 만들었다(상수 한 줄)');
    const t2 = path.resolve(__dirname, '../.rev720b.html');
    fs.writeFileSync(t2, rev2);
    try {
      const r = await boot(browser, 'file://' + t2);
      const s = await r.page.evaluate(SEED, { b: 'skill', lv: 100 });
      const f = await r.page.evaluate(FIRE, { b: 'skill' });
      const n = f.notes.join(' | ');
      ok(s.clkText.indexOf(OLD_NAME) >= 0 && n.indexOf(OLD_NAME) >= 0,
         'R4 ★ 상수 한 줄로 **딤과 안내가 같이** 옛 이름이 된다 = 단일 출처',
         '딤 «' + s.clkText + '» · 안내 «' + n + '»');
      await r.ctx.close();
    } finally { try { fs.unlinkSync(t2); } catch (_) {} }

    /* 무르게 통과한 게 아님 — 같은 자로 원본이 다시 초록 */
    const r2 = await boot(browser, URL);
    const g1 = await r2.page.evaluate(SEED, { b: 'skill', lv: 1 });
    const g2 = await r2.page.evaluate(SEED, { b: 'skill', lv: 100 });
    ok(!g1.clk && g2.clk && g2.clkText.indexOf(NEW_NAME) >= 0, 'R5 원본은 같은 자로 다시 초록',
       'Lv1 딤 ' + g1.clk + ' · Lv100 «' + g2.clkText + '»');
    await r2.ctx.close();
  }

  await browser.close();
  console.log('\nverify720: ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
