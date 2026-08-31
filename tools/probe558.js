#!/usr/bin/env node
/* 558 자 — 05 장비 세부 팝업(`#wpnw`)의 **바깥 여백 두 짝**을 프레임별로 잰다.
 *
 * 실행: node tools/probe558.js [--frames 2280,1920,1842,1805,1779,1600] [--json <경로>]
 *
 * 왜 자를 먼저 두는가(338·341·350·363·368 규칙 · 등재문의 못):
 *   351 18회차에서 비평가 셋(DT·DU·DV)이 «팝업 하변 ↔ 하단 탭바» 를 **0px / 1px / 0px** 으로
 *   셋 다 다르게 읽었다(474 가 «그 자리는 눈으로 재게 두면 회차마다 갈린다» 고 적어 둔 축이다).
 *   그래서 «답답하다» 를 눈이 아니라 **위·아래 여유 px 한 쌍**으로 적는다.
 *
 * probe467 은 같은 자리를 **침범(겹침) px** 으로 잰다 — 그쪽은 내내 0 이라 이 결손이 안 보인다.
 * 이 자는 겹침이 아니라 **여유**를 재고, 그 둘이 얼마나 치우쳤는지(비대칭)를 같이 찍는다.
 *
 * 재는 것(프레임마다):
 *   ① `.wm` 상·하변 · 높이
 *   ② 위 여유 = `.wm` 상변 − HUD 판때기(`.pedge`) 하변
 *   ③ 아래 여유 = 탭바 상변(frameH − 180) − `.wm` 하변
 *   ④ 비대칭 = |위 − 아래| · 합(= 세로 예산 중 «안 쓰는» 몫)
 *   ⑤ 클램프 여부(`.wm` 높이 < 1469 = `max-height:calc(100% - 60px)` 가 눌렀다)
 *
 * ⚠ 여유의 **합**은 상자 높이가 안 바뀌는 한 프레임마다 상수다 — 처방이 «높이 불변» 이면
 *    이 자는 «합은 그대로 · 나눔만 달라졌는가» 로 읽어야 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = process.env.P558_FILE
  ? ('file://' + path.resolve(process.env.P558_FILE))
  : ('file://' + path.resolve(__dirname, '../index.html'));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const FRAMES = arg('--frames', '2280,1920,1842,1805,1779,1600').split(',').map(Number);
const SLOTS = process.argv.includes('--all') ? ['weapon', 'shield', 'amulet'] : ['weapon'];
const JSONOUT = arg('--json', null);

const R = (n) => Math.round(n * 10) / 10;

async function open(browser, h, slot) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(420);
  await page.evaluate((k) => {
    const e = document.querySelector(`#eqCards [data-eqslot="${k}"]`);
    if (e) e.click();
  }, slot);
  await page.waitForTimeout(520);
  return { ctx, page, errs };
}

async function measure(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const wm = q('.wm').getBoundingClientRect();
    const app = q('#app').getBoundingClientRect();
    const tab = q('#tabbar').getBoundingClientRect();
    const ped = q('.pedge') ? q('.pedge').getBoundingClientRect() : null;
    const cs = getComputedStyle(q('#wpnw'));
    return {
      frameH: app.height,
      wm: { y1: wm.top, y2: wm.bottom, h: wm.height },
      tabbarTop: tab.top,
      pedgeBot: ped ? ped.bottom : null,
      padT: parseFloat(cs.paddingTop), padB: parseFloat(cs.paddingBottom),
      open: q('#wpnw').classList.contains('on'),
    };
  });
}

(async () => {
  const browser = await launch(chromium);
  const out = [];
  let bad = 0;
  for (const slot of SLOTS) {
    for (const h of FRAMES) {
      const { ctx, page, errs } = await open(browser, h, slot);
      const m = await measure(page);
      if (!m.open) { console.log(`  ✖ ${slot} @${h} — #wpnw 가 안 열렸다(진입 실패)`); bad++; await ctx.close(); continue; }
      const gapTop = R(m.wm.y1 - m.pedgeBot);
      const gapBot = R(m.tabbarTop - m.wm.y2);
      const rec = {
        slot, frame: h, wm: [R(m.wm.y1), R(m.wm.y2)], wmH: R(m.wm.h),
        pedgeBot: R(m.pedgeBot), tabbarTop: R(m.tabbarTop),
        gapTop, gapBot, sum: R(gapTop + gapBot), skew: R(Math.abs(gapTop - gapBot)),
        clamped: R(m.wm.h) < 1469, pad: [R(m.padT), R(m.padB)], errs,
      };
      out.push(rec);
      console.log(
        `  ${slot} @${h}  .wm ${rec.wm[0]}..${rec.wm[1]} (h${rec.wmH}${rec.clamped ? ' · 눌림' : ''})` +
        `  패딩 ${rec.pad[0]}/${rec.pad[1]}\n` +
        `        위 여유 ${gapTop}(HUD 하변 ${rec.pedgeBot})  아래 여유 ${gapBot}(탭바 상변 ${rec.tabbarTop})` +
        `  합 ${rec.sum}  치우침 ${rec.skew}` +
        (errs.length ? `\n        ⚠ pageerror ${errs.length}건: ${errs[0]}` : ''));
      if (errs.length) bad++;
      await ctx.close();
    }
  }
  await browser.close();
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\n  판 ${out.length}개 · 문제 ${bad}건`);
  process.exit(bad ? 1 : 0);
})();
