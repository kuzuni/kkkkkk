#!/usr/bin/env node
/* 작업 773 — 「`probe528`·`verify528` 이 «펫 8등급 / 36행» 을 손으로 적어 두었다」 재현 + 되돌림 시험 (338 규칙)
 *
 *   node tools/probe773.js
 *
 * 등재문의 주장은 «제품이 옳고 자가 낡았다» 다 — 757 이 확률표를 「그 배너가 파는 종」 까지 자르면서
 * 펫이 8등급/36행 → **7등급/35행** 이 됐는데 두 자만 옛 수에 굳어 4항이 빨갰다.
 * 그래서 재현은 세 겹이어야 뜻이 산다:
 *
 *   §1 현행 트리 — 화면이 실제로 몇 등급/몇 행인가, 그리고 그 값이 **제품에서 파생한 값**과 같은가.
 *                  옛 상수(8·36)가 지금 거짓임을 같이 못박는다(= 등재문 확인).
 *   §2 추종 시험 — 펫 종 목록에 최고 등급 한 마리를 얹으면 화면이 8등급/36행으로 커지고
 *                  **파생값도 같이** 움직인다. 손 상수였다면 못 따라온다(처방 ⓐ 가 옳은 이유).
 *   §3 원복      — 얹은 종을 걷어내면 7등급/35행으로 정확히 돌아온다(시험이 트리를 안 더럽힌다).
 *
 * ⚠ 제품(`index.html`)은 한 줄도 안 고친다. §2 는 **한 페이지 안에서만** `PETS` 에 시험 종을
 *    얹었다가 걷어내는 것이라 사본 파일도 안 만든다(528 이 만렙을 사본으로 올린 것과 다른 축이다 —
 *    여기서 움직이는 축은 만렙이 아니라 «그 배너가 파는 종» 이다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const IDX  = path.join(ROOT, 'index.html');
const url  = f => 'file://' + f.replace(/\\/g, '/');

const OLD_HEADS = 8, OLD_ROWS = 36;   /* 773 이 걷어낸 그 두 수(재현 표본 — 고치면 재현이 사라진다) */

let pass = 0, fail = 0;
const ok = (b, name, got) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (got ? ' — ' + got : '')); b ? pass++ : fail++; };

