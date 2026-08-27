#!/usr/bin/env node
/* 작업 181 진단 ② — «회전 중 화면에서 실제로 무엇이 움직이는가» 를 픽셀로 본다.
 *
 *   node tools/pix181.js            (캡처 → docs/shots/181-f##.png · 차분 리포트)
 *
 * probe181(계산 스타일·rect)이 «모달 안은 Δ0» 이라고 말해도 주인은 흔들림을 본다.
 * 계산 스타일로는 안 잡히는 것(캔버스·그림자·배경 위치·연출 레이어 겹침)까지 보려면
 * 픽셀을 직접 비교해야 한다. 원판(#rouDisc) 원 안쪽은 «돌아야 하는» 곳이라 마스크한다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');
const N = Number(process.env.P181_N || 14);
const GAP = Number(process.env.P181_GAP || 110);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { S.daily.spins = 30; openRoulette(); });
  await page.waitForTimeout(600);

  const geo = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    return { box: g('#modal .mbox'), disc: g('.rlt'), app: g('#app') };
  });
  console.log('mbox ' + JSON.stringify(geo.box));
  console.log('rlt  ' + JSON.stringify(geo.disc));

  await page.click('#rouBtn');
  const frames = [];
  for (let i = 0; i < N; i++) {
    const spin = await page.evaluate(() => (typeof rouSpinning !== 'undefined' ? rouSpinning : null));
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
    frames.push({ buf, spin });
    await page.waitForTimeout(GAP);
  }
  frames.forEach((f, i) => fs.writeFileSync(path.join(OUT, '181-f' + String(i).padStart(2, '0') + (f.spin ? 's' : '-') + '.png'), f.buf));
  console.log('캡처 ' + frames.length + '장 → docs/shots/181-f*.png (파일명 s = 회전 중)');
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
