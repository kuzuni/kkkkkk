/* 167 진단 — 훈련 ↑(단계 돌파) 손가락 안내의 기하·수명을 시간축으로 찍는다.
   실행: node tools/probe167.js
   게이트(verify167)가 «되는가» 를 묻는다면 이쪽은 «어디에 어떻게 놓이는가» 를 본다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const READY = `Object.assign(S, DEF());
  S.trainStage = 1;
  TRAIN_STATS.forEach(k => S.lv[k] = trainCap());
  S.gold = 1e12;`;

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof fxHand === 'function' && typeof trHandSync === 'function');
  await p.waitForTimeout(400);

  console.log('로드 직후 콘솔 에러:', errs.length ? errs : '0건');

  await p.evaluate(READY);
  await p.evaluate(() => { gmCloseAll(); openTrain(); });
  await p.waitForTimeout(600);

  const geo = await p.evaluate(() => {
    const bb = n => { if (!n) return null; const q = n.getBoundingClientRect();
      return { x: +q.left.toFixed(1), y: +q.top.toFixed(1), w: +q.width.toFixed(1), h: +q.height.toFixed(1) }; };
    const f = document.getElementById('app').getBoundingClientRect();
    const rel = b => b && { x: +((b.x - f.left) / (f.width / 1080)).toFixed(1),
                            y: +((b.y - f.top) / (f.width / 1080)).toFixed(1),
                            w: +(b.w / (f.width / 1080)).toFixed(1),
                            h: +(b.h / (f.width / 1080)).toFixed(1) };
    const hand = document.getElementById('fxHand');
    const inner = hand && hand.querySelector('i');
    const up = document.getElementById('trUp');
    const overlap = (a, b) => {
      if (!a || !b) return 0;
      const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      return +((w * h) / (b.w * b.h) * 100).toFixed(1);
    };
    const hb = bb(inner), tb = bb(up);
    const frame = { w: +(f.width).toFixed(1), h: +(f.height).toFixed(1), fw: 1080,
                    fh: +(f.height / (f.width / 1080)).toFixed(1) };
    /* 손 몸통이 덮는 이웃 — 카드 3장·배수 탭 */
    const nb = [...document.querySelectorAll('#trCards .tr-card, #trQty .q')].map(n => ({
      k: n.dataset.tr || n.dataset.trq, ov: overlap(bb(inner), bb(n)) }));
    return {
      frame,
      trUp: rel(tb), hand: rel(hb), ring: rel(bb(document.getElementById('fxHandR'))),
      tag: gmHand && gmHand.tag, ms: gmHand && gmHand.ms,
      handOverTarget: overlap(hb, tb),          /* 손이 화살표 자신을 몇 % 덮나 */
      neighbours: nb,
      inFrame: hb ? (hb.x >= f.left - 1 && hb.x + hb.w <= f.right + 1
                  && hb.y >= f.top - 1 && hb.y + hb.h <= f.bottom + 1) : null,
      elementAtTip: (() => {
        if (!tb) return null;
        const e = document.elementFromPoint(tb.x + tb.w / 2, tb.y + tb.h / 2);
        return e ? (e.id || e.className || e.tagName) : null;
      })()
    };
  });
  console.log(JSON.stringify(geo, null, 1));

  /* 수명 — 113 의 8초를 넘겨서도 살아 있는지 */
  await p.waitForTimeout(9000);
  const alive = await p.evaluate(() => !!document.getElementById('fxHand'));
  console.log('9초 뒤 손 생존(167 은 조건형이라 살아 있어야 한다):', alive);

  /* 눌러서 단계 돌파 → 사라져야 한다 */
  await p.evaluate(() => { const r = document.getElementById('trUp').getBoundingClientRect();
    document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); });
  const box = await p.$('#trUp');
  await box.click();
  await p.waitForTimeout(700);
  console.log('↑ 클릭 뒤 — 단계:', await p.evaluate(() => S.trainStage),
              '· 손:', await p.evaluate(() => !!document.getElementById('fxHand')));

  console.log('최종 콘솔 에러:', errs.length ? errs : '0건');
  await browser.close();
})();
