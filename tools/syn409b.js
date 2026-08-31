/* 작업 409 16회차 — **자를 가르는 대조군**을 렌더한다 (§24-5 2번).
 *
 *   15회차가 남긴 자리: 이등분선 자(`probe409g --diag`)와 광선 자(`probe409e --rays`
 *   = `verify409`/`verify462` 가 쓰는 자)가 **같은 코너를 다르게 읽는다**.
 *     ref BL — diag `K7.0 D4.0 B7.0`  ↔  rays 45° `K5.5(+S1.5) D2.5 B8.5`
 *     cap BL — diag `K7.0 D2.5 B8.5`  ↔  rays 45° `K5.5 D4.0 B6.0`
 *   D+B 총량은 ref 11.0 으로 둘이 같은데 **배분이 3px 갈린다.** 어느 쪽이 옳은지
 *   ref·cap 만 보고는 못 가른다(둘 다 «정답» 을 모르는 그림이다).
 *
 *   ⇒ **정답을 아는 그림**을 만든다. 같은 상자·같은 반경에 «폭을 내가 정한» 동심 3겹
 *   (검정 K 7 · 어두운 띠 D 4 · 베벨 B 7 — 전부 등폭 링)을 올리고 두 자에게 읽히면,
 *   **7/4/7 을 되돌려주는 자가 옳은 자**다. syn409.js(7회차 · 링 한 겹)의 확장이다.
 *
 *   ⚠ 상자는 제품에 직접 물어 얻은 값과 같아야 한다(x 290.75 소수까지 — AA 가 같이 재현된다).
 *
 * 사용:  node tools/syn409b.js [출력경로]     (기본 docs/review/409-syn3.png)
 *        python3 tools/probe409h.py
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = process.argv[2] || path.resolve(__dirname, '..', 'docs/review/409-syn3.png');

/* 폭은 여기서만 정한다 — 자가 되돌려줘야 할 «정답». */
const K = 7, D = 4, B = 7;

/* 색은 제품 팔레트 그대로(자의 cls() 가 같은 글자로 분류해야 한다). */
const C_K = '#000000', C_D = '#413122', C_B = '#634F37', C_F = '#4B3E2D';
/* ⚠ 둘레 색은 **제품에서 잰 값**이어야 한다 — `probe409g.apex` 는 «바깥이 밝다»(휘도 문턱 45)로
   꼭짓점을 찾는다. 제품의 알약 둘레는 셸림 `#705F4B`(휘도 94)다. 어두운 배경 위에 그리면
   그 자는 첫 픽셀에서 멈춰 «자 자신» 이 아니라 «대조군» 을 재게 된다(16회차 1차 시도가 그랬다). */
const C_RIM = '#705F4B';

const HTML = `<!doctype html><meta charset=utf-8><style>
html,body{margin:0;background:${C_RIM}}
#w{position:relative;width:1080px;height:2280px}
#p{position:absolute;left:290.75px;top:1967px;width:261px;height:84px;
   border-radius:30px;background:${C_F}}
/* 동심 3겹 — inset box-shadow 는 «등폭 링» 이라 코너에서도 폭이 안 변한다.
   바깥부터 K → D → B 순으로 쌓인다(누적 오프셋). */
#p::after{content:'';position:absolute;left:0;right:0;top:0;bottom:0;
   border-radius:30px;
   box-shadow:inset 0 0 0 ${K}px ${C_K},
              inset 0 0 0 ${K + D}px ${C_D},
              inset 0 0 0 ${K + D + B}px ${C_B}}
</style><div id=w><div id=p></div></div>`;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.setContent(HTML);
    await page.waitForTimeout(200);
    await page.screenshot({ path: OUT });
    console.log(`409 대조군(등폭 동심 3겹 K${K} D${D} B${B} · r30) → ` + OUT);
  } finally {
    await browser.close();
  }
})();
