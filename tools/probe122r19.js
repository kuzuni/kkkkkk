/* 122 19회차 프로브 — 17회차 AN[5] «페이지 바탕 광택이 콘텐츠 위를 덮는다» 를 가른다.
   AN 실측: «배너 아트 p2p 평균 26.7 · 상단 재화 바는 0.0».
   가르는 법: 같은 자리에서 한 주기(바탕 광택 `--jz-sw × 2` = 6.4s)를 훑어 p2p 를 재고,
   `#shopw>.jzb` 만 통째로 숨긴 채 **같은 자를 다시 댄다**.
     · 숨기면 p2p 가 무너진다  → 바탕 광택이 콘텐츠 «위» 다(쌓임 순서 결함, 23-5 와 같은 계열)
     · 숨겨도 그대로다        → 그 p2p 는 배너 자신의 연출이다(감점 사유가 아니다)
   이 스크립트는 게이트가 아니라 «어느 쪽인가» 를 가르는 자다. 결과는 review 19회차 절에 남긴다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

async function p2p(p, sel, per, n) {
  const box = await p.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > innerHeight) return null;
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  }, sel);
  if (!box) return null;
  const vals = [];
  for (let i = 0; i < n; i++) {
    await seek(p, Math.round(per * i / n));
    const b64 = (await p.screenshot({ clip: box })).toString('base64');
    vals.push(await p.evaluate(async src => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let s = 0;
      for (let j = 0; j < d.length; j += 4) s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
      return +(s / (d.length / 4)).toFixed(3);
    }, b64));
  }
  return { p2p: +(Math.max(...vals) - Math.min(...vals)).toFixed(3), vals };
}

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto(URL); await p.waitForTimeout(700);
  await p.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(400);

  const SELS = ['.cn-bn>.art', '.cn-bn', '#shopw>.pcb', '.cn-cd>.hd>i'];
  for (const sel of SELS) {
    const on = await p2p(p, sel, 6400, 8);
    await p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'pr19';
      s.textContent = '#shopw>.jzb{display:none !important}';
      document.head.appendChild(s);
    });
    const off = await p2p(p, sel, 6400, 8);
    await p.evaluate(() => { const s = document.getElementById('pr19'); if (s) s.remove(); });
    if (!on || !off) { console.log(sel.padEnd(16), '— 잴 수 없다(화면 밖이거나 없다)'); continue; }
    console.log(sel.padEnd(16), 'p2p ON ' + on.p2p + ' / .jzb 숨김 ' + off.p2p
      + '  → 바탕 광택 기여 ' + (on.p2p - off.p2p).toFixed(3)
      + (off.p2p > 0 && (on.p2p - off.p2p) < on.p2p * .25 ? '  (배너 자신의 연출이다)' : '  (⚠ 바탕 광택이 위를 덮는다)'));
  }
  await browser.close();
})();
