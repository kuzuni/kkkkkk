#!/usr/bin/env node
/* 226 진단 — `verify106` G6 «펫 상자 카드까지 스크롤» 이 왜 뜨고 지는가.
 *
 *   node tools/probe226.js [반복횟수]
 *
 * G6 은 제품(`openShopPage(focus)`)이 **스크롤 직후에 계산한 값**과
 * 게이트가 **500ms 뒤에 다시 계산한 값**을 비교한다. 두 계산식은 글자 그대로 같다:
 *     top  = card.offsetTop − children[0].offsetTop
 *     want = clamp(top, 0, scrollHeight − clientHeight)
 * 그런데도 어긋난다면 **그 사이에 리스트 기하가 변했다**는 뜻이다(펫 상자는 마지막 칸이라
 * 거의 항상 클램프에 걸리므로, 어긋남 = `scrollHeight − clientHeight` 의 변화다).
 *
 * 이 도구는 openShopPage 직후부터 800ms 동안 리스트 기하를 표본으로 찍어
 * «무엇이 언제 몇 px 움직이는가» 를 텍스트로 뽑는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const N = Math.max(1, parseInt(process.argv[2] || '4', 10));

(async () => {
  const browser = await launch(chromium);
  for (let run = 1; run <= N; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
    await page.waitForTimeout(400);

    /* verify106 [G] 와 같은 경로: 영웅 탭 → 펫 서브탭 → [펫 소환] 버튼 */
    await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
    await page.waitForTimeout(450);

    const rows = await page.evaluate(async () => {
      const snap = t => {
        const li = document.getElementById('shopList');
        const i = SHOP_BOXES.findIndex(x => x.b === 'pet');
        const card = li.children[i], first = li.children[0];
        const top = card ? card.offsetTop - first.offsetTop : -1;
        return { t, scrollTop: li.scrollTop, sh: li.scrollHeight, ch: li.clientHeight,
                 max: li.scrollHeight - li.clientHeight, top,
                 want: Math.max(0, Math.min(top, li.scrollHeight - li.clientHeight)),
                 cardH: card ? card.offsetHeight : -1, firstTop: first ? first.offsetTop : -1,
                 padB: parseFloat(getComputedStyle(li).paddingBottom) || 0,
                 fx: document.querySelectorAll('#shopList .jz-pop, #shopList [class*="jz"]').length,
                 anim: document.getElementById('shopw').className };
      };
      const b = document.querySelector('#bPet [data-ptsum]');
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const out = [snap(0)];
      for (const dt of [16, 34, 50, 100, 200, 300, 400, 500, 650, 800]) {
        await new Promise(r => setTimeout(r, dt - out[out.length - 1].t));
        out.push(snap(dt));
      }
      return out;
    });

    console.log('--- run ' + run + ' ---');
    for (const r of rows) {
      console.log(String(r.t).padStart(4) + 'ms  scrollTop=' + String(r.scrollTop).padStart(6)
        + '  sh=' + String(r.sh).padStart(5) + '  ch=' + String(r.ch).padStart(5)
        + '  max=' + String(r.max).padStart(5) + '  top=' + String(r.top).padStart(5)
        + '  want=' + String(r.want).padStart(5) + '  cardH=' + r.cardH
        + '  firstTop=' + r.firstTop + '  padB=' + r.padB + '  cls=' + r.anim);
    }
    await ctx.close();
  }
  await browser.close();
})();
