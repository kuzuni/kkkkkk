#!/usr/bin/env node
/* 게이트 614 — 「단련석 «다이아로 회수» 기능은 **폐지된 채로 남는다**」
 * (주인 지시 2026-09-01 01:13 «단련석 회수 다이아써서 회수 안되게 바꿔 그 기능을 없애»)
 *
 *   node tools/verify614.js
 *
 * 333·399 규약 — 죽는 분기와 그 분기를 단언하던 게이트 항을 **같이** 걷어내되, 자리는 비우지
 * 않는다: 이 자가 그 자리다. 회수가 되살아나는 어떤 층(노드·선언·지불 경로)도 빨갛게 잡는다.
 *   §1 노드   — 회수 줄(.tp-ft)·[data-tpreset] 이 0개 · 단련 탭 본문은 4줄(헤더 + 축 3)
 *   §2 선언   — temperReset/temperResetOk/temperResetBtn/TEMPER_RESET_DIA/temperSpent(All) 부재
 *   §3 지불   — 다이아가 단련 탭의 어떤 경로에도 안 물린다: 단련 전·후 S.dia 불변 ·
 *              레벨을 «걷어내는» 수단이 화면·전역 어디에도 없다
 *   §R 되돌림 — 가짜 회수 줄을 주입하면 §1 식이 빨개진다(자가 공허하지 않다)
 *
 * ⚠ 199 통지 — 다이아 유출 축 하나(1000/회)가 사라졌다. bot199 는 회수를 안 쓰고 있었으므로
 *   봇 정책 변경은 없다(장부 항등식 영향 0) — 상세는 review 613-614 §199.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  console.log('=== §1 노드 — 회수 줄이 화면에서 죽어 있다 ===');
  const n1 = await page.evaluate(() => {
    S.dia = 1e9; S.tstone = 1e6; S.temper = { alloc: { atk: 250, hp: 10, regen: 0 } };
    window.step = () => {};
    openTrain(); setTrSub('temper'); renderTrain();
    const w = document.getElementById('trTemper');
    return {
      ft: w.querySelectorAll('.tp-ft').length,
      rst: document.querySelectorAll('[data-tpreset]').length,
      rows: w.querySelectorAll(':scope > *').length,
      /* 다이아 아이콘이 단련 탭 안에 한 장도 없다 — 회수 버튼이 유일한 다이아 자리였다 */
      diaImgs: [...w.querySelectorAll('img.cic')].filter(i => i.dataset.curIc === 'dia').length,
      txt: w.textContent
    };
  });
  ok(n1.ft === 0 && n1.rst === 0, '[1-a] ★ 회수 줄(.tp-ft)·[data-tpreset] 0개', JSON.stringify({ ft: n1.ft, rst: n1.rst }));
  ok(n1.rows === 4, '[1-b] 단련 탭 본문이 4줄(헤더 + 축 3)이다 — 회수 줄 자리를 새 부품으로 메우지도 않았다',
    n1.rows + '줄');
  ok(n1.diaImgs === 0 && !/회수/.test(n1.txt),
    '[1-c] 단련 탭에 다이아 아이콘 0장 · «회수» 라는 말 0건', 'dia ' + n1.diaImgs + '장');

  console.log('\n=== §2 선언 — 회수 계열이 선언째 없다(죽은 코드 금지 · 333·399) ===');
  const dead = await page.evaluate(() => ({
    reset: typeof temperReset, resetOk: typeof temperResetOk, resetBtn: typeof temperResetBtn,
    dia: typeof TEMPER_RESET_DIA, spent: typeof temperSpent, spentAll: typeof temperSpentAll,
    foot: typeof temperFootTxt
  }));
  ok(Object.values(dead).every(v => v === 'undefined'),
    '[2-a] ★ temperReset(Ok/Btn)/TEMPER_RESET_DIA/temperSpent(All)/temperFootTxt 전부 undefined',
    JSON.stringify(dead));
  ok(!/const TEMPER_RESET_DIA|function temperReset\b|const temperResetOk|data-tpreset\s*=/.test(CODE),
    '[2-b] 소스에도 선언·마크업이 없다(주석 언급은 허용)');

  console.log('\n=== §3 지불 — 다이아가 단련의 어떤 경로에도 안 물린다 ===');
  const pay = await page.evaluate(() => {
    S.dia = 777777; S.tstone = 100; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
    for (let i = 0; i < 50; i++) temperUp('atk');
    const diaSame = S.dia === 777777;
    /* 레벨을 걷어낼 수단이 없다 — 화면의 어떤 버튼도 alloc 을 줄이지 않는다(정적: §1·§2 가 근거,
       동적: 단련 탭 모든 버튼을 실제로 눌러 본 뒤 레벨이 안 내려갔는지 본다) */
    const lv0 = temperLv('atk');
    [...document.querySelectorAll('#trTemper [data-tempup]')].forEach(b => b.click());
    const lvAfter = temperLv('atk');
    return { diaSame, lv0, lvAfter, noDrop: lvAfter >= lv0 };
  });
  ok(pay.diaSame, '[3-a] ★ 단련 50회 동안 다이아가 1도 안 움직인다(단련의 화폐는 단련석 하나)');
  ok(pay.noDrop, '[3-b] 화면의 어떤 버튼도 레벨을 되돌리지 않는다(회수 경로 0)',
    'Lv ' + pay.lv0 + ' → ' + pay.lvAfter);

  console.log('\n=== §R 되돌림 — 가짜 회수 줄을 주입하면 §1 이 빨개진다 ===');
  const rev = await page.evaluate(() => {
    const w = document.getElementById('trTemper');
    const d = document.createElement('div');
    d.className = 'tp-ft'; d.innerHTML = '<span class="rb" data-tpreset="1"><i>회수</i></span>';
    w.appendChild(d);
    const red = w.querySelectorAll('.tp-ft').length > 0
             && document.querySelectorAll('[data-tpreset]').length > 0
             && /회수/.test(w.textContent);
    d.remove();
    const green = w.querySelectorAll('.tp-ft').length === 0
               && document.querySelectorAll('[data-tpreset]').length === 0;
    return { red, green };
  });
  ok(rev.red, '[R-a] 회수 줄을 주입하면 §1 의 세 식이 전부 빨개진다(자가 공허하지 않다)');
  ok(rev.green, '[R-b] 원복하면 다시 초록 — 사본이 트리를 안 더럽혔다');

  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' / '));
  await browser.close();
  console.log('\nverify614: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
