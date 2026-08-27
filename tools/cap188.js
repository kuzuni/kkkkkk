#!/usr/bin/env node
/* 188 캡처 — «전투 수치는 알파벳 단위, 재화는 숫자 그대로» 가 한 화면에 같이 보이는 증거 3장.
   실행: node tools/cap188.js [회차]   (기본 r1 → docs/review/188-r1-*.png)

   상태: 훈련 12단계(상한 1200) · 공격/체력/재생 Lv 900 → 전투 수치가 1000 위로 올라간다.
   재화는 150 의 중후반 상태 그대로(골드 4.2e12 알파벳 · 다이아 1.8e7 쉼표) 두어 **경계**가 보이게 한다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const R = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/review');
const FILE = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const set = async () => p.evaluate(() => {
    S.trainStage = 12; S.lv.atk = 900; S.lv.hp = 900; S.lv.regen = 900;
    S.gold = 4.2e12; S.dia = 1.8e7; S.relic = 9.6e5; S.buyQty = 30;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    S.best = 999; S.stage = 60;
    markDirty(); drawHud(); renderUI();
  });

  await set();
  await p.waitForTimeout(1500);            /* 60 쥬시 — #cpN 롤링이 목표에 닿을 시간 */
  await p.evaluate(() => drawHud());
  /* ① 상단 HUD — 전투력(알파벳) · 플레이어 체력(알파벳) · 다이아(숫자 그대로)가 한 화면에 */
  await p.screenshot({ path: path.join(OUT, `188-${R}-hud.png`), clip: { x: 0, y: 0, width: 1080, height: 420 } });

  /* ② 23 훈련 — 카드 증가분(+3.00A) · 비용(골드 알파벳) */
  await p.evaluate(() => { try { openTrain(); } catch (e) {} });
  await p.waitForTimeout(600);
  await set();
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, `188-${R}-train.png`) });

  /* ③ 06 장비 시트 — 공격력·체력 알약 */
  await p.evaluate(() => {
    try { closeTrain(); } catch (e) {}
    goTab('hero'); heroTab = 'eq'; renderEqPage();
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, `188-${R}-eq.png`) });

  await br.close();
  console.log('CAP188 ' + R + ' — hud/train/eq 3장');
})();
