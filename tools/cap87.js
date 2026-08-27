/* 작업 87 — 코스튬 50종 격자 캡처(기록용. 레퍼런스가 없는 화면이라 채점용이 아니다).
 *   node tools/cap87.js  → docs/review/87-r1.png(맨 위) · 87-r2.png(중간) · 87-r3.png(맨 아래) · 87-r4.png(상세)
 * 지시서 ⑥ «61 팝업 캡처(스크롤 3구간)» 를 위한 것.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const out = n => path.resolve(__dirname, '..', 'docs', 'review', n);

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  /* 절반쯤 모은 계정 — 보유/미보유/조건 잠금이 한 화면에 같이 나오게 */
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, JSON.stringify({
    avatar: 'av2', dia: 3e6, stage: 70, best: 70, rank: 2,
    avatars: { av0:1, av1:1, av2:1, av6:1, av7:1, av9:1, av12:1, av17:1, av20:1, av26:1, av3:1, av35:1, av4:1 }
  })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1000);
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(700);
  /* 전투 캔버스의 데미지 숫자가 캡처를 오염시킨다(LESSONS 28-③) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  const set = async y => { await page.evaluate(t => { const gp = document.querySelector('#bCos .sk-gp');
    gp.scrollTop = t; gp.dispatchEvent(new Event('scroll')); }, y); await page.waitForTimeout(250); };
  await set(0);    await page.screenshot({ path: out('87-r1.png') });
  await set(1150); await page.screenshot({ path: out('87-r2.png') });
  await set(1e5);  await page.screenshot({ path: out('87-r3.png') });
  /* 상세(08 껍데기) — 조건 해금이 걸린 카드로 */
  await page.evaluate(() => { const id = AVATARS.find(a => a.req).id;
    document.querySelector('[data-cosit="' + id + '"]').click();
    document.querySelector('[data-cosit="' + id + '"]').click(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('87-r4.png') });
  await browser.close();
  console.log('CAP87 OK — docs/review/87-r{1,2,3,4}.png');
})();
