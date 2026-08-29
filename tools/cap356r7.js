#!/usr/bin/env node
/* 작업 356 7회차 캡처 — 비평 루프용. 세 화면을 각각 1080×2280 으로 찍는다.
 *
 *   node tools/cap356r7.js
 *
 * ⚠ 진입 서명을 찍고 나서 촬영한다 — 조용히 실패한 클릭은 «다른 화면» 을 찍고 비평가에게
 *   «0건» 을 받아 온다(LESSONS 356-⑬ · 397 이 살아남은 경로 자체다).
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

const SHOTS = [
  { name: '356-r7-23train.png', open: ['.tab[data-t="grow"]'],
    sign: () => ({ cards: document.querySelectorAll('#trCards .tr-card').length,
                   ci: document.querySelectorAll('#trCards .tr-card>.ci').length,
                   coin: document.querySelectorAll('#trCards .tr-card>.cb>s>img.cic').length }) },
  { name: '356-r7-33cur.png', open: ['[data-cur="dia"]'],
    sign: () => ({ open: !!document.querySelector('#ciw.on') || !!document.querySelector('#ciw'),
                   ic: document.querySelectorAll('#ciIcon>img.cic').length }) },
  { name: '356-r7-50cos.png', open: ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]'],
    sign: () => ({ btn: document.querySelectorAll('#bCos .sk-btn').length,
                   ic: document.querySelectorAll('#bCos .sk-btn>i>.cic').length }) },
];

(async () => {
  const b = await launch(chromium);
  for (const s of SHOTS) {
    const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await p.goto(URL); await p.waitForTimeout(1400);
    for (const q of s.open) {
      await p.evaluate((sel) => { const e = document.querySelector(sel); if (e) e.click(); }, q);
      await p.waitForTimeout(750);
    }
    /* 60 쥬시 등장 연출이 걷힌 뒤에 찍는다 */
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} } });
    await p.waitForTimeout(400);
    const sign = await p.evaluate(s.sign);
    await p.screenshot({ path: path.join(OUT, s.name) });
    console.log(`${s.name}  진입 서명 ${JSON.stringify(sign)}`);
    await p.close();
  }
  await b.close();
  console.log('\n→ ' + OUT);
})();
