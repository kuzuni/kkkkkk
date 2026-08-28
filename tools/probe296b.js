/* 296 재점검 — 주인 보고 «글씨가 흰색이 아니다»: 계산색이 아니라 **찍힌 픽셀**을 잰다.
   라벨 bbox 안 픽셀을 흰 코어(≥240,240,240) / 검정(≤60) / 그 외(면 초록 등)로 분류하고,
   글리프 «잉크 중심선» 이 실제로 흰지 본다. 캡처도 남긴다(tools/shot296-*.png). */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40, totalKills: 5000 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  const scan = async (name, openFn, sel) => {
    await page.evaluate(openFn);
    await page.waitForTimeout(500);
    const box = await page.evaluate(s => {
      const b = document.querySelector(s); if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);
    if (!box || !box.w) { console.log(name + ': 노드 없음/0폭 ' + sel + ' ' + JSON.stringify(box)); return; }
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
    /* 픽셀 분류는 페이지 안 캔버스로 한다(의존성 없이) */
    const stat = await page.evaluate(async ({ b64, w, h }) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      let white = 0, black = 0, other = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], bl = d[i + 2];
        if (r >= 235 && gg >= 235 && bl >= 225) white++;
        else if (r <= 70 && gg <= 70 && bl <= 70) black++;
        else other++;
      }
      /* 가운데 가로줄의 색 흐름(코어가 흰지) */
      const y = Math.floor(h / 2); let row = [];
      for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
        const i = (y * w + x) * 4;
        row.push(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      }
      return { white, black, other, total: w * h, row: row.slice(0, 20) };
    }, { b64: shot.toString('base64'), w: box.w, h: box.h });
    console.log(name + ' bbox ' + box.w + 'x' + box.h
      + ' — 흰 ' + (stat.white / stat.total * 100).toFixed(1) + '%'
      + ' · 검정 ' + (stat.black / stat.total * 100).toFixed(1) + '%'
      + ' · 기타 ' + (stat.other / stat.total * 100).toFixed(1) + '%');
    require('fs').writeFileSync(path.join(__dirname, 'shot296-' + name + '.png'), shot);
  };

  await scan('roulette', () => { S.daily.spins = 1; openRoulette(); }, '#rouBtn');
  await scan('promo', () => { closeModal(); openPromo(); }, '#pgo');
  await scan('collAll', () => {
    closeModal();
    S.gold = 1e18;
    EQUIPS.forEach(it => { S.own[it.id] = { l: 1, n: 1e12 }; });
    openColl21('weapon');
  }, '#collAll');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
