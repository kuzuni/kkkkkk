#!/usr/bin/env node
/* 356 15회차 캡처 — «사건이 있어야 뜨는 화면» 셋을 «수리 전 / 수리 후» 짝으로
 *
 *   node tools/cap356r15.js     # docs/shots/356-r15-{01,17,18}-{before,after}.png
 *
 * 비평가에게 주는 것은 **ref + 수리 후** 다(지시서 [3]-(나)). «수리 전» 은 회차 기록의 대조용.
 *   · 01 → `docs/ref/01-오프라인보상-팝업.jpg`
 *   · 17 → `docs/ref/17-스탯업-보너스-팝업-연출.jpg`
 *   · 18 → `docs/ref/18-패배-화면.jpg`
 * ⚠ 캡처 PNG 는 `.gitignore` 로 막혀 있다 — 커밋하지 마라(지시서 머리말). 증거는 review 의 수치로.
 *
 * «수리 전» 은 커밋을 되돌리지 않고 **옛 값을 도로 심어서** 만든다(cap356r12 와 같은 규율).
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
    id: '01', open: ['js:offlineReward(Date.now() - 3600e3)'],
    seen: () => document.querySelectorAll('#offw.on .ofr-fr b').length, min: 1, seenName: '#offw.on .ofr-fr b',
    old: '.ofr-fr b{transform:scaleY(.97) !important}',
  },
  {
    id: '17', open: ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })'],
    seen: () => document.querySelectorAll('#statw.on .st-icon>b').length, min: 1, seenName: '#statw.on .st-icon>b',
    old: '.st-icon>b{transform:scaleX(.86) !important}',
  },
  {
    id: '18', open: ['js:openDefeat()'],
    seen: () => document.querySelectorAll('#defw.on .df-card.c2 .df-ic>b.fl').length, min: 1, seenName: '#defw.on .df-card.c2 .fl',
    old: '.df-card.c2 .df-ic{transform:translate(10.5px,-1.5px) scale(.892,.885) !important}'
       + '.df-ic .fl{transform:translateX(-50%) scale(.82,.86) !important}',
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
        await page.waitForTimeout(600);
      }
      /* 진입 확인 — 조용히 실패한 진입은 직전 화면을 찍는다(LESSONS 356-⑬) */
      const n = await page.evaluate(s.seen);
      if (n < s.min) { console.log(`  ✗ ${s.id}/${tag}: 진입 실패 (${s.seenName} ${n}개)`); await ctx.close(); continue; }
      if (css) {
        await page.evaluate((c) => { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); }, css);
        await page.waitForTimeout(250);
      }
      /* 뒤 전투 씬·60 쥬시가 프레임마다 움직인다 — 멈추고 찍는다 */
      await page.evaluate(() => {
        for (const a of document.getAnimations()) { try { a.pause(); } catch (e) {} }
        for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
        window.requestAnimationFrame = () => 0;
      });
      await page.waitForTimeout(200);
      const f = path.join(OUT, `356-r15-${s.id}-${tag}.png`);
      await page.screenshot({ path: f });
      console.log(`  ✓ ${s.id}/${tag} → ${f}  (${s.seenName} ${n}개)`);
      await ctx.close();
    }
  }

  await b.close();
})();
