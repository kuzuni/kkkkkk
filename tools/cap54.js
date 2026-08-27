/* 54 랭킹 페이지 캡처 — 1080×2280 (ROUTINE [3]-(나) 1번).
   레퍼런스와 «같은 상태» 로 맞추는 것이 캡처의 절반이다(LESSONS 04-①):
   ref 는 리스트 1~6위가 꽉 차고 7위가 패널 바닥에서 잘리며, 하단 바에 내 순위가 따로 있다.
   그래서 S.best 를 사다리 중간(50)으로 주입해 내가 27위쯤에 놓이게 한 뒤 찍는다.
   주입은 렌더 루프를 세운 뒤에 한다 — 유휴 루프가 값을 덮어쓰면 그 회차 채점이 무효다(LESSONS 41-④).
   사용: node tools/cap54.js [출력경로] */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'docs/review/54-r1.png';

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /* 58 연출 모듈의 재화 파티클(#fxl)이 전체화면 페이지 «위» 를 지나가 채점을 오염시킨다 —
     53·72 가 같은 문제를 겪고 쓴 대책을 그대로 가져온다(tools/cap53.js·cap72.js). */
  await page.addStyleTag({ content: '#fxl{display:none!important}' });

  const injected = await page.evaluate(() => {
    if (typeof S === 'undefined' || typeof openRank !== 'function') return 'no-hooks';
    S.autoBuy = false; S.spAuto = false;
    S.nick = '용사_9174';
    S.best = 50; S.rank = 2;
    openRank();
    return true;
  });

  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(400);

  const on = await page.evaluate(() => document.getElementById('rkw').classList.contains('on'));
  if (injected === 'no-hooks' || !on) {
    console.error('CAP54 FAIL — 주입/오픈 실패:', injected, 'on=' + on);
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
      scene: q('.rk-scene'), title: q('.rk-title'), div1: q('.rk-div1'), tip: q('.rk-tip'),
      panel: q('.rk-panel'), list: q('.rk-list'),
      row1: q('.rk-row:nth-child(1)'), row2: q('.rk-row:nth-child(2)'), row7: q('.rk-row:nth-child(7)'),
      lc: q('.rk-row:nth-child(1) .rk-lc'), rc: q('.rk-row:nth-child(1) .rk-rc'),
      bd1: q('.rk-row:nth-child(1) .rk-bd'), bd4: q('.rk-row:nth-child(4) .rk-bd'),
      av: q('.rk-row:nth-child(1) .rk-av'), tt: q('.rk-row:nth-child(1) .rk-tt'),
      sc: q('.rk-row:nth-child(1) .rk-sc'),
      me: q('.rk-me'), mp: q('.rk-mp'), mav: q('.rk-me .rk-av'), msc: q('.rk-me .rk-sc'),
      div2: q('.rk-div2'), nav: q('.rk-nav'), back: q('.rk-back'),
      t1: q('.rk-tab.t1'), t2: q('.rk-tab.t2'), t3: q('.rk-tab.t3'),
      pod1: q('.rk-pod.p1'), pod2: q('.rk-pod.p2'), pod3: q('.rk-pod.p3'),
      pill1: q('.rk-pp.q1'), rows: document.querySelectorAll('.rk-row').length
    };
  });
  console.log('CAP54 OK →', OUT);
  console.log(JSON.stringify(box, null, 1));
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log(' ', e)); }
  else console.log('콘솔 에러 0건');
  await browser.close();
})();
