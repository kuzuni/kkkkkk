/* 작업 667 — 9회차 기하 덤프 (리본 위 부품: 금색 판 `b` · 수량 `u` · 배지 · 리본).

   8회차가 넘긴 «상자 중심 ≠ 잉크 중심» 을 재려면 **상자는 DOM 에서, 잉크는 화소에서** 와야 한다.
   화소 쪽(`scan667b.py`)이 창을 좁게 잡을 수 있도록 이 자가 **크롭-로컬 좌표**로 상자를 적어 준다.
   크롭 규칙은 `cap151.js --crop` 과 같다: 크롭 좌상단 = (카드x − 40, 카드y − 80).

   실행: node tools/probe667b.js [--h 2280] [--out docs/review/151-r13.geo.json]
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const HI = process.argv.indexOf('--h');
const VH = HI > 0 ? +process.argv[HI + 1] : 2280;
const OI = process.argv.indexOf('--out');
const OUT = OI > 0 ? process.argv[OI + 1] : 'docs/review/151-r13.geo.json';

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: VH }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(600);
  await p.evaluate(() => { try { openShopTab('pass'); } catch (e) { } });
  await p.waitForTimeout(500);
  /* LESSONS 28-③ · 51-③ — 전투 캔버스와 유휴 연출이 잉크 스캔을 오염시킨다 */
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await p.waitForTimeout(200);

  const cards = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pvc').forEach((c) => {
      const cr = c.getBoundingClientRect();
      /* 크롭 원점 — cap151 --crop 과 같은 식 */
      const ox = Math.max(0, cr.left - 40), oy = cr.top - 80;
      const B = (e) => {
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: +(r.left - ox).toFixed(2), y: +(r.top - oy).toFixed(2),
          w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
      };
      const o = { id: c.dataset.pv, cls: c.className, card: B(c) };
      ['rb1', 'rb2'].forEach((k) => {
        const rb = c.querySelector('.' + k);
        o[k] = B(rb);
        o[k + 'b'] = B(rb && rb.querySelector('b'));
        o[k + 'u'] = B(rb && rb.querySelector('u'));
        o[k + 'i'] = B(rb && rb.querySelector('i'));
        o[k + 'utxt'] = rb && rb.querySelector('u') ? rb.querySelector('u').textContent : null;
      });
      o.bdg = B(c.querySelector('.bdg'));
      o.bdgI = B(c.querySelector('.bdg>i'));
      o.gx = getComputedStyle(c).getPropertyValue('--gx').trim();
      out.push(o);
    });
    return out;
  });

  fs.writeFileSync(path.resolve(__dirname, '..', OUT), JSON.stringify({ frameH: VH, cards }, null, 1));
  console.log(JSON.stringify({ frameH: VH, cards }, null, 1));
  console.log('errors:', errs.length ? errs.slice(0, 3) : 0);
  console.log('saved', OUT);
  await b.close();
})();
