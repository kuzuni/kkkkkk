/* 작업 135 진단용 프로브 — smoke [3] 과 같은 순서로 오버레이를 열고
   `#chList` 의 프레임 대비 top/bottom 과 그 순간 걸린 애니메이션을 시간축으로 찍는다.
   (일회성 조사 도구. 게이트가 아니다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const W = +(process.argv[2] || 1080), H = +(process.argv[3] || 2280);
  const fs = require('fs');
  const ep = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean).find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
  const browser = await launch(chromium, ep ? { executablePath: ep } : {});
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [console] ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  for (const fn of ['openColl21("armor")', 'openBless()', 'openBag()', 'openMail()', 'openConf()', 'openRank()', 'openChat()']) {
    await page.evaluate(f => { try { eval(f); } catch (_) {} }, fn);
  }
  const t0 = Date.now();
  const rows = [];
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => {
      const app = document.getElementById('app'), l = document.getElementById('chList');
      if (!app || !l) return null;
      const A = app.getBoundingClientRect(), r = l.getBoundingClientRect();
      const chw = document.getElementById('chw');
      const an = (e) => e ? e.getAnimations().map(a => (a.animationName || '?') + ':' + a.playState
        + '@' + Math.round(a.currentTime || 0)) : [];
      return {
        top: +(r.top - A.top).toFixed(1), bot: +(r.bottom - A.bottom).toFixed(1),
        cls: chw.className, anChw: an(chw), anList: an(l),
      };
    });
    rows.push({ t: Date.now() - t0, ...s });
    await page.waitForTimeout(50);
  }
  for (const r of rows) {
    if (Math.abs(r.top) < 0.6 && r.anList.length === 0 && r.anChw.length === 0) continue;   /* 조용한 구간은 생략 */
    console.log(`t=${String(r.t).padStart(4)} top=${String(r.top).padStart(7)} bot=${String(r.bot).padStart(8)}`
      + ` cls="${r.cls}" chw[${r.anChw.join(' ')}] list[${r.anList.join(' ')}]`);
  }
  const bad = rows.filter(r => r.top < -1.5);
  console.log(`\n프레임 밖(top<-1.5) 표본 ${bad.length}/${rows.length}` +
    (bad.length ? ` — t ${bad[0].t}~${bad[bad.length - 1].t}ms` : ''));
  await browser.close();
})();
