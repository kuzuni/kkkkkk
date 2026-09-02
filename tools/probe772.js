#!/usr/bin/env node
/* 작업 772 — «스윕이 스크롤 아래를 한 번도 안 본다» 를 **수로 찍는 재현기** (측정 전용)
 *
 *   node tools/probe772.js                # 71화면 전부 — 화면마다 «뷰포트 안 / 밖» 노드 수
 *   node tools/probe772.js --screen 13    # 이름에 그 말이 든 화면만
 *   node tools/probe772.js --json
 *
 * ── 무엇을 재는가 ────────────────────────────────────────────────────────
 * `scan356.COLLECT` 과 `probe418.COLLECT` 은 **같은 가시 조건**을 쓴다:
 *     if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
 * 즉 «지금 뷰포트에 걸치지 않는» 노드는 통째로 감시 밖이다. 그런데 이 게임은 스크롤 그릇
 * (`#shopList`·`#dunList`·`#eqList` …)이 화면마다 있고, 그 그릇의 **첫 화면분만** 걸친다.
 * ⇒ 이 자는 같은 조건으로 «걸치는 노드» 와 «스타일상 보이는데 뷰포트 밖인 노드» 를 **따로** 세고,
 *   그릇마다 `scrollHeight / clientHeight` 를 찍는다. 두 수의 차가 곧 스코프 구멍의 크기다.
 *
 * ⚠ 이 자는 **판정하지 않는다**(418 과 같은 규율 — 측정과 판정을 섞지 않는다).
 *   판정은 `verify772.js` 가 «스윕이 그 자리를 재는가» 로 묻는다.
 *
 * ⚠ 「보이는데 뷰포트 밖」의 정의는 COLLECT 과 **한 글자도 다르지 않아야** 한다 —
 *   다르면 이 자가 부풀린 수를 다음 세션이 «구멍» 으로 읽는다(750-④ 규율).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL, STEP } = require('./scan356');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const ONLY = argv.includes('--screen') ? argv[argv.indexOf('--screen') + 1] : null;

/* 페이지 안 수집기 — COLLECT 과 **같은** 필터를 쓰되 «밖» 을 버리지 않고 센다 */
const CENSUS = function () {
  const app = document.getElementById('app');
  if (!app) return null;
  function pathOf(el) {
    const out = []; let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s); e = e.parentElement;
    }
    return out.join('>');
  }
  const inView = [], outView = [];
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;               /* COLLECT 과 같은 줄 */
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;   /* COLLECT 과 같은 줄 */
    const out = (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth);
    (out ? outView : inView).push({ sel: pathOf(el), tag: el.tagName.toLowerCase(),
      fit: cs.objectFit, y: Math.round(r.top), h: Math.round(r.height) });
  }
  /* 스크롤 그릇 — #app 안에서 실제로 넘치는 것만 */
  const pots = [];
  for (const el of app.querySelectorAll('*')) {
    const sh = el.scrollHeight, ch = el.clientHeight;
    if (ch < 40 || sh <= ch + 1) continue;
    const ov = getComputedStyle(el).overflowY;
    if (ov !== 'auto' && ov !== 'scroll') continue;
    pots.push({ sel: pathOf(el), id: el.id || '', sh, ch, top: Math.round(el.getBoundingClientRect().top) });
  }
  return { inView, outView, pots };
};

(async () => {
  const browser = await launch(chromium);
  const wanted = (l) => !ONLY || l.includes(ONLY);
  const rows = [];
  const errs = [];
  for (const [label, steps] of SCREENS) {
    if (!wanted(label)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) { await STEP(page, s); await page.waitForTimeout(420); }
      await page.waitForTimeout(350);
      const c = await page.evaluate(CENSUS);
      if (!c) throw new Error('#app 이 없다');
      rows.push({ screen: label, inN: c.inView.length, outN: c.outView.length,
        pots: c.pots, out: c.outView });
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  const totIn = rows.reduce((a, r) => a + r.inN, 0);
  const totOut = rows.reduce((a, r) => a + r.outN, 0);
  const holed = rows.filter((r) => r.outN > 0);
  if (JSON_OUT) { console.log(JSON.stringify({ rows, errs, totIn, totOut }, null, 1)); return; }

  console.log(`[probe772] 화면 ${rows.length}개 · 진입 실패 ${errs.length}건`);
  for (const e of errs) console.log('   ✗ ' + e);
  console.log(`\n── 스코프 구멍 — «보이는데 뷰포트 밖» 인 노드가 있는 화면 (${holed.length}개) ──`);
  for (const r of holed) {
    const pot = r.pots.map((p) => `${p.id || p.sel.split('>').pop()} ${p.ch}→${p.sh}`).join(' · ');
    console.log(`  ${r.screen.padEnd(22)} 안 ${String(r.inN).padStart(3)} · 밖 ${String(r.outN).padStart(3)}   [${pot}]`);
    for (const o of r.out) console.log(`        · y${String(o.y).padStart(5)} h${String(o.h).padStart(3)} ${o.fit.padEnd(11)} ${o.sel}`);
  }
  console.log(`\n합계: 뷰포트 안 ${totIn} · **밖 ${totOut}** (밖 ÷ (안+밖) = ${(100 * totOut / (totIn + totOut)).toFixed(1)}%)`);
})();
