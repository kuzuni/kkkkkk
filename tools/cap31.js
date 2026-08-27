/* 작업 31 — 던전 클리어 화면 캡처(비평용). 1080×2280 · 9:19 기준.
 *   node tools/cap31.js [회차]   → docs/review/31-r<회차>.png   (기본 1)
 *
 * 던전 클리어는 «전투력 ≥ 요구» 일 때만 나오므로, 세이브에 업그레이드를 잔뜩 넣어
 * 전투력을 올린 뒤 03 던전 → 04 세부 → [도전] 으로 실제 클리어를 발생시킨다.
 * (임시 주입으로 화면만 띄우지 않고 «실제 클리어 경로» 를 타는 이유: T3 도 기능 연결을
 *  가능한 범위에서 확인하라는 지시서 [-1] T3 항목 때문이다.)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const R = process.argv[2] || '1';
const out = (n) => path.resolve(__dirname, '..', 'docs', 'review', n);

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }

  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  /* 전투력을 크게 올려 1층 요구치를 확실히 넘긴다 */
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({
      gold: 1e12, dia: 1e6, relic: 1e6, stage: 40, best: 40,
      lv: { atk: 120, aspd: 40, crit: 30, cdmg: 30, hp: 90, regen: 40, def: 30, spd: 10, gold: 20 },
    })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 캔버스 데미지 숫자가 캡처를 오염시킨다(LESSONS 28-③) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 03 던전 → 첫 카드 → 04 세부 → [도전] */
  await page.evaluate(() => openDungeon());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('#dunList [data-dcard]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('dgdGo').click());
  /* 900ms 고정 대기는 플레이크였다(2회차에 WARN(false) 1회) — 실제로 열릴 때까지 기다린다 */
  await page.waitForFunction(() => {
    const w = document.getElementById('dclw');
    return !!w && w.classList.contains('on');
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);

  const shown = await page.evaluate(() => {
    const w = document.getElementById('dclw');
    return w ? w.classList.contains('on') : 'no #dclw';
  });
  await page.screenshot({ path: out(`31-r${R}.png`) });
  await browser.close();
  if (errs.length) console.log('pageerror: ' + errs.slice(0, 3).join(' | '));
  console.log(`CAP31 ${shown === true ? 'OK' : 'WARN(' + shown + ')'} — docs/review/31-r${R}.png`);
})();
