/* 작업 352 — «337 이 남긴 넷» 재현기(제품 쪽). 338 규칙대로 **처방을 따르기 전에 먼저 묻는다**.
 *
 *   node tools/probe352.js
 *
 * 픽셀(ref/cap)은 `tools/probe352.py` 가 재고, 이쪽은 **제품에게 직접** 묻는다 —
 * 셸/활성 알약/구분선의 실제 상자와 계산된 값. 상수를 종이에 적어 두고 재면
 * 368 처럼 «표본이 놓인 자리» 가 틀린 것을 결함으로 읽는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['13 재화', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click()],
  ['23 훈련', '#trainw .stabs', () => { closeShopPage(); openTrain(); }],
];

(async () => {
  const browser = await launch(chromium);
  let bad = 0, tot = 0;
  const ok = (c, m) => { tot++; if (c) console.log('  PASS ' + m); else { bad++; console.log('  FAIL ' + m); } };
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    page.on('console', m => { if (m.type() === 'error') console.log('   [console error]', m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);

    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { console.log('\n══ ' + name + ' ══ 진입 실패 ' + e.message); continue; }
      await page.waitForTimeout(700);
      const r = await page.evaluate(s => {
        const bar = document.querySelector(s);
        if (!bar || !bar.offsetParent) return null;
        const bb = bar.getBoundingClientRect();
        const cs = getComputedStyle(bar);
        const on = bar.querySelector('.stab.on');
        const ob = on && on.getBoundingClientRect();
        const ocs = on && getComputedStyle(on);
        const sep = bar.querySelector('.stab-sep');
        const sb = sep && sep.getBoundingClientRect();
        const cells = [...bar.querySelectorAll('.stab')].map(e => {
          const b = e.getBoundingClientRect();
          return { t: e.textContent.trim().slice(0, 6), x: +b.x.toFixed(1), w: +b.width.toFixed(1) };
        });
        return {
          bar: { x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) },
          border: cs.borderTopWidth + '/' + cs.borderRightWidth + '/' + cs.borderBottomWidth + '/' + cs.borderLeftWidth,
          barShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 90),
          barRadius: cs.borderTopLeftRadius,
          on: on ? { t: on.textContent.trim().slice(0, 6), x: +ob.x.toFixed(1), y: +ob.y.toFixed(1), w: +ob.width.toFixed(1), h: +ob.height.toFixed(1), radius: ocs.borderTopLeftRadius } : null,
          sep: sb ? { x: +sb.x.toFixed(1), y: +sb.y.toFixed(1), w: +sb.width.toFixed(1), h: +sb.height.toFixed(1) } : null,
          cells,
        };
      }, sel);
      if (!r) { console.log('\n══ ' + name + ' ══ 바가 안 보인다'); continue; }
      console.log('\n══ ' + name + ' ══');
      console.log('   셸    ' + JSON.stringify(r.bar) + '  테두리 ' + r.border + '  radius ' + r.barRadius);
      console.log('   셸 그림자 ' + r.barShadow);
      console.log('   활성  ' + JSON.stringify(r.on));
      console.log('   구분선 ' + JSON.stringify(r.sep));
      console.log('   칸    ' + r.cells.map(c => c.t + ' x' + c.x + ' w' + c.w).join(' | '));
      /* 부품 동시성 — 셸 높이·테두리·활성 반경은 호스트가 달라도 같아야 한다 */
      ok(r.bar.h === 97, name + ' 셸 높이 97 — ' + r.bar.h);
      if (r.on) ok(Math.abs(r.on.h - 85) < 0.6, name + ' 알약 높이 85 — ' + r.on.h);
    }
  } finally { await browser.close(); }
  console.log('\nPROBE352 ' + (tot - bad) + '/' + tot + '  ' + (bad ? 'FAIL' : 'PASS'));
  process.exit(bad ? 1 : 0);
})();
