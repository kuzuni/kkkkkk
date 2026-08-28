#!/usr/bin/env node
/* 게이트 — 작업 365 「13 재화 탭 광고 상품 라인업 개편 — 보석·유물·스킨 강화석·단련석 4종」
 *          + 작업 366 「전 상품 일일 수령 5회」 (저장소 주인 지시 2026-08-29, 한 벌)
 *
 *   node tools/verify365.js
 *
 * 원문 ① «광고상품에 보석, 유물, 스킨강화석, 단련석 넣고 실제로 안쓰는거들은 없애기»
 *      ② «광고 상품들 하루 5번 얻을수있게 하기»
 *
 * 지키는 성질 — **네 상품이 실제로 그 재화를 주고, 하루 5회까지 되고, 자정에 되돌아온다.**
 *   [A] 라인업 — 정확히 4종 · 보상 키가 dia/rel/stone/tstone 각 하나 · 지운 축(goldMul·freePet)이 0
 *   [B] 366 — 전 상품 cap 5 · 버튼 표기가 «(5/5)»
 *   [C] 실동작(기능 완성 규칙) — 네 칸을 **진짜로 클릭**해 그 재화만 정확히 +q 오르고 표기가 (4/5) 가 된다
 *   [D] 5회까지 — 다섯 번 눌리고 여섯 번째는 «구매 완료» 로 잠긴다(cap 이 5 가 아니면 여기서 갈린다)
 *   [E] 자정 리셋 — 날짜가 바뀌면 다시 5/5 · 닷 재점등(`adLeft` 폴백 경로)
 *   [F] 격자 — 4칸이 **2열 2행**(x256/546 · y pitch 319) · 칸 규격 278×309 불변 · 겹침 0 ·
 *       아래 §6 배너(`.cn-a2t`)·§7 리본 좌표가 6칸 시절과 같다(«행 수가 그대로라 안 밀린다» 를 못박는다)
 *   [G] 세이브 이관 — 구 세이브(a1~a6 수령 기록)를 열면 죽은 키(a3~a6)가 정리되고,
 *       새 상품 두 칸은 **구 상품의 소진을 물려받지 않는다**(id 재사용 금지의 이유)
 *   [H] 콘솔 에러 0
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM/재화» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

const open = async (ctx, errs) => {
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return page;
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 5000, best: 30 })]);
  const page = await open(ctx, errs);
  await page.evaluate(() => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await page.waitForTimeout(600);

  /* ══ [A] 라인업 ═══════════════════════════════════════════════════════════ */
  const lineup = await page.evaluate(() => COIN_ADS.map(a => ({
    id: a.id, n: a.n, q: a.q, cap: a.cap, keys: Object.keys(a.r), val: a.r[Object.keys(a.r)[0]] })));
  console.log('  라인업: ' + lineup.map(a => a.id + ' ' + a.n + ' ' + a.q + ' ' + a.keys.join('+') + ' cap' + a.cap).join(' | '));
  ok(lineup.length === 4, '[A] 광고 상품이 정확히 4종', lineup.length + '종');
  const keys = lineup.map(a => a.keys.join('+')).sort().join(',');
  ok(keys === 'dia,rel,stone,tstone', '[A] 보상 키가 보석·유물·스킨 강화석·단련석 각 하나 (주인 지시 목록 그대로)', keys);
  ok(lineup.every(a => a.keys.length === 1), '[A] 한 칸은 한 재화만 준다(섞인 보상 없음)');
  ok(!lineup.some(a => a.keys[0] === 'goldMul' || a.keys[0] === 'freePet'),
    '[A] 지운 축 — 골드 상자(goldMul)·펫 소환 열쇠(freePet) 가 0개 («실제로 안 쓰는거들은 없애기»)');
  ok(lineup.filter(a => a.keys[0] === 'rel').length === 1,
    '[A] 유물조각을 주는 칸이 **하나뿐**이다(구 a2·a4·a5 셋이 같은 재화였던 것이 정리됐다)',
    lineup.filter(a => a.keys[0] === 'rel').length + '칸');
  ok(new Set(lineup.map(a => a.id)).size === 4, '[A] id 중복 0');

  /* ══ [B] 366 — cap 5 ═════════════════════════════════════════════════════ */
  ok(lineup.every(a => a.cap === 5), '[B] 366 — 전 상품 cap 5',
    lineup.map(a => a.cap).join('/'));
  const cnts = await page.evaluate(() =>
    [...document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad] .cnt')].map(u => u.textContent));
  ok(cnts.length === 4 && cnts.every(t => t === '(5/5)'), '[B] 버튼 표기가 «(5/5)»', cnts.join(' '));

  /* ══ [C] 실동작 — 네 칸을 진짜로 클릭 ══════════════════════════════════════ */
  const CUR = { dia: 'dia', rel: 'relic', stone: 'stone', tstone: 'tstone' };
  for (const a of lineup) {
    const k = a.keys[0], f = CUR[k];
    const before = await page.evaluate(f2 => ({ v: S[f2], all: { dia: S.dia, relic: S.relic, stone: S.stone, tstone: S.tstone } }), f);
    await page.locator('#shopList .cn-cd>.bt[data-cnad="' + a.id + '"]').click();
    await page.waitForTimeout(450);
    const after = await page.evaluate(([f2, id]) => {
      const bt = document.querySelector('#shopList .cn-cd>.bt[data-cnad="' + id + '"]');
      return { v: S[f2], all: { dia: S.dia, relic: S.relic, stone: S.stone, tstone: S.tstone },
               left: adLeft(COIN_ADS.find(x => x.id === id)),
               txt: bt ? bt.querySelector('.cnt').textContent : null };
    }, [f, a.id]);
    ok(Math.round(after.v - before.v) === a.val,
      '[C] ' + a.n + ' — 클릭하면 ' + k + ' 가 정확히 +' + a.val, Math.round(after.v - before.v) + ' 증가');
    const others = Object.keys(before.all).filter(x => x !== f)
      .filter(x => Math.abs(after.all[x] - before.all[x]) > 1e-9);
    ok(others.length === 0, '[C] ' + a.n + ' — 다른 재화는 안 움직인다', others.join(',') || '없음');
    ok(after.left === 4 && after.txt === '(4/5)', '[C] ' + a.n + ' — 남은 횟수 5 → 4 · 표기 (4/5)',
      after.left + ' · ' + after.txt);
  }

  /* ══ [D] 5회까지 ═════════════════════════════════════════════════════════ */
  const first = lineup[0];
  for (let i = 0; i < 4; i++) {                       /* [C] 에서 1회 썼으니 4회 더 = 합계 5회 */
    await page.locator('#shopList .cn-cd>.bt[data-cnad="' + first.id + '"]').click();
    await page.waitForTimeout(280);
  }
  const spent = await page.evaluate(id => {
    const cd = [...document.querySelectorAll('#shopList .cn-cd')].find(c => c.dataset.__ || true);
    return { left: adLeft(COIN_ADS.find(x => x.id === id)),
             btn: !!document.querySelector('#shopList .cn-cd>.bt[data-cnad="' + id + '"]'),
             doneCards: [...document.querySelectorAll('#shopList .cn-cd.done')].length,
             dots: [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length)
                     .reduce((s, c) => s + (c.classList.contains('done') ? c.querySelectorAll('.updot').length : 0), 0) };
  }, first.id);
  ok(spent.left === 0 && spent.btn === false,
    '[D] 366 — 다섯 번 눌리고 그 뒤로는 «구매 완료» (cap 이 5 가 아니면 여기서 갈린다)',
    '남은 ' + spent.left + ' · 버튼 ' + spent.btn);
  ok(spent.doneCards === 1 && spent.dots === 0, '[D] 소진 칸은 잠기고 죽은 닷 노드가 안 남는다',
    '잠김 ' + spent.doneCards + '칸 · 죽은 닷 ' + spent.dots);
  const over = await page.evaluate(id => {
    const a = COIN_ADS.find(x => x.id === id), b = S.dia;
    document.dispatchEvent(new Event('x'));            /* 버튼이 없으니 직접 재확인만 한다 */
    return { left: adLeft(a), dia: b };
  }, first.id);
  ok(over.left === 0, '[D] 여섯 번째는 없다 — 남은 횟수 0 에서 더 안 내려간다', String(over.left));

  /* ══ [E] 자정 리셋 ═══════════════════════════════════════════════════════ */
  const reset = await page.evaluate(() => {
    S.daily.date = '1999-1-1'; dailyCheck(); openShopPage(null, 'coin');
    return { keys: Object.keys(S.daily.adBuy || {}).length,
             lefts: COIN_ADS.map(a => adLeft(a)),
             txt: [...document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad] .cnt')].map(u => u.textContent),
             alerts: [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length)
                       .filter(c => c.classList.contains('alert')).length };
  });
  ok(reset.keys === 0 && reset.lefts.every(v => v === 5),
    '[E] 자정 리셋 — 수령 기록이 비고 전부 5회로 되돌아온다', reset.lefts.join('/'));
  ok(reset.txt.every(t => t === '(5/5)') && reset.alerts === 4,
    '[E] 리셋 뒤 표기 (5/5) · 레드닷 4칸 재점등', reset.txt.join(' ') + ' · 닷 ' + reset.alerts);

  /* ══ [F] 격자 — 2열 2행 ══════════════════════════════════════════════════ */
  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length);
    const g = cards.map(c => [c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight]);
    const bn = document.querySelector('#shopList .cn-a2t'), rb = document.querySelector('#shopList #cnDiaRb');
    let overlap = 0;
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j];
      if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) overlap++;
    }
    return { g, overlap, bn: bn ? bn.offsetTop : null, rb: rb ? rb.offsetTop : null,
             wrapW: document.querySelector('#shopList .cn-wrap').offsetWidth };
  });
  const xs = [...new Set(grid.g.map(r => r[0]))].sort((a, b) => a - b);
  const ys = [...new Set(grid.g.map(r => r[1]))].sort((a, b) => a - b);
  ok(xs.length === 2 && ys.length === 2, '[F] 2열 2행 (빈 칸 없이 — 지시 ③)',
    '열 ' + xs.join(',') + ' · 행 ' + ys.join(','));
  ok(xs.join(',') === '256,546', '[F] 열 x256/546 — pitch 290 유지 · 프레임 중심 540 에 대칭 (256+546+278)/2', xs.join(','));
  ok(ys[1] - ys[0] === 319, '[F] 행 pitch 319 유지', String(ys[1] - ys[0]));
  ok(grid.g.every(r => r[2] === 278 && r[3] === 309), '[F] 칸 규격 278×309 불변',
    grid.g.map(r => r[2] + 'x' + r[3]).join(' '));
  ok((xs[0] + xs[1] + 278) / 2 === grid.wrapW / 2, '[F] 격자가 화면 가로 중앙에 온다',
    (xs[0] + xs[1] + 278) / 2 + ' vs ' + grid.wrapW / 2);
  ok(grid.overlap === 0, '[F] 칸끼리 겹침 0', grid.overlap + '건');
  /* 값의 출처는 CSS 원본이다 — `.cn-a2t{top:1404px}`(index.html 6021) · `#cnDiaRb` 는 렌더가
     인라인으로 박는 `top:1698px`. 둘 다 6칸 시절 커밋과 **글자 그대로 같다**(git show 로 대조). */
  ok(grid.bn === 1404 && grid.rb === 1698,
    '[F] 아래 §6 배너·§7 리본 좌표 불변 — 6칸도 4칸도 «2행» 이라 아래가 안 밀린다',
    '배너 ' + grid.bn + ' · 리본 ' + grid.rb);

  ok(errs.length === 0, '[H] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));
  await page.close();

  /* ══ [G] 세이브 이관 — 구 세이브를 열어 본다 ═══════════════════════════════ */
  const errs2 = [];
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const t = new Date();
  const todayStr = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
  await ctx2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 5000, best: 30,
      /* 구 세이브 — 오늘 골드 상자(a3)·펫 열쇠(a6)까지 다 받은 사람 */
      daily: { date: todayStr, adBuy: { a1: 0, a2: 1, a3: 0, a4: 0, a5: 1, a6: 0 } } })]);
  const page2 = await open(ctx2, errs2);
  const mig = await page2.evaluate(() => {
    openShopPage(null, 'coin');
    return { keys: Object.keys(S.daily.adBuy).sort(),
             lefts: COIN_ADS.map(a => a.id + ':' + adLeft(a)),
             saved: Object.keys(JSON.parse(localStorage.getItem('idle_hunter_save_v4')).daily.adBuy || {}).sort() };
  });
  ok(mig.keys.join(',') === 'a1,a2', '[G] 죽은 키(a3~a6)가 정리된다 — 남는 것은 살아 있는 상품뿐',
    mig.keys.join(',') || '없음');
  ok(mig.lefts.join(' ') === 'a1:0 a2:1 a7:5 a8:5',
    '[G] 살아 있는 두 칸은 오늘 기록을 그대로 잇고, **새 두 칸은 구 상품의 소진을 안 물려받는다**',
    mig.lefts.join(' '));
  ok(errs2.length === 0, '[G] 구 세이브 로드 콘솔 에러 0건', errs2.slice(0, 3).join(' | '));

  console.log('\nVERIFY365 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
