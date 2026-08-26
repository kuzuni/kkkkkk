const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await p.goto('file://' + require('path').resolve('index.html'));
  await p.waitForTimeout(700);
  await p.evaluate(() => { S.dia = 5e6; S.gold = 5e9; S.relic = 5e5; save(); openShopPage();
    shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const r = document.querySelector('#shopList .cn-cd.dia.top>.pn>.ray');
    if (!r) return { exists: false };
    r.scrollIntoView({ block: 'center' });
    const b = r.getBoundingClientRect(), cs = getComputedStyle(r);
    const pn = r.parentElement.getBoundingClientRect();
    return { exists: true, rect: [b.x|0, b.y|0, b.width|0, b.height|0],
             pn: [pn.x|0, pn.y|0, pn.width|0, pn.height|0],
             anim: cs.animationName + ' ' + cs.animationDuration,
             op: cs.opacity, disp: cs.display, vis: cs.visibility, z: cs.zIndex,
             mask: (cs.maskImage || cs.webkitMaskImage || '').slice(0, 40) };
  });
  console.log(JSON.stringify(info, null, 1));
  if (info.exists) {
    // 판 안 픽셀을 «광선 켬/끔» 으로 비교한다
    const [px, py, pw, ph] = info.pn;
    const clip = { x: px, y: py, width: pw, height: ph };
    const grab = async () => (await p.screenshot({ clip })).toString('base64');
    const mean = async (b64) => p.evaluate(async src => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let s = 0, n = 0, mn = 999, mx = -1;
      for (let j = 0; j < d.length; j += 4) {
        const L = .2126 * d[j] + .7152 * d[j+1] + .0722 * d[j+2];
        s += L; n++; if (L < mn) mn = L; if (L > mx) mx = L;
      }
      return { avg: +(s/n).toFixed(2), min: +mn.toFixed(1), max: +mx.toFixed(1) };
    }, b64);
    const on = await mean(await grab());
    await p.evaluate(() => { const st = document.createElement('style');
      st.textContent = '.cn-cd.dia.top>.pn>.ray{display:none!important}'; document.head.appendChild(st); });
    await p.waitForTimeout(120);
    const off = await mean(await grab());
    console.log('광선 켬 ', JSON.stringify(on));
    console.log('광선 끔 ', JSON.stringify(off));
    console.log('평균 차 ', (on.avg - off.avg).toFixed(2));
  }
  await b.close();
})();
