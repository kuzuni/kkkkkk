#!/usr/bin/env node
/* 작업 57 — 수정 전/후 «기하 회귀» 대조.
 * 구버전 장비 패널을 지우면서 #panel 표시 조건을 바꿨으므로, 장비 이외의 화면이
 * 1px 도 안 움직였는지 확인한다. 픽셀이 아니라 요소 좌표를 덤프해 비교한다
 * (51 교훈 3: 픽셀 대조는 유휴 루프가 굴리는 값 — 닉네임·전투력 — 때문에 못 쓴다).
 *
 *   node geom57.js            # HEAD(수정 전) 대 작업본(수정 후)
 */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');

const BEFORE = path.resolve(__dirname, '.before57.tmp.html');
fs.writeFileSync(BEFORE, cp.execSync('git show HEAD:index.html', { maxBuffer: 1 << 28 }));

/* 상태마다 «어떻게 그 화면을 만드는가» — page 안에서 클릭으로만 만든다 */
const STATES = {
  'main(패널 닫힘)': [],
  'hero-장비(06)':  ['.tab[data-t="hero"]'],
  'hero-스킬(07)':  ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]'],
  'hero-동료(26)':  ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]'],
  '훈련(23)':       ['.tab[data-t="grow"]'],
  '던전(03)':       ['.tab[data-t="adv"]'],
  '보물상자(14)':    ['.tab[data-t="box"]'],
  '상점(10)':       ['.tab[data-t="shop"]'],
};
/* 좌표를 재는 대상 — 메인 화면 고정 요소 + 각 시트/오버레이 껍데기 */
const SELS = ['#app', '#top', '#stagearea', '#tabbar', '#sideL', '#sideR', '#slots', '#panel',
  '#herosub', '#eqw', '.eqp', '#eqTabs', '#eqCards', '#bEq', '#bSk', '#bPet', '#bUp', '#bDun', '#bRel',
  '#bShop', '#trw', '#dunw', '#relicw', '#shopw', '#wpnw'];

async function dump(page) {
  return page.evaluate((sels) => {
    const out = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) { out[s] = 'ABSENT'; continue; }
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      out[s] = shown ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',') : 'HIDDEN';
    }
    return out;
  }, SELS);
}

(async () => {
  const browser = await chromium.launch();
  const run = async (file) => {
    const res = {}, errs = [];
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    for (const [name, clicks] of Object.entries(STATES)) {
      await page.goto('file://' + file);
      await page.waitForTimeout(900);
      for (const sel of clicks) { await page.$eval(sel, (el) => el.click()); await page.waitForTimeout(400); }
      res[name] = await dump(page);
    }
    await ctx.close();
    return { res, errs };
  };
  const a = await run(BEFORE), b = await run(path.resolve(__dirname, 'index.html'));
  await browser.close();
  fs.unlinkSync(BEFORE);

  let diffs = 0, expected = 0;
  for (const st of Object.keys(STATES)) {
    for (const s of SELS) {
      const x = a.res[st][s], y = b.res[st][s];
      if (x === y) continue;
      /* 장비 화면에서 «구버전 패널이 사라진 것» 은 이 작업의 목적이다 */
      const wanted = (s === '#bEq') || (st === 'hero-장비(06)' && (s === '#panel' || s === '#herosub'));
      (wanted ? expected++ : diffs++);
      console.log((wanted ? '  · 의도된 변화 ' : '  ✗ 회귀 ') + `[${st}] ${s}: ${x} → ${y}`);
    }
  }
  const errN = a.errs.length + b.errs.length;
  console.log(`\n상태 ${Object.keys(STATES).length}종 × 요소 ${SELS.length}종 = ${Object.keys(STATES).length * SELS.length} 항목`);
  console.log(`의도된 변화 ${expected}건 · 예상 밖 차이 ${diffs}건 · 콘솔 에러 전/후 ${a.errs.length}/${b.errs.length}건`);
  console.log(diffs || errN ? '\nGEOM57 FAIL' : '\nGEOM57 PASS');
  process.exit(diffs || errN ? 1 : 0);
})();
