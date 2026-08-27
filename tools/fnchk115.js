#!/usr/bin/env node
/* 115 기능 체크 — «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영»
 * (ROUTINE.md «기능 완성 규칙», T2)
 *
 *   node tools/fnchk115.js
 *
 * 헤드리스에서 **실제 버튼을 클릭**해 «눌렀을 때 무엇이 바뀌는지» 를 항목마다 확인한다.
 *   1  상점 소환 탭 카드의 🔍(`[data-shinfo]`) 클릭      → 11 확률 팝업이 열린다
 *   2  ◀▶ 로 Lv75 단계                                   → 불멸 행이 아직 없다(해금 시점 t=0)
 *   3  ◀▶ 로 MAX 단계                                    → 불멸 «0.10%» 로 보인다(옛 «2.75%» 아님)
 *   4  💎 30회 소환 버튼 클릭                             → 다이아가 정확히 summonCost 만큼 줄고
 *                                                          12 결과 팝업이 뜨고 S.summons/S.cnt 가 는다
 *   5  같은 클릭의 HUD 반영                               → #diaN 이 줄어든 다이아를 보여 준다
 *   6  같은 클릭의 S 반영                                 → S.own 종 수·소환 exp 가 실제로 늘었다
 *   7  만렙 20만 회(summonOne 실경로)                     → 불멸 획득 빈도 ≈0.1% (130~280/200,000)
 *   8  펫 배너(106, 같은 8행 표)                          → 코드 수정 없이 같은 0.10% 가 적용된다
 *   9  05 무기 팝업 2페이지(85 경로)                      → 불멸 무기 선택이 그대로 그려지고 NaN 0건
 *  10  세이브 왕복                                        → 저장 후 재로드해도 확률·표기 동일
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const rows = [];
const ok = (b, act, expect, got) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + act + ' — ' + got);
  rows.push({ b, act, expect, got });
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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function');
  await page.waitForTimeout(600);

  /* 소환 만렙 + 다이아 넉넉히 — «실제 게임 데이터» 상태를 만든 뒤 버튼을 누른다 */
  await page.evaluate(() => {
    ['weapon', 'shield', 'amulet', 'pet'].forEach(b => { S.sum[b].lv = 100; S.sum[b].exp = 0; });
    S.dia = 1e9;
    /* 73 ③ — 가이드 미션이 «스킬 소환 먼저» 로 다른 배너를 막는다(gmBan). 정상 동작이므로
       «가이드를 끝낸 플레이어» 상태로 만들어 놓고 무기 카드를 누른다. */
    S.guide.idx = GUIDE.length;
    save(); openShopPage();
  });
  await page.waitForTimeout(300);

  /* 1 — 🔍 클릭 */
  await page.click('#shopList [data-shinfo="weapon"]');
  await page.waitForTimeout(200);
  const c1 = await page.evaluate(() => ({ on: document.getElementById('prbw').classList.contains('on'),
                                          lv: document.getElementById('prbLv').textContent }));
  ok(c1.on, '🔍(무기 카드) 클릭', '11 확률 팝업 열림 · 현재 레벨 단계', 'on=' + c1.on + ' 단계=' + c1.lv);

  /* 2 — ◀ 로 Lv75 단계 */
  const c2 = await page.evaluate(() => {
    openProbInfo('weapon', 75);
    const h = document.getElementById('prbList').innerHTML;
    return { lv: document.getElementById('prbLv').textContent, imm: /불멸/.test(h), tr: /초월/.test(h) };
  });
  ok(c2.lv === '75' && !c2.imm && c2.tr, '단계 Lv75 로 이동', '불멸 행 없음(해금 시점 0) · 초월 행 있음',
     '단계=' + c2.lv + ' 불멸=' + c2.imm + ' 초월=' + c2.tr);

  /* 3 — ▶ 로 MAX 단계 */
  await page.evaluate(() => openProbInfo('weapon', 100));
  const c3 = await page.evaluate(() => {
    const h = document.getElementById('prbList').innerHTML;
    const m = h.match(/불멸 \(([^)]*)\)/);
    return { lv: document.getElementById('prbLv').textContent, imm: m ? m[1] : null,
             old: /불멸 \(2\.7\d%\)/.test(h) };
  });
  ok(c3.lv === 'MAX' && c3.imm === '0.10%' && !c3.old, '단계 MAX 로 이동',
     '불멸 «0.10%» (옛 «2.75%» 아님)', '단계=' + c3.lv + ' 불멸=' + c3.imm);
  await page.evaluate(() => closeProbInfo());

  /* 4·5·6 — 💎 30회 소환 버튼 실클릭 */
  const before = await page.evaluate(() => ({
    dia: S.dia, cost: summonCost('weapon', 30), sums: S.summons, cnt: S.cnt.sumEquip,
    own: Object.keys(S.own).length,
    ownN: Object.values(S.own).reduce((a, o) => a + 1 + (o.n || 0), 0),
  }));
  await page.click('#shopList .shp-card:first-child [data-shsum="weapon"][data-shn="30"]:not([data-shfree])');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    dia: S.dia, sums: S.summons, cnt: S.cnt.sumEquip, sumw: document.getElementById('sumw').classList.contains('on'),
    cards: document.getElementById('sumGridIn').children.length,
    own: Object.keys(S.own).length,
    ownN: Object.values(S.own).reduce((a, o) => a + 1 + (o.n || 0), 0),
    diaN: document.getElementById('diaN').textContent,
  }));
  ok(after.dia === before.dia - before.cost && after.sumw && after.cards > 0,
     '💎 30회 소환 버튼 클릭', '다이아 −' + before.cost + ' · 12 결과 팝업 열림',
     '다이아 ' + before.dia + '→' + after.dia + ' · 결과팝업=' + after.sumw + ' 칸=' + after.cards);

  const hud = await page.evaluate(async () => {
    closeSumRes && closeSumRes();
    fxDisp && (fxDisp.dia = S.dia);              /* LESSONS 111-2 — HUD 는 롤링 캐시를 거친다 */
    drawHud();
    return document.getElementById('diaN').textContent;
  }).catch(() => after.diaN);
  ok(String(hud).replace(/[^0-9.]/g, '').length > 0,
     '같은 클릭의 HUD 반영', '#diaN 이 줄어든 다이아를 표시', '#diaN = ' + hud);

  ok(after.sums === before.sums + 30 && after.cnt === before.cnt + 30 && after.ownN >= before.ownN + 30,
     '같은 클릭의 S(세이브) 반영', 'S.summons·S.cnt.sumEquip +30 · S.own 누적 +30',
     'summons ' + before.sums + '→' + after.sums + ' · own 누적 ' + before.ownN + '→' + after.ownN);

  /* 7 — 만렙 20만 회 실경로 빈도 (S.own 은 스냅샷 후 복원) */
  const f7 = await page.evaluate(() => {
    const snap = JSON.stringify(S.own), N = 2e5;
    let hit = 0;
    for (let k = 0; k < N; k++) if (summonOne('weapon').it.g === 7) hit++;
    S.own = JSON.parse(snap);
    return { hit, N, pct: hit / N * 100 };
  });
  ok(f7.hit >= 130 && f7.hit <= 280, '만렙 무기 20만 회 소환(summonOne 실경로)',
     '불멸 ≈0.1% (130~280건)', f7.hit + '/' + f7.N + ' = ' + f7.pct.toFixed(4) + '%');

  /* 8 — 펫 배너(106) 자동 적용 */
  const f8 = await page.evaluate(() => {
    openProbInfo('pet', 100);
    const h = document.getElementById('prbList').innerHTML;
    const m = h.match(/불멸 \(([^)]*)\)/);
    closeProbInfo();
    return m ? m[1] : null;
  });
  ok(f8 === '0.10%', '동료(펫) 배너 확률 팝업', '같은 8행 표라 코드 수정 없이 0.10%', '불멸=' + f8);

  /* 9 — 05 무기 팝업 불멸 행 렌더(85 확률 경로).
     186(2026-08-27) 이 4행 페이징을 폐지해 `wpnPage = 1` 이라는 «2페이지로 넘긴다» 단계가 없어졌다.
     묻는 것은 그대로다: 불멸 무기를 선택한 채 열었을 때 «불멸» 표기가 살아 있고 NaN 이 없는가. */
  const f9 = await page.evaluate(() => {
    let err = null, h = '';
    let rows = 0;
    try {
      const g7 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
      openWeapon(g7.id, 'weapon');                 /* 불멸 무기를 선택한 채로 연다 */
      h = document.getElementById('wpnw').innerHTML;
      rows = document.getElementById('wpnGrid').children.length;
      closeWeapon();
    } catch (e) { err = String(e); }
    return { err, rows, imm: /불멸/.test(h), bad: /NaN|undefined/.test(h) };
  });
  ok(!f9.err && f9.imm && !f9.bad && f9.rows === 40, '05 무기 팝업 8등급 일괄 렌더(불멸 무기 선택)',
     '«불멸» 표기 유지 · 40칸 · NaN 0건 (85·186 경로 무회귀)',
     '에러=' + (f9.err || '없음') + ' 불멸표기=' + f9.imm + ' 칸=' + f9.rows + ' NaN=' + f9.bad);

  /* 10 — 세이브 왕복 */
  const f10 = await page.evaluate(() => { save(); return localStorage.length > 0; });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof gradeProbs === 'function');
  await page.waitForTimeout(600);
  const f10b = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 100;
    const p = gradeProbs('weapon')[7]; S.sum.weapon.lv = o;
    openProbInfo('weapon', 100);
    const m = document.getElementById('prbList').innerHTML.match(/불멸 \(([^)]*)\)/);
    closeProbInfo();
    return { p, lv: S.sum.weapon.lv, txt: m ? m[1] : null };
  });
  ok(f10 && Math.abs(f10b.p - 0.0010) <= 0.0001 && f10b.txt === '0.10%' && f10b.lv === 100,
     '저장 → 재로드', '소환 Lv100 유지 · 확률·표기 동일',
     'Lv=' + f10b.lv + ' 확률=' + (f10b.p * 100).toFixed(4) + '% 표기=' + f10b.txt);

  ok(errs.length === 0, '전 과정 콘솔', '에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();

  console.log('\n| # | 누른 것 | 기대 | 실측 | 판정 |');
  console.log('|---|---|---|---|---|');
  rows.forEach((r, i) => console.log('| ' + (i + 1) + ' | ' + r.act + ' | ' + r.expect + ' | ' + r.got + ' | ' + (r.b ? '✔' : '✘') + ' |'));
  console.log('\nFNCHK115 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
