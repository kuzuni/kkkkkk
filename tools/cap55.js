/* 55 설정 팝업 캡처 — 1080×2280 (ROUTINE [3]-(나) 1번).
   레퍼런스와 «같은 상태» 로 맞추는 것이 캡처의 절반이다(LESSONS 04-①):
   ref 는 토글 3개가 켜짐(초록), 2개가 꺼짐(회색), 볼륨 슬라이더가 최대다.
   주입은 렌더 루프를 세운 뒤에 한다 — 유휴 루프가 값을 덮어쓰면 그 회차 채점이 통째로 무효다(LESSONS 41-④).
   사용: node tools/cap55.js [출력경로] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'docs/review/55-r1.png';

/* 이 컨테이너의 playwright 는 번들 브라우저를 못 찾는 경우가 있다 — cap31·cap53 과 같은 폴백 */
function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const injected = await page.evaluate(() => {
    if (typeof S === 'undefined' || typeof openConf !== 'function') return 'no-hooks';
    S.autoBuy = false; S.spAuto = false;
    /* ref 상태: 켜짐 3 · 꺼짐 2 · 볼륨 100 */
    S.opt = { vol: 100, bgm: true, sfx: true, shake: true, push: false, night: false };
    openConf();
    return 'ok';
  });

  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(400);

  const on = await page.evaluate(() => document.getElementById('cfw').classList.contains('on'));
  if (injected === 'no-hooks' || !on) {
    console.error('CAP55 FAIL — 주입/오픈 실패:', injected, 'on=' + on);
    await browser.close();
    process.exit(1);
  }

  await page.screenshot({ path: OUT });
  const box = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const q = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: +(r.left - app.left).toFixed(1), y: +(r.top - app.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    return {
      scale: +(app.width / 1080).toFixed(4),
      box: q('.cf55'), head: q('.cf55-head'), body: q('.cf55-body'),
      sub: q('.cf55-sub'), track: q('.cf55-track'), knob: q('.cf55-knob'),
      row1: q('.cf55-row:nth-child(1)'), row6: q('.cf55-row:nth-child(6)'),
      ic1: q('.cf55-row:nth-child(1) .cf55-ic'), lb1: q('.cf55-row:nth-child(1) .cf55-lb>i'),
      lb6: q('.cf55-row:nth-child(6) .cf55-lb>i'),
      gold: q('.cf55-gold'), sw2: q('.cf55-row:nth-child(2) .cf55-sw'),
      kn2: q('.cf55-row:nth-child(2) .cf55-kn'), kn5: q('.cf55-row:nth-child(5) .cf55-kn'),
      list: q('.cf55-list'), rule: q('.cf55-rule'), acc: q('.cf55-acc'), acch: q('.cf55-acch'),
      badge: q('.cf55-badge'),
      b1: q('.cf55-btn.b1'), b2: q('.cf55-btn.b2'), b3: q('.cf55-btn.b3'),
      note1: q('.cf55-n1'), note2: q('.cf55-n2'),
      labels: [...document.querySelectorAll('.cf55-lb>i')].map((e) => {
        const r = e.getBoundingClientRect(); const sx = +getComputedStyle(e).getPropertyValue('--sx') || 1;
        return { t: e.textContent, x: +(r.left - app.left).toFixed(1), w: +r.width.toFixed(1),
                 sx, nat: +(r.width / sx).toFixed(1) }; }),
      inks: ['.cf55-gold>i', '.cf55-btn.b1>i', '.cf55-btn.b2>i', '.cf55-btn.b3>i',
             '.cf55-badge>i', '.cf55-n2>i', '.cf55-del>i', '.cf55-acch', '.cf55-sub>i'].map((s) => {
        const e = document.querySelector(s); if (!e) return { s, w: null };
        const r = e.getBoundingClientRect(); const sx = +getComputedStyle(e).getPropertyValue('--sx') || 1;
        return { s, x: +(r.left - app.left).toFixed(1), y: +(r.top - app.top).toFixed(1),
                 w: +r.width.toFixed(1), sx, nat: +(r.width / sx).toFixed(1) }; })
    };
  });
  console.log('CAP55 OK →', OUT);
  console.log(JSON.stringify(box, null, 1));
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log(' ', e)); }
  else console.log('콘솔 에러 0건');
  await browser.close();
})();
