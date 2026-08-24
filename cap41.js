/* 41 — 03/14 팝업 내장 재화 바 캡처 + DOM 실측.
   node cap41.js [dun|rel]   → docs/review/41-r{N}-{dun|rel}.png + 좌표 JSON 출력 */
const { chromium } = require('playwright');
const path = require('path');

const which = process.argv[2] || 'dun';
const tag = process.argv[3] || 'r1';
/* 레퍼런스와 같은 문자열로 맞춰야 폭 비교가 유효하다 (04 교훈 1) */
const REF_TXT = process.argv[4] === 'live' ? null : { g: '40.77A', d: '1,300' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);

  await page.evaluate((w) => {
    if (w === 'rel') openRelicPage(); else openDungeon();
  }, which);
  await page.waitForTimeout(600);

  /* 28 교훈 3 — 캔버스 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.waitForTimeout(120);
  /* 렌더 루프를 먼저 세운다. 안 세우면 renderPcb() 가 라이브 값으로 되돌려서
     레퍼런스 문자열 주입이 «캡처 직전에» 날아간다(51 함정 3 의 재현). */
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(120);

  if (REF_TXT) {
    /* 51 함정 3 — textContent 만 바꾸면 «유휴 루프» 가 되돌린다. renderPcb() 는 값이 바뀔 때만 DOM 을
       건드리므로, 전투가 골드를 버는 순간 라이브 값으로 덮어쓴다(실제로 «40.77A» 가 «969» 로 바뀌었다).
       그래서 캐시 변수(pcbGold/pcbDia)까지 같이 심어 갱신 자체가 안 일어나게 만든다. */
    await page.evaluate((t) => {
      document.querySelectorAll('.pcb-g>b').forEach((e) => { e.textContent = t.g; });
      document.querySelectorAll('.pcb-d>b').forEach((e) => { e.textContent = t.d; });
      try { pcbGold = t.g; pcbDia = t.d; } catch (e) { /* 캐시가 없으면 무시 */ }
    }, REF_TXT);
    await page.waitForTimeout(400);
    const stuck = await page.evaluate((t) => document.querySelector('.pcb-g>b').textContent === t.g, REF_TXT);
    if (!stuck) { console.error('!! 주입한 문자열이 렌더 루프에 덮였다 — 이 캡처로 채점하지 마라'); process.exitCode = 2; }
  }

  const geo = await page.evaluate((w) => {
    const root = document.getElementById(w === 'rel' ? 'relicw' : 'dunw');
    const app = document.getElementById('app');
    const A = app.getBoundingClientRect();
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const bar = root.querySelector('.pcb');
    const g = root.querySelector('.pcb-g'), d = root.querySelector('.pcb-d');
    return {
      app: { w: A.width, h: A.height },
      bar: R(bar), gold: R(g), dia: R(d),
      goldIcon: R(g.querySelector('i')), diaIcon: R(d.querySelector('i')),
      goldNum: R(g.querySelector('b')), diaNum: R(d.querySelector('b')),
      goldTxt: g.querySelector('b').textContent, diaTxt: d.querySelector('b').textContent,
      hudCovered: (() => { const t = document.getElementById('top').getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        return b.top <= t.top + 0.5 && b.bottom >= t.bottom - 0.5; })(),
    };
  }, which);

  const out = path.join('docs/review', `41-${tag}-${which}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 2280 } });
  console.log(JSON.stringify(geo, null, 1));
  console.log('errors:', errs.length ? errs : 0);
  console.log('shot:', out);
  await browser.close();
})();
