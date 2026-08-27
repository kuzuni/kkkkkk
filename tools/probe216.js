/* 작업 216 실측 — 03 «컨텐츠» 탭 레이드 카드의 «최고 DPS» 알약이 자릿수에 따라
   썸네일 슬롯(.th)을 침범하는지 잰다.
   실행: node tools/probe216.js
   등재문(213 곁가지)의 전제: «21자(9.9e15)부터 겹친다». 그 전제는 표기층이 `fmt`(150 — 숫자 그대로)
   이던 시절 것이다. 188(주인 정정)이 DPS 를 `fmtB`(알파벳 단위)로 떼어 갔으므로 지금 무엇이
   찍히는지·폭이 얼마인지 실제로 재서 판정한다. 비교를 위해 `fmtB` 를 `fmt` 로 되돌린 판도 같이 잰다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 등재문이 세어 둔 자릿수 계단 + 그 너머 */
const CASES = [
  ['9자   (1.0e8)',   1e8],
  ['13자  (9.9e9)',   9.9e9],
  ['17자  (9.9e12)',  9.9e12],
  ['19자  (9.9e14)',  9.9e14],
  ['21자  (9.9e15)',  9.9e15],
  ['25자  (9.9e19)',  9.9e19],
  ['31자  (9.9e25)',  9.9e25],
  ['61자  (9.9e55)',  9.9e55],
];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    S.best = 999;                                  /* 잠금 해제 — 잠긴 카드는 딤 위라 기록이 안 보인다 */
    document.querySelector('#tabbar [data-t="adv"]').click();
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(600);

  const measure = async (dps) => p.evaluate((v) => {
    S.raidBest = { r60: { dmg: v * 60, dps: v } };
    setDunSub('raid');
    const c = document.querySelector('#dunList .dnc.rd');
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cw = c.getBoundingClientRect().width, sc = cw / 980;     /* 화면 px → 프레임 px */
    const cs = getComputedStyle(i);
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ink = rg.getBoundingClientRect();
    const padR = parseFloat(getComputedStyle(sp).paddingRight) || 0;
    /* 알약 우단 = 잉크 우단 + padding-right (raidFitNums 와 같은 정의) */
    const right = (ink.right - c.getBoundingClientRect().left) / sc + padR;
    return {
      txt: i.textContent,
      len: i.textContent.length,
      fs: +parseFloat(cs.fontSize).toFixed(2),
      inline: i.style.fontSize || '(없음)',
      right: +right.toFixed(1),
      thL: +((th.getBoundingClientRect().left - c.getBoundingClientRect().left) / sc).toFixed(1),
      gap: +((th.getBoundingClientRect().left - ink.right) / sc - padR).toFixed(1),
    };
  }, dps);

  const run = async (label) => {
    console.log('\n== ' + label + ' ==');
    console.log('  값            표기             자수  font-size  알약우단  슬롯좌단  여백');
    for (const [nm, v] of CASES) {
      const m = await measure(v);
      console.log('  ' + nm.padEnd(13) + ' ' + m.txt.padEnd(16) + ' ' + String(m.len).padStart(3)
        + '  ' + String(m.fs).padStart(8) + '  ' + String(m.right).padStart(7)
        + '  ' + String(m.thL).padStart(7) + '  ' + String(m.gap).padStart(6)
        + (m.gap < 0 ? '  ← 침범' : ''));
    }
  };

  await run('현재 트리 (188 — DPS = fmtB 알파벳 단위)');

  /* 188 되돌림 판 — 표기만 `fmt`(150 «숫자 그대로»)로 되돌려 등재문의 전제를 재현한다 */
  await p.evaluate(() => { window.fmtB = window.fmt; });
  const patched = await p.evaluate(() => {
    /* renderRaidPage 는 클로저 안의 fmtB 를 부르므로 전역 치환만으로는 안 갈린다 —
       카드 렌더 문자열의 그 자리만 바꿔치기해서 «옛 표기» 판을 만든다. */
    const src = renderRaidPage.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
    return /fmt\(b\.dps\)/.test(window.renderRaidPage.toString());
  });
  console.log('\n[i] 188 되돌림 패치 적용:', patched);
  await p.evaluate(() => { window.setDunSub2 = setDunSub; });
  await run('188 되돌림 (DPS = fmt 숫자 그대로 — 등재문 시점)');

  await b.close();
})();
