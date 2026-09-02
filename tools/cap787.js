#!/usr/bin/env node
/* 787 캡처(705 하네스 그대로 · 회차만 787 로) — 19 프로필 · 20 종합스탯을 **짝으로** 찍는다(같은 팝업의 두 탭이므로 나란히 봐야 한다).
 *
 *   node tools/cap787.js [회차]     기본 r1 → docs/review/787-r1-{19,20}-{2280,1600}.png
 *
 * ⚠ 캡처 PNG 는 **커밋하지 않는다**(ROUTINE 서두 «이력 정리» — `.gitignore` 가 막는다).
 *   증거로 남는 것은 review .md 의 수치다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/review');
const FILE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof openProfile === 'function');
    await page.waitForTimeout(1100);
    /* 표본 — «볼 것이 있는» 상태로 만든다(칭호 보유 · 코스튬 착용 · 스탯 성장) */
    await page.evaluate(() => {
      S.rank = 2; S.titles = { 0: 1, 1: 1, 2: 1, 3: 1 };
      S.avatar = 'av0'; S.avatars = Object.assign({ av0: 1 }, S.avatars);
      S.lv.atk = 120; S.lv.hp = 120; S.lv.regen = 60; S.lv.crit = 20;
      S.lv.cdmg = 15; S.lv.pierce = 3; S.lv.def = 12; S.lv.gold = 20;
      markDirty(); save(); openProfile();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `787-${R}-19-${H}.png`) });
    await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `787-${R}-20-${H}.png`) });
    await ctx.close();
    console.log('찍음: 787-' + R + '-{19,20}-' + H + '.png');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