/* 화면과 «파생 기대값» 을 같은 한 벌로 읽는다 — 판정식을 베끼지 않고 제품이 그린 결과를 센다. */
function shot() {
  const spec = (() => { const tab = rollOf('pet'), gs = new Set(BANNERS.pet.list.map(x => x.g));
    return { heads: [...gs].filter(g => g < tab.length).length,
             rows:  BANNERS.pet.list.filter(x => x.g < tab.length).length,
             tab:   tab.length, topG: topG('pet') }; })();
  openProbInfo('pet', SUM_MAXLV);
  const seen = { lv: document.getElementById('prbLv').textContent,
                 rows:  document.querySelectorAll('#prbList .prb-row').length,
                 heads: document.querySelectorAll('#prbList .prb-gh').length };
  closeProbInfo();
  return { spec, seen, pets: BANNERS.pet.list.length };
}

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  await page.goto(url(IDX));
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProbInfo === 'function'
                                   && typeof rollOf === 'function');
  await page.waitForTimeout(500);

  /* ── §1 현행 트리 ─────────────────────────────────────────────────────────────────── */
  const A = await page.evaluate(shot);
  ok(A.seen.lv === 'MAX', '1-a 전제 — 확률 팝업이 실제로 MAX 단계를 열었다(여기서만 전 등급이 보인다)',
     '단계 «' + A.seen.lv + '»');
  ok(A.seen.heads === A.spec.heads && A.seen.rows === A.spec.rows,
     '1-b 현행 — 화면이 그린 등급·행이 제품 파생값(rollOf(pet) · 종 목록)과 정확히 같다',
     '화면 ' + A.seen.rows + '행/' + A.seen.heads + '등급 ↔ 파생 ' + A.spec.rows + '행/' + A.spec.heads
     + '등급 (표 ' + A.spec.tab + '행 · topG ' + A.spec.topG + ' · 펫 ' + A.pets + '종)');
  ok(A.seen.heads !== OLD_HEADS && A.seen.rows !== OLD_ROWS,
     '1-c 재현 — 두 자가 굳혀 두었던 옛 상수는 지금 트리에서 거짓이다(757 이 불멸 1종을 걷어냈다)',
     '옛 상수 ' + OLD_ROWS + '행/' + OLD_HEADS + '등급 ↔ 실측 ' + A.seen.rows + '행/' + A.seen.heads + '등급');

  /* ── §2 추종 시험 — 펫에 최고 등급 한 마리를 얹는다(757 이전 데이터의 재현) ─────────── */
  const B = await page.evaluate(() => {
    /* `BANNERS.pet.list` 는 `PETS` **그 배열**이고, `topG` 는 `TOP_G` 표를 읽는다(둘 다 제품의 자리다) */
    PETS.push({ id:'p773x', n:'773 시험 펫', g: topG('pet') + 1, j:0, sp:'bird', tint:null, v:1, cd:1 });
    TOP_G.pet = PETS.reduce((m, p) => Math.max(m, p.g), 0);
    return null;
  });
  const C = await page.evaluate(shot);
  ok(C.seen.heads === C.spec.heads && C.seen.rows === C.spec.rows,
     '2-a 추종 — 종이 하나 늘자 화면과 파생값이 **같이** 움직인다(손 상수는 여기서 갈린다)',
     '화면 ' + C.seen.rows + '행/' + C.seen.heads + '등급 ↔ 파생 ' + C.spec.rows + '행/' + C.spec.heads
     + '등급 (표 ' + C.spec.tab + '행 · topG ' + C.spec.topG + ' · 펫 ' + C.pets + '종)');
  ok(C.seen.heads === A.seen.heads + 1 && C.seen.rows === A.seen.rows + 1,
     '2-b 추종 — 늘어난 폭이 정확히 «등급 +1 · 행 +1» 이다(§1 과 같은 자로 잰다)',
     A.seen.rows + '행/' + A.seen.heads + '등급 → ' + C.seen.rows + '행/' + C.seen.heads + '등급');
  ok(C.seen.heads !== A.spec.heads && C.seen.rows !== A.spec.rows,
     '2-c 처방 ⓑ 기각 — «숫자만 7·35 로 내린다» 였으면 이 상태에서 두 자가 **또** 빨개진다',
     '§1 의 수 ' + A.spec.rows + '행/' + A.spec.heads + '등급 ↔ 이 상태 ' + C.seen.rows + '행/'
     + C.seen.heads + '등급');

  /* ── §3 원복 ───────────────────────────────────────────────────────────────────────── */
  await page.evaluate(() => {
    const i = PETS.findIndex(p => p.id === 'p773x');
    if (i >= 0) PETS.splice(i, 1);
    TOP_G.pet = PETS.reduce((m, p) => Math.max(m, p.g), 0);
    return null;
  });
  const D = await page.evaluate(shot);
  ok(D.seen.rows === A.seen.rows && D.seen.heads === A.seen.heads && D.pets === A.pets
     && D.spec.topG === A.spec.topG,
     '3-a 원복 — 얹은 종을 걷어내면 §1 과 한 행도 다르지 않은 표로 돌아온다(시험이 트리를 안 더럽힌다)',
     '화면 ' + D.seen.rows + '행/' + D.seen.heads + '등급 · 펫 ' + D.pets + '종 · topG ' + D.spec.topG);

  ok(errs.length === 0, '3-b 콘솔·페이지 에러 0건 — 시험 종을 얹고 걷어내는 동안 제품이 안 깨졌다',
     errs.length ? errs.slice(0, 3).join(' · ') : '없음');

  await browser.close();
  console.log('\nPROBE773 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
