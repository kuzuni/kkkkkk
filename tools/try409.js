/* 작업 409 16회차 — **값싼 시험 하네스**(§23-4 가 쓴 방식을 도구로).
 *
 *   `.stab.on::after` 배경(코너 고리)의 후보값을 index.html 을 고치지 않고 **런타임 오버라이드**로
 *   얹어 07 스킬 시트를 찍는다. 제품을 건드리기 전에 «그 값이 정말 그 두께를 주는가» 를 먼저 잰다.
 *
 *   ⚠ 캡처 좌표·상태는 `cap96.js` 의 `hero` 와 **같아야** 한다(같은 자로 재려면 같은 그림이어야 한다).
 *
 * 사용:  node tools/try409.js "<background 선언 전체>" [출력경로]
 *        node tools/try409.js --base                       (오버라이드 없이 = 현행 제품)
 *   예:  node tools/try409.js "$(cat cand.css)" docs/review/409-try1.png
 *        python3 tools/probe409h.py --img docs/review/409-try1.png
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const arg = process.argv[2] || '--base';
const OUT = process.argv[3] || path.resolve(__dirname, '..', 'docs/review/409-try.png');

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(800);
    if (arg !== '--base') {
      await page.evaluate((css) => {
        const s = document.createElement('style');
        s.id = 'try409';
        s.textContent = '.stab.on::after{background:' + css + ' !important}';
        document.head.appendChild(s);
      }, arg);
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: OUT });
    console.log((arg === '--base' ? '현행 제품' : '오버라이드') + ' → ' + OUT);
  } finally {
    await browser.close();
  }
})();
