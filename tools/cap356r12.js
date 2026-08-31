#!/usr/bin/env node
/* 356 12회차 캡처 — 04 던전 세부(`#dgdw`) · 08 코스튬 세부(`.sk8` 껍데기)를 «수리 전 / 수리 후» 짝으로
 *
 *   node tools/cap356r12.js     # docs/shots/356-r12-{04,08cos}-{before,after}.png
 *
 * 비평가에게 주는 것은 **ref + 수리 후** 이고(지시서 [3]-(나)), «수리 전» 은 회차 기록의 대조용이다.
 *   · 04 → `docs/ref/04-던전-세부-팝업.jpg`
 *   · 08 → `docs/ref/08-스킬-세부-팝업.jpg`(코스튬 세부는 같은 껍데기를 재사용한다 — UI-REFERENCE §50)
 * ⚠ 캡처 PNG 는 `.gitignore` 로 막혀 있다 — 커밋하지 마라(지시서 머리말). 증거는 review 의 수치로.
 *
 * «수리 전» 은 커밋을 되돌리지 않고 **옛 값을 도로 심어서** 만든다(verify356 [R11] 과 같은 css).
 * 제품 파일은 한 바이트도 안 건드린다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { STEP } = require('./scan356.js');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');

const SHOTS = [
  {
    id: '04', open: ['.tab[data-t="adv"]', 'js:openDunDetail(DUNGEONS[0])'],
    seen: () => document.querySelectorAll('#dgdw.on .dgd-ar>i').length, min: 2, seenName: '#dgdw.on .dgd-ar>i',
    old: '.dgd-ar i{transform:translateY(-1px) scaleX(1.19) !important}',
  },
  {
    id: '08cos', open: ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-cosit]', '#bCos [data-cosit]'],
    seen: () => document.querySelectorAll('#mbox .sk-ct .vl .nt b>img.cic').length, min: 1, seenName: '#mbox .sk-ct .nt b>img.cic',
    old: '.sk-ct b>.cic{transform:none !important}',
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium);

  for (const s of SHOTS) {
    for (const [tag, css] of [['before', s.old], ['after', null]]) {
      const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      for (const q of s.open) {
        const found = await STEP(page, q);
        if (!found) console.log(`  ⚠ ${s.id}/${tag}: 무음 실패 — '${q}'`);
        await page.waitForTimeout(550);
      }
      /* 진입 확인 — 조용히 실패한 클릭은 직전 화면을 찍는다(LESSONS 356-⑬) */
      const n = await page.evaluate(s.seen);
      if (n < s.min) { console.log(`  ✗ ${s.id}/${tag}: 진입 실패 (${s.seenName} ${n}개)`); await ctx.close(); continue; }
      if (css) {
        await page.evaluate((c) => { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); }, css);
        await page.waitForTimeout(250);
      }
      /* 04 배너 썸네일(169)·60 쥬시가 프레임마다 움직인다 — 멈추고 찍는다 */
      await page.evaluate(() => {
        for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
        for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
        window.requestAnimationFrame = () => 0;
      });
      await page.waitForTimeout(200);
      const f = path.join(OUT, `356-r12-${s.id}-${tag}.png`);
      await page.screenshot({ path: f });
      console.log(`  ✓ ${s.id}/${tag} → ${f}  (${s.seenName} ${n}개)`);
      await ctx.close();
    }
  }

  await b.close();
})();
