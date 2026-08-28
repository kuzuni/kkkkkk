/* 304 진단 프로브 — verify55 «쿠폰 재사용 차단»·«잘못된 코드 차단» 2건 FAIL 의 원인을 가른다.
   물음: 제품이 정말 안 막는가(제품 결함) vs 게이트가 옛 통보 경로(window.popup)를 훔쳐보는가(게이트 부패).
   사용: node tools/probe304.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve('index.html'), { waitUntil:'load' });
  await page.waitForTimeout(1200);

  const R = await page.evaluate(async () => {
    const out = {};
    const click = s => document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles:true }));
    openConf();
    if(!S.opt.cp) S.opt.cp = {};

    /* 두 경로를 동시에 엿본다 — 옛 popup 과 새 토스트(#fxl 의 .fx-toast) */
    const popMsgs = [], toastMsgs = [];
    const pp = window.popup; window.popup = (t, b) => popMsgs.push(b);
    const L = document.getElementById('fxl');
    const mo = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if(n.nodeType === 1 && n.classList.contains('fx-toast')) toastMsgs.push(n.textContent);
    })));
    if(L) mo.observe(L, { childList:true });
    out.hasLayer = !!L;

    const op = window.prompt;
    const dia0 = S.dia;

    window.prompt = () => 'HELLO2026';
    click('[data-cf="coupon"]');
    out.d1 = S.dia - dia0; out.cp1 = S.opt.cp.HELLO2026 || 0;

    click('[data-cf="coupon"]');                       /* 재사용 */
    out.d2 = S.dia - dia0; out.cp2 = S.opt.cp.HELLO2026 || 0;

    window.prompt = () => 'NOPE';
    click('[data-cf="coupon"]');                       /* 없는 코드 */
    out.d3 = S.dia - dia0; out.cpNope = ('NOPE' in S.opt.cp);
    out.cpKeys = Object.keys(S.opt.cp);

    window.prompt = op; window.popup = pp;
    await new Promise(r => setTimeout(r, 50));
    mo.disconnect();
    out.popMsgs = popMsgs; out.toastMsgs = toastMsgs;
    out.typeofNotify = typeof notify;
    return out;
  });

  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})();
