#!/usr/bin/env node
/* 117 기능 체크 표 — «버튼을 누르면 무엇이 바뀌는가» 를 헤드리스로 실측해 마크다운 표로 뱉는다.
 *   node tools/func117.js
 * 지시서 «기능 완성 규칙»(2026-08-26)이 요구하는 표. 판정이 아니라 **관측 기록**이다
 * (합/불은 tools/verify117.js 가 낸다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const rows = [];
const push = (btn, before, after, note) => rows.push({ btn, before, after, note });

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    if (!localStorage.getItem('idle_hunter_save_v4'))
      localStorage.setItem('idle_hunter_save_v4',
        JSON.stringify({ gold: 1000, dia: 10, stage: 5, best: 5, autoBuy: false, spAuto: false }));
  });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof blessScale === 'function');
  await page.waitForTimeout(700);

  const snap = () => page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog,
    on: BLESS.map(x => blessOn(x.k) ? 1 : 0).join(''),
    atk: +mulAtk().toFixed(6), hp: +mulHp().toFixed(6), rate: +mulRate().toFixed(6), gold: +mulGold().toFixed(6),
    dmg: +stat.dmg.toFixed(3), maxHp: +stat.maxHp.toFixed(1),
    vl: [...document.querySelectorAll('#blsCards .vl')].map(e => e.textContent).join(' '),
    bn: (document.getElementById('blsBnV') || {}).textContent,
    pg: (document.getElementById('blsProg') || {}).textContent,
    lvTx: (document.getElementById('blsLv') || {}).textContent,
    saveLv: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').bless || {}).lv
  }));
  const fmt = s => 'Lv' + s.lv + ' · exp ' + s.prog + ' · 활성 ' + s.on + ' · atk×' + s.atk +
                   ' · gold×' + s.gold + ' · dmg ' + s.dmg + ' · 카드 ' + s.vl + ' · 보너스 ' + s.bn;

  /* 0. 초기화 — 축복 전부 꺼진 Lv1 */
  await page.evaluate(() => { S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); save(); });

  /* 1. 사이드 «축복» 아이콘 */
  let b = await snap();
  await page.click('.side .ibtn[data-pop="bless"]'); await page.waitForTimeout(300);
  let a = await snap();
  push('좌측 사이드 🙏 «축복»', '팝업 닫힘', '팝업 열림 · ' + fmt(a), '진입점. 데이터 변화 없음');

  /* 2. 공격력 카드 */
  b = await snap();
  await page.click('#blsC_atk'); await page.waitForTimeout(300);
  a = await snap();
  push('카드 «공격력»', fmt(b), fmt(a),
       '활성 + 경험치 +1 · mulAtk/stat.dmg 즉시 ×1.20 · 타이머 표시 · 세이브 기록');

  /* 3. 체력·공속 카드 → 3종 전부 = 보너스 축복 */
  await page.click('#blsC_hp'); await page.waitForTimeout(200);
  b = await snap();
  await page.click('#blsC_rate'); await page.waitForTimeout(300);
  a = await snap();
  push('카드 «체력» → «공격 속도»', fmt(b), fmt(a),
       '3종 전부 활성 → 보너스 축복 발동, mulGold ×1.50 (Lv1)');

  /* 4. 4번째 활성화 = 레벨업 */
  b = await snap();
  const lvup = await page.evaluate(async () => {
    S.bless.exp.atk = 0; markDirty(); renderBless();
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    document.getElementById('blsC_atk').click();
    await new Promise(r => setTimeout(r, 150));
    return { toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).filter(s => /축복/.test(s)),
             pop: document.querySelectorAll('#blsCards .bls-c.fx-pop').length,
             left: Math.round(blessLeft('atk') / 60000) };
  });
  a = await snap();
  push('카드 «공격력»(4번째 = 레벨업)', fmt(b), fmt(a),
       'Lv+1 · 경험치 되감기 · **효과 +20%→+22%** · 지속 ' + lvup.left + '분 · 토스트 ' +
       JSON.stringify(lvup.toast) + ' · 카드 팝 ' + lvup.pop + '장');

  /* 5. «모든 축복 받기» */
  await page.evaluate(() => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; markDirty(); renderBless(); });
  b = await snap();
  await page.click('#blsAll'); await page.waitForTimeout(300);
  a = await snap();
  push('스트립 [받기] «모든 축복 받기»', fmt(b), fmt(a), '비활성 3종을 한 번에 활성 · 경험치 +3');

  /* 6. 이미 켜진 카드 재클릭 */
  b = await snap();
  await page.click('#blsC_atk'); await page.waitForTimeout(250);
  a = await snap();
  push('활성 상태에서 카드 재클릭', fmt(b), fmt(a), '시간·경험치 누적 없음(무변화가 정상)');

  /* 7. 만료 */
  const exp = await page.evaluate(async () => {
    S.bless.lv = 11; S.bless.exp = { atk: Date.now() + 900, hp: 0, rate: 0 }; markDirty();
    const on = +mulAtk().toFixed(6);
    await new Promise(r => setTimeout(r, 2400));
    return { on, off: +mulAtk().toFixed(6), txt: document.querySelector('#blsC_atk .tm>i').textContent };
  });
  push('(버튼 아님) 지속시간 만료', 'Lv11 활성 atk×' + exp.on, '만료 atk×' + exp.off + ' · 카드 «' + exp.txt + '»',
       '1초 tick 이 캐시를 깨서 배율이 즉시 원복 — 비 ' + (exp.on / exp.off).toFixed(2));

  /* 8. 상한 */
  const cap = await page.evaluate(() => {
    S.bless = { lv: BLESS_MAXLV, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    for (let i = 0; i < 6; i++) { S.bless.exp.atk = 0; activateBless('atk'); }
    return { lv: S.bless.lv, prog: S.bless.prog, pg: document.getElementById('blsProg').textContent,
             vl: document.querySelector('#blsCards .vl').textContent,
             bn: document.getElementById('blsBnV').textContent };
  });
  push('상한(Lv51)에서 카드 6회 클릭', 'Lv51 · exp 0',
       'Lv' + cap.lv + ' · exp ' + cap.prog + ' · 진행바 «' + cap.pg + '» · 카드 ' + cap.vl + ' · 보너스 ' + cap.bn,
       '레벨·경험치 정지 · MAX 표시');

  /* 9. 새로고침 유지 */
  await page.evaluate(() => { S.bless = { lv: 7, prog: 2, exp: { atk: Date.now() + 12e5, hp: 0, rate: 0 } };
                              markDirty(); renderBless(); save(); });   /* 표가 옛 DOM 을 찍지 않게 다시 그린다 */
  b = await snap();
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof blessScale === 'function');
  await page.waitForTimeout(700);
  await page.click('.side .ibtn[data-pop="bless"]'); await page.waitForTimeout(300);
  a = await snap();
  push('새로고침(F5)', fmt(b), fmt(a), '레벨·경험치·남은 시간·실효 % 전부 복원');

  console.log('| 버튼 / 동작 | 누르기 전 | 누른 뒤 | 확인한 것 |');
  console.log('|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.btn + ' | ' + r.before + ' | ' + r.after + ' | ' + r.note + ' |'));
  console.log('\n콘솔 에러: ' + (errs.length ? errs.slice(0, 3).join(' | ') : '0건'));

  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
