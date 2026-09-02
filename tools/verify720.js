#!/usr/bin/env node
/* 게이트 720 — ⚑ **800 이 이 자리를 뒤집었다: 소환 Lock 은 «없다».**
 *
 *   node tools/verify720.js
 *
 * 720 주인 지시(2026-09-02 03:50): «스킬팝업-> 도감완성 으로 해서 Lock돼지말고 최대치 달성으로
 * 하고 Lock되게 하기» — 재현(`tools/probe720.js`)이 가른 것:
 *   ⓐ **판정은 처음부터 옳았다** — `allMaxed` = 전 종 보유 **+ 전 종 만렙**.
 *   ⓑ 틀린 것은 **이름**뿐이었고, 그 이름이 두 자리에 따로 적혀 있었다 ⇒ 720 은 `MAXED_TXT`
 *      한 곳으로 모았다.
 * 800 주인 지시(2026-09-02, 같은 날 나중): «스킬 환급 만들었으니까 뽑는거 막지마봐 도감완성으로»
 *   ⇒ **Lock 자체가 폐지됐다.** 757 조각 환급이 «만렙 뒤의 조각은 쓸 데가 없다» 는 전제를
 *   없앴으므로 차단이 설 자리가 사라진 것이다. 720 이 세운 `MAXED_TXT` 는 읽는 자리가 둘 다
 *   없어져 선언째 지워졌다.
 *
 * ⚠ **자리를 비우지 않고 방향만 뒤집는다**(333 처방). 720 이 확인한 사실 중 살아남은 것
 *   (판정식 `allMaxed` 의 뜻 · 장비 배너는 구조적으로 그 상태에 못 닿는다)은 그대로 지키고,
 *   «Lock 이 뜬다» 를 묻던 항은 **«안 뜬다»** 로 뒤집는다.
 *
 * 절:
 *   [A] 최대치 미달(전 종 보유 Lv1) — Lock 0건 · 소환 실행됨  (720 이 지키던 그대로)
 *   [B] ★ 최대치 달성(전 종 보유 Lv100) — **그래도** Lock 0건 · 소환 실행 · 차단 안내 0건
 *   [C] 정적 — `MAXED_TXT` 선언 0건 · 딤 노드를 찍는 코드 0건 · 옛 이름 문자열 0건
 *   [D] 판정식의 뜻은 그대로 — `allMaxed` = 보유 + 만렙(720 ⓐ) · 장비 배너는 구조적으로 거짓
 *   [E] 콘솔 에러 0
 *   [R] 되돌림 — ① 판정을 «보유만» 으로 되돌려도 **소환은 여전히 실행된다**(판정이 소환을 더는
 *                안 막는다는 증거) ② 딤을 다시 찍는 사본은 [B] 의 딤 항이 빨개진다
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

  console.log('\n[A] 최대치 미달 — Lock 이 없다(720 이 지키던 그대로)');
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

  console.log('\n[B] ★ 800 — 최대치 달성에서도 Lock 이 없다(방향을 뒤집은 자리)');
  const b = await page.evaluate(SEED, { b: 'skill', lv: 100 });
  ok(b.allMax, 'B0 표본 = 전 종 만렙(무대 확인 — 옛 Lock 이 뜨던 바로 그 상태)', String(b.allMax));
  ok(!b.clk, 'B1 ★ 카드 딤 0건', b.clk ? '딤 «' + b.clkText + '»(되살아났다)' : '없음');
  const bf = await page.evaluate(FIRE, { b: 'skill' });
  ok(bf.fired === 10, 'B2 ★ 소환이 실제로 실행된다(차단 아님)', bf.fired + '회');
  const note = bf.notes.join(' | ');
  ok(note.indexOf(NEW_NAME) < 0 && note.indexOf(OLD_NAME) < 0,
     'B3 ★ 차단 안내가 안 뜬다(옛 이름·새 이름 둘 다)', '«' + note + '»' || '없음');
  const bp = await page.evaluate(SEED, { b: 'pet', lv: 100 });
  ok(bp.allMax && !bp.clk, 'B4 펫 배너도 같은 답(자매)', '만렙 ' + bp.allMax + ' / 딤 ' + bp.clk);

  console.log('\n[C] 정적 — 800 이 지운 것들이 정말 없다');
  ok(!/const MAXED_TXT\s*=/.test(code), 'C1 `MAXED_TXT` 선언 0건 — 읽는 자리가 둘 다 사라졌다');
  ok(!/'<div class="clk">'/.test(code), 'C2 카드 딤을 찍는 코드 0건');
  ok(!/재료를 환불하세요/.test(code.replace(/\/\*[\s\S]*?\*\//g, ' ')),
     'C3 소환 차단 안내 0건(주석에 남은 이력은 세지 않는다)');
  /* ⚑ 720 의 C4 는 그대로 살아 있다 — 옛 이름이 제품 문자열로 돌아오면 안 된다 */
  const lits = (code.match(/'[^'\n]*도감 완성[^'\n]*'/g) || []);
  ok(lits.length === 0, 'C4 ★ 제품 문자열 리터럴에 «' + OLD_NAME + '» 0건 (720 의 항 그대로)',
     lits.slice(0, 3).join(' | ') || '0건');
  ok(!/\.shp-card\s+\.clk\{/.test(code), 'C5 잠금 딤 CSS(`.shp-card .clk`) 선언도 0건');

  console.log('\n[D] 720 ⓐ 는 살아 있다 — 판정식의 «뜻» 은 안 바뀌었다');
  const d = await page.evaluate(() => {
    const one = SKILLS[0].id;
    S.own = {}; BANNERS.skill.list.forEach(it => { S.own[it.id] = { n: 0, l: 1 }; });
    const ownOnly = allMaxed(BANNERS.skill.list);          /* 전 종 보유 · Lv1 */
    BANNERS.skill.list.forEach(it => { S.own[it.id] = { n: 0, l: maxLv(it) }; });
    const allMax = allMaxed(BANNERS.skill.list);           /* 전 종 만렙 */
    S.own[one] = { n: 0, l: 1 };
    const oneShort = allMaxed(BANNERS.skill.list);         /* 한 종만 미달 */
    const eqBanner = ['weapon', 'shield', 'amulet'].map(bk => {
      BANNERS[bk].list.forEach(it => { S.own[it.id] = { n: 0, l: 100 }; });
      return allMaxed(BANNERS[bk].list);
    });
    return { ownOnly, allMax, oneShort, eqBanner };
  });
  ok(d.ownOnly === false, 'D1 «전 종 보유 · Lv1» 은 allMaxed 가 아니다(720 ⓐ — 판정은 만렙까지 본다)');
  ok(d.allMax === true,   'D2 «전 종 만렙» 이면 allMaxed 다');
  ok(d.oneShort === false,'D3 한 종만 미달이어도 거짓이다(every)');
  ok(d.eqBanner.every(x => x === false),
     'D4 장비 3배너는 구조적으로 거짓 — 최상위 등급 `maxLv` 가 Infinity(probe720 [5] · 740)',
     JSON.stringify(d.eqBanner));

  console.log('\n[E] 콘솔');
  ok(errs.length === 0, 'E1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await ctx.close();

  console.log('\n[R] 되돌림 — 사본이 실제로 빨개지는가');
  {
    /* ① 판정을 «보유만»(= 옛 도감 완성)으로 되돌린다 — 800 이후에는 그래도 **소환이 실행돼야**
       한다. 판정이 더는 소환을 막지 않는다는 것이 800 의 계약이고, 이 사본이 그것을 증언한다.
       (720 시절에는 같은 사본이 [A] 를 빨갛게 만들었다 — 그때는 판정이 곧 차단이었다.) */
    const rev1 = code.replace('const allMaxed = list => list.every(it => atMax(it));',
                              'const allMaxed = list => list.every(it => has(it.id));');
    ok(rev1 !== code, 'R0 판정 되돌림 사본을 만들었다(만렙 → 보유만)');
    const t1 = path.resolve(__dirname, '../.rev720a.html');
    fs.writeFileSync(t1, rev1);
    try {
      const r = await boot(browser, 'file://' + t1);
      const s = await r.page.evaluate(SEED, { b: 'skill', lv: 1 });
      ok(!s.clk, 'R1 ★ 판정을 흔들어도 딤이 안 생긴다 — 딤을 찍는 코드가 아예 없다',
         s.clk ? '딤 «' + s.clkText + '»(800 이 되돌아갔다)' : '없음');
      const f = await r.page.evaluate(FIRE, { b: 'skill' });
      ok(f.fired === 10, 'R2 ★ 판정을 흔들어도 소환은 실행된다 = 판정이 더는 차단이 아니다',
         f.fired + '회');
      await r.ctx.close();
    } finally { try { fs.unlinkSync(t1); } catch (_) {} }

    /* ② 딤을 다시 찍는 사본 — [B1] 이 실제로 빨개지는지(무른 자가 아님을 증명) */
    const rev2 = code.replace("      +  '<s class=\"updot\"></s>'",
      "      +  '<s class=\"updot\"></s>' + (allMaxed(BANNERS[x.b].list) ? '<div class=\"clk\">최대치 달성 🏆</div>' : '')");
    ok(rev2 !== code, 'R3 딤 되돌림 사본을 만들었다(렌더 한 줄)');
    const t2 = path.resolve(__dirname, '../.rev720b.html');
    fs.writeFileSync(t2, rev2);
    try {
      const r = await boot(browser, 'file://' + t2);
      const s = await r.page.evaluate(SEED, { b: 'skill', lv: 100 });
      ok(s.clk, 'R4 ★ 딤이 되살아난 사본에서는 [B1] 이 빨개진다', '딤 «' + s.clkText + '»');
      await r.ctx.close();
    } finally { try { fs.unlinkSync(t2); } catch (_) {} }

    /* 무르게 통과한 게 아님 — 같은 자로 원본이 다시 초록 */
    const r2 = await boot(browser, URL);
    const g1 = await r2.page.evaluate(SEED, { b: 'skill', lv: 1 });
    const g2 = await r2.page.evaluate(SEED, { b: 'skill', lv: 100 });
    ok(!g1.clk && !g2.clk, 'R5 원본은 같은 자로 다시 초록(두 상태 모두 딤 0건)',
       'Lv1 딤 ' + g1.clk + ' · Lv100 딤 ' + g2.clk);
    await r2.ctx.close();
  }

  await browser.close();
  console.log('\nverify720: ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
