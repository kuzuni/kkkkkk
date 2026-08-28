/* 작업 309 캡처 하네스 — 하단 탭바 NEW 리본 (2026-08-28).
   실행: node tools/cap309.js [out=docs/review]
   낸다: `309-r1-after.png`(현 HEAD) · `309-r1-before.png`(309 이전 CSS 를 덧씌운 대조군)
         둘 다 1080×2280 프레임의 **탭바 구간(y2080..2280)** 만 잘라 낸 1080×200 이다.
   맥박(nwPulse/jzDotPulse)을 세우고 찍는다 — 안 세우면 두 장의 위상이 달라 비교가 안 된다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.resolve(__dirname, '../docs/review');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const FREEZE = '#tabbar .tab .nw{animation:none}';
/* 309 이전 상태 = 앵커 −1.3px + 60 «점» 배율. 맥박은 세워 두므로 앵커만으로도 정지 잘림이 보인다. */
const BEFORE = '#tabbar .tab .nw{left:-1.3px}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto(URL);
  await p.waitForTimeout(900);
  const put = async css => {
    await p.evaluate(t => {
      let e = document.getElementById('cap309');
      if (!e) { e = document.createElement('style'); e.id = 'cap309'; document.head.appendChild(e); }
      e.textContent = t;
    }, css);
    await p.waitForTimeout(200);
  };
  const clip = { x: 0, y: 2080, width: 1080, height: 200 };
  for (const [name, css] of [['after', FREEZE], ['before', FREEZE + BEFORE]]) {
    await put(css);
    const f = path.join(OUT, `309-r1-${name}.png`);
    await p.screenshot({ path: f, clip });
    console.log('저장', f);
  }
  await browser.close();
})();
