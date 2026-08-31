#!/usr/bin/env node
/* 356 21회차(마감) 캡처 — «찌그러진 아이콘 0건» 을 사람 눈으로 마지막에 한 번 더 묻는다.
 *
 *   node tools/cap356r21.js            docs/shots/356-r21/NN-<화면>.png (1080×2280)
 *   node tools/cap356r21.js --dsf 2    확대 컷(작은 아이콘의 1~2% 어긋남을 눈으로 보려면)
 *
 * ⚑ **회차마다 새 목록을 손으로 적지 않는다** — `scan356.js` 의 `SCREENS`·`STEP` 을 그대로 읽는다.
 *   기계(scan356)가 «0 자리» 라고 말한 바로 그 우주를 사람에게도 보여야 두 축이 같은 것을 본다.
 *   목록이 넓어지면(15·19회차처럼) 이 자도 자동으로 따라 넓어진다.
 *
 * ⚠ 캡처 PNG 는 `.gitignore` 로 막혀 있다 — 커밋하지 마라(지시서 머리말). 증거는 review 의 수치로.
 * ⚠ 이 자는 판정하지 않는다(측정·캡처 전용). 판정은 `verify356.js` 와 비평가 2인이 한다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, STEP, URL } = require('./scan356.js');

const DSF = (() => {
  const i = process.argv.indexOf('--dsf');
  return i > 0 ? Number(process.argv[i + 1]) || 1 : 1;
})();
const OUT = path.resolve(__dirname, '..', 'docs', 'shots', '356-r21');

/* 파일 이름은 화면 이름에서 만든다 — 목록이 곧 이름이라 다음 세션이 짝을 못 잃는다. */
const slug = (s) => s.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const errs = [];
  let n = 0;
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
    const page = await ctx.newPage();
    const file = path.join(OUT, String(++n).padStart(2, '0') + '-' + slug(label) + '.png');
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        /* 443 규율 — 안 맞는 셀렉터는 조용히 넘어가지 않는다. 무음 실패는 «직전 화면을 두 번 찍은» 것이다. */
        const found = await STEP(page, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}' 가 DOM 에 없다(또는 던졌다)`);
        await page.waitForTimeout(420);
      }
      /* 60 쥬시 등장 연출이 걷힌 뒤에 찍는다(350 처방 — 연출 중에 찍으면 크기가 연출 값이다) */
      await page.waitForTimeout(900);
      await page.screenshot({ path: file });
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  console.log(`[cap356r21] ${n}화면 캡처 → ${path.relative(process.cwd(), OUT)} (DSF ${DSF})`);
  if (errs.length) {
    console.log(`[cap356r21] ⚠ 무음 실패/오류 ${errs.length}건 — 그 화면은 «직전 화면» 이 찍혔을 수 있다:`);
    for (const e of errs) console.log('   · ' + e);
  } else {
    console.log('[cap356r21] 무음 실패 0건 — 목록의 모든 화면에 실제로 갔다.');
  }
  process.exit(errs.length ? 1 : 0);
})();
