#!/usr/bin/env node
/* 150 캡처 — «숫자 그대로» 표기가 실제로 어떻게 보이는지 증거 3장.
   실행: node tools/cap150.js [회차]   (기본 r1 → docs/review/150-r1-*.png)

   상태는 방치형 중후반(골드 4.2e12 · 다이아 1.8e7 · 유물조각 9.6e5)으로 고정한다 —
   골드는 알파벳(«4.20D»), 나머지는 쉼표(«18,000,000»)가 한 화면에 같이 나오는 상태다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const R = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/review');
const FILE = 'file://' + path.resolve(__dirname, '../index.html');

const STATE = { gold: 4.2e12, dia: 1.8e7, relic: 9.6e5 };

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const set = async () => p.evaluate(st => {
    S.gold = st.gold; S.dia = st.dia; S.relic = st.relic;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia; fxDisp.relic = S.relic;
    markDirty(); drawHud(); renderUI();
  }, STATE);

  await set();
  await p.waitForTimeout(300);
  /* ① 상단 HUD — 골드 알약(알파벳) 과 다이아 알약(숫자 그대로)이 나란히 */
  await p.screenshot({ path: path.join(OUT, `150-${R}-hud.png`), clip: { x: 0, y: 0, width: 1080, height: 190 } });

  /* ② 가방 — 재화 4행 배지(골드만 접힘) */
  await p.evaluate(() => { try { openBag(); } catch (e) {} });
  await p.waitForTimeout(500);
  await set();
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, `150-${R}-bag.png`) });
  await p.evaluate(() => { try { closeBag(); } catch (e) {} });

  /* ③ 프로필 종합 스탯 — 데미지·체력·전투력이 전부 숫자 그대로 */
  await p.evaluate(() => { try { document.getElementById('profBtn').click(); } catch (e) {} });
  await p.waitForTimeout(400);
  await p.evaluate(() => { try { document.querySelector('.pf-tgl>.lb').click(); } catch (e) {} });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, `150-${R}-stat.png`) });

  console.log('저장: docs/review/150-' + R + '-{hud,bag,stat}.png');
  await br.close();
})();
