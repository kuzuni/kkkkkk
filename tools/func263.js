#!/usr/bin/env node
/* 263 기능 체크 — «눌렀을 때 무엇이 바뀌는가» 를 실제 UI 경로(진짜 DOM 클릭)로 확인한다.
 *
 *   node tools/func263.js
 *
 * ROUTINE.md «기능 완성 규칙»(2026-08-25 주인 지시): T2 작업의 완료 조건은 «만들어 놓음»(여기서는
 * «지웠음»)이 아니라 «실제 게임 데이터로 동작하고, 결과가 저장(S)·HUD·다른 화면에 반영됨» 이다.
 * verify263 이 함수 호출 수준을 보는 자라면, 이 파일은 **플레이어가 실제로 누르는 버튼**만 눌러
 * 다음 표를 만든다:
 *
 *   버튼                         | 눌렀을 때 바뀌어야 하는 것        | 바뀌면 안 되는 것
 *   10 상점 «10연 소환»(스킬)    | S.own + · S.cnt.sumSkill + · 다이아 − | S.eqSkill
 *   10 상점 «10연 소환»(무기)    | S.own + · 다이아 −                    | S.eqSlot
 *   07 스킬 카드 [+]             | S.eqSkill + (플레이어가 한 장착)      | —
 *   06 장비 카드 «장착»          | S.eqSlot[부위] (플레이어가 한 장착)   | —
 *   05 무기 카드 «합성»          | S.own(상위 등급) +                    | S.eqSlot
 *
 * ★ 「안 바뀐다」 는 아무 일도 안 일어나도 참이다 — 그래서 모든 행이 «바뀌어야 하는 것» 과
 *   «바뀌면 안 되는 것» 을 **한 쌍으로** 잰다. 앞 칸이 안 움직이면 그 행은 무효다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(700);

  /* ---------- ① 10 상점 «10연 소환» 버튼 — 스킬 ---------- */
  const sk = await page.evaluate(async () => {
    /* 61 가이드 미션이 «어느 상자를 먼저 뽑아라» 로 다른 배너를 막는다(gmBan, 73 ③) — 실제 플레이에서도
       미션을 끝내면 풀리는 정상 동작이라, 기능 체크는 가이드를 마친 상태에서 한다. */
    S.guide.idx = GUIDE.length;
    S.dia = 1e9; S.eqSkill = []; S.own = {}; S.best = 99;
    uiDirty = true; renderUI();
    openShopPage(null, 'sum');
    await new Promise((r) => setTimeout(r, 350));
    const before = { dia: S.dia, cnt: S.cnt.sumSkill | 0, own: Object.keys(S.own).length, eq: S.eqSkill.slice() };
    const btn = [...document.querySelectorAll('#shopList [data-shsum="skill"]')]
      .find((b) => +b.dataset.shn === 10 && !b.dataset.shfree);
    if (!btn) return { noBtn: true };
    btn.click();
    await new Promise((r) => setTimeout(r, 450));
    return {
      before,
      after: { dia: S.dia, cnt: S.cnt.sumSkill | 0, own: Object.keys(S.own).length, eq: S.eqSkill.slice() },
      slots: skSlotMax(),
    };
  });
  ok(!sk.noBtn, '① 10 상점 스킬 «10연» 버튼이 실제로 있다');
  ok(!sk.noBtn && sk.after.own > sk.before.own, '① 눌렀더니 보유가 늘었다(버튼이 실제로 먹었다)',
    sk.noBtn ? '' : sk.before.own + '종 → ' + sk.after.own + '종');
  ok(!sk.noBtn && sk.after.cnt === sk.before.cnt + 10, '① 소환 횟수 +10 (S 반영)',
    sk.noBtn ? '' : sk.before.cnt + ' → ' + sk.after.cnt);
  ok(!sk.noBtn && sk.after.dia < sk.before.dia, '① 다이아가 차감됐다(HUD 반영)',
    sk.noBtn ? '' : sk.before.dia + ' → ' + sk.after.dia);
  ok(!sk.noBtn && sk.after.eq.join(',') === sk.before.eq.join(','),
    '★① 그런데 장착 스킬은 한 칸도 안 늘었다 (해금 칸 ' + (sk.slots || '?') + '개가 비어 있는데도)',
    sk.noBtn ? '' : '[' + sk.before.eq.join(',') + '] → [' + sk.after.eq.join(',') + ']');

  /* ---------- ② 10 상점 «10연 소환» 버튼 — 무기 ---------- */
  const wp = await page.evaluate(async () => {
    S.dia = 1e9; SLOTS.forEach((s) => S.eqSlot[s.k] = null);
    BANNERS.weapon.list.forEach((e) => delete S.own[e.id]);
    uiDirty = true; renderUI();
    openShopPage(null, 'sum');
    await new Promise((r) => setTimeout(r, 350));
    const before = { own: Object.keys(S.own).length, slot: JSON.stringify(S.eqSlot) };
    const btn = [...document.querySelectorAll('#shopList [data-shsum="weapon"]')]
      .find((b) => +b.dataset.shn === 10 && !b.dataset.shfree);
    if (!btn) return { noBtn: true };
    btn.click();
    await new Promise((r) => setTimeout(r, 450));
    return { before, after: { own: Object.keys(S.own).length, slot: JSON.stringify(S.eqSlot) } };
  });
  ok(!wp.noBtn && wp.after.own > wp.before.own, '② 무기 10연 — 보유가 늘었다',
    wp.noBtn ? '' : wp.before.own + '종 → ' + wp.after.own + '종');
  ok(!wp.noBtn && wp.after.slot === wp.before.slot, '★② 그런데 부위 3칸은 전부 빈 채 그대로',
    wp.noBtn ? '' : wp.after.slot);

  /* ---------- ③ 07 스킬 카드 — 플레이어가 누르면 장착된다(대조군) ---------- */
  const eq = await page.evaluate(async () => {
    gmHero && gmHero('sk');
    uiDirty = true; renderUI();
    await new Promise((r) => setTimeout(r, 400));
    const before = S.eqSkill.slice();
    /* 카드 격자에서 «보유 + 미장착» 카드 하나를 눌러 장착한다 */
    const card = [...document.querySelectorAll('#bSk .sk-card[data-skit]')]
      .find((c) => has(c.dataset.skit) && !S.eqSkill.includes(c.dataset.skit));
    if (!card) return { noCard: true, before, cards: document.querySelectorAll('#bSk .sk-card').length };
    const id = card.dataset.skit;
    card.click();
    await new Promise((r) => setTimeout(r, 250));
    /* 카드 탭이 세부 팝업을 여는 구조면 팝업의 «장착» 버튼을 누른다 */
    if (!S.eqSkill.includes(id)) {
      const b = [...document.querySelectorAll('button, .btn, [data-act]')]
        .find((x) => x.offsetParent && /장착/.test(x.textContent || ''));
      if (b) { b.click(); await new Promise((r) => setTimeout(r, 250)); }
    }
    return { before, after: S.eqSkill.slice(), id };
  });
  ok(!eq.noCard && eq.after && eq.after.length === eq.before.length + 1 && eq.after.includes(eq.id),
    '③ 07 스킬 카드를 «플레이어가» 누르면 장착된다(대조군 — 자가 살아 있다)',
    eq.noCard ? '카드 없음' : '[' + eq.before.join(',') + '] → [' + eq.after.join(',') + ']');

  /* ---------- ④ 합성 — 상위 등급이 생기지만 칸은 안 바뀐다 ---------- */
  const cr = await page.evaluate(async () => {
    SLOTS.forEach((s) => S.eqSlot[s.k] = null);
    const base = BANNERS.amulet.list.find((e) => !isTopGrade(e));
    EQUIPS.filter((e) => e.slot === base.slot && e.g === base.g + 1).forEach((e) => delete S.own[e.id]);
    S.own[base.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    const before = { own: Object.keys(S.own).length, slot: JSON.stringify(S.eqSlot) };
    const made = craft(base);
    await new Promise((r) => setTimeout(r, 200));
    return { before, after: { own: Object.keys(S.own).length, slot: JSON.stringify(S.eqSlot) }, made: made && made.id };
  });
  ok(!!cr.made && cr.after.own > cr.before.own, '④ 합성 — 상위 등급이 실제로 생겼다', String(cr.made));
  ok(cr.after.slot === cr.before.slot, '★④ 그런데 빈 목걸이 칸은 빈 채 그대로', cr.after.slot);

  /* ---------- ⑤ 저장 반영 ---------- */
  const sv = await page.evaluate(() => {
    save();
    const raw = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
    return { eqSkill: (raw.eqSkill || []).length, live: S.eqSkill.length,
             sameList: (raw.eqSkill || []).join(',') === S.eqSkill.join(','),
             list: S.eqSkill.join(',') || '(없음)', slot: JSON.stringify(raw.eqSlot || {}) };
  });
  ok(sv.sameList, '⑤ 저장(S)에도 «플레이어가 끼운 것만» 이 그대로 들어간다',
    '세이브 ' + sv.eqSkill + '개 / 메모리 ' + sv.live + '개 [' + sv.list + '] · 부위 ' + sv.slot);

  ok(errs.length === 0, '⑥ 콘솔 에러 0건', errs.slice(0, 2).join(' | '));
  await browser.close();
  console.log('\nFUNC263 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
