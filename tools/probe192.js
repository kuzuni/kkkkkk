/* 192 조사용 프로브 — 09 일괄 강화 결과 팝업의 펫 칸 실측.
   실행: node tools/probe192.js   (게이트가 아니라 «지금 상태를 재는» 도구다)

   재는 것: ① 카드별 내용(캔버스/이모지) ② 캔버스 잉크 bbox(px) ③ 97-⑤ «곱한 뒤 잉크 평균 휘도
   vs 그 칸 배경 휘도» ④ 이모지 칸의 잉크 bbox(비교 기준 — 레퍼런스 51~65) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 카드를 통째로 캡처해 «카드 배경색과 다른 픽셀» 을 잉크로 본다 — 이모지도 캔버스도 같은 자로 잰다. */
const CARD_INK = () => {
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [...document.querySelectorAll('#upCards .upr-cel')].map((cel, i) => {
    const b = cel.querySelector('.upr-card > b');
    const cv = b.querySelector('canvas');
    const out = { i, kind: cv ? 'canvas' : 'emoji', sp: cv ? cv.dataset.usp : null, txt: cv ? '' : b.textContent };
    if (cv) {
      const g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, s = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const p = (y * cv.width + x) * 4;
        if (d[p + 3] < 8) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        n++; s += lum(d[p], d[p + 1], d[p + 2]);
      }
      out.ink = n ? { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, px: n, lum: Math.round(s / n * 10) / 10 } : null;
    }
    return out;
  });
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);

  /* sp 3종(bird/robo/dragon)을 한 장씩 보유 + 재료 넉넉히 */
  const seeded = await p.evaluate(() => {
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
    save(); uiDirty = true;
    return pick.map(x => ({ id: x.id, n: x.n, sp: x.sp, tint: x.tint }));
  });
  console.log('보유시킨 펫:', seeded.map(x => `${x.id}/${x.sp}/${x.tint}`).join(' · '));

  /* 실사용 경로 — 영웅 탭 → 동료 서브탭 → [일괄 강화] 진짜 클릭 */
  await p.evaluate(() => { goTab('hero'); heroSubGo('pet'); });
  await p.waitForTimeout(400);
  await (await p.$('[data-ptup]')).click();
  await p.waitForTimeout(600);

  const cardBg = await p.evaluate(() => getComputedStyle(document.querySelector('#upCards .upr-card')).backgroundImage.slice(0, 60));
  console.log('카드 배경:', cardBg);
  console.log('펫 카드:', JSON.stringify(await p.evaluate(CARD_INK), null, 1));
  /* 카드 3칸 그룹만 잘라 남긴다(.upr-grp top 928 + 카드 top 131 → 프레임 y1059, 카드 137+레벨 28). */
  await p.screenshot({ path: path.resolve(__dirname, '../docs/review/' + (process.env.P192_TAG || '192-펫카드') + '.png'),
                       clip: { x: 300, y: 1040, width: 480, height: 210 } });

  /* 비교군 — 무기(이모지 ic) 일괄 강화 */
  await p.evaluate(() => { closeUpAll(); S.dia = 1e9; EQUIPS.slice(0, 3).forEach(e => S.own[e.id] = { n: 5000, l: 1 }); save(); });
  await p.evaluate(() => { const r = levelUpAll(EQUIPS.slice(0, 3)); openUpAll(r.ups); });
  await p.waitForTimeout(400);
  console.log('이모지 카드:', JSON.stringify(await p.evaluate(CARD_INK)));
  console.log('에러:', errs.length, errs.slice(0, 3));
  await browser.close();
})();
