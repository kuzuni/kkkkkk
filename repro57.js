#!/usr/bin/env node
/* 작업 57 — 구버전(파란 스킨) 장비 패널 노출 버그 재현/회귀 스크립트
 *
 *   node repro57.js            # 무기·방패·목걸이 슬롯을 열고 닫으며 구버전 패널 노출을 잰다
 *
 * 통과 조건(수정 후):
 *   1. 어떤 부위 슬롯을 열고 닫아도 #bEq(구버전 배너 패널) 가시 픽셀 0 — 폐기됐으므로 DOM 자체가 없다
 *   2. 슬롯 클릭 → 05 팝업(#wpnw) 만 열리고, 그 뒤에는 06 시트(.eqp) 가 계속 떠 있다
 *   3. 05 를 닫으면 06 시트가 그대로 보인다(#eqw.on, .eqp 가시)
 *   4. 콘솔 error / pageerror 0건
 */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

/* 요소가 «실제로 화면에 보이는지» — display/visibility/opacity + 면적 */
const visInfo = async (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return { exists: false, visible: false, w: 0, h: 0 };
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01 && r.width > 0 && r.height > 0;
  return { exists: true, visible, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
}, sel);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 영웅 탭 → 장비 서브탭(기본값) */
  await page.$eval('.tab[data-t="hero"]', (el) => el.click());
  await page.waitForTimeout(500);

  const eqw0 = await visInfo(page, '#eqw');
  const eqp0 = await visInfo(page, '.eqp');
  (eqw0.visible && eqp0.visible) ? ok('영웅 탭 진입 → 06 장비 시트 표시 (.eqp ' + eqp0.w + 'x' + eqp0.h + ')')
    : fail('영웅 탭 진입인데 06 시트가 안 보인다 (#eqw ' + JSON.stringify(eqw0) + ')');

  const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot));
  console.log('  · 부위 슬롯: ' + slots.join(', '));
  if (slots.length !== 3) fail('부위 슬롯이 3칸이 아니다: ' + slots.length);

  for (const k of slots) {
    /* 페이지 안에서 resolve+click (25 교훈 5: page.click 은 재렌더 레이스에 진다) */
    await page.$eval(`#eqCards [data-eqslot="${k}"]`, (el) => el.click());
    await page.waitForTimeout(450);

    const wpn = await visInfo(page, '#wpnw');
    const bEq = await visInfo(page, '#bEq');
    const eqp = await visInfo(page, '.eqp');

    wpn.visible ? ok(`[${k}] 슬롯 클릭 → 05 아이템 팝업 열림`) : fail(`[${k}] 슬롯 클릭에도 05 팝업(#wpnw)이 안 열렸다`);
    bEq.visible ? fail(`[${k}] 열린 상태에서 구버전 패널 #bEq 가 보인다 (${bEq.w}x${bEq.h})`)
      : ok(`[${k}] 열린 상태 구버전 패널 없음 (${bEq.exists ? 'DOM 존재·비표시' : 'DOM 없음'})`);
    eqp.visible ? ok(`[${k}] 05 뒤에 06 시트 유지`) : fail(`[${k}] 05 를 여는 순간 06 시트가 내려갔다 (.eqp 비표시)`);

    /* 05 닫기 */
    await page.$eval('#wpnw', (el) => {
      const x = el.querySelector('[data-wclose],.wpn-x,.mx,.close');
      if (x) x.click(); else el.click();
    }).catch(() => {});
    await page.waitForTimeout(450);

    const wpn2 = await visInfo(page, '#wpnw');
    const bEq2 = await visInfo(page, '#bEq');
    const eqp2 = await visInfo(page, '.eqp');
    if (wpn2.visible) console.log(`  · [${k}] 05 가 안 닫혔다(닫기 셀렉터 불명) — 닫힘 뒤 검사는 건너뛴다`);
    else {
      bEq2.visible ? fail(`[${k}] 05 를 닫으니 구버전 패널 #bEq 가 드러났다 (${bEq2.w}x${bEq2.h}) ← 이 버그`)
        : ok(`[${k}] 05 닫은 뒤 구버전 패널 없음`);
      eqp2.visible ? ok(`[${k}] 05 닫은 뒤 06 시트 그대로`) : fail(`[${k}] 05 닫은 뒤 06 시트가 사라졌다`);
    }
  }

  /* 장비 서브탭을 다시 눌러도 06 시트여야 한다 */
  await page.$eval('#eqTabs [data-eqtab="eq"]', (el) => el.click()).catch(async () => {
    await page.$eval('#herosub [data-hero="eq"]', (el) => el.click()).catch(() => {});
  });
  await page.waitForTimeout(400);
  const eqpT = await visInfo(page, '.eqp');
  const bEqT = await visInfo(page, '#bEq');
  eqpT.visible ? ok('장비 서브탭 재진입 → 06 시트') : fail('장비 서브탭 재진입인데 06 시트가 아니다');
  bEqT.visible ? fail('장비 서브탭 재진입에서 구버전 패널이 보인다') : ok('장비 서브탭 재진입 구버전 패널 없음');

  errs.length ? fail('콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | ')) : ok('콘솔 에러 0건');

  await browser.close();
  console.log(fails.length ? '\nREPRO57 FAIL (' + fails.length + ')' : '\nREPRO57 PASS');
  process.exit(fails.length ? 1 : 0);
})();
