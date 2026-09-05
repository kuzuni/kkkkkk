#!/usr/bin/env node
/* 작업 921 재현기 — «여는 동작 뒤 250ms 미만 대기» 자리가 정말 입장 연출 한복판인가
 *
 *   node tools/probe921.js            네 자리 재현 + §R 되돌림
 *   node tools/probe921.js --only R   §R 만
 *
 * 338 규칙 — 처방(한 줄 넣기)보다 **재현**이 먼저다. 915 가 `verify886` 한 자리에서 보인 것을
 * 이 자는 «자리마다 다시» 묻는다: 그 대기가 끝난 프레임에 `jzPg*`/`jzSheet*` 가 **아직 돌고 있나**,
 * 돌고 있다면 정착 한 줄이 재는 값을 **실제로 움직이나**.
 *
 * ⚑ 읽는 법 — pending 0 인 자리는 «이미 멀쩡한 자리» 가 아니라 «이 판에서는 안 걸린 자리» 다.
 *   부하가 걸린 러너에서 연출이 늦게 시작·종료하는 것이 291 의 병이므로(291 머리말),
 *   pending 0 이어도 한 줄은 **보험**으로 남는다 — 값이 안 바뀌므로 대가는 0 이다([3] 이 그 항이다).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, total = 0;
const ok = (c, m, x) => { total++; if (c) pass++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (x ? ' — ' + x : '')); };

/* 게이트가 실제로 쓰는 «열고 · 기다리고 · 잰다» 를 그대로 옮긴 것 —
   자와 재현기가 다른 프레임에서 재면 «자 갈림» 이 하나 더 생긴다(915 §5 · 896). */
const SITES = [
  { k: 'relic',  gate: 'verify917:71 · verify886:117', ms: 200, sel: '#rwMulBar',
    setup: () => { S.relic = 1e9; openRelw(); } },
  { k: 'train',  gate: 'verify686:58 · 688 · 769', ms: 150, sel: '.tr-tp',
    setup: () => { S.gold = 1e15; S.tstone = 1e6; markDirty(); openTrain(); setTrSub('temper'); renderTrain(); } },
  { k: 'shop',   gate: 'verify116:116 · verify497:82', ms: 200, sel: '#shopList .cn-cd',
    setup: () => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); } },
  { k: 'bless',  gate: 'verify325:323', ms: 120, sel: '#blsC_atk .tm',
    setup: () => { openBless(); } },
];

const PEND = () => (document.getAnimations ? document.getAnimations() : [])
  .filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '') && a.playState !== 'finished')
  .map(a => a.animationName);
const RECT = (s) => { const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect(); const q = v => Math.round(v * 100) / 100;
  return { x: q(r.x), y: q(r.y), w: q(r.width), h: q(r.height) }; };

const d2 = v => Math.round(v * 100) / 100;
const delta = (a, b) => (!a || !b) ? null
  : { dx: d2(b.x - a.x), dy: d2(b.y - a.y), dw: d2(b.w - a.w), dh: d2(b.h - a.h) };
const moved = d => !!d && (Math.abs(d.dx) > 0.01 || Math.abs(d.dy) > 0.01 || Math.abs(d.dw) > 0.01 || Math.abs(d.dh) > 0.01);

async function shoot(browser, site, { settle }) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);            /* ≥250 — 여기서는 훅이 돈다(열기 «전» 이라 정착할 연출이 없다) */
  await page.evaluate(site.setup);
  await page.waitForTimeout(site.ms);        /* <250 — 훅이 구조적으로 안 도는 그 자리 */
  const pend = await page.evaluate(PEND);
  const before = await page.evaluate(RECT, site.sel);
  let after = before, pend2 = pend;
  if (settle && page.settle291) {
    await page.settle291();
    after = await page.evaluate(RECT, site.sel);
    pend2 = await page.evaluate(PEND);
  }
  await ctx.close();
  return { pend, pend2, before, after };
}

(async () => {
  const only = (process.argv.find(a => a.startsWith('--only')) || '').split('=')[1]
    || (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null);
  const browser = await launch(chromium);

  const rows = [];
  if (!only || only !== 'R') {
    console.log('[1] 재현 — 그 대기가 끝난 프레임에 입장 연출이 아직 도는가 (정착 켬)');
    for (const s of SITES) {
      const r = await shoot(browser, s, { settle: true });
      const d = delta(r.before, r.after);
      rows.push({ s, r, d });
      console.log(`  ${s.k.padEnd(6)} ${String(s.ms).padStart(3)}ms  pending [${r.pend.join(',') || '없음'}]`
        + `  ${s.sel} ${JSON.stringify(r.before)}`
        + (d ? ` → Δ${JSON.stringify(d)}` : ' → 잴 것 없음'));
    }
    const hit = rows.filter(x => x.r.pend.length);
    ok(hit.length > 0,
      '[1a] 적어도 한 자리는 **연출 한복판**이다 — 훅이 안 도는 자리가 실재한다',
      hit.map(x => x.s.k + '(' + x.r.pend.join(',') + ')').join(' · ') || '이 판에서는 0곳');
    ok(rows.every(x => x.r.before),
      '[1b] 네 자리 모두 잴 것이 실제로 있다 (헛초록 방지)',
      rows.map(x => x.s.k + (x.r.before ? '✓' : '✗')).join(' '));
    ok(hit.every(x => moved(x.d)),
      '[2] 연출 한복판이던 자리는 정착 뒤 **값이 움직인다** — 한 줄이 무해한 장식이 아니다',
      hit.map(x => x.s.k + ' Δ' + JSON.stringify(x.d)).join(' · ') || '해당 없음');
    ok(rows.filter(x => !x.r.pend.length).every(x => !moved(x.d)),
      '[3] ☆ 음성항 — 연출이 없던 자리는 정착해도 **Δ0** 이다(대가 0 · 보험으로만 남는다)',
      rows.filter(x => !x.r.pend.length).map(x => x.s.k).join(' ') || '해당 없음');
    ok(rows.every(x => x.r.pend2.length === 0),
      '[4] 정착 뒤에는 도는 입장 연출이 0 이다',
      rows.map(x => x.s.k + ':' + x.r.pend2.length).join(' '));
  }

  console.log('\n[R] 되돌림 — 같은 자리를 «정착 없이» 재면 앞의 값으로 돌아간다');
  for (const s of SITES) {
    const off = await shoot(browser, s, { settle: false });
    const on = await shoot(browser, s, { settle: true });
    const d = delta(off.before, on.after);
    console.log(`  ${s.k.padEnd(6)} 정착없음 ${JSON.stringify(off.before)}  ↔  정착 ${JSON.stringify(on.after)}`
      + `  pending(없음/있음) ${off.pend.length}/${on.pend.length}`);
    if (off.pend.length) ok(moved(d), `[R:${s.k}] 연출이 돌던 판에서 두 경로가 갈린다`, JSON.stringify(d));
    else ok(!moved(d), `[R:${s.k}] 연출이 없던 판에서는 두 경로가 같다`, JSON.stringify(d));
  }

  await browser.close();
  console.log(`\nPROBE921 ${pass}/${total} ` + (pass === total ? 'PASS' : 'FAIL'));
  process.exit(pass === total ? 0 : 1);
})();
