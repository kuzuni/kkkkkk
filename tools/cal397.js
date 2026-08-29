#!/usr/bin/env node
/* 작업 397 — 보상 젬 «찍힌 잉크» 역산기 (측정 전용)
 *
 *   node tools/cal397.js            # 현행 + 후보 font-size 별 잉크 bbox
 *
 * 왜 필요한가: `.cic` 는 `object-fit:contain` 이고 svg 는 64×64 상자 안에 60×60 쯤 되는
 * 그림을 그린다 — 즉 «상자 크기» 와 «찍힌 잉크» 가 다르다. 397 의 목표는 상자가 아니라
 * **ref 잉크 78×77 을 등방으로 맞추는 것**이므로 상자 산술이 아니라 찍힌 픽셀로 역산한다.
 * (350·368 처방: 캔버스/이미지 자는 «찍힌 픽셀» 로 물어라.)
 *
 * 잉크 측정은 그 `<i>` 만 남기고(형제·배경을 투명으로) 요소 스크린샷을 떠서
 * 알파가 있는 픽셀의 bbox 를 센다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
/* svg 를 data: URL 로 실어 캔버스 오염(SecurityError)을 피한다 */
const DIA_URL = 'data:image/svg+xml;base64,' + require('fs')
  .readFileSync(path.resolve(__dirname, '..', 'assets', 'ui', 'cur-dia.svg')).toString('base64');

const CANDS = process.argv.slice(2).filter((a) => /^\d+(\.\d+)?$/.test(a)).map(Number);
const SIZES = CANDS.length ? CANDS : [null, 74, 75, 76, 77];   /* null = 현행 그대로 */

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  for (const s of ['#menub', '#psGo', '#psBar [data-ptab="att"]']) {
    await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
    await page.waitForTimeout(420);
  }
  await page.waitForTimeout(250);

  console.log('[cal397] 36 출석 패스 · `#psw.att .ps-bx>i` 의 찍힌 잉크 (ref 잉크 78×77)\n');
  console.log('  font-size  | transform      | 상자 w×h        | 찍힌 잉크 w×h    | 잉크 종횡');
  console.log('  -----------+----------------+-----------------+------------------+---------');

  for (const fs of SIZES) {
    const got = await page.evaluate(async (fsz) => {
      const i = document.querySelector('#psw.att .ps-bx.c0>i');
      if (!i) return { err: 'no node' };
      /* 후보 크기를 임시로 먹인다 — null 이면 현행 그대로 */
      const oldFs = i.style.fontSize, oldTf = i.style.transform;
      if (fsz != null) { i.style.fontSize = fsz + 'px'; i.style.transform = 'none'; }
      const cs = getComputedStyle(i);
      const r = i.getBoundingClientRect();
      const img = i.querySelector('img.cic');
      /* ⚠ getBoundingClientRect 는 **transform 이 이미 먹은** 값이다. contain 재현은 레이아웃
         상자로 해야 하므로 offsetWidth/Height(=transform 전)를 쓴다 — 안 그러면 현행 행에서
         scaleX 가 두 번 곱해져 잉크가 57×75 로 읽힌다(실제는 73.9×97.2). */
      const ir = img ? { width: img.offsetWidth, height: img.offsetHeight } : null;
      const out = {
        fs: cs.fontSize, tf: cs.transform,
        bw: +r.width.toFixed(2), bh: +r.height.toFixed(2),
        iw: ir ? +ir.width.toFixed(2) : null, ih: ir ? +ir.height.toFixed(2) : null,
        _restore: [oldFs, oldTf],
      };
      return out;
    }, fs);
    if (got.err) { console.log('  ' + got.err); continue; }

    /* 찍힌 잉크 — svg 를 캔버스에 그려 알파 bbox 를 센다(파일이 곧 그림이라 DOM 밖에서 잰다) */
    const ink = await page.evaluate(async (box) => {
      const img = document.querySelector('#psw.att .ps-bx.c0>img.cic, #psw.att .ps-bx.c0>i>img.cic');
      if (!img) return null;
      /* ⚠ file:// 의 svg 는 캔버스를 오염시켜 getImageData 가 SecurityError 를 낸다.
         소스를 data: URL 로 바꿔 실어야 픽셀을 읽을 수 있다(작업 397). */
      const src = box.dataUrl;
      const W = Math.max(1, Math.round(box.w)), H = Math.max(1, Math.round(box.h));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const im = new Image();
      im.src = src;
      await im.decode().catch(() => {});
      /* object-fit:contain 을 손으로 재현 */
      const nr = im.naturalWidth / im.naturalHeight;
      let dw = W, dh = W / nr;
      if (dh > H) { dh = H; dw = H * nr; }
      g.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
      const d = g.getImageData(0, 0, W, H).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) return null;
      return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }, { w: got.iw, h: got.ih, dataUrl: DIA_URL });

    /* 되돌린다 — 다음 후보가 앞 후보에 얹히면 안 된다 */
    await page.evaluate((rs) => {
      const i = document.querySelector('#psw.att .ps-bx.c0>i');
      if (i) { i.style.fontSize = rs[0]; i.style.transform = rs[1]; }
    }, got._restore);

    const tfShort = got.tf === 'none' ? 'none' : got.tf.replace(/matrix\(([^,]+),.*/, 'scaleX($1)');
    const label = fs == null ? '현행' : String(fs);
    /* 잉크는 img 상자 안에서 잰 뒤 화면 transform 을 곱한다 */
    const mv = got.tf === 'none' ? null : got.tf.match(/matrix\(([^)]+)\)/);
    const v = mv ? mv[1].split(',').map(Number) : null;
    const sx = v ? Math.hypot(v[0], v[1]) : 1;
    const sy = v ? Math.hypot(v[2], v[3]) : 1;
    const iw = ink ? +(ink.w * sx).toFixed(1) : null;
    const ih = ink ? +(ink.h * sy).toFixed(1) : null;
    console.log(`  ${label.padEnd(10)} | ${tfShort.padEnd(14)} | ${(got.bw + '×' + got.bh).padEnd(15)} | `
      + `${((iw + '×' + ih)).padEnd(16)} | ${ink ? (iw / ih).toFixed(3) : '-'}`);
  }
  console.log('\n  ⚑ 등방(잉크 종횡 1.000) + ref 78×77 에 가장 가까운 값을 고른다.');
  await browser.close();
  process.exit(0);
})();
