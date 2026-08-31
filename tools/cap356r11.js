#!/usr/bin/env node
/* 356 11회차 캡처 — 56 절전(`#svw`) 을 «수리 전 / 수리 후» 짝으로 찍는다
 *
 *   node tools/cap356r11.js            # docs/shots/356-r11-56-{before,after}.png
 *
 * 비평가에게 주는 것은 **ref + 수리 후** 이고(지시서 [3]-(나)), «수리 전» 은 회차 기록의
 * 대조용이다. ⚠ 캡처 PNG 는 `.gitignore` 로 막혀 있다 — 커밋하지 마라(지시서 머리말).
 * 증거는 review 의 수치로 남긴다.
 *
 * «수리 전» 은 커밋을 되돌리지 않고 **옛 `scaleX` 를 도로 심어서** 만든다
 * (verify356 [R9] 와 같은 css). 제품 파일은 한 바이트도 안 건드린다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');
const OPEN = ['#menub', '#mnw [data-mn="saver"]'];

const OLD = '#svw .sv-st>s>em{transform:scaleX(1.19) !important}'
          + '#svw .sv-r:nth-of-type(1)>u{transform:scaleX(.706) !important}'
          + '#svw .sv-r:nth-of-type(2)>u{transform:scaleX(.862) !important}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium);

  for (const [tag, css] of [['before', OLD], ['after', null]]) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    for (const q of OPEN) {
      const found = await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, q);
      if (!found) console.log(`  ⚠ 무음 실패 — '${q}'`);
      await page.waitForTimeout(550);
    }
    /* 진입 확인 — 조용히 실패한 클릭은 메뉴 시트를 찍는다(LESSONS 356-⑬) */
    const n = await page.evaluate(() => document.querySelectorAll('#svw .sv-r>u').length);
    if (n < 3) { console.log(`  ✗ ${tag}: 진입 실패 (#svw .sv-r>u ${n}개)`); await ctx.close(); continue; }
    if (css) {
      await page.evaluate((c) => { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); }, css);
      await page.waitForTimeout(250);
    }
    /* 절전 화면은 시계·방치 시간이 **라이브**라 프레임마다 글자가 바뀐다 — 멈추고 찍는다 */
    await page.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    await page.waitForTimeout(200);
    const f = path.join(OUT, `356-r11-56-${tag}.png`);
    await page.screenshot({ path: f });
    console.log(`  ✓ ${tag} → ${f}  (#svw .sv-r>u ${n}개)`);
    await ctx.close();
  }

  await b.close();
})();
