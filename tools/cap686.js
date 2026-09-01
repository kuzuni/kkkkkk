#!/usr/bin/env node
/* 캡처 하네스 — 작업 686 «단련 설명 텍스트 제거 + 강화 버튼 세로 확대» 채점용
 *
 *   node tools/cap686.js [출력접두사]      기본 접두사 = docs/review/686-r1
 *
 * 지시서 [3]-(나): 캡처는 **1080×2280**(9:19) 이 기준이고, 404 선례 때문에 짧은 프레임
 * **1080×1600**(9:13.3) 도 같이 찍는다. 비평가 2인은 이 두 장을 본다.
 *
 * ⚠ 캡처 PNG 는 커밋하지 않는다(ROUTINE 서두 «캡처는 커밋하지 마라 · `git add -f` 금지»).
 *   증거로 남기는 것은 review .md 의 **수치**다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const OUT = process.argv[2] || path.join(ROOT, 'docs/review/686-r1');

(async () => {
  const browser = await launch(chromium);
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(SRC);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.evaluate(() => { window.step = () => {}; });          /* 전투 정지 — 프레임 고정 */
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      /* 실제로 «올릴 수 있는» 상태 — 버튼이 활성(초록)이어야 채점이 뜻을 갖는다.
         비용 계단이 눈에 보이게 세 축을 서로 다른 구간에 세운다(1 · 3 · 6). */
      S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
      S.temper = { alloc: { atk: 50, hp: 150, regen: 250 } };
      markDirty(); openTrain(); setTrSub('temper'); renderTrain();
    });
    await page.waitForTimeout(900);                                   /* 시트 진입 연출이 끝나고 */
    await page.screenshot({ path: `${OUT}-${H}.png` });
    console.log(`  캡처 ${OUT}-${H}.png`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
