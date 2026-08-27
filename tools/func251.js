#!/usr/bin/env node
/* 251 기능 체크 — «눌렀을 때 무엇이 바뀌는가» 를 실제 UI 경로로 확인한다.
 *
 *   node tools/func251.js
 *
 * ROUTINE.md «기능 완성 규칙»(2026-08-25 주인 지시): T2 작업의 완료 조건은 «만들어 놓음» 이 아니라
 * «실제 게임 데이터로 동작하고, 결과가 저장(S)·HUD·다른 화면에 반영됨» 이다.
 * 그래서 게이트(verify251)와 별개로 **버튼을 실제로 눌러** 다음을 본다:
 *   ① 10 상점 소환 탭 «10연» 버튼 → 12 결과 팝업 수량 합 10 · `S.own` 증가 · `S.cnt.sumEquip` +10
 *      · 다이아 차감(HUD) · localStorage 저장
 *   ② 상자 카드의 «ⓘ» → 11 확률 팝업이 **차등된** 행 %를 보여 준다(등급 안이 더 이상 같은 값이 아니다)
 *   ③ 대량 소환 후 보유 분포가 «약한 티어가 더 적다» 를 실제로 만족한다(등급 하나를 표본으로)
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
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(700);

  /* ① 실제 «10연» 버튼 클릭 */
  const one = await page.evaluate(async () => {
    /* 61 가이드 미션이 «어느 상자를 먼저 뽑아라» 로 다른 배너를 막는다(gmBan) — 실제 플레이에서도
       그 미션을 끝내면 풀리는 정상 동작이라, 기능 체크는 가이드를 마친 상태에서 한다. */
    S.guide.idx = GUIDE.length;
    S.dia = 1e6; S.sum.weapon.lv = SUM_MAXLV; uiDirty = true; renderUI();
    openShopPage(null, 'sum');
    await new Promise(r => setTimeout(r, 300));
    const before = { dia: S.dia, cnt: S.cnt.sumEquip | 0, own: Object.keys(S.own).length };
    /* 무료분이 아닌 «유료 10연» 버튼을 고른다(무료 버튼은 data-shfree 가 붙어 있다) */
    const btn = [...document.querySelectorAll('#shopList [data-shsum="weapon"]')]
      .find(b => +b.dataset.shn === 10 && !b.dataset.shfree);
    if (!btn) return { noBtn: true };
    btn.click();
    await new Promise(r => setTimeout(r, 400));
    /* 12 결과 팝업은 같은 종을 **개수로 합쳐** 보여 준다(187·252) — 칸 수가 아니라
       배지 수량의 합이 10 이어야 한다. */
    const cards = document.querySelectorAll('#sumw .sm-c').length;
    const qty = [...document.querySelectorAll('#sumw .sm-c .sm-fat')]
      .reduce((a, e) => a + (+e.textContent || 0), 0);
    const shown = document.getElementById('sumw') && document.getElementById('sumw').classList.contains('on');
    const saved = !!localStorage.getItem(KEY);
    return { noBtn: false, before, dia: S.dia, cnt: S.cnt.sumEquip | 0,
             own: Object.keys(S.own).length, shown, cards, qty, saved,
             hud: (document.querySelector('#top') || {}).textContent ? true : false };
  });
  ok(!one.noBtn, '① 10 상점 소환 탭에 무기 «10연» 버튼이 있다');
  if (!one.noBtn) {
    ok(one.cnt === one.before.cnt + 10, '① 10연 → S.cnt.sumEquip +10',
       one.before.cnt + ' → ' + one.cnt);
    ok(one.dia === one.before.dia - 1000, '① 다이아 1,000 차감(73 규격 · HUD 재화)',
       one.before.dia + ' → ' + one.dia);
    ok(one.own > one.before.own, '① 새 종이 S.own 에 들어간다',
       one.before.own + ' → ' + one.own + '종');
    ok(one.shown, '① 12 소환 결과 팝업이 뜬다');
    ok(one.qty === 10, '① 결과 팝업 수량 합 = 10 (같은 종은 개수로 합쳐진다)',
       one.cards + '칸 · 합 ' + one.qty);
    ok(one.saved, '① localStorage 저장됨', String(one.saved));
  }

  /* ② 상자 «ⓘ» → 11 확률 팝업이 차등된 값을 보인다 */
  const two = await page.evaluate(async () => {
    const info = document.querySelector('#shopList [data-shinfo="weapon"]');
    if (info) info.click();
    else openProbInfo('weapon', SUM_MAXLV);
    await new Promise(r => setTimeout(r, 250));
    const on = document.getElementById('prbw').classList.contains('on');
    /* 첫 등급 묶음(맨 위 = 가장 높은 등급) 바로 아래 5행을 읽어 «서로 다른 값» 인지 본다 */
    const pcs = [...document.querySelectorAll('#prbList .prb-row .pc')].map(e => e.textContent.trim());
    /* 일반 등급(맨 아래 5행)이 등비로 벌어졌는지 — 양 끝 비가 TIER_W_RATIO 여야 한다 */
    const tail = pcs.slice(-5).map(v => parseFloat(v));
    const ratio = tail.length === 5 ? tail[4] / tail[0] : 0;
    closeProbInfo();
    return { on, n: pcs.length, uniq: new Set(pcs).size, ratio, tail };
  });
  ok(two.on, '② 상자 ⓘ → 11 확률 팝업이 열린다');
  ok(two.uniq > 1, '② 행 % 가 더 이상 등급 안에서 한 값이 아니다', two.uniq + '종 값 / ' + two.n + '행');
  ok(Math.abs(two.ratio - 2) < 1e-3, '② 일반 등급 5행의 양 끝 비 = 2.0 (TIER_W_RATIO)',
     two.tail.join(' / ') + ' → ' + two.ratio.toFixed(4));

  /* ③ 대량 소환 뒤 보유 «개수» 분포가 요구를 만족
     ⚠ 여기는 난수를 고정하지 않은 **실제 플레이 경로**라 판정을 통계적으로 잡는다 —
        인접 칸 기대 비가 2^(1/4) = 1.19 뿐이라 «전 칸 엄격 오름차순» 을 걸면 뜨고 지는 게이트가 된다.
        고정 난수 아래의 엄격 판정은 `verify251` [C2] 가 맡는다. */
  const three = await page.evaluate(async () => {
    S.guide.idx = GUIDE.length;
    S.dia = 1e9; S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
    for (let i = 0; i < 100; i++) doSummon('weapon', 30);   /* 3,000 회 */
    const pool = BANNERS.weapon.list.filter(x => x.g === 2);   /* 희귀 — 표본이 가장 두껍다 */
    const cnt = pool.map(it => (S.own[it.id] ? S.own[it.id].n + 1 : 0));
    let inv = 0;
    for (let i = 1; i < cnt.length; i++) if (cnt[i] < cnt[i - 1]) inv++;
    return { pool: pool.map(p => p.n), cnt, inv, ends: cnt[cnt.length - 1] / Math.max(1, cnt[0]),
             tot: cnt.reduce((a, c) => a + c, 0) };
  });
  three.pool.forEach((n, i) => console.log('     ' + String(three.cnt[i]).padStart(4) + '  ' + n));
  ok(three.inv <= 1, '③ 3,000연 뒤 희귀 등급 보유 개수가 배열(약→강) 추세 (역전 ≤1)',
     three.cnt.join(' → ') + ' (역전 ' + three.inv + ' · 합 ' + three.tot + ')');
  ok(three.ends > 1.4, '③ 최강 티어 / 최약 티어 보유 비 > 1.4 (기대 2.0)', three.ends.toFixed(2));

  ok(errs.length === 0, '④ 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');
  await browser.close();
  console.log('\nFUNC251 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
