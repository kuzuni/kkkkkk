/* 작업 409 7회차 — **자의 대조군**을 렌더한다.
 *
 *   probe409d 의 광선 자는 «각도에 따라» 편향이 있다(임계 26 · AA 1px · 상자 x 가 0.25px 소수).
 *   그 편향을 «결함» 으로 읽은 것이 5·6회차가 링을 깎았다가 되돌린 뿌리다(§15-8·§14-7).
 *   그래서 **같은 상자·같은 반경의 «순수한 동심 원 링» 하나만** 올린 빈 페이지를 찍어 두고,
 *   측정값에서 그 값을 빼면 남는 것이 «제품·ref 의 진짜 모양» 이다.
 *
 *   상자는 제품에 직접 물어 얻은 값이다(07 활성 «스킬» — x 290.75 · y 1967 · 261×84 · r30).
 *
 * 사용:  node tools/syn409.js [출력경로]        (기본 docs/review/409-syn.png)
 *        python3 tools/probe409d.py --ctl docs/review/409-syn.png
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = process.argv[2] || path.resolve(__dirname, '..', 'docs/review/409-syn.png');

/* ⚠ 제품과 «같은 상자» 여야 한다 — 좌표가 소수(290.75)인 것까지 같아야 AA 가 같이 재현된다. */
const HTML = `<!doctype html><meta charset=utf-8><style>
html,body{margin:0;background:#2B231A}
#w{position:relative;width:1080px;height:2280px}
#p{position:absolute;left:290.75px;top:1967px;width:261px;height:84px;
   border-radius:30px;background:#4B3E2D}
#p::after{content:'';position:absolute;left:0;right:0;top:0;bottom:0;
   border-radius:30px;box-shadow:inset 0 0 0 7px #000}
</style><div id=w><div id=p></div></div>`;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.setContent(HTML);
    await page.waitForTimeout(200);
    await page.screenshot({ path: OUT });
    console.log('409 대조군(순수 동심 원 링 r30) → ' + OUT);
  } finally {
    await browser.close();
  }
})();
