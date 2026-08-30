#!/usr/bin/env node
/* 재현 7 — 493 이 `verify301` [5] «토스트가 같은 사실을 말한다» 를 빨갛게 만들었다(34/34 → 33/34).
 * 수리 전 트리에서는 초록이므로 **내 변경이 만든 것**이다(338·344 규칙 — 대조 실행으로 확인했다).
 * 무엇이 토스트를 지우는가를 시간축으로 본다.
 *   node tools/probe493g.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');
const KEY = 'idle_hunter_save_v4';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5000, dia: 300, best: 18, att: { n: 0, date: '' },
      pass: { got: {}, prem: {} } })]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => openPass('stage'));
  await p.waitForTimeout(250);

  /* ── verify301 [5] 와 **같은 경로**로 한 번 — playwright 의 click + 400ms 대기 ── */
  await p.evaluate(() => {
    const real = notify;
    window.__log = [];
    notify = txt => { window.__log.push({ txt: String(txt).slice(0, 24), at: performance.now() }); return real(txt); };
    window.__clickAt = 0;
  });
  await p.evaluate(() => { window.__clickAt = performance.now(); });
  await p.click('#psAll');
  const afterClick = await p.evaluate(() => ({
    t: Math.round(performance.now() - window.__clickAt),
    notifyAt: window.__log.map(l => Math.round(l.at - window.__clickAt) + 'ms «' + l.txt + '»'),
    fxl: (document.getElementById('fxl').textContent || '').slice(0, 40)
  }));
  await p.waitForTimeout(400);
  const at400 = await p.evaluate(() => ({
    t: Math.round(performance.now() - window.__clickAt),
    fxl: (document.getElementById('fxl').textContent || '').slice(0, 40)
  }));
  console.log('verify301 [5] 경로 재현');
  console.log('  notify 호출: ' + JSON.stringify(afterClick.notifyAt));
  console.log('  click 반환 직후 t=' + afterClick.t + 'ms  fxl «' + afterClick.fxl + '»');
  console.log('  +400ms 뒤    t=' + at400.t + 'ms  fxl «' + at400.fxl + '»');
  console.log('');

  await p.evaluate(() => { S.pass.got = {}; S.best = 18; renderPass(); });
  await p.waitForTimeout(1600);
  const t0 = await p.evaluate(() => { window.__t = performance.now(); document.getElementById('psAll').click(); return 1; });
  const line = [];
  for (let i = 0; i < 14; i++) {
    await p.waitForTimeout(120);
    line.push(await p.evaluate(() => ({
      t: Math.round(performance.now() - window.__t),
      toasts: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent.slice(0, 28)),
      fxl: (document.getElementById('fxl').textContent || '').slice(0, 40),
      kids: document.getElementById('fxl').children.length
    })));
  }
  console.log('클릭 후 #fxl 시간축 (' + t0 + ')');
  line.forEach(l => console.log('  t=' + String(l.t).padStart(5) + 'ms  자식 ' + l.kids
    + '  토스트 ' + JSON.stringify(l.toasts) + '  fxl «' + l.fxl + '»'));
  await browser.close();
})();
