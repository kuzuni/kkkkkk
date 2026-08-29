#!/usr/bin/env node
/* 356 6회차 캡처 — 34 축복 팝업 1080×2280 (비평가 제출용)
 *   node tools/cap356r6.js
 * ⚠ 진입을 «화면» 으로 확인하고 찍는다 — 클릭이 조용히 실패하면 다른 화면을 제출하게 된다
 *   (LESSONS 356-⑬: 5회차가 «레이드» 라벨로 찾다가 던전 화면을 두 번 제출했다). */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'review', '356-r6-34.png');
(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto(URL); await p.waitForTimeout(1500);
  await p.click('.side .ibtn[data-pop="bless"]').catch(() => {});
  await p.waitForTimeout(1200);
  const sig = await p.evaluate(() => ({
    cards: document.querySelectorAll('.bls-c').length,
    bn: !!document.querySelector('#blsBonus'),
    open: document.getElementById('blsw') && document.getElementById('blsw').classList.contains('on'),
  }));
  if (sig.cards !== 3 || !sig.bn || !sig.open) {
    console.error('[cap356r6] 진입 실패 — ' + JSON.stringify(sig)); process.exit(1);
  }
  /* 연출이 걷히고 타이머가 안 흔들리는 순간에 찍는다 */
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} } });
  await p.waitForTimeout(200);
  await p.screenshot({ path: OUT });
  console.log('[cap356r6] ' + OUT + '  진입 서명 ' + JSON.stringify(sig));
  await b.close();
})();
