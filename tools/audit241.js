/* 작업 241 — «껍데기 대신 안쪽 박스» 전수 자 (읽기 전용 · 진단용)
 *
 * 실행: node tools/audit241.js
 *
 * 왜 필요한가 — `tools/smoke.js` 의 «바닥 시트 잘림» 후보 목록이 팝업마다
 * «오버레이»(`#pfw{inset:0}` · `#trw{top:0;bottom:180}` 처럼 **항상 프레임과 같은 크기**)를
 * 재고 있어 그 팝업은 **원리적으로 절대 안 걸린다**(189-③ «헛초록»).
 * 19 프로필(`.pf`)이 9:16 에서 227px 잘려 있는데도 smoke 가 초록이던 이유가 이것이다.
 *
 * 이 자는 후보를 «오버레이» 가 아니라 **안쪽 박스**로 바꿔 화면비 4종에서 전수로 잰다.
 * 고치지 않는다 — 어느 팝업이 실제로 넘치는지 표만 뽑는다(내 구간이 아닌 것은 등재만 한다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* [오프너, 안쪽 박스 선택자들…] — 오버레이가 아니라 «내용이 든 상자» 를 적는다. */
const CASES = [
  ['openProfile()',              ['#pfw .pf']],
  ['openSpec()',                 ['#specw .spc']],
  ['openColl21("armor")',        ['#collw .cl', '#collw .cl-tabs']],
  ['openBless()',                ['#blsw .bls']],
  ['openBag()',                  ['#bagw .bg53']   /* 292 — .bg53-tabs 폐기 */],
  ['openConf()',                 ['#cfw .cf55']],
  ['openMail()',                 ['#modal.ml69 .mbox', '#modal.ml69 .ml-close']],
  ['openRank()',                 ['#rkw .rk-panel', '#rkw .rk-me', '#rkw .rk-nav']],
  ['openChat()',                 ['#chw .ch-list', '#chw .ch-bar']],
  ['openMenu()',                 ['#mnw .mn-col']],
  ['openTrain()',                ['#trw .tr-sheet']],
  ['goTab("hero")',              ['#panel', '#eqw .eqp']],
  ['openShopPage()',             ['#shopw .shp-list']],
  ['openDungeon()',              ['#dunw .dns-list']],
  ['openRelw()',                 ['#relw .rw-grid']],
];

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const h of [1600, 1920, 2280, 2600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', () => {});
    await page.goto(URL); await page.waitForTimeout(900);
    for (const [call, sels] of CASES) {
      const r = await page.evaluate(([call, sels]) => {
        try { eval(call); } catch (e) { return sels.map(s => ({ s, err: String(e.message || e).slice(0, 60) })); }
        void document.body.offsetHeight;
        const A = document.getElementById('app').getBoundingClientRect();
        return sels.map(s => {
          const e = document.querySelector(s);
          if (!e) return { s, err: '없음' };
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden' || !e.offsetParent) return { s, err: '안 보임' };
          const q = e.getBoundingClientRect();
          if (!q.width || !q.height) return { s, err: '0크기' };
          return { s, top: Math.round(q.top - A.top), bot: Math.round(q.bottom - A.bottom),
                   w: Math.round(q.width), h2: Math.round(q.height) };
        });
      }, [call, sels]).catch(e => sels.map(s => ({ s, err: 'evaluate: ' + String(e.message || e).slice(0, 50) })));
      r.forEach(x => rows.push(Object.assign({ h, call }, x)));
      /* 다음 케이스가 앞 팝업 위에 겹치지 않게 새로 연다 */
      await page.goto(URL); await page.waitForTimeout(500);
    }
    await ctx.close();
  }
  await browser.close();

  const bad = [];
  console.log('frameH | 선택자                   |  top |  bot | 크기      | 판정');
  for (const r of rows) {
    if (r.err) { console.log(`${String(r.h).padEnd(6)} | ${r.s.padEnd(24)} | ${'—'.padStart(4)} | ${'—'.padStart(4)} |           | ${r.err}`); continue; }
    const over = (r.top < -1.5 ? `위 ${-r.top}px` : '') + (r.bot > 1.5 ? `${r.top < -1.5 ? ' · ' : ''}아래 ${r.bot}px` : '');
    if (over) bad.push(`[${r.h}] ${r.s} — ${over}`);
    console.log(`${String(r.h).padEnd(6)} | ${r.s.padEnd(24)} | ${String(r.top).padStart(4)} | ${String(r.bot).padStart(4)} | ${(r.w + '×' + r.h2).padEnd(9)} | ${over ? '⚠ ' + over : 'OK'}`);
  }
  console.log('\n=== 프레임 밖으로 나간 것 ===');
  bad.length ? bad.forEach(b => console.log('  ⚠ ' + b)) : console.log('  없음');
  console.log(`\nAUDIT241 ${bad.length}건`);
})();
