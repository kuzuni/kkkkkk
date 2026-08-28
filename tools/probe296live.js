/* 296 최종 확인 — «배포된 사이트» 를 직접 열어 룰렛 버튼을 찍고 흰 잉크 픽셀을 잰다 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'https://kuzuni.github.io/kkkkkk/?nc=' + Math.floor(Math.random() * 1e9);
const KEY = 'idle_hunter_save_v4';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40, totalKills: 5000 })]);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.evaluate(() => { S.daily.spins = 1; openRoulette(); });
  await page.waitForTimeout(600);
  const box = await page.evaluate(() => {
    const r = document.querySelector('#modal .mbox').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const shot = await page.screenshot({ clip: box });
  require('fs').writeFileSync(path.join(__dirname, 'shot296-live.png'), shot);
  const stat = await page.evaluate(async b64 => {
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + b64; });
    const el = document.querySelector('#rouBtn').getBoundingClientRect();
    const bx = document.querySelector('#modal .mbox').getBoundingClientRect();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(Math.round(el.x - bx.x), Math.round(el.y - bx.y), Math.round(el.width), Math.round(el.height)).data;
    let white = 0, total = 0;
    for (let i = 0; i < d.length; i += 4) { total++; if (d[i] >= 235 && d[i + 1] >= 235 && d[i + 2] >= 225) white++; }
    return { whitePct: (white / total * 100).toFixed(1) };
  }, shot.toString('base64'));
  console.log('LIVE #rouBtn 흰 픽셀 ' + stat.whitePct + '%');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
