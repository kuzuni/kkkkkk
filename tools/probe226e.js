#!/usr/bin/env node
/* 226 되돌림 시험(양성 대조, 221-③ 선례) — 연출을 **10배 늘려** 창을 확실히 물리게 만든 뒤
 * 옛 식(고정 대기 500ms)과 새 식(기하 정지 폴링)을 나란히 잰다.
 *
 *   node tools/probe226e.js [반복횟수]
 *
 * `.jz-st{animation-duration:2s}` 로 덮으면 마지막 칸의 배율 창이 클릭 후 ≈0.5~2.5s 로 넓어진다.
 * 기대: **옛 식은 매번 FAIL**(want 가 4~5 부풂) · **새 식은 매번 PASS**(수렴 뒤 586).
 * 옛 식이 여기서도 초록이면 진단이 틀린 것이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const N = Math.max(1, parseInt(process.argv[2] || '3', 10));
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const browser = await launch(chromium);
  let oldFail = 0, newFail = 0;
  for (let run = 1; run <= N; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof S !== 'undefined');
    await page.waitForTimeout(400);
    /* 양성 대조 — 카드 스태거만 10배로 늘린다(제품 파일은 안 건드린다) */
    await page.addStyleTag({ content: '.jz-st{animation-duration:2s !important}' });
    await page.evaluate(() => { closeShopPage(); goTab('hero'); heroSubGo('pet'); });
    await page.waitForTimeout(450);

    const r = await page.evaluate(async () => {
      const meas = () => {
        const li = document.getElementById('shopList');
        const i = SHOP_BOXES.findIndex(x => x.b === 'pet'), card = li.children[i];
        const top = card.offsetTop - li.children[0].offsetTop;
        return { scrolled: li.scrollTop, sh: li.scrollHeight,
                 want: Math.max(0, Math.min(top, li.scrollHeight - li.clientHeight)),
                 scale: getComputedStyle(card).scale };
      };
      document.querySelector('#bPet [data-ptsum]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      /* 옛 식은 «어느 한 순간» 을 재는 식이다 — 늘어난 창(≈0.5~2.5s)을 프레임마다 훑어
         «그 순간이 언제였느냐에 따라 초록도 빨강도 된다» 는 성질 자체를 뽑는다.
         (고정 대기 한 점만 재면 축소 구간 scale .94 에 서서 조용히 초록이 된다 — 그게 원래 증상의 절반이다) */
      const sweep = [];
      { const t1 = performance.now();
        while (performance.now() - t1 < 3000) {
          await new Promise(x => requestAnimationFrame(x));
          sweep.push(Object.assign({ t: Math.round(performance.now() - t1) }, meas()));
        } }
      const worst = sweep.reduce((a, b) => Math.abs(b.want - b.scrolled) > Math.abs(a.want - a.scrolled) ? b : a, sweep[0]);
      const badN = sweep.filter(x => Math.abs(x.want - x.scrolled) > 2).length;
      const before = Object.assign({ badN, frames: sweep.length }, worst);
      const rd = () => { const li = document.getElementById('shopList');
        const last = li.children[li.children.length - 1], b = last.getBoundingClientRect();
        return [li.scrollHeight, li.clientHeight, li.scrollTop, b.top.toFixed(3), b.bottom.toFixed(3)].join(','); };
      let prev = rd(), same = 0; const t0 = performance.now();
      while (performance.now() - t0 < 4000) {
        await new Promise(x => requestAnimationFrame(x));
        const cur = rd();
        if (cur === prev) { if (++same >= 4) break; } else { same = 0; prev = cur; }
      }
      return { before, after: meas(), ms: Math.round(performance.now() - t0) };
    });

    const o = near(r.before.scrolled, r.before.want, 2), n = near(r.after.scrolled, r.after.want, 2);
    if (!o) oldFail++;
    if (!n) newFail++;
    console.log('run ' + run + '  옛(최악 프레임 ' + r.before.t + 'ms · 빨간 프레임 '
      + r.before.badN + '/' + r.before.frames + '): ' + r.before.scrolled + ' ≈ ' + r.before.want
      + ' [sh=' + r.before.sh + ' scale=' + r.before.scale + '] ' + (o ? 'PASS' : 'FAIL')
      + '   새(settle ' + r.ms + 'ms): ' + r.after.scrolled + ' ≈ ' + r.after.want
      + ' [sh=' + r.after.sh + ' scale=' + r.after.scale + '] ' + (n ? 'PASS' : 'FAIL'));
    await ctx.close();
  }
  console.log('\n옛 식 FAIL ' + oldFail + '/' + N + '  ·  새 식 FAIL ' + newFail + '/' + N
    + '   (기대: 옛 ' + N + '/' + N + ' · 새 0/' + N + ')');
  await browser.close();
})();
