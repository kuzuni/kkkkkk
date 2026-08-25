/* 작업 96 — 서브탭 공용화 캡처 하네스
 *
 * 1080x2280 (9:19) 로 네 화면의 서브탭 바를 각각 «바 주변만» 잘라 낸다.
 *   96-hero.png  07 스킬 시트 (기준 디자인)
 *   96-eq.png    06 장비 시트
 *   96-dun.png   03 던전 페이지
 *   96-shop.png  10 상점 페이지 (소환 탭)
 *   96-shop-coin.png 13 재화 탭
 *   96-all.png   네 바를 위아래로 이어 붙인 비교판 (전체 화면 4장 대신 이것만 보면 된다)
 * 그리고 전체 화면 1장씩도 남긴다(96-full-*.png) — 바가 화면 안에서 «과한지» 는 맥락이 필요하다.
 *
 * 실행: node tools/cap96.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = path.resolve(__dirname, '..', 'docs/review');

/* 바 주변 여백 — 위 60 / 아래 40 (탭바와의 관계까지 보이게) */
const PAD_T = 70, PAD_B = 60;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1200);

    const shot = async (name, sel, setup) => {
      await page.evaluate(setup);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, '96-full-' + name + '.png') });
      const box = await page.evaluate(s => {
        const b = document.querySelector(s).getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      }, sel);
      await page.screenshot({
        path: path.join(OUT, '96-' + name + '.png'),
        clip: { x: 0, y: Math.max(0, box.y - PAD_T), width: 1080, height: box.h + PAD_T + PAD_B },
      });
      console.log('96-' + name + '.png  bar ' + JSON.stringify(box));
    };

    await shot('hero', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); });
    await shot('eq', '#eqTabs', () => heroSubGo('eq'));
    await shot('dun', '#dunSub', () => { goTab('hero'); openDungeon(); });
    /* 던전 «레이드» 가 활성인 상태도 한 장 — 활성 표시가 좌우 어느 칸에서도 같은지 본다.
       ⚠ 상점을 열면 던전 페이지가 닫히므로(goTab 이 closeDungeon 한다) 반드시 던전 다음에 찍는다 */
    await shot('dun-raid', '#dunSub', () => document.querySelector('#dunSub [data-dsub="raid"]').click());
    await shot('shop', '#shopCats', () => openShopPage());
    await shot('shop-coin', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click());
  } finally {
    await browser.close();
  }
  console.log('\n캡처 완료 → docs/review/96-*.png');
})();
