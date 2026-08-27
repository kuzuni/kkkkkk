/* 작업 161 캡처 하네스 — 스테이지 진행바 헤더를 진행률 4단계로 잘라 한 장에 담는다.
   실행: node tools/cap161.js   → docs/review/161-r1.png (헤더 클립 4장 세로 연결)
   진행률은 killed 를 직접 박아 만들고, 게임 루프는 얼려서 다음 프레임이 되돌리지 못하게 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const STEPS = [0, 0.48, 0.5, 1];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof drawHud === 'function' && document.getElementById('kn2'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(120);

  const out = [];
  for (const r of STEPS) {
    const info = await p.evaluate((r) => {
      promo = null; enemies.length = 0; spawnQ.length = 0;
      const total = stageTotal();
      killed = Math.round(r * total);
      drawHud();
      return { total, killed, on: $('kn2').classList.contains('on') };
    }, r);
    await p.waitForTimeout(300);                      /* 색 transition(.18s) 이 끝난 뒤에 찍는다 */
    const f = path.resolve(__dirname, `../docs/review/161-step-${Math.round(r * 100)}.png`);
    await p.locator('#stinfo').screenshot({ path: f });
    out.push(f);
    console.log(`  ${String(Math.round(r * 100)).padStart(3)}%  ${info.killed}/${info.total}  노드 ${info.on ? '점등' : '소등'}  → ${path.basename(f)}`);
  }
  await browser.close();
  console.log('CAP161 OK — ' + out.length + '장');
})();
