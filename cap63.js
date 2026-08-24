/* 63 탭바 상단 검정 테두리 — 상태 5종 캡처 + 탭바 상단 기하 실측 (1080x1920)
 *   node cap63.js <접두사>      → docs/review/<접두사>-{main,train,shop,equip,skill}.png
 * 각 상태에서 #tabbar 의 border-box / 화면 y 와 캡처 위 탭바 상단 y 를 함께 덤프한다.
 */
const { chromium } = require('playwright');
const path = require('path');

const STATES = [
  { key: 'main',  open: null },
  { key: 'train', open: () => { openTrain(); } },
  { key: 'shop',  open: () => { document.querySelector('.tab[data-t="shop"]').click(); } },
  { key: 'equip', open: () => { document.querySelector('.tab[data-t="hero"]').click(); } },
  { key: 'skill', open: () => { document.querySelector('.tab[data-t="hero"]').click();
                                document.querySelector('#eqTabs [data-eqtab="sk"]').click(); } },
];

(async () => {
  const pre = process.argv[2] || '63-r1';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const geo = {};
  for (const st of STATES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(st.key + ': ' + m.text()); });
    page.on('pageerror', e => errs.push(st.key + ': PAGEERROR ' + e.message));
    await page.addInitScript(() => {
      localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
        gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1,
        lv: { atk: 98 }, buyQty: 1, autoBuy: false, tuto: 3,
        seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
      }));
    });
    await page.goto('file://' + path.resolve('index.html'));
    await page.waitForTimeout(900);
    if (st.open) { await page.evaluate(st.open); await page.waitForTimeout(700); }
    // 캔버스 데미지 숫자가 픽셀 스캔을 오염시킨다 (28 교훈 ③)
    await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `docs/review/${pre}-${st.key}.png` });
    geo[st.key] = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
        return { y: +b.y.toFixed(1), h: +b.height.toFixed(1) }; };
      const cs = el => { if (!el) return null; const c = getComputedStyle(el);
        return { borderTop: c.borderTopWidth, bg: c.backgroundImage.slice(0, 120) }; };
      const tb = document.getElementById('tabbar');
      const out = { tabbar: r(tb), tabbarStyle: cs(tb) };
      // 탭 내부 밴드 기준점 — 아이콘/라벨 박스 y (밴드 시프트 검출용)
      const t0 = document.querySelector('.tab[data-t="hero"]');
      out.ti = r(t0 && t0.querySelector('.ti'));
      out.tl = r(t0 && t0.querySelector('.tl'));
      // 열려 있는 바닥 시트의 아래끝
      ['.tr-sheet', '.eqp', '#panel', '#shopw'].forEach(s => {
        const e = document.querySelector(s);
        if (e && e.getBoundingClientRect().height > 0) out[s] = r(e);
      });
      /* 유휴 루프가 굴리는 값(닉네임 U_+Date.now() · 시설 타이머 · 스킬 슬롯 쿨다운)은
         픽셀 대조에서 빼야 한다 — LESSONS 51-③. 하드코딩 대신 DOM 에서 사각형을 뜬다. */
      const box = el => { if (!el) return null; const b = el.getBoundingClientRect();
        return [Math.floor(b.left) - 2, Math.floor(b.top) - 2, Math.ceil(b.right) + 2, Math.ceil(b.bottom) + 2]; };
      out._volatile = ['#nickN', '#facTm', '#slots', '#stinfo'].map(s => box(document.querySelector(s))).filter(Boolean);
      return out;
    });
  }
  require('fs').writeFileSync(`docs/review/${pre}-geo.json`, JSON.stringify(geo, null, 1));
  console.log(JSON.stringify(geo, null, 1));
  console.log('CONSOLE_ERRORS:', errs.length, errs.slice(0, 5));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
