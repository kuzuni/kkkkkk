/* 53 가방 팝업 캡처 — 1080×2280 (ROUTINE [3]-(나) 1번).
   레퍼런스와 «같은 상태» 로 맞추는 것이 캡처의 절반이다(LESSONS 04-①):
   ref 는 격자 20칸 중 18칸이 차 있고 등급 분포가 주황1·보라8·파랑7·초록2, 마지막 2칸이 빈 칸이다.
   그래서 S.own 을 그 분포 그대로 주입한 뒤 찍는다.
   주입은 렌더 루프를 세운 뒤에 한다 — 유휴 루프가 값을 덮어쓰면 그 회차 채점이 통째로 무효다(LESSONS 41-④).
   사용: node tools/cap53.js [출력경로] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'docs/review/53-r1.png';

/* 이 컨테이너의 playwright 는 번들 브라우저를 못 찾는 경우가 있다 — cap31 과 같은 폴백 */
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

  /* 58 연출 모듈의 재화 파티클(#fxl 의 비행 골드)이 딤 «위» 를 지나가 채점을 오염시킨다 —
     3회차 비평가 A·B 가 독립적으로 지적했다(«x737..789/y1688..1742 골드가 «재화» 라벨 잉크의 55% 를 가림»).
     72 가 같은 문제를 겪고 쓴 대책을 그대로 가져온다(tools/cap72.js). */
  await page.addStyleTag({ content: '#fxl{display:none!important}' });

  /* 렌더 루프를 먼저 세운다(41-④) — 그 다음에 상태를 주입해야 덮어쓰이지 않는다 */
  const injected = await page.evaluate(() => {
    if (typeof S === 'undefined' || typeof openBag !== 'function') return 'no-hooks';
    S.autoBuy = false; S.spAuto = false;
    if (typeof running !== 'undefined') { try { running = false; } catch (e) {} }

    /* ref 등급 분포 그대로: 전설1 · 영웅8 · 희귀7 · 고급2 = 18칸(+빈칸 2) */
    const cat = [].concat(SKILLS, EQUIPS, PETS, RELICS);
    const want = { 4: 1, 3: 8, 2: 7, 1: 2 };
    S.own = {};
    const qty = [9999, 128, 64, 32, 16, 12, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1];
    let qi = 0;
    [4, 3, 2, 1].forEach((g) => {
      cat.filter((it) => it.g === g).slice(0, want[g]).forEach((it) => {
        S.own[it.id] = { n: qty[qi++] || 1, l: 1 };
      });
    });
    openBag();
    return Object.keys(S.own).length;
  });

  /* 두 프레임 세운 뒤 찍는다 — 살아 있는 게임을 그냥 찍으면 결정적이지 않다(41-④) */
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(400);

  const on = await page.evaluate(() => document.getElementById('bagw').classList.contains('on'));
  if (injected === 'no-hooks' || !on) {
    console.error('CAP53 FAIL — 주입/오픈 실패:', injected, 'on=' + on);
    await browser.close();
    process.exit(1);           /* 주입이 안 붙으면 스스로 죽는다(41-④) */
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
      box: q('.bg53'), head: q('.bg53-head'), body: q('.bg53-body'),
      tip: q('.bg53-tip'), grid: q('.bg53-grid'),
      banner: q('.bg53-tip'), panel: q('.bg53-panel'), tabs: q('.bg53-tabs'), pill: q('.bg53-tabs>s.on'),
      c1: q('.bg53-grid>.bg53-c:nth-child(1)'), c2: q('.bg53-grid>.bg53-c:nth-child(2)'),
      c6: q('.bg53-grid>.bg53-c:nth-child(6)'), c20: q('.bg53-grid>.bg53-c:nth-child(20)'),
      cells: document.querySelectorAll('.bg53-c').length
    };
  });
  console.log('CAP53 OK →', OUT, '· 주입 아이템', injected, '칸');
  console.log(JSON.stringify(box, null, 1));
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log(' ', e)); }
  else console.log('콘솔 에러 0건');
  await browser.close();
})();
