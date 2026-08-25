/* 작업 97 — 레이드 탭 캡처 + 썸네일/알약 기하 실측.
   실행: node tools/cap97.js            (기본 상태 — 아레나 잠금)
        node tools/cap97.js open        (S.best 를 올려 3장 모두 해금)
        node tools/cap97.js open big    (해금 + 최고 DPS 를 크게 넣어 알약 폭 최대치)
   내보내는 것: docs/shots/97-레이드-<모드>.png · 콘솔에 슬롯/알약 rect */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OPEN = process.argv.includes('open');
const BIG = process.argv.includes('big');
const MODE = OPEN ? (BIG ? '해금-최대' : '해금') : '기본';

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  if (OPEN) {
    await p.evaluate(big => {
      S.best = 999;
      if (big) S.raidBest = { r60: { dmg: 9.9e14, dps: 9.9e12 } };   /* 123 — r30·r120 폐기 */
    }, BIG);
  }
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);

  const d = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.rd')].map(c => {
    const cr = c.getBoundingClientRect();
    const rel = e => { const r = e.getBoundingClientRect();
      return { x: +(r.left - cr.left).toFixed(1), y: +(r.top - cr.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               r2: +(r.right - cr.left).toFixed(1), b2: +(r.bottom - cr.top).toFixed(1) }; };
    const th = c.querySelector('.th'), cv = c.querySelector('canvas.thcv');
    /* 캔버스에 실제로 그려진 잉크 bbox — «자리를 잡았다» 와 «자리를 채웠다» 는 다르다(LESSONS 72-③) */
    let ink = null;
    if (cv) {
      const g = cv.getContext('2d');
      const im = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (im[(y * cv.width + x) * 4 + 3] > 8) { on++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      /* 잉크 평균 휘도 — 틴트(multiply)가 배경보다 어두워지면 스프라이트가 묻힌다 */
      let lum = 0;
      for (let i = 0; i < im.length; i += 4) if (im[i + 3] > 8)
        lum += 0.299 * im[i] + 0.587 * im[i + 1] + 0.114 * im[i + 2];
      ink = on ? { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1,
                   cover: +(on / (cv.width * cv.height)).toFixed(3),
                   lum: +(lum / on).toFixed(1) } : { empty: true };
    }
    return {
      id: c.dataset.rcard, locked: !!c.querySelector('.lk'),
      card: { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) },
      th: th ? rel(th) : null,
      cvpx: cv ? [cv.width, cv.height] : null,
      ink,
      pills: [...c.querySelectorAll('.pill')].map(rel),
      spLv: rel(c.querySelector('.sp.lv')), spTk: rel(c.querySelector('.sp.tk')),
      lbA: rel(c.querySelector('.lb.a')), lbB: rel(c.querySelector('.lb.b')),
      nm: rel(c.querySelector('.nm')),
      kids: [...c.children].map(e => e.className)
    };
  }));
  d.forEach(c => {
    console.log(`[${c.id}] locked=${c.locked} card=${c.card.w}x${c.card.h}`);
    console.log('   th   ', JSON.stringify(c.th), 'cvpx', JSON.stringify(c.cvpx));
    console.log('   ink  ', JSON.stringify(c.ink));
    console.log('   spTk ', JSON.stringify(c.spTk), ' spLv', JSON.stringify(c.spLv));
    console.log('   pills', JSON.stringify(c.pills));
    console.log('   gap(th.x - spTk.right) =', c.th ? +(c.th.x - c.spTk.r2).toFixed(1) : 'n/a',
                ' (th.x - pill.right) =', c.th ? +(c.th.x - Math.max(...c.pills.map(q => q.r2))).toFixed(1) : 'n/a');
    console.log('   kids ', c.kids.join(' | '));
  });
  console.log('콘솔 에러', errs.length, errs.slice(0, 3));

  const dir = path.resolve(__dirname, '../docs/shots');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `97-레이드-${MODE}.png`);
  await p.screenshot({ path: f });
  console.log('saved', f);
  await b.close();
})();
