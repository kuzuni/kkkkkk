/* 작업 272 캡처 하네스 — 스킬 슬롯 해금 표시(자물쇠/[+])를 눈으로 본다.
 *   272-sheet-low.png   07 스킬 시트 · 스테이지 1 (2칸 해금)
 *   272-sheet-high.png  07 스킬 시트 · 스테이지 80 (8칸 해금)
 *   272-hud-low.png     하단 HUD 슬롯 줄 · 스테이지 1
 *   272-hud-high.png    하단 HUD 슬롯 줄 · 스테이지 80
 * 실행: node tools/cap272.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = path.resolve(__dirname, '..', 'docs/review');

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1200);

    const setup = best => page.evaluate(b => {
      Object.assign(S, DEF());
      S.best = b; S.stage = b;
      S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
      S.eqSkill = [];
      /* «해금된 빈 칸([+])» 이 반드시 한 칸 보이도록 해금 칸보다 하나 적게 채운다 */
      SKILLS.slice(0, 8).forEach(s => { if (S.eqSkill.length < skSlotMax() - 1) toggleEquip(s, 'skill'); });
      buildSlots(); uiDirty = true; renderUI();
    }, best);

    const sheet = async (name, best) => {
      await setup(best);
      await page.evaluate(() => gmHero('sk'));
      await page.waitForTimeout(700);
      const box = await page.evaluate(() => {
        const b = document.querySelector('#bSk .sk-eqp').getBoundingClientRect();
        return { y: b.y, h: b.height };
      });
      await page.screenshot({ path: path.join(OUT, '272-sheet-' + name + '.png'),
                              clip: { x: 0, y: Math.max(0, box.y - 40), width: 1080, height: box.h + 140 } });
      console.log('272-sheet-' + name + '.png');
    };

    const hud = async (name, best) => {
      await page.evaluate(() => gmCloseAll());
      await setup(best);
      await page.waitForTimeout(500);
      const box = await page.evaluate(() => {
        const b = document.getElementById('slots').getBoundingClientRect();
        return { y: b.y, h: b.height };
      });
      await page.screenshot({ path: path.join(OUT, '272-hud-' + name + '.png'),
                              clip: { x: 0, y: Math.max(0, box.y - 20), width: 1080, height: box.h + 40 } });
      console.log('272-hud-' + name + '.png');
    };

    await sheet('low', 1);
    await sheet('high', 80);
    await hud('low', 1);
    await hud('high', 80);
  } finally {
    await browser.close();
  }
})();
