#!/usr/bin/env node
/* 356 16회차 캡처 — 12 소환 결과 «수리 전 / 수리 후» 짝
 *
 *   node tools/cap356r16.js
 *     docs/shots/356-r16-12-{before,after}.png        전체 1080×2280
 *     docs/shots/356-r16-12-zoom-{before,after}.png   [10회]·[30회] 버튼 띠 확대(DSF 4)
 *
 * 비평가에게 주는 것은 **ref + 수리 후**다(지시서 [3]-(나)). «수리 전» 은 회차 기록의 대조용.
 *   · 12 → `docs/ref/12-소환-결과-팝업.jpg`
 * ⚠ **확대 컷이 필요하다** — 이 회차가 고친 것은 52px 젬의 **1.7%**(가로 1px 남짓)라
 *   전체 컷에서는 두 상태가 사람 눈에 같다. 15회차 01·17·18 과 다른 점이 이것이다.
 * ⚠ 캡처 PNG 는 `.gitignore` 로 막혀 있다 — 커밋하지 마라(지시서 머리말). 증거는 review 의 수치로.
 *
 * «수리 전» 은 커밋을 되돌리지 않고 **옛 값을 도로 심어서** 만든다(cap356r12·r15 규율).
 * 제품 파일은 한 바이트도 안 건드린다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { STEP } = require('./scan356.js');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');

const OPEN = ['js:doSummonFree("skill", 10, true)'];
const SEEN = () => document.querySelectorAll('#sumw.on #sumB10>.gem>.cic, #sumw #sumB10>.gem>.cic').length;
const OLD = '.sm-b .gem{transform:scaleX(.983) !important}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium);

  for (const [tag, css] of [['before', OLD], ['after', null]]) {
    for (const dsf of [1, 4]) {
      const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: dsf });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      for (const q of OPEN) {
        const found = await STEP(page, q);
        if (!found) console.log(`  ⚠ ${tag}/DSF${dsf}: 무음 실패 — '${q}'`);
        await page.waitForTimeout(600);
      }
      /* 진입 확인 — 조용히 실패한 진입은 직전 화면을 찍는다(LESSONS 356-⑬) */
      const n = await page.evaluate(SEEN);
      if (n < 1) { console.log(`  ✗ ${tag}/DSF${dsf}: 진입 실패 (#sumB10>.gem>.cic ${n}개)`); await ctx.close(); continue; }
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

      if (dsf === 1) {
        const f = path.join(OUT, `356-r16-12-${tag}.png`);
        await page.screenshot({ path: f });
        console.log(`  ✓ 전체/${tag} → ${f}`);
      } else {
        /* 두 버튼 띠만 잘라 확대 — 잉크 52px 이 DSF4 에서 208px 이 되어 1px 차가 보인다 */
        const box = await page.evaluate(() => {
          const a = document.querySelector('#sumB10'), z = document.querySelector('#sumB30');
          if (!a || !z) return null;
          const ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect();
          return { x: Math.floor(ra.left - 10), y: Math.floor(Math.min(ra.top, rz.top) - 10),
                   width: Math.ceil(rz.right - ra.left + 20), height: Math.ceil(Math.max(ra.bottom, rz.bottom) - Math.min(ra.top, rz.top) + 20) };
        });
        if (!box) { console.log(`  ✗ ${tag}/DSF4: 버튼 상자를 못 잡았다`); await ctx.close(); continue; }
        const f = path.join(OUT, `356-r16-12-zoom-${tag}.png`);
        await page.screenshot({ path: f, clip: box });
        console.log(`  ✓ 확대/${tag} → ${f}  (clip ${box.width}×${box.height} @ DSF4)`);
      }
      await ctx.close();
    }
  }

  await b.close();
})();
