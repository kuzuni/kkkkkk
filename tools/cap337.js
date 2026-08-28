/* 작업 337 — 공용 서브탭 부품 `.stabs`/`.stab` 재측정용 캡처.
 *
 *   node tools/cap337.js [출력경로]        (기본 docs/review/337-r0.png)
 *
 * 335 가 03 구간(껍데기 축·이음매)을 닫은 뒤 남은 감점은 **한 줄도 03 것이 아니다** —
 * 전부 공용 부품 몫이라 이 작업 단위는 «부품째» 다. 그래서 캡처도 m335.js 와 같은 경로로
 * 03 을 찍되(살아 있는 ref 는 03 §4-3 하나뿐), 측정은 `scan337.py` 가 ref/cap 을
 * **같은 마스크로 동시에** 한다(LESSONS 12-3회차).
 *
 * 좌표계: 프레임 1080x2280. 서브탭 바는 **하단 앵커**라 cap_y = ref_y − 60 이다(335 정오표).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = process.argv[2] || path.resolve(__dirname, '..', 'docs/review/337-r0.png');

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    page.on('console', m => { if (m.type() === 'error') console.log('   [console error]', m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(500);
    /* 토스트·파티클은 bbox 를 흔든다(LESSONS 30-②) */
    await page.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: OUT });
    console.log('saved', OUT);
  } finally { await browser.close(); }
})();
